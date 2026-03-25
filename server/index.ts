import dotenv from 'dotenv';
import express from 'express';

dotenv.config({ path: '.env.local' });
dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3001);
const baseUrl = process.env.MINIMAX_BASE_URL || 'https://api.minimaxi.com/v1';
const model = process.env.MINIMAX_MODEL || 'MiniMax-M2.1';
const businessApiBaseUrl = (process.env.BUSINESS_API_BASE_URL || process.env.VITE_API_BASE_URL || 'http://127.0.0.1:8080').replace(/\/+$/, '');

const hopByHopHeaders = new Set([
  'connection',
  'content-length',
  'host',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

type SurveyPlan = {
  summary: string;
  complexity: string;
  duration: string;
  domainModel: string[];
  architecture: string[];
  recommendations: string[];
  raw: string;
};

type SqlDraft = {
  mainSql: string;
  defaultQuery: string;
  raw: string;
};

type TranslationItem = {
  id: string;
  identifier: string;
};

app.use(express.json({ limit: '1mb' }));

function getApiKey() {
  return process.env.MINIMAX_API_KEY || '';
}

function extractMessageContent(payload: any): string {
  const content = payload?.choices?.[0]?.message?.content;

  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === 'string') return item;
        if (typeof item?.text === 'string') return item.text;
        if (typeof item?.content === 'string') return item.content;
        return '';
      })
      .join('\n');
  }

  return '';
}

function stripThinkTags(input: string) {
  return input.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
}

