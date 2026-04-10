import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Checkbox, Input, InputNumber, Select, Spin, Table, type TableColumnsType, type TableProps } from 'antd';
import { fetchSingleTableFieldNameOptions } from '../../../lib/backend-module-config';
import { fetchDataFormatOptions, fetchFieldSqlTagOptions } from '../../../lib/backend-system';
import {
  shadcnInspectorActionButtonClass,
  shadcnInspectorDangerActionButtonClass,
  shadcnInspectorPrimaryActionButtonClass,
} from '../../../components/ui/shadcn-inspector';
import {
  createSingleTableMainFieldDraftRow,
  resolveSingleTableMainFieldSettingValue,
  singleTableMainFieldSettings,
  updateSingleTableMainFieldSettingValue,
} from './single-table-main-field-settings-schema';

type SingleTableMainFieldSettingsModalProps = {
  currentModuleCode: string;
  isOpen: boolean;
  mainTableColumns: any[];
  onClose: () => void;
  onSave: (rows: any[]) => Promise<boolean>;
};

type FieldSqlTagOption = {
  label: string;
  value: number;
};

type DataFormatOption = {
  label: string;
  value: string;
};

type FieldNameOption = {
  fieldDec?: unknown;
  fieldLen?: unknown;
  label: string;
  value: string;
};

const FONT_NAME_OPTIONS = [
  '微软雅黑',
  '宋体',
  '黑体',
  '楷体',
  '仿宋',
  'Arial',
  'Tahoma',
  'Verdana',
  'Times New Roman',
];

function toText(value: unknown) {
  return value == null ? '' : String(value);
}

function sortDraftRows(rows: any[]) {
  return [...rows].sort((left, right) => {
    const leftOrder = Number(resolveSingleTableMainFieldSettingValue(left, 'orderid') || 0);
    const rightOrder = Number(resolveSingleTableMainFieldSettingValue(right, 'orderid') || 0);
    return leftOrder - rightOrder;
  });
}

function ensureDraftKey(row: any, index: number) {
  const persistedKey = String(row?.__draftKey ?? row?.id ?? row?.backendId ?? `draft_${Date.now()}_${index + 1}`).trim();
  return {
    ...row,
    __draftKey: persistedKey.length > 0 ? persistedKey : `draft_${Date.now()}_${index + 1}`,
  };
}

