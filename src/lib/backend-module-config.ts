import { apiRequest } from './http';

export interface SingleTableModuleConfigDto {
  conditionKey?: unknown;
  dllCoId?: unknown;
  formKey?: unknown;
  id?: unknown;
  isReport?: unknown;
  mainTable?: unknown;
  moduleName?: unknown;
  overbackKey?: unknown;
  querySql?: unknown;
}

export type SingleTableModuleFieldDto = Record<string, unknown>;
export type SingleTableDesignerControlDto = Record<string, unknown>;
export type SingleTableDesignerGroupDto = Record<string, unknown>;
export type SingleTableDesignerLayoutDto = Record<string, unknown>;
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

export async function fetchSingleTableModuleConfig(dllCoId: string) {
  return apiRequest<SingleTableModuleConfigDto>(`/api/single-table/modules/${encodePathParam(dllCoId)}`, {
    auth: true,
    method: 'GET',
  });
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
  return apiRequest<SingleTableModuleConfigDto>(`/api/single-table/modules/${encodePathParam(dllCoId)}`, {
    auth: true,
    body,
    method: 'POST',
  });
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
