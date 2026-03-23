import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDeferredValue, useMemo } from 'react';
import {
  fetchSubsystemMenuTree,
  fetchSubsystemSecondLevelMenus,
  type BackendMenuNode,
  type BackendSubsystemNode,
} from '../lib/backend-menus';
import {
  createBillTypeConfig,
  createSingleTableModuleConfig,
  deleteBillTypeConfig,
  deleteSingleTableModuleConfig,
  fetchBillTypeConfig,
  fetchSingleTableModuleConfig,
  saveBillTypeConfig,
  saveSingleTableModuleConfig,
  type BillTypeConfigDto,
  type SingleTableModuleConfigDto,
} from '../lib/backend-module-config';
import { requestIdentifierTranslation, requestSqlDraft, requestSurveyPlan, type SurveyPlan } from '../lib/minimax';

interface DashboardProps {
  currentUserName: string;
  onLogout: () => void;
}

type BusinessType = 'document' | 'table' | 'tree';
type BillSourceEntry = {
  id: string;
  configType: string;
  sourceName: string;
  sourceSql: string;
  sourceDetail: string;
  sourceType: string;
};
type BillCanvasFieldScope = 'main' | 'meta';
type BillFieldGuideLine = {
  orientation: 'vertical' | 'horizontal';
  position: number;
  start: number;
  end: number;
  kind: 'align' | 'spacing';
};
type BillFieldGapGuide = {
  orientation: 'horizontal' | 'vertical';
  start: number;
  end: number;
  cross: number;
  label: string;
};
type BillFieldGuideState = {
  lines: BillFieldGuideLine[];
  gap: BillFieldGapGuide | null;
};
type BillFieldBounds = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
  centerX: number;
  centerY: number;
};
type BillSnapCandidate = {
  value: number;
  line: BillFieldGuideLine | null;
  gap: BillFieldGapGuide | null;
  priority: number;
};
type ModuleMenuFieldKind = 'text' | 'textarea' | 'number' | 'select' | 'switch';
type ModuleMenuValue = string | boolean;
type ModuleMenuDraft = Record<string, ModuleMenuValue>;
type ModuleMenuOption = {
  value: string;
  label: string;
};
type ModuleMenuFieldSchema = {
  key: string;
  label: string;
  tableField: string;
  kind: ModuleMenuFieldKind;
  placeholder?: string;
  hint?: string;
  options?: ModuleMenuOption[];
  rows?: number;
  span?: 'half' | 'full';
};
type ModuleMenuSectionSchema = {
  title: string;
  description: string;
  fields: ModuleMenuFieldSchema[];
};
type MenuModuleTypeProfile = {
  badgeClass: string;
  businessType: BusinessType;
  icon: string;
  label: string;
};

function getDashboardErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return '菜单加载失败，请稍后重试。';
}

function normalizeMenuTitle(value?: string) {
  return value?.trim() || '';
}

function normalizeMenuCode(value?: string) {
  return value?.trim() || '';
}

function getEnabledMenuNodes<T extends { enabled: boolean }>(nodes: T[] | undefined) {
  return (nodes ?? []).filter((node) => node.enabled !== false);
}

function isUseflagEnabled(useflag: number | string | undefined, enabled: boolean) {
  if (useflag === 1 || useflag === '1') {
    return true;
  }

  if (useflag === 0 || useflag === '0') {
    return false;
  }

  return enabled;
}

function normalizeModuleType(value?: string) {
  return value?.trim().toLowerCase() || '';
}

const DETAIL_BOARD_CLIPBOARD_PREFIX = '__LS_DETAIL_BOARD_COLUMNS__';
const BUSINESS_TYPE_OPTIONS: Array<{ value: BusinessType; label: string; icon: string }> = [
  { value: 'document', label: '单表', icon: 'table_view' },
  { value: 'table', label: '单据', icon: 'receipt_long' },
  { value: 'tree', label: '树形单表', icon: 'account_tree' },
];
const MODULE_TYPE_OPTIONS = BUSINESS_TYPE_OPTIONS.filter((option) => option.value !== 'tree');
const MENU_MODULE_TYPE_PROFILES: Record<'bill' | 'single-table', MenuModuleTypeProfile> = {
  'single-table': {
    badgeClass:
      'border-sky-100 bg-sky-50 text-sky-600 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-300',
    businessType: 'document',
    icon: 'table_view',
    label: '单表',
  },
  bill: {
    badgeClass:
      'border-indigo-100 bg-indigo-50 text-indigo-600 dark:border-indigo-900/50 dark:bg-indigo-950/30 dark:text-indigo-300',
    businessType: 'table',
    icon: 'receipt_long',
    label: '单据',
  },
};

function getMenuModuleTypeProfile(moduleType?: string): MenuModuleTypeProfile | null {
  const normalizedType = normalizeModuleType(moduleType);

  if (normalizedType === 'single-table' || normalizedType === 'bill') {
    return MENU_MODULE_TYPE_PROFILES[normalizedType];
  }

  return null;
}
const MODULE_GUIDE_PROFILES: Record<BusinessType, {
  label: string;
  intro: string;
  configTable: string;
  configTableDesc: string;
  keyFields: string[];
  relatedTables: string[];
}> = {
  document: {
    label: '单表',
    intro: '对应旧平台的单表模块配置，菜单信息将落到 p_systemdlltab，并继续向字段、条件、右键、颜色等子表扩展。',
    configTable: 'p_systemdlltab',
    configTableDesc: '单表主模块信息',
    keyFields: ['DllCoid', 'ToolsName', 'SQL', 'SQLDT1', 'formKey', 'condKey'],
    relatedTables: ['p_systemwordbooktab', 'p_systembillsourcecond', 'p_systempopupmenu', 'p_systemwordbookcolor'],
  },
  table: {
    label: '单据',
    intro: '对应旧平台的单据模块配置，菜单信息将落到 p_systembilltype，再挂单据主信息、明细、来源和流程。',
    configTable: 'p_systembilltype',
    configTableDesc: '单据模块主信息',
    keyFields: ['模块编码', '模块名称', '模块主表', '模块明细表', '明细表sql', '模块配置关联字段'],
    relatedTables: ['p_systembillinfo', 'p_systembilldetail', 'p_systembillsource', 'p_systempopupmenu'],
  },
  tree: {
    label: '树形单表',
    intro: '树形单表仍归属单表体系，主配置表与单表一致，后续通过树字段和动态 SQL 扩展左侧树结构。',
    configTable: 'p_systemdlltab',
    configTableDesc: '单表主模块信息',
    keyFields: ['DllCoid', 'ToolsName', 'SQL', 'TreeSQL', 'TreeTableExpand', 'MainModuleCodeField'],
    relatedTables: ['p_systemwordbooktab', 'p_systemwordbookgrid', 'p_systembillsourcecond', 'p_systempopupmenu'],
  },
};
const DOCUMENT_MENU_DEFAULTS: ModuleMenuDraft = {
  moduleCode: '',
  moduleName: '',
  mainTableName: '',
  mainSql: '',
  formKey: '',
  condKey: '',
  overbackKey: '',
  isReport: 'false',
};
const BILLTYPE_MENU_DEFAULTS: ModuleMenuDraft = {
  typeCode: '',
  typeName: '',
  billSeq: '',
  formKey: '',
  overbackKey: '',
  remark: '',
  masterTable: '',
  detailTable: '',
  masterSql: '',
  detailSql: '',
};
const DOCUMENT_MENU_SECTIONS: ModuleMenuSectionSchema[] = [
  {
    title: '主配置标识',
    description: '对应 p_systemdlltab 的主键、名称和关联标识。',
    fields: [
      { key: 'moduleCode', label: '模块编码', tableField: 'DllCoid', kind: 'text', placeholder: '唯一模块编码' },
      { key: 'moduleName', label: '模块名称', tableField: 'ToolsName', kind: 'text', placeholder: '模块中文名' },
      { key: 'formKey', label: '配置关联值', tableField: 'formKey', kind: 'text', placeholder: '模块配置关联值' },
      { key: 'condKey', label: '条件关联值', tableField: 'condKey', kind: 'text', placeholder: '条件配置关联值' },
      { key: 'overbackKey', label: '回写关联值', tableField: 'overbackKey', kind: 'text', placeholder: '回写配置关联值' },
    ],
  },
  {
    title: '数据源配置',
    description: '单表模块最关键的是主表名和主表 SQL。',
    fields: [
      { key: 'mainTableName', label: '主表名', tableField: 'SQLDT1', kind: 'text', placeholder: '例如：erp_cost_control' },
      { key: 'mainSql', label: '主表 SQL', tableField: 'SQL', kind: 'textarea', rows: 5, span: 'full', placeholder: '输入或 AI 生成主表 SQL' },
    ],
  },
  {
    title: '运行标识',
    description: '保留单表模块的基础运行标识。',
    fields: [
      { key: 'isReport', label: '报表模式', tableField: 'isReport', kind: 'switch', hint: '开启后按报表模式处理当前单表模块' },
    ],
  },
];
const BILLTYPE_MENU_SECTIONS: ModuleMenuSectionSchema[] = [
  {
    title: '单据主标识',
    description: '对应 p_systembilltype 的主键信息和基础标识。',
    fields: [
      { key: 'typeCode', label: '模块编码', tableField: 'typeCode', kind: 'text', placeholder: '单据模块编码' },
      { key: 'typeName', label: '模块名称', tableField: 'typeName', kind: 'text', placeholder: '单据模块名称' },
      { key: 'billSeq', label: '模块标识', tableField: 'billSeq', kind: 'text', placeholder: '默认与模块编码一致' },
      { key: 'formKey', label: '配置关联字段', tableField: 'formKey', kind: 'text', placeholder: 'formKey' },
      { key: 'overbackKey', label: '回写关联字段', tableField: 'overbackKey', kind: 'text', placeholder: 'overbackKey' },
      { key: 'remark', label: '模块说明', tableField: 'remark', kind: 'textarea', rows: 4, span: 'full', placeholder: '描述单据场景和业务边界' },
    ],
  },
  {
    title: '主表与明细',
    description: '单据模式会同时绑定主表、明细表和对应 SQL。',
    fields: [
      { key: 'masterTable', label: '模块主表', tableField: 'masterTable', kind: 'text', placeholder: '例如：erp_cost_bill' },
      { key: 'detailTable', label: '模块明细表', tableField: 'detailTable', kind: 'text', placeholder: '例如：erp_cost_bill_detail' },
      { key: 'masterSql', label: '主表 SQL', tableField: 'masterSql', kind: 'textarea', rows: 5, span: 'full' },
      { key: 'detailSql', label: '明细 SQL', tableField: 'detailSql', kind: 'textarea', rows: 5, span: 'full' },
    ],
  },
];

const MENU_DEFAULT_COMMON_FIELD_KEYS: Record<BusinessType, string[]> = {
  document: ['moduleCode', 'moduleName', 'mainTableName', 'mainSql', 'formKey', 'condKey'],
  table: ['typeCode', 'typeName', 'masterTable', 'detailTable', 'masterSql', 'detailSql', 'formKey'],
  tree: ['moduleCode', 'moduleName', 'mainTableName', 'mainSql', 'formKey', 'condKey'],
};

function filterMenuSectionsByKeys(sections: ModuleMenuSectionSchema[], keys: string[]) {
  const keySet = new Set(keys);
  return sections
    .map((section) => ({
      ...section,
      fields: section.fields.filter((field) => keySet.has(field.key)),
    }))
    .filter((section) => section.fields.length > 0);
}

function toDraftText(value: unknown) {
  return value === null || value === undefined ? '' : String(value);
}

function toDraftSwitch(value: unknown) {
  if (value === true || value === 1 || value === '1') {
    return 'true';
  }

  if (typeof value === 'string' && ['true', 'yes', 'y'].includes(value.trim().toLowerCase())) {
    return 'true';
  }

  return 'false';
}

function toPersistedSwitch(value: ModuleMenuValue | undefined) {
  return value === true || value === 'true' ? 1 : 0;
}

function mapSingleTableModuleToDraft(module: SingleTableModuleConfigDto): ModuleMenuDraft {
  return {
    ...DOCUMENT_MENU_DEFAULTS,
    condKey: toDraftText(module.conditionKey),
    formKey: toDraftText(module.formKey),
    isReport: toDraftSwitch(module.isReport),
    mainSql: toDraftText(module.querySql),
    mainTableName: toDraftText(module.mainTable),
    moduleCode: toDraftText(module.dllCoId),
    moduleName: toDraftText(module.moduleName),
    overbackKey: toDraftText(module.overbackKey),
  };
}

function mapBillTypeToDraft(type: BillTypeConfigDto): ModuleMenuDraft {
  return {
    ...BILLTYPE_MENU_DEFAULTS,
    billSeq: toDraftText(type.billSequence),
    detailSql: toDraftText(type.detailSql),
    detailTable: toDraftText(type.detailTable),
    formKey: toDraftText(type.formKey),
    masterSql: toDraftText(type.masterSql),
    masterTable: toDraftText(type.masterTable),
    overbackKey: toDraftText(type.overbackKey),
    remark: toDraftText(type.remark),
    typeCode: toDraftText(type.typeCode),
    typeName: toDraftText(type.typeName),
  };
}

function mapDocumentDraftToPayload(draft: ModuleMenuDraft) {
  return {
    condkey: toDraftText(draft.condKey),
    dllcoid: toDraftText(draft.moduleCode).trim(),
    formkey: toDraftText(draft.formKey),
    isreport: toPersistedSwitch(draft.isReport),
    overbackkey: toDraftText(draft.overbackKey),
    sql: toDraftText(draft.mainSql),
    sqldt1: toDraftText(draft.mainTableName),
    toolsname: toDraftText(draft.moduleName),
  };
}

function mapBillTypeDraftToPayload(draft: ModuleMenuDraft) {
  return {
    billseq: toDraftText(draft.billSeq),
    detailtable: toDraftText(draft.detailTable),
    detailsql: toDraftText(draft.detailSql),
    formkey: toDraftText(draft.formKey),
    mastertable: toDraftText(draft.masterTable),
    mastersql: toDraftText(draft.masterSql),
    overbackkey: toDraftText(draft.overbackKey),
    remark: toDraftText(draft.remark),
    typecode: toDraftText(draft.typeCode).trim(),
    typename: toDraftText(draft.typeName),
  };
}

const FIELD_TYPE_OPTIONS = ['文本', '数字', '下拉框', '搜索框', '日期框', '单选框', '多选框', '树形节点关联'];
const COLUMN_ALIGN_OPTIONS = ['左对齐', '居中', '右对齐'];
const TABLE_TYPE_OPTIONS = ['普通表格', '多表头', '树表格'];
const GRID_COLOR_RULE_OPERATOR_OPTIONS = ['等于', '包含', '大于', '小于', '大于等于', '小于等于'];
const BILL_SOURCE_CONFIG_TYPE_OPTIONS = ['普通来源', '弹窗来源', '明细来源'];
const BILL_SOURCE_TYPE_OPTIONS = ['SQL', '视图', '接口'];
const TABLE_COLUMN_MIN_WIDTH = 48;
const TABLE_COLUMN_AUTO_FIT_MAX_WIDTH = 680;
const TABLE_COLUMN_RESIZE_MAX_WIDTH = 2000;
const BILL_FORM_DEFAULT_WIDTH = 236;
const BILL_FORM_MIN_WIDTH = 168;
const BILL_FORM_MAX_WIDTH = 560;
const BILL_FORM_DEFAULT_LABEL_WIDTH = 72;
const BILL_FORM_DEFAULT_FONT_SIZE = 12;
const BILL_FORM_LAYOUT_PADDING_X = 28;
const BILL_FORM_LAYOUT_PADDING_Y = 28;
const BILL_FORM_LAYOUT_GAP_X = 24;
const BILL_FORM_LAYOUT_GAP_Y = 18;
const BILL_FORM_LAYOUT_COLUMNS = 3;
const BILL_FORM_ROW_HEIGHT = 56;
const BILL_FORM_SNAP_SIZE = 8;
const BILL_FORM_ALIGN_THRESHOLD = 10;
const EMPTY_BILL_FIELD_GUIDES: BillFieldGuideState = {
  lines: [],
  gap: null,
};

const DETAIL_FILL_TYPE_OPTIONS = [
  { value: '表格', label: '表格', icon: 'table_rows', description: '适合字段型明细维护' },
  { value: '树表格', label: '树表格', icon: 'account_tree', description: '适合层级型明细展示' },
  { value: '图表', label: '图表', icon: 'bar_chart', description: '适合统计型结果呈现' },
  { value: '网页', label: '网页', icon: 'language', description: '适合外部页面嵌入' },
];
const DETAIL_BOARD_THEME_OPTIONS = [
  { value: 'aurora', label: '星雾玻璃', hint: '蓝青渐层，适合主档详情' },
  { value: 'sunset', label: '日落暖光', hint: '暖橙层次，更偏业务看板' },
  { value: 'jade', label: '青玉留白', hint: '轻绿色块，适合信息分组' },
];
const DETAIL_BOARD_THEME_STYLES: Record<string, {
  tableSurface: string;
  tableCanvas: string;
  badge: string;
  hero: string;
  heroBadge: string;
  groupShell: string;
  groupLabel: string;
  groupMetric: string;
  groupItem: string;
  groupValue: string;
  listCard: string;
}> = {
  aurora: {
    tableSurface: 'bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.08),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.1),transparent_28%)]',
    tableCanvas: 'bg-[radial-gradient(circle_at_top_left,rgba(191,219,254,0.36),transparent_34%),linear-gradient(180deg,rgba(245,250,255,0.98),rgba(249,252,255,0.96))]',
    badge: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-400/20 dark:bg-sky-500/10 dark:text-sky-200',
    hero: 'border-[#d7e7fb] bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_38%),linear-gradient(160deg,rgba(239,246,255,0.96),rgba(255,255,255,0.98))]',
    heroBadge: 'bg-white/88 text-sky-700 dark:bg-slate-900/72 dark:text-sky-200',
    groupShell: 'border-[#dbeafe] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,250,255,0.96))]',
    groupLabel: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-200',
    groupMetric: 'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-200',
    groupItem: 'border-[#dbeafe] bg-white/94 dark:border-slate-700 dark:bg-slate-900/58',
    groupValue: 'text-slate-800 dark:text-slate-100',
    listCard: 'hover:border-sky-300/60 hover:shadow-[0_24px_40px_-32px_rgba(59,130,246,0.3)]',
  },
  sunset: {
    tableSurface: 'bg-[radial-gradient(circle_at_top_left,rgba(251,146,60,0.08),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(244,114,182,0.1),transparent_30%)]',
    tableCanvas: 'bg-[radial-gradient(circle_at_top_left,rgba(254,215,170,0.34),transparent_34%),linear-gradient(180deg,rgba(255,247,240,0.98),rgba(255,250,245,0.96))]',
    badge: 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-400/20 dark:bg-orange-500/10 dark:text-orange-200',
    hero: 'border-[#f8d7bf] bg-[radial-gradient(circle_at_top_left,rgba(251,146,60,0.18),transparent_38%),linear-gradient(160deg,rgba(255,247,237,0.96),rgba(255,255,255,0.98))]',
    heroBadge: 'bg-white/88 text-orange-700 dark:bg-slate-900/72 dark:text-orange-200',
    groupShell: 'border-[#fde7d5] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,248,243,0.96))]',
    groupLabel: 'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-200',
    groupMetric: 'bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-200',
    groupItem: 'border-[#fde7d5] bg-white/94 dark:border-slate-700 dark:bg-slate-900/58',
    groupValue: 'text-slate-800 dark:text-slate-100',
    listCard: 'hover:border-orange-300/60 hover:shadow-[0_24px_40px_-32px_rgba(251,146,60,0.3)]',
  },
  jade: {
    tableSurface: 'bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.08),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(20,184,166,0.1),transparent_28%)]',
    tableCanvas: 'bg-[radial-gradient(circle_at_top_left,rgba(167,243,208,0.32),transparent_34%),linear-gradient(180deg,rgba(242,252,248,0.98),rgba(248,253,251,0.96))]',
    badge: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-200',
    hero: 'border-[#caeddc] bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_38%),linear-gradient(160deg,rgba(236,253,245,0.96),rgba(255,255,255,0.98))]',
    heroBadge: 'bg-white/88 text-emerald-700 dark:bg-slate-900/72 dark:text-emerald-200',
    groupShell: 'border-[#d1fae5] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(243,252,248,0.96))]',
    groupLabel: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200',
    groupMetric: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-200',
    groupItem: 'border-[#d1fae5] bg-white/94 dark:border-slate-700 dark:bg-slate-900/58',
    groupValue: 'text-slate-800 dark:text-slate-100',
    listCard: 'hover:border-emerald-300/60 hover:shadow-[0_24px_40px_-32px_rgba(16,185,129,0.28)]',
  },
};
const DETAIL_BOARD_THEME_VARS: Record<string, Record<string, string>> = {
  aurora: {
    '--workspace-accent': '#2563eb',
    '--workspace-accent-strong': '#1d4ed8',
    '--workspace-accent-soft': 'rgba(37,99,235,0.12)',
    '--workspace-accent-soft-strong': 'rgba(37,99,235,0.18)',
    '--workspace-accent-tint': 'rgba(239,246,255,0.92)',
    '--workspace-accent-surface': 'rgba(245,250,255,0.96)',
    '--workspace-accent-border': 'rgba(37,99,235,0.18)',
    '--workspace-accent-border-strong': 'rgba(96,165,250,0.44)',
    '--workspace-accent-shadow': 'rgba(37,99,235,0.34)',
  },
  sunset: {
    '--workspace-accent': '#ea580c',
    '--workspace-accent-strong': '#c2410c',
    '--workspace-accent-soft': 'rgba(249,115,22,0.12)',
    '--workspace-accent-soft-strong': 'rgba(249,115,22,0.18)',
    '--workspace-accent-tint': 'rgba(255,247,237,0.94)',
    '--workspace-accent-surface': 'rgba(255,249,244,0.96)',
    '--workspace-accent-border': 'rgba(249,115,22,0.2)',
    '--workspace-accent-border-strong': 'rgba(251,146,60,0.46)',
    '--workspace-accent-shadow': 'rgba(234,88,12,0.32)',
  },
  jade: {
    '--workspace-accent': '#059669',
    '--workspace-accent-strong': '#047857',
    '--workspace-accent-soft': 'rgba(5,150,105,0.12)',
    '--workspace-accent-soft-strong': 'rgba(5,150,105,0.18)',
    '--workspace-accent-tint': 'rgba(236,253,245,0.94)',
    '--workspace-accent-surface': 'rgba(244,253,249,0.96)',
    '--workspace-accent-border': 'rgba(5,150,105,0.2)',
    '--workspace-accent-border-strong': 'rgba(52,211,153,0.42)',
    '--workspace-accent-shadow': 'rgba(5,150,105,0.28)',
  },
};
const MODULE_INTRO_DEFAULT_TITLE = '成本控制模块详细说明';
const MODULE_INTRO_DEFAULT_HTML = `
  <p class="module-intro-lead">成本控制模块是财务管理子系统的核心组件，面向企业经营分析、预算约束和执行监控场景，提供从业务发生到经营复盘的一体化成本治理能力。</p>
  <div class="module-intro-highlight">
    <div class="module-intro-highlight-eyebrow">模块价值</div>
    <p>围绕成本核算、预算控制、差异分析与预测预警形成闭环，让单据、台账、报表和决策建议在同一套业务模型里协同流转。</p>
    <div class="module-intro-pill-row">
      <span>成本核算</span>
      <span>预算控制</span>
      <span>预测预警</span>
    </div>
  </div>
  <h3>核心功能</h3>
  <ul>
    <li><strong>成本核算：</strong>支持标准成本法、实际成本法和作业成本法，自动归集并分配成本费用。</li>
    <li><strong>预算控制：</strong>建立多维预算体系，实时监控执行进度，并提供超预算预警。</li>
    <li><strong>成本分析：</strong>支持趋势、结构、差异等多视角分析，帮助快速识别异常波动。</li>
    <li><strong>成本预测：</strong>结合历史数据和 AI 模型，提供面向管理层的预测与建议。</li>
  </ul>
  <h3>应用价值</h3>
  <p>模块可与采购、库存、生产、财务等环节联动，把分散的成本数据汇总到统一业务语义下，提升核算效率、分析准确性和经营响应速度。</p>
`;
const DEFAULT_BILL_SOURCE_DETAIL = [
  'material_code',
  'material_name',
  'material_spec',
  'material_unit',
  'material_price',
].join('\n');
const INITIAL_BILL_SOURCE: BillSourceEntry = {
  id: 'bill-source',
  configType: '普通来源',
  sourceName: '物料基础来源表',
  sourceSql: 'SELECT * FROM material_archive_source',
  sourceDetail: DEFAULT_BILL_SOURCE_DETAIL,
  sourceType: 'SQL',
};

function escapeHtmlAttribute(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function getWorkspaceThemeVars(theme?: string): React.CSSProperties {
  return DETAIL_BOARD_THEME_VARS[theme || 'aurora'] ?? DETAIL_BOARD_THEME_VARS.aurora;
}

function getBillFieldLayout(index: number, width = BILL_FORM_DEFAULT_WIDTH) {
  const columnIndex = index % BILL_FORM_LAYOUT_COLUMNS;
  const rowIndex = Math.floor(index / BILL_FORM_LAYOUT_COLUMNS);
  return {
    canvasX: BILL_FORM_LAYOUT_PADDING_X + columnIndex * (width + BILL_FORM_LAYOUT_GAP_X),
    canvasY: BILL_FORM_LAYOUT_PADDING_Y + rowIndex * (BILL_FORM_ROW_HEIGHT + BILL_FORM_LAYOUT_GAP_Y),
    labelWidth: BILL_FORM_DEFAULT_LABEL_WIDTH,
    fontSize: BILL_FORM_DEFAULT_FONT_SIZE,
    sourceTable: 'bill-source',
    sourceField: '',
  };
}

export default function Dashboard({ currentUserName, onLogout }: DashboardProps) {
  const debugParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const currentUserAvatarText = currentUserName.trim().slice(0, 1) || '人';
  const debugStepParam = Number(debugParams?.get('step') || 1);
  const initialConfigStep = Number.isFinite(debugStepParam) ? Math.min(6, Math.max(1, debugStepParam)) : 1;
  const initialConfigOpen = debugParams?.get('config') === '1' || debugParams?.has('step') || false;
  const initialDetailPreview = debugParams?.get('detailPreview') === '1';
  const initialBusinessType = BUSINESS_TYPE_OPTIONS.some((option) => option.value === debugParams?.get('mode'))
    ? (String(debugParams?.get('mode')) as BusinessType)
    : 'document';
  const initialWorkspaceTheme = DETAIL_BOARD_THEME_OPTIONS.some((option) => option.value === debugParams?.get('theme'))
    ? String(debugParams?.get('theme'))
    : 'aurora';
  const [isSubsystemOpen, setIsSubsystemOpen] = useState(true);
  const [expandedSubsystemId, setExpandedSubsystemId] = useState<string | null>(null);
  const [subsystemMenus, setSubsystemMenus] = useState<BackendSubsystemNode[]>([]);
  const [activeSubsystem, setActiveSubsystem] = useState('');
  const [activeFirstLevelMenuId, setActiveFirstLevelMenuId] = useState('');
  const [secondLevelMenus, setSecondLevelMenus] = useState<BackendMenuNode[]>([]);
  const [isLoadingSubsystemMenus, setIsLoadingSubsystemMenus] = useState(true);
  const [isLoadingSecondLevelMenus, setIsLoadingSecondLevelMenus] = useState(false);
  const [menuLoadError, setMenuLoadError] = useState<string | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(initialConfigOpen);
  const [configStep, setConfigStep] = useState(initialConfigStep);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  // Step 1: Common Functions
  const [commonFuncs, setCommonFuncs] = useState<string[]>(['import', 'export']);
  const [isFuncPopoverOpen, setIsFuncPopoverOpen] = useState(false);
  const [businessType, setBusinessType] = useState<BusinessType>(initialBusinessType);
  const [menuInfoTab, setMenuInfoTab] = useState<'common' | 'advanced'>('common');
  const [menuPinnedFields, setMenuPinnedFields] = useState<Record<BusinessType, string[]>>(() => ({
    document: [...MENU_DEFAULT_COMMON_FIELD_KEYS.document],
    table: [...MENU_DEFAULT_COMMON_FIELD_KEYS.table],
    tree: [...MENU_DEFAULT_COMMON_FIELD_KEYS.tree],
  }));
  const [documentMenuDraft, setDocumentMenuDraft] = useState<ModuleMenuDraft>(DOCUMENT_MENU_DEFAULTS);
  const [billtypeMenuDraft, setBilltypeMenuDraft] = useState<ModuleMenuDraft>(BILLTYPE_MENU_DEFAULTS);
  const [activeConfigMenu, setActiveConfigMenu] = useState<BackendMenuNode | null>(null);
  const [deletingMenuId, setDeletingMenuId] = useState<string | null>(null);
  const [pendingDeleteMenu, setPendingDeleteMenu] = useState<BackendMenuNode | null>(null);
  const [isMenuInfoLoading, setIsMenuInfoLoading] = useState(false);
  const [isMenuInfoSaving, setIsMenuInfoSaving] = useState(false);
  const [menuInfoError, setMenuInfoError] = useState<string | null>(null);
  const currentModuleGuide = MODULE_GUIDE_PROFILES[businessType] ?? MODULE_GUIDE_PROFILES.document;
  const toggleFunc = (id: string) => setCommonFuncs(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const funcOptions = [
    { id: 'import', name: '数据导入', icon: 'upload_file' },
    { id: 'export', name: '数据导出', icon: 'download' },
    { id: 'print', name: '打印模板', icon: 'print' },
    { id: 'approve', name: '审批流', icon: 'verified' },
    { id: 'attach', name: '附件管理', icon: 'attachment' },
  ];
  const currentMenuSections = businessType === 'table' ? BILLTYPE_MENU_SECTIONS : DOCUMENT_MENU_SECTIONS;
  const currentMenuDraft = businessType === 'table' ? billtypeMenuDraft : documentMenuDraft;
  const activeConfigModuleKey = normalizeMenuCode(activeConfigMenu?.purviewId);
  const isMenuFieldFilled = (field: ModuleMenuFieldSchema, value: ModuleMenuValue | undefined) => {
    if (field.kind === 'switch') return value === 'true';
    return String(value ?? '').trim().length > 0;
  };
  const filledMenuFieldCount = currentMenuSections.reduce((total, section) => {
    return total + section.fields.filter((field) => {
      const value = currentMenuDraft[field.key];
      return isMenuFieldFilled(field, value);
    }).length;
  }, 0);
  const currentMenuFieldEntries = useMemo(
    () =>
      currentMenuSections.flatMap((section) =>
        section.fields.map((field) => ({
          sectionTitle: section.title,
          sectionDescription: section.description,
          field,
        })),
      ),
    [currentMenuSections],
  );
  const currentMenuFieldMap = useMemo(
    () => new Map(currentMenuFieldEntries.map((entry) => [entry.field.key, entry.field])),
    [currentMenuFieldEntries],
  );
  const currentPinnedMenuKeys = useMemo(() => {
    const defaultKeys = MENU_DEFAULT_COMMON_FIELD_KEYS[businessType] ?? MENU_DEFAULT_COMMON_FIELD_KEYS.document;
    const preferredKeys = menuPinnedFields[businessType] ?? defaultKeys;
    const availableKeys = new Set(currentMenuFieldEntries.map((entry) => entry.field.key));
    return preferredKeys.filter((key, index) => availableKeys.has(key) && preferredKeys.indexOf(key) === index);
  }, [businessType, currentMenuFieldEntries, menuPinnedFields]);
  const currentPinnedMenuKeySet = useMemo(() => new Set(currentPinnedMenuKeys), [currentPinnedMenuKeys]);
  const currentAdvancedMenuKeys = useMemo(() => {
    return currentMenuFieldEntries
      .map((entry) => entry.field.key)
      .filter((key) => !currentPinnedMenuKeySet.has(key));
  }, [currentMenuFieldEntries, currentPinnedMenuKeySet]);
  const currentCommonMenuSections = useMemo(
    () => filterMenuSectionsByKeys(currentMenuSections, currentPinnedMenuKeys),
    [currentMenuSections, currentPinnedMenuKeys],
  );
  const currentAdvancedMenuSections = useMemo(
    () => filterMenuSectionsByKeys(currentMenuSections, currentAdvancedMenuKeys),
    [currentAdvancedMenuKeys, currentMenuSections],
  );
  const commonFilledMenuFieldCount = useMemo(() => {
    return currentPinnedMenuKeys.reduce((total, key) => {
      const field = currentMenuFieldMap.get(key);
      if (!field) return total;
      return total + (isMenuFieldFilled(field, currentMenuDraft[key]) ? 1 : 0);
    }, 0);
  }, [currentMenuDraft, currentMenuFieldMap, currentPinnedMenuKeys]);
  const advancedFilledMenuFieldCount = useMemo(() => {
    return currentAdvancedMenuKeys.reduce((total, key) => {
      const field = currentMenuFieldMap.get(key);
      if (!field) return total;
      return total + (isMenuFieldFilled(field, currentMenuDraft[key]) ? 1 : 0);
    }, 0);
  }, [currentAdvancedMenuKeys, currentMenuDraft, currentMenuFieldMap]);

  // Step 2: Editor
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const titleEditorRef = useRef<HTMLHeadingElement>(null);
  const moduleIntroSelectionRef = useRef<Range | null>(null);
  const moduleIntroSelectedImageRef = useRef<HTMLElement | null>(null);
  const moduleIntroImageResizeRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const moduleIntroTitleValueRef = useRef(MODULE_INTRO_DEFAULT_TITLE);
  const moduleIntroBodyValueRef = useRef(MODULE_INTRO_DEFAULT_HTML);
  const [moduleIntroBlockType, setModuleIntroBlockType] = useState<'paragraph' | 'h1' | 'h2' | 'h3'>('paragraph');
  const [moduleIntroSelectedImageWidth, setModuleIntroSelectedImageWidth] = useState<number | null>(null);

  // Step 3: Survey
  const [surveyStep, setSurveyStep] = useState(0);
  const [surveyAnswers, setSurveyAnswers] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [surveyPlan, setSurveyPlan] = useState<SurveyPlan | null>(null);
  const [surveyPlanModel, setSurveyPlanModel] = useState('');
  const [surveyError, setSurveyError] = useState<string | null>(null);
  const [isGeneratingSqlDraft, setIsGeneratingSqlDraft] = useState(false);
  const [isTranslatingIdentifiers, setIsTranslatingIdentifiers] = useState(false);

  // Step 4: Table Builder
  const [isFullscreenEditor, setIsFullscreenEditor] = useState(false);
  const [isFullscreenConfig, setIsFullscreenConfig] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const markStepCompleted = (stepId: number) => {
    setCompletedSteps((prev) => (prev.includes(stepId) ? prev : [...prev, stepId]));
  };

  const execRichTextCommand = (command: string, value?: string) => {
    const richDocument = document as Document & {
      execCommand?: (commandId: string, showUI?: boolean, value?: string) => boolean;
    };
    return richDocument.execCommand ? richDocument.execCommand(command, false, value) : false;
  };
  const getModuleIntroSelectionAnchor = (node: Node | null) => {
    if (!node) return null;
    return node instanceof HTMLElement ? node : node.parentElement;
  };
  const updateModuleIntroBlockType = (node: Node | null) => {
    const anchor = getModuleIntroSelectionAnchor(node);
    const block = anchor?.closest('h1, h2, h3, p');
    const tagName = block?.tagName.toLowerCase();
    if (tagName === 'h1' || tagName === 'h2' || tagName === 'h3') {
      setModuleIntroBlockType(tagName);
      return;
    }
    setModuleIntroBlockType('paragraph');
  };
  const clampModuleIntroImageWidth = (width: number) => {
    const availableWidth = editorRef.current?.clientWidth ?? 860;
    return Math.max(180, Math.min(width, Math.max(220, availableWidth - 12)));
  };
  const buildModuleIntroImageHtml = (src: string, imageName: string, width = 420) => {
    const nextWidth = clampModuleIntroImageWidth(width);
    return `
      <figure class="module-intro-figure" data-module-intro-image="true" contenteditable="false" style="width:${nextWidth}px">
        <div class="module-intro-image-frame">
          <img src="${src}" alt="${imageName}" />
          <span class="module-intro-image-resize-handle" data-module-intro-image-resize-handle="true"></span>
        </div>
      </figure>
      <p><br></p>
    `;
  };
  const ensureModuleIntroImageStructure = (image: HTMLImageElement) => {
    const figure = image.closest('figure');
    if (!(figure instanceof HTMLElement)) return null;
    figure.classList.add('module-intro-figure');
    figure.dataset.moduleIntroImage = 'true';
    figure.setAttribute('contenteditable', 'false');

    let frame = figure.querySelector('.module-intro-image-frame');
    if (!(frame instanceof HTMLElement)) {
      frame = document.createElement('div');
      frame.className = 'module-intro-image-frame';
      image.parentNode?.insertBefore(frame, image);
      frame.appendChild(image);
    }

    if (!figure.querySelector('[data-module-intro-image-resize-handle="true"]')) {
      const handle = document.createElement('span');
      handle.className = 'module-intro-image-resize-handle';
      handle.dataset.moduleIntroImageResizeHandle = 'true';
      frame.appendChild(handle);
    }

    if (!figure.style.width) {
      figure.style.width = `${clampModuleIntroImageWidth(image.naturalWidth || image.width || 420)}px`;
    }

    return figure;
  };
  const normalizeModuleIntroImages = () => {
    if (!editorRef.current) return;
    editorRef.current.querySelectorAll('img').forEach((node) => {
      if (node instanceof HTMLImageElement) {
        ensureModuleIntroImageStructure(node);
      }
    });
  };
  const clearModuleIntroImageSelection = () => {
    if (moduleIntroSelectedImageRef.current) {
      moduleIntroSelectedImageRef.current.dataset.selected = 'false';
    }
    moduleIntroSelectedImageRef.current = null;
    setModuleIntroSelectedImageWidth(null);
  };
  const syncModuleIntroSelectedImageWidth = () => {
    if (!moduleIntroSelectedImageRef.current) {
      setModuleIntroSelectedImageWidth(null);
      return;
    }
    setModuleIntroSelectedImageWidth(Math.round(moduleIntroSelectedImageRef.current.getBoundingClientRect().width));
  };
  const selectModuleIntroImage = (figure: HTMLElement) => {
    if (moduleIntroSelectedImageRef.current && moduleIntroSelectedImageRef.current !== figure) {
      moduleIntroSelectedImageRef.current.dataset.selected = 'false';
    }
    moduleIntroSelectedImageRef.current = figure;
    figure.dataset.selected = 'true';
    syncModuleIntroSelectedImageWidth();
  };
  const applyModuleIntroImageWidth = (nextWidth: number) => {
    if (!moduleIntroSelectedImageRef.current) return;
    const width = clampModuleIntroImageWidth(nextWidth);
    moduleIntroSelectedImageRef.current.style.width = `${width}px`;
    syncModuleIntroSelectedImageWidth();
    syncModuleIntroDraft();
  };
  const handleModuleIntroImagePreset = (preset: 'small' | 'medium' | 'large' | 'full') => {
    if (!editorRef.current) return;
    if (preset === 'small') {
      applyModuleIntroImageWidth(280);
      return;
    }
    if (preset === 'medium') {
      applyModuleIntroImageWidth(420);
      return;
    }
    if (preset === 'large') {
      applyModuleIntroImageWidth(620);
      return;
    }
    applyModuleIntroImageWidth(editorRef.current.clientWidth - 12);
  };
  const syncModuleIntroDraft = () => {
    if (titleEditorRef.current) {
      const nextTitle = titleEditorRef.current.innerText.replace(/\s+/g, ' ').trim();
      moduleIntroTitleValueRef.current = nextTitle || MODULE_INTRO_DEFAULT_TITLE;
      if (!nextTitle) {
        titleEditorRef.current.innerText = MODULE_INTRO_DEFAULT_TITLE;
      }
    }
    if (editorRef.current) {
      normalizeModuleIntroImages();
      const nextHtml = editorRef.current.innerHTML.trim();
      moduleIntroBodyValueRef.current = nextHtml || '<p><br></p>';
      if (!nextHtml) {
        editorRef.current.innerHTML = '<p><br></p>';
      }
    }
  };
  const hydrateModuleIntroEditor = () => {
    if (titleEditorRef.current && !titleEditorRef.current.innerText.trim()) {
      titleEditorRef.current.innerText = moduleIntroTitleValueRef.current;
    }
    if (editorRef.current && !editorRef.current.innerHTML.trim()) {
      editorRef.current.innerHTML = moduleIntroBodyValueRef.current;
    }
    normalizeModuleIntroImages();
  };
  const focusModuleIntroEditorEnd = () => {
    if (!editorRef.current) return;
    const selection = window.getSelection();
    if (!selection) return;
    editorRef.current.focus();
    const range = document.createRange();
    range.selectNodeContents(editorRef.current);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
    moduleIntroSelectionRef.current = range.cloneRange();
    updateModuleIntroBlockType(range.startContainer);
  };
  const saveModuleIntroSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !editorRef.current) return;
    const range = selection.getRangeAt(0);
    if (!editorRef.current.contains(range.commonAncestorContainer)) return;
    moduleIntroSelectionRef.current = range.cloneRange();
    updateModuleIntroBlockType(range.startContainer);
  };
  const restoreModuleIntroSelection = () => {
    if (!editorRef.current) return false;
    const selection = window.getSelection();
    if (!selection) return false;
    editorRef.current.focus();
    if (moduleIntroSelectionRef.current) {
      selection.removeAllRanges();
      selection.addRange(moduleIntroSelectionRef.current);
      updateModuleIntroBlockType(moduleIntroSelectionRef.current.startContainer);
      return true;
    }
    focusModuleIntroEditorEnd();
    return true;
  };
  const applyModuleIntroCommand = (command: string, value?: string) => {
    if (!editorRef.current) return;
    restoreModuleIntroSelection();
    execRichTextCommand(command, value);
    syncModuleIntroDraft();
    saveModuleIntroSelection();
  };
  const insertModuleIntroHtml = (html: string) => {
    if (!editorRef.current) return;
    restoreModuleIntroSelection();
    execRichTextCommand('insertHTML', html);
    syncModuleIntroDraft();
    saveModuleIntroSelection();
  };
  const openModuleIntroImagePicker = () => {
    saveModuleIntroSelection();
    fileInputRef.current?.click();
  };
  const handleModuleIntroImageFiles = (files: Iterable<File> | null | undefined) => {
    const imageFile = Array.from(files ?? []).find((file) => file.type.startsWith('image/'));
    if (!imageFile) {
      showToast('请选择 PNG、JPG、SVG 等图片文件');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result;
      if (typeof src !== 'string') return;
      const imageName = escapeHtmlAttribute(imageFile.name.replace(/\.[^.]+$/, '') || '流程图');
      insertModuleIntroHtml(buildModuleIntroImageHtml(src, imageName));
      window.requestAnimationFrame(() => {
        if (!editorRef.current) return;
        const images = Array.from(editorRef.current.querySelectorAll('[data-module-intro-image="true"]'));
        const lastImage = images.at(-1);
        if (lastImage instanceof HTMLElement) {
          selectModuleIntroImage(lastImage);
          syncModuleIntroDraft();
        }
      });
      showToast('图片已插入模块介绍');
    };
    reader.readAsDataURL(imageFile);
  };
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleModuleIntroImageFiles(event.target.files);
    event.target.value = '';
  };
  const handleModuleIntroFormatChange = (nextType: 'paragraph' | 'h1' | 'h2' | 'h3') => {
    setModuleIntroBlockType(nextType);
    const formatValue = nextType === 'paragraph' ? '<p>' : `<${nextType}>`;
    applyModuleIntroCommand('formatBlock', formatValue);
  };
  const handleModuleIntroLinkInsert = () => {
    const selectedText = window.getSelection()?.toString().trim();
    if (!selectedText) {
      showToast('先选中文本，再插入链接');
      return;
    }
    const url = window.prompt('请输入链接地址', 'https://');
    if (!url) return;
    applyModuleIntroCommand('createLink', url);
  };
  const handleModuleIntroTableInsert = () => {
    insertModuleIntroHtml(
      `
        <div class="module-intro-table-wrap">
          <table class="module-intro-table">
            <thead>
              <tr><th>阶段</th><th>目标</th><th>说明</th></tr>
            </thead>
            <tbody>
              <tr><td>核算</td><td>统一口径</td><td>建立跨部门一致的成本归集规则。</td></tr>
              <tr><td>分析</td><td>识别异常</td><td>通过差异分析快速定位波动来源。</td></tr>
              <tr><td>预测</td><td>辅助决策</td><td>结合历史数据输出经营预警与建议。</td></tr>
            </tbody>
          </table>
        </div>
        <p><br></p>
      `,
    );
  };
  const polishModuleIntroContent = () => {
    if (!editorRef.current) return;
    const editor = editorRef.current;
    if (!editor.querySelector('.module-intro-highlight')) {
      const leadParagraph = editor.querySelector('p');
      const summary = (leadParagraph?.textContent || '围绕成本核算、预算控制与预测预警，形成结构化业务介绍。').trim();
      editor.insertAdjacentHTML(
        'afterbegin',
        `
          <div class="module-intro-highlight">
            <div class="module-intro-highlight-eyebrow">AI 润色摘要</div>
            <p>${escapeHtmlAttribute(summary.length > 96 ? `${summary.slice(0, 96)}...` : summary)}</p>
            <div class="module-intro-pill-row">
              <span>业务全景</span>
              <span>执行闭环</span>
              <span>经营分析</span>
            </div>
          </div>
        `,
      );
    }
    syncModuleIntroDraft();
    showToast('已优化模块介绍的结构层次');
  };
  const handleModuleIntroEditorMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null;
    if (!target) return;

    const resizeHandle = target.closest('[data-module-intro-image-resize-handle="true"]');
    if (resizeHandle instanceof HTMLElement) {
      const figure = resizeHandle.closest('[data-module-intro-image="true"]');
      if (!(figure instanceof HTMLElement)) return;
      event.preventDefault();
      event.stopPropagation();
      selectModuleIntroImage(figure);
      moduleIntroImageResizeRef.current = {
        startX: event.clientX,
        startWidth: figure.getBoundingClientRect().width,
      };
      return;
    }

    const figure = target.closest('[data-module-intro-image="true"]');
    if (figure instanceof HTMLElement) {
      event.preventDefault();
      selectModuleIntroImage(figure);
      return;
    }

    clearModuleIntroImageSelection();
  };

  useEffect(() => {
    if (configStep !== 3) return;
    const frameId = window.requestAnimationFrame(() => {
      hydrateModuleIntroEditor();
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [configStep, isFullscreenEditor]);

  useEffect(() => {
    const handleSelectionChange = () => {
      saveModuleIntroSelection();
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!moduleIntroImageResizeRef.current || !moduleIntroSelectedImageRef.current) return;
      event.preventDefault();
      const delta = event.clientX - moduleIntroImageResizeRef.current.startX;
      applyModuleIntroImageWidth(moduleIntroImageResizeRef.current.startWidth + delta);
    };
    const handleMouseUp = () => {
      if (!moduleIntroImageResizeRef.current) return;
      moduleIntroImageResizeRef.current = null;
      syncModuleIntroDraft();
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const resetSurveyFlow = () => {
    setSurveyStep(0);
    setSurveyAnswers([]);
    setIsGenerating(false);
    setSurveyPlan(null);
    setSurveyPlanModel('');
    setSurveyError(null);
  };

  const generateSurveyPlan = async (mode: string, dataSource: string) => {
    setSurveyStep(2);
    setSurveyAnswers([mode, dataSource]);
    setSurveyPlan(null);
    setSurveyPlanModel('');
    setSurveyError(null);
    setIsGenerating(true);

    try {
      const response = await requestSurveyPlan(mode, dataSource);
      setSurveyPlan(response.plan);
      setSurveyPlanModel(response.model);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'MiniMax 生成失败，请稍后再试。';
      setSurveyError(message);
      showToast(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const buildColumn = (prefix: string, index: number, overrides: Record<string, any> = {}) => ({
    id: `${prefix}_${Date.now()}_${index}`,
    name: `新字段 ${index}`,
    type: '文本',
    width: 104,
    ...getBillFieldLayout(index - 1, BILL_FORM_DEFAULT_WIDTH),
    required: false,
    visible: true,
    searchable: false,
    readonly: false,
    align: '左对齐',
    placeholder: '',
    defaultValue: '',
    dictCode: '',
    formula: '',
    relationSql: '',
    dynamicSql: '',
    helpText: '',
    ...overrides,
  });

  const buildConditionField = (index: number, overrides: Record<string, any> = {}) => ({
    id: `cond_${Date.now()}_${index}`,
    name: `条件 ${index}`,
    type: '文本',
    width: 220,
    required: false,
    visible: true,
    searchable: true,
    readonly: false,
    align: '左对齐',
    placeholder: '',
    defaultValue: '',
    dictCode: '',
    formula: '',
    relationSql: '',
    dynamicSql: '',
    helpText: '',
    ...overrides,
  });

  const normalizePopupMenuNumber = (value: any, fallback = 0) => {
    const nextValue = Number(value);
    return Number.isFinite(nextValue) ? nextValue : fallback;
  };

  const normalizeContextMenuItem = (item: Record<string, any> = {}, index = 1) => {
    const menuName = item.menuname ?? item.label ?? `右键功能 ${index}`;
    const templateName = item.dllname ?? item.actionKey ?? `action_${index}`;
    const conditionValue = item.menuCond ?? item.disabledCondition ?? '';

    return {
      id: item.id ?? `ctx_${Date.now()}_${index}`,
      tab: item.tab ?? '',
      label: menuName,
      menuname: menuName,
      dllname: templateName,
      actionKey: templateName,
      dllpar1: item.dllpar1 ?? '',
      dllpar2: item.dllpar2 ?? '',
      dllpar3: item.dllpar3 ?? '',
      dllpar4: item.dllpar4 ?? '',
      dllpar5: item.dllpar5 ?? '',
      dllpar6: item.dllpar6 ?? '',
      dllpar7: item.dllpar7 ?? '',
      dllpar8: item.dllpar8 ?? '',
      dllpar9: item.dllpar9 ?? '',
      dllpar10: item.dllpar10 ?? '',
      visible: normalizePopupMenuNumber(item.visible, 0),
      action: item.action ?? '',
      actiontype: normalizePopupMenuNumber(item.actiontype, 0),
      orderid: normalizePopupMenuNumber(item.orderid, index),
      beforeMsg: item.beforeMsg ?? '',
      msgSuccess: item.msgSuccess ?? '',
      msgError: item.msgError ?? '',
      menuid: item.menuid ?? '',
      menuCond: conditionValue,
      disabledCondition: conditionValue,
      menuType: normalizePopupMenuNumber(item.menuType, 0),
      visible1: normalizePopupMenuNumber(item.visible1, 0),
      visible2: normalizePopupMenuNumber(item.visible2, 0),
      maxwindow: normalizePopupMenuNumber(item.maxwindow, 0),
      ifRefresh: normalizePopupMenuNumber(item.ifRefresh, 0),
      showMobile: normalizePopupMenuNumber(item.showMobile, 0),
      privilegeOper: item.privilegeOper ?? '',
      DBClickEvent: normalizePopupMenuNumber(item.DBClickEvent, 0),
      ifMoreClick: normalizePopupMenuNumber(item.ifMoreClick, 0),
      ShowToolBar: normalizePopupMenuNumber(item.ShowToolBar, 0),
      defailtimage: item.defailtimage ?? '',
      showMode: normalizePopupMenuNumber(item.showMode, 0),
      addShowMode: normalizePopupMenuNumber(item.addShowMode, 0),
      stepcode: item.stepcode ?? '',
      Fremark: item.Fremark ?? '',
      mergeExec: normalizePopupMenuNumber(item.mergeExec, 0),
      isCopy: normalizePopupMenuNumber(item.isCopy, 0),
      beforeTab: item.beforeTab ?? '',
      isStartRun: normalizePopupMenuNumber(item.isStartRun, 0),
      isMrpClickBtn: normalizePopupMenuNumber(item.isMrpClickBtn, 0),
      disabled: Boolean(item.disabled),
    };
  };

  const buildContextMenuItem = (index: number, overrides: Record<string, any> = {}) =>
    normalizeContextMenuItem({
      id: `ctx_${Date.now()}_${index}`,
      orderid: index,
      ...overrides,
    }, index);

  const buildGridColorRule = (index: number, overrides: Record<string, any> = {}) => ({
    id: `color_${Date.now()}_${index}`,
    label: `颜色规则 ${index}`,
    disabled: false,
    field: '',
    operator: '等于',
    value: '',
    tab: '',
    textColor: '#9f1239',
    backgroundColor: '#ffe4e6',
    note: '',
    ...overrides,
  });

  const buildGridConfig = (mainSql: string, defaultQuery: string, overrides: Record<string, any> = {}) => ({
    mainSql,
    defaultQuery,
    sqlPrompt: '',
    tableType: '普通表格',
    contextMenuEnabled: false,
    contextMenuItems: [buildContextMenuItem(1, { label: '查看详情', actionKey: 'open-detail' })],
    colorRulesEnabled: false,
    colorRules: [],
    detailBoard: buildDetailBoardConfig(),
    ...overrides,
  });

  const buildDetailTabConfig = (overrides: Record<string, any> = {}) => ({
    relatedModule: '',
    relatedCondition: '',
    autoRefresh: true,
    disabled: false,
    disabledCondition: '',
    ...overrides,
  });

  function buildDetailBoardGroup(index: number, columnIds: string[] = [], overrides: Record<string, any> = {}) {
    const presets = [
      { name: '主信息', description: '适合放编号、名称、主抬头字段' },
      { name: '业务状态', description: '适合放状态、归属、业务阶段' },
      { name: '扩展补充', description: '适合放备注、说明和补充字段' },
    ];
    const preset = presets[index - 1] ?? { name: `信息分组 ${index}`, description: '用于详情流布局展示的一组字段' };

    return {
      id: `detail_group_${Date.now()}_${index}`,
      name: preset.name,
      description: preset.description,
      columnIds,
      columnsPerRow: 2,
      columnWidths: {},
      ...overrides,
    };
  }

  function createSuggestedDetailBoardGroups(columns: any[]) {
    const columnIds = columns.map((column) => column.id).filter(Boolean);

    if (columnIds.length === 0) {
      return [
        buildDetailBoardGroup(1),
        buildDetailBoardGroup(2, [], { name: '业务信息', description: '勾选字段后会按流式卡片自动排布' }),
      ];
    }

    const chunks = [
      columnIds.slice(0, 2),
      columnIds.slice(2, 5),
      columnIds.slice(5, 8),
    ].filter((chunk) => chunk.length > 0);

    return chunks.map((columnIdsChunk, index) => (
      buildDetailBoardGroup(index + 1, columnIdsChunk)
    ));
  }

  function buildDetailBoardConfig(columns: any[] = [], overrides: Record<string, any> = {}) {
    return {
      enabled: false,
      theme: 'aurora',
      sortColumnId: columns[0]?.id ?? null,
      groups: createSuggestedDetailBoardGroups(columns),
      ...overrides,
    };
  }

  function normalizeDetailBoardConfig(config: any, columns: any[] = []) {
    const availableColumnIds = new Set(columns.map((column) => column.id));
    const suggestedGroups = createSuggestedDetailBoardGroups(columns);
    const hasCustomGroups = Array.isArray(config?.groups);
    const rawGroups = hasCustomGroups ? config.groups : suggestedGroups;
    const normalizedGroups = rawGroups.map((group: any, index: number) => ({
      id: group?.id ?? buildDetailBoardGroup(index + 1).id,
      name: typeof group?.name === 'string' ? group.name : `信息分组 ${index + 1}`,
      description: group?.description ?? '',
      columnIds: Array.from(new Set((group?.columnIds ?? []).filter((columnId: string) => availableColumnIds.has(columnId)))),
      columnsPerRow: Math.max(1, Math.min(4, Number(group?.columnsPerRow) || 2)),
      columnWidths: Object.fromEntries(
        Object.entries(group?.columnWidths ?? {}).filter(([columnId, width]) => (
          availableColumnIds.has(columnId) && Number(width) > 0
        )),
      ),
    }));

    return {
      enabled: Boolean(config?.enabled),
      theme: DETAIL_BOARD_THEME_OPTIONS.some((option) => option.value === config?.theme) ? config.theme : 'aurora',
      sortColumnId: availableColumnIds.has(config?.sortColumnId) ? config.sortColumnId : columns[0]?.id ?? null,
      groups: hasCustomGroups ? normalizedGroups : suggestedGroups,
    };
  }

  function getDetailBoardTheme(theme?: string) {
    return DETAIL_BOARD_THEME_STYLES[theme || 'aurora'] ?? DETAIL_BOARD_THEME_STYLES.aurora;
  }

  const parseSqlFieldNames = (sql: string) => {
    const match = sql.match(/select\s+([\s\S]+?)\s+from/i);
    if (!match) return [];

    return Array.from(new Set(
      match[1]
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => {
          const aliasMatch = item.match(/\bas\s+([\[\]`"A-Za-z0-9_]+)/i);
          const rawName = aliasMatch?.[1] ?? item.split(/\s+/).pop() ?? item;
          return rawName
            .replace(/[\[\]`"]/g, '')
            .split('.')
            .pop()
            ?.trim() ?? '';
        })
        .filter(Boolean),
    ));
  };

  const normalizeColumn = (col: any) => ({
    ...getBillFieldLayout(0, BILL_FORM_DEFAULT_WIDTH),
    required: false,
    visible: true,
    searchable: false,
    readonly: false,
    align: '左对齐',
    placeholder: '',
    defaultValue: '',
    dictCode: '',
    formula: '',
    relationSql: '',
    dynamicSql: '',
    helpText: '',
    ...col,
  });

  const normalizeConditionField = (field: any) => ({
    required: false,
    visible: true,
    searchable: true,
    readonly: false,
    align: '左对齐',
    placeholder: '',
    defaultValue: '',
    dictCode: '',
    formula: '',
    relationSql: '',
    dynamicSql: '',
    helpText: '',
    ...field,
  });
  const [leftTableColumns, setLeftTableColumns] = useState<any[]>([]);
  const [leftTableConfig, setLeftTableConfig] = useState(
    buildGridConfig('', '', {
      tableType: '树表格',
      contextMenuItems: [],
      colorRules: [],
      detailBoard: buildDetailBoardConfig([], { enabled: false }),
    }),
  );
  const [leftFilterFields, setLeftFilterFields] = useState<any[]>([
    buildConditionField(1, { name: '节点名称', placeholder: '请输入节点名称', width: 220 }),
    buildConditionField(2, { name: '父节点', placeholder: '请输入父节点', width: 200 }),
  ]);
  const [mainTableColumns, setMainTableColumns] = useState([
    { id: 'm_col1', name: '物料编码', type: '文本', width: BILL_FORM_DEFAULT_WIDTH, sourceField: 'material_code', ...getBillFieldLayout(0, BILL_FORM_DEFAULT_WIDTH) },
    { id: 'm_col2', name: '物料名称', type: '文本', width: BILL_FORM_DEFAULT_WIDTH, sourceField: 'material_name', ...getBillFieldLayout(1, BILL_FORM_DEFAULT_WIDTH) },
    { id: 'm_col3', name: '规格型号', type: '文本', width: BILL_FORM_DEFAULT_WIDTH, sourceField: 'material_spec', ...getBillFieldLayout(2, BILL_FORM_DEFAULT_WIDTH) },
    { id: 'm_col4', name: '单位', type: '下拉框', width: BILL_FORM_DEFAULT_WIDTH, sourceField: 'material_unit', ...getBillFieldLayout(3, BILL_FORM_DEFAULT_WIDTH) },
    { id: 'm_col5', name: '单价', type: '数字', width: BILL_FORM_DEFAULT_WIDTH, sourceField: 'material_price', ...getBillFieldLayout(4, BILL_FORM_DEFAULT_WIDTH) },
  ]);
  const [detailTabs, setDetailTabs] = useState([{ id: 'tab1', name: '关联附件' }, { id: 'tab2', name: '操作日志' }]);
  const [activeTab, setActiveTab] = useState('tab1');
  const [tabFillTypes, setTabFillTypes] = useState<Record<string, string>>({ tab1: '表格', tab2: '表格' });
  const [mainTableConfig, setMainTableConfig] = useState(
    buildGridConfig('SELECT * FROM customer_archive', 'enable = 1', {
      contextMenuEnabled: true,
      contextMenuItems: [
        buildContextMenuItem(1, { label: '查看档案详情', actionKey: 'open-archive-detail' }),
        buildContextMenuItem(2, { label: '打开附件列表', actionKey: 'open-attachments' }),
      ],
      colorRulesEnabled: true,
      colorRules: [
        buildGridColorRule(1, { label: '高价物料', field: 'material_price', operator: '大于', value: '1000', textColor: '#9a3412', backgroundColor: '#ffedd5' }),
        buildGridColorRule(2, { label: '公斤单位', field: 'material_unit', operator: '等于', value: '公斤', textColor: '#1d4ed8', backgroundColor: '#dbeafe' }),
      ],
      detailBoard: buildDetailBoardConfig(mainTableColumns, {
        enabled: true,
        theme: 'aurora',
      }),
    }),
  );
  const [detailTableConfigs, setDetailTableConfigs] = useState<Record<string, any>>({
    tab1: buildGridConfig('SELECT * FROM customer_attachment', 'archive_id = ${id}', {
      contextMenuItems: [buildContextMenuItem(1, { label: '下载附件', actionKey: 'download-file' })],
      detailBoard: buildDetailBoardConfig([], { enabled: false, theme: 'jade' }),
    }),
    tab2: buildGridConfig('SELECT * FROM customer_log', 'archive_id = ${id}', {
      contextMenuItems: [buildContextMenuItem(1, { label: '查看日志详情', actionKey: 'open-log-detail' })],
      detailBoard: buildDetailBoardConfig([], { enabled: false, theme: 'sunset' }),
    }),
  });
  const [mainFilterFields, setMainFilterFields] = useState([
    buildConditionField(1, { name: '客户编号', placeholder: '请输入客户编号', width: 220 }),
    buildConditionField(2, { name: '客户全称', placeholder: '请输入客户全称', width: 240 }),
    buildConditionField(3, { name: '测试日期', type: '日期框', width: 180, placeholder: '请选择日期' }),
  ]);
  const [detailFilterFields, setDetailFilterFields] = useState<Record<string, any[]>>({
    tab1: [
      buildConditionField(1, { name: '附件名称', placeholder: '请输入附件名称', width: 220 }),
      buildConditionField(2, { name: '上传人', placeholder: '请输入上传人', width: 180 }),
    ],
    tab2: [
      buildConditionField(1, { name: '操作人', placeholder: '请输入操作人', width: 180 }),
      buildConditionField(2, { name: '操作时间', type: '日期框', placeholder: '请选择操作时间', width: 180 }),
    ],
  });
  const [detailTabConfigs, setDetailTabConfigs] = useState<Record<string, any>>({
    tab1: buildDetailTabConfig({ relatedModule: '附件管理', relatedCondition: 'archive_id = ${id}', autoRefresh: true }),
    tab2: buildDetailTabConfig({ relatedModule: '日志中心', relatedCondition: 'archive_id = ${id}', autoRefresh: false }),
  });
  const [inspectorTarget, setInspectorTarget] = useState<{
    kind:
      | 'none'
      | 'left-col'
      | 'main-col'
      | 'detail-col'
      | 'left-filter'
      | 'main-filter'
      | 'detail-filter'
      | 'detail-tab'
      | 'left-grid'
      | 'main-grid'
      | 'detail-grid'
      | 'source-grid'
      | 'workspace-theme'
      | 'main-context'
      | 'detail-context';
    id?: string | null;
  }>({ kind: 'main-grid' });
  const [inspectorPanelTab, setInspectorPanelTab] = useState<'common' | 'advanced' | 'contextmenu' | 'color'>('common');
  const [selectedLeftContextMenuId, setSelectedLeftContextMenuId] = useState<string | null>(null);
  const [selectedMainContextMenuId, setSelectedMainContextMenuId] = useState<string | null>(null);
  const [selectedLeftColorRuleId, setSelectedLeftColorRuleId] = useState<string | null>(null);
  const [selectedMainColorRuleId, setSelectedMainColorRuleId] = useState<string | null>(null);
  const [selectedPopupMenuParamKey, setSelectedPopupMenuParamKey] = useState<string>('dllpar1');
  const selectedPopupMenuOwnerRef = useRef<string | null>(null);
  const [selectedLeftForDelete, setSelectedLeftForDelete] = useState<string[]>([]);
  const [selectedMainForDelete, setSelectedMainForDelete] = useState<string[]>([]);
  const [selectedLeftFiltersForDelete, setSelectedLeftFiltersForDelete] = useState<string[]>([]);
  const [selectedMainFiltersForDelete, setSelectedMainFiltersForDelete] = useState<string[]>([]);

  const [detailTableColumns, setDetailTableColumns] = useState<Record<string, any[]>>({
    tab1: [
      { id: 'd_col1', name: '附件名称', type: '文本', width: 128 },
      { id: 'd_col2', name: '上传人', type: '文本', width: 92 },
    ],
    tab2: [
      { id: 'd_col3', name: '操作时间', type: '日期框', width: 138 },
      { id: 'd_col4', name: '操作人', type: '文本', width: 98 },
      { id: 'd_col5', name: '操作动作', type: '下拉框', width: 108 },
    ],
  });
  const [selectedDetailForDelete, setSelectedDetailForDelete] = useState<string[]>([]);
  const [selectedDetailFiltersForDelete, setSelectedDetailFiltersForDelete] = useState<string[]>([]);
  const [selectedArchiveNodeId, setSelectedArchiveNodeId] = useState('archive-main');
  const [billSources, setBillSources] = useState<BillSourceEntry[]>([INITIAL_BILL_SOURCE]);
  const [activeBillSourceId, setActiveBillSourceId] = useState(INITIAL_BILL_SOURCE.id);
  const [billSourceDraft, setBillSourceDraft] = useState<BillSourceEntry>(INITIAL_BILL_SOURCE);
  const [billSourceDraftMode, setBillSourceDraftMode] = useState<'create' | 'edit'>('edit');
  const activeBillSource = billSources.find((item) => item.id === activeBillSourceId) ?? billSources[0] ?? null;
  const parseBillSourceDetailFields = (sourceDetail?: string) => {
    if (!sourceDetail) return [];
    return sourceDetail
      .split(/[\n,，;；|]/)
      .map((item) => item.trim())
      .filter(Boolean);
  };
  const billSourceFieldMap = billSources.reduce<Record<string, string[]>>((accumulator, item) => {
    accumulator[item.id] = parseBillSourceDetailFields(item.sourceDetail);
    return accumulator;
  }, {});
  const buildBillSourceEntry = (index: number, overrides: Partial<BillSourceEntry> = {}): BillSourceEntry => ({
    id: `bill-source-${Date.now()}-${index}`,
    configType: '普通来源',
    sourceName: `来源 ${index}`,
    sourceSql: '',
    sourceDetail: '',
    sourceType: 'SQL',
    ...overrides,
  });
  const selectBillSourceDraft = (source: BillSourceEntry) => {
    setActiveBillSourceId(source.id);
    setBillSourceDraft({ ...source });
    setBillSourceDraftMode('edit');
  };
  const createBillSourceDraft = () => {
    const nextDraft = buildBillSourceEntry(billSources.length + 1);
    setActiveBillSourceId(nextDraft.id);
    setBillSourceDraft(nextDraft);
    setBillSourceDraftMode('create');
  };
  const saveBillSourceDraft = () => {
    const normalizedDraft = {
      ...billSourceDraft,
      sourceName: billSourceDraft.sourceName.trim() || `来源 ${billSources.length + (billSourceDraftMode === 'create' ? 1 : 0)}`,
      sourceSql: billSourceDraft.sourceSql.trim(),
      sourceDetail: billSourceDraft.sourceDetail.trim(),
    };
    setBillSources((prev) => (
      prev.some((item) => item.id === normalizedDraft.id)
        ? prev.map((item) => (item.id === normalizedDraft.id ? normalizedDraft : item))
        : [...prev, normalizedDraft]
    ));
    setActiveBillSourceId(normalizedDraft.id);
    setBillSourceDraft(normalizedDraft);
    setBillSourceDraftMode('edit');
    showToast('来源配置已保存');
  };
  const [billDetailColumns, setBillDetailColumns] = useState<any[]>([
    buildColumn('bill_line', 1, { name: '物料编码', width: 132, sourceField: 'material_code' }),
    buildColumn('bill_line', 2, { name: '物料名称', width: 168, sourceField: 'material_name' }),
    buildColumn('bill_line', 3, { name: '数量', type: '数字', width: 92, defaultValue: '1' }),
    buildColumn('bill_line', 4, { name: '单价', type: '数字', width: 104, sourceField: 'material_price' }),
    buildColumn('bill_line', 5, { name: '金额', type: '数字', width: 118, readonly: true, defaultValue: '0.00' }),
  ]);
  const [billDetailConfig, setBillDetailConfig] = useState(
    buildGridConfig('', '', {
      tableType: '普通表格',
      contextMenuEnabled: false,
      contextMenuItems: [],
      detailBoard: buildDetailBoardConfig([], { enabled: false }),
    }),
  );
  const [billMetaFields, setBillMetaFields] = useState<any[]>([
    {
      id: 'bill_meta_date',
      name: '单据时间',
      type: '日期框',
      width: BILL_FORM_DEFAULT_WIDTH,
      readonly: true,
      defaultValue: new Date().toISOString().slice(0, 10),
      canvasX: 540,
      canvasY: 100,
      labelWidth: 64,
      fontSize: BILL_FORM_DEFAULT_FONT_SIZE,
    },
    {
      id: 'bill_meta_operator',
      name: '操作人员',
      type: '文本',
      width: BILL_FORM_DEFAULT_WIDTH,
      readonly: true,
      defaultValue: '系统管理员',
      canvasX: 540,
      canvasY: 160,
      labelWidth: 64,
      fontSize: BILL_FORM_DEFAULT_FONT_SIZE,
    },
    {
      id: 'bill_meta_operate_time',
      name: '操作时间',
      type: '日期框',
      width: BILL_FORM_DEFAULT_WIDTH,
      readonly: true,
      defaultValue: new Date().toISOString().slice(0, 10),
      canvasX: 540,
      canvasY: 220,
      labelWidth: 64,
      fontSize: BILL_FORM_DEFAULT_FONT_SIZE,
    },
  ]);
  const [documentLeftPaneWidth, setDocumentLeftPaneWidth] = useState(328);
  const [documentDetailPaneWidth, setDocumentDetailPaneWidth] = useState(332);
  const [documentTopPaneHeight, setDocumentTopPaneHeight] = useState(414);
  const [billDocumentTone, setBillDocumentTone] = useState<'blue' | 'red'>('blue');
  const [billDocumentScale, setBillDocumentScale] = useState(1);
  const [activeResize, setActiveResize] = useState<{
    id: string;
    label: string;
    width: number;
    mode: 'column' | 'filter';
  } | null>(null);
  const [isDetailBoardOpen, setIsDetailBoardOpen] = useState(initialDetailPreview);
  const [detailBoardSortColumnId, setDetailBoardSortColumnId] = useState<string | null>(initialDetailPreview ? mainTableColumns[0]?.id ?? null : null);
  const [detailBoardOpenedRowId, setDetailBoardOpenedRowId] = useState<number | null>(initialDetailPreview ? 1 : null);
  const [workspaceTheme, setWorkspaceTheme] = useState(initialWorkspaceTheme);
  const [detailBoardClipboardIds, setDetailBoardClipboardIds] = useState<string[]>([]);
  const [activeDetailBoardResize, setActiveDetailBoardResize] = useState<{
    groupId: string;
    columnId: string;
    label: string;
    width: number;
  } | null>(null);
  const [previewContextMenu, setPreviewContextMenu] = useState<{
    scope: 'main' | 'detail';
    rowId: number;
    x: number;
    y: number;
    items: any[];
  } | null>(null);
  const [builderSelectionContextMenu, setBuilderSelectionContextMenu] = useState<{
    kind: 'column' | 'filter';
    scope: 'left' | 'main' | 'detail';
    x: number;
    y: number;
    ids: string[];
  } | null>(null);
  const [longTextEditorState, setLongTextEditorState] = useState<{
    title: string;
    placeholder?: string;
    draft: string;
    onSave: (value: string) => void;
  } | null>(null);
  const [activeBillDragId, setActiveBillDragId] = useState<string | null>(null);
  const [activeBillResizeId, setActiveBillResizeId] = useState<string | null>(null);
  const [billFieldSnapGuides, setBillFieldSnapGuides] = useState<BillFieldGuideState>(EMPTY_BILL_FIELD_GUIDES);
  const layoutDragRef = useRef<{
    type: 'document-left-width' | 'document-detail-width' | 'document-top-height';
    startX: number;
    startY: number;
    startValue: number;
  } | null>(null);
  const billDocumentViewportRef = useRef<HTMLDivElement | null>(null);
  const billDocumentPaperRef = useRef<HTMLDivElement | null>(null);
  const billHeaderCanvasRef = useRef<HTMLDivElement | null>(null);
  const billFieldDragRef = useRef<{
    id: string;
    scope: BillCanvasFieldScope;
    startX: number;
    startY: number;
    startCanvasX: number;
    startCanvasY: number;
    fieldWidth: number;
    boardWidth: number;
    boardHeight: number;
  } | null>(null);
  const billFieldResizeRef = useRef<{
    id: string;
    scope: BillCanvasFieldScope;
    startX: number;
    startWidth: number;
    startCanvasX: number;
    boardWidth: number;
  } | null>(null);
  const billCanvasFieldsRef = useRef<any[]>([...mainTableColumns, ...billMetaFields]);
  const billDragFrameRef = useRef<number | null>(null);
  const billResizeFrameRef = useRef<number | null>(null);
  const billHeaderAutoFillRef = useRef(false);
  const moduleSettingFullscreenInitRef = useRef(false);
  const pendingBillDragPositionRef = useRef<{
    id: string;
    scope: BillCanvasFieldScope;
    x: number;
    y: number;
    guides: BillFieldGuideState;
  } | null>(null);
  const pendingBillResizeRef = useRef<{
    id: string;
    scope: BillCanvasFieldScope;
    width: number;
  } | null>(null);
  const resizeFrameRef = useRef<number | null>(null);
  const detailBoardResizeFrameRef = useRef<number | null>(null);

  const selectedLeftColId = inspectorTarget.kind === 'left-col' ? inspectorTarget.id ?? null : null;
  const selectedMainColId = inspectorTarget.kind === 'main-col' ? inspectorTarget.id ?? null : null;
  const selectedDetailColId = inspectorTarget.kind === 'detail-col' ? inspectorTarget.id ?? null : null;
  const selectedLeftFilterId = inspectorTarget.kind === 'left-filter' ? inspectorTarget.id ?? null : null;
  const selectedMainFilterId = inspectorTarget.kind === 'main-filter' ? inspectorTarget.id ?? null : null;
  const selectedDetailFilterId = inspectorTarget.kind === 'detail-filter' ? inspectorTarget.id ?? null : null;
  const selectedDetailTabId = inspectorTarget.kind === 'detail-tab' ? inspectorTarget.id ?? null : null;
  const selectedTableConfigScope = inspectorTarget.kind === 'left-grid'
    ? 'left'
    : inspectorTarget.kind === 'main-grid'
      ? 'main'
      : inspectorTarget.kind === 'detail-grid'
        ? 'detail'
        : null;
  const selectedContextMenuScope = inspectorTarget.kind === 'main-context' ? 'main' : inspectorTarget.kind === 'detail-context' ? 'detail' : null;
  const syncScopedDeleteSelection = (activeScope?: 'left' | 'main' | 'detail') => {
    setSelectedLeftForDelete((prev) => (activeScope === 'left' || prev.length === 0 ? prev : []));
    setSelectedMainForDelete((prev) => (activeScope === 'main' || prev.length === 0 ? prev : []));
    setSelectedDetailForDelete((prev) => (activeScope === 'detail' || prev.length === 0 ? prev : []));
  };
  const syncScopedFilterDeleteSelection = (activeScope?: 'left' | 'main' | 'detail') => {
    setSelectedLeftFiltersForDelete((prev) => (activeScope === 'left' || prev.length === 0 ? prev : []));
    setSelectedMainFiltersForDelete((prev) => (activeScope === 'main' || prev.length === 0 ? prev : []));
    setSelectedDetailFiltersForDelete((prev) => (activeScope === 'detail' || prev.length === 0 ? prev : []));
  };
  const clampValue = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
  const buildBillFieldBounds = (column: any): BillFieldBounds => {
    const normalizedColumn = normalizeColumn(column);
    const width = Math.max(BILL_FORM_MIN_WIDTH, normalizedColumn.width || BILL_FORM_DEFAULT_WIDTH);
    const height = BILL_FORM_ROW_HEIGHT;
    const x = normalizedColumn.canvasX ?? BILL_FORM_LAYOUT_PADDING_X;
    const y = normalizedColumn.canvasY ?? BILL_FORM_LAYOUT_PADDING_Y;

    return {
      id: String(column.id),
      x,
      y,
      width,
      height,
      right: x + width,
      bottom: y + height,
      centerX: x + width / 2,
      centerY: y + height / 2,
    };
  };
  const snapBillPositionToGrid = (value: number, padding: number) => (
    padding + Math.round((value - padding) / BILL_FORM_SNAP_SIZE) * BILL_FORM_SNAP_SIZE
  );
  const buildGuideLine = (
    orientation: 'vertical' | 'horizontal',
    position: number,
    start: number,
    end: number,
    kind: 'align' | 'spacing' = 'align',
  ): BillFieldGuideLine => ({
    orientation,
    position: Math.round(position),
    start: Math.round(Math.min(start, end)),
    end: Math.round(Math.max(start, end)),
    kind,
  });
  const buildGapGuide = (
    orientation: 'horizontal' | 'vertical',
    start: number,
    end: number,
    cross: number,
    label: string,
  ): BillFieldGapGuide => ({
    orientation,
    start: Math.round(Math.min(start, end)),
    end: Math.round(Math.max(start, end)),
    cross: Math.round(cross),
    label,
  });
  const findClosestBillGuide = (value: number, candidates: BillSnapCandidate[]) => {
    let closest: (BillSnapCandidate & { distance: number }) | null = null;

    candidates.forEach((candidate) => {
      const distance = Math.abs(value - candidate.value);
      if (distance > BILL_FORM_ALIGN_THRESHOLD) return;
      if (!closest || distance < closest.distance || (distance === closest.distance && candidate.priority < closest.priority)) {
        closest = { ...candidate, distance };
      }
    });

    return closest;
  };
  const resolveBillFieldSnap = (
    columnId: string,
    rawX: number,
    rawY: number,
    boardWidth: number,
    fieldWidth: number,
    boardHeight: number,
  ) => {
    const maxX = Math.max(BILL_FORM_LAYOUT_PADDING_X, boardWidth - fieldWidth - BILL_FORM_LAYOUT_PADDING_X);
    const clampedRawX = clampValue(rawX, BILL_FORM_LAYOUT_PADDING_X, maxX);
    const clampedRawY = Math.max(BILL_FORM_LAYOUT_PADDING_Y, rawY);
    let nextX = Math.max(BILL_FORM_LAYOUT_PADDING_X, Math.min(maxX, snapBillPositionToGrid(clampedRawX, BILL_FORM_LAYOUT_PADDING_X)));
    let nextY = Math.max(BILL_FORM_LAYOUT_PADDING_Y, snapBillPositionToGrid(clampedRawY, BILL_FORM_LAYOUT_PADDING_Y));

    const draftBounds: BillFieldBounds = {
      id: columnId,
      x: clampedRawX,
      y: clampedRawY,
      width: fieldWidth,
      height: BILL_FORM_ROW_HEIGHT,
      right: clampedRawX + fieldWidth,
      bottom: clampedRawY + BILL_FORM_ROW_HEIGHT,
      centerX: clampedRawX + fieldWidth / 2,
      centerY: clampedRawY + BILL_FORM_ROW_HEIGHT / 2,
    };
    const otherColumns = billCanvasFieldsRef.current
      .filter((column) => column.id !== columnId)
      .map((column) => buildBillFieldBounds(column));
    const xCandidates: BillSnapCandidate[] = [
      {
        value: BILL_FORM_LAYOUT_PADDING_X,
        line: buildGuideLine('vertical', BILL_FORM_LAYOUT_PADDING_X, Math.max(10, draftBounds.y - 20), Math.min(boardHeight - 10, draftBounds.bottom + 20), 'spacing'),
        gap: buildGapGuide('horizontal', 0, BILL_FORM_LAYOUT_PADDING_X, draftBounds.y + 14, `${BILL_FORM_LAYOUT_PADDING_X}`),
        priority: 5,
      },
      {
        value: maxX,
        line: buildGuideLine('vertical', boardWidth - BILL_FORM_LAYOUT_PADDING_X, Math.max(10, draftBounds.y - 20), Math.min(boardHeight - 10, draftBounds.bottom + 20), 'spacing'),
        gap: buildGapGuide('horizontal', maxX + fieldWidth, boardWidth - BILL_FORM_LAYOUT_PADDING_X, draftBounds.y + 14, `${BILL_FORM_LAYOUT_PADDING_X}`),
        priority: 5,
      },
    ];
    const yCandidates: BillSnapCandidate[] = [
      {
        value: BILL_FORM_LAYOUT_PADDING_Y,
        line: buildGuideLine('horizontal', BILL_FORM_LAYOUT_PADDING_Y, Math.max(10, draftBounds.x - 20), Math.min(boardWidth - 10, draftBounds.right + 20), 'spacing'),
        gap: buildGapGuide('vertical', 0, BILL_FORM_LAYOUT_PADDING_Y, draftBounds.x + 18, `${BILL_FORM_LAYOUT_PADDING_Y}`),
        priority: 5,
      },
    ];

    otherColumns.forEach((column) => {
      const verticalLineStart = Math.max(12, Math.min(column.y, draftBounds.y) - 10);
      const verticalLineEnd = Math.min(boardHeight - 12, Math.max(column.bottom, draftBounds.bottom) + 10);
      const horizontalLineStart = Math.max(12, Math.min(column.x, draftBounds.x) - 10);
      const horizontalLineEnd = Math.min(boardWidth - 12, Math.max(column.right, draftBounds.right) + 10);
      const sharedY = Math.max(Math.min((Math.max(column.y, draftBounds.y) + Math.min(column.bottom, draftBounds.bottom)) / 2, Math.max(column.y, draftBounds.y) + 18), Math.min(column.bottom, draftBounds.bottom) - 18);
      const sharedX = Math.max(Math.min((Math.max(column.x, draftBounds.x) + Math.min(column.right, draftBounds.right)) / 2, Math.max(column.x, draftBounds.x) + 22), Math.min(column.right, draftBounds.right) - 22);

      xCandidates.push(
        {
          value: column.x,
          line: buildGuideLine('vertical', column.x, verticalLineStart, verticalLineEnd),
          gap: null,
          priority: 2,
        },
        {
          value: column.right - fieldWidth,
          line: buildGuideLine('vertical', column.right, verticalLineStart, verticalLineEnd),
          gap: null,
          priority: 2,
        },
        {
          value: column.centerX - fieldWidth / 2,
          line: buildGuideLine('vertical', column.centerX, verticalLineStart, verticalLineEnd),
          gap: null,
          priority: 3,
        },
        {
          value: column.right + BILL_FORM_LAYOUT_GAP_X,
          line: buildGuideLine('vertical', column.right + BILL_FORM_LAYOUT_GAP_X / 2, verticalLineStart, verticalLineEnd, 'spacing'),
          gap: buildGapGuide('horizontal', column.right, column.right + BILL_FORM_LAYOUT_GAP_X, Number.isFinite(sharedY) ? sharedY : column.centerY, `${BILL_FORM_LAYOUT_GAP_X}`),
          priority: 1,
        },
        {
          value: column.x - fieldWidth - BILL_FORM_LAYOUT_GAP_X,
          line: buildGuideLine('vertical', column.x - BILL_FORM_LAYOUT_GAP_X / 2, verticalLineStart, verticalLineEnd, 'spacing'),
          gap: buildGapGuide('horizontal', column.x - BILL_FORM_LAYOUT_GAP_X, column.x, Number.isFinite(sharedY) ? sharedY : column.centerY, `${BILL_FORM_LAYOUT_GAP_X}`),
          priority: 1,
        },
      );
      yCandidates.push(
        {
          value: column.y,
          line: buildGuideLine('horizontal', column.y, horizontalLineStart, horizontalLineEnd),
          gap: null,
          priority: 2,
        },
        {
          value: column.bottom - BILL_FORM_ROW_HEIGHT,
          line: buildGuideLine('horizontal', column.bottom, horizontalLineStart, horizontalLineEnd),
          gap: null,
          priority: 2,
        },
        {
          value: column.centerY - BILL_FORM_ROW_HEIGHT / 2,
          line: buildGuideLine('horizontal', column.centerY, horizontalLineStart, horizontalLineEnd),
          gap: null,
          priority: 3,
        },
        {
          value: column.bottom + BILL_FORM_LAYOUT_GAP_Y,
          line: buildGuideLine('horizontal', column.bottom + BILL_FORM_LAYOUT_GAP_Y / 2, horizontalLineStart, horizontalLineEnd, 'spacing'),
          gap: buildGapGuide('vertical', column.bottom, column.bottom + BILL_FORM_LAYOUT_GAP_Y, Number.isFinite(sharedX) ? sharedX : column.centerX, `${BILL_FORM_LAYOUT_GAP_Y}`),
          priority: 1,
        },
        {
          value: column.y - BILL_FORM_ROW_HEIGHT - BILL_FORM_LAYOUT_GAP_Y,
          line: buildGuideLine('horizontal', column.y - BILL_FORM_LAYOUT_GAP_Y / 2, horizontalLineStart, horizontalLineEnd, 'spacing'),
          gap: buildGapGuide('vertical', column.y - BILL_FORM_LAYOUT_GAP_Y, column.y, Number.isFinite(sharedX) ? sharedX : column.centerX, `${BILL_FORM_LAYOUT_GAP_Y}`),
          priority: 1,
        },
      );
    });

    const closestX = findClosestBillGuide(clampedRawX, xCandidates.filter((candidate) => candidate.value >= BILL_FORM_LAYOUT_PADDING_X && candidate.value <= maxX));
    const closestY = findClosestBillGuide(clampedRawY, yCandidates.filter((candidate) => candidate.value >= BILL_FORM_LAYOUT_PADDING_Y));
    const lines: BillFieldGuideLine[] = [];
    let gapGuide: BillFieldGapGuide | null = null;

    if (closestX) {
      nextX = Math.round(clampValue(closestX.value, BILL_FORM_LAYOUT_PADDING_X, maxX));
      if (closestX.line) {
        lines.push(closestX.line);
      }
      if (closestX.gap) {
        gapGuide = closestX.gap;
      }
    }
    if (closestY) {
      nextY = Math.round(Math.max(BILL_FORM_LAYOUT_PADDING_Y, closestY.value));
      if (closestY.line) {
        lines.push(closestY.line);
      }
      if (!gapGuide && closestY.gap) {
        gapGuide = closestY.gap;
      }
    }

    return {
      x: nextX,
      y: nextY,
      guides: lines.length > 0 || gapGuide ? { lines, gap: gapGuide } : EMPTY_BILL_FIELD_GUIDES,
    };
  };

  useEffect(() => {
    billCanvasFieldsRef.current = [...mainTableColumns, ...billMetaFields];
  }, [mainTableColumns, billMetaFields]);

  useEffect(() => {
    if (businessType !== 'table') return;
    const fullscreenActive = isConfigOpen && configStep === 5 && isFullscreenConfig;

    const viewport = billDocumentViewportRef.current;
    const paper = billDocumentPaperRef.current;
    if (!viewport || !paper || typeof ResizeObserver === 'undefined') return;

    const measure = () => {
      const viewportPadding = fullscreenActive ? 4 : 16;
      const viewportWidth = viewport.clientWidth - viewportPadding;
      const viewportHeight = viewport.clientHeight - viewportPadding;
      const paperWidth = paper.scrollWidth || 1480;
      const paperHeight = paper.scrollHeight || 920;

      if (viewportWidth <= 0 || viewportHeight <= 0 || paperWidth <= 0 || paperHeight <= 0) return;

      const scaleLimit = fullscreenActive ? 1.08 : 1;
      const nextScale = Math.min(scaleLimit, viewportWidth / paperWidth, viewportHeight / paperHeight);
      setBillDocumentScale((prev) => (Math.abs(prev - nextScale) < 0.01 ? prev : nextScale));
    };

    const observer = new ResizeObserver(() => {
      window.requestAnimationFrame(measure);
    });
    observer.observe(viewport);
    observer.observe(paper);
    window.requestAnimationFrame(measure);

    return () => observer.disconnect();
  }, [businessType, billDetailColumns.length, billMetaFields.length, isConfigOpen, configStep, isFullscreenConfig, mainTableColumns.length]);

  useEffect(() => {
    const fullscreenActive = isConfigOpen && configStep === 5 && isFullscreenConfig;
    if (businessType !== 'table' || fullscreenActive || billHeaderAutoFillRef.current) return;
    if (mainTableColumns.length === 0) return;

    const mainLayoutMatches = mainTableColumns.every((field, index) => {
      const normalizedField = normalizeColumn(field);
      const width = Math.max(BILL_FORM_MIN_WIDTH, normalizedField.width || BILL_FORM_DEFAULT_WIDTH);
      const expectedLayout = getBillFieldLayout(index, width);
      return Math.abs((normalizedField.canvasX ?? expectedLayout.canvasX) - expectedLayout.canvasX) <= 4
        && Math.abs((normalizedField.canvasY ?? expectedLayout.canvasY) - expectedLayout.canvasY) <= 4;
    });
    const legacyMetaLayout = [
      { id: 'bill_meta_date', x: 540, y: 100 },
      { id: 'bill_meta_operator', x: 540, y: 160 },
      { id: 'bill_meta_operate_time', x: 540, y: 220 },
    ];
    const metaLayoutMatches = billMetaFields.every((field, index) => {
      const expectedLayout = legacyMetaLayout[index];
      return Boolean(expectedLayout)
        && field.id === expectedLayout.id
        && Math.abs((field.canvasX ?? expectedLayout.x) - expectedLayout.x) <= 4
        && Math.abs((field.canvasY ?? expectedLayout.y) - expectedLayout.y) <= 4;
    });

    if (!mainLayoutMatches || !metaLayoutMatches) {
      billHeaderAutoFillRef.current = true;
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      billHeaderAutoFillRef.current = true;
      autoArrangeBillHeaderFields();
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [businessType, billMetaFields, configStep, isConfigOpen, isFullscreenConfig, mainTableColumns]);

  useEffect(() => {
    setInspectorPanelTab('common');
  }, [inspectorTarget.kind, inspectorTarget.id, activeTab]);

  useEffect(() => {
    if (businessType === 'table' && detailTabs[0] && activeTab !== detailTabs[0].id) {
      setActiveTab(detailTabs[0].id);
    }
  }, [businessType, detailTabs, activeTab]);

  useEffect(() => {
    const handleCopy = (event: ClipboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (selectedMainForDelete.length === 0) return;

      const copiedIds = Array.from(new Set(selectedMainForDelete.filter((id) => mainTableColumns.some((column) => column.id === id))));
      if (copiedIds.length === 0) return;

      const payload = {
        type: 'detail-board-columns',
        columnIds: copiedIds,
      };

      event.preventDefault();
      event.clipboardData?.setData('text/plain', `${DETAIL_BOARD_CLIPBOARD_PREFIX}${JSON.stringify(payload)}`);
      setDetailBoardClipboardIds(copiedIds);
      showToast(`已复制 ${copiedIds.length} 个主表字段`);
    };

    document.addEventListener('copy', handleCopy);
    return () => document.removeEventListener('copy', handleCopy);
  }, [mainTableColumns, selectedMainForDelete]);

  useEffect(() => {
    if (inspectorTarget.kind === 'left-col') {
      syncScopedDeleteSelection('left');
      syncScopedFilterDeleteSelection();
      return;
    }

    if (inspectorTarget.kind === 'main-col') {
      syncScopedDeleteSelection('main');
      syncScopedFilterDeleteSelection();
      return;
    }

    if (inspectorTarget.kind === 'detail-col') {
      syncScopedDeleteSelection('detail');
      syncScopedFilterDeleteSelection();
      return;
    }

    if (inspectorTarget.kind === 'main-filter') {
      syncScopedDeleteSelection();
      syncScopedFilterDeleteSelection('main');
      return;
    }

    if (inspectorTarget.kind === 'detail-filter') {
      syncScopedDeleteSelection();
      syncScopedFilterDeleteSelection('detail');
      return;
    }

    syncScopedDeleteSelection();
    syncScopedFilterDeleteSelection();
  }, [inspectorTarget.kind, inspectorTarget.id]);

  const clearColumnSelection = () => {
    syncScopedDeleteSelection();
    syncScopedFilterDeleteSelection();
    setBuilderSelectionContextMenu(null);
    setInspectorTarget({ kind: 'none' });
  };

  const openWorkspaceThemeInspector = () => {
    setInspectorTarget({ kind: 'workspace-theme' });
    setInspectorPanelTab('common');
  };

  const activateSourceGridSelection = () => {
    setBuilderSelectionContextMenu(null);
    setInspectorTarget({ kind: 'source-grid' });
    setInspectorPanelTab('common');
  };

  const handleBusinessTypeChange = (nextType: BusinessType) => {
    setBusinessType(nextType);
    setMenuInfoTab('common');
    setBuilderSelectionContextMenu(null);
    setSelectedLeftForDelete([]);
    setSelectedLeftFiltersForDelete([]);
    setSelectedMainForDelete([]);
    setSelectedDetailForDelete([]);
    setSelectedMainFiltersForDelete([]);
    setSelectedDetailFiltersForDelete([]);
    setSelectedArchiveNodeId('archive-main');
    setInspectorTarget({ kind: 'main-grid' });
    setInspectorPanelTab('common');
  };

  const updateCurrentMenuDraft = (fieldKey: string, value: ModuleMenuValue) => {
    if (businessType === 'table') {
      setBilltypeMenuDraft((prev) => ({ ...prev, [fieldKey]: value }));
      return;
    }
    setDocumentMenuDraft((prev) => ({ ...prev, [fieldKey]: value }));
  };

  const toggleMenuPinnedField = (fieldKey: string, shouldPin?: boolean) => {
    setMenuPinnedFields((prev) => {
      const defaultKeys = MENU_DEFAULT_COMMON_FIELD_KEYS[businessType] ?? MENU_DEFAULT_COMMON_FIELD_KEYS.document;
      const currentKeys = prev[businessType] ?? defaultKeys;
      const nextShouldPin = shouldPin ?? !currentKeys.includes(fieldKey);
      const nextKeys = nextShouldPin
        ? currentKeys.includes(fieldKey)
          ? currentKeys
          : [...currentKeys, fieldKey]
        : currentKeys.filter((key) => key !== fieldKey);

      return {
        ...prev,
        [businessType]: nextKeys,
      };
    });
  };

  const renderMenuInfoField = (
    field: ModuleMenuFieldSchema,
    options: {
      isDisabled?: boolean;
      isPinned: boolean;
      onTogglePinned: () => void;
    },
  ) => {
    const value = currentMenuDraft[field.key] ?? '';
    const wrapperClass = field.span === 'full' ? 'md:col-span-2' : '';
    const cardClass = 'cloudy-glass-panel-soft rounded-[22px] border border-white/75 p-4 shadow-[0_20px_44px_-32px_rgba(15,23,42,0.28)]';
    const baseInputClass = `w-full rounded-[18px] border border-slate-200/80 bg-slate-50/92 px-3.5 py-2.5 text-[12px] text-slate-700 outline-none transition shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] focus:border-[#1686e3]/70 focus:bg-white focus:ring-4 focus:ring-[#1686e3]/10 dark:border-slate-700 dark:bg-slate-900/72 dark:text-slate-100 ${
      options.isDisabled ? 'cursor-not-allowed opacity-60' : ''
    }`;
    const pinButtonClass = options.isPinned
      ? 'border-rose-200/80 bg-rose-50/90 text-rose-600 hover:border-rose-300 hover:bg-rose-100/80 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200'
      : 'border-sky-200/80 bg-sky-50/90 text-sky-700 hover:border-sky-300 hover:bg-sky-100/80 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-200';

    return (
      <div key={field.key} className={`${wrapperClass}`.trim()}>
        <div className={cardClass}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-[13px] font-bold text-slate-700 dark:text-slate-200">{field.label}</label>
                <code className="rounded-full border border-slate-200/80 bg-white/85 px-2.5 py-1 text-[10px] font-bold text-slate-400 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-500">
                  {field.tableField}
                </code>
              </div>
              {field.hint && field.kind === 'switch' && (
                <p className="mt-1 text-[11px] leading-5 text-slate-400">{field.hint}</p>
              )}
            </div>
            <button
              type="button"
              disabled={options.isDisabled}
              onClick={options.onTogglePinned}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold transition-colors ${pinButtonClass} ${
                options.isDisabled ? 'cursor-not-allowed opacity-50' : ''
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">
                {options.isPinned ? 'remove_circle' : 'add_circle'}
              </span>
              {options.isPinned ? '移出常用' : '加入常用'}
            </button>
          </div>

          <div className="mt-3">
            {field.kind === 'textarea' ? (
              <textarea
                disabled={options.isDisabled}
                rows={field.rows ?? 4}
                value={String(value)}
                placeholder={field.placeholder}
                onChange={(event) => updateCurrentMenuDraft(field.key, event.target.value)}
                className={`${baseInputClass} min-h-[112px] resize-y font-mono text-[11px] leading-5`}
              />
            ) : field.kind === 'select' ? (
              <div className="relative">
                <select
                  disabled={options.isDisabled}
                  value={String(value)}
                  onChange={(event) => updateCurrentMenuDraft(field.key, event.target.value)}
                  className={`${baseInputClass} cursor-pointer appearance-none pr-10`}
                >
                  {(field.options ?? []).map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <span className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[18px] text-slate-400">
                  expand_more
                </span>
              </div>
            ) : field.kind === 'switch' ? (
              <label className={`flex items-center justify-between rounded-[18px] border border-slate-200/80 bg-white/82 px-4 py-3.5 transition-colors dark:border-slate-700 dark:bg-slate-900/60 ${
                options.isDisabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:border-[#1686e3]/30'
              }`}>
                <div className="text-[13px] font-semibold text-slate-700 dark:text-slate-100">
                  {value === 'true' ? '已开启' : '未开启'}
                </div>
                <span className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${value === 'true' ? 'bg-[#f3afb7]' : 'bg-slate-200 dark:bg-slate-700'}`}>
                  <input
                    type="checkbox"
                    disabled={options.isDisabled}
                    checked={value === 'true'}
                    onChange={(event) => updateCurrentMenuDraft(field.key, event.target.checked ? 'true' : 'false')}
                    className="sr-only"
                  />
                  <span className={`absolute left-1 size-5 rounded-full bg-white shadow-[0_6px_16px_-8px_rgba(15,23,42,0.45)] transition-transform ${value === 'true' ? 'translate-x-5' : ''}`}></span>
                </span>
              </label>
            ) : (
              <input
                disabled={options.isDisabled}
                type={field.kind === 'number' ? 'number' : 'text'}
                value={String(value)}
                placeholder={field.placeholder}
                onChange={(event) => updateCurrentMenuDraft(field.key, event.target.value)}
                className={baseInputClass}
              />
            )}
          </div>

          {field.hint && field.kind !== 'switch' && (
            <p className="mt-2 text-[11px] leading-5 text-slate-400">{field.hint}</p>
          )}
        </div>
      </div>
    );
  };

  const openModuleGuide = (
    nextType: BusinessType,
    options?: {
      completedSteps?: number[];
      initialStep?: number;
    },
  ) => {
    const nextStep = options?.initialStep ?? 1;
    setIsConfigOpen(true);
    setConfigStep(nextStep);
    setCompletedSteps(options?.completedSteps ?? []);
    handleBusinessTypeChange(nextType);
    setIsFullscreenConfig(true);
    setIsFullscreenEditor(false);
    setSurveyStep(0);
    setSurveyAnswers([]);
    setIsGenerating(false);
    setSurveyPlan(null);
    setSurveyPlanModel('');
    setSurveyError(null);
  };

  const openNewModuleGuide = () => {
    setActiveConfigMenu(null);
    setMenuInfoError(null);
    setIsMenuInfoLoading(false);
    setIsMenuInfoSaving(false);
    setDocumentMenuDraft(DOCUMENT_MENU_DEFAULTS);
    setBilltypeMenuDraft(BILLTYPE_MENU_DEFAULTS);
    openModuleGuide('document');
  };

  const buildCreateModuleRelationPayload = (
    moduleKey: string,
    moduleTitle: string,
    moduleType: 'single-table' | 'bill',
  ) => {
    const parentMenuTitle = normalizeMenuTitle(activeFirstLevelMenu?.title);
    const parentMenuStruct = normalizeMenuCode(activeFirstLevelMenu?.menuStruct);
    const parentMenuCode = normalizeMenuCode(activeFirstLevelMenu?.code);

    return {
      moduletype: moduleType,
      nodetype: 'menu',
      title: moduleTitle,
      menucaption: moduleTitle,
      purviewid: moduleKey,
      subsysid: selectedSubsystem?.subsysId,
      subsyscode: normalizeMenuCode(selectedSubsystem?.subsysCode ?? selectedSubsystem?.code),
      parentmenuid: activeFirstLevelMenu?.menuId,
      menuparentid: activeFirstLevelMenu?.menuId,
      parentid: activeFirstLevelMenu?.id,
      parentmenucode: parentMenuCode,
      parentmenustruct: parentMenuStruct,
      parentmenutitle: parentMenuTitle,
      menuparenttitle: parentMenuTitle,
      menuparentcode: parentMenuCode,
      menuparentstruct: parentMenuStruct,
      menulevel: 2,
      childlevel: 2,
    };
  };

  const buildCreatedConfigMenu = (moduleKey: string, menuTitle: string, moduleType: 'single-table' | 'bill'): BackendMenuNode => {
    const currentSubsystem = subsystemMenus.find((node) => node.id === activeSubsystem);
    const currentFirstLevelMenu = currentSubsystem?.children.find((node) => node.id === activeFirstLevelMenuId);

    return {
      id: `draft:${moduleType}:${moduleKey || Date.now()}`,
      parentId: currentFirstLevelMenu?.id,
      nodeType: 'menu',
      title: normalizeMenuTitle(menuTitle) || '新建模块',
      code: moduleKey,
      moduleType,
      useflag: 1,
      subsysId: currentSubsystem?.subsysId ?? 0,
      subsysCode: currentSubsystem?.subsysCode,
      menuId: undefined,
      parentMenuId: currentFirstLevelMenu?.menuId ?? -1,
      menuStruct: currentFirstLevelMenu?.menuStruct,
      purviewId: moduleKey,
      enabled: true,
      children: [],
    };
  };

  const loadMenuInfoForMenu = async (menu: BackendMenuNode, nextType: BusinessType) => {
    const moduleKey = normalizeMenuCode(menu.purviewId);

    if (!moduleKey) {
      const message = '当前菜单缺少模块标识，无法加载菜单信息。';
      setMenuInfoError(message);
      showToast(message);
      return;
    }

    setIsMenuInfoLoading(true);
    setMenuInfoError(null);

    try {
      if (nextType === 'table') {
        const data = await fetchBillTypeConfig(moduleKey);
        setBilltypeMenuDraft(mapBillTypeToDraft(data));
        const nextModuleKey = normalizeMenuCode(toDraftText(data.typeCode)) || moduleKey;
        setActiveConfigMenu((prev) => (prev && prev.id === menu.id ? { ...prev, purviewId: nextModuleKey } : prev));
      } else {
        const data = await fetchSingleTableModuleConfig(moduleKey);
        setDocumentMenuDraft(mapSingleTableModuleToDraft(data));
        const nextModuleKey = normalizeMenuCode(toDraftText(data.dllCoId)) || moduleKey;
        setActiveConfigMenu((prev) => (prev && prev.id === menu.id ? { ...prev, purviewId: nextModuleKey } : prev));
      }
    } catch (error) {
      const message = getDashboardErrorMessage(error);
      setMenuInfoError(message);
      showToast(message);
    } finally {
      setIsMenuInfoLoading(false);
    }
  };

  const handleSecondLevelMenuConfig = (menu: BackendMenuNode) => {
    const moduleTypeProfile = getMenuModuleTypeProfile(menu.moduleType);
    const nextType = moduleTypeProfile?.businessType ?? 'document';
    const moduleKey = normalizeMenuCode(menu.purviewId);

    if (!moduleKey) {
      showToast('当前菜单缺少模块标识，无法打开配置。');
      return;
    }

    setActiveConfigMenu(menu);
    setMenuInfoError(null);
    setIsMenuInfoSaving(false);
    if (nextType === 'table') {
      setBilltypeMenuDraft(BILLTYPE_MENU_DEFAULTS);
    } else {
      setDocumentMenuDraft(DOCUMENT_MENU_DEFAULTS);
    }
    openModuleGuide(nextType, {
      completedSteps: [1],
      initialStep: 2,
    });
    void loadMenuInfoForMenu(menu, nextType);
  };

  const handleMenuInfoSave = async () => {
    if (configStep !== 2) {
      markStepCompleted(configStep);
      if (configStep === 1) {
        showToast('模块类型已确认');
      }
      return;
    }

    if (activeConfigMenu && !activeConfigModuleKey) {
      const message = '当前菜单缺少模块标识，无法保存菜单信息。';
      setMenuInfoError(message);
      showToast(message);
      return;
    }

    setIsMenuInfoSaving(true);
    setMenuInfoError(null);

    try {
      if (businessType === 'table') {
        const payload = mapBillTypeDraftToPayload(billtypeMenuDraft);
        const fallbackModuleKey = normalizeMenuCode(toDraftText(payload.typecode));
        const nextMenuTitle = normalizeMenuTitle(toDraftText(payload.typename)) || normalizeMenuTitle(toDraftText(billtypeMenuDraft.typeName)) || '新建单据模块';

        if (!activeConfigMenu && !fallbackModuleKey) {
          const message = '请先填写单据模块编码，再保存菜单信息。';
          setMenuInfoError(message);
          showToast(message);
          return;
        }

        const saved = activeConfigMenu
          ? await saveBillTypeConfig(activeConfigModuleKey, payload)
          : await createBillTypeConfig({
              ...buildCreateModuleRelationPayload(fallbackModuleKey, nextMenuTitle, 'bill'),
              ...payload,
            });

        setBilltypeMenuDraft(mapBillTypeToDraft(saved));
        const nextModuleKey = normalizeMenuCode(toDraftText(saved.typeCode)) || fallbackModuleKey || activeConfigModuleKey;

        if (activeConfigMenu) {
          setActiveConfigMenu((prev) => (prev ? { ...prev, code: nextModuleKey, purviewId: nextModuleKey, title: nextMenuTitle } : prev));
        } else {
          setActiveConfigMenu(buildCreatedConfigMenu(nextModuleKey, nextMenuTitle, 'bill'));
        }
      } else {
        const payload = mapDocumentDraftToPayload(documentMenuDraft);
        const fallbackModuleKey = normalizeMenuCode(toDraftText(payload.dllcoid));
        const nextMenuTitle = normalizeMenuTitle(toDraftText(payload.toolsname)) || normalizeMenuTitle(toDraftText(documentMenuDraft.moduleName)) || '新建单表模块';

        if (!activeConfigMenu && !fallbackModuleKey) {
          const message = '请先填写单表模块编码，再保存菜单信息。';
          setMenuInfoError(message);
          showToast(message);
          return;
        }

        const saved = activeConfigMenu
          ? await saveSingleTableModuleConfig(activeConfigModuleKey, payload)
          : await createSingleTableModuleConfig({
              ...buildCreateModuleRelationPayload(fallbackModuleKey, nextMenuTitle, 'single-table'),
              ...payload,
            });

        setDocumentMenuDraft(mapSingleTableModuleToDraft(saved));
        const nextModuleKey = normalizeMenuCode(toDraftText(saved.dllCoId)) || fallbackModuleKey || activeConfigModuleKey;

        if (activeConfigMenu) {
          setActiveConfigMenu((prev) => (prev ? { ...prev, code: nextModuleKey, purviewId: nextModuleKey, title: nextMenuTitle } : prev));
        } else {
          setActiveConfigMenu(buildCreatedConfigMenu(nextModuleKey, nextMenuTitle, 'single-table'));
        }
      }

      markStepCompleted(2);
      showToast(activeConfigMenu ? '菜单信息已保存' : '菜单信息已创建');
    } catch (error) {
      const message = getDashboardErrorMessage(error);
      setMenuInfoError(message);
      showToast(message);
    } finally {
      setIsMenuInfoSaving(false);
    }
  };

  const handleSecondLevelMenuDelete = async (menu: BackendMenuNode) => {
    const moduleTypeProfile = getMenuModuleTypeProfile(menu.moduleType);
    const moduleKey = normalizeMenuCode(menu.purviewId);
    const menuTitle = normalizeMenuTitle(menu.title) || '当前模块';

    if (!moduleTypeProfile) {
      showToast('当前菜单的模块类型无法识别，暂时不能删除。');
      return;
    }

    if (!moduleKey) {
      showToast('当前菜单缺少模块标识，无法删除。');
      return;
    }

    setDeletingMenuId(menu.id);

    try {
      if (moduleTypeProfile.businessType === 'table') {
        await deleteBillTypeConfig(moduleKey);
      } else {
        await deleteSingleTableModuleConfig(moduleKey);
      }

      setSecondLevelMenus((prev) => prev.filter((item) => item.id !== menu.id));

      if (activeConfigMenu?.id === menu.id) {
        setActiveConfigMenu(null);
        setMenuInfoError(null);
        setIsConfigOpen(false);
      }

      setPendingDeleteMenu((prev) => (prev?.id === menu.id ? null : prev));
      showToast(`模块「${menuTitle}」已删除`);
    } catch (error) {
      showToast(getDashboardErrorMessage(error));
    } finally {
      setDeletingMenuId(null);
    }
  };

  const renderDeleteConfirmModal = () => {
    if (!pendingDeleteMenu) {
      return null;
    }

    const moduleTypeProfile = getMenuModuleTypeProfile(pendingDeleteMenu.moduleType);
    const moduleKey = normalizeMenuCode(pendingDeleteMenu.purviewId) || '未提供';
    const menuTitle = normalizeMenuTitle(pendingDeleteMenu.title) || '当前模块';
    const isDeletingPendingMenu = deletingMenuId === pendingDeleteMenu.id;

    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/28 px-4 backdrop-blur-[6px]"
          onClick={() => {
            if (!isDeletingPendingMenu) {
              setPendingDeleteMenu(null);
            }
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="module-delete-dialog-title"
            className="w-full max-w-[480px] rounded-[28px] border border-white/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(249,251,255,0.96))] p-6 shadow-[0_36px_90px_-42px_rgba(15,23,42,0.6)] dark:border-slate-700 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(15,23,42,0.94))]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-[18px] border border-rose-200 bg-rose-50 text-rose-500 shadow-[0_12px_24px_-20px_rgba(244,63,94,0.6)] dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
                <span className="material-symbols-outlined text-[28px]">delete_forever</span>
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[11px] font-bold tracking-[0.18em] text-rose-500 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
                  危险操作
                </div>
                <div className="space-y-1">
                  <h3 id="module-delete-dialog-title" className="text-[22px] font-black tracking-tight text-slate-900 dark:text-white">
                    确认删除模块
                  </h3>
                  <p className="text-[13px] leading-6 text-slate-500 dark:text-slate-300">
                    删除后，这个二级菜单对应的模块配置会被永久移除，当前操作不可恢复。请确认该模块已经不再使用。
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-[22px] border border-slate-200/80 bg-white/85 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] dark:border-slate-700 dark:bg-slate-900/70">
              <div className="grid gap-3">
                <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 dark:border-slate-800">
                  <span className="text-[12px] font-bold tracking-[0.16em] text-slate-400">模块名称</span>
                  <span className="text-right text-[14px] font-bold text-slate-900 dark:text-white">{menuTitle}</span>
                </div>
                <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 dark:border-slate-800">
                  <span className="text-[12px] font-bold tracking-[0.16em] text-slate-400">模块类型</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[12px] font-bold text-sky-600 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-300">
                    <span className="material-symbols-outlined text-[15px]">
                      {moduleTypeProfile?.businessType === 'table' ? 'table_view' : 'article'}
                    </span>
                    {moduleTypeProfile?.label ?? '未定义'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[12px] font-bold tracking-[0.16em] text-slate-400">模块标识</span>
                  <code className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-[12px] text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    {moduleKey}
                  </code>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setPendingDeleteMenu(null)}
                disabled={isDeletingPendingMenu}
                className={`inline-flex min-w-[108px] items-center justify-center rounded-2xl border px-4 py-3 text-[13px] font-bold transition-all ${
                  isDeletingPendingMenu
                    ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-white'
                }`}
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => void handleSecondLevelMenuDelete(pendingDeleteMenu)}
                disabled={isDeletingPendingMenu}
                className={`inline-flex min-w-[132px] items-center justify-center gap-2 rounded-2xl px-4 py-3 text-[13px] font-bold text-white shadow-[0_20px_40px_-24px_rgba(244,63,94,0.72)] transition-all ${
                  isDeletingPendingMenu
                    ? 'cursor-not-allowed bg-rose-300 dark:bg-rose-900'
                    : 'bg-rose-500 hover:bg-rose-600 dark:bg-rose-500 dark:hover:bg-rose-400'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {isDeletingPendingMenu ? 'progress_activity' : 'delete'}
                </span>
                {isDeletingPendingMenu ? '删除中...' : '确认删除'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  };

  const renderMenuInfoStep = () => {
    const panelShellClass = 'cloudy-glass-panel flex h-full min-h-0 flex-col overflow-hidden rounded-[28px] border border-white/70';
    const panelHeaderClass = 'cloudy-glass-toolbar shrink-0 px-5 py-5';
    const panelTitleClass = 'text-[15px] font-bold leading-6 text-slate-800 break-words dark:text-slate-100';
    const panelBadgeClass = 'cloudy-glass-chip inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold text-slate-500 dark:text-slate-300';
    const panelIconShellClass = 'cloudy-glass-orb flex size-10 shrink-0 items-center justify-center rounded-[16px]';
    const compactInfoCardClass = 'cloudy-glass-panel-soft rounded-[18px] px-3.5 py-3';
    const compactCardClass = 'cloudy-glass-panel-soft rounded-[20px] p-4';
    const sectionTitleClass = 'mb-3 flex items-center gap-2 text-[12px] font-bold text-slate-700 dark:text-slate-100';
    const menuTabs: Array<{ id: 'common' | 'advanced'; label: string; icon: string }> = [
      { id: 'common', label: '常用', icon: 'folder_managed' },
      { id: 'advanced', label: '不常用', icon: 'inventory_2' },
    ];
    const activeSections = menuInfoTab === 'common' ? currentCommonMenuSections : currentAdvancedMenuSections;
    const activeFieldCount = menuInfoTab === 'common' ? currentPinnedMenuKeys.length : currentAdvancedMenuKeys.length;
    const activeFilledCount = menuInfoTab === 'common' ? commonFilledMenuFieldCount : advancedFilledMenuFieldCount;
    const isEditingMenu = activeConfigMenu !== null;
    const isMenuInfoBusy = isMenuInfoLoading || isMenuInfoSaving;

    return (
      <div className="grid flex-1 grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className={panelShellClass}>
          <div className={panelHeaderClass}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#1686e3]/15 bg-[#1686e3]/5 px-3 py-1 text-[11px] font-bold tracking-[0.24em] text-[#1686e3]">
                  菜单信息
                </div>
                <div className="space-y-2">
                  <h3 className="text-[24px] font-black tracking-tight text-slate-900 dark:text-white">
                    常用字段先配，不常用按需收进目录
                  </h3>
                  <p className="max-w-3xl text-[13px] leading-6 text-slate-500 dark:text-slate-300">
                    当前 {currentModuleGuide.label} 共 {currentMenuFieldEntries.length} 项配置，先维护高频入口字段，剩余字段放到不常用页签里分流。
                  </p>
                </div>
              </div>

              {isEditingMenu ? (
                <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-[12px] font-bold text-emerald-600 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
                  <span className="material-symbols-outlined text-[16px]">lock</span>
                  编辑模式已锁定类型
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfigStep(1)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-[12px] font-bold text-slate-500 transition-colors hover:border-[#1686e3]/30 hover:text-[#1686e3] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                >
                  <span className="material-symbols-outlined text-[16px]">swap_horiz</span>
                  返回切换类型
                </button>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-2 rounded-full bg-[#1686e3] px-3 py-1 text-[11px] font-bold text-white shadow-[0_12px_24px_-16px_rgba(22,134,227,0.52)]">
                <span className="material-symbols-outlined text-[15px]">
                  {businessType === 'table' ? 'receipt_long' : 'table_view'}
                </span>
                {currentModuleGuide.label}
              </span>
              <span className={panelBadgeClass}>配置表 {currentModuleGuide.configTable}</span>
              <span className={panelBadgeClass}>已填写 {filledMenuFieldCount}/{currentMenuFieldEntries.length}</span>
              <span className={panelBadgeClass}>{menuInfoTab === 'common' ? '常用目录' : '不常用目录'} {activeFilledCount}/{activeFieldCount}</span>
              {activeConfigModuleKey ? <span className={panelBadgeClass}>模块标识 {activeConfigModuleKey}</span> : null}
            </div>

            <div className="mt-4 flex items-center gap-2 rounded-[18px] border border-slate-200/70 bg-white/82 p-1.5 dark:border-slate-700 dark:bg-slate-900/50">
              {menuTabs.map((tab) => {
                const isActive = menuInfoTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setMenuInfoTab(tab.id)}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-[14px] px-3 py-2 text-[12px] font-bold transition-all ${
                      isActive
                        ? 'bg-white text-slate-800 shadow-[0_14px_28px_-22px_rgba(22,134,227,0.36)] dark:bg-slate-900/92 dark:text-slate-100'
                        : 'text-slate-500 hover:bg-white/80 dark:text-slate-400 dark:hover:bg-slate-900/72'
                    }`}
                  >
                    <span className={`material-symbols-outlined text-[16px] ${isActive ? 'text-[#1686e3]' : 'text-slate-400 dark:text-slate-500'}`}>{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {isEditingMenu ? (
              <div className="mt-4 rounded-[18px] border border-slate-200/70 bg-white/82 px-4 py-3 text-[12px] text-slate-500 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300">
                正在编辑菜单「{normalizeMenuTitle(activeConfigMenu?.title)}」，已按 {currentModuleGuide.label} 类型加载菜单信息。
              </div>
            ) : (
              <div className="mt-4 rounded-[18px] border border-sky-200 bg-sky-50 px-4 py-3 text-[12px] font-semibold text-sky-700 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-300">
                当前是新建模式。首次点击“保存本页”会调用新增接口，创建成功后会自动切到可继续保存的编辑态。
              </div>
            )}

            {isMenuInfoLoading ? (
              <div className="mt-4 rounded-[18px] border border-sky-200 bg-sky-50 px-4 py-3 text-[12px] font-semibold text-sky-700 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-300">
                正在从后端加载菜单信息...
              </div>
            ) : null}

            {menuInfoError ? (
              <div className="mt-4 rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-[12px] font-semibold text-rose-600 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
                {menuInfoError}
              </div>
            ) : null}
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-5">
            {activeSections.length > 0 ? (
              <div className="space-y-4">
                {activeSections.map((section) => (
                  <section key={`${menuInfoTab}-${section.title}`} className={compactCardClass}>
                    <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-slate-200/60 pb-4 dark:border-slate-700/70">
                      <div>
                        <div className={sectionTitleClass}>
                          <span className="material-symbols-outlined text-[16px] text-[#1686e3]">dashboard_customize</span>
                          <span>{section.title}</span>
                        </div>
                        <p className="text-[12px] leading-6 text-slate-500 dark:text-slate-300">{section.description}</p>
                      </div>
                      <span className={panelBadgeClass}>{section.fields.length} 项</span>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      {section.fields.map((field) =>
                        renderMenuInfoField(field, {
                          isDisabled: isMenuInfoBusy,
                          isPinned: currentPinnedMenuKeySet.has(field.key),
                          onTogglePinned: () => toggleMenuPinnedField(field.key, !currentPinnedMenuKeySet.has(field.key)),
                        }),
                      )}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <div className="flex min-h-[280px] items-center justify-center">
                <div className="cloudy-glass-panel-soft max-w-md rounded-[24px] border border-dashed border-slate-300/70 px-6 py-8 text-center dark:border-slate-700">
                  <span className="material-symbols-outlined text-[34px] text-[#1686e3]">
                    {menuInfoTab === 'common' ? 'folder_off' : 'done_all'}
                  </span>
                  <h4 className="mt-4 text-[18px] font-black tracking-tight text-slate-900 dark:text-white">
                    {menuInfoTab === 'common' ? '常用目录还是空的' : '不常用字段已经清空'}
                  </h4>
                  <p className="mt-2 text-[13px] leading-6 text-slate-500 dark:text-slate-300">
                    {menuInfoTab === 'common'
                      ? '先去不常用页签把要常看的字段加进来，目录会自动更新。'
                      : '当前字段已经全部收进常用目录，后续可以在常用页签继续精简。'}
                  </p>
                  {menuInfoTab === 'common' && (
                    <button
                      type="button"
                      onClick={() => setMenuInfoTab('advanced')}
                      className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#1686e3]/20 bg-[#1686e3]/8 px-4 py-2 text-[12px] font-bold text-[#1686e3] transition-colors hover:bg-[#1686e3]/12"
                    >
                      <span className="material-symbols-outlined text-[16px]">add_box</span>
                      去不常用添加字段
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className={panelShellClass}>
            <div className={panelHeaderClass}>
              <div className="flex items-start gap-3">
                <div className={panelIconShellClass}>
                  <span className="material-symbols-outlined text-[18px] text-[#1686e3]">folder_managed</span>
                </div>
                <div>
                  <div className={panelTitleClass}>常用目录</div>
                  <p className="mt-1 text-[12px] leading-5 text-slate-500 dark:text-slate-300">
                    从不常用收进来的字段会直接出现在这里，也可以在这里精简。
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4 p-4">
              <section className={compactCardClass}>
                <div className={sectionTitleClass}>
                  <span className="material-symbols-outlined text-[16px] text-[#1686e3]">list_alt</span>
                  <span>当前常用字段</span>
                </div>
                {currentPinnedMenuKeys.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {currentPinnedMenuKeys.map((key) => {
                      const field = currentMenuFieldMap.get(key);
                      if (!field) return null;

                      return (
                        <button
                          key={`pinned-${key}`}
                          type="button"
                          onClick={() => toggleMenuPinnedField(key, false)}
                          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/88 px-3 py-1.5 text-[11px] font-bold text-slate-600 transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:border-rose-500/30 dark:hover:bg-rose-500/10 dark:hover:text-rose-200"
                        >
                          {field.label}
                          <span className="material-symbols-outlined text-[14px]">close</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-[18px] border border-dashed border-slate-300/70 px-4 py-4 text-[12px] leading-6 text-slate-500 dark:border-slate-700 dark:text-slate-300">
                    这里会显示你保留的高频字段。
                  </div>
                )}
              </section>

              <section className={compactCardClass}>
                <div className={sectionTitleClass}>
                  <span className="material-symbols-outlined text-[16px] text-[#1686e3]">insights</span>
                  <span>配置概览</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                  <div className={compactInfoCardClass}>
                    <div className="text-[11px] font-bold tracking-[0.06em] text-slate-400">常用字段</div>
                    <div className="mt-2 text-[22px] font-black tracking-tight text-slate-900 dark:text-white">{currentPinnedMenuKeys.length}</div>
                    <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-300">已填写 {commonFilledMenuFieldCount}</div>
                  </div>
                  <div className={compactInfoCardClass}>
                    <div className="text-[11px] font-bold tracking-[0.06em] text-slate-400">不常用字段</div>
                    <div className="mt-2 text-[22px] font-black tracking-tight text-slate-900 dark:text-white">{currentAdvancedMenuKeys.length}</div>
                    <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-300">已填写 {advancedFilledMenuFieldCount}</div>
                  </div>
                  <div className={compactInfoCardClass}>
                    <div className="text-[11px] font-bold tracking-[0.06em] text-slate-400">配置表</div>
                    <div className="mt-2 break-all text-[13px] font-bold text-slate-800 dark:text-slate-100">{currentModuleGuide.configTable}</div>
                    <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-300">{currentModuleGuide.configTableDesc}</div>
                  </div>
                </div>
              </section>
            </div>
          </div>

          <div className={panelShellClass}>
            <div className={panelHeaderClass}>
              <div className="flex items-start gap-3">
                <div className={panelIconShellClass}>
                  <span className="material-symbols-outlined text-[18px] text-[#1686e3]">tune</span>
                </div>
                <div>
                  <div className={panelTitleClass}>扩展能力</div>
                  <p className="mt-1 text-[12px] leading-5 text-slate-500 dark:text-slate-300">
                    保留常用功能开关，后面继续映射右键、审批流和附件配置。
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4">
              <section className={compactCardClass}>
                <div className="flex flex-wrap gap-3 relative">
                  {commonFuncs.map((funcId) => {
                    const func = funcOptions.find((item) => item.id === funcId);
                    if (!func) return null;
                    return (
                      <div key={func.id} className="inline-flex items-center gap-2 rounded-[16px] border border-[#1686e3]/18 bg-[#1686e3]/8 px-3.5 py-2 text-[12px] font-bold text-[#1686e3]">
                        <span className="material-symbols-outlined text-[16px]">{func.icon}</span>
                        {func.name}
                        <button type="button" onClick={() => toggleFunc(func.id)} className="flex items-center justify-center transition-colors hover:text-rose-500">
                          <span className="material-symbols-outlined text-[15px]">close</span>
                        </button>
                      </div>
                    );
                  })}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsFuncPopoverOpen(!isFuncPopoverOpen)}
                      className="inline-flex items-center gap-2 rounded-[16px] border border-dashed border-slate-300 px-3.5 py-2 text-[12px] font-bold text-slate-500 transition-all hover:border-[#1686e3]/40 hover:bg-[#1686e3]/6 hover:text-[#1686e3] dark:border-slate-600 dark:text-slate-300"
                    >
                      <span className="material-symbols-outlined text-[16px]">add</span>
                      添加功能
                    </button>
                    <AnimatePresence>
                      {isFuncPopoverOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setIsFuncPopoverOpen(false)}></div>
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute left-0 top-full z-50 mt-2 w-64 rounded-[18px] border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-800"
                          >
                            <div className="mb-2 px-2 pt-1 text-[12px] font-bold text-slate-400">选择扩展功能</div>
                            <div className="space-y-1">
                              {funcOptions.map((func) => {
                                const isSelected = commonFuncs.includes(func.id);
                                return (
                                  <button
                                    key={func.id}
                                    type="button"
                                    onClick={() => toggleFunc(func.id)}
                                    className={`flex w-full items-center justify-between rounded-[14px] px-3 py-2 text-left text-[13px] transition-colors ${isSelected ? 'bg-[#1686e3]/10 text-[#1686e3] font-bold' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700'}`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="material-symbols-outlined text-[18px]">{func.icon}</span>
                                      {func.name}
                                    </div>
                                    {isSelected && <span className="material-symbols-outlined text-[16px]">check</span>}
                                  </button>
                                );
                              })}
                            </div>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const parseDetailBoardClipboardColumnIds = (text: string, availableColumns: any[]) => {
    const availableIds = new Set(availableColumns.map((column) => column.id));

    if (text.startsWith(DETAIL_BOARD_CLIPBOARD_PREFIX)) {
      try {
        const payload = JSON.parse(text.slice(DETAIL_BOARD_CLIPBOARD_PREFIX.length));
        if (Array.isArray(payload?.columnIds)) {
          return payload.columnIds.filter((columnId: string) => availableIds.has(columnId));
        }
      } catch {
        return [];
      }
    }

    const pastedTokens = text
      .split(/[\n,，;；|]/)
      .map((item) => item.trim())
      .filter(Boolean);

    if (pastedTokens.length === 0) return [];

    const matchedColumns = availableColumns.filter((column) => (
      pastedTokens.includes(column.id) || pastedTokens.includes(column.name)
    ));

    return matchedColumns.map((column) => column.id);
  };

  const activateColumnSelection = (scope: 'left' | 'main' | 'detail', columnId: string | null) => {
    setBuilderSelectionContextMenu(null);
    setInspectorTarget({
      kind: scope === 'left' ? 'left-col' : scope === 'main' ? 'main-col' : 'detail-col',
      id: columnId,
    });
  };

  const activateConditionSelection = (scope: 'left' | 'main' | 'detail', conditionId: string | null) => {
    setBuilderSelectionContextMenu(null);
    setInspectorTarget(conditionId ? {
      kind: scope === 'left' ? 'left-filter' : scope === 'main' ? 'main-filter' : 'detail-filter',
      id: conditionId,
    } : { kind: 'none' });
  };

  const activateDetailConditionSelection = (conditionId: string | null) => {
    activateConditionSelection('detail', conditionId);
  };

  const activateTableConfigSelection = (scope: 'left' | 'main' | 'detail') => {
    setBuilderSelectionContextMenu(null);
    setInspectorTarget({
      kind: scope === 'left' ? 'left-grid' : scope === 'main' ? 'main-grid' : 'detail-grid',
    });
  };

  const activateContextMenuSelection = (scope: 'main' | 'detail') => {
    setBuilderSelectionContextMenu(null);
    setInspectorTarget({ kind: scope === 'main' ? 'main-context' : 'detail-context' });
  };

  const activateDetailTabSelection = (tabId: string | null) => {
    setBuilderSelectionContextMenu(null);
    setInspectorTarget(tabId ? { kind: 'detail-tab', id: tabId } : { kind: 'none' });
  };

  const openDetailBoardPreview = (rowId: number, preferredSortColumnId?: string | null) => {
    setDetailBoardSortColumnId(preferredSortColumnId ?? selectedMainColId ?? mainTableColumns[0]?.id ?? null);
    setDetailBoardOpenedRowId(rowId);
    setIsDetailBoardOpen(true);
  };

  const updateMainDetailBoard = (patch: Record<string, any> | ((current: any) => any)) => {
    setMainTableConfig((prev) => {
      const current = normalizeDetailBoardConfig(prev.detailBoard, mainTableColumns);
      return {
        ...prev,
        detailBoard: typeof patch === 'function'
          ? patch(current)
          : {
              ...current,
              ...patch,
            },
      };
    });
  };

  const startDetailBoardFieldResize = (
    event: React.MouseEvent<HTMLButtonElement>,
    groupId: string,
    columnId: string,
    label: string,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    const startX = event.pageX;
    const previewItem = event.currentTarget.closest('[data-detail-field-item="true"]') as HTMLElement | null;
    const startWidth = previewItem?.getBoundingClientRect().width ?? 320;
    const minWidth = 220;
    const maxWidth = 920;
    let latestWidth = startWidth;

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    setActiveDetailBoardResize({ groupId, columnId, label, width: startWidth });

    const commitWidth = (nextWidth: number) => {
      updateMainDetailBoard((current: any) => ({
        ...current,
        groups: current.groups.map((group: any) => (
          group.id === groupId
            ? {
                ...group,
                columnWidths: {
                  ...group.columnWidths,
                  [columnId]: nextWidth,
                },
              }
            : group
        )),
      }));
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      latestWidth = Math.max(minWidth, Math.min(maxWidth, startWidth + (moveEvent.pageX - startX)));
      setActiveDetailBoardResize((prev) => (
        prev?.groupId === groupId && prev.columnId === columnId ? { ...prev, width: latestWidth } : prev
      ));

      if (detailBoardResizeFrameRef.current !== null) return;
      detailBoardResizeFrameRef.current = window.requestAnimationFrame(() => {
        detailBoardResizeFrameRef.current = null;
        commitWidth(latestWidth);
      });
    };

    const handleMouseUp = () => {
      if (detailBoardResizeFrameRef.current !== null) {
        window.cancelAnimationFrame(detailBoardResizeFrameRef.current);
        detailBoardResizeFrameRef.current = null;
      }
      commitWidth(latestWidth);
      setActiveDetailBoardResize((prev) => (
        prev?.groupId === groupId && prev.columnId === columnId ? null : prev
      ));
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const resetDetailBoardFieldWidth = (
    event: React.MouseEvent<HTMLButtonElement>,
    groupId: string,
    columnId: string,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    updateMainDetailBoard((current: any) => ({
      ...current,
      groups: current.groups.map((group: any) => (
        group.id === groupId
          ? {
              ...group,
              columnWidths: Object.fromEntries(
                Object.entries(group.columnWidths ?? {}).filter(([key]) => key !== columnId),
              ),
            }
          : group
      )),
    }));
  };

  const deleteSelectedColumns = (scope: 'left' | 'main' | 'detail', ids: string[]) => {
    const targetIds = Array.from(new Set(ids.filter(Boolean)));
    if (targetIds.length === 0) return;

    if (scope === 'left') {
      setLeftTableColumns((prev) => prev.filter((column) => !targetIds.includes(column.id)));
      setSelectedLeftForDelete([]);
    }

    if (scope === 'main') {
      setMainTableColumns((prev) => prev.filter((column) => !targetIds.includes(column.id)));
      if (businessType === 'table') {
        setBillMetaFields((prev) => prev.filter((column) => !targetIds.includes(column.id)));
      }
      setSelectedMainForDelete([]);
      setActiveBillDragId((prev) => (prev && targetIds.includes(prev) ? null : prev));
      setActiveBillResizeId((prev) => (prev && targetIds.includes(prev) ? null : prev));
    }

    if (scope === 'detail') {
      if (businessType === 'table') {
        setBillDetailColumns((prev) => prev.filter((column) => !targetIds.includes(column.id)));
      } else {
        setDetailTableColumns((prev) => ({
          ...prev,
          [activeTab]: (prev[activeTab] || []).filter((column) => !targetIds.includes(column.id)),
        }));
      }
      setSelectedDetailForDelete([]);
    }

    setBuilderSelectionContextMenu(null);
    setInspectorTarget((prev) => {
      if (scope === 'left' && prev.kind === 'left-col' && prev.id && targetIds.includes(prev.id)) {
        return { kind: 'none' };
      }
      if (scope === 'main' && prev.kind === 'main-col' && prev.id && targetIds.includes(prev.id)) {
        return { kind: 'none' };
      }
      if (scope === 'detail' && prev.kind === 'detail-col' && prev.id && targetIds.includes(prev.id)) {
        return { kind: 'none' };
      }
      return prev;
    });
  };

  const deleteSelectedConditions = (scope: 'left' | 'main' | 'detail', ids: string[]) => {
    const targetIds = Array.from(new Set(ids.filter(Boolean)));
    if (targetIds.length === 0) return;

    if (scope === 'left') {
      setLeftFilterFields((prev) => prev.filter((field) => !targetIds.includes(field.id)));
      setSelectedLeftFiltersForDelete([]);
    }

    if (scope === 'main') {
      setMainFilterFields((prev) => prev.filter((field) => !targetIds.includes(field.id)));
      setSelectedMainFiltersForDelete([]);
    }

    if (scope === 'detail') {
      setDetailFilterFields((prev) => ({
        ...prev,
        [activeTab]: (prev[activeTab] || []).filter((field) => !targetIds.includes(field.id)),
      }));
      setSelectedDetailFiltersForDelete([]);
    }

    setBuilderSelectionContextMenu(null);
    setInspectorTarget((prev) => {
      if (scope === 'left' && prev.kind === 'left-filter' && prev.id && targetIds.includes(prev.id)) {
        return { kind: 'none' };
      }
      if (scope === 'main' && prev.kind === 'main-filter' && prev.id && targetIds.includes(prev.id)) {
        return { kind: 'none' };
      }
      if (scope === 'detail' && prev.kind === 'detail-filter' && prev.id && targetIds.includes(prev.id)) {
        return { kind: 'none' };
      }
      return prev;
    });
  };

  const addTab = () => {
    const newId = `tab_${Date.now()}`;
    setDetailTabs([...detailTabs, { id: newId, name: `新页签 ${detailTabs.length + 1}` }]);
    setActiveTab(newId);
    setTabFillTypes({ ...tabFillTypes, [newId]: '表格' });
    setDetailFilterFields((prev) => ({
      ...prev,
      [newId]: [buildConditionField(1, { name: '关键字', placeholder: '请输入关键字', width: 220 })],
    }));
    setDetailTabConfigs((prev) => ({
      ...prev,
      [newId]: buildDetailTabConfig({ relatedModule: '未关联模块', relatedCondition: 'parent_id = ${id}' }),
    }));
    setDetailTableColumns({ ...detailTableColumns, [newId]: [
      { id: `d_col_${Date.now()}_1`, name: '新字段 1', type: '文本', width: 120 },
      { id: `d_col_${Date.now()}_2`, name: '新字段 2', type: '文本', width: 120 },
    ] });
    setDetailTableConfigs((prev) => ({
      ...prev,
      [newId]: buildGridConfig('SELECT * FROM detail_table', 'parent_id = ${id}', {
        contextMenuItems: [buildContextMenuItem(1, { label: '查看记录', actionKey: 'open-detail' })],
      }),
    }));
  };

  const deleteTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newTabs = detailTabs.filter(t => t.id !== id);
    setDetailTabs(newTabs);
    setTabFillTypes(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setDetailFilterFields((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setDetailTabConfigs((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setDetailTableColumns(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setDetailTableConfigs((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (activeTab === id) {
      setActiveTab(newTabs.length > 0 ? newTabs[0].id : '');
    }
    if (selectedDetailTabId === id) {
      setInspectorTarget({ kind: 'none' });
    }
  };

  const handlePasteColumns = (
    e: React.ClipboardEvent,
    setCols: React.Dispatch<React.SetStateAction<any[]>>,
    options?: {
      createColumn?: (name: string, index: number, currentLength: number) => any;
    },
  ) => {
    const text = e.clipboardData.getData('text');
    if (!text) return;
    const newColNames = text.split(/[\t\n]/).map(s => s.trim()).filter(Boolean);
    if (newColNames.length > 0) {
      e.preventDefault();
      setCols(prev => {
        const newCols = newColNames.map((name, i) => (
          options?.createColumn
            ? options.createColumn(name, i, prev.length)
            : buildColumn('col', prev.length + i + 1, { name })
        ));
        return [...prev, ...newCols];
      });
    }
  };

  const updateColType = (id: string, type: string, setCols: React.Dispatch<React.SetStateAction<any[]>>) => {
    setCols(prev => prev.map(c => c.id === id ? { ...c, type } : c));
  };

  const estimateColumnWidth = (
    rawColumn: any,
    minWidth = TABLE_COLUMN_MIN_WIDTH,
    maxWidth = TABLE_COLUMN_AUTO_FIT_MAX_WIDTH,
  ) => {
    const column = normalizeColumn(rawColumn);
    const contentLength = Math.max(
      column.name?.length ?? 0,
      column.placeholder?.length ?? 0,
      column.defaultValue?.length ?? 0,
      column.type?.length ?? 0,
    );
    const baseWidth =
      column.type === '日期框'
        ? 188
        : column.type === '数字'
          ? 144
          : column.type === '搜索框'
            ? 228
            : column.type === '下拉框'
              ? 176
              : 124;

    return Math.max(minWidth, Math.min(maxWidth, baseWidth + contentLength * 15));
  };

  const autoFitColumnWidth = (
    event: React.MouseEvent,
    colId: string,
    cols: any[],
    setCols: React.Dispatch<React.SetStateAction<any[]>>,
    minWidth = TABLE_COLUMN_MIN_WIDTH,
    maxWidth = TABLE_COLUMN_AUTO_FIT_MAX_WIDTH,
    mode: 'column' | 'filter' = 'column',
  ) => {
    event.preventDefault();
    event.stopPropagation();
    const targetCol = cols.find((item) => item.id === colId);
    if (!targetCol) return;

    const nextWidth = estimateColumnWidth(targetCol, minWidth, maxWidth);
    setActiveResize({ id: colId, label: targetCol.name || '未命名字段', width: nextWidth, mode });
    setCols((prev) => prev.map((item) => item.id === colId ? { ...item, width: nextWidth } : item));
    window.setTimeout(() => setActiveResize((prev) => prev?.id === colId ? null : prev), 720);
  };

  const startResize = (
    e: React.MouseEvent,
    colId: string,
    cols: any[],
    setCols: React.Dispatch<React.SetStateAction<any[]>>,
    minWidth = TABLE_COLUMN_MIN_WIDTH,
    maxWidth = TABLE_COLUMN_RESIZE_MAX_WIDTH,
    mode: 'column' | 'filter' = 'column',
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.pageX;
    const targetCol = cols.find((item) => item.id === colId);
    const startWidth = targetCol?.width || 100;
    const resizeLabel = targetCol?.name || '未命名字段';
    let latestWidth = startWidth;

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    setActiveResize({ id: colId, label: resizeLabel, width: startWidth, mode });

    const handleMouseMove = (moveEvent: MouseEvent) => {
      latestWidth = Math.max(minWidth, Math.min(maxWidth, startWidth + (moveEvent.pageX - startX)));
      setActiveResize((prev) => prev?.id === colId ? { ...prev, width: latestWidth } : prev);
      if (resizeFrameRef.current !== null) return;
      resizeFrameRef.current = window.requestAnimationFrame(() => {
        resizeFrameRef.current = null;
        setCols(prev => prev.map(c => c.id === colId ? { ...c, width: latestWidth } : c));
      });
    };

    const handleMouseUp = () => {
      if (resizeFrameRef.current !== null) {
        window.cancelAnimationFrame(resizeFrameRef.current);
        resizeFrameRef.current = null;
      }
      setCols(prev => prev.map(c => c.id === colId ? { ...c, width: latestWidth } : c));
      setActiveResize((prev) => prev?.id === colId ? null : prev);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const getFieldOptionValues = (rawField: any) => {
    const field = normalizeColumn(rawField);
    const source = field.dictCode || field.helpText || '';

    if (/[,\n，;；|]/.test(source)) {
      const items = source
        .split(/[\n,，;；|]/)
        .map((item: string) => item.trim())
        .filter(Boolean);

      if (items.length > 0) {
        return items;
      }
    }

    if (field.type === '下拉框') {
      return ['正常', '停用', '草稿'];
    }

    if (field.type === '单选框') {
      return ['是', '否'];
    }

    if (field.type === '多选框') {
      return ['标签A', '标签B', '标签C'];
    }

    return [];
  };

  const getPreviewCellValue = (rawCol: any, rowIndex: number) => {
    const col = normalizeColumn(rawCol);
    const fieldName = col.name || '字段';
    const optionValues = getFieldOptionValues(col);

    if (col.defaultValue) {
      return col.defaultValue;
    }

    if (col.type === '数字' || /金额|单价|数量|价格|余额/.test(fieldName)) {
      return `${(rowIndex + 1) * 125}`;
    }

    if (col.type === '日期框' || /日期|时间/.test(fieldName)) {
      return `2026-03-${String(rowIndex + 18).padStart(2, '0')}`;
    }

    if (col.type === '下拉框' || col.type === '单选框') {
      return optionValues[rowIndex % optionValues.length] || '未选择';
    }

    if (col.type === '多选框') {
      return optionValues.slice(0, 2).join('、') || '标签A、标签B';
    }

    if (/编码|编号/.test(fieldName)) {
      return `NO-${String(rowIndex + 1).padStart(3, '0')}`;
    }

    if (/名称/.test(fieldName)) {
      return `示例${rowIndex + 1}`;
    }

    if (/单位/.test(fieldName)) {
      return ['个', '件', '套'][rowIndex % 3];
    }

    if (col.type === '搜索框') {
      return `${fieldName}检索词`;
    }

    return `${fieldName}${rowIndex + 1}`;
  };

  const renderFieldPreview = (rawField: any, rowIndex: number, mode: 'table' | 'filter' = 'table') => {
    const field = normalizeColumn(rawField);
    const previewValue = getPreviewCellValue(field, rowIndex);
    const optionValues = getFieldOptionValues(field);
    const isFilterMode = mode === 'filter';
    const inputClass = isFilterMode
      ? 'h-10 w-full rounded-xl border border-slate-200/90 bg-white/96 px-3 text-[12px] text-slate-700 outline-none transition shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] focus:border-[color:var(--workspace-accent-border-strong)] focus:ring-4 focus:ring-[color:var(--workspace-accent-soft)] dark:border-slate-700 dark:bg-slate-900/88 dark:text-slate-200'
      : 'h-10 w-full rounded-xl border border-slate-200/80 bg-white/94 px-3 text-[12px] text-slate-700 outline-none transition shadow-[0_10px_20px_-18px_rgba(15,23,42,0.22),inset_0_1px_0_rgba(255,255,255,0.72)] focus:border-[color:var(--workspace-accent-border-strong)] focus:ring-4 focus:ring-[color:var(--workspace-accent-soft)] dark:border-slate-700 dark:bg-slate-900/88 dark:text-slate-100';
    const compactInputClass = `${inputClass} px-2.5`;
    const previewKey = `${field.id}-${field.type}-${field.dictCode}-${field.defaultValue}-${field.placeholder}`;

    const stopPreviewEvent = (event: React.SyntheticEvent) => {
      event.stopPropagation();
    };

    if (isFilterMode) {
      const shellClass = 'flex h-9 w-full items-center justify-between gap-2 rounded-[10px] border border-slate-200/90 bg-white px-3 text-[12px] text-slate-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200';
      const staticValue = field.placeholder || previewValue || `${field.name}示例值`;
      const trailingIcon = field.type === '日期框'
        ? 'calendar_month'
        : field.type === '下拉框' || field.type === '多选框'
          ? 'expand_more'
          : field.type === '搜索框'
            ? 'search'
            : '';

      if (field.type === '多选框') {
        const tags = (optionValues.length > 0 ? optionValues : ['标签A', '标签B']).slice(0, 2);
        return (
          <div className={shellClass}>
            <div className="flex min-w-0 flex-1 items-center gap-1.5">
              <div className="flex min-w-0 flex-wrap gap-1">
                {tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <span className="material-symbols-outlined text-[16px] text-slate-300 dark:text-slate-500">expand_more</span>
          </div>
        );
      }

      if (field.type === '单选框') {
        const value = optionValues[0] || previewValue || '是';
        return (
          <div className={shellClass}>
            <div className="flex min-w-0 items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[color:var(--workspace-accent)]" />
              <span className="truncate">{value}</span>
            </div>
          </div>
        );
      }

      return (
        <div className={shellClass}>
          <div className="min-w-0 flex-1">
            <span className={`truncate ${field.type === '数字' ? 'font-semibold tabular-nums' : ''}`}>{staticValue}</span>
          </div>
          {trailingIcon ? (
            <span className="material-symbols-outlined text-[16px] text-slate-300 dark:text-slate-500">
              {trailingIcon}
            </span>
          ) : null}
        </div>
      );
    }

    if (field.type === '日期框') {
      return (
        <input
          key={previewKey}
          data-preview-control="true"
          type="date"
          defaultValue={previewValue}
          className={compactInputClass}
          onClick={stopPreviewEvent}
          onDoubleClick={stopPreviewEvent}
        />
      );
    }

    if (field.type === '下拉框') {
      return (
        <select
          key={previewKey}
          data-preview-control="true"
          defaultValue={optionValues.includes(previewValue) ? previewValue : optionValues[0] || ''}
          className={compactInputClass}
          onClick={stopPreviewEvent}
          onDoubleClick={stopPreviewEvent}
        >
          {optionValues.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    }

    if (field.type === '搜索框') {
      return (
        <div
          data-preview-control="true"
          className="relative"
          onClick={stopPreviewEvent}
          onDoubleClick={stopPreviewEvent}
        >
          <span className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[16px] text-slate-400 ${isFilterMode ? '' : 'z-[1]'}`}>
            search
          </span>
          <input
            key={previewKey}
            defaultValue={previewValue || ''}
            placeholder={field.placeholder || `请输入${field.name}`}
            className={`${compactInputClass} ${isFilterMode ? 'pl-8 pr-3' : 'pl-8 pr-3'} min-w-0`}
          />
        </div>
      );
    }

    if (field.type === '单选框') {
      return (
        <div
          data-preview-control="true"
          className="flex flex-wrap items-center gap-3"
          onClick={stopPreviewEvent}
          onDoubleClick={stopPreviewEvent}
        >
          {(optionValues.length > 0 ? optionValues : ['是', '否']).map((option) => (
            <label key={option} className="inline-flex items-center gap-1.5 text-[12px] text-slate-600 dark:text-slate-300">
              <input
                type="radio"
                name={`${field.id}-${mode}`}
                defaultChecked={option === previewValue}
                className="h-3.5 w-3.5 accent-[color:var(--workspace-accent)]"
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
      );
    }

    if (field.type === '多选框') {
      const tags = optionValues.slice(0, 2);
      return (
        <div
          data-preview-control="true"
          className="flex flex-wrap gap-2"
          onClick={stopPreviewEvent}
          onDoubleClick={stopPreviewEvent}
        >
          {(optionValues.length > 0 ? optionValues : ['标签A', '标签B', '标签C']).map((tag, index) => (
            <label key={tag} className="inline-flex items-center gap-1.5 text-[12px] text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                defaultChecked={index < (tags.length > 0 ? tags.length : 2)}
                className="h-3.5 w-3.5 rounded accent-[#1686e3]"
              />
              <span>{tag}</span>
            </label>
          ))}
        </div>
      );
    }

    if (field.type === '数字') {
      return (
        <input
          key={previewKey}
          data-preview-control="true"
          type="number"
          defaultValue={previewValue}
          className={`${compactInputClass} text-right font-semibold tabular-nums`}
          onClick={stopPreviewEvent}
          onDoubleClick={stopPreviewEvent}
        />
      );
    }

    return (
      <input
        key={previewKey}
        data-preview-control="true"
        type="text"
        defaultValue={previewValue || ''}
        placeholder={field.placeholder || `${field.name}示例值`}
        className={compactInputClass}
        onClick={stopPreviewEvent}
        onDoubleClick={stopPreviewEvent}
      />
    );
  };

  const renderBillFormControlPreview = (rawField: any, rowIndex: number) => {
    const field = normalizeColumn(rawField);
    const optionValues = getFieldOptionValues(field);
    const previewValue = getPreviewCellValue(field, rowIndex) || field.placeholder || `${field.name}示例`;
    const fontSize = Math.max(11, Math.min(18, Number(field.fontSize) || BILL_FORM_DEFAULT_FONT_SIZE));
    const shellStyle = { fontSize };
    const shellClass = 'bill-designer-control-shell flex h-9 w-full items-center gap-2 rounded-[12px] px-3.5 text-slate-700 dark:text-slate-200';

    if (field.type === '单选框') {
      const radioValues = (optionValues.length > 0 ? optionValues : ['是', '否']).slice(0, 2);
      return (
        <div className={`${shellClass} flex-wrap gap-4`} style={shellStyle}>
          {radioValues.map((option, index) => (
            <div key={option} className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
              <span className={`inline-flex size-3 rounded-full border ${index === 0 ? 'border-[color:var(--workspace-accent)] bg-[color:var(--workspace-accent)]' : 'border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900'}`} />
              <span>{option}</span>
            </div>
          ))}
        </div>
      );
    }

    if (field.type === '多选框') {
      const tags = (optionValues.length > 0 ? optionValues : ['标签A', '标签B', '标签C']).slice(0, 2);
      return (
        <div className={shellClass} style={shellStyle}>
          <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span key={tag} className="inline-flex items-center rounded-full border border-white/80 bg-white/80 px-2 py-0.5 text-[10px] font-semibold text-slate-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] dark:bg-slate-800/80 dark:text-slate-300">
                {tag}
              </span>
            ))}
          </div>
        </div>
      );
    }

    if (field.type === '搜索框') {
      return (
        <div className={shellClass} style={shellStyle}>
          <span className="material-symbols-outlined text-[15px] text-slate-400">search</span>
          <div className="min-w-0 flex-1 truncate">{previewValue}</div>
          <span className="material-symbols-outlined text-[15px] text-slate-300">arrow_drop_down</span>
        </div>
      );
    }

    if (field.type === '下拉框') {
      const optionLabel = optionValues[0] || previewValue;
      return (
        <div className={shellClass} style={shellStyle}>
          <div className="min-w-0 flex-1 truncate">{optionLabel}</div>
          <span className="material-symbols-outlined text-[16px] text-slate-400">arrow_drop_down</span>
        </div>
      );
    }

    if (field.type === '日期框') {
      return (
        <div className={shellClass} style={shellStyle}>
          <div className="min-w-0 flex-1 truncate">{previewValue}</div>
          <span className="material-symbols-outlined text-[15px] text-slate-400">calendar_month</span>
        </div>
      );
    }

    if (field.type === '数字') {
      return (
        <div className={shellClass} style={shellStyle}>
          <div className="min-w-0 flex-1 text-right font-semibold tabular-nums">{previewValue}</div>
        </div>
      );
    }

    return (
      <div className={shellClass} style={shellStyle}>
        <div className="min-w-0 flex-1 truncate">{previewValue}</div>
      </div>
    );
  };

  const autoArrangeBillHeaderFields = () => {
    const boardWidth = billHeaderCanvasRef.current?.clientWidth ?? 1080;
    const usableWidth = Math.max(760, boardWidth - BILL_FORM_LAYOUT_PADDING_X * 2);
    const flowItems = [...mainTableColumns, ...billMetaFields]
      .map((field, index) => ({
        ...field,
        __order: index,
      }));

    let cursorX = BILL_FORM_LAYOUT_PADDING_X;
    let cursorY = BILL_FORM_LAYOUT_PADDING_Y;
    let rowHeight = BILL_FORM_ROW_HEIGHT;

    const arranged = flowItems.map((field) => {
      const normalizedField = normalizeColumn(field);
      const nextWidth = Math.max(BILL_FORM_MIN_WIDTH, normalizedField.width || BILL_FORM_DEFAULT_WIDTH);
      const nextHeight = BILL_FORM_ROW_HEIGHT;

      if (cursorX > BILL_FORM_LAYOUT_PADDING_X && cursorX + nextWidth > BILL_FORM_LAYOUT_PADDING_X + usableWidth) {
        cursorX = BILL_FORM_LAYOUT_PADDING_X;
        cursorY += rowHeight + BILL_FORM_LAYOUT_GAP_Y;
        rowHeight = nextHeight;
      } else {
        rowHeight = Math.max(rowHeight, nextHeight);
      }

      const positioned = {
        ...field,
        canvasX: cursorX,
        canvasY: cursorY,
        width: nextWidth,
      };

      cursorX += nextWidth + BILL_FORM_LAYOUT_GAP_X;
      return positioned;
    });

    const arrangedMain = arranged
      .filter((field) => !String(field.id).startsWith('bill_meta_'))
      .map(({ __order, __x, __y, ...field }) => field);
    const arrangedMeta = arranged
      .filter((field) => String(field.id).startsWith('bill_meta_'))
      .map(({ __order, __x, __y, ...field }) => field);

    setMainTableColumns(arrangedMain);
    setBillMetaFields(arrangedMeta);
  };

  const startBillFieldDrag = (event: React.MouseEvent<HTMLDivElement>, columnId: string, scope: BillCanvasFieldScope = 'main') => {
    event.preventDefault();
    event.stopPropagation();

    const canvasRect = billHeaderCanvasRef.current?.getBoundingClientRect();
    const targetColumn = (scope === 'main' ? mainTableColumns : billMetaFields).find((column) => column.id === columnId);
    if (!canvasRect || !targetColumn) return;

    const normalizedColumn = normalizeColumn(targetColumn);
    const fieldWidth = Math.max(BILL_FORM_MIN_WIDTH, normalizedColumn.width || BILL_FORM_DEFAULT_WIDTH);

    billFieldDragRef.current = {
      id: columnId,
      scope,
      startX: event.clientX,
      startY: event.clientY,
      startCanvasX: normalizedColumn.canvasX ?? BILL_FORM_LAYOUT_PADDING_X,
      startCanvasY: normalizedColumn.canvasY ?? BILL_FORM_LAYOUT_PADDING_Y,
      fieldWidth,
      boardWidth: canvasRect.width,
      boardHeight: canvasRect.height,
    };
    setActiveBillDragId(columnId);
    setActiveBillResizeId(null);
    setBillFieldSnapGuides(EMPTY_BILL_FIELD_GUIDES);
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
  };
  const startBillFieldResize = (event: React.MouseEvent<HTMLDivElement>, columnId: string, scope: BillCanvasFieldScope = 'main') => {
    event.preventDefault();
    event.stopPropagation();

    const canvasRect = billHeaderCanvasRef.current?.getBoundingClientRect();
    const targetColumn = (scope === 'main' ? mainTableColumns : billMetaFields).find((column) => column.id === columnId);
    if (!canvasRect || !targetColumn) return;

    const normalizedColumn = normalizeColumn(targetColumn);
    billFieldResizeRef.current = {
      id: columnId,
      scope,
      startX: event.clientX,
      startWidth: Math.max(BILL_FORM_MIN_WIDTH, normalizedColumn.width || BILL_FORM_DEFAULT_WIDTH),
      startCanvasX: normalizedColumn.canvasX ?? BILL_FORM_LAYOUT_PADDING_X,
      boardWidth: canvasRect.width,
    };
    setActiveBillDragId(null);
    setActiveBillResizeId(columnId);
    setBillFieldSnapGuides(EMPTY_BILL_FIELD_GUIDES);
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
  };

  const renderBillHeaderWorkbench = () => {
    const canvasHeight = Math.max(
      360,
      mainTableColumns.reduce((maxHeight, column) => {
        const normalizedColumn = normalizeColumn(column);
        return Math.max(maxHeight, (normalizedColumn.canvasY ?? BILL_FORM_LAYOUT_PADDING_Y) + 78);
      }, BILL_FORM_LAYOUT_PADDING_Y) + 40,
    );
    const getCardSelectionClass = (isActive: boolean, isMarkedForDelete: boolean) => (
      isActive
        ? 'border-[color:var(--workspace-accent-border-strong)] bg-[color:var(--workspace-accent-tint)] shadow-[0_0_0_3px_var(--workspace-accent-soft),0_24px_44px_-32px_var(--workspace-accent-shadow)]'
        : isMarkedForDelete
          ? 'border-[color:var(--workspace-accent-border)] bg-[color:var(--workspace-accent-soft)] shadow-[0_18px_34px_-28px_rgba(15,23,42,0.16)]'
          : 'border-white/70 bg-white/78 shadow-[0_18px_34px_-28px_rgba(15,23,42,0.16)] hover:border-[color:var(--workspace-accent-border)] hover:bg-white/92'
    );
    const buildSelectedIds = (columnId: string, append: boolean) => (
      selectedMainForDelete.includes(columnId)
        ? selectedMainForDelete
        : append
          ? Array.from(new Set([...selectedMainForDelete, columnId]))
          : [columnId]
    );
    const handleBillFieldSelect = (event: React.MouseEvent<HTMLDivElement>, columnId: string) => {
      setBuilderSelectionContextMenu(null);
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        setSelectedMainForDelete((prev) => (
          prev.includes(columnId) ? prev.filter((item) => item !== columnId) : [...prev, columnId]
        ));
        return;
      }

      setSelectedMainForDelete([columnId]);
      activateColumnSelection('main', columnId);
    };
    const handleBillFieldContextMenu = (event: React.MouseEvent<HTMLDivElement>, columnId: string) => {
      event.preventDefault();
      event.stopPropagation();
      const nextSelectedIds = buildSelectedIds(columnId, event.ctrlKey || event.metaKey);
      setSelectedMainForDelete(nextSelectedIds);
      activateColumnSelection('main', columnId);
      setBuilderSelectionContextMenu({
        kind: 'column',
        scope: 'main',
        x: event.clientX,
        y: event.clientY,
        ids: nextSelectedIds,
      });
    };

    return (
      <div style={workspaceThemeVars} className={`cloudy-glass-panel flex min-h-0 flex-col overflow-hidden rounded-[30px] border border-white/75 ${workspaceThemeStyles.tableSurface}`}>
        <div className="cloudy-glass-toolbar flex items-center justify-between gap-3 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="cloudy-glass-orb flex size-10 items-center justify-center rounded-2xl text-[color:var(--workspace-accent)]">
              <span className="material-symbols-outlined text-[18px]">dashboard</span>
            </div>
            <div>
              <h4 className="text-[13px] font-bold text-slate-800 dark:text-slate-100">单据头部看板</h4>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={activateSourceGridSelection}
              className={`cloudy-glass-chip inline-flex h-9 items-center gap-1.5 rounded-[14px] border px-3 text-[12px] font-bold transition-colors ${
                inspectorTarget.kind === 'source-grid'
                  ? 'border-[color:var(--workspace-accent-border-strong)] bg-[color:var(--workspace-accent)] text-white'
                  : 'border-[color:var(--workspace-accent-border)] text-[color:var(--workspace-accent)] hover:bg-[color:var(--workspace-accent-soft)]'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">database</span>
              来源表
            </button>
            <button
              type="button"
              onClick={autoArrangeBillHeaderFields}
              className="cloudy-glass-chip inline-flex h-9 items-center gap-1.5 rounded-[14px] border border-white/80 px-3 text-[12px] font-bold text-slate-600 transition-colors hover:bg-white dark:border-white/10 dark:text-slate-200"
            >
              <span className="material-symbols-outlined text-[15px]">auto_awesome_motion</span>
              自动整理
            </button>
            <button
              type="button"
              onClick={() => setMainTableColumns((prev) => [
                ...prev,
                buildColumn('m_col', prev.length + 1, {
                  width: BILL_FORM_DEFAULT_WIDTH,
                  ...getBillFieldLayout(prev.length, BILL_FORM_DEFAULT_WIDTH),
                }),
              ])}
              className="inline-flex h-9 items-center gap-1.5 rounded-[14px] bg-[color:var(--workspace-accent)] px-3 text-[12px] font-bold text-white shadow-[0_18px_32px_-24px_var(--workspace-accent-shadow)] transition-colors hover:bg-[color:var(--workspace-accent-strong)]"
            >
              <span className="material-symbols-outlined text-[15px]">add</span>
              新增控件
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 px-4 pb-4">
          <div
            ref={billHeaderCanvasRef}
            tabIndex={0}
            style={{ minHeight: canvasHeight }}
            onClick={() => {
              setSelectedMainForDelete([]);
              activateTableConfigSelection('main');
            }}
            onPaste={(event) => handlePasteColumns(event, setMainTableColumns, {
              createColumn: (name, index, currentLength) => buildColumn('m_col', currentLength + index + 1, {
                name,
                width: BILL_FORM_DEFAULT_WIDTH,
                ...getBillFieldLayout(currentLength + index, BILL_FORM_DEFAULT_WIDTH),
              }),
            })}
            className={`cloudy-cloud-grid scrollbar-none relative h-full overflow-auto rounded-[28px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.66),rgba(248,250,252,0.8))] p-5 outline-none transition-colors ${inspectorTarget.kind === 'main-grid' ? 'shadow-[inset_0_0_0_2px_var(--workspace-accent-border-strong)]' : ''}`}
          >
            <div className="pointer-events-none absolute right-5 top-5 inline-flex items-center gap-1.5 rounded-full border border-[color:var(--workspace-accent-border)] bg-white/84 px-3 py-1 text-[11px] font-bold text-[color:var(--workspace-accent)] shadow-[0_16px_28px_-24px_rgba(15,23,42,0.16)]">
              <span className="material-symbols-outlined text-[14px]">content_paste</span>
              Excel 复制后直接 Ctrl+V
            </div>
            {mainTableColumns.length > 0 ? mainTableColumns.map((column, index) => {
              const normalizedColumn = normalizeColumn(column);
              const isActive = selectedMainColId === column.id;
              const isMarkedForDelete = selectedMainForDelete.includes(column.id);
              const fieldWidth = Math.max(BILL_FORM_MIN_WIDTH, normalizedColumn.width || BILL_FORM_DEFAULT_WIDTH);
              const labelWidth = Math.max(58, Math.min(112, Number(normalizedColumn.labelWidth) || BILL_FORM_DEFAULT_LABEL_WIDTH));
              const fontSize = Math.max(11, Math.min(18, Number(normalizedColumn.fontSize) || BILL_FORM_DEFAULT_FONT_SIZE));

              return (
                <div
                  key={column.id}
                  role="button"
                  tabIndex={0}
                  style={{
                    left: normalizedColumn.canvasX ?? BILL_FORM_LAYOUT_PADDING_X,
                    top: normalizedColumn.canvasY ?? BILL_FORM_LAYOUT_PADDING_Y,
                    width: fieldWidth,
                  }}
                  onClick={(event) => {
                    event.stopPropagation();
                    handleBillFieldSelect(event, column.id);
                  }}
                  onContextMenu={(event) => handleBillFieldContextMenu(event, column.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setSelectedMainForDelete([column.id]);
                      activateColumnSelection('main', column.id);
                    }
                  }}
                  className={`absolute rounded-[22px] border p-3 transition-all ${getCardSelectionClass(isActive, isMarkedForDelete)}`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      onMouseDown={(event) => startBillFieldDrag(event, column.id)}
                      className="cloudy-glass-orb flex size-9 shrink-0 cursor-grab items-center justify-center rounded-[16px] text-[color:var(--workspace-accent)] active:cursor-grabbing"
                      title="拖动控件位置"
                    >
                      <span className="material-symbols-outlined text-[16px]">drag_indicator</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <div
                          className={`shrink-0 truncate font-semibold ${normalizedColumn.required ? 'text-[color:var(--workspace-accent-strong)]' : 'text-slate-600 dark:text-slate-200'}`}
                          style={{ width: labelWidth, fontSize: fontSize + 1 }}
                          title={normalizedColumn.name}
                        >
                          {normalizedColumn.name}
                        </div>
                        <div className="min-w-0 flex-1">{renderBillFormControlPreview(normalizedColumn, index)}</div>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] font-semibold">
                        <span className="inline-flex items-center rounded-full bg-white/82 px-2 py-0.5 text-slate-500 dark:bg-slate-900/64 dark:text-slate-300">
                          {normalizedColumn.type}
                        </span>
                        {normalizedColumn.sourceField ? (
                          <span className="inline-flex items-center rounded-full bg-[color:var(--workspace-accent-soft)] px-2 py-0.5 text-[color:var(--workspace-accent-strong)]">
                            {normalizedColumn.sourceField}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div className="flex min-h-[320px] items-center justify-center text-center">
                <div className="rounded-[24px] border border-dashed border-[color:var(--workspace-accent-border)] bg-white/72 px-8 py-10 shadow-[0_20px_34px_-30px_rgba(15,23,42,0.18)]">
                  <div className="mx-auto flex size-14 items-center justify-center rounded-3xl bg-white text-[color:var(--workspace-accent)] shadow-[0_18px_32px_-24px_var(--workspace-accent-shadow)]">
                    <span className="material-symbols-outlined text-[22px]">view_quilt</span>
                  </div>
                  <div className="mt-4 text-[14px] font-bold text-slate-700 dark:text-slate-100">将 Excel 字段复制到头部看板</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderBillDetailWorkbench = () => {
    const detailCols = billDetailColumns;

    return (
      <div style={workspaceThemeVars} className={`cloudy-glass-panel flex min-h-0 flex-1 flex-col overflow-hidden rounded-[30px] border border-white/75 ${workspaceThemeStyles.tableSurface}`}>
        <div className="cloudy-glass-toolbar flex items-center justify-between gap-3 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="cloudy-glass-orb flex size-10 items-center justify-center rounded-2xl text-[color:var(--workspace-accent)]">
              <span className="material-symbols-outlined text-[18px]">table_rows</span>
            </div>
            <div>
              <h4 className="text-[13px] font-bold text-slate-800 dark:text-slate-100">单据明细表</h4>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {selectedDetailForDelete.length > 0 && (
              <button
                type="button"
                onClick={() => deleteSelectedColumns('detail', selectedDetailForDelete)}
                className="cloudy-glass-chip inline-flex h-9 items-center gap-1 rounded-[14px] border border-rose-200/80 px-3 text-[12px] font-bold text-rose-500 transition-colors hover:bg-rose-50 dark:border-rose-500/20 dark:hover:bg-rose-500/10"
              >
                <span className="material-symbols-outlined text-[14px]">delete</span>
                删除
              </button>
            )}
            <button
              type="button"
              onClick={() => setBillDetailColumns((prev) => [...prev, buildColumn('bill_line', prev.length + 1)])}
              className="inline-flex h-9 items-center gap-1.5 rounded-[14px] bg-[color:var(--workspace-accent)] px-3 text-[12px] font-bold text-white shadow-[0_18px_32px_-24px_var(--workspace-accent-shadow)] transition-colors hover:bg-[color:var(--workspace-accent-strong)]"
            >
              <span className="material-symbols-outlined text-[15px]">add</span>
              新增列
            </button>
          </div>
        </div>
        <div
          className="scrollbar-none min-h-0 flex-1 overflow-auto px-4 pb-4 outline-none"
          tabIndex={0}
          onPaste={(event) => handlePasteColumns(event, setBillDetailColumns)}
        >
          <div className="pt-3">
            {renderTableBuilder(
              'detail',
              detailCols,
              setBillDetailColumns,
              selectedDetailColId,
              selectedDetailForDelete,
              setSelectedDetailForDelete,
              {
                backgroundSelectable: true,
                tableSelected: selectedTableConfigScope === 'detail',
                onSelectTable: () => activateTableConfigSelection('detail'),
                canvasLabel: '点击配置单据明细表',
              },
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderBillDocumentWorkbench = () => {
    const detailCols = billDetailColumns;
    const billViewportPaddingClass = isConfigFullscreenActive ? 'p-1.5' : 'p-3';
    const billPaperWrapClass = 'justify-stretch';
    const billPaperShellClass = isConfigFullscreenActive
      ? 'flex min-h-full flex-1 flex-col rounded-[24px] border border-[#d9e4f0] bg-white shadow-none'
      : 'flex min-h-full flex-1 flex-col rounded-[28px] border border-[#d9e4f0] bg-white shadow-[0_44px_90px_-68px_rgba(15,23,42,0.42)]';
    const billHeaderPaddingClass = isConfigFullscreenActive ? 'px-8 pb-3 pt-4' : 'px-10 pb-4 pt-5';
    const billBodyPaddingClass = isConfigFullscreenActive ? 'gap-5 px-8 pb-6 pt-3' : 'gap-8 px-10 pb-8 pt-4';
    const billCanvasFields = [
      ...billMetaFields.map((field) => ({ ...field, __scope: 'meta' as BillCanvasFieldScope })),
      ...mainTableColumns.map((field) => ({ ...field, __scope: 'main' as BillCanvasFieldScope })),
    ];
    const canvasHeight = Math.max(
      320,
      billCanvasFields.reduce((maxHeight, column) => {
        const normalizedColumn = normalizeColumn(column);
        return Math.max(maxHeight, (normalizedColumn.canvasY ?? BILL_FORM_LAYOUT_PADDING_Y) + 78);
      }, BILL_FORM_LAYOUT_PADDING_Y) + 32,
    );
    const buildSelectedIds = (columnId: string, append: boolean) => (
      selectedMainForDelete.includes(columnId)
        ? selectedMainForDelete
        : append
          ? Array.from(new Set([...selectedMainForDelete, columnId]))
          : [columnId]
    );
    const getFieldRowSelectionClass = (isActive: boolean, isMarkedForDelete: boolean, isDragging: boolean) => (
      isDragging
        ? 'z-20 border-[#e1a5b1] shadow-[0_0_0_1px_rgba(246,215,220,0.96)]'
        : isActive
          ? 'z-10 border-[#e4b1bb] shadow-[0_0_0_1px_rgba(247,224,228,0.98)]'
          : isMarkedForDelete
            ? 'z-10 border-[#efd8dd] shadow-[0_0_0_1px_rgba(251,241,243,0.98)]'
            : 'border-transparent hover:border-[#dbe5f2] hover:shadow-[0_0_0_1px_rgba(219,229,242,0.74)]'
    );
    const toggleBillFieldSelection = (columnId: string) => {
      const nextSelectedIds = selectedMainForDelete.includes(columnId)
        ? selectedMainForDelete.filter((item) => item !== columnId)
        : [...selectedMainForDelete, columnId];

      setSelectedMainForDelete(nextSelectedIds);
      if (
        nextSelectedIds.length === 1
        && [...mainTableColumns, ...billMetaFields].some((column) => column.id === nextSelectedIds[0])
      ) {
        activateColumnSelection('main', nextSelectedIds[0]);
      }
    };
    const handleBillFieldSelect = (event: React.MouseEvent<HTMLDivElement>, columnId: string, scope: BillCanvasFieldScope) => {
      setBuilderSelectionContextMenu(null);
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        event.stopPropagation();
        toggleBillFieldSelection(columnId);
        return;
      }

      setSelectedMainForDelete([columnId]);
      activateColumnSelection('main', columnId);
    };
    const handleBillFieldContextMenu = (event: React.MouseEvent<HTMLDivElement>, columnId: string, scope: BillCanvasFieldScope) => {
      event.preventDefault();
      event.stopPropagation();
      const nextSelectedIds = buildSelectedIds(columnId, event.ctrlKey || event.metaKey);
      setSelectedMainForDelete(nextSelectedIds);
      activateColumnSelection('main', columnId);
      setBuilderSelectionContextMenu({
        kind: 'column',
        scope: 'main',
        x: event.clientX,
        y: event.clientY,
        ids: nextSelectedIds,
      });
    };
    const handleBillFieldMouseDownCapture = (
      event: React.MouseEvent<HTMLDivElement>,
      columnId: string,
      scope: BillCanvasFieldScope,
    ) => {
      if (event.button !== 0) return;
      if ((event.target as HTMLElement | null)?.closest('[data-bill-resize-handle="true"]')) return;
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        return;
      }
      startBillFieldDrag(event, columnId, scope);
    };
    const appendBillHeaderField = () => {
      setMainTableColumns((prev) => [
        ...prev,
        buildColumn('m_col', prev.length + 1, {
          width: BILL_FORM_DEFAULT_WIDTH,
          ...getBillFieldLayout(prev.length, BILL_FORM_DEFAULT_WIDTH),
        }),
      ]);
    };
    const billDocumentTitle = activeMenuName ? `${activeMenuName} - 制单` : '单据制单';
    const isBlueBillTone = billDocumentTone === 'blue';
    const billToneMeta = isBlueBillTone
      ? {
          strip: 'bg-[linear-gradient(90deg,#2f6fed_0%,#5e90ff_40%,#8db5ff_100%)]',
          title: 'text-[#334e7d]',
          divider: 'bg-[linear-gradient(90deg,transparent,rgba(96,165,250,0.88),transparent)]',
          radioActiveBorder: 'border-[#7db2ff]',
          radioActiveDot: 'bg-[#2f6fed]',
          radioActiveText: 'text-[#2f6fed]',
        }
      : {
          strip: 'bg-[linear-gradient(90deg,#d84a63_0%,#ef6c7f_42%,#f6a5b3_100%)]',
          title: 'text-[#a63f53]',
          divider: 'bg-[linear-gradient(90deg,transparent,rgba(251,113,133,0.82),transparent)]',
          radioActiveBorder: 'border-[#f3a3b0]',
          radioActiveDot: 'bg-[#e35b74]',
          radioActiveText: 'text-[#d84a63]',
        };
    const documentGuideStyle: React.CSSProperties = {
      backgroundImage: 'linear-gradient(rgba(226,232,240,0.52) 1px, transparent 1px), linear-gradient(90deg, rgba(226,232,240,0.52) 1px, transparent 1px)',
      backgroundSize: '24px 24px',
    };
    const actionRailItems = [
      { icon: 'database', label: '来源表', action: () => activateSourceGridSelection() },
      { icon: 'auto_awesome_motion', label: '整理', action: () => autoArrangeBillHeaderFields() },
      { icon: 'add_box', label: '控件', action: appendBillHeaderField },
      { icon: 'save', label: '暂存', action: () => showToast('已暂存单据模板布局') },
    ];

    return (
      <div
        style={workspaceThemeVars}
        className={`flex min-h-0 flex-1 flex-col overflow-hidden rounded-[34px] border border-white/70 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.96),rgba(242,247,253,0.88)_38%,rgba(233,241,251,0.78)_100%)] ${isConfigFullscreenActive ? 'shadow-none' : 'shadow-[0_46px_110px_-64px_rgba(15,23,42,0.42)]'} ${workspaceThemeStyles.tableSurface}`}
      >
        <div ref={billDocumentViewportRef} className={`min-h-0 flex-1 overflow-hidden ${billViewportPaddingClass}`}>
          <div className={`flex h-full min-h-0 items-stretch overflow-hidden ${billPaperWrapClass}`}>
            <div
              ref={billDocumentPaperRef}
              className="flex min-h-full w-full shrink-0 flex-col max-w-none"
              style={{ zoom: billDocumentScale } as React.CSSProperties}
            >
              <div className={billPaperShellClass}>
            <div className={`h-3 ${isConfigFullscreenActive ? 'rounded-t-[24px]' : 'rounded-t-[28px]'} ${billToneMeta.strip}`} />

            <div className={`border-b border-[#e8eef6] ${billHeaderPaddingClass}`}>
              <div className="relative">
                <div className="absolute right-0 top-0 flex size-[58px] items-center justify-center rounded-[10px] border border-[#dde7f3] bg-white">
                  <div className="grid h-7 w-7 grid-cols-3 gap-[2px]">
                    {Array.from({ length: 9 }).map((_, index) => (
                      <span
                        key={index}
                        className={`rounded-[2px] ${[0, 1, 2, 3, 5, 6, 7].includes(index) ? 'bg-slate-700' : 'bg-slate-300'}`}
                      />
                    ))}
                  </div>
                </div>
                <div className="px-20 text-center">
                  <div className={`text-[31px] font-black tracking-[0.22em] transition-colors ${billToneMeta.title}`}>{billDocumentTitle}</div>
                  <div className={`mx-auto mt-3 h-px w-[54%] transition-colors ${billToneMeta.divider}`} />
                  <div className="mt-4 flex items-center justify-center">
                    <div className="inline-flex items-center gap-5 rounded-full border border-[#dbe6f2] bg-[linear-gradient(180deg,#ffffff,#f7fbff)] px-5 py-2 text-[12px] shadow-[0_14px_28px_-24px_rgba(15,23,42,0.16)]">
                      <button
                        type="button"
                        onClick={() => setBillDocumentTone('blue')}
                        className={`inline-flex items-center gap-2 transition-colors ${isBlueBillTone ? billToneMeta.radioActiveText : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        <span className={`inline-flex h-4 w-4 items-center justify-center rounded-full border bg-white transition-colors ${isBlueBillTone ? billToneMeta.radioActiveBorder : 'border-slate-300'}`}>
                          {isBlueBillTone ? <span className={`h-2 w-2 rounded-full ${billToneMeta.radioActiveDot}`} /> : null}
                        </span>
                        蓝字单据
                      </button>
                      <button
                        type="button"
                        onClick={() => setBillDocumentTone('red')}
                        className={`inline-flex items-center gap-2 transition-colors ${!isBlueBillTone ? billToneMeta.radioActiveText : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        <span className={`inline-flex h-4 w-4 items-center justify-center rounded-full border bg-white transition-colors ${!isBlueBillTone ? billToneMeta.radioActiveBorder : 'border-slate-300'}`}>
                          {!isBlueBillTone ? <span className={`h-2 w-2 rounded-full ${billToneMeta.radioActiveDot}`} /> : null}
                        </span>
                        红字单据
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className={`flex flex-1 ${billBodyPaddingClass}`}>
              <div className="flex min-w-0 flex-1 flex-col">
                <div
                  ref={billHeaderCanvasRef}
                  tabIndex={0}
                  style={{ ...documentGuideStyle, minHeight: canvasHeight }}
                  onClick={() => {
                    setSelectedMainForDelete([]);
                    activateTableConfigSelection('main');
                  }}
                  onPaste={(event) => handlePasteColumns(event, setMainTableColumns, {
                    createColumn: (name, index, currentLength) => buildColumn('m_col', currentLength + index + 1, {
                      name,
                      width: BILL_FORM_DEFAULT_WIDTH,
                      ...getBillFieldLayout(currentLength + index, BILL_FORM_DEFAULT_WIDTH),
                    }),
                  })}
                  className={`relative overflow-hidden rounded-[12px] border border-[#dce5f0] bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(250,252,255,0.96))] px-5 py-5 outline-none transition-shadow ${
                    inspectorTarget.kind === 'main-grid' ? 'shadow-[inset_0_0_0_2px_rgba(47,111,237,0.28)]' : ''
                  }`}
                >
                  {billFieldSnapGuides.lines.map((line, guideIndex) => (
                    <div
                      key={`${line.orientation}-${guideIndex}-${line.position}`}
                      className={`bill-designer-guide-line pointer-events-none absolute z-10 ${line.kind === 'spacing' ? 'bill-designer-guide-line-spacing' : ''} ${line.orientation === 'vertical' ? 'w-px' : 'h-px'}`}
                      style={line.orientation === 'vertical'
                        ? { left: line.position, top: line.start, height: Math.max(18, line.end - line.start) }
                        : { top: line.position, left: line.start, width: Math.max(18, line.end - line.start) }}
                    />
                  ))}
                  {billFieldSnapGuides.gap ? (
                    billFieldSnapGuides.gap.orientation === 'horizontal' ? (
                      <div
                        className="pointer-events-none absolute z-20"
                        style={{
                          left: billFieldSnapGuides.gap.start,
                          top: billFieldSnapGuides.gap.cross,
                          width: Math.max(12, billFieldSnapGuides.gap.end - billFieldSnapGuides.gap.start),
                        }}
                      >
                        <div className="bill-designer-gap-axis absolute left-0 right-0 top-1/2 -translate-y-1/2" />
                        <div className="bill-designer-gap-cap absolute left-0 top-1/2 h-3 w-px -translate-y-1/2" />
                        <div className="bill-designer-gap-cap absolute right-0 top-1/2 h-3 w-px -translate-y-1/2" />
                        <span className="bill-designer-gap-label absolute left-1/2 top-[-18px] -translate-x-1/2">
                          {billFieldSnapGuides.gap.label}
                        </span>
                      </div>
                    ) : (
                      <div
                        className="pointer-events-none absolute z-20"
                        style={{
                          left: billFieldSnapGuides.gap.cross,
                          top: billFieldSnapGuides.gap.start,
                          height: Math.max(12, billFieldSnapGuides.gap.end - billFieldSnapGuides.gap.start),
                        }}
                      >
                        <div className="bill-designer-gap-axis absolute bottom-0 left-1/2 top-0 w-px -translate-x-1/2" />
                        <div className="bill-designer-gap-cap absolute left-1/2 top-0 h-px w-3 -translate-x-1/2" />
                        <div className="bill-designer-gap-cap absolute bottom-0 left-1/2 h-px w-3 -translate-x-1/2" />
                        <span className="bill-designer-gap-label absolute left-[10px] top-1/2 -translate-y-1/2">
                          {billFieldSnapGuides.gap.label}
                        </span>
                      </div>
                    )
                  ) : null}

                  {billCanvasFields.length > 0 ? billCanvasFields.map((column, index) => {
                    const normalizedColumn = normalizeColumn(column);
                    const columnScope = column.__scope;
                    const isActive = selectedMainForDelete.length <= 1
                      && selectedMainForDelete.includes(column.id)
                      && selectedMainColId === column.id;
                    const isMarkedForDelete = selectedMainForDelete.includes(column.id);
                    const isDragging = activeBillDragId === column.id || activeBillResizeId === column.id;
                    const fieldWidth = Math.max(BILL_FORM_MIN_WIDTH, normalizedColumn.width || BILL_FORM_DEFAULT_WIDTH);
                    const labelWidth = Math.max(68, Math.min(92, Number(normalizedColumn.labelWidth) || BILL_FORM_DEFAULT_LABEL_WIDTH));
                    const fontSize = Math.max(11, Math.min(18, Number(normalizedColumn.fontSize) || BILL_FORM_DEFAULT_FONT_SIZE));

                    return (
                      <div
                        key={column.id}
                        role="button"
                        tabIndex={0}
                        data-bill-field-id={column.id}
                        data-bill-field-scope={columnScope}
                        data-active={isActive}
                        data-dragging={isDragging}
                        data-marked={isMarkedForDelete}
                        style={{
                          left: normalizedColumn.canvasX ?? BILL_FORM_LAYOUT_PADDING_X,
                          top: normalizedColumn.canvasY ?? BILL_FORM_LAYOUT_PADDING_Y,
                          width: fieldWidth,
                          willChange: isDragging ? 'left, top' : 'auto',
                        }}
                        onClick={(event) => {
                          event.stopPropagation();
                          handleBillFieldSelect(event, column.id, columnScope);
                        }}
                        onContextMenu={(event) => {
                          handleBillFieldContextMenu(event, column.id, columnScope);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            setSelectedMainForDelete([column.id]);
                            activateColumnSelection('main', column.id);
                          }
                        }}
                        onMouseDownCapture={(event) => handleBillFieldMouseDownCapture(event, column.id, columnScope)}
                        className={`bill-designer-field absolute select-none rounded-[12px] px-2 py-1.5 pr-5 ${isDragging ? 'cursor-grabbing transition-none' : 'cursor-grab transition-[border-color,background-color] duration-150'} ${getFieldRowSelectionClass(isActive, isMarkedForDelete, isDragging)}`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`bill-designer-field-label shrink-0 truncate ${normalizedColumn.required ? 'font-bold text-[#8c4854]' : 'font-semibold text-[#4b5567]'}`}
                            style={{ width: labelWidth, fontSize: fontSize + 1 }}
                            title={normalizedColumn.name}
                          >
                            {normalizedColumn.name}
                            {normalizedColumn.required ? <span className="ml-1 text-[#ef4444]">*</span> : null}
                          </div>
                          <div className="min-w-0 flex-1">{renderBillFormControlPreview(normalizedColumn, index)}</div>
                        </div>
                        <button
                          type="button"
                          data-bill-resize-handle="true"
                          onMouseDown={(event) => startBillFieldResize(event, column.id, columnScope)}
                          className={`bill-designer-resize-handle absolute bottom-0 right-0 top-0 flex w-3 items-center justify-center rounded-r-[12px] ${isDragging ? 'cursor-ew-resize' : 'cursor-ew-resize'}`}
                          aria-label="调整控件宽度"
                        />
                      </div>
                    );
                  }) : (
                    <div className="flex min-h-[260px] items-center justify-center">
                      <div className="rounded-[16px] border border-dashed border-[#cbd9eb] bg-[#fbfdff] px-8 py-10 text-center">
                        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-[#eef4ff] text-[#2f6fed]">
                          <span className="material-symbols-outlined text-[22px]">fact_check</span>
                        </div>
                        <div className="mt-4 text-[15px] font-bold text-slate-700">将 Excel 字段复制到单据抬头</div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-5 flex flex-1 flex-col overflow-hidden rounded-[10px] border border-[#dce5f0] bg-white px-3 pb-3 pt-3">
                  <div className="min-h-0 flex-1">
                    {renderTableBuilder(
                      'detail',
                      detailCols,
                      setBillDetailColumns,
                      selectedDetailColId,
                      selectedDetailForDelete,
                      setSelectedDetailForDelete,
                      {
                        backgroundSelectable: true,
                        tableSelected: selectedTableConfigScope === 'detail',
                        onSelectTable: () => activateTableConfigSelection('detail'),
                        canvasLabel: '点击配置单据明细表',
                      },
                    )}
                  </div>
                </div>
              </div>

              <aside className="w-[96px] shrink-0 border-l border-[#edf2f8] pl-5 pt-1">
                <div className="rounded-[14px] border border-[#e3ebf4] bg-[linear-gradient(180deg,#fbfdff,#f7faff)] p-3 shadow-[0_20px_36px_-32px_rgba(15,23,42,0.22)]">
                  <div className="flex flex-col gap-3">
                    {actionRailItems.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={item.action}
                      className="flex h-[86px] flex-col items-center justify-center gap-2.5 rounded-[10px] border border-[#dfe7f1] bg-white text-slate-500 shadow-[0_18px_30px_-28px_rgba(15,23,42,0.2)] transition-all hover:-translate-y-0.5 hover:border-[#bcd0ea] hover:text-[#2f6fed]"
                    >
                      <span className="material-symbols-outlined text-[24px]">{item.icon}</span>
                      <span className="text-[12px] font-semibold leading-5">{item.label}</span>
                    </button>
                    ))}
                  </div>
                </div>
              </aside>
            </div>
          </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTableBuilder = (
    scope: 'left' | 'main' | 'detail',
    cols: any[],
    setCols: React.Dispatch<React.SetStateAction<any[]>>,
    selectedId: string | null,
    selectedForDelete: string[],
    setSelectedForDelete: React.Dispatch<React.SetStateAction<string[]>>,
    options?: {
      showDetailAction?: boolean;
      contextMenuScope?: 'main' | 'detail';
      contextMenuConfig?: {
        enabled: boolean;
        items: any[];
      };
      backgroundSelectable?: boolean;
      tableSelected?: boolean;
      onSelectTable?: () => void;
      canvasLabel?: string;
      detailBoardConfig?: any;
      onCanvasDoubleClick?: () => void;
    }
  ) => {
    const showDetailAction = options?.showDetailAction ?? false;
    const contextMenuScope = options?.contextMenuScope;
    const contextMenuConfig = options?.contextMenuConfig;
    const backgroundSelectable = options?.backgroundSelectable ?? false;
    const tableSelected = options?.tableSelected ?? false;
    const onSelectTable = options?.onSelectTable;
    const canvasLabel = options?.canvasLabel ?? '点击空白区域配置表格';
    const detailBoardConfig = normalizeDetailBoardConfig(options?.detailBoardConfig, cols);
    const detailBoardTheme = getDetailBoardTheme(workspaceTheme);
    const hasDetailBoardFeature = detailBoardConfig.enabled && detailBoardConfig.groups.some((group) => group.columnIds.length > 0);
    const detailBoardFeatureLabel = hasDetailBoardFeature ? '双击详情预览' : null;
    const buildScopedSelectionIds = (currentIds: string[], id: string, append: boolean) => {
      if (currentIds.includes(id)) {
        return currentIds;
      }
      return append ? Array.from(new Set([...currentIds, id])) : [id];
    };
    const getColumnRenderWidth = (rawColumn: any) => Math.max(
      TABLE_COLUMN_MIN_WIDTH,
      Math.round(normalizeColumn(rawColumn).width || TABLE_COLUMN_MIN_WIDTH),
    );

    const handleColumnHeaderClick = (event: React.MouseEvent<HTMLButtonElement>, id: string) => {
      setBuilderSelectionContextMenu(null);
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        setSelectedForDelete((prev) => (
          prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        ));
        return;
      }

      setSelectedForDelete([id]);
      activateColumnSelection(scope, id);
    };
    const handleColumnHeaderContextMenu = (event: React.MouseEvent<HTMLButtonElement>, id: string) => {
      event.preventDefault();
      event.stopPropagation();
      const nextSelectedIds = buildScopedSelectionIds(selectedForDelete, id, event.ctrlKey || event.metaKey);

      setSelectedForDelete(nextSelectedIds);
      activateColumnSelection(scope, id);
      setBuilderSelectionContextMenu({
        kind: 'column',
        scope,
        x: event.clientX,
        y: event.clientY,
        ids: nextSelectedIds,
      });
    };

    const addColumnWidth = isCompactModuleSetting ? 58 : 74;
    const totalTableWidth = cols.reduce((sum, col) => sum + getColumnRenderWidth(col), addColumnWidth);
    const visibleResizeTag = activeResize && cols.some((col) => col.id === activeResize.id) ? activeResize : null;
    const getTextAlign = (align?: string): React.CSSProperties['textAlign'] => (
      align === '居中' ? 'center' : align === '右对齐' ? 'right' : 'left'
    );
    const addColumn = () => setCols((prev) => [...prev, buildColumn(scope === 'detail' ? 'd_col' : `${scope}_col`, prev.length + 1)]);
    const tableSurfaceClass = tableSelected
      ? 'cloudy-glass-panel border-[3px] border-[color:var(--workspace-accent-border-strong)] bg-[color:var(--workspace-accent-surface)] shadow-[0_32px_68px_-44px_rgba(81,98,128,0.26)]'
      : 'cloudy-glass-panel border-white/70';
    const headerDividerClass = tableSelected ? 'border-[color:var(--workspace-accent-border)]' : 'border-slate-200/70 dark:border-slate-700/80';
    const getHeaderButtonClass = (isActive: boolean, isMarkedForDelete: boolean) => (
      isActive
        ? 'bg-[linear-gradient(180deg,rgba(255,241,244,0.98),rgba(255,247,249,1))] shadow-[inset_0_0_0_1px_rgba(228,177,187,0.52)]'
        : isMarkedForDelete
          ? 'bg-[linear-gradient(180deg,rgba(255,246,248,0.98),rgba(255,250,251,1))]'
          : tableSelected
            ? 'bg-[linear-gradient(180deg,rgba(255,248,250,0.9),rgba(255,251,252,0.98))] hover:bg-white/35 dark:hover:bg-white/5'
            : 'bg-white/92 hover:bg-slate-50 dark:bg-slate-900/55 dark:hover:bg-slate-800/65'
    );
    const getHeaderLabelClass = (isActive: boolean, isMarkedForDelete: boolean) => {
      if (isActive) {
        return 'bg-[#d86a80] text-white shadow-[0_14px_24px_-20px_rgba(216,106,128,0.92)]';
      }
      if (isMarkedForDelete) {
        return 'bg-[#f9e9ed] text-[#bf5a70]';
      }
      return tableSelected
        ? 'bg-[#fff7f9] text-[#ba566d] dark:bg-white/8 dark:text-[#f4b5c1]'
        : 'bg-transparent text-slate-700 dark:text-slate-100';
    };
    const getHeaderRequiredMarkClass = (isActive: boolean, isMarkedForDelete: boolean, isRequired: boolean) => {
      if (!isRequired) return 'hidden';
      if (isActive) return 'text-white/88';
      if (isMarkedForDelete || tableSelected) return 'text-[#d15b75]';
      return 'text-[color:var(--workspace-accent-strong)]';
    };
    const getHeaderResizeRailClass = (isActive: boolean) => (
      isActive
        ? 'bg-[color:var(--workspace-accent-soft)]'
        : tableSelected
          ? 'bg-transparent group-hover:bg-white/30 dark:group-hover:bg-white/6'
          : ''
    );
    const tableCanvasClass = tableSelected
      ? 'border-[color:var(--workspace-accent-border-strong)] bg-[color:var(--workspace-accent-surface)] text-[color:var(--workspace-accent-strong)] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]'
      : 'border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(248,252,255,0.6))] text-slate-400 hover:border-white/90 hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(248,252,255,0.66))] dark:text-slate-500';
    const tableCanvasIconClass = tableSelected
      ? 'cloudy-glass-orb border-[color:var(--workspace-accent-border)] bg-white/96 text-[color:var(--workspace-accent-strong)]'
      : 'cloudy-glass-orb text-[color:var(--workspace-accent)]';
    const tableCanvasTitleClass = tableSelected
      ? 'text-[color:var(--workspace-accent-strong)]'
      : 'text-slate-500 dark:text-slate-300';
    const themedTableSurfaceClass = tableSurfaceClass;
    const themedTableCanvasClass = tableCanvasClass;
    const getHeaderCornerClass = (index: number) => (index === 0 ? 'rounded-tl-[16px]' : '');
    const addColumnHeaderShellClass = tableSelected
      ? 'border-[color:var(--workspace-accent-border)] bg-[color:var(--workspace-accent-soft)] dark:bg-white/6'
      : 'border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(246,249,252,0.6))]';
    const addColumnButtonClass = tableSelected
      ? 'cloudy-glass-orb border-[color:var(--workspace-accent-border)] text-[color:var(--workspace-accent-strong)]'
      : 'cloudy-glass-orb text-[color:var(--workspace-accent)]';

    if (cols.length === 0) {
      return (
        <div className="flex h-full min-h-[240px] items-center justify-center px-6 text-center text-slate-400">
          <div className="flex flex-col items-center gap-3">
            <div className="cloudy-glass-orb flex size-14 items-center justify-center rounded-3xl">
              <span className="material-symbols-outlined text-[24px] text-slate-300 dark:text-slate-500">data_object</span>
            </div>
            <div>
              <p className="text-[14px] font-bold text-slate-500 dark:text-slate-300">当前区域还没有字段</p>
              <p className="mt-1 text-[12px] text-slate-400">点击新增字段，或直接粘贴列名批量生成。</p>
            </div>
          </div>
        </div>
      );
    }

    if (backgroundSelectable) {
      return (
        <div style={workspaceThemeVars} className={`cloudy-cloud-grid relative flex h-full min-h-[260px] min-w-0 w-full flex-col overflow-hidden rounded-[26px] border ${themedTableSurfaceClass} ${isCompactModuleSetting ? 'p-1.5' : 'p-2'}`}>
          {visibleResizeTag && (
            <div className="pointer-events-none absolute right-3 top-3 z-30 inline-flex items-center gap-2 rounded-full border border-[#0b6bcb]/15 bg-white/96 px-3 py-1.5 text-[11px] font-bold text-[#0b6bcb] shadow-[0_18px_32px_-24px_rgba(11,107,203,0.48)] dark:border-[#0b6bcb]/20 dark:bg-slate-900/92">
              <span className="material-symbols-outlined text-[14px]">straighten</span>
              <span className="max-w-[150px] truncate">{visibleResizeTag.label}</span>
              <span className="rounded-full bg-[#0b6bcb]/8 px-2 py-0.5">{Math.round(visibleResizeTag.width)}px</span>
            </div>
          )}
          <div className="scrollbar-none min-w-0 shrink-0 overflow-x-auto">
            <table
              style={{ width: totalTableWidth, minWidth: totalTableWidth }}
              className="border-separate border-spacing-0 text-left text-[12px]"
            >
              <colgroup>
                {cols.map((col) => {
                  const headerWidth = getColumnRenderWidth(col);
                  return <col key={`col-${col.id}`} style={{ width: headerWidth, minWidth: headerWidth }} />;
                })}
                <col style={{ width: addColumnWidth, minWidth: addColumnWidth }} />
              </colgroup>
              <thead className={`sticky top-0 z-20 select-none bg-transparent ${tableSelected ? 'shadow-[inset_0_-1px_0_rgba(239,199,207,0.55)]' : ''}`}>
                <tr>
                  {cols.map((col, index) => {
                    const normalizedCol = normalizeColumn(col);
                    const isActive = selectedId === col.id;
                    const isMarkedForDelete = selectedForDelete.includes(col.id);
                    const isResizing = activeResize?.id === col.id;
                    const headerWidth = getColumnRenderWidth(normalizedCol);

                    return (
                      <th
                        key={col.id}
                        style={{ width: headerWidth, minWidth: headerWidth }}
                        className={`group relative border-b border-r p-0 align-top ${headerDividerClass}`}
                      >
                      <button
                        type="button"
                        onClick={(event) => handleColumnHeaderClick(event, col.id)}
                        onContextMenu={(event) => handleColumnHeaderContextMenu(event, col.id)}
                        className={`relative flex h-full w-full items-center overflow-hidden text-left transition-all ${getHeaderCornerClass(index)} ${isCompactModuleSetting ? 'min-h-[34px] px-3 pr-4 py-0' : 'min-h-[40px] px-3.5 pr-5 py-0'} ${getHeaderButtonClass(isActive, isMarkedForDelete)}`}
                      >
                          <div className="flex min-w-0 flex-1 items-center">
                            <div
                              className={`inline-flex max-w-full items-center rounded-full px-2.5 py-1 font-semibold tracking-[0.01em] transition-all ${isCompactModuleSetting ? 'text-[11px]' : 'text-[12px]'} ${getHeaderLabelClass(isActive, isMarkedForDelete)}`}
                              title={normalizedCol.name}
                            >
                              <span className="truncate">{normalizedCol.name}</span>
                              <span className={`ml-1 text-[10px] leading-none ${getHeaderRequiredMarkClass(isActive, isMarkedForDelete, normalizedCol.required)}`}>*</span>
                            </div>
                          </div>
                        </button>
                        <div
                          className={`absolute right-0 top-0 bottom-0 z-20 flex ${isCompactModuleSetting ? 'w-2.5' : 'w-3'} cursor-col-resize items-center justify-center ${getHeaderResizeRailClass(isActive)}`}
                          onMouseDown={(e) => startResize(e, col.id, cols, setCols, TABLE_COLUMN_MIN_WIDTH, TABLE_COLUMN_RESIZE_MAX_WIDTH, 'column')}
                          onDoubleClick={(e) => autoFitColumnWidth(e, col.id, cols, setCols, TABLE_COLUMN_MIN_WIDTH, TABLE_COLUMN_RESIZE_MAX_WIDTH, 'column')}
                          title="拖动调整列宽，双击可自动适配"
                        >
                          <span className={`h-5 w-px rounded-full transition-all ${isResizing ? 'bg-[#2563eb] shadow-[0_0_0_2px_rgba(37,99,235,0.12)]' : 'bg-transparent group-hover:bg-slate-300 dark:group-hover:bg-slate-500'}`} />
                        </div>
                      </th>
                    );
                  })}
                  <th
                    style={{ width: addColumnWidth, minWidth: addColumnWidth }}
                    className={`border-b p-0 align-top ${addColumnHeaderShellClass}`}
                  >
                    <button
                      type="button"
                      onClick={addColumn}
                      className={`flex h-full w-full items-center justify-center rounded-tr-[16px] transition-all ${isCompactModuleSetting ? 'min-h-[34px]' : 'min-h-[40px]'} hover:bg-white/55 dark:hover:bg-white/8`}
                      title="新增字段"
                    >
                      <div className={`inline-flex items-center justify-center rounded-[14px] border ${addColumnButtonClass} ${isCompactModuleSetting ? 'size-8' : 'size-9'}`}>
                        <span className="material-symbols-outlined text-[17px]">add</span>
                      </div>
                    </button>
                  </th>
                </tr>
              </thead>
            </table>
          </div>
          <button
            type="button"
            onClick={onSelectTable}
            onDoubleClick={(event) => {
              event.stopPropagation();
              options?.onCanvasDoubleClick?.();
            }}
            className={`mt-1 flex min-h-[188px] w-full flex-1 items-center justify-center rounded-[20px] border text-center transition-all dark:border-slate-700 ${themedTableCanvasClass} ${backgroundSelectable ? 'cursor-pointer' : 'cursor-default'}`}
          >
            <div className="flex flex-col items-center gap-2 py-6">
              <div className={`flex items-center justify-center rounded-[18px] border ${isCompactModuleSetting ? 'size-11' : 'size-12'} ${tableCanvasIconClass}`}>
                <span className={`material-symbols-outlined ${isCompactModuleSetting ? 'text-[18px]' : 'text-[20px]'} ${tableSelected ? 'text-[#c06b7d]' : 'text-slate-300 dark:text-slate-500'}`}>table_view</span>
              </div>
              {detailBoardFeatureLabel && (
                <div className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold ${detailBoardTheme.badge}`}>
                  {detailBoardFeatureLabel}
                </div>
              )}
              <div className={`font-semibold ${isCompactModuleSetting ? 'text-[12px]' : 'text-[13px]'} ${tableCanvasTitleClass}`}>
                {canvasLabel}
              </div>
              <div className="text-[11px] text-slate-400">{hasDetailBoardFeature ? '双击画布可预览详情分组布局' : '点击画布即可切换到整表配置'}</div>
            </div>
          </button>
        </div>
      );
    }

    return (
      <div style={workspaceThemeVars} className={`cloudy-cloud-grid relative min-w-max rounded-[26px] border ${themedTableSurfaceClass} ${isCompactModuleSetting ? 'p-1.5' : 'p-2'}`}>
        {visibleResizeTag && (
          <div className="pointer-events-none absolute right-3 top-3 z-30 inline-flex items-center gap-2 rounded-full border border-[#1686e3]/15 bg-white/96 px-3 py-1.5 text-[11px] font-bold text-[#1686e3] shadow-[0_18px_32px_-24px_rgba(22,134,227,0.58)] dark:border-[#1686e3]/20 dark:bg-slate-900/92">
            <span className="material-symbols-outlined text-[14px]">straighten</span>
            <span className="max-w-[150px] truncate">{visibleResizeTag.label}</span>
            <span className="rounded-full bg-[#1686e3]/8 px-2 py-0.5">{Math.round(visibleResizeTag.width)}px</span>
          </div>
        )}
        <table
          style={{ minWidth: totalTableWidth }}
          className="overflow-hidden rounded-[18px] border-separate border-spacing-0 text-left text-[12px]"
        >
          <colgroup>
            {cols.map((col) => {
              const headerWidth = getColumnRenderWidth(col);
              return <col key={`col-${col.id}`} style={{ width: headerWidth, minWidth: headerWidth }} />;
            })}
            <col style={{ width: addColumnWidth, minWidth: addColumnWidth }} />
          </colgroup>
            <thead className={`sticky top-0 z-20 select-none bg-transparent ${tableSelected ? 'shadow-[inset_0_-1px_0_rgba(239,199,207,0.55)]' : ''}`}>
            <tr>
              {cols.map((col, index) => {
                const normalizedCol = normalizeColumn(col);
                const isActive = selectedId === col.id;
                const isMarkedForDelete = selectedForDelete.includes(col.id);
                const isResizing = activeResize?.id === col.id;
                const headerWidth = getColumnRenderWidth(normalizedCol);

                return (
                  <th
                    key={col.id}
                    style={{ width: headerWidth, minWidth: headerWidth }}
                    className={`group relative border-b border-r p-0 align-top ${headerDividerClass}`}
                  >
                    <button
                      type="button"
                      onClick={(event) => handleColumnHeaderClick(event, col.id)}
                      onContextMenu={(event) => handleColumnHeaderContextMenu(event, col.id)}
                      className={`relative flex h-full w-full items-center overflow-hidden text-left transition-all ${getHeaderCornerClass(index)} ${isCompactModuleSetting ? 'min-h-[38px] px-3 pr-4 py-0' : 'min-h-[46px] px-3.5 pr-5 py-0'} ${getHeaderButtonClass(isActive, isMarkedForDelete)}`}
                    >
                      <div className="flex min-w-0 flex-1 items-center">
                        <div
                          className={`inline-flex max-w-full items-center rounded-full px-2.5 py-1 font-semibold tracking-[0.01em] transition-all ${isCompactModuleSetting ? 'text-[11px]' : 'text-[12px]'} ${getHeaderLabelClass(isActive, isMarkedForDelete)}`}
                          title={normalizedCol.name}
                        >
                          <span className="truncate">{normalizedCol.name}</span>
                          <span className={`ml-1 text-[10px] leading-none ${getHeaderRequiredMarkClass(isActive, isMarkedForDelete, normalizedCol.required)}`}>*</span>
                        </div>
                      </div>
                    </button>
                    <div
                      className={`absolute right-0 top-0 bottom-0 z-20 flex ${isCompactModuleSetting ? 'w-2.5' : 'w-3'} cursor-col-resize items-center justify-center ${getHeaderResizeRailClass(isActive)}`}
                      onMouseDown={(e) => startResize(e, col.id, cols, setCols, TABLE_COLUMN_MIN_WIDTH, TABLE_COLUMN_RESIZE_MAX_WIDTH, 'column')}
                      onDoubleClick={(e) => autoFitColumnWidth(e, col.id, cols, setCols, TABLE_COLUMN_MIN_WIDTH, TABLE_COLUMN_RESIZE_MAX_WIDTH, 'column')}
                      title="拖动调整列宽，双击可自动适配"
                    >
                      <span className={`h-5 rounded-full transition-all ${isCompactModuleSetting ? 'w-px' : 'w-px'} ${isResizing ? 'bg-[#2563eb] shadow-[0_0_0_2px_rgba(37,99,235,0.12)]' : 'bg-transparent group-hover:bg-slate-300 dark:group-hover:bg-slate-500'}`} />
                    </div>
                  </th>
                );
              })}
              <th
                style={{ width: addColumnWidth, minWidth: addColumnWidth }}
                className={`border-b p-0 align-top ${addColumnHeaderShellClass}`}
              >
                <button
                  type="button"
                  onClick={addColumn}
                  className={`flex h-full w-full items-center justify-center rounded-tr-[16px] transition-all ${isCompactModuleSetting ? 'min-h-[38px]' : 'min-h-[46px]'} hover:bg-white/55 dark:hover:bg-white/8`}
                  title="新增字段"
                >
                  <div className={`inline-flex items-center justify-center rounded-[14px] border ${addColumnButtonClass} ${isCompactModuleSetting ? 'size-8' : 'size-9'}`}>
                    <span className="material-symbols-outlined text-[17px]">add</span>
                  </div>
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="text-slate-600 dark:text-slate-300">
            <tr>
              <td colSpan={cols.length + 1} className="p-0">
                <button
                  type="button"
                  onClick={onSelectTable}
                  onDoubleClick={(event) => {
                    event.stopPropagation();
                    options?.onCanvasDoubleClick?.();
                  }}
                  className={`flex w-full flex-col items-center justify-center ${isCompactModuleSetting ? 'min-h-[190px]' : 'min-h-[230px]'} rounded-b-[18px] border-t text-center transition-all ${tableSelected ? 'border-[#efd6db]/85 bg-[linear-gradient(180deg,rgba(255,245,247,0.96),rgba(255,250,251,0.98))] hover:bg-[linear-gradient(180deg,rgba(255,242,245,0.98),rgba(255,248,250,1))] dark:border-rose-400/18 dark:bg-[#efc7cf]/10' : 'border-slate-100 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.08),transparent_42%),linear-gradient(180deg,rgba(250,252,255,0.94),rgba(246,249,252,0.98))] hover:bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.12),transparent_46%),linear-gradient(180deg,rgba(245,249,255,0.98),rgba(240,246,252,1))] dark:border-slate-800 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(15,23,42,0.98))]'} ${backgroundSelectable ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  <div className={`flex items-center justify-center rounded-[18px] border ${tableCanvasIconClass} ${isCompactModuleSetting ? 'size-11' : 'size-12'}`}>
                    <span className={`material-symbols-outlined ${isCompactModuleSetting ? 'text-[18px]' : 'text-[20px]'}`}>table_view</span>
                  </div>
                  {detailBoardFeatureLabel && (
                    <div className={`mt-3 inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold ${detailBoardTheme.badge}`}>
                      {detailBoardFeatureLabel}
                    </div>
                  )}
                  <div className={`mt-3 font-semibold ${isCompactModuleSetting ? 'text-[12px]' : 'text-[13px]'} ${tableCanvasTitleClass}`}>
                    {canvasLabel}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400">
                    {hasDetailBoardFeature ? '双击画布可预览详情分组布局' : '点击画布即可切换到整表配置'}
                  </div>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  const configSteps = [
    { id: 1, title: '类型选择', desc: '先确定本次创建的是单表还是单据' },
    { id: 2, title: '菜单信息', desc: '基础路由、菜单和主配置表映射' },
    { id: 3, title: '模块介绍', desc: '功能概述与使用说明' },
    { id: 4, title: '调研过程', desc: 'AI 深度业务需求分析' },
    { id: 5, title: '模块设置', desc: '字段、表单与流程编排' },
    { id: 6, title: '模块预览', desc: '实时交互效果演示' }
  ];
  const selectedSubsystem = useMemo(
    () => subsystemMenus.find((item) => item.id === activeSubsystem) ?? null,
    [activeSubsystem, subsystemMenus],
  );
  const firstLevelMenus = useMemo(
    () => getEnabledMenuNodes(selectedSubsystem?.children),
    [selectedSubsystem],
  );
  const activeFirstLevelMenu = useMemo(
    () => firstLevelMenus.find((item) => item.id === activeFirstLevelMenuId) ?? null,
    [activeFirstLevelMenuId, firstLevelMenus],
  );

  const loadSubsystemMenus = async () => {
    setIsLoadingSubsystemMenus(true);
    setMenuLoadError(null);

    try {
      const data = getEnabledMenuNodes(await fetchSubsystemMenuTree());
      setSubsystemMenus(data);

      const nextSubsystem = data.find((item) => getEnabledMenuNodes(item.children).length > 0) ?? data[0] ?? null;
      const nextFirstLevelMenu = getEnabledMenuNodes(nextSubsystem?.children)[0] ?? null;

      setExpandedSubsystemId(nextSubsystem?.id ?? null);
      setActiveSubsystem(nextSubsystem?.id ?? '');
      setActiveFirstLevelMenuId(nextFirstLevelMenu?.id ?? '');
      setSecondLevelMenus([]);
    } catch (error) {
      setMenuLoadError(getDashboardErrorMessage(error));
      setSubsystemMenus([]);
      setExpandedSubsystemId(null);
      setActiveSubsystem('');
      setActiveFirstLevelMenuId('');
      setSecondLevelMenus([]);
    } finally {
      setIsLoadingSubsystemMenus(false);
    }
  };

  useEffect(() => {
    void loadSubsystemMenus();
  }, []);

  useEffect(() => {
    let isActive = true;

    const loadSecondLevelMenus = async () => {
      if (!selectedSubsystem || !activeFirstLevelMenu?.menuId) {
        setSecondLevelMenus([]);
        setIsLoadingSecondLevelMenus(false);
        return;
      }

      setIsLoadingSecondLevelMenus(true);

      try {
        const data = getEnabledMenuNodes(
          await fetchSubsystemSecondLevelMenus({
            menuId: activeFirstLevelMenu.menuId,
            subsysId: selectedSubsystem.subsysId,
          }),
        );

        if (!isActive) {
          return;
        }

        setSecondLevelMenus(data);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setMenuLoadError(getDashboardErrorMessage(error));
        setSecondLevelMenus([]);
      } finally {
        if (isActive) {
          setIsLoadingSecondLevelMenus(false);
        }
      }
    };

    void loadSecondLevelMenus();

    return () => {
      isActive = false;
    };
  }, [activeFirstLevelMenu?.menuId, selectedSubsystem]);

  const toggleSubsystemExpansion = (subsystemId: string) => {
    setExpandedSubsystemId((prev) => (prev === subsystemId ? null : subsystemId));
  };

  const handleFirstLevelMenuClick = (subsystemId: string, menu: BackendMenuNode) => {
    setActiveSubsystem(subsystemId);
    setActiveFirstLevelMenuId(menu.id);
    setSecondLevelMenus([]);
    setMenuLoadError(null);
    setExpandedSubsystemId(subsystemId);
  };

  const activeMenu = activeFirstLevelMenu?.id ?? selectedSubsystem?.id ?? 'workspace';
  const activeMenuName =
    normalizeMenuTitle(activeFirstLevelMenu?.title) ||
    normalizeMenuTitle(selectedSubsystem?.title) ||
    '模块工作台';
  const activeMenuCode =
    normalizeMenuCode(activeFirstLevelMenu?.code) ||
    normalizeMenuCode(selectedSubsystem?.subsysCode ?? selectedSubsystem?.code) ||
    'MODULE';
  const activeMenuCodePrefix = activeMenuCode.replace(/\s+/g, '').toUpperCase().slice(0, 2) || 'MO';
  const activeSubsystemName = normalizeMenuTitle(selectedSubsystem?.title) || '未选择子系统';
  const activeFirstLevelMenuName = normalizeMenuTitle(activeFirstLevelMenu?.title);
  const secondLevelMenuCount = secondLevelMenus.length;
  const secondLevelMenuCardStyles = [
    {
      icon: 'account_balance',
      iconClass:
        'bg-primary/5 text-primary border-primary/10 group-hover:bg-primary group-hover:text-white',
      actionClass: 'hover:text-primary',
      badgeClass:
        'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50',
      badgeDotClass: 'bg-emerald-500',
    },
    {
      icon: 'groups',
      iconClass:
        'bg-indigo-50 text-indigo-500 dark:bg-indigo-950/30 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/50 group-hover:bg-indigo-500 group-hover:text-white',
      actionClass: 'hover:text-indigo-600',
      badgeClass:
        'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400 border-amber-100 dark:border-amber-900/50',
      badgeDotClass: 'bg-amber-500',
    },
    {
      icon: 'inventory_2',
      iconClass:
        'bg-cyan-50 text-cyan-500 dark:bg-cyan-950/30 dark:text-cyan-400 border-cyan-100 dark:border-cyan-900/50 group-hover:bg-cyan-500 group-hover:text-white',
      actionClass: 'hover:text-cyan-600',
      badgeClass:
        'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50',
      badgeDotClass: 'bg-emerald-500',
    },
  ] as const;
  const isModuleSettingStep = isConfigOpen && configStep === 5;
  const isConfigFullscreenActive = isModuleSettingStep && isFullscreenConfig;
  const isCompactModuleSetting = isModuleSettingStep && !isFullscreenConfig;
  const workspaceThemeVars = getWorkspaceThemeVars(workspaceTheme);
  const workspaceThemeStyles = getDetailBoardTheme(workspaceTheme);
  const inspectorPaneWidth = isConfigFullscreenActive ? 448 : 388;
  const currentDetailFillType = DETAIL_FILL_TYPE_OPTIONS.some((option) => option.value === tabFillTypes[activeTab])
    ? tabFillTypes[activeTab]
    : DETAIL_FILL_TYPE_OPTIONS[0].value;
  const treeRelationColumn = mainTableColumns.find((column) => normalizeColumn(column).type === '树形节点关联') ?? null;
  const parsedTreeSourceFields = useMemo(
    () => parseSqlFieldNames(treeRelationColumn?.dynamicSql ?? ''),
    [treeRelationColumn?.dynamicSql],
  );
  const isTreePaneVisible = Boolean(treeRelationColumn);
  const deferredActiveTab = useDeferredValue(activeTab);
  const deferredInspectorTarget = useDeferredValue(inspectorTarget);

  useEffect(() => {
    setSelectedDetailForDelete([]);
    setSelectedDetailFiltersForDelete([]);
    setInspectorTarget((prev) => {
      if (prev.kind === 'detail-col' || prev.kind === 'detail-filter') {
        return { kind: 'none' };
      }
      if (prev.kind === 'detail-tab' && prev.id && prev.id !== activeTab) {
        return { kind: 'detail-tab', id: activeTab };
      }
      return prev;
    });
    setBuilderSelectionContextMenu(null);
    setPreviewContextMenu(null);
  }, [activeTab]);

  useEffect(() => {
    setInspectorTarget((prev) => prev.kind === 'detail-filter' ? { kind: 'none' } : prev);
  }, []);

  useEffect(() => {
    if (!treeRelationColumn) {
      setInspectorTarget((prev) => (
        prev.kind === 'left-col' || prev.kind === 'left-filter' || prev.kind === 'left-grid'
          ? { kind: 'none' }
          : prev
      ));
      return;
    }

    const sourceFields = parsedTreeSourceFields.length > 0 ? parsedTreeSourceFields : ['node_id', 'node_name', 'parent_id'];
    const ownerField = normalizeColumn(treeRelationColumn);
    const ownerFieldKey = ownerField.sourceField || treeRelationColumn.id;
    setLeftTableColumns((prev) => sourceFields.map((fieldName, index) => {
      const existing = prev.find((item) => item.sourceField === fieldName);
      if (existing) {
        return { ...existing, sourceField: fieldName };
      }

      return buildColumn('tree_col', index + 1, {
        name: fieldName,
        sourceField: fieldName,
        width: index === 1 ? 176 : 148,
      });
    }));
    setLeftTableConfig((prev) => ({
      ...prev,
      tableType: '树表格',
      mainSql: ownerField.dynamicSql || prev.mainSql || '',
      contextMenuItems: (prev.contextMenuItems ?? []).map((item: any, index: number) => normalizeContextMenuItem({
        ...item,
        tab: ownerFieldKey,
      }, index + 1)),
      colorRules: (prev.colorRules ?? []).map((rule: any) => ({
        ...rule,
        tab: ownerFieldKey,
      })),
    }));
    setLeftFilterFields((prev) => prev.map((field) => ({
      ...field,
      sourceid: treeRelationColumn.id,
      formKey: ownerFieldKey,
    })));
  }, [parsedTreeSourceFields, treeRelationColumn]);

  useEffect(() => {
    if (!isConfigOpen) {
      moduleSettingFullscreenInitRef.current = false;
      return;
    }

    if (configStep === 5 && !moduleSettingFullscreenInitRef.current) {
      moduleSettingFullscreenInitRef.current = true;
      setIsFullscreenConfig(true);
    }
  }, [configStep, isConfigOpen]);

  useEffect(() => {
    const contextMenuItems = leftTableConfig.contextMenuItems ?? [];
    if (!contextMenuItems.some((item: any) => item.id === selectedLeftContextMenuId)) {
      setSelectedLeftContextMenuId(contextMenuItems[0]?.id ?? null);
    }
  }, [leftTableConfig.contextMenuItems, selectedLeftContextMenuId]);

  useEffect(() => {
    const colorRules = leftTableConfig.colorRules ?? [];
    if (!colorRules.some((rule: any) => rule.id === selectedLeftColorRuleId)) {
      setSelectedLeftColorRuleId(colorRules[0]?.id ?? null);
    }
  }, [leftTableConfig.colorRules, selectedLeftColorRuleId]);

  useEffect(() => {
    const contextMenuItems = mainTableConfig.contextMenuItems ?? [];
    if (!contextMenuItems.some((item: any) => item.id === selectedMainContextMenuId)) {
      setSelectedMainContextMenuId(contextMenuItems[0]?.id ?? null);
    }
  }, [mainTableConfig.contextMenuItems, selectedMainContextMenuId]);

  useEffect(() => {
    const useLeftMenuScope = inspectorTarget.kind === 'left-grid';
    const contextMenuItems = ((useLeftMenuScope ? leftTableConfig : mainTableConfig).contextMenuItems ?? [])
      .map((item: any, index: number) => normalizeContextMenuItem(item, index + 1));
    const selectedMenuId = useLeftMenuScope ? selectedLeftContextMenuId : selectedMainContextMenuId;
    const selectedMenu = contextMenuItems.find((item: any) => item.id === selectedMenuId) ?? contextMenuItems[0] ?? null;
    const popupParamKeys = Array.from({ length: 10 }, (_, index) => `dllpar${index + 1}`);

    setSelectedPopupMenuParamKey((prev) => {
      if (!selectedMenu) {
        selectedPopupMenuOwnerRef.current = null;
        return 'dllpar1';
      }

      const isMenuChanged = selectedPopupMenuOwnerRef.current !== selectedMenu.id;
      selectedPopupMenuOwnerRef.current = selectedMenu.id;

      if (!popupParamKeys.includes(prev)) return 'dllpar1';
      if (!isMenuChanged) return prev;

      return popupParamKeys.find((key) => String(selectedMenu[key] ?? '').trim().length > 0) ?? 'dllpar1';
    });
  }, [
    inspectorTarget.kind,
    leftTableConfig.contextMenuItems,
    mainTableConfig.contextMenuItems,
    selectedLeftContextMenuId,
    selectedMainContextMenuId,
  ]);

  useEffect(() => {
    const colorRules = mainTableConfig.colorRules ?? [];
    if (!colorRules.some((rule: any) => rule.id === selectedMainColorRuleId)) {
      setSelectedMainColorRuleId(colorRules[0]?.id ?? null);
    }
  }, [mainTableConfig.colorRules, selectedMainColorRuleId]);

  useEffect(() => {
    const handlePointerMove = (event: MouseEvent) => {
      if (billFieldResizeRef.current) {
        const resize = billFieldResizeRef.current;
        const maxWidth = Math.max(
          BILL_FORM_MIN_WIDTH,
          Math.min(BILL_FORM_MAX_WIDTH, resize.boardWidth - resize.startCanvasX - BILL_FORM_LAYOUT_PADDING_X),
        );
        const rawWidth = resize.startWidth + (event.clientX - resize.startX);
        const snappedWidth = Math.max(BILL_FORM_MIN_WIDTH, snapBillPositionToGrid(rawWidth, 0));
        const nextWidth = Math.max(BILL_FORM_MIN_WIDTH, Math.min(maxWidth, snappedWidth));

        pendingBillResizeRef.current = {
          id: resize.id,
          scope: resize.scope,
          width: nextWidth,
        };

        if (billResizeFrameRef.current !== null) return;
        billResizeFrameRef.current = window.requestAnimationFrame(() => {
          billResizeFrameRef.current = null;
          const nextResize = pendingBillResizeRef.current;
          if (!nextResize) return;

          const updateFields = nextResize.scope === 'main' ? setMainTableColumns : setBillMetaFields;
          updateFields((prev: any[]) => prev.map((column) => (
            column.id === nextResize.id
              ? { ...column, width: nextResize.width }
              : column
          )));
        });
        return;
      }

      if (billFieldDragRef.current) {
        const drag = billFieldDragRef.current;
        const deltaX = event.clientX - drag.startX;
        const deltaY = event.clientY - drag.startY;
        const rawX = Math.max(
          BILL_FORM_LAYOUT_PADDING_X,
          Math.min(drag.boardWidth - drag.fieldWidth - BILL_FORM_LAYOUT_PADDING_X, drag.startCanvasX + deltaX),
        );
        const rawY = Math.max(BILL_FORM_LAYOUT_PADDING_Y, drag.startCanvasY + deltaY);
        const snappedPosition = resolveBillFieldSnap(drag.id, rawX, rawY, drag.boardWidth, drag.fieldWidth, drag.boardHeight);

        pendingBillDragPositionRef.current = {
          id: drag.id,
          scope: drag.scope,
          x: snappedPosition.x,
          y: snappedPosition.y,
          guides: snappedPosition.guides,
        };

        if (billDragFrameRef.current !== null) return;
        billDragFrameRef.current = window.requestAnimationFrame(() => {
          billDragFrameRef.current = null;
          const nextDrag = pendingBillDragPositionRef.current;
          if (!nextDrag) return;

          setBillFieldSnapGuides(nextDrag.guides);
          const updateFields = nextDrag.scope === 'main' ? setMainTableColumns : setBillMetaFields;
          updateFields((prev: any[]) => prev.map((column) => (
            column.id === nextDrag.id
              ? { ...column, canvasX: nextDrag.x, canvasY: nextDrag.y }
              : column
          )));
        });
        return;
      }

      if (!layoutDragRef.current) return;

      const drag = layoutDragRef.current;
      if (drag.type === 'document-left-width') {
        const delta = event.clientX - drag.startX;
        setDocumentLeftPaneWidth(Math.min(460, Math.max(280, drag.startValue + delta)));
      }

      if (drag.type === 'document-detail-width') {
        const delta = drag.startX - event.clientX;
        setDocumentDetailPaneWidth(Math.min(420, Math.max(280, drag.startValue + delta)));
      }

      if (drag.type === 'document-top-height') {
        const delta = event.clientY - drag.startY;
        setDocumentTopPaneHeight(Math.min(520, Math.max(260, drag.startValue + delta)));
      }
    };

    const stopDrag = () => {
      if (billFieldResizeRef.current) {
        if (billResizeFrameRef.current !== null) {
          window.cancelAnimationFrame(billResizeFrameRef.current);
          billResizeFrameRef.current = null;
        }
        const nextResize = pendingBillResizeRef.current;
        if (nextResize) {
          const updateFields = nextResize.scope === 'main' ? setMainTableColumns : setBillMetaFields;
          updateFields((prev: any[]) => prev.map((column) => (
            column.id === nextResize.id
              ? { ...column, width: nextResize.width }
              : column
          )));
        }
        pendingBillResizeRef.current = null;
        setActiveBillResizeId(null);
        billFieldResizeRef.current = null;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
      if (billFieldDragRef.current) {
        if (billDragFrameRef.current !== null) {
          window.cancelAnimationFrame(billDragFrameRef.current);
          billDragFrameRef.current = null;
        }
        const nextDrag = pendingBillDragPositionRef.current;
        if (nextDrag) {
          const updateFields = nextDrag.scope === 'main' ? setMainTableColumns : setBillMetaFields;
          updateFields((prev: any[]) => prev.map((column) => (
            column.id === nextDrag.id
              ? { ...column, canvasX: nextDrag.x, canvasY: nextDrag.y }
              : column
          )));
        }
        pendingBillDragPositionRef.current = null;
        setBillFieldSnapGuides(EMPTY_BILL_FIELD_GUIDES);
        setActiveBillDragId(null);
        billFieldDragRef.current = null;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
      if (!layoutDragRef.current) return;
      layoutDragRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', stopDrag);

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', stopDrag);
    };
  }, []);

  useEffect(() => {
    const closeContextMenu = () => {
      setPreviewContextMenu(null);
      setBuilderSelectionContextMenu(null);
    };

    window.addEventListener('click', closeContextMenu);
    window.addEventListener('resize', closeContextMenu);
    window.addEventListener('scroll', closeContextMenu, true);

    return () => {
      window.removeEventListener('click', closeContextMenu);
      window.removeEventListener('resize', closeContextMenu);
      window.removeEventListener('scroll', closeContextMenu, true);
    };
  }, []);

  const getDetailFillTypeMeta = (fillType?: string) => (
    DETAIL_FILL_TYPE_OPTIONS.find((option) => option.value === fillType) ?? DETAIL_FILL_TYPE_OPTIONS[0]
  );

  const activeGlassTabStyle: React.CSSProperties = {
    background: 'var(--workspace-accent)',
    borderColor: 'var(--workspace-accent-border-strong)',
    boxShadow: '0 18px 34px -24px var(--workspace-accent-shadow)',
  };

  const startLayoutDrag = (
    type: 'document-left-width' | 'document-detail-width' | 'document-top-height',
    event: React.MouseEvent,
  ) => {
    event.preventDefault();
    layoutDragRef.current = {
      type,
      startX: event.clientX,
      startY: event.clientY,
      startValue:
        type === 'document-left-width'
          ? documentLeftPaneWidth
          : type === 'document-detail-width'
            ? documentDetailPaneWidth
            : documentTopPaneHeight,
    };
    document.body.style.cursor = type === 'document-top-height' ? 'row-resize' : 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const renderDetailFillPlaceholder = () => {
    const fillTypeMeta = getDetailFillTypeMeta(currentDetailFillType);

    return (
      <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-3 rounded-[16px] border border-dashed border-slate-200 bg-slate-50/70 px-6 text-center text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-white text-primary shadow-sm dark:bg-slate-800">
          <span className="material-symbols-outlined text-[22px]">{fillTypeMeta.icon}</span>
        </div>
        <div className="space-y-1.5">
          <div className="text-[13px] font-semibold text-slate-800 dark:text-slate-200">{fillTypeMeta.label} 视图预留区</div>
          <div className="max-w-sm text-[11px] leading-5">
            当前已切换为“{fillTypeMeta.label}”填充类型，这里承载对应展示组件。
          </div>
        </div>
      </div>
    );
  };

  const renderDetailTabsWorkspace = (panelMode: 'document' | 'builder') => {
    const activeTabMeta = getDetailFillTypeMeta(currentDetailFillType);
    const contentPadding = isConfigFullscreenActive
      ? 'p-4'
      : panelMode === 'document'
        ? 'p-6'
        : 'p-5';

    return (
      <div className={`flex h-full min-h-0 flex-col ${contentPadding}`}>
        <div className={`rounded-[16px] border border-slate-200 bg-white p-3 shadow-[0_14px_26px_-24px_rgba(15,23,42,0.12)] dark:border-slate-700 dark:bg-slate-900/70 ${isConfigFullscreenActive ? 'mb-3' : 'mb-4'}`}>
          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              {detailTabs.map((tab) => {
                const tabMeta = getDetailFillTypeMeta(tabFillTypes[tab.id]);
                const isActive = activeTab === tab.id;

                return (
                  <div
                    key={tab.id}
                    style={isActive ? activeGlassTabStyle : undefined}
                    className={`group flex min-w-[148px] items-center gap-2 rounded-[16px] border px-2 py-1.5 transition-all ${
                      isActive
                        ? 'border-[color:var(--workspace-accent-border-strong)] bg-[color:var(--workspace-accent)] text-white shadow-[0_18px_32px_-22px_var(--workspace-accent-shadow)]'
                        : 'border-slate-200/80 bg-white/88 text-slate-600 shadow-[0_12px_22px_-22px_rgba(15,23,42,0.18)] hover:border-[color:var(--workspace-accent-border)] hover:bg-white dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300 dark:hover:border-[color:var(--workspace-accent-border)] dark:hover:bg-slate-900/80'
                    }`}
                  >
                    <button
                      onClick={() => setActiveTab(tab.id)}
                      className="flex min-w-0 flex-1 items-center gap-2.5 rounded-[12px] px-2 py-1 text-left"
                    >
                      <div className={`flex size-8 shrink-0 items-center justify-center rounded-xl transition-colors ${
                        isActive
                          ? 'bg-white/18 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]'
                          : 'bg-slate-50 text-slate-400 dark:bg-slate-800'
                      }`}>
                        <span className="material-symbols-outlined text-[16px]">{tabMeta.icon}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className={`truncate text-[12px] font-semibold ${isActive ? 'text-white' : ''}`}>{tab.name}</div>
                        <div className={`mt-0.5 truncate text-[10px] ${isActive ? 'text-white/75' : 'text-slate-400'}`}>{tabMeta.label}</div>
                      </div>
                    </button>
                    {detailTabs.length > 1 && (
                      <button
                        onClick={(e) => deleteTab(tab.id, e)}
                        className={`flex size-8 shrink-0 items-center justify-center rounded-2xl transition-colors ${
                          isActive
                            ? 'text-white/80 hover:bg-white/12 hover:text-white'
                            : 'text-slate-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/10'
                        }`}
                        title="删除页签"
                      >
                        <span className="material-symbols-outlined text-[16px]">close</span>
                      </button>
                    )}
                  </div>
                );
              })}

              <button
                onClick={addTab}
                className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-[12px] border border-dashed border-primary/30 bg-primary/5 px-3 text-[11px] font-semibold text-primary transition-all hover:bg-primary/10"
              >
                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                新增页签
              </button>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 xl:w-[360px]">
              {DETAIL_FILL_TYPE_OPTIONS.map((option) => {
                const isActive = currentDetailFillType === option.value;

                return (
                  <button
                    key={option.value}
                    onClick={() => setTabFillTypes((prev) => ({ ...prev, [activeTab]: option.value }))}
                    className={`rounded-[14px] border px-3 py-2 text-left transition-all ${
                      isActive
                        ? 'border-primary/25 bg-primary/5 text-primary shadow-[0_10px_18px_-18px_rgba(14,116,144,0.3)]'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-primary/20 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 flex size-8 items-center justify-center rounded-xl ${
                        isActive ? 'bg-white text-primary' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                      }`}>
                        <span className="material-symbols-outlined text-[16px]">{option.icon}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[12px] font-semibold">{option.label}</div>
                        <div className="mt-0.5 text-[10px] leading-5 text-slate-400">{option.description}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col rounded-[24px] border border-slate-200/80 bg-white/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] dark:border-slate-700 dark:bg-slate-900/50">
          {currentDetailFillType === '表格' ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex items-center justify-between border-b border-slate-200/80 px-4 py-3 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <span className="material-symbols-outlined text-[16px]">table_rows</span>
                  </div>
                    <div>
                      <div className="text-[13px] font-bold text-slate-700 dark:text-slate-200">明细字段配置</div>
                      <div className="text-[11px] text-slate-400">支持粘贴字段名并批量生成列</div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedDetailForDelete.length > 0 && (
                    <button
                      onClick={() => deleteSelectedColumns('detail', selectedDetailForDelete)}
                      className="inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-[12px] font-bold text-rose-500 transition-colors hover:bg-rose-50 dark:hover:bg-rose-500/10"
                    >
                      <span className="material-symbols-outlined text-[14px]">delete</span>
                      删除 ({selectedDetailForDelete.length})
                    </button>
                  )}
                  <button
                    onClick={() => setDetailTableColumns((prev) => ({
                      ...prev,
                      [activeTab]: [...(prev[activeTab] || []), { id: `d_col_${Date.now()}`, name: `新字段 ${(prev[activeTab] || []).length + 1}`, type: '文本', width: 120 }],
                    }))}
                    className="inline-flex items-center gap-1 rounded-xl bg-primary px-3 py-1.5 text-[12px] font-bold text-white shadow-[0_16px_26px_-18px_rgba(14,116,144,0.65)] transition-all hover:bg-erp-blue"
                  >
                    <span className="material-symbols-outlined text-[14px]">add</span>
                    新增字段
                  </button>
                </div>
              </div>
              <div
                className="min-h-0 flex-1 overflow-auto outline-none"
                tabIndex={0}
                onPaste={(e) => {
                  const text = e.clipboardData.getData('text');
                  if (!text) return;
                  const newColNames = text.split(/[\t\n]/).map((s) => s.trim()).filter(Boolean);
                  if (newColNames.length > 0) {
                    e.preventDefault();
                    const newCols = newColNames.map((name, i) => ({
                      id: `d_col_${Date.now()}_${i}`,
                      name,
                        type: '文本',
                      width: 100,
                    }));
                    setDetailTableColumns((prev) => ({
                      ...prev,
                      [activeTab]: [...(prev[activeTab] || []), ...newCols],
                    }));
                  }
                }}
              >
                {renderTableBuilder(
                  'detail',
                  detailTableColumns[activeTab] || [],
                  (newCols) => setDetailTableColumns((prev) => ({
                    ...prev,
                    [activeTab]: typeof newCols === 'function' ? newCols(prev[activeTab] || []) : newCols,
                  })),
                  selectedDetailColId,
                  selectedDetailForDelete,
                  setSelectedDetailForDelete,
                )}
              </div>
            </div>
          ) : (
            <div className="min-h-0 flex-1 p-4">
              {renderDetailFillPlaceholder()}
            </div>
          )}
        </div>

        <div className={`flex items-center justify-between rounded-[20px] border border-slate-200/70 bg-white/80 px-4 py-3 text-[12px] text-slate-500 shadow-[0_16px_30px_-28px_rgba(15,23,42,0.35)] dark:border-slate-700 dark:bg-slate-900/50 ${isConfigFullscreenActive ? 'mt-3' : 'mt-4'}`}>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-primary">info</span>
            当前页签:
            <span className="font-bold text-slate-700 dark:text-slate-200">
              {detailTabs.find((tab) => tab.id === activeTab)?.name || '未选择'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-primary/10 px-2.5 py-1 font-bold text-primary">{activeTabMeta.label}</span>
            <span>{activeTabMeta.description}</span>
          </div>
        </div>
      </div>
    );
  };

  const selectedColumnContext = useMemo(() => {
    const panelTabId = deferredActiveTab;
    const activeDetailTabName = detailTabs.find((tab) => tab.id === panelTabId)?.name || '当前明细';
    const currentDetailFillTypeMeta = getDetailFillTypeMeta(tabFillTypes[panelTabId]);
    const deferredSelectedLeftColId = deferredInspectorTarget.kind === 'left-col' ? deferredInspectorTarget.id ?? null : null;
    const deferredSelectedLeftFilterId = deferredInspectorTarget.kind === 'left-filter' ? deferredInspectorTarget.id ?? null : null;
    const deferredSelectedMainColId = deferredInspectorTarget.kind === 'main-col' ? deferredInspectorTarget.id ?? null : null;
    const deferredSelectedDetailColId = deferredInspectorTarget.kind === 'detail-col' ? deferredInspectorTarget.id ?? null : null;
    const deferredSelectedMainFilterId = deferredInspectorTarget.kind === 'main-filter' ? deferredInspectorTarget.id ?? null : null;
    const deferredSelectedDetailFilterId = deferredInspectorTarget.kind === 'detail-filter' ? deferredInspectorTarget.id ?? null : null;
    const deferredSelectedDetailTabId = deferredInspectorTarget.kind === 'detail-tab' ? deferredInspectorTarget.id ?? null : null;
    const deferredSelectedTableConfigScope = deferredInspectorTarget.kind === 'left-grid'
      ? 'left'
      : deferredInspectorTarget.kind === 'main-grid'
        ? 'main'
        : deferredInspectorTarget.kind === 'detail-grid'
          ? 'detail'
          : null;
    const deferredSelectedContextMenuScope = deferredInspectorTarget.kind === 'main-context' ? 'main' : deferredInspectorTarget.kind === 'detail-context' ? 'detail' : null;
    const makeDetailSetter = (updater: React.SetStateAction<any[]>) => {
      setDetailTableColumns((prev) => ({
        ...prev,
        [panelTabId]: typeof updater === 'function' ? updater(prev[panelTabId] || []) : updater,
      }));
    };

    if (deferredSelectedMainFilterId) {
      const condition = mainFilterFields.find((item) => item.id === deferredSelectedMainFilterId);
      return condition
        ? {
            kind: 'condition' as const,
            scope: 'filter' as const,
            title: '查询条件',
            description: '控制顶部条件区的控件名称、类型、默认值和查询联动逻辑。',
            icon: 'filter_alt',
            iconClass: 'bg-amber-500/12 text-amber-500',
            column: condition,
            setCols: setMainFilterFields,
            removeLabel: '删除条件',
          }
        : null;
    }

    if (deferredSelectedLeftFilterId) {
      const condition = leftFilterFields.find((item) => item.id === deferredSelectedLeftFilterId);
      return condition
        ? {
            kind: 'condition' as const,
            scope: 'left-filter' as const,
            title: '左侧条件',
            description: '控制左侧树表顶部条件区，配置会写入左边条件表并关联到所属树形字段。',
            icon: 'filter_alt',
            iconClass: 'bg-indigo-500/12 text-indigo-500',
            column: condition,
            setCols: setLeftFilterFields,
            removeLabel: '删除条件',
          }
        : null;
    }

    if (deferredSelectedDetailFilterId) {
      const condition = (detailFilterFields[panelTabId] || []).find((item) => item.id === deferredSelectedDetailFilterId);
      return condition
        ? {
            kind: 'condition' as const,
            scope: 'detail-filter' as const,
            title: `明细条件 · ${activeDetailTabName}`,
            description: '控制当前明细页签的查询条件、默认值和联动逻辑。',
            icon: 'filter_alt',
            iconClass: 'bg-orange-500/12 text-orange-500',
            column: condition,
            setCols: (updater: React.SetStateAction<any[]>) => {
              setDetailFilterFields((prev) => ({
                ...prev,
                [panelTabId]: typeof updater === 'function' ? updater(prev[panelTabId] || []) : updater,
              }));
            },
            removeLabel: '删除条件',
          }
        : null;
    }

    if (deferredSelectedDetailTabId) {
      return {
        kind: 'detail-tab' as const,
        scope: 'detail-tab' as const,
        title: `明细页签配置 · ${detailTabs.find((tab) => tab.id === deferredSelectedDetailTabId)?.name || activeDetailTabName}`,
        description: '控制当前明细页签的关联模块、联动条件和禁用策略。',
        icon: 'tab',
        iconClass: 'bg-violet-500/12 text-violet-500',
        column: detailTabConfigs[deferredSelectedDetailTabId] ?? buildDetailTabConfig(),
        setCols: (updater: React.SetStateAction<any>) => {
          setDetailTabConfigs((prev) => ({
            ...prev,
            [deferredSelectedDetailTabId]: typeof updater === 'function' ? updater(prev[deferredSelectedDetailTabId] ?? buildDetailTabConfig()) : updater,
          }));
        },
        removeLabel: '',
      };
    }

    if (deferredSelectedContextMenuScope === 'main') {
      return {
        kind: 'contextmenu' as const,
        scope: 'main-contextmenu' as const,
        title: '主表右键菜单',
        description: '控制主表预览区的右键菜单项，设置后可直接在表格中右击查看效果。',
        icon: 'right_click',
        iconClass: 'bg-cyan-500/12 text-cyan-500',
        column: mainTableConfig,
        setCols: setMainTableConfig,
        removeLabel: '',
      };
    }

    if (deferredSelectedContextMenuScope === 'detail') {
      return {
        kind: 'contextmenu' as const,
        scope: 'detail-contextmenu' as const,
        title: `明细右键菜单 · ${activeDetailTabName}`,
        description: '控制当前明细表的右键菜单项与禁用条件，设置后可直接右击明细行预览。',
        icon: 'right_click',
        iconClass: 'bg-sky-500/12 text-sky-500',
        column: detailTableConfigs[panelTabId] ?? buildGridConfig('', ''),
        setCols: (updater: React.SetStateAction<any>) => {
          setDetailTableConfigs((prev) => ({
            ...prev,
            [panelTabId]: typeof updater === 'function' ? updater(prev[panelTabId] ?? buildGridConfig('', '')) : updater,
          }));
        },
        removeLabel: '',
      };
    }

    if (deferredInspectorTarget.kind === 'workspace-theme') {
      return {
        kind: 'workspace-theme' as const,
        scope: 'workspace-theme' as const,
        title: '基础档案主题',
        description: '单独控制当前基础档案工作台的主题氛围，不跟表格配置混在一起。',
        icon: 'palette',
        iconClass: 'bg-fuchsia-500/12 text-fuchsia-500',
        column: { theme: workspaceTheme },
        setCols: () => undefined,
        removeLabel: '',
      };
    }

    if (deferredInspectorTarget.kind === 'source-grid') {
      return {
        kind: 'source-grid' as const,
        scope: 'source-grid' as const,
        title: '来源表配置',
        description: '',
        icon: 'database',
        iconClass: 'bg-sky-500/12 text-sky-500',
        column: billSourceDraft,
        availableColumns: billSources,
        setCols: setBillSourceDraft,
        removeLabel: '',
      };
    }

    if (deferredSelectedTableConfigScope === 'left') {
      return {
        kind: 'grid' as const,
        scope: 'left-grid' as const,
        title: '左侧树表',
        description: '',
        icon: 'account_tree',
        iconClass: 'bg-indigo-500/12 text-indigo-500',
        column: leftTableConfig,
        availableColumns: leftTableColumns,
        setCols: setLeftTableConfig,
        removeLabel: '',
      };
    }

    if (deferredSelectedTableConfigScope === 'main') {
      return {
        kind: 'grid' as const,
        scope: 'main-grid' as const,
        title: businessType === 'table' ? '单据头部' : '主表配置',
        description: '',
        icon: businessType === 'table' ? 'dashboard' : 'table_view',
        iconClass: 'bg-cyan-500/12 text-cyan-500',
        column: mainTableConfig,
        availableColumns: businessType === 'table' ? [...billMetaFields, ...mainTableColumns] : mainTableColumns,
        setCols: setMainTableConfig,
        removeLabel: '',
      };
    }

    if (deferredSelectedTableConfigScope === 'detail') {
      if (businessType === 'table') {
        return {
          kind: 'grid' as const,
          scope: 'detail-grid' as const,
          title: '单据明细',
          description: '',
          icon: 'table_rows',
          iconClass: 'bg-sky-500/12 text-sky-500',
          column: billDetailConfig,
          availableColumns: billDetailColumns,
          setCols: setBillDetailConfig,
          removeLabel: '',
        };
      }

      return {
        kind: 'grid' as const,
        scope: 'detail-grid' as const,
        title: currentDetailFillTypeMeta.value === '表格'
          ? `明细表配置 · ${activeDetailTabName}`
          : `明细${currentDetailFillTypeMeta.label}配置 · ${activeDetailTabName}`,
        description: '',
        icon: currentDetailFillTypeMeta.icon,
        iconClass: 'bg-sky-500/12 text-sky-500',
        column: detailTableConfigs[panelTabId] ?? { mainSql: '', defaultQuery: '', sqlPrompt: '', tableType: '普通表格' },
        availableColumns: detailTableColumns[panelTabId] ?? [],
        setCols: (updater: React.SetStateAction<any>) => {
          setDetailTableConfigs((prev) => ({
            ...prev,
            [panelTabId]: typeof updater === 'function' ? updater(prev[panelTabId] ?? { mainSql: '', defaultQuery: '', sqlPrompt: '', tableType: '普通表格' }) : updater,
          }));
        },
        removeLabel: '',
      };
    }

    if (deferredSelectedLeftColId) {
      const column = leftTableColumns.find((item) => item.id === deferredSelectedLeftColId);
      return column
        ? {
            kind: 'column' as const,
            scope: 'left' as const,
            title: '左侧树节点',
            description: '控制树形节点关联列解析出的左侧节点字段名称与展示宽度。',
            icon: 'account_tree',
            iconClass: 'bg-indigo-500/12 text-indigo-500',
            column,
            setCols: setLeftTableColumns,
            removeLabel: '删除列',
          }
        : null;
    }

    if (deferredSelectedMainColId) {
      const column = mainTableColumns.find((item) => item.id === deferredSelectedMainColId)
        ?? billMetaFields.find((item) => item.id === deferredSelectedMainColId);
      return column
        ? {
            kind: 'column' as const,
            scope: 'main' as const,
            title: businessType === 'table' ? '单据头部控件' : '基础档案主表',
            description: '',
            icon: businessType === 'table' ? 'touch_app' : 'table_rows',
            iconClass: 'bg-emerald-500/12 text-emerald-500',
            column,
            setCols: mainTableColumns.some((item) => item.id === deferredSelectedMainColId) ? setMainTableColumns : setBillMetaFields,
            removeLabel: '删除列',
          }
        : null;
    }

    if (deferredSelectedDetailColId) {
      const detailCols = businessType === 'table' ? billDetailColumns : (detailTableColumns[panelTabId] || []);
      const column = detailCols.find((item) => item.id === deferredSelectedDetailColId);
      return column
        ? {
            kind: 'column' as const,
            scope: 'detail' as const,
            title: businessType === 'table' ? '单据明细列' : `明细页签 · ${activeDetailTabName}`,
            description: '',
            icon: businessType === 'table' ? 'receipt_long' : 'receipt_long',
            iconClass: 'bg-blue-500/12 text-blue-500',
            column,
            setCols: businessType === 'table' ? setBillDetailColumns : makeDetailSetter,
            removeLabel: '删除列',
          }
        : null;
    }

    return null;
  }, [
    deferredActiveTab,
    deferredInspectorTarget,
    detailTabs,
    businessType,
    leftFilterFields,
    leftTableColumns,
    leftTableConfig,
    mainTableColumns,
    billMetaFields,
    detailTableColumns,
    billDetailColumns,
    mainFilterFields,
    detailFilterFields,
    mainTableConfig,
    detailTableConfigs,
    detailTabConfigs,
    billDetailConfig,
    billSourceDraft,
    billSources,
    tabFillTypes,
    workspaceTheme,
  ]);

  const renderColumnOperationPanel = () => {
    const fieldClass = 'w-full rounded-[18px] border border-slate-200/80 bg-slate-50/92 px-3.5 py-2.5 text-[12px] text-slate-700 outline-none transition shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] focus:border-[color:var(--workspace-accent-border-strong)] focus:bg-white focus:ring-4 focus:ring-[color:var(--workspace-accent-soft)] dark:border-slate-700 dark:bg-slate-900/72 dark:text-slate-100';
    const textareaClass = `${fieldClass} min-h-[92px] resize-none font-mono text-[11px] leading-5`;
    const panelShellClass = 'cloudy-glass-panel flex h-full min-h-0 flex-col overflow-hidden rounded-[28px] border border-white/70';
    const panelHeaderClass = 'cloudy-glass-toolbar shrink-0 px-4 py-4';
    const panelTitleClass = 'text-[15px] font-bold leading-6 text-slate-800 break-words dark:text-slate-100';
    const panelBadgeClass = 'cloudy-glass-chip inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold text-slate-500 dark:text-slate-300';
    const panelIconShellClass = 'cloudy-glass-orb flex size-10 shrink-0 items-center justify-center rounded-[16px]';
    const compactInfoCardClass = 'cloudy-glass-panel-soft rounded-[18px] px-3.5 py-3';
    const compactCardClass = 'cloudy-glass-panel-soft rounded-[20px] p-4';
    const sectionTitleClass = 'mb-3 flex items-center gap-2 text-[12px] font-bold text-slate-700 dark:text-slate-100';
    const mutedLabelClass = 'mb-1.5 block text-[11px] font-bold tracking-[0.06em] text-slate-400';
    const isDocumentScopedGridInspector = selectedColumnContext?.kind === 'grid'
      && businessType !== 'table'
      && (selectedColumnContext.scope === 'main-grid' || selectedColumnContext.scope === 'left-grid');
    const documentScopedGridContextMenuCount = isDocumentScopedGridInspector
      ? (selectedColumnContext?.column?.contextMenuItems ?? []).length
      : 0;
    const documentScopedGridColorRuleCount = isDocumentScopedGridInspector
      ? (selectedColumnContext?.column?.colorRules ?? []).length
      : 0;
    const documentScopedGridLabel = selectedColumnContext?.scope === 'left-grid' ? '左表' : '主表';
    const inspectorTabs: Array<{ id: 'common' | 'advanced' | 'contextmenu' | 'color'; label: string; icon: string; count?: number }> = isDocumentScopedGridInspector
      ? [
          { id: 'common', label: documentScopedGridLabel, icon: 'dashboard_customize' },
          { id: 'advanced', label: '布局', icon: 'view_stream' },
          { id: 'contextmenu', label: '右键', icon: 'right_click', count: documentScopedGridContextMenuCount },
          { id: 'color', label: '颜色', icon: 'palette', count: documentScopedGridColorRuleCount },
        ]
      : [
          { id: 'common', label: '核心配置', icon: 'dashboard_customize' },
          { id: 'advanced', label: '扩展配置', icon: 'network_node' },
        ];
    const currentInspectorTab = inspectorTabs.some((tab) => tab.id === inspectorPanelTab) ? inspectorPanelTab : 'common';
    const isCommonPanelTab = currentInspectorTab === 'common';
    const isContextMenuPanelTab = currentInspectorTab === 'contextmenu';
    const isColorPanelTab = currentInspectorTab === 'color';
    const renderInspectorTabs = () => (
      <div className="mt-3 flex items-center gap-2 rounded-[18px] border border-slate-200/70 bg-white/82 p-1.5 dark:border-slate-700 dark:bg-slate-900/50">
        {inspectorTabs.map((tab) => {
          const isActive = currentInspectorTab === tab.id;
          const hasCountBadge = typeof tab.count === 'number' && tab.count > 0;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setInspectorPanelTab(tab.id)}
              className={`relative flex flex-1 items-center justify-center gap-2 rounded-[14px] px-3 py-2 text-[12px] font-bold transition-all ${
                isActive
                  ? 'bg-white text-slate-800 shadow-[0_14px_28px_-22px_rgba(22,134,227,0.36)] dark:bg-slate-900/92 dark:text-slate-100'
                  : 'text-slate-500 hover:bg-white/80 dark:text-slate-400 dark:hover:bg-slate-900/72'
              }`}
            >
              <span className={`material-symbols-outlined text-[16px] ${isActive ? 'text-[#1686e3]' : 'text-slate-400 dark:text-slate-500'}`}>{tab.icon}</span>
              <span>{tab.label}</span>
              {hasCountBadge && (
                <span className="absolute right-2 top-1.5 inline-flex min-w-[16px] items-center justify-center rounded-full bg-[#e04f5f] px-1.5 py-0.5 text-[9px] font-black leading-none text-white shadow-[0_10px_18px_-14px_rgba(224,79,95,0.78)]">
                  {tab.count! > 9 ? '9+' : tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
    const renderAdvancedPlaceholder = (title: string) => (
      <section className="rounded-[24px] border border-dashed border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.78),rgba(255,255,255,0.94))] px-5 py-8 text-center dark:border-slate-700 dark:bg-slate-900/35">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-white text-[#1686e3] shadow-[0_18px_30px_-24px_rgba(22,134,227,0.55)] dark:bg-slate-800">
          <span className="material-symbols-outlined text-[20px]">inventory_2</span>
        </div>
        <div className="mt-4 text-[14px] font-bold text-slate-700 dark:text-slate-100">{title}</div>
      </section>
    );

    if (!selectedColumnContext) {
      return (
        <div style={workspaceThemeVars} className={panelShellClass}>
          <div className={panelHeaderClass}>
            <div className="flex items-start gap-3">
              <div className="flex size-10 items-center justify-center rounded-[16px] bg-[#eef6ff] text-[#1686e3] shadow-[0_18px_30px_-24px_rgba(22,134,227,0.4)] dark:bg-[#1686e3]/14 dark:text-[#7cc0ff]">
                <span className="material-symbols-outlined text-[20px]">tune</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={panelBadgeClass}>右侧检查器</span>
                </div>
                <h3 className="mt-2 text-[17px] font-bold tracking-[0.01em] text-slate-800 dark:text-slate-100">详细配置</h3>
              </div>
            </div>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center px-4 py-4">
            <div className="w-full rounded-[22px] border border-slate-200/75 bg-[radial-gradient(circle_at_top_left,rgba(22,134,227,0.08),transparent_40%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.95))] p-4 shadow-[0_24px_44px_-36px_rgba(15,23,42,0.24)] dark:border-slate-700 dark:bg-[radial-gradient(circle_at_top_left,rgba(22,134,227,0.12),transparent_42%),linear-gradient(180deg,rgba(15,23,42,0.76),rgba(15,23,42,0.56))]">
              <div className="flex items-start gap-3 rounded-[18px] border border-white/80 bg-white/86 p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] dark:border-slate-700 dark:bg-slate-900/45">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-[16px] bg-[#eef6ff] text-[#1686e3] dark:bg-[#1686e3]/14 dark:text-[#7cc0ff]">
                  <span className="material-symbols-outlined text-[22px]">touch_app</span>
                </div>
                <div className="min-w-0">
                  <div className="text-[15px] font-bold text-slate-800 dark:text-slate-100">先选中一个配置对象</div>
                  <div className="mt-1 text-[12px] leading-5 text-slate-500 dark:text-slate-300">在画布或表格上点击字段、条件、表格、页签后，这里会出现对应配置项。</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (selectedColumnContext.kind === 'workspace-theme') {
      return (
        <div style={workspaceThemeVars} className={panelShellClass}>
          <div className={panelHeaderClass}>
            <div className="flex items-start gap-3">
              <div className={`${panelIconShellClass} ${selectedColumnContext.iconClass}`}>
                <span className="material-symbols-outlined text-[18px]">{selectedColumnContext.icon}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className={panelTitleClass}>{selectedColumnContext.title}</h3>
                  <span className={panelBadgeClass}>独立主题设置</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
            <section className={`rounded-[18px] border p-4 shadow-[0_18px_30px_-26px_rgba(15,23,42,0.18)] ${getDetailBoardTheme(workspaceTheme).groupShell}`}>
              <div className="mb-3 flex items-center gap-2 text-[12px] font-bold text-slate-700 dark:text-slate-100">
                <span className="material-symbols-outlined text-[17px] text-[color:var(--workspace-accent)]">palette</span>
                选择主题
              </div>
              <div className="grid gap-2.5">
                {DETAIL_BOARD_THEME_OPTIONS.map((theme) => {
                  const isActiveTheme = workspaceTheme === theme.value;

                  return (
                    <button
                      key={`workspace-theme-panel-${theme.value}`}
                      type="button"
                      onClick={() => setWorkspaceTheme(theme.value)}
                      className={`flex w-full items-start gap-3 rounded-[16px] border px-3.5 py-3 text-left transition-all ${
                        isActiveTheme
                          ? 'border-[color:var(--workspace-accent-border-strong)] bg-[color:var(--workspace-accent-tint)] shadow-[0_16px_30px_-24px_var(--workspace-accent-shadow)]'
                          : 'border-slate-200/80 bg-white/90 hover:border-[color:var(--workspace-accent-border)] hover:bg-white dark:border-slate-700 dark:bg-slate-900/60 dark:hover:bg-slate-900/78'
                      }`}
                    >
                      <div
                        className={`mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-[14px] ${
                          theme.value === 'sunset'
                            ? 'bg-[linear-gradient(135deg,rgba(251,146,60,0.18),rgba(244,114,182,0.16))] text-orange-500'
                            : theme.value === 'jade'
                              ? 'bg-[linear-gradient(135deg,rgba(52,211,153,0.18),rgba(16,185,129,0.16))] text-emerald-500'
                              : 'bg-[linear-gradient(135deg,rgba(96,165,250,0.18),rgba(34,211,238,0.16))] text-sky-500'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[18px]">palette</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-[13px] font-bold ${isActiveTheme ? 'text-[color:var(--workspace-accent-strong)]' : 'text-slate-700 dark:text-slate-100'}`}>
                            {theme.label}
                          </span>
                          {isActiveTheme && (
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${getDetailBoardTheme(workspaceTheme).groupLabel}`}>
                              已启用
                            </span>
                          )}
                        </div>
                      </div>
                      <span className={`material-symbols-outlined text-[18px] ${isActiveTheme ? 'text-[color:var(--workspace-accent)]' : 'text-slate-300 dark:text-slate-600'}`}>
                        {isActiveTheme ? 'radio_button_checked' : 'radio_button_unchecked'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      );
    }

    if (selectedColumnContext.kind === 'source-grid') {
      const currentSourceConfig = billSourceDraft;
      const currentSourceFields = parseBillSourceDetailFields(currentSourceConfig.sourceDetail);
      const updateSourceConfig = (patch: Record<string, any>) => {
        setBillSourceDraft((prev) => ({ ...prev, ...patch }));
      };

      return (
        <div style={workspaceThemeVars} className={panelShellClass}>
          <div className={panelHeaderClass}>
            <div className="flex items-start gap-3">
              <div className={`${panelIconShellClass} ${selectedColumnContext.iconClass}`}>
                <span className="material-symbols-outlined text-[18px]">{selectedColumnContext.icon}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className={panelTitleClass}>{selectedColumnContext.title}</h3>
                  <span className={panelBadgeClass}>{billSources.length} 个来源</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4">
            <div className="space-y-4">
              <section className={compactCardClass}>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className={sectionTitleClass}>
                    <span className="material-symbols-outlined text-[18px] text-[color:var(--workspace-accent)]">database</span>
                    <h4>来源列表</h4>
                  </div>
                  <button
                    type="button"
                    onClick={createBillSourceDraft}
                    className="inline-flex h-8 items-center gap-1 rounded-[12px] bg-[color:var(--workspace-accent)] px-3 text-[11px] font-bold text-white"
                  >
                    <span className="material-symbols-outlined text-[14px]">add</span>
                    新增来源
                  </button>
                </div>
                <div className="space-y-2">
                  {billSources.map((source) => {
                    const isActive = source.id === activeBillSourceId && billSourceDraftMode === 'edit';
                    const fieldCount = parseBillSourceDetailFields(source.sourceDetail).length;
                    return (
                      <button
                        key={source.id}
                        type="button"
                        onClick={() => selectBillSourceDraft(source)}
                        className={`w-full rounded-[18px] border px-3.5 py-3 text-left transition-colors ${
                          isActive
                            ? 'border-[color:var(--workspace-accent-border-strong)] bg-[color:var(--workspace-accent-soft)]'
                            : 'border-slate-200/80 bg-white/88 hover:border-[color:var(--workspace-accent-border)] dark:border-slate-700 dark:bg-slate-900/56'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[13px] font-bold text-slate-800 dark:text-slate-100">
                              {source.sourceName || '未命名来源'}
                            </div>
                            <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                              {source.configType} · {source.sourceType} · {fieldCount} 项明细
                            </div>
                          </div>
                          {isActive && (
                            <span className="inline-flex rounded-full bg-[color:var(--workspace-accent-soft)] px-2 py-0.5 text-[10px] font-bold text-[color:var(--workspace-accent)]">
                              编辑中
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className={compactCardClass}>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className={sectionTitleClass}>
                    <span className="material-symbols-outlined text-[18px] text-[color:var(--workspace-accent)]">edit_square</span>
                    <h4>{billSourceDraftMode === 'create' ? '新增来源' : '编辑来源'}</h4>
                  </div>
                  <button
                    type="button"
                    onClick={saveBillSourceDraft}
                    className="inline-flex h-8 items-center gap-1 rounded-[12px] bg-[color:var(--workspace-accent)] px-3 text-[11px] font-bold text-white"
                  >
                    <span className="material-symbols-outlined text-[14px]">save</span>
                    保存来源
                  </button>
                </div>
                <div className="grid gap-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className={mutedLabelClass}>配置类型</label>
                      <select
                        value={currentSourceConfig.configType}
                        onChange={(e) => updateSourceConfig({ configType: e.target.value })}
                        className={fieldClass}
                      >
                        {BILL_SOURCE_CONFIG_TYPE_OPTIONS.map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={mutedLabelClass}>类型</label>
                      <select
                        value={currentSourceConfig.sourceType}
                        onChange={(e) => updateSourceConfig({ sourceType: e.target.value })}
                        className={fieldClass}
                      >
                        {BILL_SOURCE_TYPE_OPTIONS.map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className={mutedLabelClass}>来源名称</label>
                    <input
                      type="text"
                      value={currentSourceConfig.sourceName}
                      onChange={(e) => updateSourceConfig({ sourceName: e.target.value })}
                      className={fieldClass}
                    />
                  </div>
                  <div>
                    <label className={mutedLabelClass}>来源 SQL</label>
                    <textarea
                      rows={4}
                      value={currentSourceConfig.sourceSql}
                      onChange={(e) => updateSourceConfig({ sourceSql: e.target.value })}
                      className={textareaClass}
                    />
                  </div>
                  <div>
                    <label className={mutedLabelClass}>来源明细</label>
                    <textarea
                      rows={5}
                      value={currentSourceConfig.sourceDetail}
                      onChange={(e) => updateSourceConfig({ sourceDetail: e.target.value })}
                      placeholder="一行一个字段，或用逗号分隔"
                      className={textareaClass}
                    />
                    <div className="mt-2 flex flex-wrap gap-2">
                      {currentSourceFields.length > 0 ? currentSourceFields.map((fieldName) => (
                        <span
                          key={fieldName}
                          className="inline-flex h-8 items-center rounded-full border border-slate-200/80 bg-white/92 px-3 text-[11px] font-bold text-slate-700 shadow-[0_10px_18px_-16px_rgba(15,23,42,0.14)] dark:border-slate-700 dark:bg-slate-900/72 dark:text-slate-100"
                        >
                          {fieldName}
                        </span>
                      )) : (
                        <span className="text-[11px] text-slate-400">保存后这里会自动成为字段绑定可选项</span>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      );
    }

    if (selectedColumnContext.kind === 'detail-tab') {
      const currentTabConfig = selectedColumnContext.column;
      const updateTabConfig = (patch: Record<string, any>) => {
        selectedColumnContext.setCols((prev: Record<string, any>) => ({
          ...prev,
          ...patch,
        }));
      };

      return (
        <div className={panelShellClass}>
          <div className={panelHeaderClass}>
            <div className="flex items-start gap-3">
              <div className={`${panelIconShellClass} ${selectedColumnContext.iconClass}`}>
                <span className="material-symbols-outlined text-[18px]">{selectedColumnContext.icon}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className={panelTitleClass}>{selectedColumnContext.title}</h3>
                  <span className={panelBadgeClass}>页签级配置</span>
                </div>
                {renderInspectorTabs()}
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 py-5">
            {isCommonPanelTab ? (
              <>
                <section className={compactCardClass}>
                  <div className="grid gap-4">
                    <div>
                      <label className="mb-1.5 block text-[12px] font-bold text-slate-500">关联模块</label>
                      <input
                        type="text"
                        value={currentTabConfig.relatedModule ?? ''}
                        onChange={(e) => updateTabConfig({ relatedModule: e.target.value })}
                        placeholder="例如：附件管理 / 销售订单 / 入库记录"
                        className={fieldClass}
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[12px] font-bold text-slate-500">关联条件</label>
                      <textarea
                        rows={3}
                        value={currentTabConfig.relatedCondition ?? ''}
                        onChange={(e) => updateTabConfig({ relatedCondition: e.target.value })}
                        placeholder="例如：archive_id = ${id}"
                        className={textareaClass}
                      />
                    </div>
                  </div>
                </section>

                <section className={compactCardClass}>
                  <div className="grid gap-3">
                    <label className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white/80 px-4 py-3 text-[13px] font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900/45 dark:text-slate-200">
                      <span>自动刷新</span>
                      <input
                        type="checkbox"
                        checked={Boolean(currentTabConfig.autoRefresh)}
                        onChange={(e) => updateTabConfig({ autoRefresh: e.target.checked })}
                        className="h-4 w-4 rounded accent-[#1686e3]"
                      />
                    </label>
                    <label className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white/80 px-4 py-3 text-[13px] font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900/45 dark:text-slate-200">
                      <span>禁用页签</span>
                      <input
                        type="checkbox"
                        checked={Boolean(currentTabConfig.disabled)}
                        onChange={(e) => updateTabConfig({ disabled: e.target.checked })}
                        className="h-4 w-4 rounded accent-[#1686e3]"
                      />
                    </label>
                  </div>
                </section>
              </>
            ) : (
              <section className={compactCardClass}>
                <div>
                  <label className="mb-1.5 block text-[12px] font-bold text-slate-500">禁用条件</label>
                  <textarea
                    rows={4}
                    value={currentTabConfig.disabledCondition ?? ''}
                    onChange={(e) => updateTabConfig({ disabledCondition: e.target.value })}
                    placeholder="例如：status = '停用' OR parent_disabled = 1"
                    className={textareaClass}
                  />
                </div>
              </section>
            )}
          </div>
        </div>
      );
    }

    if (selectedColumnContext.kind === 'contextmenu') {
      const currentContextConfig = selectedColumnContext.column;
      const updateContextConfig = (patch: Record<string, any>) => {
        selectedColumnContext.setCols((prev: Record<string, any>) => ({
          ...prev,
          ...patch,
        }));
      };
      const menuItems = (currentContextConfig.contextMenuItems ?? []).map((item: any, index: number) => normalizeContextMenuItem(item, index + 1));
      const enabledMenuCount = menuItems.filter((item: any) => !item.disabled).length;

      return (
        <div className={panelShellClass}>
          <div className={panelHeaderClass}>
            <div className="flex items-start gap-3">
              <div className={`${panelIconShellClass} ${selectedColumnContext.iconClass}`}>
                <span className="material-symbols-outlined text-[18px]">{selectedColumnContext.icon}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className={panelTitleClass}>{selectedColumnContext.title}</h3>
                  <span className={panelBadgeClass}>右键菜单</span>
                </div>
                {renderInspectorTabs()}
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 py-5">
            {isCommonPanelTab ? (
              <>
                <section className="overflow-hidden rounded-[26px] border border-slate-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,248,252,0.96))] shadow-[0_20px_44px_-36px_rgba(15,23,42,0.42)] dark:border-slate-700 dark:bg-slate-900/48">
                  <div className="flex items-start justify-between gap-4 border-b border-slate-200/70 px-5 py-5 dark:border-slate-700">
                    <div className="min-w-0">
                      <div className="text-[14px] font-bold text-slate-800 dark:text-slate-100">菜单状态</div>
                    </div>
                    <label className="inline-flex shrink-0 cursor-pointer items-center gap-3 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-[12px] font-bold text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                      <span>{currentContextConfig.contextMenuEnabled ? '已启用' : '未启用'}</span>
                      <input
                        type="checkbox"
                        checked={Boolean(currentContextConfig.contextMenuEnabled)}
                        onChange={(e) => updateContextConfig({ contextMenuEnabled: e.target.checked })}
                        className="h-4 w-4 rounded accent-[#1686e3]"
                      />
                    </label>
                  </div>
                  <div className="grid gap-4 px-5 py-5">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-[20px] border border-slate-200/70 bg-white/92 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/55">
                        <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">菜单总数</div>
                        <div className="mt-2 text-[22px] font-black text-slate-800 dark:text-slate-100">{menuItems.length}</div>
                      </div>
                      <div className="rounded-[20px] border border-slate-200/70 bg-white/92 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/55">
                        <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">可用项</div>
                        <div className="mt-2 text-[22px] font-black text-emerald-500">{enabledMenuCount}</div>
                      </div>
                      <div className="rounded-[20px] border border-slate-200/70 bg-white/92 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/55">
                        <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">禁用项</div>
                        <div className="mt-2 text-[22px] font-black text-amber-500">{Math.max(0, menuItems.length - enabledMenuCount)}</div>
                      </div>
                    </div>

                    <div className="overflow-hidden rounded-[22px] border border-slate-200/70 bg-[#f8fbff] dark:border-slate-700 dark:bg-slate-900/62">
                      <div className="border-b border-slate-200/70 px-4 py-3 dark:border-slate-700">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px] text-[#1686e3]">preview</span>
                          <span className="text-[12px] font-bold text-slate-700 dark:text-slate-100">右键菜单预览</span>
                        </div>
                      </div>
                      <div className="bg-[radial-gradient(circle_at_top_left,rgba(22,134,227,0.12),transparent_55%),linear-gradient(180deg,rgba(241,247,253,0.94),rgba(255,255,255,0.96))] p-4 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.55),rgba(15,23,42,0.76))]">
                        <div className="mx-auto max-w-[260px] rounded-[18px] border border-white/80 bg-white/96 p-2 shadow-[0_24px_54px_-28px_rgba(15,23,42,0.38)] dark:border-slate-700 dark:bg-slate-900/96">
                          {menuItems.length > 0 ? (
                            menuItems.map((item: any) => {
                              const isDisabled = Boolean(item.disabled) || Boolean(item.disabledCondition);

                              return (
                                <div
                                  key={`preview-${item.id}`}
                                  className={`flex items-center gap-3 rounded-[14px] px-3 py-2.5 ${
                                    isDisabled ? 'opacity-55' : 'hover:bg-[#eef6ff] dark:hover:bg-slate-800'
                                  }`}
                                >
                                  <div className={`flex size-8 items-center justify-center rounded-2xl ${
                                    isDisabled ? 'bg-slate-100 text-slate-300 dark:bg-slate-800 dark:text-slate-600' : 'bg-[#1686e3]/10 text-[#1686e3]'
                                  }`}>
                                    <span className="material-symbols-outlined text-[15px]">{isDisabled ? 'block' : 'subdirectory_arrow_right'}</span>
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className={`break-words text-[12px] font-bold leading-5 ${
                                      isDisabled ? 'text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-100'
                                    }`}>
                                      {item.label || '未命名菜单'}
                                    </div>
                                    <div className="mt-1 break-all font-mono text-[10px] leading-5 text-slate-400">{item.actionKey || '未配置动作'}</div>
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="rounded-[16px] border border-dashed border-slate-200/80 px-4 py-6 text-center text-[12px] text-slate-400 dark:border-slate-700">
                              当前还没有右键菜单项
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="rounded-[26px] border border-slate-200/70 bg-white/84 p-5 shadow-[0_22px_48px_-38px_rgba(15,23,42,0.32)] dark:border-slate-700 dark:bg-slate-900/45">
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <div className="text-[14px] font-bold text-slate-800 dark:text-slate-100">菜单项编辑</div>
                    <button
                      type="button"
                      onClick={() => updateContextConfig({
                        contextMenuItems: [...menuItems, buildContextMenuItem(menuItems.length + 1)],
                      })}
                      className="inline-flex items-center gap-1 rounded-xl border border-[#1686e3] bg-[#1686e3] px-3 py-1.5 text-[12px] font-bold text-white transition-colors hover:bg-[#1176ca]"
                    >
                      <span className="material-symbols-outlined text-[14px]">add</span>
                      新增菜单
                    </button>
                  </div>

                  <div className="space-y-3">
                    {menuItems.length > 0 ? (
                      menuItems.map((item: any, index: number) => (
                        <div key={item.id} className="rounded-[24px] border border-slate-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,250,253,0.94))] p-4 shadow-[0_22px_40px_-34px_rgba(15,23,42,0.36)] dark:border-slate-700 dark:bg-slate-900/55">
                          <div className="mb-4 flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div className="flex size-10 items-center justify-center rounded-[18px] bg-[#1686e3]/10 text-[#1686e3]">
                                <span className="material-symbols-outlined text-[17px]">right_click</span>
                              </div>
                              <div className="min-w-0">
                                <div className="text-[13px] font-bold leading-5 text-slate-700 dark:text-slate-100">菜单 {index + 1}</div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => updateContextConfig({
                                contextMenuItems: menuItems.filter((menu: any) => menu.id !== item.id),
                              })}
                              className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[12px] font-bold text-rose-500 transition-colors hover:bg-rose-50 dark:hover:bg-rose-500/10"
                            >
                              <span className="material-symbols-outlined text-[14px]">delete</span>
                              删除
                            </button>
                          </div>

                          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_170px]">
                            <div>
                              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">菜单名称</label>
                              <input
                                type="text"
                                value={item.label ?? ''}
                                onChange={(e) => updateContextConfig({
                                  contextMenuItems: menuItems.map((menu: any) => (
                                    menu.id === item.id ? { ...menu, label: e.target.value } : menu
                                  )),
                                })}
                                placeholder="菜单名称"
                                className={fieldClass}
                              />
                            </div>
                            <div>
                              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">动作标识</label>
                              <input
                                type="text"
                                value={item.actionKey ?? ''}
                                onChange={(e) => updateContextConfig({
                                  contextMenuItems: menuItems.map((menu: any) => (
                                    menu.id === item.id ? { ...menu, actionKey: e.target.value } : menu
                                  )),
                                })}
                                placeholder="open-detail"
                                className={`${fieldClass} font-mono text-[12px]`}
                              />
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-[22px] border border-dashed border-slate-200/80 px-4 py-8 text-center text-[12px] text-slate-400 dark:border-slate-700">
                        还没有配置右键菜单
                      </div>
                    )}
                  </div>
                </section>
              </>
            ) : (
              <section className="rounded-[26px] border border-slate-200/70 bg-white/84 p-5 shadow-[0_22px_48px_-38px_rgba(15,23,42,0.32)] dark:border-slate-700 dark:bg-slate-900/45">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div className="text-[14px] font-bold text-slate-800 dark:text-slate-100">禁用规则</div>
                  <button
                    type="button"
                    onClick={() => updateContextConfig({
                      contextMenuItems: [...menuItems, buildContextMenuItem(menuItems.length + 1)],
                    })}
                    className="inline-flex items-center gap-1 rounded-xl border border-[#1686e3] bg-[#1686e3] px-3 py-1.5 text-[12px] font-bold text-white transition-colors hover:bg-[#1176ca]"
                  >
                    <span className="material-symbols-outlined text-[14px]">add</span>
                    新增菜单
                  </button>
                </div>

                <div className="space-y-3">
                  {menuItems.length > 0 ? (
                    menuItems.map((item: any, index: number) => (
                      <div key={`advanced-${item.id}`} className="rounded-[22px] border border-slate-200/70 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-900/45">
                        <div className="mb-3 flex items-center gap-2">
                          <div className="text-[13px] font-bold text-slate-700 dark:text-slate-100">菜单 {index + 1}</div>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                  item.disabled || item.disabledCondition ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300'
                          }`}>
                                {item.disabled || item.disabledCondition ? '已禁用' : '默认可用'}
                          </span>
                        </div>
                        <div>
                          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">禁用条件</label>
                          <textarea
                            rows={3}
                            value={item.disabledCondition ?? ''}
                            onChange={(e) => updateContextConfig({
                              contextMenuItems: menuItems.map((menu: any) => (
                                menu.id === item.id ? { ...menu, disabledCondition: e.target.value } : menu
                              )),
                            })}
                            placeholder="例如：status = '停用'"
                            className={textareaClass}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    renderAdvancedPlaceholder('还没有扩展右键规则')
                  )}
                </div>
              </section>
            )}
          </div>
        </div>
      );
    }

    if (selectedColumnContext.kind === 'grid') {
      const availableGridColumns = selectedColumnContext.availableColumns ?? [];
      const currentGridConfig = selectedColumnContext.column;
      const currentDetailBoard = normalizeDetailBoardConfig(currentGridConfig.detailBoard, availableGridColumns);
      const detailBoardTheme = getDetailBoardTheme(workspaceTheme);
      const treeOwnerField = treeRelationColumn ? normalizeColumn(treeRelationColumn) : null;
      const treeOwnerFieldKey = treeOwnerField?.sourceField || treeRelationColumn?.id || '';
      const isMainGridConfig = selectedColumnContext.scope === 'main-grid';
      const isLeftGridConfig = selectedColumnContext.scope === 'left-grid';
      const isBillHeadGridConfig = businessType === 'table' && selectedColumnContext.scope === 'main-grid';
      const isBillDetailGridConfig = businessType === 'table' && selectedColumnContext.scope === 'detail-grid';
      const isDocumentArchiveGrid = businessType !== 'table' && (isMainGridConfig || isLeftGridConfig);
      const detailGridFillTypeMeta = !isBillHeadGridConfig && !isBillDetailGridConfig && selectedColumnContext.scope === 'detail-grid'
        ? getDetailFillTypeMeta(currentDetailFillType)
        : null;
      const detailGridLegacyTable = detailGridFillTypeMeta?.value === '图表' ? 'p_systemdlltabchart' : null;
      const contextMenuItems = (currentGridConfig.contextMenuItems ?? []).map((item: any, index: number) => normalizeContextMenuItem(item, index + 1));
      const enabledMenuCount = contextMenuItems.filter((item: any) => !item.disabled).length;
      const colorRules = currentGridConfig.colorRules ?? [];
      const enabledColorRuleCount = colorRules.filter((rule: any) => !rule.disabled).length;
      const activeContextMenuSelectionId = isLeftGridConfig ? selectedLeftContextMenuId : selectedMainContextMenuId;
      const activeColorRuleSelectionId = isLeftGridConfig ? selectedLeftColorRuleId : selectedMainColorRuleId;
      const setActiveContextMenuSelectionId = isLeftGridConfig ? setSelectedLeftContextMenuId : setSelectedMainContextMenuId;
      const setActiveColorRuleSelectionId = isLeftGridConfig ? setSelectedLeftColorRuleId : setSelectedMainColorRuleId;
      const updateGridConfig = (patch: Record<string, any>) => {
        selectedColumnContext.setCols((prev: Record<string, any>) => ({
          ...prev,
          ...patch,
        }));
      };
      const setGridContextMenuItems = (updater: any[] | ((items: any[]) => any[])) => {
        const nextItems = (typeof updater === 'function' ? updater(contextMenuItems) : updater)
          .map((item: any, index: number) => normalizeContextMenuItem(
            isLeftGridConfig
              ? { ...item, tab: treeOwnerFieldKey }
              : item,
            index + 1,
          ));
        updateGridConfig({
          contextMenuItems: nextItems,
          contextMenuEnabled: nextItems.length > 0,
        });
      };
      const setGridColorRules = (updater: any[] | ((rules: any[]) => any[])) => {
        const nextRules = (typeof updater === 'function' ? updater(colorRules) : updater)
          .map((rule: any) => (
            isLeftGridConfig
              ? { ...rule, tab: treeOwnerFieldKey }
              : rule
          ));
        updateGridConfig({
          colorRules: nextRules,
          colorRulesEnabled: nextRules.some((rule: any) => !rule.disabled),
        });
      };
      const updateDetailBoard = (patch: Record<string, any> | ((current: any) => any)) => {
        updateGridConfig({
          detailBoard: typeof patch === 'function'
            ? patch(currentDetailBoard)
            : {
                ...currentDetailBoard,
                ...patch,
              },
        });
      };
      const addDetailGroup = () => {
        updateDetailBoard((current: any) => ({
          ...current,
          groups: [...current.groups, buildDetailBoardGroup(current.groups.length + 1)],
        }));
      };
      const applySuggestedDetailLayout = () => {
        updateDetailBoard({
          ...currentDetailBoard,
          groups: createSuggestedDetailBoardGroups(availableGridColumns),
          sortColumnId: availableGridColumns[0]?.id ?? null,
        });
        showToast('已应用推荐详情分组布局');
      };
      const updateDetailGroup = (groupId: string, updater: Record<string, any> | ((group: any) => any)) => {
        updateDetailBoard((current: any) => ({
          ...current,
          groups: current.groups.map((group: any) => (
            group.id === groupId
              ? typeof updater === 'function'
                ? updater(group)
                : { ...group, ...updater }
              : group
          )),
        }));
      };
      const mergeDetailGroupColumns = (groupId: string, columnIds: string[]) => {
        const validIds = Array.from(new Set(columnIds.filter((columnId) => availableGridColumns.some((column) => column.id === columnId))));
        if (validIds.length === 0) {
          showToast('剪贴板里没有匹配到主表字段');
          return;
        }

        setSelectedMainForDelete([]);
        const currentGroup = currentDetailBoard.groups.find((group: any) => group.id === groupId);
        const nextIds = Array.from(new Set([...(currentGroup?.columnIds ?? []), ...validIds]));
        const addedCount = nextIds.length - (currentGroup?.columnIds?.length ?? 0);
        if (addedCount <= 0) {
          showToast('这些字段已经都在当前分组里了');
          return;
        }

        updateDetailGroup(groupId, (group: any) => ({
          ...group,
          columnIds: nextIds,
        }));
        showToast(`已加入 ${addedCount} 个字段`);
      };
      const removeDetailGroupColumn = (groupId: string, columnId: string) => {
        updateDetailGroup(groupId, (group: any) => ({
          ...group,
          columnIds: group.columnIds.filter((id: string) => id !== columnId),
          columnWidths: Object.fromEntries(
            Object.entries(group.columnWidths ?? {}).filter(([key]) => key !== columnId),
          ),
        }));
      };
      const handleDetailGroupPaste = (event: React.ClipboardEvent<HTMLDivElement>, groupId: string) => {
        const text = event.clipboardData.getData('text/plain') || event.clipboardData.getData('text');
        const nextColumnIds = parseDetailBoardClipboardColumnIds(text, availableGridColumns);
        if (nextColumnIds.length === 0) {
          showToast('剪贴板里没有匹配到主表字段');
          return;
        }
        event.preventDefault();
        mergeDetailGroupColumns(groupId, nextColumnIds);
      };
      const clearDetailGroups = () => {
        updateDetailBoard({
          ...currentDetailBoard,
          groups: [],
        });
      };
      const detailGroupCount = currentDetailBoard.groups.length;
      const assignedFieldCount = currentDetailBoard.groups.reduce((sum: number, group: any) => sum + group.columnIds.length, 0);
      const detailBoardReady = detailGroupCount > 0;
      const selectedPopupMenuItem = isDocumentArchiveGrid
        ? contextMenuItems.find((item: any) => item.id === activeContextMenuSelectionId) ?? contextMenuItems[0] ?? null
        : null;
      const selectedColorRule = isDocumentArchiveGrid
        ? colorRules.find((rule: any) => rule.id === activeColorRuleSelectionId) ?? colorRules[0] ?? null
        : null;
      const updateGridColumns = (updater: React.SetStateAction<any[]>) => {
        if (selectedColumnContext.scope === 'left-grid') {
          setLeftTableColumns((prev) => (typeof updater === 'function' ? updater(prev) : updater));
          return;
        }

        if (selectedColumnContext.scope === 'main-grid') {
          if (businessType === 'table') {
            const metaIdSet = new Set(billMetaFields.map((field) => field.id));
            const currentFields = [...billMetaFields, ...mainTableColumns];
            const nextFields = typeof updater === 'function' ? updater(currentFields) : updater;

            setBillMetaFields(nextFields.filter((field) => metaIdSet.has(field.id)));
            setMainTableColumns(nextFields.filter((field) => !metaIdSet.has(field.id)));
            return;
          }

          setMainTableColumns((prev) => (typeof updater === 'function' ? updater(prev) : updater));
          return;
        }

        if (businessType === 'table') {
          setBillDetailColumns((prev) => (typeof updater === 'function' ? updater(prev) : updater));
          return;
        }

        setDetailTableColumns((prev) => ({
          ...prev,
          [activeTab]: typeof updater === 'function' ? updater(prev[activeTab] || []) : updater,
        }));
      };
      const translatableColumns = availableGridColumns.filter((column: any) => {
        const normalizedColumn = normalizeColumn(column);
        return /[\u4e00-\u9fff]/.test(normalizedColumn.name || '') && !/[A-Za-z]/.test(normalizedColumn.sourceField || '');
      });
      const generateGridSqlDraft = async () => {
        setIsGeneratingSqlDraft(true);

        try {
          const response = await requestSqlDraft({
            title: selectedColumnContext.title,
            description: currentGridConfig.sqlPrompt || '',
            tableType: currentGridConfig.tableType || '普通表格',
            columns: availableGridColumns.map((column: any) => {
              const normalizedColumn = normalizeColumn(column);
              return {
                id: normalizedColumn.id,
                name: normalizedColumn.name,
                type: normalizedColumn.type,
                identifier: normalizedColumn.sourceField || '',
              };
            }),
          });

          updateGridConfig({
            mainSql: response.draft.mainSql,
            defaultQuery: response.draft.defaultQuery,
          });
          showToast('已通过 MiniMax 生成主 SQL 草案');
        } catch (error) {
          showToast(error instanceof Error ? error.message : 'MiniMax 生成主 SQL 失败');
        } finally {
          setIsGeneratingSqlDraft(false);
        }
      };
      const translateGridIdentifiers = async () => {
        if (translatableColumns.length === 0) {
          showToast('当前表格没有需要翻译的中文字段');
          return;
        }

        setIsTranslatingIdentifiers(true);

        try {
          const response = await requestIdentifierTranslation(
            translatableColumns.map((column: any) => {
              const normalizedColumn = normalizeColumn(column);
              return {
                id: normalizedColumn.id,
                name: normalizedColumn.name,
                identifier: normalizedColumn.sourceField || '',
              };
            }),
          );
          const identifierMap = new Map(response.items.map((item) => [item.id, item.identifier]));

          updateGridColumns((prev) => prev.map((column) => (
            identifierMap.has(column.id)
              ? { ...column, sourceField: identifierMap.get(column.id) }
              : column
          )));
          showToast(`已翻译 ${response.items.length} 个字段标识`);
        } catch (error) {
          showToast(error instanceof Error ? error.message : 'MiniMax 翻译字段标识失败');
        } finally {
          setIsTranslatingIdentifiers(false);
        }
      };
      const renderSqlConfigSection = () => (
        <section className={compactCardClass}>
          <div className={sectionTitleClass}>
            <span className="material-symbols-outlined text-[18px] text-[color:var(--workspace-accent)]">frame_source</span>
            <h4>主 SQL 配置</h4>
          </div>
          <div className="grid gap-4">
            <div>
              <label className={mutedLabelClass}>生成描述</label>
              <textarea
                rows={3}
                value={currentGridConfig.sqlPrompt || ''}
                onChange={(e) => updateGridConfig({ sqlPrompt: e.target.value })}
                placeholder="例如：生成一个物料主档列表，支持名称、规格、单位和单价查询。"
                className={textareaClass}
              />
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <label className={`${mutedLabelClass} mb-0`}>主 SQL</label>
                <button
                  type="button"
                  onClick={generateGridSqlDraft}
                  disabled={isGeneratingSqlDraft}
                  className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[12px] px-3 text-[11px] font-bold transition-colors ${
                    isGeneratingSqlDraft
                      ? 'cursor-wait bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                      : 'bg-[color:var(--workspace-accent)] text-white shadow-[0_16px_28px_-24px_var(--workspace-accent-shadow)] hover:bg-[color:var(--workspace-accent-strong)]'
                  }`}
                >
                  <span className={`material-symbols-outlined text-[14px] ${isGeneratingSqlDraft ? 'animate-spin' : ''}`}>
                    {isGeneratingSqlDraft ? 'progress_activity' : 'auto_awesome'}
                  </span>
                  AI 生成
                </button>
              </div>
              <textarea
                rows={6}
                value={currentGridConfig.mainSql || ''}
                onChange={(e) => updateGridConfig({ mainSql: e.target.value })}
                placeholder="SELECT ... FROM ..."
                className={textareaClass}
              />
            </div>
            <div>
              <label className={mutedLabelClass}>默认查询</label>
              <input
                type="text"
                value={currentGridConfig.defaultQuery || ''}
                onChange={(e) => updateGridConfig({ defaultQuery: e.target.value })}
                placeholder="例如：status = 1"
                className={fieldClass}
              />
            </div>
          </div>
        </section>
      );
      const renderIdentifierTranslationSection = () => (
        <section className={compactCardClass}>
          <div className="flex items-start justify-between gap-3">
            <div className={sectionTitleClass}>
              <span className="material-symbols-outlined text-[18px] text-[color:var(--workspace-accent)]">translate</span>
              <h4>字段标识</h4>
            </div>
            <button
              type="button"
              onClick={translateGridIdentifiers}
              disabled={isTranslatingIdentifiers}
              className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[12px] px-3 text-[11px] font-bold transition-colors ${
                isTranslatingIdentifiers
                  ? 'cursor-wait bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                  : 'border border-[color:var(--workspace-accent-border)] bg-[color:var(--workspace-accent-soft)] text-[color:var(--workspace-accent-strong)] hover:bg-[color:var(--workspace-accent-tint)]'
              }`}
            >
              <span className={`material-symbols-outlined text-[14px] ${isTranslatingIdentifiers ? 'animate-spin' : ''}`}>
                {isTranslatingIdentifiers ? 'progress_activity' : 'translate'}
              </span>
              一键翻译
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className={compactInfoCardClass}>
              <div className="text-[11px] font-bold tracking-[0.08em] text-slate-400">当前列数</div>
              <div className="mt-1 text-[13px] font-bold text-slate-700 dark:text-slate-100">{availableGridColumns.length} 个</div>
            </div>
            <div className={compactInfoCardClass}>
              <div className="text-[11px] font-bold tracking-[0.08em] text-slate-400">待翻译</div>
              <div className="mt-1 text-[13px] font-bold text-slate-700 dark:text-slate-100">{translatableColumns.length} 个</div>
            </div>
          </div>
          <div className="rounded-[16px] border border-slate-200/70 bg-white/80 px-3.5 py-3 text-[12px] leading-6 text-slate-500 dark:border-slate-700 dark:bg-slate-900/45 dark:text-slate-300">
            会把只有中文名称、还没有英文标识的列翻译成 snake_case，并回填到“字段标识”。
          </div>
        </section>
      );
      const renderDocumentTableMappingSection = () => (
        <section className={`${compactCardClass} space-y-3`}>
          <div className="flex items-center gap-2 text-[12px] font-bold text-slate-700 dark:text-slate-100">
            <span className="material-symbols-outlined text-[17px] text-[color:var(--workspace-accent)]">schema</span>
            <h4>主表落表</h4>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full border border-slate-200/80 bg-white/92 px-3 py-1.5 text-[11px] font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-900/72 dark:text-slate-200">
              主配置 · p_systemdlltab
            </span>
            <span className="inline-flex items-center rounded-full border border-slate-200/80 bg-white/92 px-3 py-1.5 text-[11px] font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-900/72 dark:text-slate-200">
              条件 · p_systembillsourcecond
            </span>
            <button
              type="button"
              onClick={() => setInspectorPanelTab('contextmenu')}
              className="inline-flex items-center gap-2 rounded-full border border-[color:var(--workspace-accent-border)] bg-[color:var(--workspace-accent-soft)] px-3 py-1.5 text-[11px] font-bold text-[color:var(--workspace-accent-strong)] transition-colors hover:bg-[color:var(--workspace-accent-tint)]"
            >
              右键 · p_systempopupmenu
              <span className="rounded-full bg-white/90 px-1.5 py-0.5 text-[10px] font-black text-[color:var(--workspace-accent-strong)]">
                {contextMenuItems.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setInspectorPanelTab('color')}
              className="inline-flex items-center gap-2 rounded-full border border-[color:var(--workspace-accent-border)] bg-[color:var(--workspace-accent-soft)] px-3 py-1.5 text-[11px] font-bold text-[color:var(--workspace-accent-strong)] transition-colors hover:bg-[color:var(--workspace-accent-tint)]"
            >
              颜色 · p_systemwordbookcolor
              <span className="rounded-full bg-white/90 px-1.5 py-0.5 text-[10px] font-black text-[color:var(--workspace-accent-strong)]">
                {colorRules.length}
              </span>
            </button>
          </div>
        </section>
      );
      const renderLeftGridMappingSection = () => (
        <section className={`${compactCardClass} space-y-4`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[12px] font-bold text-slate-700 dark:text-slate-100">
              <span className="material-symbols-outlined text-[17px] text-[color:var(--workspace-accent)]">account_tree</span>
              <h4>左侧树表映射</h4>
            </div>
            {treeRelationColumn && (
              <button
                type="button"
                onClick={() => {
                  setSelectedMainForDelete([treeRelationColumn.id]);
                  activateColumnSelection('main', treeRelationColumn.id);
                  setInspectorPanelTab('common');
                }}
                className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--workspace-accent-border)] bg-[color:var(--workspace-accent-soft)] px-3 py-1.5 text-[11px] font-bold text-[color:var(--workspace-accent-strong)] transition-colors hover:bg-[color:var(--workspace-accent-tint)]"
              >
                <span className="material-symbols-outlined text-[14px]">ads_click</span>
                定位所属字段
              </button>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className={compactInfoCardClass}>
              <div className="text-[11px] font-bold tracking-[0.08em] text-slate-400">所属字段</div>
              <div className="mt-1 text-[13px] font-bold text-slate-700 dark:text-slate-100">{treeOwnerField?.name || '未配置树形字段'}</div>
              <div className="mt-1 break-all font-mono text-[11px] text-slate-400">{treeOwnerFieldKey || '未设置 fieldkey'}</div>
            </div>
            <div className={compactInfoCardClass}>
              <div className="text-[11px] font-bold tracking-[0.08em] text-slate-400">关联条件</div>
              <div className="mt-1 text-[13px] font-bold text-slate-700 dark:text-slate-100">{leftFilterFields.length} 条</div>
              <div className="mt-1 break-all font-mono text-[11px] text-slate-400">sourceid = {treeRelationColumn?.id || '未设置'}</div>
            </div>
          </div>
          <div className="grid gap-2">
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full border border-slate-200/80 bg-white/92 px-3 py-1.5 text-[11px] font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-900/72 dark:text-slate-200">
                左侧列 · p_systemwordbookgrid
              </span>
              <span className="inline-flex items-center rounded-full border border-slate-200/80 bg-white/92 px-3 py-1.5 text-[11px] font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-900/72 dark:text-slate-200">
                左边条件 · p_systembillsourcecond
              </span>
              <button
                type="button"
                onClick={() => setInspectorPanelTab('contextmenu')}
                className="inline-flex items-center gap-2 rounded-full border border-[color:var(--workspace-accent-border)] bg-[color:var(--workspace-accent-soft)] px-3 py-1.5 text-[11px] font-bold text-[color:var(--workspace-accent-strong)] transition-colors hover:bg-[color:var(--workspace-accent-tint)]"
              >
                左边右键 · p_systempopupmenu
                <span className="rounded-full bg-white/90 px-1.5 py-0.5 text-[10px] font-black text-[color:var(--workspace-accent-strong)]">
                  {contextMenuItems.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setInspectorPanelTab('color')}
                className="inline-flex items-center gap-2 rounded-full border border-[color:var(--workspace-accent-border)] bg-[color:var(--workspace-accent-soft)] px-3 py-1.5 text-[11px] font-bold text-[color:var(--workspace-accent-strong)] transition-colors hover:bg-[color:var(--workspace-accent-tint)]"
              >
                左边颜色 · p_systemwordbookcolor
                <span className="rounded-full bg-white/90 px-1.5 py-0.5 text-[10px] font-black text-[color:var(--workspace-accent-strong)]">
                  {colorRules.length}
                </span>
              </button>
            </div>
            <div className="rounded-[16px] border border-slate-200/70 bg-white/80 px-3.5 py-3 text-[12px] leading-6 text-slate-500 dark:border-slate-700 dark:bg-slate-900/45 dark:text-slate-300">
              左侧条件使用 `sourceid = {treeRelationColumn?.id || '字段 id'}`，`formKey / tab = {treeOwnerFieldKey || 'fieldkey'}`，右键和颜色都挂在所属字段的 `fieldkey` 上。
            </div>
          </div>
        </section>
      );
      const renderDetailChartTableMappingSection = () => (
        <section className={compactCardClass}>
          <div className={sectionTitleClass}>
            <span className="material-symbols-outlined text-[18px] text-[color:var(--workspace-accent)]">bar_chart</span>
            <h4>图表落点</h4>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className={compactInfoCardClass}>
              <div className="text-[11px] font-bold tracking-[0.08em] text-slate-400">当前填充</div>
              <div className="mt-1 text-[13px] font-bold text-slate-700 dark:text-slate-100">{detailGridFillTypeMeta?.label}</div>
              <div className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-slate-300">当前页签已经切到图表承载模式，右侧配置不再按普通明细表理解。</div>
            </div>
            <div className={compactInfoCardClass}>
              <div className="text-[11px] font-bold tracking-[0.08em] text-slate-400">图表配置表</div>
              <div className="mt-1 text-[13px] font-bold text-slate-700 dark:text-slate-100">p_systemdlltabchart</div>
              <div className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-slate-300">图表加载、展示入口和当前明细页签的图表关系统一写入这张表。</div>
            </div>
          </div>
        </section>
      );
      const managerSectionClass = 'rounded-[24px] border border-slate-200/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.92))] p-4 shadow-[0_24px_52px_-36px_rgba(15,23,42,0.28)] dark:border-slate-700 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.84),rgba(15,23,42,0.68))]';
      const managerHeaderClass = 'mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 pb-3.5 dark:border-slate-700/80';
      const managerTitleWrapClass = 'flex min-w-0 items-center gap-3';
      const managerTitleIconClass = 'inline-flex size-10 shrink-0 items-center justify-center rounded-[14px] border border-[color:var(--workspace-accent-border)] bg-[color:var(--workspace-accent-soft)] text-[color:var(--workspace-accent-strong)]';
      const managerActionButtonClass = 'inline-flex items-center gap-1 rounded-xl border border-[color:var(--workspace-accent)] bg-[color:var(--workspace-accent)] px-3 py-1.5 text-[12px] font-bold text-white shadow-[0_18px_32px_-24px_var(--workspace-accent-shadow)] transition-colors hover:bg-[color:var(--workspace-accent-strong)]';
      const managerListSurfaceClass = 'space-y-2.5 rounded-[20px] border border-white/70 bg-white/62 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.78)] dark:border-white/8 dark:bg-slate-950/20';
      const managerDetailNameClass = 'inline-flex max-w-full items-center rounded-full border border-slate-200/80 bg-white/88 px-3 py-1.5 text-[11px] font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-900/72 dark:text-slate-300';
      const managerHeaderToolsClass = 'ml-auto flex flex-wrap items-center justify-end gap-2';
      const managerMetricCardClass = 'min-w-[64px] rounded-[14px] border border-slate-200/80 bg-white/88 px-3 py-2 text-right shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] dark:border-slate-700 dark:bg-slate-900/62';
      const renderPopupMenuManagerSection = () => {
        const popupMenuParamFields = Array.from({ length: 10 }, (_, index) => ({
          key: `dllpar${index + 1}` as const,
          label: `参数 ${index + 1}`,
        }));
        const detailCardClass = 'rounded-[22px] border border-slate-200/80 bg-white/84 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.82)] dark:border-slate-700 dark:bg-slate-900/44';
        const detailSectionTitleClass = 'mb-4 flex items-center justify-between gap-3';
        const detailSectionLabelClass = 'text-[12px] font-bold tracking-[0.08em] text-slate-500 dark:text-slate-300';
        const popupMenuDisplayName = selectedPopupMenuItem?.menuname || selectedPopupMenuItem?.label || '未命名菜单';
        const getPopupMenuIconName = (value: unknown) => {
          if (typeof value !== 'string') return 'right_click';
          const trimmed = value.trim();
          return trimmed && !/[/.:\\]/.test(trimmed) && !/\s/.test(trimmed) ? trimmed : 'right_click';
        };
        const updateSelectedPopupMenuItem = (patch: Record<string, any>) => {
          if (!selectedPopupMenuItem) return;

          const mirroredPatch = {
            ...patch,
            ...(patch.menuname !== undefined ? { label: patch.menuname } : {}),
            ...(patch.label !== undefined ? { menuname: patch.label } : {}),
            ...(patch.dllname !== undefined ? { actionKey: patch.dllname } : {}),
            ...(patch.actionKey !== undefined ? { dllname: patch.actionKey } : {}),
            ...(patch.menuCond !== undefined ? { disabledCondition: patch.menuCond } : {}),
            ...(patch.disabledCondition !== undefined ? { menuCond: patch.disabledCondition } : {}),
          };

          setGridContextMenuItems((menus: any[]) => menus.map((menu: any) => (
            menu.id === selectedPopupMenuItem.id ? { ...menu, ...mirroredPatch } : menu
          )));
        };
        const updateSelectedPopupMenuNumber = (key: string, value: string, fallback = 0) => {
          updateSelectedPopupMenuItem({ [key]: value === '' ? fallback : normalizePopupMenuNumber(value, fallback) });
        };
        const activePopupMenuParamField = popupMenuParamFields.find((field) => field.key === selectedPopupMenuParamKey) ?? popupMenuParamFields[0];
        const activePopupMenuParamValue = selectedPopupMenuItem ? String(selectedPopupMenuItem[activePopupMenuParamField.key] ?? '') : '';
        const configuredPopupMenuParamCount = selectedPopupMenuItem
          ? popupMenuParamFields.filter((field) => String(selectedPopupMenuItem[field.key] ?? '').trim().length > 0).length
          : 0;
        const getPopupMenuParamPreview = (value: string) => {
          const normalized = value.replace(/\s+/g, ' ').trim();
          return normalized.length > 22 ? `${normalized.slice(0, 22)}...` : normalized;
        };
        const popupMenuTabValue = isLeftGridConfig ? treeOwnerFieldKey : String(currentMenuDraft.moduleCode ?? '');

        return (
        <div className="space-y-4">
          <section className={managerSectionClass}>
            <div className={managerHeaderClass}>
              <div className={managerTitleWrapClass}>
                <span className={managerTitleIconClass}>
                  <span className="material-symbols-outlined text-[18px]">list_alt</span>
                </span>
                <div>
                  <h4 className="text-[14px] font-bold text-slate-800 dark:text-slate-100">菜单列表</h4>
                </div>
              </div>
              <div className="flex w-full items-center justify-between gap-3 pt-1">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                <div className={managerMetricCardClass}>
                  <div className="text-[10px] font-bold tracking-[0.08em] text-slate-400">总数</div>
                  <div className="mt-1 text-[15px] font-black text-slate-800 dark:text-slate-100">{contextMenuItems.length}</div>
                </div>
                <div className={managerMetricCardClass}>
                  <div className="text-[10px] font-bold tracking-[0.08em] text-slate-400">可用</div>
                  <div className="mt-1 text-[15px] font-black text-emerald-500">{enabledMenuCount}</div>
                </div>
                <div className={managerMetricCardClass}>
                  <div className="text-[10px] font-bold tracking-[0.08em] text-slate-400">禁用</div>
                  <div className="mt-1 text-[15px] font-black text-amber-500">{Math.max(0, contextMenuItems.length - enabledMenuCount)}</div>
                </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const nextItem = buildContextMenuItem(contextMenuItems.length + 1, {
                      tab: popupMenuTabValue,
                    });
                    setGridContextMenuItems([...contextMenuItems, nextItem]);
                    setActiveContextMenuSelectionId(nextItem.id);
                  }}
                  className={`${managerActionButtonClass} shrink-0`}
                >
                  <span className="material-symbols-outlined text-[14px]">add</span>
                  新增菜单
                </button>
              </div>
            </div>
            <div className={`${managerListSurfaceClass} max-h-[332px] overflow-y-auto pr-1`}>
              {contextMenuItems.length > 0 ? contextMenuItems.map((item: any, index: number) => {
                const isSelected = selectedPopupMenuItem?.id === item.id;
                const iconName = getPopupMenuIconName(item.defailtimage);

                return (
                  <div
                    key={item.id}
                    className={`group flex items-center gap-3 rounded-[20px] border px-3.5 py-3 transition-all ${
                      isSelected
                        ? 'border-[color:var(--workspace-accent-border-strong)] bg-[linear-gradient(180deg,var(--workspace-accent-surface),rgba(255,255,255,0.96))] shadow-[0_22px_36px_-28px_var(--workspace-accent-shadow)] dark:bg-[linear-gradient(180deg,rgba(36,53,83,0.92),rgba(15,23,42,0.7))]'
                        : 'border-slate-200/75 bg-white/94 hover:border-[color:var(--workspace-accent-border)] hover:bg-white dark:border-slate-700 dark:bg-slate-900/56 dark:hover:bg-slate-900/72'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveContextMenuSelectionId(item.id)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <div className={`flex size-11 shrink-0 items-center justify-center rounded-[18px] border transition-colors ${
                        isSelected
                          ? 'border-[color:var(--workspace-accent)] bg-[color:var(--workspace-accent)] text-white'
                          : 'border-[color:var(--workspace-accent-border)] bg-[color:var(--workspace-accent-soft)] text-[color:var(--workspace-accent-strong)]'
                      }`}>
                        <span className="material-symbols-outlined text-[18px]">{iconName}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-bold text-slate-700 dark:text-slate-100">
                          {item.menuname || item.label || `菜单 ${index + 1}`}
                        </div>
                      </div>
                    </button>
                    <label
                      className="inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-200/80 bg-white/90 px-3 py-1.5 text-[11px] font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-900/72 dark:text-slate-300"
                      onMouseDown={(event) => event.stopPropagation()}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <span>禁用</span>
                      <input
                        type="checkbox"
                        checked={Boolean(item.disabled)}
                        onMouseDown={(event) => event.stopPropagation()}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => {
                          const checked = event.target.checked;
                          setGridContextMenuItems((menus: any[]) => menus.map((menu: any) => (
                            menu.id === item.id ? { ...menu, disabled: checked } : menu
                          )));
                        }}
                        className="h-4 w-4 rounded accent-[color:var(--workspace-accent)]"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => setGridContextMenuItems((menus: any[]) => menus.filter((menu: any) => menu.id !== item.id))}
                      className="inline-flex size-8 shrink-0 items-center justify-center rounded-xl text-rose-500 transition-colors hover:bg-rose-50 dark:hover:bg-rose-500/10"
                      title="删除菜单"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                );
              }) : (
                <div className="rounded-[22px] border border-dashed border-slate-200/80 px-4 py-10 text-center text-[12px] text-slate-400 dark:border-slate-700">
                  还没有配置右键菜单
                </div>
              )}
            </div>
          </section>

          <section className={`${managerSectionClass} min-w-0`}>
            <div className={managerHeaderClass}>
              <div className={managerTitleWrapClass}>
                <span className={managerTitleIconClass}>
                  <span className="material-symbols-outlined text-[18px]">edit_note</span>
                </span>
                <div>
                  <h4 className="text-[14px] font-bold text-slate-800 dark:text-slate-100">菜单详情</h4>
                </div>
              </div>
              {selectedPopupMenuItem && (
                <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
                  <span className={`${managerDetailNameClass} max-w-[320px] truncate`}>
                    {popupMenuDisplayName}
                  </span>
                  <span className="inline-flex items-center rounded-full border border-slate-200/80 bg-white/92 px-3 py-1.5 text-[11px] font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-900/72 dark:text-slate-300">
                    顺序 {selectedPopupMenuItem.orderid ?? 0}
                  </span>
                </div>
              )}
            </div>
            {selectedPopupMenuItem ? (
              <div className="space-y-3.5">
                <section className={detailCardClass}>
                  <div className={detailSectionTitleClass}>
                    <div className={detailSectionLabelClass}>核心配置</div>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500">保留常用项，减少滚动</span>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <label className={mutedLabelClass}>菜单名称</label>
                      <input
                        type="text"
                        value={selectedPopupMenuItem.menuname ?? selectedPopupMenuItem.label ?? ''}
                        onChange={(e) => updateSelectedPopupMenuItem({ menuname: e.target.value })}
                        placeholder="菜单名称"
                        className={fieldClass}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className={mutedLabelClass}>调用模板名</label>
                      <input
                        type="text"
                        value={selectedPopupMenuItem.dllname ?? ''}
                        onChange={(e) => updateSelectedPopupMenuItem({ dllname: e.target.value })}
                        placeholder="例如：open_archive_detail"
                        className={`${fieldClass} font-mono text-[12px]`}
                      />
                    </div>
                    <div>
                      <label className={mutedLabelClass}>右键类型</label>
                      <input
                        type="number"
                        value={selectedPopupMenuItem.menuType ?? 0}
                        onChange={(e) => updateSelectedPopupMenuNumber('menuType', e.target.value, 0)}
                        className={fieldClass}
                      />
                    </div>
                    <div>
                      <label className={mutedLabelClass}>加载方式</label>
                      <input
                        type="number"
                        value={selectedPopupMenuItem.showMode ?? 0}
                        onChange={(e) => updateSelectedPopupMenuNumber('showMode', e.target.value, 0)}
                        className={fieldClass}
                      />
                    </div>
                    <div>
                      <label className={mutedLabelClass}>添加方式</label>
                      <input
                        type="number"
                        value={selectedPopupMenuItem.addShowMode ?? 0}
                        onChange={(e) => updateSelectedPopupMenuNumber('addShowMode', e.target.value, 0)}
                        className={fieldClass}
                      />
                    </div>
                    <div>
                      <label className={mutedLabelClass}>事件类型</label>
                      <input
                        type="number"
                        value={selectedPopupMenuItem.actiontype ?? 0}
                        onChange={(e) => updateSelectedPopupMenuNumber('actiontype', e.target.value, 0)}
                        className={fieldClass}
                      />
                    </div>
                  </div>
                </section>

                <section className={detailCardClass}>
                  <div className={detailSectionTitleClass}>
                    <div className={detailSectionLabelClass}>参数配置</div>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500">已配置 {configuredPopupMenuParamCount}/10</span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {popupMenuParamFields.map((field, index) => {
                      const hasValue = Boolean(String(selectedPopupMenuItem[field.key] ?? '').trim());
                      const isActive = activePopupMenuParamField.key === field.key;
                      const previewValue = getPopupMenuParamPreview(String(selectedPopupMenuItem[field.key] ?? ''));

                      return (
                        <button
                          key={field.key}
                          type="button"
                          onClick={() => setSelectedPopupMenuParamKey(field.key)}
                          aria-pressed={isActive}
                          className={`group flex min-w-0 items-center justify-between gap-3 rounded-[18px] border px-3.5 py-3 text-left transition-all duration-150 ${
                            isActive
                              ? 'border-[color:var(--workspace-accent-border-strong)] bg-[color:var(--workspace-accent-surface)] shadow-[0_18px_30px_-24px_var(--workspace-accent-shadow)]'
                              : hasValue
                                ? 'border-[color:var(--workspace-accent-border)] bg-[color:var(--workspace-accent-soft)]/55 hover:border-[color:var(--workspace-accent-border-strong)]'
                                : 'border-slate-200/80 bg-white/88 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900/68'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className={`text-[12px] font-bold ${isActive ? 'text-[color:var(--workspace-accent-strong)] dark:text-white' : 'text-slate-700 dark:text-slate-100'}`}>
                                参数 {index + 1}
                              </span>
                              {hasValue && (
                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                  isActive
                                    ? 'bg-[color:var(--workspace-accent)] text-white'
                                    : 'bg-emerald-500/12 text-emerald-600 dark:bg-emerald-500/18 dark:text-emerald-300'
                                }`}
                                >
                                  已填
                                </span>
                              )}
                            </div>
                            <div className={`mt-1 truncate text-[11px] ${hasValue ? (isActive ? 'text-[color:var(--workspace-accent-strong)]/80 dark:text-slate-200/90' : 'text-slate-500 dark:text-slate-300') : 'text-slate-400 dark:text-slate-500'}`}>
                              {hasValue ? previewValue : '未填写'}
                            </div>
                          </div>
                          <span className={`material-symbols-outlined shrink-0 text-[16px] transition-colors ${
                            isActive
                              ? 'text-[color:var(--workspace-accent-strong)] dark:text-white'
                              : 'text-slate-300 group-hover:text-slate-500 dark:text-slate-600 dark:group-hover:text-slate-300'
                          }`}
                          >
                            chevron_right
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-3 rounded-[18px] border border-slate-200/80 bg-slate-50/72 p-3.5 dark:border-slate-700 dark:bg-slate-900/46">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="text-[12px] font-bold text-slate-700 dark:text-slate-100">{activePopupMenuParamField.label}</div>
                      <button
                        type="button"
                        onClick={() => updateSelectedPopupMenuItem({ [activePopupMenuParamField.key]: '' })}
                        className="inline-flex items-center gap-1 rounded-full border border-slate-200/80 bg-white/88 px-3 py-1.5 text-[11px] font-bold text-slate-500 transition-colors hover:border-rose-200 hover:text-rose-500 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300"
                      >
                        <span className="material-symbols-outlined text-[14px]">ink_eraser</span>
                        清空当前
                      </button>
                    </div>
                    <textarea
                      rows={3}
                      value={activePopupMenuParamValue}
                      onChange={(e) => updateSelectedPopupMenuItem({ [activePopupMenuParamField.key]: e.target.value })}
                      placeholder={activePopupMenuParamField.label}
                      className={`${textareaClass} min-h-[96px] resize-y font-mono text-[12px]`}
                    />
                  </div>
                </section>

                <section className={detailCardClass}>
                  <div className={detailSectionTitleClass}>
                    <div className={detailSectionLabelClass}>事件脚本与提示</div>
                  </div>
                  <div className="grid gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
                    <div>
                      <label className={mutedLabelClass}>事件脚本</label>
                      <textarea
                        rows={8}
                        value={selectedPopupMenuItem.action ?? ''}
                        onChange={(e) => updateSelectedPopupMenuItem({ action: e.target.value })}
                        placeholder="脚本 / 事件表达式"
                        className={`${textareaClass} min-h-[184px]`}
                      />
                    </div>
                    <div className="grid gap-3">
                      <div>
                        <label className={mutedLabelClass}>执行前提示</label>
                        <textarea
                          rows={2}
                          value={selectedPopupMenuItem.beforeMsg ?? ''}
                          onChange={(e) => updateSelectedPopupMenuItem({ beforeMsg: e.target.value })}
                          className={`${textareaClass} min-h-[78px] font-sans text-[12px]`}
                        />
                      </div>
                      <div>
                        <label className={mutedLabelClass}>成功提示</label>
                        <textarea
                          rows={2}
                          value={selectedPopupMenuItem.msgSuccess ?? ''}
                          onChange={(e) => updateSelectedPopupMenuItem({ msgSuccess: e.target.value })}
                          className={`${textareaClass} min-h-[78px] font-sans text-[12px]`}
                        />
                      </div>
                      <div>
                        <label className={mutedLabelClass}>错误提示</label>
                        <textarea
                          rows={2}
                          value={selectedPopupMenuItem.msgError ?? ''}
                          onChange={(e) => updateSelectedPopupMenuItem({ msgError: e.target.value })}
                          className={`${textareaClass} min-h-[78px] font-sans text-[12px]`}
                        />
                      </div>
                      <div>
                        <label className={mutedLabelClass}>补充说明</label>
                        <textarea
                          rows={2}
                          value={selectedPopupMenuItem.Fremark ?? ''}
                          onChange={(e) => updateSelectedPopupMenuItem({ Fremark: e.target.value })}
                          className={`${textareaClass} min-h-[78px] font-sans text-[12px]`}
                        />
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            ) : (
              <div className="rounded-[20px] border border-dashed border-slate-200/80 px-4 py-12 text-center text-[12px] text-slate-400 dark:border-slate-700">
                先从左侧选择一个菜单项，再继续配置 p_systempopupmenu。
              </div>
            )}
          </section>
        </div>
      );
      };
      const renderColorRuleManagerSection = () => (
        <div className="space-y-4">
          <section className={managerSectionClass}>
            <div className={managerHeaderClass}>
              <div className={managerTitleWrapClass}>
                <span className={managerTitleIconClass}>
                  <span className="material-symbols-outlined text-[18px]">format_paint</span>
                </span>
                <div>
                  <h4 className="text-[14px] font-bold text-slate-800 dark:text-slate-100">规则列表</h4>
                  <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">列表保持精简，颜色条件和样式在详情区集中调整。</p>
                </div>
              </div>
              <div className={managerHeaderToolsClass}>
                <div className={managerMetricCardClass}>
                  <div className="text-[10px] font-bold tracking-[0.08em] text-slate-400">总数</div>
                  <div className="mt-1 text-[15px] font-black text-slate-800 dark:text-slate-100">{colorRules.length}</div>
                </div>
                <div className={managerMetricCardClass}>
                  <div className="text-[10px] font-bold tracking-[0.08em] text-slate-400">生效</div>
                  <div className="mt-1 text-[15px] font-black text-[color:var(--workspace-accent-strong)]">{enabledColorRuleCount}</div>
                </div>
                <div className={managerMetricCardClass}>
                  <div className="text-[10px] font-bold tracking-[0.08em] text-slate-400">停用</div>
                  <div className="mt-1 text-[15px] font-black text-amber-500">{Math.max(0, colorRules.length - enabledColorRuleCount)}</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const nextRule = buildGridColorRule(colorRules.length + 1, isLeftGridConfig ? { tab: treeOwnerFieldKey } : {});
                    setGridColorRules([...colorRules, nextRule]);
                    setActiveColorRuleSelectionId(nextRule.id);
                  }}
                  className={managerActionButtonClass}
                >
                  <span className="material-symbols-outlined text-[14px]">add</span>
                  新增规则
                </button>
              </div>
            </div>
            <div className={managerListSurfaceClass}>
              {colorRules.length > 0 ? colorRules.map((rule: any, index: number) => (
                <div
                  key={rule.id}
                  className={`flex items-center gap-3 rounded-[18px] border px-3.5 py-2.5 transition-all ${
                    selectedColorRule?.id === rule.id
                      ? 'border-[color:var(--workspace-accent-border-strong)] bg-[color:var(--workspace-accent-surface)] shadow-[0_18px_30px_-24px_var(--workspace-accent-shadow)]'
                      : 'border-slate-200/75 bg-white/92 hover:border-[color:var(--workspace-accent-border)] dark:border-slate-700 dark:bg-slate-900/55'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setActiveColorRuleSelectionId(rule.id)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <div
                      className="flex size-10 shrink-0 items-center justify-center rounded-[16px] border"
                      style={{ color: rule.textColor || '#9f1239', backgroundColor: rule.backgroundColor || '#ffe4e6', borderColor: rule.backgroundColor || '#ffe4e6' }}
                    >
                      <span className="material-symbols-outlined text-[16px]">palette</span>
                    </div>
                    <div className="min-w-0 flex-1 truncate text-[13px] font-bold text-slate-700 dark:text-slate-100">
                      {rule.label || `规则 ${index + 1}`}
                    </div>
                  </button>
                  <label
                    className="inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-200/80 bg-white/90 px-3 py-1.5 text-[11px] font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-900/72 dark:text-slate-300"
                    onMouseDown={(event) => event.stopPropagation()}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <span>禁用</span>
                    <input
                      type="checkbox"
                      checked={Boolean(rule.disabled)}
                      onMouseDown={(event) => event.stopPropagation()}
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) => {
                        const checked = event.target.checked;
                        setGridColorRules((rules: any[]) => rules.map((item: any) => (
                          item.id === rule.id ? { ...item, disabled: checked } : item
                        )));
                      }}
                      className="h-4 w-4 rounded accent-[color:var(--workspace-accent)]"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setGridColorRules((rules: any[]) => rules.filter((item: any) => item.id !== rule.id))}
                    className="inline-flex size-8 shrink-0 items-center justify-center rounded-xl text-rose-500 transition-colors hover:bg-rose-50 dark:hover:bg-rose-500/10"
                    title="删除规则"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </div>
              )) : (
                <div className="rounded-[22px] border border-dashed border-slate-200/80 px-4 py-8 text-center text-[12px] text-slate-400 dark:border-slate-700">
                  还没有颜色规则
                </div>
              )}
            </div>
          </section>

          <section className={managerSectionClass}>
            <div className={managerHeaderClass}>
              <div className={managerTitleWrapClass}>
                <span className={managerTitleIconClass}>
                  <span className="material-symbols-outlined text-[18px]">edit_note</span>
                </span>
                <div>
                  <h4 className="text-[14px] font-bold text-slate-800 dark:text-slate-100">规则详情</h4>
                  <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">这里统一维护匹配字段、颜色值和规则说明。</p>
                </div>
              </div>
              {selectedColorRule && (
                <span className={`${managerDetailNameClass} truncate`}>
                  {selectedColorRule.label || '未命名规则'}
                </span>
              )}
            </div>
            {selectedColorRule ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={mutedLabelClass}>规则名称</label>
                  <input
                    type="text"
                    value={selectedColorRule.label ?? ''}
                    onChange={(e) => setGridColorRules((rules: any[]) => rules.map((item: any) => (
                      item.id === selectedColorRule.id ? { ...item, label: e.target.value } : item
                    )))}
                    placeholder="例如：停用记录 / 高价物料"
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label className={mutedLabelClass}>匹配字段</label>
                  <select
                    value={selectedColorRule.field ?? ''}
                    onChange={(e) => setGridColorRules((rules: any[]) => rules.map((item: any) => (
                      item.id === selectedColorRule.id ? { ...item, field: e.target.value } : item
                    )))}
                    className={fieldClass}
                  >
                    <option value="">请选择字段</option>
                    {availableGridColumns.map((column: any) => {
                      const normalizedColumn = normalizeColumn(column);
                      return (
                        <option key={`rule-field-${selectedColorRule.id}-${column.id}`} value={normalizedColumn.sourceField || normalizedColumn.name}>
                          {normalizedColumn.name} ({normalizedColumn.sourceField || '未配置标识'})
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <label className={mutedLabelClass}>匹配方式</label>
                  <select
                    value={selectedColorRule.operator ?? '等于'}
                    onChange={(e) => setGridColorRules((rules: any[]) => rules.map((item: any) => (
                      item.id === selectedColorRule.id ? { ...item, operator: e.target.value } : item
                    )))}
                    className={fieldClass}
                  >
                    {GRID_COLOR_RULE_OPERATOR_OPTIONS.map((operator) => (
                      <option key={operator} value={operator}>{operator}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={mutedLabelClass}>匹配值</label>
                  <input
                    type="text"
                    value={selectedColorRule.value ?? ''}
                    onChange={(e) => setGridColorRules((rules: any[]) => rules.map((item: any) => (
                      item.id === selectedColorRule.id ? { ...item, value: e.target.value } : item
                    )))}
                    placeholder="例如：停用 / 1000"
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label className={mutedLabelClass}>字体颜色</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={/^#[0-9a-fA-F]{6}$/.test(selectedColorRule.textColor || '') ? selectedColorRule.textColor : '#9f1239'}
                      onChange={(e) => setGridColorRules((rules: any[]) => rules.map((item: any) => (
                        item.id === selectedColorRule.id ? { ...item, textColor: e.target.value } : item
                      )))}
                      className="h-10 w-14 rounded-[14px] border border-slate-200 bg-white px-1 dark:border-slate-700 dark:bg-slate-900"
                    />
                    <input
                      type="text"
                      value={selectedColorRule.textColor ?? '#9f1239'}
                      onChange={(e) => setGridColorRules((rules: any[]) => rules.map((item: any) => (
                        item.id === selectedColorRule.id ? { ...item, textColor: e.target.value } : item
                      )))}
                      className={`${fieldClass} font-mono text-[12px]`}
                    />
                  </div>
                </div>
                <div>
                  <label className={mutedLabelClass}>背景颜色</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={/^#[0-9a-fA-F]{6}$/.test(selectedColorRule.backgroundColor || '') ? selectedColorRule.backgroundColor : '#ffe4e6'}
                      onChange={(e) => setGridColorRules((rules: any[]) => rules.map((item: any) => (
                        item.id === selectedColorRule.id ? { ...item, backgroundColor: e.target.value } : item
                      )))}
                      className="h-10 w-14 rounded-[14px] border border-slate-200 bg-white px-1 dark:border-slate-700 dark:bg-slate-900"
                    />
                    <input
                      type="text"
                      value={selectedColorRule.backgroundColor ?? '#ffe4e6'}
                      onChange={(e) => setGridColorRules((rules: any[]) => rules.map((item: any) => (
                        item.id === selectedColorRule.id ? { ...item, backgroundColor: e.target.value } : item
                      )))}
                      className={`${fieldClass} font-mono text-[12px]`}
                    />
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className={mutedLabelClass}>规则说明</label>
                  <textarea
                    rows={4}
                    value={selectedColorRule.note ?? ''}
                    onChange={(e) => setGridColorRules((rules: any[]) => rules.map((item: any) => (
                      item.id === selectedColorRule.id ? { ...item, note: e.target.value } : item
                    )))}
                    placeholder="说明这条颜色规则的触发场景，方便后续排查和维护。"
                    className={textareaClass}
                  />
                </div>
              </div>
            ) : (
              <div className="rounded-[18px] border border-dashed border-slate-200/80 px-4 py-8 text-center text-[12px] text-slate-400 dark:border-slate-700">
                先从上面选择一条颜色规则，再继续配置细节。
              </div>
            )}
          </section>
        </div>
      );

      return (
        <div className={panelShellClass}>
          <div className={panelHeaderClass}>
            <div className="flex min-w-0 items-start gap-3">
              <div className={`${panelIconShellClass} ${selectedColumnContext.iconClass}`}>
                <span className="material-symbols-outlined text-[18px]">{selectedColumnContext.icon}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className={panelTitleClass}>{selectedColumnContext.title}</h3>
                  <span className={panelBadgeClass}>表格级配置</span>
                  {detailGridLegacyTable && (
                    <span className="inline-flex items-center rounded-full border border-[#1686e3]/18 bg-[#1686e3]/8 px-2.5 py-1 text-[10px] font-bold text-[#1686e3]">
                      {detailGridLegacyTable}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
                <div className="flex flex-wrap items-center gap-2">
                {!isBillHeadGridConfig && !isBillDetailGridConfig && !isLeftGridConfig && (
                  <button
                    type="button"
                    onClick={applySuggestedDetailLayout}
                    className="inline-flex h-9 items-center gap-1.5 rounded-[14px] border border-slate-200/80 bg-white/92 px-3 text-[12px] font-bold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/72 dark:text-slate-200"
                  >
                    <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                    推荐布局
                  </button>
                )}
                {isMainGridConfig && !isBillHeadGridConfig && (
                  <button
                    type="button"
                    onClick={() => openDetailBoardPreview(1, currentDetailBoard.sortColumnId)}
                    disabled={!detailBoardReady}
                    className={`inline-flex h-9 items-center gap-1.5 rounded-[14px] px-3 text-[12px] font-bold transition-colors ${
                      detailBoardReady
                        ? 'bg-[color:var(--workspace-accent)] text-white shadow-[0_16px_28px_-22px_rgba(15,23,42,0.24)] hover:bg-[color:var(--workspace-accent-strong)]'
                        : 'cursor-not-allowed bg-slate-100 text-slate-300 dark:bg-slate-800 dark:text-slate-600'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">preview</span>
                    预览详情
                  </button>
                )}
              </div>
            </div>
            {renderInspectorTabs()}
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4">
            {isContextMenuPanelTab && isDocumentArchiveGrid ? (
              renderPopupMenuManagerSection()
            ) : isColorPanelTab && isDocumentArchiveGrid ? (
              renderColorRuleManagerSection()
            ) : isCommonPanelTab ? (
              isBillHeadGridConfig ? (
                <div className="space-y-4">
                  <section className={compactCardClass}>
                    <div className={sectionTitleClass}>
                      <span className="material-symbols-outlined text-[18px] text-[color:var(--workspace-accent)]">dashboard</span>
                      <h4>头部看板</h4>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className={compactInfoCardClass}>
                        <div className="text-[11px] font-bold tracking-[0.08em] text-slate-400">控件数量</div>
                        <div className="mt-1 text-[13px] font-bold text-slate-700 dark:text-slate-100">{availableGridColumns.length} 个</div>
                      </div>
                      <div className={compactInfoCardClass}>
                        <div className="text-[11px] font-bold tracking-[0.08em] text-slate-400">来源表</div>
                        <div className="mt-1 text-[13px] font-bold text-slate-700 dark:text-slate-100">{activeBillSource?.sourceName || '未配置'}</div>
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className={mutedLabelClass}>已配置来源</label>
                        <div className="rounded-[18px] border border-slate-200/80 bg-slate-50/92 px-3.5 py-3 text-[12px] text-slate-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] dark:border-slate-700 dark:bg-slate-900/72 dark:text-slate-200">
                          {billSources.length} 个来源
                          <div className="mt-1 truncate text-[11px] text-slate-400">
                            {billSources.map((item) => item.sourceName || '未命名来源').join(' / ')}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={activateSourceGridSelection}
                          className="inline-flex h-10 items-center gap-1.5 rounded-[14px] bg-[color:var(--workspace-accent)] px-4 text-[12px] font-bold text-white shadow-[0_18px_30px_-24px_var(--workspace-accent-shadow)]"
                        >
                          <span className="material-symbols-outlined text-[16px]">database</span>
                          配置来源表
                        </button>
                      </div>
                    </div>
                  </section>
                  {renderSqlConfigSection()}
                  {renderIdentifierTranslationSection()}
                </div>
              ) : isBillDetailGridConfig ? (
                <div className="space-y-4">
                  <section className={compactCardClass}>
                    <div className={sectionTitleClass}>
                      <span className="material-symbols-outlined text-[18px] text-[color:var(--workspace-accent)]">table_rows</span>
                      <h4>明细表属性</h4>
                    </div>
                    <div className="grid gap-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className={compactInfoCardClass}>
                          <div className="text-[11px] font-bold tracking-[0.08em] text-slate-400">列数量</div>
                          <div className="mt-1 text-[13px] font-bold text-slate-700 dark:text-slate-100">{(detailTableColumns[activeTab] || []).length} 个</div>
                        </div>
                        <div className={compactInfoCardClass}>
                          <div className="text-[11px] font-bold tracking-[0.08em] text-slate-400">表格类型</div>
                          <div className="mt-1 text-[13px] font-bold text-slate-700 dark:text-slate-100">{currentGridConfig.tableType}</div>
                        </div>
                      </div>
                      <div>
                        <label className={mutedLabelClass}>表格类型</label>
                        <select
                          value={currentGridConfig.tableType}
                          onChange={(e) => updateGridConfig({ tableType: e.target.value })}
                          className={fieldClass}
                        >
                          {TABLE_TYPE_OPTIONS.map((type) => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </section>
                  {renderSqlConfigSection()}
                  {renderIdentifierTranslationSection()}
                </div>
              ) : isLeftGridConfig ? (
                <div className="space-y-4">
                  {renderLeftGridMappingSection()}
                  <section className={compactCardClass}>
                    <div className={sectionTitleClass}>
                      <span className="material-symbols-outlined text-[18px] text-[color:var(--workspace-accent)]">table_view</span>
                      <h4>左侧树表属性</h4>
                    </div>
                    <div className="grid gap-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className={compactInfoCardClass}>
                          <div className="text-[11px] font-bold tracking-[0.08em] text-slate-400">列数量</div>
                          <div className="mt-1 text-[13px] font-bold text-slate-700 dark:text-slate-100">{leftTableColumns.length} 个</div>
                        </div>
                        <div className={compactInfoCardClass}>
                          <div className="text-[11px] font-bold tracking-[0.08em] text-slate-400">表格类型</div>
                          <div className="mt-1 text-[13px] font-bold text-slate-700 dark:text-slate-100">{currentGridConfig.tableType}</div>
                        </div>
                        <div className={compactInfoCardClass}>
                          <div className="text-[11px] font-bold tracking-[0.08em] text-slate-400">右键菜单</div>
                          <div className="mt-1 text-[13px] font-bold text-slate-700 dark:text-slate-100">{contextMenuItems.length} 项</div>
                        </div>
                        <div className={compactInfoCardClass}>
                          <div className="text-[11px] font-bold tracking-[0.08em] text-slate-400">颜色规则</div>
                          <div className="mt-1 text-[13px] font-bold text-slate-700 dark:text-slate-100">{enabledColorRuleCount} 条生效</div>
                        </div>
                      </div>
                      <div>
                        <label className={mutedLabelClass}>表格类型</label>
                        <select
                          value={currentGridConfig.tableType}
                          onChange={(e) => updateGridConfig({ tableType: e.target.value })}
                          className={fieldClass}
                        >
                          {TABLE_TYPE_OPTIONS.map((type) => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </section>
                </div>
              ) : (
                <div className="space-y-4">
                  {isDocumentArchiveGrid && renderDocumentTableMappingSection()}
                  {detailGridLegacyTable && renderDetailChartTableMappingSection()}
                  <section className={compactCardClass}>
                    <div className={sectionTitleClass}>
                      <span className="material-symbols-outlined text-[18px] text-[color:var(--workspace-accent)]">
                        {detailGridFillTypeMeta?.icon || 'table_chart'}
                      </span>
                      <h4>{detailGridFillTypeMeta?.value === '图表' ? '图表加载属性' : '主表属性'}</h4>
                    </div>
                    <div className="grid gap-3">
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className={compactInfoCardClass}>
                          <div className="text-[11px] font-bold tracking-[0.08em] text-slate-400">
                            {detailGridFillTypeMeta?.value === '图表' ? '当前填充' : '当前表格'}
                          </div>
                          <div className="mt-1 text-[13px] font-bold text-slate-700 dark:text-slate-100">{selectedColumnContext.title}</div>
                        </div>
                        <div className={compactInfoCardClass}>
                          <div className="text-[11px] font-bold tracking-[0.08em] text-slate-400">右键数量</div>
                          <div className="mt-1 text-[13px] font-bold text-slate-700 dark:text-slate-100">{contextMenuItems.length} 项</div>
                        </div>
                        <div className={compactInfoCardClass}>
                          <div className="text-[11px] font-bold tracking-[0.08em] text-slate-400">颜色规则</div>
                          <div className="mt-1 text-[13px] font-bold text-slate-700 dark:text-slate-100">{enabledColorRuleCount} 条生效</div>
                        </div>
                      </div>
                      <div>
                        <label className={mutedLabelClass}>表格类型</label>
                        <select
                          value={currentGridConfig.tableType}
                          onChange={(e) => updateGridConfig({ tableType: e.target.value })}
                          className={fieldClass}
                        >
                          {TABLE_TYPE_OPTIONS.map((type) => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </section>
                  {renderSqlConfigSection()}
                  {renderIdentifierTranslationSection()}
                </div>
              )
            ) : (
              isBillHeadGridConfig || isBillDetailGridConfig ? (
                <div className="space-y-3">
                  {renderAdvancedPlaceholder('当前模式暂无扩展配置')}
                </div>
              ) : isLeftGridConfig ? (
                <div className="space-y-3">
                  <section className="rounded-[18px] border border-slate-200/75 bg-white/94 p-4 shadow-[0_16px_28px_-24px_rgba(15,23,42,0.16)] dark:border-slate-700 dark:bg-slate-900/55">
                    <div className="flex items-center gap-2 text-[12px] font-bold text-slate-700 dark:text-slate-100">
                      <span className="material-symbols-outlined text-[17px] text-[color:var(--workspace-accent)]">view_stream</span>
                      <h4>左侧布局</h4>
                    </div>
                    <div className="mt-3 rounded-[16px] border border-dashed border-slate-200/80 bg-slate-50/80 px-4 py-6 text-[12px] leading-6 text-slate-500 dark:border-slate-700 dark:bg-slate-900/45 dark:text-slate-300">
                      左侧树表暂不启用详情分组布局。列、条件、右键和颜色请分别在对应页签维护，动态 SQL 直接在所属树形字段的“基础定义”里配置。
                    </div>
                  </section>
                </div>
              ) : (
                <div className="space-y-3">
                <section className="rounded-[18px] border border-slate-200/75 bg-white/94 p-3.5 shadow-[0_16px_28px_-24px_rgba(15,23,42,0.16)] dark:border-slate-700 dark:bg-slate-900/55">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-[12px] font-bold text-slate-700 dark:text-slate-100">
                      <span className="material-symbols-outlined text-[17px] text-[color:var(--workspace-accent)]">view_stream</span>
                      <h4>详情分组布局</h4>
                    </div>
                    <div className="flex items-center gap-2">
                      {detailGroupCount > 0 && (
                        <button
                          type="button"
                          onClick={clearDetailGroups}
                          className="inline-flex h-9 items-center gap-1.5 rounded-[14px] border border-slate-200/80 bg-white px-3 text-[12px] font-bold text-slate-500 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                        >
                          <span className="material-symbols-outlined text-[16px]">layers_clear</span>
                          清空分组
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={addDetailGroup}
                        className="inline-flex h-9 items-center gap-1.5 rounded-[14px] border border-[color:var(--workspace-accent-border)] bg-[color:var(--workspace-accent)] px-3 text-[12px] font-bold text-white transition-colors hover:bg-[color:var(--workspace-accent-strong)]"
                      >
                        <span className="material-symbols-outlined text-[16px]">add</span>
                        新增分组
                      </button>
                    </div>
                  </div>

                  {availableGridColumns.length > 0 ? (
                    currentDetailBoard.groups.length > 0 ? (
                      <div className="space-y-2.5">
                        {currentDetailBoard.groups.map((group: any, groupIndex: number) => (
                          <div key={group.id} className={`overflow-hidden rounded-[20px] border shadow-[0_16px_26px_-24px_rgba(15,23,42,0.12)] ${detailBoardTheme.groupShell}`}>
                            <div className="flex items-center gap-3 border-b border-slate-200/70 px-3.5 py-3 dark:border-slate-700">
                              <input
                                type="text"
                                value={group.name}
                                onChange={(e) => updateDetailGroup(group.id, { name: e.target.value })}
                                placeholder={`分组名 ${groupIndex + 1}`}
                                className="h-10 min-w-0 flex-1 rounded-[14px] border border-slate-200/80 bg-white/92 px-3.5 text-[15px] font-bold tracking-[-0.01em] text-slate-800 outline-none transition focus:border-[color:var(--workspace-accent-border-strong)] focus:ring-4 focus:ring-[color:var(--workspace-accent-soft)] dark:border-slate-700 dark:bg-slate-900/62 dark:text-slate-100"
                              />
                              <button
                                type="button"
                                onClick={() => updateDetailBoard((current: any) => ({
                                  ...current,
                                  groups: current.groups.filter((item: any) => item.id !== group.id),
                                }))}
                                className="inline-flex size-9 shrink-0 items-center justify-center rounded-[14px] border border-rose-100 bg-white text-rose-500 transition-colors hover:bg-rose-50 dark:border-rose-500/20 dark:bg-slate-900/72 dark:hover:bg-rose-500/10"
                                title="删除分组"
                              >
                                <span className="material-symbols-outlined text-[16px]">delete</span>
                              </button>
                            </div>

                            <div className="p-3.5">
                              <section className="rounded-[16px] border border-slate-200/75 bg-white/88 p-3 dark:border-slate-700 dark:bg-slate-900/52">
                                <div
                                  tabIndex={0}
                                  onClick={(event) => event.currentTarget.focus()}
                                  onPaste={(event) => handleDetailGroupPaste(event, group.id)}
                                  className="relative min-h-[112px] rounded-[16px] border border-dashed border-[color:var(--workspace-accent-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(248,250,252,0.96))] p-3 outline-none transition focus:border-[color:var(--workspace-accent-border-strong)] focus:bg-white dark:bg-slate-900/58"
                                >
                                  {detailBoardClipboardIds.length > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => mergeDetailGroupColumns(group.id, detailBoardClipboardIds)}
                                      className="absolute right-3 top-3 inline-flex h-7 items-center gap-1 rounded-full border border-[color:var(--workspace-accent-border)] bg-[color:var(--workspace-accent-soft)] px-2.5 text-[10px] font-bold text-[color:var(--workspace-accent-strong)] transition-colors hover:bg-[color:var(--workspace-accent-tint)]"
                                    >
                                      <span className="material-symbols-outlined text-[13px]">content_paste</span>
                                      粘贴
                                    </button>
                                  )}
                                  {group.columnIds.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                      {group.columnIds.map((columnId: string) => {
                                        const column = availableGridColumns.find((item: any) => item.id === columnId);
                                        if (!column) return null;
                                        const normalizedAvailableColumn = normalizeColumn(column);

                                        return (
                                          <div
                                            key={`${group.id}-${column.id}`}
                                            className="inline-flex h-8 max-w-full items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/92 px-3 shadow-[0_10px_18px_-16px_rgba(15,23,42,0.18)] dark:border-slate-700 dark:bg-slate-900/72"
                                          >
                                            <span className="truncate text-[11px] font-bold text-slate-700 dark:text-slate-100">{column.name}</span>
                                            <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                                              {normalizedAvailableColumn.type}
                                            </span>
                                            <button
                                              type="button"
                                              onClick={() => removeDetailGroupColumn(group.id, column.id)}
                                              className="inline-flex size-5 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                                              title="移出当前分组"
                                            >
                                              <span className="material-symbols-outlined text-[12px]">close</span>
                                            </button>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <div className="flex min-h-[84px] flex-col items-center justify-center text-center">
                                      <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-300">粘贴字段</div>
                                    </div>
                                  )}
                                </div>
                              </section>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-[20px] border border-dashed border-[color:var(--workspace-accent-border-strong)] bg-[color:var(--workspace-accent-tint)] px-5 py-10 text-center">
                        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-white text-[color:var(--workspace-accent)] shadow-[0_18px_30px_-24px_rgba(15,23,42,0.16)]">
                          <span className="material-symbols-outlined text-[22px]">view_stream</span>
                        </div>
                        <div className="mt-4 text-[13px] font-bold text-slate-700 dark:text-slate-100">当前还没有详情分组</div>
                        <button
                          type="button"
                          onClick={addDetailGroup}
                          className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-[14px] border border-[color:var(--workspace-accent-border)] bg-[color:var(--workspace-accent)] px-3 text-[12px] font-bold text-white transition-colors hover:bg-[color:var(--workspace-accent-strong)]"
                        >
                          <span className="material-symbols-outlined text-[16px]">add</span>
                          创建第一个分组
                        </button>
                      </div>
                    )
                  ) : (
                    renderAdvancedPlaceholder('还没有可分组字段')
                  )}
                </section>
              </div>
              )
            )}
          </div>
        </div>
      );
    }

    const isConditionConfig = selectedColumnContext.kind === 'condition';
    const currentColumn = isConditionConfig
      ? normalizeConditionField(selectedColumnContext.column)
      : normalizeColumn(selectedColumnContext.column);
    const isBillHeaderField = businessType === 'table' && selectedColumnContext.scope === 'main' && !isConditionConfig;
    const updateColumn = (patch: Record<string, any>) => {
      selectedColumnContext.setCols((prev) => prev.map((item) => (
        item.id === currentColumn.id ? { ...item, ...patch } : item
      )));
    };

    const removeCurrentColumn = () => {
      if (selectedColumnContext.scope === 'filter') {
        deleteSelectedConditions('main', [currentColumn.id]);
        return;
      }

      if (selectedColumnContext.scope === 'left-filter') {
        deleteSelectedConditions('left', [currentColumn.id]);
        return;
      }

      if (selectedColumnContext.scope === 'detail-filter') {
        deleteSelectedConditions('detail', [currentColumn.id]);
        return;
      }

      if (selectedColumnContext.scope === 'left' || selectedColumnContext.scope === 'main' || selectedColumnContext.scope === 'detail') {
        deleteSelectedColumns(selectedColumnContext.scope, [currentColumn.id]);
        return;
      }

      clearColumnSelection();
    };

    const propertySwitches = isConditionConfig
      ? [
          { key: 'required', label: '必填条件', desc: '查询前必须填写该条件' },
          { key: 'visible', label: '界面显示', desc: '控制是否在顶部条件区展示' },
          { key: 'searchable', label: '参与查询', desc: '启用后参与查询条件拼装' },
          { key: 'readonly', label: '只读预设', desc: '适合系统回填或固定条件' },
        ]
      : [
          { key: 'required', label: '必填字段', desc: '保存前必须输入或选择值' },
          { key: 'visible', label: '界面显示', desc: '控制是否在列表或表单中展示' },
          { key: 'searchable', label: '支持搜索', desc: '可作为筛选检索字段参与查询' },
          { key: 'readonly', label: '只读模式', desc: '用于系统回填或计算型字段' },
        ];
    const availableFieldTypes = isConditionConfig
      ? FIELD_TYPE_OPTIONS.filter((type) => type !== '树形节点关联')
      : FIELD_TYPE_OPTIONS;
    const commonPropertySwitches = propertySwitches.filter((item) => item.key !== 'readonly');
    const advancedPropertySwitches = propertySwitches.filter((item) => item.key === 'readonly');
    const legacyTableMeta = isConditionConfig
      ? selectedColumnContext.scope === 'filter'
        ? {
            table: 'p_systembillsourcecond',
            hint: '主表条件的控件、默认值和联动规则统一落这个条件表。',
          }
        : selectedColumnContext.scope === 'left-filter'
          ? {
              table: 'p_systembillsourcecond',
              hint: '左侧条件也写入 p_systembillsourcecond，并带上所属树形字段的 sourceid 与 formKey。',
            }
        : {
            table: 'p_systembillsourcecond',
            hint: '明细条件也按条件配置表维护，方便后续统一拼装查询条件。',
          }
      : selectedColumnContext.scope === 'left'
        ? {
            table: 'p_systemwordbookgrid',
            hint: '左侧树节点展开后的列配置、显示字段和宽度统一按树表字段配置表维护。',
          }
      : businessType !== 'table'
        ? {
            table: 'p_systemwordbooktab',
            hint: '当前列的名称、标识、交互、联动和展示属性都按字段配置表统一维护。',
          }
        : null;
    const openLongTextEditor = (title: string, value: string, onSave: (nextValue: string) => void, placeholder?: string) => {
      setLongTextEditorState({
        title,
        placeholder,
        draft: value,
        onSave,
      });
    };

    return (
      <div className={panelShellClass}>
        <div className={panelHeaderClass}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <div className={`${panelIconShellClass} ${selectedColumnContext.iconClass}`}>
                <span className="material-symbols-outlined text-[18px]">{selectedColumnContext.icon}</span>
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className={panelTitleClass}>{currentColumn.name}</h3>
                  <span className={panelBadgeClass}>{selectedColumnContext.title}</span>
                  {legacyTableMeta && (
                    <span className="inline-flex items-center rounded-full border border-[#1686e3]/18 bg-[#1686e3]/8 px-2.5 py-1 text-[10px] font-bold text-[#1686e3]">
                      {legacyTableMeta.table}
                    </span>
                  )}
                </div>
                {legacyTableMeta && (
                  <p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-slate-300">{legacyTableMeta.hint}</p>
                )}
              </div>
            </div>
            <button
              onClick={removeCurrentColumn}
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-rose-200/70 bg-white text-rose-400 transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-500 dark:border-rose-500/20 dark:bg-slate-900 dark:text-rose-300"
              title={selectedColumnContext.removeLabel}
            >
              <span className="material-symbols-outlined text-[16px]">delete</span>
            </button>
          </div>
          {renderInspectorTabs()}
        </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className={compactInfoCardClass}>
              <div className="text-[11px] font-bold tracking-[0.08em] text-slate-400">{isConditionConfig ? '条件标识' : '字段标识'}</div>
              <div className="mt-1 break-all font-mono text-[12px] leading-5 text-slate-600 dark:text-slate-200">{currentColumn.sourceField || '未设置'}</div>
            </div>
            <div className={compactInfoCardClass}>
              <div className="text-[11px] font-bold tracking-[0.08em] text-slate-400">当前类型</div>
              <div className="mt-1 break-words text-[13px] font-bold leading-5 text-slate-700 dark:text-slate-100">{currentColumn.type}</div>
            </div>
            <div className={compactInfoCardClass}>
              <div className="text-[11px] font-bold tracking-[0.08em] text-slate-400">当前宽度</div>
              <div className="mt-1 break-words text-[13px] font-bold leading-5 text-slate-700 dark:text-slate-100">{Math.round(currentColumn.width)}px</div>
            </div>
            <div className={compactInfoCardClass}>
              <div className="text-[11px] font-bold tracking-[0.08em] text-slate-400">对齐方式</div>
              <div className="mt-1 break-words text-[13px] font-bold leading-5 text-slate-700 dark:text-slate-100">{currentColumn.align}</div>
            </div>
          </div>

          <div className="mt-5 space-y-5">
            {isCommonPanelTab ? (
              <>
                <section className={compactCardClass}>
                  <div className={sectionTitleClass}>
                    <span className="material-symbols-outlined text-[18px] text-primary">view_list</span>
                    <h4>{isConditionConfig ? '条件定义' : '基础定义'}</h4>
                  </div>
                  <div className="grid gap-4">
                    <div>
                      <label className={mutedLabelClass}>{isConditionConfig ? '条件名称' : '字段名称'}</label>
                      <input
                        type="text"
                        value={currentColumn.name}
                        onChange={(e) => updateColumn({ name: e.target.value })}
                        className={fieldClass}
                      />
                    </div>
                    <div>
                      <label className={mutedLabelClass}>{isConditionConfig ? '条件标识' : '字段标识'}</label>
                      <input
                        type="text"
                        value={currentColumn.sourceField || ''}
                        onChange={(e) => updateColumn({ sourceField: e.target.value })}
                        placeholder={isConditionConfig ? '例如：status_keyword' : '例如：material_code'}
                        className={`${fieldClass} font-mono text-[12px]`}
                      />
                    </div>
                    {!isConditionConfig && (
                      <div>
                        <div className="mb-1.5 flex items-center justify-between gap-3">
                          <label className={`${mutedLabelClass} mb-0`}>动态 SQL</label>
                          <button
                            type="button"
                            onClick={() => openLongTextEditor(
                              `${currentColumn.name || '字段'} · 动态 SQL`,
                              currentColumn.dynamicSql || '',
                              (nextValue) => updateColumn({ dynamicSql: nextValue }),
                              '例如：SELECT node_id, node_name, parent_id FROM ...',
                            )}
                            className="inline-flex h-7 items-center gap-1 rounded-full border border-[color:var(--workspace-accent-border)] bg-[color:var(--workspace-accent-soft)] px-3 text-[10px] font-bold text-[color:var(--workspace-accent-strong)] transition-colors hover:bg-[color:var(--workspace-accent-tint)]"
                          >
                            <span className="material-symbols-outlined text-[13px]">open_in_full</span>
                            详情编辑
                          </button>
                        </div>
                        <textarea
                          rows={4}
                          value={currentColumn.dynamicSql}
                          onChange={(e) => updateColumn({ dynamicSql: e.target.value })}
                          placeholder="例如：SELECT node_id, node_name, parent_id FROM ..."
                          className={`${textareaClass} min-h-[124px]`}
                        />
                      </div>
                    )}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className={mutedLabelClass}>{isConditionConfig ? '控件类型' : '字段类型'}</label>
                        <select
                          value={currentColumn.type}
                          onChange={(e) => updateColumn({ type: e.target.value })}
                          className={fieldClass}
                        >
                          {availableFieldTypes.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={mutedLabelClass}>{isConditionConfig ? '控件宽度 (px)' : isBillHeaderField ? '控件宽度 (px)' : '列宽 (px)'}</label>
                        <input
                          type="number"
                          min={isBillHeaderField ? BILL_FORM_MIN_WIDTH : TABLE_COLUMN_MIN_WIDTH}
                          value={Math.round(currentColumn.width)}
                          onChange={(e) => updateColumn({
                            width: Math.max(
                              isBillHeaderField ? BILL_FORM_MIN_WIDTH : TABLE_COLUMN_MIN_WIDTH,
                              Number(e.target.value) || (isBillHeaderField ? BILL_FORM_MIN_WIDTH : TABLE_COLUMN_MIN_WIDTH),
                            ),
                          })}
                          className={fieldClass}
                        />
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className={mutedLabelClass}>对齐方式</label>
                        <select
                          value={currentColumn.align}
                          onChange={(e) => updateColumn({ align: e.target.value })}
                          className={fieldClass}
                        >
                          {COLUMN_ALIGN_OPTIONS.map((align) => (
                            <option key={align} value={align}>
                              {align}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={mutedLabelClass}>默认值</label>
                        <input
                          type="text"
                          value={currentColumn.defaultValue}
                          onChange={(e) => updateColumn({ defaultValue: e.target.value })}
                          placeholder="例如：默认状态、初始值"
                          className={fieldClass}
                        />
                      </div>
                    </div>
                    <div>
                      <label className={mutedLabelClass}>{isConditionConfig ? '提示文案' : '占位提示'}</label>
                      <input
                        type="text"
                        value={currentColumn.placeholder}
                        onChange={(e) => updateColumn({ placeholder: e.target.value })}
                        placeholder={isConditionConfig ? '用于顶部条件区展示的提示文案' : '用于表单输入提示'}
                        className={fieldClass}
                      />
                    </div>
                    {isBillHeaderField && (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className={mutedLabelClass}>标签宽度</label>
                          <input
                            type="number"
                            min={58}
                            max={128}
                            value={Math.round(currentColumn.labelWidth || BILL_FORM_DEFAULT_LABEL_WIDTH)}
                            onChange={(e) => updateColumn({ labelWidth: Math.max(58, Number(e.target.value) || BILL_FORM_DEFAULT_LABEL_WIDTH) })}
                            className={fieldClass}
                          />
                        </div>
                        <div>
                          <label className={mutedLabelClass}>字号</label>
                          <input
                            type="number"
                            min={11}
                            max={18}
                            value={Math.round(currentColumn.fontSize || BILL_FORM_DEFAULT_FONT_SIZE)}
                            onChange={(e) => updateColumn({ fontSize: Math.max(11, Math.min(18, Number(e.target.value) || BILL_FORM_DEFAULT_FONT_SIZE)) })}
                            className={fieldClass}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                {isBillHeaderField && (
                  <section className={compactCardClass}>
                    <div className={sectionTitleClass}>
                      <span className="material-symbols-outlined text-[18px] text-primary">database</span>
                      <h4>来源绑定</h4>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className={mutedLabelClass}>来源表</label>
                        <div className="flex gap-2">
                          <select
                            value={currentColumn.sourceTable || ''}
                            onChange={(e) => updateColumn({ sourceTable: e.target.value })}
                            className={fieldClass}
                          >
                            <option value="">未绑定</option>
                            {billSources.map((source) => (
                              <option key={source.id} value={source.id}>
                                {source.sourceName || '未命名来源'}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={activateSourceGridSelection}
                            className="inline-flex shrink-0 items-center gap-1 rounded-[14px] border border-[color:var(--workspace-accent-border)] px-3 text-[12px] font-bold text-[color:var(--workspace-accent)]"
                          >
                            <span className="material-symbols-outlined text-[14px]">tune</span>
                            来源
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className={mutedLabelClass}>来源字段</label>
                        <input
                          list={`bill-source-fields-${currentColumn.id}`}
                          value={currentColumn.sourceField || ''}
                          onChange={(e) => updateColumn({ sourceField: e.target.value })}
                          className={fieldClass}
                          placeholder="填写或选择来源字段"
                        />
                        <datalist id={`bill-source-fields-${currentColumn.id}`}>
                          {(billSourceFieldMap[currentColumn.sourceTable || ''] || []).map((fieldName) => (
                            <option key={fieldName} value={fieldName} />
                          ))}
                        </datalist>
                      </div>
                    </div>
                  </section>
                )}

                <section className={compactCardClass}>
                  <div className={sectionTitleClass}>
                    <span className="material-symbols-outlined text-[18px] text-primary">toggle_on</span>
                    <h4>{isConditionConfig ? '条件属性' : '交互属性'}</h4>
                  </div>
                  <div className="grid gap-3">
                    {commonPropertySwitches.map((item) => (
                      <label
                        key={item.key}
                        className="flex items-start gap-3 rounded-2xl border border-slate-200/70 bg-slate-50/70 px-3.5 py-3 cursor-pointer transition-colors hover:border-primary/20 hover:bg-white dark:border-slate-700 dark:bg-slate-900/35 dark:hover:bg-slate-900/55"
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5 rounded border-slate-300 text-primary focus:ring-primary"
                          checked={Boolean(currentColumn[item.key])}
                          onChange={(e) => updateColumn({ [item.key]: e.target.checked })}
                        />
                        <div>
                          <div className="text-[13px] font-bold text-slate-700 dark:text-slate-100">{item.label}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </section>
              </>
            ) : (
              <>
                <section className={compactCardClass}>
                  <div className={sectionTitleClass}>
                    <span className="material-symbols-outlined text-[18px] text-primary">toggle_on</span>
                    <h4>高级属性</h4>
                  </div>
                  <div className="grid gap-3">
                    {advancedPropertySwitches.map((item) => (
                      <label
                        key={item.key}
                        className="flex items-start gap-3 rounded-2xl border border-slate-200/70 bg-slate-50/70 px-3.5 py-3 cursor-pointer transition-colors hover:border-primary/20 hover:bg-white dark:border-slate-700 dark:bg-slate-900/35 dark:hover:bg-slate-900/55"
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5 rounded border-slate-300 text-primary focus:ring-primary"
                          checked={Boolean(currentColumn[item.key])}
                          onChange={(e) => updateColumn({ [item.key]: e.target.checked })}
                        />
                        <div>
                          <div className="text-[13px] font-bold text-slate-700 dark:text-slate-100">{item.label}</div>
                        </div>
                      </label>
                    ))}
                    <div>
                      <label className={mutedLabelClass}>帮助文案</label>
                      <textarea
                        rows={3}
                        value={currentColumn.helpText}
                        onChange={(e) => updateColumn({ helpText: e.target.value })}
                        placeholder="填写字段说明、校验规则或业务提示"
                        className={fieldClass}
                      />
                    </div>
                  </div>
                </section>

                <section className={compactCardClass}>
                  <div className={sectionTitleClass}>
                    <span className="material-symbols-outlined text-[18px] text-primary">hub</span>
                    <h4>{isConditionConfig ? '查询联动' : '业务联动'}</h4>
                  </div>
                  <div className="grid gap-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className={mutedLabelClass}>{isConditionConfig ? '下拉数据 / 值集' : '关联字典 / 值集'}</label>
                        <input
                          type="text"
                          value={currentColumn.dictCode}
                          onChange={(e) => updateColumn({ dictCode: e.target.value })}
                          placeholder={isConditionConfig ? '例如：正常,停用,草稿' : '例如：material_status'}
                          className={fieldClass}
                        />
                      </div>
                      <div>
                        <label className={mutedLabelClass}>{isConditionConfig ? '默认表达式' : '公式 / 计算表达式'}</label>
                        <input
                          type="text"
                          value={currentColumn.formula}
                          onChange={(e) => updateColumn({ formula: e.target.value })}
                          placeholder={isConditionConfig ? '例如：today() / 本月 / 当前组织' : '例如：price * qty'}
                          className={fieldClass}
                        />
                      </div>
                    </div>
                    <div>
                      <label className={mutedLabelClass}>{isConditionConfig ? '条件 SQL / 取数逻辑' : '关联 SQL'}</label>
                      <textarea
                        rows={3}
                        value={currentColumn.relationSql}
                        onChange={(e) => updateColumn({ relationSql: e.target.value })}
                        placeholder={isConditionConfig ? 'SELECT code, name FROM ...' : 'SELECT id, name FROM ... '}
                        className={textareaClass}
                      />
                    </div>
                    {isConditionConfig && (
                      <div>
                        <label className={mutedLabelClass}>联动 SQL / 条件表达式</label>
                        <textarea
                          rows={3}
                          value={currentColumn.dynamicSql}
                          onChange={(e) => updateColumn({ dynamicSql: e.target.value })}
                          placeholder="WHERE org_id = ${orgId} AND enable = 1"
                          className={textareaClass}
                        />
                      </div>
                    )}
                  </div>
                </section>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  const columnOperationPanel = renderColumnOperationPanel();

  const renderDocumentTreePanel = () => {
    if (!treeRelationColumn) return null;
    const ownerFieldKey = normalizeColumn(treeRelationColumn).sourceField || treeRelationColumn.id;

    return (
      <div style={workspaceThemeVars} className="cloudy-glass-panel flex h-full min-h-0 flex-col overflow-hidden rounded-[28px] border border-white/70">
        <div className="min-h-0 flex flex-1 flex-col overflow-hidden">
          {renderDocumentGridToolbar(
            leftTableColumns,
            '左侧树表',
            selectedLeftForDelete.length,
            () => deleteSelectedColumns('left', selectedLeftForDelete),
            () => setLeftTableColumns((prev) => [...prev, buildColumn('tree_col', prev.length + 1, { name: `树字段 ${prev.length + 1}` })]),
            undefined,
            {
              fields: leftFilterFields,
              selectedId: selectedLeftFilterId,
              selectedIds: selectedLeftFiltersForDelete,
              setSelectedIds: setSelectedLeftFiltersForDelete,
              setFields: setLeftFilterFields,
              scope: 'left',
              onActivate: (id) => {
                setSelectedArchiveNodeId('archive-left-filter');
                activateConditionSelection('left', id);
              },
              onAdd: () => {
                const next = buildConditionField(leftFilterFields.length + 1, {
                  name: `左侧条件 ${leftFilterFields.length + 1}`,
                  sourceid: treeRelationColumn.id,
                  formKey: ownerFieldKey,
                });
                setLeftFilterFields((prev) => [...prev, next]);
                setSelectedLeftFiltersForDelete([next.id]);
                setSelectedArchiveNodeId('archive-left-filter');
                activateConditionSelection('left', next.id);
              },
              onDelete: () => deleteSelectedConditions('left', selectedLeftFiltersForDelete),
            },
            {
              active: selectedTableConfigScope === 'left',
              onSelect: () => {
                setSelectedArchiveNodeId('archive-left-grid');
                activateTableConfigSelection('left');
              },
            },
            { hideActionBar: true },
          )}
          <div
            className="scrollbar-none min-h-0 flex-1 overflow-auto bg-white/70 px-3 py-3 outline-none dark:bg-slate-900/88"
            tabIndex={0}
            onPaste={(event) => handlePasteColumns(event, setLeftTableColumns)}
          >
            {renderTableBuilder('left', leftTableColumns, setLeftTableColumns, selectedLeftColId, selectedLeftForDelete, setSelectedLeftForDelete, {
              backgroundSelectable: true,
              tableSelected: selectedTableConfigScope === 'left',
              onSelectTable: () => {
                setSelectedArchiveNodeId('archive-left-grid');
                activateTableConfigSelection('left');
              },
              canvasLabel: '点击配置左侧树表',
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderDocumentGridToolbar = (
    columns: any[],
    title: string,
    selectedCount: number,
    onDelete: () => void,
    onAdd: () => void,
    extraActions?: React.ReactNode,
    filterConfig?: {
      fields: any[];
      selectedId: string | null;
      selectedIds: string[];
      setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
      onActivate: (id: string) => void;
      onAdd: () => void;
      onDelete: () => void;
      setFields: React.Dispatch<React.SetStateAction<any[]>>;
      scope: 'left' | 'main' | 'detail';
    },
    tableConfigAction?: {
      active?: boolean;
      onSelect: () => void;
    },
    options?: {
      hideActionBar?: boolean;
    },
  ) => {
    const filterFields = filterConfig?.fields ?? columns.slice(0, 3);
    const hideLeftFilterQuickActions = filterConfig?.scope === 'left';
    const activeFilterResize = activeResize?.mode === 'filter' && filterFields.some((field) => field.id === activeResize.id)
      ? activeResize
      : null;
    const hideActionBar = options?.hideActionBar ?? false;
    const filterSelectionCount = filterConfig?.selectedIds.length ?? 0;
    const buildFilterSelectionIds = (fieldId: string, append: boolean) => {
      if (!filterConfig) return [];
      if (filterConfig.selectedIds.includes(fieldId)) {
        return filterConfig.selectedIds;
      }
      return append ? Array.from(new Set([...filterConfig.selectedIds, fieldId])) : [fieldId];
    };
    const handleFilterSelect = (fieldId: string, event?: React.MouseEvent | React.KeyboardEvent) => {
      if (!filterConfig) return;
      const allowMulti = Boolean(event && ('ctrlKey' in event) && (event.ctrlKey || event.metaKey));

      setBuilderSelectionContextMenu(null);
      if (allowMulti) {
        filterConfig.setSelectedIds((prev) => (
          prev.includes(fieldId) ? prev.filter((item) => item !== fieldId) : [...prev, fieldId]
        ));
        filterConfig.onActivate(fieldId);
        return;
      }

      filterConfig.setSelectedIds([fieldId]);
      filterConfig.onActivate(fieldId);
    };
    const handleFilterContextMenu = (event: React.MouseEvent<HTMLDivElement>, fieldId: string) => {
      if (!filterConfig) return;
      event.preventDefault();
      event.stopPropagation();

      const nextSelectedIds = buildFilterSelectionIds(fieldId, event.ctrlKey || event.metaKey);
      filterConfig.setSelectedIds(nextSelectedIds);
      filterConfig.onActivate(fieldId);
      setBuilderSelectionContextMenu({
        kind: 'filter',
        scope: filterConfig.scope,
        x: event.clientX,
        y: event.clientY,
        ids: nextSelectedIds,
      });
    };
    const getFilterRowClass = (isActive: boolean, isMarkedForDelete: boolean) => (
      isActive
        ? 'bg-[color:var(--workspace-accent-soft)] shadow-[inset_0_0_0_1px_var(--workspace-accent-border)]'
        : isMarkedForDelete
          ? 'bg-[color:var(--workspace-accent-soft)] shadow-[inset_0_0_0_1px_var(--workspace-accent-border)]'
          : 'bg-transparent hover:bg-slate-50/70 dark:hover:bg-slate-800/35'
    );
    const getFilterNameClass = (isActive: boolean, isMarkedForDelete: boolean, isRequired: boolean) => {
      if (isRequired) {
        return 'text-[color:var(--workspace-accent-strong)]';
      }
      return isActive || isMarkedForDelete ? 'text-[color:var(--workspace-accent)]' : 'text-slate-500 dark:text-slate-300';
    };
    const getFilterPreviewShellClass = (isActive: boolean, isMarkedForDelete: boolean) => (
      isActive
        ? '[&>div]:border-[color:var(--workspace-accent-border-strong)] [&>div]:bg-white [&>div]:shadow-[0_0_0_3px_var(--workspace-accent-soft)] dark:[&>div]:bg-slate-900/88'
        : isMarkedForDelete
          ? '[&>div]:border-[color:var(--workspace-accent-border)] [&>div]:bg-[color:var(--workspace-accent-tint)]'
          : ''
    );
    const isThemeInspectorActive = inspectorTarget.kind === 'workspace-theme';
    const renderThemeSwitcher = filterConfig?.scope === 'main' ? (
      <button
        type="button"
        onClick={openWorkspaceThemeInspector}
        className={`inline-flex h-9 items-center gap-2 rounded-[14px] px-3.5 text-[12px] font-bold text-white transition-all hover:brightness-[1.04] ${
          isThemeInspectorActive
            ? 'bg-[color:var(--workspace-accent)] shadow-[0_0_0_3px_var(--workspace-accent-soft),0_18px_30px_-22px_var(--workspace-accent-shadow)]'
            : 'bg-[color:var(--workspace-accent-strong)] shadow-[0_18px_30px_-22px_var(--workspace-accent-shadow)]'
        }`}
        title="打开右侧主题选择"
      >
        <span className="material-symbols-outlined text-[16px]">palette</span>
        主题
      </button>
    ) : null;

    return (
      <div style={workspaceThemeVars} className="shrink-0">
        <div className="cloudy-glass-toolbar relative px-4 py-3">
          {activeFilterResize && (
            <div className="pointer-events-none absolute right-3 top-2 z-10 inline-flex items-center gap-2 rounded-full border border-[color:var(--workspace-accent-border)] bg-white/96 px-3 py-1 text-[11px] font-bold text-[color:var(--workspace-accent)] shadow-[0_18px_32px_-24px_rgba(15,23,42,0.24)] dark:bg-slate-900/92">
              <span className="material-symbols-outlined text-[13px]">tune</span>
              <span className="max-w-[140px] truncate">{activeFilterResize.label}</span>
              <span className="rounded-full bg-[color:var(--workspace-accent-soft)] px-2 py-0.5">{Math.round(activeFilterResize.width)}px</span>
            </div>
          )}
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                {filterFields.map((field, index) => {
                  const normalizedField = normalizeConditionField(field);
                  const isActive = filterConfig?.selectedId === field.id;
                  const isMarkedForDelete = filterConfig?.selectedIds.includes(field.id) ?? false;
                  const filterWidth = Math.max(198, Math.min(312, (normalizedField.width || 188) + 36));
                  const labelWidth = Math.max(52, Math.min(76, normalizedField.name.length * 13));

                  return (
                    <div
                      key={field.id}
                      role="button"
                      tabIndex={0}
                      onClick={(event) => handleFilterSelect(field.id, event)}
                      onContextMenu={(event) => handleFilterContextMenu(event, field.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          handleFilterSelect(field.id, event);
                        }
                      }}
                    style={{ width: filterWidth, minWidth: filterWidth }}
                    className={`group relative flex h-10 shrink-0 items-center gap-1 rounded-[12px] px-1.5 py-1 transition-all ${getFilterRowClass(isActive, isMarkedForDelete)}`}
                  >
                      <div
                        className={`shrink-0 text-right text-[12px] font-medium tracking-[0.01em] ${getFilterNameClass(isActive, isMarkedForDelete, normalizedField.required)}`}
                        style={{ width: labelWidth }}
                        title={normalizedField.name}
                      >
                        <span className="block truncate">{normalizedField.name}</span>
                      </div>
                      <div className={`min-w-0 flex-1 pr-3 ${getFilterPreviewShellClass(isActive, isMarkedForDelete)}`}>
                        {renderFieldPreview(normalizedField, index, 'filter')}
                      </div>
                      <div
                        className={`absolute right-1 top-1.5 bottom-1.5 flex w-2 cursor-col-resize items-center justify-center transition-opacity ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                        onMouseDown={(event) => startResize(event, field.id, filterFields, filterConfig.setFields, 160, 620, 'filter')}
                        onDoubleClick={(event) => autoFitColumnWidth(event, field.id, filterFields, filterConfig.setFields, 160, 620, 'filter')}
                        title="拖动调整条件宽度，双击可自动适配"
                      >
                        <span className="h-5 w-px rounded-full bg-slate-300/90 transition-colors group-hover:bg-[#1686e3] dark:bg-slate-600 dark:group-hover:bg-[#1686e3]" />
                      </div>
                    </div>
                  );
                })}
                {filterConfig && !hideLeftFilterQuickActions && (
                    <button
                      type="button"
                      onClick={filterConfig.onAdd}
                    className="cloudy-glass-chip inline-flex h-9 shrink-0 items-center justify-center rounded-[14px] border border-[color:var(--workspace-accent-border)] px-3 text-[11px] font-semibold text-[color:var(--workspace-accent)] transition-colors hover:bg-[color:var(--workspace-accent-soft)]"
                  >
                      <span className="material-symbols-outlined text-[15px]">playlist_add</span>
                      条件
                    </button>
                )}
              </div>
            </div>
            <div className="cloudy-glass-chip flex shrink-0 items-center self-center rounded-[18px] border border-[color:var(--workspace-accent-border)] px-2 py-1.5">
              {filterConfig && !hideLeftFilterQuickActions && (
                <button
                  type="button"
                  onClick={filterConfig.onDelete}
                  disabled={filterSelectionCount === 0}
                  className={`inline-flex h-9 items-center justify-center rounded-xl px-3 text-[12px] font-bold transition-colors ${
                    filterSelectionCount > 0
                      ? 'text-slate-600 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800'
                      : 'cursor-not-allowed text-slate-300 dark:text-slate-600'
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px]">delete</span>
                  删除条件{filterSelectionCount > 1 ? ` (${filterSelectionCount})` : ''}
                </button>
              )}
              {renderThemeSwitcher}
            </div>
          </div>
        </div>
        {!hideActionBar && (
          <div className="cloudy-glass-toolbar flex items-center justify-between px-4 py-3">
            <button
              type="button"
              onClick={tableConfigAction?.onSelect}
                className={`cloudy-glass-chip inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[12px] font-bold transition-colors ${
                tableConfigAction?.active
                  ? 'border-[#1686e3] bg-[#eef6ff] text-[#1686e3] dark:border-[#1686e3] dark:bg-primary/10 dark:text-primary'
                  : 'border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-800'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">table_view</span>
              {title}
            </button>
            <div className="flex items-center gap-2">
              {extraActions}
              <button
                onClick={onAdd}
                className="cloudy-glass-chip inline-flex items-center gap-1 rounded border border-[#1686e3] bg-[#1686e3] px-3 py-1.5 text-[12px] font-bold text-white transition-colors hover:bg-[#1176ca]"
              >
                <span className="material-symbols-outlined text-[14px]">add</span>
                新增
              </button>
              <button
                onClick={onDelete}
                disabled={selectedCount === 0}
                className={`cloudy-glass-chip inline-flex items-center gap-1 rounded border px-3 py-1.5 text-[12px] font-bold transition-colors ${
                  selectedCount > 0
                    ? 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
                    : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-300 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-600'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">delete</span>
                删除
              </button>
              <button className="cloudy-glass-chip inline-flex items-center gap-1 rounded border border-slate-300 px-3 py-1.5 text-[12px] font-bold text-slate-600 transition-colors hover:bg-slate-50 dark:text-slate-200">
                <span className="material-symbols-outlined text-[14px]">save</span>
                保存
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderDocumentDetailWorkbench = () => {
    const detailCols = detailTableColumns[activeTab] || [];
    const activeTabName = detailTabs.find((tab) => tab.id === activeTab)?.name || '明细页签';
    const detailBoardTheme = getDetailBoardTheme(workspaceTheme);

    return (
      <div style={workspaceThemeVars} className={`cloudy-glass-panel flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-[28px] border border-white/70 ${detailBoardTheme.tableSurface}`}>
        <div className="cloudy-glass-toolbar px-4 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              {detailTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    activateDetailTabSelection(tab.id);
                    setSelectedArchiveNodeId(`detail-${tab.id}`);
                  }}
                  style={activeTab === tab.id ? activeGlassTabStyle : undefined}
                  className={`cloudy-glass-chip inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-all ${
                    activeTab === tab.id
                      ? 'border-[color:var(--workspace-accent-border-strong)] bg-[color:var(--workspace-accent)] text-white shadow-[0_18px_34px_-24px_var(--workspace-accent-shadow)]'
                      : 'border-white/70 bg-white/72 text-slate-600 hover:border-[color:var(--workspace-accent-border)] hover:bg-white dark:border-white/10 dark:bg-slate-900/50 dark:text-slate-300 dark:hover:border-[color:var(--workspace-accent-border)] dark:hover:bg-slate-900/76'
                  }`}
                >
                  {tab.name}
                  {detailTabs.length > 1 && (
                    <span
                      onClick={(event) => deleteTab(tab.id, event)}
                      className={`material-symbols-outlined text-[14px] ${activeTab === tab.id ? 'text-white/85' : 'text-slate-400'}`}
                    >
                      close
                    </span>
                  )}
                </button>
              ))}
              <button
                onClick={addTab}
                className="cloudy-glass-chip inline-flex items-center gap-1.5 rounded-full border border-[color:var(--workspace-accent-border)] px-3 py-1.5 text-[11px] font-semibold text-[color:var(--workspace-accent)]"
              >
                <span className="material-symbols-outlined text-[14px]">add</span>
                新页签
              </button>
            </div>
          </div>
        </div>
        {currentDetailFillType === '表格' ? (
          <div className="scrollbar-none min-h-0 flex-1 overflow-auto bg-white/35 px-3 py-3 outline-none dark:bg-slate-900/40"
            tabIndex={0}
            onPaste={(e) => {
              const text = e.clipboardData.getData('text');
              if (!text) return;
              const newColNames = text.split(/[\t\n]/).map((s) => s.trim()).filter(Boolean);
              if (newColNames.length > 0) {
                e.preventDefault();
                const newCols = newColNames.map((name, i) => buildColumn('d_col', (detailCols.length || 0) + i + 1, { name }));
                setDetailTableColumns((prev) => ({
                  ...prev,
                  [activeTab]: [...(prev[activeTab] || []), ...newCols],
                }));
              }
            }}
          >
            {renderTableBuilder(
              'detail',
              detailCols,
              (newCols) => setDetailTableColumns((prev) => ({
                ...prev,
                [activeTab]: typeof newCols === 'function' ? newCols(prev[activeTab] || []) : newCols,
              })),
              selectedDetailColId,
              selectedDetailForDelete,
              setSelectedDetailForDelete,
              {
                contextMenuScope: 'detail',
                contextMenuConfig: {
                  enabled: Boolean(detailTableConfigs[activeTab]?.contextMenuEnabled),
                  items: detailTableConfigs[activeTab]?.contextMenuItems ?? [],
                },
                backgroundSelectable: true,
                tableSelected: selectedTableConfigScope === 'detail',
                onSelectTable: () => {
                  setSelectedArchiveNodeId(`detail-${activeTab}`);
                  activateTableConfigSelection('detail');
                },
                detailBoardConfig: detailTableConfigs[activeTab]?.detailBoard,
                canvasLabel: '点击配置明细表属性',
              },
            )}
          </div>
        ) : (
          <div className="min-h-0 flex-1 bg-white/35 p-4 dark:bg-slate-900/40">
            {renderDetailFillPlaceholder()}
          </div>
        )}
        <div className="cloudy-glass-toolbar shrink-0 px-4 py-3.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-[12px] font-bold text-slate-400">明细填充方式</div>
            <div className="flex flex-wrap items-center gap-2">
              {DETAIL_FILL_TYPE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setTabFillTypes((prev) => ({ ...prev, [activeTab]: option.value }))}
                  className={`cloudy-glass-chip inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[12px] font-bold transition-all ${
                    currentDetailFillType === option.value
                      ? 'border-[color:var(--workspace-accent-border-strong)] bg-[color:var(--workspace-accent-soft)] text-[color:var(--workspace-accent-strong)] shadow-[0_14px_24px_-20px_rgba(15,23,42,0.18)] dark:border-[color:var(--workspace-accent-border)] dark:bg-primary/10'
                      : 'text-slate-500 hover:border-slate-300 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">{option.icon}</span>
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderPreviewContextMenu = () => {
    if (!previewContextMenu) return null;
    const enabledCount = previewContextMenu.items.filter((item: any) => !item.disabled && !item.disabledCondition).length;

    return (
      <div
        className="fixed inset-0 z-[75] bg-slate-950/8 backdrop-blur-[1.5px]"
        onClick={() => setPreviewContextMenu(null)}
      >
        <div
          className="absolute min-w-[284px] overflow-hidden rounded-[24px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,249,253,0.99))] p-2.5 shadow-[0_36px_90px_-30px_rgba(15,23,42,0.56)] backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/96"
          style={{
            left: Math.min(previewContextMenu.x, window.innerWidth - 308),
            top: Math.min(previewContextMenu.y, window.innerHeight - 280),
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="overflow-hidden rounded-[20px] border border-slate-200/70 bg-white/84 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] dark:border-slate-700 dark:bg-slate-900/70">
            <div className="border-b border-slate-200/70 px-4 py-3 dark:border-slate-700">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex size-10 items-center justify-center rounded-2xl bg-[#1686e3]/10 text-[#1686e3]">
                    <span className="material-symbols-outlined text-[18px]">right_click</span>
                  </div>
                  <div>
                    <div className="text-[13px] font-bold text-slate-800 dark:text-slate-100">
                      {previewContextMenu.scope === 'main' ? '主表右键菜单' : '明细右键菜单'}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-400">第 {previewContextMenu.rowId} 行 · {enabledCount} 个可用操作</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewContextMenu(null)}
                  className="inline-flex size-8 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>
            </div>
            <div className="px-2 py-2">
              {previewContextMenu.items.map((item: any) => {
                const isDisabled = Boolean(item.disabled) || Boolean(item.disabledCondition);

                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => {
                      if (isDisabled) return;
                      showToast(`已触发右键动作：${item.label}`);
                      setPreviewContextMenu(null);
                    }}
                    className={`flex w-full items-center gap-3 rounded-[16px] border border-transparent px-3 py-3 text-left transition-all ${
                      isDisabled
                        ? 'cursor-not-allowed opacity-55'
                        : 'hover:border-[#cfe4fd] hover:bg-[#eef6ff] hover:shadow-[0_14px_24px_-22px_rgba(22,134,227,0.55)] dark:hover:border-slate-700 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className={`flex size-9 shrink-0 items-center justify-center rounded-2xl ${
                      isDisabled ? 'bg-slate-100 text-slate-300 dark:bg-slate-800 dark:text-slate-600' : 'bg-[#1686e3]/10 text-[#1686e3]'
                    }`}>
                      <span className="material-symbols-outlined text-[16px]">{isDisabled ? 'block' : 'subdirectory_arrow_right'}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className={`truncate text-[12px] font-bold ${
                        isDisabled ? 'text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-100'
                      }`}>
                        {item.label || '未命名菜单'}
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="truncate rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                          {item.actionKey || '未配置动作'}
                        </span>
                        {isDisabled && (
                          <span className="truncate text-[10px] text-rose-400">
                            禁用: {item.disabledCondition || '手动禁用'}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderBuilderSelectionContextMenu = () => {
    if (!builderSelectionContextMenu) return null;

    const count = builderSelectionContextMenu.ids.length;
    const isColumnMenu = builderSelectionContextMenu.kind === 'column';
    const scopeLabel = isColumnMenu
      ? builderSelectionContextMenu.scope === 'left'
        ? '左侧列'
        : builderSelectionContextMenu.scope === 'detail'
          ? '明细列'
          : '主表列'
      : builderSelectionContextMenu.scope === 'left'
        ? '左侧条件'
        : builderSelectionContextMenu.scope === 'detail'
          ? '明细条件'
          : '查询条件';
    const title = isColumnMenu ? '字段批量操作' : '条件批量操作';
    const description = `${scopeLabel} · 已选 ${count} 项`;
    const deleteLabel = isColumnMenu ? `删除所选列${count > 1 ? ` (${count})` : ''}` : `删除所选条件${count > 1 ? ` (${count})` : ''}`;
    const handleDelete = () => {
      if (isColumnMenu) {
        deleteSelectedColumns(builderSelectionContextMenu.scope, builderSelectionContextMenu.ids);
        return;
      }

      deleteSelectedConditions(builderSelectionContextMenu.scope, builderSelectionContextMenu.ids);
    };

    return (
      <div
        className="fixed inset-0 z-[76]"
        onClick={() => setBuilderSelectionContextMenu(null)}
      >
        <div
          className="absolute min-w-[248px] overflow-hidden rounded-[22px] border border-white/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.985),rgba(246,250,255,0.99))] p-2 shadow-[0_30px_72px_-28px_rgba(15,23,42,0.36)] backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/96"
          style={{
            left: Math.min(builderSelectionContextMenu.x, window.innerWidth - 268),
            top: Math.min(builderSelectionContextMenu.y, window.innerHeight - 180),
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="overflow-hidden rounded-[18px] border border-slate-200/70 bg-white/92 dark:border-slate-700 dark:bg-slate-900/72">
            <div className="border-b border-slate-200/70 px-4 py-3 dark:border-slate-700">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex size-9 items-center justify-center rounded-2xl bg-[#1686e3]/10 text-[#1686e3]">
                    <span className="material-symbols-outlined text-[17px]">select_check_box</span>
                  </div>
                  <div>
                    <div className="text-[13px] font-bold text-slate-800 dark:text-slate-100">{title}</div>
                    <div className="mt-1 text-[11px] text-slate-400">{description}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setBuilderSelectionContextMenu(null)}
                  className="inline-flex size-8 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>
            </div>
            <div className="p-2">
              <button
                type="button"
                onClick={handleDelete}
                className="flex w-full items-center gap-3 rounded-[16px] border border-transparent px-3 py-3 text-left transition-all hover:border-rose-200 hover:bg-rose-50 hover:shadow-[0_16px_28px_-24px_rgba(244,63,94,0.35)] dark:hover:border-rose-400/20 dark:hover:bg-rose-500/10"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500">
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12px] font-bold text-slate-700 dark:text-slate-100">{deleteLabel}</div>
                  <div className="mt-1 text-[10px] text-slate-400">右键删除当前多选内容</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderLongTextEditorModal = () => {
    if (!longTextEditorState) return null;

    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[78] flex items-center justify-center bg-slate-950/40 p-6 backdrop-blur-sm"
          onClick={() => setLongTextEditorState(null)}
        >
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-[28px] border border-white/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,250,255,0.99))] shadow-[0_40px_96px_-32px_rgba(15,23,42,0.42)] dark:border-slate-700 dark:bg-slate-900/96"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200/70 px-5 py-4 dark:border-slate-700">
              <div className="min-w-0">
                <div className="text-[15px] font-bold text-slate-800 dark:text-slate-100">{longTextEditorState.title}</div>
                <div className="mt-1 text-[12px] text-slate-400">长内容直接在这里编辑，保存后会回写到当前配置项。</div>
              </div>
              <button
                type="button"
                onClick={() => setLongTextEditorState(null)}
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-2xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
            <div className="min-h-0 flex-1 px-5 py-4">
              <textarea
                rows={20}
                value={longTextEditorState.draft}
                onChange={(event) => setLongTextEditorState((prev) => (prev ? { ...prev, draft: event.target.value } : prev))}
                placeholder={longTextEditorState.placeholder}
                className="h-full min-h-[420px] w-full resize-none rounded-[22px] border border-slate-200/80 bg-white/94 px-4 py-3 font-mono text-[12px] leading-6 text-slate-700 outline-none transition focus:border-[color:var(--workspace-accent-border-strong)] focus:ring-4 focus:ring-[color:var(--workspace-accent-soft)] dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100"
              />
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-slate-200/70 px-5 py-4 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setLongTextEditorState(null)}
                className="inline-flex h-10 items-center justify-center rounded-[14px] border border-slate-200/80 bg-white px-4 text-[12px] font-bold text-slate-500 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  longTextEditorState.onSave(longTextEditorState.draft);
                  setLongTextEditorState(null);
                }}
                className="inline-flex h-10 items-center justify-center rounded-[14px] bg-[color:var(--workspace-accent)] px-4 text-[12px] font-bold text-white shadow-[0_18px_30px_-24px_var(--workspace-accent-shadow)] transition-colors hover:bg-[color:var(--workspace-accent-strong)]"
              >
                保存内容
              </button>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  };

  const renderDetailBoardModal = () => {
    if (!isDetailBoardOpen) return null;

    const detailBoardConfig = normalizeDetailBoardConfig(mainTableConfig.detailBoard, mainTableColumns);
    const detailBoardTheme = getDetailBoardTheme(workspaceTheme);
    const sortColumnId = detailBoardSortColumnId || detailBoardConfig.sortColumnId || mainTableColumns[0]?.id || null;
    const detailGroups = detailBoardConfig.groups
      .map((group: any) => ({
        ...group,
        columns: group.columnIds
          .map((columnId: string) => mainTableColumns.find((column) => column.id === columnId))
          .filter(Boolean),
      }))
      .filter((group: any) => group.columns.length > 0);
    const panelGroups = detailGroups;

    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/35 p-6 backdrop-blur-sm"
          onClick={() => setIsDetailBoardOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.22 }}
          onClick={(event) => event.stopPropagation()}
          style={workspaceThemeVars}
          className="flex h-[84vh] w-full max-w-[1160px] flex-col overflow-hidden rounded-[34px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.995),rgba(245,248,252,0.985))] shadow-[0_60px_140px_-52px_rgba(15,23,42,0.68)] dark:border-slate-700 dark:bg-slate-900"
        >
            <div className={`border-b border-slate-200 px-6 py-4 dark:border-slate-700 ${detailBoardTheme.hero}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-2xl border border-white/70 bg-white/82 text-[color:var(--workspace-accent)] shadow-[0_16px_28px_-24px_rgba(15,23,42,0.24)] dark:border-white/10 dark:bg-slate-900/58">
                      <span className="material-symbols-outlined text-[18px]">view_stream</span>
                    </div>
                    <div className="min-w-0">
                      <div className="text-[17px] font-bold tracking-[-0.02em] text-slate-900 dark:text-white">详情布局预览</div>
                      <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-300">
                        {activeDetailBoardResize
                          ? `${activeDetailBoardResize.label} ${Math.round(activeDetailBoardResize.width)}px`
                          : '拖动字段右侧分隔线可调宽度，双击可恢复自动排布'}
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setIsDetailBoardOpen(false)}
                  className="inline-flex size-11 items-center justify-center rounded-[18px] border border-white/75 bg-white/80 text-slate-500 transition-colors hover:bg-white dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-300"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
            </div>

            <div className="scrollbar-none min-h-0 flex-1 overflow-auto bg-[linear-gradient(180deg,rgba(250,252,255,0.98),rgba(244,247,251,0.96))] dark:bg-slate-900">
              <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-4 px-6 py-5">
                {panelGroups.length === 0 ? (
                  <section className={`rounded-[24px] border border-dashed px-6 py-12 text-center ${detailBoardTheme.groupShell}`}>
                    <div className="mx-auto flex size-14 items-center justify-center rounded-3xl bg-white text-[color:var(--workspace-accent)] shadow-[0_18px_30px_-24px_rgba(15,23,42,0.16)]">
                      <span className="material-symbols-outlined text-[24px]">view_stream</span>
                    </div>
                    <div className="mt-4 text-[15px] font-bold text-slate-800 dark:text-slate-100">还没有详情分组</div>
                  </section>
                ) : panelGroups.map((group: any) => {
                  const orderedColumns = [...group.columns].sort((left: any, right: any) => {
                    if (left.id === sortColumnId) return -1;
                    if (right.id === sortColumnId) return 1;
                    return 0;
                  });
                  const columnsPerRow = Math.max(1, Math.min(4, Number(group.columnsPerRow) || 2));
                  const groupGap = 12;

                  return (
                    <section
                      key={group.id}
                      className={`overflow-hidden rounded-[26px] border shadow-[0_24px_44px_-36px_rgba(15,23,42,0.16)] ${detailBoardTheme.groupShell}`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 px-5 py-4 dark:border-slate-700">
                        <div className="min-w-0">
                          <div className="text-[15px] font-bold text-slate-800 dark:text-slate-100">{group.name}</div>
                        </div>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold ${detailBoardTheme.groupLabel}`}>
                          {orderedColumns.length} 项
                        </span>
                      </div>
                      <div className="px-5 py-4">
                        <div className="flex flex-wrap gap-3">
                        {orderedColumns.map((column: any, columnIndex: number) => {
                          const normalizedColumn = normalizeColumn(column);
                          const labelWidth = Math.max(54, Math.min(82, normalizedColumn.name.length * 12));
                          const customWidth = Number(group.columnWidths?.[column.id]) > 0 ? Number(group.columnWidths[column.id]) : null;
                          const defaultWidth = columnsPerRow === 1
                            ? '100%'
                            : `calc((100% - ${(columnsPerRow - 1) * groupGap}px) / ${columnsPerRow})`;

                          return (
                            <div
                              key={column.id}
                              data-detail-field-item="true"
                              style={{ width: customWidth ? `${customWidth}px` : defaultWidth, maxWidth: '100%' }}
                              className="group relative min-w-0"
                            >
                              <div className="flex min-w-0 items-center gap-2 rounded-[14px] px-1 py-1.5">
                                <div
                                  className={`shrink-0 text-right text-[12px] font-semibold ${normalizedColumn.required ? 'text-[color:var(--workspace-accent-strong)]' : 'text-slate-600 dark:text-slate-200'}`}
                                  style={{ width: labelWidth }}
                                >
                                  <span className="block truncate">{normalizedColumn.name}</span>
                                </div>
                                <div className="min-w-0 flex-1 pr-4">{renderFieldPreview(normalizedColumn, columnIndex, 'filter')}</div>
                                <button
                                  type="button"
                                  onMouseDown={(event) => startDetailBoardFieldResize(event, group.id, column.id, normalizedColumn.name)}
                                  onDoubleClick={(event) => resetDetailBoardFieldWidth(event, group.id, column.id)}
                                  className="absolute bottom-1.5 right-0 top-1.5 flex w-3 items-center justify-center opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
                                  title="拖动调整宽度，双击恢复自动排布"
                                >
                                  <span className="h-5 w-px rounded-full bg-slate-300/90 transition-colors group-hover:bg-[color:var(--workspace-accent)] dark:bg-slate-600" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                        </div>
                      </div>
                    </section>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0">
        {/* Brand Logo */}
        <div className="p-6 flex items-center gap-3">
          <div className="size-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
            <span className="material-symbols-outlined text-2xl">rocket_launch</span>
          </div>
          <div className="flex flex-col">
            <h1 className="text-slate-900 dark:text-white text-lg font-bold leading-tight tracking-tight">朗速 AI</h1>
            <p className="text-primary text-[10px] font-bold tracking-wider">模块工作台</p>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
          <a className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" href="#">
            <span className="material-symbols-outlined text-xl">dashboard</span>
            <span className="text-sm font-medium">控制台</span>
          </a>

          {/* Expanded Subsystem Section */}
          <div className="space-y-1 pt-2">
            <button 
              onClick={() => setIsSubsystemOpen(!isSubsystemOpen)}
              className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-primary/10 text-primary transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-xl">account_tree</span>
                <span className="text-sm font-bold">子系统配置</span>
              </div>
              <motion.span 
                animate={{ rotate: isSubsystemOpen ? 180 : 0 }}
                className="material-symbols-outlined text-sm"
              >
                keyboard_arrow_down
              </motion.span>
            </button>

            <AnimatePresence>
              {isSubsystemOpen && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="ml-4 pl-4 border-l border-slate-200 dark:border-slate-800 space-y-1 overflow-hidden"
                >
                  {menuLoadError ? (
                    <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-600">
                      <div>{menuLoadError}</div>
                      <button
                        type="button"
                        onClick={() => void loadSubsystemMenus()}
                        className="mt-2 font-semibold text-rose-700 transition-colors hover:text-rose-800"
                      >
                        重新加载
                      </button>
                    </div>
                  ) : null}

                  <div className="ml-2 mt-2 space-y-1">
                    {subsystemMenus.map((subsystem) => {
                      const isExpanded = expandedSubsystemId === subsystem.id;
                      const subsystemFirstLevelMenus = getEnabledMenuNodes(subsystem.children);
                      const isCurrentSubsystem = activeSubsystem === subsystem.id;

                      return (
                        <div key={subsystem.id} className="space-y-1">
                          <button
                            onClick={() => toggleSubsystemExpansion(subsystem.id)}
                            className={`w-full flex items-center justify-between gap-3 rounded-lg px-3 py-2 transition-colors ${
                              isCurrentSubsystem || isExpanded
                                ? 'bg-primary/5 text-primary'
                                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <span className="material-symbols-outlined text-lg">account_tree</span>
                              <span className="truncate text-sm font-semibold">{normalizeMenuTitle(subsystem.title)}</span>
                            </div>
                            <span className="material-symbols-outlined text-base">
                              {isExpanded ? 'expand_more' : 'chevron_right'}
                            </span>
                          </button>

                          {isExpanded ? (
                            <div className="ml-4 space-y-1 border-l border-slate-200 pl-3 dark:border-slate-800">
                              {subsystemFirstLevelMenus.length > 0 ? (
                                subsystemFirstLevelMenus.map((menu) => {
                                  const isFirstLevelActive =
                                    activeSubsystem === subsystem.id && activeFirstLevelMenuId === menu.id;

                                  return (
                                    <button
                                      key={menu.id}
                                      onClick={() => handleFirstLevelMenuClick(subsystem.id, menu)}
                                      className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                                        isFirstLevelActive
                                          ? 'bg-primary text-white shadow-sm'
                                          : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                                      }`}
                                    >
                                      <span className="material-symbols-outlined text-base">folder_open</span>
                                      <span className="truncate text-sm font-medium">{normalizeMenuTitle(menu.title)}</span>
                                    </button>
                                  );
                                })
                              ) : (
                                <div className="px-3 py-2 text-xs text-slate-400">当前子系统下暂无一级菜单</div>
                              )}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}

                    {isLoadingSubsystemMenus ? (
                      <div className="px-3 py-2 text-xs text-slate-400">正在加载子系统菜单...</div>
                    ) : null}

                    {!isLoadingSubsystemMenus && subsystemMenus.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-slate-400">暂无子系统菜单</div>
                    ) : null}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="pt-2 space-y-1">
            <a className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" href="#">
              <span className="material-symbols-outlined text-xl">schema</span>
              <span className="text-sm font-medium">表单流程</span>
            </a>
            <a className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" href="#">
              <span className="material-symbols-outlined text-xl">smart_toy</span>
              <span className="text-sm font-medium">AI 生成</span>
            </a>
            <a className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" href="#">
              <span className="material-symbols-outlined text-xl">menu_book</span>
              <span className="text-sm font-medium">知识中心</span>
            </a>
          </div>
        </nav>

        {/* User Info */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 relative">
          <button 
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <div className="flex min-w-0 items-center gap-3 text-left">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-white bg-[linear-gradient(135deg,#eff6ff,#dbeafe)] text-sm font-black text-primary shadow-sm dark:border-slate-700 dark:bg-[linear-gradient(135deg,#1e293b,#334155)] dark:text-sky-200">
                {currentUserAvatarText}
              </div>
              <span className="block truncate text-sm font-bold text-slate-900 dark:text-white">{currentUserName}</span>
            </div>
            <span className="material-symbols-outlined text-slate-400 text-sm">more_vert</span>
          </button>

          <AnimatePresence>
            {isProfileOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute bottom-full left-4 right-4 mb-2 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden z-50"
              >
                <button 
                  onClick={onLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">logout</span>
                  <span className="font-medium">退出登录</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden bg-background-light dark:bg-background-dark">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-8 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 z-10 shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">模块配置工作台</h2>
            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-2"></div>
            <nav className="flex items-center gap-2 text-[13px] text-slate-500">
              <span className="hover:text-primary transition-colors cursor-pointer">
                {activeSubsystemName}
              </span>
              {activeFirstLevelMenuName ? (
                <>
                  <span className="material-symbols-outlined text-[16px] text-slate-400">chevron_right</span>
                  <span className="text-slate-900 dark:text-slate-200 font-semibold tracking-tight">
                    {activeFirstLevelMenuName}
                  </span>
                </>
              ) : null}
            </nav>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative group">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg transition-colors group-focus-within:text-primary">search</span>
              <input className="pl-10 pr-4 py-2 bg-slate-100/50 dark:bg-slate-800/50 border border-transparent focus:border-primary/30 focus:bg-white dark:focus:bg-slate-800 rounded-lg text-sm w-72 transition-all outline-none" placeholder="搜索模块名称、编码或状态..." type="text" />
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 text-slate-500 hover:text-primary transition-colors relative">
                <span className="material-symbols-outlined text-[22px]">notifications</span>
                <span className="absolute top-2 right-2 size-2 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900"></span>
              </button>
              <button className="p-2 text-slate-500 hover:text-primary transition-colors">
                <span className="material-symbols-outlined text-[22px]">settings</span>
              </button>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="flex-1 overflow-y-auto p-8 lg:p-10 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeMenu}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="h-full flex flex-col"
            >
              {/* Top Section */}
              <div className="flex justify-between items-start mb-10 shrink-0">
                <div className="space-y-2">
                  <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    {activeMenuName} <span className="text-primary/40 ml-1 text-2xl">/</span> <span className="text-slate-400 font-medium text-lg">{activeMenuCode}</span>
                  </h3>
                  <p className="text-slate-500 text-sm max-w-2xl leading-relaxed">
                    管理{activeSubsystemName}子系统下的{activeMenuName}相关业务模块。在这里您可以进行精细化核算配置、数据模型定义以及 AI 增强逻辑的导入。
                  </p>
                </div>
                <button onClick={openNewModuleGuide} className="flex items-center gap-2 px-6 py-3 bg-primary text-white font-bold rounded-xl shadow-xl shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0 transition-all">
                  <span className="material-symbols-outlined text-xl">add</span>
                  <span>新增业务模块</span>
                </button>
              </div>

              {/* Grid of Module Cards */}
              <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                {isLoadingSecondLevelMenus ? (
                  <div className="col-span-full flex min-h-[280px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/60 px-8 py-12 text-center text-slate-400 dark:border-slate-800 dark:bg-slate-900/40">
                    正在加载二级菜单明细...
                  </div>
                ) : secondLevelMenuCount > 0 ? (
                  secondLevelMenus.map((menu, index) => {
                    const cardStyle = secondLevelMenuCardStyles[index % secondLevelMenuCardStyles.length];
                    const isDeletingMenu = deletingMenuId === menu.id;
                    const isMenuEnabled = isUseflagEnabled(menu.useflag, menu.enabled);
                    const menuCodeLabel = normalizeMenuCode(menu.code) || `${activeMenuCodePrefix}-${index + 1}`;
                    const menuStructLabel = normalizeMenuCode(menu.menuStruct) || '未配置';
                    const purviewLabel = normalizeMenuCode(menu.purviewId) || '未配置';
                    const moduleTypeProfile = getMenuModuleTypeProfile(menu.moduleType);
                    const moduleTypeLabel = moduleTypeProfile?.label ?? '未定义类型';
                    const moduleTypeBadgeClass =
                      moduleTypeProfile?.badgeClass ??
                      'border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300';
                    const moduleTypeIcon = moduleTypeProfile?.icon ?? 'category';
                    const statusBadgeClass = isMenuEnabled
                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50'
                      : 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400 border-amber-100 dark:border-amber-900/50';
                    const statusDotClass = isMenuEnabled ? 'bg-emerald-500' : 'bg-amber-500';
                    const statusText = isMenuEnabled ? '已启用' : '已禁用';

                    return (
                      <div
                        key={menu.id}
                        className="group relative flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900 dark:hover:shadow-black/50"
                      >
                        <div className="flex items-start justify-between p-6 pb-0">
                          <div className={`size-14 rounded-2xl border flex items-center justify-center transition-all duration-300 ${cardStyle.iconClass}`}>
                            <span className="material-symbols-outlined text-3xl">{cardStyle.icon}</span>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <div className={`flex items-center gap-2 rounded-full border px-2.5 py-1 ${statusBadgeClass}`}>
                              <span className={`status-dot ${statusDotClass}`}></span>
                              <span className="text-[11px] font-bold uppercase tracking-wide">
                                {statusText}
                              </span>
                            </div>
                            <div className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${moduleTypeBadgeClass}`}>
                              <span className="material-symbols-outlined text-[14px]">{moduleTypeIcon}</span>
                              <span className="text-[11px] font-semibold tracking-wide">{moduleTypeLabel}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex-1 p-6 pt-5">
                          <h4 className="mb-1 text-lg font-bold tracking-tight text-slate-900 transition-colors group-hover:text-primary dark:text-white">
                            {normalizeMenuTitle(menu.title)}
                          </h4>
                          <div className="mb-4 flex items-center gap-2">
                            <code className="rounded border border-slate-200/50 bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                              {menuCodeLabel}
                            </code>
                          </div>
                          <p className="line-clamp-3 text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
                            隶属 {activeSubsystemName} / {activeMenuName}，菜单结构 {menuStructLabel}，权限标识 {purviewLabel}。
                          </p>
                        </div>
                        <div className="flex items-center justify-between rounded-b-2xl border-t border-slate-100 bg-slate-50/50 px-6 py-4 dark:border-slate-800 dark:bg-slate-800/30">
                          <div className="flex gap-4">
                            <button
                              onClick={() => handleSecondLevelMenuConfig(menu)}
                              disabled={isDeletingMenu}
                              className={`flex items-center gap-1.5 text-[13px] font-bold text-slate-500 transition-colors ${cardStyle.actionClass}`}
                            >
                              <span className="material-symbols-outlined text-[18px]">tune</span>
                              配置
                            </button>
                            <button
                              type="button"
                              disabled={isDeletingMenu}
                              onClick={() => setPendingDeleteMenu(menu)}
                              className={`flex items-center gap-1.5 text-[13px] font-bold transition-colors ${
                                isDeletingMenu
                                  ? 'cursor-not-allowed text-rose-300 dark:text-rose-800'
                                  : 'text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300'
                              }`}
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                              {isDeletingMenu ? '删除中...' : '删除'}
                            </button>
                          </div>
                          <button className={`size-8 rounded-lg border border-transparent text-slate-400 transition-all flex items-center justify-center hover:bg-white dark:hover:bg-slate-700 hover:border-slate-200 dark:hover:border-slate-600 ${cardStyle.actionClass}`}>
                            <span className="material-symbols-outlined text-lg">more_horiz</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="col-span-full flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/50 px-8 py-12 text-center dark:border-slate-800 dark:bg-slate-900/40">
                    <div className="mb-5 flex size-16 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
                      <span className="material-symbols-outlined text-4xl">view_module</span>
                    </div>
                    <div className="text-lg font-bold text-slate-900 dark:text-white">暂无二级菜单卡片</div>
                    <p className="mt-2 max-w-md text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
                      {activeFirstLevelMenuName
                        ? `当前一级菜单「${activeFirstLevelMenuName}」下还没有返回二级菜单数据。`
                        : '请先从左侧选择一级菜单，右侧会加载对应的二级菜单明细卡片。'}
                    </p>
                  </div>
                )}

                <button onClick={openNewModuleGuide} className="group relative rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-8 flex flex-col items-center justify-center bg-white/40 dark:bg-slate-900/40 hover:bg-primary/5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 min-h-[320px]">
                  <div className="size-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-6 group-hover:bg-primary group-hover:scale-110 transition-all duration-300 shadow-inner">
                    <span className="material-symbols-outlined text-4xl text-slate-400 group-hover:text-white transition-colors">add</span>
                  </div>
                  <div className="text-center">
                    <h5 className="text-base font-bold text-slate-900 dark:text-white mb-2 group-hover:text-primary transition-colors">新增业务模块</h5>
                    <p className="text-[13px] text-slate-500 max-w-[180px] leading-relaxed">基于 AI 模型快速生成，或手动配置新的业务单元。</p>
                  </div>
                  <div className="mt-8 flex gap-2">
                    <span className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded text-[11px] font-medium text-slate-400 group-hover:text-slate-600 transition-colors">快速配置</span>
                    <span className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded text-[11px] font-medium text-slate-400 group-hover:text-slate-600 transition-colors">AI 生成</span>
                  </div>
                </button>
              </div>

              {/* Footer / Status Summary */}
              <div className="mt-auto pt-8 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-sm text-slate-500">
                <div className="flex items-center gap-6">
                  <p>展示 <span className="font-bold text-slate-900 dark:text-white">{secondLevelMenuCount}</span> 个菜单明细卡片</p>
                  <div className="flex items-center gap-4 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                    <div className="flex items-center gap-1.5"><span className="status-dot bg-emerald-500"></span> {secondLevelMenuCount} 已加载</div>
                    {isLoadingSecondLevelMenus ? (
                      <div className="flex items-center gap-1.5"><span className="status-dot bg-amber-500"></span> 同步中</div>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-4 py-2 text-[12px] font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300">
                  <span className="material-symbols-outlined text-[16px] text-primary">folder_managed</span>
                  {activeSubsystemName}
                  {activeFirstLevelMenuName ? ` / ${activeFirstLevelMenuName}` : ''}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {renderDeleteConfirmModal()}

      {/* Full-screen Config Modal */}
      <AnimatePresence>
        {isConfigOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-background-light dark:bg-background-dark flex overflow-hidden"
          >
            {/* Toast Notification */}
            <AnimatePresence>
              {toastMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -20, x: '-50%' }}
                  animate={{ opacity: 1, y: 20, x: '-50%' }}
                  exit={{ opacity: 0, y: -20, x: '-50%' }}
                  className="fixed top-0 left-1/2 z-[300] bg-rose-500 text-white px-6 py-3 rounded-xl shadow-lg font-bold flex items-center gap-2"
                >
                  <span className="material-symbols-outlined">error</span>
                  {toastMessage}
                </motion.div>
              )}
            </AnimatePresence>
            {renderLongTextEditorModal()}
            {renderDetailBoardModal()}
            {renderBuilderSelectionContextMenu()}
            {renderPreviewContextMenu()}

            {/* Left Subway Line Panel */}
            <div className={`shrink-0 overflow-hidden border-r border-slate-200 bg-white shadow-[4px_0_18px_rgba(15,23,42,0.04)] transition-all duration-300 dark:border-slate-800 dark:bg-slate-900 ${
              isConfigFullscreenActive ? 'w-0 border-r-0 p-0 opacity-0' : 'w-72 p-5 opacity-100'
            }`}>
              <div className="mb-6 flex items-center gap-3">
                <button 
                  onClick={() => setIsConfigOpen(false)}
                  className="flex size-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:text-slate-900 dark:bg-slate-800 dark:hover:text-white"
                >
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
                <span className="text-[18px] font-bold tracking-tight text-slate-900 dark:text-white">配置向导</span>
              </div>

              <div className="relative flex flex-1 flex-col gap-6">
                {/* Continuous Line */}
                <div className="absolute left-[15px] top-4 bottom-6 w-px rounded-full bg-slate-200 dark:bg-slate-800" />
                
                {configSteps.map((step) => {
                  const isActive = configStep === step.id;
                  const isCompleted = completedSteps.includes(step.id);
                  const isLocked = activeConfigMenu !== null && step.id === 1;
                  
                  return (
                    <div 
                      key={step.id} 
                      onClick={() => {
                        if (isLocked) {
                          showToast('编辑模式已锁定类型');
                          return;
                        }
                        setConfigStep(step.id);
                      }}
                      className={`relative z-10 flex items-start gap-3 group ${isLocked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                    >
                      {/* Node */}
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all duration-500 ${
                        isLocked
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                          : isCompleted
                            ? isActive 
                              ? 'bg-emerald-500 shadow-[0_0_0_6px_rgba(16,185,129,0.14)]'
                              : 'bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.1)]'
                            : isActive 
                              ? 'bg-primary shadow-[0_0_0_6px_rgba(14,116,144,0.12)] dark:shadow-[0_0_0_6px_rgba(14,116,144,0.24)]' 
                              : 'bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 group-hover:border-primary/50'
                      }`}>
                        {isLocked ? (
                          <span className="material-symbols-outlined text-[18px]">lock</span>
                        ) : isCompleted ? (
                          <span className="material-symbols-outlined text-white text-[20px] font-bold">check</span>
                        ) : isActive ? (
                          <motion.div layoutId="activeNode" className="w-3 h-3 bg-white rounded-full" />
                        ) : (
                          <span className="text-[12px] font-bold text-slate-400">{step.id}</span>
                        )}
                      </div>
                      
                      {/* Text */}
                      <div className="mt-0 flex flex-col">
                        <span className={`text-[14px] font-semibold transition-colors duration-300 ${
                          isActive ? 'text-primary' : isCompleted ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                        }`}>
                          {step.title}
                        </span>
                        <span className="mt-1 text-[11px] leading-5 text-slate-500">{step.desc}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Content Area */}
            <div className="relative flex min-w-0 flex-1 flex-col bg-slate-100/60 dark:bg-slate-900/50">
              {/* Ambient Background */}
              <div className="pointer-events-none absolute inset-0 mesh-bg opacity-20"></div>
              {isConfigFullscreenActive && (
                <div className="absolute right-6 top-6 z-20">
                  <button
                    onClick={() => setIsConfigOpen(false)}
                    className="flex size-11 items-center justify-center rounded-2xl border border-white/80 bg-white/85 text-slate-500 shadow-[0_20px_35px_-24px_rgba(15,23,42,0.45)] transition-all hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-300 dark:hover:text-white"
                  >
                    <span className="material-symbols-outlined text-[20px]">close</span>
                  </button>
                </div>
              )}
               
              <div className={`relative z-10 flex flex-1 flex-col ${
                isConfigFullscreenActive ? 'overflow-hidden p-3 lg:p-4' : isModuleSettingStep ? 'overflow-y-auto p-4 lg:p-4' : 'overflow-y-auto p-6 lg:p-8'
              }`}>
                <motion.div
                  key={configStep}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className={`mx-auto flex w-full flex-1 min-h-0 flex-col ${isConfigFullscreenActive ? 'max-w-none overflow-hidden' : isModuleSettingStep ? 'max-w-none' : 'max-w-[1600px]'}`}
                >
                  <div className="mb-0"></div>

                  {/* Dynamic Content Area */}
                  {configStep === 1 && (
                    <div className="flex flex-1 flex-col gap-8">
                      <div className="rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top_right,rgba(49,98,255,0.12),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,250,255,0.98))] p-8 shadow-[0_28px_80px_-48px_rgba(15,23,42,0.32)] dark:border-slate-700 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(15,23,42,0.98))]">
                        <div className="max-w-3xl space-y-3">
                          <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-[11px] font-bold tracking-[0.24em] text-primary">
                            模块引导
                          </div>
                          <h3 className="text-[30px] font-black tracking-tight text-slate-900 dark:text-white">先选择本次要创建的模块类型</h3>
                          <p className="text-[14px] leading-7 text-slate-500 dark:text-slate-300">
                            这一步只决定底层主配置表。选中后，第二步菜单信息会自动切到对应老系统结构：单表走 <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[12px] text-slate-700 dark:bg-slate-800 dark:text-slate-200">p_systemdlltab</code>，单据走 <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[12px] text-slate-700 dark:bg-slate-800 dark:text-slate-200">p_systembilltype</code>。
                          </p>
                        </div>
                      </div>

                      <div className="grid flex-1 gap-6 lg:grid-cols-2">
                        {MODULE_TYPE_OPTIONS.map((option) => {
                          const isActive = businessType === option.value;
                          const guide = MODULE_GUIDE_PROFILES[option.value];

                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => handleBusinessTypeChange(option.value)}
                              className={`group relative overflow-hidden rounded-[28px] border p-7 text-left transition-all ${
                                isActive
                                  ? 'border-primary/35 bg-[linear-gradient(180deg,rgba(239,246,255,0.96),rgba(255,255,255,0.98))] shadow-[0_32px_70px_-42px_rgba(49,98,255,0.42)] dark:border-primary/40 dark:bg-[linear-gradient(180deg,rgba(30,41,59,0.98),rgba(15,23,42,1))]'
                                  : 'border-slate-200 bg-white hover:-translate-y-1 hover:border-primary/25 hover:shadow-[0_30px_60px_-46px_rgba(15,23,42,0.3)] dark:border-slate-700 dark:bg-slate-900/80'
                              }`}
                            >
                              <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-primary/8 blur-3xl transition-opacity group-hover:opacity-100" />
                              <div className="relative z-10 flex h-full flex-col">
                                <div className="flex items-start justify-between gap-4">
                                  <div className={`flex size-14 items-center justify-center rounded-2xl border ${
                                    isActive
                                      ? 'border-primary/20 bg-primary text-white shadow-[0_18px_34px_-20px_rgba(49,98,255,0.46)]'
                                      : 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                  }`}>
                                    <span className="material-symbols-outlined text-[26px]">{option.icon}</span>
                                  </div>
                                  <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-bold ${
                                    isActive
                                      ? 'border-primary/20 bg-primary/10 text-primary'
                                      : 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                  }`}>
                                    <span className="material-symbols-outlined text-[15px]">{isActive ? 'check_circle' : 'radio_button_unchecked'}</span>
                                    {isActive ? '当前选择' : '点击选择'}
                                  </div>
                                </div>

                                <div className="mt-6 space-y-3">
                                  <div className="flex items-center gap-3">
                                    <h4 className="text-[24px] font-black tracking-tight text-slate-900 dark:text-white">{guide.label}</h4>
                                    <code className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                      {guide.configTable}
                                    </code>
                                  </div>
                                  <p className="text-[14px] leading-7 text-slate-500 dark:text-slate-300">{guide.intro}</p>
                                </div>

                                <div className="mt-6 rounded-[22px] border border-slate-200/80 bg-white/82 p-5 dark:border-slate-700 dark:bg-slate-950/40">
                                  <div className="text-[12px] font-bold tracking-[0.18em] text-slate-400">第二步写入主表</div>
                                  <div className="mt-2 text-[16px] font-bold text-slate-800 dark:text-slate-100">{guide.configTableDesc}</div>
                                  <div className="mt-4 flex flex-wrap gap-2">
                                    {guide.keyFields.map((field) => (
                                      <span key={`${option.value}-${field}`} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                        {field}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {configStep === 2 && renderMenuInfoStep()}

                  {false && (
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 flex-1">
                      {/* Left Column: Core Information */}
                      <div className="xl:col-span-2 flex flex-col gap-8">
                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm p-8 relative overflow-hidden">
                          {/* Decorative background element */}
                          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
                          
                          <div className="relative z-10">
                            <div className="space-y-6">
                              <div className="grid grid-cols-2 gap-6">
                                {/* 模块编码 */}
                                <div className="space-y-2.5">
                                  <label className="text-[13px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                    模块编码 <span className="text-rose-500">*</span>
                                  </label>
                                  <div className="relative flex items-center">
                                    <span className="absolute left-4 text-slate-400 material-symbols-outlined text-[18px]">tag</span>
                                    <input type="text" className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-mono text-slate-700 dark:text-slate-200 font-medium" defaultValue="FM-CO-001" />
                                  </div>
                                </div>

                                {/* 模块名称 */}
                                <div className="space-y-2.5">
                                  <label className="text-[13px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                    模块名称 <span className="text-rose-500">*</span>
                                  </label>
                                  <div className="relative flex items-center">
                                    <span className="absolute left-4 text-slate-400 material-symbols-outlined text-[18px]">title</span>
                                    <input type="text" className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-900 dark:text-white font-bold" defaultValue="成本控制" />
                                  </div>
                                </div>
                              </div>

                              {/* 模块类型 */}
                              <div className="space-y-2.5">
                                <div className="flex items-center justify-between gap-4">
                                  <label className="text-[13px] font-bold text-slate-700 dark:text-slate-300">模块类型</label>
                                  <button
                                    type="button"
                                    onClick={() => setConfigStep(1)}
                                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-bold text-slate-500 transition-colors hover:border-primary/30 hover:text-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                                  >
                                    <span className="material-symbols-outlined text-[14px]">swap_horiz</span>
                                    返回切换类型
                                  </button>
                                </div>
                                <div className="rounded-[20px] border border-primary/10 bg-[linear-gradient(135deg,rgba(239,246,255,0.88),rgba(255,255,255,0.96))] p-5 dark:border-primary/20 dark:bg-[linear-gradient(180deg,rgba(30,41,59,0.86),rgba(15,23,42,0.94))]">
                                  <div className="flex flex-wrap items-center gap-3">
                                    <span className="inline-flex items-center gap-2 rounded-full bg-primary px-3 py-1 text-[11px] font-bold text-white shadow-[0_12px_24px_-16px_rgba(49,98,255,0.48)]">
                                      <span className="material-symbols-outlined text-[15px]">
                                        {businessType === 'table' ? 'receipt_long' : 'table_view'}
                                      </span>
                                      {currentModuleGuide.label}
                                    </span>
                                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                                      主配置表：{currentModuleGuide.configTable}
                                    </span>
                                  </div>
                                  <p className="mt-3 text-[13px] leading-6 text-slate-500 dark:text-slate-300">
                                    {currentModuleGuide.intro}
                                  </p>
                                </div>
                              </div>

                              {/* 常用功能 */}
                              <div className="space-y-3">
                                <label className="text-[13px] font-bold text-slate-700 dark:text-slate-300">常用功能配置</label>
                                <div className="flex flex-wrap gap-3 relative">
                                  {commonFuncs.map(funcId => {
                                    const func = funcOptions.find(f => f.id === funcId);
                                    if (!func) return null;
                                    return (
                                      <div key={func.id} className="px-4 py-2.5 rounded-xl bg-primary/10 border border-primary/30 text-primary text-[13px] font-bold flex items-center gap-2 shadow-sm">
                                        <span className="material-symbols-outlined text-[18px]">{func.icon}</span>
                                        {func.name}
                                        <button onClick={() => toggleFunc(func.id)} className="ml-1 hover:text-rose-500 transition-colors flex items-center justify-center">
                                          <span className="material-symbols-outlined text-[16px]">close</span>
                                        </button>
                                      </div>
                                    );
                                  })}
                                  <div className="relative">
                                    <button onClick={() => setIsFuncPopoverOpen(!isFuncPopoverOpen)} className="px-4 py-2.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 text-slate-500 hover:text-primary hover:border-primary/50 hover:bg-primary/5 text-[13px] font-bold flex items-center gap-2 transition-all">
                                      <span className="material-symbols-outlined text-[18px]">add</span>
                                      添加功能
                                    </button>
                                    
                                    <AnimatePresence>
                                      {isFuncPopoverOpen && (
                                        <>
                                          <div className="fixed inset-0 z-40" onClick={() => setIsFuncPopoverOpen(false)}></div>
                                          <motion.div 
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                            className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 p-2"
                                          >
                                            <div className="text-[12px] font-bold text-slate-400 mb-2 px-2 pt-1">选择常用功能</div>
                                            <div className="space-y-1">
                                              {funcOptions.map(func => {
                                                const isSelected = commonFuncs.includes(func.id);
                                                return (
                                                  <button
                                                    key={func.id}
                                                    onClick={() => toggleFunc(func.id)}
                                                    className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between text-[13px] transition-colors ${isSelected ? 'bg-primary/10 text-primary font-bold' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                                                  >
                                                    <div className="flex items-center gap-2">
                                                      <span className="material-symbols-outlined text-[18px]">{func.icon}</span>
                                                      {func.name}
                                                    </div>
                                                    {isSelected && <span className="material-symbols-outlined text-[16px]">check</span>}
                                                  </button>
                                                );
                                              })}
                                            </div>
                                          </motion.div>
                                        </>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                </div>
                              </div>

                              {/* 妯″潡绠€浠?*/}
                              <div className="space-y-2.5">
                                <label className="text-[13px] font-bold text-slate-700 dark:text-slate-300">模块简介</label>
                                <textarea className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none text-slate-700 dark:text-slate-300 leading-relaxed" rows={4} defaultValue="核心成本控制核算系统，包含凭证处理、账簿查询、报表生成等基础控制能力，支持跨部门自动结算。"></textarea>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right Column: Visual & Routing */}
                      <div className="flex flex-col gap-6">
                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
                          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50 flex items-center gap-3">
                            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                              <span className="material-symbols-outlined text-[18px]">schema</span>
                            </div>
                            <h3 className="text-[15px] font-bold text-slate-800 dark:text-slate-200">当前菜单信息写入表</h3>
                          </div>

                          <div className="p-6 space-y-4">
                            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-900/60">
                              <div className="text-[12px] font-bold tracking-[0.18em] text-slate-400">LEGACY TABLE</div>
                              <div className="mt-2 flex items-center gap-3">
                                <code className="rounded-xl bg-slate-900 px-3 py-2 text-[13px] font-bold text-cyan-300 dark:bg-slate-950">
                                  {currentModuleGuide.configTable}
                                </code>
                                <span className="text-[13px] font-semibold text-slate-600 dark:text-slate-300">{currentModuleGuide.configTableDesc}</span>
                              </div>
                              <p className="mt-3 text-[12px] leading-6 text-slate-500 dark:text-slate-400">
                                第二步的菜单编码、模块名称、路由和类型信息，会优先对齐这张旧平台主配置表。
                              </p>
                            </div>

                            <div className="space-y-2">
                              <div className="text-[12px] font-bold tracking-[0.18em] text-slate-400">关键字段</div>
                              <div className="flex flex-wrap gap-2">
                                {currentModuleGuide.keyFields.map((field) => (
                                  <span key={`guide-field-${field}`} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                                    {field}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* 瑙嗚涓庣姸鎬?*/}
                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
                          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50 flex items-center gap-3">
                            <div className="size-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                              <span className="material-symbols-outlined text-[18px]">palette</span>
                            </div>
                            <h3 className="text-[15px] font-bold text-slate-800 dark:text-slate-200">视觉与状态</h3>
                          </div>

                          <div className="p-6 space-y-6">
                            {/* 图标选择器 */}
                            <div className="space-y-3">
                              <label className="text-[13px] font-bold text-slate-700 dark:text-slate-300">菜单图标</label>
                              <div className="flex items-center gap-4 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 group hover:border-primary/30 transition-all hover:shadow-sm">
                                <div className="size-12 rounded-xl bg-gradient-to-br from-primary to-indigo-600 text-white flex items-center justify-center shadow-md shadow-primary/20 group-hover:scale-105 transition-transform">
                                  <span className="material-symbols-outlined text-[24px]">payments</span>
                                </div>
                                <div className="flex-1">
                                  <div className="text-[14px] font-bold text-slate-800 dark:text-slate-200">payments</div>
                                  <div className="text-[12px] text-slate-500 mt-0.5">图标库</div>
                                </div>
                                <button className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[13px] font-bold text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-primary transition-colors shadow-sm">更换</button>
                              </div>
                            </div>

                            {/* 启用状态 */}
                            <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                              <div>
                                <div className="text-[14px] font-bold text-slate-800 dark:text-slate-200">启用模块</div>
                                <div className="text-[12px] text-slate-500 mt-0.5">关闭后用户将无法访问此模块</div>
                              </div>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" defaultChecked />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-500"></div>
                              </label>
                            </div>
                          </div>
                        </div>

                        {/* 导航规则 */}
                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
                          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50 flex items-center gap-3">
                            <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                              <span className="material-symbols-outlined text-[18px]">route</span>
                            </div>
                            <h3 className="text-[15px] font-bold text-slate-800 dark:text-slate-200">导航规则</h3>
                          </div>

                          <div className="p-6 space-y-5">
                            <div className="space-y-3">
                              <label className="text-[13px] font-bold text-slate-700 dark:text-slate-300">所属分组</label>
                              <div className="relative group">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[18px] pointer-events-none group-hover:text-primary transition-colors">folder</span>
                                <select className="w-full pl-11 pr-10 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-700 dark:text-slate-300 cursor-pointer appearance-none font-medium hover:border-primary/30">
                                  <option>财务管理</option>
                                  <option>人力资源</option>
                                  <option>供应链管理</option>
                                </select>
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[18px] pointer-events-none">expand_more</span>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-3">
                                <label className="text-[13px] font-bold text-slate-700 dark:text-slate-300">分组序号</label>
                                <input type="number" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-700 dark:text-slate-300 font-mono hover:border-primary/30" defaultValue="1" />
                              </div>
                              <div className="space-y-3">
                                <label className="text-[13px] font-bold text-slate-700 dark:text-slate-300">行号</label>
                                <input type="number" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-[14px] focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-700 dark:text-slate-300 font-mono hover:border-primary/30" defaultValue="10" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {configStep === 3 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.4 }}
                      className={`module-intro-shell flex flex-1 flex-col overflow-hidden min-h-[600px] ${
                        isFullscreenEditor ? 'fixed inset-4 z-[200] shadow-2xl' : ''
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                        className="hidden"
                        onChange={handleImageUpload}
                      />

                      <div className="module-intro-toolbar">
                        <div className="module-intro-toolbar-group">
                          <select
                            value={moduleIntroBlockType}
                            onChange={(event) => handleModuleIntroFormatChange(event.target.value as 'paragraph' | 'h1' | 'h2' | 'h3')}
                            className="module-intro-format-select"
                          >
                            <option value="paragraph">正文</option>
                            <option value="h1">标题 1</option>
                            <option value="h2">标题 2</option>
                            <option value="h3">标题 3</option>
                          </select>
                        </div>
                        <div className="module-intro-toolbar-group">
                          <button type="button" onMouseDown={(event) => { event.preventDefault(); applyModuleIntroCommand('bold'); }} className="module-intro-toolbar-button" title="加粗">
                            <span className="material-symbols-outlined text-[18px]">format_bold</span>
                          </button>
                          <button type="button" onMouseDown={(event) => { event.preventDefault(); applyModuleIntroCommand('italic'); }} className="module-intro-toolbar-button" title="斜体">
                            <span className="material-symbols-outlined text-[18px]">format_italic</span>
                          </button>
                          <button type="button" onMouseDown={(event) => { event.preventDefault(); applyModuleIntroCommand('underline'); }} className="module-intro-toolbar-button" title="下划线">
                            <span className="material-symbols-outlined text-[18px]">format_underlined</span>
                          </button>
                          <button type="button" onMouseDown={(event) => { event.preventDefault(); applyModuleIntroCommand('strikeThrough'); }} className="module-intro-toolbar-button" title="删除线">
                            <span className="material-symbols-outlined text-[18px]">format_strikethrough</span>
                          </button>
                        </div>
                        <div className="module-intro-toolbar-group">
                          <button type="button" onMouseDown={(event) => { event.preventDefault(); applyModuleIntroCommand('insertUnorderedList'); }} className="module-intro-toolbar-button" title="无序列表">
                            <span className="material-symbols-outlined text-[18px]">format_list_bulleted</span>
                          </button>
                          <button type="button" onMouseDown={(event) => { event.preventDefault(); applyModuleIntroCommand('insertOrderedList'); }} className="module-intro-toolbar-button" title="有序列表">
                            <span className="material-symbols-outlined text-[18px]">format_list_numbered</span>
                          </button>
                          <button type="button" onMouseDown={(event) => { event.preventDefault(); applyModuleIntroCommand('formatBlock', '<blockquote>'); }} className="module-intro-toolbar-button" title="引用">
                            <span className="material-symbols-outlined text-[18px]">format_quote</span>
                          </button>
                        </div>
                        <div className="module-intro-toolbar-group">
                          <button type="button" onMouseDown={(event) => { event.preventDefault(); handleModuleIntroLinkInsert(); }} className="module-intro-toolbar-button" title="插入链接">
                            <span className="material-symbols-outlined text-[18px]">link</span>
                          </button>
                          <button type="button" onMouseDown={(event) => { event.preventDefault(); openModuleIntroImagePicker(); }} className="module-intro-toolbar-button" title="插入图片">
                            <span className="material-symbols-outlined text-[18px]">image</span>
                          </button>
                          <button type="button" onMouseDown={(event) => { event.preventDefault(); handleModuleIntroTableInsert(); }} className="module-intro-toolbar-button" title="插入表格">
                            <span className="material-symbols-outlined text-[18px]">table_chart</span>
                          </button>
                        </div>
                        {moduleIntroSelectedImageWidth !== null && (
                          <div className="module-intro-toolbar-group module-intro-toolbar-group-image">
                            <span className="module-intro-image-size-label">图片 {moduleIntroSelectedImageWidth}px</span>
                            <button type="button" onMouseDown={(event) => { event.preventDefault(); handleModuleIntroImagePreset('small'); }} className="module-intro-image-size-button">小</button>
                            <button type="button" onMouseDown={(event) => { event.preventDefault(); handleModuleIntroImagePreset('medium'); }} className="module-intro-image-size-button">中</button>
                            <button type="button" onMouseDown={(event) => { event.preventDefault(); handleModuleIntroImagePreset('large'); }} className="module-intro-image-size-button">大</button>
                            <button type="button" onMouseDown={(event) => { event.preventDefault(); handleModuleIntroImagePreset('full'); }} className="module-intro-image-size-button">铺满</button>
                          </div>
                        )}
                        <div className="ml-auto flex items-center gap-2">
                          <div className="module-intro-status-chip">
                            <span className="material-symbols-outlined text-[15px]">gesture_select</span>
                            先选中文字，再应用格式
                          </div>
                          <button type="button" onClick={() => setIsFullscreenEditor(!isFullscreenEditor)} className="module-intro-action-button">
                            <span className="material-symbols-outlined text-[16px]">
                              {isFullscreenEditor ? 'fullscreen_exit' : 'fullscreen'}
                            </span>
                            {isFullscreenEditor ? '退出全屏' : '全屏编辑'}
                          </button>
                          <button type="button" onClick={polishModuleIntroContent} className="module-intro-primary-button">
                            <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                            AI 润色
                          </button>
                        </div>
                      </div>

                      <div className="module-intro-body">
                        <div className="module-intro-paper">
                          <div className="module-intro-paper-head">
                            <div className="min-w-0 flex-1">
                              <div className="module-intro-eyebrow">模块介绍</div>
                              <h1
                                ref={titleEditorRef}
                                className="module-intro-title"
                                contentEditable
                                suppressContentEditableWarning
                                spellCheck={false}
                                onInput={syncModuleIntroDraft}
                                onBlur={syncModuleIntroDraft}
                              />
                            </div>
                          </div>

                          <div
                            ref={editorRef}
                            className="module-intro-prose"
                            contentEditable
                            suppressContentEditableWarning
                            spellCheck={false}
                            onInput={syncModuleIntroDraft}
                            onBlur={syncModuleIntroDraft}
                            onFocus={saveModuleIntroSelection}
                            onKeyUp={saveModuleIntroSelection}
                            onMouseUp={saveModuleIntroSelection}
                            onMouseDown={handleModuleIntroEditorMouseDown}
                            onPaste={(event) => {
                              const imageItems = Array.from(event.clipboardData.files ?? []) as File[];
                              const imageFiles = imageItems.filter((file) => file.type.startsWith('image/'));
                              if (imageFiles.length === 0) return;
                              event.preventDefault();
                              handleModuleIntroImageFiles(imageFiles);
                            }}
                          />

                          <button
                            type="button"
                            onClick={openModuleIntroImagePicker}
                            onDragOver={(event) => event.preventDefault()}
                            onDrop={(event) => {
                              event.preventDefault();
                              handleModuleIntroImageFiles(event.dataTransfer.files);
                            }}
                            className="module-intro-upload-card"
                          >
                            <div className="module-intro-upload-icon">
                              <span className="material-symbols-outlined text-[24px]">add_photo_alternate</span>
                            </div>
                            <span className="module-intro-upload-title">拖拽或点击上传流程图 / 架构图</span>
                            <span className="module-intro-upload-desc">支持 PNG、JPG、SVG、WebP，上传后会直接插入到当前光标位置。</span>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {configStep === 5 && (
                    <motion.div
                      key={`layout-${businessType}`}
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.4 }}
                      className="flex min-h-0 flex-1 flex-col overflow-hidden"
                    >
                      {businessType === 'document' ? (
                        <div style={workspaceThemeVars} className={`cloudy-glass-stage cloudy-cloud-grid studio-grid-bg flex flex-1 min-h-0 overflow-hidden rounded-[36px] p-3 ${workspaceThemeStyles.tableSurface} ${isConfigFullscreenActive ? 'h-full' : 'min-h-[780px]'}`}>
                          {isTreePaneVisible && (
                            <>
                              <div className="flex min-h-0 shrink-0 flex-col" style={{ width: documentLeftPaneWidth }}>
                                {renderDocumentTreePanel()}
                              </div>

                              <div
                                className="group flex w-3 shrink-0 cursor-col-resize items-center justify-center"
                                onMouseDown={(event) => startLayoutDrag('document-left-width', event)}
                              >
                                <div className="cloudy-divider h-28 w-[4px] rounded-full transition-colors group-hover:bg-[color:var(--workspace-accent)] dark:bg-slate-700" />
                              </div>
                            </>
                          )}

                          <div className="min-h-0 min-w-0 flex-1 px-1">
                            <div className="cloudy-glass-panel flex h-full min-h-0 flex-col overflow-hidden rounded-[32px] border border-white/75">
                              <div className="min-h-0 shrink-0 overflow-hidden pb-1" style={{ height: documentTopPaneHeight }}>
                                <div className="flex h-full min-h-0 flex-col overflow-hidden">
                                  {renderDocumentGridToolbar(
                                    mainTableColumns,
                                    '基础档案主表',
                                    selectedMainForDelete.length,
                                    () => deleteSelectedColumns('main', selectedMainForDelete),
                                    () => setMainTableColumns((prev) => [...prev, buildColumn('m_col', prev.length + 1)]),
                                    undefined,
                                    {
                                      fields: mainFilterFields,
                                      selectedId: selectedMainFilterId,
                                      selectedIds: selectedMainFiltersForDelete,
                                      setSelectedIds: setSelectedMainFiltersForDelete,
                                      setFields: setMainFilterFields,
                                      scope: 'main',
                                      onActivate: (id) => {
                                        setSelectedArchiveNodeId('archive-filter');
                                        activateConditionSelection('main', id);
                                      },
                                      onAdd: () => {
                                        const next = buildConditionField(mainFilterFields.length + 1);
                                        setMainFilterFields((prev) => [...prev, next]);
                                        setSelectedMainFiltersForDelete([next.id]);
                                        setSelectedArchiveNodeId('archive-filter');
                                        activateConditionSelection('main', next.id);
                                      },
                                      onDelete: () => deleteSelectedConditions('main', selectedMainFiltersForDelete),
                                    },
                                    undefined,
                                    { hideActionBar: true },
                                  )}
                                  <div
                                    className="scrollbar-none min-h-0 flex-1 overflow-auto bg-white/70 px-3 py-3 outline-none dark:bg-slate-900/90"
                                    tabIndex={0}
                                    onPaste={(e) => handlePasteColumns(e, setMainTableColumns)}
                                  >
                                  {renderTableBuilder('main', mainTableColumns, setMainTableColumns, selectedMainColId, selectedMainForDelete, setSelectedMainForDelete, {
                                    contextMenuScope: 'main',
                                    contextMenuConfig: {
                                      enabled: (mainTableConfig.contextMenuItems ?? []).length > 0,
                                      items: mainTableConfig.contextMenuItems ?? [],
                                    },
                                    backgroundSelectable: true,
                                    tableSelected: selectedTableConfigScope === 'main',
                                    onSelectTable: () => {
                                      setSelectedArchiveNodeId('archive-main');
                                      activateTableConfigSelection('main');
                                    },
                                    detailBoardConfig: mainTableConfig.detailBoard,
                                    onCanvasDoubleClick: () => {
                                      if (normalizeDetailBoardConfig(mainTableConfig.detailBoard, mainTableColumns).groups.length === 0) return;
                                      openDetailBoardPreview(1);
                                    },
                                    canvasLabel: '点击配置基础档案主表',
                                  })}
                                </div>
                                </div>
                              </div>

                              <div
                                className="group relative z-10 -my-1 flex h-4 shrink-0 cursor-row-resize items-center justify-center"
                                onMouseDown={(event) => startLayoutDrag('document-top-height', event)}
                              >
                                <div className="cloudy-divider h-[5px] w-32 rounded-full transition-colors group-hover:bg-[color:var(--workspace-accent)] dark:bg-slate-700" />
                              </div>

                              <div className="min-h-0 flex-1 overflow-hidden px-3 pb-3 pt-2">
                                {renderDocumentDetailWorkbench()}
                              </div>
                            </div>
                          </div>

                          <div className="flex min-h-0 shrink-0 flex-col pl-2" style={{ width: inspectorPaneWidth, minWidth: inspectorPaneWidth }}>
                            {columnOperationPanel}
                          </div>
                        </div>
                      ) : businessType === 'table' ? (
                        <div style={workspaceThemeVars} className={`cloudy-glass-stage cloudy-cloud-grid studio-grid-bg flex flex-1 min-h-0 overflow-hidden rounded-[36px] ${isConfigFullscreenActive ? 'h-full p-1.5' : 'min-h-[780px] p-3'} ${workspaceThemeStyles.tableSurface}`}>
                          <div className={`grid min-h-0 flex-1 ${isConfigFullscreenActive ? 'gap-3 xl:grid-cols-[minmax(0,1fr)_448px]' : 'gap-4 xl:grid-cols-[minmax(0,1fr)_388px]'}`}>
                            <div className="flex min-h-0">
                              {renderBillDocumentWorkbench()}
                            </div>
                            <div className="flex min-h-0 shrink-0 flex-col">
                              {columnOperationPanel}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div style={workspaceThemeVars} className={`cloudy-glass-stage flex flex-1 min-h-0 flex-col overflow-hidden rounded-[36px] ${workspaceThemeStyles.tableSurface} ${isConfigFullscreenActive ? 'h-full' : 'min-h-[780px]'}`}>
                          <div className={`cloudy-cloud-grid studio-grid-bg grid min-h-0 flex-1 ${
                            isConfigFullscreenActive
                              ? 'xl:grid-cols-[minmax(220px,0.72fr)_minmax(0,1.28fr)]'
                              : 'xl:grid-cols-[minmax(260px,0.82fr)_minmax(0,1.18fr)]'
                          } ${isConfigFullscreenActive ? 'gap-4 p-4' : 'gap-5 p-5'}`}>
                            <div className="cloudy-glass-panel flex min-h-0 flex-col overflow-hidden rounded-[30px] border border-white/75">
                              <div className="cloudy-glass-toolbar flex items-center justify-between px-4 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="cloudy-glass-orb flex size-9 items-center justify-center rounded-2xl text-[color:var(--workspace-accent)]">
                                    <span className="material-symbols-outlined text-[16px]">view_sidebar</span>
                                  </div>
                                  <div>
                                    <h4 className="text-[12px] font-semibold text-slate-800 dark:text-slate-200">左侧表配置</h4>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {selectedLeftForDelete.length > 0 && (
                                    <button
                                      onClick={() => deleteSelectedColumns('left', selectedLeftForDelete)}
                                      className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold text-rose-500 transition-colors hover:bg-rose-50 dark:hover:bg-rose-500/10"
                                    >
                                      <span className="material-symbols-outlined text-[14px]">delete</span>
                                      删除 ({selectedLeftForDelete.length})
                                    </button>
                                  )}
                                  <button
                                    onClick={() => setLeftTableColumns((prev) => [...prev, { id: `l_col_${Date.now()}`, name: `新字段 ${prev.length + 1}`, type: '文本', width: 120 }])}
                                    className="inline-flex items-center gap-1 rounded-lg bg-[color:var(--workspace-accent)] px-2.5 py-1 text-[11px] font-semibold text-white shadow-[0_10px_18px_-16px_rgba(15,23,42,0.2)] transition-all hover:bg-[color:var(--workspace-accent-strong)]"
                                  >
                                    <span className="material-symbols-outlined text-[14px]">add</span>
                                    新增
                                  </button>
                                </div>
                              </div>
                              <div
                                className="scrollbar-none min-h-0 flex-1 overflow-auto outline-none"
                                tabIndex={0}
                                onPaste={(e) => handlePasteColumns(e, setLeftTableColumns)}
                              >
                                <div className="px-3 pb-3 pt-2">
                                  {renderTableBuilder('left', leftTableColumns, setLeftTableColumns, selectedLeftColId, selectedLeftForDelete, setSelectedLeftForDelete)}
                                </div>
                              </div>
                            </div>

                            <div className="grid min-h-0 gap-5 lg:grid-rows-[minmax(0,1fr)_minmax(0,1fr)]">
                              <div className="cloudy-glass-panel flex min-h-0 flex-col overflow-hidden rounded-[30px] border border-white/75">
                                <div className="cloudy-glass-toolbar flex items-center justify-between px-4 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="cloudy-glass-orb flex size-9 items-center justify-center rounded-2xl text-emerald-500">
                                      <span className="material-symbols-outlined text-[16px]">table_rows</span>
                                    </div>
                                    <div>
                                      <h4 className="text-[12px] font-semibold text-slate-800 dark:text-slate-200">主表字段配置</h4>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {selectedMainForDelete.length > 0 && (
                                      <button
                                        onClick={() => deleteSelectedColumns('main', selectedMainForDelete)}
                                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold text-rose-500 transition-colors hover:bg-rose-50 dark:hover:bg-rose-500/10"
                                      >
                                        <span className="material-symbols-outlined text-[14px]">delete</span>
                                        删除 ({selectedMainForDelete.length})
                                      </button>
                                    )}
                                    <button
                                      onClick={() => setMainTableColumns((prev) => [...prev, { id: `m_col_${Date.now()}`, name: `新字段 ${prev.length + 1}`, type: '文本', width: 120 }])}
                                      className="inline-flex items-center gap-1 rounded-lg bg-[color:var(--workspace-accent)] px-2.5 py-1 text-[11px] font-semibold text-white shadow-[0_10px_18px_-16px_rgba(15,23,42,0.2)] transition-all hover:bg-[color:var(--workspace-accent-strong)]"
                                    >
                                      <span className="material-symbols-outlined text-[14px]">add</span>
                                      新增
                                    </button>
                                  </div>
                                </div>
                                {renderDocumentGridToolbar(
                                  mainTableColumns,
                                  '主表字段配置',
                                  selectedMainForDelete.length,
                                  () => deleteSelectedColumns('main', selectedMainForDelete),
                                  () => setMainTableColumns((prev) => [...prev, buildColumn('m_col', prev.length + 1)]),
                                  undefined,
                                  {
                                    fields: mainFilterFields,
                                    selectedId: selectedMainFilterId,
                                    selectedIds: selectedMainFiltersForDelete,
                                    setSelectedIds: setSelectedMainFiltersForDelete,
                                    setFields: setMainFilterFields,
                                    scope: 'main',
                                    onActivate: (id) => {
                                      setSelectedArchiveNodeId('archive-filter');
                                      activateConditionSelection('main', id);
                                    },
                                    onAdd: () => {
                                      const next = buildConditionField(mainFilterFields.length + 1);
                                      setMainFilterFields((prev) => [...prev, next]);
                                      setSelectedMainFiltersForDelete([next.id]);
                                      setSelectedArchiveNodeId('archive-filter');
                                      activateConditionSelection('main', next.id);
                                    },
                                    onDelete: () => deleteSelectedConditions('main', selectedMainFiltersForDelete),
                                  },
                                  undefined,
                                  { hideActionBar: true },
                                )}
                                <div
                                  className="scrollbar-none min-h-0 flex-1 overflow-auto px-3 pb-3 outline-none"
                                  tabIndex={0}
                                  onPaste={(e) => handlePasteColumns(e, setMainTableColumns)}
                                >
                                  {renderTableBuilder('main', mainTableColumns, setMainTableColumns, selectedMainColId, selectedMainForDelete, setSelectedMainForDelete, {
                                    backgroundSelectable: true,
                                    tableSelected: selectedTableConfigScope === 'main',
                                    onSelectTable: () => activateTableConfigSelection('main'),
                                    detailBoardConfig: mainTableConfig.detailBoard,
                                    onCanvasDoubleClick: () => {
                                      if (!normalizeDetailBoardConfig(mainTableConfig.detailBoard, mainTableColumns).enabled) return;
                                      openDetailBoardPreview(1);
                                    },
                                    canvasLabel: '点击配置主表属性',
                                  })}
                                </div>
                              </div>

                              <div className="flex min-h-0 flex-col overflow-hidden rounded-[28px] border border-white/80 bg-white/88 shadow-[0_30px_56px_-42px_rgba(15,23,42,0.28)] dark:border-slate-700 dark:bg-slate-800/88">
                                <div className="flex items-center justify-between border-b border-slate-200/70 bg-[linear-gradient(180deg,rgba(248,251,255,0.96),rgba(255,255,255,0.92))] px-4 py-4 dark:border-slate-700 dark:bg-slate-800/70">
                                  <div className="flex items-center gap-3">
                                    <div className="flex size-8 items-center justify-center rounded-xl bg-blue-500/12 text-blue-500">
                                      <span className="material-symbols-outlined text-[16px]">tab_group</span>
                                    </div>
                                    <div>
                                      <h4 className="text-[12px] font-semibold text-slate-800 dark:text-slate-200">明细页签配置</h4>
                                      <p className="mt-0.5 text-[11px] text-slate-400">页签与填充方式集中在这里</p>
                                    </div>
                                  </div>
                                  <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-semibold text-blue-500 dark:bg-blue-500/10">明细页签</span>
                                </div>
                                {renderDetailTabsWorkspace('builder')}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {configStep === 4 && (
                    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 flex-1 min-h-[650px]">
                      <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
                        <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/50 p-5 dark:border-slate-800 dark:bg-slate-800/50">
                          <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <span className="material-symbols-outlined text-[20px]">smart_toy</span>
                          </div>
                          <div>
                            <h3 className="text-[16px] font-bold text-slate-800 dark:text-slate-200">AI 架构助手</h3>
                            <p className="text-[12px] text-slate-500">正在为您进行需求调研...</p>
                          </div>
                        </div>

                        <div className="flex-1 space-y-6 overflow-y-auto bg-slate-50/30 p-6 custom-scrollbar dark:bg-slate-900/30">
                          <div className="flex gap-4">
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-md shadow-primary/20">
                              <span className="material-symbols-outlined text-[20px]">smart_toy</span>
                            </div>
                            <div className="max-w-[85%] rounded-2xl rounded-tl-none border border-slate-100 bg-white p-4 text-[14px] leading-relaxed text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              您好。为了更好地为您构建【成本控制】模块，我需要先确认开发模式。您希望采用哪一种？
                            </div>
                          </div>

                          {surveyStep === 0 && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pl-14 flex flex-wrap gap-3">
                              {['标准 CRUD 模式', '复杂审批流模式', '数据看板模式'].map((opt) => (
                                <button
                                  key={opt}
                                  onClick={() => {
                                    setSurveyAnswers([opt]);
                                    setSurveyStep(1);
                                  }}
                                  className="rounded-xl border border-primary/20 bg-primary/5 px-5 py-2.5 text-[14px] font-bold text-primary shadow-sm transition-all hover:bg-primary hover:text-white"
                                >
                                  {opt}
                                </button>
                              ))}
                            </motion.div>
                          )}

                          {surveyStep > 0 && (
                            <div className="flex flex-row-reverse gap-4">
                              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                                <span className="material-symbols-outlined text-[20px]">person</span>
                              </div>
                              <div className="max-w-[85%] rounded-2xl rounded-tr-none bg-primary p-4 text-[14px] leading-relaxed text-white shadow-sm">
                                {surveyAnswers[0]}
                              </div>
                            </div>
                          )}

                          {surveyStep > 0 && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-4">
                              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-md shadow-primary/20">
                                <span className="material-symbols-outlined text-[20px]">smart_toy</span>
                              </div>
                              <div className="max-w-[85%] rounded-2xl rounded-tl-none border border-slate-100 bg-white p-4 text-[14px] leading-relaxed text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                好的，已选择“{surveyAnswers[0]}”。请问该模块的数据来源主要是什么？
                              </div>
                            </motion.div>
                          )}

                          {surveyStep === 1 && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pl-14 flex flex-wrap gap-3">
                              {['手工录入为主', '外部系统对接 (API)', 'Excel 批量导入'].map((opt) => (
                                <button
                                  key={opt}
                                  onClick={() => generateSurveyPlan(surveyAnswers[0], opt)}
                                  className="rounded-xl border border-primary/20 bg-primary/5 px-5 py-2.5 text-[14px] font-bold text-primary shadow-sm transition-all hover:bg-primary hover:text-white"
                                >
                                  {opt}
                                </button>
                              ))}
                            </motion.div>
                          )}

                          {surveyStep > 1 && (
                            <div className="flex flex-row-reverse gap-4">
                              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                                <span className="material-symbols-outlined text-[20px]">person</span>
                              </div>
                              <div className="max-w-[85%] rounded-2xl rounded-tr-none bg-primary p-4 text-[14px] leading-relaxed text-white shadow-sm">
                                {surveyAnswers[1]}
                              </div>
                            </div>
                          )}

                          {surveyStep > 1 && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-4">
                              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md shadow-emerald-500/20">
                                <span className="material-symbols-outlined text-[20px]">check</span>
                              </div>
                              <div className="max-w-[85%] rounded-2xl rounded-tl-none border border-slate-100 bg-white p-4 text-[14px] leading-relaxed text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                调研完成，我已经理解您的需求。右侧是为您生成的底层领域模型与执行计划，请查阅。
                              </div>
                            </motion.div>
                          )}
                        </div>

                        {surveyStep > 1 && (
                          <div className="border-t border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                            <button
                              onClick={resetSurveyFlow}
                              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 text-[14px] font-bold text-slate-600 shadow-sm transition-all hover:text-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-primary"
                            >
                              <span className="material-symbols-outlined text-[18px]">refresh</span>
                              重新开始调研
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="relative flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
                        <div className="pointer-events-none absolute left-1/2 top-0 h-48 w-[120%] -translate-x-1/2 bg-primary/20 blur-[80px]"></div>

                        <div className="relative z-10 mb-8 flex items-center justify-between">
                          <h3 className="flex items-center gap-3 text-[16px] font-bold text-white">
                            <span className="material-symbols-outlined text-[24px] text-emerald-400">terminal</span>
                            执行计划
                          </h3>
                          {surveyStep >= 2 && (
                            <span className={`rounded-full border px-3 py-1.5 text-[12px] font-mono font-bold ${isGenerating ? 'border-amber-500/30 bg-amber-500/20 text-amber-400' : 'border-emerald-500/30 bg-emerald-500/20 text-emerald-400'}`}>
                              {isGenerating ? 'RUNNING' : 'COMPLETED'}
                            </span>
                          )}
                        </div>

                        <div className="relative z-10 flex-1 space-y-8 overflow-y-auto pr-4 custom-scrollbar">
                          {surveyStep < 2 ? (
                            <div className="flex h-full flex-col items-center justify-center space-y-4 text-slate-500">
                              <span className="material-symbols-outlined text-5xl opacity-20">hourglass_empty</span>
                              <p className="text-[14px]">等待调研完成以生成执行计划...</p>
                            </div>
                          ) : (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                              <div className="flex gap-5">
                                <div className="relative mt-0.5">
                                  <span className="material-symbols-outlined relative z-10 bg-slate-900 text-[24px] text-emerald-500">check_circle</span>
                                  <div className="absolute left-1/2 top-6 h-10 w-px -translate-x-1/2 bg-emerald-500/30"></div>
                                </div>
                                <div>
                                  <div className="text-[15px] font-bold text-slate-200">解析业务需求</div>
                                  <div className="mt-2 text-[14px] leading-relaxed text-slate-400">
                                    {surveyPlan?.summary || `已提取核心诉求：模式为“${surveyAnswers[0]}”，数据来源为“${surveyAnswers[1]}”。`}
                                  </div>
                                  {surveyPlanModel && (
                                    <div className="mt-3 inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold text-emerald-300">
                                      模型：{surveyPlanModel}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }} className="flex gap-5">
                                <div className="relative mt-0.5">
                                  <span className={`material-symbols-outlined relative z-10 bg-slate-900 text-[24px] ${isGenerating ? 'animate-spin text-amber-500' : 'text-emerald-500'}`}>
                                    {isGenerating ? 'sync' : 'check_circle'}
                                  </span>
                                  <div className={`absolute left-1/2 top-6 h-32 w-px -translate-x-1/2 ${isGenerating ? 'bg-amber-500/30' : 'bg-emerald-500/30'}`}></div>
                                </div>
                                <div>
                                  <div className="text-[15px] font-bold text-slate-200">构建领域模型 (Domain Model)</div>
                                  <div className="mt-2 text-[14px] leading-relaxed text-slate-400">基于 MiniMax 返回结果生成主档、明细与关联建议。</div>
                                  <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/80 p-4 font-mono text-[13px] leading-relaxed text-emerald-400/80 shadow-inner">
                                    {(surveyPlan?.domainModel?.length ? surveyPlan.domainModel : [
                                      '建议补充主表、明细表和日志表。',
                                      '建议建立主从关系与基础状态字段。',
                                    ]).map((item, index) => (
                                      <div key={`domain-model-${index}`}>
                                        <span className="mr-2 text-slate-500">$</span>
                                        {item}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </motion.div>

                              {!isGenerating && !surveyError && (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-5">
                                  <div className="mt-0.5 relative">
                                    <span className="material-symbols-outlined relative z-10 bg-slate-900 text-[24px] text-emerald-500">check_circle</span>
                                  </div>
                                  <div className="w-full">
                                    <div className="text-[15px] font-bold text-slate-200">生成交互原型与架构评估</div>
                                    <div className="mt-2 text-[14px] leading-relaxed text-slate-400">已输出架构方案、复杂度和开发周期建议。</div>

                                    <div className="mt-4 space-y-3 rounded-xl border border-slate-800 bg-slate-950/80 p-5 font-mono text-[13px] leading-relaxed text-emerald-400/90 shadow-inner">
                                      <div className="mb-3 flex items-center gap-2 border-b border-slate-800 pb-2 text-white/90">
                                        <span className="material-symbols-outlined text-[18px] text-primary">analytics</span>
                                        <span className="font-bold text-[14px]">架构方案评估报告 (Architecture Assessment Report)</span>
                                      </div>
                                      <p><span className="text-slate-500"># 核心模式:</span> {surveyAnswers[0]}</p>
                                      <p><span className="text-slate-500"># 数据来源:</span> {surveyAnswers[1]}</p>
                                      <p><span className="text-slate-500"># 复杂度评估:</span> <span className="text-amber-400">{surveyPlan?.complexity || '中'}</span></p>
                                      <p><span className="text-slate-500"># 预计开发周期:</span> {surveyPlan?.duration || '2-3 周'}</p>
                                      <div className="border-t border-slate-800/50 pt-2">
                                        <p className="mb-1 text-slate-400">推荐技术栈与中间件:</p>
                                        <ul className="list-disc space-y-1 pl-5 text-emerald-500/80">
                                          {(surveyPlan?.architecture?.length ? surveyPlan.architecture : [
                                            '前端: React + Vite + TailwindCSS',
                                            '后端: Node.js 代理 MiniMax API',
                                            '存储: PostgreSQL 或 SQL Server',
                                            '缓存: Redis 或本地缓存层',
                                          ]).map((item, index) => (
                                            <li key={`architecture-${index}`}>{item}</li>
                                          ))}
                                        </ul>
                                      </div>
                                      <div className="border-t border-slate-800/50 pt-2">
                                        <p className="mb-1 text-slate-400">实施建议:</p>
                                        <ul className="list-disc space-y-1 pl-5 text-emerald-300">
                                          {(surveyPlan?.recommendations?.length ? surveyPlan.recommendations : [
                                            '先完成主档与明细结构定义。',
                                            '把 AI 结果作为配置建议，不直接覆盖业务规则。',
                                          ]).map((item, index) => (
                                            <li key={`recommendation-${index}`}>{item}</li>
                                          ))}
                                        </ul>
                                      </div>
                                      <div className="border-t border-slate-800/50 pt-2 text-emerald-300">
                                        <span className="mr-2 text-slate-500">$</span> MiniMax plan ready for follow-up configuration.
                                      </div>
                                    </div>
                                  </div>
                                </motion.div>
                              )}

                              {!isGenerating && surveyError && (
                                <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-[13px] leading-6 text-rose-200">
                                  <div className="font-bold">MiniMax 调用失败</div>
                                  <div className="mt-2 break-words text-rose-100/90">{surveyError}</div>
                                  <div className="mt-3 text-rose-100/70">请先在 `.env.local` 中放入一个新的可用 API Key，再重新开始调研。</div>
                                </div>
                              )}
                            </motion.div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  {(configStep === 6) && (
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm p-10 flex-1 min-h-[500px] flex items-center justify-center">
                      <div className="text-center space-y-4">
                        <div className="size-20 bg-primary/5 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
                          <span className="material-symbols-outlined text-4xl">
                            preview
                          </span>
                        </div>
                        <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300">
                          {configSteps.find(s => s.id === configStep)?.title}内容区域
                        </h3>
                        <p className="text-slate-400 text-sm max-w-sm mx-auto leading-relaxed">
                          这里是高级配置面板的内容占位区域。您可以根据具体业务需求，在此处渲染表单、图表或预览界面。                        </p>
                      </div>
                    </div>
                  )}
                </motion.div>
              </div>

              {/* Bottom Action Bar */}
              <div
                className={`shrink-0 border-t border-slate-200 bg-white/92 backdrop-blur-xl dark:border-slate-700/70 dark:bg-slate-950/88 shadow-[0_-8px_24px_rgba(15,23,42,0.04)] ${
                  isConfigFullscreenActive ? 'px-6 lg:px-8' : 'px-6 lg:px-8'
                }`}
              >
                <div className="flex h-20 items-center justify-between gap-4">
                  <button
                    onClick={() => {
                      if (activeConfigMenu !== null && configStep === 2) {
                        return;
                      }
                      setConfigStep(Math.max(1, configStep - 1));
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-4 py-2 text-[12px] font-semibold transition-all ${
                      configStep === 1 || (activeConfigMenu !== null && configStep === 2)
                        ? 'cursor-not-allowed border-slate-200/80 bg-slate-100/70 text-slate-300 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-600'
                        : 'border-slate-200/80 bg-white/80 text-slate-600 shadow-[0_10px_30px_rgba(15,23,42,0.06)] hover:-translate-y-0.5 hover:border-primary/30 hover:text-primary dark:border-slate-700/80 dark:bg-slate-900/70 dark:text-slate-200'
                    }`}
                    disabled={configStep === 1 || (activeConfigMenu !== null && configStep === 2)}
                  >
                    <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                    上一步
                  </button>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={configStep === 2 && (isMenuInfoLoading || isMenuInfoSaving)}
                      onClick={() => {
                        void handleMenuInfoSave();
                      }}
                      className={`inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white px-4 py-2 text-[12px] font-semibold text-slate-600 shadow-[0_8px_18px_rgba(15,23,42,0.04)] transition-all dark:border-slate-700/80 dark:bg-slate-900/70 dark:text-slate-200 ${
                        configStep === 2 && (isMenuInfoLoading || isMenuInfoSaving)
                          ? 'cursor-not-allowed opacity-60'
                          : 'hover:-translate-y-0.5 hover:border-primary/30 hover:text-primary'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[20px]">save</span>
                      {configStep === 2 && isMenuInfoSaving ? (activeConfigMenu ? '保存中...' : '创建中...') : '保存本页'}
                    </button>

                    {configStep === 5 && (
                      <button
                        onClick={() => setIsFullscreenConfig((prev) => !prev)}
                        className={`inline-flex items-center gap-1.5 rounded-xl border px-4 py-2 text-[12px] font-semibold transition-all ${
                          isConfigFullscreenActive
                            ? 'border-primary/30 bg-primary/10 text-primary shadow-[0_16px_36px_rgba(49,98,255,0.18)]'
                            : 'border-slate-200/80 bg-white/80 text-slate-600 shadow-[0_12px_32px_rgba(15,23,42,0.06)] hover:-translate-y-0.5 hover:border-primary/30 hover:text-primary dark:border-slate-700/80 dark:bg-slate-900/70 dark:text-slate-200'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          {isConfigFullscreenActive ? 'fullscreen_exit' : 'fullscreen'}
                        </span>
                        {isConfigFullscreenActive ? '退出全屏' : '全屏配置'}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        if (configStep === 2 && activeConfigMenu === null) {
                          showToast('请先保存菜单信息，创建模块后再进入下一步。');
                          return;
                        }

                        const newCompleted = [...completedSteps];
                        if (!newCompleted.includes(configStep)) {
                          newCompleted.push(configStep);
                          setCompletedSteps(newCompleted);
                        }

                        const nextStep = configStep + 1;

                        if (configStep < 6) {
                          setConfigStep(nextStep);
                        } else {
                          setIsConfigOpen(false);
                        }
                      }}
                      disabled={configStep === 2 && (isMenuInfoLoading || isMenuInfoSaving || activeConfigMenu === null)}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-5 py-2 text-[12px] font-semibold text-white shadow-[0_12px_24px_rgba(49,98,255,0.2)] transition-all ${
                        configStep === 2 && (isMenuInfoLoading || isMenuInfoSaving || activeConfigMenu === null)
                          ? 'cursor-not-allowed bg-primary/60'
                          : 'bg-primary hover:-translate-y-0.5 hover:bg-erp-blue'
                      }`}
                    >
                      {configStep === 6 ? '完成配置' : '下一步'}
                      {configStep !== 6 && <span className="material-symbols-outlined text-[20px]">arrow_forward</span>}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
