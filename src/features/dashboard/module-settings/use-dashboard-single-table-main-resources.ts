import { type Dispatch, type SetStateAction, useEffect } from 'react';

import {
  fetchSingleTableModuleColors,
  fetchSingleTableModuleConditions,
  fetchSingleTableModuleConfig,
  fetchSingleTableModuleFields,
  fetchSingleTableModuleMenus,
} from '../../../lib/backend-module-config';

export function useDashboardSingleTableMainResources({
  activeConfigModuleKey,
  canLoadSingleTableModuleResources,
  captureMainColors,
  captureMainConditions,
  captureMainFields,
  captureMainMenus,
  configStep,
  getDashboardErrorMessage,
  getRecordFieldValue,
  isConfigOpen,
  mainResourceScopeKey,
  mapSingleTableColorRule,
  mapSingleTableConditionRecordToField,
  mapSingleTableContextMenuItem,
  mapSingleTableFieldRecordToColumn,
  moduleSettingStep,
  setDetailBoardSortColumnId,
  setInspectorTarget,
  setIsSingleTableFieldsLoading,
  setMainFilterFields,
  setMainTableColumns,
  setMainTableConfig,
  setSelectedMainFiltersForDelete,
  setSelectedMainForDelete,
  showToast,
  toRecordNumber,
  toRecordText,
}: {
  activeConfigModuleKey: string;
  canLoadSingleTableModuleResources: boolean;
  captureMainColors: (rules: any[]) => void;
  captureMainConditions: (fields: any[]) => void;
  captureMainFields: (columns: any[]) => void;
  captureMainMenus: (menus: any[]) => void;
  configStep: number;
  getDashboardErrorMessage: (error: unknown) => string;
  getRecordFieldValue: (record: Record<string, unknown> | null | undefined, ...keys: string[]) => unknown;
  isConfigOpen: boolean;
  mainResourceScopeKey: string;
  mapSingleTableColorRule: (rule: any, index: number) => any;
  mapSingleTableConditionRecordToField: (condition: any, index: number, overrides?: Record<string, unknown>) => any;
  mapSingleTableContextMenuItem: (item: any, index: number) => any;
  mapSingleTableFieldRecordToColumn: (field: any, index: number) => any;
  moduleSettingStep: number;
  setDetailBoardSortColumnId: Dispatch<SetStateAction<string | null>>;
  setInspectorTarget: Dispatch<SetStateAction<any>>;
  setIsSingleTableFieldsLoading: Dispatch<SetStateAction<boolean>>;
  setMainFilterFields: Dispatch<SetStateAction<any[]>>;
  setMainTableColumns: Dispatch<SetStateAction<any[]>>;
  setMainTableConfig: Dispatch<SetStateAction<Record<string, any>>>;
  setSelectedMainFiltersForDelete: Dispatch<SetStateAction<string[]>>;
  setSelectedMainForDelete: Dispatch<SetStateAction<string[]>>;
  showToast: (message: string) => void;
  toRecordNumber: (value: unknown, fallback: number) => number;
  toRecordText: (value: unknown) => string;
}) {
  useEffect(() => {
    if (!isConfigOpen || configStep !== moduleSettingStep) {
      return;
    }

    if (!canLoadSingleTableModuleResources) {
      return;
    }

    let isActive = true;

    const loadSingleTableModuleConfigRecord = async () => {
      try {
        const moduleConfig = await fetchSingleTableModuleConfig(activeConfigModuleKey);

        if (!isActive) {
          return;
        }

        setMainTableConfig((prev) => ({
          ...prev,
          addDllName: toRecordText(getRecordFieldValue(moduleConfig, 'addDllName')),
          addEnable: toRecordNumber(getRecordFieldValue(moduleConfig, 'addEnable'), prev.addEnable ?? 1),
          backendId: getRecordFieldValue(moduleConfig, 'id'),
          conditionKey: toRecordText(getRecordFieldValue(moduleConfig, 'conditionKey', 'condKey')),
          deleteEnable: toRecordNumber(getRecordFieldValue(moduleConfig, 'deleteEnable'), prev.deleteEnable ?? 1),
          deleteCond: toRecordText(getRecordFieldValue(moduleConfig, 'deleteCond')),
          dllCoId: toRecordText(getRecordFieldValue(moduleConfig, 'dllCoId')) || activeConfigModuleKey,
          dllType: getRecordFieldValue(moduleConfig, 'dllType') ?? prev.dllType,
          formKey: toRecordText(getRecordFieldValue(moduleConfig, 'formKey')),
          isReport: getRecordFieldValue(moduleConfig, 'isReport') ?? prev.isReport,
          mainSql: toRecordText(getRecordFieldValue(moduleConfig, 'querySql', 'mainSql')),
          modifyEnable: toRecordNumber(getRecordFieldValue(moduleConfig, 'modifyEnable'), prev.modifyEnable ?? 1),
          modifyCond: toRecordText(getRecordFieldValue(moduleConfig, 'modifyCond')),
          moduleName: toRecordText(getRecordFieldValue(moduleConfig, 'moduleName')),
          overbackKey: toRecordText(getRecordFieldValue(moduleConfig, 'overbackKey')),
          tableName: toRecordText(getRecordFieldValue(moduleConfig, 'mainTable')),
        }));
      } catch (error) {
        if (!isActive) {
          return;
        }

        showToast(getDashboardErrorMessage(error));
      }
    };

    void loadSingleTableModuleConfigRecord();

    return () => {
      isActive = false;
    };
  }, [
    activeConfigModuleKey,
    canLoadSingleTableModuleResources,
    configStep,
    getDashboardErrorMessage,
    getRecordFieldValue,
    isConfigOpen,
    mainResourceScopeKey,
    moduleSettingStep,
    setMainTableConfig,
    showToast,
    toRecordNumber,
    toRecordText,
  ]);

  useEffect(() => {
    if (!isConfigOpen || configStep !== moduleSettingStep) {
      setIsSingleTableFieldsLoading(false);
      return;
    }

    if (!canLoadSingleTableModuleResources) {
      setIsSingleTableFieldsLoading(false);
      return;
    }

    let isActive = true;
    setIsSingleTableFieldsLoading(true);

    const loadSingleTableFields = async () => {
      try {
        const rows = await fetchSingleTableModuleFields(activeConfigModuleKey);

        if (!isActive) {
          return;
        }

        const mappedColumns = rows.map((field, index) => mapSingleTableFieldRecordToColumn(field, index));
        setMainTableColumns(mappedColumns);
        captureMainFields(mappedColumns);
        setSelectedMainForDelete([]);
        setInspectorTarget((prev) => {
          if (prev.kind === 'main-col' && !mappedColumns.some((column) => column.id === prev.id)) {
            return { kind: 'main-grid' };
          }

          return prev;
        });
        setDetailBoardSortColumnId((prev) => (
          prev && mappedColumns.some((column) => column.id === prev) ? prev : mappedColumns[0]?.id ?? null
        ));
      } catch (error) {
        if (!isActive) {
          return;
        }

        showToast(getDashboardErrorMessage(error));
      } finally {
        if (isActive) {
          setIsSingleTableFieldsLoading(false);
        }
      }
    };

    void loadSingleTableFields();

    return () => {
      isActive = false;
    };
  }, [
    activeConfigModuleKey,
    canLoadSingleTableModuleResources,
    captureMainFields,
    configStep,
    getDashboardErrorMessage,
    isConfigOpen,
    mainResourceScopeKey,
    mapSingleTableFieldRecordToColumn,
    moduleSettingStep,
    setDetailBoardSortColumnId,
    setInspectorTarget,
    setIsSingleTableFieldsLoading,
    setMainTableColumns,
    setSelectedMainForDelete,
    showToast,
  ]);

  useEffect(() => {
    if (!isConfigOpen || configStep !== moduleSettingStep) {
      return;
    }

    if (!canLoadSingleTableModuleResources) {
      return;
    }

    let isActive = true;

    const loadSingleTableConditions = async () => {
      try {
        const rows = await fetchSingleTableModuleConditions(activeConfigModuleKey);

        if (!isActive) {
          return;
        }

        const mappedFields = rows.map((condition, index) => mapSingleTableConditionRecordToField(condition, index));
        setMainFilterFields(mappedFields);
        captureMainConditions(mappedFields);
        setSelectedMainFiltersForDelete([]);
        setInspectorTarget((prev) => {
          if (prev.kind === 'main-filter' && !mappedFields.some((field) => field.id === prev.id)) {
            return { kind: 'main-filter-panel' };
          }

          return prev;
        });
      } catch (error) {
        if (!isActive) {
          return;
        }

        showToast(getDashboardErrorMessage(error));
      }
    };

    void loadSingleTableConditions();

    return () => {
      isActive = false;
    };
  }, [
    activeConfigModuleKey,
    canLoadSingleTableModuleResources,
    captureMainConditions,
    configStep,
    getDashboardErrorMessage,
    isConfigOpen,
    mainResourceScopeKey,
    mapSingleTableConditionRecordToField,
    moduleSettingStep,
    setInspectorTarget,
    setMainFilterFields,
    setSelectedMainFiltersForDelete,
    showToast,
  ]);

  useEffect(() => {
    if (!isConfigOpen || configStep !== moduleSettingStep) {
      return;
    }

    if (!canLoadSingleTableModuleResources) {
      return;
    }

    let isActive = true;

    const loadSingleTableMenus = async () => {
      try {
        const rows = await fetchSingleTableModuleMenus(activeConfigModuleKey);

        if (!isActive) {
          return;
        }

        const mappedMenus = [...rows]
          .sort(
            (left, right) => toRecordNumber(getRecordFieldValue(left, 'orderid', 'orderId'), 0)
              - toRecordNumber(getRecordFieldValue(right, 'orderid', 'orderId'), 0),
          )
          .map((item, index) => mapSingleTableContextMenuItem(item, index));

        setMainTableConfig((prev) => ({
          ...prev,
          contextMenuEnabled: mappedMenus.length > 0,
          contextMenuItems: mappedMenus,
        }));
        captureMainMenus(mappedMenus);
      } catch (error) {
        if (!isActive) {
          return;
        }

        showToast(getDashboardErrorMessage(error));
      }
    };

    void loadSingleTableMenus();

    return () => {
      isActive = false;
    };
  }, [
    activeConfigModuleKey,
    canLoadSingleTableModuleResources,
    captureMainMenus,
    configStep,
    getDashboardErrorMessage,
    getRecordFieldValue,
    isConfigOpen,
    mainResourceScopeKey,
    mapSingleTableContextMenuItem,
    moduleSettingStep,
    setMainTableConfig,
    showToast,
    toRecordNumber,
  ]);

  useEffect(() => {
    if (!isConfigOpen || configStep !== moduleSettingStep) {
      return;
    }

    if (!canLoadSingleTableModuleResources) {
      return;
    }

    let isActive = true;

    const loadSingleTableColors = async () => {
      try {
        const rows = await fetchSingleTableModuleColors(activeConfigModuleKey);

        if (!isActive) {
          return;
        }

        const mappedRules = [...rows]
          .sort(
            (left, right) => toRecordNumber(getRecordFieldValue(left, 'orderid', 'orderId'), 0)
              - toRecordNumber(getRecordFieldValue(right, 'orderid', 'orderId'), 0),
          )
          .map((rule, index) => mapSingleTableColorRule(rule, index));

        setMainTableConfig((prev) => ({
          ...prev,
          colorRulesEnabled: mappedRules.length > 0,
          colorRules: mappedRules,
        }));
        captureMainColors(mappedRules);
      } catch (error) {
        if (!isActive) {
          return;
        }

        showToast(getDashboardErrorMessage(error));
      }
    };

    void loadSingleTableColors();

    return () => {
      isActive = false;
    };
  }, [
    activeConfigModuleKey,
    canLoadSingleTableModuleResources,
    captureMainColors,
    configStep,
    getDashboardErrorMessage,
    getRecordFieldValue,
    isConfigOpen,
    mainResourceScopeKey,
    mapSingleTableColorRule,
    moduleSettingStep,
    setMainTableConfig,
    showToast,
    toRecordNumber,
  ]);
}
