import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface DashboardProps {
  onLogout: () => void;
}

type Subsystem = 'finance' | 'hr' | 'supply';

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
  const [tabFillTypes, setTabFillTypes] = useState<Record<string, string>>({ tab1: '表格', tab2: '操作日志' });
  const [selectedLeftColId, setSelectedLeftColId] = useState<string | null>(null);
  const [selectedMainColId, setSelectedMainColId] = useState<string | null>(null);
  const [selectedLeftForDelete, setSelectedLeftForDelete] = useState<string[]>([]);
  const [selectedMainForDelete, setSelectedMainForDelete] = useState<string[]>([]);

  const [detailTableColumns, setDetailTableColumns] = useState<Record<string, any[]>>({
    tab1: [
      { id: 'd_col1', name: '附件名称', type: '文本', width: 150 },
      { id: 'd_col2', name: '上传人', type: '文本', width: 100 },
    ]
  });
  const [selectedDetailColId, setSelectedDetailColId] = useState<string | null>(null);
  const [selectedDetailForDelete, setSelectedDetailForDelete] = useState<string[]>([]);

  const addTab = () => {
    const newId = `tab_${Date.now()}`;
    setDetailTabs([...detailTabs, { id: newId, name: `新页签 ${detailTabs.length + 1}` }]);
    setActiveTab(newId);
    setTabFillTypes({ ...tabFillTypes, [newId]: '表格' });
    setDetailTableColumns({ ...detailTableColumns, [newId]: [
      { id: `d_col_${Date.now()}_1`, name: '新字段1', type: '文本', width: 120 },
      { id: `d_col_${Date.now()}_2`, name: '新字段2', type: '文本', width: 120 },
    ] });
  };

  const deleteTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newTabs = detailTabs.filter(t => t.id !== id);
    setDetailTabs(newTabs);
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
      <table className="w-full text-left text-[13px] border-collapse">
        <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 select-none sticky top-0 z-20">
          <tr>
            <th className="w-10 border-r border-slate-200 dark:border-slate-700 text-center py-2">
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
                className={`border-r border-slate-200 dark:border-slate-700 relative group cursor-pointer transition-colors ${
                  selectedId === col.id ? 'bg-primary/10' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                onClick={() => setSelectedId(col.id)}
              >
                <div className="flex items-center gap-2 p-1.5">
                  <input 
                    type="checkbox" 
                    className="rounded border-slate-300 text-primary focus:ring-primary shrink-0"
                    checked={selectedForDelete.includes(col.id)} 
                    onChange={(e) => handleSelectCol(e, col.id)} 
                    onClick={e => e.stopPropagation()} 
                  />
                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <div className="font-bold truncate text-[12px]" title={col.name}>{col.name}</div>
                    <div className="relative" onClick={e => e.stopPropagation()}>
                      <select 
                        className="w-full text-[11px] bg-transparent border border-slate-200 dark:border-slate-600 rounded px-1 py-0.5 text-slate-500 dark:text-slate-400 focus:ring-1 focus:ring-primary outline-none appearance-none cursor-pointer"
                        value={col.type}
                        onChange={(e) => updateColType(col.id, e.target.value, setCols)}
                      >
                        <option value="文本">文本</option>
                        <option value="数字">数字</option>
                        <option value="下拉框">下拉框</option>
                        <option value="搜索框">搜索框</option>
                        <option value="日期框">日期框</option>
                        <option value="复选框">复选框</option>
                        <option value="多选框">多选框</option>
                      </select>
                      <span className="material-symbols-outlined absolute right-0.5 top-1/2 -translate-y-1/2 text-[12px] text-slate-400 pointer-events-none">arrow_drop_down</span>
                    </div>
                  </div>
                </div>
                {/* Resize Handle */}
                <div 
                  className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-primary z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                  onMouseDown={(e) => startResize(e, col.id, cols, setCols)}
                />
              </th>
            ))}
            <th className="py-2 px-3 text-slate-400 font-normal min-w-[40px]">
              <button 
                onClick={() => setCols(prev => [...prev, { id: `col_${Date.now()}`, name: `新字段${prev.length + 1}`, type: '文本', width: 120 }])}
                className="size-6 rounded hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
              </button>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 text-slate-600 dark:text-slate-400">
          {selectedId ? (
            <tr>
              <td colSpan={cols.length + 2} className="p-0">
                {(() => {
                  const col = cols.find(c => c.id === selectedId);
                  if (!col) return null;
                  return (
                    <div className="bg-slate-50/80 dark:bg-slate-900/80 border-y border-slate-200 dark:border-slate-700 p-5 shadow-inner">
                      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200 dark:border-slate-700">
                        <h4 className="text-[14px] font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                          <span className="material-symbols-outlined text-[18px] text-primary">settings</span>
                          字段高级配置: {col.name}
                        </h4>
                        <button 
                          onClick={() => setSelectedId(null)}
                          className="size-6 rounded hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {/* Basic Info */}
                        <div className="space-y-4 col-span-1">
                          <h5 className="text-[12px] font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-1"><span className="material-symbols-outlined text-[14px] text-slate-400">info</span> 基础信息</h5>
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-500">字段名称</label>
                            <input 
                              type="text" 
                              value={col.name}
                              onChange={(e) => setCols(prev => prev.map(c => c.id === col.id ? { ...c, name: e.target.value } : c))}
                              className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-[12px] focus:ring-1 focus:ring-primary outline-none" 
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-500">字段类型</label>
                            <select 
                              value={col.type}
                              onChange={(e) => updateColType(col.id, e.target.value, setCols)}
                              className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-[12px] focus:ring-1 focus:ring-primary outline-none"
                            >
                              <option value="文本">文本</option>
                              <option value="数字">数字</option>
                              <option value="下拉框">下拉框</option>
                              <option value="搜索框">搜索框</option>
                              <option value="日期框">日期框</option>
                              <option value="复选框">复选框</option>
                              <option value="多选框">多选框</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-500">列宽 (px)</label>
                            <input 
                              type="number" 
                              value={Math.round(col.width)}
                              onChange={(e) => setCols(prev => prev.map(c => c.id === col.id ? { ...c, width: Number(e.target.value) } : c))}
                              className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-[12px] focus:ring-1 focus:ring-primary outline-none" 
                            />
                          </div>
                        </div>
                        
                        {/* Advanced SQL */}
                        <div className="space-y-4 col-span-1 md:col-span-2">
                          <h5 className="text-[12px] font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-1"><span className="material-symbols-outlined text-[14px] text-slate-400">database</span> 数据与计算</h5>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[11px] font-bold text-slate-500">关联值</label>
                              <input type="text" placeholder="例如: dict_type_1" className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-[12px] focus:ring-1 focus:ring-primary outline-none font-mono" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[11px] font-bold text-slate-500">计算 SQL</label>
                              <input type="text" placeholder="例如: col1 + col2" className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-[12px] focus:ring-1 focus:ring-primary outline-none font-mono" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[11px] font-bold text-slate-500">关联 SQL</label>
                              <textarea rows={2} placeholder="SELECT id, name FROM table" className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-[12px] focus:ring-1 focus:ring-primary outline-none font-mono resize-none" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[11px] font-bold text-slate-500">动态 SQL</label>
                              <textarea rows={2} placeholder="WHERE status = 1" className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-[12px] focus:ring-1 focus:ring-primary outline-none font-mono resize-none" />
                            </div>
                          </div>
                        </div>

                        {/* Properties */}
                        <div className="space-y-4 col-span-1">
                          <h5 className="text-[12px] font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-1"><span className="material-symbols-outlined text-[14px] text-slate-400">toggle_on</span> 属性控制</h5>
                          <div className="space-y-3 bg-white dark:bg-slate-800 p-3 rounded-md border border-slate-200 dark:border-slate-700">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" className="rounded border-slate-300 text-primary focus:ring-primary" defaultChecked />
                              <span className="text-[12px] text-slate-700 dark:text-slate-300">必填字段</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" className="rounded border-slate-300 text-primary focus:ring-primary" defaultChecked />
                              <span className="text-[12px] text-slate-700 dark:text-slate-300">在列表中显示</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" className="rounded border-slate-300 text-primary focus:ring-primary" />
                              <span className="text-[12px] text-slate-700 dark:text-slate-300">支持搜索</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" className="rounded border-slate-300 text-primary focus:ring-primary" />
                              <span className="text-[12px] text-slate-700 dark:text-slate-300">只读</span>
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
                  <div className="size-12 rounded-full bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center border border-slate-100 dark:border-slate-700">
                    <span className="material-symbols-outlined text-[24px] text-slate-300 dark:text-slate-600">data_object</span>
                  </div>
                  <div>
                    <p className="font-bold text-[13px] text-slate-500 dark:text-slate-400">暂无数据行</p>
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
      { id: 'logistics', name: '物流追踪', icon: 'local_shipping' }
    ]
  };

  const handleMenuClick = (menuId: string) => {
    setActiveMenu(menuId);
  };

  const activeMenuName = menuData[activeSubsystem].find(m => m.id === activeMenu)?.name || '';

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
            <p className="text-primary text-[10px] font-bold uppercase tracking-wider">Module Workspace</p>
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
                    管理{subsystems.find(s => s.id === activeSubsystem)?.name}子系统下的{activeMenuName}相关业务模块。在此您可以进行精细化核算配置、数据模型定义及AI增强逻辑的导入。
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
                    <p className="text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-3">成本分析与管控，涉及薪酬计算、社保公积金支出控制及人力外包服务成本模型分析。</p>
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
                    <p className="text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-3">固定资产与低值易耗品的折旧、维修、处置成本全生命周期跟踪，集成智能折旧预估算法。</p>
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
                    <p className="text-[13px] text-slate-500 max-w-[180px] leading-relaxed">基于 AI 模型快速生成或手动配置新的业务单元</p>
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

            {/* Left Subway Line Panel */}
            <div className="w-96 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-10 flex flex-col shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10">
              <div className="flex items-center gap-4 mb-14">
                <button 
                  onClick={() => setIsConfigOpen(false)}
                  className="size-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
                <span className="font-extrabold text-xl text-slate-900 dark:text-white tracking-tight">配置向导</span>
              </div>

              <div className="relative flex flex-col gap-12 flex-1">
                {/* Continuous Line */}
                <div className="absolute left-[19px] top-5 bottom-10 w-[2px] bg-slate-100 dark:bg-slate-800 rounded-full" />
                
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
                          showToast('请先保存“菜单信息”步骤后再进行模块设置');
                        }
                      }}
                      className={`relative z-10 flex items-start gap-6 group ${isLocked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                    >
                      {/* Node */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all duration-500 ${
                        isLocked
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                          : isCompleted
                            ? isActive 
                              ? 'bg-emerald-500 shadow-[0_0_0_8px_rgba(16,185,129,0.2)]'
                              : 'bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.1)]'
                            : isActive 
                              ? 'bg-primary shadow-[0_0_0_8px_rgba(14,116,144,0.15)] dark:shadow-[0_0_0_8px_rgba(14,116,144,0.3)]' 
                              : 'bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 group-hover:border-primary/50'
                      }`}>
                        {isLocked ? (
                          <span className="material-symbols-outlined text-[18px]">lock</span>
                        ) : isCompleted ? (
                          <span className="material-symbols-outlined text-white text-[20px] font-bold">check</span>
                        ) : isActive ? (
                          <motion.div layoutId="activeNode" className="w-3 h-3 bg-white rounded-full" />
                        ) : (
                          <span className="text-slate-400 text-[14px] font-bold">{step.id}</span>
                        )}
                      </div>
                      
                      {/* Text */}
                      <div className="flex flex-col mt-1.5">
                        <span className={`text-[16px] font-bold transition-colors duration-300 ${
                          isActive ? 'text-primary' : isCompleted ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                        }`}>
                          {step.title}
                        </span>
                        <span className="text-[13px] text-slate-500 mt-2 leading-relaxed">{step.desc}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Content Area */}
            <div className="flex-1 flex flex-col bg-slate-50/50 dark:bg-slate-900/50 relative">
              {/* Ambient Background */}
              <div className="absolute inset-0 mesh-bg opacity-50 pointer-events-none"></div>
              
              <div className="flex-1 p-8 lg:p-12 overflow-y-auto relative z-10 flex flex-col">
                <motion.div
                  key={configStep}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="w-full max-w-[1600px] mx-auto flex-1 flex flex-col"
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
                                {/* 模块编号 */}
                                <div className="space-y-2.5">
                                  <label className="text-[13px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                    模块编号 <span className="text-rose-500">*</span>
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
                                    const labels = { document: '单据模型', table: '单表模型', tree: '树形模型' };
                                    const icons = { document: 'receipt_long', table: 'table_chart', tree: 'account_tree' };
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

                              {/* 模块简介 */}
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
                        {/* 视觉与状态 */}
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
                                  <div className="text-[12px] text-slate-500 mt-0.5">Material Symbol</div>
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
                              成本控制模块是财务管理子系统的核心组件，旨在为企业提供全方位的成本核算、分析与控制能力。本模块通过集成各业务环节的数据，实现成本的精细化管理。
                            </p>
                            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mt-8 mb-4">核心功能</h3>
                            <ul className="list-disc pl-5 space-y-2 text-slate-600 dark:text-slate-300 mb-6">
                              <li><strong>成本核算：</strong> 支持多种成本核算方法（如标准成本法、实际成本法、作业成本法），自动归集和分配各项成本费用。</li>
                              <li><strong>预算控制：</strong> 建立多维度的成本预算体系，实时监控预算执行情况，提供超预算预警功能。</li>
                              <li><strong>成本分析：</strong> 提供丰富的成本分析报表，支持多维度、多视角的成本构成分析、趋势分析和差异分析。</li>
                              <li><strong>成本预测：</strong> 基于历史数据和业务模型，利用 AI 算法进行成本预测，辅助管理层决策。</li>
                            </ul>
                            
                            <div className="mt-8 p-6 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer group">
                              <div className="size-12 rounded-full bg-white dark:bg-slate-700 shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                <span className="material-symbols-outlined text-[24px] text-slate-400 group-hover:text-primary">add_photo_alternate</span>
                              </div>
                              <span className="text-[14px] font-medium group-hover:text-primary transition-colors">拖拽或点击上传流程图/架构图</span>
                              <span className="text-[12px] mt-1 opacity-70">支持 PNG, JPG, SVG 格式</span>
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
                      className="flex-1 flex flex-col"
                    >
                      {businessType === 'document' ? (
                        <div className="flex flex-col gap-6 flex-1 min-h-[700px]">
                          {/* Top Section */}
                          <div className="flex-1 flex gap-6 min-h-[400px]">
                            {/* Left: 多页签的来源 */}
                            <div className="w-1/3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm flex flex-col overflow-hidden">
                              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50 flex items-center gap-3">
                                <div className="size-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                                  <span className="material-symbols-outlined text-[18px]">source</span>
                                </div>
                                <h3 className="text-[15px] font-bold text-slate-800 dark:text-slate-200">多页签来源</h3>
                              </div>
                              <div className="flex-1 p-5 overflow-y-auto">
                                {/* Mock Tabs */}
                                <div className="flex gap-2 mb-5 border-b border-slate-200 dark:border-slate-700 pb-2">
                                  <button className="px-3 py-1.5 text-[13px] font-bold text-primary border-b-2 border-primary">数据源</button>
                                  <button className="px-3 py-1.5 text-[13px] font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">接口</button>
                                  <button className="px-3 py-1.5 text-[13px] font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">关联</button>
                                </div>
                                {/* Mock List */}
                                <div className="space-y-3">
                                  {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="p-3 rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex items-center gap-3 cursor-move hover:border-primary/30 hover:shadow-sm transition-all group">
                                      <span className="material-symbols-outlined text-slate-400 text-[18px] group-hover:text-primary transition-colors">drag_indicator</span>
                                      <div className="size-10 rounded-lg bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-slate-500 border border-slate-100 dark:border-slate-700">
                                        <span className="material-symbols-outlined text-[18px]">dataset</span>
                                      </div>
                                      <div className="flex-1">
                                        <div className="text-[14px] font-bold text-slate-700 dark:text-slate-300">数据源 {i}</div>
                                        <div className="text-[12px] text-slate-400 mt-0.5">表或视图映射</div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* Right: 主单 & 明细 */}
                            <div className="w-2/3 flex flex-col gap-6">
                              {/* Right Top: 主单 */}
                              <div className="flex-[3] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm flex flex-col overflow-hidden">
                                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                                      <span className="material-symbols-outlined text-[18px]">dashboard_customize</span>
                                    </div>
                                    <h3 className="text-[15px] font-bold text-slate-800 dark:text-slate-200">主单控件布局</h3>
                                  </div>
                                  <button className="text-[13px] text-primary hover:bg-primary/10 px-4 py-2 rounded-lg transition-colors font-bold flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-[16px]">edit</span> 编辑布局
                                  </button>
                                </div>
                                <div className="flex-1 p-8 bg-slate-50/30 dark:bg-slate-900/30 flex items-center justify-center">
                                  <div className="w-full h-full border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl flex flex-col items-center justify-center text-slate-400 gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group">
                                    <div className="size-14 rounded-full bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                                      <span className="material-symbols-outlined text-[28px] text-slate-400 group-hover:text-primary">add_box</span>
                                    </div>
                                    <span className="text-[14px] font-medium group-hover:text-primary transition-colors">拖拽控件至此区域</span>
                                  </div>
                                </div>
                              </div>

                              {/* Right Bottom: 单据明细 */}
                              <div className="flex-[2] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm flex flex-col overflow-hidden">
                                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50 flex items-center gap-3">
                                  <div className="size-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-[18px]">list_alt</span>
                                  </div>
                                  <h3 className="text-[15px] font-bold text-slate-800 dark:text-slate-200">单据明细</h3>
                                </div>
                                <div className="flex-1 p-5 overflow-y-auto">
                                  <div className="w-full border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                                    <table className="w-full text-left text-[13px]">
                                      <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 border-b border-slate-200 dark:border-slate-700">
                                        <tr>
                                          <th className="px-5 py-3 font-medium">字段名</th>
                                          <th className="px-5 py-3 font-medium">类型</th>
                                          <th className="px-5 py-3 font-medium">必填</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 text-slate-700 dark:text-slate-300">
                                        <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                          <td className="px-5 py-3 font-medium">物料编码</td>
                                          <td className="px-5 py-3"><span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-[12px]">文本</span></td>
                                          <td className="px-5 py-3"><span className="px-2 py-1 bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 rounded text-[12px] font-bold">是</span></td>
                                        </tr>
                                        <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                          <td className="px-5 py-3 font-medium">数量</td>
                                          <td className="px-5 py-3"><span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-[12px]">数字</span></td>
                                          <td className="px-5 py-3"><span className="px-2 py-1 bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 rounded text-[12px] font-bold">是</span></td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Bottom Section: 多页签明细 */}
                          <div className="h-1/3 min-h-[280px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm flex flex-col overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50 flex items-center gap-3">
                              <div className="size-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                                <span className="material-symbols-outlined text-[18px]">tab</span>
                              </div>
                              <h3 className="text-[15px] font-bold text-slate-800 dark:text-slate-200">多页签明细</h3>
                            </div>
                            <div className="flex-1 p-6 flex flex-col">
                              <div className="flex gap-2 mb-5 border-b border-slate-200 dark:border-slate-700 pb-2 overflow-x-auto">
                                {detailTabs.map(tab => (
                                  <div key={tab.id} className="relative group">
                                    <button 
                                      onClick={() => setActiveTab(tab.id)}
                                      className={`px-3 py-1.5 text-[13px] font-bold transition-colors flex items-center gap-1 ${activeTab === tab.id ? 'text-primary border-b-2 border-primary' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                                    >
                                      {tab.name}
                                      {activeTab === tab.id && (
                                        <span className="material-symbols-outlined text-[14px]">expand_more</span>
                                      )}
                                    </button>
                                    
                                    {/* Dropdown for active tab */}
                                    {activeTab === tab.id && (
                                      <div className="absolute top-full left-0 mt-1 w-32 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                                        <div className="p-1">
                                          <button 
                                            onClick={(e) => deleteTab(tab.id, e)}
                                            className="w-full text-left px-3 py-1.5 text-[12px] text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-md flex items-center gap-2"
                                          >
                                            <span className="material-symbols-outlined text-[14px]">delete</span> 删除页签
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                                <button 
                                  onClick={addTab}
                                  className="px-3 py-1.5 text-slate-400 hover:text-primary ml-auto flex items-center gap-1 text-[12px] font-bold bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700"
                                >
                                  <span className="material-symbols-outlined text-[14px]">add</span> 新增页签
                                </button>
                              </div>
                              
                              {/* Tab Content */}
                              <div className="flex-1 flex flex-col min-h-0">
                                <div className="flex items-center gap-4 mb-4">
                                  <span className="text-[13px] font-bold text-slate-700 dark:text-slate-300">填充类型:</span>
                                  <div className="flex gap-2">
                                    {['表格', '树表格', '图标', '网页'].map(type => (
                                      <label key={type} className="flex items-center gap-1.5 cursor-pointer">
                                        <input 
                                          type="radio" 
                                          name={`fillType_${activeTab}`}
                                          value={type}
                                          checked={(tabFillTypes[activeTab] || '表格') === type}
                                          onChange={() => setTabFillTypes(prev => ({ ...prev, [activeTab]: type }))}
                                          className="text-primary focus:ring-primary"
                                        />
                                        <span className="text-[13px] text-slate-600 dark:text-slate-400">{type}</span>
                                      </label>
                                    ))}
                                  </div>
                                </div>

                                <div className="flex-1 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-slate-50/30 dark:bg-slate-900/30 flex flex-col">
                                  {(tabFillTypes[activeTab] || '表格') === '表格' ? (
                                    <div className="flex-1 flex flex-col min-h-0">
                                      <div className="p-3 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800">
                                        <div className="flex items-center gap-2">
                                          <span className="material-symbols-outlined text-[16px] text-slate-400">table_chart</span>
                                          <span className="text-[13px] font-bold text-slate-700 dark:text-slate-300">表格字段配置</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          {selectedDetailForDelete.length > 0 && (
                                            <button 
                                              onClick={() => {
                                                setDetailTableColumns(prev => ({
                                                  ...prev,
                                                  [activeTab]: prev[activeTab].filter(c => !selectedDetailForDelete.includes(c.id))
                                                }));
                                                setSelectedDetailForDelete([]);
                                              }}
                                              className="text-[11px] text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 px-2 py-1 rounded transition-colors font-bold flex items-center gap-1"
                                            >
                                              <span className="material-symbols-outlined text-[14px]">delete</span> 删除 ({selectedDetailForDelete.length})
                                            </button>
                                          )}
                                          <button 
                                            onClick={() => setDetailTableColumns(prev => ({
                                              ...prev,
                                              [activeTab]: [...(prev[activeTab] || []), { id: `d_col_${Date.now()}`, name: `新字段${(prev[activeTab] || []).length + 1}`, type: '文本', width: 120 }]
                                            }))}
                                            className="text-[11px] text-primary hover:bg-primary/10 px-2 py-1 rounded transition-colors font-bold flex items-center gap-1"
                                          >
                                            <span className="material-symbols-outlined text-[14px]">add</span> 新增字段
                                          </button>
                                        </div>
                                      </div>
                                      <div className="flex-1 overflow-auto">
                                        {renderTableBuilder(
                                          detailTableColumns[activeTab] || [], 
                                          (newCols) => setDetailTableColumns(prev => ({
                                            ...prev,
                                            [activeTab]: typeof newCols === 'function' ? newCols(prev[activeTab] || []) : newCols
                                          })), 
                                          selectedDetailColId, 
                                          setSelectedDetailColId, 
                                          selectedDetailForDelete, 
                                          setSelectedDetailForDelete
                                        )}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex-1 flex items-center justify-center text-slate-400">
                                      <div className="flex flex-col items-center gap-2">
                                        <span className="material-symbols-outlined text-[32px] text-slate-300 dark:text-slate-600">
                                          {tabFillTypes[activeTab] === '树表格' ? 'account_tree' : tabFillTypes[activeTab] === '图标' ? 'insert_photo' : 'language'}
                                        </span>
                                        <span className="text-[14px] font-medium">当前填充类型: {tabFillTypes[activeTab]}</span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className={`flex flex-col flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden ${
                          isFullscreenConfig ? 'fixed inset-4 z-[200] shadow-2xl' : 'min-h-[700px]'
                        }`}>
                          {/* Main Content Area: Left/Right Split */}
                          <div className="flex-1 flex gap-4 p-4 overflow-hidden bg-slate-50/50 dark:bg-slate-900/50">
                            
                            {/* Left: Left Table Builder */}
                            {businessType !== 'table' && (
                              <div className="w-[35%] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm flex flex-col overflow-hidden">
                                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                                  <h4 className="font-bold text-[13px] text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[16px] text-primary">view_sidebar</span>
                                    左表字段配置
                                  </h4>
                                  <div className="flex items-center gap-2">
                                    {selectedLeftForDelete.length > 0 && (
                                      <button 
                                        onClick={() => {
                                          setLeftTableColumns(prev => prev.filter(c => !selectedLeftForDelete.includes(c.id)));
                                          setSelectedLeftForDelete([]);
                                        }}
                                        className="text-[12px] text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 px-2 py-1 rounded transition-colors font-bold flex items-center gap-1"
                                      >
                                        <span className="material-symbols-outlined text-[14px]">delete</span> 删除 ({selectedLeftForDelete.length})
                                      </button>
                                    )}
                                    <button 
                                      onClick={() => setLeftTableColumns(prev => [...prev, { id: `l_col_${Date.now()}`, name: `新字段${prev.length + 1}`, type: '文本', width: 120 }])}
                                      className="text-[12px] text-primary hover:bg-primary/10 px-2 py-1 rounded transition-colors font-bold flex items-center gap-1"
                                    >
                                      <span className="material-symbols-outlined text-[14px]">add</span> 新增
                                    </button>
                                  </div>
                                </div>
                                <div 
                                  className="flex-1 overflow-auto outline-none" 
                                  tabIndex={0} 
                                  onPaste={(e) => handlePasteColumns(e, setLeftTableColumns)}
                                >
                                  {renderTableBuilder(leftTableColumns, setLeftTableColumns, selectedLeftColId, setSelectedLeftColId, selectedLeftForDelete, setSelectedLeftForDelete)}
                                </div>
                              </div>
                            )}

                            {/* Right: Top Table, Bottom Tabs */}
                            <div className={`${businessType === 'table' ? 'w-full' : 'w-[65%]'} flex flex-col gap-4`}>
                              {/* Right Top: Main Table Builder */}
                              <div className="flex-[3] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm flex flex-col overflow-hidden">
                                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                                  <h4 className="font-bold text-[13px] text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[16px] text-emerald-500">table_rows</span>
                                    主表字段配置
                                  </h4>
                                  <div className="flex items-center gap-2">
                                    {selectedMainForDelete.length > 0 && (
                                      <button 
                                        onClick={() => {
                                          setMainTableColumns(prev => prev.filter(c => !selectedMainForDelete.includes(c.id)));
                                          setSelectedMainForDelete([]);
                                        }}
                                        className="text-[12px] text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 px-2 py-1 rounded transition-colors font-bold flex items-center gap-1"
                                      >
                                        <span className="material-symbols-outlined text-[14px]">delete</span> 删除 ({selectedMainForDelete.length})
                                      </button>
                                    )}
                                    <button 
                                      onClick={() => setMainTableColumns(prev => [...prev, { id: `m_col_${Date.now()}`, name: `新字段${prev.length + 1}`, type: '文本', width: 120 }])}
                                      className="text-[12px] text-primary hover:bg-primary/10 px-2 py-1 rounded transition-colors font-bold flex items-center gap-1"
                                    >
                                      <span className="material-symbols-outlined text-[14px]">add</span> 新增
                                    </button>
                                  </div>
                                </div>
                                <div 
                                  className="flex-1 overflow-auto outline-none" 
                                  tabIndex={0} 
                                  onPaste={(e) => handlePasteColumns(e, setMainTableColumns)}
                                >
                                  {renderTableBuilder(mainTableColumns, setMainTableColumns, selectedMainColId, setSelectedMainColId, selectedMainForDelete, setSelectedMainForDelete)}
                                </div>
                              </div>

                              {/* Right Bottom: Multi-tabs */}
                              <div className="flex-[2] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm flex flex-col overflow-hidden">
                                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                                  <h4 className="font-bold text-[13px] text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[16px] text-blue-500">tab</span>
                                    明细配置
                                  </h4>
                                  <button onClick={addTab} className="text-[12px] text-primary hover:bg-primary/10 px-2 py-1 rounded transition-colors font-bold flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[14px]">add</span> 新增页签
                                  </button>
                                </div>
                                <div className="flex-1 p-4 flex flex-col">
                                  <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700 pb-2 overflow-x-auto">
                                    {detailTabs.map(tab => (
                                      <div key={tab.id} className="relative group">
                                        <button 
                                          onClick={() => setActiveTab(tab.id)}
                                          className={`px-3 py-1.5 text-[13px] font-bold transition-colors flex items-center gap-1 ${activeTab === tab.id ? 'text-primary border-b-2 border-primary' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                                        >
                                          {tab.name}
                                          {activeTab === tab.id && (
                                            <span className="material-symbols-outlined text-[14px]">expand_more</span>
                                          )}
                                        </button>
                                        
                                        {/* Dropdown for active tab */}
                                        {activeTab === tab.id && (
                                          <div className="absolute top-full left-0 mt-1 w-32 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                                            <div className="p-1">
                                              <button 
                                                onClick={(e) => deleteTab(tab.id, e)}
                                                className="w-full text-left px-3 py-1.5 text-[12px] text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-md flex items-center gap-2"
                                              >
                                                <span className="material-symbols-outlined text-[14px]">delete</span> 删除页签
                                              </button>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                  <div className="flex-1 mt-4 flex flex-col gap-3">
                                    <div className="flex items-center gap-3">
                                      <span className="text-[13px] font-bold text-slate-600 dark:text-slate-400">填充类型:</span>
                                      <div className="flex gap-2">
                                        {['表格', '树表格', '图表', '网页'].map(type => (
                                          <button 
                                            key={type}
                                            onClick={() => setTabFillTypes(prev => ({ ...prev, [activeTab]: type }))}
                                            className={`px-3 py-1.5 rounded-lg text-[12px] font-bold transition-colors border ${
                                              tabFillTypes[activeTab] === type 
                                                ? 'bg-primary/10 text-primary border-primary/30' 
                                                : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                                            }`}
                                          >
                                            {type}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                    
                                    {tabFillTypes[activeTab] === '表格' ? (
                                      <div className="flex-1 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden flex flex-col">
                                        <div className="px-3 py-2 bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                                          <span className="text-[12px] font-bold text-slate-600 dark:text-slate-400">明细字段配置</span>
                                          <div className="flex items-center gap-2">
                                            {selectedDetailForDelete.length > 0 && (
                                              <button 
                                                onClick={() => {
                                                  setDetailTableColumns(prev => ({
                                                    ...prev,
                                                    [activeTab]: prev[activeTab].filter(c => !selectedDetailForDelete.includes(c.id))
                                                  }));
                                                  setSelectedDetailForDelete([]);
                                                }}
                                                className="text-[11px] text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 px-2 py-1 rounded transition-colors font-bold flex items-center gap-1"
                                              >
                                                <span className="material-symbols-outlined text-[14px]">delete</span> 删除 ({selectedDetailForDelete.length})
                                              </button>
                                            )}
                                            <button 
                                              onClick={() => setDetailTableColumns(prev => ({
                                                ...prev,
                                                [activeTab]: [...(prev[activeTab] || []), { id: `d_col_${Date.now()}`, name: `新字段${(prev[activeTab] || []).length + 1}`, type: '文本', width: 120 }]
                                              }))}
                                              className="text-[11px] text-primary hover:bg-primary/10 px-2 py-1 rounded transition-colors font-bold flex items-center gap-1"
                                            >
                                              <span className="material-symbols-outlined text-[14px]">add</span> 新增字段
                                            </button>
                                          </div>
                                        </div>
                                        <div 
                                          className="flex-1 overflow-auto outline-none" 
                                          tabIndex={0} 
                                          onPaste={(e) => {
                                            const text = e.clipboardData.getData('text');
                                            if (!text) return;
                                            const newColNames = text.split(/[\t\n]/).map(s => s.trim()).filter(Boolean);
                                            if (newColNames.length > 0) {
                                              e.preventDefault();
                                              const newCols = newColNames.map((name, i) => ({
                                                id: `d_col_${Date.now()}_${i}`,
                                                name,
                                                type: '文本',
                                                width: 100
                                              }));
                                              setDetailTableColumns(prev => ({
                                                ...prev,
                                                [activeTab]: [...(prev[activeTab] || []), ...newCols]
                                              }));
                                            }
                                          }}
                                        >
                                          {renderTableBuilder(
                                            detailTableColumns[activeTab] || [], 
                                            (newCols) => setDetailTableColumns(prev => ({
                                              ...prev,
                                              [activeTab]: typeof newCols === 'function' ? newCols(prev[activeTab] || []) : newCols
                                            })), 
                                            selectedDetailColId, 
                                            setSelectedDetailColId, 
                                            selectedDetailForDelete, 
                                            setSelectedDetailForDelete
                                          )}
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="flex-1 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-center text-slate-400 bg-slate-50/30 dark:bg-slate-900/30">
                                        <div className="flex flex-col items-center gap-2">
                                          <span className="material-symbols-outlined text-[28px] text-slate-300 dark:text-slate-600">
                                            {tabFillTypes[activeTab] === '树表格' ? 'account_tree' : 
                                             tabFillTypes[activeTab] === '图表' ? 'bar_chart' : 'web'}
                                          </span>
                                          <span className="text-[13px] font-medium">当前页签类型: {tabFillTypes[activeTab] || '表格'}</span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Footer with Full Screen Button */}
                          <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-end bg-white dark:bg-slate-800 shrink-0">
                            <button 
                              onClick={() => setIsFullscreenConfig(!isFullscreenConfig)}
                              className="px-4 py-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors font-bold text-[13px] gap-2"
                            >
                              <span className="material-symbols-outlined text-[18px]">
                                {isFullscreenConfig ? 'fullscreen_exit' : 'fullscreen'}
                              </span>
                              {isFullscreenConfig ? '退出全屏' : '全屏配置'}
                            </button>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {configStep === 3 && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1 min-h-[650px]">
                      {/* Left: Interactive Survey Chat */}
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm flex flex-col overflow-hidden">
                        <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center gap-3">
                          <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            <span className="material-symbols-outlined text-[20px]">smart_toy</span>
                          </div>
                          <div>
                            <h3 className="text-[16px] font-bold text-slate-800 dark:text-slate-200">AI 架构师</h3>
                            <p className="text-[12px] text-slate-500">正在为您进行需求调研</p>
                          </div>
                        </div>
                        
                        <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-slate-50/30 dark:bg-slate-900/30 custom-scrollbar">
                          {/* Message 1 */}
                          <div className="flex gap-4">
                            <div className="size-10 rounded-full bg-primary flex items-center justify-center text-white shrink-0 shadow-md shadow-primary/20">
                              <span className="material-symbols-outlined text-[20px]">smart_toy</span>
                            </div>
                            <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-4 rounded-2xl rounded-tl-none shadow-sm text-[14px] text-slate-700 dark:text-slate-300 leading-relaxed max-w-[85%]">
                              您好！为了更好地为您构建【成本控制】模块，我们需要进行简单的调研。请问您希望采用哪种开发模式？
                            </div>
                          </div>
                          
                          {/* Options 1 */}
                          {surveyStep === 0 && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pl-14 flex flex-wrap gap-3">
                              {['标准 CRUD 模式', '复杂审批流模式', '数据看板模式'].map(opt => (
                                <button key={opt} onClick={() => { setSurveyAnswers([...surveyAnswers, opt]); setSurveyStep(1); }} className="px-5 py-2.5 rounded-xl border border-primary/20 bg-primary/5 text-primary text-[14px] font-bold hover:bg-primary hover:text-white transition-all shadow-sm">
                                  {opt}
                                </button>
                              ))}
                            </motion.div>
                          )}

                          {/* User Answer 1 */}
                          {surveyStep > 0 && (
                            <div className="flex gap-4 flex-row-reverse">
                              <div className="size-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0">
                                <span className="material-symbols-outlined text-[20px]">person</span>
                              </div>
                              <div className="bg-primary text-white p-4 rounded-2xl rounded-tr-none shadow-sm text-[14px] leading-relaxed max-w-[85%]">
                                {surveyAnswers[0]}
                              </div>
                            </div>
                          )}

                          {/* Message 2 */}
                          {surveyStep > 0 && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-4">
                              <div className="size-10 rounded-full bg-primary flex items-center justify-center text-white shrink-0 shadow-md shadow-primary/20">
                                <span className="material-symbols-outlined text-[20px]">smart_toy</span>
                              </div>
                              <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-4 rounded-2xl rounded-tl-none shadow-sm text-[14px] text-slate-700 dark:text-slate-300 leading-relaxed max-w-[85%]">
                                好的，已选择【{surveyAnswers[0]}】。请问该模块的数据来源主要是什么？
                              </div>
                            </motion.div>
                          )}

                          {/* Options 2 */}
                          {surveyStep === 1 && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pl-14 flex flex-wrap gap-3">
                              {['手工录入为主', '外部系统对接 (API)', 'Excel 批量导入'].map(opt => (
                                <button key={opt} onClick={() => { 
                                  setSurveyAnswers([...surveyAnswers, opt]); 
                                  setSurveyStep(2); 
                                  setIsGenerating(true);
                                  setTimeout(() => setIsGenerating(false), 3000);
                                }} className="px-5 py-2.5 rounded-xl border border-primary/20 bg-primary/5 text-primary text-[14px] font-bold hover:bg-primary hover:text-white transition-all shadow-sm">
                                  {opt}
                                </button>
                              ))}
                            </motion.div>
                          )}

                          {/* User Answer 2 */}
                          {surveyStep > 1 && (
                            <div className="flex gap-4 flex-row-reverse">
                              <div className="size-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0">
                                <span className="material-symbols-outlined text-[20px]">person</span>
                              </div>
                              <div className="bg-primary text-white p-4 rounded-2xl rounded-tr-none shadow-sm text-[14px] leading-relaxed max-w-[85%]">
                                {surveyAnswers[1]}
                              </div>
                            </div>
                          )}

                          {/* Message 3 (Done) */}
                          {surveyStep > 1 && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-4">
                              <div className="size-10 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0 shadow-md shadow-emerald-500/20">
                                <span className="material-symbols-outlined text-[20px]">check</span>
                              </div>
                              <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-4 rounded-2xl rounded-tl-none shadow-sm text-[14px] text-slate-700 dark:text-slate-300 leading-relaxed max-w-[85%]">
                                调研完成！我已经完全理解您的需求。右侧是为您生成的底层领域模型与执行计划，请查阅。
                              </div>
                            </motion.div>
                          )}
                        </div>
                        
                        {/* Reset Button */}
                        {surveyStep > 1 && (
                          <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                            <button onClick={() => { setSurveyStep(0); setSurveyAnswers([]); }} className="w-full py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-primary rounded-xl text-[14px] font-bold transition-all flex items-center justify-center gap-2 shadow-sm">
                              <span className="material-symbols-outlined text-[18px]">refresh</span>
                              重新开始调研
                            </button>
                          </div>
                        )}
                      </div>
                      
                      {/* Right: AI Process Terminal */}
                      <div className="bg-slate-900 rounded-2xl p-8 shadow-xl relative overflow-hidden flex flex-col border border-slate-800">
                        {/* Glow effect */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120%] h-48 bg-primary/20 blur-[80px] pointer-events-none"></div>
                        
                        <div className="flex items-center justify-between mb-8 relative z-10">
                          <h3 className="text-[16px] font-bold text-white flex items-center gap-3">
                            <span className="material-symbols-outlined text-emerald-400 text-[24px]">terminal</span>
                            Plan Execution
                          </h3>
                          {surveyStep >= 2 && (
                            <span className={`px-3 py-1.5 rounded-full text-[12px] font-mono font-bold border ${isGenerating ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'}`}>
                              {isGenerating ? 'RUNNING' : 'COMPLETED'}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex-1 overflow-y-auto space-y-8 relative z-10 pr-4 custom-scrollbar">
                          {surveyStep < 2 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4">
                              <span className="material-symbols-outlined text-5xl opacity-20">hourglass_empty</span>
                              <p className="text-[14px]">等待调研完成以生成执行计划...</p>
                            </div>
                          ) : (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                              {/* Step 1 */}
                              <div className="flex gap-5">
                                <div className="mt-0.5 relative">
                                  <span className="material-symbols-outlined text-emerald-500 text-[24px] relative z-10 bg-slate-900">check_circle</span>
                                  <div className="absolute top-6 left-1/2 -translate-x-1/2 w-px h-10 bg-emerald-500/30"></div>
                                </div>
                                <div>
                                  <div className="text-[15px] font-bold text-slate-200">解析业务需求</div>
                                  <div className="text-[14px] text-slate-400 mt-2 leading-relaxed">已提取核心诉求：模式为【{surveyAnswers[0]}】，数据来源为【{surveyAnswers[1]}】。</div>
                                </div>
                              </div>
                              
                              {/* Step 2 */}
                              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }} className="flex gap-5">
                                <div className="mt-0.5 relative">
                                  <span className={`material-symbols-outlined text-[24px] relative z-10 bg-slate-900 ${isGenerating ? 'text-amber-500 animate-spin' : 'text-emerald-500'}`}>
                                    {isGenerating ? 'sync' : 'check_circle'}
                                  </span>
                                  <div className={`absolute top-6 left-1/2 -translate-x-1/2 w-px h-32 ${isGenerating ? 'bg-amber-500/30' : 'bg-emerald-500/30'}`}></div>
                                </div>
                                <div>
                                  <div className="text-[15px] font-bold text-slate-200">构建领域模型 (Domain Model)</div>
                                  <div className="text-[14px] text-slate-400 mt-2 leading-relaxed">生成数据表结构草案，建立表间关联关系。</div>
                                  <div className="mt-4 p-4 bg-slate-950/80 rounded-xl border border-slate-800 font-mono text-[13px] text-emerald-400/80 leading-relaxed shadow-inner">
                                    <span className="text-slate-500 mr-2">$</span> Table CostCenter created<br/>
                                    <span className="text-slate-500 mr-2">$</span> Table BOM_Cost_Rollup created<br/>
                                    <span className="text-slate-500 mr-2">$</span> Relations mapped successfully
                                  </div>
                                </div>
                              </motion.div>

                              {/* Step 3 */}
                              {!isGenerating && (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-5">
                                  <div className="mt-0.5 relative">
                                    <span className="material-symbols-outlined text-emerald-500 text-[24px] relative z-10 bg-slate-900">check_circle</span>
                                  </div>
                                  <div className="w-full">
                                    <div className="text-[15px] font-bold text-slate-200">生成交互原型与架构评估</div>
                                    <div className="text-[14px] text-slate-400 mt-2 leading-relaxed">基于【{surveyAnswers[0]}】生成了对应的页面布局与表单，并输出架构评估报告。</div>
                                    
                                    <div className="mt-4 p-5 bg-slate-950/80 rounded-xl border border-slate-800 font-mono text-[13px] text-emerald-400/90 leading-relaxed shadow-inner space-y-3">
                                      <div className="flex items-center gap-2 text-white/90 border-b border-slate-800 pb-2 mb-3">
                                        <span className="material-symbols-outlined text-[18px] text-primary">analytics</span>
                                        <span className="font-bold text-[14px]">架构方案评估报告 (Architecture Assessment Report)</span>
                                      </div>
                                      <p><span className="text-slate-500"># 核心模式:</span> {surveyAnswers[0]}</p>
                                      <p><span className="text-slate-500"># 数据来源:</span> {surveyAnswers[1]}</p>
                                      <p><span className="text-slate-500"># 复杂度评估:</span> <span className="text-amber-400">High (高)</span></p>
                                      <p><span className="text-slate-500"># 预计开发周期:</span> 2.5 Weeks</p>
                                      <div className="pt-2 border-t border-slate-800/50">
                                        <p className="text-slate-400 mb-1">推荐技术栈与中间件:</p>
                                        <ul className="list-disc pl-5 text-emerald-500/80 space-y-1">
                                          <li>前端: React 18 + TailwindCSS + Framer Motion</li>
                                          <li>后端: Node.js (NestJS) + Prisma ORM</li>
                                          <li>存储: PostgreSQL (支持复杂BOM树形查询)</li>
                                          <li>缓存: Redis (应对高并发查询约束)</li>
                                        </ul>
                                      </div>
                                      <div className="pt-2 border-t border-slate-800/50 text-emerald-300">
                                        <span className="text-slate-500 mr-2">$</span> System ready for code generation.
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
                          这里是高级配置面板的内容占位符。您可以根据具体业务需求在此处渲染表单、图表或预览界面。
                        </p>
                      </div>
                    </div>
                  )}
                </motion.div>
              </div>

              {/* Bottom Action Bar */}
              <div className="h-28 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-16 flex items-center justify-between shrink-0 z-10 shadow-[0_-4px_24px_rgba(0,0,0,0.02)]">
                <button 
                  onClick={() => setConfigStep(Math.max(1, configStep - 1))}
                  className={`px-8 py-3.5 rounded-xl font-bold text-[15px] transition-all ${
                    configStep === 1 
                      ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed' 
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  disabled={configStep === 1}
                >
                  上一步
                </button>
                
                <div className="flex gap-5">
                  <button 
                    onClick={() => {
                      if (!completedSteps.includes(configStep)) {
                        setCompletedSteps([...completedSteps, configStep]);
                      }
                    }}
                    className="px-8 py-3.5 rounded-xl font-bold text-[15px] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[20px]">save</span>
                    保存本页
                  </button>
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
                          showToast('请先保存“菜单信息”步骤后再进行模块设置');
                        }
                      } else {
                        setIsConfigOpen(false);
                      }
                    }}
                    className="px-10 py-3.5 bg-primary hover:bg-erp-blue text-white rounded-xl font-bold text-[15px] shadow-lg shadow-primary/20 transition-all flex items-center gap-2"
                  >
                    {configStep === 5 ? '完成配置' : '下一步'}
                    {configStep !== 5 && <span className="material-symbols-outlined text-[20px]">arrow_forward</span>}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
