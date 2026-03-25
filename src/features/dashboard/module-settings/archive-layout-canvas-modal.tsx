import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  shadcnFieldClass,
  shadcnMutedLabelClass,
  shadcnSectionCardClass,
  shadcnSectionTitleClass,
} from '../../../components/ui/shadcn-inspector';
import { ArchiveLayoutFieldShell } from './archive-layout-field-shell';
import {
  DETAIL_BOARD_GROUP_MIN_ROWS,
  getDetailBoardGroupColumnRow,
  getDetailBoardGroupRows,
} from './detail-board-config';
import type { LayoutFieldWorkbenchMeta, LayoutFieldWorkbenchMetaResolver } from './layout-field-workbench-meta';

const ARCHIVE_LAYOUT_LANE_GAP = 8;

type ArchiveLayoutResizeState = {
  columnId: string;
  groupId: string;
  label: string;
  maxWidth: number;
  minWidth: number;
  snapCandidates: number[];
  width: number;
} | null;

type ArchiveLayoutCanvasModalProps = {
  activeDetailBoardResize: ArchiveLayoutResizeState;
  archiveLayoutConfig: Record<string, any>;
  archiveLayoutWorkbenchDrag: {
    groupId: string | null;
    columnId: string;
  } | null;
  archiveLayoutWorkbenchDropTarget: {
    beforeId: string | null;
    groupId: string;
    row: number;
  } | null;
  assignedFieldCount: number;
  getDetailBoardFieldLiveHeight: (groupId: string, columnId: string, fallbackHeight: number) => number;
  getDetailBoardFieldLiveWidth: (groupId: string, columnId: string, fallbackWidth: number) => number;
  getLayoutFieldWorkbenchMeta: LayoutFieldWorkbenchMetaResolver;
  highlightedGroup: Record<string, any> | null;
  highlightedGroupId: string | null;
  isOpen: boolean;
  mainTableColumns: Record<string, any>[];
  onAddArchiveLayoutGroup: () => void;
  onClearArchiveLayoutGroups: () => void;
  onClose: () => void;
  onEndArchiveLayoutDrag: () => void;
  onFocusArchiveLayoutGroup: (groupId: string) => void;
  onHandleArchiveLayoutItemDragOver: (groupId: string, rowNumber: number, beforeId: string) => void;
  onHandleArchiveLayoutItemDrop: (groupId: string, rowNumber: number, beforeId: string) => void;
  onHandleArchiveLayoutRowDragOver: (groupId: string, rowNumber: number) => void;
  onHandleArchiveLayoutRowDrop: (groupId: string, rowNumber: number) => void;
  onRemoveArchiveLayoutColumn: (groupId: string, columnId: string) => void;
  onRemoveArchiveLayoutGroup: (groupId: string) => void;
  onStartArchiveLayoutFieldDrag: (groupId: string, columnId: string) => void;
  onStartArchiveLayoutPaletteDrag: (columnId: string, assignedGroupId: string | null) => void;
  onStartDetailBoardFieldHeightResize: (
    event: React.MouseEvent<any>,
    groupId: string,
    columnId: string,
    label: string,
    minHeightOverride?: number,
  ) => void;
  onStartDetailBoardFieldResize: (
    event: React.MouseEvent<any>,
    groupId: string,
    columnId: string,
    label: string,
    minWidthOverride?: number,
  ) => void;
  onUpdateArchiveLayoutGroupName: (groupId: string, name: string) => void;
  onUpdateArchiveLayoutGroupRows: (groupId: string, nextValue: number) => void;
  onResetDetailBoardFieldHeight: (event: React.MouseEvent<any>, groupId: string, columnId: string) => void;
  onResetDetailBoardFieldWidth: (event: React.MouseEvent<any>, groupId: string, columnId: string) => void;
  renderFieldPreview: (column: Record<string, any>, index: number, scope: string) => React.ReactNode;
  unassignedFieldCount: number;
};

type ArchiveLayoutRowItem = {
  id: string;
  field: Record<string, any>;
  liveHeight: number;
  liveMeta: LayoutFieldWorkbenchMeta;
  liveWidth: number;
};

function getRowBoundaryPositions(rowItems: ArchiveLayoutRowItem[]) {
  let cursor = 0;
  return rowItems.map((item) => {
    cursor += item.liveWidth;
    const boundary = cursor;
    cursor += ARCHIVE_LAYOUT_LANE_GAP;
    return boundary;
  });
}

function getRowActiveBoundaryPosition(rowItems: ArchiveLayoutRowItem[], columnId?: string | null) {
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
}

