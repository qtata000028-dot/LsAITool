import dotenv from 'dotenv';
import express from 'express';
import multer, { MulterError } from 'multer';
import {
  ToolFeedbackRequestError,
  cleanupExpiredRejectedSuggestionImages,
  createToolFeedbackSuggestion,
  decideToolFeedbackSuggestion,
  getToolFeedbackAttachmentFile,
  getToolFeedbackWorkspace,
  resubmitToolFeedbackSuggestion,
  type ToolFeedbackCurrentUser,
  type ToolFeedbackUploadFile,
} from './tool-feedback-service';

dotenv.config({ path: '.env.local' });
dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3001);
const baseUrl = process.env.MINIMAX_BASE_URL || 'https://api.minimaxi.com/v1';
const model = process.env.MINIMAX_MODEL || 'MiniMax-M2.1';
const translateModel = process.env.MINIMAX_TRANSLATE_MODEL || model;
const businessApiBaseUrl = (process.env.BUSINESS_API_BASE_URL || process.env.VITE_API_BASE_URL || 'http://222.211.229.79:8888').replace(/\/+$/, '');
const toolFeedbackMaxImageCount = Number(process.env.TOOL_FEEDBACK_MAX_IMAGE_COUNT || 8);
const toolFeedbackMaxImageSize = Number(process.env.TOOL_FEEDBACK_MAX_IMAGE_SIZE || 10 * 1024 * 1024);

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

type AiCreateMainTableColumnInput = {
  id: string;
  identifier?: string;
  name: string;
  type?: string;
};

type AiCreateMainTableColumnResult = {
  id: string;
  identifier: string;
  name: string;
  source: 'ai' | 'existing' | 'heuristic';
  translated: boolean;
  type?: string;
};

type AiCreateMainTablePersistenceResult = {
  message?: string;
  requestBody?: Record<string, unknown>;
  responseBody?: unknown;
  status: 'failed' | 'pending' | 'saved' | 'skipped';
  target: string;
};

type BusinessAuthMePayload = {
  companyTitle?: string | null;
  datasourceCode?: string | null;
  employeeId?: number | string | null;
  employeeName?: string | null;
  username?: string | null;
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

function extractErrorMessage(data: unknown) {
  if (typeof data === 'string' && data.trim()) {
    return data;
  }

  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>;
    const candidates = [record.message, record.error, record.msg, record.detail];

    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim()) {
        return candidate;
      }
    }
  }

  return null;
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

function isAsciiIdentifier(input: string) {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(input.trim());
}

function normalizeTableName(input: string) {
  return sanitizeIdentifier(input, 'main_table');
}

function isPlaceholderIdentifier(input: string) {
  return /^(?:field|column|col|unknown|temp|tmp)(?:_\d+)?$/i.test(String(input || '').trim());
}

const identifierDictionary: Array<[string, string]> = [
  ['\u4E0A\u7EA7\u5173\u7CFB', 'parent_relation'],
  ['\u4E0B\u7EA7\u5173\u7CFB', 'child_relation'],
  ['\u5173\u8054\u5173\u7CFB', 'relation'],
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
  ['\u7236\u7EA7', 'parent'],
  ['\u5B50\u7EA7', 'child'],
  ['\u5173\u7CFB', 'relation'],
  ['\u5173\u8054', 'relation'],
  ['\u5C5E\u6027', 'attribute'],
  ['\u5206\u7EC4', 'group_name'],
  ['\u7EA7\u6B21', 'level'],
  ['\u5C42\u7EA7', 'level'],
  ['\u987A\u5E8F', 'sort_order'],
  ['\u6392\u5E8F', 'sort_order'],
  ['\u542F\u7528', 'enabled'],
  ['\u7981\u7528', 'disabled'],
  ['\u9644\u4EF6', 'attachment'],
  ['\u65E5\u5FD7', 'log'],
  ['\u5907\u6CE8', 'remark'],
  ['\u8BF4\u660E', 'description'],
  ['\u7535\u8BDD', 'phone'],
  ['\u624B\u673A', 'mobile'],
  ['\u5730\u5740', 'address'],
];

