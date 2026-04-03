import React, { useMemo } from 'react';
import { Button, Flex, Tag, Tabs } from 'antd';
import { TableWorkbenchPanel } from './table-workbench-panel';

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
  addButtonPlacement?: 'inline-end' | 'centered';
  compactAddButton?: boolean;
  showModeBadge?: boolean;
};

type DocumentDetailWorkbenchProps = {
  footerNode?: React.ReactNode;
  detailTabs: DetailTab[];
  activeTab: string;
  currentDetailFillType: string;
  onActivateTab: (tabId: string) => void;
  onAddTab: () => void;
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
  addButtonPlacement = 'inline-end',
  compactAddButton = false,
  showModeBadge = true,
}: DetailTabStripProps) {
  const activeTabMeta = getDetailFillTypeMeta(currentDetailFillType);
  const tabItems = useMemo(() => detailTabs.map((tab) => ({
    key: tab.id,
    label: tab.name,
    children: null,
  })), [detailTabs]);
  const addButtonClassName = compactAddButton
    ? '!h-7 !rounded-[10px] !px-3 !text-[12px]'
    : '!h-8 !rounded-full !px-3.5 !text-[12px]';
  const inlineExtraContent = addButtonPlacement === 'inline-end'
    ? {
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
              className={`dashboard-module-ant-add-detail-btn !font-semibold !shadow-none ${addButtonClassName}`}
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              {addLabel ?? '新增页签'}
            </Button>
          </Flex>
        ),
      }
    : showModeBadge
      ? {
          right: (
            <Tag
              icon={<span className="material-symbols-outlined text-[14px]">{activeTabMeta.icon}</span>}
              className="!me-0 !rounded-full !border-[#d9e7ff] !bg-[#f3f8ff] !px-2.5 !py-1 !text-[11px] !font-medium !text-[#2563eb]"
            >
              {activeTabMeta.label}
            </Tag>
          ),
        }
      : undefined;

  return (
    <div className="min-w-0">
      <Tabs
        activeKey={activeTab}
        onChange={onActivateTab}
        onTabClick={(tabId) => onActivateTab(tabId)}
        destroyOnHidden
        items={tabItems}
        className="dashboard-module-ant-tabs min-w-0"
        tabBarExtraContent={inlineExtraContent}
      />
      {addButtonPlacement === 'centered' ? (
        <div className="flex items-center justify-center pb-2 pt-1">
          <Button
            type="default"
            size="small"
            onClick={onAddTab}
            className={`dashboard-module-ant-add-detail-btn !font-semibold !shadow-none ${addButtonClassName}`}
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            {addLabel ?? '新增页签'}
          </Button>
        </div>
      ) : null}
    </div>
  );
});

export const MemoDocumentDetailWorkbench = React.memo(function DocumentDetailWorkbench({
  footerNode,
  detailTabs,
  activeTab,
  currentDetailFillType,
  onActivateTab,
  onAddTab,
  onPasteTableColumns,
  tableBuilderNode,
  fillPlaceholderNode,
}: DocumentDetailWorkbenchProps) {
  const activeDetailContentNode = currentDetailFillType === '表格' ? tableBuilderNode : fillPlaceholderNode;

  return (
    <TableWorkbenchPanel
      bodyStyle={{ backgroundColor: '#ffffff' }}
      headerNode={(
        <MemoDetailTabStrip
          detailTabs={detailTabs}
          activeTab={activeTab}
          currentDetailFillType={currentDetailFillType}
          onActivateTab={onActivateTab}
          onAddTab={onAddTab}
          addLabel="新增明细"
          addButtonPlacement="inline-end"
          compactAddButton
          showModeBadge={false}
        />
      )}
      bodyNode={activeDetailContentNode}
      footerNode={footerNode}
      onPaste={currentDetailFillType === '表格' ? onPasteTableColumns : undefined}
    />
  );
});
