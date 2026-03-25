import type { ReactNode } from 'react';

import type { DesignRouteKey } from '../../app/contracts/platform-routing';
import type { PlatformDefinition } from '../../app/registry/platform-registry';
import { PlatformPlaceholderShell } from '../../app/shells/platform-placeholder-shell';
import {
  DESIGN_FIXED_ROUTE_META,
  type DesignRouteMeta,
} from './design-route-meta';

type DesignFixedRouteShellProps = {
  children?: ReactNode;
  currentPath: string;
  currentRouteKey: DesignRouteKey;
  eyebrow?: string;
  platform: PlatformDefinition;
  routeMeta: DesignRouteMeta;
};

export function DesignFixedRouteShell({
  children,
  currentPath,
  currentRouteKey,
  eyebrow = 'Design studio route',
  platform,
  routeMeta,
}: DesignFixedRouteShellProps) {
  return (
    <PlatformPlaceholderShell
      currentPath={currentPath}
      platform={platform}
      summary={routeMeta.summary}
      title={`${platform.name} / ${routeMeta.title}`}
    >
      <div className="space-y-6">
        <div className="rounded-[24px] border border-white/70 bg-white/72 p-6 shadow-[0_20px_42px_-30px_rgba(15,23,42,0.3)]">
          <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-primary">{eyebrow}</div>
          <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">{routeMeta.title}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            The design platform now has explicit fixed routes so we can pull module, bill, and studio-level workflows
            out of the legacy dashboard without reworking app-level architecture again.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {DESIGN_FIXED_ROUTE_META.map((item) => {
            const isCurrent = item.key === currentRouteKey;

            return (
              <a
                key={item.key}
                href={item.href}
                className={`rounded-3xl border px-5 py-5 transition-all ${
                  isCurrent
                    ? 'border-primary/20 bg-primary/10 shadow-[0_18px_40px_-30px_rgba(37,99,235,0.45)]'
                    : 'border-white/70 bg-white/75 hover:border-primary/20 hover:bg-white'
                }`}
              >
                <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">{item.key}</div>
                <div className="mt-3 text-lg font-semibold text-slate-900">{item.title}</div>
                <p className="mt-3 text-sm leading-7 text-slate-600">{item.summary}</p>
              </a>
            );
          })}
        </div>

        <div className="rounded-[24px] border border-white/70 bg-white/80 p-6">
          <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">Migration targets</div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {routeMeta.migrationTargets.map((item) => (
              <div key={item} className="rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-4 text-sm leading-7 text-slate-600">
                {item}
              </div>
            ))}
          </div>
        </div>

        {children}
      </div>
    </PlatformPlaceholderShell>
  );
}
