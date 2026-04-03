import { randomUUID } from 'node:crypto';
import { access, mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import mssql from 'mssql';

export type ToolFeedbackCurrentUser = {
  companyTitle?: string | null;
  datasourceCode?: string | null;
  employeeId: number;
  employeeName?: string | null;
  username?: string | null;
};

export type ToolFeedbackUploadFile = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
};

export type FixedLoginEmployeeOption = {
  departmentId: string;
  employeeId: number;
  employeeName: string;
  loginAccount: string;
  py: string;
};

export class ToolFeedbackRequestError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'ToolFeedbackRequestError';
    this.status = status;
  }
}

type DirectoryEmployeeProfile = {
  departmentId: number | null;
  departmentName: string | null;
  employeeId: number;
  employeeName: string | null;
  loginAccount: string | null;
};

type ToolFeedbackRecord = {
  affectedpage: string | null;
  companytitle: string | null;
  content: string | null;
  createdat: Date | null;
  datasourcecode: string | null;
  decisionremark: string | null;
  expectedresult: string | null;
  id: number;
  reviewerdepartmentid: number | null;
  reviewerdepartmentname: string | null;
  revieweremployeeid: number | null;
  revieweremployeename: string | null;
  reviewerloginaccount: string | null;
  reviewedat: Date | null;
  status: string | null;
  submitterdepartmentid: number | null;
  submitterdepartmentname: string | null;
  submitteremployeeid: number;
  submitteremployeename: string | null;
  submitterloginaccount: string | null;
  title: string | null;
  updatedat: Date | null;
};

type ToolFeedbackAttachmentRecord = {
  contenttype: string | null;
  createdat: Date | null;
  filesize: number;
  fileurl: string;
  id: number;
  originalfilename: string;
  sortorder: number;
  storedfilename: string;
  suggestionid: number;
};

type PersistedToolFeedbackImage = {
  contentType: string;
  fileSize: number;
  fileUrl: string;
  originalFileName: string;
  sortOrder: number;
  storedFileName: string;
};

type ToolFeedbackServiceOptions = {
  publicBaseUrl?: string | null;
};

const TOOL_FEEDBACK_TABLE_NAME = 'dbo.p_toolImprovementSuggestionTab';
const TOOL_FEEDBACK_ATTACHMENT_TABLE_NAME = 'dbo.p_toolImprovementSuggestionImageTab';
const TOOL_FEEDBACK_UPLOAD_ROOT = path.resolve(process.cwd(), 'server-data', 'tool-feedback-images');
const STATUS_PENDING = 'pending';
const STATUS_APPROVED = 'approved';
const STATUS_REJECTED = 'rejected';
const STATUS_COMPLETED = 'completed';
const REJECTED_ATTACHMENT_RETENTION_DAYS = 7;
const TOOL_FEEDBACK_MAX_IMAGE_COUNT = Number(process.env.TOOL_FEEDBACK_MAX_IMAGE_COUNT || 8);
const TOOL_FEEDBACK_MAX_IMAGE_SIZE = Number(process.env.TOOL_FEEDBACK_MAX_IMAGE_SIZE || 10 * 1024 * 1024);
const TOOL_FEEDBACK_ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/bmp',
  'image/gif',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

const directoryDbConfig: mssql.config = {
  database: process.env.EMPLOYEE_DIRECTORY_DB_BASE_NAME || 'lscrm',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
  password: process.env.EMPLOYEE_DIRECTORY_DB_PASSWORD || 'lserp110',
  port: Number(process.env.EMPLOYEE_DIRECTORY_DB_SERVER_PORT || 16890),
  server: process.env.EMPLOYEE_DIRECTORY_DB_SERVER_IP || '114.116.152.217',
  user: process.env.EMPLOYEE_DIRECTORY_DB_USERNAME || 'lserpAdmin',
};

let directoryDbPoolPromise: Promise<mssql.ConnectionPool> | null = null;
let suggestionTablesReady = false;
let rejectedAttachmentCleanupPromise: Promise<number> | null = null;

function trimText(value: unknown) {
  return String(value || '').trim();
}

function trimToNull(value: unknown) {
  const trimmed = trimText(value);
  return trimmed || null;
}

function normalizePublicBaseUrl(value?: string | null) {
  return trimText(value).replace(/\/+$/, '');
}

function isHiddenCompanyIdentifier(value: unknown) {
  const normalizedValue = trimText(value);
  if (!normalizedValue) {
    return true;
  }

  return /^company_[a-z0-9]+$/i.test(normalizedValue);
}

function getVisibleCompanyValue(value: unknown) {
  const normalizedValue = trimToNull(value);
  if (!normalizedValue || isHiddenCompanyIdentifier(normalizedValue)) {
    return null;
  }

  return normalizedValue;
}

function buildAttachmentPublicUrl(storedFileName: string, publicBaseUrl?: string | null) {
  const normalizedBaseUrl = normalizePublicBaseUrl(publicBaseUrl);
  const routePath = `/api/system/tool-feedback/files/${encodeURIComponent(storedFileName)}`;
  return normalizedBaseUrl ? `${normalizedBaseUrl}${routePath}` : routePath;
}

function requireText(value: unknown, message: string) {
  const trimmed = trimText(value);
  if (!trimmed) {
    throw new ToolFeedbackRequestError(message, 400);
  }

  return trimmed;
}

function isResearchDepartment(departmentName: string | null | undefined) {
  return trimText(departmentName).includes('研发');
}

