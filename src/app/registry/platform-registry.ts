export type PlatformId = 'design' | 'runtime' | 'mes';
export type PlatformKind = 'studio' | 'runtime' | 'business';
export type PlatformRouteMode = 'fixed' | 'dynamic' | 'mixed';
export type PlatformLoginMode = 'shared' | 'independent';
export type PlatformStatus = 'active' | 'planned';

export interface PlatformDefinition {
  id: PlatformId;
  name: string;
  description: string;
  kind: PlatformKind;
  basePath: `/${string}`;
  loginPath: `/${string}`;
  routeMode: PlatformRouteMode;
  loginMode: PlatformLoginMode;
  status: PlatformStatus;
}

export const PLATFORM_REGISTRY: readonly PlatformDefinition[] = [
  {
    id: 'design',
    name: 'Design Studio',
    description: 'Hosts the existing design workspace, fixed routes, and interactive studio tools.',
    kind: 'studio',
    basePath: '/design',
    loginPath: '/design/login',
    routeMode: 'fixed',
    loginMode: 'shared',
    status: 'active',
  },
  {
    id: 'runtime',
    name: 'Runtime Platform',
    description: 'Reserves the low-code runtime shell, dynamic routes, and runtime permission parsing.',
    kind: 'runtime',
    basePath: '/runtime',
    loginPath: '/runtime/login',
    routeMode: 'mixed',
    loginMode: 'shared',
    status: 'planned',
  },
  {
    id: 'mes',
    name: 'MES Platform',
    description: 'Reserves an independent business platform shell and dedicated login entry.',
    kind: 'business',
    basePath: '/mes',
    loginPath: '/mes/login',
    routeMode: 'fixed',
    loginMode: 'independent',
    status: 'planned',
  },
] as const;

export function getDefaultPlatform() {
  return PLATFORM_REGISTRY[0];
}

export function getPlatformById(id: PlatformId) {
  return PLATFORM_REGISTRY.find((platform) => platform.id === id) ?? getDefaultPlatform();
}

export function getPlatformByBasePath(pathname: string) {
  return PLATFORM_REGISTRY.find((platform) => pathname === platform.basePath || pathname.startsWith(`${platform.basePath}/`)) ?? null;
}
