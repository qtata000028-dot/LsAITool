import React from 'react';
import {
  shadcnFieldClass,
  shadcnMutedLabelClass,
  shadcnTextareaClass,
} from '../../../components/ui/shadcn-inspector';

type ColorRule = {
  backgroundColor?: string;
  disabled?: boolean;
  field?: string;
  id: string;
  label?: string;
  note?: string;
  operator?: string;
  textColor?: string;
  value?: string;
};

type ColorRuleFieldOption = {
  label: string;
  value: string;
};

type ColorRuleManagerProps = {
  colorRules: ColorRule[];
  enabledColorRuleCount: number;
  fieldOptions: ColorRuleFieldOption[];
  onAddRule: () => void;
  onDeleteRule: (ruleId: string) => void;
  onSelectRule: (ruleId: string) => void;
  onToggleRuleDisabled: (ruleId: string, disabled: boolean) => void;
  onUpdateRule: (ruleId: string, patch: Record<string, any>) => void;
  operatorOptions: string[];
  selectedRule: ColorRule | null;
};

const managerSectionClass = 'rounded-md border border-slate-200/80 bg-white px-3 py-3 dark:border-slate-800 dark:bg-slate-950';
const managerHeaderClass = 'mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-2.5 dark:border-slate-800';
const managerTitleWrapClass = 'flex min-w-0 items-center gap-3';
const managerTitleIconClass = 'inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-[color:var(--workspace-accent-border)] bg-[color:var(--workspace-accent-soft)] text-[color:var(--workspace-accent-strong)]';
const managerActionButtonClass = 'inline-flex h-9 items-center gap-1 rounded-md border border-[color:var(--workspace-accent)] bg-[color:var(--workspace-accent)] px-3.5 text-[12px] font-semibold text-white shadow-sm transition-colors hover:bg-[color:var(--workspace-accent-strong)]';
const managerListSurfaceClass = 'space-y-2 rounded-md border border-slate-200/80 bg-slate-50/70 p-2 dark:border-slate-800 dark:bg-slate-900/60';
const managerDetailNameClass = 'inline-flex max-w-full items-center rounded-md border border-slate-200/80 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300';
const managerHeaderToolsClass = 'ml-auto flex flex-wrap items-center justify-end gap-2';
const managerMetricCardClass = 'min-w-[58px] rounded-md border border-slate-200/80 bg-slate-50 px-2.5 py-1.5 text-right dark:border-slate-800 dark:bg-slate-900';

