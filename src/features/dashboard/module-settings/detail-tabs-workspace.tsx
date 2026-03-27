import React from 'react';
import { BarChart3, FolderTree, Globe, Plus, Table2, Trash2 } from 'lucide-react';

import { Button } from '../../../components/ui/button';
import { cn } from '../../../lib/utils';
import { MemoDetailTabStrip } from './detail-workbench';

function getDetailFillTypeMeta(fillType?: string) {
  switch (fillType) {
    case '树表格':
      return { label: '树表格', value: '树表格' };
    case '图表':
      return { label: '图表', value: '图表' };
    case '网页':
      return { label: '网页', value: '网页' };
    default:
      return { label: '表格', value: '表格' };
  }
}

function getDetailFillTypeIcon(fillType?: string) {
  switch (fillType) {
    case '树表格':
      return FolderTree;
    case '图表':
      return BarChart3;
    case '网页':
      return Globe;
    default:
      return Table2;
  }
}

type DetailTab = {
  id: string;
  name: string;
};

type DetailFillPlaceholderProps = {
  currentDetailFillType: string;
  isSelected: boolean;
  onActivate: () => void;
};

export function DetailFillPlaceholder({
  currentDetailFillType,
  isSelected,
  onActivate,
}: DetailFillPlaceholderProps) {
  const fillTypeMeta = getDetailFillTypeMeta(currentDetailFillType);
  const FillTypeIcon = getDetailFillTypeIcon(fillTypeMeta.value);

  return (
    <button
      type="button"
      onClick={onActivate}
      className={cn(
        'relative flex h-full min-h-0 w-full flex-1 items-center justify-center overflow-hidden rounded-[24px] border px-6 py-7 text-center transition-all',
        isSelected
          ? 'border-primary bg-primary/5 text-foreground ring-2 ring-primary ring-offset-1'
          : 'border-border/80 bg-background/92 text-muted-foreground hover:border-primary/40 hover:bg-accent/20',
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.34),transparent_60%)]" />
      <div
        className={cn(
          'relative z-10 flex w-full max-w-[360px] flex-col items-center gap-3 rounded-[18px] border px-6 py-7 shadow-[0_26px_50px_-40px_rgba(15,23,42,0.3)]',
          isSelected
            ? 'border-primary/25 bg-white/94'
            : 'border-white/80 bg-white/90 dark:border-slate-800/90 dark:bg-slate-950/84',
        )}
      >
        <div className="flex size-11 items-center justify-center rounded-md border border-border bg-muted text-primary">
          <FillTypeIcon className="size-5" />
        </div>
        <div className="space-y-1.5">
          <div className="text-[13px] font-semibold text-foreground">{fillTypeMeta.label} 视图预留区</div>
          <div className="max-w-sm text-[11px] leading-5 text-muted-foreground">
            {fillTypeMeta.value === '图表' ? '点击配置明细图表' : `点击配置明细${fillTypeMeta.label}`}
          </div>
        </div>
      </div>
    </button>
  );
}

type DetailTabsWorkspaceProps = {
  activeTab: string;
  currentDetailFillType: string;
  detailTabs: DetailTab[];
  detailWebUrl: string;
  isConfigFullscreenActive: boolean;
  isDetailViewSelected: boolean;
  onActivateCurrentView: () => void;
  onActivateTab: (tabId: string) => void;
  onAddTab: () => void;
  onAddField: () => void;
  onDeleteSelectedColumns: () => void;
  onDeleteTab: (tabId: string, event: React.MouseEvent) => void;
  onOpenWebConfig: () => void;
  onPasteTableColumns: React.ClipboardEventHandler<HTMLDivElement>;
  selectedDetailForDelete: string[];
  tableBuilderNode: React.ReactNode;
};

