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
  const stripLayoutClass = showModeBadge
    ? 'flex w-full flex-col gap-0 xl:flex-row xl:items-end xl:justify-between'
    : 'flex w-full min-w-0 items-end justify-start';

  return (
    <div className={stripLayoutClass}>
      <div className="-ml-px -mt-px min-w-0 overflow-x-auto overflow-y-hidden pr-px scrollbar-none">
        <div className="inline-flex min-w-max items-end border-b border-[#d5e0eb] bg-transparent">
          {detailTabs.map((tab) => {
            const isActive = activeTab === tab.id;

            return (
              <div key={tab.id} title={tab.name} className="relative">
                <button
                  type="button"
                  onClick={() => onActivateTab(tab.id)}
                  className={cn(
                    'relative -mb-px flex h-11 min-w-[116px] max-w-[196px] items-center truncate rounded-t-[14px] border border-b-0 px-4 text-left text-[12px] font-semibold leading-none tracking-[0.01em] transition-[background-color,border-color,box-shadow,color]',
                    isActive
                      ? 'border-[#d5e0eb] bg-white text-slate-900 shadow-[0_-16px_26px_-24px_rgba(15,23,42,0.26)]'
                      : 'border-transparent bg-transparent text-slate-500 hover:border-[#e3ebf4] hover:bg-[#f7fafc] hover:text-slate-700',
                  )}
                  aria-label={tab.name}
                >
                  {isActive ? (
                    <>
                      <span className="pointer-events-none absolute inset-x-3 top-0 h-[2px] rounded-full bg-[color:var(--workspace-accent)]" />
                      <span className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-white" />
                    </>
                  ) : null}
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
            className="relative -mb-px ml-px flex h-10 w-10 shrink-0 items-center justify-center rounded-t-[12px] border border-transparent border-b-0 bg-transparent text-slate-500 transition-[background-color,border-color,color,box-shadow] hover:border-[#dbe5ef] hover:bg-white hover:text-[color:var(--workspace-accent-strong)] hover:shadow-[0_-14px_22px_-22px_rgba(37,99,235,0.34)]"
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
    <div
      className={cn(
        'relative flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-[18px] border border-[#34455b]/68 bg-[linear-gradient(180deg,rgba(252,253,255,0.98),rgba(246,249,253,0.98))] shadow-[0_20px_42px_-34px_rgba(15,23,42,0.22)]',
        tableSurfaceClass,
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,var(--workspace-accent-border-strong),transparent)]" />
      <div className="flex min-w-0 items-end border-b border-[#d7e2ec] bg-[linear-gradient(180deg,#fbfdff_0%,#eef3f8_100%)] px-0 pt-0">
        <div className="min-w-0 flex-1 overflow-hidden">{detailTabStripNode}</div>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden bg-white">
        {currentDetailFillType === '表格' ? (
          <div
            className="workspace-scrollbar h-full min-h-0 overflow-x-hidden overflow-y-auto outline-none"
            tabIndex={0}
            onPaste={onPasteTableColumns}
          >
            {tableBuilderNode}
          </div>
        ) : (
          <div className="flex h-full min-h-0 bg-white">
            {fillPlaceholderNode}
          </div>
        )}
      </div>
    </div>
  );
});
