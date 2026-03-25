import { useEffect, useMemo, useState } from 'react';

import {
  fetchSubsystemMenuTree,
  fetchSubsystemSecondLevelMenus,
  type BackendMenuNode,
  type BackendSubsystemNode,
} from '../../../lib/backend-menus';
import {
  getEnabledMenuNodes,
  getModuleBrowserErrorMessage,
} from './design-module-browser-utils';

export function useDesignModuleBrowser() {
  const [activeFirstLevelMenuId, setActiveFirstLevelMenuId] = useState('');
  const [activeSubsystemId, setActiveSubsystemId] = useState('');
  const [expandedSubsystemId, setExpandedSubsystemId] = useState<string | null>(null);
  const [isLoadingSecondLevelMenus, setIsLoadingSecondLevelMenus] = useState(false);
  const [isLoadingSubsystemMenus, setIsLoadingSubsystemMenus] = useState(true);
  const [menuLoadError, setMenuLoadError] = useState<string | null>(null);
  const [secondLevelMenus, setSecondLevelMenus] = useState<BackendMenuNode[]>([]);
  const [selectedModuleId, setSelectedModuleId] = useState('');
  const [subsystemMenus, setSubsystemMenus] = useState<BackendSubsystemNode[]>([]);

  const selectedSubsystem = useMemo(
    () => subsystemMenus.find((item) => item.id === activeSubsystemId) ?? null,
    [activeSubsystemId, subsystemMenus],
  );
  const firstLevelMenus = useMemo<BackendMenuNode[]>(
    () => getEnabledMenuNodes<BackendMenuNode>(selectedSubsystem?.children),
    [selectedSubsystem],
  );
  const activeFirstLevelMenu = useMemo(
    () => firstLevelMenus.find((item) => item.id === activeFirstLevelMenuId) ?? firstLevelMenus[0] ?? null,
    [activeFirstLevelMenuId, firstLevelMenus],
  );
  const selectedModule = useMemo(
    () => secondLevelMenus.find((item) => item.id === selectedModuleId) ?? secondLevelMenus[0] ?? null,
    [secondLevelMenus, selectedModuleId],
  );

  useEffect(() => {
    const loadSubsystemMenus = async () => {
      setIsLoadingSubsystemMenus(true);
      setMenuLoadError(null);

      try {
        const data = getEnabledMenuNodes(await fetchSubsystemMenuTree());
        const nextSubsystem = data.find((item) => getEnabledMenuNodes(item.children).length > 0) ?? data[0] ?? null;
        const nextFirstLevelMenu = getEnabledMenuNodes(nextSubsystem?.children)[0] ?? null;

        setSubsystemMenus(data);
        setExpandedSubsystemId(nextSubsystem?.id ?? null);
        setActiveSubsystemId(nextSubsystem?.id ?? '');
        setActiveFirstLevelMenuId(nextFirstLevelMenu?.id ?? '');
        setSecondLevelMenus([]);
        setSelectedModuleId('');
      } catch (error) {
        setMenuLoadError(getModuleBrowserErrorMessage(error));
        setSubsystemMenus([]);
        setExpandedSubsystemId(null);
        setActiveSubsystemId('');
        setActiveFirstLevelMenuId('');
        setSecondLevelMenus([]);
        setSelectedModuleId('');
      } finally {
        setIsLoadingSubsystemMenus(false);
      }
    };

    void loadSubsystemMenus();
  }, []);

  useEffect(() => {
    let isCurrent = true;

    const loadSecondLevelMenus = async () => {
      if (!selectedSubsystem || !activeFirstLevelMenu?.menuId) {
        setSecondLevelMenus([]);
        setSelectedModuleId('');
        setIsLoadingSecondLevelMenus(false);
        return;
      }

      setIsLoadingSecondLevelMenus(true);
      setMenuLoadError(null);

      try {
        const data = getEnabledMenuNodes(
          await fetchSubsystemSecondLevelMenus({
            menuId: activeFirstLevelMenu.menuId,
            subsysId: selectedSubsystem.subsysId,
          }),
        );

        if (!isCurrent) {
          return;
        }

        setSecondLevelMenus(data);
        setSelectedModuleId((currentSelectedId) => (
          data.some((item) => item.id === currentSelectedId) ? currentSelectedId : (data[0]?.id ?? '')
        ));
      } catch (error) {
        if (!isCurrent) {
          return;
        }

        setMenuLoadError(getModuleBrowserErrorMessage(error));
        setSecondLevelMenus([]);
        setSelectedModuleId('');
      } finally {
        if (isCurrent) {
          setIsLoadingSecondLevelMenus(false);
        }
      }
    };

    void loadSecondLevelMenus();

    return () => {
      isCurrent = false;
    };
  }, [activeFirstLevelMenu?.menuId, selectedSubsystem]);

  return {
    activeFirstLevelMenu,
    activeFirstLevelMenuId,
    activeSubsystemId,
    expandedSubsystemId,
    firstLevelMenus,
    isLoadingSecondLevelMenus,
    isLoadingSubsystemMenus,
    menuLoadError,
    secondLevelMenus,
    selectedModule,
    selectedSubsystem,
    subsystemMenus,
    setActiveFirstLevelMenuId,
    setActiveSubsystemId,
    setExpandedSubsystemId,
    setSelectedModuleId,
  };
}
