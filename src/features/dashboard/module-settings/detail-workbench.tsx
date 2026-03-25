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
    <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        {detailTabs.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <div
              key={tab.id}
              className={cn(
                'group flex min-w-[124px] items-center gap-1.5 rounded-[14px] border px-2 py-1.5 transition-all',
                isActive
                  ? 'border-primary bg-primary text-white'
                  : 'border-border/70 bg-background/88 text-slate-600 shadow-[0_12px_22px_-22px_rgba(15,23,42,0.18)] hover:border-primary/30 hover:bg-background dark:border-white/10 dark:bg-slate-900/50 dark:text-slate-300 dark:hover:border-primary/30 dark:hover:bg-slate-900/80',
              )}
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onActivateTab(tab.id)}
                className={cn(
                  'h-auto min-w-0 flex-1 justify-start rounded-[10px] px-2 py-1 text-left shadow-none hover:bg-transparent',
                  isActive
                    ? 'text-white hover:bg-transparent hover:text-white'
                    : 'text-foreground hover:bg-transparent hover:text-foreground',
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className={cn('block truncate text-[12px] font-semibold', isActive && 'text-white')}>
                    {tab.name}
                  </span>
                </span>
              </Button>
              {detailTabs.length > 1 ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(event) => onDeleteTab(tab.id, event)}
                  className={cn(
                    'size-8 shrink-0 rounded-2xl',
                    isActive
                      ? 'text-white/80 hover:bg-white/12 hover:text-white'
                      : 'text-muted-foreground hover:bg-destructive/10 hover:text-destructive',
                  )}
                  title="删除页签"
                >
                  <X className="size-3.5" />
                </Button>
              ) : null}
            </div>
          );
        })}

        <Button
          variant="outline"
          size="sm"
          onClick={onAddTab}
          className="h-10 gap-1.5 rounded-[12px] border-dashed border-primary/30 bg-primary/5 px-3 text-[11px] font-semibold text-primary hover:bg-primary/10 hover:text-primary"
        >
          <Plus className="size-4" />
          {addLabel ?? '新增页签'}
        </Button>
      </div>

      {showModeBadge ? (
        <Badge
          variant="muted"
          className="h-10 gap-2 rounded-md border-border px-3 font-medium text-foreground"
        >
          <ActiveDetailIcon className="size-4" />
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
      <div className="px-3 py-2.5">{detailTabStripNode}</div>
      {currentDetailFillType === '表格' ? (
        <div
          className="scrollbar-none min-h-0 flex-1 overflow-auto bg-transparent px-3 pb-3 pt-1 outline-none"
          tabIndex={0}
          onPaste={onPasteTableColumns}
        >
          {tableBuilderNode}
        </div>
      ) : (
        <div className="min-h-0 flex-1 bg-transparent px-3 pb-3 pt-1">
          {fillPlaceholderNode}
        </div>
      )}
    </div>
  );
});
