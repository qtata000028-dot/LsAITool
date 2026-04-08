import { apiRequest } from './http';

export interface SingleTableModuleConfigDto extends Record<string, unknown> {
  addDllName?: unknown;
  addEnable?: unknown;
  conditionKey?: unknown;
  deleteEnable?: unknown;
  deleteCond?: unknown;
  dllCoId?: unknown;
  dllType?: unknown;
  formKey?: unknown;
  id?: unknown;
  isReport?: unknown;
  mainTable?: unknown;
  modifyEnable?: unknown;
  modifyCond?: unknown;
  moduleName?: unknown;
  overbackKey?: unknown;
  querySql?: unknown;
}

export type SingleTableModuleFieldDto = Record<string, unknown>;
export type SingleTableDesignerControlDto = Record<string, unknown>;
export type SingleTableDesignerGroupDto = Record<string, unknown>;
export type SingleTableDesignerLayoutDto = Record<string, unknown>;
export type BillTypeDesignerControlDto = Record<string, unknown>;
export type BillTypeDesignerGroupDto = Record<string, unknown>;
export type BillTypeDesignerLayoutDto = Record<string, unknown>;
export type BillTypeDetailFieldDto = Record<string, unknown>;
export type SingleTableConditionDto = Record<string, unknown>;
export type SingleTableDetailDto = Record<string, unknown>;
export type SingleTableGridFieldDto = Record<string, unknown>;
export type SingleTableDetailChartDto = Record<string, unknown>;
export type SingleTableColorRuleDto = Record<string, unknown>;
export type SingleTableContextMenuDto = Record<string, unknown>;

export interface BillTypeConfigDto {
  detailSql?: unknown;
  detailTable?: unknown;
  formKey?: unknown;
  id?: unknown;
  masterSql?: unknown;
  masterTable?: unknown;
  overbackKey?: unknown;
  remark?: unknown;
  typeCode?: unknown;
  typeName?: unknown;
  billSequence?: unknown;
}

function encodePathParam(value: string) {
  return encodeURIComponent(value.trim());
}

function getFirstDefinedValue(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(record, key)) continue;
    const value = record[key];
    if (value !== undefined && value !== null) {
      return value;
    }
  }

  return undefined;
}

function toText(value: unknown) {
  if (value === undefined || value === null) {
    return '';
  }

  return String(value).trim();
}

function toOptionalNumber(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toEnableNumber(value: unknown, fallback = 1): 0 | 1 {
  if (value === true || value === 1 || value === '1') {
    return 1;
  }

  if (value === false || value === 0 || value === '0') {
    return 0;
  }

  return fallback === 0 ? 0 : 1;
}

function stripUndefinedEntries<T extends Record<string, unknown>>(record: T) {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined),
  ) as T;
}

export function normalizeSingleTableModuleConfig(record?: SingleTableModuleConfigDto | null) {
  const source = record && typeof record === 'object'
    ? record as Record<string, unknown>
    : {};
  const normalized: SingleTableModuleConfigDto = {
    ...source,
    addDllName: toText(getFirstDefinedValue(source, ['addDllName', 'adddllname', 'AddDllName'])),
    addEnable: toEnableNumber(getFirstDefinedValue(source, ['addEnable', 'addenable', 'AddEnable']), 1),
    conditionKey: toText(getFirstDefinedValue(source, ['conditionKey', 'conditionkey', 'condKey', 'condkey'])),
    deleteEnable: toEnableNumber(getFirstDefinedValue(source, ['deleteEnable', 'deleteenable', 'DeleteEnable']), 1),
    deleteCond: toText(getFirstDefinedValue(source, ['deleteCond', 'deletecond'])),
    dllCoId: toText(getFirstDefinedValue(source, ['dllCoId', 'dllcoid', 'DllCoid'])),
    formKey: toText(getFirstDefinedValue(source, ['formKey', 'formkey'])),
    id: getFirstDefinedValue(source, ['id', 'ID', 'Id', 'dllid', 'DllID']),
    mainTable: toText(getFirstDefinedValue(source, ['mainTable', 'maintable', 'tableName', 'tablename', 'SQLDT1', 'sqldt1'])),
    modifyEnable: toEnableNumber(getFirstDefinedValue(source, ['modifyEnable', 'modifyenable', 'ModifyEnable']), 1),
    modifyCond: toText(getFirstDefinedValue(source, ['modifyCond', 'modifycond'])),
    moduleName: toText(getFirstDefinedValue(source, ['moduleName', 'modulename', 'ToolsName', 'toolsname'])),
    overbackKey: toText(getFirstDefinedValue(source, ['overbackKey', 'overbackkey'])),
    querySql: toText(getFirstDefinedValue(source, ['querySql', 'querysql', 'mainSql', 'mainsql', 'SQL', 'sql'])),
  };
  const dllType = toOptionalNumber(getFirstDefinedValue(source, ['dllType', 'dlltype']));
  const isReport = toOptionalNumber(getFirstDefinedValue(source, ['isReport', 'isreport']));

  if (dllType !== undefined) {
    normalized.dllType = dllType;
  }

  if (isReport !== undefined) {
    normalized.isReport = isReport;
  }

  return normalized;
}

