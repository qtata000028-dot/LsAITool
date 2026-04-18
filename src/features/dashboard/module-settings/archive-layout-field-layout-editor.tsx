import React from 'react';
import {
  DndContext,
  PointerSensor,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { CalendarDays, ChevronDown, Search } from 'lucide-react';
import { createPortal } from 'react-dom';

import { cn } from '../../../lib/utils';
import type { DetailLayoutDocument, DetailLayoutFieldOption, DetailLayoutItem } from '../detail-layout-designer/types';
import { createEmptyDetailLayoutDocument } from '../detail-layout-designer/utils/layout';
import { DesignerWorkbenchDraggableItem, DesignerWorkbenchDropLane } from '../dashboard-workbench-dnd';
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
const GROUP_GAP = 18;
const GROUP_MIN_HEIGHT = 176;
const GROUP_MIN_WIDTH = 880;
const GROUP_FLOW_USABLE_WIDTH = GROUP_MIN_WIDTH - BILL_FORM_WORKBENCH_LAYOUT_PADDING_X * 2;
const GROUP_DEFAULT_ROWS = 3;
const DEFAULT_GROUP_TITLE = '未分组字段';
type ArchiveLayoutFieldLayoutEditorProps = {
  document: DetailLayoutDocument;
  fieldOptions: DetailLayoutFieldOption[];
  getDefaultSize: (field: Record<string, any>) => { h: number; w: number };
  normalizeColumn: (column: Record<string, any>) => Record<string, any>;
  onDocumentChange: (document: DetailLayoutDocument) => void;
  renderFieldPreview: (column: Record<string, any>, index: number, scope: string) => React.ReactNode;
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

type FieldDragData = { fieldId: string; groupId: string; type: 'archive-field' };
type GroupDragData = { groupId: string; type: 'archive-group' };
type FieldSizeInputDraft = { fieldId: string | null; h: string; w: string };
type WidthPreset = 'compact' | 'standard' | 'full';
type HeightPreset = 'single' | 'comfortable' | 'expanded';

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
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
  return sortDraftsForFlow(drafts).map((item, index) => ({ ...item, panelOrder: index + 1, panelRow: 1 }));
}

function autoFlowDrafts<T extends FlowDraft & { resolvedWidth?: number }>(drafts: T[]) {
  let currentRow = 1;
  let currentWidth = 0;
  let currentOrder = 0;

  return sortDraftsForFlow(drafts).map((item) => {
    const width = clampNumber(item.resolvedWidth ?? item.w ?? BILL_FORM_DEFAULT_WIDTH, BILL_FORM_MIN_WIDTH, BILL_FORM_MAX_WIDTH);
    const projectedWidth = currentOrder === 0 ? width : currentWidth + BILL_FORM_WORKBENCH_LAYOUT_GAP_X + width;

    if (currentOrder > 0 && projectedWidth > GROUP_FLOW_USABLE_WIDTH) {
      currentRow += 1;
      currentWidth = 0;
      currentOrder = 0;
    }

    currentOrder += 1;
    currentWidth = currentOrder === 1 ? width : currentWidth + BILL_FORM_WORKBENCH_LAYOUT_GAP_X + width;

    return {
      ...item,
      panelOrder: currentOrder,
      panelRow: currentRow,
    };
  });
}

function getDisplayTitle(item: DetailLayoutItem, fieldOption?: DetailLayoutFieldOption, rawField?: Record<string, any>) {
  return String(item.title || fieldOption?.title || rawField?.name || fieldOption?.label || item.field || '字段').trim();
}

function getFieldWidthPresetValue(preset: WidthPreset) {
  if (preset === 'compact') {
    return clampNumber(Math.round((GROUP_FLOW_USABLE_WIDTH - BILL_FORM_WORKBENCH_LAYOUT_GAP_X) / 2), BILL_FORM_MIN_WIDTH, BILL_FORM_MAX_WIDTH);
  }
  if (preset === 'full') {
    return clampNumber(GROUP_FLOW_USABLE_WIDTH, BILL_FORM_MIN_WIDTH, BILL_FORM_MAX_WIDTH);
  }
  return clampNumber(BILL_FORM_DEFAULT_WIDTH, BILL_FORM_MIN_WIDTH, BILL_FORM_MAX_WIDTH);
}

function stabilizeDocument(
  document: DetailLayoutDocument,
  fieldOptions: DetailLayoutFieldOption[],
  getDefaultSize: (field: Record<string, any>) => { h: number; w: number },
  draftOverrides?: Map<string, FlowDraft[]>,
  preferredGroupOrder?: string[],
) {
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
    w: GROUP_MIN_WIDTH,
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
        resolvedWidth: clampNumber(item.w || defaultSize.w, BILL_FORM_MIN_WIDTH, BILL_FORM_MAX_WIDTH),
      };
    });
    const drafts = autoFlowDrafts(preparedDrafts);
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
    const groupHeight = Math.max(GROUP_MIN_HEIGHT, bodyHeight + GROUP_HEADER_HEIGHT + 20);
    const actualRowCount = Math.max(1, drafts.reduce((max, item) => Math.max(max, item.panelRow), 1));

    const nextGroup = {
      ...group,
      h: groupHeight,
      title: typeof group.title === 'string' ? group.title : `信息分组 ${groupIndex + 1}`,
      w: GROUP_FLOW_USABLE_WIDTH + BILL_FORM_WORKBENCH_LAYOUT_PADDING_X * 2,
      x: 24,
      y: nextGroupY,
    };
    (nextGroup as DetailLayoutItem & { rows?: number }).rows = actualRowCount;

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
  document,
  fieldOptions,
  getDefaultSize,
  normalizeColumn,
  onDocumentChange,
}: ArchiveLayoutFieldLayoutEditorProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const stabilizedDocument = React.useMemo(
    () => stabilizeDocument(document, fieldOptions, getDefaultSize),
    [document, fieldOptions, getDefaultSize],
  );
  const optionMap = React.useMemo(() => getFieldOptionMap(fieldOptions), [fieldOptions]);
  const groups = React.useMemo(() => buildGroupViewModels(stabilizedDocument), [stabilizedDocument]);
  const [keyword, setKeyword] = React.useState('');
  const [selectedGroupId, setSelectedGroupId] = React.useState<string | null>(groups[0]?.group.id ?? null);
  const [selectedFieldId, setSelectedFieldId] = React.useState<string | null>(null);
  const [openFieldEditorId, setOpenFieldEditorId] = React.useState<string | null>(null);
  const [dragFieldId, setDragFieldId] = React.useState<string | null>(null);
  const [dropTarget, setDropTarget] = React.useState<{ beforeId: string | null; groupId: string } | null>(null);
  const [density, setDensity] = React.useState<'comfortable' | 'compact'>('comfortable');
  const [quickEditorSizeInput, setQuickEditorSizeInput] = React.useState<FieldSizeInputDraft>({ fieldId: null, h: '', w: '' });
  const outsideCloseBlockedUntilRef = React.useRef(0);

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

  const placedFieldIds = React.useMemo(
    () => new Set(stabilizedDocument.items.filter((item) => item.type !== 'groupbox' && item.field).map((item) => String(item.field))),
    [stabilizedDocument.items],
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

  const commitDocument = React.useCallback((nextDocument: DetailLayoutDocument) => {
    onDocumentChange(stabilizeDocument(nextDocument, fieldOptions, getDefaultSize));
  }, [fieldOptions, getDefaultSize, onDocumentChange]);

  const mutateDrafts = React.useCallback((mutator: (draftMap: Map<string, FlowDraft[]>, groupOrder: string[]) => void) => {
    const draftMap = new Map<string, FlowDraft[]>(
      groups.map((group) => [group.group.id, normalizeDrafts(group.fields)]),
    );
    const groupOrder = groups.map((group) => group.group.id);
    mutator(draftMap, groupOrder);
    commitDocument(stabilizeDocument(stabilizedDocument, fieldOptions, getDefaultSize, draftMap, groupOrder));
  }, [commitDocument, fieldOptions, getDefaultSize, groups, stabilizedDocument]);

  const addFieldToGroup = React.useCallback((fieldId: string, targetGroupId?: string | null) => {
    const option = optionMap.get(fieldId);
    if (!option) {
      return;
    }

    const groupId = targetGroupId || selectedGroupId || groups[0]?.group.id;
    if (!groupId) {
      return;
    }

    if (placedFieldIds.has(fieldId)) {
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
      w: clampNumber(defaultSize.w, BILL_FORM_MIN_WIDTH, BILL_FORM_MAX_WIDTH),
      x: 0,
      y: 0,
    };

    mutateDrafts((draftMap) => {
      const current = draftMap.get(groupId) ?? [];
      draftMap.set(groupId, [...current, nextField]);
    });
    setSelectedGroupId(groupId);
    setSelectedFieldId(nextField.id);
  }, [getDefaultSize, groups, mutateDrafts, optionMap, placedFieldIds, selectedGroupId]);

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

  const renameGroup = React.useCallback((groupId: string, title: string) => {
    const nextDocument = createEmptyDetailLayoutDocument({
      gridSize: stabilizedDocument.gridSize,
      items: stabilizedDocument.items.map((item) => (
        item.id === groupId ? { ...item, title } : item
      )),
    });
    commitDocument(nextDocument);
  }, [commitDocument, stabilizedDocument.gridSize, stabilizedDocument.items]);

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

  const moveField = React.useCallback((fieldId: string, targetGroupId: string, beforeId: string | null = null) => {
    mutateDrafts((draftMap) => {
      let movingField: FlowDraft | null = null;
      draftMap.forEach((drafts, groupId) => {
        const index = drafts.findIndex((item) => item.id === fieldId);
        if (index === -1) {
          return;
        }
        movingField = { ...drafts[index], panelRow: 1, parentId: targetGroupId };
        draftMap.set(groupId, normalizeDrafts(drafts.filter((item) => item.id !== fieldId)));
      });

      if (!movingField) {
        return;
      }

      const targetDrafts = sortDraftsForFlow(draftMap.get(targetGroupId) ?? []);
      const insertIndex = beforeId ? targetDrafts.findIndex((item) => item.id === beforeId) : -1;
      if (insertIndex >= 0) {
        targetDrafts.splice(insertIndex, 0, movingField);
      } else {
        targetDrafts.push(movingField);
      }

      draftMap.set(targetGroupId, normalizeDrafts(targetDrafts.map((item) => ({
        ...item,
        parentId: targetGroupId,
      }))));
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
            w: GROUP_MIN_WIDTH,
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
  }, [commitDocument, groups.length, stabilizedDocument.gridSize, stabilizedDocument.items]);

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

  const handleDragStart = React.useCallback((event: DragStartEvent) => {
    const activeData = event.active.data.current as FieldDragData | undefined;
    if (activeData?.type !== 'archive-field') {
      return;
    }
    setDragFieldId(activeData.fieldId);
    setDropTarget(null);
  }, []);

  const handleDragOver = React.useCallback((event: DragOverEvent) => {
    const activeData = event.active.data.current as FieldDragData | undefined;
    const overData = event.over?.data.current as FieldDragData | GroupDragData | undefined;
    if (activeData?.type !== 'archive-field') {
      return;
    }
    if (overData?.type === 'archive-field' && overData.fieldId !== activeData.fieldId) {
      setDropTarget({ beforeId: overData.fieldId, groupId: overData.groupId });
      return;
    }
    if (overData?.type === 'archive-group') {
      setDropTarget({ beforeId: null, groupId: overData.groupId });
      return;
    }
    setDropTarget(null);
  }, []);

  const handleDragEnd = React.useCallback((event: DragEndEvent) => {
    const activeData = event.active.data.current as FieldDragData | undefined;
    const overData = event.over?.data.current as FieldDragData | GroupDragData | undefined;
    if (activeData?.type === 'archive-field' && overData?.type === 'archive-field' && overData.fieldId !== activeData.fieldId) {
      moveField(activeData.fieldId, overData.groupId, overData.fieldId);
    } else if (activeData?.type === 'archive-field' && overData?.type === 'archive-group') {
      moveField(activeData.fieldId, overData.groupId);
    }
    setDragFieldId(null);
    setDropTarget(null);
  }, [moveField]);

  const handleDragCancel = React.useCallback(() => {
    setDragFieldId(null);
    setDropTarget(null);
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
      dimension === 'w' ? BILL_FORM_MAX_WIDTH : 160,
    );
    updateField(fieldId, dimension === 'w' ? { w: nextValue } : { h: nextValue });
    return nextValue;
  }, [updateField]);

  const nudgeFieldSizeValue = React.useCallback((
    fieldId: string,
    dimension: 'w' | 'h',
    currentValue: number,
    delta: number,
  ) => {
    const nextValue = clampNumber(
      currentValue + delta,
      dimension === 'w' ? BILL_FORM_MIN_WIDTH : BILL_FORM_MIN_CONTROL_HEIGHT,
      dimension === 'w' ? BILL_FORM_MAX_WIDTH : 160,
    );
    updateField(fieldId, dimension === 'w' ? { w: nextValue } : { h: nextValue });
    return nextValue;
  }, [updateField]);

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
    const shellClass = 'pointer-events-none flex w-full min-w-0 items-center gap-1 overflow-hidden rounded-[8px] border border-[#d9e3ee] bg-white px-2 text-[11px] text-slate-500 shadow-none';

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
        <div className="border-b border-[#e4ecf5] px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Fields</div>
              <div className="mt-1 text-[15px] font-semibold text-slate-900">字段编排</div>
              <div className="mt-1 text-[12px] leading-5 text-slate-500">左侧负责筛选与放入，中间完成分组预览、顺序和尺寸快编。</div>
            </div>
            <button
              type="button"
              onClick={addGroup}
              className="rounded-[12px] border border-[#d7e2ef] bg-white px-3 py-2 text-[12px] font-medium text-slate-600 hover:bg-[#f8fbff]"
            >
              新增分组
            </button>
          </div>
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="搜索字段名、编码或描述"
            className="mt-4 h-10 w-full rounded-[12px] border border-[#d8e3ef] bg-white px-3 text-[12px] text-slate-700 outline-none placeholder:text-slate-400"
          />
          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="rounded-[12px] border border-[#e6edf6] bg-white/80 px-3 py-2">
              <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">已放入</div>
              <div className="mt-1 text-[15px] font-semibold text-slate-900">{placedOptions.length}</div>
            </div>
            <div className="rounded-[12px] border border-[#e6edf6] bg-white/80 px-3 py-2">
              <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">待放入</div>
              <div className="mt-1 text-[15px] font-semibold text-slate-900">{pendingOptions.length}</div>
            </div>
            <div className="rounded-[12px] border border-[#e6edf6] bg-white/80 px-3 py-2">
              <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">分组</div>
              <div className="mt-1 text-[15px] font-semibold text-slate-900">{groups.length}</div>
            </div>
          </div>
        </div>
        <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] gap-3 p-3">
          <section className="flex min-h-0 flex-col rounded-[14px] border border-[#e0e8f2] bg-white/82">
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
          <section className="flex min-h-0 flex-col rounded-[14px] border border-[#e0e8f2] bg-white/82">
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
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            <div className="rounded-[18px] border border-[#d6e2f1] bg-[linear-gradient(180deg,#fcfdff_0%,#f6faff_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
              <div className="flex min-h-full flex-col gap-6">
                {groups.length === 0 ? (
                  <div className="rounded-[16px] border border-dashed border-[#dbe6f1] bg-white/72 px-4 py-10 text-center text-[12px] text-slate-400">
                    暂无分组，先在左侧点击“新增分组”。
                  </div>
                ) : null}
                {groups.map((group) => (
                  <div
                    key={group.group.id}
                    className={cn(
                      'group border-t border-[#edf2f7] pt-4 transition-colors first:border-t-0 first:pt-0',
                      selectedGroupId === group.group.id && 'border-primary/20',
                    )}
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
                      <div className={cn(
                        'flex min-w-full flex-wrap content-start items-start',
                        density === 'compact' ? 'gap-1.5' : 'gap-2',
                      )}>
                        {group.fields.length > 0 ? group.fields.map((field) => {
                          const fieldOption = optionMap.get(String(field.field ?? ''));
                          const rawField = (fieldOption?.rawField ?? {}) as Record<string, any>;
                          const displayTitle = getDisplayTitle(field, fieldOption, rawField);
                          const normalizedField = normalizeColumn({ ...rawField, name: displayTitle });
                          const liveWidth = getBillHeaderFieldWidth({ width: field.w, name: displayTitle });
                          const liveHeight = getBillHeaderFieldHeight({ controlHeight: field.h });
                          const shellHeight = Math.max(36, getBillHeaderFieldShellHeight({ controlHeight: liveHeight, width: liveWidth }) - 16);
                          const previewHeight = clampNumber(liveHeight - 16, 26, 36);
                          const isInsertTarget = dragFieldId && dropTarget?.groupId === group.group.id && dropTarget.beforeId === field.id && dragFieldId !== field.id;
                          const isDragging = dragFieldId === field.id;
                          const isSelected = selectedFieldId === field.id || isInsertTarget || openFieldEditorId === field.id;

                          return (
                            <DesignerWorkbenchDraggableItem
                              key={field.id}
                              dragId={`archive-field:${field.id}`}
                              dropId={`archive-drop:${field.id}`}
                              data={{ fieldId: field.id, groupId: group.group.id, type: 'archive-field' } as FieldDragData}
                              itemAttributes={{ 'data-archive-field-card': 'true' }}
                              className={cn(
                                'group relative flex shrink-0 select-none rounded-[10px] text-left transition-all',
                                isDragging ? 'z-20 cursor-grabbing ring-2 ring-[color:var(--workspace-accent)]/14' : 'cursor-grab active:cursor-grabbing',
                                !isDragging && isSelected ? 'ring-2 ring-[color:var(--workspace-accent)]/10' : null,
                                !isSelected && !isDragging ? 'hover:bg-slate-50/40' : null,
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
                              <div className="pointer-events-none flex h-full min-w-0 flex-1 items-center gap-1 px-1">
                                <div className="flex h-full max-w-[42%] shrink-0 items-center text-[11px] font-medium tracking-[-0.01em] text-slate-500" title={displayTitle}>
                                  <span className="truncate">{displayTitle}</span>
                                </div>
                                <div className="min-w-0 flex-1">
                                  {renderBillStyleFieldPreview(normalizedField, previewHeight)}
                                </div>
                              </div>
                            </DesignerWorkbenchDraggableItem>
                          );
                        }) : (
                          <div className="flex w-full items-center gap-2 px-2 text-[11px] font-medium text-slate-400">
                            <span className="h-px flex-1 bg-[#dbe6f2]" />
                            <span>拖入该分组</span>
                            <span className="h-px flex-1 bg-[#dbe6f2]" />
                          </div>
                        )}
                      </div>
                    </DesignerWorkbenchDropLane>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DndContext>
      </section>
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
                          <button type="button" onClick={() => updateField(activeFieldEditor.field.id, { w: getFieldWidthPresetValue('compact') })} className="h-8 rounded-[10px] border border-[#dbe5ef] bg-[#f8fbff] text-[11px] font-medium text-slate-600">半宽</button>
                          <button type="button" onClick={() => updateField(activeFieldEditor.field.id, { w: getFieldWidthPresetValue('standard') })} className="h-8 rounded-[10px] border border-[#dbe5ef] bg-[#f8fbff] text-[11px] font-medium text-slate-600">标准</button>
                          <button type="button" onClick={() => updateField(activeFieldEditor.field.id, { w: getFieldWidthPresetValue('full') })} className="h-8 rounded-[10px] border border-[#dbe5ef] bg-[#f8fbff] text-[11px] font-medium text-slate-600">通栏</button>
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
