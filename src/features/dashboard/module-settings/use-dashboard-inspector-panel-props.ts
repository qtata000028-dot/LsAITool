import { useCallback, type Dispatch, type SetStateAction } from 'react';

import { type InspectorPanelRouterProps } from './inspector-panel-router';
import {
  useInspectorPanelProps,
  type UseInspectorPanelPropsOptions,
} from './use-inspector-panel-props';

type UseDashboardInspectorPanelPropsInput = Omit<
  UseInspectorPanelPropsOptions,
  'updateActiveDetailTabConfig' | 'updateActiveDetailTabType'
> & {
  buildDetailTabConfig: (input: { detailName: string; tabKey: string }) => Record<string, any>;
  setDetailTabConfigs: Dispatch<SetStateAction<Record<string, any>>>;
};

export function useDashboardInspectorPanelProps(
  input: UseDashboardInspectorPanelPropsInput,
): InspectorPanelRouterProps {
  const updateActiveDetailTabConfig = useCallback((patch: Record<string, any>) => {
    const currentTabId = input.activeTab;
    const normalizedPatch: Record<string, any> = Object.prototype.hasOwnProperty.call(patch, 'detailType')
      ? (() => {
          const normalizedType = input.normalizeDetailFillTypeValue(patch.detailType);
          return {
            ...patch,
            detailType: normalizedType,
            detailTypeCode: input.getDetailFillTypeBackendValue(normalizedType),
          };
        })()
      : patch;

    input.setDetailTabConfigs((prev) => ({
      ...prev,
      [currentTabId]: {
        ...(prev[currentTabId] ?? input.buildDetailTabConfig({
          tabKey: currentTabId,
          detailName: input.detailTabs.find((tab) => tab.id === currentTabId)?.name ?? '当前明细模块',
        })),
        ...normalizedPatch,
      },
    }));

    if (typeof normalizedPatch.detailName === 'string') {
      const nextName = normalizedPatch.detailName.trim() || '未命名明细';
      input.setDetailTabs((prev) => prev.map((tab) => (
        tab.id === currentTabId
          ? { ...tab, name: nextName }
          : tab
      )));
    }
  }, [
    input.activeTab,
    input.buildDetailTabConfig,
    input.detailTabs,
    input.getDetailFillTypeBackendValue,
    input.normalizeDetailFillTypeValue,
    input.setDetailTabConfigs,
    input.setDetailTabs,
  ]);

  const updateActiveDetailTabType = useCallback((nextType: string) => {
    const normalizedType = input.normalizeDetailFillTypeValue(nextType);
    updateActiveDetailTabConfig({ detailType: normalizedType });
    input.setInspectorTarget((prev) => (
      prev.kind === 'detail-grid'
        ? { kind: 'detail-grid', id: normalizedType }
        : prev
    ));
    void input.loadSingleTableDetailResourcesById(input.activeTab, normalizedType);
  }, [
    input.activeTab,
    input.loadSingleTableDetailResourcesById,
    input.normalizeDetailFillTypeValue,
    input.setInspectorTarget,
    updateActiveDetailTabConfig,
  ]);

  return useInspectorPanelProps({
    ...input,
    updateActiveDetailTabConfig,
    updateActiveDetailTabType,
  });
}
