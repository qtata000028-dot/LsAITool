import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import { type BackendMenuNode, type BackendSubsystemNode } from '../../lib/backend-menus';

function normalizeMenuTitle(value?: string) {
  return value?.trim() || '';
}

export function DashboardWorkspaceSidebar({
  activeFirstLevelMenuId,
  activeSubsystem,
  expandedSubsystemId,
  handleFirstLevelMenuClick,
  isLoadingSubsystemMenus,
  isResearchRecordActive,
  menuLoadError,
  onLogout,
  onOpenResearchRecord,
  reloadSubsystemMenus,
  subsystemMenus,
  toggleSubsystemExpansion,
  currentUserName,
}: {
  activeFirstLevelMenuId: string;
  activeSubsystem: string;
  currentUserName: string;
  expandedSubsystemId: string | null;
  handleFirstLevelMenuClick: (subsystemId: string, menu: BackendMenuNode) => void;
  isLoadingSubsystemMenus: boolean;
  isResearchRecordActive: boolean;
  menuLoadError: string | null;
  onLogout: () => void;
  onOpenResearchRecord: () => void;
  reloadSubsystemMenus: () => Promise<void>;
  subsystemMenus: BackendSubsystemNode[];
  toggleSubsystemExpansion: (subsystemId: string) => void;
}) {
  const [isSubsystemOpen, setIsSubsystemOpen] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const currentUserAvatarText = currentUserName.trim().slice(0, 1) || '人';

  return (
    <aside className="w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0">
      <div className="p-6 flex items-center gap-3">
        <div className="size-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
          <span className="material-symbols-outlined text-2xl">rocket_launch</span>
        </div>
        <div className="flex flex-col">
          <h1 className="text-slate-900 dark:text-white text-lg font-bold leading-tight tracking-tight">朗速 AI</h1>
          <p className="text-primary text-[10px] font-bold tracking-wider">模块工作台</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
        <a className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" href="#">
          <span className="material-symbols-outlined text-xl">dashboard</span>
          <span className="text-sm font-medium">控制台</span>
        </a>

        <div className="space-y-1 pt-2">
          <button
            onClick={() => setIsSubsystemOpen((prev) => !prev)}
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
            {isSubsystemOpen ? (
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
                      onClick={() => void reloadSubsystemMenus()}
                      className="mt-2 font-semibold text-rose-700 transition-colors hover:text-rose-800"
                    >
                      重新加载
                    </button>
                  </div>
                ) : null}

                <div className="ml-2 mt-2 space-y-1">
                  {subsystemMenus.map((subsystem) => {
                    const isExpanded = expandedSubsystemId === subsystem.id;
                    const subsystemFirstLevelMenus = (subsystem.children ?? []).filter(
                      (menu): menu is BackendMenuNode => menu.enabled !== false,
                    );
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
            ) : null}
          </AnimatePresence>
        </div>

        <div className="pt-2 space-y-1">
          <button
            type="button"
            onClick={onOpenResearchRecord}
            className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
              isResearchRecordActive
                ? 'bg-primary text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
          >
            <span className="material-symbols-outlined text-xl">assignment</span>
            <span className="text-sm font-medium">调研记录</span>
          </button>
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

      <div className="p-4 border-t border-slate-200 dark:border-slate-800 relative">
        <button
          onClick={() => setIsProfileOpen((prev) => !prev)}
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
          {isProfileOpen ? (
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
          ) : null}
        </AnimatePresence>
      </div>
    </aside>
  );
}