export function DetailTabsWorkspace({
  activeTab,
  currentDetailFillType,
  detailTabs,
  detailWebUrl,
  isConfigFullscreenActive,
  isDetailViewSelected,
  onActivateCurrentView,
  onActivateTab,
  onAddTab,
  onAddField,
  onDeleteSelectedColumns,
  onDeleteTab,
  onOpenWebConfig,
  onPasteTableColumns,
  selectedDetailForDelete,
  tableBuilderNode,
}: DetailTabsWorkspaceProps) {
  const contentPadding = isConfigFullscreenActive ? 'p-3' : 'p-4';
  const activeTabLabel = detailTabs.find((tab) => tab.id === activeTab)?.name || '当前明细';

  return (
    <div className={`flex h-full min-h-0 flex-col ${contentPadding}`}>
      <div className={cn('mb-2.5 flex flex-wrap items-center justify-between gap-2', isConfigFullscreenActive ? 'mb-2.5' : 'mb-3')}>
        <MemoDetailTabStrip
          detailTabs={detailTabs}
          activeTab={activeTab}
          currentDetailFillType={currentDetailFillType}
          onActivateTab={onActivateTab}
          onDeleteTab={onDeleteTab}
          onAddTab={onAddTab}
          addLabel="新增页签"
          showModeBadge={false}
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-transparent">
        {currentDetailFillType === '表格' ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-center justify-between gap-2 border-b border-[#e6edf5] bg-white px-3 py-2">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-[9px] border border-[#dbe5ef] bg-[#f8fbfe] text-[color:var(--workspace-accent-strong)]">
                  <Table2 className="size-3.5" />
                </div>
                <div className="text-[12px] font-medium text-slate-700">明细字段</div>
              </div>
              <div className="flex items-center gap-2">
                {selectedDetailForDelete.length > 0 ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onDeleteSelectedColumns}
                    className="h-8 gap-1 rounded-[10px] border-[#ead7d7] px-2.5 text-[11px] font-semibold text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 className="size-3.5" />
                    删除 ({selectedDetailForDelete.length})
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  onClick={onAddField}
                  className="h-8 gap-1 rounded-[10px] bg-[color:var(--workspace-accent)] px-2.5 text-[11px] font-semibold text-white shadow-none hover:bg-[color:var(--workspace-accent-strong)]"
                >
                  <Plus className="size-3.5" />
                  新增字段
                </Button>
              </div>
            </div>
            <div
              className="scrollbar-none min-h-0 flex-1 overflow-auto bg-transparent outline-none"
              tabIndex={0}
              onPaste={onPasteTableColumns}
            >
              {tableBuilderNode}
            </div>
          </div>
        ) : currentDetailFillType === '网页' ? (
          <div className="flex min-h-0 flex-1 flex-col gap-3 p-3">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-[#dbe5ef] bg-white px-3 py-2">
              <div className="min-w-0 flex-1">
                <div className="text-[12px] font-medium text-slate-700">网页明细预览</div>
                <div className="mt-1 truncate text-[11px] text-slate-400">
                  {detailWebUrl || '当前明细还没有可用的网页地址'}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenWebConfig}
                className="h-8 rounded-[10px] border-[#dbe5ef] px-2.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
              >
                配置网页
              </Button>
            </div>
            {detailWebUrl ? (
              <div className="min-h-0 flex-1 overflow-hidden rounded-[14px] border border-[#dbe5ef] bg-white">
                <iframe
                  title={`${activeTabLabel} 网页预览`}
                  src={detailWebUrl}
                  className="h-full w-full border-0 bg-white"
                />
              </div>
            ) : (
              <div className="min-h-0 flex-1">
                <DetailFillPlaceholder
                  currentDetailFillType={currentDetailFillType}
                  isSelected={isDetailViewSelected}
                  onActivate={onActivateCurrentView}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="min-h-0 flex-1">
            <DetailFillPlaceholder
              currentDetailFillType={currentDetailFillType}
              isSelected={isDetailViewSelected}
              onActivate={onActivateCurrentView}
            />
          </div>
        )}
      </div>
    </div>
  );
}
