import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import { getStoredAuthSession, persistAuthSession } from '../../lib/auth-session';
import { type BackendMenuNode, type BackendSubsystemNode } from '../../lib/backend-menus';
import { fetchServerOptions, loginWithPassword, type ServerOption } from '../../shared/api/auth';
import { getStoredLoginContext } from '../../shared/auth/login-context';
import { persistRememberedLoginState } from '../../shared/auth/remembered-login';

function normalizeMenuTitle(value?: string) {
  return value?.trim() || '';
}

function getSidebarErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return '请求失败，请稍后重试。';
}

function isCurrentOrganization(currentCompanyKey: string, currentCompanyTitle: string, option: ServerOption) {
  if (currentCompanyKey && currentCompanyKey === option.companyKey) {
    return true;
  }

  return normalizeMenuTitle(currentCompanyTitle) === normalizeMenuTitle(option.title);
}

export function DashboardWorkspaceSidebar({
  activeFirstLevelMenuId,
  activeSubsystem,
  companyTitle,
  expandedSubsystemId,
  handleFirstLevelMenuClick,
  isAdmin,
  isLoadingSubsystemMenus,
  isResearchRecordActive,
  isServerPermissionActive,
  isSubsystemOpen,
  isToolFeedbackActive,
  menuLoadError,
  onLogout,
  onOpenServerPermission,
  onOpenResearchRecord,
  onOpenToolFeedback,
  reloadSubsystemMenus,
  subsystemMenus,
  toggleSubsystemExpansion,
  toggleSubsystemOpen,
  currentUserName,
}: {
  activeFirstLevelMenuId: string;
  activeSubsystem: string;
  companyTitle: string;
  currentUserName: string;
  expandedSubsystemId: string | null;
  handleFirstLevelMenuClick: (subsystemId: string, menu: BackendMenuNode) => void;
  isAdmin: boolean;
  isLoadingSubsystemMenus: boolean;
  isResearchRecordActive: boolean;
  isServerPermissionActive: boolean;
  isSubsystemOpen: boolean;
  isToolFeedbackActive: boolean;
  menuLoadError: string | null;
  onLogout: () => void;
  onOpenServerPermission: () => void;
  onOpenResearchRecord: () => void;
  onOpenToolFeedback: () => void;
  reloadSubsystemMenus: () => Promise<void>;
  subsystemMenus: BackendSubsystemNode[];
  toggleSubsystemExpansion: (subsystemId: string) => void;
  toggleSubsystemOpen: () => void;
}) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isOrganizationOpen, setIsOrganizationOpen] = useState(false);
  const [isLoadingOrganizations, setIsLoadingOrganizations] = useState(false);
  const [isSwitchingOrganization, setIsSwitchingOrganization] = useState(false);
  const [organizationError, setOrganizationError] = useState<string | null>(null);
  const [organizationStatusMessage, setOrganizationStatusMessage] = useState<string | null>(null);
  const [organizations, setOrganizations] = useState<ServerOption[]>([]);
  const currentSession = useMemo(() => getStoredAuthSession(), []);
  const organizationRef = useRef<HTMLDivElement>(null);
  const currentUserAvatarText = currentUserName.trim().slice(0, 1) || '人';
  const workspaceBrandTitle = normalizeMenuTitle(companyTitle) || '朗速 AI';
  const currentCompanyKey = normalizeMenuTitle(currentSession?.selectedCompanyOptionKey);
  const currentCompanyTitle = normalizeMenuTitle(currentSession?.companyTitle) || workspaceBrandTitle;
  const currentOrganization = useMemo(
    () => organizations.find((option) => isCurrentOrganization(currentCompanyKey, currentCompanyTitle, option)) ?? null,
    [currentCompanyKey, currentCompanyTitle, organizations],
  );
  const showNoModulePermissionNotice = !isLoadingSubsystemMenus && !menuLoadError && subsystemMenus.length === 0;

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (organizationRef.current && !organizationRef.current.contains(event.target as Node)) {
        setIsOrganizationOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  useEffect(() => {
    if (!organizationStatusMessage) {
      return;
    }

    const timer = window.setTimeout(() => setOrganizationStatusMessage(null), 2600);
    return () => window.clearTimeout(timer);
  }, [organizationStatusMessage]);

  useEffect(() => {
    let disposed = false;

    async function loadOrganizations() {
      if (!currentSession?.employeeId) {
        setOrganizations([]);
        return;
      }

      setIsLoadingOrganizations(true);
      setOrganizationError(null);

      try {
        const data = await fetchServerOptions(currentSession.employeeId);
        if (disposed) {
          return;
        }

        setOrganizations(Array.isArray(data) ? data : []);
      } catch (error) {
        if (disposed) {
          return;
        }

        setOrganizations([]);
        setOrganizationError(getSidebarErrorMessage(error));
      } finally {
        if (!disposed) {
          setIsLoadingOrganizations(false);
        }
      }
    }

    void loadOrganizations();

    return () => {
      disposed = true;
    };
  }, [currentSession?.employeeId]);

  const handleOrganizationSwitch = async (option: ServerOption) => {
    if (!currentSession?.employeeId) {
      setOrganizationError('当前登录态缺少人员信息，请重新登录后再切换帐套。');
      return;
    }

    if (isCurrentOrganization(currentCompanyKey, currentCompanyTitle, option)) {
      setIsOrganizationOpen(false);
      return;
    }

    const loginContext = getStoredLoginContext();
    if (!loginContext || loginContext.employeeId !== currentSession.employeeId || !loginContext.password.trim()) {
      setOrganizationError('请重新登录一次后再切换帐套。');
      setIsOrganizationOpen(false);
      return;
    }

    setIsSwitchingOrganization(true);
    setOrganizationError(null);
    setOrganizationStatusMessage('正在切换帐套...');

    try {
      const nextSession = await loginWithPassword({
        basename: option.basename,
        employeeId: currentSession.employeeId,
        password: loginContext.password,
        serverip: option.serverip,
        serverport: option.serverport,
      });

      const normalizedSession = {
        ...nextSession,
        departmentId: currentSession.departmentId || nextSession.departmentId,
        employeeId: currentSession.employeeId,
        employeeName: currentSession.employeeName || loginContext.employeeName || nextSession.employeeName,
        selectedCompanyOptionKey: option.companyKey,
        username: currentSession.username || nextSession.username,
      };

      persistAuthSession(normalizedSession, loginContext.remember);
      if (loginContext.remember) {
        persistRememberedLoginState({
          employeeId: currentSession.employeeId,
          employeeName: normalizedSession.employeeName,
          organizationKey: option.companyKey,
          password: loginContext.password,
        });
      }

      setIsOrganizationOpen(false);
      setOrganizationStatusMessage('帐套已切换，正在刷新工作台...');
      window.location.reload();
    } catch (error) {
      setOrganizationError(getSidebarErrorMessage(error));
    } finally {
      setIsSwitchingOrganization(false);
    }
  };

  return (
    <aside className="w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0">
      <div className="p-6 flex items-center gap-3">
        <div className="size-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
          <span className="material-symbols-outlined text-2xl">rocket_launch</span>
        </div>
        <div className="flex flex-col">
          <h1
            className="max-w-[190px] truncate text-slate-900 dark:text-white text-lg font-bold leading-tight tracking-tight"
            title={workspaceBrandTitle}
          >
            {workspaceBrandTitle}
          </h1>
          <p className="text-primary text-[10px] font-bold tracking-wider">模块工作台</p>
        </div>
      </div>

      <div className="px-4 pb-3">
        <div className="rounded-[24px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.96),rgba(255,255,255,0.92))] p-3 shadow-[0_20px_44px_-34px_rgba(15,23,42,0.32)] dark:border-slate-800 dark:bg-slate-900/70">
          <div className="flex items-start justify-between gap-3 px-1">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">当前帐套</div>
              <div className="mt-1 text-[13px] font-semibold text-slate-900 dark:text-slate-100">
                {currentOrganization?.title || currentCompanyTitle || '未识别帐套'}
              </div>
            </div>
            <div className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold tracking-[0.16em] text-primary">
              {isLoadingOrganizations ? '同步中' : `${Math.max(organizations.length, 1)} 个可切换`}
            </div>
          </div>

          <div ref={organizationRef} className="relative mt-3">
            <button
              type="button"
              aria-expanded={isOrganizationOpen}
              aria-haspopup="listbox"
              disabled={isLoadingOrganizations || isSwitchingOrganization || organizations.length === 0}
              onClick={() => {
                setIsOrganizationOpen((open) => !open);
                setOrganizationError(null);
              }}
              className="group flex w-full items-center justify-between gap-3 rounded-[20px] border border-slate-200 bg-white px-3.5 py-3 text-left transition-all hover:border-primary/20 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950/70 dark:hover:border-primary/30 dark:hover:bg-slate-900"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <span className="material-symbols-outlined text-[19px]">
                    {isSwitchingOrganization ? 'sync' : 'apartment'}
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-semibold text-slate-900 dark:text-slate-100">
                    {currentOrganization?.title || currentCompanyTitle || '选择帐套'}
                  </div>
                  <div className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                    {isSwitchingOrganization ? '正在切换，请稍候...' : '下拉切换当前登录帐套'}
                  </div>
                </div>
              </div>
              <span className={`material-symbols-outlined text-[20px] text-slate-400 transition-transform ${isOrganizationOpen ? 'rotate-180 text-primary' : ''}`}>
                expand_more
              </span>
            </button>

            <AnimatePresence>
              {isOrganizationOpen && organizations.length > 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className="absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_28px_56px_-32px_rgba(15,23,42,0.35)] dark:border-slate-800 dark:bg-slate-950"
                >
                  <div className="max-h-72 overflow-y-auto p-2" role="listbox">
                    {organizations.map((option) => {
                      const isActive = isCurrentOrganization(currentCompanyKey, currentCompanyTitle, option);

                      return (
                        <button
                          key={`${option.companyKey}:${option.basename}:${option.serverport}`}
                          type="button"
                          role="option"
                          aria-selected={isActive}
                          onClick={() => void handleOrganizationSwitch(option)}
                          className={`flex w-full items-center gap-3 rounded-[18px] px-3 py-3 text-left transition-all ${
                            isActive
                              ? 'bg-[linear-gradient(135deg,rgba(224,242,254,0.95),rgba(255,255,255,0.98))] text-slate-900 shadow-[0_16px_28px_-26px_rgba(14,116,144,0.95)] dark:bg-slate-900'
                              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-900'
                          }`}
                        >
                          <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                            isActive ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                          }`}>
                            <span className="material-symbols-outlined text-[18px]">{isActive ? 'check' : 'domain'}</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[13px] font-semibold">{option.title}</div>
                            <div className="truncate text-[11px] text-slate-400">
                              {option.serverip}:{option.serverport} / {option.basename}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          {organizationStatusMessage ? (
            <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-semibold text-emerald-700">
              {organizationStatusMessage}
            </div>
          ) : null}

          {organizationError ? (
            <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700">
              {organizationError}
            </div>
          ) : null}

          {showNoModulePermissionNotice ? (
            <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold leading-5 text-amber-700">
              当前帐套未配置模块权限，请联系管理员。
            </div>
          ) : null}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
        <a className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" href="#">
          <span className="material-symbols-outlined text-xl">dashboard</span>
          <span className="text-sm font-medium">控制台</span>
        </a>

        <div className="space-y-1 pt-2">
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

          <button
            onClick={() => {
              toggleSubsystemOpen();
            }}
            className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg transition-colors ${
              isSubsystemOpen
                ? 'bg-primary/10 text-primary'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
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
          {isAdmin ? (
            <button
              type="button"
              onClick={onOpenServerPermission}
              className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
                isServerPermissionActive
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              <span className="material-symbols-outlined text-xl">shield_lock</span>
              <span className="text-sm font-medium">权限配置</span>
            </button>
          ) : null}

          <button
            type="button"
            onClick={onOpenToolFeedback}
            className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
              isToolFeedbackActive
                ? 'bg-primary text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
          >
            <span className="material-symbols-outlined text-xl">lightbulb</span>
            <span className="text-sm font-medium">意见上报</span>
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