function sanitizeOriginalFileName(fileName: string) {
  const basename = path.basename(trimText(fileName)) || 'image';
  return basename.replace(/[^\u4e00-\u9fffA-Za-z0-9._-]+/g, '_').slice(0, 240) || 'image';
}

function resolveImageExtension(originalName: string, contentType: string) {
  const normalizedContentType = trimText(contentType).toLowerCase();
  const fileExtension = path.extname(originalName).toLowerCase();
  const mappedExtension = new Map<string, string>([
    ['image/bmp', '.bmp'],
    ['image/gif', '.gif'],
    ['image/jpeg', '.jpg'],
    ['image/jpg', '.jpg'],
    ['image/png', '.png'],
    ['image/webp', '.webp'],
  ]).get(normalizedContentType);

  if (mappedExtension) {
    return mappedExtension;
  }

  if (['.bmp', '.gif', '.jpeg', '.jpg', '.png', '.webp'].includes(fileExtension)) {
    return fileExtension === '.jpeg' ? '.jpg' : fileExtension;
  }

  return '.png';
}

function buildStoredFileName(originalName: string, contentType: string) {
  return `${Date.now()}-${randomUUID()}${resolveImageExtension(originalName, contentType)}`;
}

function joinPromptLine(label: string, value: string | null | undefined) {
  const normalizedValue = trimToNull(value);
  return normalizedValue ? `${label}：${normalizedValue}` : null;
}

function buildAttachmentPromptLines(attachments: Array<{ fileUrl: string; originalFileName: string }>) {
  if (attachments.length === 0) {
    return [];
  }

  return [
    `问题补充图片：${attachments.length} 张`,
    ...attachments.map((attachment, index) => `${index + 1}. ${attachment.originalFileName} - ${attachment.fileUrl}`),
  ];
}

function buildCodexPrompt(
  item: {
    affectedpage?: string | null;
    companytitle?: string | null;
    content?: string | null;
    datasourcecode?: string | null;
    expectedresult?: string | null;
    submitterdepartmentname?: string | null;
    submitteremployeename?: string | null;
    submitterloginaccount?: string | null;
    title?: string | null;
  },
  attachments: Array<{ fileUrl: string; originalFileName: string }>,
) {
  return [
    '请在朗速工具中处理以下工具改进意见：',
    joinPromptLine('意见标题', item.title),
    joinPromptLine('问题描述', item.content),
    joinPromptLine('期望效果', item.expectedresult),
    joinPromptLine('涉及页面', item.affectedpage),
    joinPromptLine('所属帐套', getVisibleCompanyValue(item.companytitle)),
    joinPromptLine('帐套标识', isHiddenCompanyIdentifier(item.datasourcecode) ? null : item.datasourcecode),
    joinPromptLine(
      '提出人',
      [item.submitteremployeename, item.submitterloginaccount, item.submitterdepartmentname]
        .map((value) => trimToNull(value))
        .filter(Boolean)
        .join(' / '),
    ),
    ...buildAttachmentPromptLines(attachments),
  ]
    .filter(Boolean)
    .join('\n');
}

function mapAttachmentRecord(record: ToolFeedbackAttachmentRecord, publicBaseUrl?: string | null) {
  return {
    contentType: record.contenttype,
    createdAt: record.createdat,
    fileSize: Number(record.filesize || 0),
    fileUrl: buildAttachmentPublicUrl(record.storedfilename, publicBaseUrl),
    id: record.id,
    originalFileName: record.originalfilename,
    sortOrder: Number(record.sortorder || 0),
  };
}

function mapSuggestionRecord(
  record: ToolFeedbackRecord,
  attachments: ReturnType<typeof mapAttachmentRecord>[],
) {
  return {
    affectedPage: record.affectedpage,
    attachments,
    codexPrompt: buildCodexPrompt(record, attachments),
    companyTitle: getVisibleCompanyValue(record.companytitle),
    content: record.content || '',
    createdAt: record.createdat,
    datasourceCode: isHiddenCompanyIdentifier(record.datasourcecode) ? null : record.datasourcecode,
    decisionRemark: record.decisionremark,
    expectedResult: record.expectedresult,
    id: record.id,
    reviewedAt: record.reviewedat,
    reviewerDepartmentId: record.reviewerdepartmentid,
    reviewerDepartmentName: record.reviewerdepartmentname,
    reviewerEmployeeId: record.revieweremployeeid,
    reviewerEmployeeName: record.revieweremployeename,
    reviewerLoginAccount: record.reviewerloginaccount,
    status: trimText(record.status) || STATUS_PENDING,
    submitterDepartmentId: record.submitterdepartmentid,
    submitterDepartmentName: record.submitterdepartmentname,
    submitterEmployeeId: record.submitteremployeeid,
    submitterEmployeeName: record.submitteremployeename,
    submitterLoginAccount: record.submitterloginaccount,
    title: record.title || '',
    updatedAt: record.updatedat,
  };
}

async function getDirectoryDbPool() {
  if (!directoryDbPoolPromise) {
    directoryDbPoolPromise = mssql.connect(directoryDbConfig);
  }

  return directoryDbPoolPromise;
}

