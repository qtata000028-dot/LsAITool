import type { RuntimeResolvedRoute } from '../../app/contracts/platform-routing';
import type { PlatformDefinition } from '../../app/registry/platform-registry';
import { PlatformPlaceholderShell } from '../../app/shells/platform-placeholder-shell';

type RuntimePlatformAppProps = {
  currentPath: string;
  platform: PlatformDefinition;
  route: RuntimeResolvedRoute;
};

export function RuntimePlatformApp({
  currentPath,
  platform,
  route,
}: RuntimePlatformAppProps) {
  return (
    <PlatformPlaceholderShell
      currentPath={currentPath}
      platform={platform}
      summary="The runtime platform will own dynamic menu resolution, schema-driven pages, and runtime permission parsing. This step keeps the shell, route contracts, and future runtime-engine boundary in place."
      title="Runtime Platform"
    >
      <div className="space-y-6">
        <div className="rounded-[24px] border border-white/70 bg-white/72 p-6 shadow-[0_20px_42px_-30px_rgba(15,23,42,0.3)]">
          <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-primary">Resolved route</div>
          <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">{route.title}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">{route.summary}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-white/70 bg-white/75 p-5">
            <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">Dynamic menu slot</div>
            <p className="mt-3 text-sm leading-7 text-slate-600">Recommended path: `/runtime/app/:subsystemCode/:menuCode`.</p>
          </div>
          <div className="rounded-3xl border border-white/70 bg-white/75 p-5">
            <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">Schema page slot</div>
            <p className="mt-3 text-sm leading-7 text-slate-600">Recommended path: `/runtime/page/:pageId`.</p>
          </div>
          <div className="rounded-3xl border border-white/70 bg-white/75 p-5">
            <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">Permission boundary</div>
            <p className="mt-3 text-sm leading-7 text-slate-600">Navigation, page runtime access, and in-page actions stay split by contract.</p>
          </div>
        </div>
      </div>
    </PlatformPlaceholderShell>
  );
}
