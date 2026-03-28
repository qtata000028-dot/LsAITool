import { apiRequest } from '@/lib/http';

export type RoleVO = {
  id: number;
  name: string;
};

export async function getSimpleRoleList() {
  return apiRequest<RoleVO[]>(
    import.meta.env.VITE_SIMPLE_DESIGNER_ROLE_SIMPLE_LIST_PATH || '/api/process-designer/options/roles',
    {
      auth: true,
      method: 'GET',
    },
  );
}
