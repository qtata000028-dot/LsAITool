import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';

import {
  deleteSingleTableDetailChart,
  deleteSingleTableDetailColor,
  deleteSingleTableDetailGridField,
  deleteSingleTableDetailMenu,
  deleteSingleTableFieldColor,
  deleteSingleTableFieldCondition,
  deleteSingleTableFieldGridField,
  deleteSingleTableModuleColor,
  deleteSingleTableModuleCondition,
  deleteSingleTableModuleDetail,
  deleteSingleTableModuleField,
  deleteSingleTableModuleMenu,
  saveSingleTableDetailChart,
  saveSingleTableDetailColor,
  saveSingleTableDetailGridField,
  saveSingleTableDetailMenu,
  saveSingleTableFieldColor,
  saveSingleTableFieldCondition,
  saveSingleTableFieldGridField,
  saveSingleTableModuleColor,
  saveSingleTableModuleCondition,
  saveSingleTableModuleConfig,
  saveSingleTableModuleDetail,
  saveSingleTableModuleField,
  saveSingleTableModuleMenu,
} from '../../../lib/backend-module-config';

type DetailSnapshot = {
  tabConfigs: Record<string, any>;
  tableColumns: Record<string, any[]>;
  tableConfigs: Record<string, any>;
  tabs: Array<{ id: string; name: string }>;
};

type SaveBaseline = {
  details: DetailSnapshot;
  fieldColorsByFieldId: Record<number, any[]>;
  fieldConditionsByFieldId: Record<number, any[]>;
  fieldGridFieldsByFieldId: Record<number, any[]>;
  mainColors: any[];
  mainConditions: any[];
  mainFields: any[];
  mainMenus: any[];
};

type DetailEntry = {
  columns: any[];
  oldTabId: string;
  tableConfig: any;
  tabConfig: any;
  tabName: string;
};

type DetailSaveEntry = DetailEntry & {
  detailId: number | null;
  fillType: string;
  newTabId: string;
  unionModule: string;
};

type SharedModuleResourceEntry = {
  baselineColors: any[];
  baselineColumns: any[];
  baselineMenus: any[];
  colors: any[];
  columns: any[];
  menus: any[];
  moduleCode: string;
};

type CaptureDetailResourcesInput = {
  columns?: any[];
  tableConfig?: any;
};

type CaptureDetailsInput = {
  tabConfigs: Record<string, any>;
  tableColumns: Record<string, any[]>;
  tableConfigs: Record<string, any>;
  tabs: Array<{ id: string; name: string }>;
};

type UseSingleTableModuleSettingsSaveOptions = {
  activeTab: string;
  currentModuleCode: string;
  currentModuleName: string;
  detailTabConfigs: Record<string, any>;
  detailTableColumns: Record<string, any[]>;
  detailTableConfigs: Record<string, any>;
  detailTabs: Array<{ id: string; name: string }>;
  documentConditionOwnerFieldKey: string;
  documentConditionOwnerSourceId: string;
  isActive: boolean;
  leftFilterFields: any[];
  leftTableColumns: any[];
  leftTableConfig: any;
  mainFilterFields: any[];
  mainTableColumns: any[];
  mainTableConfig: any;
  mapColorRule: (row: any, index: number) => any;
  mapConditionRecordToField: (row: any, index: number, overrides?: Record<string, unknown>) => any;
  mapContextMenuItem: (row: any, index: number) => any;
  mapDetailChartConfig: (row: any) => any;
  mapDetailGridFieldToColumn: (row: any, index: number) => any;
  mapDetailRecord: (row: any, index: number) => { config: any; gridConfig: any; tab: { id: string; name: string } };
  mapFieldGridFieldToColumn: (row: any, index: number, existingColumn?: any) => any;
  mapMainFieldRecordToColumn: (row: any, index: number) => any;
  onShowToast: (message: string) => void;
  setActiveTab: Dispatch<SetStateAction<string>>;
  setDetailTabConfigs: Dispatch<SetStateAction<Record<string, any>>>;
  setDetailTableColumns: Dispatch<SetStateAction<Record<string, any[]>>>;
  setDetailTableConfigs: Dispatch<SetStateAction<Record<string, any>>>;
  setDetailTabs: Dispatch<SetStateAction<Array<{ id: string; name: string }>>>;
  setLeftFilterFields: Dispatch<SetStateAction<any[]>>;
  setLeftTableColumns: Dispatch<SetStateAction<any[]>>;
  setLeftTableConfig: Dispatch<SetStateAction<any>>;
  setMainFilterFields: Dispatch<SetStateAction<any[]>>;
  setMainTableColumns: Dispatch<SetStateAction<any[]>>;
  setMainTableConfig: Dispatch<SetStateAction<any>>;
};

function createEmptyDetailSnapshot(): DetailSnapshot {
  return {
    tabConfigs: {},
    tableColumns: {},
    tableConfigs: {},
    tabs: [],
  };
}

function createEmptyBaseline(): SaveBaseline {
  return {
    details: createEmptyDetailSnapshot(),
    fieldColorsByFieldId: {},
    fieldConditionsByFieldId: {},
    fieldGridFieldsByFieldId: {},
    mainColors: [],
    mainConditions: [],
    mainFields: [],
    mainMenus: [],
  };
}

function cloneValue<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => cloneValue(item)) as T;
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entryValue]) => [key, cloneValue(entryValue)]),
    ) as T;
  }

  return value;
}

function normalizeLookupKey(value: unknown) {
  return String(value ?? '').trim().toLowerCase();
}

function stripBraces(value: string) {
  return value.replace(/[{}]/g, '').trim();
}

function toText(value: unknown) {
  return value == null ? '' : String(value);
}

function toInteger(value: unknown, fallback?: number) {
  const numericValue = Number(value);
  if (Number.isFinite(numericValue)) {
    return numericValue;
  }

  return fallback;
}

function toBooleanNumber(value: unknown, truthyFallback = false) {
  if (value === true || value === 1 || value === '1') {
    return 1;
  }

  if (value === false || value === 0 || value === '0') {
    return 0;
  }

  return truthyFallback ? 1 : 0;
}

