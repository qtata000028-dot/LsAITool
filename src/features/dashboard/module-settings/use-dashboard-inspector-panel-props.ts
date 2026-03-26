import { useCallback, useMemo, type Dispatch, type SetStateAction } from 'react';

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

  const updateActiveDetailGridConfig = useCallback((patch: Record<string, any>) => {
    const currentTabId = input.activeTab;
    input.setDetailTableConfigs((prev) => ({
      ...prev,
      [currentTabId]: {
        mainSql: '',
        defaultQuery: '',
        sourceCondition: '',
        sqlPrompt: '',
        tableType: '普通表格',
        ...(prev[currentTabId] ?? {}),
        ...patch,
      },
    }));
  }, [
    input.activeTab,
    input.setDetailTableConfigs,
  ]);

  const detailTabRelationSectionProps = useMemo(() => {
    const currentTabId = input.activeTab;
    if (!currentTabId || input.businessType === 'table') {
      return null;
    }

    const currentTabConfig = input.getDetailTabConfigById(currentTabId);
    const detailSourceModuleCode = String(currentTabConfig.relatedModule || '').trim();
    const detailSourceMode = detailSourceModuleCode ? 'module' : 'sql';
    const matchedDetailModuleCandidate = input.detailSourceModuleCandidates.find(
      (candidate) => String(candidate.moduleCode || '').trim() === detailSourceModuleCode,
    ) ?? null;

    return {
      availableGridColumnCount: (input.detailTableColumns[currentTabId] ?? []).length,
      detailSourceModuleCandidates: input.detailSourceModuleCandidates,
      detailSourceModuleCode,
      detailSourceMode,
      matchedDetailModuleCandidate,
      relatedCondition: String(currentTabConfig.relatedCondition || '').trim(),
      relatedModuleField: String(currentTabConfig.relatedModuleField || '').trim(),
      relatedValue: String(currentTabConfig.relatedValue || '').trim(),
      onSyncDetailColumnsFromConfiguredModule: () => {
        if (!detailSourceModuleCode) {
          input.showToast('请先填写模块编号');
          return;
        }
        void input.applyDetailModuleInheritanceById(currentTabId, detailSourceModuleCode);
      },
      onUpdateDetailSourceModuleCode: (value: string) => {
        input.handleDetailModuleCodeChange(currentTabId, value, { notify: true });
      },
      onUpdateRelatedCondition: (value: string) => {
        updateActiveDetailTabConfig({ relatedCondition: value });
        updateActiveDetailGridConfig({
          defaultQuery: value,
          sourceCondition: value,
        });
      },
      onUpdateRelatedModuleField: (value: string) => {
        updateActiveDetailTabConfig({ relatedModuleField: value });
      },
      onUpdateRelatedValue: (value: string) => {
        updateActiveDetailTabConfig({ relatedValue: value });
      },
    };
  }, [
    input.activeTab,
    input.applyDetailModuleInheritanceById,
    input.businessType,
    input.detailSourceModuleCandidates,
    input.detailTableColumns,
    input.getDetailTabConfigById,
    input.handleDetailModuleCodeChange,
    input.showToast,
    updateActiveDetailGridConfig,
    updateActiveDetailTabConfig,
  ]);

  return useInspectorPanelProps({
    ...input,
    detailTabRelationSectionProps,
    updateActiveDetailTabConfig,
    updateActiveDetailTabType,
  });
}
