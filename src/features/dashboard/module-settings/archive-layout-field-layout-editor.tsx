import React from 'react';
import {
  closestCenter,
  DndContext,
  DragOverlay,
  PointerSensor,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type Modifier,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { rectSortingStrategy, SortableContext } from '@dnd-kit/sortable';
import { CalendarDays, ChevronDown, Search } from 'lucide-react';
import { createPortal } from 'react-dom';

import { cn } from '../../../lib/utils';
import type { DetailLayoutDocument, DetailLayoutFieldOption, DetailLayoutItem } from '../detail-layout-designer/types';
import { createEmptyDetailLayoutDocument } from '../detail-layout-designer/utils/layout';
import { DesignerWorkbenchDraggableItem, DesignerWorkbenchDropLane } from '../dashboard-workbench-dnd';
import type {
  ArchiveLayoutScheme,
  ArchiveLayoutSchemeFieldDefaults,
  ArchiveLayoutSchemeGroup,
} from './detail-board-layout-designer-adapter';
import {
  BILL_FORM_DEFAULT_WIDTH,
  BILL_FORM_MAX_WIDTH,
  BILL_FORM_MIN_CONTROL_HEIGHT,
  BILL_FORM_MIN_WIDTH,
  BILL_FORM_WORKBENCH_LAYOUT_GAP_X,
  BILL_FORM_WORKBENCH_LAYOUT_GAP_Y,
  BILL_FORM_WORKBENCH_LAYOUT_PADDING_X,
  BILL_FORM_WORKBENCH_LAYOUT_PADDING_Y,
  BILL_FORM_WORKBENCH_MIN_ROW_HEIGHT,
  alignBillHeaderFieldsToFlowLayout,
  getBillHeaderFieldHeight,
  getBillHeaderFieldShellHeight,
  getBillHeaderFieldWidth,
} from './dashboard-bill-form-layout-utils';

const SURFACE_CLASS = 'rounded-[22px] border border-[#dbe6f1] bg-[linear-gradient(180deg,#fbfdff_0%,#f4f8fc_100%)] shadow-[0_18px_42px_-40px_rgba(15,23,42,0.18)]';
const GROUP_HEADER_HEIGHT = 42;
const GROUP_GAP = 10;
const GROUP_MIN_HEIGHT = 176;
const GROUP_MIN_WIDTH = 880;
const GROUP_DEFAULT_ROWS = 1;
const PREVIEW_WIDTH_MIN = 720;
const PREVIEW_WIDTH_MAX = 1320;
const DEFAULT_GROUP_TITLE = '未分组字段';
type ArchiveLayoutFieldLayoutEditorProps = {
  buildSchemeDocument: (scheme: ArchiveLayoutScheme, previewWorkbenchWidth?: number) => DetailLayoutDocument;
  document: DetailLayoutDocument;
  fieldOptions: DetailLayoutFieldOption[];
  getDefaultSize: (field: Record<string, any>) => { h: number; w: number };
  normalizeColumn: (column: Record<string, any>) => Record<string, any>;
  onDocumentChange: (document: DetailLayoutDocument) => void;
  onSchemesChange: (schemes: ArchiveLayoutScheme[]) => void;
  renderFieldPreview: (column: Record<string, any>, index: number, scope: string) => React.ReactNode;
  schemes: ArchiveLayoutScheme[];
  suggestedScheme: ArchiveLayoutScheme;
};

type FlowDraft = DetailLayoutItem & {
  panelOrder: number;
  panelRow: number;
};

type ArchiveLayoutGroupViewModel = {
  fields: FlowDraft[];
  group: DetailLayoutItem;
};

type SelectedFieldContext = {
  field: FlowDraft;
  group: ArchiveLayoutGroupViewModel;
};

type FieldDropTarget = {
  beforeId: string | null;
  groupId: string;
  mode: 'standard' | 'row';
  rowNumber: number | null;
};

type FieldDragData = { fieldId: string; groupId: string; type: 'archive-field' };
type GroupDragData = { groupId: string; type: 'archive-group' };
type FieldInsertDropData = { beforeId: string | null; groupId: string; type: 'archive-field-insert' };
type FieldRowDropData = { beforeId: string | null; groupId: string; rowNumber: number; type: 'archive-field-row' };
type FieldSizeInputDraft = { fieldId: string | null; h: string; w: string };
type SchemeFieldSizeInputDraftMap = Record<string, { h: string; w: string }>;
type WidthPreset = 'compact' | 'standard' | 'full';
type HeightPreset = 'single' | 'comfortable' | 'expanded';
type FieldResizeState = {
  dimension: 'h' | 'w';
  fieldId: string;
  startHeight: number;
  startMouseX: number;
  startMouseY: number;
  startWidth: number;
};
type FieldResizePreview = {
  fieldId: string;
  h: number;
  w: number;
};
type SidebarTabKey = 'placed' | 'pending' | 'schemes';

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function cloneArchiveLayoutSchemeGroup(group: ArchiveLayoutSchemeGroup): ArchiveLayoutSchemeGroup {
  return {
    ...group,
    fieldIds: [...group.fieldIds],
  };
}

function cloneArchiveLayoutSchemeFieldDefaults(
  fieldDefaults?: Record<string, ArchiveLayoutSchemeFieldDefaults>,
): Record<string, ArchiveLayoutSchemeFieldDefaults> {
  if (!fieldDefaults) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(fieldDefaults).map(([fieldId, defaults]) => [fieldId, { ...defaults }]),
  );
}

function cloneArchiveLayoutScheme(scheme: ArchiveLayoutScheme): ArchiveLayoutScheme {
  return {
    ...scheme,
    fieldDefaults: cloneArchiveLayoutSchemeFieldDefaults(scheme.fieldDefaults),
    groups: scheme.groups.map(cloneArchiveLayoutSchemeGroup),
  };
}

function buildSchemeFieldSizeInputDrafts(
  scheme: ArchiveLayoutScheme,
): SchemeFieldSizeInputDraftMap {
  return Object.fromEntries(
    Object.entries(scheme.fieldDefaults ?? {}).map(([fieldId, defaults]) => [
      fieldId,
      {
        h: typeof defaults?.h === 'number' ? String(defaults.h) : '',
        w: typeof defaults?.w === 'number' ? String(defaults.w) : '',
      },
    ]),
  );
}

function createSchemeId(prefix = 'archive_layout_scheme') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function createSchemeGroupId(prefix = 'archive_layout_scheme_group') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function createEmptyScheme(name = '新方案'): ArchiveLayoutScheme {
  return {
    fieldDefaults: {},
    groups: [
      {
        fieldIds: [],
        id: createSchemeGroupId(),
        name: '信息分组 1',
      },
    ],
    id: createSchemeId(),
    name,
  };
}

function countSchemeFields(scheme: ArchiveLayoutScheme) {
  return scheme.groups.reduce((count, group) => count + group.fieldIds.length, 0);
}

function buildSchemeFromCurrentLayout(groups: ArchiveLayoutGroupViewModel[]): ArchiveLayoutScheme {
  const fieldDefaults = groups.reduce<Record<string, ArchiveLayoutSchemeFieldDefaults>>((result, group) => {
    group.fields.forEach((field) => {
      if (!field.field) {
        return;
      }
      result[String(field.field)] = {
        h: Number(field.h) || undefined,
        w: Number(field.w) || undefined,
      };
    });
    return result;
  }, {});

  const layoutGroups = groups.map((group, groupIndex) => ({
    fieldIds: group.fields
      .slice()
      .sort((left, right) => (left.panelRow - right.panelRow) || (left.panelOrder - right.panelOrder) || (left.y - right.y) || (left.x - right.x))
      .map((field) => String(field.field || ''))
      .filter(Boolean),
    id: createSchemeGroupId(`archive_layout_from_layout_group_${groupIndex + 1}`),
    name: String(group.group.title || `信息分组 ${groupIndex + 1}`).trim() || `信息分组 ${groupIndex + 1}`,
  })).filter((group) => group.fieldIds.length > 0);

  return {
    fieldDefaults,
    groups: layoutGroups.length > 0 ? layoutGroups : createEmptyScheme().groups,
    id: createSchemeId('archive_layout_from_layout'),
    name: '当前布局方案',
  };
}

function normalizePreviewWorkbenchWidth(value: number) {
  return clampNumber(Math.round(value / 20) * 20, PREVIEW_WIDTH_MIN, PREVIEW_WIDTH_MAX);
}

function getPreviewWorkbenchWidthFromDocument(document: DetailLayoutDocument) {
  const firstGroup = buildGroupOrder(document)[0];
  if (!firstGroup?.w) {
    return GROUP_MIN_WIDTH;
  }
  return normalizePreviewWorkbenchWidth(firstGroup.w);
}

function getGroupFlowUsableWidth(groupWidth: number) {
  return Math.max(BILL_FORM_MIN_WIDTH, groupWidth - BILL_FORM_WORKBENCH_LAYOUT_PADDING_X * 2);
}

function parseArchiveFieldDragId(id: unknown) {
  if (typeof id !== 'string') {
    return null;
  }
  return id.startsWith('archive-field:') ? id.slice('archive-field:'.length) : null;
}

function getClientPointFromActivatorEvent(event: Event | undefined) {
  if (!event) {
    return null;
  }
  if ('clientX' in event && 'clientY' in event) {
    return {
      x: Number(event.clientX),
      y: Number(event.clientY),
    };
  }
  if (typeof TouchEvent !== 'undefined' && event instanceof TouchEvent && event.touches.length > 0) {
    return {
      x: Number(event.touches[0]?.clientX ?? 0),
      y: Number(event.touches[0]?.clientY ?? 0),
    };
  }
  return null;
}

function parseCommittedNumber(rawValue: string, fallback: number, min: number, max: number) {
  const normalizedValue = rawValue.trim();
  if (!normalizedValue) {
    return fallback;
  }
  const parsedValue = Number(normalizedValue);
  if (!Number.isFinite(parsedValue)) {
    return fallback;
  }
  return clampNumber(parsedValue, min, max);
}

function sortItems(items: DetailLayoutItem[]) {
  return items.slice().sort((left, right) => (left.y - right.y) || (left.x - right.x));
}

function getFieldOptionMap(fieldOptions: DetailLayoutFieldOption[]) {
  return new Map(fieldOptions.map((item) => [String(item.value), item]));
}

function buildGroupOrder(document: DetailLayoutDocument) {
  return sortItems(document.items.filter((item) => item.type === 'groupbox'));
}

function buildDrafts(items: DetailLayoutItem[]) {
  const sorted = sortItems(items.filter((item) => item.type !== 'groupbox' && item.field));
  const rowAnchors = Array.from(new Set(sorted.map((item) => item.y))).sort((left, right) => left - right);
  const orderByRow = new Map<number, number>();
  return sorted.map((item) => {
    const row = Math.max(1, rowAnchors.indexOf(item.y) + 1);
    const nextOrder = (orderByRow.get(row) ?? 0) + 1;
    orderByRow.set(row, nextOrder);
    return { ...item, panelOrder: nextOrder, panelRow: row };
  });
}

function sortDraftsForFlow<T extends FlowDraft>(drafts: T[]) {
  return drafts
    .slice()
    .sort((left, right) => (left.panelRow - right.panelRow) || (left.panelOrder - right.panelOrder) || (left.y - right.y) || (left.x - right.x));
}

function normalizeDrafts<T extends FlowDraft>(drafts: T[]): T[] {
  return reindexDrafts(sortDraftsForFlow(drafts));
}

function reindexDrafts<T extends FlowDraft>(drafts: T[]): T[] {
  const normalizedDrafts = drafts.map((item) => ({
    ...item,
    panelRow: Math.max(1, Math.round(Number(item.panelRow) || 1)),
  }));
  const rowNumbers = Array.from(new Set(normalizedDrafts.map((item) => item.panelRow))).sort((left, right) => left - right);
  const rowMap = new Map(rowNumbers.map((rowNumber, index) => [rowNumber, index + 1]));
  const orderByRow = new Map<number, number>();

  return normalizedDrafts.map((item) => {
    const nextRow = rowMap.get(item.panelRow) ?? 1;
    const nextOrder = (orderByRow.get(nextRow) ?? 0) + 1;
    orderByRow.set(nextRow, nextOrder);
    return {
      ...item,
      panelOrder: nextOrder,
      panelRow: nextRow,
    };
  });
}

function getDisplayTitle(item: DetailLayoutItem, fieldOption?: DetailLayoutFieldOption, rawField?: Record<string, any>) {
  return String(item.title || fieldOption?.title || rawField?.name || fieldOption?.label || item.field || '字段').trim();
}

function getFieldWidthPresetValue(preset: WidthPreset, usableWidth: number) {
  if (preset === 'compact') {
    return clampNumber(Math.round((usableWidth - BILL_FORM_WORKBENCH_LAYOUT_GAP_X) / 2), BILL_FORM_MIN_WIDTH, BILL_FORM_MAX_WIDTH);
  }
  if (preset === 'full') {
    return clampNumber(usableWidth, BILL_FORM_MIN_WIDTH, BILL_FORM_MAX_WIDTH);
  }
  return clampNumber(BILL_FORM_DEFAULT_WIDTH, BILL_FORM_MIN_WIDTH, BILL_FORM_MAX_WIDTH);
}

