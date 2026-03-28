import { apiRequest } from '@/lib/http';

export type PostVO = {
  id?: number;
  name: string;
};

export async function getSimplePostList() {
  return apiRequest<PostVO[]>(
    import.meta.env.VITE_SIMPLE_DESIGNER_POST_SIMPLE_LIST_PATH || '/api/process-designer/options/posts',
    {
      auth: true,
      method: 'GET',
    },
  );
}
