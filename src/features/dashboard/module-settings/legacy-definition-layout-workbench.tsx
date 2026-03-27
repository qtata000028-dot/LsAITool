import { useEffect, useMemo, useState, useTransition } from 'react';

import {
  buildDetailBoardGroup,
  createSuggestedDetailBoardGroups,
  getDetailBoardGroupRows,
} from './detail-board-config';

type LayoutPresetKey = 'balanced' | 'dense' | 'guided';
type FieldPreviewType = 'number' | 'select' | 'text' | 'textarea';

type LayoutPresetDefinition = {
  defaultColumnCount: number;
  defaultRowSpace: number;
  key: LayoutPresetKey;
  label: string;
};

type NormalizedLayoutField = {
  baseHeight: number;
  defaultValue: string;
  id: string;
  label: string;
  type: FieldPreviewType;
};

type PreviewFieldLayout = NormalizedLayoutField & {
  height: number;
  width: number;
  x: number;
  y: number;
};

type PreviewGroupLayout = {
  fields: PreviewFieldLayout[];
  height: number;
  id: string;
  name: string;
  rowSpace: number;
  width: number;
  x: number;
  y: number;
};

type LegacyDefinitionLayoutWorkbenchProps = {
  availableColumns: Record<string, any>[];
  currentDetailBoard: Record<string, any>;
  moduleCode?: string;
  normalizeColumn: (column: Record<string, any>) => Record<string, any>;
  onOpenPreview?: () => void;
  onUpdateDetailBoard: (patch: Record<string, any> | ((current: any) => any)) => void;
  selectedGroupId: string | null;
  setSelectedGroupId: (groupId: string | null) => void;
  title?: string;
};

const STAGE_WIDTH = 780;
const STAGE_OFFSET_X = 24;
const STAGE_TOP_PADDING = 24;
const GROUP_GAP = 22;
const GROUP_HEADER_HEIGHT = 56;
const GROUP_PADDING_X = 18;
const GROUP_PADDING_BOTTOM = 18;
const GROUP_PADDING_TOP = 16;
const FIELD_GAP = 14;
const FIELD_HEIGHT_MIN = 56;
const FIELD_HEIGHT_MAX = 180;
const FIELD_HEIGHT_PRESETS = [
  { label: '标准', value: 68 },
  { label: '加高', value: 96 },
  { label: '大块', value: 132 },
];

const LAYOUT_PRESET_OPTIONS: LayoutPresetDefinition[] = [
  { key: 'balanced', label: '平衡', defaultColumnCount: 2, defaultRowSpace: 14 },
  { key: 'dense', label: '紧凑', defaultColumnCount: 3, defaultRowSpace: 10 },
  { key: 'guided', label: '舒展', defaultColumnCount: 2, defaultRowSpace: 18 },
];

const GENERIC_FIELD_LABEL_PATTERNS = [
  /^field_\d+$/i,
  /^designer_control_\d+$/i,
  /^tree_field_\d+$/i,
  /^tree_grid_\d+$/i,
  /^grid_(field|column)_\d+$/i,
  /^column_\d+$/i,
  /^col_\d+$/i,
  /^字段\s*\d+$/i,
];