const toolFeedbackUpload = multer({
  fileFilter: (_req, file, callback) => {
    if (!String(file.mimetype || '').toLowerCase().startsWith('image/')) {
      callback(new ToolFeedbackRequestError('意见补充只能上传图片文件。', 400));
      return;
    }

    callback(null, true);
  },
  limits: {
    fileSize: toolFeedbackMaxImageSize,
    files: toolFeedbackMaxImageCount,
  },
  storage: multer.memoryStorage(),
});

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

async function sendUpstreamResponse(upstream: Response, res: express.Response) {
  res.status(upstream.status);

  upstream.headers.forEach((value, key) => {
    if (!hopByHopHeaders.has(key.toLowerCase())) {
      res.setHeader(key, value);
    }
  });

  const payload = Buffer.from(await upstream.arrayBuffer());
  res.send(payload);
}

function buildBusinessAbsoluteUrl(pathname: string, query?: Record<string, string>) {
  const url = new URL(`${businessApiBaseUrl}${pathname}`);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value) {
        url.searchParams.set(key, value);
      }
    });
  }

  return url.toString();
}

function extractBearerToken(req: express.Request) {
  const authorizationHeader = typeof req.headers.authorization === 'string' ? req.headers.authorization.trim() : '';
  if (authorizationHeader.toLowerCase().startsWith('bearer ')) {
    return authorizationHeader.slice(7).trim();
  }

  return typeof req.headers.accesstoken === 'string' ? req.headers.accesstoken.trim() : '';
}

function decodeBase64UrlSegment(segment: string) {
  const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  return Buffer.from(padded, 'base64').toString('utf8');
}

function trimHeaderValue(value: unknown) {
  if (Array.isArray(value)) {
    return String(value[0] || '').trim();
  }

  return String(value || '').trim();
}

function resolveToolFeedbackPublicBaseUrl(req: express.Request) {
  const forwardedProto = trimHeaderValue(req.headers['x-forwarded-proto']);
  const forwardedHost = trimHeaderValue(req.headers['x-forwarded-host']);
  const protocol = forwardedProto || req.protocol || 'http';
  const host = forwardedHost || trimHeaderValue(req.headers.host);

  return host ? `${protocol}://${host}` : '';
}

function normalizeBusinessAuthMePayload(payload: unknown): BusinessAuthMePayload | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const record = payload as Record<string, unknown>;
  const nestedData = record.data;
  if (nestedData && typeof nestedData === 'object') {
    return normalizeBusinessAuthMePayload(nestedData);
  }

  return {
    companyTitle: typeof record.companyTitle === 'string' ? record.companyTitle : null,
    datasourceCode: typeof record.datasourceCode === 'string' ? record.datasourceCode : null,
    employeeId: typeof record.employeeId === 'number' || typeof record.employeeId === 'string' ? record.employeeId : null,
    employeeName: typeof record.employeeName === 'string' ? record.employeeName : null,
    username: typeof record.username === 'string' ? record.username : null,
  };
}

function parseCurrentUserFromToken(token: string): ToolFeedbackCurrentUser | null {
  const trimmedToken = token.trim();
  if (!trimmedToken) {
    return null;
  }

  const tokenParts = trimmedToken.split('.');
  if (tokenParts.length < 2) {
    return null;
  }

  try {
    const payload = JSON.parse(decodeBase64UrlSegment(tokenParts[1])) as Record<string, unknown>;
    const employeeId = Number(payload.employeeId);
    if (!Number.isFinite(employeeId)) {
      return null;
    }

    return {
      companyTitle: typeof payload.companyTitle === 'string' ? payload.companyTitle : null,
      datasourceCode: typeof payload.datasourceCode === 'string' ? payload.datasourceCode : null,
      employeeId,
      employeeName: typeof payload.employeeName === 'string' ? payload.employeeName : null,
      username: typeof payload.sub === 'string'
        ? payload.sub
        : typeof payload.username === 'string'
          ? payload.username
          : null,
    };
  } catch {
    return null;
  }
}