function getPersistedId(record: any) {
  const backendId = toInteger(record?.backendId);
  if (backendId && backendId > 0) {
    return backendId;
  }

  const rawId = record?.id;
  if (typeof rawId === 'number' && Number.isFinite(rawId) && rawId > 0) {
    return rawId;
  }

  if (typeof rawId === 'string' && /^\d+$/.test(rawId.trim())) {
    return Number(rawId.trim());
  }

  return null;
}

function ensureOptionalId(body: Record<string, unknown>, record: any) {
  const persistedId = getPersistedId(record);
  if (persistedId != null) {
    body.id = persistedId;
  } else {
    delete body.id;
  }

  return body;
}

function stripUndefinedEntries(record: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined));
}

function sortByOrderId<T extends Record<string, any>>(items: T[]) {
  return [...items].sort((left, right) => {
    const leftOrder = toInteger(left?.orderId ?? left?.orderid, 0) ?? 0;
    const rightOrder = toInteger(right?.orderId ?? right?.orderid, 0) ?? 0;
    return leftOrder - rightOrder;
  });
}

function uniquePersistedIds(items: any[]) {
  return Array.from(new Set(items.map((item) => getPersistedId(item)).filter((id): id is number => id != null)));
}

function buildMainFieldBody(record: any, dllCoId: string, index: number) {
  return ensureOptionalId(stripUndefinedEntries({
    ...cloneValue(record),
    dllcoid: dllCoId,
    tab: toText(record?.tab || dllCoId),
    username1: toText(record?.username1 || record?.displayName || record?.name),
    fieldname: toText(record?.fieldname || record?.fieldName || record?.sourceField),
    sysname: toText(record?.sysname || record?.systemName || record?.sourceField),
    fieldkey: toText(record?.fieldkey || record?.fieldKey || record?.backendFieldKey || record?.formKey),
    fieldsqltag: toInteger(record?.fieldsqltag ?? record?.fieldSqlTag ?? record?.controltype ?? record?.controlType, 0),
    fieldsqltagname: toText(record?.fieldsqltagname || record?.fieldSqlTagName || record?.controltypename || record?.controlTypeName),
    orderid: toInteger(record?.orderid ?? record?.orderId, index + 1),
    width: toInteger(record?.width, 0),
    controlwidth: toInteger(record?.controlwidth ?? record?.controlWidth ?? record?.width, toInteger(record?.width, 0)),
    mobilewidth: toInteger(record?.mobilewidth ?? record?.mobileWidth, toInteger(record?.width, 0)),
    visible: toBooleanNumber(record?.visible, true),
    isvisible: toBooleanNumber(record?.visible, true),
    searchable: toBooleanNumber(record?.searchable, false),
    isquery: toBooleanNumber(record?.searchable, false),
    readonly: toBooleanNumber(record?.readonly, false),
    isreadonly: toBooleanNumber(record?.readonly, false),
    required: toBooleanNumber(record?.required, false),
    isneed: toBooleanNumber(record?.required, false),
    placeholder: toText(record?.placeholder),
    prompttext: toText(record?.prompttext || record?.promptText || record?.placeholder),
    defaultdate: toText(record?.defaultdate || record?.defaultDate || record?.defaultValue),
    dictcode: toText(record?.dictcode || record?.dictCode),
    formula: toText(record?.formula),
    relationsql: toText(record?.relationsql || record?.relationSql),
    dynamicsql: toText(record?.dynamicsql || record?.dynamicSql || record?.fieldsql || record?.fieldSql),
    helptext: toText(record?.helptext || record?.helpText || record?.remark || record?.memo),
  }), record);
}

function buildConditionBody(record: any, index: number, sourceId?: number | null, formKey?: string) {
  return ensureOptionalId(stripUndefinedEntries({
    ...cloneValue(record),
    sourceid: sourceId ?? toInteger(record?.sourceid ?? record?.sourceId),
    formkey: toText(formKey || record?.formkey || record?.formKey),
    orderid: toInteger(record?.orderid ?? record?.orderId, index + 1),
    controlname: toText(record?.controlname || record?.controlName || record?.sourceField),
    controllabel: toText(record?.controllabel || record?.controlLabel || record?.name),
    controltype: toInteger(record?.controltype ?? record?.controlType ?? record?.fieldsqltag ?? record?.fieldSqlTag, 0),
    controltypename: toText(record?.controltypename || record?.controlTypeName || record?.fieldsqltagname || record?.fieldSqlTagName || record?.type),
    controlwidth: toInteger(record?.controlwidth ?? record?.controlWidth ?? record?.width, 300),
    defaultvalue: toText(record?.defaultvalue || record?.defaultValue),
    sourcesql: toText(record?.sourcesql || record?.sourceSql || record?.relationSql),
    resultfield: toText(record?.resultfield || record?.resultField || record?.formula),
    checkcond: toText(record?.checkcond || record?.checkCondition || record?.dynamicSql),
    keyfield: toText(record?.keyfield || record?.keyField || record?.dictCode || record?.sourceField),
    placeholder: toText(record?.placeholder),
  }), record);
}

function buildGridFieldBody(record: any, fieldId?: number | null) {
  return ensureOptionalId(stripUndefinedEntries({
    ...cloneValue(record),
    ...(fieldId != null ? { fieldId } : {}),
    fieldKey: toText(record?.fieldKey || record?.fieldkey || record?.backendFieldKey),
    fieldName: toText(record?.fieldName || record?.fieldname || record?.sourceField),
    displayName: toText(record?.displayName || record?.displayname || record?.name),
    orderId: toInteger(record?.orderId ?? record?.orderid, 1),
    width: toInteger(record?.width, 120),
    mobileWidth: toInteger(record?.mobileWidth ?? record?.mobilewidth, toInteger(record?.width, 120)),
    isVisible: Boolean(record?.isVisible ?? record?.isvisible ?? record?.visible ?? true),
    showMobile: Boolean(record?.showMobile ?? record?.showmobile ?? false),
    isCodeField: Boolean(record?.isCodeField ?? record?.iscodefield ?? false),
  }), record);
}

