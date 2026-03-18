import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GlassIcon from './GlassIcon';

interface DashboardProps {
  onLogout: () => void;
}

type Subsystem = 'finance' | 'hr' | 'supply';

const FIELD_TYPE_OPTIONS = ['文本', '数字', '下拉框', '搜索框', '日期框', '单选框', '多选框'];

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
  const [leftTableColumns, setLeftTableColumns] = useState([
    { id: 'l_col1', name: '分类编码', type: '文本', width: 120 },
    { id: 'l_col2', name: '分类名称', type: '文本', width: 150 },
  ]);
  const [mainTableColumns, setMainTableColumns] = useState([
    { id: 'm_col1', name: '物料编码', type: '文本', width: 120 },
    { id: 'm_col2', name: '物料名称', type: '文本', width: 150 },
    { id: 'm_col3', name: '规格型号', type: '文本', width: 120 },
    { id: 'm_col4', name: '单位', type: '下拉框', width: 100 },
    { id: 'm_col5', name: '单价', type: '数字', width: 100 },
  ]);
  const [detailTabs, setDetailTabs] = useState([{ id: 'tab1', name: '关联附件' }, { id: 'tab2', name: '操作日志' }]);
  const [activeTab, setActiveTab] = useState('tab1');
  const [tabFillTypes, setTabFillTypes] = useState<Record<string, string>>({ tab1: '表格', tab2: '表格' });
  const [selectedLeftColId, setSelectedLeftColId] = useState<string | null>(null);
  const [selectedMainColId, setSelectedMainColId] = useState<string | null>(null);
  const [selectedLeftForDelete, setSelectedLeftForDelete] = useState<string[]>([]);
  const [selectedMainForDelete, setSelectedMainForDelete] = useState<string[]>([]);

  const [detailTableColumns, setDetailTableColumns] = useState<Record<string, any[]>>({
    tab1: [
      { id: 'd_col1', name: '附件名称', type: '文本', width: 150 },
      { id: 'd_col2', name: '上传人', type: '文本', width: 100 },
    ],
    tab2: [
      { id: 'd_col3', name: '操作时间', type: '日期框', width: 160 },
      { id: 'd_col4', name: '操作人', type: '文本', width: 120 },
      { id: 'd_col5', name: '操作动作', type: '下拉框', width: 120 },
    ],
  });
  const [selectedDetailColId, setSelectedDetailColId] = useState<string | null>(null);
  const [selectedDetailForDelete, setSelectedDetailForDelete] = useState<string[]>([]);

  const addTab = () => {
    const newId = `tab_${Date.now()}`;
    setDetailTabs([...detailTabs, { id: newId, name: `新页签 ${detailTabs.length + 1}` }]);
    setActiveTab(newId);
    setTabFillTypes({ ...tabFillTypes, [newId]: '表格' });
    setDetailTableColumns({ ...detailTableColumns, [newId]: [
      { id: `d_col_${Date.now()}_1`, name: '新字段 1', type: '文本', width: 120 },
      { id: `d_col_${Date.now()}_2`, name: '新字段 2', type: '文本', width: 120 },
    ] });
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
    setDetailTableColumns(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (activeTab === id) {
      setActiveTab(newTabs.length > 0 ? newTabs[0].id : '');
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

  const startResize = (e: React.MouseEvent, colId: string, cols: any[], setCols: React.Dispatch<React.SetStateAction<any[]>>) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.pageX;
    const startWidth = cols.find(c => c.id === colId)?.width || 100;
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(50, startWidth + (moveEvent.pageX - startX));
      setCols(prev => prev.map(c => c.id === colId ? { ...c, width: newWidth } : c));
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const renderTableBuilder = (
    cols: any[], 
    setCols: React.Dispatch<React.SetStateAction<any[]>>, 
    selectedId: string | null, 
    setSelectedId: React.Dispatch<React.SetStateAction<string | null>>,
    selectedForDelete: string[],
    setSelectedForDelete: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.checked) {
        setSelectedForDelete(cols.map(c => c.id));
      } else {
        setSelectedForDelete([]);
      }
    };

    const handleSelectCol = (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
      e.stopPropagation();
      if (e.target.checked) {
        setSelectedForDelete(prev => [...prev, id]);
      } else {
        setSelectedForDelete(prev => prev.filter(i => i !== id));
      }
    };

    return (
      <table className="w-full border-separate border-spacing-0 text-left type-body-sm">
        <thead className="sticky top-0 z-20 select-none bg-[linear-gradient(180deg,rgba(244,249,255,0.98),rgba(255,255,255,0.94))] text-[#24476b] shadow-[0_1px_0_rgba(20,118,255,0.06)]">
          <tr>
            <th className="w-10 border-b border-r border-[#d7e7ff] py-3 text-center">
              <input 
                type="checkbox" 
                className="rounded border-slate-300 text-primary focus:ring-primary"
                onChange={handleSelectAll} 
                checked={cols.length > 0 && selectedForDelete.length === cols.length} 
              />
            </th>
            {cols.map(col => (
              <th 
                key={col.id} 
                style={{ width: col.width, minWidth: 50 }} 
                className={`relative group cursor-pointer border-b border-r border-[#d7e7ff] transition-colors ${
                  selectedId === col.id
                    ? 'bg-[linear-gradient(180deg,rgba(20,118,255,0.14),rgba(20,118,255,0.05))]'
                    : 'hover:bg-[linear-gradient(180deg,rgba(244,249,255,0.96),rgba(255,255,255,0.96))]'
                }`}
                onClick={() => setSelectedId(col.id)}
              >
                <div className="flex items-center gap-2 p-2.5">
                  <input 
                    type="checkbox" 
                    className="rounded border-slate-300 text-primary focus:ring-primary shrink-0"
                    checked={selectedForDelete.includes(col.id)} 
                    onChange={(e) => handleSelectCol(e, col.id)} 
                    onClick={e => e.stopPropagation()} 
                  />
                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <div className="truncate type-body-sm font-semibold text-[#24476b]" title={col.name}>{col.name}</div>
                    <div className="relative" onClick={e => e.stopPropagation()}>
                      <select 
                        className="w-full appearance-none rounded-lg border border-[#d7e7ff] bg-white/80 px-2 py-1 type-caption text-slate-500 outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/20 cursor-pointer"
                        value={col.type}
                        onChange={(e) => updateColType(col.id, e.target.value, setCols)}
                      >
                        {FIELD_TYPE_OPTIONS.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                      <span className="absolute right-0.5 top-1/2 -translate-y-1/2 pointer-events-none"><GlassIcon icon="arrow_drop_down" size="2xs" tone="slate" /></span>
                    </div>
                  </div>
                </div>
                {/* Resize Handle */}
                <div 
                  className="absolute bottom-0 right-0 top-0 z-10 w-1.5 cursor-col-resize bg-transparent opacity-0 transition-opacity group-hover:opacity-100 hover:bg-primary/30"
                  onMouseDown={(e) => startResize(e, col.id, cols, setCols)}
                />
              </th>
            ))}
            <th className="min-w-[48px] border-b border-[#d7e7ff] px-3 py-3 text-slate-400 font-normal">
              <button 
                onClick={() => setCols(prev => [...prev, { id: `col_${Date.now()}`, name: `新字段 ${prev.length + 1}`, type: '文本', width: 120 }])}
                className="flex size-7 items-center justify-center rounded-lg transition-colors hover:bg-primary/8"
              >
                <GlassIcon icon="add" size="2xs" tone="primary" />
              </button>
            </th>
          </tr>
        </thead>
        <tbody className="text-slate-600">
          {selectedId ? (
            <tr>
              <td colSpan={cols.length + 2} className="p-0">
                {(() => {
                  const col = cols.find(c => c.id === selectedId);
                  if (!col) return null;
                  return (
                    <div className="border-y border-[#d7e7ff] bg-[linear-gradient(180deg,rgba(244,249,255,0.96),rgba(255,255,255,0.96))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
                      <div className="mb-4 flex items-center justify-between border-b border-[#d7e7ff] pb-3">
                        <h4 className="type-panel flex items-center gap-2 font-bold text-slate-800">
                          <GlassIcon icon="settings" size="2xs" tone="primary" />
                          字段高级配置: {col.name}
                        </h4>
                        <button 
                          onClick={() => setSelectedId(null)}
                          className="flex size-7 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-primary/8 hover:text-primary"
                        >
                          <GlassIcon icon="close" size="2xs" tone="slate" />
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {/* Basic Info */}
                        <div className="space-y-4 col-span-1">
                          <h5 className="mb-2 flex items-center gap-2 type-panel font-semibold text-slate-800"><GlassIcon icon="info" size="2xs" tone="sky" /> 基础信息</h5>
                          <div className="space-y-1">
                            <label className="type-caption font-semibold text-slate-500">字段名称</label>
                            <input 
                              type="text" 
                              value={col.name}
                              onChange={(e) => setCols(prev => prev.map(c => c.id === col.id ? { ...c, name: e.target.value } : c))}
                              className="glass-input w-full rounded-lg px-3 py-2 text-sm outline-none" 
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="type-caption font-semibold text-slate-500">字段类型</label>
                            <select 
                              value={col.type}
                              onChange={(e) => updateColType(col.id, e.target.value, setCols)}
                              className="glass-input w-full rounded-lg px-3 py-2 text-sm outline-none"
                            >
                              {FIELD_TYPE_OPTIONS.map((type) => (
                                <option key={type} value={type}>
                                  {type}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="type-caption font-semibold text-slate-500">列宽 (px)</label>
                            <input 
                              type="number" 
                              value={Math.round(col.width)}
                              onChange={(e) => setCols(prev => prev.map(c => c.id === col.id ? { ...c, width: Number(e.target.value) } : c))}
                              className="glass-input w-full rounded-lg px-3 py-2 text-sm outline-none" 
                            />
                          </div>
                        </div>
                        
                        {/* Advanced SQL */}
                        <div className="space-y-4 col-span-1 md:col-span-2">
                          <h5 className="mb-2 flex items-center gap-2 type-panel font-semibold text-slate-800"><GlassIcon icon="database" size="2xs" tone="indigo" /> 数据与计算</h5>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="type-caption font-semibold text-slate-500">关联值</label>
                              <input type="text" placeholder="例如: dict_type_1" className="glass-input w-full rounded-lg px-3 py-2 text-sm outline-none font-mono" />
                            </div>
                            <div className="space-y-1">
                              <label className="type-caption font-semibold text-slate-500">计算 SQL</label>
                              <input type="text" placeholder="例如: col1 + col2" className="glass-input w-full rounded-lg px-3 py-2 text-sm outline-none font-mono" />
                            </div>
                            <div className="space-y-1">
                              <label className="type-caption font-semibold text-slate-500">关联 SQL</label>
                              <textarea rows={2} placeholder="SELECT id, name FROM table" className="glass-input w-full resize-none rounded-lg px-3 py-2 text-sm outline-none font-mono" />
                            </div>
                            <div className="space-y-1">
                              <label className="type-caption font-semibold text-slate-500">动态 SQL</label>
                              <textarea rows={2} placeholder="WHERE status = 1" className="glass-input w-full resize-none rounded-lg px-3 py-2 text-sm outline-none font-mono" />
                            </div>
                          </div>
                        </div>

                        {/* Properties */}
                        <div className="space-y-4 col-span-1">
                          <h5 className="mb-2 flex items-center gap-2 type-panel font-semibold text-slate-800"><GlassIcon icon="toggle_on" size="2xs" tone="emerald" /> 属性控制</h5>
                          <div className="glass-panel-soft space-y-3 rounded-xl p-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" className="rounded border-slate-300 text-primary focus:ring-primary" defaultChecked />
                              <span className="type-body-sm text-slate-700">必填字段</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" className="rounded border-slate-300 text-primary focus:ring-primary" defaultChecked />
                              <span className="type-body-sm text-slate-700">在列表中显示</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" className="rounded border-slate-300 text-primary focus:ring-primary" />
                              <span className="type-body-sm text-slate-700">支持搜索</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" className="rounded border-slate-300 text-primary focus:ring-primary" />
                              <span className="type-body-sm text-slate-700">只读</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </td>
            </tr>
          ) : (
            <tr>
              <td colSpan={cols.length + 2} className="py-16 text-center text-slate-400">
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="flex size-14 items-center justify-center rounded-2xl border border-[#d7e7ff] bg-[linear-gradient(180deg,rgba(244,249,255,0.96),rgba(255,255,255,0.96))]">
                    <GlassIcon icon="data_object" size="sm" tone="slate" />
                  </div>
                  <div>
                    <p className="type-body-sm font-semibold text-slate-500">暂无数据表</p>
                  </div>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
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
  const activeSubsystemName = subsystems.find((item) => item.id === activeSubsystem)?.name || '';
  const isConfigFullscreenActive = isConfigOpen && configStep === 4 && isFullscreenConfig;
  const currentDetailFillType = DETAIL_FILL_TYPE_OPTIONS.some((option) => option.value === tabFillTypes[activeTab])
    ? tabFillTypes[activeTab]
    : DETAIL_FILL_TYPE_OPTIONS[0].value;

  useEffect(() => {
    setSelectedDetailColId(null);
    setSelectedDetailForDelete([]);
  }, [activeTab]);

  useEffect(() => {
    if (!isConfigOpen || configStep !== 4) {
      setIsFullscreenConfig(false);
    }
  }, [configStep, isConfigOpen]);

  const getDetailFillTypeMeta = (fillType?: string) => (
    DETAIL_FILL_TYPE_OPTIONS.find((option) => option.value === fillType) ?? DETAIL_FILL_TYPE_OPTIONS[0]
  );

  const renderDetailFillPlaceholder = () => {
    const fillTypeMeta = getDetailFillTypeMeta(currentDetailFillType);

    return (
      <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-4 rounded-[24px] border border-dashed border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(248,250,252,0.92))] px-8 text-center text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
        <GlassIcon icon={fillTypeMeta.icon} size="xl" tone="primary" />
        <div className="space-y-2">
          <div className="type-panel font-bold text-slate-800 dark:text-slate-200">{fillTypeMeta.label} 视图预留区</div>
          <div className="max-w-md type-body-sm">
            当前已切换为“{fillTypeMeta.label}”填充类型，这里将承载对应的展示组件与交互配置。
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
        <div className={`rounded-[24px] border border-white/70 bg-[linear-gradient(145deg,rgba(255,255,255,0.92),rgba(248,250,252,0.78))] p-4 shadow-[0_30px_60px_-45px_rgba(15,23,42,0.35)] dark:border-slate-700 dark:bg-slate-900/60 ${isConfigFullscreenActive ? 'mb-3' : 'mb-5'}`}>
          <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-start 2xl:justify-between">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
              {detailTabs.map((tab) => {
                const tabMeta = getDetailFillTypeMeta(tabFillTypes[tab.id]);
                const isActive = activeTab === tab.id;

                return (
                  <div
                    key={tab.id}
                    className={`group flex min-w-[180px] items-center gap-2 rounded-[22px] border px-2 py-2 transition-all ${
                      isActive
                        ? 'border-primary/30 bg-white text-slate-900 shadow-[0_20px_36px_-28px_rgba(14,116,144,0.65)] dark:bg-slate-800 dark:text-white'
                        : 'border-slate-200/80 bg-slate-50/80 text-slate-600 hover:border-primary/20 hover:bg-white dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300'
                    }`}
                  >
                    <button
                      onClick={() => setActiveTab(tab.id)}
                      className="flex min-w-0 flex-1 items-center gap-3 rounded-[18px] px-2 py-1.5 text-left"
                    >
                      <GlassIcon icon={tabMeta.icon} size="sm" tone={isActive ? 'primary' : 'slate'} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate type-body-sm font-semibold">{tab.name}</div>
                        <div className="mt-1 flex items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 type-caption font-semibold ${
                            isActive ? 'bg-primary/10 text-primary' : 'bg-slate-200/80 text-slate-500 dark:bg-slate-700 dark:text-slate-300'
                          }`}>
                            {tabMeta.label}
                          </span>
                          <span className="truncate type-caption text-slate-400">{tabMeta.description}</span>
                        </div>
                      </div>
                    </button>
                    {detailTabs.length > 1 && (
                      <button
                        onClick={(e) => deleteTab(tab.id, e)}
                        className="flex size-8 shrink-0 items-center justify-center rounded-2xl text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/10"
                        title="删除页签"
                      >
                        <GlassIcon icon="close" size="2xs" tone="rose" />
                      </button>
                    )}
                  </div>
                );
              })}

              <button
                onClick={addTab}
                className="inline-flex h-[54px] shrink-0 items-center gap-2 rounded-[20px] border border-dashed border-primary/30 bg-primary/5 px-4 type-button font-semibold text-primary transition-all hover:bg-primary/10 hover:shadow-[0_18px_30px_-24px_rgba(14,116,144,0.65)]"
              >
                <GlassIcon icon="add_circle" size="2xs" tone="primary" />
                新增页签
              </button>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 2xl:w-[440px]">
              {DETAIL_FILL_TYPE_OPTIONS.map((option) => {
                const isActive = currentDetailFillType === option.value;

                return (
                  <button
                    key={option.value}
                    onClick={() => setTabFillTypes((prev) => ({ ...prev, [activeTab]: option.value }))}
                    className={`rounded-[20px] border px-4 py-3 text-left transition-all ${
                      isActive
                        ? 'border-primary/35 bg-primary/10 text-primary shadow-[0_20px_36px_-26px_rgba(14,116,144,0.55)]'
                        : 'border-slate-200/80 bg-white/80 text-slate-600 hover:border-primary/25 hover:bg-primary/5 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <GlassIcon icon={option.icon} size="sm" tone={isActive ? 'primary' : 'slate'} />
                      <div className="min-w-0 flex-1">
                        <div className="type-body-sm font-semibold">{option.label}</div>
                        <div className="mt-1 type-caption text-slate-400">{option.description}</div>
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
                  <GlassIcon icon="table_rows" size="sm" tone="primary" />
                    <div>
                      <div className="type-panel font-semibold text-slate-700 dark:text-slate-200">明细字段配置</div>
                      <div className="type-caption text-slate-400">支持粘贴字段名并批量生成列</div>
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
                      className="inline-flex items-center gap-1 rounded-xl px-3 py-1.5 type-button font-semibold text-rose-500 transition-colors hover:bg-rose-50 dark:hover:bg-rose-500/10"
                    >
                      <GlassIcon icon="delete" size="2xs" tone="rose" />
                      删除 ({selectedDetailForDelete.length})
                    </button>
                  )}
                  <button
                    onClick={() => setDetailTableColumns((prev) => ({
                      ...prev,
                      [activeTab]: [...(prev[activeTab] || []), { id: `d_col_${Date.now()}`, name: `新字段 ${(prev[activeTab] || []).length + 1}`, type: '文本', width: 120 }],
                    }))}
                    className="inline-flex items-center gap-1 rounded-xl bg-primary px-3 py-1.5 type-button font-semibold text-white shadow-[0_16px_26px_-18px_rgba(14,116,144,0.65)] transition-all hover:bg-erp-blue"
                  >
                    <GlassIcon icon="add" size="2xs" tone="sky" />
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
                  detailTableColumns[activeTab] || [],
                  (newCols) => setDetailTableColumns((prev) => ({
                    ...prev,
                    [activeTab]: typeof newCols === 'function' ? newCols(prev[activeTab] || []) : newCols,
                  })),
                  selectedDetailColId,
                  setSelectedDetailColId,
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

        <div className={`flex items-center justify-between rounded-[20px] border border-slate-200/70 bg-white/80 px-4 py-3 type-body-sm text-slate-500 shadow-[0_16px_30px_-28px_rgba(15,23,42,0.35)] dark:border-slate-700 dark:bg-slate-900/50 ${isConfigFullscreenActive ? 'mt-3' : 'mt-4'}`}>
          <div className="flex items-center gap-2">
            <GlassIcon icon="info" size="2xs" tone="primary" />
            当前页签:
            <span className="font-bold text-slate-700 dark:text-slate-200">
              {detailTabs.find((tab) => tab.id === activeTab)?.name || '未选择'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-primary/10 px-2.5 py-1 type-caption font-semibold text-primary">{activeTabMeta.label}</span>
            <span>{activeTabMeta.description}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="app-atmosphere flex h-screen gap-4 overflow-hidden p-3 font-sans text-slate-900 dark:text-slate-100 md:p-4">
      {/* Sidebar Navigation */}
      <aside className="glass-panel-strong flex w-72 shrink-0 flex-col rounded-[32px]">
        {/* Brand Logo */}
        <div className="p-6 flex items-center gap-3">
          <GlassIcon icon="rocket_launch" size="lg" tone="primary" />
          <div className="flex flex-col">
            <h1 className="type-h3 text-slate-900 dark:text-white font-bold">朗速 AI</h1>
            <p className="type-meta text-primary font-bold tracking-wider">模块工作台</p>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
          <a className="glass-sheen flex items-center gap-3 rounded-[22px] px-4 py-3 text-slate-600 transition-colors hover:bg-white/45 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/65" href="#">
            <GlassIcon icon="dashboard" size="sm" tone="sky" />
            <span className="type-nav font-semibold">控制台</span>
          </a>

          {/* Expanded Subsystem Section */}
          <div className="space-y-1 pt-2">
            <button 
              onClick={() => setIsSubsystemOpen(!isSubsystemOpen)}
              className="glass-panel-soft w-full flex items-center justify-between gap-3 rounded-[22px] px-4 py-3 text-primary transition-colors"
            >
              <div className="flex items-center gap-3">
                <GlassIcon icon="account_tree" size="sm" tone="primary" />
                <span className="type-nav font-semibold">子系统配置</span>
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
                      className="glass-input w-full appearance-none rounded-[18px] px-3 py-2.5 type-body-sm font-semibold text-primary outline-none cursor-pointer"
                    >
                      {subsystems.map(sub => (
                        <option key={sub.id} value={sub.id}>{sub.name}</option>
                      ))}
                    </select>
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <GlassIcon icon="expand_more" size="2xs" tone="primary" />
                    </span>
                  </div>

                  <div className="ml-2 space-y-0.5 mt-2">
                    {menuData[activeSubsystem].map(menu => (
                      <button
                        key={menu.id}
                        onClick={() => handleMenuClick(menu.id)}
                        className={`w-full flex items-center gap-3 rounded-[18px] px-3 py-2.5 transition-colors ${
                          activeMenu === menu.id 
                            ? 'glass-button-primary text-white shadow-sm' 
                            : 'text-slate-500 hover:bg-white/45 dark:hover:bg-slate-800/65'
                        }`}
                      >
                        <GlassIcon icon={menu.icon} size="sm" tone={activeMenu === menu.id ? 'sky' : 'slate'} />
                        <span className="type-nav font-semibold">{menu.name}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="pt-2 space-y-1">
            <a className="glass-sheen flex items-center gap-3 rounded-[22px] px-4 py-3 text-slate-600 transition-colors hover:bg-white/45 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/65" href="#">
              <GlassIcon icon="schema" size="sm" tone="indigo" />
              <span className="type-nav font-semibold">表单流程</span>
            </a>
            <a className="glass-sheen flex items-center gap-3 rounded-[22px] px-4 py-3 text-slate-600 transition-colors hover:bg-white/45 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/65" href="#">
              <GlassIcon icon="smart_toy" size="sm" tone="cyan" />
              <span className="type-nav font-semibold">AI 生成</span>
            </a>
            <a className="glass-sheen flex items-center gap-3 rounded-[22px] px-4 py-3 text-slate-600 transition-colors hover:bg-white/45 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/65" href="#">
              <GlassIcon icon="menu_book" size="sm" tone="amber" />
              <span className="type-nav font-semibold">知识中心</span>
            </a>
          </div>
        </nav>

        {/* User Info */}
        <div className="relative border-t border-white/35 p-4">
          <button 
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="glass-panel-soft w-full flex items-center justify-between rounded-[24px] p-3 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 shrink-0 rounded-full border border-white/80 bg-slate-300 bg-cover bg-center shadow-[0_14px_28px_-24px_rgba(15,23,42,0.5)]" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAo89enNkqzoYdkb9ONwNeNg_myQ4q-s-AcgWsD1eYBfqrihZEHP9XvBAWfpzZHcKPOC8i1cd__r8V2W1wGzPzmj59sA9o_niCTnnQg-8KIDFB4Z5nHC3L1XKoqviq4CeqGnT_vVcMINVjckGM9cJBCbRpTKiis2JptKHUao34Tw_QwL6E1VjOld7ZtAa-jnHwT9Jo5nqwYn7Jwgf-i1w7ShT_MqoeIDOWWcMgFpmJza6ow1ncBHKcr67RoEEFBP3P-ffT7A_Izs0OM')" }}></div>
              <div className="flex flex-col min-w-0 text-left">
                <span className="type-body-sm font-bold text-slate-900 dark:text-white truncate">系统管理员</span>
                <span className="type-meta text-slate-500 truncate">admin@langsu.ai</span>
              </div>
            </div>
            <GlassIcon icon="more_vert" size="xs" tone="slate" />
          </button>

          <AnimatePresence>
            {isProfileOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="glass-panel absolute bottom-full left-4 right-4 z-50 mb-2 overflow-hidden rounded-[22px]"
              >
                <button 
                  onClick={onLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 type-body-sm text-rose-600 hover:bg-rose-50/70 dark:hover:bg-rose-900/20 transition-colors"
                >
                  <GlassIcon icon="logout" size="xs" tone="rose" />
                  <span className="font-medium">退出登录</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="min-w-0 flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="glass-toolbar z-10 mx-2 mt-2 flex h-16 shrink-0 items-center justify-between rounded-[28px] px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <h2 className="type-h3 font-bold text-slate-900 dark:text-white">模块配置工作台</h2>
            <div className="mx-2 h-4 w-px glass-separator"></div>
            <nav className="flex items-center gap-2 type-body-sm text-slate-500">
              <span className="hover:text-primary transition-colors cursor-pointer">
                {activeSubsystemName}
              </span>
              <GlassIcon icon="chevron_right" size="2xs" tone="slate" />
              <span className="text-slate-900 dark:text-slate-200 font-semibold tracking-tight">
                {activeMenuName}
              </span>
            </nav>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative group">
              <span className="absolute left-3 top-1/2 -translate-y-1/2"><GlassIcon icon="search" size="xs" tone="slate" /></span>
              <input className="glass-input w-72 rounded-[20px] py-2.5 pl-12 pr-4 text-base transition-all outline-none" placeholder="搜索模块名称、编码或状态..." type="text" />
            </div>
            <div className="flex items-center gap-2">
              <button className="relative transition-transform hover:-translate-y-0.5">
                <GlassIcon icon="notifications" size="sm" tone="sky" />
                <span className="absolute top-2 right-2 size-2 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900"></span>
              </button>
              <button className="transition-transform hover:-translate-y-0.5">
                <GlassIcon icon="settings" size="sm" tone="slate" />
              </button>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="relative flex-1 overflow-y-auto px-2 py-4 lg:px-2 lg:py-5">
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
              <div className="mb-10 flex shrink-0 items-start justify-between">
                <div className="space-y-2">
                  <h3 className="type-h1 font-extrabold text-slate-900 dark:text-white">
                    {activeMenuName} <span className="ml-1 text-2xl text-primary/40">/</span>{' '}
                    <span className="type-body-sm align-middle font-medium capitalize text-slate-400">{activeMenu}</span>
                  </h3>
                  <p className="type-body max-w-2xl text-slate-500">
                    管理{subsystems.find((s) => s.id === activeSubsystem)?.name}子系统下的{activeMenuName}相关业务模块。在这里您可以进行精细化核算配置、数据模型定义以及 AI 增强逻辑的导入。
                  </p>
                </div>
                <button className="glass-button-primary glass-sheen flex items-center gap-3 rounded-2xl px-6 py-3 text-white transition-all hover:-translate-y-0.5 active:translate-y-0">
                  <GlassIcon icon="add" size="sm" tone="sky" />
                  <span>新增业务模块</span>
                </button>
              </div>

              {/* Grid of Module Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-8">
                {/* Card 1 */}
                <div className="glass-panel glass-sheen group relative flex flex-col rounded-[30px] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_34px_70px_-40px_rgba(15,23,42,0.35)]">
                  <div className="flex items-start justify-between p-6 pb-0">
                    <GlassIcon icon="account_balance" size="xl" tone="primary" />
                    <div className="glass-chip-soft flex items-center gap-2 px-2.5 py-1 text-emerald-600 dark:text-emerald-400">
                      <span className="status-dot bg-emerald-500"></span>
                      <span className="type-status">已启用</span>
                    </div>
                  </div>
                  <div className="p-6 pt-5 flex-1">
                    <h4 className="type-h3 font-bold text-slate-900 dark:text-white mb-1 group-hover:text-primary transition-colors">{activeMenuName}模块 A</h4>
                    <div className="flex items-center gap-2 mb-4">
                      <code className="rounded border border-slate-200/50 bg-slate-100 px-1.5 py-0.5 type-code text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">FM-{activeMenu.toUpperCase().substring(0, 2)}-001</code>
                    </div>
                    <p className="type-body-sm text-slate-500 dark:text-slate-400 line-clamp-3">核心{activeMenuName}核算系统，包含凭证处理、账簿查询、报表生成等基础控制能力，支持跨部门自动结算。</p>
                  </div>
                  <div className="mt-auto flex items-center justify-between rounded-b-[30px] border-t border-white/35 px-6 py-4">
                    <div className="flex gap-4">
                      <button onClick={() => setIsConfigOpen(true)} className="flex items-center gap-1.5 type-button font-semibold text-slate-500 transition-colors hover:text-primary">
                        <GlassIcon icon="tune" size="xs" tone="slate" /> 配置
                      </button>
                      <button className="flex items-center gap-1.5 type-button font-semibold text-slate-500 transition-colors hover:text-primary">
                        <GlassIcon icon="visibility" size="xs" tone="slate" /> 详情
                      </button>
                    </div>
                    <button className="transition-transform hover:-translate-y-0.5">
                      <GlassIcon icon="more_horiz" size="xs" tone="slate" />
                    </button>
                  </div>
                </div>

                {/* Card 2 */}
                <div className="glass-panel glass-sheen group relative flex flex-col rounded-[30px] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_34px_70px_-40px_rgba(15,23,42,0.35)]">
                  <div className="flex items-start justify-between p-6 pb-0">
                    <GlassIcon icon="groups" size="xl" tone="indigo" />
                    <div className="glass-chip-soft flex items-center gap-2 px-2.5 py-1 text-amber-600 dark:text-amber-400">
                      <span className="status-dot bg-amber-500"></span>
                      <span className="type-status">维护中</span>
                    </div>
                  </div>
                  <div className="p-6 pt-5 flex-1">
                    <h4 className="type-h3 font-bold text-slate-900 dark:text-white mb-1 group-hover:text-indigo-600 transition-colors">{activeMenuName}模块 B</h4>
                    <div className="flex items-center gap-2 mb-4">
                      <code className="rounded border border-slate-200/50 bg-slate-100 px-1.5 py-0.5 type-code text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">HR-{activeMenu.toUpperCase().substring(0, 2)}-002</code>
                    </div>
                    <p className="type-body-sm text-slate-500 dark:text-slate-400 line-clamp-3">成本分析与管控，涉及薪酬计算、社保公积金支出控制，以及人力外包服务成本模型分析。</p>
                  </div>
                  <div className="mt-auto flex items-center justify-between rounded-b-[30px] border-t border-white/35 px-6 py-4">
                    <div className="flex gap-4">
                      <button onClick={() => setIsConfigOpen(true)} className="flex items-center gap-1.5 type-button font-semibold text-slate-500 transition-colors hover:text-indigo-600">
                        <GlassIcon icon="tune" size="xs" tone="indigo" /> 配置
                      </button>
                      <button className="flex items-center gap-1.5 type-button font-semibold text-slate-500 transition-colors hover:text-indigo-600">
                        <GlassIcon icon="visibility" size="xs" tone="indigo" /> 详情
                      </button>
                    </div>
                    <button className="transition-transform hover:-translate-y-0.5">
                      <GlassIcon icon="more_horiz" size="xs" tone="slate" />
                    </button>
                  </div>
                </div>

                {/* Card 3 */}
                <div className="glass-panel glass-sheen group relative flex flex-col rounded-[30px] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_34px_70px_-40px_rgba(15,23,42,0.35)]">
                  <div className="flex items-start justify-between p-6 pb-0">
                    <GlassIcon icon="inventory_2" size="xl" tone="cyan" />
                    <div className="glass-chip-soft flex items-center gap-2 px-2.5 py-1 text-emerald-600 dark:text-emerald-400">
                      <span className="status-dot bg-emerald-500"></span>
                      <span className="type-status">已启用</span>
                    </div>
                  </div>
                  <div className="p-6 pt-5 flex-1">
                    <h4 className="type-h3 font-bold text-slate-900 dark:text-white mb-1 group-hover:text-cyan-600 transition-colors">{activeMenuName}模块 C</h4>
                    <div className="flex items-center gap-2 mb-4">
                      <code className="rounded border border-slate-200/50 bg-slate-100 px-1.5 py-0.5 type-code text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">AM-{activeMenu.toUpperCase().substring(0, 2)}-003</code>
                    </div>
                    <p className="type-body-sm text-slate-500 dark:text-slate-400 line-clamp-3">覆盖固定资产与低值易耗品的折旧、维修、处置成本全生命周期跟踪，并集成智能折旧预测算法。</p>
                  </div>
                  <div className="mt-auto flex items-center justify-between rounded-b-[30px] border-t border-white/35 px-6 py-4">
                    <div className="flex gap-4">
                      <button onClick={() => setIsConfigOpen(true)} className="flex items-center gap-1.5 type-button font-semibold text-slate-500 transition-colors hover:text-cyan-600">
                        <GlassIcon icon="tune" size="xs" tone="cyan" /> 配置
                      </button>
                      <button className="flex items-center gap-1.5 type-button font-semibold text-slate-500 transition-colors hover:text-cyan-600">
                        <GlassIcon icon="visibility" size="xs" tone="cyan" /> 详情
                      </button>
                    </div>
                    <button className="transition-transform hover:-translate-y-0.5">
                      <GlassIcon icon="more_horiz" size="xs" tone="slate" />
                    </button>
                  </div>
                </div>

                {/* Add New Module Card (Distinct) */}
                <button className="glass-dashed-card group relative flex min-h-[320px] flex-col items-center justify-center rounded-[30px] p-8 transition-all duration-300 hover:-translate-y-1 hover:border-primary/35 hover:bg-white/40">
                  <div className="mb-6 transition-transform duration-300 group-hover:scale-110">
                    <GlassIcon icon="add" size="xl" tone="primary" />
                  </div>
                  <div className="text-center">
                    <h5 className="type-h3 font-bold text-slate-900 dark:text-white mb-2 group-hover:text-primary transition-colors">新增业务模块</h5>
                    <p className="type-body-sm text-slate-500 max-w-[180px]">基于 AI 模型快速生成，或手动配置新的业务单元。</p>
                  </div>
                  <div className="mt-8 flex gap-2">
                    <span className="rounded border border-slate-100 bg-white px-3 py-1 type-caption font-medium text-slate-400 transition-colors group-hover:text-slate-600 dark:border-slate-700 dark:bg-slate-800">快速配置</span>
                    <span className="rounded border border-slate-100 bg-white px-3 py-1 type-caption font-medium text-slate-400 transition-colors group-hover:text-slate-600 dark:border-slate-700 dark:bg-slate-800">AI 生成</span>
                  </div>
                </button>
              </div>

              {/* Footer / Status Summary */}
              <div className="glass-panel-soft mt-auto flex items-center justify-between rounded-[28px] px-6 py-5 type-body-sm text-slate-500">
                <div className="flex items-center gap-6">
                  <p>展示 <span className="font-bold text-slate-900 dark:text-white">4</span> 个活跃业务模块</p>
                  <div className="flex items-center gap-4 type-meta font-bold uppercase tracking-widest text-slate-400">
                    <div className="flex items-center gap-1.5"><span className="status-dot bg-emerald-500"></span> 3 已启用</div>
                    <div className="flex items-center gap-1.5"><span className="status-dot bg-amber-500"></span> 1 维护中</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button className="glass-button-secondary flex h-9 w-9 items-center justify-center rounded-xl transition-all hover:-translate-y-0.5">
                    <GlassIcon icon="chevron_left" size="2xs" tone="slate" />
                  </button>
                  <button className="glass-button-primary flex h-9 w-9 items-center justify-center rounded-xl font-bold text-white">1</button>
                  <button className="glass-button-secondary flex h-9 w-9 items-center justify-center rounded-xl font-medium transition-all hover:-translate-y-0.5">2</button>
                  <button className="glass-button-secondary flex h-9 w-9 items-center justify-center rounded-xl font-medium transition-all hover:-translate-y-0.5">3</button>
                  <button className="glass-button-secondary flex h-9 w-9 items-center justify-center rounded-xl transition-all hover:-translate-y-0.5">
                    <GlassIcon icon="chevron_right" size="2xs" tone="slate" />
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
            className="app-atmosphere fixed inset-0 z-[100] flex overflow-hidden"
          >
            {/* Toast Notification */}
            <AnimatePresence>
              {toastMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -20, x: '-50%' }}
                  animate={{ opacity: 1, y: 20, x: '-50%' }}
                  exit={{ opacity: 0, y: -20, x: '-50%' }}
                  className="fixed top-0 left-1/2 z-[300] flex items-center gap-2 rounded-2xl bg-rose-500/90 px-6 py-3 font-bold text-white shadow-[0_22px_48px_-28px_rgba(225,29,72,0.55)]"
                >
                  <GlassIcon icon="error" size="2xs" tone="rose" />
                  {toastMessage}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Left Subway Line Panel */}
            <div className={`glass-panel-strong flex shrink-0 flex-col overflow-hidden transition-all duration-300 ${
              isConfigFullscreenActive ? 'w-0 border-r-0 p-0 opacity-0' : 'w-96 p-10 opacity-100'
            }`}>
              <div className="mb-10">
                <div className="mb-4 flex items-center gap-4">
                  <button 
                    onClick={() => setIsConfigOpen(false)}
                    className="glass-button-secondary flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition-colors hover:text-slate-900 dark:hover:text-white"
                  >
                    <GlassIcon icon="close" size="xs" tone="slate" />
                  </button>
                  <div>
                    <span className="glass-chip-soft px-3 py-1 type-caption font-semibold text-primary">5 步工作流</span>
                    <div className="mt-3 type-h3 font-bold text-slate-900 dark:text-white">配置向导</div>
                  </div>
                </div>
                <p className="type-body-sm max-w-[24rem] text-slate-500">
                  以统一的企业级蓝白规范完成菜单、说明、调研、模块设置和预览发布，确保每一步都有清晰的信息层级。
                </p>
              </div>

              <div className="relative flex flex-1 flex-col gap-10">
                {/* Continuous Line */}
                <div className="absolute left-[19px] top-5 bottom-10 w-[2px] rounded-full bg-[linear-gradient(180deg,rgba(20,118,255,0.18),rgba(20,118,255,0.04))]" />
                
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
                      className={`relative z-10 flex items-start gap-6 group ${isLocked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                    >
                      {/* Node */}
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all duration-500 ${
                        isLocked
                          ? 'border border-slate-200 bg-white text-slate-400'
                          : isCompleted
                            ? isActive
                              ? 'bg-[linear-gradient(135deg,#0f5fff,#1476ff)] shadow-[0_0_0_8px_rgba(20,118,255,0.14)]'
                              : 'bg-[linear-gradient(135deg,#0f5fff,#1476ff)] shadow-[0_0_0_4px_rgba(20,118,255,0.08)]'
                            : isActive
                              ? 'border border-primary bg-white shadow-[0_0_0_8px_rgba(20,118,255,0.12)]'
                              : 'border-2 border-[#d7e7ff] bg-white group-hover:border-primary/50'
                      }`}>
                        {isLocked ? (
                          <GlassIcon icon="lock" size="xs" tone="slate" />
                        ) : isCompleted ? (
                          <span className="text-sm font-bold text-white">✓</span>
                        ) : isActive ? (
                          <motion.div layoutId="activeNode" className="h-3 w-3 rounded-full bg-primary" />
                        ) : (
                          <span className="text-base font-bold text-slate-400">{step.id}</span>
                        )}
                      </div>
                      
                      {/* Text */}
                      <div className="mt-1.5 flex flex-col">
                        <span className={`type-panel font-semibold transition-colors duration-300 ${
                          isActive ? 'text-primary' : isCompleted ? 'text-slate-800' : 'text-slate-500 group-hover:text-slate-700'
                        }`}>
                          {step.title}
                        </span>
                        <span className="mt-2 type-body-sm text-slate-500">{step.desc}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Content Area */}
            <div className="relative flex min-w-0 flex-1 flex-col">
              {/* Ambient Background */}
              <div className="absolute inset-0 mesh-bg opacity-50 pointer-events-none"></div>
              {isConfigFullscreenActive && (
                <div className="absolute right-6 top-6 z-20">
                  <button
                    onClick={() => setIsConfigOpen(false)}
                    className="glass-button-secondary flex size-11 items-center justify-center rounded-2xl text-slate-500 transition-all hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                  >
                    <GlassIcon icon="close" size="xs" tone="slate" />
                  </button>
                </div>
              )}
               
              <div className={`relative z-10 flex flex-1 flex-col ${
                isConfigFullscreenActive ? 'overflow-hidden p-4 lg:p-5' : 'overflow-y-auto p-8 lg:p-12'
              }`}>
                <motion.div
                  key={configStep}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className={`mx-auto flex w-full flex-1 min-h-0 flex-col ${isConfigFullscreenActive ? 'max-w-none overflow-hidden' : 'max-w-[1600px]'}`}
                >
                  <div className="mb-0"></div>

                  {/* Dynamic Content Area */}
                  {configStep === 1 && (
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 flex-1">
                      {/* Left Column: Core Information */}
                      <div className="xl:col-span-2 flex flex-col gap-8">
                        <div className="glass-panel rounded-[30px] p-8 relative overflow-hidden">
                          {/* Decorative background element */}
                          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
                          
                          <div className="relative z-10">
                            <div className="space-y-6">
                              <div className="grid grid-cols-2 gap-6">
                                {/* 模块编码 */}
                                <div className="space-y-2.5">
                                  <label className="type-body-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                    模块编码 <span className="text-rose-500">*</span>
                                  </label>
                                  <div className="relative flex items-center">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2"><GlassIcon icon="tag" size="xs" tone="slate" /></span>
                                    <input type="text" className="w-full pl-11 pr-4 py-3 glass-input rounded-xl text-base focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-mono text-slate-700 dark:text-slate-200 font-medium" defaultValue="FM-CO-001" />
                                  </div>
                                </div>

                                {/* 模块名称 */}
                                <div className="space-y-2.5">
                                  <label className="type-body-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                    模块名称 <span className="text-rose-500">*</span>
                                  </label>
                                  <div className="relative flex items-center">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2"><GlassIcon icon="title" size="xs" tone="slate" /></span>
                                    <input type="text" className="w-full pl-11 pr-4 py-3 glass-input rounded-xl text-base focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-900 dark:text-white font-bold" defaultValue="成本控制" />
                                  </div>
                                </div>
                              </div>

                              {/* 业务类型 (Segmented Control) */}
                              <div className="space-y-2.5">
                                <label className="type-body-sm font-semibold text-slate-700 dark:text-slate-300">业务类型</label>
                                <div className="glass-panel-soft relative flex rounded-xl p-1.5">
                                  {(['document', 'table', 'tree'] as const).map((type) => {
                                    const isActive = businessType === type;
                                    const labels = { document: '单据模式', table: '列表模式', tree: '树形模式' };
                                    const icons = { document: 'receipt_long', table: 'table_chart', tree: 'account_tree' };
                                    return (
                                      <button
                                        key={type}
                                        onClick={() => setBusinessType(type)}
                                        className={`relative flex-1 py-2.5 rounded-lg text-base font-bold flex items-center justify-center gap-2 transition-colors z-10 ${isActive ? 'text-primary' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                                      >
                                        {isActive && (
                                          <motion.div
                                            layoutId="businessTypeIndicator"
                                            className="glass-panel-soft absolute inset-0 rounded-lg -z-10"
                                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                          />
                                        )}
                                        <GlassIcon icon={icons[type]} size="2xs" tone={isActive ? 'primary' : 'slate'} />
                                        {labels[type]}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* 常用功能 */}
                              <div className="space-y-3">
                                <label className="type-body-sm font-semibold text-slate-700 dark:text-slate-300">常用功能配置</label>
                                <div className="flex flex-wrap gap-3 relative">
                                  {commonFuncs.map(funcId => {
                                    const func = funcOptions.find(f => f.id === funcId);
                                    if (!func) return null;
                                    return (
                                      <div key={func.id} className="glass-chip-soft flex items-center gap-2 px-4 py-2.5 type-button font-semibold text-primary shadow-sm">
                                        <GlassIcon icon={func.icon} size="2xs" tone="primary" />
                                        {func.name}
                                        <button onClick={() => toggleFunc(func.id)} className="ml-1 hover:text-rose-500 transition-colors flex items-center justify-center">
                                          <GlassIcon icon="close" size="2xs" tone="rose" />
                                        </button>
                                      </div>
                                    );
                                  })}
                                  <div className="relative">
                                    <button onClick={() => setIsFuncPopoverOpen(!isFuncPopoverOpen)} className="glass-dashed-card flex items-center gap-2 rounded-xl px-4 py-2.5 type-button font-semibold text-slate-500 transition-all hover:border-primary/50 hover:bg-primary/5 hover:text-primary dark:border-slate-600">
                                      <GlassIcon icon="add" size="2xs" tone="primary" />
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
                                            <div className="mb-2 px-2 pt-1 type-caption font-semibold text-slate-400">选择常用功能</div>
                                            <div className="space-y-1">
                                              {funcOptions.map(func => {
                                                const isSelected = commonFuncs.includes(func.id);
                                                return (
                                                  <button
                                                    key={func.id}
                                                    onClick={() => toggleFunc(func.id)}
                                                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left type-body-sm transition-colors ${isSelected ? 'bg-primary/10 font-semibold text-primary' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700'}`}
                                                  >
                                                    <div className="flex items-center gap-2">
                                                      <GlassIcon icon={func.icon} size="2xs" tone={isSelected ? 'primary' : 'slate'} />
                                                      {func.name}
                                                    </div>
                                                    {isSelected && <GlassIcon icon="check" size="2xs" tone="emerald" />}
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
                                <label className="type-body-sm font-semibold text-slate-700 dark:text-slate-300">模块简介</label>
                                <textarea className="w-full px-5 py-4 glass-input rounded-xl text-base focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none text-slate-700 dark:text-slate-300 leading-relaxed" rows={4} defaultValue="核心成本控制核算系统，包含凭证处理、账簿查询、报表生成等基础控制能力，支持跨部门自动结算。"></textarea>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right Column: Visual & Routing */}
                      <div className="flex flex-col gap-6">
                        {/* 瑙嗚涓庣姸鎬?*/}
                        <div className="glass-panel rounded-[30px] overflow-hidden">
                          <div className="glass-panel-soft flex items-center gap-3 px-6 py-4">
                            <GlassIcon icon="palette" size="sm" tone="indigo" />
                            <h3 className="type-panel font-semibold text-slate-800 dark:text-slate-200">视觉与状态</h3>
                          </div>

                          <div className="p-6 space-y-6">
                            {/* 图标选择器 */}
                            <div className="space-y-3">
                              <label className="type-body-sm font-semibold text-slate-700 dark:text-slate-300">菜单图标</label>
                              <div className="flex items-center gap-4 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 group hover:border-primary/30 transition-all hover:shadow-sm">
                                <div className="group-hover:scale-105 transition-transform">
                                  <GlassIcon icon="payments" size="lg" tone="primary" />
                                </div>
                                <div className="flex-1">
                                  <div className="type-panel font-semibold text-slate-800 dark:text-slate-200">payments</div>
                                  <div className="mt-0.5 type-body-sm text-slate-500">图标库</div>
                                </div>
                                <button className="rounded-lg border border-slate-200 bg-white px-4 py-2 type-button font-semibold text-slate-600 shadow-sm transition-colors hover:text-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-primary">更换</button>
                              </div>
                            </div>

                            {/* 启用状态 */}
                            <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                              <div>
                                <div className="type-panel font-semibold text-slate-800 dark:text-slate-200">启用模块</div>
                                <div className="mt-0.5 type-body-sm text-slate-500">关闭后用户将无法访问此模块</div>
                              </div>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" defaultChecked />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-500"></div>
                              </label>
                            </div>
                          </div>
                        </div>

                        {/* 导航规则 */}
                        <div className="glass-panel rounded-[30px] overflow-hidden">
                          <div className="glass-panel-soft flex items-center gap-3 px-6 py-4">
                            <GlassIcon icon="route" size="sm" tone="emerald" />
                            <h3 className="type-panel font-semibold text-slate-800 dark:text-slate-200">导航规则</h3>
                          </div>

                          <div className="p-6 space-y-5">
                            <div className="space-y-3">
                              <label className="type-body-sm font-semibold text-slate-700 dark:text-slate-300">所属分组</label>
                              <div className="relative group">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"><GlassIcon icon="folder" size="xs" tone="slate" /></span>
                                <select className="w-full pl-11 pr-10 py-3 glass-input rounded-xl text-base focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-700 dark:text-slate-300 cursor-pointer appearance-none font-medium hover:border-primary/30">
                                  <option>财务管理</option>
                                  <option>人力资源</option>
                                  <option>供应链管理</option>
                                </select>
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"><GlassIcon icon="expand_more" size="2xs" tone="slate" /></span>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-3">
                                <label className="type-body-sm font-semibold text-slate-700 dark:text-slate-300">分组序号</label>
                                <input type="number" className="w-full px-4 py-3 glass-input rounded-xl text-base focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-700 dark:text-slate-300 font-mono hover:border-primary/30" defaultValue="1" />
                              </div>
                              <div className="space-y-3">
                                <label className="type-body-sm font-semibold text-slate-700 dark:text-slate-300">行号</label>
                                <input type="number" className="w-full px-4 py-3 glass-input rounded-xl text-base focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-700 dark:text-slate-300 font-mono hover:border-primary/30" defaultValue="10" />
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
                      className={`glass-panel-strong flex min-h-[600px] flex-1 flex-col overflow-hidden rounded-[32px] ${
                        isFullscreenEditor ? 'fixed inset-4 z-[200] shadow-2xl' : ''
                      }`}
                    >
                      {/* Editor Toolbar */}
                      <div className="border-b border-primary/10 bg-[linear-gradient(180deg,rgba(244,249,255,0.96),rgba(255,255,255,0.92))] px-4 py-3">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <span className="glass-chip-soft px-3 py-1 type-caption font-semibold text-primary">富文本编辑器</span>
                            <p className="mt-2 type-body-sm text-slate-500">面向产品说明、功能说明和交付文档的统一内容编辑区</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => setIsFullscreenEditor(!isFullscreenEditor)}
                              className="glass-button-secondary flex items-center gap-1.5 rounded-xl px-3 py-2 type-body-sm font-semibold text-slate-600"
                            >
                              <GlassIcon icon={isFullscreenEditor ? 'fullscreen_exit' : 'fullscreen'} size="2xs" tone="slate" />
                              {isFullscreenEditor ? '退出全屏' : '全屏编辑'}
                            </button>
                            <button className="glass-button-primary flex items-center gap-1.5 rounded-xl px-3 py-2 type-body-sm font-semibold text-white">
                              <GlassIcon icon="auto_awesome" size="2xs" tone="sky" />
                              AI 润色
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <div className="glass-chip-soft flex items-center gap-2 px-3 py-2">
                            <GlassIcon icon="text_fields" size="2xs" tone="slate" />
                            <select className="border-none bg-transparent type-body-sm font-semibold text-slate-700 focus:ring-0 cursor-pointer">
                            <option>正文</option>
                            <option>标题 1</option>
                            <option>标题 2</option>
                            <option>标题 3</option>
                          </select>
                          </div>
                          <div className="glass-chip-soft flex items-center gap-1 px-2 py-1.5">
                            <button className="flex size-8 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-primary/8 hover:text-primary"><GlassIcon icon="format_bold" size="2xs" tone="slate" /></button>
                            <button className="flex size-8 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-primary/8 hover:text-primary"><GlassIcon icon="format_italic" size="2xs" tone="slate" /></button>
                            <button className="flex size-8 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-primary/8 hover:text-primary"><GlassIcon icon="format_underlined" size="2xs" tone="slate" /></button>
                            <button className="flex size-8 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-primary/8 hover:text-primary"><GlassIcon icon="format_strikethrough" size="2xs" tone="slate" /></button>
                          </div>
                          <div className="glass-chip-soft flex items-center gap-1 px-2 py-1.5">
                            <button className="flex size-8 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-primary/8 hover:text-primary"><GlassIcon icon="format_list_bulleted" size="2xs" tone="slate" /></button>
                            <button className="flex size-8 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-primary/8 hover:text-primary"><GlassIcon icon="format_list_numbered" size="2xs" tone="slate" /></button>
                            <button className="flex size-8 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-primary/8 hover:text-primary"><GlassIcon icon="format_quote" size="2xs" tone="slate" /></button>
                          </div>
                          <div className="glass-chip-soft flex items-center gap-1 px-2 py-1.5">
                            <button className="flex size-8 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-primary/8 hover:text-primary"><GlassIcon icon="link" size="2xs" tone="slate" /></button>
                            <button className="flex size-8 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-primary/8 hover:text-primary"><GlassIcon icon="image" size="2xs" tone="slate" /></button>
                            <button className="flex size-8 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-primary/8 hover:text-primary"><GlassIcon icon="table_chart" size="2xs" tone="slate" /></button>
                          </div>
                        </div>
                      </div>
                      
                      {/* Editor Content Area */}
                      <div className="flex-1 overflow-y-auto bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(246,250,255,0.92))] p-8">
                        <div className="w-full h-full mx-auto">
                          <h1 className="mb-6 type-h1 font-bold text-slate-900 outline-none" contentEditable suppressContentEditableWarning>成本控制模块详细说明</h1>
                          <div className="prose prose-slate max-w-none outline-none min-h-[400px]" contentEditable suppressContentEditableWarning>
                            <p className="mb-4 type-body text-slate-600">
                              成本控制模块是财务管理子系统的核心组件，旨在为企业提供全方位的成本核算、分析与控制能力。该模块通过整合各业务环节的数据，实现成本的精细化管理。                            </p>
                            <h3 className="mb-4 mt-8 type-h3 font-bold text-slate-800">核心功能</h3>
                            <ul className="mb-6 list-disc space-y-2 pl-5 text-slate-600">
                              <li><strong>成本核算:</strong> 支持多种成本核算方法，如标准成本法、实际成本法和作业成本法，自动归集和分配各项成本费用。</li>
                              <li><strong>预算控制:</strong> 建立多维度的成本预算体系，实时监控预算执行情况，并提供超预算预警能力。</li>
                              <li><strong>成本分析:</strong> 提供丰富的成本分析报表，支持多维度、多视角的成本构成分析、趋势分析和差异分析。</li>
                              <li><strong>成本预测:</strong> 基于历史数据和业务模型，利用 AI 算法进行成本预测，辅助管理层决策。</li>
                            </ul>
                            
                            <div className="glass-dashed-card group mt-8 flex cursor-pointer flex-col items-center justify-center rounded-[24px] p-6 text-slate-400 transition-colors">
                              <div className="mb-3 transition-transform group-hover:scale-110">
                                <GlassIcon icon="add_photo_alternate" size="md" tone="primary" />
                              </div>
                              <span className="type-body font-medium group-hover:text-primary transition-colors">拖拽或点击上传流程图/架构图</span>
                              <span className="mt-1 type-body-sm opacity-70">支持 PNG、JPG、SVG 格式</span>
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
                        <div className={`grid flex-1 min-h-0 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] ${isConfigFullscreenActive ? 'h-full gap-4' : 'min-h-[860px] gap-6'}`}>
                          <div className={`grid min-h-0 ${isConfigFullscreenActive ? 'gap-4 xl:grid-cols-[minmax(250px,0.82fr)_minmax(0,1.18fr)]' : 'gap-6 xl:grid-cols-[minmax(280px,0.92fr)_minmax(0,1.08fr)]'}`}>
                            <div className="flex min-h-0 flex-col overflow-hidden rounded-[28px] border border-white/70 bg-white/88 shadow-[0_30px_60px_-44px_rgba(15,23,42,0.35)] backdrop-blur-xl dark:border-slate-700 dark:bg-slate-800/88">
                              <div className="flex items-center justify-between border-b border-slate-200/70 bg-[linear-gradient(180deg,rgba(248,250,252,0.92),rgba(255,255,255,0.76))] px-6 py-4 dark:border-slate-700 dark:bg-slate-800/70">
                                <div className="flex items-center gap-3">
                                  <GlassIcon icon="source" size="sm" tone="indigo" />
                                  <div>
                                    <h3 className="type-panel font-semibold text-slate-800 dark:text-slate-200">档案来源区</h3>
                                    <p className="mt-0.5 type-body-sm text-slate-400">拖拽来源对象，组成档案页签的数据基础</p>
                                  </div>
                                </div>
                                <span className="rounded-full bg-indigo-50 px-3 py-1 type-caption font-semibold text-indigo-500 dark:bg-indigo-500/10">来源池</span>
                              </div>
                              <div className={`flex min-h-0 flex-1 flex-col gap-3 ${isConfigFullscreenActive ? 'overflow-hidden p-4' : 'overflow-y-auto p-5'}`}>
                                {['基础资料', '单据接口', '关联实体', '外部附件'].map((source) => (
                                  <button
                                    key={source}
                                    className="group flex items-center gap-3 rounded-[22px] border border-slate-200/80 bg-slate-50/80 px-4 py-4 text-left transition-all hover:border-primary/30 hover:bg-white hover:shadow-[0_20px_30px_-26px_rgba(14,116,144,0.4)] dark:border-slate-700 dark:bg-slate-900/50"
                                  >
                                    <GlassIcon icon="dataset" size="md" tone="slate" />
                                    <div className="min-w-0 flex-1">
                                      <div className="type-panel font-semibold text-slate-700 dark:text-slate-200">{source}</div>
                                      <div className="mt-1 type-body-sm text-slate-400">支持拖入页签并自动带入字段结构</div>
                                    </div>
                                    <GlassIcon icon="arrow_forward" size="2xs" tone="slate" className="transition-transform group-hover:translate-x-0.5" />
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className={`grid min-h-0 ${isConfigFullscreenActive ? 'gap-4 lg:grid-rows-[minmax(0,1fr)_minmax(0,1fr)]' : 'gap-6 lg:grid-rows-2'}`}>
                              <div className="flex min-h-0 flex-col overflow-hidden rounded-[28px] border border-white/70 bg-white/88 shadow-[0_30px_60px_-44px_rgba(15,23,42,0.35)] backdrop-blur-xl dark:border-slate-700 dark:bg-slate-800/88">
                                <div className="flex items-center justify-between border-b border-slate-200/70 bg-[linear-gradient(180deg,rgba(248,250,252,0.92),rgba(255,255,255,0.76))] px-6 py-4 dark:border-slate-700 dark:bg-slate-800/70">
                                  <div className="flex items-center gap-3">
                                    <GlassIcon icon="dashboard_customize" size="sm" tone="emerald" />
                                    <div>
                                      <h3 className="type-panel font-semibold text-slate-800 dark:text-slate-200">档案主布局</h3>
                                      <p className="mt-0.5 type-body-sm text-slate-400">主表单、概要信息与操作面板的排布区域</p>
                                    </div>
                                  </div>
                                  <button className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-white/85 px-4 py-2 type-button font-semibold text-primary transition-all hover:bg-primary/5 dark:border-slate-700 dark:bg-slate-800">
                                    <GlassIcon icon="edit_square" size="2xs" tone="primary" />
                                    编辑布局
                                  </button>
                                </div>
                                <div className="flex min-h-0 flex-1 items-center justify-center bg-[linear-gradient(180deg,rgba(248,250,252,0.76),rgba(255,255,255,0.9))] p-8 dark:bg-slate-900/40">
                                  <div className="flex h-full w-full flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-slate-200/80 bg-white/60 text-slate-400 transition-colors hover:border-primary/25 hover:bg-white dark:border-slate-700 dark:bg-slate-900/40">
                                    <div className="mb-4">
                                      <GlassIcon icon="add_box" size="xl" tone="primary" />
                                    </div>
                                    <div className="type-panel font-semibold text-slate-700 dark:text-slate-200">拖拽组件到这里搭建档案页</div>
                                    <div className="mt-2 type-body-sm text-slate-400">支持头部摘要、详情表单、操作侧栏等组合区域</div>
                                  </div>
                                </div>
                              </div>

                              <div className="flex min-h-0 flex-col overflow-hidden rounded-[28px] border border-white/70 bg-white/88 shadow-[0_30px_60px_-44px_rgba(15,23,42,0.35)] backdrop-blur-xl dark:border-slate-700 dark:bg-slate-800/88">
                                <div className="flex items-center justify-between border-b border-slate-200/70 bg-[linear-gradient(180deg,rgba(248,250,252,0.92),rgba(255,255,255,0.76))] px-6 py-4 dark:border-slate-700 dark:bg-slate-800/70">
                                  <div className="flex items-center gap-3">
                                    <GlassIcon icon="list_alt" size="sm" tone="amber" />
                                    <div>
                                      <h3 className="type-panel font-semibold text-slate-800 dark:text-slate-200">档案明细预览</h3>
                                      <p className="mt-0.5 type-body-sm text-slate-400">预览档案页中下方明细区域的字段效果</p>
                                    </div>
                                  </div>
                                  <span className="rounded-full bg-amber-50 px-3 py-1 type-caption font-semibold text-amber-500 dark:bg-amber-500/10">明细预览</span>
                                </div>
                                <div className="flex min-h-0 flex-1 items-center px-6 py-5">
                                  <div className="w-full overflow-hidden rounded-[22px] border border-slate-200/80 dark:border-slate-700">
                                    <table className="w-full text-left text-sm">
                                      <thead className="bg-slate-50/90 text-slate-500 dark:bg-slate-900/70">
                                        <tr>
                                          <th className="px-5 py-3 font-medium">字段名称</th>
                                          <th className="px-5 py-3 font-medium">类型</th>
                                          <th className="px-5 py-3 font-medium">必填</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100 text-slate-700 dark:divide-slate-700 dark:text-slate-300">
                                        {[
                                          ['物料编码', '文本', '是'],
                                          ['物料名称', '文本', '是'],
                                          ['规格型号', '文本', '否'],
                                        ].map((row) => (
                                          <tr key={row[0]} className="bg-white/70 hover:bg-slate-50/80 dark:bg-slate-900/30 dark:hover:bg-slate-800/50">
                                            <td className="px-5 py-3 font-medium">{row[0]}</td>
                                            <td className="px-5 py-3">
                                              <span className="rounded-full bg-slate-100 px-2.5 py-1 type-body-sm font-medium dark:bg-slate-800">{row[1]}</span>
                                            </td>
                                            <td className="px-5 py-3">
                                              <span className={`rounded-full px-2.5 py-1 type-body-sm font-semibold ${
                                                row[2] === '是'
                                                  ? 'bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400'
                                                  : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
                                              }`}>
                                                {row[2]}
                                              </span>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex min-h-0 flex-col overflow-hidden rounded-[28px] border border-white/70 bg-white/88 shadow-[0_30px_60px_-44px_rgba(15,23,42,0.35)] backdrop-blur-xl dark:border-slate-700 dark:bg-slate-800/88">
                            <div className="flex items-center justify-between border-b border-slate-200/70 bg-[linear-gradient(180deg,rgba(248,250,252,0.92),rgba(255,255,255,0.76))] px-6 py-4 dark:border-slate-700 dark:bg-slate-800/70">
                              <div className="flex items-center gap-3">
                                <GlassIcon icon="tab_group" size="sm" tone="sky" />
                                <div>
                                  <h3 className="type-panel font-semibold text-slate-800 dark:text-slate-200">明细页签设计</h3>
                                  <p className="mt-0.5 type-body-sm text-slate-400">页签结构、填充类型与明细列配置统一在这里完成</p>
                                </div>
                              </div>
                              <span className="rounded-full bg-blue-50 px-3 py-1 type-caption font-semibold text-blue-500 dark:bg-blue-500/10">页签设计</span>
                            </div>
                            {renderDetailTabsWorkspace('document')}
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
                              <div className="flex min-h-0 flex-col overflow-hidden rounded-[24px] border border-white/70 bg-white/88 shadow-[0_24px_44px_-34px_rgba(15,23,42,0.3)] dark:border-slate-700 dark:bg-slate-800/88">
                                <div className="flex items-center justify-between border-b border-slate-200/70 bg-[linear-gradient(180deg,rgba(248,250,252,0.92),rgba(255,255,255,0.76))] px-5 py-4 dark:border-slate-700 dark:bg-slate-800/70">
                                  <div className="flex items-center gap-3">
                                    <GlassIcon icon="view_sidebar" size="sm" tone="primary" />
                                    <div>
                                      <h4 className="type-panel font-semibold text-slate-800 dark:text-slate-200">左侧表配置</h4>
                                      <p className="mt-0.5 type-body-sm text-slate-400">控制树节点、分类维度与导航层级</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {selectedLeftForDelete.length > 0 && (
                                      <button
                                        onClick={() => {
                                          setLeftTableColumns((prev) => prev.filter((c) => !selectedLeftForDelete.includes(c.id)));
                                          setSelectedLeftForDelete([]);
                                        }}
                                        className="inline-flex items-center gap-1 rounded-xl px-3 py-1.5 type-button font-semibold text-rose-500 transition-colors hover:bg-rose-50 dark:hover:bg-rose-500/10"
                                      >
                                        <GlassIcon icon="delete" size="2xs" tone="rose" />
                                        删除 ({selectedLeftForDelete.length})
                                      </button>
                                    )}
                                    <button
                                      onClick={() => setLeftTableColumns((prev) => [...prev, { id: `l_col_${Date.now()}`, name: `新字段 ${prev.length + 1}`, type: '文本', width: 120 }])}
                                      className="inline-flex items-center gap-1 rounded-xl bg-primary px-3 py-1.5 type-button font-semibold text-white shadow-[0_16px_28px_-20px_rgba(14,116,144,0.6)] transition-all hover:bg-erp-blue"
                                    >
                                      <GlassIcon icon="add" size="2xs" tone="sky" />
                                      新增
                                    </button>
                                  </div>
                                </div>
                                <div
                                  className="min-h-0 flex-1 overflow-auto outline-none"
                                  tabIndex={0}
                                  onPaste={(e) => handlePasteColumns(e, setLeftTableColumns)}
                                >
                                  {renderTableBuilder(leftTableColumns, setLeftTableColumns, selectedLeftColId, setSelectedLeftColId, selectedLeftForDelete, setSelectedLeftForDelete)}
                                </div>
                              </div>
                            )}

                            <div className="grid min-h-0 gap-5 lg:grid-rows-[minmax(0,1fr)_minmax(0,1fr)]">
                              <div className="flex min-h-0 flex-col overflow-hidden rounded-[24px] border border-white/70 bg-white/88 shadow-[0_24px_44px_-34px_rgba(15,23,42,0.3)] dark:border-slate-700 dark:bg-slate-800/88">
                                <div className="flex items-center justify-between border-b border-slate-200/70 bg-[linear-gradient(180deg,rgba(248,250,252,0.92),rgba(255,255,255,0.76))] px-5 py-4 dark:border-slate-700 dark:bg-slate-800/70">
                                  <div className="flex items-center gap-3">
                                    <GlassIcon icon="table_rows" size="sm" tone="emerald" />
                                    <div>
                                      <h4 className="type-panel font-semibold text-slate-800 dark:text-slate-200">主表字段配置</h4>
                                      <p className="mt-0.5 type-body-sm text-slate-400">当前模块的主表单字段、类型与列宽设置</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {selectedMainForDelete.length > 0 && (
                                      <button
                                        onClick={() => {
                                          setMainTableColumns((prev) => prev.filter((c) => !selectedMainForDelete.includes(c.id)));
                                          setSelectedMainForDelete([]);
                                        }}
                                        className="inline-flex items-center gap-1 rounded-xl px-3 py-1.5 type-button font-semibold text-rose-500 transition-colors hover:bg-rose-50 dark:hover:bg-rose-500/10"
                                      >
                                        <GlassIcon icon="delete" size="2xs" tone="rose" />
                                        删除 ({selectedMainForDelete.length})
                                      </button>
                                    )}
                                    <button
                                      onClick={() => setMainTableColumns((prev) => [...prev, { id: `m_col_${Date.now()}`, name: `新字段 ${prev.length + 1}`, type: '文本', width: 120 }])}
                                      className="inline-flex items-center gap-1 rounded-xl bg-primary px-3 py-1.5 type-button font-semibold text-white shadow-[0_16px_28px_-20px_rgba(14,116,144,0.6)] transition-all hover:bg-erp-blue"
                                    >
                                      <GlassIcon icon="add" size="2xs" tone="sky" />
                                      新增
                                    </button>
                                  </div>
                                </div>
                                <div
                                  className="min-h-0 flex-1 overflow-auto outline-none"
                                  tabIndex={0}
                                  onPaste={(e) => handlePasteColumns(e, setMainTableColumns)}
                                >
                                  {renderTableBuilder(mainTableColumns, setMainTableColumns, selectedMainColId, setSelectedMainColId, selectedMainForDelete, setSelectedMainForDelete)}
                                </div>
                              </div>

                              <div className="flex min-h-0 flex-col overflow-hidden rounded-[24px] border border-white/70 bg-white/88 shadow-[0_24px_44px_-34px_rgba(15,23,42,0.3)] dark:border-slate-700 dark:bg-slate-800/88">
                                <div className="flex items-center justify-between border-b border-slate-200/70 bg-[linear-gradient(180deg,rgba(248,250,252,0.92),rgba(255,255,255,0.76))] px-5 py-4 dark:border-slate-700 dark:bg-slate-800/70">
                                  <div className="flex items-center gap-3">
                                    <GlassIcon icon="tab_group" size="sm" tone="sky" />
                                    <div>
                                      <h4 className="type-panel font-semibold text-slate-800 dark:text-slate-200">明细页签配置</h4>
                                      <p className="mt-0.5 type-body-sm text-slate-400">把页签新增、选中和填充类型选择集中到同一工作区</p>
                                    </div>
                                  </div>
                                  <span className="rounded-full bg-blue-50 px-3 py-1 type-caption font-semibold text-blue-500 dark:bg-blue-500/10">明细页签</span>
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
                    <div className="grid flex-1 min-h-[650px] grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)]">
                      <div className="glass-panel-strong flex flex-col overflow-hidden rounded-[30px]">
                        <div className="border-b border-primary/8 bg-[linear-gradient(180deg,rgba(244,249,255,0.96),rgba(255,255,255,0.92))] p-6">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <GlassIcon icon="smart_toy" size="md" tone="primary" />
                              <div>
                                <span className="glass-chip-soft px-3 py-1 type-caption font-semibold text-primary">AI 调研会话</span>
                                <h3 className="mt-3 type-panel font-semibold text-slate-800">AI 架构助手</h3>
                                <p className="mt-1 type-body-sm text-slate-500">通过问答快速定位开发模式、数据来源和交付建议</p>
                              </div>
                            </div>
                            <span className="glass-chip-soft px-3 py-1 type-caption font-semibold text-primary">实时分析</span>
                          </div>
                        </div>

                        <div className="flex-1 space-y-6 overflow-y-auto bg-[linear-gradient(180deg,rgba(246,250,255,0.94),rgba(255,255,255,0.94))] p-6 custom-scrollbar">
                          <div className="flex gap-4">
                            <GlassIcon icon="smart_toy" size="md" tone="primary" />
                            <div className="max-w-[85%] rounded-[24px] rounded-tl-none border border-primary/8 bg-white/96 p-4 text-base leading-relaxed text-slate-700 shadow-[0_18px_36px_-28px_rgba(8,69,166,0.18)]">
                              您好。为了更好地为您构建【成本控制】模块，我需要先确认开发模式。您希望采用哪一种？
                            </div>
                          </div>

                          {surveyStep === 0 && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap gap-3 pl-14">
                              {['标准 CRUD 模式', '复杂审批流模式', '数据看板模式'].map((opt) => (
                                <button
                                  key={opt}
                                  onClick={() => {
                                    setSurveyAnswers([opt]);
                                    setSurveyStep(1);
                                  }}
                                  className="rounded-xl border border-primary/16 bg-white px-5 py-2.5 text-base font-bold text-primary shadow-[0_12px_24px_-18px_rgba(8,69,166,0.18)] transition-all hover:-translate-y-0.5 hover:bg-primary hover:text-white"
                                >
                                  {opt}
                                </button>
                              ))}
                            </motion.div>
                          )}

                          {surveyStep > 0 && (
                            <div className="flex flex-row-reverse gap-4">
                              <GlassIcon icon="person" size="md" tone="slate" />
                              <div className="max-w-[85%] rounded-[24px] rounded-tr-none bg-[linear-gradient(135deg,#0f5fff,#1476ff)] p-4 text-base leading-relaxed text-white shadow-[0_18px_36px_-24px_rgba(20,118,255,0.32)]">
                                {surveyAnswers[0]}
                              </div>
                            </div>
                          )}

                          {surveyStep > 0 && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-4">
                              <GlassIcon icon="smart_toy" size="md" tone="primary" />
                              <div className="max-w-[85%] rounded-[24px] rounded-tl-none border border-primary/8 bg-white/96 p-4 text-base leading-relaxed text-slate-700 shadow-[0_18px_36px_-28px_rgba(8,69,166,0.18)]">
                                好的，已选择“{surveyAnswers[0]}”。请问该模块的数据来源主要是什么？
                              </div>
                            </motion.div>
                          )}

                          {surveyStep === 1 && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap gap-3 pl-14">
                              {['手工录入为主', '外部系统对接 (API)', 'Excel 批量导入'].map((opt) => (
                                <button
                                  key={opt}
                                  onClick={() => {
                                    setSurveyAnswers((prev) => [...prev, opt]);
                                    setSurveyStep(2);
                                    setIsGenerating(true);
                                    setTimeout(() => setIsGenerating(false), 3000);
                                  }}
                                  className="rounded-xl border border-primary/16 bg-white px-5 py-2.5 text-base font-bold text-primary shadow-[0_12px_24px_-18px_rgba(8,69,166,0.18)] transition-all hover:-translate-y-0.5 hover:bg-primary hover:text-white"
                                >
                                  {opt}
                                </button>
                              ))}
                            </motion.div>
                          )}

                          {surveyStep > 1 && (
                            <div className="flex flex-row-reverse gap-4">
                              <GlassIcon icon="person" size="md" tone="slate" />
                              <div className="max-w-[85%] rounded-[24px] rounded-tr-none bg-[linear-gradient(135deg,#0f5fff,#1476ff)] p-4 text-base leading-relaxed text-white shadow-[0_18px_36px_-24px_rgba(20,118,255,0.32)]">
                                {surveyAnswers[1]}
                              </div>
                            </div>
                          )}

                          {surveyStep > 1 && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-4">
                              <GlassIcon icon="check" size="md" tone="emerald" />
                              <div className="max-w-[85%] rounded-[24px] rounded-tl-none border border-primary/8 bg-white/96 p-4 text-base leading-relaxed text-slate-700 shadow-[0_18px_36px_-28px_rgba(8,69,166,0.18)]">
                                调研完成，我已经理解您的需求。右侧是为您生成的底层领域模型与执行计划，请查阅。
                              </div>
                            </motion.div>
                          )}
                        </div>

                        {surveyStep > 1 && (
                          <div className="border-t border-primary/8 bg-[linear-gradient(180deg,rgba(244,249,255,0.96),rgba(255,255,255,0.92))] p-4">
                            <button
                              onClick={() => {
                                setSurveyStep(0);
                                setSurveyAnswers([]);
                                setIsGenerating(false);
                              }}
                              className="glass-button-secondary flex w-full items-center justify-center gap-2 rounded-xl py-3 text-base font-bold text-slate-600 transition-all hover:text-primary"
                            >
                              <GlassIcon icon="refresh" size="2xs" tone="slate" />
                              重新开始调研
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="glass-panel-strong relative flex flex-col overflow-hidden rounded-[30px] p-6">
                        <div className="pointer-events-none absolute left-1/2 top-0 h-36 w-[120%] -translate-x-1/2 bg-[radial-gradient(circle,rgba(20,118,255,0.16),transparent_70%)] blur-[50px]"></div>

                        <div className="relative z-10 mb-6 flex items-start justify-between gap-4">
                          <div>
                            <span className="glass-chip-soft px-3 py-1 type-caption font-semibold text-primary">执行计划</span>
                            <h3 className="mt-3 type-panel font-semibold text-slate-800">领域模型与架构评估</h3>
                            <p className="mt-1 type-body-sm text-slate-500">根据调研结果生成结构化方案和交付建议</p>
                          </div>
                          {surveyStep >= 2 && (
                            <span className={`glass-chip-soft px-3 py-1 type-caption font-semibold ${isGenerating ? 'text-amber-500' : 'text-primary'}`}>
                              {isGenerating ? '生成中' : '已完成'}
                            </span>
                          )}
                        </div>

                        <div className="relative z-10 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                          {surveyStep < 2 ? (
                            <div className="glass-panel-soft flex h-full flex-col items-center justify-center space-y-4 rounded-[28px] text-slate-500">
                              <GlassIcon icon="hourglass_empty" size="xl" tone="slate" className="opacity-55" />
                              <p className="text-base">等待调研完成以生成执行计划...</p>
                            </div>
                          ) : (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                              <div className="flex gap-4">
                                <div className="relative mt-1">
                                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(135deg,#0f5fff,#1476ff)] shadow-[0_14px_28px_-16px_rgba(20,118,255,0.3)]">
                                    <span className="text-sm font-bold text-white">1</span>
                                  </div>
                                  <div className="absolute left-1/2 top-10 h-12 w-px -translate-x-1/2 bg-primary/16"></div>
                                </div>
                                <div className="glass-panel-soft flex-1 rounded-[24px] p-5">
                                  <div className="flex items-center gap-3">
                                    <span className="glass-chip-soft px-3 py-1 type-caption font-semibold text-primary">步骤 1</span>
                                    <div className="type-panel font-semibold text-slate-800">解析业务需求</div>
                                  </div>
                                  <p className="mt-3 type-body-sm leading-relaxed text-slate-600">
                                    已提取核心诉求：模式为“{surveyAnswers[0]}”，数据来源为“{surveyAnswers[1]}”。
                                  </p>
                                </div>
                              </div>

                              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }} className="flex gap-4">
                                <div className="relative mt-1">
                                  <div className={`flex h-10 w-10 items-center justify-center rounded-full ${isGenerating ? 'bg-[linear-gradient(135deg,#f59e0b,#fbbf24)]' : 'bg-[linear-gradient(135deg,#0f5fff,#1476ff)]'} shadow-[0_14px_28px_-16px_rgba(20,118,255,0.3)]`}>
                                    {isGenerating ? (
                                      <span className="material-symbols-outlined animate-spin text-sm text-white">sync</span>
                                    ) : (
                                      <span className="text-sm font-bold text-white">✓</span>
                                    )}
                                  </div>
                                  <div className="absolute left-1/2 top-10 h-24 w-px -translate-x-1/2 bg-primary/16"></div>
                                </div>
                                <div className="glass-panel-soft flex-1 rounded-[24px] p-5">
                                  <div className="flex items-center gap-3">
                                    <span className="glass-chip-soft px-3 py-1 type-caption font-semibold text-primary">步骤 2</span>
                                    <div className="type-panel font-semibold text-slate-800">构建领域模型</div>
                                  </div>
                                  <p className="mt-3 type-body-sm leading-relaxed text-slate-600">
                                    正在生成数据表结构草案、关联关系和关键对象映射，便于后续模块设置直接继承。
                                  </p>
                                  <div className="glass-code mt-4 rounded-[20px] p-4 font-mono text-sm leading-relaxed text-sky-100">
                                    <span className="mr-2 text-slate-500">$</span> Table CostCenter created<br />
                                    <span className="mr-2 text-slate-500">$</span> Table BOM_Cost_Rollup created<br />
                                    <span className="mr-2 text-slate-500">$</span> Relations mapped successfully
                                  </div>
                                </div>
                              </motion.div>

                              {!isGenerating && (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-4">
                                  <div className="mt-1">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(135deg,#0f5fff,#1476ff)] shadow-[0_14px_28px_-16px_rgba(20,118,255,0.3)]">
                                      <span className="text-sm font-bold text-white">3</span>
                                    </div>
                                  </div>
                                  <div className="glass-panel-soft flex-1 rounded-[24px] p-5">
                                    <div className="flex items-center gap-3">
                                      <span className="glass-chip-soft px-3 py-1 type-caption font-semibold text-primary">步骤 3</span>
                                      <div className="type-panel font-semibold text-slate-800">输出架构评估报告</div>
                                    </div>
                                    <p className="mt-3 type-body-sm leading-relaxed text-slate-600">
                                      已基于“{surveyAnswers[0]}”自动生成页面布局草案、表单结构和实施建议，便于团队快速进入设计评审。
                                    </p>

                                    <div className="mt-4 space-y-3 rounded-[20px] border border-primary/8 bg-white/90 p-5">
                                      <div className="mb-2 flex items-center gap-2 border-b border-primary/8 pb-3">
                                        <GlassIcon icon="analytics" size="2xs" tone="primary" />
                                        <span className="type-panel font-semibold text-slate-800">架构方案评估报告</span>
                                      </div>
                                      <p className="type-body-sm text-slate-600"><span className="font-semibold text-slate-800">核心模式:</span> {surveyAnswers[0]}</p>
                                      <p className="type-body-sm text-slate-600"><span className="font-semibold text-slate-800">数据来源:</span> {surveyAnswers[1]}</p>
                                      <p className="type-body-sm text-slate-600"><span className="font-semibold text-slate-800">复杂度评估:</span> <span className="font-semibold text-amber-500">High (高)</span></p>
                                      <p className="type-body-sm text-slate-600"><span className="font-semibold text-slate-800">预计开发周期:</span> 2.5 Weeks</p>
                                      <div className="border-t border-primary/8 pt-3">
                                        <p className="mb-2 type-body-sm font-semibold text-slate-800">推荐技术栈与中间件</p>
                                        <ul className="list-disc space-y-1 pl-5 type-body-sm text-slate-600">
                                          <li>前端: React 18 + TailwindCSS + Framer Motion</li>
                                          <li>后端: Node.js (NestJS) + Prisma ORM</li>
                                          <li>存储: PostgreSQL (支持复杂 BOM 树形查询)</li>
                                          <li>缓存: Redis (应对高并发查询压力)</li>
                                        </ul>
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
                    <div className="glass-panel rounded-[30px] p-10 flex-1 min-h-[500px] flex items-center justify-center">
                      <div className="text-center space-y-4">
                        <div className="mx-auto mb-6">
                          <GlassIcon icon="preview" size="xl" tone="primary" />
                        </div>
                        <h3 className="type-h3 font-bold text-slate-700 dark:text-slate-300">
                          {configSteps.find(s => s.id === configStep)?.title}内容区域
                        </h3>
                        <p className="mx-auto max-w-sm type-body-sm text-slate-400">
                          这里是高级配置面板的内容占位区域。您可以根据具体业务需求，在此处渲染表单、图表或预览界面。                        </p>
                      </div>
                    </div>
                  )}
                </motion.div>
              </div>

              {/* Bottom Action Bar */}
              <div
                className={`shrink-0 border-t border-primary/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(246,250,255,0.92))] backdrop-blur-xl shadow-[0_-10px_40px_rgba(8,69,166,0.08)] ${
                  isConfigFullscreenActive ? 'px-8 lg:px-10' : 'px-12 lg:px-16'
                }`}
              >
                <div className="flex h-28 items-center justify-between gap-6">
                  <button
                    onClick={() => setConfigStep(Math.max(1, configStep - 1))}
                    className={`inline-flex items-center gap-2 rounded-2xl border px-6 py-3 text-base font-semibold transition-all ${
                      configStep === 1
                        ? 'cursor-not-allowed border-slate-200/80 bg-slate-100/70 text-slate-300 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-600'
                        : 'border-slate-200/80 bg-white/80 text-slate-600 shadow-[0_10px_30px_rgba(15,23,42,0.06)] hover:-translate-y-0.5 hover:border-primary/30 hover:text-primary dark:border-slate-700/80 dark:bg-slate-900/70 dark:text-slate-200'
                    }`}
                    disabled={configStep === 1}
                  >
                    <GlassIcon icon="arrow_back" size="2xs" tone="slate" />
                    上一步
                  </button>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        if (!completedSteps.includes(configStep)) {
                          setCompletedSteps([...completedSteps, configStep]);
                        }
                      }}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-white/80 px-6 py-3 text-base font-semibold text-slate-600 shadow-[0_12px_32px_rgba(15,23,42,0.06)] transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:text-primary dark:border-slate-700/80 dark:bg-slate-900/70 dark:text-slate-200"
                    >
                      <GlassIcon icon="save" size="2xs" tone="slate" />
                      保存本页
                    </button>

                    {configStep === 4 && (
                      <button
                        onClick={() => setIsFullscreenConfig((prev) => !prev)}
                        className={`inline-flex items-center gap-2 rounded-2xl border px-6 py-3 text-base font-semibold transition-all ${
                          isConfigFullscreenActive
                            ? 'border-primary/30 bg-primary/10 text-primary shadow-[0_16px_36px_rgba(14,116,144,0.18)]'
                            : 'border-slate-200/80 bg-white/80 text-slate-600 shadow-[0_12px_32px_rgba(15,23,42,0.06)] hover:-translate-y-0.5 hover:border-primary/30 hover:text-primary dark:border-slate-700/80 dark:bg-slate-900/70 dark:text-slate-200'
                        }`}
                      >
                        <GlassIcon icon={isConfigFullscreenActive ? 'fullscreen_exit' : 'fullscreen'} size="2xs" tone={isConfigFullscreenActive ? 'primary' : 'slate'} />
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
                      className="inline-flex items-center gap-2 rounded-2xl bg-primary px-7 py-3 text-base font-semibold text-white shadow-[0_18px_40px_rgba(14,116,144,0.28)] transition-all hover:-translate-y-0.5 hover:bg-erp-blue"
                    >
                      {configStep === 5 ? '完成配置' : '下一步'}
                      {configStep !== 5 && <GlassIcon icon="arrow_forward" size="2xs" tone="sky" />}
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



