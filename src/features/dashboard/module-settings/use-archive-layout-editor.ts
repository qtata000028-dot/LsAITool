import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  buildDetailBoardGroup,
  DETAIL_BOARD_GROUP_MAX_ROWS,
  DETAIL_BOARD_GROUP_MIN_ROWS,
  getDetailBoardGroupColumnRow,
  getDetailBoardGroupRows,
  normalizeDetailBoardConfig,
} from './detail-board-config';

function clampArchiveLayoutRow(value: number, max: number) {
  return Math.min(max, Math.max(DETAIL_BOARD_GROUP_MIN_ROWS, value));
}

type UseArchiveLayoutEditorOptions = {
  currentDetailBoard: Record<string, any>;
  isOpen: boolean;
  mainTableColumns: Record<string, any>[];
  onClose: () => void;
  onUpdateDetailBoard: (patch: Record<string, any> | ((current: any) => any)) => void;
};

export function useArchiveLayoutEditor({
  currentDetailBoard,
  isOpen,
  mainTableColumns,
  onClose,
  onUpdateDetailBoard,
}: UseArchiveLayoutEditorOptions) {
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

  useEffect(() => {
    if (!isOpen) {
      setArchiveLayoutWorkbenchDrag(null);
      setArchiveLayoutWorkbenchDropTarget(null);
      return;
    }

    if (!currentDetailBoard.enabled) {
      onUpdateDetailBoard({
        ...currentDetailBoard,
        enabled: true,
      });
    }
  }, [currentDetailBoard, isOpen, onUpdateDetailBoard]);

  useEffect(() => {
    if (!isOpen) return;
    if (!currentDetailBoard.groups.some((group: any) => group.id === selectedArchiveLayoutGroupId)) {
      setSelectedArchiveLayoutGroupId(currentDetailBoard.groups[0]?.id ?? null);
    }
  }, [currentDetailBoard.groups, isOpen, selectedArchiveLayoutGroupId]);

  const highlightedGroupId = selectedArchiveLayoutGroupId ?? currentDetailBoard.groups[0]?.id ?? null;
  const highlightedGroup = useMemo(
    () => currentDetailBoard.groups.find((group: any) => group.id === highlightedGroupId) ?? null,
    [currentDetailBoard.groups, highlightedGroupId],
  );

  const assignedFieldCount = useMemo(
    () => currentDetailBoard.groups.reduce((sum: number, group: any) => sum + (group.columnIds?.length ?? 0), 0),
    [currentDetailBoard.groups],
  );
  const unassignedFieldCount = Math.max(0, mainTableColumns.length - assignedFieldCount);

  const updateArchiveLayoutGroup = useCallback((groupId: string, updater: Record<string, any> | ((group: any) => any)) => {
    onUpdateDetailBoard((current: any) => ({
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
  }, [onUpdateDetailBoard]);

  const addArchiveLayoutGroup = useCallback(() => {
    const nextGroup = buildDetailBoardGroup(currentDetailBoard.groups.length + 1);
    onUpdateDetailBoard({
      ...currentDetailBoard,
      enabled: true,
      groups: [...currentDetailBoard.groups, nextGroup],
    });
    setSelectedArchiveLayoutGroupId(nextGroup.id);
  }, [currentDetailBoard, onUpdateDetailBoard]);

  const removeArchiveLayoutGroup = useCallback((groupId: string) => {
    const nextGroups = currentDetailBoard.groups.filter((group: any) => group.id !== groupId);
    onUpdateDetailBoard({
      ...currentDetailBoard,
      enabled: nextGroups.length > 0,
      groups: nextGroups,
    });
    setSelectedArchiveLayoutGroupId(nextGroups[0]?.id ?? null);
  }, [currentDetailBoard, onUpdateDetailBoard]);

  const clearArchiveLayoutGroups = useCallback(() => {
    onUpdateDetailBoard({
      ...currentDetailBoard,
      groups: [],
    });
    setSelectedArchiveLayoutGroupId(null);
  }, [currentDetailBoard, onUpdateDetailBoard]);

  const assignArchiveLayoutColumn = useCallback((
    targetGroupId: string,
    columnId: string,
    rowNumber: number,
    beforeId: string | null = null,
  ) => {
    onUpdateDetailBoard((current: any) => {
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

      const nextRow = clampArchiveLayoutRow(rowNumber, getDetailBoardGroupRows(targetGroup));
      const remaining = targetGroup.columnIds.filter((id: string) => id !== columnId);
      let insertIndex = beforeId ? remaining.indexOf(beforeId) : -1;
      if (insertIndex === -1) {
        insertIndex = remaining.findIndex((id: string) => getDetailBoardGroupColumnRow(targetGroup, id) > nextRow);
        if (insertIndex === -1) {
          insertIndex = remaining.length;
        }
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
      if (Number.isFinite(preservedWidth) && preservedWidth > 0) {
        targetGroup.columnWidths = {
          ...targetGroup.columnWidths,
          [columnId]: preservedWidth,
        };
      }
      if (Number.isFinite(preservedHeight) && preservedHeight > 0) {
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
  }, [mainTableColumns, onUpdateDetailBoard]);

  const removeArchiveLayoutColumn = useCallback((groupId: string, columnId: string) => {
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
  }, [updateArchiveLayoutGroup]);

  const updateArchiveLayoutGroupRows = useCallback((groupId: string, nextValue: number) => {
    const nextRows = clampArchiveLayoutRow(
      Number(nextValue) || DETAIL_BOARD_GROUP_MIN_ROWS,
      DETAIL_BOARD_GROUP_MAX_ROWS,
    );
    updateArchiveLayoutGroup(groupId, (group: any) => ({
      ...group,
      rows: nextRows,
      columnRows: Object.fromEntries(
        (group.columnIds ?? []).map((columnId: string) => [
          columnId,
          clampArchiveLayoutRow(getDetailBoardGroupColumnRow(group, columnId), nextRows),
        ]),
      ),
    }));
  }, [updateArchiveLayoutGroup]);

  const focusGroup = useCallback((groupId: string) => {
    setSelectedArchiveLayoutGroupId((prev) => (prev === groupId ? prev : groupId));
  }, []);

  const clearWorkbenchState = useCallback(() => {
    setArchiveLayoutWorkbenchDrag(null);
    setArchiveLayoutWorkbenchDropTarget(null);
  }, []);

  const closeEditor = useCallback(() => {
    clearWorkbenchState();
    onClose();
  }, [clearWorkbenchState, onClose]);

  const startPaletteDrag = useCallback((columnId: string, assignedGroupId: string | null) => {
    setArchiveLayoutWorkbenchDrag({
      groupId: assignedGroupId,
      columnId,
    });
    setArchiveLayoutWorkbenchDropTarget(null);
  }, []);

  const startGroupFieldDrag = useCallback((groupId: string, columnId: string) => {
    focusGroup(groupId);
    setArchiveLayoutWorkbenchDrag({ groupId, columnId });
    setArchiveLayoutWorkbenchDropTarget(null);
  }, [focusGroup]);

  const handleRowDragOver = useCallback((groupId: string, rowNumber: number) => {
    if (!archiveLayoutWorkbenchDrag) return;
    focusGroup(groupId);
    setArchiveLayoutWorkbenchDropTarget((prev) => (
      prev?.groupId === groupId && prev.row === rowNumber && prev.beforeId === null
        ? prev
        : { groupId, row: rowNumber, beforeId: null }
    ));
  }, [archiveLayoutWorkbenchDrag, focusGroup]);

  const handleRowDrop = useCallback((groupId: string, rowNumber: number) => {
    if (!archiveLayoutWorkbenchDrag) return;
    assignArchiveLayoutColumn(groupId, archiveLayoutWorkbenchDrag.columnId, rowNumber);
    focusGroup(groupId);
    clearWorkbenchState();
  }, [archiveLayoutWorkbenchDrag, assignArchiveLayoutColumn, clearWorkbenchState, focusGroup]);

  const handleItemDragOver = useCallback((groupId: string, rowNumber: number, beforeId: string) => {
    if (!archiveLayoutWorkbenchDrag || archiveLayoutWorkbenchDrag.columnId === beforeId) return;
    focusGroup(groupId);
    setArchiveLayoutWorkbenchDropTarget((prev) => (
      prev?.groupId === groupId && prev.row === rowNumber && prev.beforeId === beforeId
        ? prev
        : { groupId, row: rowNumber, beforeId }
    ));
  }, [archiveLayoutWorkbenchDrag, focusGroup]);

  const handleItemDrop = useCallback((groupId: string, rowNumber: number, beforeId: string) => {
    if (!archiveLayoutWorkbenchDrag || archiveLayoutWorkbenchDrag.columnId === beforeId) return;
    assignArchiveLayoutColumn(groupId, archiveLayoutWorkbenchDrag.columnId, rowNumber, beforeId);
    focusGroup(groupId);
    clearWorkbenchState();
  }, [archiveLayoutWorkbenchDrag, assignArchiveLayoutColumn, clearWorkbenchState, focusGroup]);

  return {
    addArchiveLayoutGroup,
    archiveLayoutWorkbenchDrag,
    archiveLayoutWorkbenchDropTarget,
    assignedFieldCount,
    clearArchiveLayoutGroups,
    clearWorkbenchState,
    closeEditor,
    currentDetailBoard,
    focusGroup,
    handleItemDragOver,
    handleItemDrop,
    handleRowDragOver,
    handleRowDrop,
    highlightedGroup,
    highlightedGroupId,
    removeArchiveLayoutColumn,
    removeArchiveLayoutGroup,
    startGroupFieldDrag,
    startPaletteDrag,
    unassignedFieldCount,
    updateArchiveLayoutGroup,
    updateArchiveLayoutGroupRows,
  };
}
