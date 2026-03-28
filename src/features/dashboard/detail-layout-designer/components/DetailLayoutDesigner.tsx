import { DndContext, DragOverlay } from '@dnd-kit/core';
import clsx from 'clsx';
import { useEffect, useRef, type ReactNode } from 'react';

import { DETAIL_LAYOUT_PALETTE_ITEMS, DETAIL_LAYOUT_REGISTRY } from '../registry';
import { useDetailDnD } from '../hooks/useDetailDnD';
import type { DetailLayoutDocument, DetailLayoutItem, DetailLayoutMode, DetailLayoutPaletteItem } from '../types';
import { DetailCanvas } from './DetailCanvas';
import { DetailPalette } from './DetailPalette';
import { DetailPropertyPanel } from './DetailPropertyPanel';
import { useDetailLayoutState } from '../hooks/useDetailLayoutState';
import { areDetailLayoutDocumentsEqual } from '../utils/layout';

type DetailLayoutDesignerProps = {
  allowFieldEdit?: boolean;
  allowParentIdEdit?: boolean;
  className?: string;
  defaultDocument?: DetailLayoutDocument;
  document?: DetailLayoutDocument;
  fieldOptions?: Array<{ label: string; value: string }>;
  mode?: DetailLayoutMode;
  onDocumentChange?: (document: DetailLayoutDocument) => void;
  onSelectedItemChange?: (item: DetailLayoutItem | null) => void;
  paletteItems?: DetailLayoutPaletteItem[];
  paletteTitle?: string;
  paletteDescription?: string;
  paletteVariant?: 'cards' | 'plain';
  renderItemContent?: (item: DetailLayoutItem) => ReactNode;
  toolbarActions?: ReactNode | ((helpers: {
    addPaletteItem: (paletteItem: DetailLayoutPaletteItem) => void;
    itemCount: number;
    selectedId: string | null;
    selectedItem: DetailLayoutItem | null;
  }) => ReactNode);
};

