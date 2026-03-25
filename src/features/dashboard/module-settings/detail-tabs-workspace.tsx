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
        'flex min-h-[156px] w-full flex-col items-center justify-center gap-3 rounded-md border border-dashed px-6 py-7 text-center shadow-sm transition-all',
        isSelected
          ? 'border-primary bg-primary/5 text-foreground ring-2 ring-primary ring-offset-1'
          : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:bg-accent/30',
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
  const contentPadding = isConfigFullscreenActive ? 'p-4' : 'p-5';
  const activeTabLabel = detailTabs.find((tab) => tab.id === activeTab)?.name || '当前明细';

  return (
    <div className={`flex h-full min-h-0 flex-col ${contentPadding}`}>
      <div className={cn('mb-3 flex flex-wrap items-center justify-between gap-2 px-1', isConfigFullscreenActive ? 'mb-3' : 'mb-4')}>
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
            <div className="flex items-center justify-between px-4 py-2">
              <div className="flex items-center gap-2">
                <Table2 className="size-4 text-primary" />
                <div className="text-[12px] font-medium text-foreground">明细字段</div>
              </div>
              <div className="flex items-center gap-2">
                {selectedDetailForDelete.length > 0 ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onDeleteSelectedColumns}
                    className="gap-1 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                    删除 ({selectedDetailForDelete.length})
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  onClick={onAddField}
                  className="gap-1"
                >
                  <Plus className="size-4" />
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
          <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border/70 bg-background/80 px-3 py-2">
              <div className="min-w-0 flex-1">
                <div className="text-[12px] font-medium text-foreground">网页明细预览</div>
                <div className="mt-1 truncate text-[11px] text-muted-foreground">
                  {detailWebUrl || '当前明细还没有可用的网页地址'}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenWebConfig}
              >
                配置网页
              </Button>
            </div>
            {detailWebUrl ? (
              <div className="min-h-0 flex-1 overflow-hidden rounded-md border border-border/70 bg-background shadow-sm">
                <iframe
                  title={`${activeTabLabel} 网页预览`}
                  src={detailWebUrl}
                  className="h-full w-full border-0 bg-white"
                />
              </div>
            ) : (
              <div className="min-h-0 flex-1 p-0">
                <DetailFillPlaceholder
                  currentDetailFillType={currentDetailFillType}
                  isSelected={isDetailViewSelected}
                  onActivate={onActivateCurrentView}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="min-h-0 flex-1 p-4">
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
