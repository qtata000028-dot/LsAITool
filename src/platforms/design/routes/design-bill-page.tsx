import type { PlatformDefinition } from '../../../app/registry/platform-registry';
import { DesignFixedRouteShell } from '../design-fixed-route-shell';
import { getDesignRouteMeta } from '../design-route-meta';

type DesignBillPageProps = {
  currentPath: string;
  platform: PlatformDefinition;
};

const BILL_SOURCES = [
  'src/features/dashboard/module-settings/bill-document-workbench.tsx',
  'src/features/dashboard/module-settings/dashboard-bill-document-workbench-bridge.tsx',
  'src/features/dashboard/module-settings/detail-board-layout-manager.tsx',
  'src/features/dashboard/module-settings/document-workspace-panels.tsx',
] as const;

export function DesignBillPage({
  currentPath,
  platform,
}: DesignBillPageProps) {
  const routeMeta = getDesignRouteMeta('bill');

  if (!routeMeta) {
    return null;
  }

  return (
    <DesignFixedRouteShell
      currentPath={currentPath}
      currentRouteKey="bill"
      eyebrow="Bill design route"
      platform={platform}
      routeMeta={routeMeta}
    >
      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-[24px] border border-white/70 bg-white/78 p-6">
          <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">Primary capability</div>
          <h3 className="mt-3 text-xl font-black tracking-tight text-slate-950">Bill layout and document composition</h3>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            This route is reserved for bill-header workbench, detail-board layout, document preview, and publishing
            flows. It gives bill design its own platform page instead of remaining just another interaction mode inside
            the dashboard.
          </p>
        </section>

        <section className="rounded-[24px] border border-white/70 bg-white/78 p-6">
          <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">Candidate source files</div>
          <div className="mt-4 space-y-3">
            {BILL_SOURCES.map((item) => (
              <div key={item} className="rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 font-mono text-[12px] text-slate-600">
                {item}
              </div>
            ))}
          </div>
        </section>
      </div>
    </DesignFixedRouteShell>
  );
}
