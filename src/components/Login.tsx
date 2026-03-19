import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import BrandLogo from './BrandLogo';
import GlassIcon from './GlassIcon';

interface LoginProps {
  onLogin: () => void;
}

const organizationOptions = [
  { value: 'group-a', label: '朗速科技集团 A', meta: '制造业务工作台' },
  { value: 'group-b', label: '朗速科技集团 B', meta: '运营业务工作台' },
  { value: 'partner', label: '合作伙伴协同中心', meta: '共享交付空间' },
];

const highlights = [
  {
    icon: 'query_stats',
    tone: 'primary' as const,
    title: '需求洞察',
    description: '梳理业务边界与关键流程，先把目标、约束与交付路径讲清楚，再进入模块设计。',
  },
  {
    icon: 'deployed_code',
    tone: 'indigo' as const,
    title: '模块架构',
    description: '用结构化方式拆解模块、表单与数据关系，让复杂业务更容易落地和复用。',
  },
  {
    icon: 'auto_awesome',
    tone: 'cyan' as const,
    title: 'AI 生成',
    description: '把页面骨架、流程配置与内容草稿更快生成出来，减少重复搭建和沟通成本。',
  },
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

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onLogin();
  };

  return (
    <div className="app-atmosphere relative min-h-screen overflow-x-hidden font-sans text-slate-900">
      <div className="pointer-events-none fixed inset-0 mesh-bg" />
      <div className="blob -left-24 -top-56 h-[640px] w-[640px] bg-sky-200/70" />
      <div className="blob bottom-0 -right-20 h-[540px] w-[540px] bg-cyan-100/80" style={{ animationDelay: '-5s' }} />
      <div
        className="blob left-1/2 top-1/2 h-[360px] w-[360px] -translate-x-1/2 -translate-y-1/2 bg-white/80"
        style={{ animationDelay: '-10s' }}
      />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-5 py-8 md:px-10 md:py-12">
        <div className="mb-10 flex flex-col items-center text-center md:mb-12">
          <div className="glass-chip relative mb-5 min-h-[92px] px-6 py-4 md:px-7">
            <div className="absolute inset-0 flex items-center justify-center px-5">
              <BrandLogo align="center" size="md" showTagline tagline="AI模块工作台" />
            </div>
            <div className="pointer-events-none opacity-0 glass-panel-soft flex h-12 w-12 items-center justify-center rounded-2xl">
              <svg className="h-7 w-7 text-primary" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <path
                  clipRule="evenodd"
                  d="M24 4H42V17.3333V30.6667H24V44H6V30.6667V17.3333H24V4Z"
                  fill="currentColor"
                  fillRule="evenodd"
                />
              </svg>
            </div>
            <div className="hidden" aria-hidden="true">
              <span className="type-h3 font-bold text-slate-900">lumsoft</span>
              <span className="type-meta font-bold uppercase tracking-[0.24em] text-primary">AI 开发平台</span>
            </div>
          </div>
          <h1 className="type-display max-w-[10ch] text-balance font-light text-slate-900 sm:max-w-[12ch] lg:max-w-[13ch]">
            构建<span className="font-bold">下一代</span>企业级智能应用
          </h1>
          <p className="type-body mt-4 max-w-2xl text-slate-600">
            统一业务模块、流程配置与 AI 协作能力，用一套更直观、更可信的工作台完成设计与交付。
          </p>
        </div>

        <div className="flex w-full max-w-7xl flex-col items-center gap-10 lg:flex-row lg:items-start lg:gap-14">
          <div className="hidden flex-1 lg:grid lg:grid-cols-1 lg:gap-5">
            {highlights.map((item, index) => (
              <div key={item.title} className="glass-panel-soft glass-sheen flex items-start gap-5 rounded-[30px] p-6">
                <div className="flex flex-col items-center gap-3">
                  <GlassIcon icon={item.icon} size="lg" tone={item.tone} />
                  <span className="glass-chip-soft type-caption px-3 py-1 font-semibold text-slate-500">0{index + 1}</span>
                </div>
                <div className="pt-1">
                  <h3 className="type-h3 mb-2 font-bold text-slate-900">{item.title}</h3>
                  <p className="type-body-sm max-w-md text-slate-600">{item.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="glass-panel-strong w-full max-w-md rounded-[34px] p-7 md:p-9">
            <div className="mb-10">
              <h2 className="type-h2 mb-2 font-bold text-slate-900">欢迎回来</h2>
              <p className="type-body-sm text-slate-600">请输入您的凭据以访问朗速协同工作平台。</p>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label className="type-label ml-1 text-slate-500">所属组织</label>
                <div ref={organizationRef} className="relative">
                  <input name="organization" type="hidden" value={organization} />
                  <button
                    type="button"
                    aria-expanded={isOrganizationOpen}
                    aria-haspopup="listbox"
                    onClick={() => setIsOrganizationOpen((open) => !open)}
                    className="glass-input glass-sheen group relative w-full rounded-[26px] px-4 py-4 text-left outline-none transition-all"
                  >
                    <div className="relative flex min-h-14 items-center gap-3 pr-16">
                      <GlassIcon icon="domain" size="sm" tone="primary" />
                      <div className="min-w-0 flex-1">
                        <div className={`type-body-sm truncate font-semibold transition-colors ${selectedOrganization ? 'text-slate-900' : 'text-slate-500'}`}>
                          {selectedOrganization?.label ?? '请选择所属组织'}
                        </div>
                        <div className="type-meta mt-0.5 truncate text-slate-400">
                          {selectedOrganization?.meta ?? '选择当前登录工作台'}
                        </div>
                      </div>
                    </div>
                    <GlassIcon
                      icon="expand_more"
                      size="xs"
                      tone={isOrganizationOpen ? 'primary' : 'slate'}
                      className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 transition-transform duration-300 ${isOrganizationOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  <AnimatePresence>
                    {isOrganizationOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.98 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="glass-panel absolute left-0 right-0 z-20 mt-3 overflow-hidden rounded-[28px]"
                      >
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
                                className={`flex w-full items-center gap-3 rounded-[22px] px-3 py-3 text-left transition-all duration-200 ${
                                  isActive ? 'glass-panel-soft text-slate-900' : 'text-slate-600 hover:bg-white/55 hover:text-slate-900'
                                }`}
                              >
                                <GlassIcon icon={isActive ? 'check' : 'apartment'} size="sm" tone={isActive ? 'primary' : 'slate'} />
                                <div className="min-w-0 flex-1">
                                  <div className="type-body-sm truncate font-semibold">{option.label}</div>
                                  <div className="type-meta mt-0.5 truncate text-slate-400">{option.meta}</div>
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

              <div className="space-y-2">
                <label className="type-label ml-1 text-slate-500">登录账号</label>
                <div className="glass-input flex items-center gap-3 rounded-[22px] px-4 py-3">
                  <GlassIcon icon="person" size="sm" tone="slate" />
                  <input
                    className="h-12 w-full bg-transparent pr-1 text-base text-slate-900 outline-none placeholder:text-slate-400"
                    placeholder="手机号 / 邮箱 / 工号"
                    type="text"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="type-label ml-1 text-slate-500">访问密码</label>
                <div className="glass-input flex items-center gap-3 rounded-[22px] px-4 py-3">
                  <GlassIcon icon="lock" size="sm" tone="slate" />
                  <input
                    className="h-12 w-full bg-transparent pr-1 text-base text-slate-900 outline-none placeholder:text-slate-400"
                    placeholder="请输入密码"
                    type="password"
                  />
                  <button className="text-slate-400 transition-colors hover:text-primary" type="button">
                    <GlassIcon icon="visibility" size="xs" tone="slate" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="group flex cursor-pointer items-center">
                  <input className="peer hidden" id="remember-me" type="checkbox" />
                  <div className="glass-panel-soft mr-2 flex h-5 w-5 items-center justify-center rounded-md border border-transparent transition-colors group-hover:border-primary/25 peer-checked:border-primary/30 peer-checked:bg-primary/85">
                    <span className="text-[13px] font-bold text-white opacity-0 peer-checked:opacity-100" id="check-icon">✓</span>
                  </div>
                  <span className="type-body-sm font-medium text-slate-500">保持登录</span>
                </label>
                <span className="glass-chip-soft type-caption px-3 py-1 text-slate-500">安全连接</span>
              </div>

              <div className="pt-3">
                <button className="glass-button-primary glass-sheen relative flex h-14 w-full items-center justify-center gap-3 rounded-2xl text-white transition-all hover:-translate-y-0.5 active:scale-[0.99]" type="submit">
                  <span className="type-label tracking-[0.14em] text-white">立即登录</span>
                  <GlassIcon icon="login" size="xs" tone="sky" className="bg-white/15" iconClassName="text-white" />
                </button>
              </div>
            </form>

            <div className="mt-10 border-t border-white/40 pt-6">
              <p className="type-meta text-center text-slate-500">
                本系统仅限授权人员使用，未经许可的访问尝试将被记录并接受审计。
                <br />
                © 2026 朗速科技。保留所有权利。
              </p>
            </div>
          </div>
        </div>

        <div className="glass-chip-soft mt-12 flex flex-wrap justify-center gap-x-8 gap-y-3 px-5 py-3 text-center type-meta text-slate-500 md:mt-14">
          <a className="transition-colors hover:text-primary" href="#">技术支持</a>
          <a className="transition-colors hover:text-primary" href="#">安全条款</a>
          <a className="transition-colors hover:text-primary" href="#">用户协议</a>
        </div>
      </div>
    </div>
  );
}
