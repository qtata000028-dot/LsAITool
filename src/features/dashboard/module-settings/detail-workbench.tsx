import React from 'react';
import { BarChart3, FolderTree, Globe, Plus, Table2 } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Badge } from '../../../components/ui/badge';

type DetailTab = {
  id: string;
  name: string;
};

type DetailTabStripProps = {
  detailTabs: DetailTab[];
  activeTab: string;
  currentDetailFillType: string;
  onActivateTab: (tabId: string) => void;
  onAddTab: () => void;
  addLabel?: string;
  showModeBadge?: boolean;
};

type DocumentDetailWorkbenchProps = {
  tableSurfaceClass: string;
  detailTabStripNode: React.ReactNode;
  currentDetailFillType: string;
  onPasteTableColumns: React.ClipboardEventHandler<HTMLDivElement>;
  tableBuilderNode: React.ReactNode;
  fillPlaceholderNode: React.ReactNode;
};

function getDetailFillTypeMeta(fillType?: string) {
  switch (fillType) {
    case '树表格':
      return { icon: FolderTree, label: '树表格' };
    case '图表':
      return { icon: BarChart3, label: '图表' };
    case '网页':
      return { icon: Globe, label: '网页' };
    default:
      return { icon: Table2, label: '表格' };
  }
}

export const MemoDetailTabStrip = React.memo(function DetailTabStrip({
  detailTabs,
  activeTab,
  currentDetailFillType,
  onActivateTab,
  onAddTab,
  addLabel,
  showModeBadge = true,
}: DetailTabStripProps) {
  const activeTabMeta = getDetailFillTypeMeta(currentDetailFillType);
  const ActiveDetailIcon = activeTabMeta.icon;

  return (
    <div className="flex w-full flex-col gap-0 xl:flex-row xl:items-end xl:justify-between">
      <div className="min-w-0 overflow-x-auto">
        <div className="inline-flex min-w-max items-end border-b border-[#d7e2ec] bg-white">
          {detailTabs.map((tab, index) => {
            const isActive = activeTab === tab.id;

            return (
              <div
                key={tab.id}
                title={tab.name}
                className={cn(
                  'group relative -mb-px -ml-px flex h-9 min-w-[96px] max-w-[176px] items-center border px-3 first:ml-0 transition-colors',
                  isActive
                    ? 'z-20 border border-[#d7e2ec] border-b-white bg-white text-slate-900'
                    : 'z-0 border-[#d7e2ec] bg-[#f6f9fc] text-slate-500 hover:bg-[#fbfdff] hover:text-slate-700',
                )}
              >
                {isActive ? (
                  <span className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-[color:var(--workspace-accent)]" />
                ) : null}
                <button
                  type="button"
                  onClick={() => onActivateTab(tab.id)}
                  className={cn(
                    'flex h-full min-w-0 flex-1 items-center truncate px-4 text-left text-[12px] font-medium leading-none transition-colors',
                    isActive
                      ? 'text-slate-900'
                      : 'text-slate-500 group-hover:text-slate-700 dark:text-slate-300 dark:group-hover:text-slate-100',
                  )}
                  aria-label={tab.name}
                >
                  <span className="truncate">{tab.name}</span>
                </button>
              </div>
            );
          })}

          <button
            type="button"
            onClick={onAddTab}
            title={addLabel ?? '新增页签'}
            aria-label={addLabel ?? '新增页签'}
            className="relative -mb-px -ml-px flex h-9 w-10 shrink-0 items-center justify-center border border-[#d7e2ec] bg-[#f6f9fc] text-slate-500 transition-colors hover:z-10 hover:border-[color:var(--workspace-accent-border-strong)] hover:bg-white hover:text-[color:var(--workspace-accent-strong)]"
          >
            <Plus className="size-4" />
          </button>
        </div>
      </div>

      {showModeBadge ? (
        <Badge
          variant="muted"
          className="h-8 gap-1.5 rounded-none border-[#d7e2ec] bg-[#eef3f8] px-2.5 text-[11px] font-medium text-slate-600"
        >
          <ActiveDetailIcon className="size-3.5" />
          <span>{activeTabMeta.label}视图</span>
        </Badge>
      ) : null}
    </div>
  );
});

export const MemoDocumentDetailWorkbench = React.memo(function DocumentDetailWorkbench({
  tableSurfaceClass,
  detailTabStripNode,
  currentDetailFillType,
  onPasteTableColumns,
  tableBuilderNode,
  fillPlaceholderNode,
}: DocumentDetailWorkbenchProps) {
  return (
    <div className={cn('relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-white', tableSurfaceClass)}>
      <div className="border-b border-[#d7e2ec] bg-[#eef3f8]">{detailTabStripNode}</div>
      {currentDetailFillType === '表格' ? (
        <div
          className="scrollbar-none min-h-0 flex-1 overflow-auto bg-transparent outline-none"
          tabIndex={0}
          onPaste={onPasteTableColumns}
        >
          {tableBuilderNode}
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 bg-[#fafcff] p-2">
          {fillPlaceholderNode}
        </div>
      )}
    </div>
  );
});
