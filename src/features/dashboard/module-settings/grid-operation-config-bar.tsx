import React from 'react';
import { Button, Flex } from 'antd';

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
    <div className="border-t border-[#e6edf5] bg-white px-4 py-3">
      <Flex wrap gap={10} justify="flex-end">
        {GRID_OPERATION_DEFINITIONS.map((action) => {
          const isActive = selectedActionKey === action.key;
          const isEnabled = getGridOperationEnabled(config, action.key);
          const buttonClass = !isEnabled
            ? (
                isActive
                  ? '!border-slate-300 !bg-slate-100 !text-slate-500'
                  : '!border-slate-200 !bg-slate-100 !text-slate-400 hover:!border-slate-300 hover:!text-slate-500'
              )
            : isActive
              ? '!border-[color:var(--workspace-accent-border-strong)] !bg-[color:var(--workspace-accent-tint)] !text-[color:var(--workspace-accent-strong)]'
              : '!border-[#dbe5ef] !bg-white !text-slate-600 hover:!border-[color:var(--workspace-accent-border)] hover:!text-[color:var(--workspace-accent-strong)]';

          return (
            <Button
              key={action.key}
              onClick={() => onSelectAction(action.key)}
              type={isEnabled && isActive ? 'primary' : 'default'}
              className={`!h-9 !rounded-[10px] !px-3 !text-[12px] !font-semibold !shadow-none ${buttonClass}`}
            >
              <span className={`material-symbols-outlined text-[15px] ${isEnabled ? '' : 'opacity-60'}`}>
                {action.icon}
              </span>
              <span>{action.label}</span>
            </Button>
          );
        })}
      </Flex>
    </div>
  );
}
