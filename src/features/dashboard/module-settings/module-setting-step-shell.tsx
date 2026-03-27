import React from 'react';

import { getDetailBoardTheme } from './detail-board-config';
import { MemoDetailTabStrip, MemoDocumentDetailWorkbench } from './detail-workbench';
import { DetailFillPlaceholder, DetailTabsWorkspace } from './detail-tabs-workspace';
import { DocumentGridToolbarBridge, DocumentTreePanel } from './document-workspace-panels';

export type ModuleSettingStepShellProps = {
  billDocumentWorkbenchNode: React.ReactNode;
  businessType: 'document' | 'table' | 'tree';
  columnOperationPanel: React.ReactNode;
  currentModuleName: string;
  inspectorPaneWidth: number;
  isConfigFullscreenActive: boolean;
  moduleSettingStageHeightClass: string;
  moduleSettingStageStyle: React.CSSProperties;
  workspaceTheme?: string;
  workspaceThemeStyles: {
    tableSurface: string;
  };
  document: {
    activeTab: string;
    archiveMainTableBuilderNode: React.ReactNode;
    conditionToolbarNode: React.ReactNode;
    currentDetailFillType: string;
    detailTabs: any[];
    documentDetailTableBuilderNode: React.ReactNode;
    documentLeftPaneWidth: number;
    documentTreeTableBuilderNode: React.ReactNode;
    isDetailFillSelected: boolean;
    isTreePaneVisible: boolean;
    mainTableHiddenColumnsCount: number;
    onActivateDetailFill: () => void;
    onActivateDetailTab: (tabId: string) => void;
    onAddDetailTab: () => void;
    onDeleteDetailTab: (tabId: string, event: React.MouseEvent) => void;
    onOpenMainHiddenColumnsModal: () => void;
    onPasteDetailTableColumns: React.ClipboardEventHandler<HTMLDivElement>;
    onPasteMainTable: React.ClipboardEventHandler<HTMLDivElement>;
    onPasteTreePanel: React.ClipboardEventHandler<HTMLDivElement>;
    onStartLeftResize: (event: React.MouseEvent<HTMLDivElement>) => void;
    treeRelationColumn: any;
    workspaceThemeVars: React.CSSProperties;
  };
  tree: {
    activeResize: any;
    activeTab: string;
    autoFitColumnWidth: (...args: any[]) => void;
    buildDocumentFilterRuntimeRules: (fields: any[], activeResize: any) => string;
    builderDetailTableBuilderNode: React.ReactNode;
    builderLeftTableBuilderNode: React.ReactNode;
    builderMainTableBuilderNode: React.ReactNode;
    conditionPanelControlWidth: number;
    conditionPanelResizeMaxWidth: number;
    conditionPanelResizeMinWidth: number;
    currentDetailFillType: string;
    detailTabs: any[];
    detailWebUrl: string;
    isDetailViewSelected: boolean;
    isSingleTableSyncing: boolean;
    mainDocumentFilterRuntimeRules?: string;
    mainFilterFields: any[];
    mainTableColumns: any[];
    mainTableHiddenColumnsCount: number;
    onActivateCurrentDetailView: () => void;
    onActivateDetailTab: (tabId: string) => void;
    onActivateMainFilter: (id: string) => void;
    onAddDetailColumn: () => void;
    onAddDetailTab: () => void;
    onAddLeftColumn: () => void;
    onAddMainColumn: () => void;
    onAddMainFilter: () => void;
    onDeleteDetailTab: (tabId: string, event: React.MouseEvent) => void;
    onDeleteLeftSelection: () => void;
    onDeleteMainFilters: () => void;
    onDeleteMainSelection: () => void;
    onDeleteSelectedDetailColumns: () => void;
    onOpenDetailWebConfig: () => void;
    onOpenMainHiddenColumnsModal: () => void;
    onPasteDetailColumns: React.ClipboardEventHandler<HTMLDivElement>;
    onPasteLeftColumns: React.ClipboardEventHandler<HTMLDivElement>;
    onPasteMainColumns: React.ClipboardEventHandler<HTMLDivElement>;
    onSetBuilderSelectionContextMenu: (menu: any) => void;
    renderFieldPreview: (rawField: any, rowIndex: number, mode?: 'table' | 'filter' | 'condition') => React.ReactNode;
    selectedDetailForDelete: string[];
    selectedLeftForDeleteCount: number;
    selectedMainFilterId: string | null;
    selectedMainFiltersForDelete: string[];
    selectedMainForDeleteCount: number;
    setMainFilterFields: React.Dispatch<React.SetStateAction<any[]>>;
    setSelectedMainFiltersForDelete: React.Dispatch<React.SetStateAction<string[]>>;
    startResize: (...args: any[]) => void;
  };
};

