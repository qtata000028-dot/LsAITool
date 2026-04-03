import React from 'react';
import { Button, Empty, Flex, Typography } from 'antd';

import { getDetailFillTypePlaceholderMeta } from './dashboard-detail-fill-utils';
import { MemoDetailTabStrip } from './detail-workbench';

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
  const fillTypeMeta = getDetailFillTypePlaceholderMeta(currentDetailFillType);

  return (
    <div
      onClick={onActivate}
      className={`m-4 flex h-[calc(100%-2rem)] cursor-pointer items-center justify-center rounded-[16px] border ${isSelected ? 'border-[#91caff] bg-[#f6fbff]' : 'border-[#d9e2ec] bg-white'} shadow-none`}
    >
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={(
          <Flex vertical gap={4} align="center">
            <Typography.Text strong>{fillTypeMeta.label} 视图预留区</Typography.Text>
            <Typography.Text type="secondary">{fillTypeMeta.actionLabel}</Typography.Text>
          </Flex>
        )}
      />
    </div>
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
  isDetailViewSelected,
  onActivateCurrentView,
  onActivateTab,
  onAddTab,
  onAddField,
  onDeleteSelectedColumns,
  onOpenWebConfig,
  onPasteTableColumns,
  selectedDetailForDelete,
  tableBuilderNode,
}: DetailTabsWorkspaceProps) {
  const activeTabLabel = detailTabs.find((tab) => tab.id === activeTab)?.name || '当前明细';

  return (
    <div className="m-3 flex h-[calc(100%-1.5rem)] min-h-0 flex-col overflow-hidden rounded-[18px] border border-[#d9e2ec] bg-white shadow-none">
      <div className="border-b border-[#edf2f7] bg-white px-4 pt-2">
        <MemoDetailTabStrip
          detailTabs={detailTabs}
          activeTab={activeTab}
          currentDetailFillType={currentDetailFillType}
          onActivateTab={onActivateTab}
          onAddTab={onAddTab}
          addLabel="新增页签"
          showModeBadge={false}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-hidden bg-white">
        {currentDetailFillType === '表格' ? (
          <Flex vertical className="min-h-0 h-full">
            <Flex align="center" justify="space-between" gap={12} className="border-b border-[#edf2f7] bg-[#fafcff] px-4 py-2">
              <Typography.Text strong className="!text-[12px] !text-slate-700">
                明细字段
              </Typography.Text>
              <Flex gap={8}>
                {selectedDetailForDelete.length > 0 ? (
                  <Button danger onClick={onDeleteSelectedColumns} className="!rounded-[10px] !shadow-none">
                    删除 ({selectedDetailForDelete.length})
                  </Button>
                ) : null}
                <Button type="primary" onClick={onAddField} className="!rounded-[10px] !shadow-none">
                  新增字段
                </Button>
              </Flex>
            </Flex>
            <div
              className="scrollbar-none min-h-0 flex-1 overflow-auto bg-white outline-none"
              tabIndex={0}
              onPaste={onPasteTableColumns}
            >
              {tableBuilderNode}
            </div>
          </Flex>
        ) : currentDetailFillType === '网页' ? (
          <Flex vertical className="min-h-0 h-full p-4" gap={12}>
            <div className="rounded-[14px] border border-[#d9e2ec] bg-white px-4 py-3 shadow-none">
              <Flex align="center" justify="space-between" gap={12}>
                <div className="min-w-0">
                  <Typography.Text strong className="!text-[12px] !text-slate-700">
                    网页明细预览
                  </Typography.Text>
                  <div className="mt-1 truncate text-[11px] text-slate-400">
                    {detailWebUrl || '当前明细还没有可用的网页地址'}
                  </div>
                </div>
                <Button onClick={onOpenWebConfig} className="!rounded-[10px] !shadow-none">
                  配置网页
                </Button>
              </Flex>
            </div>
            {detailWebUrl ? (
              <div className="min-h-0 flex-1 overflow-hidden rounded-[16px] border border-[#d9e2ec] bg-white shadow-none">
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
          </Flex>
        ) : (
          <div className="min-h-0 h-full">
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
