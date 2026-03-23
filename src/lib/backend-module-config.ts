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