async function ensureSuggestionTables() {
  if (suggestionTablesReady) {
    return;
  }

  const pool = await getDirectoryDbPool();
  await pool.request().batch(`
    if object_id('${TOOL_FEEDBACK_TABLE_NAME}', 'U') is null
    begin
      create table ${TOOL_FEEDBACK_TABLE_NAME} (
        id bigint identity(1,1) not null primary key,
        status nvarchar(20) not null constraint DF_p_toolImprovementSuggestionTab_status default ('pending'),
        title nvarchar(200) not null,
        content nvarchar(max) not null,
        expectedresult nvarchar(1000) null,
        affectedpage nvarchar(200) null,
        datasourcecode nvarchar(100) null,
        companytitle nvarchar(200) null,
        submitteremployeeid bigint not null,
        submitterloginaccount nvarchar(100) null,
        submitteremployeename nvarchar(100) null,
        submitterdepartmentid int null,
        submitterdepartmentname nvarchar(100) null,
        revieweremployeeid bigint null,
        reviewerloginaccount nvarchar(100) null,
        revieweremployeename nvarchar(100) null,
        reviewerdepartmentid int null,
        reviewerdepartmentname nvarchar(100) null,
        decisionremark nvarchar(500) null,
        reviewedat datetime2 null,
        createdat datetime2 not null constraint DF_p_toolImprovementSuggestionTab_createdat default (sysutcdatetime()),
        updatedat datetime2 not null constraint DF_p_toolImprovementSuggestionTab_updatedat default (sysutcdatetime())
      );
      create nonclustered index IX_p_toolImprovementSuggestionTab_status_createdat
        on ${TOOL_FEEDBACK_TABLE_NAME}(status, createdat desc);
      create nonclustered index IX_p_toolImprovementSuggestionTab_submitter_createdat
        on ${TOOL_FEEDBACK_TABLE_NAME}(submitteremployeeid, createdat desc);
    end;

    if object_id('${TOOL_FEEDBACK_ATTACHMENT_TABLE_NAME}', 'U') is null
    begin
      create table ${TOOL_FEEDBACK_ATTACHMENT_TABLE_NAME} (
        id bigint identity(1,1) not null primary key,
        suggestionid bigint not null,
        sortorder int not null constraint DF_p_toolImprovementSuggestionImageTab_sortorder default (0),
        originalfilename nvarchar(260) not null,
        storedfilename nvarchar(260) not null,
        contenttype nvarchar(100) null,
        filesize bigint not null,
        fileurl nvarchar(500) not null,
        createdat datetime2 not null constraint DF_p_toolImprovementSuggestionImageTab_createdat default (sysutcdatetime())
      );
      create nonclustered index IX_p_toolImprovementSuggestionImageTab_suggestionid_sortorder
        on ${TOOL_FEEDBACK_ATTACHMENT_TABLE_NAME}(suggestionid, sortorder, id);
      create unique nonclustered index UX_p_toolImprovementSuggestionImageTab_storedfilename
        on ${TOOL_FEEDBACK_ATTACHMENT_TABLE_NAME}(storedfilename);
    end
  `);
  suggestionTablesReady = true;
}

async function requireEmployeeProfile(employeeId: number) {
  await ensureSuggestionTables();

  const pool = await getDirectoryDbPool();
  const result = await pool.request()
    .input('employeeId', mssql.BigInt, employeeId)
    .query<DirectoryEmployeeProfile>(`
      select top (1)
        cast(e.EmployeeId as bigint) as employeeId,
        e.LoginAccount as loginAccount,
        e.EmployeeName as employeeName,
        cast(e.Departmentid as int) as departmentId,
        d.departmentname as departmentName
      from P_EmployeeTab e
      left join P_DepartmentTab d on d.Departmentid = e.Departmentid
      where e.EmployeeId = @employeeId
        and isnull(e.sign, 0) = 0
        and isnull(e.UseFlag, 0) = 1
      order by e.EmployeeId
    `);

  const employee = result.recordset[0];
  if (!employee) {
    throw new ToolFeedbackRequestError('当前登录人员不存在或已停用。', 401);
  }

  return employee;
}

export async function listFixedLoginEmployees() {
  await ensureSuggestionTables();

  const pool = await getDirectoryDbPool();
  const result = await pool.request().query<FixedLoginEmployeeOption>(`
    select
      cast(e.EmployeeId as bigint) as employeeId,
      e.LoginAccount as loginAccount,
      e.EmployeeName as employeeName,
      cast(e.Departmentid as varchar(20)) as departmentId,
      cast('' as varchar(50)) as py
    from P_EmployeeTab e
    where isnull(e.sign, 0) = 0
      and isnull(e.UseFlag, 0) = 1
    order by
      e.EmployeeName asc,
      e.EmployeeId asc
  `);

  return result.recordset.map((item) => ({
    departmentId: trimText(item.departmentId),
    employeeId: Number(item.employeeId),
    employeeName: trimText(item.employeeName),
    loginAccount: trimText(item.loginAccount),
    py: trimText(item.py),
  }));
}

async function listAttachmentRecordsBySuggestionIds(suggestionIds: number[]) {
  const validIds = suggestionIds
    .map((id) => Number(id))
    .filter((id) => Number.isInteger(id) && id > 0);

  if (validIds.length === 0) {
    return new Map<number, ToolFeedbackAttachmentRecord[]>();
  }

  const pool = await getDirectoryDbPool();
  const result = await pool.request().query<ToolFeedbackAttachmentRecord>(`
    select
      id,
      suggestionid,
      sortorder,
      originalfilename,
      storedfilename,
      contenttype,
      filesize,
      fileurl,
      createdat
    from ${TOOL_FEEDBACK_ATTACHMENT_TABLE_NAME}
    where suggestionid in (${validIds.join(',')})
    order by suggestionid asc, sortorder asc, id asc
  `);

  const attachmentsBySuggestionId = new Map<number, ToolFeedbackAttachmentRecord[]>();
  result.recordset.forEach((record) => {
    const bucket = attachmentsBySuggestionId.get(record.suggestionid) ?? [];
    bucket.push(record);
    attachmentsBySuggestionId.set(record.suggestionid, bucket);
  });

  return attachmentsBySuggestionId;
}

