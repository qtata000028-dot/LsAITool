import { apiRequest } from './http';

export type SurveyMainListParams = {
  departId?: number | string | null;
  keyword?: string | null;
};

export type SurveyMainDto = {
  id: number;
  departId: number | string | null;
  surveyDate?: string | null;
  fileNo?: string | null;
  address?: string | null;
  scope?: string | null;
  orderNum?: number | string | null;
  empNames?: string | null;
  surveyUsers?: string | null;
  positionsBak?: string | null;
  toolsBak?: string | null;
  painsBak?: string | null;
  specialBak?: string | null;
  otherBak?: string | null;
  operateDate?: string | null;
  operatorName?: string | null;
};

export type SurveyDetailDto = {
  id: number;
  billNo?: string | null;
  mainId?: number | string | null;
  moduleName?: string | null;
  moduleId?: string | null;
  position1?: string | null;
  workingRate1?: number | string | null;
  position2?: string | null;
  workingRate2?: number | string | null;
  position3?: string | null;
  workingRate3?: number | string | null;
  workingBak?: string | null;
  painsBak?: string | null;
  suggestionBak?: string | null;
};

export type SaveSurveyMainPayload = Partial<SurveyMainDto> & {
  id?: number;
};

export type SaveSurveyDetailPayload = Partial<SurveyDetailDto> & {
  id?: number;
};

export async function fetchSurveyMainList(params: SurveyMainListParams = {}) {
  return apiRequest<SurveyMainDto[]>('/api/survey/mains', {
    auth: true,
    method: 'GET',
    query: {
      departId: params.departId ?? undefined,
      keyword: params.keyword ?? undefined,
    },
  });
}

export async function fetchSurveyMain(id: number) {
  return apiRequest<SurveyMainDto>(`/api/survey/mains/${id}`, {
    auth: true,
    method: 'GET',
  });
}

export async function saveSurveyMain(payload: SaveSurveyMainPayload) {
  return apiRequest<SurveyMainDto>('/api/survey/mains', {
    auth: true,
    body: payload,
    method: 'POST',
  });
}

export async function deleteSurveyMain(id: number) {
  return apiRequest<void>(`/api/survey/mains/${id}`, {
    auth: true,
    method: 'DELETE',
  });
}

export async function fetchSurveyDetails(mainId: number) {
  return apiRequest<SurveyDetailDto[]>(`/api/survey/mains/${mainId}/details`, {
    auth: true,
    method: 'GET',
  });
}

export async function fetchSurveyDetail(mainId: number, id: number) {
  return apiRequest<SurveyDetailDto>(`/api/survey/mains/${mainId}/details/${id}`, {
    auth: true,
    method: 'GET',
  });
}

export async function saveSurveyDetail(mainId: number, payload: SaveSurveyDetailPayload) {
  return apiRequest<SurveyDetailDto>(`/api/survey/mains/${mainId}/details`, {
    auth: true,
    body: payload,
    method: 'POST',
  });
}

export async function deleteSurveyDetail(mainId: number, id: number) {
  return apiRequest<void>(`/api/survey/mains/${mainId}/details/${id}`, {
    auth: true,
    method: 'DELETE',
  });
}
