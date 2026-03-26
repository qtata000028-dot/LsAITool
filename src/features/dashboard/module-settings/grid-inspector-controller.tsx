import React from 'react';

import {
  requestAiCreateMainTable,
  requestIdentifierTranslation,
  requestSqlDraft,
} from '../../../lib/minimax';
import { ArchiveLayoutSummarySection } from './archive-layout-summary-section';
import { ColorRuleManager } from './color-rule-manager';
import {
  buildContextMenuItem,
  normalizeContextMenuItem,
} from './context-menu-utils';
import {
  createSuggestedDetailBoardGroups,
  getDetailBoardTheme,
  normalizeDetailBoardConfig,
} from './detail-board-config';
import { DetailBoardLayoutManagerContainer } from './detail-board-layout-manager-container';
import { DetailChartConfigSection } from './detail-chart-config-section';
import {
  DocumentMainTableSetupSection,
  GridConfigSummarySection,
  GridIdentifierTranslationSection,
  GridSqlConfigSection,
  LeftGridMappingSection,
} from './grid-overview-sections';
import { PopupMenuManager } from './popup-menu-manager';

type DetailFillTypeOption = {
  backendValue?: string;
  label: string;
  value: string;
};

type DetailChartTypeOption = {
  label: string;
  value: string;
};

type GridInspectorControllerProps = {
  DesignerWorkbenchDraggableItem: React.ComponentType<any>;
  DesignerWorkbenchDropLane: React.ComponentType<any>;
  activateColumnSelection: (scope: 'left' | 'main' | 'detail', columnId?: string) => void;
  activeDetailBoardResize: any;
  activeTab: string;
  billHeaderWorkbenchMaxRows: number;
  billHeaderWorkbenchMinRows: number;
  applyDetailModuleInheritanceById: (tabId: string, moduleCode: string) => Promise<boolean>;
  billSources: any[];
  buildGridColorRule: (index: number, overrides?: Record<string, any>) => any;
  businessType: string;
  compactCardClass: string;
  compactInfoCardClass: string;
  context: any;
  currentMenuDraft: Record<string, any>;
  currentModuleCode: string;
  currentModuleName: string;
  designerWorkbenchSensors: any;
  detailBoardClipboardIds: string[];
  detailBoardFieldDefaultWidth: number;
  detailChartTypeOptions: DetailChartTypeOption[];
  detailFillTypeOptions: DetailFillTypeOption[];
  detailSourceModuleCandidates: any[];
  detailTabs: any[];
  documentConditionOwnerSourceId: string;
  getDetailFillTypeBackendValue: (fillType?: string) => string;
  getDetailFillTypeMeta: (fillType?: string) => any;
  getDetailTabConfigById: (tabId: string) => any;
  gridColorRuleOperatorOptions: string[];
  handleDetailModuleCodeChange: (tabId: string, moduleCode: string, options?: Record<string, any>) => void;
  inspectorTabsNode: React.ReactNode;
  inspectorTarget: any;
  isColorPanelTab: boolean;
  isCommonPanelTab: boolean;
  isContextMenuPanelTab: boolean;
  isGeneratingSqlDraft: boolean;
  isTranslatingIdentifiers: boolean;
  leftFilterFields: any[];
  loadSingleTableDetailResourcesById: (tabId: string, fillType: string) => Promise<any>;
  fieldClass: string;
  getBillHeaderRowCount: () => number;
  getOrderedBillHeaderFields: () => any[];
  mutedLabelClass: string;
  normalizeColumn: (column: any) => any;
  normalizeDetailChartConfig: (config: any) => any;
  normalizeDetailFillTypeValue: (fillType?: string) => string;
  onOpenArchiveLayoutEditor: () => void;
  onOpenDetailBoardPreview: (previewRows?: number, sortColumnId?: string | null) => void;
  onOpenColorRules: () => void;
  onOpenContextMenus: () => void;
  onOpenSourceGridSelection: () => void;
  onRenderAdvancedPlaceholder: (message: string) => React.ReactNode;
  onResetDetailBoardFieldWidth: (event: React.MouseEvent<HTMLButtonElement>, groupId: string, columnId: string) => void;
  onResetMainSelection: () => void;
  onStartDetailBoardFieldResize: (groupId: string, columnId: string, dimension: 'width' | 'height', event: React.PointerEvent) => void;
  onUpdateGridColumns: (scope: string, updater: React.SetStateAction<any[]>) => void;
  onUpdateBillHeaderWorkbenchRows: (rows: number) => void;
  panelBadgeClass: string;
  panelHeaderClass: string;
  panelIconShellClass: string;
  panelShellClass: string;
  panelTitleClass: string;
  parseDetailBoardClipboardColumnIds: (value: string, availableColumns: any[]) => string[];
  quietDocumentInspectorActionClass: string;
  renderFieldPreview: (...args: any[]) => React.ReactNode;
  sectionTitleClass: string;
  selectedDetailBoardGroupId: string | null;
  selectedDetailColorRuleId: string | null;
  selectedDetailContextMenuId: string | null;
  selectedLeftColorRuleId: string | null;
  selectedLeftContextMenuId: string | null;
  selectedMainColorRuleId: string | null;
  selectedMainContextMenuId: string | null;
  selectedPopupMenuParamKey: string;
  setDetailTabs: React.Dispatch<React.SetStateAction<any[]>>;
  setInspectorTarget: React.Dispatch<React.SetStateAction<any>>;
  setIsGeneratingSqlDraft: React.Dispatch<React.SetStateAction<boolean>>;
  setIsTranslatingIdentifiers: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedDetailBoardGroupId: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedDetailColorRuleId: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedDetailContextMenuId: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedLeftColorRuleId: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedLeftContextMenuId: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedMainForDelete: React.Dispatch<React.SetStateAction<string[]>>;
  setSelectedMainColorRuleId: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedMainContextMenuId: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedPopupMenuParamKey: React.Dispatch<React.SetStateAction<string>>;
  showToast: (message: string) => void;
  setInspectorPanelTab: React.Dispatch<React.SetStateAction<'common' | 'contextmenu' | 'color'>>;
  syncDetailColumnsFromSqlById: (tabId: string, sql: string, options?: Record<string, any>) => void;
  tableTypeOptions: string[];
  treeRelationColumn: any;
  updateDetailTabConfigById: (tabId: string, updater: (prev: any) => any) => void;
  workspaceTheme: string;
};

