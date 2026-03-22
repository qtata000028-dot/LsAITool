export const shadcnPanelShellClass =
  'flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950';

export const shadcnPanelHeaderClass =
  'shrink-0 border-b border-slate-200/80 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-950';

export const shadcnPanelTitleClass =
  'text-sm font-semibold leading-6 text-slate-900 break-words dark:text-slate-50';

export const shadcnPanelBadgeClass =
  'inline-flex items-center rounded-md border border-slate-200/80 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300';

export const shadcnPanelIconShellClass =
  'flex size-9 shrink-0 items-center justify-center rounded-md border border-slate-200/80 bg-white text-[color:var(--workspace-accent)] dark:border-slate-800 dark:bg-slate-950';

export const shadcnInfoCardClass =
  'rounded-lg border border-slate-200/80 bg-slate-50/80 px-3 py-3 dark:border-slate-800 dark:bg-slate-900/60';

export const shadcnSectionCardClass =
  'rounded-lg border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950';

export const shadcnSectionTitleClass =
  'mb-3 flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-100';

export const shadcnMutedLabelClass =
  'mb-1.5 block text-[11px] font-medium text-slate-500 dark:text-slate-400';

export const shadcnFieldClass =
  'flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm transition-[border-color,box-shadow,color] placeholder:text-slate-400 focus-visible:border-[color:var(--workspace-accent-border-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--workspace-accent-soft)] disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50 dark:placeholder:text-slate-500';

export const shadcnTextareaClass =
  'flex min-h-[96px] w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm leading-6 text-slate-700 shadow-sm transition-[border-color,box-shadow,color] placeholder:text-slate-400 focus-visible:border-[color:var(--workspace-accent-border-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--workspace-accent-soft)] disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50 dark:placeholder:text-slate-500';

export const shadcnTabListClass =
  'mt-3 inline-flex w-full items-center gap-1 rounded-lg border border-slate-200/80 bg-slate-100/90 p-1 dark:border-slate-800 dark:bg-slate-900';

export const getShadcnTabTriggerClass = (active: boolean) =>
  active
    ? 'relative flex min-w-0 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-white px-3 py-2 text-[12px] font-semibold text-slate-900 shadow-sm dark:bg-slate-950 dark:text-slate-50'
    : 'relative flex min-w-0 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-[12px] font-medium text-slate-500 transition-colors hover:bg-white hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-950 dark:hover:text-slate-100';
