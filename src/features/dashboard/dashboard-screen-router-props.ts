import type { ComponentProps } from 'react';

import { buildDashboardModuleScreenProps } from './dashboard-module-screen-props';
import {
  buildDashboardConfigModalNode,
  buildDashboardResearchRecordWorkbenchNode,
} from './dashboard-screen-node-builders';
import { DashboardScreenRouter } from './dashboard-screen-router';

type DashboardConfigModalNodeProps = Parameters<typeof buildDashboardConfigModalNode>[0];
type DashboardModuleScreenPropsInput = Parameters<typeof buildDashboardModuleScreenProps>[0];
type DashboardResearchRecordWorkbenchProps = Parameters<typeof buildDashboardResearchRecordWorkbenchNode>[0];

export function buildDashboardScreenRouterProps({
  configModalProps,
  deleteConfirmNode,
  isResearchRecordActive,
  moduleScreenInput,
  researchRecordWorkbenchProps,
}: {
  configModalProps: DashboardConfigModalNodeProps;
  deleteConfirmNode: ComponentProps<typeof DashboardScreenRouter>['deleteConfirmNode'];
  isResearchRecordActive: ComponentProps<typeof DashboardScreenRouter>['isResearchRecordActive'];
  moduleScreenInput: DashboardModuleScreenPropsInput;
  researchRecordWorkbenchProps: DashboardResearchRecordWorkbenchProps;
}): ComponentProps<typeof DashboardScreenRouter> {
  return {
    configModalNode: buildDashboardConfigModalNode(configModalProps),
    deleteConfirmNode,
    isResearchRecordActive,
    moduleScreenProps: buildDashboardModuleScreenProps(moduleScreenInput),
    researchRecordWorkbenchNode: buildDashboardResearchRecordWorkbenchNode(researchRecordWorkbenchProps),
  };
}
