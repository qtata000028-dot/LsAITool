import { apiRequest } from './http';

export type SubsystemMenuConfigDto = Record<string, unknown>;

export async function fetchSubsystemMenuConfig(menuId: number) {
  return apiRequest<SubsystemMenuConfigDto>(`/api/system/subsystem-menu-config/${menuId}`, {
    auth: true,
    method: 'GET',
  });
}

export async function saveSubsystemMenuConfig(body: Record<string, unknown>) {
  return apiRequest<SubsystemMenuConfigDto>('/api/system/subsystem-menu-config', {
    auth: true,
    body,
    method: 'POST',
  });
}
