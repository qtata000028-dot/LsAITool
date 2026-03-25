import React, { useMemo, type CSSProperties } from 'react';

import {
  MemoDocumentConditionWorkbench,
  type ConditionWorkbenchScope,
  type DocumentConditionWorkbenchConfig,
} from './condition-workbench';
import {
  MemoDocumentGridToolbar,
  type DocumentGridToolbarFilterConfig,
  type DocumentGridToolbarOptions,
} from './document-grid-toolbar';

type DocumentTreePanelProps = {
  documentTreeTableBuilderNode: React.ReactNode;
  onPaste: React.ClipboardEventHandler<HTMLDivElement>;
  treeRelationColumn: any;
  workspaceThemeVars: CSSProperties;
};

export function DocumentTreePanel({
  documentTreeTableBuilderNode,
  onPaste,
  treeRelationColumn,
  workspaceThemeVars,
}: DocumentTreePanelProps) {
  if (!treeRelationColumn) return null;

  return (
    <div style={workspaceThemeVars} className="cloudy-glass-panel flex h-full min-h-0 flex-col overflow-hidden rounded-[28px] border border-white/70">
      <div className="min-h-0 flex flex-1 flex-col overflow-hidden">
        <div
          className="scrollbar-none min-h-0 flex-1 overflow-auto bg-white/70 px-3 py-3 outline-none dark:bg-slate-900/88"
          tabIndex={0}
          onPaste={onPaste}
        >
          {documentTreeTableBuilderNode}
        </div>
      </div>
    </div>
  );
}

type DocumentGridToolbarBridgeProps = {
  activeResize: any;
  autoFitColumnWidth: (...args: any[]) => void;
  buildDocumentFilterRuntimeRules: (fields: any[], activeResize: any) => string;
  columns: any[];
  extraActions?: React.ReactNode;
  filterConfig?: DocumentGridToolbarFilterConfig;
  metrics: {
    filterControlWidth: number;
    filterResizeMaxWidth: number;
    filterResizeMinWidth: number;
  };
  onAdd: () => void;
  onDelete: () => void;
  onSetBuilderSelectionContextMenu: (menu: any) => void;
  options?: DocumentGridToolbarOptions;
  renderFieldPreview: (rawField: any, rowIndex: number, mode?: 'table' | 'filter' | 'condition') => React.ReactNode;
  selectedCount: number;
  startResize: (...args: any[]) => void;
  tableConfigAction?: {
    active?: boolean;
    onSelect: () => void;
  };
  title: string;
};

export function DocumentGridToolbarBridge({
  activeResize,
  autoFitColumnWidth,
  buildDocumentFilterRuntimeRules,
  columns,
  extraActions,
  filterConfig,
  metrics,
  onAdd,
  onDelete,
  onSetBuilderSelectionContextMenu,
  options,
  renderFieldPreview,
  selectedCount,
  startResize,
  tableConfigAction,
  title,
}: DocumentGridToolbarBridgeProps) {
  const resolvedFilterFields = filterConfig?.fields ?? columns.slice(0, 3);
  const resolvedOptions = useMemo(() => ({
    ...options,
    filterRuntimeRules: options?.filterRuntimeRules ?? buildDocumentFilterRuntimeRules(resolvedFilterFields, activeResize),
  }) satisfies DocumentGridToolbarOptions, [
    activeResize,
    buildDocumentFilterRuntimeRules,
    options,
    resolvedFilterFields,
  ]);

  return (
    <MemoDocumentGridToolbar
      columns={columns}
      title={title}
      selectedCount={selectedCount}
      onDelete={onDelete}
      onAdd={onAdd}
      extraActions={extraActions}
      filterConfig={filterConfig}
      tableConfigAction={tableConfigAction}
      options={resolvedOptions}
      metrics={metrics}
      onSetBuilderSelectionContextMenu={onSetBuilderSelectionContextMenu}
      renderFieldPreview={renderFieldPreview}
      startResize={startResize}
      autoFitColumnWidth={autoFitColumnWidth}
    />
  );
}

type DocumentConditionToolbarBridgeProps = {
  activeScope: ConditionWorkbenchScope;
  canSwitchScope: boolean;
  helpers: any;
  leftConfig?: DocumentConditionWorkbenchConfig | null;
  mainConfig: DocumentConditionWorkbenchConfig;
  metrics: any;
  onActivatePanel: (scope: ConditionWorkbenchScope) => void;
  onClearBuilderSelectionContextMenu: () => void;
  onScopeSwitch: (scope: ConditionWorkbenchScope) => void;
  renderFieldPreview: (rawField: any, rowIndex: number, mode?: 'table' | 'filter' | 'condition') => React.ReactNode;
  resize: any;
};

export function DocumentConditionToolbarBridge({
  activeScope,
  canSwitchScope,
  helpers,
  leftConfig,
  mainConfig,
  metrics,
  onActivatePanel,
  onClearBuilderSelectionContextMenu,
  onScopeSwitch,
  renderFieldPreview,
  resize,
}: DocumentConditionToolbarBridgeProps) {
  return (
    <MemoDocumentConditionWorkbench
      activeScope={activeScope}
      canSwitchScope={canSwitchScope}
      mainConfig={mainConfig}
      leftConfig={leftConfig}
      onScopeSwitch={onScopeSwitch}
      onActivatePanel={onActivatePanel}
      onClearBuilderSelectionContextMenu={onClearBuilderSelectionContextMenu}
      renderFieldPreview={renderFieldPreview}
      resize={resize}
      helpers={helpers}
      metrics={metrics}
    />
  );
}
