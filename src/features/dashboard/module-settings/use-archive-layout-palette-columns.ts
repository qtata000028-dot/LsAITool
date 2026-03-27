import { useEffect, useMemo, useRef, useState } from 'react';

import {
  fetchSingleTableDesignerControls,
  fetchSingleTableDesignerGroups,
  fetchSingleTableDesignerLayout,
  type SingleTableDesignerControlDto,
  type SingleTableDesignerGroupDto,
  type SingleTableDesignerLayoutDto,
} from '../../../lib/backend-module-config';

type UseArchiveLayoutPaletteColumnsOptions = {
  currentModuleCode: string;
  isOpen: boolean;
  mainTableColumns: Record<string, any>[];
  onUpdateDetailBoard: (patch: Record<string, any> | ((current: any) => any)) => void;
  onShowToast: (message: string) => void;
};

type LayoutRect = {
  bottom: number;
  centerX: number;
  centerY: number;
  height: number;
  left: number;
  right: number;
  top: number;
  width: number;
};

type ColumnLookup = {
  byBackendId: Map<string, Record<string, any>>;
  byControlName: Map<string, Record<string, any>>;
  byFieldKey: Map<string, Record<string, any>>;
  byName: Map<string, Record<string, any>>;
  bySourceField: Map<string, Record<string, any>>;
};

type RecordIdentity = {
  backendId: unknown;
  controlName: string;
  displayName: string;
  fieldKey: string;
  fieldName: string;
};

type DesignerLayoutEntry = {
  columnId: string;
  height: number;
  orderId: number;
  raw: SingleTableDesignerLayoutDto;
  rect: LayoutRect;
  width: number;
};

type DesignerGroupMeta = {
  configuredColumnsPerRow: number;
  configuredRows: number;
  description: string;
  id: string;
  name: string;
  raw: SingleTableDesignerGroupDto;
  rect: LayoutRect | null;
};

const GROUP_COLUMNS_PER_ROW_KEYS = [
  'columnsPerRow',
  'columnCount',
  'columnNum',
  'columnnum',
  'colCount',
  'colcount',
];

const GROUP_ROW_COUNT_KEYS = [
  'rows',
  'rowCount',
  'rowcount',
  'rowNum',
  'rownum',
  'lineCount',
  'linecount',
];

const RECT_BOTTOM_KEYS = [
  'bottom',
  'Bottom',
  'controlBottom',
  'ControlBottom',
  'groupBottom',
  'GroupBottom',
];

const RECT_HEIGHT_KEYS = [
  'height',
  'Height',
  'controlHeight',
  'ControlHeight',
  'controlH',
  'ControlH',
  'groupHeight',
  'GroupHeight',
  'layoutHeight',
  'LayoutHeight',
  'locationHeight',
  'LocationHeight',
  'posHeight',
  'PosHeight',
  'boxHeight',
  'BoxHeight',
];

const RECT_LEFT_KEYS = [
  'left',
  'Left',
  'controlLeft',
  'ControlLeft',
  'groupLeft',
  'GroupLeft',
  'locationLeft',
  'LocationLeft',
  'locationX',
  'LocationX',
  'posLeft',
  'PosLeft',
  'posX',
  'PosX',
  'x',
  'X',
  'startX',
  'StartX',
  'boxLeft',
  'BoxLeft',
];

const RECT_RIGHT_KEYS = [
  'right',
  'Right',
  'controlRight',
  'ControlRight',
  'groupRight',
  'GroupRight',
  'locationRight',
  'LocationRight',
];

const RECT_TOP_KEYS = [
  'top',
  'Top',
  'controlTop',
  'ControlTop',
  'groupTop',
  'GroupTop',
  'locationTop',
  'LocationTop',
  'locationY',
  'LocationY',
  'posTop',
  'PosTop',
  'posY',
  'PosY',
  'y',
  'Y',
  'startY',
  'StartY',
  'boxTop',
  'BoxTop',
];

const RECT_WIDTH_KEYS = [
  'width',
  'Width',
  'controlWidth',
  'ControlWidth',
  'controlW',
  'ControlW',
  'groupWidth',
  'GroupWidth',
  'layoutWidth',
  'LayoutWidth',
  'locationWidth',
  'LocationWidth',
  'posWidth',
  'PosWidth',
  'boxWidth',
  'BoxWidth',
];

function normalizeLookupKey(value: unknown) {
  return String(value ?? '').trim().toLowerCase();
}

