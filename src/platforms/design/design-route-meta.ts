import type { DesignRouteKey } from '../../app/contracts/platform-routing';

export type DesignRouteMeta = {
  href: string;
  key: DesignRouteKey;
  migrationTargets: string[];
  summary: string;
  title: string;
};

export const DESIGN_FIXED_ROUTE_META: readonly DesignRouteMeta[] = [
  {
    href: '/design/workspace',
    key: 'workspace',
    migrationTargets: [
      'Keep the existing dashboard online as the active production workbench.',
      'Continue reducing orchestration logic inside Dashboard.tsx.',
      'Use this route as the compatibility entry while feature pages are carved out.',
    ],
    summary: 'Current production entry that keeps the existing dashboard and design workbench online.',
    title: 'Workspace',
  },
  {
    href: '/design/module',
    key: 'module',
    migrationTargets: [
      'Move module overview, module settings, and condition workbench flows here.',
      'Promote dashboard/module-settings building blocks into dedicated design pages.',
      'Use this route as the landing page for table, tree, and single-table module design.',
    ],
    summary: 'Reserved fixed route for module design flows, schema governance, and future split views.',
    title: 'Module Designer',
  },
  {
    href: '/design/bill',
    key: 'bill',
    migrationTargets: [
      'Move bill document layout, bill header workbench, and detail-board editing here.',
      'Treat bill design as its own product surface instead of a dashboard mode.',
      'Keep room for bill-specific publish, preview, and validation workflows.',
    ],
    summary: 'Reserved fixed route for bill composition, page assembly, and document design.',
    title: 'Bill Designer',
  },
  {
    href: '/design/settings',
    key: 'settings',
    migrationTargets: [
      'Collect studio-level publish rules, governance toggles, and naming conventions.',
      'Keep shared settings outside of module and bill workbenches.',
      'Prepare a stable home for future platform-level preferences and release policies.',
    ],
    summary: 'Reserved fixed route for studio settings, release policies, and platform-level governance.',
    title: 'Studio Settings',
  },
] as const;

export function getDesignRouteMeta(routeKey: DesignRouteKey) {
  return DESIGN_FIXED_ROUTE_META.find((item) => item.key === routeKey);
}
