import { startTransition } from 'react';

import type { AuthSession } from '../../lib/backend-auth';
import type { PlatformDefinition } from '../registry/platform-registry';

type SystemSelectorPageProps = {
  onLogout: () => void;
  onSelect: (platform: PlatformDefinition) => void;
  platforms: PlatformDefinition[];
  session: AuthSession;
};

function getPlatformBadge(platform: PlatformDefinition) {
  switch (platform.id) {
    case 'design':
      return 'Design';
    case 'project':
      return 'Project';
    default:
      return platform.kind;
  }
}

export function SystemSelectorPage({
  onLogout,
  onSelect,
  platforms,
  session,
}: SystemSelectorPageProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.18),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.12),transparent_24%),linear-gradient(180deg,#eef5ff_0%,#f8fbff_45%,#f2f6fb_100%)] text-slate-900">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:28px_28px]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-[1480px] flex-col gap-6 px-4 py-6 lg:px-8">
        <header className="cloudy-glass-stage rounded-[32px] px-8 py-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-4xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/72 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em] text-primary">
                System Selector
              </div>
              <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
                登录成功后先选择要进入的系统
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
                当前先在 LsAITool 中承接统一登录和系统分流。设计平台与项目平台都从这里进入，后续再分别继续扩展各自主界面。
              </p>
            </div>

            <div className="cloudy-glass-panel-soft rounded-[28px] p-5 text-sm text-slate-600 xl:min-w-[360px]">
              <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">
                当前登录
              </div>
              <div className="mt-3 space-y-2">
                <div className="text-lg font-black tracking-tight text-slate-950">
                  {session.employeeName || session.username}
                </div>
                <div>{session.companyTitle}</div>
                <div className="font-mono text-[12px] text-slate-500">{session.username}</div>
              </div>
              <button
                className="mt-5 inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:border-primary/20 hover:text-primary"
                onClick={() => {
                  startTransition(() => {
                    onLogout();
                  });
                }}
                type="button"
              >
                退出登录
              </button>
            </div>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-2">
          {platforms.map((platform) => (
            <button
              key={platform.id}
              className="group rounded-[30px] border border-white/80 bg-white/74 p-7 text-left shadow-[0_28px_60px_-36px_rgba(15,23,42,0.28)] transition-all duration-200 hover:-translate-y-1 hover:border-primary/25 hover:shadow-[0_34px_70px_-34px_rgba(37,99,235,0.24)]"
              onClick={() => {
                startTransition(() => {
                  onSelect(platform);
                });
              }}
              type="button"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex rounded-full border border-primary/15 bg-primary/8 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em] text-primary">
                    {getPlatformBadge(platform)}
                  </div>
                  <h2 className="mt-4 text-2xl font-black tracking-tight text-slate-950">
                    {platform.name}
                  </h2>
                </div>
                <span className="material-symbols-outlined text-3xl text-primary transition-transform duration-200 group-hover:translate-x-1">
                  arrow_forward
                </span>
              </div>

              <p className="mt-4 text-sm leading-7 text-slate-600">
                {platform.description}
              </p>

              <div className="mt-6 flex items-center justify-between text-sm">
                <div className="text-slate-500">
                  入口路径
                  <div className="mt-1 font-mono text-[12px] text-slate-700">{platform.basePath}</div>
                </div>
                <div className="rounded-full bg-slate-100 px-3 py-1.5 font-semibold text-slate-700">
                  进入系统
                </div>
              </div>
            </button>
          ))}
        </section>
      </div>
    </div>
  );
}
