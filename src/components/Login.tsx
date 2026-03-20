import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';

import type { AuthSession, EmployeeOption, ServerOption } from '../lib/backend-auth';
import { fetchEmployeeOptions, fetchServerOptions, loginWithPassword } from '../lib/backend-auth';
import { persistAuthSession } from '../lib/auth-session';
import { ApiError } from '../lib/http';

interface LoginProps {
  onLogin: (session: AuthSession) => void;
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return '请求失败，请稍后重试。';
}

export default function Login({ onLogin }: LoginProps) {
  const [organizationKey, setOrganizationKey] = useState('');
  const [organizations, setOrganizations] = useState<ServerOption[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [employeeKeyword, setEmployeeKeyword] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isOrganizationOpen, setIsOrganizationOpen] = useState(false);
  const [isEmployeeOpen, setIsEmployeeOpen] = useState(false);
  const [isLoadingOrganizations, setIsLoadingOrganizations] = useState(true);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const organizationRef = useRef<HTMLDivElement>(null);
  const employeeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (organizationRef.current && !organizationRef.current.contains(event.target as Node)) {
        setIsOrganizationOpen(false);
      }

      if (employeeRef.current && !employeeRef.current.contains(event.target as Node)) {
        setIsEmployeeOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  const selectedOrganization = useMemo(() => {
    return organizations.find((option) => option.companyKey === organizationKey) ?? null;
  }, [organizationKey, organizations]);

  const selectedEmployee = useMemo(() => {
    if (selectedEmployeeId === null) {
      return null;
    }

    return employees.find((employee) => employee.employeeId === selectedEmployeeId) ?? null;
  }, [employees, selectedEmployeeId]);

  const accountSuggestions = useMemo(() => {
    const keyword = employeeKeyword.trim().toLowerCase();
    if (!keyword) {
      return employees.slice(0, 10);
    }

    return employees
      .filter((employee) => {
        const searchable = [employee.employeeName, employee.py].join(' ').toLowerCase();

        return searchable.includes(keyword);
      })
      .slice(0, 10);
  }, [employees, employeeKeyword]);

  const accountHelperText = selectedOrganization
    ? isLoadingEmployees
      ? '正在加载该机构下的可登录人员...'
      : employees.length > 0
        ? `已加载 ${employees.length} 位可登录人员`
        : '当前机构暂无可登录人员'
    : '请先选择所属机构';

  const loadOrganizations = async () => {
    setIsLoadingOrganizations(true);
    setErrorMessage(null);

    try {
      const data = await fetchServerOptions();
      setOrganizations(data);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      setOrganizations([]);
    } finally {
      setIsLoadingOrganizations(false);
    }
  };

  useEffect(() => {
    void loadOrganizations();
  }, []);

  useEffect(() => {
    let isActive = true;

    const loadEmployees = async () => {
      if (!selectedOrganization) {
        setEmployees([]);
        setEmployeeKeyword('');
        setSelectedEmployeeId(null);
        setPassword('');
        setIsEmployeeOpen(false);
        setIsLoadingEmployees(false);
        return;
      }

      setIsLoadingEmployees(true);
      setErrorMessage(null);
      setEmployees([]);
      setEmployeeKeyword('');
      setSelectedEmployeeId(null);
      setPassword('');
      setIsEmployeeOpen(false);

      try {
        const data = await fetchEmployeeOptions(selectedOrganization);
        if (!isActive) {
          return;
        }

        setEmployees(data);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setErrorMessage(getErrorMessage(error));
      } finally {
        if (isActive) {
          setIsLoadingEmployees(false);
        }
      }
    };

    void loadEmployees();

    return () => {
      isActive = false;
    };
  }, [selectedOrganization]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedOrganization) {
      setErrorMessage('请先选择所属机构。');
      return;
    }

    if (!selectedEmployee) {
      setErrorMessage('请选择有效的登录人员。');
      return;
    }

    if (!password.trim()) {
      setErrorMessage('请输入访问密码。');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const session = await loginWithPassword({
        basename: selectedOrganization.basename,
        employeeId: selectedEmployee.employeeId,
        password,
        serverip: selectedOrganization.serverip,
        serverport: selectedOrganization.serverport,
      });

      persistAuthSession(session, true);
      onLogin(session);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="font-display main-gradient relative min-h-screen overflow-x-hidden text-slate-900">
      <div className="pointer-events-none fixed inset-0 mesh-bg" />
      <div className="blob -left-24 -top-48 h-[600px] w-[600px] bg-sky-200" />
      <div className="blob bottom-0 -right-24 h-[500px] w-[500px] bg-cyan-100" style={{ animationDelay: '-5s' }} />
      <div
        className="blob left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 bg-blue-100"
        style={{ animationDelay: '-10s' }}
      />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center p-6 md:p-12">
        <div className="mb-12 flex flex-col items-center text-center">
          <div className="mb-4 flex items-center gap-4">
            <div className="rounded-xl border border-primary/20 bg-primary/10 p-2.5">
              <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <path clipRule="evenodd" d="M24 4H42V17.3333V30.6667H24V44H6V30.6667V17.3333H24V4Z" fill="currentColor" fillRule="evenodd" />
              </svg>
            </div>
            <div className="flex flex-col text-left">
              <span className="text-2xl font-extrabold tracking-tight text-slate-900">LANGSU AI</span>
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">AI 开发平台</span>
            </div>
          </div>
          <h1 className="text-4xl font-light text-slate-900 md:text-5xl">
            构建<span className="font-bold">下一代</span>企业级智能应用
          </h1>
        </div>

        <div className="flex w-full max-w-6xl flex-col items-center gap-16 lg:flex-row">
          <div className="hidden flex-1 flex-col space-y-12 lg:flex">
            <div className="space-y-10">
              <div className="group flex items-start gap-6">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white/50 font-bold text-primary shadow-sm">
                  01
                </div>
                <div>
                  <h3 className="mb-2 text-xl font-bold text-slate-900">需求洞察</h3>
                  <p className="max-w-md text-sm leading-relaxed text-slate-500">
                    梳理业务诉求、映射流程链路，在开发开始前明确系统边界与交付目标。
                  </p>
                </div>
              </div>
              <div className="group flex items-start gap-6">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white/50 font-bold text-primary shadow-sm">
                  02
                </div>
                <div>
                  <h3 className="mb-2 text-xl font-bold text-slate-900">模块架构</h3>
                  <p className="max-w-md text-sm leading-relaxed text-slate-500">
                    可视化设计模块结构，对齐数据关系，把复杂流程快速沉淀成可实施方案。
                  </p>
                </div>
              </div>
              <div className="group flex items-start gap-6">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white/50 font-bold text-primary shadow-sm">
                  03
                </div>
                <div>
                  <h3 className="mb-2 text-xl font-bold text-slate-900">AI 生成</h3>
                  <p className="max-w-md text-sm leading-relaxed text-slate-500">
                    快速生成可落地的应用骨架与页面结构，大幅减少重复实现与交付成本。
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card w-full max-w-md rounded-3xl p-8 md:p-10">
            <div className="mb-10">
              <h2 className="mb-2 text-2xl font-bold text-slate-900">欢迎回来</h2>
              <p className="text-sm text-slate-500">请输入您的凭据以访问朗速协同工作平台。</p>
            </div>

            {errorMessage ? (
              <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50/90 px-4 py-3 text-sm text-rose-700">
                {errorMessage}
              </div>
            ) : null}

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-1.5">
                <label className="ml-1 text-[11px] font-bold uppercase tracking-widest text-slate-400">所属机构</label>
                <div ref={organizationRef} className="relative">
                  <input name="organization" type="hidden" value={organizationKey} />
                  <button
                    type="button"
                    aria-expanded={isOrganizationOpen}
                    aria-haspopup="listbox"
                    disabled={isLoadingOrganizations}
                    onClick={() => setIsOrganizationOpen((open) => !open)}
                    className="group relative w-full text-left outline-none disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <div className="pointer-events-none absolute inset-0 rounded-[22px] border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.92),rgba(255,255,255,0.62)_42%,rgba(224,242,254,0.74))] shadow-[inset_0_1px_0_rgba(255,255,255,0.98),0_22px_42px_-28px_rgba(14,116,144,0.8)] transition-all duration-300 group-hover:border-primary/30 group-hover:shadow-[inset_0_1px_0_rgba(255,255,255,1),0_24px_46px_-24px_rgba(14,116,144,0.9)] group-focus-visible:border-primary/40 group-focus-visible:shadow-[inset_0_1px_0_rgba(255,255,255,1),0_28px_52px_-22px_rgba(14,116,144,1)]" />
                    <div className="pointer-events-none absolute inset-[1px] rounded-[21px] bg-white/35 backdrop-blur-2xl" />
                    <div className="pointer-events-none absolute -right-6 top-1/2 h-16 w-16 -translate-y-1/2 rounded-full bg-cyan-200/60 opacity-70 blur-2xl transition-opacity duration-300 group-hover:opacity-100" />
                    <div className="relative flex h-12 items-center gap-3 px-4 pr-20">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/80 bg-white/70 text-primary shadow-[0_10px_24px_-18px_rgba(14,116,144,0.8)]">
                        <span className="material-symbols-outlined text-[20px]">domain</span>
                      </div>
                      <div className={`min-w-0 flex-1 truncate text-[13px] font-semibold tracking-[0.01em] transition-colors ${selectedOrganization ? 'text-slate-900' : 'text-slate-500'}`}>
                        {selectedOrganization?.title ?? (isLoadingOrganizations ? '正在加载所属机构...' : '请选择所属机构')}
                      </div>
                    </div>
                    <div className={`pointer-events-none absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-2xl border border-white/80 bg-white/78 text-slate-500 shadow-[0_16px_30px_-22px_rgba(15,23,42,0.75)] transition-all duration-300 ${isOrganizationOpen ? 'scale-105 border-primary/35 bg-cyan-50/90 text-primary' : ''}`}>
                      <span className={`material-symbols-outlined text-[20px] transition-transform duration-300 ${isOrganizationOpen ? 'rotate-180' : ''}`}>
                        expand_more
                      </span>
                    </div>
                  </button>

                  <AnimatePresence>
                    {isOrganizationOpen && organizations.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.98 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="absolute left-0 right-0 z-20 mt-3 overflow-hidden rounded-[24px] border border-white/70 bg-white/72 shadow-[0_28px_60px_-30px_rgba(15,23,42,0.5)] backdrop-blur-2xl"
                      >
                        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.18),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.72),rgba(248,250,252,0.62))]" />
                        <div className="relative p-2" role="listbox">
                          {organizations.map((option) => {
                            const isActive = option.companyKey === organizationKey;

                            return (
                              <button
                                key={option.companyKey}
                                type="button"
                                role="option"
                                aria-selected={isActive}
                                onClick={() => {
                                  setOrganizationKey(option.companyKey);
                                  setIsOrganizationOpen(false);
                                  setIsEmployeeOpen(false);
                                  setErrorMessage(null);
                                }}
                                className={`flex w-full items-center gap-3 rounded-[18px] px-3 py-3 text-left transition-all duration-200 ${
                                  isActive
                                    ? 'bg-[linear-gradient(135deg,rgba(224,242,254,0.95),rgba(255,255,255,0.92))] text-slate-900 shadow-[0_18px_28px_-24px_rgba(14,116,144,0.95)]'
                                    : 'text-slate-600 hover:bg-white/70 hover:text-slate-900'
                                }`}
                              >
                                <div
                                  className={`flex h-10 w-10 items-center justify-center rounded-2xl border transition-all duration-200 ${
                                    isActive
                                      ? 'border-primary/20 bg-primary/10 text-primary'
                                      : 'border-white/70 bg-white/55 text-slate-400'
                                  }`}
                                >
                                  <span className="material-symbols-outlined text-[18px]">{isActive ? 'check' : 'apartment'}</span>
                                </div>
                                <div className="min-w-0 flex-1 truncate text-[13px] font-semibold">{option.title}</div>
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="ml-1 text-[11px] font-bold uppercase tracking-widest text-slate-400">登录人员</label>
                <div ref={employeeRef} className="relative">
                  <div className="absolute left-4 top-1/2 z-10 -translate-y-1/2 text-slate-400">
                    <span className="material-symbols-outlined text-lg">person</span>
                  </div>
                  <input
                    className="h-12 w-full rounded-xl border border-slate-200/60 bg-white/50 pl-12 pr-10 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-slate-100/70"
                    disabled={!selectedOrganization || isLoadingEmployees}
                    placeholder={selectedOrganization ? '请输入或搜索人员名称' : '请先选择所属机构'}
                    type="text"
                    value={employeeKeyword}
                    onChange={(event) => {
                      setEmployeeKeyword(event.target.value);
                      setSelectedEmployeeId(null);
                      setIsEmployeeOpen(true);
                      setErrorMessage(null);
                    }}
                    onFocus={() => {
                      if (selectedOrganization) {
                        setIsEmployeeOpen(true);
                      }
                    }}
                  />
                  <button
                    type="button"
                    disabled={!selectedOrganization || isLoadingEmployees}
                    onClick={() => setIsEmployeeOpen((open) => !open)}
                    className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-2xl text-slate-400 transition-colors hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className={`material-symbols-outlined text-[20px] transition-transform duration-300 ${isEmployeeOpen ? 'rotate-180' : ''}`}>
                      expand_more
                    </span>
                  </button>

                  <AnimatePresence>
                    {isEmployeeOpen && selectedOrganization ? (
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.98 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="absolute left-0 right-0 z-20 mt-3 overflow-hidden rounded-[24px] border border-white/70 bg-white/78 shadow-[0_28px_60px_-30px_rgba(15,23,42,0.45)] backdrop-blur-2xl"
                      >
                        <div className="max-h-72 overflow-y-auto p-2">
                          {accountSuggestions.length > 0 ? (
                            accountSuggestions.map((employee) => {
                              const isActive = selectedEmployeeId === employee.employeeId;

                              return (
                                <button
                                  key={employee.employeeId}
                                  type="button"
                                  onClick={() => {
                                    setEmployeeKeyword(employee.employeeName);
                                    setSelectedEmployeeId(employee.employeeId);
                                    setIsEmployeeOpen(false);
                                    setErrorMessage(null);
                                  }}
                                  className={`flex w-full items-center gap-3 rounded-[18px] px-3 py-3 text-left transition-all duration-200 ${
                                    isActive
                                      ? 'bg-[linear-gradient(135deg,rgba(224,242,254,0.95),rgba(255,255,255,0.92))] text-slate-900 shadow-[0_18px_28px_-24px_rgba(14,116,144,0.95)]'
                                      : 'text-slate-600 hover:bg-white/75 hover:text-slate-900'
                                  }`}
                                >
                                  <div
                                    className={`flex h-9 w-9 items-center justify-center rounded-2xl border transition-all duration-200 ${
                                      isActive
                                        ? 'border-primary/20 bg-primary/10 text-primary'
                                        : 'border-white/70 bg-white/55 text-slate-400'
                                    }`}
                                  >
                                    <span className="material-symbols-outlined text-[18px]">{isActive ? 'check' : 'badge'}</span>
                                  </div>
                                  <div className="min-w-0 flex-1 truncate text-[13px] font-semibold">{employee.employeeName}</div>
                                </button>
                              );
                            })
                          ) : (
                            <div className="px-3 py-4 text-sm text-slate-400">未找到匹配的人员名称</div>
                          )}
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
                <div className="ml-1 text-[11px] text-slate-400">{accountHelperText}</div>
              </div>

              <div className="space-y-1.5">
                <label className="ml-1 text-[11px] font-bold uppercase tracking-widest text-slate-400">访问密码</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <span className="material-symbols-outlined text-lg">lock</span>
                  </div>
                  <input
                    className="h-12 w-full rounded-xl border border-slate-200/60 bg-white/50 pl-12 pr-12 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/20"
                    placeholder="请输入密码"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setErrorMessage(null);
                    }}
                  />
                  <button
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-primary"
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                  >
                    <span className="material-symbols-outlined text-lg">{showPassword ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
              </div>

              {!isLoadingOrganizations && organizations.length === 0 ? (
                <div className="flex justify-end">
                  <button
                    className="text-xs font-semibold text-primary transition-colors hover:text-erp-blue"
                    type="button"
                    onClick={() => void loadOrganizations()}
                  >
                    重新加载机构
                  </button>
                </div>
              ) : null}

              <div className="pt-2">
                <button
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-bold text-white shadow-lg shadow-primary/20 transition-all active:scale-[0.98] hover:bg-erp-blue disabled:cursor-not-allowed disabled:bg-slate-400 disabled:shadow-none"
                  disabled={isSubmitting || isLoadingOrganizations}
                  type="submit"
                >
                  <span className="text-sm uppercase tracking-widest">{isSubmitting ? '登录中...' : '立即登录'}</span>
                  <span className="material-symbols-outlined text-lg">login</span>
                </button>
              </div>
            </form>

            <div className="mt-10 border-t border-slate-200/50 pt-6">
              <p className="text-center text-[10px] leading-relaxed text-slate-400">
                本系统仅限授权人员使用，未经许可的访问尝试将被记录并接受审计。
                <br />
                © 2024 朗速科技. 保留所有权利。
              </p>
            </div>
          </div>
        </div>

        <div className="mt-16 flex gap-8 text-[11px] uppercase tracking-widest text-slate-400">
          <a className="transition-colors hover:text-primary" href="#">
            技术支持
          </a>
          <a className="transition-colors hover:text-primary" href="#">
            安全条例
          </a>
          <a className="transition-colors hover:text-primary" href="#">
            用户协议
          </a>
        </div>
      </div>
    </div>
  );
}