function parseJsonObject(input: string) {
  const fenced = input.match(/```json\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced || input;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');

  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}

function normalizeList(value: unknown, fallback: string[] = []) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || '').trim())
      .filter(Boolean);
  }

  if (typeof value === 'string' && value.trim()) {
    return value
      .split(/\n|;|\uFF1B/)
      .map((item) => item.replace(/^[-*\d.\s]+/, '').trim())
      .filter(Boolean);
  }

  return fallback;
}

function sanitizeIdentifier(input: string, fallback: string) {
  const normalized = input
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^A-Za-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_')
    .toLowerCase();

  return normalized || fallback;
}

const identifierDictionary: Array<[string, string]> = [
  ['\u521B\u5EFA\u65E5\u671F', 'created_date'],
  ['\u66F4\u65B0\u65E5\u671F', 'updated_date'],
  ['\u521B\u5EFA\u65F6\u95F4', 'created_time'],
  ['\u66F4\u65B0\u65F6\u95F4', 'updated_time'],
  ['\u521B\u5EFA\u4EBA', 'created_by'],
  ['\u66F4\u65B0\u4EBA', 'updated_by'],
  ['\u5BA2\u6237\u540D\u79F0', 'customer_name'],
  ['\u5BA2\u6237\u7F16\u7801', 'customer_code'],
  ['\u7269\u6599\u7F16\u7801', 'material_code'],
  ['\u7269\u6599\u540D\u79F0', 'material_name'],
  ['\u89C4\u683C\u578B\u53F7', 'spec_model'],
  ['\u5355\u636E\u7F16\u53F7', 'document_no'],
  ['\u5355\u636E\u65E5\u671F', 'document_date'],
  ['\u5355\u4EF7', 'unit_price'],
  ['\u6570\u91CF', 'quantity'],
  ['\u91D1\u989D', 'amount'],
  ['\u72B6\u6001', 'status'],
  ['\u7C7B\u578B', 'type'],
  ['\u540D\u79F0', 'name'],
  ['\u7F16\u7801', 'code'],
  ['\u65E5\u671F', 'date'],
  ['\u65F6\u95F4', 'time'],
  ['\u5BA2\u6237', 'customer'],
  ['\u4F9B\u5E94\u5546', 'supplier'],
  ['\u7269\u6599', 'material'],
  ['\u89C4\u683C', 'spec'],
  ['\u578B\u53F7', 'model'],
  ['\u5355\u4F4D', 'unit'],
  ['\u4EF7\u683C', 'price'],
  ['\u90E8\u95E8', 'department'],
  ['\u9879\u76EE', 'project'],
  ['\u6210\u672C', 'cost'],
  ['\u9884\u7B97', 'budget'],
  ['\u660E\u7EC6', 'detail'],
  ['\u9644\u4EF6', 'attachment'],
  ['\u65E5\u5FD7', 'log'],
  ['\u5907\u6CE8', 'remark'],
  ['\u8BF4\u660E', 'description'],
  ['\u7535\u8BDD', 'phone'],
  ['\u624B\u673A', 'mobile'],
  ['\u5730\u5740', 'address'],
];

function guessIdentifierFromName(name: string, index: number) {
  const sortedDictionary = [...identifierDictionary].sort((left, right) => right[0].length - left[0].length);
  const tokens: string[] = [];
  let cursor = 0;

  while (cursor < name.length) {
    const matched = sortedDictionary.find(([zh]) => name.startsWith(zh, cursor));

    if (matched) {
      tokens.push(matched[1]);
      cursor += matched[0].length;
      continue;
    }

    const asciiChunk = name.slice(cursor).match(/^[A-Za-z0-9_]+/)?.[0];

    if (asciiChunk) {
      tokens.push(asciiChunk.toLowerCase());
      cursor += asciiChunk.length;
      continue;
    }

    cursor += 1;
  }

  return sanitizeIdentifier(tokens.join('_'), `field_${index + 1}`);
}

function buildBusinessProxyUrl(req: express.Request) {
  return `${businessApiBaseUrl}${req.originalUrl}`;
}

function buildBusinessProxyHeaders(req: express.Request) {
  const headers = new Headers();

  for (const [key, value] of Object.entries(req.headers)) {
    if (!value || hopByHopHeaders.has(key.toLowerCase())) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        headers.append(key, item);
      }
      continue;
    }

    headers.set(key, value);
  }

  return headers;
}

async function forwardBusinessApi(req: express.Request, res: express.Response) {
  const method = req.method.toUpperCase();
  const headers = buildBusinessProxyHeaders(req);
  let body: string | undefined;

  if (method !== 'GET' && method !== 'HEAD' && req.body !== undefined) {
    if (typeof req.body === 'string') {
      body = req.body;
    } else if (Buffer.isBuffer(req.body)) {
      body = req.body.toString('utf8');
    } else {
      body = JSON.stringify(req.body);
      if (!headers.has('content-type')) {
        headers.set('content-type', 'application/json');
      }
    }
  }

  try {
    const upstream = await fetch(buildBusinessProxyUrl(req), {
      method,
      headers,
      body,
    });

    res.status(upstream.status);

    upstream.headers.forEach((value, key) => {
      if (!hopByHopHeaders.has(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    });

    const payload = Buffer.from(await upstream.arrayBuffer());
    res.send(payload);
  } catch (error) {
    res.status(502).json({
      message: error instanceof Error ? error.message : 'Business API proxy request failed.',
      target: businessApiBaseUrl,
    });
  }
}

async function requestMiniMaxJson(prompt: string) {
  const apiKey = getApiKey();

  if (!apiKey) {
    throw new Error('MINIMAX_API_KEY is missing.');
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.35,
      messages: [
        {
          role: 'system',
          content: 'You are a senior ERP architect. Always return a valid JSON object only. No markdown fences. No explanation.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    }),
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.error?.message || payload?.base_resp?.status_msg || 'MiniMax request failed.');
  }

  const raw = stripThinkTags(extractMessageContent(payload));

  if (!raw) {
    throw new Error('MiniMax returned empty content.');
  }

  const parsed = parseJsonObject(raw);

  if (!parsed) {
    throw new Error('MiniMax returned non-JSON content.');
  }

  return {
    raw,
    parsed,
  };
}

function buildSurveyPrompt(mode: string, dataSource: string) {
  return [
    'Return all values in Simplified Chinese.',
    'Design an ERP module implementation plan.',
    'Module name: Cost Control',
    `Mode: ${mode}`,
    `Data source: ${dataSource}`,
    'JSON schema:',
    '{"summary":"...","complexity":"低/中/高","duration":"...","domainModel":["..."],"architecture":["..."],"recommendations":["..."]}',
  ].join('\n');
}

function normalizeSurveyPlan(rawText: string, mode: string, dataSource: string) {
  const parsed = parseJsonObject(rawText);

  if (!parsed) {
    return {
      summary: `当前模式为“${mode}”，数据来源为“${dataSource}”。`,
      complexity: '中',
      duration: '2-3 周',
      domainModel: ['建议补充主档、明细和日志结构。'],
      architecture: ['建议保留当前 React 前端，并由 Node 服务代理 MiniMax 能力。'],
      recommendations: ['当前结果未结构化解析，可继续优化提示词。'],
      raw: rawText,
    } satisfies SurveyPlan;
  }

  return {
    summary: String(parsed.summary || '').trim() || `当前模式为“${mode}”，数据来源为“${dataSource}”。`,
    complexity: String(parsed.complexity || '中').trim() || '中',
    duration: String(parsed.duration || '2-3 周').trim() || '2-3 周',
    domainModel: normalizeList(parsed.domainModel, ['建议补充主档、明细和日志结构。']),
    architecture: normalizeList(parsed.architecture, ['建议保留当前 React 前端，并由 Node 服务代理 MiniMax 能力。']),
    recommendations: normalizeList(parsed.recommendations, ['可继续补充字段、流程和联动规则。']),
    raw: rawText,
  } satisfies SurveyPlan;
}

function buildSqlFallback(columns: Array<{ name?: string; identifier?: string }>) {
  const projection = columns.length > 0
    ? columns.map((column, index) => {
        const identifier = sanitizeIdentifier(column.identifier || '', `field_${index + 1}`);
        return `  ${identifier} AS [${column.name || `字段${index + 1}`}]`;
      }).join(',\n')
    : '  *';

  return [
    'SELECT',
    projection,
    'FROM demo_table',
    'WHERE 1 = 1',
  ].join('\n');
}

function buildSqlPrompt(title: string, tableType: string, description: string, columns: Array<{ name?: string; type?: string; identifier?: string }>) {
  const columnSummary = columns.length > 0
    ? columns.map((column, index) => `${index + 1}. name=${column.name || ''}, type=${column.type || ''}, identifier=${column.identifier || ''}`).join('\n')
    : 'No columns yet.';

  return [
    'Return all values in Simplified Chinese, except SQL identifiers which must stay in ASCII.',
    'Generate a draft ERP query config.',
    `Table title: ${title}`,
    `Table type: ${tableType}`,
    `Business description: ${description || 'Generate a list query for the current table.'}`,
    'Current columns:',
    columnSummary,
    'JSON schema:',
    '{"mainSql":"SELECT ...","defaultQuery":"..."}',
    'Rules:',
    '- Use snake_case ASCII identifiers.',
    '- Preserve the current columns as aliases when possible.',
    '- Keep SQL generic. Do not depend on a real database schema.',
  ].join('\n');
}

function normalizeSqlDraft(rawText: string, columns: Array<{ name?: string; identifier?: string }>) {
  const parsed = parseJsonObject(rawText);
  const fallbackSql = buildSqlFallback(columns);

  if (!parsed) {
    return {
      mainSql: fallbackSql,
      defaultQuery: '',
      raw: rawText,
    } satisfies SqlDraft;
  }

  return {
    mainSql: String(parsed.mainSql || '').trim() || fallbackSql,
    defaultQuery: String(parsed.defaultQuery || '').trim(),
    raw: rawText,
  } satisfies SqlDraft;
}

function buildTranslatePrompt(columns: Array<{ id: string; name: string; identifier?: string }>) {
  return [
    'Translate Chinese field names into concise snake_case ASCII identifiers.',
    'Only return JSON.',
    'If an identifier is already valid ASCII snake_case, keep it.',
    'JSON schema:',
    '{"items":[{"id":"column id","identifier":"english_identifier"}]}',
    'Columns:',
    ...columns.map((column) => `- id=${column.id}, name=${column.name}, current=${column.identifier || ''}`),
  ].join('\n');
}

function normalizeTranslationItems(rawText: string, columns: Array<{ id: string; name: string; identifier?: string }>) {
  const parsed = parseJsonObject(rawText);
  const rawItems = Array.isArray(parsed?.items) ? parsed.items : [];

  const mapped = columns.map((column, index) => {
    const matched = rawItems.find((item: any) => String(item?.id || '') === column.id);
    const heuristic = guessIdentifierFromName(column.name || '', index);
    const fallback = column.identifier && /^[a-z0-9_]+$/.test(column.identifier)
      ? column.identifier
      : heuristic;
    const matchedIdentifier = String(matched?.identifier || '').trim();
    const useFallback = !matchedIdentifier || matchedIdentifier.length <= 2 || /^(?:field|unknown)(?:_|$)/i.test(matchedIdentifier);
    const preferHeuristic = !column.identifier && !/^field(?:_|$)/i.test(heuristic);

    return {
      id: column.id,
      identifier: preferHeuristic ? heuristic : (useFallback ? fallback : sanitizeIdentifier(matchedIdentifier, fallback)),
    };
  });

  return mapped satisfies TranslationItem[];
}

app.get('/api/ai/health', (_req, res) => {
  res.json({
    configured: Boolean(getApiKey()),
    model,
  });
});

app.post('/api/ai/survey-plan', async (req, res) => {
  const mode = String(req.body?.mode || '').trim();
  const dataSource = String(req.body?.dataSource || '').trim();

  if (!getApiKey()) {
    return res.status(500).json({
      message: 'MINIMAX_API_KEY is missing in .env.local.',
    });
  }

  if (!mode || !dataSource) {
    return res.status(400).json({
      message: 'mode and dataSource are required.',
    });
  }

  try {
    const { raw } = await requestMiniMaxJson(buildSurveyPrompt(mode, dataSource));

    return res.json({
      model,
      plan: normalizeSurveyPlan(raw, mode, dataSource),
    });
  } catch (error) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : 'MiniMax survey request failed.',
    });
  }
});

app.post('/api/ai/sql-draft', async (req, res) => {
  const title = String(req.body?.title || '').trim() || 'Current Table';
  const description = String(req.body?.description || '').trim();
  const tableType = String(req.body?.tableType || '').trim() || '普通表格';
  const columns = Array.isArray(req.body?.columns) ? req.body.columns : [];

  if (!getApiKey()) {
    return res.status(500).json({
      message: 'MINIMAX_API_KEY is missing in .env.local.',
    });
  }

  try {
    const { raw } = await requestMiniMaxJson(buildSqlPrompt(title, tableType, description, columns));

    return res.json({
      model,
      draft: normalizeSqlDraft(raw, columns),
    });
  } catch (error) {
    return res.json({
      model,
      degraded: true,
      message: error instanceof Error ? error.message : 'MiniMax SQL draft request failed.',
      draft: {
        mainSql: buildSqlFallback(columns),
        defaultQuery: '',
        raw: '',
      },
    });
  }
});

app.post('/api/ai/translate-identifiers', async (req, res) => {
  const columns = Array.isArray(req.body?.columns) ? req.body.columns : [];

  if (!getApiKey()) {
    return res.status(500).json({
      message: 'MINIMAX_API_KEY is missing in .env.local.',
    });
  }

  if (columns.length === 0) {
    return res.json({
      model,
      items: [],
    });
  }

  try {
    const { raw } = await requestMiniMaxJson(buildTranslatePrompt(columns));

    return res.json({
      model,
      items: normalizeTranslationItems(raw, columns),
    });
  } catch (error) {
    return res.json({
      model,
      degraded: true,
      message: error instanceof Error ? error.message : 'MiniMax identifier translation failed.',
      items: columns.map((column: any, index: number) => ({
        id: String(column.id || ''),
        identifier: column.identifier && /^[a-z0-9_]+$/.test(column.identifier)
          ? column.identifier
          : guessIdentifierFromName(String(column.name || ''), index),
      })),
    });
  }
});

app.use('/api', async (req, res) => {
  return forwardBusinessApi(req, res);
});

app.listen(port, () => {
  console.log(`MiniMax API server listening on http://127.0.0.1:${port}`);
  console.log(`Business API proxy target: ${businessApiBaseUrl}`);
});