function buildColorBody(record: any, tab: string) {
  const foregroundColor = toText(record?.forcecolor || record?.foregroundColor || record?.textColor);
  const backgroundColor = toText(record?.backcolor || record?.backgroundColor);
  return ensureOptionalId(stripUndefinedEntries({
    ...cloneValue(record),
    tab,
    condition: toText(record?.condition || record?.conditionSql || record?.note || record?.label),
    forcecolor: foregroundColor,
    backcolor: backgroundColor,
    orderid: toInteger(record?.orderid ?? record?.orderId, 1),
    useflag: toBooleanNumber(!(record?.disabled ?? false), true),
    dfcolor: toText(record?.dfcolor || record?.foregroundToken || foregroundColor),
    dbcolor: toText(record?.dbcolor || record?.backgroundToken || backgroundColor),
    ifBold: toBooleanNumber(record?.ifBold ?? record?.isBold, false),
    ifItalic: toBooleanNumber(record?.ifItalic ?? record?.isItalic, false),
    ifStrickOut: toBooleanNumber(record?.ifStrickOut ?? record?.isStrikeOut, false),
    ifUnderLine: toBooleanNumber(record?.ifUnderLine ?? record?.isUnderline, false),
    fontsize: toInteger(record?.fontsize ?? record?.fontSize, 12),
  }), record);
}

function buildMenuBody(record: any, tab: string, index: number) {
  return ensureOptionalId(stripUndefinedEntries({
    ...cloneValue(record),
    tab,
    menuname: toText(record?.menuname || record?.menuName || record?.label),
    dllname: toText(record?.dllname || record?.dllName || record?.actionKey),
    action: toText(record?.action || record?.actionSql),
    actiontype: toInteger(record?.actiontype ?? record?.actionType, 0),
    orderid: toInteger(record?.orderid ?? record?.orderId, index + 1),
    menuid: toText(record?.menuid || record?.menuId),
    menucond: toText(record?.menucond || record?.menuCond || record?.menuCondition || record?.disabledCondition),
    beforemsg: toText(record?.beforemsg || record?.beforeMsg || record?.beforeMessage),
    menutype: toInteger(record?.menutype ?? record?.menuType, 0),
  }), record);
}

function normalizeDetailTypeCode(fillType: string, rawValue: unknown) {
  const directValue = String(rawValue ?? '').trim();
  if (directValue === '0' || directValue === '1' || directValue === '2' || directValue === '3') {
    return directValue === '3' ? '2' : directValue;
  }

  if (fillType === '图表') return '1';
  if (fillType === '网页') return '2';
  return '0';
}

function buildDetailBody(record: any, gridConfig: any, moduleCode: string, fillType: string, index: number) {
  const detailTypeCode = normalizeDetailTypeCode(fillType, record?.detailTypeCode);
  return ensureOptionalId(stripUndefinedEntries({
    ...cloneValue(record),
    tab: moduleCode,
    tabkey: toText(record?.tabkey || record?.tabKey || record?.formKey || record?.id || `detail_${index + 1}`),
    detailname: toText(record?.detailname || record?.detailName || record?.name || `明细 ${index + 1}`),
    detailtype: detailTypeCode,
    library: toText(record?.library || record?.dllTemplate),
    unionmodule: toText(record?.unionmodule || record?.relatedModule),
    unionparentfield: toText(record?.unionparentfield || record?.relatedModuleField),
    unionvalue: toText(record?.unionvalue || record?.relatedValue),
    unioncond: toText(record?.unioncond || record?.relatedCondition || gridConfig?.sourceCondition),
    detailsql: toText(record?.detailsql || record?.detailSql || record?.detailSQL || gridConfig?.mainSql),
    rightvisible: toBooleanNumber(record?.rightvisible ?? record?.rightDisplay, false),
    addvisible: toBooleanNumber(record?.addvisible ?? record?.addDisplay, false),
    defaultitem: toBooleanNumber(record?.defaultitem ?? record?.defaultOpen, false),
    scanmode: toBooleanNumber(record?.scanmode ?? record?.scanMode, false),
    menumode: toBooleanNumber(record?.menumode ?? record?.cardMode, false),
    bandheight: toInteger(record?.bandheight ?? record?.bandHeight, 36),
    bandwidth: toInteger(record?.bandwidth ?? record?.bandWidth, 160),
    displayrows: toInteger(record?.displayrows ?? record?.displayRows, 12),
    nocolumnheader: toBooleanNumber(record?.nocolumnheader ?? record?.noColumnHeader, false),
    griddetailcheck: toBooleanNumber(record?.griddetailcheck ?? record?.gridDetailCheck, false),
    unionflag: toInteger(record?.unionflag ?? record?.unionFlag, 0),
    dragcond: toText(record?.dragcond),
    ismrpdrag: toBooleanNumber(record?.ismrpdrag ?? record?.isMrpDrag, false),
    mrpdragtag: toText(record?.mrpdragtag ?? record?.mrpDragTag),
    privilegeoper: toText(record?.privilegeoper ?? record?.privilegeOper),
    fremark: toText(record?.fremark ?? record?.Fremark),
    autorefresh: toBooleanNumber(record?.autorefresh ?? record?.autoRefresh, true),
    isvisible: toBooleanNumber(record?.isvisible ?? record?.disabled, false),
    visiblecond: toText(record?.visiblecond ?? record?.disabledCondition),
    orderid: toInteger(record?.orderid ?? record?.orderId, index + 1),
  }), record);
}