export const SingleTableMainFieldSettingsModal = React.memo(function SingleTableMainFieldSettingsModal({
  currentModuleCode,
  isOpen,
  mainTableColumns,
  onClose,
  onSave,
}: SingleTableMainFieldSettingsModalProps) {
  const [draftRows, setDraftRows] = React.useState<any[]>([]);
  const [selectedDraftKeys, setSelectedDraftKeys] = React.useState<React.Key[]>([]);
  const [searchText, setSearchText] = React.useState('');
  const [isLoadingOptions, setIsLoadingOptions] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [fieldSqlTagOptions, setFieldSqlTagOptions] = React.useState<FieldSqlTagOption[]>([]);
  const [dataFormatOptions, setDataFormatOptions] = React.useState<DataFormatOption[]>([]);
  const [fieldNameOptions, setFieldNameOptions] = React.useState<FieldNameOption[]>([]);

  React.useEffect(() => {
    if (!isOpen) {
      return;
    }

    setDraftRows(sortDraftRows(mainTableColumns.map((row, index) => ensureDraftKey(row, index))));
    setSelectedDraftKeys([]);
    setSearchText('');
  }, [isOpen, mainTableColumns]);

  React.useEffect(() => {
    if (!isOpen) {
      return;
    }

    let cancelled = false;

    const loadOptions = async () => {
      setIsLoadingOptions(true);
      try {
        const [nextFieldSqlTags, nextDataFormats, nextFieldNames] = await Promise.all([
          fetchFieldSqlTagOptions(),
          fetchDataFormatOptions(),
          currentModuleCode.trim() ? fetchSingleTableFieldNameOptions(currentModuleCode.trim()) : Promise.resolve([]),
        ]);

        if (cancelled) {
          return;
        }

        setFieldSqlTagOptions(
          (nextFieldSqlTags || []).map((item) => ({
            label: toText(item?.showname),
            value: Number(item?.showid ?? 0),
          })),
        );
        setDataFormatOptions(
          (nextDataFormats || []).map((item) => ({
            label: toText(item?.remark) || toText(item?.formatString),
            value: toText(item?.formatString),
          })),
        );
        setFieldNameOptions(
          (nextFieldNames || []).map((item: any) => {
            const fieldName = toText(item?.fieldName);
            const fieldType = toText(item?.fieldType);
            const fieldLen = toText(item?.fieldLen);
            const fieldDec = toText(item?.fieldDec);
            const suffix = [fieldType, fieldLen ? `L${fieldLen}` : '', fieldDec ? `D${fieldDec}` : '']
              .filter(Boolean)
              .join(' · ');

            return {
              fieldDec: item?.fieldDec,
              fieldLen: item?.fieldLen,
              label: suffix ? `${fieldName} (${suffix})` : fieldName,
              value: fieldName,
            };
          }),
        );
      } finally {
        if (!cancelled) {
          setIsLoadingOptions(false);
        }
      }
    };

    void loadOptions();

    return () => {
      cancelled = true;
    };
  }, [currentModuleCode, isOpen]);

  const filteredRows = React.useMemo(() => {
    const normalizedSearchText = searchText.trim().toLowerCase();
    const sortedRows = sortDraftRows(draftRows);

    if (!normalizedSearchText) {
      return sortedRows;
    }

    return sortedRows.filter((row) => {
      const values = [
        resolveSingleTableMainFieldSettingValue(row, 'fieldname'),
        resolveSingleTableMainFieldSettingValue(row, 'sysname'),
        resolveSingleTableMainFieldSettingValue(row, 'username1'),
        resolveSingleTableMainFieldSettingValue(row, 'fieldsqlid'),
      ];
      return values.some((value) => toText(value).toLowerCase().includes(normalizedSearchText));
    });
  }, [draftRows, searchText]);

  const missingFieldNameCount = React.useMemo(
    () => draftRows.filter((row) => !toText(resolveSingleTableMainFieldSettingValue(row, 'fieldname')).trim()).length,
    [draftRows],
  );

  const updateRow = React.useCallback((draftKey: string, updater: (row: any) => any) => {
    setDraftRows((prev) => prev.map((row) => (
      row.__draftKey === draftKey ? ensureDraftKey(updater(row), 0) : row
    )));
  }, []);

  const handleAddRow = React.useCallback(() => {
    setDraftRows((prev) => {
      const nextOrderId = sortDraftRows(prev).length + 1;
      return [...prev, createSingleTableMainFieldDraftRow(currentModuleCode.trim(), nextOrderId)];
    });
  }, [currentModuleCode]);

  const handleDeleteSelectedRows = React.useCallback(() => {
    if (selectedDraftKeys.length === 0) {
      return;
    }

    setDraftRows((prev) => prev.filter((row) => !selectedDraftKeys.includes(row.__draftKey)));
    setSelectedDraftKeys([]);
  }, [selectedDraftKeys]);

  const handleSave = React.useCallback(async () => {
    if (isSaving || missingFieldNameCount > 0) {
      return;
    }

    setIsSaving(true);
    try {
      const normalizedRows = sortDraftRows(draftRows).map((row, index) => ({
        ...row,
        orderid: Number(resolveSingleTableMainFieldSettingValue(row, 'orderid') || index + 1),
        orderId: Number(resolveSingleTableMainFieldSettingValue(row, 'orderid') || index + 1),
      }));
      const saved = await onSave(normalizedRows);
      if (saved) {
        onClose();
      }
    } finally {
      setIsSaving(false);
    }
  }, [draftRows, isSaving, missingFieldNameCount, onClose, onSave]);

  const tableColumns = React.useMemo<TableColumnsType<any>>(() => {
    const renderEditor = (definition: typeof singleTableMainFieldSettings[number], record: any) => {
      const currentValue = resolveSingleTableMainFieldSettingValue(record, definition.key);
      const handleValueChange = (nextValue: unknown, extraOptions?: Record<string, unknown>) => {
        updateRow(
          record.__draftKey,
          (currentRow) => updateSingleTableMainFieldSettingValue(currentRow, definition.key, nextValue, {
            auxiliaryLabel: toText(extraOptions?.auxiliaryLabel),
            fieldDec: extraOptions?.fieldDec,
            fieldLen: extraOptions?.fieldLen,
          }),
        );
      };

      if (definition.readOnly && definition.editor !== 'checkbox') {
        return <span className="text-[12px] text-slate-600 dark:text-slate-300">{toText(currentValue) || '-'}</span>;
      }

      switch (definition.editor) {
        case 'number':
          return (
            <InputNumber
              size="small"
              value={currentValue === '' || currentValue == null ? undefined : Number(currentValue)}
              onChange={(value) => handleValueChange(value)}
              className="w-full"
            />
          );
        case 'textarea':
          return (
            <Input.TextArea
              autoSize={{ minRows: 1, maxRows: 4 }}
              value={toText(currentValue)}
              onChange={(event) => handleValueChange(event.target.value)}
            />
          );
        case 'checkbox':
          return (
            <div className="flex justify-center">
              <Checkbox
                checked={Boolean(currentValue)}
                disabled={definition.readOnly}
                onChange={(event) => handleValueChange(event.target.checked)}
              />
            </div>
          );
        case 'field-name-select':
          return (
            <Select
              allowClear
              showSearch
              size="small"
              value={toText(currentValue) || undefined}
              options={fieldNameOptions}
              optionFilterProp="label"
              placeholder="选择字段"
              onChange={(value, option) => {
                const resolvedOption = Array.isArray(option) ? option[0] : option;
                handleValueChange(value, {
                  fieldDec: resolvedOption?.fieldDec,
                  fieldLen: resolvedOption?.fieldLen,
                });
              }}
            />
          );
        case 'field-sql-tag-select':
          return (
            <Select
              showSearch
              size="small"
              value={currentValue == null || currentValue === '' ? undefined : Number(currentValue)}
              options={fieldSqlTagOptions}
              optionFilterProp="label"
              placeholder="选择来源"
              onChange={(value, option) => {
                const resolvedOption = Array.isArray(option) ? option[0] : option;
                handleValueChange(value, {
                  auxiliaryLabel: resolvedOption?.label,
                });
              }}
            />
          );
        case 'data-format-select':
          return (
            <Select
              allowClear
              showSearch
              size="small"
              value={toText(currentValue) || undefined}
              options={dataFormatOptions}
              optionFilterProp="label"
              placeholder="选择格式"
              onChange={(value) => handleValueChange(value)}
            />
          );
        case 'font-select':
          return (
            <Select
              allowClear
              showSearch
              size="small"
              value={toText(currentValue) || undefined}
              options={FONT_NAME_OPTIONS.map((fontName) => ({ label: fontName, value: fontName }))}
              optionFilterProp="label"
              placeholder="选择字体"
              onChange={(value) => handleValueChange(value)}
            />
          );
        default:
          return (
            <Input
              size="small"
              value={toText(currentValue)}
              onChange={(event) => handleValueChange(event.target.value)}
            />
          );
      }
    };

    return [
      ...singleTableMainFieldSettings.map((definition) => ({
        dataIndex: definition.key,
        key: definition.key,
        render: (_value: unknown, record: any) => renderEditor(definition, record),
        title: definition.title,
        width: definition.width,
      })),
    ];
  }, [dataFormatOptions, fieldNameOptions, fieldSqlTagOptions, updateRow]);

  const rowSelection = React.useMemo<NonNullable<TableProps<any>['rowSelection']>>(() => ({
    selectedRowKeys: selectedDraftKeys,
    onChange: (nextSelectedRowKeys) => {
      setSelectedDraftKeys(nextSelectedRowKeys);
    },
  }), [selectedDraftKeys]);

  if (!isOpen) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.98 }}
          transition={{ duration: 0.2 }}
          onClick={(event) => event.stopPropagation()}
          className="flex h-[92vh] w-[96vw] max-w-none flex-col overflow-hidden rounded-[24px] border border-slate-200/70 bg-white/95 shadow-[0_48px_120px_-56px_rgba(15,23,42,0.58)] dark:border-slate-700 dark:bg-slate-900"
        >
          <div className="border-b border-slate-200/80 bg-white/92 px-6 py-4 dark:border-slate-700 dark:bg-slate-900/92">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-2xl border border-white/70 bg-white/82 text-[color:var(--workspace-accent)] shadow-[0_16px_28px_-24px_rgba(15,23,42,0.24)] dark:border-white/10 dark:bg-slate-900/58">
                    <span className="material-symbols-outlined text-[18px]">table_view</span>
                  </div>
                  <div className="min-w-0">
                    <div className="text-[18px] font-bold tracking-[-0.02em] text-slate-900 dark:text-white">显示字段详细设置</div>
                    <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-300">
                      直接按表格方式集中维护主表列属性，保存后同步回当前模块配置。
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className={`${shadcnInspectorActionButtonClass} h-9 px-4 text-[12px]`}
                  onClick={handleAddRow}
                >
                  <span className="material-symbols-outlined text-[14px]">add</span>
                  新增字段
                </button>
                <button
                  type="button"
                  className={`${shadcnInspectorDangerActionButtonClass} h-9 px-4 text-[12px] disabled:cursor-not-allowed disabled:opacity-50`}
                  onClick={handleDeleteSelectedRows}
                  disabled={isSaving || selectedDraftKeys.length === 0}
                >
                  <span className="material-symbols-outlined text-[14px]">delete</span>
                  删除选中{selectedDraftKeys.length > 0 ? ` (${selectedDraftKeys.length})` : ''}
                </button>
                <button
                  type="button"
                  className={`${shadcnInspectorActionButtonClass} h-9 px-4 text-[12px] disabled:cursor-not-allowed disabled:opacity-50`}
                  onClick={onClose}
                  disabled={isSaving}
                >
                  关闭
                </button>
                <button
                  type="button"
                  className={`${shadcnInspectorPrimaryActionButtonClass} h-9 px-4 text-[12px] disabled:cursor-not-allowed disabled:opacity-50`}
                  onClick={handleSave}
                  disabled={isSaving || missingFieldNameCount > 0}
                >
                  {isSaving ? '保存中...' : '保存'}
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 bg-slate-50/85 px-6 py-3 dark:border-slate-800 dark:bg-slate-950/70">
            <div className="flex min-w-0 flex-wrap items-center gap-3 text-[12px] text-slate-500 dark:text-slate-300">
              <span>共 {draftRows.length} 列</span>
              <span>已选 {selectedDraftKeys.length} 项</span>
              {missingFieldNameCount > 0 ? (
                <span className="rounded-full bg-amber-50 px-2.5 py-0.5 font-semibold text-amber-600 dark:bg-amber-500/10 dark:text-amber-200">
                  还有 {missingFieldNameCount} 行未填写字段名
                </span>
              ) : null}
            </div>
            <div className="w-full max-w-[340px]">
              <Input
                allowClear
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="搜索字段、出厂名称、用户名"
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden px-4 py-4">
            <Spin spinning={isLoadingOptions} className="block h-full">
              <div className="h-full overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_20px_40px_-34px_rgba(15,23,42,0.18)] dark:border-slate-800 dark:bg-slate-950/72">
                <Table
                  rowKey="__draftKey"
                  size="small"
                  columns={tableColumns}
                  dataSource={filteredRows}
                  rowSelection={rowSelection}
                  pagination={false}
                  scroll={{ x: 'max-content', y: 'calc(92vh - 210px)' }}
                />
              </div>
            </Spin>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
});