export function buildSingleTableModuleConfigBody(record: Record<string, unknown>) {
  const source = record && typeof record === 'object'
    ? record
    : {};
  const normalized = normalizeSingleTableModuleConfig(record as SingleTableModuleConfigDto);
  const id = getFirstDefinedValue(normalized as Record<string, unknown>, ['id', 'ID', 'Id', 'dllid', 'DllID']);
  const dllCoId = toText(getFirstDefinedValue(normalized as Record<string, unknown>, ['dllCoId', 'dllcoid', 'DllCoid']));
  const moduleName = toText(getFirstDefinedValue(normalized as Record<string, unknown>, ['moduleName', 'modulename', 'ToolsName', 'toolsname']));
  const hasQuerySql = getFirstDefinedValue(source, ['querySql', 'querysql', 'mainSql', 'mainsql', 'SQL', 'sql']) !== undefined;
  const querySql = hasQuerySql
    ? toText(getFirstDefinedValue(normalized as Record<string, unknown>, ['querySql', 'querysql', 'mainSql', 'mainsql', 'SQL', 'sql']))
    : undefined;
  const mainTable = toText(getFirstDefinedValue(normalized as Record<string, unknown>, ['mainTable', 'maintable', 'tableName', 'tablename', 'SQLDT1', 'sqldt1']));
  const formKey = toText(getFirstDefinedValue(normalized as Record<string, unknown>, ['formKey', 'formkey']));
  const conditionKey = toText(getFirstDefinedValue(normalized as Record<string, unknown>, ['conditionKey', 'conditionkey', 'condKey', 'condkey']));
  const overbackKey = toText(getFirstDefinedValue(normalized as Record<string, unknown>, ['overbackKey', 'overbackkey']));
  const addDllName = toText(getFirstDefinedValue(normalized as Record<string, unknown>, ['addDllName', 'adddllname', 'AddDllName']));
  const addEnable = toEnableNumber(getFirstDefinedValue(normalized as Record<string, unknown>, ['addEnable', 'addenable', 'AddEnable']), 1);
  const deleteEnable = toEnableNumber(getFirstDefinedValue(normalized as Record<string, unknown>, ['deleteEnable', 'deleteenable', 'DeleteEnable']), 1);
  const modifyCond = toText(getFirstDefinedValue(normalized as Record<string, unknown>, ['modifyCond', 'modifycond']));
  const modifyEnable = toEnableNumber(getFirstDefinedValue(normalized as Record<string, unknown>, ['modifyEnable', 'modifyenable', 'ModifyEnable']), 1);
  const deleteCond = toText(getFirstDefinedValue(normalized as Record<string, unknown>, ['deleteCond', 'deletecond']));
  const isReport = toOptionalNumber(getFirstDefinedValue(normalized as Record<string, unknown>, ['isReport', 'isreport']));
  const dllType = toOptionalNumber(getFirstDefinedValue(normalized as Record<string, unknown>, ['dllType', 'dlltype']));

  return stripUndefinedEntries({
    id,
    dllCoId,
    DllCoid: dllCoId,
    moduleName,
    ToolsName: moduleName,
    querySql,
    querysql: querySql,
    SQL: querySql,
    mainTable,
    maintable: mainTable,
    SQLDT1: mainTable,
    formKey,
    condKey: conditionKey,
    conditionKey,
    overbackKey,
    addDllName,
    addEnable,
    deleteEnable,
    isReport,
    dllType,
    modifyEnable,
    modifyCond,
    deleteCond,
  });
}

