import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDeferredValue, useMemo } from 'react';

interface DashboardProps {
  onLogout: () => void;
}

type Subsystem = 'finance' | 'hr' | 'supply';

const FIELD_TYPE_OPTIONS = ['文本', '数字', '下拉框', '搜索框', '日期框', '单选框', '多选框', '树形节点关联'];
const COLUMN_ALIGN_OPTIONS = ['左对齐', '居中', '右对齐'];
const TABLE_TYPE_OPTIONS = ['普通表格', '多表头', '树表格'];

const DETAIL_FILL_TYPE_OPTIONS = [
  { value: '表格', label: '表格', icon: 'table_rows', description: '适合字段型明细维护' },
  { value: '树表格', label: '树表格', icon: 'account_tree', description: '适合层级型明细展示' },
  { value: '图表', label: '图表', icon: 'bar_chart', description: '适合统计型结果呈现' },
  { value: '网页', label: '网页', icon: 'language', description: '适合外部页面嵌入' },
];

export default function Dashboard({ onLogout }: DashboardProps) {
  const [isSubsystemOpen, setIsSubsystemOpen] = useState(true);
  const [activeSubsystem, setActiveSubsystem] = useState<Subsystem>('finance');
  const [activeMenu, setActiveMenu] = useState('cost');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [configStep, setConfigStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  // Step 1: Common Functions
  const [commonFuncs, setCommonFuncs] = useState<string[]>(['import', 'export']);
  const [isFuncPopoverOpen, setIsFuncPopoverOpen] = useState(false);
  const [businessType, setBusinessType] = useState('document');
  const toggleFunc = (id: string) => setCommonFuncs(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const funcOptions = [
    { id: 'import', name: '数据导入', icon: 'upload_file' },
    { id: 'export', name: '数据导出', icon: 'download' },
    { id: 'print', name: '打印模板', icon: 'print' },
    { id: 'approve', name: '审批流', icon: 'verified' },
    { id: 'attach', name: '附件管理', icon: 'attachment' },
  ];

  // Step 2: Editor
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editorRef.current) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = document.createElement('img');
        img.src = event.target?.result as string;
        img.className = 'max-w-full h-auto rounded-xl my-4 border border-slate-200 dark:border-slate-700 shadow-sm';
        editorRef.current?.appendChild(img);
        const p = document.createElement('p');
        p.innerHTML = '<br/>';
        editorRef.current?.appendChild(p);
      };
      reader.readAsDataURL(file);
    }
  };

  // Step 3: Survey
  const [surveyStep, setSurveyStep] = useState(0);
  const [surveyAnswers, setSurveyAnswers] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Step 4: Table Builder
  const [isFullscreenEditor, setIsFullscreenEditor] = useState(false);
  const [isFullscreenConfig, setIsFullscreenConfig] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const buildColumn = (prefix: string, index: number, overrides: Record<string, any> = {}) => ({
    id: `${prefix}_${Date.now()}_${index}`,
    name: `新字段 ${index}`,
    type: '文本',
    width: 104,
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

  const buildContextMenuItem = (index: number, overrides: Record<string, any> = {}) => ({
    id: `ctx_${Date.now()}_${index}`,
    label: `右键功能 ${index}`,
    actionKey: `action_${index}`,
    disabledCondition: '',
    ...overrides,
  });

  const buildGridConfig = (mainSql: string, defaultQuery: string, overrides: Record<string, any> = {}) => ({
    mainSql,
    defaultQuery,
    tableType: '普通表格',
    contextMenuEnabled: false,
    contextMenuItems: [buildContextMenuItem(1, { label: '查看详情', actionKey: 'open-detail' })],
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
  const [mainTableColumns, setMainTableColumns] = useState([
    { id: 'm_col1', name: '物料编码', type: '文本', width: 104 },
    { id: 'm_col2', name: '物料名称', type: '文本', width: 132 },
    { id: 'm_col3', name: '规格型号', type: '文本', width: 108 },
    { id: 'm_col4', name: '单位', type: '下拉框', width: 88 },
    { id: 'm_col5', name: '单价', type: '数字', width: 92 },
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
    }),
  );
  const [detailTableConfigs, setDetailTableConfigs] = useState<Record<string, any>>({
    tab1: buildGridConfig('SELECT * FROM customer_attachment', 'archive_id = ${id}', {
      contextMenuItems: [buildContextMenuItem(1, { label: '下载附件', actionKey: 'download-file' })],
    }),
    tab2: buildGridConfig('SELECT * FROM customer_log', 'archive_id = ${id}', {
      contextMenuItems: [buildContextMenuItem(1, { label: '查看日志详情', actionKey: 'open-log-detail' })],
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
      | 'main-filter'
      | 'detail-filter'
      | 'detail-tab'
      | 'main-grid'
      | 'detail-grid'
      | 'main-context'
      | 'detail-context';
    id?: string | null;
  }>({ kind: 'main-grid' });
  const [inspectorPanelTab, setInspectorPanelTab] = useState<'common' | 'advanced'>('common');
  const [selectedLeftForDelete, setSelectedLeftForDelete] = useState<string[]>([]);
  const [selectedMainForDelete, setSelectedMainForDelete] = useState<string[]>([]);

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
  const [selectedArchiveNodeId, setSelectedArchiveNodeId] = useState('archive-main');
  const [documentLeftPaneWidth, setDocumentLeftPaneWidth] = useState(198);
  const [documentDetailPaneWidth, setDocumentDetailPaneWidth] = useState(332);
  const [documentTopPaneHeight, setDocumentTopPaneHeight] = useState(414);
  const [activeResize, setActiveResize] = useState<{
    id: string;
    label: string;
    width: number;
    mode: 'column' | 'filter';
  } | null>(null);
  const [isDetailBoardOpen, setIsDetailBoardOpen] = useState(false);
  const [detailBoardSortColumnId, setDetailBoardSortColumnId] = useState<string | null>(null);
  const [detailBoardOpenedRowId, setDetailBoardOpenedRowId] = useState<number | null>(null);
  const [previewContextMenu, setPreviewContextMenu] = useState<{
    scope: 'main' | 'detail';
    rowId: number;
    x: number;
    y: number;
    items: any[];
  } | null>(null);
  const layoutDragRef = useRef<{
    type: 'document-left-width' | 'document-detail-width' | 'document-top-height';
    startX: number;
    startY: number;
    startValue: number;
  } | null>(null);
  const resizeFrameRef = useRef<number | null>(null);

  const selectedLeftColId = inspectorTarget.kind === 'left-col' ? inspectorTarget.id ?? null : null;
  const selectedMainColId = inspectorTarget.kind === 'main-col' ? inspectorTarget.id ?? null : null;
  const selectedDetailColId = inspectorTarget.kind === 'detail-col' ? inspectorTarget.id ?? null : null;
  const selectedMainFilterId = inspectorTarget.kind === 'main-filter' ? inspectorTarget.id ?? null : null;
  const selectedDetailFilterId = inspectorTarget.kind === 'detail-filter' ? inspectorTarget.id ?? null : null;
  const selectedDetailTabId = inspectorTarget.kind === 'detail-tab' ? inspectorTarget.id ?? null : null;
  const selectedTableConfigScope = inspectorTarget.kind === 'main-grid' ? 'main' : inspectorTarget.kind === 'detail-grid' ? 'detail' : null;
  const selectedContextMenuScope = inspectorTarget.kind === 'main-context' ? 'main' : inspectorTarget.kind === 'detail-context' ? 'detail' : null;

  useEffect(() => {
    setInspectorPanelTab('common');
  }, [inspectorTarget.kind, inspectorTarget.id, activeTab]);

  const clearColumnSelection = () => {
    setInspectorTarget({ kind: 'none' });
  };

  const activateColumnSelection = (scope: 'left' | 'main' | 'detail', columnId: string | null) => {
    setInspectorTarget({
      kind: scope === 'left' ? 'left-col' : scope === 'main' ? 'main-col' : 'detail-col',
      id: columnId,
    });
  };

  const activateConditionSelection = (conditionId: string | null) => {
    setInspectorTarget(conditionId ? { kind: 'main-filter', id: conditionId } : { kind: 'none' });
  };

  const activateDetailConditionSelection = (conditionId: string | null) => {
    setInspectorTarget(conditionId ? { kind: 'detail-filter', id: conditionId } : { kind: 'none' });
  };

  const activateTableConfigSelection = (scope: 'main' | 'detail') => {
    setInspectorTarget({ kind: scope === 'main' ? 'main-grid' : 'detail-grid' });
  };

  const activateContextMenuSelection = (scope: 'main' | 'detail') => {
    setInspectorTarget({ kind: scope === 'main' ? 'main-context' : 'detail-context' });
  };

  const activateDetailTabSelection = (tabId: string | null) => {
    setInspectorTarget(tabId ? { kind: 'detail-tab', id: tabId } : { kind: 'none' });
  };

  const openDetailBoardPreview = (rowId: number, preferredSortColumnId?: string | null) => {
    setDetailBoardSortColumnId(preferredSortColumnId ?? selectedMainColId ?? mainTableColumns[0]?.id ?? null);
    setDetailBoardOpenedRowId(rowId);
    setIsDetailBoardOpen(true);
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

  const handlePasteColumns = (e: React.ClipboardEvent, setCols: React.Dispatch<React.SetStateAction<any[]>>) => {
    const text = e.clipboardData.getData('text');
    if (!text) return;
    const newColNames = text.split(/[\t\n]/).map(s => s.trim()).filter(Boolean);
    if (newColNames.length > 0) {
      e.preventDefault();
      const newCols = newColNames.map((name, i) => ({
        id: `col_${Date.now()}_${i}`,
        name,
        type: '文本',
        width: 100
      }));
      setCols(prev => [...prev, ...newCols]);
    }
  };

  const updateColType = (id: string, type: string, setCols: React.Dispatch<React.SetStateAction<any[]>>) => {
    setCols(prev => prev.map(c => c.id === id ? { ...c, type } : c));
  };

  const estimateColumnWidth = (rawColumn: any, minWidth = 80, maxWidth = 680) => {
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
    minWidth = 80,
    maxWidth = 680,
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
    minWidth = 60,
    maxWidth = 2000,
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
      ? 'h-9 w-full rounded border border-slate-300 bg-white px-3 text-[12px] text-slate-600 outline-none transition focus:border-[#1686e3] focus:ring-2 focus:ring-[#1686e3]/12 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
      : 'h-9 w-full rounded border border-slate-200/70 bg-white px-3 text-[12px] text-slate-700 outline-none transition focus:border-[#1686e3] focus:ring-2 focus:ring-[#1686e3]/12 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';
    const compactInputClass = `${inputClass} px-2.5`;
    const previewKey = `${field.id}-${field.type}-${field.dictCode}-${field.defaultValue}-${field.placeholder}`;

    const stopPreviewEvent = (event: React.SyntheticEvent) => {
      event.stopPropagation();
    };

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
                className="h-3.5 w-3.5 accent-[#1686e3]"
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
    }
  ) => {
    const showDetailAction = options?.showDetailAction ?? false;
    const contextMenuScope = options?.contextMenuScope;
    const contextMenuConfig = options?.contextMenuConfig;
    const backgroundSelectable = options?.backgroundSelectable ?? false;
    const tableSelected = options?.tableSelected ?? false;
    const onSelectTable = options?.onSelectTable;
    const canvasLabel = options?.canvasLabel ?? '点击空白区域配置表格';

    const handleColumnHeaderClick = (event: React.MouseEvent<HTMLButtonElement>, id: string) => {
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        setSelectedForDelete((prev) => (
          prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        ));
        activateColumnSelection(scope, id);
        return;
      }

      setSelectedForDelete([id]);
      activateColumnSelection(scope, id);
    };

    const minColumnWidth = isCompactModuleSetting ? 84 : 132;
    const indexColumnWidth = isCompactModuleSetting ? 36 : 44;
    const actionColumnWidth = isCompactModuleSetting ? 60 : 72;
    const totalTableWidth = cols.reduce((sum, col) => sum + Math.max(minColumnWidth, Math.round(normalizeColumn(col).width || minColumnWidth)), indexColumnWidth + actionColumnWidth);
    const visibleResizeTag = activeResize && cols.some((col) => col.id === activeResize.id) ? activeResize : null;
    const getTextAlign = (align?: string): React.CSSProperties['textAlign'] => (
      align === '居中' ? 'center' : align === '右对齐' ? 'right' : 'left'
    );

    if (cols.length === 0) {
      return (
        <div className="flex h-full min-h-[240px] items-center justify-center px-6 text-center text-slate-400">
          <div className="flex flex-col items-center gap-3">
            <div className="flex size-14 items-center justify-center rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <span className="material-symbols-outlined text-[24px] text-slate-300 dark:text-slate-500">data_object</span>
            </div>
            <div>
              <p className="text-[14px] font-bold text-slate-500 dark:text-slate-300">当前区域还没有字段</p>
              <p className="mt-1 text-[12px] text-slate-400">点击右上角新增，或直接粘贴列名批量生成。</p>
            </div>
          </div>
        </div>
      );
    }

    if (backgroundSelectable) {
      return (
        <div className={`relative flex h-full min-h-[260px] min-w-0 w-full flex-col overflow-hidden rounded-[14px] border bg-white shadow-[0_12px_22px_-22px_rgba(15,23,42,0.14)] dark:bg-slate-900/78 ${tableSelected ? 'border-[3px] border-[#e0a5b7] shadow-[0_0_0_1px_rgba(224,165,183,0.42),0_22px_40px_-24px_rgba(224,165,183,0.36)]' : 'border-slate-200 dark:border-slate-700'} ${isCompactModuleSetting ? 'p-1' : 'p-1.5'}`}>
          {visibleResizeTag && (
            <div className="pointer-events-none absolute right-3 top-3 z-30 inline-flex items-center gap-2 rounded-full border border-[#0b6bcb]/15 bg-white/96 px-3 py-1.5 text-[11px] font-bold text-[#0b6bcb] shadow-[0_18px_32px_-24px_rgba(11,107,203,0.48)] dark:border-[#0b6bcb]/20 dark:bg-slate-900/92">
              <span className="material-symbols-outlined text-[14px]">straighten</span>
              <span className="max-w-[150px] truncate">{visibleResizeTag.label}</span>
              <span className="rounded-full bg-[#0b6bcb]/8 px-2 py-0.5">{Math.round(visibleResizeTag.width)}px</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => setCols((prev) => [...prev, buildColumn(scope === 'detail' ? 'd_col' : `${scope}_col`, prev.length + 1)])}
            className={`absolute right-2 top-2 z-20 inline-flex items-center justify-center rounded-xl border border-dashed border-primary/30 bg-white/92 text-primary shadow-[0_10px_18px_-16px_rgba(22,134,227,0.32)] transition-all hover:-translate-y-0.5 hover:bg-primary/8 dark:bg-slate-900/80 ${isCompactModuleSetting ? 'size-6' : 'size-7'}`}
            title="新增字段"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
          </button>
          <table
            style={{ width: '100%', tableLayout: 'fixed' }}
            className="border-separate border-spacing-0 text-left text-[12px]"
          >
            <colgroup>
              <col style={{ width: indexColumnWidth, minWidth: indexColumnWidth }} />
              {cols.map((col) => {
                const headerWidth = Math.max(minColumnWidth, Math.round(normalizeColumn(col).width || minColumnWidth));
                return <col key={`col-${col.id}`} style={{ width: headerWidth, minWidth: headerWidth }} />;
              })}
            </colgroup>
            <thead className="sticky top-0 z-20 select-none bg-slate-50/95 dark:bg-slate-900/92">
              <tr>
                <th className={`border-b border-r border-slate-200/80 bg-[linear-gradient(180deg,rgba(250,252,255,0.98),rgba(243,247,251,0.94))] text-center font-bold uppercase tracking-[0.12em] text-slate-400 dark:border-slate-700 dark:bg-slate-900/78 ${isCompactModuleSetting ? 'px-1.5 py-2 text-[10px]' : 'px-2 py-3 text-[11px]'}`}>
                  #
                </th>
                {cols.map((col) => {
                  const normalizedCol = normalizeColumn(col);
                  const isActive = selectedId === col.id;
                  const isMarkedForDelete = selectedForDelete.includes(col.id);
                  const isResizing = activeResize?.id === col.id;
                  const headerWidth = Math.max(minColumnWidth, Math.round(normalizedCol.width || minColumnWidth));

                  return (
                    <th
                      key={col.id}
                      style={{ width: headerWidth, minWidth: headerWidth }}
                      className="group relative border-b border-r border-slate-200/80 p-0 align-top dark:border-slate-700"
                    >
                      <button
                        type="button"
                        onClick={(event) => handleColumnHeaderClick(event, col.id)}
                        className={`relative flex h-full w-full items-center overflow-hidden text-left transition-all ${isCompactModuleSetting ? 'min-h-[28px] px-2 pr-3 py-0' : 'min-h-[32px] px-2.5 pr-4 py-0'} ${
                          isActive
                            ? 'bg-[#e8f2ff] shadow-[inset_0_0_0_1px_rgba(11,107,203,0.22)] dark:bg-primary/14'
                            : isMarkedForDelete
                              ? 'bg-[linear-gradient(180deg,rgba(255,241,244,0.98),rgba(255,247,248,0.98))] shadow-[inset_0_0_0_1px_rgba(244,63,94,0.12)] dark:bg-rose-500/10'
                              : 'bg-white hover:bg-slate-50 dark:bg-slate-900/55 dark:hover:bg-slate-800/65'
                        }`}
                      >
                        <div className="flex min-w-0 flex-1 items-center">
                          <div className={`truncate font-semibold tracking-[0.01em] ${isCompactModuleSetting ? 'text-[10px]' : 'text-[11px]'} ${
                            isActive
                              ? 'text-[#0b6bcb] dark:text-primary'
                              : isMarkedForDelete
                                ? 'text-rose-500 dark:text-rose-300'
                                : 'text-slate-700 dark:text-slate-100'
                          }`} title={normalizedCol.name}>
                            {normalizedCol.name}
                          </div>
                        </div>
                      </button>
                      <div
                        className={`absolute right-0 top-0 bottom-0 z-20 flex ${isCompactModuleSetting ? 'w-2.5' : 'w-3'} cursor-col-resize items-center justify-center ${isActive ? 'bg-[#e8f2ff] dark:bg-primary/14' : ''}`}
                        onMouseDown={(e) => startResize(e, col.id, cols, setCols, 60, 2000, 'column')}
                        onDoubleClick={(e) => autoFitColumnWidth(e, col.id, cols, setCols, 60, 2000, 'column')}
                        title="拖动调整列宽，双击可自动适配"
                      >
                        <span className={`h-4 w-px rounded-full transition-all ${isResizing ? 'bg-[#0b6bcb] shadow-[0_0_0_2px_rgba(11,107,203,0.12)]' : 'bg-transparent group-hover:bg-slate-300 dark:group-hover:bg-slate-500'}`} />
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
          </table>
          <button
            type="button"
            onClick={onSelectTable}
            className={`mt-0.5 flex min-h-0 w-full flex-1 items-center justify-center rounded-[10px] border border-dashed text-center transition-all dark:border-slate-700 ${tableSelected ? 'border-[#e0a5b7] bg-[linear-gradient(180deg,rgba(224,165,183,0.14),rgba(224,165,183,0.06))] text-[#b14f6e] dark:bg-[#e0a5b7]/12' : 'border-slate-200 bg-[linear-gradient(180deg,rgba(250,252,255,0.96),rgba(245,248,252,0.98))] text-slate-400 hover:border-slate-300 hover:bg-slate-50 dark:bg-slate-900/45 dark:text-slate-500'} ${backgroundSelectable ? 'cursor-pointer' : 'cursor-default'}`}
          >
            <div className="flex flex-col items-center gap-2">
              <div className={`flex items-center justify-center rounded-2xl ${isCompactModuleSetting ? 'size-10' : 'size-12'} ${tableSelected ? 'bg-[#0b6bcb]/10' : 'bg-white dark:bg-slate-800'}`}>
                <span className={`material-symbols-outlined ${isCompactModuleSetting ? 'text-[18px]' : 'text-[20px]'} ${tableSelected ? 'text-[#0b6bcb]' : 'text-slate-300 dark:text-slate-500'}`}>table_view</span>
              </div>
              <div className={`font-semibold ${isCompactModuleSetting ? 'text-[12px]' : 'text-[13px]'} ${tableSelected ? 'text-[#0b6bcb]' : 'text-slate-500 dark:text-slate-300'}`}>
                {canvasLabel}
              </div>
              <div className="text-[11px] text-slate-400">选中后在右侧配置表格属性</div>
            </div>
          </button>
        </div>
      );
    }

    return (
      <div className={`relative min-w-max rounded-[14px] border bg-white shadow-[0_12px_22px_-22px_rgba(15,23,42,0.14)] dark:bg-slate-900/78 ${tableSelected ? 'border-primary shadow-[0_0_0_1px_rgba(14,116,144,0.2),0_16px_30px_-24px_rgba(14,116,144,0.22)]' : 'border-slate-200 dark:border-slate-700'} ${isCompactModuleSetting ? 'p-1' : 'p-1.5'}`}>
        {visibleResizeTag && (
          <div className="pointer-events-none absolute right-3 top-3 z-30 inline-flex items-center gap-2 rounded-full border border-[#1686e3]/15 bg-white/96 px-3 py-1.5 text-[11px] font-bold text-[#1686e3] shadow-[0_18px_32px_-24px_rgba(22,134,227,0.58)] dark:border-[#1686e3]/20 dark:bg-slate-900/92">
            <span className="material-symbols-outlined text-[14px]">straighten</span>
            <span className="max-w-[150px] truncate">{visibleResizeTag.label}</span>
            <span className="rounded-full bg-[#1686e3]/8 px-2 py-0.5">{Math.round(visibleResizeTag.width)}px</span>
          </div>
        )}
        <table
          style={{ minWidth: totalTableWidth }}
          className="overflow-hidden rounded-[12px] border-separate border-spacing-0 text-left text-[12px]"
        >
          <colgroup>
            <col style={{ width: indexColumnWidth, minWidth: indexColumnWidth }} />
            {cols.map((col) => {
              const headerWidth = Math.max(minColumnWidth, Math.round(normalizeColumn(col).width || minColumnWidth));
              return <col key={`col-${col.id}`} style={{ width: headerWidth, minWidth: headerWidth }} />;
            })}
            <col style={{ width: actionColumnWidth, minWidth: actionColumnWidth }} />
          </colgroup>
          <thead className="sticky top-0 z-20 select-none bg-slate-50/95 dark:bg-slate-900/92">
            <tr>
              <th className={`border-b border-r border-slate-200/80 bg-[linear-gradient(180deg,rgba(250,252,255,0.98),rgba(243,247,251,0.94))] text-center font-bold uppercase tracking-[0.12em] text-slate-400 dark:border-slate-700 dark:bg-slate-900/78 ${isCompactModuleSetting ? 'px-1.5 py-2 text-[10px]' : 'px-2 py-3 text-[11px]'}`}>
                #
              </th>
              {cols.map((col) => {
                const normalizedCol = normalizeColumn(col);
                const isActive = selectedId === col.id;
                const isMarkedForDelete = selectedForDelete.includes(col.id);
                const isResizing = activeResize?.id === col.id;
                const headerWidth = Math.max(minColumnWidth, Math.round(normalizedCol.width || minColumnWidth));

                return (
                  <th
                    key={col.id}
                    style={{ width: headerWidth, minWidth: headerWidth }}
                    className="group relative border-b border-r border-slate-200/80 p-0 align-top dark:border-slate-700"
                  >
                    <button
                      type="button"
                      onClick={(event) => handleColumnHeaderClick(event, col.id)}
                      className={`relative flex h-full w-full items-center overflow-hidden text-left transition-all ${isCompactModuleSetting ? 'min-h-[34px] px-2 pr-4 py-0' : 'min-h-[42px] px-3 pr-5 py-0'} ${
                        isActive
                          ? 'bg-[#eef6ff] shadow-[inset_0_0_0_1px_rgba(22,134,227,0.18)] dark:bg-primary/12'
                          : isMarkedForDelete
                            ? 'bg-[linear-gradient(180deg,rgba(255,241,244,0.98),rgba(255,247,248,0.98))] shadow-[inset_0_0_0_1px_rgba(244,63,94,0.12)] dark:bg-rose-500/10'
                            : 'bg-white hover:bg-slate-50 dark:bg-slate-900/55 dark:hover:bg-slate-800/65'
                      }`}
                    >
                      <div className="flex min-w-0 flex-1 items-center">
                        <div className={`truncate font-semibold tracking-[0.01em] ${isCompactModuleSetting ? 'text-[11px]' : 'text-[12px]'} ${
                          isActive
                            ? 'text-[#1686e3] dark:text-primary'
                            : isMarkedForDelete
                              ? 'text-rose-500 dark:text-rose-300'
                              : 'text-slate-700 dark:text-slate-100'
                        }`} title={normalizedCol.name}>
                          {normalizedCol.name}
                        </div>
                      </div>
                    </button>
                    <div
                      className={`absolute right-0 top-0 bottom-0 z-20 flex ${isCompactModuleSetting ? 'w-2.5' : 'w-3'} cursor-col-resize items-center justify-center ${isActive ? 'bg-[#e8f2ff] dark:bg-primary/14' : ''}`}
                      onMouseDown={(e) => startResize(e, col.id, cols, setCols, 60, 2000, 'column')}
                      onDoubleClick={(e) => autoFitColumnWidth(e, col.id, cols, setCols, 60, 2000, 'column')}
                      title="拖动调整列宽，双击可自动适配"
                    >
                      <span className={`h-4 rounded-full transition-all ${isCompactModuleSetting ? 'w-px' : 'w-px'} ${isResizing ? 'bg-[#1686e3] shadow-[0_0_0_2px_rgba(22,134,227,0.12)]' : 'bg-transparent group-hover:bg-slate-300 dark:group-hover:bg-slate-500'}`} />
                    </div>
                  </th>
                );
              })}
              <th className={`border-b border-slate-200/80 bg-[linear-gradient(180deg,rgba(250,252,255,0.98),rgba(243,247,251,0.94))] text-center dark:border-slate-700 dark:bg-slate-900/78 ${isCompactModuleSetting ? 'px-1 py-2' : 'px-2 py-3'}`}>
                <button
                  onClick={() => setCols((prev) => [...prev, buildColumn(scope === 'detail' ? 'd_col' : `${scope}_col`, prev.length + 1)])}
                  className={`inline-flex items-center justify-center rounded-2xl border border-dashed border-primary/30 bg-white/92 text-primary shadow-[0_12px_22px_-20px_rgba(22,134,227,0.45)] transition-all hover:-translate-y-0.5 hover:bg-primary/8 dark:bg-slate-900/80 ${isCompactModuleSetting ? 'size-7' : 'size-9'}`}
                  title="新增字段"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="text-slate-600 dark:text-slate-300">
            <tr>
              <td colSpan={cols.length + 2} className="p-0">
                <button
                  type="button"
                  onClick={onSelectTable}
                  className={`flex w-full flex-col items-center justify-center ${isCompactModuleSetting ? 'min-h-[180px]' : 'min-h-[220px]'} rounded-b-[10px] border-t border-slate-100 bg-[linear-gradient(180deg,rgba(250,252,255,0.92),rgba(246,249,252,0.98))] text-center transition-all hover:bg-[linear-gradient(180deg,rgba(245,249,255,0.96),rgba(240,246,252,1))] dark:border-slate-800 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(15,23,42,0.98))] ${backgroundSelectable ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  <div className={`flex items-center justify-center rounded-2xl border ${tableSelected ? 'border-primary/25 bg-primary/10 text-primary' : 'border-slate-200 bg-white text-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500'} ${isCompactModuleSetting ? 'size-10' : 'size-12'}`}>
                    <span className={`material-symbols-outlined ${isCompactModuleSetting ? 'text-[18px]' : 'text-[20px]'}`}>table_view</span>
                  </div>
                  <div className={`mt-3 font-semibold ${isCompactModuleSetting ? 'text-[12px]' : 'text-[13px]'} ${tableSelected ? 'text-primary' : 'text-slate-500 dark:text-slate-300'}`}>
                    {canvasLabel}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400">
                    选中后在右侧编辑表格属性
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
    { id: 1, title: '菜单信息', desc: '基础路由与权限配置' },
    { id: 2, title: '模块介绍', desc: '功能概述与使用说明' },
    { id: 3, title: '调研过程', desc: 'AI 深度业务需求分析' },
    { id: 4, title: '模块设置', desc: '字段、表单与流程编排' },
    { id: 5, title: '模块预览', desc: '实时交互效果演示' }
  ];

  const subsystems = [
    { id: 'finance', name: '财务管理' },
    { id: 'hr', name: '人力资源' },
    { id: 'supply', name: '供应链管理' }
  ];

  const menuData = {
    finance: [
      { id: 'cost', name: '成本控制', icon: 'payments' },
      { id: 'fund', name: '资金结算', icon: 'account_balance_wallet' },
      { id: 'tax', name: '税务申报', icon: 'receipt_long' }
    ],
    hr: [
      { id: 'employee', name: '员工管理', icon: 'badge' },
      { id: 'payroll', name: '薪酬管理', icon: 'monetization_on' },
      { id: 'performance', name: '绩效考核', icon: 'trending_up' }
    ],
    supply: [
      { id: 'procurement', name: '采购管理', icon: 'shopping_cart' },
      { id: 'inventory', name: '库存管理', icon: 'inventory' },
      { id: 'logistics', name: '物流跟踪', icon: 'local_shipping' }
    ]
  };

  const handleMenuClick = (menuId: string) => {
    setActiveMenu(menuId);
  };

  const activeMenuName = menuData[activeSubsystem].find(m => m.id === activeMenu)?.name || '';
  const isModuleSettingStep = isConfigOpen && configStep === 4;
  const isConfigFullscreenActive = isModuleSettingStep && isFullscreenConfig;
  const isCompactModuleSetting = isModuleSettingStep && !isFullscreenConfig;
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
    setInspectorTarget((prev) => {
      if (prev.kind === 'detail-col' || prev.kind === 'detail-filter') {
        return { kind: 'none' };
      }
      if (prev.kind === 'detail-tab' && prev.id && prev.id !== activeTab) {
        return { kind: 'detail-tab', id: activeTab };
      }
      return prev;
    });
    setPreviewContextMenu(null);
  }, [activeTab]);

  useEffect(() => {
    setInspectorTarget((prev) => prev.kind === 'detail-filter' ? { kind: 'none' } : prev);
  }, []);

  useEffect(() => {
    if (!treeRelationColumn) {
      setInspectorTarget((prev) => (prev.kind === 'left-col' ? { kind: 'none' } : prev));
      return;
    }

    const sourceFields = parsedTreeSourceFields.length > 0 ? parsedTreeSourceFields : ['node_id', 'node_name', 'parent_id'];
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
  }, [parsedTreeSourceFields, treeRelationColumn]);

  useEffect(() => {
    if (!isConfigOpen || configStep !== 4) {
      setIsFullscreenConfig(false);
    }
  }, [configStep, isConfigOpen]);

  useEffect(() => {
    const handlePointerMove = (event: MouseEvent) => {
      if (!layoutDragRef.current) return;

      const drag = layoutDragRef.current;
      if (drag.type === 'document-left-width') {
        const delta = event.clientX - drag.startX;
        setDocumentLeftPaneWidth(Math.min(280, Math.max(170, drag.startValue + delta)));
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
    const closeContextMenu = () => setPreviewContextMenu(null);

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
                    className={`group flex min-w-[148px] items-center gap-2 rounded-[14px] border px-2 py-1.5 transition-all ${
                      isActive
                        ? 'border-primary/25 bg-slate-50 text-slate-900 shadow-[0_10px_18px_-18px_rgba(14,116,144,0.3)] dark:bg-slate-800 dark:text-white'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-primary/20 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300'
                    }`}
                  >
                    <button
                      onClick={() => setActiveTab(tab.id)}
                      className="flex min-w-0 flex-1 items-center gap-2.5 rounded-[12px] px-2 py-1 text-left"
                    >
                      <div className={`flex size-8 shrink-0 items-center justify-center rounded-xl ${
                        isActive ? 'bg-primary/12 text-primary' : 'bg-slate-50 text-slate-400 dark:bg-slate-800'
                      }`}>
                        <span className="material-symbols-outlined text-[16px]">{tabMeta.icon}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[12px] font-semibold">{tab.name}</div>
                        <div className="mt-0.5 truncate text-[10px] text-slate-400">{tabMeta.label}</div>
                      </div>
                    </button>
                    {detailTabs.length > 1 && (
                      <button
                        onClick={(e) => deleteTab(tab.id, e)}
                        className="flex size-8 shrink-0 items-center justify-center rounded-2xl text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/10"
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
                      onClick={() => {
                        setDetailTableColumns((prev) => ({
                          ...prev,
                          [activeTab]: prev[activeTab].filter((c) => !selectedDetailForDelete.includes(c.id)),
                        }));
                        setSelectedDetailForDelete([]);
                      }}
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
    const deferredSelectedLeftColId = deferredInspectorTarget.kind === 'left-col' ? deferredInspectorTarget.id ?? null : null;
    const deferredSelectedMainColId = deferredInspectorTarget.kind === 'main-col' ? deferredInspectorTarget.id ?? null : null;
    const deferredSelectedDetailColId = deferredInspectorTarget.kind === 'detail-col' ? deferredInspectorTarget.id ?? null : null;
    const deferredSelectedMainFilterId = deferredInspectorTarget.kind === 'main-filter' ? deferredInspectorTarget.id ?? null : null;
    const deferredSelectedDetailFilterId = deferredInspectorTarget.kind === 'detail-filter' ? deferredInspectorTarget.id ?? null : null;
    const deferredSelectedDetailTabId = deferredInspectorTarget.kind === 'detail-tab' ? deferredInspectorTarget.id ?? null : null;
    const deferredSelectedTableConfigScope = deferredInspectorTarget.kind === 'main-grid' ? 'main' : deferredInspectorTarget.kind === 'detail-grid' ? 'detail' : null;
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

    if (deferredSelectedTableConfigScope === 'main') {
      return {
        kind: 'grid' as const,
        scope: 'main-grid' as const,
        title: '主表配置',
        description: '控制主表的主 SQL、默认查询条件和表格展示类型。',
        icon: 'table_view',
        iconClass: 'bg-cyan-500/12 text-cyan-500',
        column: mainTableConfig,
        setCols: setMainTableConfig,
        removeLabel: '',
      };
    }

    if (deferredSelectedTableConfigScope === 'detail') {
      return {
        kind: 'grid' as const,
        scope: 'detail-grid' as const,
        title: `明细表配置 · ${activeDetailTabName}`,
        description: '控制当前明细表的主 SQL、默认查询条件和表格展示类型。',
        icon: 'table_chart',
        iconClass: 'bg-sky-500/12 text-sky-500',
        column: detailTableConfigs[panelTabId] ?? { mainSql: '', defaultQuery: '', tableType: '普通表格' },
        setCols: (updater: React.SetStateAction<any>) => {
          setDetailTableConfigs((prev) => ({
            ...prev,
            [panelTabId]: typeof updater === 'function' ? updater(prev[panelTabId] ?? { mainSql: '', defaultQuery: '', tableType: '普通表格' }) : updater,
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
      const column = mainTableColumns.find((item) => item.id === deferredSelectedMainColId);
      return column
        ? {
            kind: 'column' as const,
            scope: 'main' as const,
            title: '基础档案主表',
            description: '控制中间主表区域的字段样式、联动与展示行为。',
            icon: 'table_rows',
            iconClass: 'bg-emerald-500/12 text-emerald-500',
            column,
            setCols: setMainTableColumns,
            removeLabel: '删除列',
          }
        : null;
    }

    if (deferredSelectedDetailColId) {
      const detailCols = detailTableColumns[panelTabId] || [];
      const column = detailCols.find((item) => item.id === deferredSelectedDetailColId);
      return column
        ? {
            kind: 'column' as const,
            scope: 'detail' as const,
            title: `明细页签 · ${activeDetailTabName}`,
            description: '控制最右详情区字段与页签表格的展示、校验和业务联动。',
            icon: 'receipt_long',
            iconClass: 'bg-blue-500/12 text-blue-500',
            column,
            setCols: makeDetailSetter,
            removeLabel: '删除列',
          }
        : null;
    }

    return null;
  }, [
    deferredActiveTab,
    deferredInspectorTarget,
    detailTabs,
    leftTableColumns,
    mainTableColumns,
    detailTableColumns,
    mainFilterFields,
    detailFilterFields,
    mainTableConfig,
    detailTableConfigs,
    detailTabConfigs,
  ]);

  const renderColumnOperationPanel = () => {
    const fieldClass = 'w-full rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-[12px] text-slate-700 outline-none transition focus:border-primary/35 focus:ring-2 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100';
    const textareaClass = `${fieldClass} min-h-[78px] resize-none font-mono text-[11px] leading-5`;
    const isCommonPanelTab = inspectorPanelTab === 'common';
    const panelShellClass = 'flex h-full min-h-0 flex-col overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-[0_16px_30px_-28px_rgba(15,23,42,0.16)] dark:border-slate-700 dark:bg-slate-900/94';
    const panelHeaderClass = 'border-b border-slate-200/70 bg-slate-50/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/88';
    const panelTitleClass = 'text-[14px] font-bold leading-5 text-slate-800 break-words dark:text-slate-100';
    const panelDescClass = 'mt-1 text-[11px] leading-5 text-slate-400 break-words';
    const panelBadgeClass = 'inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300';
    const panelIconShellClass = 'flex size-9 shrink-0 items-center justify-center rounded-xl';
    const compactInfoCardClass = 'rounded-[14px] border border-slate-200/80 bg-slate-50/85 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] dark:border-slate-700 dark:bg-slate-900/55';
    const renderInspectorTabs = () => (
      <div className="mt-3 inline-flex rounded-full border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800/80">
        <button
          type="button"
          onClick={() => setInspectorPanelTab('common')}
          className={`inline-flex h-8 items-center justify-center rounded-full px-3 text-[11px] font-bold whitespace-nowrap transition-all ${
            isCommonPanelTab
              ? 'bg-white text-primary shadow-sm dark:bg-slate-900'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-300'
          }`}
        >
          常用
        </button>
        <button
          type="button"
          onClick={() => setInspectorPanelTab('advanced')}
          className={`inline-flex h-8 items-center justify-center rounded-full px-3 text-[11px] font-bold whitespace-nowrap transition-all ${
            !isCommonPanelTab
              ? 'bg-white text-primary shadow-sm dark:bg-slate-900'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-300'
          }`}
        >
          不常用
        </button>
      </div>
    );
    const compactCardClass = 'rounded-[16px] border border-slate-200/80 bg-white p-3.5 shadow-[0_12px_24px_-24px_rgba(15,23,42,0.16)] dark:border-slate-700 dark:bg-slate-900/55';
    const renderAdvancedPlaceholder = (title: string, description: string) => (
      <section className="rounded-[24px] border border-dashed border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.78),rgba(255,255,255,0.94))] px-5 py-8 text-center dark:border-slate-700 dark:bg-slate-900/35">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-white text-[#1686e3] shadow-[0_18px_30px_-24px_rgba(22,134,227,0.55)] dark:bg-slate-800">
          <span className="material-symbols-outlined text-[20px]">inventory_2</span>
        </div>
        <div className="mt-4 text-[14px] font-bold text-slate-700 dark:text-slate-100">{title}</div>
        <div className="mt-2 text-[12px] leading-relaxed text-slate-400">{description}</div>
      </section>
    );

    if (!selectedColumnContext) {
      return (
        <div className={panelShellClass}>
          <div className={panelHeaderClass}>
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-3xl bg-primary/10 text-primary">
                <span className="material-symbols-outlined text-[20px]">tune</span>
              </div>
              <div>
                <h3 className={panelTitleClass}>详细配置</h3>
                <p className={panelDescClass}>从顶部条件区、表头列名或表格标题区点选对象，所有配置都会固定收敛到这里。</p>
              </div>
            </div>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center px-8 py-10">
            <div className="w-full rounded-[26px] border border-dashed border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.75),rgba(255,255,255,0.92))] px-6 py-10 text-center dark:border-slate-700 dark:bg-slate-900/40">
              <div className="mx-auto flex size-16 items-center justify-center rounded-[24px] bg-white text-primary shadow-[0_24px_34px_-24px_rgba(14,116,144,0.55)] dark:bg-slate-800">
                <span className="material-symbols-outlined text-[28px]">touch_app</span>
              </div>
              <div className="mt-5 text-[15px] font-bold text-slate-700 dark:text-slate-100">先点选一个条件或列头</div>
              <p className="mt-2 text-[12px] leading-relaxed text-slate-400">
                右侧会固定显示当前对象的名称、类型、宽度、校验、展示属性和业务联动配置；表格级配置请直接点主表或明细表标题。
              </p>
              <div className="mt-6 grid gap-3 text-left text-[12px] text-slate-500 dark:text-slate-400">
                {[
                  '基础定义：名称、类型、宽度、对齐',
                  '交互属性：必填、显示、搜索、只读、默认值',
                  '业务联动：字典值、公式、关联 SQL、动态 SQL',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white/70 px-3.5 py-3 dark:border-slate-700 dark:bg-slate-900/40">
                    <span className="material-symbols-outlined text-[16px] text-primary">check_circle</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
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
                <p className={`${panelDescClass} max-w-[260px]`}>{selectedColumnContext.description}</p>
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
                  <div className="mt-2 text-[11px] leading-relaxed text-slate-400">只有命中复杂状态时再来这里配置，常规页签联动先放在“常用”。</div>
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
      const menuItems = currentContextConfig.contextMenuItems ?? [];
      const enabledMenuCount = menuItems.filter((item: any) => !item.disabledCondition).length;

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
                <p className={`${panelDescClass} max-w-[260px]`}>{selectedColumnContext.description}</p>
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
                      <div className="mt-1 text-[12px] leading-relaxed text-slate-400">控制右键菜单是否启用，并预览当前菜单结构。</div>
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
                              const isDisabled = Boolean(item.disabledCondition);

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
                    <div>
                      <div className="text-[14px] font-bold text-slate-800 dark:text-slate-100">菜单项编辑</div>
                      <div className="mt-1 text-[12px] text-slate-400">常用里先维护菜单名称和动作标识，复杂禁用规则放到“不常用”。</div>
                    </div>
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
                                <div className="mt-1 text-[11px] text-slate-400">这项会直接出现在预览区右键菜单中。</div>
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
                        还没有配置右键菜单，点击右上角“新增菜单”开始。
                      </div>
                    )}
                  </div>
                </section>
              </>
            ) : (
              <section className="rounded-[26px] border border-slate-200/70 bg-white/84 p-5 shadow-[0_22px_48px_-38px_rgba(15,23,42,0.32)] dark:border-slate-700 dark:bg-slate-900/45">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[14px] font-bold text-slate-800 dark:text-slate-100">禁用规则</div>
                    <div className="mt-1 text-[12px] text-slate-400">只有需要按状态、权限或条件禁用右键项时再配置这里。</div>
                  </div>
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
                            item.disabledCondition ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300'
                          }`}>
                            {item.disabledCondition ? '已配置禁用条件' : '默认可用'}
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
                    renderAdvancedPlaceholder('还没有高级右键规则', '先在“常用”里创建菜单项，只有要做禁用条件时再回到这里。')
                  )}
                </div>
              </section>
            )}
          </div>
        </div>
      );
    }

    if (selectedColumnContext.kind === 'grid') {
      const currentGridConfig = selectedColumnContext.column;
      const updateGridConfig = (patch: Record<string, any>) => {
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
                  <span className={panelBadgeClass}>表格级配置</span>
                </div>
                <p className={`${panelDescClass} max-w-[260px]`}>{selectedColumnContext.description}</p>
                {renderInspectorTabs()}
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-5">
            {isCommonPanelTab ? (
              <section className={compactCardClass}>
                <div className="mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-primary">table_chart</span>
                  <h4 className="text-[13px] font-bold text-slate-800 dark:text-slate-100">表格属性</h4>
                </div>
                <div className="grid gap-4">
                  <div>
                    <label className="mb-1.5 block text-[12px] font-bold text-slate-500">表格类型</label>
                    <select
                      value={currentGridConfig.tableType}
                      onChange={(e) => updateGridConfig({ tableType: e.target.value })}
                      className={fieldClass}
                    >
                      {TABLE_TYPE_OPTIONS.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                  <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-[12px] font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900/45 dark:text-slate-200">
                    <span>启用右键菜单</span>
                    <input
                      type="checkbox"
                      checked={Boolean(currentGridConfig.contextMenuEnabled)}
                      onChange={(e) => updateGridConfig({ contextMenuEnabled: e.target.checked })}
                      className="h-4 w-4 rounded accent-[#1686e3]"
                    />
                  </label>
                </div>
              </section>
            ) : (
              renderAdvancedPlaceholder('表格高级项先留空', '这里只保留表格外观和交互属性，数据源不再在这里维护。')
            )}
          </div>
        </div>
      );
    }

    const isConditionConfig = selectedColumnContext.kind === 'condition';
    const currentColumn = isConditionConfig
      ? normalizeConditionField(selectedColumnContext.column)
      : normalizeColumn(selectedColumnContext.column);
    const updateColumn = (patch: Record<string, any>) => {
      selectedColumnContext.setCols((prev) => prev.map((item) => (
        item.id === currentColumn.id ? { ...item, ...patch } : item
      )));
    };

    const removeCurrentColumn = () => {
      selectedColumnContext.setCols((prev) => prev.filter((item) => item.id !== currentColumn.id));
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
                </div>
                <p className={`${panelDescClass} max-w-[240px]`}>{selectedColumnContext.description}</p>
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

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className={compactInfoCardClass}>
              <div className="text-[11px] font-bold tracking-[0.08em] text-slate-400">{isConditionConfig ? '条件标识' : '字段标识'}</div>
              <div className="mt-1 break-all font-mono text-[12px] leading-5 text-slate-600 dark:text-slate-200">{currentColumn.id}</div>
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
                  <div className="mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-primary">view_list</span>
                    <h4 className="text-[13px] font-bold text-slate-800 dark:text-slate-100">{isConditionConfig ? '条件定义' : '基础定义'}</h4>
                  </div>
                  <div className="grid gap-4">
                    <div>
                      <label className="mb-1.5 block text-[12px] font-bold text-slate-500">{isConditionConfig ? '条件名称' : '字段名称'}</label>
                      <input
                        type="text"
                        value={currentColumn.name}
                        onChange={(e) => updateColumn({ name: e.target.value })}
                        className={fieldClass}
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-[12px] font-bold text-slate-500">{isConditionConfig ? '控件类型' : '字段类型'}</label>
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
                        <label className="mb-1.5 block text-[12px] font-bold text-slate-500">{isConditionConfig ? '控件宽度 (px)' : '列宽 (px)'}</label>
                        <input
                          type="number"
                          min={80}
                          value={Math.round(currentColumn.width)}
                          onChange={(e) => updateColumn({ width: Math.max(80, Number(e.target.value) || 80) })}
                          className={fieldClass}
                        />
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-[12px] font-bold text-slate-500">对齐方式</label>
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
                        <label className="mb-1.5 block text-[12px] font-bold text-slate-500">默认值</label>
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
                      <label className="mb-1.5 block text-[12px] font-bold text-slate-500">{isConditionConfig ? '提示文案' : '占位提示'}</label>
                      <input
                        type="text"
                        value={currentColumn.placeholder}
                        onChange={(e) => updateColumn({ placeholder: e.target.value })}
                        placeholder={isConditionConfig ? '用于顶部条件区展示的提示文案' : '用于表单输入提示'}
                        className={fieldClass}
                      />
                    </div>
                  </div>
                </section>

                <section className={compactCardClass}>
                  <div className="mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-primary">toggle_on</span>
                    <h4 className="text-[13px] font-bold text-slate-800 dark:text-slate-100">{isConditionConfig ? '条件属性' : '交互属性'}</h4>
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
                          <div className="mt-1 text-[11px] leading-relaxed text-slate-400">{item.desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </section>
              </>
            ) : (
              <>
                <section className={compactCardClass}>
                  <div className="mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-primary">toggle_on</span>
                    <h4 className="text-[13px] font-bold text-slate-800 dark:text-slate-100">高级属性</h4>
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
                          <div className="mt-1 text-[11px] leading-relaxed text-slate-400">{item.desc}</div>
                        </div>
                      </label>
                    ))}
                    <div>
                      <label className="mb-1.5 block text-[12px] font-bold text-slate-500">帮助文案</label>
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
                  <div className="mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-primary">hub</span>
                    <h4 className="text-[13px] font-bold text-slate-800 dark:text-slate-100">{isConditionConfig ? '查询联动' : '业务联动'}</h4>
                  </div>
                  <div className="grid gap-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-[12px] font-bold text-slate-500">{isConditionConfig ? '下拉数据 / 值集' : '关联字典 / 值集'}</label>
                        <input
                          type="text"
                          value={currentColumn.dictCode}
                          onChange={(e) => updateColumn({ dictCode: e.target.value })}
                          placeholder={isConditionConfig ? '例如：正常,停用,草稿' : '例如：material_status'}
                          className={fieldClass}
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[12px] font-bold text-slate-500">{isConditionConfig ? '默认表达式' : '公式 / 计算表达式'}</label>
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
                      <label className="mb-1.5 block text-[12px] font-bold text-slate-500">{isConditionConfig ? '条件 SQL / 取数逻辑' : '关联 SQL'}</label>
                      <textarea
                        rows={3}
                        value={currentColumn.relationSql}
                        onChange={(e) => updateColumn({ relationSql: e.target.value })}
                        placeholder={isConditionConfig ? 'SELECT code, name FROM ...' : 'SELECT id, name FROM ... '}
                        className={textareaClass}
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[12px] font-bold text-slate-500">{isConditionConfig ? '联动 SQL / 条件表达式' : '动态 SQL / 条件表达式'}</label>
                      <textarea
                        rows={3}
                        value={currentColumn.dynamicSql}
                        onChange={(e) => updateColumn({ dynamicSql: e.target.value })}
                        placeholder={isConditionConfig ? 'WHERE org_id = ${orgId} AND enable = 1' : 'WHERE org_id = ${orgId}'}
                        className={textareaClass}
                      />
                    </div>
                  </div>
                </section>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  const columnOperationPanel = useMemo(() => renderColumnOperationPanel(), [selectedColumnContext, inspectorPanelTab]);

  const renderDocumentTreePanel = () => {
    if (!treeRelationColumn) return null;

    const sourceFields = leftTableColumns.length > 0 ? leftTableColumns : [
      buildColumn('tree_col', 1, { name: 'node_id', sourceField: 'node_id', width: 148 }),
      buildColumn('tree_col', 2, { name: 'node_name', sourceField: 'node_name', width: 176 }),
      buildColumn('tree_col', 3, { name: 'parent_id', sourceField: 'parent_id', width: 148 }),
    ];

    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[8px] border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900">
        <div className="border-b border-slate-300 bg-[#f7f9fc] px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800/80">
          <div className="flex items-start gap-2">
            <div className="flex size-8 items-center justify-center rounded-2xl bg-[#1686e3]/10 text-[#1686e3]">
              <span className="material-symbols-outlined text-[16px]">account_tree</span>
            </div>
            <div className="min-w-0">
              <div className="text-[13px] font-bold text-slate-700 dark:text-slate-100">左侧树节点</div>
              <div className="mt-1 text-[11px] leading-relaxed text-slate-400">
                已从“{treeRelationColumn.name}”的动态 SQL 自动解析字段，点节点字段可直接改中文名。
              </div>
            </div>
          </div>
        </div>
        <div className="border-b border-slate-200/80 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
          <div className="rounded-[16px] border border-slate-200/70 bg-slate-50/80 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/45">
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">动态 SQL</div>
            <div className="mt-1 line-clamp-3 font-mono text-[11px] leading-relaxed text-slate-500 dark:text-slate-300">
              {treeRelationColumn.dynamicSql || '未配置动态 SQL，当前按默认树节点字段生成。'}
            </div>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto px-2 py-3">
          <div className="rounded-[18px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,249,252,0.96))] p-2 shadow-[0_16px_32px_-28px_rgba(15,23,42,0.35)] dark:border-slate-700 dark:bg-slate-900/45">
            <div className="flex items-center gap-2 rounded-[14px] bg-[#eef6ff] px-3 py-2 text-[12px] font-bold text-[#1686e3] dark:bg-primary/10 dark:text-primary">
              <span className="material-symbols-outlined text-[16px]">folder_open</span>
              <span className="truncate">{activeMenuName || '基础档案树'}</span>
            </div>
            <div className="mt-2 ml-4 border-l border-dashed border-slate-200 pl-3 dark:border-slate-700">
              {sourceFields.map((field, index) => {
                const isActive = selectedLeftColId === field.id;

                return (
                  <button
                    key={field.id}
                    type="button"
                    onClick={() => activateColumnSelection('left', field.id)}
                    className={`group mt-1 flex w-full items-center gap-2 rounded-[14px] px-3 py-2 text-left transition-all ${
                      isActive
                        ? 'bg-[#eef6ff] text-[#1686e3] shadow-[inset_0_0_0_1px_rgba(22,134,227,0.16)] dark:bg-primary/10 dark:text-primary'
                        : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/70'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[15px] text-slate-400">subdirectory_arrow_right</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12px] font-bold">{field.name}</div>
                      <div className="mt-1 truncate font-mono text-[10px] text-slate-400">{field.sourceField || `field_${index + 1}`}</div>
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
      onSelect: (id: string) => void;
      onAdd: () => void;
      onDelete: () => void;
      setFields: React.Dispatch<React.SetStateAction<any[]>>;
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
    const activeFilterResize = activeResize?.mode === 'filter' && filterFields.some((field) => field.id === activeResize.id)
      ? activeResize
      : null;
    const hideActionBar = options?.hideActionBar ?? false;

    return (
      <>
        <div className="relative border-b border-slate-200 bg-slate-50/90 px-2.5 py-2 dark:border-slate-700 dark:bg-slate-900/82">
          {activeFilterResize && (
            <div className="pointer-events-none absolute right-3 top-2 z-10 inline-flex items-center gap-2 rounded-full border border-[#1686e3]/15 bg-white/96 px-3 py-1 text-[11px] font-bold text-[#1686e3] shadow-[0_18px_32px_-24px_rgba(22,134,227,0.58)] dark:border-[#1686e3]/20 dark:bg-slate-900/92">
              <span className="material-symbols-outlined text-[13px]">tune</span>
              <span className="max-w-[140px] truncate">{activeFilterResize.label}</span>
              <span className="rounded-full bg-[#1686e3]/8 px-2 py-0.5">{Math.round(activeFilterResize.width)}px</span>
            </div>
          )}
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                {filterFields.map((field, index) => {
                  const normalizedField = normalizeConditionField(field);
                  const isActive = filterConfig?.selectedId === field.id;
                  const filterWidth = Math.max(320, Math.min(520, (normalizedField.width || 220) + 108));

                  return (
                    <div
                      key={field.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => filterConfig?.onSelect(field.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          filterConfig?.onSelect(field.id);
                        }
                      }}
                      style={{ width: filterWidth, minWidth: filterWidth }}
                      className={`group relative grid shrink-0 grid-cols-[88px_minmax(0,1fr)] items-center overflow-hidden rounded-xl border transition-colors ${
                        isActive
                          ? 'border-[#1686e3] bg-[#eef6ff] shadow-[inset_0_0_0_1px_rgba(22,134,227,0.14)] dark:border-[#1686e3] dark:bg-primary/10'
                          : 'border-slate-300 bg-white hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900'
                      }`}
                    >
                      <span className={`border-r px-2.5 py-2 text-[11px] font-semibold ${
                        isActive
                          ? 'border-[#cfe4fd] bg-[#e8f2ff] text-[#1686e3] dark:border-primary/20 dark:bg-primary/12'
                          : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}>
                        {normalizedField.name}
                      </span>
                      <div className="min-w-0 flex-1 px-2 py-1 text-left">
                        {renderFieldPreview(normalizedField, index, 'filter')}
                      </div>
                      <div
                        className="absolute right-0 top-1 bottom-1 flex w-1.5 cursor-col-resize items-center justify-center opacity-0 transition-opacity group-hover:opacity-100"
                        onMouseDown={(event) => startResize(event, field.id, filterFields, filterConfig.setFields, 160, 620, 'filter')}
                        onDoubleClick={(event) => autoFitColumnWidth(event, field.id, filterFields, filterConfig.setFields, 160, 620, 'filter')}
                        title="拖动调整条件宽度，双击可自动适配"
                      >
                        <span className="h-4 w-px rounded-full bg-slate-300 transition-colors group-hover:bg-[#1686e3] dark:bg-slate-700 dark:group-hover:bg-[#1686e3]" />
                      </div>
                    </div>
                  );
                })}
                {filterConfig && (
                    <button
                      type="button"
                      onClick={filterConfig.onAdd}
                      className="inline-flex h-8 shrink-0 items-center justify-center rounded-xl border border-dashed border-primary/35 bg-white px-2.5 text-[11px] font-semibold text-primary transition-colors hover:bg-[#f4f9ff] dark:border-primary/25 dark:bg-slate-900"
                    >
                      <span className="material-symbols-outlined text-[15px]">playlist_add</span>
                      条件
                    </button>
                )}
              </div>
            </div>
            <div className="flex shrink-0 items-center self-center rounded-[14px] border border-slate-200/80 bg-white/90 px-2 py-1 shadow-[0_12px_26px_-22px_rgba(15,23,42,0.35)] dark:border-slate-700 dark:bg-slate-900/90">
              {filterConfig && (
                <button
                  type="button"
                  onClick={filterConfig.onDelete}
                  disabled={!filterConfig.selectedId}
                  className={`inline-flex h-9 items-center justify-center rounded px-3 text-[12px] font-bold transition-colors ${
                    filterConfig.selectedId
                      ? 'text-slate-600 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800'
                      : 'cursor-not-allowed text-slate-300 dark:text-slate-600'
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px]">delete</span>
                  删除条件
                </button>
              )}
              <div className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-700" />
              <button className="inline-flex h-8 items-center justify-center rounded-xl bg-primary px-3.5 text-[11px] font-semibold text-white transition-colors hover:bg-erp-blue">
                <span className="material-symbols-outlined text-[16px]">search</span>
                查询
              </button>
            </div>
          </div>
        </div>
        {!hideActionBar && (
          <div className="flex items-center justify-between border-b border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
            <button
              type="button"
              onClick={tableConfigAction?.onSelect}
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[12px] font-bold transition-colors ${
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
                className="inline-flex items-center gap-1 rounded border border-[#1686e3] bg-[#1686e3] px-3 py-1.5 text-[12px] font-bold text-white transition-colors hover:bg-[#1176ca]"
              >
                <span className="material-symbols-outlined text-[14px]">add</span>
                新增
              </button>
              <button
                onClick={onDelete}
                disabled={selectedCount === 0}
                className={`inline-flex items-center gap-1 rounded border px-3 py-1.5 text-[12px] font-bold transition-colors ${
                  selectedCount > 0
                    ? 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
                    : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-300 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-600'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">delete</span>
                删除
              </button>
              <button className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-3 py-1.5 text-[12px] font-bold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                <span className="material-symbols-outlined text-[14px]">save</span>
                保存
              </button>
            </div>
          </div>
        )}
      </>
    );
  };

  const renderDocumentDetailWorkbench = () => {
    const detailCols = detailTableColumns[activeTab] || [];
    const activeTabName = detailTabs.find((tab) => tab.id === activeTab)?.name || '明细页签';

    return (
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50/85 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-900/82">
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
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all ${
                    activeTab === tab.id
                      ? 'border-[#1686e3] bg-[#1686e3] text-white shadow-[0_18px_30px_-20px_rgba(22,134,227,0.8)]'
                      : 'border-slate-200 bg-slate-50/80 text-slate-600 hover:border-slate-300 hover:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                  }`}
                >
                  {tab.name}
                  {detailTabs.length > 1 && (
                    <span
                      onClick={(event) => deleteTab(tab.id, event)}
                      className={`material-symbols-outlined text-[14px] ${activeTab === tab.id ? 'text-white/90' : 'text-slate-400'}`}
                    >
                      close
                    </span>
                  )}
                </button>
              ))}
              <button
                onClick={addTab}
                className="inline-flex items-center gap-1 rounded-full border border-dashed border-primary/35 bg-white px-2.5 py-1 text-[11px] font-semibold text-primary dark:border-primary/25 dark:bg-slate-900"
              >
                <span className="material-symbols-outlined text-[14px]">add</span>
                新页签
              </button>
            </div>
          </div>
        </div>
        {currentDetailFillType === '表格' ? (
          <div className="min-h-0 flex-1 overflow-auto bg-white outline-none dark:bg-slate-900"
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
                canvasLabel: '点击配置明细表属性',
              },
            )}
          </div>
        ) : (
          <div className="min-h-0 flex-1 bg-white p-3 dark:bg-slate-900">
            {renderDetailFillPlaceholder()}
          </div>
        )}
        <div className="shrink-0 border-t border-slate-200 bg-slate-50/90 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-900/82">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-[12px] font-bold text-slate-400">明细填充方式</div>
            <div className="flex flex-wrap items-center gap-2">
              {DETAIL_FILL_TYPE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setTabFillTypes((prev) => ({ ...prev, [activeTab]: option.value }))}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-bold transition-all ${
                    currentDetailFillType === option.value
                      ? 'border-[#1686e3] bg-[#eef6ff] text-[#1686e3] shadow-[0_14px_24px_-20px_rgba(22,134,227,0.45)] dark:border-[#1686e3]/30 dark:bg-primary/10 dark:text-primary'
                      : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
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
    const enabledCount = previewContextMenu.items.filter((item: any) => !item.disabledCondition).length;

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
                const isDisabled = Boolean(item.disabledCondition);

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
                          <span className="truncate text-[10px] text-rose-400">禁用: {item.disabledCondition}</span>
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

  const renderDetailBoardModal = () => {
    if (!isDetailBoardOpen) return null;

    const sortColumnId = detailBoardSortColumnId || mainTableColumns[0]?.id || null;
    const previewRows = Array.from({ length: 6 }).map((_, rowIndex) => ({
      id: rowIndex + 1,
      values: mainTableColumns.reduce<Record<string, string>>((result, column) => {
        result[column.id] = getPreviewCellValue(column, rowIndex);
        return result;
      }, {}),
    }));

    const sortedRows = sortColumnId
      ? [...previewRows].sort((left, right) => (
          `${left.values[sortColumnId] ?? ''}`.localeCompare(`${right.values[sortColumnId] ?? ''}`, 'zh-Hans-CN')
        ))
      : previewRows;
    const openedRow = sortedRows.find((row) => row.id === detailBoardOpenedRowId) ?? sortedRows[0];
    const leadColumn = mainTableColumns[0];
    const secondaryColumns = mainTableColumns.slice(1, 5);
    const tertiaryColumns = mainTableColumns.slice(0, 6);

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
            className="flex h-[80vh] w-full max-w-[1240px] flex-col overflow-hidden rounded-[28px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,248,252,0.98))] shadow-[0_50px_120px_-48px_rgba(15,23,42,0.68)] dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="border-b border-slate-200 bg-[linear-gradient(180deg,#f8fbff,#edf4fc)] px-6 py-5 dark:border-slate-700 dark:bg-slate-800/85">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[17px] font-bold text-slate-800 dark:text-slate-100">详情看板预览</div>
                  <div className="mt-1 text-[12px] text-slate-400">用于客户双击主表记录时预览详情效果。顶部支持按列快速排序，右侧看板同步展示选中记录。</div>
                </div>
                <button
                  onClick={() => setIsDetailBoardOpen(false)}
                  className="inline-flex size-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                {mainTableColumns.map((column) => (
                  <button
                    key={column.id}
                    onClick={() => setDetailBoardSortColumnId(column.id)}
                    className={`rounded-full border px-3 py-1.5 text-[12px] font-bold transition-all ${
                      sortColumnId === column.id
                        ? 'border-[#1686e3] bg-[#1686e3] text-white shadow-[0_18px_28px_-20px_rgba(22,134,227,0.75)]'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                    }`}
                  >
                    按 {column.name} 排序
                  </button>
                ))}
              </div>
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
              <div className="min-h-0 overflow-auto bg-[#f8fafc] p-5 dark:bg-slate-950/40">
                <div className="mb-4 flex items-center justify-between">
                  <div className="text-[13px] font-bold text-slate-700 dark:text-slate-100">候选记录</div>
                  <div className="text-[11px] text-slate-400">双击卡片可模拟客户打开详情</div>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  {sortedRows.map((row) => (
                    <button
                      key={row.id}
                      onClick={() => setDetailBoardOpenedRowId(row.id)}
                      onDoubleClick={() => {
                        setDetailBoardOpenedRowId(row.id);
                        showToast(`已打开第 ${row.id} 条看板预览`);
                      }}
                      className={`rounded-[18px] border p-4 text-left transition-all ${
                        detailBoardOpenedRowId === row.id
                          ? 'border-[#1686e3] bg-[#eaf4ff] shadow-[0_28px_42px_-28px_rgba(22,134,227,0.65)] dark:border-[#1686e3] dark:bg-[#1686e3]/10'
                          : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-[#1686e3]/40 hover:shadow-[0_24px_40px_-32px_rgba(15,23,42,0.3)] dark:border-slate-700 dark:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-[14px] font-bold text-slate-800 dark:text-slate-100">
                          {row.values[sortColumnId || mainTableColumns[0]?.id || ''] || `记录 ${row.id}`}
                        </div>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                          #{row.id}
                        </span>
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        {tertiaryColumns.map((column) => (
                          <div key={column.id} className="rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-800/50">
                            <div className="text-[11px] font-bold text-slate-400">{column.name}</div>
                            <div className="mt-1 truncate text-[13px] text-slate-700 dark:text-slate-100">{row.values[column.id]}</div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 text-[11px] text-slate-400">双击卡片可模拟客户打开详情看板。</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-l border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,248,252,0.98))] px-6 py-5 dark:border-slate-700 dark:bg-slate-900">
                <div className="rounded-[24px] border border-white/80 bg-[linear-gradient(160deg,rgba(26,110,197,0.08),rgba(255,255,255,0.96))] p-5 shadow-[0_30px_50px_-36px_rgba(22,134,227,0.45)] dark:border-slate-700 dark:bg-slate-800/80">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[12px] font-bold tracking-[0.12em] text-[#1686e3]">DETAIL BOARD</div>
                      <div className="mt-2 text-[20px] font-bold text-slate-800 dark:text-slate-100">
                        {openedRow?.values[leadColumn?.id || ''] || '未选择记录'}
                      </div>
                    </div>
                    <span className="rounded-full bg-white/85 px-3 py-1 text-[11px] font-bold text-slate-500 shadow-sm dark:bg-slate-900/85 dark:text-slate-300">
                      #{openedRow?.id ?? '--'}
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {secondaryColumns.map((column) => (
                      <div key={column.id} className="rounded-full border border-white/80 bg-white/80 px-3 py-1 text-[11px] font-bold text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300">
                        {column.name}：{openedRow?.values[column.id] || '--'}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-4 shadow-[0_20px_30px_-28px_rgba(15,23,42,0.28)] dark:border-slate-700 dark:bg-slate-800/80">
                    <div className="text-[11px] font-bold tracking-[0.08em] text-slate-400">当前排序字段</div>
                    <div className="mt-2 text-[15px] font-bold text-[#1686e3]">
                      {mainTableColumns.find((column) => column.id === sortColumnId)?.name || '未选择'}
                    </div>
                  </div>
                  <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-4 shadow-[0_20px_30px_-28px_rgba(15,23,42,0.28)] dark:border-slate-700 dark:bg-slate-800/80">
                    <div className="text-[11px] font-bold tracking-[0.08em] text-slate-400">交互方式</div>
                    <div className="mt-2 text-[15px] font-bold text-slate-700 dark:text-slate-100">双击主表记录进入看板</div>
                  </div>
                </div>

                <div className="mt-5 rounded-[20px] border border-slate-200 bg-white p-4 shadow-[0_20px_30px_-28px_rgba(15,23,42,0.28)] dark:border-slate-700 dark:bg-slate-800/80">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-[13px] font-bold text-slate-700 dark:text-slate-100">关键信息面板</div>
                    <span className="rounded-full bg-[#1686e3]/10 px-2.5 py-1 text-[11px] font-bold text-[#1686e3]">
                      实时预览
                    </span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {tertiaryColumns.map((column) => (
                      <div key={column.id} className="rounded-[16px] border border-slate-100 bg-slate-50/80 px-3 py-3 dark:border-slate-700 dark:bg-slate-900/55">
                        <div className="text-[11px] font-bold text-slate-400">{column.name}</div>
                        <div className="mt-1 text-[13px] font-semibold text-slate-700 dark:text-slate-100">
                          {openedRow?.values[column.id] || '--'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-5 rounded-[20px] border border-slate-200 bg-white p-4 shadow-[0_20px_30px_-28px_rgba(15,23,42,0.28)] dark:border-slate-700 dark:bg-slate-800/80">
                  <div className="text-[13px] font-bold text-slate-700 dark:text-slate-100">演示建议</div>
                  <div className="mt-3 space-y-3 text-[12px] text-slate-500 dark:text-slate-300">
                    <div className="rounded-[16px] border border-slate-100 bg-slate-50/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/55">
                      1. 先切换顶部排序字段，给客户看列表如何按业务列重新编排。
                    </div>
                    <div className="rounded-[16px] border border-slate-100 bg-slate-50/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/55">
                      2. 再双击左侧卡片，演示从主表进入详情看板的真实操作路径。
                    </div>
                    <div className="rounded-[16px] border border-slate-100 bg-slate-50/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/55">
                      3. 右侧结构已经预留好，后面可以继续叠业务状态、统计块和动作按钮。
                    </div>
                  </div>
                </div>
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
                  <div className="relative">
                    <select 
                      value={activeSubsystem}
                      onChange={(e) => {
                        const newSubsystem = e.target.value as Subsystem;
                        setActiveSubsystem(newSubsystem);
                        setActiveMenu(menuData[newSubsystem][0].id);
                      }}
                      className="w-full appearance-none bg-primary/5 text-primary text-sm font-semibold px-3 py-2 rounded-lg outline-none cursor-pointer"
                    >
                      {subsystems.map(sub => (
                        <option key={sub.id} value={sub.id}>{sub.name}</option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined text-sm absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-primary">
                      expand_more
                    </span>
                  </div>

                  <div className="ml-2 space-y-0.5 mt-2">
                    {menuData[activeSubsystem].map(menu => (
                      <button
                        key={menu.id}
                        onClick={() => handleMenuClick(menu.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                          activeMenu === menu.id 
                            ? 'bg-primary text-white shadow-sm' 
                            : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span className="material-symbols-outlined text-lg">{menu.icon}</span>
                        <span className="text-sm font-medium">{menu.name}</span>
                      </button>
                    ))}
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
            <div className="flex items-center gap-3">
              <div className="size-9 bg-slate-300 rounded-full bg-cover bg-center shrink-0 border border-white dark:border-slate-700 shadow-sm" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAo89enNkqzoYdkb9ONwNeNg_myQ4q-s-AcgWsD1eYBfqrihZEHP9XvBAWfpzZHcKPOC8i1cd__r8V2W1wGzPzmj59sA9o_niCTnnQg-8KIDFB4Z5nHC3L1XKoqviq4CeqGnT_vVcMINVjckGM9cJBCbRpTKiis2JptKHUao34Tw_QwL6E1VjOld7ZtAa-jnHwT9Jo5nqwYn7Jwgf-i1w7ShT_MqoeIDOWWcMgFpmJza6ow1ncBHKcr67RoEEFBP3P-ffT7A_Izs0OM')" }}></div>
              <div className="flex flex-col min-w-0 text-left">
                <span className="text-xs font-bold text-slate-900 dark:text-white truncate">系统管理员</span>
                <span className="text-[10px] text-slate-500 truncate">admin@langsu.ai</span>
              </div>
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
                {subsystems.find(s => s.id === activeSubsystem)?.name}
              </span>
              <span className="material-symbols-outlined text-[16px] text-slate-400">chevron_right</span>
              <span className="text-slate-900 dark:text-slate-200 font-semibold tracking-tight">
                {activeMenuName}
              </span>
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
                    {activeMenuName} <span className="text-primary/40 ml-1 text-2xl">/</span> <span className="text-slate-400 font-medium text-lg capitalize">{activeMenu}</span>
                  </h3>
                  <p className="text-slate-500 text-sm max-w-2xl leading-relaxed">
                    管理{subsystems.find(s => s.id === activeSubsystem)?.name}子系统下的{activeMenuName}相关业务模块。在这里您可以进行精细化核算配置、数据模型定义以及 AI 增强逻辑的导入。
                  </p>
                </div>
                <button className="flex items-center gap-2 px-6 py-3 bg-primary text-white font-bold rounded-xl shadow-xl shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0 transition-all">
                  <span className="material-symbols-outlined text-xl">add</span>
                  <span>新增业务模块</span>
                </button>
              </div>

              {/* Grid of Module Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-8">
                {/* Card 1 */}
                <div className="group relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-black/50 transition-all duration-300 flex flex-col">
                  <div className="p-6 pb-0 flex justify-between items-start">
                    <div className="size-14 rounded-2xl bg-primary/5 text-primary flex items-center justify-center border border-primary/10 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                      <span className="material-symbols-outlined text-3xl">account_balance</span>
                    </div>
                    <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50">
                      <span className="status-dot bg-emerald-500"></span>
                      <span className="text-[11px] font-bold tracking-wide uppercase">已启用</span>
                    </div>
                  </div>
                  <div className="p-6 pt-5 flex-1">
                    <h4 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight mb-1 group-hover:text-primary transition-colors">{activeMenuName}模块 A</h4>
                    <div className="flex items-center gap-2 mb-4">
                      <code className="text-[11px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded border border-slate-200/50 dark:border-slate-700 font-mono">FM-{activeMenu.toUpperCase().substring(0, 2)}-001</code>
                    </div>
                    <p className="text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-3">核心{activeMenuName}核算系统，包含凭证处理、账簿查询、报表生成等基础控制能力，支持跨部门自动结算。</p>
                  </div>
                  <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 rounded-b-2xl flex items-center justify-between">
                    <div className="flex gap-4">
                      <button onClick={() => setIsConfigOpen(true)} className="text-slate-500 hover:text-primary text-[13px] font-bold flex items-center gap-1.5 transition-colors">
                        <span className="material-symbols-outlined text-[18px]">tune</span> 配置
                      </button>
                      <button className="text-slate-500 hover:text-primary text-[13px] font-bold flex items-center gap-1.5 transition-colors">
                        <span className="material-symbols-outlined text-[18px]">visibility</span> 详情
                      </button>
                    </div>
                    <button className="size-8 rounded-lg text-slate-400 hover:bg-white dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-200 transition-all flex items-center justify-center border border-transparent hover:border-slate-200 dark:hover:border-slate-600">
                      <span className="material-symbols-outlined text-lg">more_horiz</span>
                    </button>
                  </div>
                </div>

                {/* Card 2 */}
                <div className="group relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col">
                  <div className="p-6 pb-0 flex justify-between items-start">
                    <div className="size-14 rounded-2xl bg-indigo-50 text-indigo-500 dark:bg-indigo-950/30 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/50 group-hover:bg-indigo-500 group-hover:text-white transition-all duration-300">
                      <span className="material-symbols-outlined text-3xl">groups</span>
                    </div>
                    <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50">
                      <span className="status-dot bg-amber-500"></span>
                      <span className="text-[11px] font-bold tracking-wide uppercase">维护中</span>
                    </div>
                  </div>
                  <div className="p-6 pt-5 flex-1">
                    <h4 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight mb-1 group-hover:text-indigo-600 transition-colors">{activeMenuName}模块 B</h4>
                    <div className="flex items-center gap-2 mb-4">
                      <code className="text-[11px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded border border-slate-200/50 dark:border-slate-700 font-mono">HR-{activeMenu.toUpperCase().substring(0, 2)}-002</code>
                    </div>
                    <p className="text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-3">成本分析与管控，涉及薪酬计算、社保公积金支出控制，以及人力外包服务成本模型分析。</p>
                  </div>
                  <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 rounded-b-2xl flex items-center justify-between">
                    <div className="flex gap-4">
                      <button onClick={() => setIsConfigOpen(true)} className="text-slate-500 hover:text-indigo-600 text-[13px] font-bold flex items-center gap-1.5 transition-colors">
                        <span className="material-symbols-outlined text-[18px]">tune</span> 配置
                      </button>
                      <button className="text-slate-500 hover:text-indigo-600 text-[13px] font-bold flex items-center gap-1.5 transition-colors">
                        <span className="material-symbols-outlined text-[18px]">visibility</span> 详情
                      </button>
                    </div>
                    <button className="size-8 rounded-lg text-slate-400 hover:bg-white dark:hover:bg-slate-700 hover:text-indigo-600 transition-all flex items-center justify-center border border-transparent hover:border-slate-200 dark:hover:border-slate-600">
                      <span className="material-symbols-outlined text-lg">more_horiz</span>
                    </button>
                  </div>
                </div>

                {/* Card 3 */}
                <div className="group relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col">
                  <div className="p-6 pb-0 flex justify-between items-start">
                    <div className="size-14 rounded-2xl bg-cyan-50 text-cyan-500 dark:bg-cyan-950/30 dark:text-cyan-400 flex items-center justify-center border border-cyan-100 dark:border-cyan-900/50 group-hover:bg-cyan-500 group-hover:text-white transition-all duration-300">
                      <span className="material-symbols-outlined text-3xl">inventory_2</span>
                    </div>
                    <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50">
                      <span className="status-dot bg-emerald-500"></span>
                      <span className="text-[11px] font-bold tracking-wide uppercase">已启用</span>
                    </div>
                  </div>
                  <div className="p-6 pt-5 flex-1">
                    <h4 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight mb-1 group-hover:text-cyan-600 transition-colors">{activeMenuName}模块 C</h4>
                    <div className="flex items-center gap-2 mb-4">
                      <code className="text-[11px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded border border-slate-200/50 dark:border-slate-700 font-mono">AM-{activeMenu.toUpperCase().substring(0, 2)}-003</code>
                    </div>
                    <p className="text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-3">覆盖固定资产与低值易耗品的折旧、维修、处置成本全生命周期跟踪，并集成智能折旧预测算法。</p>
                  </div>
                  <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 rounded-b-2xl flex items-center justify-between">
                    <div className="flex gap-4">
                      <button onClick={() => setIsConfigOpen(true)} className="text-slate-500 hover:text-cyan-600 text-[13px] font-bold flex items-center gap-1.5 transition-colors">
                        <span className="material-symbols-outlined text-[18px]">tune</span> 配置
                      </button>
                      <button className="text-slate-500 hover:text-cyan-600 text-[13px] font-bold flex items-center gap-1.5 transition-colors">
                        <span className="material-symbols-outlined text-[18px]">visibility</span> 详情
                      </button>
                    </div>
                    <button className="size-8 rounded-lg text-slate-400 hover:bg-white dark:hover:bg-slate-700 hover:text-cyan-600 transition-all flex items-center justify-center border border-transparent hover:border-slate-200 dark:hover:border-slate-600">
                      <span className="material-symbols-outlined text-lg">more_horiz</span>
                    </button>
                  </div>
                </div>

                {/* Add New Module Card (Distinct) */}
                <button className="group relative rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-8 flex flex-col items-center justify-center bg-white/40 dark:bg-slate-900/40 hover:bg-primary/5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 min-h-[320px]">
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
                  <p>展示 <span className="font-bold text-slate-900 dark:text-white">4</span> 个活跃业务模块</p>
                  <div className="flex items-center gap-4 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                    <div className="flex items-center gap-1.5"><span className="status-dot bg-emerald-500"></span> 3 已启用</div>
                    <div className="flex items-center gap-1.5"><span className="status-dot bg-amber-500"></span> 1 维护中</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button className="size-9 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center hover:bg-white dark:hover:bg-slate-800 hover:border-primary/30 transition-all">
                    <span className="material-symbols-outlined text-lg">chevron_left</span>
                  </button>
                  <button className="size-9 rounded-xl bg-primary text-white flex items-center justify-center font-bold shadow-md shadow-primary/20">1</button>
                  <button className="size-9 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center hover:bg-white dark:hover:bg-slate-800 hover:border-primary/30 transition-all font-medium">2</button>
                  <button className="size-9 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center hover:bg-white dark:hover:bg-slate-800 hover:border-primary/30 transition-all font-medium">3</button>
                  <button className="size-9 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center hover:bg-white dark:hover:bg-slate-800 hover:border-primary/30 transition-all">
                    <span className="material-symbols-outlined text-lg">chevron_right</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

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
            {renderDetailBoardModal()}
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
                  const isLocked = (step.id === 4 || step.id === 5) && !completedSteps.includes(1);
                  
                  return (
                    <div 
                      key={step.id} 
                      onClick={() => {
                        if (!isLocked) {
                          setConfigStep(step.id);
                        } else {
                          showToast('请先保存“菜单信息”步骤后，再进入模块设置。');
                        }
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

                              {/* 业务类型 (Segmented Control) */}
                              <div className="space-y-2.5">
                                <label className="text-[13px] font-bold text-slate-700 dark:text-slate-300">业务类型</label>
                                <div className="flex p-1.5 bg-slate-100 dark:bg-slate-900/50 rounded-xl border border-slate-200/50 dark:border-slate-700/50 relative">
                              {(['document', 'table', 'tree'] as const).map((type) => {
                                const isActive = businessType === type;
                                const labels = { document: '基础档案', table: '单据模式', tree: '树形模式' };
                                const icons = { document: 'inventory_2', table: 'receipt_long', tree: 'account_tree' };
                                    return (
                                      <button
                                        key={type}
                                        onClick={() => setBusinessType(type)}
                                        className={`relative flex-1 py-2.5 rounded-lg text-[14px] font-bold flex items-center justify-center gap-2 transition-colors z-10 ${isActive ? 'text-primary' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                                      >
                                        {isActive && (
                                          <motion.div
                                            layoutId="businessTypeIndicator"
                                            className="absolute inset-0 bg-white dark:bg-slate-800 shadow-sm border border-slate-200/50 dark:border-slate-700 rounded-lg -z-10"
                                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                          />
                                        )}
                                        <span className="material-symbols-outlined text-[18px]">{icons[type]}</span>
                                        {labels[type]}
                                      </button>
                                    );
                                  })}
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

                  {configStep === 2 && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.4 }}
                      className={`flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm flex flex-col overflow-hidden min-h-[600px] ${
                        isFullscreenEditor ? 'fixed inset-4 z-[200] shadow-2xl' : ''
                      }`}
                    >
                      {/* Editor Toolbar */}
                      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1 pr-4 border-r border-slate-200 dark:border-slate-700">
                          <select className="bg-transparent border-none text-[13px] font-bold text-slate-700 dark:text-slate-300 focus:ring-0 cursor-pointer">
                            <option>正文</option>
                            <option>标题 1</option>
                            <option>标题 2</option>
                            <option>标题 3</option>
                          </select>
                        </div>
                        <div className="flex items-center gap-1 px-4 border-r border-slate-200 dark:border-slate-700">
                          <button className="size-8 rounded hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors"><span className="material-symbols-outlined text-[18px]">format_bold</span></button>
                          <button className="size-8 rounded hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors"><span className="material-symbols-outlined text-[18px]">format_italic</span></button>
                          <button className="size-8 rounded hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors"><span className="material-symbols-outlined text-[18px]">format_underlined</span></button>
                          <button className="size-8 rounded hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors"><span className="material-symbols-outlined text-[18px]">format_strikethrough</span></button>
                        </div>
                        <div className="flex items-center gap-1 px-4 border-r border-slate-200 dark:border-slate-700">
                          <button className="size-8 rounded hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors"><span className="material-symbols-outlined text-[18px]">format_list_bulleted</span></button>
                          <button className="size-8 rounded hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors"><span className="material-symbols-outlined text-[18px]">format_list_numbered</span></button>
                          <button className="size-8 rounded hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors"><span className="material-symbols-outlined text-[18px]">format_quote</span></button>
                        </div>
                        <div className="flex items-center gap-1 pl-4">
                          <button className="size-8 rounded hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors"><span className="material-symbols-outlined text-[18px]">link</span></button>
                          <button className="size-8 rounded hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors"><span className="material-symbols-outlined text-[18px]">image</span></button>
                          <button className="size-8 rounded hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors"><span className="material-symbols-outlined text-[18px]">table_chart</span></button>
                        </div>
                        <div className="ml-auto flex items-center gap-2">
                          <button 
                            onClick={() => setIsFullscreenEditor(!isFullscreenEditor)}
                            className="text-[13px] text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors font-bold flex items-center gap-1.5"
                          >
                            <span className="material-symbols-outlined text-[16px]">
                              {isFullscreenEditor ? 'fullscreen_exit' : 'fullscreen'}
                            </span> 
                            {isFullscreenEditor ? '退出全屏' : '全屏编辑'}
                          </button>
                          <button className="text-[13px] text-primary hover:bg-primary/10 px-3 py-1.5 rounded-lg transition-colors font-bold flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[16px]">auto_awesome</span> AI 润色
                          </button>
                        </div>
                      </div>
                      
                      {/* Editor Content Area */}
                      <div className="flex-1 p-8 bg-white dark:bg-slate-900 overflow-y-auto">
                        <div className="w-full h-full mx-auto">
                          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-6 outline-none" contentEditable suppressContentEditableWarning>成本控制模块详细说明</h1>
                          <div className="prose prose-slate dark:prose-invert max-w-none outline-none min-h-[400px]" contentEditable suppressContentEditableWarning>
                            <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                              成本控制模块是财务管理子系统的核心组件，旨在为企业提供全方位的成本核算、分析与控制能力。该模块通过整合各业务环节的数据，实现成本的精细化管理。                            </p>
                            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mt-8 mb-4">核心功能</h3>
                            <ul className="list-disc pl-5 space-y-2 text-slate-600 dark:text-slate-300 mb-6">
                              <li><strong>成本核算:</strong> 支持多种成本核算方法，如标准成本法、实际成本法和作业成本法，自动归集和分配各项成本费用。</li>
                              <li><strong>预算控制:</strong> 建立多维度的成本预算体系，实时监控预算执行情况，并提供超预算预警能力。</li>
                              <li><strong>成本分析:</strong> 提供丰富的成本分析报表，支持多维度、多视角的成本构成分析、趋势分析和差异分析。</li>
                              <li><strong>成本预测:</strong> 基于历史数据和业务模型，利用 AI 算法进行成本预测，辅助管理层决策。</li>
                            </ul>
                            
                            <div className="mt-8 p-6 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer group">
                              <div className="size-12 rounded-full bg-white dark:bg-slate-700 shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                <span className="material-symbols-outlined text-[24px] text-slate-400 group-hover:text-primary">add_photo_alternate</span>
                              </div>
                              <span className="text-[14px] font-medium group-hover:text-primary transition-colors">拖拽或点击上传流程图/架构图</span>
                              <span className="text-[12px] mt-1 opacity-70">支持 PNG、JPG、SVG 格式</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {configStep === 4 && (
                    <motion.div
                      key={`layout-${businessType}`}
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.4 }}
                      className="flex min-h-0 flex-1 flex-col overflow-hidden"
                    >
                      {businessType === 'document' ? (
                        <div className={`flex flex-1 min-h-0 overflow-hidden rounded-[14px] border border-slate-200 bg-[#f5f7fb] shadow-[0_16px_28px_-26px_rgba(15,23,42,0.14)] dark:border-slate-700 dark:bg-slate-800/60 ${isConfigFullscreenActive ? 'h-full' : 'min-h-[720px]'}`}>
                          {isTreePaneVisible && (
                            <>
                              <div className="flex min-h-0 shrink-0 flex-col border-r border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900" style={{ width: documentLeftPaneWidth }}>
                                {renderDocumentTreePanel()}
                              </div>

                              <div
                                className="group flex w-2 shrink-0 cursor-col-resize items-center justify-center bg-[#eef3f9] dark:bg-slate-800/60"
                                onMouseDown={(event) => startLayoutDrag('document-left-width', event)}
                              >
                                <div className="h-full w-px bg-slate-300 transition-colors group-hover:bg-[#1686e3] dark:bg-slate-700 dark:group-hover:bg-[#1686e3]" />
                              </div>
                            </>
                          )}

                          <div className="min-h-0 min-w-0 flex-1 bg-[#eef3f9] px-1 py-1">
                            <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[14px] border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                              <div className="min-h-0 shrink-0 overflow-hidden" style={{ height: documentTopPaneHeight }}>
                                <div className="flex h-full min-h-0 flex-col overflow-hidden">
                                  {renderDocumentGridToolbar(
                                    mainTableColumns,
                                    '基础档案主表',
                                    selectedMainForDelete.length,
                                    () => {
                                      setMainTableColumns((prev) => prev.filter((c) => !selectedMainForDelete.includes(c.id)));
                                      setSelectedMainForDelete([]);
                                      setInspectorTarget({ kind: 'none' });
                                    },
                                    () => setMainTableColumns((prev) => [...prev, buildColumn('m_col', prev.length + 1)]),
                                    undefined,
                                    {
                                      fields: mainFilterFields,
                                      selectedId: selectedMainFilterId,
                                      setFields: setMainFilterFields,
                                      onSelect: (id) => {
                                        setSelectedArchiveNodeId('archive-filter');
                                        activateConditionSelection(id);
                                      },
                                      onAdd: () => {
                                        const next = buildConditionField(mainFilterFields.length + 1);
                                        setMainFilterFields((prev) => [...prev, next]);
                                        setSelectedArchiveNodeId('archive-filter');
                                        activateConditionSelection(next.id);
                                      },
                                      onDelete: () => {
                                        if (!selectedMainFilterId) return;
                                        setMainFilterFields((prev) => prev.filter((item) => item.id !== selectedMainFilterId));
                                        setInspectorTarget({ kind: 'none' });
                                      },
                                    },
                                    undefined,
                                    { hideActionBar: true },
                                  )}
                                  <div
                                    className="min-h-0 flex-1 overflow-auto bg-white outline-none dark:bg-slate-900"
                                    tabIndex={0}
                                    onPaste={(e) => handlePasteColumns(e, setMainTableColumns)}
                                  >
                                  {renderTableBuilder('main', mainTableColumns, setMainTableColumns, selectedMainColId, selectedMainForDelete, setSelectedMainForDelete, {
                                    contextMenuScope: 'main',
                                    contextMenuConfig: {
                                      enabled: Boolean(mainTableConfig.contextMenuEnabled),
                                      items: mainTableConfig.contextMenuItems ?? [],
                                    },
                                    backgroundSelectable: true,
                                    tableSelected: selectedTableConfigScope === 'main',
                                    onSelectTable: () => {
                                      setSelectedArchiveNodeId('archive-main');
                                      activateTableConfigSelection('main');
                                    },
                                    canvasLabel: '点击配置基础档案主表',
                                  })}
                                </div>
                                </div>
                              </div>

                              <div
                                className="group flex h-2 shrink-0 cursor-row-resize items-center justify-center bg-[#eef3f9] dark:bg-slate-800/60"
                                onMouseDown={(event) => startLayoutDrag('document-top-height', event)}
                              >
                                <div className="h-px w-full bg-slate-300 transition-colors group-hover:bg-[#1686e3] dark:bg-slate-700 dark:group-hover:bg-[#1686e3]" />
                              </div>

                              <div className="min-h-0 flex-1 overflow-hidden">
                                {renderDocumentDetailWorkbench()}
                              </div>
                            </div>
                          </div>

                          <div
                            className="group flex w-2 shrink-0 cursor-col-resize items-center justify-center bg-[#eef3f9] dark:bg-slate-800/60"
                            onMouseDown={(event) => startLayoutDrag('document-detail-width', event)}
                          >
                            <div className="h-full w-px bg-slate-300 transition-colors group-hover:bg-[#1686e3] dark:bg-slate-700 dark:group-hover:bg-[#1686e3]" />
                          </div>

                          <div className="flex min-h-0 shrink-0 flex-col bg-[#eef3f9] px-1 py-1" style={{ width: documentDetailPaneWidth }}>
                            <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[14px] border border-slate-200 bg-white shadow-[0_14px_26px_-24px_rgba(15,23,42,0.14)] dark:border-slate-700 dark:bg-slate-900">
                              {columnOperationPanel}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className={`flex flex-1 min-h-0 flex-col overflow-hidden rounded-[30px] border border-white/70 bg-white/82 shadow-[0_30px_60px_-44px_rgba(15,23,42,0.38)] backdrop-blur-xl dark:border-slate-700 dark:bg-slate-800/85 ${isConfigFullscreenActive ? 'h-full' : 'min-h-[760px]'}`}>
                          <div className={`grid min-h-0 flex-1 bg-[linear-gradient(180deg,rgba(248,250,252,0.86),rgba(255,255,255,0.72))] dark:bg-slate-900/30 ${
                            businessType === 'table'
                              ? 'grid-cols-1'
                              : isConfigFullscreenActive
                                ? 'xl:grid-cols-[minmax(220px,0.72fr)_minmax(0,1.28fr)]'
                                : 'xl:grid-cols-[minmax(260px,0.82fr)_minmax(0,1.18fr)]'
                          } ${isConfigFullscreenActive ? 'gap-4 p-4' : 'gap-5 p-5'} ${
                            businessType === 'table' && isConfigFullscreenActive ? 'h-full' : ''
                          }`}>
                            {businessType !== 'table' && (
                              <div className="flex min-h-0 flex-col overflow-hidden rounded-[14px] border border-slate-200 bg-white shadow-[0_12px_22px_-20px_rgba(15,23,42,0.12)] dark:border-slate-700 dark:bg-slate-800/88">
                                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800/70">
                                  <div className="flex items-center gap-3">
                                    <div className="flex size-8 items-center justify-center rounded-xl bg-primary/12 text-primary">
                                      <span className="material-symbols-outlined text-[16px]">view_sidebar</span>
                                    </div>
                                    <div>
                                      <h4 className="text-[12px] font-semibold text-slate-800 dark:text-slate-200">左侧表配置</h4>
                                      <p className="mt-0.5 text-[11px] text-slate-400">控制树节点、分类维度与导航层级</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {selectedLeftForDelete.length > 0 && (
                                      <button
                                        onClick={() => {
                                          setLeftTableColumns((prev) => prev.filter((c) => !selectedLeftForDelete.includes(c.id)));
                                          setSelectedLeftForDelete([]);
                                        }}
                                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold text-rose-500 transition-colors hover:bg-rose-50 dark:hover:bg-rose-500/10"
                                      >
                                        <span className="material-symbols-outlined text-[14px]">delete</span>
                                        删除 ({selectedLeftForDelete.length})
                                      </button>
                                    )}
                                    <button
                                      onClick={() => setLeftTableColumns((prev) => [...prev, { id: `l_col_${Date.now()}`, name: `新字段 ${prev.length + 1}`, type: '文本', width: 120 }])}
                                      className="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1 text-[11px] font-semibold text-white shadow-[0_10px_18px_-16px_rgba(14,116,144,0.45)] transition-all hover:bg-erp-blue"
                                    >
                                      <span className="material-symbols-outlined text-[14px]">add</span>
                                      新增
                                    </button>
                                  </div>
                                </div>
                                <div
                                  className="min-h-0 flex-1 overflow-auto outline-none"
                                  tabIndex={0}
                                  onPaste={(e) => handlePasteColumns(e, setLeftTableColumns)}
                                >
                                  {renderTableBuilder('left', leftTableColumns, setLeftTableColumns, selectedLeftColId, selectedLeftForDelete, setSelectedLeftForDelete)}
                                </div>
                              </div>
                            )}

                            <div className="grid min-h-0 gap-5 lg:grid-rows-[minmax(0,1fr)_minmax(0,1fr)]">
                              <div className="flex min-h-0 flex-col overflow-hidden rounded-[24px] border border-white/70 bg-white/88 shadow-[0_24px_44px_-34px_rgba(15,23,42,0.3)] dark:border-slate-700 dark:bg-slate-800/88">
                                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800/70">
                                  <div className="flex items-center gap-3">
                                    <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-500/12 text-emerald-500">
                                      <span className="material-symbols-outlined text-[16px]">table_rows</span>
                                    </div>
                                    <div>
                                      <h4 className="text-[12px] font-semibold text-slate-800 dark:text-slate-200">主表字段配置</h4>
                                      <p className="mt-0.5 text-[11px] text-slate-400">当前模块的主表字段与列宽设置</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {selectedMainForDelete.length > 0 && (
                                      <button
                                        onClick={() => {
                                          setMainTableColumns((prev) => prev.filter((c) => !selectedMainForDelete.includes(c.id)));
                                          setSelectedMainForDelete([]);
                                        }}
                                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold text-rose-500 transition-colors hover:bg-rose-50 dark:hover:bg-rose-500/10"
                                      >
                                        <span className="material-symbols-outlined text-[14px]">delete</span>
                                        删除 ({selectedMainForDelete.length})
                                      </button>
                                    )}
                                    <button
                                      onClick={() => setMainTableColumns((prev) => [...prev, { id: `m_col_${Date.now()}`, name: `新字段 ${prev.length + 1}`, type: '文本', width: 120 }])}
                                      className="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1 text-[11px] font-semibold text-white shadow-[0_10px_18px_-16px_rgba(14,116,144,0.45)] transition-all hover:bg-erp-blue"
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
                                  () => {
                                    setMainTableColumns((prev) => prev.filter((c) => !selectedMainForDelete.includes(c.id)));
                                    setSelectedMainForDelete([]);
                                    setInspectorTarget({ kind: 'none' });
                                  },
                                  () => setMainTableColumns((prev) => [...prev, buildColumn('m_col', prev.length + 1)]),
                                  undefined,
                                  {
                                    fields: mainFilterFields,
                                    selectedId: selectedMainFilterId,
                                    setFields: setMainFilterFields,
                                    onSelect: (id) => {
                                      setSelectedArchiveNodeId('archive-filter');
                                      activateConditionSelection(id);
                                    },
                                    onAdd: () => {
                                      const next = buildConditionField(mainFilterFields.length + 1);
                                      setMainFilterFields((prev) => [...prev, next]);
                                      setSelectedArchiveNodeId('archive-filter');
                                      activateConditionSelection(next.id);
                                    },
                                    onDelete: () => {
                                      if (!selectedMainFilterId) return;
                                      setMainFilterFields((prev) => prev.filter((item) => item.id !== selectedMainFilterId));
                                      setInspectorTarget({ kind: 'none' });
                                    },
                                  },
                                  undefined,
                                  { hideActionBar: true },
                                )}
                                <div
                                  className="min-h-0 flex-1 overflow-auto outline-none"
                                  tabIndex={0}
                                  onPaste={(e) => handlePasteColumns(e, setMainTableColumns)}
                                >
                                  {renderTableBuilder('main', mainTableColumns, setMainTableColumns, selectedMainColId, selectedMainForDelete, setSelectedMainForDelete, {
                                    backgroundSelectable: true,
                                    tableSelected: selectedTableConfigScope === 'main',
                                    onSelectTable: () => activateTableConfigSelection('main'),
                                    canvasLabel: '点击配置主表属性',
                                  })}
                                </div>
                              </div>

                              <div className="flex min-h-0 flex-col overflow-hidden rounded-[24px] border border-white/70 bg-white/88 shadow-[0_24px_44px_-34px_rgba(15,23,42,0.3)] dark:border-slate-700 dark:bg-slate-800/88">
                                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800/70">
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

                  {configStep === 3 && (
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
                                  onClick={() => {
                                    setSurveyAnswers((prev) => [...prev, opt]);
                                    setSurveyStep(2);
                                    setIsGenerating(true);
                                    setTimeout(() => setIsGenerating(false), 3000);
                                  }}
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
                              onClick={() => {
                                setSurveyStep(0);
                                setSurveyAnswers([]);
                                setIsGenerating(false);
                              }}
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
                                  <div className="mt-2 text-[14px] leading-relaxed text-slate-400">已提取核心诉求：模式为“{surveyAnswers[0]}”，数据来源为“{surveyAnswers[1]}”。</div>
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
                                  <div className="mt-2 text-[14px] leading-relaxed text-slate-400">生成数据表结构草案，建立表间关联关系。</div>
                                  <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/80 p-4 font-mono text-[13px] leading-relaxed text-emerald-400/80 shadow-inner">
                                    <span className="mr-2 text-slate-500">$</span> Table CostCenter created<br />
                                    <span className="mr-2 text-slate-500">$</span> Table BOM_Cost_Rollup created<br />
                                    <span className="mr-2 text-slate-500">$</span> Relations mapped successfully
                                  </div>
                                </div>
                              </motion.div>

                              {!isGenerating && (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-5">
                                  <div className="mt-0.5 relative">
                                    <span className="material-symbols-outlined relative z-10 bg-slate-900 text-[24px] text-emerald-500">check_circle</span>
                                  </div>
                                  <div className="w-full">
                                    <div className="text-[15px] font-bold text-slate-200">生成交互原型与架构评估</div>
                                    <div className="mt-2 text-[14px] leading-relaxed text-slate-400">基于“{surveyAnswers[0]}”生成了对应的页面布局与表单，并输出架构评估报告。</div>

                                    <div className="mt-4 space-y-3 rounded-xl border border-slate-800 bg-slate-950/80 p-5 font-mono text-[13px] leading-relaxed text-emerald-400/90 shadow-inner">
                                      <div className="mb-3 flex items-center gap-2 border-b border-slate-800 pb-2 text-white/90">
                                        <span className="material-symbols-outlined text-[18px] text-primary">analytics</span>
                                        <span className="font-bold text-[14px]">架构方案评估报告 (Architecture Assessment Report)</span>
                                      </div>
                                      <p><span className="text-slate-500"># 核心模式:</span> {surveyAnswers[0]}</p>
                                      <p><span className="text-slate-500"># 数据来源:</span> {surveyAnswers[1]}</p>
                                      <p><span className="text-slate-500"># 复杂度评估:</span> <span className="text-amber-400">High (高)</span></p>
                                      <p><span className="text-slate-500"># 预计开发周期:</span> 2.5 Weeks</p>
                                      <div className="border-t border-slate-800/50 pt-2">
                                        <p className="mb-1 text-slate-400">推荐技术栈与中间件:</p>
                                        <ul className="list-disc space-y-1 pl-5 text-emerald-500/80">
                                          <li>前端: React 18 + TailwindCSS + Framer Motion</li>
                                          <li>后端: Node.js (NestJS) + Prisma ORM</li>
                                          <li>存储: PostgreSQL (支持复杂 BOM 树形查询)</li>
                                          <li>缓存: Redis (应对高并发查询压力)</li>
                                        </ul>
                                      </div>
                                      <div className="border-t border-slate-800/50 pt-2 text-emerald-300">
                                        <span className="mr-2 text-slate-500">$</span> System ready for code generation.
                                      </div>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </motion.div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  {(configStep === 5) && (
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
                    onClick={() => setConfigStep(Math.max(1, configStep - 1))}
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-4 py-2 text-[12px] font-semibold transition-all ${
                      configStep === 1
                        ? 'cursor-not-allowed border-slate-200/80 bg-slate-100/70 text-slate-300 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-600'
                        : 'border-slate-200/80 bg-white/80 text-slate-600 shadow-[0_10px_30px_rgba(15,23,42,0.06)] hover:-translate-y-0.5 hover:border-primary/30 hover:text-primary dark:border-slate-700/80 dark:bg-slate-900/70 dark:text-slate-200'
                    }`}
                    disabled={configStep === 1}
                  >
                    <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                    上一步
                  </button>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        if (!completedSteps.includes(configStep)) {
                          setCompletedSteps([...completedSteps, configStep]);
                        }
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white px-4 py-2 text-[12px] font-semibold text-slate-600 shadow-[0_8px_18px_rgba(15,23,42,0.04)] transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:text-primary dark:border-slate-700/80 dark:bg-slate-900/70 dark:text-slate-200"
                    >
                      <span className="material-symbols-outlined text-[20px]">save</span>
                      保存本页
                    </button>

                    {configStep === 4 && (
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
                      onClick={() => {
                        const newCompleted = [...completedSteps];
                        if (!newCompleted.includes(configStep)) {
                          newCompleted.push(configStep);
                          setCompletedSteps(newCompleted);
                        }

                        const nextStep = configStep + 1;
                        const isNextLocked = (nextStep === 4 || nextStep === 5) && !newCompleted.includes(1);

                        if (configStep < 5) {
                          if (!isNextLocked) {
                            setConfigStep(nextStep);
                          } else {
                            showToast('请先保存“菜单信息”步骤后，再进入模块设置。');
                          }
                        } else {
                          setIsConfigOpen(false);
                        }
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2 text-[12px] font-semibold text-white shadow-[0_12px_24px_rgba(49,98,255,0.2)] transition-all hover:-translate-y-0.5 hover:bg-erp-blue"
                    >
                      {configStep === 5 ? '完成配置' : '下一步'}
                      {configStep !== 5 && <span className="material-symbols-outlined text-[20px]">arrow_forward</span>}
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