export const ColorRuleManager = React.memo(function ColorRuleManager({
  colorRules,
  enabledColorRuleCount,
  fieldOptions,
  onAddRule,
  onDeleteRule,
  onSelectRule,
  onToggleRuleDisabled,
  onUpdateRule,
  operatorOptions,
  selectedRule,
}: ColorRuleManagerProps) {
  return (
    <div className="space-y-4">
      <section className={managerSectionClass}>
        <div className={managerHeaderClass}>
          <div className={managerTitleWrapClass}>
            <span className={managerTitleIconClass}>
              <span className="material-symbols-outlined text-[18px]">format_paint</span>
            </span>
            <div>
              <h4 className="text-[14px] font-bold text-slate-800 dark:text-slate-100">规则列表</h4>
            </div>
          </div>
          <div className={managerHeaderToolsClass}>
            <div className={managerMetricCardClass}>
              <div className="text-[10px] font-bold tracking-[0.08em] text-slate-400">总数</div>
              <div className="mt-1 text-[15px] font-black text-slate-800 dark:text-slate-100">{colorRules.length}</div>
            </div>
            <div className={managerMetricCardClass}>
              <div className="text-[10px] font-bold tracking-[0.08em] text-slate-400">生效</div>
              <div className="mt-1 text-[15px] font-black text-[color:var(--workspace-accent-strong)]">{enabledColorRuleCount}</div>
            </div>
            <div className={managerMetricCardClass}>
              <div className="text-[10px] font-bold tracking-[0.08em] text-slate-400">停用</div>
              <div className="mt-1 text-[15px] font-black text-amber-500">{Math.max(0, colorRules.length - enabledColorRuleCount)}</div>
            </div>
            <button
              type="button"
              onClick={onAddRule}
              className={managerActionButtonClass}
            >
              <span className="material-symbols-outlined text-[14px]">add</span>
              新增规则
            </button>
          </div>
        </div>
        <div className={managerListSurfaceClass}>
          {colorRules.length > 0 ? colorRules.map((rule, index) => (
            <div
              key={rule.id}
              className={`flex items-center gap-3 rounded-[18px] border px-3.5 py-2.5 transition-all ${
                selectedRule?.id === rule.id
                  ? 'border-[color:var(--workspace-accent-border-strong)] bg-[color:var(--workspace-accent-surface)] shadow-[0_18px_30px_-24px_var(--workspace-accent-shadow)]'
                  : 'border-slate-200/75 bg-white/92 hover:border-[color:var(--workspace-accent-border)] dark:border-slate-700 dark:bg-slate-900/55'
              }`}
            >
              <button
                type="button"
                onClick={() => onSelectRule(rule.id)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                <div
                  className="flex size-10 shrink-0 items-center justify-center rounded-[16px] border"
                  style={{ color: rule.textColor || '#9f1239', backgroundColor: rule.backgroundColor || '#ffe4e6', borderColor: rule.backgroundColor || '#ffe4e6' }}
                >
                  <span className="material-symbols-outlined text-[16px]">palette</span>
                </div>
                <div className="min-w-0 flex-1 truncate text-[13px] font-bold text-slate-700 dark:text-slate-100">
                  {rule.label || `规则 ${index + 1}`}
                </div>
              </button>
              <label
                className="inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-200/80 bg-white/90 px-3 py-1.5 text-[11px] font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-900/72 dark:text-slate-300"
                onMouseDown={(event) => event.stopPropagation()}
                onClick={(event) => event.stopPropagation()}
              >
                <span>禁用</span>
                <input
                  type="checkbox"
                  checked={Boolean(rule.disabled)}
                  onMouseDown={(event) => event.stopPropagation()}
                  onClick={(event) => event.stopPropagation()}
                  onChange={(event) => onToggleRuleDisabled(rule.id, event.target.checked)}
                  className="h-4 w-4 rounded accent-[color:var(--workspace-accent)]"
                />
              </label>
              <button
                type="button"
                onClick={() => onDeleteRule(rule.id)}
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-xl text-rose-500 transition-colors hover:bg-rose-50 dark:hover:bg-rose-500/10"
                title="删除规则"
              >
                <span className="material-symbols-outlined text-[16px]">delete</span>
              </button>
            </div>
          )) : (
            <div className="rounded-[22px] border border-dashed border-slate-200/80 px-4 py-8 text-center text-[12px] text-slate-400 dark:border-slate-700">
              还没有颜色规则
            </div>
          )}
        </div>
      </section>

      <section className={managerSectionClass}>
        <div className={managerHeaderClass}>
          <div className={managerTitleWrapClass}>
            <span className={managerTitleIconClass}>
              <span className="material-symbols-outlined text-[18px]">edit_note</span>
            </span>
            <div>
              <h4 className="text-[14px] font-bold text-slate-800 dark:text-slate-100">规则详情</h4>
            </div>
          </div>
          {selectedRule ? (
            <span className={`${managerDetailNameClass} truncate`}>
              {selectedRule.label || '未命名规则'}
            </span>
          ) : null}
        </div>
        {selectedRule ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={shadcnMutedLabelClass}>规则名称</label>
              <input
                type="text"
                value={selectedRule.label ?? ''}
                onChange={(event) => onUpdateRule(selectedRule.id, { label: event.target.value })}
                placeholder="输入规则名称"
                className={shadcnFieldClass}
              />
            </div>
            <div>
              <label className={shadcnMutedLabelClass}>匹配字段</label>
              <select
                value={selectedRule.field ?? ''}
                onChange={(event) => onUpdateRule(selectedRule.id, { field: event.target.value })}
                className={shadcnFieldClass}
              >
                <option value="">请选择字段</option>
                {fieldOptions.map((option) => (
                  <option key={`rule-field-${selectedRule.id}-${option.value}`} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={shadcnMutedLabelClass}>匹配方式</label>
              <select
                value={selectedRule.operator ?? '等于'}
                onChange={(event) => onUpdateRule(selectedRule.id, { operator: event.target.value })}
                className={shadcnFieldClass}
              >
                {operatorOptions.map((operator) => (
                  <option key={operator} value={operator}>{operator}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={shadcnMutedLabelClass}>匹配值</label>
              <input
                type="text"
                value={selectedRule.value ?? ''}
                onChange={(event) => onUpdateRule(selectedRule.id, { value: event.target.value })}
                placeholder="输入匹配值"
                className={shadcnFieldClass}
              />
            </div>
            <div>
              <label className={shadcnMutedLabelClass}>字体颜色</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={/^#[0-9a-fA-F]{6}$/.test(selectedRule.textColor || '') ? selectedRule.textColor! : '#9f1239'}
                  onChange={(event) => onUpdateRule(selectedRule.id, { textColor: event.target.value })}
                  className="h-10 w-14 rounded-[14px] border border-slate-200 bg-white px-1 dark:border-slate-700 dark:bg-slate-900"
                />
                <input
                  type="text"
                  value={selectedRule.textColor ?? '#9f1239'}
                  onChange={(event) => onUpdateRule(selectedRule.id, { textColor: event.target.value })}
                  className={`${shadcnFieldClass} font-mono text-[12px]`}
                />
              </div>
            </div>
            <div>
              <label className={shadcnMutedLabelClass}>背景颜色</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={/^#[0-9a-fA-F]{6}$/.test(selectedRule.backgroundColor || '') ? selectedRule.backgroundColor! : '#ffe4e6'}
                  onChange={(event) => onUpdateRule(selectedRule.id, { backgroundColor: event.target.value })}
                  className="h-10 w-14 rounded-[14px] border border-slate-200 bg-white px-1 dark:border-slate-700 dark:bg-slate-900"
                />
                <input
                  type="text"
                  value={selectedRule.backgroundColor ?? '#ffe4e6'}
                  onChange={(event) => onUpdateRule(selectedRule.id, { backgroundColor: event.target.value })}
                  className={`${shadcnFieldClass} font-mono text-[12px]`}
                />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className={shadcnMutedLabelClass}>规则说明</label>
              <textarea
                rows={4}
                value={selectedRule.note ?? ''}
                onChange={(event) => onUpdateRule(selectedRule.id, { note: event.target.value })}
                placeholder="填写规则说明"
                className={shadcnTextareaClass}
              />
            </div>
          </div>
        ) : (
          <div className="rounded-[16px] border border-dashed border-slate-200/80 px-4 py-8 text-center text-[12px] text-slate-400 dark:border-slate-800">
            请选择颜色规则
          </div>
        )}
      </section>
    </div>
  );
});