function clampValue(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getPresetDefinition(presetKey: LayoutPresetKey) {
  return LAYOUT_PRESET_OPTIONS.find((item) => item.key === presetKey) ?? LAYOUT_PRESET_OPTIONS[0];
}

function inferFieldType(column: Record<string, any>) {
  const normalizedName = String(column.name || column.label || '').toLowerCase();
  const rawType = String(column.type || column.fieldType || column.fieldtypeid || '').toLowerCase();

  if (
    rawType.includes('textarea')
    || rawType.includes('memo')
    || rawType.includes('remark')
    || /备注|说明|描述/.test(normalizedName)
  ) {
    return 'textarea' as const;
  }

  if (
    rawType.includes('select')
    || rawType.includes('combo')
    || rawType.includes('drop')
  ) {
    return 'select' as const;
  }

  if (
    rawType.includes('number')
    || rawType.includes('int')
    || rawType.includes('decimal')
    || rawType.includes('money')
    || /数量|金额|单价|价格|比率/.test(normalizedName)
  ) {
    return 'number' as const;
  }

  return 'text' as const;
}

function inferFieldHeight(column: Record<string, any>, fieldType: FieldPreviewType) {
  const explicitHeight = Number(
    column.controlHeight
    ?? column.layoutHeight
    ?? column.height
    ?? column.controlheight
    ?? column.layoutheight,
  );

  if (Number.isFinite(explicitHeight) && explicitHeight > 0) {
    return clampValue(Math.round(explicitHeight), FIELD_HEIGHT_MIN, FIELD_HEIGHT_MAX);
  }

  return fieldType === 'textarea' ? 106 : 68;
}

function normalizeCandidateText(value: unknown) {
  return String(value ?? '').trim();
}

function isGenericFieldLabel(value: string, fieldId: string) {
  if (!value) {
    return true;
  }

  if (GENERIC_FIELD_LABEL_PATTERNS.some((pattern) => pattern.test(value))) {
    return true;
  }

  return fieldId.length > 0
    && value.toLowerCase() === fieldId.toLowerCase()
    && GENERIC_FIELD_LABEL_PATTERNS.some((pattern) => pattern.test(fieldId));
}

function resolveFieldLabel(
  normalized: Record<string, any>,
  column: Record<string, any>,
  index: number,
) {
  const fieldId = normalizeCandidateText(normalized.id || column.id || '');
  const labelCandidates = [
    normalized.userName,
    normalized.username,
    normalized.displayName,
    normalized.displayname,
    normalized.caption,
    normalized.title,
    normalized.label,
    normalized.name,
    column.userName,
    column.username,
    column.displayName,
    column.displayname,
    column.caption,
    column.title,
    column.label,
    column.name,
    normalized.sourceField,
    normalized.fieldName,
    column.sourceField,
    column.fieldName,
  ]
    .map(normalizeCandidateText)
    .filter(Boolean);

  return labelCandidates.find((candidate) => !isGenericFieldLabel(candidate, fieldId)) ?? `字段 ${index + 1}`;
}

function buildNormalizedFields(
  availableColumns: Record<string, any>[],
  normalizeColumn: (column: Record<string, any>) => Record<string, any>,
) {
  return availableColumns
    .map((column, index) => {
      const normalized = normalizeColumn(column);
      const id = String(normalized.id || column.id || `field_${index + 1}`);
      const label = resolveFieldLabel(normalized, column, index);
      const fieldType = inferFieldType(normalized);

      return {
        baseHeight: inferFieldHeight(normalized, fieldType),
        defaultValue: String(normalized.defaultValue ?? normalized.value ?? ''),
        id,
        label,
        type: fieldType,
      } satisfies NormalizedLayoutField;
    })
    .filter((field) => field.id.trim().length > 0);
}

function buildPreviewGroups(
  groups: Record<string, any>[],
  fieldMap: Map<string, NormalizedLayoutField>,
  columnCount: number,
  rowSpace: number,
) {
  const stageWidth = STAGE_WIDTH - STAGE_OFFSET_X * 2;
  const normalizedColumns = clampValue(columnCount, 1, 3);
  const normalizedRowSpace = clampValue(rowSpace, 8, 24);
  let currentTop = STAGE_TOP_PADDING;

  return groups.map<PreviewGroupLayout>((group, groupIndex) => {
    const groupFieldIds = Array.isArray(group?.columnIds) ? group.columnIds : [];
    const groupFields = groupFieldIds
      .map((fieldId: string) => fieldMap.get(String(fieldId)))
      .filter(Boolean) as NormalizedLayoutField[];

    const innerWidth = stageWidth - GROUP_PADDING_X * 2;
    const computedFieldWidth = Math.floor(
      (innerWidth - FIELD_GAP * Math.max(normalizedColumns - 1, 0)) / Math.max(normalizedColumns, 1),
    );

    const resolvedFieldHeights = groupFields.map((field) => clampValue(
      Number(group?.columnHeights?.[field.id]) > 0 ? Number(group.columnHeights[field.id]) : field.baseHeight,
      FIELD_HEIGHT_MIN,
      FIELD_HEIGHT_MAX,
    ));
    const rowHeights: number[] = [];

    resolvedFieldHeights.forEach((height, index) => {
      const row = Math.floor(index / normalizedColumns);
      rowHeights[row] = Math.max(rowHeights[row] ?? 0, height);
    });

    const rowTops = rowHeights.map((_, rowIndex) => {
      let top = GROUP_HEADER_HEIGHT + GROUP_PADDING_TOP;
      for (let index = 0; index < rowIndex; index += 1) {
        top += rowHeights[index] + normalizedRowSpace;
      }
      return top;
    });

    let groupContentBottom = GROUP_HEADER_HEIGHT + GROUP_PADDING_TOP;

    const fieldLayouts = groupFields.map<PreviewFieldLayout>((field, index) => {
      const row = Math.floor(index / normalizedColumns);
      const column = index % normalizedColumns;
      const fieldHeight = resolvedFieldHeights[index];
      const x = GROUP_PADDING_X + column * (computedFieldWidth + FIELD_GAP);
      const y = rowTops[row] ?? (GROUP_HEADER_HEIGHT + GROUP_PADDING_TOP);

      groupContentBottom = Math.max(groupContentBottom, y + fieldHeight);

      return {
        ...field,
        height: fieldHeight,
        width: computedFieldWidth,
        x,
        y,
      };
    });

    const groupHeight = Math.max(groupContentBottom + GROUP_PADDING_BOTTOM, GROUP_HEADER_HEIGHT + 96);
    const previewGroup: PreviewGroupLayout = {
      fields: fieldLayouts,
      height: groupHeight,
      id: String(group?.id || `group_${groupIndex + 1}`),
      name: String(group?.name || `信息分组 ${groupIndex + 1}`),
      rowSpace: normalizedRowSpace,
      width: stageWidth,
      x: STAGE_OFFSET_X,
      y: currentTop,
    };

    currentTop += groupHeight + GROUP_GAP;
    return previewGroup;
  });
}

function renderControlShell(field: PreviewFieldLayout) {
  switch (field.type) {
    case 'number':
      return (
        <div className="bill-designer-control-shell flex h-full items-center justify-between rounded-[14px] px-3 text-[12px] text-slate-500">
          <span>{field.defaultValue || '0'}</span>
          <span className="material-symbols-outlined text-[15px] text-slate-300">straighten</span>
        </div>
      );
    case 'select':
      return (
        <div className="bill-designer-control-shell flex h-full items-center justify-between rounded-[14px] px-3 text-[12px] text-slate-500">
          <span>{field.defaultValue || '请选择'}</span>
          <span className="material-symbols-outlined text-[16px] text-slate-300">expand_more</span>
        </div>
      );
    case 'textarea':
      return (
        <div className="bill-designer-control-shell flex h-full rounded-[14px] px-3 py-2 text-[12px] leading-5 text-slate-500">
          <span className="overflow-hidden">{field.defaultValue || '请输入内容'}</span>
        </div>
      );
    default:
      return (
        <div className="bill-designer-control-shell flex h-full items-center rounded-[14px] px-3 text-[12px] text-slate-500">
          <span>{field.defaultValue || '请输入内容'}</span>
        </div>
      );
  }
}

function formatPixelValue(value: number) {
  return `${Math.round(value)}px`;
}

function SummaryBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[18px] border border-slate-200/80 bg-slate-50/85 px-4 py-3">
      <div className="text-[11px] font-semibold text-slate-400">{label}</div>
      <div className="mt-1 text-[14px] font-semibold text-slate-900">{value}</div>
    </div>
  );
}