export function GridInspectorController({
  DesignerWorkbenchDraggableItem,
  DesignerWorkbenchDropLane,
  activateColumnSelection,
  activeDetailBoardResize,
  activeTab,
  billHeaderWorkbenchMaxRows,
  billHeaderWorkbenchMinRows,
  applyDetailModuleInheritanceById,
  billSources,
  buildGridColorRule,
  businessType,
  compactCardClass,
  compactInfoCardClass,
  context,
  currentMenuDraft,
  currentModuleCode,
  currentModuleName,
  designerWorkbenchSensors,
  detailBoardClipboardIds,
  detailBoardFieldDefaultWidth,
  detailChartTypeOptions,
  detailFillTypeOptions,
  detailSourceModuleCandidates,
  detailTabs,
  documentConditionOwnerSourceId,
  getDetailFillTypeBackendValue,
  getDetailFillTypeMeta,
  getDetailTabConfigById,
  gridColorRuleOperatorOptions,
  handleDetailModuleCodeChange,
  inspectorTabsNode,
  inspectorTarget,
  isColorPanelTab,
  isCommonPanelTab,
  isContextMenuPanelTab,
  isGeneratingSqlDraft,
  isTranslatingIdentifiers,
  leftFilterFields,
  loadSingleTableDetailResourcesById,
  fieldClass,
  getBillHeaderRowCount,
  getOrderedBillHeaderFields,
  mutedLabelClass,
  normalizeColumn,
  normalizeDetailChartConfig,
  normalizeDetailFillTypeValue,
  onOpenArchiveLayoutEditor,
  onOpenColorRules,
  onOpenContextMenus,
  onOpenDetailBoardPreview,
  onOpenSourceGridSelection,
  onRenderAdvancedPlaceholder,
  onResetDetailBoardFieldWidth,
  onResetMainSelection,
  onStartDetailBoardFieldResize,
  onUpdateGridColumns,
  onUpdateBillHeaderWorkbenchRows,
  panelBadgeClass,
  panelHeaderClass,
  panelIconShellClass,
  panelShellClass,
  panelTitleClass,
  parseDetailBoardClipboardColumnIds,
  quietDocumentInspectorActionClass,
  renderFieldPreview,
  sectionTitleClass,
  selectedDetailBoardGroupId,
  selectedDetailColorRuleId,
  selectedDetailContextMenuId,
  selectedLeftColorRuleId,
  selectedLeftContextMenuId,
  selectedMainColorRuleId,
  selectedMainContextMenuId,
  selectedPopupMenuParamKey,
  setDetailTabs,
  setInspectorTarget,
  setIsGeneratingSqlDraft,
  setIsTranslatingIdentifiers,
  setSelectedDetailBoardGroupId,
  setSelectedDetailColorRuleId,
  setSelectedDetailContextMenuId,
  setSelectedLeftColorRuleId,
  setSelectedLeftContextMenuId,
  setSelectedMainForDelete,
  setSelectedMainColorRuleId,
  setSelectedMainContextMenuId,
  setSelectedPopupMenuParamKey,
  setInspectorPanelTab,
  showToast,
  syncDetailColumnsFromSqlById,
  tableTypeOptions,
  treeRelationColumn,
  updateDetailTabConfigById,
  workspaceTheme,
}: GridInspectorControllerProps) {
  const availableGridColumns = context.availableColumns ?? [];
  const currentGridConfig = context.column;
  const currentDetailBoard = normalizeDetailBoardConfig(currentGridConfig.detailBoard, availableGridColumns);
  const detailBoardTheme = getDetailBoardTheme(workspaceTheme);
  const treeOwnerField = treeRelationColumn ? normalizeColumn(treeRelationColumn) : null;
  const treeOwnerFieldKey = treeOwnerField?.sourceField || treeRelationColumn?.id || '';
  const isMainGridConfig = context.scope === 'main-grid';
  const isLeftGridConfig = context.scope === 'left-grid';
  const isBillHeadGridConfig = businessType === 'table' && context.scope === 'main-grid';
  const isBillDetailGridConfig = businessType === 'table' && context.scope === 'detail-grid';
  const isDocumentDetailGrid = businessType !== 'table' && context.scope === 'detail-grid';
  const isDocumentArchiveGrid = businessType !== 'table' && (isMainGridConfig || isLeftGridConfig);
  const useQuietDocumentInspector = isDocumentDetailGrid || isDocumentArchiveGrid;
  const selectedDetailInspectorFillType = isDocumentDetailGrid && detailFillTypeOptions.some((option) => option.value === inspectorTarget.id)
    ? inspectorTarget.id
    : '表格';
  const detailGridFillTypeMeta = !isBillHeadGridConfig && !isBillDetailGridConfig && context.scope === 'detail-grid'
    ? getDetailFillTypeMeta(selectedDetailInspectorFillType)
    : null;
  const isDetailChartInspector = detailGridFillTypeMeta?.value === '图表';
  const currentDetailTabConfig = isDocumentDetailGrid
    ? getDetailTabConfigById(activeTab)
    : null;
  const currentDetailSourceModuleCode = String(currentDetailTabConfig?.relatedModule || '').trim();
  const currentDetailTabName = detailTabs.find((tab) => tab.id === activeTab)?.name || currentDetailTabConfig?.detailName || '当前明细';
  const currentDetailChartConfig = normalizeDetailChartConfig(currentGridConfig.chartConfig);
  const isTableLikeDetailInspector = detailGridFillTypeMeta?.value === '表格' || detailGridFillTypeMeta?.value === '树表格';
  const isDetailModuleInheritanceMode = isDocumentDetailGrid
    && isTableLikeDetailInspector
    && !isDetailChartInspector
    && (
      String(currentGridConfig.sourceMode || '').trim() === 'module'
      || currentDetailSourceModuleCode.length > 0
    );
  const detailGridSummaryTitle = detailGridFillTypeMeta?.value === '图表'
    ? '图表加载属性'
    : detailGridFillTypeMeta?.value === '树表格'
      ? '明细树表属性'
      : detailGridFillTypeMeta?.value === '网页'
        ? '网页视图属性'
        : '明细表属性';
  const detailChartFieldOptions = Array.from(
    new Map(
      availableGridColumns
        .map((column: any) => normalizeColumn(column))
        .map((column) => {
          const fieldValue = String(column.sourceField || column.name || '').trim();
          if (!fieldValue) return null;
          return [fieldValue, {
            value: fieldValue,
            label: column.sourceField
              ? `${column.name || column.sourceField} · ${column.sourceField}`
              : (column.name || fieldValue),
          }];
        })
        .filter(Boolean) as [string, { value: string; label: string }][]
    ).values(),
  );
  const contextMenuItems = (currentGridConfig.contextMenuItems ?? []).map((item: any, index: number) => normalizeContextMenuItem(item, index + 1));
  const enabledMenuCount = contextMenuItems.filter((item: any) => !item.disabled).length;
  const colorRules = currentGridConfig.colorRules ?? [];
  const enabledColorRuleCount = colorRules.filter((rule: any) => !rule.disabled).length;
  const canManageDetailGridDecorations = isDocumentDetailGrid && !isDetailChartInspector;
  const activeContextMenuSelectionId = isLeftGridConfig
    ? selectedLeftContextMenuId
    : canManageDetailGridDecorations
      ? selectedDetailContextMenuId
      : selectedMainContextMenuId;
  const activeColorRuleSelectionId = isLeftGridConfig
    ? selectedLeftColorRuleId
    : canManageDetailGridDecorations
      ? selectedDetailColorRuleId
      : selectedMainColorRuleId;
  const setActiveContextMenuSelectionId = isLeftGridConfig
    ? setSelectedLeftContextMenuId
    : canManageDetailGridDecorations
      ? setSelectedDetailContextMenuId
      : setSelectedMainContextMenuId;
  const setActiveColorRuleSelectionId = isLeftGridConfig
    ? setSelectedLeftColorRuleId
    : canManageDetailGridDecorations
      ? setSelectedDetailColorRuleId
      : setSelectedMainColorRuleId;

  const updateGridConfig = (patch: Record<string, any>) => {
    context.setCols((prev: Record<string, any>) => ({
      ...prev,
      ...patch,
    }));
  };

  const updateActiveDetailTabConfig = (patch: Record<string, any>) => {
    if (!isDocumentDetailGrid) return;
    const normalizedPatch: Record<string, any> = Object.prototype.hasOwnProperty.call(patch, 'detailType')
      ? (() => {
          const normalizedType = normalizeDetailFillTypeValue(patch.detailType);
          return {
            ...patch,
            detailType: normalizedType,
            detailTypeCode: getDetailFillTypeBackendValue(normalizedType),
          };
        })()
      : patch;
    updateDetailTabConfigById(activeTab, (prev) => ({
      ...(prev ?? getDetailTabConfigById(activeTab)),
      ...normalizedPatch,
    }));
  };

  const updateDetailChartConfig = (patch: Record<string, any>) => {
    updateGridConfig({
      chartConfig: {
        ...currentDetailChartConfig,
        ...patch,
      },
    });
  };

  const setGridContextMenuItems = (updater: any[] | ((items: any[]) => any[])) => {
    const nextItems = (typeof updater === 'function' ? updater(contextMenuItems) : updater)
      .map((item: any, index: number) => normalizeContextMenuItem(
        isLeftGridConfig
          ? { ...item, tab: treeOwnerFieldKey }
          : item,
        index + 1,
      ));
    updateGridConfig({
      contextMenuItems: nextItems,
      contextMenuEnabled: nextItems.length > 0,
    });
  };

  const setGridColorRules = (updater: any[] | ((rules: any[]) => any[])) => {
    const nextRules = (typeof updater === 'function' ? updater(colorRules) : updater)
      .map((rule: any) => (
        isLeftGridConfig
          ? { ...rule, tab: treeOwnerFieldKey }
          : rule
      ));
    updateGridConfig({
      colorRules: nextRules,
      colorRulesEnabled: nextRules.some((rule: any) => !rule.disabled),
    });
  };

  const updateDetailBoard = (patch: Record<string, any> | ((current: any) => any)) => {
    updateGridConfig({
      detailBoard: typeof patch === 'function'
        ? patch(currentDetailBoard)
        : {
            ...currentDetailBoard,
            ...patch,
          },
    });
  };

  const detailBoardReady = currentDetailBoard.groups.length > 0;
  const applySuggestedDetailLayout = () => {
    const suggestedGroups = createSuggestedDetailBoardGroups(availableGridColumns);
    updateDetailBoard({
      ...currentDetailBoard,
      groups: suggestedGroups,
      sortColumnId: availableGridColumns[0]?.id ?? null,
    });
    setSelectedDetailBoardGroupId(suggestedGroups[0]?.id ?? null);
    showToast('已应用推荐详情分组布局');
  };

  const isGridDecorationManagerAvailable = isDocumentArchiveGrid || canManageDetailGridDecorations;
  const selectedPopupMenuItem = isGridDecorationManagerAvailable
    ? contextMenuItems.find((item: any) => item.id === activeContextMenuSelectionId) ?? contextMenuItems[0] ?? null
    : null;
  const selectedColorRule = isGridDecorationManagerAvailable
    ? colorRules.find((rule: any) => rule.id === activeColorRuleSelectionId) ?? colorRules[0] ?? null
    : null;
  const popupMenuTabValue = isLeftGridConfig
    ? treeOwnerFieldKey
    : canManageDetailGridDecorations
      ? String(currentDetailTabConfig?.tabKey || activeTab)
      : String(currentMenuDraft.moduleCode ?? '');
  const translatableColumns = availableGridColumns.filter((column: any) => {
    const normalizedColumn = normalizeColumn(column);
    return /[\u4e00-\u9fff]/.test(normalizedColumn.name || '') && !/[A-Za-z]/.test(normalizedColumn.sourceField || '');
  });

  const generateGridSqlDraft = async () => {
    setIsGeneratingSqlDraft(true);

    try {
      const gridDraftTitle = String(
        (isDocumentArchiveGrid && isMainGridConfig ? currentGridConfig.tableName : '') || context.title || '当前表',
      ).trim() || '当前表';
      const response = await requestSqlDraft({
        title: gridDraftTitle,
        description: currentGridConfig.sqlPrompt || '',
        tableType: currentGridConfig.tableType || '普通表格',
        columns: availableGridColumns.map((column: any) => {
          const normalizedColumn = normalizeColumn(column);
          return {
            id: normalizedColumn.id,
            identifier: normalizedColumn.sourceField || '',
            name: normalizedColumn.name,
            type: normalizedColumn.type,
          };
        }),
      });

      updateGridConfig({
        defaultQuery: response.draft.defaultQuery,
        mainSql: response.draft.mainSql,
      });
      showToast('已通过 MiniMax 生成主 SQL 草案');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'MiniMax 生成主 SQL 失败');
    } finally {
      setIsGeneratingSqlDraft(false);
    }
  };

  const createMainTableWithAi = async () => {
    if (!isDocumentArchiveGrid || !isMainGridConfig) {
      void generateGridSqlDraft();
      return;
    }

    const rawTableName = String(currentGridConfig.tableName || '').trim();
    if (!rawTableName) {
      showToast('请先填写主表名');
      return;
    }

    if (availableGridColumns.length === 0) {
      showToast('请先配置主表字段');
      return;
    }

    setIsGeneratingSqlDraft(true);

    try {
      const response = await requestAiCreateMainTable({
        columns: availableGridColumns.map((column: any) => {
          const normalizedColumn = normalizeColumn(column);
          return {
            id: normalizedColumn.id,
            identifier: normalizedColumn.sourceField || '',
            name: normalizedColumn.name,
            type: normalizedColumn.type,
          };
        }),
        description: currentGridConfig.sqlPrompt || '',
        moduleCode: currentModuleCode,
        moduleName: currentModuleName,
        persist: true,
        tableName: rawTableName,
        tableType: currentGridConfig.tableType || '普通表格',
      });

      updateGridConfig({
        createTableSql: response.result.createTableSql,
        defaultQuery: response.result.defaultQuery,
        mainSql: response.result.mainSql,
        tableName: response.result.tableName,
      });
      onUpdateGridColumns(context.scope, (prev) => prev.map((column: any) => {
        const matched = response.result.translatedColumns.find((item) => item.id === column.id);
        return matched
          ? { ...column, sourceField: matched.identifier }
          : column;
      }));

      if (import.meta.env.DEV) {
        console.info('[AI一键建表]', response.result);
      }

      const persistenceMessage = response.result.persistence.message ? `，${response.result.persistence.message}` : '';
      if (response.result.persistence.status === 'saved') {
        showToast(`AI一键建表完成，主表 SQL 已更新并提交后端保存${persistenceMessage}`);
      } else if (response.result.persistence.status === 'failed') {
        showToast(`AI一键建表完成，但后端保存失败${persistenceMessage}`);
      } else if (response.result.persistence.status === 'pending') {
        showToast(`AI一键建表完成，界面已更新，后端保存口待接入${persistenceMessage}`);
      } else {
        showToast('AI一键建表完成，主表字段与 SQL 已更新');
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'AI一键建表失败');
    } finally {
      setIsGeneratingSqlDraft(false);
    }
  };

  const translateGridIdentifiers = async () => {
    if (translatableColumns.length === 0) {
      showToast('当前表格没有需要翻译的中文字段');
      return;
    }

    setIsTranslatingIdentifiers(true);

    try {
      const response = await requestIdentifierTranslation(
        translatableColumns.map((column: any) => {
          const normalizedColumn = normalizeColumn(column);
          return {
            id: normalizedColumn.id,
            identifier: normalizedColumn.sourceField || '',
            name: normalizedColumn.name,
          };
        }),
      );
      const identifierMap = new Map(response.items.map((item) => [item.id, item.identifier]));

      onUpdateGridColumns(context.scope, (prev) => prev.map((column) => (
        identifierMap.has(column.id)
          ? { ...column, sourceField: identifierMap.get(column.id) }
          : column
      )));
      showToast(`已翻译 ${response.items.length} 个字段标识`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'MiniMax 翻译字段标识失败');
    } finally {
      setIsTranslatingIdentifiers(false);
    }
  };

  const updateSelectedPopupMenuItem = (patch: Record<string, any>) => {
    if (!selectedPopupMenuItem) return;

    const mirroredPatch = {
      ...patch,
      ...(patch.menuname !== undefined ? { label: patch.menuname } : {}),
      ...(patch.label !== undefined ? { menuname: patch.label } : {}),
      ...(patch.dllname !== undefined ? { actionKey: patch.dllname } : {}),
      ...(patch.actionKey !== undefined ? { dllname: patch.actionKey } : {}),
      ...(patch.menuCond !== undefined ? { disabledCondition: patch.menuCond } : {}),
      ...(patch.disabledCondition !== undefined ? { menuCond: patch.disabledCondition } : {}),
    };

    setGridContextMenuItems((menus: any[]) => menus.map((menu: any) => (
      menu.id === selectedPopupMenuItem.id ? { ...menu, ...mirroredPatch } : menu
    )));
  };

  return (
    <div className={panelShellClass}>
      <div className={panelHeaderClass}>
        <div className="flex min-w-0 items-start gap-3">
          <div className={`${panelIconShellClass} ${context.iconClass}`}>
            <span className="material-symbols-outlined text-[18px]">{context.icon}</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className={panelTitleClass}>{context.title}</h3>
              {!useQuietDocumentInspector ? <span className={panelBadgeClass}>{isDocumentDetailGrid ? '明细页签' : '表格级配置'}</span> : null}
              {isDetailChartInspector ? (
                <span className="inline-flex items-center rounded-full border border-[#1686e3]/18 bg-[#1686e3]/8 px-2.5 py-1 text-[10px] font-bold text-[#1686e3]">
                  p_systemdlltabchart
                </span>
              ) : null}
            </div>
            {useQuietDocumentInspector ? (
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-300">
                {isDocumentDetailGrid
                  ? `${detailGridFillTypeMeta?.label || '表格'} · 右侧只维护当前视图本身配置`
                  : '右侧只保留当前表格的直接配置，去掉低价值摘要和装饰信息'}
              </p>
            ) : null}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {!isBillHeadGridConfig && !isBillDetailGridConfig && !isLeftGridConfig && !isDetailChartInspector && !isMainGridConfig ? (
              <button
                type="button"
                onClick={applySuggestedDetailLayout}
                className={useQuietDocumentInspector ? quietDocumentInspectorActionClass : 'inline-flex h-9 items-center gap-1.5 rounded-[14px] border border-slate-200/80 bg-white/92 px-3 text-[12px] font-bold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/72 dark:text-slate-200'}
              >
                <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                推荐布局
              </button>
            ) : null}
            {isMainGridConfig && !isBillHeadGridConfig ? (
              <button
                type="button"
                onClick={() => onOpenDetailBoardPreview(1, currentDetailBoard.sortColumnId)}
                disabled={!detailBoardReady}
                className={`${useQuietDocumentInspector ? 'inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[11px] font-medium transition-colors' : 'inline-flex h-9 items-center gap-1.5 rounded-[14px] px-3 text-[12px] font-bold transition-colors'} ${
                  detailBoardReady
                    ? `${useQuietDocumentInspector ? 'shadow-none' : 'shadow-[0_16px_28px_-22px_rgba(15,23,42,0.24)]'} bg-[color:var(--workspace-accent)] text-white hover:bg-[color:var(--workspace-accent-strong)]`
                    : 'cursor-not-allowed bg-slate-100 text-slate-300 dark:bg-slate-800 dark:text-slate-600'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">preview</span>
                预览详情
              </button>
            ) : null}
          </div>
        </div>
        {inspectorTabsNode}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4">
        {isContextMenuPanelTab && isGridDecorationManagerAvailable ? (
          <PopupMenuManager
            contextMenuItems={contextMenuItems}
            enabledMenuCount={enabledMenuCount}
            selectedItem={selectedPopupMenuItem}
            selectedParamKey={selectedPopupMenuParamKey}
            onSelectParamKey={setSelectedPopupMenuParamKey}
            onAddItem={() => {
              const nextItem = buildContextMenuItem(contextMenuItems.length + 1, {
                tab: popupMenuTabValue,
              });
              setGridContextMenuItems([...contextMenuItems, nextItem]);
              setActiveContextMenuSelectionId(nextItem.id);
            }}
            onSelectItem={setActiveContextMenuSelectionId}
            onDeleteItem={(itemId) => setGridContextMenuItems((menus: any[]) => menus.filter((menu: any) => menu.id !== itemId))}
            onToggleItemDisabled={(itemId, disabled) => setGridContextMenuItems((menus: any[]) => menus.map((menu: any) => (
              menu.id === itemId ? { ...menu, disabled } : menu
            )))}
            onUpdateSelectedItem={updateSelectedPopupMenuItem}
          />
        ) : isColorPanelTab && isGridDecorationManagerAvailable ? (
          <ColorRuleManager
            colorRules={colorRules}
            enabledColorRuleCount={enabledColorRuleCount}
            selectedRule={selectedColorRule}
            fieldOptions={availableGridColumns.map((column: any) => {
              const normalizedColumn = normalizeColumn(column);
              return {
                label: `${normalizedColumn.name} (${normalizedColumn.sourceField || '未配置标识'})`,
                value: normalizedColumn.sourceField || normalizedColumn.name,
              };
            })}
            operatorOptions={gridColorRuleOperatorOptions}
            onAddRule={() => {
              const nextRule = buildGridColorRule(colorRules.length + 1, isLeftGridConfig ? { tab: treeOwnerFieldKey } : {});
              setGridColorRules([...colorRules, nextRule]);
              setActiveColorRuleSelectionId(nextRule.id);
            }}
            onSelectRule={setActiveColorRuleSelectionId}
            onDeleteRule={(ruleId) => setGridColorRules((rules: any[]) => rules.filter((item: any) => item.id !== ruleId))}
            onToggleRuleDisabled={(ruleId, disabled) => setGridColorRules((rules: any[]) => rules.map((item: any) => (
              item.id === ruleId ? { ...item, disabled } : item
            )))}
            onUpdateRule={(ruleId, patch) => setGridColorRules((rules: any[]) => rules.map((item: any) => (
              item.id === ruleId ? { ...item, ...patch } : item
            )))}
          />
        ) : isCommonPanelTab ? (
          isBillHeadGridConfig ? (
            <div className="space-y-4">
              <section className={compactCardClass}>
                <div className={sectionTitleClass}>
                  <span className="material-symbols-outlined text-[18px] text-[color:var(--workspace-accent)]">dashboard</span>
                  <h4>头部流式布局</h4>
                </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className={compactInfoCardClass}>
                        <div className="text-[11px] font-bold tracking-[0.08em] text-slate-400">控件数量</div>
                    <div className="mt-1 text-[13px] font-bold text-slate-700 dark:text-slate-100">{getOrderedBillHeaderFields().length} 个</div>
                      </div>
                      <div className={compactInfoCardClass}>
                        <div className="text-[11px] font-bold tracking-[0.08em] text-slate-400">布局模式</div>
                        <div className="mt-1 text-[13px] font-bold text-slate-700 dark:text-slate-100">按行插入</div>
                      </div>
                      <div className={compactInfoCardClass}>
                        <div className="text-[11px] font-bold tracking-[0.08em] text-slate-400">控件行数</div>
                        <div className="mt-1 text-[13px] font-bold text-slate-700 dark:text-slate-100">{getBillHeaderRowCount()} 行</div>
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className={mutedLabelClass}>控件行数</label>
                        <input
                          type="number"
                          min={billHeaderWorkbenchMinRows}
                          max={billHeaderWorkbenchMaxRows}
                          value={getBillHeaderRowCount()}
                          onChange={(event) => onUpdateBillHeaderWorkbenchRows(Number(event.target.value) || billHeaderWorkbenchMinRows)}
                          className={fieldClass}
                        />
                      </div>
                      <div className={compactInfoCardClass}>
                        <div className="text-[11px] font-bold tracking-[0.08em] text-slate-400">拖放规则</div>
                        <div className="mt-1 text-[13px] font-bold text-slate-700 dark:text-slate-100">拖到前面即插入</div>
                        <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                          目标控件和后续控件会顺位后移，便于排布头部字段。
                        </div>
                      </div>
                    </div>
                  </section>
                  <section className={compactCardClass}>
                    <div className={sectionTitleClass}>
                      <span className="material-symbols-outlined text-[18px] text-[color:var(--workspace-accent)]">database</span>
                      <h4>来源表</h4>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className={mutedLabelClass}>已配置来源</label>
                        <div className="rounded-[18px] border border-slate-200/80 bg-slate-50/92 px-3.5 py-3 text-[12px] text-slate-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] dark:border-slate-700 dark:bg-slate-900/72 dark:text-slate-200">
                          {billSources.length} 个来源
                          <div className="mt-1 truncate text-[11px] text-slate-400">
                            {billSources.map((item) => item.sourceName || '未命名来源').join(' / ')}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={onOpenSourceGridSelection}
                          className="inline-flex h-10 items-center gap-1.5 rounded-[14px] bg-[color:var(--workspace-accent)] px-4 text-[12px] font-bold text-white shadow-[0_18px_30px_-24px_var(--workspace-accent-shadow)]"
                        >
                          <span className="material-symbols-outlined text-[16px]">database</span>
                          配置来源表
                        </button>
                      </div>
                    </div>
                  </section>
              <GridSqlConfigSection
                isDetailConfig={isDocumentDetailGrid}
                sqlPrompt={currentGridConfig.sqlPrompt || ''}
                mainSql={currentGridConfig.mainSql || ''}
                conditionValue={isDocumentDetailGrid ? (currentGridConfig.sourceCondition || currentGridConfig.defaultQuery || '') : (currentGridConfig.defaultQuery || '')}
                isGeneratingSqlDraft={isGeneratingSqlDraft}
                onGenerateSqlDraft={generateGridSqlDraft}
                onUpdateSqlPrompt={(value) => updateGridConfig({ sqlPrompt: value })}
                onUpdateMainSql={(value) => updateGridConfig({ mainSql: value })}
                onUpdateConditionValue={(value) => updateGridConfig(
                  isDocumentDetailGrid
                    ? { defaultQuery: value, sourceCondition: value }
                    : { defaultQuery: value },
                )}
              />
              <GridIdentifierTranslationSection
                availableGridColumnCount={availableGridColumns.length}
                translatableColumnCount={translatableColumns.length}
                isTranslatingIdentifiers={isTranslatingIdentifiers}
                onTranslate={translateGridIdentifiers}
              />
            </div>
          ) : isBillDetailGridConfig ? (
            <div className="space-y-4">
              <GridConfigSummarySection
                title="明细表属性"
                activeTitle={context.title}
                currentTableType={currentGridConfig.tableType}
                onUpdateTableType={(nextType) => updateGridConfig({ tableType: nextType })}
                tableTypeOptions={tableTypeOptions}
                detailGridFillTypeMeta={detailGridFillTypeMeta}
                chartTypeLabel={detailChartTypeOptions.find((option) => option.value === String(currentDetailChartConfig.chartType))?.label ?? '未设置'}
                chartTitle={currentDetailChartConfig.chartTitle || context.title}
                availableGridColumnCount={availableGridColumns.length}
                contextMenuCount={contextMenuItems.length}
                enabledColorRuleCount={enabledColorRuleCount}
                xAxisField={currentDetailChartConfig.XLabelField || ''}
                yAxisField={currentDetailChartConfig.YValueField || ''}
              />
              <GridSqlConfigSection
                isDetailConfig={isDocumentDetailGrid}
                sqlPrompt={currentGridConfig.sqlPrompt || ''}
                mainSql={currentGridConfig.mainSql || ''}
                conditionValue={isDocumentDetailGrid ? (currentGridConfig.sourceCondition || currentGridConfig.defaultQuery || '') : (currentGridConfig.defaultQuery || '')}
                isGeneratingSqlDraft={isGeneratingSqlDraft}
                onGenerateSqlDraft={generateGridSqlDraft}
                onUpdateSqlPrompt={(value) => updateGridConfig({ sqlPrompt: value })}
                onUpdateMainSql={(value) => updateGridConfig({ mainSql: value })}
                onUpdateConditionValue={(value) => updateGridConfig(
                  isDocumentDetailGrid
                    ? { defaultQuery: value, sourceCondition: value }
                    : { defaultQuery: value },
                )}
              />
              <GridIdentifierTranslationSection
                availableGridColumnCount={availableGridColumns.length}
                translatableColumnCount={translatableColumns.length}
                isTranslatingIdentifiers={isTranslatingIdentifiers}
                onTranslate={translateGridIdentifiers}
              />
            </div>
          ) : isLeftGridConfig ? (
            <div className="space-y-4">
              <LeftGridMappingSection
                hasTreeRelationColumn={Boolean(treeRelationColumn)}
                onLocateOwnerField={() => {
                  if (!treeRelationColumn) return;
                  setSelectedMainForDelete([treeRelationColumn.id]);
                  activateColumnSelection('main', treeRelationColumn.id);
                  setInspectorPanelTab('common');
                }}
                treeOwnerFieldName={treeOwnerField?.name || ''}
                treeOwnerFieldKey={treeOwnerFieldKey}
                leftFilterCount={leftFilterFields.length}
                documentConditionOwnerSourceId={documentConditionOwnerSourceId}
                contextMenuCount={contextMenuItems.length}
                colorRuleCount={colorRules.length}
                onOpenContextMenus={onOpenContextMenus}
                onOpenColorRules={onOpenColorRules}
              />
              <GridConfigSummarySection
                title="左侧树表属性"
                activeTitle={context.title}
                currentTableType={currentGridConfig.tableType}
                onUpdateTableType={(nextType) => updateGridConfig({ tableType: nextType })}
                tableTypeOptions={tableTypeOptions}
                detailGridFillTypeMeta={detailGridFillTypeMeta}
                chartTypeLabel={detailChartTypeOptions.find((option) => option.value === String(currentDetailChartConfig.chartType))?.label ?? '未设置'}
                chartTitle={currentDetailChartConfig.chartTitle || context.title}
                availableGridColumnCount={availableGridColumns.length}
                contextMenuCount={contextMenuItems.length}
                enabledColorRuleCount={enabledColorRuleCount}
                xAxisField={currentDetailChartConfig.XLabelField || ''}
                yAxisField={currentDetailChartConfig.YValueField || ''}
              />
            </div>
          ) : isDocumentDetailGrid ? (
            <div className="space-y-4">
              {isDetailChartInspector ? (
                <DetailChartConfigSection
                  chartTypeOptions={detailChartTypeOptions}
                  currentDetailChartConfig={currentDetailChartConfig}
                  currentDetailTabName={currentDetailTabName}
                  datalistId={`detail-chart-field-options-${context.scope}-${activeTab}`}
                  detailChartFieldOptions={detailChartFieldOptions}
                  onUpdateChartConfig={updateDetailChartConfig}
                />
              ) : (
                <>
                  <GridConfigSummarySection
                    title={detailGridSummaryTitle}
                    activeTitle={currentDetailTabName}
                    currentTableType={currentGridConfig.tableType}
                    onUpdateTableType={(nextType) => updateGridConfig({ tableType: nextType })}
                    tableTypeOptions={tableTypeOptions}
                    detailGridFillTypeMeta={detailGridFillTypeMeta}
                    chartTypeLabel={detailChartTypeOptions.find((option) => option.value === String(currentDetailChartConfig.chartType))?.label ?? '未设置'}
                    chartTitle={currentDetailChartConfig.chartTitle || context.title}
                    availableGridColumnCount={availableGridColumns.length}
                    contextMenuCount={contextMenuItems.length}
                    enabledColorRuleCount={enabledColorRuleCount}
                    xAxisField={currentDetailChartConfig.XLabelField || ''}
                    yAxisField={currentDetailChartConfig.YValueField || ''}
                  />
                  <GridSqlConfigSection
                    isDetailConfig={isDocumentDetailGrid}
                    sqlPrompt={currentGridConfig.sqlPrompt || ''}
                    mainSql={currentGridConfig.mainSql || ''}
                    conditionValue={currentGridConfig.sourceCondition || currentGridConfig.defaultQuery || ''}
                    conditionLabel="关联条件"
                    hideSqlPrompt={isDetailModuleInheritanceMode}
                    isGeneratingSqlDraft={isGeneratingSqlDraft}
                    mainSqlLabel={isDetailModuleInheritanceMode ? '继承主表 SQL' : '明细 SQL'}
                    onBlurMainSql={isDetailModuleInheritanceMode ? undefined : (value) => syncDetailColumnsFromSqlById(activeTab, value, { notify: false })}
                    onGenerateSqlDraft={generateGridSqlDraft}
                    onUpdateSqlPrompt={(value) => updateGridConfig({ sqlPrompt: value })}
                    onUpdateMainSql={(value) => updateGridConfig({ mainSql: value })}
                    onUpdateConditionValue={(value) => {
                      updateGridConfig({
                        defaultQuery: value,
                        sourceCondition: value,
                      });
                      updateActiveDetailTabConfig({ relatedCondition: value });
                    }}
                    readOnlyMainSql={isDetailModuleInheritanceMode}
                    sectionDescription={isDetailModuleInheritanceMode
                      ? '当前明细已继承目标模块的主表配置。'
                      : '当前明细使用独立 SQL 配置。'}
                    showGenerateButton={!isDetailModuleInheritanceMode}
                    title={isDetailModuleInheritanceMode ? '继承主表配置' : '明细 SQL'}
                  />
                  {!isDetailModuleInheritanceMode ? (
                    <GridIdentifierTranslationSection
                      availableGridColumnCount={availableGridColumns.length}
                      translatableColumnCount={translatableColumns.length}
                      isTranslatingIdentifiers={isTranslatingIdentifiers}
                      onTranslate={translateGridIdentifiers}
                    />
                  ) : null}
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {isDocumentArchiveGrid ? (
                <>
                  <DocumentMainTableSetupSection
                    isGeneratingSqlDraft={isGeneratingSqlDraft}
                    mainTableName={String(currentGridConfig.tableName || '')}
                    onGenerateSqlDraft={createMainTableWithAi}
                    onUpdateMainTableName={(value) => updateGridConfig({ tableName: value })}
                  />
                  <GridIdentifierTranslationSection
                    availableGridColumnCount={availableGridColumns.length}
                    translatableColumnCount={translatableColumns.length}
                    isTranslatingIdentifiers={isTranslatingIdentifiers}
                    onTranslate={translateGridIdentifiers}
                  />
                </>
              ) : null}
              <GridConfigSummarySection
                title={detailGridFillTypeMeta?.value === '图表' ? '图表加载属性' : '主表属性'}
                activeTitle={context.title}
                currentTableType={currentGridConfig.tableType}
                onUpdateTableType={(nextType) => updateGridConfig({ tableType: nextType })}
                tableTypeOptions={tableTypeOptions}
                detailGridFillTypeMeta={detailGridFillTypeMeta}
                chartTypeLabel={detailChartTypeOptions.find((option) => option.value === String(currentDetailChartConfig.chartType))?.label ?? '未设置'}
                chartTitle={currentDetailChartConfig.chartTitle || context.title}
                availableGridColumnCount={availableGridColumns.length}
                contextMenuCount={contextMenuItems.length}
                enabledColorRuleCount={enabledColorRuleCount}
                xAxisField={currentDetailChartConfig.XLabelField || ''}
                yAxisField={currentDetailChartConfig.YValueField || ''}
              />
              <GridSqlConfigSection
                isDetailConfig={isDocumentDetailGrid}
                sqlPrompt={currentGridConfig.sqlPrompt || ''}
                mainSql={currentGridConfig.mainSql || ''}
                conditionValue={isDocumentDetailGrid ? (currentGridConfig.sourceCondition || currentGridConfig.defaultQuery || '') : (currentGridConfig.defaultQuery || '')}
                isGeneratingSqlDraft={isGeneratingSqlDraft}
                onGenerateSqlDraft={generateGridSqlDraft}
                onUpdateSqlPrompt={(value) => updateGridConfig({ sqlPrompt: value })}
                onUpdateMainSql={(value) => updateGridConfig({ mainSql: value })}
                onUpdateConditionValue={(value) => updateGridConfig(
                  isDocumentDetailGrid
                    ? { defaultQuery: value, sourceCondition: value }
                    : { defaultQuery: value },
                )}
                showGenerateButton={!isDocumentArchiveGrid}
              />
              {!isDocumentArchiveGrid ? (
                <GridIdentifierTranslationSection
                  availableGridColumnCount={availableGridColumns.length}
                  translatableColumnCount={translatableColumns.length}
                  isTranslatingIdentifiers={isTranslatingIdentifiers}
                  onTranslate={translateGridIdentifiers}
                />
              ) : null}
            </div>
          )
        ) : (
          isBillHeadGridConfig || isBillDetailGridConfig ? (
            <div className="space-y-3">
              {onRenderAdvancedPlaceholder('当前模式暂无扩展配置')}
            </div>
          ) : isLeftGridConfig ? (
            <div className="space-y-3">
              <section className="rounded-[18px] border border-slate-200/75 bg-white/94 p-4 shadow-[0_16px_28px_-24px_rgba(15,23,42,0.16)] dark:border-slate-700 dark:bg-slate-900/55">
                <div className="flex items-center gap-2 text-[12px] font-bold text-slate-700 dark:text-slate-100">
                  <span className="material-symbols-outlined text-[17px] text-[color:var(--workspace-accent)]">view_stream</span>
                  <h4>左侧布局</h4>
                </div>
                <div className="mt-3 rounded-[16px] border border-dashed border-slate-200/80 bg-slate-50/80 px-4 py-6 text-[12px] leading-6 text-slate-500 dark:border-slate-700 dark:bg-slate-900/45 dark:text-slate-300">
                  左侧树表暂不启用详情分组布局。列、条件、右键和颜色请分别在对应页签维护，动态 SQL 直接在所属树形字段的“基础定义”里配置。
                </div>
              </section>
            </div>
          ) : isDocumentArchiveGrid && isMainGridConfig ? (
            <div className="space-y-3">
              <ArchiveLayoutSummarySection
                availableGridColumnCount={availableGridColumns.length}
                compactCardClass={compactCardClass}
                compactInfoCardClass={compactInfoCardClass}
                groups={currentDetailBoard.groups}
                onOpenEditor={onOpenArchiveLayoutEditor}
                onOpenPreview={() => onOpenDetailBoardPreview(1, currentDetailBoard.sortColumnId)}
                sectionTitleClass={sectionTitleClass}
              />
            </div>
          ) : isDocumentDetailGrid && isDetailChartInspector ? (
            <div className="space-y-3">
              {onRenderAdvancedPlaceholder('图表视图暂无额外扩展配置')}
            </div>
          ) : (
            <div className="space-y-3">
              <DetailBoardLayoutManagerContainer
                DesignerWorkbenchDraggableItem={DesignerWorkbenchDraggableItem}
                DesignerWorkbenchDropLane={DesignerWorkbenchDropLane}
                activeDetailBoardResize={activeDetailBoardResize}
                availableGridColumns={availableGridColumns}
                currentDetailBoard={currentDetailBoard}
                designerWorkbenchSensors={designerWorkbenchSensors}
                detailBoardClipboardIds={detailBoardClipboardIds}
                detailBoardFieldDefaultWidth={detailBoardFieldDefaultWidth}
                detailBoardTheme={detailBoardTheme}
                emptyFieldsNode={onRenderAdvancedPlaceholder('还没有可分组字段')}
                normalizeColumn={normalizeColumn}
                onOpenDetailBoardPreview={onOpenDetailBoardPreview}
                onResetDetailBoardFieldWidth={onResetDetailBoardFieldWidth}
                onResetMainSelection={onResetMainSelection}
                onShowToast={showToast}
                onStartDetailBoardFieldResize={onStartDetailBoardFieldResize}
                onUpdateDetailBoard={updateDetailBoard}
                parseDetailBoardClipboardColumnIds={parseDetailBoardClipboardColumnIds}
                renderFieldPreview={renderFieldPreview}
                selectedDetailBoardGroupId={selectedDetailBoardGroupId}
                setSelectedDetailBoardGroupId={setSelectedDetailBoardGroupId}
              />
            </div>
          )
        )}
      </div>
    </div>
  );
}
