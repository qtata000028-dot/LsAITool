import React from 'react';
import {
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { FileSpreadsheet, LayoutPanelTop, Plus, Table2 } from 'lucide-react';

import { cn } from '../../../lib/utils';

type BillCanvasFieldScope = 'main' | 'meta';

type BillHeaderItemDragData = {
  type: 'bill-header-item';
  fieldId: string;
  row: number;
  scope: BillCanvasFieldScope;
};

type BillHeaderRowDragData = {
  type: 'bill-header-row';
  row: number;
};

export type BillDocumentWorkbenchProps = {
  state: {
    activeBillResizeId: string | null;
    activeMenuName: string;
    billDocumentScale: number;
    billDocumentTone: 'blue' | 'red';
    billFieldLivePreview: {
      id: string;
      scope: BillCanvasFieldScope;
      width?: number;
    } | null;
    billHeaderWorkbenchDrag: {
      id: string;
      scope: BillCanvasFieldScope;
    } | null;
    billHeaderWorkbenchDropTarget: {
      row: number;
      beforeId: string | null;
    } | null;
    billMetaFields: any[];
    isConfigFullscreenActive: boolean;
    mainTableColumns: any[];
    selectedMainColId: string | null;
    selectedMainForDelete: string[];
    selectedTableConfigScope: string | null;
    workspaceThemeTableSurfaceClass: string;
    workspaceThemeVars: React.CSSProperties;
  };
  refs: {
    billDocumentPaperRef: React.RefObject<HTMLDivElement | null>;
    billDocumentViewportRef: React.RefObject<HTMLDivElement | null>;
    billHeaderCanvasRef: React.RefObject<HTMLDivElement | null>;
  };
  nodes: {
    billDetailTableBuilderNode: React.ReactNode;
  };
  actions: {
    activateColumnSelection: (scope: 'left' | 'main' | 'detail', id: string) => void;
    activateSourceGridSelection: () => void;
    activateTableConfigSelection: (scope: 'left' | 'main' | 'detail', id?: string) => void;
    autoArrangeBillHeaderFields: () => void;
    buildColumn: (prefix: string, index: number, overrides?: Record<string, any>) => any;
    commitBillHeaderFields: (updater: (fields: any[]) => any[]) => void;
    deleteSelectedColumns: (scope: 'left' | 'main' | 'detail', ids: string[]) => void;
    moveBillHeaderField: (fieldId: string, rowNumber: number, beforeId?: string | null) => void;
    setBillDocumentTone: (tone: 'blue' | 'red') => void;
    setBillHeaderWorkbenchDrag: (value: { id: string; scope: BillCanvasFieldScope } | null) => void;
    setBillHeaderWorkbenchDropTarget: (value: { row: number; beforeId: string | null } | null) => void;
    setBuilderSelectionContextMenu: (menu: any) => void;
    setSelectedMainForDelete: React.Dispatch<React.SetStateAction<string[]>>;
    showToast: (message: string) => void;
    startBillFieldResize: (event: React.MouseEvent<HTMLDivElement>, columnId: string, scope?: BillCanvasFieldScope) => void;
  };
  helpers: {
    clampValue: (value: number, min: number, max: number) => number;
    createRuntimeClassName: (prefix: string, id: string) => string;
    createRuntimeDeclarationBlock: (className: string, declarations: Record<string, number | string>) => string;
    getBillHeaderDragItemId: (fieldId: string, scope: BillCanvasFieldScope) => string;
    getBillHeaderDropItemId: (fieldId: string, scope: BillCanvasFieldScope) => string;
    getBillHeaderRowCount: () => number;
    getBillHeaderRowDropId: (row: number) => string;
    getCompactWorkbenchItemClass: (options: {
      selected?: boolean;
      dragging?: boolean;
      insertTarget?: boolean;
    }) => string;
    getOrderedBillHeaderFields: (billMetaFields: any[], mainTableColumns: any[], rowCount?: number) => any[];
    joinRuntimeDeclarationBlocks: (blocks: Array<string | null | undefined | false>) => string;
    normalizeColumn: (column: any) => any;
    renderFieldPreview: (column: any, index: number, mode: 'table' | 'filter' | 'condition') => React.ReactNode;
  };
  dnd: {
    DesignerWorkbenchDraggableItem: React.ComponentType<any>;
    DesignerWorkbenchDropLane: React.ComponentType<any>;
    rowActiveClass: string;
    rowEmptyClass: string;
    sensors: any;
  };
  constants: {
    billFormDefaultFontSize: number;
    billFormDefaultWidth: number;
    billFormMaxWidth: number;
    billFormMinWidth: number;
    billHeaderWorkbenchMinRows: number;
    conditionPanelRowGap: number;
    conditionPanelRowHeight: number;
  };
};

function isBillHeaderItemDragData(value: unknown): value is BillHeaderItemDragData {
  if (!value || typeof value !== 'object') return false;
  const data = value as Record<string, unknown>;
  return data.type === 'bill-header-item' && typeof data.fieldId === 'string' && typeof data.row === 'number';
}

function isBillHeaderRowDragData(value: unknown): value is BillHeaderRowDragData {
  if (!value || typeof value !== 'object') return false;
  const data = value as Record<string, unknown>;
  return data.type === 'bill-header-row' && typeof data.row === 'number';
}

export function BillDocumentWorkbench({
  state,
  refs: {
    billDocumentPaperRef,
    billDocumentViewportRef,
    billHeaderCanvasRef,
  },
  nodes,
  actions,
  helpers,
  dnd,
  constants,
}: BillDocumentWorkbenchProps) {
  const billViewportPaddingClass = 'p-0';
  const billPaperWrapClass = 'justify-stretch';
  const billPaperShellClass = 'flex h-full min-h-full flex-1 flex-col bg-transparent';
  const billHeaderPaddingClass = state.isConfigFullscreenActive ? 'px-3 pb-2 pt-3' : 'px-3 pb-2 pt-3';
  const billHeaderRowCount = helpers.getBillHeaderRowCount();
  const billCanvasFields = helpers.getOrderedBillHeaderFields(state.billMetaFields, state.mainTableColumns, billHeaderRowCount);
  const billHeaderRows = Array.from({ length: billHeaderRowCount }, (_, index) => index + 1);
  const headerWorkbenchHeight = billHeaderRowCount * constants.conditionPanelRowHeight
    + Math.max(0, billHeaderRowCount - 1) * constants.conditionPanelRowGap;
  const isBillHeaderPanelActive = state.selectedTableConfigScope === 'main';

  const buildSelectedIds = (columnId: string, append: boolean) => (
    state.selectedMainForDelete.includes(columnId)
      ? state.selectedMainForDelete
      : append
        ? Array.from(new Set([...state.selectedMainForDelete, columnId]))
        : [columnId]
  );

  const getBillHeaderFieldWidth = (field: any) => (
    Math.max(
      constants.billFormMinWidth,
      Math.min(
        constants.billFormMaxWidth,
        state.billFieldLivePreview?.id === field.id
          ? state.billFieldLivePreview.width ?? field.width ?? constants.billFormDefaultWidth
          : field.width ?? constants.billFormDefaultWidth,
      ),
    )
  );

  const getBillHeaderFieldRow = (field: any) => helpers.clampValue(
    Number.isFinite(Number(field?.panelRow)) ? Number(field.panelRow) : constants.billHeaderWorkbenchMinRows,
    constants.billHeaderWorkbenchMinRows,
    billHeaderRowCount,
  );

  const getBillHeaderPreviewShellClass = (fieldId: string, isSelected: boolean) => cn(
    helpers.createRuntimeClassName('bill-header-field-preview', fieldId),
    'pointer-events-none min-w-0 shrink-0',
    isSelected && '[&>div]:border-border/60 [&>div]:bg-background [&>div]:shadow-none',
  );

  const toggleBillFieldSelection = (columnId: string) => {
    const nextSelectedIds = state.selectedMainForDelete.includes(columnId)
      ? state.selectedMainForDelete.filter((item) => item !== columnId)
      : [...state.selectedMainForDelete, columnId];

    actions.setSelectedMainForDelete(nextSelectedIds);
    if (
      nextSelectedIds.length === 1
      && [...state.mainTableColumns, ...state.billMetaFields].some((column) => column.id === nextSelectedIds[0])
    ) {
      actions.activateColumnSelection('main', nextSelectedIds[0]);
    }
  };

  const handleBillFieldSelect = (event: React.MouseEvent<HTMLDivElement>, columnId: string) => {
    actions.setBuilderSelectionContextMenu(null);
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      event.stopPropagation();
      toggleBillFieldSelection(columnId);
      return;
    }

    actions.setSelectedMainForDelete([columnId]);
    actions.activateColumnSelection('main', columnId);
  };

  const handleBillFieldContextMenu = (event: React.MouseEvent<HTMLDivElement>, columnId: string) => {
    event.preventDefault();
    event.stopPropagation();
    const nextSelectedIds = buildSelectedIds(columnId, event.ctrlKey || event.metaKey);
    actions.setSelectedMainForDelete(nextSelectedIds);
    actions.activateColumnSelection('main', columnId);
    actions.setBuilderSelectionContextMenu({
      kind: 'column',
      scope: 'main',
      x: event.clientX,
      y: event.clientY,
      ids: nextSelectedIds,
    });
  };

  const clearBillHeaderWorkbenchDragState = () => {
    actions.setBillHeaderWorkbenchDrag(null);
    actions.setBillHeaderWorkbenchDropTarget(null);
  };

  const handleBillHeaderWorkbenchDragStart = (event: DragStartEvent) => {
    const activeData = event.active.data.current;
    if (!isBillHeaderItemDragData(activeData)) {
      return;
    }

    actions.setBillHeaderWorkbenchDrag({ id: activeData.fieldId, scope: activeData.scope });
    actions.setBillHeaderWorkbenchDropTarget(null);
  };

  const handleBillHeaderWorkbenchDragOver = (event: DragOverEvent) => {
    const activeData = event.active.data.current;
    const overData = event.over?.data.current;
    if (!isBillHeaderItemDragData(activeData)) {
      return;
    }

    if (isBillHeaderItemDragData(overData)) {
      if (overData.fieldId === activeData.fieldId) {
        actions.setBillHeaderWorkbenchDropTarget(null);
        return;
      }

      actions.setBillHeaderWorkbenchDropTarget({ row: overData.row, beforeId: overData.fieldId });
      return;
    }

    if (isBillHeaderRowDragData(overData)) {
      actions.setBillHeaderWorkbenchDropTarget({ row: overData.row, beforeId: null });
      return;
    }

    actions.setBillHeaderWorkbenchDropTarget(null);
  };

  const handleBillHeaderWorkbenchDragEnd = (event: DragEndEvent) => {
    const activeData = event.active.data.current;
    const overData = event.over?.data.current;
    if (!isBillHeaderItemDragData(activeData)) {
      clearBillHeaderWorkbenchDragState();
      return;
    }

    if (isBillHeaderItemDragData(overData)) {
      if (overData.fieldId !== activeData.fieldId) {
        actions.moveBillHeaderField(activeData.fieldId, overData.row, overData.fieldId);
      }
      clearBillHeaderWorkbenchDragState();
      return;
    }

    if (isBillHeaderRowDragData(overData)) {
      actions.moveBillHeaderField(activeData.fieldId, overData.row);
      clearBillHeaderWorkbenchDragState();
      return;
    }

    clearBillHeaderWorkbenchDragState();
  };

  const handleBillHeaderPaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    const text = event.clipboardData.getData('text');
    if (!text) return;
    const fieldNames = text.split(/[\t\n]/).map((item) => item.trim()).filter(Boolean);
    if (fieldNames.length === 0) return;
    event.preventDefault();
    const targetRow = billHeaderRowCount;
    actions.commitBillHeaderFields((fields) => {
      const nextMainIndex = fields.filter((field) => !String(field.id).startsWith('bill_meta_')).length;
      const appendedFields = fieldNames.map((name, index) => actions.buildColumn('m_col', nextMainIndex + index + 1, {
        name,
        width: constants.billFormDefaultWidth,
        panelRow: targetRow,
      }));
      return [...fields, ...appendedFields];
    });
  };

  const appendBillHeaderField = () => {
    const targetRow = billHeaderRowCount;
    actions.commitBillHeaderFields((fields) => {
      const nextMainIndex = fields.filter((field) => !String(field.id).startsWith('bill_meta_')).length;
      return [
        ...fields,
        actions.buildColumn('m_col', nextMainIndex + 1, {
          width: constants.billFormDefaultWidth,
          panelRow: targetRow,
        }),
      ];
    });
  };

  const billDocumentTitle = state.activeMenuName ? `${state.activeMenuName} - 制单` : '单据制单';
  const isBlueBillTone = state.billDocumentTone === 'blue';
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
    { icon: Table2, label: '来源表', action: () => actions.activateSourceGridSelection() },
    { icon: LayoutPanelTop, label: '整理', action: () => actions.autoArrangeBillHeaderFields() },
    { icon: Plus, label: '控件', action: appendBillHeaderField },
  ];
  const headerWorkbenchHeightClass = helpers.createRuntimeClassName('bill-header-height', `rows-${billHeaderRowCount}`);
  const billHeaderRuntimeRules = helpers.joinRuntimeDeclarationBlocks([
    helpers.createRuntimeDeclarationBlock(headerWorkbenchHeightClass, { 'min-height': headerWorkbenchHeight }),
    ...billCanvasFields.flatMap((column) => {
      const normalizedColumn = helpers.normalizeColumn(column);
      const fieldWidth = getBillHeaderFieldWidth(column);
      const labelWidth = Math.max(60, Math.min(132, normalizedColumn.name.length * 14 + 10));
      const fontSize = Math.max(11, Math.min(18, Number(normalizedColumn.fontSize) || constants.billFormDefaultFontSize)) + 1;
      const previewWidth = Math.max(104, fieldWidth - labelWidth - 18);
      const widthClassName = helpers.createRuntimeClassName('bill-header-field-width', column.id);
      const labelClassName = helpers.createRuntimeClassName('bill-header-field-label', column.id);
      const fontClassName = helpers.createRuntimeClassName('bill-header-field-font', column.id);
      const previewClassName = helpers.createRuntimeClassName('bill-header-field-preview', column.id);

      return [
        helpers.createRuntimeDeclarationBlock(widthClassName, { width: fieldWidth, 'min-width': fieldWidth }),
        helpers.createRuntimeDeclarationBlock(labelClassName, { width: labelWidth, 'min-width': labelWidth }),
        helpers.createRuntimeDeclarationBlock(fontClassName, { 'font-size': fontSize }),
        helpers.createRuntimeDeclarationBlock(previewClassName, { width: previewWidth, 'min-width': previewWidth }),
      ];
    }),
  ]);
  const draggedBillHeaderField = state.billHeaderWorkbenchDrag
    ? billCanvasFields.find((field) => field.id === state.billHeaderWorkbenchDrag?.id) ?? null
    : null;
  const isBillHeaderCanvasEmpty = billCanvasFields.length === 0;

  return (
    <div
      style={state.workspaceThemeVars}
      className={`flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-white ${state.workspaceThemeTableSurfaceClass}`}
    >
      {billHeaderRuntimeRules ? <style>{billHeaderRuntimeRules}</style> : null}
      <div ref={billDocumentViewportRef} className={`min-h-0 flex-1 overflow-hidden ${billViewportPaddingClass}`}>
        <div className={`flex h-full min-h-0 items-stretch overflow-hidden ${billPaperWrapClass}`}>
          <div
            ref={billDocumentPaperRef}
            className="flex h-full min-h-full w-full shrink-0 flex-col max-w-none"
            style={{ zoom: state.billDocumentScale } as React.CSSProperties}
          >
            <div className={billPaperShellClass}>
              

              <div className={`h-1 bg-[linear-gradient(90deg,#2f6fed_0%,#5e90ff_40%,#8db5ff_100%)] shrink-0`} />

              <div className={`border-b border-[#e8eef6] shrink-0 bg-[#fbfcfe] ${billHeaderPaddingClass}`}>
                <div className="relative">
                  <div className="px-8 text-center">
                    <div className={`text-[31px] font-black tracking-[0.22em] transition-colors ${billToneMeta.title}`}>{billDocumentTitle}</div>
                    <div className={`mx-auto mt-3 h-px w-[54%] transition-colors ${billToneMeta.divider}`} />
                    <div className="mt-4 flex items-center justify-center">
                      <div className="inline-flex items-center gap-4 rounded-md border border-[#dbe6f2] bg-white px-4 py-1.5 text-[11px]">
                        <button
                          type="button"
                          onClick={() => actions.setBillDocumentTone('blue')}
                          className={`inline-flex items-center gap-2 transition-colors ${isBlueBillTone ? billToneMeta.radioActiveText : 'text-slate-500 hover:text-slate-700'}`}
                        >
                          <span className={`inline-flex h-4 w-4 items-center justify-center rounded-full border bg-white transition-colors ${isBlueBillTone ? billToneMeta.radioActiveBorder : 'border-slate-300'}`}>
                            {isBlueBillTone ? <span className={`h-2 w-2 rounded-full ${billToneMeta.radioActiveDot}`} /> : null}
                          </span>
                          蓝字单据
                        </button>
                        <button
                          type="button"
                          onClick={() => actions.setBillDocumentTone('red')}
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

              <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-none bg-[linear-gradient(180deg,#fbfdff_0%,#f2f7fb_100%)] p-1.5 shadow-[0_24px_48px_-44px_rgba(96,165,250,0.22)]">
                <div className="flex h-full min-h-0 flex-1 gap-3">
                  <div className="grid h-full min-h-0 flex-1 overflow-hidden grid-rows-[auto_minmax(0,1fr)] gap-y-2.5">
                    <div className="relative min-h-0 min-w-0 overflow-hidden">
                      <div className="flex min-h-0 min-w-0 flex-col">
                        <div
                          ref={billHeaderCanvasRef}
                          tabIndex={0}
                          style={{
                            ...documentGuideStyle,
                            minHeight: isBillHeaderCanvasEmpty ? 260 : headerWorkbenchHeight,
                          }}
                          onClick={() => {
                            actions.setSelectedMainForDelete([]);
                            actions.activateTableConfigSelection('main');
                          }}
                          onPaste={handleBillHeaderPaste}
                          className={cn(
                            'relative overflow-hidden rounded-[18px] border border-[#d6e2f1] bg-[#fcfdff] outline-none transition-shadow',
                            !isBillHeaderCanvasEmpty && 'px-3 py-3',
                            isBillHeaderPanelActive && 'shadow-[inset_0_0_0_2px_rgba(47,111,237,0.28)]',
                          )}
                        >
                    {!isBillHeaderCanvasEmpty ? (
                      <DndContext
                        sensors={dnd.sensors}
                        onDragStart={handleBillHeaderWorkbenchDragStart}
                        onDragOver={handleBillHeaderWorkbenchDragOver}
                        onDragEnd={handleBillHeaderWorkbenchDragEnd}
                        onDragCancel={clearBillHeaderWorkbenchDragState}
                      >
                        <div className={cn(headerWorkbenchHeightClass, 'flex flex-col gap-1')}>
                          {billHeaderRows.map((rowNumber) => {
                            const rowFields = billCanvasFields.filter((field) => getBillHeaderFieldRow(field) === rowNumber);
                            const isRowDropTarget = state.billHeaderWorkbenchDrag !== null
                              && state.billHeaderWorkbenchDropTarget?.row === rowNumber
                              && state.billHeaderWorkbenchDropTarget.beforeId === null;

                            return (
                              <dnd.DesignerWorkbenchDropLane
                                key={`bill-header-row-${rowNumber}`}
                                dropId={helpers.getBillHeaderRowDropId(rowNumber)}
                                data={{
                                  type: 'bill-header-row',
                                  row: rowNumber,
                                } as BillHeaderRowDragData}
                                className={cn(
                                  'scrollbar-none flex min-h-[48px] items-center overflow-visible rounded-lg border border-transparent bg-transparent px-0.5 py-1 transition-colors',
                                  isRowDropTarget && dnd.rowActiveClass,
                                  rowFields.length === 0 && dnd.rowEmptyClass,
                                )}
                              >
                                <div className="flex min-w-full items-center">
                                  <div className="flex min-w-0 flex-1 items-center gap-1">
                                    {rowFields.length > 0 ? rowFields.map((column, index) => {
                                      const normalizedColumn = helpers.normalizeColumn(column);
                                      const columnScope = column.__scope as BillCanvasFieldScope;
                                      const isActive = state.selectedMainForDelete.length <= 1
                                        && state.selectedMainForDelete.includes(column.id)
                                        && state.selectedMainColId === column.id;
                                      const isMarkedForDelete = state.selectedMainForDelete.includes(column.id);
                                      const isDragging = state.billHeaderWorkbenchDrag?.id === column.id || state.activeBillResizeId === column.id;
                                      const isInsertTarget = state.billHeaderWorkbenchDrag !== null
                                        && state.billHeaderWorkbenchDropTarget?.row === rowNumber
                                        && state.billHeaderWorkbenchDropTarget.beforeId === column.id
                                        && state.billHeaderWorkbenchDrag.id !== column.id;
                                      const widthClassName = helpers.createRuntimeClassName('bill-header-field-width', column.id);
                                      const labelClassName = helpers.createRuntimeClassName('bill-header-field-label', column.id);
                                      const fontClassName = helpers.createRuntimeClassName('bill-header-field-font', column.id);
                                      const previewClassName = helpers.createRuntimeClassName('bill-header-field-preview', column.id);
                                      const isSelected = isActive || isMarkedForDelete || isInsertTarget;

                                      return (
                                        <dnd.DesignerWorkbenchDraggableItem
                                          key={column.id}
                                          dragId={helpers.getBillHeaderDragItemId(column.id, columnScope)}
                                          dropId={helpers.getBillHeaderDropItemId(column.id, columnScope)}
                                          data={{
                                            type: 'bill-header-item',
                                            fieldId: column.id,
                                            row: rowNumber,
                                            scope: columnScope,
                                          } as BillHeaderItemDragData}
                                          itemAttributes={{
                                            'data-bill-field-id': String(column.id),
                                            'data-bill-field-scope': String(columnScope),
                                          }}
                                          onClick={(event: React.MouseEvent<HTMLDivElement>) => {
                                            event.stopPropagation();
                                            handleBillFieldSelect(event, column.id);
                                          }}
                                          onContextMenu={(event: React.MouseEvent<HTMLDivElement>) => handleBillFieldContextMenu(event, column.id)}
                                          onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>) => {
                                            if (event.key === 'Enter' || event.key === ' ') {
                                              event.preventDefault();
                                              event.stopPropagation();
                                              actions.setSelectedMainForDelete([column.id]);
                                              actions.activateColumnSelection('main', column.id);
                                            }
                                          }}
                                          className={cn(
                                            helpers.getCompactWorkbenchItemClass({
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
                                            {helpers.renderFieldPreview(normalizedColumn, index, 'condition')}
                                          </div>
                                          <div
                                            data-drag-resize-handle="true"
                                            className="absolute inset-y-0 right-0 flex w-2 cursor-col-resize items-stretch justify-end"
                                            onMouseDown={(event: React.MouseEvent<HTMLDivElement>) => actions.startBillFieldResize(event, column.id, columnScope)}
                                            title="拖动调整控件宽度"
                                          >
                                            <span className="h-full w-px bg-border/80 transition-colors group-hover:bg-primary" />
                                          </div>
                                        </dnd.DesignerWorkbenchDraggableItem>
                                      );
                                    }) : isRowDropTarget && draggedBillHeaderField ? (
                                      <div
                                        className={cn(
                                          helpers.createRuntimeClassName('bill-header-field-width', draggedBillHeaderField.id),
                                          helpers.getCompactWorkbenchItemClass({ selected: true }),
                                          'pointer-events-none h-[44px] shrink-0 gap-1 rounded-md border-dashed border-primary/35 bg-background/85 pr-3.5 text-left shadow-sm',
                                        )}
                                      >
                                        <div
                                          className={cn(
                                            helpers.createRuntimeClassName('bill-header-field-label', draggedBillHeaderField.id),
                                            helpers.createRuntimeClassName('bill-header-field-font', draggedBillHeaderField.id),
                                            'pointer-events-none shrink-0 truncate text-left text-[11px] font-medium text-foreground',
                                          )}
                                          title={helpers.normalizeColumn(draggedBillHeaderField).name}
                                        >
                                          <span className="block truncate">{helpers.normalizeColumn(draggedBillHeaderField).name}</span>
                                        </div>
                                        <div className={cn(helpers.createRuntimeClassName('bill-header-field-preview', draggedBillHeaderField.id), 'pointer-events-none min-w-0 shrink-0')}>
                                          {helpers.renderFieldPreview(helpers.normalizeColumn(draggedBillHeaderField), 0, 'condition')}
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="text-xs font-medium text-muted-foreground">
                                        拖入本行
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </dnd.DesignerWorkbenchDropLane>
                            );
                          })}
                        </div>
                      </DndContext>
                    ) : (
                      <div className="flex min-h-[260px] items-center justify-center">
                        <div className="flex flex-col items-center gap-4 px-6 py-8 text-center">
                            <div className="flex size-12 items-center justify-center rounded-md bg-primary/10 text-primary">
                              <FileSpreadsheet className="size-5" />
                            </div>
                            <div className="text-sm font-semibold text-foreground">将 Excel 字段复制到单据抬头</div>
                        </div>
                      </div>
                    )}
                    </div>
                  </div>
                </div>
                  
                <div className="relative flex min-h-0 flex-col overflow-hidden before:pointer-events-none before:absolute before:inset-x-8 before:-top-1 before:h-px before:bg-[linear-gradient(90deg,transparent,rgba(148,163,184,0.58),transparent)]">
                    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[18px] border border-[#d6e2f1] bg-white shadow-none">
                      {nodes.billDetailTableBuilderNode}
                    </div>
                  </div>
                </div>

                    <aside className="relative flex min-h-[0] w-[64px] shrink-0 flex-col gap-3 before:absolute before:-left-[7px] before:bottom-0 before:top-0 before:w-px before:bg-gradient-to-b before:from-transparent before:via-[#dce5f0] before:to-transparent">
                      {actionRailItems.map((item) => (
                        <button
                          key={item.label}
                          type="button"
                          className="group flex h-[64px] w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-[#e2e8f0] bg-white/60 text-slate-600 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all hover:-translate-y-[1px] hover:border-[#cbd5e1] hover:bg-white hover:text-slate-900 hover:shadow-[0_4px_12px_rgba(15,23,42,0.06)]"
                          onClick={item.action}
                        >
                          <item.icon className="size-[22px] text-slate-400 transition-colors group-hover:text-primary" strokeWidth={1.5} />
                          <span className="text-[11px] font-semibold tracking-wide">{item.label}</span>
                        </button>
                      ))}
                    </aside>
                  </div>
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
