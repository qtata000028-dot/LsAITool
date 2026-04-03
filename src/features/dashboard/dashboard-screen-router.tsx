import React from 'react';

import { DashboardModuleScreen } from './dashboard-module-screen';
import { DashboardResearchRecordScreen } from './dashboard-research-record-screen';

export function DashboardScreenRouter({
  configModalNode,
  deleteConfirmNode,
  isResearchRecordActive,
  moduleScreenProps,
  researchRecordWorkbenchNode,
}: {
  configModalNode: React.ReactNode;
  deleteConfirmNode: React.ReactNode;
  isResearchRecordActive: boolean;
  moduleScreenProps: Omit<
    React.ComponentProps<typeof DashboardModuleScreen>,
    'configModalNode' | 'deleteConfirmNode'
  >;
  researchRecordWorkbenchNode: React.ReactNode;
}) {
  const {
    contentKey,
    headerProps,
    overviewProps,
    sidebarProps,
  } = moduleScreenProps;

  if (isResearchRecordActive) {
    return (
      <DashboardResearchRecordScreen
        configModalNode={configModalNode}
        contentNode={researchRecordWorkbenchNode}
        deleteConfirmNode={deleteConfirmNode}
      />
    );
  }

  return (
    <DashboardModuleScreen
      configModalNode={configModalNode}
      contentKey={contentKey}
      deleteConfirmNode={deleteConfirmNode}
      headerProps={headerProps}
      overviewProps={overviewProps}
      sidebarProps={sidebarProps}
    />
  );
}
