import { apiRequest } from '@/lib/http';

export type UserGroupVO = {
  id: number;
  name: string;
};

export async function getUserGroupSimpleList() {
  return apiRequest<UserGroupVO[]>(
    import.meta.env.VITE_SIMPLE_DESIGNER_USER_GROUP_SIMPLE_LIST_PATH || '/api/process-designer/options/user-groups',
    {
      auth: true,
      method: 'GET',
    },
  );
}
