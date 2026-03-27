import React from 'react';
import { BarChart3, FolderTree, Globe, Plus, Table2, X } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';

type DetailTab = {
  id: string;
  name: string;
};

type DetailTabStripProps = {
  detailTabs: DetailTab[];
  activeTab: string;
  currentDetailFillType: string;
  onActivateTab: (tabId: string) => void;
  onDeleteTab: (tabId: string, event: React.MouseEvent) => void;
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
  onDeleteTab,
  onAddTab,
  addLabel,
  showModeBadge = true,
}: DetailTabStripProps) {
  const activeTabMeta = getDetailFillTypeMeta(currentDetailFillType);
  const ActiveDetailIcon = activeTabMeta.icon;

  return (
    <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
        {detailTabs.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <div
              key={tab.id}
              className={cn(
                'group flex min-w-[104px] max-w-[188px] items-center gap-1 rounded-[12px] border px-1.5 py-1 transition-colors',
                isActive
                  ? 'border-[color:var(--workspace-accent-border-strong)] bg-[color:var(--workspace-accent-soft)] text-[color:var(--workspace-accent-strong)]'
                  : 'border-[#dbe5ef] bg-white text-slate-600 hover:border-[#c8d6e5] hover:bg-[#f8fbfe] dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-900',
              )}
            >
              <button
                type="button"
                onClick={() => onActivateTab(tab.id)}
                className={cn(
                  'min-w-0 flex-1 rounded-[9px] px-2 py-1 text-left transition-colors',
                  isActive
                    ? 'text-[color:var(--workspace-accent-strong)]'
                    : 'text-slate-700 hover:text-slate-900 dark:text-slate-100 dark:hover:text-white',
                )}
              >
                <span className="block truncate text-[12px] font-medium leading-5">{tab.name}</span>
              </button>
              <button
                type="button"
                onClick={(event) => onDeleteTab(tab.id, event)}
                className={cn(
                  'flex size-6 shrink-0 items-center justify-center rounded-[8px] transition-colors',
                  isActive
                    ? 'text-[color:var(--workspace-accent-strong)]/70 hover:bg-white/70 hover:text-[color:var(--workspace-accent-strong)]'
                    : 'text-slate-400 hover:bg-rose-50 hover:text-rose-500 dark:text-slate-500 dark:hover:bg-rose-500/10 dark:hover:text-rose-300',
                )}
                title="删除明细"
              >
                <X className="size-3.5" />
              </button>
            </div>
          );
        })}

        <Button
          variant="outline"
          size="sm"
          onClick={onAddTab}
          className="h-8 gap-1.5 rounded-[10px] border-dashed border-[#d3deea] bg-[#f8fbff] px-2.5 text-[11px] font-semibold text-[color:var(--workspace-accent-strong)] hover:border-[color:var(--workspace-accent-border-strong)] hover:bg-[color:var(--workspace-accent-soft)] hover:text-[color:var(--workspace-accent-strong)]"
        >
          <Plus className="size-3.5" />
          {addLabel ?? '新增页签'}
        </Button>
      </div>

      {showModeBadge ? (
        <Badge
          variant="muted"
          className="h-8 gap-1.5 rounded-[10px] border-[#dbe5ef] bg-[#f8fafc] px-2.5 text-[11px] font-medium text-slate-600"
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
    <div className={cn('relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-transparent', tableSurfaceClass)}>
      <div className="border-b border-[#e6edf5] bg-white px-2.5 py-2">{detailTabStripNode}</div>
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