export function ModuleSettingStepShell({
  billDocumentWorkbenchNode,
  businessType,
  columnOperationPanel,
  currentModuleName,
  inspectorPaneWidth,
  isConfigFullscreenActive,
  moduleSettingStageHeightClass,
  moduleSettingStageStyle,
  workspaceTheme,
  workspaceThemeStyles,
  document,
  tree,
}: ModuleSettingStepShellProps) {
  const detailBoardTheme = getDetailBoardTheme(workspaceTheme);
  const hasDocumentDetails = document.detailTabs.length > 0;
  const stageShellClass = `flex min-h-0 overflow-hidden bg-[#f6f8fb] ${workspaceThemeStyles.tableSurface}`;
  const workspacePanelClass = 'flex min-h-0 flex-col overflow-hidden border border-slate-200/80 bg-[#fbfcfe] shadow-none';
  const workspacePanelHeaderClass = 'flex items-center justify-between border-b border-slate-200 bg-[#f8fafc] px-4 py-3';
  const workspacePanelBodyClass = 'min-h-0 flex-1 overflow-hidden bg-[#fcfdff]';
  const sectionIconClass = 'flex size-8 items-center justify-center rounded-[10px] border border-slate-200 bg-[#eef4ff] text-[color:var(--workspace-accent-strong)]';
  const sectionActionButtonClass = 'inline-flex items-center gap-1 rounded-[10px] border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:bg-slate-800';
  const primaryActionButtonClass = 'inline-flex items-center gap-1 rounded-[10px] bg-[color:var(--workspace-accent)] px-2.5 py-1 text-[11px] font-semibold text-white shadow-[0_10px_18px_-16px_rgba(15,23,42,0.2)] transition-all hover:bg-[color:var(--workspace-accent-strong)]';
  const rightPaneShellClass = 'flex min-h-0 shrink-0 flex-col border-l border-slate-200/80 bg-[#f7f9fc]';
  const singleTableDesignTitle = `${String(currentModuleName || '当前模块').trim() || '当前模块'} - 单表设计`;

  if (businessType === 'document') {
    return (
      <div style={moduleSettingStageStyle} className={`${stageShellClass} ${moduleSettingStageHeightClass}`}>
        <div className="min-h-0 min-w-0 flex flex-1 flex-col">
          <div className="border-b border-slate-200 bg-[#fbfcfe]">
            <div className="border-t-[4px] border-[color:var(--workspace-accent)] px-6 py-3 text-center">
              <div className="text-[22px] font-bold tracking-[0.06em] text-slate-700">
                {singleTableDesignTitle}
              </div>
            </div>
          </div>
          {document.conditionToolbarNode}
          <div className="min-h-0 min-w-0 flex flex-1 overflow-hidden">
            {document.isTreePaneVisible ? (
              <>
                <div className="flex min-h-0 shrink-0 flex-col" style={{ width: document.documentLeftPaneWidth }}>
                  <DocumentTreePanel
                    treeRelationColumn={document.treeRelationColumn}
                    workspaceThemeVars={document.workspaceThemeVars}
                    documentTreeTableBuilderNode={document.documentTreeTableBuilderNode}
                    onPaste={document.onPasteTreePanel}
                  />
                </div>

                <div
                  className="group flex w-3 shrink-0 cursor-col-resize items-center justify-center"
                  onMouseDown={document.onStartLeftResize}
                >
                  <div className="cloudy-divider h-28 w-[4px] rounded-full transition-colors group-hover:bg-[color:var(--workspace-accent)] dark:bg-slate-700" />
                </div>
              </>
            ) : null}

            <div className="min-h-0 min-w-0 flex-1">
              <div className={`grid h-full min-h-0 gap-0 overflow-hidden ${hasDocumentDetails ? 'grid-rows-2' : 'grid-rows-[minmax(0,1fr)_auto]'}`}>
                <div className={workspacePanelClass}>
                  <div className={workspacePanelHeaderClass}>
                    <div className="flex items-center gap-2">
                      <div className={sectionIconClass}>
                        <span className="material-symbols-outlined text-[16px]">table_view</span>
                      </div>
                      <div>
                        <h4 className="text-[12px] font-semibold text-slate-800 dark:text-slate-200">主表字段配置</h4>
                        <p className="mt-0.5 text-[11px] text-slate-400">隐藏列与 0 宽列会集中收纳在详细列里</p>
                      </div>
                    </div>
                    <button hidden
                      type="button"
                      onClick={document.onOpenMainHiddenColumnsModal}
                      disabled={document.mainTableHiddenColumnsCount === 0}
                      className={`${sectionActionButtonClass} disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                      <span className="material-symbols-outlined text-[14px]">view_column</span>
                      详细列 {document.mainTableHiddenColumnsCount > 0 ? `(${document.mainTableHiddenColumnsCount})` : ''}
                    </button>
                  </div>
                  <div className={`${workspacePanelBodyClass} flex h-full min-h-0 flex-col`}>
                    <div
                      className="scrollbar-none min-h-0 flex-1 overflow-auto px-3 py-3 outline-none dark:bg-slate-900/90"
                      tabIndex={0}
                      onPaste={document.onPasteMainTable}
                      style={{ backgroundColor: '#fcfdff' }}
                    >
                      {document.archiveMainTableBuilderNode}
                    </div>
                  </div>
                </div>

                {hasDocumentDetails ? (
                  <div className={workspacePanelClass}>
                    <div className="flex h-full min-h-0 overflow-hidden">
                      <MemoDocumentDetailWorkbench
                        tableSurfaceClass={detailBoardTheme.tableSurface}
                        detailTabStripNode={(
                          <MemoDetailTabStrip
                            detailTabs={document.detailTabs}
                            activeTab={document.activeTab}
                            currentDetailFillType={document.currentDetailFillType}
                            onActivateTab={document.onActivateDetailTab}
                            onDeleteTab={document.onDeleteDetailTab}
                            onAddTab={document.onAddDetailTab}
                            addLabel="新增明细"
                            showModeBadge={false}
                          />
                        )}
                        currentDetailFillType={document.currentDetailFillType}
                        onPasteTableColumns={document.onPasteDetailTableColumns}
                        tableBuilderNode={document.documentDetailTableBuilderNode}
                        fillPlaceholderNode={(
                          <DetailFillPlaceholder
                            currentDetailFillType={document.currentDetailFillType}
                            isSelected={document.isDetailFillSelected}
                            onActivate={document.onActivateDetailFill}
                          />
                        )}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="border border-dashed border-[color:var(--workspace-accent-border)] bg-white px-4 py-4 dark:bg-slate-900/75">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0">
                        <div className="text-[12px] font-semibold text-slate-800 dark:text-slate-100">当前未创建明细</div>
                        <p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-slate-300">
                          点击创建明细后，再展开下方工作台，按现在的上下等分方式继续配置。
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={document.onAddDetailTab}
                        className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-[10px] bg-[color:var(--workspace-accent)] px-4 text-[12px] font-semibold text-white shadow-[0_12px_24px_-22px_var(--workspace-accent-shadow)] transition-colors hover:bg-[color:var(--workspace-accent-strong)]"
                      >
                        <span className="material-symbols-outlined text-[16px]">add</span>
                        创建明细
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className={rightPaneShellClass} style={{ width: inspectorPaneWidth, minWidth: inspectorPaneWidth }}>
          {columnOperationPanel}
        </div>
      </div>
    );
  }

  if (businessType === 'table') {
    return (
      <div style={moduleSettingStageStyle} className={`${stageShellClass} flex-1 ${isConfigFullscreenActive ? 'min-h-[640px]' : ''}`}>
        <div className="grid h-full min-h-0 flex-1 gap-0" style={{ gridTemplateColumns: `minmax(0,1fr) ${inspectorPaneWidth}px` }}>
          <div className="flex h-full min-h-0">
            {billDocumentWorkbenchNode}
          </div>
          <div className={rightPaneShellClass}>
            {columnOperationPanel}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={moduleSettingStageStyle} className={`${stageShellClass} flex-col ${moduleSettingStageHeightClass}`}>
      <div className={`cloudy-cloud-grid studio-grid-bg grid min-h-0 flex-1 ${
        isConfigFullscreenActive
          ? 'xl:grid-cols-[minmax(220px,0.72fr)_minmax(0,1.28fr)]'
          : 'xl:grid-cols-[minmax(260px,0.82fr)_minmax(0,1.18fr)]'
      } gap-0`}>
        <div className={workspacePanelClass}>
          <div className={workspacePanelHeaderClass}>
            <div className="flex items-center gap-3">
              <div className={sectionIconClass}>
                <span className="material-symbols-outlined text-[16px]">view_sidebar</span>
              </div>
              <div>
                <h4 className="text-[12px] font-semibold text-slate-800 dark:text-slate-200">左侧表配置</h4>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {tree.selectedLeftForDeleteCount > 0 ? (
                <button
                  onClick={tree.onDeleteLeftSelection}
                  className="inline-flex items-center gap-1 rounded-[10px] px-2.5 py-1 text-[11px] font-semibold text-rose-500 transition-colors hover:bg-rose-50 dark:hover:bg-rose-500/10"
                >
                  <span className="material-symbols-outlined text-[14px]">delete</span>
                  删除 ({tree.selectedLeftForDeleteCount})
                </button>
              ) : null}
              <button
                onClick={tree.onAddLeftColumn}
                className={primaryActionButtonClass}
              >
                <span className="material-symbols-outlined text-[14px]">add</span>
                新增
              </button>
            </div>
          </div>
            <div
              className="scrollbar-none min-h-0 flex-1 overflow-auto outline-none"
              tabIndex={0}
              onPaste={tree.onPasteLeftColumns}
              style={{ backgroundColor: '#fcfdff' }}
            >
              <div className="px-3 pb-3 pt-2">
                {tree.builderLeftTableBuilderNode}
            </div>
          </div>
        </div>

        <div className="grid min-h-0 gap-0 lg:grid-rows-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className={workspacePanelClass}>
            <div className={workspacePanelHeaderClass}>
              <div className="flex items-center gap-3">
                <div className={`${sectionIconClass} text-emerald-600`}>
                  <span className="material-symbols-outlined text-[16px]">table_rows</span>
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-[12px] font-semibold text-slate-800 dark:text-slate-200">主表字段配置</h4>
                    {tree.isSingleTableSyncing ? (
                      <span className="inline-flex items-center rounded-full border border-emerald-200/80 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                        同步中
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button hidden
                  type="button"
                  onClick={tree.onOpenMainHiddenColumnsModal}
                  disabled={tree.mainTableHiddenColumnsCount === 0}
                  className={`${sectionActionButtonClass} disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  <span className="material-symbols-outlined text-[14px]">view_column</span>
                  详细列 {tree.mainTableHiddenColumnsCount > 0 ? `(${tree.mainTableHiddenColumnsCount})` : ''}
                </button>
                {tree.selectedMainForDeleteCount > 0 ? (
                  <button
                    onClick={tree.onDeleteMainSelection}
                    className="inline-flex items-center gap-1 rounded-[10px] px-2.5 py-1 text-[11px] font-semibold text-rose-500 transition-colors hover:bg-rose-50 dark:hover:bg-rose-500/10"
                  >
                    <span className="material-symbols-outlined text-[14px]">delete</span>
                    删除 ({tree.selectedMainForDeleteCount})
                  </button>
                ) : null}
                <button
                  onClick={tree.onAddMainColumn}
                  className={primaryActionButtonClass}
                >
                  <span className="material-symbols-outlined text-[14px]">add</span>
                  新增
                </button>
              </div>
            </div>
            <div className="border-b border-slate-200 bg-white">
              <div className="border-t-[4px] border-[color:var(--workspace-accent)] px-6 py-5 text-center">
                <div className="text-[28px] font-bold tracking-[0.08em] text-slate-700">
                  {singleTableDesignTitle}
                </div>
              </div>
            </div>
            <DocumentGridToolbarBridge
              activeResize={tree.activeResize}
              autoFitColumnWidth={tree.autoFitColumnWidth}
              buildDocumentFilterRuntimeRules={tree.buildDocumentFilterRuntimeRules}
              columns={tree.mainTableColumns}
              title="主表字段配置"
              selectedCount={tree.selectedMainForDeleteCount}
              onDelete={tree.onDeleteMainSelection}
              onAdd={tree.onAddMainColumn}
              filterConfig={{
                fields: tree.mainFilterFields,
                selectedId: tree.selectedMainFilterId,
                selectedIds: tree.selectedMainFiltersForDelete,
                setSelectedIds: tree.setSelectedMainFiltersForDelete,
                setFields: tree.setMainFilterFields,
                scope: 'main',
                onActivate: tree.onActivateMainFilter,
                onAdd: tree.onAddMainFilter,
                onDelete: tree.onDeleteMainFilters,
              }}
              options={{
                hideActionBar: true,
                filterRuntimeRules: tree.mainDocumentFilterRuntimeRules,
              }}
              metrics={{
                filterControlWidth: tree.conditionPanelControlWidth,
                filterResizeMaxWidth: tree.conditionPanelResizeMaxWidth,
                filterResizeMinWidth: tree.conditionPanelResizeMinWidth,
              }}
              onSetBuilderSelectionContextMenu={tree.onSetBuilderSelectionContextMenu}
              renderFieldPreview={tree.renderFieldPreview}
              startResize={tree.startResize}
            />
            <div
              className="scrollbar-none min-h-0 flex-1 overflow-auto outline-none"
              tabIndex={0}
              onPaste={tree.onPasteMainColumns}
              style={{ backgroundColor: '#fcfdff' }}
            >
              {tree.builderMainTableBuilderNode}
            </div>
          </div>

          <div className={workspacePanelClass}>
            <div className={workspacePanelHeaderClass}>
              <div className="flex items-center gap-3">
                <div className={`${sectionIconClass} text-blue-600`}>
                  <span className="material-symbols-outlined text-[16px]">tab_group</span>
                </div>
                <div>
                  <h4 className="text-[12px] font-semibold text-slate-800 dark:text-slate-200">明细页签配置</h4>
                  <p className="mt-0.5 text-[11px] text-slate-400">页签与填充方式集中在这里</p>
                </div>
              </div>
              <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-semibold text-blue-500 dark:bg-blue-500/10">明细页签</span>
            </div>
            <DetailTabsWorkspace
              activeTab={tree.activeTab}
              currentDetailFillType={tree.currentDetailFillType}
              detailTabs={tree.detailTabs}
              detailWebUrl={tree.detailWebUrl}
              isConfigFullscreenActive={isConfigFullscreenActive}
              isDetailViewSelected={tree.isDetailViewSelected}
              onActivateCurrentView={tree.onActivateCurrentDetailView}
              onActivateTab={tree.onActivateDetailTab}
              onDeleteTab={tree.onDeleteDetailTab}
              onAddTab={tree.onAddDetailTab}
              onDeleteSelectedColumns={tree.onDeleteSelectedDetailColumns}
              onAddField={tree.onAddDetailColumn}
              onPasteTableColumns={tree.onPasteDetailColumns}
              onOpenWebConfig={tree.onOpenDetailWebConfig}
              selectedDetailForDelete={tree.selectedDetailForDelete}
              tableBuilderNode={tree.builderDetailTableBuilderNode}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