function buildDetailChartBody(record: any, index: number) {
  return ensureOptionalId(stripUndefinedEntries({
    ...cloneValue(record),
    orderid: toInteger(record?.orderid ?? record?.orderId, index + 1),
    charttype: toText(record?.charttype || record?.chartType || '0'),
    charttitle: toText(record?.charttitle || record?.chartTitle),
    chartcolor: toText(record?.chartcolor || record?.chartColor),
    chartcolordf: toText(record?.chartcolordf || record?.chartColorDf || record?.chartColorDF),
    chart3d: toBooleanNumber(record?.chart3d ?? record?.chart3D, false),
    gridlinevisible: toBooleanNumber(record?.gridlinevisible ?? record?.gridLineVisible, true),
    xlabelfield: toText(record?.xlabelfield || record?.XLabelField),
    yvaluefield: toText(record?.yvaluefield || record?.YValueField),
    xaxistitle: toText(record?.xaxistitle || record?.XAxisTitle),
    yaxistitle: toText(record?.yaxistitle || record?.YAxisTitle),
    yaxisshared: toBooleanNumber(record?.yaxisshared ?? record?.YAxisShared, false),
    markvisible: toBooleanNumber(record?.markvisible ?? record?.markVisible, false),
    legendvisible: toBooleanNumber(record?.legendvisible ?? record?.legendVisible, false),
    isvisible: toBooleanNumber(record?.isvisible ?? record?.isVisible, false),
    isabsolutely: toBooleanNumber(record?.isabsolutely ?? record?.IsAbsolutely, false),
    yscale: toText(record?.yscale || record?.YScale),
    yvaluefield1: toText(record?.yvaluefield1),
    yvaluefield2: toText(record?.yvaluefield2),
    valuevisible: toBooleanNumber(record?.valuevisible ?? record?.valueVisible, false),
    labelangle: toText(record?.labelangle),
    labelvisible: toBooleanNumber(record?.labelvisible, false),
    labelsize: toText(record?.labelsize),
    labelspaced: toText(record?.labelspaced || record?.labelSpaced),
    circlejagge: toBooleanNumber(record?.circlejagge, false),
    circlehollow: toBooleanNumber(record?.circlehollow, false),
  }), record);
}

function buildDetailEntries(
  detailTabs: Array<{ id: string; name: string }>,
  detailTabConfigs: Record<string, any>,
  detailTableColumns: Record<string, any[]>,
  detailTableConfigs: Record<string, any>,
) {
  return detailTabs.map((tab) => ({
    columns: cloneValue(detailTableColumns[tab.id] ?? []),
    oldTabId: tab.id,
    tableConfig: cloneValue(detailTableConfigs[tab.id] ?? {}),
    tabConfig: cloneValue(detailTabConfigs[tab.id] ?? {}),
    tabName: tab.name,
  }));
}