function parseCurrentUserFromHeaders(req: express.Request): ToolFeedbackCurrentUser | null {
  const employeeIdHeader = trimHeaderValue(req.headers['x-ls-employee-id']);
  const employeeId = Number(employeeIdHeader);
  if (!Number.isFinite(employeeId)) {
    return null;
  }

  return {
    companyTitle: trimHeaderValue(req.headers['x-ls-company-title']) || null,
    datasourceCode: trimHeaderValue(req.headers['x-ls-datasource-code']) || null,
    employeeId,
    employeeName: trimHeaderValue(req.headers['x-ls-employee-name']) || null,
    username: trimHeaderValue(req.headers['x-ls-username']) || null,
  };
}

async function fetchCurrentUserFromBusinessApi(req: express.Request) {
  const headers = buildBusinessProxyHeaders(req);
  const response = await fetch(buildBusinessAbsoluteUrl('/api/auth/me'), {
    headers,
    method: 'GET',
  });
  const payload = await parseUpstreamPayload(response);
  if (!response.ok) {
    throw new ToolFeedbackRequestError(
      extractErrorMessage(payload) ?? `登录信息获取失败，状态码 ${response.status}`,
      response.status,
    );
  }

  const normalizedPayload = normalizeBusinessAuthMePayload(payload);
  if (!normalizedPayload) {
    throw new ToolFeedbackRequestError('登录信息返回格式不正确。', 502);
  }

  const employeeId = Number(normalizedPayload.employeeId);
  if (!Number.isFinite(employeeId)) {
    throw new ToolFeedbackRequestError('当前登录信息缺少员工编号。', 401);
  }

  return {
    companyTitle: normalizedPayload.companyTitle,
    datasourceCode: normalizedPayload.datasourceCode,
    employeeId,
    employeeName: normalizedPayload.employeeName,
    username: normalizedPayload.username,
  } satisfies ToolFeedbackCurrentUser;
}

async function resolveCurrentToolFeedbackUser(req: express.Request) {
  const headerUser = parseCurrentUserFromHeaders(req);
  if (headerUser) {
    return headerUser;
  }

  const tokenUser = parseCurrentUserFromToken(extractBearerToken(req));
  if (tokenUser) {
    return tokenUser;
  }

  return fetchCurrentUserFromBusinessApi(req);
}

function getToolFeedbackErrorStatus(error: unknown) {
  if (error instanceof MulterError) {
    return 400;
  }

  if (error instanceof ToolFeedbackRequestError) {
    return error.status;
  }

  return 500;
}

function getToolFeedbackErrorMessage(error: unknown) {
  if (error instanceof MulterError) {
    if (error.code === 'LIMIT_FILE_COUNT') {
      return `最多只能上传 ${toolFeedbackMaxImageCount} 张图片。`;
    }

    if (error.code === 'LIMIT_FILE_SIZE') {
      return `单张图片不能超过 ${(toolFeedbackMaxImageSize / 1024 / 1024).toFixed(0)}MB。`;
    }

    return error.message || '图片上传失败，请稍后重试。';
  }

  if (error instanceof ToolFeedbackRequestError || error instanceof Error) {
    return error.message;
  }

  return '意见上报服务处理失败。';
}

function normalizeToolFeedbackUploadFiles(files: Express.Multer.File[] | undefined) {
  if (!Array.isArray(files) || files.length === 0) {
    return [] as ToolFeedbackUploadFile[];
  }

  return files.map((file) => ({
    buffer: file.buffer,
    mimetype: file.mimetype,
    originalname: file.originalname,
    size: file.size,
  }));
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
    await sendUpstreamResponse(upstream, res);
  } catch (error) {
    res.status(502).json({
      message: error instanceof Error ? error.message : 'Business API proxy request failed.',
      target: businessApiBaseUrl,
    });
  }
}