function normalizeRecordKey(value: unknown) {
  return normalizeLookupKey(value).replace(/[^a-z0-9]/g, '');
}

function getRecordFieldValue(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(record, key)) {
      return record[key];
    }
  }

  const normalizedRecordEntries = Object.entries(record).map(([key, value]) => [normalizeRecordKey(key), value] as const);
  for (const key of keys) {
    const normalizedKey = normalizeRecordKey(key);
    const matchedEntry = normalizedRecordEntries.find(([candidate]) => candidate === normalizedKey);
    if (matchedEntry) {
      return matchedEntry[1];
    }
  }

  return undefined;
}

function toRecordText(value: unknown) {
  if (value == null) return '';
  return String(value).trim();
}

function toRecordNumber(value: unknown, fallback: number) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function clampGroupRows(value: number) {
  return Math.min(6, Math.max(1, value));
}

function getDashboardErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Failed to load archive layout data.';
}

function buildBaseColumnLookup(columns: Record<string, any>[]): ColumnLookup {
  const byBackendId = new Map<string, Record<string, any>>();
  const byControlName = new Map<string, Record<string, any>>();
  const byFieldKey = new Map<string, Record<string, any>>();
  const byName = new Map<string, Record<string, any>>();
  const bySourceField = new Map<string, Record<string, any>>();

  columns.forEach((column) => {
    const backendIdKey = normalizeLookupKey(column.backendId);
    const controlNameKey = normalizeLookupKey(column.controlName);
    const fieldKey = normalizeLookupKey(column.fieldKey || column.backendFieldKey);
    const sourceFieldKey = normalizeLookupKey(column.sourceField || column.fieldName);
    const nameKey = normalizeLookupKey(column.name);

    if (backendIdKey) {
      byBackendId.set(backendIdKey, column);
    }
    if (controlNameKey) {
      byControlName.set(controlNameKey, column);
    }
    if (fieldKey) {
      byFieldKey.set(fieldKey, column);
    }
    if (sourceFieldKey) {
      bySourceField.set(sourceFieldKey, column);
    }
    if (nameKey) {
      byName.set(nameKey, column);
    }
  });

  return { byBackendId, byControlName, byFieldKey, byName, bySourceField };
}

function resolveRecordIdentity(record: Record<string, unknown>): RecordIdentity {
  return {
    backendId: getRecordFieldValue(record, 'fieldid', 'fieldId', 'controlid', 'controlId'),
    controlName: toRecordText(getRecordFieldValue(record, 'controlname', 'controlName')),
    displayName: toRecordText(getRecordFieldValue(record, 'username', 'userName', 'displayName', 'name', 'caption', 'title')),
    fieldKey: toRecordText(getRecordFieldValue(record, 'fieldkey', 'fieldKey')),
    fieldName: toRecordText(getRecordFieldValue(record, 'fieldname', 'fieldName', 'sqlfield', 'sqlField')),
  };
}

function findMatchedColumn(identity: RecordIdentity, lookup: ColumnLookup) {
  const backendIdKey = normalizeLookupKey(identity.backendId);
  const controlNameKey = normalizeLookupKey(identity.controlName);
  const displayNameKey = normalizeLookupKey(identity.displayName);
  const fieldKey = normalizeLookupKey(identity.fieldKey);
  const fieldNameKey = normalizeLookupKey(identity.fieldName);

  return lookup.byBackendId.get(backendIdKey)
    ?? lookup.byControlName.get(controlNameKey)
    ?? lookup.bySourceField.get(fieldNameKey)
    ?? lookup.byFieldKey.get(fieldKey)
    ?? lookup.byName.get(displayNameKey)
    ?? null;
}

function resolveLayoutRect(
  record: Record<string, unknown>,
  fallbackWidth: number = Number.NaN,
  fallbackHeight: number = Number.NaN,
): LayoutRect | null {
  const left = toRecordNumber(getRecordFieldValue(record, ...RECT_LEFT_KEYS), Number.NaN);
  const top = toRecordNumber(getRecordFieldValue(record, ...RECT_TOP_KEYS), Number.NaN);
  const right = toRecordNumber(getRecordFieldValue(record, ...RECT_RIGHT_KEYS), Number.NaN);
  const bottom = toRecordNumber(getRecordFieldValue(record, ...RECT_BOTTOM_KEYS), Number.NaN);

  let width = toRecordNumber(getRecordFieldValue(record, ...RECT_WIDTH_KEYS), fallbackWidth);
  let height = toRecordNumber(getRecordFieldValue(record, ...RECT_HEIGHT_KEYS), fallbackHeight);

  if ((!Number.isFinite(width) || width <= 0) && Number.isFinite(left) && Number.isFinite(right)) {
    width = right - left;
  }
  if ((!Number.isFinite(height) || height <= 0) && Number.isFinite(top) && Number.isFinite(bottom)) {
    height = bottom - top;
  }

  if (!Number.isFinite(left) || !Number.isFinite(top) || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }

  return {
    bottom: top + height,
    centerX: left + width / 2,
    centerY: top + height / 2,
    height,
    left,
    right: left + width,
    top,
    width,
  };
}

