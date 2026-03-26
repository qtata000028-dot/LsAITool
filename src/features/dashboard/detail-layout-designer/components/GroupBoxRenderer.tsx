import clsx from 'clsx';
import type { ReactNode } from 'react';

import type { DetailLayoutItem, DetailLayoutMode } from '../types';

type GroupBoxRendererProps = {
  bodyClassName?: string;
  bodyRef?: (element: HTMLDivElement | null) => void;
  childCount?: number;
  children?: ReactNode;
  className?: string;
  dropHintText?: string;
  isDropActive?: boolean;
  item: DetailLayoutItem;
  mode: DetailLayoutMode;
  onSelect?: (itemId: string) => void;
  selected?: boolean;
};

export function GroupBoxRenderer({
  bodyClassName,
  bodyRef,
  childCount = 0,
  children,
  className,
  dropHintText = '把字段拖进这个分组框',
  isDropActive = false,
  item,
  mode,
  onSelect,
  selected = false,
}: GroupBoxRendererProps) {
  return (
    <div
      className={clsx(
        'flex h-full flex-col overflow-hidden rounded-[20px] border bg-white/92 shadow-[0_20px_40px_-30px_rgba(15,23,42,0.28)]',
        selected
          ? 'border-[color:var(--workspace-accent,#3162ff)] ring-2 ring-[color:var(--workspace-accent-soft,rgba(49,98,255,0.18))]'
          : 'border-slate-200/80',
        mode === 'design' ? 'cursor-default' : 'pointer-events-none',
        className,
      )}
      onMouseDown={(event) => {
        onSelect?.(item.id);
      }}
    >
      <div className={clsx('flex h-10 items-center border-b border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.98),rgba(255,255,255,0.92))] px-3', mode === 'design' ? 'detail-layout-groupbox-handle cursor-move' : '')}>
        <span className="truncate text-[12px] font-semibold text-slate-700">{item.title || '分组框'}</span>
      </div>
      <div
        ref={bodyRef}
        className={clsx(
          'relative m-3 min-h-0 flex-1 rounded-[14px] border border-dashed border-slate-200/80 bg-slate-50/70 p-2',
          bodyClassName,
        )}
      >
        {mode === 'design' && childCount === 0 ? (
          <div
            className={clsx(
              'pointer-events-none absolute inset-2 flex flex-col items-center justify-center rounded-[12px] border border-dashed px-4 text-center transition-colors',
              isDropActive
                ? 'border-[color:var(--workspace-accent-border,#8fb0ff)] bg-[color:var(--workspace-accent-soft,rgba(49,98,255,0.08))] text-[color:var(--workspace-accent-strong,#3152c8)]'
                : 'border-slate-200/80 bg-white/55 text-slate-400',
            )}
          >
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em]">GroupBox</div>
            <div className="mt-2 text-xs leading-5">{dropHintText}</div>
          </div>
        ) : null}
        {mode === 'design' && childCount > 0 && isDropActive ? (
          <div className="pointer-events-none absolute inset-2 rounded-[12px] border border-[color:var(--workspace-accent-border,#8fb0ff)] bg-[color:var(--workspace-accent-soft,rgba(49,98,255,0.08))]">
            <div className="absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold text-[color:var(--workspace-accent-strong,#3152c8)] shadow-sm">
              释放到当前分组
            </div>
          </div>
        ) : null}
        {children}
      </div>
    </div>
  );
}
