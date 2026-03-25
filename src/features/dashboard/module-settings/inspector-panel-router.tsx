import React from 'react';

import {
  getShadcnTabTriggerClass,
  shadcnTabListClass,
} from '../../../components/ui/shadcn-inspector';
import { ConditionPanelInspector } from './condition-panel-inspector';
import { ContextMenuInspector } from './context-menu-inspector';
import { DetailTabInspector } from './detail-tab-inspector';
import { FieldInspectorController } from './field-inspector-controller';
import { GridInspectorController } from './grid-inspector-controller';
import {
  EmptyInspectorPanel,
  WorkspaceThemeInspector,
} from './misc-inspectors';
import { SourceGridInspector } from './source-grid-inspector';

export type InspectorTabId = 'common' | 'advanced' | 'contextmenu' | 'color';

export type InspectorPanelRouterProps = {
  activeTab: string;
  businessType: string;
  conditionPanelProps: Record<string, any>;
  contextMenuProps: Record<string, any>;
  detailTabProps: Record<string, any>;
  emptyInspectorProps: Record<string, any>;
  fieldProps: Record<string, any>;
  getDetailFillTypeByTabId: (tabId: string) => string;
  gridProps: Record<string, any>;
  inspectorPanelTab: InspectorTabId;
  inspectorTarget: any;
  normalizeDetailFillTypeValue: (fillType?: string) => string;
  onSelectInspectorTab: (tabId: InspectorTabId) => void;
  selectedColumnContext: any | null;
  sourceGridProps: Record<string, any>;
  workspaceThemeProps: Record<string, any>;
};

export function InspectorPanelRouter({
  activeTab,
  businessType,
  conditionPanelProps,
  contextMenuProps,
  detailTabProps,
  emptyInspectorProps,
  fieldProps,
  getDetailFillTypeByTabId,
  gridProps,
  inspectorPanelTab,
  inspectorTarget,
  normalizeDetailFillTypeValue,
  onSelectInspectorTab,
  selectedColumnContext,
  sourceGridProps,
  workspaceThemeProps,
}: InspectorPanelRouterProps) {
  if (!selectedColumnContext) {
    return <EmptyInspectorPanel {...(emptyInspectorProps as any)} />;
  }

  const isDocumentScopedGridInspector = selectedColumnContext.kind === 'grid'
    && businessType !== 'table'
    && (
      selectedColumnContext.scope === 'main-grid'
      || selectedColumnContext.scope === 'left-grid'
      || (
        selectedColumnContext.scope === 'detail-grid'
        && normalizeDetailFillTypeValue(
          inspectorTarget.kind === 'detail-grid'
            ? inspectorTarget.id
            : getDetailFillTypeByTabId(activeTab),
        ) === '表格'
      )
    );
  const documentScopedGridContextMenuCount = isDocumentScopedGridInspector
    ? (selectedColumnContext.column?.contextMenuItems ?? []).length
    : 0;
  const documentScopedGridColorRuleCount = isDocumentScopedGridInspector
    ? (selectedColumnContext.column?.colorRules ?? []).length
    : 0;
  const documentScopedGridLabel = selectedColumnContext.scope === 'left-grid'
    ? '左表'
    : selectedColumnContext.scope === 'detail-grid'
      ? '明细表'
      : '主表';
  const inspectorTabs: Array<{ count?: number; icon: string; id: InspectorTabId; label: string }> = isDocumentScopedGridInspector
    ? [
        { id: 'common', label: documentScopedGridLabel, icon: 'dashboard_customize' },
        { id: 'advanced', label: '布局', icon: 'view_stream' },
        { id: 'contextmenu', label: '右键', icon: 'right_click', count: documentScopedGridContextMenuCount },
        { id: 'color', label: '颜色', icon: 'palette', count: documentScopedGridColorRuleCount },
      ]
    : [
        { id: 'common', label: '核心配置', icon: 'dashboard_customize' },
        { id: 'advanced', label: '扩展配置', icon: 'network_node' },
      ];
  const currentInspectorTab = inspectorTabs.some((tab) => tab.id === inspectorPanelTab) ? inspectorPanelTab : 'common';
  const isCommonPanelTab = currentInspectorTab === 'common';
  const isContextMenuPanelTab = currentInspectorTab === 'contextmenu';
  const isColorPanelTab = currentInspectorTab === 'color';
  const inspectorCountBadgeClass = 'absolute right-2 top-1.5 inline-flex min-w-[16px] items-center justify-center rounded-full bg-[#e04f5f] px-1.5 py-0.5 text-[9px] font-black leading-none text-white shadow-[0_10px_18px_-14px_rgba(224,79,95,0.78)]';
  const inspectorTabsNode = (
    <div className={shadcnTabListClass}>
      {inspectorTabs.map((tab) => {
        const isActive = currentInspectorTab === tab.id;
        const hasCountBadge = typeof tab.count === 'number' && tab.count > 0;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelectInspectorTab(tab.id)}
            className={getShadcnTabTriggerClass(isActive)}
          >
            <span className={`material-symbols-outlined text-[16px] ${isActive ? 'text-[#1686e3]' : 'text-slate-400 dark:text-slate-500'}`}>{tab.icon}</span>
            <span className="truncate">{tab.label}</span>
            {hasCountBadge ? (
              <span className={inspectorCountBadgeClass}>
                {tab.count! > 9 ? '9+' : tab.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );

  if (selectedColumnContext.kind === 'workspace-theme') {
    return <WorkspaceThemeInspector {...(workspaceThemeProps as any)} />;
  }

  if (selectedColumnContext.kind === 'source-grid') {
    return <SourceGridInspector {...(sourceGridProps as any)} />;
  }

  if (selectedColumnContext.kind === 'detail-tab') {
    return (
      <DetailTabInspector
        {...(detailTabProps as any)}
        inspectorTabsNode={inspectorTabsNode}
        isCommonPanelTab={isCommonPanelTab}
      />
    );
  }

  if (selectedColumnContext.kind === 'contextmenu') {
    return (
      <ContextMenuInspector
        {...(contextMenuProps as any)}
        inspectorTabsNode={inspectorTabsNode}
        isCommonPanelTab={isCommonPanelTab}
      />
    );
  }

  if (selectedColumnContext.kind === 'grid') {
    return (
      <GridInspectorController
        {...(gridProps as any)}
        inspectorTabsNode={inspectorTabsNode}
        isColorPanelTab={isColorPanelTab}
        isCommonPanelTab={isCommonPanelTab}
        isContextMenuPanelTab={isContextMenuPanelTab}
      />
    );
  }

  if (selectedColumnContext.kind === 'condition-panel') {
    return <ConditionPanelInspector {...(conditionPanelProps as any)} />;
  }

  return (
    <FieldInspectorController
      {...(fieldProps as any)}
      isCommonPanelTab={isCommonPanelTab}
      renderInspectorTabsNode={inspectorTabsNode}
    />
  );
}
