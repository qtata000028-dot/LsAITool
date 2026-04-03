import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Table } from 'antd';
import { flushSync } from 'react-dom';
import { DndContext, DragOverlay, PointerSensor, closestCenter, pointerWithin, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Resizable, type ResizeCallbackData } from 'react-resizable';
import { cn } from '../../../lib/utils';
import {
  resolveWorkbenchPreviewWidth,
  updateItemWidthById,
  type ActiveWorkbenchResize,
  type WorkbenchResizeMode,
} from '../resize/use-workbench-resize-state';

export type TableBuilderOptions = {
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
  surfaceVariant?: 'glass' | 'solid';
  surfaceShape?: 'rounded' | 'square';
  previewReadableMinWidth?: number;
  layoutVersion?: string;
  showCanvasOverlayCard?: boolean;
  canvasOverlayVariant?: 'stacked' | 'inline';
  canvasHelperText?: string;
  canvasActionText?: string;
  canvasIcon?: string;
};

export type TableBuilderHelpers = {
  buildColumn: (prefix: string, index: number, overrides?: Record<string, any>) => any;
  getDetailBoardTheme: (theme?: string) => any;
  isRenderableColumn: (column: any) => boolean;
  isTreeRelationFieldColumn: (column: Record<string, unknown> | null | undefined) => boolean;
  normalizeColumn: (column: any) => any;
  normalizeDetailBoardConfig: (config: any, columns?: any[]) => any;
};

export type TableBuilderColumnMetrics = {
  collapsedRenderWidth: number;
  minWidth: number;
  resizeMaxWidth: number;
  resizeMinWidth: number;
};

export type TableBuilderProps = {
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
  businessType: 'document' | 'table' | 'tree';
  activateColumnSelection: (scope: 'left' | 'main' | 'detail', columnId: string | null) => void;
  setBuilderSelectionContextMenu: React.Dispatch<React.SetStateAction<any>>;
  startResize: (
    event: React.MouseEvent,
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
  helpers: TableBuilderHelpers;
  metrics: TableBuilderColumnMetrics;
};

type TableBuilderAntdSortableHeaderCellProps = React.ThHTMLAttributes<HTMLTableCellElement> & {
  columnId?: string;
  sortable?: boolean;
  resizeWidth?: number;
  resizeMinWidth?: number;
  resizeMaxWidth?: number;
  compact?: boolean;
  isResizing?: boolean;
  railClassName?: string;
  onResizeStart?: (event: React.SyntheticEvent) => void;
  onResizeWidth?: (width: number) => void;
  onResizeStop?: (event: React.SyntheticEvent, width: number) => void;
  onAutoFit?: (event: React.MouseEvent<HTMLSpanElement>) => void;
};

type TableBuilderAntdSortableHandleContextValue = {
  sortable: boolean;
  listeners?: Record<string, unknown>;
  setActivatorNodeRef?: (element: HTMLElement | null) => void;
};

const tableBuilderAntdSortableHandleContext = React.createContext<TableBuilderAntdSortableHandleContextValue>({
  sortable: false,
});

const restrictTableBuilderPreviewToHorizontalAxis = ({ transform }: { transform: { x: number; y: number; scaleX: number; scaleY: number } }) => ({
  ...transform,
  y: 0,
});

const dashboardTableBuilderFillerWidthVar = '--dashboard-table-builder-filler-width';

function getDashboardTableBuilderColumnWidthVarName(columnId: string) {
  return `--dashboard-table-builder-col-width-${String(columnId).replace(/[^a-zA-Z0-9_-]/g, '_')}`;
}

function getDashboardTableBuilderColumnWidthVarValue(columnId: string, fallbackWidth: number) {
  return `var(${getDashboardTableBuilderColumnWidthVarName(columnId)}, ${Math.round(fallbackWidth)}px)`;
}

function TableBuilderAntdSortableHeaderCell({
  columnId,
  sortable = false,
  resizeWidth,
  resizeMinWidth,
  resizeMaxWidth,
  compact = false,
  isResizing = false,
  railClassName,
  onResizeStart,
  onResizeWidth,
  onResizeStop,
  onAutoFit,
  style,
  className,
  children,
  ...rest
}: TableBuilderAntdSortableHeaderCellProps) {
  const staticHeaderId = React.useId();
  const {
    isDragging,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id: columnId ?? staticHeaderId,
    disabled: !sortable || !columnId,
  });

  const contextValue = useMemo<TableBuilderAntdSortableHandleContextValue>(() => ({
    sortable,
    listeners: sortable ? listeners : undefined,
    setActivatorNodeRef: sortable ? setActivatorNodeRef : undefined,
  }), [listeners, setActivatorNodeRef, sortable]);

  const canResize = typeof resizeWidth === 'number'
    && typeof resizeMinWidth === 'number'
    && typeof resizeMaxWidth === 'number'
    && typeof onResizeWidth === 'function'
    && typeof onResizeStop === 'function'
    && typeof onAutoFit === 'function';
  const [liveResizeWidth, setLiveResizeWidth] = React.useState<number | null>(
    canResize ? Math.max(resizeMinWidth, Math.min(resizeMaxWidth, Math.round(resizeWidth))) : null,
  );
  const [liveResizing, setLiveResizing] = React.useState(false);
  const externalResizeWidth = canResize
    ? Math.max(resizeMinWidth, Math.min(resizeMaxWidth, Math.round(resizeWidth)))
    : null;
  const normalizedWidth = canResize
    ? Math.max(
      resizeMinWidth,
      Math.min(
        resizeMaxWidth,
        Math.round((liveResizing ? liveResizeWidth : externalResizeWidth) ?? resizeWidth),
      ),
    )
    : undefined;

  const headerCellNode = (
    <th
      {...rest}
      ref={sortable ? setNodeRef : undefined}
      style={{
        ...style,
        ...(typeof normalizedWidth === 'number'
          ? { width: normalizedWidth, minWidth: normalizedWidth }
          : null),
        transform: CSS.Translate.toString(transform),
        transition,
        position: 'relative',
        zIndex: isDragging ? 2 : undefined,
      }}
      className={cn(
        className,
        'group',
        sortable && 'select-none',
        isDragging && 'z-[2] shadow-[0_12px_32px_-18px_rgba(15,23,42,0.38)]',
      )}
    >
      {children}
    </th>
  );

  return (
    <tableBuilderAntdSortableHandleContext.Provider value={contextValue}>
      {canResize && typeof normalizedWidth === 'number' ? (
        <Resizable
          width={normalizedWidth}
          height={0}
          axis="x"
          resizeHandles={['e']}
          minConstraints={[resizeMinWidth, 0]}
          maxConstraints={[resizeMaxWidth, 0]}
          draggableOpts={{ enableUserSelectHack: false }}
          onResizeStart={(event) => {
            flushSync(() => {
              setLiveResizing(true);
              setLiveResizeWidth(normalizedWidth);
            });
            onResizeStart?.(event);
          }}
          onResize={(_event, data: ResizeCallbackData) => {
            flushSync(() => {
              setLiveResizeWidth(data.size.width);
            });
            onResizeWidth(data.size.width);
          }}
          onResizeStop={(event, data) => {
            flushSync(() => {
              setLiveResizeWidth(data.size.width);
              setLiveResizing(false);
            });
            onResizeStop(event, data.size.width);
          }}
          handle={(_axis, ref) => (
            <span
              ref={ref as React.Ref<HTMLSpanElement>}
              role="separator"
              aria-orientation="vertical"
              tabIndex={-1}
              onMouseDown={(event) => {
                event.stopPropagation();
              }}
              onDoubleClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onAutoFit(event);
              }}
              className={cn(
                'react-resizable-handle react-resizable-handle-e dashboard-table-builder-resize-handle absolute bottom-0 right-0 top-0 z-20 flex cursor-col-resize items-center justify-center border-0 p-0 outline-none touch-none select-none',
                compact ? 'dashboard-table-builder-resize-handle-compact' : 'dashboard-table-builder-resize-handle-default',
                railClassName,
              )}
              title="鎷栧姩璋冩暣鍒楀锛屽弻鍑昏嚜鍔ㄩ€傞厤"
            >
              <span
                className={cn(
                  'h-5 w-px rounded-full transition-all',
                  isResizing
                    ? 'bg-[#2563eb] shadow-[0_0_0_2px_rgba(37,99,235,0.12)]'
                    : 'bg-transparent group-hover:bg-slate-300 dark:group-hover:bg-slate-500',
                )}
              />
            </span>
          )}
        >
          {headerCellNode}
        </Resizable>
      ) : headerCellNode}
    </tableBuilderAntdSortableHandleContext.Provider>
  );
}