async function listAttachmentRecordsBySuggestionId(suggestionId: number) {
  const pool = await getDirectoryDbPool();
  const result = await pool.request()
    .input('suggestionId', mssql.BigInt, suggestionId)
    .query<ToolFeedbackAttachmentRecord>(`
      select
        id,
        suggestionid,
        sortorder,
        originalfilename,
        storedfilename,
        contenttype,
        filesize,
        fileurl,
        createdat
      from ${TOOL_FEEDBACK_ATTACHMENT_TABLE_NAME}
      where suggestionid = @suggestionId
      order by sortorder asc, id asc
    `);

  return result.recordset;
}

async function mapSuggestionRecords(records: ToolFeedbackRecord[], options: ToolFeedbackServiceOptions = {}) {
  const attachmentsBySuggestionId = await listAttachmentRecordsBySuggestionIds(records.map((record) => record.id));

  return records.map((record) =>
    mapSuggestionRecord(
      record,
      (attachmentsBySuggestionId.get(record.id) ?? []).map((attachmentRecord) =>
        mapAttachmentRecord(attachmentRecord, options.publicBaseUrl),
      ),
    ),
  );
}

async function listMySuggestions(employeeId: number, options: ToolFeedbackServiceOptions = {}) {
  const pool = await getDirectoryDbPool();
  const result = await pool.request()
    .input('employeeId', mssql.BigInt, employeeId)
    .query<ToolFeedbackRecord>(`
      select top (200)
        id,
        status,
        title,
        content,
        expectedresult,
        affectedpage,
        datasourcecode,
        companytitle,
        submitteremployeeid,
        submitterloginaccount,
        submitteremployeename,
        submitterdepartmentid,
        submitterdepartmentname,
        revieweremployeeid,
        reviewerloginaccount,
        revieweremployeename,
        reviewerdepartmentid,
        reviewerdepartmentname,
        decisionremark,
        reviewedat,
        createdat,
        updatedat
      from ${TOOL_FEEDBACK_TABLE_NAME}
      where submitteremployeeid = @employeeId
      order by createdat desc, id desc
    `);

  return mapSuggestionRecords(result.recordset, options);
}

async function listReviewSuggestions(options: ToolFeedbackServiceOptions = {}) {
  const pool = await getDirectoryDbPool();
  const result = await pool.request().query<ToolFeedbackRecord>(`
    select top (300)
      id,
      status,
      title,
      content,
      expectedresult,
      affectedpage,
      datasourcecode,
      companytitle,
      submitteremployeeid,
      submitterloginaccount,
      submitteremployeename,
      submitterdepartmentid,
      submitterdepartmentname,
      revieweremployeeid,
      reviewerloginaccount,
      revieweremployeename,
      reviewerdepartmentid,
      reviewerdepartmentname,
      decisionremark,
      reviewedat,
      createdat,
      updatedat
    from ${TOOL_FEEDBACK_TABLE_NAME}
    order by
      case
        when status = '${STATUS_PENDING}' then 0
        when status = '${STATUS_APPROVED}' then 1
        when status = '${STATUS_REJECTED}' then 2
        else 3
      end,
      createdat desc,
      id desc
  `);

  return mapSuggestionRecords(result.recordset, options);
}

async function getSuggestionById(id: number) {
  const pool = await getDirectoryDbPool();
  const result = await pool.request()
    .input('id', mssql.BigInt, id)
    .query<ToolFeedbackRecord>(`
      select top (1)
        id,
        status,
        title,
        content,
        expectedresult,
        affectedpage,
        datasourcecode,
        companytitle,
        submitteremployeeid,
        submitterloginaccount,
        submitteremployeename,
        submitterdepartmentid,
        submitterdepartmentname,
        revieweremployeeid,
        reviewerloginaccount,
        revieweremployeename,
        reviewerdepartmentid,
        reviewerdepartmentname,
        decisionremark,
        reviewedat,
        createdat,
        updatedat
      from ${TOOL_FEEDBACK_TABLE_NAME}
      where id = @id
      order by id desc
    `);

  return result.recordset[0] ?? null;
}

async function requirePendingSuggestion(id: number) {
  const suggestion = await getSuggestionById(id);
  if (!suggestion) {
    throw new ToolFeedbackRequestError('未找到对应的意见记录。', 404);
  }

  if (trimText(suggestion.status).toLowerCase() !== STATUS_PENDING) {
    throw new ToolFeedbackRequestError('该意见已经处理过了，请刷新列表后再操作。', 409);
  }

  return suggestion;
}

async function requireApprovedSuggestion(id: number) {
  const suggestion = await getSuggestionById(id);
  if (!suggestion) {
    throw new ToolFeedbackRequestError('未找到对应的意见记录。', 404);
  }

  if (trimText(suggestion.status).toLowerCase() !== STATUS_APPROVED) {
    throw new ToolFeedbackRequestError('只有已同意的意见才可以标记完成。', 409);
  }

  return suggestion;
}