async function requestMiniMaxJson(prompt: string, modelName = model) {
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
      model: modelName,
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
    'Never use placeholders such as field_1, field_2, column_1, temp, or unknown.',
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
    const fallback = column.identifier && /^[a-z0-9_]+$/.test(column.identifier) && !isPlaceholderIdentifier(column.identifier)
      ? column.identifier
      : heuristic;
    const matchedIdentifier = String(matched?.identifier || '').trim();
    const sanitizedMatchedIdentifier = sanitizeIdentifier(matchedIdentifier, fallback);
    const useFallback = !matchedIdentifier
      || matchedIdentifier.length <= 2
      || isPlaceholderIdentifier(matchedIdentifier)
      || isPlaceholderIdentifier(sanitizedMatchedIdentifier);
    const preferHeuristic = !column.identifier && !isPlaceholderIdentifier(heuristic);

    return {
      id: column.id,
      identifier: preferHeuristic ? heuristic : (useFallback ? fallback : sanitizedMatchedIdentifier),
    };
  });

  return mapped satisfies TranslationItem[];
}

function normalizeAiCreateMainTableColumns(input: unknown) {
  if (!Array.isArray(input)) {
    return [] as AiCreateMainTableColumnInput[];
  }

  return input.flatMap((column, index) => {
      const record = column && typeof column === 'object' ? column as Record<string, unknown> : {};
      const name = String(record.name || '').trim();
      const id = String(record.id || `column_${index + 1}`).trim() || `column_${index + 1}`;

      if (!name) {
        return [];
      }

      return [{
        id,
        identifier: String(record.identifier || '').trim(),
        name,
        type: String(record.type || '').trim(),
      } satisfies AiCreateMainTableColumnInput];
    });
}

function needsIdentifierTranslation(identifier: string | undefined) {
  const trimmed = String(identifier || '').trim();

  if (!trimmed) {
    return true;
  }

  if (/[\u4e00-\u9fff]/.test(trimmed)) {
    return true;
  }

  return !/^[A-Za-z0-9_]+$/.test(trimmed);
}

function dedupeAiCreateMainTableColumns(columns: AiCreateMainTableColumnResult[]) {
  const used = new Map<string, number>();

  return columns.map((column, index) => {
    const baseIdentifier = sanitizeIdentifier(column.identifier, `field_${index + 1}`);
    const currentCount = used.get(baseIdentifier) ?? 0;

    if (currentCount === 0) {
      used.set(baseIdentifier, 1);
      return {
        ...column,
        identifier: baseIdentifier,
      };
    }

    let nextCount = currentCount + 1;
    let nextIdentifier = `${baseIdentifier}_${nextCount}`;
    while (used.has(nextIdentifier)) {
      nextCount += 1;
      nextIdentifier = `${baseIdentifier}_${nextCount}`;
    }

    used.set(baseIdentifier, nextCount);
    used.set(nextIdentifier, 1);

    return {
      ...column,
      identifier: nextIdentifier,
    };
  });
}

