import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMemo } from 'react';
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  BarChart3,
  CalendarDays,
  ChevronDown,
  FileSpreadsheet,
  Filter,
  FolderTree,
  Globe,
  LayoutPanelTop,
  Plus,
  Search,
  Save,
  Table2,
  Trash2,
  X,
} from 'lucide-react';
import {
  fetchSubsystemMenuTree,
  fetchSubsystemSecondLevelMenus,
  type BackendMenuNode,
  type BackendSubsystemNode,
} from '../lib/backend-menus';
import {
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
  type FieldSqlTagOptionDto,
} from '../lib/backend-system';
import { requestIdentifierTranslation, requestSqlDraft, requestSurveyPlan, type SurveyPlan } from '../lib/minimax';
import {
  getShadcnTabTriggerClass,
  shadcnFieldClass,
  shadcnInfoCardClass,
  shadcnMutedLabelClass,
  shadcnPanelBadgeClass,
  shadcnPanelHeaderClass,
  shadcnPanelIconShellClass,
  shadcnPanelShellClass,
  shadcnPanelTitleClass,
  shadcnSectionCardClass,
  shadcnSectionTitleClass,
  shadcnTabListClass,
  shadcnTextareaClass,
} from './ui/shadcn-inspector';
import {
  resolveWorkbenchPreviewWidth,
  updateItemWidthById,
  useWorkbenchResizeState,
  type ActiveWorkbenchResize,
  type WorkbenchResizeMode,
} from '../features/dashboard/resize/use-workbench-resize-state';
import {
  designerWorkbenchRowActiveClass,
  designerWorkbenchRowEmptyClass,
} from '../features/dashboard/designer/control-item-classes';
import {
  createRuntimeClassName,
  createRuntimeDeclarationBlock,
  joinRuntimeDeclarationBlocks,
} from '../features/dashboard/designer/runtime-dimension-rules';
import { cn } from '../lib/utils';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

interface DashboardProps {
  currentUserName: string;
  onLogout: () => void;
}

type BusinessType = 'document' | 'table' | 'tree';
type RestrictionConfigTabId =
  | 'guard'
  | 'number'
  | 'structure'
  | 'process';
type BillSourceEntry = {
  id: string;
  configType: string;
  sourceName: string;
  sourceSql: string;
  sourceDetail: string;
  sourceType: string;
};
type BillCanvasFieldScope = 'main' | 'meta';
type BillFieldGuideLine = {
  orientation: 'vertical' | 'horizontal';
  position: number;
  start: number;
  end: number;
  kind: 'align' | 'spacing';
};
type BillFieldGapGuide = {
  orientation: 'horizontal' | 'vertical';
  start: number;
  end: number;
  cross: number;
  label: string;
};
type BillFieldGuideState = {
  lines: BillFieldGuideLine[];
  gap: BillFieldGapGuide | null;
};
type ConditionWorkbenchConfig = {
  rows: number;
  bulkDraft: string;
};
type BillHeaderWorkbenchConfig = {
  rows: number;
};
type BillFieldBounds = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
  centerX: number;
  centerY: number;
};
type BillSnapCandidate = {
  value: number;
  line: BillFieldGuideLine | null;
  gap: BillFieldGapGuide | null;
  priority: number;
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
type ConditionWorkbenchScope = 'main' | 'left';
type ConditionWorkbenchDragData =
  | {
    type: 'condition-item';
    scope: ConditionWorkbenchScope;
    row: number;
    fieldId: string;
  }
  | {
    type: 'condition-row';
    scope: ConditionWorkbenchScope;
    row: number;
  };
type BillHeaderWorkbenchDragData =
  | {
    type: 'bill-header-item';
    fieldId: string;
    row: number;
    scope: BillCanvasFieldScope;
  }
  | {
    type: 'bill-header-row';
    row: number;
  };
type DetailBoardWorkbenchDragData =
  | {
    type: 'detail-board-item';
    fieldId: string;
    groupId: string;
    row: number;
  }
  | {
    type: 'detail-board-row';
    groupId: string;
    row: number;
  };

function getConditionDragItemId(scope: ConditionWorkbenchScope, fieldId: string) {
  return `condition-item:${scope}:${fieldId}`;
}

function getConditionDropItemId(scope: ConditionWorkbenchScope, fieldId: string) {
  return `condition-drop:${scope}:${fieldId}`;
}

function getConditionRowDropId(scope: ConditionWorkbenchScope, row: number) {
  return `condition-row:${scope}:${row}`;
}

function isConditionWorkbenchDragData(value: unknown): value is ConditionWorkbenchDragData {
  if (!value || typeof value !== 'object') {
    return false;
  }

  return 'type' in value && 'scope' in value && 'row' in value;
}

function getBillHeaderDragItemId(fieldId: string, scope: BillCanvasFieldScope) {
  return `bill-header-item:${scope}:${fieldId}`;
}

function getBillHeaderDropItemId(fieldId: string, scope: BillCanvasFieldScope) {
  return `bill-header-drop:${scope}:${fieldId}`;
}

function getBillHeaderRowDropId(row: number) {
  return `bill-header-row:${row}`;
}

function isBillHeaderWorkbenchDragData(value: unknown): value is BillHeaderWorkbenchDragData {
  if (!value || typeof value !== 'object') {
    return false;
  }

  return 'type' in value && 'row' in value;
}

function getDetailBoardDragItemId(groupId: string, fieldId: string) {
  return `detail-board-item:${groupId}:${fieldId}`;
}

function getDetailBoardDropItemId(groupId: string, fieldId: string) {
  return `detail-board-drop:${groupId}:${fieldId}`;
}

function getDetailBoardRowDropId(groupId: string, row: number) {
  return `detail-board-row:${groupId}:${row}`;
}

function isDetailBoardWorkbenchDragData(value: unknown): value is DetailBoardWorkbenchDragData {
  if (!value || typeof value !== 'object') {
    return false;
  }

  return 'type' in value && 'groupId' in value && 'row' in value;
}

class ConditionWorkbenchPointerSensor extends PointerSensor {
  static activators = [
    {
      eventName: 'onPointerDown' as const,
      handler: ({ nativeEvent }: React.PointerEvent<Element>) => {
        if (!nativeEvent.isPrimary || nativeEvent.button !== 0) {
          return false;
        }

        const target = nativeEvent.target;
        return !(target instanceof HTMLElement && target.closest('[data-condition-resize-handle="true"]'));
      },
    },
  ];
}

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

function getCompactWorkbenchItemClass(options?: {
  dragging?: boolean;
  insertTarget?: boolean;
  selected?: boolean;
}) {
  const isSelected = options?.selected || options?.insertTarget;

  return cn(
    'group relative flex shrink-0 select-none flex-row items-center gap-2 rounded-md border px-2 py-1.5 text-left transition-colors',
    options?.dragging ? 'z-20 cursor-grabbing border-primary/35 bg-background/95 shadow-lg shadow-primary/10' : 'cursor-grab active:cursor-grabbing',
    options?.dragging
      ? 'border-primary/35 bg-background/95 shadow-lg shadow-primary/10'
      : isSelected
        ? 'border-primary/30 bg-background/95 shadow-[inset_0_0_0_1px_rgba(37,99,235,0.08)]'
        : 'border-transparent bg-transparent hover:border-border/40 hover:bg-background/70',
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

type ConditionWorkbenchDropLaneProps = {
  children: React.ReactNode;
  className: string;
  key?: React.Key;
  row: number;
  scope: ConditionWorkbenchScope;
};

function ConditionWorkbenchDropLane({
  children,
  className,
  row,
  scope,
}: ConditionWorkbenchDropLaneProps): React.JSX.Element {
  const { setNodeRef } = useDroppable({
    id: getConditionRowDropId(scope, row),
    data: {
      type: 'condition-row',
      scope,
      row,
    } satisfies ConditionWorkbenchDragData,
  });

  return (
    <div ref={setNodeRef} className={className}>
      {children}
    </div>
  );
}

type ConditionWorkbenchDraggableItemProps = {
  children: React.ReactNode;
  className: string;
  fieldId: string;
  key?: React.Key;
  onClick: (event: React.MouseEvent<HTMLDivElement>) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void;
  row: number;
  scope: ConditionWorkbenchScope;
};

function ConditionWorkbenchDraggableItem({
  children,
  className,
  fieldId,
  onClick,
  onKeyDown,
  row,
  scope,
}: ConditionWorkbenchDraggableItemProps): React.JSX.Element {
  const { attributes, listeners, setNodeRef: setDragNodeRef, transform } = useDraggable({
    id: getConditionDragItemId(scope, fieldId),
    data: {
      type: 'condition-item',
      scope,
      row,
      fieldId,
    } satisfies ConditionWorkbenchDragData,
  });
  const { setNodeRef: setDropNodeRef } = useDroppable({
    id: getConditionDropItemId(scope, fieldId),
    data: {
      type: 'condition-item',
      scope,
      row,
      fieldId,
    } satisfies ConditionWorkbenchDragData,
  });
  const setNodeRef = (node: HTMLDivElement | null) => {
    setDragNodeRef(node);
    setDropNodeRef(node);
  };
  const dragStyle = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      data-condition-item-id={fieldId}
      role="button"
      tabIndex={0}
      className={className}
      style={dragStyle}
      onClick={onClick}
      onKeyDown={onKeyDown}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
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

  return FIELD_SQL_TAG_LABEL_FALLBACKS[optionId] || rawLabel || `类型 ${optionId}`;
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
  const rawFieldSqlTag = getRecordFieldValue(column, 'fieldsqltag', 'fieldSqlTag');
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
  const placeholder = toRecordText(getRecordFieldValue(field, 'placeholder', 'prompttext', 'promptText'));
  const relationSql = toRecordText(getRecordFieldValue(field, 'relationsql', 'relationSql'));
  const dynamicSql = toRecordText(getRecordFieldValue(field, 'dynamicsql', 'dynamicSql', 'fieldsql', 'fieldSql'));
  const helpText = toRecordText(getRecordFieldValue(field, 'helptext', 'helpText', 'remark', 'memo'));
  const defaultValue = toRecordText(getRecordFieldValue(field, 'defaultdate', 'defaultDate', 'defaultvalue', 'defaultValue'));
  const fieldSqlTag = normalizeFieldSqlTagId(getRecordFieldValue(field, 'fieldsqltag', 'fieldSqlTag'), 0);
  const fieldSqlTagName = toRecordText(getRecordFieldValue(field, 'fieldsqltagname', 'fieldSqlTagName', 'showname', 'showName'));
  const visibleValue = getRecordFieldValue(field, 'visible', 'isVisible', 'showmobile', 'showMobile');
  const requiredValue = getRecordFieldValue(field, 'required', 'isneed', 'isNeed', 'mustinput', 'mustInput');
  const readonlyValue = getRecordFieldValue(field, 'readonly', 'readOnly', 'isreadonly', 'isReadOnly');
  const searchableValue = getRecordFieldValue(field, 'searchable', 'isquery', 'isQuery', 'queryable');

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
    visible: toRecordBoolean(visibleValue, true),
    searchable: toRecordBoolean(searchableValue, false),
    readonly: toRecordBoolean(readonlyValue, false),
    placeholder,
    defaultValue,
    dictCode: toRecordText(getRecordFieldValue(field, 'dictcode', 'dictCode')),
    formula: toRecordText(getRecordFieldValue(field, 'formula')),
    relationSql,
    dynamicSql,
    helpText,
  });
}
type RestrictionMeasureItem = {
  id: string;
  businessCategory: string;
  eventType: string;
  stepCode: string;
  judgeRule: string;
  syncAction: string;
  description: string;
  hint: string;
  order: number;
  enabled: boolean;
  confirmRequired: boolean;
  applyDate: string;
  applyUser: string;
};
type RestrictionNumberRuleItem = {
  id: string;
  moduleCode: string;
  sortOrder: number;
  enabled: boolean;
  sequencePermission: boolean;
  segmentType: string;
  segmentValue: string;
  lengthLimit: number;
  separator: string;
  inputDate: string;
  creator: string;
};
type RestrictionProcessDesignItem = {
  id: string;
  planValue: string;
  businessCode: string;
  schemeCode: string;
  schemeName: string;
  permissionScope: string;
  businessType: string;
  actionDescription: string;
};
type RestrictionTopStructureItem = {
  id: string;
  mainModuleCode: string;
  tableName: string;
  tableDesc: string;
  remark: string;
  rowId: number;
  moduleCode: string;
  moduleType: string;
  moduleSchema: string;
  fieldPrefix: string;
  sequencePrefix: string;
  sequenceRule: string;
  orderLength: number;
  relationField: string;
};
type RestrictionElementRow = {
  id: string;
  sourceId: string;
  scope: 'base' | 'bill-head' | 'bill-meta' | 'bill-detail';
  fieldName: string;
  fieldKey: string;
  controlType: string;
  sourceTable: string;
  required: boolean;
  visible: boolean;
  readonly: boolean;
  dynamicSql: string;
  helpText: string;
  ownerLabel: string;
};
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
const RESTRICTION_BUSINESS_CATEGORY_OPTIONS = ['业务处理', '业务判断', '流程控制', '辅助校验'];
const RESTRICTION_EVENT_TYPE_OPTIONS = ['保存时', '保存后', '提交前', '提交后', '终审时', '终审退返时'];
const RESTRICTION_SEGMENT_TYPE_OPTIONS = ['固定字符串', '两位年', '月', '日', '顺序号', '字段值', '自定义SQL'];
const MODULE_SETTING_STEP = 5;
const RESTRICTION_STEP = 6;
const MODULE_PREVIEW_STEP = 7;
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
const DETAIL_BOARD_GROUP_MIN_ROWS = 1;
const DETAIL_BOARD_GROUP_MAX_ROWS = 6;
const DETAIL_BOARD_FIELD_DEFAULT_WIDTH = 280;
const DETAIL_BOARD_FIELD_MIN_WIDTH = 220;
const DETAIL_BOARD_FIELD_MAX_WIDTH = 920;
const DETAIL_BOARD_FIELD_DEFAULT_HEIGHT = 52;
const DETAIL_BOARD_TALL_FIELD_DEFAULT_HEIGHT = 96;
const DETAIL_BOARD_TALL_FIELD_MIN_HEIGHT = 88;
const DETAIL_BOARD_TALL_FIELD_MAX_HEIGHT = 340;
const ARCHIVE_LAYOUT_LANE_GAP = 8;
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
const BILL_FORM_SNAP_SIZE = 8;
const BILL_FORM_ALIGN_THRESHOLD = 10;
const WIDTH_RESIZE_SNAP_THRESHOLD = 10;
const WIDTH_RESIZE_GRID_STEP = 4;
const EMPTY_BILL_FIELD_GUIDES: BillFieldGuideState = {
  lines: [],
  gap: null,
};

const DETAIL_FILL_TYPE_OPTIONS = [
  { value: '表格', label: '表格', icon: 'table_rows', description: '适合字段型明细维护' },
  { value: '树表格', label: '树表格', icon: 'account_tree', description: '适合层级型明细展示' },
  { value: '图表', label: '图表', icon: 'bar_chart', description: '适合统计型结果呈现' },
  { value: '网页', label: '网页', icon: 'language', description: '适合外部页面嵌入' },
];
const DETAIL_CHART_TYPE_OPTIONS = [
  { value: '0', label: '柱形图' },
  { value: '1', label: '折线图' },
  { value: '2', label: '圆饼图' },
  { value: '3', label: '条形图' },
  { value: '4', label: '面积图' },
];
const DETAIL_BOARD_THEME_OPTIONS = [
  { value: 'aurora', label: '星雾玻璃', hint: '蓝青渐层，适合主档详情' },
  { value: 'sunset', label: '日落暖光', hint: '暖橙层次，更偏业务看板' },
  { value: 'jade', label: '青玉留白', hint: '轻绿色块，适合信息分组' },
];
const DETAIL_BOARD_THEME_STYLES: Record<string, {
  tableSurface: string;
  tableCanvas: string;
  badge: string;
  hero: string;
  heroBadge: string;
  groupShell: string;
  groupLabel: string;
  groupMetric: string;
  groupItem: string;
  groupValue: string;
  listCard: string;
}> = {
  aurora: {
    tableSurface: 'bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.08),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.1),transparent_28%)]',
    tableCanvas: 'bg-[radial-gradient(circle_at_top_left,rgba(191,219,254,0.36),transparent_34%),linear-gradient(180deg,rgba(245,250,255,0.98),rgba(249,252,255,0.96))]',
    badge: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-400/20 dark:bg-sky-500/10 dark:text-sky-200',
    hero: 'border-[#d7e7fb] bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_38%),linear-gradient(160deg,rgba(239,246,255,0.96),rgba(255,255,255,0.98))]',
    heroBadge: 'bg-white/88 text-sky-700 dark:bg-slate-900/72 dark:text-sky-200',
    groupShell: 'border-[#dbeafe] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,250,255,0.96))]',
    groupLabel: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-200',
    groupMetric: 'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-200',
    groupItem: 'border-[#dbeafe] bg-white/94 dark:border-slate-700 dark:bg-slate-900/58',
    groupValue: 'text-slate-800 dark:text-slate-100',
    listCard: 'hover:border-sky-300/60 hover:shadow-[0_24px_40px_-32px_rgba(59,130,246,0.3)]',
  },
  sunset: {
    tableSurface: 'bg-[radial-gradient(circle_at_top_left,rgba(251,146,60,0.08),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(244,114,182,0.1),transparent_30%)]',
    tableCanvas: 'bg-[radial-gradient(circle_at_top_left,rgba(254,215,170,0.34),transparent_34%),linear-gradient(180deg,rgba(255,247,240,0.98),rgba(255,250,245,0.96))]',
    badge: 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-400/20 dark:bg-orange-500/10 dark:text-orange-200',
    hero: 'border-[#f8d7bf] bg-[radial-gradient(circle_at_top_left,rgba(251,146,60,0.18),transparent_38%),linear-gradient(160deg,rgba(255,247,237,0.96),rgba(255,255,255,0.98))]',
    heroBadge: 'bg-white/88 text-orange-700 dark:bg-slate-900/72 dark:text-orange-200',
    groupShell: 'border-[#fde7d5] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,248,243,0.96))]',
    groupLabel: 'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-200',
    groupMetric: 'bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-200',
    groupItem: 'border-[#fde7d5] bg-white/94 dark:border-slate-700 dark:bg-slate-900/58',
    groupValue: 'text-slate-800 dark:text-slate-100',
    listCard: 'hover:border-orange-300/60 hover:shadow-[0_24px_40px_-32px_rgba(251,146,60,0.3)]',
  },
  jade: {
    tableSurface: 'bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.08),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(20,184,166,0.1),transparent_28%)]',
    tableCanvas: 'bg-[radial-gradient(circle_at_top_left,rgba(167,243,208,0.32),transparent_34%),linear-gradient(180deg,rgba(242,252,248,0.98),rgba(248,253,251,0.96))]',
    badge: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-200',
    hero: 'border-[#caeddc] bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_38%),linear-gradient(160deg,rgba(236,253,245,0.96),rgba(255,255,255,0.98))]',
    heroBadge: 'bg-white/88 text-emerald-700 dark:bg-slate-900/72 dark:text-emerald-200',
    groupShell: 'border-[#d1fae5] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(243,252,248,0.96))]',
    groupLabel: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200',
    groupMetric: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-200',
    groupItem: 'border-[#d1fae5] bg-white/94 dark:border-slate-700 dark:bg-slate-900/58',
    groupValue: 'text-slate-800 dark:text-slate-100',
    listCard: 'hover:border-emerald-300/60 hover:shadow-[0_24px_40px_-32px_rgba(16,185,129,0.28)]',
  },
};
const DETAIL_BOARD_THEME_VARS: Record<string, Record<string, string>> = {
  aurora: {
    '--workspace-accent': '#2563eb',
    '--workspace-accent-strong': '#1d4ed8',
    '--workspace-accent-soft': 'rgba(37,99,235,0.12)',
    '--workspace-accent-soft-strong': 'rgba(37,99,235,0.18)',
    '--workspace-accent-tint': 'rgba(239,246,255,0.92)',
    '--workspace-accent-surface': 'rgba(245,250,255,0.96)',
    '--workspace-accent-border': 'rgba(37,99,235,0.18)',
    '--workspace-accent-border-strong': 'rgba(96,165,250,0.44)',
    '--workspace-accent-shadow': 'rgba(37,99,235,0.34)',
  },
  sunset: {
    '--workspace-accent': '#ea580c',
    '--workspace-accent-strong': '#c2410c',
    '--workspace-accent-soft': 'rgba(249,115,22,0.12)',
    '--workspace-accent-soft-strong': 'rgba(249,115,22,0.18)',
    '--workspace-accent-tint': 'rgba(255,247,237,0.94)',
    '--workspace-accent-surface': 'rgba(255,249,244,0.96)',
    '--workspace-accent-border': 'rgba(249,115,22,0.2)',
    '--workspace-accent-border-strong': 'rgba(251,146,60,0.46)',
    '--workspace-accent-shadow': 'rgba(234,88,12,0.32)',
  },
  jade: {
    '--workspace-accent': '#059669',
    '--workspace-accent-strong': '#047857',
    '--workspace-accent-soft': 'rgba(5,150,105,0.12)',
    '--workspace-accent-soft-strong': 'rgba(5,150,105,0.18)',
    '--workspace-accent-tint': 'rgba(236,253,245,0.94)',
    '--workspace-accent-surface': 'rgba(244,253,249,0.96)',
    '--workspace-accent-border': 'rgba(5,150,105,0.2)',
    '--workspace-accent-border-strong': 'rgba(52,211,153,0.42)',
    '--workspace-accent-shadow': 'rgba(5,150,105,0.28)',
  },
};
const MODULE_INTRO_DEFAULT_TITLE = '成本控制模块详细说明';
const MODULE_INTRO_DEFAULT_HTML = `
  <p class="module-intro-lead">成本控制模块是财务管理子系统的核心组件，面向企业经营分析、预算约束和执行监控场景，提供从业务发生到经营复盘的一体化成本治理能力。</p>
  <div class="module-intro-highlight">
    <div class="module-intro-highlight-eyebrow">模块价值</div>
    <p>围绕成本核算、预算控制、差异分析与预测预警形成闭环，让单据、台账、报表和决策建议在同一套业务模型里协同流转。</p>
    <div class="module-intro-pill-row">
      <span>成本核算</span>
      <span>预算控制</span>
      <span>预测预警</span>
    </div>
  </div>
  <h3>核心功能</h3>
  <ul>
    <li><strong>成本核算：</strong>支持标准成本法、实际成本法和作业成本法，自动归集并分配成本费用。</li>
    <li><strong>预算控制：</strong>建立多维预算体系，实时监控执行进度，并提供超预算预警。</li>
    <li><strong>成本分析：</strong>支持趋势、结构、差异等多视角分析，帮助快速识别异常波动。</li>
    <li><strong>成本预测：</strong>结合历史数据和 AI 模型，提供面向管理层的预测与建议。</li>
  </ul>
  <h3>应用价值</h3>
  <p>模块可与采购、库存、生产、财务等环节联动，把分散的成本数据汇总到统一业务语义下，提升核算效率、分析准确性和经营响应速度。</p>
`;
const DEFAULT_BILL_SOURCE_DETAIL = [
  'material_code',
  'material_name',
  'material_spec',
  'material_unit',
  'material_price',
].join('\n');
const INITIAL_BILL_SOURCE: BillSourceEntry = {
  id: 'bill-source',
  configType: '普通来源',
  sourceName: '物料基础来源表',
  sourceSql: 'SELECT * FROM material_archive_source',
  sourceDetail: DEFAULT_BILL_SOURCE_DETAIL,
  sourceType: 'SQL',
};

function escapeHtmlAttribute(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function getWorkspaceThemeVars(theme?: string): React.CSSProperties {
  return DETAIL_BOARD_THEME_VARS[theme || 'aurora'] ?? DETAIL_BOARD_THEME_VARS.aurora;
}

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

function getDetailBoardGroupRows(group: any) {
  const rawRows = Number.isFinite(Number(group?.rows)) ? Number(group.rows) : DETAIL_BOARD_GROUP_MIN_ROWS;
  return Math.min(DETAIL_BOARD_GROUP_MAX_ROWS, Math.max(DETAIL_BOARD_GROUP_MIN_ROWS, rawRows));
}

function getDetailBoardGroupColumnRow(group: any, columnId: string) {
  const rows = getDetailBoardGroupRows(group);
  const columnIds = Array.isArray(group?.columnIds) ? group.columnIds : [];
  const explicitRow = Number(group?.columnRows?.[columnId]);
  if (Number.isFinite(explicitRow)) {
    return Math.min(rows, Math.max(DETAIL_BOARD_GROUP_MIN_ROWS, explicitRow));
  }

  const legacyColumnsPerRow = Math.max(1, Math.min(4, Number(group?.columnsPerRow) || 2));
  const columnIndex = Math.max(0, columnIds.indexOf(columnId));
  return Math.min(rows, Math.max(DETAIL_BOARD_GROUP_MIN_ROWS, Math.floor(columnIndex / legacyColumnsPerRow) + 1));
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
  name: `新字段 ${index}`,
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

function buildDetailBoardGroup(index: number, columnIds: string[] = [], overrides: Record<string, any> = {}) {
  const presets = [
    { name: '主信息', description: '适合放编号、名称、主抬头字段' },
    { name: '业务状态', description: '适合放状态、归属、业务阶段' },
    { name: '扩展补充', description: '适合放备注、说明和补充字段' },
  ];
  const preset = presets[index - 1] ?? { name: `信息分组 ${index}`, description: '用于详情流布局展示的一组字段' };

  return {
    id: `detail_group_${Date.now()}_${index}`,
    name: preset.name,
    description: preset.description,
    columnIds,
    rows: Math.min(3, Math.max(DETAIL_BOARD_GROUP_MIN_ROWS, Math.ceil(Math.max(columnIds.length, 1) / 2))),
    columnRows: Object.fromEntries(columnIds.map((columnId, columnIndex) => [columnId, Math.floor(columnIndex / 2) + 1])),
    columnsPerRow: 2,
    columnWidths: {},
    columnHeights: {},
    ...overrides,
  };
}

function createSuggestedDetailBoardGroups(columns: any[]) {
  const columnIds = columns.map((column) => column.id).filter(Boolean);

  if (columnIds.length === 0) {
    return [
      buildDetailBoardGroup(1),
      buildDetailBoardGroup(2, [], { name: '业务信息', description: '勾选字段后会按流式卡片自动排布' }),
    ];
  }

  const chunks = [
    columnIds.slice(0, 2),
    columnIds.slice(2, 5),
    columnIds.slice(5, 8),
  ].filter((chunk) => chunk.length > 0);

  return chunks.map((columnIdsChunk, index) => (
    buildDetailBoardGroup(index + 1, columnIdsChunk)
  ));
}

function normalizeDetailBoardConfig(config: any, columns: any[] = []) {
  const availableColumnIds = new Set(columns.map((column) => column.id));
  const suggestedGroups = createSuggestedDetailBoardGroups(columns);
  const hasCustomGroups = Array.isArray(config?.groups);
  const rawGroups = hasCustomGroups ? config.groups : suggestedGroups;
  const normalizedGroups = rawGroups.map((group: any, index: number) => (
    (() => {
      const columnIds = Array.from(new Set((group?.columnIds ?? []).filter((columnId: string) => availableColumnIds.has(columnId))));
      const legacyColumnsPerRow = Math.max(1, Math.min(4, Number(group?.columnsPerRow) || 2));
      const rows = clampValue(
        Number.isFinite(Number(group?.rows))
          ? Number(group.rows)
          : Math.max(DETAIL_BOARD_GROUP_MIN_ROWS, Math.ceil(Math.max(columnIds.length, 1) / legacyColumnsPerRow)),
        DETAIL_BOARD_GROUP_MIN_ROWS,
        DETAIL_BOARD_GROUP_MAX_ROWS,
      );
      const rawColumnRows = Object.fromEntries(
        columnIds.map((columnId: string, columnIndex: number) => {
          const explicitRow = Number(group?.columnRows?.[columnId]);
          const row = Number.isFinite(explicitRow)
            ? explicitRow
            : Math.floor(columnIndex / legacyColumnsPerRow) + 1;
          return [columnId, clampValue(row, DETAIL_BOARD_GROUP_MIN_ROWS, rows)];
        }),
      );

      return {
        id: group?.id ?? buildDetailBoardGroup(index + 1).id,
        name: typeof group?.name === 'string' ? group.name : `信息分组 ${index + 1}`,
        description: group?.description ?? '',
        columnIds,
        rows,
        columnRows: rawColumnRows,
        columnsPerRow: legacyColumnsPerRow,
        columnWidths: Object.fromEntries(
          Object.entries(group?.columnWidths ?? {}).filter(([columnId, width]) => (
            availableColumnIds.has(columnId) && Number(width) > 0
          )),
        ),
        columnHeights: Object.fromEntries(
          Object.entries(group?.columnHeights ?? {}).filter(([columnId, height]) => (
            availableColumnIds.has(columnId) && Number(height) > 0
          )),
        ),
      };
    })()
  ));

  return {
    enabled: Boolean(config?.enabled),
    theme: DETAIL_BOARD_THEME_OPTIONS.some((option) => option.value === config?.theme) ? config.theme : 'aurora',
    sortColumnId: availableColumnIds.has(config?.sortColumnId) ? config.sortColumnId : columns[0]?.id ?? null,
    groups: hasCustomGroups ? normalizedGroups : suggestedGroups,
  };
}

function getDetailBoardTheme(theme?: string) {
  return DETAIL_BOARD_THEME_STYLES[theme || 'aurora'] ?? DETAIL_BOARD_THEME_STYLES.aurora;
}

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

type DocumentGridToolbarFilterConfig = {
  fields: any[];
  selectedId: string | null;
  selectedIds: string[];
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
  onActivate: (id: string) => void;
  onAdd: () => void;
  onDelete: () => void;
  setFields: React.Dispatch<React.SetStateAction<any[]>>;
  scope: 'left' | 'main' | 'detail';
};

type DocumentGridToolbarProps = {
  columns: any[];
  title: string;
  selectedCount: number;
  onDelete: () => void;
  onAdd: () => void;
  activeResize: ActiveWorkbenchResize | null;
  extraActions?: React.ReactNode;
  filterConfig?: DocumentGridToolbarFilterConfig;
  tableConfigAction?: {
    active?: boolean;
    onSelect: () => void;
  };
  options?: {
    hideActionBar?: boolean;
    hideFilterBar?: boolean;
    hideFilterQuickActions?: boolean;
    filterAccessory?: React.ReactNode;
    filterRuntimeRules?: string;
  };
  onSetBuilderSelectionContextMenu: React.Dispatch<React.SetStateAction<any>>;
  renderFieldPreview: (rawField: any, rowIndex: number, mode?: 'table' | 'filter' | 'condition') => React.ReactNode;
  startResize: (
    e: React.MouseEvent,
    colId: string,
    cols: any[],
    setCols: React.Dispatch<React.SetStateAction<any[]>>,
    minWidth?: number,
    maxWidth?: number,
    mode?: WorkbenchResizeMode,
  ) => void;
  autoFitColumnWidth: (
    event: React.MouseEvent,
    colId: string,
    cols: any[],
    setCols: React.Dispatch<React.SetStateAction<any[]>>,
    minWidth?: number,
    maxWidth?: number,
    mode?: WorkbenchResizeMode,
  ) => void;
};

const MemoDocumentGridToolbar = React.memo(function DocumentGridToolbar({
  columns,
  title,
  selectedCount,
  onDelete,
  onAdd,
  activeResize,
  extraActions,
  filterConfig,
  tableConfigAction,
  options,
  onSetBuilderSelectionContextMenu,
  renderFieldPreview,
  startResize,
  autoFitColumnWidth,
}: DocumentGridToolbarProps) {
  const filterFields = filterConfig?.fields ?? columns.slice(0, 3);
  const hideFilterBar = options?.hideFilterBar ?? false;
  const hideFilterQuickActions = options?.hideFilterQuickActions ?? false;
  const hideActionBar = options?.hideActionBar ?? false;
  const filterSelectionCount = filterConfig?.selectedIds.length ?? 0;
  const buildFilterSelectionIds = (fieldId: string, append: boolean) => {
    if (!filterConfig) return [];
    if (filterConfig.selectedIds.includes(fieldId)) {
      return filterConfig.selectedIds;
    }
    return append ? Array.from(new Set([...filterConfig.selectedIds, fieldId])) : [fieldId];
  };
  const handleFilterSelect = (fieldId: string, event?: React.MouseEvent | React.KeyboardEvent) => {
    if (!filterConfig) return;
    const allowMulti = Boolean(event && ('ctrlKey' in event) && (event.ctrlKey || event.metaKey));

    onSetBuilderSelectionContextMenu(null);
    if (allowMulti) {
      filterConfig.setSelectedIds((prev) => (
        prev.includes(fieldId) ? prev.filter((item) => item !== fieldId) : [...prev, fieldId]
      ));
      filterConfig.onActivate(fieldId);
      return;
    }

    filterConfig.setSelectedIds([fieldId]);
    filterConfig.onActivate(fieldId);
  };
  const handleFilterContextMenu = (event: React.MouseEvent<HTMLDivElement>, fieldId: string) => {
    if (!filterConfig) return;
    event.preventDefault();
    event.stopPropagation();

    const nextSelectedIds = buildFilterSelectionIds(fieldId, event.ctrlKey || event.metaKey);
    filterConfig.setSelectedIds(nextSelectedIds);
    filterConfig.onActivate(fieldId);
    onSetBuilderSelectionContextMenu({
      kind: 'filter',
      scope: filterConfig.scope,
      x: event.clientX,
      y: event.clientY,
      ids: nextSelectedIds,
    });
  };
  const filterRuntimeRules = options?.filterRuntimeRules ?? buildDocumentFilterRuntimeRules(filterFields, activeResize);
  const getFilterNameClass = (isSelected: boolean, isRequired: boolean) => cn(
    'shrink-0 overflow-hidden text-ellipsis whitespace-nowrap text-left text-[11px] font-medium text-muted-foreground',
    isRequired && 'text-primary',
    isSelected && 'text-foreground',
  );

  const getFilterPreviewShellClass = (isSelected: boolean) => cn(
    'shrink-0 pr-0.5',
    isSelected && '[&>div]:border-border/60 [&>div]:bg-background [&>div]:shadow-none',
  );

  return (
    <div className="shrink-0">
      {!hideFilterBar && (
        <div className="px-1 py-1">
          {filterRuntimeRules ? <style>{filterRuntimeRules}</style> : null}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="gap-1.5 rounded-xl border-border/60 bg-background/80 px-2.5 py-1 text-[11px] font-medium text-foreground">
                <Filter className="size-3.5" />
                查询条件
              </Badge>
              <span className="text-[11px] font-medium text-muted-foreground">{filterFields.length} 项</span>
            </div>
            {options?.filterAccessory ? (
              <div className="flex shrink-0 items-center gap-2">{options.filterAccessory}</div>
            ) : null}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1">
            {filterFields.map((field, index) => {
              const normalizedWidth = Math.min(
                CONDITION_PANEL_RESIZE_MAX_WIDTH,
                Math.max(
                  CONDITION_PANEL_RESIZE_MIN_WIDTH,
                  Number.isFinite(Number(field?.width)) ? Number(field.width) : CONDITION_PANEL_CONTROL_WIDTH,
                ),
              );
              const normalizedField = {
                required: false,
                ...field,
                width: normalizedWidth,
              };
              const isActive = filterConfig?.selectedId === field.id;
              const isMarkedForDelete = filterConfig?.selectedIds.includes(field.id) ?? false;
              const isSelected = isActive || isMarkedForDelete;
              const widthClassName = createRuntimeClassName('document-filter-width', normalizedField.id);
              const labelClassName = createRuntimeClassName('document-filter-label', normalizedField.id);
              const previewClassName = createRuntimeClassName('document-filter-preview', normalizedField.id);

              return (
                <div
                  key={field.id}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  onClick={(event) => handleFilterSelect(field.id, event)}
                  onContextMenu={(event) => handleFilterContextMenu(event, field.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      handleFilterSelect(field.id, event);
                    }
                  }}
                  className={cn(
                    widthClassName,
                    'group relative flex h-11 shrink-0 cursor-grab select-none flex-row items-center gap-1 rounded-lg border pl-2 pr-3.5 py-1.5 transition-colors active:cursor-grabbing',
                    isSelected
                      ? 'border-primary/20 bg-background/90'
                      : 'border-transparent bg-transparent hover:border-border/40 hover:bg-background/70',
                  )}
                >
                  <div
                    className={cn(labelClassName, getFilterNameClass(isSelected, Boolean(normalizedField.required)))}
                    title={normalizedField.name}
                  >
                    <span className="block truncate">
                      {normalizedField.name}
                      {normalizedField.required ? <span className="ml-1 text-primary">*</span> : null}
                    </span>
                  </div>
                  <div className={cn(previewClassName, getFilterPreviewShellClass(isSelected))}>
                    {renderFieldPreview(normalizedField, index, 'condition')}
                  </div>
                  <div
                    className="absolute inset-y-2 right-0.5 flex w-1.5 cursor-col-resize items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    onMouseDown={(event) => filterConfig && startResize(event, field.id, filterFields, filterConfig.setFields, 160, 620, 'filter')}
                    onDoubleClick={(event) => filterConfig && autoFitColumnWidth(event, field.id, filterFields, filterConfig.setFields, 160, 620, 'filter')}
                    title="拖动调整条件宽度，双击可自动适配"
                  >
                    <span className="h-3.5 w-px rounded-full bg-border transition-colors group-hover:bg-primary" />
                  </div>
                </div>
              );
            })}
            {filterConfig && !hideFilterQuickActions ? (
              <Button size="sm" className="h-8 gap-1.5 rounded-xl px-3" onClick={filterConfig.onAdd}>
                <Plus className="size-4" />
                条件
              </Button>
            ) : null}
            {filterConfig && !hideFilterQuickActions ? (
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 rounded-xl border-border/60 bg-background/80 px-3"
                onClick={filterConfig.onDelete}
                disabled={filterSelectionCount === 0}
              >
                <Trash2 className="size-4" />
                删除条件{filterSelectionCount > 1 ? ` (${filterSelectionCount})` : ''}
              </Button>
            ) : null}
          </div>
        </div>
      )}
      {!hideActionBar && (
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3 px-1 py-1">
          <Button
            variant={tableConfigAction?.active ? 'secondary' : 'ghost'}
            size="sm"
            className="gap-1.5 rounded-xl"
            onClick={tableConfigAction?.onSelect}
          >
            <Table2 className="size-4" />
            {title}
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            {extraActions}
            <Button size="sm" className="h-8 gap-1.5 rounded-xl px-3" onClick={onAdd}>
              <Plus className="size-4" />
              新增
            </Button>
            <Button size="sm" variant="outline" className="h-8 gap-1.5 rounded-xl border-border/60 bg-background/80 px-3" onClick={onDelete} disabled={selectedCount === 0}>
              <Trash2 className="size-4" />
              删除
            </Button>
            <Button size="sm" variant="outline" className="h-8 gap-1.5 rounded-xl border-border/60 bg-background/80 px-3">
              <Save className="size-4" />
              保存
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => (
  prevProps.columns === nextProps.columns
  && prevProps.title === nextProps.title
  && prevProps.selectedCount === nextProps.selectedCount
  && prevProps.extraActions === nextProps.extraActions
  && prevProps.activeResize === nextProps.activeResize
  && prevProps.filterConfig?.fields === nextProps.filterConfig?.fields
  && prevProps.filterConfig?.selectedId === nextProps.filterConfig?.selectedId
  && prevProps.filterConfig?.selectedIds === nextProps.filterConfig?.selectedIds
  && prevProps.filterConfig?.scope === nextProps.filterConfig?.scope
  && prevProps.tableConfigAction?.active === nextProps.tableConfigAction?.active
  && prevProps.options?.hideActionBar === nextProps.options?.hideActionBar
  && prevProps.options?.hideFilterBar === nextProps.options?.hideFilterBar
  && prevProps.options?.hideFilterQuickActions === nextProps.options?.hideFilterQuickActions
  && prevProps.options?.filterAccessory === nextProps.options?.filterAccessory
  && prevProps.options?.filterRuntimeRules === nextProps.options?.filterRuntimeRules
));

type BuilderSelectionContextMenuState = {
  kind: 'column' | 'filter';
  scope: 'left' | 'main' | 'detail';
  x: number;
  y: number;
  ids: string[];
} | null;

const normalizeConditionWorkbenchField = (field: any) => ({
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

const getPreviewFieldOptionValues = (rawField: any) => {
  const field = normalizeColumn(rawField);
  const source = field.dictCode || field.helpText || '';

  if (/[,\n，;；|]/.test(source)) {
    const items = source
      .split(/[\n,，;；|]/)
      .map((item: string) => item.trim())
      .filter(Boolean);

    if (items.length > 0) {
      return items;
    }
  }

  if (field.type === '下拉框') {
    return ['正常', '停用', '草稿'];
  }

  if (field.type === '单选框') {
    return ['是', '否'];
  }

  if (field.type === '多选框') {
    return ['标签A', '标签B', '标签C'];
  }

  return [];
};

const getPreviewFieldValue = (rawColumn: any, rowIndex: number) => {
  const column = normalizeColumn(rawColumn);
  const fieldName = column.name || '字段';
  const optionValues = getPreviewFieldOptionValues(column);

  if (column.defaultValue) {
    return column.defaultValue;
  }

  if (column.type === '数字' || /金额|单价|数量|价格|余额/.test(fieldName)) {
    return `${(rowIndex + 1) * 125}`;
  }

  if (column.type === '日期框' || /日期|时间/.test(fieldName)) {
    return `2026-03-${String(rowIndex + 18).padStart(2, '0')}`;
  }

  if (column.type === '下拉框' || column.type === '单选框') {
    return optionValues[rowIndex % optionValues.length] || '未选择';
  }

  if (column.type === '多选框') {
    return optionValues.slice(0, 2).join('、') || '标签A、标签B';
  }

  if (/编码|编号/.test(fieldName)) {
    return `NO-${String(rowIndex + 1).padStart(3, '0')}`;
  }

  if (/名称/.test(fieldName)) {
    return `示例${rowIndex + 1}`;
  }

  if (/单位/.test(fieldName)) {
    return ['个', '件', '套'][rowIndex % 3];
  }

  if (column.type === '搜索框') {
    return `${fieldName}检索词`;
  }

  return `${fieldName}${rowIndex + 1}`;
};

function renderPreviewFieldControl(
  rawField: any,
  rowIndex: number,
  mode: 'table' | 'filter' | 'condition' = 'table',
) {
  const field = normalizeColumn(rawField);
  const previewValue = getPreviewFieldValue(field, rowIndex);
  const optionValues = getPreviewFieldOptionValues(field);
  const isFilterMode = mode !== 'table';
  const isConditionMode = mode === 'condition';
  const inputClass = isFilterMode
    ? 'h-10 w-full rounded-xl border border-slate-200/90 bg-white/96 px-3 text-[12px] text-slate-700 outline-none transition shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] focus:border-[color:var(--workspace-accent-border-strong)] focus:ring-4 focus:ring-[color:var(--workspace-accent-soft)] dark:border-slate-700 dark:bg-slate-900/88 dark:text-slate-200'
    : 'h-10 w-full rounded-xl border border-slate-200/80 bg-white/94 px-3 text-[12px] text-slate-700 outline-none transition shadow-[0_10px_20px_-18px_rgba(15,23,42,0.22),inset_0_1px_0_rgba(255,255,255,0.72)] focus:border-[color:var(--workspace-accent-border-strong)] focus:ring-4 focus:ring-[color:var(--workspace-accent-soft)] dark:border-slate-700 dark:bg-slate-900/88 dark:text-slate-100';
  const compactInputClass = `${inputClass} px-2.5`;
  const previewKey = `${field.id}-${field.type}-${field.dictCode}-${field.defaultValue}-${field.placeholder}`;

  const stopPreviewEvent = (event: React.SyntheticEvent) => {
    event.stopPropagation();
  };

  if (isFilterMode) {
    const shellClass = `flex h-9 w-full items-center justify-between gap-2 rounded-[10px] border border-slate-200/90 bg-white text-[12px] text-slate-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200 ${isConditionMode ? 'pointer-events-none px-2.5' : 'px-3'}`;
    const staticValue = field.placeholder || previewValue || `${field.name}示例值`;
    const trailingIcon = field.type === '日期框'
      ? 'calendar'
      : field.type === '下拉框' || field.type === '多选框'
        ? 'expand'
        : field.type === '搜索框'
          ? 'search'
          : '';

    if (isConditionMode) {
      if (field.type === '多选框') {
        return (
          <div className={shellClass}>
            <div className="flex min-w-0 flex-1 items-center gap-1.5">
              <span className="h-4.5 w-4.5 rounded-md border border-slate-200/80 bg-white/90 dark:border-slate-700 dark:bg-slate-900/70" />
              <span className="h-4.5 w-4.5 rounded-md border border-slate-200/80 bg-white/90 dark:border-slate-700 dark:bg-slate-900/70" />
            </div>
            <ChevronDown className="size-4 text-slate-300 dark:text-slate-500" />
          </div>
        );
      }

      if (field.type === '单选框') {
        return (
          <div className={shellClass}>
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <span className="h-3.5 w-3.5 rounded-full border border-[color:var(--workspace-accent)] bg-[color:var(--workspace-accent)]/14" />
              <span className="h-3.5 w-3.5 rounded-full border border-slate-300 dark:border-slate-600" />
            </div>
          </div>
        );
      }

      return (
        <div className={shellClass}>
          {field.type === '搜索框' ? (
            <Search className="size-4 text-slate-300 dark:text-slate-500" />
          ) : null}
          <div className="min-w-0 flex-1" />
          {trailingIcon && field.type !== '搜索框' ? (
            trailingIcon === 'calendar' ? (
              <CalendarDays className="size-4 text-slate-300 dark:text-slate-500" />
            ) : (
              <ChevronDown className="size-4 text-slate-300 dark:text-slate-500" />
            )
          ) : null}
        </div>
      );
    }

    if (field.type === '多选框') {
      const tags = (optionValues.length > 0 ? optionValues : ['标签A', '标签B']).slice(0, 2);
      return (
        <div className={shellClass}>
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <div className="flex min-w-0 flex-wrap gap-1">
              {tags.map((tag) => (
                <span key={tag} className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <span className="material-symbols-outlined text-[16px] text-slate-300 dark:text-slate-500">expand_more</span>
        </div>
      );
    }

    if (field.type === '单选框') {
      const value = optionValues[0] || previewValue || '是';
      return (
        <div className={shellClass}>
          <div className="flex min-w-0 items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[color:var(--workspace-accent)]" />
            <span className="truncate">{value}</span>
          </div>
        </div>
      );
    }

    return (
      <div className={shellClass}>
        <div className="min-w-0 flex-1">
          <span className={`truncate ${field.type === '数字' ? 'font-semibold tabular-nums' : ''}`}>{staticValue}</span>
        </div>
        {trailingIcon ? (
          <span className="material-symbols-outlined text-[16px] text-slate-300 dark:text-slate-500">
            {trailingIcon}
          </span>
        ) : null}
      </div>
    );
  }

  if (field.type === '日期框') {
    return (
      <input
        key={previewKey}
        data-preview-control="true"
        type="date"
        defaultValue={previewValue}
        className={compactInputClass}
        onClick={stopPreviewEvent}
        onDoubleClick={stopPreviewEvent}
      />
    );
  }

  if (field.type === '下拉框') {
    return (
      <select
        key={previewKey}
        data-preview-control="true"
        defaultValue={optionValues.includes(previewValue) ? previewValue : optionValues[0] || ''}
        className={compactInputClass}
        onClick={stopPreviewEvent}
        onDoubleClick={stopPreviewEvent}
      >
        {optionValues.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === '搜索框') {
    return (
      <div
        data-preview-control="true"
        className="relative"
        onClick={stopPreviewEvent}
        onDoubleClick={stopPreviewEvent}
      >
        <span className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[16px] text-slate-400 ${isFilterMode ? '' : 'z-[1]'}`}>
          search
        </span>
        <input
          key={previewKey}
          defaultValue={previewValue || ''}
          placeholder={field.placeholder || `请输入${field.name}`}
          className={`${compactInputClass} pl-8 pr-3 min-w-0`}
        />
      </div>
    );
  }

  if (field.type === '单选框') {
    return (
      <div
        data-preview-control="true"
        className="flex flex-wrap items-center gap-3"
        onClick={stopPreviewEvent}
        onDoubleClick={stopPreviewEvent}
      >
        {(optionValues.length > 0 ? optionValues : ['是', '否']).map((option) => (
          <label key={option} className="inline-flex items-center gap-1.5 text-[12px] text-slate-600 dark:text-slate-300">
            <input
              type="radio"
              name={`${field.id}-${mode}`}
              defaultChecked={option === previewValue}
              className="h-3.5 w-3.5 accent-[color:var(--workspace-accent)]"
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
    );
  }

  if (field.type === '多选框') {
    const tags = optionValues.slice(0, 2);
    return (
      <div
        data-preview-control="true"
        className="flex flex-wrap gap-2"
        onClick={stopPreviewEvent}
        onDoubleClick={stopPreviewEvent}
      >
        {(optionValues.length > 0 ? optionValues : ['标签A', '标签B', '标签C']).map((tag, index) => (
          <label key={tag} className="inline-flex items-center gap-1.5 text-[12px] text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              defaultChecked={index < (tags.length > 0 ? tags.length : 2)}
              className="h-3.5 w-3.5 rounded accent-[#1686e3]"
            />
            <span>{tag}</span>
          </label>
        ))}
      </div>
    );
  }

  if (field.type === '数字') {
    return (
      <input
        key={previewKey}
        data-preview-control="true"
        type="number"
        defaultValue={previewValue}
        className={`${compactInputClass} text-right font-semibold tabular-nums`}
        onClick={stopPreviewEvent}
        onDoubleClick={stopPreviewEvent}
      />
    );
  }

  return (
    <input
      key={previewKey}
      data-preview-control="true"
      type="text"
      defaultValue={previewValue || ''}
      placeholder={field.placeholder || `${field.name}示例值`}
      className={compactInputClass}
      onClick={stopPreviewEvent}
      onDoubleClick={stopPreviewEvent}
    />
  );
}

function buildConditionWorkbenchRuntimeRules(
  fields: any[],
  rowCount: number,
  scope: ConditionWorkbenchScope,
  activeResizeState: ActiveWorkbenchResize | null,
) {
  const conditionWorkbenchHeight = rowCount * CONDITION_PANEL_ROW_HEIGHT
    + Math.max(0, rowCount - 1) * CONDITION_PANEL_ROW_GAP;
  const conditionWorkbenchHeightClass = createRuntimeClassName('condition-workbench-height', scope);

  return joinRuntimeDeclarationBlocks([
    createRuntimeDeclarationBlock(conditionWorkbenchHeightClass, { 'min-height': conditionWorkbenchHeight }),
    ...fields.flatMap((field) => {
      const rawConditionWidth = resolveWorkbenchPreviewWidth(
        field.width,
        CONDITION_PANEL_CONTROL_WIDTH,
        CONDITION_PANEL_RESIZE_MIN_WIDTH,
        activeResizeState,
        field.id,
        'filter',
      );
      const labelWidth = Math.max(60, Math.min(132, field.name.length * 14 + 10));
      const sharedPreviewWidthFloor = 120;
      const compactPreviewWidthFloor = 104;
      const basePreviewWidth = field.type === '数字'
        ? compactPreviewWidthFloor
        : sharedPreviewWidthFloor;
      const conditionChromeWidth = 18;
      const minimumConditionWidth = labelWidth + basePreviewWidth + conditionChromeWidth;
      const conditionWidth = Math.max(
        minimumConditionWidth,
        Math.min(CONDITION_PANEL_RESIZE_MAX_WIDTH, Math.max(minimumConditionWidth, rawConditionWidth)),
      );
      const previewWidth = Math.max(basePreviewWidth, conditionWidth - labelWidth - conditionChromeWidth);
      const widthClassName = createRuntimeClassName('condition-item-width', field.id);
      const labelClassName = createRuntimeClassName('condition-item-label', field.id);
      const previewClassName = createRuntimeClassName('condition-item-preview', field.id);

      return [
        createRuntimeDeclarationBlock(widthClassName, { width: conditionWidth, 'min-width': conditionWidth }),
        createRuntimeDeclarationBlock(labelClassName, { width: labelWidth, 'min-width': labelWidth }),
        createRuntimeDeclarationBlock(previewClassName, { width: previewWidth, 'min-width': previewWidth }),
      ];
    }),
  ]);
}

type DocumentConditionWorkbenchConfig = {
  fields: any[];
  selectedId: string | null;
  selectedIds: string[];
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
  setFields: React.Dispatch<React.SetStateAction<any[]>>;
  scope: ConditionWorkbenchScope;
  rowCount: number;
  onActivate: (id: string) => void;
  onAdd: () => void;
  onDelete: () => void;
};

type DocumentConditionWorkbenchProps = {
  activeScope: ConditionWorkbenchScope;
  canSwitchScope: boolean;
  mainConfig: DocumentConditionWorkbenchConfig;
  leftConfig?: DocumentConditionWorkbenchConfig | null;
  activeResize: ActiveWorkbenchResize | null;
  conditionWorkbenchSensors: any;
  onScopeSwitch: (scope: ConditionWorkbenchScope) => void;
  onActivatePanel: (scope: ConditionWorkbenchScope) => void;
  onClearBuilderSelectionContextMenu: () => void;
  setActiveResize: React.Dispatch<React.SetStateAction<ActiveWorkbenchResize | null>>;
  scheduleResizePreview: (nextResize: ActiveWorkbenchResize) => void;
  clearResizePreview: (target?: { id: string; mode: WorkbenchResizeMode }) => void;
  autoFitColumnWidth: (
    event: React.MouseEvent,
    colId: string,
    cols: any[],
    setCols: React.Dispatch<React.SetStateAction<any[]>>,
    minWidth?: number,
    maxWidth?: number,
    mode?: WorkbenchResizeMode,
  ) => void;
};

const MemoDocumentConditionWorkbench = React.memo(function DocumentConditionWorkbench({
  activeScope,
  canSwitchScope,
  mainConfig,
  leftConfig,
  activeResize,
  conditionWorkbenchSensors,
  onScopeSwitch,
  onActivatePanel,
  onClearBuilderSelectionContextMenu,
  setActiveResize,
  scheduleResizePreview,
  clearResizePreview,
  autoFitColumnWidth,
}: DocumentConditionWorkbenchProps) {
  const currentConfig = activeScope === 'left' && leftConfig ? leftConfig : mainConfig;
  const currentScope = currentConfig.scope;
  const currentScopeLabel = currentScope === 'left' ? '左条件' : '主条件';
  const [conditionWorkbenchDrag, setConditionWorkbenchDrag] = useState<{
    scope: ConditionWorkbenchScope;
    fieldId: string;
  } | null>(null);
  const [conditionWorkbenchDropTarget, setConditionWorkbenchDropTarget] = useState<{
    row: number;
    beforeId: string | null;
  } | null>(null);
  const conditionWorkbenchDropTargetRef = useRef<{ row: number; beforeId: string | null } | null>(null);
  const conditionWorkbenchDropTargetFrameRef = useRef<number | null>(null);

  const currentConditionFields = useMemo(
    () => currentConfig.fields.map(normalizeConditionWorkbenchField),
    [currentConfig.fields],
  );
  const selectedConditionIds = useMemo(
    () => new Set(currentConfig.selectedIds),
    [currentConfig.selectedIds],
  );
  const conditionFieldIndexMap = useMemo(
    () => new Map(currentConditionFields.map((field, index) => [field.id, index])),
    [currentConditionFields],
  );
  const conditionRowNumbers = useMemo(
    () => Array.from({ length: currentConfig.rowCount }, (_, index) => index + 1),
    [currentConfig.rowCount],
  );
  const conditionFieldsByRow = useMemo(() => {
    const grouped = new Map<number, typeof currentConditionFields>();

    currentConditionFields.forEach((field) => {
      const rowNumber = clampValue(
        Number.isFinite(Number(field?.panelRow)) ? Number(field.panelRow) : CONDITION_PANEL_MIN_ROWS,
        CONDITION_PANEL_MIN_ROWS,
        currentConfig.rowCount,
      );
      const rowFields = grouped.get(rowNumber) ?? [];
      rowFields.push(field);
      grouped.set(rowNumber, rowFields);
    });

    return grouped;
  }, [currentConditionFields, currentConfig.rowCount]);
  const conditionWorkbenchHeightClass = createRuntimeClassName('condition-workbench-height', currentScope);
  const conditionRuntimeRules = useMemo(
    () => buildConditionWorkbenchRuntimeRules(
      currentConditionFields,
      currentConfig.rowCount,
      currentScope,
      activeResize,
    ),
    [activeResize, currentConditionFields, currentConfig.rowCount, currentScope],
  );

  const clearConditionWorkbenchDragState = useCallback(() => {
    if (conditionWorkbenchDropTargetFrameRef.current !== null) {
      window.cancelAnimationFrame(conditionWorkbenchDropTargetFrameRef.current);
      conditionWorkbenchDropTargetFrameRef.current = null;
    }
    conditionWorkbenchDropTargetRef.current = null;
    setConditionWorkbenchDrag(null);
    setConditionWorkbenchDropTarget(null);
  }, []);

  useEffect(() => {
    conditionWorkbenchDropTargetRef.current = conditionWorkbenchDropTarget;
  }, [conditionWorkbenchDropTarget]);

  useEffect(() => () => {
    if (conditionWorkbenchDropTargetFrameRef.current !== null) {
      window.cancelAnimationFrame(conditionWorkbenchDropTargetFrameRef.current);
      conditionWorkbenchDropTargetFrameRef.current = null;
    }
  }, []);

  useEffect(() => {
    clearConditionWorkbenchDragState();
  }, [clearConditionWorkbenchDragState, currentScope]);

  const updateConditionWorkbenchDropTarget = useCallback((nextTarget: { row: number; beforeId: string | null } | null) => {
    const currentTarget = conditionWorkbenchDropTargetRef.current;
    if (
      currentTarget?.row === nextTarget?.row
      && currentTarget?.beforeId === nextTarget?.beforeId
    ) {
      return;
    }

    conditionWorkbenchDropTargetRef.current = nextTarget;
    if (conditionWorkbenchDropTargetFrameRef.current !== null) {
      return;
    }

    conditionWorkbenchDropTargetFrameRef.current = window.requestAnimationFrame(() => {
      conditionWorkbenchDropTargetFrameRef.current = null;
      setConditionWorkbenchDropTarget((prev) => {
        const latestTarget = conditionWorkbenchDropTargetRef.current;
        if (
          prev?.row === latestTarget?.row
          && prev?.beforeId === latestTarget?.beforeId
        ) {
          return prev;
        }
        return latestTarget;
      });
    });
  }, []);

  const getConditionResizeCandidates = useCallback((fieldId: string) => buildResizeSnapCandidates(
    currentConditionFields
      .filter((field) => field.id !== fieldId)
      .map((field) => Number(field.width) || CONDITION_PANEL_CONTROL_WIDTH),
    {
      minWidth: CONDITION_PANEL_RESIZE_MIN_WIDTH,
      maxWidth: CONDITION_PANEL_RESIZE_MAX_WIDTH,
      baseWidth: CONDITION_PANEL_CONTROL_WIDTH,
    },
  ), [currentConditionFields]);

  const handleConditionCardSelect = useCallback((fieldId: string, event?: React.MouseEvent | React.KeyboardEvent) => {
    const allowMulti = Boolean(event && ('ctrlKey' in event) && (event.ctrlKey || event.metaKey));

    onClearBuilderSelectionContextMenu();
    if (allowMulti) {
      currentConfig.setSelectedIds((prev) => (
        prev.includes(fieldId) ? prev.filter((item) => item !== fieldId) : [...prev, fieldId]
      ));
    } else {
      currentConfig.setSelectedIds([fieldId]);
    }

    currentConfig.onActivate(fieldId);
  }, [currentConfig, onClearBuilderSelectionContextMenu]);

  const handlePanelKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    onActivatePanel(currentScope);
  }, [currentScope, onActivatePanel]);

  const startConditionResize = useCallback((event: React.MouseEvent<HTMLDivElement>, fieldId: string) => {
    event.preventDefault();
    event.stopPropagation();
    const targetIndex = currentConfig.fields.findIndex((item: any) => item.id === fieldId);
    if (targetIndex === -1) return;

    const targetField = normalizeConditionWorkbenchField(currentConfig.fields[targetIndex]);
    const startX = event.pageX;
    const startWidth = targetField.width || CONDITION_PANEL_CONTROL_WIDTH;
    const resizeLabel = targetField.name || '未命名字段';
    const snapCandidates = getConditionResizeCandidates(fieldId);
    let latestWidth = startWidth;

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    setActiveResize({ id: fieldId, label: resizeLabel, width: startWidth, mode: 'filter' });

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const { width } = resolveResizeWidthWithSnap(startWidth + (moveEvent.pageX - startX), {
        minWidth: CONDITION_PANEL_RESIZE_MIN_WIDTH,
        maxWidth: CONDITION_PANEL_RESIZE_MAX_WIDTH,
        snapCandidates,
      });
      latestWidth = width;
      scheduleResizePreview({ id: fieldId, label: resizeLabel, width: latestWidth, mode: 'filter' });
    };

    const handleMouseUp = () => {
      clearResizePreview({ id: fieldId, mode: 'filter' });
      currentConfig.setFields((prev: any[]) => updateItemWidthById(prev, fieldId, latestWidth));
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [
    clearResizePreview,
    currentConfig,
    getConditionResizeCandidates,
    scheduleResizePreview,
    setActiveResize,
  ]);

  const moveConditionField = useCallback((fieldId: string, rowNumber: number, beforeId: string | null = null) => {
    currentConfig.setFields((prev: any[]) => {
      const sourceIndex = prev.findIndex((item) => item.id === fieldId);
      if (sourceIndex === -1) return prev;
      if (beforeId && beforeId === fieldId) return prev;
      const nextRow = clampValue(rowNumber, CONDITION_PANEL_MIN_ROWS, currentConfig.rowCount);
      const currentField = {
        ...normalizeConditionWorkbenchField(prev[sourceIndex]),
        panelRow: nextRow,
      };
      const remaining = prev.filter((_, index) => index !== sourceIndex);

      let insertIndex = beforeId ? remaining.findIndex((item) => item.id === beforeId) : -1;
      if (insertIndex === -1) {
        insertIndex = remaining.findIndex((item) => (
          clampValue(
            Number.isFinite(Number(item?.panelRow)) ? Number(item.panelRow) : CONDITION_PANEL_MIN_ROWS,
            CONDITION_PANEL_MIN_ROWS,
            currentConfig.rowCount,
          ) > nextRow
        ));
        if (insertIndex === -1) {
          insertIndex = remaining.length;
        }
      }

      return [
        ...remaining.slice(0, insertIndex),
        currentField,
        ...remaining.slice(insertIndex),
      ];
    });
  }, [currentConfig]);

  const handleConditionWorkbenchDragStart = useCallback((event: DragStartEvent) => {
    const activeData = event.active.data.current;
    if (!isConditionWorkbenchDragData(activeData) || activeData.type !== 'condition-item' || activeData.scope !== currentScope) {
      return;
    }

    setConditionWorkbenchDrag({ scope: activeData.scope, fieldId: activeData.fieldId });
    conditionWorkbenchDropTargetRef.current = null;
    if (conditionWorkbenchDropTargetFrameRef.current !== null) {
      window.cancelAnimationFrame(conditionWorkbenchDropTargetFrameRef.current);
      conditionWorkbenchDropTargetFrameRef.current = null;
    }
    setConditionWorkbenchDropTarget(null);
  }, [currentScope]);

  const handleConditionWorkbenchDragOver = useCallback((event: DragOverEvent) => {
    const activeData = event.active.data.current;
    const overData = event.over?.data.current;
    if (!isConditionWorkbenchDragData(activeData) || activeData.type !== 'condition-item' || activeData.scope !== currentScope) {
      return;
    }

    if (!isConditionWorkbenchDragData(overData) || overData.scope !== currentScope) {
      updateConditionWorkbenchDropTarget(null);
      return;
    }

    if (overData.type === 'condition-item') {
      if (!('fieldId' in overData) || overData.fieldId === activeData.fieldId) {
        updateConditionWorkbenchDropTarget(null);
        return;
      }

      updateConditionWorkbenchDropTarget({ row: overData.row, beforeId: overData.fieldId });
      return;
    }

    updateConditionWorkbenchDropTarget({ row: overData.row, beforeId: null });
  }, [currentScope, updateConditionWorkbenchDropTarget]);

  const handleConditionWorkbenchDragEnd = useCallback((event: DragEndEvent) => {
    const activeData = event.active.data.current;
    const overData = event.over?.data.current;
    if (!isConditionWorkbenchDragData(activeData) || activeData.type !== 'condition-item' || activeData.scope !== currentScope) {
      clearConditionWorkbenchDragState();
      return;
    }

    if (!isConditionWorkbenchDragData(overData) || overData.scope !== currentScope) {
      clearConditionWorkbenchDragState();
      return;
    }

    if (overData.type === 'condition-item') {
      if ('fieldId' in overData && overData.fieldId !== activeData.fieldId) {
        moveConditionField(activeData.fieldId, overData.row, overData.fieldId);
      }
      clearConditionWorkbenchDragState();
      return;
    }

    moveConditionField(activeData.fieldId, overData.row);
    clearConditionWorkbenchDragState();
  }, [clearConditionWorkbenchDragState, currentScope, moveConditionField]);

  const getConditionItemRuntimeClasses = useCallback((fieldId: string) => ({
    widthClassName: createRuntimeClassName('condition-item-width', fieldId),
    labelClassName: createRuntimeClassName('condition-item-label', fieldId),
    previewClassName: createRuntimeClassName('condition-item-preview', fieldId),
  }), []);

  const getConditionItemClassName = useCallback((
    fieldId: string,
    options: {
      dragging?: boolean;
      insertTarget?: boolean;
      overlay?: boolean;
      selected?: boolean;
    } = {},
  ) => {
    const { widthClassName } = getConditionItemRuntimeClasses(fieldId);

    return cn(
      widthClassName,
      'h-[44px] gap-1 pr-3.5',
      getCompactWorkbenchItemClass(options),
      options.overlay && 'cursor-grabbing',
    );
  }, [getConditionItemRuntimeClasses]);

  const renderConditionItemContent = useCallback((
    field: any,
    fieldIndex: number,
    options: {
      insertTarget?: boolean;
      selected?: boolean;
      showResizeHandle?: boolean;
    } = {},
  ) => {
    const { labelClassName, previewClassName } = getConditionItemRuntimeClasses(field.id);
    const isSelected = options.selected || options.insertTarget;

    return (
      <>
        {options.insertTarget ? (
          <span className="pointer-events-none absolute inset-y-1 left-0 w-[3px] rounded-full bg-primary" />
        ) : null}
        <div
          className={cn(
            labelClassName,
            'pointer-events-none shrink-0 text-left text-[11px] font-medium text-foreground',
          )}
          title={field.name}
        >
          <span className="block truncate">{field.name}</span>
        </div>
        <div
          className={cn(
            previewClassName,
            'pointer-events-none min-w-0 shrink-0',
            isSelected && '[&>div]:border-border/60 [&>div]:bg-background [&>div]:shadow-none',
          )}
        >
          {renderPreviewFieldControl(field, fieldIndex, 'condition')}
        </div>
        {options.showResizeHandle !== false ? (
          <div
            data-condition-resize-handle="true"
            className="absolute inset-y-0 right-0 flex w-2 cursor-col-resize items-stretch justify-end"
            onPointerDown={(event) => event.stopPropagation()}
            onMouseDown={(event) => {
              event.stopPropagation();
              startConditionResize(event, field.id);
            }}
            onDoubleClick={(event) => autoFitColumnWidth(
              event,
              field.id,
              currentConfig.fields,
              currentConfig.setFields,
              CONDITION_PANEL_CONTROL_WIDTH,
              CONDITION_PANEL_RESIZE_MAX_WIDTH,
              'filter',
            )}
            title="拖动调整条件宽度，双击可自动适配"
          >
            <span className="h-full w-px bg-border/80 transition-colors group-hover:bg-primary" />
          </div>
        ) : null}
      </>
    );
  }, [
    autoFitColumnWidth,
    currentConfig.fields,
    currentConfig.setFields,
    getConditionItemRuntimeClasses,
    startConditionResize,
  ]);

  return (
    <div className="shrink-0 px-1 pb-2">
      <div className="px-1 py-1">
        {conditionRuntimeRules ? <style>{conditionRuntimeRules}</style> : null}
        <div
          role="button"
          tabIndex={0}
          onClick={() => onActivatePanel(currentScope)}
          onKeyDown={handlePanelKeyDown}
          className="space-y-2 outline-none"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="gap-1.5 rounded-xl border-border/60 bg-background/80 px-2.5 py-1 text-[11px] font-medium text-foreground">
                <Filter className="size-3.5 text-primary" />
                顶部条件
              </Badge>
              <span className="text-[11px] font-medium text-muted-foreground">
                {currentScopeLabel} · {currentConditionFields.length} 项
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5" onClick={(event) => event.stopPropagation()}>
              {canSwitchScope ? (
                <div className="flex items-center gap-1 rounded-xl border border-border/60 bg-background/75 p-1">
                  {(['main', 'left'] as const).map((scope) => {
                    const isActiveScope = activeScope === scope;
                    return (
                      <Button
                        key={`condition-scope-${scope}`}
                        size="sm"
                        variant={isActiveScope ? 'secondary' : 'ghost'}
                        className={cn(
                          'h-7 rounded-lg px-2.5 text-[11px] font-medium',
                          isActiveScope
                            ? 'bg-primary text-white hover:bg-primary/90 hover:text-white'
                            : 'text-muted-foreground hover:text-foreground',
                        )}
                        onClick={() => onScopeSwitch(scope)}
                      >
                        {scope === 'left' ? '左条件' : '主条件'}
                      </Button>
                    );
                  })}
                </div>
              ) : null}
              <Button
                size="sm"
                className="h-8 gap-1.5 rounded-xl bg-primary px-3 text-white shadow-none hover:bg-primary/90 hover:text-white"
                onClick={(event) => {
                  event.stopPropagation();
                  currentConfig.onAdd();
                }}
              >
                <Plus className="size-4" />
                条件
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 rounded-xl border-border/60 bg-background/80 px-3"
                onClick={(event) => {
                  event.stopPropagation();
                  currentConfig.onDelete();
                }}
                disabled={currentConfig.selectedIds.length === 0}
              >
                <Trash2 className="size-4" />
                删除
              </Button>
            </div>
          </div>

          <div className="overflow-auto">
            <DndContext
              sensors={conditionWorkbenchSensors}
              onDragStart={handleConditionWorkbenchDragStart}
              onDragOver={handleConditionWorkbenchDragOver}
              onDragEnd={handleConditionWorkbenchDragEnd}
              onDragCancel={clearConditionWorkbenchDragState}
            >
              <div className={cn(conditionWorkbenchHeightClass, 'flex flex-col gap-1')}>
                {conditionRowNumbers.map((rowNumber) => {
                  const rowFields = conditionFieldsByRow.get(rowNumber) ?? [];
                  const isDropTarget = conditionWorkbenchDrag?.scope === currentScope
                    && conditionWorkbenchDropTarget?.row === rowNumber
                    && conditionWorkbenchDropTarget.beforeId === null;

                  return (
                    <ConditionWorkbenchDropLane
                      key={`condition-row-${rowNumber}`}
                      scope={currentScope}
                      row={rowNumber}
                      className={cn(
                        'scrollbar-none flex min-h-[48px] items-center overflow-visible rounded-lg border border-transparent bg-transparent px-0.5 py-1 transition-colors',
                        isDropTarget && 'border-primary/20 bg-primary/5',
                        rowFields.length === 0 && 'border-dashed border-border/30 bg-transparent text-muted-foreground',
                      )}
                    >
                      <div className="flex min-w-full items-center">
                        <div className="flex min-w-0 flex-1 items-center gap-1">
                          {rowFields.length > 0 ? rowFields.map((field, index) => {
                            const isActive = currentConfig.selectedId === field.id;
                            const isMarked = selectedConditionIds.has(field.id);
                            const fieldIndex = conditionFieldIndexMap.get(field.id) ?? index;
                            const isDragging = conditionWorkbenchDrag?.scope === currentScope
                              && conditionWorkbenchDrag.fieldId === field.id;
                            const isInsertTarget = conditionWorkbenchDrag?.scope === currentScope
                              && conditionWorkbenchDrag.fieldId !== field.id
                              && conditionWorkbenchDropTarget?.row === rowNumber
                              && conditionWorkbenchDropTarget.beforeId === field.id;
                            const isSelected = isActive || isMarked || isInsertTarget;

                            return (
                              <ConditionWorkbenchDraggableItem
                                key={field.id}
                                scope={currentScope}
                                row={rowNumber}
                                fieldId={field.id}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleConditionCardSelect(field.id, event);
                                }}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    handleConditionCardSelect(field.id, event);
                                  }
                                }}
                                className={getConditionItemClassName(field.id, {
                                  dragging: isDragging,
                                  insertTarget: isInsertTarget,
                                  selected: isSelected,
                                })}
                              >
                                {renderConditionItemContent(field, fieldIndex, {
                                  insertTarget: isInsertTarget,
                                  selected: isSelected,
                                })}
                              </ConditionWorkbenchDraggableItem>
                            );
                          }) : (
                            <div className="text-[11px] font-medium text-muted-foreground">
                              拖入本行
                            </div>
                          )}
                        </div>
                      </div>
                    </ConditionWorkbenchDropLane>
                  );
                })}
              </div>
            </DndContext>
          </div>
        </div>
      </div>
    </div>
  );
});

type TableBuilderOptions = {
  showDetailAction?: boolean;
  contextMenuScope?: 'main' | 'detail';
  contextMenuConfig?: {
    enabled: boolean;
    items: any[];
  };
  backgroundSelectable?: boolean;
  tableSelected?: boolean;
  onSelectTable?: () => void;
  canvasLabel?: string;
  detailBoardConfig?: any;
  normalizedDetailBoardConfig?: any;
  renderableColumns?: any[];
  onCanvasDoubleClick?: () => void;
  density?: 'default' | 'compact';
};

type TableBuilderProps = {
  scope: 'left' | 'main' | 'detail';
  cols: any[];
  setCols: React.Dispatch<React.SetStateAction<any[]>>;
  selectedId: string | null;
  selectedForDelete: string[];
  setSelectedForDelete: React.Dispatch<React.SetStateAction<string[]>>;
  options?: TableBuilderOptions;
  activeResize: ActiveWorkbenchResize | null;
  workspaceTheme: string;
  workspaceThemeVars: React.CSSProperties;
  isCompactModuleSetting: boolean;
  businessType: BusinessType;
  activateColumnSelection: (scope: 'left' | 'main' | 'detail', columnId: string | null) => void;
  setBuilderSelectionContextMenu: React.Dispatch<React.SetStateAction<BuilderSelectionContextMenuState>>;
  startResize: (
    e: React.MouseEvent,
    colId: string,
    cols: any[],
    setCols: React.Dispatch<React.SetStateAction<any[]>>,
    minWidth?: number,
    maxWidth?: number,
    mode?: WorkbenchResizeMode,
  ) => void;
  autoFitColumnWidth: (
    event: React.MouseEvent,
    colId: string,
    cols: any[],
    setCols: React.Dispatch<React.SetStateAction<any[]>>,
    minWidth?: number,
    maxWidth?: number,
    mode?: WorkbenchResizeMode,
  ) => void;
};

const MemoTableBuilder = React.memo(function TableBuilder({
  scope,
  cols,
  setCols,
  selectedId,
  selectedForDelete,
  setSelectedForDelete,
  options,
  activeResize,
  workspaceTheme,
  workspaceThemeVars,
  isCompactModuleSetting,
  businessType,
  activateColumnSelection,
  setBuilderSelectionContextMenu,
  startResize,
  autoFitColumnWidth,
}: TableBuilderProps) {
  const contextMenuScope = options?.contextMenuScope;
  const contextMenuConfig = options?.contextMenuConfig;
  const backgroundSelectable = options?.backgroundSelectable ?? false;
  const tableSelected = options?.tableSelected ?? false;
  const onSelectTable = options?.onSelectTable;
  const canvasLabel = options?.canvasLabel ?? '点击空白区域配置表格';
  const detailBoardConfig = options?.normalizedDetailBoardConfig ?? normalizeDetailBoardConfig(options?.detailBoardConfig, cols);
  const renderableCols = options?.renderableColumns ?? cols.filter((column) => isRenderableMainColumn(column));
  const density = options?.density ?? 'default';
  const isCompactCanvas = density === 'compact';
  const detailBoardTheme = getDetailBoardTheme(workspaceTheme);
  const hasDetailBoardFeature = detailBoardConfig.enabled && detailBoardConfig.groups.some((group: any) => group.columnIds.length > 0);
  const detailBoardFeatureLabel = hasDetailBoardFeature ? '双击详情预览' : null;
  const buildScopedSelectionIds = (currentIds: string[], id: string, append: boolean) => {
    if (currentIds.includes(id)) {
      return currentIds;
    }
    return append ? Array.from(new Set([...currentIds, id])) : [id];
  };
  const getColumnRenderWidth = (rawColumn: any) => {
    const normalizedColumn = normalizeColumn(rawColumn);
    return resolveWorkbenchPreviewWidth(
      normalizedColumn.width,
      TABLE_COLUMN_MIN_WIDTH,
      TABLE_COLUMN_COLLAPSED_RENDER_WIDTH,
      activeResize,
      normalizedColumn.id,
      'column',
    );
  };
  const handleColumnHeaderClick = (event: React.MouseEvent<HTMLButtonElement>, id: string) => {
    setBuilderSelectionContextMenu(null);
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      setSelectedForDelete((prev) => (
        prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
      ));
      return;
    }

    if (selectedId === id && selectedForDelete.length === 1 && selectedForDelete[0] === id) {
      return;
    }
    setSelectedForDelete([id]);
    activateColumnSelection(scope, id);
  };
  const handleColumnHeaderContextMenu = (event: React.MouseEvent<HTMLButtonElement>, id: string) => {
    event.preventDefault();
    event.stopPropagation();
    const nextSelectedIds = buildScopedSelectionIds(selectedForDelete, id, event.ctrlKey || event.metaKey);

    setSelectedForDelete(nextSelectedIds);
    activateColumnSelection(scope, id);
    setBuilderSelectionContextMenu({
      kind: 'column',
      scope,
      x: event.clientX,
      y: event.clientY,
      ids: nextSelectedIds,
    });
  };

  const addColumnWidth = isCompactModuleSetting ? 58 : 74;
  const tableSurfaceClass = tableSelected
    ? 'cloudy-glass-panel border-[2px] border-[color:var(--workspace-accent-border-strong)] bg-[color:var(--workspace-accent-surface)] shadow-none'
    : 'cloudy-glass-panel border-slate-200/80';
  const headerDividerClass = tableSelected ? 'border-[color:var(--workspace-accent-border)]' : 'border-slate-200/70 dark:border-slate-700/80';
  const getHeaderButtonClass = (isActive: boolean, isMarkedForDelete: boolean, isTreeRelation: boolean) => (
    isActive
      ? 'bg-[linear-gradient(180deg,rgba(255,252,253,0.98),rgba(255,247,250,1))] shadow-[inset_0_0_0_1px_var(--workspace-accent-border-strong)] dark:bg-[linear-gradient(180deg,rgba(80,7,36,0.26),rgba(59,7,30,0.18))]'
      : isMarkedForDelete
        ? 'bg-[linear-gradient(180deg,rgba(255,248,250,0.98),rgba(255,251,252,1))] shadow-[inset_0_0_0_1px_rgba(191,90,112,0.18)]'
        : isTreeRelation
          ? 'bg-[linear-gradient(180deg,rgba(237,247,255,0.98),rgba(245,250,255,1))] shadow-[inset_0_0_0_1px_rgba(125,176,255,0.46)]'
          : tableSelected
            ? 'bg-slate-50 hover:bg-white dark:bg-slate-900/55 dark:hover:bg-slate-800/65'
            : 'bg-white hover:bg-slate-50 dark:bg-slate-900/55 dark:hover:bg-slate-800/65'
  );
  const getHeaderLabelClass = (isActive: boolean, isMarkedForDelete: boolean, isTreeRelation: boolean) => {
    if (isActive) {
      return 'rounded-md bg-[color:var(--workspace-accent-soft)] px-1.5 py-[3px] text-[color:var(--workspace-accent-strong)] shadow-[inset_0_0_0_1px_var(--workspace-accent-border)]';
    }
    if (isMarkedForDelete) {
      return 'rounded-md bg-[#fff1f4] px-1.5 py-[3px] text-[#bf5a70] shadow-[inset_0_0_0_1px_rgba(191,90,112,0.12)] dark:bg-rose-500/12 dark:text-rose-200';
    }
    if (isTreeRelation) {
      return 'rounded-md bg-[#eaf4ff] px-1.5 py-[3px] text-[#2563eb] shadow-[0_12px_20px_-18px_rgba(59,130,246,0.7)] dark:bg-sky-500/16 dark:text-sky-200';
    }
    return tableSelected
      ? 'px-0 py-0 text-[#ba566d] dark:text-[#f4b5c1]'
      : 'bg-transparent px-0 py-0 text-slate-700 dark:text-slate-100';
  };
  const getHeaderRequiredMarkClass = (isActive: boolean, isMarkedForDelete: boolean, isRequired: boolean, isTreeRelation: boolean) => {
    if (!isRequired) return 'hidden';
    if (isActive) return 'text-white/88';
    if (isTreeRelation) return 'text-[#2563eb] dark:text-sky-200';
    if (isMarkedForDelete || tableSelected) return 'text-[#d15b75]';
    return 'text-[color:var(--workspace-accent-strong)]';
  };
  const getHeaderResizeRailClass = (isActive: boolean) => (
    isActive
      ? 'bg-[color:var(--workspace-accent-soft)]'
      : tableSelected
        ? 'bg-transparent group-hover:bg-white/30 dark:group-hover:bg-white/6'
        : ''
  );
  const tableCanvasClass = tableSelected
    ? 'border-[color:var(--workspace-accent-border-strong)] bg-[color:var(--workspace-accent-surface)] text-[color:var(--workspace-accent-strong)]'
    : 'border-slate-200/80 bg-white text-slate-400 hover:border-slate-200/90 hover:bg-white dark:text-slate-500';
  const tableCanvasIconClass = tableSelected
    ? 'cloudy-glass-orb border-[color:var(--workspace-accent-border)] bg-white/96 text-[color:var(--workspace-accent-strong)]'
    : 'cloudy-glass-orb text-[color:var(--workspace-accent)]';
  const tableCanvasTitleClass = tableSelected
    ? 'text-[color:var(--workspace-accent-strong)]'
    : 'text-slate-500 dark:text-slate-300';
  const themedTableSurfaceClass = tableSurfaceClass;
  const themedTableCanvasClass = tableCanvasClass;
  const tableCanvasPanelShellClass = tableSelected
    ? 'border-[color:var(--workspace-accent-border)] bg-white/96 shadow-[0_24px_56px_-36px_rgba(192,107,125,0.5)] dark:bg-slate-950/86'
    : 'border-white/85 bg-white/94 shadow-[0_24px_48px_-36px_rgba(15,23,42,0.24)] dark:border-slate-800/90 dark:bg-slate-950/84';
  const getHeaderCornerClass = (index: number) => (index === 0 ? 'rounded-tl-[16px]' : '');
  const addColumnHeaderShellClass = tableSelected
    ? 'border-[color:var(--workspace-accent-border)] bg-[color:var(--workspace-accent-soft)] dark:bg-white/6'
    : 'border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(246,249,252,0.6))]';
  const addColumnButtonClass = tableSelected
    ? 'cloudy-glass-orb border-[color:var(--workspace-accent-border)] text-[color:var(--workspace-accent-strong)]'
    : 'cloudy-glass-orb text-[color:var(--workspace-accent)]';
  const totalTableWidth = renderableCols.reduce((sum, col) => sum + getColumnRenderWidth(col), addColumnWidth);
  const tableBuilderContentStyle: React.CSSProperties = {
    width: totalTableWidth,
    minWidth: totalTableWidth,
  };
  const visibleResizeTag = activeResize && renderableCols.some((col) => col.id === activeResize.id) ? activeResize : null;
  const renderCenteredCanvasPanel = () => {
    if (isCompactCanvas) {
      return (
        <div className="pointer-events-none relative z-10 flex w-full max-w-[340px] items-center gap-2 rounded-xl border border-slate-200/80 bg-white/92 px-3 py-2 text-left text-[11px] text-slate-500 shadow-[0_18px_36px_-34px_rgba(15,23,42,0.22)] backdrop-blur-sm dark:border-slate-700 dark:bg-slate-950/84 dark:text-slate-300">
          <span className="material-symbols-outlined text-[15px] text-[color:var(--workspace-accent)]">table_view</span>
          <span className="min-w-0 flex-1 truncate font-medium text-slate-600 dark:text-slate-100">
            {canvasLabel}
          </span>
          <span className="shrink-0 text-[10px] text-slate-400 dark:text-slate-500">
            {hasDetailBoardFeature ? '可预览分组' : '点击配置'}
          </span>
        </div>
      );
    }

    return (
      <div
        className={`pointer-events-none relative z-10 flex w-full flex-col items-center gap-2 rounded-[18px] border text-center backdrop-blur-sm ${tableCanvasPanelShellClass} ${isCompactCanvas ? 'max-w-[320px] px-4 py-3' : 'max-w-[420px] px-5 py-4'}`}
      >
        <div className={`flex items-center justify-center rounded-md border ${isCompactModuleSetting ? 'size-10' : 'size-12'} ${tableCanvasIconClass}`}>
          <span className={`material-symbols-outlined ${isCompactModuleSetting ? 'text-[16px]' : 'text-[20px]'} ${tableSelected ? 'text-[#c06b7d]' : 'text-slate-300 dark:text-slate-500'}`}>table_view</span>
        </div>
        {detailBoardFeatureLabel && (
          <div className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold ${detailBoardTheme.badge}`}>
            {detailBoardFeatureLabel}
          </div>
        )}
        <div className={`font-semibold ${isCompactCanvas ? 'text-[12px]' : 'text-[13px]'} ${tableCanvasTitleClass}`}>
          {canvasLabel}
        </div>
        <div className="text-[11px] text-slate-400">
          {hasDetailBoardFeature ? '双击画布可预览详情分组布局' : '点击画布即可切换到整表配置'}
        </div>
      </div>
    );
  };

  if (cols.length === 0) {
    return (
      <div className={`flex items-center justify-center px-6 text-center text-slate-400 ${isCompactCanvas ? 'min-h-[164px] py-6' : 'h-full min-h-[240px]'}`}>
        <div className="flex flex-col items-center gap-3">
          <div className="cloudy-glass-orb flex size-14 items-center justify-center rounded-3xl">
            <span className="material-symbols-outlined text-[24px] text-slate-300 dark:text-slate-500">data_object</span>
          </div>
          <div>
            <p className="text-[14px] font-bold text-slate-500 dark:text-slate-300">当前区域还没有字段</p>
            <p className="mt-1 text-[12px] text-slate-400">点击新增字段，或直接粘贴列名批量生成。</p>
          </div>
        </div>
      </div>
    );
  }

  const renderTableHead = (compactCanvasVariant: boolean) => (
    <>
      {renderableCols.map((col, index) => {
        const normalizedCol = normalizeColumn(col);
        const isActive = selectedId === col.id;
        const isMarkedForDelete = selectedForDelete.includes(col.id);
        const isTreeRelation = scope === 'main' && businessType !== 'table' && isTreeRelationFieldColumn(normalizedCol);
        const isResizing = activeResize?.id === col.id;
        const headerWidth = getColumnRenderWidth(normalizedCol);
        const isCollapsedHeader = headerWidth <= 18;

        return (
          <th
            key={col.id}
            style={{ width: headerWidth, minWidth: headerWidth }}
            className={`group relative border-b border-r p-0 align-top ${headerDividerClass}`}
          >
            <button
              type="button"
              onClick={(event) => handleColumnHeaderClick(event, col.id)}
              onContextMenu={(event) => handleColumnHeaderContextMenu(event, col.id)}
              className={`relative flex h-full w-full items-center overflow-hidden text-left transition-all ${getHeaderCornerClass(index)} ${isCollapsedHeader ? (compactCanvasVariant ? 'min-h-[34px] px-0 pr-1.5 py-0' : 'min-h-[36px] px-0 pr-1.5 py-0') : isCompactModuleSetting ? `${compactCanvasVariant ? 'min-h-[32px]' : 'min-h-[34px]'} px-1.5 pr-3 py-0` : `${compactCanvasVariant ? 'min-h-[38px]' : 'min-h-[42px]'} px-2 pr-3.5 py-0`} ${getHeaderButtonClass(isActive, isMarkedForDelete, isTreeRelation)}`}
            >
              <div className={`flex min-w-0 flex-1 items-center ${isCollapsedHeader ? 'justify-end' : ''}`}>
                <div
                  className={`inline-flex max-w-full items-center font-semibold tracking-[0.01em] transition-all ${isCollapsedHeader ? 'px-0 py-0 opacity-0' : ''} ${isCompactModuleSetting ? 'text-[11px]' : 'text-[12px]'} ${getHeaderLabelClass(isActive, isMarkedForDelete, isTreeRelation)}`}
                  title={normalizedCol.name}
                >
                  <span className="truncate">{normalizedCol.name}</span>
                  {isTreeRelation && !isCollapsedHeader && (
                    <span className="ml-1.5 inline-flex items-center rounded-full bg-white/75 px-1.5 py-0.5 text-[9px] font-black leading-none text-[#2563eb] shadow-[0_10px_18px_-16px_rgba(37,99,235,0.7)] dark:bg-sky-500/16 dark:text-sky-100">
                      树
                    </span>
                  )}
                  <span className={`ml-0.5 text-[10px] leading-none ${getHeaderRequiredMarkClass(isActive, isMarkedForDelete, normalizedCol.required, isTreeRelation)}`}>*</span>
                </div>
              </div>
            </button>
            <div
              className={`absolute right-0 top-0 bottom-0 z-20 flex ${isCompactModuleSetting ? 'w-2.5' : 'w-3'} cursor-col-resize items-center justify-center ${getHeaderResizeRailClass(isActive)}`}
              onMouseDown={(event) => startResize(event, col.id, cols, setCols, TABLE_COLUMN_RESIZE_MIN_WIDTH, TABLE_COLUMN_RESIZE_MAX_WIDTH, 'column')}
              onDoubleClick={(event) => autoFitColumnWidth(event, col.id, cols, setCols, TABLE_COLUMN_MIN_WIDTH, TABLE_COLUMN_RESIZE_MAX_WIDTH, 'column')}
              title="拖动调整列宽，双击可自动适配"
            >
              <span className={`h-5 ${compactCanvasVariant ? 'w-px' : 'w-px'} rounded-full transition-all ${isResizing ? 'bg-[#2563eb] shadow-[0_0_0_2px_rgba(37,99,235,0.12)]' : 'bg-transparent group-hover:bg-slate-300 dark:group-hover:bg-slate-500'}`} />
            </div>
          </th>
        );
      })}
      <th
        style={{ width: addColumnWidth, minWidth: addColumnWidth }}
        className={`border-b p-0 align-top ${addColumnHeaderShellClass}`}
      >
        <button
          type="button"
          onClick={() => setCols((prev) => [...prev, buildColumn(scope === 'detail' ? 'd_col' : `${scope}_col`, prev.length + 1)])}
          className={`flex h-full w-full items-center justify-center rounded-tr-md transition-all ${isCompactModuleSetting ? (compactCanvasVariant ? 'min-h-[34px]' : 'min-h-[38px]') : (compactCanvasVariant ? 'min-h-[40px]' : 'min-h-[46px]')} hover:bg-white/55 dark:hover:bg-white/8`}
          title="新增字段"
        >
          <div className={`inline-flex items-center justify-center rounded-md border ${addColumnButtonClass} ${isCompactModuleSetting ? 'size-8' : 'size-9'}`}>
            <span className="material-symbols-outlined text-[17px]">add</span>
          </div>
        </button>
      </th>
    </>
  );

  if (backgroundSelectable) {
    return (
      <div style={workspaceThemeVars} className={`cloudy-cloud-grid relative min-h-0 min-w-0 w-full flex-col overflow-x-auto overflow-y-hidden rounded-[26px] border ${themedTableSurfaceClass} ${isCompactCanvas ? 'flex h-full min-h-[184px]' : 'flex h-full min-h-[260px]'} ${isCompactModuleSetting ? 'p-1.5' : 'p-2'}`}>
        {visibleResizeTag && (
          <div className="pointer-events-none absolute right-3 top-3 z-30 inline-flex items-center gap-2 rounded-md border border-[#0b6bcb]/15 bg-white/96 px-2.5 py-1 text-[11px] font-bold text-[#0b6bcb] dark:border-[#0b6bcb]/20 dark:bg-slate-900/92">
            <span className="material-symbols-outlined text-[14px]">straighten</span>
            <span className="max-w-[150px] truncate">{visibleResizeTag.label}</span>
            <span className="rounded-full bg-[#0b6bcb]/8 px-2 py-0.5">{Math.round(visibleResizeTag.width)}px</span>
          </div>
        )}
        <div className="min-w-0 shrink-0">
          <table
            style={{ ...tableBuilderContentStyle, tableLayout: 'fixed' }}
            className="table-fixed border-separate border-spacing-0 text-left text-[12px]"
          >
            <colgroup>
              {renderableCols.map((col) => {
                const headerWidth = getColumnRenderWidth(col);
                return <col key={`col-${col.id}`} style={{ width: headerWidth, minWidth: headerWidth }} />;
              })}
              <col style={{ width: addColumnWidth, minWidth: addColumnWidth }} />
            </colgroup>
            <thead className={`sticky top-0 z-20 select-none bg-transparent ${tableSelected ? 'shadow-[inset_0_-1px_0_rgba(239,199,207,0.55)]' : ''}`}>
              <tr>{renderTableHead(true)}</tr>
            </thead>
          </table>
        </div>
        <button
          type="button"
          onClick={onSelectTable}
          onDoubleClick={(event) => {
            event.stopPropagation();
            options?.onCanvasDoubleClick?.();
          }}
          className={`relative mt-1 flex w-full items-center justify-center overflow-hidden rounded-[20px] border px-4 text-center transition-all dark:border-slate-700 ${themedTableCanvasClass} ${isCompactCanvas ? 'min-h-[108px] flex-1 py-3' : 'min-h-[188px] flex-1 py-6'} ${backgroundSelectable ? 'cursor-pointer' : 'cursor-default'}`}
        >
          <div className={`pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.28),transparent_62%)] ${tableSelected ? 'opacity-80' : 'opacity-100'}`} />
          <div className="relative z-10 flex h-full w-full items-center justify-center">
            {renderCenteredCanvasPanel()}
          </div>
        </button>
      </div>
    );
  }

  return (
    <div style={workspaceThemeVars} className={`cloudy-cloud-grid relative min-h-0 min-w-0 w-full overflow-x-auto overflow-y-hidden rounded-[26px] border ${themedTableSurfaceClass} ${isCompactModuleSetting ? 'p-1.5' : 'p-2'}`}>
      {visibleResizeTag && (
        <div className="pointer-events-none absolute right-3 top-3 z-30 inline-flex items-center gap-2 rounded-md border border-[#1686e3]/15 bg-white/96 px-2.5 py-1 text-[11px] font-bold text-[#1686e3] dark:border-[#1686e3]/20 dark:bg-slate-900/92">
          <span className="material-symbols-outlined text-[14px]">straighten</span>
          <span className="max-w-[150px] truncate">{visibleResizeTag.label}</span>
          <span className="rounded-full bg-[#1686e3]/8 px-2 py-0.5">{Math.round(visibleResizeTag.width)}px</span>
        </div>
      )}
      <table
        style={{ ...tableBuilderContentStyle, tableLayout: 'fixed' }}
        className="table-fixed overflow-hidden rounded-[18px] border-separate border-spacing-0 text-left text-[12px]"
      >
        <colgroup>
          {renderableCols.map((col) => {
            const headerWidth = getColumnRenderWidth(col);
            return <col key={`col-${col.id}`} style={{ width: headerWidth, minWidth: headerWidth }} />;
          })}
          <col style={{ width: addColumnWidth, minWidth: addColumnWidth }} />
        </colgroup>
        <thead className={`sticky top-0 z-20 select-none bg-transparent ${tableSelected ? 'shadow-[inset_0_-1px_0_rgba(239,199,207,0.55)]' : ''}`}>
          <tr>{renderTableHead(false)}</tr>
        </thead>
        <tbody className="text-slate-600 dark:text-slate-300">
          <tr>
            <td colSpan={renderableCols.length + 1} className="p-0">
              <button
                type="button"
                onClick={onSelectTable}
                onDoubleClick={(event) => {
                  event.stopPropagation();
                  options?.onCanvasDoubleClick?.();
                }}
                className={`flex w-full items-center justify-center px-4 ${isCompactModuleSetting ? 'min-h-[190px] py-4' : 'min-h-[230px] py-6'} rounded-b-md border-t text-center transition-all ${tableSelected ? 'border-[#efd6db]/85 bg-[#fff7f9] hover:bg-[#fff3f6] dark:border-rose-400/18 dark:bg-[#efc7cf]/10' : 'border-slate-100 bg-slate-50/60 hover:bg-slate-50 dark:border-slate-800 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(15,23,42,0.98))]'} ${backgroundSelectable ? 'cursor-pointer' : 'cursor-default'}`}
              >
                {renderCenteredCanvasPanel()}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
});

export default function Dashboard({ currentUserName, onLogout }: DashboardProps) {
  const debugParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const currentUserAvatarText = currentUserName.trim().slice(0, 1) || '人';
  const debugStepParam = Number(debugParams?.get('step') || 1);
  const initialConfigStep = Number.isFinite(debugStepParam) ? Math.min(MAX_CONFIG_STEP, Math.max(1, debugStepParam)) : 1;
  const initialConfigOpen = debugParams?.get('config') === '1' || debugParams?.has('step') || false;
  const initialDetailPreview = debugParams?.get('detailPreview') === '1';
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
  const [menuConfigDraft, setMenuConfigDraft] = useState<ModuleMenuDraft>(MENU_CONFIG_DEFAULTS);
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
  const currentPrimaryTableName = '';
  const currentDetailTableName = '';
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const titleEditorRef = useRef<HTMLHeadingElement>(null);
  const moduleIntroSelectionRef = useRef<Range | null>(null);
  const moduleIntroSelectedImageRef = useRef<HTMLElement | null>(null);
  const moduleIntroImageResizeRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const moduleSettingsSectionRef = useRef<HTMLDivElement | null>(null);
  const moduleIntroTitleValueRef = useRef(MODULE_INTRO_DEFAULT_TITLE);
  const moduleIntroBodyValueRef = useRef(MODULE_INTRO_DEFAULT_HTML);
  const [moduleIntroBlockType, setModuleIntroBlockType] = useState<'paragraph' | 'h1' | 'h2' | 'h3'>('paragraph');
  const [moduleIntroSelectedImageWidth, setModuleIntroSelectedImageWidth] = useState<number | null>(null);

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
  const [isFullscreenEditor, setIsFullscreenEditor] = useState(false);
  const [isFullscreenConfig, setIsFullscreenConfig] = useState(false);
  const [restrictionActiveTab, setRestrictionActiveTab] = useState<RestrictionConfigTabId>('guard');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const markStepCompleted = (stepId: number) => {
    setCompletedSteps((prev) => (prev.includes(stepId) ? prev : [...prev, stepId]));
  };

  const execRichTextCommand = (command: string, value?: string) => {
    const richDocument = document as Document & {
      execCommand?: (commandId: string, showUI?: boolean, value?: string) => boolean;
    };
    return richDocument.execCommand ? richDocument.execCommand(command, false, value) : false;
  };
  const getModuleIntroSelectionAnchor = (node: Node | null) => {
    if (!node) return null;
    return node instanceof HTMLElement ? node : node.parentElement;
  };
  const updateModuleIntroBlockType = (node: Node | null) => {
    const anchor = getModuleIntroSelectionAnchor(node);
    const block = anchor?.closest('h1, h2, h3, p');
    const tagName = block?.tagName.toLowerCase();
    if (tagName === 'h1' || tagName === 'h2' || tagName === 'h3') {
      setModuleIntroBlockType(tagName);
      return;
    }
    setModuleIntroBlockType('paragraph');
  };
  const clampModuleIntroImageWidth = (width: number) => {
    const availableWidth = editorRef.current?.clientWidth ?? 860;
    return Math.max(180, Math.min(width, Math.max(220, availableWidth - 12)));
  };
  const buildModuleIntroImageHtml = (src: string, imageName: string, width = 420) => {
    const nextWidth = clampModuleIntroImageWidth(width);
    return `
      <figure class="module-intro-figure" data-module-intro-image="true" contenteditable="false" style="width:${nextWidth}px">
        <div class="module-intro-image-frame">
          <img src="${src}" alt="${imageName}" />
          <span class="module-intro-image-resize-handle" data-module-intro-image-resize-handle="true"></span>
        </div>
      </figure>
      <p><br></p>
    `;
  };
  const ensureModuleIntroImageStructure = (image: HTMLImageElement) => {
    const figure = image.closest('figure');
    if (!(figure instanceof HTMLElement)) return null;
    figure.classList.add('module-intro-figure');
    figure.dataset.moduleIntroImage = 'true';
    figure.setAttribute('contenteditable', 'false');

    let frame = figure.querySelector('.module-intro-image-frame');
    if (!(frame instanceof HTMLElement)) {
      frame = document.createElement('div');
      frame.className = 'module-intro-image-frame';
      image.parentNode?.insertBefore(frame, image);
      frame.appendChild(image);
    }

    if (!figure.querySelector('[data-module-intro-image-resize-handle="true"]')) {
      const handle = document.createElement('span');
      handle.className = 'module-intro-image-resize-handle';
      handle.dataset.moduleIntroImageResizeHandle = 'true';
      frame.appendChild(handle);
    }

    if (!figure.style.width) {
      figure.style.width = `${clampModuleIntroImageWidth(image.naturalWidth || image.width || 420)}px`;
    }

    return figure;
  };
  const normalizeModuleIntroImages = () => {
    if (!editorRef.current) return;
    editorRef.current.querySelectorAll('img').forEach((node) => {
      if (node instanceof HTMLImageElement) {
        ensureModuleIntroImageStructure(node);
      }
    });
  };
  const clearModuleIntroImageSelection = () => {
    if (moduleIntroSelectedImageRef.current) {
      moduleIntroSelectedImageRef.current.dataset.selected = 'false';
    }
    moduleIntroSelectedImageRef.current = null;
    setModuleIntroSelectedImageWidth(null);
  };
  const syncModuleIntroSelectedImageWidth = () => {
    if (!moduleIntroSelectedImageRef.current) {
      setModuleIntroSelectedImageWidth(null);
      return;
    }
    setModuleIntroSelectedImageWidth(Math.round(moduleIntroSelectedImageRef.current.getBoundingClientRect().width));
  };
  const selectModuleIntroImage = (figure: HTMLElement) => {
    if (moduleIntroSelectedImageRef.current && moduleIntroSelectedImageRef.current !== figure) {
      moduleIntroSelectedImageRef.current.dataset.selected = 'false';
    }
    moduleIntroSelectedImageRef.current = figure;
    figure.dataset.selected = 'true';
    syncModuleIntroSelectedImageWidth();
  };
  const applyModuleIntroImageWidth = (nextWidth: number) => {
    if (!moduleIntroSelectedImageRef.current) return;
    const width = clampModuleIntroImageWidth(nextWidth);
    moduleIntroSelectedImageRef.current.style.width = `${width}px`;
    syncModuleIntroSelectedImageWidth();
    syncModuleIntroDraft();
  };
  const handleModuleIntroImagePreset = (preset: 'small' | 'medium' | 'large' | 'full') => {
    if (!editorRef.current) return;
    if (preset === 'small') {
      applyModuleIntroImageWidth(280);
      return;
    }
    if (preset === 'medium') {
      applyModuleIntroImageWidth(420);
      return;
    }
    if (preset === 'large') {
      applyModuleIntroImageWidth(620);
      return;
    }
    applyModuleIntroImageWidth(editorRef.current.clientWidth - 12);
  };
  const syncModuleIntroDraft = () => {
    if (titleEditorRef.current) {
      const nextTitle = titleEditorRef.current.innerText.replace(/\s+/g, ' ').trim();
      moduleIntroTitleValueRef.current = nextTitle || MODULE_INTRO_DEFAULT_TITLE;
      if (!nextTitle) {
        titleEditorRef.current.innerText = MODULE_INTRO_DEFAULT_TITLE;
      }
    }
    if (editorRef.current) {
      normalizeModuleIntroImages();
      const nextHtml = editorRef.current.innerHTML.trim();
      moduleIntroBodyValueRef.current = nextHtml || '<p><br></p>';
      if (!nextHtml) {
        editorRef.current.innerHTML = '<p><br></p>';
      }
    }
  };
  const hydrateModuleIntroEditor = () => {
    if (titleEditorRef.current && !titleEditorRef.current.innerText.trim()) {
      titleEditorRef.current.innerText = moduleIntroTitleValueRef.current;
    }
    if (editorRef.current && !editorRef.current.innerHTML.trim()) {
      editorRef.current.innerHTML = moduleIntroBodyValueRef.current;
    }
    normalizeModuleIntroImages();
  };
  const focusModuleIntroEditorEnd = () => {
    if (!editorRef.current) return;
    const selection = window.getSelection();
    if (!selection) return;
    editorRef.current.focus();
    const range = document.createRange();
    range.selectNodeContents(editorRef.current);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
    moduleIntroSelectionRef.current = range.cloneRange();
    updateModuleIntroBlockType(range.startContainer);
  };
  const saveModuleIntroSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !editorRef.current) return;
    const range = selection.getRangeAt(0);
    if (!editorRef.current.contains(range.commonAncestorContainer)) return;
    moduleIntroSelectionRef.current = range.cloneRange();
    updateModuleIntroBlockType(range.startContainer);
  };
  const restoreModuleIntroSelection = () => {
    if (!editorRef.current) return false;
    const selection = window.getSelection();
    if (!selection) return false;
    editorRef.current.focus();
    if (moduleIntroSelectionRef.current) {
      selection.removeAllRanges();
      selection.addRange(moduleIntroSelectionRef.current);
      updateModuleIntroBlockType(moduleIntroSelectionRef.current.startContainer);
      return true;
    }
    focusModuleIntroEditorEnd();
    return true;
  };
  const applyModuleIntroCommand = (command: string, value?: string) => {
    if (!editorRef.current) return;
    restoreModuleIntroSelection();
    execRichTextCommand(command, value);
    syncModuleIntroDraft();
    saveModuleIntroSelection();
  };
  const insertModuleIntroHtml = (html: string) => {
    if (!editorRef.current) return;
    restoreModuleIntroSelection();
    execRichTextCommand('insertHTML', html);
    syncModuleIntroDraft();
    saveModuleIntroSelection();
  };
  const openModuleIntroImagePicker = () => {
    saveModuleIntroSelection();
    fileInputRef.current?.click();
  };
  const handleModuleIntroImageFiles = (files: Iterable<File> | null | undefined) => {
    const imageFile = Array.from(files ?? []).find((file) => file.type.startsWith('image/'));
    if (!imageFile) {
      showToast('请选择 PNG、JPG、SVG 等图片文件');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result;
      if (typeof src !== 'string') return;
      const imageName = escapeHtmlAttribute(imageFile.name.replace(/\.[^.]+$/, '') || '流程图');
      insertModuleIntroHtml(buildModuleIntroImageHtml(src, imageName));
      window.requestAnimationFrame(() => {
        if (!editorRef.current) return;
        const images = Array.from(editorRef.current.querySelectorAll('[data-module-intro-image="true"]'));
        const lastImage = images.at(-1);
        if (lastImage instanceof HTMLElement) {
          selectModuleIntroImage(lastImage);
          syncModuleIntroDraft();
        }
      });
      showToast('图片已插入模块介绍');
    };
    reader.readAsDataURL(imageFile);
  };
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleModuleIntroImageFiles(event.target.files);
    event.target.value = '';
  };
  const handleModuleIntroFormatChange = (nextType: 'paragraph' | 'h1' | 'h2' | 'h3') => {
    setModuleIntroBlockType(nextType);
    const formatValue = nextType === 'paragraph' ? '<p>' : `<${nextType}>`;
    applyModuleIntroCommand('formatBlock', formatValue);
  };
  const handleModuleIntroLinkInsert = () => {
    const selectedText = window.getSelection()?.toString().trim();
    if (!selectedText) {
      showToast('先选中文本，再插入链接');
      return;
    }
    const url = window.prompt('请输入链接地址', 'https://');
    if (!url) return;
    applyModuleIntroCommand('createLink', url);
  };
  const handleModuleIntroTableInsert = () => {
    insertModuleIntroHtml(
      `
        <div class="module-intro-table-wrap">
          <table class="module-intro-table">
            <thead>
              <tr><th>阶段</th><th>目标</th><th>说明</th></tr>
            </thead>
            <tbody>
              <tr><td>核算</td><td>统一口径</td><td>建立跨部门一致的成本归集规则。</td></tr>
              <tr><td>分析</td><td>识别异常</td><td>通过差异分析快速定位波动来源。</td></tr>
              <tr><td>预测</td><td>辅助决策</td><td>结合历史数据输出经营预警与建议。</td></tr>
            </tbody>
          </table>
        </div>
        <p><br></p>
      `,
    );
  };
  const polishModuleIntroContent = () => {
    if (!editorRef.current) return;
    const editor = editorRef.current;
    if (!editor.querySelector('.module-intro-highlight')) {
      const leadParagraph = editor.querySelector('p');
      const summary = (leadParagraph?.textContent || '围绕成本核算、预算控制与预测预警，形成结构化业务介绍。').trim();
      editor.insertAdjacentHTML(
        'afterbegin',
        `
          <div class="module-intro-highlight">
            <div class="module-intro-highlight-eyebrow">AI 润色摘要</div>
            <p>${escapeHtmlAttribute(summary.length > 96 ? `${summary.slice(0, 96)}...` : summary)}</p>
            <div class="module-intro-pill-row">
              <span>业务全景</span>
              <span>执行闭环</span>
              <span>经营分析</span>
            </div>
          </div>
        `,
      );
    }
    syncModuleIntroDraft();
    showToast('已优化模块介绍的结构层次');
  };
  const handleModuleIntroEditorMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null;
    if (!target) return;

    const resizeHandle = target.closest('[data-module-intro-image-resize-handle="true"]');
    if (resizeHandle instanceof HTMLElement) {
      const figure = resizeHandle.closest('[data-module-intro-image="true"]');
      if (!(figure instanceof HTMLElement)) return;
      event.preventDefault();
      event.stopPropagation();
      selectModuleIntroImage(figure);
      moduleIntroImageResizeRef.current = {
        startX: event.clientX,
        startWidth: figure.getBoundingClientRect().width,
      };
      return;
    }

    const figure = target.closest('[data-module-intro-image="true"]');
    if (figure instanceof HTMLElement) {
      event.preventDefault();
      selectModuleIntroImage(figure);
      return;
    }

    clearModuleIntroImageSelection();
  };

  useEffect(() => {
    if (configStep !== 3) return;
    const frameId = window.requestAnimationFrame(() => {
      hydrateModuleIntroEditor();
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [configStep, isFullscreenEditor]);

  useEffect(() => {
    const handleSelectionChange = () => {
      saveModuleIntroSelection();
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!moduleIntroImageResizeRef.current || !moduleIntroSelectedImageRef.current) return;
      event.preventDefault();
      const delta = event.clientX - moduleIntroImageResizeRef.current.startX;
      applyModuleIntroImageWidth(moduleIntroImageResizeRef.current.startWidth + delta);
    };
    const handleMouseUp = () => {
      if (!moduleIntroImageResizeRef.current) return;
      moduleIntroImageResizeRef.current = null;
      syncModuleIntroDraft();
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

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
    name: `新字段 ${index}`,
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
  const buildConditionWorkbenchConfig = (overrides: Partial<ConditionWorkbenchConfig> = {}): ConditionWorkbenchConfig => ({
    rows: 1,
    bulkDraft: '',
    ...overrides,
  });
  const buildBillHeaderWorkbenchConfig = (overrides: Partial<BillHeaderWorkbenchConfig> = {}): BillHeaderWorkbenchConfig => ({
    rows: 3,
    ...overrides,
  });

  const normalizePopupMenuNumber = (value: any, fallback = 0) => {
    const nextValue = Number(value);
    return Number.isFinite(nextValue) ? nextValue : fallback;
  };

  const normalizeContextMenuItem = (item: Record<string, any> = {}, index = 1) => {
    const menuName = item.menuname ?? item.menuName ?? item.label ?? `右键功能 ${index}`;
    const templateName = item.dllname ?? item.dllName ?? item.actionKey ?? `action_${index}`;
    const conditionValue = item.menuCond ?? item.menuCondition ?? item.disabledCondition ?? '';
    const actionValue = item.action ?? item.actionSql ?? '';
    const actionTypeValue = item.actiontype ?? item.actionType;
    const orderValue = item.orderid ?? item.orderId;
    const menuIdValue = item.menuid ?? item.menuId;
    const beforeMessageValue = item.beforeMsg ?? item.beforeMessage ?? '';

    return {
      id: item.id ?? `ctx_${Date.now()}_${index}`,
      tab: item.tab ?? '',
      label: menuName,
      menuname: menuName,
      dllname: templateName,
      actionKey: templateName,
      dllpar1: item.dllpar1 ?? '',
      dllpar2: item.dllpar2 ?? '',
      dllpar3: item.dllpar3 ?? '',
      dllpar4: item.dllpar4 ?? '',
      dllpar5: item.dllpar5 ?? '',
      dllpar6: item.dllpar6 ?? '',
      dllpar7: item.dllpar7 ?? '',
      dllpar8: item.dllpar8 ?? '',
      dllpar9: item.dllpar9 ?? '',
      dllpar10: item.dllpar10 ?? '',
      visible: normalizePopupMenuNumber(item.visible, 0),
      action: actionValue,
      actiontype: normalizePopupMenuNumber(actionTypeValue, 0),
      orderid: normalizePopupMenuNumber(orderValue, index),
      beforeMsg: beforeMessageValue,
      msgSuccess: item.msgSuccess ?? '',
      msgError: item.msgError ?? '',
      menuid: menuIdValue ?? '',
      menuCond: conditionValue,
      disabledCondition: conditionValue,
      menuType: normalizePopupMenuNumber(item.menuType ?? item.menutype, 0),
      visible1: normalizePopupMenuNumber(item.visible1, 0),
      visible2: normalizePopupMenuNumber(item.visible2, 0),
      maxwindow: normalizePopupMenuNumber(item.maxwindow, 0),
      ifRefresh: normalizePopupMenuNumber(item.ifRefresh, 0),
      showMobile: normalizePopupMenuNumber(item.showMobile, 0),
      privilegeOper: item.privilegeOper ?? '',
      DBClickEvent: normalizePopupMenuNumber(item.DBClickEvent, 0),
      ifMoreClick: normalizePopupMenuNumber(item.ifMoreClick, 0),
      ShowToolBar: normalizePopupMenuNumber(item.ShowToolBar, 0),
      defailtimage: item.defailtimage ?? '',
      showMode: normalizePopupMenuNumber(item.showMode, 0),
      addShowMode: normalizePopupMenuNumber(item.addShowMode, 0),
      stepcode: item.stepcode ?? '',
      Fremark: item.Fremark ?? '',
      mergeExec: normalizePopupMenuNumber(item.mergeExec, 0),
      isCopy: normalizePopupMenuNumber(item.isCopy, 0),
      beforeTab: item.beforeTab ?? '',
      isStartRun: normalizePopupMenuNumber(item.isStartRun, 0),
      isMrpClickBtn: normalizePopupMenuNumber(item.isMrpClickBtn, 0),
      disabled: Boolean(item.disabled),
    };
  };

  const buildContextMenuItem = (index: number, overrides: Record<string, any> = {}) =>
    normalizeContextMenuItem({
      id: `ctx_${Date.now()}_${index}`,
      orderid: index,
      ...overrides,
    }, index);

  const buildGridColorRule = (index: number, overrides: Record<string, any> = {}) => ({
    id: `color_${Date.now()}_${index}`,
    label: `颜色规则 ${index}`,
    disabled: false,
    field: '',
    operator: '等于',
    value: '',
    tab: '',
    textColor: '#9f1239',
    backgroundColor: '#ffe4e6',
    note: '',
    ...overrides,
  });
  const mapSingleTableContextMenuItem = (item: SingleTableContextMenuDto, index: number) => normalizeContextMenuItem({
    ...item,
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
      disabled: !useFlag,
      note: conditionSql,
      conditionSql,
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
    sqlPrompt: '',
    sourceMode: 'sql',
    sourceModuleCode: '',
    sourceCondition: '',
    tableType: '普通表格',
    contextMenuEnabled: false,
    contextMenuItems: [buildContextMenuItem(1, { label: '查看详情', actionKey: 'open-detail' })],
    colorRulesEnabled: false,
    colorRules: [],
    chartConfig: buildDetailChartConfig(),
    detailBoard: buildDetailBoardConfig(),
    ...overrides,
  });

  const buildDetailTabConfig = (overrides: Record<string, any> = {}) => ({
    tab: currentModuleCode,
    tabKey: '',
    detailName: '',
    detailType: '表格',
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
  const mapSingleTableDetailRecord = (detail: SingleTableDetailDto, index: number) => {
    const backendId = getRecordFieldValue(detail, 'id');
    const backendFormKey = toRecordText(getRecordFieldValue(detail, 'formkey', 'formKey'));
    const backendTabKey = toRecordText(getRecordFieldValue(detail, 'tabkey', 'tabKey'));
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
        tab: toRecordText(getRecordFieldValue(detail, 'tab')) || currentModuleCode,
        tabKey: backendTabKey || backendFormKey || detailTabId,
        detailName,
        detailType: fillType,
        dllTemplate: toRecordText(getRecordFieldValue(detail, 'library', 'dlltemplate', 'dllTemplate')),
        relatedModule: toRecordText(getRecordFieldValue(detail, 'unionmodule', 'UnionModule', 'relatedmodule', 'relatedModule')),
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
        sourceCondition: relatedCondition,
        tableType,
      }),
    };
  };

  function buildDetailBoardGroup(index: number, columnIds: string[] = [], overrides: Record<string, any> = {}) {
    const presets = [
      { name: '主信息', description: '适合放编号、名称、主抬头字段' },
      { name: '业务状态', description: '适合放状态、归属、业务阶段' },
      { name: '扩展补充', description: '适合放备注、说明和补充字段' },
    ];
    const preset = presets[index - 1] ?? { name: `信息分组 ${index}`, description: '用于详情流布局展示的一组字段' };

    return {
      id: `detail_group_${Date.now()}_${index}`,
      name: preset.name,
      description: preset.description,
      columnIds,
      rows: Math.min(3, Math.max(DETAIL_BOARD_GROUP_MIN_ROWS, Math.ceil(Math.max(columnIds.length, 1) / 2))),
      columnRows: Object.fromEntries(columnIds.map((columnId, columnIndex) => [columnId, Math.floor(columnIndex / 2) + 1])),
      columnsPerRow: 2,
      columnWidths: {},
      columnHeights: {},
      ...overrides,
    };
  }

  function createSuggestedDetailBoardGroups(columns: any[]) {
    const columnIds = columns.map((column) => column.id).filter(Boolean);

    if (columnIds.length === 0) {
      return [
        buildDetailBoardGroup(1),
        buildDetailBoardGroup(2, [], { name: '业务信息', description: '勾选字段后会按流式卡片自动排布' }),
      ];
    }

    const chunks = [
      columnIds.slice(0, 2),
      columnIds.slice(2, 5),
      columnIds.slice(5, 8),
    ].filter((chunk) => chunk.length > 0);

    return chunks.map((columnIdsChunk, index) => (
      buildDetailBoardGroup(index + 1, columnIdsChunk)
    ));
  }

  function buildDetailBoardConfig(columns: any[] = [], overrides: Record<string, any> = {}) {
    return {
      enabled: false,
      theme: 'aurora',
      sortColumnId: columns[0]?.id ?? null,
      groups: createSuggestedDetailBoardGroups(columns),
      ...overrides,
    };
  }

  function normalizeDetailBoardConfig(config: any, columns: any[] = []) {
    const availableColumnIds = new Set(columns.map((column) => column.id));
    const suggestedGroups = createSuggestedDetailBoardGroups(columns);
    const hasCustomGroups = Array.isArray(config?.groups);
    const rawGroups = hasCustomGroups ? config.groups : suggestedGroups;
    const normalizedGroups = rawGroups.map((group: any, index: number) => (
      (() => {
        const columnIds = Array.from(new Set((group?.columnIds ?? []).filter((columnId: string) => availableColumnIds.has(columnId))));
        const legacyColumnsPerRow = Math.max(1, Math.min(4, Number(group?.columnsPerRow) || 2));
        const rows = clampValue(
          Number.isFinite(Number(group?.rows))
            ? Number(group.rows)
            : Math.max(DETAIL_BOARD_GROUP_MIN_ROWS, Math.ceil(Math.max(columnIds.length, 1) / legacyColumnsPerRow)),
          DETAIL_BOARD_GROUP_MIN_ROWS,
          DETAIL_BOARD_GROUP_MAX_ROWS,
        );
        const rawColumnRows = Object.fromEntries(
          columnIds.map((columnId: string, columnIndex: number) => {
            const explicitRow = Number(group?.columnRows?.[columnId]);
            const row = Number.isFinite(explicitRow)
              ? explicitRow
              : Math.floor(columnIndex / legacyColumnsPerRow) + 1;
            return [columnId, clampValue(row, DETAIL_BOARD_GROUP_MIN_ROWS, rows)];
          }),
        );

        return {
          id: group?.id ?? buildDetailBoardGroup(index + 1).id,
          name: typeof group?.name === 'string' ? group.name : `信息分组 ${index + 1}`,
          description: group?.description ?? '',
          columnIds,
          rows,
          columnRows: rawColumnRows,
          columnsPerRow: legacyColumnsPerRow,
          columnWidths: Object.fromEntries(
            Object.entries(group?.columnWidths ?? {}).filter(([columnId, width]) => (
              availableColumnIds.has(columnId) && Number(width) > 0
            )),
          ),
          columnHeights: Object.fromEntries(
            Object.entries(group?.columnHeights ?? {}).filter(([columnId, height]) => (
              availableColumnIds.has(columnId) && Number(height) > 0
            )),
          ),
        };
      })()
    ));

    return {
      enabled: Boolean(config?.enabled),
      theme: DETAIL_BOARD_THEME_OPTIONS.some((option) => option.value === config?.theme) ? config.theme : 'aurora',
      sortColumnId: availableColumnIds.has(config?.sortColumnId) ? config.sortColumnId : columns[0]?.id ?? null,
      groups: hasCustomGroups ? normalizedGroups : suggestedGroups,
    };
  }

  function getDetailBoardTheme(theme?: string) {
    return DETAIL_BOARD_THEME_STYLES[theme || 'aurora'] ?? DETAIL_BOARD_THEME_STYLES.aurora;
  }

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
  const getBillHeaderLegacyRow = (field: any) => {
    const legacyY = Number.isFinite(Number(field?.canvasY))
      ? Number(field.canvasY)
      : BILL_FORM_LAYOUT_PADDING_Y;
    return Math.floor(
      Math.max(0, legacyY - BILL_FORM_LAYOUT_PADDING_Y) / (BILL_FORM_ROW_HEIGHT + BILL_FORM_LAYOUT_GAP_Y),
    ) + 1;
  };
  const getBillHeaderLegacyMetrics = (field: any) => ({
    x: Number.isFinite(Number(field?.canvasX)) ? Number(field.canvasX) : BILL_FORM_LAYOUT_PADDING_X,
    y: Number.isFinite(Number(field?.canvasY)) ? Number(field.canvasY) : BILL_FORM_LAYOUT_PADDING_Y,
    row: getBillHeaderLegacyRow(field),
  });
  const getBillHeaderRowCount = () => clampValue(
    Number.isFinite(Number(billHeaderWorkbenchConfig.rows)) ? Number(billHeaderWorkbenchConfig.rows) : 3,
    BILL_HEADER_WORKBENCH_MIN_ROWS,
    BILL_HEADER_WORKBENCH_MAX_ROWS,
  );
  const getOrderedBillHeaderFields = (
    metaFields = billMetaFields,
    mainFields = mainTableColumns,
    rowCount = getBillHeaderRowCount(),
  ) => {
    const scopedFields = [
      ...metaFields.map((field) => ({ ...field, __scope: 'meta' as BillCanvasFieldScope })),
      ...mainFields.map((field) => ({ ...field, __scope: 'main' as BillCanvasFieldScope })),
    ];
    const legacySorted = scopedFields
      .slice()
      .sort((left, right) => {
        const leftMetrics = getBillHeaderLegacyMetrics(left);
        const rightMetrics = getBillHeaderLegacyMetrics(right);
        if (leftMetrics.row !== rightMetrics.row) return leftMetrics.row - rightMetrics.row;
        if (leftMetrics.y !== rightMetrics.y) return leftMetrics.y - rightMetrics.y;
        return leftMetrics.x - rightMetrics.x;
      });
    const legacyOrderMap = new Map(legacySorted.map((field, index) => [field.id, index + 1]));

    return scopedFields
      .map((field) => {
        const normalized = normalizeColumn(field);
        return {
          ...normalized,
          __scope: field.__scope,
          width: Math.max(BILL_FORM_MIN_WIDTH, Math.min(BILL_FORM_MAX_WIDTH, normalized.width || BILL_FORM_DEFAULT_WIDTH)),
          panelRow: clampValue(
            Number.isFinite(Number(normalized.panelRow))
              ? Number(normalized.panelRow)
              : getBillHeaderLegacyMetrics(normalized).row,
            BILL_HEADER_WORKBENCH_MIN_ROWS,
            rowCount,
          ),
          panelOrder: Number.isFinite(Number(normalized.panelOrder))
            ? Number(normalized.panelOrder)
            : (legacyOrderMap.get(field.id) ?? 1),
        };
      })
      .sort((left, right) => {
        if (left.panelRow !== right.panelRow) return left.panelRow - right.panelRow;
        if (left.panelOrder !== right.panelOrder) return left.panelOrder - right.panelOrder;
        return (legacyOrderMap.get(left.id) ?? 0) - (legacyOrderMap.get(right.id) ?? 0);
      });
  };
  const commitBillHeaderFields = (
    updater: any[] | ((fields: any[]) => any[]),
    rowCount = getBillHeaderRowCount(),
  ) => {
    const metaIdSet = new Set(billMetaFields.map((field) => field.id));
    const currentFields = getOrderedBillHeaderFields(billMetaFields, mainTableColumns, rowCount)
      .map(({ __scope, ...field }) => ({ ...field }));
    const nextRaw = typeof updater === 'function' ? updater(currentFields) : updater;
    const nextFields = nextRaw.map((field, index) => {
      const normalized = normalizeColumn(field);
      return {
        ...normalized,
        width: Math.max(BILL_FORM_MIN_WIDTH, Math.min(BILL_FORM_MAX_WIDTH, normalized.width || BILL_FORM_DEFAULT_WIDTH)),
        panelRow: clampValue(
          Number.isFinite(Number(normalized.panelRow))
            ? Number(normalized.panelRow)
            : getBillHeaderLegacyMetrics(normalized).row,
          BILL_HEADER_WORKBENCH_MIN_ROWS,
          rowCount,
        ),
        panelOrder: index + 1,
      };
    });
    setBillMetaFields(nextFields.filter((field) => metaIdSet.has(field.id)));
    setMainTableColumns(nextFields.filter((field) => !metaIdSet.has(field.id)));
  };
  const updateBillHeaderWorkbenchRows = (nextRows: number) => {
    const clampedRows = clampValue(nextRows, BILL_HEADER_WORKBENCH_MIN_ROWS, BILL_HEADER_WORKBENCH_MAX_ROWS);
    setBillHeaderWorkbenchConfig((prev) => (
      prev.rows === clampedRows ? prev : { ...prev, rows: clampedRows }
    ));
    commitBillHeaderFields(
      (fields) => fields.map((field) => ({
        ...field,
        panelRow: clampValue(
          Number.isFinite(Number(field?.panelRow)) ? Number(field.panelRow) : BILL_HEADER_WORKBENCH_MIN_ROWS,
          BILL_HEADER_WORKBENCH_MIN_ROWS,
          clampedRows,
        ),
      })),
      clampedRows,
    );
  };
  const moveBillHeaderField = (fieldId: string, rowNumber: number, beforeId: string | null = null) => {
    const rowCount = getBillHeaderRowCount();
    const nextRow = clampValue(rowNumber, BILL_HEADER_WORKBENCH_MIN_ROWS, rowCount);
    commitBillHeaderFields((fields) => {
      const sourceIndex = fields.findIndex((field) => field.id === fieldId);
      if (sourceIndex === -1) return fields;
      if (beforeId && beforeId === fieldId) return fields;

      const sourceField = {
        ...fields[sourceIndex],
        panelRow: nextRow,
      };
      const remaining = fields.filter((field) => field.id !== fieldId);

      let insertIndex = beforeId ? remaining.findIndex((field) => field.id === beforeId) : -1;
      if (insertIndex === -1) {
        insertIndex = remaining.findIndex((field) => (
          clampValue(
            Number.isFinite(Number(field?.panelRow)) ? Number(field.panelRow) : BILL_HEADER_WORKBENCH_MIN_ROWS,
            BILL_HEADER_WORKBENCH_MIN_ROWS,
            rowCount,
          ) > nextRow
        ));
        if (insertIndex === -1) {
          insertIndex = remaining.length;
        }
      }

      return [
        ...remaining.slice(0, insertIndex),
        sourceField,
        ...remaining.slice(insertIndex),
      ];
    }, rowCount);
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
      case '1':
        return '树表格';
      case '2':
        return '图表';
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
  const [leftTableConfig, setLeftTableConfig] = useState(
    buildGridConfig('', '', {
      tableType: '树表格',
      contextMenuItems: [],
      colorRules: [],
      detailBoard: buildDetailBoardConfig([], { enabled: false }),
    }),
  );
  const [leftFilterFields, setLeftFilterFields] = useState<any[]>([
    buildConditionField(1, { name: '节点名称', placeholder: '请输入节点名称', width: 220 }),
    buildConditionField(2, { name: '父节点', placeholder: '请输入父节点', width: 200 }),
  ]);
  const [mainTableColumns, setMainTableColumns] = useState([
    { id: 'm_col1', name: '物料编码', type: '文本', width: BILL_FORM_DEFAULT_WIDTH, sourceField: 'material_code', ...getBillFieldLayout(0, BILL_FORM_DEFAULT_WIDTH) },
    { id: 'm_col2', name: '物料名称', type: '文本', width: BILL_FORM_DEFAULT_WIDTH, sourceField: 'material_name', ...getBillFieldLayout(1, BILL_FORM_DEFAULT_WIDTH) },
    { id: 'm_col3', name: '规格型号', type: '文本', width: BILL_FORM_DEFAULT_WIDTH, sourceField: 'material_spec', ...getBillFieldLayout(2, BILL_FORM_DEFAULT_WIDTH) },
    { id: 'm_col4', name: '单位', type: '下拉框', width: BILL_FORM_DEFAULT_WIDTH, sourceField: 'material_unit', ...getBillFieldLayout(3, BILL_FORM_DEFAULT_WIDTH) },
    { id: 'm_col5', name: '单价', type: '数字', width: BILL_FORM_DEFAULT_WIDTH, sourceField: 'material_price', ...getBillFieldLayout(4, BILL_FORM_DEFAULT_WIDTH) },
  ]);
  const [isMainHiddenColumnsModalOpen, setIsMainHiddenColumnsModalOpen] = useState(false);
  const [selectedMainHiddenColumnIds, setSelectedMainHiddenColumnIds] = useState<string[]>([]);
  const [detailTabs, setDetailTabs] = useState([{ id: 'tab1', name: '关联附件' }, { id: 'tab2', name: '操作日志' }]);
  const [activeTab, setActiveTab] = useState('tab1');
  const [tabFillTypes, setTabFillTypes] = useState<Record<string, string>>({ tab1: '表格', tab2: '表格' });
  const [mainTableConfig, setMainTableConfig] = useState(
    buildGridConfig('SELECT * FROM customer_archive', 'enable = 1', {
      contextMenuEnabled: true,
      contextMenuItems: [
        buildContextMenuItem(1, { label: '查看档案详情', actionKey: 'open-archive-detail' }),
        buildContextMenuItem(2, { label: '打开附件列表', actionKey: 'open-attachments' }),
      ],
      colorRulesEnabled: true,
      colorRules: [
        buildGridColorRule(1, { label: '高价物料', field: 'material_price', operator: '大于', value: '1000', textColor: '#9a3412', backgroundColor: '#ffedd5' }),
        buildGridColorRule(2, { label: '公斤单位', field: 'material_unit', operator: '等于', value: '公斤', textColor: '#1d4ed8', backgroundColor: '#dbeafe' }),
      ],
      detailBoard: buildDetailBoardConfig(mainTableColumns, {
        enabled: true,
        theme: 'aurora',
      }),
    }),
  );
  const isRenderableMainColumn = (column: any) => {
    const normalizedColumn = normalizeColumn(column);
    return normalizedColumn.visible !== false && Number(normalizedColumn.width) > 0;
  };
  const [detailTableConfigs, setDetailTableConfigs] = useState<Record<string, any>>({
    tab1: buildGridConfig('SELECT * FROM customer_attachment', 'archive_id = ${id}', {
      sourceCondition: 'archive_id = ${id}',
      contextMenuItems: [buildContextMenuItem(1, { label: '下载附件', actionKey: 'download-file' })],
      detailBoard: buildDetailBoardConfig([], { enabled: false, theme: 'jade' }),
    }),
    tab2: buildGridConfig('SELECT * FROM customer_log', 'archive_id = ${id}', {
      sourceCondition: 'archive_id = ${id}',
      contextMenuItems: [buildContextMenuItem(1, { label: '查看日志详情', actionKey: 'open-log-detail' })],
      detailBoard: buildDetailBoardConfig([], { enabled: false, theme: 'sunset' }),
    }),
  });
  const [mainFilterFields, setMainFilterFields] = useState([
    buildConditionField(1, { name: '客户编号', placeholder: '请输入客户编号', width: 220 }),
    buildConditionField(2, { name: '客户全称', placeholder: '请输入客户全称', width: 240 }),
    buildConditionField(3, { name: '测试日期', type: '日期框', width: 180, placeholder: '请选择日期' }),
  ]);
  const [detailFilterFields, setDetailFilterFields] = useState<Record<string, any[]>>({
    tab1: [
      buildConditionField(1, { name: '附件名称', placeholder: '请输入附件名称', width: 220 }),
      buildConditionField(2, { name: '上传人', placeholder: '请输入上传人', width: 180 }),
    ],
    tab2: [
      buildConditionField(1, { name: '操作人', placeholder: '请输入操作人', width: 180 }),
      buildConditionField(2, { name: '操作时间', type: '日期框', placeholder: '请选择操作时间', width: 180 }),
    ],
  });
  const [detailTabConfigs, setDetailTabConfigs] = useState<Record<string, any>>({
    tab1: buildDetailTabConfig({
      tabKey: 'tab1',
      detailName: '关联附件',
      relatedCondition: 'archive_id = ${id}',
      autoRefresh: true,
      displayRows: 12,
      bandWidth: '160',
      bandHeight: '36',
    }),
    tab2: buildDetailTabConfig({
      tabKey: 'tab2',
      detailName: '操作日志',
      relatedCondition: 'archive_id = ${id}',
      autoRefresh: false,
      displayRows: 10,
      bandWidth: '160',
      bandHeight: '36',
    }),
  });
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

  const [detailTableColumns, setDetailTableColumns] = useState<Record<string, any[]>>({
    tab1: [
      { id: 'd_col1', name: '附件名称', type: '文本', width: 128 },
      { id: 'd_col2', name: '上传人', type: '文本', width: 92 },
    ],
    tab2: [
      { id: 'd_col3', name: '操作时间', type: '日期框', width: 138 },
      { id: 'd_col4', name: '操作人', type: '文本', width: 98 },
      { id: 'd_col5', name: '操作动作', type: '下拉框', width: 108 },
    ],
  });
  const [selectedDetailForDelete, setSelectedDetailForDelete] = useState<string[]>([]);
  const [selectedDetailFiltersForDelete, setSelectedDetailFiltersForDelete] = useState<string[]>([]);
  const [selectedArchiveNodeId, setSelectedArchiveNodeId] = useState('archive-main');
  const [billSources, setBillSources] = useState<BillSourceEntry[]>([INITIAL_BILL_SOURCE]);
  const [activeBillSourceId, setActiveBillSourceId] = useState(INITIAL_BILL_SOURCE.id);
  const [billSourceDraft, setBillSourceDraft] = useState<BillSourceEntry>(INITIAL_BILL_SOURCE);
  const [billSourceDraftMode, setBillSourceDraftMode] = useState<'create' | 'edit'>('edit');
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
    sourceName: `来源 ${index}`,
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
      sourceName: billSourceDraft.sourceName.trim() || `来源 ${billSources.length + (billSourceDraftMode === 'create' ? 1 : 0)}`,
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
  const [billDetailColumns, setBillDetailColumns] = useState<any[]>([
    buildColumn('bill_line', 1, { name: '物料编码', width: 132, sourceField: 'material_code' }),
    buildColumn('bill_line', 2, { name: '物料名称', width: 168, sourceField: 'material_name' }),
    buildColumn('bill_line', 3, { name: '数量', type: '数字', width: 92, defaultValue: '1' }),
    buildColumn('bill_line', 4, { name: '单价', type: '数字', width: 104, sourceField: 'material_price' }),
    buildColumn('bill_line', 5, { name: '金额', type: '数字', width: 118, readonly: true, defaultValue: '0.00' }),
  ]);
  const [billDetailConfig, setBillDetailConfig] = useState(
    buildGridConfig('', '', {
      tableType: '普通表格',
      contextMenuEnabled: false,
      contextMenuItems: [],
      detailBoard: buildDetailBoardConfig([], { enabled: false }),
    }),
  );
  const [billMetaFields, setBillMetaFields] = useState<any[]>([
    {
      id: 'bill_meta_date',
      name: '单据时间',
      type: '日期框',
      width: BILL_FORM_DEFAULT_WIDTH,
      readonly: true,
      defaultValue: new Date().toISOString().slice(0, 10),
      canvasX: 540,
      canvasY: 100,
      labelWidth: 64,
      fontSize: BILL_FORM_DEFAULT_FONT_SIZE,
    },
    {
      id: 'bill_meta_operator',
      name: '操作人员',
      type: '文本',
      width: BILL_FORM_DEFAULT_WIDTH,
      readonly: true,
      defaultValue: '系统管理员',
      canvasX: 540,
      canvasY: 160,
      labelWidth: 64,
      fontSize: BILL_FORM_DEFAULT_FONT_SIZE,
    },
    {
      id: 'bill_meta_operate_time',
      name: '操作时间',
      type: '日期框',
      width: BILL_FORM_DEFAULT_WIDTH,
      readonly: true,
      defaultValue: new Date().toISOString().slice(0, 10),
      canvasX: 540,
      canvasY: 220,
      labelWidth: 64,
      fontSize: BILL_FORM_DEFAULT_FONT_SIZE,
    },
  ]);
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
    applyUser: '管理员',
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
    creator: '管理员',
    ...overrides,
  });
  const buildRestrictionProcessDesign = (index: number, overrides: Partial<RestrictionProcessDesignItem> = {}): RestrictionProcessDesignItem => ({
    id: `process_rule_${Date.now()}_${index}`,
    planValue: `${1200 + index}`,
    businessCode: currentModuleCode,
    schemeCode: `Q0${index}`,
    schemeName: `流程方案 ${index}`,
    permissionScope: '管理员, 18仓库',
    businessType: businessType === 'table' ? '单据' : businessType === 'tree' ? '树形单表' : '单表',
    actionDescription: '鼠标右键设计审批流程方案',
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
  const [restrictionMeasures, setRestrictionMeasures] = useState<RestrictionMeasureItem[]>(() => ([
    buildRestrictionMeasure(1, {
      judgeRule: 'exists(select 1 from wms_billjoinslist where billid = @billid)',
      syncAction: 'update Wms_BillJoinSlListTab',
      description: '红单处理',
      hint: '红单时按旧系统逻辑同步处理',
      confirmRequired: true,
    }),
    buildRestrictionMeasure(2, {
      judgeRule: 'exists(select 1 from wms_billjoinsmaintab where qty <= 0)',
      description: '入库数量不能为 0',
      hint: '入库数量不能为空或小于 0',
      order: 1,
    }),
    buildRestrictionMeasure(3, {
      businessCategory: '业务判断',
      judgeRule: "set @msg = select @msg + '批料编码' + v.billcode from wms_productbarcode v",
      syncAction: 'update wms_productbarcode',
      description: '管理条码缓存',
      hint: '管家码必须录入管家信息',
      order: 2,
    }),
  ]));
  const [restrictionNumberRules, setRestrictionNumberRules] = useState<RestrictionNumberRuleItem[]>(() => ([
    buildRestrictionNumberRule(1, { segmentType: '固定字符串', segmentValue: 'RK', lengthLimit: 2 }),
    buildRestrictionNumberRule(2, { segmentType: '两位年', segmentValue: 'getdate()', lengthLimit: 2 }),
    buildRestrictionNumberRule(3, { segmentType: '月', segmentValue: 'getdate()', lengthLimit: 2 }),
    buildRestrictionNumberRule(4, { segmentType: '日', segmentValue: 'getdate()', lengthLimit: 2 }),
    buildRestrictionNumberRule(5, { segmentType: '顺序号', segmentValue: '0001', lengthLimit: 4 }),
  ]));
  const [restrictionProcessDesigns, setRestrictionProcessDesigns] = useState<RestrictionProcessDesignItem[]>(() => ([
    buildRestrictionProcessDesign(1, {
      planValue: '1296',
      businessCode: currentModuleCode,
      schemeCode: '0065',
      schemeName: '正常流转',
    }),
  ]));
  const [restrictionTopStructures, setRestrictionTopStructures] = useState<RestrictionTopStructureItem[]>(() => ([
    buildRestrictionTopStructure(1, {
      tableDesc: businessType === 'table' ? '单据主表结构' : '基础主表结构',
      remark: '用于限制措施、规则和流程方案与当前模块做关联。',
    }),
  ]));
  const [restrictionSelection, setRestrictionSelection] = useState<Record<RestrictionConfigTabId, string | null>>({
    guard: null,
    number: null,
    structure: null,
    process: null,
  });
  const baseRestrictionElements = useMemo<RestrictionElementRow[]>(() => {
    if (businessType === 'table') return [];
    return mainTableColumns.map((column) => {
      const normalizedColumn = normalizeColumn(column);
      return {
        id: `base-${normalizedColumn.id}`,
        sourceId: String(normalizedColumn.id),
        scope: 'base',
        fieldName: normalizedColumn.name || '未命名字段',
        fieldKey: normalizedColumn.sourceField || String(normalizedColumn.id),
        controlType: normalizedColumn.type || '文本',
        sourceTable: currentPrimaryTableName,
        required: Boolean(normalizedColumn.required),
        visible: normalizedColumn.visible !== false,
        readonly: Boolean(normalizedColumn.readonly),
        dynamicSql: normalizedColumn.dynamicSql || '',
        helpText: normalizedColumn.helpText || '',
        ownerLabel: '基础表单',
      };
    });
  }, [businessType, currentPrimaryTableName, mainTableColumns]);
  const billHeadRestrictionElements = useMemo<RestrictionElementRow[]>(() => {
    if (businessType !== 'table') return [];
    const mainFields = mainTableColumns.map((column) => {
      const normalizedColumn = normalizeColumn(column);
      return {
        id: `bill-head-${normalizedColumn.id}`,
        sourceId: String(normalizedColumn.id),
        scope: 'bill-head' as const,
        fieldName: normalizedColumn.name || '未命名字段',
        fieldKey: normalizedColumn.sourceField || String(normalizedColumn.id),
        controlType: normalizedColumn.type || '文本',
        sourceTable: currentPrimaryTableName,
        required: Boolean(normalizedColumn.required),
        visible: normalizedColumn.visible !== false,
        readonly: Boolean(normalizedColumn.readonly),
        dynamicSql: normalizedColumn.dynamicSql || '',
        helpText: normalizedColumn.helpText || '',
        ownerLabel: '抬头字段',
      };
    });
    const metaFields = billMetaFields.map((column) => {
      const normalizedColumn = normalizeColumn(column);
      return {
        id: `bill-meta-${normalizedColumn.id}`,
        sourceId: String(normalizedColumn.id),
        scope: 'bill-meta' as const,
        fieldName: normalizedColumn.name || '未命名字段',
        fieldKey: normalizedColumn.sourceField || String(normalizedColumn.id),
        controlType: normalizedColumn.type || '文本',
        sourceTable: currentPrimaryTableName,
        required: Boolean(normalizedColumn.required),
        visible: normalizedColumn.visible !== false,
        readonly: normalizedColumn.readonly !== false,
        dynamicSql: normalizedColumn.dynamicSql || '',
        helpText: normalizedColumn.helpText || '',
        ownerLabel: '系统字段',
      };
    });
    return [...mainFields, ...metaFields];
  }, [billMetaFields, businessType, currentPrimaryTableName, mainTableColumns]);
  const billDetailRestrictionElements = useMemo<RestrictionElementRow[]>(() => {
    if (businessType !== 'table') return [];
    return billDetailColumns.map((column) => {
      const normalizedColumn = normalizeColumn(column);
      return {
        id: `bill-detail-${normalizedColumn.id}`,
        sourceId: String(normalizedColumn.id),
        scope: 'bill-detail',
        fieldName: normalizedColumn.name || '未命名字段',
        fieldKey: normalizedColumn.sourceField || String(normalizedColumn.id),
        controlType: normalizedColumn.type || '文本',
        sourceTable: currentDetailTableName,
        required: Boolean(normalizedColumn.required),
        visible: normalizedColumn.visible !== false,
        readonly: Boolean(normalizedColumn.readonly),
        dynamicSql: normalizedColumn.dynamicSql || '',
        helpText: normalizedColumn.helpText || '',
        ownerLabel: '单据明细',
      };
    });
  }, [billDetailColumns, businessType, currentDetailTableName]);
  const [documentLeftPaneWidth, setDocumentLeftPaneWidth] = useState(328);
  const [documentDetailPaneWidth, setDocumentDetailPaneWidth] = useState(436);
  const [documentTopPaneHeight, setDocumentTopPaneHeight] = useState(468);
  const [documentConditionScope, setDocumentConditionScope] = useState<'main' | 'left'>('main');
  const [billHeaderWorkbenchConfig, setBillHeaderWorkbenchConfig] = useState<BillHeaderWorkbenchConfig>(
    buildBillHeaderWorkbenchConfig(),
  );
  const [mainConditionWorkbenchConfig, setMainConditionWorkbenchConfig] = useState<ConditionWorkbenchConfig>(
    buildConditionWorkbenchConfig({ rows: 1 }),
  );
  const [leftConditionWorkbenchConfig, setLeftConditionWorkbenchConfig] = useState<ConditionWorkbenchConfig>(
    buildConditionWorkbenchConfig({ rows: 1 }),
  );
  const [billDocumentTone, setBillDocumentTone] = useState<'blue' | 'red'>('blue');
  const [billDocumentScale, setBillDocumentScale] = useState(1);
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
  const conditionWorkbenchSensors = useSensors(
    useSensor(ConditionWorkbenchPointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
  );
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
  const [longTextEditorState, setLongTextEditorState] = useState<{
    title: string;
    placeholder?: string;
    draft: string;
    onSave: (value: string) => void;
  } | null>(null);
  const [activeBillDragId, setActiveBillDragId] = useState<string | null>(null);
  const [activeBillResizeId, setActiveBillResizeId] = useState<string | null>(null);
  const [billFieldLivePreview, setBillFieldLivePreview] = useState<{
    id: string;
    scope: BillCanvasFieldScope;
    x?: number;
    y?: number;
    width?: number;
    guides: BillFieldGuideState;
  } | null>(null);
  const [billHeaderWorkbenchDrag, setBillHeaderWorkbenchDrag] = useState<{
    id: string;
    scope: BillCanvasFieldScope;
  } | null>(null);
  const [billHeaderWorkbenchDropTarget, setBillHeaderWorkbenchDropTarget] = useState<{
    row: number;
    beforeId: string | null;
  } | null>(null);
  const [detailBoardWorkbenchDrag, setDetailBoardWorkbenchDrag] = useState<{
    groupId: string;
    columnId: string;
  } | null>(null);
  const [detailBoardWorkbenchDropTarget, setDetailBoardWorkbenchDropTarget] = useState<{
    groupId: string;
    row: number;
    beforeId: string | null;
  } | null>(null);
  const [isArchiveLayoutEditorOpen, setIsArchiveLayoutEditorOpen] = useState(false);
  const [selectedArchiveLayoutGroupId, setSelectedArchiveLayoutGroupId] = useState<string | null>(null);
  const [archiveLayoutWorkbenchDrag, setArchiveLayoutWorkbenchDrag] = useState<{
    groupId: string | null;
    columnId: string;
  } | null>(null);
  const [archiveLayoutWorkbenchDropTarget, setArchiveLayoutWorkbenchDropTarget] = useState<{
    groupId: string;
    row: number;
    beforeId: string | null;
  } | null>(null);
  const [billFieldSnapGuides, setBillFieldSnapGuides] = useState<BillFieldGuideState>(EMPTY_BILL_FIELD_GUIDES);
  const layoutDragRef = useRef<{
    type: 'document-left-width' | 'document-detail-width';
    startX: number;
    startY: number;
    startValue: number;
  } | null>(null);
  const billDocumentViewportRef = useRef<HTMLDivElement | null>(null);
  const billDocumentPaperRef = useRef<HTMLDivElement | null>(null);
  const billHeaderCanvasRef = useRef<HTMLDivElement | null>(null);
  const billFieldDragRef = useRef<{
    id: string;
    scope: BillCanvasFieldScope;
    startX: number;
    startY: number;
    startCanvasX: number;
    startCanvasY: number;
    fieldWidth: number;
    boardWidth: number;
    boardHeight: number;
  } | null>(null);
  const billFieldResizeRef = useRef<{
    id: string;
    scope: BillCanvasFieldScope;
    startX: number;
    startWidth: number;
    startCanvasX: number;
    boardWidth: number;
  } | null>(null);
  const billCanvasFieldsRef = useRef<any[]>([...mainTableColumns, ...billMetaFields]);
  const billDragFrameRef = useRef<number | null>(null);
  const billResizeFrameRef = useRef<number | null>(null);
  const billHeaderAutoFillRef = useRef(false);
  const moduleSettingFullscreenInitRef = useRef(false);
  const pendingBillDragPositionRef = useRef<{
    id: string;
    scope: BillCanvasFieldScope;
    x: number;
    y: number;
    guides: BillFieldGuideState;
  } | null>(null);
  const pendingBillResizeRef = useRef<{
    id: string;
    scope: BillCanvasFieldScope;
    width: number;
  } | null>(null);
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
  const isModuleSettingStep = isConfigOpen && (configStep === MODULE_SETTING_STEP || configStep === RESTRICTION_STEP);
  const isConfigFullscreenActive = isModuleSettingStep && isFullscreenConfig;
  const isCompactModuleSetting = isModuleSettingStep && !isFullscreenConfig;
  const workspaceThemeVars = useMemo(
    () => getWorkspaceThemeVars(workspaceTheme),
    [workspaceTheme],
  );
  const workspaceThemeStyles = useMemo(
    () => getDetailBoardTheme(workspaceTheme),
    [workspaceTheme],
  );
  const inspectorPaneWidth = isConfigFullscreenActive ? 448 : Math.max(432, documentDetailPaneWidth);
  const moduleSettingStageHeightClass = isConfigFullscreenActive ? 'flex-1 min-h-[640px]' : 'flex-1 min-h-0';
  const moduleSettingStageStyle = useMemo(
    () => (isConfigFullscreenActive
      ? workspaceThemeVars
      : {
          ...workspaceThemeVars,
          minHeight: 'clamp(620px, calc(100dvh - 220px), 704px)',
        }),
    [isConfigFullscreenActive, workspaceThemeVars],
  );
  const effectiveDocumentTopPaneHeight = !isConfigFullscreenActive && businessType === 'document'
    ? Math.max(documentTopPaneHeight, 504)
    : documentTopPaneHeight;
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
  const buildBillFieldBounds = (column: any): BillFieldBounds => {
    const normalizedColumn = normalizeColumn(column);
    const width = Math.max(BILL_FORM_MIN_WIDTH, normalizedColumn.width || BILL_FORM_DEFAULT_WIDTH);
    const height = BILL_FORM_ROW_HEIGHT;
    const x = normalizedColumn.canvasX ?? BILL_FORM_LAYOUT_PADDING_X;
    const y = normalizedColumn.canvasY ?? BILL_FORM_LAYOUT_PADDING_Y;

    return {
      id: String(column.id),
      x,
      y,
      width,
      height,
      right: x + width,
      bottom: y + height,
      centerX: x + width / 2,
      centerY: y + height / 2,
    };
  };
  const snapBillPositionToGrid = (value: number, padding: number) => (
    padding + Math.round((value - padding) / BILL_FORM_SNAP_SIZE) * BILL_FORM_SNAP_SIZE
  );
  const buildGuideLine = (
    orientation: 'vertical' | 'horizontal',
    position: number,
    start: number,
    end: number,
    kind: 'align' | 'spacing' = 'align',
  ): BillFieldGuideLine => ({
    orientation,
    position: Math.round(position),
    start: Math.round(Math.min(start, end)),
    end: Math.round(Math.max(start, end)),
    kind,
  });
  const buildGapGuide = (
    orientation: 'horizontal' | 'vertical',
    start: number,
    end: number,
    cross: number,
    label: string,
  ): BillFieldGapGuide => ({
    orientation,
    start: Math.round(Math.min(start, end)),
    end: Math.round(Math.max(start, end)),
    cross: Math.round(cross),
    label,
  });
  const findClosestBillGuide = (value: number, candidates: BillSnapCandidate[]) => {
    let closest: (BillSnapCandidate & { distance: number }) | null = null;

    candidates.forEach((candidate) => {
      const distance = Math.abs(value - candidate.value);
      if (distance > BILL_FORM_ALIGN_THRESHOLD) return;
      if (!closest || distance < closest.distance || (distance === closest.distance && candidate.priority < closest.priority)) {
        closest = { ...candidate, distance };
      }
    });

    return closest;
  };
  const resolveBillFieldSnap = (
    columnId: string,
    rawX: number,
    rawY: number,
    boardWidth: number,
    fieldWidth: number,
    boardHeight: number,
  ) => {
    const maxX = Math.max(BILL_FORM_LAYOUT_PADDING_X, boardWidth - fieldWidth - BILL_FORM_LAYOUT_PADDING_X);
    const clampedRawX = clampValue(rawX, BILL_FORM_LAYOUT_PADDING_X, maxX);
    const clampedRawY = Math.max(BILL_FORM_LAYOUT_PADDING_Y, rawY);
    let nextX = Math.max(BILL_FORM_LAYOUT_PADDING_X, Math.min(maxX, snapBillPositionToGrid(clampedRawX, BILL_FORM_LAYOUT_PADDING_X)));
    let nextY = Math.max(BILL_FORM_LAYOUT_PADDING_Y, snapBillPositionToGrid(clampedRawY, BILL_FORM_LAYOUT_PADDING_Y));

    const draftBounds: BillFieldBounds = {
      id: columnId,
      x: clampedRawX,
      y: clampedRawY,
      width: fieldWidth,
      height: BILL_FORM_ROW_HEIGHT,
      right: clampedRawX + fieldWidth,
      bottom: clampedRawY + BILL_FORM_ROW_HEIGHT,
      centerX: clampedRawX + fieldWidth / 2,
      centerY: clampedRawY + BILL_FORM_ROW_HEIGHT / 2,
    };
    const otherColumns = billCanvasFieldsRef.current
      .filter((column) => column.id !== columnId)
      .map((column) => buildBillFieldBounds(column));
    const xCandidates: BillSnapCandidate[] = [
      {
        value: BILL_FORM_LAYOUT_PADDING_X,
        line: buildGuideLine('vertical', BILL_FORM_LAYOUT_PADDING_X, Math.max(10, draftBounds.y - 20), Math.min(boardHeight - 10, draftBounds.bottom + 20), 'spacing'),
        gap: buildGapGuide('horizontal', 0, BILL_FORM_LAYOUT_PADDING_X, draftBounds.y + 14, `${BILL_FORM_LAYOUT_PADDING_X}`),
        priority: 5,
      },
      {
        value: maxX,
        line: buildGuideLine('vertical', boardWidth - BILL_FORM_LAYOUT_PADDING_X, Math.max(10, draftBounds.y - 20), Math.min(boardHeight - 10, draftBounds.bottom + 20), 'spacing'),
        gap: buildGapGuide('horizontal', maxX + fieldWidth, boardWidth - BILL_FORM_LAYOUT_PADDING_X, draftBounds.y + 14, `${BILL_FORM_LAYOUT_PADDING_X}`),
        priority: 5,
      },
    ];
    const yCandidates: BillSnapCandidate[] = [
      {
        value: BILL_FORM_LAYOUT_PADDING_Y,
        line: buildGuideLine('horizontal', BILL_FORM_LAYOUT_PADDING_Y, Math.max(10, draftBounds.x - 20), Math.min(boardWidth - 10, draftBounds.right + 20), 'spacing'),
        gap: buildGapGuide('vertical', 0, BILL_FORM_LAYOUT_PADDING_Y, draftBounds.x + 18, `${BILL_FORM_LAYOUT_PADDING_Y}`),
        priority: 5,
      },
    ];

    otherColumns.forEach((column) => {
      const verticalLineStart = Math.max(12, Math.min(column.y, draftBounds.y) - 10);
      const verticalLineEnd = Math.min(boardHeight - 12, Math.max(column.bottom, draftBounds.bottom) + 10);
      const horizontalLineStart = Math.max(12, Math.min(column.x, draftBounds.x) - 10);
      const horizontalLineEnd = Math.min(boardWidth - 12, Math.max(column.right, draftBounds.right) + 10);
      const sharedY = Math.max(Math.min((Math.max(column.y, draftBounds.y) + Math.min(column.bottom, draftBounds.bottom)) / 2, Math.max(column.y, draftBounds.y) + 18), Math.min(column.bottom, draftBounds.bottom) - 18);
      const sharedX = Math.max(Math.min((Math.max(column.x, draftBounds.x) + Math.min(column.right, draftBounds.right)) / 2, Math.max(column.x, draftBounds.x) + 22), Math.min(column.right, draftBounds.right) - 22);

      xCandidates.push(
        {
          value: column.x,
          line: buildGuideLine('vertical', column.x, verticalLineStart, verticalLineEnd),
          gap: null,
          priority: 2,
        },
        {
          value: column.right - fieldWidth,
          line: buildGuideLine('vertical', column.right, verticalLineStart, verticalLineEnd),
          gap: null,
          priority: 2,
        },
        {
          value: column.centerX - fieldWidth / 2,
          line: buildGuideLine('vertical', column.centerX, verticalLineStart, verticalLineEnd),
          gap: null,
          priority: 3,
        },
        {
          value: column.right + BILL_FORM_LAYOUT_GAP_X,
          line: buildGuideLine('vertical', column.right + BILL_FORM_LAYOUT_GAP_X / 2, verticalLineStart, verticalLineEnd, 'spacing'),
          gap: buildGapGuide('horizontal', column.right, column.right + BILL_FORM_LAYOUT_GAP_X, Number.isFinite(sharedY) ? sharedY : column.centerY, `${BILL_FORM_LAYOUT_GAP_X}`),
          priority: 1,
        },
        {
          value: column.x - fieldWidth - BILL_FORM_LAYOUT_GAP_X,
          line: buildGuideLine('vertical', column.x - BILL_FORM_LAYOUT_GAP_X / 2, verticalLineStart, verticalLineEnd, 'spacing'),
          gap: buildGapGuide('horizontal', column.x - BILL_FORM_LAYOUT_GAP_X, column.x, Number.isFinite(sharedY) ? sharedY : column.centerY, `${BILL_FORM_LAYOUT_GAP_X}`),
          priority: 1,
        },
      );
      yCandidates.push(
        {
          value: column.y,
          line: buildGuideLine('horizontal', column.y, horizontalLineStart, horizontalLineEnd),
          gap: null,
          priority: 2,
        },
        {
          value: column.bottom - BILL_FORM_ROW_HEIGHT,
          line: buildGuideLine('horizontal', column.bottom, horizontalLineStart, horizontalLineEnd),
          gap: null,
          priority: 2,
        },
        {
          value: column.centerY - BILL_FORM_ROW_HEIGHT / 2,
          line: buildGuideLine('horizontal', column.centerY, horizontalLineStart, horizontalLineEnd),
          gap: null,
          priority: 3,
        },
        {
          value: column.bottom + BILL_FORM_LAYOUT_GAP_Y,
          line: buildGuideLine('horizontal', column.bottom + BILL_FORM_LAYOUT_GAP_Y / 2, horizontalLineStart, horizontalLineEnd, 'spacing'),
          gap: buildGapGuide('vertical', column.bottom, column.bottom + BILL_FORM_LAYOUT_GAP_Y, Number.isFinite(sharedX) ? sharedX : column.centerX, `${BILL_FORM_LAYOUT_GAP_Y}`),
          priority: 1,
        },
        {
          value: column.y - BILL_FORM_ROW_HEIGHT - BILL_FORM_LAYOUT_GAP_Y,
          line: buildGuideLine('horizontal', column.y - BILL_FORM_LAYOUT_GAP_Y / 2, horizontalLineStart, horizontalLineEnd, 'spacing'),
          gap: buildGapGuide('vertical', column.y - BILL_FORM_LAYOUT_GAP_Y, column.y, Number.isFinite(sharedX) ? sharedX : column.centerX, `${BILL_FORM_LAYOUT_GAP_Y}`),
          priority: 1,
        },
      );
    });

    const closestX = findClosestBillGuide(clampedRawX, xCandidates.filter((candidate) => candidate.value >= BILL_FORM_LAYOUT_PADDING_X && candidate.value <= maxX));
    const closestY = findClosestBillGuide(clampedRawY, yCandidates.filter((candidate) => candidate.value >= BILL_FORM_LAYOUT_PADDING_Y));
    const lines: BillFieldGuideLine[] = [];
    let gapGuide: BillFieldGapGuide | null = null;

    if (closestX) {
      nextX = Math.round(clampValue(closestX.value, BILL_FORM_LAYOUT_PADDING_X, maxX));
      if (closestX.line) {
        lines.push(closestX.line);
      }
      if (closestX.gap) {
        gapGuide = closestX.gap;
      }
    }
    if (closestY) {
      nextY = Math.round(Math.max(BILL_FORM_LAYOUT_PADDING_Y, closestY.value));
      if (closestY.line) {
        lines.push(closestY.line);
      }
      if (!gapGuide && closestY.gap) {
        gapGuide = closestY.gap;
      }
    }

    return {
      x: nextX,
      y: nextY,
      guides: lines.length > 0 || gapGuide ? { lines, gap: gapGuide } : EMPTY_BILL_FIELD_GUIDES,
    };
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
    billCanvasFieldsRef.current = [...mainTableColumns, ...billMetaFields];
  }, [mainTableColumns, billMetaFields]);

  useEffect(() => {
    if (businessType !== 'table') return;
    const fullscreenActive = isConfigOpen && configStep === MODULE_SETTING_STEP && isFullscreenConfig;

    const viewport = billDocumentViewportRef.current;
    const paper = billDocumentPaperRef.current;
    if (!viewport || !paper || typeof ResizeObserver === 'undefined') return;

    const measure = () => {
      const viewportPadding = fullscreenActive ? 4 : 16;
      const viewportWidth = viewport.clientWidth - viewportPadding;
      const viewportHeight = viewport.clientHeight - viewportPadding;
      const paperWidth = paper.scrollWidth || 1480;
      const paperHeight = paper.scrollHeight || 920;

      if (viewportWidth <= 0 || viewportHeight <= 0 || paperWidth <= 0 || paperHeight <= 0) return;

      const scaleLimit = fullscreenActive ? 1.08 : 1;
      const nextScale = Math.min(scaleLimit, viewportWidth / paperWidth, viewportHeight / paperHeight);
      setBillDocumentScale((prev) => (Math.abs(prev - nextScale) < 0.01 ? prev : nextScale));
    };

    const observer = new ResizeObserver(() => {
      window.requestAnimationFrame(measure);
    });
    observer.observe(viewport);
    observer.observe(paper);
    window.requestAnimationFrame(measure);

    return () => observer.disconnect();
  }, [businessType, billDetailColumns.length, billMetaFields.length, isConfigOpen, configStep, isFullscreenConfig, mainTableColumns.length]);

  useEffect(() => {
    const fullscreenActive = isConfigOpen && configStep === MODULE_SETTING_STEP && isFullscreenConfig;
    if (businessType !== 'table' || fullscreenActive || billHeaderAutoFillRef.current) return;
    if (mainTableColumns.length === 0) return;

    const mainLayoutMatches = mainTableColumns.every((field, index) => {
      const normalizedField = normalizeColumn(field);
      const width = Math.max(BILL_FORM_MIN_WIDTH, normalizedField.width || BILL_FORM_DEFAULT_WIDTH);
      const expectedLayout = getBillFieldLayout(index, width);
      return Math.abs((normalizedField.canvasX ?? expectedLayout.canvasX) - expectedLayout.canvasX) <= 4
        && Math.abs((normalizedField.canvasY ?? expectedLayout.canvasY) - expectedLayout.canvasY) <= 4;
    });
    const legacyMetaLayout = [
      { id: 'bill_meta_date', x: 540, y: 100 },
      { id: 'bill_meta_operator', x: 540, y: 160 },
      { id: 'bill_meta_operate_time', x: 540, y: 220 },
    ];
    const metaLayoutMatches = billMetaFields.every((field, index) => {
      const expectedLayout = legacyMetaLayout[index];
      return Boolean(expectedLayout)
        && field.id === expectedLayout.id
        && Math.abs((field.canvasX ?? expectedLayout.x) - expectedLayout.x) <= 4
        && Math.abs((field.canvasY ?? expectedLayout.y) - expectedLayout.y) <= 4;
    });

    if (!mainLayoutMatches || !metaLayoutMatches) {
      billHeaderAutoFillRef.current = true;
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      billHeaderAutoFillRef.current = true;
      autoArrangeBillHeaderFields();
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [businessType, billMetaFields, configStep, isConfigOpen, isFullscreenConfig, mainTableColumns]);

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
    }));
    setMenuInfoTab('common');
    setBuilderSelectionContextMenu(null);
    setSelectedLeftForDelete([]);
    setSelectedLeftFiltersForDelete([]);
    setSelectedMainForDelete([]);
    setSelectedDetailForDelete([]);
    setSelectedMainFiltersForDelete([]);
    setSelectedDetailFiltersForDelete([]);
    setSelectedArchiveNodeId('archive-main');
    setInspectorTarget({ kind: 'main-grid' });
    setInspectorPanelTab('common');
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

  const renderMenuInfoField = (
    field: ModuleMenuFieldSchema,
    options: {
      isDisabled?: boolean;
      isPinned: boolean;
      onTogglePinned: () => void;
    },
  ) => {
    const value = currentMenuDraft[field.key] ?? '';
    const wrapperClass = field.span === 'full' ? 'md:col-span-2' : '';
    const cardClass = 'cloudy-glass-panel-soft rounded-[22px] border border-white/75 p-4 shadow-[0_20px_44px_-32px_rgba(15,23,42,0.28)]';
    const baseInputClass = `w-full rounded-[18px] border border-slate-200/80 bg-slate-50/92 px-3.5 py-2.5 text-[12px] text-slate-700 outline-none transition shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] focus:border-[#1686e3]/70 focus:bg-white focus:ring-4 focus:ring-[#1686e3]/10 dark:border-slate-700 dark:bg-slate-900/72 dark:text-slate-100 ${
      options.isDisabled ? 'cursor-not-allowed opacity-60' : ''
    }`;
    const pinButtonClass = options.isPinned
      ? 'border-rose-200/80 bg-rose-50/90 text-rose-600 hover:border-rose-300 hover:bg-rose-100/80 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200'
      : 'border-sky-200/80 bg-sky-50/90 text-sky-700 hover:border-sky-300 hover:bg-sky-100/80 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-200';

    return (
      <div key={field.key} className={`${wrapperClass}`.trim()}>
        <div className={cardClass}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-[13px] font-bold text-slate-700 dark:text-slate-200">{field.label}</label>
                <code className="rounded-full border border-slate-200/80 bg-white/85 px-2.5 py-1 text-[10px] font-bold text-slate-400 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-500">
                  {field.tableField}
                </code>
              </div>
              {field.hint && field.kind === 'switch' && (
                <p className="mt-1 text-[11px] leading-5 text-slate-400">{field.hint}</p>
              )}
            </div>
            <button
              type="button"
              disabled={options.isDisabled}
              onClick={options.onTogglePinned}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold transition-colors ${pinButtonClass} ${
                options.isDisabled ? 'cursor-not-allowed opacity-50' : ''
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">
                {options.isPinned ? 'remove_circle' : 'add_circle'}
              </span>
              {options.isPinned ? '移出常用' : '加入常用'}
            </button>
          </div>

          <div className="mt-3">
            {field.kind === 'textarea' ? (
              <textarea
                disabled={options.isDisabled}
                rows={field.rows ?? 4}
                value={String(value)}
                placeholder={field.placeholder}
                onChange={(event) => updateCurrentMenuDraft(field.key, event.target.value)}
                className={`${baseInputClass} min-h-[112px] resize-y font-mono text-[11px] leading-5`}
              />
            ) : field.kind === 'select' ? (
              <div className="relative">
                <select
                  disabled={options.isDisabled}
                  value={String(value)}
                  onChange={(event) => updateCurrentMenuDraft(field.key, event.target.value)}
                  className={`${baseInputClass} cursor-pointer appearance-none pr-10`}
                >
                  {(field.options ?? []).map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <span className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[18px] text-slate-400">
                  expand_more
                </span>
              </div>
            ) : field.kind === 'switch' ? (
              <label className={`flex items-center justify-between rounded-[18px] border border-slate-200/80 bg-white/82 px-4 py-3.5 transition-colors dark:border-slate-700 dark:bg-slate-900/60 ${
                options.isDisabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:border-[#1686e3]/30'
              }`}>
                <div className="text-[13px] font-semibold text-slate-700 dark:text-slate-100">
                  {value === 'true' ? '已开启' : '未开启'}
                </div>
                <span className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${value === 'true' ? 'bg-[#f3afb7]' : 'bg-slate-200 dark:bg-slate-700'}`}>
                  <input
                    type="checkbox"
                    disabled={options.isDisabled}
                    checked={value === 'true'}
                    onChange={(event) => updateCurrentMenuDraft(field.key, event.target.checked ? 'true' : 'false')}
                    className="sr-only"
                  />
                  <span className={`absolute left-1 size-5 rounded-full bg-white shadow-[0_6px_16px_-8px_rgba(15,23,42,0.45)] transition-transform ${value === 'true' ? 'translate-x-5' : ''}`}></span>
                </span>
              </label>
            ) : (
              <input
                disabled={options.isDisabled}
                type={field.kind === 'number' ? 'number' : 'text'}
                value={String(value)}
                placeholder={field.placeholder}
                onChange={(event) => updateCurrentMenuDraft(field.key, event.target.value)}
                className={baseInputClass}
              />
            )}
          </div>

          {field.hint && field.kind !== 'switch' && (
            <p className="mt-2 text-[11px] leading-5 text-slate-400">{field.hint}</p>
          )}
        </div>
      </div>
    );
  };

  const openModuleGuide = (
    nextType: BusinessType,
    options?: {
      completedSteps?: number[];
      initialStep?: number;
    },
  ) => {
    const nextStep = options?.initialStep ?? 1;
    setIsConfigOpen(true);
    setConfigStep(nextStep);
    setCompletedSteps(options?.completedSteps ?? []);
    handleBusinessTypeChange(nextType);
    setIsFullscreenConfig(false);
    setIsFullscreenEditor(false);
    setSurveyStep(0);
    setSurveyAnswers([]);
    setIsGenerating(false);
    setSurveyPlan(null);
    setSurveyPlanModel('');
    setSurveyError(null);
  };

  const openNewModuleGuide = () => {
    setActiveConfigMenu(null);
    setMenuInfoError(null);
    setIsMenuInfoLoading(false);
    setIsMenuInfoSaving(false);
    setMenuConfigDraft({
      ...MENU_CONFIG_DEFAULTS,
      parentMenuId: toDraftText(activeFirstLevelMenu?.menuId),
      subsystemId: toDraftText(selectedSubsystem?.subsysId),
      useFlag: 'true',
    });
    openModuleGuide('document');
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

    setActiveConfigMenu(menu);
    setMenuInfoError(null);
    setIsMenuInfoSaving(false);
    setMenuConfigDraft(MENU_CONFIG_DEFAULTS);
    openModuleGuide(nextType, {
      completedSteps: [1],
      initialStep: 2,
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
        setIsConfigOpen(false);
      }

      setPendingDeleteMenu((prev) => (prev?.id === menu.id ? null : prev));
      showToast(`模块「${menuTitle}」已删除`);
    } catch (error) {
      showToast(getDashboardErrorMessage(error));
    } finally {
      setDeletingMenuId(null);
    }
  };

  const renderDeleteConfirmModal = () => {
    if (!pendingDeleteMenu) {
      return null;
    }

    const moduleTypeProfile = getMenuModuleTypeProfile(pendingDeleteMenu.moduleType);
    const moduleKey = normalizeMenuCode(pendingDeleteMenu.purviewId) || '未提供';
    const menuTitle = normalizeMenuTitle(pendingDeleteMenu.title) || '当前模块';
    const isDeletingPendingMenu = deletingMenuId === pendingDeleteMenu.id;

    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/28 px-4 backdrop-blur-[6px]"
          onClick={() => {
            if (!isDeletingPendingMenu) {
              setPendingDeleteMenu(null);
            }
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="module-delete-dialog-title"
            className="w-full max-w-[480px] rounded-[28px] border border-white/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(249,251,255,0.96))] p-6 shadow-[0_36px_90px_-42px_rgba(15,23,42,0.6)] dark:border-slate-700 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(15,23,42,0.94))]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-[18px] border border-rose-200 bg-rose-50 text-rose-500 shadow-[0_12px_24px_-20px_rgba(244,63,94,0.6)] dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
                <span className="material-symbols-outlined text-[28px]">delete_forever</span>
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[11px] font-bold tracking-[0.18em] text-rose-500 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
                  危险操作
                </div>
                <div className="space-y-1">
                  <h3 id="module-delete-dialog-title" className="text-[22px] font-black tracking-tight text-slate-900 dark:text-white">
                    确认删除模块
                  </h3>
                  <p className="text-[13px] leading-6 text-slate-500 dark:text-slate-300">
                    删除后，这个二级菜单对应的模块配置会被永久移除，当前操作不可恢复。请确认该模块已经不再使用。
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-[22px] border border-slate-200/80 bg-white/85 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] dark:border-slate-700 dark:bg-slate-900/70">
              <div className="grid gap-3">
                <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 dark:border-slate-800">
                  <span className="text-[12px] font-bold tracking-[0.16em] text-slate-400">模块名称</span>
                  <span className="text-right text-[14px] font-bold text-slate-900 dark:text-white">{menuTitle}</span>
                </div>
                <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 dark:border-slate-800">
                  <span className="text-[12px] font-bold tracking-[0.16em] text-slate-400">模块类型</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[12px] font-bold text-sky-600 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-300">
                    <span className="material-symbols-outlined text-[15px]">
                      {moduleTypeProfile?.businessType === 'table' ? 'table_view' : 'article'}
                    </span>
                    {moduleTypeProfile?.label ?? '未定义'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[12px] font-bold tracking-[0.16em] text-slate-400">模块标识</span>
                  <code className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-[12px] text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    {moduleKey}
                  </code>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setPendingDeleteMenu(null)}
                disabled={isDeletingPendingMenu}
                className={`inline-flex min-w-[108px] items-center justify-center rounded-2xl border px-4 py-3 text-[13px] font-bold transition-all ${
                  isDeletingPendingMenu
                    ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-white'
                }`}
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => void handleSecondLevelMenuDelete(pendingDeleteMenu)}
                disabled={isDeletingPendingMenu}
                className={`inline-flex min-w-[132px] items-center justify-center gap-2 rounded-2xl px-4 py-3 text-[13px] font-bold text-white shadow-[0_20px_40px_-24px_rgba(244,63,94,0.72)] transition-all ${
                  isDeletingPendingMenu
                    ? 'cursor-not-allowed bg-rose-300 dark:bg-rose-900'
                    : 'bg-rose-500 hover:bg-rose-600 dark:bg-rose-500 dark:hover:bg-rose-400'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {isDeletingPendingMenu ? 'progress_activity' : 'delete'}
                </span>
                {isDeletingPendingMenu ? '删除中...' : '确认删除'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  };

  const renderMenuInfoStep = () => {
    const panelShellClass = shadcnPanelShellClass;
    const panelHeaderClass = `${shadcnPanelHeaderClass} px-5 py-3.5`;
    const panelTitleClass = shadcnPanelTitleClass;
    const panelBadgeClass = shadcnPanelBadgeClass;
    const panelIconShellClass = `${shadcnPanelIconShellClass} size-8`;
    const compactInfoCardClass = shadcnInfoCardClass;
    const compactCardClass = shadcnSectionCardClass;
    const sectionTitleClass = shadcnSectionTitleClass;
    const sidePanelShellClass = `${panelShellClass} h-auto min-h-fit overflow-visible`;
    const menuTabs: Array<{ id: 'common' | 'advanced'; label: string; icon: string }> = [
      { id: 'common', label: '常用', icon: 'folder_managed' },
      { id: 'advanced', label: '不常用', icon: 'inventory_2' },
    ];
    const activeSections = menuInfoTab === 'common' ? currentCommonMenuSections : currentAdvancedMenuSections;
    const activeFieldCount = menuInfoTab === 'common' ? currentPinnedMenuKeys.length : currentAdvancedMenuKeys.length;
    const activeFilledCount = menuInfoTab === 'common' ? commonFilledMenuFieldCount : advancedFilledMenuFieldCount;
    const isEditingMenu = activeConfigMenu !== null;
    const isMenuInfoBusy = isMenuInfoLoading || isMenuInfoSaving;

    return (
      <div className="grid flex-1 grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className={panelShellClass}>
          <div className={panelHeaderClass}>
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 rounded-full border border-[#1686e3]/15 bg-[#1686e3]/5 px-3 py-1 text-[11px] font-bold tracking-[0.24em] text-[#1686e3]">
                    菜单信息
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-[24px] font-black tracking-tight text-slate-900 dark:text-white">
                      常用字段先配，不常用按需收进目录
                    </h3>
                  </div>
                </div>

              {isEditingMenu ? (
                <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-[12px] font-bold text-emerald-600 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
                  <span className="material-symbols-outlined text-[16px]">lock</span>
                  编辑模式已锁定类型
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfigStep(1)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-[12px] font-bold text-slate-500 transition-colors hover:border-[#1686e3]/30 hover:text-[#1686e3] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                >
                  <span className="material-symbols-outlined text-[16px]">swap_horiz</span>
                  返回切换类型
                </button>
              )}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-2 rounded-full bg-[#1686e3] px-3 py-1 text-[11px] font-bold text-white shadow-[0_12px_24px_-16px_rgba(22,134,227,0.52)]">
                <span className="material-symbols-outlined text-[15px]">
                  {businessType === 'table' ? 'receipt_long' : 'table_view'}
                </span>
                {currentModuleGuide.label}
              </span>
              <span className={panelBadgeClass}>配置表 {MENU_CONFIG_TABLE_NAME}</span>
              <span className={panelBadgeClass}>已填写 {filledMenuFieldCount}/{currentMenuFieldEntries.length}</span>
              <span className={panelBadgeClass}>{menuInfoTab === 'common' ? '常用目录' : '不常用目录'} {activeFilledCount}/{activeFieldCount}</span>
              {activeConfigModuleKey ? <span className={panelBadgeClass}>模块标识 {activeConfigModuleKey}</span> : null}
            </div>

            <div className="mt-3 flex items-center gap-2 rounded-[18px] border border-slate-200/70 bg-white/82 p-1.5 dark:border-slate-700 dark:bg-slate-900/50">
              {menuTabs.map((tab) => {
                const isActive = menuInfoTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setMenuInfoTab(tab.id)}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-[14px] px-3 py-2 text-[12px] font-bold transition-all ${
                      isActive
                        ? 'bg-white text-slate-800 shadow-[0_14px_28px_-22px_rgba(22,134,227,0.36)] dark:bg-slate-900/92 dark:text-slate-100'
                        : 'text-slate-500 hover:bg-white/80 dark:text-slate-400 dark:hover:bg-slate-900/72'
                    }`}
                  >
                    <span className={`material-symbols-outlined text-[16px] ${isActive ? 'text-[#1686e3]' : 'text-slate-400 dark:text-slate-500'}`}>{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {isMenuInfoLoading ? (
              <div className="mt-3 rounded-[18px] border border-sky-200 bg-sky-50 px-4 py-3 text-[12px] font-semibold text-sky-700 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-300">
                正在从后端加载菜单信息...
              </div>
            ) : null}

            {menuInfoError ? (
              <div className="mt-3 rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-[12px] font-semibold text-rose-600 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
                {menuInfoError}
              </div>
            ) : null}
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-5">
            {activeSections.length > 0 ? (
              <div className="space-y-4">
                {activeSections.map((section) => (
                  <section key={`${menuInfoTab}-${section.title}`} className={compactCardClass}>
                    <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-slate-200/60 pb-4 dark:border-slate-700/70">
                      <div>
                        <div className={sectionTitleClass}>
                          <span className="material-symbols-outlined text-[16px] text-[#1686e3]">dashboard_customize</span>
                          <span>{section.title}</span>
                        </div>
                      </div>
                      <span className={panelBadgeClass}>{section.fields.length} 项</span>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      {section.fields.map((field) =>
                        renderMenuInfoField(field, {
                          isDisabled: isMenuInfoBusy,
                          isPinned: currentPinnedMenuKeySet.has(field.key),
                          onTogglePinned: () => toggleMenuPinnedField(field.key, !currentPinnedMenuKeySet.has(field.key)),
                        }),
                      )}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <div className="flex min-h-[280px] items-center justify-center">
                <div className="cloudy-glass-panel-soft max-w-md rounded-[24px] border border-dashed border-slate-300/70 px-6 py-8 text-center dark:border-slate-700">
                  <span className="material-symbols-outlined text-[34px] text-[#1686e3]">
                    {menuInfoTab === 'common' ? 'folder_off' : 'done_all'}
                  </span>
                  <h4 className="mt-4 text-[18px] font-black tracking-tight text-slate-900 dark:text-white">
                    {menuInfoTab === 'common' ? '常用目录还是空的' : '不常用字段已经清空'}
                  </h4>
                  <p className="mt-2 text-[13px] leading-6 text-slate-500 dark:text-slate-300">
                    {menuInfoTab === 'common'
                      ? '先去不常用页签把要常看的字段加进来，目录会自动更新。'
                      : '当前字段已经全部收进常用目录，后续可以在常用页签继续精简。'}
                  </p>
                  {menuInfoTab === 'common' && (
                    <button
                      type="button"
                      onClick={() => setMenuInfoTab('advanced')}
                      className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#1686e3]/20 bg-[#1686e3]/8 px-4 py-2 text-[12px] font-bold text-[#1686e3] transition-colors hover:bg-[#1686e3]/12"
                    >
                      <span className="material-symbols-outlined text-[16px]">add_box</span>
                      去不常用添加字段
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className={sidePanelShellClass}>
            <div className={panelHeaderClass}>
              <div className="flex items-start gap-3">
                <div className={panelIconShellClass}>
                  <span className="material-symbols-outlined text-[18px] text-[#1686e3]">folder_managed</span>
                </div>
                <div>
                  <div className={panelTitleClass}>常用目录</div>
                </div>
              </div>
            </div>

            <div className="space-y-4 p-4">
              <section className={compactCardClass}>
                <div className={sectionTitleClass}>
                  <span className="material-symbols-outlined text-[16px] text-[#1686e3]">list_alt</span>
                  <span>当前常用字段</span>
                </div>
                {currentPinnedMenuKeys.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {currentPinnedMenuKeys.map((key) => {
                      const field = currentMenuFieldMap.get(key);
                      if (!field) return null;

                      return (
                        <button
                          key={`pinned-${key}`}
                          type="button"
                          onClick={() => toggleMenuPinnedField(key, false)}
                          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/88 px-3 py-1.5 text-[11px] font-bold text-slate-600 transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:border-rose-500/30 dark:hover:bg-rose-500/10 dark:hover:text-rose-200"
                        >
                          {field.label}
                          <span className="material-symbols-outlined text-[14px]">close</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-[18px] border border-dashed border-slate-300/70 px-4 py-4 text-[12px] leading-6 text-slate-500 dark:border-slate-700 dark:text-slate-300">
                    这里会显示你保留的高频字段。
                  </div>
                )}
              </section>

              <section className={compactCardClass}>
                <div className={sectionTitleClass}>
                  <span className="material-symbols-outlined text-[16px] text-[#1686e3]">insights</span>
                  <span>配置概览</span>
                </div>
                <div className="grid gap-3">
                  <div className={compactInfoCardClass}>
                    <div className="text-[11px] font-bold tracking-[0.06em] text-slate-400">常用字段</div>
                    <div className="mt-2 text-[22px] font-black tracking-tight text-slate-900 dark:text-white">{currentPinnedMenuKeys.length}</div>
                    <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-300">已填写 {commonFilledMenuFieldCount}</div>
                  </div>
                  <div className={compactInfoCardClass}>
                    <div className="text-[11px] font-bold tracking-[0.06em] text-slate-400">不常用字段</div>
                    <div className="mt-2 text-[22px] font-black tracking-tight text-slate-900 dark:text-white">{currentAdvancedMenuKeys.length}</div>
                    <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-300">已填写 {advancedFilledMenuFieldCount}</div>
                  </div>
                  <div className={compactInfoCardClass}>
                    <div className="text-[11px] font-bold tracking-[0.06em] text-slate-400">配置表</div>
                    <div className="mt-2 break-all text-[13px] font-bold text-slate-800 dark:text-slate-100">{MENU_CONFIG_TABLE_NAME}</div>
                    <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-300">{MENU_CONFIG_TABLE_DESC}</div>
                  </div>
                </div>
              </section>
            </div>
          </div>

          <div className={sidePanelShellClass}>
            <div className={panelHeaderClass}>
              <div className="flex items-start gap-3">
                <div className={panelIconShellClass}>
                  <span className="material-symbols-outlined text-[18px] text-[#1686e3]">tune</span>
                </div>
                <div>
                  <div className={panelTitleClass}>扩展能力</div>
                </div>
              </div>
            </div>

            <div className="p-4">
              <section className={compactCardClass}>
                <div className="flex flex-wrap gap-3 relative">
                  {commonFuncs.map((funcId) => {
                    const func = funcOptions.find((item) => item.id === funcId);
                    if (!func) return null;
                    return (
                      <div key={func.id} className="inline-flex items-center gap-2 rounded-[16px] border border-[#1686e3]/18 bg-[#1686e3]/8 px-3.5 py-2 text-[12px] font-bold text-[#1686e3]">
                        <span className="material-symbols-outlined text-[16px]">{func.icon}</span>
                        {func.name}
                        <button type="button" onClick={() => toggleFunc(func.id)} className="flex items-center justify-center transition-colors hover:text-rose-500">
                          <span className="material-symbols-outlined text-[15px]">close</span>
                        </button>
                      </div>
                    );
                  })}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsFuncPopoverOpen(!isFuncPopoverOpen)}
                      className="inline-flex items-center gap-2 rounded-[16px] border border-dashed border-slate-300 px-3.5 py-2 text-[12px] font-bold text-slate-500 transition-all hover:border-[#1686e3]/40 hover:bg-[#1686e3]/6 hover:text-[#1686e3] dark:border-slate-600 dark:text-slate-300"
                    >
                      <span className="material-symbols-outlined text-[16px]">add</span>
                      添加功能
                    </button>
                    <AnimatePresence>
                      {isFuncPopoverOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setIsFuncPopoverOpen(false)}></div>
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute left-0 top-full z-50 mt-2 w-64 rounded-[18px] border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-800"
                          >
                            <div className="mb-2 px-2 pt-1 text-[12px] font-bold text-slate-400">选择扩展功能</div>
                            <div className="space-y-1">
                              {funcOptions.map((func) => {
                                const isSelected = commonFuncs.includes(func.id);
                                return (
                                  <button
                                    key={func.id}
                                    type="button"
                                    onClick={() => toggleFunc(func.id)}
                                    className={`flex w-full items-center justify-between rounded-[14px] px-3 py-2 text-left text-[13px] transition-colors ${isSelected ? 'bg-[#1686e3]/10 text-[#1686e3] font-bold' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700'}`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="material-symbols-outlined text-[18px]">{func.icon}</span>
                                      {func.name}
                                    </div>
                                    {isSelected && <span className="material-symbols-outlined text-[16px]">check</span>}
                                  </button>
                                );
                              })}
                            </div>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    );
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
    const current = normalizedMainDetailBoardConfig;
    if (!current.enabled) {
      updateMainDetailBoard({
        ...current,
        enabled: true,
      });
    }
    setSelectedArchiveLayoutGroupId(current.groups[0]?.id ?? null);
    setIsArchiveLayoutEditorOpen(true);
  };

  const addArchiveLayoutGroup = () => {
    const current = normalizedMainDetailBoardConfig;
    const nextGroup = buildDetailBoardGroup(current.groups.length + 1);
    updateMainDetailBoard({
      ...current,
      enabled: true,
      groups: [...current.groups, nextGroup],
    });
    setSelectedArchiveLayoutGroupId(nextGroup.id);
  };

  const updateArchiveLayoutGroup = (groupId: string, updater: Record<string, any> | ((group: any) => any)) => {
    updateMainDetailBoard((current: any) => ({
      ...current,
      enabled: true,
      groups: current.groups.map((group: any) => (
        group.id === groupId
          ? typeof updater === 'function'
            ? updater(group)
            : { ...group, ...updater }
          : group
      )),
    }));
  };

  const removeArchiveLayoutGroup = (groupId: string) => {
    const current = normalizedMainDetailBoardConfig;
    const nextGroups = current.groups.filter((group: any) => group.id !== groupId);
    updateMainDetailBoard({
      ...current,
      enabled: nextGroups.length > 0,
      groups: nextGroups,
    });
    setSelectedArchiveLayoutGroupId(nextGroups[0]?.id ?? null);
  };

  const clearArchiveLayoutGroups = () => {
    const current = normalizedMainDetailBoardConfig;
    updateMainDetailBoard({
      ...current,
      groups: [],
    });
    setSelectedArchiveLayoutGroupId(null);
  };

  const assignArchiveLayoutColumn = (
    targetGroupId: string,
    columnId: string,
    rowNumber: number,
    beforeId: string | null = null,
  ) => {
    updateMainDetailBoard((current: any) => {
      const groups = normalizeDetailBoardConfig(current, mainTableColumns).groups.map((group: any) => ({
        ...group,
        columnIds: [...(group.columnIds ?? [])],
        columnRows: { ...(group.columnRows ?? {}) },
        columnWidths: { ...(group.columnWidths ?? {}) },
        columnHeights: { ...(group.columnHeights ?? {}) },
      }));
      const targetGroup = groups.find((group: any) => group.id === targetGroupId);
      if (!targetGroup) return current;
      let preservedWidth: number | null = null;
      let preservedHeight: number | null = null;

      groups.forEach((group: any) => {
        if (!group.columnIds.includes(columnId)) return;
        const nextWidth = Number(group.columnWidths?.[columnId]);
        const nextHeight = Number(group.columnHeights?.[columnId]);
        if (Number.isFinite(nextWidth) && nextWidth > 0) preservedWidth = nextWidth;
        if (Number.isFinite(nextHeight) && nextHeight > 0) preservedHeight = nextHeight;
        group.columnIds = group.columnIds.filter((id: string) => id !== columnId);
        group.columnRows = Object.fromEntries(
          Object.entries(group.columnRows ?? {}).filter(([key]) => key !== columnId),
        );
        group.columnWidths = Object.fromEntries(
          Object.entries(group.columnWidths ?? {}).filter(([key]) => key !== columnId),
        );
        group.columnHeights = Object.fromEntries(
          Object.entries(group.columnHeights ?? {}).filter(([key]) => key !== columnId),
        );
      });

      const nextRow = clampValue(
        rowNumber,
        DETAIL_BOARD_GROUP_MIN_ROWS,
        getDetailBoardGroupRows(targetGroup),
      );
      const remaining = targetGroup.columnIds.filter((id: string) => id !== columnId);
      let insertIndex = beforeId ? remaining.indexOf(beforeId) : -1;
      if (insertIndex === -1) {
        insertIndex = remaining.findIndex((id: string) => getDetailBoardGroupColumnRow(targetGroup, id) > nextRow);
        if (insertIndex === -1) insertIndex = remaining.length;
      }

      targetGroup.columnIds = [
        ...remaining.slice(0, insertIndex),
        columnId,
        ...remaining.slice(insertIndex),
      ];
      targetGroup.columnRows = {
        ...targetGroup.columnRows,
        [columnId]: nextRow,
      };
      if (Number.isFinite(preservedWidth) && preservedWidth! > 0) {
        targetGroup.columnWidths = {
          ...targetGroup.columnWidths,
          [columnId]: preservedWidth,
        };
      }
      if (Number.isFinite(preservedHeight) && preservedHeight! > 0) {
        targetGroup.columnHeights = {
          ...targetGroup.columnHeights,
          [columnId]: preservedHeight,
        };
      }

      return {
        ...current,
        enabled: true,
        groups,
      };
    });
  };

  const removeArchiveLayoutColumn = (groupId: string, columnId: string) => {
    updateArchiveLayoutGroup(groupId, (group: any) => ({
      ...group,
      columnIds: (group.columnIds ?? []).filter((id: string) => id !== columnId),
      columnRows: Object.fromEntries(
        Object.entries(group.columnRows ?? {}).filter(([key]) => key !== columnId),
      ),
      columnWidths: Object.fromEntries(
        Object.entries(group.columnWidths ?? {}).filter(([key]) => key !== columnId),
      ),
      columnHeights: Object.fromEntries(
        Object.entries(group.columnHeights ?? {}).filter(([key]) => key !== columnId),
      ),
    }));
  };

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
      setActiveBillDragId((prev) => (prev && targetIds.includes(prev) ? null : prev));
      setActiveBillResizeId((prev) => (prev && targetIds.includes(prev) ? null : prev));
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
    setSelectedMainHiddenColumnIds(mainTableHiddenColumns.map((column) => column.id));
    setIsMainHiddenColumnsModalOpen(true);
  };

  const closeMainHiddenColumnsModal = () => {
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
    const newId = `tab_${Date.now()}`;
    setDetailTabs([...detailTabs, { id: newId, name: `新页签 ${detailTabs.length + 1}` }]);
    setActiveTab(newId);
    setDetailFilterFields((prev) => ({
      ...prev,
      [newId]: [buildConditionField(1, { name: '关键字', placeholder: '请输入关键字', width: 220 })],
    }));
    setDetailTabConfigs((prev) => ({
      ...prev,
      [newId]: buildDetailTabConfig({ relatedCondition: 'parent_id = ${id}' }),
    }));
    setDetailTableColumns({ ...detailTableColumns, [newId]: [
      { id: `d_col_${Date.now()}_1`, name: '新字段 1', type: '文本', width: 120 },
      { id: `d_col_${Date.now()}_2`, name: '新字段 2', type: '文本', width: 120 },
    ] });
    setDetailTableConfigs((prev) => ({
      ...prev,
      [newId]: buildGridConfig('SELECT * FROM detail_table', 'parent_id = ${id}', {
        sourceCondition: 'parent_id = ${id}',
        contextMenuItems: [buildContextMenuItem(1, { label: '查看记录', actionKey: 'open-detail' })],
      }),
    }));
  };

  const deleteTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newTabs = detailTabs.filter(t => t.id !== id);
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
      setActiveTab(newTabs.length > 0 ? newTabs[0].id : '');
    }
    if (selectedDetailTabId === id) {
      setInspectorTarget({ kind: 'none' });
    }
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

  const getFieldOptionValues = (rawField: any) => {
    const field = normalizeColumn(rawField);
    const source = field.dictCode || field.helpText || '';

    if (/[,\n，;；|]/.test(source)) {
      const items = source
        .split(/[\n,，;；|]/)
        .map((item: string) => item.trim())
        .filter(Boolean);

      if (items.length > 0) {
        return items;
      }
    }

    if (field.type === '下拉框') {
      return ['正常', '停用', '草稿'];
    }

    if (field.type === '单选框') {
      return ['是', '否'];
    }

    if (field.type === '多选框') {
      return ['标签A', '标签B', '标签C'];
    }

    return [];
  };

  const getPreviewCellValue = (rawCol: any, rowIndex: number) => {
    const col = normalizeColumn(rawCol);
    const fieldName = col.name || '字段';
    const optionValues = getFieldOptionValues(col);

    if (col.defaultValue) {
      return col.defaultValue;
    }

    if (col.type === '数字' || /金额|单价|数量|价格|余额/.test(fieldName)) {
      return `${(rowIndex + 1) * 125}`;
    }

    if (col.type === '日期框' || /日期|时间/.test(fieldName)) {
      return `2026-03-${String(rowIndex + 18).padStart(2, '0')}`;
    }

    if (col.type === '下拉框' || col.type === '单选框') {
      return optionValues[rowIndex % optionValues.length] || '未选择';
    }

    if (col.type === '多选框') {
      return optionValues.slice(0, 2).join('、') || '标签A、标签B';
    }

    if (/编码|编号/.test(fieldName)) {
      return `NO-${String(rowIndex + 1).padStart(3, '0')}`;
    }

    if (/名称/.test(fieldName)) {
      return `示例${rowIndex + 1}`;
    }

    if (/单位/.test(fieldName)) {
      return ['个', '件', '套'][rowIndex % 3];
    }

    if (col.type === '搜索框') {
      return `${fieldName}检索词`;
    }

    return `${fieldName}${rowIndex + 1}`;
  };

  const renderFieldPreview = (rawField: any, rowIndex: number, mode: 'table' | 'filter' | 'condition' = 'table') => {
    const field = normalizeColumn(rawField);
    const previewValue = getPreviewCellValue(field, rowIndex);
    const optionValues = getFieldOptionValues(field);
    const isFilterMode = mode !== 'table';
    const isConditionMode = mode === 'condition';
    const inputClass = isFilterMode
      ? 'h-10 w-full rounded-xl border border-slate-200/90 bg-white/96 px-3 text-[12px] text-slate-700 outline-none transition shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] focus:border-[color:var(--workspace-accent-border-strong)] focus:ring-4 focus:ring-[color:var(--workspace-accent-soft)] dark:border-slate-700 dark:bg-slate-900/88 dark:text-slate-200'
      : 'h-10 w-full rounded-xl border border-slate-200/80 bg-white/94 px-3 text-[12px] text-slate-700 outline-none transition shadow-[0_10px_20px_-18px_rgba(15,23,42,0.22),inset_0_1px_0_rgba(255,255,255,0.72)] focus:border-[color:var(--workspace-accent-border-strong)] focus:ring-4 focus:ring-[color:var(--workspace-accent-soft)] dark:border-slate-700 dark:bg-slate-900/88 dark:text-slate-100';
    const compactInputClass = `${inputClass} px-2.5`;
    const previewKey = `${field.id}-${field.type}-${field.dictCode}-${field.defaultValue}-${field.placeholder}`;

    const stopPreviewEvent = (event: React.SyntheticEvent) => {
      event.stopPropagation();
    };

    if (isFilterMode) {
      const shellClass = `flex h-9 w-full items-center justify-between gap-2 rounded-[10px] border border-slate-200/90 bg-white text-[12px] text-slate-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200 ${isConditionMode ? 'pointer-events-none px-2.5' : 'px-3'}`;
      const staticValue = field.placeholder || previewValue || `${field.name}示例值`;
      const trailingIcon = field.type === '日期框'
        ? 'calendar'
        : field.type === '下拉框' || field.type === '多选框'
          ? 'expand'
          : field.type === '搜索框'
            ? 'search'
            : '';

      if (isConditionMode) {
        if (field.type === '多选框') {
          return (
            <div className={shellClass}>
              <div className="flex min-w-0 flex-1 items-center gap-1.5">
                <span className="h-4.5 w-4.5 rounded-md border border-slate-200/80 bg-white/90 dark:border-slate-700 dark:bg-slate-900/70" />
                <span className="h-4.5 w-4.5 rounded-md border border-slate-200/80 bg-white/90 dark:border-slate-700 dark:bg-slate-900/70" />
              </div>
              <ChevronDown className="size-4 text-slate-300 dark:text-slate-500" />
            </div>
          );
        }

        if (field.type === '单选框') {
          return (
            <div className={shellClass}>
              <div className="flex min-w-0 flex-1 items-center gap-2.5">
                <span className="h-3.5 w-3.5 rounded-full border border-[color:var(--workspace-accent)] bg-[color:var(--workspace-accent)]/14" />
                <span className="h-3.5 w-3.5 rounded-full border border-slate-300 dark:border-slate-600" />
              </div>
            </div>
          );
        }

        return (
          <div className={shellClass}>
            {field.type === '搜索框' ? (
              <Search className="size-4 text-slate-300 dark:text-slate-500" />
            ) : null}
            <div className="min-w-0 flex-1" />
            {trailingIcon && field.type !== '搜索框' ? (
              trailingIcon === 'calendar' ? (
                <CalendarDays className="size-4 text-slate-300 dark:text-slate-500" />
              ) : (
                <ChevronDown className="size-4 text-slate-300 dark:text-slate-500" />
              )
            ) : null}
          </div>
        );
      }

      if (field.type === '多选框') {
        const tags = (optionValues.length > 0 ? optionValues : ['标签A', '标签B']).slice(0, 2);
        return (
          <div className={shellClass}>
            <div className="flex min-w-0 flex-1 items-center gap-1.5">
              <div className="flex min-w-0 flex-wrap gap-1">
                {tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <span className="material-symbols-outlined text-[16px] text-slate-300 dark:text-slate-500">expand_more</span>
          </div>
        );
      }

      if (field.type === '单选框') {
        const value = optionValues[0] || previewValue || '是';
        return (
          <div className={shellClass}>
            <div className="flex min-w-0 items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[color:var(--workspace-accent)]" />
              <span className="truncate">{value}</span>
            </div>
          </div>
        );
      }

      return (
        <div className={shellClass}>
          <div className="min-w-0 flex-1">
            <span className={`truncate ${field.type === '数字' ? 'font-semibold tabular-nums' : ''}`}>{staticValue}</span>
          </div>
          {trailingIcon ? (
            <span className="material-symbols-outlined text-[16px] text-slate-300 dark:text-slate-500">
              {trailingIcon}
            </span>
          ) : null}
        </div>
      );
    }

    if (field.type === '日期框') {
      return (
        <input
          key={previewKey}
          data-preview-control="true"
          type="date"
          defaultValue={previewValue}
          className={compactInputClass}
          onClick={stopPreviewEvent}
          onDoubleClick={stopPreviewEvent}
        />
      );
    }

    if (field.type === '下拉框') {
      return (
        <select
          key={previewKey}
          data-preview-control="true"
          defaultValue={optionValues.includes(previewValue) ? previewValue : optionValues[0] || ''}
          className={compactInputClass}
          onClick={stopPreviewEvent}
          onDoubleClick={stopPreviewEvent}
        >
          {optionValues.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    }

    if (field.type === '搜索框') {
      return (
        <div
          data-preview-control="true"
          className="relative"
          onClick={stopPreviewEvent}
          onDoubleClick={stopPreviewEvent}
        >
          <span className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[16px] text-slate-400 ${isFilterMode ? '' : 'z-[1]'}`}>
            search
          </span>
          <input
            key={previewKey}
            defaultValue={previewValue || ''}
            placeholder={field.placeholder || `请输入${field.name}`}
            className={`${compactInputClass} ${isFilterMode ? 'pl-8 pr-3' : 'pl-8 pr-3'} min-w-0`}
          />
        </div>
      );
    }

    if (field.type === '单选框') {
      return (
        <div
          data-preview-control="true"
          className="flex flex-wrap items-center gap-3"
          onClick={stopPreviewEvent}
          onDoubleClick={stopPreviewEvent}
        >
          {(optionValues.length > 0 ? optionValues : ['是', '否']).map((option) => (
            <label key={option} className="inline-flex items-center gap-1.5 text-[12px] text-slate-600 dark:text-slate-300">
              <input
                type="radio"
                name={`${field.id}-${mode}`}
                defaultChecked={option === previewValue}
                className="h-3.5 w-3.5 accent-[color:var(--workspace-accent)]"
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
      );
    }

    if (field.type === '多选框') {
      const tags = optionValues.slice(0, 2);
      return (
        <div
          data-preview-control="true"
          className="flex flex-wrap gap-2"
          onClick={stopPreviewEvent}
          onDoubleClick={stopPreviewEvent}
        >
          {(optionValues.length > 0 ? optionValues : ['标签A', '标签B', '标签C']).map((tag, index) => (
            <label key={tag} className="inline-flex items-center gap-1.5 text-[12px] text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                defaultChecked={index < (tags.length > 0 ? tags.length : 2)}
                className="h-3.5 w-3.5 rounded accent-[#1686e3]"
              />
              <span>{tag}</span>
            </label>
          ))}
        </div>
      );
    }

    if (field.type === '数字') {
      return (
        <input
          key={previewKey}
          data-preview-control="true"
          type="number"
          defaultValue={previewValue}
          className={`${compactInputClass} text-right font-semibold tabular-nums`}
          onClick={stopPreviewEvent}
          onDoubleClick={stopPreviewEvent}
        />
      );
    }

    return (
      <input
        key={previewKey}
        data-preview-control="true"
        type="text"
        defaultValue={previewValue || ''}
        placeholder={field.placeholder || `${field.name}示例值`}
        className={compactInputClass}
        onClick={stopPreviewEvent}
        onDoubleClick={stopPreviewEvent}
      />
    );
  };

  const getLayoutFieldWorkbenchMeta = (rawField: any, customWidth?: number | null, customHeight?: number | null) => {
    const field = normalizeColumn(rawField);
    const typeText = String(field.type ?? '').toLowerCase();
    const isTallControl = ['备注', '说明', '多行', '文本域', 'textarea', '富文本', 'markdown']
      .some((keyword) => typeText.includes(keyword.toLowerCase()))
      || Number(field.previewRows) >= 3
      || Number(field.layoutRows) >= 2;
    const minWidth = isTallControl ? 320 : DETAIL_BOARD_FIELD_MIN_WIDTH;
    const minHeight = isTallControl ? DETAIL_BOARD_TALL_FIELD_MIN_HEIGHT : DETAIL_BOARD_FIELD_DEFAULT_HEIGHT;
    const preferredWidth = Number.isFinite(Number(customWidth)) && Number(customWidth) > 0
      ? Number(customWidth)
      : Number.isFinite(Number(field.width)) && Number(field.width) > 0
        ? Number(field.width)
        : (isTallControl ? 360 : DETAIL_BOARD_FIELD_DEFAULT_WIDTH);
    const preferredHeight = Number.isFinite(Number(customHeight)) && Number(customHeight) > 0
      ? Number(customHeight)
      : Number.isFinite(Number(field.layoutHeight)) && Number(field.layoutHeight) > 0
        ? Number(field.layoutHeight)
        : (isTallControl ? DETAIL_BOARD_TALL_FIELD_DEFAULT_HEIGHT : DETAIL_BOARD_FIELD_DEFAULT_HEIGHT);

    return {
      field,
      isTallControl,
      width: clampValue(preferredWidth, minWidth, DETAIL_BOARD_FIELD_MAX_WIDTH),
      height: isTallControl
        ? clampValue(preferredHeight, minHeight, DETAIL_BOARD_TALL_FIELD_MAX_HEIGHT)
        : DETAIL_BOARD_FIELD_DEFAULT_HEIGHT,
      minWidth,
      minHeight,
      previewRows: isTallControl ? 4 : 1,
      frameClass: isTallControl ? 'min-h-[96px]' : 'min-h-[52px]',
    };
  };

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

  const getArchiveLayoutControlLabelWidth = (field: any, isTallControl: boolean) => {
    if (isTallControl) return 88;
    return Math.max(54, Math.min(82, String(field.name ?? '').length * 12));
  };

  const renderArchiveLayoutFieldShell = (
    rawField: any,
    {
      rowIndex,
      width,
      height,
    }: {
      rowIndex: number;
      width?: number | null;
      height?: number | null;
    },
  ) => {
    const layoutMeta = getLayoutFieldWorkbenchMeta(rawField, width, height);
    const labelWidth = getArchiveLayoutControlLabelWidth(layoutMeta.field, layoutMeta.isTallControl);
    const wrapperClass = layoutMeta.isTallControl
      ? 'flex w-full flex-col gap-1.5'
      : 'flex w-full items-center gap-2';

    return (
      <div
        className={wrapperClass}
        style={layoutMeta.isTallControl ? { minHeight: layoutMeta.height } : undefined}
      >
        {layoutMeta.isTallControl ? (
          <>
            <div
              className={`text-[11px] font-medium ${
                layoutMeta.field.required
                  ? 'text-[color:var(--workspace-accent-strong)]'
                  : 'text-slate-500 dark:text-slate-300'
              }`}
              style={{ width: labelWidth }}
              title={layoutMeta.field.name}
            >
              <span className="block truncate">{layoutMeta.field.name}</span>
            </div>
            <div className="min-h-0 flex-1">
              {renderLayoutWorkbenchFieldPreview(layoutMeta.field, rowIndex, layoutMeta.width)}
            </div>
          </>
        ) : (
          <>
            <div
              className={`shrink-0 text-right text-[11px] font-medium ${
                layoutMeta.field.required
                  ? 'text-[color:var(--workspace-accent-strong)]'
                  : 'text-slate-500 dark:text-slate-300'
              }`}
              style={{ width: labelWidth }}
              title={layoutMeta.field.name}
            >
              <span className="block truncate">{layoutMeta.field.name}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="pointer-events-none">
                {renderFieldPreview(layoutMeta.field, rowIndex, 'filter')}
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  const renderLayoutWorkbenchFieldPreview = (rawField: any, rowIndex: number, customWidth?: number | null) => {
    const layoutMeta = getLayoutFieldWorkbenchMeta(rawField, customWidth);
    if (layoutMeta.isTallControl) {
      return (
        <textarea
          readOnly
          rows={layoutMeta.previewRows}
          value={String(
            layoutMeta.field.defaultValue
            || layoutMeta.field.placeholder
            || `${layoutMeta.field.name}的详细内容示例`,
          )}
          className={`${shadcnTextareaClass} min-h-0 resize-none bg-white text-[12px] text-slate-600 shadow-none pointer-events-none dark:bg-slate-950 dark:text-slate-200`}
          style={{ minHeight: Math.max(70, layoutMeta.height - 28) }}
        />
      );
    }

    return (
      <div className="pointer-events-none">
        {renderFieldPreview(layoutMeta.field, rowIndex, 'filter')}
      </div>
    );
  };

  const renderBillFormControlPreview = (rawField: any, rowIndex: number) => {
    const field = normalizeColumn(rawField);
    const optionValues = getFieldOptionValues(field);
    const previewValue = getPreviewCellValue(field, rowIndex) || field.placeholder || `${field.name}示例`;
    const fontSize = Math.max(11, Math.min(18, Number(field.fontSize) || BILL_FORM_DEFAULT_FONT_SIZE));
    const shellStyle = { fontSize };
    const shellClass = 'bill-designer-control-shell flex h-9 w-full items-center gap-2 rounded-[10px] border border-slate-200/90 bg-white px-3 text-slate-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200';

    if (field.type === '单选框') {
      const radioValues = (optionValues.length > 0 ? optionValues : ['是', '否']).slice(0, 2);
      return (
        <div className={`${shellClass} flex-wrap gap-4`} style={shellStyle}>
          {radioValues.map((option, index) => (
            <div key={option} className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
              <span className={`inline-flex size-3 rounded-full border ${index === 0 ? 'border-[color:var(--workspace-accent)] bg-[color:var(--workspace-accent)]' : 'border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900'}`} />
              <span>{option}</span>
            </div>
          ))}
        </div>
      );
    }

    if (field.type === '多选框') {
      const tags = (optionValues.length > 0 ? optionValues : ['标签A', '标签B', '标签C']).slice(0, 2);
      return (
        <div className={shellClass} style={shellStyle}>
          <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span key={tag} className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                {tag}
              </span>
            ))}
          </div>
        </div>
      );
    }

    if (field.type === '搜索框') {
      return (
        <div className={shellClass} style={shellStyle}>
          <span className="material-symbols-outlined text-[15px] text-slate-400">search</span>
          <div className="min-w-0 flex-1 truncate">{previewValue}</div>
          <span className="material-symbols-outlined text-[15px] text-slate-300">arrow_drop_down</span>
        </div>
      );
    }

    if (field.type === '下拉框') {
      const optionLabel = optionValues[0] || previewValue;
      return (
        <div className={shellClass} style={shellStyle}>
          <div className="min-w-0 flex-1 truncate">{optionLabel}</div>
          <span className="material-symbols-outlined text-[16px] text-slate-400">arrow_drop_down</span>
        </div>
      );
    }

    if (field.type === '日期框') {
      return (
        <div className={shellClass} style={shellStyle}>
          <div className="min-w-0 flex-1 truncate">{previewValue}</div>
          <span className="material-symbols-outlined text-[15px] text-slate-400">calendar_month</span>
        </div>
      );
    }

    if (field.type === '数字') {
      return (
        <div className={shellClass} style={shellStyle}>
          <div className="min-w-0 flex-1 text-right font-semibold tabular-nums">{previewValue}</div>
        </div>
      );
    }

    return (
      <div className={shellClass} style={shellStyle}>
        <div className="min-w-0 flex-1 truncate">{previewValue}</div>
      </div>
    );
  };

  const autoArrangeBillHeaderFields = () => {
    const boardWidth = billHeaderCanvasRef.current?.clientWidth ?? 1080;
    const usableWidth = Math.max(760, boardWidth - 40);
    const rowCount = getBillHeaderRowCount();
    let currentRow = 1;
    let currentRowWidth = 0;

    commitBillHeaderFields((fields) => (
      fields.map((field) => {
        const normalizedField = normalizeColumn(field);
        const nextWidth = Math.max(BILL_FORM_MIN_WIDTH, normalizedField.width || BILL_FORM_DEFAULT_WIDTH);

        if (
          currentRowWidth > 0
          && currentRowWidth + nextWidth > usableWidth
          && currentRow < rowCount
        ) {
          currentRow += 1;
          currentRowWidth = 0;
        }

        currentRowWidth += nextWidth + BILL_FORM_LAYOUT_GAP_X;
        return {
          ...field,
          panelRow: currentRow,
        };
      })
    ), rowCount);
  };

  const startBillFieldDrag = (event: React.MouseEvent<HTMLDivElement>, columnId: string, scope: BillCanvasFieldScope = 'main') => {
    event.preventDefault();
    event.stopPropagation();

    const canvasRect = billHeaderCanvasRef.current?.getBoundingClientRect();
    const targetColumn = (scope === 'main' ? mainTableColumns : billMetaFields).find((column) => column.id === columnId);
    if (!canvasRect || !targetColumn) return;

    const normalizedColumn = normalizeColumn(targetColumn);
    const fieldWidth = Math.max(BILL_FORM_MIN_WIDTH, normalizedColumn.width || BILL_FORM_DEFAULT_WIDTH);

    billFieldDragRef.current = {
      id: columnId,
      scope,
      startX: event.clientX,
      startY: event.clientY,
      startCanvasX: normalizedColumn.canvasX ?? BILL_FORM_LAYOUT_PADDING_X,
      startCanvasY: normalizedColumn.canvasY ?? BILL_FORM_LAYOUT_PADDING_Y,
      fieldWidth,
      boardWidth: canvasRect.width,
      boardHeight: canvasRect.height,
    };
    setBillFieldLivePreview({
      id: columnId,
      scope,
      x: normalizedColumn.canvasX ?? BILL_FORM_LAYOUT_PADDING_X,
      y: normalizedColumn.canvasY ?? BILL_FORM_LAYOUT_PADDING_Y,
      width: fieldWidth,
      guides: EMPTY_BILL_FIELD_GUIDES,
    });
    setActiveBillDragId(columnId);
    setActiveBillResizeId(null);
    setBillFieldSnapGuides(EMPTY_BILL_FIELD_GUIDES);
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
  };
  const startBillFieldResize = (event: React.MouseEvent<HTMLDivElement>, columnId: string, scope: BillCanvasFieldScope = 'main') => {
    event.preventDefault();
    event.stopPropagation();

    const canvasRect = billHeaderCanvasRef.current?.getBoundingClientRect();
    const targetColumn = (scope === 'main' ? mainTableColumns : billMetaFields).find((column) => column.id === columnId);
    if (!canvasRect || !targetColumn) return;

    const normalizedColumn = normalizeColumn(targetColumn);
    billFieldResizeRef.current = {
      id: columnId,
      scope,
      startX: event.clientX,
      startWidth: Math.max(BILL_FORM_MIN_WIDTH, normalizedColumn.width || BILL_FORM_DEFAULT_WIDTH),
      startCanvasX: 0,
      boardWidth: canvasRect.width,
    };
    setBillFieldLivePreview({
      id: columnId,
      scope,
      width: Math.max(BILL_FORM_MIN_WIDTH, normalizedColumn.width || BILL_FORM_DEFAULT_WIDTH),
      guides: EMPTY_BILL_FIELD_GUIDES,
    });
    setActiveBillDragId(null);
    setActiveBillResizeId(columnId);
    setBillFieldSnapGuides(EMPTY_BILL_FIELD_GUIDES);
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
  };

  const renderBillHeaderWorkbench = () => {
    const canvasHeight = Math.max(
      360,
      mainTableColumns.reduce((maxHeight, column) => {
        const normalizedColumn = normalizeColumn(column);
        return Math.max(maxHeight, (normalizedColumn.canvasY ?? BILL_FORM_LAYOUT_PADDING_Y) + 78);
      }, BILL_FORM_LAYOUT_PADDING_Y) + 40,
    );
    const getCardSelectionClass = (isActive: boolean, isMarkedForDelete: boolean) => (
      isActive
        ? 'border-[color:var(--workspace-accent-border-strong)] bg-[color:var(--workspace-accent-tint)] shadow-[0_0_0_3px_var(--workspace-accent-soft),0_24px_44px_-32px_var(--workspace-accent-shadow)]'
        : isMarkedForDelete
          ? 'border-[color:var(--workspace-accent-border)] bg-[color:var(--workspace-accent-soft)] shadow-[0_18px_34px_-28px_rgba(15,23,42,0.16)]'
          : 'border-white/70 bg-white/78 shadow-[0_18px_34px_-28px_rgba(15,23,42,0.16)] hover:border-[color:var(--workspace-accent-border)] hover:bg-white/92'
    );
    const buildSelectedIds = (columnId: string, append: boolean) => (
      selectedMainForDelete.includes(columnId)
        ? selectedMainForDelete
        : append
          ? Array.from(new Set([...selectedMainForDelete, columnId]))
          : [columnId]
    );
    const handleBillFieldSelect = (event: React.MouseEvent<HTMLDivElement>, columnId: string) => {
      setBuilderSelectionContextMenu(null);
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        setSelectedMainForDelete((prev) => (
          prev.includes(columnId) ? prev.filter((item) => item !== columnId) : [...prev, columnId]
        ));
        return;
      }

      setSelectedMainForDelete([columnId]);
      activateColumnSelection('main', columnId);
    };
    const handleBillFieldContextMenu = (event: React.MouseEvent<HTMLDivElement>, columnId: string) => {
      event.preventDefault();
      event.stopPropagation();
      const nextSelectedIds = buildSelectedIds(columnId, event.ctrlKey || event.metaKey);
      setSelectedMainForDelete(nextSelectedIds);
      activateColumnSelection('main', columnId);
      setBuilderSelectionContextMenu({
        kind: 'column',
        scope: 'main',
        x: event.clientX,
        y: event.clientY,
        ids: nextSelectedIds,
      });
    };

    return (
      <div style={workspaceThemeVars} className={`cloudy-glass-panel flex min-h-0 flex-col overflow-hidden rounded-[30px] border border-white/75 ${workspaceThemeStyles.tableSurface}`}>
        <div className="cloudy-glass-toolbar flex items-center justify-between gap-3 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="cloudy-glass-orb flex size-10 items-center justify-center rounded-2xl text-[color:var(--workspace-accent)]">
              <span className="material-symbols-outlined text-[18px]">dashboard</span>
            </div>
            <div>
              <h4 className="text-[13px] font-bold text-slate-800 dark:text-slate-100">单据头部看板</h4>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={activateSourceGridSelection}
              className={`cloudy-glass-chip inline-flex h-9 items-center gap-1.5 rounded-[14px] border px-3 text-[12px] font-bold transition-colors ${
                inspectorTarget.kind === 'source-grid'
                  ? 'border-[color:var(--workspace-accent-border-strong)] bg-[color:var(--workspace-accent)] text-white'
                  : 'border-[color:var(--workspace-accent-border)] text-[color:var(--workspace-accent)] hover:bg-[color:var(--workspace-accent-soft)]'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">database</span>
              来源表
            </button>
            <button
              type="button"
              onClick={autoArrangeBillHeaderFields}
              className="cloudy-glass-chip inline-flex h-9 items-center gap-1.5 rounded-[14px] border border-white/80 px-3 text-[12px] font-bold text-slate-600 transition-colors hover:bg-white dark:border-white/10 dark:text-slate-200"
            >
              <span className="material-symbols-outlined text-[15px]">auto_awesome_motion</span>
              自动整理
            </button>
            <button
              type="button"
              onClick={() => setMainTableColumns((prev) => [
                ...prev,
                buildColumn('m_col', prev.length + 1, {
                  width: BILL_FORM_DEFAULT_WIDTH,
                  ...getBillFieldLayout(prev.length, BILL_FORM_DEFAULT_WIDTH),
                }),
              ])}
              className="inline-flex h-9 items-center gap-1.5 rounded-[14px] bg-[color:var(--workspace-accent)] px-3 text-[12px] font-bold text-white shadow-[0_18px_32px_-24px_var(--workspace-accent-shadow)] transition-colors hover:bg-[color:var(--workspace-accent-strong)]"
            >
              <span className="material-symbols-outlined text-[15px]">add</span>
              新增控件
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 px-4 pb-4">
          <div
            ref={billHeaderCanvasRef}
            tabIndex={0}
            style={{ minHeight: canvasHeight }}
            onClick={() => {
              setSelectedMainForDelete([]);
              activateTableConfigSelection('main');
            }}
            onPaste={(event) => handlePasteColumns(event, setMainTableColumns, {
              createColumn: (name, index, currentLength) => buildColumn('m_col', currentLength + index + 1, {
                name,
                width: BILL_FORM_DEFAULT_WIDTH,
                ...getBillFieldLayout(currentLength + index, BILL_FORM_DEFAULT_WIDTH),
              }),
            })}
            className={`cloudy-cloud-grid scrollbar-none relative h-full overflow-auto rounded-[28px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.66),rgba(248,250,252,0.8))] p-5 outline-none transition-colors ${inspectorTarget.kind === 'main-grid' ? 'shadow-[inset_0_0_0_2px_var(--workspace-accent-border-strong)]' : ''}`}
          >
            <div className="pointer-events-none absolute right-5 top-5 inline-flex items-center gap-1.5 rounded-full border border-[color:var(--workspace-accent-border)] bg-white/84 px-3 py-1 text-[11px] font-bold text-[color:var(--workspace-accent)] shadow-[0_16px_28px_-24px_rgba(15,23,42,0.16)]">
              <span className="material-symbols-outlined text-[14px]">content_paste</span>
              Excel 复制后直接 Ctrl+V
            </div>
            {mainTableColumns.length > 0 ? mainTableColumns.map((column, index) => {
              const normalizedColumn = normalizeColumn(column);
              const isActive = selectedMainColId === column.id;
              const isMarkedForDelete = selectedMainForDelete.includes(column.id);
              const fieldWidth = Math.max(BILL_FORM_MIN_WIDTH, normalizedColumn.width || BILL_FORM_DEFAULT_WIDTH);
              const labelWidth = Math.max(58, Math.min(112, Number(normalizedColumn.labelWidth) || BILL_FORM_DEFAULT_LABEL_WIDTH));
              const fontSize = Math.max(11, Math.min(18, Number(normalizedColumn.fontSize) || BILL_FORM_DEFAULT_FONT_SIZE));

              return (
                <div
                  key={column.id}
                  role="button"
                  tabIndex={0}
                  style={{
                    left: normalizedColumn.canvasX ?? BILL_FORM_LAYOUT_PADDING_X,
                    top: normalizedColumn.canvasY ?? BILL_FORM_LAYOUT_PADDING_Y,
                    width: fieldWidth,
                  }}
                  onClick={(event) => {
                    event.stopPropagation();
                    handleBillFieldSelect(event, column.id);
                  }}
                  onContextMenu={(event) => handleBillFieldContextMenu(event, column.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setSelectedMainForDelete([column.id]);
                      activateColumnSelection('main', column.id);
                    }
                  }}
                  className={`absolute rounded-[22px] border p-3 transition-all ${getCardSelectionClass(isActive, isMarkedForDelete)}`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      onMouseDown={(event) => startBillFieldDrag(event, column.id)}
                      className="cloudy-glass-orb flex size-9 shrink-0 cursor-grab items-center justify-center rounded-[16px] text-[color:var(--workspace-accent)] active:cursor-grabbing"
                      title="拖动控件位置"
                    >
                      <span className="material-symbols-outlined text-[16px]">drag_indicator</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <div
                          className={`shrink-0 truncate font-semibold ${normalizedColumn.required ? 'text-[color:var(--workspace-accent-strong)]' : 'text-slate-600 dark:text-slate-200'}`}
                          style={{ width: labelWidth, fontSize: fontSize + 1 }}
                          title={normalizedColumn.name}
                        >
                          {normalizedColumn.name}
                        </div>
                        <div className="min-w-0 flex-1">{renderBillFormControlPreview(normalizedColumn, index)}</div>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] font-semibold">
                        <span className="inline-flex items-center rounded-full bg-white/82 px-2 py-0.5 text-slate-500 dark:bg-slate-900/64 dark:text-slate-300">
                          {normalizedColumn.type}
                        </span>
                        {normalizedColumn.sourceField ? (
                          <span className="inline-flex items-center rounded-full bg-[color:var(--workspace-accent-soft)] px-2 py-0.5 text-[color:var(--workspace-accent-strong)]">
                            {normalizedColumn.sourceField}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div className="flex min-h-[320px] items-center justify-center text-center">
                <div className="rounded-[24px] border border-dashed border-[color:var(--workspace-accent-border)] bg-white/72 px-8 py-10 shadow-[0_20px_34px_-30px_rgba(15,23,42,0.18)]">
                  <div className="mx-auto flex size-14 items-center justify-center rounded-3xl bg-white text-[color:var(--workspace-accent)] shadow-[0_18px_32px_-24px_var(--workspace-accent-shadow)]">
                    <span className="material-symbols-outlined text-[22px]">view_quilt</span>
                  </div>
                  <div className="mt-4 text-[14px] font-bold text-slate-700 dark:text-slate-100">将 Excel 字段复制到头部看板</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderBillDetailWorkbench = () => {
    const detailCols = billDetailColumns;

    return (
      <div style={workspaceThemeVars} className={`cloudy-glass-panel flex min-h-0 flex-1 flex-col overflow-hidden rounded-[30px] border border-white/75 ${workspaceThemeStyles.tableSurface}`}>
        <div className="cloudy-glass-toolbar flex items-center justify-between gap-3 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="cloudy-glass-orb flex size-10 items-center justify-center rounded-2xl text-[color:var(--workspace-accent)]">
              <span className="material-symbols-outlined text-[18px]">table_rows</span>
            </div>
            <div>
              <h4 className="text-[13px] font-bold text-slate-800 dark:text-slate-100">单据明细表</h4>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {selectedDetailForDelete.length > 0 && (
              <button
                type="button"
                onClick={() => deleteSelectedColumns('detail', selectedDetailForDelete)}
                className="cloudy-glass-chip inline-flex h-9 items-center gap-1 rounded-[14px] border border-rose-200/80 px-3 text-[12px] font-bold text-rose-500 transition-colors hover:bg-rose-50 dark:border-rose-500/20 dark:hover:bg-rose-500/10"
              >
                <span className="material-symbols-outlined text-[14px]">delete</span>
                删除
              </button>
            )}
            <button
              type="button"
              onClick={() => setBillDetailColumns((prev) => [...prev, buildColumn('bill_line', prev.length + 1)])}
              className="inline-flex h-9 items-center gap-1.5 rounded-[14px] bg-[color:var(--workspace-accent)] px-3 text-[12px] font-bold text-white shadow-[0_18px_32px_-24px_var(--workspace-accent-shadow)] transition-colors hover:bg-[color:var(--workspace-accent-strong)]"
            >
              <span className="material-symbols-outlined text-[15px]">add</span>
              新增列
            </button>
          </div>
        </div>
        <div
          className="scrollbar-none min-h-0 flex-1 overflow-auto px-4 pb-4 outline-none"
          tabIndex={0}
          onPaste={(event) => handlePasteColumns(event, setBillDetailColumns)}
        >
          <div className="pt-3">
            {billDetailTableBuilderNode}
          </div>
        </div>
      </div>
    );
  };

  const renderBillDocumentWorkbench = () => {
    const detailCols = billDetailColumns;
    const billViewportPaddingClass = isConfigFullscreenActive ? 'p-1.5' : 'p-3';
    const billPaperWrapClass = 'justify-stretch';
    const billPaperShellClass = isConfigFullscreenActive
      ? 'flex h-full min-h-full flex-1 flex-col rounded-[24px] border border-[#d9e4f0] bg-white shadow-none'
      : 'flex h-full min-h-full flex-1 flex-col rounded-[28px] border border-[#d9e4f0] bg-white shadow-[0_44px_90px_-68px_rgba(15,23,42,0.42)]';
    const billHeaderPaddingClass = isConfigFullscreenActive ? 'px-8 pb-3 pt-4' : 'px-10 pb-4 pt-5';
    const billBodyPaddingClass = isConfigFullscreenActive ? 'gap-5 px-8 pb-6 pt-3' : 'gap-8 px-10 pb-8 pt-4';
    const billHeaderRowCount = getBillHeaderRowCount();
    const billCanvasFields = getOrderedBillHeaderFields(billMetaFields, mainTableColumns, billHeaderRowCount);
    const billHeaderRows = Array.from({ length: billHeaderRowCount }, (_, index) => index + 1);
    const headerWorkbenchHeight = billHeaderRowCount * CONDITION_PANEL_ROW_HEIGHT
      + Math.max(0, billHeaderRowCount - 1) * CONDITION_PANEL_ROW_GAP;
    const buildSelectedIds = (columnId: string, append: boolean) => (
      selectedMainForDelete.includes(columnId)
        ? selectedMainForDelete
        : append
          ? Array.from(new Set([...selectedMainForDelete, columnId]))
          : [columnId]
    );
    const isBillHeaderPanelActive = selectedTableConfigScope === 'main';
    const getBillHeaderFieldWidth = (field: any) => (
      Math.max(
        BILL_FORM_MIN_WIDTH,
        Math.min(
          BILL_FORM_MAX_WIDTH,
          billFieldLivePreview?.id === field.id ? billFieldLivePreview.width ?? field.width ?? BILL_FORM_DEFAULT_WIDTH : field.width ?? BILL_FORM_DEFAULT_WIDTH,
        ),
      )
    );
    const getBillHeaderFieldRow = (field: any) => clampValue(
      Number.isFinite(Number(field?.panelRow)) ? Number(field.panelRow) : BILL_HEADER_WORKBENCH_MIN_ROWS,
      BILL_HEADER_WORKBENCH_MIN_ROWS,
      billHeaderRowCount,
    );
    const getBillHeaderPreviewShellClass = (fieldId: string, isSelected: boolean) => cn(
      createRuntimeClassName('bill-header-field-preview', fieldId),
      'pointer-events-none min-w-0 shrink-0',
      isSelected && '[&>div]:border-border/60 [&>div]:bg-background [&>div]:shadow-none',
    );
    const toggleBillFieldSelection = (columnId: string) => {
      const nextSelectedIds = selectedMainForDelete.includes(columnId)
        ? selectedMainForDelete.filter((item) => item !== columnId)
        : [...selectedMainForDelete, columnId];

      setSelectedMainForDelete(nextSelectedIds);
      if (
        nextSelectedIds.length === 1
        && [...mainTableColumns, ...billMetaFields].some((column) => column.id === nextSelectedIds[0])
      ) {
        activateColumnSelection('main', nextSelectedIds[0]);
      }
    };
    const handleBillFieldSelect = (event: React.MouseEvent<HTMLDivElement>, columnId: string, scope: BillCanvasFieldScope) => {
      setBuilderSelectionContextMenu(null);
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        event.stopPropagation();
        toggleBillFieldSelection(columnId);
        return;
      }

      setSelectedMainForDelete([columnId]);
      activateColumnSelection('main', columnId);
    };
    const handleBillFieldContextMenu = (event: React.MouseEvent<HTMLDivElement>, columnId: string, scope: BillCanvasFieldScope) => {
      event.preventDefault();
      event.stopPropagation();
      const nextSelectedIds = buildSelectedIds(columnId, event.ctrlKey || event.metaKey);
      setSelectedMainForDelete(nextSelectedIds);
      activateColumnSelection('main', columnId);
      setBuilderSelectionContextMenu({
        kind: 'column',
        scope: 'main',
        x: event.clientX,
        y: event.clientY,
        ids: nextSelectedIds,
      });
    };
    const clearBillHeaderWorkbenchDragState = () => {
      setBillHeaderWorkbenchDrag(null);
      setBillHeaderWorkbenchDropTarget(null);
    };
    const handleBillHeaderWorkbenchDragStart = (event: DragStartEvent) => {
      const activeData = event.active.data.current;
      if (!isBillHeaderWorkbenchDragData(activeData) || activeData.type !== 'bill-header-item') {
        return;
      }

      setBillHeaderWorkbenchDrag({ id: activeData.fieldId, scope: activeData.scope });
      setBillHeaderWorkbenchDropTarget(null);
    };
    const handleBillHeaderWorkbenchDragOver = (event: DragOverEvent) => {
      const activeData = event.active.data.current;
      const overData = event.over?.data.current;
      if (!isBillHeaderWorkbenchDragData(activeData) || activeData.type !== 'bill-header-item') {
        return;
      }

      if (!isBillHeaderWorkbenchDragData(overData)) {
        setBillHeaderWorkbenchDropTarget(null);
        return;
      }

      if (overData.type === 'bill-header-item') {
        if (overData.fieldId === activeData.fieldId) {
          setBillHeaderWorkbenchDropTarget(null);
          return;
        }

        setBillHeaderWorkbenchDropTarget({ row: overData.row, beforeId: overData.fieldId });
        return;
      }

      setBillHeaderWorkbenchDropTarget({ row: overData.row, beforeId: null });
    };
    const handleBillHeaderWorkbenchDragEnd = (event: DragEndEvent) => {
      const activeData = event.active.data.current;
      const overData = event.over?.data.current;
      if (!isBillHeaderWorkbenchDragData(activeData) || activeData.type !== 'bill-header-item') {
        clearBillHeaderWorkbenchDragState();
        return;
      }

      if (!isBillHeaderWorkbenchDragData(overData)) {
        clearBillHeaderWorkbenchDragState();
        return;
      }

      if (overData.type === 'bill-header-item') {
        if (overData.fieldId !== activeData.fieldId) {
          moveBillHeaderField(activeData.fieldId, overData.row, overData.fieldId);
        }
        clearBillHeaderWorkbenchDragState();
        return;
      }

      moveBillHeaderField(activeData.fieldId, overData.row);
      clearBillHeaderWorkbenchDragState();
    };
    const handleBillHeaderPaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
      const text = event.clipboardData.getData('text');
      if (!text) return;
      const fieldNames = text.split(/[\t\n]/).map((item) => item.trim()).filter(Boolean);
      if (fieldNames.length === 0) return;
      event.preventDefault();
      const targetRow = billHeaderRowCount;
      commitBillHeaderFields((fields) => {
        const nextMainIndex = fields.filter((field) => !String(field.id).startsWith('bill_meta_')).length;
        const appendedFields = fieldNames.map((name, index) => buildColumn('m_col', nextMainIndex + index + 1, {
          name,
          width: BILL_FORM_DEFAULT_WIDTH,
          panelRow: targetRow,
        }));
        return [...fields, ...appendedFields];
      });
    };
    const appendBillHeaderField = () => {
      const targetRow = billHeaderRowCount;
      commitBillHeaderFields((fields) => {
        const nextMainIndex = fields.filter((field) => !String(field.id).startsWith('bill_meta_')).length;
        return [
          ...fields,
          buildColumn('m_col', nextMainIndex + 1, {
            width: BILL_FORM_DEFAULT_WIDTH,
            panelRow: targetRow,
          }),
        ];
      });
    };
    const billDocumentTitle = activeMenuName ? `${activeMenuName} - 制单` : '单据制单';
    const isBlueBillTone = billDocumentTone === 'blue';
    const billToneMeta = isBlueBillTone
      ? {
          strip: 'bg-[linear-gradient(90deg,#2f6fed_0%,#5e90ff_40%,#8db5ff_100%)]',
          title: 'text-[#334e7d]',
          divider: 'bg-[linear-gradient(90deg,transparent,rgba(96,165,250,0.88),transparent)]',
          radioActiveBorder: 'border-[#7db2ff]',
          radioActiveDot: 'bg-[#2f6fed]',
          radioActiveText: 'text-[#2f6fed]',
        }
      : {
          strip: 'bg-[linear-gradient(90deg,#d84a63_0%,#ef6c7f_42%,#f6a5b3_100%)]',
          title: 'text-[#a63f53]',
          divider: 'bg-[linear-gradient(90deg,transparent,rgba(251,113,133,0.82),transparent)]',
          radioActiveBorder: 'border-[#f3a3b0]',
          radioActiveDot: 'bg-[#e35b74]',
          radioActiveText: 'text-[#d84a63]',
        };
    const documentGuideStyle: React.CSSProperties = {
      backgroundImage: 'linear-gradient(rgba(226,232,240,0.52) 1px, transparent 1px), linear-gradient(90deg, rgba(226,232,240,0.52) 1px, transparent 1px)',
      backgroundSize: '24px 24px',
    };
    const actionRailItems = [
      { icon: Table2, label: '来源表', action: () => activateSourceGridSelection() },
      { icon: LayoutPanelTop, label: '整理', action: () => autoArrangeBillHeaderFields() },
      { icon: Plus, label: '控件', action: appendBillHeaderField },
      { icon: Save, label: '暂存', action: () => showToast('已暂存单据模板布局') },
    ];
    const headerWorkbenchHeightClass = createRuntimeClassName('bill-header-height', `rows-${billHeaderRowCount}`);
    const billHeaderRuntimeRules = joinRuntimeDeclarationBlocks([
      createRuntimeDeclarationBlock(headerWorkbenchHeightClass, { 'min-height': headerWorkbenchHeight }),
      ...billCanvasFields.flatMap((column) => {
        const normalizedColumn = normalizeColumn(column);
        const fieldWidth = getBillHeaderFieldWidth(column);
        const labelWidth = Math.max(60, Math.min(132, normalizedColumn.name.length * 14 + 10));
        const fontSize = Math.max(11, Math.min(18, Number(normalizedColumn.fontSize) || BILL_FORM_DEFAULT_FONT_SIZE)) + 1;
        const previewWidth = Math.max(104, fieldWidth - labelWidth - 18);
        const widthClassName = createRuntimeClassName('bill-header-field-width', column.id);
        const labelClassName = createRuntimeClassName('bill-header-field-label', column.id);
        const fontClassName = createRuntimeClassName('bill-header-field-font', column.id);
        const previewClassName = createRuntimeClassName('bill-header-field-preview', column.id);

        return [
          createRuntimeDeclarationBlock(widthClassName, { width: fieldWidth, 'min-width': fieldWidth }),
          createRuntimeDeclarationBlock(labelClassName, { width: labelWidth, 'min-width': labelWidth }),
          createRuntimeDeclarationBlock(fontClassName, { 'font-size': fontSize }),
          createRuntimeDeclarationBlock(previewClassName, { width: previewWidth, 'min-width': previewWidth }),
        ];
      }),
    ]);
    const draggedBillHeaderField = billHeaderWorkbenchDrag
      ? billCanvasFields.find((field) => field.id === billHeaderWorkbenchDrag.id) ?? null
      : null;

    return (
      <div
        style={workspaceThemeVars}
        className={`flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-slate-50/55 ${isConfigFullscreenActive ? 'shadow-none' : 'shadow-[0_28px_64px_-48px_rgba(15,23,42,0.22)]'} ${workspaceThemeStyles.tableSurface}`}
      >
        {billHeaderRuntimeRules ? <style>{billHeaderRuntimeRules}</style> : null}
        <div ref={billDocumentViewportRef} className={`min-h-0 flex-1 overflow-hidden ${billViewportPaddingClass}`}>
          <div className={`flex h-full min-h-0 items-stretch overflow-hidden ${billPaperWrapClass}`}>
            <div
              ref={billDocumentPaperRef}
              className="flex h-full min-h-full w-full shrink-0 flex-col max-w-none"
              style={{ zoom: billDocumentScale } as React.CSSProperties}
            >
              <div className={billPaperShellClass}>
            <div className={`h-2 ${isConfigFullscreenActive ? 'rounded-t-lg' : 'rounded-t-xl'} ${billToneMeta.strip}`} />

            <div className={`border-b border-[#e8eef6] ${billHeaderPaddingClass}`}>
              <div className="relative">
                <div className="absolute right-0 top-0 flex size-[58px] items-center justify-center rounded-[10px] border border-[#dde7f3] bg-white">
                  <div className="grid h-7 w-7 grid-cols-3 gap-[2px]">
                    {Array.from({ length: 9 }).map((_, index) => (
                      <span
                        key={index}
                        className={`rounded-[2px] ${[0, 1, 2, 3, 5, 6, 7].includes(index) ? 'bg-slate-700' : 'bg-slate-300'}`}
                      />
                    ))}
                  </div>
                </div>
                <div className="px-20 text-center">
                  <div className={`text-[31px] font-black tracking-[0.22em] transition-colors ${billToneMeta.title}`}>{billDocumentTitle}</div>
                  <div className={`mx-auto mt-3 h-px w-[54%] transition-colors ${billToneMeta.divider}`} />
                  <div className="mt-4 flex items-center justify-center">
                    <div className="inline-flex items-center gap-4 rounded-md border border-[#dbe6f2] bg-white px-4 py-1.5 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setBillDocumentTone('blue')}
                        className={`inline-flex items-center gap-2 transition-colors ${isBlueBillTone ? billToneMeta.radioActiveText : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        <span className={`inline-flex h-4 w-4 items-center justify-center rounded-full border bg-white transition-colors ${isBlueBillTone ? billToneMeta.radioActiveBorder : 'border-slate-300'}`}>
                          {isBlueBillTone ? <span className={`h-2 w-2 rounded-full ${billToneMeta.radioActiveDot}`} /> : null}
                        </span>
                        蓝字单据
                      </button>
                      <button
                        type="button"
                        onClick={() => setBillDocumentTone('red')}
                        className={`inline-flex items-center gap-2 transition-colors ${!isBlueBillTone ? billToneMeta.radioActiveText : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        <span className={`inline-flex h-4 w-4 items-center justify-center rounded-full border bg-white transition-colors ${!isBlueBillTone ? billToneMeta.radioActiveBorder : 'border-slate-300'}`}>
                          {!isBlueBillTone ? <span className={`h-2 w-2 rounded-full ${billToneMeta.radioActiveDot}`} /> : null}
                        </span>
                        红字单据
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className={`flex min-h-0 flex-1 ${billBodyPaddingClass}`}>
              <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                <div
                  ref={billHeaderCanvasRef}
                  tabIndex={0}
                  style={{ ...documentGuideStyle, minHeight: headerWorkbenchHeight }}
                  onClick={() => {
                    setSelectedMainForDelete([]);
                    activateTableConfigSelection('main');
                  }}
                  onPaste={handleBillHeaderPaste}
                  className={`relative overflow-hidden rounded-lg border border-[#dce5f0] bg-white px-4 py-4 outline-none transition-shadow ${
                    isBillHeaderPanelActive ? 'shadow-[inset_0_0_0_2px_rgba(47,111,237,0.28)]' : ''
                  }`}
                >
                  {billCanvasFields.length > 0 ? (
                    <DndContext
                      sensors={designerWorkbenchSensors}
                      onDragStart={handleBillHeaderWorkbenchDragStart}
                      onDragOver={handleBillHeaderWorkbenchDragOver}
                      onDragEnd={handleBillHeaderWorkbenchDragEnd}
                      onDragCancel={clearBillHeaderWorkbenchDragState}
                    >
                      <div className={cn(headerWorkbenchHeightClass, 'flex flex-col gap-1')}>
                        {billHeaderRows.map((rowNumber) => {
                          const rowFields = billCanvasFields.filter((field) => getBillHeaderFieldRow(field) === rowNumber);
                          const isRowDropTarget = billHeaderWorkbenchDrag !== null
                            && billHeaderWorkbenchDropTarget?.row === rowNumber
                            && billHeaderWorkbenchDropTarget.beforeId === null;

                          return (
                            <DesignerWorkbenchDropLane
                              key={`bill-header-row-${rowNumber}`}
                              dropId={getBillHeaderRowDropId(rowNumber)}
                              data={{
                                type: 'bill-header-row',
                                row: rowNumber,
                              } satisfies BillHeaderWorkbenchDragData}
                              className={cn(
                                'scrollbar-none flex min-h-[48px] items-center overflow-visible rounded-lg border border-transparent bg-transparent px-0.5 py-1 transition-colors',
                                isRowDropTarget && designerWorkbenchRowActiveClass,
                                rowFields.length === 0 && designerWorkbenchRowEmptyClass,
                              )}
                            >
                              <div className="flex min-w-full items-center">
                                <div className="flex min-w-0 flex-1 items-center gap-1">
                                  {rowFields.length > 0 ? rowFields.map((column, index) => {
                                    const normalizedColumn = normalizeColumn(column);
                                    const columnScope = column.__scope;
                                    const isActive = selectedMainForDelete.length <= 1
                                      && selectedMainForDelete.includes(column.id)
                                      && selectedMainColId === column.id;
                                    const isMarkedForDelete = selectedMainForDelete.includes(column.id);
                                    const isDragging = billHeaderWorkbenchDrag?.id === column.id || activeBillResizeId === column.id;
                                    const isInsertTarget = billHeaderWorkbenchDrag !== null
                                      && billHeaderWorkbenchDropTarget?.row === rowNumber
                                      && billHeaderWorkbenchDropTarget.beforeId === column.id
                                      && billHeaderWorkbenchDrag.id !== column.id;
                                    const widthClassName = createRuntimeClassName('bill-header-field-width', column.id);
                                    const labelClassName = createRuntimeClassName('bill-header-field-label', column.id);
                                    const fontClassName = createRuntimeClassName('bill-header-field-font', column.id);
                                    const previewClassName = createRuntimeClassName('bill-header-field-preview', column.id);
                                    const isSelected = isActive || isMarkedForDelete || isInsertTarget;

                                    return (
                                      <DesignerWorkbenchDraggableItem
                                        key={column.id}
                                        dragId={getBillHeaderDragItemId(column.id, columnScope)}
                                        dropId={getBillHeaderDropItemId(column.id, columnScope)}
                                        data={{
                                          type: 'bill-header-item',
                                          fieldId: column.id,
                                          row: rowNumber,
                                          scope: columnScope,
                                        } satisfies BillHeaderWorkbenchDragData}
                                        itemAttributes={{
                                          'data-bill-field-id': String(column.id),
                                          'data-bill-field-scope': String(columnScope),
                                        }}
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          handleBillFieldSelect(event, column.id, columnScope);
                                        }}
                                        onContextMenu={(event) => handleBillFieldContextMenu(event, column.id, columnScope)}
                                        onKeyDown={(event) => {
                                          if (event.key === 'Enter' || event.key === ' ') {
                                            event.preventDefault();
                                            event.stopPropagation();
                                            setSelectedMainForDelete([column.id]);
                                            activateColumnSelection('main', column.id);
                                          }
                                        }}
                                        className={cn(
                                          getCompactWorkbenchItemClass({
                                            selected: isSelected,
                                            dragging: isDragging,
                                            insertTarget: isInsertTarget,
                                          }),
                                          widthClassName,
                                          'h-[44px] shrink-0 gap-1 pr-3.5 text-left',
                                        )}
                                      >
                                        {isInsertTarget ? (
                                          <span className="pointer-events-none absolute inset-y-1 left-0 w-[3px] rounded-full bg-primary" />
                                        ) : null}
                                        <div
                                          className={cn(
                                            labelClassName,
                                            fontClassName,
                                            'pointer-events-none shrink-0 truncate text-left text-[11px] font-medium text-foreground',
                                            isSelected && 'text-foreground',
                                          )}
                                          title={normalizedColumn.name}
                                        >
                                          <span className="block truncate">
                                            {normalizedColumn.name}
                                          </span>
                                        </div>
                                        <div className={cn(previewClassName, getBillHeaderPreviewShellClass(column.id, isSelected))}>
                                          {renderFieldPreview(normalizedColumn, index, 'condition')}
                                        </div>
                                        <div
                                          data-drag-resize-handle="true"
                                          className="absolute inset-y-0 right-0 flex w-2 cursor-col-resize items-stretch justify-end"
                                          onMouseDown={(event) => startBillFieldResize(event, column.id, columnScope)}
                                          title="拖动调整控件宽度"
                                        >
                                          <span className="h-full w-px bg-border/80 transition-colors group-hover:bg-primary" />
                                        </div>
                                      </DesignerWorkbenchDraggableItem>
                                    );
                                  }) : isRowDropTarget && draggedBillHeaderField ? (
                                    <div
                                      className={cn(
                                        createRuntimeClassName('bill-header-field-width', draggedBillHeaderField.id),
                                        getCompactWorkbenchItemClass({ selected: true }),
                                        'pointer-events-none h-[44px] shrink-0 gap-1 rounded-md border-dashed border-primary/35 bg-background/85 pr-3.5 text-left shadow-sm',
                                      )}
                                    >
                                      <div
                                        className={cn(
                                          createRuntimeClassName('bill-header-field-label', draggedBillHeaderField.id),
                                          createRuntimeClassName('bill-header-field-font', draggedBillHeaderField.id),
                                          'pointer-events-none shrink-0 truncate text-left text-[11px] font-medium text-foreground',
                                        )}
                                        title={normalizeColumn(draggedBillHeaderField).name}
                                      >
                                        <span className="block truncate">{normalizeColumn(draggedBillHeaderField).name}</span>
                                      </div>
                                      <div className={cn(createRuntimeClassName('bill-header-field-preview', draggedBillHeaderField.id), 'pointer-events-none min-w-0 shrink-0')}>
                                        {renderFieldPreview(normalizeColumn(draggedBillHeaderField), 0, 'condition')}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="text-xs font-medium text-muted-foreground">
                                      拖入本行
                                    </div>
                                  )}
                                </div>
                              </div>
                            </DesignerWorkbenchDropLane>
                          );
                        })}
                      </div>
                    </DndContext>
                  ) : (
                    <div className="flex min-h-[260px] items-center justify-center">
                      <Card className="border-dashed border-border bg-muted/30 px-6 py-8 text-center shadow-none">
                        <CardContent className="flex flex-col items-center gap-4 p-0">
                          <div className="flex size-12 items-center justify-center rounded-md bg-primary/10 text-primary">
                            <FileSpreadsheet className="size-5" />
                          </div>
                          <div className="text-sm font-semibold text-foreground">将 Excel 字段复制到单据抬头</div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>

                <Card className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden border-border/80 bg-card">
                  <CardHeader className="border-b border-border/80 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <Table2 className="size-4" />
                      </div>
                      <div>
                        <CardTitle>单据明细区</CardTitle>
                        <CardDescription className="text-xs">明细表属性、字段和画布配置统一收在这里。</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="min-h-0 flex-1 p-3">
                    {billDetailTableBuilderNode}
                  </CardContent>
                </Card>
              </div>

              <aside className="flex min-h-0 w-[112px] shrink-0 border-l border-border/80 pl-5 pt-1">
                <Card className="w-full border-border/80 bg-card">
                  <CardContent className="p-2.5">
                  <div className="flex flex-col gap-3">
                    {actionRailItems.map((item) => (
                      <Button
                        key={item.label}
                        variant="outline"
                        className="flex h-[78px] w-full flex-col items-center justify-center gap-2 rounded-md px-3 text-xs font-semibold"
                        onClick={item.action}
                      >
                        <item.icon className="size-5" />
                        <span className="leading-5">{item.label}</span>
                      </Button>
                    ))}
                  </div>
                  </CardContent>
                </Card>
              </aside>
            </div>
          </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTableBuilder = useCallback((
    scope: 'left' | 'main' | 'detail',
    cols: any[],
    setCols: React.Dispatch<React.SetStateAction<any[]>>,
    selectedId: string | null,
    selectedForDelete: string[],
    setSelectedForDelete: React.Dispatch<React.SetStateAction<string[]>>,
    options?: TableBuilderOptions,
  ) => {
    return (
      <MemoTableBuilder
        scope={scope}
        cols={cols}
        setCols={setCols}
        selectedId={selectedId}
        selectedForDelete={selectedForDelete}
        setSelectedForDelete={setSelectedForDelete}
        options={options}
        activeResize={activeResize}
        workspaceTheme={workspaceTheme}
        workspaceThemeVars={workspaceThemeVars}
        isCompactModuleSetting={isCompactModuleSetting}
        businessType={businessType}
        activateColumnSelection={activateColumnSelection}
        setBuilderSelectionContextMenu={setBuilderSelectionContextMenu}
        startResize={startResize}
        autoFitColumnWidth={autoFitColumnWidth}
      />
    );
  }, [
    activeResize,
    activateColumnSelection,
    autoFitColumnWidth,
    businessType,
    isCompactModuleSetting,
    setBuilderSelectionContextMenu,
    startResize,
    workspaceTheme,
    workspaceThemeVars,
  ]);

  const activeDetailTableColumns = detailTableColumns[activeTab] || [];
  const activeDetailTableConfig = detailTableConfigs[activeTab];
  const isDetailGridTableSelected = selectedTableConfigScope === 'detail' && inspectorTarget.id === '表格';
  const setActiveDetailTableColumns = useCallback((newCols: React.SetStateAction<any[]>) => {
    setDetailTableColumns((prev) => ({
      ...prev,
      [activeTab]: typeof newCols === 'function' ? newCols(prev[activeTab] || []) : newCols,
    }));
  }, [activeTab]);
  const handleArchiveMainTableSelect = useCallback(() => {
    setSelectedArchiveNodeId('archive-main');
    activateTableConfigSelection('main');
  }, [activateTableConfigSelection]);
  const handleArchiveMainTablePreview = useCallback(() => {
    if (mainDetailBoardGroups.length === 0) return;
    openDetailBoardPreview(1);
  }, [mainDetailBoardGroups.length, openDetailBoardPreview]);
  const handleArchiveLeftTableSelect = useCallback(() => {
    setSelectedArchiveNodeId('archive-left-grid');
    activateTableConfigSelection('left');
  }, [activateTableConfigSelection]);
  const handleBuilderMainTableSelect = useCallback(() => {
    activateTableConfigSelection('main');
  }, [activateTableConfigSelection]);
  const handleBuilderMainTablePreview = useCallback(() => {
    if (!mainDetailBoardEnabled) return;
    openDetailBoardPreview(1);
  }, [mainDetailBoardEnabled, openDetailBoardPreview]);
  const handleActiveDetailTableSelect = useCallback(() => {
    setSelectedArchiveNodeId(`detail-${activeTab}`);
    activateTableConfigSelection('detail', '表格');
  }, [activeTab, activateTableConfigSelection]);
  const handleBillDetailTableSelect = useCallback(() => {
    activateTableConfigSelection('detail');
  }, [activateTableConfigSelection]);
  const archiveMainTableBuilderOptions = useMemo(() => ({
    contextMenuScope: 'main' as const,
    contextMenuConfig: {
      enabled: (mainTableConfig.contextMenuItems ?? []).length > 0,
      items: mainTableConfig.contextMenuItems ?? [],
    },
    backgroundSelectable: true,
    tableSelected: selectedTableConfigScope === 'main',
    onSelectTable: handleArchiveMainTableSelect,
    detailBoardConfig: mainTableConfig.detailBoard,
    normalizedDetailBoardConfig: normalizedMainDetailBoardConfig,
    renderableColumns: mainRenderableColumns,
    onCanvasDoubleClick: handleArchiveMainTablePreview,
    canvasLabel: '点击配置基础档案主表',
  }), [
    handleArchiveMainTablePreview,
    handleArchiveMainTableSelect,
    mainRenderableColumns,
    mainTableConfig.contextMenuItems,
    mainTableConfig.detailBoard,
    normalizedMainDetailBoardConfig,
    selectedTableConfigScope,
  ]);
  const documentTreeTableBuilderOptions = useMemo(() => ({
    backgroundSelectable: true,
    tableSelected: selectedTableConfigScope === 'left',
    onSelectTable: handleArchiveLeftTableSelect,
    canvasLabel: '点击配置左侧树表',
  }), [handleArchiveLeftTableSelect, selectedTableConfigScope]);
  const builderMainTableBuilderOptions = useMemo(() => ({
    backgroundSelectable: true,
    tableSelected: selectedTableConfigScope === 'main',
    onSelectTable: handleBuilderMainTableSelect,
    detailBoardConfig: mainTableConfig.detailBoard,
    normalizedDetailBoardConfig: normalizedMainDetailBoardConfig,
    renderableColumns: mainRenderableColumns,
    onCanvasDoubleClick: handleBuilderMainTablePreview,
    canvasLabel: '点击配置主表属性',
  }), [
    handleBuilderMainTablePreview,
    handleBuilderMainTableSelect,
    mainRenderableColumns,
    mainTableConfig.detailBoard,
    normalizedMainDetailBoardConfig,
    selectedTableConfigScope,
  ]);
  const documentDetailTableBuilderOptions = useMemo(() => ({
    contextMenuScope: 'detail' as const,
    contextMenuConfig: {
      enabled: Boolean(activeDetailTableConfig?.contextMenuEnabled),
      items: activeDetailTableConfig?.contextMenuItems ?? [],
    },
    backgroundSelectable: true,
    tableSelected: isDetailGridTableSelected,
    onSelectTable: handleActiveDetailTableSelect,
    detailBoardConfig: activeDetailTableConfig?.detailBoard,
    canvasLabel: '点击配置明细表属性',
    density: 'compact' as const,
  }), [
    activeDetailTableConfig?.contextMenuEnabled,
    activeDetailTableConfig?.contextMenuItems,
    activeDetailTableConfig?.detailBoard,
    handleActiveDetailTableSelect,
    isDetailGridTableSelected,
  ]);
  const billDetailTableBuilderOptions = useMemo(() => ({
    backgroundSelectable: true,
    tableSelected: selectedTableConfigScope === 'detail',
    onSelectTable: handleBillDetailTableSelect,
    canvasLabel: '点击配置单据明细表',
  }), [handleBillDetailTableSelect, selectedTableConfigScope]);
  const archiveMainTableBuilderNode = useMemo(() => renderTableBuilder(
    'main',
    mainTableColumns,
    setMainTableColumns,
    selectedMainColId,
    selectedMainForDelete,
    setSelectedMainForDelete,
    archiveMainTableBuilderOptions,
  ), [
    archiveMainTableBuilderOptions,
    mainTableColumns,
    renderTableBuilder,
    selectedMainColId,
    selectedMainForDelete,
  ]);
  const documentTreeTableBuilderNode = useMemo(() => renderTableBuilder(
    'left',
    leftTableColumns,
    setLeftTableColumns,
    selectedLeftColId,
    selectedLeftForDelete,
    setSelectedLeftForDelete,
    documentTreeTableBuilderOptions,
  ), [
    documentTreeTableBuilderOptions,
    leftTableColumns,
    renderTableBuilder,
    selectedLeftColId,
    selectedLeftForDelete,
  ]);
  const builderLeftTableBuilderNode = useMemo(() => renderTableBuilder(
    'left',
    leftTableColumns,
    setLeftTableColumns,
    selectedLeftColId,
    selectedLeftForDelete,
    setSelectedLeftForDelete,
  ), [
    leftTableColumns,
    renderTableBuilder,
    selectedLeftColId,
    selectedLeftForDelete,
  ]);
  const builderMainTableBuilderNode = useMemo(() => renderTableBuilder(
    'main',
    mainTableColumns,
    setMainTableColumns,
    selectedMainColId,
    selectedMainForDelete,
    setSelectedMainForDelete,
    builderMainTableBuilderOptions,
  ), [
    builderMainTableBuilderOptions,
    mainTableColumns,
    renderTableBuilder,
    selectedMainColId,
    selectedMainForDelete,
  ]);
  const documentDetailTableBuilderNode = useMemo(() => renderTableBuilder(
    'detail',
    activeDetailTableColumns,
    setActiveDetailTableColumns,
    selectedDetailColId,
    selectedDetailForDelete,
    setSelectedDetailForDelete,
    documentDetailTableBuilderOptions,
  ), [
    activeDetailTableColumns,
    documentDetailTableBuilderOptions,
    renderTableBuilder,
    selectedDetailColId,
    selectedDetailForDelete,
    setActiveDetailTableColumns,
  ]);
  const builderDetailTableBuilderNode = useMemo(() => renderTableBuilder(
    'detail',
    activeDetailTableColumns,
    setActiveDetailTableColumns,
    selectedDetailColId,
    selectedDetailForDelete,
    setSelectedDetailForDelete,
  ), [
    activeDetailTableColumns,
    renderTableBuilder,
    selectedDetailColId,
    selectedDetailForDelete,
    setActiveDetailTableColumns,
  ]);
  const billDetailTableBuilderNode = useMemo(() => renderTableBuilder(
    'detail',
    billDetailColumns,
    setBillDetailColumns,
    selectedDetailColId,
    selectedDetailForDelete,
    setSelectedDetailForDelete,
    billDetailTableBuilderOptions,
  ), [
    billDetailColumns,
    billDetailTableBuilderOptions,
    renderTableBuilder,
    selectedDetailColId,
    selectedDetailForDelete,
  ]);

  const configSteps = [
    { id: 1, title: '类型选择', desc: '先确定本次创建的是单表还是单据' },
    { id: 2, title: '菜单信息', desc: '基础路由、菜单与功能树映射' },
    { id: 3, title: '模块介绍', desc: '功能概述与使用说明' },
    { id: 4, title: '调研过程', desc: 'AI 深度业务需求分析' },
    { id: MODULE_SETTING_STEP, title: '模块设置', desc: '字段、表单与流程编排' },
    { id: RESTRICTION_STEP, title: '限制措施', desc: '规则、流程与限制配置' },
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
      setSubsystemMenus(data);

      const nextSubsystem = data.find((item) => getEnabledMenuNodes(item.children).length > 0) ?? data[0] ?? null;
      const nextFirstLevelMenu = getEnabledMenuNodes(nextSubsystem?.children)[0] ?? null;

      setExpandedSubsystemId(nextSubsystem?.id ?? null);
      setActiveSubsystem(nextSubsystem?.id ?? '');
      setActiveFirstLevelMenuId(nextFirstLevelMenu?.id ?? '');
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
  }, []);

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

  const toggleSubsystemExpansion = (subsystemId: string) => {
    setExpandedSubsystemId((prev) => (prev === subsystemId ? null : subsystemId));
  };

  const handleFirstLevelMenuClick = (subsystemId: string, menu: BackendMenuNode) => {
    setActiveSubsystem(subsystemId);
    setActiveFirstLevelMenuId(menu.id);
    setSecondLevelMenus([]);
    setMenuLoadError(null);
    setExpandedSubsystemId(subsystemId);
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
  const normalizeDetailFillTypeValue = (value: string | undefined | null) => (
    DETAIL_FILL_TYPE_OPTIONS.some((option) => option.value === value)
      ? value!
      : DETAIL_FILL_TYPE_OPTIONS[0].value
  );
  const getDetailFillTypeByTabId = (tabId: string) => normalizeDetailFillTypeValue(detailTabConfigs[tabId]?.detailType);
  const currentDetailFillType = getDetailFillTypeByTabId(activeTab);
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

  useEffect(() => {
    setSelectedDetailForDelete([]);
    setSelectedDetailFiltersForDelete([]);
    setInspectorTarget((prev) => {
      if (prev.kind === 'detail-col' || prev.kind === 'detail-filter' || prev.kind === 'detail-tab' || prev.kind === 'detail-grid') {
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
      kind: 'detail-grid',
      id: getDetailFillTypeByTabId(tabId),
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

    if (normalizeModuleType(activeConfigMenu?.moduleType) !== 'single-table' || !activeConfigModuleKey) {
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

        setLeftTableColumns((prev) => orderedRows.map((row, index) => {
          const backendId = getRecordFieldValue(row, 'id');
          const fieldName = toRecordText(getRecordFieldValue(row, 'fieldname', 'fieldName'));
          const fieldKey = toRecordText(getRecordFieldValue(row, 'fieldkey', 'fieldKey'));
          const existing = prev.find((item) => (
            (backendId != null && getRecordFieldValue(item, 'backendid', 'backendId') === backendId)
            || (fieldName && item.sourceField === fieldName)
            || (fieldKey && getRecordFieldValue(item, 'backendfieldkey', 'backendFieldKey') === fieldKey)
          ));

          return mapSingleTableGridFieldRecordToColumn(row, index, existing);
        }));
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
    configStep,
    documentConditionOwnerSourceId,
    isConfigOpen,
    parsedTreeSourceFields,
    treeRelationColumn,
  ]);

  useEffect(() => {
    if (!isConfigOpen) {
      moduleSettingFullscreenInitRef.current = false;
      return;
    }

    if ((configStep === MODULE_SETTING_STEP || configStep === RESTRICTION_STEP) && !moduleSettingFullscreenInitRef.current) {
      moduleSettingFullscreenInitRef.current = true;
    }
  }, [configStep, isConfigOpen]);

  useEffect(() => {
    if (!isConfigOpen || configStep !== MODULE_SETTING_STEP) {
      setIsSingleTableFieldsLoading(false);
      return;
    }

    if (normalizeModuleType(activeConfigMenu?.moduleType) !== 'single-table' || !activeConfigModuleKey) {
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
  }, [activeConfigMenu?.moduleType, activeConfigModuleKey, configStep, isConfigOpen]);

  useEffect(() => {
    if (!isConfigOpen || configStep !== MODULE_SETTING_STEP) {
      return;
    }

    if (normalizeModuleType(activeConfigMenu?.moduleType) !== 'single-table' || !activeConfigModuleKey) {
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
  }, [activeConfigMenu?.moduleType, activeConfigModuleKey, configStep, isConfigOpen]);

  useEffect(() => {
    if (!isConfigOpen || configStep !== MODULE_SETTING_STEP) {
      return;
    }

    if (normalizeModuleType(activeConfigMenu?.moduleType) !== 'single-table' || !activeConfigModuleKey) {
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

    if (normalizeModuleType(activeConfigMenu?.moduleType) !== 'single-table' || !activeConfigModuleKey) {
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
        const nextTabs = mappedDetails.map((item) => item.tab);
        const nextTabConfigs = Object.fromEntries(mappedDetails.map((item) => [item.tab.id, item.config]));
        const nextGridConfigs = Object.fromEntries(mappedDetails.map((item) => [item.tab.id, item.gridConfig]));
        const nextDetailColumns = Object.fromEntries(mappedDetails.map((item) => [item.tab.id, [] as any[]]));
        const nextDetailFilters = Object.fromEntries(mappedDetails.map((item) => [item.tab.id, [] as any[]]));
        const nextActiveTab = nextTabs[0]?.id ?? '';

        setDetailTabs(nextTabs);
        setDetailTabConfigs(nextTabConfigs);
        setDetailTableConfigs(nextGridConfigs);
        setDetailTableColumns(nextDetailColumns);
        setDetailFilterFields(nextDetailFilters);
        setSelectedDetailForDelete([]);
        setSelectedDetailFiltersForDelete([]);
        setActiveTab((prev) => (nextTabs.some((tab) => tab.id === prev) ? prev : nextActiveTab));
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
  }, [activeConfigMenu?.moduleType, activeConfigModuleKey, configStep, isConfigOpen]);

  useEffect(() => {
    if (!isConfigOpen || configStep !== MODULE_SETTING_STEP) {
      return;
    }

    if (normalizeModuleType(activeConfigMenu?.moduleType) !== 'single-table' || !activeConfigModuleKey) {
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
  }, [activeConfigMenu?.moduleType, activeConfigModuleKey, configStep, isConfigOpen]);

  useEffect(() => {
    if (!isConfigOpen || configStep !== MODULE_SETTING_STEP) {
      return;
    }

    if (normalizeModuleType(activeConfigMenu?.moduleType) !== 'single-table' || !activeConfigModuleKey) {
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
  }, [activeConfigMenu?.moduleType, activeConfigModuleKey, configStep, isConfigOpen]);

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
    if (!mainDetailBoardGroups.some((group: any) => group.id === selectedDetailBoardGroupId)) {
      setSelectedDetailBoardGroupId(mainDetailBoardGroups[0]?.id ?? null);
    }
  }, [mainDetailBoardGroups, selectedDetailBoardGroupId]);

  useEffect(() => {
    if (!mainDetailBoardGroups.some((group: any) => group.id === selectedArchiveLayoutGroupId)) {
      setSelectedArchiveLayoutGroupId(mainDetailBoardGroups[0]?.id ?? null);
    }
  }, [mainDetailBoardGroups, selectedArchiveLayoutGroupId]);

  useEffect(() => {
    const handlePointerMove = (event: MouseEvent) => {
      if (billFieldResizeRef.current) {
        const resize = billFieldResizeRef.current;
        const maxWidth = Math.max(
          BILL_FORM_MIN_WIDTH,
          Math.min(BILL_FORM_MAX_WIDTH, resize.boardWidth - resize.startCanvasX - BILL_FORM_LAYOUT_PADDING_X),
        );
        const resizeField = billCanvasFieldsRef.current.find((column) => column.id === resize.id);
        const resizeRow = clampValue(
          Number.isFinite(Number(resizeField?.panelRow)) ? Number(resizeField.panelRow) : BILL_HEADER_WORKBENCH_MIN_ROWS,
          BILL_HEADER_WORKBENCH_MIN_ROWS,
          billHeaderWorkbenchConfig.rows,
        );
        const siblingWidths = billCanvasFieldsRef.current
          .filter((column) => column.id !== resize.id)
          .filter((column) => (
            clampValue(
              Number.isFinite(Number(column?.panelRow)) ? Number(column.panelRow) : BILL_HEADER_WORKBENCH_MIN_ROWS,
              BILL_HEADER_WORKBENCH_MIN_ROWS,
              billHeaderWorkbenchConfig.rows,
            ) === resizeRow
          ))
          .map((column) => Math.max(BILL_FORM_MIN_WIDTH, Number(column?.width) || BILL_FORM_DEFAULT_WIDTH));
        const snapCandidates = buildResizeSnapCandidates(siblingWidths, {
          minWidth: BILL_FORM_MIN_WIDTH,
          maxWidth,
          baseWidth: BILL_FORM_DEFAULT_WIDTH,
        });
        const rawWidth = resize.startWidth + (event.clientX - resize.startX);
        const { width: nextWidth } = resolveResizeWidthWithSnap(rawWidth, {
          minWidth: BILL_FORM_MIN_WIDTH,
          maxWidth,
          snapCandidates,
        });

        pendingBillResizeRef.current = {
          id: resize.id,
          scope: resize.scope,
          width: nextWidth,
        };

        if (billResizeFrameRef.current !== null) return;
        billResizeFrameRef.current = window.requestAnimationFrame(() => {
          billResizeFrameRef.current = null;
          const nextResize = pendingBillResizeRef.current;
          if (!nextResize) return;

          setBillFieldLivePreview((prev) => (
            prev
            && prev.id === nextResize.id
            && prev.scope === nextResize.scope
            && prev.width === nextResize.width
              ? prev
              : {
                  id: nextResize.id,
                  scope: nextResize.scope,
                  width: nextResize.width,
                  guides: EMPTY_BILL_FIELD_GUIDES,
                }
          ));
        });
        return;
      }

      if (billFieldDragRef.current) {
        const drag = billFieldDragRef.current;
        const deltaX = event.clientX - drag.startX;
        const deltaY = event.clientY - drag.startY;
        const rawX = Math.max(
          BILL_FORM_LAYOUT_PADDING_X,
          Math.min(drag.boardWidth - drag.fieldWidth - BILL_FORM_LAYOUT_PADDING_X, drag.startCanvasX + deltaX),
        );
        const rawY = Math.max(BILL_FORM_LAYOUT_PADDING_Y, drag.startCanvasY + deltaY);
        const snappedPosition = resolveBillFieldSnap(drag.id, rawX, rawY, drag.boardWidth, drag.fieldWidth, drag.boardHeight);

        pendingBillDragPositionRef.current = {
          id: drag.id,
          scope: drag.scope,
          x: snappedPosition.x,
          y: snappedPosition.y,
          guides: snappedPosition.guides,
        };

        if (billDragFrameRef.current !== null) return;
        billDragFrameRef.current = window.requestAnimationFrame(() => {
          billDragFrameRef.current = null;
          const nextDrag = pendingBillDragPositionRef.current;
          if (!nextDrag) return;

          setBillFieldLivePreview({
            id: nextDrag.id,
            scope: nextDrag.scope,
            x: nextDrag.x,
            y: nextDrag.y,
            width: drag.fieldWidth,
            guides: nextDrag.guides,
          });
        });
        return;
      }

      if (!layoutDragRef.current) return;

      const drag = layoutDragRef.current;
      if (drag.type === 'document-left-width') {
        const delta = event.clientX - drag.startX;
        setDocumentLeftPaneWidth(Math.min(460, Math.max(280, drag.startValue + delta)));
      }

      if (drag.type === 'document-detail-width') {
        const delta = drag.startX - event.clientX;
        setDocumentDetailPaneWidth(Math.min(520, Math.max(360, drag.startValue + delta)));
      }
    };

    const stopDrag = () => {
      if (billFieldResizeRef.current) {
        if (billResizeFrameRef.current !== null) {
          window.cancelAnimationFrame(billResizeFrameRef.current);
          billResizeFrameRef.current = null;
        }
        const nextResize = pendingBillResizeRef.current;
        if (nextResize) {
          const updateFields = nextResize.scope === 'main' ? setMainTableColumns : setBillMetaFields;
          updateFields((prev: any[]) => prev.map((column) => (
            column.id === nextResize.id
              ? { ...column, width: nextResize.width }
              : column
          )));
        }
        pendingBillResizeRef.current = null;
        setBillFieldLivePreview(null);
        setActiveBillResizeId(null);
        billFieldResizeRef.current = null;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
      if (billFieldDragRef.current) {
        if (billDragFrameRef.current !== null) {
          window.cancelAnimationFrame(billDragFrameRef.current);
          billDragFrameRef.current = null;
        }
        const nextDrag = pendingBillDragPositionRef.current;
        if (nextDrag) {
          const updateFields = nextDrag.scope === 'main' ? setMainTableColumns : setBillMetaFields;
          updateFields((prev: any[]) => prev.map((column) => (
            column.id === nextDrag.id
              ? { ...column, canvasX: nextDrag.x, canvasY: nextDrag.y }
              : column
          )));
        }
        pendingBillDragPositionRef.current = null;
        setBillFieldSnapGuides(EMPTY_BILL_FIELD_GUIDES);
        setBillFieldLivePreview(null);
        setActiveBillDragId(null);
        billFieldDragRef.current = null;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
      if (!layoutDragRef.current) return;
      layoutDragRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', stopDrag);

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', stopDrag);
    };
  }, []);

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

  const getDetailFillTypeIcon = (fillType?: string) => {
    const detailFillType = getDetailFillTypeMeta(fillType).value;

    switch (detailFillType) {
      case '树表格':
        return FolderTree;
      case '图表':
        return BarChart3;
      case '网页':
        return Globe;
      default:
        return Table2;
    }
  };

  const renderDetailTabStrip = (options?: {
    addLabel?: string;
    showModeBadge?: boolean;
  }) => {
    const activeTabMeta = getDetailFillTypeMeta(currentDetailFillType);
    const ActiveDetailIcon = getDetailFillTypeIcon(currentDetailFillType);

    return (
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          {detailTabs.map((tab) => {
            const isActive = activeTab === tab.id;

            return (
              <div
                key={tab.id}
                className={cn(
                  'group flex min-w-[124px] items-center gap-1.5 rounded-[14px] border px-2 py-1.5 transition-all',
                  isActive
                    ? 'border-primary bg-primary text-white'
                    : 'border-border/70 bg-background/88 text-slate-600 shadow-[0_12px_22px_-22px_rgba(15,23,42,0.18)] hover:border-primary/30 hover:bg-background dark:border-white/10 dark:bg-slate-900/50 dark:text-slate-300 dark:hover:border-primary/30 dark:hover:bg-slate-900/80',
                )}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => activateDetailWorkbenchTab(tab.id)}
                  className={cn(
                    'h-auto min-w-0 flex-1 justify-start rounded-[10px] px-2 py-1 text-left shadow-none hover:bg-transparent',
                    isActive
                      ? 'text-white hover:bg-transparent hover:text-white'
                      : 'text-foreground hover:bg-transparent hover:text-foreground',
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className={cn('block truncate text-[12px] font-semibold', isActive && 'text-white')}>
                      {tab.name}
                    </span>
                  </span>
                </Button>
                {detailTabs.length > 1 ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(event) => deleteTab(tab.id, event)}
                    className={cn(
                      'size-8 shrink-0 rounded-2xl',
                      isActive
                        ? 'text-white/80 hover:bg-white/12 hover:text-white'
                        : 'text-muted-foreground hover:bg-destructive/10 hover:text-destructive',
                    )}
                    title="删除页签"
                  >
                    <X className="size-3.5" />
                  </Button>
                ) : null}
              </div>
            );
          })}

          <Button
            variant="outline"
            size="sm"
            onClick={addTab}
            className="h-10 gap-1.5 rounded-[12px] border-dashed border-primary/30 bg-primary/5 px-3 text-[11px] font-semibold text-primary hover:bg-primary/10 hover:text-primary"
          >
            <Plus className="size-4" />
            {options?.addLabel ?? '新增页签'}
          </Button>
        </div>

        {options?.showModeBadge !== false ? (
          <Badge
            variant="muted"
            className="h-10 gap-2 rounded-md border-border px-3 font-medium text-foreground"
          >
            <ActiveDetailIcon className="size-4" />
            <span>{activeTabMeta.label}视图</span>
          </Badge>
        ) : null}
      </div>
    );
  };

  const startLayoutDrag = (
    type: 'document-left-width' | 'document-detail-width',
    event: React.MouseEvent,
  ) => {
    event.preventDefault();
    layoutDragRef.current = {
      type,
      startX: event.clientX,
      startY: event.clientY,
      startValue:
        type === 'document-left-width'
          ? documentLeftPaneWidth
          : documentDetailPaneWidth,
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const renderDetailFillPlaceholder = () => {
    const fillTypeMeta = getDetailFillTypeMeta(currentDetailFillType);
    const FillTypeIcon = getDetailFillTypeIcon(fillTypeMeta.value);
    const isDetailViewSelected = inspectorTarget.kind === 'detail-grid' && inspectorTarget.id === fillTypeMeta.value;
    const handleActivateDetailView = () => {
      setSelectedArchiveNodeId(`detail-${activeTab}`);
      setInspectorPanelTab('common');
      activateTableConfigSelection('detail', fillTypeMeta.value);
    };

    return (
      <button
        type="button"
        onClick={handleActivateDetailView}
        className={cn(
          'flex min-h-[156px] w-full flex-col items-center justify-center gap-3 rounded-md border border-dashed px-6 py-7 text-center shadow-sm transition-all',
          isDetailViewSelected
            ? 'border-primary bg-primary/5 text-foreground ring-2 ring-primary ring-offset-1'
            : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:bg-accent/30',
        )}
      >
        <div className="flex size-11 items-center justify-center rounded-md border border-border bg-muted text-primary">
          <FillTypeIcon className="size-5" />
        </div>
        <div className="space-y-1.5">
          <div className="text-[13px] font-semibold text-foreground">{fillTypeMeta.label} 视图预留区</div>
          <div className="max-w-sm text-[11px] leading-5 text-muted-foreground">
            {fillTypeMeta.value === '图表' ? '点击配置明细图表' : `点击配置明细${fillTypeMeta.label}`}
          </div>
        </div>
      </button>
    );
  };

  const renderDetailTabsWorkspace = (panelMode: 'document' | 'builder') => {
    const contentPadding = isConfigFullscreenActive
      ? 'p-4'
      : panelMode === 'document'
        ? 'p-6'
        : 'p-5';

    return (
      <div className={`flex h-full min-h-0 flex-col ${contentPadding}`}>
        <div className={cn('mb-3 flex flex-wrap items-center justify-between gap-2 px-1', isConfigFullscreenActive ? 'mb-3' : 'mb-4')}>
          {renderDetailTabStrip({ addLabel: '新增页签', showModeBadge: false })}
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-transparent">
          {currentDetailFillType === '表格' ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex items-center justify-between px-4 py-2">
                <div className="flex items-center gap-2">
                  <Table2 className="size-4 text-primary" />
                  <div className="text-[12px] font-medium text-foreground">明细字段</div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedDetailForDelete.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteSelectedColumns('detail', selectedDetailForDelete)}
                      className="gap-1 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                      删除 ({selectedDetailForDelete.length})
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={() => setDetailTableColumns((prev) => ({
                      ...prev,
                      [activeTab]: [...(prev[activeTab] || []), { id: `d_col_${Date.now()}`, name: `新字段 ${(prev[activeTab] || []).length + 1}`, type: '文本', width: 120 }],
                    }))}
                    className="gap-1"
                  >
                    <Plus className="size-4" />
                    新增字段
                  </Button>
                </div>
              </div>
              <div
                className="scrollbar-none min-h-0 flex-1 overflow-auto bg-transparent outline-none"
                tabIndex={0}
                onPaste={(e) => {
                  const text = e.clipboardData.getData('text');
                  if (!text) return;
                  const newColNames = text.split(/[\t\n]/).map((s) => s.trim()).filter(Boolean);
                  if (newColNames.length > 0) {
                    e.preventDefault();
                    const newCols = newColNames.map((name, i) => ({
                      id: `d_col_${Date.now()}_${i}`,
                      name,
                        type: '文本',
                      width: 100,
                    }));
                    setDetailTableColumns((prev) => ({
                      ...prev,
                      [activeTab]: [...(prev[activeTab] || []), ...newCols],
                    }));
                  }
                }}
              >
                {builderDetailTableBuilderNode}
              </div>
            </div>
          ) : (
            <div className="min-h-0 flex-1 p-4">
              {renderDetailFillPlaceholder()}
            </div>
          )}
        </div>
      </div>
    );
  };

  const selectedColumnContext = useMemo(() => {
    const panelTabId = activeTab;
    const activeDetailTabName = detailTabs.find((tab) => tab.id === panelTabId)?.name || '当前明细';
    const currentDetailFillTypeMeta = getDetailFillTypeMeta(getDetailFillTypeByTabId(panelTabId));
    const selectedDetailInspectorFillType = inspectorTarget.kind === 'detail-grid' && DETAIL_FILL_TYPE_OPTIONS.some((option) => option.value === inspectorTarget.id)
      ? inspectorTarget.id
      : getDetailFillTypeByTabId(panelTabId);
    const selectedDetailInspectorMeta = getDetailFillTypeMeta(selectedDetailInspectorFillType);
    const selectedLeftColId = inspectorTarget.kind === 'left-col' ? inspectorTarget.id ?? null : null;
    const selectedLeftFilterId = inspectorTarget.kind === 'left-filter' ? inspectorTarget.id ?? null : null;
    const selectedMainColId = inspectorTarget.kind === 'main-col' ? inspectorTarget.id ?? null : null;
    const selectedDetailColId = inspectorTarget.kind === 'detail-col' ? inspectorTarget.id ?? null : null;
    const selectedMainFilterId = inspectorTarget.kind === 'main-filter' ? inspectorTarget.id ?? null : null;
    const selectedDetailFilterId = inspectorTarget.kind === 'detail-filter' ? inspectorTarget.id ?? null : null;
    const selectedConditionPanelScope = inspectorTarget.kind === 'left-filter-panel'
      ? 'left'
      : inspectorTarget.kind === 'main-filter-panel'
        ? 'main'
        : null;
    const selectedTableConfigScope = inspectorTarget.kind === 'left-grid'
      ? 'left'
      : inspectorTarget.kind === 'main-grid'
        ? 'main'
        : inspectorTarget.kind === 'detail-grid'
          ? 'detail'
          : null;
    const selectedContextMenuScope = inspectorTarget.kind === 'main-context' ? 'main' : inspectorTarget.kind === 'detail-context' ? 'detail' : null;
    const makeDetailSetter = (updater: React.SetStateAction<any[]>) => {
      setDetailTableColumns((prev) => ({
        ...prev,
        [panelTabId]: typeof updater === 'function' ? updater(prev[panelTabId] || []) : updater,
      }));
    };

    if (selectedMainFilterId) {
      const condition = mainFilterFields.find((item) => item.id === selectedMainFilterId);
      return condition
        ? {
            kind: 'condition' as const,
            scope: 'filter' as const,
            title: '查询条件',
            description: '控制顶部条件区的控件名称、类型、默认值和查询联动逻辑。',
            icon: 'filter_alt',
            iconClass: 'bg-amber-500/12 text-amber-500',
            column: condition,
            setCols: setMainFilterFields,
            removeLabel: '删除条件',
          }
        : null;
    }

    if (selectedLeftFilterId) {
      const condition = leftFilterFields.find((item) => item.id === selectedLeftFilterId);
      return condition
        ? {
            kind: 'condition' as const,
            scope: 'left-filter' as const,
            title: '左侧条件',
            description: '控制左侧树表顶部条件区，配置会写入左边条件表并关联到所属树形字段。',
            icon: 'filter_alt',
            iconClass: 'bg-indigo-500/12 text-indigo-500',
            column: condition,
            setCols: setLeftFilterFields,
            removeLabel: '删除条件',
          }
        : null;
    }

    if (selectedDetailFilterId) {
      const condition = (detailFilterFields[panelTabId] || []).find((item) => item.id === selectedDetailFilterId);
      return condition
        ? {
            kind: 'condition' as const,
            scope: 'detail-filter' as const,
            title: `明细条件 · ${activeDetailTabName}`,
            description: '控制当前明细页签的查询条件、默认值和联动逻辑。',
            icon: 'filter_alt',
            iconClass: 'bg-orange-500/12 text-orange-500',
            column: condition,
            setCols: (updater: React.SetStateAction<any[]>) => {
              setDetailFilterFields((prev) => ({
                ...prev,
                [panelTabId]: typeof updater === 'function' ? updater(prev[panelTabId] || []) : updater,
              }));
            },
            removeLabel: '删除条件',
          }
        : null;
    }

    if (selectedDetailTabId) {
      return {
        kind: 'detail-tab' as const,
        scope: 'detail-tab' as const,
        title: `明细模块 · ${activeDetailTabName}`,
        description: '',
        icon: 'tabs',
        iconClass: 'bg-sky-500/12 text-sky-500',
        column: detailTabConfigs[panelTabId] ?? buildDetailTabConfig({
          tabKey: panelTabId,
          detailName: activeDetailTabName,
        }),
        setCols: (updater: React.SetStateAction<any>) => {
          setDetailTabConfigs((prev) => ({
            ...prev,
            [panelTabId]: typeof updater === 'function'
              ? updater(prev[panelTabId] ?? buildDetailTabConfig({
                tabKey: panelTabId,
                detailName: activeDetailTabName,
              }))
              : updater,
          }));
        },
        removeLabel: '',
      };
    }

    if (selectedConditionPanelScope) {
      const isLeftPanel = selectedConditionPanelScope === 'left';
      const fields = isLeftPanel ? leftFilterFields : mainFilterFields;
      const config = isLeftPanel ? leftConditionWorkbenchConfig : mainConditionWorkbenchConfig;

      return {
        kind: 'condition-panel' as const,
        scope: isLeftPanel ? 'left-filter-panel' as const : 'filter-panel' as const,
        title: isLeftPanel ? '左条件总览' : '主条件总览',
        description: '',
        icon: 'filter_alt',
        iconClass: isLeftPanel ? 'bg-indigo-500/12 text-indigo-500' : 'bg-sky-500/12 text-sky-500',
        config,
        fields,
        setConfig: (updater: ConditionWorkbenchConfig | ((prev: ConditionWorkbenchConfig) => ConditionWorkbenchConfig)) => {
          setConditionWorkbenchConfig(selectedConditionPanelScope, updater);
        },
        appendDraft: () => applyConditionWorkbenchDraft(selectedConditionPanelScope, false),
        replaceDraft: () => applyConditionWorkbenchDraft(selectedConditionPanelScope, true),
      };
    }

    if (selectedContextMenuScope === 'main') {
      return {
        kind: 'contextmenu' as const,
        scope: 'main-contextmenu' as const,
        title: '主表右键菜单',
        description: '控制主表预览区的右键菜单项，设置后可直接在表格中右击查看效果。',
        icon: 'right_click',
        iconClass: 'bg-cyan-500/12 text-cyan-500',
        column: mainTableConfig,
        setCols: setMainTableConfig,
        removeLabel: '',
      };
    }

    if (selectedContextMenuScope === 'detail') {
      return {
        kind: 'contextmenu' as const,
        scope: 'detail-contextmenu' as const,
        title: `明细右键菜单 · ${activeDetailTabName}`,
        description: '控制当前明细表的右键菜单项与禁用条件，设置后可直接右击明细行预览。',
        icon: 'right_click',
        iconClass: 'bg-sky-500/12 text-sky-500',
        column: detailTableConfigs[panelTabId] ?? buildGridConfig('', ''),
        setCols: (updater: React.SetStateAction<any>) => {
          setDetailTableConfigs((prev) => ({
            ...prev,
            [panelTabId]: typeof updater === 'function' ? updater(prev[panelTabId] ?? buildGridConfig('', '')) : updater,
          }));
        },
        removeLabel: '',
      };
    }

    if (inspectorTarget.kind === 'workspace-theme') {
      return {
        kind: 'workspace-theme' as const,
        scope: 'workspace-theme' as const,
        title: '基础档案主题',
        description: '单独控制当前基础档案工作台的主题氛围，不跟表格配置混在一起。',
        icon: 'palette',
        iconClass: 'bg-fuchsia-500/12 text-fuchsia-500',
        column: { theme: workspaceTheme },
        setCols: () => undefined,
        removeLabel: '',
      };
    }

    if (inspectorTarget.kind === 'source-grid') {
      return {
        kind: 'source-grid' as const,
        scope: 'source-grid' as const,
        title: '来源表配置',
        description: '',
        icon: 'database',
        iconClass: 'bg-sky-500/12 text-sky-500',
        column: billSourceDraft,
        availableColumns: billSources,
        setCols: setBillSourceDraft,
        removeLabel: '',
      };
    }

    if (selectedTableConfigScope === 'left') {
      return {
        kind: 'grid' as const,
        scope: 'left-grid' as const,
        title: '左侧树表',
        description: '',
        icon: 'account_tree',
        iconClass: 'bg-indigo-500/12 text-indigo-500',
        column: leftTableConfig,
        availableColumns: leftTableColumns,
        setCols: setLeftTableConfig,
        removeLabel: '',
      };
    }

    if (selectedTableConfigScope === 'main') {
      return {
        kind: 'grid' as const,
        scope: 'main-grid' as const,
        title: businessType === 'table' ? '单据头部' : '主表配置',
        description: '',
        icon: businessType === 'table' ? 'dashboard' : 'table_view',
        iconClass: 'bg-cyan-500/12 text-cyan-500',
        column: mainTableConfig,
        availableColumns: businessType === 'table' ? [...billMetaFields, ...mainTableColumns] : mainTableColumns,
        setCols: setMainTableConfig,
        removeLabel: '',
      };
    }

    if (selectedTableConfigScope === 'detail') {
      if (businessType === 'table') {
        return {
          kind: 'grid' as const,
          scope: 'detail-grid' as const,
          title: '单据明细',
          description: '',
          icon: 'table_rows',
          iconClass: 'bg-sky-500/12 text-sky-500',
          column: billDetailConfig,
          availableColumns: billDetailColumns,
          setCols: setBillDetailConfig,
          removeLabel: '',
        };
      }

      return {
        kind: 'grid' as const,
        scope: 'detail-grid' as const,
        title: `明细页签配置 · ${activeDetailTabName}`,
        description: '',
        icon: selectedDetailInspectorMeta.icon,
        iconClass: 'bg-sky-500/12 text-sky-500',
        column: detailTableConfigs[panelTabId] ?? { mainSql: '', defaultQuery: '', sqlPrompt: '', tableType: '普通表格' },
        availableColumns: detailTableColumns[panelTabId] ?? [],
        setCols: (updater: React.SetStateAction<any>) => {
          setDetailTableConfigs((prev) => ({
            ...prev,
            [panelTabId]: typeof updater === 'function' ? updater(prev[panelTabId] ?? { mainSql: '', defaultQuery: '', sqlPrompt: '', tableType: '普通表格' }) : updater,
          }));
        },
        removeLabel: '',
      };
    }

    if (selectedLeftColId) {
      const column = leftTableColumns.find((item) => item.id === selectedLeftColId);
      return column
        ? {
            kind: 'column' as const,
            scope: 'left' as const,
            title: '左侧树节点',
            description: '控制树形节点关联列解析出的左侧节点字段名称与展示宽度。',
            icon: 'account_tree',
            iconClass: 'bg-indigo-500/12 text-indigo-500',
            column,
            setCols: setLeftTableColumns,
            removeLabel: '删除列',
          }
        : null;
    }

    if (selectedMainColId) {
      const column = mainTableColumns.find((item) => item.id === selectedMainColId)
        ?? billMetaFields.find((item) => item.id === selectedMainColId);
      return column
        ? {
            kind: 'column' as const,
            scope: 'main' as const,
            title: businessType === 'table' ? '单据头部控件' : '基础档案主表',
            description: '',
            icon: businessType === 'table' ? 'touch_app' : 'table_rows',
            iconClass: 'bg-emerald-500/12 text-emerald-500',
            column,
            setCols: mainTableColumns.some((item) => item.id === selectedMainColId) ? setMainTableColumns : setBillMetaFields,
            removeLabel: '删除列',
          }
        : null;
    }

    if (selectedDetailColId) {
      const detailCols = businessType === 'table' ? billDetailColumns : (detailTableColumns[panelTabId] || []);
      const column = detailCols.find((item) => item.id === selectedDetailColId);
      return column
        ? {
            kind: 'column' as const,
            scope: 'detail' as const,
            title: businessType === 'table' ? '单据明细列' : `明细页签 · ${activeDetailTabName}`,
            description: '',
            icon: businessType === 'table' ? 'receipt_long' : 'receipt_long',
            iconClass: 'bg-blue-500/12 text-blue-500',
            column,
            setCols: businessType === 'table' ? setBillDetailColumns : makeDetailSetter,
            removeLabel: '删除列',
          }
        : null;
    }

    return null;
  }, [
    activeTab,
    inspectorTarget,
    detailTabs,
    businessType,
    leftFilterFields,
    leftTableColumns,
    leftTableConfig,
    mainTableColumns,
    billMetaFields,
    detailTableColumns,
    billDetailColumns,
    mainFilterFields,
    detailFilterFields,
    mainConditionWorkbenchConfig,
    leftConditionWorkbenchConfig,
    mainTableConfig,
    detailTableConfigs,
    detailTabConfigs,
    billDetailConfig,
    billSourceDraft,
    billSources,
    workspaceTheme,
  ]);

  const renderColumnOperationPanel = () => {
    const fieldClass = shadcnFieldClass;
    const textareaClass = shadcnTextareaClass;
    const panelShellClass = shadcnPanelShellClass;
    const panelHeaderClass = shadcnPanelHeaderClass;
    const panelTitleClass = shadcnPanelTitleClass;
    const panelBadgeClass = shadcnPanelBadgeClass;
    const panelIconShellClass = `${shadcnPanelIconShellClass} size-10 rounded-lg`;
    const compactInfoCardClass = shadcnInfoCardClass;
    const compactCardClass = shadcnSectionCardClass;
    const sectionTitleClass = shadcnSectionTitleClass;
    const mutedLabelClass = shadcnMutedLabelClass;
    const quietDocumentInspectorCardClass = 'rounded-[16px] border border-slate-200/75 bg-white px-4 py-3 shadow-none dark:border-slate-800 dark:bg-slate-950/78';
    const quietDocumentInspectorSummaryClass = 'rounded-[12px] border border-slate-200/70 bg-slate-50/80 px-3 py-2 text-[11px] leading-5 text-slate-500 dark:border-slate-800 dark:bg-slate-900/55 dark:text-slate-300';
    const quietDocumentInspectorActionClass = 'inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200/80 bg-white px-3 text-[11px] font-medium text-slate-600 transition-colors hover:border-[color:var(--workspace-accent-border)] hover:text-[color:var(--workspace-accent-strong)] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200';
    const quietDocumentInspectorPrimaryActionClass = 'inline-flex h-8 items-center gap-1.5 rounded-md bg-[color:var(--workspace-accent)] px-3 text-[11px] font-medium text-white shadow-none transition-colors hover:bg-[color:var(--workspace-accent-strong)]';
    const isDocumentScopedGridInspector = selectedColumnContext?.kind === 'grid'
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
      ? (selectedColumnContext?.column?.contextMenuItems ?? []).length
      : 0;
    const documentScopedGridColorRuleCount = isDocumentScopedGridInspector
      ? (selectedColumnContext?.column?.colorRules ?? []).length
      : 0;
    const documentScopedGridLabel = selectedColumnContext?.scope === 'left-grid'
      ? '左表'
      : selectedColumnContext?.scope === 'detail-grid'
        ? '明细表'
        : '主表';
    const inspectorTabs: Array<{ id: 'common' | 'advanced' | 'contextmenu' | 'color'; label: string; icon: string; count?: number }> = isDocumentScopedGridInspector
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
    const renderInspectorTabs = () => (
      <div className={shadcnTabListClass}>
        {inspectorTabs.map((tab) => {
          const isActive = currentInspectorTab === tab.id;
          const hasCountBadge = typeof tab.count === 'number' && tab.count > 0;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setInspectorPanelTab(tab.id)}
              className={getShadcnTabTriggerClass(isActive)}
            >
              <span className={`material-symbols-outlined text-[16px] ${isActive ? 'text-[#1686e3]' : 'text-slate-400 dark:text-slate-500'}`}>{tab.icon}</span>
              <span className="truncate">{tab.label}</span>
              {hasCountBadge && (
                isDocumentScopedGridInspector ? (
                  <span className="ml-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold leading-none text-slate-500 dark:bg-slate-800 dark:text-slate-200">
                    {tab.count! > 9 ? '9+' : tab.count}
                  </span>
                ) : (
                  <span className="absolute right-2 top-1.5 inline-flex min-w-[16px] items-center justify-center rounded-full bg-[#e04f5f] px-1.5 py-0.5 text-[9px] font-black leading-none text-white shadow-[0_10px_18px_-14px_rgba(224,79,95,0.78)]">
                    {tab.count! > 9 ? '9+' : tab.count}
                  </span>
                )
              )}
            </button>
          );
        })}
      </div>
    );
    const renderAdvancedPlaceholder = (title: string) => (
      <section className="rounded-md border border-dashed border-slate-200/80 bg-slate-50/50 px-4 py-6 text-center dark:border-slate-700 dark:bg-slate-900/35">
        <div className="mx-auto flex size-10 items-center justify-center rounded-md border border-slate-200/80 bg-white text-[#1686e3] dark:border-slate-700 dark:bg-slate-900">
          <span className="material-symbols-outlined text-[20px]">inventory_2</span>
        </div>
        <div className="mt-3 text-[13px] font-semibold text-slate-700 dark:text-slate-100">{title}</div>
      </section>
    );
    const clonePlainData = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
    const getDefaultDetailGridConfig = () => buildGridConfig('', '', {
      sourceCondition: 'parent_id = ${id}',
    });
    const getDetailTabConfigById = (tabId: string) => (
      detailTabConfigs[tabId] ?? buildDetailTabConfig({
        tabKey: tabId,
        detailName: detailTabs.find((tab) => tab.id === tabId)?.name ?? '',
      })
    );
    const getDetailGridConfigById = (tabId: string) => (
      detailTableConfigs[tabId] ?? getDefaultDetailGridConfig()
    );
    const buildDetailColumnsFromFieldNames = (fieldNames: string[], existingColumns: any[] = []) => {
      const cleanedFieldNames = Array.from(
        new Set(
          fieldNames
            .map((item) => String(item || '').trim())
            .filter((item) => item && item !== '*'),
        ),
      );
      const existingByKey = new Map<string, any>();

      existingColumns.forEach((column) => {
        const normalizedColumn = normalizeColumn(column);
        [normalizedColumn.sourceField, normalizedColumn.name]
          .map((item) => String(item || '').trim().toLowerCase())
          .filter(Boolean)
          .forEach((key) => {
            if (!existingByKey.has(key)) {
              existingByKey.set(key, normalizedColumn);
            }
          });
      });

      return cleanedFieldNames.map((fieldName, index) => {
        const existing = existingByKey.get(fieldName.toLowerCase());
        if (existing) {
          return {
            ...existing,
            id: existing.id || `d_col_${Date.now()}_${index + 1}`,
            name: existing.name || fieldName,
            sourceField: existing.sourceField || fieldName,
            width: existing.width || 120,
          };
        }

        return buildColumn('d_col', index + 1, {
          name: fieldName,
          sourceField: fieldName,
          width: 128,
        });
      });
    };
    const cloneColumnsForDetail = (columns: any[] = []) => (
      columns.map((column, index) => {
        const normalizedColumn = clonePlainData(normalizeColumn(column));
        const { id: _id, ...rest } = normalizedColumn;
        return buildColumn('d_col', index + 1, {
          ...rest,
          name: normalizedColumn.name || `字段 ${index + 1}`,
          sourceField: normalizedColumn.sourceField || '',
        });
      })
    );
    const detailSourceModuleCandidates = businessType !== 'table'
      ? (() => {
          const seen = new Set<string>();
          return [
            {
              moduleCode: currentModuleCode,
              moduleName: currentModuleName,
              tableName: currentPrimaryTableName,
              mainSql: mainTableConfig.mainSql || (currentPrimaryTableName ? `SELECT * FROM ${currentPrimaryTableName}` : ''),
              columnCount: mainTableColumns.length,
              isCurrent: true,
            },
            ...restrictionTopStructures.map((item) => ({
              moduleCode: String(item.moduleCode || '').trim(),
              moduleName: String(item.tableDesc || item.moduleCode || '').trim(),
              tableName: String(item.tableName || '').trim(),
              mainSql: item.tableName ? `SELECT * FROM ${String(item.tableName || '').trim()}` : '',
              columnCount: undefined as number | undefined,
              isCurrent: String(item.moduleCode || '').trim() === currentModuleCode,
            })),
          ].filter((item) => {
            if (!item.moduleCode || seen.has(item.moduleCode)) return false;
            seen.add(item.moduleCode);
            return true;
          });
        })()
      : [];
    const findDetailSourceModuleCandidate = (moduleCode: string) => (
      detailSourceModuleCandidates.find((item) => item.moduleCode === String(moduleCode || '').trim()) ?? null
    );
    const updateDetailTabConfigById = (
      tabId: string,
      updater: React.SetStateAction<Record<string, any>>,
    ) => {
      setDetailTabConfigs((prev) => ({
        ...prev,
        [tabId]: typeof updater === 'function'
          ? updater(prev[tabId] ?? getDetailTabConfigById(tabId))
          : updater,
      }));
    };
    const updateDetailGridConfigById = (
      tabId: string,
      updater: React.SetStateAction<Record<string, any>>,
    ) => {
      setDetailTableConfigs((prev) => ({
        ...prev,
        [tabId]: typeof updater === 'function'
          ? updater(prev[tabId] ?? getDefaultDetailGridConfig())
          : updater,
      }));
    };
    const syncDetailColumnsFromSqlById = (
      tabId: string,
      sql: string,
      options: { notify?: boolean } = {},
    ) => {
      const notify = options.notify ?? true;
      const fieldNames = parseSqlFieldNames(sql);
      if (fieldNames.length === 0 || fieldNames.every((item) => item === '*')) {
        if (notify) {
          showToast('当前 SQL 还没有解析出可用字段');
        }
        return false;
      }

      setDetailTableColumns((prev) => ({
        ...prev,
        [tabId]: buildDetailColumnsFromFieldNames(fieldNames, prev[tabId] || []),
      }));
      if (notify) {
        showToast(`已按 SQL 同步 ${fieldNames.filter((item) => item !== '*').length} 个字段`);
      }
      return true;
    };
    const applyDetailModuleInheritanceById = (
      tabId: string,
      moduleCode: string,
      options: { notify?: boolean } = {},
    ) => {
      const notify = options.notify ?? true;
      const normalizedModuleCode = String(moduleCode || '').trim();
      const matchedModule = findDetailSourceModuleCandidate(normalizedModuleCode);

      if (!normalizedModuleCode || !matchedModule) {
        if (notify) {
          showToast('没有匹配到可继承的模块主表配置');
        }
        return false;
      }

      const currentGridConfig = getDetailGridConfigById(tabId);
      const currentTabConfig = getDetailTabConfigById(tabId);
      const relationCondition = String(
        currentGridConfig.sourceCondition
        || currentGridConfig.defaultQuery
        || currentTabConfig.relatedCondition
        || '',
      ).trim();
      const inheritedGridConfig = matchedModule.isCurrent
        ? clonePlainData(mainTableConfig)
        : {
            ...clonePlainData(mainTableConfig),
            detailBoard: buildDetailBoardConfig([], {
              enabled: false,
              theme: mainTableConfig.detailBoard?.theme || 'aurora',
            }),
          };

      updateDetailGridConfigById(tabId, {
        ...inheritedGridConfig,
        mainSql: matchedModule.mainSql || inheritedGridConfig.mainSql || '',
        defaultQuery: relationCondition,
        sourceMode: 'module',
        sourceModuleCode: normalizedModuleCode,
        sourceCondition: relationCondition,
        chartConfig: normalizeDetailChartConfig(currentGridConfig.chartConfig),
      });
      updateDetailTabConfigById(tabId, (prev) => ({
        ...prev,
        relatedModule: normalizedModuleCode,
        relatedCondition: relationCondition,
      }));

      if (matchedModule.isCurrent) {
        setDetailTableColumns((prev) => ({
          ...prev,
          [tabId]: cloneColumnsForDetail(mainTableColumns),
        }));
      } else {
        syncDetailColumnsFromSqlById(tabId, matchedModule.mainSql || '', { notify: false });
      }

      if (notify) {
        showToast(`已继承 ${matchedModule.moduleCode} 的主表配置`);
      }
      return true;
    };
    const handleDetailModuleCodeChange = (
      tabId: string,
      rawModuleCode: string,
      options: { notify?: boolean } = {},
    ) => {
      const normalizedModuleCode = String(rawModuleCode || '').trim();
      const currentGridConfig = getDetailGridConfigById(tabId);
      updateDetailGridConfigById(tabId, {
        ...currentGridConfig,
        sourceMode: normalizedModuleCode ? 'module' : 'sql',
        sourceModuleCode: rawModuleCode,
      });
      updateDetailTabConfigById(tabId, (prev) => ({
        ...prev,
        relatedModule: rawModuleCode,
      }));

      if (!normalizedModuleCode) {
        return;
      }

      if (findDetailSourceModuleCandidate(normalizedModuleCode)) {
        applyDetailModuleInheritanceById(tabId, normalizedModuleCode, options);
      }
    };

    if (!selectedColumnContext) {
      return (
        <div style={workspaceThemeVars} className={panelShellClass}>
          <div className={panelHeaderClass}>
            <div className="flex items-start gap-3">
                <div className="flex size-8 items-center justify-center rounded-md border border-slate-200/80 bg-slate-50 text-[#1686e3] dark:border-slate-800 dark:bg-slate-900 dark:text-[#7cc0ff]">
                <span className="material-symbols-outlined text-[18px]">tune</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={panelBadgeClass}>右侧检查器</span>
                </div>
                <h3 className="mt-1.5 text-[15px] font-semibold tracking-[0.01em] text-slate-800 dark:text-slate-100">详细配置</h3>
              </div>
            </div>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center px-3 py-3">
            <div className="w-full rounded-md border border-dashed border-slate-200/80 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/40">
              <div className="flex items-center gap-3 rounded-md border border-slate-200/80 bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-950">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-[#eef6ff] text-[#1686e3] dark:bg-[#1686e3]/14 dark:text-[#7cc0ff]">
                  <span className="material-symbols-outlined text-[20px]">touch_app</span>
                </div>
                <div className="min-w-0 text-[12px] font-medium text-slate-600 dark:text-slate-200">选中对象后在这里编辑。</div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (selectedColumnContext.kind === 'workspace-theme') {
      return (
        <div style={workspaceThemeVars} className={panelShellClass}>
          <div className={panelHeaderClass}>
            <div className="flex items-start gap-3">
              <div className={`${panelIconShellClass} ${selectedColumnContext.iconClass}`}>
                <span className="material-symbols-outlined text-[18px]">{selectedColumnContext.icon}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className={panelTitleClass}>{selectedColumnContext.title}</h3>
                  <span className={panelBadgeClass}>独立主题设置</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
            <section className={`rounded-[18px] border p-4 shadow-[0_18px_30px_-26px_rgba(15,23,42,0.18)] ${getDetailBoardTheme(workspaceTheme).groupShell}`}>
              <div className="mb-3 flex items-center gap-2 text-[12px] font-bold text-slate-700 dark:text-slate-100">
                <span className="material-symbols-outlined text-[17px] text-[color:var(--workspace-accent)]">palette</span>
                选择主题
              </div>
              <div className="grid gap-2.5">
                {DETAIL_BOARD_THEME_OPTIONS.map((theme) => {
                  const isActiveTheme = workspaceTheme === theme.value;

                  return (
                    <button
                      key={`workspace-theme-panel-${theme.value}`}
                      type="button"
                      onClick={() => setWorkspaceTheme(theme.value)}
                      className={`flex w-full items-start gap-3 rounded-[16px] border px-3.5 py-3 text-left transition-all ${
                        isActiveTheme
                          ? 'border-[color:var(--workspace-accent-border-strong)] bg-[color:var(--workspace-accent-tint)] shadow-[0_16px_30px_-24px_var(--workspace-accent-shadow)]'
                          : 'border-slate-200/80 bg-white/90 hover:border-[color:var(--workspace-accent-border)] hover:bg-white dark:border-slate-700 dark:bg-slate-900/60 dark:hover:bg-slate-900/78'
                      }`}
                    >
                      <div
                        className={`mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-[14px] ${
                          theme.value === 'sunset'
                            ? 'bg-[linear-gradient(135deg,rgba(251,146,60,0.18),rgba(244,114,182,0.16))] text-orange-500'
                            : theme.value === 'jade'
                              ? 'bg-[linear-gradient(135deg,rgba(52,211,153,0.18),rgba(16,185,129,0.16))] text-emerald-500'
                              : 'bg-[linear-gradient(135deg,rgba(96,165,250,0.18),rgba(34,211,238,0.16))] text-sky-500'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[18px]">palette</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-[13px] font-bold ${isActiveTheme ? 'text-[color:var(--workspace-accent-strong)]' : 'text-slate-700 dark:text-slate-100'}`}>
                            {theme.label}
                          </span>
                          {isActiveTheme && (
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${getDetailBoardTheme(workspaceTheme).groupLabel}`}>
                              已启用
                            </span>
                          )}
                        </div>
                      </div>
                      <span className={`material-symbols-outlined text-[18px] ${isActiveTheme ? 'text-[color:var(--workspace-accent)]' : 'text-slate-300 dark:text-slate-600'}`}>
                        {isActiveTheme ? 'radio_button_checked' : 'radio_button_unchecked'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      );
    }

    if (selectedColumnContext.kind === 'source-grid') {
      const currentSourceConfig = billSourceDraft;
      const currentSourceFields = parseBillSourceDetailFields(currentSourceConfig.sourceDetail);
      const updateSourceConfig = (patch: Record<string, any>) => {
        setBillSourceDraft((prev) => ({ ...prev, ...patch }));
      };

      return (
        <div style={workspaceThemeVars} className={panelShellClass}>
          <div className={panelHeaderClass}>
            <div className="flex items-start gap-3">
              <div className={`${panelIconShellClass} ${selectedColumnContext.iconClass}`}>
                <span className="material-symbols-outlined text-[18px]">{selectedColumnContext.icon}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className={panelTitleClass}>{selectedColumnContext.title}</h3>
                  <span className={panelBadgeClass}>{billSources.length} 个来源</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4">
            <div className="space-y-4">
              <section className={compactCardClass}>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className={sectionTitleClass}>
                    <span className="material-symbols-outlined text-[18px] text-[color:var(--workspace-accent)]">database</span>
                    <h4>来源列表</h4>
                  </div>
                  <button
                    type="button"
                    onClick={createBillSourceDraft}
                    className="inline-flex h-8 items-center gap-1 rounded-[12px] bg-[color:var(--workspace-accent)] px-3 text-[11px] font-bold text-white"
                  >
                    <span className="material-symbols-outlined text-[14px]">add</span>
                    新增来源
                  </button>
                </div>
                <div className="space-y-2">
                  {billSources.map((source) => {
                    const isActive = source.id === activeBillSourceId && billSourceDraftMode === 'edit';
                    const fieldCount = parseBillSourceDetailFields(source.sourceDetail).length;
                    return (
                      <button
                        key={source.id}
                        type="button"
                        onClick={() => selectBillSourceDraft(source)}
                        className={`w-full rounded-[18px] border px-3.5 py-3 text-left transition-colors ${
                          isActive
                            ? 'border-[color:var(--workspace-accent-border-strong)] bg-[color:var(--workspace-accent-soft)]'
                            : 'border-slate-200/80 bg-white/88 hover:border-[color:var(--workspace-accent-border)] dark:border-slate-700 dark:bg-slate-900/56'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[13px] font-bold text-slate-800 dark:text-slate-100">
                              {source.sourceName || '未命名来源'}
                            </div>
                            <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                              {source.configType} · {source.sourceType} · {fieldCount} 项明细
                            </div>
                          </div>
                          {isActive && (
                            <span className="inline-flex rounded-full bg-[color:var(--workspace-accent-soft)] px-2 py-0.5 text-[10px] font-bold text-[color:var(--workspace-accent)]">
                              编辑中
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className={compactCardClass}>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className={sectionTitleClass}>
                    <span className="material-symbols-outlined text-[18px] text-[color:var(--workspace-accent)]">edit_square</span>
                    <h4>{billSourceDraftMode === 'create' ? '新增来源' : '编辑来源'}</h4>
                  </div>
                  <button
                    type="button"
                    onClick={saveBillSourceDraft}
                    className="inline-flex h-8 items-center gap-1 rounded-[12px] bg-[color:var(--workspace-accent)] px-3 text-[11px] font-bold text-white"
                  >
                    <span className="material-symbols-outlined text-[14px]">save</span>
                    保存来源
                  </button>
                </div>
                <div className="grid gap-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className={mutedLabelClass}>配置类型</label>
                      <select
                        value={currentSourceConfig.configType}
                        onChange={(e) => updateSourceConfig({ configType: e.target.value })}
                        className={fieldClass}
                      >
                        {BILL_SOURCE_CONFIG_TYPE_OPTIONS.map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={mutedLabelClass}>类型</label>
                      <select
                        value={currentSourceConfig.sourceType}
                        onChange={(e) => updateSourceConfig({ sourceType: e.target.value })}
                        className={fieldClass}
                      >
                        {BILL_SOURCE_TYPE_OPTIONS.map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className={mutedLabelClass}>来源名称</label>
                    <input
                      type="text"
                      value={currentSourceConfig.sourceName}
                      onChange={(e) => updateSourceConfig({ sourceName: e.target.value })}
                      className={fieldClass}
                    />
                  </div>
                  <div>
                    <label className={mutedLabelClass}>来源 SQL</label>
                    <textarea
                      rows={4}
                      value={currentSourceConfig.sourceSql}
                      onChange={(e) => updateSourceConfig({ sourceSql: e.target.value })}
                      className={textareaClass}
                    />
                  </div>
                  <div>
                    <label className={mutedLabelClass}>来源明细</label>
                    <textarea
                      rows={5}
                      value={currentSourceConfig.sourceDetail}
                      onChange={(e) => updateSourceConfig({ sourceDetail: e.target.value })}
                      placeholder="一行一个字段，或用逗号分隔"
                      className={textareaClass}
                    />
                    <div className="mt-2 flex flex-wrap gap-2">
                      {currentSourceFields.length > 0 ? currentSourceFields.map((fieldName) => (
                        <span
                          key={fieldName}
                          className="inline-flex h-8 items-center rounded-full border border-slate-200/80 bg-white/92 px-3 text-[11px] font-bold text-slate-700 shadow-[0_10px_18px_-16px_rgba(15,23,42,0.14)] dark:border-slate-700 dark:bg-slate-900/72 dark:text-slate-100"
                        >
                          {fieldName}
                        </span>
                      )) : (
                        <span className="text-[11px] text-slate-400">保存后这里会自动成为字段绑定可选项</span>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      );
    }

    if (selectedColumnContext.kind === 'detail-tab') {
      const currentTabConfig = selectedColumnContext.column;
      const currentTabId = activeTab;
      const currentTabMeta = detailTabs.find((tab) => tab.id === currentTabId);
      const currentTabName = currentTabMeta?.name || currentTabConfig.detailName || '当前明细模块';
      const updateTabConfig = (patch: Record<string, any>) => {
        selectedColumnContext.setCols((prev: Record<string, any>) => ({
          ...prev,
          ...patch,
        }));

        if (typeof patch.detailName === 'string') {
          const nextName = patch.detailName.trim() || '未命名明细';
          setDetailTabs((prev) => prev.map((tab) => (
            tab.id === currentTabId
              ? { ...tab, name: nextName }
              : tab
          )));
        }
      };
      const updateTabType = (nextType: string) => {
        const normalizedType = normalizeDetailFillTypeValue(nextType);
        updateTabConfig({ detailType: normalizedType });
        setInspectorTarget((prev) => (
          prev.kind === 'detail-grid'
            ? { kind: 'detail-grid', id: normalizedType }
            : prev
        ));
      };

      return (
        <div className={panelShellClass}>
          <div className={panelHeaderClass}>
            <div className="flex items-start gap-3">
              <div className={`${panelIconShellClass} ${selectedColumnContext.iconClass}`}>
                <span className="material-symbols-outlined text-[18px]">{selectedColumnContext.icon}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className={panelTitleClass}>{selectedColumnContext.title}</h3>
                  <span className={panelBadgeClass}>明细页签</span>
                </div>
                {renderInspectorTabs()}
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 py-5">
            {isCommonPanelTab ? (
              <>
                <section className={compactCardClass}>
                  <div className={sectionTitleClass}>
                    <span className="material-symbols-outlined text-[15px] text-slate-400">table_rows</span>
                    <span>明细列表</span>
                  </div>
                  <div className="grid gap-4">
                    <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
                      <div>
                        <label className={mutedLabelClass}>所属模块编号</label>
                        <input
                          value={currentTabConfig.tab ?? currentModuleCode}
                          onChange={(e) => updateTabConfig({ tab: e.target.value })}
                          className={fieldClass}
                        />
                      </div>
                      <div>
                        <label className={mutedLabelClass}>列表名称</label>
                        <input
                          value={currentTabConfig.detailName ?? currentTabName}
                          onChange={(e) => updateTabConfig({ detailName: e.target.value })}
                          className={fieldClass}
                        />
                      </div>
                      <div>
                        <label className={mutedLabelClass}>类型</label>
                        <select
                          value={normalizeDetailFillTypeValue(currentTabConfig.detailType)}
                          onChange={(e) => updateTabType(e.target.value)}
                          className={fieldClass}
                        >
                          {DETAIL_FILL_TYPE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={mutedLabelClass}>tabKey</label>
                        <input
                          value={currentTabConfig.tabKey ?? currentTabId}
                          onChange={(e) => updateTabConfig({ tabKey: e.target.value })}
                          className={fieldClass}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className={mutedLabelClass}>DLL 模板</label>
                        <input
                          value={currentTabConfig.dllTemplate ?? ''}
                          onChange={(e) => updateTabConfig({ dllTemplate: e.target.value })}
                          className={fieldClass}
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 rounded-[16px] border border-slate-200/80 bg-slate-50/78 px-3.5 py-3 text-[12px] text-slate-500 dark:border-slate-700 dark:bg-slate-900/54 dark:text-slate-300">
                      <span className="inline-flex items-center rounded-full bg-white px-2.5 py-1 font-semibold text-slate-700 shadow-sm dark:bg-slate-950 dark:text-slate-100">
                        当前明细：{currentTabName}
                      </span>
                      <span className="inline-flex items-center rounded-full border border-slate-200/80 px-2.5 py-1 font-semibold dark:border-slate-700">
                        tabKey：{currentTabConfig.tabKey ?? currentTabId}
                      </span>
                    </div>
                  </div>
                </section>

                <section className={compactCardClass}>
                  <div className={sectionTitleClass}>
                    <span className="material-symbols-outlined text-[15px] text-slate-400">toggle_on</span>
                    <span>开关与权限</span>
                  </div>
                  <div className="grid gap-3 xl:grid-cols-3">
                    {[
                      ['autoRefresh', '自动刷新'],
                      ['disabled', '禁用'],
                      ['rightDisplay', '右边显示'],
                      ['addDisplay', '添加显示'],
                      ['defaultOpen', '默认打开'],
                      ['scanMode', '扫码模式'],
                      ['cardMode', '卡片'],
                    ].map(([key, label]) => (
                      <label
                        key={key}
                        className="flex items-center justify-between rounded-lg border border-slate-200/80 bg-slate-50/70 px-3 py-2.5 text-[12px] font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-100"
                      >
                        <span>{label}</span>
                        <input
                          type="checkbox"
                          checked={Boolean(currentTabConfig[key])}
                          onChange={(e) => updateTabConfig({ [key]: e.target.checked })}
                          className="h-4 w-4 rounded accent-[#1686e3]"
                        />
                      </label>
                    ))}
                  </div>
                  <div className="mt-4 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
                    <div>
                      <label className={mutedLabelClass}>权限</label>
                      <input
                        value={currentTabConfig.privilegeOper ?? ''}
                        onChange={(e) => updateTabConfig({ privilegeOper: e.target.value })}
                        className={fieldClass}
                      />
                    </div>
                    <div>
                      <label className={mutedLabelClass}>禁用条件</label>
                      <textarea
                        rows={4}
                        value={currentTabConfig.disabledCondition ?? ''}
                        onChange={(e) => updateTabConfig({ disabledCondition: e.target.value })}
                        className={textareaClass}
                      />
                    </div>
                  </div>
                </section>
              </>
            ) : (
              <>
                <section className={compactCardClass}>
                  <div className={sectionTitleClass}>
                    <span className="material-symbols-outlined text-[15px] text-slate-400">view_agenda</span>
                    <span>扩展配置</span>
                  </div>
                  <div className="grid gap-4 xl:grid-cols-2">
                    <div>
                      <label className={mutedLabelClass}>显示行数</label>
                      <input
                        type="number"
                        min={1}
                        value={currentTabConfig.displayRows ?? 12}
                        onChange={(e) => updateTabConfig({ displayRows: Number(e.target.value || 0) })}
                        className={fieldClass}
                      />
                    </div>
                    <div>
                      <label className={mutedLabelClass}>列宽</label>
                      <input
                        value={currentTabConfig.bandWidth ?? ''}
                        onChange={(e) => updateTabConfig({ bandWidth: e.target.value })}
                        className={fieldClass}
                      />
                    </div>
                    <div>
                      <label className={mutedLabelClass}>行高</label>
                      <input
                        value={currentTabConfig.bandHeight ?? ''}
                        onChange={(e) => updateTabConfig({ bandHeight: e.target.value })}
                        className={fieldClass}
                      />
                    </div>
                    <div>
                      <label className={mutedLabelClass}>拖拽条件</label>
                      <textarea
                        rows={4}
                        value={currentTabConfig.dragcond ?? ''}
                        onChange={(e) => updateTabConfig({ dragcond: e.target.value })}
                        className={textareaClass}
                      />
                    </div>
                    <div>
                      <label className={mutedLabelClass}>MRP 拖拽标记</label>
                      <input
                        value={currentTabConfig.mrpDragTag ?? ''}
                        onChange={(e) => updateTabConfig({ mrpDragTag: e.target.value })}
                        className={fieldClass}
                      />
                    </div>
                  </div>
                </section>

                <section className={compactCardClass}>
                  <div className={sectionTitleClass}>
                    <span className="material-symbols-outlined text-[15px] text-slate-400">notes</span>
                    <span>备注</span>
                  </div>
                  <textarea
                    rows={4}
                    value={currentTabConfig.Fremark ?? ''}
                    onChange={(e) => updateTabConfig({ Fremark: e.target.value })}
                    className={textareaClass}
                  />
                </section>
              </>
            )}
          </div>
        </div>
      );
    }

    if (selectedColumnContext.kind === 'contextmenu') {
      const currentContextConfig = selectedColumnContext.column;
      const updateContextConfig = (patch: Record<string, any>) => {
        selectedColumnContext.setCols((prev: Record<string, any>) => ({
          ...prev,
          ...patch,
        }));
      };
      const menuItems = (currentContextConfig.contextMenuItems ?? []).map((item: any, index: number) => normalizeContextMenuItem(item, index + 1));
      const enabledMenuCount = menuItems.filter((item: any) => !item.disabled).length;

      return (
        <div className={panelShellClass}>
          <div className={panelHeaderClass}>
            <div className="flex items-start gap-3">
              <div className={`${panelIconShellClass} ${selectedColumnContext.iconClass}`}>
                <span className="material-symbols-outlined text-[18px]">{selectedColumnContext.icon}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className={panelTitleClass}>{selectedColumnContext.title}</h3>
                  <span className={panelBadgeClass}>右键菜单</span>
                </div>
                {renderInspectorTabs()}
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 py-5">
            {isCommonPanelTab ? (
              <>
                <section className="overflow-hidden rounded-[26px] border border-slate-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,248,252,0.96))] shadow-[0_20px_44px_-36px_rgba(15,23,42,0.42)] dark:border-slate-700 dark:bg-slate-900/48">
                  <div className="flex items-start justify-between gap-4 border-b border-slate-200/70 px-5 py-5 dark:border-slate-700">
                    <div className="min-w-0">
                      <div className="text-[14px] font-bold text-slate-800 dark:text-slate-100">菜单状态</div>
                    </div>
                    <label className="inline-flex shrink-0 cursor-pointer items-center gap-3 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-[12px] font-bold text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                      <span>{currentContextConfig.contextMenuEnabled ? '已启用' : '未启用'}</span>
                      <input
                        type="checkbox"
                        checked={Boolean(currentContextConfig.contextMenuEnabled)}
                        onChange={(e) => updateContextConfig({ contextMenuEnabled: e.target.checked })}
                        className="h-4 w-4 rounded accent-[#1686e3]"
                      />
                    </label>
                  </div>
                  <div className="grid gap-4 px-5 py-5">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-[20px] border border-slate-200/70 bg-white/92 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/55">
                        <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">菜单总数</div>
                        <div className="mt-2 text-[22px] font-black text-slate-800 dark:text-slate-100">{menuItems.length}</div>
                      </div>
                      <div className="rounded-[20px] border border-slate-200/70 bg-white/92 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/55">
                        <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">可用项</div>
                        <div className="mt-2 text-[22px] font-black text-emerald-500">{enabledMenuCount}</div>
                      </div>
                      <div className="rounded-[20px] border border-slate-200/70 bg-white/92 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/55">
                        <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">禁用项</div>
                        <div className="mt-2 text-[22px] font-black text-amber-500">{Math.max(0, menuItems.length - enabledMenuCount)}</div>
                      </div>
                    </div>

                    <div className="overflow-hidden rounded-[22px] border border-slate-200/70 bg-[#f8fbff] dark:border-slate-700 dark:bg-slate-900/62">
                      <div className="border-b border-slate-200/70 px-4 py-3 dark:border-slate-700">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px] text-[#1686e3]">preview</span>
                          <span className="text-[12px] font-bold text-slate-700 dark:text-slate-100">右键菜单预览</span>
                        </div>
                      </div>
                      <div className="bg-[radial-gradient(circle_at_top_left,rgba(22,134,227,0.12),transparent_55%),linear-gradient(180deg,rgba(241,247,253,0.94),rgba(255,255,255,0.96))] p-4 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.55),rgba(15,23,42,0.76))]">
                        <div className="mx-auto max-w-[260px] rounded-[18px] border border-white/80 bg-white/96 p-2 shadow-[0_24px_54px_-28px_rgba(15,23,42,0.38)] dark:border-slate-700 dark:bg-slate-900/96">
                          {menuItems.length > 0 ? (
                            menuItems.map((item: any) => {
                              const isDisabled = Boolean(item.disabled) || Boolean(item.disabledCondition);

                              return (
                                <div
                                  key={`preview-${item.id}`}
                                  className={`flex items-center gap-3 rounded-[14px] px-3 py-2.5 ${
                                    isDisabled ? 'opacity-55' : 'hover:bg-[#eef6ff] dark:hover:bg-slate-800'
                                  }`}
                                >
                                  <div className={`flex size-8 items-center justify-center rounded-2xl ${
                                    isDisabled ? 'bg-slate-100 text-slate-300 dark:bg-slate-800 dark:text-slate-600' : 'bg-[#1686e3]/10 text-[#1686e3]'
                                  }`}>
                                    <span className="material-symbols-outlined text-[15px]">{isDisabled ? 'block' : 'subdirectory_arrow_right'}</span>
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className={`break-words text-[12px] font-bold leading-5 ${
                                      isDisabled ? 'text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-100'
                                    }`}>
                                      {item.label || '未命名菜单'}
                                    </div>
                                    <div className="mt-1 break-all font-mono text-[10px] leading-5 text-slate-400">{item.actionKey || '未配置动作'}</div>
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="rounded-[16px] border border-dashed border-slate-200/80 px-4 py-6 text-center text-[12px] text-slate-400 dark:border-slate-700">
                              当前还没有右键菜单项
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="rounded-[26px] border border-slate-200/70 bg-white/84 p-5 shadow-[0_22px_48px_-38px_rgba(15,23,42,0.32)] dark:border-slate-700 dark:bg-slate-900/45">
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <div className="text-[14px] font-bold text-slate-800 dark:text-slate-100">菜单项编辑</div>
                    <button
                      type="button"
                      onClick={() => updateContextConfig({
                        contextMenuItems: [...menuItems, buildContextMenuItem(menuItems.length + 1)],
                      })}
                      className="inline-flex items-center gap-1 rounded-xl border border-[#1686e3] bg-[#1686e3] px-3 py-1.5 text-[12px] font-bold text-white transition-colors hover:bg-[#1176ca]"
                    >
                      <span className="material-symbols-outlined text-[14px]">add</span>
                      新增菜单
                    </button>
                  </div>

                  <div className="space-y-3">
                    {menuItems.length > 0 ? (
                      menuItems.map((item: any, index: number) => (
                        <div key={item.id} className="rounded-[24px] border border-slate-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,250,253,0.94))] p-4 shadow-[0_22px_40px_-34px_rgba(15,23,42,0.36)] dark:border-slate-700 dark:bg-slate-900/55">
                          <div className="mb-4 flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div className="flex size-10 items-center justify-center rounded-[18px] bg-[#1686e3]/10 text-[#1686e3]">
                                <span className="material-symbols-outlined text-[17px]">right_click</span>
                              </div>
                              <div className="min-w-0">
                                <div className="text-[13px] font-bold leading-5 text-slate-700 dark:text-slate-100">菜单 {index + 1}</div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => updateContextConfig({
                                contextMenuItems: menuItems.filter((menu: any) => menu.id !== item.id),
                              })}
                              className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[12px] font-bold text-rose-500 transition-colors hover:bg-rose-50 dark:hover:bg-rose-500/10"
                            >
                              <span className="material-symbols-outlined text-[14px]">delete</span>
                              删除
                            </button>
                          </div>

                          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_170px]">
                            <div>
                              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">菜单名称</label>
                              <input
                                type="text"
                                value={item.label ?? ''}
                                onChange={(e) => updateContextConfig({
                                  contextMenuItems: menuItems.map((menu: any) => (
                                    menu.id === item.id ? { ...menu, label: e.target.value } : menu
                                  )),
                                })}
                                placeholder="菜单名称"
                                className={fieldClass}
                              />
                            </div>
                            <div>
                              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">动作标识</label>
                              <input
                                type="text"
                                value={item.actionKey ?? ''}
                                onChange={(e) => updateContextConfig({
                                  contextMenuItems: menuItems.map((menu: any) => (
                                    menu.id === item.id ? { ...menu, actionKey: e.target.value } : menu
                                  )),
                                })}
                                placeholder="open-detail"
                                className={`${fieldClass} font-mono text-[12px]`}
                              />
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-[22px] border border-dashed border-slate-200/80 px-4 py-8 text-center text-[12px] text-slate-400 dark:border-slate-700">
                        还没有配置右键菜单
                      </div>
                    )}
                  </div>
                </section>
              </>
            ) : (
              <section className="rounded-[26px] border border-slate-200/70 bg-white/84 p-5 shadow-[0_22px_48px_-38px_rgba(15,23,42,0.32)] dark:border-slate-700 dark:bg-slate-900/45">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div className="text-[14px] font-bold text-slate-800 dark:text-slate-100">禁用规则</div>
                  <button
                    type="button"
                    onClick={() => updateContextConfig({
                      contextMenuItems: [...menuItems, buildContextMenuItem(menuItems.length + 1)],
                    })}
                    className="inline-flex items-center gap-1 rounded-xl border border-[#1686e3] bg-[#1686e3] px-3 py-1.5 text-[12px] font-bold text-white transition-colors hover:bg-[#1176ca]"
                  >
                    <span className="material-symbols-outlined text-[14px]">add</span>
                    新增菜单
                  </button>
                </div>

                <div className="space-y-3">
                  {menuItems.length > 0 ? (
                    menuItems.map((item: any, index: number) => (
                      <div key={`advanced-${item.id}`} className="rounded-[22px] border border-slate-200/70 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-900/45">
                        <div className="mb-3 flex items-center gap-2">
                          <div className="text-[13px] font-bold text-slate-700 dark:text-slate-100">菜单 {index + 1}</div>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                  item.disabled || item.disabledCondition ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300'
                          }`}>
                                {item.disabled || item.disabledCondition ? '已禁用' : '默认可用'}
                          </span>
                        </div>
                        <div>
                          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">禁用条件</label>
                          <textarea
                            rows={3}
                            value={item.disabledCondition ?? ''}
                            onChange={(e) => updateContextConfig({
                              contextMenuItems: menuItems.map((menu: any) => (
                                menu.id === item.id ? { ...menu, disabledCondition: e.target.value } : menu
                              )),
                            })}
                            placeholder="例如：status = '停用'"
                            className={textareaClass}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    renderAdvancedPlaceholder('还没有扩展右键规则')
                  )}
                </div>
              </section>
            )}
          </div>
        </div>
      );
    }

    if (selectedColumnContext.kind === 'grid') {
      const availableGridColumns = selectedColumnContext.availableColumns ?? [];
      const currentGridConfig = selectedColumnContext.column;
      const currentDetailBoard = normalizeDetailBoardConfig(currentGridConfig.detailBoard, availableGridColumns);
      const detailBoardTheme = getDetailBoardTheme(workspaceTheme);
      const treeOwnerField = treeRelationColumn ? normalizeColumn(treeRelationColumn) : null;
      const treeOwnerFieldKey = treeOwnerField?.sourceField || treeRelationColumn?.id || '';
      const isMainGridConfig = selectedColumnContext.scope === 'main-grid';
      const isLeftGridConfig = selectedColumnContext.scope === 'left-grid';
      const isBillHeadGridConfig = businessType === 'table' && selectedColumnContext.scope === 'main-grid';
      const isBillDetailGridConfig = businessType === 'table' && selectedColumnContext.scope === 'detail-grid';
      const isDocumentDetailGrid = businessType !== 'table' && selectedColumnContext.scope === 'detail-grid';
      const isDocumentArchiveGrid = businessType !== 'table' && (isMainGridConfig || isLeftGridConfig);
      const useQuietDocumentInspector = isDocumentDetailGrid || isDocumentArchiveGrid;
      const quietInspectorCardClass = useQuietDocumentInspector ? quietDocumentInspectorCardClass : compactCardClass;
      const selectedDetailInspectorFillType = isDocumentDetailGrid && DETAIL_FILL_TYPE_OPTIONS.some((option) => option.value === inspectorTarget.id)
        ? inspectorTarget.id
        : '表格';
      const detailGridFillTypeMeta = !isBillHeadGridConfig && !isBillDetailGridConfig && selectedColumnContext.scope === 'detail-grid'
        ? getDetailFillTypeMeta(selectedDetailInspectorFillType)
        : null;
      const isDetailChartInspector = detailGridFillTypeMeta?.value === '图表';
      const currentDetailTabConfig = isDocumentDetailGrid
        ? getDetailTabConfigById(activeTab)
        : null;
      const currentDetailTabName = detailTabs.find((tab) => tab.id === activeTab)?.name || currentDetailTabConfig?.detailName || '当前明细';
      const currentDetailChartConfig = normalizeDetailChartConfig(currentGridConfig.chartConfig);
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
      const detailSourceModuleCode = isDocumentDetailGrid
        ? String(currentGridConfig.sourceModuleCode || currentDetailTabConfig?.relatedModule || '').trim()
        : '';
      const matchedDetailModuleCandidate = isDocumentDetailGrid
        ? findDetailSourceModuleCandidate(detailSourceModuleCode)
        : null;
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
        selectedColumnContext.setCols((prev: Record<string, any>) => ({
          ...prev,
          ...patch,
        }));
      };
      const updateActiveDetailTabConfig = (patch: Record<string, any>) => {
        if (!isDocumentDetailGrid) return;
        updateDetailTabConfigById(activeTab, (prev) => ({
          ...(prev ?? getDetailTabConfigById(activeTab)),
          ...patch,
        }));
      };
      const updateDetailTabWorkbenchConfig = (patch: Record<string, any>) => {
        if (!isDocumentDetailGrid) return;
        updateActiveDetailTabConfig(patch);
        if (typeof patch.detailName === 'string') {
          const nextName = patch.detailName.trim() || '未命名明细';
          setDetailTabs((prev) => prev.map((tab) => (
            tab.id === activeTab ? { ...tab, name: nextName } : tab
          )));
        }
      };
      const updateDetailWorkbenchType = (nextType: string) => {
        if (!isDocumentDetailGrid) return;
        const normalizedType = normalizeDetailFillTypeValue(nextType);
        updateDetailTabWorkbenchConfig({ detailType: normalizedType });
        setInspectorTarget((prev) => (
          prev.kind === 'detail-grid' && prev.id === normalizedType
            ? prev
            : { kind: 'detail-grid', id: normalizedType }
        ));
      };
      const updateDetailSourceConfig = (patch: Record<string, any>) => {
        if (!isDocumentDetailGrid) return;
        if (Object.prototype.hasOwnProperty.call(patch, 'sourceModuleCode')) {
          handleDetailModuleCodeChange(activeTab, patch.sourceModuleCode, { notify: true });
          return;
        }

        const nextPatch: Record<string, any> = { ...patch };
        if (Object.prototype.hasOwnProperty.call(nextPatch, 'sourceCondition')) {
          nextPatch.defaultQuery = nextPatch.sourceCondition;
        }
        updateGridConfig(nextPatch);
        const tabPatch: Record<string, any> = {};
        if (Object.prototype.hasOwnProperty.call(nextPatch, 'sourceCondition')) {
          tabPatch.relatedCondition = nextPatch.sourceCondition;
        }
        if (Object.keys(tabPatch).length === 0) return;
        updateActiveDetailTabConfig(tabPatch);
      };
      const renderDetailTabWorkbenchSection = () => {
        if (!isDocumentDetailGrid || !currentDetailTabConfig) return null;
        return (
          <section className={quietInspectorCardClass}>
            <div className={sectionTitleClass}>
              <span className="material-symbols-outlined text-[18px] text-[color:var(--workspace-accent)]">tabs</span>
              <div className="min-w-0">
                <h4>明细页签</h4>
                <p className="mt-1 text-[11px] font-normal text-slate-500 dark:text-slate-300">
                  页签名称、类型和模板统一在这里维护。
                </p>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className={mutedLabelClass}>所属模块编号</label>
                <input
                  type="text"
                  value={currentDetailTabConfig.tab ?? currentModuleCode}
                  onChange={(event) => updateDetailTabWorkbenchConfig({ tab: event.target.value })}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className={mutedLabelClass}>页签名称</label>
                <input
                  type="text"
                  value={currentDetailTabConfig.detailName ?? currentDetailTabName}
                  onChange={(event) => updateDetailTabWorkbenchConfig({ detailName: event.target.value })}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className={mutedLabelClass}>类型</label>
                <select
                  value={normalizeDetailFillTypeValue(currentDetailTabConfig.detailType)}
                  onChange={(event) => updateDetailWorkbenchType(event.target.value)}
                  className={fieldClass}
                >
                  {DETAIL_FILL_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={mutedLabelClass}>tabKey</label>
                <input
                  type="text"
                  value={currentDetailTabConfig.tabKey ?? activeTab}
                  onChange={(event) => updateDetailTabWorkbenchConfig({ tabKey: event.target.value })}
                  className={fieldClass}
                />
              </div>
              <div className="md:col-span-2">
                <label className={mutedLabelClass}>DLL 模板</label>
                <input
                  type="text"
                  value={currentDetailTabConfig.dllTemplate ?? ''}
                  onChange={(event) => updateDetailTabWorkbenchConfig({ dllTemplate: event.target.value })}
                  className={fieldClass}
                />
              </div>
            </div>
          </section>
        );
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
      const addDetailGroup = () => {
        const nextGroup = buildDetailBoardGroup(currentDetailBoard.groups.length + 1);
        updateDetailBoard((current: any) => ({
          ...current,
          groups: [...current.groups, nextGroup],
        }));
        setSelectedDetailBoardGroupId(nextGroup.id);
      };
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
      const updateDetailGroup = (groupId: string, updater: Record<string, any> | ((group: any) => any)) => {
        updateDetailBoard((current: any) => ({
          ...current,
          groups: current.groups.map((group: any) => (
            group.id === groupId
              ? typeof updater === 'function'
                ? updater(group)
                : { ...group, ...updater }
              : group
          )),
        }));
      };
      const mergeDetailGroupColumns = (groupId: string, columnIds: string[]) => {
        const occupiedIds = new Set(
          currentDetailBoard.groups
            .filter((group: any) => group.id !== groupId)
            .flatMap((group: any) => group.columnIds ?? []),
        );
        const validIds = Array.from(new Set(columnIds.filter((columnId) => (
          availableGridColumns.some((column) => column.id === columnId)
          && !occupiedIds.has(columnId)
        ))));
        if (validIds.length === 0) {
          showToast('剪贴板里没有可加入当前分组的主表字段');
          return;
        }

        setSelectedMainForDelete([]);
        const currentGroup = currentDetailBoard.groups.find((group: any) => group.id === groupId);
        const nextIds = Array.from(new Set([...(currentGroup?.columnIds ?? []), ...validIds]));
        const addedCount = nextIds.length - (currentGroup?.columnIds?.length ?? 0);
        if (addedCount <= 0) {
          showToast('这些字段已经都在当前分组里了');
          return;
        }

        updateDetailGroup(groupId, (group: any) => ({
          ...group,
          columnIds: nextIds,
          columnRows: {
            ...(group.columnRows ?? {}),
            ...Object.fromEntries(validIds.map((columnId, index) => [columnId, getDetailBoardGroupRows(group)])),
          },
        }));
        showToast(`已加入 ${addedCount} 个字段`);
      };
      const removeDetailGroupColumn = (groupId: string, columnId: string) => {
        updateDetailGroup(groupId, (group: any) => ({
          ...group,
          columnIds: group.columnIds.filter((id: string) => id !== columnId),
          columnRows: Object.fromEntries(
            Object.entries(group.columnRows ?? {}).filter(([key]) => key !== columnId),
          ),
          columnWidths: Object.fromEntries(
            Object.entries(group.columnWidths ?? {}).filter(([key]) => key !== columnId),
          ),
        }));
      };
      const handleDetailGroupPaste = (event: React.ClipboardEvent<HTMLDivElement>, groupId: string) => {
        const text = event.clipboardData.getData('text/plain') || event.clipboardData.getData('text');
        const nextColumnIds = parseDetailBoardClipboardColumnIds(text, availableGridColumns);
        if (nextColumnIds.length === 0) {
          showToast('剪贴板里没有匹配到主表字段');
          return;
        }
        event.preventDefault();
        mergeDetailGroupColumns(groupId, nextColumnIds);
      };
      const clearDetailGroups = () => {
        updateDetailBoard({
          ...currentDetailBoard,
          groups: [],
        });
        setSelectedDetailBoardGroupId(null);
      };
      const detailGroupCount = currentDetailBoard.groups.length;
      const assignedFieldCount = currentDetailBoard.groups.reduce((sum: number, group: any) => sum + group.columnIds.length, 0);
      const detailBoardReady = detailGroupCount > 0;
      const selectedDetailGroup = currentDetailBoard.groups.find((group: any) => group.id === selectedDetailBoardGroupId) ?? currentDetailBoard.groups[0] ?? null;
      const selectedDetailGroupRows = selectedDetailGroup ? getDetailBoardGroupRows(selectedDetailGroup) : DETAIL_BOARD_GROUP_MIN_ROWS;
      const selectedDetailGroupRowNumbers = Array.from({ length: selectedDetailGroupRows }, (_, index) => index + 1);
      const assignedDetailGroupFieldIds = new Set(
        currentDetailBoard.groups.flatMap((group: any) => group.columnIds ?? []),
      );
      const availableUnassignedDetailColumns = availableGridColumns.filter((column: any) => !assignedDetailGroupFieldIds.has(column.id));
      const moveDetailGroupColumn = (groupId: string, columnId: string, rowNumber: number, beforeId: string | null = null) => {
        updateDetailGroup(groupId, (group: any) => {
          const rows = getDetailBoardGroupRows(group);
          const nextRow = clampValue(rowNumber, DETAIL_BOARD_GROUP_MIN_ROWS, rows);
          const currentColumnIds = Array.isArray(group.columnIds) ? group.columnIds : [];
          const sourceIndex = currentColumnIds.indexOf(columnId);
          if (sourceIndex === -1) return group;
          if (beforeId && beforeId === columnId) return group;

          const remaining = currentColumnIds.filter((id: string) => id !== columnId);
          let insertIndex = beforeId ? remaining.indexOf(beforeId) : -1;
          if (insertIndex === -1) {
            insertIndex = remaining.findIndex((id: string) => getDetailBoardGroupColumnRow(group, id) > nextRow);
            if (insertIndex === -1) {
              insertIndex = remaining.length;
            }
          }

          return {
            ...group,
            columnIds: [
              ...remaining.slice(0, insertIndex),
              columnId,
              ...remaining.slice(insertIndex),
            ],
            columnRows: {
              ...(group.columnRows ?? {}),
              [columnId]: nextRow,
            },
          };
        });
      };
      const handleDetailGroupRowDragOver = (rowNumber: number) => (event: React.DragEvent<HTMLDivElement>) => {
        if (!selectedDetailGroup || detailBoardWorkbenchDrag?.groupId !== selectedDetailGroup.id) return;
        event.preventDefault();
        event.stopPropagation();
        if (
          detailBoardWorkbenchDropTarget?.groupId !== selectedDetailGroup.id
          || detailBoardWorkbenchDropTarget?.row !== rowNumber
          || detailBoardWorkbenchDropTarget?.beforeId !== null
        ) {
          setDetailBoardWorkbenchDropTarget({
            groupId: selectedDetailGroup.id,
            row: rowNumber,
            beforeId: null,
          });
        }
        if (event.dataTransfer) {
          event.dataTransfer.dropEffect = 'move';
        }
      };
      const clearDetailBoardWorkbenchDragState = () => {
        setDetailBoardWorkbenchDrag(null);
        setDetailBoardWorkbenchDropTarget(null);
      };
      const handleDetailGroupWorkbenchDragStart = (event: DragStartEvent) => {
        const activeData = event.active.data.current;
        if (!isDetailBoardWorkbenchDragData(activeData) || activeData.type !== 'detail-board-item') {
          return;
        }

        setDetailBoardWorkbenchDrag({ groupId: activeData.groupId, columnId: activeData.fieldId });
        setDetailBoardWorkbenchDropTarget(null);
      };
      const handleDetailGroupWorkbenchDragOver = (event: DragOverEvent) => {
        const activeData = event.active.data.current;
        const overData = event.over?.data.current;
        if (!isDetailBoardWorkbenchDragData(activeData) || activeData.type !== 'detail-board-item') {
          return;
        }

        if (!selectedDetailGroup || activeData.groupId !== selectedDetailGroup.id || !isDetailBoardWorkbenchDragData(overData) || overData.groupId !== selectedDetailGroup.id) {
          setDetailBoardWorkbenchDropTarget(null);
          return;
        }

        if (overData.type === 'detail-board-item') {
          if (overData.fieldId === activeData.fieldId) {
            setDetailBoardWorkbenchDropTarget(null);
            return;
          }

          setDetailBoardWorkbenchDropTarget({
            groupId: selectedDetailGroup.id,
            row: overData.row,
            beforeId: overData.fieldId,
          });
          return;
        }

        setDetailBoardWorkbenchDropTarget({
          groupId: selectedDetailGroup.id,
          row: overData.row,
          beforeId: null,
        });
      };
      const handleDetailGroupWorkbenchDragEnd = (event: DragEndEvent) => {
        const activeData = event.active.data.current;
        const overData = event.over?.data.current;
        if (!isDetailBoardWorkbenchDragData(activeData) || activeData.type !== 'detail-board-item') {
          clearDetailBoardWorkbenchDragState();
          return;
        }

        if (!selectedDetailGroup || activeData.groupId !== selectedDetailGroup.id || !isDetailBoardWorkbenchDragData(overData) || overData.groupId !== selectedDetailGroup.id) {
          clearDetailBoardWorkbenchDragState();
          return;
        }

        if (overData.type === 'detail-board-item') {
          if (overData.fieldId !== activeData.fieldId) {
            moveDetailGroupColumn(selectedDetailGroup.id, activeData.fieldId, overData.row, overData.fieldId);
          }
          clearDetailBoardWorkbenchDragState();
          return;
        }

        moveDetailGroupColumn(selectedDetailGroup.id, activeData.fieldId, overData.row);
        clearDetailBoardWorkbenchDragState();
      };
      const isGridDecorationManagerAvailable = isDocumentArchiveGrid || canManageDetailGridDecorations;
      const renderDetailBoardLayoutManager = () => {
        if (availableGridColumns.length === 0) {
          return renderAdvancedPlaceholder('还没有可分组字段');
        }

        if (!detailBoardReady) {
          return (
            <div className="rounded-[20px] border border-dashed border-[color:var(--workspace-accent-border-strong)] bg-[color:var(--workspace-accent-tint)] px-5 py-10 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-white text-[color:var(--workspace-accent)] shadow-[0_18px_30px_-24px_rgba(15,23,42,0.16)]">
                <span className="material-symbols-outlined text-[22px]">view_stream</span>
              </div>
              <div className="mt-4 text-[13px] font-bold text-slate-700 dark:text-slate-100">当前还没有详情分组</div>
              <button
                type="button"
                onClick={addDetailGroup}
                className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-[14px] border border-[color:var(--workspace-accent-border)] bg-[color:var(--workspace-accent)] px-3 text-[12px] font-bold text-white transition-colors hover:bg-[color:var(--workspace-accent-strong)]"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                创建第一个分组
              </button>
            </div>
          );
        }

        return (
          <section className="rounded-[18px] border border-slate-200/75 bg-white/94 p-3.5 shadow-[0_16px_28px_-24px_rgba(15,23,42,0.16)] dark:border-slate-700 dark:bg-slate-900/55">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[12px] font-bold text-slate-700 dark:text-slate-100">
                <span className="material-symbols-outlined text-[17px] text-[color:var(--workspace-accent)]">view_stream</span>
                <h4>详情分组布局</h4>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={addDetailGroup}
                  className="inline-flex h-9 items-center gap-1.5 rounded-[14px] border border-[color:var(--workspace-accent-border)] bg-[color:var(--workspace-accent)] px-3 text-[12px] font-bold text-white transition-colors hover:bg-[color:var(--workspace-accent-strong)]"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  新增分组
                </button>
                <button
                  type="button"
                  onClick={clearDetailGroups}
                  className="inline-flex h-9 items-center gap-1.5 rounded-[14px] border border-slate-200/80 bg-white px-3 text-[12px] font-bold text-slate-500 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                >
                  <span className="material-symbols-outlined text-[16px]">layers_clear</span>
                  清空分组
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid gap-2">
                {currentDetailBoard.groups.map((group: any, groupIndex: number) => {
                  const isSelectedGroup = selectedDetailGroup?.id === group.id;
                  return (
                    <button
                      key={group.id}
                      type="button"
                      onClick={() => setSelectedDetailBoardGroupId(group.id)}
                      className={`flex w-full items-start justify-between gap-3 rounded-[18px] border px-3.5 py-3 text-left transition-all ${
                        isSelectedGroup
                          ? 'border-[color:var(--workspace-accent-border-strong)] bg-[color:var(--workspace-accent-surface)] shadow-[0_18px_30px_-24px_var(--workspace-accent-shadow)]'
                          : 'border-slate-200/80 bg-white/90 hover:border-[color:var(--workspace-accent-border)] dark:border-slate-700 dark:bg-slate-950/55'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-bold text-slate-700 dark:text-slate-100">
                          {group.name || `分组 ${groupIndex + 1}`}
                        </div>
                        <div className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                          {group.columnIds.length} 项 · {getDetailBoardGroupRows(group)} 行
                        </div>
                      </div>
                      {isSelectedGroup ? <span className="material-symbols-outlined text-[16px] text-[color:var(--workspace-accent)]">check_circle</span> : null}
                    </button>
                  );
                })}
              </div>

              {selectedDetailGroup ? (
                <div className="space-y-3">
                  <div className={`relative rounded-[20px] border px-4 py-4 shadow-[0_16px_28px_-24px_rgba(15,23,42,0.16)] ${detailBoardTheme.groupShell}`}>
                    {activeDetailBoardResize?.groupId === selectedDetailGroup.id ? (
                      <div className="pointer-events-none absolute right-4 top-3 inline-flex items-center gap-2 rounded-full border border-[color:var(--workspace-accent-border)] bg-white/96 px-3 py-1 text-[11px] font-bold text-[color:var(--workspace-accent)] shadow-[0_16px_28px_-24px_var(--workspace-accent-shadow)] dark:bg-slate-950/92">
                        <span className="material-symbols-outlined text-[13px]">straighten</span>
                        <span className="max-w-[120px] truncate">{activeDetailBoardResize.label}</span>
                        <span className="rounded-full bg-[color:var(--workspace-accent-soft)] px-2 py-0.5">
                          {Math.round(activeDetailBoardResize.width)}px
                        </span>
                      </div>
                    ) : null}
                    <div className="space-y-3">
                      <div className="grid gap-3 [grid-template-columns:minmax(0,1fr)_108px]">
                        <div>
                          <label className={mutedLabelClass}>分组名称</label>
                          <input
                            type="text"
                            value={selectedDetailGroup.name}
                            onChange={(event) => updateDetailGroup(selectedDetailGroup.id, { name: event.target.value })}
                            placeholder="例如：业务信息 / 审核信息"
                            className={fieldClass}
                          />
                        </div>
                        <div>
                          <label className={mutedLabelClass}>控件行数</label>
                          <input
                            type="number"
                            min={DETAIL_BOARD_GROUP_MIN_ROWS}
                            max={DETAIL_BOARD_GROUP_MAX_ROWS}
                            value={selectedDetailGroupRows}
                            onChange={(event) => {
                              const nextRows = clampValue(Number(event.target.value) || DETAIL_BOARD_GROUP_MIN_ROWS, DETAIL_BOARD_GROUP_MIN_ROWS, DETAIL_BOARD_GROUP_MAX_ROWS);
                              updateDetailGroup(selectedDetailGroup.id, (group: any) => ({
                                ...group,
                                rows: nextRows,
                                columnRows: Object.fromEntries(
                                  (group.columnIds ?? []).map((columnId: string) => [
                                    columnId,
                                    clampValue(getDetailBoardGroupColumnRow(group, columnId), DETAIL_BOARD_GROUP_MIN_ROWS, nextRows),
                                  ]),
                                ),
                              }));
                            }}
                            className={fieldClass}
                          />
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => mergeDetailGroupColumns(selectedDetailGroup.id, detailBoardClipboardIds)}
                          disabled={detailBoardClipboardIds.length === 0}
                          className={`inline-flex h-10 items-center gap-1.5 rounded-[14px] px-3.5 text-[12px] font-bold transition-colors ${
                            detailBoardClipboardIds.length > 0
                              ? 'border border-[color:var(--workspace-accent-border)] bg-white text-[color:var(--workspace-accent)] hover:bg-[color:var(--workspace-accent-soft)]'
                              : 'cursor-not-allowed border border-slate-200/80 bg-slate-100 text-slate-300 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-600'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[16px]">content_paste</span>
                          粘贴字段
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const remainingGroups = currentDetailBoard.groups.filter((group: any) => group.id !== selectedDetailGroup.id);
                            updateDetailBoard({
                              ...currentDetailBoard,
                              groups: remainingGroups,
                            });
                            setSelectedDetailBoardGroupId(remainingGroups[0]?.id ?? null);
                          }}
                          className="inline-flex h-10 items-center gap-1.5 rounded-[14px] border border-rose-200 bg-white px-3.5 text-[12px] font-bold text-rose-500 transition-colors hover:bg-rose-50 dark:border-rose-500/20 dark:bg-slate-950/70 dark:hover:bg-rose-500/10"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                          删除分组
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <section
                      onPaste={(event) => handleDetailGroupPaste(event, selectedDetailGroup.id)}
                      className={`rounded-[20px] border px-4 py-4 shadow-[0_16px_28px_-24px_rgba(15,23,42,0.16)] ${detailBoardTheme.groupShell}`}
                    >
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-[12px] font-bold text-slate-700 dark:text-slate-100">
                          <span className="material-symbols-outlined text-[16px] text-[color:var(--workspace-accent)]">dashboard_customize</span>
                          分组字段排布
                        </div>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold ${detailBoardTheme.groupLabel}`}>
                          {selectedDetailGroup.columnIds.length} 项
                        </span>
                      </div>
                      <DndContext
                        sensors={designerWorkbenchSensors}
                        onDragStart={handleDetailGroupWorkbenchDragStart}
                        onDragOver={handleDetailGroupWorkbenchDragOver}
                        onDragEnd={handleDetailGroupWorkbenchDragEnd}
                        onDragCancel={clearDetailBoardWorkbenchDragState}
                      >
                        <div className="space-y-2.5">
                          {selectedDetailGroupRowNumbers.map((rowNumber) => {
                            const rowColumns = selectedDetailGroup.columnIds
                              .filter((columnId: string) => getDetailBoardGroupColumnRow(selectedDetailGroup, columnId) === rowNumber)
                              .map((columnId: string) => availableGridColumns.find((column: any) => column.id === columnId))
                              .filter(Boolean);
                            const draggedDetailColumn = detailBoardWorkbenchDrag?.groupId === selectedDetailGroup.id
                              ? availableGridColumns.find((column: any) => column.id === detailBoardWorkbenchDrag.columnId) ?? null
                              : null;
                            const isRowDropTarget = detailBoardWorkbenchDrag?.groupId === selectedDetailGroup.id
                              && detailBoardWorkbenchDropTarget?.groupId === selectedDetailGroup.id
                              && detailBoardWorkbenchDropTarget?.row === rowNumber
                              && detailBoardWorkbenchDropTarget?.beforeId === null;

                            return (
                              <div key={`${selectedDetailGroup.id}-row-${rowNumber}`} className="space-y-1.5">
                                <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 dark:text-slate-500">
                                  <span>第 {rowNumber} 行</span>
                                  <span className="h-px flex-1 bg-slate-200/80 dark:bg-slate-700/70" />
                                </div>
                                <DesignerWorkbenchDropLane
                                  dropId={getDetailBoardRowDropId(selectedDetailGroup.id, rowNumber)}
                                  data={{
                                    type: 'detail-board-row',
                                    groupId: selectedDetailGroup.id,
                                    row: rowNumber,
                                  } satisfies DetailBoardWorkbenchDragData}
                                  className={cn(
                                    'scrollbar-none flex min-h-[48px] items-center overflow-visible rounded-lg border border-transparent bg-transparent px-0.5 py-1 transition-colors',
                                    isRowDropTarget && designerWorkbenchRowActiveClass,
                                    rowColumns.length === 0 && designerWorkbenchRowEmptyClass,
                                  )}
                                >
                                  <div className="flex min-w-full items-center">
                                    <div className="flex min-w-0 flex-1 items-center gap-1">
                                      {rowColumns.length > 0 ? rowColumns.map((column: any, columnIndex: number) => {
                                        const normalizedColumn = normalizeColumn(column);
                                        const fieldWidth = Math.round(
                                          Number(selectedDetailGroup.columnWidths?.[column.id]) > 0
                                            ? Number(selectedDetailGroup.columnWidths[column.id])
                                            : DETAIL_BOARD_FIELD_DEFAULT_WIDTH,
                                        );
                                        const labelWidth = Math.max(54, Math.min(82, normalizedColumn.name.length * 12));
                                        const isInsertTarget = detailBoardWorkbenchDrag?.groupId === selectedDetailGroup.id
                                          && detailBoardWorkbenchDrag.columnId !== column.id
                                          && detailBoardWorkbenchDropTarget?.groupId === selectedDetailGroup.id
                                          && detailBoardWorkbenchDropTarget?.row === rowNumber
                                          && detailBoardWorkbenchDropTarget?.beforeId === column.id;

                                        return (
                                          <DesignerWorkbenchDraggableItem
                                            key={column.id}
                                            dragId={getDetailBoardDragItemId(selectedDetailGroup.id, column.id)}
                                            dropId={getDetailBoardDropItemId(selectedDetailGroup.id, column.id)}
                                            data={{
                                              type: 'detail-board-item',
                                              fieldId: column.id,
                                              groupId: selectedDetailGroup.id,
                                              row: rowNumber,
                                            } satisfies DetailBoardWorkbenchDragData}
                                            itemAttributes={{
                                              'data-detail-field-item': 'true',
                                            }}
                                            onKeyDown={(event) => {
                                              if (event.key === 'Delete' || event.key === 'Backspace') {
                                                event.preventDefault();
                                                removeDetailGroupColumn(selectedDetailGroup.id, column.id);
                                              }
                                            }}
                                            style={{ width: fieldWidth, minWidth: fieldWidth }}
                                            className={cn(
                                              getCompactWorkbenchItemClass({
                                                dragging: detailBoardWorkbenchDrag?.groupId === selectedDetailGroup.id && detailBoardWorkbenchDrag.columnId === column.id,
                                                insertTarget: isInsertTarget,
                                              }),
                                              'h-[48px] shrink-0 gap-1.5 pr-6',
                                            )}
                                          >
                                            {isInsertTarget ? (
                                              <span className="pointer-events-none absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-[color:var(--workspace-accent)]" />
                                            ) : null}
                                            <div
                                              className={`shrink-0 text-left text-[11px] font-medium ${normalizedColumn.required ? 'text-[color:var(--workspace-accent-strong)]' : 'text-slate-600 dark:text-slate-200'}`}
                                              style={{ width: labelWidth }}
                                              title={normalizedColumn.name}
                                            >
                                              <span className="block truncate">{normalizedColumn.name}</span>
                                            </div>
                                            <div className="min-w-0 flex-1 pr-7">
                                              {renderFieldPreview(normalizedColumn, columnIndex, 'filter')}
                                            </div>
                                            <button
                                              type="button"
                                              onClick={(event) => {
                                                event.preventDefault();
                                                event.stopPropagation();
                                                removeDetailGroupColumn(selectedDetailGroup.id, column.id);
                                              }}
                                              className="absolute right-3 top-1/2 inline-flex size-5 -translate-y-1/2 items-center justify-center rounded-full text-slate-300 opacity-0 transition-all hover:bg-rose-50 hover:text-rose-500 group-hover:opacity-100 dark:text-slate-600 dark:hover:bg-rose-500/10"
                                              title="移出当前分组"
                                            >
                                              <span className="material-symbols-outlined text-[14px]">close</span>
                                            </button>
                                            <div
                                              data-drag-resize-handle="true"
                                              className="absolute bottom-1.5 right-0.5 top-1.5 flex w-2 cursor-col-resize items-center justify-center opacity-0 transition-opacity group-hover:opacity-100"
                                              onMouseDown={(event) => startDetailBoardFieldResize(event, selectedDetailGroup.id, column.id, normalizedColumn.name)}
                                              onDoubleClick={(event) => resetDetailBoardFieldWidth(event, selectedDetailGroup.id, column.id)}
                                              title="拖动调整宽度，双击恢复自动排布"
                                            >
                                              <span className="h-5 w-px rounded-full bg-slate-300/90 transition-colors group-hover:bg-[color:var(--workspace-accent)] dark:bg-slate-600" />
                                            </div>
                                          </DesignerWorkbenchDraggableItem>
                                        );
                                      }) : isRowDropTarget && draggedDetailColumn ? (
                                        <div
                                          className={cn(
                                            getCompactWorkbenchItemClass({ selected: true }),
                                            'pointer-events-none h-[48px] shrink-0 gap-1.5 rounded-md border-dashed border-primary/35 bg-background/85 pr-6 shadow-sm',
                                          )}
                                          style={{
                                            width: Math.round(
                                              Number(selectedDetailGroup.columnWidths?.[draggedDetailColumn.id]) > 0
                                                ? Number(selectedDetailGroup.columnWidths[draggedDetailColumn.id])
                                                : DETAIL_BOARD_FIELD_DEFAULT_WIDTH,
                                            ),
                                            minWidth: Math.round(
                                              Number(selectedDetailGroup.columnWidths?.[draggedDetailColumn.id]) > 0
                                                ? Number(selectedDetailGroup.columnWidths[draggedDetailColumn.id])
                                                : DETAIL_BOARD_FIELD_DEFAULT_WIDTH,
                                            ),
                                          }}
                                        >
                                          <div
                                            className={`shrink-0 text-left text-[11px] font-medium ${normalizeColumn(draggedDetailColumn).required ? 'text-[color:var(--workspace-accent-strong)]' : 'text-foreground'}`}
                                            style={{ width: Math.max(54, Math.min(82, normalizeColumn(draggedDetailColumn).name.length * 12)) }}
                                            title={normalizeColumn(draggedDetailColumn).name}
                                          >
                                            <span className="block truncate">{normalizeColumn(draggedDetailColumn).name}</span>
                                          </div>
                                          <div className="min-w-0 flex-1 pr-7">
                                            {renderFieldPreview(normalizeColumn(draggedDetailColumn), 0, 'filter')}
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                                          拖入字段到本行，或从右侧“可加入字段”中追加
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </DesignerWorkbenchDropLane>
                              </div>
                            );
                          })}
                        </div>
                      </DndContext>
                    </section>

                    <section className="rounded-[20px] border border-slate-200/75 bg-white/94 px-4 py-4 shadow-[0_16px_28px_-24px_rgba(15,23,42,0.16)] dark:border-slate-700 dark:bg-slate-900/55">
                      <div className="mb-3 flex items-center gap-2 text-[12px] font-bold text-slate-700 dark:text-slate-100">
                        <span className="material-symbols-outlined text-[16px] text-[color:var(--workspace-accent)]">playlist_add</span>
                        可加入字段
                      </div>
                      {availableUnassignedDetailColumns.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {availableUnassignedDetailColumns.map((column: any) => {
                            const normalizedColumn = normalizeColumn(column);
                            return (
                              <button
                                key={`${selectedDetailGroup.id}-available-${column.id}`}
                                type="button"
                                onClick={() => mergeDetailGroupColumns(selectedDetailGroup.id, [column.id])}
                                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/90 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition-colors hover:border-[color:var(--workspace-accent-border)] hover:bg-[color:var(--workspace-accent-soft)] hover:text-[color:var(--workspace-accent-strong)] dark:border-slate-700 dark:bg-slate-950/76 dark:text-slate-200"
                              >
                                <span className="material-symbols-outlined text-[14px]">add</span>
                                {normalizedColumn.name}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-[11px] font-medium leading-5 text-slate-400 dark:text-slate-500">
                          当前主表字段已经全部分配到分组里了。
                        </div>
                      )}
                    </section>

                    <section className="rounded-[20px] border border-slate-200/75 bg-white/94 px-4 py-4 shadow-[0_16px_28px_-24px_rgba(15,23,42,0.16)] dark:border-slate-700 dark:bg-slate-900/55">
                      <div className="mb-3 flex items-center gap-2 text-[12px] font-bold text-slate-700 dark:text-slate-100">
                        <span className="material-symbols-outlined text-[16px] text-[color:var(--workspace-accent)]">frame_inspect</span>
                        布局操作
                      </div>
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={applySuggestedDetailLayout}
                          className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-[14px] border border-[color:var(--workspace-accent-border)] bg-[color:var(--workspace-accent-soft)] px-3 text-[12px] font-bold text-[color:var(--workspace-accent-strong)] transition-colors hover:bg-[color:var(--workspace-accent-tint)]"
                        >
                          <span className="material-symbols-outlined text-[15px]">auto_fix_high</span>
                          推荐布局
                        </button>
                        <button
                          type="button"
                          onClick={() => openDetailBoardPreview(1)}
                          className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-[14px] border border-slate-200/90 bg-white px-3 text-[12px] font-bold text-slate-600 transition-colors hover:border-[color:var(--workspace-accent-border)] hover:text-[color:var(--workspace-accent-strong)] dark:border-slate-700 dark:bg-slate-950/72 dark:text-slate-200"
                        >
                          <span className="material-symbols-outlined text-[15px]">preview</span>
                          预览详情布局
                        </button>
                      </div>
                    </section>
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        );
      };
      const renderArchiveMainLayoutSummarySection = () => {
        const groupCount = currentDetailBoard.groups.length;
        const assignedFieldCount = currentDetailBoard.groups.reduce((sum: number, group: any) => sum + (group.columnIds?.length ?? 0), 0);
        const unassignedFieldCount = Math.max(0, availableGridColumns.length - assignedFieldCount);

        return (
          <div className="space-y-4">
            <section className={compactCardClass}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className={sectionTitleClass}>
                    <span className="material-symbols-outlined text-[18px] text-[color:var(--workspace-accent)]">dashboard_customize</span>
                    <h4>主表分组布局</h4>
                  </div>
                  <p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">
                    右侧只展示当前布局摘要，真正的分组、行数和字段排布统一在弹出式布局编辑器里处理。
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={openArchiveLayoutEditor}
                    className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[color:var(--workspace-accent)] px-3.5 text-[12px] font-semibold text-white transition-colors hover:bg-[color:var(--workspace-accent-strong)]"
                  >
                    <span className="material-symbols-outlined text-[15px]">open_in_new</span>
                    打开布局编辑器
                  </button>
                  <button
                    type="button"
                    onClick={() => openDetailBoardPreview(1, currentDetailBoard.sortColumnId)}
                    disabled={groupCount === 0}
                    className={`inline-flex h-9 items-center gap-1.5 rounded-md border px-3.5 text-[12px] font-semibold transition-colors ${
                      groupCount > 0
                        ? 'border-slate-200 bg-white text-slate-600 hover:border-[color:var(--workspace-accent-border)] hover:text-[color:var(--workspace-accent-strong)] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200'
                        : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-600'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[15px]">preview</span>
                    预览布局
                  </button>
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className={compactInfoCardClass}>
                  <div className="text-[11px] font-bold tracking-[0.08em] text-slate-400">分组数量</div>
                  <div className="mt-1 text-[13px] font-bold text-slate-700 dark:text-slate-100">{groupCount} 组</div>
                </div>
                <div className={compactInfoCardClass}>
                  <div className="text-[11px] font-bold tracking-[0.08em] text-slate-400">已排布字段</div>
                  <div className="mt-1 text-[13px] font-bold text-slate-700 dark:text-slate-100">{assignedFieldCount} 项</div>
                </div>
                <div className={compactInfoCardClass}>
                  <div className="text-[11px] font-bold tracking-[0.08em] text-slate-400">待排布字段</div>
                  <div className="mt-1 text-[13px] font-bold text-slate-700 dark:text-slate-100">{unassignedFieldCount} 项</div>
                </div>
              </div>
            </section>

            <section className={compactCardClass}>
              <div className={sectionTitleClass}>
                <span className="material-symbols-outlined text-[18px] text-[color:var(--workspace-accent)]">tab_group</span>
                <h4>分组摘要</h4>
              </div>
              {groupCount > 0 ? (
                <div className="grid gap-2.5">
                  {currentDetailBoard.groups.map((group: any, groupIndex: number) => (
                    <div
                      key={group.id}
                      className="flex items-center justify-between gap-3 rounded-md border border-slate-200/80 bg-slate-50/70 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900/55"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-[12px] font-semibold text-slate-700 dark:text-slate-100">
                          {group.name || `分组 ${groupIndex + 1}`}
                        </div>
                        <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                          {(group.columnIds?.length ?? 0)} 项字段 · {getDetailBoardGroupRows(group)} 行
                        </div>
                      </div>
                      <span className="inline-flex items-center rounded-md border border-slate-200/80 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                        {groupIndex + 1}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-slate-200/80 bg-slate-50/60 px-4 py-8 text-center text-[12px] text-slate-500 dark:border-slate-800 dark:bg-slate-900/35 dark:text-slate-400">
                  还没有分组，点击上方“打开布局编辑器”开始创建。
                </div>
              )}
            </section>
          </div>
        );
      };
      const selectedPopupMenuItem = isGridDecorationManagerAvailable
        ? contextMenuItems.find((item: any) => item.id === activeContextMenuSelectionId) ?? contextMenuItems[0] ?? null
        : null;
      const selectedColorRule = isGridDecorationManagerAvailable
        ? colorRules.find((rule: any) => rule.id === activeColorRuleSelectionId) ?? colorRules[0] ?? null
        : null;
      const updateGridColumns = (updater: React.SetStateAction<any[]>) => {
        if (selectedColumnContext.scope === 'left-grid') {
          setLeftTableColumns((prev) => (typeof updater === 'function' ? updater(prev) : updater));
          return;
        }

        if (selectedColumnContext.scope === 'main-grid') {
          if (businessType === 'table') {
            const metaIdSet = new Set(billMetaFields.map((field) => field.id));
            const currentFields = [...billMetaFields, ...mainTableColumns];
            const nextFields = typeof updater === 'function' ? updater(currentFields) : updater;

            setBillMetaFields(nextFields.filter((field) => metaIdSet.has(field.id)));
            setMainTableColumns(nextFields.filter((field) => !metaIdSet.has(field.id)));
            return;
          }

          setMainTableColumns((prev) => (typeof updater === 'function' ? updater(prev) : updater));
          return;
        }

        if (businessType === 'table') {
          setBillDetailColumns((prev) => (typeof updater === 'function' ? updater(prev) : updater));
          return;
        }

        setDetailTableColumns((prev) => ({
          ...prev,
          [activeTab]: typeof updater === 'function' ? updater(prev[activeTab] || []) : updater,
        }));
      };
      const translatableColumns = availableGridColumns.filter((column: any) => {
        const normalizedColumn = normalizeColumn(column);
        return /[\u4e00-\u9fff]/.test(normalizedColumn.name || '') && !/[A-Za-z]/.test(normalizedColumn.sourceField || '');
      });
      const generateGridSqlDraft = async () => {
        setIsGeneratingSqlDraft(true);

        try {
          const response = await requestSqlDraft({
            title: selectedColumnContext.title,
            description: currentGridConfig.sqlPrompt || '',
            tableType: currentGridConfig.tableType || '普通表格',
            columns: availableGridColumns.map((column: any) => {
              const normalizedColumn = normalizeColumn(column);
              return {
                id: normalizedColumn.id,
                name: normalizedColumn.name,
                type: normalizedColumn.type,
                identifier: normalizedColumn.sourceField || '',
              };
            }),
          });

          updateGridConfig({
            mainSql: response.draft.mainSql,
            defaultQuery: response.draft.defaultQuery,
          });
          showToast('已通过 MiniMax 生成主 SQL 草案');
        } catch (error) {
          showToast(error instanceof Error ? error.message : 'MiniMax 生成主 SQL 失败');
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
                name: normalizedColumn.name,
                identifier: normalizedColumn.sourceField || '',
              };
            }),
          );
          const identifierMap = new Map(response.items.map((item) => [item.id, item.identifier]));

          updateGridColumns((prev) => prev.map((column) => (
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
      const syncDetailColumnsFromConfiguredModule = () => {
        if (!isDocumentDetailGrid) return;
        if (!detailSourceModuleCode) {
          showToast('请先填写模块编号');
          return;
        }
        if (!findDetailSourceModuleCandidate(detailSourceModuleCode)) {
          showToast('没有匹配到可继承的模块主表配置');
          return;
        }
        applyDetailModuleInheritanceById(activeTab, detailSourceModuleCode);
      };
      const renderSqlConfigSection = () => (
        <section className={compactCardClass}>
          <div className={sectionTitleClass}>
            <span className="material-symbols-outlined text-[18px] text-[color:var(--workspace-accent)]">frame_source</span>
            <h4>{isDocumentDetailGrid ? '明细 SQL 配置' : '主 SQL 配置'}</h4>
          </div>
          <div className="grid gap-4">
            <div>
              <label className={mutedLabelClass}>生成描述</label>
              <textarea
                rows={3}
                value={currentGridConfig.sqlPrompt || ''}
                onChange={(e) => updateGridConfig({ sqlPrompt: e.target.value })}
                placeholder="例如：生成一个物料主档列表，支持名称、规格、单位和单价查询。"
                className={textareaClass}
              />
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <label className={`${mutedLabelClass} mb-0`}>主 SQL</label>
                <button
                  type="button"
                  onClick={generateGridSqlDraft}
                  disabled={isGeneratingSqlDraft}
                  className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[12px] px-3 text-[11px] font-bold transition-colors ${
                    isGeneratingSqlDraft
                      ? 'cursor-wait bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                      : 'bg-[color:var(--workspace-accent)] text-white shadow-[0_16px_28px_-24px_var(--workspace-accent-shadow)] hover:bg-[color:var(--workspace-accent-strong)]'
                  }`}
                >
                  <span className={`material-symbols-outlined text-[14px] ${isGeneratingSqlDraft ? 'animate-spin' : ''}`}>
                    {isGeneratingSqlDraft ? 'progress_activity' : 'auto_awesome'}
                  </span>
                  AI 生成
                </button>
              </div>
              <textarea
                rows={6}
                value={currentGridConfig.mainSql || ''}
                onChange={(e) => updateGridConfig({ mainSql: e.target.value })}
                placeholder="SELECT ... FROM ..."
                className={textareaClass}
              />
            </div>
            <div>
              <label className={mutedLabelClass}>{isDocumentDetailGrid ? '关联条件' : '默认查询'}</label>
              <input
                type="text"
                value={isDocumentDetailGrid ? (currentGridConfig.sourceCondition || currentGridConfig.defaultQuery || '') : (currentGridConfig.defaultQuery || '')}
                onChange={(e) => updateGridConfig(
                  isDocumentDetailGrid
                    ? { defaultQuery: e.target.value, sourceCondition: e.target.value }
                    : { defaultQuery: e.target.value },
                )}
                placeholder={isDocumentDetailGrid ? '例如：archive_id = ${id}' : '例如：status = 1'}
                className={fieldClass}
              />
            </div>
          </div>
        </section>
      );
      const renderIdentifierTranslationSection = () => (
        <section className={quietInspectorCardClass}>
          <div className="flex items-start justify-between gap-3">
            <div className={sectionTitleClass}>
              <span className="material-symbols-outlined text-[18px] text-[color:var(--workspace-accent)]">translate</span>
              <div className="min-w-0">
                <h4>字段标识</h4>
                <p className="mt-1 text-[11px] font-normal text-slate-500 dark:text-slate-300">
                  批量把字段显示名同步到标识字段。
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={translateGridIdentifiers}
              disabled={isTranslatingIdentifiers}
              className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-3 text-[11px] font-medium transition-colors ${
                isTranslatingIdentifiers
                  ? 'cursor-wait bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                  : quietDocumentInspectorActionClass
              }`}
            >
              <span className={`material-symbols-outlined text-[14px] ${isTranslatingIdentifiers ? 'animate-spin' : ''}`}>
                {isTranslatingIdentifiers ? 'progress_activity' : 'translate'}
              </span>
              一键翻译
            </button>
          </div>
          <div className={quietDocumentInspectorSummaryClass}>
            当前列数 {availableGridColumns.length} 个，待翻译 {translatableColumns.length} 个。
          </div>
        </section>
      );
      const renderDetailSourceSection = () => {
        if (!isDocumentDetailGrid) return null;
        const detailSourceStatusText = detailSourceModuleCode
          ? `继承 ${detailSourceModuleCode}`
          : (currentGridConfig.mainSql ? '自定义 SQL' : '未配置');
        const sourceBadgeText = detailSourceModuleCode ? '模块继承' : 'SQL 构列';

        return (
          <section className={`${quietInspectorCardClass} space-y-3`}>
            <div className={sectionTitleClass}>
              <span className="material-symbols-outlined text-[18px] text-[color:var(--workspace-accent)]">dataset_linked</span>
              <div className="min-w-0">
                <h4>表格数据来源</h4>
                <p className="mt-1 text-[11px] font-normal text-slate-500 dark:text-slate-300">
                  {sourceBadgeText} · {detailSourceStatusText}
                </p>
              </div>
            </div>
            <div className={quietDocumentInspectorSummaryClass}>
              模块 {matchedDetailModuleCandidate?.moduleName || matchedDetailModuleCandidate?.moduleCode || '未指定'}，
              主表 {matchedDetailModuleCandidate?.tableName || '按 SQL 构列'}，当前字段 {availableGridColumns.length} 个。
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className={mutedLabelClass}>模块编号</label>
                <input
                  type="text"
                  value={detailSourceModuleCode}
                  onChange={(e) => updateDetailSourceConfig({ sourceModuleCode: e.target.value })}
                  onBlur={(e) => updateDetailSourceConfig({ sourceModuleCode: e.target.value })}
                  placeholder="例如：FM-CO-001"
                  className={fieldClass}
                />
              </div>
              <div>
                <label className={mutedLabelClass}>关联模块字段</label>
                <input
                  type="text"
                  value={currentDetailTabConfig?.relatedModuleField ?? ''}
                  onChange={(e) => updateActiveDetailTabConfig({ relatedModuleField: e.target.value })}
                  placeholder="例如：archive_id"
                  className={fieldClass}
                />
              </div>
              <div>
                <label className={mutedLabelClass}>关联值</label>
                <input
                  type="text"
                  value={currentDetailTabConfig?.relatedValue ?? ''}
                  onChange={(e) => updateActiveDetailTabConfig({ relatedValue: e.target.value })}
                  placeholder="例如：${id}"
                  className={fieldClass}
                />
              </div>
              <div>
                <label className={mutedLabelClass}>关联条件</label>
                <input
                  type="text"
                  value={currentGridConfig.sourceCondition || currentGridConfig.defaultQuery || currentDetailTabConfig?.relatedCondition || ''}
                  onChange={(e) => {
                    updateGridConfig({
                      sourceCondition: e.target.value,
                      defaultQuery: e.target.value,
                    });
                    updateActiveDetailTabConfig({ relatedCondition: e.target.value });
                  }}
                  placeholder="例如：archive_id = ${id}"
                  className={fieldClass}
                />
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className={mutedLabelClass}>生成描述</label>
                <textarea
                  rows={3}
                  value={currentGridConfig.sqlPrompt || ''}
                  onChange={(e) => updateGridConfig({ sqlPrompt: e.target.value })}
                  placeholder="例如：生成一个附件列表，支持附件名称、上传人、上传时间查询。"
                  className={textareaClass}
                />
              </div>
              <div className={quietDocumentInspectorSummaryClass}>
                明细 SQL 会直接决定字段构列；需要继承主表时先填写模块编号。
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className={`${mutedLabelClass} mb-0`}>明细 SQL</label>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={generateGridSqlDraft}
                    disabled={isGeneratingSqlDraft}
                    className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[11px] font-medium transition-colors ${
                      isGeneratingSqlDraft
                        ? 'cursor-wait bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                        : quietDocumentInspectorActionClass
                    }`}
                  >
                    <span className={`material-symbols-outlined text-[14px] ${isGeneratingSqlDraft ? 'animate-spin' : ''}`}>
                      {isGeneratingSqlDraft ? 'progress_activity' : 'auto_awesome'}
                    </span>
                    AI 生成
                  </button>
                  <button
                    type="button"
                    onClick={syncDetailColumnsFromConfiguredModule}
                    disabled={!detailSourceModuleCode}
                    className={detailSourceModuleCode ? quietDocumentInspectorPrimaryActionClass : 'inline-flex h-8 items-center gap-1.5 rounded-md bg-slate-100 px-3 text-[11px] font-medium text-slate-400 dark:bg-slate-800 dark:text-slate-500'}
                  >
                    <span className="material-symbols-outlined text-[14px]">table_rows</span>
                    继承主表配置
                  </button>
                  <button
                    type="button"
                    onClick={() => syncDetailColumnsFromSqlById(activeTab, currentGridConfig.mainSql || '')}
                    className={quietDocumentInspectorActionClass}
                  >
                    <span className="material-symbols-outlined text-[14px]">schema</span>
                    按 SQL 构列
                  </button>
                </div>
              </div>
              <textarea
                rows={5}
                value={currentGridConfig.mainSql || ''}
                onChange={(e) => updateGridConfig({ mainSql: e.target.value })}
                onBlur={(e) => syncDetailColumnsFromSqlById(activeTab, e.target.value, { notify: false })}
                placeholder="SELECT ... FROM ..."
                className={textareaClass}
              />
            </div>
            {detailSourceModuleCandidates.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {detailSourceModuleCandidates.map((candidate) => {
                  const active = candidate.moduleCode === detailSourceModuleCode;
                  return (
                    <button
                      key={candidate.moduleCode}
                      type="button"
                      onClick={() => updateDetailSourceConfig({ sourceModuleCode: candidate.moduleCode })}
                      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[10px] font-medium transition-colors ${
                        active
                          ? 'border-[color:var(--workspace-accent-border)] bg-[color:var(--workspace-accent-soft)] text-[color:var(--workspace-accent-strong)]'
                          : 'border-slate-200/80 bg-white text-slate-500 hover:border-[color:var(--workspace-accent-border)] hover:text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200'
                      }`}
                    >
                      {candidate.moduleCode}
                      {candidate.isCurrent ? <span className="text-[10px] text-emerald-600 dark:text-emerald-300">当前</span> : null}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </section>
        );
      };
      const renderDocumentTableMappingSection = () => (
        <section className={`${quietInspectorCardClass} space-y-3`}>
          <div className={sectionTitleClass}>
            <span className="material-symbols-outlined text-[17px] text-[color:var(--workspace-accent)]">schema</span>
            <h4>落表映射</h4>
          </div>
          <div className={quietDocumentInspectorSummaryClass}>
            主配置 `p_systemdlltab`，条件 `p_systembillsourcecond`，右键 {contextMenuItems.length} 项，颜色 {colorRules.length} 条。
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setInspectorPanelTab('contextmenu')}
              className={quietDocumentInspectorActionClass}
            >
              右键菜单 {contextMenuItems.length}
            </button>
            <button
              type="button"
              onClick={() => setInspectorPanelTab('color')}
              className={quietDocumentInspectorActionClass}
            >
              颜色规则 {colorRules.length}
            </button>
          </div>
        </section>
      );
      const renderLeftGridMappingSection = () => (
        <section className={`${compactCardClass} space-y-4`}>
          <div className="flex items-center justify-between gap-3">
            <div className={sectionTitleClass}>
              <span className="material-symbols-outlined text-[17px] text-[color:var(--workspace-accent)]">account_tree</span>
              <h4>左表映射</h4>
            </div>
            {treeRelationColumn && (
              <button
                type="button"
                onClick={() => {
                  setSelectedMainForDelete([treeRelationColumn.id]);
                  activateColumnSelection('main', treeRelationColumn.id);
                  setInspectorPanelTab('common');
                }}
                className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--workspace-accent-border)] bg-[color:var(--workspace-accent-soft)] px-3 py-1.5 text-[11px] font-bold text-[color:var(--workspace-accent-strong)] transition-colors hover:bg-[color:var(--workspace-accent-tint)]"
              >
                <span className="material-symbols-outlined text-[14px]">ads_click</span>
                定位所属字段
              </button>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className={compactInfoCardClass}>
              <div className="text-[11px] font-bold tracking-[0.08em] text-slate-400">所属字段</div>
              <div className="mt-1 text-[13px] font-bold text-slate-700 dark:text-slate-100">{treeOwnerField?.name || '未配置树形字段'}</div>
              <div className="mt-1 break-all font-mono text-[11px] text-slate-400">{treeOwnerFieldKey || '未设置 fieldkey'}</div>
            </div>
            <div className={compactInfoCardClass}>
              <div className="text-[11px] font-bold tracking-[0.08em] text-slate-400">关联条件</div>
              <div className="mt-1 text-[13px] font-bold text-slate-700 dark:text-slate-100">{leftFilterFields.length} 条</div>
                        <div className="mt-1 break-all font-mono text-[11px] text-slate-400">sourceid = {documentConditionOwnerSourceId || '未设置'}</div>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className={compactInfoCardClass}>
              <div className="text-[11px] font-bold tracking-[0.08em] text-slate-400">左侧列</div>
              <div className="mt-1 text-[13px] font-bold text-slate-700 dark:text-slate-100">p_systemwordbookgrid</div>
            </div>
            <div className={compactInfoCardClass}>
              <div className="text-[11px] font-bold tracking-[0.08em] text-slate-400">左侧条件</div>
              <div className="mt-1 text-[13px] font-bold text-slate-700 dark:text-slate-100">p_systembillsourcecond</div>
            </div>
            <button
              type="button"
              onClick={() => setInspectorPanelTab('contextmenu')}
              className="flex items-center justify-between rounded-lg border border-[color:var(--workspace-accent-border)] bg-[color:var(--workspace-accent-soft)] px-3 py-2 text-left text-[12px] font-semibold text-[color:var(--workspace-accent-strong)] transition-colors hover:bg-[color:var(--workspace-accent-tint)]"
            >
              <span>左边右键</span>
              <span className="rounded-md bg-white/90 px-2 py-0.5 text-[10px] font-black text-[color:var(--workspace-accent-strong)]">
                {contextMenuItems.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setInspectorPanelTab('color')}
              className="flex items-center justify-between rounded-lg border border-[color:var(--workspace-accent-border)] bg-[color:var(--workspace-accent-soft)] px-3 py-2 text-left text-[12px] font-semibold text-[color:var(--workspace-accent-strong)] transition-colors hover:bg-[color:var(--workspace-accent-tint)]"
            >
              <span>左边颜色</span>
              <span className="rounded-md bg-white/90 px-2 py-0.5 text-[10px] font-black text-[color:var(--workspace-accent-strong)]">
                {colorRules.length}
              </span>
            </button>
          </div>
        </section>
      );
      const renderGridConfigSummarySection = (title: string) => (
        <section className={quietInspectorCardClass}>
          <div className={sectionTitleClass}>
            <span className="material-symbols-outlined text-[18px] text-[color:var(--workspace-accent)]">
              {detailGridFillTypeMeta?.icon || 'table_chart'}
            </span>
            <h4>{title}</h4>
          </div>
          <div className="grid gap-4">
            <div>
              {detailGridFillTypeMeta?.value !== '图表' ? (
                <div>
                  <label className={mutedLabelClass}>表格类型</label>
                  <select
                    value={currentGridConfig.tableType}
                    onChange={(e) => updateGridConfig({ tableType: e.target.value })}
                    className={fieldClass}
                  >
                    {TABLE_TYPE_OPTIONS.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
                  <div>
                    <label className={mutedLabelClass}>图表类型</label>
                    <div className="rounded-md border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-[13px] font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-100">
                      {DETAIL_CHART_TYPE_OPTIONS.find((option) => option.value === String(currentDetailChartConfig.chartType))?.label ?? '未设置'}
                    </div>
                  </div>
                  <div>
                    <label className={mutedLabelClass}>图表标题</label>
                    <div className="rounded-md border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-[13px] font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-100">
                      {currentDetailChartConfig.chartTitle || selectedColumnContext.title}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className={quietDocumentInspectorSummaryClass}>
              {detailGridFillTypeMeta?.value === '图表' ? '当前填充' : '当前表格'} {isDocumentDetailGrid ? currentDetailTabName : selectedColumnContext.title}
              ，显示字段 {availableGridColumns.length} 个，右键菜单 {contextMenuItems.length} 项，颜色规则 {enabledColorRuleCount} 条生效。
              {detailGridFillTypeMeta?.value === '图表'
                ? ` X轴 ${currentDetailChartConfig.XLabelField || '未设置'}，Y轴 ${currentDetailChartConfig.YValueField || '未设置'}。`
                : ''}
            </div>
          </div>
        </section>
      );
      const renderDetailChartTableMappingSection = () => {
        const fieldDatalistId = `detail-chart-field-options-${selectedColumnContext.scope}-${activeTab}`;
        const primaryChartColor = /^#(?:[0-9a-f]{3}){1,2}$/i.test(currentDetailChartConfig.chartColor)
          ? currentDetailChartConfig.chartColor
          : '#2563eb';
        const secondaryChartColor = /^#(?:[0-9a-f]{3}){1,2}$/i.test(currentDetailChartConfig.chartColorDf)
          ? currentDetailChartConfig.chartColorDf
          : '#60a5fa';
        const primaryToggleFields = [
          { key: 'chart3D', label: '3D 模式' },
          { key: 'YAxisShared', label: 'Y轴共享' },
          { key: 'gridLineVisible', label: '显示网格线' },
          { key: 'IsAbsolutely', label: '绝对值轴' },
        ] as const;
        const visibilityToggleFields = [
          { key: 'isVisible', label: '禁用图表' },
          { key: 'valueVisible', label: '禁显数字' },
          { key: 'markVisible', label: '标签禁显' },
          { key: 'legendVisible', label: '标题禁显' },
          { key: 'labelvisible', label: '禁显标签' },
          { key: 'circlejagge', label: '锯齿圆' },
          { key: 'circlehollow', label: '空心圆' },
        ] as const;
        const renderToggleRow = (key: keyof typeof currentDetailChartConfig, label: string) => (
          <label
            key={String(key)}
            className="flex cursor-pointer items-center justify-between gap-3 rounded-[14px] border border-slate-200/80 bg-white/92 px-3.5 py-2.5 text-[12px] font-semibold text-slate-600 transition-colors hover:border-[color:var(--workspace-accent-border)] dark:border-slate-700 dark:bg-slate-950/72 dark:text-slate-200"
          >
            <span>{label}</span>
            <input
              type="checkbox"
              checked={Boolean(currentDetailChartConfig[key])}
              onChange={(event) => updateDetailChartConfig({ [key]: event.target.checked })}
              className="size-4"
              style={{ accentColor: 'var(--workspace-accent)' }}
            />
          </label>
        );

        return (
          <section className={`${compactCardClass} space-y-4`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className={sectionTitleClass}>
                <span className="material-symbols-outlined text-[18px] text-[color:var(--workspace-accent)]">bar_chart</span>
                <h4>图表视图配置</h4>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full border border-[color:var(--workspace-accent-border)] bg-[color:var(--workspace-accent-soft)] px-3 py-1 text-[11px] font-bold text-[color:var(--workspace-accent-strong)]">
                  p_systemdlltabchart
                </span>
              </div>
            </div>

            <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(140px,1fr))]">
              <div className={compactInfoCardClass}>
                <div className="text-[11px] font-bold tracking-[0.08em] text-slate-400">当前明细</div>
                <div className="mt-1 text-[13px] font-bold text-slate-700 dark:text-slate-100">{currentDetailTabName}</div>
              </div>
              <div className={compactInfoCardClass}>
                <div className="text-[11px] font-bold tracking-[0.08em] text-slate-400">图表类型</div>
                <div className="mt-1 text-[13px] font-bold text-slate-700 dark:text-slate-100">
                  {DETAIL_CHART_TYPE_OPTIONS.find((option) => option.value === String(currentDetailChartConfig.chartType))?.label ?? '未设置'}
                </div>
              </div>
              <div className={compactInfoCardClass}>
                <div className="text-[11px] font-bold tracking-[0.08em] text-slate-400">可选字段</div>
                <div className="mt-1 text-[13px] font-bold text-slate-700 dark:text-slate-100">{detailChartFieldOptions.length} 个</div>
              </div>
            </div>

            <section className="rounded-[18px] border border-slate-200/80 bg-slate-50/55 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.78)] dark:border-slate-700 dark:bg-slate-900/42">
              <div className="mb-3 text-[12px] font-semibold tracking-[0.04em] text-slate-500 dark:text-slate-300">基础定义</div>
              <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(210px,1fr))]">
                <div>
                  <label className={mutedLabelClass}>图表标题</label>
                  <input
                    type="text"
                    value={currentDetailChartConfig.chartTitle}
                    onChange={(event) => updateDetailChartConfig({ chartTitle: event.target.value })}
                    placeholder="例如：运输单统计"
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label className={mutedLabelClass}>图表类型</label>
                  <select
                    value={String(currentDetailChartConfig.chartType)}
                    onChange={(event) => updateDetailChartConfig({ chartType: event.target.value })}
                    className={fieldClass}
                  >
                    {DETAIL_CHART_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-4 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(210px,1fr))]">
                <div>
                  <label className={mutedLabelClass}>图表颜色</label>
                  <div className="flex items-center gap-3 rounded-[16px] border border-slate-200/80 bg-white px-3 py-2.5 dark:border-slate-700 dark:bg-slate-950">
                    <input
                      type="color"
                      value={primaryChartColor}
                      onChange={(event) => updateDetailChartConfig({ chartColor: event.target.value })}
                      className="h-9 w-12 cursor-pointer rounded-lg border border-slate-200 bg-transparent p-0 dark:border-slate-700"
                    />
                    <input
                      type="text"
                      value={currentDetailChartConfig.chartColor}
                      onChange={(event) => updateDetailChartConfig({ chartColor: event.target.value })}
                      placeholder="#2563eb"
                      className="min-w-0 flex-1 bg-transparent text-[12px] font-medium text-slate-700 outline-none dark:text-slate-100"
                    />
                  </div>
                </div>
                <div>
                  <label className={mutedLabelClass}>备用颜色</label>
                  <div className="flex items-center gap-3 rounded-[16px] border border-slate-200/80 bg-white px-3 py-2.5 dark:border-slate-700 dark:bg-slate-950">
                    <input
                      type="color"
                      value={secondaryChartColor}
                      onChange={(event) => updateDetailChartConfig({ chartColorDf: event.target.value })}
                      className="h-9 w-12 cursor-pointer rounded-lg border border-slate-200 bg-transparent p-0 dark:border-slate-700"
                    />
                    <input
                      type="text"
                      value={currentDetailChartConfig.chartColorDf}
                      onChange={(event) => updateDetailChartConfig({ chartColorDf: event.target.value })}
                      placeholder="#60a5fa"
                      className="min-w-0 flex-1 bg-transparent text-[12px] font-medium text-slate-700 outline-none dark:text-slate-100"
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[18px] border border-slate-200/80 bg-slate-50/55 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.78)] dark:border-slate-700 dark:bg-slate-900/42">
              <div className="mb-3 text-[12px] font-semibold tracking-[0.04em] text-slate-500 dark:text-slate-300">轴字段</div>
              <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(210px,1fr))]">
                <div>
                  <label className={mutedLabelClass}>X轴字段</label>
                  <input
                    type="text"
                    list={fieldDatalistId}
                    value={currentDetailChartConfig.XLabelField}
                    onChange={(event) => updateDetailChartConfig({ XLabelField: event.target.value })}
                    placeholder="选择字段"
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label className={mutedLabelClass}>X轴标题</label>
                  <input
                    type="text"
                    value={currentDetailChartConfig.XAxisTitle}
                    onChange={(event) => updateDetailChartConfig({ XAxisTitle: event.target.value })}
                    placeholder="例如：日期"
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label className={mutedLabelClass}>Y轴字段</label>
                  <input
                    type="text"
                    list={fieldDatalistId}
                    value={currentDetailChartConfig.YValueField}
                    onChange={(event) => updateDetailChartConfig({ YValueField: event.target.value })}
                    placeholder="选择字段"
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label className={mutedLabelClass}>Y轴标题</label>
                  <input
                    type="text"
                    value={currentDetailChartConfig.YAxisTitle}
                    onChange={(event) => updateDetailChartConfig({ YAxisTitle: event.target.value })}
                    placeholder="例如：数量"
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label className={mutedLabelClass}>Y轴字段2</label>
                  <input
                    type="text"
                    list={fieldDatalistId}
                    value={currentDetailChartConfig.yvaluefield1}
                    onChange={(event) => updateDetailChartConfig({ yvaluefield1: event.target.value })}
                    placeholder="可选第二指标"
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label className={mutedLabelClass}>Y轴字段3</label>
                  <input
                    type="text"
                    list={fieldDatalistId}
                    value={currentDetailChartConfig.yvaluefield2}
                    onChange={(event) => updateDetailChartConfig({ yvaluefield2: event.target.value })}
                    placeholder="可选第三指标"
                    className={fieldClass}
                  />
                </div>
              </div>
            </section>

            <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
              <section className="rounded-[18px] border border-slate-200/80 bg-slate-50/55 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.78)] dark:border-slate-700 dark:bg-slate-900/42">
                <div className="mb-3 text-[12px] font-semibold tracking-[0.04em] text-slate-500 dark:text-slate-300">图形表现</div>
                <div className="space-y-2.5">
                  {primaryToggleFields.map((item) => renderToggleRow(item.key, item.label))}
                </div>
              </section>
              <section className="rounded-[18px] border border-slate-200/80 bg-slate-50/55 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.78)] dark:border-slate-700 dark:bg-slate-900/42">
                <div className="mb-3 text-[12px] font-semibold tracking-[0.04em] text-slate-500 dark:text-slate-300">显示控制</div>
                <div className="space-y-2.5">
                  {visibilityToggleFields.map((item) => renderToggleRow(item.key, item.label))}
                </div>
              </section>
            </div>

            <section className="rounded-[18px] border border-slate-200/80 bg-slate-50/55 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.78)] dark:border-slate-700 dark:bg-slate-900/42">
              <div className="mb-3 text-[12px] font-semibold tracking-[0.04em] text-slate-500 dark:text-slate-300">标签与刻度</div>
              <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(160px,1fr))]">
                <div>
                  <label className={mutedLabelClass}>序号</label>
                  <input
                    type="number"
                    value={currentDetailChartConfig.orderId}
                    onChange={(event) => updateDetailChartConfig({ orderId: Number(event.target.value || 0) })}
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label className={mutedLabelClass}>Y轴刻度</label>
                  <input
                    type="text"
                    value={currentDetailChartConfig.YScale}
                    onChange={(event) => updateDetailChartConfig({ YScale: event.target.value })}
                    placeholder="例如：100"
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label className={mutedLabelClass}>标签角度</label>
                  <input
                    type="number"
                    value={currentDetailChartConfig.labelangle}
                    onChange={(event) => updateDetailChartConfig({ labelangle: event.target.value })}
                    placeholder="0"
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label className={mutedLabelClass}>标签字号</label>
                  <input
                    type="number"
                    value={currentDetailChartConfig.labelsize}
                    onChange={(event) => updateDetailChartConfig({ labelsize: event.target.value })}
                    placeholder="12"
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label className={mutedLabelClass}>标签间隔</label>
                  <input
                    type="number"
                    value={currentDetailChartConfig.labelSpaced}
                    onChange={(event) => updateDetailChartConfig({ labelSpaced: event.target.value })}
                    placeholder="1"
                    className={fieldClass}
                  />
                </div>
              </div>
            </section>

            <datalist id={fieldDatalistId}>
              {detailChartFieldOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </datalist>
          </section>
        );
      };
      const managerSectionClass = 'rounded-md border border-slate-200/80 bg-white px-3 py-3 dark:border-slate-800 dark:bg-slate-950';
      const managerHeaderClass = 'mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-2.5 dark:border-slate-800';
      const managerTitleWrapClass = 'flex min-w-0 items-center gap-3';
      const managerTitleIconClass = 'inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-[color:var(--workspace-accent-border)] bg-[color:var(--workspace-accent-soft)] text-[color:var(--workspace-accent-strong)]';
      const managerActionButtonClass = 'inline-flex h-9 items-center gap-1 rounded-md border border-[color:var(--workspace-accent)] bg-[color:var(--workspace-accent)] px-3.5 text-[12px] font-semibold text-white shadow-sm transition-colors hover:bg-[color:var(--workspace-accent-strong)]';
      const managerListSurfaceClass = 'space-y-2 rounded-md border border-slate-200/80 bg-slate-50/70 p-2 dark:border-slate-800 dark:bg-slate-900/60';
      const managerDetailNameClass = 'inline-flex max-w-full items-center rounded-md border border-slate-200/80 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300';
      const managerHeaderToolsClass = 'ml-auto flex flex-wrap items-center justify-end gap-2';
      const managerMetricCardClass = 'min-w-[58px] rounded-md border border-slate-200/80 bg-slate-50 px-2.5 py-1.5 text-right dark:border-slate-800 dark:bg-slate-900';
      const renderPopupMenuManagerSection = () => {
        const popupMenuParamFields = Array.from({ length: 10 }, (_, index) => ({
          key: `dllpar${index + 1}` as const,
          label: `参数 ${index + 1}`,
        }));
        const detailCardClass = 'rounded-md border border-slate-200/80 bg-slate-50/55 p-3 dark:border-slate-800 dark:bg-slate-900/55';
        const detailSectionTitleClass = 'mb-4 flex items-center justify-between gap-3';
        const detailSectionLabelClass = 'text-[12px] font-semibold tracking-[0.04em] text-slate-500 dark:text-slate-300';
        const popupMenuDisplayName = selectedPopupMenuItem?.menuname || selectedPopupMenuItem?.label || '未命名菜单';
        const getPopupMenuIconName = (value: unknown) => {
          if (typeof value !== 'string') return 'right_click';
          const trimmed = value.trim();
          return trimmed && !/[/.:\\]/.test(trimmed) && !/\s/.test(trimmed) ? trimmed : 'right_click';
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
        const updateSelectedPopupMenuNumber = (key: string, value: string, fallback = 0) => {
          updateSelectedPopupMenuItem({ [key]: value === '' ? fallback : normalizePopupMenuNumber(value, fallback) });
        };
        const activePopupMenuParamField = popupMenuParamFields.find((field) => field.key === selectedPopupMenuParamKey) ?? popupMenuParamFields[0];
        const activePopupMenuParamValue = selectedPopupMenuItem ? String(selectedPopupMenuItem[activePopupMenuParamField.key] ?? '') : '';
        const configuredPopupMenuParamCount = selectedPopupMenuItem
          ? popupMenuParamFields.filter((field) => String(selectedPopupMenuItem[field.key] ?? '').trim().length > 0).length
          : 0;
        const getPopupMenuParamPreview = (value: string) => {
          const normalized = value.replace(/\s+/g, ' ').trim();
          return normalized.length > 22 ? `${normalized.slice(0, 22)}...` : normalized;
        };
        const popupMenuTabValue = isLeftGridConfig
          ? treeOwnerFieldKey
          : canManageDetailGridDecorations
            ? String(currentDetailTabConfig?.tabKey || activeTab)
            : String(currentMenuDraft.moduleCode ?? '');

        return (
        <div className="space-y-4">
          <section className={managerSectionClass}>
            <div className={managerHeaderClass}>
              <div className={managerTitleWrapClass}>
                <span className={managerTitleIconClass}>
                  <span className="material-symbols-outlined text-[18px]">list_alt</span>
                </span>
                <div>
                  <h4 className="text-[14px] font-bold text-slate-800 dark:text-slate-100">菜单列表</h4>
                </div>
              </div>
              <div className="flex w-full items-center justify-between gap-3 pt-1">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                <div className={managerMetricCardClass}>
                  <div className="text-[10px] font-bold tracking-[0.08em] text-slate-400">总数</div>
                  <div className="mt-1 text-[15px] font-black text-slate-800 dark:text-slate-100">{contextMenuItems.length}</div>
                </div>
                <div className={managerMetricCardClass}>
                  <div className="text-[10px] font-bold tracking-[0.08em] text-slate-400">可用</div>
                  <div className="mt-1 text-[15px] font-black text-emerald-500">{enabledMenuCount}</div>
                </div>
                <div className={managerMetricCardClass}>
                  <div className="text-[10px] font-bold tracking-[0.08em] text-slate-400">禁用</div>
                  <div className="mt-1 text-[15px] font-black text-amber-500">{Math.max(0, contextMenuItems.length - enabledMenuCount)}</div>
                </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const nextItem = buildContextMenuItem(contextMenuItems.length + 1, {
                      tab: popupMenuTabValue,
                    });
                    setGridContextMenuItems([...contextMenuItems, nextItem]);
                    setActiveContextMenuSelectionId(nextItem.id);
                  }}
                  className={`${managerActionButtonClass} shrink-0`}
                >
                  <span className="material-symbols-outlined text-[14px]">add</span>
                  新增菜单
                </button>
              </div>
            </div>
            <div className={`${managerListSurfaceClass} max-h-[332px] overflow-y-auto pr-1`}>
              {contextMenuItems.length > 0 ? contextMenuItems.map((item: any, index: number) => {
                const isSelected = selectedPopupMenuItem?.id === item.id;
                const iconName = getPopupMenuIconName(item.defailtimage);

                return (
                  <div
                    key={item.id}
                    className={`group flex items-center gap-3 rounded-[20px] border px-3.5 py-3 transition-all ${
                      isSelected
                        ? 'border-[color:var(--workspace-accent-border-strong)] bg-[linear-gradient(180deg,var(--workspace-accent-surface),rgba(255,255,255,0.96))] shadow-[0_22px_36px_-28px_var(--workspace-accent-shadow)] dark:bg-[linear-gradient(180deg,rgba(36,53,83,0.92),rgba(15,23,42,0.7))]'
                        : 'border-slate-200/75 bg-white/94 hover:border-[color:var(--workspace-accent-border)] hover:bg-white dark:border-slate-700 dark:bg-slate-900/56 dark:hover:bg-slate-900/72'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveContextMenuSelectionId(item.id)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <div className={`flex size-11 shrink-0 items-center justify-center rounded-[18px] border transition-colors ${
                        isSelected
                          ? 'border-[color:var(--workspace-accent)] bg-[color:var(--workspace-accent)] text-white'
                          : 'border-[color:var(--workspace-accent-border)] bg-[color:var(--workspace-accent-soft)] text-[color:var(--workspace-accent-strong)]'
                      }`}>
                        <span className="material-symbols-outlined text-[18px]">{iconName}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-bold text-slate-700 dark:text-slate-100">
                          {item.menuname || item.label || `菜单 ${index + 1}`}
                        </div>
                      </div>
                    </button>
                    <label
                      className="inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-200/80 bg-white/90 px-3 py-1.5 text-[11px] font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-900/72 dark:text-slate-300"
                      onMouseDown={(event) => event.stopPropagation()}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <span>禁用</span>
                      <input
                        type="checkbox"
                        checked={Boolean(item.disabled)}
                        onMouseDown={(event) => event.stopPropagation()}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => {
                          const checked = event.target.checked;
                          setGridContextMenuItems((menus: any[]) => menus.map((menu: any) => (
                            menu.id === item.id ? { ...menu, disabled: checked } : menu
                          )));
                        }}
                        className="h-4 w-4 rounded accent-[color:var(--workspace-accent)]"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => setGridContextMenuItems((menus: any[]) => menus.filter((menu: any) => menu.id !== item.id))}
                      className="inline-flex size-8 shrink-0 items-center justify-center rounded-xl text-rose-500 transition-colors hover:bg-rose-50 dark:hover:bg-rose-500/10"
                      title="删除菜单"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                );
              }) : (
                <div className="rounded-[22px] border border-dashed border-slate-200/80 px-4 py-10 text-center text-[12px] text-slate-400 dark:border-slate-700">
                  还没有配置右键菜单
                </div>
              )}
            </div>
          </section>

          <section className={`${managerSectionClass} min-w-0`}>
            <div className={managerHeaderClass}>
              <div className={managerTitleWrapClass}>
                <span className={managerTitleIconClass}>
                  <span className="material-symbols-outlined text-[18px]">edit_note</span>
                </span>
                <div>
                  <h4 className="text-[14px] font-bold text-slate-800 dark:text-slate-100">菜单详情</h4>
                </div>
              </div>
              {selectedPopupMenuItem && (
                <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
                  <span className={`${managerDetailNameClass} max-w-[320px] truncate`}>
                    {popupMenuDisplayName}
                  </span>
                  <span className="inline-flex items-center rounded-full border border-slate-200/80 bg-white/92 px-3 py-1.5 text-[11px] font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-900/72 dark:text-slate-300">
                    顺序 {selectedPopupMenuItem.orderid ?? 0}
                  </span>
                </div>
              )}
            </div>
            {selectedPopupMenuItem ? (
              <div className="space-y-3.5">
                <section className={detailCardClass}>
                  <div className={detailSectionTitleClass}>
                    <div className={detailSectionLabelClass}>核心配置</div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <label className={mutedLabelClass}>菜单名称</label>
                      <input
                        type="text"
                        value={selectedPopupMenuItem.menuname ?? selectedPopupMenuItem.label ?? ''}
                        onChange={(e) => updateSelectedPopupMenuItem({ menuname: e.target.value })}
                        placeholder="菜单名称"
                        className={fieldClass}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className={mutedLabelClass}>调用模板名</label>
                      <input
                        type="text"
                        value={selectedPopupMenuItem.dllname ?? ''}
                        onChange={(e) => updateSelectedPopupMenuItem({ dllname: e.target.value })}
                        placeholder="例如：open_archive_detail"
                        className={`${fieldClass} font-mono text-[12px]`}
                      />
                    </div>
                    <div>
                      <label className={mutedLabelClass}>右键类型</label>
                      <input
                        type="number"
                        value={selectedPopupMenuItem.menuType ?? 0}
                        onChange={(e) => updateSelectedPopupMenuNumber('menuType', e.target.value, 0)}
                        className={fieldClass}
                      />
                    </div>
                    <div>
                      <label className={mutedLabelClass}>加载方式</label>
                      <input
                        type="number"
                        value={selectedPopupMenuItem.showMode ?? 0}
                        onChange={(e) => updateSelectedPopupMenuNumber('showMode', e.target.value, 0)}
                        className={fieldClass}
                      />
                    </div>
                    <div>
                      <label className={mutedLabelClass}>添加方式</label>
                      <input
                        type="number"
                        value={selectedPopupMenuItem.addShowMode ?? 0}
                        onChange={(e) => updateSelectedPopupMenuNumber('addShowMode', e.target.value, 0)}
                        className={fieldClass}
                      />
                    </div>
                    <div>
                      <label className={mutedLabelClass}>事件类型</label>
                      <input
                        type="number"
                        value={selectedPopupMenuItem.actiontype ?? 0}
                        onChange={(e) => updateSelectedPopupMenuNumber('actiontype', e.target.value, 0)}
                        className={fieldClass}
                      />
                    </div>
                  </div>
                </section>

                <section className={detailCardClass}>
                  <div className={detailSectionTitleClass}>
                    <div className={detailSectionLabelClass}>参数配置</div>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500">已配置 {configuredPopupMenuParamCount}/10</span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {popupMenuParamFields.map((field, index) => {
                      const hasValue = Boolean(String(selectedPopupMenuItem[field.key] ?? '').trim());
                      const isActive = activePopupMenuParamField.key === field.key;
                      const previewValue = getPopupMenuParamPreview(String(selectedPopupMenuItem[field.key] ?? ''));

                      return (
                        <button
                          key={field.key}
                          type="button"
                          onClick={() => setSelectedPopupMenuParamKey(field.key)}
                          aria-pressed={isActive}
                          className={`group flex min-w-0 items-center justify-between gap-3 rounded-[18px] border px-3.5 py-3 text-left transition-all duration-150 ${
                            isActive
                              ? 'border-[color:var(--workspace-accent-border-strong)] bg-[color:var(--workspace-accent-surface)] shadow-[0_18px_30px_-24px_var(--workspace-accent-shadow)]'
                              : hasValue
                                ? 'border-[color:var(--workspace-accent-border)] bg-[color:var(--workspace-accent-soft)]/55 hover:border-[color:var(--workspace-accent-border-strong)]'
                                : 'border-slate-200/80 bg-white/88 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900/68'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className={`text-[12px] font-bold ${isActive ? 'text-[color:var(--workspace-accent-strong)] dark:text-white' : 'text-slate-700 dark:text-slate-100'}`}>
                                参数 {index + 1}
                              </span>
                              {hasValue && (
                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                  isActive
                                    ? 'bg-[color:var(--workspace-accent)] text-white'
                                    : 'bg-emerald-500/12 text-emerald-600 dark:bg-emerald-500/18 dark:text-emerald-300'
                                }`}
                                >
                                  已填
                                </span>
                              )}
                            </div>
                            <div className={`mt-1 truncate text-[11px] ${hasValue ? (isActive ? 'text-[color:var(--workspace-accent-strong)]/80 dark:text-slate-200/90' : 'text-slate-500 dark:text-slate-300') : 'text-slate-400 dark:text-slate-500'}`}>
                              {hasValue ? previewValue : '未填写'}
                            </div>
                          </div>
                          <span className={`material-symbols-outlined shrink-0 text-[16px] transition-colors ${
                            isActive
                              ? 'text-[color:var(--workspace-accent-strong)] dark:text-white'
                              : 'text-slate-300 group-hover:text-slate-500 dark:text-slate-600 dark:group-hover:text-slate-300'
                          }`}
                          >
                            chevron_right
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-3 rounded-[18px] border border-slate-200/80 bg-slate-50/72 p-3.5 dark:border-slate-700 dark:bg-slate-900/46">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="text-[12px] font-bold text-slate-700 dark:text-slate-100">{activePopupMenuParamField.label}</div>
                      <button
                        type="button"
                        onClick={() => updateSelectedPopupMenuItem({ [activePopupMenuParamField.key]: '' })}
                        className="inline-flex items-center gap-1 rounded-full border border-slate-200/80 bg-white/88 px-3 py-1.5 text-[11px] font-bold text-slate-500 transition-colors hover:border-rose-200 hover:text-rose-500 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300"
                      >
                        <span className="material-symbols-outlined text-[14px]">ink_eraser</span>
                        清空当前
                      </button>
                    </div>
                    <textarea
                      rows={3}
                      value={activePopupMenuParamValue}
                      onChange={(e) => updateSelectedPopupMenuItem({ [activePopupMenuParamField.key]: e.target.value })}
                      placeholder={activePopupMenuParamField.label}
                      className={`${textareaClass} min-h-[96px] resize-y font-mono text-[12px]`}
                    />
                  </div>
                </section>

                <section className={detailCardClass}>
                  <div className={detailSectionTitleClass}>
                    <div className={detailSectionLabelClass}>事件脚本与提示</div>
                  </div>
                  <div className="grid gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
                    <div>
                      <label className={mutedLabelClass}>事件脚本</label>
                      <textarea
                        rows={8}
                        value={selectedPopupMenuItem.action ?? ''}
                        onChange={(e) => updateSelectedPopupMenuItem({ action: e.target.value })}
                        placeholder="脚本 / 事件表达式"
                        className={`${textareaClass} min-h-[184px]`}
                      />
                    </div>
                    <div className="grid gap-3">
                      <div>
                        <label className={mutedLabelClass}>执行前提示</label>
                        <textarea
                          rows={2}
                          value={selectedPopupMenuItem.beforeMsg ?? ''}
                          onChange={(e) => updateSelectedPopupMenuItem({ beforeMsg: e.target.value })}
                          className={`${textareaClass} min-h-[78px] font-sans text-[12px]`}
                        />
                      </div>
                      <div>
                        <label className={mutedLabelClass}>成功提示</label>
                        <textarea
                          rows={2}
                          value={selectedPopupMenuItem.msgSuccess ?? ''}
                          onChange={(e) => updateSelectedPopupMenuItem({ msgSuccess: e.target.value })}
                          className={`${textareaClass} min-h-[78px] font-sans text-[12px]`}
                        />
                      </div>
                      <div>
                        <label className={mutedLabelClass}>错误提示</label>
                        <textarea
                          rows={2}
                          value={selectedPopupMenuItem.msgError ?? ''}
                          onChange={(e) => updateSelectedPopupMenuItem({ msgError: e.target.value })}
                          className={`${textareaClass} min-h-[78px] font-sans text-[12px]`}
                        />
                      </div>
                      <div>
                        <label className={mutedLabelClass}>补充说明</label>
                        <textarea
                          rows={2}
                          value={selectedPopupMenuItem.Fremark ?? ''}
                          onChange={(e) => updateSelectedPopupMenuItem({ Fremark: e.target.value })}
                          className={`${textareaClass} min-h-[78px] font-sans text-[12px]`}
                        />
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            ) : (
              <div className="rounded-[16px] border border-dashed border-slate-200/80 px-4 py-10 text-center text-[12px] text-slate-400 dark:border-slate-800">
                请选择菜单项
              </div>
            )}
          </section>
        </div>
      );
      };
      const renderColorRuleManagerSection = () => (
        <div className="space-y-4">
          <section className={managerSectionClass}>
            <div className={managerHeaderClass}>
              <div className={managerTitleWrapClass}>
                <span className={managerTitleIconClass}>
                  <span className="material-symbols-outlined text-[18px]">format_paint</span>
                </span>
                <div>
                  <h4 className="text-[14px] font-bold text-slate-800 dark:text-slate-100">规则列表</h4>
                </div>
              </div>
              <div className={managerHeaderToolsClass}>
                <div className={managerMetricCardClass}>
                  <div className="text-[10px] font-bold tracking-[0.08em] text-slate-400">总数</div>
                  <div className="mt-1 text-[15px] font-black text-slate-800 dark:text-slate-100">{colorRules.length}</div>
                </div>
                <div className={managerMetricCardClass}>
                  <div className="text-[10px] font-bold tracking-[0.08em] text-slate-400">生效</div>
                  <div className="mt-1 text-[15px] font-black text-[color:var(--workspace-accent-strong)]">{enabledColorRuleCount}</div>
                </div>
                <div className={managerMetricCardClass}>
                  <div className="text-[10px] font-bold tracking-[0.08em] text-slate-400">停用</div>
                  <div className="mt-1 text-[15px] font-black text-amber-500">{Math.max(0, colorRules.length - enabledColorRuleCount)}</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const nextRule = buildGridColorRule(colorRules.length + 1, isLeftGridConfig ? { tab: treeOwnerFieldKey } : {});
                    setGridColorRules([...colorRules, nextRule]);
                    setActiveColorRuleSelectionId(nextRule.id);
                  }}
                  className={managerActionButtonClass}
                >
                  <span className="material-symbols-outlined text-[14px]">add</span>
                  新增规则
                </button>
              </div>
            </div>
            <div className={managerListSurfaceClass}>
              {colorRules.length > 0 ? colorRules.map((rule: any, index: number) => (
                <div
                  key={rule.id}
                  className={`flex items-center gap-3 rounded-[18px] border px-3.5 py-2.5 transition-all ${
                    selectedColorRule?.id === rule.id
                      ? 'border-[color:var(--workspace-accent-border-strong)] bg-[color:var(--workspace-accent-surface)] shadow-[0_18px_30px_-24px_var(--workspace-accent-shadow)]'
                      : 'border-slate-200/75 bg-white/92 hover:border-[color:var(--workspace-accent-border)] dark:border-slate-700 dark:bg-slate-900/55'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setActiveColorRuleSelectionId(rule.id)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <div
                      className="flex size-10 shrink-0 items-center justify-center rounded-[16px] border"
                      style={{ color: rule.textColor || '#9f1239', backgroundColor: rule.backgroundColor || '#ffe4e6', borderColor: rule.backgroundColor || '#ffe4e6' }}
                    >
                      <span className="material-symbols-outlined text-[16px]">palette</span>
                    </div>
                    <div className="min-w-0 flex-1 truncate text-[13px] font-bold text-slate-700 dark:text-slate-100">
                      {rule.label || `规则 ${index + 1}`}
                    </div>
                  </button>
                  <label
                    className="inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-200/80 bg-white/90 px-3 py-1.5 text-[11px] font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-900/72 dark:text-slate-300"
                    onMouseDown={(event) => event.stopPropagation()}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <span>禁用</span>
                    <input
                      type="checkbox"
                      checked={Boolean(rule.disabled)}
                      onMouseDown={(event) => event.stopPropagation()}
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) => {
                        const checked = event.target.checked;
                        setGridColorRules((rules: any[]) => rules.map((item: any) => (
                          item.id === rule.id ? { ...item, disabled: checked } : item
                        )));
                      }}
                      className="h-4 w-4 rounded accent-[color:var(--workspace-accent)]"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setGridColorRules((rules: any[]) => rules.filter((item: any) => item.id !== rule.id))}
                    className="inline-flex size-8 shrink-0 items-center justify-center rounded-xl text-rose-500 transition-colors hover:bg-rose-50 dark:hover:bg-rose-500/10"
                    title="删除规则"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </div>
              )) : (
                <div className="rounded-[22px] border border-dashed border-slate-200/80 px-4 py-8 text-center text-[12px] text-slate-400 dark:border-slate-700">
                  还没有颜色规则
                </div>
              )}
            </div>
          </section>

          <section className={managerSectionClass}>
            <div className={managerHeaderClass}>
              <div className={managerTitleWrapClass}>
                <span className={managerTitleIconClass}>
                  <span className="material-symbols-outlined text-[18px]">edit_note</span>
                </span>
                <div>
                  <h4 className="text-[14px] font-bold text-slate-800 dark:text-slate-100">规则详情</h4>
                </div>
              </div>
              {selectedColorRule && (
                <span className={`${managerDetailNameClass} truncate`}>
                  {selectedColorRule.label || '未命名规则'}
                </span>
              )}
            </div>
            {selectedColorRule ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={mutedLabelClass}>规则名称</label>
                  <input
                    type="text"
                    value={selectedColorRule.label ?? ''}
                    onChange={(e) => setGridColorRules((rules: any[]) => rules.map((item: any) => (
                      item.id === selectedColorRule.id ? { ...item, label: e.target.value } : item
                    )))}
                    placeholder="例如：停用记录 / 高价物料"
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label className={mutedLabelClass}>匹配字段</label>
                  <select
                    value={selectedColorRule.field ?? ''}
                    onChange={(e) => setGridColorRules((rules: any[]) => rules.map((item: any) => (
                      item.id === selectedColorRule.id ? { ...item, field: e.target.value } : item
                    )))}
                    className={fieldClass}
                  >
                    <option value="">请选择字段</option>
                    {availableGridColumns.map((column: any) => {
                      const normalizedColumn = normalizeColumn(column);
                      return (
                        <option key={`rule-field-${selectedColorRule.id}-${column.id}`} value={normalizedColumn.sourceField || normalizedColumn.name}>
                          {normalizedColumn.name} ({normalizedColumn.sourceField || '未配置标识'})
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <label className={mutedLabelClass}>匹配方式</label>
                  <select
                    value={selectedColorRule.operator ?? '等于'}
                    onChange={(e) => setGridColorRules((rules: any[]) => rules.map((item: any) => (
                      item.id === selectedColorRule.id ? { ...item, operator: e.target.value } : item
                    )))}
                    className={fieldClass}
                  >
                    {GRID_COLOR_RULE_OPERATOR_OPTIONS.map((operator) => (
                      <option key={operator} value={operator}>{operator}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={mutedLabelClass}>匹配值</label>
                  <input
                    type="text"
                    value={selectedColorRule.value ?? ''}
                    onChange={(e) => setGridColorRules((rules: any[]) => rules.map((item: any) => (
                      item.id === selectedColorRule.id ? { ...item, value: e.target.value } : item
                    )))}
                    placeholder="例如：停用 / 1000"
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label className={mutedLabelClass}>字体颜色</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={/^#[0-9a-fA-F]{6}$/.test(selectedColorRule.textColor || '') ? selectedColorRule.textColor : '#9f1239'}
                      onChange={(e) => setGridColorRules((rules: any[]) => rules.map((item: any) => (
                        item.id === selectedColorRule.id ? { ...item, textColor: e.target.value } : item
                      )))}
                      className="h-10 w-14 rounded-[14px] border border-slate-200 bg-white px-1 dark:border-slate-700 dark:bg-slate-900"
                    />
                    <input
                      type="text"
                      value={selectedColorRule.textColor ?? '#9f1239'}
                      onChange={(e) => setGridColorRules((rules: any[]) => rules.map((item: any) => (
                        item.id === selectedColorRule.id ? { ...item, textColor: e.target.value } : item
                      )))}
                      className={`${fieldClass} font-mono text-[12px]`}
                    />
                  </div>
                </div>
                <div>
                  <label className={mutedLabelClass}>背景颜色</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={/^#[0-9a-fA-F]{6}$/.test(selectedColorRule.backgroundColor || '') ? selectedColorRule.backgroundColor : '#ffe4e6'}
                      onChange={(e) => setGridColorRules((rules: any[]) => rules.map((item: any) => (
                        item.id === selectedColorRule.id ? { ...item, backgroundColor: e.target.value } : item
                      )))}
                      className="h-10 w-14 rounded-[14px] border border-slate-200 bg-white px-1 dark:border-slate-700 dark:bg-slate-900"
                    />
                    <input
                      type="text"
                      value={selectedColorRule.backgroundColor ?? '#ffe4e6'}
                      onChange={(e) => setGridColorRules((rules: any[]) => rules.map((item: any) => (
                        item.id === selectedColorRule.id ? { ...item, backgroundColor: e.target.value } : item
                      )))}
                      className={`${fieldClass} font-mono text-[12px]`}
                    />
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className={mutedLabelClass}>规则说明</label>
                  <textarea
                    rows={4}
                    value={selectedColorRule.note ?? ''}
                    onChange={(e) => setGridColorRules((rules: any[]) => rules.map((item: any) => (
                      item.id === selectedColorRule.id ? { ...item, note: e.target.value } : item
                    )))}
                      placeholder="填写规则说明"
                    className={textareaClass}
                  />
                </div>
              </div>
            ) : (
              <div className="rounded-[16px] border border-dashed border-slate-200/80 px-4 py-8 text-center text-[12px] text-slate-400 dark:border-slate-800">
                请选择颜色规则
              </div>
            )}
          </section>
        </div>
      );

      return (
        <div className={panelShellClass}>
          <div className={panelHeaderClass}>
            <div className="flex min-w-0 items-start gap-3">
              <div className={`${panelIconShellClass} ${selectedColumnContext.iconClass}`}>
                <span className="material-symbols-outlined text-[18px]">{selectedColumnContext.icon}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className={panelTitleClass}>{selectedColumnContext.title}</h3>
                  {!useQuietDocumentInspector ? <span className={panelBadgeClass}>{isDocumentDetailGrid ? '明细页签' : '表格级配置'}</span> : null}
                  {isDetailChartInspector && (
                    <span className="inline-flex items-center rounded-full border border-[#1686e3]/18 bg-[#1686e3]/8 px-2.5 py-1 text-[10px] font-bold text-[#1686e3]">
                      p_systemdlltabchart
                    </span>
                  )}
                </div>
                {useQuietDocumentInspector ? (
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-300">
                    {isDocumentDetailGrid
                      ? `${detailGridFillTypeMeta?.label || '表格'} · 右侧直接维护页签、来源和整表配置`
                      : '右侧只保留当前表格的直接配置，去掉低价值摘要和装饰信息'}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
                <div className="flex flex-wrap items-center gap-2">
                {!isBillHeadGridConfig && !isBillDetailGridConfig && !isLeftGridConfig && !isDetailChartInspector && !isMainGridConfig && (
                  <button
                    type="button"
                    onClick={applySuggestedDetailLayout}
                    className={useQuietDocumentInspector ? quietDocumentInspectorActionClass : 'inline-flex h-9 items-center gap-1.5 rounded-[14px] border border-slate-200/80 bg-white/92 px-3 text-[12px] font-bold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/72 dark:text-slate-200'}
                  >
                    <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                    推荐布局
                  </button>
                )}
                {isMainGridConfig && !isBillHeadGridConfig && (
                  <button
                    type="button"
                    onClick={() => openDetailBoardPreview(1, currentDetailBoard.sortColumnId)}
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
                )}
              </div>
            </div>
            {renderInspectorTabs()}
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4">
            {isContextMenuPanelTab && isGridDecorationManagerAvailable ? (
              renderPopupMenuManagerSection()
            ) : isColorPanelTab && isGridDecorationManagerAvailable ? (
              renderColorRuleManagerSection()
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
                          min={BILL_HEADER_WORKBENCH_MIN_ROWS}
                          max={BILL_HEADER_WORKBENCH_MAX_ROWS}
                          value={getBillHeaderRowCount()}
                          onChange={(event) => updateBillHeaderWorkbenchRows(Number(event.target.value) || BILL_HEADER_WORKBENCH_MIN_ROWS)}
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
                          onClick={activateSourceGridSelection}
                          className="inline-flex h-10 items-center gap-1.5 rounded-[14px] bg-[color:var(--workspace-accent)] px-4 text-[12px] font-bold text-white shadow-[0_18px_30px_-24px_var(--workspace-accent-shadow)]"
                        >
                          <span className="material-symbols-outlined text-[16px]">database</span>
                          配置来源表
                        </button>
                      </div>
                    </div>
                  </section>
                  {renderSqlConfigSection()}
                  {renderIdentifierTranslationSection()}
                </div>
              ) : isBillDetailGridConfig ? (
                <div className="space-y-4">
                  {renderGridConfigSummarySection('明细表属性')}
                  {renderSqlConfigSection()}
                  {renderIdentifierTranslationSection()}
                </div>
              ) : isLeftGridConfig ? (
                <div className="space-y-4">
                  {renderLeftGridMappingSection()}
                  {renderGridConfigSummarySection('左侧树表属性')}
                </div>
              ) : isDocumentDetailGrid ? (
                <div className="space-y-4">
                  {renderDetailTabWorkbenchSection()}
                  {isDetailChartInspector ? (
                    renderDetailChartTableMappingSection()
                  ) : (
                    <>
                      {renderDetailSourceSection()}
                      {renderGridConfigSummarySection('明细表属性')}
                      {renderIdentifierTranslationSection()}
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {isDocumentArchiveGrid && renderDocumentTableMappingSection()}
                  {renderGridConfigSummarySection(
                    detailGridFillTypeMeta?.value === '图表' ? '图表加载属性' : '主表属性',
                  )}
                  {renderSqlConfigSection()}
                  {renderIdentifierTranslationSection()}
                </div>
              )
            ) : (
              isBillHeadGridConfig || isBillDetailGridConfig ? (
                <div className="space-y-3">
                  {renderAdvancedPlaceholder('当前模式暂无扩展配置')}
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
                  {renderArchiveMainLayoutSummarySection()}
                </div>
              ) : isDocumentDetailGrid && isDetailChartInspector ? (
                <div className="space-y-3">
                  {renderAdvancedPlaceholder('图表视图暂无额外扩展配置')}
                </div>
              ) : (
                <div className="space-y-3">
                  {renderDetailBoardLayoutManager()}
              </div>
              )
            )}
          </div>
        </div>
      );
    }

    if (selectedColumnContext.kind === 'condition-panel') {
      const currentConfig = selectedColumnContext.config;
      const currentFields = selectedColumnContext.fields as any[];
      const isLeftPanel = selectedColumnContext.scope === 'left-filter-panel';

      return (
        <div style={workspaceThemeVars} className={panelShellClass}>
          <div className={panelHeaderClass}>
            <div className="flex items-start gap-3">
              <div className={`${panelIconShellClass} ${selectedColumnContext.iconClass}`}>
                <span className="material-symbols-outlined text-[18px]">{selectedColumnContext.icon}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className={panelTitleClass}>{selectedColumnContext.title}</h3>
                  <span className={panelBadgeClass}>总览配置</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className={compactInfoCardClass}>
                <div className="text-[11px] font-bold tracking-[0.08em] text-slate-400">当前作用域</div>
                <div className="mt-1 text-[13px] font-bold text-slate-700 dark:text-slate-100">
                  {isLeftPanel ? '左条件' : '主条件'}
                </div>
              </div>
              <div className={compactInfoCardClass}>
                <div className="text-[11px] font-bold tracking-[0.08em] text-slate-400">条件数量</div>
                <div className="mt-1 text-[13px] font-bold text-slate-700 dark:text-slate-100">
                  {currentFields.length} 项
                </div>
              </div>
              <div className={compactInfoCardClass}>
                <div className="text-[11px] font-bold tracking-[0.08em] text-slate-400">默认宽度</div>
                <div className="mt-1 text-[13px] font-bold text-slate-700 dark:text-slate-100">
                  {CONDITION_PANEL_CONTROL_WIDTH}px
                </div>
              </div>
            </div>

            <section className={compactCardClass}>
              <div className={sectionTitleClass}>
                <span className="material-symbols-outlined text-[18px] text-primary">dashboard_customize</span>
                <h4>布局总览</h4>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={mutedLabelClass}>控件行数</label>
                  <input
                    type="number"
                    min={CONDITION_PANEL_MIN_ROWS}
                    max={CONDITION_PANEL_MAX_ROWS}
                    value={currentConfig.rows}
                    onChange={(event) => selectedColumnContext.setConfig((prev: ConditionWorkbenchConfig) => ({
                      ...prev,
                      rows: Number(event.target.value) || CONDITION_PANEL_MIN_ROWS,
                    }))}
                    className={fieldClass}
                  />
                </div>
                <div className={compactInfoCardClass}>
                  <div className="text-[11px] font-bold tracking-[0.08em] text-slate-400">排布方式</div>
                  <div className="mt-1 text-[13px] font-bold text-slate-700 dark:text-slate-100">
                    按行拖放
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    直接把条件拖到目标行，无需再配分栏数。
                  </div>
                </div>
              </div>
            </section>

            <section className={compactCardClass}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className={sectionTitleClass}>
                  <span className="material-symbols-outlined text-[18px] text-primary">content_paste</span>
                  <h4>批量构建条件</h4>
                </div>
                <div className="inline-flex items-center gap-2">
                  <button
                    type="button"
                    onClick={selectedColumnContext.appendDraft}
                    className="inline-flex h-8 items-center gap-1 rounded-[12px] bg-[color:var(--workspace-accent)] px-3 text-[11px] font-bold text-white"
                  >
                    <span className="material-symbols-outlined text-[14px]">add</span>
                    追加
                  </button>
                  <button
                    type="button"
                    onClick={selectedColumnContext.replaceDraft}
                    className="inline-flex h-8 items-center gap-1 rounded-[12px] border border-slate-200 bg-white px-3 text-[11px] font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  >
                    <span className="material-symbols-outlined text-[14px]">restart_alt</span>
                    重建
                  </button>
                </div>
              </div>
              <div>
                <label className={mutedLabelClass}>粘贴 Excel / 列名</label>
                <textarea
                  rows={6}
                  value={currentConfig.bulkDraft}
                  onChange={(event) => selectedColumnContext.setConfig((prev: ConditionWorkbenchConfig) => ({
                    ...prev,
                    bulkDraft: event.target.value,
                  }))}
                  placeholder={'每行一个条件名，或直接粘贴 Excel 单列内容。'}
                  className={`${textareaClass} min-h-[148px]`}
                />
              </div>
            </section>

            <section className={compactCardClass}>
              <div className={sectionTitleClass}>
                <span className="material-symbols-outlined text-[18px] text-primary">view_week</span>
                <h4>当前条件总览</h4>
              </div>
              {currentFields.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {currentFields.map((field) => {
                    const normalizedField = normalizeConditionField(field);
                    return (
                      <button
                        key={field.id}
                        type="button"
                        onClick={() => {
                          if (isLeftPanel) {
                            setSelectedArchiveNodeId('archive-left-filter');
                            activateConditionSelection('left', field.id);
                            setSelectedLeftFiltersForDelete([field.id]);
                            return;
                          }
                          setSelectedArchiveNodeId('archive-filter');
                          activateConditionSelection('main', field.id);
                          setSelectedMainFiltersForDelete([field.id]);
                        }}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition-colors hover:border-[color:var(--workspace-accent-border)] hover:text-[color:var(--workspace-accent-strong)] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                      >
                        <span className="material-symbols-outlined text-[13px] text-[color:var(--workspace-accent)]">
                          {normalizedField.type === '日期框' ? 'calendar_month' : 'tune'}
                        </span>
                        {normalizedField.name}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-[18px] border border-dashed border-slate-200/80 bg-slate-50/75 px-4 py-6 text-[12px] text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
                  当前还没有条件，先输入名称后再批量构建。
                </div>
              )}
            </section>
          </div>
        </div>
      );
    }

    const isConditionConfig = selectedColumnContext.kind === 'condition';
    const currentColumn = isConditionConfig
      ? normalizeConditionField(selectedColumnContext.column)
      : normalizeColumn(selectedColumnContext.column);
    const isBillHeaderField = businessType === 'table' && selectedColumnContext.scope === 'main' && !isConditionConfig;
    const itemNameLabel = isConditionConfig ? '条件名称' : isBillHeaderField ? '控件名称' : '字段名称';
    const itemKeyLabel = isConditionConfig ? '条件标识' : isBillHeaderField ? '控件标识' : '字段标识';
    const itemTypeLabel = isConditionConfig ? '当前类型' : isBillHeaderField ? '控件类型' : '当前类型';
    const itemWidthLabel = isConditionConfig ? '当前宽度' : isBillHeaderField ? '控件宽度' : '当前宽度';
    const secondaryMetricLabel = isBillHeaderField ? '标签宽度' : '对齐方式';
    const secondaryMetricValue = isBillHeaderField
      ? `${Math.round(currentColumn.labelWidth || BILL_FORM_DEFAULT_LABEL_WIDTH)}px`
      : currentColumn.align;
    const definitionSectionTitle = isConditionConfig ? '条件定义' : isBillHeaderField ? '控件定义' : '基础定义';
    const updateColumn = (patch: Record<string, any>) => {
      selectedColumnContext.setCols((prev) => prev.map((item) => (
        item.id === currentColumn.id ? { ...item, ...patch } : item
      )));
    };

    const removeCurrentColumn = () => {
      if (selectedColumnContext.scope === 'filter') {
        deleteSelectedConditions('main', [currentColumn.id]);
        return;
      }

      if (selectedColumnContext.scope === 'left-filter') {
        deleteSelectedConditions('left', [currentColumn.id]);
        return;
      }

      if (selectedColumnContext.scope === 'detail-filter') {
        deleteSelectedConditions('detail', [currentColumn.id]);
        return;
      }

      if (selectedColumnContext.scope === 'left' || selectedColumnContext.scope === 'main' || selectedColumnContext.scope === 'detail') {
        deleteSelectedColumns(selectedColumnContext.scope, [currentColumn.id]);
        return;
      }

      clearColumnSelection();
    };

    const propertySwitches = isConditionConfig
      ? [
          { key: 'required', label: '必填条件', desc: '查询前必须填写该条件' },
          { key: 'visible', label: '界面显示', desc: '控制是否在顶部条件区展示' },
          { key: 'searchable', label: '参与查询', desc: '启用后参与查询条件拼装' },
          { key: 'readonly', label: '只读预设', desc: '适合系统回填或固定条件' },
        ]
      : [
          { key: 'required', label: '必填字段', desc: '保存前必须输入或选择值' },
          { key: 'visible', label: '界面显示', desc: '控制是否在列表或表单中展示' },
          { key: 'searchable', label: '支持搜索', desc: '可作为筛选检索字段参与查询' },
          { key: 'readonly', label: '只读模式', desc: '用于系统回填或计算型字段' },
        ];
    const isSingleTableField = !isConditionConfig && businessType !== 'table';
    const currentFieldSqlTagValue = String(resolveColumnFieldSqlTagId(currentColumn));
    const currentFieldSqlTagLabel = toRecordText(currentColumn.fieldSqlTagName)
      || FIELD_SQL_TAG_LABEL_FALLBACKS[normalizeFieldSqlTagId(currentFieldSqlTagValue, 0)]
      || currentColumn.type;
    const availableFieldSqlTagOptions = (fieldSqlTagOptions.length > 0 ? fieldSqlTagOptions : DEFAULT_FIELD_SQL_TAG_OPTIONS).reduce<FieldSqlTagOptionDto[]>((collection, option) => {
      const optionId = normalizeFieldSqlTagId(option.showid, -1);
      if (optionId < 0 || collection.some((item) => normalizeFieldSqlTagId(item.showid, -1) === optionId)) {
        return collection;
      }

      collection.push({
        showid: optionId,
        showname: getFieldSqlTagOptionLabel(option),
      });
      return collection;
    }, []);
    if (!availableFieldSqlTagOptions.some((option) => String(normalizeFieldSqlTagId(option.showid, -1)) === currentFieldSqlTagValue)) {
      availableFieldSqlTagOptions.unshift({
        showid: normalizeFieldSqlTagId(currentFieldSqlTagValue, 0),
        showname: currentFieldSqlTagLabel || `类型 ${currentFieldSqlTagValue}`,
      });
    }
    const existingTreeRelationColumn = isSingleTableField
      ? mainTableColumns.find((column) => isTreeRelationFieldColumn(column)) ?? null
      : null;
    const hasOtherTreeRelationField = Boolean(existingTreeRelationColumn && existingTreeRelationColumn.id !== currentColumn.id);
    const availableFieldTypes = isConditionConfig
      ? FIELD_TYPE_OPTIONS.filter((type) => type !== '树形节点关联')
      : FIELD_TYPE_OPTIONS;
    const handleFieldTypeChange = (nextValue: string) => {
      if (isConditionConfig) {
        updateColumn({ type: nextValue });
        return;
      }

      const selectedOption = availableFieldSqlTagOptions.find((option) => String(normalizeFieldSqlTagId(option.showid, -1)) === nextValue);
      if (!selectedOption) {
        return;
      }

      const nextFieldType = mapFieldSqlTagToFieldType(selectedOption.showid, getFieldSqlTagOptionLabel(selectedOption), currentColumn.type);
      if (isSingleTableField && nextFieldType === '树形节点关联' && hasOtherTreeRelationField) {
        showToast(`树形节点关联已被字段「${normalizeColumn(existingTreeRelationColumn).name}」占用，其他列不能重复选择。`);
        return;
      }

      updateColumn({
        type: nextFieldType,
        fieldSqlTag: normalizeFieldSqlTagId(selectedOption.showid, 0),
        fieldSqlTagName: getFieldSqlTagOptionLabel(selectedOption),
      });
    };
    const currentTypeDisplayLabel = isConditionConfig ? currentColumn.type : currentFieldSqlTagLabel;
    const commonPropertySwitches = propertySwitches.filter((item) => item.key !== 'readonly');
    const advancedPropertySwitches = propertySwitches.filter((item) => item.key === 'readonly');
    const legacyTableMeta = isConditionConfig
      ? selectedColumnContext.scope === 'filter'
        ? {
            table: 'p_systembillsourcecond',
            hint: '主表条件的控件、默认值和联动规则统一落这个条件表。',
          }
        : selectedColumnContext.scope === 'left-filter'
          ? {
              table: 'p_systembillsourcecond',
              hint: '左侧条件也写入 p_systembillsourcecond，并带上所属树形字段的 sourceid 与 formKey。',
            }
        : {
            table: 'p_systembillsourcecond',
            hint: '明细条件也按条件配置表维护，方便后续统一拼装查询条件。',
          }
      : selectedColumnContext.scope === 'left'
        ? {
            table: 'p_systemwordbookgrid',
            hint: '左侧树节点展开后的列配置、显示字段和宽度统一按树表字段配置表维护。',
          }
      : businessType !== 'table'
        ? {
            table: 'p_systemwordbooktab',
            hint: '当前列的名称、标识、交互、联动和展示属性都按字段配置表统一维护。',
          }
        : null;
    const openLongTextEditor = (title: string, value: string, onSave: (nextValue: string) => void, placeholder?: string) => {
      setLongTextEditorState({
        title,
        placeholder,
        draft: value,
        onSave,
      });
    };

    return (
      <div className={panelShellClass}>
        <div className={panelHeaderClass}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <div className={`${panelIconShellClass} ${selectedColumnContext.iconClass}`}>
                <span className="material-symbols-outlined text-[18px]">{selectedColumnContext.icon}</span>
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className={panelTitleClass}>{currentColumn.name}</h3>
                  <span className={panelBadgeClass}>{selectedColumnContext.title}</span>
                  {legacyTableMeta && (
                    <span className="inline-flex items-center rounded-full border border-[#1686e3]/18 bg-[#1686e3]/8 px-2.5 py-1 text-[10px] font-bold text-[#1686e3]">
                      {legacyTableMeta.table}
                    </span>
                  )}
                </div>
                {legacyTableMeta && (
                  <p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-slate-300">{legacyTableMeta.hint}</p>
                )}
              </div>
            </div>
            <button
              onClick={removeCurrentColumn}
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-rose-200/70 bg-white text-rose-400 transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-500 dark:border-rose-500/20 dark:bg-slate-900 dark:text-rose-300"
              title={selectedColumnContext.removeLabel}
            >
              <span className="material-symbols-outlined text-[16px]">delete</span>
            </button>
          </div>
          {renderInspectorTabs()}
        </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className={compactInfoCardClass}>
              <div className="text-[11px] font-bold tracking-[0.08em] text-slate-400">{itemKeyLabel}</div>
              <div className="mt-1 break-all font-mono text-[12px] leading-5 text-slate-600 dark:text-slate-200">{currentColumn.sourceField || '未设置'}</div>
            </div>
            <div className={compactInfoCardClass}>
              <div className="text-[11px] font-bold tracking-[0.08em] text-slate-400">{itemTypeLabel}</div>
              <div className="mt-1 break-words text-[13px] font-bold leading-5 text-slate-700 dark:text-slate-100">{currentTypeDisplayLabel}</div>
            </div>
            <div className={compactInfoCardClass}>
              <div className="text-[11px] font-bold tracking-[0.08em] text-slate-400">{itemWidthLabel}</div>
              <div className="mt-1 break-words text-[13px] font-bold leading-5 text-slate-700 dark:text-slate-100">{Math.round(currentColumn.width)}px</div>
            </div>
            <div className={compactInfoCardClass}>
              <div className="text-[11px] font-bold tracking-[0.08em] text-slate-400">{secondaryMetricLabel}</div>
              <div className="mt-1 break-words text-[13px] font-bold leading-5 text-slate-700 dark:text-slate-100">{secondaryMetricValue}</div>
            </div>
          </div>

          <div className="mt-5 space-y-5">
            {isCommonPanelTab ? (
              <>
                <section className={compactCardClass}>
                  <div className={sectionTitleClass}>
                    <span className="material-symbols-outlined text-[18px] text-primary">view_list</span>
                    <h4>{definitionSectionTitle}</h4>
                  </div>
                  <div className="grid gap-4">
                    <div>
                      <label className={mutedLabelClass}>{itemNameLabel}</label>
                      <input
                        type="text"
                        value={currentColumn.name}
                        onChange={(e) => updateColumn({ name: e.target.value })}
                        className={fieldClass}
                      />
                    </div>
                    <div>
                      <label className={mutedLabelClass}>{itemKeyLabel}</label>
                      <input
                        type="text"
                        value={currentColumn.sourceField || ''}
                        onChange={(e) => updateColumn({ sourceField: e.target.value })}
                        placeholder={isConditionConfig ? '例如：status_keyword' : '例如：material_code'}
                        className={`${fieldClass} font-mono text-[12px]`}
                      />
                    </div>
                    {!isConditionConfig && (
                      <div>
                        <div className="mb-1.5 flex items-center justify-between gap-3">
                          <label className={`${mutedLabelClass} mb-0`}>动态 SQL</label>
                          <button
                            type="button"
                            onClick={() => openLongTextEditor(
                              `${currentColumn.name || '字段'} · 动态 SQL`,
                              currentColumn.dynamicSql || '',
                              (nextValue) => updateColumn({ dynamicSql: nextValue }),
                              '例如：SELECT node_id, node_name, parent_id FROM ...',
                            )}
                            className="inline-flex h-7 items-center gap-1 rounded-full border border-[color:var(--workspace-accent-border)] bg-[color:var(--workspace-accent-soft)] px-3 text-[10px] font-bold text-[color:var(--workspace-accent-strong)] transition-colors hover:bg-[color:var(--workspace-accent-tint)]"
                          >
                            <span className="material-symbols-outlined text-[13px]">open_in_full</span>
                            详情编辑
                          </button>
                        </div>
                        <textarea
                          rows={4}
                          value={currentColumn.dynamicSql}
                          onChange={(e) => updateColumn({ dynamicSql: e.target.value })}
                          placeholder="例如：SELECT node_id, node_name, parent_id FROM ..."
                          className={`${textareaClass} min-h-[124px]`}
                        />
                      </div>
                    )}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className={mutedLabelClass}>{isConditionConfig || isBillHeaderField ? '控件类型' : '字段类型'}</label>
                        <select
                          value={isConditionConfig ? currentColumn.type : currentFieldSqlTagValue}
                          onChange={(e) => handleFieldTypeChange(e.target.value)}
                          className={fieldClass}
                        >
                          {isConditionConfig
                            ? availableFieldTypes.map((type) => (
                                <option key={type} value={type}>
                                  {type}
                                </option>
                              ))
                            : availableFieldSqlTagOptions.map((option) => {
                                const optionId = normalizeFieldSqlTagId(option.showid, -1);
                                const optionLabel = getFieldSqlTagOptionLabel(option);
                                const optionFieldType = mapFieldSqlTagToFieldType(option.showid, optionLabel, '文本');
                                const isTreeRelationOption = optionFieldType === '树形节点关联';
                                const isDisabled = isTreeRelationOption && hasOtherTreeRelationField && String(optionId) !== currentFieldSqlTagValue;

                                return (
                                  <option key={optionId} value={String(optionId)} disabled={isDisabled}>
                                    {optionLabel}
                                  </option>
                                );
                              })}
                        </select>
                        {!isConditionConfig && hasOtherTreeRelationField && (
                          <div className="mt-2 rounded-[14px] border border-sky-200/70 bg-sky-50/85 px-3 py-2 text-[11px] font-medium leading-5 text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-200">
                            树形节点关联已由“{normalizeColumn(existingTreeRelationColumn).name}”使用，当前列不能重复选择。
                          </div>
                        )}
                      </div>
                      {isConditionConfig ? (
                        <div>
                          <label className={mutedLabelClass}>控件总宽度</label>
                          <input
                            type="number"
                            min={CONDITION_PANEL_RESIZE_MIN_WIDTH}
                            max={CONDITION_PANEL_RESIZE_MAX_WIDTH}
                            value={Math.round(currentColumn.width || CONDITION_PANEL_CONTROL_WIDTH)}
                            onChange={(e) => updateColumn({
                              width: Math.max(
                                CONDITION_PANEL_RESIZE_MIN_WIDTH,
                                Math.min(
                                  CONDITION_PANEL_RESIZE_MAX_WIDTH,
                                  Number(e.target.value) || CONDITION_PANEL_CONTROL_WIDTH,
                                ),
                              ),
                            })}
                            className={fieldClass}
                          />
                        </div>
                      ) : (
                        <div>
                          <label className={mutedLabelClass}>{isBillHeaderField ? '控件宽度 (px)' : '列宽 (px)'}</label>
                          <input
                            type="number"
                            min={isBillHeaderField ? BILL_FORM_MIN_WIDTH : TABLE_COLUMN_RESIZE_MIN_WIDTH}
                            value={Math.round(currentColumn.width)}
                            onChange={(e) => updateColumn({
                              width: Math.max(
                                isBillHeaderField ? BILL_FORM_MIN_WIDTH : TABLE_COLUMN_RESIZE_MIN_WIDTH,
                                Number(e.target.value) || (isBillHeaderField ? BILL_FORM_MIN_WIDTH : TABLE_COLUMN_RESIZE_MIN_WIDTH),
                              ),
                            })}
                            className={fieldClass}
                          />
                        </div>
                      )}
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className={mutedLabelClass}>对齐方式</label>
                        <select
                          value={currentColumn.align}
                          onChange={(e) => updateColumn({ align: e.target.value })}
                          className={fieldClass}
                        >
                          {COLUMN_ALIGN_OPTIONS.map((align) => (
                            <option key={align} value={align}>
                              {align}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={mutedLabelClass}>默认值</label>
                        <input
                          type="text"
                          value={currentColumn.defaultValue}
                          onChange={(e) => updateColumn({ defaultValue: e.target.value })}
                          placeholder="例如：默认状态、初始值"
                          className={fieldClass}
                        />
                      </div>
                    </div>
                    <div>
                      <label className={mutedLabelClass}>{isConditionConfig ? '提示文案' : '占位提示'}</label>
                      <input
                        type="text"
                        value={currentColumn.placeholder}
                        onChange={(e) => updateColumn({ placeholder: e.target.value })}
                    placeholder={isConditionConfig ? '输入提示文案' : '输入占位提示'}
                        className={fieldClass}
                      />
                    </div>
                    {isBillHeaderField && (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className={mutedLabelClass}>标签宽度</label>
                          <input
                            type="number"
                            min={58}
                            max={128}
                            value={Math.round(currentColumn.labelWidth || BILL_FORM_DEFAULT_LABEL_WIDTH)}
                            onChange={(e) => updateColumn({ labelWidth: Math.max(58, Number(e.target.value) || BILL_FORM_DEFAULT_LABEL_WIDTH) })}
                            className={fieldClass}
                          />
                        </div>
                        <div>
                          <label className={mutedLabelClass}>字号</label>
                          <input
                            type="number"
                            min={11}
                            max={18}
                            value={Math.round(currentColumn.fontSize || BILL_FORM_DEFAULT_FONT_SIZE)}
                            onChange={(e) => updateColumn({ fontSize: Math.max(11, Math.min(18, Number(e.target.value) || BILL_FORM_DEFAULT_FONT_SIZE)) })}
                            className={fieldClass}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                {isBillHeaderField && (
                  <section className={compactCardClass}>
                    <div className={sectionTitleClass}>
                      <span className="material-symbols-outlined text-[18px] text-primary">database</span>
                      <h4>来源绑定</h4>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className={mutedLabelClass}>来源表</label>
                        <div className="flex gap-2">
                          <select
                            value={currentColumn.sourceTable || ''}
                            onChange={(e) => updateColumn({ sourceTable: e.target.value })}
                            className={fieldClass}
                          >
                            <option value="">未绑定</option>
                            {billSources.map((source) => (
                              <option key={source.id} value={source.id}>
                                {source.sourceName || '未命名来源'}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={activateSourceGridSelection}
                            className="inline-flex shrink-0 items-center gap-1 rounded-[14px] border border-[color:var(--workspace-accent-border)] px-3 text-[12px] font-bold text-[color:var(--workspace-accent)]"
                          >
                            <span className="material-symbols-outlined text-[14px]">tune</span>
                            来源
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className={mutedLabelClass}>来源字段</label>
                        <input
                          list={`bill-source-fields-${currentColumn.id}`}
                          value={currentColumn.sourceField || ''}
                          onChange={(e) => updateColumn({ sourceField: e.target.value })}
                          className={fieldClass}
                          placeholder="填写或选择来源字段"
                        />
                        <datalist id={`bill-source-fields-${currentColumn.id}`}>
                          {(billSourceFieldMap[currentColumn.sourceTable || ''] || []).map((fieldName) => (
                            <option key={fieldName} value={fieldName} />
                          ))}
                        </datalist>
                      </div>
                    </div>
                  </section>
                )}

                <section className={compactCardClass}>
                  <div className={sectionTitleClass}>
                    <span className="material-symbols-outlined text-[18px] text-primary">toggle_on</span>
                    <h4>{isConditionConfig ? '条件属性' : '交互属性'}</h4>
                  </div>
                  <div className="grid gap-3">
                    {commonPropertySwitches.map((item) => (
                      <label
                        key={item.key}
                        className="flex items-start gap-3 rounded-2xl border border-slate-200/70 bg-slate-50/70 px-3.5 py-3 cursor-pointer transition-colors hover:border-primary/20 hover:bg-white dark:border-slate-700 dark:bg-slate-900/35 dark:hover:bg-slate-900/55"
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5 rounded border-slate-300 text-primary focus:ring-primary"
                          checked={Boolean(currentColumn[item.key])}
                          onChange={(e) => updateColumn({ [item.key]: e.target.checked })}
                        />
                        <div>
                          <div className="text-[13px] font-bold text-slate-700 dark:text-slate-100">{item.label}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </section>
              </>
            ) : (
              <>
                <section className={compactCardClass}>
                  <div className={sectionTitleClass}>
                    <span className="material-symbols-outlined text-[18px] text-primary">toggle_on</span>
                    <h4>高级属性</h4>
                  </div>
                  <div className="grid gap-3">
                    {advancedPropertySwitches.map((item) => (
                      <label
                        key={item.key}
                        className="flex items-start gap-3 rounded-2xl border border-slate-200/70 bg-slate-50/70 px-3.5 py-3 cursor-pointer transition-colors hover:border-primary/20 hover:bg-white dark:border-slate-700 dark:bg-slate-900/35 dark:hover:bg-slate-900/55"
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5 rounded border-slate-300 text-primary focus:ring-primary"
                          checked={Boolean(currentColumn[item.key])}
                          onChange={(e) => updateColumn({ [item.key]: e.target.checked })}
                        />
                        <div>
                          <div className="text-[13px] font-bold text-slate-700 dark:text-slate-100">{item.label}</div>
                        </div>
                      </label>
                    ))}
                    <div>
                      <label className={mutedLabelClass}>帮助文案</label>
                      <textarea
                        rows={3}
                        value={currentColumn.helpText}
                        onChange={(e) => updateColumn({ helpText: e.target.value })}
                  placeholder="输入字段说明"
                        className={fieldClass}
                      />
                    </div>
                  </div>
                </section>

                <section className={compactCardClass}>
                  <div className={sectionTitleClass}>
                    <span className="material-symbols-outlined text-[18px] text-primary">hub</span>
                    <h4>{isConditionConfig ? '查询联动' : '业务联动'}</h4>
                  </div>
                  <div className="grid gap-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className={mutedLabelClass}>{isConditionConfig ? '下拉数据 / 值集' : '关联字典 / 值集'}</label>
                        <input
                          type="text"
                          value={currentColumn.dictCode}
                          onChange={(e) => updateColumn({ dictCode: e.target.value })}
                          placeholder={isConditionConfig ? '例如：正常,停用,草稿' : '例如：material_status'}
                          className={fieldClass}
                        />
                      </div>
                      <div>
                        <label className={mutedLabelClass}>{isConditionConfig ? '默认表达式' : '公式 / 计算表达式'}</label>
                        <input
                          type="text"
                          value={currentColumn.formula}
                          onChange={(e) => updateColumn({ formula: e.target.value })}
                          placeholder={isConditionConfig ? '例如：today() / 本月 / 当前组织' : '例如：price * qty'}
                          className={fieldClass}
                        />
                      </div>
                    </div>
                    <div>
                      <label className={mutedLabelClass}>{isConditionConfig ? '条件 SQL / 取数逻辑' : '关联 SQL'}</label>
                      <textarea
                        rows={3}
                        value={currentColumn.relationSql}
                        onChange={(e) => updateColumn({ relationSql: e.target.value })}
                        placeholder={isConditionConfig ? 'SELECT code, name FROM ...' : 'SELECT id, name FROM ... '}
                        className={textareaClass}
                      />
                    </div>
                    {isConditionConfig && (
                      <div>
                        <label className={mutedLabelClass}>联动 SQL / 条件表达式</label>
                        <textarea
                          rows={3}
                          value={currentColumn.dynamicSql}
                          onChange={(e) => updateColumn({ dynamicSql: e.target.value })}
                          placeholder="WHERE org_id = ${orgId} AND enable = 1"
                          className={textareaClass}
                        />
                      </div>
                    )}
                  </div>
                </section>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  const columnOperationPanel = renderColumnOperationPanel();
  const activeDocumentConditionScope = isTreePaneVisible ? documentConditionScope : 'main';
  const getConditionWorkbenchRowCount = useCallback((scope: 'left' | 'main') => (
    scope === 'left' ? leftConditionWorkbenchConfig.rows : mainConditionWorkbenchConfig.rows
  ), [leftConditionWorkbenchConfig.rows, mainConditionWorkbenchConfig.rows]);
  const getNextConditionWorkbenchRow = useCallback((scope: 'left' | 'main', currentLength: number) => (
    ((currentLength % Math.max(CONDITION_PANEL_MIN_ROWS, getConditionWorkbenchRowCount(scope))) + 1)
  ), [getConditionWorkbenchRowCount]);
  const mainDocumentConditionActivate = useCallback((id: string) => {
    setSelectedArchiveNodeId('archive-filter');
    activateConditionSelection('main', id);
  }, [activateConditionSelection]);
  const mainDocumentConditionAdd = useCallback(() => {
    const currentLength = mainFilterFields.length;
    const next = buildConditionField(currentLength + 1, {
      panelRow: getNextConditionWorkbenchRow('main', currentLength),
    });
    setMainFilterFields((prev) => [...prev, next]);
    setSelectedMainFiltersForDelete([next.id]);
    setSelectedArchiveNodeId('archive-filter');
    activateConditionSelection('main', next.id);
  }, [activateConditionSelection, getNextConditionWorkbenchRow, mainFilterFields.length]);
  const mainDocumentConditionDelete = useCallback(() => {
    deleteSelectedConditions('main', selectedMainFiltersForDelete);
  }, [deleteSelectedConditions, selectedMainFiltersForDelete]);
  const mainDocumentConditionConfig = useMemo(() => ({
    fields: mainFilterFields,
    selectedId: selectedMainFilterId,
    selectedIds: selectedMainFiltersForDelete,
    setSelectedIds: setSelectedMainFiltersForDelete,
    setFields: setMainFilterFields,
    scope: 'main' as const,
    rowCount: mainConditionWorkbenchConfig.rows,
    onActivate: mainDocumentConditionActivate,
    onAdd: mainDocumentConditionAdd,
    onDelete: mainDocumentConditionDelete,
  }), [
    mainConditionWorkbenchConfig.rows,
    mainDocumentConditionActivate,
    mainDocumentConditionAdd,
    mainDocumentConditionDelete,
    mainFilterFields,
    selectedMainFilterId,
    selectedMainFiltersForDelete,
  ]);
  const leftDocumentConditionActivate = useCallback((id: string) => {
    setSelectedArchiveNodeId('archive-left-filter');
    activateConditionSelection('left', id);
  }, [activateConditionSelection]);
  const leftDocumentConditionAdd = useCallback(() => {
    const currentLength = leftFilterFields.length;
    const next = buildConditionField(currentLength + 1, {
      name: `左侧条件 ${currentLength + 1}`,
      panelRow: getNextConditionWorkbenchRow('left', currentLength),
      sourceid: documentConditionOwnerSourceId,
      formKey: documentConditionOwnerFieldKey,
    });
    setLeftFilterFields((prev) => [...prev, next]);
    setSelectedLeftFiltersForDelete([next.id]);
    setSelectedArchiveNodeId('archive-left-filter');
    activateConditionSelection('left', next.id);
  }, [
    activateConditionSelection,
    documentConditionOwnerFieldKey,
    documentConditionOwnerSourceId,
    getNextConditionWorkbenchRow,
    leftFilterFields.length,
  ]);
  const leftDocumentConditionDelete = useCallback(() => {
    deleteSelectedConditions('left', selectedLeftFiltersForDelete);
  }, [deleteSelectedConditions, selectedLeftFiltersForDelete]);
  const leftDocumentConditionConfig = useMemo(() => {
    if (!treeRelationColumn) return null;

    return {
      fields: leftFilterFields,
      selectedId: selectedLeftFilterId,
      selectedIds: selectedLeftFiltersForDelete,
      setSelectedIds: setSelectedLeftFiltersForDelete,
      setFields: setLeftFilterFields,
      scope: 'left' as const,
      rowCount: leftConditionWorkbenchConfig.rows,
      onActivate: leftDocumentConditionActivate,
      onAdd: leftDocumentConditionAdd,
      onDelete: leftDocumentConditionDelete,
    };
  }, [
    leftConditionWorkbenchConfig.rows,
    leftDocumentConditionActivate,
    leftDocumentConditionAdd,
    leftDocumentConditionDelete,
    leftFilterFields,
    selectedLeftFilterId,
    selectedLeftFiltersForDelete,
    treeRelationColumn,
  ]);
  const getConditionWorkbenchConfig = (scope: 'left' | 'main') => (
    scope === 'left' ? leftConditionWorkbenchConfig : mainConditionWorkbenchConfig
  );
  const setConditionWorkbenchConfig = (
    scope: 'left' | 'main',
    updater: ConditionWorkbenchConfig | ((prev: ConditionWorkbenchConfig) => ConditionWorkbenchConfig),
  ) => {
    const applyUpdate = (prev: ConditionWorkbenchConfig) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      return {
        rows: clampValue(
          Number.isFinite(Number(next.rows)) ? Number(next.rows) : prev.rows,
          CONDITION_PANEL_MIN_ROWS,
          CONDITION_PANEL_MAX_ROWS,
        ),
        bulkDraft: next.bulkDraft ?? prev.bulkDraft,
      };
    };

    if (scope === 'left') {
      setLeftConditionWorkbenchConfig((prev) => applyUpdate(prev));
      return;
    }

    setMainConditionWorkbenchConfig((prev) => applyUpdate(prev));
  };
  const parseConditionWorkbenchDraft = (text: string) => (
    text
      .split(/[\t\n,，;；]/)
      .map((item) => item.trim())
      .filter(Boolean)
  );
  const buildConditionSourceFieldKey = (name: string) => {
    const normalized = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    return normalized;
  };
  const createScopedConditionFields = (scope: 'left' | 'main', names: string[], currentLength: number) => (
    names.map((name, index) => {
      const rowCount = getConditionWorkbenchRowCount(scope);
      return buildConditionField(currentLength + index + 1, {
        name,
        type: /日期|时间/.test(name) ? '日期框' : '文本',
        placeholder: /日期|时间/.test(name) ? `请选择${name}` : `请输入${name}`,
        sourceField: buildConditionSourceFieldKey(name),
        panelRow: ((currentLength + index) % Math.max(CONDITION_PANEL_MIN_ROWS, rowCount)) + 1,
        ...(scope === 'left' && treeRelationColumn ? {
          sourceid: documentConditionOwnerSourceId,
          formKey: documentConditionOwnerFieldKey,
        } : {}),
      });
    })
  );
  const applyConditionWorkbenchDraft = (scope: 'left' | 'main', replace = false) => {
    const config = getConditionWorkbenchConfig(scope);
    const names = parseConditionWorkbenchDraft(config.bulkDraft);
    if (names.length === 0) {
      showToast('请先粘贴条件名称');
      return;
    }

    const currentFields = scope === 'left' ? leftFilterFields : mainFilterFields;
    const nextFields = createScopedConditionFields(scope, names, replace ? 0 : currentFields.length);
    const mergedFields = replace ? nextFields : [...currentFields, ...nextFields];

    if (scope === 'left') {
      setLeftFilterFields(mergedFields);
      setSelectedLeftFiltersForDelete(nextFields.map((field) => field.id));
      setSelectedArchiveNodeId('archive-left-filter');
    } else {
      setMainFilterFields(mergedFields);
      setSelectedMainFiltersForDelete(nextFields.map((field) => field.id));
      setSelectedArchiveNodeId('archive-filter');
    }

    setConditionWorkbenchConfig(scope, (prev) => ({ ...prev, bulkDraft: '' }));
    activateConditionPanelSelection(scope);
    showToast(replace ? `已重建 ${nextFields.length} 个条件` : `已新增 ${nextFields.length} 个条件`);
  };
  const handleDocumentConditionScopeSwitch = useCallback((nextScope: 'left' | 'main') => {
    setDocumentConditionScope(nextScope);
    if (selectedConditionPanelScope) {
      activateConditionPanelSelection(nextScope);
    }
  }, [activateConditionPanelSelection, selectedConditionPanelScope]);

  const renderDocumentTreePanel = () => {
    if (!treeRelationColumn) return null;

    return (
      <div style={workspaceThemeVars} className="cloudy-glass-panel flex h-full min-h-0 flex-col overflow-hidden rounded-[28px] border border-white/70">
        <div className="min-h-0 flex flex-1 flex-col overflow-hidden">
          <div
            className="scrollbar-none min-h-0 flex-1 overflow-auto bg-white/70 px-3 py-3 outline-none dark:bg-slate-900/88"
            tabIndex={0}
            onPaste={(event) => handlePasteColumns(event, setLeftTableColumns)}
          >
            {documentTreeTableBuilderNode}
          </div>
        </div>
      </div>
    );
  };

  const renderDocumentGridToolbar = (
    columns: any[],
    title: string,
    selectedCount: number,
    onDelete: () => void,
    onAdd: () => void,
    extraActions?: React.ReactNode,
    filterConfig?: {
      fields: any[];
      selectedId: string | null;
      selectedIds: string[];
      setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
      onActivate: (id: string) => void;
      onAdd: () => void;
      onDelete: () => void;
      setFields: React.Dispatch<React.SetStateAction<any[]>>;
      scope: 'left' | 'main' | 'detail';
    },
    tableConfigAction?: {
      active?: boolean;
      onSelect: () => void;
    },
    options?: {
      hideActionBar?: boolean;
      hideFilterBar?: boolean;
      hideFilterQuickActions?: boolean;
      filterAccessory?: React.ReactNode;
      filterRuntimeRules?: string;
    },
  ) => (
    <MemoDocumentGridToolbar
      columns={columns}
      title={title}
      selectedCount={selectedCount}
      onDelete={onDelete}
      onAdd={onAdd}
      extraActions={extraActions}
      filterConfig={filterConfig}
      tableConfigAction={tableConfigAction}
      options={options}
      activeResize={activeResize}
      onSetBuilderSelectionContextMenu={setBuilderSelectionContextMenu}
      renderFieldPreview={renderFieldPreview}
      startResize={startResize}
      autoFitColumnWidth={autoFitColumnWidth}
    />
  );

  const clearBuilderSelectionContextMenu = useCallback(() => {
    setBuilderSelectionContextMenu(null);
  }, []);
  const documentConditionToolbarNode = (
    <MemoDocumentConditionWorkbench
      activeScope={activeDocumentConditionScope as ConditionWorkbenchScope}
      canSwitchScope={Boolean(leftDocumentConditionConfig)}
      mainConfig={mainDocumentConditionConfig}
      leftConfig={leftDocumentConditionConfig}
      activeResize={activeResize}
      conditionWorkbenchSensors={conditionWorkbenchSensors}
      onScopeSwitch={handleDocumentConditionScopeSwitch}
      onActivatePanel={activateConditionPanelSelection}
      onClearBuilderSelectionContextMenu={clearBuilderSelectionContextMenu}
      setActiveResize={setActiveResize}
      scheduleResizePreview={scheduleResizePreview}
      clearResizePreview={clearResizePreview}
      autoFitColumnWidth={autoFitColumnWidth}
    />
  );

  const renderDocumentDetailWorkbench = () => {
    const detailCols = detailTableColumns[activeTab] || [];
    const detailBoardTheme = getDetailBoardTheme(workspaceTheme);

    return (
      <div className={cn('relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-transparent', detailBoardTheme.tableSurface)}>
        <div className="px-3 py-2.5">
          {renderDetailTabStrip({ addLabel: '新页签', showModeBadge: false })}
        </div>
        {currentDetailFillType === '表格' ? (
          <div
            className="scrollbar-none min-h-0 flex-1 overflow-auto bg-transparent px-3 pb-3 pt-1 outline-none"
            tabIndex={0}
            onPaste={(e) => {
              const text = e.clipboardData.getData('text');
              if (!text) return;
              const newColNames = text.split(/[\t\n]/).map((s) => s.trim()).filter(Boolean);
              if (newColNames.length > 0) {
                e.preventDefault();
                const newCols = newColNames.map((name, i) => buildColumn('d_col', (detailCols.length || 0) + i + 1, { name }));
                setDetailTableColumns((prev) => ({
                  ...prev,
                  [activeTab]: [...(prev[activeTab] || []), ...newCols],
                }));
              }
            }}
          >
            {documentDetailTableBuilderNode}
          </div>
        ) : (
          <div className="min-h-0 flex-1 bg-transparent px-3 pb-3 pt-1">
            {renderDetailFillPlaceholder()}
          </div>
        )}
      </div>
    );
  };

  const renderPreviewContextMenu = () => {
    if (!previewContextMenu) return null;
    const enabledCount = previewContextMenu.items.filter((item: any) => !item.disabled && !item.disabledCondition).length;

    return (
      <div
        className="fixed inset-0 z-[75] bg-slate-950/8 backdrop-blur-[1.5px]"
        onClick={() => setPreviewContextMenu(null)}
      >
        <div
          className="absolute min-w-[284px] overflow-hidden rounded-[24px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,249,253,0.99))] p-2.5 shadow-[0_36px_90px_-30px_rgba(15,23,42,0.56)] backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/96"
          style={{
            left: Math.min(previewContextMenu.x, window.innerWidth - 308),
            top: Math.min(previewContextMenu.y, window.innerHeight - 280),
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="overflow-hidden rounded-[20px] border border-slate-200/70 bg-white/84 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] dark:border-slate-700 dark:bg-slate-900/70">
            <div className="border-b border-slate-200/70 px-4 py-3 dark:border-slate-700">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex size-10 items-center justify-center rounded-2xl bg-[#1686e3]/10 text-[#1686e3]">
                    <span className="material-symbols-outlined text-[18px]">right_click</span>
                  </div>
                  <div>
                    <div className="text-[13px] font-bold text-slate-800 dark:text-slate-100">
                      {previewContextMenu.scope === 'main' ? '主表右键菜单' : '明细右键菜单'}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-400">第 {previewContextMenu.rowId} 行 · {enabledCount} 个可用操作</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewContextMenu(null)}
                  className="inline-flex size-8 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>
            </div>
            <div className="px-2 py-2">
              {previewContextMenu.items.map((item: any) => {
                const isDisabled = Boolean(item.disabled) || Boolean(item.disabledCondition);

                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => {
                      if (isDisabled) return;
                      showToast(`已触发右键动作：${item.label}`);
                      setPreviewContextMenu(null);
                    }}
                    className={`flex w-full items-center gap-3 rounded-[16px] border border-transparent px-3 py-3 text-left transition-all ${
                      isDisabled
                        ? 'cursor-not-allowed opacity-55'
                        : 'hover:border-[#cfe4fd] hover:bg-[#eef6ff] hover:shadow-[0_14px_24px_-22px_rgba(22,134,227,0.55)] dark:hover:border-slate-700 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className={`flex size-9 shrink-0 items-center justify-center rounded-2xl ${
                      isDisabled ? 'bg-slate-100 text-slate-300 dark:bg-slate-800 dark:text-slate-600' : 'bg-[#1686e3]/10 text-[#1686e3]'
                    }`}>
                      <span className="material-symbols-outlined text-[16px]">{isDisabled ? 'block' : 'subdirectory_arrow_right'}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className={`truncate text-[12px] font-bold ${
                        isDisabled ? 'text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-100'
                      }`}>
                        {item.label || '未命名菜单'}
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="truncate rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                          {item.actionKey || '未配置动作'}
                        </span>
                        {isDisabled && (
                          <span className="truncate text-[10px] text-rose-400">
                            禁用: {item.disabledCondition || '手动禁用'}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderBuilderSelectionContextMenu = () => {
    if (!builderSelectionContextMenu) return null;

    const count = builderSelectionContextMenu.ids.length;
    const isColumnMenu = builderSelectionContextMenu.kind === 'column';
    const scopeLabel = isColumnMenu
      ? builderSelectionContextMenu.scope === 'left'
        ? '左侧列'
        : builderSelectionContextMenu.scope === 'detail'
          ? '明细列'
          : '主表列'
      : builderSelectionContextMenu.scope === 'left'
        ? '左侧条件'
        : builderSelectionContextMenu.scope === 'detail'
          ? '明细条件'
          : '查询条件';
    const title = isColumnMenu ? '字段批量操作' : '条件批量操作';
    const description = `${scopeLabel} · 已选 ${count} 项`;
    const deleteLabel = isColumnMenu ? `删除所选列${count > 1 ? ` (${count})` : ''}` : `删除所选条件${count > 1 ? ` (${count})` : ''}`;
    const handleDelete = () => {
      if (isColumnMenu) {
        deleteSelectedColumns(builderSelectionContextMenu.scope, builderSelectionContextMenu.ids);
        return;
      }

      deleteSelectedConditions(builderSelectionContextMenu.scope, builderSelectionContextMenu.ids);
    };

    return (
      <div
        className="fixed inset-0 z-[76]"
        onClick={() => setBuilderSelectionContextMenu(null)}
      >
        <div
          className="absolute min-w-[248px] overflow-hidden rounded-[22px] border border-white/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.985),rgba(246,250,255,0.99))] p-2 shadow-[0_30px_72px_-28px_rgba(15,23,42,0.36)] backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/96"
          style={{
            left: Math.min(builderSelectionContextMenu.x, window.innerWidth - 268),
            top: Math.min(builderSelectionContextMenu.y, window.innerHeight - 180),
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="overflow-hidden rounded-[18px] border border-slate-200/70 bg-white/92 dark:border-slate-700 dark:bg-slate-900/72">
            <div className="border-b border-slate-200/70 px-4 py-3 dark:border-slate-700">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex size-9 items-center justify-center rounded-2xl bg-[#1686e3]/10 text-[#1686e3]">
                    <span className="material-symbols-outlined text-[17px]">select_check_box</span>
                  </div>
                  <div>
                    <div className="text-[13px] font-bold text-slate-800 dark:text-slate-100">{title}</div>
                    <div className="mt-1 text-[11px] text-slate-400">{description}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setBuilderSelectionContextMenu(null)}
                  className="inline-flex size-8 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>
            </div>
            <div className="p-2">
              <button
                type="button"
                onClick={handleDelete}
                className="flex w-full items-center gap-3 rounded-[16px] border border-transparent px-3 py-3 text-left transition-all hover:border-rose-200 hover:bg-rose-50 hover:shadow-[0_16px_28px_-24px_rgba(244,63,94,0.35)] dark:hover:border-rose-400/20 dark:hover:bg-rose-500/10"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500">
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12px] font-bold text-slate-700 dark:text-slate-100">{deleteLabel}</div>
                  <div className="mt-1 text-[10px] text-slate-400">右键删除当前多选内容</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderLongTextEditorModal = () => {
    if (!longTextEditorState) return null;

    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[78] flex items-center justify-center bg-slate-950/40 p-6 backdrop-blur-sm"
          onClick={() => setLongTextEditorState(null)}
        >
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-[28px] border border-white/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,250,255,0.99))] shadow-[0_40px_96px_-32px_rgba(15,23,42,0.42)] dark:border-slate-700 dark:bg-slate-900/96"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200/70 px-5 py-4 dark:border-slate-700">
              <div className="min-w-0">
                <div className="text-[15px] font-bold text-slate-800 dark:text-slate-100">{longTextEditorState.title}</div>
                <div className="mt-1 text-[12px] text-slate-400">长内容直接在这里编辑，保存后会回写到当前配置项。</div>
              </div>
              <button
                type="button"
                onClick={() => setLongTextEditorState(null)}
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-2xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
            <div className="min-h-0 flex-1 px-5 py-4">
              <textarea
                rows={20}
                value={longTextEditorState.draft}
                onChange={(event) => setLongTextEditorState((prev) => (prev ? { ...prev, draft: event.target.value } : prev))}
                placeholder={longTextEditorState.placeholder}
                className="h-full min-h-[420px] w-full resize-none rounded-[22px] border border-slate-200/80 bg-white/94 px-4 py-3 font-mono text-[12px] leading-6 text-slate-700 outline-none transition focus:border-[color:var(--workspace-accent-border-strong)] focus:ring-4 focus:ring-[color:var(--workspace-accent-soft)] dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100"
              />
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-slate-200/70 px-5 py-4 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setLongTextEditorState(null)}
                className="inline-flex h-10 items-center justify-center rounded-[14px] border border-slate-200/80 bg-white px-4 text-[12px] font-bold text-slate-500 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  longTextEditorState.onSave(longTextEditorState.draft);
                  setLongTextEditorState(null);
                }}
                className="inline-flex h-10 items-center justify-center rounded-[14px] bg-[color:var(--workspace-accent)] px-4 text-[12px] font-bold text-white shadow-[0_18px_30px_-24px_var(--workspace-accent-shadow)] transition-colors hover:bg-[color:var(--workspace-accent-strong)]"
              >
                保存内容
              </button>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  };

  const renderArchiveLayoutEditorModalLegacy = () => {
    if (!isArchiveLayoutEditorOpen) return null;

    const archiveLayoutConfig = normalizedMainDetailBoardConfig;
    const selectedGroup = archiveLayoutConfig.groups.find((group: any) => group.id === selectedArchiveLayoutGroupId)
      ?? archiveLayoutConfig.groups[0]
      ?? null;
    const rowNumbers = selectedGroup
      ? Array.from({ length: getDetailBoardGroupRows(selectedGroup) }, (_, index) => index + 1)
      : [];
    const assignmentMap = new Map<string, string>();
    archiveLayoutConfig.groups.forEach((group: any) => {
      (group.columnIds ?? []).forEach((columnId: string) => {
        assignmentMap.set(columnId, group.id);
      });
    });
    const assignedFieldCount = archiveLayoutConfig.groups.reduce((sum: number, group: any) => sum + (group.columnIds?.length ?? 0), 0);

    const handlePaletteDragStart = (columnId: string) => (event: React.DragEvent<HTMLButtonElement>) => {
      setArchiveLayoutWorkbenchDrag({
        groupId: assignmentMap.get(columnId) ?? null,
        columnId,
      });
      setArchiveLayoutWorkbenchDropTarget(null);
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', columnId);
      }
    };
    const handlePaletteDragEnd = () => {
      setArchiveLayoutWorkbenchDrag(null);
      setArchiveLayoutWorkbenchDropTarget(null);
    };
    const handleRowDragOver = (groupId: string, rowNumber: number) => (event: React.DragEvent<HTMLDivElement>) => {
      if (!archiveLayoutWorkbenchDrag) return;
      event.preventDefault();
      event.stopPropagation();
      if (
        archiveLayoutWorkbenchDropTarget?.groupId !== groupId
        || archiveLayoutWorkbenchDropTarget?.row !== rowNumber
        || archiveLayoutWorkbenchDropTarget?.beforeId !== null
      ) {
        setArchiveLayoutWorkbenchDropTarget({ groupId, row: rowNumber, beforeId: null });
      }
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move';
      }
    };
    const handleRowDrop = (groupId: string, rowNumber: number) => (event: React.DragEvent<HTMLDivElement>) => {
      if (!archiveLayoutWorkbenchDrag) return;
      event.preventDefault();
      event.stopPropagation();
      assignArchiveLayoutColumn(groupId, archiveLayoutWorkbenchDrag.columnId, rowNumber);
      setArchiveLayoutWorkbenchDrag(null);
      setArchiveLayoutWorkbenchDropTarget(null);
    };
    const handleItemDragOver = (groupId: string, rowNumber: number, beforeId: string) => (event: React.DragEvent<HTMLDivElement>) => {
      if (!archiveLayoutWorkbenchDrag || archiveLayoutWorkbenchDrag.columnId === beforeId) return;
      event.preventDefault();
      event.stopPropagation();
      if (
        archiveLayoutWorkbenchDropTarget?.groupId !== groupId
        || archiveLayoutWorkbenchDropTarget?.row !== rowNumber
        || archiveLayoutWorkbenchDropTarget?.beforeId !== beforeId
      ) {
        setArchiveLayoutWorkbenchDropTarget({ groupId, row: rowNumber, beforeId });
      }
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move';
      }
    };
    const handleItemDrop = (groupId: string, rowNumber: number, beforeId: string) => (event: React.DragEvent<HTMLDivElement>) => {
      if (!archiveLayoutWorkbenchDrag || archiveLayoutWorkbenchDrag.columnId === beforeId) return;
      event.preventDefault();
      event.stopPropagation();
      assignArchiveLayoutColumn(groupId, archiveLayoutWorkbenchDrag.columnId, rowNumber, beforeId);
      setArchiveLayoutWorkbenchDrag(null);
      setArchiveLayoutWorkbenchDropTarget(null);
    };
    const handleGroupFieldDragStart = (groupId: string, columnId: string) => (event: React.DragEvent<HTMLDivElement>) => {
      setArchiveLayoutWorkbenchDrag({ groupId, columnId });
      setArchiveLayoutWorkbenchDropTarget(null);
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', `${groupId}:${columnId}`);
      }
    };
    const handleGroupFieldDragEnd = () => {
      setArchiveLayoutWorkbenchDrag(null);
      setArchiveLayoutWorkbenchDropTarget(null);
    };

    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[79] flex items-center justify-center bg-slate-950/42 p-5 backdrop-blur-sm"
          onClick={() => {
            setIsArchiveLayoutEditorOpen(false);
            setArchiveLayoutWorkbenchDrag(null);
            setArchiveLayoutWorkbenchDropTarget(null);
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.985 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={(event) => event.stopPropagation()}
            className="flex h-[88vh] w-full max-w-[1520px] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_44px_120px_-36px_rgba(15,23,42,0.42)] dark:border-slate-800 dark:bg-slate-950"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200/80 bg-slate-50/80 px-5 py-4 dark:border-slate-800 dark:bg-slate-950">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="flex size-9 items-center justify-center rounded-md border border-slate-200/80 bg-white text-[color:var(--workspace-accent)] dark:border-slate-800 dark:bg-slate-950">
                    <span className="material-symbols-outlined text-[18px]">dashboard_customize</span>
                  </div>
                  <div className="text-[15px] font-semibold text-slate-900 dark:text-slate-50">主表分组布局编辑器</div>
                </div>
                <div className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">
                  在这里新建分组、设置行数，并把主表字段拖入每一行完成布局。
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsArchiveLayoutEditorOpen(false);
                  setArchiveLayoutWorkbenchDrag(null);
                  setArchiveLayoutWorkbenchDropTarget(null);
                }}
                className="inline-flex size-9 items-center justify-center rounded-md border border-slate-200/80 bg-white text-slate-500 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>

            <div className="grid min-h-0 flex-1 gap-0 xl:grid-cols-[260px_minmax(0,1fr)_320px]">
              <div className="min-h-0 border-r border-slate-200/80 bg-slate-50/55 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                <div className={shadcnSectionCardClass}>
                  <div className={shadcnSectionTitleClass}>
                    <span className="material-symbols-outlined text-[17px] text-[color:var(--workspace-accent)]">tab_group</span>
                    <h4>分组列表</h4>
                  </div>
                  <div className="mb-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                    <button
                      type="button"
                      onClick={addArchiveLayoutGroup}
                      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-[color:var(--workspace-accent)] px-3 text-[12px] font-semibold text-white transition-colors hover:bg-[color:var(--workspace-accent-strong)]"
                    >
                      <span className="material-symbols-outlined text-[15px]">add</span>
                      新增分组
                    </button>
                    <button
                      type="button"
                      onClick={clearArchiveLayoutGroups}
                      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-600 transition-colors hover:border-rose-200 hover:text-rose-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
                    >
                      <span className="material-symbols-outlined text-[15px]">layers_clear</span>
                      清空
                    </button>
                  </div>
                  <div className="mb-3 grid gap-2 sm:grid-cols-3 xl:grid-cols-1">
                    <div className={shadcnInfoCardClass}>
                      <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400">分组</div>
                      <div className="mt-1 text-[13px] font-semibold text-slate-800 dark:text-slate-100">{archiveLayoutConfig.groups.length}</div>
                    </div>
                    <div className={shadcnInfoCardClass}>
                      <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400">已排布</div>
                      <div className="mt-1 text-[13px] font-semibold text-slate-800 dark:text-slate-100">{assignedFieldCount}</div>
                    </div>
                    <div className={shadcnInfoCardClass}>
                      <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400">待排布</div>
                      <div className="mt-1 text-[13px] font-semibold text-slate-800 dark:text-slate-100">{Math.max(0, mainTableColumns.length - assignedFieldCount)}</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {archiveLayoutConfig.groups.length > 0 ? archiveLayoutConfig.groups.map((group: any, index: number) => {
                      const isSelected = selectedGroup?.id === group.id;
                      return (
                        <button
                          key={group.id}
                          type="button"
                          onClick={() => setSelectedArchiveLayoutGroupId(group.id)}
                          className={`flex w-full items-start justify-between gap-3 rounded-md border px-3 py-2.5 text-left transition-colors ${
                            isSelected
                              ? 'border-[color:var(--workspace-accent-border-strong)] bg-[color:var(--workspace-accent-soft)]'
                              : 'border-slate-200 bg-white hover:border-[color:var(--workspace-accent-border)] dark:border-slate-800 dark:bg-slate-950'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="truncate text-[12px] font-semibold text-slate-800 dark:text-slate-100">
                              {group.name || `分组 ${index + 1}`}
                            </div>
                            <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                              {(group.columnIds?.length ?? 0)} 项 · {getDetailBoardGroupRows(group)} 行
                            </div>
                          </div>
                          {isSelected ? <span className="material-symbols-outlined text-[15px] text-[color:var(--workspace-accent)]">check_circle</span> : null}
                        </button>
                      );
                    }) : (
                      <div className="rounded-md border border-dashed border-slate-200/80 bg-slate-50/70 px-3 py-8 text-center text-[12px] text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
                        还没有分组
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="min-h-0 border-r border-slate-200/80 p-4 dark:border-slate-800">
                <div className="flex h-full min-h-0 flex-col gap-4">
                  {selectedGroup ? (
                    <>
                      <div className={shadcnSectionCardClass}>
                        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_120px_auto]">
                          <div>
                            <label className={shadcnMutedLabelClass}>分组名称</label>
                            <input
                              type="text"
                              value={selectedGroup.name}
                              onChange={(event) => updateArchiveLayoutGroup(selectedGroup.id, { name: event.target.value })}
                              className={shadcnFieldClass}
                            />
                          </div>
                          <div>
                            <label className={shadcnMutedLabelClass}>控件行数</label>
                            <input
                              type="number"
                              min={DETAIL_BOARD_GROUP_MIN_ROWS}
                              max={DETAIL_BOARD_GROUP_MAX_ROWS}
                              value={getDetailBoardGroupRows(selectedGroup)}
                              onChange={(event) => {
                                const nextRows = clampValue(
                                  Number(event.target.value) || DETAIL_BOARD_GROUP_MIN_ROWS,
                                  DETAIL_BOARD_GROUP_MIN_ROWS,
                                  DETAIL_BOARD_GROUP_MAX_ROWS,
                                );
                                updateArchiveLayoutGroup(selectedGroup.id, (group: any) => ({
                                  ...group,
                                  rows: nextRows,
                                  columnRows: Object.fromEntries(
                                    (group.columnIds ?? []).map((columnId: string) => [
                                      columnId,
                                      clampValue(
                                        getDetailBoardGroupColumnRow(group, columnId),
                                        DETAIL_BOARD_GROUP_MIN_ROWS,
                                        nextRows,
                                      ),
                                    ]),
                                  ),
                                }));
                              }}
                              className={shadcnFieldClass}
                            />
                          </div>
                          <div className="flex items-end">
                            <button
                              type="button"
                              onClick={() => removeArchiveLayoutGroup(selectedGroup.id)}
                              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-rose-200 bg-white px-3 text-[12px] font-semibold text-rose-500 transition-colors hover:bg-rose-50 dark:border-rose-500/20 dark:bg-slate-950"
                            >
                              <span className="material-symbols-outlined text-[14px]">delete</span>
                              删除分组
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className={`${shadcnSectionCardClass} flex min-h-0 flex-1 flex-col`}>
                        <div className={shadcnSectionTitleClass}>
                          <span className="material-symbols-outlined text-[17px] text-[color:var(--workspace-accent)]">dashboard</span>
                          <h4>分组字段排布</h4>
                        </div>
                        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
                          {rowNumbers.map((rowNumber) => {
                            const rowColumns = (selectedGroup.columnIds ?? [])
                              .filter((columnId: string) => getDetailBoardGroupColumnRow(selectedGroup, columnId) === rowNumber)
                              .map((columnId: string) => mainTableColumns.find((column: any) => column.id === columnId))
                              .filter(Boolean);
                            const isRowDropTarget = archiveLayoutWorkbenchDropTarget?.groupId === selectedGroup.id
                              && archiveLayoutWorkbenchDropTarget?.row === rowNumber
                              && archiveLayoutWorkbenchDropTarget?.beforeId === null;

                            return (
                              <div key={`${selectedGroup.id}-row-${rowNumber}`} className="space-y-1.5">
                                <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                  <span>第 {rowNumber} 行</span>
                                  <span className="h-px flex-1 bg-slate-200/80 dark:bg-slate-800" />
                                </div>
                                <div
                                  onDragOver={handleRowDragOver(selectedGroup.id, rowNumber)}
                                  onDrop={handleRowDrop(selectedGroup.id, rowNumber)}
                                  className={`flex min-h-[60px] items-center overflow-x-auto rounded-md border px-2 py-2 transition-colors ${
                                    isRowDropTarget
                                      ? 'border-[color:var(--workspace-accent-border-strong)] bg-[color:var(--workspace-accent-soft)]'
                                      : rowColumns.length > 0
                                        ? 'border-slate-200/80 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/35'
                                        : 'border-dashed border-slate-200/80 bg-slate-50/35 dark:border-slate-800 dark:bg-slate-900/20'
                                  }`}
                                >
                                  <div className="flex min-w-full items-center gap-2">
                                    {rowColumns.length > 0 ? rowColumns.map((column: any, columnIndex: number) => {
                                      const normalizedColumn = normalizeColumn(column);
                                      const isInsertTarget = archiveLayoutWorkbenchDropTarget?.groupId === selectedGroup.id
                                        && archiveLayoutWorkbenchDropTarget?.row === rowNumber
                                        && archiveLayoutWorkbenchDropTarget?.beforeId === column.id
                                        && archiveLayoutWorkbenchDrag?.columnId !== column.id;

                                      return (
                                        <div
                                          key={column.id}
                                          draggable
                                          onDragStart={handleGroupFieldDragStart(selectedGroup.id, column.id)}
                                          onDragEnd={handleGroupFieldDragEnd}
                                          onDragOver={handleItemDragOver(selectedGroup.id, rowNumber, column.id)}
                                          onDrop={handleItemDrop(selectedGroup.id, rowNumber, column.id)}
                                          className="group relative flex min-w-[220px] max-w-[320px] flex-1 items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 py-2 transition-colors hover:border-[color:var(--workspace-accent-border)] dark:border-slate-800 dark:bg-slate-950"
                                        >
                                          {isInsertTarget ? (
                                            <span className="pointer-events-none absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-[color:var(--workspace-accent)]" />
                                          ) : null}
                                          <div className="min-w-0 flex-1">
                                            <div className="truncate text-[12px] font-semibold text-slate-800 dark:text-slate-100">
                                              {normalizedColumn.name}
                                            </div>
                                            <div className="mt-1 flex min-w-0 items-center gap-2">
                                              <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                                                {normalizedColumn.type}
                                              </span>
                                              <div className="min-w-0 flex-1 truncate text-[11px] text-slate-400 dark:text-slate-500">
                                                {renderFieldPreview(normalizedColumn, columnIndex, 'filter')}
                                              </div>
                                            </div>
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => removeArchiveLayoutColumn(selectedGroup.id, column.id)}
                                            className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-500 dark:text-slate-600"
                                            title="移出当前分组"
                                          >
                                            <span className="material-symbols-outlined text-[14px]">close</span>
                                          </button>
                                        </div>
                                      );
                                    }) : (
                                      <div className="text-[12px] text-slate-400 dark:text-slate-500">
                                        直接把右侧主表字段拖到这一行。
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex h-full items-center justify-center rounded-md border border-dashed border-slate-200/80 bg-slate-50/60 text-center text-[13px] text-slate-500 dark:border-slate-800 dark:bg-slate-900/30 dark:text-slate-400">
                      先在左侧新建或选择一个分组。
                    </div>
                  )}
                </div>
              </div>

              <div className="min-h-0 bg-slate-50/55 p-4 dark:bg-slate-950/60">
                <div className={`${shadcnSectionCardClass} flex h-full min-h-0 flex-col`}>
                  <div className={shadcnSectionTitleClass}>
                    <span className="material-symbols-outlined text-[17px] text-[color:var(--workspace-accent)]">toc</span>
                    <h4>主表字段</h4>
                  </div>
                  <div className="mb-3 text-[11px] leading-5 text-slate-500 dark:text-slate-400">
                    从这里直接拖字段到中间分组行里。已经排布的字段也可以拖走重排或换组。
                  </div>
                  <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
                    {mainTableColumns.map((column: any) => {
                      const normalizedColumn = normalizeColumn(column);
                      const assignedGroupId = assignmentMap.get(column.id) ?? null;
                      const assignedGroup = archiveLayoutConfig.groups.find((group: any) => group.id === assignedGroupId);
                      const isInSelectedGroup = assignedGroupId === selectedGroup?.id;

                      return (
                        <button
                          key={`archive-layout-palette-${column.id}`}
                          type="button"
                          draggable
                          onDragStart={handlePaletteDragStart(column.id)}
                          onDragEnd={handlePaletteDragEnd}
                          onClick={() => {
                            if (!selectedGroup) return;
                            assignArchiveLayoutColumn(
                              selectedGroup.id,
                              column.id,
                              getDetailBoardGroupRows(selectedGroup),
                            );
                          }}
                          className={`flex w-full items-start gap-3 rounded-md border px-3 py-2.5 text-left transition-colors ${
                            isInSelectedGroup
                              ? 'border-[color:var(--workspace-accent-border-strong)] bg-[color:var(--workspace-accent-soft)]'
                              : 'border-slate-200 bg-white hover:border-[color:var(--workspace-accent-border)] dark:border-slate-800 dark:bg-slate-950'
                          }`}
                        >
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-slate-200/80 bg-slate-50 text-[color:var(--workspace-accent)] dark:border-slate-800 dark:bg-slate-900">
                            <span className="material-symbols-outlined text-[15px]">drag_indicator</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[12px] font-semibold text-slate-800 dark:text-slate-100">
                              {normalizedColumn.name}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5">
                              <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                                {normalizedColumn.type}
                              </span>
                              {assignedGroup ? (
                                <span className="inline-flex items-center rounded-md border border-slate-200/80 bg-white px-1.5 py-0.5 text-[10px] text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                                  {isInSelectedGroup ? '当前分组' : assignedGroup.name}
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-md border border-dashed border-slate-200/80 px-1.5 py-0.5 text-[10px] text-slate-400 dark:border-slate-800 dark:text-slate-500">
                                  未排布
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  };

  const renderArchiveLayoutCanvasModal = () => {
    if (!isArchiveLayoutEditorOpen) return null;

    const archiveLayoutConfig = normalizedMainDetailBoardConfig;
    const highlightedGroupId = selectedArchiveLayoutGroupId ?? archiveLayoutConfig.groups[0]?.id ?? null;
    const highlightedGroup = archiveLayoutConfig.groups.find((group: any) => group.id === highlightedGroupId) ?? null;
    const assignmentMap = new Map<string, string>();
    archiveLayoutConfig.groups.forEach((group: any) => {
      (group.columnIds ?? []).forEach((columnId: string) => {
        assignmentMap.set(columnId, group.id);
      });
    });
    const assignedFieldCount = archiveLayoutConfig.groups.reduce((sum: number, group: any) => sum + (group.columnIds?.length ?? 0), 0);
    const unassignedFieldCount = Math.max(0, mainTableColumns.length - assignedFieldCount);

    const closeEditor = () => {
      setIsArchiveLayoutEditorOpen(false);
      setArchiveLayoutWorkbenchDrag(null);
      setArchiveLayoutWorkbenchDropTarget(null);
    };

    const focusGroup = (groupId: string) => {
      setSelectedArchiveLayoutGroupId((prev) => (prev === groupId ? prev : groupId));
    };

    const updateGroupRows = (groupId: string, nextValue: number) => {
      const nextRows = clampValue(
        Number(nextValue) || DETAIL_BOARD_GROUP_MIN_ROWS,
        DETAIL_BOARD_GROUP_MIN_ROWS,
        DETAIL_BOARD_GROUP_MAX_ROWS,
      );
      updateArchiveLayoutGroup(groupId, (group: any) => ({
        ...group,
        rows: nextRows,
        columnRows: Object.fromEntries(
          (group.columnIds ?? []).map((columnId: string) => [
            columnId,
            clampValue(getDetailBoardGroupColumnRow(group, columnId), DETAIL_BOARD_GROUP_MIN_ROWS, nextRows),
          ]),
        ),
      }));
    };

    const handlePaletteDragStart = (columnId: string) => (event: React.DragEvent<HTMLButtonElement>) => {
      setArchiveLayoutWorkbenchDrag({
        groupId: assignmentMap.get(columnId) ?? null,
        columnId,
      });
      setArchiveLayoutWorkbenchDropTarget(null);
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', columnId);
      }
    };

    const handlePaletteDragEnd = () => {
      setArchiveLayoutWorkbenchDrag(null);
      setArchiveLayoutWorkbenchDropTarget(null);
    };

    const handleRowDragOver = (groupId: string, rowNumber: number) => (event: React.DragEvent<HTMLDivElement>) => {
      if (!archiveLayoutWorkbenchDrag) return;
      event.preventDefault();
      event.stopPropagation();
      focusGroup(groupId);
      if (
        archiveLayoutWorkbenchDropTarget?.groupId !== groupId
        || archiveLayoutWorkbenchDropTarget?.row !== rowNumber
        || archiveLayoutWorkbenchDropTarget?.beforeId !== null
      ) {
        setArchiveLayoutWorkbenchDropTarget({ groupId, row: rowNumber, beforeId: null });
      }
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move';
      }
    };

    const handleRowDrop = (groupId: string, rowNumber: number) => (event: React.DragEvent<HTMLDivElement>) => {
      if (!archiveLayoutWorkbenchDrag) return;
      event.preventDefault();
      event.stopPropagation();
      assignArchiveLayoutColumn(groupId, archiveLayoutWorkbenchDrag.columnId, rowNumber);
      focusGroup(groupId);
      setArchiveLayoutWorkbenchDrag(null);
      setArchiveLayoutWorkbenchDropTarget(null);
    };

    const handleItemDragOver = (groupId: string, rowNumber: number, beforeId: string) => (event: React.DragEvent<HTMLDivElement>) => {
      if (!archiveLayoutWorkbenchDrag || archiveLayoutWorkbenchDrag.columnId === beforeId) return;
      event.preventDefault();
      event.stopPropagation();
      focusGroup(groupId);
      if (
        archiveLayoutWorkbenchDropTarget?.groupId !== groupId
        || archiveLayoutWorkbenchDropTarget?.row !== rowNumber
        || archiveLayoutWorkbenchDropTarget?.beforeId !== beforeId
      ) {
        setArchiveLayoutWorkbenchDropTarget({ groupId, row: rowNumber, beforeId });
      }
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move';
      }
    };

    const handleItemDrop = (groupId: string, rowNumber: number, beforeId: string) => (event: React.DragEvent<HTMLDivElement>) => {
      if (!archiveLayoutWorkbenchDrag || archiveLayoutWorkbenchDrag.columnId === beforeId) return;
      event.preventDefault();
      event.stopPropagation();
      assignArchiveLayoutColumn(groupId, archiveLayoutWorkbenchDrag.columnId, rowNumber, beforeId);
      focusGroup(groupId);
      setArchiveLayoutWorkbenchDrag(null);
      setArchiveLayoutWorkbenchDropTarget(null);
    };

    const handleGroupFieldDragStart = (groupId: string, columnId: string) => (event: React.DragEvent<HTMLDivElement>) => {
      focusGroup(groupId);
      setArchiveLayoutWorkbenchDrag({ groupId, columnId });
      setArchiveLayoutWorkbenchDropTarget(null);
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', `${groupId}:${columnId}`);
      }
    };

    const handleGroupFieldDragEnd = () => {
      setArchiveLayoutWorkbenchDrag(null);
      setArchiveLayoutWorkbenchDropTarget(null);
    };

    const getGroupRowItems = (group: any, rowNumber: number) => (
      (group.columnIds ?? [])
        .filter((columnId: string) => getDetailBoardGroupColumnRow(group, columnId) === rowNumber)
        .map((columnId: string) => {
          const column = mainTableColumns.find((item: any) => item.id === columnId);
          if (!column) return null;
          const layoutMeta = getLayoutFieldWorkbenchMeta(column, group.columnWidths?.[columnId], group.columnHeights?.[columnId]);
          const liveWidth = getDetailBoardFieldLiveWidth(group.id, columnId, layoutMeta.width);
          const liveHeight = getDetailBoardFieldLiveHeight(group.id, columnId, layoutMeta.height);
          const liveMeta = getLayoutFieldWorkbenchMeta(column, liveWidth, liveHeight);
          return {
            id: columnId,
            field: column,
            liveWidth,
            liveHeight,
            liveMeta,
          };
        })
        .filter(Boolean)
    );

    const getRowBoundaryPositions = (rowItems: Array<{ liveWidth: number }>) => {
      let cursor = 0;
      return rowItems.map((item) => {
        cursor += item.liveWidth;
        const boundary = cursor;
        cursor += ARCHIVE_LAYOUT_LANE_GAP;
        return boundary;
      });
    };
    const getRowActiveBoundaryPosition = (
      rowItems: Array<{ id: string; liveWidth: number }>,
      columnId?: string | null,
    ) => {
      if (!columnId) return null;
      let cursor = 0;
      for (const item of rowItems) {
        cursor += item.liveWidth;
        if (item.id === columnId) {
          return cursor;
        }
        cursor += ARCHIVE_LAYOUT_LANE_GAP;
      }
      return null;
    };

    const renderGroupCanvas = (group: any) => {
      const rowCount = getDetailBoardGroupRows(group);
      const rowNumbers = Array.from({ length: rowCount }, (_, index) => index + 1);
      const isHighlighted = highlightedGroupId === group.id;

      return (
        <section
          key={group.id}
          onMouseDown={() => focusGroup(group.id)}
          className={`rounded-xl border px-3 py-3 transition-colors ${
            isHighlighted
              ? 'border-[color:var(--workspace-accent-border-strong)] bg-white shadow-[0_12px_30px_-28px_var(--workspace-accent-shadow)]'
              : 'border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950'
          }`}
        >
          <div className="mb-2.5 flex flex-wrap items-end gap-2.5">
            <div className="min-w-[220px] flex-[1.3]">
              <label className={shadcnMutedLabelClass}>分组名称</label>
              <input
                type="text"
                value={group.name}
                onChange={(event) => updateArchiveLayoutGroup(group.id, { name: event.target.value })}
                className={shadcnFieldClass}
              />
            </div>
            <div className="w-24">
              <label className={shadcnMutedLabelClass}>控件行数</label>
              <input
                type="number"
                min={DETAIL_BOARD_GROUP_MIN_ROWS}
                max={DETAIL_BOARD_GROUP_MAX_ROWS}
                value={rowCount}
                onChange={(event) => updateGroupRows(group.id, Number(event.target.value))}
                className={shadcnFieldClass}
              />
            </div>
            <div className="inline-flex h-10 min-w-[88px] items-center rounded-md border border-slate-200/80 bg-white px-3 text-[11px] font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
              {group.columnIds?.length ?? 0} 项
            </div>
            <button
              type="button"
              onClick={() => removeArchiveLayoutGroup(group.id)}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-rose-200 bg-white px-3 text-[12px] font-semibold text-rose-500 transition-colors hover:bg-rose-50 dark:border-rose-500/20 dark:bg-slate-950"
            >
              <span className="material-symbols-outlined text-[14px]">delete</span>
              删除分组
            </button>
          </div>

          <div className="space-y-2.5">
            {rowNumbers.map((rowNumber) => {
              const rowItems = getGroupRowItems(group, rowNumber);
              const previousRowItems = rowNumber > DETAIL_BOARD_GROUP_MIN_ROWS
                ? getGroupRowItems(group, rowNumber - 1)
                : [];
              const isRowDropTarget = archiveLayoutWorkbenchDropTarget?.groupId === group.id
                && archiveLayoutWorkbenchDropTarget?.row === rowNumber
                && archiveLayoutWorkbenchDropTarget?.beforeId === null;
              const isActiveResizeRow = activeDetailBoardResize?.groupId === group.id
                && rowItems.some((item: any) => item.id === activeDetailBoardResize.columnId);
              const previousRowGuidePositions = isActiveResizeRow ? getRowBoundaryPositions(previousRowItems) : [];
              const activeResizeBoundary = isActiveResizeRow
                ? getRowActiveBoundaryPosition(rowItems, activeDetailBoardResize?.columnId ?? null)
                : null;

              return (
                <div key={`${group.id}-row-${rowNumber}`}>
                  <div
                    onDragOver={handleRowDragOver(group.id, rowNumber)}
                    onDrop={handleRowDrop(group.id, rowNumber)}
                    className={`relative overflow-x-auto px-1 py-1.5 transition-colors ${
                      isRowDropTarget
                        ? 'rounded-lg bg-[color:var(--workspace-accent-soft)]/65 outline outline-1 outline-[color:var(--workspace-accent-border-strong)]'
                        : rowItems.length > 0
                          ? ''
                          : 'rounded-lg border border-dashed border-slate-200/80 bg-slate-50/55 dark:border-slate-800 dark:bg-slate-900/18'
                    }`}
                  >
                    {previousRowGuidePositions.length > 0 || activeResizeBoundary !== null ? (
                      <div className="pointer-events-none absolute inset-y-1 left-1 right-1">
                        {previousRowGuidePositions.map((position, guideIndex) => (
                          <span
                            key={`${group.id}-row-${rowNumber}-guide-${guideIndex}`}
                            data-archive-prev-row-guide="true"
                            className="absolute inset-y-0 w-px -translate-x-1/2 border-l border-dashed border-[color:var(--workspace-accent)]/80 after:absolute after:left-1/2 after:top-0 after:size-1.5 after:-translate-x-1/2 after:-translate-y-1/2 after:rounded-full after:bg-[color:var(--workspace-accent)] before:absolute before:bottom-0 before:left-1/2 before:size-1.5 before:-translate-x-1/2 before:translate-y-1/2 before:rounded-full before:bg-[color:var(--workspace-accent)]"
                            style={{ left: position }}
                          />
                        ))}
                        {activeResizeBoundary !== null ? (
                          <span
                            data-archive-active-row-guide="true"
                            className="absolute inset-y-[-3px] w-[3px] -translate-x-1/2 rounded-full bg-[color:var(--workspace-accent)] shadow-[0_0_0_1px_rgba(255,255,255,0.78),0_0_0_8px_var(--workspace-accent-soft)] dark:shadow-[0_0_0_1px_rgba(15,23,42,0.66),0_0_0_10px_rgba(37,99,235,0.18)]"
                            style={{ left: activeResizeBoundary }}
                          />
                        ) : null}
                      </div>
                    ) : null}
                    <div className="flex min-w-full items-start gap-2">
                      {rowItems.length > 0 ? rowItems.map((item: any, columnIndex: number) => {
                        const { field: column, liveWidth, liveHeight, liveMeta } = item;
                        const isInsertTarget = archiveLayoutWorkbenchDropTarget?.groupId === group.id
                          && archiveLayoutWorkbenchDropTarget?.row === rowNumber
                          && archiveLayoutWorkbenchDropTarget?.beforeId === column.id
                          && archiveLayoutWorkbenchDrag?.columnId !== column.id;

                        return (
                          <div
                            key={column.id}
                            data-detail-field-item="true"
                            draggable
                            role="button"
                            tabIndex={0}
                            onDragStart={handleGroupFieldDragStart(group.id, column.id)}
                            onDragEnd={handleGroupFieldDragEnd}
                            onDragOver={handleItemDragOver(group.id, rowNumber, column.id)}
                            onDrop={handleItemDrop(group.id, rowNumber, column.id)}
                            onKeyDown={(event) => {
                              if (event.key === 'Delete' || event.key === 'Backspace') {
                                event.preventDefault();
                                removeArchiveLayoutColumn(group.id, column.id);
                              }
                            }}
                            style={{
                              width: liveWidth,
                              minWidth: liveMeta.minWidth,
                              maxWidth: liveWidth,
                              height: liveMeta.isTallControl ? liveHeight : undefined,
                            }}
                            className={`group relative shrink-0 self-start transition-[width,height,transform] duration-75 ${liveMeta.frameClass}`}
                          >
                            {isInsertTarget ? (
                              <span className="pointer-events-none absolute inset-y-1 left-[-4px] w-[2px] rounded-full bg-[color:var(--workspace-accent)]" />
                            ) : null}
                            <div className="min-h-0 flex-1">
                              {renderArchiveLayoutFieldShell(liveMeta.field, {
                                rowIndex: columnIndex,
                                width: liveWidth,
                                height: liveHeight,
                              })}
                            </div>
                            <div
                              className="absolute bottom-1 right-[-2px] top-1 flex w-3 cursor-col-resize items-center justify-center opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
                              onMouseDown={(event) => startDetailBoardFieldResize(event, group.id, column.id, liveMeta.field.name, liveMeta.minWidth)}
                              onDoubleClick={(event) => resetDetailBoardFieldWidth(event, group.id, column.id)}
                              title="拖动调整宽度，双击恢复自动排布"
                            >
                              <span className="h-7 w-px rounded-full bg-slate-300 transition-colors group-hover:bg-[color:var(--workspace-accent)] dark:bg-slate-600" />
                            </div>
                            {liveMeta.isTallControl ? (
                              <button
                                type="button"
                                onMouseDown={(event) => startDetailBoardFieldHeightResize(event, group.id, column.id, liveMeta.field.name, liveMeta.minHeight)}
                                onDoubleClick={(event) => resetDetailBoardFieldHeight(event, group.id, column.id)}
                                className="absolute bottom-0 left-10 right-6 flex h-3 cursor-ns-resize items-center justify-center opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
                                title="拖动调整高度，双击恢复默认高度"
                              >
                                <span className="h-px w-10 rounded-full bg-slate-300 transition-colors group-hover:bg-[color:var(--workspace-accent)] dark:bg-slate-600" />
                              </button>
                            ) : null}
                          </div>
                        );
                      }) : (
                        <div className="flex min-h-[48px] items-center text-[12px] text-slate-400 dark:text-slate-500">
                          直接把右侧主表字段拖到这一行。
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      );
    };

    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[79] flex items-center justify-center bg-slate-950/42 p-5 backdrop-blur-sm"
          onClick={closeEditor}
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.985 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={(event) => event.stopPropagation()}
            className="flex h-[90vh] w-full max-w-[1640px] flex-col overflow-hidden rounded-2xl border border-slate-200/85 bg-white shadow-[0_44px_120px_-36px_rgba(15,23,42,0.42)] dark:border-slate-800 dark:bg-slate-950"
          >
            <div className="border-b border-slate-200/80 bg-slate-50/80 px-5 py-4 dark:border-slate-800 dark:bg-slate-950">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="flex size-9 items-center justify-center rounded-md border border-slate-200/80 bg-white text-[color:var(--workspace-accent)] dark:border-slate-800 dark:bg-slate-950">
                      <span className="material-symbols-outlined text-[18px]">dashboard_customize</span>
                    </div>
                    <div className="text-[15px] font-semibold text-slate-900 dark:text-slate-50">主表分组布局画布</div>
                  </div>
                  <div className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">
                    所有分组在同一张画布里直接排布。拖动宽度时会参考上一行边界，不再额外弹出顶部尺子。
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-slate-200/80 bg-white/82 px-3 py-2 text-[11px] text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-950/76 dark:text-slate-300">
                    <span>分组 {archiveLayoutConfig.groups.length}</span>
                    <span className="text-slate-300 dark:text-slate-600">/</span>
                    <span>已排布 {assignedFieldCount}</span>
                    <span className="text-slate-300 dark:text-slate-600">/</span>
                    <span>待排布 {unassignedFieldCount}</span>
                    <span className="text-slate-300 dark:text-slate-600">/</span>
                    <span className="truncate">高亮 {highlightedGroup?.name || '未选择'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={addArchiveLayoutGroup}
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-[color:var(--workspace-accent)] px-3 text-[12px] font-semibold text-white transition-colors hover:bg-[color:var(--workspace-accent-strong)]"
                  >
                    <span className="material-symbols-outlined text-[15px]">add</span>
                    新增分组
                  </button>
                  <button
                    type="button"
                    onClick={clearArchiveLayoutGroups}
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-600 transition-colors hover:border-rose-200 hover:text-rose-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
                  >
                    <span className="material-symbols-outlined text-[15px]">layers_clear</span>
                    清空
                  </button>
                  <button
                    type="button"
                    onClick={closeEditor}
                    className="inline-flex size-9 items-center justify-center rounded-md border border-slate-200/80 bg-white text-slate-500 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="grid min-h-0 flex-1 gap-0 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="min-h-0 p-4">
                <div className={`${shadcnSectionCardClass} flex h-full min-h-0 flex-col`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className={shadcnSectionTitleClass}>
                      <span className="material-symbols-outlined text-[17px] text-[color:var(--workspace-accent)]">view_agenda</span>
                      <h4>分组画布</h4>
                    </div>
                    <div className="text-[11px] leading-5 text-slate-500 dark:text-slate-400">
                      点击某个分组即高亮。拖到字段前面时自动后移一位。
                    </div>
                  </div>
                  <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
                    {archiveLayoutConfig.groups.length > 0 ? (
                      <div className="space-y-4">
                        {archiveLayoutConfig.groups.map(renderGroupCanvas)}
                      </div>
                    ) : (
                      <div className="flex h-full min-h-[320px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200/80 bg-slate-50/60 text-center dark:border-slate-800 dark:bg-slate-900/30">
                        <div className="text-[14px] font-semibold text-slate-700 dark:text-slate-100">还没有分组</div>
                        <div className="mt-2 text-[12px] text-slate-500 dark:text-slate-400">先新建一个分组，再把右侧主表字段拖进来。</div>
                        <button
                          type="button"
                          onClick={addArchiveLayoutGroup}
                          className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-md bg-[color:var(--workspace-accent)] px-3.5 text-[12px] font-semibold text-white transition-colors hover:bg-[color:var(--workspace-accent-strong)]"
                        >
                          <span className="material-symbols-outlined text-[15px]">add</span>
                          新增第一个分组
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="min-h-0 border-l border-slate-200/80 bg-slate-50/55 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                <div className={`${shadcnSectionCardClass} flex h-full min-h-0 flex-col`}>
                  <div className={shadcnSectionTitleClass}>
                    <span className="material-symbols-outlined text-[17px] text-[color:var(--workspace-accent)]">toc</span>
                    <h4>主表字段</h4>
                  </div>
                  <div className="mb-3 rounded-lg border border-slate-200/80 bg-white px-3 py-2 text-[11px] text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                    当前高亮分组：<span className="font-semibold text-slate-700 dark:text-slate-100">{highlightedGroup?.name || '未选择'}</span>
                  </div>
                  <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
                    {mainTableColumns.map((column: any) => {
                      const layoutMeta = getLayoutFieldWorkbenchMeta(column, 248);
                      const assignedGroupId = assignmentMap.get(column.id) ?? null;
                      const assignedGroup = archiveLayoutConfig.groups.find((group: any) => group.id === assignedGroupId);
                      const isInHighlightedGroup = assignedGroupId === highlightedGroupId;

                      return (
                        <button
                          key={`archive-layout-palette-${column.id}`}
                          type="button"
                          draggable
                          onDragStart={handlePaletteDragStart(column.id)}
                          onDragEnd={handlePaletteDragEnd}
                          className={`w-full rounded-lg border px-2.5 py-2 text-left transition-colors ${
                            isInHighlightedGroup
                              ? 'border-[color:var(--workspace-accent-border-strong)] bg-white shadow-[0_10px_24px_-24px_var(--workspace-accent-shadow)]'
                              : 'border-slate-200 bg-white hover:border-[color:var(--workspace-accent-border)] dark:border-slate-800 dark:bg-slate-950'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <div className="mt-1.5 flex size-5 shrink-0 items-center justify-center text-[color:var(--workspace-accent)]">
                              <span className="material-symbols-outlined text-[15px]">drag_indicator</span>
                            </div>
                            <div className="min-w-0 flex-1">
                              {renderArchiveLayoutFieldShell(layoutMeta.field, {
                                rowIndex: 0,
                                width: layoutMeta.width,
                                height: layoutMeta.height,
                              })}
                              <div className="mt-1 pl-0.5 text-[11px] text-slate-400 dark:text-slate-500">
                                {assignedGroup ? `${isInHighlightedGroup ? '当前分组' : assignedGroup.name} · 已排布` : '未排布'}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  };

  const renderDetailBoardModal = () => {
    if (!isDetailBoardOpen) return null;

    const detailBoardConfig = normalizedMainDetailBoardConfig;
    const detailBoardTheme = getDetailBoardTheme(workspaceTheme);
    const sortColumnId = detailBoardSortColumnId || detailBoardConfig.sortColumnId || mainTableColumns[0]?.id || null;
    const detailGroups = detailBoardConfig.groups
      .map((group: any) => ({
        ...group,
        columns: group.columnIds
          .map((columnId: string) => mainTableColumns.find((column) => column.id === columnId))
          .filter(Boolean),
      }))
      .filter((group: any) => group.columns.length > 0);
    const panelGroups = detailGroups;

    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/35 p-6 backdrop-blur-sm"
          onClick={() => setIsDetailBoardOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.22 }}
          onClick={(event) => event.stopPropagation()}
          style={workspaceThemeVars}
          className="flex h-[84vh] w-full max-w-[1160px] flex-col overflow-hidden rounded-[28px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.995),rgba(245,248,252,0.985))] shadow-[0_60px_140px_-52px_rgba(15,23,42,0.68)] dark:border-slate-700 dark:bg-slate-900"
        >
            <div className={`border-b border-slate-200 px-6 py-4 dark:border-slate-700 ${detailBoardTheme.hero}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-2xl border border-white/70 bg-white/82 text-[color:var(--workspace-accent)] shadow-[0_16px_28px_-24px_rgba(15,23,42,0.24)] dark:border-white/10 dark:bg-slate-900/58">
                      <span className="material-symbols-outlined text-[18px]">view_stream</span>
                    </div>
                    <div className="min-w-0">
                      <div className="text-[17px] font-bold tracking-[-0.02em] text-slate-900 dark:text-white">详情布局预览</div>
                      <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-300">
                        拖动字段右侧分隔线可调宽度，拖动下边缘可放大备注框。
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setIsDetailBoardOpen(false)}
                  className="inline-flex size-11 items-center justify-center rounded-[18px] border border-white/75 bg-white/80 text-slate-500 transition-colors hover:bg-white dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-300"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
            </div>

            <div className="scrollbar-none min-h-0 flex-1 overflow-auto bg-[linear-gradient(180deg,rgba(250,252,255,0.98),rgba(244,247,251,0.96))] dark:bg-slate-900">
              <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-3 px-5 py-4">
                {panelGroups.length === 0 ? (
                  <section className={`rounded-[18px] border border-dashed px-6 py-10 text-center ${detailBoardTheme.groupShell}`}>
                    <div className="mx-auto flex size-14 items-center justify-center rounded-3xl bg-white text-[color:var(--workspace-accent)] shadow-[0_18px_30px_-24px_rgba(15,23,42,0.16)]">
                      <span className="material-symbols-outlined text-[24px]">view_stream</span>
                    </div>
                    <div className="mt-4 text-[15px] font-bold text-slate-800 dark:text-slate-100">还没有详情分组</div>
                  </section>
                ) : panelGroups.map((group: any) => {
                  const orderedColumns = [...group.columns].sort((left: any, right: any) => {
                    if (left.id === sortColumnId) return -1;
                    if (right.id === sortColumnId) return 1;
                    return 0;
                  });
                  const rowNumbers = Array.from({ length: getDetailBoardGroupRows(group) }, (_, index) => index + 1);

                  return (
                    <section
                      key={group.id}
                      className={`overflow-hidden rounded-xl border bg-white shadow-[0_12px_28px_-28px_rgba(15,23,42,0.2)] dark:bg-slate-950 ${detailBoardTheme.groupShell}`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 px-4 py-3 dark:border-slate-700">
                        <div className="min-w-0">
                          <div className="text-[14px] font-semibold text-slate-800 dark:text-slate-100">{group.name}</div>
                        </div>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold ${detailBoardTheme.groupLabel}`}>
                          {orderedColumns.length} 项
                        </span>
                      </div>
                      <div className="px-3.5 py-3">
                        <div className="space-y-2.5">
                          {rowNumbers.map((rowNumber) => {
                            const rowColumns = orderedColumns.filter((column: any) => getDetailBoardGroupColumnRow(group, column.id) === rowNumber);
                            if (rowColumns.length === 0) return null;

                            return (
                              <div
                                key={`${group.id}-preview-row-${rowNumber}`}
                                className="overflow-x-auto px-1 py-1.5"
                              >
                                <div className="flex items-start gap-2">
                                  {rowColumns.map((column: any, columnIndex: number) => {
                                    const layoutMeta = getLayoutFieldWorkbenchMeta(column, group.columnWidths?.[column.id]);
                                    const liveWidth = getDetailBoardFieldLiveWidth(group.id, column.id, layoutMeta.width);
                                    const liveHeight = getDetailBoardFieldLiveHeight(group.id, column.id, layoutMeta.height);
                                    const liveMeta = getLayoutFieldWorkbenchMeta(column, liveWidth, liveHeight);

                                    return (
                                      <div
                                        key={column.id}
                                        data-detail-field-item="true"
                                        style={{
                                          width: liveWidth,
                                          minWidth: liveMeta.minWidth,
                                          maxWidth: liveWidth,
                                          height: liveMeta.isTallControl ? liveHeight : undefined,
                                        }}
                                        className={`group relative min-w-0 shrink-0 self-start ${liveMeta.frameClass}`}
                                      >
                                        {renderArchiveLayoutFieldShell(liveMeta.field, {
                                          rowIndex: columnIndex,
                                          width: liveWidth,
                                          height: liveHeight,
                                        })}
                                        <button
                                          type="button"
                                          onMouseDown={(event) => startDetailBoardFieldResize(event, group.id, column.id, liveMeta.field.name, liveMeta.minWidth)}
                                          onDoubleClick={(event) => resetDetailBoardFieldWidth(event, group.id, column.id)}
                                          className="absolute bottom-1.5 right-0 top-1.5 flex w-3 items-center justify-center opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
                                          title="拖动调整宽度，双击恢复自动排布"
                                        >
                                          <span className="h-8 w-px rounded-full bg-slate-300/90 transition-colors group-hover:bg-[color:var(--workspace-accent)] dark:bg-slate-600" />
                                        </button>
                                        {liveMeta.isTallControl ? (
                                          <button
                                            type="button"
                                            onMouseDown={(event) => startDetailBoardFieldHeightResize(event, group.id, column.id, liveMeta.field.name, liveMeta.minHeight)}
                                            onDoubleClick={(event) => resetDetailBoardFieldHeight(event, group.id, column.id)}
                                            className="absolute bottom-0 left-10 right-6 flex h-3 items-center justify-center opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
                                            title="拖动调整高度，双击恢复默认高度"
                                          >
                                            <span className="h-px w-10 rounded-full bg-slate-300/90 transition-colors group-hover:bg-[color:var(--workspace-accent)] dark:bg-slate-600" />
                                          </button>
                                        ) : null}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </section>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  };

  const renderMainHiddenColumnsModal = () => {
    if (!isMainHiddenColumnsModalOpen) return null;

    const hiddenColumns = mainTableHiddenColumns;
    const selectedCount = selectedMainHiddenColumnIds.length;

    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[75] flex items-center justify-center bg-slate-950/35 p-6 backdrop-blur-sm"
          onClick={closeMainHiddenColumnsModal}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.22 }}
            onClick={(event) => event.stopPropagation()}
            style={workspaceThemeVars}
            className="flex h-[78vh] w-full max-w-[860px] flex-col overflow-hidden rounded-[28px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.995),rgba(245,248,252,0.985))] shadow-[0_60px_140px_-52px_rgba(15,23,42,0.68)] dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-700">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-2xl border border-white/70 bg-white/82 text-[color:var(--workspace-accent)] shadow-[0_16px_28px_-24px_rgba(15,23,42,0.24)] dark:border-white/10 dark:bg-slate-900/58">
                      <span className="material-symbols-outlined text-[18px]">view_column</span>
                    </div>
                    <div className="min-w-0">
                      <div className="text-[17px] font-bold tracking-[-0.02em] text-slate-900 dark:text-white">详细列</div>
                      <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-300">
                        隐藏列和宽度为 0 的列会集中显示在这里，勾选后可恢复到主表。
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  onClick={closeMainHiddenColumnsModal}
                  className="inline-flex size-11 items-center justify-center rounded-[18px] border border-white/75 bg-white/80 text-slate-500 transition-colors hover:bg-white dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-300"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
            </div>

            <div className="scrollbar-none min-h-0 flex-1 overflow-auto bg-[linear-gradient(180deg,rgba(250,252,255,0.98),rgba(244,247,251,0.96))] px-5 py-4 dark:bg-slate-900">
              {hiddenColumns.length === 0 ? (
                <div className="flex h-full min-h-[240px] items-center justify-center rounded-[20px] border border-dashed border-slate-200 bg-white/70 text-center text-slate-400 dark:border-slate-700 dark:bg-slate-950/70">
                  当前没有可恢复的隐藏列。
                </div>
              ) : (
                <div className="space-y-2">
                  {hiddenColumns.map((column) => {
                    const normalizedColumn = normalizeColumn(column);
                    const isSelected = selectedMainHiddenColumnIds.includes(column.id);
                    const isHidden = normalizedColumn.visible === false;
                    const isZeroWidth = Number(normalizedColumn.width) <= 0;
                    const statusTags = [
                      isHidden ? '隐藏' : null,
                      isZeroWidth ? '宽度 0' : null,
                    ].filter(Boolean) as string[];

                    return (
                      <label
                        key={column.id}
                        className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 transition-colors ${
                          isSelected
                            ? 'border-[color:var(--workspace-accent-border)] bg-[color:var(--workspace-accent-soft)]/70'
                            : 'border-slate-200 bg-white/86 hover:bg-white dark:border-slate-700 dark:bg-slate-950/70 dark:hover:bg-slate-900'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleMainHiddenColumnSelection(column.id)}
                          className="mt-1 size-4 rounded border-slate-300 text-[color:var(--workspace-accent)] focus:ring-[color:var(--workspace-accent-soft)]"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="truncate text-[13px] font-semibold text-slate-900 dark:text-slate-100">
                              {normalizedColumn.name}
                            </div>
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                              {normalizedColumn.type || '文本'}
                            </span>
                            {statusTags.map((tag) => (
                              <span
                                key={`${column.id}-${tag}`}
                                className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:bg-amber-500/10 dark:text-amber-200"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                            <span>宽度 {Math.max(0, Number(normalizedColumn.width) || 0)}px</span>
                            <span>{normalizedColumn.sourceField || column.id}</span>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-6 py-4 dark:border-slate-700">
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                已选 {selectedCount} / {hiddenColumns.length}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  className="h-9 rounded-xl border-slate-200/80 bg-white/80 px-4 text-[12px] font-semibold text-slate-600"
                  onClick={closeMainHiddenColumnsModal}
                >
                  取消
                </Button>
                <Button
                  variant="outline"
                  className="h-9 rounded-xl border-slate-200/80 bg-white/80 px-4 text-[12px] font-semibold text-slate-600"
                  onClick={() => setSelectedMainHiddenColumnIds(hiddenColumns.map((column) => column.id))}
                  disabled={hiddenColumns.length === 0}
                >
                  全选
                </Button>
                <Button
                  variant="secondary"
                  className="h-9 rounded-xl px-4 text-[12px] font-semibold"
                  onClick={() => restoreMainHiddenColumns()}
                  disabled={selectedCount === 0}
                >
                  恢复选中
                </Button>
                <Button
                  className="h-9 rounded-xl px-4 text-[12px] font-semibold"
                  onClick={() => restoreMainHiddenColumns(hiddenColumns.map((column) => column.id))}
                  disabled={hiddenColumns.length === 0}
                >
                  全部恢复
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  };

  const setRestrictionSelectedId = (tabId: RestrictionConfigTabId, rowId: string | null) => {
    setRestrictionSelection((prev) => ({ ...prev, [tabId]: rowId }));
  };
  const restrictionRowsByTab: Record<RestrictionConfigTabId, any[]> = {
    guard: restrictionMeasures,
    number: restrictionNumberRules,
    structure: restrictionTopStructures,
    process: restrictionProcessDesigns,
  };
  const restrictionTabMeta = [
    { id: 'guard' as RestrictionConfigTabId, label: '管控限制措施', icon: 'rule_settings', count: restrictionMeasures.length, accent: 'text-rose-500' },
    { id: 'number' as RestrictionConfigTabId, label: '编号规则管理', icon: 'tag', count: restrictionNumberRules.length, accent: 'text-cyan-500' },
    { id: 'structure' as RestrictionConfigTabId, label: '顶层数据结构', icon: 'schema', count: restrictionTopStructures.length, accent: 'text-emerald-500' },
    { id: 'process' as RestrictionConfigTabId, label: '流程设计管理', icon: 'account_tree', count: restrictionProcessDesigns.length, accent: 'text-amber-500' },
  ];
  const restrictionWorkbenchTotalCount = restrictionTabMeta.reduce((total, item) => total + item.count, 0);
  const activeRestrictionRows = restrictionRowsByTab[restrictionActiveTab] ?? [];
  const activeRestrictionSelectedId = restrictionSelection[restrictionActiveTab];
  const activeRestrictionRow = activeRestrictionRows.find((row) => row.id === activeRestrictionSelectedId) ?? activeRestrictionRows[0] ?? null;
  const selectedGuardRule = restrictionMeasures.find((item) => item.id === restrictionSelection.guard) ?? restrictionMeasures[0] ?? null;
  const selectedNumberRule = restrictionNumberRules.find((item) => item.id === restrictionSelection.number) ?? restrictionNumberRules[0] ?? null;
  const selectedTopStructure = restrictionTopStructures.find((item) => item.id === restrictionSelection.structure) ?? restrictionTopStructures[0] ?? null;
  const selectedProcessDesign = restrictionProcessDesigns.find((item) => item.id === restrictionSelection.process) ?? restrictionProcessDesigns[0] ?? null;
  useEffect(() => {
    if (!restrictionTabMeta.some((item) => item.id === restrictionActiveTab)) {
      setRestrictionActiveTab('guard');
    }
  }, [restrictionActiveTab, restrictionTabMeta]);
  const restrictionPanelClass = shadcnPanelShellClass;
  const restrictionCardClass = `${shadcnSectionCardClass} flex h-full flex-col`;
  const restrictionHeroClass = 'overflow-hidden rounded-lg border border-slate-200/80 bg-slate-50/85 px-4 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70';
  const restrictionFieldClass = shadcnFieldClass;
  const restrictionTextareaClass = shadcnTextareaClass;
  const restrictionDetailGridClass = 'grid gap-4 xl:grid-cols-12';
  const restrictionHeroTitleInputClass = 'mt-3 flex h-10 w-full rounded-md border border-slate-200 bg-white px-3.5 text-[15px] font-semibold tracking-[-0.02em] text-slate-900 shadow-sm outline-none transition-[border-color,box-shadow,color] placeholder:text-slate-400 focus-visible:border-[color:var(--workspace-accent-border-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--workspace-accent-soft)] dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50';
  const restrictionHeroMetricGridClass = 'grid min-w-[280px] gap-3 sm:grid-cols-2 xl:w-[360px]';
  const restrictionLabelClass = shadcnMutedLabelClass;
  const restrictionBadge = (enabled: boolean, activeLabel: string, inactiveLabel: string) => (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold ${enabled ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-200' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'}`}>
      {enabled ? activeLabel : inactiveLabel}
    </span>
  );
  const restrictionTextPreview = (value: any) => {
    const text = String(value ?? '').trim();
    if (!text) return <span className="text-slate-300 dark:text-slate-600">-</span>;
    return <span className="block truncate">{text}</span>;
  };
  const restrictionMetaChip = (icon: string, value: string) => (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100/90 px-2.5 py-1 text-[10px] font-semibold text-slate-500 dark:bg-slate-800/86 dark:text-slate-300">
      <span className="material-symbols-outlined text-[12px]">{icon}</span>
      <span className="truncate">{value || '-'}</span>
    </span>
  );
  const restrictionMetric = (label: string, value: string, tone: 'default' | 'accent' | 'success' = 'default') => {
    const toneClass = tone === 'accent'
      ? 'border-[color:var(--workspace-accent-border)] bg-[color:var(--workspace-accent-soft)] text-[color:var(--workspace-accent-strong)]'
      : tone === 'success'
        ? 'border-emerald-100 bg-emerald-50 text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200'
        : 'border-slate-200/80 bg-white/90 text-slate-600 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200';
    return (
      <div className={`rounded-md border px-3 py-2.5 ${toneClass}`}>
        <div className="text-[10px] font-bold tracking-[0.08em] opacity-70">{label}</div>
        <div className="mt-1 truncate text-[13px] font-black tracking-[-0.02em]">{value || '-'}</div>
      </div>
    );
  };
  const restrictionSectionHeader = (title: string, _hint?: string, action?: React.ReactNode) => (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="text-[14px] font-black tracking-[-0.02em] text-slate-800 dark:text-slate-100">{title}</div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
  const restrictionToggleTile = (
    label: string,
    _hint: string,
    checked: boolean,
    onChange: (checked: boolean) => void,
  ) => (
    <label className={`flex h-full cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-all ${
      checked
        ? 'border-[color:var(--workspace-accent-border-strong)] bg-[color:var(--workspace-accent-soft)] text-[color:var(--workspace-accent-strong)] shadow-sm'
        : 'border-slate-200/80 bg-white/92 text-slate-600 hover:border-[color:var(--workspace-accent-border)] dark:border-slate-700 dark:bg-slate-900/72 dark:text-slate-200'
    }`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded accent-[color:var(--workspace-accent)]"
      />
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold">{label}</div>
      </div>
    </label>
  );
  const restrictionLongTextButton = (
    title: string,
    draft: string,
    placeholder: string,
    onSave: (value: string) => void,
  ) => (
    <button
      type="button"
      onClick={() => setLongTextEditorState({ title, draft, placeholder, onSave })}
      className="inline-flex h-7 items-center rounded-full border border-slate-200/80 bg-white px-2.5 text-[10px] font-bold text-slate-500 transition-colors hover:border-[color:var(--workspace-accent-border-strong)] hover:text-[color:var(--workspace-accent-strong)] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
    >
      详情编辑
    </button>
  );
  const getRestrictionCardTitle = (row: any) => {
    if (!row) return '未命名配置';
    if (restrictionActiveTab === 'guard') return row.description || '限制措施';
    if (restrictionActiveTab === 'number') return row.segmentValue || row.segmentType || '编号规则';
    if (restrictionActiveTab === 'structure') return row.tableDesc || row.tableName || '顶层结构';
    if (restrictionActiveTab === 'process') return row.schemeName || row.schemeCode || '流程方案';
    return row.fieldName || row.fieldKey || '字段元素';
  };
  const getRestrictionCardSubtitle = (row: any) => {
    if (!row) return '';
    if (restrictionActiveTab === 'guard') return `${row.businessCategory || '未分类'} · ${row.eventType || '未设置事件'}`;
    if (restrictionActiveTab === 'number') return `${row.segmentType || '组成元素'} · 顺序 ${row.sortOrder ?? 0}`;
    if (restrictionActiveTab === 'structure') return row.tableName || row.mainModuleCode || '未设置表名';
    if (restrictionActiveTab === 'process') return `${row.schemeCode || '未编号'} · ${row.businessType || '未分类'}`;
    return row.fieldKey || row.ownerLabel || '未绑定字段';
  };
  const getRestrictionCardSummary = (row: any) => {
    if (!row) return '暂无说明';
    if (restrictionActiveTab === 'guard') return row.hint || row.judgeRule || '暂无规则说明';
    if (restrictionActiveTab === 'number') return row.segmentValue || `长度限制 ${row.lengthLimit ?? 0}`;
    if (restrictionActiveTab === 'structure') return row.remark || `${row.fieldPrefix || '-'} / ${row.sequenceRule || '-'}`;
    if (restrictionActiveTab === 'process') return row.actionDescription || row.permissionScope || '暂无流程说明';
    return row.helpText || row.sourceTable || '暂无字段说明';
  };
  const getRestrictionCardPills = (row: any) => {
    if (!row) return [] as string[];
    if (restrictionActiveTab === 'guard') {
      return [
        row.stepCode ? `步骤 ${row.stepCode}` : '步骤 -',
        `${row.enabled ? '启用' : '停用'}${row.confirmRequired ? ' · 需确认' : ''}`,
      ];
    }
    if (restrictionActiveTab === 'number') {
      return [
        `长度 ${row.lengthLimit ?? 0}`,
        `${row.sequencePermission ? '受限' : '开放'} · ${row.enabled ? '启用' : '停用'}`,
      ];
    }
    if (restrictionActiveTab === 'structure') {
      return [
        row.moduleSchema || '未设结构',
        row.fieldPrefix ? `前缀 ${row.fieldPrefix}` : '未设前缀',
      ];
    }
    if (restrictionActiveTab === 'process') {
      return [
        row.planValue ? `方案 ${row.planValue}` : '未设方案',
        row.businessCode || '未设业务号',
      ];
    }
    return [
      row.controlType || '未设控件',
      row.required ? '必填' : '可选',
      row.readonly ? '只读' : row.visible === false ? '隐藏' : '显示',
    ];
  };
  const getRestrictionCardReadonlyMeta = (row: any) => {
    if (!row) return [] as Array<{ icon: string; value: string }>;
    if (restrictionActiveTab === 'guard') {
      return [
        { icon: 'calendar_month', value: row.applyDate || '-' },
        { icon: 'person', value: row.applyUser || '-' },
      ];
    }
    if (restrictionActiveTab === 'number') {
      return [
        { icon: 'calendar_month', value: row.inputDate || '-' },
        { icon: 'badge', value: row.creator || '-' },
      ];
    }
    return [] as Array<{ icon: string; value: string }>;
  };
  const renderRestrictionMasterList = () => {
    const activeTabIcon = restrictionTabMeta.find((item) => item.id === restrictionActiveTab)?.icon ?? 'rule_settings';
    const emptyLabel = '当前页签还没有配置内容';

    if (activeRestrictionRows.length === 0) {
      return (
        <div className="flex h-full items-center justify-center rounded-[24px] border border-dashed border-slate-200/80 bg-white/65 px-5 text-center text-[12px] text-slate-400 dark:border-slate-700 dark:bg-slate-900/30 dark:text-slate-500">
          {emptyLabel}
        </div>
      );
    }

    return (
      <div className="scrollbar-none min-h-0 flex-1 overflow-auto pr-1">
        <div className="grid gap-2.5 content-start">
          {activeRestrictionRows.map((row, index) => {
            const selected = row.id === activeRestrictionRow?.id;
            const title = getRestrictionCardTitle(row);
            const subtitle = getRestrictionCardSubtitle(row);
            const summary = getRestrictionCardSummary(row);
            const pills = getRestrictionCardPills(row);
            const readonlyMeta = getRestrictionCardReadonlyMeta(row);

            return (
              <button
                key={row.id}
                type="button"
                onClick={() => setRestrictionSelectedId(restrictionActiveTab, row.id)}
                className={`group overflow-hidden rounded-[24px] border px-4 py-4 text-left transition-all ${
                  selected
                    ? 'border-[color:var(--workspace-accent-border-strong)] bg-[linear-gradient(180deg,rgba(245,249,255,0.98),rgba(241,246,255,0.95))] shadow-[0_18px_36px_-32px_var(--workspace-accent-shadow)] dark:border-[color:var(--workspace-accent-border)] dark:bg-slate-900/90'
                    : 'border-slate-200/80 bg-white/92 hover:-translate-y-0.5 hover:border-[color:var(--workspace-accent-border)] hover:shadow-[0_16px_30px_-26px_rgba(15,23,42,0.16)] dark:border-slate-700 dark:bg-slate-900/72'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className={`flex size-11 shrink-0 items-center justify-center rounded-[16px] ${
                      selected
                        ? 'bg-[color:var(--workspace-accent)] text-white'
                        : 'bg-[color:var(--workspace-accent-soft)] text-[color:var(--workspace-accent-strong)]'
                    }`}>
                      <span className="material-symbols-outlined text-[18px]">{activeTabIcon}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-[14px] font-black tracking-[-0.02em] text-slate-800 dark:text-slate-100">{title}</div>
                      <div className="mt-1 truncate text-[11px] font-semibold text-slate-400">{subtitle}</div>
                    </div>
                  </div>
                  <div className={`inline-flex min-w-[28px] items-center justify-center rounded-full px-2 py-1 text-[10px] font-black ${
                    selected
                      ? 'bg-white text-[color:var(--workspace-accent-strong)] dark:bg-slate-800'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'
                  }`}>
                    {index + 1}
                  </div>
                </div>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {pills.map((pill) => (
                    <span
                      key={`${row.id}-${pill}`}
                      className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                        selected
                          ? 'bg-white/88 text-[color:var(--workspace-accent-strong)] dark:bg-slate-800 dark:text-slate-100'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {pill}
                    </span>
                  ))}
                </div>
                <div className="mt-2.5 line-clamp-2 text-[11px] leading-5 text-slate-500 dark:text-slate-300">
                  {summary}
                </div>
                {readonlyMeta.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-2 border-t border-slate-200/70 pt-2.5 dark:border-slate-700">
                    {readonlyMeta.map((item) => (
                      <React.Fragment key={`${row.id}-${item.icon}-${item.value}`}>
                        {restrictionMetaChip(item.icon, item.value)}
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };
  const focusRestrictionElementInModel = (element: RestrictionElementRow | null) => {
    if (!element) return;
    setConfigStep(MODULE_SETTING_STEP);
    window.setTimeout(() => {
      moduleSettingsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
    if (element.scope === 'bill-detail') {
      setSelectedArchiveNodeId(`detail-${activeTab}`);
      activateColumnSelection('detail', element.sourceId);
    } else {
      setSelectedArchiveNodeId('archive-main');
      activateColumnSelection('main', element.sourceId);
    }
    showToast(`已定位到 ${element.fieldName}`);
  };
  const handleAddRestrictionItem = () => {
    if (restrictionActiveTab === 'guard') {
      const next = buildRestrictionMeasure(restrictionMeasures.length + 1, { order: restrictionMeasures.length });
      setRestrictionMeasures((prev) => [...prev, next]);
      setRestrictionSelectedId('guard', next.id);
      return;
    }
    if (restrictionActiveTab === 'number') {
      const next = buildRestrictionNumberRule(restrictionNumberRules.length + 1);
      setRestrictionNumberRules((prev) => [...prev, next]);
      setRestrictionSelectedId('number', next.id);
      return;
    }
    if (restrictionActiveTab === 'structure') {
      const next = buildRestrictionTopStructure(restrictionTopStructures.length + 1, { rowId: 150 + restrictionTopStructures.length + 1 });
      setRestrictionTopStructures((prev) => [...prev, next]);
      setRestrictionSelectedId('structure', next.id);
      return;
    }
    if (restrictionActiveTab === 'process') {
      const next = buildRestrictionProcessDesign(restrictionProcessDesigns.length + 1);
      setRestrictionProcessDesigns((prev) => [...prev, next]);
      setRestrictionSelectedId('process', next.id);
      return;
    }
    showToast('当前页签暂不支持新增。');
  };
  const handleDuplicateRestrictionItem = () => {
    if (restrictionActiveTab === 'guard' && selectedGuardRule) {
      const { id, ...rest } = selectedGuardRule;
      const next = buildRestrictionMeasure(restrictionMeasures.length + 1, {
        ...rest,
        description: `${selectedGuardRule.description || '限制措施'} 副本`,
        order: restrictionMeasures.length,
      });
      setRestrictionMeasures((prev) => [...prev, next]);
      setRestrictionSelectedId('guard', next.id);
      return;
    }
    if (restrictionActiveTab === 'number' && selectedNumberRule) {
      const { id, ...rest } = selectedNumberRule;
      const next = buildRestrictionNumberRule(restrictionNumberRules.length + 1, {
        ...rest,
        sortOrder: restrictionNumberRules.length + 1,
      });
      setRestrictionNumberRules((prev) => [...prev, next]);
      setRestrictionSelectedId('number', next.id);
      return;
    }
    if (restrictionActiveTab === 'structure' && selectedTopStructure) {
      const { id, ...rest } = selectedTopStructure;
      const next = buildRestrictionTopStructure(restrictionTopStructures.length + 1, {
        ...rest,
        tableDesc: `${selectedTopStructure.tableDesc || '结构'} 副本`,
        rowId: selectedTopStructure.rowId + 1,
      });
      setRestrictionTopStructures((prev) => [...prev, next]);
      setRestrictionSelectedId('structure', next.id);
      return;
    }
    if (restrictionActiveTab === 'process' && selectedProcessDesign) {
      const { id, ...rest } = selectedProcessDesign;
      const next = buildRestrictionProcessDesign(restrictionProcessDesigns.length + 1, {
        ...rest,
        schemeName: `${selectedProcessDesign.schemeName || '流程方案'} 副本`,
      });
      setRestrictionProcessDesigns((prev) => [...prev, next]);
      setRestrictionSelectedId('process', next.id);
      return;
    }
    showToast('当前页签没有可复制的数据。');
  };
  const handleDeleteRestrictionItem = () => {
    if (restrictionActiveTab === 'guard' && selectedGuardRule) {
      setRestrictionMeasures((prev) => prev.filter((item) => item.id !== selectedGuardRule.id));
      return;
    }
    if (restrictionActiveTab === 'number' && selectedNumberRule) {
      setRestrictionNumberRules((prev) => prev.filter((item) => item.id !== selectedNumberRule.id));
      return;
    }
    if (restrictionActiveTab === 'structure' && selectedTopStructure) {
      setRestrictionTopStructures((prev) => prev.filter((item) => item.id !== selectedTopStructure.id));
      return;
    }
    if (restrictionActiveTab === 'process' && selectedProcessDesign) {
      setRestrictionProcessDesigns((prev) => prev.filter((item) => item.id !== selectedProcessDesign.id));
      return;
    }
    showToast('当前页签没有可删除的数据。');
  };
  const handleSaveRestrictionTab = () => {
    const activeTabLabel = restrictionTabMeta.find((item) => item.id === restrictionActiveTab)?.label || '限制措施';
    showToast(`${activeTabLabel} 已暂存`);
  };
  const renderRestrictionMeasureDetail = () => {
    if (!selectedGuardRule) {
      return (
        <div className="flex h-full items-center justify-center rounded-[24px] border border-dashed border-slate-200/80 text-[12px] text-slate-400 dark:border-slate-700">
          先在上面选一条限制措施
        </div>
      );
    }
    const updateSelectedRule = (patch: Partial<RestrictionMeasureItem>) => {
      setRestrictionMeasures((prev) => prev.map((item) => (item.id === selectedGuardRule.id ? { ...item, ...patch } : item)));
    };
    return (
      <div className={restrictionDetailGridClass}>
        <section className={`${restrictionHeroClass} xl:col-span-12`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex h-8 items-center rounded-full bg-[color:var(--workspace-accent)] px-3 text-[11px] font-black text-white shadow-[0_18px_30px_-24px_var(--workspace-accent-shadow)]">
                  管控限制措施
                </span>
                {restrictionBadge(selectedGuardRule.enabled, '启用中', '已停用')}
                {selectedGuardRule.confirmRequired && restrictionBadge(true, '要求确认', '无确认')}
              </div>
              <input
                type="text"
                value={selectedGuardRule.description}
                onChange={(event) => updateSelectedRule({ description: event.target.value })}
                placeholder="输入限制措施名称"
                className={restrictionHeroTitleInputClass}
              />
            </div>
            <div className={restrictionHeroMetricGridClass}>
              {restrictionMetric('业务类型', selectedGuardRule.businessCategory || '未设置', 'accent')}
              {restrictionMetric('事件类型', selectedGuardRule.eventType || '未设置')}
              {restrictionMetric('步骤代码', selectedGuardRule.stepCode || '-', 'default')}
              {restrictionMetric('管理顺序', String(selectedGuardRule.order ?? 0), 'success')}
            </div>
          </div>
        </section>
        <section className={`${restrictionCardClass} xl:col-span-7`}>
          {restrictionSectionHeader('规则身份', '锁定触发位置和执行顺序')}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={restrictionLabelClass}>业务类型</label>
              <select value={selectedGuardRule.businessCategory} onChange={(event) => updateSelectedRule({ businessCategory: event.target.value })} className={restrictionFieldClass}>
                {RESTRICTION_BUSINESS_CATEGORY_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </div>
            <div>
              <label className={restrictionLabelClass}>事件类型</label>
              <select value={selectedGuardRule.eventType} onChange={(event) => updateSelectedRule({ eventType: event.target.value })} className={restrictionFieldClass}>
                {RESTRICTION_EVENT_TYPE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </div>
            <div>
              <label className={restrictionLabelClass}>步骤代码</label>
              <input type="text" value={selectedGuardRule.stepCode} onChange={(event) => updateSelectedRule({ stepCode: event.target.value })} className={restrictionFieldClass} />
            </div>
            <div>
              <label className={restrictionLabelClass}>管理顺序</label>
              <input type="number" value={selectedGuardRule.order} onChange={(event) => updateSelectedRule({ order: Number(event.target.value) || 0 })} className={restrictionFieldClass} />
            </div>
          </div>
        </section>
        <section className={`${restrictionCardClass} xl:col-span-5`}>
          {restrictionSectionHeader('生效与确认', '只保留执行相关开关')}
          <div className="grid gap-3 sm:grid-cols-2">
            {restrictionToggleTile('启用此限制', '参与执行', selectedGuardRule.enabled, (checked) => updateSelectedRule({ enabled: checked }))}
            {restrictionToggleTile('触发时要求确认', '二次确认', selectedGuardRule.confirmRequired, (checked) => updateSelectedRule({ confirmRequired: checked }))}
          </div>
        </section>
        <section className={`${restrictionCardClass} xl:col-span-12`}>
          {restrictionSectionHeader('提示信息')}
          <div>
            <label className={restrictionLabelClass}>提示信息</label>
            <textarea rows={3} value={selectedGuardRule.hint} onChange={(event) => updateSelectedRule({ hint: event.target.value })} className={`${restrictionTextareaClass} h-[112px] resize-none`} />
          </div>
        </section>
        <section className={`${restrictionCardClass} xl:col-span-6`}>
          {restrictionSectionHeader(
            '判断限制代码',
            'SQL / 脚本',
            restrictionLongTextButton('判断限制代码', selectedGuardRule.judgeRule, '输入判断限制 SQL / 脚本', (value) => updateSelectedRule({ judgeRule: value })),
          )}
          <textarea rows={6} value={selectedGuardRule.judgeRule} onChange={(event) => updateSelectedRule({ judgeRule: event.target.value })} placeholder="exists(select 1 from ...)" className={`${restrictionTextareaClass} min-h-[168px] flex-1 resize-none font-mono text-[12px]`} />
        </section>
        <section className={`${restrictionCardClass} xl:col-span-6`}>
          {restrictionSectionHeader(
            '同步操作代码',
            '保存后执行',
            restrictionLongTextButton('同步操作代码', selectedGuardRule.syncAction, '输入更新脚本 / 过程调用', (value) => updateSelectedRule({ syncAction: value })),
          )}
          <textarea rows={6} value={selectedGuardRule.syncAction} onChange={(event) => updateSelectedRule({ syncAction: event.target.value })} placeholder="update ... / exec ..." className={`${restrictionTextareaClass} min-h-[168px] flex-1 resize-none font-mono text-[12px]`} />
        </section>
      </div>
    );
  };
  const renderRestrictionNumberDetail = () => {
    if (!selectedNumberRule) {
      return <div className="flex h-full items-center justify-center rounded-[24px] border border-dashed border-slate-200/80 text-[12px] text-slate-400 dark:border-slate-700">先在上面选一条编号规则</div>;
    }
    const updateSelectedRule = (patch: Partial<RestrictionNumberRuleItem>) => {
      setRestrictionNumberRules((prev) => prev.map((item) => (item.id === selectedNumberRule.id ? { ...item, ...patch } : item)));
    };
    const orderedNumberRules = restrictionNumberRules.slice().sort((left, right) => left.sortOrder - right.sortOrder);
    const previewValue = orderedNumberRules
      .filter((item) => item.enabled)
      .map((item) => item.segmentValue || item.segmentType)
      .join(selectedNumberRule.separator || '') || '编号预览';
    return (
      <div className={restrictionDetailGridClass}>
        <section className={`${restrictionHeroClass} xl:col-span-12`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex h-8 items-center rounded-full bg-[color:var(--workspace-accent)] px-3 text-[11px] font-black text-white shadow-[0_18px_30px_-24px_var(--workspace-accent-shadow)]">
                  编号规则
                </span>
                {restrictionBadge(selectedNumberRule.enabled, '启用中', '已停用')}
                {selectedNumberRule.sequencePermission && restrictionBadge(true, '受权限控制', '开放')}
              </div>
              <input
                type="text"
                value={selectedNumberRule.segmentValue}
                onChange={(event) => updateSelectedRule({ segmentValue: event.target.value })}
                placeholder="输入固定值、表达式或片段"
                className={restrictionHeroTitleInputClass}
              />
            </div>
            <div className={restrictionHeroMetricGridClass}>
              {restrictionMetric('组成元素', selectedNumberRule.segmentType || '未设置', 'accent')}
              {restrictionMetric('组成顺序', String(selectedNumberRule.sortOrder ?? 0))}
              {restrictionMetric('长度限制', String(selectedNumberRule.lengthLimit ?? 0), 'success')}
              {restrictionMetric('分隔符', selectedNumberRule.separator || '无')}
            </div>
          </div>
        </section>
        <section className={`${restrictionCardClass} xl:col-span-6`}>
          {restrictionSectionHeader('编号段定义', '顺序、类型和长度')}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={restrictionLabelClass}>模块编码</label>
              <input type="text" value={selectedNumberRule.moduleCode} onChange={(event) => updateSelectedRule({ moduleCode: event.target.value })} className={restrictionFieldClass} />
            </div>
            <div>
              <label className={restrictionLabelClass}>组成顺序</label>
              <input type="number" value={selectedNumberRule.sortOrder} onChange={(event) => updateSelectedRule({ sortOrder: Number(event.target.value) || 0 })} className={restrictionFieldClass} />
            </div>
            <div>
              <label className={restrictionLabelClass}>组成元素</label>
              <select value={selectedNumberRule.segmentType} onChange={(event) => updateSelectedRule({ segmentType: event.target.value })} className={restrictionFieldClass}>
                {RESTRICTION_SEGMENT_TYPE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </div>
            <div>
              <label className={restrictionLabelClass}>长度限制</label>
              <input type="number" value={selectedNumberRule.lengthLimit} onChange={(event) => updateSelectedRule({ lengthLimit: Number(event.target.value) || 0 })} className={restrictionFieldClass} />
            </div>
          </div>
        </section>
        <section className={`${restrictionCardClass} xl:col-span-6`}>
          {restrictionSectionHeader('生成控制', '分隔符和权限开关')}
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)]">
              <div>
                <label className={restrictionLabelClass}>分割符</label>
                <input type="text" value={selectedNumberRule.separator} onChange={(event) => updateSelectedRule({ separator: event.target.value })} className={restrictionFieldClass} placeholder="例如 - / 空值" />
              </div>
              {restrictionToggleTile('序号受权限控制', '按权限决定是否参与生成', selectedNumberRule.sequencePermission, (checked) => updateSelectedRule({ sequencePermission: checked }))}
            </div>
          </div>
        </section>
        <section className={`${restrictionCardClass} xl:col-span-12`}>
          {restrictionSectionHeader('效果查验', '看段位顺序和最终编号')}
          <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="rounded-[22px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,251,255,0.98),rgba(255,255,255,0.96))] p-5 dark:border-slate-700 dark:bg-slate-950/40">
              <div className="text-[11px] font-bold tracking-[0.08em] text-slate-400">编号段序列</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {orderedNumberRules.map((item) => (
                  <span key={item.id} className={`inline-flex items-center rounded-full px-3 py-1.5 text-[12px] font-bold ${
                    item.id === selectedNumberRule.id
                      ? 'bg-[color:var(--workspace-accent)] text-white'
                      : item.enabled
                        ? 'bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-200'
                        : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                  }`}>
                    {item.segmentType} · {item.segmentValue || '空'}
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-[22px] border border-dashed border-slate-200/80 bg-white/92 p-5 dark:border-slate-700 dark:bg-slate-900/78">
              <div className="text-[11px] font-bold tracking-[0.08em] text-slate-400">最终编号预览</div>
              <div className="mt-4 rounded-[18px] border border-slate-200/80 bg-slate-950 px-4 py-4 font-mono text-[14px] font-bold tracking-[0.04em] text-emerald-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] dark:border-slate-700">
                {previewValue}
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  };
  const renderRestrictionStructureDetail = () => {
    if (!selectedTopStructure) {
      return <div className="flex h-full items-center justify-center rounded-[24px] border border-dashed border-slate-200/80 text-[12px] text-slate-400 dark:border-slate-700">先在上面选一条顶层数据结构</div>;
    }
    const updateSelectedStructure = (patch: Partial<RestrictionTopStructureItem>) => {
      setRestrictionTopStructures((prev) => prev.map((item) => (item.id === selectedTopStructure.id ? { ...item, ...patch } : item)));
    };
    return (
      <div className={restrictionDetailGridClass}>
        <section className={`${restrictionHeroClass} xl:col-span-12`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex h-8 items-center rounded-full bg-[color:var(--workspace-accent)] px-3 text-[11px] font-black text-white shadow-[0_18px_30px_-24px_var(--workspace-accent-shadow)]">
                  顶层数据结构
                </span>
                <span className="inline-flex h-8 items-center rounded-full bg-white/92 px-3 text-[11px] font-bold text-slate-500 dark:bg-slate-900/78 dark:text-slate-300">
                  {selectedTopStructure.tableName || '未设表名'}
                </span>
              </div>
              <input
                type="text"
                value={selectedTopStructure.tableDesc}
                onChange={(event) => updateSelectedStructure({ tableDesc: event.target.value })}
                placeholder="输入结构说明或表名描述"
                className={restrictionHeroTitleInputClass}
              />
            </div>
            <div className={restrictionHeroMetricGridClass}>
              {restrictionMetric('模块结构', selectedTopStructure.moduleSchema || '未设置', 'accent')}
              {restrictionMetric('字段前缀', selectedTopStructure.fieldPrefix || '无')}
              {restrictionMetric('流水前缀', selectedTopStructure.sequencePrefix || '无')}
              {restrictionMetric('顺序位数', String(selectedTopStructure.orderLength || 0), 'success')}
            </div>
          </div>
        </section>
        <section className={`${restrictionCardClass} xl:col-span-7`}>
          {restrictionSectionHeader('结构主信息', '模块号、表名与结构归类')}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={restrictionLabelClass}>主模块号</label>
              <input type="text" value={selectedTopStructure.mainModuleCode} onChange={(event) => updateSelectedStructure({ mainModuleCode: event.target.value })} className={restrictionFieldClass} />
            </div>
            <div>
              <label className={restrictionLabelClass}>模块编码</label>
              <input type="text" value={selectedTopStructure.moduleCode} onChange={(event) => updateSelectedStructure({ moduleCode: event.target.value })} className={restrictionFieldClass} />
            </div>
            <div>
              <label className={restrictionLabelClass}>模块表名</label>
              <input type="text" value={selectedTopStructure.tableName} onChange={(event) => updateSelectedStructure({ tableName: event.target.value })} className={restrictionFieldClass} />
            </div>
            <div>
              <label className={restrictionLabelClass}>模块类型</label>
              <input type="text" value={selectedTopStructure.moduleType} onChange={(event) => updateSelectedStructure({ moduleType: event.target.value })} className={restrictionFieldClass} />
            </div>
            <div className="sm:col-span-2">
              <label className={restrictionLabelClass}>模块结构</label>
              <input type="text" value={selectedTopStructure.moduleSchema} onChange={(event) => updateSelectedStructure({ moduleSchema: event.target.value })} className={restrictionFieldClass} />
            </div>
          </div>
        </section>
        <section className={`${restrictionCardClass} xl:col-span-5`}>
          {restrictionSectionHeader('前缀与关联', '编码前缀与主表关联')}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={restrictionLabelClass}>字段前缀</label>
              <input type="text" value={selectedTopStructure.fieldPrefix} onChange={(event) => updateSelectedStructure({ fieldPrefix: event.target.value })} className={restrictionFieldClass} />
            </div>
            <div>
              <label className={restrictionLabelClass}>流水号前缀</label>
              <input type="text" value={selectedTopStructure.sequencePrefix} onChange={(event) => updateSelectedStructure({ sequencePrefix: event.target.value })} className={restrictionFieldClass} />
            </div>
            <div>
              <label className={restrictionLabelClass}>流水号规则</label>
              <input type="text" value={selectedTopStructure.sequenceRule} onChange={(event) => updateSelectedStructure({ sequenceRule: event.target.value })} className={restrictionFieldClass} />
            </div>
            <div>
              <label className={restrictionLabelClass}>顺序号长度</label>
              <input type="number" value={selectedTopStructure.orderLength} onChange={(event) => updateSelectedStructure({ orderLength: Number(event.target.value) || 0 })} className={restrictionFieldClass} />
            </div>
            <div className="sm:col-span-2">
              <label className={restrictionLabelClass}>关联主表字段</label>
              <input type="text" value={selectedTopStructure.relationField} onChange={(event) => updateSelectedStructure({ relationField: event.target.value })} className={restrictionFieldClass} />
            </div>
          </div>
        </section>
        <section className={`${restrictionCardClass} xl:col-span-12`}>
          {restrictionSectionHeader('备注说明')}
          <textarea rows={4} value={selectedTopStructure.remark} onChange={(event) => updateSelectedStructure({ remark: event.target.value })} className={`${restrictionTextareaClass} min-h-[152px] resize-none`} />
        </section>
      </div>
    );
  };
  const renderRestrictionProcessDetail = () => {
    if (!selectedProcessDesign) {
      return <div className="flex h-full items-center justify-center rounded-[24px] border border-dashed border-slate-200/80 text-[12px] text-slate-400 dark:border-slate-700">先在上面选一条流程设计</div>;
    }
    const updateSelectedProcess = (patch: Partial<RestrictionProcessDesignItem>) => {
      setRestrictionProcessDesigns((prev) => prev.map((item) => (item.id === selectedProcessDesign.id ? { ...item, ...patch } : item)));
    };
    return (
      <div className={restrictionDetailGridClass}>
        <section className={`${restrictionHeroClass} xl:col-span-12`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex h-8 items-center rounded-full bg-[color:var(--workspace-accent)] px-3 text-[11px] font-black text-white shadow-[0_18px_30px_-24px_var(--workspace-accent-shadow)]">
                  流程设计
                </span>
                <span className="inline-flex h-8 items-center rounded-full bg-white/92 px-3 text-[11px] font-bold text-slate-500 dark:bg-slate-900/78 dark:text-slate-300">
                  {selectedProcessDesign.schemeCode || '未编号'}
                </span>
              </div>
              <input
                type="text"
                value={selectedProcessDesign.schemeName}
                onChange={(event) => updateSelectedProcess({ schemeName: event.target.value })}
                placeholder="输入流程方案名称"
                className={restrictionHeroTitleInputClass}
              />
            </div>
            <div className={restrictionHeroMetricGridClass}>
              {restrictionMetric('方案 ID', selectedProcessDesign.planValue || '未设置', 'accent')}
              {restrictionMetric('业务编号', selectedProcessDesign.businessCode || '未设置')}
              {restrictionMetric('方案编号', selectedProcessDesign.schemeCode || '未设置')}
              {restrictionMetric('业务类型', selectedProcessDesign.businessType || '未设置', 'success')}
            </div>
          </div>
        </section>
        <section className={`${restrictionCardClass} xl:col-span-6`}>
          {restrictionSectionHeader('审批方案主信息', '方案标识与业务挂接')}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={restrictionLabelClass}>审批方案 ID 值</label>
              <input type="text" value={selectedProcessDesign.planValue} onChange={(event) => updateSelectedProcess({ planValue: event.target.value })} className={restrictionFieldClass} />
            </div>
            <div>
              <label className={restrictionLabelClass}>对应业务编号</label>
              <input type="text" value={selectedProcessDesign.businessCode} onChange={(event) => updateSelectedProcess({ businessCode: event.target.value })} className={restrictionFieldClass} />
            </div>
            <div>
              <label className={restrictionLabelClass}>审批方案编号</label>
              <input type="text" value={selectedProcessDesign.schemeCode} onChange={(event) => updateSelectedProcess({ schemeCode: event.target.value })} className={restrictionFieldClass} />
            </div>
            <div>
              <label className={restrictionLabelClass}>所属业务类型</label>
              <input type="text" value={selectedProcessDesign.businessType} onChange={(event) => updateSelectedProcess({ businessType: event.target.value })} className={restrictionFieldClass} />
            </div>
          </div>
        </section>
        <section className={`${restrictionCardClass} xl:col-span-6`}>
          {restrictionSectionHeader('权限范围')}
          <textarea rows={4} value={selectedProcessDesign.permissionScope} onChange={(event) => updateSelectedProcess({ permissionScope: event.target.value })} className={`${restrictionTextareaClass} min-h-[172px] resize-none`} />
        </section>
        <section className={`${restrictionCardClass} xl:col-span-12`}>
          {restrictionSectionHeader(
            '操作说明',
            '审批说明与执行建议',
            restrictionLongTextButton('流程操作说明', selectedProcessDesign.actionDescription, '描述流程设计动作和审批说明', (value) => updateSelectedProcess({ actionDescription: value })),
          )}
          <textarea rows={7} value={selectedProcessDesign.actionDescription} onChange={(event) => updateSelectedProcess({ actionDescription: event.target.value })} className={`${restrictionTextareaClass} min-h-[190px] resize-none`} />
        </section>
      </div>
    );
  };
  const renderRestrictionDetailPanel = () => {
    if (restrictionActiveTab === 'guard') return renderRestrictionMeasureDetail();
    if (restrictionActiveTab === 'number') return renderRestrictionNumberDetail();
    if (restrictionActiveTab === 'structure') return renderRestrictionStructureDetail();
    return renderRestrictionProcessDetail();
  };
  const renderRestrictionWorkbench = () => {
    const activeRestrictionTabLabel = restrictionTabMeta.find((item) => item.id === restrictionActiveTab)?.label ?? '限制措施';
    const activeRestrictionSummary = activeRestrictionRow
      ? restrictionActiveTab === 'guard'
        ? (activeRestrictionRow.description || '限制措施')
        : restrictionActiveTab === 'number'
          ? `${activeRestrictionRow.segmentType || '编号段'} · ${activeRestrictionRow.segmentValue || '空值'}`
          : restrictionActiveTab === 'structure'
            ? (activeRestrictionRow.tableDesc || activeRestrictionRow.tableName || '结构项')
            : restrictionActiveTab === 'process'
              ? (activeRestrictionRow.schemeName || '流程方案')
              : (activeRestrictionRow.fieldName || '字段')
      : '暂无选中项';
    return (
    <div style={workspaceThemeVars} className={`cloudy-glass-stage cloudy-cloud-grid studio-grid-bg flex h-full flex-1 min-h-0 overflow-hidden rounded-[36px] p-2.5 ${workspaceThemeStyles.tableSurface}`}>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[32px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(245,248,252,0.96))] px-4 pb-4 pt-3 shadow-[0_32px_80px_-56px_rgba(15,23,42,0.42)] dark:border-slate-700 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.88),rgba(15,23,42,0.96))]">
        <div className="min-w-0">
          <div className="truncate text-[20px] font-black tracking-[-0.03em] text-slate-900 dark:text-white">{currentModuleName}</div>
        </div>
        <div className="scrollbar-none mt-3 flex flex-nowrap gap-2 overflow-x-auto border-b border-slate-200/80 pb-3 dark:border-slate-700">
          {restrictionTabMeta.map((tab) => {
            const active = restrictionActiveTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setRestrictionActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-bold transition-all ${active ? 'border-[color:var(--workspace-accent-border-strong)] bg-[color:var(--workspace-accent-soft)] text-[color:var(--workspace-accent-strong)] shadow-[0_16px_30px_-26px_var(--workspace-accent-shadow)]' : 'border-slate-200/80 bg-white/90 text-slate-500 hover:border-[color:var(--workspace-accent-border)] hover:text-slate-700 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:text-slate-100'}`}
              >
                <span className={`material-symbols-outlined text-[16px] ${active ? 'text-[color:var(--workspace-accent)]' : tab.accent}`}>{tab.icon}</span>
                <span>{tab.label}</span>
                <span className={`inline-flex min-w-[20px] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-black ${active ? 'bg-white text-[color:var(--workspace-accent-strong)]' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-200'}`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-3 grid min-h-0 flex-1 gap-3 overflow-hidden xl:grid-cols-[minmax(320px,392px)_minmax(0,1fr)]">
          <section className={`${restrictionPanelClass} min-h-0`}>
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200/80 px-4 py-3 dark:border-slate-700">
              <div className="min-w-0">
                <div className="text-[11px] font-bold tracking-[0.08em] text-slate-400">{activeRestrictionTabLabel}</div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <div className="text-[14px] font-bold text-slate-800 dark:text-slate-100">规则列表</div>
                  <span className="rounded-full border border-slate-200/80 bg-white/90 px-2.5 py-1 text-[10px] font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300">
                    {activeRestrictionRows.length}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={handleAddRestrictionItem} className="inline-flex h-8 items-center gap-1.5 rounded-[13px] bg-[color:var(--workspace-accent)] px-3.5 text-[11px] font-bold text-white shadow-[0_18px_30px_-24px_var(--workspace-accent-shadow)] transition-colors hover:bg-[color:var(--workspace-accent-strong)]">
                  <span className="material-symbols-outlined text-[14px]">add</span>
                  新增
                </button>
                <button type="button" onClick={handleDuplicateRestrictionItem} className="inline-flex h-8 items-center gap-1.5 rounded-[13px] border border-slate-200/80 bg-white px-3.5 text-[11px] font-bold text-slate-600 transition-colors hover:border-[color:var(--workspace-accent-border-strong)] hover:text-[color:var(--workspace-accent-strong)] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                  <span className="material-symbols-outlined text-[14px]">content_copy</span>
                  复制
                </button>
                <button type="button" onClick={handleDeleteRestrictionItem} className="inline-flex h-8 items-center gap-1.5 rounded-[13px] border border-rose-200 bg-rose-50 px-3.5 text-[11px] font-bold text-rose-500 transition-colors hover:bg-rose-100 dark:border-rose-500/20 dark:bg-rose-500/10">
                  <span className="material-symbols-outlined text-[14px]">delete</span>
                  删除
                </button>
                <button type="button" onClick={handleSaveRestrictionTab} className="inline-flex h-8 items-center gap-1.5 rounded-[13px] border border-slate-200/80 bg-white px-3.5 text-[11px] font-bold text-slate-600 transition-colors hover:border-[color:var(--workspace-accent-border-strong)] hover:text-[color:var(--workspace-accent-strong)] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                  <span className="material-symbols-outlined text-[14px]">save</span>
                  保存
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden px-3 pb-3 pt-3">
              {renderRestrictionMasterList()}
            </div>
          </section>
          <section className={`${restrictionPanelClass} min-h-0`}>
            <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 px-4 py-3 dark:border-slate-700">
              <div className="min-w-0">
                <div className="text-[11px] font-bold tracking-[0.08em] text-slate-400">配置面板</div>
                <div className="mt-1 truncate text-[15px] font-black tracking-[-0.02em] text-slate-800 dark:text-slate-100">{activeRestrictionSummary}</div>
              </div>
              <div className="rounded-full bg-slate-100/90 px-3 py-1 text-[10px] font-bold text-slate-500 dark:bg-slate-800/80 dark:text-slate-300">
                {activeRestrictionTabLabel}
              </div>
            </div>
            <div className="scrollbar-none min-h-0 flex-1 overflow-auto px-4 pb-3 pt-2.5">
              {renderRestrictionDetailPanel()}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
  };

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
            <h2 className="text-base font-bold text-slate-900 dark:text-white">模块配置工作台</h2>
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
              key={activeMenu}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="h-full flex flex-col"
            >
              {/* Top Section */}
              <div className="flex justify-between items-start mb-10 shrink-0">
                <div className="space-y-2">
                  <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    {activeMenuName} <span className="text-primary/40 ml-1 text-2xl">/</span> <span className="text-slate-400 font-medium text-lg">{activeMenuCode}</span>
                  </h3>
                  <p className="text-slate-500 text-sm max-w-2xl leading-relaxed">
                    管理{activeSubsystemName}子系统下的{activeMenuName}相关业务模块。在这里您可以进行精细化核算配置、数据模型定义以及 AI 增强逻辑的导入。
                  </p>
                </div>
                <button onClick={openNewModuleGuide} className="flex items-center gap-2 px-6 py-3 bg-primary text-white font-bold rounded-xl shadow-xl shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0 transition-all">
                  <span className="material-symbols-outlined text-xl">add</span>
                  <span>新增业务模块</span>
                </button>
              </div>

              {/* Grid of Module Cards */}
              <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                {isLoadingSecondLevelMenus ? (
                  <div className="col-span-full flex min-h-[280px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/60 px-8 py-12 text-center text-slate-400 dark:border-slate-800 dark:bg-slate-900/40">
                    正在加载二级菜单明细...
                  </div>
                ) : secondLevelMenuCount > 0 ? (
                  secondLevelMenus.map((menu, index) => {
                    const cardStyle = secondLevelMenuCardStyles[index % secondLevelMenuCardStyles.length];
                    const isDeletingMenu = deletingMenuId === menu.id;
                    const isMenuEnabled = isUseflagEnabled(menu.useflag, menu.enabled);
                    const menuCodeLabel = normalizeMenuCode(menu.code) || `${activeMenuCodePrefix}-${index + 1}`;
                    const menuStructLabel = normalizeMenuCode(menu.menuStruct) || '未配置';
                    const purviewLabel = normalizeMenuCode(menu.purviewId) || '未配置';
                    const moduleTypeProfile = getMenuModuleTypeProfile(menu.moduleType);
                    const moduleTypeLabel = moduleTypeProfile?.label ?? '未定义类型';
                    const moduleTypeBadgeClass =
                      moduleTypeProfile?.badgeClass ??
                      'border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300';
                    const moduleTypeIcon = moduleTypeProfile?.icon ?? 'category';
                    const statusBadgeClass = isMenuEnabled
                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50'
                      : 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400 border-amber-100 dark:border-amber-900/50';
                    const statusDotClass = isMenuEnabled ? 'bg-emerald-500' : 'bg-amber-500';
                    const statusText = isMenuEnabled ? '已启用' : '已禁用';

                    return (
                      <div
                        key={menu.id}
                        className="group relative flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900 dark:hover:shadow-black/50"
                      >
                        <div className="flex items-start justify-between p-6 pb-0">
                          <div className={`size-14 rounded-2xl border flex items-center justify-center transition-all duration-300 ${cardStyle.iconClass}`}>
                            <span className="material-symbols-outlined text-3xl">{cardStyle.icon}</span>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <div className={`flex items-center gap-2 rounded-full border px-2.5 py-1 ${statusBadgeClass}`}>
                              <span className={`status-dot ${statusDotClass}`}></span>
                              <span className="text-[11px] font-bold uppercase tracking-wide">
                                {statusText}
                              </span>
                            </div>
                            <div className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${moduleTypeBadgeClass}`}>
                              <span className="material-symbols-outlined text-[14px]">{moduleTypeIcon}</span>
                              <span className="text-[11px] font-semibold tracking-wide">{moduleTypeLabel}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex-1 p-6 pt-5">
                          <h4 className="mb-1 text-lg font-bold tracking-tight text-slate-900 transition-colors group-hover:text-primary dark:text-white">
                            {normalizeMenuTitle(menu.title)}
                          </h4>
                          <div className="mb-4 flex items-center gap-2">
                            <code className="rounded border border-slate-200/50 bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                              {menuCodeLabel}
                            </code>
                          </div>
                          <p className="line-clamp-3 text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
                            隶属 {activeSubsystemName} / {activeMenuName}，菜单结构 {menuStructLabel}，权限标识 {purviewLabel}。
                          </p>
                        </div>
                        <div className="flex items-center justify-between rounded-b-2xl border-t border-slate-100 bg-slate-50/50 px-6 py-4 dark:border-slate-800 dark:bg-slate-800/30">
                          <div className="flex gap-4">
                            <button
                              onClick={() => handleSecondLevelMenuConfig(menu)}
                              disabled={isDeletingMenu}
                              className={`flex items-center gap-1.5 text-[13px] font-bold text-slate-500 transition-colors ${cardStyle.actionClass}`}
                            >
                              <span className="material-symbols-outlined text-[18px]">tune</span>
                              配置
                            </button>
                            <button
                              type="button"
                              disabled={isDeletingMenu}
                              onClick={() => setPendingDeleteMenu(menu)}
                              className={`flex items-center gap-1.5 text-[13px] font-bold transition-colors ${
                                isDeletingMenu
                                  ? 'cursor-not-allowed text-rose-300 dark:text-rose-800'
                                  : 'text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300'
                              }`}
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                              {isDeletingMenu ? '删除中...' : '删除'}
                            </button>
                          </div>
                          <button className={`size-8 rounded-lg border border-transparent text-slate-400 transition-all flex items-center justify-center hover:bg-white dark:hover:bg-slate-700 hover:border-slate-200 dark:hover:border-slate-600 ${cardStyle.actionClass}`}>
                            <span className="material-symbols-outlined text-lg">more_horiz</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="col-span-full flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/50 px-8 py-12 text-center dark:border-slate-800 dark:bg-slate-900/40">
                    <div className="mb-5 flex size-16 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
                      <span className="material-symbols-outlined text-4xl">view_module</span>
                    </div>
                    <div className="text-lg font-bold text-slate-900 dark:text-white">暂无二级菜单卡片</div>
                    <p className="mt-2 max-w-md text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
                      {activeFirstLevelMenuName
                        ? `当前一级菜单「${activeFirstLevelMenuName}」下还没有返回二级菜单数据。`
                        : '请先从左侧选择一级菜单，右侧会加载对应的二级菜单明细卡片。'}
                    </p>
                  </div>
                )}
                <button onClick={openNewModuleGuide} className="group relative rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-8 flex flex-col items-center justify-center bg-white/40 dark:bg-slate-900/40 hover:bg-primary/5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 min-h-[320px]">
                  <div className="size-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-6 group-hover:bg-primary group-hover:scale-110 transition-all duration-300 shadow-inner">
                    <span className="material-symbols-outlined text-4xl text-slate-400 group-hover:text-white transition-colors">add</span>
                  </div>
                  <div className="text-center">
                    <h5 className="text-base font-bold text-slate-900 dark:text-white mb-2 group-hover:text-primary transition-colors">新增业务模块</h5>
                    <p className="text-[13px] text-slate-500 max-w-[180px] leading-relaxed">基于 AI 模型快速生成，或手动配置新的业务单元。</p>
                  </div>
                  <div className="mt-8 flex gap-2">
                    <span className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded text-[11px] font-medium text-slate-400 group-hover:text-slate-600 transition-colors">快速配置</span>
                    <span className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded text-[11px] font-medium text-slate-400 group-hover:text-slate-600 transition-colors">AI 生成</span>
                  </div>
                </button>
              </div>

              {/* Footer / Status Summary */}
              <div className="mt-auto pt-8 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-sm text-slate-500">
                <div className="flex items-center gap-6">
                  <p>展示 <span className="font-bold text-slate-900 dark:text-white">{secondLevelMenuCount}</span> 个菜单明细卡片</p>
                  <div className="flex items-center gap-4 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                    <div className="flex items-center gap-1.5"><span className="status-dot bg-emerald-500"></span> {secondLevelMenuCount} 已加载</div>
                    {isLoadingSecondLevelMenus ? (
                      <div className="flex items-center gap-1.5"><span className="status-dot bg-amber-500"></span> 同步中</div>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-4 py-2 text-[12px] font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300">
                  <span className="material-symbols-outlined text-[16px] text-primary">folder_managed</span>
                  {activeSubsystemName}
                  {activeFirstLevelMenuName ? ` / ${activeFirstLevelMenuName}` : ''}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {renderDeleteConfirmModal()}

      {/* Full-screen Config Modal */}
      <AnimatePresence>
        {isConfigOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-background-light dark:bg-background-dark flex overflow-hidden"
          >
            {/* Toast Notification */}
            <AnimatePresence>
              {toastMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -20, x: '-50%' }}
                  animate={{ opacity: 1, y: 20, x: '-50%' }}
                  exit={{ opacity: 0, y: -20, x: '-50%' }}
                  className="fixed top-0 left-1/2 z-[300] bg-rose-500 text-white px-6 py-3 rounded-xl shadow-lg font-bold flex items-center gap-2"
                >
                  <span className="material-symbols-outlined">error</span>
                  {toastMessage}
                </motion.div>
              )}
            </AnimatePresence>
            {renderLongTextEditorModal()}
            {renderArchiveLayoutCanvasModal()}
            {renderDetailBoardModal()}
            {renderMainHiddenColumnsModal()}
            {renderBuilderSelectionContextMenu()}
            {renderPreviewContextMenu()}

            {/* Left Subway Line Panel */}
            <div className={`shrink-0 overflow-hidden border-r border-slate-200 bg-white shadow-[4px_0_18px_rgba(15,23,42,0.04)] transition-all duration-300 dark:border-slate-800 dark:bg-slate-900 ${
              isConfigFullscreenActive ? 'w-0 border-r-0 p-0 opacity-0' : 'w-72 p-5 opacity-100'
            }`}>
              <div className="mb-6 flex items-center gap-3">
                <button 
                  onClick={() => setIsConfigOpen(false)}
                  className="flex size-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:text-slate-900 dark:bg-slate-800 dark:hover:text-white"
                >
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
                <span className="text-[18px] font-bold tracking-tight text-slate-900 dark:text-white">配置向导</span>
              </div>

              <div className="relative flex flex-1 flex-col gap-6">
                {/* Continuous Line */}
                <div className="absolute left-[15px] top-4 bottom-6 w-px rounded-full bg-slate-200 dark:bg-slate-800" />
                
                {configSteps.map((step) => {
                  const isActive = configStep === step.id;
                  const isCompleted = completedSteps.includes(step.id);
                  const isLocked = activeConfigMenu !== null && step.id === 1;
                  
                  return (
                    <div 
                      key={step.id} 
                      onClick={() => {
                        if (isLocked) {
                          showToast('编辑模式已锁定类型');
                          return;
                        }
                        setConfigStep(step.id);
                      }}
                      className={`relative z-10 flex items-start gap-3 group ${isLocked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                    >
                      {/* Node */}
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all duration-500 ${
                        isLocked
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                          : isCompleted
                            ? isActive 
                              ? 'bg-emerald-500 shadow-[0_0_0_6px_rgba(16,185,129,0.14)]'
                              : 'bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.1)]'
                            : isActive 
                              ? 'bg-primary shadow-[0_0_0_6px_rgba(14,116,144,0.12)] dark:shadow-[0_0_0_6px_rgba(14,116,144,0.24)]' 
                              : 'bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 group-hover:border-primary/50'
                      }`}>
                        {isLocked ? (
                          <span className="material-symbols-outlined text-[18px]">lock</span>
                        ) : isCompleted ? (
                          <span className="material-symbols-outlined text-white text-[20px] font-bold">check</span>
                        ) : isActive ? (
                          <motion.div layoutId="activeNode" className="w-3 h-3 bg-white rounded-full" />
                        ) : (
                          <span className="text-[12px] font-bold text-slate-400">{step.id}</span>
                        )}
                      </div>
                      
                      {/* Text */}
                      <div className="mt-0 flex flex-col">
                        <span className={`text-[14px] font-semibold transition-colors duration-300 ${
                          isActive ? 'text-primary' : isCompleted ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                        }`}>
                          {step.title}
                        </span>
                        <span className="mt-1 text-[11px] leading-5 text-slate-500">{step.desc}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Content Area */}
            <div className="relative flex min-w-0 flex-1 flex-col bg-slate-100/60 dark:bg-slate-900/50">
              {/* Ambient Background */}
              <div className="pointer-events-none absolute inset-0 mesh-bg opacity-20"></div>
              {isConfigFullscreenActive && (
                <div className="absolute right-6 top-6 z-20">
                  <button
                    onClick={() => setIsConfigOpen(false)}
                    className="flex size-11 items-center justify-center rounded-2xl border border-white/80 bg-white/85 text-slate-500 shadow-[0_20px_35px_-24px_rgba(15,23,42,0.45)] transition-all hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-300 dark:hover:text-white"
                  >
                    <span className="material-symbols-outlined text-[20px]">close</span>
                  </button>
                </div>
              )}
               
              <div className={`relative z-10 flex flex-1 flex-col ${
                isConfigFullscreenActive ? 'overflow-hidden p-3 lg:p-4' : isModuleSettingStep ? 'overflow-y-auto p-4 lg:p-4' : 'overflow-y-auto p-6 lg:p-8'
              }`}>
                <motion.div
                  key={configStep}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className={`mx-auto flex w-full flex-1 min-h-0 flex-col ${isConfigFullscreenActive ? 'max-w-none overflow-hidden' : isModuleSettingStep ? 'max-w-none' : 'max-w-[1600px]'}`}
                >
                  <div className="mb-0"></div>

                  {/* Dynamic Content Area */}
                  {configStep === 1 && (
                    <div className="flex flex-1 flex-col gap-8">
                      <div className="rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top_right,rgba(49,98,255,0.12),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,250,255,0.98))] p-8 shadow-[0_28px_80px_-48px_rgba(15,23,42,0.32)] dark:border-slate-700 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(15,23,42,0.98))]">
                        <div className="max-w-3xl space-y-3">
                          <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-[11px] font-bold tracking-[0.24em] text-primary">
                            模块引导
                          </div>
                          <h3 className="text-[30px] font-black tracking-tight text-slate-900 dark:text-white">先选择本次要创建的模块类型</h3>
                          <p className="text-[14px] leading-7 text-slate-500 dark:text-slate-300">
                            这一步只决定后续模块主配置表。第二步菜单信息统一写入 <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[12px] text-slate-700 dark:bg-slate-800 dark:text-slate-200">{MENU_CONFIG_TABLE_NAME}</code>，选中的类型会影响后续模块配置落到哪张主表。
                          </p>
                        </div>
                      </div>

                      <div className="grid flex-1 gap-6 lg:grid-cols-2">
                        {MODULE_TYPE_OPTIONS.map((option) => {
                          const isActive = businessType === option.value;
                          const guide = MODULE_GUIDE_PROFILES[option.value];

                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => handleBusinessTypeChange(option.value)}
                              className={`group relative overflow-hidden rounded-[28px] border p-7 text-left transition-all ${
                                isActive
                                  ? 'border-primary/35 bg-[linear-gradient(180deg,rgba(239,246,255,0.96),rgba(255,255,255,0.98))] shadow-[0_32px_70px_-42px_rgba(49,98,255,0.42)] dark:border-primary/40 dark:bg-[linear-gradient(180deg,rgba(30,41,59,0.98),rgba(15,23,42,1))]'
                                  : 'border-slate-200 bg-white hover:-translate-y-1 hover:border-primary/25 hover:shadow-[0_30px_60px_-46px_rgba(15,23,42,0.3)] dark:border-slate-700 dark:bg-slate-900/80'
                              }`}
                            >
                              <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-primary/8 blur-3xl transition-opacity group-hover:opacity-100" />
                              <div className="relative z-10 flex h-full flex-col">
                                <div className="flex items-start justify-between gap-4">
                                  <div className={`flex size-14 items-center justify-center rounded-2xl border ${
                                    isActive
                                      ? 'border-primary/20 bg-primary text-white shadow-[0_18px_34px_-20px_rgba(49,98,255,0.46)]'
                                      : 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                  }`}>
                                    <span className="material-symbols-outlined text-[26px]">{option.icon}</span>
                                  </div>
                                  <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-bold ${
                                    isActive
                                      ? 'border-primary/20 bg-primary/10 text-primary'
                                      : 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                  }`}>
                                    <span className="material-symbols-outlined text-[15px]">{isActive ? 'check_circle' : 'radio_button_unchecked'}</span>
                                    {isActive ? '当前选择' : '点击选择'}
                                  </div>
                                </div>

                                <div className="mt-6 space-y-3">
                                  <div className="flex items-center gap-3">
                                    <h4 className="text-[24px] font-black tracking-tight text-slate-900 dark:text-white">{guide.label}</h4>
                                    <code className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                      {guide.configTable}
                                    </code>
                                  </div>
                                  <p className="text-[14px] leading-7 text-slate-500 dark:text-slate-300">{guide.intro}</p>
                                </div>

                                <div className="mt-6 rounded-[22px] border border-slate-200/80 bg-white/82 p-5 dark:border-slate-700 dark:bg-slate-950/40">
                                  <div className="text-[12px] font-bold tracking-[0.18em] text-slate-400">后续模块主表</div>
                                  <div className="mt-2 text-[16px] font-bold text-slate-800 dark:text-slate-100">{guide.configTableDesc}</div>
                                  <div className="mt-4 flex flex-wrap gap-2">
                                    {guide.keyFields.map((field) => (
                                      <span key={`${option.value}-${field}`} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                        {field}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {configStep === 2 && renderMenuInfoStep()}

                  {false && (
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 flex-1">
                      {/* Left Column: Core Information */}
                      <div className="xl:col-span-2 flex flex-col gap-8">
                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm p-8 relative overflow-hidden">
                          {/* Decorative background element */}
                          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
                          
                          <div className="relative z-10">
                            <div className="space-y-6">
                              <div className="grid grid-cols-2 gap-6">
                                {/* 模块编码 */}
                                <div className="space-y-2.5">
                                  <label className="text-[13px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                    模块编码 <span className="text-rose-500">*</span>
                                  </label>
                                  <div className="relative flex items-center">
                                    <span className="absolute left-4 text-slate-400 material-symbols-outlined text-[18px]">tag</span>
                                    <input type="text" className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-mono text-slate-700 dark:text-slate-200 font-medium" defaultValue="FM-CO-001" />
                                  </div>
                                </div>

                                {/* 模块名称 */}
                                <div className="space-y-2.5">
                                  <label className="text-[13px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                    模块名称 <span className="text-rose-500">*</span>
                                  </label>
                                  <div className="relative flex items-center">
                                    <span className="absolute left-4 text-slate-400 material-symbols-outlined text-[18px]">title</span>
                                    <input type="text" className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-900 dark:text-white font-bold" defaultValue="成本控制" />
                                  </div>
                                </div>
                              </div>

                              {/* 模块类型 */}
                              <div className="space-y-2.5">
                                <div className="flex items-center justify-between gap-4">
                                  <label className="text-[13px] font-bold text-slate-700 dark:text-slate-300">模块类型</label>
                                  <button
                                    type="button"
                                    onClick={() => setConfigStep(1)}
                                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-bold text-slate-500 transition-colors hover:border-primary/30 hover:text-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                                  >
                                    <span className="material-symbols-outlined text-[14px]">swap_horiz</span>
                                    返回切换类型
                                  </button>
                                </div>
                                <div className="rounded-[20px] border border-primary/10 bg-[linear-gradient(135deg,rgba(239,246,255,0.88),rgba(255,255,255,0.96))] p-5 dark:border-primary/20 dark:bg-[linear-gradient(180deg,rgba(30,41,59,0.86),rgba(15,23,42,0.94))]">
                                  <div className="flex flex-wrap items-center gap-3">
                                    <span className="inline-flex items-center gap-2 rounded-full bg-primary px-3 py-1 text-[11px] font-bold text-white shadow-[0_12px_24px_-16px_rgba(49,98,255,0.48)]">
                                      <span className="material-symbols-outlined text-[15px]">
                                        {businessType === 'table' ? 'receipt_long' : 'table_view'}
                                      </span>
                                      {currentModuleGuide.label}
                                    </span>
                                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                                      主配置表：{currentModuleGuide.configTable}
                                    </span>
                                  </div>
                                  <p className="mt-3 text-[13px] leading-6 text-slate-500 dark:text-slate-300">
                                    {currentModuleGuide.intro}
                                  </p>
                                </div>
                              </div>

                              {/* 常用功能 */}
                              <div className="space-y-3">
                                <label className="text-[13px] font-bold text-slate-700 dark:text-slate-300">常用功能配置</label>
                                <div className="flex flex-wrap gap-3 relative">
                                  {commonFuncs.map(funcId => {
                                    const func = funcOptions.find(f => f.id === funcId);
                                    if (!func) return null;
                                    return (
                                      <div key={func.id} className="px-4 py-2.5 rounded-xl bg-primary/10 border border-primary/30 text-primary text-[13px] font-bold flex items-center gap-2 shadow-sm">
                                        <span className="material-symbols-outlined text-[18px]">{func.icon}</span>
                                        {func.name}
                                        <button onClick={() => toggleFunc(func.id)} className="ml-1 hover:text-rose-500 transition-colors flex items-center justify-center">
                                          <span className="material-symbols-outlined text-[16px]">close</span>
                                        </button>
                                      </div>
                                    );
                                  })}
                                  <div className="relative">
                                    <button onClick={() => setIsFuncPopoverOpen(!isFuncPopoverOpen)} className="px-4 py-2.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 text-slate-500 hover:text-primary hover:border-primary/50 hover:bg-primary/5 text-[13px] font-bold flex items-center gap-2 transition-all">
                                      <span className="material-symbols-outlined text-[18px]">add</span>
                                      添加功能
                                    </button>
                                    
                                    <AnimatePresence>
                                      {isFuncPopoverOpen && (
                                        <>
                                          <div className="fixed inset-0 z-40" onClick={() => setIsFuncPopoverOpen(false)}></div>
                                          <motion.div 
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                            className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 p-2"
                                          >
                                            <div className="text-[12px] font-bold text-slate-400 mb-2 px-2 pt-1">选择常用功能</div>
                                            <div className="space-y-1">
                                              {funcOptions.map(func => {
                                                const isSelected = commonFuncs.includes(func.id);
                                                return (
                                                  <button
                                                    key={func.id}
                                                    onClick={() => toggleFunc(func.id)}
                                                    className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between text-[13px] transition-colors ${isSelected ? 'bg-primary/10 text-primary font-bold' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                                                  >
                                                    <div className="flex items-center gap-2">
                                                      <span className="material-symbols-outlined text-[18px]">{func.icon}</span>
                                                      {func.name}
                                                    </div>
                                                    {isSelected && <span className="material-symbols-outlined text-[16px]">check</span>}
                                                  </button>
                                                );
                                              })}
                                            </div>
                                          </motion.div>
                                        </>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                </div>
                              </div>

                              {/* 妯″潡绠€浠?*/}
                              <div className="space-y-2.5">
                                <label className="text-[13px] font-bold text-slate-700 dark:text-slate-300">模块简介</label>
                                <textarea className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none text-slate-700 dark:text-slate-300 leading-relaxed" rows={4} defaultValue="核心成本控制核算系统，包含凭证处理、账簿查询、报表生成等基础控制能力，支持跨部门自动结算。"></textarea>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right Column: Visual & Routing */}
                      <div className="flex flex-col gap-6">
                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
                          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50 flex items-center gap-3">
                            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                              <span className="material-symbols-outlined text-[18px]">schema</span>
                            </div>
                            <h3 className="text-[15px] font-bold text-slate-800 dark:text-slate-200">当前菜单信息写入表</h3>
                          </div>

                          <div className="p-6 space-y-4">
                            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-900/60">
                              <div className="text-[12px] font-bold tracking-[0.18em] text-slate-400">MENU TABLE</div>
                              <div className="mt-2 flex items-center gap-3">
                                <code className="rounded-xl bg-slate-900 px-3 py-2 text-[13px] font-bold text-cyan-300 dark:bg-slate-950">
                                  {MENU_CONFIG_TABLE_NAME}
                                </code>
                                <span className="text-[13px] font-semibold text-slate-600 dark:text-slate-300">{MENU_CONFIG_TABLE_DESC}</span>
                              </div>
                              <p className="mt-3 text-[12px] leading-6 text-slate-500 dark:text-slate-400">
                                第二步的菜单编码、层级、路由和启用状态，会统一对齐这张功能树菜单表。
                              </p>
                            </div>

                            <div className="space-y-2">
                              <div className="text-[12px] font-bold tracking-[0.18em] text-slate-400">关键字段</div>
                              <div className="flex flex-wrap gap-2">
                                {MENU_CONFIG_TABLE_FIELDS.map((field) => (
                                  <span key={`guide-field-${field}`} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                                    {field}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* 瑙嗚涓庣姸鎬?*/}
                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
                          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50 flex items-center gap-3">
                            <div className="size-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                              <span className="material-symbols-outlined text-[18px]">palette</span>
                            </div>
                            <h3 className="text-[15px] font-bold text-slate-800 dark:text-slate-200">视觉与状态</h3>
                          </div>

                          <div className="p-6 space-y-6">
                            {/* 图标选择器 */}
                            <div className="space-y-3">
                              <label className="text-[13px] font-bold text-slate-700 dark:text-slate-300">菜单图标</label>
                              <div className="flex items-center gap-4 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 group hover:border-primary/30 transition-all hover:shadow-sm">
                                <div className="size-12 rounded-xl bg-gradient-to-br from-primary to-indigo-600 text-white flex items-center justify-center shadow-md shadow-primary/20 group-hover:scale-105 transition-transform">
                                  <span className="material-symbols-outlined text-[24px]">payments</span>
                                </div>
                                <div className="flex-1">
                                  <div className="text-[14px] font-bold text-slate-800 dark:text-slate-200">payments</div>
                                  <div className="text-[12px] text-slate-500 mt-0.5">图标库</div>
                                </div>
                                <button className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[13px] font-bold text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-primary transition-colors shadow-sm">更换</button>
                              </div>
                            </div>

                            {/* 启用状态 */}
                            <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                              <div>
                                <div className="text-[14px] font-bold text-slate-800 dark:text-slate-200">启用模块</div>
                                <div className="text-[12px] text-slate-500 mt-0.5">关闭后用户将无法访问此模块</div>
                              </div>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" defaultChecked />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-500"></div>
                              </label>
                            </div>
                          </div>
                        </div>

                        {/* 导航规则 */}
                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
                          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50 flex items-center gap-3">
                            <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                              <span className="material-symbols-outlined text-[18px]">route</span>
                            </div>
                            <h3 className="text-[15px] font-bold text-slate-800 dark:text-slate-200">导航规则</h3>
                          </div>

                          <div className="p-6 space-y-5">
                            <div className="space-y-3">
                              <label className="text-[13px] font-bold text-slate-700 dark:text-slate-300">所属分组</label>
                              <div className="relative group">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[18px] pointer-events-none group-hover:text-primary transition-colors">folder</span>
                                <select className="w-full pl-11 pr-10 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-700 dark:text-slate-300 cursor-pointer appearance-none font-medium hover:border-primary/30">
                                  <option>财务管理</option>
                                  <option>人力资源</option>
                                  <option>供应链管理</option>
                                </select>
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[18px] pointer-events-none">expand_more</span>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-3">
                                <label className="text-[13px] font-bold text-slate-700 dark:text-slate-300">分组序号</label>
                                <input type="number" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-700 dark:text-slate-300 font-mono hover:border-primary/30" defaultValue="1" />
                              </div>
                              <div className="space-y-3">
                                <label className="text-[13px] font-bold text-slate-700 dark:text-slate-300">行号</label>
                                <input type="number" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-700 dark:text-slate-300 font-mono hover:border-primary/30" defaultValue="10" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {configStep === 3 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.4 }}
                      className={`module-intro-shell flex flex-1 flex-col overflow-hidden min-h-[600px] ${
                        isFullscreenEditor ? 'fixed inset-4 z-[200] shadow-2xl' : ''
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                        className="hidden"
                        onChange={handleImageUpload}
                      />

                      <div className="module-intro-toolbar">
                        <div className="module-intro-toolbar-group">
                          <select
                            value={moduleIntroBlockType}
                            onChange={(event) => handleModuleIntroFormatChange(event.target.value as 'paragraph' | 'h1' | 'h2' | 'h3')}
                            className="module-intro-format-select"
                          >
                            <option value="paragraph">正文</option>
                            <option value="h1">标题 1</option>
                            <option value="h2">标题 2</option>
                            <option value="h3">标题 3</option>
                          </select>
                        </div>
                        <div className="module-intro-toolbar-group">
                          <button type="button" onMouseDown={(event) => { event.preventDefault(); applyModuleIntroCommand('bold'); }} className="module-intro-toolbar-button" title="加粗">
                            <span className="material-symbols-outlined text-[18px]">format_bold</span>
                          </button>
                          <button type="button" onMouseDown={(event) => { event.preventDefault(); applyModuleIntroCommand('italic'); }} className="module-intro-toolbar-button" title="斜体">
                            <span className="material-symbols-outlined text-[18px]">format_italic</span>
                          </button>
                          <button type="button" onMouseDown={(event) => { event.preventDefault(); applyModuleIntroCommand('underline'); }} className="module-intro-toolbar-button" title="下划线">
                            <span className="material-symbols-outlined text-[18px]">format_underlined</span>
                          </button>
                          <button type="button" onMouseDown={(event) => { event.preventDefault(); applyModuleIntroCommand('strikeThrough'); }} className="module-intro-toolbar-button" title="删除线">
                            <span className="material-symbols-outlined text-[18px]">format_strikethrough</span>
                          </button>
                        </div>
                        <div className="module-intro-toolbar-group">
                          <button type="button" onMouseDown={(event) => { event.preventDefault(); applyModuleIntroCommand('insertUnorderedList'); }} className="module-intro-toolbar-button" title="无序列表">
                            <span className="material-symbols-outlined text-[18px]">format_list_bulleted</span>
                          </button>
                          <button type="button" onMouseDown={(event) => { event.preventDefault(); applyModuleIntroCommand('insertOrderedList'); }} className="module-intro-toolbar-button" title="有序列表">
                            <span className="material-symbols-outlined text-[18px]">format_list_numbered</span>
                          </button>
                          <button type="button" onMouseDown={(event) => { event.preventDefault(); applyModuleIntroCommand('formatBlock', '<blockquote>'); }} className="module-intro-toolbar-button" title="引用">
                            <span className="material-symbols-outlined text-[18px]">format_quote</span>
                          </button>
                        </div>
                        <div className="module-intro-toolbar-group">
                          <button type="button" onMouseDown={(event) => { event.preventDefault(); handleModuleIntroLinkInsert(); }} className="module-intro-toolbar-button" title="插入链接">
                            <span className="material-symbols-outlined text-[18px]">link</span>
                          </button>
                          <button type="button" onMouseDown={(event) => { event.preventDefault(); openModuleIntroImagePicker(); }} className="module-intro-toolbar-button" title="插入图片">
                            <span className="material-symbols-outlined text-[18px]">image</span>
                          </button>
                          <button type="button" onMouseDown={(event) => { event.preventDefault(); handleModuleIntroTableInsert(); }} className="module-intro-toolbar-button" title="插入表格">
                            <span className="material-symbols-outlined text-[18px]">table_chart</span>
                          </button>
                        </div>
                        {moduleIntroSelectedImageWidth !== null && (
                          <div className="module-intro-toolbar-group module-intro-toolbar-group-image">
                            <span className="module-intro-image-size-label">图片 {moduleIntroSelectedImageWidth}px</span>
                            <button type="button" onMouseDown={(event) => { event.preventDefault(); handleModuleIntroImagePreset('small'); }} className="module-intro-image-size-button">小</button>
                            <button type="button" onMouseDown={(event) => { event.preventDefault(); handleModuleIntroImagePreset('medium'); }} className="module-intro-image-size-button">中</button>
                            <button type="button" onMouseDown={(event) => { event.preventDefault(); handleModuleIntroImagePreset('large'); }} className="module-intro-image-size-button">大</button>
                            <button type="button" onMouseDown={(event) => { event.preventDefault(); handleModuleIntroImagePreset('full'); }} className="module-intro-image-size-button">铺满</button>
                          </div>
                        )}
                        <div className="ml-auto flex items-center gap-2">
                          <div className="module-intro-status-chip">
                            <span className="material-symbols-outlined text-[15px]">gesture_select</span>
                            先选中文字，再应用格式
                          </div>
                          <button type="button" onClick={() => setIsFullscreenEditor(!isFullscreenEditor)} className="module-intro-action-button">
                            <span className="material-symbols-outlined text-[16px]">
                              {isFullscreenEditor ? 'fullscreen_exit' : 'fullscreen'}
                            </span>
                            {isFullscreenEditor ? '退出全屏' : '全屏编辑'}
                          </button>
                          <button type="button" onClick={polishModuleIntroContent} className="module-intro-primary-button">
                            <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                            AI 润色
                          </button>
                        </div>
                      </div>

                      <div className="module-intro-body">
                        <div className="module-intro-paper">
                          <div className="module-intro-paper-head">
                            <div className="min-w-0 flex-1">
                              <div className="module-intro-eyebrow">模块介绍</div>
                              <h1
                                ref={titleEditorRef}
                                className="module-intro-title"
                                contentEditable
                                suppressContentEditableWarning
                                spellCheck={false}
                                onInput={syncModuleIntroDraft}
                                onBlur={syncModuleIntroDraft}
                              />
                            </div>
                          </div>

                          <div
                            ref={editorRef}
                            className="module-intro-prose"
                            contentEditable
                            suppressContentEditableWarning
                            spellCheck={false}
                            onInput={syncModuleIntroDraft}
                            onBlur={syncModuleIntroDraft}
                            onFocus={saveModuleIntroSelection}
                            onKeyUp={saveModuleIntroSelection}
                            onMouseUp={saveModuleIntroSelection}
                            onMouseDown={handleModuleIntroEditorMouseDown}
                            onPaste={(event) => {
                              const imageItems = Array.from(event.clipboardData.files ?? []) as File[];
                              const imageFiles = imageItems.filter((file) => file.type.startsWith('image/'));
                              if (imageFiles.length === 0) return;
                              event.preventDefault();
                              handleModuleIntroImageFiles(imageFiles);
                            }}
                          />

                          <button
                            type="button"
                            onClick={openModuleIntroImagePicker}
                            onDragOver={(event) => event.preventDefault()}
                            onDrop={(event) => {
                              event.preventDefault();
                              handleModuleIntroImageFiles(event.dataTransfer.files);
                            }}
                            className="module-intro-upload-card"
                          >
                            <div className="module-intro-upload-icon">
                              <span className="material-symbols-outlined text-[24px]">add_photo_alternate</span>
                            </div>
                            <span className="module-intro-upload-title">拖拽或点击上传流程图 / 架构图</span>
                            <span className="module-intro-upload-desc">支持 PNG、JPG、SVG、WebP，上传后会直接插入到当前光标位置。</span>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {configStep === MODULE_SETTING_STEP && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.4 }}
                      className="flex min-h-0 flex-1 flex-col overflow-hidden"
                    >
                      <div ref={moduleSettingsSectionRef} className="min-h-0 flex flex-1 flex-col min-w-0">
                        {businessType === 'document' ? (
                        <div style={moduleSettingStageStyle} className={`cloudy-glass-stage cloudy-cloud-grid studio-grid-bg flex min-h-0 overflow-hidden rounded-[36px] p-3 ${workspaceThemeStyles.tableSurface} ${moduleSettingStageHeightClass}`}>
                          <div className="min-h-0 min-w-0 flex flex-1 flex-col">
                      {documentConditionToolbarNode}
                            <div className="min-h-0 min-w-0 flex flex-1 overflow-hidden">
                              {isTreePaneVisible && (
                                <>
                                  <div className="flex min-h-0 shrink-0 flex-col" style={{ width: documentLeftPaneWidth }}>
                                    {renderDocumentTreePanel()}
                                  </div>

                                  <div
                                    className="group flex w-3 shrink-0 cursor-col-resize items-center justify-center"
                                    onMouseDown={(event) => startLayoutDrag('document-left-width', event)}
                                  >
                                    <div className="cloudy-divider h-28 w-[4px] rounded-full transition-colors group-hover:bg-[color:var(--workspace-accent)] dark:bg-slate-700" />
                                  </div>
                                </>
                              )}

                              <div className="min-h-0 min-w-0 flex-1 px-1">
                                <div className="grid h-full min-h-0 grid-rows-2 gap-3 overflow-hidden">
                                  <div className="cloudy-glass-panel flex min-h-0 flex-col overflow-hidden rounded-[32px] border border-white/75">
                                    <div className="flex items-center justify-between border-b border-white/70 px-4 py-3">
                                      <div className="flex items-center gap-2">
                                        <div className="flex size-8 items-center justify-center rounded-xl bg-[color:var(--workspace-accent-soft)] text-[color:var(--workspace-accent-strong)]">
                                          <span className="material-symbols-outlined text-[16px]">table_view</span>
                                        </div>
                                        <div>
                                          <h4 className="text-[12px] font-semibold text-slate-800 dark:text-slate-200">主表字段配置</h4>
                                          <p className="mt-0.5 text-[11px] text-slate-400">隐藏列与 0 宽列会集中收纳在详细列里</p>
                                        </div>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={openMainHiddenColumnsModal}
                                        disabled={mainTableHiddenColumns.length === 0}
                                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200/80 bg-white/70 px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:bg-slate-800"
                                      >
                                        <span className="material-symbols-outlined text-[14px]">view_column</span>
                                        详细列 {mainTableHiddenColumns.length > 0 ? `(${mainTableHiddenColumns.length})` : ''}
                                      </button>
                                    </div>
                                    <div className="flex h-full min-h-0 flex-col overflow-hidden">
                                      <div
                                        className="scrollbar-none min-h-0 flex-1 overflow-auto bg-white/70 px-3 py-3 outline-none dark:bg-slate-900/90"
                                        tabIndex={0}
                                        onPaste={(e) => handlePasteColumns(e, setMainTableColumns)}
                                      >
                                      {archiveMainTableBuilderNode}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="cloudy-glass-panel min-h-0 overflow-hidden rounded-[32px] border border-white/75">
                                    <div className="flex h-full min-h-0 overflow-hidden px-3 py-3">
                                      {renderDocumentDetailWorkbench()}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex min-h-0 shrink-0 flex-col pl-2" style={{ width: inspectorPaneWidth, minWidth: inspectorPaneWidth }}>
                            {columnOperationPanel}
                          </div>
                        </div>
                      ) : businessType === 'table' ? (
                        <div style={moduleSettingStageStyle} className={`cloudy-glass-stage cloudy-cloud-grid studio-grid-bg flex flex-1 min-h-0 overflow-hidden rounded-[36px] ${isConfigFullscreenActive ? 'min-h-[640px] p-1.5' : 'p-3'} ${workspaceThemeStyles.tableSurface}`}>
                          <div className={`grid h-full min-h-0 flex-1 gap-4 ${isConfigFullscreenActive ? 'gap-3' : ''}`} style={{ gridTemplateColumns: `minmax(0,1fr) ${inspectorPaneWidth}px` }}>
                            <div className="flex h-full min-h-0">
                              {renderBillDocumentWorkbench()}
                            </div>
                            <div className="flex h-full min-h-0 shrink-0 flex-col">
                              {columnOperationPanel}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div style={moduleSettingStageStyle} className={`cloudy-glass-stage flex min-h-0 flex-col overflow-hidden rounded-[36px] ${workspaceThemeStyles.tableSurface} ${moduleSettingStageHeightClass}`}>
                          <div className={`cloudy-cloud-grid studio-grid-bg grid min-h-0 flex-1 ${
                            isConfigFullscreenActive
                              ? 'xl:grid-cols-[minmax(220px,0.72fr)_minmax(0,1.28fr)]'
                              : 'xl:grid-cols-[minmax(260px,0.82fr)_minmax(0,1.18fr)]'
                          } ${isConfigFullscreenActive ? 'gap-4 p-4' : 'gap-5 p-5'}`}>
                            <div className="cloudy-glass-panel flex min-h-0 flex-col overflow-hidden rounded-[30px] border border-white/75">
                              <div className="cloudy-glass-toolbar flex items-center justify-between px-4 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="cloudy-glass-orb flex size-9 items-center justify-center rounded-2xl text-[color:var(--workspace-accent)]">
                                    <span className="material-symbols-outlined text-[16px]">view_sidebar</span>
                                  </div>
                                  <div>
                                    <h4 className="text-[12px] font-semibold text-slate-800 dark:text-slate-200">左侧表配置</h4>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {selectedLeftForDelete.length > 0 && (
                                    <button
                                      onClick={() => deleteSelectedColumns('left', selectedLeftForDelete)}
                                      className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold text-rose-500 transition-colors hover:bg-rose-50 dark:hover:bg-rose-500/10"
                                    >
                                      <span className="material-symbols-outlined text-[14px]">delete</span>
                                      删除 ({selectedLeftForDelete.length})
                                    </button>
                                  )}
                                  <button
                                    onClick={() => setLeftTableColumns((prev) => [...prev, { id: `l_col_${Date.now()}`, name: `新字段 ${prev.length + 1}`, type: '文本', width: 120 }])}
                                    className="inline-flex items-center gap-1 rounded-lg bg-[color:var(--workspace-accent)] px-2.5 py-1 text-[11px] font-semibold text-white shadow-[0_10px_18px_-16px_rgba(15,23,42,0.2)] transition-all hover:bg-[color:var(--workspace-accent-strong)]"
                                  >
                                    <span className="material-symbols-outlined text-[14px]">add</span>
                                    新增
                                  </button>
                                </div>
                              </div>
                              <div
                                className="scrollbar-none min-h-0 flex-1 overflow-auto outline-none"
                                tabIndex={0}
                                onPaste={(e) => handlePasteColumns(e, setLeftTableColumns)}
                              >
                                <div className="px-3 pb-3 pt-2">
                                  {builderLeftTableBuilderNode}
                                </div>
                              </div>
                            </div>

                            <div className="grid min-h-0 gap-5 lg:grid-rows-[minmax(0,1fr)_minmax(0,1fr)]">
                              <div className="cloudy-glass-panel flex min-h-0 flex-col overflow-hidden rounded-[30px] border border-white/75">
                                <div className="cloudy-glass-toolbar flex items-center justify-between px-4 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="cloudy-glass-orb flex size-9 items-center justify-center rounded-2xl text-emerald-500">
                                      <span className="material-symbols-outlined text-[16px]">table_rows</span>
                                    </div>
                                    <div>
                                      <div className="flex flex-wrap items-center gap-2">
                                        <h4 className="text-[12px] font-semibold text-slate-800 dark:text-slate-200">主表字段配置</h4>
                                        {isSingleTableFieldsLoading && normalizeModuleType(activeConfigMenu?.moduleType) === 'single-table' ? (
                                          <span className="inline-flex items-center rounded-full border border-emerald-200/80 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                                            同步中
                                          </span>
                                        ) : null}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={openMainHiddenColumnsModal}
                                      disabled={mainTableHiddenColumns.length === 0}
                                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200/80 bg-white/70 px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:bg-slate-800"
                                    >
                                      <span className="material-symbols-outlined text-[14px]">view_column</span>
                                      详细列 {mainTableHiddenColumns.length > 0 ? `(${mainTableHiddenColumns.length})` : ''}
                                    </button>
                                    {selectedMainForDelete.length > 0 && (
                                      <button
                                        onClick={() => deleteSelectedColumns('main', selectedMainForDelete)}
                                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold text-rose-500 transition-colors hover:bg-rose-50 dark:hover:bg-rose-500/10"
                                      >
                                        <span className="material-symbols-outlined text-[14px]">delete</span>
                                        删除 ({selectedMainForDelete.length})
                                      </button>
                                    )}
                                    <button
                                      onClick={() => setMainTableColumns((prev) => [...prev, { id: `m_col_${Date.now()}`, name: `新字段 ${prev.length + 1}`, type: '文本', width: 120 }])}
                                      className="inline-flex items-center gap-1 rounded-lg bg-[color:var(--workspace-accent)] px-2.5 py-1 text-[11px] font-semibold text-white shadow-[0_10px_18px_-16px_rgba(15,23,42,0.2)] transition-all hover:bg-[color:var(--workspace-accent-strong)]"
                                    >
                                      <span className="material-symbols-outlined text-[14px]">add</span>
                                      新增
                                    </button>
                                  </div>
                                </div>
                                {renderDocumentGridToolbar(
                                  mainTableColumns,
                                  '主表字段配置',
                                  selectedMainForDelete.length,
                                  () => deleteSelectedColumns('main', selectedMainForDelete),
                                  () => setMainTableColumns((prev) => [...prev, buildColumn('m_col', prev.length + 1)]),
                                  undefined,
                                  {
                                    fields: mainFilterFields,
                                    selectedId: selectedMainFilterId,
                                    selectedIds: selectedMainFiltersForDelete,
                                    setSelectedIds: setSelectedMainFiltersForDelete,
                                    setFields: setMainFilterFields,
                                    scope: 'main',
                                    onActivate: (id) => {
                                      setSelectedArchiveNodeId('archive-filter');
                                      activateConditionSelection('main', id);
                                    },
                                    onAdd: () => {
                                      const next = buildConditionField(mainFilterFields.length + 1);
                                      setMainFilterFields((prev) => [...prev, next]);
                                      setSelectedMainFiltersForDelete([next.id]);
                                      setSelectedArchiveNodeId('archive-filter');
                                      activateConditionSelection('main', next.id);
                                    },
                                    onDelete: () => deleteSelectedConditions('main', selectedMainFiltersForDelete),
                                  },
                                  undefined,
                                  {
                                    hideActionBar: true,
                                    filterRuntimeRules: mainDocumentFilterRuntimeRules,
                                  },
                                )}
                                <div
                                  className="scrollbar-none min-h-0 flex-1 overflow-auto px-3 pb-3 outline-none"
                                  tabIndex={0}
                                  onPaste={(e) => handlePasteColumns(e, setMainTableColumns)}
                                >
                                  {builderMainTableBuilderNode}
                                </div>
                              </div>

                              <div className="flex min-h-0 flex-col overflow-hidden rounded-[28px] border border-white/80 bg-white/88 shadow-[0_30px_56px_-42px_rgba(15,23,42,0.28)] dark:border-slate-700 dark:bg-slate-800/88">
                                <div className="flex items-center justify-between border-b border-slate-200/70 bg-[linear-gradient(180deg,rgba(248,251,255,0.96),rgba(255,255,255,0.92))] px-4 py-4 dark:border-slate-700 dark:bg-slate-800/70">
                                  <div className="flex items-center gap-3">
                                    <div className="flex size-8 items-center justify-center rounded-xl bg-blue-500/12 text-blue-500">
                                      <span className="material-symbols-outlined text-[16px]">tab_group</span>
                                    </div>
                                    <div>
                                      <h4 className="text-[12px] font-semibold text-slate-800 dark:text-slate-200">明细页签配置</h4>
                                      <p className="mt-0.5 text-[11px] text-slate-400">页签与填充方式集中在这里</p>
                                    </div>
                                  </div>
                                  <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-semibold text-blue-500 dark:bg-blue-500/10">明细页签</span>
                                </div>
                                {renderDetailTabsWorkspace('builder')}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      </div>
                    </motion.div>
                  )}

                  {configStep === RESTRICTION_STEP && (
                    <motion.div
                      key="restriction-workbench"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.4 }}
                      className="flex min-h-0 flex-1 flex-col overflow-hidden"
                    >
                      {renderRestrictionWorkbench()}
                    </motion.div>
                  )}

                  {configStep === 4 && (
                    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 flex-1 min-h-[650px]">
                      <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
                        <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/50 p-5 dark:border-slate-800 dark:bg-slate-800/50">
                          <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <span className="material-symbols-outlined text-[20px]">smart_toy</span>
                          </div>
                          <div>
                            <h3 className="text-[16px] font-bold text-slate-800 dark:text-slate-200">AI 架构助手</h3>
                            <p className="text-[12px] text-slate-500">正在为您进行需求调研...</p>
                          </div>
                        </div>

                        <div className="flex-1 space-y-6 overflow-y-auto bg-slate-50/30 p-6 custom-scrollbar dark:bg-slate-900/30">
                          <div className="flex gap-4">
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-md shadow-primary/20">
                              <span className="material-symbols-outlined text-[20px]">smart_toy</span>
                            </div>
                            <div className="max-w-[85%] rounded-2xl rounded-tl-none border border-slate-100 bg-white p-4 text-[14px] leading-relaxed text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              您好。为了更好地为您构建【成本控制】模块，我需要先确认开发模式。您希望采用哪一种？
                            </div>
                          </div>

                          {surveyStep === 0 && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pl-14 flex flex-wrap gap-3">
                              {['标准 CRUD 模式', '复杂审批流模式', '数据看板模式'].map((opt) => (
                                <button
                                  key={opt}
                                  onClick={() => {
                                    setSurveyAnswers([opt]);
                                    setSurveyStep(1);
                                  }}
                                  className="rounded-xl border border-primary/20 bg-primary/5 px-5 py-2.5 text-[14px] font-bold text-primary shadow-sm transition-all hover:bg-primary hover:text-white"
                                >
                                  {opt}
                                </button>
                              ))}
                            </motion.div>
                          )}

                          {surveyStep > 0 && (
                            <div className="flex flex-row-reverse gap-4">
                              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                                <span className="material-symbols-outlined text-[20px]">person</span>
                              </div>
                              <div className="max-w-[85%] rounded-2xl rounded-tr-none bg-primary p-4 text-[14px] leading-relaxed text-white shadow-sm">
                                {surveyAnswers[0]}
                              </div>
                            </div>
                          )}

                          {surveyStep > 0 && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-4">
                              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-md shadow-primary/20">
                                <span className="material-symbols-outlined text-[20px]">smart_toy</span>
                              </div>
                              <div className="max-w-[85%] rounded-2xl rounded-tl-none border border-slate-100 bg-white p-4 text-[14px] leading-relaxed text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                好的，已选择“{surveyAnswers[0]}”。请问该模块的数据来源主要是什么？
                              </div>
                            </motion.div>
                          )}

                          {surveyStep === 1 && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pl-14 flex flex-wrap gap-3">
                              {['手工录入为主', '外部系统对接 (API)', 'Excel 批量导入'].map((opt) => (
                                <button
                                  key={opt}
                                  onClick={() => generateSurveyPlan(surveyAnswers[0], opt)}
                                  className="rounded-xl border border-primary/20 bg-primary/5 px-5 py-2.5 text-[14px] font-bold text-primary shadow-sm transition-all hover:bg-primary hover:text-white"
                                >
                                  {opt}
                                </button>
                              ))}
                            </motion.div>
                          )}

                          {surveyStep > 1 && (
                            <div className="flex flex-row-reverse gap-4">
                              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                                <span className="material-symbols-outlined text-[20px]">person</span>
                              </div>
                              <div className="max-w-[85%] rounded-2xl rounded-tr-none bg-primary p-4 text-[14px] leading-relaxed text-white shadow-sm">
                                {surveyAnswers[1]}
                              </div>
                            </div>
                          )}

                          {surveyStep > 1 && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-4">
                              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md shadow-emerald-500/20">
                                <span className="material-symbols-outlined text-[20px]">check</span>
                              </div>
                              <div className="max-w-[85%] rounded-2xl rounded-tl-none border border-slate-100 bg-white p-4 text-[14px] leading-relaxed text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                调研完成，我已经理解您的需求。右侧是为您生成的底层领域模型与执行计划，请查阅。
                              </div>
                            </motion.div>
                          )}
                        </div>

                        {surveyStep > 1 && (
                          <div className="border-t border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                            <button
                              onClick={resetSurveyFlow}
                              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 text-[14px] font-bold text-slate-600 shadow-sm transition-all hover:text-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-primary"
                            >
                              <span className="material-symbols-outlined text-[18px]">refresh</span>
                              重新开始调研
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="relative flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
                        <div className="pointer-events-none absolute left-1/2 top-0 h-48 w-[120%] -translate-x-1/2 bg-primary/20 blur-[80px]"></div>

                        <div className="relative z-10 mb-8 flex items-center justify-between">
                          <h3 className="flex items-center gap-3 text-[16px] font-bold text-white">
                            <span className="material-symbols-outlined text-[24px] text-emerald-400">terminal</span>
                            执行计划
                          </h3>
                          {surveyStep >= 2 && (
                            <span className={`rounded-full border px-3 py-1.5 text-[12px] font-mono font-bold ${isGenerating ? 'border-amber-500/30 bg-amber-500/20 text-amber-400' : 'border-emerald-500/30 bg-emerald-500/20 text-emerald-400'}`}>
                              {isGenerating ? 'RUNNING' : 'COMPLETED'}
                            </span>
                          )}
                        </div>

                        <div className="relative z-10 flex-1 space-y-8 overflow-y-auto pr-4 custom-scrollbar">
                          {surveyStep < 2 ? (
                            <div className="flex h-full flex-col items-center justify-center space-y-4 text-slate-500">
                              <span className="material-symbols-outlined text-5xl opacity-20">hourglass_empty</span>
                              <p className="text-[14px]">等待调研完成以生成执行计划...</p>
                            </div>
                          ) : (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                              <div className="flex gap-5">
                                <div className="relative mt-0.5">
                                  <span className="material-symbols-outlined relative z-10 bg-slate-900 text-[24px] text-emerald-500">check_circle</span>
                                  <div className="absolute left-1/2 top-6 h-10 w-px -translate-x-1/2 bg-emerald-500/30"></div>
                                </div>
                                <div>
                                  <div className="text-[15px] font-bold text-slate-200">解析业务需求</div>
                                  <div className="mt-2 text-[14px] leading-relaxed text-slate-400">
                                    {surveyPlan?.summary || `已提取核心诉求：模式为“${surveyAnswers[0]}”，数据来源为“${surveyAnswers[1]}”。`}
                                  </div>
                                  {surveyPlanModel && (
                                    <div className="mt-3 inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold text-emerald-300">
                                      模型：{surveyPlanModel}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }} className="flex gap-5">
                                <div className="relative mt-0.5">
                                  <span className={`material-symbols-outlined relative z-10 bg-slate-900 text-[24px] ${isGenerating ? 'animate-spin text-amber-500' : 'text-emerald-500'}`}>
                                    {isGenerating ? 'sync' : 'check_circle'}
                                  </span>
                                  <div className={`absolute left-1/2 top-6 h-32 w-px -translate-x-1/2 ${isGenerating ? 'bg-amber-500/30' : 'bg-emerald-500/30'}`}></div>
                                </div>
                                <div>
                                  <div className="text-[15px] font-bold text-slate-200">构建领域模型 (Domain Model)</div>
                                  <div className="mt-2 text-[14px] leading-relaxed text-slate-400">基于 MiniMax 返回结果生成主档、明细与关联建议。</div>
                                  <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/80 p-4 font-mono text-[13px] leading-relaxed text-emerald-400/80 shadow-inner">
                                    {(surveyPlan?.domainModel?.length ? surveyPlan.domainModel : [
                                      '建议补充主表、明细表和日志表。',
                                      '建议建立主从关系与基础状态字段。',
                                    ]).map((item, index) => (
                                      <div key={`domain-model-${index}`}>
                                        <span className="mr-2 text-slate-500">$</span>
                                        {item}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </motion.div>

                              {!isGenerating && !surveyError && (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-5">
                                  <div className="mt-0.5 relative">
                                    <span className="material-symbols-outlined relative z-10 bg-slate-900 text-[24px] text-emerald-500">check_circle</span>
                                  </div>
                                  <div className="w-full">
                                    <div className="text-[15px] font-bold text-slate-200">生成交互原型与架构评估</div>
                                    <div className="mt-2 text-[14px] leading-relaxed text-slate-400">已输出架构方案、复杂度和开发周期建议。</div>

                                    <div className="mt-4 space-y-3 rounded-xl border border-slate-800 bg-slate-950/80 p-5 font-mono text-[13px] leading-relaxed text-emerald-400/90 shadow-inner">
                                      <div className="mb-3 flex items-center gap-2 border-b border-slate-800 pb-2 text-white/90">
                                        <span className="material-symbols-outlined text-[18px] text-primary">analytics</span>
                                        <span className="font-bold text-[14px]">架构方案评估报告 (Architecture Assessment Report)</span>
                                      </div>
                                      <p><span className="text-slate-500"># 核心模式:</span> {surveyAnswers[0]}</p>
                                      <p><span className="text-slate-500"># 数据来源:</span> {surveyAnswers[1]}</p>
                                      <p><span className="text-slate-500"># 复杂度评估:</span> <span className="text-amber-400">{surveyPlan?.complexity || '中'}</span></p>
                                      <p><span className="text-slate-500"># 预计开发周期:</span> {surveyPlan?.duration || '2-3 周'}</p>
                                      <div className="border-t border-slate-800/50 pt-2">
                                        <p className="mb-1 text-slate-400">推荐技术栈与中间件:</p>
                                        <ul className="list-disc space-y-1 pl-5 text-emerald-500/80">
                                          {(surveyPlan?.architecture?.length ? surveyPlan.architecture : [
                                            '前端: React + Vite + TailwindCSS',
                                            '后端: Node.js 代理 MiniMax API',
                                            '存储: PostgreSQL 或 SQL Server',
                                            '缓存: Redis 或本地缓存层',
                                          ]).map((item, index) => (
                                            <li key={`architecture-${index}`}>{item}</li>
                                          ))}
                                        </ul>
                                      </div>
                                      <div className="border-t border-slate-800/50 pt-2">
                                        <p className="mb-1 text-slate-400">实施建议:</p>
                                        <ul className="list-disc space-y-1 pl-5 text-emerald-300">
                                          {(surveyPlan?.recommendations?.length ? surveyPlan.recommendations : [
                                            '先完成主档与明细结构定义。',
                                            '把 AI 结果作为配置建议，不直接覆盖业务规则。',
                                          ]).map((item, index) => (
                                            <li key={`recommendation-${index}`}>{item}</li>
                                          ))}
                                        </ul>
                                      </div>
                                      <div className="border-t border-slate-800/50 pt-2 text-emerald-300">
                                        <span className="mr-2 text-slate-500">$</span> MiniMax plan ready for follow-up configuration.
                                      </div>
                                    </div>
                                  </div>
                                </motion.div>
                              )}

                              {!isGenerating && surveyError && (
                                <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-[13px] leading-6 text-rose-200">
                                  <div className="font-bold">MiniMax 调用失败</div>
                                  <div className="mt-2 break-words text-rose-100/90">{surveyError}</div>
                                  <div className="mt-3 text-rose-100/70">请先在 `.env.local` 中放入一个新的可用 API Key，再重新开始调研。</div>
                                </div>
                              )}
                            </motion.div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  {(configStep === MODULE_PREVIEW_STEP) && (
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm p-10 flex-1 min-h-[500px] flex items-center justify-center">
                      <div className="text-center space-y-4">
                        <div className="size-20 bg-primary/5 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
                          <span className="material-symbols-outlined text-4xl">
                            preview
                          </span>
                        </div>
                        <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300">
                          {configSteps.find(s => s.id === configStep)?.title}内容区域
                        </h3>
                        <p className="text-slate-400 text-sm max-w-sm mx-auto leading-relaxed">
                          这里是高级配置面板的内容占位区域。您可以根据具体业务需求，在此处渲染表单、图表或预览界面。                        </p>
                      </div>
                    </div>
                  )}
                </motion.div>
              </div>

              {/* Bottom Action Bar */}
              <div
                className={`shrink-0 border-t border-slate-200 bg-white/92 backdrop-blur-xl dark:border-slate-700/70 dark:bg-slate-950/88 shadow-[0_-8px_24px_rgba(15,23,42,0.04)] ${
                  isConfigFullscreenActive ? 'px-6 lg:px-8' : 'px-6 lg:px-8'
                }`}
              >
                <div className="flex h-20 items-center justify-between gap-4">
                  <button
                    onClick={() => {
                      if (activeConfigMenu !== null && configStep === 2) {
                        return;
                      }
                      setConfigStep(Math.max(1, configStep - 1));
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-4 py-2 text-[12px] font-semibold transition-all ${
                      configStep === 1 || (activeConfigMenu !== null && configStep === 2)
                        ? 'cursor-not-allowed border-slate-200/80 bg-slate-100/70 text-slate-300 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-600'
                        : 'border-slate-200/80 bg-white/80 text-slate-600 shadow-[0_10px_30px_rgba(15,23,42,0.06)] hover:-translate-y-0.5 hover:border-primary/30 hover:text-primary dark:border-slate-700/80 dark:bg-slate-900/70 dark:text-slate-200'
                    }`}
                    disabled={configStep === 1 || (activeConfigMenu !== null && configStep === 2)}
                  >
                    <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                    上一步
                  </button>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={configStep === 2 && (isMenuInfoLoading || isMenuInfoSaving)}
                      onClick={() => {
                        void handleMenuInfoSave();
                      }}
                      className={`inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white px-4 py-2 text-[12px] font-semibold text-slate-600 shadow-[0_8px_18px_rgba(15,23,42,0.04)] transition-all dark:border-slate-700/80 dark:bg-slate-900/70 dark:text-slate-200 ${
                        configStep === 2 && (isMenuInfoLoading || isMenuInfoSaving)
                          ? 'cursor-not-allowed opacity-60'
                          : 'hover:-translate-y-0.5 hover:border-primary/30 hover:text-primary'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[20px]">save</span>
                      {configStep === 2 && isMenuInfoSaving ? (activeConfigMenu ? '保存中...' : '创建中...') : '保存本页'}
                    </button>

                    {(configStep === MODULE_SETTING_STEP || configStep === RESTRICTION_STEP) && (
                      <button
                        onClick={() => setIsFullscreenConfig((prev) => !prev)}
                        className={`inline-flex items-center gap-1.5 rounded-xl border px-4 py-2 text-[12px] font-semibold transition-all ${
                          isConfigFullscreenActive
                            ? 'border-primary/30 bg-primary/10 text-primary shadow-[0_16px_36px_rgba(49,98,255,0.18)]'
                            : 'border-slate-200/80 bg-white/80 text-slate-600 shadow-[0_12px_32px_rgba(15,23,42,0.06)] hover:-translate-y-0.5 hover:border-primary/30 hover:text-primary dark:border-slate-700/80 dark:bg-slate-900/70 dark:text-slate-200'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          {isConfigFullscreenActive ? 'fullscreen_exit' : 'fullscreen'}
                        </span>
                        {isConfigFullscreenActive ? '退出全屏' : '全屏配置'}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        if (configStep === 2 && activeConfigMenu === null) {
                          showToast('请先保存菜单信息，创建模块后再进入下一步。');
                          return;
                        }

                        const newCompleted = [...completedSteps];
                        if (!newCompleted.includes(configStep)) {
                          newCompleted.push(configStep);
                          setCompletedSteps(newCompleted);
                        }

                        const nextStep = configStep + 1;

                        if (configStep < MAX_CONFIG_STEP) {
                          setConfigStep(nextStep);
                        } else {
                          setIsConfigOpen(false);
                        }
                      }}
                      disabled={configStep === 2 && (isMenuInfoLoading || isMenuInfoSaving || activeConfigMenu === null)}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-5 py-2 text-[12px] font-semibold text-white shadow-[0_12px_24px_rgba(49,98,255,0.2)] transition-all ${
                        configStep === 2 && (isMenuInfoLoading || isMenuInfoSaving || activeConfigMenu === null)
                          ? 'cursor-not-allowed bg-primary/60'
                          : 'bg-primary hover:-translate-y-0.5 hover:bg-erp-blue'
                      }`}
                    >
                      {configStep === MODULE_PREVIEW_STEP ? '完成配置' : '下一步'}
                      {configStep !== MODULE_PREVIEW_STEP && <span className="material-symbols-outlined text-[20px]">arrow_forward</span>}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
