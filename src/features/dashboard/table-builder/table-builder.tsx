import React, { useCallback, useMemo, useState } from 'react';
import { cn } from '../../../lib/utils';
import {
  resolveWorkbenchPreviewWidth,
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

type TableBuilderDropIndicator =
  | { kind: 'column'; id: string; position: 'before' | 'after' }
  | { kind: 'append' }
  | null;

export const MemoTableBuilder = React.memo(function TableBuilder({
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
  helpers,
  metrics,
}: TableBuilderProps) {
  const backgroundSelectable = options?.backgroundSelectable ?? false;
  const tableSelected = options?.tableSelected ?? false;
  const onSelectTable = options?.onSelectTable;
  const onCanvasDoubleClick = options?.onCanvasDoubleClick;
  const canvasLabel = options?.canvasLabel ?? '点击空白区域配置表格';
  const detailBoardConfig = options?.normalizedDetailBoardConfig ?? helpers.normalizeDetailBoardConfig(options?.detailBoardConfig, cols);
  const renderableCols = options?.renderableColumns ?? cols.filter((column) => helpers.isRenderableColumn(column));
  const density = options?.density ?? 'default';
  const isCompactCanvas = density === 'compact';
  const detailBoardTheme = helpers.getDetailBoardTheme(workspaceTheme);
  const hasDetailBoardFeature = detailBoardConfig.enabled && detailBoardConfig.groups.some((group: any) => group.columnIds.length > 0);
  const detailBoardFeatureLabel = hasDetailBoardFeature ? '双击详情预览' : null;
  const selectedForDeleteSet = useMemo(() => new Set(selectedForDelete), [selectedForDelete]);
  const [draggingColumnId, setDraggingColumnId] = useState<string | null>(null);
  const [dropIndicator, setDropIndicator] = useState<TableBuilderDropIndicator>(null);

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

  const clearColumnDragState = useCallback(() => {
    setDraggingColumnId(null);
    setDropIndicator(null);
  }, []);

  const resolveDropPosition = useCallback((event: React.DragEvent<HTMLElement>) => {
    const { left, width } = event.currentTarget.getBoundingClientRect();
    return event.clientX <= left + width / 2 ? 'before' : 'after';
  }, []);

  const moveColumnById = useCallback((sourceId: string, targetId: string, position: 'before' | 'after') => {
    if (sourceId === targetId) return;

    setCols((prev) => {
      const sourceIndex = prev.findIndex((column) => column?.id === sourceId);
      const targetIndex = prev.findIndex((column) => column?.id === targetId);
      if (sourceIndex < 0 || targetIndex < 0) {
        return prev;
      }

      const next = [...prev];
      const [sourceColumn] = next.splice(sourceIndex, 1);
      const normalizedTargetIndex = next.findIndex((column) => column?.id === targetId);
      if (!sourceColumn || normalizedTargetIndex < 0) {
        return prev;
      }

      const insertIndex = position === 'after' ? normalizedTargetIndex + 1 : normalizedTargetIndex;
      next.splice(insertIndex, 0, sourceColumn);
      return next;
    });
  }, [setCols]);

  const moveColumnToEnd = useCallback((sourceId: string) => {
    setCols((prev) => {
      const sourceIndex = prev.findIndex((column) => column?.id === sourceId);
      if (sourceIndex < 0 || sourceIndex === prev.length - 1) {
        return prev;
      }

      const next = [...prev];
      const [sourceColumn] = next.splice(sourceIndex, 1);
      if (!sourceColumn) {
        return prev;
      }
      next.push(sourceColumn);
      return next;
    });
  }, [setCols]);

  const handleColumnDragStart = useCallback((event: React.DragEvent<HTMLElement>, id: string) => {
    setDraggingColumnId(id);
    setDropIndicator(null);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', id);
  }, []);

  const handleColumnDragOver = useCallback((event: React.DragEvent<HTMLElement>, id: string) => {
    if (!draggingColumnId || draggingColumnId === id) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    const position = resolveDropPosition(event);
    setDropIndicator((prev) => (
      prev?.kind === 'column' && prev.id === id && prev.position === position
        ? prev
        : { kind: 'column', id, position }
    ));
  }, [draggingColumnId, resolveDropPosition]);

  const handleColumnDrop = useCallback((event: React.DragEvent<HTMLElement>, id: string) => {
    if (!draggingColumnId) {
      return;
    }

    event.preventDefault();
    if (draggingColumnId !== id) {
      moveColumnById(draggingColumnId, id, resolveDropPosition(event));
    }
    clearColumnDragState();
  }, [clearColumnDragState, draggingColumnId, moveColumnById, resolveDropPosition]);

  const handleAppendDragOver = useCallback((event: React.DragEvent<HTMLElement>) => {
    if (!draggingColumnId) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDropIndicator((prev) => (prev?.kind === 'append' ? prev : { kind: 'append' }));
  }, [draggingColumnId]);

  const handleAppendDrop = useCallback((event: React.DragEvent<HTMLElement>) => {
    if (!draggingColumnId) {
      return;
    }

    event.preventDefault();
    moveColumnToEnd(draggingColumnId);
    clearColumnDragState();
  }, [clearColumnDragState, draggingColumnId, moveColumnToEnd]);

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

  const addColumnWidth = isCompactModuleSetting ? 58 : 74;
  const tableSurfaceClass = tableSelected
    ? 'cloudy-glass-panel border-[2px] border-[color:var(--workspace-accent-border-strong)] bg-[color:var(--workspace-accent-surface)] shadow-none'
    : 'cloudy-glass-panel border-slate-200/80';
  const headerDividerClass = tableSelected ? 'border-[color:var(--workspace-accent-border)]' : 'border-slate-200/70 dark:border-slate-700/80';

  const getHeaderButtonClass = useCallback((isActive: boolean, isMarkedForDelete: boolean, isTreeRelation: boolean) => (
    isActive
      ? 'bg-[linear-gradient(180deg,rgba(255,252,253,0.98),rgba(255,247,250,1))] shadow-[inset_0_0_0_1px_var(--workspace-accent-border-strong)] dark:bg-[linear-gradient(180deg,rgba(80,7,36,0.26),rgba(59,7,30,0.18))]'
      : isMarkedForDelete
        ? 'bg-[linear-gradient(180deg,rgba(255,248,250,0.98),rgba(255,251,252,1))] shadow-[inset_0_0_0_1px_rgba(191,90,112,0.18)]'
        : isTreeRelation
          ? 'bg-[linear-gradient(180deg,rgba(237,247,255,0.98),rgba(245,250,255,1))] shadow-[inset_0_0_0_1px_rgba(125,176,255,0.46)]'
          : tableSelected
            ? 'bg-slate-50 hover:bg-white dark:bg-slate-900/55 dark:hover:bg-slate-800/65'
            : 'bg-white hover:bg-slate-50 dark:bg-slate-900/55 dark:hover:bg-slate-800/65'
  ), [tableSelected]);

  const getHeaderLabelClass = useCallback((isActive: boolean, isMarkedForDelete: boolean, isTreeRelation: boolean) => {
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
  }, [tableSelected]);

  const getHeaderRequiredMarkClass = useCallback((isActive: boolean, isMarkedForDelete: boolean, isRequired: boolean, isTreeRelation: boolean) => {
    if (!isRequired) return 'hidden';
    if (isActive) return 'text-white/88';
    if (isTreeRelation) return 'text-[#2563eb] dark:text-sky-200';
    if (isMarkedForDelete || tableSelected) return 'text-[#d15b75]';
    return 'text-[color:var(--workspace-accent-strong)]';
  }, [tableSelected]);
  const getHeaderResizeRailClass = useCallback((isActive: boolean) => (
    isActive
      ? 'bg-[color:var(--workspace-accent-soft)]'
      : tableSelected
        ? 'bg-transparent group-hover:bg-white/30 dark:group-hover:bg-white/6'
        : ''
  ), [tableSelected]);

  const tableCanvasClass = tableSelected
    ? 'border-[color:var(--workspace-accent-border-strong)] bg-[color:var(--workspace-accent-surface)] text-[color:var(--workspace-accent-strong)]'
    : 'border-slate-200/80 bg-white text-slate-400 hover:border-slate-200/90 hover:bg-white dark:text-slate-500';
  const tableCanvasIconClass = tableSelected
    ? 'cloudy-glass-orb border-[color:var(--workspace-accent-border)] bg-white/96 text-[color:var(--workspace-accent-strong)]'
    : 'cloudy-glass-orb text-[color:var(--workspace-accent)]';
  const tableCanvasTitleClass = tableSelected
    ? 'text-[color:var(--workspace-accent-strong)]'
    : 'text-slate-500 dark:text-slate-300';
  const tableCanvasPanelShellClass = tableSelected
    ? 'border-[color:var(--workspace-accent-border)] bg-white/96 shadow-[0_24px_56px_-36px_rgba(192,107,125,0.5)] dark:bg-slate-950/86'
    : 'border-white/85 bg-white/94 shadow-[0_24px_48px_-36px_rgba(15,23,42,0.24)] dark:border-slate-800/90 dark:bg-slate-950/84';
  const getHeaderCornerClass = useCallback((index: number) => (index === 0 ? 'rounded-tl-[16px]' : ''), []);
  const addColumnHeaderShellClass = tableSelected
    ? 'border-[color:var(--workspace-accent-border)] bg-[color:var(--workspace-accent-soft)] dark:bg-white/6'
    : 'border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(246,249,252,0.6))]';
  const addColumnButtonClass = tableSelected
    ? 'cloudy-glass-orb border-[color:var(--workspace-accent-border)] text-[color:var(--workspace-accent-strong)]'
    : 'cloudy-glass-orb text-[color:var(--workspace-accent)]';

  const headerColumns = useMemo(() => renderableCols.map((col, index) => {
    const normalizedCol = helpers.normalizeColumn(col);
    const headerWidth = getColumnRenderWidth(normalizedCol);
    return {
      col,
      index,
      normalizedCol,
      headerWidth,
      isCollapsedHeader: headerWidth <= 18,
      isTreeRelation: scope === 'main' && businessType !== 'table' && helpers.isTreeRelationFieldColumn(normalizedCol),
    };
  }), [businessType, getColumnRenderWidth, helpers, renderableCols, scope]);

  const totalTableWidth = useMemo(
    () => headerColumns.reduce((sum, column) => sum + column.headerWidth, addColumnWidth),
    [addColumnWidth, headerColumns],
  );

  const tableBuilderContentStyle = useMemo<React.CSSProperties>(() => ({
    width: totalTableWidth,
    minWidth: totalTableWidth,
  }), [totalTableWidth]);

  const handleAddColumn = useCallback(() => {
    setCols((prev) => [...prev, helpers.buildColumn(scope === 'detail' ? 'd_col' : `${scope}_col`, prev.length + 1)]);
  }, [helpers, scope, setCols]);

  const handleCanvasDoubleClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    onCanvasDoubleClick?.();
  }, [onCanvasDoubleClick]);

  const centeredCanvasPanelNode = useMemo(() => {
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
  }, [
    canvasLabel,
    detailBoardFeatureLabel,
    detailBoardTheme.badge,
    hasDetailBoardFeature,
    isCompactCanvas,
    isCompactModuleSetting,
    tableCanvasIconClass,
    tableCanvasPanelShellClass,
    tableCanvasTitleClass,
    tableSelected,
  ]);
  const centeredCanvasOverlayNode = useMemo(() => (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-4">
      {centeredCanvasPanelNode}
    </div>
  ), [centeredCanvasPanelNode]);

  const renderTableHead = useCallback((compactCanvasVariant: boolean) => (
    <>
      {headerColumns.map(({ col, index, normalizedCol, headerWidth, isCollapsedHeader, isTreeRelation }) => {
        const isActive = selectedId === col.id;
        const isMarkedForDelete = selectedForDeleteSet.has(col.id);
        const isDragging = draggingColumnId === col.id;
        const isResizing = activeResize?.id === col.id;
        const dropIndicatorPosition = dropIndicator?.kind === 'column' && dropIndicator.id === col.id
          ? dropIndicator.position
          : null;

        return (
          <th
            key={col.id}
            style={{ width: headerWidth, minWidth: headerWidth }}
            className={`group relative border-b border-r p-0 align-top ${headerDividerClass}`}
            onDragOver={(event) => handleColumnDragOver(event, col.id)}
            onDrop={(event) => handleColumnDrop(event, col.id)}
          >
            <button
              type="button"
              onClick={(event) => handleColumnHeaderClick(event, col.id)}
              onContextMenu={(event) => handleColumnHeaderContextMenu(event, col.id)}
              className={cn(
                `relative flex h-full w-full items-center overflow-hidden text-left transition-all ${getHeaderCornerClass(index)} ${isCollapsedHeader ? (compactCanvasVariant ? 'min-h-[34px] px-0 pr-1.5 py-0' : 'min-h-[36px] px-0 pr-1.5 py-0') : isCompactModuleSetting ? `${compactCanvasVariant ? 'min-h-[32px]' : 'min-h-[34px]'} px-1.5 pr-3 py-0` : `${compactCanvasVariant ? 'min-h-[38px]' : 'min-h-[42px]'} px-2 pr-3.5 py-0`} ${getHeaderButtonClass(isActive, isMarkedForDelete, isTreeRelation)}`,
                isDragging && 'opacity-70',
                dropIndicatorPosition && 'shadow-[inset_0_0_0_1px_var(--workspace-accent-border-strong)]',
              )}
              title="点击可选中字段"
            >
              <div className={`flex min-w-0 flex-1 items-center ${isCollapsedHeader ? 'justify-end' : ''}`}>
                <div
                  className={`inline-flex max-w-full items-center font-semibold tracking-[0.01em] transition-all ${isCollapsedHeader ? 'px-0 py-0 opacity-0' : ''} ${isCompactModuleSetting ? 'text-[11px]' : 'text-[12px]'} ${getHeaderLabelClass(isActive, isMarkedForDelete, isTreeRelation)}`}
                  title={normalizedCol.name}
                >
                  <span
                    draggable={!isCollapsedHeader}
                    onDragStart={(event) => handleColumnDragStart(event, col.id)}
                    onDragEnd={clearColumnDragState}
                    className={cn(
                      'truncate rounded-sm',
                      !isCollapsedHeader && 'cursor-grab active:cursor-grabbing',
                    )}
                    title="拖动标题可调整列顺序"
                  >
                    {normalizedCol.name}
                  </span>
                  {isTreeRelation && !isCollapsedHeader && (
                    <span className="ml-1.5 inline-flex items-center rounded-full bg-white/75 px-1.5 py-0.5 text-[9px] font-black leading-none text-[#2563eb] shadow-[0_10px_18px_-16px_rgba(37,99,235,0.7)] dark:bg-sky-500/16 dark:text-sky-100">
                      树
                    </span>
                  )}
                  <span className={`ml-0.5 text-[10px] leading-none ${getHeaderRequiredMarkClass(isActive, isMarkedForDelete, normalizedCol.required, isTreeRelation)}`}>*</span>
                </div>
              </div>
            </button>
            {dropIndicatorPosition && (
              <div
                className={cn(
                  'pointer-events-none absolute inset-y-1 z-30 w-[3px] rounded-full bg-[color:var(--workspace-accent-strong)] shadow-[0_0_0_2px_rgba(192,107,125,0.18)]',
                  dropIndicatorPosition === 'before' ? 'left-0 -translate-x-1/2' : 'right-0 translate-x-1/2',
                )}
              />
            )}
            <div
              className={`absolute bottom-0 right-0 top-0 z-20 flex ${isCompactModuleSetting ? 'w-2.5' : 'w-3'} cursor-col-resize items-center justify-center ${getHeaderResizeRailClass(isActive)}`}
              onMouseDown={(event) => {
                event.stopPropagation();
                startResize(event, col.id, cols, setCols, metrics.resizeMinWidth, metrics.resizeMaxWidth, 'column');
              }}
              onDoubleClick={(event) => {
                event.stopPropagation();
                autoFitColumnWidth(event, col.id, cols, setCols, metrics.minWidth, metrics.resizeMaxWidth, 'column');
              }}
              title="拖动调整列宽，双击自动适配"
            >
              <span className={`h-5 rounded-full transition-all ${isResizing ? 'bg-[#2563eb] shadow-[0_0_0_2px_rgba(37,99,235,0.12)]' : 'bg-transparent group-hover:bg-slate-300 dark:group-hover:bg-slate-500'} w-px`} />
            </div>
          </th>
        );
      })}
      <th
        style={{ width: addColumnWidth, minWidth: addColumnWidth }}
        onDragOver={handleAppendDragOver}
        onDrop={handleAppendDrop}
        className={cn(
          `relative border-b p-0 align-top ${addColumnHeaderShellClass}`,
          dropIndicator?.kind === 'append' && 'shadow-[inset_0_0_0_2px_var(--workspace-accent-border-strong)]',
        )}
      >
        <button
          type="button"
          onClick={handleAddColumn}
          className={`flex h-full w-full items-center justify-center rounded-tr-md transition-all ${isCompactModuleSetting ? (compactCanvasVariant ? 'min-h-[34px]' : 'min-h-[38px]') : (compactCanvasVariant ? 'min-h-[40px]' : 'min-h-[46px]')} hover:bg-white/55 dark:hover:bg-white/8`}
          title="新增字段"
        >
          <div className={`inline-flex items-center justify-center rounded-md border ${addColumnButtonClass} ${isCompactModuleSetting ? 'size-8' : 'size-9'}`}>
            <span className="material-symbols-outlined text-[17px]">add</span>
          </div>
        </button>
        {dropIndicator?.kind === 'append' && (
          <div className="pointer-events-none absolute inset-y-1 right-0 z-30 w-[3px] translate-x-1/2 rounded-full bg-[color:var(--workspace-accent-strong)] shadow-[0_0_0_2px_rgba(192,107,125,0.18)]" />
        )}
      </th>
    </>
  ), [
    addColumnButtonClass,
    addColumnHeaderShellClass,
    addColumnWidth,
    getHeaderButtonClass,
    getHeaderCornerClass,
    getHeaderLabelClass,
    getHeaderRequiredMarkClass,
    getHeaderResizeRailClass,
    handleAddColumn,
    handleAppendDragOver,
    handleAppendDrop,
    handleColumnDragOver,
    handleColumnDragStart,
    handleColumnDrop,
    handleColumnHeaderClick,
    handleColumnHeaderContextMenu,
    headerColumns,
    headerDividerClass,
    isCompactModuleSetting,
    autoFitColumnWidth,
    cols,
    clearColumnDragState,
    draggingColumnId,
    dropIndicator,
    metrics.minWidth,
    metrics.resizeMaxWidth,
    metrics.resizeMinWidth,
    selectedForDeleteSet,
    selectedId,
    setCols,
    startResize,
  ]);

  const compactTableHeadNode = useMemo(() => renderTableHead(true), [renderTableHead]);
  const standardTableHeadNode = useMemo(() => renderTableHead(false), [renderTableHead]);
  const tableColGroupNode = useMemo(() => (
    <colgroup>
      {headerColumns.map(({ col, headerWidth }) => (
        <col key={`col-${col.id}`} style={{ width: headerWidth, minWidth: headerWidth }} />
      ))}
      <col style={{ width: addColumnWidth, minWidth: addColumnWidth }} />
    </colgroup>
  ), [addColumnWidth, headerColumns]);

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

  if (backgroundSelectable) {
    return (
      <div style={workspaceThemeVars} className={`cloudy-cloud-grid relative flex min-h-0 min-w-0 w-full flex-col overflow-x-auto overflow-y-hidden rounded-[26px] border ${tableSurfaceClass} ${isCompactCanvas ? 'h-full min-h-[184px]' : 'h-full min-h-[260px]'} ${isCompactModuleSetting ? 'p-1.5' : 'p-2'}`}>
        <div className="min-w-0 shrink-0">
          <table
            style={{ ...tableBuilderContentStyle, tableLayout: 'fixed' }}
            className="table-fixed border-separate border-spacing-0 text-left text-[12px]"
          >
            {tableColGroupNode}
            <thead className={`sticky top-0 z-20 select-none bg-transparent ${tableSelected ? 'shadow-[inset_0_-1px_0_rgba(239,199,207,0.55)]' : ''}`}>
              <tr>{compactTableHeadNode}</tr>
            </thead>
          </table>
        </div>
        <div className="sticky left-0 z-10 mt-1 flex min-h-0 min-w-full flex-1">
          <button
            type="button"
            onClick={onSelectTable}
            onDoubleClick={handleCanvasDoubleClick}
            className={`relative flex h-full w-full items-center justify-center overflow-hidden rounded-[20px] border px-4 text-center transition-all dark:border-slate-700 ${tableCanvasClass} ${isCompactCanvas ? 'min-h-[108px] py-3' : 'min-h-[188px] py-6'} ${backgroundSelectable ? 'cursor-pointer' : 'cursor-default'}`}
          >
            <div className={`pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.28),transparent_62%)] ${tableSelected ? 'opacity-80' : 'opacity-100'}`} />
            {centeredCanvasOverlayNode}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={workspaceThemeVars} className={`cloudy-cloud-grid relative min-h-0 min-w-0 w-full overflow-x-auto overflow-y-hidden rounded-[26px] border ${tableSurfaceClass} ${isCompactModuleSetting ? 'p-1.5' : 'p-2'}`}>
      <table
        style={{ ...tableBuilderContentStyle, tableLayout: 'fixed' }}
        className="table-fixed overflow-hidden rounded-[18px] border-separate border-spacing-0 text-left text-[12px]"
      >
        {tableColGroupNode}
        <thead className={`sticky top-0 z-20 select-none bg-transparent ${tableSelected ? 'shadow-[inset_0_-1px_0_rgba(239,199,207,0.55)]' : ''}`}>
          <tr>{standardTableHeadNode}</tr>
        </thead>
        <tbody className="text-slate-600 dark:text-slate-300">
          <tr>
            <td colSpan={renderableCols.length + 1} className="p-0">
              <button
                type="button"
                onClick={onSelectTable}
                onDoubleClick={handleCanvasDoubleClick}
                className={`relative flex w-full items-center justify-start overflow-hidden rounded-b-md border-t px-4 text-center transition-all ${isCompactModuleSetting ? 'min-h-[190px] py-4' : 'min-h-[230px] py-6'} ${tableSelected ? 'border-[#efd6db]/85 bg-[#fff7f9] hover:bg-[#fff3f6] dark:border-rose-400/18 dark:bg-[#efc7cf]/10' : 'border-slate-100 bg-slate-50/60 hover:bg-slate-50 dark:border-slate-800 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(15,23,42,0.98))]'} ${backgroundSelectable ? 'cursor-pointer' : 'cursor-default'}`}
              >
                {centeredCanvasOverlayNode}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
});
