import type { ReactNode } from 'react';

import type { PlatformDefinition } from '../registry/platform-registry';
import { PLATFORM_REGISTRY } from '../registry/platform-registry';

type PlatformPlaceholderShellProps = {
  children?: ReactNode;
  currentPath: string;
  platform: PlatformDefinition;
  summary: string;
  title: string;
};

function formatRouteMode(routeMode: PlatformDefinition['routeMode']) {
  switch (routeMode) {
    case 'fixed':
      return 'Fixed routes';
    case 'dynamic':
      return 'Dynamic routes';
    default:
      return 'Fixed + dynamic';
  }
}

function formatLoginMode(loginMode: PlatformDefinition['loginMode']) {
  return loginMode === 'shared' ? 'Shared login' : 'Independent login';
}

function formatStatus(status: PlatformDefinition['status']) {
  return status === 'active' ? 'Active' : 'Planned';
}

export function PlatformPlaceholderShell({
  children,
  currentPath,
  platform,
  summary,
  title,
}: PlatformPlaceholderShellProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.18),transparent_28%),linear-gradient(180deg,#eef5ff_0%,#f8fbff_42%,#f2f6fb_100%)] text-slate-900">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:28px_28px]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 py-8 lg:px-10">
        <header className="cloudy-glass-stage rounded-[32px] px-8 py-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em] text-primary">
                {platform.name}
                <span className="text-slate-400">/</span>
                {formatStatus(platform.status)}
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-950 md:text-4xl">{title}</h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">{summary}</p>
              </div>
            </div>
            <div className="cloudy-glass-panel-soft grid gap-3 rounded-[28px] p-5 text-sm text-slate-600 sm:grid-cols-3">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">Route mode</div>
                <div className="mt-2 font-semibold text-slate-900">{formatRouteMode(platform.routeMode)}</div>
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">Login mode</div>
                <div className="mt-2 font-semibold text-slate-900">{formatLoginMode(platform.loginMode)}</div>
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">Current path</div>
                <div className="mt-2 break-all font-mono text-[12px] text-slate-700">{currentPath}</div>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
          <div className="cloudy-glass-panel rounded-[28px] p-6">{children}</div>
          <aside className="cloudy-glass-panel-soft rounded-[28px] p-6">
            <div className="mb-4 text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">Platform entries</div>
            <div className="space-y-3">
              {PLATFORM_REGISTRY.map((item) => {
                const isCurrent = item.id === platform.id;

                return (
                  <a
                    key={item.id}
                    href={item.basePath}
                    className={`flex items-start justify-between rounded-2xl border px-4 py-4 transition-all ${
                      isCurrent
                        ? 'border-primary/20 bg-primary/10 shadow-[0_16px_32px_-24px_rgba(37,99,235,0.45)]'
                        : 'border-white/70 bg-white/70 hover:border-primary/20 hover:bg-white'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-slate-900">{item.name}</div>
                      <div className="mt-1 text-sm leading-6 text-slate-500">{item.description}</div>
                    </div>
                    <div className="ml-4 rounded-full border border-white/80 bg-white/80 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                      {formatStatus(item.status)}
                    </div>
                  </a>
                );
              })}
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
}