export async function fetchSingleTableModuleConfig(dllCoId: string) {
  const response = await apiRequest<SingleTableModuleConfigDto>(`/api/single-table/modules/${encodePathParam(dllCoId)}`, {
    auth: true,
    method: 'GET',
  });
  return normalizeSingleTableModuleConfig(response);
}

export async function fetchSingleTableModuleFields(dllCoId: string) {
  return apiRequest<SingleTableModuleFieldDto[]>(`/api/single-table/modules/${encodePathParam(dllCoId)}/fields`, {
    auth: true,
    method: 'GET',
  });
}

export async function fetchSingleTableDesignerControls(dllCoId: string) {
  return apiRequest<SingleTableDesignerControlDto[]>(`/api/single-table/modules/${encodePathParam(dllCoId)}/designer-controls`, {
    auth: true,
    method: 'GET',
  });
}

export async function fetchSingleTableDesignerGroups(dllCoId: string) {
  return apiRequest<SingleTableDesignerGroupDto[]>(`/api/single-table/modules/${encodePathParam(dllCoId)}/designer-groups`, {
    auth: true,
    method: 'GET',
  });
}

export async function fetchSingleTableDesignerLayout(dllCoId: string) {
  return apiRequest<SingleTableDesignerLayoutDto[]>(`/api/single-table/modules/${encodePathParam(dllCoId)}/designer-layout`, {
    auth: true,
    method: 'GET',
  });
}

export async function saveSingleTableDesignerGroup(dllCoId: string, body: Record<string, unknown>) {
  return apiRequest<Record<string, unknown>>(`/api/single-table/modules/${encodePathParam(dllCoId)}/designer-groups`, {
    auth: true,
    body,
    method: 'POST',
  });
}

export async function deleteSingleTableDesignerGroup(dllCoId: string, id: number | string) {
  return apiRequest<void>(`/api/single-table/modules/${encodePathParam(dllCoId)}/designer-groups/${encodePathParam(String(id))}`, {
    auth: true,
    method: 'DELETE',
  });
}

export async function saveSingleTableDesignerLayout(dllCoId: string, body: Record<string, unknown>) {
  return apiRequest<Record<string, unknown>>(`/api/single-table/modules/${encodePathParam(dllCoId)}/designer-layout`, {
    auth: true,
    body,
    method: 'POST',
  });
}

export async function deleteSingleTableDesignerLayout(dllCoId: string, fieldId: number | string) {
  return apiRequest<void>(`/api/single-table/modules/${encodePathParam(dllCoId)}/designer-layout/${encodePathParam(String(fieldId))}`, {
    auth: true,
    method: 'DELETE',
  });
}

export async function fetchSingleTableModuleConditions(dllCoId: string) {
  return apiRequest<SingleTableConditionDto[]>(`/api/single-table/modules/${encodePathParam(dllCoId)}/conditions`, {
    auth: true,
    method: 'GET',
  });
}

export async function saveSingleTableModuleCondition(dllCoId: string, body: Record<string, unknown>) {
  return apiRequest<Record<string, unknown>>(`/api/single-table/modules/${encodePathParam(dllCoId)}/conditions`, {
    auth: true,
    body,
    method: 'POST',
  });
}

export async function deleteSingleTableModuleCondition(dllCoId: string, id: number) {
  return apiRequest<void>(`/api/single-table/modules/${encodePathParam(dllCoId)}/conditions/${id}`, {
    auth: true,
    method: 'DELETE',
  });
}

export async function fetchSingleTableFieldConditions(dllCoId: string, fieldId: number) {
  return apiRequest<SingleTableConditionDto[]>(`/api/single-table/modules/${encodePathParam(dllCoId)}/fields/${fieldId}/conditions`, {
    auth: true,
    method: 'GET',
  });
}

export async function saveSingleTableFieldCondition(dllCoId: string, fieldId: number, body: Record<string, unknown>) {
  return apiRequest<Record<string, unknown>>(`/api/single-table/modules/${encodePathParam(dllCoId)}/fields/${fieldId}/conditions`, {
    auth: true,
    body,
    method: 'POST',
  });
}

