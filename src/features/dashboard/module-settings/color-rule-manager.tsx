import React from 'react';
import {
  shadcnFieldClass,
  shadcnMutedLabelClass,
  shadcnTextareaClass,
} from '../../../components/ui/shadcn-inspector';

type ColorRule = {
  backcolor?: string;
  backgroundColor?: string;
  condition?: string;
  dbcolor?: string;
  dfcolor?: string;
  disabled?: boolean;
  fontsize?: number;
  forcecolor?: string;
  id: string;
  ifBold?: number | boolean;
  ifItalic?: number | boolean;
  ifStrickOut?: number | boolean;
  ifUnderLine?: number | boolean;
  label?: string;
  note?: string;
  orderid?: number;
  tab?: string;
  textColor?: string;
  useflag?: number;
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

function resolveBooleanFlag(value: unknown, fallback = false) {
  if (value === true || value === 1 || value === '1') {
    return true;
  }

  if (value === false || value === 0 || value === '0') {
    return false;
  }

  return fallback;
}

function resolveColorValue(value: string | undefined, fallback: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value || '') ? value! : fallback;
}

export const ColorRuleManager = React.memo(function ColorRuleManager({
  colorRules,
  enabledColorRuleCount,
  onAddRule,
  onDeleteRule,
  onSelectRule,
  onToggleRuleDisabled,
  onUpdateRule,
  selectedRule,
}: ColorRuleManagerProps) {
  const selectedRuleUseFlag = resolveBooleanFlag(selectedRule?.useflag, !(selectedRule?.disabled ?? false));
  const selectedRuleForceColor = resolveColorValue(selectedRule?.forcecolor || selectedRule?.textColor, '#9f1239');
  const selectedRuleBackColor = resolveColorValue(selectedRule?.backcolor || selectedRule?.backgroundColor, '#ffe4e6');
  const selectedRuleDfColor = selectedRule?.dfcolor || selectedRuleForceColor;
  const selectedRuleDbColor = selectedRule?.dbcolor || selectedRuleBackColor;
  const selectedRuleFontSize = Math.max(8, Number(selectedRule?.fontsize) || 12);

  return (
    <div className="space-y-4">
      <section className={managerSectionClass}>
        <div className={managerHeaderClass}>
          <div className={managerTitleWrapClass}>
            <span className={managerTitleIconClass}>
              <span className="material-symbols-outlined text-[18px]">format_paint</span>
            </span>
            <div>
              <h4 className="text-[14px] font-bold text-slate-800 dark:text-slate-100">颜色规则列表</h4>
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
          {colorRules.length > 0 ? colorRules.map((rule, index) => {
            const previewTextColor = rule.forcecolor || rule.textColor || '#9f1239';
            const previewBackgroundColor = rule.backcolor || rule.backgroundColor || '#ffe4e6';
            const enabled = resolveBooleanFlag(rule.useflag, !(rule.disabled ?? false));
            return (
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
                    style={{ color: previewTextColor, backgroundColor: previewBackgroundColor, borderColor: previewBackgroundColor }}
                  >
                    <span className="material-symbols-outlined text-[16px]">palette</span>
                  </div>
                  <div className="min-w-0 flex-1 truncate text-[13px] font-bold text-slate-700 dark:text-slate-100">
                    {rule.condition || rule.label || `颜色规则 ${index + 1}`}
                  </div>
                </button>
                <label
                  className="inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-200/80 bg-white/90 px-3 py-1.5 text-[11px] font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-900/72 dark:text-slate-300"
                  onMouseDown={(event) => event.stopPropagation()}
                  onClick={(event) => event.stopPropagation()}
                >
                  <span>停用</span>
                  <input
                    type="checkbox"
                    checked={!enabled}
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
            );
          }) : (
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
              {selectedRule.condition || selectedRule.label || '未命名规则'}
            </span>
          ) : null}
        </div>
        {selectedRule ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={shadcnMutedLabelClass}>ID</label>
              <input
                type="text"
                value={String(selectedRule.id ?? '')}
                readOnly
                className={shadcnFieldClass}
              />
            </div>
            <div>
              <label className={shadcnMutedLabelClass}>所属模块编码</label>
              <input
                type="text"
                value={selectedRule.tab ?? ''}
                readOnly
                className={shadcnFieldClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={shadcnMutedLabelClass}>条件</label>
              <textarea
                rows={3}
                value={selectedRule.condition ?? ''}
                onChange={(event) => onUpdateRule(selectedRule.id, {
                  condition: event.target.value,
                  label: event.target.value,
                  note: event.target.value,
                })}
                placeholder="输入 condition"
                className={shadcnTextareaClass}
              />
            </div>
            <div>
              <label className={shadcnMutedLabelClass}>顺序</label>
              <input
                type="number"
                min={1}
                value={String(selectedRule.orderid ?? 1)}
                onChange={(event) => onUpdateRule(selectedRule.id, { orderid: Math.max(1, Number(event.target.value) || 1) })}
                className={shadcnFieldClass}
              />
            </div>
            <div>
              <label className={shadcnMutedLabelClass}>启用状态</label>
              <label className={`${shadcnFieldClass} flex items-center justify-between gap-3`}>
                <span className="text-[12px] font-semibold text-slate-600 dark:text-slate-200">
                  {selectedRuleUseFlag ? '已启用' : '已停用'}
                </span>
                <input
                  type="checkbox"
                  checked={selectedRuleUseFlag}
                  onChange={(event) => onUpdateRule(selectedRule.id, {
                    useflag: event.target.checked ? 1 : 0,
                    disabled: !event.target.checked,
                  })}
                  className="h-4 w-4 rounded accent-[color:var(--workspace-accent)]"
                />
              </label>
            </div>
            <div>
              <label className={shadcnMutedLabelClass}>字体颜色</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={selectedRuleForceColor}
                  onChange={(event) => onUpdateRule(selectedRule.id, {
                    forcecolor: event.target.value,
                    textColor: event.target.value,
                  })}
                  className="h-10 w-14 rounded-[14px] border border-slate-200 bg-white px-1 dark:border-slate-700 dark:bg-slate-900"
                />
                <input
                  type="text"
                  value={selectedRule.forcecolor ?? selectedRuleForceColor}
                  onChange={(event) => onUpdateRule(selectedRule.id, {
                    forcecolor: event.target.value,
                    textColor: event.target.value,
                  })}
                  className={`${shadcnFieldClass} font-mono text-[12px]`}
                />
              </div>
            </div>
            <div>
              <label className={shadcnMutedLabelClass}>背景颜色</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={selectedRuleBackColor}
                  onChange={(event) => onUpdateRule(selectedRule.id, {
                    backcolor: event.target.value,
                    backgroundColor: event.target.value,
                  })}
                  className="h-10 w-14 rounded-[14px] border border-slate-200 bg-white px-1 dark:border-slate-700 dark:bg-slate-900"
                />
                <input
                  type="text"
                  value={selectedRule.backcolor ?? selectedRuleBackColor}
                  onChange={(event) => onUpdateRule(selectedRule.id, {
                    backcolor: event.target.value,
                    backgroundColor: event.target.value,
                  })}
                  className={`${shadcnFieldClass} font-mono text-[12px]`}
                />
              </div>
            </div>
            <div>
              <label className={shadcnMutedLabelClass}>兼容 Delphi 字体颜色</label>
              <input
                type="text"
                value={selectedRuleDfColor}
                onChange={(event) => onUpdateRule(selectedRule.id, { dfcolor: event.target.value })}
                className={`${shadcnFieldClass} font-mono text-[12px]`}
              />
            </div>
            <div>
              <label className={shadcnMutedLabelClass}>兼容 Delphi 背景色</label>
              <input
                type="text"
                value={selectedRuleDbColor}
                onChange={(event) => onUpdateRule(selectedRule.id, { dbcolor: event.target.value })}
                className={`${shadcnFieldClass} font-mono text-[12px]`}
              />
            </div>
            <div>
              <label className={shadcnMutedLabelClass}>字号</label>
              <input
                type="number"
                min={8}
                max={72}
                value={String(selectedRuleFontSize)}
                onChange={(event) => onUpdateRule(selectedRule.id, { fontsize: Math.max(8, Number(event.target.value) || 12) })}
                className={shadcnFieldClass}
              />
            </div>
            <div>
              <label className={shadcnMutedLabelClass}>样式标记</label>
              <div className="grid grid-cols-2 gap-2 rounded-[16px] border border-slate-200/80 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/60">
                <label className="inline-flex items-center gap-2 text-[12px] font-semibold text-slate-600 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={resolveBooleanFlag(selectedRule.ifBold)}
                    onChange={(event) => onUpdateRule(selectedRule.id, { ifBold: event.target.checked ? 1 : 0 })}
                    className="h-4 w-4 rounded accent-[color:var(--workspace-accent)]"
                  />
                  加粗
                </label>
                <label className="inline-flex items-center gap-2 text-[12px] font-semibold text-slate-600 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={resolveBooleanFlag(selectedRule.ifItalic)}
                    onChange={(event) => onUpdateRule(selectedRule.id, { ifItalic: event.target.checked ? 1 : 0 })}
                    className="h-4 w-4 rounded accent-[color:var(--workspace-accent)]"
                  />
                  倾斜
                </label>
                <label className="inline-flex items-center gap-2 text-[12px] font-semibold text-slate-600 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={resolveBooleanFlag(selectedRule.ifStrickOut)}
                    onChange={(event) => onUpdateRule(selectedRule.id, { ifStrickOut: event.target.checked ? 1 : 0 })}
                    className="h-4 w-4 rounded accent-[color:var(--workspace-accent)]"
                  />
                  删除线
                </label>
                <label className="inline-flex items-center gap-2 text-[12px] font-semibold text-slate-600 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={resolveBooleanFlag(selectedRule.ifUnderLine)}
                    onChange={(event) => onUpdateRule(selectedRule.id, { ifUnderLine: event.target.checked ? 1 : 0 })}
                    className="h-4 w-4 rounded accent-[color:var(--workspace-accent)]"
                  />
                  下划线
                </label>
              </div>
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
