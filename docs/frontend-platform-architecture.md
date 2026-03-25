# Frontend Platform Architecture

## Goal

This repository is no longer treated as a single admin SPA. It is the starting point for a platform workspace that can host:

- `Design Studio`: fixed pages, heavy interaction, existing dashboard/workbench.
- `Runtime Platform`: dynamic menus, schema-driven pages, runtime permissions.
- `Business Platforms`: standalone entries such as MES, later WMS/CRM/others.

The target is: shared infrastructure, separate platform shells.

## Current Implementation Baseline

The codebase now contains:

- an app-level router entry
- a platform registry
- dedicated platform shells for `design`, `runtime`, and `mes`
- dedicated fixed-route pages for `design/module`, `design/bill`, and `design/settings`
- login entry paths per platform
- a reserved path contract for runtime dynamic pages
- platform-level lazy loading so runtime and business shells do not inflate the initial bundle

The existing `Dashboard` is still the live implementation behind the design studio workspace route.

## Platform Model

Each platform is registered before it is routed.

```ts
type PlatformDefinition = {
  id: 'design' | 'runtime' | 'mes' | string;
  name: string;
  kind: 'studio' | 'runtime' | 'business';
  basePath: `/${string}`;
  loginPath: `/${string}`;
  routeMode: 'fixed' | 'dynamic' | 'mixed';
  loginMode: 'shared' | 'independent';
  status: 'active' | 'planned';
};
```

This keeps `App.tsx` from turning into a long list of platform-specific conditions.

## Route Contract

### Fixed routes

Fixed routes are owned by studio or business platforms.

Current design studio fixed routes:

- `/design`
- `/design/workspace`
- `/design/module`
- `/design/bill`
- `/design/settings`

Current MES reserved root:

- `/mes`

### Dynamic routes

Dynamic routes are reserved for the runtime platform.

- `/runtime`
- `/runtime/app/:subsystemCode/:menuCode`
- `/runtime/page/:pageId`

Legacy alias support can remain temporarily under `/app/...`, but runtime ownership stays under the runtime platform boundary.

### Login routes

- `/login`
- `/design/login`
- `/runtime/login`
- `/mes/login`

The auth core can stay shared even when individual platforms later get custom login experiences.

## Menu And Permission Contract

The router alone is not the permission model. The runtime platform must resolve permissions at three layers:

1. Navigation permission
2. Runtime page access
3. In-page action/data/field permission

Recommended shared menu contract:

```ts
type PlatformMenuDescriptor = {
  platformId: PlatformId;
  menuCode: string;
  title: string;
  routeType: 'fixed' | 'dynamic' | 'external';
  pageType: 'designer' | 'fixed-page' | 'runtime-page' | 'report' | 'iframe';
  permissionMode: 'page' | 'runtime';
  path: string;
  schemaId?: string;
  componentKey?: string;
};
```

This allows fixed design pages, dynamic runtime pages, and future business platform menus to share one contract shape.

## Directory Strategy

Current stage:

```text
src/
  app/
    contracts/
    registry/
    router/
    shells/
  platforms/
    design/
    runtime/
    mes/
  features/
    dashboard/
  components/
  lib/
```

Later, when a second platform starts real delivery, the repo can be promoted into a workspace:

```text
apps/
  design-studio/
  runtime-platform/
  mes-web/
packages/
  shared-auth/
  shared-http/
  shared-ui/
  shared-types/
  design-engine/
  runtime-engine/
```

## Current Delivery Rule

1. Keep the existing design studio alive.
2. Land platform-level contracts before more feature-level refactors.
3. Treat runtime as a shell and protocol boundary first, not as a fully built business app.
4. Register new platforms before adding entry code.
5. Split bundles at the platform boundary so future entries can stay isolated by default.

## Next Refactor Steps

1. Move more design-studio responsibilities behind `/design/module` and `/design/bill`.
2. Introduce shared route/menu/permission adapters from backend payloads.
3. Add runtime menu resolution and schema loader boundaries.
4. Promote shared auth/http/ui/types into package-ready modules once the second platform starts active development.
