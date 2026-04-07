import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';

import type { AuthSession, EmployeeOption, ServerOption } from '../shared/api/auth';
import { fetchEmployeeOptions, fetchServerOptions, loginWithPassword } from '../shared/api/auth';
import { persistLoginContext } from '../shared/auth/login-context';
import {
  clearRememberedLoginState,
  getRememberedLoginState,
  persistRememberedLoginState,
} from '../shared/auth/remembered-login';
import { persistAuthSession } from '../shared/auth/session';
import { ApiError } from '../shared/api/http';

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
  const rememberedLoginState = useMemo(() => getRememberedLoginState(), []);
  const [organizationKey, setOrganizationKey] = useState(rememberedLoginState?.organizationKey ?? '');
  const [organizations, setOrganizations] = useState<ServerOption[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [employeeKeyword, setEmployeeKeyword] = useState(rememberedLoginState?.employeeName ?? '');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(rememberedLoginState?.employeeId ?? null);
  const [password, setPassword] = useState(rememberedLoginState?.password ?? '');
  const [rememberCredentials, setRememberCredentials] = useState(Boolean(rememberedLoginState));
  const [showPassword, setShowPassword] = useState(false);
  const [isEmployeeOpen, setIsEmployeeOpen] = useState(false);
  const [isLoadingOrganizations, setIsLoadingOrganizations] = useState(false);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const employeeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (employeeRef.current && !employeeRef.current.contains(event.target as Node)) {
        setIsEmployeeOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  const selectedEmployee = useMemo(() => {
    if (selectedEmployeeId === null) {
      return null;
    }

    return employees.find((employee) => employee.employeeId === selectedEmployeeId) ?? null;
  }, [employees, selectedEmployeeId]);

  const availableOrganizations = organizations;

  const selectedOrganization = useMemo(() => {
    return availableOrganizations.find((option) => option.companyKey === organizationKey) ?? null;
  }, [availableOrganizations, organizationKey]);

  const employeeSuggestions = useMemo(() => {
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
  }, [employeeKeyword, employees]);

  useEffect(() => {
    const keyword = employeeKeyword.trim().toLowerCase();
    if (!keyword) {
      return;
    }

    const matchedEmployee = employees.find((employee) => {
      return [employee.employeeName, employee.loginAccount, employee.py]
        .map((value) => value.trim().toLowerCase())
        .includes(keyword);
    }) ?? null;

    if (!matchedEmployee) {
      return;
    }

    if (matchedEmployee.employeeId !== selectedEmployeeId) {
      setSelectedEmployeeId(matchedEmployee.employeeId);
    }
  }, [employeeKeyword, employees, selectedEmployeeId]);

  const employeeHelperText = isLoadingEmployees
    ? '正在加载公司人员列表...'
    : employees.length > 0
      ? `已从固定人员库加载 ${employees.length} 位可登录人员`
      : '当前未获取到可登录人员';
  const organizationAccessMessage = selectedEmployee && !isLoadingOrganizations && availableOrganizations.length === 0
    ? '未配置帐套权限，请联系管理员'
    : null;

  useEffect(() => {
    let isActive = true;

    const loadEmployees = async () => {
      setIsLoadingEmployees(true);
      setErrorMessage(null);
      setEmployees([]);
      setIsEmployeeOpen(false);

      try {
        const data = await fetchEmployeeOptions();
        if (!isActive) {
          return;
        }

        const nextEmployees = Array.isArray(data) ? data : [];
        setEmployees(nextEmployees);

        if (rememberedLoginState) {
          const rememberedEmployee = nextEmployees.find((employee) => employee.employeeId === rememberedLoginState.employeeId) ?? null;
          if (rememberedEmployee) {
            setSelectedEmployeeId(rememberedEmployee.employeeId);
            setEmployeeKeyword(rememberedEmployee.employeeName);
            setPassword(rememberedLoginState.password);
            setRememberCredentials(true);
          }
        } else {
          setSelectedEmployeeId((prev) => (
            prev !== null && nextEmployees.some((employee) => employee.employeeId === prev)
              ? prev
              : null
          ));
        }
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
  }, [rememberedLoginState]);

  useEffect(() => {
    let isActive = true;

    const loadOrganizationOptions = async () => {
      if (!selectedEmployee) {
        setOrganizations([]);
        setIsLoadingOrganizations(false);
        return;
      }

      try {
        setIsLoadingOrganizations(true);
        setErrorMessage(null);
        const data = await fetchServerOptions(selectedEmployee.employeeId);
        if (!isActive) {
          return;
        }

        setOrganizations(Array.isArray(data) ? data : []);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setErrorMessage(getErrorMessage(error));
      } finally {
        if (isActive) {
          setIsLoadingOrganizations(false);
        }
      }
    };

    void loadOrganizationOptions();

    return () => {
      isActive = false;
    };
  }, [selectedEmployee]);

  useEffect(() => {
    if (availableOrganizations.length === 0) {
      setOrganizationKey('');
      return;
    }

    const hasCurrentSelection = availableOrganizations.some((option) => option.companyKey === organizationKey);
    if (!hasCurrentSelection) {
      const rememberedOrganizationKey = selectedEmployee && rememberedLoginState?.employeeId === selectedEmployee.employeeId
        ? rememberedLoginState.organizationKey
        : '';
      const nextOrganization = availableOrganizations.find((option) => option.companyKey === rememberedOrganizationKey)
        ?? availableOrganizations[0]
        ?? null;
      setOrganizationKey(nextOrganization?.companyKey ?? '');
    }
  }, [availableOrganizations, organizationKey, rememberedLoginState, selectedEmployee]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedOrganization) {
      setErrorMessage('未配置帐套权限，请联系管理员');
      return;
    }

    if (!selectedEmployee) {
      setErrorMessage('请选择有效的登录人员。');
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

      const normalizedSession = {
        ...session,
        departmentId: selectedEmployee.departmentId || session.departmentId,
        employeeId: selectedEmployee.employeeId,
        employeeName: selectedEmployee.employeeName || session.employeeName,
        selectedCompanyOptionKey: selectedOrganization.companyKey,
        username: selectedEmployee.loginAccount || session.username,
      };

      persistAuthSession(normalizedSession, rememberCredentials);
      persistLoginContext({
        employeeId: selectedEmployee.employeeId,
        employeeName: selectedEmployee.employeeName,
        password,
        remember: rememberCredentials,
      });
      if (rememberCredentials) {
        persistRememberedLoginState({
          employeeId: selectedEmployee.employeeId,
          employeeName: selectedEmployee.employeeName,
          organizationKey: selectedOrganization.companyKey,
          password,
        });
      } else {
        clearRememberedLoginState();
      }
      onLogin(normalizedSession);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSubmitDisabled = (
    isSubmitting
    || isLoadingEmployees
    || isLoadingOrganizations
    || !selectedEmployee
    || !selectedOrganization
    || !password.trim()
    || (selectedEmployee !== null && availableOrganizations.length === 0)
  );

  return (
    <div className="font-display main-gradient relative min-h-screen overflow-x-hidden text-slate-900">
      <div className="pointer-events-none fixed inset-0 mesh-bg" />
      <div className="blob -left-24 -top-48 h-[600px] w-[600px] bg-sky-200" />
      <div className="blob bottom-0 -right-24 h-[500px] w-[500px] bg-cyan-100" style={{ animationDelay: '-5s' }} />
      <div
        className="blob left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 bg-blue-100"
        style={{ animationDelay: '-10s' }}
      />

      <div className="relative z-10 flex min-h-screen items-center justify-center p-6 md:p-10">
        <div className="glass-card w-full max-w-md rounded-3xl p-8 md:p-9">
          <div className="mb-8 flex items-center gap-4">
            <div className="rounded-xl border border-primary/20 bg-primary/10 p-2.5">
              <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <path clipRule="evenodd" d="M24 4H42V17.3333V30.6667H24V44H6V30.6667V17.3333H24V4Z" fill="currentColor" fillRule="evenodd" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="text-xl font-extrabold tracking-tight text-slate-900">LANGSU AI</div>
              <div className="mt-1 text-[11px] font-medium text-slate-500">登录工作台</div>
            </div>
          </div>

          {errorMessage ? (
            <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50/90 px-4 py-3 text-sm text-rose-700">
              {errorMessage}
            </div>
          ) : null}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <label className="ml-1 text-[11px] font-bold uppercase tracking-widest text-slate-400">登录人员</label>
              <div ref={employeeRef} className="relative">
                <div className="absolute left-4 top-1/2 z-10 -translate-y-1/2 text-slate-400">
                  <span className="material-symbols-outlined text-lg">person</span>
                </div>
                <input
                  className="h-12 w-full rounded-xl border border-slate-200/60 bg-white/50 pl-12 pr-10 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-slate-100/70"
                  disabled={isLoadingEmployees}
                  placeholder={isLoadingEmployees ? '正在加载人员列表...' : '请输入或搜索人员名称'}
                  type="text"
                  value={employeeKeyword}
                  onChange={(event) => {
                    setEmployeeKeyword(event.target.value);
                    setSelectedEmployeeId(null);
                    setIsEmployeeOpen(true);
                    setErrorMessage(null);
                  }}
                  onFocus={() => setIsEmployeeOpen(true)}
                />
                <button
                  type="button"
                  disabled={isLoadingEmployees}
                  onClick={() => setIsEmployeeOpen((open) => !open)}
                  className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-2xl text-slate-400 transition-colors hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className={`material-symbols-outlined text-[20px] transition-transform duration-300 ${isEmployeeOpen ? 'rotate-180' : ''}`}>
                    expand_more
                  </span>
                </button>

                <AnimatePresence>
                  {isEmployeeOpen ? (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.98 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                      className="absolute left-0 right-0 z-20 mt-3 overflow-hidden rounded-[24px] border border-white/70 bg-white/78 shadow-[0_28px_60px_-30px_rgba(15,23,42,0.45)] backdrop-blur-2xl"
                    >
                      <div className="max-h-72 overflow-y-auto p-2">
                        {employeeSuggestions.length > 0 ? (
                          employeeSuggestions.map((employee) => {
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
              <div className="ml-1 text-[11px] text-slate-400">{employeeHelperText}</div>
              {organizationAccessMessage ? (
                <div className="ml-1 text-[11px] font-medium text-rose-600">{organizationAccessMessage}</div>
              ) : null}
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

            <label className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white/50 px-4 py-3 text-sm text-slate-600">
              <div className="flex items-center gap-3">
                <input
                  checked={rememberCredentials}
                  className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/30"
                  type="checkbox"
                  onChange={(event) => setRememberCredentials(event.target.checked)}
                />
                <span className="font-medium text-slate-700">记住账号和密码</span>
              </div>
              <span className="text-[11px] text-slate-400">退出后下次自动带入</span>
            </label>

            <div className="pt-1">
              <button
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-bold text-white shadow-lg shadow-primary/20 transition-all active:scale-[0.98] hover:bg-erp-blue disabled:cursor-not-allowed disabled:bg-slate-400 disabled:shadow-none"
                disabled={isSubmitDisabled}
                type="submit"
              >
                <span className="text-sm uppercase tracking-widest">{isSubmitting ? '登录中...' : '立即登录'}</span>
                <span className="material-symbols-outlined text-lg">login</span>
              </button>
            </div>
          </form>

          <div className="mt-8 border-t border-slate-200/50 pt-5">
            <p className="text-center text-[10px] leading-relaxed text-slate-400">
              本系统仅限授权人员使用。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
