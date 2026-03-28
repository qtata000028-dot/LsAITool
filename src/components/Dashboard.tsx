import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMemo } from 'react';
import { type DesignRouteContext } from '../app/contracts/platform-routing';
import {
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  fetchSubsystemMenuTree,
  fetchSubsystemSecondLevelMenus,
  type BackendMenuNode,
  type BackendSubsystemNode,
} from '../lib/backend-menus';
import {
  fetchSingleTableDetailCharts,
  fetchSingleTableDetailColors,
  fetchSingleTableDetailGridFields,
  fetchSingleTableDetailMenus,
  fetchSingleTableFieldColors,
  fetchSingleTableModuleConfig,
  fetchSingleTableModuleColors,
  fetchSingleTableFieldConditions,
  fetchSingleTableFieldGridFields,
  fetchSingleTableModuleDetails,
  fetchSingleTableModuleFields,
  fetchSingleTableModuleConditions,
  fetchSingleTableModuleMenus,
  deleteBillTypeConfig,
  deleteSingleTableModuleConfig,
  type SingleTableConditionDto,
  type SingleTableContextMenuDto,
  type SingleTableColorRuleDto,
  type SingleTableDetailChartDto,
  type SingleTableDetailDto,
  type SingleTableGridFieldDto,
  type SingleTableModuleFieldDto,
} from '../lib/backend-module-config';
import {
  fetchSubsystemMenuConfig,
  saveSubsystemMenuConfig,
  type SubsystemMenuConfigDto,
} from '../lib/backend-subsystem-menu-config';
import {
  fetchFieldSqlTagOptions,
  fetchSystemTab,
  type FieldSqlTagOptionDto,
} from '../lib/backend-system';
import { requestIdentifierTranslation, requestSqlDraft, requestSurveyPlan, type SurveyPlan } from '../lib/minimax';
import {
  shadcnFieldClass,
  shadcnMutedLabelClass,
  shadcnTextareaClass,
} from './ui/shadcn-inspector';
import {
  resolveWorkbenchPreviewWidth,
  updateItemWidthById,
  useWorkbenchResizeState,
  type ActiveWorkbenchResize,
  type WorkbenchResizeMode,
} from '../features/dashboard/resize/use-workbench-resize-state';
import { useDashboardTheme } from '../features/dashboard/hooks/use-dashboard-theme';
import {
  designerWorkbenchRowActiveClass,
  designerWorkbenchRowEmptyClass,
  getCompactWorkbenchItemClass,
} from '../features/dashboard/designer/control-item-classes';
import {
  useWorkbenchFieldPreviewRenderer,
} from '../features/dashboard/designer/field-preview';
import {
  createRuntimeClassName,
  createRuntimeDeclarationBlock,
  joinRuntimeDeclarationBlocks,
} from '../features/dashboard/designer/runtime-dimension-rules';
import { DashboardOverview } from '../features/dashboard/dashboard-overview';
import { ResearchRecordWorkbench, type ResearchWorkbenchModuleOption } from '../features/dashboard/research-record-workbench';
import {
  type ConditionWorkbenchScope,
} from '../features/dashboard/module-settings/condition-workbench';
import { buildDashboardConfigBridgeNodes } from '../features/dashboard/module-settings/dashboard-config-bridge-nodes';
import { buildDashboardConfigBridgeModalsInput } from '../features/dashboard/module-settings/dashboard-config-bridge-modals-input';
import { buildDashboardConfigBridgeModuleSettingInput } from '../features/dashboard/module-settings/dashboard-config-bridge-module-setting-input';
import { buildDashboardConfigBridgeWorkspaceInput } from '../features/dashboard/module-settings/dashboard-config-bridge-workspace-input';
import { useDocumentConditionWorkbench } from '../features/dashboard/module-settings/use-document-condition-workbench';
import { useDocumentWorkspaceLayout } from '../features/dashboard/module-settings/use-document-workspace-layout';
import { useDetailGridSourceConfig } from '../features/dashboard/module-settings/use-detail-grid-source-config';
import { useDashboardInspectorPanelProps } from '../features/dashboard/module-settings/use-dashboard-inspector-panel-props';
import { useSelectedColumnContext } from '../features/dashboard/module-settings/use-selected-column-context';
import {
  normalizeContextMenuItem,
} from '../features/dashboard/module-settings/context-menu-utils';
import {
  buildDetailBoardConfig,
  DETAIL_BOARD_THEME_OPTIONS,
  getDetailBoardTheme,
  normalizeDetailBoardConfig,
} from '../features/dashboard/module-settings/detail-board-config';
import { buildDashboardBillDocumentWorkbenchBridge } from '../features/dashboard/module-settings/dashboard-bill-document-workbench-bridge';
import { useBillDocumentLayout } from '../features/dashboard/module-settings/use-bill-document-layout';
import { useBillFieldResize } from '../features/dashboard/module-settings/use-bill-field-resize';
import { useBillHeaderWorkbench } from '../features/dashboard/module-settings/use-bill-header-workbench';
import { ConfigWizardModalShell } from '../features/dashboard/module-settings/config-wizard-modal-shell';
import { buildDashboardConfigWizardStepNodes } from '../features/dashboard/module-settings/dashboard-config-wizard-step-nodes';
import { SimpleProcessDesignHostPanel } from '../features/dashboard/module-settings/simple-process-design-host-panel';
import {
  DETAIL_BOARD_FIELD_DEFAULT_HEIGHT,
  DETAIL_BOARD_FIELD_DEFAULT_WIDTH,
  DETAIL_BOARD_FIELD_MAX_WIDTH,
  DETAIL_BOARD_FIELD_MIN_WIDTH,
  DETAIL_BOARD_TALL_FIELD_DEFAULT_HEIGHT,
  DETAIL_BOARD_TALL_FIELD_MAX_HEIGHT,
  DETAIL_BOARD_TALL_FIELD_MIN_HEIGHT,
  useLayoutFieldWorkbenchMeta,
} from '../features/dashboard/module-settings/layout-field-workbench-meta';
import { buildModuleSettingStepShellProps } from '../features/dashboard/module-settings/module-setting-step-shell-props';
import { useModuleIntroEditor } from '../features/dashboard/module-settings/use-module-intro-editor';
import { useEnsureSingleTableModule } from '../features/dashboard/module-settings/use-ensure-single-table-module';
import { useSingleTableModuleSettingsSave } from '../features/dashboard/module-settings/use-single-table-module-settings-save';
import {
  type LongTextEditorState,
} from '../features/dashboard/module-settings/long-text-editor-modal';
import { InspectorPanelRouter } from '../features/dashboard/module-settings/inspector-panel-router';
import {
  type RestrictionConfigTabId,
  type RestrictionMeasureItem,
  type RestrictionNumberRuleItem,
  type RestrictionProcessDesignItem,
  type RestrictionTopStructureItem,
} from '../features/dashboard/module-settings/restriction-workbench';
import { createLinearProcessDesignerDocument } from '../features/dashboard/module-settings/process-designer-types';
import { useDashboardTableBuilderRuntime } from '../features/dashboard/table-builder/use-dashboard-table-builder-runtime';
import { cn } from '../lib/utils';
import {
  buildDesignWorkspacePath,
  navigateToDesignPath,
  resolveDesignMenuSelection,
  resolveDesignModuleSelection,
  updateCurrentDesignSearch,
} from '../platforms/design/navigation/design-navigation';
import { Badge } from './ui/badge';
import {
  listProcessDesignerSchemes,
  saveProcessDesignerScheme,
  type ProcessDesignerSchemeDto,
} from '../lib/backend-process-designer';

interface DashboardProps {
  currentUserName: string;
  onLogout: () => void;
  routeContext?: DesignRouteContext;
}

const DEFAULT_DESIGN_ROUTE_CONTEXT: DesignRouteContext = {};

type BusinessType = 'document' | 'table' | 'tree';
type BillSourceEntry = {
  id: string;
  configType: string;
  sourceName: string;
  sourceSql: string;
  sourceDetail: string;
  sourceType: string;
};
type BillCanvasFieldScope = 'main' | 'meta';
type BillHeaderWorkbenchConfig = {
  rows: number;
};
type ModuleMenuFieldKind = 'text' | 'textarea' | 'number' | 'select' | 'switch';
type ModuleMenuValue = string | boolean;
type ModuleMenuDraft = Record<string, ModuleMenuValue>;
type ModuleMenuOption = {
  value: string;
  label: string;
};
type ModuleMenuFieldSchema = {
  key: string;
  label: string;
  tableField: string;
  kind: ModuleMenuFieldKind;
  placeholder?: string;
  hint?: string;
  options?: ModuleMenuOption[];
  rows?: number;
  span?: 'half' | 'full';
};
type ModuleMenuSectionSchema = {
  title: string;
  description: string;
  fields: ModuleMenuFieldSchema[];
};
type MenuModuleTypeProfile = {
  badgeClass: string;
  businessType: BusinessType;
  icon: string;
  label: string;
};
class DesignerWorkbenchPointerSensor extends PointerSensor {
  static activators = [
    {
      eventName: 'onPointerDown' as const,
      handler: ({ nativeEvent }: React.PointerEvent<Element>) => {
        if (!nativeEvent.isPrimary || nativeEvent.button !== 0) {
          return false;
        }

        const target = nativeEvent.target;
        return !(target instanceof HTMLElement && target.closest('[data-drag-resize-handle="true"]'));
      },
    },
  ];
}

type DesignerWorkbenchDropLaneProps = {
  children: React.ReactNode;
  className: string;
  dropId: string;
  data: Record<string, unknown>;
  key?: React.Key;
};

function DesignerWorkbenchDropLane({
  children,
  className,
  data,
  dropId,
}: DesignerWorkbenchDropLaneProps): React.JSX.Element {
  const { setNodeRef } = useDroppable({
    id: dropId,
    data,
  });

  return (
    <div ref={setNodeRef} className={className}>
      {children}
    </div>
  );
}

type DesignerWorkbenchDraggableItemProps = {
  children: React.ReactNode;
  className: string;
  data: Record<string, unknown>;
  dragId: string;
  dropId: string;
  itemAttributes?: Record<string, string>;
  key?: React.Key;
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onContextMenu?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLDivElement>) => void;
  role?: string;
  style?: React.CSSProperties;
  tabIndex?: number;
};

function DesignerWorkbenchDraggableItem({
  children,
  className,
  data,
  dragId,
  dropId,
  itemAttributes,
  onClick,
  onContextMenu,
  onKeyDown,
  role = 'button',
  style,
  tabIndex = 0,
}: DesignerWorkbenchDraggableItemProps): React.JSX.Element {
  const { attributes, listeners, setNodeRef: setDragNodeRef, transform } = useDraggable({
    id: dragId,
    data,
  });
  const { setNodeRef: setDropNodeRef } = useDroppable({
    id: dropId,
    data,
  });
  const setNodeRef = (node: HTMLDivElement | null) => {
    setDragNodeRef(node);
    setDropNodeRef(node);
  };
  const dragStyle = transform
    ? { ...(style ?? {}), transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : style;

  return (
    <div
      ref={setNodeRef}
      role={role}
      tabIndex={tabIndex}
      className={className}
      style={dragStyle}
      onClick={onClick}
      onContextMenu={onContextMenu}
      onKeyDown={onKeyDown}
      {...itemAttributes}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
}

function configureNativeDragPreview(event: React.DragEvent<HTMLElement>) {
  if (!event.dataTransfer) {
    return;
  }

  const rect = event.currentTarget.getBoundingClientRect();
  const offsetX = Math.max(0, Math.min(rect.width, event.clientX - rect.left));
  const offsetY = Math.max(0, Math.min(rect.height, event.clientY - rect.top));
  event.dataTransfer.setDragImage(event.currentTarget, offsetX, offsetY);
}

function getDashboardErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return '菜单加载失败，请稍后重试。';
}

function normalizeMenuTitle(value?: string) {
  return value?.trim() || '';
}

function normalizeMenuCode(value?: string) {
  return value?.trim() || '';
}

function getEnabledMenuNodes<T extends { enabled: boolean }>(nodes?: readonly T[] | null): T[] {
  return (nodes ?? []).filter((node): node is T => node.enabled !== false);
}

function isUseflagEnabled(useflag: number | string | undefined, enabled: boolean) {
  if (useflag === 1 || useflag === '1') {
    return true;
  }

  if (useflag === 0 || useflag === '0') {
    return false;
  }

  return enabled;
}

function normalizeModuleType(value?: string) {
  return value?.trim().toLowerCase() || '';
}

function getRecordFieldValue(record: Record<string, unknown> | null | undefined, ...keys: string[]) {
  if (!record) {
    return undefined;
  }

  const directLookup = record as Record<string, unknown>;
  const normalizedEntries = Object.entries(directLookup).map(([key, value]) => [key.toLowerCase(), value] as const);
  const normalizedLookup = new Map(normalizedEntries);

  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(directLookup, key)) {
      return directLookup[key];
    }

    const matchedValue = normalizedLookup.get(key.toLowerCase());
    if (matchedValue !== undefined) {
      return matchedValue;
    }
  }

  return undefined;
}

function toRecordText(value: unknown) {
  return value == null ? '' : String(value).trim();
}

function stripBraces(value: string) {
  return value.replace(/[{}]/g, '').trim();
}

function toRecordNumber(value: unknown, fallback: number) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed) {
      const parsed = Number(trimmed);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return fallback;
}

function toRecordBoolean(value: unknown, fallback: boolean) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  if (typeof value === 'string') {
    const normalizedValue = value.trim().toLowerCase();
    if (!normalizedValue) {
      return fallback;
    }

    if (['1', 'true', 'yes', 'y', 'on'].includes(normalizedValue)) {
      return true;
    }

    if (['0', 'false', 'no', 'n', 'off'].includes(normalizedValue)) {
      return false;
    }
  }

  return fallback;
}

function normalizeFieldSqlTagId(value: unknown, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.round(value);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed) {
      const parsed = Number(trimmed);
      if (Number.isFinite(parsed)) {
        return Math.round(parsed);
      }
    }
  }

  return fallback;
}

function getFieldSqlTagOptionLabel(option: FieldSqlTagOptionDto | null | undefined) {
  const optionId = normalizeFieldSqlTagId(option?.showid, -1);
  const rawLabel = toRecordText(option?.showname);

  return rawLabel || FIELD_SQL_TAG_LABEL_FALLBACKS[optionId] || `类型 ${optionId}`;
}

function mapFieldSqlTagToFieldType(fieldSqlTagValue: unknown, fieldSqlTagLabel = '', fallbackType = '文本') {
  const fieldSqlTagId = normalizeFieldSqlTagId(fieldSqlTagValue, -1);
  const normalizedLabel = fieldSqlTagLabel.replace(/\s+/g, '').toLowerCase();

  if (
    fieldSqlTagId === FIELD_SQL_TAG_TREE_RELATION_ID
    || normalizedLabel.includes('树型结点关联')
    || normalizedLabel.includes('树形节点关联')
  ) {
    return '树形节点关联';
  }

  if (FIELD_SQL_TAG_DATE_IDS.has(fieldSqlTagId) || /(日期|时间|date|time)/i.test(fieldSqlTagLabel)) {
    return '日期框';
  }

  if (FIELD_SQL_TAG_RADIO_IDS.has(fieldSqlTagId) || /单选/.test(fieldSqlTagLabel)) {
    return '单选框';
  }

  if (FIELD_SQL_TAG_MULTI_IDS.has(fieldSqlTagId) || /(多选|复选)/.test(fieldSqlTagLabel)) {
    return '多选框';
  }

  if (FIELD_SQL_TAG_SEARCH_IDS.has(fieldSqlTagId) || /(搜索|lookup)/i.test(fieldSqlTagLabel)) {
    return '搜索框';
  }

  if (FIELD_SQL_TAG_SELECT_IDS.has(fieldSqlTagId) || /下拉/.test(fieldSqlTagLabel)) {
    return '下拉框';
  }

  if (FIELD_SQL_TAG_NUMBER_IDS.has(fieldSqlTagId) || /(数值|金额|进度|price|amount|qty|number)/i.test(fieldSqlTagLabel)) {
    return '数字';
  }

  return FIELD_TYPE_OPTIONS.includes(fallbackType) ? fallbackType : '文本';
}

function resolveColumnFieldType(column: Record<string, unknown> | null | undefined) {
  const rawType = toRecordText(getRecordFieldValue(column, 'type'));
  const fieldSqlTagLabel = toRecordText(getRecordFieldValue(column, 'fieldsqltagname', 'fieldSqlTagName'));
  const fieldSqlTagValue = getRecordFieldValue(column, 'fieldsqltag', 'fieldSqlTag');

  return mapFieldSqlTagToFieldType(fieldSqlTagValue, fieldSqlTagLabel, rawType);
}

function resolveColumnFieldSqlTagId(column: Record<string, unknown> | null | undefined) {
  const rawFieldSqlTag = getRecordFieldValue(column, 'fieldsqltag', 'fieldSqlTag', 'controltype', 'controlType');
  if (rawFieldSqlTag !== undefined && rawFieldSqlTag !== null && String(rawFieldSqlTag).trim() !== '') {
    return normalizeFieldSqlTagId(rawFieldSqlTag, 0);
  }

  const fallbackType = toRecordText(getRecordFieldValue(column, 'type'));
  return FIELD_TYPE_DEFAULT_SQL_TAG_IDS[fallbackType] ?? 0;
}

function isTreeRelationFieldColumn(column: Record<string, unknown> | null | undefined) {
  if (!column) {
    return false;
  }

  return mapFieldSqlTagToFieldType(
    getRecordFieldValue(column, 'fieldsqltag', 'fieldSqlTag'),
    toRecordText(getRecordFieldValue(column, 'fieldsqltagname', 'fieldSqlTagName')),
    toRecordText(getRecordFieldValue(column, 'type')),
  ) === '树形节点关联';
}

function buildSingleTableFieldColumn(index: number, overrides: Record<string, unknown> = {}) {
  return {
    ...getBillFieldLayout(index, BILL_FORM_DEFAULT_WIDTH),
    required: false,
    visible: true,
    searchable: false,
    readonly: false,
    align: '左对齐',
    placeholder: '',
    defaultValue: '',
    dictCode: '',
    formula: '',
    relationSql: '',
    dynamicSql: '',
    helpText: '',
    ...overrides,
  };
}

function resolveSingleTableFieldType(field: Record<string, unknown>) {
  const directType = toRecordText(
    getRecordFieldValue(field, 'type', 'fieldType', 'fieldtypename', 'fieldTypeName', 'controltypename', 'controlTypeName'),
  );

  if (FIELD_TYPE_OPTIONS.includes(directType)) {
    return directType;
  }

  const fieldSqlTagLabel = toRecordText(getRecordFieldValue(field, 'fieldsqltagname', 'fieldSqlTagName', 'showname', 'showName'));
  const fieldSqlTagValue = getRecordFieldValue(field, 'fieldsqltag', 'fieldSqlTag', 'controltype', 'controlType');
  const mappedByFieldSqlTag = mapFieldSqlTagToFieldType(fieldSqlTagValue, fieldSqlTagLabel, directType || '文本');
  if (FIELD_TYPE_OPTIONS.includes(mappedByFieldSqlTag)) {
    return mappedByFieldSqlTag;
  }

  if (/(日期|时间|date|time)/i.test(directType)) {
    return '日期框';
  }

  if (/下拉|select/i.test(directType)) {
    return '下拉框';
  }

  if (/搜索|lookup|search/i.test(directType)) {
    return '搜索框';
  }

  if (/radio/i.test(directType)) {
    return '单选框';
  }

  if (/checkbox|multi/i.test(directType)) {
    return '多选框';
  }

  const fieldName = toRecordText(getRecordFieldValue(field, 'username1', 'displayName', 'fieldname', 'fieldName'));
  const systemName = toRecordText(getRecordFieldValue(field, 'sysname', 'systemName'));
  const nameForGuess = `${fieldName} ${systemName}`;

  if (/(日期|时间|date|time)/i.test(nameForGuess)) {
    return '日期框';
  }

  if (/(数量|金额|单价|price|amount|qty|count|number)/i.test(nameForGuess)) {
    return '数字';
  }

  return '文本';
}

function mapSingleTableFieldRecordToColumn(field: SingleTableModuleFieldDto, index: number) {
  const backendId = getRecordFieldValue(field, 'id');
  const displayName = toRecordText(getRecordFieldValue(field, 'username1', 'displayName'));
  const fieldName = toRecordText(getRecordFieldValue(field, 'fieldname', 'fieldName'));
  const systemName = toRecordText(getRecordFieldValue(field, 'sysname', 'systemName'));
  const fieldKey = toRecordText(getRecordFieldValue(field, 'fieldkey', 'fieldKey'));
  const placeholder = toRecordText(getRecordFieldValue(field, 'InputHintText', 'inputhinttext', 'placeholder', 'prompttext', 'promptText'));
  const relationSql = toRecordText(getRecordFieldValue(field, 'relationsql', 'relationSql'));
  const dynamicSql = toRecordText(getRecordFieldValue(field, 'fieldsql', 'fieldSql', 'dynamicsql', 'dynamicSql'));
  const helpText = toRecordText(getRecordFieldValue(field, 'bak', 'helptext', 'helpText', 'remark', 'memo'));
  const defaultValue = toRecordText(getRecordFieldValue(field, 'defaultdate', 'defaultDate', 'defaultvalue', 'defaultValue'));
  const fieldSqlTag = normalizeFieldSqlTagId(getRecordFieldValue(field, 'fieldsqltag', 'fieldSqlTag'), 0);
  const fieldSqlTagName = toRecordText(getRecordFieldValue(field, 'fieldsqltagname', 'fieldSqlTagName', 'showname', 'showName'));
  const alignValue = toRecordText(getRecordFieldValue(field, 'dataAlign', 'dataalign', 'align'));
  const hiddenValue = getRecordFieldValue(field, 'vislble', 'vislble');
  const visibleAliasValue = getRecordFieldValue(field, 'visible', 'isVisible', 'showmobile', 'showMobile');
  const requiredValue = getRecordFieldValue(field, 'tagid', 'required', 'isneed', 'isNeed', 'mustinput', 'mustInput');
  const readonlyValue = getRecordFieldValue(field, 'edit', 'readonly', 'readOnly', 'isreadonly', 'isReadOnly');
  const searchableValue = getRecordFieldValue(field, 'ifSearch', 'ifsearch', 'searchable', 'isquery', 'isQuery', 'queryable');

  return buildSingleTableFieldColumn(index, {
    ...field,
    id: backendId == null ? `field_${Date.now()}_${index + 1}` : `field_${backendId}`,
    backendId,
    orderId: toRecordNumber(getRecordFieldValue(field, 'orderid', 'orderId'), index + 1),
    backendFieldKey: fieldKey,
    formKey: toRecordText(getRecordFieldValue(field, 'formkey', 'formKey')),
    tab: toRecordText(getRecordFieldValue(field, 'tab')),
    fieldSqlTag,
    fieldSqlTagName,
    name: displayName || fieldName || systemName || fieldKey || `字段 ${index + 1}`,
    sourceField: systemName || fieldName || fieldKey || `field_${index + 1}`,
    type: resolveSingleTableFieldType(field),
    width: toRecordNumber(
      getRecordFieldValue(field, 'width', 'controlwidth', 'controlWidth', 'mobilewidth', 'mobileWidth'),
      BILL_FORM_DEFAULT_WIDTH,
    ),
    required: toRecordBoolean(requiredValue, false),
    visible: hiddenValue == null ? toRecordBoolean(visibleAliasValue, true) : !toRecordBoolean(hiddenValue, false),
    searchable: toRecordBoolean(searchableValue, false),
    readonly: toRecordBoolean(readonlyValue, false),
    align: alignValue || '左对齐',
    placeholder,
    defaultValue,
    dictCode: toRecordText(getRecordFieldValue(field, 'fieldsqlid', 'fieldSqlId', 'dictcode', 'dictCode')),
    formula: toRecordText(getRecordFieldValue(field, 'calcExpr', 'calcexpr', 'formula')),
    relationSql,
    dynamicSql,
    helpText,
  });
}

function mapSingleTableDetailGridFieldToColumn(field: SingleTableGridFieldDto, index: number) {
  const mappedColumn = mapSingleTableFieldRecordToColumn(field, index) as Record<string, any>;
  const { id: _ignoredId, ...rest } = mappedColumn;

  return {
    ...rest,
    id: `d_col_${Date.now()}_${index + 1}`,
    backendId: getRecordFieldValue(field, 'id'),
    orderId: toRecordNumber(getRecordFieldValue(field, 'orderid', 'orderId'), index + 1),
    name: mappedColumn.name || `明细字段 ${index + 1}`,
    sourceField: mappedColumn.sourceField || toRecordText(getRecordFieldValue(field, 'fieldname', 'fieldName')),
  };
}
const DETAIL_BOARD_CLIPBOARD_PREFIX = '__LS_DETAIL_BOARD_COLUMNS__';
const BUSINESS_TYPE_OPTIONS: Array<{ value: BusinessType; label: string; icon: string }> = [
  { value: 'document', label: '单表', icon: 'table_view' },
  { value: 'table', label: '单据', icon: 'receipt_long' },
  { value: 'tree', label: '树形单表', icon: 'account_tree' },
];
const MODULE_TYPE_OPTIONS = BUSINESS_TYPE_OPTIONS.filter((option) => option.value !== 'tree');
const MENU_MODULE_TYPE_PROFILES: Record<'bill' | 'single-table', MenuModuleTypeProfile> = {
  'single-table': {
    badgeClass:
      'border-sky-100 bg-sky-50 text-sky-600 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-300',
    businessType: 'document',
    icon: 'table_view',
    label: '单表',
  },
  bill: {
    badgeClass:
      'border-indigo-100 bg-indigo-50 text-indigo-600 dark:border-indigo-900/50 dark:bg-indigo-950/30 dark:text-indigo-300',
    businessType: 'table',
    icon: 'receipt_long',
    label: '单据',
  },
};

function getMenuModuleTypeProfile(moduleType?: string): MenuModuleTypeProfile | null {
  const normalizedType = normalizeModuleType(moduleType);

  if (normalizedType === 'single-table' || normalizedType === 'bill') {
    return MENU_MODULE_TYPE_PROFILES[normalizedType];
  }

  return null;
}
const MODULE_GUIDE_PROFILES: Record<BusinessType, {
  label: string;
  intro: string;
  configTable: string;
  configTableDesc: string;
  keyFields: string[];
  relatedTables: string[];
}> = {
  document: {
    label: '单表',
    intro: '菜单信息统一写入 P_FormMenuConfigTab，确认类型后，后续模块主配置会落到 p_systemdlltab，并继续向字段、条件、右键、颜色等子表扩展。',
    configTable: 'p_systemdlltab',
    configTableDesc: '单表主模块信息',
    keyFields: ['DllCoid', 'ToolsName', 'SQL', 'SQLDT1', 'formKey', 'condKey'],
    relatedTables: ['p_systemwordbooktab', 'p_systembillsourcecond', 'p_systempopupmenu', 'p_systemwordbookcolor'],
  },
  table: {
    label: '单据',
    intro: '菜单信息统一写入 P_FormMenuConfigTab，确认类型后，后续模块主配置会落到 p_systembilltype，再挂单据主信息、明细、来源和流程。',
    configTable: 'p_systembilltype',
    configTableDesc: '单据模块主信息',
    keyFields: ['模块编码', '模块名称', '模块主表', '模块明细表', '明细表sql', '模块配置关联字段'],
    relatedTables: ['p_systembillinfo', 'p_systembilldetail', 'p_systembillsource', 'p_systempopupmenu'],
  },
  tree: {
    label: '树形单表',
    intro: '菜单信息统一写入 P_FormMenuConfigTab，树形单表仍归属单表体系，后续主配置表与单表一致，并通过树字段和动态 SQL 扩展左侧树结构。',
    configTable: 'p_systemdlltab',
    configTableDesc: '单表主模块信息',
    keyFields: ['DllCoid', 'ToolsName', 'SQL', 'TreeSQL', 'TreeTableExpand', 'MainModuleCodeField'],
    relatedTables: ['p_systemwordbooktab', 'p_systemwordbookgrid', 'p_systembillsourcecond', 'p_systempopupmenu'],
  },
};
const MENU_CONFIG_TABLE_NAME = 'P_FormMenuConfigTab';
const MENU_CONFIG_TABLE_DESC = '功能树菜单信息';
const MENU_CONFIG_TABLE_FIELDS = ['MenuId', 'SubsysId', 'MenuStruct', 'Menucaption', 'ParentMenuId', 'PurviewId', 'UrlParams', 'DllFileName', 'GroupCaption', 'MenuRow', 'UseFlag', 'ModType', 'MenuTips'];
const SINGLE_TABLE_DEFAULT_DLL_FILE_NAME = 'Lskj.PubModuleDetail.dll';
const MENU_CONFIG_DEFAULTS: ModuleMenuDraft = {
  menuId: '',
  subsystemId: '',
  parentMenuId: '',
  menuStruct: '',
  menuCaption: '',
  moduleCode: '',
  useFlag: 'true',
  modType: '1',
  dllFileName: '',
  urlParams: '',
  groupCaption: '',
  menuRow: '',
  menuTips: '',
};
function getDefaultMenuDllFileName(businessType: BusinessType) {
  return businessType === 'document' ? SINGLE_TABLE_DEFAULT_DLL_FILE_NAME : '';
}

function buildMenuConfigDraftDefaults(
  businessType: BusinessType,
  overrides: Partial<ModuleMenuDraft> = {},
): ModuleMenuDraft {
  return {
    ...MENU_CONFIG_DEFAULTS,
    modType: businessType === 'table' ? '2' : '1',
    dllFileName: getDefaultMenuDllFileName(businessType),
    ...overrides,
  };
}

const MENU_CONFIG_SECTIONS: ModuleMenuSectionSchema[] = [
  {
    title: '结构列表基础',
    description: '对应文档中功能树结构列表的主键、层级关系和模块关联字段。',
    fields: [
      { key: 'menuCaption', label: '菜单名称', tableField: 'Menucaption', kind: 'text', placeholder: '功能树显示名称' },
      { key: 'moduleCode', label: '功能模块编码', tableField: 'PurviewId', kind: 'text', placeholder: '对应功能模块编号' },
      { key: 'useFlag', label: '启用状态', tableField: 'Useflag', kind: 'switch', hint: '开启后功能树中显示为启用状态' },
    ],
  },
  {
    title: '结构列表扩展',
    description: '对应文档里结构列表的调用参数、分组展示和功能描述字段。',
    fields: [
      { key: 'dllFileName', label: 'DLL 文件名', tableField: 'Dllfilename', kind: 'text', placeholder: '如：LsBill.dll' },
      { key: 'groupCaption', label: '菜单分组标题', tableField: 'GroupCaption', kind: 'text', placeholder: '用于功能树分组显示' },
      { key: 'menuRow', label: '菜单行顺序', tableField: 'Menurow', kind: 'number', placeholder: '分组内显示顺序' },
      { key: 'urlParams', label: '附加参数', tableField: 'Urlparams', kind: 'textarea', rows: 4, span: 'full', placeholder: 'key=value&key2=value2' },
      { key: 'menuTips', label: '功能描述', tableField: 'Menutips', kind: 'textarea', rows: 4, span: 'full', placeholder: '展示在功能树或配置页的功能说明' },
    ],
  },
];

const MENU_DEFAULT_COMMON_FIELD_KEYS: Record<BusinessType, string[]> = {
  document: ['menuCaption', 'moduleCode', 'useFlag', 'dllFileName', 'menuTips'],
  table: ['menuCaption', 'moduleCode', 'useFlag', 'dllFileName', 'menuTips'],
  tree: ['menuCaption', 'moduleCode', 'useFlag', 'dllFileName', 'menuTips'],
};

function filterMenuSectionsByKeys(sections: ModuleMenuSectionSchema[], keys: string[]) {
  const keySet = new Set(keys);
  return sections
    .map((section) => ({
      ...section,
      fields: section.fields.filter((field) => keySet.has(field.key)),
    }))
    .filter((section) => section.fields.length > 0);
}

function toDraftText(value: unknown) {
  return value === null || value === undefined ? '' : String(value);
}

function toDraftSwitch(value: unknown) {
  if (value === true || value === 1 || value === '1') {
    return 'true';
  }

  if (typeof value === 'string' && ['true', 'yes', 'y'].includes(value.trim().toLowerCase())) {
    return 'true';
  }

  return 'false';
}

function toPersistedSwitch(value: ModuleMenuValue | undefined) {
  return value === true || value === 'true' ? 1 : 0;
}

function toOptionalNumber(value: ModuleMenuValue | undefined) {
  const text = toDraftText(value).trim();
  if (!text) {
    return undefined;
  }

  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : text;
}

