import type { ComponentProps, ReactNode } from 'react';

import { DashboardConfigModal } from './dashboard-config-modal';
import { ResearchRecordWorkbench } from './research-record-workbench';

export function buildDashboardConfigModalNode(
  props: ComponentProps<typeof DashboardConfigModal>,
): ReactNode {
  return <DashboardConfigModal {...props} />;
}

export function buildDashboardResearchRecordWorkbenchNode(
  props: ComponentProps<typeof ResearchRecordWorkbench>,
): ReactNode {
  return <ResearchRecordWorkbench {...props} />;
}
