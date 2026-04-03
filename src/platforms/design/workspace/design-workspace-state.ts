import type { DesignRouteContext } from '../../../app/contracts/platform-routing';

export type DesignWorkspaceWorkbench = 'modules' | 'research-record' | 'tool-feedback';

export type DesignWorkspaceUrlState = {
  configOpen: boolean;
  configStep: number;
  detailPreview: boolean;
  mode?: string;
  moduleCode?: string;
  theme?: string;
  workbench: DesignWorkspaceWorkbench;
};

export type DesignWorkspaceState = {
  routeContext: DesignRouteContext;
  urlState: DesignWorkspaceUrlState;
};

const DEFAULT_WORKBENCH: DesignWorkspaceWorkbench = 'modules';
const MAX_CONFIG_STEP = 8;

function normalizeStep(value?: string | null) {
  const parsed = Number(value || 1);

  if (!Number.isFinite(parsed)) {
    return 1;
  }

  return Math.min(MAX_CONFIG_STEP, Math.max(1, parsed));
}

function normalizeWorkbench(value?: string | null): DesignWorkspaceWorkbench {
  if (value === 'research-record') {
    return 'research-record';
  }

  if (value === 'tool-feedback') {
    return 'tool-feedback';
  }

  return DEFAULT_WORKBENCH;
}

function normalizeToken(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

export function resolveDesignWorkspaceState(
  routeContext: DesignRouteContext,
  search: string,
): DesignWorkspaceState {
  const searchParams = new URLSearchParams(search);

  return {
    routeContext,
    urlState: {
      configOpen: searchParams.get('config') === '1' || searchParams.has('step'),
      configStep: normalizeStep(searchParams.get('step')),
      detailPreview: searchParams.get('detailPreview') === '1',
      mode: normalizeToken(searchParams.get('mode')),
      moduleCode: normalizeToken(searchParams.get('module')),
      theme: normalizeToken(searchParams.get('theme')),
      workbench: normalizeWorkbench(searchParams.get('workbench')),
    },
  };
}
