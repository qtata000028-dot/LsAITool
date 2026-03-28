import { apiRequest } from '@/lib/http';

export type DeptVO = {
  id: number;
  name: string;
  parentId?: number;
};

export async function getSimpleDeptList() {
  return apiRequest<DeptVO[]>(
    import.meta.env.VITE_SIMPLE_DESIGNER_DEPT_SIMPLE_LIST_PATH || '/api/process-designer/options/depts',
    {
      auth: true,
      method: 'GET',
    },
  );
}
