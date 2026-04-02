import React from 'react';
import { Button, Flex, Tag, Tabs } from 'antd';

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
  footerNode?: React.ReactNode;
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
      return { icon: 'account_tree', label: '树表格视图' };
    case '图表':
      return { icon: 'monitoring', label: '图表视图' };
    case '网页':
      return { icon: 'language', label: '网页视图' };
    default:
      return { icon: 'table_view', label: '表格视图' };
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

  return (
    <Tabs
      activeKey={activeTab}
      onChange={onActivateTab}
      items={detailTabs.map((tab) => ({
        key: tab.id,
        label: tab.name,
        children: null,
      }))}
      className="dashboard-module-ant-tabs min-w-0"
      tabBarExtraContent={{
        right: (
          <Flex align="center" gap={8}>
            {showModeBadge ? (
              <Tag
                icon={<span className="material-symbols-outlined text-[14px]">{activeTabMeta.icon}</span>}
                className="!me-0 !rounded-full !border-[#d9e7ff] !bg-[#f3f8ff] !px-2.5 !py-1 !text-[11px] !font-medium !text-[#2563eb]"
              >
                {activeTabMeta.label}
              </Tag>
            ) : null}
            <Button
              type="default"
              size="small"
              onClick={onAddTab}
              className="dashboard-module-ant-add-detail-btn !h-8 !rounded-full !px-3.5 !text-[12px] !font-semibold !shadow-none"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              {addLabel ?? '新增页签'}
            </Button>
          </Flex>
        ),
      }}
    />
  );
});

export const MemoDocumentDetailWorkbench = React.memo(function DocumentDetailWorkbench({
  footerNode,
  tableSurfaceClass,
  detailTabStripNode,
  currentDetailFillType,
  onPasteTableColumns,
  tableBuilderNode,
  fillPlaceholderNode,
}: DocumentDetailWorkbenchProps) {

  return (
    <div className={`flex h-full min-h-0 flex-col overflow-hidden rounded-[18px] border border-[#d9e2ec] bg-white shadow-none ${tableSurfaceClass}`}>
      <div className="border-b border-[#edf2f7] bg-white px-4 pt-2">
        <div className="min-w-0 overflow-hidden">{detailTabStripNode}</div>
      </div>
      <Flex vertical className="min-h-0 flex-1 overflow-hidden">
        {currentDetailFillType === '表格' ? (
          <div
            className="workspace-scrollbar min-h-0 flex-1 overflow-auto bg-white outline-none"
            tabIndex={0}
            onPaste={onPasteTableColumns}
          >
            {tableBuilderNode}
          </div>
        ) : (
          <div className="min-h-0 flex-1 bg-white">
            {fillPlaceholderNode}
          </div>
        )}
      </Flex>
      {footerNode ? footerNode : null}
    </div>
  );
});