function getMenuConfigField(menu: SubsystemMenuConfigDto, ...keys: string[]) {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(menu, key)) {
      return menu[key];
    }
  }

  const normalizedEntries = Object.entries(menu).map(([entryKey, entryValue]) => [entryKey.toLowerCase(), entryValue] as const);
  for (const key of keys) {
    const matched = normalizedEntries.find(([entryKey]) => entryKey === key.toLowerCase());
    if (matched) {
      return matched[1];
    }
  }

  return undefined;
}

function mapSubsystemMenuConfigToDraft(menu: SubsystemMenuConfigDto): ModuleMenuDraft {
  return {
    ...MENU_CONFIG_DEFAULTS,
    dllFileName: toDraftText(getMenuConfigField(menu, 'dllfilename', 'dllFileName', 'DllFileName')),
    groupCaption: toDraftText(getMenuConfigField(menu, 'groupcaption', 'groupCaption', 'GroupCaption')),
    menuCaption: toDraftText(getMenuConfigField(menu, 'menucaption', 'menuCaption', 'Menucaption', 'MenuCaption')),
    menuId: toDraftText(getMenuConfigField(menu, 'menuid', 'menuId', 'Menuid', 'MenuId')),
    menuRow: toDraftText(getMenuConfigField(menu, 'menurow', 'menuRow', 'Menurow', 'MenuRow')),
    menuStruct: toDraftText(getMenuConfigField(menu, 'menustruct', 'menuStruct', 'Menustruct', 'MenuStruct')),
    menuTips: toDraftText(getMenuConfigField(menu, 'menutips', 'menuTips', 'Menutips', 'MenuTips')),
    modType: toDraftText(getMenuConfigField(menu, 'modtype', 'modType', 'Modtype', 'ModType')),
    moduleCode: toDraftText(getMenuConfigField(menu, 'purviewid', 'purviewId', 'Purviewid', 'PurviewId')),
    parentMenuId: toDraftText(getMenuConfigField(menu, 'parentmenuid', 'parentMenuId', 'Parentmenuid', 'ParentMenuId')),
    subsystemId: toDraftText(getMenuConfigField(menu, 'subsysid', 'subsystemId', 'subsysId', 'Subsysid', 'SubsystemId', 'SubsysId')),
    urlParams: toDraftText(getMenuConfigField(menu, 'urlparams', 'urlParams', 'Urlparams', 'UrlParams')),
    useFlag: toDraftSwitch(getMenuConfigField(menu, 'useflag', 'useFlag', 'Useflag', 'UseFlag')),
  };
}

function mapMenuConfigDraftToPayload(draft: ModuleMenuDraft) {
  return {
    ...(toOptionalNumber(draft.menuId) !== undefined ? { menuid: toOptionalNumber(draft.menuId) } : {}),
    ...(toOptionalNumber(draft.subsystemId) !== undefined ? { subsysid: toOptionalNumber(draft.subsystemId) } : {}),
    ...(toOptionalNumber(draft.parentMenuId) !== undefined ? { parentmenuid: toOptionalNumber(draft.parentMenuId) } : {}),
    ...(toOptionalNumber(draft.menuRow) !== undefined ? { menurow: toOptionalNumber(draft.menuRow) } : {}),
    ...(toOptionalNumber(draft.modType) !== undefined ? { modtype: toOptionalNumber(draft.modType) } : {}),
    menustruct: toDraftText(draft.menuStruct).trim(),
    menucaption: toDraftText(draft.menuCaption).trim(),
    purviewid: toDraftText(draft.moduleCode).trim(),
    useflag: toPersistedSwitch(draft.useFlag),
    dllfilename: toDraftText(draft.dllFileName),
    groupcaption: toDraftText(draft.groupCaption),
    menutips: toDraftText(draft.menuTips),
    urlparams: toDraftText(draft.urlParams),
  };
}

const FIELD_TYPE_OPTIONS = ['文本', '数字', '下拉框', '搜索框', '日期框', '单选框', '多选框', '树形节点关联'];
const FIELD_SQL_TAG_TREE_RELATION_ID = 3;
const FIELD_SQL_TAG_DATE_IDS = new Set([4, 44, 444, 4444, 44444]);
const FIELD_SQL_TAG_SELECT_IDS = new Set([1, 2, 23, 35, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127]);
const FIELD_SQL_TAG_SEARCH_IDS = new Set([5, 6, 15, 16, 38, 39, 40, 41, 42, 43, 102, 103, 109, 110, 111, 112, 113, 114, 116, 117, 160, 161]);
const FIELD_SQL_TAG_MULTI_IDS = new Set([13, 14, 17, 18, 19, 33, 34, 104, 105, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139]);
const FIELD_SQL_TAG_RADIO_IDS = new Set([106, 107]);
const FIELD_SQL_TAG_NUMBER_IDS = new Set([7, 27, 96, 108, 115]);
const FIELD_TYPE_DEFAULT_SQL_TAG_IDS: Record<string, number> = {
  文本: 0,
  数字: 7,
  下拉框: 1,
  搜索框: 5,
  日期框: 4,
  单选框: 106,
  多选框: 17,
  树形节点关联: FIELD_SQL_TAG_TREE_RELATION_ID,
};
const FIELD_SQL_TAG_LABEL_FALLBACKS: Record<number, string> = {
  0: '字符串',
  1: '下拉框返回ID',
  2: '下拉框返回名称',
  3: '树型结点关联',
  4: '日期类型框',
  5: '搜索框返回ID',
  6: '搜索框返回名称',
  7: '数值',
  15: '搜索框返回ID-带参数',
  16: '搜索框返回名称-带参数',
  17: '复选框',
  18: '下拉多选返回代码',
  19: '下拉多选返回名称',
  23: '下拉框返回名称-带参数',
  35: '下拉框返回ID-带参数',
  38: '智能搜索返回ID',
  39: '智能搜索返回名称',
  40: '智能搜索返回ID-带参数',
  41: '智能搜索返回名称-带参数',
  42: '弹出模块单选返回ID',
  43: '弹出模块多选返回ID',
  44: '日期时间类型框(时分秒)',
  106: '单选按钮返回ID',
  107: '单选按钮返回名称',
  118: '树型下拉返回ID',
  119: '树型下拉返回名称',
};
const DEFAULT_FIELD_SQL_TAG_OPTIONS: FieldSqlTagOptionDto[] = [
  { showid: 0, showname: '字符串' },
  { showid: 7, showname: '数值' },
  { showid: 1, showname: '下拉框返回ID' },
  { showid: 5, showname: '搜索框返回ID' },
  { showid: 4, showname: '日期类型框' },
  { showid: 106, showname: '单选按钮返回ID' },
  { showid: 17, showname: '复选框' },
  { showid: FIELD_SQL_TAG_TREE_RELATION_ID, showname: '树型结点关联' },
];
const COLUMN_ALIGN_OPTIONS = ['左对齐', '居中', '右对齐'];
const TABLE_TYPE_OPTIONS = ['普通表格', '多表头', '树表格'];
const GRID_COLOR_RULE_OPERATOR_OPTIONS = ['等于', '包含', '大于', '小于', '大于等于', '小于等于'];
const BILL_SOURCE_CONFIG_TYPE_OPTIONS = ['普通来源', '弹窗来源', '明细来源'];
const BILL_SOURCE_TYPE_OPTIONS = ['SQL', '视图', '接口'];
const MODULE_SETTING_STEP = 5;
const RESTRICTION_STEP = 6;
const PROCESS_DESIGN_STEP = 7;
const MODULE_PREVIEW_STEP = 8;
const MAX_CONFIG_STEP = MODULE_PREVIEW_STEP;
const TABLE_COLUMN_MIN_WIDTH = 48;
const TABLE_COLUMN_COLLAPSED_RENDER_WIDTH = 1;
const TABLE_COLUMN_RESIZE_MIN_WIDTH = 0;
const TABLE_COLUMN_AUTO_FIT_MAX_WIDTH = 680;
const TABLE_COLUMN_RESIZE_MAX_WIDTH = 2000;
const CONDITION_PANEL_CONTROL_WIDTH = 175;
const CONDITION_PANEL_RESIZE_MIN_WIDTH = 116;
const CONDITION_PANEL_RESIZE_MAX_WIDTH = 620;
const CONDITION_PANEL_ROW_HEIGHT = 46;
const CONDITION_PANEL_ROW_GAP = 8;
const CONDITION_PANEL_MIN_ROWS = 1;
const CONDITION_PANEL_MAX_ROWS = 6;
const BILL_HEADER_WORKBENCH_MIN_ROWS = 1;
const BILL_HEADER_WORKBENCH_MAX_ROWS = 6;
const BILL_FORM_DEFAULT_WIDTH = 236;
const BILL_FORM_MIN_WIDTH = 168;
const BILL_FORM_MAX_WIDTH = 560;
const BILL_FORM_DEFAULT_LABEL_WIDTH = 72;
const BILL_FORM_DEFAULT_FONT_SIZE = 12;
const BILL_FORM_LAYOUT_PADDING_X = 28;
const BILL_FORM_LAYOUT_PADDING_Y = 28;
const BILL_FORM_LAYOUT_GAP_X = 24;
const BILL_FORM_LAYOUT_GAP_Y = 18;
const BILL_FORM_LAYOUT_COLUMNS = 3;
const BILL_FORM_ROW_HEIGHT = 56;
const WIDTH_RESIZE_SNAP_THRESHOLD = 10;
const WIDTH_RESIZE_GRID_STEP = 4;

const DETAIL_FILL_TYPE_OPTIONS = [
  { value: '表格', label: '表格', icon: 'table_rows', description: '适合字段型明细维护', backendValue: '0' },
  { value: '树表格', label: '树表格', icon: 'account_tree', description: '适合层级型明细展示' },
  { value: '图表', label: '图表', icon: 'bar_chart', description: '适合统计型结果呈现', backendValue: '1' },
  { value: '网页', label: '网页', icon: 'language', description: '适合外部页面嵌入', backendValue: '2' },
];
const DETAIL_CHART_TYPE_OPTIONS = [
  { value: '0', label: '柱形图' },
  { value: '1', label: '折线图' },
  { value: '2', label: '圆饼图' },
  { value: '3', label: '条形图' },
  { value: '4', label: '面积图' },
];
function getBillFieldLayout(index: number, width = BILL_FORM_DEFAULT_WIDTH) {
  const columnIndex = index % BILL_FORM_LAYOUT_COLUMNS;
  const rowIndex = Math.floor(index / BILL_FORM_LAYOUT_COLUMNS);
  return {
    canvasX: BILL_FORM_LAYOUT_PADDING_X + columnIndex * (width + BILL_FORM_LAYOUT_GAP_X),
    canvasY: BILL_FORM_LAYOUT_PADDING_Y + rowIndex * (BILL_FORM_ROW_HEIGHT + BILL_FORM_LAYOUT_GAP_Y),
    labelWidth: BILL_FORM_DEFAULT_LABEL_WIDTH,
    fontSize: BILL_FORM_DEFAULT_FONT_SIZE,
    sourceTable: 'bill-source',
    sourceField: '',
  };
}

function buildResizeSnapCandidates(
  widths: number[],
  {
    minWidth,
    maxWidth,
    baseWidth,
  }: {
    minWidth: number;
    maxWidth: number;
    baseWidth: number;
  },
) {
  const candidates = new Set<number>([minWidth, maxWidth, baseWidth]);
  widths
    .map((width) => Math.round(width))
    .filter((width) => Number.isFinite(width) && width >= minWidth && width <= maxWidth)
    .forEach((width) => candidates.add(width));

  return Array.from(candidates).sort((left, right) => left - right);
}

function resolveResizeWidthWithSnap(
  rawWidth: number,
  {
    minWidth,
    maxWidth,
    snapCandidates,
    snapThreshold = WIDTH_RESIZE_SNAP_THRESHOLD,
  }: {
    minWidth: number;
    maxWidth: number;
    snapCandidates: number[];
    snapThreshold?: number;
  },
) {
  const clampedWidth = Math.max(minWidth, Math.min(maxWidth, rawWidth));
  const gridWidth = Math.max(minWidth, Math.min(maxWidth, Math.round(clampedWidth / WIDTH_RESIZE_GRID_STEP) * WIDTH_RESIZE_GRID_STEP));
  const snappedCandidate = snapCandidates.reduce<number | null>((closest, candidate) => {
    if (Math.abs(candidate - clampedWidth) > snapThreshold) return closest;
    if (closest === null) return candidate;
    return Math.abs(candidate - clampedWidth) < Math.abs(closest - clampedWidth) ? candidate : closest;
  }, null);
  const width = Math.round(snappedCandidate ?? gridWidth);

  return {
    width,
    snappedTo: snappedCandidate,
  };
}

function getResizeRulerTicks(
  width: number,
  {
    minWidth,
    maxWidth,
    snapCandidates,
  }: {
    minWidth: number;
    maxWidth: number;
    snapCandidates: number[];
  },
) {
  const normalized = Array.from(new Set([minWidth, maxWidth, ...snapCandidates]))
    .filter((candidate) => candidate >= minWidth && candidate <= maxWidth)
    .sort((left, right) => left - right);

  if (normalized.length <= 9) return normalized;

  const closestIndex = normalized.reduce((bestIndex, candidate, index) => (
    Math.abs(candidate - width) < Math.abs(normalized[bestIndex] - width) ? index : bestIndex
  ), 0);
  const startIndex = Math.max(1, closestIndex - 3);
  const endIndex = Math.min(normalized.length - 1, closestIndex + 4);

  return Array.from(new Set([
    normalized[0],
    ...normalized.slice(startIndex, endIndex),
    normalized[normalized.length - 1],
  ])).sort((left, right) => left - right);
}

function ResizeTickRuler({
  width,
  minWidth,
  maxWidth,
  ticks,
}: {
  width: number;
  minWidth: number;
  maxWidth: number;
  ticks: number[];
}) {
  const usableTicks = ticks.length > 0 ? ticks : [minWidth, maxWidth];
  const range = Math.max(1, maxWidth - minWidth);

  return (
    <div className="mt-1.5 w-[182px] rounded-[12px] border border-slate-200/80 bg-white/94 px-2.5 py-1.5 shadow-[0_12px_24px_-24px_rgba(15,23,42,0.28)] dark:border-slate-700 dark:bg-slate-950/88">
      <div className="relative h-4">
        <span className="absolute inset-x-0 top-2 h-px rounded-full bg-slate-200/90 dark:bg-slate-700" />
        {usableTicks.map((tick) => {
          const left = `${((tick - minWidth) / range) * 100}%`;
          const isActive = Math.round(tick) === Math.round(width);
          const isEdge = tick === minWidth || tick === maxWidth;
          return (
            <span
              key={`resize-tick-${tick}`}
              className={`absolute top-[3px] w-px -translate-x-1/2 rounded-full ${
                isActive
                  ? 'h-[10px] bg-[color:var(--workspace-accent)]'
                  : isEdge
                    ? 'h-[8px] bg-slate-500/70 dark:bg-slate-300/70'
                    : 'h-[6px] bg-slate-300 dark:bg-slate-500'
              }`}
              style={{ left }}
            />
          );
        })}
      </div>
      <div className="mt-1 flex items-center justify-between text-[9px] font-semibold text-slate-400 dark:text-slate-500">
        <span>{minWidth}</span>
        <span className="text-[color:var(--workspace-accent)]">{Math.round(width)}</span>
        <span>{maxWidth}</span>
      </div>
    </div>
  );
}

function buildDocumentFilterRuntimeRules(
  fields: any[],
  activeResizeState: ActiveWorkbenchResize | null,
) {
  return joinRuntimeDeclarationBlocks(
    fields.flatMap((field) => {
      const normalizedWidth = Math.min(
        CONDITION_PANEL_RESIZE_MAX_WIDTH,
        Math.max(
          CONDITION_PANEL_RESIZE_MIN_WIDTH,
          Number.isFinite(Number(field?.width)) ? Number(field.width) : CONDITION_PANEL_CONTROL_WIDTH,
        ),
      );
      const normalizedField = {
        ...field,
        name: field?.name ?? '',
        type: field?.type ?? '文本',
        width: normalizedWidth,
      };
      const filterControlWidth = resolveWorkbenchPreviewWidth(
        normalizedField.width,
        168,
        148,
        activeResizeState,
        normalizedField.id,
        'filter',
      );
      const labelWidth = Math.max(60, Math.min(132, normalizedField.name.length * 14 + 12));
      const previewWidth = normalizedField.type === '日期框'
        ? 58
        : normalizedField.type === '数字'
          ? 48
          : normalizedField.type === '搜索框'
            ? 64
            : 52;
      const minimumFilterWidth = labelWidth + previewWidth + 18;
      const filterWidth = Math.max(
        minimumFilterWidth,
        Math.min(188, Math.max(minimumFilterWidth, filterControlWidth - 60)),
      );
      const widthClassName = createRuntimeClassName('document-filter-width', normalizedField.id);
      const labelClassName = createRuntimeClassName('document-filter-label', normalizedField.id);
      const previewClassName = createRuntimeClassName('document-filter-preview', normalizedField.id);

      return [
        createRuntimeDeclarationBlock(widthClassName, { width: filterWidth, 'min-width': filterWidth }),
        createRuntimeDeclarationBlock(labelClassName, { width: labelWidth, 'min-width': labelWidth }),
        createRuntimeDeclarationBlock(previewClassName, { width: previewWidth, 'min-width': previewWidth }),
      ];
    }),
  );
}

