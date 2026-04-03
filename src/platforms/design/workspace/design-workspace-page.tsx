import type { DesignFixedRoute } from '../../../app/contracts/platform-routing';
import type { PlatformDefinition } from '../../../app/registry/platform-registry';
import { DesignFixedRouteShell } from '../design-fixed-route-shell';
import { getDesignRouteMeta } from '../design-route-meta';
import { DesignWorkspaceContainer } from './design-workspace-container';
import { resolveDesignWorkspaceState } from './design-workspace-state';

type DesignWorkspacePageProps = {
  currentPath: string;
  currentUserName: string;
  onLogout: () => void;
  platform: PlatformDefinition;
  route: DesignFixedRoute;
};

export function DesignWorkspacePage({
  currentPath,
  currentUserName,
  onLogout,
  platform,
  route,
}: DesignWorkspacePageProps) {
  const routeMeta = getDesignRouteMeta('workspace');
  const workspaceState = resolveDesignWorkspaceState(
    route.context,
    typeof window === 'undefined' ? '' : window.location.search,
  );

  if (!routeMeta) {
    return null;
  }

  return (
    <DesignFixedRouteShell
      currentPath={currentPath}
      currentRouteKey="workspace"
      eyebrow="遗留工作台"
      platform={platform}
      routeMeta={routeMeta}
    >
      <DesignWorkspaceContainer
        currentUserName={currentUserName}
        onLogout={onLogout}
        state={workspaceState}
      />
    </DesignFixedRouteShell>
  );
}