async function resolveAiCreateMainTableColumns(columns: AiCreateMainTableColumnInput[]) {
  const unresolvedColumns = columns.filter((column) => needsIdentifierTranslation(column.identifier));
  const translatedIdentifierMap = new Map<string, string>();
  let degraded = false;
  let message = '';
  let raw = '';

  if (unresolvedColumns.length > 0) {
    if (getApiKey()) {
      try {
        const { raw: rawText } = await requestMiniMaxJson(
          buildTranslatePrompt(unresolvedColumns.map((column) => ({
            id: column.id,
            identifier: column.identifier,
            name: column.name,
          }))),
          translateModel,
        );

        raw = rawText;
        normalizeTranslationItems(rawText, unresolvedColumns).forEach((item) => {
          translatedIdentifierMap.set(item.id, item.identifier);
        });
      } catch (error) {
        degraded = true;
        message = error instanceof Error ? error.message : 'MiniMax identifier translation failed.';
      }
    } else {
      degraded = true;
      message = 'MINIMAX_API_KEY is missing in .env.local.';
    }
  }

  const resolvedColumns = dedupeAiCreateMainTableColumns(columns.map((column, index) => {
    const normalizedExistingIdentifier = isAsciiIdentifier(String(column.identifier || '').trim())
      ? sanitizeIdentifier(String(column.identifier || '').trim(), `field_${index + 1}`)
      : '';

    if (!needsIdentifierTranslation(column.identifier) && normalizedExistingIdentifier) {
      return {
        id: column.id,
        identifier: normalizedExistingIdentifier,
        name: column.name,
        source: 'existing',
        translated: false,
        type: column.type,
      } satisfies AiCreateMainTableColumnResult;
    }

    const aiIdentifier = translatedIdentifierMap.get(column.id);
    const fallbackIdentifier = guessIdentifierFromName(column.name, index);

    return {
      id: column.id,
      identifier: aiIdentifier || fallbackIdentifier,
      name: column.name,
      source: aiIdentifier ? 'ai' : 'heuristic',
      translated: true,
      type: column.type,
    } satisfies AiCreateMainTableColumnResult;
  }));

  return {
    columns: resolvedColumns,
    degraded,
    message,
    raw,
    translatedCount: resolvedColumns.filter((column) => column.translated).length,
    untranslatedCount: unresolvedColumns.length,
  };
}

function resolveSqlColumnType(type: string | undefined, name: string, identifier: string) {
  const combined = `${String(type || '')} ${name} ${identifier}`.toLowerCase();

  if (/(bool|boolean|checkbox|\u590D\u9009|\u5F00\u5173)/i.test(combined)) {
    return 'BIT';
  }

  if (/(datetime|timestamp|\u65E5\u671F\u65F6\u95F4|\u65F6\u95F4)/i.test(combined)) {
    return 'DATETIME';
  }

  if (/(date|\u65E5\u671F)/i.test(combined)) {
    return 'DATE';
  }

  if (/(int|\u6574\u6570|\u5E8F\u53F7)/i.test(combined)) {
    return 'INT';
  }

  if (/(decimal|number|qty|count|price|amount|\u6570\u5B57|\u91D1\u989D|\u5355\u4EF7|\u6570\u91CF)/i.test(combined)) {
    return 'DECIMAL(18,2)';
  }

  if (/(remark|description|content|memo|note|\u5907\u6CE8|\u8BF4\u660E|\u5185\u5BB9)/i.test(combined)) {
    return 'NVARCHAR(500)';
  }

  return 'NVARCHAR(255)';
}

function buildCreateTableSql(tableName: string, columns: AiCreateMainTableColumnResult[]) {
  const hasPrimaryId = columns.some((column) => column.identifier === 'id');
  const definitions = [
    ...(hasPrimaryId ? [] : ['  [id] BIGINT IDENTITY(1,1) NOT NULL']),
    ...columns.map((column) => `  [${column.identifier}] ${resolveSqlColumnType(column.type, column.name, column.identifier)} NULL`),
    ...(hasPrimaryId ? [] : [`  CONSTRAINT [PK_${tableName}] PRIMARY KEY ([id])`]),
  ];

  return [
    `CREATE TABLE [${tableName}] (`,
    definitions.map((line, index) => (index < definitions.length - 1 ? `${line},` : line)).join('\n'),
    ');',
  ].join('\n');
}

