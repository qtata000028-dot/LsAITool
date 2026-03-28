import { apiRequest } from '@/lib/http';

export type FormVO = {
  fields: string[];
  id: number;
  name: string;
};

function readDesignerContext() {
  if (typeof window === 'undefined') {
    return {};
  }

  const url = new URL(window.location.href);
  return {
    businessCode: url.searchParams.get('businessCode') ?? undefined,
    businessType: url.searchParams.get('businessType') ?? undefined,
  };
}

export async function getForm(id: number): Promise<FormVO> {
  const formPathBase = import.meta.env.VITE_SIMPLE_DESIGNER_FORM_GET_PATH || '/api/process-designer/options/forms';
  return apiRequest<FormVO>(
    `${formPathBase.replace(/\/+$/, '')}/${id}`,
    {
      auth: true,
      method: 'GET',
      query: readDesignerContext(),
    },
  );
}
