export type SurveyPlan = {
  summary: string;
  complexity: string;
  duration: string;
  domainModel: string[];
  architecture: string[];
  recommendations: string[];
  raw: string;
};

type SurveyPlanResponse = {
  model: string;
  plan: SurveyPlan;
};

export type SqlDraft = {
  mainSql: string;
  defaultQuery: string;
  raw: string;
};

type SqlDraftResponse = {
  model: string;
  draft: SqlDraft;
};

type IdentifierTranslationResponse = {
  model: string;
  items: Array<{
    id: string;
    identifier: string;
  }>;
};

type ColumnPayload = {
  id: string;
  name: string;
  type?: string;
  identifier?: string;
};

export async function requestSurveyPlan(mode: string, dataSource: string) {
  const response = await fetch('/api/ai/survey-plan', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      mode,
      dataSource,
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload?.message || 'MiniMax 请求失败。');
  }

  return payload as SurveyPlanResponse;
}

export async function requestSqlDraft(input: {
  title: string;
  description: string;
  tableType: string;
  columns: ColumnPayload[];
}) {
  const response = await fetch('/api/ai/sql-draft', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload?.message || 'MiniMax SQL generation failed.');
  }

  return payload as SqlDraftResponse;
}

export async function requestIdentifierTranslation(columns: ColumnPayload[]) {
  const response = await fetch('/api/ai/translate-identifiers', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ columns }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload?.message || 'MiniMax identifier translation failed.');
  }

  return payload as IdentifierTranslationResponse;
}
