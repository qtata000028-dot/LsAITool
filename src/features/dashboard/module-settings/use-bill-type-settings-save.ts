import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';

import {
  fetchBillTypeDesignerLayout,
  fetchBillTypeDetailFields,
  fetchBillTypeMasterFields,
  saveBillTypeConfig,
} from '../../../lib/backend-module-config';
import { buildBillHeaderFieldsFromDesignerLayout } from './dashboard-single-table-field-mappers';

type SaveCurrentPageOptions = {
  gridColumnsOverride?: {
    rows: any[];
    scope: 'left-grid' | 'main-grid' | 'detail-grid';
    tabId?: string;
  };
  silent?: boolean;
};

type UseBillTypeSettingsSaveOptions = {
  billDetailConfig: Record<string, any>;
  currentModuleCode: string;
  currentModuleName: string;
  isActive: boolean;
  mapSingleTableDetailGridFieldToColumn: (field: any, index: number) => any;
  mainTableConfig: Record<string, any>;
  onShowToast: (message: string) => void;
  setBillDetailColumns: Dispatch<SetStateAction<any[]>>;
  setBillDetailConfig: Dispatch<SetStateAction<Record<string, any>>>;
  setMainTableColumns: Dispatch<SetStateAction<any[]>>;
  setMainTableConfig: Dispatch<SetStateAction<Record<string, any>>>;
};

function toText(value: unknown) {
  return value == null ? '' : String(value).trim();
}

type BillTypeConfigSnapshot = {
  backendId: unknown;
  billSequence: unknown;
  detailCond: string;
  detailSql: string;
  detailSqlPrompt: string;
  detailTable: string;
  formKey: string;
  masterSql: string;
  masterTable: string;
  overbackKey: string;
  remark: string;
  typeCode: string;
  typeName: string;
};

function buildBillTypeConfigSnapshot(
  mainTableConfig: Record<string, any>,
  billDetailConfig: Record<string, any>,
  currentModuleCode: string,
  currentModuleName: string,
): BillTypeConfigSnapshot {
  return {
    backendId: mainTableConfig?.backendId ?? billDetailConfig?.backendId ?? mainTableConfig?.id ?? billDetailConfig?.id,
    billSequence: mainTableConfig?.billSequence ?? billDetailConfig?.billSequence,
    detailCond: toText(billDetailConfig?.sourceCondition ?? billDetailConfig?.defaultQuery),
    detailSql: toText(billDetailConfig?.mainSql),
    detailSqlPrompt: toText(billDetailConfig?.sqlPrompt),
    detailTable: toText(billDetailConfig?.tableName ?? billDetailConfig?.detailTable),
    formKey: toText(mainTableConfig?.formKey),
    masterSql: toText(mainTableConfig?.mainSql),
    masterTable: toText(mainTableConfig?.tableName ?? mainTableConfig?.mainTable),
    overbackKey: toText(mainTableConfig?.overbackKey),
    remark: toText(mainTableConfig?.remark),
    typeCode: toText(currentModuleCode || mainTableConfig?.typeCode || billDetailConfig?.typeCode),
    typeName: toText(mainTableConfig?.typeName || mainTableConfig?.moduleName || billDetailConfig?.typeName || currentModuleName),
  };
}