export function useSingleTableModuleSettingsSave({
  activeTab,
  currentModuleCode,
  currentModuleName,
  detailTabConfigs,
  detailTableColumns,
  detailTableConfigs,
  detailTabs,
  documentConditionOwnerFieldKey,
  documentConditionOwnerSourceId,
  isActive,
  leftFilterFields,
  leftTableColumns,
  leftTableConfig,
  mainFilterFields,
  mainTableColumns,
  mainTableConfig,
  mapColorRule,
  mapConditionRecordToField,
  mapContextMenuItem,
  mapDetailChartConfig,
  mapDetailGridFieldToColumn,
  mapDetailRecord,
  mapFieldGridFieldToColumn,
  mapMainFieldRecordToColumn,
  onShowToast,
  setActiveTab,
  setDetailTabConfigs,
  setDetailTableColumns,
  setDetailTableConfigs,
  setDetailTabs,
  setLeftFilterFields,
  setLeftTableColumns,
  setLeftTableConfig,
  setMainFilterFields,
  setMainTableColumns,
  setMainTableConfig,
}: UseSingleTableModuleSettingsSaveOptions) {
  const [isSaving, setIsSaving] = useState(false);
  const baselineRef = useRef<SaveBaseline>(createEmptyBaseline());
  const moduleCodeRef = useRef('');

  useEffect(() => {
    if (!isActive || !currentModuleCode.trim()) {
      baselineRef.current = createEmptyBaseline();
      moduleCodeRef.current = '';
      return;
    }

    if (moduleCodeRef.current !== currentModuleCode.trim()) {
      baselineRef.current = createEmptyBaseline();
      moduleCodeRef.current = currentModuleCode.trim();
    }
  }, [currentModuleCode, isActive]);

  const captureMainFields = useCallback((rows: any[]) => {
    baselineRef.current.mainFields = cloneValue(rows);
  }, []);

  const captureMainConditions = useCallback((rows: any[]) => {
    baselineRef.current.mainConditions = cloneValue(rows);
  }, []);

  const captureMainColors = useCallback((rows: any[]) => {
    baselineRef.current.mainColors = cloneValue(rows);
  }, []);

  const captureMainMenus = useCallback((rows: any[]) => {
    baselineRef.current.mainMenus = cloneValue(rows);
  }, []);

  const captureFieldConditions = useCallback((fieldId: number, rows: any[]) => {
    if (!Number.isFinite(fieldId) || fieldId <= 0) {
      return;
    }

    baselineRef.current.fieldConditionsByFieldId[fieldId] = cloneValue(rows);
  }, []);

  const captureFieldGridFields = useCallback((fieldId: number, rows: any[]) => {
    if (!Number.isFinite(fieldId) || fieldId <= 0) {
      return;
    }

    baselineRef.current.fieldGridFieldsByFieldId[fieldId] = cloneValue(rows);
  }, []);

  const captureFieldColors = useCallback((fieldId: number, rows: any[]) => {
    if (!Number.isFinite(fieldId) || fieldId <= 0) {
      return;
    }

    baselineRef.current.fieldColorsByFieldId[fieldId] = cloneValue(rows);
  }, []);

  const captureDetails = useCallback((input: CaptureDetailsInput) => {
    baselineRef.current.details = {
      tabConfigs: cloneValue(input.tabConfigs),
      tableColumns: cloneValue(input.tableColumns),
      tableConfigs: cloneValue(input.tableConfigs),
      tabs: cloneValue(input.tabs),
    };
  }, []);

  const captureDetailResources = useCallback((tabId: string, input: CaptureDetailResourcesInput) => {
    if (!tabId) {
      return;
    }

    if (input.columns) {
      baselineRef.current.details.tableColumns[tabId] = cloneValue(input.columns);
    }

    if (input.tableConfig) {
      baselineRef.current.details.tableConfigs[tabId] = cloneValue(input.tableConfig);
    }
  }, []);

  const saveCurrentPage = useCallback(async () => {
    const moduleCode = currentModuleCode.trim();
    if (!isActive || !moduleCode) {
      onShowToast('请先保存菜单信息，再保存模块设置。');
      return false;
    }

    setIsSaving(true);

    try {
      await saveSingleTableModuleConfig(moduleCode, {
        dllcoid: moduleCode,
        toolsname: currentModuleName.trim() || moduleCode,
      });

      const savedMainFieldRows: Record<string, unknown>[] = [];
      const savedMainFields = [] as any[];
      const mainFieldPairs = [] as Array<{ current: any; saved: any }>;

      for (const [index, field] of sortByOrderId(mainTableColumns).entries()) {
        const savedRow = await saveSingleTableModuleField(moduleCode, buildMainFieldBody(field, moduleCode, index));
        const mappedField = mapMainFieldRecordToColumn(savedRow, index);
        savedMainFieldRows.push(savedRow);
        savedMainFields.push(mappedField);
        mainFieldPairs.push({ current: field, saved: mappedField });
      }

      const ownerKey = normalizeLookupKey(stripBraces(documentConditionOwnerFieldKey));
      const ownerSourceId = normalizeLookupKey(documentConditionOwnerSourceId);
      const ownerFieldPair = mainFieldPairs.find(({ current, saved }) => {
        const currentIdKey = normalizeLookupKey(current?.id ?? current?.backendId);
        const savedIdKey = normalizeLookupKey(saved?.backendId ?? saved?.id);
        const currentFieldKey = normalizeLookupKey(stripBraces(toText(current?.backendFieldKey || current?.fieldKey || current?.formKey)));
        const savedFieldKey = normalizeLookupKey(stripBraces(toText(saved?.backendFieldKey || saved?.fieldKey || saved?.formKey)));
        const currentSourceField = normalizeLookupKey(toText(current?.sourceField || current?.fieldname || current?.fieldName));
        const savedSourceField = normalizeLookupKey(toText(saved?.sourceField || saved?.fieldname || saved?.fieldName));
        return (
          (ownerSourceId && (ownerSourceId === currentIdKey || ownerSourceId === savedIdKey))
          || (ownerKey && (ownerKey === currentFieldKey || ownerKey === savedFieldKey || ownerKey === currentSourceField || ownerKey === savedSourceField))
        );
      }) ?? null;

      const currentOwnerFieldId = getPersistedId(ownerFieldPair?.saved);
      const currentOwnerFormKey = toText(ownerFieldPair?.saved?.backendFieldKey || ownerFieldPair?.saved?.fieldKey || ownerFieldPair?.saved?.formKey);

      const savedMainConditionRows: Record<string, unknown>[] = [];
      const savedMainConditions = [] as any[];
      for (const [index, condition] of sortByOrderId(mainFilterFields).entries()) {
        const savedRow = await saveSingleTableModuleCondition(moduleCode, buildConditionBody(condition, index));
        savedMainConditionRows.push(savedRow);
        savedMainConditions.push(mapConditionRecordToField(savedRow, index));
      }

      const savedMainColorRows: Record<string, unknown>[] = [];
      const savedMainColors = [] as any[];
      for (const [index, colorRule] of sortByOrderId(mainTableConfig?.colorRules ?? []).entries()) {
        const savedRow = await saveSingleTableModuleColor(moduleCode, buildColorBody(colorRule, moduleCode));
        savedMainColorRows.push(savedRow);
        savedMainColors.push(mapColorRule(savedRow, index));
      }

      const savedMainMenuRows: Record<string, unknown>[] = [];
      const savedMainMenus = [] as any[];
      for (const [index, menu] of sortByOrderId(mainTableConfig?.contextMenuItems ?? []).entries()) {
        const savedRow = await saveSingleTableModuleMenu(moduleCode, buildMenuBody(menu, moduleCode, index));
        savedMainMenuRows.push(savedRow);
        savedMainMenus.push(mapContextMenuItem(savedRow, index));
      }

      let savedLeftConditions = cloneValue(leftFilterFields);
      let savedLeftColumns = cloneValue(leftTableColumns);
      let savedLeftColors = cloneValue(leftTableConfig?.colorRules ?? []);

      if (currentOwnerFieldId != null && currentOwnerFieldId > 0) {
        const nextLeftConditions: any[] = [];
        for (const [index, condition] of sortByOrderId(leftFilterFields).entries()) {
          const savedRow = await saveSingleTableFieldCondition(
            moduleCode,
            currentOwnerFieldId,
            buildConditionBody(condition, index, currentOwnerFieldId, currentOwnerFormKey),
          );
          nextLeftConditions.push(mapConditionRecordToField(savedRow, index, {
            sourceid: currentOwnerFieldId,
            formKey: currentOwnerFormKey,
          }));
        }

        const nextLeftColumns: any[] = [];
        for (const [index, column] of sortByOrderId(leftTableColumns).entries()) {
          const savedRow = await saveSingleTableFieldGridField(
            moduleCode,
            currentOwnerFieldId,
            buildGridFieldBody(column, currentOwnerFieldId),
          );
          nextLeftColumns.push(mapFieldGridFieldToColumn(savedRow, index, column));
        }

        const nextLeftColors: any[] = [];
        for (const [index, colorRule] of sortByOrderId(leftTableConfig?.colorRules ?? []).entries()) {
          const savedRow = await saveSingleTableFieldColor(
            moduleCode,
            currentOwnerFieldId,
            buildColorBody(colorRule, currentOwnerFormKey || moduleCode),
          );
          nextLeftColors.push(mapColorRule(savedRow, index));
        }

        for (const fieldId of Object.keys(baselineRef.current.fieldConditionsByFieldId).map(Number).filter((value) => value !== currentOwnerFieldId)) {
          for (const persistedId of uniquePersistedIds(baselineRef.current.fieldConditionsByFieldId[fieldId] ?? [])) {
            await deleteSingleTableFieldCondition(moduleCode, fieldId, persistedId);
          }
        }

        for (const fieldId of Object.keys(baselineRef.current.fieldGridFieldsByFieldId).map(Number).filter((value) => value !== currentOwnerFieldId)) {
          for (const persistedId of uniquePersistedIds(baselineRef.current.fieldGridFieldsByFieldId[fieldId] ?? [])) {
            await deleteSingleTableFieldGridField(moduleCode, fieldId, persistedId);
          }
        }

        for (const fieldId of Object.keys(baselineRef.current.fieldColorsByFieldId).map(Number).filter((value) => value !== currentOwnerFieldId)) {
          for (const persistedId of uniquePersistedIds(baselineRef.current.fieldColorsByFieldId[fieldId] ?? [])) {
            await deleteSingleTableFieldColor(moduleCode, fieldId, persistedId);
          }
        }

        const savedLeftConditionIds = new Set(uniquePersistedIds(nextLeftConditions));
        for (const persistedId of uniquePersistedIds(baselineRef.current.fieldConditionsByFieldId[currentOwnerFieldId] ?? [])) {
          if (!savedLeftConditionIds.has(persistedId)) {
            await deleteSingleTableFieldCondition(moduleCode, currentOwnerFieldId, persistedId);
          }
        }

        const savedLeftColumnIds = new Set(uniquePersistedIds(nextLeftColumns));
        for (const persistedId of uniquePersistedIds(baselineRef.current.fieldGridFieldsByFieldId[currentOwnerFieldId] ?? [])) {
          if (!savedLeftColumnIds.has(persistedId)) {
            await deleteSingleTableFieldGridField(moduleCode, currentOwnerFieldId, persistedId);
          }
        }

        const savedLeftColorIds = new Set(uniquePersistedIds(nextLeftColors));
        for (const persistedId of uniquePersistedIds(baselineRef.current.fieldColorsByFieldId[currentOwnerFieldId] ?? [])) {
          if (!savedLeftColorIds.has(persistedId)) {
            await deleteSingleTableFieldColor(moduleCode, currentOwnerFieldId, persistedId);
          }
        }

        savedLeftConditions = nextLeftConditions;
        savedLeftColumns = nextLeftColumns;
        savedLeftColors = nextLeftColors;
      }

      const detailEntries = buildDetailEntries(detailTabs, detailTabConfigs, detailTableColumns, detailTableConfigs);
      const savedDetailEntries: DetailSaveEntry[] = [];

      for (const [index, detailEntry] of detailEntries.entries()) {
        const fillType = toText(detailEntry.tabConfig?.detailType || '表格');
        const savedRow = await saveSingleTableModuleDetail(
          moduleCode,
          buildDetailBody(detailEntry.tabConfig, detailEntry.tableConfig, moduleCode, fillType, index),
        );
        const mapped = mapDetailRecord(savedRow, index);
        savedDetailEntries.push({
          ...detailEntry,
          detailId: getPersistedId(mapped.config),
          fillType,
          newTabId: mapped.tab.id,
          tabConfig: { ...detailEntry.tabConfig, ...mapped.config },
          tableConfig: {
            ...detailEntry.tableConfig,
            ...mapped.gridConfig,
            chartConfig: detailEntry.tableConfig?.chartConfig ?? mapped.gridConfig?.chartConfig,
            colorRules: detailEntry.tableConfig?.colorRules ?? [],
            contextMenuItems: detailEntry.tableConfig?.contextMenuItems ?? [],
          },
          unionModule: toText(detailEntry.tabConfig?.relatedModule || mapped.config?.relatedModule),
        });
      }

      const sharedModuleResources = new Map<string, SharedModuleResourceEntry>();
      const nextDetailTabs: Array<{ id: string; name: string }> = [];
      const nextDetailTabConfigs: Record<string, any> = {};
      const nextDetailTableColumns: Record<string, any[]> = {};
      const nextDetailTableConfigs: Record<string, any> = {};
      const nextDetailIds = new Set<number>();

      for (const detailEntry of savedDetailEntries) {
        const nextTabId = detailEntry.newTabId;
        const nextDetailId = detailEntry.detailId;
        const baselineTabConfig = baselineRef.current.details.tabConfigs[detailEntry.oldTabId] ?? {};
        const baselineTableConfig = baselineRef.current.details.tableConfigs[detailEntry.oldTabId] ?? {};
        const baselineColumns = baselineRef.current.details.tableColumns[detailEntry.oldTabId] ?? [];
        const isGridLike = detailEntry.fillType === '表格' || detailEntry.fillType === '树表格';

        nextDetailTabs.push({ id: nextTabId, name: toText(detailEntry.tabConfig?.detailName || detailEntry.tabName) || detailEntry.tabName });
        nextDetailTabConfigs[nextTabId] = cloneValue(detailEntry.tabConfig);
        nextDetailTableColumns[nextTabId] = cloneValue(detailEntry.columns);
        nextDetailTableConfigs[nextTabId] = cloneValue(detailEntry.tableConfig);

        if (nextDetailId != null) {
          nextDetailIds.add(nextDetailId);
        }

        if (detailEntry.unionModule && isGridLike) {
          const currentShared = sharedModuleResources.get(detailEntry.unionModule);
          const nextShared: SharedModuleResourceEntry = currentShared ?? {
            baselineColors: cloneValue(baselineTableConfig?.colorRules ?? []),
            baselineColumns: cloneValue(baselineColumns),
            baselineMenus: cloneValue(baselineTableConfig?.contextMenuItems ?? []),
            colors: cloneValue(detailEntry.tableConfig?.colorRules ?? []),
            columns: cloneValue(detailEntry.columns),
            menus: cloneValue(detailEntry.tableConfig?.contextMenuItems ?? []),
            moduleCode: detailEntry.unionModule,
          };

          if (!currentShared || detailEntry.oldTabId === activeTab || (detailEntry.columns?.length ?? 0) > nextShared.columns.length) {
            nextShared.columns = cloneValue(detailEntry.columns);
            nextShared.colors = cloneValue(detailEntry.tableConfig?.colorRules ?? []);
            nextShared.menus = cloneValue(detailEntry.tableConfig?.contextMenuItems ?? []);
          }

          sharedModuleResources.set(detailEntry.unionModule, nextShared);

          if (Number.isFinite(nextDetailId) && !toText(baselineTabConfig?.relatedModule)) {
            for (const persistedId of uniquePersistedIds(baselineColumns)) {
              await deleteSingleTableDetailGridField(moduleCode, nextDetailId as number, persistedId);
            }
            for (const persistedId of uniquePersistedIds(baselineTableConfig?.colorRules ?? [])) {
              await deleteSingleTableDetailColor(moduleCode, nextDetailId as number, persistedId);
            }
            for (const persistedId of uniquePersistedIds(baselineTableConfig?.contextMenuItems ?? [])) {
              await deleteSingleTableDetailMenu(moduleCode, nextDetailId as number, persistedId);
            }
          }
        } else if (isGridLike && Number.isFinite(nextDetailId)) {
          const nextColumns: any[] = [];
          for (const [index, column] of sortByOrderId(detailEntry.columns).entries()) {
            const savedRow = await saveSingleTableDetailGridField(moduleCode, nextDetailId as number, buildGridFieldBody(column));
            nextColumns.push(mapDetailGridFieldToColumn(savedRow, index));
          }

          const nextColors: any[] = [];
          for (const [index, colorRule] of sortByOrderId(detailEntry.tableConfig?.colorRules ?? []).entries()) {
            const savedRow = await saveSingleTableDetailColor(moduleCode, nextDetailId as number, buildColorBody(colorRule, moduleCode));
            nextColors.push(mapColorRule(savedRow, index));
          }

          const nextMenus: any[] = [];
          for (const [index, menu] of sortByOrderId(detailEntry.tableConfig?.contextMenuItems ?? []).entries()) {
            const savedRow = await saveSingleTableDetailMenu(moduleCode, nextDetailId as number, buildMenuBody(menu, moduleCode, index));
            nextMenus.push(mapContextMenuItem(savedRow, index));
          }

          nextDetailTableColumns[nextTabId] = nextColumns;
          nextDetailTableConfigs[nextTabId] = {
            ...nextDetailTableConfigs[nextTabId],
            colorRules: nextColors,
            colorRulesEnabled: nextColors.length > 0,
            contextMenuItems: nextMenus,
            contextMenuEnabled: nextMenus.length > 0,
          };

          const savedDetailColumnIds = new Set(uniquePersistedIds(nextColumns));
          for (const persistedId of uniquePersistedIds(baselineColumns)) {
            if (!savedDetailColumnIds.has(persistedId)) {
              await deleteSingleTableDetailGridField(moduleCode, nextDetailId as number, persistedId);
            }
          }

          const savedDetailColorIds = new Set(uniquePersistedIds(nextColors));
          for (const persistedId of uniquePersistedIds(baselineTableConfig?.colorRules ?? [])) {
            if (!savedDetailColorIds.has(persistedId)) {
              await deleteSingleTableDetailColor(moduleCode, nextDetailId as number, persistedId);
            }
          }

          const savedDetailMenuIds = new Set(uniquePersistedIds(nextMenus));
          for (const persistedId of uniquePersistedIds(baselineTableConfig?.contextMenuItems ?? [])) {
            if (!savedDetailMenuIds.has(persistedId)) {
              await deleteSingleTableDetailMenu(moduleCode, nextDetailId as number, persistedId);
            }
          }
        }

        if (detailEntry.fillType === '图表' && Number.isFinite(nextDetailId)) {
          const savedChartRow = await saveSingleTableDetailChart(
            moduleCode,
            nextDetailId as number,
            buildDetailChartBody(detailEntry.tableConfig?.chartConfig ?? {}, 0),
          );
          const nextChartConfig = mapDetailChartConfig(savedChartRow);
          nextDetailTableConfigs[nextTabId] = {
            ...nextDetailTableConfigs[nextTabId],
            chartConfig: nextChartConfig,
          };

          const baselineChartId = getPersistedId(baselineTableConfig?.chartConfig);
          const savedChartId = getPersistedId(nextChartConfig);
          if (baselineChartId != null && baselineChartId !== savedChartId) {
            await deleteSingleTableDetailChart(moduleCode, nextDetailId as number, baselineChartId);
          }
        }
      }

      for (const sharedEntry of sharedModuleResources.values()) {
        const nextColumns: any[] = [];
        for (const [index, column] of sortByOrderId(sharedEntry.columns).entries()) {
          const savedRow = await saveSingleTableModuleField(sharedEntry.moduleCode, buildMainFieldBody(column, sharedEntry.moduleCode, index));
          nextColumns.push(mapMainFieldRecordToColumn(savedRow, index));
        }

        const nextColors: any[] = [];
        for (const [index, colorRule] of sortByOrderId(sharedEntry.colors).entries()) {
          const savedRow = await saveSingleTableModuleColor(sharedEntry.moduleCode, buildColorBody(colorRule, sharedEntry.moduleCode));
          nextColors.push(mapColorRule(savedRow, index));
        }

        const nextMenus: any[] = [];
        for (const [index, menu] of sortByOrderId(sharedEntry.menus).entries()) {
          const savedRow = await saveSingleTableModuleMenu(sharedEntry.moduleCode, buildMenuBody(menu, sharedEntry.moduleCode, index));
          nextMenus.push(mapContextMenuItem(savedRow, index));
        }

        const nextColumnIds = new Set(uniquePersistedIds(nextColumns));
        for (const persistedId of uniquePersistedIds(sharedEntry.baselineColumns)) {
          if (!nextColumnIds.has(persistedId)) {
            await deleteSingleTableModuleField(sharedEntry.moduleCode, persistedId);
          }
        }

        const nextColorIds = new Set(uniquePersistedIds(nextColors));
        for (const persistedId of uniquePersistedIds(sharedEntry.baselineColors)) {
          if (!nextColorIds.has(persistedId)) {
            await deleteSingleTableModuleColor(sharedEntry.moduleCode, persistedId);
          }
        }

        const nextMenuIds = new Set(uniquePersistedIds(nextMenus));
        for (const persistedId of uniquePersistedIds(sharedEntry.baselineMenus)) {
          if (!nextMenuIds.has(persistedId)) {
            await deleteSingleTableModuleMenu(sharedEntry.moduleCode, persistedId);
          }
        }

        savedDetailEntries
          .filter((entry) => entry.unionModule === sharedEntry.moduleCode)
          .forEach((entry) => {
            nextDetailTableColumns[entry.newTabId] = cloneValue(nextColumns);
            nextDetailTableConfigs[entry.newTabId] = {
              ...nextDetailTableConfigs[entry.newTabId],
              colorRules: cloneValue(nextColors),
              colorRulesEnabled: nextColors.length > 0,
              contextMenuItems: cloneValue(nextMenus),
              contextMenuEnabled: nextMenus.length > 0,
            };
          });
      }

      const savedMainConditionIds = new Set(uniquePersistedIds(savedMainConditions));
      for (const persistedId of uniquePersistedIds(baselineRef.current.mainConditions)) {
        if (!savedMainConditionIds.has(persistedId)) {
          await deleteSingleTableModuleCondition(moduleCode, persistedId);
        }
      }

      const savedMainColorIds = new Set(uniquePersistedIds(savedMainColors));
      for (const persistedId of uniquePersistedIds(baselineRef.current.mainColors)) {
        if (!savedMainColorIds.has(persistedId)) {
          await deleteSingleTableModuleColor(moduleCode, persistedId);
        }
      }

      const savedMainMenuIds = new Set(uniquePersistedIds(savedMainMenus));
      for (const persistedId of uniquePersistedIds(baselineRef.current.mainMenus)) {
        if (!savedMainMenuIds.has(persistedId)) {
          await deleteSingleTableModuleMenu(moduleCode, persistedId);
        }
      }

      const savedMainFieldIds = new Set(uniquePersistedIds(savedMainFields));
      for (const persistedId of uniquePersistedIds(baselineRef.current.mainFields)) {
        if (!savedMainFieldIds.has(persistedId)) {
          await deleteSingleTableModuleField(moduleCode, persistedId);
        }
      }

      const baselineDetailIds = baselineRef.current.details.tabs
        .map((tab) => getPersistedId(baselineRef.current.details.tabConfigs[tab.id]))
        .filter((id): id is number => id != null);
      for (const persistedId of baselineDetailIds) {
        if (!nextDetailIds.has(persistedId)) {
          await deleteSingleTableModuleDetail(moduleCode, persistedId);
        }
      }

      setMainTableColumns(savedMainFields);
      setMainFilterFields(savedMainConditions);
      setMainTableConfig((prev) => ({
        ...prev,
        colorRules: savedMainColors,
        colorRulesEnabled: savedMainColors.length > 0,
        contextMenuItems: savedMainMenus,
        contextMenuEnabled: savedMainMenus.length > 0,
      }));
      setLeftFilterFields(savedLeftConditions);
      setLeftTableColumns(savedLeftColumns);
      setLeftTableConfig((prev) => ({
        ...prev,
        colorRules: savedLeftColors,
        colorRulesEnabled: savedLeftColors.length > 0,
      }));
      setDetailTabs(nextDetailTabs);
      setDetailTabConfigs(nextDetailTabConfigs);
      setDetailTableColumns(nextDetailTableColumns);
      setDetailTableConfigs(nextDetailTableConfigs);
      setActiveTab((prev) => {
        if (nextDetailTabs.some((tab) => tab.id === prev)) {
          return prev;
        }

        const remappedActiveTab = savedDetailEntries.find((entry) => entry.oldTabId === prev)?.newTabId;
        return remappedActiveTab || nextDetailTabs[0]?.id || 'main';
      });

      baselineRef.current = {
        details: {
          tabConfigs: cloneValue(nextDetailTabConfigs),
          tableColumns: cloneValue(nextDetailTableColumns),
          tableConfigs: cloneValue(nextDetailTableConfigs),
          tabs: cloneValue(nextDetailTabs),
        },
        fieldColorsByFieldId: currentOwnerFieldId != null ? { [currentOwnerFieldId]: cloneValue(savedLeftColors) } : {},
        fieldConditionsByFieldId: currentOwnerFieldId != null ? { [currentOwnerFieldId]: cloneValue(savedLeftConditions) } : {},
        fieldGridFieldsByFieldId: currentOwnerFieldId != null ? { [currentOwnerFieldId]: cloneValue(savedLeftColumns) } : {},
        mainColors: cloneValue(savedMainColors),
        mainConditions: cloneValue(savedMainConditions),
        mainFields: cloneValue(savedMainFields),
        mainMenus: cloneValue(savedMainMenus),
      };

      onShowToast('单表模块设置已保存。');
      return true;
    } catch (error) {
      const message = error instanceof Error && error.message ? error.message : '单表模块设置保存失败。';
      onShowToast(message);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [
    activeTab,
    currentModuleCode,
    currentModuleName,
    detailTabConfigs,
    detailTableColumns,
    detailTableConfigs,
    detailTabs,
    documentConditionOwnerFieldKey,
    documentConditionOwnerSourceId,
    isActive,
    leftFilterFields,
    leftTableColumns,
    leftTableConfig,
    mainFilterFields,
    mainTableColumns,
    mainTableConfig,
    mapColorRule,
    mapConditionRecordToField,
    mapContextMenuItem,
    mapDetailChartConfig,
    mapDetailGridFieldToColumn,
    mapDetailRecord,
    mapFieldGridFieldToColumn,
    mapMainFieldRecordToColumn,
    onShowToast,
    setActiveTab,
    setDetailTabConfigs,
    setDetailTableColumns,
    setDetailTableConfigs,
    setDetailTabs,
    setLeftFilterFields,
    setLeftTableColumns,
    setLeftTableConfig,
    setMainFilterFields,
    setMainTableColumns,
    setMainTableConfig,
  ]);

  return {
    captureDetailResources,
    captureDetails,
    captureFieldColors,
    captureFieldConditions,
    captureFieldGridFields,
    captureMainColors,
    captureMainConditions,
    captureMainFields,
    captureMainMenus,
    isSaving,
    saveCurrentPage,
  };
}