export async function deleteSingleTableFieldCondition(dllCoId: string, fieldId: number, id: number) {
  return apiRequest<void>(`/api/single-table/modules/${encodePathParam(dllCoId)}/fields/${fieldId}/conditions/${id}`, {
    auth: true,
    method: 'DELETE',
  });
}

export async function fetchSingleTableFieldGridFields(dllCoId: string, fieldId: number) {
  return apiRequest<SingleTableGridFieldDto[]>(`/api/single-table/modules/${encodePathParam(dllCoId)}/fields/${fieldId}/grid-fields`, {
    auth: true,
    method: 'GET',
  });
}

export async function saveSingleTableFieldGridField(dllCoId: string, fieldId: number, body: Record<string, unknown>) {
  return apiRequest<Record<string, unknown>>(`/api/single-table/modules/${encodePathParam(dllCoId)}/fields/${fieldId}/grid-fields`, {
    auth: true,
    body,
    method: 'POST',
  });
}

export async function deleteSingleTableFieldGridField(dllCoId: string, fieldId: number, id: number) {
  return apiRequest<void>(`/api/single-table/modules/${encodePathParam(dllCoId)}/fields/${fieldId}/grid-fields/${id}`, {
    auth: true,
    method: 'DELETE',
  });
}

export async function fetchSingleTableFieldColors(dllCoId: string, fieldId: number) {
  return apiRequest<SingleTableColorRuleDto[]>(`/api/single-table/modules/${encodePathParam(dllCoId)}/fields/${fieldId}/colors`, {
    auth: true,
    method: 'GET',
  });
}

export async function saveSingleTableFieldColor(dllCoId: string, fieldId: number, body: Record<string, unknown>) {
  return apiRequest<Record<string, unknown>>(`/api/single-table/modules/${encodePathParam(dllCoId)}/fields/${fieldId}/colors`, {
    auth: true,
    body,
    method: 'POST',
  });
}

export async function deleteSingleTableFieldColor(dllCoId: string, fieldId: number, id: number) {
  return apiRequest<void>(`/api/single-table/modules/${encodePathParam(dllCoId)}/fields/${fieldId}/colors/${id}`, {
    auth: true,
    method: 'DELETE',
  });
}

export async function fetchSingleTableModuleDetails(dllCoId: string) {
  return apiRequest<SingleTableDetailDto[]>(`/api/single-table/modules/${encodePathParam(dllCoId)}/details`, {
    auth: true,
    method: 'GET',
  });
}

export async function saveSingleTableModuleDetail(dllCoId: string, body: Record<string, unknown>) {
  return apiRequest<Record<string, unknown>>(`/api/single-table/modules/${encodePathParam(dllCoId)}/details`, {
    auth: true,
    body,
    method: 'POST',
  });
}

export async function deleteSingleTableModuleDetail(dllCoId: string, id: number) {
  return apiRequest<void>(`/api/single-table/modules/${encodePathParam(dllCoId)}/details/${id}`, {
    auth: true,
    method: 'DELETE',
  });
}

export async function fetchSingleTableDetailGridFields(dllCoId: string, detailId: number) {
  return apiRequest<SingleTableGridFieldDto[]>(`/api/single-table/modules/${encodePathParam(dllCoId)}/details/${detailId}/grid-fields`, {
    auth: true,
    method: 'GET',
  });
}

export async function saveSingleTableDetailGridField(dllCoId: string, detailId: number, body: Record<string, unknown>) {
  return apiRequest<Record<string, unknown>>(`/api/single-table/modules/${encodePathParam(dllCoId)}/details/${detailId}/grid-fields`, {
    auth: true,
    body,
    method: 'POST',
  });
}

export async function deleteSingleTableDetailGridField(dllCoId: string, detailId: number, id: number) {
  return apiRequest<void>(`/api/single-table/modules/${encodePathParam(dllCoId)}/details/${detailId}/grid-fields/${id}`, {
    auth: true,
    method: 'DELETE',
  });
}

export async function fetchSingleTableDetailCharts(dllCoId: string, detailId: number) {
  return apiRequest<SingleTableDetailChartDto[]>(`/api/single-table/modules/${encodePathParam(dllCoId)}/details/${detailId}/charts`, {
    auth: true,
    method: 'GET',
  });
}