function buildBillTypeConfigPatch(
  currentSnapshot: BillTypeConfigSnapshot,
  baselineSnapshot: BillTypeConfigSnapshot | null,
) {
  if (!baselineSnapshot) {
    return {
      id: currentSnapshot.backendId,
      typeCode: currentSnapshot.typeCode,
      typeName: currentSnapshot.typeName,
      formKey: currentSnapshot.formKey,
      masterSql: currentSnapshot.masterSql,
      masterTable: currentSnapshot.masterTable,
      overbackKey: currentSnapshot.overbackKey,
      remark: currentSnapshot.remark,
      billSequence: currentSnapshot.billSequence,
      detailCond: currentSnapshot.detailCond,
      detailSql: currentSnapshot.detailSql,
      detailSqlPrompt: currentSnapshot.detailSqlPrompt,
      detailTable: currentSnapshot.detailTable,
    };
  }

  const patch: Record<string, unknown> = {};
  if (currentSnapshot.masterSql !== baselineSnapshot.masterSql) patch.masterSql = currentSnapshot.masterSql;
  if (currentSnapshot.masterTable !== baselineSnapshot.masterTable) patch.masterTable = currentSnapshot.masterTable;
  if (currentSnapshot.formKey !== baselineSnapshot.formKey) patch.formKey = currentSnapshot.formKey;
  if (currentSnapshot.overbackKey !== baselineSnapshot.overbackKey) patch.overbackKey = currentSnapshot.overbackKey;
  if (currentSnapshot.remark !== baselineSnapshot.remark) patch.remark = currentSnapshot.remark;
  if (currentSnapshot.typeName !== baselineSnapshot.typeName) patch.typeName = currentSnapshot.typeName;
  if (currentSnapshot.billSequence !== baselineSnapshot.billSequence) patch.billSequence = currentSnapshot.billSequence;
  if (currentSnapshot.detailCond !== baselineSnapshot.detailCond) patch.detailCond = currentSnapshot.detailCond;
  if (currentSnapshot.detailSql !== baselineSnapshot.detailSql) patch.detailSql = currentSnapshot.detailSql;
  if (currentSnapshot.detailSqlPrompt !== baselineSnapshot.detailSqlPrompt) patch.detailSqlPrompt = currentSnapshot.detailSqlPrompt;
  if (currentSnapshot.detailTable !== baselineSnapshot.detailTable) patch.detailTable = currentSnapshot.detailTable;

  if (Object.keys(patch).length > 0 && currentSnapshot.backendId != null && currentSnapshot.backendId !== '') {
    patch.id = currentSnapshot.backendId;
  }

  return patch;
}