function getRectArea(rect: LayoutRect) {
  return rect.width * rect.height;
}

function isPointInsideRect(rect: LayoutRect, x: number, y: number) {
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

function getRectOverlapArea(left: LayoutRect, right: LayoutRect) {
  const overlapWidth = Math.max(0, Math.min(left.right, right.right) - Math.max(left.left, right.left));
  const overlapHeight = Math.max(0, Math.min(left.bottom, right.bottom) - Math.max(left.top, right.top));
  return overlapWidth * overlapHeight;
}

function mapDesignerControlToColumn(
  control: SingleTableDesignerControlDto,
  index: number,
  lookup: ColumnLookup,
) {
  const identity = resolveRecordIdentity(control);
  const matchedColumn = findMatchedColumn(identity, lookup);

  const width = toRecordNumber(
    getRecordFieldValue(control, 'controlWidth', 'width'),
    Number(matchedColumn?.width) > 0 ? Number(matchedColumn.width) : 120,
  );
  const height = toRecordNumber(
    getRecordFieldValue(control, 'controlHeight', 'height'),
    Number(matchedColumn?.layoutHeight) > 0 ? Number(matchedColumn.layoutHeight) : 21,
  );

  return {
    ...(matchedColumn ?? {}),
    ...control,
    id: matchedColumn?.id ?? (normalizeLookupKey(identity.backendId) ? `field_${normalizeLookupKey(identity.backendId)}` : `designer_control_${index + 1}`),
    backendId: identity.backendId ?? matchedColumn?.backendId ?? null,
    controlHeight: height,
    controlName: identity.controlName || matchedColumn?.controlName || '',
    controlWidth: width,
    defaultValue: toRecordText(getRecordFieldValue(control, 'defaultValue', 'defaultvalue')) || matchedColumn?.defaultValue || '',
    fieldKey: identity.fieldKey || matchedColumn?.fieldKey || matchedColumn?.backendFieldKey || '',
    fieldName: identity.fieldName || matchedColumn?.fieldName || '',
    groupName: toRecordText(getRecordFieldValue(control, 'groupname', 'groupName')) || matchedColumn?.groupName || '',
    layoutHeight: height,
    name: identity.displayName || matchedColumn?.name || identity.fieldName || `Field ${index + 1}`,
    orderId: toRecordNumber(getRecordFieldValue(control, 'orderid', 'orderId', 'tabOrder'), index + 1),
    sourceField: identity.fieldName || matchedColumn?.sourceField || '',
    type: matchedColumn?.type || 'text',
    width,
  };
}

function mapDesignerGroup(group: SingleTableDesignerGroupDto, groupIndex: number): DesignerGroupMeta {
  const rect = resolveLayoutRect(group);

  return {
    configuredColumnsPerRow: Math.max(
      1,
      toRecordNumber(getRecordFieldValue(group, ...GROUP_COLUMNS_PER_ROW_KEYS), 2),
    ),
    configuredRows: clampGroupRows(
      toRecordNumber(getRecordFieldValue(group, ...GROUP_ROW_COUNT_KEYS), 1),
    ),
    description: toRecordText(getRecordFieldValue(group, 'description', 'remark', 'memo')),
    id: toRecordText(getRecordFieldValue(group, 'id', 'groupid', 'groupId')) || `designer_group_${groupIndex + 1}`,
    name: toRecordText(getRecordFieldValue(group, 'groupname', 'groupName', 'name', 'caption', 'title')) || `Group ${groupIndex + 1}`,
    raw: group,
    rect,
  };
}

function mapDesignerLayoutToEntry(
  layoutRow: SingleTableDesignerLayoutDto,
  index: number,
  lookup: ColumnLookup,
): DesignerLayoutEntry | null {
  const identity = resolveRecordIdentity(layoutRow);
  const matchedColumn = findMatchedColumn(identity, lookup);
  if (!matchedColumn?.id) {
    return null;
  }

  const widthFallback = Number(matchedColumn.controlWidth || matchedColumn.width) > 0
    ? Number(matchedColumn.controlWidth || matchedColumn.width)
    : 120;
  const heightFallback = Number(matchedColumn.controlHeight || matchedColumn.layoutHeight) > 0
    ? Number(matchedColumn.controlHeight || matchedColumn.layoutHeight)
    : 21;
  const rect = resolveLayoutRect(layoutRow, widthFallback, heightFallback);
  if (!rect) {
    return null;
  }

  return {
    columnId: String(matchedColumn.id),
    height: rect.height,
    orderId: toRecordNumber(getRecordFieldValue(layoutRow, 'orderid', 'orderId', 'tabOrder', 'zindex', 'zIndex'), index + 1),
    raw: layoutRow,
    rect,
    width: rect.width,
  };
}

function chooseTargetGroup(entry: DesignerLayoutEntry, groups: DesignerGroupMeta[]) {
  const groupsWithRect = groups.filter((group) => group.rect);

  const topLeftMatches = groupsWithRect.filter((group) => (
    group.rect && isPointInsideRect(group.rect, entry.rect.left + 1, entry.rect.top + 1)
  ));
  if (topLeftMatches.length > 0) {
    return [...topLeftMatches].sort((left, right) => getRectArea(left.rect!) - getRectArea(right.rect!))[0] ?? null;
  }

  const centerMatches = groupsWithRect.filter((group) => (
    group.rect && isPointInsideRect(group.rect, entry.rect.centerX, entry.rect.centerY)
  ));
  if (centerMatches.length > 0) {
    return [...centerMatches].sort((left, right) => getRectArea(left.rect!) - getRectArea(right.rect!))[0] ?? null;
  }

  const overlappingGroups = groupsWithRect
    .map((group) => ({ group, overlapArea: group.rect ? getRectOverlapArea(group.rect, entry.rect) : 0 }))
    .filter((candidate) => candidate.overlapArea > 0)
    .sort((left, right) => right.overlapArea - left.overlapArea);

  return overlappingGroups[0]?.group ?? null;
}

function buildGroupRowAssignments(entries: DesignerLayoutEntry[]) {
  const deduplicatedEntries = [...entries]
    .sort((left, right) => (
      left.rect.top - right.rect.top
      || left.rect.left - right.rect.left
      || left.orderId - right.orderId
    ))
    .filter((entry, index, sortedEntries) => (
      sortedEntries.findIndex((candidate) => candidate.columnId === entry.columnId) === index
    ));

  const rows: DesignerLayoutEntry[][] = [];
  let currentRowBaselineTop: number | null = null;
  let currentRowBaselineHeight: number | null = null;

  deduplicatedEntries.forEach((entry) => {
    if (rows.length === 0 || currentRowBaselineTop == null || currentRowBaselineHeight == null) {
      rows.push([entry]);
      currentRowBaselineTop = entry.rect.top;
      currentRowBaselineHeight = entry.rect.height;
      return;
    }

    const rowTolerance = Math.max(12, Math.min(currentRowBaselineHeight, entry.rect.height) * 0.5);
    if (Math.abs(entry.rect.top - currentRowBaselineTop) <= rowTolerance) {
      rows[rows.length - 1].push(entry);
      currentRowBaselineTop = Math.min(currentRowBaselineTop, entry.rect.top);
      currentRowBaselineHeight = Math.max(currentRowBaselineHeight, entry.rect.height);
      return;
    }

    rows.push([entry]);
    currentRowBaselineTop = entry.rect.top;
    currentRowBaselineHeight = entry.rect.height;
  });

  rows.forEach((rowEntries) => {
    rowEntries.sort((left, right) => (
      left.rect.left - right.rect.left
      || left.orderId - right.orderId
    ));
  });

  const columnHeights: Record<string, number> = {};
  const columnIds: string[] = [];
  const columnRows: Record<string, number> = {};
  const columnWidths: Record<string, number> = {};

  rows.forEach((rowEntries, rowIndex) => {
    rowEntries.forEach((entry) => {
      columnIds.push(entry.columnId);
      columnRows[entry.columnId] = rowIndex + 1;
      if (entry.width > 0) {
        columnWidths[entry.columnId] = entry.width;
      }
      if (entry.height > 0) {
        columnHeights[entry.columnId] = entry.height;
      }
    });
  });

  return {
    columnHeights,
    columnIds,
    columnRows,
    columnWidths,
    columnsPerRow: Math.max(1, ...rows.map((rowEntries) => rowEntries.length)),
    rows: rows.length,
  };
}

function buildDesignerGroupBoardConfig(
  groupRows: SingleTableDesignerGroupDto[],
  layoutRows: SingleTableDesignerLayoutDto[],
  columns: Record<string, any>[],
) {
  const columnLookup = buildBaseColumnLookup(columns);
  const groups = groupRows.map((group, index) => mapDesignerGroup(group, index));

  const mappedLayoutEntries = layoutRows
    .map((row, index) => mapDesignerLayoutToEntry(row, index, columnLookup))
    .filter(Boolean) as DesignerLayoutEntry[];

  const groupedEntries = new Map<string, DesignerLayoutEntry[]>();
  mappedLayoutEntries.forEach((entry) => {
    const targetGroup = chooseTargetGroup(entry, groups);
    if (!targetGroup) {
      return;
    }
    const existingEntries = groupedEntries.get(targetGroup.id) ?? [];
    existingEntries.push(entry);
    groupedEntries.set(targetGroup.id, existingEntries);
  });

  const normalizedGroups = groups.map((group) => {
    const layoutAssignment = buildGroupRowAssignments(groupedEntries.get(group.id) ?? []);
    const effectiveRows = clampGroupRows(
      Math.max(group.configuredRows, layoutAssignment.rows || 1),
    );

    return {
      columnHeights: layoutAssignment.columnHeights,
      columnIds: layoutAssignment.columnIds,
      columnRows: layoutAssignment.columnRows,
      columnWidths: layoutAssignment.columnWidths,
      columnsPerRow: Math.max(group.configuredColumnsPerRow, layoutAssignment.columnsPerRow || 1),
      description: group.description,
      id: group.id,
      layoutRect: group.rect,
      name: group.name,
      rows: effectiveRows,
    };
  });

  return {
    enabled: true,
    groups: normalizedGroups,
    sortColumnId: columns[0]?.id ?? null,
  };
}

export function useArchiveLayoutPaletteColumns({
  currentModuleCode,
  isOpen,
  mainTableColumns,
  onUpdateDetailBoard,
  onShowToast,
}: UseArchiveLayoutPaletteColumnsOptions) {
  const [designerColumns, setDesignerColumns] = useState<Record<string, any>[] | null>(null);
  const loadTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      loadTokenRef.current = null;
      setDesignerColumns(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const moduleCode = currentModuleCode.trim();
    if (!moduleCode) {
      setDesignerColumns(null);
      return;
    }

    let isActive = true;

    const loadDesignerColumns = async () => {
      try {
        const loadToken = `${moduleCode}:${Date.now()}`;
        loadTokenRef.current = loadToken;

        const [controlRows, groupRows, layoutRows] = await Promise.all([
          fetchSingleTableDesignerControls(moduleCode),
          fetchSingleTableDesignerGroups(moduleCode),
          fetchSingleTableDesignerLayout(moduleCode),
        ]);
        if (!isActive) {
          return;
        }

        const lookup = buildBaseColumnLookup(mainTableColumns);
        const mappedColumns = [...controlRows]
          .sort(
            (left, right) => (
              toRecordNumber(getRecordFieldValue(left, 'orderid', 'orderId', 'tabOrder'), 0)
              - toRecordNumber(getRecordFieldValue(right, 'orderid', 'orderId', 'tabOrder'), 0)
            ),
          )
          .map((row, index) => mapDesignerControlToColumn(row, index, lookup));

        setDesignerColumns(mappedColumns);
        if (loadTokenRef.current !== loadToken) {
          return;
        }

        const designerBoardConfig = buildDesignerGroupBoardConfig(groupRows, layoutRows, mappedColumns);
        onUpdateDetailBoard((current: any) => ({
          ...current,
          enabled: true,
          groups: designerBoardConfig.groups,
          sortColumnId: designerBoardConfig.sortColumnId ?? current.sortColumnId ?? null,
        }));
      } catch (error) {
        if (!isActive) {
          return;
        }

        setDesignerColumns(null);
        onShowToast(getDashboardErrorMessage(error));
      }
    };

    void loadDesignerColumns();

    return () => {
      isActive = false;
    };
  }, [currentModuleCode, isOpen, mainTableColumns, onShowToast, onUpdateDetailBoard]);

  return useMemo(
    () => (designerColumns && designerColumns.length > 0 ? designerColumns : mainTableColumns),
    [designerColumns, mainTableColumns],
  );
}