export async function saveSingleTableDetailChart(dllCoId: string, detailId: number, body: Record<string, unknown>) {
  return apiRequest<Record<string, unknown>>(`/api/single-table/modules/${encodePathParam(dllCoId)}/details/${detailId}/charts`, {
    auth: true,
    body,
    method: 'POST',
  });
}

export async function deleteSingleTableDetailChart(dllCoId: string, detailId: number, id: number) {
  return apiRequest<void>(`/api/single-table/modules/${encodePathParam(dllCoId)}/details/${detailId}/charts/${id}`, {
    auth: true,
    method: 'DELETE',
  });
}

export async function fetchSingleTableDetailColors(dllCoId: string, detailId: number) {
  return apiRequest<SingleTableColorRuleDto[]>(`/api/single-table/modules/${encodePathParam(dllCoId)}/details/${detailId}/colors`, {
    auth: true,
    method: 'GET',
  });
}

export async function saveSingleTableDetailColor(dllCoId: string, detailId: number, body: Record<string, unknown>) {
  return apiRequest<Record<string, unknown>>(`/api/single-table/modules/${encodePathParam(dllCoId)}/details/${detailId}/colors`, {
    auth: true,
    body,
    method: 'POST',
  });
}

export async function deleteSingleTableDetailColor(dllCoId: string, detailId: number, id: number) {
  return apiRequest<void>(`/api/single-table/modules/${encodePathParam(dllCoId)}/details/${detailId}/colors/${id}`, {
    auth: true,
    method: 'DELETE',
  });
}

export async function fetchSingleTableDetailMenus(dllCoId: string, detailId: number) {
  return apiRequest<SingleTableContextMenuDto[]>(`/api/single-table/modules/${encodePathParam(dllCoId)}/details/${detailId}/menus`, {
    auth: true,
    method: 'GET',
  });
}

export async function saveSingleTableDetailMenu(dllCoId: string, detailId: number, body: Record<string, unknown>) {
  return apiRequest<Record<string, unknown>>(`/api/single-table/modules/${encodePathParam(dllCoId)}/details/${detailId}/menus`, {
    auth: true,
    body,
    method: 'POST',
  });
}

export async function deleteSingleTableDetailMenu(dllCoId: string, detailId: number, id: number) {
  return apiRequest<void>(`/api/single-table/modules/${encodePathParam(dllCoId)}/details/${detailId}/menus/${id}`, {
    auth: true,
    method: 'DELETE',
  });
}

export async function fetchSingleTableModuleColors(dllCoId: string) {
  return apiRequest<SingleTableColorRuleDto[]>(`/api/single-table/modules/${encodePathParam(dllCoId)}/colors`, {
    auth: true,
    method: 'GET',
  });
}

export async function saveSingleTableModuleColor(dllCoId: string, body: Record<string, unknown>) {
  return apiRequest<Record<string, unknown>>(`/api/single-table/modules/${encodePathParam(dllCoId)}/colors`, {
    auth: true,
    body,
    method: 'POST',
  });
}

export async function deleteSingleTableModuleColor(dllCoId: string, id: number) {
  return apiRequest<void>(`/api/single-table/modules/${encodePathParam(dllCoId)}/colors/${id}`, {
    auth: true,
    method: 'DELETE',
  });
}

export async function fetchSingleTableModuleMenus(dllCoId: string) {
  return apiRequest<SingleTableContextMenuDto[]>(`/api/single-table/modules/${encodePathParam(dllCoId)}/menus`, {
    auth: true,
    method: 'GET',
  });
}

export async function saveSingleTableModuleMenu(dllCoId: string, body: Record<string, unknown>) {
  return apiRequest<Record<string, unknown>>(`/api/single-table/modules/${encodePathParam(dllCoId)}/menus`, {
    auth: true,
    body,
    method: 'POST',
  });
}

export async function deleteSingleTableModuleMenu(dllCoId: string, id: number) {
  return apiRequest<void>(`/api/single-table/modules/${encodePathParam(dllCoId)}/menus/${id}`, {
    auth: true,
    method: 'DELETE',
  });
}

export async function saveSingleTableModuleField(dllCoId: string, body: Record<string, unknown>) {
  return apiRequest<Record<string, unknown>>(`/api/single-table/modules/${encodePathParam(dllCoId)}/fields`, {
    auth: true,
    body,
    method: 'POST',
  });
}