function stabilizeDocument(
  document: DetailLayoutDocument,
  fieldOptions: DetailLayoutFieldOption[],
  getDefaultSize: (field: Record<string, any>) => { h: number; w: number },
  draftOverrides?: Map<string, FlowDraft[]>,
  preferredGroupOrder?: string[],
  previewWorkbenchWidth: number = GROUP_MIN_WIDTH,
) {
  const normalizedPreviewWidth = normalizePreviewWorkbenchWidth(previewWorkbenchWidth);
  const groupFlowUsableWidth = getGroupFlowUsableWidth(normalizedPreviewWidth);
  const optionMap = getFieldOptionMap(fieldOptions);
  const sourceGroups = buildGroupOrder(document);
  const sourceFields = document.items.filter((item) => item.type !== 'groupbox' && item.field);
  if (sourceGroups.length === 0 && sourceFields.length === 0) {
    return createEmptyDetailLayoutDocument({
      gridSize: document.gridSize,
      items: [],
    });
  }
  const fallbackGroup: DetailLayoutItem = {
    h: GROUP_MIN_HEIGHT,
    id: 'archive_layout_group_default',
    type: 'groupbox',
    w: normalizedPreviewWidth,
    x: 24,
    y: 24,
    title: DEFAULT_GROUP_TITLE,
  };
  (fallbackGroup as DetailLayoutItem & { rows?: number }).rows = GROUP_DEFAULT_ROWS;
  const groups = sourceGroups.length > 0 ? sourceGroups : [fallbackGroup];
  const groupIds = preferredGroupOrder?.filter((id) => groups.some((group) => group.id === id)) ?? groups.map((group) => group.id);
  const groupOrder = groupIds.map((id) => groups.find((group) => group.id === id)).filter(Boolean) as DetailLayoutItem[];
  const childrenByParent = new Map<string | null, DetailLayoutItem[]>();

  sourceFields.forEach((item) => {
    const parentId = item.parentId ?? null;
    const siblings = childrenByParent.get(parentId) ?? [];
    siblings.push(item);
    childrenByParent.set(parentId, siblings);
  });

  if ((childrenByParent.get(null) ?? []).length > 0) {
    const firstGroup = groupOrder[0] ?? fallbackGroup;
    childrenByParent.set(firstGroup.id, [...(childrenByParent.get(firstGroup.id) ?? []), ...(childrenByParent.get(null) ?? [])]);
    childrenByParent.delete(null);
  }

  let nextGroupY = 24;
  const nextItems: DetailLayoutItem[] = [];

  groupOrder.forEach((group, groupIndex) => {
    const rawDrafts = draftOverrides?.get(group.id) ?? buildDrafts(childrenByParent.get(group.id) ?? []);
    const preparedDrafts = normalizeDrafts(rawDrafts).map((item) => {
      const fieldOption = optionMap.get(String(item.field ?? ''));
      const defaultSize = fieldOption ? getDefaultSize(fieldOption.rawField as Record<string, any>) : { h: BILL_FORM_MIN_CONTROL_HEIGHT, w: BILL_FORM_DEFAULT_WIDTH };
      return {
        ...item,
        resolvedHeight: clampNumber(item.h || defaultSize.h, BILL_FORM_MIN_CONTROL_HEIGHT, 160),
        resolvedWidth: clampNumber(item.w || defaultSize.w, BILL_FORM_MIN_WIDTH, Math.min(BILL_FORM_MAX_WIDTH, groupFlowUsableWidth)),
      };
    });
    const drafts = reindexDrafts(preparedDrafts);
    const aligned = alignBillHeaderFieldsToFlowLayout(
      drafts.map((item) => {
        const fieldOption = optionMap.get(String(item.field ?? ''));
        const rawField = (fieldOption?.rawField ?? {}) as Record<string, any>;
        return {
          controlHeight: item.resolvedHeight,
          id: item.id,
          name: getDisplayTitle(item, fieldOption, rawField),
          panelOrder: item.panelOrder,
          panelRow: item.panelRow,
          width: item.resolvedWidth,
        };
      }),
      {
        defaultHeight: BILL_FORM_MIN_CONTROL_HEIGHT,
        defaultWidth: BILL_FORM_DEFAULT_WIDTH,
        gapX: BILL_FORM_WORKBENCH_LAYOUT_GAP_X,
        gapY: BILL_FORM_WORKBENCH_LAYOUT_GAP_Y,
        layoutPaddingX: BILL_FORM_WORKBENCH_LAYOUT_PADDING_X,
        layoutPaddingY: BILL_FORM_WORKBENCH_LAYOUT_PADDING_Y,
        maxWidth: BILL_FORM_MAX_WIDTH,
        minRowHeight: BILL_FORM_WORKBENCH_MIN_ROW_HEIGHT,
        minWidth: BILL_FORM_MIN_WIDTH,
      },
    ) as Array<{ canvasX?: number; canvasY?: number; controlHeight?: number; id: string; width?: number }>;

    const alignedMap = new Map(aligned.map((item) => [item.id, item]));
    const childItems = drafts.map((item) => {
      const alignedItem = alignedMap.get(item.id);
      return {
        ...item,
        h: alignedItem ? getBillHeaderFieldHeight(alignedItem) : item.h,
        parentId: group.id,
        w: alignedItem ? getBillHeaderFieldWidth(alignedItem) : item.w,
        x: alignedItem?.canvasX ?? BILL_FORM_WORKBENCH_LAYOUT_PADDING_X,
        y: alignedItem?.canvasY ?? BILL_FORM_WORKBENCH_LAYOUT_PADDING_Y,
      };
    });

    const bodyHeight = childItems.reduce((max, item) => {
      const shellHeight = getBillHeaderFieldShellHeight({ controlHeight: item.h, width: item.w });
      return Math.max(max, item.y + shellHeight);
    }, BILL_FORM_WORKBENCH_LAYOUT_PADDING_Y + BILL_FORM_WORKBENCH_MIN_ROW_HEIGHT);
    const actualRowCount = Math.max(1, drafts.reduce((max, item) => Math.max(max, item.panelRow), 1));
    const desiredRowCount = Math.max(actualRowCount, Number((group as DetailLayoutItem & { rows?: number }).rows) || 0);
    const desiredBodyHeight = BILL_FORM_WORKBENCH_LAYOUT_PADDING_Y
      + desiredRowCount * BILL_FORM_WORKBENCH_MIN_ROW_HEIGHT
      + Math.max(0, desiredRowCount - 1) * BILL_FORM_WORKBENCH_LAYOUT_GAP_Y;
    const groupHeight = Math.max(GROUP_MIN_HEIGHT, Math.max(bodyHeight, desiredBodyHeight) + GROUP_HEADER_HEIGHT + 20);

    const nextGroup = {
      ...group,
      h: groupHeight,
      title: typeof group.title === 'string' ? group.title : `信息分组 ${groupIndex + 1}`,
      w: normalizedPreviewWidth,
      x: 24,
      y: nextGroupY,
    };
    (nextGroup as DetailLayoutItem & { rows?: number }).rows = desiredRowCount;

    nextItems.push(nextGroup);
    nextItems.push(...childItems);
    nextGroupY += groupHeight + GROUP_GAP;
  });

  return createEmptyDetailLayoutDocument({
    gridSize: document.gridSize,
    items: nextItems,
  });
}

function buildGroupViewModels(document: DetailLayoutDocument): ArchiveLayoutGroupViewModel[] {
  const childrenByParent = new Map<string, FlowDraft[]>();
  document.items.filter((item) => item.type !== 'groupbox' && item.field).forEach((item) => {
    const parentId = String(item.parentId || '');
    const siblings = childrenByParent.get(parentId) ?? [];
    siblings.push({ ...item, panelOrder: 1, panelRow: 1 });
    childrenByParent.set(parentId, siblings);
  });

  return sortItems(document.items.filter((item) => item.type === 'groupbox')).map((group) => {
    return {
      fields: buildDrafts(childrenByParent.get(group.id) ?? []),
      group,
    };
  });
}

function findSelectedFieldContext(groups: ArchiveLayoutGroupViewModel[], selectedFieldId: string | null) {
  if (!selectedFieldId) {
    return null;
  }

  for (const group of groups) {
    const field = group.fields.find((item) => item.id === selectedFieldId);
    if (field) {
      return {
        field,
        group,
      } satisfies SelectedFieldContext;
    }
  }

  return null;
}