export function LegacyDefinitionLayoutWorkbench({
  availableColumns,
  currentDetailBoard,
  moduleCode = '',
  normalizeColumn,
  onOpenPreview,
  onUpdateDetailBoard,
  selectedGroupId,
  setSelectedGroupId,
  title = '详情布局',
}: LegacyDefinitionLayoutWorkbenchProps) {
  const defaultPreset = getPresetDefinition('balanced');
  const [selectedPreset, setSelectedPreset] = useState<LayoutPresetKey>(defaultPreset.key);
  const [columnCount, setColumnCount] = useState(defaultPreset.defaultColumnCount);
  const [pendingSelectedGroupId, setPendingSelectedGroupId] = useState<string | null>(null);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [rowSpace, setRowSpace] = useState(defaultPreset.defaultRowSpace);
  const [showCoordinates, setShowCoordinates] = useState(false);
  const [heightDragState, setHeightDragState] = useState<null | {
    fieldId: string;
    startHeight: number;
    startY: number;
  }>(null);
  const [isPending, startTransition] = useTransition();

  const normalizedFields = useMemo(
    () => buildNormalizedFields(availableColumns, normalizeColumn),
    [availableColumns, normalizeColumn],
  );
  const fieldMap = useMemo(
    () => new Map(normalizedFields.map((field) => [field.id, field])),
    [normalizedFields],
  );
  const groups = Array.isArray(currentDetailBoard?.groups) ? currentDetailBoard.groups : [];
  const groupIds = useMemo(
    () => groups.map((group: any) => String(group?.id || '')).filter(Boolean),
    [groups],
  );
  const groupIdSet = useMemo(
    () => new Set(groupIds),
    [groupIds],
  );
  const activeGroupId = pendingSelectedGroupId && groupIdSet.has(pendingSelectedGroupId)
    ? pendingSelectedGroupId
    : (selectedGroupId && groupIdSet.has(selectedGroupId) ? selectedGroupId : (groupIds[0] ?? null));

  useEffect(() => {
    if (groupIds.length === 0) {
      if (selectedGroupId !== null) {
        setSelectedGroupId(null);
      }
      if (pendingSelectedGroupId !== null) {
        setPendingSelectedGroupId(null);
      }
      return;
    }

    if (pendingSelectedGroupId) {
      if (groupIdSet.has(pendingSelectedGroupId)) {
        if (selectedGroupId !== pendingSelectedGroupId) {
          setSelectedGroupId(pendingSelectedGroupId);
        }
        setPendingSelectedGroupId(null);
      }
      return;
    }

    const firstGroupId = groupIds[0] ?? null;
    if (selectedGroupId && groupIdSet.has(selectedGroupId)) {
      return;
    }
    if (selectedGroupId !== firstGroupId) {
      setSelectedGroupId(firstGroupId);
    }
  }, [groupIdSet, groupIds, pendingSelectedGroupId, selectedGroupId, setSelectedGroupId]);

  const selectedGroup = groups.find((group: any) => group.id === activeGroupId) ?? null;
  const occupiedFieldIds = useMemo(
    () => new Set(groups.flatMap((group: any) => Array.isArray(group?.columnIds) ? group.columnIds.map(String) : [])),
    [groups],
  );
  const unassignedFields = normalizedFields.filter((field) => !occupiedFieldIds.has(field.id));
  const previewGroups = useMemo(
    () => buildPreviewGroups(groups, fieldMap, columnCount, rowSpace),
    [columnCount, fieldMap, groups, rowSpace],
  );
  const previewSelectedGroup = previewGroups.find((group) => group.id === activeGroupId) ?? previewGroups[0] ?? null;
  const lastGroup = previewGroups[previewGroups.length - 1] ?? null;
  const canvasHeight = lastGroup ? lastGroup.y + lastGroup.height + 28 : 420;
  const selectedGroupFieldIds = Array.isArray(selectedGroup?.columnIds) ? selectedGroup.columnIds.map(String) : [];
  const selectedGroupFields = selectedGroupFieldIds
    .map((fieldId) => fieldMap.get(fieldId))
    .filter(Boolean) as NormalizedLayoutField[];
  const activeFieldId = selectedFieldId && selectedGroupFieldIds.includes(selectedFieldId)
    ? selectedFieldId
    : (selectedGroupFieldIds[0] ?? null);
  const selectedField = selectedGroupFields.find((field) => field.id === activeFieldId) ?? null;
  const previewSelectedField = previewSelectedGroup?.fields.find((field) => field.id === activeFieldId) ?? null;

  useEffect(() => {
    if (activeFieldId !== selectedFieldId) {
      setSelectedFieldId(activeFieldId);
    }
  }, [activeFieldId, selectedFieldId]);

  const selectGroup = (groupId: string | null) => {
    setPendingSelectedGroupId(null);
    setSelectedGroupId(groupId);
  };

  const getSelectedFieldHeight = (fieldId: string) => clampValue(
    Number(selectedGroup?.columnHeights?.[fieldId]) > 0
      ? Number(selectedGroup?.columnHeights?.[fieldId])
      : (fieldMap.get(fieldId)?.baseHeight ?? 68),
    FIELD_HEIGHT_MIN,
    FIELD_HEIGHT_MAX,
  );

  const handleUpdateFieldHeight = (fieldId: string, nextHeight: number) => {
    if (!selectedGroup) {
      return;
    }

    const normalizedHeight = clampValue(Math.round(nextHeight), FIELD_HEIGHT_MIN, FIELD_HEIGHT_MAX);

    onUpdateDetailBoard((current: any) => ({
      ...current,
      groups: (Array.isArray(current?.groups) ? current.groups : []).map((group: any) => {
        if (group.id !== selectedGroup.id) {
          return group;
        }

        return {
          ...group,
          columnHeights: {
            ...(group?.columnHeights ?? {}),
            [fieldId]: normalizedHeight,
          },
        };
      }),
    }));
  };

  useEffect(() => {
    if (!heightDragState || !selectedGroup) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const deltaY = event.clientY - heightDragState.startY;
      handleUpdateFieldHeight(heightDragState.fieldId, heightDragState.startHeight + deltaY);
    };

    const handlePointerUp = () => {
      setHeightDragState(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [heightDragState, selectedGroup]);

  const handlePresetSelect = (presetKey: LayoutPresetKey) => {
    const nextPreset = getPresetDefinition(presetKey);
    startTransition(() => {
      setSelectedPreset(nextPreset.key);
      setColumnCount(nextPreset.defaultColumnCount);
      setRowSpace(nextPreset.defaultRowSpace);
    });
  };

  const handleGenerateLayout = () => {
    startTransition(() => {
      onUpdateDetailBoard((current: any) => {
        const nextGroups = (Array.isArray(current?.groups) ? current.groups : []).map((group: any) => {
          const columnIds = Array.isArray(group?.columnIds) ? group.columnIds.map(String) : [];
          const nextRows = Math.max(1, Math.ceil(Math.max(columnIds.length, 1) / columnCount));

          return {
            ...group,
            columnRows: Object.fromEntries(columnIds.map((columnId, index) => [columnId, Math.floor(index / columnCount) + 1])),
            columnsPerRow: columnCount,
            rows: nextRows,
          };
        });

        return {
          ...current,
          enabled: true,
          groups: nextGroups,
          sortColumnId: current?.sortColumnId ?? normalizedFields[0]?.id ?? null,
        };
      });
    });
  };

  const handleResetLayout = () => {
    const nextPreset = getPresetDefinition('balanced');
    startTransition(() => {
      setSelectedPreset(nextPreset.key);
      setColumnCount(nextPreset.defaultColumnCount);
      setRowSpace(nextPreset.defaultRowSpace);
      setShowCoordinates(false);

      const suggestedGroups = createSuggestedDetailBoardGroups(availableColumns);
      setPendingSelectedGroupId(suggestedGroups[0]?.id ?? null);
      onUpdateDetailBoard((current: any) => ({
        ...current,
        enabled: true,
        groups: suggestedGroups,
        sortColumnId: availableColumns[0]?.id ?? current?.sortColumnId ?? null,
      }));
    });
  };

  const handleAddGroup = () => {
    const nextGroup = buildDetailBoardGroup(groups.length + 1, [], {
      name: `信息分组 ${groups.length + 1}`,
    });

    setPendingSelectedGroupId(nextGroup.id);
    onUpdateDetailBoard((current: any) => ({
      ...current,
      enabled: true,
      groups: [...(Array.isArray(current?.groups) ? current.groups : []), nextGroup],
      sortColumnId: current?.sortColumnId ?? normalizedFields[0]?.id ?? null,
    }));
  };

  const handleDeleteGroup = () => {
    if (!selectedGroup) {
      return;
    }

    const remainingGroups = groups.filter((group: any) => group.id !== selectedGroup.id);
    setPendingSelectedGroupId(null);
    onUpdateDetailBoard((current: any) => ({
      ...current,
      groups: remainingGroups,
    }));
    setSelectedGroupId(remainingGroups[0]?.id ?? null);
  };

  const handleRenameGroup = (name: string) => {
    if (!selectedGroup) {
      return;
    }

    onUpdateDetailBoard((current: any) => ({
      ...current,
      groups: (Array.isArray(current?.groups) ? current.groups : []).map((group: any) => (
        group.id === selectedGroup.id
          ? { ...group, name }
          : group
      )),
    }));
  };

  const handleAssignField = (fieldId: string) => {
    if (!selectedGroup) {
      return;
    }

    setSelectedFieldId(fieldId);
    onUpdateDetailBoard((current: any) => ({
      ...current,
      groups: (Array.isArray(current?.groups) ? current.groups : []).map((group: any) => {
        if (group.id !== selectedGroup.id) {
          return group;
        }

        const nextColumnIds = [...new Set([...(Array.isArray(group?.columnIds) ? group.columnIds.map(String) : []), fieldId])];
        return {
          ...group,
          columnIds: nextColumnIds,
          columnRows: {
            ...(group?.columnRows ?? {}),
            [fieldId]: Math.floor((nextColumnIds.length - 1) / Math.max(columnCount, 1)) + 1,
          },
          rows: Math.max(1, Math.ceil(nextColumnIds.length / Math.max(columnCount, 1))),
        };
      }),
    }));
  };

  const handleRemoveField = (fieldId: string) => {
    if (!selectedGroup) {
      return;
    }

    onUpdateDetailBoard((current: any) => ({
      ...current,
      groups: (Array.isArray(current?.groups) ? current.groups : []).map((group: any) => {
        if (group.id !== selectedGroup.id) {
          return group;
        }

        const nextColumnIds = (Array.isArray(group?.columnIds) ? group.columnIds.map(String) : []).filter((id: string) => id !== fieldId);
        return {
          ...group,
          columnIds: nextColumnIds,
          columnHeights: Object.fromEntries(
            Object.entries(group?.columnHeights ?? {}).filter(([key]) => key !== fieldId),
          ),
          columnRows: Object.fromEntries(
            nextColumnIds.map((columnId, index) => [columnId, Math.floor(index / Math.max(columnCount, 1)) + 1]),
          ),
          rows: Math.max(1, Math.ceil(Math.max(nextColumnIds.length, 1) / Math.max(columnCount, 1))),
        };
      }),
    }));
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
      <aside className="space-y-4">
        <section className="rounded-[28px] border border-white/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,249,252,0.92))] p-6 shadow-[0_24px_52px_-36px_rgba(15,23,42,0.28)]">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{title}</div>
              <h3 className="mt-2 text-[22px] font-black tracking-tight text-slate-950">布局配置</h3>
            </div>
            {onOpenPreview ? (
              <button
                type="button"
                onClick={onOpenPreview}
                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-[12px] font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900"
              >
                <span className="material-symbols-outlined text-[16px]">preview</span>
                预览
              </button>
            ) : null}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-500">
              {moduleCode ? `模块 ${moduleCode}` : title}
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-500">
              字段 {normalizedFields.length}
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-500">
              分组 {groups.length}
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-500">
              未分组 {unassignedFields.length}
            </span>
          </div>

          <div className="mt-6 space-y-4 border-t border-slate-200/80 pt-5">
            <div>
              <div className="text-[12px] font-semibold text-slate-900">布局预设</div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {LAYOUT_PRESET_OPTIONS.map((option) => {
                  const isActive = option.key === selectedPreset;

                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => handlePresetSelect(option.key)}
                      className={`rounded-[16px] border px-3 py-3 text-[12px] font-semibold transition-all ${
                        isActive
                          ? 'border-primary/20 bg-primary/10 text-primary'
                          : 'border-slate-200/80 bg-slate-50/70 text-slate-600 hover:border-slate-300 hover:bg-white'
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <div className="text-[12px] font-semibold text-slate-700">每行列数</div>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {[1, 2, 3].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setColumnCount(value)}
                      className={`rounded-[14px] border px-3 py-2 text-[12px] font-semibold transition-all ${
                        columnCount === value
                          ? 'border-primary/20 bg-primary/10 text-primary'
                          : 'border-slate-200/80 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {value} 列
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[12px] font-semibold text-slate-700">行间距</div>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {[
                    { label: '紧凑', value: 10 },
                    { label: '标准', value: 14 },
                    { label: '舒展', value: 18 },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setRowSpace(option.value)}
                      className={`rounded-[14px] border px-3 py-2 text-[12px] font-semibold transition-all ${
                        rowSpace === option.value
                          ? 'border-primary/20 bg-primary/10 text-primary'
                          : 'border-slate-200/80 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={handleGenerateLayout}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-primary px-4 text-[12px] font-semibold text-white transition-colors hover:bg-blue-700"
              >
                <span className="material-symbols-outlined text-[16px]">auto_fix_high</span>
                一键生成
              </button>
              <button
                type="button"
                onClick={handleResetLayout}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-[12px] font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900"
              >
                <span className="material-symbols-outlined text-[16px]">refresh</span>
                推荐布局
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-white/75 bg-white/92 p-5 shadow-[0_22px_46px_-36px_rgba(15,23,42,0.24)]">
          <div className="flex items-start justify-between gap-3">
            <div className="text-[12px] font-semibold text-slate-900">
              {selectedGroup ? `当前分组 · ${String(selectedGroup.name || '未命名分组')}` : '分组与字段'}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={handleAddGroup}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-700 transition-colors hover:border-slate-300"
              >
                <span className="material-symbols-outlined text-[14px]">add</span>
                新增分组
              </button>
              <button
                type="button"
                onClick={handleDeleteGroup}
                disabled={!selectedGroup}
                className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-full border px-3 text-[11px] font-semibold transition-colors ${
                  selectedGroup
                    ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                    : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">delete</span>
                删除当前
              </button>
            </div>
          </div>

          <div className="mt-5 space-y-5">
            <div>
              <div className="flex items-center justify-between gap-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">分组</div>
                {selectedGroup ? (
                  <div className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary">
                    {getDetailBoardGroupRows(selectedGroup)} 行
                  </div>
                ) : null}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {groups.length > 0 ? (
                  groups.map((group: any, index: number) => {
                    const isActive = group.id === activeGroupId;
                    const fieldCount = Array.isArray(group?.columnIds) ? group.columnIds.length : 0;

                    return (
                      <button
                        key={group.id}
                        type="button"
                        onClick={() => selectGroup(group.id)}
                        className={`rounded-[16px] border px-3 py-2 text-left transition-all ${
                          isActive
                            ? 'border-primary/20 bg-primary/10 text-primary shadow-[0_16px_28px_-24px_rgba(37,99,235,0.28)]'
                            : 'border-slate-200/80 bg-slate-50/70 text-slate-600 hover:border-slate-300 hover:bg-white'
                        }`}
                      >
                        <div className="text-[12px] font-semibold">{String(group?.name || `信息分组 ${index + 1}`)}</div>
                        <div className={`mt-1 text-[10px] ${isActive ? 'text-primary/80' : 'text-slate-400'}`}>{fieldCount} 项字段</div>
                      </button>
                    );
                  })
                ) : (
                  <div className="w-full rounded-[16px] border border-dashed border-slate-200 bg-slate-50/60 px-4 py-5 text-center text-[12px] text-slate-500">
                    还没有分组
                  </div>
                )}
              </div>
            </div>

            {selectedGroup ? (
              <>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">分组名称</div>
                  <input
                    value={String(selectedGroup.name || '')}
                    onChange={(event) => handleRenameGroup(event.target.value)}
                    className="mt-3 h-11 w-full rounded-[16px] border border-slate-200 bg-slate-50/70 px-4 text-[13px] font-semibold text-slate-900 outline-none transition-colors focus:border-primary/30 focus:bg-white"
                    placeholder="输入分组名称"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">已放入字段</div>
                    <div className="text-[11px] font-semibold text-slate-500">{selectedGroupFields.length} 项</div>
                  </div>

                  <div className="mt-3 space-y-2">
                    {selectedGroupFields.length > 0 ? (
                      selectedGroupFields.map((field) => (
                        <div
                          key={field.id}
                          className={`flex items-center justify-between rounded-[16px] border px-4 py-3 transition-all ${
                            activeFieldId === field.id
                              ? 'border-primary/20 bg-primary/10 shadow-[0_16px_28px_-24px_rgba(37,99,235,0.28)]'
                              : 'border-slate-200/80 bg-slate-50/70'
                          }`}
                          onClick={() => setSelectedFieldId(field.id)}
                        >
                          <div>
                            <div className="text-[13px] font-semibold text-slate-900">{field.label}</div>
                            <div className="mt-1 text-[11px] text-slate-500">{getSelectedFieldHeight(field.id)}px</div>
                          </div>
                          <div className="flex items-center gap-2">
                            {activeFieldId === field.id ? (
                              <span className="rounded-full border border-primary/20 bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-primary">
                                当前
                              </span>
                            ) : null}
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleRemoveField(field.id);
                              }}
                              className="inline-flex size-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 transition-colors hover:border-rose-200 hover:text-rose-600"
                            >
                              <span className="material-symbols-outlined text-[16px]">close</span>
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-[16px] border border-dashed border-slate-200 bg-slate-50/60 px-4 py-5 text-center text-[12px] text-slate-500">
                        这个分组还没有字段
                      </div>
                    )}
                  </div>
                </div>

                {selectedField ? (
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">控件高度</div>
                      <div className="text-[12px] font-semibold text-slate-700">{getSelectedFieldHeight(selectedField.id)}px</div>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {FIELD_HEIGHT_PRESETS.map((preset) => (
                        <button
                          key={preset.value}
                          type="button"
                          onClick={() => handleUpdateFieldHeight(selectedField.id, preset.value)}
                          className={`rounded-[14px] border px-3 py-2 text-[12px] font-semibold transition-all ${
                            getSelectedFieldHeight(selectedField.id) === preset.value
                              ? 'border-primary/20 bg-primary/10 text-primary'
                              : 'border-slate-200/80 bg-white text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>

                    <input
                      type="range"
                      min={FIELD_HEIGHT_MIN}
                      max={FIELD_HEIGHT_MAX}
                      step={2}
                      value={getSelectedFieldHeight(selectedField.id)}
                      onChange={(event) => handleUpdateFieldHeight(selectedField.id, Number(event.target.value))}
                      className="mt-4 h-2 w-full cursor-pointer accent-primary"
                    />
                  </div>
                ) : null}
              </>
            ) : null}

            <div>
              <div className="flex items-center justify-between gap-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {selectedGroup ? '待加入字段' : '未分组字段'}
                </div>
                <div className="text-[11px] font-semibold text-slate-500">{unassignedFields.length} 项</div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {unassignedFields.length > 0 ? (
                  unassignedFields.map((field) => (
                    <button
                      key={field.id}
                      type="button"
                      onClick={() => handleAssignField(field.id)}
                      disabled={!selectedGroup}
                      className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                        selectedGroup
                          ? 'border-slate-200 bg-slate-50 text-slate-600 hover:border-primary/20 hover:bg-primary/10 hover:text-primary'
                          : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                      }`}
                    >
                      {field.label}
                    </button>
                  ))
                ) : (
                  <div className="w-full rounded-[16px] border border-dashed border-slate-200 bg-slate-50/60 px-4 py-5 text-center text-[12px] text-slate-500">
                    所有字段都已经分组
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </aside>

      <section className="rounded-[30px] border border-white/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(244,248,252,0.9))] p-6 shadow-[0_28px_56px_-36px_rgba(15,23,42,0.3)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">布局预览</div>
            <h3 className="mt-2 text-[24px] font-black tracking-tight text-slate-950">
              {previewSelectedGroup?.name || '页面效果'}
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-[11px] font-semibold text-primary">
                {getPresetDefinition(selectedPreset).label}
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-500">
                {previewSelectedGroup ? `${previewSelectedGroup.fields.length} 项字段` : '还没有分组'}
              </span>
              {previewSelectedField ? (
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700">
                  当前控件 · {previewSelectedField.label}
                </span>
              ) : null}
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-500">
                每行 {columnCount} 列
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-500">
                间距 {rowSpace}px
              </span>
              {isPending ? (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-semibold text-amber-700">
                  更新中
                </span>
              ) : null}
            </div>
          </div>

          <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-[12px] font-semibold text-slate-600">
            <input
              type="checkbox"
              checked={showCoordinates}
              onChange={(event) => setShowCoordinates(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
            />
            显示坐标
          </label>
        </div>

        <div className="mt-6 overflow-x-auto rounded-[28px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.94),rgba(255,255,255,0.96))] p-4">
          <div
            className="cloudy-cloud-grid relative mx-auto rounded-[28px] border border-white/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(244,248,255,0.88))] shadow-[0_28px_64px_-48px_rgba(15,23,42,0.35)]"
            style={{ height: canvasHeight, minWidth: STAGE_WIDTH, width: STAGE_WIDTH }}
          >
            {previewGroups.map((group) => {
              const isActive = group.id === activeGroupId;

              return (
                <section
                  key={group.id}
                  className={`absolute overflow-hidden rounded-[24px] border bg-white/78 shadow-[0_18px_32px_-28px_rgba(15,23,42,0.18)] transition-all ${
                    isActive
                      ? 'border-primary/30 ring-2 ring-primary/20'
                      : 'border-slate-200/80'
                  }`}
                  onClick={() => selectGroup(group.id)}
                  style={{
                    height: group.height,
                    left: group.x,
                    top: group.y,
                    width: group.width,
                  }}
                >
                  <div className="flex cursor-pointer items-center justify-between border-b border-slate-200/70 px-5 py-4">
                    <div className="text-[15px] font-semibold text-slate-900">{group.name}</div>
                    <div className="flex items-center gap-2">
                      {isActive ? (
                        <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary">
                          当前
                        </span>
                      ) : null}
                      <span className="rounded-full border border-slate-200/80 bg-white/90 px-2.5 py-1 text-[10px] font-semibold text-slate-500">
                        {group.fields.length} 项
                      </span>
                    </div>
                  </div>

                  {group.fields.map((field) => (
                    <div
                      key={field.id}
                      className="absolute"
                      onClick={(event) => {
                        event.stopPropagation();
                        selectGroup(group.id);
                        setSelectedFieldId(field.id);
                      }}
                      style={{
                        height: field.height,
                        left: field.x,
                        top: field.y,
                        width: field.width,
                      }}
                    >
                      <div
                        className={`bill-designer-field relative h-full rounded-[18px] border bg-white/94 p-3 shadow-[0_14px_26px_-20px_rgba(15,23,42,0.16)] transition-all ${
                          activeFieldId === field.id && isActive
                            ? 'border-primary/35 ring-2 ring-primary/15'
                            : 'border-white/75'
                        }`}
                      >
                        <div className="text-[13px] font-semibold text-slate-900">{field.label}</div>
                        <div
                          className="mt-2"
                          style={{ height: Math.max(field.type === 'textarea' ? 50 : 34, field.height - 38) }}
                        >
                          {renderControlShell(field)}
                        </div>
                        {showCoordinates ? (
                          <div className="mt-2 text-[10px] font-medium text-slate-400">
                            {`${formatPixelValue(group.x + field.x)} / ${formatPixelValue(group.y + field.y)}`}
                          </div>
                        ) : null}
                        {activeFieldId === field.id && isActive ? (
                          <button
                            type="button"
                            onPointerDown={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              setSelectedFieldId(field.id);
                              setHeightDragState({
                                fieldId: field.id,
                                startHeight: field.height,
                                startY: event.clientY,
                              });
                            }}
                            className="absolute inset-x-5 bottom-2 flex h-4 cursor-row-resize items-center justify-center rounded-full bg-slate-950/6 text-[10px] font-semibold text-slate-500 transition-colors hover:bg-primary/10 hover:text-primary"
                          >
                            拖动调高度
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </section>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