async function requireRejectedSuggestionForResubmit(id: number, employeeId: number) {
  const suggestion = await getSuggestionById(id);
  if (!suggestion) {
    throw new ToolFeedbackRequestError('未找到对应的意见记录。', 404);
  }

  if (Number(suggestion.submitteremployeeid) !== Number(employeeId)) {
    throw new ToolFeedbackRequestError('只能修改自己被驳回的意见。', 403);
  }

  if (trimText(suggestion.status).toLowerCase() !== STATUS_REJECTED) {
    throw new ToolFeedbackRequestError('只有被驳回的意见才可以修改后重新上报。', 409);
  }

  return suggestion;
}

function normalizeDecision(rawDecision: unknown) {
  const decision = trimText(rawDecision).toLowerCase();
  if (['approved', 'approve', 'pass', '同意', '通过'].includes(decision)) {
    return STATUS_APPROVED;
  }

  if (['rejected', 'reject', '驳回', '拒绝'].includes(decision)) {
    return STATUS_REJECTED;
  }

  if (['completed', 'complete', 'done', 'finish', '完成', '已完成'].includes(decision)) {
    return STATUS_COMPLETED;
  }

  throw new ToolFeedbackRequestError('不支持的处理动作。', 400);
}

function normalizeUploadFiles(files: ToolFeedbackUploadFile[]) {
  if (files.length > TOOL_FEEDBACK_MAX_IMAGE_COUNT) {
    throw new ToolFeedbackRequestError(`最多只能上传 ${TOOL_FEEDBACK_MAX_IMAGE_COUNT} 张图片。`, 400);
  }

  return files.map((file, index) => {
    const contentType = trimText(file.mimetype).toLowerCase();
    if (!TOOL_FEEDBACK_ALLOWED_IMAGE_MIME_TYPES.has(contentType)) {
      throw new ToolFeedbackRequestError(`第 ${index + 1} 张文件不是支持的图片格式。`, 400);
    }

    const fileSize = Number(file.size || file.buffer?.byteLength || 0);
    if (!file.buffer || file.buffer.byteLength === 0 || fileSize <= 0) {
      throw new ToolFeedbackRequestError(`第 ${index + 1} 张图片内容为空，请重新上传。`, 400);
    }

    if (fileSize > TOOL_FEEDBACK_MAX_IMAGE_SIZE) {
      throw new ToolFeedbackRequestError(
        `第 ${index + 1} 张图片超过 ${(TOOL_FEEDBACK_MAX_IMAGE_SIZE / 1024 / 1024).toFixed(0)}MB 限制。`,
        400,
      );
    }

    return {
      buffer: file.buffer,
      contentType,
      fileSize,
      originalFileName: sanitizeOriginalFileName(file.originalname),
      sortOrder: index + 1,
    };
  });
}

function parseNumericIdList(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((item) => Number(item))
      .filter((item) => Number.isInteger(item) && item > 0);
  }

  const trimmedValue = trimText(value);
  if (!trimmedValue) {
    return [];
  }

  try {
    const parsedJson = JSON.parse(trimmedValue);
    if (Array.isArray(parsedJson)) {
      return parsedJson
        .map((item) => Number(item))
        .filter((item) => Number.isInteger(item) && item > 0);
    }
  } catch {
    return trimmedValue
      .split(',')
      .map((item) => Number(item))
      .filter((item) => Number.isInteger(item) && item > 0);
  }

  return [];
}

async function cleanupStoredFiles(storedFileNames: string[]) {
  await Promise.allSettled(
    storedFileNames
      .map((storedFileName) => path.basename(trimText(storedFileName)))
      .filter(Boolean)
      .map((storedFileName) => unlink(path.join(TOOL_FEEDBACK_UPLOAD_ROOT, storedFileName))),
  );
}

async function cleanupPersistedImages(images: PersistedToolFeedbackImage[]) {
  await cleanupStoredFiles(images.map((image) => image.storedFileName));
}

async function persistFeedbackImages(files: ToolFeedbackUploadFile[]) {
  const normalizedFiles = normalizeUploadFiles(files);
  if (normalizedFiles.length === 0) {
    return [] as PersistedToolFeedbackImage[];
  }

  await mkdir(TOOL_FEEDBACK_UPLOAD_ROOT, { recursive: true });

  const persistedImages: PersistedToolFeedbackImage[] = [];
  try {
    for (const file of normalizedFiles) {
      const storedFileName = buildStoredFileName(file.originalFileName, file.contentType);
      await writeFile(path.join(TOOL_FEEDBACK_UPLOAD_ROOT, storedFileName), file.buffer);
      persistedImages.push({
        contentType: file.contentType,
        fileSize: file.fileSize,
        fileUrl: `/api/system/tool-feedback/files/${encodeURIComponent(storedFileName)}`,
        originalFileName: file.originalFileName,
        sortOrder: file.sortOrder,
        storedFileName,
      });
    }

    return persistedImages;
  } catch (error) {
    await cleanupPersistedImages(persistedImages);
    throw error;
  }
}

