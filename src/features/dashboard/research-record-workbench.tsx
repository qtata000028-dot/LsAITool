import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  fetchSingleTableModuleConfig,
  fetchSingleTableModuleDetails,
  fetchSingleTableModuleFields,
} from '../../lib/backend-module-config';
import {
  applyLineColor,
  buildMultilineDisplayLines,
  buildUniformLineColorMap,
  getLineIndexFromSelection,
  getLineTextByIndex,
  normalizeLineColorMap,
  normalizeMultilineValue,
  type ResearchLineColorMap,
  type ResearchLineColorTone,
} from './research-record-multiline';
import { ResearchRecordWordEditor } from './research-record-word-editor';
import { ResearchRecordWordTemplatePreview } from './research-record-word-template-preview';
import { getResearchRecordWordEditorRuntime } from './research-record-word-template-config';

type ResearchRecordScope = '全员' | '部门' | '单独';
type ResearchStepId = 'overview' | 'environment' | 'contents' | 'output';

export type ResearchWorkbenchModuleOption = {
  id: string;
  menuId: number | null;
  moduleCode: string;
  moduleName: string;
  moduleType: string;
};

type ResearchContentMaster = {
  objective: string;
  processOwner: string;
  summary: string;
  title: string;
};

type ResearchContentMultilineFieldKey = 'formsProvided' | 'workDescription' | 'painPoints' | 'suggestions';
type ResearchDraftMultilineFieldKey = 'departmentPosts' | 'workTools' | 'overallPainPoints' | 'specialDiscussion' | 'extraNotes';

type ResearchContentLineColors = Partial<Record<ResearchContentMultilineFieldKey, ResearchLineColorMap>>;
type ResearchDraftLineColors = Partial<Record<ResearchDraftMultilineFieldKey, ResearchLineColorMap>>;

type ResearchContentItem = {
  businessTheme: string;
  capturedDetailNames: string[];
  capturedFieldNames: string[];
  formsProvided: string;
  id: string;
  jobRole: string;
  lineColors: ResearchContentLineColors;
  linkedModuleCode: string;
  linkedModuleName: string;
  linkedModuleQuerySql: string;
  linkedModuleTable: string;
  painPoints: string;
  sceneName: string;
  suggestions: string;
  timeShare: string;
  workDescription: string;
};

type ResearchRecordDraft = {
  companyName: string;
  contentItems: ResearchContentItem[];
  contentMaster: ResearchContentMaster;
  departmentName: string;
  departmentPosts: string;
  documentNo: string;
  engineers: string;
  extraNotes: string;
  lineColors: ResearchDraftLineColors;
  overallPainPoints: string;
  projectName: string;
  respondents: string;
  signer: string;
  signerDate: string;
  specialDiscussion: string;
  surveyCount: string;
  surveyDate: string;
  surveyLocation: string;
  surveyScope: ResearchRecordScope;
  workTools: string;
};

type ResearchRecordWorkbenchProps = {
  activeFirstLevelMenuName: string;
  activeSubsystemName: string;
  availableModules: ResearchWorkbenchModuleOption[];
  currentUserName: string;
  onExit: () => void;
  onShowToast?: (message: string) => void;
  storageKey: string;
};

type CapturedModuleSnapshot = {
  detailNames: string[];
  fieldNames: string[];
  moduleName: string;
  querySql: string;
  tableName: string;
};

type ResearchContentQuickTarget =
  | 'businessTheme'
  | 'sceneName'
  | 'jobRole'
  | 'timeShare'
  | 'formsProvided'
  | 'workDescription'
  | 'painPoints'
  | 'suggestions';

type ResearchContentEditorConfig = {
  key: Exclude<ResearchContentQuickTarget, 'businessTheme' | 'sceneName' | 'jobRole' | 'timeShare'>;
  kind: 'textarea';
  label: string;
  placeholder: string;
  value: string;
};

type ActiveMultilineFieldState =
  | {
      field: ResearchContentMultilineFieldKey;
      lineColors: ResearchLineColorMap;
      scope: 'content';
      value: string;
    }
  | {
      field: ResearchDraftMultilineFieldKey;
      lineColors: ResearchLineColorMap;
      scope: 'draft';
      value: string;
    };

type ResearchOverviewQuickTarget =
  | 'companyName'
  | 'projectName'
  | 'surveyDate'
  | 'surveyLocation'
  | 'documentNo'
  | 'departmentName'
  | 'surveyCount'
  | 'surveyScope'
  | 'respondents'
  | 'engineers';

type ResearchEnvironmentQuickTarget = 'departmentPosts' | 'workTools';

type ResearchOutputQuickTarget = 'overallPainPoints' | 'specialDiscussion' | 'extraNotes' | 'signer' | 'signerDate';

type QuickActionTone = 'sky' | 'emerald' | 'amber' | 'violet' | 'rose';

const STEP_ITEMS: Array<{ desc: string; id: ResearchStepId; numericId: number; title: string }> = [
  { id: 'overview', numericId: 1, title: '一、调研信息', desc: '访谈基础信息与参与角色' },
  { id: 'environment', numericId: 2, title: '二、部门情况', desc: '岗位构成与现场工作工具' },
  { id: 'contents', numericId: 3, title: '三、调研内容', desc: '主从结构维护业务明细' },
  { id: 'output', numericId: 4, title: '四、输出确认', desc: '沉淀结论并导出成稿' },
];

const DEPARTMENT_POST_PRESETS = ['资料岗位', '返聘岗位', '检测岗位', '质检人员', '班组长', '部门主管'];
const WORK_TOOL_PRESETS = ['金蝶云星空', 'EXCEL 线下表格', 'OA 办公系统', '纸质检验单', '微信群沟通', '手工台账'];
const PAIN_POINT_PRESETS = ['线下表单重复录入', '异常闭环依赖人工跟踪', '主数据口径不统一', '统计分析滞后', '审批链条不透明'];
const SUGGESTION_PRESETS = ['统一主数据口径', '沉淀异常闭环规则', '打通主表与明细追溯', '补齐过程预警与统计看板', '标准化单据填报入口'];
const TIME_SHARE_PRESETS = ['5%', '10%', '15%', '20%', '30%', '50%'];
const QUICK_ACTION_TONE_STYLES: Record<QuickActionTone, { button: string; dot: string; tabActive: string; tabIdle: string }> = {
  sky: {
    button: 'border-sky-200 bg-sky-50 text-sky-700 hover:border-sky-300 hover:bg-sky-100',
    dot: 'bg-sky-500',
    tabActive: 'border-sky-200 bg-sky-50 text-sky-700 shadow-[0_8px_18px_-14px_rgba(14,165,233,0.65)]',
    tabIdle: 'border-slate-200 bg-white text-slate-500 hover:border-sky-200 hover:bg-sky-50/70 hover:text-sky-700',
  },
  emerald: {
    button: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100',
    dot: 'bg-emerald-500',
    tabActive: 'border-emerald-200 bg-emerald-50 text-emerald-700 shadow-[0_8px_18px_-14px_rgba(16,185,129,0.65)]',
    tabIdle: 'border-slate-200 bg-white text-slate-500 hover:border-emerald-200 hover:bg-emerald-50/70 hover:text-emerald-700',
  },
  amber: {
    button: 'border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-300 hover:bg-amber-100',
    dot: 'bg-amber-500',
    tabActive: 'border-amber-200 bg-amber-50 text-amber-700 shadow-[0_8px_18px_-14px_rgba(245,158,11,0.65)]',
    tabIdle: 'border-slate-200 bg-white text-slate-500 hover:border-amber-200 hover:bg-amber-50/70 hover:text-amber-700',
  },
  violet: {
    button: 'border-violet-200 bg-violet-50 text-violet-700 hover:border-violet-300 hover:bg-violet-100',
    dot: 'bg-violet-500',
    tabActive: 'border-violet-200 bg-violet-50 text-violet-700 shadow-[0_8px_18px_-14px_rgba(139,92,246,0.65)]',
    tabIdle: 'border-slate-200 bg-white text-slate-500 hover:border-violet-200 hover:bg-violet-50/70 hover:text-violet-700',
  },
  rose: {
    button: 'border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:bg-rose-100',
    dot: 'bg-rose-500',
    tabActive: 'border-rose-200 bg-rose-50 text-rose-700 shadow-[0_8px_18px_-14px_rgba(244,63,94,0.6)]',
    tabIdle: 'border-slate-200 bg-white text-slate-500 hover:border-rose-200 hover:bg-rose-50/70 hover:text-rose-700',
  },
};
const CONTENT_QUICK_TARGET_META: Record<ResearchContentQuickTarget, { label: string; tone: QuickActionTone }> = {
  businessTheme: { label: '明细名', tone: 'amber' },
  sceneName: { label: '子标题', tone: 'violet' },
  jobRole: { label: '岗位', tone: 'emerald' },
  timeShare: { label: '工时', tone: 'sky' },
  formsProvided: { label: '资料', tone: 'sky' },
  workDescription: { label: '做法', tone: 'violet' },
  painPoints: { label: '痛点', tone: 'rose' },
  suggestions: { label: '建议', tone: 'amber' },
};
const CONTENT_QUICK_TARGET_ORDER: ResearchContentQuickTarget[] = [
  'businessTheme',
  'sceneName',
  'jobRole',
  'timeShare',
  'formsProvided',
  'workDescription',
  'painPoints',
  'suggestions',
];
const OVERVIEW_QUICK_TARGET_META: Record<ResearchOverviewQuickTarget, { label: string; tone: QuickActionTone }> = {
  companyName: { label: '公司', tone: 'amber' },
  projectName: { label: '项目', tone: 'violet' },
  surveyDate: { label: '时间', tone: 'sky' },
  surveyLocation: { label: '地点', tone: 'sky' },
  documentNo: { label: '文件号', tone: 'sky' },
  departmentName: { label: '部门', tone: 'emerald' },
  surveyCount: { label: '次数', tone: 'amber' },
  surveyScope: { label: '范围', tone: 'sky' },
  respondents: { label: '受访人', tone: 'violet' },
  engineers: { label: '工程师', tone: 'emerald' },
};
const OVERVIEW_QUICK_TARGET_ORDER: ResearchOverviewQuickTarget[] = [
  'companyName',
  'projectName',
  'surveyDate',
  'surveyLocation',
  'documentNo',
  'departmentName',
  'surveyCount',
  'surveyScope',
  'respondents',
  'engineers',
];
const ENVIRONMENT_QUICK_TARGET_META: Record<ResearchEnvironmentQuickTarget, { label: string; tone: QuickActionTone }> = {
  departmentPosts: { label: '岗位', tone: 'emerald' },
  workTools: { label: '工具', tone: 'sky' },
};
const ENVIRONMENT_QUICK_TARGET_ORDER: ResearchEnvironmentQuickTarget[] = ['departmentPosts', 'workTools'];
const OUTPUT_QUICK_TARGET_META: Record<ResearchOutputQuickTarget, { label: string; tone: QuickActionTone }> = {
  overallPainPoints: { label: '整体痛点', tone: 'rose' },
  specialDiscussion: { label: '专项讨论', tone: 'amber' },
  extraNotes: { label: '补充', tone: 'violet' },
  signer: { label: '签字人', tone: 'emerald' },
  signerDate: { label: '日期', tone: 'sky' },
};
const OUTPUT_QUICK_TARGET_ORDER: ResearchOutputQuickTarget[] = [
  'overallPainPoints',
  'specialDiscussion',
  'extraNotes',
  'signer',
  'signerDate',
];
const SURVEY_LOCATION_PRESETS = ['东方水利会议室', '部门办公室', '生产现场', '线上会议'];
const EXTRA_NOTES_PRESETS = ['待补充资料', '需二次确认', '已现场确认', '后续复盘记录'];

function toText(value: unknown) {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return '';
  return String(value);
}

function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

function getRecordText(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(record, key)) {
      const text = toText(record[key]).trim();
      if (text) return text;
    }
  }
  return '';
}

function escapeHtml(input: string) {
  return input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderValue(value: string, fallback = '未填写') {
  return value.trim() || fallback;
}

function normalizeWorkspaceLabel(value: string) {
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith('未选择')) {
    return '';
  }
  return trimmed;
}

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function buildSurveyDocumentNo(value: string) {
  const normalized = value.trim() || getTodayDate();
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return 'DFSL-RG-20260106';
  }
  const [, year, month, day] = match;
  return `DFSL-RG-${year}${month}${day}`;
}

function createResearchContentMaster(defaultTitle: string): ResearchContentMaster {
  return {
    objective: '',
    processOwner: '',
    summary: '',
    title: defaultTitle,
  };
}

