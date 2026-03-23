export const shadcnPanelShellClass =
  'flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950';

export const shadcnPanelHeaderClass =
  'shrink-0 border-b border-slate-200/80 bg-slate-50/70 px-3.5 py-2.5 dark:border-slate-800 dark:bg-slate-950';

export const shadcnPanelTitleClass =
  'text-sm font-semibold leading-6 text-slate-900 break-words dark:text-slate-50';

export const shadcnPanelBadgeClass =
  'inline-flex items-center rounded-md border border-slate-200/80 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300';

export const shadcnPanelIconShellClass =
  'flex size-8 shrink-0 items-center justify-center rounded-md border border-slate-200/80 bg-white text-[color:var(--workspace-accent)] dark:border-slate-800 dark:bg-slate-950';

export const shadcnInfoCardClass =
  'rounded-md border border-slate-200/70 bg-slate-50/70 px-2.5 py-2 dark:border-slate-800 dark:bg-slate-900/55';

export const shadcnSectionCardClass =
  'rounded-md border border-slate-200/80 bg-white px-3 py-3 dark:border-slate-800 dark:bg-slate-950';

export const shadcnSectionTitleClass =
  'mb-2.5 flex items-center gap-1.5 text-[12px] font-semibold text-slate-700 dark:text-slate-100';

export const shadcnMutedLabelClass =
  'mb-1 block text-[10px] font-medium text-slate-500 dark:text-slate-400';

export const shadcnFieldClass =
  'flex h-8 w-full rounded-md border border-slate-200 bg-white px-2.5 text-[13px] text-slate-700 transition-[border-color,box-shadow,color] placeholder:text-slate-400 focus-visible:border-[color:var(--workspace-accent-border-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--workspace-accent-soft)] disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50 dark:placeholder:text-slate-500';

export const shadcnTextareaClass =
  'flex min-h-[80px] w-full rounded-md border border-slate-200 bg-white px-2.5 py-2 text-[13px] leading-5 text-slate-700 transition-[border-color,box-shadow,color] placeholder:text-slate-400 focus-visible:border-[color:var(--workspace-accent-border-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--workspace-accent-soft)] disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50 dark:placeholder:text-slate-500';

export const shadcnTabListClass =
  'mt-2.5 inline-flex w-full items-center gap-1 rounded-md border border-slate-200/80 bg-slate-100/90 p-0.5 dark:border-slate-800 dark:bg-slate-900';

export const getShadcnTabTriggerClass = (active: boolean) =>
  active
    ? 'relative flex min-w-0 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-[7px] border border-slate-200/80 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50'
    : 'relative flex min-w-0 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-[7px] px-2.5 py-1.5 text-[11px] font-medium text-slate-500 transition-colors hover:bg-white hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-950 dark:hover:text-slate-100';