async function runExpiredRejectedSuggestionImageCleanup() {
  await ensureSuggestionTables();

  const pool = await getDirectoryDbPool();
  const expiredAttachments = await pool.request().query<Pick<ToolFeedbackAttachmentRecord, 'id' | 'storedfilename'>>(`
    select
      a.id,
      a.storedfilename
    from ${TOOL_FEEDBACK_ATTACHMENT_TABLE_NAME} a
    inner join ${TOOL_FEEDBACK_TABLE_NAME} s on s.id = a.suggestionid
    where s.status = '${STATUS_REJECTED}'
      and coalesce(s.reviewedat, s.updatedat, s.createdat) < dateadd(day, -${REJECTED_ATTACHMENT_RETENTION_DAYS}, sysutcdatetime())
  `);

  const attachmentIds = expiredAttachments.recordset
    .map((record) => Number(record.id))
    .filter((id) => Number.isInteger(id) && id > 0);

  if (attachmentIds.length === 0) {
    return 0;
  }

  await pool.request().query(`
    delete from ${TOOL_FEEDBACK_ATTACHMENT_TABLE_NAME}
    where id in (${attachmentIds.join(',')})
  `);

  await cleanupStoredFiles(expiredAttachments.recordset.map((record) => record.storedfilename));
  return attachmentIds.length;
}

export async function cleanupExpiredRejectedSuggestionImages() {
  if (!rejectedAttachmentCleanupPromise) {
    rejectedAttachmentCleanupPromise = runExpiredRejectedSuggestionImageCleanup().finally(() => {
      rejectedAttachmentCleanupPromise = null;
    });
  }

  return rejectedAttachmentCleanupPromise;
}

export async function getToolFeedbackWorkspace(
  currentUser: ToolFeedbackCurrentUser,
  options: ToolFeedbackServiceOptions = {},
) {
  await cleanupExpiredRejectedSuggestionImages();
  const employee = await requireEmployeeProfile(currentUser.employeeId);
  const canReview = isResearchDepartment(employee.departmentName);

  return {
    canReview,
    currentCompanyTitle: getVisibleCompanyValue(currentUser.companyTitle),
    currentDatasourceCode: isHiddenCompanyIdentifier(currentUser.datasourceCode) ? null : trimToNull(currentUser.datasourceCode),
    currentDepartmentId: employee.departmentId,
    currentDepartmentName: employee.departmentName,
    currentEmployeeId: employee.employeeId,
    currentEmployeeName: employee.employeeName,
    currentLoginAccount: employee.loginAccount,
    mySuggestions: await listMySuggestions(employee.employeeId, options),
    reviewSuggestions: canReview ? await listReviewSuggestions(options) : [],
  };
}

export async function createToolFeedbackSuggestion(
  currentUser: ToolFeedbackCurrentUser,
  input: {
    affectedPage?: unknown;
    content?: unknown;
    expectedResult?: unknown;
    title?: unknown;
  },
  files: ToolFeedbackUploadFile[] = [],
  options: ToolFeedbackServiceOptions = {},
) {
  const employee = await requireEmployeeProfile(currentUser.employeeId);
  const pool = await getDirectoryDbPool();
  const persistedImages = await persistFeedbackImages(files);
  const transaction = new mssql.Transaction(pool);
  let transactionBegun = false;

  try {
    await transaction.begin();
    transactionBegun = true;

    const insertSuggestionResult = await new mssql.Request(transaction)
      .input('status', mssql.NVarChar(20), STATUS_PENDING)
      .input('title', mssql.NVarChar(200), requireText(input.title, '请填写意见标题。'))
      .input('content', mssql.NVarChar(mssql.MAX), requireText(input.content, '请填写问题描述。'))
      .input('expectedresult', mssql.NVarChar(1000), trimToNull(input.expectedResult))
      .input('affectedpage', mssql.NVarChar(200), trimToNull(input.affectedPage))
      .input('datasourcecode', mssql.NVarChar(100), trimToNull(currentUser.datasourceCode))
      .input('companytitle', mssql.NVarChar(200), trimToNull(currentUser.companyTitle))
      .input('submitteremployeeid', mssql.BigInt, employee.employeeId)
      .input('submitterloginaccount', mssql.NVarChar(100), trimToNull(employee.loginAccount))
      .input('submitteremployeename', mssql.NVarChar(100), trimToNull(employee.employeeName))
      .input('submitterdepartmentid', mssql.Int, employee.departmentId)
      .input('submitterdepartmentname', mssql.NVarChar(100), trimToNull(employee.departmentName))
      .query<{ id: number }>(`
        insert into ${TOOL_FEEDBACK_TABLE_NAME} (
          status,
          title,
          content,
          expectedresult,
          affectedpage,
          datasourcecode,
          companytitle,
          submitteremployeeid,
          submitterloginaccount,
          submitteremployeename,
          submitterdepartmentid,
          submitterdepartmentname
        )
        output inserted.id as id
        values (
          @status,
          @title,
          @content,
          @expectedresult,
          @affectedpage,
          @datasourcecode,
          @companytitle,
          @submitteremployeeid,
          @submitterloginaccount,
          @submitteremployeename,
          @submitterdepartmentid,
          @submitterdepartmentname
        )
      `);

    const suggestionId = Number(insertSuggestionResult.recordset[0]?.id);
    if (!Number.isInteger(suggestionId) || suggestionId <= 0) {
      throw new ToolFeedbackRequestError('意见主记录创建失败，请稍后重试。', 500);
    }

    for (const image of persistedImages) {
      await new mssql.Request(transaction)
        .input('suggestionid', mssql.BigInt, suggestionId)
        .input('sortorder', mssql.Int, image.sortOrder)
        .input('originalfilename', mssql.NVarChar(260), image.originalFileName)
        .input('storedfilename', mssql.NVarChar(260), image.storedFileName)
        .input('contenttype', mssql.NVarChar(100), image.contentType)
        .input('filesize', mssql.BigInt, image.fileSize)
        .input('fileurl', mssql.NVarChar(500), image.fileUrl)
        .query(`
          insert into ${TOOL_FEEDBACK_ATTACHMENT_TABLE_NAME} (
            suggestionid,
            sortorder,
            originalfilename,
            storedfilename,
            contenttype,
            filesize,
            fileurl
          ) values (
            @suggestionid,
            @sortorder,
            @originalfilename,
            @storedfilename,
            @contenttype,
            @filesize,
            @fileurl
          )
        `);
    }

    await transaction.commit();
    return getToolFeedbackWorkspace(currentUser, options);
  } catch (error) {
    if (transactionBegun) {
      await transaction.rollback().catch(() => undefined);
    }
    await cleanupPersistedImages(persistedImages);
    throw error;
  }
}