function clampValue(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

const buildColumn = (prefix: string, index: number, overrides: Record<string, any> = {}) => ({
  id: `${prefix}_${Date.now()}_${index}`,
  name: `字段 ${index}`,
  type: '文本',
  fieldSqlTag: FIELD_TYPE_DEFAULT_SQL_TAG_IDS['文本'],
  fieldSqlTagName: FIELD_SQL_TAG_LABEL_FALLBACKS[FIELD_TYPE_DEFAULT_SQL_TAG_IDS['文本']],
  width: 104,
  ...getBillFieldLayout(index - 1, BILL_FORM_DEFAULT_WIDTH),
  required: false,
  visible: true,
  searchable: false,
  readonly: false,
  align: '左对齐',
  placeholder: '',
  defaultValue: '',
  dictCode: '',
  formula: '',
  relationSql: '',
  dynamicSql: '',
  helpText: '',
  ...overrides,
});

const normalizeColumn = (col: any) => ({
  ...getBillFieldLayout(0, BILL_FORM_DEFAULT_WIDTH),
  required: false,
  visible: true,
  searchable: false,
  readonly: false,
  align: '左对齐',
  placeholder: '',
  defaultValue: '',
  dictCode: '',
  formula: '',
  relationSql: '',
  dynamicSql: '',
  helpText: '',
  ...col,
  type: resolveColumnFieldType(col),
  fieldSqlTag: resolveColumnFieldSqlTagId(col),
  fieldSqlTagName: toRecordText(getRecordFieldValue(col, 'fieldsqltagname', 'fieldSqlTagName')),
});

const isRenderableMainColumn = (column: any) => {
  const normalizedColumn = normalizeColumn(column);
  return normalizedColumn.visible !== false && Number(normalizedColumn.width) > 0;
};

type BuilderSelectionContextMenuState = {
  kind: 'column' | 'filter';
  scope: 'left' | 'main' | 'detail';
  x: number;
  y: number;
  ids: string[];
} | null;

export default function Dashboard({ currentUserName, onLogout, routeContext = DEFAULT_DESIGN_ROUTE_CONTEXT }: DashboardProps) {
  const debugParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const currentUserAvatarText = currentUserName.trim().slice(0, 1) || '人';
  const debugStepParam = Number(debugParams?.get('step') || 1);
  const initialConfigStep = Number.isFinite(debugStepParam) ? Math.min(MAX_CONFIG_STEP, Math.max(1, debugStepParam)) : 1;
  const initialConfigOpen = debugParams?.get('config') === '1' || debugParams?.has('step') || false;
  const initialDetailPreview = debugParams?.get('detailPreview') === '1';
  const initialRouteModuleCode = normalizeMenuCode(debugParams?.get('module') || '');
  const initialBusinessType = BUSINESS_TYPE_OPTIONS.some((option) => option.value === debugParams?.get('mode'))
    ? (String(debugParams?.get('mode')) as BusinessType)
    : 'document';
  const initialWorkspaceTheme = DETAIL_BOARD_THEME_OPTIONS.some((option) => option.value === debugParams?.get('theme'))
    ? String(debugParams?.get('theme'))
    : 'aurora';
  const [isSubsystemOpen, setIsSubsystemOpen] = useState(true);
  const [expandedSubsystemId, setExpandedSubsystemId] = useState<string | null>(null);
  const [subsystemMenus, setSubsystemMenus] = useState<BackendSubsystemNode[]>([]);
  const [activeSubsystem, setActiveSubsystem] = useState('');
  const [activeFirstLevelMenuId, setActiveFirstLevelMenuId] = useState('');
  const [activeWorkbench, setActiveWorkbench] = useState<'modules' | 'research-record'>('modules');
  const [secondLevelMenus, setSecondLevelMenus] = useState<BackendMenuNode[]>([]);
  const [isLoadingSubsystemMenus, setIsLoadingSubsystemMenus] = useState(true);
  const [isLoadingSecondLevelMenus, setIsLoadingSecondLevelMenus] = useState(false);
  const [menuLoadError, setMenuLoadError] = useState<string | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(initialConfigOpen);
  const [configStep, setConfigStep] = useState(initialConfigStep);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  // Step 1: Common Functions
  const [commonFuncs, setCommonFuncs] = useState<string[]>(['import', 'export']);
  const [isFuncPopoverOpen, setIsFuncPopoverOpen] = useState(false);
  const [businessType, setBusinessType] = useState<BusinessType>(initialBusinessType);
  const [menuInfoTab, setMenuInfoTab] = useState<'common' | 'advanced'>('common');
  const [menuPinnedFields, setMenuPinnedFields] = useState<Record<BusinessType, string[]>>(() => ({
    document: [...MENU_DEFAULT_COMMON_FIELD_KEYS.document],
    table: [...MENU_DEFAULT_COMMON_FIELD_KEYS.table],
    tree: [...MENU_DEFAULT_COMMON_FIELD_KEYS.tree],
  }));
  const [menuConfigDraft, setMenuConfigDraft] = useState<ModuleMenuDraft>(() => buildMenuConfigDraftDefaults(initialBusinessType));
  const [activeConfigMenu, setActiveConfigMenu] = useState<BackendMenuNode | null>(null);
  const [deletingMenuId, setDeletingMenuId] = useState<string | null>(null);
  const [pendingDeleteMenu, setPendingDeleteMenu] = useState<BackendMenuNode | null>(null);
  const [isMenuInfoLoading, setIsMenuInfoLoading] = useState(false);
  const [isMenuInfoSaving, setIsMenuInfoSaving] = useState(false);
  const [isSingleTableFieldsLoading, setIsSingleTableFieldsLoading] = useState(false);
  const [menuInfoError, setMenuInfoError] = useState<string | null>(null);
  const currentModuleGuide = MODULE_GUIDE_PROFILES[businessType] ?? MODULE_GUIDE_PROFILES.document;
  const currentModuleCode = String(menuConfigDraft.moduleCode || activeConfigMenu?.purviewId || '');
  const currentModuleName = String(menuConfigDraft.menuCaption || activeConfigMenu?.title || '');
  const toggleFunc = (id: string) => setCommonFuncs(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const funcOptions = [
    { id: 'import', name: '数据导入', icon: 'upload_file' },
    { id: 'export', name: '数据导出', icon: 'download' },
    { id: 'print', name: '打印模板', icon: 'print' },
    { id: 'approve', name: '审批流', icon: 'verified' },
    { id: 'attach', name: '附件管理', icon: 'attachment' },
  ];
  const currentMenuSections = MENU_CONFIG_SECTIONS;
  const currentMenuDraft = menuConfigDraft;
  const activeConfigModuleKey = normalizeMenuCode(toDraftText(menuConfigDraft.moduleCode || activeConfigMenu?.purviewId));
  const isMenuFieldFilled = (field: ModuleMenuFieldSchema, value: ModuleMenuValue | undefined) => {
    if (field.kind === 'switch') return value === 'true';
    return String(value ?? '').trim().length > 0;
  };
  const filledMenuFieldCount = currentMenuSections.reduce((total, section) => {
    return total + section.fields.filter((field) => {
      const value = currentMenuDraft[field.key];
      return isMenuFieldFilled(field, value);
    }).length;
  }, 0);
  const currentMenuFieldEntries = useMemo(
    () =>
      currentMenuSections.flatMap((section) =>
        section.fields.map((field) => ({
          sectionTitle: section.title,
          sectionDescription: section.description,
          field,
        })),
      ),
    [currentMenuSections],
  );
  const currentMenuFieldMap = useMemo(
    () => new Map(currentMenuFieldEntries.map((entry) => [entry.field.key, entry.field])),
    [currentMenuFieldEntries],
  );
  const currentPinnedMenuKeys = useMemo(() => {
    const defaultKeys = MENU_DEFAULT_COMMON_FIELD_KEYS[businessType] ?? MENU_DEFAULT_COMMON_FIELD_KEYS.document;
    const preferredKeys = menuPinnedFields[businessType] ?? defaultKeys;
    const availableKeys = new Set(currentMenuFieldEntries.map((entry) => entry.field.key));
    return preferredKeys.filter((key, index) => availableKeys.has(key) && preferredKeys.indexOf(key) === index);
  }, [businessType, currentMenuFieldEntries, menuPinnedFields]);
  const currentPinnedMenuKeySet = useMemo(() => new Set(currentPinnedMenuKeys), [currentPinnedMenuKeys]);
  const currentAdvancedMenuKeys = useMemo(() => {
    return currentMenuFieldEntries
      .map((entry) => entry.field.key)
      .filter((key) => !currentPinnedMenuKeySet.has(key));
  }, [currentMenuFieldEntries, currentPinnedMenuKeySet]);
  const currentCommonMenuSections = useMemo(
    () => filterMenuSectionsByKeys(currentMenuSections, currentPinnedMenuKeys),
    [currentMenuSections, currentPinnedMenuKeys],
  );
  const currentAdvancedMenuSections = useMemo(
    () => filterMenuSectionsByKeys(currentMenuSections, currentAdvancedMenuKeys),
    [currentAdvancedMenuKeys, currentMenuSections],
  );
  const commonFilledMenuFieldCount = useMemo(() => {
    return currentPinnedMenuKeys.reduce((total, key) => {
      const field = currentMenuFieldMap.get(key);
      if (!field) return total;
      return total + (isMenuFieldFilled(field, currentMenuDraft[key]) ? 1 : 0);
    }, 0);
  }, [currentMenuDraft, currentMenuFieldMap, currentPinnedMenuKeys]);
  const advancedFilledMenuFieldCount = useMemo(() => {
    return currentAdvancedMenuKeys.reduce((total, key) => {
      const field = currentMenuFieldMap.get(key);
      if (!field) return total;
      return total + (isMenuFieldFilled(field, currentMenuDraft[key]) ? 1 : 0);
    }, 0);
  }, [currentAdvancedMenuKeys, currentMenuDraft, currentMenuFieldMap]);

  // Step 2: Editor
  const moduleSettingsSectionRef = useRef<HTMLDivElement | null>(null);

  // Step 3: Survey
  const [surveyStep, setSurveyStep] = useState(0);
  const [surveyAnswers, setSurveyAnswers] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [surveyPlan, setSurveyPlan] = useState<SurveyPlan | null>(null);
  const [surveyPlanModel, setSurveyPlanModel] = useState('');
  const [surveyError, setSurveyError] = useState<string | null>(null);
  const [isGeneratingSqlDraft, setIsGeneratingSqlDraft] = useState(false);
  const [isTranslatingIdentifiers, setIsTranslatingIdentifiers] = useState(false);

  // Step 4: Table Builder
  const [isFullscreenConfig, setIsFullscreenConfig] = useState(false);
  const [restrictionActiveTab, setRestrictionActiveTab] = useState<RestrictionConfigTabId>('guard');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  const isSingleTableModuleBranch = normalizeModuleType(activeConfigMenu?.moduleType) === 'single-table';
  const isMenuInfoBuilt = Boolean(activeConfigMenu?.menuId && activeConfigModuleKey);
  const {
    isReady: isSingleTableModuleReady,
    isLoading: isSingleTableModuleEnsuring,
  } = useEnsureSingleTableModule({
    currentModuleCode: activeConfigModuleKey,
    currentModuleName,
    isActive: isConfigOpen && configStep >= MODULE_SETTING_STEP && isSingleTableModuleBranch && isMenuInfoBuilt,
    onShowToast: showToast,
  });
  const canLoadSingleTableModuleResources = (
    isConfigOpen
    && configStep === MODULE_SETTING_STEP
    && isSingleTableModuleBranch
    && Boolean(activeConfigModuleKey)
    && isSingleTableModuleReady
  );

  const closeConfigWizard = useCallback(() => {
    setIsConfigOpen(false);
    setIsDocumentConditionWorkbenchOpen(false);
    updateCurrentDesignSearch({
      config: null,
      module: null,
      step: null,
    }, { replace: true });
  }, []);

  const {
    isFullscreenEditor,
    moduleIntroActions,
    moduleIntroBlockType,
    moduleIntroRefs,
    moduleIntroSelectedImageWidth,
  } = useModuleIntroEditor({
    isActive: configStep === 3,
    showToast,
  });

  const markStepCompleted = (stepId: number) => {
    setCompletedSteps((prev) => (prev.includes(stepId) ? prev : [...prev, stepId]));
  };

  const resetSurveyFlow = () => {
    setSurveyStep(0);
    setSurveyAnswers([]);
    setIsGenerating(false);
    setSurveyPlan(null);
    setSurveyPlanModel('');
    setSurveyError(null);
  };

  const generateSurveyPlan = async (mode: string, dataSource: string) => {
    setSurveyStep(2);
    setSurveyAnswers([mode, dataSource]);
    setSurveyPlan(null);
    setSurveyPlanModel('');
    setSurveyError(null);
    setIsGenerating(true);

    try {
      const response = await requestSurveyPlan(mode, dataSource);
      setSurveyPlan(response.plan);
      setSurveyPlanModel(response.model);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'MiniMax 生成失败，请稍后再试。';
      setSurveyError(message);
      showToast(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const buildColumn = (prefix: string, index: number, overrides: Record<string, any> = {}) => ({
    id: `${prefix}_${Date.now()}_${index}`,
    name: `字段 ${index}`,
    type: '文本',
    fieldSqlTag: FIELD_TYPE_DEFAULT_SQL_TAG_IDS['文本'],
    fieldSqlTagName: FIELD_SQL_TAG_LABEL_FALLBACKS[FIELD_TYPE_DEFAULT_SQL_TAG_IDS['文本']],
    width: 104,
    ...getBillFieldLayout(index - 1, BILL_FORM_DEFAULT_WIDTH),
    required: false,
    visible: true,
    searchable: false,
    readonly: false,
    align: '左对齐',
    placeholder: '',
    defaultValue: '',
    dictCode: '',
    formula: '',
    relationSql: '',
    dynamicSql: '',
    helpText: '',
    ...overrides,
  });

  const buildConditionField = (index: number, overrides: Record<string, any> = {}) => ({
    id: `cond_${Date.now()}_${index}`,
    name: `条件 ${index}`,
    type: '文本',
    width: CONDITION_PANEL_CONTROL_WIDTH,
    panelRow: 1,
    required: false,
    visible: true,
    searchable: true,
    readonly: false,
    align: '左对齐',
    placeholder: '',
    defaultValue: '',
    dictCode: '',
    formula: '',
    relationSql: '',
    dynamicSql: '',
    helpText: '',
    ...overrides,
  });
  const buildBillHeaderWorkbenchConfig = (overrides: Partial<BillHeaderWorkbenchConfig> = {}): BillHeaderWorkbenchConfig => ({
    rows: 3,
    ...overrides,
  });

  const buildGridColorRule = (index: number, overrides: Record<string, any> = {}) => ({
    id: `color_${Date.now()}_${index}`,
    label: `颜色规则 ${index}`,
    disabled: false,
    tab: '',
    condition: '',
    forcecolor: '#9f1239',
    backcolor: '#ffe4e6',
    orderid: index,
    useflag: 1,
    dfcolor: '#9f1239',
    dbcolor: '#ffe4e6',
    ifBold: 0,
    ifItalic: 0,
    ifStrickOut: 0,
    ifUnderLine: 0,
    fontsize: 12,
    textColor: '#9f1239',
    backgroundColor: '#ffe4e6',
    ...overrides,
  });
  const mapSingleTableContextMenuItem = (item: SingleTableContextMenuDto, index: number) => normalizeContextMenuItem({
    ...item,
    id: getRecordFieldValue(item, 'id'),
    backendId: getRecordFieldValue(item, 'id'),
    tab: getRecordFieldValue(item, 'tab'),
    menuname: getRecordFieldValue(item, 'menuname', 'menuName'),
    dllname: getRecordFieldValue(item, 'dllname', 'dllName'),
    action: getRecordFieldValue(item, 'action', 'actionSql'),
    actiontype: getRecordFieldValue(item, 'actiontype', 'actionType'),
    orderid: getRecordFieldValue(item, 'orderid', 'orderId'),
    menuid: getRecordFieldValue(item, 'menuid', 'menuId'),
    menuCond: getRecordFieldValue(item, 'menucond', 'menuCondition'),
    beforeMsg: getRecordFieldValue(item, 'beforemsg', 'beforeMessage'),
    menuType: getRecordFieldValue(item, 'menutype', 'menuType'),
  }, index + 1);
  const mapSingleTableColorRule = (rule: SingleTableColorRuleDto, index: number) => {
    const orderId = toRecordNumber(getRecordFieldValue(rule, 'orderid', 'orderId'), index + 1);
    const conditionSql = toRecordText(getRecordFieldValue(rule, 'conditionsql', 'conditionSql', 'condition'));
    const foregroundToken = toRecordText(getRecordFieldValue(rule, 'foregroundtoken', 'foregroundToken', 'dfcolor'));
    const backgroundToken = toRecordText(getRecordFieldValue(rule, 'backgroundtoken', 'backgroundToken', 'dbcolor'));
    const foregroundColor = toRecordText(getRecordFieldValue(rule, 'foregroundcolor', 'foregroundColor', 'forcecolor'));
    const backgroundColor = toRecordText(getRecordFieldValue(rule, 'backgroundcolor', 'backgroundColor', 'backcolor'));
    const useFlag = toRecordBoolean(getRecordFieldValue(rule, 'useflag', 'useFlag'), true);
    const label = conditionSql || `颜色规则 ${orderId}`;

    return buildGridColorRule(orderId, {
      ...rule,
      id: getRecordFieldValue(rule, 'id') ?? `color_${Date.now()}_${orderId}`,
      orderId,
      tab: toRecordText(getRecordFieldValue(rule, 'tab')),
      label,
      condition: conditionSql,
      disabled: !useFlag,
      useflag: useFlag ? 1 : 0,
      forcecolor: foregroundColor || foregroundToken || '#9f1239',
      backcolor: backgroundColor || backgroundToken || '#ffe4e6',
      dfcolor: foregroundToken || foregroundColor || '#9f1239',
      dbcolor: backgroundToken || backgroundColor || '#ffe4e6',
      useFlag,
      foregroundToken,
      backgroundToken,
      foregroundColor,
      textColor: foregroundColor || foregroundToken || '#9f1239',
      backgroundColor: backgroundColor || backgroundToken || '#ffe4e6',
      isBold: toRecordBoolean(getRecordFieldValue(rule, 'ifbold', 'ifBold', 'isbold', 'isBold'), false),
      isItalic: toRecordBoolean(getRecordFieldValue(rule, 'ifitalic', 'ifItalic', 'isitalic', 'isItalic'), false),
      isStrikeOut: toRecordBoolean(getRecordFieldValue(rule, 'ifstrickout', 'ifStrickOut', 'isstrikeout', 'isStrikeOut'), false),
      isUnderline: toRecordBoolean(getRecordFieldValue(rule, 'ifunderline', 'ifUnderLine', 'isunderline', 'isUnderline'), false),
      ifBold: toRecordBoolean(getRecordFieldValue(rule, 'ifbold', 'ifBold', 'isbold', 'isBold'), false) ? 1 : 0,
      ifItalic: toRecordBoolean(getRecordFieldValue(rule, 'ifitalic', 'ifItalic', 'isitalic', 'isItalic'), false) ? 1 : 0,
      ifStrickOut: toRecordBoolean(getRecordFieldValue(rule, 'ifstrickout', 'ifStrickOut', 'isstrikeout', 'isStrikeOut'), false) ? 1 : 0,
      ifUnderLine: toRecordBoolean(getRecordFieldValue(rule, 'ifunderline', 'ifUnderLine', 'isunderline', 'isUnderline'), false) ? 1 : 0,
      fontsize: toRecordNumber(getRecordFieldValue(rule, 'fontsize', 'fontSize'), 12),
    });
  };

  const buildDetailChartConfig = (overrides: Record<string, any> = {}) => ({
    chartType: '0',
    chartTitle: '',
    chartColor: '#2563eb',
    chartColorDf: '#60a5fa',
    chart3D: false,
    gridLineVisible: true,
    XLabelField: '',
    YValueField: '',
    XAxisTitle: '',
    YAxisTitle: '',
    YAxisShared: false,
    markVisible: false,
    legendVisible: false,
    isVisible: false,
    orderId: 0,
    IsAbsolutely: false,
    YScale: '',
    yvaluefield1: '',
    yvaluefield2: '',
    valueVisible: false,
    labelangle: '',
    labelvisible: false,
    labelsize: '',
    labelSpaced: '',
    circlejagge: false,
    circlehollow: false,
    ...overrides,
  });

  const normalizeDetailChartConfig = (config: any) => {
    const baseConfig = buildDetailChartConfig();
    const nextConfig = { ...baseConfig, ...(config ?? {}) };

    return {
      ...nextConfig,
      chartColor: String(nextConfig.chartColor || baseConfig.chartColor),
      chartColorDf: String(nextConfig.chartColorDf || baseConfig.chartColorDf),
      chart3D: Boolean(nextConfig.chart3D),
      gridLineVisible: Boolean(nextConfig.gridLineVisible),
      YAxisShared: Boolean(nextConfig.YAxisShared),
      markVisible: Boolean(nextConfig.markVisible),
      legendVisible: Boolean(nextConfig.legendVisible),
      isVisible: Boolean(nextConfig.isVisible),
      IsAbsolutely: Boolean(nextConfig.IsAbsolutely),
      valueVisible: Boolean(nextConfig.valueVisible),
      labelvisible: Boolean(nextConfig.labelvisible),
      circlejagge: Boolean(nextConfig.circlejagge),
      circlehollow: Boolean(nextConfig.circlehollow),
    };
  };

  const buildGridConfig = (mainSql: string, defaultQuery: string, overrides: Record<string, any> = {}) => ({
    mainSql,
    defaultQuery,
    createTableSql: '',
    tableName: '',
    sqlPrompt: '',
    sourceMode: 'sql',
    sourceModuleCode: '',
    sourceCondition: '',
    tableType: '普通表格',
    contextMenuEnabled: false,
    contextMenuItems: [],
    colorRulesEnabled: false,
    colorRules: [],
    chartConfig: buildDetailChartConfig(),
    detailBoard: buildDetailBoardConfig(),
    webUrl: '',
    ...overrides,
  });
  const buildDefaultLeftTableConfig = () => buildGridConfig('', '', {
    tableType: '树表格',
    contextMenuItems: [],
    colorRules: [],
    detailBoard: buildDetailBoardConfig([], { enabled: false }),
  });
  const buildDefaultMainTableConfig = () => buildGridConfig('', '', {
    contextMenuItems: [],
    colorRules: [],
    detailBoard: buildDetailBoardConfig([], {
      enabled: false,
      theme: 'aurora',
    }),
  });
  const buildDefaultBillDetailConfig = () => buildGridConfig('', '', {
    tableType: '普通表格',
    contextMenuEnabled: false,
    contextMenuItems: [],
    detailBoard: buildDetailBoardConfig([], { enabled: false }),
  });
  const buildEmptyRestrictionSelection = (): Record<RestrictionConfigTabId, string | null> => ({
    guard: null,
    number: null,
    structure: null,
    process: null,
  });

  const buildDetailTabConfig = (overrides: Record<string, any> = {}) => ({
    tab: currentModuleCode,
    tabKey: '',
    detailName: '',
    detailType: '表格',
    detailTypeCode: '0',
    dllTemplate: '',
    relatedModuleField: '',
    relatedValue: '',
    rightDisplay: false,
    addDisplay: false,
    defaultOpen: false,
    scanMode: false,
    cardMode: false,
    bandHeight: '36',
    bandWidth: '160',
    displayRows: 12,
    noColumnHeader: false,
    gridDetailCheck: false,
    unionFlag: 0,
    dragcond: '',
    isMrpDrag: false,
    mrpDragTag: '',
    privilegeOper: '',
    Fremark: '',
    relatedModule: '',
    relatedCondition: '',
    autoRefresh: true,
    disabled: false,
    disabledCondition: '',
    ...overrides,
  });
  const mapSingleTableDetailChartConfig = (chart: SingleTableDetailChartDto) => normalizeDetailChartConfig({
    ...chart,
    id: getRecordFieldValue(chart, 'id'),
    orderId: toRecordNumber(getRecordFieldValue(chart, 'orderid', 'orderId'), 0),
    chartType: toRecordText(getRecordFieldValue(chart, 'charttype', 'chartType')) || '0',
    chartTitle: toRecordText(getRecordFieldValue(chart, 'charttitle', 'chartTitle')),
    chartColor: toRecordText(getRecordFieldValue(chart, 'chartcolor', 'chartColor')) || '#2563eb',
    chartColorDf: toRecordText(getRecordFieldValue(chart, 'chartcolordf', 'chartColorDf', 'chartColorDF')) || '#60a5fa',
    chart3D: toRecordBoolean(getRecordFieldValue(chart, 'chart3d', 'chart3D'), false),
    gridLineVisible: toRecordBoolean(getRecordFieldValue(chart, 'gridlinevisible', 'gridLineVisible'), true),
    XLabelField: toRecordText(getRecordFieldValue(chart, 'xlabelfield', 'XLabelField')),
    YValueField: toRecordText(getRecordFieldValue(chart, 'yvaluefield', 'YValueField')),
    XAxisTitle: toRecordText(getRecordFieldValue(chart, 'xaxistitle', 'XAxisTitle')),
    YAxisTitle: toRecordText(getRecordFieldValue(chart, 'yaxistitle', 'YAxisTitle')),
    YAxisShared: toRecordBoolean(getRecordFieldValue(chart, 'yaxisshared', 'YAxisShared'), false),
    markVisible: toRecordBoolean(getRecordFieldValue(chart, 'markvisible', 'markVisible'), false),
    legendVisible: toRecordBoolean(getRecordFieldValue(chart, 'legendvisible', 'legendVisible'), false),
    isVisible: toRecordBoolean(getRecordFieldValue(chart, 'isvisible', 'isVisible'), false),
    IsAbsolutely: toRecordBoolean(getRecordFieldValue(chart, 'isabsolutely', 'IsAbsolutely'), false),
    YScale: toRecordText(getRecordFieldValue(chart, 'yscale', 'YScale')),
    yvaluefield1: toRecordText(getRecordFieldValue(chart, 'yvaluefield1')),
    yvaluefield2: toRecordText(getRecordFieldValue(chart, 'yvaluefield2')),
    valueVisible: toRecordBoolean(getRecordFieldValue(chart, 'valuevisible', 'valueVisible'), false),
    labelangle: toRecordText(getRecordFieldValue(chart, 'labelangle')),
    labelvisible: toRecordBoolean(getRecordFieldValue(chart, 'labelvisible'), false),
    labelsize: toRecordText(getRecordFieldValue(chart, 'labelsize')),
    labelSpaced: toRecordText(getRecordFieldValue(chart, 'labelspaced', 'labelSpaced')),
    circlejagge: toRecordBoolean(getRecordFieldValue(chart, 'circlejagge'), false),
    circlehollow: toRecordBoolean(getRecordFieldValue(chart, 'circlehollow'), false),
  });
  const mapSingleTableDetailRecord = (detail: SingleTableDetailDto, index: number) => {
    const backendId = getRecordFieldValue(detail, 'id');
    const backendFormKey = toRecordText(getRecordFieldValue(detail, 'formkey', 'formKey'));
    const backendTabKey = toRecordText(getRecordFieldValue(detail, 'tabkey', 'tabKey'));
    const configuredTabCode = toRecordText(getRecordFieldValue(detail, 'tab'));
    const relatedModuleCode = toRecordText(getRecordFieldValue(detail, 'unionmodule', 'UnionModule', 'relatedmodule', 'relatedModule'));
    const detailName = toRecordText(getRecordFieldValue(detail, 'detailname', 'detailName')) || `明细 ${index + 1}`;
    const fillType = resolveSingleTableDetailFillType(detail);
    const detailTabId = backendId == null
      ? (backendFormKey || `detail_${Date.now()}_${index + 1}`)
      : `detail_${backendId}`;
    const relatedCondition = toRecordText(
      getRecordFieldValue(detail, 'unioncond', 'unionCond', 'relatedcondition', 'relatedCondition'),
    );
    const detailSql = toRecordText(getRecordFieldValue(detail, 'detailsql', 'detailSQL', 'detailSql'));
    const tableType = fillType === '树表格' ? '树表格' : '普通表格';

    return {
      tab: {
        id: detailTabId,
        name: detailName,
      },
      fillType,
      config: buildDetailTabConfig({
        ...detail,
        id: detailTabId,
        backendId,
        formKey: backendFormKey,
        tab: configuredTabCode || currentModuleCode,
        tabKey: backendTabKey || backendFormKey || detailTabId,
        detailName,
        detailType: fillType,
        detailTypeCode: getDetailFillTypeBackendValue(fillType),
        dllTemplate: toRecordText(getRecordFieldValue(detail, 'library', 'dlltemplate', 'dllTemplate')),
        relatedModule: relatedModuleCode,
        relatedModuleField: toRecordText(
          getRecordFieldValue(detail, 'unionparentfield', 'unionParentField', 'relatedmodulefield', 'relatedModuleField'),
        ),
        relatedValue: toRecordText(getRecordFieldValue(detail, 'unionvalue', 'unionValue', 'relatedvalue', 'relatedValue')),
        rightDisplay: toRecordBoolean(
          getRecordFieldValue(detail, 'rightvisible', 'rightVisible', 'rightdisplay', 'rightDisplay'),
          false,
        ),
        addDisplay: toRecordBoolean(getRecordFieldValue(detail, 'addvisible', 'addVisible', 'adddisplay', 'addDisplay'), false),
        defaultOpen: toRecordBoolean(getRecordFieldValue(detail, 'defaultitem', 'defaultItem', 'defaultopen', 'defaultOpen'), false),
        scanMode: toRecordBoolean(getRecordFieldValue(detail, 'scanmode', 'scanMode'), false),
        cardMode: toRecordBoolean(getRecordFieldValue(detail, 'menumode', 'menuMode', 'cardmode', 'cardMode'), false),
        bandHeight: toRecordText(getRecordFieldValue(detail, 'bandheight', 'bandHeight')) || '36',
        bandWidth: toRecordText(getRecordFieldValue(detail, 'bandwidth', 'bandWidth')) || '160',
        displayRows: toRecordNumber(getRecordFieldValue(detail, 'displayrows', 'displayRows'), 12),
        noColumnHeader: toRecordBoolean(getRecordFieldValue(detail, 'nocolumnheader', 'noColumnHeader'), false),
        gridDetailCheck: toRecordBoolean(getRecordFieldValue(detail, 'griddetailcheck', 'gridDetailCheck'), false),
        unionFlag: toRecordNumber(getRecordFieldValue(detail, 'unionflag', 'unionFlag'), 0),
        dragcond: toRecordText(getRecordFieldValue(detail, 'dragcond')),
        isMrpDrag: toRecordBoolean(getRecordFieldValue(detail, 'ismrpdrag', 'isMrpDrag'), false),
        mrpDragTag: toRecordText(getRecordFieldValue(detail, 'mrpdragtag', 'mrpDragTag')),
        privilegeOper: toRecordText(getRecordFieldValue(detail, 'privilegeoper', 'privilegeOper', 'operusers', 'operUsers')),
        Fremark: toRecordText(getRecordFieldValue(detail, 'fremark', 'Fremark')),
        relatedCondition,
        autoRefresh: toRecordBoolean(getRecordFieldValue(detail, 'autorefresh', 'autoRefresh'), true),
        disabled: toRecordBoolean(getRecordFieldValue(detail, 'isvisible', 'isVisible', 'disabled'), false),
        disabledCondition: toRecordText(
          getRecordFieldValue(detail, 'visiblecond', 'visibleCond', 'disabledcondition', 'disabledCondition'),
        ),
      }),
      gridConfig: buildGridConfig(detailSql, relatedCondition, {
        sourceMode: relatedModuleCode ? 'module' : 'sql',
        sourceModuleCode: relatedModuleCode,
        sourceCondition: relatedCondition,
        tableType,
      }),
    };
  };

  const parseSqlFieldNames = (sql: string) => {
    const match = sql.match(/select\s+([\s\S]+?)\s+from/i);
    if (!match) return [];

    return Array.from(new Set(
      match[1]
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => {
          const aliasMatch = item.match(/\bas\s+([\[\]`"A-Za-z0-9_]+)/i);
          const rawName = aliasMatch?.[1] ?? item.split(/\s+/).pop() ?? item;
          return rawName
            .replace(/[\[\]`"]/g, '')
            .split('.')
            .pop()
            ?.trim() ?? '';
        })
        .filter(Boolean),
    ));
  };

  const normalizeColumn = (col: any) => ({
    ...getBillFieldLayout(0, BILL_FORM_DEFAULT_WIDTH),
    required: false,
    visible: true,
    searchable: false,
    readonly: false,
    align: '左对齐',
    placeholder: '',
    defaultValue: '',
    dictCode: '',
    formula: '',
    relationSql: '',
    dynamicSql: '',
    helpText: '',
    ...col,
    type: resolveColumnFieldType(col),
    fieldSqlTag: resolveColumnFieldSqlTagId(col),
    fieldSqlTagName: toRecordText(getRecordFieldValue(col, 'fieldsqltagname', 'fieldSqlTagName')),
  });
  const buildTreeRelationFallbackColumns = (fields: string[], currentColumns: any[] = []) => (
    fields.map((fieldName, index) => {
      const existing = currentColumns.find((item) => item.sourceField === fieldName);
      if (existing) {
        return { ...existing, sourceField: fieldName };
      }

      return buildColumn('tree_col', index + 1, {
        name: fieldName,
        sourceField: fieldName,
        width: index === 1 ? 176 : 148,
      });
    })
  );
  const mapSingleTableGridFieldRecordToColumn = (
    field: SingleTableGridFieldDto,
    index: number,
    existingColumn?: any,
  ) => {
    const normalizedExisting = existingColumn ? normalizeColumn(existingColumn) : null;
    const backendId = getRecordFieldValue(field, 'id');
    const ownerFieldId = getRecordFieldValue(field, 'fieldid', 'fieldId');
    const fieldKey = toRecordText(getRecordFieldValue(field, 'fieldkey', 'fieldKey'));
    const fieldName = toRecordText(getRecordFieldValue(field, 'fieldname', 'fieldName'));
    const displayName = toRecordText(getRecordFieldValue(field, 'displayname', 'displayName', 'username'));
    const orderId = toRecordNumber(getRecordFieldValue(field, 'orderid', 'orderId'), index + 1);
    const width = toRecordNumber(
      getRecordFieldValue(field, 'width', 'mobilewidth', 'mobileWidth'),
      normalizedExisting?.width ?? (index === 1 ? 176 : 148),
    );

    return buildColumn('tree_col', index + 1, {
      ...(normalizedExisting ?? {}),
      ...field,
      id: backendId == null ? (normalizedExisting?.id ?? `tree_grid_${Date.now()}_${index + 1}`) : `tree_grid_${backendId}`,
      backendId,
      ownerFieldId,
      orderId,
      backendFieldKey: fieldKey || normalizedExisting?.backendFieldKey || '',
      name: displayName || fieldName || normalizedExisting?.name || `左侧列 ${index + 1}`,
      sourceField: fieldName || fieldKey || normalizedExisting?.sourceField || `tree_field_${index + 1}`,
      type: normalizedExisting?.type || '文本',
      width,
      mobileWidth: toRecordNumber(getRecordFieldValue(field, 'mobilewidth', 'mobileWidth'), width),
      visible: toRecordBoolean(getRecordFieldValue(field, 'isvisible', 'isVisible'), normalizedExisting?.visible ?? true),
      showMobile: toRecordBoolean(getRecordFieldValue(field, 'showmobile', 'showMobile'), normalizedExisting?.showMobile ?? false),
      isCodeField: toRecordBoolean(getRecordFieldValue(field, 'iscodefield', 'isCodeField'), normalizedExisting?.isCodeField ?? false),
    });
  };
  const normalizeConditionField = (field: any) => ({
    required: false,
    visible: true,
    searchable: true,
    readonly: false,
    align: '左对齐',
    placeholder: '',
    defaultValue: '',
    dictCode: '',
    formula: '',
    relationSql: '',
    dynamicSql: '',
    helpText: '',
    ...field,
    width: Math.min(
      CONDITION_PANEL_RESIZE_MAX_WIDTH,
      Math.max(
        CONDITION_PANEL_RESIZE_MIN_WIDTH,
        Number.isFinite(Number(field?.width)) ? Number(field.width) : CONDITION_PANEL_CONTROL_WIDTH,
      ),
    ),
    panelRow: Math.min(
      CONDITION_PANEL_MAX_ROWS,
      Math.max(
        CONDITION_PANEL_MIN_ROWS,
        Number.isFinite(Number(field?.panelRow)) ? Number(field.panelRow) : CONDITION_PANEL_MIN_ROWS,
      ),
    ),
  });
  const resolveSingleTableConditionType = (condition: Record<string, unknown>) => {
    const directType = toRecordText(
      getRecordFieldValue(condition, 'type', 'controltypename', 'controlTypeName', 'fieldtypename', 'fieldTypeName'),
    );

    if (FIELD_TYPE_OPTIONS.includes(directType)) {
      return directType;
    }

    const controlTypeLabel = toRecordText(
      getRecordFieldValue(condition, 'fieldsqltagname', 'fieldSqlTagName', 'showname', 'showName'),
    );
    const controlTypeValue = getRecordFieldValue(condition, 'controltype', 'controlType', 'fieldsqltag', 'fieldSqlTag');
    const mappedByControlType = mapFieldSqlTagToFieldType(controlTypeValue, controlTypeLabel, directType || '文本');
    if (FIELD_TYPE_OPTIONS.includes(mappedByControlType)) {
      return mappedByControlType;
    }

    if (/(日期|时间|date|time)/i.test(directType)) {
      return '日期框';
    }

    if (/下拉|select/i.test(directType)) {
      return '下拉框';
    }

    if (/搜索|lookup|search/i.test(directType)) {
      return '搜索框';
    }

    const labelText = toRecordText(getRecordFieldValue(condition, 'controllabel', 'controlLabel', 'controlname', 'controlName'));
    if (/(日期|时间|date|time)/i.test(labelText)) {
      return '日期框';
    }

    return '文本';
  };
  const resolveSingleTableDetailFillType = (detail: Record<string, unknown>) => {
    const directType = toRecordText(
      getRecordFieldValue(detail, 'detailtype', 'detailType', 'displaymode', 'displayMode', 'tabletype', 'tableType'),
    );

    if (DETAIL_FILL_TYPE_OPTIONS.some((option) => option.value === directType)) {
      return directType;
    }

    if (/(tree|树)/i.test(directType)) {
      return '树表格';
    }

    if (/(chart|图)/i.test(directType)) {
      return '图表';
    }

    if (/(web|page|url|网页)/i.test(directType)) {
      return '网页';
    }

    switch (directType) {
      case '0':
        return '表格';
      case '1':
        return '图表';
      case '2':
      case '3':
        return '网页';
      default:
        return '表格';
    }
  };
  const mapSingleTableConditionRecordToField = (
    condition: SingleTableConditionDto,
    index: number,
    overrides: Record<string, unknown> = {},
  ) => {
    const backendId = getRecordFieldValue(condition, 'id');
    const controlName = toRecordText(getRecordFieldValue(condition, 'controlname', 'controlName'));
    const controlLabel = toRecordText(getRecordFieldValue(condition, 'controllabel', 'controlLabel'));
    const displayName = controlLabel || controlName || `条件 ${index + 1}`;
    const controlType = resolveSingleTableConditionType(condition);
    const placeholder = controlType === '日期框' || controlType === '下拉框' || controlType === '搜索框' || controlType === '单选框' || controlType === '多选框'
      ? `请选择${displayName}`
      : `请输入${displayName}`;

    return normalizeConditionField({
      ...condition,
      id: backendId == null ? `cond_${Date.now()}_${index + 1}` : `cond_${backendId}`,
      backendId,
      orderId: toRecordNumber(getRecordFieldValue(condition, 'orderid', 'orderId'), index + 1),
      sourceid: getRecordFieldValue(condition, 'sourceid', 'sourceId'),
      formKey: toRecordText(getRecordFieldValue(condition, 'formkey', 'formKey')),
      name: displayName,
      sourceField: controlName || toRecordText(getRecordFieldValue(condition, 'keyfield', 'keyField')) || `condition_${index + 1}`,
      type: controlType,
      width: toRecordNumber(
        getRecordFieldValue(condition, 'controlwidth', 'controlWidth', 'width'),
        CONDITION_PANEL_CONTROL_WIDTH,
      ),
      defaultValue: toRecordText(getRecordFieldValue(condition, 'defaultvalue', 'defaultValue')),
      relationSql: toRecordText(getRecordFieldValue(condition, 'sourcesql', 'sourceSql')),
      formula: toRecordText(getRecordFieldValue(condition, 'resultfield', 'resultField')),
      dynamicSql: toRecordText(getRecordFieldValue(condition, 'checkcond', 'checkCondition')),
      dictCode: toRecordText(getRecordFieldValue(condition, 'keyfield', 'keyField')),
      placeholder,
      panelRow: CONDITION_PANEL_MIN_ROWS,
      ...overrides,
    });
  };
  const [leftTableColumns, setLeftTableColumns] = useState<any[]>([]);
  const [leftTableConfig, setLeftTableConfig] = useState(() => buildDefaultLeftTableConfig());
  const [leftFilterFields, setLeftFilterFields] = useState<any[]>([]);
  const [mainTableColumns, setMainTableColumns] = useState<any[]>([]);
  const [isMainHiddenColumnsModalOpen, setIsMainHiddenColumnsModalOpen] = useState(false);
  const [selectedMainHiddenColumnIds, setSelectedMainHiddenColumnIds] = useState<string[]>([]);
  const [mainHiddenColumnsSearchText, setMainHiddenColumnsSearchText] = useState('');
  const [detailTabs, setDetailTabs] = useState<Array<{ id: string; name: string }>>([]);
  const [activeTab, setActiveTab] = useState('');
  const [tabFillTypes, setTabFillTypes] = useState<Record<string, string>>({});
  const [mainTableConfig, setMainTableConfig] = useState(() => buildDefaultMainTableConfig());
  const currentPrimaryTableName = String(mainTableConfig.tableName || '').trim();
  const isRenderableMainColumn = (column: any) => {
    const normalizedColumn = normalizeColumn(column);
    return normalizedColumn.visible !== false && Number(normalizedColumn.width) > 0;
  };
  const [detailTableConfigs, setDetailTableConfigs] = useState<Record<string, any>>({});
  const [mainFilterFields, setMainFilterFields] = useState<any[]>([]);
  const [detailFilterFields, setDetailFilterFields] = useState<Record<string, any[]>>({});
  const [detailTabConfigs, setDetailTabConfigs] = useState<Record<string, any>>({});
  useEffect(() => {
    setDetailTabConfigs((prev) => {
      let changed = false;
      const next = { ...prev };

      detailTabs.forEach((tab) => {
        const current = prev[tab.id] ?? buildDetailTabConfig();
        const synced = {
          ...current,
          tab: currentModuleCode,
          tabKey: current.tabKey || tab.id,
          detailName: current.detailName || tab.name,
        };

        if (JSON.stringify(synced) !== JSON.stringify(current)) {
          next[tab.id] = synced;
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [currentModuleCode, detailTabs]);
  useEffect(() => {
    let isActive = true;

    const loadFieldSqlTagOptions = async () => {
      try {
        const rows = await fetchFieldSqlTagOptions();

        if (!isActive || !Array.isArray(rows) || rows.length === 0) {
          return;
        }

        const dedupedRows = rows.reduce<FieldSqlTagOptionDto[]>((collection, row) => {
          const optionId = normalizeFieldSqlTagId(row?.showid, -1);
          if (optionId < 0 || collection.some((item) => normalizeFieldSqlTagId(item.showid, -1) === optionId)) {
            return collection;
          }

          collection.push({
            showid: optionId,
            showname: getFieldSqlTagOptionLabel(row),
          });
          return collection;
        }, []);

        if (dedupedRows.length > 0) {
          setFieldSqlTagOptions(dedupedRows);
        }
      } catch {
        if (!isActive) {
          return;
        }

        setFieldSqlTagOptions(DEFAULT_FIELD_SQL_TAG_OPTIONS);
      }
    };

    void loadFieldSqlTagOptions();

    return () => {
      isActive = false;
    };
  }, []);
  const [inspectorTarget, setInspectorTarget] = useState<{
    kind:
      | 'none'
      | 'left-col'
      | 'main-col'
      | 'detail-col'
      | 'left-filter'
      | 'main-filter'
      | 'detail-filter'
      | 'left-filter-panel'
      | 'main-filter-panel'
      | 'detail-tab'
      | 'left-grid'
      | 'main-grid'
      | 'detail-grid'
      | 'source-grid'
      | 'workspace-theme'
      | 'main-context'
      | 'detail-context';
    id?: string | null;
  }>({ kind: 'main-grid' });
  const [inspectorPanelTab, setInspectorPanelTab] = useState<'common' | 'advanced' | 'contextmenu' | 'color'>('common');
  const [selectedLeftContextMenuId, setSelectedLeftContextMenuId] = useState<string | null>(null);
  const [selectedMainContextMenuId, setSelectedMainContextMenuId] = useState<string | null>(null);
  const [selectedDetailContextMenuId, setSelectedDetailContextMenuId] = useState<string | null>(null);
  const [selectedLeftColorRuleId, setSelectedLeftColorRuleId] = useState<string | null>(null);
  const [selectedMainColorRuleId, setSelectedMainColorRuleId] = useState<string | null>(null);
  const [selectedDetailColorRuleId, setSelectedDetailColorRuleId] = useState<string | null>(null);
  const [selectedPopupMenuParamKey, setSelectedPopupMenuParamKey] = useState<string>('dllpar1');
  const selectedPopupMenuOwnerRef = useRef<string | null>(null);
  const [selectedLeftForDelete, setSelectedLeftForDelete] = useState<string[]>([]);
  const [selectedMainForDelete, setSelectedMainForDelete] = useState<string[]>([]);
  const [selectedLeftFiltersForDelete, setSelectedLeftFiltersForDelete] = useState<string[]>([]);
  const [selectedMainFiltersForDelete, setSelectedMainFiltersForDelete] = useState<string[]>([]);
  const [fieldSqlTagOptions, setFieldSqlTagOptions] = useState<FieldSqlTagOptionDto[]>(DEFAULT_FIELD_SQL_TAG_OPTIONS);

  const [detailTableColumns, setDetailTableColumns] = useState<Record<string, any[]>>({});
  const [selectedDetailForDelete, setSelectedDetailForDelete] = useState<string[]>([]);
  const [selectedDetailFiltersForDelete, setSelectedDetailFiltersForDelete] = useState<string[]>([]);
  const [selectedArchiveNodeId, setSelectedArchiveNodeId] = useState('archive-main');
  const [isDocumentConditionWorkbenchOpen, setIsDocumentConditionWorkbenchOpen] = useState(false);
  const [billSources, setBillSources] = useState<BillSourceEntry[]>([]);
  const [activeBillSourceId, setActiveBillSourceId] = useState('');
  const [billSourceDraft, setBillSourceDraft] = useState<BillSourceEntry>({
    id: `bill-source-${Date.now()}-1`,
    configType: '普通来源',
    sourceName: '',
    sourceSql: '',
    sourceDetail: '',
    sourceType: 'SQL',
  });
  const [billSourceDraftMode, setBillSourceDraftMode] = useState<'create' | 'edit'>('create');
  const activeBillSource = billSources.find((item) => item.id === activeBillSourceId) ?? billSources[0] ?? null;
  const parseBillSourceDetailFields = (sourceDetail?: string) => {
    if (!sourceDetail) return [];
    return sourceDetail
      .split(/[\n,，;；|]/)
      .map((item) => item.trim())
      .filter(Boolean);
  };
  const billSourceFieldMap = billSources.reduce<Record<string, string[]>>((accumulator, item) => {
    accumulator[item.id] = parseBillSourceDetailFields(item.sourceDetail);
    return accumulator;
  }, {});
  const buildBillSourceEntry = (index: number, overrides: Partial<BillSourceEntry> = {}): BillSourceEntry => ({
    id: `bill-source-${Date.now()}-${index}`,
    configType: '普通来源',
    sourceName: '',
    sourceSql: '',
    sourceDetail: '',
    sourceType: 'SQL',
    ...overrides,
  });
  const selectBillSourceDraft = (source: BillSourceEntry) => {
    setActiveBillSourceId(source.id);
    setBillSourceDraft({ ...source });
    setBillSourceDraftMode('edit');
  };
  const createBillSourceDraft = () => {
    const nextDraft = buildBillSourceEntry(billSources.length + 1);
    setActiveBillSourceId(nextDraft.id);
    setBillSourceDraft(nextDraft);
    setBillSourceDraftMode('create');
  };
  const saveBillSourceDraft = () => {
    const normalizedDraft = {
      ...billSourceDraft,
      sourceName: billSourceDraft.sourceName.trim(),
      sourceSql: billSourceDraft.sourceSql.trim(),
      sourceDetail: billSourceDraft.sourceDetail.trim(),
    };
    setBillSources((prev) => (
      prev.some((item) => item.id === normalizedDraft.id)
        ? prev.map((item) => (item.id === normalizedDraft.id ? normalizedDraft : item))
        : [...prev, normalizedDraft]
    ));
    setActiveBillSourceId(normalizedDraft.id);
    setBillSourceDraft(normalizedDraft);
    setBillSourceDraftMode('edit');
    showToast('来源配置已保存');
  };
  const updateBillSourceDraft = useCallback((patch: Partial<BillSourceEntry>) => {
    setBillSourceDraft((prev) => ({ ...prev, ...patch }));
  }, []);
  const [billDetailColumns, setBillDetailColumns] = useState<any[]>([]);
  const [billDetailConfig, setBillDetailConfig] = useState(() => buildDefaultBillDetailConfig());
  const [billMetaFields, setBillMetaFields] = useState<any[]>([]);
  const todayIso = new Date().toISOString().slice(0, 10);
  const buildRestrictionMeasure = (index: number, overrides: Partial<RestrictionMeasureItem> = {}): RestrictionMeasureItem => ({
    id: `guard_rule_${Date.now()}_${index}`,
    businessCategory: '业务处理',
    eventType: '保存时',
    stepCode: '0',
    judgeRule: '',
    syncAction: '',
    description: `限制措施 ${index}`,
    hint: '',
    order: index,
    enabled: true,
    confirmRequired: false,
    applyDate: todayIso,
    applyUser: '',
    ...overrides,
  });
  const buildRestrictionNumberRule = (index: number, overrides: Partial<RestrictionNumberRuleItem> = {}): RestrictionNumberRuleItem => ({
    id: `number_rule_${Date.now()}_${index}`,
    moduleCode: currentModuleCode,
    sortOrder: index,
    enabled: true,
    sequencePermission: true,
    segmentType: '固定字符串',
    segmentValue: '',
    lengthLimit: 2,
    separator: '',
    inputDate: todayIso,
    creator: '',
    ...overrides,
  });
  const currentRestrictionProcessBusinessType = businessType === 'table' ? '单据' : businessType === 'tree' ? '树形单表' : '单表';
  const buildRestrictionProcessDesignId = (value: {
    legacyFlowTypeId?: number;
    planValue?: string;
    schemeCode?: string;
    fallbackIndex?: number;
  }) => {
    if (typeof value.legacyFlowTypeId === 'number' && Number.isFinite(value.legacyFlowTypeId)) {
      return `process_scheme_${value.legacyFlowTypeId}`;
    }
    if (value.planValue && value.planValue.trim()) {
      return `process_scheme_${value.planValue.trim()}`;
    }
    if (value.schemeCode && value.schemeCode.trim()) {
      return `process_scheme_${value.schemeCode.trim()}`;
    }
    return `process_rule_${Date.now()}_${value.fallbackIndex ?? 0}`;
  };
  const mapProcessDesignerSchemeToItem = useCallback((
    scheme: ProcessDesignerSchemeDto,
    fallbackIndex: number,
  ): RestrictionProcessDesignItem => ({
    id: buildRestrictionProcessDesignId({
      fallbackIndex,
      legacyFlowTypeId: scheme.legacyFlowTypeId,
      planValue: scheme.planValue,
      schemeCode: scheme.schemeCode,
    }),
    legacyFlowTypeId: scheme.legacyFlowTypeId,
    planValue: String(scheme.planValue || scheme.legacyFlowTypeId || ''),
    businessCode: String(scheme.businessCode || currentModuleCode || ''),
    schemeCode: String(scheme.schemeCode || `Q0${fallbackIndex}`),
    schemeName: String(scheme.schemeName || `流程方案 ${fallbackIndex}`),
    permissionScope: String(scheme.permissionScope || ''),
    approvalFamily: scheme.approvalFamily || (businessType === 'table' ? 'bill' : 'archive'),
    businessType: String(scheme.businessType || currentRestrictionProcessBusinessType),
    actionDescription: String(scheme.actionDescription || ''),
    designerDocument: createLinearProcessDesignerDocument(currentModuleName),
    simpleSchema: scheme.simpleSchema,
    simpleSchemaVersion: scheme.simpleSchemaVersion || 'v1',
  }), [businessType, currentModuleCode, currentModuleName, currentRestrictionProcessBusinessType]);
  const buildRestrictionProcessDesign = (index: number, overrides: Partial<RestrictionProcessDesignItem> = {}): RestrictionProcessDesignItem => ({
    id: buildRestrictionProcessDesignId({ fallbackIndex: index, schemeCode: `Q0${index}` }),
    planValue: '',
    businessCode: currentModuleCode,
    schemeCode: `Q0${index}`,
    schemeName: `流程方案 ${index}`,
    permissionScope: '',
    approvalFamily: businessType === 'table' ? 'bill' : 'archive',
    businessType: currentRestrictionProcessBusinessType,
    actionDescription: '',
    designerDocument: createLinearProcessDesignerDocument(currentModuleName),
    simpleSchemaVersion: 'v1',
    ...overrides,
  });
  const buildRestrictionTopStructure = (index: number, overrides: Partial<RestrictionTopStructureItem> = {}): RestrictionTopStructureItem => ({
    id: `top_structure_${Date.now()}_${index}`,
    mainModuleCode: currentModuleCode,
    tableName: currentPrimaryTableName,
    tableDesc: currentModuleName,
    remark: '',
    rowId: 150 + index,
    moduleCode: currentModuleCode,
    moduleType: businessType === 'table' ? '单据' : businessType === 'tree' ? '树形单表' : '单表',
    moduleSchema: businessType === 'table' ? '主从单据' : businessType === 'tree' ? '树表结构' : '单表结构',
    fieldPrefix: businessType === 'table' ? 'bill_' : 'base_',
    sequencePrefix: businessType === 'table' ? 'bd_' : 'main_',
    sequenceRule: businessType === 'table' ? '单据内顺序' : '主表顺序',
    orderLength: 4,
    relationField: businessType === 'table' ? 'bill_id' : 'id',
    ...overrides,
  });
  const [restrictionMeasures, setRestrictionMeasures] = useState<RestrictionMeasureItem[]>([]);
  const [restrictionNumberRules, setRestrictionNumberRules] = useState<RestrictionNumberRuleItem[]>([]);
  const [restrictionProcessDesigns, setRestrictionProcessDesigns] = useState<RestrictionProcessDesignItem[]>([]);
  const [restrictionTopStructures, setRestrictionTopStructures] = useState<RestrictionTopStructureItem[]>([]);
  const [restrictionSelection, setRestrictionSelection] = useState<Record<RestrictionConfigTabId, string | null>>(
    () => buildEmptyRestrictionSelection(),
  );
  const selectedRestrictionProcessDesign = useMemo(
    () => restrictionProcessDesigns.find((item) => item.id === restrictionSelection.process) ?? restrictionProcessDesigns[0] ?? null,
    [restrictionProcessDesigns, restrictionSelection.process],
  );
  const updateSelectedRestrictionProcessDesign = useCallback((patch: Partial<RestrictionProcessDesignItem>) => {
    if (!selectedRestrictionProcessDesign) {
      return;
    }
    setRestrictionProcessDesigns((prev) => prev.map((item) => (
      item.id === selectedRestrictionProcessDesign.id
        ? { ...item, ...patch }
        : item
    )));
  }, [selectedRestrictionProcessDesign]);
  const createRestrictionProcessDesignEntry = useCallback(() => {
    const next = buildRestrictionProcessDesign(restrictionProcessDesigns.length + 1);
    setRestrictionProcessDesigns((prev) => [...prev, next]);
    setRestrictionSelection((prev) => ({ ...prev, process: next.id }));
    showToast('已创建流程设计方案');
  }, [buildRestrictionProcessDesign, restrictionProcessDesigns.length, showToast]);
  useEffect(() => {
    if (!isConfigOpen || !isMenuInfoBuilt || !currentModuleCode.trim()) {
      return;
    }

    let active = true;

    const loadRestrictionProcessDesigns = async () => {
      try {
        const schemes = await listProcessDesignerSchemes({
          approvalFamily: businessType === 'table' ? 'bill' : 'archive',
          businessCode: currentModuleCode,
          businessType: currentRestrictionProcessBusinessType,
        });
        if (!active) {
          return;
        }

        const mapped = schemes.map((scheme, index) => mapProcessDesignerSchemeToItem(scheme, index + 1));
        setRestrictionProcessDesigns(mapped);
        setRestrictionSelection((prev) => {
          const nextSelectedId = mapped.some((item) => item.id === prev.process)
            ? prev.process
            : mapped[0]?.id ?? null;
          return nextSelectedId === prev.process ? prev : { ...prev, process: nextSelectedId };
        });
      } catch (error) {
        if (active) {
          showToast(getDashboardErrorMessage(error));
        }
      }
    };

    void loadRestrictionProcessDesigns();

    return () => {
      active = false;
    };
  }, [
    businessType,
    currentModuleCode,
    currentRestrictionProcessBusinessType,
    isConfigOpen,
    isMenuInfoBuilt,
    mapProcessDesignerSchemeToItem,
    showToast,
  ]);
  const handleSaveRestrictionTab = useCallback(async (tabId: RestrictionConfigTabId) => {
    if (tabId !== 'process') {
      const tabLabelMap: Record<RestrictionConfigTabId, string> = {
        guard: '管控限制措施',
        number: '编号规则管理',
        structure: '顶层数据结构',
        process: '流程设计管理',
      };
      showToast(`${tabLabelMap[tabId]} 已暂存`);
      return;
    }

    if (!selectedRestrictionProcessDesign) {
      showToast('请先选择一个流程方案');
      return;
    }

    try {
      const savedScheme = await saveProcessDesignerScheme({
        approvalFamily: selectedRestrictionProcessDesign.approvalFamily,
        actionDescription: selectedRestrictionProcessDesign.actionDescription,
        businessCode: selectedRestrictionProcessDesign.businessCode,
        businessType: selectedRestrictionProcessDesign.businessType,
        legacyFlowTypeId: selectedRestrictionProcessDesign.legacyFlowTypeId,
        permissionScope: selectedRestrictionProcessDesign.permissionScope,
        planValue: selectedRestrictionProcessDesign.planValue,
        schemeCode: selectedRestrictionProcessDesign.schemeCode,
        schemeName: selectedRestrictionProcessDesign.schemeName,
        simpleSchema: selectedRestrictionProcessDesign.simpleSchema,
        simpleSchemaVersion: selectedRestrictionProcessDesign.simpleSchemaVersion,
      });

      const mapped = mapProcessDesignerSchemeToItem(savedScheme, restrictionProcessDesigns.length || 1);
      setRestrictionProcessDesigns((prev) => prev.map((item) => (
        item.id === selectedRestrictionProcessDesign.id ? mapped : item
      )));
      setRestrictionSelection((prev) => ({ ...prev, process: mapped.id }));
      showToast('流程方案已保存');
    } catch (error) {
      showToast(getDashboardErrorMessage(error));
    }
  }, [
    mapProcessDesignerSchemeToItem,
    restrictionProcessDesigns.length,
    selectedRestrictionProcessDesign,
    showToast,
  ]);
  const [documentConditionScope, setDocumentConditionScope] = useState<ConditionWorkbenchScope>('main');
  const [billHeaderWorkbenchConfig, setBillHeaderWorkbenchConfig] = useState<BillHeaderWorkbenchConfig>(
    buildBillHeaderWorkbenchConfig(),
  );
  const [billDocumentTone, setBillDocumentTone] = useState<'blue' | 'red'>('blue');
  const {
    activeResize,
    clearResizePreview,
    scheduleResizePreview,
    setActiveResize,
  } = useWorkbenchResizeState();
  const normalizedMainDetailBoardConfig = useMemo(
    () => normalizeDetailBoardConfig(mainTableConfig.detailBoard, mainTableColumns),
    [mainTableConfig.detailBoard, mainTableColumns],
  );
  const mainDetailBoardGroups = normalizedMainDetailBoardConfig.groups;
  const mainDetailBoardEnabled = normalizedMainDetailBoardConfig.enabled;
  const {
    renderableColumns: mainRenderableColumns,
    hiddenColumns: mainTableHiddenColumns,
  } = useMemo(() => {
    const renderableColumns: any[] = [];
    const hiddenColumns: any[] = [];

    mainTableColumns.forEach((column) => {
      const normalizedColumn = normalizeColumn(column);
      if (normalizedColumn.visible !== false && Number(normalizedColumn.width) > 0) {
        renderableColumns.push(column);
        return;
      }

      hiddenColumns.push(column);
    });

    return {
      renderableColumns,
      hiddenColumns,
    };
  }, [mainTableColumns]);
  const mainDocumentFilterRuntimeRules = useMemo(
    () => buildDocumentFilterRuntimeRules(mainFilterFields, activeResize),
    [activeResize, mainFilterFields],
  );
  const conditionWorkbenchHelpers = useMemo(() => ({
    buildResizeSnapCandidates,
    clampValue,
    resolveResizeWidthWithSnap,
  }), []);
  const conditionWorkbenchMetrics = useMemo(() => ({
    controlWidth: CONDITION_PANEL_CONTROL_WIDTH,
    maxRows: CONDITION_PANEL_MAX_ROWS,
    maxWidth: CONDITION_PANEL_RESIZE_MAX_WIDTH,
    minRows: CONDITION_PANEL_MIN_ROWS,
    minWidth: CONDITION_PANEL_RESIZE_MIN_WIDTH,
    rowGap: CONDITION_PANEL_ROW_GAP,
    rowHeight: CONDITION_PANEL_ROW_HEIGHT,
  }), []);
  const designerWorkbenchSensors = useSensors(
    useSensor(DesignerWorkbenchPointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
  );
  const [isDetailBoardOpen, setIsDetailBoardOpen] = useState(initialDetailPreview);
  const [detailBoardSortColumnId, setDetailBoardSortColumnId] = useState<string | null>(initialDetailPreview ? mainTableColumns[0]?.id ?? null : null);
  const [detailBoardOpenedRowId, setDetailBoardOpenedRowId] = useState<number | null>(initialDetailPreview ? 1 : null);
  const [selectedDetailBoardGroupId, setSelectedDetailBoardGroupId] = useState<string | null>(null);
  const [workspaceTheme, setWorkspaceTheme] = useState(initialWorkspaceTheme);
  const [detailBoardClipboardIds, setDetailBoardClipboardIds] = useState<string[]>([]);
  const [activeDetailBoardResize, setActiveDetailBoardResize] = useState<{
    groupId: string;
    columnId: string;
    label: string;
    width: number;
    minWidth: number;
    maxWidth: number;
    snapCandidates: number[];
  } | null>(null);
  const [activeDetailBoardHeightResize, setActiveDetailBoardHeightResize] = useState<{
    groupId: string;
    columnId: string;
    label: string;
    height: number;
    minHeight: number;
    maxHeight: number;
  } | null>(null);
  const [previewContextMenu, setPreviewContextMenu] = useState<{
    scope: 'main' | 'detail';
    rowId: number;
    x: number;
    y: number;
    items: any[];
  } | null>(null);
  const [builderSelectionContextMenu, setBuilderSelectionContextMenu] = useState<{
    kind: 'column' | 'filter';
    scope: 'left' | 'main' | 'detail';
    x: number;
    y: number;
    ids: string[];
  } | null>(null);
  const [longTextEditorState, setLongTextEditorState] = useState<LongTextEditorState | null>(null);
  const [billHeaderWorkbenchDrag, setBillHeaderWorkbenchDrag] = useState<{
    id: string;
    scope: BillCanvasFieldScope;
  } | null>(null);
  const [billHeaderWorkbenchDropTarget, setBillHeaderWorkbenchDropTarget] = useState<{
    row: number;
    beforeId: string | null;
  } | null>(null);
  const [isArchiveLayoutEditorOpen, setIsArchiveLayoutEditorOpen] = useState(false);
  const resetModuleDesignerState = () => {
    setLeftTableColumns([]);
    setLeftTableConfig(buildDefaultLeftTableConfig());
    setLeftFilterFields([]);
    setMainTableColumns([]);
    setIsMainHiddenColumnsModalOpen(false);
    setSelectedMainHiddenColumnIds([]);
    setMainHiddenColumnsSearchText('');
    setDetailTabs([]);
    setActiveTab('');
    setTabFillTypes({});
    setMainTableConfig(buildDefaultMainTableConfig());
    setDetailTableConfigs({});
    setMainFilterFields([]);
    setDetailFilterFields({});
    setDetailTabConfigs({});
    setSelectedLeftContextMenuId(null);
    setSelectedMainContextMenuId(null);
    setSelectedDetailContextMenuId(null);
    setSelectedLeftColorRuleId(null);
    setSelectedMainColorRuleId(null);
    setSelectedDetailColorRuleId(null);
    setSelectedPopupMenuParamKey('dllpar1');
    selectedPopupMenuOwnerRef.current = null;
    setSelectedLeftForDelete([]);
    setSelectedMainForDelete([]);
    setSelectedLeftFiltersForDelete([]);
    setSelectedMainFiltersForDelete([]);
    setDetailTableColumns({});
    setSelectedDetailForDelete([]);
    setSelectedDetailFiltersForDelete([]);
    setSelectedArchiveNodeId('archive-main');
    setBillSources([]);
    setActiveBillSourceId('');
    setBillSourceDraft(buildBillSourceEntry(1));
    setBillSourceDraftMode('create');
    setBillDetailColumns([]);
    setBillDetailConfig(buildDefaultBillDetailConfig());
    setBillMetaFields([]);
    setRestrictionMeasures([]);
    setRestrictionNumberRules([]);
    setRestrictionProcessDesigns([]);
    setRestrictionTopStructures([]);
    setRestrictionSelection(buildEmptyRestrictionSelection());
    setDocumentConditionScope('main');
    setBillHeaderWorkbenchConfig(buildBillHeaderWorkbenchConfig());
    setBillDocumentTone('blue');
    clearResizePreview();
    setActiveResize(null);
    setIsDetailBoardOpen(initialDetailPreview);
    setDetailBoardSortColumnId(null);
    setDetailBoardOpenedRowId(initialDetailPreview ? 1 : null);
    setSelectedDetailBoardGroupId(null);
    setWorkspaceTheme(initialWorkspaceTheme);
    setDetailBoardClipboardIds([]);
    setActiveDetailBoardResize(null);
    setActiveDetailBoardHeightResize(null);
    setPreviewContextMenu(null);
    setBuilderSelectionContextMenu(null);
    setLongTextEditorState(null);
    setBillHeaderWorkbenchDrag(null);
    setBillHeaderWorkbenchDropTarget(null);
    setIsArchiveLayoutEditorOpen(false);
    setInspectorTarget({ kind: 'main-grid' });
    setInspectorPanelTab('common');
    moduleSettingFullscreenInitRef.current = false;
  };
  const billDocumentViewportRef = useRef<HTMLDivElement | null>(null);
  const billDocumentPaperRef = useRef<HTMLDivElement | null>(null);
  const billHeaderCanvasRef = useRef<HTMLDivElement | null>(null);
  const moduleSettingFullscreenInitRef = useRef(false);
  const selectedLeftColId = inspectorTarget.kind === 'left-col' ? inspectorTarget.id ?? null : null;
  const selectedMainColId = inspectorTarget.kind === 'main-col' ? inspectorTarget.id ?? null : null;
  const selectedDetailColId = inspectorTarget.kind === 'detail-col' ? inspectorTarget.id ?? null : null;
  const selectedLeftFilterId = inspectorTarget.kind === 'left-filter' ? inspectorTarget.id ?? null : null;
  const selectedMainFilterId = inspectorTarget.kind === 'main-filter' ? inspectorTarget.id ?? null : null;
  const selectedDetailFilterId = inspectorTarget.kind === 'detail-filter' ? inspectorTarget.id ?? null : null;
  const selectedDetailTabId = inspectorTarget.kind === 'detail-tab' ? inspectorTarget.id ?? null : null;
  const selectedTableConfigScope = inspectorTarget.kind === 'left-grid'
    ? 'left'
    : inspectorTarget.kind === 'main-grid'
      ? 'main'
      : inspectorTarget.kind === 'detail-grid'
        ? 'detail'
        : null;
  const selectedContextMenuScope = inspectorTarget.kind === 'main-context' ? 'main' : inspectorTarget.kind === 'detail-context' ? 'detail' : null;
  const selectedConditionPanelScope = inspectorTarget.kind === 'left-filter-panel'
    ? 'left'
    : inspectorTarget.kind === 'main-filter-panel'
      ? 'main'
      : null;
  const isModuleSettingStep = isConfigOpen && (
    configStep === MODULE_SETTING_STEP
    || configStep === RESTRICTION_STEP
    || configStep === PROCESS_DESIGN_STEP
  );
  const isConfigFullscreenActive = isConfigOpen && isFullscreenConfig && (
    configStep === MODULE_SETTING_STEP
    || configStep === RESTRICTION_STEP
    || configStep === PROCESS_DESIGN_STEP
    || configStep === MODULE_PREVIEW_STEP
  );
  const isCompactModuleSetting = isModuleSettingStep && !isFullscreenConfig;
  const {
    moduleSettingStageStyle,
    workspaceThemeStyles,
    workspaceThemeVars,
  } = useDashboardTheme({
    isConfigFullscreenActive,
    workspaceTheme,
  });
  const {
    documentLeftPaneWidth,
    inspectorPaneWidth,
    startDocumentLeftResize,
  } = useDocumentWorkspaceLayout({
    isConfigFullscreenActive,
  });
  const moduleSettingStageHeightClass = isConfigFullscreenActive ? 'flex-1 min-h-[640px]' : 'flex-1 min-h-0';
  const {
    autoArrangeBillHeaderFields,
    commitBillHeaderFields,
    getBillHeaderDragItemId,
    getBillHeaderDropItemId,
    getBillHeaderRowCount,
    getBillHeaderRowDropId,
    getOrderedBillHeaderFields,
    moveBillHeaderField,
    updateBillHeaderWorkbenchRows,
  } = useBillHeaderWorkbench({
    billHeaderCanvasRef,
    billHeaderWorkbenchRows: billHeaderWorkbenchConfig.rows,
    billMetaFields,
    mainTableColumns,
    setBillHeaderWorkbenchConfig,
    setBillMetaFields,
    setMainTableColumns,
    clampValue,
    normalizeColumn,
    constants: {
      defaultWidth: BILL_FORM_DEFAULT_WIDTH,
      gapX: BILL_FORM_LAYOUT_GAP_X,
      gapY: BILL_FORM_LAYOUT_GAP_Y,
      layoutPaddingX: BILL_FORM_LAYOUT_PADDING_X,
      layoutPaddingY: BILL_FORM_LAYOUT_PADDING_Y,
      maxRows: BILL_HEADER_WORKBENCH_MAX_ROWS,
      maxWidth: BILL_FORM_MAX_WIDTH,
      minRows: BILL_HEADER_WORKBENCH_MIN_ROWS,
      minWidth: BILL_FORM_MIN_WIDTH,
      rowHeight: BILL_FORM_ROW_HEIGHT,
    },
  });
  const {
    activeBillResizeId,
    billFieldLivePreview,
    startBillFieldResize,
  } = useBillFieldResize({
    billHeaderCanvasRef,
    billHeaderWorkbenchRows: billHeaderWorkbenchConfig.rows,
    billMetaFields,
    mainTableColumns,
    setBillMetaFields,
    setMainTableColumns,
    clampValue,
    normalizeColumn,
    buildResizeSnapCandidates,
    resolveResizeWidthWithSnap,
    constants: {
      defaultWidth: BILL_FORM_DEFAULT_WIDTH,
      layoutPaddingX: BILL_FORM_LAYOUT_PADDING_X,
      maxRows: BILL_HEADER_WORKBENCH_MAX_ROWS,
      maxWidth: BILL_FORM_MAX_WIDTH,
      minRows: BILL_HEADER_WORKBENCH_MIN_ROWS,
      minWidth: BILL_FORM_MIN_WIDTH,
    },
  });
  const { billDocumentScale } = useBillDocumentLayout({
    autoArrangeBillHeaderFields,
    billDetailColumnCount: billDetailColumns.length,
    billDocumentPaperRef,
    billDocumentViewportRef,
    billMetaFields,
    businessType,
    isModuleSettingFullscreen: isConfigOpen && configStep === MODULE_SETTING_STEP && isFullscreenConfig,
    mainTableColumns,
    normalizeColumn,
    getBillFieldLayout,
    constants: {
      defaultWidth: BILL_FORM_DEFAULT_WIDTH,
      minWidth: BILL_FORM_MIN_WIDTH,
    },
  });
  const syncScopedDeleteSelection = (activeScope?: 'left' | 'main' | 'detail') => {
    setSelectedLeftForDelete((prev) => (activeScope === 'left' || prev.length === 0 ? prev : []));
    setSelectedMainForDelete((prev) => (activeScope === 'main' || prev.length === 0 ? prev : []));
    setSelectedDetailForDelete((prev) => (activeScope === 'detail' || prev.length === 0 ? prev : []));
  };
  const syncScopedFilterDeleteSelection = (activeScope?: 'left' | 'main' | 'detail') => {
    setSelectedLeftFiltersForDelete((prev) => (activeScope === 'left' || prev.length === 0 ? prev : []));
    setSelectedMainFiltersForDelete((prev) => (activeScope === 'main' || prev.length === 0 ? prev : []));
    setSelectedDetailFiltersForDelete((prev) => (activeScope === 'detail' || prev.length === 0 ? prev : []));
  };
  useEffect(() => {
    const nextModuleType = businessType === 'table' ? '单据' : businessType === 'tree' ? '树形单表' : '单表';
    setRestrictionTopStructures((prev) => {
      const first = prev[0];
      if (!first) return prev;
      if (
        first.mainModuleCode === currentModuleCode
        && first.moduleCode === currentModuleCode
        && first.tableName === currentPrimaryTableName
        && first.tableDesc === currentModuleName
        && first.moduleType === nextModuleType
      ) {
        return prev;
      }
      return prev.map((item, index) => (
        index === 0
          ? {
              ...item,
              mainModuleCode: currentModuleCode,
              moduleCode: currentModuleCode,
              tableName: currentPrimaryTableName,
              tableDesc: currentModuleName,
              moduleType: nextModuleType,
            }
          : item
      ));
    });
  }, [businessType, currentModuleCode, currentModuleName, currentPrimaryTableName]);

  useEffect(() => {
    const rowsByTab: Record<RestrictionConfigTabId, Array<{ id: string }>> = {
      guard: restrictionMeasures,
      number: restrictionNumberRules,
      structure: restrictionTopStructures,
      process: restrictionProcessDesigns,
    };

    setRestrictionSelection((prev) => {
      let changed = false;
      const next = { ...prev };
      (Object.keys(rowsByTab) as RestrictionConfigTabId[]).forEach((tabId) => {
        const rows = rowsByTab[tabId];
        if (!rows.some((row) => row.id === next[tabId])) {
          next[tabId] = rows[0]?.id ?? null;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [
    restrictionMeasures,
    restrictionNumberRules,
    restrictionProcessDesigns,
    restrictionTopStructures,
  ]);

  useEffect(() => {
    setInspectorPanelTab('common');
  }, [inspectorTarget.kind, inspectorTarget.id, activeTab]);

  useEffect(() => {
    if (businessType === 'table' && detailTabs[0] && activeTab !== detailTabs[0].id) {
      setActiveTab(detailTabs[0].id);
    }
  }, [businessType, detailTabs, activeTab]);

  useEffect(() => {
    const handleCopy = (event: ClipboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (selectedMainForDelete.length === 0) return;

      const copiedIds = Array.from(new Set(selectedMainForDelete.filter((id) => mainTableColumns.some((column) => column.id === id))));
      if (copiedIds.length === 0) return;

      const payload = {
        type: 'detail-board-columns',
        columnIds: copiedIds,
      };

      event.preventDefault();
      event.clipboardData?.setData('text/plain', `${DETAIL_BOARD_CLIPBOARD_PREFIX}${JSON.stringify(payload)}`);
      setDetailBoardClipboardIds(copiedIds);
      showToast(`已复制 ${copiedIds.length} 个主表字段`);
    };

    document.addEventListener('copy', handleCopy);
    return () => document.removeEventListener('copy', handleCopy);
  }, [mainTableColumns, selectedMainForDelete]);

  useEffect(() => {
    if (inspectorTarget.kind === 'left-col') {
      syncScopedDeleteSelection('left');
      syncScopedFilterDeleteSelection();
      return;
    }

    if (inspectorTarget.kind === 'main-col') {
      syncScopedDeleteSelection('main');
      syncScopedFilterDeleteSelection();
      return;
    }

    if (inspectorTarget.kind === 'detail-col') {
      syncScopedDeleteSelection('detail');
      syncScopedFilterDeleteSelection();
      return;
    }

    if (inspectorTarget.kind === 'main-filter') {
      syncScopedDeleteSelection();
      syncScopedFilterDeleteSelection('main');
      return;
    }

    if (inspectorTarget.kind === 'detail-filter') {
      syncScopedDeleteSelection();
      syncScopedFilterDeleteSelection('detail');
      return;
    }

    syncScopedDeleteSelection();
    syncScopedFilterDeleteSelection();
  }, [inspectorTarget.kind, inspectorTarget.id]);

  const clearColumnSelection = () => {
    syncScopedDeleteSelection();
    syncScopedFilterDeleteSelection();
    setBuilderSelectionContextMenu(null);
    setInspectorTarget({ kind: 'none' });
  };
  const activateSourceGridSelection = () => {
    setBuilderSelectionContextMenu(null);
    setInspectorTarget({ kind: 'source-grid' });
    setInspectorPanelTab('common');
  };

  const handleBusinessTypeChange = (nextType: BusinessType) => {
    setBusinessType(nextType);
    setMenuConfigDraft((prev) => ({
      ...prev,
      modType: nextType === 'table' ? '2' : '1',
      ...((() => {
        const currentDll = toDraftText(prev.dllFileName).trim();
        const previousDefaultDll = getDefaultMenuDllFileName(businessType);
        const nextDefaultDll = getDefaultMenuDllFileName(nextType);
        if (!currentDll || currentDll === previousDefaultDll) {
          return { dllFileName: nextDefaultDll };
        }
        return {};
      })()),
    }));
    resetModuleDesignerState();
    setMenuInfoTab('common');
    if (isConfigOpen) {
      updateCurrentDesignSearch({
        mode: nextType,
      }, { replace: true });
    }
  };

  const updateCurrentMenuDraft = (fieldKey: string, value: ModuleMenuValue) => {
    setMenuConfigDraft((prev) => ({ ...prev, [fieldKey]: value }));
  };

  const toggleMenuPinnedField = (fieldKey: string, shouldPin?: boolean) => {
    setMenuPinnedFields((prev) => {
      const defaultKeys = MENU_DEFAULT_COMMON_FIELD_KEYS[businessType] ?? MENU_DEFAULT_COMMON_FIELD_KEYS.document;
      const currentKeys = prev[businessType] ?? defaultKeys;
      const nextShouldPin = shouldPin ?? !currentKeys.includes(fieldKey);
      const nextKeys = nextShouldPin
        ? currentKeys.includes(fieldKey)
          ? currentKeys
          : [...currentKeys, fieldKey]
        : currentKeys.filter((key) => key !== fieldKey);

      return {
        ...prev,
        [businessType]: nextKeys,
      };
    });
  };

  const openModuleGuide = (
    nextType: BusinessType,
    options?: {
      completedSteps?: number[];
      initialStep?: number;
      moduleCode?: string | null;
    },
  ) => {
    const nextStep = options?.initialStep ?? 1;
    setIsConfigOpen(true);
    setConfigStep(nextStep);
    setCompletedSteps(options?.completedSteps ?? []);
    handleBusinessTypeChange(nextType);
    setIsFullscreenConfig(false);
    setSurveyStep(0);
    setSurveyAnswers([]);
    setIsGenerating(false);
    setSurveyPlan(null);
    setSurveyPlanModel('');
    setSurveyError(null);

    updateCurrentDesignSearch({
      config: true,
      mode: nextType,
      module: options?.moduleCode,
      step: nextStep,
    }, { replace: true });
  };

  const openNewModuleGuide = () => {
    setActiveWorkbench('modules');
    setActiveConfigMenu(null);
    setMenuInfoError(null);
    setIsMenuInfoLoading(false);
    setIsMenuInfoSaving(false);
    setMenuConfigDraft(buildMenuConfigDraftDefaults('document', {
      parentMenuId: toDraftText(activeFirstLevelMenu?.menuId),
      subsystemId: toDraftText(selectedSubsystem?.subsysId),
      useFlag: 'true',
    }));
    openModuleGuide('document', {
      moduleCode: null,
    });
  };

  const buildCreateModuleRelationPayload = (
    moduleKey: string,
    moduleTitle: string,
    moduleType: 'single-table' | 'bill',
  ) => {
    const parentMenuTitle = normalizeMenuTitle(activeFirstLevelMenu?.title);
    const parentMenuStruct = normalizeMenuCode(activeFirstLevelMenu?.menuStruct);
    const parentMenuCode = normalizeMenuCode(activeFirstLevelMenu?.code);

    return {
      moduletype: moduleType,
      nodetype: 'menu',
      title: moduleTitle,
      menucaption: moduleTitle,
      purviewid: moduleKey,
      subsysid: selectedSubsystem?.subsysId,
      subsyscode: normalizeMenuCode(selectedSubsystem?.subsysCode ?? selectedSubsystem?.code),
      parentmenuid: activeFirstLevelMenu?.menuId,
      menuparentid: activeFirstLevelMenu?.menuId,
      parentid: activeFirstLevelMenu?.id,
      parentmenucode: parentMenuCode,
      parentmenustruct: parentMenuStruct,
      parentmenutitle: parentMenuTitle,
      menuparenttitle: parentMenuTitle,
      menuparentcode: parentMenuCode,
      menuparentstruct: parentMenuStruct,
      menulevel: 2,
      childlevel: 2,
    };
  };

  const buildCreatedConfigMenu = (savedMenu: SubsystemMenuConfigDto, moduleType: 'single-table' | 'bill'): BackendMenuNode => {
    const currentSubsystem = subsystemMenus.find((node) => node.id === activeSubsystem);
    const currentFirstLevelMenu = currentSubsystem?.children.find((node) => node.id === activeFirstLevelMenuId);
    const nextMenuId = Number(getMenuConfigField(savedMenu, 'menuid', 'menuId', 'Menuid', 'MenuId'));
    const nextUseflag = Number(getMenuConfigField(savedMenu, 'useflag', 'useFlag', 'Useflag', 'UseFlag') ?? 1);
    const nextMenuStruct = normalizeMenuCode(toDraftText(getMenuConfigField(savedMenu, 'menustruct', 'menuStruct', 'Menustruct', 'MenuStruct')));
    const nextMenuTitle = normalizeMenuTitle(toDraftText(getMenuConfigField(savedMenu, 'menucaption', 'menuCaption', 'Menucaption', 'MenuCaption'))) || '新建模块';
    const nextModuleKey = normalizeMenuCode(toDraftText(getMenuConfigField(savedMenu, 'purviewid', 'purviewId', 'Purviewid', 'PurviewId')));
    const nextSubsystemId = Number(getMenuConfigField(savedMenu, 'subsysid', 'subsysId', 'subsystemId', 'Subsysid', 'SubsysId', 'SubsystemId') ?? currentSubsystem?.subsysId ?? 0);
    const nextParentMenuId = Number(getMenuConfigField(savedMenu, 'parentmenuid', 'parentMenuId', 'Parentmenuid', 'ParentMenuId') ?? currentFirstLevelMenu?.menuId ?? -1);

    return {
      id: Number.isFinite(nextMenuId) && nextMenuId > 0 ? `menu:${nextMenuId}` : `draft:${moduleType}:${nextModuleKey || Date.now()}`,
      parentId: currentFirstLevelMenu?.id,
      nodeType: 'menu',
      title: nextMenuTitle,
      code: nextMenuStruct,
      moduleType,
      useflag: nextUseflag,
      subsysId: nextSubsystemId,
      subsysCode: currentSubsystem?.subsysCode,
      menuId: Number.isFinite(nextMenuId) && nextMenuId > 0 ? nextMenuId : undefined,
      parentMenuId: Number.isFinite(nextParentMenuId) ? nextParentMenuId : undefined,
      menuStruct: nextMenuStruct,
      purviewId: nextModuleKey,
      enabled: isUseflagEnabled(nextUseflag, true),
      children: [],
    };
  };

  const loadMenuInfoForMenu = async (menu: BackendMenuNode) => {
    if (!menu.menuId) {
      const message = '当前菜单缺少菜单编号，无法加载菜单信息。';
      setMenuInfoError(message);
      showToast(message);
      return;
    }

    setIsMenuInfoLoading(true);
    setMenuInfoError(null);

    try {
      const data = await fetchSubsystemMenuConfig(menu.menuId);
      setMenuConfigDraft(mapSubsystemMenuConfigToDraft(data));
      setActiveConfigMenu((prev) => (prev && prev.id === menu.id ? buildCreatedConfigMenu(data, prev.moduleType === 'bill' ? 'bill' : 'single-table') : prev));
    } catch (error) {
      const message = getDashboardErrorMessage(error);
      setMenuInfoError(message);
      showToast(message);
    } finally {
      setIsMenuInfoLoading(false);
    }
  };

  const handleSecondLevelMenuConfig = (menu: BackendMenuNode) => {
    const moduleTypeProfile = getMenuModuleTypeProfile(menu.moduleType);
    const nextType = moduleTypeProfile?.businessType ?? 'document';
    if (!menu.menuId) {
      showToast('当前菜单缺少菜单编号，无法打开配置。');
      return;
    }

    setActiveWorkbench('modules');
    setActiveConfigMenu(menu);
    setMenuInfoError(null);
    setIsMenuInfoSaving(false);
    setMenuConfigDraft(buildMenuConfigDraftDefaults(nextType));
    openModuleGuide(nextType, {
      completedSteps: [1],
      initialStep: 2,
      moduleCode: normalizeMenuCode(menu.purviewId) || normalizeMenuCode(menu.code) || menu.id,
    });
    void loadMenuInfoForMenu(menu);
  };

  const handleMenuInfoSave = async () => {
    if (configStep !== 2) {
      markStepCompleted(configStep);
      if (configStep === 1) {
        showToast('模块类型已确认');
      }
      return;
    }

    const nextModuleType = activeConfigMenu?.moduleType ?? (businessType === 'table' ? 'bill' : 'single-table');
    const nextMenuTitle = normalizeMenuTitle(toDraftText(menuConfigDraft.menuCaption));
    const fallbackModuleKey = normalizeMenuCode(toDraftText(menuConfigDraft.moduleCode));
    const resolvedSubsystemId = toDraftText(menuConfigDraft.subsystemId || selectedSubsystem?.subsysId);
    const resolvedParentMenuId = toDraftText(menuConfigDraft.parentMenuId || activeFirstLevelMenu?.menuId);

    if (!nextMenuTitle) {
      const message = '请先填写菜单名称，再保存菜单信息。';
      setMenuInfoError(message);
      showToast(message);
      return;
    }

    if (!fallbackModuleKey) {
      const message = '请先填写模块标识，再保存菜单信息。';
      setMenuInfoError(message);
      showToast(message);
      return;
    }

    if (!resolvedSubsystemId) {
      const message = '当前缺少子系统编号，无法保存菜单信息。';
      setMenuInfoError(message);
      showToast(message);
      return;
    }

    if (!resolvedParentMenuId) {
      const message = '当前缺少父菜单编号，无法保存菜单信息。';
      setMenuInfoError(message);
      showToast(message);
      return;
    }

    setIsMenuInfoSaving(true);
    setMenuInfoError(null);

    try {
      const payload = mapMenuConfigDraftToPayload({
        ...menuConfigDraft,
        menuCaption: nextMenuTitle,
        moduleCode: fallbackModuleKey,
        parentMenuId: resolvedParentMenuId,
        subsystemId: resolvedSubsystemId,
      });
      const saved = await saveSubsystemMenuConfig({
        ...(activeConfigMenu?.menuId ? { menuid: activeConfigMenu.menuId } : buildCreateModuleRelationPayload(fallbackModuleKey, nextMenuTitle, nextModuleType)),
        ...payload,
      });
      const nextMenuNode = buildCreatedConfigMenu(saved, nextModuleType);

      setMenuConfigDraft(mapSubsystemMenuConfigToDraft(saved));
      setActiveConfigMenu(nextMenuNode);
      updateCurrentDesignSearch({
        config: true,
        module: normalizeMenuCode(nextMenuNode.purviewId) || normalizeMenuCode(nextMenuNode.code) || nextMenuNode.id,
        step: 2,
      }, { replace: true });
      setSecondLevelMenus((prev) => {
        const existingIndex = prev.findIndex((item) => item.menuId === nextMenuNode.menuId || item.id === nextMenuNode.id);
        if (existingIndex === -1) {
          return [...prev, nextMenuNode];
        }

        return prev.map((item, index) => (index === existingIndex ? nextMenuNode : item));
      });

      markStepCompleted(2);
      showToast(activeConfigMenu ? '菜单信息已保存' : '菜单信息已创建');
    } catch (error) {
      const message = getDashboardErrorMessage(error);
      setMenuInfoError(message);
      showToast(message);
    } finally {
      setIsMenuInfoSaving(false);
    }
  };

  const handleConfigPageSave = async () => {
    if (configStep === MODULE_SETTING_STEP && isSingleTableModuleBranch) {
      const saved = await saveSingleTableModuleSettingsPage();
      if (saved) {
        markStepCompleted(configStep);
      }
      return;
    }

    await handleMenuInfoSave();
  };

  const handleSecondLevelMenuDelete = async (menu: BackendMenuNode) => {
    const moduleTypeProfile = getMenuModuleTypeProfile(menu.moduleType);
    const moduleKey = normalizeMenuCode(menu.purviewId);
    const normalizedModuleType = String(menu.moduleType || '').trim().toLowerCase();
    const menuTitle = normalizeMenuTitle(menu.title) || '当前模块';

    if (!moduleTypeProfile) {
      showToast('当前菜单的模块类型无法识别，暂时不能删除。');
      return;
    }

    if (!moduleKey) {
      showToast('当前菜单缺少模块标识，无法删除。');
      return;
    }

    setDeletingMenuId(menu.id);

    try {
      if (normalizedModuleType === 'bill') {
        await deleteBillTypeConfig(moduleKey);
      } else if (normalizedModuleType === 'single-table') {
        await deleteSingleTableModuleConfig(moduleKey);
      } else {
        showToast('当前菜单的模块类型无法识别，暂时不能删除。');
        return;
      }

      setSecondLevelMenus((prev) => prev.filter((item) => item.id !== menu.id));

      if (activeConfigMenu?.id === menu.id) {
        setActiveConfigMenu(null);
        setMenuInfoError(null);
        closeConfigWizard();
      }

      setPendingDeleteMenu((prev) => (prev?.id === menu.id ? null : prev));
      showToast(`模块「${menuTitle}」已删除`);
    } catch (error) {
      showToast(getDashboardErrorMessage(error));
    } finally {
      setDeletingMenuId(null);
    }
  };

  const configWizardStepNodes = buildDashboardConfigWizardStepNodes({
    menuInfo: {
      activeConfigMenuId: activeConfigMenu?.id ?? null,
      activeConfigModuleKey,
      advancedFilledMenuFieldCount,
      businessType,
      commonFilledMenuFieldCount,
      commonFuncs,
      currentModuleCode,
      currentAdvancedMenuKeys,
      currentAdvancedMenuSections,
      currentMenuDraft,
      currentMenuFieldEntriesCount: currentMenuFieldEntries.length,
      currentMenuFieldMap,
      currentModuleGuideLabel: currentModuleGuide.label,
      currentModuleName,
      currentPinnedMenuKeys,
      currentPinnedMenuKeySet,
      currentCommonMenuSections,
      filledMenuFieldCount,
      funcOptions,
      isFuncPopoverOpen,
      isMenuInfoLoading,
      isMenuInfoSaving,
      menuConfigTableDesc: MENU_CONFIG_TABLE_DESC,
      menuConfigTableName: MENU_CONFIG_TABLE_NAME,
      menuInfoError,
      menuInfoTab,
      onBackToTypeSelect: () => setConfigStep(1),
      onCloseFuncPopover: () => setIsFuncPopoverOpen(false),
      onMenuInfoTabChange: setMenuInfoTab,
      onToggleFieldPinned: toggleMenuPinnedField,
      onToggleFunc: toggleFunc,
      onToggleFuncPopover: () => setIsFuncPopoverOpen((prev) => !prev),
      onUpdateMenuDraft: updateCurrentMenuDraft,
    },
    moduleIntro: {
      isFullscreenEditor,
      moduleIntroActions,
      moduleIntroBlockType,
      moduleIntroRefs,
      moduleIntroSelectedImageWidth,
    },
    processDesign: {
      processDesignNode: (
        <SimpleProcessDesignHostPanel
          currentModuleName={currentModuleName}
          currentUserName={currentUserName}
          emptyHint="先创建流程方案，再在这里完成审批流画布和节点属性配置。"
          mode="wizard"
          onCreate={createRestrictionProcessDesignEntry}
          onToast={showToast}
          onUpdate={updateSelectedRestrictionProcessDesign}
          processDesign={selectedRestrictionProcessDesign}
        />
      ),
    },
    preview: {
      previewTitle: '模块预览',
    },
    survey: {
      isGenerating,
      onGenerateSurveyPlan: (mode, dataSource) => {
        if (!dataSource) {
          setSurveyAnswers([mode]);
          setSurveyStep(1);
          return;
        }
        void generateSurveyPlan(mode, dataSource);
      },
      onResetSurveyFlow: resetSurveyFlow,
      surveyAnswers,
      surveyError,
      surveyPlan,
      surveyPlanModel,
      surveyStep,
    },
    typeSelection: {
      businessType,
      menuConfigTableName: MENU_CONFIG_TABLE_NAME,
      moduleGuideProfiles: MODULE_GUIDE_PROFILES,
      moduleTypeOptions: MODULE_TYPE_OPTIONS,
      onBusinessTypeChange: handleBusinessTypeChange,
    },
  });

  const handleConfigStepSelect = (stepId: number) => {
    if (stepId >= MODULE_SETTING_STEP && !isMenuInfoBuilt) {
      showToast('请先保存菜单信息，创建模块后再进入模块设置。');
      return;
    }
    if (stepId > MODULE_SETTING_STEP && isSingleTableModuleEnsuring) {
      showToast('单表模块正在初始化，请稍后再继续。');
      return;
    }
    setConfigStep(stepId);
    updateCurrentDesignSearch({
      step: stepId,
    }, { replace: true });
  };

  const handleLockedTypeStepSelect = () => {
    showToast('编辑模式已锁定类型');
  };

  const handleConfigPrevious = () => {
    if (activeConfigMenu !== null && configStep === 2) {
      return;
    }
    const nextStep = Math.max(1, configStep - 1);
    setConfigStep(nextStep);
    updateCurrentDesignSearch({
      step: nextStep,
    }, { replace: true });
  };

  const handleConfigNext = () => {
    if (configStep === 2 && activeConfigMenu === null) {
      showToast('请先保存菜单信息，创建模块后再进入下一步。');
      return;
    }

    const nextStep = configStep + 1;
    if (nextStep >= MODULE_SETTING_STEP && !isMenuInfoBuilt) {
      showToast('请先保存菜单信息，创建模块后再进入模块设置。');
      return;
    }

    const newCompleted = [...completedSteps];
    if (!newCompleted.includes(configStep)) {
      newCompleted.push(configStep);
      setCompletedSteps(newCompleted);
    }

    if (configStep < MAX_CONFIG_STEP) {
      setConfigStep(nextStep);
      updateCurrentDesignSearch({
        step: nextStep,
      }, { replace: true });
    } else {
      closeConfigWizard();
    }
  };

  const parseDetailBoardClipboardColumnIds = (text: string, availableColumns: any[]) => {
    const availableIds = new Set(availableColumns.map((column) => column.id));

    if (text.startsWith(DETAIL_BOARD_CLIPBOARD_PREFIX)) {
      try {
        const payload = JSON.parse(text.slice(DETAIL_BOARD_CLIPBOARD_PREFIX.length));
        if (Array.isArray(payload?.columnIds)) {
          return payload.columnIds.filter((columnId: string) => availableIds.has(columnId));
        }
      } catch {
        return [];
      }
    }

    const pastedTokens = text
      .split(/[\n,，;；|]/)
      .map((item) => item.trim())
      .filter(Boolean);

    if (pastedTokens.length === 0) return [];

    const matchedColumns = availableColumns.filter((column) => (
      pastedTokens.includes(column.id) || pastedTokens.includes(column.name)
    ));

    return matchedColumns.map((column) => column.id);
  };

  const activateColumnSelection = useCallback((scope: 'left' | 'main' | 'detail', columnId: string | null) => {
    setBuilderSelectionContextMenu(null);
    const nextKind = scope === 'left' ? 'left-col' : scope === 'main' ? 'main-col' : 'detail-col';
    setInspectorTarget((prev) => (prev.kind === nextKind && prev.id === columnId ? prev : {
      kind: nextKind,
      id: columnId,
    }));
  }, []);

  const activateConditionSelection = useCallback((scope: 'left' | 'main' | 'detail', conditionId: string | null) => {
    setBuilderSelectionContextMenu(null);
    if (!conditionId) {
      setInspectorTarget((prev) => (prev.kind === 'none' ? prev : { kind: 'none' }));
      return;
    }
    const nextKind = scope === 'left' ? 'left-filter' : scope === 'main' ? 'main-filter' : 'detail-filter';
    setInspectorTarget((prev) => (prev.kind === nextKind && prev.id === conditionId ? prev : {
      kind: nextKind,
      id: conditionId,
    }));
  }, []);

  const activateConditionPanelSelection = useCallback((scope: 'left' | 'main') => {
    setBuilderSelectionContextMenu(null);
    setSelectedArchiveNodeId(scope === 'left' ? 'archive-left-filter' : 'archive-filter');
    const nextKind = scope === 'left' ? 'left-filter-panel' : 'main-filter-panel';
    setInspectorTarget((prev) => (prev.kind === nextKind ? prev : { kind: nextKind }));
  }, []);

  const activateDetailConditionSelection = (conditionId: string | null) => {
    activateConditionSelection('detail', conditionId);
  };

  const activateTableConfigSelection = useCallback((
    scope: 'left' | 'main' | 'detail',
    targetId?: string | null,
  ) => {
    setBuilderSelectionContextMenu(null);
    const nextKind = scope === 'left' ? 'left-grid' : scope === 'main' ? 'main-grid' : 'detail-grid';
    setInspectorTarget((prev) => {
      const resolvedDetailId = scope === 'detail'
        ? (
            DETAIL_FILL_TYPE_OPTIONS.some((option) => option.value === targetId)
              ? targetId
              : (
                  DETAIL_FILL_TYPE_OPTIONS.some((option) => option.value === prev.id)
                    ? prev.id
                    : normalizeDetailFillTypeValue(detailTabConfigs[activeTab]?.detailType)
                )
          )
        : undefined;
      return prev.kind === nextKind && prev.id === resolvedDetailId
        ? prev
        : {
            kind: nextKind,
            ...(resolvedDetailId ? { id: resolvedDetailId } : {}),
          };
    });
  }, [activeTab, detailTabConfigs]);

  const activateContextMenuSelection = (scope: 'main' | 'detail') => {
    setBuilderSelectionContextMenu(null);
    const nextKind = scope === 'main' ? 'main-context' : 'detail-context';
    setInspectorTarget((prev) => (prev.kind === nextKind ? prev : { kind: nextKind }));
  };

  const openDetailBoardPreview = useCallback((rowId: number, preferredSortColumnId?: string | null) => {
    setDetailBoardSortColumnId(preferredSortColumnId ?? selectedMainColId ?? mainTableColumns[0]?.id ?? null);
    setDetailBoardOpenedRowId(rowId);
    setIsDetailBoardOpen(true);
  }, [mainTableColumns, selectedMainColId]);

  const updateMainDetailBoard = (patch: Record<string, any> | ((current: any) => any)) => {
    setMainTableConfig((prev) => {
      const current = normalizeDetailBoardConfig(prev.detailBoard, mainTableColumns);
      return {
        ...prev,
        detailBoard: typeof patch === 'function'
          ? patch(current)
          : {
              ...current,
              ...patch,
        },
      };
    });
  };

  const openArchiveLayoutEditor = () => {
    setIsArchiveLayoutEditorOpen(true);
  };

  const openDocumentConditionWorkbench = useCallback((scope: 'left' | 'main' = 'main') => {
    setDocumentConditionScope((prev) => (prev === scope ? prev : scope));
    setIsDocumentConditionWorkbenchOpen(true);
  }, []);

  const startDetailBoardFieldResize = (
    event: React.MouseEvent<HTMLButtonElement>,
    groupId: string,
    columnId: string,
    label: string,
    minWidthOverride?: number,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    const startX = event.pageX;
    const previewItem = event.currentTarget.closest('[data-detail-field-item="true"]') as HTMLElement | null;
    const startWidth = previewItem?.getBoundingClientRect().width ?? DETAIL_BOARD_FIELD_DEFAULT_WIDTH;
    const minWidth = Math.max(DETAIL_BOARD_FIELD_MIN_WIDTH, Number(minWidthOverride) || DETAIL_BOARD_FIELD_MIN_WIDTH);
    const maxWidth = DETAIL_BOARD_FIELD_MAX_WIDTH;
    const currentDetailBoardConfig = normalizedMainDetailBoardConfig;
    const currentGroup = currentDetailBoardConfig.groups.find((group: any) => group.id === groupId);
    const siblingWidths = (currentGroup?.columnIds ?? [])
      .filter((id: string) => id !== columnId)
      .map((id: string) => {
        const siblingColumn = mainTableColumns.find((column: any) => column.id === id);
        return getLayoutFieldWorkbenchMeta(siblingColumn, currentGroup?.columnWidths?.[id]).width;
      });
    const snapCandidates = buildResizeSnapCandidates(siblingWidths, {
      minWidth,
      maxWidth,
      baseWidth: DETAIL_BOARD_FIELD_DEFAULT_WIDTH,
    });
    let latestWidth = startWidth;
    let previewFrame: number | null = null;

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    setActiveDetailBoardResize({
      groupId,
      columnId,
      label,
      width: startWidth,
      minWidth,
      maxWidth,
      snapCandidates,
    });

    const commitWidth = (nextWidth: number) => {
      updateMainDetailBoard((current: any) => ({
        ...current,
        groups: current.groups.map((group: any) => (
          group.id === groupId
            ? {
                ...group,
                columnWidths: {
                  ...group.columnWidths,
                  [columnId]: nextWidth,
                },
              }
            : group
        )),
      }));
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const { width } = resolveResizeWidthWithSnap(startWidth + (moveEvent.pageX - startX), {
        minWidth,
        maxWidth,
        snapCandidates,
      });
      latestWidth = width;

      if (previewFrame !== null) return;
      previewFrame = window.requestAnimationFrame(() => {
        previewFrame = null;
        setActiveDetailBoardResize((prev) => (
          prev?.groupId === groupId && prev.columnId === columnId
            ? { ...prev, width: latestWidth }
            : prev
        ));
      });
    };

    const handleMouseUp = () => {
      if (previewFrame !== null) {
        window.cancelAnimationFrame(previewFrame);
        previewFrame = null;
      }
      commitWidth(latestWidth);
      setActiveDetailBoardResize((prev) => (
        prev?.groupId === groupId && prev.columnId === columnId ? null : prev
      ));
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const resetDetailBoardFieldWidth = (
    event: React.MouseEvent<HTMLButtonElement>,
    groupId: string,
    columnId: string,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    updateMainDetailBoard((current: any) => ({
      ...current,
      groups: current.groups.map((group: any) => (
        group.id === groupId
          ? {
              ...group,
              columnWidths: Object.fromEntries(
                Object.entries(group.columnWidths ?? {}).filter(([key]) => key !== columnId),
              ),
            }
          : group
      )),
    }));
  };

  const startDetailBoardFieldHeightResize = (
    event: React.MouseEvent<HTMLButtonElement>,
    groupId: string,
    columnId: string,
    label: string,
    minHeightOverride?: number,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    const startY = event.pageY;
    const previewItem = event.currentTarget.closest('[data-detail-field-item="true"]') as HTMLElement | null;
    const startHeight = previewItem?.getBoundingClientRect().height ?? DETAIL_BOARD_TALL_FIELD_DEFAULT_HEIGHT;
    const minHeight = Math.max(DETAIL_BOARD_TALL_FIELD_MIN_HEIGHT, Number(minHeightOverride) || DETAIL_BOARD_TALL_FIELD_MIN_HEIGHT);
    const maxHeight = DETAIL_BOARD_TALL_FIELD_MAX_HEIGHT;
    let latestHeight = startHeight;
    let previewFrame: number | null = null;

    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
    setActiveDetailBoardHeightResize({
      groupId,
      columnId,
      label,
      height: startHeight,
      minHeight,
      maxHeight,
    });

    const commitHeight = (nextHeight: number) => {
      updateMainDetailBoard((current: any) => ({
        ...current,
        groups: current.groups.map((group: any) => (
          group.id === groupId
            ? {
                ...group,
                columnHeights: {
                  ...(group.columnHeights ?? {}),
                  [columnId]: nextHeight,
                },
              }
            : group
        )),
      }));
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      latestHeight = Math.round(Math.max(minHeight, Math.min(maxHeight, startHeight + (moveEvent.pageY - startY))));
      if (previewFrame !== null) return;
      previewFrame = window.requestAnimationFrame(() => {
        previewFrame = null;
        setActiveDetailBoardHeightResize((prev) => (
          prev?.groupId === groupId && prev.columnId === columnId
            ? { ...prev, height: latestHeight }
            : prev
        ));
      });
    };

    const handleMouseUp = () => {
      if (previewFrame !== null) {
        window.cancelAnimationFrame(previewFrame);
        previewFrame = null;
      }
      commitHeight(latestHeight);
      setActiveDetailBoardHeightResize((prev) => (
        prev?.groupId === groupId && prev.columnId === columnId ? null : prev
      ));
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const resetDetailBoardFieldHeight = (
    event: React.MouseEvent<HTMLButtonElement>,
    groupId: string,
    columnId: string,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    updateMainDetailBoard((current: any) => ({
      ...current,
      groups: current.groups.map((group: any) => (
        group.id === groupId
          ? {
              ...group,
              columnHeights: Object.fromEntries(
                Object.entries(group.columnHeights ?? {}).filter(([key]) => key !== columnId),
              ),
            }
          : group
      )),
    }));
  };

  const deleteSelectedColumns = (scope: 'left' | 'main' | 'detail', ids: string[]) => {
    const targetIds = Array.from(new Set(ids.filter(Boolean)));
    if (targetIds.length === 0) return;

    if (scope === 'left') {
      setLeftTableColumns((prev) => prev.filter((column) => !targetIds.includes(column.id)));
      setSelectedLeftForDelete([]);
    }

    if (scope === 'main') {
      setMainTableColumns((prev) => prev.filter((column) => !targetIds.includes(column.id)));
      if (businessType === 'table') {
        setBillMetaFields((prev) => prev.filter((column) => !targetIds.includes(column.id)));
      }
      setSelectedMainForDelete([]);
    }

    if (scope === 'detail') {
      if (businessType === 'table') {
        setBillDetailColumns((prev) => prev.filter((column) => !targetIds.includes(column.id)));
      } else {
        setDetailTableColumns((prev) => ({
          ...prev,
          [activeTab]: (prev[activeTab] || []).filter((column) => !targetIds.includes(column.id)),
        }));
      }
      setSelectedDetailForDelete([]);
    }

    setBuilderSelectionContextMenu(null);
    setInspectorTarget((prev) => {
      if (scope === 'left' && prev.kind === 'left-col' && prev.id && targetIds.includes(prev.id)) {
        return { kind: 'none' };
      }
      if (scope === 'main' && prev.kind === 'main-col' && prev.id && targetIds.includes(prev.id)) {
        return { kind: 'none' };
      }
      if (scope === 'detail' && prev.kind === 'detail-col' && prev.id && targetIds.includes(prev.id)) {
        return { kind: 'none' };
      }
      return prev;
    });
  };

  const openMainHiddenColumnsModal = () => {
    if (mainTableHiddenColumns.length === 0) return;
    setSelectedMainHiddenColumnIds([]);
    setMainHiddenColumnsSearchText('');
    setIsMainHiddenColumnsModalOpen(true);
  };

  const closeMainHiddenColumnsModal = () => {
    setMainHiddenColumnsSearchText('');
    setIsMainHiddenColumnsModalOpen(false);
  };

  const toggleMainHiddenColumnSelection = (columnId: string) => {
    setSelectedMainHiddenColumnIds((prev) => (
      prev.includes(columnId)
        ? prev.filter((item) => item !== columnId)
        : [...prev, columnId]
    ));
  };

  const restoreMainHiddenColumns = (columnIds?: string[]) => {
    const targetIds = new Set(
      (columnIds?.length ? columnIds : selectedMainHiddenColumnIds).filter(Boolean),
    );
    if (targetIds.size === 0) {
      setIsMainHiddenColumnsModalOpen(false);
      return;
    }

    setMainTableColumns((prev) => prev.map((column) => {
      if (!targetIds.has(column.id)) return column;
      const normalizedColumn = normalizeColumn(column);
      const restoredWidth = Number(normalizedColumn.width) > 0
        ? Number(normalizedColumn.width)
        : BILL_FORM_DEFAULT_WIDTH;

      return {
        ...normalizedColumn,
        visible: true,
        width: restoredWidth,
      };
    }));
    setSelectedMainHiddenColumnIds([]);
    setMainHiddenColumnsSearchText('');
    setIsMainHiddenColumnsModalOpen(false);
  };

  const deleteSelectedConditions = useCallback((scope: 'left' | 'main' | 'detail', ids: string[]) => {
    const targetIds = Array.from(new Set(ids.filter(Boolean)));
    if (targetIds.length === 0) return;

    if (scope === 'left') {
      setLeftFilterFields((prev) => prev.filter((field) => !targetIds.includes(field.id)));
      setSelectedLeftFiltersForDelete([]);
    }

    if (scope === 'main') {
      setMainFilterFields((prev) => prev.filter((field) => !targetIds.includes(field.id)));
      setSelectedMainFiltersForDelete([]);
    }

    if (scope === 'detail') {
      setDetailFilterFields((prev) => ({
        ...prev,
        [activeTab]: (prev[activeTab] || []).filter((field) => !targetIds.includes(field.id)),
      }));
      setSelectedDetailFiltersForDelete([]);
    }

    setBuilderSelectionContextMenu(null);
    setInspectorTarget((prev) => {
      if (scope === 'left' && prev.kind === 'left-filter' && prev.id && targetIds.includes(prev.id)) {
        return { kind: 'none' };
      }
      if (scope === 'main' && prev.kind === 'main-filter' && prev.id && targetIds.includes(prev.id)) {
        return { kind: 'none' };
      }
      if (scope === 'detail' && prev.kind === 'detail-filter' && prev.id && targetIds.includes(prev.id)) {
        return { kind: 'none' };
      }
      return prev;
    });
  }, [activeTab]);

  const addTab = () => {
    const newId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? `tab_${crypto.randomUUID()}`
      : `tab_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const nextTabName = `明细 ${detailTabs.length + 1}`;

    setDetailTabs((prev) => [...prev, { id: newId, name: nextTabName }]);
    setDetailFilterFields((prev) => ({
      ...prev,
      [newId]: prev[newId] ?? [],
    }));
    setDetailTabConfigs((prev) => ({
      ...prev,
      [newId]: prev[newId] ?? buildDetailTabConfig({ tabKey: newId, detailName: nextTabName }),
    }));
    setDetailTableColumns((prev) => ({
      ...prev,
      [newId]: prev[newId] ?? [],
    }));
    setDetailTableConfigs((prev) => ({
      ...prev,
      [newId]: prev[newId] ?? buildGridConfig('', '', {
        sourceCondition: 'parent_id = ${id}',
        contextMenuEnabled: false,
        contextMenuItems: [],
        colorRulesEnabled: false,
        colorRules: [],
      }),
    }));
    setSelectedDetailForDelete([]);
    setSelectedDetailFiltersForDelete([]);
    setActiveTab(newId);
    setInspectorTarget({ kind: 'detail-tab', id: newId });
    setInspectorPanelTab('common');
    setSelectedArchiveNodeId(`detail-${newId}`);
  };

  const removeDetailTab = (id: string) => {
    const newTabs = detailTabs.filter(t => t.id !== id);
    const fallbackTabId = newTabs[0]?.id ?? '';
    setDetailTabs(newTabs);
    setDetailFilterFields((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setDetailTabConfigs((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setDetailTableColumns(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setDetailTableConfigs((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (activeTab === id) {
      setActiveTab(fallbackTabId);
    }
    if (activeTab === id || selectedDetailTabId === id) {
      setInspectorTarget(
        fallbackTabId
          ? { kind: 'detail-tab', id: fallbackTabId }
          : { kind: 'main-grid' },
      );
      setSelectedArchiveNodeId(fallbackTabId ? `detail-${fallbackTabId}` : 'archive-main');
    }
  };

  const deleteTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeDetailTab(id);
  };

  const handlePasteColumns = (
    e: React.ClipboardEvent,
    setCols: React.Dispatch<React.SetStateAction<any[]>>,
    options?: {
      createColumn?: (name: string, index: number, currentLength: number) => any;
    },
  ) => {
    const text = e.clipboardData.getData('text');
    if (!text) return;
    const newColNames = text.split(/[\t\n]/).map(s => s.trim()).filter(Boolean);
    if (newColNames.length > 0) {
      e.preventDefault();
      setCols(prev => {
        const newCols = newColNames.map((name, i) => (
          options?.createColumn
            ? options.createColumn(name, i, prev.length)
            : buildColumn('col', prev.length + i + 1, { name })
        ));
        return [...prev, ...newCols];
      });
    }
  };

  const updateColType = (id: string, type: string, setCols: React.Dispatch<React.SetStateAction<any[]>>) => {
    setCols(prev => prev.map(c => c.id === id ? { ...c, type } : c));
  };

  const estimateColumnWidth = (
    rawColumn: any,
    minWidth = TABLE_COLUMN_MIN_WIDTH,
    maxWidth = TABLE_COLUMN_AUTO_FIT_MAX_WIDTH,
  ) => {
    const column = normalizeColumn(rawColumn);
    const contentLength = Math.max(
      column.name?.length ?? 0,
      column.placeholder?.length ?? 0,
      column.defaultValue?.length ?? 0,
      column.type?.length ?? 0,
    );
    const baseWidth =
      column.type === '日期框'
        ? 188
        : column.type === '数字'
          ? 144
          : column.type === '搜索框'
            ? 228
            : column.type === '下拉框'
              ? 176
              : 124;

    return Math.max(minWidth, Math.min(maxWidth, baseWidth + contentLength * 15));
  };

  const autoFitColumnWidth = useCallback((
    event: React.MouseEvent,
    colId: string,
    cols: any[],
    setCols: React.Dispatch<React.SetStateAction<any[]>>,
    minWidth = TABLE_COLUMN_MIN_WIDTH,
    maxWidth = TABLE_COLUMN_AUTO_FIT_MAX_WIDTH,
    mode: WorkbenchResizeMode = 'column',
  ) => {
    event.preventDefault();
    event.stopPropagation();
    const targetCol = cols.find((item) => item.id === colId);
    if (!targetCol) return;

    const nextWidth = estimateColumnWidth(targetCol, minWidth, maxWidth);
    setActiveResize({ id: colId, label: targetCol.name || '未命名字段', width: nextWidth, mode });
    setCols((prev) => updateItemWidthById(prev, colId, nextWidth));
    window.setTimeout(() => setActiveResize((prev) => prev?.id === colId ? null : prev), 720);
  }, [setActiveResize]);

  const startResize = useCallback((
    e: React.MouseEvent,
    colId: string,
    cols: any[],
    setCols: React.Dispatch<React.SetStateAction<any[]>>,
    minWidth = TABLE_COLUMN_MIN_WIDTH,
    maxWidth = TABLE_COLUMN_RESIZE_MAX_WIDTH,
    mode: WorkbenchResizeMode = 'column',
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.pageX;
    const targetCol = cols.find((item) => item.id === colId);
    const startWidth = targetCol?.width || 100;
    const resizeLabel = targetCol?.name || '未命名字段';
    let latestWidth = startWidth;

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    setActiveResize({ id: colId, label: resizeLabel, width: startWidth, mode });

    const handleMouseMove = (moveEvent: MouseEvent) => {
      latestWidth = Math.max(minWidth, Math.min(maxWidth, startWidth + (moveEvent.pageX - startX)));
      scheduleResizePreview({ id: colId, label: resizeLabel, width: latestWidth, mode });
    };

    const handleMouseUp = () => {
      clearResizePreview({ id: colId, mode });
      setCols((prev) => updateItemWidthById(prev, colId, latestWidth));
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [clearResizePreview, scheduleResizePreview, setActiveResize]);

  const renderFieldPreview = useWorkbenchFieldPreviewRenderer(normalizeColumn);
  const conditionWorkbenchResizeApi = useMemo(() => ({
    activeResize,
    autoFitColumnWidth,
    clearResizePreview,
    scheduleResizePreview,
    setActiveResize,
  }), [
    activeResize,
    autoFitColumnWidth,
    clearResizePreview,
    scheduleResizePreview,
  ]);

  const getLayoutFieldWorkbenchMeta = useLayoutFieldWorkbenchMeta(normalizeColumn);

  const getDetailBoardFieldLiveWidth = (
    groupId: string,
    columnId: string,
    fallbackWidth: number,
  ) => (
    activeDetailBoardResize?.groupId === groupId && activeDetailBoardResize.columnId === columnId
      ? activeDetailBoardResize.width
      : fallbackWidth
  );

  const getDetailBoardFieldLiveHeight = (
    groupId: string,
    columnId: string,
    fallbackHeight: number,
  ) => (
    activeDetailBoardHeightResize?.groupId === groupId && activeDetailBoardHeightResize.columnId === columnId
      ? activeDetailBoardHeightResize.height
      : fallbackHeight
  );

  const {
    archiveMainTableBuilderNode,
    documentTreeTableBuilderNode,
    builderLeftTableBuilderNode,
    builderMainTableBuilderNode,
    documentDetailTableBuilderNode,
    builderDetailTableBuilderNode,
    billDetailTableBuilderNode,
  } = useDashboardTableBuilderRuntime({
    runtime: {
      activeResize,
      workspaceTheme,
      workspaceThemeVars,
      isCompactModuleSetting,
      businessType,
      activateColumnSelection,
      setBuilderSelectionContextMenu,
      startResize,
      autoFitColumnWidth,
    },
    helpers: {
      buildColumn,
      getDetailBoardTheme,
      isRenderableMainColumn,
      isTreeRelationFieldColumn,
      normalizeColumn,
      normalizeDetailBoardConfig,
    },
    metrics: {
      collapsedRenderWidth: TABLE_COLUMN_COLLAPSED_RENDER_WIDTH,
      minWidth: TABLE_COLUMN_MIN_WIDTH,
      resizeMaxWidth: TABLE_COLUMN_RESIZE_MAX_WIDTH,
      resizeMinWidth: TABLE_COLUMN_RESIZE_MIN_WIDTH,
    },
    bridge: {
      options: {
        activeTab,
        activateTableConfigSelection,
        detailTableColumns,
        detailTableConfigs,
        inspectorTargetId: inspectorTarget.id,
        mainDetailBoardEnabled,
        mainDetailBoardGroupsLength: mainDetailBoardGroups.length,
        mainRenderableColumns,
        mainTableConfig,
        normalizedMainDetailBoardConfig,
        openDetailBoardPreview,
        selectedTableConfigScope,
        setDetailTableColumns,
        setSelectedArchiveNodeId,
      },
      nodes: {
        archiveMain: {
          cols: mainTableColumns,
          setCols: setMainTableColumns,
          selectedId: selectedMainColId,
          selectedForDelete: selectedMainForDelete,
          setSelectedForDelete: setSelectedMainForDelete,
        },
        documentTree: {
          cols: leftTableColumns,
          setCols: setLeftTableColumns,
          selectedId: selectedLeftColId,
          selectedForDelete: selectedLeftForDelete,
          setSelectedForDelete: setSelectedLeftForDelete,
        },
        builderLeft: {
          cols: leftTableColumns,
          setCols: setLeftTableColumns,
          selectedId: selectedLeftColId,
          selectedForDelete: selectedLeftForDelete,
          setSelectedForDelete: setSelectedLeftForDelete,
        },
        builderMain: {
          cols: mainTableColumns,
          setCols: setMainTableColumns,
          selectedId: selectedMainColId,
          selectedForDelete: selectedMainForDelete,
          setSelectedForDelete: setSelectedMainForDelete,
        },
        documentDetail: {
          selectedId: selectedDetailColId,
          selectedForDelete: selectedDetailForDelete,
          setSelectedForDelete: setSelectedDetailForDelete,
        },
        builderDetail: {
          selectedId: selectedDetailColId,
          selectedForDelete: selectedDetailForDelete,
          setSelectedForDelete: setSelectedDetailForDelete,
        },
        billDetail: {
          cols: billDetailColumns,
          setCols: setBillDetailColumns,
          selectedId: selectedDetailColId,
          selectedForDelete: selectedDetailForDelete,
          setSelectedForDelete: setSelectedDetailForDelete,
        },
      },
    },
  });

  const configSteps = [
    { id: 1, title: '类型选择', desc: '先确定本次创建的是单表还是单据' },
    { id: 2, title: '菜单信息', desc: '基础路由、菜单与功能树映射' },
    { id: 3, title: '模块介绍', desc: '功能概述与使用说明' },
    { id: 4, title: '调研过程', desc: 'AI 深度业务需求分析' },
    { id: MODULE_SETTING_STEP, title: '模块设置', desc: '字段、表单与流程编排' },
    { id: RESTRICTION_STEP, title: '限制措施', desc: '规则、流程与限制配置' },
    { id: PROCESS_DESIGN_STEP, title: '流程设计', desc: '独立流程设计器与审批向导配置' },
    { id: MODULE_PREVIEW_STEP, title: '模块预览', desc: '实时交互效果演示' }
  ];
  const selectedSubsystem = useMemo(
    () => subsystemMenus.find((item) => item.id === activeSubsystem) ?? null,
    [activeSubsystem, subsystemMenus],
  );
  const firstLevelMenus = useMemo(
    () => getEnabledMenuNodes(selectedSubsystem?.children),
    [selectedSubsystem],
  );
  const activeFirstLevelMenu = useMemo(
    () => firstLevelMenus.find((item) => item.id === activeFirstLevelMenuId) ?? null,
    [activeFirstLevelMenuId, firstLevelMenus],
  );

  const loadSubsystemMenus = async () => {
    setIsLoadingSubsystemMenus(true);
    setMenuLoadError(null);

    try {
      const data = getEnabledMenuNodes(await fetchSubsystemMenuTree());
      const nextSelection = resolveDesignMenuSelection(data, routeContext);

      setSubsystemMenus(data);
      setExpandedSubsystemId(nextSelection.expandedSubsystemId);
      setActiveSubsystem(nextSelection.selectedSubsystem?.id ?? '');
      setActiveFirstLevelMenuId(nextSelection.selectedMenu?.id ?? '');
      setSecondLevelMenus([]);
    } catch (error) {
      setMenuLoadError(getDashboardErrorMessage(error));
      setSubsystemMenus([]);
      setExpandedSubsystemId(null);
      setActiveSubsystem('');
      setActiveFirstLevelMenuId('');
      setSecondLevelMenus([]);
    } finally {
      setIsLoadingSubsystemMenus(false);
    }
  };

  useEffect(() => {
    void loadSubsystemMenus();
  }, [routeContext]);

  useEffect(() => {
    if (subsystemMenus.length === 0) {
      return;
    }

    const nextSelection = resolveDesignMenuSelection(subsystemMenus, routeContext);

    setExpandedSubsystemId(nextSelection.expandedSubsystemId);
    setActiveSubsystem(nextSelection.selectedSubsystem?.id ?? '');
    setActiveFirstLevelMenuId(nextSelection.selectedMenu?.id ?? '');
  }, [routeContext, subsystemMenus]);

  useEffect(() => {
    let isActive = true;

    const loadSecondLevelMenus = async () => {
      if (!selectedSubsystem || !activeFirstLevelMenu?.menuId) {
        setSecondLevelMenus([]);
        setIsLoadingSecondLevelMenus(false);
        return;
      }

      setIsLoadingSecondLevelMenus(true);

      try {
        const data = getEnabledMenuNodes(
          await fetchSubsystemSecondLevelMenus({
            menuId: activeFirstLevelMenu.menuId,
            subsysId: selectedSubsystem.subsysId,
          }),
        );

        if (!isActive) {
          return;
        }

        setSecondLevelMenus(data);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setMenuLoadError(getDashboardErrorMessage(error));
        setSecondLevelMenus([]);
      } finally {
        if (isActive) {
          setIsLoadingSecondLevelMenus(false);
        }
      }
    };

    void loadSecondLevelMenus();

    return () => {
      isActive = false;
    };
  }, [activeFirstLevelMenu?.menuId, selectedSubsystem]);

  useEffect(() => {
    if (!initialConfigOpen || !initialRouteModuleCode || activeConfigMenu || secondLevelMenus.length === 0) {
      return;
    }

    const nextMenu = resolveDesignModuleSelection(secondLevelMenus, initialRouteModuleCode);
    if (!nextMenu?.menuId) {
      return;
    }

    const moduleTypeProfile = getMenuModuleTypeProfile(nextMenu.moduleType);
    const nextType = moduleTypeProfile?.businessType ?? initialBusinessType;

    setActiveConfigMenu(nextMenu);
    setMenuInfoError(null);
    setIsMenuInfoSaving(false);
    setMenuConfigDraft(buildMenuConfigDraftDefaults(nextType));
    openModuleGuide(nextType, {
      completedSteps: [1],
      initialStep: Math.max(2, initialConfigStep),
      moduleCode: normalizeMenuCode(nextMenu.purviewId) || normalizeMenuCode(nextMenu.code) || nextMenu.id,
    });
    void loadMenuInfoForMenu(nextMenu);
  }, [
    activeConfigMenu,
    initialBusinessType,
    initialConfigOpen,
    initialConfigStep,
    initialRouteModuleCode,
    secondLevelMenus,
  ]);

  const toggleSubsystemExpansion = (subsystemId: string) => {
    setExpandedSubsystemId((prev) => (prev === subsystemId ? null : subsystemId));
  };

  const handleFirstLevelMenuClick = (subsystemId: string, menu: BackendMenuNode) => {
    const clickedSubsystem = subsystemMenus.find((item) => item.id === subsystemId) ?? null;

    setActiveWorkbench('modules');
    setActiveConfigMenu(null);
    setActiveSubsystem(subsystemId);
    setActiveFirstLevelMenuId(menu.id);
    setIsConfigOpen(false);
    setMenuInfoError(null);
    setSecondLevelMenus([]);
    setMenuLoadError(null);
    setExpandedSubsystemId(subsystemId);
    navigateToDesignPath(buildDesignWorkspacePath({
      menuCode: menu.code,
      subsystemCode: clickedSubsystem?.subsysCode ?? clickedSubsystem?.code,
    }));
  };

  const activeMenu = activeFirstLevelMenu?.id ?? selectedSubsystem?.id ?? 'workspace';
  const activeMenuName =
    normalizeMenuTitle(activeFirstLevelMenu?.title) ||
    normalizeMenuTitle(selectedSubsystem?.title) ||
    '模块工作台';
  const activeMenuCode =
    normalizeMenuCode(activeFirstLevelMenu?.code) ||
    normalizeMenuCode(selectedSubsystem?.subsysCode ?? selectedSubsystem?.code) ||
    'MODULE';
  const activeMenuCodePrefix = activeMenuCode.replace(/\s+/g, '').toUpperCase().slice(0, 2) || 'MO';
  const activeSubsystemName = normalizeMenuTitle(selectedSubsystem?.title) || '未选择子系统';
  const activeFirstLevelMenuName = normalizeMenuTitle(activeFirstLevelMenu?.title);
  const isResearchRecordActive = activeWorkbench === 'research-record';
  const researchRecordStorageKey = [
    normalizeMenuCode(selectedSubsystem?.subsysCode ?? selectedSubsystem?.code) || activeSubsystem || 'subsystem',
    normalizeMenuCode(activeFirstLevelMenu?.code) || activeFirstLevelMenuId || 'workspace',
  ].join(':');
  const researchCaptureModules = useMemo<ResearchWorkbenchModuleOption[]>(() => (
    secondLevelMenus.flatMap((menu) => {
      const profile = getMenuModuleTypeProfile(menu.moduleType);
      if (!profile || profile.businessType !== 'document') {
        return [];
      }

      return [{
        id: menu.id,
        menuId: menu.menuId ?? null,
        moduleCode: normalizeMenuCode(menu.purviewId) || normalizeMenuCode(menu.code) || menu.id,
        moduleName: normalizeMenuTitle(menu.title) || '未命名模块',
        moduleType: 'single-table',
      }];
    })
  ), [secondLevelMenus]);
  const billDocumentWorkbenchNode = buildDashboardBillDocumentWorkbenchBridge({
    canvas: {
      activeMenuName,
      billDetailTableBuilderNode,
      billDocumentScale,
      billDocumentTone,
      isConfigFullscreenActive,
      workspaceThemeTableSurfaceClass: workspaceThemeStyles.tableSurface,
      workspaceThemeVars,
    },
    fields: {
      activeBillResizeId,
      billFieldLivePreview,
      billHeaderWorkbenchDrag,
      billHeaderWorkbenchDropTarget,
      billMetaFields,
      mainTableColumns,
      selectedMainColId,
      selectedMainForDelete,
      selectedTableConfigScope,
    },
    refs: {
      billDocumentPaperRef,
      billDocumentViewportRef,
      billHeaderCanvasRef,
    },
    selectionActions: {
      activateColumnSelection,
      activateSourceGridSelection,
      activateTableConfigSelection,
      deleteSelectedColumns,
      setBuilderSelectionContextMenu,
      setSelectedMainForDelete,
    },
    headerActions: {
      autoArrangeBillHeaderFields,
      buildColumn,
      commitBillHeaderFields,
      moveBillHeaderField,
      setBillHeaderWorkbenchDrag,
      setBillHeaderWorkbenchDropTarget,
      startBillFieldResize,
    },
    feedbackActions: {
      setBillDocumentTone,
      showToast,
    },
    helpers: {
      clampValue,
      createRuntimeClassName,
      createRuntimeDeclarationBlock,
      getBillHeaderDragItemId,
      getBillHeaderDropItemId,
      getBillHeaderRowCount,
      getBillHeaderRowDropId,
      getCompactWorkbenchItemClass,
      getOrderedBillHeaderFields,
      joinRuntimeDeclarationBlocks,
      normalizeColumn,
      renderFieldPreview,
    },
    dnd: {
      designerWorkbenchDraggableItem: DesignerWorkbenchDraggableItem,
      designerWorkbenchDropLane: DesignerWorkbenchDropLane,
      designerWorkbenchRowActiveClass,
      designerWorkbenchRowEmptyClass,
      designerWorkbenchSensors,
    },
    constants: {
      billFormDefaultFontSize: BILL_FORM_DEFAULT_FONT_SIZE,
      billFormDefaultWidth: BILL_FORM_DEFAULT_WIDTH,
      billFormMaxWidth: BILL_FORM_MAX_WIDTH,
      billFormMinWidth: BILL_FORM_MIN_WIDTH,
      billHeaderWorkbenchMinRows: BILL_HEADER_WORKBENCH_MIN_ROWS,
      conditionPanelRowGap: CONDITION_PANEL_ROW_GAP,
      conditionPanelRowHeight: CONDITION_PANEL_ROW_HEIGHT,
    },
  });
  const secondLevelMenuCount = secondLevelMenus.length;
  const secondLevelMenuCardStyles = [
    {
      icon: 'account_balance',
      iconClass:
        'bg-primary/5 text-primary border-primary/10 group-hover:bg-primary group-hover:text-white',
      actionClass: 'hover:text-primary',
      badgeClass:
        'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50',
      badgeDotClass: 'bg-emerald-500',
    },
    {
      icon: 'groups',
      iconClass:
        'bg-indigo-50 text-indigo-500 dark:bg-indigo-950/30 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/50 group-hover:bg-indigo-500 group-hover:text-white',
      actionClass: 'hover:text-indigo-600',
      badgeClass:
        'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400 border-amber-100 dark:border-amber-900/50',
      badgeDotClass: 'bg-amber-500',
    },
    {
      icon: 'inventory_2',
      iconClass:
        'bg-cyan-50 text-cyan-500 dark:bg-cyan-950/30 dark:text-cyan-400 border-cyan-100 dark:border-cyan-900/50 group-hover:bg-cyan-500 group-hover:text-white',
      actionClass: 'hover:text-cyan-600',
      badgeClass:
        'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50',
      badgeDotClass: 'bg-emerald-500',
    },
  ] as const;
  const normalizeDetailFillTypeValue = (value: string | undefined | null) => {
    if (DETAIL_FILL_TYPE_OPTIONS.some((option) => option.value === value)) {
      return value!;
    }

    const normalizedRawValue = String(value ?? '').trim();
    if (/(tree|树)/i.test(normalizedRawValue)) {
      return '树表格';
    }

    if (/(chart|图)/i.test(normalizedRawValue)) {
      return '图表';
    }

    if (/(web|page|url|网页)/i.test(normalizedRawValue)) {
      return '网页';
    }

    if (normalizedRawValue === '3') {
      return '网页';
    }

    const matchedOption = DETAIL_FILL_TYPE_OPTIONS.find((option) => option.backendValue === normalizedRawValue);
    return matchedOption?.value ?? DETAIL_FILL_TYPE_OPTIONS[0].value;
  };
  const getDetailFillTypeByTabId = (tabId: string) => normalizeDetailFillTypeValue(detailTabConfigs[tabId]?.detailType);
  const currentDetailFillType = getDetailFillTypeByTabId(activeTab);
  const activeDetailWebUrl = String((detailTableConfigs[activeTab] ?? {}).webUrl || '').trim();
  const getDetailRelatedModuleCodeByTabId = (tabId: string) => String(detailTabConfigs[tabId]?.relatedModule || '').trim();
  const activeDetailBackendId = toRecordNumber(detailTabConfigs[activeTab]?.backendId, Number.NaN);
  const activeDetailRelatedModuleCode = getDetailRelatedModuleCodeByTabId(activeTab);
  const activeDetailSql = String(detailTableConfigs[activeTab]?.mainSql || '').trim();
  const activeDetailContextMenuItems = detailTableConfigs[activeTab]?.contextMenuItems ?? [];
  const activeDetailColorRules = detailTableConfigs[activeTab]?.colorRules ?? [];
  const isTreeMainTableSyncing = isSingleTableFieldsLoading && normalizeModuleType(activeConfigMenu?.moduleType) === 'single-table';
  const treeRelationColumn = mainTableColumns.find((column) => isTreeRelationFieldColumn(column)) ?? null;
  const parsedTreeSourceFields = useMemo(
    () => parseSqlFieldNames(treeRelationColumn?.dynamicSql ?? ''),
    [treeRelationColumn?.dynamicSql],
  );
  const isTreePaneVisible = Boolean(treeRelationColumn);
  const treeRelationColumnConfig = treeRelationColumn ? normalizeColumn(treeRelationColumn) : null;
  const documentConditionOwnerFieldKey = treeRelationColumnConfig
    ? stripBraces(
      toRecordText(treeRelationColumnConfig.backendFieldKey || treeRelationColumnConfig.fieldKey)
        || toRecordText(treeRelationColumnConfig.formKey)
        || toRecordText(treeRelationColumnConfig.sourceField)
        || toRecordText(treeRelationColumn.id),
    )
    : '';
  const documentConditionOwnerSourceId = treeRelationColumnConfig?.backendId ?? treeRelationColumn?.id ?? '';
  const detailDecorationSnapshotRef = useRef(new Map<string, { colorRules: any[]; contextMenuItems: any[] }>());
  const detailModuleDecorationSnapshotRef = useRef(new Map<string, { colorRules: any[]; contextMenuItems: any[] }>());
  const {
    captureDetailResources,
    captureDetails,
    captureFieldColors,
    captureFieldConditions,
    captureFieldGridFields,
    captureMainColors,
    captureMainConditions,
    captureMainFields,
    captureMainMenus,
    isSaving: isSingleTableModuleSettingsSaving,
    saveCurrentPage: saveSingleTableModuleSettingsPage,
  } = useSingleTableModuleSettingsSave({
    activeTab,
    currentModuleCode: activeConfigModuleKey,
    currentModuleName,
    detailTabConfigs,
    detailTableColumns,
    detailTableConfigs,
    detailTabs,
    documentConditionOwnerFieldKey,
    documentConditionOwnerSourceId: String(documentConditionOwnerSourceId ?? ''),
    isActive: canLoadSingleTableModuleResources,
    leftFilterFields,
    leftTableColumns,
    leftTableConfig,
    mainFilterFields,
    mainTableColumns,
    mainTableConfig,
    getCachedDetailDecorations: (moduleCode, detailId) => detailDecorationSnapshotRef.current.get(`${moduleCode}:${detailId}`) ?? null,
    getCachedModuleDecorations: (moduleCode) => detailModuleDecorationSnapshotRef.current.get(moduleCode) ?? null,
    mapColorRule: mapSingleTableColorRule,
    mapConditionRecordToField: mapSingleTableConditionRecordToField,
    mapContextMenuItem: mapSingleTableContextMenuItem,
    mapDetailChartConfig: mapSingleTableDetailChartConfig,
    mapDetailGridFieldToColumn: mapSingleTableDetailGridFieldToColumn,
    mapDetailRecord: mapSingleTableDetailRecord,
    mapFieldGridFieldToColumn: mapSingleTableGridFieldRecordToColumn,
    mapMainFieldRecordToColumn: mapSingleTableFieldRecordToColumn,
    onShowToast: showToast,
    setActiveTab,
    setDetailTabConfigs,
    setDetailTableColumns,
    setDetailTableConfigs,
    setDetailTabs,
    setLeftFilterFields,
    setLeftTableColumns,
    setLeftTableConfig,
    setMainFilterFields,
    setMainTableColumns,
    setMainTableConfig,
  });
  const detailTableColumnsRef = useRef(detailTableColumns);

  useEffect(() => {
    detailTableColumnsRef.current = detailTableColumns;
  }, [detailTableColumns]);

  useEffect(() => {
    setSelectedDetailForDelete([]);
    setSelectedDetailFiltersForDelete([]);
    setInspectorTarget((prev) => {
      if (prev.kind === 'detail-tab') {
        if (!activeTab) {
          return { kind: 'main-grid' };
        }
        return { kind: 'detail-tab', id: activeTab };
      }
      if (prev.kind === 'detail-col' || prev.kind === 'detail-filter' || prev.kind === 'detail-grid') {
        if (!activeTab) {
          return { kind: 'main-grid' };
        }
        return { kind: 'detail-grid', id: currentDetailFillType };
      }
      return prev;
    });
    setBuilderSelectionContextMenu(null);
    setPreviewContextMenu(null);
  }, [activeTab, currentDetailFillType]);

  useEffect(() => {
    setInspectorTarget((prev) => prev.kind === 'detail-filter' ? { kind: 'none' } : prev);
  }, []);

  useEffect(() => {
    if (!isTreePaneVisible) {
      setDocumentConditionScope('main');
      return;
    }
    if (inspectorTarget.kind.startsWith('left')) {
      setDocumentConditionScope((prev) => (prev === 'left' ? prev : 'left'));
      return;
    }
    if (inspectorTarget.kind.startsWith('main')) {
      setDocumentConditionScope((prev) => (prev === 'main' ? prev : 'main'));
    }
  }, [inspectorTarget.kind, isTreePaneVisible]);

  const activateDetailWorkbenchTab = (tabId: string) => {
    setBuilderSelectionContextMenu(null);
    if (activeTab !== tabId) {
      setActiveTab(tabId);
    }
    setInspectorTarget({
      kind: 'detail-tab',
      id: tabId,
    });
    setInspectorPanelTab('common');
    setSelectedArchiveNodeId(`detail-${tabId}`);
  };

  useEffect(() => {
    if (!treeRelationColumn) {
      setInspectorTarget((prev) => (
        prev.kind === 'left-col' || prev.kind === 'left-filter' || prev.kind === 'left-grid' || prev.kind === 'left-filter-panel'
          ? { kind: 'none' }
          : prev
      ));
      return;
    }

    const sourceFields = parsedTreeSourceFields.length > 0 ? parsedTreeSourceFields : ['node_id', 'node_name', 'parent_id'];
    const ownerField = normalizeColumn(treeRelationColumn);
    setLeftTableColumns((prev) => buildTreeRelationFallbackColumns(sourceFields, prev));
    setLeftTableConfig((prev) => ({
      ...prev,
      tableType: '树表格',
      mainSql: ownerField.dynamicSql || prev.mainSql || '',
      contextMenuItems: (prev.contextMenuItems ?? []).map((item: any, index: number) => normalizeContextMenuItem({
        ...item,
        tab: documentConditionOwnerFieldKey,
      }, index + 1)),
      colorRules: (prev.colorRules ?? []).map((rule: any) => ({
        ...rule,
        tab: documentConditionOwnerFieldKey,
      })),
    }));
    setLeftFilterFields((prev) => prev.map((field) => ({
      ...field,
      sourceid: documentConditionOwnerSourceId,
      formKey: documentConditionOwnerFieldKey,
    })));
  }, [documentConditionOwnerFieldKey, documentConditionOwnerSourceId, parsedTreeSourceFields, treeRelationColumn]);

  useEffect(() => {
    if (!isConfigOpen || configStep !== MODULE_SETTING_STEP) {
      return;
    }

    if (!canLoadSingleTableModuleResources) {
      return;
    }

    if (!treeRelationColumn || !documentConditionOwnerSourceId) {
      return;
    }

    const fieldId = Number(documentConditionOwnerSourceId);
    if (!Number.isFinite(fieldId) || fieldId <= 0) {
      return;
    }

    const fallbackFields = parsedTreeSourceFields.length > 0 ? parsedTreeSourceFields : ['node_id', 'node_name', 'parent_id'];
    let isActive = true;

    const applyFallbackColumns = () => {
      setLeftTableColumns((prev) => buildTreeRelationFallbackColumns(fallbackFields, prev));
    };

    const loadSingleTableFieldGridFields = async () => {
      try {
        const rows = await fetchSingleTableFieldGridFields(activeConfigModuleKey, fieldId);
        if (!isActive) {
          return;
        }

        if (!Array.isArray(rows) || rows.length === 0) {
          applyFallbackColumns();
          return;
        }

        const orderedRows = [...rows].sort(
          (left, right) => toRecordNumber(getRecordFieldValue(left, 'orderid', 'orderId'), 0)
            - toRecordNumber(getRecordFieldValue(right, 'orderid', 'orderId'), 0),
        );

        let mappedColumns: any[] = [];
        setLeftTableColumns((prev) => {
          mappedColumns = orderedRows.map((row, index) => {
            const backendId = getRecordFieldValue(row, 'id');
            const fieldName = toRecordText(getRecordFieldValue(row, 'fieldname', 'fieldName'));
            const fieldKey = toRecordText(getRecordFieldValue(row, 'fieldkey', 'fieldKey'));
            const existing = prev.find((item) => (
              (backendId != null && getRecordFieldValue(item, 'backendid', 'backendId') === backendId)
              || (fieldName && item.sourceField === fieldName)
              || (fieldKey && getRecordFieldValue(item, 'backendfieldkey', 'backendFieldKey') === fieldKey)
            ));

            return mapSingleTableGridFieldRecordToColumn(row, index, existing);
          });

          return mappedColumns;
        });
        captureFieldGridFields(fieldId, mappedColumns);
      } catch {
        if (isActive) {
          applyFallbackColumns();
        }
      }
    };

    loadSingleTableFieldGridFields();

    return () => {
      isActive = false;
    };
  }, [
    activeConfigMenu?.moduleType,
    activeConfigModuleKey,
    canLoadSingleTableModuleResources,
    captureFieldGridFields,
    configStep,
    documentConditionOwnerSourceId,
    isConfigOpen,
    parsedTreeSourceFields,
    treeRelationColumn,
  ]);

  const cloneColumnsForDetailPreview = useCallback((columns: any[] = []) => (
    columns.map((column, index) => {
      const normalizedColumn = JSON.parse(JSON.stringify(normalizeColumn(column)));
      const { id: _ignoredId, ...rest } = normalizedColumn;
      return buildColumn('d_col', index + 1, {
        ...rest,
        name: normalizedColumn.name || `字段 ${index + 1}`,
        sourceField: normalizedColumn.sourceField || '',
      });
    })
  ), [buildColumn, normalizeColumn]);

  const resolveDetailModuleSnapshotByCode = useCallback(async (moduleCode: string) => {
    const normalizedModuleCode = String(moduleCode || '').trim();
    if (!normalizedModuleCode) {
      return null;
    }

    const hasLocalMainTableSnapshot = normalizedModuleCode === currentModuleCode && (
      mainTableColumns.length > 0
      || String(mainTableConfig.mainSql || '').trim().length > 0
      || String(mainTableConfig.tableName || '').trim().length > 0
      || (mainTableConfig.contextMenuItems ?? []).length > 0
      || (mainTableConfig.colorRules ?? []).length > 0
    );

    if (hasLocalMainTableSnapshot) {
      return {
        columns: cloneColumnsForDetailPreview(mainTableColumns),
        gridConfigPatch: {
          ...JSON.parse(JSON.stringify(mainTableConfig)),
          mainSql: String(mainTableConfig.mainSql || '').trim()
            || (currentPrimaryTableName ? `SELECT * FROM ${currentPrimaryTableName}` : ''),
          tableName: String(mainTableConfig.tableName || '').trim() || currentPrimaryTableName,
          sourceMode: 'module',
          sourceModuleCode: normalizedModuleCode,
        },
      };
    }

    const [moduleConfig, moduleFields, menuRows, colorRows] = await Promise.all([
      fetchSingleTableModuleConfig(normalizedModuleCode),
      fetchSingleTableModuleFields(normalizedModuleCode),
      fetchSingleTableModuleMenus(normalizedModuleCode),
      fetchSingleTableModuleColors(normalizedModuleCode),
    ]);

    const normalizedModuleConfig = moduleConfig as Record<string, unknown>;
    const mappedColumns = moduleFields.map((field, index) => mapSingleTableDetailGridFieldToColumn(field, index));
    const mappedMenus = [...menuRows]
      .sort(
        (left, right) => toRecordNumber(getRecordFieldValue(left, 'orderid', 'orderId'), 0)
          - toRecordNumber(getRecordFieldValue(right, 'orderid', 'orderId'), 0),
      )
      .map((item, index) => mapSingleTableContextMenuItem(item, index));
    const mappedRules = [...colorRows]
      .sort(
        (left, right) => toRecordNumber(getRecordFieldValue(left, 'orderid', 'orderId'), 0)
          - toRecordNumber(getRecordFieldValue(right, 'orderid', 'orderId'), 0),
      )
      .map((rule, index) => mapSingleTableColorRule(rule, index));
    detailModuleDecorationSnapshotRef.current.set(normalizedModuleCode, {
      colorRules: JSON.parse(JSON.stringify(mappedRules)),
      contextMenuItems: JSON.parse(JSON.stringify(mappedMenus)),
    });
    const resolvedMainSql = toRecordText(getRecordFieldValue(normalizedModuleConfig, 'querySql', 'querysql'))
      || toRecordText(getRecordFieldValue(normalizedModuleConfig, 'mainSql', 'mainsql'));
    const resolvedTableName = toRecordText(getRecordFieldValue(normalizedModuleConfig, 'mainTable', 'maintable'));

    return {
      columns: mappedColumns,
      gridConfigPatch: buildGridConfig(
        resolvedMainSql || (resolvedTableName ? `SELECT * FROM ${resolvedTableName}` : ''),
        '',
        {
          tableName: resolvedTableName,
          sourceMode: 'module',
          sourceModuleCode: normalizedModuleCode,
          tableType: '普通表格',
          contextMenuEnabled: mappedMenus.length > 0,
          contextMenuItems: mappedMenus,
          colorRulesEnabled: mappedRules.length > 0,
          colorRules: mappedRules,
          detailBoard: buildDetailBoardConfig([], {
            enabled: false,
            theme: mainTableConfig.detailBoard?.theme || 'aurora',
          }),
        },
      ),
    };
  }, [
    buildColumn,
    buildGridConfig,
    cloneColumnsForDetailPreview,
    currentModuleCode,
    currentPrimaryTableName,
    mainTableColumns,
    mainTableConfig,
  ]);
  const resolveDetailModuleSnapshotByCodeRef = useRef(resolveDetailModuleSnapshotByCode);

  useEffect(() => {
    resolveDetailModuleSnapshotByCodeRef.current = resolveDetailModuleSnapshotByCode;
  }, [resolveDetailModuleSnapshotByCode]);

  useEffect(() => {
    if (!isConfigOpen || configStep !== MODULE_SETTING_STEP) {
      return;
    }

    if (!canLoadSingleTableModuleResources || !treeRelationColumn || !documentConditionOwnerSourceId) {
      return;
    }

    const fieldId = Number(documentConditionOwnerSourceId);
    if (!Number.isFinite(fieldId) || fieldId <= 0) {
      return;
    }

    let isActive = true;

    const loadSingleTableFieldColors = async () => {
      try {
        const rows = await fetchSingleTableFieldColors(activeConfigModuleKey, fieldId);
        if (!isActive) {
          return;
        }

        const mappedRules = [...rows]
          .sort(
            (left, right) => toRecordNumber(getRecordFieldValue(left, 'orderid', 'orderId'), 0)
              - toRecordNumber(getRecordFieldValue(right, 'orderid', 'orderId'), 0),
          )
          .map((rule, index) => mapSingleTableColorRule(rule, index));

        setLeftTableConfig((prev) => ({
          ...prev,
          colorRulesEnabled: mappedRules.length > 0,
          colorRules: mappedRules,
        }));
        captureFieldColors(fieldId, mappedRules);
      } catch (error) {
        if (!isActive) {
          return;
        }

        showToast(getDashboardErrorMessage(error));
      }
    };

    void loadSingleTableFieldColors();

    return () => {
      isActive = false;
    };
  }, [
    activeConfigModuleKey,
    canLoadSingleTableModuleResources,
    captureFieldColors,
    configStep,
    documentConditionOwnerSourceId,
    isConfigOpen,
    treeRelationColumn,
  ]);

  useEffect(() => {
    if (!isConfigOpen) {
      moduleSettingFullscreenInitRef.current = false;
      return;
    }

    if ((configStep === MODULE_SETTING_STEP || configStep === RESTRICTION_STEP || configStep === PROCESS_DESIGN_STEP) && !moduleSettingFullscreenInitRef.current) {
      moduleSettingFullscreenInitRef.current = true;
    }
  }, [configStep, isConfigOpen]);

  useEffect(() => {
    if (!isConfigOpen || configStep !== MODULE_SETTING_STEP) {
      setIsSingleTableFieldsLoading(false);
      return;
    }

    if (!canLoadSingleTableModuleResources) {
      setIsSingleTableFieldsLoading(false);
      return;
    }

    let isActive = true;
    setIsSingleTableFieldsLoading(true);

    const loadSingleTableFields = async () => {
      try {
        const rows = await fetchSingleTableModuleFields(activeConfigModuleKey);

        if (!isActive) {
          return;
        }

        const mappedColumns = rows.map((field, index) => mapSingleTableFieldRecordToColumn(field, index)) as typeof mainTableColumns;
        setMainTableColumns(mappedColumns);
        captureMainFields(mappedColumns);
        setSelectedMainForDelete([]);
        setInspectorTarget((prev) => {
          if (prev.kind === 'main-col' && !mappedColumns.some((column) => column.id === prev.id)) {
            return { kind: 'main-grid' };
          }

          return prev;
        });
        setDetailBoardSortColumnId((prev) => (
          prev && mappedColumns.some((column) => column.id === prev) ? prev : mappedColumns[0]?.id ?? null
        ));
      } catch (error) {
        if (!isActive) {
          return;
        }

        showToast(getDashboardErrorMessage(error));
      } finally {
        if (isActive) {
          setIsSingleTableFieldsLoading(false);
        }
      }
    };

    void loadSingleTableFields();

    return () => {
      isActive = false;
    };
  }, [activeConfigMenu?.moduleType, activeConfigModuleKey, canLoadSingleTableModuleResources, captureMainFields, configStep, isConfigOpen]);

  useEffect(() => {
    if (!isConfigOpen || configStep !== MODULE_SETTING_STEP) {
      return;
    }

    if (!canLoadSingleTableModuleResources) {
      return;
    }

    let isActive = true;

    const loadSingleTableConditions = async () => {
      try {
        const rows = await fetchSingleTableModuleConditions(activeConfigModuleKey);

        if (!isActive) {
          return;
        }

        const mappedFields = rows.map((condition, index) => mapSingleTableConditionRecordToField(condition, index));
        setMainFilterFields(mappedFields);
        captureMainConditions(mappedFields);
        setSelectedMainFiltersForDelete([]);
        setInspectorTarget((prev) => {
          if (prev.kind === 'main-filter' && !mappedFields.some((field) => field.id === prev.id)) {
            return { kind: 'main-filter-panel' };
          }

          return prev;
        });
      } catch (error) {
        if (!isActive) {
          return;
        }

        showToast(getDashboardErrorMessage(error));
      }
    };

    void loadSingleTableConditions();

    return () => {
      isActive = false;
    };
  }, [activeConfigMenu?.moduleType, activeConfigModuleKey, canLoadSingleTableModuleResources, captureMainConditions, configStep, isConfigOpen]);

  useEffect(() => {
    if (!isConfigOpen || configStep !== MODULE_SETTING_STEP) {
      return;
    }

    if (!canLoadSingleTableModuleResources) {
      return;
    }

    if (!treeRelationColumn || !documentConditionOwnerSourceId) {
      setLeftFilterFields([]);
      setSelectedLeftFiltersForDelete([]);
      return;
    }

    const fieldId = Number(documentConditionOwnerSourceId);
    if (!Number.isFinite(fieldId) || fieldId <= 0) {
      return;
    }

    let isActive = true;

    const loadSingleTableFieldConditions = async () => {
      try {
        const rows = await fetchSingleTableFieldConditions(activeConfigModuleKey, fieldId);

        if (!isActive) {
          return;
        }

        const mappedFields = rows.map((condition, index) => mapSingleTableConditionRecordToField(condition, index, {
          sourceid: fieldId,
          formKey: documentConditionOwnerFieldKey,
        }));
        setLeftFilterFields(mappedFields);
        captureFieldConditions(fieldId, mappedFields);
        setSelectedLeftFiltersForDelete([]);
        setInspectorTarget((prev) => {
          if (prev.kind === 'left-filter' && !mappedFields.some((field) => field.id === prev.id)) {
            return { kind: 'left-filter-panel' };
          }

          return prev;
        });
      } catch (error) {
        if (!isActive) {
          return;
        }

        showToast(getDashboardErrorMessage(error));
      }
    };

    void loadSingleTableFieldConditions();

    return () => {
      isActive = false;
    };
  }, [
    activeConfigMenu?.moduleType,
    activeConfigModuleKey,
    canLoadSingleTableModuleResources,
    captureFieldConditions,
    configStep,
    documentConditionOwnerFieldKey,
    documentConditionOwnerSourceId,
    isConfigOpen,
    treeRelationColumn,
  ]);

  useEffect(() => {
    if (!isConfigOpen || configStep !== MODULE_SETTING_STEP) {
      return;
    }

    if (!canLoadSingleTableModuleResources) {
      return;
    }

    let isActive = true;

    const loadSingleTableDetails = async () => {
      try {
        const rows = await fetchSingleTableModuleDetails(activeConfigModuleKey);

        if (!isActive) {
          return;
        }

        const mappedDetails = rows.map((detail, index) => mapSingleTableDetailRecord(detail, index));
        let systemTabOaUrlPromise: Promise<string> | null = null;
        const getSystemTabOaUrl = async () => {
          if (!systemTabOaUrlPromise) {
            systemTabOaUrlPromise = fetchSystemTab()
              .then((systemTab) => toRecordText(getRecordFieldValue(systemTab, 'oaurl', 'oaUrl')));
          }
          return systemTabOaUrlPromise;
        };
        const detailLoadWarnings: string[] = [];
        const detailResources = await Promise.all(
          mappedDetails.map(async (item) => {
            const detailConfig = (item.config ?? {}) as Record<string, any>;
            const detailGridConfig = (item.gridConfig ?? {}) as Record<string, any>;
            const detailFillType = normalizeDetailFillTypeValue(detailConfig.detailType);
            const detailId = toRecordNumber(detailConfig.backendId, Number.NaN);
            const detailModuleCode = String(detailConfig.relatedModule || '').trim();
            const detailSql = String(detailGridConfig.mainSql || '').trim();
            const relationCondition = String(
              detailConfig.relatedCondition
              || detailGridConfig.sourceCondition
              || detailGridConfig.defaultQuery
              || '',
            ).trim();
            const gridPatch: Record<string, any> = {};
            let columns: any[] = [];

            try {
              if (detailFillType === '表格' || detailFillType === '树表格') {
                if (detailModuleCode) {
                  const moduleSnapshot = await resolveDetailModuleSnapshotByCodeRef.current(detailModuleCode);
                  if (!isActive) {
                    return null;
                  }

                  if (moduleSnapshot) {
                    columns = moduleSnapshot.columns;
                    Object.assign(gridPatch, moduleSnapshot.gridConfigPatch, {
                      defaultQuery: relationCondition,
                      sourceMode: 'module',
                      sourceModuleCode: detailModuleCode,
                      sourceCondition: relationCondition,
                    });
                  }
                } else if (Number.isFinite(detailId) && detailSql) {
                  const detailGridFields = await fetchSingleTableDetailGridFields(activeConfigModuleKey, detailId);
                  if (!isActive) {
                    return null;
                  }

                  columns = detailGridFields.map((field, index) => mapSingleTableDetailGridFieldToColumn(field, index));
                  gridPatch.sourceMode = 'sql';
                  gridPatch.sourceModuleCode = '';
                }
              } else if (detailFillType === '图表' && Number.isFinite(detailId)) {
                const detailCharts = await fetchSingleTableDetailCharts(activeConfigModuleKey, detailId);
                if (!isActive) {
                  return null;
                }

                const firstChart = [...detailCharts].sort(
                  (left, right) => toRecordNumber(getRecordFieldValue(left, 'orderid', 'orderId'), 0)
                    - toRecordNumber(getRecordFieldValue(right, 'orderid', 'orderId'), 0),
                )[0];

                if (firstChart) {
                  gridPatch.chartConfig = mapSingleTableDetailChartConfig(firstChart);
                }
              } else if (detailFillType === '网页') {
                if (isAbsoluteHttpUrl(detailSql)) {
                  gridPatch.webUrl = detailSql;
                } else if (detailSql) {
                  const oaUrl = await getSystemTabOaUrl();
                  if (!isActive) {
                    return null;
                  }

                  gridPatch.webUrl = joinHttpUrl(oaUrl, detailSql);
                } else {
                  gridPatch.webUrl = '';
                }
              }
            } catch (error) {
              detailLoadWarnings.push(`${item.tab.name}：${getDashboardErrorMessage(error)}`);
            }

            return {
              tabId: item.tab.id,
              columns,
              gridPatch,
            };
          }),
        );

        if (!isActive) {
          return;
        }

        const detailResourceMap = new Map(
          detailResources
            .filter((item): item is { tabId: string; columns: any[]; gridPatch: Record<string, any> } => Boolean(item))
            .map((item) => [item.tabId, item]),
        );
        const nextTabs = mappedDetails.map((item) => item.tab);
        const nextTabConfigs = Object.fromEntries(mappedDetails.map((item) => [item.tab.id, item.config]));
        const nextGridConfigs = Object.fromEntries(mappedDetails.map((item) => [
          item.tab.id,
          {
            ...item.gridConfig,
            ...(detailResourceMap.get(item.tab.id)?.gridPatch ?? {}),
          },
        ]));
        const nextDetailColumns = Object.fromEntries(mappedDetails.map((item) => [
          item.tab.id,
          detailResourceMap.get(item.tab.id)?.columns ?? [],
        ]));
        const nextDetailFilters = Object.fromEntries(mappedDetails.map((item) => [item.tab.id, [] as any[]]));
        const nextActiveTab = nextTabs[0]?.id ?? '';

        setDetailTabs(nextTabs);
        setDetailTabConfigs(nextTabConfigs);
        setDetailTableConfigs(nextGridConfigs);
        setDetailTableColumns(nextDetailColumns);
        captureDetails({
          tabConfigs: nextTabConfigs,
          tableColumns: nextDetailColumns,
          tableConfigs: nextGridConfigs,
          tabs: nextTabs,
        });
        setDetailFilterFields(nextDetailFilters);
        setSelectedDetailForDelete([]);
        setSelectedDetailFiltersForDelete([]);
        setActiveTab((prev) => (nextTabs.some((tab) => tab.id === prev) ? prev : nextActiveTab));
        if (detailLoadWarnings.length > 0) {
          showToast(detailLoadWarnings[0]);
        }
      } catch (error) {
        if (!isActive) {
          return;
        }

        showToast(getDashboardErrorMessage(error));
      }
    };

    void loadSingleTableDetails();

    return () => {
      isActive = false;
    };
  }, [
    activeConfigMenu?.moduleType,
    activeConfigModuleKey,
    canLoadSingleTableModuleResources,
    captureDetails,
    configStep,
    isConfigOpen,
  ]);

  useEffect(() => {
    if (!isConfigOpen || configStep !== MODULE_SETTING_STEP) {
      return;
    }

    if (!canLoadSingleTableModuleResources) {
      return;
    }

    let isActive = true;

    const loadSingleTableMenus = async () => {
      try {
        const rows = await fetchSingleTableModuleMenus(activeConfigModuleKey);

        if (!isActive) {
          return;
        }

        const mappedMenus = [...rows]
          .sort(
            (left, right) => toRecordNumber(getRecordFieldValue(left, 'orderid', 'orderId'), 0)
              - toRecordNumber(getRecordFieldValue(right, 'orderid', 'orderId'), 0),
          )
          .map((item, index) => mapSingleTableContextMenuItem(item, index));

        setMainTableConfig((prev) => ({
          ...prev,
          contextMenuEnabled: mappedMenus.length > 0,
          contextMenuItems: mappedMenus,
        }));
        captureMainMenus(mappedMenus);
      } catch (error) {
        if (!isActive) {
          return;
        }

        showToast(getDashboardErrorMessage(error));
      }
    };

    void loadSingleTableMenus();

    return () => {
      isActive = false;
    };
  }, [activeConfigMenu?.moduleType, activeConfigModuleKey, canLoadSingleTableModuleResources, captureMainMenus, configStep, isConfigOpen]);

  useEffect(() => {
    if (!isConfigOpen || configStep !== MODULE_SETTING_STEP) {
      return;
    }

    if (!canLoadSingleTableModuleResources) {
      return;
    }

    let isActive = true;

    const loadSingleTableColors = async () => {
      try {
        const rows = await fetchSingleTableModuleColors(activeConfigModuleKey);

        if (!isActive) {
          return;
        }

        const mappedRules = [...rows]
          .sort(
            (left, right) => toRecordNumber(getRecordFieldValue(left, 'orderid', 'orderId'), 0)
              - toRecordNumber(getRecordFieldValue(right, 'orderid', 'orderId'), 0),
          )
          .map((rule, index) => mapSingleTableColorRule(rule, index));

        setMainTableConfig((prev) => ({
          ...prev,
          colorRulesEnabled: mappedRules.length > 0,
          colorRules: mappedRules,
        }));
        captureMainColors(mappedRules);
      } catch (error) {
        if (!isActive) {
          return;
        }

        showToast(getDashboardErrorMessage(error));
      }
    };

    void loadSingleTableColors();

    return () => {
      isActive = false;
    };
  }, [
    activeConfigMenu?.moduleType,
    activeConfigModuleKey,
    canLoadSingleTableModuleResources,
    captureMainColors,
    configStep,
    isConfigOpen,
  ]);

  useEffect(() => {
    const contextMenuItems = leftTableConfig.contextMenuItems ?? [];
    if (!contextMenuItems.some((item: any) => item.id === selectedLeftContextMenuId)) {
      setSelectedLeftContextMenuId(contextMenuItems[0]?.id ?? null);
    }
  }, [leftTableConfig.contextMenuItems, selectedLeftContextMenuId]);

  useEffect(() => {
    const colorRules = leftTableConfig.colorRules ?? [];
    if (!colorRules.some((rule: any) => rule.id === selectedLeftColorRuleId)) {
      setSelectedLeftColorRuleId(colorRules[0]?.id ?? null);
    }
  }, [leftTableConfig.colorRules, selectedLeftColorRuleId]);

  useEffect(() => {
    const contextMenuItems = mainTableConfig.contextMenuItems ?? [];
    if (!contextMenuItems.some((item: any) => item.id === selectedMainContextMenuId)) {
      setSelectedMainContextMenuId(contextMenuItems[0]?.id ?? null);
    }
  }, [mainTableConfig.contextMenuItems, selectedMainContextMenuId]);

  useEffect(() => {
    const useLeftMenuScope = inspectorTarget.kind === 'left-grid';
    const contextMenuItems = ((useLeftMenuScope ? leftTableConfig : mainTableConfig).contextMenuItems ?? [])
      .map((item: any, index: number) => normalizeContextMenuItem(item, index + 1));
    const selectedMenuId = useLeftMenuScope ? selectedLeftContextMenuId : selectedMainContextMenuId;
    const selectedMenu = contextMenuItems.find((item: any) => item.id === selectedMenuId) ?? contextMenuItems[0] ?? null;
    const popupParamKeys = Array.from({ length: 10 }, (_, index) => `dllpar${index + 1}`);

    setSelectedPopupMenuParamKey((prev) => {
      if (!selectedMenu) {
        selectedPopupMenuOwnerRef.current = null;
        return 'dllpar1';
      }

      const isMenuChanged = selectedPopupMenuOwnerRef.current !== selectedMenu.id;
      selectedPopupMenuOwnerRef.current = selectedMenu.id;

      if (!popupParamKeys.includes(prev)) return 'dllpar1';
      if (!isMenuChanged) return prev;

      return popupParamKeys.find((key) => String(selectedMenu[key] ?? '').trim().length > 0) ?? 'dllpar1';
    });
  }, [
    inspectorTarget.kind,
    leftTableConfig.contextMenuItems,
    mainTableConfig.contextMenuItems,
    selectedLeftContextMenuId,
    selectedMainContextMenuId,
  ]);

  useEffect(() => {
    const colorRules = mainTableConfig.colorRules ?? [];
    if (!colorRules.some((rule: any) => rule.id === selectedMainColorRuleId)) {
      setSelectedMainColorRuleId(colorRules[0]?.id ?? null);
    }
  }, [mainTableConfig.colorRules, selectedMainColorRuleId]);

  useEffect(() => {
    if (!isConfigOpen || configStep !== MODULE_SETTING_STEP) {
      return;
    }

    if (!canLoadSingleTableModuleResources || !activeTab) {
      return;
    }

    const clearActiveDetailDecorations = () => {
      setDetailTableConfigs((prev) => ({
        ...prev,
        [activeTab]: {
          ...(prev[activeTab] ?? buildGridConfig('', '', { sourceCondition: 'parent_id = ${id}' })),
          contextMenuEnabled: false,
          contextMenuItems: [],
          colorRulesEnabled: false,
          colorRules: [],
        },
      }));
    };

    if (currentDetailFillType !== '表格' && currentDetailFillType !== '树表格') {
      clearActiveDetailDecorations();
      return;
    }

    let isActive = true;

    const applyDecorationRows = (menuRows: SingleTableContextMenuDto[], colorRows: SingleTableColorRuleDto[]) => {
      const mappedMenus = [...menuRows]
        .sort(
          (left, right) => toRecordNumber(getRecordFieldValue(left, 'orderid', 'orderId'), 0)
            - toRecordNumber(getRecordFieldValue(right, 'orderid', 'orderId'), 0),
        )
        .map((item, index) => mapSingleTableContextMenuItem(item, index));
      const mappedRules = [...colorRows]
        .sort(
          (left, right) => toRecordNumber(getRecordFieldValue(left, 'orderid', 'orderId'), 0)
            - toRecordNumber(getRecordFieldValue(right, 'orderid', 'orderId'), 0),
        )
        .map((item, index) => mapSingleTableColorRule(item, index));
      if (activeDetailRelatedModuleCode) {
        detailModuleDecorationSnapshotRef.current.set(activeDetailRelatedModuleCode, {
          colorRules: JSON.parse(JSON.stringify(mappedRules)),
          contextMenuItems: JSON.parse(JSON.stringify(mappedMenus)),
        });
      } else if (Number.isFinite(activeDetailBackendId)) {
        detailDecorationSnapshotRef.current.set(`${activeConfigModuleKey}:${activeDetailBackendId}`, {
          colorRules: JSON.parse(JSON.stringify(mappedRules)),
          contextMenuItems: JSON.parse(JSON.stringify(mappedMenus)),
        });
      }

      let nextTableConfig: Record<string, any> = {};
      setDetailTableConfigs((prev) => {
        nextTableConfig = {
          ...(prev[activeTab] ?? buildGridConfig('', '', { sourceCondition: 'parent_id = ${id}' })),
          contextMenuEnabled: mappedMenus.length > 0,
          contextMenuItems: mappedMenus,
          colorRulesEnabled: mappedRules.length > 0,
          colorRules: mappedRules,
        };

        return {
          ...prev,
          [activeTab]: nextTableConfig,
        };
      });
      captureDetailResources(activeTab, {
        columns: detailTableColumnsRef.current[activeTab] ?? [],
        tableConfig: nextTableConfig,
      });
    };

    const loadSingleTableDetailDecorations = async () => {
      try {
        if (activeDetailRelatedModuleCode) {
          const [menuRows, colorRows] = await Promise.all([
            fetchSingleTableModuleMenus(activeDetailRelatedModuleCode),
            fetchSingleTableModuleColors(activeDetailRelatedModuleCode),
          ]);

          if (!isActive) {
            return;
          }

          applyDecorationRows(menuRows, colorRows);
          return;
        }

        if (!Number.isFinite(activeDetailBackendId) || !activeDetailSql) {
          clearActiveDetailDecorations();
          return;
        }

        const [menuRows, colorRows] = await Promise.all([
          fetchSingleTableDetailMenus(activeConfigModuleKey, activeDetailBackendId),
          fetchSingleTableDetailColors(activeConfigModuleKey, activeDetailBackendId),
        ]);

        if (!isActive) {
          return;
        }

        applyDecorationRows(menuRows, colorRows);
      } catch (error) {
        if (!isActive) {
          return;
        }

        showToast(getDashboardErrorMessage(error));
      }
    };

    void loadSingleTableDetailDecorations();

    return () => {
      isActive = false;
    };
  }, [
    activeConfigMenu?.moduleType,
    activeConfigModuleKey,
    activeDetailBackendId,
    activeDetailRelatedModuleCode,
    activeDetailSql,
    activeTab,
    canLoadSingleTableModuleResources,
    captureDetailResources,
    configStep,
    currentDetailFillType,
    isConfigOpen,
  ]);

  useEffect(() => {
    if (!activeDetailContextMenuItems.some((item: any) => item.id === selectedDetailContextMenuId)) {
      setSelectedDetailContextMenuId(activeDetailContextMenuItems[0]?.id ?? null);
    }
  }, [activeDetailContextMenuItems, selectedDetailContextMenuId]);

  useEffect(() => {
    if (!activeDetailColorRules.some((rule: any) => rule.id === selectedDetailColorRuleId)) {
      setSelectedDetailColorRuleId(activeDetailColorRules[0]?.id ?? null);
    }
  }, [activeDetailColorRules, selectedDetailColorRuleId]);

  useEffect(() => {
    const closeContextMenu = () => {
      setPreviewContextMenu(null);
      setBuilderSelectionContextMenu(null);
    };

    window.addEventListener('click', closeContextMenu);
    window.addEventListener('resize', closeContextMenu);
    window.addEventListener('scroll', closeContextMenu, true);

    return () => {
      window.removeEventListener('click', closeContextMenu);
      window.removeEventListener('resize', closeContextMenu);
      window.removeEventListener('scroll', closeContextMenu, true);
    };
  }, []);

  const getDetailFillTypeMeta = (fillType?: string) => (
    DETAIL_FILL_TYPE_OPTIONS.find((option) => option.value === fillType) ?? DETAIL_FILL_TYPE_OPTIONS[0]
  );
  const currentDetailFillTypeValue = getDetailFillTypeMeta(currentDetailFillType).value;
  const getDetailFillTypeBackendValue = (fillType?: string) => String(getDetailFillTypeMeta(fillType).backendValue || '0');
  const isAbsoluteHttpUrl = (value: string) => /^https?:\/\//i.test(String(value || '').trim());
  const joinHttpUrl = (baseUrl: string, nextPath: string) => {
    const normalizedBaseUrl = String(baseUrl || '').trim().replace(/\/+$/, '');
    const normalizedPath = String(nextPath || '').trim().replace(/^\/+/, '');

    if (!normalizedBaseUrl) {
      return normalizedPath ? `/${normalizedPath}` : '';
    }

    if (!normalizedPath) {
      return normalizedBaseUrl;
    }

    return `${normalizedBaseUrl}/${normalizedPath}`;
  };
  const loadSingleTableDetailResourcesById = useCallback(async (tabId: string, explicitFillType?: string) => {
    if (!tabId || !isConfigOpen || configStep !== MODULE_SETTING_STEP) {
      return;
    }

    if (!canLoadSingleTableModuleResources) {
      return;
    }

    const detailConfig = detailTabConfigs[tabId] ?? buildDetailTabConfig();
    const detailGridConfig = detailTableConfigs[tabId] ?? buildGridConfig('', '', { sourceCondition: 'parent_id = ${id}' });
    const detailFillType = normalizeDetailFillTypeValue(explicitFillType ?? detailConfig.detailType);
    const detailId = toRecordNumber(detailConfig.backendId, Number.NaN);
    const detailModuleCode = String(detailConfig.relatedModule || '').trim();
    const detailSql = String(detailGridConfig.mainSql || '').trim();
    const relationCondition = String(
      detailConfig.relatedCondition
      || detailGridConfig.sourceCondition
      || detailGridConfig.defaultQuery
      || '',
    ).trim();

    try {
      if (detailFillType === '表格' || detailFillType === '树表格') {
        if (detailModuleCode) {
          const moduleSnapshot = await resolveDetailModuleSnapshotByCode(detailModuleCode);
          if (!moduleSnapshot) {
            return;
          }

          const nextTableConfig = {
            ...(detailTableConfigs[tabId] ?? buildGridConfig('', '', { sourceCondition: 'parent_id = ${id}' })),
            ...moduleSnapshot.gridConfigPatch,
            defaultQuery: relationCondition,
            sourceMode: 'module',
            sourceModuleCode: detailModuleCode,
            sourceCondition: relationCondition,
          };

          setDetailTableColumns((prev) => ({
            ...prev,
            [tabId]: moduleSnapshot.columns,
          }));
          setDetailTableConfigs((prev) => ({
            ...prev,
            [tabId]: nextTableConfig,
          }));
          captureDetailResources(tabId, { columns: moduleSnapshot.columns, tableConfig: nextTableConfig });
          return;
        }

        if (Number.isFinite(detailId) && detailSql) {
          const detailGridFields = await fetchSingleTableDetailGridFields(activeConfigModuleKey, detailId);
          const columns = detailGridFields.map((field, index) => mapSingleTableDetailGridFieldToColumn(field, index));
          const nextTableConfig = {
            ...(detailTableConfigs[tabId] ?? buildGridConfig('', '', { sourceCondition: 'parent_id = ${id}' })),
            sourceMode: 'sql',
            sourceModuleCode: '',
          };

          setDetailTableColumns((prev) => ({
            ...prev,
            [tabId]: columns,
          }));
          setDetailTableConfigs((prev) => ({
            ...prev,
            [tabId]: nextTableConfig,
          }));
          captureDetailResources(tabId, { columns, tableConfig: nextTableConfig });
        }
        return;
      }

      if (detailFillType === '图表') {
        if (!Number.isFinite(detailId)) {
          return;
        }

        const detailCharts = await fetchSingleTableDetailCharts(activeConfigModuleKey, detailId);
        const firstChart = [...detailCharts].sort(
          (left, right) => toRecordNumber(getRecordFieldValue(left, 'orderid', 'orderId'), 0)
            - toRecordNumber(getRecordFieldValue(right, 'orderid', 'orderId'), 0),
        )[0];

        if (!firstChart) {
          return;
        }

        const nextTableConfig = {
          ...(detailTableConfigs[tabId] ?? buildGridConfig('', '', { sourceCondition: 'parent_id = ${id}' })),
          chartConfig: mapSingleTableDetailChartConfig(firstChart),
        };

        setDetailTableConfigs((prev) => ({
          ...prev,
          [tabId]: nextTableConfig,
        }));
        captureDetailResources(tabId, { columns: detailTableColumns[tabId] ?? [], tableConfig: nextTableConfig });
        return;
      }

      if (detailFillType === '网页') {
        const webUrl = isAbsoluteHttpUrl(detailSql)
          ? detailSql
          : detailSql
            ? joinHttpUrl(
              toRecordText(getRecordFieldValue(await fetchSystemTab(), 'oaurl', 'oaUrl')),
              detailSql,
            )
            : '';

        const nextTableConfig = {
          ...(detailTableConfigs[tabId] ?? buildGridConfig('', '', { sourceCondition: 'parent_id = ${id}' })),
          webUrl,
        };

        setDetailTableConfigs((prev) => ({
          ...prev,
          [tabId]: nextTableConfig,
        }));
        captureDetailResources(tabId, { columns: detailTableColumns[tabId] ?? [], tableConfig: nextTableConfig });
      }
    } catch (error) {
      showToast(getDashboardErrorMessage(error));
    }
  }, [
    activeConfigMenu?.moduleType,
    activeConfigModuleKey,
    canLoadSingleTableModuleResources,
    captureDetailResources,
    configStep,
    detailTableColumns,
    detailTabConfigs,
    detailTableConfigs,
    resolveDetailModuleSnapshotByCode,
    isConfigOpen,
  ]);

  const {
    activeDocumentConditionScope,
    getSelectedConditionPanelContext,
    handleConditionPanelFieldSelect,
    handleDocumentConditionScopeSwitch,
    leftDocumentConditionConfig,
    mainDocumentConditionConfig,
  } = useDocumentConditionWorkbench({
    activateConditionPanelSelection,
    activateConditionSelection,
    buildConditionField,
    clampValue,
    deleteSelectedConditions,
    documentConditionOwnerFieldKey,
    documentConditionOwnerSourceId,
    documentConditionScope,
    maxRows: CONDITION_PANEL_MAX_ROWS,
    minRows: CONDITION_PANEL_MIN_ROWS,
    isTreePaneVisible,
    leftFilterFields,
    mainFilterFields,
    selectedConditionPanelScope,
    selectedLeftFilterId,
    selectedLeftFiltersForDelete,
    selectedMainFilterId,
    selectedMainFiltersForDelete,
    setDocumentConditionScope,
    setLeftFilterFields,
    setMainFilterFields,
    setSelectedArchiveNodeId,
    setSelectedLeftFiltersForDelete,
    setSelectedMainFiltersForDelete,
    showToast,
    treeRelationColumn,
  });
  const {
    applyDetailModuleInheritanceById,
    detailSourceModuleCandidates,
    getDetailTabConfigById,
    handleDetailModuleCodeChange,
    syncDetailColumnsFromSqlById,
    updateDetailTabConfigById,
  } = useDetailGridSourceConfig({
    buildColumn,
    buildDetailTabConfig,
    buildGridConfig,
    businessType,
    currentModuleCode,
    currentModuleName,
    currentPrimaryTableName,
    detailTabConfigs,
    detailTabs,
    detailTableConfigs,
    mainTableColumns,
    mainTableConfig,
    normalizeColumn,
    normalizeDetailChartConfig,
    parseSqlFieldNames,
    resolveDetailModuleSnapshotByCode,
    restrictionTopStructures,
    setDetailTabConfigs,
    setDetailTableColumns,
    setDetailTableConfigs,
    showToast,
  });

  const selectedColumnContext = useSelectedColumnContext({
    activeTab,
    billDetailColumns,
    billDetailConfig,
    billMetaFields,
    billSourceDraft,
    billSources,
    businessType,
    buildDetailTabConfig,
    buildGridConfig,
    detailFillTypeOptions: DETAIL_FILL_TYPE_OPTIONS,
    detailFilterFields,
    detailTabConfigs,
    detailTableColumns,
    detailTableConfigs,
    detailTabs,
    getDetailFillTypeByTabId,
    getDetailFillTypeMeta,
    getSelectedConditionPanelContext,
    inspectorTarget,
    leftFilterFields,
    leftTableColumns,
    leftTableConfig,
    mainFilterFields,
    mainTableColumns,
    mainTableConfig,
    setBillDetailColumns,
    setBillDetailConfig,
    setBillMetaFields,
    setBillSourceDraft,
    setDetailFilterFields,
    setDetailTabConfigs,
    setDetailTableColumns,
    setDetailTableConfigs,
    setLeftFilterFields,
    setLeftTableColumns,
    setLeftTableConfig,
    setMainFilterFields,
    setMainTableColumns,
    setMainTableConfig,
    workspaceTheme,
  });
  const inspectorPanelProps = useDashboardInspectorPanelProps({
    DesignerWorkbenchDraggableItem,
    DesignerWorkbenchDropLane,
    activateColumnSelection,
    activateSourceGridSelection,
    activeBillSourceId,
    activeDetailBoardResize,
    activeTab,
    applyDetailModuleInheritanceById,
    billDetailColumns,
    billFormDefaultFontSize: BILL_FORM_DEFAULT_FONT_SIZE,
    billFormDefaultLabelWidth: BILL_FORM_DEFAULT_LABEL_WIDTH,
    billFormMinWidth: BILL_FORM_MIN_WIDTH,
    billHeaderWorkbenchMaxRows: BILL_HEADER_WORKBENCH_MAX_ROWS,
    billHeaderWorkbenchMinRows: BILL_HEADER_WORKBENCH_MIN_ROWS,
    billMetaFields,
    billSourceDraft,
    billSourceDraftMode,
    billSourceFieldMap,
    billSourceConfigTypeOptions: BILL_SOURCE_CONFIG_TYPE_OPTIONS,
    billSources,
    billSourceTypeOptions: BILL_SOURCE_TYPE_OPTIONS,
    buildGridColorRule,
    businessType,
    clearColumnSelection,
    columnAlignOptions: COLUMN_ALIGN_OPTIONS,
    conditionPanelControlWidth: CONDITION_PANEL_CONTROL_WIDTH,
    conditionPanelResizeMaxWidth: CONDITION_PANEL_RESIZE_MAX_WIDTH,
    conditionPanelResizeMinWidth: CONDITION_PANEL_RESIZE_MIN_WIDTH,
    createBillSourceDraft,
    currentMenuDraft,
    currentModuleCode,
    currentModuleName,
    defaultFieldSqlTagOptions: DEFAULT_FIELD_SQL_TAG_OPTIONS,
    deleteDetailTabById: removeDetailTab,
    deleteSelectedColumns,
    deleteSelectedConditions,
    designerWorkbenchSensors,
    detailBoardClipboardIds,
    detailBoardFieldDefaultWidth: DETAIL_BOARD_FIELD_DEFAULT_WIDTH,
    detailBoardThemeOptions: DETAIL_BOARD_THEME_OPTIONS,
    detailChartTypeOptions: DETAIL_CHART_TYPE_OPTIONS,
    detailFillTypeOptions: DETAIL_FILL_TYPE_OPTIONS,
    detailTableColumns,
    detailSourceModuleCandidates,
    buildDetailTabConfig,
    detailTabs,
    documentConditionOwnerSourceId,
    fieldSqlTagLabelFallbacks: FIELD_SQL_TAG_LABEL_FALLBACKS,
    fieldSqlTagOptions,
    fieldTypeOptions: FIELD_TYPE_OPTIONS,
    getBillHeaderRowCount,
    getDetailFillTypeBackendValue,
    getDetailFillTypeByTabId,
    getDetailFillTypeMeta,
    getDetailTabConfigById,
    getFieldSqlTagOptionLabel,
    getOrderedBillHeaderFields,
    gridColorRuleOperatorOptions: GRID_COLOR_RULE_OPERATOR_OPTIONS,
    handleConditionPanelFieldSelect,
    handleDetailModuleCodeChange,
    inspectorPanelTab,
    inspectorTarget,
    isGeneratingSqlDraft,
    isTranslatingIdentifiers,
    isTreeRelationFieldColumn,
    leftFilterFields,
    loadSingleTableDetailResourcesById,
    mainTableHiddenColumnsCount: mainTableHiddenColumns.length,
    mainTableColumns,
    mapFieldSqlTagToFieldType,
    normalizeColumn,
    normalizeConditionField,
    normalizeDetailChartConfig,
    normalizeDetailFillTypeValue,
    normalizeFieldSqlTagId,
    onOpenArchiveLayoutEditor: openArchiveLayoutEditor,
    onOpenConditionWorkbench: openDocumentConditionWorkbench,
    onOpenMainHiddenColumnsModal: openMainHiddenColumnsModal,
    onOpenDetailBoardPreview: openDetailBoardPreview,
    onResetDetailBoardFieldWidth: resetDetailBoardFieldWidth,
    onStartDetailBoardFieldResize: startDetailBoardFieldResize,
    parseDetailBoardClipboardColumnIds,
    renderFieldPreview,
    resolveColumnFieldSqlTagId,
    saveBillSourceDraft,
    selectedColumnContext,
    selectedDetailBoardGroupId,
    selectedDetailColorRuleId,
    selectedDetailContextMenuId,
    selectedLeftColorRuleId,
    selectedLeftContextMenuId,
    selectedMainColorRuleId,
    selectedMainContextMenuId,
    selectedPopupMenuParamKey,
    selectBillSourceDraft,
    setBillDetailColumns,
    setBillMetaFields,
    setDetailTableConfigs,
    setDetailTableColumns,
    setDetailTabConfigs,
    setDetailTabs,
    setInspectorPanelTab,
    setInspectorTarget,
    setIsGeneratingSqlDraft,
    setIsTranslatingIdentifiers,
    setLeftTableColumns,
    setLongTextEditorState,
    setMainTableColumns,
    setSelectedDetailBoardGroupId,
    setSelectedDetailColorRuleId,
    setSelectedDetailContextMenuId,
    setSelectedLeftColorRuleId,
    setSelectedLeftContextMenuId,
    setSelectedMainColorRuleId,
    setSelectedMainContextMenuId,
    setSelectedMainForDelete,
    setSelectedPopupMenuParamKey,
    setWorkspaceTheme,
    showToast,
    syncDetailColumnsFromSqlById,
    tableColumnResizeMinWidth: TABLE_COLUMN_RESIZE_MIN_WIDTH,
    tableTypeOptions: TABLE_TYPE_OPTIONS,
    toRecordText,
    treeRelationColumn,
    updateBillHeaderWorkbenchRows,
    updateBillSourceDraft,
    updateDetailTabConfigById,
    workspaceTheme,
    workspaceThemeVars,
  });
  const columnOperationPanel = <InspectorPanelRouter {...inspectorPanelProps} />;

  const dashboardConfigBridgeNodes = buildDashboardConfigBridgeNodes({
    workspace: buildDashboardConfigBridgeWorkspaceInput({
      archiveLayoutState: {
        currentDetailBoard: normalizedMainDetailBoardConfig,
        currentModuleCode,
        isOpen: isArchiveLayoutEditorOpen,
        mainTableColumns,
      },
      archiveLayoutActions: {
        onClose: () => setIsArchiveLayoutEditorOpen(false),
        onShowToast: showToast,
        onUpdateDetailBoard: updateMainDetailBoard,
      },
      archiveLayoutHelpers: {
        normalizeColumn,
        renderFieldPreview,
      },
      conditionWorkbenchState: {
        activeScope: activeDocumentConditionScope,
        canSwitchScope: Boolean(leftDocumentConditionConfig),
        isOpen: isDocumentConditionWorkbenchOpen,
        mainConfig: mainDocumentConditionConfig,
        leftConfig: leftDocumentConditionConfig,
      },
      conditionWorkbenchActions: {
        onClose: () => setIsDocumentConditionWorkbenchOpen(false),
        onScopeSwitch: handleDocumentConditionScopeSwitch,
        onActivatePanel: activateConditionPanelSelection,
      },
      conditionWorkbenchRuntime: {
        renderFieldPreview,
        resize: conditionWorkbenchResizeApi,
        helpers: conditionWorkbenchHelpers,
        metrics: conditionWorkbenchMetrics,
      },
      contextMenuState: {
        builderSelectionContextMenu: builderSelectionContextMenu as any,
        previewContextMenu: previewContextMenu as any,
      },
      contextMenuActions: {
        deleteSelectedColumns,
        deleteSelectedConditions,
        setBuilderSelectionContextMenu,
        setPreviewContextMenu,
        showToast,
      },
      longTextEditor: {
        state: longTextEditorState,
        onStateChange: setLongTextEditorState,
      },
    }),
    moduleSetting: buildDashboardConfigBridgeModuleSettingInput({
      container: {
        moduleSettingsSectionRef,
      },
      commonState: {
        activeResize,
        activeTab,
        businessType,
        currentModuleName,
        currentDetailFillType,
        currentDetailFillTypeValue,
        detailTabs,
        detailWebUrl: activeDetailWebUrl,
        inspectorPaneWidth,
        isConfigFullscreenActive,
        isTreePaneVisible,
        moduleSettingStageHeightClass,
        moduleSettingStageStyle,
        treeRelationColumn,
        workspaceTheme,
        workspaceThemeStyles,
        workspaceThemeVars,
      },
      commonNodes: {
        archiveMainTableBuilderNode,
        billDocumentWorkbenchNode,
        columnOperationPanel,
      },
      commonActions: {
        addTab,
        onActivateDetailTab: activateDetailWorkbenchTab,
        onActivateTableConfig: activateTableConfigSelection,
        onOpenMainHiddenColumnsModal: openMainHiddenColumnsModal,
        onToggleFullscreen: () => setIsFullscreenConfig((prev) => !prev),
        setBuilderSelectionContextMenu,
        setInspectorPanelTab,
        setSelectedArchiveNodeId,
      },
      commonHelpers: {
        renderFieldPreview,
      },
      document: {
        documentDetailTableBuilderNode,
        documentLeftPaneWidth,
        documentTreeTableBuilderNode,
        handlePasteColumns,
        mainTableHiddenColumnsCount: mainTableHiddenColumns.length,
        onStartDocumentLeftResize: startDocumentLeftResize,
        setDetailTableColumns,
        setLeftTableColumns,
        setMainTableColumns,
      },
      tree: {
        autoFitColumnWidth,
        buildColumn,
        buildConditionField,
        buildDocumentFilterRuntimeRules,
        builderDetailTableBuilderNode,
        builderLeftTableBuilderNode,
        builderMainTableBuilderNode,
        conditionPanelControlWidth: CONDITION_PANEL_CONTROL_WIDTH,
        conditionPanelResizeMaxWidth: CONDITION_PANEL_RESIZE_MAX_WIDTH,
        conditionPanelResizeMinWidth: CONDITION_PANEL_RESIZE_MIN_WIDTH,
        deleteSelectedColumns,
        deleteSelectedConditions,
        deleteTab,
        onActivateCondition: activateConditionSelection,
        isDetailFillSelected: inspectorTarget.kind === 'detail-grid' && inspectorTarget.id === currentDetailFillTypeValue,
        isDetailViewSelected: inspectorTarget.kind === 'detail-grid' && inspectorTarget.id === currentDetailFillTypeValue,
        isSingleTableSyncing: isTreeMainTableSyncing,
        mainDocumentFilterRuntimeRules,
        mainFilterFields,
        mainTableColumns,
        selectedDetailForDelete,
        selectedLeftForDelete,
        selectedMainFilterId,
        selectedMainFiltersForDelete,
        selectedMainForDelete,
        setMainFilterFields,
        setSelectedMainFiltersForDelete,
        startResize,
      },
    }),
    restriction: {
      builders: {
        buildRestrictionMeasure,
        buildRestrictionNumberRule,
        buildRestrictionProcessDesign,
        buildRestrictionTopStructure,
      },
      setters: {
        setRestrictionActiveTab,
        setRestrictionMeasures,
        setRestrictionNumberRules,
        setRestrictionProcessDesigns,
        setRestrictionSelection,
        setRestrictionTopStructures,
      },
      state: {
        currentModuleName,
        restrictionActiveTab,
        restrictionMeasures,
        restrictionNumberRules,
        restrictionProcessDesigns,
        restrictionSelection,
        restrictionTopStructures,
      },
        ui: {
          onOpenLongTextEditor: setLongTextEditorState,
          onSaveRestrictionTab: handleSaveRestrictionTab,
          showToast,
          workspaceThemeTableSurfaceClass: workspaceThemeStyles.tableSurface,
          workspaceThemeVars,
        },
    },
    modals: buildDashboardConfigBridgeModalsInput({
      deleteFlowState: {
        deletingMenuId,
        pendingDeleteMenu,
      },
      deleteFlowHelpers: {
        getMenuModuleTypeProfile,
        normalizeMenuCode,
        normalizeMenuTitle,
      },
      deleteFlowActions: {
        onCloseDeleteConfirm: () => setPendingDeleteMenu(null),
        onConfirmDelete: () => {
          if (!pendingDeleteMenu) return;
          void handleSecondLevelMenuDelete(pendingDeleteMenu);
        },
      },
      detailBoardState: {
        detailBoardConfig: normalizedMainDetailBoardConfig,
        detailBoardSortColumnId,
        isDetailBoardOpen,
        mainTableColumns,
        workspaceTheme,
        workspaceThemeVars,
      },
      detailBoardActions: {
        onCloseDetailBoard: () => setIsDetailBoardOpen(false),
        onResetDetailBoardFieldHeight: resetDetailBoardFieldHeight,
        onResetDetailBoardFieldWidth: resetDetailBoardFieldWidth,
        onStartDetailBoardFieldHeightResize: startDetailBoardFieldHeightResize,
        onStartDetailBoardFieldResize: startDetailBoardFieldResize,
      },
      detailBoardHelpers: {
        getDetailBoardFieldLiveHeight,
        getDetailBoardFieldLiveWidth,
        getLayoutFieldWorkbenchMeta,
        renderFieldPreview,
      },
      hiddenColumnsState: {
        hiddenColumns: mainTableHiddenColumns,
        isMainHiddenColumnsModalOpen,
        mainHiddenColumnsSearchText,
        selectedHiddenColumnIds: selectedMainHiddenColumnIds,
        workspaceThemeVars,
      },
      hiddenColumnsActions: {
        closeMainHiddenColumnsModal,
        onRestoreAllHiddenColumns: () => restoreMainHiddenColumns(mainTableHiddenColumns.map((column) => column.id)),
        onRestoreSelectedHiddenColumns: () => restoreMainHiddenColumns(),
        onSearchHiddenColumnsTextChange: setMainHiddenColumnsSearchText,
        onSelectFilteredHiddenColumns: setSelectedMainHiddenColumnIds,
        onToggleHiddenColumnSelection: toggleMainHiddenColumnSelection,
      },
      hiddenColumnsHelpers: {
        normalizeColumn,
      },
    }),
    wizard: {
      modal: {
        chrome: {
          activeConfigMenuId: activeConfigMenu?.id ?? null,
          canGoBack: !(configStep === 1 || (activeConfigMenu !== null && configStep === 2)),
          completedSteps,
          configStep,
          configSteps,
          isConfigFullscreenActive,
          isMenuInfoLoading,
          isMenuInfoSaving,
          isModuleSettingStep,
          modulePreviewStep: MODULE_PREVIEW_STEP,
          processDesignStep: PROCESS_DESIGN_STEP,
          moduleSettingStep: MODULE_SETTING_STEP,
          nextDisabled: (configStep === 2 && (isMenuInfoLoading || isMenuInfoSaving || activeConfigMenu === null))
            || (configStep + 1 >= MODULE_SETTING_STEP && !isMenuInfoBuilt)
            || (configStep === MODULE_SETTING_STEP && (isSingleTableModuleEnsuring || isSingleTableModuleSettingsSaving)),
          nextLabel: configStep === MODULE_PREVIEW_STEP ? '完成配置' : '下一步',
          restrictionStep: RESTRICTION_STEP,
          saveDisabled: (configStep === 2 && (isMenuInfoLoading || isMenuInfoSaving))
            || (configStep === MODULE_SETTING_STEP && (isSingleTableModuleEnsuring || isSingleTableModuleSettingsSaving)),
          saveLabel: configStep === 2 && isMenuInfoSaving
            ? (activeConfigMenu ? '保存中...' : '创建中...')
            : configStep === MODULE_SETTING_STEP && isSingleTableModuleSettingsSaving
              ? '保存中...'
              : '保存本页',
          showFullscreenToggle: configStep === MODULE_SETTING_STEP
            || configStep === RESTRICTION_STEP
            || configStep === PROCESS_DESIGN_STEP
            || configStep === MODULE_PREVIEW_STEP,
        },
        actions: {
          handleConfigNext,
          handleConfigPrevious,
          handleConfigStepSelect,
          handleLockedTypeStepSelect,
          onClose: closeConfigWizard,
          onSave: () => {
            void handleConfigPageSave();
          },
          onToggleFullscreen: () => setIsFullscreenConfig((prev) => !prev),
        },
        overlays: {},
        stepNodes: {
          menuInfoNode: configWizardStepNodes.menuInfoNode,
          moduleIntroEditorNode: configWizardStepNodes.moduleIntroEditorNode,
          modulePreviewNode: configWizardStepNodes.modulePreviewNode,
          processDesignNode: configWizardStepNodes.processDesignNode,
          moduleTypeSelectionNode: configWizardStepNodes.moduleTypeSelectionNode,
          surveyPlanningNode: configWizardStepNodes.surveyPlanningNode,
        },
      },
    },
  });

  const researchRecordWorkbenchNode = (
    <ResearchRecordWorkbench
      activeFirstLevelMenuName={activeFirstLevelMenuName}
      activeSubsystemName={activeSubsystemName}
      availableModules={researchCaptureModules}
      currentUserName={currentUserName}
      onExit={() => setActiveWorkbench('modules')}
      onShowToast={showToast}
      storageKey={researchRecordStorageKey}
    />
  );

  if (isResearchRecordActive) {
    return (
      <div className="h-screen overflow-hidden bg-white text-slate-900 dark:bg-background-dark dark:text-slate-100 font-sans">
        <main className="h-full w-full">
          {researchRecordWorkbenchNode}
        </main>

        {dashboardConfigBridgeNodes.deleteConfirmNode}

        <ConfigWizardModalShell
          open={isConfigOpen}
          isFullscreenConfigActive={isConfigFullscreenActive}
          isModulePreviewStep={configStep === MODULE_PREVIEW_STEP}
          isModuleSettingStep={isModuleSettingStep}
          onClose={closeConfigWizard}
          toastMessage={toastMessage}
          overlayNodes={dashboardConfigBridgeNodes.configWizardModalNodes.overlayNodes}
          sidebarNode={dashboardConfigBridgeNodes.configWizardModalNodes.sidebarNode}
          bodyNode={dashboardConfigBridgeNodes.configWizardModalNodes.bodyNode}
          footerNode={dashboardConfigBridgeNodes.configWizardModalNodes.footerNode}
        />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0">
        {/* Brand Logo */}
        <div className="p-6 flex items-center gap-3">
          <div className="size-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
            <span className="material-symbols-outlined text-2xl">rocket_launch</span>
          </div>
          <div className="flex flex-col">
            <h1 className="text-slate-900 dark:text-white text-lg font-bold leading-tight tracking-tight">朗速 AI</h1>
            <p className="text-primary text-[10px] font-bold tracking-wider">模块工作台</p>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
          <a className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" href="#">
            <span className="material-symbols-outlined text-xl">dashboard</span>
            <span className="text-sm font-medium">控制台</span>
          </a>

          {/* Expanded Subsystem Section */}
          <div className="space-y-1 pt-2">
            <button 
              onClick={() => setIsSubsystemOpen(!isSubsystemOpen)}
              className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-primary/10 text-primary transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-xl">account_tree</span>
                <span className="text-sm font-bold">子系统配置</span>
              </div>
              <motion.span 
                animate={{ rotate: isSubsystemOpen ? 180 : 0 }}
                className="material-symbols-outlined text-sm"
              >
                keyboard_arrow_down
              </motion.span>
            </button>

            <AnimatePresence>
              {isSubsystemOpen && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="ml-4 pl-4 border-l border-slate-200 dark:border-slate-800 space-y-1 overflow-hidden"
                >
                  {menuLoadError ? (
                    <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-600">
                      <div>{menuLoadError}</div>
                      <button
                        type="button"
                        onClick={() => void loadSubsystemMenus()}
                        className="mt-2 font-semibold text-rose-700 transition-colors hover:text-rose-800"
                      >
                        重新加载
                      </button>
                    </div>
                  ) : null}

                  <div className="ml-2 mt-2 space-y-1">
                    {subsystemMenus.map((subsystem) => {
                      const isExpanded = expandedSubsystemId === subsystem.id;
                      const subsystemFirstLevelMenus = getEnabledMenuNodes<BackendMenuNode>(subsystem.children);
                      const isCurrentSubsystem = activeSubsystem === subsystem.id;

                      return (
                        <div key={subsystem.id} className="space-y-1">
                          <button
                            onClick={() => toggleSubsystemExpansion(subsystem.id)}
                            className={`w-full flex items-center justify-between gap-3 rounded-lg px-3 py-2 transition-colors ${
                              isCurrentSubsystem || isExpanded
                                ? 'bg-primary/5 text-primary'
                                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <span className="material-symbols-outlined text-lg">account_tree</span>
                              <span className="truncate text-sm font-semibold">{normalizeMenuTitle(subsystem.title)}</span>
                            </div>
                            <span className="material-symbols-outlined text-base">
                              {isExpanded ? 'expand_more' : 'chevron_right'}
                            </span>
                          </button>

                          {isExpanded ? (
                            <div className="ml-4 space-y-1 border-l border-slate-200 pl-3 dark:border-slate-800">
                              {subsystemFirstLevelMenus.length > 0 ? (
                                subsystemFirstLevelMenus.map((menu) => {
                                  const isFirstLevelActive =
                                    activeSubsystem === subsystem.id && activeFirstLevelMenuId === menu.id;

                                  return (
                                    <button
                                      key={menu.id}
                                      onClick={() => handleFirstLevelMenuClick(subsystem.id, menu)}
                                      className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                                        isFirstLevelActive
                                          ? 'bg-primary text-white shadow-sm'
                                          : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                                      }`}
                                    >
                                      <span className="material-symbols-outlined text-base">folder_open</span>
                                      <span className="truncate text-sm font-medium">{normalizeMenuTitle(menu.title)}</span>
                                    </button>
                                  );
                                })
                              ) : (
                                <div className="px-3 py-2 text-xs text-slate-400">当前子系统下暂无一级菜单</div>
                              )}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}

                    {isLoadingSubsystemMenus ? (
                      <div className="px-3 py-2 text-xs text-slate-400">正在加载子系统菜单...</div>
                    ) : null}

                    {!isLoadingSubsystemMenus && subsystemMenus.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-slate-400">暂无子系统菜单</div>
                    ) : null}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="pt-2 space-y-1">
            <button
              type="button"
              onClick={() => setActiveWorkbench('research-record')}
              className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
                isResearchRecordActive
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              <span className="material-symbols-outlined text-xl">assignment</span>
              <span className="text-sm font-medium">调研记录</span>
            </button>
          </div>

          <div className="pt-2 space-y-1">
            <a className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" href="#">
              <span className="material-symbols-outlined text-xl">schema</span>
              <span className="text-sm font-medium">表单流程</span>
            </a>
            <a className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" href="#">
              <span className="material-symbols-outlined text-xl">smart_toy</span>
              <span className="text-sm font-medium">AI 生成</span>
            </a>
            <a className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" href="#">
              <span className="material-symbols-outlined text-xl">menu_book</span>
              <span className="text-sm font-medium">知识中心</span>
            </a>
          </div>
        </nav>

        {/* User Info */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 relative">
          <button 
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <div className="flex min-w-0 items-center gap-3 text-left">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-white bg-[linear-gradient(135deg,#eff6ff,#dbeafe)] text-sm font-black text-primary shadow-sm dark:border-slate-700 dark:bg-[linear-gradient(135deg,#1e293b,#334155)] dark:text-sky-200">
                {currentUserAvatarText}
              </div>
              <span className="block truncate text-sm font-bold text-slate-900 dark:text-white">{currentUserName}</span>
            </div>
            <span className="material-symbols-outlined text-slate-400 text-sm">more_vert</span>
          </button>

          <AnimatePresence>
            {isProfileOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute bottom-full left-4 right-4 mb-2 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden z-50"
              >
                <button 
                  onClick={onLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">logout</span>
                  <span className="font-medium">退出登录</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden bg-background-light dark:bg-background-dark">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-8 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 z-10 shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {isResearchRecordActive ? '调研记录工作台' : '模块配置工作台'}
            </h2>
            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-2"></div>
            <nav className="flex items-center gap-2 text-[13px] text-slate-500">
              <span className="hover:text-primary transition-colors cursor-pointer">
                {activeSubsystemName}
              </span>
              {activeFirstLevelMenuName ? (
                <>
                  <span className="material-symbols-outlined text-[16px] text-slate-400">chevron_right</span>
                  <span className="text-slate-900 dark:text-slate-200 font-semibold tracking-tight">
                    {activeFirstLevelMenuName}
                  </span>
                </>
              ) : null}
              {isResearchRecordActive ? (
                <>
                  <span className="material-symbols-outlined text-[16px] text-slate-400">chevron_right</span>
                  <span className="text-slate-900 dark:text-slate-200 font-semibold tracking-tight">调研记录</span>
                </>
              ) : null}
            </nav>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative group">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg transition-colors group-focus-within:text-primary">search</span>
              <input className="pl-10 pr-4 py-2 bg-slate-100/50 dark:bg-slate-800/50 border border-transparent focus:border-primary/30 focus:bg-white dark:focus:bg-slate-800 rounded-lg text-sm w-72 transition-all outline-none" placeholder="搜索模块名称、编码或状态..." type="text" />
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 text-slate-500 hover:text-primary transition-colors relative">
                <span className="material-symbols-outlined text-[22px]">notifications</span>
                <span className="absolute top-2 right-2 size-2 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900"></span>
              </button>
              <button className="p-2 text-slate-500 hover:text-primary transition-colors">
                <span className="material-symbols-outlined text-[22px]">settings</span>
              </button>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="flex-1 overflow-y-auto p-8 lg:p-10 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={isResearchRecordActive ? `research-record:${researchRecordStorageKey}` : activeMenu}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="h-full flex flex-col"
            >
              <DashboardOverview
                activeFirstLevelMenuName={activeFirstLevelMenuName}
                activeMenuCode={activeMenuCode}
                activeMenuCodePrefix={activeMenuCodePrefix}
                activeMenuName={activeMenuName}
                activeSubsystemName={activeSubsystemName}
                cardStyles={secondLevelMenuCardStyles}
                deletingMenuId={deletingMenuId}
                getMenuModuleTypeProfile={getMenuModuleTypeProfile}
                isLoadingSecondLevelMenus={isLoadingSecondLevelMenus}
                isUseflagEnabled={isUseflagEnabled}
                menus={secondLevelMenus}
                normalizeMenuCode={normalizeMenuCode}
                normalizeMenuTitle={normalizeMenuTitle}
                onConfigureMenu={handleSecondLevelMenuConfig}
                onCreateModule={openNewModuleGuide}
                onDeleteMenu={setPendingDeleteMenu}
                secondLevelMenuCount={secondLevelMenuCount}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {dashboardConfigBridgeNodes.deleteConfirmNode}

      <ConfigWizardModalShell
        open={isConfigOpen}
        isFullscreenConfigActive={isConfigFullscreenActive}
        isModulePreviewStep={configStep === MODULE_PREVIEW_STEP}
        isModuleSettingStep={isModuleSettingStep}
        onClose={closeConfigWizard}
        toastMessage={toastMessage}
        overlayNodes={dashboardConfigBridgeNodes.configWizardModalNodes.overlayNodes}
        sidebarNode={dashboardConfigBridgeNodes.configWizardModalNodes.sidebarNode}
        bodyNode={dashboardConfigBridgeNodes.configWizardModalNodes.bodyNode}
        footerNode={dashboardConfigBridgeNodes.configWizardModalNodes.footerNode}
      />
    </div>
  );
}
