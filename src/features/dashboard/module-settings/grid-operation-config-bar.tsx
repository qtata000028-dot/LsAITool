import React from 'react';

import {
  GRID_OPERATION_DEFINITIONS,
  getGridOperationEnabled,
  type GridOperationActionKey,
} from './grid-operation-config';

type GridOperationConfigBarProps = {
  config: Record<string, any> | null | undefined;
  onSelectAction: (actionKey: GridOperationActionKey) => void;
  selectedActionKey?: GridOperationActionKey | null;
};

export function GridOperationConfigBar({
  config,
  onSelectAction,
  selectedActionKey,
}: GridOperationConfigBarProps) {
  return (
    <div className="border-t border-[#e6edf5] bg-[linear-gradient(180deg,#fbfdff_0%,#f5f8fc_100%)] px-4 py-2.5">
      <div className="flex flex-wrap items-center justify-end gap-2.5">
        {GRID_OPERATION_DEFINITIONS.map((action) => {
          const isActive = selectedActionKey === action.key;
          const isEnabled = getGridOperationEnabled(config, action.key);
          const buttonClass = !isEnabled
            ? (
                isActive
                  ? 'border-slate-300 bg-slate-100 text-slate-500 shadow-[0_14px_24px_-24px_rgba(148,163,184,0.58)]'
                  : 'border-slate-200 bg-slate-100 text-slate-400 hover:border-slate-300 hover:text-slate-500'
              )
            : isActive
              ? 'border-[color:var(--workspace-accent-border-strong)] bg-[color:var(--workspace-accent-tint)] text-[color:var(--workspace-accent-strong)] shadow-[0_16px_28px_-24px_var(--workspace-accent-shadow)]'
              : 'border-[#dbe5ef] bg-white text-slate-600 hover:border-[color:var(--workspace-accent-border)] hover:text-[color:var(--workspace-accent-strong)]';

          return (
            <button
              key={action.key}
              type="button"
              onClick={() => onSelectAction(action.key)}
              className={`inline-flex min-h-9 items-center gap-1.5 rounded-[12px] border px-3 py-1.5 text-[12px] font-semibold transition-all ${buttonClass}`}
            >
              <span className={`material-symbols-outlined text-[15px] ${isEnabled ? '' : 'opacity-60'}`}>
                {action.icon}
              </span>
              <span>{action.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