function createResearchContentItem(index: number): ResearchContentItem {
  return {
    businessTheme: '',
    capturedDetailNames: [],
    capturedFieldNames: [],
    formsProvided: '',
    id: `research-content-${Date.now()}-${index}`,
    jobRole: '',
    lineColors: {},
    linkedModuleCode: '',
    linkedModuleName: '',
    linkedModuleQuerySql: '',
    linkedModuleTable: '',
    painPoints: '',
    sceneName: '',
    suggestions: '',
    timeShare: '',
    workDescription: '',
  };
}

function getContentItemSceneLabel(item: ResearchContentItem) {
  return item.sceneName.trim() || item.capturedDetailNames[0]?.trim() || '';
}

function getContentItemDisplayName(item: ResearchContentItem, index: number) {
  return item.businessTheme.trim() || getContentItemSceneLabel(item) || `明细 ${index + 1}`;
}

function getContentItemSubheading(item: ResearchContentItem) {
  const sceneName = getContentItemSceneLabel(item);
  const businessTheme = item.businessTheme.trim();
  if (!sceneName || !businessTheme || sceneName === businessTheme || businessTheme.includes(sceneName)) {
    return '';
  }
  return sceneName;
}

function getContentItemFilledCount(item: ResearchContentItem) {
  return [
    item.formsProvided,
    item.workDescription,
    item.painPoints,
    item.suggestions,
  ].filter((value) => value.trim()).length;
}

function isContentItemReady(item: ResearchContentItem) {
  return Boolean(item.businessTheme.trim() && getContentItemSceneLabel(item) && getContentItemFilledCount(item) >= 3);
}

function getContentItemStatusText(item: ResearchContentItem) {
  const baseLabel = item.linkedModuleCode ? '已关联模块' : '手工明细';
  const filledCount = getContentItemFilledCount(item);
  return filledCount > 0 ? `${baseLabel} · ${filledCount}/4 项事项` : baseLabel;
}

function buildDefaultDraft(input: {
  activeFirstLevelMenuName: string;
  activeSubsystemName: string;
  currentUserName: string;
}): ResearchRecordDraft {
  const firstLevelMenuName = normalizeWorkspaceLabel(input.activeFirstLevelMenuName);
  const subsystemName = normalizeWorkspaceLabel(input.activeSubsystemName);

  return {
    companyName: '',
    contentItems: [createResearchContentItem(1)],
    contentMaster: createResearchContentMaster(firstLevelMenuName || '主业务主题'),
    departmentName: firstLevelMenuName || '',
    departmentPosts: '',
    documentNo: '',
    engineers: input.currentUserName || '',
    extraNotes: '',
    lineColors: {},
    overallPainPoints: '',
    projectName: subsystemName ? `${subsystemName}数字一体化平台项目` : '',
    respondents: '',
    signer: '',
    signerDate: getTodayDate(),
    specialDiscussion: '',
    surveyCount: '1',
    surveyDate: getTodayDate(),
    surveyLocation: '',
    surveyScope: '部门',
    workTools: '',
  };
}

function normalizeContentLineColors(raw: unknown): ResearchContentLineColors {
  if (!raw || typeof raw !== 'object') {
    return {};
  }

  const record = raw as Partial<Record<ResearchContentMultilineFieldKey, unknown>>;
  return {
    formsProvided: normalizeLineColorMap(record.formsProvided),
    painPoints: normalizeLineColorMap(record.painPoints),
    suggestions: normalizeLineColorMap(record.suggestions),
    workDescription: normalizeLineColorMap(record.workDescription),
  };
}

function normalizeDraftLineColors(raw: unknown): ResearchDraftLineColors {
  if (!raw || typeof raw !== 'object') {
    return {};
  }

  const record = raw as Partial<Record<ResearchDraftMultilineFieldKey, unknown>>;
  return {
    departmentPosts: normalizeLineColorMap(record.departmentPosts),
    extraNotes: normalizeLineColorMap(record.extraNotes),
    overallPainPoints: normalizeLineColorMap(record.overallPainPoints),
    specialDiscussion: normalizeLineColorMap(record.specialDiscussion),
    workTools: normalizeLineColorMap(record.workTools),
  };
}

function normalizeContentMaster(raw: unknown, fallback: ResearchContentMaster): ResearchContentMaster {
  if (!raw || typeof raw !== 'object') {
    return fallback;
  }

  const record = raw as Partial<ResearchContentMaster>;
  return {
    objective: toText(record.objective),
    processOwner: toText(record.processOwner),
    summary: toText(record.summary),
    title: toText(record.title) || fallback.title,
  };
}

function normalizeContentItem(raw: unknown, index: number): ResearchContentItem {
  const fallback = createResearchContentItem(index + 1);
  if (!raw || typeof raw !== 'object') {
    return fallback;
  }

  const record = raw as Partial<ResearchContentItem>;
  return {
    businessTheme: toText(record.businessTheme),
    capturedDetailNames: Array.isArray(record.capturedDetailNames) ? record.capturedDetailNames.map((item) => toText(item)).filter(Boolean) : [],
    capturedFieldNames: Array.isArray(record.capturedFieldNames) ? record.capturedFieldNames.map((item) => toText(item)).filter(Boolean) : [],
    formsProvided: normalizeMultilineValue(toText(record.formsProvided)),
    id: toText(record.id) || fallback.id,
    jobRole: toText(record.jobRole),
    lineColors: normalizeContentLineColors(record.lineColors),
    linkedModuleCode: toText(record.linkedModuleCode),
    linkedModuleName: toText(record.linkedModuleName),
    linkedModuleQuerySql: toText(record.linkedModuleQuerySql),
    linkedModuleTable: toText(record.linkedModuleTable),
    painPoints: normalizeMultilineValue(toText(record.painPoints)),
    sceneName: toText(record.sceneName),
    suggestions: normalizeMultilineValue(toText(record.suggestions)),
    timeShare: toText(record.timeShare),
    workDescription: normalizeMultilineValue(toText(record.workDescription)),
  };
}

function normalizeDraft(raw: unknown, fallback: ResearchRecordDraft): ResearchRecordDraft {
  if (!raw || typeof raw !== 'object') {
    return fallback;
  }

  const record = raw as Partial<ResearchRecordDraft>;
  const contentItems = Array.isArray(record.contentItems)
    ? record.contentItems.map((item, index) => normalizeContentItem(item, index))
    : fallback.contentItems;

  return {
    ...fallback,
    ...record,
    departmentPosts: normalizeMultilineValue(toText(record.departmentPosts), /[；;\n]+/) || fallback.departmentPosts,
    departmentName: normalizeWorkspaceLabel(toText(record.departmentName)) || fallback.departmentName,
    contentItems: Array.isArray(record.contentItems) ? contentItems : fallback.contentItems,
    contentMaster: normalizeContentMaster(record.contentMaster, fallback.contentMaster),
    extraNotes: normalizeMultilineValue(toText(record.extraNotes)),
    lineColors: normalizeDraftLineColors(record.lineColors),
    overallPainPoints: normalizeMultilineValue(toText(record.overallPainPoints)),
    projectName: normalizeWorkspaceLabel(toText(record.projectName)) || fallback.projectName,
    specialDiscussion: normalizeMultilineValue(toText(record.specialDiscussion)),
    surveyScope: record.surveyScope === '全员' || record.surveyScope === '单独' ? record.surveyScope : '部门',
    workTools: normalizeMultilineValue(toText(record.workTools), /[、,，\n]+/) || fallback.workTools,
  };
}

function buildCapturedWorkDescription(snapshot: CapturedModuleSnapshot) {
  const lines = [
    `关联模块：${snapshot.moduleName || '未命名模块'}`,
    snapshot.tableName ? `主表：${snapshot.tableName}` : '',
    `字段数量：${snapshot.fieldNames.length}`,
    snapshot.detailNames.length > 0 ? `明细：${snapshot.detailNames.join('、')}` : '明细：无',
    snapshot.querySql ? '主 SQL：已配置' : '主 SQL：未配置',
  ].filter(Boolean);

  return lines.join('\n');
}

function buildCapturedWorkDescriptionFromItem(item: ResearchContentItem) {
  const lines = [
    item.linkedModuleName ? `关联模块：${item.linkedModuleName}` : '',
    item.linkedModuleTable ? `主表：${item.linkedModuleTable}` : '',
    item.capturedFieldNames.length > 0 ? `字段数量：${item.capturedFieldNames.length}` : '',
    item.capturedDetailNames.length > 0 ? `明细：${item.capturedDetailNames.join('、')}` : '',
    item.linkedModuleQuerySql ? '主 SQL：已配置' : '',
  ].filter(Boolean);

  return lines.join('\n');
}

function buildCapturedFormsProvided(snapshot: CapturedModuleSnapshot) {
  const lines = snapshot.fieldNames.slice(0, 10);
  return lines.join('\n');
}

function buildResearchRecordHtmlDocument(draft: ResearchRecordDraft) {
  const renderNumberedLinesHtml = (value: string, lineColors: ResearchLineColorMap = {}) => {
    const lines = buildMultilineDisplayLines(value, lineColors);
    if (lines.length === 0) {
      return '<div class="muted">未填写</div>';
    }
    return `
      <div class="line-stack">
        ${lines.map((line) => `<div class="line-item${line.color === 'red' ? ' line-item-red' : ''}">${escapeHtml(line.numberedText)}</div>`).join('')}
      </div>
    `;
  };

  const contentItemsHtml = draft.contentItems.map((item, index) => {
    return `
      <section class="content-card">
        <div class="content-head">
          <h3>${index + 1}. ${escapeHtml(getContentItemDisplayName(item, index))}</h3>
          ${getContentItemSubheading(item) ? `<div class="content-subhead">${escapeHtml(getContentItemSubheading(item))}</div>` : ''}
        </div>
        <div class="meta-grid">
          <div><span>工作岗位</span><strong>${escapeHtml(renderValue(item.jobRole))}</strong></div>
          <div><span>工时占比</span><strong>${escapeHtml(renderValue(item.timeShare))}</strong></div>
        </div>
        <div class="field-block">
          <span>表单提供</span>
          ${renderNumberedLinesHtml(item.formsProvided, item.lineColors.formsProvided)}
        </div>
        <div class="field-block">
          <span>工作描述</span>
          ${renderNumberedLinesHtml(item.workDescription, item.lineColors.workDescription)}
        </div>
        <div class="field-block">
          <span>痛点说明</span>
          ${renderNumberedLinesHtml(item.painPoints, item.lineColors.painPoints)}
        </div>
        <div class="field-block">
          <span>朗速建议</span>
          ${renderNumberedLinesHtml(item.suggestions, item.lineColors.suggestions)}
        </div>
      </section>
    `;
  }).join('');

  return `
    <!doctype html>
    <html lang="zh-CN">
      <head>
        <meta charset="UTF-8" />
        <title>${escapeHtml(renderValue(draft.departmentName, '调研记录'))}</title>
        <style>
          :root {
            color-scheme: light;
            font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
          }
          body {
            margin: 0;
            background: #f3f6fb;
            color: #0f172a;
            padding: 36px;
          }
          .page {
            max-width: 980px;
            margin: 0 auto;
            background: #ffffff;
            border: 1px solid #dbe5f1;
            border-radius: 28px;
            overflow: hidden;
            box-shadow: 0 32px 70px -48px rgba(15, 23, 42, 0.34);
          }
          .hero {
            padding: 36px 42px 30px;
            background: linear-gradient(135deg, #0f172a 0%, #1d4ed8 68%, #eff6ff 180%);
            color: white;
          }
          .hero h1 {
            margin: 0;
            font-size: 30px;
            line-height: 1.15;
          }
          .hero p {
            margin: 10px 0 0;
            color: rgba(255,255,255,0.82);
            font-size: 15px;
          }
          .body {
            padding: 34px 42px 42px;
          }
          .section {
            margin-top: 28px;
          }
          .section:first-child {
            margin-top: 0;
          }
          .section h2 {
            margin: 0 0 14px;
            font-size: 18px;
          }
          .meta-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
          }
          .meta-grid.compact {
            margin-top: 14px;
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }
          .meta-grid div, .field-block, .master-block {
            border: 1px solid #dbe5f1;
            border-radius: 18px;
            padding: 14px 16px;
            background: #f8fbff;
          }
          .meta-grid span, .field-block span, .master-block span {
            display: block;
            color: #64748b;
            font-size: 12px;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            margin-bottom: 6px;
          }
          .content-card {
            border: 1px solid #dbe5f1;
            border-radius: 20px;
            padding: 20px;
            background: #ffffff;
            margin-bottom: 16px;
          }
          .content-head {
            margin-bottom: 16px;
          }
          .content-card h3 {
            margin: 0;
            font-size: 16px;
          }
          .content-subhead {
            margin-top: 6px;
            color: #475569;
            font-size: 14px;
            font-weight: 600;
          }
          .field-block p, .master-block p {
            margin: 0;
            white-space: pre-wrap;
            line-height: 1.7;
          }
          .line-stack {
            display: grid;
            gap: 4px;
          }
          .line-item {
            line-height: 1.7;
            white-space: pre-wrap;
          }
          .line-item-red {
            color: #8f1d2c;
          }
          .master-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
          }
          .muted {
            color: #94a3b8;
          }
          .signature {
            display: flex;
            justify-content: space-between;
            gap: 24px;
          }
        </style>
      </head>
      <body>
        <main class="page">
          <section class="hero">
            <h1>${escapeHtml(renderValue(draft.companyName, '未填写公司名称'))}</h1>
            <p>${escapeHtml(renderValue(draft.projectName, '未填写项目名称'))}</p>
          </section>
          <section class="body">
            <section class="section">
              <h2>一、调研信息</h2>
              <div class="meta-grid">
                <div><span>调研时间</span><strong>${escapeHtml(renderValue(draft.surveyDate))}</strong></div>
                <div><span>调研地点</span><strong>${escapeHtml(renderValue(draft.surveyLocation))}</strong></div>
                <div><span>文件号</span><strong>${escapeHtml(renderValue(draft.documentNo))}</strong></div>
                <div><span>调研部门</span><strong>${escapeHtml(renderValue(draft.departmentName))}</strong></div>
                <div><span>调研范围</span><strong>${escapeHtml(renderValue(draft.surveyScope))}</strong></div>
                <div><span>调研次数</span><strong>${escapeHtml(renderValue(draft.surveyCount))}</strong></div>
                <div><span>受访人员</span><strong>${escapeHtml(renderValue(draft.respondents))}</strong></div>
                <div><span>调研工程师</span><strong>${escapeHtml(renderValue(draft.engineers))}</strong></div>
              </div>
            </section>

            <section class="section">
              <h2>二、部门情况</h2>
              <div class="field-block">
                <span>部门岗位</span>
                ${renderNumberedLinesHtml(draft.departmentPosts, draft.lineColors.departmentPosts)}
              </div>
              <div class="field-block" style="margin-top: 12px;">
                <span>工作工具</span>
                ${renderNumberedLinesHtml(draft.workTools, draft.lineColors.workTools)}
              </div>
            </section>

            <section class="section">
              <h2>三、调研内容</h2>
              <div>
                ${contentItemsHtml}
              </div>
            </section>

            <section class="section">
              <h2>四、整体痛点难点描述</h2>
              <div class="field-block">
                ${renderNumberedLinesHtml(draft.overallPainPoints, draft.lineColors.overallPainPoints)}
              </div>
            </section>

            <section class="section">
              <h2>五、业务专项事项讨论</h2>
              <div class="field-block">
                ${renderNumberedLinesHtml(draft.specialDiscussion, draft.lineColors.specialDiscussion)}
              </div>
            </section>

            <section class="section">
              <h2>六、其他补充</h2>
              <div class="field-block">
                ${renderNumberedLinesHtml(draft.extraNotes, draft.lineColors.extraNotes)}
              </div>
            </section>

            <section class="section signature">
              <div class="field-block" style="flex: 1;">
                <span>受访人（签字确认）</span>
                <p>${escapeHtml(renderValue(draft.signer))}</p>
              </div>
              <div class="field-block" style="flex: 1;">
                <span>确认日期</span>
                <p>${escapeHtml(renderValue(draft.signerDate))}</p>
              </div>
            </section>
          </section>
        </main>
      </body>
    </html>
  `;
}