export async function deleteSingleTableModuleField(dllCoId: string, id: number) {
  return apiRequest<void>(`/api/single-table/modules/${encodePathParam(dllCoId)}/fields/${id}`, {
    auth: true,
    method: 'DELETE',
  });
}

export async function saveSingleTableModuleConfig(dllCoId: string, body: Record<string, unknown>) {
  const response = await apiRequest<SingleTableModuleConfigDto>(`/api/single-table/modules/${encodePathParam(dllCoId)}`, {
    auth: true,
    body: buildSingleTableModuleConfigBody(body),
    method: 'POST',
  });
  return normalizeSingleTableModuleConfig(response);
}

export async function createSingleTableModuleConfig(body: Record<string, unknown>) {
  return apiRequest<SingleTableModuleConfigDto>('/api/single-table/modules', {
    auth: true,
    body,
    method: 'POST',
  });
}

export async function deleteSingleTableModuleConfig(dllCoId: string) {
  return apiRequest<void>(`/api/single-table/modules/${encodePathParam(dllCoId)}`, {
    auth: true,
    method: 'DELETE',
  });
}

export async function fetchBillTypeConfig(typeCode: string) {
  return apiRequest<BillTypeConfigDto>(`/api/bill/types/${encodePathParam(typeCode)}`, {
    auth: true,
    method: 'GET',
  });
}

export async function saveBillTypeConfig(typeCode: string, body: Record<string, unknown>) {
  return apiRequest<BillTypeConfigDto>(`/api/bill/types/${encodePathParam(typeCode)}`, {
    auth: true,
    body,
    method: 'POST',
  });
}

export async function createBillTypeConfig(body: Record<string, unknown>) {
  return apiRequest<BillTypeConfigDto>('/api/bill/types', {
    auth: true,
    body,
    method: 'POST',
  });
}

export async function deleteBillTypeConfig(typeCode: string) {
  return apiRequest<void>(`/api/bill/types/${encodePathParam(typeCode)}`, {
    auth: true,
    method: 'DELETE',
  });
}

export async function fetchBillTypeDetailFields(typeCode: string) {
  return apiRequest<BillTypeDetailFieldDto[]>(`/api/bill/types/${encodePathParam(typeCode)}/detail-fields`, {
    auth: true,
    method: 'GET',
  });
}

export async function fetchBillTypeDesignerControls(typeCode: string) {
  return apiRequest<BillTypeDesignerControlDto[]>(`/api/bill/types/${encodePathParam(typeCode)}/designer-controls`, {
    auth: true,
    method: 'GET',
  });
}

export async function fetchBillTypeDesignerGroups(typeCode: string) {
  return apiRequest<BillTypeDesignerGroupDto[]>(`/api/bill/types/${encodePathParam(typeCode)}/designer-groups`, {
    auth: true,
    method: 'GET',
  });
}

export async function fetchBillTypeDesignerLayout(typeCode: string) {
  return apiRequest<BillTypeDesignerLayoutDto[]>(`/api/bill/types/${encodePathParam(typeCode)}/designer-layout`, {
    auth: true,
    method: 'GET',
  });
}

export async function saveBillTypeDesignerGroup(typeCode: string, body: Record<string, unknown>) {
  return apiRequest<Record<string, unknown>>(`/api/bill/types/${encodePathParam(typeCode)}/designer-groups`, {
    auth: true,
    body,
    method: 'POST',
  });
}

export async function deleteBillTypeDesignerGroup(typeCode: string, id: number | string) {
  return apiRequest<void>(`/api/bill/types/${encodePathParam(typeCode)}/designer-groups/${encodePathParam(String(id))}`, {
    auth: true,
    method: 'DELETE',
  });
}

export async function saveBillTypeDesignerLayout(typeCode: string, body: Record<string, unknown>) {
  return apiRequest<Record<string, unknown>>(`/api/bill/types/${encodePathParam(typeCode)}/designer-layout`, {
    auth: true,
    body,
    method: 'POST',
  });
}

export async function deleteBillTypeDesignerLayout(typeCode: string, fieldId: number | string) {
  return apiRequest<void>(`/api/bill/types/${encodePathParam(typeCode)}/designer-layout/${encodePathParam(String(fieldId))}`, {
    auth: true,
    method: 'DELETE',
  });
}
