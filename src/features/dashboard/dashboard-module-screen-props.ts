import type { ComponentProps } from 'react';

import { DashboardOverview } from './dashboard-overview';
import { DashboardWorkspaceHeader } from './dashboard-workspace-header';
import { DashboardWorkspaceSidebar } from './dashboard-workspace-sidebar';

type DashboardModuleScreenHeaderProps = ComponentProps<typeof DashboardWorkspaceHeader>;
type DashboardModuleScreenOverviewProps = ComponentProps<typeof DashboardOverview>;
type DashboardModuleScreenSidebarProps = ComponentProps<typeof DashboardWorkspaceSidebar>;

export function buildDashboardModuleScreenProps({
  activeFirstLevelMenuId,
  activeFirstLevelMenuName,
  activeMenu,
  activeMenuCode,
  activeMenuCodePrefix,
  activeMenuName,
  activeSubsystem,
  activeSubsystemName,
  currentUserName,
  deletingMenuId,
  expandedSubsystemId,
  handleFirstLevelMenuClick,
  handleSecondLevelMenuConfig,
  isLoadingSecondLevelMenus,
  isLoadingSubsystemMenus,
  isResearchRecordActive,
  menuLoadError,
  onDeleteMenu,
  onLogout,
  onOpenResearchRecord,
  onCreateModule,
  reloadSubsystemMenus,
  researchRecordStorageKey,
  secondLevelMenuCount,
  secondLevelMenus,
  subsystemMenus,
  toggleSubsystemExpansion,
}: {
  activeFirstLevelMenuId: DashboardModuleScreenSidebarProps['activeFirstLevelMenuId'];
  activeFirstLevelMenuName: DashboardModuleScreenHeaderProps['activeFirstLevelMenuName'];
  activeMenu: string;
  activeMenuCode: DashboardModuleScreenOverviewProps['activeMenuCode'];
  activeMenuCodePrefix: DashboardModuleScreenOverviewProps['activeMenuCodePrefix'];
  activeMenuName: DashboardModuleScreenOverviewProps['activeMenuName'];
  activeSubsystem: DashboardModuleScreenSidebarProps['activeSubsystem'];
  activeSubsystemName: DashboardModuleScreenHeaderProps['activeSubsystemName'];
  currentUserName: DashboardModuleScreenSidebarProps['currentUserName'];
  deletingMenuId: DashboardModuleScreenOverviewProps['deletingMenuId'];
  expandedSubsystemId: DashboardModuleScreenSidebarProps['expandedSubsystemId'];
  handleFirstLevelMenuClick: DashboardModuleScreenSidebarProps['handleFirstLevelMenuClick'];
  handleSecondLevelMenuConfig: DashboardModuleScreenOverviewProps['onConfigureMenu'];
  isLoadingSecondLevelMenus: DashboardModuleScreenOverviewProps['isLoadingSecondLevelMenus'];
  isLoadingSubsystemMenus: DashboardModuleScreenSidebarProps['isLoadingSubsystemMenus'];
  isResearchRecordActive: DashboardModuleScreenHeaderProps['isResearchRecordActive'];
  menuLoadError: DashboardModuleScreenSidebarProps['menuLoadError'];
  onDeleteMenu: DashboardModuleScreenOverviewProps['onDeleteMenu'];
  onLogout: DashboardModuleScreenSidebarProps['onLogout'];
  onOpenResearchRecord: DashboardModuleScreenSidebarProps['onOpenResearchRecord'];
  onCreateModule: DashboardModuleScreenOverviewProps['onCreateModule'];
  reloadSubsystemMenus: DashboardModuleScreenSidebarProps['reloadSubsystemMenus'];
  researchRecordStorageKey: string;
  secondLevelMenuCount: DashboardModuleScreenOverviewProps['secondLevelMenuCount'];
  secondLevelMenus: DashboardModuleScreenOverviewProps['menus'];
  subsystemMenus: DashboardModuleScreenSidebarProps['subsystemMenus'];
  toggleSubsystemExpansion: DashboardModuleScreenSidebarProps['toggleSubsystemExpansion'];
}) {
  return {
    contentKey: isResearchRecordActive ? `research-record:${researchRecordStorageKey}` : activeMenu,
    headerProps: {
      activeFirstLevelMenuName,
      activeSubsystemName,
      isResearchRecordActive,
    },
    overviewProps: {
      activeFirstLevelMenuName,
      activeMenuCode,
      activeMenuCodePrefix,
      activeMenuName,
      activeSubsystemName,
      deletingMenuId,
      isLoadingSecondLevelMenus,
      menus: secondLevelMenus,
      onConfigureMenu: handleSecondLevelMenuConfig,
      onCreateModule,
      onDeleteMenu,
      secondLevelMenuCount,
    },
    sidebarProps: {
      activeFirstLevelMenuId,
      activeSubsystem,
      currentUserName,
      expandedSubsystemId,
      handleFirstLevelMenuClick,
      isLoadingSubsystemMenus,
      isResearchRecordActive,
      menuLoadError,
      onLogout,
      onOpenResearchRecord,
      reloadSubsystemMenus,
      subsystemMenus,
      toggleSubsystemExpansion,
    },
  };
}