export function useBillTypeSettingsSave({
  billDetailConfig,
  currentModuleCode,
  currentModuleName,
  isActive,
  mapSingleTableDetailGridFieldToColumn,
  mainTableConfig,
  onShowToast,
  setBillDetailColumns,
  setBillDetailConfig,
  setMainTableColumns,
  setMainTableConfig,
}: UseBillTypeSettingsSaveOptions) {
  const [isSaving, setIsSaving] = useState(false);
  const baselineRef = useRef<{
    moduleCode: string;
    snapshot: BillTypeConfigSnapshot | null;
  }>({
    moduleCode: '',
    snapshot: null,
  });

  useEffect(() => {
    const typeCode = toText(currentModuleCode || mainTableConfig?.typeCode || billDetailConfig?.typeCode);
    if (!typeCode) {
      baselineRef.current = {
        moduleCode: '',
        snapshot: null,
      };
      return;
    }

    if (baselineRef.current.moduleCode === typeCode && baselineRef.current.snapshot) {
      return;
    }

    const hasLoadedBaseline = (
      mainTableConfig?.backendId != null
      || billDetailConfig?.backendId != null
      || mainTableConfig?.id != null
      || billDetailConfig?.id != null
    );
    if (!hasLoadedBaseline) {
      baselineRef.current = {
        moduleCode: typeCode,
        snapshot: null,
      };
      return;
    }

    baselineRef.current = {
      moduleCode: typeCode,
      snapshot: buildBillTypeConfigSnapshot(mainTableConfig, billDetailConfig, currentModuleCode, currentModuleName),
    };
  }, [
    billDetailConfig,
    billDetailConfig?.backendId,
    billDetailConfig?.id,
    billDetailConfig?.typeCode,
    currentModuleCode,
    currentModuleName,
    mainTableConfig,
    mainTableConfig?.backendId,
    mainTableConfig?.id,
    mainTableConfig?.typeCode,
  ]);

  const saveCurrentPage = useCallback(async (options?: SaveCurrentPageOptions) => {
    const shouldShowToast = !options?.silent;
    const currentSnapshot = buildBillTypeConfigSnapshot(mainTableConfig, billDetailConfig, currentModuleCode, currentModuleName);
    const typeCode = currentSnapshot.typeCode;
    if (!isActive || !typeCode) {
      if (shouldShowToast) {
        onShowToast('请先保存菜单信息，再保存模块设置。');
      }
      return false;
    }

    const hasUnsupportedGridOverride = Boolean(options?.gridColumnsOverride);
    const requestBody = buildBillTypeConfigPatch(currentSnapshot, baselineRef.current.snapshot);

    if (Object.keys(requestBody).length === 0) {
      if (hasUnsupportedGridOverride) {
        if (shouldShowToast) {
          onShowToast('当前单据接口未提供字段级保存，本次没有可提交的配置变更。');
        }
        return false;
      }

      if (shouldShowToast) {
        onShowToast('当前页面没有需要保存的变更。');
      }
      return true;
    }

    setIsSaving(true);

    try {
      const savedConfig = await saveBillTypeConfig(typeCode, requestBody);
      const [savedLayoutRows, savedMasterFieldRows, savedDetailFieldRows] = await Promise.all([
        fetchBillTypeDesignerLayout(typeCode),
        fetchBillTypeMasterFields(typeCode),
        fetchBillTypeDetailFields(typeCode),
      ]);
      const { columns: savedMainColumns } = buildBillHeaderFieldsFromDesignerLayout(savedLayoutRows, savedMasterFieldRows);
      const savedDetailColumns = savedDetailFieldRows.map((field, index) => mapSingleTableDetailGridFieldToColumn(field, index));
      const persistedId = savedConfig.id ?? currentSnapshot.backendId;
      const nextBillSequence = savedConfig.billSequence ?? currentSnapshot.billSequence;

      setMainTableColumns(savedMainColumns);
      setBillDetailColumns(savedDetailColumns);
      setMainTableConfig((prev) => ({
        ...prev,
        backendId: persistedId ?? prev.backendId,
        billSequence: nextBillSequence ?? prev.billSequence,
        dllCoId: currentSnapshot.typeCode,
        formKey: currentSnapshot.formKey,
        mainSql: currentSnapshot.masterSql,
        moduleName: currentSnapshot.typeName || prev.moduleName || currentModuleName,
        overbackKey: currentSnapshot.overbackKey,
        remark: currentSnapshot.remark,
        tableName: currentSnapshot.masterTable,
        typeCode: currentSnapshot.typeCode,
        typeName: currentSnapshot.typeName,
      }));
      setBillDetailConfig((prev) => ({
        ...prev,
        backendId: persistedId ?? prev.backendId,
        billSequence: nextBillSequence ?? prev.billSequence,
        defaultQuery: currentSnapshot.detailCond,
        mainSql: currentSnapshot.detailSql,
        sourceCondition: currentSnapshot.detailCond,
        sqlPrompt: currentSnapshot.detailSqlPrompt,
        tableName: currentSnapshot.detailTable,
        typeCode: currentSnapshot.typeCode,
        typeName: currentSnapshot.typeName,
      }));
      baselineRef.current = {
        moduleCode: typeCode,
        snapshot: {
          ...currentSnapshot,
          backendId: persistedId ?? currentSnapshot.backendId,
          billSequence: nextBillSequence ?? currentSnapshot.billSequence,
        },
      };

      if (hasUnsupportedGridOverride) {
        if (shouldShowToast) {
          onShowToast('当前单据接口未提供字段级保存，本次仅保存主表与明细 SQL 配置。');
        }
        return false;
      }

      if (shouldShowToast) {
        onShowToast('单据模块设置已保存。');
      }
      return true;
    } catch (error) {
      const message = error instanceof Error && error.message
        ? error.message
        : '单据模块设置保存失败。';
      if (shouldShowToast) {
        onShowToast(message);
      }
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [
    billDetailConfig,
    currentModuleCode,
    currentModuleName,
    isActive,
    mapSingleTableDetailGridFieldToColumn,
    mainTableConfig,
    onShowToast,
    setBillDetailColumns,
    setBillDetailConfig,
    setMainTableColumns,
    setMainTableConfig,
  ]);

  return {
    isSaving,
    saveCurrentPage,
  };
}
