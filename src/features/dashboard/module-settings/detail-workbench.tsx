import React, { useMemo } from 'react';
import { Button, Flex, Tag, Tabs } from 'antd';
import { getDetailFillTypeBadgeMeta } from './dashboard-detail-fill-utils';
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
  iconOnlyAddButton?: boolean;
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

export const MemoDetailTabStrip = React.memo(function DetailTabStrip({
  detailTabs,
  activeTab,
  currentDetailFillType,
  onActivateTab,
  onAddTab,
  addLabel,
  addButtonPlacement = 'inline-end',
  compactAddButton = false,
  iconOnlyAddButton = false,
  showModeBadge = true,
}: DetailTabStripProps) {
  const activeTabMeta = getDetailFillTypeBadgeMeta(currentDetailFillType);
  const tabItems = useMemo(() => detailTabs.map((tab) => ({
    key: tab.id,
    label: tab.name,
    children: null,
  })), [detailTabs]);
  const addButtonClassName = iconOnlyAddButton
    ? '!size-7 !rounded-[10px] !p-0'
    : compactAddButton
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
              aria-label={addLabel ?? '新增页签'}
              title={addLabel ?? '新增页签'}
              className={`dashboard-module-ant-add-detail-btn ${iconOnlyAddButton ? 'dashboard-module-ant-add-detail-icon-btn' : ''} !font-semibold !shadow-none ${addButtonClassName}`}
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              {iconOnlyAddButton ? null : (addLabel ?? '新增页签')}
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
    <div className="dashboard-module-detail-tabstrip-shell min-w-0">
      <Tabs
        activeKey={activeTab}
        onChange={onActivateTab}
        onTabClick={(tabId) => onActivateTab(tabId)}
        destroyOnHidden
        items={tabItems}
        className="dashboard-module-ant-tabs dashboard-module-detail-tabs min-w-0"
        tabBarExtraContent={inlineExtraContent}
      />
      {addButtonPlacement === 'centered' ? (
        <div className="flex items-center justify-center pb-2 pt-1">
            <Button
              type="default"
              size="small"
              onClick={onAddTab}
              aria-label={addLabel ?? '新增页签'}
              title={addLabel ?? '新增页签'}
              className={`dashboard-module-ant-add-detail-btn ${iconOnlyAddButton ? 'dashboard-module-ant-add-detail-icon-btn' : ''} !font-semibold !shadow-none ${addButtonClassName}`}
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              {iconOnlyAddButton ? null : (addLabel ?? '新增页签')}
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
      headerClassName="dashboard-module-detail-panel-header"
      headerContentClassName="dashboard-module-detail-panel-header-inner"
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
          iconOnlyAddButton
          showModeBadge={false}
        />
      )}
      bodyNode={activeDetailContentNode}
      footerNode={footerNode}
      onPaste={currentDetailFillType === '表格' ? onPasteTableColumns : undefined}
    />
  );
});
