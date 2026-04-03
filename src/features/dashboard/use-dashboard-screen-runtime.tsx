import { DashboardScreenRouter } from './dashboard-screen-router';
import { buildDashboardScreenRouterProps } from './dashboard-screen-router-props';
import { useDashboardConfigBridgeNodes } from './module-settings/use-dashboard-config-bridge-nodes';

type DashboardConfigBridgeInputs = Parameters<typeof useDashboardConfigBridgeNodes>[0];
type DashboardScreenRouterBuilderInput = Parameters<typeof buildDashboardScreenRouterProps>[0];

export type UseDashboardScreenRuntimeInput = {
  bridgeInputs: DashboardConfigBridgeInputs;
  screen: {
    configModal: Omit<
      DashboardScreenRouterBuilderInput['configModalProps'],
      'bodyNode' | 'footerNode' | 'overlayNodes' | 'sidebarNode'
    >;
    isResearchRecordActive: DashboardScreenRouterBuilderInput['isResearchRecordActive'];
    moduleScreenInput: DashboardScreenRouterBuilderInput['moduleScreenInput'];
    researchRecordWorkbenchProps: DashboardScreenRouterBuilderInput['researchRecordWorkbenchProps'];
  };
};

export function useDashboardScreenRuntime({
  bridgeInputs,
  screen,
}: UseDashboardScreenRuntimeInput) {
  const dashboardConfigBridgeNodes = useDashboardConfigBridgeNodes(bridgeInputs);
  const screenRouterProps = buildDashboardScreenRouterProps({
    configModalProps: {
      ...screen.configModal,
      bodyNode: dashboardConfigBridgeNodes.configWizardModalNodes.bodyNode,
      footerNode: dashboardConfigBridgeNodes.configWizardModalNodes.footerNode,
      overlayNodes: dashboardConfigBridgeNodes.configWizardModalNodes.overlayNodes,
      sidebarNode: dashboardConfigBridgeNodes.configWizardModalNodes.sidebarNode,
    },
    deleteConfirmNode: dashboardConfigBridgeNodes.deleteConfirmNode,
    isResearchRecordActive: screen.isResearchRecordActive,
    moduleScreenInput: screen.moduleScreenInput,
    researchRecordWorkbenchProps: screen.researchRecordWorkbenchProps,
  });

  return <DashboardScreenRouter {...screenRouterProps} />;
}
