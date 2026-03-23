import { apiRequest } from './http';

export interface FieldSqlTagOptionDto {
  showid?: unknown;
  showname?: unknown;
}

export async function fetchFieldSqlTagOptions() {
  return apiRequest<FieldSqlTagOptionDto[]>('/api/system/fieldsqltag-options', {
    auth: true,
    method: 'GET',
  });
}