export const ArchiveLayoutFieldLayoutEditor = React.memo(function ArchiveLayoutFieldLayoutEditor({
  buildSchemeDocument,
  document,
  fieldOptions,
  getDefaultSize,
  normalizeColumn,
  onDocumentChange,
  onSchemesChange,
  schemes,
  suggestedScheme,
}: ArchiveLayoutFieldLayoutEditorProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const documentPreviewWorkbenchWidth = React.useMemo(
    () => getPreviewWorkbenchWidthFromDocument(document),
    [document],
  );
  const [previewWorkbenchWidth, setPreviewWorkbenchWidth] = React.useState(documentPreviewWorkbenchWidth);
  const [previewWorkbenchWidthInput, setPreviewWorkbenchWidthInput] = React.useState(String(documentPreviewWorkbenchWidth));
  const stabilizedDocument = React.useMemo(
    () => stabilizeDocument(document, fieldOptions, getDefaultSize, undefined, undefined, previewWorkbenchWidth),
    [document, fieldOptions, getDefaultSize, previewWorkbenchWidth],
  );
  const optionMap = React.useMemo(() => getFieldOptionMap(fieldOptions), [fieldOptions]);
  const groups = React.useMemo(() => buildGroupViewModels(stabilizedDocument), [stabilizedDocument]);
  const usablePreviewWorkbenchWidth = React.useMemo(
    () => getGroupFlowUsableWidth(previewWorkbenchWidth),
    [previewWorkbenchWidth],
  );
  const [keyword, setKeyword] = React.useState('');
  const [selectedGroupId, setSelectedGroupId] = React.useState<string | null>(groups[0]?.group.id ?? null);
  const [selectedFieldId, setSelectedFieldId] = React.useState<string | null>(null);
  const [openFieldEditorId, setOpenFieldEditorId] = React.useState<string | null>(null);
  const [dragFieldId, setDragFieldId] = React.useState<string | null>(null);
  const [dropTarget, setDropTarget] = React.useState<FieldDropTarget | null>(null);
  const [dragOverlayOffset, setDragOverlayOffset] = React.useState<{ x: number; y: number } | null>(null);
  const [density, setDensity] = React.useState<'comfortable' | 'compact'>('comfortable');
  const [fieldResizeState, setFieldResizeState] = React.useState<FieldResizeState | null>(null);
  const [fieldResizePreview, setFieldResizePreview] = React.useState<FieldResizePreview | null>(null);
  const [quickEditorSizeInput, setQuickEditorSizeInput] = React.useState<FieldSizeInputDraft>({ fieldId: null, h: '', w: '' });
  const [sidebarTab, setSidebarTab] = React.useState<SidebarTabKey>('pending');
  const [isSchemeModalOpen, setIsSchemeModalOpen] = React.useState(false);
  const [schemeSourceId, setSchemeSourceId] = React.useState<string | null>(schemes[0]?.id ?? null);
  const [isEditingUnsavedScheme, setIsEditingUnsavedScheme] = React.useState(false);
  const [schemeDraft, setSchemeDraft] = React.useState<ArchiveLayoutScheme>(() => (
    schemes[0] ? cloneArchiveLayoutScheme(schemes[0]) : cloneArchiveLayoutScheme(suggestedScheme)
  ));
  const [selectedSchemeGroupId, setSelectedSchemeGroupId] = React.useState<string | null>(
    (schemes[0]?.groups[0] ?? suggestedScheme.groups[0])?.id ?? null,
  );
  const [schemeFieldKeyword, setSchemeFieldKeyword] = React.useState('');
  const [schemeFieldSizeInputs, setSchemeFieldSizeInputs] = React.useState<SchemeFieldSizeInputDraftMap>(() => (
    buildSchemeFieldSizeInputDrafts(schemes[0] ? cloneArchiveLayoutScheme(schemes[0]) : cloneArchiveLayoutScheme(suggestedScheme))
  ));
  const outsideCloseBlockedUntilRef = React.useRef(0);
  const fieldResizePreviewRef = React.useRef<FieldResizePreview | null>(null);
  const fieldResizeFrameRef = React.useRef<number | null>(null);
  const schemeAutoOpenedRef = React.useRef(false);
  const dragOverlayModifiers = React.useMemo<Modifier[]>(() => {
    if (!dragOverlayOffset) {
      return [];
    }

    return [
      ({ transform }) => ({
        ...transform,
        x: transform.x - dragOverlayOffset.x + 18,
        y: transform.y - dragOverlayOffset.y + 12,
      }),
    ];
  }, [dragOverlayOffset]);

  React.useEffect(() => {
    setPreviewWorkbenchWidth(documentPreviewWorkbenchWidth);
    setPreviewWorkbenchWidthInput(String(documentPreviewWorkbenchWidth));
  }, [documentPreviewWorkbenchWidth]);

  React.useEffect(() => {
    if (!selectedGroupId || !groups.some((group) => group.group.id === selectedGroupId)) {
      setSelectedGroupId(groups[0]?.group.id ?? null);
    }
  }, [groups, selectedGroupId]);

  React.useEffect(() => {
    if (!selectedFieldId || stabilizedDocument.items.some((item) => item.id === selectedFieldId)) {
      return;
    }
    setSelectedFieldId(null);
  }, [selectedFieldId, stabilizedDocument.items]);

  React.useEffect(() => {
    if (isEditingUnsavedScheme) {
      return;
    }
    const activeScheme = schemes.find((scheme) => scheme.id === schemeSourceId) ?? null;
    if (activeScheme) {
      setSchemeDraft(cloneArchiveLayoutScheme(activeScheme));
      setSelectedSchemeGroupId(activeScheme.groups[0]?.id ?? null);
      return;
    }
    if (schemes.length > 0) {
      setSchemeSourceId(schemes[0].id);
      setSchemeDraft(cloneArchiveLayoutScheme(schemes[0]));
      setSelectedSchemeGroupId(schemes[0].groups[0]?.id ?? null);
      return;
    }
    setSchemeSourceId(null);
    setSchemeDraft(cloneArchiveLayoutScheme(suggestedScheme));
    setSelectedSchemeGroupId(suggestedScheme.groups[0]?.id ?? null);
  }, [isEditingUnsavedScheme, schemeSourceId, schemes, suggestedScheme]);

  React.useEffect(() => {
    if (!selectedSchemeGroupId || !schemeDraft.groups.some((group) => group.id === selectedSchemeGroupId)) {
      setSelectedSchemeGroupId(schemeDraft.groups[0]?.id ?? null);
    }
  }, [schemeDraft.groups, selectedSchemeGroupId]);

  const schemeFieldSizeDraftSeedKeyRef = React.useRef('');

  React.useEffect(() => {
    const nextSeedKey = `${isSchemeModalOpen ? 'open' : 'closed'}:${isEditingUnsavedScheme ? 'draft' : 'saved'}:${schemeSourceId ?? 'none'}:${schemeDraft.id}`;
    if (schemeFieldSizeDraftSeedKeyRef.current === nextSeedKey) {
      return;
    }
    schemeFieldSizeDraftSeedKeyRef.current = nextSeedKey;
    setSchemeFieldSizeInputs(buildSchemeFieldSizeInputDrafts(schemeDraft));
  }, [isEditingUnsavedScheme, isSchemeModalOpen, schemeDraft, schemeSourceId]);

  const placedFieldIds = React.useMemo(
    () => new Set(stabilizedDocument.items.filter((item) => item.type !== 'groupbox' && item.field).map((item) => String(item.field))),
    [stabilizedDocument.items],
  );
  const hasSourcePlacedFields = React.useMemo(
    () => document.items.some((item) => item.type !== 'groupbox' && item.field),
    [document.items],
  );
  const normalizedKeyword = keyword.trim().toLowerCase();
  const filteredOptions = React.useMemo(() => fieldOptions.filter((option) => {
    const text = `${option.title || ''} ${option.label || ''} ${option.description || ''}`.toLowerCase();
    return !normalizedKeyword || text.includes(normalizedKeyword);
  }), [fieldOptions, normalizedKeyword]);
  const placedOptions = React.useMemo(
    () => filteredOptions.filter((option) => placedFieldIds.has(String(option.value))),
    [filteredOptions, placedFieldIds],
  );
  const pendingOptions = React.useMemo(
    () => filteredOptions.filter((option) => !placedFieldIds.has(String(option.value))),
    [filteredOptions, placedFieldIds],
  );
  const hasPlacedFields = placedFieldIds.size > 0;
  const shouldAutoOpenSchemeModal = !hasPlacedFields && !hasSourcePlacedFields;
  const showFieldStats = false;
  const filteredSchemeFieldOptions = React.useMemo(() => {
    const normalizedSchemeKeyword = schemeFieldKeyword.trim().toLowerCase();
    return fieldOptions.filter((option) => {
      const text = `${option.title || ''} ${option.label || ''} ${option.description || ''}`.toLowerCase();
      return !normalizedSchemeKeyword || text.includes(normalizedSchemeKeyword);
    });
  }, [fieldOptions, schemeFieldKeyword]);
  const selectedSchemeGroup = React.useMemo(
    () => schemeDraft.groups.find((group) => group.id === selectedSchemeGroupId) ?? schemeDraft.groups[0] ?? null,
    [schemeDraft.groups, selectedSchemeGroupId],
  );
  const schemeFieldAssignments = React.useMemo(() => {
    const nextMap = new Map<string, string>();
    schemeDraft.groups.forEach((group) => {
      group.fieldIds.forEach((fieldId) => nextMap.set(fieldId, group.id));
    });
    return nextMap;
  }, [schemeDraft.groups]);

  const openSchemeModal = React.useCallback((schemeId?: string | null, draft?: ArchiveLayoutScheme | null) => {
    if (draft) {
      setIsEditingUnsavedScheme(true);
      setSchemeSourceId(null);
      setSchemeDraft(cloneArchiveLayoutScheme(draft));
      setSelectedSchemeGroupId(draft.groups[0]?.id ?? null);
    } else if (schemeId) {
      const targetScheme = schemes.find((scheme) => scheme.id === schemeId);
      if (targetScheme) {
        setIsEditingUnsavedScheme(false);
        setSchemeSourceId(targetScheme.id);
        setSchemeDraft(cloneArchiveLayoutScheme(targetScheme));
        setSelectedSchemeGroupId(targetScheme.groups[0]?.id ?? null);
      }
    } else if (schemes.length > 0) {
      const fallbackScheme = schemes.find((scheme) => scheme.id === schemeSourceId) ?? schemes[0];
      setIsEditingUnsavedScheme(false);
      setSchemeSourceId(fallbackScheme.id);
      setSchemeDraft(cloneArchiveLayoutScheme(fallbackScheme));
      setSelectedSchemeGroupId(fallbackScheme.groups[0]?.id ?? null);
    } else {
      setIsEditingUnsavedScheme(true);
      setSchemeSourceId(null);
      setSchemeDraft(cloneArchiveLayoutScheme(suggestedScheme));
      setSelectedSchemeGroupId(suggestedScheme.groups[0]?.id ?? null);
    }

    setSchemeFieldKeyword('');
    setIsSchemeModalOpen(true);
  }, [schemeSourceId, schemes, suggestedScheme]);

  React.useEffect(() => {
    if (!shouldAutoOpenSchemeModal) {
      schemeAutoOpenedRef.current = false;
      return;
    }
    if (isSchemeModalOpen || schemeAutoOpenedRef.current || fieldOptions.length === 0) {
      return;
    }
    const autoOpenTimer = globalThis.setTimeout(() => {
      if (schemeAutoOpenedRef.current) {
        return;
      }
      schemeAutoOpenedRef.current = true;
      setSidebarTab('schemes');
      openSchemeModal();
    }, 180);
    return () => globalThis.clearTimeout(autoOpenTimer);
  }, [fieldOptions.length, isSchemeModalOpen, openSchemeModal, shouldAutoOpenSchemeModal]);

  const commitDocument = React.useCallback((nextDocument: DetailLayoutDocument) => {
    onDocumentChange(stabilizeDocument(nextDocument, fieldOptions, getDefaultSize, undefined, undefined, previewWorkbenchWidth));
  }, [fieldOptions, getDefaultSize, onDocumentChange, previewWorkbenchWidth]);

  const applySchemeDraft = React.useCallback((forceConfirm = hasPlacedFields) => {
    if (forceConfirm && !window.confirm('应用方案会按方案内容重建当前布局，是否继续？')) {
      return false;
    }
    commitDocument(buildSchemeDocument(schemeDraft, previewWorkbenchWidth));
    setIsSchemeModalOpen(false);
    setSidebarTab('placed');
    return true;
  }, [buildSchemeDocument, commitDocument, hasPlacedFields, previewWorkbenchWidth, schemeDraft]);

  const saveSchemeDraft = React.useCallback(() => {
    const trimmedName = schemeDraft.name.trim() || `方案 ${schemes.length + 1}`;
    const validFieldIds = new Set(
      schemeDraft.groups.flatMap((group) => group.fieldIds.map(String)),
    );
    const draftFieldDefaults = (schemeDraft.fieldDefaults ?? {}) as Record<string, ArchiveLayoutSchemeFieldDefaults>;
    const normalizedDraft: ArchiveLayoutScheme = {
      ...schemeDraft,
      fieldDefaults: Object.entries(draftFieldDefaults).reduce<Record<string, ArchiveLayoutSchemeFieldDefaults>>((result, [fieldId, defaults]) => {
        if (!validFieldIds.has(fieldId) || !defaults || (typeof defaults.w !== 'number' && typeof defaults.h !== 'number')) {
          return result;
        }
        result[fieldId] = { ...defaults };
        return result;
      }, {}),
      name: trimmedName,
      groups: schemeDraft.groups.map((group, index) => ({
        ...group,
        fieldIds: Array.from(new Set(group.fieldIds)),
        name: group.name.trim() || `信息分组 ${index + 1}`,
      })),
    };

    if (schemeSourceId) {
      const nextSchemes = schemes.map((scheme) => (
        scheme.id === schemeSourceId ? normalizedDraft : scheme
      ));
      onSchemesChange(nextSchemes);
      setIsEditingUnsavedScheme(false);
      setSchemeDraft(cloneArchiveLayoutScheme(normalizedDraft));
      return normalizedDraft;
    }

    const nextScheme = {
      ...normalizedDraft,
      id: normalizedDraft.id || createSchemeId(),
    };
    onSchemesChange([...schemes, nextScheme]);
    setIsEditingUnsavedScheme(false);
    setSchemeSourceId(nextScheme.id);
    setSchemeDraft(cloneArchiveLayoutScheme(nextScheme));
    return nextScheme;
  }, [onSchemesChange, schemeDraft, schemeSourceId, schemes]);

  const saveSchemeDraftAsCopy = React.useCallback(() => {
    const baseName = schemeDraft.name.trim() || '新方案';
    const nextScheme: ArchiveLayoutScheme = {
      ...cloneArchiveLayoutScheme(schemeDraft),
      id: createSchemeId(),
      name: baseName.endsWith('副本') ? baseName : `${baseName} 副本`,
      groups: schemeDraft.groups.map((group, index) => ({
        ...cloneArchiveLayoutSchemeGroup(group),
        id: createSchemeGroupId(`archive_layout_scheme_copy_group_${index + 1}`),
      })),
    };
    onSchemesChange([...schemes, nextScheme]);
    setIsEditingUnsavedScheme(false);
    setSchemeSourceId(nextScheme.id);
    setSchemeDraft(cloneArchiveLayoutScheme(nextScheme));
    setSelectedSchemeGroupId(nextScheme.groups[0]?.id ?? null);
    return nextScheme;
  }, [onSchemesChange, schemeDraft, schemes]);

  const createNewSchemeDraft = React.useCallback(() => {
    const nextScheme = createEmptyScheme(`方案 ${schemes.length + 1}`);
    setIsEditingUnsavedScheme(true);
    setSchemeSourceId(null);
    setSchemeDraft(nextScheme);
    setSelectedSchemeGroupId(nextScheme.groups[0]?.id ?? null);
    setSchemeFieldKeyword('');
    setIsSchemeModalOpen(true);
  }, [schemes.length]);

  const createSchemeFromCurrentLayout = React.useCallback(() => {
    const nextScheme = buildSchemeFromCurrentLayout(groups);
    setIsEditingUnsavedScheme(true);
    setSchemeSourceId(null);
    setSchemeDraft(nextScheme);
    setSelectedSchemeGroupId(nextScheme.groups[0]?.id ?? null);
    setSchemeFieldKeyword('');
    setSidebarTab('schemes');
    setIsSchemeModalOpen(true);
  }, [groups]);

  const deleteActiveScheme = React.useCallback(() => {
    if (!schemeSourceId) {
      const nextDraft = createEmptyScheme(`方案 ${schemes.length + 1}`);
      setIsEditingUnsavedScheme(true);
      setSchemeDraft(nextDraft);
      setSelectedSchemeGroupId(nextDraft.groups[0]?.id ?? null);
      return;
    }
    const nextSchemes = schemes.filter((scheme) => scheme.id !== schemeSourceId);
    onSchemesChange(nextSchemes);
    if (nextSchemes.length > 0) {
      setIsEditingUnsavedScheme(false);
      setSchemeSourceId(nextSchemes[0].id);
      setSchemeDraft(cloneArchiveLayoutScheme(nextSchemes[0]));
      setSelectedSchemeGroupId(nextSchemes[0].groups[0]?.id ?? null);
      return;
    }
    const nextDraft = createEmptyScheme('新方案');
    setIsEditingUnsavedScheme(true);
    setSchemeSourceId(null);
    setSchemeDraft(nextDraft);
    setSelectedSchemeGroupId(nextDraft.groups[0]?.id ?? null);
  }, [onSchemesChange, schemeSourceId, schemes]);

  const duplicateScheme = React.useCallback((scheme: ArchiveLayoutScheme) => {
    const duplicatedScheme: ArchiveLayoutScheme = {
      ...cloneArchiveLayoutScheme(scheme),
      id: createSchemeId(),
      name: scheme.name.endsWith('副本') ? scheme.name : `${scheme.name} 副本`,
      groups: scheme.groups.map((group, index) => ({
        ...cloneArchiveLayoutSchemeGroup(group),
        id: createSchemeGroupId(`archive_layout_scheme_duplicate_group_${index + 1}`),
      })),
    };
    onSchemesChange([...schemes, duplicatedScheme]);
    setIsEditingUnsavedScheme(false);
    setSchemeSourceId(duplicatedScheme.id);
    setSchemeDraft(cloneArchiveLayoutScheme(duplicatedScheme));
    setSelectedSchemeGroupId(duplicatedScheme.groups[0]?.id ?? null);
    setSidebarTab('schemes');
    return duplicatedScheme;
  }, [onSchemesChange, schemes]);

  const applySpecificScheme = React.useCallback((scheme: ArchiveLayoutScheme, forceConfirm = hasPlacedFields) => {
    if (forceConfirm && !window.confirm('应用方案会按方案内容重建当前布局，是否继续？')) {
      return false;
    }
    commitDocument(buildSchemeDocument(scheme, previewWorkbenchWidth));
    setSidebarTab('placed');
    setIsSchemeModalOpen(false);
    return true;
  }, [buildSchemeDocument, commitDocument, hasPlacedFields, previewWorkbenchWidth]);

  const updateSchemeDraft = React.useCallback((updater: (scheme: ArchiveLayoutScheme) => ArchiveLayoutScheme) => {
    setSchemeDraft((current) => {
      const nextScheme = updater(current);
      return {
        ...nextScheme,
        fieldDefaults: nextScheme.fieldDefaults ?? {},
        groups: nextScheme.groups.length > 0 ? nextScheme.groups : [
          {
            fieldIds: [],
            id: createSchemeGroupId(),
            name: '信息分组 1',
          },
        ],
      };
    });
  }, []);

  const updateSchemeFieldDefault = React.useCallback((
    fieldId: string,
    dimension: 'w' | 'h',
    value: number | undefined,
  ) => {
    updateSchemeDraft((current) => {
      const currentDefaults = current.fieldDefaults ?? {};
      const nextDefaults = { ...(currentDefaults[fieldId] ?? {}) };
      if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
        nextDefaults[dimension] = value;
      } else {
        delete nextDefaults[dimension];
      }

      const mergedDefaults = { ...currentDefaults };
      if (typeof nextDefaults.w === 'number' || typeof nextDefaults.h === 'number') {
        mergedDefaults[fieldId] = nextDefaults;
      } else {
        delete mergedDefaults[fieldId];
      }

      return {
        ...current,
        fieldDefaults: mergedDefaults,
      };
    });
  }, [updateSchemeDraft]);

  const addSchemeGroup = React.useCallback(() => {
    const nextGroup: ArchiveLayoutSchemeGroup = {
      fieldIds: [],
      id: createSchemeGroupId(),
      name: `信息分组 ${schemeDraft.groups.length + 1}`,
    };
    updateSchemeDraft((current) => ({
      ...current,
      groups: [...current.groups, nextGroup],
    }));
    setSelectedSchemeGroupId(nextGroup.id);
  }, [schemeDraft.groups.length, updateSchemeDraft]);

  const renameSchemeGroup = React.useCallback((groupId: string, name: string) => {
    updateSchemeDraft((current) => ({
      ...current,
      groups: current.groups.map((group) => (
        group.id === groupId ? { ...group, name } : group
      )),
    }));
  }, [updateSchemeDraft]);

  const removeSchemeGroup = React.useCallback((groupId: string) => {
    updateSchemeDraft((current) => ({
      ...current,
      groups: current.groups.filter((group) => group.id !== groupId),
    }));
    if (selectedSchemeGroupId === groupId) {
      const fallbackGroup = schemeDraft.groups.find((group) => group.id !== groupId) ?? null;
      setSelectedSchemeGroupId(fallbackGroup?.id ?? null);
    }
  }, [schemeDraft.groups, selectedSchemeGroupId, updateSchemeDraft]);

  const toggleFieldInSchemeGroup = React.useCallback((groupId: string, fieldId: string, checked: boolean) => {
    updateSchemeDraft((current) => {
      const nextGroups = current.groups.map((group) => ({
        ...group,
        fieldIds: checked
          ? group.fieldIds.filter((id) => id !== fieldId)
          : [...group.fieldIds],
      }));

      return {
        ...current,
        groups: nextGroups.map((group) => {
          if (group.id !== groupId) {
            return group;
          }
          return {
            ...group,
            fieldIds: checked
              ? [...group.fieldIds, fieldId]
              : group.fieldIds.filter((id) => id !== fieldId),
          };
        }),
      };
    });
  }, [updateSchemeDraft]);

  const applyPreviewWorkbenchWidth = React.useCallback((nextWidth: number) => {
    const normalizedWidth = normalizePreviewWorkbenchWidth(nextWidth);
    setPreviewWorkbenchWidth(normalizedWidth);
    setPreviewWorkbenchWidthInput(String(normalizedWidth));
    onDocumentChange(stabilizeDocument(stabilizedDocument, fieldOptions, getDefaultSize, undefined, undefined, normalizedWidth));
  }, [fieldOptions, getDefaultSize, onDocumentChange, stabilizedDocument]);

  const mutateDrafts = React.useCallback((mutator: (draftMap: Map<string, FlowDraft[]>, groupOrder: string[]) => void) => {
    const draftMap = new Map<string, FlowDraft[]>(
      groups.map((group) => [group.group.id, normalizeDrafts(group.fields)]),
    );
    const groupOrder = groups.map((group) => group.group.id);
    mutator(draftMap, groupOrder);
    commitDocument(stabilizeDocument(stabilizedDocument, fieldOptions, getDefaultSize, draftMap, groupOrder, previewWorkbenchWidth));
  }, [commitDocument, fieldOptions, getDefaultSize, groups, previewWorkbenchWidth, stabilizedDocument]);

  const addFieldToGroup = React.useCallback((fieldId: string, targetGroupId?: string | null) => {
    const option = optionMap.get(fieldId);
    if (!option) {
      return;
    }

    const groupId = targetGroupId || selectedGroupId || groups[0]?.group.id;
    if (placedFieldIds.has(fieldId) && groupId) {
      setSelectedGroupId(groupId);
      return;
    }

    const defaultSize = getDefaultSize(option.rawField as Record<string, any>);
    const nextField: FlowDraft = {
      field: fieldId,
      h: clampNumber(defaultSize.h, BILL_FORM_MIN_CONTROL_HEIGHT, 160),
      id: `archive_layout_field_${fieldId}_${Date.now()}`,
      panelOrder: 999,
      panelRow: 1,
      parentId: groupId,
      readOnly: Boolean(option.readOnly),
      required: Boolean(option.required),
      title: option.title || option.label,
      type: option.itemType,
      w: clampNumber(defaultSize.w, BILL_FORM_MIN_WIDTH, usablePreviewWorkbenchWidth),
      x: 0,
      y: 0,
    };

    if (!groupId) {
      const nextGroupId = `archive_layout_group_${Date.now()}`;
      const nextGroup: DetailLayoutItem = {
        h: GROUP_MIN_HEIGHT,
        id: nextGroupId,
        type: 'groupbox',
        w: previewWorkbenchWidth,
        x: 24,
        y: 24,
        title: DEFAULT_GROUP_TITLE,
      };
      (nextGroup as DetailLayoutItem & { rows?: number }).rows = GROUP_DEFAULT_ROWS;
      commitDocument(createEmptyDetailLayoutDocument({
        gridSize: stabilizedDocument.gridSize,
        items: [
          ...stabilizedDocument.items,
          nextGroup,
          {
            ...nextField,
            parentId: nextGroupId,
          },
        ],
      }));
      setSelectedGroupId(nextGroupId);
      setSelectedFieldId(nextField.id);
      return;
    }

    mutateDrafts((draftMap) => {
      const current = draftMap.get(groupId) ?? [];
      draftMap.set(groupId, [...current, nextField]);
    });
    setSelectedGroupId(groupId);
    setSelectedFieldId(nextField.id);
  }, [commitDocument, getDefaultSize, groups, mutateDrafts, optionMap, placedFieldIds, previewWorkbenchWidth, selectedGroupId, stabilizedDocument.gridSize, stabilizedDocument.items, usablePreviewWorkbenchWidth]);

  const updateField = React.useCallback((fieldId: string, patch: Partial<FlowDraft>) => {
    mutateDrafts((draftMap) => {
      draftMap.forEach((drafts, groupId) => {
        const index = drafts.findIndex((item) => item.id === fieldId);
        if (index === -1) {
          return;
        }

        const nextItem = { ...drafts[index], ...patch };
        if (patch.parentId && patch.parentId !== groupId) {
          draftMap.set(groupId, drafts.filter((item) => item.id !== fieldId));
          draftMap.set(String(patch.parentId), [...(draftMap.get(String(patch.parentId)) ?? []), nextItem]);
          return;
        }

        const nextDrafts = drafts.slice();
        nextDrafts[index] = nextItem;
        draftMap.set(groupId, nextDrafts);
      });
    });
  }, [mutateDrafts]);

  const startFieldResize = React.useCallback((
    event: React.MouseEvent<HTMLDivElement> | React.PointerEvent<HTMLDivElement>,
    field: FlowDraft,
    dimension: 'h' | 'w',
  ) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedFieldId(field.id);
    const initialPreview = {
      fieldId: field.id,
      h: field.h,
      w: field.w,
    } satisfies FieldResizePreview;
    fieldResizePreviewRef.current = initialPreview;
    setFieldResizePreview(initialPreview);
    setFieldResizeState({
      dimension,
      fieldId: field.id,
      startHeight: field.h,
      startMouseX: event.clientX,
      startMouseY: event.clientY,
      startWidth: field.w,
    });
  }, []);

  const removeField = React.useCallback((fieldId: string) => {
    mutateDrafts((draftMap) => {
      draftMap.forEach((drafts, groupId) => {
        draftMap.set(groupId, drafts.filter((item) => item.id !== fieldId));
      });
    });
    if (openFieldEditorId === fieldId) {
      setOpenFieldEditorId(null);
    }
    if (selectedFieldId === fieldId) {
      setSelectedFieldId(null);
    }
  }, [mutateDrafts, openFieldEditorId, selectedFieldId]);

  React.useEffect(() => {
    if (!fieldResizeState) {
      return undefined;
    }

    const bodyStyle = globalThis.document?.body?.style;
    if (bodyStyle) {
      bodyStyle.cursor = fieldResizeState.dimension === 'w' ? 'col-resize' : 'row-resize';
      bodyStyle.userSelect = 'none';
    }

    const applyPreview = (nextPreview: FieldResizePreview) => {
      fieldResizePreviewRef.current = nextPreview;
      if (fieldResizeFrameRef.current !== null) {
        cancelAnimationFrame(fieldResizeFrameRef.current);
      }
      fieldResizeFrameRef.current = requestAnimationFrame(() => {
        setFieldResizePreview(nextPreview);
        fieldResizeFrameRef.current = null;
      });
    };

    const finishResize = () => {
      if (fieldResizeFrameRef.current !== null) {
        cancelAnimationFrame(fieldResizeFrameRef.current);
        fieldResizeFrameRef.current = null;
      }
      const finalPreview = fieldResizePreviewRef.current;
      if (finalPreview && finalPreview.fieldId === fieldResizeState.fieldId) {
        updateField(fieldResizeState.fieldId, { h: finalPreview.h, w: finalPreview.w });
      }
      fieldResizePreviewRef.current = null;
      setFieldResizePreview(null);
      setFieldResizeState(null);
      if (bodyStyle) {
        bodyStyle.cursor = '';
        bodyStyle.userSelect = '';
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (fieldResizeState.dimension === 'w') {
        applyPreview({
          fieldId: fieldResizeState.fieldId,
          h: fieldResizePreviewRef.current?.h ?? fieldResizeState.startHeight,
          w: clampNumber(
            Math.round(fieldResizeState.startWidth + (event.clientX - fieldResizeState.startMouseX)),
            BILL_FORM_MIN_WIDTH,
            usablePreviewWorkbenchWidth,
          ),
        });
        return;
      }

      applyPreview({
        fieldId: fieldResizeState.fieldId,
        h: clampNumber(
          Math.round(fieldResizeState.startHeight + (event.clientY - fieldResizeState.startMouseY)),
          BILL_FORM_MIN_CONTROL_HEIGHT,
          160,
        ),
        w: fieldResizePreviewRef.current?.w ?? fieldResizeState.startWidth,
      });
    };

    const handlePointerUp = () => {
      finishResize();
    };

    const handleWindowBlur = () => {
      finishResize();
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp, { once: true });
    window.addEventListener('pointercancel', handlePointerUp, { once: true });
    window.addEventListener('blur', handleWindowBlur, { once: true });

    return () => {
      if (fieldResizeFrameRef.current !== null) {
        cancelAnimationFrame(fieldResizeFrameRef.current);
        fieldResizeFrameRef.current = null;
      }
      if (bodyStyle) {
        bodyStyle.cursor = '';
        bodyStyle.userSelect = '';
      }
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [fieldResizeState, updateField, usablePreviewWorkbenchWidth]);

  const renameGroup = React.useCallback((groupId: string, title: string) => {
    const nextDocument = createEmptyDetailLayoutDocument({
      gridSize: stabilizedDocument.gridSize,
      items: stabilizedDocument.items.map((item) => (
        item.id === groupId ? { ...item, title } : item
      )),
    });
    commitDocument(nextDocument);
  }, [commitDocument, stabilizedDocument.gridSize, stabilizedDocument.items]);

  const addGroupRow = React.useCallback((groupId: string) => {
    const groupContext = groups.find((group) => group.group.id === groupId);
    if (!groupContext) {
      return;
    }

    const actualRowCount = Math.max(1, groupContext.fields.reduce((max, item) => Math.max(max, item.panelRow), 1));
    const currentRowCount = Math.max(actualRowCount, Number((groupContext.group as DetailLayoutItem & { rows?: number }).rows) || 0);
    const nextDocument = createEmptyDetailLayoutDocument({
      gridSize: stabilizedDocument.gridSize,
      items: stabilizedDocument.items.map((item) => (
        item.id === groupId
          ? { ...item, rows: currentRowCount + 1 } as DetailLayoutItem & { rows?: number }
          : item
      )),
    });
    commitDocument(nextDocument);
    setSelectedGroupId(groupId);
  }, [commitDocument, groups, stabilizedDocument.gridSize, stabilizedDocument.items]);

  const deleteGroupRow = React.useCallback((groupId: string) => {
    const groupContext = groups.find((group) => group.group.id === groupId);
    if (!groupContext) {
      return;
    }

    const actualRowCount = Math.max(1, groupContext.fields.reduce((max, item) => Math.max(max, item.panelRow), 1));
    const currentRowCount = Math.max(actualRowCount, Number((groupContext.group as DetailLayoutItem & { rows?: number }).rows) || 0);
    const nextRowCount = Math.max(actualRowCount, currentRowCount - 1);
    if (nextRowCount === currentRowCount) {
      return;
    }

    const nextDocument = createEmptyDetailLayoutDocument({
      gridSize: stabilizedDocument.gridSize,
      items: stabilizedDocument.items.map((item) => (
        item.id === groupId
          ? { ...item, rows: nextRowCount } as DetailLayoutItem & { rows?: number }
          : item
      )),
    });
    commitDocument(nextDocument);
    setSelectedGroupId(groupId);
  }, [commitDocument, groups, stabilizedDocument.gridSize, stabilizedDocument.items]);

  const deleteGroup = React.useCallback((groupId: string) => {
    const nextItems = stabilizedDocument.items.filter((item) => item.id !== groupId && item.parentId !== groupId);
    const nextDocument = createEmptyDetailLayoutDocument({
      gridSize: stabilizedDocument.gridSize,
      items: nextItems,
    });
    commitDocument(nextDocument);
    if (selectedGroupId === groupId) {
      const fallbackGroup = nextItems.find((item) => item.type === 'groupbox');
      setSelectedGroupId(fallbackGroup?.id ?? null);
    }
    if (openFieldEditorId && stabilizedDocument.items.some((item) => item.parentId === groupId && item.id === openFieldEditorId)) {
      setOpenFieldEditorId(null);
    }
    if (selectedFieldId && stabilizedDocument.items.some((item) => item.parentId === groupId && item.id === selectedFieldId)) {
      setSelectedFieldId(null);
    }
  }, [commitDocument, openFieldEditorId, selectedFieldId, selectedGroupId, stabilizedDocument.gridSize, stabilizedDocument.items]);

  const moveField = React.useCallback((
    fieldId: string,
    targetGroupId: string,
    targetRowNumber: number = 1,
    beforeId: string | null = null,
  ) => {
    mutateDrafts((draftMap) => {
      let movingField: FlowDraft | null = null;
      draftMap.forEach((drafts, groupId) => {
        const index = drafts.findIndex((item) => item.id === fieldId);
        if (index === -1) {
          return;
        }
        movingField = {
          ...drafts[index],
          panelRow: Math.max(1, targetRowNumber),
          parentId: targetGroupId,
        };
        draftMap.set(groupId, reindexDrafts(drafts.filter((item) => item.id !== fieldId)));
      });

      if (!movingField) {
        return;
      }

      const targetDrafts: FlowDraft[] = reindexDrafts(draftMap.get(targetGroupId) ?? []).map((item) => ({
        ...item,
        parentId: targetGroupId,
      }));
      let insertIndex = -1;

      if (beforeId) {
        insertIndex = targetDrafts.findIndex((item) => item.id === beforeId);
      } else {
        const rowItems = targetDrafts.filter((item) => item.panelRow === Math.max(1, targetRowNumber));
        const lastRowItemId = rowItems[rowItems.length - 1]?.id;
        if (lastRowItemId) {
          const lastRowItemIndex = targetDrafts.findIndex((item) => item.id === lastRowItemId);
          insertIndex = lastRowItemIndex + 1;
        } else {
          insertIndex = targetDrafts.findIndex((item) => item.panelRow > Math.max(1, targetRowNumber));
        }
      }

      if (insertIndex >= 0) {
        targetDrafts.splice(insertIndex, 0, movingField);
      } else {
        targetDrafts.push(movingField);
      }

      draftMap.set(targetGroupId, reindexDrafts(targetDrafts));
    });
    setSelectedGroupId(targetGroupId);
    setSelectedFieldId(fieldId);
  }, [mutateDrafts]);

  const addGroup = React.useCallback(() => {
    const nextGroupId = `archive_layout_group_${Date.now()}`;
    const nextDocument = createEmptyDetailLayoutDocument({
      gridSize: stabilizedDocument.gridSize,
      items: [
        ...stabilizedDocument.items,
        (() => {
          const nextGroup: DetailLayoutItem = {
            h: GROUP_MIN_HEIGHT,
            id: nextGroupId,
            type: 'groupbox',
            w: previewWorkbenchWidth,
            x: 24,
            y: 24,
            title: `信息分组 ${groups.length + 1}`,
          };
          (nextGroup as DetailLayoutItem & { rows?: number }).rows = GROUP_DEFAULT_ROWS;
          return nextGroup;
        })(),
      ],
    });
    commitDocument(nextDocument);
    setSelectedGroupId(nextGroupId);
    setSelectedFieldId(null);
  }, [commitDocument, groups.length, previewWorkbenchWidth, stabilizedDocument.gridSize, stabilizedDocument.items]);

  const getFieldHeightPresetValue = React.useCallback((preset: HeightPreset, rawField?: Record<string, any>) => {
    const normalizedField = rawField ? normalizeColumn(rawField) : {};
    const typeText = String(
      normalizedField.type
      ?? normalizedField.fieldType
      ?? normalizedField.controlType
      ?? normalizedField.controltypename
      ?? '',
    ).toLowerCase();
    const isLongField = ['textarea', '备注', '说明', '描述', '富文本', 'markdown', '地址', '内容'].some((keyword) => typeText.includes(keyword.toLowerCase()));

    if (preset === 'single') {
      return BILL_FORM_MIN_CONTROL_HEIGHT;
    }
    if (preset === 'expanded') {
      return isLongField ? 124 : 88;
    }
    return isLongField ? 92 : 64;
  }, [normalizeColumn]);
  const fieldIdToGroupId = React.useMemo(() => {
    const nextMap = new Map<string, string>();
    groups.forEach((group) => {
      group.fields.forEach((field) => {
        nextMap.set(field.id, group.group.id);
      });
    });
    return nextMap;
  }, [groups]);

  const handleDragStart = React.useCallback((event: DragStartEvent) => {
    const activeFieldId = parseArchiveFieldDragId(event.active.id);
    const activeData = event.active.data.current as FieldDragData | undefined;
    if (!activeFieldId && activeData?.type !== 'archive-field') {
      return;
    }
    const activatorPoint = getClientPointFromActivatorEvent(event.activatorEvent);
    const initialRect = event.active.rect.current.initial;
    setDragFieldId(activeFieldId ?? activeData?.fieldId ?? null);
    setDropTarget(null);
    setDragOverlayOffset(
      activatorPoint && initialRect
        ? {
            x: activatorPoint.x - initialRect.left,
            y: activatorPoint.y - initialRect.top,
          }
        : null,
    );
  }, []);

  const handleDragOver = React.useCallback((event: DragOverEvent) => {
    const activeFieldId = parseArchiveFieldDragId(event.active.id);
    const overFieldId = parseArchiveFieldDragId(event.over?.id);
    const activeData = event.active.data.current as FieldDragData | undefined;
    const overData = event.over?.data.current as FieldDragData | GroupDragData | FieldInsertDropData | FieldRowDropData | undefined;
    if (!activeFieldId && activeData?.type !== 'archive-field') {
      return;
    }
    if (overFieldId && overFieldId !== activeFieldId) {
      setDropTarget({
        beforeId: overFieldId,
        groupId: fieldIdToGroupId.get(overFieldId) ?? activeData?.groupId ?? '',
        rowNumber: overData?.type === 'archive-field' ? null : null,
        mode: 'standard',
      });
      return;
    }
    if (overFieldId === activeFieldId) {
      return;
    }
    if (overData?.type === 'archive-field-row') {
      setDropTarget({ beforeId: overData.beforeId, groupId: overData.groupId, rowNumber: overData.rowNumber, mode: 'row' });
      return;
    }
    if (overData?.type === 'archive-field-insert') {
      setDropTarget({ beforeId: overData.beforeId, groupId: overData.groupId, rowNumber: null, mode: 'standard' });
      return;
    }
    if (overData?.type === 'archive-field' && overData.fieldId !== (activeFieldId ?? activeData?.fieldId)) {
      const targetGroup = groups.find((group) => group.group.id === overData.groupId);
      const targetField = targetGroup?.fields.find((field) => field.id === overData.fieldId);
      setDropTarget({
        beforeId: overData.fieldId,
        groupId: overData.groupId,
        rowNumber: targetField?.panelRow ?? null,
        mode: 'standard',
      });
      return;
    }
    if (overData?.type === 'archive-group') {
      setDropTarget({ beforeId: null, groupId: overData.groupId, rowNumber: null, mode: 'standard' });
      return;
    }
  }, [fieldIdToGroupId, groups]);

  const handleDragEnd = React.useCallback((event: DragEndEvent) => {
    const activeFieldId = parseArchiveFieldDragId(event.active.id);
    const overFieldId = parseArchiveFieldDragId(event.over?.id);
    const activeData = event.active.data.current as FieldDragData | undefined;
    const overData = event.over?.data.current as FieldDragData | GroupDragData | FieldInsertDropData | FieldRowDropData | undefined;
    const resolvedActiveFieldId = activeFieldId ?? activeData?.fieldId ?? null;
    const resolvedActiveGroupId = activeData?.groupId ?? (resolvedActiveFieldId ? fieldIdToGroupId.get(resolvedActiveFieldId) ?? '' : '');
    const activeGroup = groups.find((group) => group.group.id === resolvedActiveGroupId);
    const activeField = activeGroup?.fields.find((field) => field.id === resolvedActiveFieldId);
    const resolvedActiveRowNumber = activeField?.panelRow ?? 1;

    if (resolvedActiveFieldId && dropTarget?.mode === 'row' && (dropTarget.groupId !== resolvedActiveGroupId || (dropTarget.rowNumber ?? resolvedActiveRowNumber) !== resolvedActiveRowNumber)) {
      moveField(resolvedActiveFieldId, dropTarget.groupId, dropTarget.rowNumber ?? resolvedActiveRowNumber, dropTarget.beforeId);
    } else if (resolvedActiveFieldId && overData?.type === 'archive-field-row') {
      moveField(resolvedActiveFieldId, overData.groupId, overData.rowNumber, overData.beforeId);
    } else if (resolvedActiveFieldId && overFieldId && overFieldId !== resolvedActiveFieldId) {
      const targetGroupId = fieldIdToGroupId.get(overFieldId) ?? resolvedActiveGroupId;
      const targetGroup = groups.find((group) => group.group.id === targetGroupId);
      const targetField = targetGroup?.fields.find((field) => field.id === overFieldId);
      moveField(resolvedActiveFieldId, targetGroupId, targetField?.panelRow ?? 1, overFieldId);
    } else if (resolvedActiveFieldId && dropTarget && (dropTarget.groupId !== resolvedActiveGroupId || dropTarget.beforeId !== resolvedActiveFieldId)) {
      moveField(resolvedActiveFieldId, dropTarget.groupId, dropTarget.rowNumber ?? resolvedActiveRowNumber, dropTarget.beforeId);
    } else if (resolvedActiveFieldId && overData?.type === 'archive-field-insert') {
      moveField(resolvedActiveFieldId, overData.groupId, resolvedActiveRowNumber, overData.beforeId);
    } else if (resolvedActiveFieldId && overData?.type === 'archive-field' && overData.fieldId !== resolvedActiveFieldId) {
      const targetGroup = groups.find((group) => group.group.id === overData.groupId);
      const targetField = targetGroup?.fields.find((field) => field.id === overData.fieldId);
      moveField(resolvedActiveFieldId, overData.groupId, targetField?.panelRow ?? 1, overData.fieldId);
    } else if (resolvedActiveFieldId && overData?.type === 'archive-group') {
      moveField(resolvedActiveFieldId, overData.groupId, resolvedActiveRowNumber);
    }
    setDragFieldId(null);
    setDropTarget(null);
    setDragOverlayOffset(null);
  }, [dropTarget, fieldIdToGroupId, groups, moveField]);

  const handleDragCancel = React.useCallback(() => {
    setDragFieldId(null);
    setDropTarget(null);
    setDragOverlayOffset(null);
  }, []);

  const groupedPlacedFields = React.useMemo(() => {
    const fieldGroupMap = new Map<string, string>();
    stabilizedDocument.items.forEach((item) => {
      if (item.type !== 'groupbox' && item.field) {
        fieldGroupMap.set(String(item.field), String(item.parentId || ''));
      }
    });
    return placedOptions.map((option) => ({ option, groupId: fieldGroupMap.get(String(option.value)) ?? '' }));
  }, [placedOptions, stabilizedDocument.items]);

  const activeFieldEditor = React.useMemo(
    () => (openFieldEditorId ? findSelectedFieldContext(groups, openFieldEditorId) : null),
    [groups, openFieldEditorId],
  );
  const activeDragFieldContext = React.useMemo(
    () => (dragFieldId ? findSelectedFieldContext(groups, dragFieldId) : null),
    [dragFieldId, groups],
  );
  const activeFieldEditorId = activeFieldEditor?.field.id ?? null;
  const activeFieldEditorWidth = activeFieldEditor?.field.w ?? null;
  const activeFieldEditorHeight = activeFieldEditor?.field.h ?? null;

  React.useEffect(() => {
    if (!activeFieldEditor) {
      setQuickEditorSizeInput({ fieldId: null, h: '', w: '' });
      return;
    }
    setQuickEditorSizeInput({
      fieldId: activeFieldEditor.field.id,
      h: String(activeFieldEditor.field.h),
      w: String(activeFieldEditor.field.w),
    });
  }, [activeFieldEditor, activeFieldEditorHeight, activeFieldEditorId, activeFieldEditorWidth]);

  const commitFieldSizeValue = React.useCallback((
    fieldId: string,
    dimension: 'w' | 'h',
    rawValue: string,
    fallback: number,
  ) => {
    const nextValue = parseCommittedNumber(
      rawValue,
      fallback,
      dimension === 'w' ? BILL_FORM_MIN_WIDTH : BILL_FORM_MIN_CONTROL_HEIGHT,
      dimension === 'w' ? usablePreviewWorkbenchWidth : 160,
    );
    updateField(fieldId, dimension === 'w' ? { w: nextValue } : { h: nextValue });
    return nextValue;
  }, [updateField, usablePreviewWorkbenchWidth]);

  const nudgeFieldSizeValue = React.useCallback((
    fieldId: string,
    dimension: 'w' | 'h',
    currentValue: number,
    delta: number,
  ) => {
    const nextValue = clampNumber(
      currentValue + delta,
      dimension === 'w' ? BILL_FORM_MIN_WIDTH : BILL_FORM_MIN_CONTROL_HEIGHT,
      dimension === 'w' ? usablePreviewWorkbenchWidth : 160,
    );
    updateField(fieldId, dimension === 'w' ? { w: nextValue } : { h: nextValue });
    return nextValue;
  }, [updateField, usablePreviewWorkbenchWidth]);

  const handleFieldSizeInputKeyDown = React.useCallback((
    event: React.KeyboardEvent<HTMLInputElement>,
    commit: () => void,
    reset: () => void,
  ) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      commit();
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      reset();
    }
  }, []);

  const getSchemeFieldResolvedSize = React.useCallback((fieldId: string) => {
    const option = optionMap.get(fieldId);
    const fallbackSize = option
      ? getDefaultSize(option.rawField as Record<string, any>)
      : { h: BILL_FORM_MIN_CONTROL_HEIGHT, w: BILL_FORM_DEFAULT_WIDTH };
    const defaults = schemeDraft.fieldDefaults?.[fieldId];
    return {
      h: typeof defaults?.h === 'number' ? defaults.h : fallbackSize.h,
      w: typeof defaults?.w === 'number' ? defaults.w : fallbackSize.w,
    };
  }, [getDefaultSize, optionMap, schemeDraft.fieldDefaults]);

  const commitSchemeFieldSizeValue = React.useCallback((
    fieldId: string,
    dimension: 'w' | 'h',
    rawValue: string,
    fallback: number,
  ) => {
    const nextValue = parseCommittedNumber(
      rawValue,
      fallback,
      dimension === 'w' ? BILL_FORM_MIN_WIDTH : BILL_FORM_MIN_CONTROL_HEIGHT,
      dimension === 'w' ? Math.max(BILL_FORM_MAX_WIDTH, PREVIEW_WIDTH_MAX) : 160,
    );
    updateSchemeFieldDefault(fieldId, dimension, nextValue);
    return nextValue;
  }, [updateSchemeFieldDefault]);

  const nudgeSchemeFieldSizeValue = React.useCallback((
    fieldId: string,
    dimension: 'w' | 'h',
    currentValue: number,
    delta: number,
  ) => {
    const nextValue = clampNumber(
      currentValue + delta,
      dimension === 'w' ? BILL_FORM_MIN_WIDTH : BILL_FORM_MIN_CONTROL_HEIGHT,
      dimension === 'w' ? Math.max(BILL_FORM_MAX_WIDTH, PREVIEW_WIDTH_MAX) : 160,
    );
    updateSchemeFieldDefault(fieldId, dimension, nextValue);
    return nextValue;
  }, [updateSchemeFieldDefault]);

  const closeFieldEditor = React.useCallback(() => {
    setOpenFieldEditorId(null);
  }, []);

  const openFieldEditor = React.useCallback((fieldId: string) => {
    outsideCloseBlockedUntilRef.current = Date.now() + 220;
    setSelectedFieldId(fieldId);
    setOpenFieldEditorId(fieldId);
  }, []);

  const renderBillStyleFieldPreview = React.useCallback((rawField: any, previewHeight = BILL_FORM_MIN_CONTROL_HEIGHT) => {
    const field = normalizeColumn(rawField);
    const fieldTypeText = String(
      field.type
      ?? field.fieldType
      ?? field.controlType
      ?? field.controltypename
      ?? '',
    ).toLowerCase();
    const previewValue = String(field.defaultValue || field.placeholder || '').trim();
    const previewTextNode = (
      <span className={`min-w-0 flex-1 truncate ${previewValue ? 'text-slate-400' : 'text-transparent'}`}>
        {previewValue || '\u00a0'}
      </span>
    );
    const shellClass = 'pointer-events-none flex w-full min-w-0 items-center gap-1 overflow-hidden rounded-[7px] border border-[#d9e3ee] bg-white px-1.5 text-[10px] text-slate-500 shadow-none';

    if (fieldTypeText.includes('搜索')) {
      return (
        <div className={shellClass} style={{ height: previewHeight }}>
          <Search className="size-3.5 shrink-0 text-slate-300" strokeWidth={1.75} />
          {previewTextNode}
        </div>
      );
    }

    if (fieldTypeText.includes('日期') || fieldTypeText.includes('time') || fieldTypeText.includes('date')) {
      return (
        <div className={shellClass} style={{ height: previewHeight }}>
          {previewTextNode}
          <CalendarDays className="size-3.5 shrink-0 text-slate-300" strokeWidth={1.75} />
        </div>
      );
    }

    if (fieldTypeText.includes('下拉')
      || fieldTypeText.includes('select')
      || fieldTypeText.includes('多选')) {
      return (
        <div className={shellClass} style={{ height: previewHeight }}>
          {previewTextNode}
          <ChevronDown className="size-3.5 shrink-0 text-slate-300" strokeWidth={1.75} />
        </div>
      );
    }

    if (fieldTypeText.includes('单选') || fieldTypeText.includes('radio')) {
      return (
        <div className={shellClass} style={{ height: previewHeight }}>
          <span className="size-2.5 shrink-0 rounded-full border border-[color:var(--workspace-accent)]/45 bg-[color:var(--workspace-accent)]/12" />
          <span className="size-2.5 shrink-0 rounded-full border border-slate-300/90 bg-white" />
          <span className="min-w-0 flex-1 truncate text-transparent">{'\u00a0'}</span>
        </div>
      );
    }

    return (
      <div className={shellClass} style={{ height: previewHeight }}>
        {previewTextNode}
      </div>
    );
  }, [normalizeColumn]);

  return (
    <div className="grid h-full min-h-0 gap-3 xl:grid-cols-[300px_minmax(0,1fr)]">
      <aside className={cn(SURFACE_CLASS, 'flex min-h-0 flex-col overflow-hidden')}>
        <div className="border-b border-[#e4ecf5] px-3 py-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Fields</div>
              <div className="mt-1 text-[15px] font-semibold text-slate-900">字段编排</div>
              <div className="mt-1 text-[12px] leading-5 text-slate-500">左侧负责筛选与放入，中间完成分组预览、顺序和尺寸快编。</div>
            </div>
            <div className="grid w-[136px] shrink-0 grid-cols-2 gap-1 rounded-[12px] border border-[#dbe5ef] bg-white/88 p-1 shadow-[0_10px_24px_-22px_rgba(15,23,42,0.22)]">
            <button
              type="button"
              onClick={() => openSchemeModal()}
              className="inline-flex h-8 items-center justify-center rounded-[9px] bg-[#f8fbff] px-2 text-center text-[11px] font-semibold leading-tight text-slate-600 transition-colors hover:bg-[#eef5ff] hover:text-primary"
            >
              方案设置
            </button>
            <button
              type="button"
              onClick={addGroup}
              className="inline-flex h-8 items-center justify-center rounded-[9px] bg-[#f8fbff] px-2 text-center text-[11px] font-semibold leading-tight text-slate-600 transition-colors hover:bg-[#eef5ff] hover:text-primary"
            >
              新增分组
            </button>
            </div>
          </div>
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="搜索字段名、编码或描述"
            className="mt-2 h-8.5 w-full rounded-[10px] border border-[#d8e3ef] bg-white px-3 text-[12px] text-slate-700 outline-none placeholder:text-slate-400"
          />
          {showFieldStats && <div className="mt-2 grid grid-cols-3 gap-1.5">
            <div className="rounded-[10px] border border-[#e6edf6] bg-white/80 px-2 py-1.5">
              <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">已放入</div>
              <div className="mt-0.5 text-[13px] font-semibold text-slate-900">{placedOptions.length}</div>
            </div>
            <div className="rounded-[10px] border border-[#e6edf6] bg-white/80 px-2 py-1.5">
              <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">待放入</div>
              <div className="mt-0.5 text-[13px] font-semibold text-slate-900">{pendingOptions.length}</div>
            </div>
            <div className="rounded-[10px] border border-[#e6edf6] bg-white/80 px-2 py-1.5">
              <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">分组</div>
              <div className="mt-0.5 text-[13px] font-semibold text-slate-900">{schemes.length}</div>
            </div>
          </div>}
          <div className="mt-2 inline-flex rounded-[10px] border border-[#dbe5ef] bg-white p-1">
            {([
              { key: 'placed', label: '已放入' },
              { key: 'pending', label: '未放入' },
              { key: 'schemes', label: '已有方案' },
            ] as Array<{ key: SidebarTabKey; label: string }>).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setSidebarTab(tab.key)}
                className={cn(
                  'rounded-[8px] px-2.5 py-1.5 text-[11px] font-semibold transition-colors',
                  sidebarTab === tab.key ? 'bg-primary text-white' : 'text-slate-500 hover:bg-[#f8fbff]',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div className="min-h-0 flex-1 p-2">
          {sidebarTab === 'placed' ? (
          <section className="flex h-full min-h-0 flex-col rounded-[14px] border border-[#e0e8f2] bg-white/82">
            <div className="flex items-center justify-between border-b border-[#edf2f7] px-3 py-2">
              <div className="text-[12px] font-semibold text-slate-700">已放入字段</div>
              <div className="text-[11px] text-slate-400">{groupedPlacedFields.length}</div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {groupedPlacedFields.length > 0 ? groupedPlacedFields.map(({ option, groupId }) => {
                const itemId = stabilizedDocument.items.find((item) => item.field === String(option.value))?.id ?? null;
                return (
                  <button
                    key={String(option.value)}
                    type="button"
                    onClick={() => {
                      setSelectedGroupId(groupId || selectedGroupId);
                      setSelectedFieldId(itemId);
                    }}
                    className={cn(
                      'mb-2 flex w-full items-center justify-between rounded-[14px] border px-3 py-3 text-left transition-colors',
                      itemId === selectedFieldId
                        ? 'border-primary/35 bg-primary/5'
                        : 'border-[#edf2f7] bg-[#fbfdff] hover:border-[#d7e5f4] hover:bg-white',
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12px] font-semibold text-slate-800">{option.title || option.label}</div>
                      <div className="mt-1 truncate text-[11px] text-slate-400">{option.label}</div>
                    </div>
                    <span className="ml-2 shrink-0 rounded-full border border-[#e5ecf5] bg-white px-2 py-1 text-[10px] font-medium text-slate-500">
                      {groups.find((group) => group.group.id === groupId)?.group.title || '未分组'}
                    </span>
                  </button>
                );
              }) : (
                <div className="px-2 py-6 text-center text-[12px] text-slate-400">当前没有匹配字段</div>
              )}
            </div>
          </section>
          ) : null}
          {sidebarTab === 'pending' ? (
          <section className="flex h-full min-h-0 flex-col rounded-[14px] border border-[#e0e8f2] bg-white/82">
            <div className="flex items-center justify-between border-b border-[#edf2f7] px-3 py-2">
              <div className="text-[12px] font-semibold text-slate-700">待放入字段</div>
              <div className="text-[11px] text-slate-400">{pendingOptions.length}</div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {pendingOptions.length > 0 ? pendingOptions.map((option) => (
                <button
                  key={String(option.value)}
                  type="button"
                  onClick={() => addFieldToGroup(String(option.value))}
                  className="mb-2 flex w-full items-center justify-between rounded-[14px] border border-dashed border-[#d8e3ef] bg-[#f8fbff] px-3 py-3 text-left transition-colors hover:border-primary/40 hover:bg-white"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12px] font-semibold text-slate-800">{option.title || option.label}</div>
                    <div className="mt-1 truncate text-[11px] text-slate-400">{option.label}</div>
                  </div>
                  <span className="ml-2 shrink-0 text-[11px] font-semibold text-primary">放入</span>
                </button>
              )) : (
                <div className="px-2 py-6 text-center text-[12px] text-slate-400">所有字段都已放入布局</div>
              )}
            </div>
          </section>
          ) : null}
          {sidebarTab === 'schemes' ? (
          <section className="flex h-full min-h-0 flex-col rounded-[14px] border border-[#e0e8f2] bg-white/82">
            <div className="flex items-center justify-between border-b border-[#edf2f7] px-3 py-2">
              <div>
                <div className="text-[12px] font-semibold text-slate-700">已有方案</div>
                <div className="mt-1 text-[11px] text-slate-400">空布局会自动弹出方案设置，也可以从这里继续应用和维护。</div>
              </div>
              <div className="grid w-full max-w-[160px] shrink-0 gap-1 rounded-[12px] border border-[#dbe5ef] bg-white/90 p-1 shadow-[0_10px_24px_-22px_rgba(15,23,42,0.22)]">
                <button
                  type="button"
                  onClick={createSchemeFromCurrentLayout}
                  disabled={!hasPlacedFields}
                  className={cn(
                    'inline-flex h-8 items-center justify-center rounded-[9px] px-2 text-center text-[10px] font-semibold leading-tight transition-colors',
                    hasPlacedFields
                      ? 'bg-[#f8fbff] text-slate-600 hover:bg-[#eef5ff] hover:text-primary'
                      : 'cursor-not-allowed bg-[#f8fafc] text-slate-300',
                  )}
                >
                  从当前布局生成
                </button>
                <button
                  type="button"
                  onClick={createNewSchemeDraft}
                  className="inline-flex h-8 items-center justify-center rounded-[9px] bg-[#f8fbff] px-2 text-center text-[10px] font-semibold leading-tight text-slate-600 transition-colors hover:bg-[#eef5ff] hover:text-primary"
                >
                  新建方案
                </button>
                <button
                  type="button"
                  onClick={() => openSchemeModal()}
                  className="inline-flex h-8 items-center justify-center rounded-[9px] bg-primary px-2 text-center text-[10px] font-semibold leading-tight text-white transition-colors hover:bg-primary/90"
                >
                  打开设置
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              <div className="mb-2 rounded-[12px] border border-[#dbe5ef] bg-[#f8fbff] px-3 py-2.5 text-[11px] leading-5 text-slate-500">
                方案会先写入当前模块配置。返回页面后再点击模块保存，刷新页面时这些已保存方案才会继续保留。
              </div>
              {schemes.length > 0 ? schemes.map((scheme) => (
                <div
                  key={scheme.id}
                  className={cn(
                    'mb-1.5 rounded-[12px] border px-2.5 py-2.5',
                    schemeSourceId === scheme.id ? 'border-primary/35 bg-primary/5' : 'border-[#edf2f7] bg-[#fbfdff]',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12px] font-semibold text-slate-800">{scheme.name}</div>
                      <div className="mt-1 text-[11px] text-slate-400">{scheme.groups.length} 个分组 · {countSchemeFields(scheme)} 个字段</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingUnsavedScheme(false);
                        setSchemeSourceId(scheme.id);
                        setSchemeDraft(cloneArchiveLayoutScheme(scheme));
                        setSelectedSchemeGroupId(scheme.groups[0]?.id ?? null);
                      }}
                      className="rounded-[9px] border border-[#dbe5ef] bg-white px-2 py-1 text-[10px] font-semibold text-slate-500 hover:bg-[#f8fbff]"
                    >
                      选中
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => applySpecificScheme(scheme)}
                      className="rounded-[9px] border border-primary/20 bg-primary px-2.5 py-1.5 text-[10px] font-semibold text-white hover:bg-primary/90"
                    >
                      应用
                    </button>
                    <button
                      type="button"
                      onClick={() => openSchemeModal(scheme.id)}
                      className="rounded-[9px] border border-[#dbe5ef] bg-white px-2.5 py-1.5 text-[10px] font-semibold text-slate-600 hover:bg-[#f8fbff]"
                    >
                      编辑
                    </button>
                    <button
                      type="button"
                      onClick={() => duplicateScheme(scheme)}
                      className="rounded-[9px] border border-[#dbe5ef] bg-white px-2.5 py-1.5 text-[10px] font-semibold text-slate-600 hover:bg-[#f8fbff]"
                    >
                      复制
                    </button>
                  </div>
                </div>
              )) : (
                <div className="grid gap-3 rounded-[14px] border border-dashed border-[#d8e3ef] bg-[#f8fbff] px-4 py-6 text-center">
                  <div className="text-[13px] font-semibold text-slate-700">还没有保存的方案</div>
                  <div className="text-[12px] leading-5 text-slate-500">先设置分组并勾选字段，再保存为方案或一键放入布局。</div>
                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={createNewSchemeDraft}
                      className="rounded-[10px] border border-[#dbe5ef] bg-white px-3 py-2 text-[12px] font-semibold text-slate-600 hover:bg-[#f8fbff]"
                    >
                      新建方案
                    </button>
                    <button
                      type="button"
                      onClick={() => openSchemeModal(null, suggestedScheme)}
                      className="rounded-[10px] border border-primary/20 bg-primary/8 px-3 py-2 text-[12px] font-semibold text-primary hover:bg-primary/12"
                    >
                      使用默认建议
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
          ) : null}
        </div>
      </aside>

      <section className={cn(SURFACE_CLASS, 'flex min-h-0 flex-col overflow-hidden')}>
        <div className="border-b border-[#e4ecf5] px-4 py-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Workbench</div>
              <div className="mt-1 text-[15px] font-semibold text-slate-900">字段预览工作台</div>
              <div className="mt-1 text-[12px] text-slate-500">中间区域只保留分组标题和字段预览，双击字段打开快编设置。</div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 rounded-[12px] border border-[#dbe5ef] bg-white px-2.5 py-1.5">
                <span className="text-[11px] font-medium text-slate-500">预览宽度</span>
                <input
                  type="range"
                  min={PREVIEW_WIDTH_MIN}
                  max={PREVIEW_WIDTH_MAX}
                  step={20}
                  value={previewWorkbenchWidth}
                  onChange={(event) => applyPreviewWorkbenchWidth(Number(event.target.value))}
                  className="h-4 w-24 accent-primary"
                />
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={previewWorkbenchWidthInput}
                  onChange={(event) => setPreviewWorkbenchWidthInput(event.target.value.replace(/[^\d]/g, ''))}
                  onBlur={() => applyPreviewWorkbenchWidth(parseCommittedNumber(previewWorkbenchWidthInput, previewWorkbenchWidth, PREVIEW_WIDTH_MIN, PREVIEW_WIDTH_MAX))}
                  onKeyDown={(event) => handleFieldSizeInputKeyDown(
                    event,
                    () => applyPreviewWorkbenchWidth(parseCommittedNumber(previewWorkbenchWidthInput, previewWorkbenchWidth, PREVIEW_WIDTH_MIN, PREVIEW_WIDTH_MAX)),
                    () => setPreviewWorkbenchWidthInput(String(previewWorkbenchWidth)),
                  )}
                  className="h-7 w-16 rounded-[9px] border border-[#d8e3ef] px-2 text-center text-[11px] text-slate-700 outline-none"
                />
              </div>
              <div className="inline-flex rounded-[12px] border border-[#dbe5ef] bg-white p-1">
                <button
                  type="button"
                  onClick={() => setDensity('compact')}
                  className={cn(
                    'rounded-[10px] px-3 py-1.5 text-[11px] font-semibold transition-colors',
                    density === 'compact' ? 'bg-primary text-white' : 'text-slate-500 hover:bg-[#f8fbff]',
                  )}
                >
                  紧凑
                </button>
                <button
                  type="button"
                  onClick={() => setDensity('comfortable')}
                  className={cn(
                    'rounded-[10px] px-3 py-1.5 text-[11px] font-semibold transition-colors',
                    density === 'comfortable' ? 'bg-primary text-white' : 'text-slate-500 hover:bg-[#f8fbff]',
                  )}
                >
                  舒展
                </button>
              </div>
            </div>
          </div>
        </div>
        <DndContext
          collisionDetection={closestCenter}
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="min-h-0 flex-1 overflow-auto p-3">
            <div
              className="mx-auto rounded-[18px] border border-[#d6e2f1] bg-[linear-gradient(180deg,#fcfdff_0%,#f6faff_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]"
              style={{ minWidth: previewWorkbenchWidth + 32, width: previewWorkbenchWidth + 32 }}
            >
              <div className="flex min-h-full flex-col gap-6">
                {groups.length === 0 ? (
                  <div className="rounded-[16px] border border-dashed border-[#dbe6f1] bg-white/72 px-4 py-10 text-center text-[12px] text-slate-400">
                    暂无分组，先在左侧点击“新增分组”。
                  </div>
                ) : null}
                {groups.map((group) => {
                  const actualRowCount = Math.max(1, group.fields.reduce((max, item) => Math.max(max, item.panelRow), 1));
                  const desiredRowCount = Math.max(actualRowCount, Number((group.group as DetailLayoutItem & { rows?: number }).rows) || 0);
                  const rowNumbers = Array.from({ length: desiredRowCount }, (_, index) => index + 1);

                  return <div
                    key={group.group.id}
                    className={cn(
                      'group border-t border-[#edf2f7] pt-4 transition-colors first:border-t-0 first:pt-0',
                      selectedGroupId === group.group.id && 'border-primary/20',
                    )}
                    style={{ width: group.group.w }}
                    onClick={() => {
                      setSelectedGroupId(group.group.id);
                      setSelectedFieldId(null);
                    }}
                  >
                    <div className="mb-3 flex items-center gap-2 px-1">
                      <input
                        value={String(group.group.title || '')}
                        onChange={(event) => renameGroup(group.group.id, event.target.value)}
                        onClick={(event) => event.stopPropagation()}
                        className="h-8 min-w-0 flex-1 rounded-[10px] border border-transparent bg-transparent px-2 text-[15px] font-semibold tracking-[-0.01em] text-slate-800 outline-none transition-colors focus:border-[#d8e3ef] focus:bg-white"
                        placeholder={DEFAULT_GROUP_TITLE}
                      />
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          addGroupRow(group.group.id);
                        }}
                        className="h-8 shrink-0 rounded-[10px] border border-[#dbe5ef] bg-white px-3 text-[11px] font-semibold text-slate-600 transition-colors hover:border-primary/35 hover:text-primary"
                      >
                        新增行
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          deleteGroup(group.group.id);
                        }}
                        className="h-8 shrink-0 rounded-[10px] border border-[#f1d4d8] bg-[#fff7f7] px-3 text-[11px] font-semibold text-rose-600 transition-colors hover:bg-[#fff1f1]"
                      >
                        删除分组
                      </button>
                    </div>

                    <DesignerWorkbenchDropLane
                      dropId={`archive-group:${group.group.id}`}
                      data={{ groupId: group.group.id, type: 'archive-group' } as GroupDragData}
                      className={cn(
                        'scrollbar-none rounded-[16px] px-1 py-1 transition-colors',
                        dragFieldId && dropTarget?.groupId === group.group.id && !dropTarget.beforeId ? 'bg-primary/5' : '',
                        group.fields.length === 0 && 'rounded-[14px] border border-dashed border-[#dfe7f1]/80 bg-white/40 px-3 py-4',
                      )}
                      style={{
                        minHeight: group.fields.length > 0
                          ? Math.max(...group.fields.map((item) => getBillHeaderFieldShellHeight({
                              controlHeight: getBillHeaderFieldHeight({ controlHeight: item.h }),
                              width: getBillHeaderFieldWidth({ width: item.w, name: String(item.title || item.field || '') }),
                            })))
                          : BILL_FORM_WORKBENCH_MIN_ROW_HEIGHT,
                      }}
                    >
                      <div className="grid gap-y-0.5">
                        {rowNumbers.map((rowNumber) => {
                          const rowFields = group.fields
                            .filter((field) => field.panelRow === rowNumber)
                            .sort((left, right) => left.panelOrder - right.panelOrder || left.x - right.x);
                          const isRowTarget = Boolean(
                            dragFieldId
                            && dropTarget?.groupId === group.group.id
                            && dropTarget.rowNumber === rowNumber
                            && dropTarget.mode === 'row',
                          );

                          return (
                            <DesignerWorkbenchDropLane
                              key={`archive-row:${group.group.id}:${rowNumber}`}
                              dropId={`archive-row:${group.group.id}:${rowNumber}`}
                              data={{ beforeId: null, groupId: group.group.id, rowNumber, type: 'archive-field-row' } as FieldRowDropData}
                              className={cn(
                                'group/row relative rounded-[12px] px-1 py-0.5 transition-colors',
                                isRowTarget ? 'bg-primary/6' : 'hover:bg-slate-50/70',
                                rowFields.length === 0 ? 'border border-dashed border-[#dbe5ef] bg-white/70 px-3 py-2' : '',
                              )}
                            >
                              <SortableContext items={rowFields.map((field) => `archive-field:${field.id}`)} strategy={rectSortingStrategy}>
                                <div className={cn(
                                  'flex min-w-full items-start',
                                  density === 'compact' ? 'gap-x-3.5' : 'gap-x-4.5',
                                )}>
                                  {rowFields.length > 0 ? rowFields.map((field) => {
                                    const fieldOption = optionMap.get(String(field.field ?? ''));
                                    const rawField = (fieldOption?.rawField ?? {}) as Record<string, any>;
                                    const displayTitle = getDisplayTitle(field, fieldOption, rawField);
                                    const normalizedField = normalizeColumn({ ...rawField, name: displayTitle });
                                    const previewFieldWidth = fieldResizePreview?.fieldId === field.id ? fieldResizePreview.w : field.w;
                                    const previewFieldHeight = fieldResizePreview?.fieldId === field.id ? fieldResizePreview.h : field.h;
                                    const liveWidth = getBillHeaderFieldWidth({ width: previewFieldWidth, name: displayTitle });
                                    const liveHeight = getBillHeaderFieldHeight({ controlHeight: previewFieldHeight });
                                    const shellHeight = Math.max(28, getBillHeaderFieldShellHeight({ controlHeight: liveHeight, width: liveWidth }) - 24);
                                    const previewHeight = clampNumber(liveHeight - 24, 18, 24);
                                    const isInsertTarget = dragFieldId && dropTarget?.groupId === group.group.id && dropTarget.beforeId === field.id && dragFieldId !== field.id;
                                    const isDragging = dragFieldId === field.id;
                                    const isSelected = selectedFieldId === field.id || isInsertTarget || openFieldEditorId === field.id;

                                    return (
                                      <DesignerWorkbenchDraggableItem
                                        key={field.id}
                                        dragId={`archive-field:${field.id}`}
                                        dropId={`archive-drop:${field.id}`}
                                        data={{ fieldId: field.id, groupId: group.group.id, type: 'archive-field' } as FieldDragData}
                                        sortable
                                        itemAttributes={{ 'data-archive-field-card': 'true', title: `${displayTitle} · 拖动调整顺序，双击设置` }}
                                        className={cn(
                                          'group relative flex shrink-0 select-none rounded-[10px] text-left transition-all',
                                          isDragging ? 'cursor-grabbing opacity-0' : 'cursor-grab active:cursor-grabbing',
                                          !isDragging && isSelected ? 'ring-2 ring-[color:var(--workspace-accent)]/10' : null,
                                          !isDragging && !isSelected ? 'hover:bg-slate-50/40' : null,
                                        )}
                                        style={{ height: shellHeight, width: liveWidth }}
                                        onClick={(event: React.MouseEvent<HTMLDivElement>) => {
                                          event.stopPropagation();
                                          setSelectedGroupId(group.group.id);
                                          setSelectedFieldId(field.id);
                                        }}
                                        onDoubleClick={(event: React.MouseEvent<HTMLDivElement>) => {
                                          event.stopPropagation();
                                          openFieldEditor(field.id);
                                        }}
                                      >
                                        {isInsertTarget ? <span className="pointer-events-none absolute inset-y-2 left-0 w-[3px] rounded-full bg-primary" /> : null}
                                        <div
                                          data-workbench-no-drag="true"
                                          className="absolute inset-y-1 right-0 z-10 flex w-3 cursor-col-resize items-center justify-center rounded-full opacity-0 transition-all group-hover:opacity-100 hover:bg-primary/8"
                                          onPointerDown={(event) => startFieldResize(event, field, 'w')}
                                        >
                                          <span className="h-7 w-px rounded-full bg-slate-300/70" />
                                        </div>
                                        <div
                                          data-workbench-no-drag="true"
                                          className="absolute inset-x-3 bottom-0 z-10 flex h-3 cursor-row-resize items-center justify-center rounded-full opacity-0 transition-all group-hover:opacity-100 hover:bg-primary/8"
                                          onPointerDown={(event) => startFieldResize(event, field, 'h')}
                                        >
                                          <span className="h-px w-7 rounded-full bg-slate-300/70" />
                                        </div>
                                        <div className="pointer-events-none flex h-full min-w-0 flex-1 items-center gap-1.5 px-1">
                                          <div className="flex h-full max-w-[42%] shrink-0 items-center text-[12px] font-medium tracking-[-0.01em] text-slate-800" title={displayTitle}>
                                            <span className="truncate">{displayTitle}</span>
                                          </div>
                                          <div className="min-w-0 flex-1">
                                            {renderBillStyleFieldPreview(normalizedField, previewHeight)}
                                          </div>
                                        </div>
                                      </DesignerWorkbenchDraggableItem>
                                    );
                                  }) : (
                                    <>
                                      <span className="h-px flex-1 self-center bg-[#dbe6f2]" />
                                      <span className="shrink-0 text-[11px] font-medium text-slate-400">拖到这一行</span>
                                      <span className="h-px flex-1 self-center bg-[#dbe6f2]" />
                                    </>
                                  )}
                                </div>
                              </SortableContext>
                              {rowFields.length === 0 ? (
                                <button
                                  type="button"
                                  data-workbench-no-drag="true"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    deleteGroupRow(group.group.id);
                                  }}
                                  className="absolute right-2 top-1/2 inline-flex h-6 -translate-y-1/2 items-center rounded-[8px] border border-[#f1d4d8] bg-white/96 px-2 text-[10px] font-semibold text-rose-600 opacity-0 shadow-sm transition-all pointer-events-none group-hover/row:pointer-events-auto group-hover/row:opacity-100 hover:bg-[#fff5f5]"
                                >
                                  删除行
                                </button>
                              ) : null}
                            </DesignerWorkbenchDropLane>
                          );
                        })}
                      </div>
                    </DesignerWorkbenchDropLane>
                  </div>
                })}
              </div>
            </div>
          </div>
          <DragOverlay modifiers={dragOverlayModifiers}>
            {activeDragFieldContext ? (() => {
              const fieldOption = optionMap.get(String(activeDragFieldContext.field.field ?? ''));
              const rawField = (fieldOption?.rawField ?? {}) as Record<string, any>;
              const displayTitle = getDisplayTitle(activeDragFieldContext.field, fieldOption, rawField);
              const normalizedField = normalizeColumn({ ...rawField, name: displayTitle });
              const liveHeight = getBillHeaderFieldHeight({ controlHeight: activeDragFieldContext.field.h });
              const overlayWidth = clampNumber(
                Math.min(getBillHeaderFieldWidth({ width: activeDragFieldContext.field.w, name: displayTitle }), 320),
                220,
                320,
              );
              const overlayHeight = clampNumber(Math.max(32, liveHeight + 8), 32, 42);
              const previewHeight = clampNumber(liveHeight - 26, 16, 20);

              return (
                <div
                  className="flex select-none rounded-[10px] border border-[color:var(--workspace-accent)]/18 bg-white/96 text-left shadow-[0_16px_30px_-24px_rgba(15,23,42,0.28)]"
                  style={{ height: overlayHeight, width: overlayWidth }}
                >
                  <div className="pointer-events-none flex h-full min-w-0 flex-1 items-center gap-2 px-2">
                    <div className="flex h-full max-w-[44%] shrink-0 items-center text-[12px] font-semibold tracking-[-0.01em] text-slate-800" title={displayTitle}>
                      <span className="truncate">{displayTitle}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      {renderBillStyleFieldPreview(normalizedField, previewHeight)}
                    </div>
                  </div>
                </div>
              );
            })() : null}
          </DragOverlay>
        </DndContext>
      </section>
      {isSchemeModalOpen && typeof globalThis.document !== 'undefined'
        ? createPortal(
            <>
              <div className="fixed inset-0 z-[118] bg-slate-950/22 backdrop-blur-[2px]" onClick={() => setIsSchemeModalOpen(false)} />
              <div className="fixed inset-0 z-[119] flex items-center justify-center p-5" onClick={() => setIsSchemeModalOpen(false)}>
                <div
                  className="flex h-[min(780px,calc(100vh-40px))] w-[min(1160px,calc(100vw-40px))] flex-col overflow-hidden rounded-[22px] border border-[#d9e3ef] bg-white shadow-[0_30px_80px_-40px_rgba(15,23,42,0.38)]"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="flex items-start justify-between gap-4 border-b border-[#e8eef5] px-5 py-4">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Scheme</div>
                      <div className="mt-1 text-[16px] font-semibold text-slate-900">方案设置</div>
                      <div className="mt-1 text-[12px] leading-5 text-slate-500">先设置分组，再勾选需要放入该分组的字段，最后一键放入当前布局。</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          saveSchemeDraft();
                          setSidebarTab('schemes');
                        }}
                        className="rounded-[12px] border border-[#dbe5ef] bg-white px-3 py-2 text-[12px] font-semibold text-slate-600 hover:bg-[#f8fbff]"
                      >
                        保存方案
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          saveSchemeDraftAsCopy();
                          setSidebarTab('schemes');
                        }}
                        className="rounded-[12px] border border-[#dbe5ef] bg-white px-3 py-2 text-[12px] font-semibold text-slate-600 hover:bg-[#f8fbff]"
                      >
                        另存为
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsSchemeModalOpen(false)}
                        className="rounded-[12px] border border-[#dbe5ef] bg-white px-3 py-2 text-[12px] font-semibold text-slate-600 hover:bg-[#f8fbff]"
                      >
                        关闭
                      </button>
                    </div>
                  </div>
                  <div className="border-b border-[#edf2f7] bg-[#fffaf1] px-5 py-2.5">
                    <div className="flex items-start gap-2 text-[11px] leading-5 text-slate-600">
                      <span className="material-symbols-outlined mt-0.5 text-[15px] text-amber-500">info</span>
                      <span>保存方案只会更新当前模块配置草稿。要在刷新页面后继续保留这些方案，还需要返回主页面再执行一次模块保存。</span>
                    </div>
                  </div>
                  <div className="grid min-h-0 flex-1 grid-cols-[260px_240px_minmax(0,1fr)] gap-0">
                    <div className="flex min-h-0 flex-col border-r border-[#edf2f7] bg-[#fbfdff]">
                      <div className="flex items-center justify-between px-4 py-3">
                        <div className="text-[12px] font-semibold text-slate-700">已有方案</div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={createSchemeFromCurrentLayout}
                            disabled={!hasPlacedFields}
                            className={cn(
                              'rounded-[9px] border px-2.5 py-1 text-[11px] font-semibold',
                              hasPlacedFields
                                ? 'border-[#dbe5ef] bg-white text-slate-600 hover:bg-[#f8fbff]'
                                : 'cursor-not-allowed border-[#eef2f7] bg-[#f8fafc] text-slate-300',
                            )}
                          >
                            从布局生成
                          </button>
                          <button
                            type="button"
                            onClick={createNewSchemeDraft}
                            className="rounded-[9px] border border-[#dbe5ef] bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-[#f8fbff]"
                          >
                            新建
                          </button>
                        </div>
                      </div>
                      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
                        {schemes.length > 0 ? schemes.map((scheme) => (
                          <button
                            key={scheme.id}
                            type="button"
                            onClick={() => {
                              setIsEditingUnsavedScheme(false);
                              setSchemeSourceId(scheme.id);
                              setSchemeDraft(cloneArchiveLayoutScheme(scheme));
                              setSelectedSchemeGroupId(scheme.groups[0]?.id ?? null);
                            }}
                            className={cn(
                              'mb-2 w-full rounded-[14px] border px-3 py-3 text-left transition-colors',
                              schemeSourceId === scheme.id ? 'border-primary/35 bg-primary/5' : 'border-[#e6edf6] bg-white hover:border-[#d7e5f4]',
                            )}
                          >
                            <div className="truncate text-[12px] font-semibold text-slate-800">{scheme.name}</div>
                            <div className="mt-1 text-[11px] text-slate-400">{scheme.groups.length} 个分组 · {countSchemeFields(scheme)} 个字段</div>
                          </button>
                        )) : (
                          <div className="rounded-[14px] border border-dashed border-[#d8e3ef] bg-white px-3 py-5 text-center text-[12px] text-slate-400">
                            还没有保存的方案
                          </div>
                        )}
                      </div>
                      <div className="border-t border-[#edf2f7] p-3">
                        <button
                          type="button"
                          onClick={() => openSchemeModal(null, suggestedScheme)}
                          className="w-full rounded-[12px] border border-primary/20 bg-primary/8 px-3 py-2 text-[12px] font-semibold text-primary hover:bg-primary/12"
                        >
                          使用默认建议
                        </button>
                      </div>
                    </div>
                    <div className="flex min-h-0 flex-col border-r border-[#edf2f7]">
                      <div className="border-b border-[#edf2f7] px-4 py-3">
                        <label className="grid gap-1 text-[12px] text-slate-600">
                          <span>方案名称</span>
                          <input
                            value={schemeDraft.name}
                            onChange={(event) => setSchemeDraft((current) => ({ ...current, name: event.target.value }))}
                            className="h-9 rounded-[10px] border border-[#d8e3ef] px-3 text-[12px] text-slate-700 outline-none"
                          />
                        </label>
                      </div>
                      <div className="flex items-center justify-between px-4 py-3">
                        <div className="text-[12px] font-semibold text-slate-700">分组</div>
                        <button
                          type="button"
                          onClick={addSchemeGroup}
                          className="rounded-[9px] border border-[#dbe5ef] bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-[#f8fbff]"
                        >
                          新增分组
                        </button>
                      </div>
                      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
                        {schemeDraft.groups.map((group) => (
                          <div
                            key={group.id}
                            className={cn(
                              'mb-2 rounded-[14px] border px-3 py-3',
                              selectedSchemeGroupId === group.id ? 'border-primary/35 bg-primary/5' : 'border-[#e6edf6] bg-white',
                            )}
                          >
                            <button
                              type="button"
                              onClick={() => setSelectedSchemeGroupId(group.id)}
                              className="mb-2 w-full text-left"
                            >
                              <div className="text-[11px] text-slate-400">{group.fieldIds.length} 个字段</div>
                            </button>
                            <input
                              value={group.name}
                              onChange={(event) => renameSchemeGroup(group.id, event.target.value)}
                              onFocus={() => setSelectedSchemeGroupId(group.id)}
                              className="h-9 w-full rounded-[10px] border border-[#d8e3ef] px-3 text-[12px] text-slate-700 outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => removeSchemeGroup(group.id)}
                              className="mt-2 w-full rounded-[10px] border border-[#f1d4d8] bg-[#fff7f7] px-3 py-2 text-[11px] font-semibold text-rose-600 hover:bg-[#fff1f1]"
                            >
                              删除分组
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex min-h-0 flex-col">
                      <div className="border-b border-[#edf2f7] px-4 py-3">
                        <div className="flex items-end justify-between gap-3">
                          <div>
                            <div className="text-[12px] font-semibold text-slate-700">{selectedSchemeGroup?.name || '选择一个分组'}</div>
                            <div className="mt-1 text-[11px] text-slate-400">勾选后字段会归入当前分组；如果它已在其他分组，会自动移动过来。</div>
                          </div>
                          {schemeSourceId ? (
                            <button
                              type="button"
                              onClick={deleteActiveScheme}
                              className="rounded-[10px] border border-[#f1d4d8] bg-[#fff7f7] px-3 py-2 text-[11px] font-semibold text-rose-600 hover:bg-[#fff1f1]"
                            >
                              删除方案
                            </button>
                          ) : null}
                        </div>
                        <input
                          value={schemeFieldKeyword}
                          onChange={(event) => setSchemeFieldKeyword(event.target.value)}
                          placeholder="搜索字段"
                          className="mt-3 h-10 w-full rounded-[12px] border border-[#d8e3ef] bg-white px-3 text-[12px] text-slate-700 outline-none placeholder:text-slate-400"
                        />
                      </div>
                      <div className="min-h-0 flex-1 overflow-y-auto p-3">
                        {selectedSchemeGroup ? filteredSchemeFieldOptions.map((option) => {
                          const fieldId = String(option.value);
                          const assignedGroupId = schemeFieldAssignments.get(fieldId) ?? null;
                          const assignedGroupName = assignedGroupId
                            ? schemeDraft.groups.find((group) => group.id === assignedGroupId)?.name ?? ''
                            : '';
                          const checked = selectedSchemeGroup.fieldIds.includes(fieldId);
                          const resolvedSchemeFieldSize = getSchemeFieldResolvedSize(fieldId);

                          return (
                            <label
                              key={fieldId}
                              className={cn(
                                'mb-2 flex cursor-pointer items-start gap-3 rounded-[14px] border px-3 py-3 transition-colors',
                                checked ? 'border-primary/35 bg-primary/5' : 'border-[#edf2f7] bg-[#fbfdff] hover:border-[#d7e5f4] hover:bg-white',
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(event) => toggleFieldInSchemeGroup(selectedSchemeGroup.id, fieldId, event.target.checked)}
                                className="mt-0.5 size-4 rounded border-[#c7d4e4]"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-[12px] font-semibold text-slate-800">{option.title || option.label}</div>
                                <div className="mt-1 truncate text-[11px] text-slate-400">{option.label}</div>
                                {checked ? (
                                  <div
                                    className="mt-2 grid grid-cols-2 gap-2"
                                    onClick={(event) => event.stopPropagation()}
                                  >
                                    <label className="grid gap-1 text-[10px] font-medium text-slate-500">
                                      <span>默认宽度</span>
                                      <div className="grid grid-cols-[24px_minmax(0,1fr)_24px] items-center gap-1">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const nextValue = nudgeSchemeFieldSizeValue(fieldId, 'w', resolvedSchemeFieldSize.w, -20);
                                            setSchemeFieldSizeInputs((current) => ({
                                              ...current,
                                              [fieldId]: { ...(current[fieldId] ?? {}), h: current[fieldId]?.h ?? String(resolvedSchemeFieldSize.h), w: String(nextValue) },
                                            }));
                                          }}
                                          className="h-7 rounded-[8px] border border-[#d8e3ef] bg-white text-[12px] font-semibold text-slate-500 hover:bg-[#f8fbff]"
                                        >
                                          -
                                        </button>
                                        <input
                                          type="text"
                                          inputMode="numeric"
                                          pattern="[0-9]*"
                                          value={schemeFieldSizeInputs[fieldId]?.w ?? String(resolvedSchemeFieldSize.w)}
                                          onChange={(event) => setSchemeFieldSizeInputs((current) => ({
                                            ...current,
                                            [fieldId]: { ...(current[fieldId] ?? {}), h: current[fieldId]?.h ?? String(resolvedSchemeFieldSize.h), w: event.target.value.replace(/[^\d]/g, '') },
                                          }))}
                                          onBlur={() => {
                                            const nextValue = commitSchemeFieldSizeValue(
                                              fieldId,
                                              'w',
                                              schemeFieldSizeInputs[fieldId]?.w ?? String(resolvedSchemeFieldSize.w),
                                              resolvedSchemeFieldSize.w,
                                            );
                                            setSchemeFieldSizeInputs((current) => ({
                                              ...current,
                                              [fieldId]: { ...(current[fieldId] ?? {}), h: current[fieldId]?.h ?? String(resolvedSchemeFieldSize.h), w: String(nextValue) },
                                            }));
                                          }}
                                          onKeyDown={(event) => handleFieldSizeInputKeyDown(
                                            event,
                                            () => {
                                              const nextValue = commitSchemeFieldSizeValue(
                                                fieldId,
                                                'w',
                                                schemeFieldSizeInputs[fieldId]?.w ?? String(resolvedSchemeFieldSize.w),
                                                resolvedSchemeFieldSize.w,
                                              );
                                              setSchemeFieldSizeInputs((current) => ({
                                                ...current,
                                                [fieldId]: { ...(current[fieldId] ?? {}), h: current[fieldId]?.h ?? String(resolvedSchemeFieldSize.h), w: String(nextValue) },
                                              }));
                                            },
                                            () => setSchemeFieldSizeInputs((current) => ({
                                              ...current,
                                              [fieldId]: { ...(current[fieldId] ?? {}), h: current[fieldId]?.h ?? String(resolvedSchemeFieldSize.h), w: String(resolvedSchemeFieldSize.w) },
                                            })),
                                          )}
                                          className="h-7 min-w-0 rounded-[8px] border border-[#d8e3ef] bg-white px-2 text-center text-[11px] text-slate-700 outline-none"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const nextValue = nudgeSchemeFieldSizeValue(fieldId, 'w', resolvedSchemeFieldSize.w, 20);
                                            setSchemeFieldSizeInputs((current) => ({
                                              ...current,
                                              [fieldId]: { ...(current[fieldId] ?? {}), h: current[fieldId]?.h ?? String(resolvedSchemeFieldSize.h), w: String(nextValue) },
                                            }));
                                          }}
                                          className="h-7 rounded-[8px] border border-[#d8e3ef] bg-white text-[12px] font-semibold text-slate-500 hover:bg-[#f8fbff]"
                                        >
                                          +
                                        </button>
                                      </div>
                                    </label>
                                    <label className="grid gap-1 text-[10px] font-medium text-slate-500">
                                      <span>默认高度</span>
                                      <div className="grid grid-cols-[24px_minmax(0,1fr)_24px] items-center gap-1">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const nextValue = nudgeSchemeFieldSizeValue(fieldId, 'h', resolvedSchemeFieldSize.h, -4);
                                            setSchemeFieldSizeInputs((current) => ({
                                              ...current,
                                              [fieldId]: { ...(current[fieldId] ?? {}), h: String(nextValue), w: current[fieldId]?.w ?? String(resolvedSchemeFieldSize.w) },
                                            }));
                                          }}
                                          className="h-7 rounded-[8px] border border-[#d8e3ef] bg-white text-[12px] font-semibold text-slate-500 hover:bg-[#f8fbff]"
                                        >
                                          -
                                        </button>
                                        <input
                                          type="text"
                                          inputMode="numeric"
                                          pattern="[0-9]*"
                                          value={schemeFieldSizeInputs[fieldId]?.h ?? String(resolvedSchemeFieldSize.h)}
                                          onChange={(event) => setSchemeFieldSizeInputs((current) => ({
                                            ...current,
                                            [fieldId]: { ...(current[fieldId] ?? {}), h: event.target.value.replace(/[^\d]/g, ''), w: current[fieldId]?.w ?? String(resolvedSchemeFieldSize.w) },
                                          }))}
                                          onBlur={() => {
                                            const nextValue = commitSchemeFieldSizeValue(
                                              fieldId,
                                              'h',
                                              schemeFieldSizeInputs[fieldId]?.h ?? String(resolvedSchemeFieldSize.h),
                                              resolvedSchemeFieldSize.h,
                                            );
                                            setSchemeFieldSizeInputs((current) => ({
                                              ...current,
                                              [fieldId]: { ...(current[fieldId] ?? {}), h: String(nextValue), w: current[fieldId]?.w ?? String(resolvedSchemeFieldSize.w) },
                                            }));
                                          }}
                                          onKeyDown={(event) => handleFieldSizeInputKeyDown(
                                            event,
                                            () => {
                                              const nextValue = commitSchemeFieldSizeValue(
                                                fieldId,
                                                'h',
                                                schemeFieldSizeInputs[fieldId]?.h ?? String(resolvedSchemeFieldSize.h),
                                                resolvedSchemeFieldSize.h,
                                              );
                                              setSchemeFieldSizeInputs((current) => ({
                                                ...current,
                                                [fieldId]: { ...(current[fieldId] ?? {}), h: String(nextValue), w: current[fieldId]?.w ?? String(resolvedSchemeFieldSize.w) },
                                              }));
                                            },
                                            () => setSchemeFieldSizeInputs((current) => ({
                                              ...current,
                                              [fieldId]: { ...(current[fieldId] ?? {}), h: String(resolvedSchemeFieldSize.h), w: current[fieldId]?.w ?? String(resolvedSchemeFieldSize.w) },
                                            })),
                                          )}
                                          className="h-7 min-w-0 rounded-[8px] border border-[#d8e3ef] bg-white px-2 text-center text-[11px] text-slate-700 outline-none"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const nextValue = nudgeSchemeFieldSizeValue(fieldId, 'h', resolvedSchemeFieldSize.h, 4);
                                            setSchemeFieldSizeInputs((current) => ({
                                              ...current,
                                              [fieldId]: { ...(current[fieldId] ?? {}), h: String(nextValue), w: current[fieldId]?.w ?? String(resolvedSchemeFieldSize.w) },
                                            }));
                                          }}
                                          className="h-7 rounded-[8px] border border-[#d8e3ef] bg-white text-[12px] font-semibold text-slate-500 hover:bg-[#f8fbff]"
                                        >
                                          +
                                        </button>
                                      </div>
                                    </label>
                                  </div>
                                ) : null}
                              </div>
                              {assignedGroupId && !checked ? (
                                <span className="shrink-0 rounded-full border border-[#e5ecf5] bg-white px-2 py-1 text-[10px] font-medium text-slate-500">
                                  {assignedGroupName}
                                </span>
                              ) : null}
                            </label>
                          );
                        }) : (
                          <div className="rounded-[14px] border border-dashed border-[#d8e3ef] bg-[#f8fbff] px-4 py-6 text-center text-[12px] text-slate-400">
                            先选择一个分组，再勾选字段
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between border-t border-[#edf2f7] px-4 py-3">
                        <div className="text-[12px] text-slate-500">{schemeDraft.groups.length} 个分组 · {countSchemeFields(schemeDraft)} 个已选字段</div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              saveSchemeDraft();
                              applySchemeDraft();
                            }}
                            className="rounded-[12px] border border-primary/20 bg-primary px-4 py-2 text-[12px] font-semibold text-white hover:bg-primary/90"
                          >
                            一键放入布局
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>,
            globalThis.document.body,
          )
        : null}
      {openFieldEditorId && typeof globalThis.document !== 'undefined'
        ? createPortal(
            <>
              <div className="fixed inset-0 z-[120] bg-slate-950/12" onClick={() => { if (Date.now() >= outsideCloseBlockedUntilRef.current) { closeFieldEditor(); } }} />
              <div className="fixed inset-0 z-[121] flex items-center justify-center p-4" onClick={() => { if (Date.now() >= outsideCloseBlockedUntilRef.current) { closeFieldEditor(); } }}>
                <div className="w-[min(320px,calc(100vw-32px))] rounded-[14px] border border-[#d9e3ef] bg-white p-3 shadow-[0_20px_36px_-24px_rgba(15,23,42,0.24)]" onMouseDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}>
                  {activeFieldEditor ? (() => {
                    const fieldOption = optionMap.get(String(activeFieldEditor.field.field ?? ''));
                    const rawField = (fieldOption?.rawField ?? {}) as Record<string, any>;
                    return (
                      <div className="grid gap-2">
                        <div className="mb-1 flex items-center justify-between">
                          <div className="text-[13px] font-semibold text-slate-800">字段快编</div>
                          <button type="button" onClick={closeFieldEditor} className="rounded-[8px] border border-[#dbe5ef] bg-white px-2 py-1 text-[11px] text-slate-500 hover:bg-[#f8fbff]">关闭</button>
                        </div>
                        <label className="grid gap-1 text-[12px] text-slate-600"><span>标题</span><input value={String(activeFieldEditor.field.title || '')} onChange={(event) => updateField(activeFieldEditor.field.id, { title: event.target.value })} className="h-8 rounded-[10px] border border-[#d8e3ef] px-3 outline-none" /></label>
                        <label className="grid gap-1 text-[12px] text-slate-600">
                          <span>所在分组</span>
                          <select value={String(activeFieldEditor.field.parentId || activeFieldEditor.group.group.id)} onChange={(event) => { updateField(activeFieldEditor.field.id, { parentId: event.target.value }); setSelectedGroupId(event.target.value); }} className="h-8 rounded-[10px] border border-[#d8e3ef] px-3 outline-none">
                            {groups.map((item) => (
                              <option key={item.group.id} value={item.group.id}>{item.group.title || DEFAULT_GROUP_TITLE}</option>
                            ))}
                          </select>
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <label className="grid gap-1 text-[12px] text-slate-600">
                            <span>宽度</span>
                            <div className="grid grid-cols-[28px_minmax(0,1fr)_28px] items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  const nextValue = nudgeFieldSizeValue(activeFieldEditor.field.id, 'w', activeFieldEditor.field.w, -20);
                                  setQuickEditorSizeInput((current) => ({ ...current, fieldId: activeFieldEditor.field.id, w: String(nextValue) }));
                                }}
                                className="h-8 rounded-[10px] border border-[#d8e3ef] bg-white text-[13px] font-semibold text-slate-500 hover:bg-[#f8fbff]"
                              >
                                -
                              </button>
                              <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={quickEditorSizeInput.fieldId === activeFieldEditor.field.id ? quickEditorSizeInput.w : String(activeFieldEditor.field.w)}
                                onChange={(event) => setQuickEditorSizeInput((current) => ({
                                  ...current,
                                  fieldId: activeFieldEditor.field.id,
                                  w: event.target.value.replace(/[^\d]/g, ''),
                                }))}
                                onBlur={() => {
                                  const nextValue = commitFieldSizeValue(
                                    activeFieldEditor.field.id,
                                    'w',
                                    quickEditorSizeInput.w,
                                    activeFieldEditor.field.w,
                                  );
                                  setQuickEditorSizeInput((current) => ({ ...current, fieldId: activeFieldEditor.field.id, w: String(nextValue) }));
                                }}
                                onKeyDown={(event) => handleFieldSizeInputKeyDown(
                                  event,
                                  () => {
                                    const nextValue = commitFieldSizeValue(
                                      activeFieldEditor.field.id,
                                      'w',
                                      quickEditorSizeInput.w,
                                      activeFieldEditor.field.w,
                                    );
                                    setQuickEditorSizeInput((current) => ({ ...current, fieldId: activeFieldEditor.field.id, w: String(nextValue) }));
                                  },
                                  () => setQuickEditorSizeInput((current) => ({ ...current, fieldId: activeFieldEditor.field.id, w: String(activeFieldEditor.field.w) })),
                                )}
                                className="h-8 min-w-0 rounded-[10px] border border-[#d8e3ef] px-2 text-center outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const nextValue = nudgeFieldSizeValue(activeFieldEditor.field.id, 'w', activeFieldEditor.field.w, 20);
                                  setQuickEditorSizeInput((current) => ({ ...current, fieldId: activeFieldEditor.field.id, w: String(nextValue) }));
                                }}
                                className="h-8 rounded-[10px] border border-[#d8e3ef] bg-white text-[13px] font-semibold text-slate-500 hover:bg-[#f8fbff]"
                              >
                                +
                              </button>
                            </div>
                          </label>
                          <label className="grid gap-1 text-[12px] text-slate-600">
                            <span>高度</span>
                            <div className="grid grid-cols-[28px_minmax(0,1fr)_28px] items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  const nextValue = nudgeFieldSizeValue(activeFieldEditor.field.id, 'h', activeFieldEditor.field.h, -4);
                                  setQuickEditorSizeInput((current) => ({ ...current, fieldId: activeFieldEditor.field.id, h: String(nextValue) }));
                                }}
                                className="h-8 rounded-[10px] border border-[#d8e3ef] bg-white text-[13px] font-semibold text-slate-500 hover:bg-[#f8fbff]"
                              >
                                -
                              </button>
                              <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={quickEditorSizeInput.fieldId === activeFieldEditor.field.id ? quickEditorSizeInput.h : String(activeFieldEditor.field.h)}
                                onChange={(event) => setQuickEditorSizeInput((current) => ({
                                  ...current,
                                  fieldId: activeFieldEditor.field.id,
                                  h: event.target.value.replace(/[^\d]/g, ''),
                                }))}
                                onBlur={() => {
                                  const nextValue = commitFieldSizeValue(
                                    activeFieldEditor.field.id,
                                    'h',
                                    quickEditorSizeInput.h,
                                    activeFieldEditor.field.h,
                                  );
                                  setQuickEditorSizeInput((current) => ({ ...current, fieldId: activeFieldEditor.field.id, h: String(nextValue) }));
                                }}
                                onKeyDown={(event) => handleFieldSizeInputKeyDown(
                                  event,
                                  () => {
                                    const nextValue = commitFieldSizeValue(
                                      activeFieldEditor.field.id,
                                      'h',
                                      quickEditorSizeInput.h,
                                      activeFieldEditor.field.h,
                                    );
                                    setQuickEditorSizeInput((current) => ({ ...current, fieldId: activeFieldEditor.field.id, h: String(nextValue) }));
                                  },
                                  () => setQuickEditorSizeInput((current) => ({ ...current, fieldId: activeFieldEditor.field.id, h: String(activeFieldEditor.field.h) })),
                                )}
                                className="h-8 min-w-0 rounded-[10px] border border-[#d8e3ef] px-2 text-center outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const nextValue = nudgeFieldSizeValue(activeFieldEditor.field.id, 'h', activeFieldEditor.field.h, 4);
                                  setQuickEditorSizeInput((current) => ({ ...current, fieldId: activeFieldEditor.field.id, h: String(nextValue) }));
                                }}
                                className="h-8 rounded-[10px] border border-[#d8e3ef] bg-white text-[13px] font-semibold text-slate-500 hover:bg-[#f8fbff]"
                              >
                                +
                              </button>
                            </div>
                          </label>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                          <button type="button" onClick={() => updateField(activeFieldEditor.field.id, { w: getFieldWidthPresetValue('compact', usablePreviewWorkbenchWidth) })} className="h-8 rounded-[10px] border border-[#dbe5ef] bg-[#f8fbff] text-[11px] font-medium text-slate-600">半宽</button>
                          <button type="button" onClick={() => updateField(activeFieldEditor.field.id, { w: getFieldWidthPresetValue('standard', usablePreviewWorkbenchWidth) })} className="h-8 rounded-[10px] border border-[#dbe5ef] bg-[#f8fbff] text-[11px] font-medium text-slate-600">标准</button>
                          <button type="button" onClick={() => updateField(activeFieldEditor.field.id, { w: getFieldWidthPresetValue('full', usablePreviewWorkbenchWidth) })} className="h-8 rounded-[10px] border border-[#dbe5ef] bg-[#f8fbff] text-[11px] font-medium text-slate-600">通栏</button>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                          <button type="button" onClick={() => updateField(activeFieldEditor.field.id, { h: getFieldHeightPresetValue('single', rawField) })} className="h-8 rounded-[10px] border border-[#dbe5ef] bg-[#f8fbff] text-[11px] font-medium text-slate-600">单行</button>
                          <button type="button" onClick={() => updateField(activeFieldEditor.field.id, { h: getFieldHeightPresetValue('comfortable', rawField) })} className="h-8 rounded-[10px] border border-[#dbe5ef] bg-[#f8fbff] text-[11px] font-medium text-slate-600">双行</button>
                          <button type="button" onClick={() => updateField(activeFieldEditor.field.id, { h: getFieldHeightPresetValue('expanded', rawField) })} className="h-8 rounded-[10px] border border-[#dbe5ef] bg-[#f8fbff] text-[11px] font-medium text-slate-600">展开</button>
                        </div>
                        <label className="flex items-center gap-2 text-[12px] text-slate-600"><input type="checkbox" checked={Boolean(activeFieldEditor.field.required)} onChange={(event) => updateField(activeFieldEditor.field.id, { required: event.target.checked })} />必填</label>
                        <label className="flex items-center gap-2 text-[12px] text-slate-600"><input type="checkbox" checked={Boolean(activeFieldEditor.field.readOnly)} onChange={(event) => updateField(activeFieldEditor.field.id, { readOnly: event.target.checked })} />只读</label>
                        <button type="button" onClick={() => removeField(activeFieldEditor.field.id)} className="mt-1 h-8 rounded-[12px] border border-[#f1d4d8] bg-[#fff7f7] text-[12px] font-medium text-rose-600 hover:bg-[#fff1f1]">移除该字段控件</button>
                      </div>
                    );
                  })() : (
                    <div className="grid gap-3">
                      <div className="flex items-center justify-between">
                        <div className="text-[13px] font-semibold text-slate-800">字段快编</div>
                        <button type="button" onClick={closeFieldEditor} className="rounded-[8px] border border-[#dbe5ef] bg-white px-2 py-1 text-[11px] text-slate-500 hover:bg-[#f8fbff]">关闭</button>
                      </div>
                      <div className="rounded-[10px] border border-[#e5ebf3] bg-[#f8fbff] px-3 py-3 text-[12px] text-slate-500">字段设置正在加载，请再双击一次字段。</div>
                    </div>
                  )}
                </div>
              </div>
            </>,
            globalThis.document.body,
          )
        : null}
    </div>
  );
});