function buildMainTableSql(tableName: string, columns: AiCreateMainTableColumnResult[]) {
  if (columns.length === 0) {
    return [
      'SELECT',
      '  *',
      `FROM [${tableName}]`,
      'WHERE 1 = 1',
    ].join('\n');
  }

  return [
    'SELECT',
    columns.map((column) => `  [${column.identifier}] AS [${column.name}]`).join(',\n'),
    `FROM [${tableName}]`,
    'WHERE 1 = 1',
  ].join('\n');
}

function buildAiCreateMainTablePersistPayload(input: {
  columns: AiCreateMainTableColumnResult[];
  createTableSql: string;
  defaultQuery: string;
  description: string;
  mainSql: string;
  moduleCode: string;
  moduleName: string;
  tableName: string;
  tableType: string;
}) {
  return {
    action: 'ai_create_main_table',
    aiGenerated: true,
    columns: input.columns.map((column, index) => ({
      id: column.id,
      identifier: column.identifier,
      name: column.name,
      orderId: index + 1,
      translated: column.translated,
      translationSource: column.source,
      type: column.type || '',
    })),
    createTableSql: input.createTableSql,
    defaultQuery: input.defaultQuery,
    description: input.description,
    mainTable: input.tableName,
    moduleCode: input.moduleCode,
    moduleName: input.moduleName,
    querySql: input.mainSql,
    tableType: input.tableType,
  } satisfies Record<string, unknown>;
}

async function parseUpstreamPayload(response: Response) {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return response.json().catch(() => null);
  }

  const text = await response.text().catch(() => '');
  return text || null;
}

function resolveAiCreateMainTablePersistPath(moduleCode: string) {
  const configuredPath = getAiCreateMainTablePersistPathConfig();
  const fallbackPath = '/api/single-table/modules/{moduleCode}/ai-main-table';
  const rawPath = configuredPath || fallbackPath;

  return rawPath.replace(/\{moduleCode\}|:moduleCode/g, encodeURIComponent(moduleCode));
}

function getAiCreateMainTablePersistPathConfig() {
  const configuredPath = String(process.env.BUSINESS_AI_MAIN_TABLE_SAVE_PATH || '').trim();

  if (!configuredPath) {
    return '';
  }

  if (configuredPath.includes('你的保存接口') || configuredPath.includes('your-save-path')) {
    return '';
  }

  return configuredPath;
}