export async function resubmitToolFeedbackSuggestion(
  currentUser: ToolFeedbackCurrentUser,
  suggestionId: number,
  input: {
    affectedPage?: unknown;
    content?: unknown;
    expectedResult?: unknown;
    retainedAttachmentIds?: unknown;
    title?: unknown;
  },
  files: ToolFeedbackUploadFile[] = [],
  options: ToolFeedbackServiceOptions = {},
) {
  const employee = await requireEmployeeProfile(currentUser.employeeId);
  await requireRejectedSuggestionForResubmit(suggestionId, employee.employeeId);

  const existingAttachments = await listAttachmentRecordsBySuggestionId(suggestionId);
  const hasRetainedAttachmentIdsField = Object.prototype.hasOwnProperty.call(input, 'retainedAttachmentIds');
  const retainedAttachmentIds = hasRetainedAttachmentIdsField
    ? parseNumericIdList(input.retainedAttachmentIds)
    : existingAttachments.map((attachment) => Number(attachment.id));
  const retainedAttachmentIdSet = new Set(retainedAttachmentIds);
  const invalidRetainedAttachmentIds = retainedAttachmentIds.filter(
    (attachmentId) => !existingAttachments.some((attachment) => Number(attachment.id) === attachmentId),
  );
  if (invalidRetainedAttachmentIds.length > 0) {
    throw new ToolFeedbackRequestError('存在无效的原截图，请刷新列表后重试。', 409);
  }

  const retainedAttachments = existingAttachments.filter((attachment) => retainedAttachmentIdSet.has(Number(attachment.id)));
  const removedAttachments = existingAttachments.filter((attachment) => !retainedAttachmentIdSet.has(Number(attachment.id)));
  if (retainedAttachments.length + files.length > TOOL_FEEDBACK_MAX_IMAGE_COUNT) {
    throw new ToolFeedbackRequestError(`最多只能保留和上传 ${TOOL_FEEDBACK_MAX_IMAGE_COUNT} 张图片。`, 400);
  }

  const persistedImages = await persistFeedbackImages(files);
  const pool = await getDirectoryDbPool();
  const transaction = new mssql.Transaction(pool);
  let transactionBegun = false;

  try {
    await transaction.begin();
    transactionBegun = true;

    await new mssql.Request(transaction)
      .input('id', mssql.BigInt, suggestionId)
      .input('status', mssql.NVarChar(20), STATUS_PENDING)
      .input('title', mssql.NVarChar(200), requireText(input.title, '请填写意见标题。'))
      .input('content', mssql.NVarChar(mssql.MAX), requireText(input.content, '请填写问题描述。'))
      .input('expectedresult', mssql.NVarChar(1000), trimToNull(input.expectedResult))
      .input('affectedpage', mssql.NVarChar(200), trimToNull(input.affectedPage))
      .input('datasourcecode', mssql.NVarChar(100), trimToNull(currentUser.datasourceCode))
      .input('companytitle', mssql.NVarChar(200), trimToNull(currentUser.companyTitle))
      .input('submitterloginaccount', mssql.NVarChar(100), trimToNull(employee.loginAccount))
      .input('submitteremployeename', mssql.NVarChar(100), trimToNull(employee.employeeName))
      .input('submitterdepartmentid', mssql.Int, employee.departmentId)
      .input('submitterdepartmentname', mssql.NVarChar(100), trimToNull(employee.departmentName))
      .query(`
        update ${TOOL_FEEDBACK_TABLE_NAME}
        set status = @status,
            title = @title,
            content = @content,
            expectedresult = @expectedresult,
            affectedpage = @affectedpage,
            datasourcecode = @datasourcecode,
            companytitle = @companytitle,
            submitterloginaccount = @submitterloginaccount,
            submitteremployeename = @submitteremployeename,
            submitterdepartmentid = @submitterdepartmentid,
            submitterdepartmentname = @submitterdepartmentname,
            revieweremployeeid = null,
            reviewerloginaccount = null,
            revieweremployeename = null,
            reviewerdepartmentid = null,
            reviewerdepartmentname = null,
            decisionremark = null,
            reviewedat = null,
            updatedat = sysutcdatetime()
        where id = @id
      `);

    if (removedAttachments.length > 0) {
      const removedAttachmentIds = removedAttachments
        .map((attachment) => Number(attachment.id))
        .filter((id) => Number.isInteger(id) && id > 0);

      await new mssql.Request(transaction).query(`
        delete from ${TOOL_FEEDBACK_ATTACHMENT_TABLE_NAME}
        where id in (${removedAttachmentIds.join(',')})
      `);
    }

    for (const [index, attachment] of retainedAttachments.entries()) {
      await new mssql.Request(transaction)
        .input('id', mssql.BigInt, attachment.id)
        .input('sortorder', mssql.Int, index + 1)
        .query(`
          update ${TOOL_FEEDBACK_ATTACHMENT_TABLE_NAME}
          set sortorder = @sortorder
          where id = @id
        `);
    }

    for (const [index, image] of persistedImages.entries()) {
      await new mssql.Request(transaction)
        .input('suggestionid', mssql.BigInt, suggestionId)
        .input('sortorder', mssql.Int, retainedAttachments.length + index + 1)
        .input('originalfilename', mssql.NVarChar(260), image.originalFileName)
        .input('storedfilename', mssql.NVarChar(260), image.storedFileName)
        .input('contenttype', mssql.NVarChar(100), image.contentType)
        .input('filesize', mssql.BigInt, image.fileSize)
        .input('fileurl', mssql.NVarChar(500), image.fileUrl)
        .query(`
          insert into ${TOOL_FEEDBACK_ATTACHMENT_TABLE_NAME} (
            suggestionid,
            sortorder,
            originalfilename,
            storedfilename,
            contenttype,
            filesize,
            fileurl
          ) values (
            @suggestionid,
            @sortorder,
            @originalfilename,
            @storedfilename,
            @contenttype,
            @filesize,
            @fileurl
          )
        `);
    }

    await transaction.commit();
    await cleanupStoredFiles(removedAttachments.map((attachment) => attachment.storedfilename)).catch(() => undefined);
    return getToolFeedbackWorkspace(currentUser, options);
  } catch (error) {
    if (transactionBegun) {
      await transaction.rollback().catch(() => undefined);
    }

    await cleanupPersistedImages(persistedImages);
    throw error;
  }
}

