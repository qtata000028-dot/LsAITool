import { useDraggable } from '@dnd-kit/core';
import clsx from 'clsx';
import { CSS } from '@dnd-kit/utilities';
import { Fragment } from 'react';

import { DETAIL_LAYOUT_PALETTE_ITEMS } from '../registry';
import type { DetailLayoutPaletteItem } from '../types';
import { buildDetailPaletteDragData, createDetailPaletteDraggableId } from '../hooks/useDetailDnD';

type DetailPaletteProps = {
  className?: string;
  items?: DetailLayoutPaletteItem[];
  onAddItem: (item: DetailLayoutPaletteItem) => void;
};

type DetailPaletteCardProps = {
  item: DetailLayoutPaletteItem;
  onAddItem: (item: DetailLayoutPaletteItem) => void;
};

function DetailPaletteCard({ item, onAddItem }: DetailPaletteCardProps) {
  const {
    attributes,
    isDragging,
    listeners,
    setNodeRef,
    transform,
  } = useDraggable({
    data: buildDetailPaletteDragData(item),
    id: createDetailPaletteDraggableId(item.id),
  });

  return (
    <button
      ref={setNodeRef}
      className={clsx(
        'rounded-[18px] border border-slate-200/80 bg-slate-50/80 px-3 py-3 text-left transition-colors hover:border-[color:var(--workspace-accent-border,#8fb0ff)] hover:bg-white',
        isDragging ? 'opacity-55 shadow-[0_18px_36px_-24px_rgba(15,23,42,0.3)]' : '',
      )}
      onClick={() => onAddItem(item)}
      style={{
        transform: transform ? CSS.Translate.toString(transform) : undefined,
      }}
      type="button"
      {...attributes}
      {...listeners}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-slate-800">{item.label}</span>
        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-slate-500">
          {item.defaultSize.w}×{item.defaultSize.h}
        </span>
      </div>
      <div className="mt-1 text-xs leading-5 text-slate-500">{item.description}</div>
    </button>
  );
}

export function DetailPalette({ className, items = DETAIL_LAYOUT_PALETTE_ITEMS, onAddItem }: DetailPaletteProps) {
  return (
    <aside className={clsx('flex flex-col gap-3 rounded-[24px] border border-slate-200/80 bg-white/88 p-4 shadow-[0_24px_44px_-36px_rgba(15,23,42,0.28)]', className)}>
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Palette</div>
        <h3 className="mt-2 text-lg font-bold text-slate-900">控件物料</h3>
        <p className="mt-1 text-sm leading-6 text-slate-500">支持点击添加，也支持用 dnd-kit 从左侧拖入中间画布。</p>
      </div>

      <div className="grid gap-2">
        {items.map((item) => (
          <Fragment key={item.type}>
            <DetailPaletteCard
              item={item}
              onAddItem={onAddItem}
            />
          </Fragment>
        ))}
      </div>
    </aside>
  );
}
