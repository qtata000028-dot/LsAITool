import React from 'react';
import { cn } from '../../../lib/utils';

type TableWorkbenchPanelProps = {
  bodyNode: React.ReactNode;
  bodyClassName?: string;
  bodyStyle?: React.CSSProperties;
  className?: string;
  footerNode?: React.ReactNode;
  headerNode?: React.ReactNode;
  onPaste?: React.ClipboardEventHandler<HTMLDivElement>;
};

export function TableWorkbenchPanel({
  bodyNode,
  bodyClassName,
  bodyStyle,
  className,
  footerNode,
  headerNode,
  onPaste,
}: TableWorkbenchPanelProps) {
  const panelGridClass = headerNode
    ? footerNode
      ? 'grid-rows-[auto_minmax(0,1fr)_auto]'
      : 'grid-rows-[auto_minmax(0,1fr)]'
    : footerNode
      ? 'grid-rows-[minmax(0,1fr)_auto]'
      : 'grid-rows-[minmax(0,1fr)]';

  return (
    <div
      className={cn(
        `relative grid h-full min-h-0 min-w-0 overflow-hidden rounded-[18px] border border-[#dbe5f3] bg-white shadow-[0_18px_36px_-32px_rgba(15,23,42,0.16)] ${panelGridClass}`,
        className,
      )}
    >
      {headerNode ? (
        <div className="border-b border-[#edf2f7] bg-white px-4 pt-2">
          <div className="min-w-0 overflow-hidden">{headerNode}</div>
        </div>
      ) : null}
      <div
        className={cn(
          'scrollbar-none flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden outline-none dark:bg-slate-900/90',
          bodyClassName,
        )}
        tabIndex={0}
        onPaste={onPaste}
        style={bodyStyle}
      >
        <div data-table-workbench-body-slot="true" className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {bodyNode}
        </div>
      </div>
      {footerNode ? footerNode : null}
    </div>
  );
}
