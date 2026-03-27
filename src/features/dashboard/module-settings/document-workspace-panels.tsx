import React, { useMemo, type CSSProperties } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

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
    <div
      style={workspaceThemeVars}
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-[20px] border border-[#d9e2ec] bg-white shadow-none"
    >
      <div className="min-h-0 flex flex-1 flex-col overflow-hidden">
        <div
          className="scrollbar-none min-h-0 flex-1 overflow-auto bg-white px-3 py-3 outline-none dark:bg-slate-900/88"
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

type DocumentConditionWorkbenchModalBridgeProps = DocumentConditionToolbarBridgeProps & {
  isOpen: boolean;
  onClose: () => void;
};

export function DocumentConditionWorkbenchModalBridge({
  activeScope,
  canSwitchScope,
  helpers,
  leftConfig,
  mainConfig,
  metrics,
  onClearBuilderSelectionContextMenu,
  onClose,
  onScopeSwitch,
  renderFieldPreview,
  resize,
  isOpen,
}: DocumentConditionWorkbenchModalBridgeProps) {
  const activeConfig = activeScope === 'left' && leftConfig ? leftConfig : mainConfig;
  const activeScopeLabel = activeConfig.scope === 'left' ? '左条件' : '主条件';
  const totalConditionCount = mainConfig.fields.length + (leftConfig?.fields.length ?? 0);

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[78] flex items-center justify-center bg-slate-950/40 p-6 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.985 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="flex h-[80vh] w-full max-w-[1360px] flex-col overflow-hidden rounded-[28px] border border-[#dbe4ee] bg-[#f8fafc] shadow-[0_44px_96px_-36px_rgba(15,23,42,0.34)] dark:border-slate-700 dark:bg-slate-950/96"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-[#e6edf5] bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-950">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="flex size-9 items-center justify-center rounded-md border border-[#dbe5ef] bg-[#f7fafc] text-[color:var(--workspace-accent)] dark:border-slate-700 dark:bg-slate-900">
                      <span className="material-symbols-outlined text-[18px]">filter_alt</span>
                    </div>
                    <div className="text-[15px] font-semibold text-slate-900 dark:text-slate-50">条件配置</div>
                  </div>
                  <div className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">
                    当前作用域：{activeScopeLabel}，共 {totalConditionCount} 项条件，拖放排序和新增都集中在这里处理。
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex size-9 items-center justify-center rounded-md border border-[#dbe5ef] bg-white text-slate-500 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden px-4 pb-4 pt-3">
              <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[22px] border border-[#dbe4ee] bg-white dark:border-slate-800 dark:bg-slate-950">
                <MemoDocumentConditionWorkbench
                  activeScope={activeScope}
                  canSwitchScope={canSwitchScope}
                  mainConfig={mainConfig}
                  leftConfig={leftConfig}
                  onScopeSwitch={onScopeSwitch}
                  onActivatePanel={() => undefined}
                  onClearBuilderSelectionContextMenu={onClearBuilderSelectionContextMenu}
                  renderFieldPreview={renderFieldPreview}
                  resize={resize}
                  helpers={helpers}
                  metrics={metrics}
                />
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