export async function decideToolFeedbackSuggestion(
  currentUser: ToolFeedbackCurrentUser,
  suggestionId: number,
  input: {
    decision?: unknown;
    remark?: unknown;
  },
  options: ToolFeedbackServiceOptions = {},
) {
  const reviewer = await requireEmployeeProfile(currentUser.employeeId);
  if (!isResearchDepartment(reviewer.departmentName)) {
    throw new ToolFeedbackRequestError('仅研发部门员工可以处理意见上报。', 403);
  }

  const nextStatus = normalizeDecision(input.decision);
  const currentSuggestion = nextStatus === STATUS_COMPLETED
    ? await requireApprovedSuggestion(suggestionId)
    : await requirePendingSuggestion(suggestionId);
  const nextDecisionRemark = nextStatus === STATUS_COMPLETED
    ? trimToNull(input.remark) ?? trimToNull(currentSuggestion.decisionremark)
    : trimToNull(input.remark);

  const pool = await getDirectoryDbPool();
  await pool.request()
    .input('id', mssql.BigInt, suggestionId)
    .input('status', mssql.NVarChar(20), nextStatus)
    .input('revieweremployeeid', mssql.BigInt, reviewer.employeeId)
    .input('reviewerloginaccount', mssql.NVarChar(100), trimToNull(reviewer.loginAccount))
    .input('revieweremployeename', mssql.NVarChar(100), trimToNull(reviewer.employeeName))
    .input('reviewerdepartmentid', mssql.Int, reviewer.departmentId)
    .input('reviewerdepartmentname', mssql.NVarChar(100), trimToNull(reviewer.departmentName))
    .input('decisionremark', mssql.NVarChar(500), nextDecisionRemark)
    .query(`
      update ${TOOL_FEEDBACK_TABLE_NAME}
      set status = @status,
          revieweremployeeid = @revieweremployeeid,
          reviewerloginaccount = @reviewerloginaccount,
          revieweremployeename = @revieweremployeename,
          reviewerdepartmentid = @reviewerdepartmentid,
          reviewerdepartmentname = @reviewerdepartmentname,
          decisionremark = @decisionremark,
          reviewedat = sysutcdatetime(),
          updatedat = sysutcdatetime()
      where id = @id
    `);

  return getToolFeedbackWorkspace(currentUser, options);
}

export async function getToolFeedbackAttachmentFile(storedFileName: string) {
  await ensureSuggestionTables();

  const normalizedFileName = path.basename(trimText(storedFileName));
  if (!normalizedFileName || normalizedFileName !== trimText(storedFileName)) {
    throw new ToolFeedbackRequestError('图片地址不正确。', 400);
  }

  const pool = await getDirectoryDbPool();
  const result = await pool.request()
    .input('storedfilename', mssql.NVarChar(260), normalizedFileName)
    .query<ToolFeedbackAttachmentRecord>(`
      select top (1)
        id,
        suggestionid,
        sortorder,
        originalfilename,
        storedfilename,
        contenttype,
        filesize,
        fileurl,
        createdat
      from ${TOOL_FEEDBACK_ATTACHMENT_TABLE_NAME}
      where storedfilename = @storedfilename
      order by id desc
    `);

  const attachment = result.recordset[0];
  if (!attachment) {
    throw new ToolFeedbackRequestError('未找到对应的图片。', 404);
  }

  const absolutePath = path.join(TOOL_FEEDBACK_UPLOAD_ROOT, attachment.storedfilename);
  await access(absolutePath).catch(() => {
    throw new ToolFeedbackRequestError('图片文件不存在，请重新上传。', 404);
  });

  return {
    absolutePath,
    contentType: trimToNull(attachment.contenttype),
    originalFileName: attachment.originalfilename,
  };
}