function FieldShell({
  children,
  hint,
  label,
}: {
  children: React.ReactNode;
  hint?: string;
  label: string;
}) {
  return (
    <label className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[11px] font-semibold text-slate-500">{label}</div>
        {hint ? <div className="text-[11px] text-slate-400">{hint}</div> : null}
      </div>
      {children}
    </label>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-primary/30 focus:ring-2 focus:ring-primary/10 ${props.className || ''}`}
    />
  );
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`min-h-[96px] w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm leading-6 text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-primary/30 focus:ring-2 focus:ring-primary/10 ${props.className || ''}`}
    />
  );
}

function SelectInput(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition-all focus:border-primary/30 focus:ring-2 focus:ring-primary/10 ${props.className || ''}`}
    />
  );
}

function appendLineValue(current: string, nextValue: string) {
  const normalized = nextValue.trim();
  if (!normalized) {
    return current;
  }
  const lines = current
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
  if (lines.includes(normalized)) {
    return current;
  }
  return [...lines, normalized].join('\n');
}

function appendSentenceValue(current: string, nextValue: string) {
  const normalized = nextValue.trim();
  if (!normalized) {
    return current;
  }
  if (!current.trim()) {
    return normalized;
  }
  if (current.includes(normalized)) {
    return current;
  }
  return `${current.trim()}\n${normalized}`;
}

function appendDelimitedValue(current: string, nextValue: string, delimiter: string) {
  const normalized = nextValue.trim();
  if (!normalized) {
    return current;
  }
  const parts = current
    .split(delimiter)
    .map((item) => item.trim())
    .filter(Boolean);
  if (parts.includes(normalized)) {
    return current;
  }
  return [...parts, normalized].join(delimiter);
}

function toDelimitedParts(value: string, delimiter: RegExp) {
  return value
    .split(delimiter)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item, index, array) => array.indexOf(item) === index);
}

function QuickActionButton({
  label,
  onClick,
  tone = 'sky',
}: {
  label: string;
  onClick: () => void;
  tone?: QuickActionTone;
}) {
  const toneStyle = QUICK_ACTION_TONE_STYLES[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-all ${toneStyle.button}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${toneStyle.dot}`} />
      {label}
    </button>
  );
}

function FocusFieldCard({
  active,
  children,
  className,
  tone,
}: {
  active: boolean;
  children: React.ReactNode;
  className?: string;
  tone: QuickActionTone;
}) {
  const toneStyle = QUICK_ACTION_TONE_STYLES[tone];
  return (
    <div className={`rounded-[20px] border p-3.5 transition-all ${active ? toneStyle.tabActive : 'border-slate-200 bg-white shadow-[0_10px_24px_-20px_rgba(15,23,42,0.18)]'} ${className || ''}`}>
      {children}
    </div>
  );
}

function DynamicSuggestionPanel({
  actions,
  activeKey,
  emptyText,
  extra,
  onTabChange,
  subtitle,
  tabs,
  tone,
  title,
}: {
  actions: Array<{ key: string; label: string; onClick: () => void }>;
  activeKey: string;
  emptyText: string;
  extra?: React.ReactNode;
  onTabChange: (key: string) => void;
  subtitle: string;
  tabs: Array<{ key: string; label: string; tone: QuickActionTone }>;
  tone: QuickActionTone;
  title: string;
}) {
  const toneStyle = QUICK_ACTION_TONE_STYLES[tone];

  return (
    <div className="rounded-none border border-slate-200 bg-slate-100 p-2.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[12px] font-semibold text-slate-900">{title}</div>
          {subtitle ? <div className="mt-0.5 text-[11px] text-slate-400">{subtitle}</div> : null}
        </div>
        {extra}
      </div>

      <div className="mt-2.5 flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const tabTone = QUICK_ACTION_TONE_STYLES[tab.tone];
          const isActive = activeKey === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onTabChange(tab.key)}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-all ${
                isActive ? tabTone.tabActive : tabTone.tabIdle
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${tabTone.dot}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className={`mt-2.5 rounded-none border bg-white px-2.5 py-2.5 ${toneStyle.tabActive}`}>
        <div className="flex flex-wrap gap-2">
          {actions.length > 0 ? (
            actions.map((action) => (
              <React.Fragment key={action.key}>
                <QuickActionButton label={action.label} onClick={action.onClick} tone={tone} />
              </React.Fragment>
            ))
          ) : (
            <div className="w-full text-[12px] text-slate-400">{emptyText}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function LineColorToolbar({
  activeInputColor,
  isAreaAllRed,
  activeRawIndex,
  lines,
  onAreaToneChange,
  onInputToneChange,
}: {
  activeInputColor: ResearchLineColorTone;
  isAreaAllRed: boolean;
  activeRawIndex: number | null;
  lines: ReturnType<typeof buildMultilineDisplayLines>;
  onAreaToneChange: (color: ResearchLineColorTone) => void;
  onInputToneChange: (color: ResearchLineColorTone) => void;
}) {
  const activeLine = activeRawIndex === null ? null : lines.find((line) => line.rawIndex === activeRawIndex) ?? null;

  return (
    <div className="border border-slate-200 bg-white p-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-[11px] font-semibold text-slate-600">
            {activeLine
              ? `光标当前在第 ${activeLine.order} 条，后续输入按${activeInputColor === 'red' ? '深红' : '原色'}写入`
              : lines.length > 0
                ? '当前正在编辑空白行，后续输入会按当前颜色写入'
                : '先切换颜色再输入，编号会按换行自动生成'}
          </div>
          <div className="mt-0.5 text-[10px] text-slate-400">点击颜色后，当前行和后续输入会直接继承该颜色。</div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onInputToneChange('default')}
            className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all ${
              activeInputColor === 'default'
                ? 'border-slate-300 bg-slate-100 text-slate-900'
                : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-900'
            }`}
          >
            输入原色
          </button>
          <button
            type="button"
            onClick={() => onInputToneChange('red')}
            className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all ${
              activeInputColor === 'red'
                ? 'border-[#8f1d2c]/25 bg-[#8f1d2c]/10 text-[#8f1d2c]'
                : 'border-slate-200 bg-white text-slate-500 hover:border-[#8f1d2c]/25 hover:text-[#8f1d2c]'
            }`}
          >
            输入红色
          </button>
          <button
            type="button"
            onClick={() => onAreaToneChange(isAreaAllRed ? 'default' : 'red')}
            className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all ${
              isAreaAllRed
                ? 'border-slate-300 bg-slate-100 text-slate-900 hover:border-slate-400'
                : 'border-[#8f1d2c]/20 bg-white text-[#8f1d2c] hover:bg-[#8f1d2c]/5'
            }`}
          >
            {isAreaAllRed ? '整区原色' : '整区变红'}
          </button>
        </div>
      </div>
    </div>
  );
}

async function captureModuleSnapshot(moduleCode: string): Promise<CapturedModuleSnapshot> {
  const [config, fields, details] = await Promise.all([
    fetchSingleTableModuleConfig(moduleCode),
    fetchSingleTableModuleFields(moduleCode),
    fetchSingleTableModuleDetails(moduleCode),
  ]);

  const configRecord = (config ?? {}) as Record<string, unknown>;
  const moduleName = getRecordText(configRecord, 'moduleName', 'modulename', 'toolsName', 'toolsname', 'name', 'title');
  const tableName = getRecordText(configRecord, 'mainTable', 'maintable');
  const querySql = getRecordText(configRecord, 'querySql', 'querysql', 'sql');
  const fieldNames = Array.isArray(fields)
    ? fields.map((field, index) => {
        const record = (field ?? {}) as Record<string, unknown>;
        return getRecordText(
          record,
          'username1',
          'displayName',
          'displayname',
          'columnCaption',
          'columncaption',
          'fieldCaption',
          'fieldcaption',
          'systemname',
          'systemName',
          'fieldname',
          'fieldName',
          'name',
          'title',
        ) || `字段 ${index + 1}`;
      })
    : [];
  const detailNames = Array.isArray(details)
    ? details.map((detail, index) => {
        const record = (detail ?? {}) as Record<string, unknown>;
        return getRecordText(record, 'detailname', 'detailName', 'detailtable', 'detailTable', 'name', 'title') || `明细 ${index + 1}`;
      })
    : [];

  return {
    detailNames,
    fieldNames,
    moduleName,
    querySql,
    tableName,
  };
}