export const ArchiveLayoutCanvasModal = React.memo(function ArchiveLayoutCanvasModal({
  activeDetailBoardResize,
  archiveLayoutConfig,
  archiveLayoutWorkbenchDrag,
  archiveLayoutWorkbenchDropTarget,
  assignedFieldCount,
  getDetailBoardFieldLiveHeight,
  getDetailBoardFieldLiveWidth,
  getLayoutFieldWorkbenchMeta,
  highlightedGroup,
  highlightedGroupId,
  isOpen,
  mainTableColumns,
  onAddArchiveLayoutGroup,
  onClearArchiveLayoutGroups,
  onClose,
  onEndArchiveLayoutDrag,
  onFocusArchiveLayoutGroup,
  onHandleArchiveLayoutItemDragOver,
  onHandleArchiveLayoutItemDrop,
  onHandleArchiveLayoutRowDragOver,
  onHandleArchiveLayoutRowDrop,
  onRemoveArchiveLayoutColumn,
  onRemoveArchiveLayoutGroup,
  onStartArchiveLayoutFieldDrag,
  onStartArchiveLayoutPaletteDrag,
  onStartDetailBoardFieldHeightResize,
  onStartDetailBoardFieldResize,
  onUpdateArchiveLayoutGroupName,
  onUpdateArchiveLayoutGroupRows,
  onResetDetailBoardFieldHeight,
  onResetDetailBoardFieldWidth,
  renderFieldPreview,
  unassignedFieldCount,
}: ArchiveLayoutCanvasModalProps) {
  const columnById = React.useMemo(
    () => new Map(mainTableColumns.map((column) => [column.id, column])),
    [mainTableColumns],
  );
  const groupById = React.useMemo(
    () => new Map(archiveLayoutConfig.groups.map((group: any) => [group.id, group])),
    [archiveLayoutConfig.groups],
  );
  const assignmentMap = React.useMemo(() => {
    const nextMap = new Map<string, string>();
    archiveLayoutConfig.groups.forEach((group: any) => {
      (group.columnIds ?? []).forEach((columnId: string) => {
        nextMap.set(columnId, group.id);
      });
    });
    return nextMap;
  }, [archiveLayoutConfig.groups]);

  const getGroupRowItems = React.useCallback((group: any, rowNumber: number): ArchiveLayoutRowItem[] => (
    (group.columnIds ?? [])
      .filter((columnId: string) => getDetailBoardGroupColumnRow(group, columnId) === rowNumber)
      .map((columnId: string) => {
        const column = columnById.get(columnId);
        if (!column) return null;
        const layoutMeta = getLayoutFieldWorkbenchMeta(column, group.columnWidths?.[columnId], group.columnHeights?.[columnId]);
        const liveWidth = getDetailBoardFieldLiveWidth(group.id, columnId, layoutMeta.width);
        const liveHeight = getDetailBoardFieldLiveHeight(group.id, columnId, layoutMeta.height);
        const liveMeta = getLayoutFieldWorkbenchMeta(column, liveWidth, liveHeight);
        return {
          id: columnId,
          field: column,
          liveHeight,
          liveMeta,
          liveWidth,
        };
      })
      .filter(Boolean) as ArchiveLayoutRowItem[]
  ), [columnById, getDetailBoardFieldLiveHeight, getDetailBoardFieldLiveWidth, getLayoutFieldWorkbenchMeta]);

  if (!isOpen) return null;

  const renderGroupCanvas = (group: any) => {
    const rowCount = getDetailBoardGroupRows(group);
    const rowNumbers = Array.from({ length: rowCount }, (_, index) => index + 1);
    const isHighlighted = highlightedGroupId === group.id;

    return (
      <section
        key={group.id}
        onMouseDown={() => onFocusArchiveLayoutGroup(group.id)}
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
              onChange={(event) => onUpdateArchiveLayoutGroupName(group.id, event.target.value)}
              className={shadcnFieldClass}
            />
          </div>
          <div className="w-24">
            <label className={shadcnMutedLabelClass}>控件行数</label>
            <input
              type="number"
              min={DETAIL_BOARD_GROUP_MIN_ROWS}
              value={rowCount}
              onChange={(event) => onUpdateArchiveLayoutGroupRows(group.id, Number(event.target.value))}
              className={shadcnFieldClass}
            />
          </div>
          <div className="inline-flex h-10 min-w-[88px] items-center rounded-md border border-slate-200/80 bg-white px-3 text-[11px] font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
            {group.columnIds?.length ?? 0} 项
          </div>
          <button
            type="button"
            onClick={() => onRemoveArchiveLayoutGroup(group.id)}
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
              && rowItems.some((item) => item.id === activeDetailBoardResize.columnId);
            const previousRowGuidePositions = isActiveResizeRow ? getRowBoundaryPositions(previousRowItems) : [];
            const activeResizeBoundary = isActiveResizeRow
              ? getRowActiveBoundaryPosition(rowItems, activeDetailBoardResize?.columnId ?? null)
              : null;

            return (
              <div key={`${group.id}-row-${rowNumber}`}>
                <div
                  onDragOver={(event) => {
                    if (!archiveLayoutWorkbenchDrag) return;
                    event.preventDefault();
                    event.stopPropagation();
                    onHandleArchiveLayoutRowDragOver(group.id, rowNumber);
                    if (event.dataTransfer) {
                      event.dataTransfer.dropEffect = 'move';
                    }
                  }}
                  onDrop={(event) => {
                    if (!archiveLayoutWorkbenchDrag) return;
                    event.preventDefault();
                    event.stopPropagation();
                    onHandleArchiveLayoutRowDrop(group.id, rowNumber);
                  }}
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
                    {rowItems.length > 0 ? rowItems.map((item, columnIndex) => {
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
                          onDragStart={(event) => {
                            onStartArchiveLayoutFieldDrag(group.id, column.id);
                            if (event.dataTransfer) {
                              event.dataTransfer.effectAllowed = 'move';
                              event.dataTransfer.setData('text/plain', `${group.id}:${column.id}`);
                            }
                          }}
                          onDragEnd={onEndArchiveLayoutDrag}
                          onDragOver={(event) => {
                            if (!archiveLayoutWorkbenchDrag || archiveLayoutWorkbenchDrag.columnId === column.id) return;
                            event.preventDefault();
                            event.stopPropagation();
                            onHandleArchiveLayoutItemDragOver(group.id, rowNumber, column.id);
                            if (event.dataTransfer) {
                              event.dataTransfer.dropEffect = 'move';
                            }
                          }}
                          onDrop={(event) => {
                            if (!archiveLayoutWorkbenchDrag || archiveLayoutWorkbenchDrag.columnId === column.id) return;
                            event.preventDefault();
                            event.stopPropagation();
                            onHandleArchiveLayoutItemDrop(group.id, rowNumber, column.id);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === 'Delete' || event.key === 'Backspace') {
                              event.preventDefault();
                              onRemoveArchiveLayoutColumn(group.id, column.id);
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
                            <ArchiveLayoutFieldShell
                              getLayoutFieldWorkbenchMeta={getLayoutFieldWorkbenchMeta}
                              height={liveHeight}
                              rawField={liveMeta.field}
                              renderFieldPreview={renderFieldPreview}
                              rowIndex={columnIndex}
                              width={liveWidth}
                            />
                          </div>
                          <div
                            className="absolute bottom-1 right-[-2px] top-1 flex w-3 cursor-col-resize items-center justify-center opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
                            onMouseDown={(event) => onStartDetailBoardFieldResize(event, group.id, column.id, liveMeta.field.name, liveMeta.minWidth)}
                            onDoubleClick={(event) => onResetDetailBoardFieldWidth(event, group.id, column.id)}
                            title="拖动调整宽度，双击恢复自动排布"
                          >
                            <span className="h-7 w-px rounded-full bg-slate-300 transition-colors group-hover:bg-[color:var(--workspace-accent)] dark:bg-slate-600" />
                          </div>
                          {liveMeta.isTallControl ? (
                            <button
                              type="button"
                              onMouseDown={(event) => onStartDetailBoardFieldHeightResize(event, group.id, column.id, liveMeta.field.name, liveMeta.minHeight)}
                              onDoubleClick={(event) => onResetDetailBoardFieldHeight(event, group.id, column.id)}
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
        onClick={onClose}
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
                  onClick={onAddArchiveLayoutGroup}
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-[color:var(--workspace-accent)] px-3 text-[12px] font-semibold text-white transition-colors hover:bg-[color:var(--workspace-accent-strong)]"
                >
                  <span className="material-symbols-outlined text-[15px]">add</span>
                  新增分组
                </button>
                <button
                  type="button"
                  onClick={onClearArchiveLayoutGroups}
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-600 transition-colors hover:border-rose-200 hover:text-rose-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
                >
                  <span className="material-symbols-outlined text-[15px]">layers_clear</span>
                  清空
                </button>
                <button
                  type="button"
                  onClick={onClose}
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
                        onClick={onAddArchiveLayoutGroup}
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
                    const assignedGroup = assignedGroupId ? groupById.get(assignedGroupId) ?? null : null;
                    const isInHighlightedGroup = assignedGroupId === highlightedGroupId;

                    return (
                      <button
                        key={`archive-layout-palette-${column.id}`}
                        type="button"
                        draggable
                        onDragStart={(event) => {
                          onStartArchiveLayoutPaletteDrag(column.id, assignedGroupId);
                          if (event.dataTransfer) {
                            event.dataTransfer.effectAllowed = 'move';
                            event.dataTransfer.setData('text/plain', column.id);
                          }
                        }}
                        onDragEnd={onEndArchiveLayoutDrag}
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
                            <ArchiveLayoutFieldShell
                              getLayoutFieldWorkbenchMeta={getLayoutFieldWorkbenchMeta}
                              height={layoutMeta.height}
                              rawField={layoutMeta.field}
                              renderFieldPreview={renderFieldPreview}
                              rowIndex={0}
                              width={layoutMeta.width}
                            />
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
});