async function persistAiCreateMainTable(
  req: express.Request,
  payload: Record<string, unknown>,
  options: {
    moduleCode: string;
    persist: boolean;
  },
) {
  const configuredPath = getAiCreateMainTablePersistPathConfig();
  const targetPath = resolveAiCreateMainTablePersistPath(options.moduleCode);

  if (!options.persist) {
    return {
      status: 'skipped',
      target: targetPath,
      message: '当前请求未启用后端持久化。',
      requestBody: payload,
    } satisfies AiCreateMainTablePersistenceResult;
  }

  if (!configuredPath) {
    return {
      status: 'pending',
      target: targetPath,
      message: '未配置有效的 BUSINESS_AI_MAIN_TABLE_SAVE_PATH，已返回可直接落库的 payload 供后端联调。',
      requestBody: payload,
    } satisfies AiCreateMainTablePersistenceResult;
  }

  try {
    const headers = buildBusinessProxyHeaders(req);
    headers.set('content-type', 'application/json');

    const upstream = await fetch(`${businessApiBaseUrl}${targetPath}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    const responseBody = await parseUpstreamPayload(upstream);

    if (!upstream.ok) {
      return {
        status: 'failed',
        target: targetPath,
        message: extractErrorMessage(responseBody) ?? `业务保存失败，状态码 ${upstream.status}`,
        requestBody: payload,
        responseBody,
      } satisfies AiCreateMainTablePersistenceResult;
    }

    return {
      status: 'saved',
      target: targetPath,
      message: '后端持久化完成。',
      requestBody: payload,
      responseBody,
    } satisfies AiCreateMainTablePersistenceResult;
  } catch (error) {
    return {
      status: 'failed',
      target: targetPath,
      message: error instanceof Error ? error.message : '后端持久化请求失败。',
      requestBody: payload,
    } satisfies AiCreateMainTablePersistenceResult;
  }
}

app.get('/api/ai/health', (_req, res) => {
  res.json({
    configured: Boolean(getApiKey()),
    model,
    translateModel,
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
      model: translateModel,
      items: [],
    });
  }

  try {
    const { raw } = await requestMiniMaxJson(buildTranslatePrompt(columns), translateModel);

    return res.json({
      model: translateModel,
      items: normalizeTranslationItems(raw, columns),
    });
  } catch (error) {
    return res.json({
      model: translateModel,
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

app.post('/api/ai/create-main-table', async (req, res) => {
  const moduleCode = String(req.body?.moduleCode || '').trim();
  const moduleName = String(req.body?.moduleName || '').trim();
  const tableName = normalizeTableName(String(req.body?.tableName || '').trim());
  const tableType = String(req.body?.tableType || '').trim() || '普通表格';
  const description = String(req.body?.description || '').trim();
  const persist = req.body?.persist !== false;
  const columns = normalizeAiCreateMainTableColumns(req.body?.columns);

  if (!tableName) {
    return res.status(400).json({
      message: 'tableName is required.',
    });
  }

  if (columns.length === 0) {
    return res.status(400).json({
      message: 'columns are required.',
    });
  }

  try {
    const resolved = await resolveAiCreateMainTableColumns(columns);
    const createTableSql = buildCreateTableSql(tableName, resolved.columns);
    const mainSql = buildMainTableSql(tableName, resolved.columns);
    const defaultQuery = '';
    const persistPayload = buildAiCreateMainTablePersistPayload({
      columns: resolved.columns,
      createTableSql,
      defaultQuery,
      description,
      mainSql,
      moduleCode,
      moduleName,
      tableName,
      tableType,
    });
    const persistence = await persistAiCreateMainTable(req, persistPayload, {
      moduleCode: moduleCode || tableName,
      persist,
    });

    return res.json({
      model: translateModel,
      degraded: resolved.degraded,
      message: resolved.message,
      result: {
        createTableSql,
        defaultQuery,
        mainSql,
        persistence,
        raw: resolved.raw,
        tableName,
        translatedColumns: resolved.columns,
        translatedCount: resolved.translatedCount,
        untranslatedCount: resolved.untranslatedCount,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : 'AI create main table failed.',
    });
  }
});

app.get('/api/system/tool-feedback/workspace', async (req, res) => {
  try {
    const currentUser = await resolveCurrentToolFeedbackUser(req);
    const workspace = await getToolFeedbackWorkspace(currentUser, {
      publicBaseUrl: resolveToolFeedbackPublicBaseUrl(req),
    });
    return res.json(workspace);
  } catch (error) {
    return res.status(getToolFeedbackErrorStatus(error)).json({
      message: getToolFeedbackErrorMessage(error),
    });
  }
});

app.get('/api/system/tool-feedback/files/:storedFileName', async (req, res) => {
  try {
    const attachment = await getToolFeedbackAttachmentFile(req.params.storedFileName);
    res.setHeader('Cache-Control', 'private, max-age=31536000, immutable');
    res.setHeader(
      'Content-Disposition',
      `inline; filename*=UTF-8''${encodeURIComponent(attachment.originalFileName)}`,
    );
    if (attachment.contentType) {
      res.type(attachment.contentType);
    }
    return res.sendFile(attachment.absolutePath);
  } catch (error) {
    return res.status(getToolFeedbackErrorStatus(error)).json({
      message: getToolFeedbackErrorMessage(error),
    });
  }
});

app.post('/api/system/tool-feedback', (req, res) => {
  toolFeedbackUpload.array('images', toolFeedbackMaxImageCount)(req, res, async (uploadError) => {
    if (uploadError) {
      return res.status(getToolFeedbackErrorStatus(uploadError)).json({
        message: getToolFeedbackErrorMessage(uploadError),
      });
    }

    try {
      const currentUser = await resolveCurrentToolFeedbackUser(req);
      const workspace = await createToolFeedbackSuggestion(
        currentUser,
        req.body ?? {},
        normalizeToolFeedbackUploadFiles(Array.isArray(req.files) ? req.files : undefined),
        {
          publicBaseUrl: resolveToolFeedbackPublicBaseUrl(req),
        },
      );
      return res.json(workspace);
    } catch (error) {
      return res.status(getToolFeedbackErrorStatus(error)).json({
        message: getToolFeedbackErrorMessage(error),
      });
    }
  });
});

app.put('/api/system/tool-feedback/:suggestionId', (req, res) => {
  const suggestionId = Number(req.params.suggestionId);
  if (!Number.isFinite(suggestionId)) {
    return res.status(400).json({
      message: '意见编号不正确。',
    });
  }

  toolFeedbackUpload.array('images', toolFeedbackMaxImageCount)(req, res, async (uploadError) => {
    if (uploadError) {
      return res.status(getToolFeedbackErrorStatus(uploadError)).json({
        message: getToolFeedbackErrorMessage(uploadError),
      });
    }

    try {
      const currentUser = await resolveCurrentToolFeedbackUser(req);
      const workspace = await resubmitToolFeedbackSuggestion(
        currentUser,
        suggestionId,
        req.body ?? {},
        normalizeToolFeedbackUploadFiles(Array.isArray(req.files) ? req.files : undefined),
        {
          publicBaseUrl: resolveToolFeedbackPublicBaseUrl(req),
        },
      );
      return res.json(workspace);
    } catch (error) {
      return res.status(getToolFeedbackErrorStatus(error)).json({
        message: getToolFeedbackErrorMessage(error),
      });
    }
  });
});

app.put('/api/system/tool-feedback/:suggestionId/decision', async (req, res) => {
  const suggestionId = Number(req.params.suggestionId);
  if (!Number.isFinite(suggestionId)) {
    return res.status(400).json({
      message: '意见编号不正确。',
    });
  }

  try {
    const currentUser = await resolveCurrentToolFeedbackUser(req);
    const workspace = await decideToolFeedbackSuggestion(currentUser, suggestionId, req.body ?? {}, {
      publicBaseUrl: resolveToolFeedbackPublicBaseUrl(req),
    });
    return res.json(workspace);
  } catch (error) {
    return res.status(getToolFeedbackErrorStatus(error)).json({
      message: getToolFeedbackErrorMessage(error),
    });
  }
});

app.get('/api/auth/employees', async (req, res) => {
  return forwardBusinessApi(req, res);
});

app.post('/api/auth/login', async (req, res) => {
  return forwardBusinessApi(req, res);
});

app.use('/api', async (req, res) => {
  return forwardBusinessApi(req, res);
});

app.listen(port, () => {
  console.log(`Host server listening on http://127.0.0.1:${port}`);
  console.log('Responsibilities: AI relay + business API proxy.');
  console.log(`MiniMax primary model: ${model}`);
  console.log(`MiniMax translate model: ${translateModel}`);
  console.log(`Business API proxy target: ${businessApiBaseUrl}`);
});

void cleanupExpiredRejectedSuggestionImages().catch((error) => {
  console.error('Initial tool feedback cleanup failed:', error);
});

const toolFeedbackCleanupTimer = setInterval(() => {
  void cleanupExpiredRejectedSuggestionImages().catch((error) => {
    console.error('Scheduled tool feedback cleanup failed:', error);
  });
}, 60 * 60 * 1000);

if (typeof toolFeedbackCleanupTimer.unref === 'function') {
  toolFeedbackCleanupTimer.unref();
}