export function ResearchRecordWorkbench({
  activeFirstLevelMenuName,
  activeSubsystemName,
  availableModules,
  currentUserName,
  onExit,
  onShowToast,
  storageKey,
}: ResearchRecordWorkbenchProps) {
  const defaultDraft = useMemo(
    () => buildDefaultDraft({
      activeFirstLevelMenuName,
      activeSubsystemName,
      currentUserName,
    }),
    [activeFirstLevelMenuName, activeSubsystemName, currentUserName],
  );
  const [activeStep, setActiveStep] = useState<ResearchStepId>('overview');
  const [capturingItemId, setCapturingItemId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [draft, setDraft] = useState<ResearchRecordDraft>(defaultDraft);
  const [previewFocusKey, setPreviewFocusKey] = useState<string>('overview');
  const [selectedContentItemId, setSelectedContentItemId] = useState<string | null>(defaultDraft.contentItems[0]?.id ?? null);
  const [activeOverviewQuickTarget, setActiveOverviewQuickTarget] = useState<ResearchOverviewQuickTarget>('surveyDate');
  const [activeEnvironmentQuickTarget, setActiveEnvironmentQuickTarget] = useState<ResearchEnvironmentQuickTarget>('departmentPosts');
  const [activeOutputQuickTarget, setActiveOutputQuickTarget] = useState<ResearchOutputQuickTarget>('overallPainPoints');
  const [activeContentQuickTarget, setActiveContentQuickTarget] = useState<ResearchContentQuickTarget>('formsProvided');
  const [activeMultilineInputColor, setActiveMultilineInputColor] = useState<ResearchLineColorTone>('default');
  const [activeMultilineLineIndex, setActiveMultilineLineIndex] = useState<number | null>(0);
  const storageRecordKey = `ls-ai-research-record:${storageKey}`;
  const sortedModules = useMemo(
    () => [...availableModules].sort((left, right) => left.moduleName.localeCompare(right.moduleName, 'zh-Hans-CN')),
    [availableModules],
  );
  const wordEditorRuntime = useMemo(() => getResearchRecordWordEditorRuntime(), []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const raw = window.localStorage.getItem(storageRecordKey);
    if (!raw) {
      setDraft(defaultDraft);
      return;
    }

    try {
      setDraft(normalizeDraft(JSON.parse(raw), defaultDraft));
    } catch {
      setDraft(defaultDraft);
    }
  }, [defaultDraft, storageRecordKey]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(storageRecordKey, JSON.stringify(draft));
  }, [draft, storageRecordKey]);

  useEffect(() => {
    setSelectedContentItemId((current) => {
      if (current && draft.contentItems.some((item) => item.id === current)) {
        return current;
      }
      return draft.contentItems[0]?.id ?? null;
    });
  }, [draft.contentItems]);

  useEffect(() => {
    setActiveContentQuickTarget('formsProvided');
  }, [selectedContentItemId]);

  useEffect(() => {
    if (!statusMessage) {
      return;
    }
    const timer = window.setTimeout(() => setStatusMessage(null), 2200);
    return () => window.clearTimeout(timer);
  }, [statusMessage]);

  const scrollPreviewTo = useCallback((key: string, _behavior: ScrollBehavior = 'smooth') => {
    setPreviewFocusKey(key);
  }, []);

  const updateDraft = useCallback((patch: Partial<ResearchRecordDraft>) => {
    setDraft((current) => ({
      ...current,
      ...patch,
    }));
  }, []);

  const updateContentItem = useCallback((id: string, patch: Partial<ResearchContentItem>) => {
    setDraft((current) => ({
      ...current,
      contentItems: current.contentItems.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
  }, []);

  const updateDraftLineColors = useCallback((
    field: ResearchDraftMultilineFieldKey,
    updater: (current: ResearchLineColorMap) => ResearchLineColorMap,
  ) => {
    setDraft((current) => ({
      ...current,
      lineColors: {
        ...current.lineColors,
        [field]: updater(current.lineColors[field] ?? {}),
      },
    }));
  }, []);

  const updateContentItemLineColors = useCallback((
    id: string,
    field: ResearchContentMultilineFieldKey,
    updater: (current: ResearchLineColorMap) => ResearchLineColorMap,
  ) => {
    setDraft((current) => ({
      ...current,
      contentItems: current.contentItems.map((item) => {
        if (item.id !== id) {
          return item;
        }
        return {
          ...item,
          lineColors: {
            ...item.lineColors,
            [field]: updater(item.lineColors[field] ?? {}),
          },
        };
      }),
    }));
  }, []);

  const addContentItem = useCallback(() => {
    let nextItem: ResearchContentItem | null = null;
    setDraft((current) => {
      nextItem = createResearchContentItem(current.contentItems.length + 1);
      return {
        ...current,
        contentItems: [...current.contentItems, nextItem],
      };
    });
    if (nextItem) {
      setSelectedContentItemId(nextItem.id);
    }
    setActiveStep('contents');
  }, []);

  const removeContentItem = useCallback((id: string) => {
    const currentIndex = draft.contentItems.findIndex((item) => item.id === id);
    const fallbackTarget = currentIndex > 0
      ? draft.contentItems[currentIndex - 1]?.id ?? null
      : draft.contentItems[currentIndex + 1]?.id ?? null;
    setDraft((current) => {
      return {
        ...current,
        contentItems: current.contentItems.filter((item) => item.id !== id),
      };
    });
    if (selectedContentItemId === id) {
      setSelectedContentItemId(fallbackTarget);
    }
  }, [draft.contentItems, selectedContentItemId]);

  const handleExportSave = useCallback(() => {
    const html = buildResearchRecordHtmlDocument(draft);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    const fileName = `${(draft.departmentName || activeFirstLevelMenuName || '调研记录').replace(/\s+/g, '')}-调研记录.html`;

    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
    setStatusMessage('已导出 HTML');
  }, [activeFirstLevelMenuName, draft]);

  const syncActiveLineFromTextarea = useCallback((event: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const target = event.currentTarget;
    setActiveMultilineLineIndex(getLineIndexFromSelection(target.value, target.selectionStart ?? 0));
  }, []);

  const resolveMultilineInputState = useCallback((
    current: ResearchLineColorMap,
    nextValue: string,
    selectionStart: number | null,
  ) => {
    const nextLineIndex = getLineIndexFromSelection(nextValue, selectionStart ?? nextValue.length);
    const nextLineText = getLineTextByIndex(nextValue, nextLineIndex);
    return {
      nextLineColors: nextLineText
        ? applyLineColor(current, nextLineIndex, activeMultilineInputColor)
        : applyLineColor(current, nextLineIndex, 'default'),
      nextLineIndex,
    };
  }, [activeMultilineInputColor]);

  const handleDraftMultilineChange = useCallback((
    field: ResearchDraftMultilineFieldKey,
    nextValue: string,
    selectionStart: number | null,
  ) => {
    const { nextLineIndex } = resolveMultilineInputState(draft.lineColors[field] ?? {}, nextValue, selectionStart);
    setActiveMultilineLineIndex(nextLineIndex);
    setDraft((current) => {
      const nextInputState = resolveMultilineInputState(current.lineColors[field] ?? {}, nextValue, selectionStart);
      return {
        ...current,
        [field]: nextValue,
        lineColors: {
          ...current.lineColors,
          [field]: nextInputState.nextLineColors,
        },
      };
    });
  }, [draft.lineColors, resolveMultilineInputState]);

  const handleContentMultilineChange = useCallback((
    itemId: string,
    field: ResearchContentMultilineFieldKey,
    nextValue: string,
    selectionStart: number | null,
  ) => {
    const currentItem = draft.contentItems.find((item) => item.id === itemId);
    const { nextLineIndex } = resolveMultilineInputState(currentItem?.lineColors[field] ?? {}, nextValue, selectionStart);
    setActiveMultilineLineIndex(nextLineIndex);
    setDraft((current) => ({
      ...current,
      contentItems: current.contentItems.map((item) => {
        if (item.id !== itemId) {
          return item;
        }
        const nextInputState = resolveMultilineInputState(item.lineColors[field] ?? {}, nextValue, selectionStart);
        return {
          ...item,
          [field]: nextValue,
          lineColors: {
            ...item.lineColors,
            [field]: nextInputState.nextLineColors,
          },
        };
      }),
    }));
  }, [draft.contentItems, resolveMultilineInputState]);

  const handleCaptureModule = useCallback(async (itemId: string, moduleCode: string) => {
    if (!moduleCode.trim()) {
      updateContentItem(itemId, {
        capturedDetailNames: [],
        capturedFieldNames: [],
        linkedModuleCode: '',
        linkedModuleName: '',
        linkedModuleQuerySql: '',
        linkedModuleTable: '',
      });
      return;
    }

    const currentItem = draft.contentItems.find((item) => item.id === itemId);
    if (!currentItem) {
      return;
    }

    const selectedModule = sortedModules.find((item) => item.moduleCode === moduleCode);
    setCapturingItemId(itemId);
    updateContentItem(itemId, {
      linkedModuleCode: moduleCode,
      linkedModuleName: selectedModule?.moduleName || currentItem.linkedModuleName,
    });

    try {
      const snapshot = await captureModuleSnapshot(moduleCode);
      const defaultSceneName = snapshot.detailNames[0] || snapshot.tableName;
      const defaultDetailName = [snapshot.moduleName, defaultSceneName].filter(Boolean).join('');
      setDraft((current) => ({
        ...current,
        contentItems: current.contentItems.map((item) => {
          if (item.id !== itemId) return item;
          return {
            ...item,
            businessTheme: item.businessTheme.trim() || defaultDetailName || snapshot.moduleName,
            capturedDetailNames: snapshot.detailNames,
            capturedFieldNames: snapshot.fieldNames,
            formsProvided: item.formsProvided.trim() || buildCapturedFormsProvided(snapshot),
            linkedModuleCode: moduleCode,
            linkedModuleName: snapshot.moduleName || selectedModule?.moduleName || item.linkedModuleName,
            linkedModuleQuerySql: snapshot.querySql,
            linkedModuleTable: snapshot.tableName,
            sceneName: item.sceneName.trim() || defaultSceneName,
            workDescription: item.workDescription.trim() || buildCapturedWorkDescription(snapshot),
          };
        }),
      }));
      onShowToast?.(`已捕获模块 ${snapshot.moduleName || moduleCode} 的基础信息`);
    } catch (error) {
      const message = error instanceof Error ? error.message : '模块信息捕获失败';
      onShowToast?.(message);
      setStatusMessage(message);
    } finally {
      setCapturingItemId(null);
    }
  }, [draft.contentItems, onShowToast, sortedModules, updateContentItem]);

  const selectedContentIndex = Math.max(0, draft.contentItems.findIndex((item) => item.id === selectedContentItemId));
  const selectedContentItem = draft.contentItems[selectedContentIndex] ?? draft.contentItems[0] ?? null;
  const selectedContentDisplayName = selectedContentItem ? getContentItemDisplayName(selectedContentItem, selectedContentIndex) : '';
  const selectedContentOrdinal = String(selectedContentIndex + 1).padStart(2, '0');
  const readyContentCount = draft.contentItems.filter((item) => isContentItemReady(item)).length;
  const wordEditorTitle = `${(draft.departmentName || activeFirstLevelMenuName || '调研记录').trim() || '调研记录'}-调研记录.docx`;
  const isWordPrimaryMode = wordEditorRuntime.enabled;
  const activeQuickContext = useMemo(() => {
    if (!selectedContentItem) {
      return null;
    }

    const detailNameFromModule = [selectedContentItem.linkedModuleName, selectedContentItem.capturedDetailNames[0] || selectedContentItem.linkedModuleTable]
      .filter(Boolean)
      .join('');
    const detailHintOptions = selectedContentItem.capturedDetailNames.slice(0, 6);
    const fieldSnapshot = selectedContentItem.capturedFieldNames.slice(0, 10);
    const capturedWorkDescription = buildCapturedWorkDescriptionFromItem(selectedContentItem);

    switch (activeContentQuickTarget) {
      case 'businessTheme':
        return {
          title: '明细名称快捷',
          emptyText: '先选择模块或录入明细名称。',
          actions: [
            detailNameFromModule
              ? {
                  key: 'theme-module',
                  label: '带入模块明细名',
                  onClick: () => updateContentItem(selectedContentItem.id, { businessTheme: detailNameFromModule }),
                }
              : null,
            ...detailHintOptions.map((item, index) => ({
              key: `theme-${item}-${index}`,
              label: item,
              onClick: () => updateContentItem(selectedContentItem.id, { businessTheme: item }),
            })),
          ].filter(isDefined),
        };
      case 'sceneName':
        return {
          title: '子标题快捷',
          emptyText: '当前没有可带入的模块明细。',
          actions: [
            ...detailHintOptions.map((item, index) => ({
              key: `scene-${item}-${index}`,
              label: item,
              onClick: () => updateContentItem(selectedContentItem.id, { sceneName: item }),
            })),
            selectedContentItem.linkedModuleTable
              ? {
                  key: 'scene-table',
                  label: selectedContentItem.linkedModuleTable,
                  onClick: () => updateContentItem(selectedContentItem.id, { sceneName: selectedContentItem.linkedModuleTable }),
                }
              : null,
          ].filter(isDefined),
        };
      case 'jobRole':
        return {
          title: '工作岗位快捷',
          emptyText: '点击下方岗位输入框后，这里会展示常用岗位。',
          actions: DEPARTMENT_POST_PRESETS.map((item) => ({
            key: `role-${item}`,
            label: item,
            onClick: () => updateContentItem(selectedContentItem.id, { jobRole: item }),
          })),
        };
      case 'timeShare':
        return {
          title: '工时占比快捷',
          emptyText: '点击工时占比输入框后，这里会展示常用比例。',
          actions: TIME_SHARE_PRESETS.map((item) => ({
            key: `time-share-${item}`,
            label: item,
            onClick: () => updateContentItem(selectedContentItem.id, { timeShare: item }),
          })),
        };
      case 'formsProvided':
        return {
          title: '表单 / 资料快捷',
          emptyText: '可先捕获模块字段，再在这里快速带入。',
          actions: [
            fieldSnapshot.length > 0
              ? {
                  key: 'forms-replace',
                  label: '覆盖字段快照',
                  onClick: () => updateContentItem(selectedContentItem.id, {
                    formsProvided: fieldSnapshot.join('\n'),
                  }),
                }
              : null,
            ...fieldSnapshot.map((item, index) => ({
              key: `forms-${item}-${index}`,
              label: item,
              onClick: () => updateContentItem(selectedContentItem.id, {
                formsProvided: appendLineValue(selectedContentItem.formsProvided, item),
              }),
            })),
          ].filter(isDefined),
        };
      case 'workDescription':
        return {
          title: '当前做法快捷',
          emptyText: '可先捕获模块，再把模块摘要带入当前做法。',
          actions: [
            capturedWorkDescription
              ? {
                  key: 'work-description-replace',
                  label: '带入模块摘要',
                  onClick: () => updateContentItem(selectedContentItem.id, {
                    workDescription: capturedWorkDescription,
                  }),
                }
              : null,
            selectedContentItem.linkedModuleTable
              ? {
                  key: 'work-description-table',
                  label: '追加主表信息',
                  onClick: () => updateContentItem(selectedContentItem.id, {
                    workDescription: appendLineValue(selectedContentItem.workDescription, `主表：${selectedContentItem.linkedModuleTable}`),
                  }),
                }
              : null,
            selectedContentItem.capturedDetailNames.length > 0
              ? {
                  key: 'work-description-detail',
                  label: '追加明细范围',
                  onClick: () => updateContentItem(selectedContentItem.id, {
                    workDescription: appendLineValue(selectedContentItem.workDescription, `涉及明细：${selectedContentItem.capturedDetailNames.join('、')}`),
                  }),
                }
              : null,
          ].filter(isDefined),
        };
      case 'painPoints':
        return {
          title: '痛点问题快捷',
          emptyText: '点击痛点问题输入框后，这里会展示常用问题。',
          actions: PAIN_POINT_PRESETS.map((item) => ({
            key: `pain-${item}`,
            label: item,
            onClick: () => updateContentItem(selectedContentItem.id, {
              painPoints: appendSentenceValue(selectedContentItem.painPoints, item),
            }),
          })),
        };
      case 'suggestions':
        return {
          title: '朗速建议快捷',
          emptyText: '点击朗速建议输入框后，这里会展示常用建议。',
          actions: SUGGESTION_PRESETS.map((item) => ({
            key: `suggestion-${item}`,
            label: item,
            onClick: () => updateContentItem(selectedContentItem.id, {
              suggestions: appendSentenceValue(selectedContentItem.suggestions, item),
            }),
          })),
        };
      default:
        return null;
    }
  }, [activeContentQuickTarget, selectedContentItem, updateContentItem]);
  const activeQuickTone = CONTENT_QUICK_TARGET_META[activeContentQuickTarget].tone;
  const showContentMetaEditor = activeContentQuickTarget === 'sceneName'
    || activeContentQuickTarget === 'jobRole'
    || activeContentQuickTarget === 'timeShare';
  const activeContentEditorConfig = useMemo<ResearchContentEditorConfig | null>(() => {
    switch (activeContentQuickTarget) {
      case 'formsProvided':
        return {
          key: 'formsProvided',
          kind: 'textarea',
          label: '资料',
          placeholder: isWordPrimaryMode ? '保留结构化清单即可。' : '一行一项表单或资料清单',
          value: selectedContentItem?.formsProvided ?? '',
        };
      case 'workDescription':
        return {
          key: 'workDescription',
          kind: 'textarea',
          label: '做法',
          placeholder: isWordPrimaryMode ? '保留摘要，细节在右侧 Word 完善。' : '描述当前线下执行方式、表单来源、业务过程。',
          value: selectedContentItem?.workDescription ?? '',
        };
      case 'painPoints':
        return {
          key: 'painPoints',
          kind: 'textarea',
          label: '痛点',
          placeholder: '记录异常处理难点、规则缺口或重复工作。',
          value: selectedContentItem?.painPoints ?? '',
        };
      case 'suggestions':
        return {
          key: 'suggestions',
          kind: 'textarea',
          label: '建议',
          placeholder: '记录系统能力、管理规则或落地建议。',
          value: selectedContentItem?.suggestions ?? '',
        };
      case 'businessTheme':
      case 'sceneName':
      case 'jobRole':
      case 'timeShare':
      default:
        return null;
    }
  }, [activeContentQuickTarget, isWordPrimaryMode, selectedContentItem]);
  const activeMultilineFieldState = useMemo<ActiveMultilineFieldState | null>(() => {
    if (activeStep === 'environment') {
      return {
        field: activeEnvironmentQuickTarget,
        lineColors: draft.lineColors[activeEnvironmentQuickTarget] ?? {},
        scope: 'draft',
        value: draft[activeEnvironmentQuickTarget],
      };
    }

    if (activeStep === 'output' && activeOutputQuickTarget !== 'signer' && activeOutputQuickTarget !== 'signerDate') {
      return {
        field: activeOutputQuickTarget,
        lineColors: draft.lineColors[activeOutputQuickTarget] ?? {},
        scope: 'draft',
        value: draft[activeOutputQuickTarget],
      };
    }

    if (activeStep === 'contents' && activeContentEditorConfig && selectedContentItem) {
      return {
        field: activeContentEditorConfig.key,
        lineColors: selectedContentItem.lineColors[activeContentEditorConfig.key] ?? {},
        scope: 'content',
        value: activeContentEditorConfig.value,
      };
    }

    return null;
  }, [
    activeContentEditorConfig,
    activeEnvironmentQuickTarget,
    activeOutputQuickTarget,
    activeStep,
    draft,
    selectedContentItem,
  ]);
  const activeMultilineDisplayLines = useMemo(
    () => buildMultilineDisplayLines(activeMultilineFieldState?.value ?? '', activeMultilineFieldState?.lineColors ?? {}),
    [activeMultilineFieldState],
  );
  const activeMultilineAreaAllRed = useMemo(
    () => activeMultilineDisplayLines.length > 0 && activeMultilineDisplayLines.every((line) => line.color === 'red'),
    [activeMultilineDisplayLines],
  );

  useEffect(() => {
    if (!activeMultilineFieldState) {
      setActiveMultilineLineIndex(null);
      return;
    }

    if (activeMultilineDisplayLines.length === 0) {
      setActiveMultilineLineIndex(0);
      return;
    }

    setActiveMultilineLineIndex((current) => (
      current !== null && activeMultilineDisplayLines.some((line) => line.rawIndex === current)
        ? current
        : activeMultilineDisplayLines[0].rawIndex
    ));
  }, [activeMultilineDisplayLines, activeMultilineFieldState]);

  const updateActiveMultilineLineColors = useCallback((updater: (current: ResearchLineColorMap) => ResearchLineColorMap) => {
    if (!activeMultilineFieldState) {
      return;
    }

    if (activeMultilineFieldState.scope === 'draft') {
      updateDraftLineColors(activeMultilineFieldState.field, updater);
      return;
    }

    if (!selectedContentItem) {
      return;
    }

    updateContentItemLineColors(selectedContentItem.id, activeMultilineFieldState.field, updater);
  }, [
    activeMultilineFieldState,
    selectedContentItem,
    updateContentItemLineColors,
    updateDraftLineColors,
  ]);

  const handleApplyActiveInputColor = useCallback((color: ResearchLineColorTone) => {
    setActiveMultilineInputColor(color);

    if (!activeMultilineFieldState || activeMultilineLineIndex === null) {
      return;
    }

    const lineText = getLineTextByIndex(activeMultilineFieldState.value, activeMultilineLineIndex);
    if (!lineText) {
      return;
    }

    updateActiveMultilineLineColors((current) => applyLineColor(current, activeMultilineLineIndex, color));
  }, [
    activeMultilineFieldState,
    activeMultilineLineIndex,
    updateActiveMultilineLineColors,
  ]);

  const handleApplyActiveAreaColor = useCallback((color: ResearchLineColorTone) => {
    if (!activeMultilineFieldState) {
      return;
    }

    setActiveMultilineInputColor(color);
    updateActiveMultilineLineColors(() => buildUniformLineColorMap(activeMultilineFieldState.value, color));
  }, [activeMultilineFieldState, updateActiveMultilineLineColors]);

  const activeLineColorToolbar = activeMultilineFieldState ? (
    <LineColorToolbar
      activeInputColor={activeMultilineInputColor}
      isAreaAllRed={activeMultilineAreaAllRed}
      activeRawIndex={activeMultilineLineIndex}
      lines={activeMultilineDisplayLines}
      onAreaToneChange={handleApplyActiveAreaColor}
      onInputToneChange={handleApplyActiveInputColor}
    />
  ) : null;
  const activeOverviewQuickContext = useMemo(() => {
    const respondentOptions = toDelimitedParts(draft.respondents, /[、,，\n]+/).slice(0, 6);
    const engineerOptions = [currentUserName, ...toDelimitedParts(draft.engineers, /[、,，\n]+/)]
      .map((item) => item.trim())
      .filter(Boolean)
      .filter((item, index, array) => array.indexOf(item) === index)
      .slice(0, 6);

    switch (activeOverviewQuickTarget) {
      case 'companyName':
        return {
          title: '公司名称快捷',
          subtitle: '点击对应词汇即可带入当前字段。',
          emptyText: '当前没有可用公司名称建议。',
          actions: [
            {
              key: 'company-default',
              label: '东方水利智能科技股份有限公司',
              onClick: () => updateDraft({ companyName: '东方水利智能科技股份有限公司' }),
            },
          ],
        };
      case 'projectName':
        return {
          title: '项目名称快捷',
          subtitle: '项目名称通常由当前子系统自动带入。',
          emptyText: '当前没有可用项目名称建议。',
          actions: [
            activeSubsystemName
              ? {
                  key: 'project-subsystem',
                  label: `${activeSubsystemName}数字一体化平台项目`,
                  onClick: () => updateDraft({ projectName: `${activeSubsystemName}数字一体化平台项目` }),
                }
              : null,
            {
              key: 'project-default',
              label: '数字一体化平台项目',
              onClick: () => updateDraft({ projectName: '数字一体化平台项目' }),
            },
          ].filter(isDefined),
        };
      case 'surveyDate':
        return {
          title: '调研时间快捷',
          subtitle: '可快速沿用今天或签字日期。',
          emptyText: '当前没有可用调研时间建议。',
          actions: [
            {
              key: 'survey-date-today',
              label: '今天',
              onClick: () => updateDraft({ surveyDate: getTodayDate() }),
            },
            draft.signerDate
              ? {
                  key: 'survey-date-signer',
                  label: '沿用签字日期',
                  onClick: () => updateDraft({ surveyDate: draft.signerDate }),
                }
              : null,
          ].filter(isDefined),
        };
      case 'surveyLocation':
        return {
          title: '调研地点快捷',
          subtitle: '按会议室、办公室、现场等常见场景快速带入。',
          emptyText: '当前没有可用调研地点建议。',
          actions: SURVEY_LOCATION_PRESETS.map((item) => ({
            key: `survey-location-${item}`,
            label: item,
            onClick: () => updateDraft({ surveyLocation: item }),
          })),
        };
      case 'documentNo':
        return {
          title: '文件号快捷',
          subtitle: '根据调研日期生成标准编号。',
          emptyText: '当前没有可用文件号建议。',
          actions: [
            {
              key: 'document-no-build',
              label: buildSurveyDocumentNo(draft.surveyDate),
              onClick: () => updateDraft({ documentNo: buildSurveyDocumentNo(draft.surveyDate) }),
            },
          ],
        };
      case 'departmentName':
        return {
          title: '调研部门快捷',
          subtitle: '优先使用当前所在一级菜单名称。',
          emptyText: '当前没有可用部门建议。',
          actions: [
            activeFirstLevelMenuName
              ? {
                  key: 'department-current',
                  label: activeFirstLevelMenuName,
                  onClick: () => updateDraft({ departmentName: activeFirstLevelMenuName }),
                }
              : null,
          ].filter(isDefined),
        };
      case 'surveyCount':
        return {
          title: '调研次数快捷',
          subtitle: '常用次数可以直接点选。',
          emptyText: '当前没有可用次数建议。',
          actions: ['1', '2', '3'].map((item) => ({
            key: `survey-count-${item}`,
            label: item,
            onClick: () => updateDraft({ surveyCount: item }),
          })),
        };
      case 'surveyScope':
        return {
          title: '调研范围快捷',
          subtitle: '点击切换全员、部门或单独。',
          emptyText: '当前没有可用范围建议。',
          actions: (['全员', '部门', '单独'] as ResearchRecordScope[]).map((item) => ({
            key: `survey-scope-${item}`,
            label: item,
            onClick: () => updateDraft({ surveyScope: item }),
          })),
        };
      case 'respondents':
        return {
          title: '受访人员快捷',
          subtitle: '优先从当前已录入人员中选取。',
          emptyText: '受访人员建议较少，通常需要手工录入。',
          actions: respondentOptions.map((item) => ({
            key: `respondent-${item}`,
            label: item,
            onClick: () => updateDraft({ respondents: appendDelimitedValue(draft.respondents, item, '、') }),
          })),
        };
      case 'engineers':
        return {
          title: '调研工程师快捷',
          subtitle: '可直接带入当前登录人或已有工程师。',
          emptyText: '当前没有可用工程师建议。',
          actions: engineerOptions.map((item) => ({
            key: `engineer-${item}`,
            label: item,
            onClick: () => updateDraft({ engineers: appendDelimitedValue(draft.engineers, item, '、') }),
          })),
        };
      default:
        return null;
    }
  }, [
    activeFirstLevelMenuName,
    activeOverviewQuickTarget,
    activeSubsystemName,
    currentUserName,
    draft.documentNo,
    draft.engineers,
    draft.respondents,
    draft.signerDate,
    draft.surveyDate,
    updateDraft,
  ]);
  const activeOverviewQuickTone = OVERVIEW_QUICK_TARGET_META[activeOverviewQuickTarget].tone;
  const activeEnvironmentQuickContext = useMemo(() => {
    switch (activeEnvironmentQuickTarget) {
      case 'departmentPosts':
        return {
          title: '部门岗位快捷',
          subtitle: '根据常用岗位快速追加到岗位说明。',
          emptyText: '当前没有可用岗位建议。',
          actions: DEPARTMENT_POST_PRESETS.map((item) => ({
            key: `department-post-${item}`,
            label: item,
            onClick: () => updateDraft({ departmentPosts: appendLineValue(draft.departmentPosts, item) }),
          })),
        };
      case 'workTools':
        return {
          title: '工作工具快捷',
          subtitle: '常用系统、表单和沟通工具可快速补充。',
          emptyText: '当前没有可用工作工具建议。',
          actions: WORK_TOOL_PRESETS.map((item) => ({
            key: `work-tool-${item}`,
            label: item,
            onClick: () => updateDraft({ workTools: appendLineValue(draft.workTools, item) }),
          })),
        };
      default:
        return null;
    }
  }, [activeEnvironmentQuickTarget, draft.departmentPosts, draft.workTools, updateDraft]);
  const activeEnvironmentQuickTone = ENVIRONMENT_QUICK_TARGET_META[activeEnvironmentQuickTarget].tone;
  const activeOutputQuickContext = useMemo(() => {
    const respondentOptions = toDelimitedParts(draft.respondents, /[、,，\n]+/).slice(0, 6);
    switch (activeOutputQuickTarget) {
      case 'overallPainPoints':
        return {
          title: '整体痛点快捷',
          subtitle: '点击即可追加到整体痛点描述。',
          emptyText: '当前没有可用痛点建议。',
          actions: PAIN_POINT_PRESETS.map((item) => ({
            key: `overall-pain-${item}`,
            label: item,
            onClick: () => updateDraft({ overallPainPoints: appendSentenceValue(draft.overallPainPoints, item) }),
          })),
        };
      case 'specialDiscussion':
        return {
          title: '专项讨论快捷',
          subtitle: '常用建议和决策事项可直接追加。',
          emptyText: '当前没有可用专项讨论建议。',
          actions: SUGGESTION_PRESETS.map((item) => ({
            key: `special-discussion-${item}`,
            label: item,
            onClick: () => updateDraft({ specialDiscussion: appendSentenceValue(draft.specialDiscussion, item) }),
          })),
        };
      case 'extraNotes':
        return {
          title: '其他补充快捷',
          subtitle: '用于沉淀待确认和补充备注。',
          emptyText: '当前没有可用补充建议。',
          actions: EXTRA_NOTES_PRESETS.map((item) => ({
            key: `extra-note-${item}`,
            label: item,
            onClick: () => updateDraft({ extraNotes: appendSentenceValue(draft.extraNotes, item) }),
          })),
        };
      case 'signer':
        return {
          title: '签字人快捷',
          subtitle: '可从受访人员名单中快速选取。',
          emptyText: '请先录入受访人员，再快速带入签字人。',
          actions: respondentOptions.map((item) => ({
            key: `signer-${item}`,
            label: item,
            onClick: () => updateDraft({ signer: item }),
          })),
        };
      case 'signerDate':
        return {
          title: '确认日期快捷',
          subtitle: '可沿用今天或调研日期。',
          emptyText: '当前没有可用日期建议。',
          actions: [
            {
              key: 'signer-date-today',
              label: '今天',
              onClick: () => updateDraft({ signerDate: getTodayDate() }),
            },
            draft.surveyDate
              ? {
                  key: 'signer-date-survey',
                  label: '沿用调研日期',
                  onClick: () => updateDraft({ signerDate: draft.surveyDate }),
                }
              : null,
          ].filter(isDefined),
        };
      default:
        return null;
    }
  }, [
    activeOutputQuickTarget,
    draft.extraNotes,
    draft.overallPainPoints,
    draft.respondents,
    draft.signerDate,
    draft.specialDiscussion,
    draft.surveyDate,
    updateDraft,
  ]);
  const activeOutputQuickTone = OUTPUT_QUICK_TARGET_META[activeOutputQuickTarget].tone;
  const completedStepIds = useMemo(() => {
    const next = new Set<ResearchStepId>();

    if (
      draft.companyName.trim()
      && draft.projectName.trim()
      && draft.surveyDate.trim()
      && draft.departmentName.trim()
      && draft.respondents.trim()
      && draft.engineers.trim()
    ) {
      next.add('overview');
    }
    if (draft.departmentPosts.trim() && draft.workTools.trim()) {
      next.add('environment');
    }
    if (draft.contentItems.length > 0 && readyContentCount === draft.contentItems.length) {
      next.add('contents');
    }
    if (draft.overallPainPoints.trim() && draft.specialDiscussion.trim() && draft.signer.trim() && draft.signerDate.trim()) {
      next.add('output');
    }

    return next;
  }, [
    draft.companyName,
    draft.contentItems.length,
    draft.departmentName,
    draft.departmentPosts,
    draft.engineers,
    draft.overallPainPoints,
    draft.projectName,
    draft.respondents,
    draft.signer,
    draft.signerDate,
    draft.specialDiscussion,
    draft.surveyDate,
    draft.workTools,
    readyContentCount,
  ]);

  useEffect(() => {
    if (activeStep === 'contents') {
      if (selectedContentItemId) {
        scrollPreviewTo(`content-item:${selectedContentItemId}`, 'auto');
        return;
      }
      scrollPreviewTo('contents', 'auto');
      return;
    }
    scrollPreviewTo(activeStep, 'auto');
  }, [activeStep, scrollPreviewTo, selectedContentItemId]);

  return (
    <div className="grid h-full min-h-0 overflow-hidden bg-[radial-gradient(circle_at_top_left,#e0f2fe_0%,#ffffff_34%,#f8fafc_100%)] text-slate-900 xl:grid-cols-[minmax(42rem,54rem)_minmax(0,1fr)] 2xl:grid-cols-[minmax(45rem,58rem)_minmax(0,1fr)]">
      <div className="flex min-h-0 min-w-0 flex-col overflow-hidden bg-white/92">
        <div className="shrink-0 border-b border-slate-200/80 bg-white/92 backdrop-blur">
          <div className="px-4 pb-2.5 pt-2.5 xl:px-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  onClick={onExit}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition-all hover:border-slate-300 hover:text-slate-900"
                >
                  <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                </button>
                <div className="min-w-0">
                  <div className="text-[20px] font-black tracking-tight text-slate-950">调研记录</div>
                </div>
              </div>
              <div className="inline-flex items-center gap-2 rounded-none border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-semibold text-slate-500">
                <span className="material-symbols-outlined text-[16px] text-emerald-500">task_alt</span>
                已完成 {completedStepIds.size} / {STEP_ITEMS.length} 步
              </div>
            </div>

            <div className="mt-2.5 overflow-x-auto pb-1">
              <div className="flex min-w-max items-center">
                {STEP_ITEMS.map((item, index) => {
                  const isActive = activeStep === item.id;
                  const isCompleted = completedStepIds.has(item.id);
                  return (
                    <React.Fragment key={item.id}>
                      <button
                        type="button"
                        onClick={() => setActiveStep(item.id)}
                        className={`group flex min-w-[96px] flex-1 items-center gap-2 rounded-[16px] border px-2.5 py-1.5 text-left transition-all ${
                          isActive
                            ? 'border-sky-200 bg-[linear-gradient(135deg,#eff6ff_0%,#ecfeff_100%)] text-sky-700 shadow-[0_16px_28px_-24px_rgba(14,165,233,0.45)]'
                            : isCompleted
                              ? 'border-emerald-200 bg-emerald-50 text-slate-900 hover:border-emerald-300'
                              : 'border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-black transition-all ${
                            isActive
                              ? 'bg-sky-500 text-white'
                              : isCompleted
                                ? 'bg-emerald-500 text-white'
                                : 'border border-slate-200 bg-slate-50 text-slate-500'
                          }`}
                        >
                          {isCompleted && !isActive ? (
                            <span className="material-symbols-outlined text-[16px]">check</span>
                          ) : (
                            item.numericId
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={`block truncate text-[11px] font-black tracking-tight ${isActive ? 'text-sky-700' : 'text-slate-900'}`}>
                            {item.title.replace(/^.\、/, '')}
                          </span>
                        </span>
                      </button>
                      {index < STEP_ITEMS.length - 1 ? (
                        <div
                          className={`mx-1.5 h-[2px] w-4 shrink-0 rounded-full ${
                            isCompleted || isActive ? 'bg-primary/35' : 'bg-slate-200'
                          }`}
                        />
                      ) : null}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className={`min-h-0 flex-1 px-5 py-5 xl:px-6 ${activeStep === 'contents' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
            {activeStep === 'overview' ? (
              <div className="flex h-full min-h-0 flex-col" onFocusCapture={() => scrollPreviewTo('overview')}>
                    <div className="shrink-0">
                    <DynamicSuggestionPanel
                      actions={activeOverviewQuickContext?.actions ?? []}
                      activeKey={activeOverviewQuickTarget}
                      emptyText={activeOverviewQuickContext?.emptyText ?? '点击下方任一字段切换快捷建议。'}
                      onTabChange={(key) => setActiveOverviewQuickTarget(key as ResearchOverviewQuickTarget)}
                      subtitle=""
                      tabs={OVERVIEW_QUICK_TARGET_ORDER.map((target) => ({
                        key: target,
                        label: OVERVIEW_QUICK_TARGET_META[target].label,
                        tone: OVERVIEW_QUICK_TARGET_META[target].tone,
                      }))}
                      title={activeOverviewQuickContext?.title ?? '调研信息快捷'}
                      tone={activeOverviewQuickTone}
                    />
                    </div>

                    <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
                    <div className="grid gap-3 xl:grid-cols-12">
                      <FocusFieldCard active={activeOverviewQuickTarget === 'companyName'} tone={OVERVIEW_QUICK_TARGET_META.companyName.tone} className="xl:col-span-6">
                        <FieldShell label="公司名称">
                          <TextInput
                            value={draft.companyName}
                            onFocus={() => setActiveOverviewQuickTarget('companyName')}
                            onChange={(event) => updateDraft({ companyName: event.target.value })}
                            placeholder="东方水利智能科技股份有限公司"
                          />
                        </FieldShell>
                      </FocusFieldCard>
                      <FocusFieldCard active={activeOverviewQuickTarget === 'projectName'} tone={OVERVIEW_QUICK_TARGET_META.projectName.tone} className="xl:col-span-6">
                        <FieldShell label="项目名称">
                          <TextInput
                            value={draft.projectName}
                            onFocus={() => setActiveOverviewQuickTarget('projectName')}
                            onChange={(event) => updateDraft({ projectName: event.target.value })}
                            placeholder="数字一体化平台项目"
                          />
                        </FieldShell>
                      </FocusFieldCard>
                      <FocusFieldCard active={activeOverviewQuickTarget === 'surveyDate'} tone={OVERVIEW_QUICK_TARGET_META.surveyDate.tone} className="xl:col-span-4">
                        <FieldShell label="调研时间">
                          <TextInput
                            type="date"
                            value={draft.surveyDate}
                            onFocus={() => setActiveOverviewQuickTarget('surveyDate')}
                            onChange={(event) => updateDraft({ surveyDate: event.target.value })}
                          />
                        </FieldShell>
                      </FocusFieldCard>
                      <FocusFieldCard active={activeOverviewQuickTarget === 'surveyLocation'} tone={OVERVIEW_QUICK_TARGET_META.surveyLocation.tone} className="xl:col-span-4">
                        <FieldShell label="调研地点">
                          <TextInput
                            value={draft.surveyLocation}
                            onFocus={() => setActiveOverviewQuickTarget('surveyLocation')}
                            onChange={(event) => updateDraft({ surveyLocation: event.target.value })}
                            placeholder="会议室 / 现场"
                          />
                        </FieldShell>
                      </FocusFieldCard>
                      <FocusFieldCard active={activeOverviewQuickTarget === 'documentNo'} tone={OVERVIEW_QUICK_TARGET_META.documentNo.tone} className="xl:col-span-4">
                        <FieldShell label="文件号">
                          <TextInput
                            value={draft.documentNo}
                            onFocus={() => setActiveOverviewQuickTarget('documentNo')}
                            onChange={(event) => updateDraft({ documentNo: event.target.value })}
                            placeholder="DFSL-RG-20260106"
                          />
                        </FieldShell>
                      </FocusFieldCard>
                      <FocusFieldCard active={activeOverviewQuickTarget === 'departmentName'} tone={OVERVIEW_QUICK_TARGET_META.departmentName.tone} className="xl:col-span-4">
                        <FieldShell label="调研部门">
                          <TextInput
                            value={draft.departmentName}
                            onFocus={() => setActiveOverviewQuickTarget('departmentName')}
                            onChange={(event) => updateDraft({ departmentName: event.target.value })}
                            placeholder="质量检验部"
                          />
                        </FieldShell>
                      </FocusFieldCard>
                      <FocusFieldCard active={activeOverviewQuickTarget === 'surveyCount'} tone={OVERVIEW_QUICK_TARGET_META.surveyCount.tone} className="xl:col-span-2">
                        <FieldShell label="调研次数">
                          <TextInput
                            value={draft.surveyCount}
                            onFocus={() => setActiveOverviewQuickTarget('surveyCount')}
                            onChange={(event) => updateDraft({ surveyCount: event.target.value })}
                            placeholder="1"
                          />
                        </FieldShell>
                      </FocusFieldCard>
                      <FocusFieldCard active={activeOverviewQuickTarget === 'surveyScope'} tone={OVERVIEW_QUICK_TARGET_META.surveyScope.tone} className="xl:col-span-6">
                        <div onClick={() => setActiveOverviewQuickTarget('surveyScope')}>
                          <FieldShell label="调研范围">
                            <div className="grid grid-cols-3 gap-2">
                              {(['全员', '部门', '单独'] as ResearchRecordScope[]).map((scope) => (
                                <button
                                  key={scope}
                                  type="button"
                                  onClick={() => {
                                    setActiveOverviewQuickTarget('surveyScope');
                                    updateDraft({ surveyScope: scope });
                                  }}
                                  className={`rounded-xl border px-2.5 py-2 text-[12px] font-semibold transition-all ${
                                    draft.surveyScope === scope
                                      ? 'border-primary/20 bg-primary/10 text-primary'
                                      : 'border-slate-200 bg-white text-slate-500 hover:border-primary/15 hover:text-primary'
                                  }`}
                                >
                                  {scope}
                                </button>
                              ))}
                            </div>
                          </FieldShell>
                        </div>
                      </FocusFieldCard>
                      <FocusFieldCard active={activeOverviewQuickTarget === 'respondents'} tone={OVERVIEW_QUICK_TARGET_META.respondents.tone} className="xl:col-span-6">
                        <FieldShell label="受访人员">
                          <TextInput
                            value={draft.respondents}
                            onFocus={() => setActiveOverviewQuickTarget('respondents')}
                            onChange={(event) => updateDraft({ respondents: event.target.value })}
                            placeholder="张三、李四"
                          />
                        </FieldShell>
                      </FocusFieldCard>
                      <FocusFieldCard active={activeOverviewQuickTarget === 'engineers'} tone={OVERVIEW_QUICK_TARGET_META.engineers.tone} className="xl:col-span-6">
                        <FieldShell label="调研工程师">
                          <TextInput
                            value={draft.engineers}
                            onFocus={() => setActiveOverviewQuickTarget('engineers')}
                            onChange={(event) => updateDraft({ engineers: event.target.value })}
                            placeholder="王工、李工"
                          />
                        </FieldShell>
                      </FocusFieldCard>
                    </div>
                    </div>
                  </div>
            ) : null}

            {activeStep === 'environment' ? (
              <div className="flex h-full min-h-0 flex-col" onFocusCapture={() => scrollPreviewTo('environment')}>
                    <div className="shrink-0">
                    <DynamicSuggestionPanel
                      actions={activeEnvironmentQuickContext?.actions ?? []}
                      activeKey={activeEnvironmentQuickTarget}
                      emptyText={activeEnvironmentQuickContext?.emptyText ?? '点击下方任一字段切换快捷建议。'}
                      extra={activeLineColorToolbar}
                      onTabChange={(key) => setActiveEnvironmentQuickTarget(key as ResearchEnvironmentQuickTarget)}
                      subtitle=""
                      tabs={ENVIRONMENT_QUICK_TARGET_ORDER.map((target) => ({
                        key: target,
                        label: ENVIRONMENT_QUICK_TARGET_META[target].label,
                        tone: ENVIRONMENT_QUICK_TARGET_META[target].tone,
                      }))}
                      title={activeEnvironmentQuickContext?.title ?? '部门情况快捷'}
                      tone={activeEnvironmentQuickTone}
                    />
                    </div>

                    <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
                    <div className="grid gap-4 xl:grid-cols-2">
                      <FocusFieldCard active={activeEnvironmentQuickTarget === 'departmentPosts'} tone={ENVIRONMENT_QUICK_TARGET_META.departmentPosts.tone} className="p-4">
                        <div className="mb-3 text-sm font-black tracking-tight text-slate-950">部门岗位</div>
                        <FieldShell label="岗位说明">
                          <TextArea
                            value={draft.departmentPosts}
                            onFocus={() => setActiveEnvironmentQuickTarget('departmentPosts')}
                            onClick={syncActiveLineFromTextarea}
                            onChange={(event) => handleDraftMultilineChange('departmentPosts', event.target.value, event.currentTarget.selectionStart)}
                            onKeyUp={syncActiveLineFromTextarea}
                            onSelect={syncActiveLineFromTextarea}
                            placeholder="一行一个岗位或岗位说明"
                            className="min-h-[220px]"
                          />
                        </FieldShell>
                      </FocusFieldCard>
                      <FocusFieldCard active={activeEnvironmentQuickTarget === 'workTools'} tone={ENVIRONMENT_QUICK_TARGET_META.workTools.tone} className="p-4">
                        <div className="mb-3 text-sm font-black tracking-tight text-slate-950">工作工具</div>
                        <FieldShell label="工具清单">
                          <TextArea
                            value={draft.workTools}
                            onFocus={() => setActiveEnvironmentQuickTarget('workTools')}
                            onClick={syncActiveLineFromTextarea}
                            onChange={(event) => handleDraftMultilineChange('workTools', event.target.value, event.currentTarget.selectionStart)}
                            onKeyUp={syncActiveLineFromTextarea}
                            onSelect={syncActiveLineFromTextarea}
                            placeholder="一行一个系统、表单或沟通工具"
                            className="min-h-[220px]"
                          />
                        </FieldShell>
                      </FocusFieldCard>
                    </div>
                    </div>
                  </div>
            ) : null}

            {activeStep === 'contents' ? (
              <div className="flex h-full min-h-0 flex-col" onFocusCapture={() => scrollPreviewTo('contents')}>
                    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-none border border-slate-200/90 bg-slate-100">
                      <div className="border-b border-slate-200/80 bg-slate-50 px-4 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-2">
                            <div className="text-sm font-black tracking-tight text-slate-950">调研明细</div>
                            <span className="rounded-none border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-600">
                              {readyContentCount} / {draft.contentItems.length}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={addContentItem}
                              className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-3.5 py-2 text-sm font-semibold text-white transition-all hover:bg-slate-800"
                            >
                              <span className="material-symbols-outlined text-[18px]">add</span>
                              新增明细
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="grid min-h-0 flex-1 lg:grid-cols-[108px_minmax(0,1fr)]">
                        <div className="min-h-0 overflow-y-auto border-r border-slate-200/80 bg-slate-50/70 p-2">
                          {draft.contentItems.length > 0 ? (
                            <div className="space-y-1.5 pr-0.5">
                              {draft.contentItems.map((item, index) => {
                                const isActive = item.id === selectedContentItem?.id;
                                return (
                                  <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedContentItemId(item.id);
                                      scrollPreviewTo(`content-item:${item.id}`);
                                    }}
                                    className={`group w-full rounded-[14px] border px-2 py-1.5 text-left transition-all ${
                                      isActive
                                        ? 'border-sky-200 bg-[linear-gradient(135deg,#eff6ff_0%,#ecfeff_100%)] text-sky-700 shadow-[0_16px_30px_-24px_rgba(14,165,233,0.35)]'
                                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                                    }`}
                                  >
                                    <span className={`block break-words text-[11px] font-black leading-4 ${isActive ? 'text-sky-700' : 'text-slate-900'}`}>
                                      {getContentItemDisplayName(item, index)}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="flex h-full items-center justify-center text-[11px] text-slate-400">暂无明细</div>
                          )}
                        </div>

                        {selectedContentItem ? (
                          <div className="min-h-0 flex flex-col px-3 py-3.5 xl:px-3.5" onFocusCapture={() => scrollPreviewTo(`content-item:${selectedContentItem.id}`)}>
                            <div className="shrink-0 rounded-none border border-slate-200 bg-slate-50 p-3">
                              <div className="flex flex-wrap items-start justify-between gap-4">
                                <div className="min-w-0 flex-1">
                                  <TextInput
                                    value={selectedContentItem.businessTheme}
                                    onFocus={() => setActiveContentQuickTarget('businessTheme')}
                                    onChange={(event) => updateContentItem(selectedContentItem.id, { businessTheme: event.target.value })}
                                    placeholder={`明细 ${selectedContentOrdinal}`}
                                    className="h-11 rounded-2xl border-slate-200 bg-white px-4 text-[18px] font-black tracking-tight text-slate-950"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeContentItem(selectedContentItem.id)}
                                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-600 transition-colors hover:bg-rose-100"
                                >
                                  <span className="material-symbols-outlined text-[16px]">delete</span>
                                </button>
                              </div>

                              <div className="mt-4">
                                <DynamicSuggestionPanel
                                  actions={activeQuickContext?.actions ?? []}
                                  activeKey={activeContentQuickTarget}
                                  emptyText={activeQuickContext?.emptyText ?? '点击下方输入框切换快捷词。'}
                                  extra={(
                                    <div className="grid min-w-[260px] gap-2">
                                      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_96px]">
                                        <SelectInput
                                          value={selectedContentItem.linkedModuleCode}
                                          onChange={(event) => void handleCaptureModule(selectedContentItem.id, event.target.value)}
                                          className="h-9 rounded-xl border-slate-200 bg-white"
                                        >
                                          <option value="">不关联模块，手工填写</option>
                                          {sortedModules.map((module) => (
                                            <option key={module.id} value={module.moduleCode}>
                                              {module.moduleName} ({module.moduleCode})
                                            </option>
                                          ))}
                                        </SelectInput>
                                        <button
                                          type="button"
                                          disabled={!selectedContentItem.linkedModuleCode || capturingItemId === selectedContentItem.id}
                                          onClick={() => void handleCaptureModule(selectedContentItem.id, selectedContentItem.linkedModuleCode)}
                                          className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 transition-colors hover:border-primary/20 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                          <span className="material-symbols-outlined text-[17px]">
                                            {capturingItemId === selectedContentItem.id ? 'hourglass_top' : 'data_object'}
                                          </span>
                                          {capturingItemId === selectedContentItem.id ? '捕获中' : '捕获'}
                                        </button>
                                      </div>
                                      {activeLineColorToolbar}
                                    </div>
                                  )}
                                  onTabChange={(key) => setActiveContentQuickTarget(key as ResearchContentQuickTarget)}
                                  subtitle=""
                                  tabs={CONTENT_QUICK_TARGET_ORDER.map((target) => ({
                                    key: target,
                                    label: CONTENT_QUICK_TARGET_META[target].label,
                                    tone: CONTENT_QUICK_TARGET_META[target].tone,
                                  }))}
                                  title={activeQuickContext?.title ?? '明细快捷输入'}
                                  tone={activeQuickTone}
                                />
                              </div>
                            </div>

                            <div className="mt-3 min-h-0 flex-1">
                              {showContentMetaEditor ? (
                                <FocusFieldCard
                                  active={true}
                                  tone={CONTENT_QUICK_TARGET_META[activeContentQuickTarget].tone}
                                  className="p-4"
                                >
                                  <div className="mb-3 text-sm font-black tracking-tight text-slate-950">基础补充信息</div>
                                  <div className="grid gap-3 lg:grid-cols-3">
                                    <FieldShell label="子标题">
                                      <TextInput
                                        value={selectedContentItem.sceneName}
                                        onFocus={() => setActiveContentQuickTarget('sceneName')}
                                        onChange={(event) => updateContentItem(selectedContentItem.id, { sceneName: event.target.value })}
                                        placeholder="例如：基础信息"
                                      />
                                    </FieldShell>
                                    <FieldShell label="工作岗位">
                                      <TextInput
                                        value={selectedContentItem.jobRole}
                                        onFocus={() => setActiveContentQuickTarget('jobRole')}
                                        onChange={(event) => updateContentItem(selectedContentItem.id, { jobRole: event.target.value })}
                                        placeholder="例如：检测岗位"
                                      />
                                    </FieldShell>
                                    <FieldShell label="工时占比">
                                      <TextInput
                                        value={selectedContentItem.timeShare}
                                        onFocus={() => setActiveContentQuickTarget('timeShare')}
                                        onChange={(event) => updateContentItem(selectedContentItem.id, { timeShare: event.target.value })}
                                        placeholder="例如：5%"
                                      />
                                    </FieldShell>
                                  </div>
                                </FocusFieldCard>
                              ) : activeContentEditorConfig ? (
                                <FocusFieldCard
                                  active={true}
                                  tone={CONTENT_QUICK_TARGET_META[activeContentEditorConfig.key].tone}
                                  className="flex h-full min-h-0 flex-col p-4"
                                >
                                  <div className="flex h-full min-h-0 flex-col">
                                    <div className="mb-1.5 text-[11px] font-semibold text-slate-500">{activeContentEditorConfig.label}</div>
                                    <TextArea
                                      value={activeContentEditorConfig.value}
                                      onFocus={() => setActiveContentQuickTarget(activeContentEditorConfig.key)}
                                      onClick={syncActiveLineFromTextarea}
                                      onChange={(event) => handleContentMultilineChange(
                                        selectedContentItem.id,
                                        activeContentEditorConfig.key,
                                        event.target.value,
                                        event.currentTarget.selectionStart,
                                      )}
                                      onKeyUp={syncActiveLineFromTextarea}
                                      onSelect={syncActiveLineFromTextarea}
                                      placeholder={activeContentEditorConfig.placeholder}
                                      className="min-h-0 flex-1 resize-none bg-white"
                                    />
                                  </div>
                                </FocusFieldCard>
                              ) : (
                                <FocusFieldCard active={true} tone={CONTENT_QUICK_TARGET_META.businessTheme.tone} className="flex h-full min-h-[220px] flex-col justify-between p-4">
                                  <div>
                                    <div className="text-sm font-black tracking-tight text-slate-950">明细名称</div>
                                    <div className="mt-2 text-[12px] leading-6 text-slate-500">
                                      当前快捷词会直接作用到上方明细名称。切换到子标题、工作岗位、工时占比、资料、做法、痛点或建议后，这里会独占显示对应配置。
                                    </div>
                                  </div>
                                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                                    {[
                                      { label: '当前明细', value: selectedContentDisplayName || `明细 ${selectedContentOrdinal}` },
                                      { label: '子标题', value: selectedContentItem.sceneName.trim() || '未填写' },
                                      { label: '工作岗位', value: selectedContentItem.jobRole.trim() || '未填写' },
                                      { label: '工时占比', value: selectedContentItem.timeShare.trim() || '未填写' },
                                    ].map((meta) => (
                                      <div key={meta.label} className="border border-slate-200 bg-white px-3 py-2.5">
                                        <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{meta.label}</div>
                                        <div className="mt-1 line-clamp-2 text-[12px] font-semibold text-slate-900">{meta.value}</div>
                                      </div>
                                    ))}
                                  </div>
                                </FocusFieldCard>
                              )}
                            </div>
                          </div>
                      ) : (
                        <div className="px-6 py-10">
                          <div className="mx-auto w-full max-w-md rounded-[24px] border border-dashed border-slate-200 bg-white px-6 py-12 text-center shadow-[0_24px_54px_-44px_rgba(15,23,42,0.3)]">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
                              <span className="material-symbols-outlined text-[22px]">library_add</span>
                            </div>
                            <div className="mt-4 text-base font-black tracking-tight text-slate-900">先新增一条调研明细</div>
                            <div className="mt-2 text-[12px] leading-6 text-slate-400">明细可以全部删空，再按实际业务重新建立。</div>
                            <button
                              type="button"
                              onClick={addContentItem}
                              className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-slate-800"
                            >
                              <span className="material-symbols-outlined text-[18px]">add</span>
                              新增明细
                            </button>
                          </div>
                        </div>
                      )}
                      </div>
                    </section>
                  </div>
            ) : null}

            {activeStep === 'output' ? (
              <div className="flex h-full min-h-0 flex-col" onFocusCapture={() => scrollPreviewTo('output')}>
                    <div className="shrink-0">
                    <DynamicSuggestionPanel
                      actions={activeOutputQuickContext?.actions ?? []}
                      activeKey={activeOutputQuickTarget}
                      emptyText={activeOutputQuickContext?.emptyText ?? '点击下方任一字段切换快捷建议。'}
                      extra={activeLineColorToolbar}
                      onTabChange={(key) => setActiveOutputQuickTarget(key as ResearchOutputQuickTarget)}
                      subtitle=""
                      tabs={OUTPUT_QUICK_TARGET_ORDER.map((target) => ({
                        key: target,
                        label: OUTPUT_QUICK_TARGET_META[target].label,
                        tone: OUTPUT_QUICK_TARGET_META[target].tone,
                      }))}
                      title={activeOutputQuickContext?.title ?? '输出确认快捷'}
                      tone={activeOutputQuickTone}
                    />
                    </div>

                    <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
                    <div className="grid gap-4 xl:grid-cols-12">
                      <FocusFieldCard active={activeOutputQuickTarget === 'overallPainPoints'} tone={OUTPUT_QUICK_TARGET_META.overallPainPoints.tone} className="p-4 xl:col-span-6">
                        <div className="mb-3 text-sm font-black tracking-tight text-slate-950">整体痛点难点描述</div>
                        <TextArea
                          value={draft.overallPainPoints}
                          onFocus={() => setActiveOutputQuickTarget('overallPainPoints')}
                          onClick={syncActiveLineFromTextarea}
                          onChange={(event) => handleDraftMultilineChange('overallPainPoints', event.target.value, event.currentTarget.selectionStart)}
                          onKeyUp={syncActiveLineFromTextarea}
                          onSelect={syncActiveLineFromTextarea}
                          placeholder={isWordPrimaryMode ? '这里沉淀摘要，详细段落建议在右侧 Word 中完善。' : '总结部门级的核心痛点、风险和改造目标。'}
                          className="min-h-[210px]"
                        />
                      </FocusFieldCard>
                      <FocusFieldCard active={activeOutputQuickTarget === 'specialDiscussion'} tone={OUTPUT_QUICK_TARGET_META.specialDiscussion.tone} className="p-4 xl:col-span-6">
                        <div className="mb-3 text-sm font-black tracking-tight text-slate-950">业务专项事项讨论</div>
                        <TextArea
                          value={draft.specialDiscussion}
                          onFocus={() => setActiveOutputQuickTarget('specialDiscussion')}
                          onClick={syncActiveLineFromTextarea}
                          onChange={(event) => handleDraftMultilineChange('specialDiscussion', event.target.value, event.currentTarget.selectionStart)}
                          onKeyUp={syncActiveLineFromTextarea}
                          onSelect={syncActiveLineFromTextarea}
                          placeholder="记录专项事项、决策分歧和后续待办。"
                          className="min-h-[210px]"
                        />
                      </FocusFieldCard>
                      <FocusFieldCard active={activeOutputQuickTarget === 'extraNotes'} tone={OUTPUT_QUICK_TARGET_META.extraNotes.tone} className="p-4 xl:col-span-8">
                        <div className="mb-3 text-sm font-black tracking-tight text-slate-950">其他补充</div>
                        <TextArea
                          value={draft.extraNotes}
                          onFocus={() => setActiveOutputQuickTarget('extraNotes')}
                          onClick={syncActiveLineFromTextarea}
                          onChange={(event) => handleDraftMultilineChange('extraNotes', event.target.value, event.currentTarget.selectionStart)}
                          onKeyUp={syncActiveLineFromTextarea}
                          onSelect={syncActiveLineFromTextarea}
                          placeholder="记录其他备注或确认事项。"
                          className="min-h-[156px]"
                        />
                      </FocusFieldCard>
                      <div className="xl:col-span-4 xl:w-full xl:max-w-[260px] xl:justify-self-end xl:self-start">
                        <div className="grid gap-3">
                          <FocusFieldCard active={activeOutputQuickTarget === 'signer'} tone={OUTPUT_QUICK_TARGET_META.signer.tone} className="p-3.5">
                            <FieldShell label="受访人（签字确认）">
                              <TextInput
                                value={draft.signer}
                                onFocus={() => setActiveOutputQuickTarget('signer')}
                                onChange={(event) => updateDraft({ signer: event.target.value })}
                                placeholder="例如：张惠明"
                              />
                            </FieldShell>
                          </FocusFieldCard>
                          <FocusFieldCard active={activeOutputQuickTarget === 'signerDate'} tone={OUTPUT_QUICK_TARGET_META.signerDate.tone} className="p-3.5">
                            <FieldShell label="确认日期">
                              <TextInput
                                type="date"
                                value={draft.signerDate}
                                onFocus={() => setActiveOutputQuickTarget('signerDate')}
                                onChange={(event) => updateDraft({ signerDate: event.target.value })}
                              />
                            </FieldShell>
                          </FocusFieldCard>
                        </div>
                      </div>
                    </div>
                    </div>
                  </div>
            ) : null}
          </div>
        </section>

        <div className="shrink-0 border-t border-slate-200 bg-white px-4">
          <div className="flex h-14 items-center justify-end gap-3">
            {statusMessage ? <div className="text-[12px] font-semibold text-emerald-600">{statusMessage}</div> : null}
            <button
              type="button"
              onClick={handleExportSave}
              className="inline-flex items-center gap-1.5 bg-primary px-5 py-2.5 text-[12px] font-semibold text-white transition-all hover:bg-erp-blue"
            >
              <span className="material-symbols-outlined text-[20px]">save</span>
              导出保存
            </button>
          </div>
        </div>
      </div>

      {wordEditorRuntime.enabled ? (
        <ResearchRecordWordEditor
          currentUserName={currentUserName}
          documentTitle={wordEditorTitle}
          onStatusChange={setStatusMessage}
          runtime={wordEditorRuntime}
        />
      ) : (
        <ResearchRecordWordTemplatePreview
          activeStep={activeStep}
          draft={draft}
          focusKey={previewFocusKey}
          selectedContentItemId={selectedContentItemId}
          templateUrl={wordEditorRuntime.templateUrl}
        />
      )}
    </div>
  );
}