export function DetailLayoutDesigner({
  allowFieldEdit = true,
  allowParentIdEdit = true,
  className,
  defaultDocument,
  document,
  fieldOptions,
  mode = 'design',
  onDocumentChange,
  onSelectedItemChange,
  paletteItems = DETAIL_LAYOUT_PALETTE_ITEMS,
  paletteTitle,
  paletteDescription,
  paletteVariant = 'cards',
  renderItemContent,
  toolbarActions,
}: DetailLayoutDesignerProps) {
  const layoutState = useDetailLayoutState({
    defaultDocument,
    mode,
  });
  const onDocumentChangeRef = useRef(onDocumentChange);
  const onSelectedItemChangeRef = useRef(onSelectedItemChange);

  useEffect(() => {
    onDocumentChangeRef.current = onDocumentChange;
  }, [onDocumentChange]);

  useEffect(() => {
    onSelectedItemChangeRef.current = onSelectedItemChange;
  }, [onSelectedItemChange]);

  useEffect(() => {
    if (mode !== 'design') {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();
      const isEditableTarget = Boolean(
        target?.isContentEditable
        || tagName === 'input'
        || tagName === 'textarea'
        || tagName === 'select',
      );

      if (isEditableTarget) {
        return;
      }

      if ((event.key === 'Delete' || event.key === 'Backspace') && layoutState.selectedId) {
        event.preventDefault();
        layoutState.deleteSelectedItem();
        return;
      }

      if (event.key === 'Escape' && layoutState.selectedId) {
        event.preventDefault();
        layoutState.clearSelection();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [layoutState.clearSelection, layoutState.deleteSelectedItem, layoutState.selectedId, mode]);

  useEffect(() => {
    if (document && !areDetailLayoutDocumentsEqual(document, layoutState.document)) {
      layoutState.replaceDocument(document);
    }
  }, [document, layoutState.document, layoutState.replaceDocument]);

  useEffect(() => {
    onSelectedItemChangeRef.current?.(layoutState.selectedItem);
  }, [layoutState.selectedItem]);

  const handleAddPaletteItem = (paletteItem: DetailLayoutPaletteItem) => {
    layoutState.addItem(paletteItem.type, paletteItem.template);
  };
  const resolvedToolbarActions = typeof toolbarActions === 'function'
    ? toolbarActions({
        addPaletteItem: handleAddPaletteItem,
        itemCount: layoutState.document.items.length,
        selectedId: layoutState.selectedId,
        selectedItem: layoutState.selectedItem,
      })
    : toolbarActions;

  const detailDnD = useDetailDnD({
    enabled: mode === 'design',
    gridSize: layoutState.document.gridSize,
    mode,
    onAddItem: (paletteItem, overrides) => {
      layoutState.addItem(paletteItem.type, {
        ...(paletteItem.template ?? {}),
        ...(overrides ?? {}),
      });
    },
    onSetActiveParentId: layoutState.setActiveParentId,
    onSetHoveringId: layoutState.setHoveringId,
  });

  useEffect(() => {
    onDocumentChangeRef.current?.(layoutState.document);
  }, [layoutState.document]);

  return (
    <DndContext
      onDragCancel={detailDnD.onDragCancel}
      onDragEnd={detailDnD.onDragEnd}
      onDragOver={detailDnD.onDragOver}
      onDragStart={detailDnD.onDragStart}
      sensors={detailDnD.sensors}
    >
      <section className={clsx('flex h-full min-h-0 flex-col', className)}>
        <div className="grid h-full min-h-0 gap-4 xl:grid-cols-[240px_minmax(0,1fr)_300px]">
          <DetailPalette
            className="min-h-0 overflow-auto"
            description={paletteDescription}
            items={paletteItems}
            onAddItem={handleAddPaletteItem}
            title={paletteTitle}
            variant={paletteVariant}
          />

          <div className="flex min-h-0 flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-slate-200/80 bg-white/88 px-4 py-3 shadow-[0_20px_36px_-32px_rgba(15,23,42,0.25)]">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Designer</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  画布控件 {layoutState.document.items.length} 个
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {detailDnD.activePaletteType
                    ? `正在拖入：${DETAIL_LAYOUT_REGISTRY[detailDnD.activePaletteType].label}`
                    : layoutState.ui.draggingId || layoutState.ui.resizingId
                      ? '正在编辑控件位置或尺寸'
                      : '点击、拖入、移动或缩放控件'}
                </div>
                {mode === 'design' ? (
                  <div className="mt-1 text-[11px] text-slate-400">
                    快捷键：`Delete / Backspace` 删除选中，`Esc` 取消选中
                  </div>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                {resolvedToolbarActions}
                <button
                  className="rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-xs font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!layoutState.history.canUndo}
                  onClick={layoutState.history.undo}
                  type="button"
                >
                  撤销
                </button>
                <button
                  className="rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-xs font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!layoutState.history.canRedo}
                  onClick={layoutState.history.redo}
                  type="button"
                >
                  重做
                </button>
                <button
                  className="rounded-xl border border-rose-200/80 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!layoutState.selectedId}
                  onClick={layoutState.deleteSelectedItem}
                  type="button"
                >
                  删除选中
                </button>
              </div>
            </div>

            <DetailCanvas
              className="min-h-[720px] flex-1"
              document={layoutState.document}
              draggingId={layoutState.ui.draggingId}
              hoveringId={layoutState.ui.hoveringId}
              mode={layoutState.ui.mode}
              onBeginDragging={layoutState.beginDragging}
              onBeginResizing={layoutState.beginResizing}
              onCommitItemRect={layoutState.commitItemRect}
              onEndInteraction={layoutState.endInteraction}
              renderItemContent={renderItemContent}
              resizingId={layoutState.ui.resizingId}
              onSelectItem={layoutState.selectItem}
              selectedId={layoutState.selectedId}
            />
          </div>

          <DetailPropertyPanel
            allowFieldEdit={allowFieldEdit}
            allowParentIdEdit={allowParentIdEdit}
            fieldOptions={fieldOptions}
            item={layoutState.selectedItem}
            mode={layoutState.ui.mode}
            onChange={layoutState.updateSelectedItem}
          />
        </div>
      </section>

      <DragOverlay>
        {detailDnD.activePaletteType ? (
          <div className="rounded-[18px] border border-slate-200/80 bg-white/95 px-3 py-3 shadow-[0_24px_44px_-26px_rgba(15,23,42,0.28)]">
            <div className="text-sm font-semibold text-slate-900">{DETAIL_LAYOUT_REGISTRY[detailDnD.activePaletteType].label}</div>
            <div className="mt-1 text-xs text-slate-500">拖入到画布或分组框</div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