type TableBuilderAntdSortableHandleProps = React.HTMLAttributes<HTMLSpanElement> & {
  disabled?: boolean;
};

function TableBuilderAntdSortableHandle({
  disabled = false,
  className,
  children,
  ...rest
}: TableBuilderAntdSortableHandleProps) {
  const { sortable, listeners, setActivatorNodeRef } = React.useContext(tableBuilderAntdSortableHandleContext);
  const canDrag = sortable && !disabled;

  return (
    <span
      {...rest}
      ref={canDrag ? setActivatorNodeRef : undefined}
      {...(canDrag ? listeners : {})}
      className={cn(
        className,
        canDrag && 'cursor-grab touch-none active:cursor-grabbing',
      )}
    >
      {children}
    </span>
  );
}

export const MemoTableBuilder = React.memo(function TableBuilder({
  scope,
  cols,
  setCols,
  selectedId,
  selectedForDelete,
  setSelectedForDelete,
  options,
  activeResize,
  workspaceThemeVars,
  isCompactModuleSetting,
  businessType,
  activateColumnSelection,
  setBuilderSelectionContextMenu,
  autoFitColumnWidth,
  helpers,
  metrics,
}: TableBuilderProps) {
  const backgroundSelectable = options?.backgroundSelectable ?? false;
  const tableSelected = options?.tableSelected ?? false;
  const onSelectTable = options?.onSelectTable;
  const onCanvasDoubleClick = options?.onCanvasDoubleClick;
  const canvasLabel = options?.canvasLabel ?? '点击配置表格属性';
  const showCanvasOverlayCard = options?.showCanvasOverlayCard ?? false;
  const canvasOverlayVariant = options?.canvasOverlayVariant ?? 'stacked';
  const canvasHelperText = options?.canvasHelperText ?? '';
  const canvasActionText = options?.canvasActionText ?? '';
  const canvasIcon = options?.canvasIcon ?? 'table_rows';
  const renderableCols = options?.renderableColumns ?? cols.filter((column) => helpers.isRenderableColumn(column));
  const density = options?.density ?? 'default';
  const surfaceVariant = options?.surfaceVariant ?? 'glass';
  const useSolidSurface = surfaceVariant === 'solid';
  const surfaceShape = options?.surfaceShape ?? 'rounded';
  const useSquareSurface = useSolidSurface && surfaceShape === 'square';
  const isCompactCanvas = density === 'compact';
  const selectedForDeleteSet = useMemo(() => new Set(selectedForDelete), [selectedForDelete]);
  const [previewDraggingColumnId, setPreviewDraggingColumnId] = useState<string | null>(null);
  const [resizingColumnId, setResizingColumnId] = useState<string | null>(null);
  const previewColumnDragSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 4,
      },
    }),
  );
  const previewColumnDragModifiers = useMemo(() => [restrictTableBuilderPreviewToHorizontalAxis], []);
  const previewColumnCollisionDetection = useCallback((args: Parameters<typeof closestCenter>[0]) => {
    const pointerCollisions = pointerWithin(args);
    return pointerCollisions.length > 0 ? pointerCollisions : closestCenter(args);
  }, []);

  const buildScopedSelectionIds = useCallback((currentIds: string[], id: string, append: boolean) => {
    if (currentIds.includes(id)) {
      return currentIds;
    }
    return append ? Array.from(new Set([...currentIds, id])) : [id];
  }, []);

  const getColumnRenderWidth = useCallback((rawColumn: any) => {
    const normalizedColumn = helpers.normalizeColumn(rawColumn);
    return resolveWorkbenchPreviewWidth(
      normalizedColumn.width,
      metrics.minWidth,
      metrics.collapsedRenderWidth,
      activeResize,
      normalizedColumn.id,
      'column',
    );
  }, [activeResize, helpers, metrics.collapsedRenderWidth, metrics.minWidth]);
  const previewReadableMinWidth = useMemo(() => {
    if (!backgroundSelectable) {
      return metrics.collapsedRenderWidth;
    }
    const configuredPreviewMinWidth = Number(options?.previewReadableMinWidth);
    if (Number.isFinite(configuredPreviewMinWidth) && configuredPreviewMinWidth > 0) {
      return Math.max(metrics.minWidth, Math.round(configuredPreviewMinWidth));
    }
    return isCompactCanvas ? 72 : metrics.minWidth;
  }, [backgroundSelectable, isCompactCanvas, metrics.collapsedRenderWidth, metrics.minWidth, options?.previewReadableMinWidth]);

  const handlePreviewColumnDragStart = useCallback((event: DragStartEvent) => {
    setPreviewDraggingColumnId(String(event.active.id));
  }, []);

  const handlePreviewColumnDragCancel = useCallback(() => {
    setPreviewDraggingColumnId(null);
  }, []);

  const handlePreviewColumnDragEnd = useCallback((event: DragEndEvent) => {
    setPreviewDraggingColumnId(null);
    if (!event.over) {
      return;
    }

    const activeId = String(event.active.id);
    const overId = String(event.over.id);
    if (!activeId || !overId || activeId === overId) {
      return;
    }

    setCols((prev) => {
      const activeIndex = prev.findIndex((column) => String(column?.id) === activeId);
      const overIndex = prev.findIndex((column) => String(column?.id) === overId);
      if (activeIndex < 0 || overIndex < 0 || activeIndex === overIndex) {
        return prev;
      }
      return arrayMove(prev, activeIndex, overIndex);
    });
  }, [setCols]);

  const handleColumnHeaderClick = useCallback((event: React.MouseEvent<HTMLButtonElement>, id: string) => {
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
  }, [
    activateColumnSelection,
    scope,
    selectedForDelete,
    selectedId,
    setBuilderSelectionContextMenu,
    setSelectedForDelete,
  ]);

  const handleColumnHeaderContextMenu = useCallback((event: React.MouseEvent<HTMLButtonElement>, id: string) => {
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
  }, [
    activateColumnSelection,
    buildScopedSelectionIds,
    scope,
    selectedForDelete,
    setBuilderSelectionContextMenu,
    setSelectedForDelete,
  ]);

  const clampColumnWidth = useCallback((width: number) => (
    Math.max(metrics.resizeMinWidth, Math.min(metrics.resizeMaxWidth, Math.round(width)))
  ), [metrics.resizeMaxWidth, metrics.resizeMinWidth]);

  const addColumnWidth = isCompactModuleSetting ? 58 : 74;
  const tableSurfaceRadiusClass = useSquareSurface ? 'rounded-none' : 'rounded-[20px]';
  const tableSurfaceClass = useSolidSurface
    ? (
        tableSelected
          ? `${tableSurfaceRadiusClass} border border-[color:var(--workspace-accent-border)] bg-[color:var(--workspace-accent-surface)] shadow-none`
          : `${tableSurfaceRadiusClass} border border-[#d9e3ef] bg-white shadow-none`
      )
    : (
        tableSelected
          ? 'cloudy-glass-panel bg-[color:var(--workspace-accent-surface)] shadow-none'
          : 'cloudy-glass-panel'
      );
  const headerDividerClass = tableSelected
    ? 'border-[#d7e2f0] dark:border-slate-700/80'
    : 'border-[#e6edf5] dark:border-slate-700/80';

  const getHeaderButtonClass = useCallback((isActive: boolean, isMarkedForDelete: boolean, isTreeRelation: boolean) => (
    isActive
      ? 'bg-[#f3f8ff] hover:bg-[#edf5ff] dark:bg-slate-800/75 dark:hover:bg-slate-800/75'
      : isMarkedForDelete
        ? 'bg-[#fff5f6] hover:bg-[#fff2f4] dark:bg-rose-950/20 dark:hover:bg-rose-950/20'
        : isTreeRelation
          ? 'bg-[#fcfdff] hover:bg-[#f7fbff] dark:bg-slate-900/55 dark:hover:bg-slate-900/55'
          : 'bg-white hover:bg-[#f8fbff] dark:bg-slate-900/55 dark:hover:bg-slate-800/65'
  ), []);

  const getHeaderLabelClass = useCallback((isActive: boolean, isMarkedForDelete: boolean, isTreeRelation: boolean) => {
    if (isActive) {
      return 'bg-transparent px-0 py-0 text-[#1d4ed8] dark:text-sky-200';
    }
    if (isMarkedForDelete) {
      return 'bg-transparent px-0 py-0 text-[#be123c] dark:text-rose-200';
    }
    if (isTreeRelation) {
      return 'bg-transparent px-0 py-0 text-[#2563eb] dark:text-sky-200';
    }
    return 'bg-transparent px-0 py-0 text-slate-700 dark:text-slate-100';
  }, []);

  const getHeaderRequiredMarkClass = useCallback((isActive: boolean, isMarkedForDelete: boolean, isRequired: boolean, isTreeRelation: boolean) => {
    if (!isRequired) return 'hidden';
    if (isActive) return 'text-[#1d4ed8] dark:text-sky-200';
    if (isTreeRelation) return 'text-[#2563eb] dark:text-sky-200';
    if (isMarkedForDelete) return 'text-[#be123c] dark:text-rose-200';
    return 'text-[#2563eb] dark:text-sky-200';
  }, []);
  const getHeaderResizeRailClass = useCallback((isActive: boolean) => (
    isActive
      ? 'bg-transparent group-hover:bg-slate-200/70 dark:group-hover:bg-white/8'
      : 'bg-transparent group-hover:bg-slate-200 dark:group-hover:bg-white/6'
  ), []);

  const getHeaderCornerClass = useCallback(() => '', []);
  const addColumnHeaderShellClass = tableSelected
    ? 'border-[#d7e2f0] bg-[#f8fbff] dark:bg-white/6'
    : 'border-[#e6edf5] bg-[#f8fafc]';
  const addColumnButtonClass = tableSelected
    ? 'border-[#c7d7ea] bg-white text-[color:var(--workspace-accent-strong)]'
    : 'border-[#dbe5ef] bg-white text-[color:var(--workspace-accent)]';

  const headerColumns = useMemo(() => renderableCols.map((col, index) => {
    const normalizedCol = helpers.normalizeColumn(col);
    const baseHeaderWidth = getColumnRenderWidth(normalizedCol);
    const headerWidth = backgroundSelectable
      ? Math.max(baseHeaderWidth, previewReadableMinWidth)
      : baseHeaderWidth;
    return {
      col,
      index,
      normalizedCol,
      headerWidth,
      isCollapsedHeader: !backgroundSelectable && headerWidth <= 18,
      isTreeRelation: scope === 'main' && businessType !== 'table' && helpers.isTreeRelationFieldColumn(normalizedCol),
    };
  }), [backgroundSelectable, businessType, getColumnRenderWidth, helpers, previewReadableMinWidth, renderableCols, scope]);

  const totalTableWidth = useMemo(
    () => headerColumns.reduce((sum, column) => sum + column.headerWidth, addColumnWidth),
    [addColumnWidth, headerColumns],
  );
  const previewHostRef = useRef<HTMLDivElement | null>(null);
  const layoutVersion = options?.layoutVersion ?? '';
  const [previewHostHeight, setPreviewHostHeight] = useState(0);
  const [previewHostWidth, setPreviewHostWidth] = useState(0);
  const [previewMeasuredHeaderHeight, setPreviewMeasuredHeaderHeight] = useState(0);
  const previewHeaderHeight = isCompactModuleSetting ? 34 : 40;
  const effectivePreviewHeaderHeight = previewMeasuredHeaderHeight > 0
    ? previewMeasuredHeaderHeight
    : previewHeaderHeight;
  const previewRowHeight = isCompactCanvas ? 40 : 44;
  const previewHorizontalScrollbarReserve = backgroundSelectable
    ? (isCompactCanvas ? 14 : 16)
    : 0;
  const previewFillerWidth = useMemo(() => (
    backgroundSelectable
      ? Math.max(0, previewHostWidth - totalTableWidth)
      : 0
  ), [backgroundSelectable, previewHostWidth, totalTableWidth]);
  const effectivePreviewTableWidth = totalTableWidth + previewFillerWidth;
  const previewAvailableBodyHeight = useMemo(() => (
    previewHostHeight > 0
      ? Math.max(previewRowHeight, previewHostHeight - effectivePreviewHeaderHeight - previewHorizontalScrollbarReserve - 2)
      : 0
  ), [effectivePreviewHeaderHeight, previewHostHeight, previewHorizontalScrollbarReserve, previewRowHeight]);
  const previewScrollY = useMemo(() => (
    backgroundSelectable && previewAvailableBodyHeight > 0
      ? previewAvailableBodyHeight
      : undefined
  ), [backgroundSelectable, previewAvailableBodyHeight]);
  const applyLiveColumnResizePreview = useCallback((columnId: string, width: number) => {
    const hostElement = previewHostRef.current;
    if (!hostElement) {
      return;
    }

    hostElement.style.setProperty(getDashboardTableBuilderColumnWidthVarName(columnId), `${Math.round(width)}px`);
    const nextTotalTableWidth = headerColumns.reduce(
      (sum, column) => sum + (String(column.col.id) === String(columnId) ? width : column.headerWidth),
      addColumnWidth,
    );
    const nextFillerWidth = backgroundSelectable
      ? Math.max(0, previewHostWidth - nextTotalTableWidth)
      : 0;
    const nextEffectiveTableWidth = nextTotalTableWidth + nextFillerWidth;

    hostElement.style.setProperty(dashboardTableBuilderFillerWidthVar, `${Math.round(nextFillerWidth)}px`);
    hostElement.style.setProperty('--dashboard-table-builder-width', `${Math.round(nextEffectiveTableWidth)}px`);
  }, [addColumnWidth, backgroundSelectable, headerColumns, previewHostWidth]);

  const handleColumnResizeStart = useCallback((_event: React.SyntheticEvent, id: string) => {
    setResizingColumnId(id);
  }, []);

  const handleColumnResizeWidth = useCallback((id: string, _label: string, width: number) => {
    const nextWidth = clampColumnWidth(width);
    applyLiveColumnResizePreview(id, nextWidth);
  }, [applyLiveColumnResizePreview, clampColumnWidth]);

  const handleColumnResizeStop = useCallback((_event: React.SyntheticEvent, id: string, _label: string, width: number) => {
    const nextWidth = clampColumnWidth(width);
    applyLiveColumnResizePreview(id, nextWidth);
    setCols((prev) => updateItemWidthById(prev, id, nextWidth));
    setResizingColumnId((prev) => (prev === id ? null : prev));
  }, [applyLiveColumnResizePreview, clampColumnWidth, setCols]);

  const measurePreviewLayout = useCallback(() => {
    const hostElement = previewHostRef.current;
    const measurementHost = (
      hostElement?.closest('[data-table-workbench-body-slot="true"]') as HTMLDivElement | null
    ) ?? hostElement;
    if (!hostElement || !measurementHost) {
      return;
    }
    const measurementRect = measurementHost.getBoundingClientRect();
    const measuredHeaderElement = hostElement.querySelector('.ant-table-header') as HTMLDivElement | null;
    const measuredHeaderHeight = measuredHeaderElement
      ? Math.max(0, Math.round(measuredHeaderElement.getBoundingClientRect().height))
      : previewHeaderHeight;
    const normalizedWidth = Math.max(0, Math.round(measurementRect.width));
    const normalizedHeight = Math.max(0, Math.round(measurementRect.height));

    setPreviewHostWidth((previousWidth) => (
      previousWidth === normalizedWidth ? previousWidth : normalizedWidth
    ));
    setPreviewHostHeight((previousHeight) => (
      previousHeight === normalizedHeight ? previousHeight : normalizedHeight
    ));
    setPreviewMeasuredHeaderHeight((previousHeaderHeight) => (
      previousHeaderHeight === measuredHeaderHeight ? previousHeaderHeight : measuredHeaderHeight
    ));
  }, [previewHeaderHeight]);

  useLayoutEffect(() => {
    const hostElement = previewHostRef.current;
    const measurementHost = (
      hostElement?.closest('[data-table-workbench-body-slot="true"]') as HTMLDivElement | null
    ) ?? hostElement;
    let firstRafId = 0;
    let secondRafId = 0;
    const scheduleMeasure = () => {
      firstRafId = window.requestAnimationFrame(() => {
        measurePreviewLayout();
        secondRafId = window.requestAnimationFrame(() => {
          measurePreviewLayout();
        });
      });
    };

    if (!measurementHost || typeof ResizeObserver === 'undefined') {
      scheduleMeasure();
      return () => {
        window.cancelAnimationFrame(firstRafId);
        window.cancelAnimationFrame(secondRafId);
      };
    }

    scheduleMeasure();

    const resizeObserver = new ResizeObserver(() => {
      measurePreviewLayout();
    });
    resizeObserver.observe(measurementHost);
    if (hostElement && hostElement !== measurementHost) {
      resizeObserver.observe(hostElement);
    }

    const measuredHeaderElement = hostElement?.querySelector('.ant-table-header') as HTMLDivElement | null;
    if (measuredHeaderElement && measuredHeaderElement !== measurementHost && measuredHeaderElement !== hostElement) {
      resizeObserver.observe(measuredHeaderElement);
    }

    const handleWindowLoad = () => {
      measurePreviewLayout();
    };

    if (document.readyState !== 'complete') {
      window.addEventListener('load', handleWindowLoad, { once: true });
    }

    return () => {
      window.cancelAnimationFrame(firstRafId);
      window.cancelAnimationFrame(secondRafId);
      window.removeEventListener('load', handleWindowLoad);
      resizeObserver.disconnect();
    };
  }, [layoutVersion, measurePreviewLayout]);

  const tablePreviewHostStyle = useMemo<React.CSSProperties>(() => {
    const nextStyle: React.CSSProperties = {
      ...workspaceThemeVars,
      ['--dashboard-table-builder-width' as string]: `${effectivePreviewTableWidth}px`,
      ['--dashboard-table-builder-preview-row-height' as string]: `${previewRowHeight}px`,
      [dashboardTableBuilderFillerWidthVar as string]: `${previewFillerWidth}px`,
    };

    headerColumns.forEach(({ col, headerWidth }) => {
      (nextStyle as Record<string, string>)[getDashboardTableBuilderColumnWidthVarName(String(col.id))] = `${headerWidth}px`;
    });

    return nextStyle;
  }, [effectivePreviewTableWidth, headerColumns, previewFillerWidth, previewRowHeight, workspaceThemeVars]);

  const handleAddColumn = useCallback(() => {
    setCols((prev) => [...prev, helpers.buildColumn(scope === 'detail' ? 'd_col' : `${scope}_col`, prev.length + 1)]);
  }, [helpers, scope, setCols]);


  const tableWrapperClass = cn(
    backgroundSelectable
      ? 'workspace-scrollbar relative flex h-full min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden'
      : 'workspace-scrollbar relative min-h-0 min-w-0 w-full overflow-x-auto overflow-y-hidden',
    tableSurfaceClass,
    backgroundSelectable && (isCompactCanvas ? 'min-h-[184px]' : 'min-h-[260px]'),
  );
  const activePreviewHeaderColumn = useMemo(
    () => headerColumns.find(({ col }) => String(col.id) === previewDraggingColumnId) ?? null,
    [headerColumns, previewDraggingColumnId],
  );
  const previewDragOverlayNode = useMemo(() => {
    if (!activePreviewHeaderColumn) {
      return null;
    }

    const { col, index, normalizedCol, headerWidth, isCollapsedHeader, isTreeRelation } = activePreviewHeaderColumn;
    const isActive = selectedId === col.id;
    const isMarkedForDelete = selectedForDeleteSet.has(col.id);

    return (
      <div
        style={{ width: headerWidth, minWidth: headerWidth }}
        className="pointer-events-none"
      >
        <div
          className={cn(
            `relative flex items-center overflow-hidden text-left ${getHeaderCornerClass(index)} ${isCollapsedHeader ? 'min-h-[34px] px-0 pr-1.5 py-0' : isCompactModuleSetting ? 'min-h-[32px] px-1.5 pr-3 py-0' : 'min-h-[38px] px-2 pr-3.5 py-0'} ${getHeaderButtonClass(isActive, isMarkedForDelete, isTreeRelation)}`,
            'dashboard-table-builder-preview-header-button rounded-md border border-[#c9d7ea] bg-white shadow-[0_20px_36px_-22px_rgba(15,23,42,0.5)] dark:border-slate-700 dark:bg-slate-900',
          )}
        >
          <div className={`flex min-w-0 flex-1 items-center ${isCollapsedHeader ? 'justify-end' : ''}`}>
            <div
              className={`dashboard-table-builder-preview-header-label inline-flex max-w-full items-center font-semibold tracking-[0.01em] transition-all ${isCollapsedHeader ? 'px-0 py-0 opacity-0' : ''} ${isCompactModuleSetting ? 'text-[11px]' : 'text-[12px]'} ${getHeaderLabelClass(isActive, isMarkedForDelete, isTreeRelation)}`}
              title={normalizedCol.name}
            >
              <span className="truncate rounded-sm">{normalizedCol.name}</span>
              {isTreeRelation && !isCollapsedHeader && (
                <span className="ml-1 text-[10px] font-semibold leading-none text-[#2563eb] dark:text-sky-200">
                  树
                </span>
              )}
              <span className={`ml-0.5 text-[10px] leading-none ${getHeaderRequiredMarkClass(isActive, isMarkedForDelete, normalizedCol.required, isTreeRelation)}`}>*</span>
            </div>
          </div>
        </div>
      </div>
    );
  }, [
    activePreviewHeaderColumn,
    getHeaderButtonClass,
    getHeaderCornerClass,
    getHeaderLabelClass,
    getHeaderRequiredMarkClass,
    isCompactModuleSetting,
    selectedForDeleteSet,
    selectedId,
  ]);
  const previewSortableColumnIds = useMemo(
    () => headerColumns.map(({ col }) => String(col.id)),
    [headerColumns],
  );
  const previewHeaderRowComponent = useMemo(() => {
    const PreviewHeaderRow = (props: React.HTMLAttributes<HTMLTableRowElement>) => (
      <SortableContext items={previewSortableColumnIds} strategy={horizontalListSortingStrategy}>
        <tr {...props} />
      </SortableContext>
    );

    return PreviewHeaderRow;
  }, [previewSortableColumnIds]);
  const previewTableComponents = useMemo(() => ({
    header: {
      row: previewHeaderRowComponent,
      cell: TableBuilderAntdSortableHeaderCell,
    },
  }), [previewHeaderRowComponent]);
  const previewPlaceholderRowCount = isCompactCanvas ? 18 : 24;
  const previewTableDataSource = useMemo(
    () => Array.from({ length: previewPlaceholderRowCount }, (_, index) => ({ key: `__preview__-${index}` })),
    [previewPlaceholderRowCount],
  );
  const previewCellSpacerClass = isCompactCanvas ? 'min-h-[34px]' : 'min-h-[40px]';
  const previewCellSpacerStyle = useMemo<React.CSSProperties>(() => ({
    height: `${previewRowHeight}px`,
    minHeight: `${previewRowHeight}px`,
  }), [previewRowHeight]);
  const previewTableColumnsResizable = useMemo(() => {
    const headerDrivenColumns = headerColumns.map(({ col, index, normalizedCol, headerWidth, isCollapsedHeader, isTreeRelation }) => {
      const isActive = selectedId === col.id;
      const isMarkedForDelete = selectedForDeleteSet.has(col.id);
      const isDragging = previewDraggingColumnId === String(col.id);
      const isResizing = activeResize?.id === col.id || resizingColumnId === col.id;
      const previewColumnWidth = getDashboardTableBuilderColumnWidthVarValue(String(col.id), headerWidth);

      return {
        key: String(col.id),
        dataIndex: String(col.id),
        width: previewColumnWidth,
        title: (
                <button
                  type="button"
                  onClick={(event) => handleColumnHeaderClick(event, col.id)}
                  onContextMenu={(event) => handleColumnHeaderContextMenu(event, col.id)}
                  className={cn(
                    `dashboard-table-builder-preview-header-button relative flex h-full w-full items-center overflow-hidden text-left transition-all ${getHeaderCornerClass(index)} ${isCollapsedHeader ? 'min-h-[34px] px-0 pr-1.5 py-0' : isCompactModuleSetting ? 'min-h-[32px] px-1.5 pr-3 py-0' : 'min-h-[38px] px-2 pr-3.5 py-0'} ${getHeaderButtonClass(isActive, isMarkedForDelete, isTreeRelation)}`,
                    isDragging && 'opacity-25',
                  )}
              title="点击可选中字段"
            >
              <div className={`flex min-w-0 flex-1 items-center ${isCollapsedHeader ? 'justify-end' : ''}`}>
                <div
                  className={`dashboard-table-builder-preview-header-label inline-flex max-w-full items-center font-semibold tracking-[0.01em] transition-all ${isCollapsedHeader ? 'px-0 py-0 opacity-0' : ''} ${isCompactModuleSetting ? 'text-[11px]' : 'text-[12px]'} ${getHeaderLabelClass(isActive, isMarkedForDelete, isTreeRelation)}`}
                  title={normalizedCol.name}
                >
                  <TableBuilderAntdSortableHandle
                    disabled={isCollapsedHeader}
                    className="truncate rounded-sm"
                    title="拖动标题可调整列顺序"
                  >
                    {normalizedCol.name}
                  </TableBuilderAntdSortableHandle>
                  {isTreeRelation && !isCollapsedHeader && (
                    <span className="ml-1 text-[10px] font-semibold leading-none text-[#2563eb] dark:text-sky-200">
                      树
                    </span>
                  )}
                  <span className={`ml-0.5 text-[10px] leading-none ${getHeaderRequiredMarkClass(isActive, isMarkedForDelete, normalizedCol.required, isTreeRelation)}`}>*</span>
                </div>
              </div>
            </button>
        ),
        onHeaderCell: () => ({
          style: { width: previewColumnWidth, minWidth: previewColumnWidth, padding: 0, background: 'transparent' },
          className: cn('dashboard-table-builder-ant-header-cell align-top', headerDividerClass),
          columnId: String(col.id),
          sortable: !isCollapsedHeader,
          resizeWidth: headerWidth,
          resizeMinWidth: metrics.resizeMinWidth,
          resizeMaxWidth: metrics.resizeMaxWidth,
          compact: isCompactModuleSetting,
          isResizing,
          railClassName: getHeaderResizeRailClass(isActive),
          onResizeStart: (event: React.SyntheticEvent) => handleColumnResizeStart(event, col.id),
          onResizeWidth: (width: number) => handleColumnResizeWidth(col.id, normalizedCol.name || '未命名字段', width),
          onResizeStop: (event: React.SyntheticEvent, width: number) => handleColumnResizeStop(event, col.id, normalizedCol.name || '未命名字段', width),
          onAutoFit: (event: React.MouseEvent<HTMLSpanElement>) => autoFitColumnWidth(event, col.id, cols, setCols, metrics.minWidth, metrics.resizeMaxWidth, 'column'),
        }),
        render: () => (
          <div
            className={cn('w-full border-t border-[#edf2f7] dark:border-slate-800/80', previewCellSpacerClass)}
            style={previewCellSpacerStyle}
          />
        ),
      };
    });

    headerDrivenColumns.push({
      key: '__add__',
      dataIndex: '__add__',
      width: addColumnWidth,
      title: (
        <div className="group relative h-full">
          <button
            type="button"
            onClick={handleAddColumn}
            className={`dashboard-table-builder-add-column-button flex h-full w-full items-center justify-center transition-all ${isCompactModuleSetting ? 'min-h-[34px]' : 'min-h-[40px]'} hover:bg-white/55 dark:hover:bg-white/8`}
            title="新增字段"
          >
            <div className={`inline-flex items-center justify-center rounded-md border ${addColumnButtonClass} ${isCompactModuleSetting ? 'size-8' : 'size-9'}`}>
              <span className="material-symbols-outlined text-[17px]">add</span>
            </div>
          </button>
        </div>
      ),
      onHeaderCell: () => ({
        style: { width: addColumnWidth, minWidth: addColumnWidth, padding: 0, background: 'transparent' },
        className: cn('dashboard-table-builder-ant-header-cell align-top', addColumnHeaderShellClass),
        sortable: false,
      }),
      render: () => (
        <div
          className={cn('w-full border-t border-[#edf2f7] dark:border-slate-800/80', previewCellSpacerClass)}
          style={previewCellSpacerStyle}
        />
      ),
    });

    if (previewFillerWidth > 0) {
      const fillerPreviewWidth = `var(${dashboardTableBuilderFillerWidthVar}, ${Math.round(previewFillerWidth)}px)`;
      headerDrivenColumns.push({
        key: '__filler__',
        dataIndex: '__filler__',
        width: fillerPreviewWidth,
        title: <div className="h-full w-full" />,
        onHeaderCell: () => ({
          style: { width: fillerPreviewWidth, minWidth: fillerPreviewWidth, padding: 0, background: 'transparent' },
          className: 'dashboard-table-builder-ant-header-cell dashboard-table-builder-ant-filler-header-cell align-top',
          sortable: false,
        }),
        render: () => (
          <div
            className={cn('w-full border-t border-[#edf2f7] dark:border-slate-800/80', previewCellSpacerClass)}
            style={previewCellSpacerStyle}
          />
        ),
      });
    }

    return headerDrivenColumns;
  }, [
    activeResize?.id,
    addColumnButtonClass,
    addColumnHeaderShellClass,
    addColumnWidth,
    autoFitColumnWidth,
    cols,
    getHeaderButtonClass,
    getHeaderCornerClass,
    getHeaderLabelClass,
    getHeaderRequiredMarkClass,
    getHeaderResizeRailClass,
    handleAddColumn,
    handleColumnHeaderClick,
    handleColumnHeaderContextMenu,
    handleColumnResizeStart,
    handleColumnResizeStop,
    handleColumnResizeWidth,
    headerColumns,
    headerDividerClass,
    isCompactModuleSetting,
    metrics.minWidth,
    metrics.resizeMaxWidth,
    metrics.resizeMinWidth,
    previewCellSpacerClass,
    previewCellSpacerStyle,
    previewDraggingColumnId,
    previewFillerWidth,
    resizingColumnId,
    selectedForDeleteSet,
    selectedId,
    setCols,
  ]);
  const handlePreviewTableRowClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    onSelectTable?.();
  }, [onSelectTable]);
  const handlePreviewTableRowDoubleClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    onCanvasDoubleClick?.();
  }, [onCanvasDoubleClick]);
  const handleCanvasOverlayCardClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onSelectTable?.();
  }, [onSelectTable]);
  const handleCanvasOverlayCardDoubleClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onCanvasDoubleClick?.();
  }, [onCanvasDoubleClick]);
  const canvasOverlayCardNode = useMemo(() => {
    if (!backgroundSelectable || !showCanvasOverlayCard) {
      return null;
    }

    const cardClassName = canvasOverlayVariant === 'inline'
      ? 'dashboard-table-builder-canvas-card dashboard-table-builder-canvas-card-inline'
      : 'dashboard-table-builder-canvas-card dashboard-table-builder-canvas-card-stacked';

    return (
      <div className="dashboard-table-builder-canvas-overlay">
        <button
          type="button"
          onClick={handleCanvasOverlayCardClick}
          onDoubleClick={handleCanvasOverlayCardDoubleClick}
          className={cardClassName}
        >
          <span className="dashboard-table-builder-canvas-card-main">
            <span className="dashboard-table-builder-canvas-card-icon">
              <span className="material-symbols-outlined text-[20px]">{canvasIcon}</span>
            </span>
            <span className="dashboard-table-builder-canvas-card-copy">
              <span className="dashboard-table-builder-canvas-card-title">{canvasLabel}</span>
              {canvasHelperText ? (
                <span className="dashboard-table-builder-canvas-card-helper">{canvasHelperText}</span>
              ) : null}
            </span>
          </span>
          {canvasOverlayVariant === 'inline' && canvasActionText ? (
            <span className="dashboard-table-builder-canvas-card-action">{canvasActionText}</span>
          ) : null}
        </button>
      </div>
    );
  }, [
    backgroundSelectable,
    canvasActionText,
    canvasHelperText,
    canvasIcon,
    canvasLabel,
    canvasOverlayVariant,
    handleCanvasOverlayCardClick,
    handleCanvasOverlayCardDoubleClick,
    showCanvasOverlayCard,
  ]);

  if (cols.length === 0) {
    return (
      <div className={`flex h-full min-h-0 items-center justify-center px-6 text-center text-slate-400 ${isCompactCanvas ? 'min-h-[164px] py-6' : 'min-h-[240px]'}`}>
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

  return (
    <div ref={previewHostRef} style={tablePreviewHostStyle} className={tableWrapperClass}>
      <DndContext
        sensors={previewColumnDragSensors}
        modifiers={previewColumnDragModifiers}
        collisionDetection={previewColumnCollisionDetection}
        onDragStart={handlePreviewColumnDragStart}
        onDragCancel={handlePreviewColumnDragCancel}
        onDragEnd={handlePreviewColumnDragEnd}
      >
        <Table
          className="dashboard-table-builder-ant-table min-h-0 flex-1"
          rowKey="key"
          pagination={false}
          dataSource={previewTableDataSource}
          columns={previewTableColumnsResizable}
          components={previewTableComponents}
          tableLayout="fixed"
          size={isCompactModuleSetting ? 'small' : 'middle'}
          scroll={{
            x: effectivePreviewTableWidth,
            y: previewScrollY,
          }}
          locale={{ emptyText: null }}
          onRow={() => ({
            onClick: handlePreviewTableRowClick,
            onDoubleClick: handlePreviewTableRowDoubleClick,
            className: cn(
              'dashboard-table-builder-ant-preview-row',
              onSelectTable && 'cursor-pointer',
              tableSelected && 'dashboard-table-builder-ant-preview-row-selected',
            ),
          })}
        />
        {canvasOverlayCardNode}
        <DragOverlay dropAnimation={null}>
          {previewDragOverlayNode}
        </DragOverlay>
      </DndContext>
    </div>
  );
});
