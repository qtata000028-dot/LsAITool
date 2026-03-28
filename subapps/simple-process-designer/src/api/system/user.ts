import { apiRequest } from '@/lib/http';

export type UserVO = {
  deptName?: string;
  id: number;
  nickname: string;
};

export async function getSimpleUserList() {
  return apiRequest<UserVO[]>(
    import.meta.env.VITE_SIMPLE_DESIGNER_USER_SIMPLE_LIST_PATH || '/api/process-designer/options/users',
    {
      auth: true,
      method: 'GET',
    },
  );
}
