import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface LoginProps {
  onLogin: () => void;
}

const organizationOptions = [
  { value: 'group-a', label: '朗速科技集团 A', meta: '制造业务工作台' },
  { value: 'group-b', label: '朗速科技集团 B', meta: '运营业务工作台' },
  { value: 'partner', label: '合作伙伴协同中心', meta: '共享交付空间' },
];

export default function Login({ onLogin }: LoginProps) {
  const [organization, setOrganization] = React.useState('');
  const [isOrganizationOpen, setIsOrganizationOpen] = React.useState(false);
  const organizationRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (organizationRef.current && !organizationRef.current.contains(event.target as Node)) {
        setIsOrganizationOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  const selectedOrganization = organizationOptions.find((option) => option.value === organization);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin();
  };

  return (
    <div className="font-display main-gradient text-slate-900 min-h-screen overflow-x-hidden relative">
      <div className="fixed inset-0 mesh-bg pointer-events-none"></div>
      <div className="blob w-[600px] h-[600px] bg-sky-200 -top-48 -left-24"></div>
      <div className="blob w-[500px] h-[500px] bg-cyan-100 bottom-0 -right-24" style={{ animationDelay: '-5s' }}></div>
      <div className="blob w-[300px] h-[300px] bg-blue-100 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ animationDelay: '-10s' }}></div>

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-6 md:p-12">
        <div className="mb-12 flex flex-col items-center text-center">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-primary/10 p-2.5 rounded-xl border border-primary/20">
              <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <path clipRule="evenodd" d="M24 4H42V17.3333V30.6667H24V44H6V30.6667V17.3333H24V4Z" fill="currentColor" fillRule="evenodd"></path>
              </svg>
            </div>
            <div className="flex flex-col text-left">
              <span className="text-2xl font-extrabold text-slate-900 tracking-tight">LANGSU AI</span>
              <span className="text-[10px] text-primary font-bold tracking-[0.3em] uppercase">AI 开发平台</span>
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-light text-slate-900">
            构建<span className="font-bold">下一代</span>企业级智能应用
          </h1>
        </div>

        <div className="w-full max-w-6xl flex flex-col lg:flex-row items-center gap-16">
          <div className="hidden lg:flex flex-col flex-1 space-y-12">
            <div className="space-y-10">
              <div className="flex items-start gap-6 group">
                <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-2xl bg-white/50 border border-slate-200 shadow-sm text-primary font-bold">01</div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">需求洞察</h3>
                  <p className="text-slate-500 leading-relaxed text-sm max-w-md">
                    梳理业务诉求、映射流程链路，在开发开始前明确系统边界与交付目标。
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-6 group">
                <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-2xl bg-white/50 border border-slate-200 shadow-sm text-primary font-bold">02</div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">模块架构</h3>
                  <p className="text-slate-500 leading-relaxed text-sm max-w-md">
                    可视化设计模块结构，对齐数据关系，把复杂流程快速沉淀成可实施方案。
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-6 group">
                <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-2xl bg-white/50 border border-slate-200 shadow-sm text-primary font-bold">03</div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">AI 生成</h3>
                  <p className="text-slate-500 leading-relaxed text-sm max-w-md">
                    快速生成可落地的应用骨架与页面结构，大幅减少重复实现与交付成本。
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full max-w-md glass-card rounded-3xl p-8 md:p-10">
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">欢迎回来</h2>
              <p className="text-slate-500 text-sm">请输入您的凭据以访问朗速协同工作平台。</p>
            </div>
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">所属机构</label>
                <div ref={organizationRef} className="relative">
                  <input name="organization" type="hidden" value={organization} />
                  <button
                    type="button"
                    aria-expanded={isOrganizationOpen}
                    aria-haspopup="listbox"
                    onClick={() => setIsOrganizationOpen((open) => !open)}
                    className="group relative w-full text-left outline-none"
                  >
                    <div className="pointer-events-none absolute inset-0 rounded-[22px] border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.92),rgba(255,255,255,0.62)_42%,rgba(224,242,254,0.74))] shadow-[inset_0_1px_0_rgba(255,255,255,0.98),0_22px_42px_-28px_rgba(14,116,144,0.8)] transition-all duration-300 group-hover:border-primary/30 group-hover:shadow-[inset_0_1px_0_rgba(255,255,255,1),0_24px_46px_-24px_rgba(14,116,144,0.9)] group-focus-visible:border-primary/40 group-focus-visible:shadow-[inset_0_1px_0_rgba(255,255,255,1),0_28px_52px_-22px_rgba(14,116,144,1)]"></div>
                    <div className="pointer-events-none absolute inset-[1px] rounded-[21px] bg-white/35 backdrop-blur-2xl"></div>
                    <div className="pointer-events-none absolute -right-6 top-1/2 h-16 w-16 -translate-y-1/2 rounded-full bg-cyan-200/60 opacity-70 blur-2xl transition-opacity duration-300 group-hover:opacity-100"></div>
                    <div className="relative flex h-14 items-center gap-3 px-4 pr-20">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/80 bg-white/70 text-primary shadow-[0_10px_24px_-18px_rgba(14,116,144,0.8)]">
                        <span className="material-symbols-outlined text-[20px]">domain</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className={`truncate text-[13px] font-semibold tracking-[0.01em] transition-colors ${selectedOrganization ? 'text-slate-900' : 'text-slate-500'}`}>
                          {selectedOrganization?.label ?? '请选择所属机构'}
                        </div>
                        <div className="mt-0.5 truncate text-[10px] uppercase tracking-[0.22em] text-slate-400">
                          {selectedOrganization?.meta ?? '选择当前登录工作台'}
                        </div>
                      </div>
                    </div>
                    <div className={`pointer-events-none absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-2xl border border-white/80 bg-white/78 text-slate-500 shadow-[0_16px_30px_-22px_rgba(15,23,42,0.75)] transition-all duration-300 ${isOrganizationOpen ? 'scale-105 border-primary/35 bg-cyan-50/90 text-primary' : ''}`}>
                      <span className={`material-symbols-outlined text-[20px] transition-transform duration-300 ${isOrganizationOpen ? 'rotate-180' : ''}`}>expand_more</span>
                    </div>
                  </button>

                  <AnimatePresence>
                    {isOrganizationOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.98 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="absolute left-0 right-0 z-20 mt-3 overflow-hidden rounded-[24px] border border-white/70 bg-white/72 shadow-[0_28px_60px_-30px_rgba(15,23,42,0.5)] backdrop-blur-2xl"
                      >
                        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.18),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.72),rgba(248,250,252,0.62))]"></div>
                        <div className="relative p-2" role="listbox">
                          {organizationOptions.map((option) => {
                            const isActive = option.value === organization;

                            return (
                              <button
                                key={option.value}
                                type="button"
                                role="option"
                                aria-selected={isActive}
                                onClick={() => {
                                  setOrganization(option.value);
                                  setIsOrganizationOpen(false);
                                }}
                                className={`flex w-full items-center gap-3 rounded-[18px] px-3 py-3 text-left transition-all duration-200 ${
                                  isActive
                                    ? 'bg-[linear-gradient(135deg,rgba(224,242,254,0.95),rgba(255,255,255,0.92))] text-slate-900 shadow-[0_18px_28px_-24px_rgba(14,116,144,0.95)]'
                                    : 'text-slate-600 hover:bg-white/70 hover:text-slate-900'
                                }`}
                              >
                                <div className={`flex h-10 w-10 items-center justify-center rounded-2xl border transition-all duration-200 ${
                                  isActive
                                    ? 'border-primary/20 bg-primary/10 text-primary'
                                    : 'border-white/70 bg-white/55 text-slate-400'
                                }`}>
                                  <span className="material-symbols-outlined text-[18px]">{isActive ? 'check' : 'apartment'}</span>
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="truncate text-[13px] font-semibold">{option.label}</div>
                                  <div className="mt-0.5 truncate text-[10px] uppercase tracking-[0.2em] text-slate-400">
                                    {option.meta}
                                  </div>
                                </div>
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
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">登录账号</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <span className="material-symbols-outlined text-lg">person</span>
                  </div>
                  <input className="w-full h-12 pl-12 pr-4 rounded-xl border border-slate-200/60 bg-white/50 text-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm outline-none placeholder:text-slate-400" placeholder="手机号 / 邮箱 / 工号" type="text" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">访问密码</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <span className="material-symbols-outlined text-lg">lock</span>
                  </div>
                  <input className="w-full h-12 pl-12 pr-12 rounded-xl border border-slate-200/60 bg-white/50 text-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm outline-none placeholder:text-slate-400" placeholder="请输入密码" type="password" />
                  <button className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors" type="button">
                    <span className="material-symbols-outlined text-lg">visibility</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center cursor-pointer group">
                  <input className="hidden peer" id="remember-me" type="checkbox" />
                  <div className="w-5 h-5 rounded border border-slate-300 bg-white flex items-center justify-center mr-2 group-hover:border-primary transition-colors peer-checked:bg-primary peer-checked:border-primary">
                    <span className="material-symbols-outlined text-white text-[14px] font-bold opacity-0 peer-checked:opacity-100" id="check-icon">check</span>
                  </div>
                  <span className="text-xs text-slate-500 font-medium">保持登录</span>
                </label>
              </div>

              <div className="pt-4">
                <button className="w-full h-12 bg-primary hover:bg-erp-blue text-white font-bold rounded-xl shadow-lg shadow-primary/20 transform active:scale-[0.98] transition-all flex items-center justify-center gap-2" type="submit">
                  <span className="tracking-widest uppercase text-sm">立即登录</span>
                  <span className="material-symbols-outlined text-lg">login</span>
                </button>
              </div>
            </form>

            <div className="mt-10 pt-6 border-t border-slate-200/50">
              <p className="text-[10px] text-slate-400 text-center leading-relaxed">
                本系统仅限授权人员使用，未经许可的访问尝试将被记录并接受审计。
                <br />
                © 2024 朗速科技. 保留所有权利。
              </p>
            </div>
          </div>
        </div>

        <div className="mt-16 flex gap-8 text-[11px] text-slate-400 uppercase tracking-widest">
          <a className="hover:text-primary transition-colors" href="#">技术支持</a>
          <a className="hover:text-primary transition-colors" href="#">安全条例</a>
          <a className="hover:text-primary transition-colors" href="#">用户协议</a>
        </div>
      </div>
    </div>
  );
}
