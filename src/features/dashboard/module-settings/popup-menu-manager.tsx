import React from 'react';
import {
  shadcnFieldClass,
  shadcnMutedLabelClass,
  shadcnTextareaClass,
} from '../../../components/ui/shadcn-inspector';
import { normalizePopupMenuNumber } from './context-menu-utils';

type PopupMenuItem = Record<string, any>;

type PopupMenuManagerProps = {
  contextMenuItems: PopupMenuItem[];
  enabledMenuCount: number;
  onAddItem: () => void;
  onDeleteItem: (itemId: string) => void;
  onSelectItem: (itemId: string) => void;
  onSelectParamKey: (paramKey: string) => void;
  onToggleItemDisabled: (itemId: string, disabled: boolean) => void;
  onUpdateSelectedItem: (patch: Record<string, any>) => void;
  selectedItem: PopupMenuItem | null;
  selectedParamKey: string;
};

const popupMenuParamFields = Array.from({ length: 10 }, (_, index) => ({
  key: `dllpar${index + 1}`,
  label: `参数 ${index + 1}`,
}));

const managerSectionClass = 'rounded-md border border-slate-200/80 bg-white px-3 py-3 dark:border-slate-800 dark:bg-slate-950';
const managerHeaderClass = 'mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-2.5 dark:border-slate-800';
const managerTitleWrapClass = 'flex min-w-0 items-center gap-3';
const managerTitleIconClass = 'inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-[color:var(--workspace-accent-border)] bg-[color:var(--workspace-accent-soft)] text-[color:var(--workspace-accent-strong)]';
const managerActionButtonClass = 'inline-flex h-9 items-center gap-1 rounded-md border border-[color:var(--workspace-accent)] bg-[color:var(--workspace-accent)] px-3.5 text-[12px] font-semibold text-white shadow-sm transition-colors hover:bg-[color:var(--workspace-accent-strong)]';
const managerListSurfaceClass = 'space-y-2 rounded-md border border-slate-200/80 bg-slate-50/70 p-2 dark:border-slate-800 dark:bg-slate-900/60';
const managerDetailNameClass = 'inline-flex max-w-full items-center rounded-md border border-slate-200/80 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300';
const managerMetricCardClass = 'min-w-[58px] rounded-md border border-slate-200/80 bg-slate-50 px-2.5 py-1.5 text-right dark:border-slate-800 dark:bg-slate-900';
const detailCardClass = 'rounded-md border border-slate-200/80 bg-slate-50/55 p-3 dark:border-slate-800 dark:bg-slate-900/55';
const detailSectionTitleClass = 'mb-4 flex items-center justify-between gap-3';
const detailSectionLabelClass = 'text-[12px] font-semibold tracking-[0.04em] text-slate-500 dark:text-slate-300';

function getPopupMenuIconName(value: unknown) {
  if (typeof value !== 'string') return 'right_click';
  const trimmed = value.trim();
  return trimmed && !/[/.:\\]/.test(trimmed) && !/\s/.test(trimmed) ? trimmed : 'right_click';
}

function getPopupMenuParamPreview(value: string) {
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized.length > 22 ? `${normalized.slice(0, 22)}...` : normalized;
}

export const PopupMenuManager = React.memo(function PopupMenuManager({
  contextMenuItems,
  enabledMenuCount,
  onAddItem,
  onDeleteItem,
  onSelectItem,
  onSelectParamKey,
  onToggleItemDisabled,
  onUpdateSelectedItem,
  selectedItem,
  selectedParamKey,
}: PopupMenuManagerProps) {
  const popupMenuDisplayName = selectedItem?.menuname || selectedItem?.label || '未命名菜单';
  const activePopupMenuParamField = popupMenuParamFields.find((field) => field.key === selectedParamKey) ?? popupMenuParamFields[0];
  const activePopupMenuParamValue = selectedItem ? String(selectedItem[activePopupMenuParamField.key] ?? '') : '';
  const configuredPopupMenuParamCount = selectedItem
    ? popupMenuParamFields.filter((field) => String(selectedItem[field.key] ?? '').trim().length > 0).length
    : 0;
  const updateSelectedPopupMenuNumber = (key: string, value: string, fallback = 0) => {
    onUpdateSelectedItem({ [key]: value === '' ? fallback : normalizePopupMenuNumber(value, fallback) });
  };

  return (
    <div className="space-y-4">
      <section className={managerSectionClass}>
        <div className={managerHeaderClass}>
          <div className={managerTitleWrapClass}>
            <span className={managerTitleIconClass}>
              <span className="material-symbols-outlined text-[18px]">list_alt</span>
            </span>
            <div>
              <h4 className="text-[14px] font-bold text-slate-800 dark:text-slate-100">菜单列表</h4>
            </div>
          </div>
          <div className="flex w-full items-center justify-between gap-3 pt-1">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <div className={managerMetricCardClass}>
                <div className="text-[10px] font-bold tracking-[0.08em] text-slate-400">总数</div>
                <div className="mt-1 text-[15px] font-black text-slate-800 dark:text-slate-100">{contextMenuItems.length}</div>
              </div>
              <div className={managerMetricCardClass}>
                <div className="text-[10px] font-bold tracking-[0.08em] text-slate-400">可用</div>
                <div className="mt-1 text-[15px] font-black text-emerald-500">{enabledMenuCount}</div>
              </div>
              <div className={managerMetricCardClass}>
                <div className="text-[10px] font-bold tracking-[0.08em] text-slate-400">禁用</div>
                <div className="mt-1 text-[15px] font-black text-amber-500">{Math.max(0, contextMenuItems.length - enabledMenuCount)}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={onAddItem}
              className={`${managerActionButtonClass} shrink-0`}
            >
              <span className="material-symbols-outlined text-[14px]">add</span>
              新增菜单
            </button>
          </div>
        </div>
        <div className={`${managerListSurfaceClass} max-h-[332px] overflow-y-auto pr-1`}>
          {contextMenuItems.length > 0 ? contextMenuItems.map((item, index) => {
            const isSelected = selectedItem?.id === item.id;
            const iconName = getPopupMenuIconName(item.defailtimage);

            return (
              <div
                key={item.id}
                className={`group flex items-center gap-3 rounded-[20px] border px-3.5 py-3 transition-all ${
                  isSelected
                    ? 'border-[color:var(--workspace-accent-border-strong)] bg-[linear-gradient(180deg,var(--workspace-accent-surface),rgba(255,255,255,0.96))] shadow-[0_22px_36px_-28px_var(--workspace-accent-shadow)] dark:bg-[linear-gradient(180deg,rgba(36,53,83,0.92),rgba(15,23,42,0.7))]'
                    : 'border-slate-200/75 bg-white/94 hover:border-[color:var(--workspace-accent-border)] hover:bg-white dark:border-slate-700 dark:bg-slate-900/56 dark:hover:bg-slate-900/72'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelectItem(item.id)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <div className={`flex size-11 shrink-0 items-center justify-center rounded-[18px] border transition-colors ${
                    isSelected
                      ? 'border-[color:var(--workspace-accent)] bg-[color:var(--workspace-accent)] text-white'
                      : 'border-[color:var(--workspace-accent-border)] bg-[color:var(--workspace-accent-soft)] text-[color:var(--workspace-accent-strong)]'
                  }`}>
                    <span className="material-symbols-outlined text-[18px]">{iconName}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-bold text-slate-700 dark:text-slate-100">
                      {item.menuname || item.label || `菜单 ${index + 1}`}
                    </div>
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
                    checked={Boolean(item.disabled)}
                    onMouseDown={(event) => event.stopPropagation()}
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) => onToggleItemDisabled(item.id, event.target.checked)}
                    className="h-4 w-4 rounded accent-[color:var(--workspace-accent)]"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => onDeleteItem(item.id)}
                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-xl text-rose-500 transition-colors hover:bg-rose-50 dark:hover:bg-rose-500/10"
                  title="删除菜单"
                >
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                </button>
              </div>
            );
          }) : (
            <div className="rounded-[22px] border border-dashed border-slate-200/80 px-4 py-10 text-center text-[12px] text-slate-400 dark:border-slate-700">
              还没有配置右键菜单
            </div>
          )}
        </div>
      </section>

      <section className={`${managerSectionClass} min-w-0`}>
        <div className={managerHeaderClass}>
          <div className={managerTitleWrapClass}>
            <span className={managerTitleIconClass}>
              <span className="material-symbols-outlined text-[18px]">edit_note</span>
            </span>
            <div>
              <h4 className="text-[14px] font-bold text-slate-800 dark:text-slate-100">菜单详情</h4>
            </div>
          </div>
          {selectedItem ? (
            <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
              <span className={`${managerDetailNameClass} max-w-[320px] truncate`}>
                {popupMenuDisplayName}
              </span>
              <span className="inline-flex items-center rounded-full border border-slate-200/80 bg-white/92 px-3 py-1.5 text-[11px] font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-900/72 dark:text-slate-300">
                顺序 {selectedItem.orderid ?? 0}
              </span>
            </div>
          ) : null}
        </div>
        {selectedItem ? (
          <div className="space-y-3.5">
            <section className={detailCardClass}>
              <div className={detailSectionTitleClass}>
                <div className={detailSectionLabelClass}>核心配置</div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className={shadcnMutedLabelClass}>菜单名称</label>
                  <input
                    type="text"
                    value={selectedItem.menuname ?? selectedItem.label ?? ''}
                    onChange={(event) => onUpdateSelectedItem({ menuname: event.target.value })}
                    placeholder="菜单名称"
                    className={shadcnFieldClass}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className={shadcnMutedLabelClass}>调用模板名</label>
                  <input
                    type="text"
                    value={selectedItem.dllname ?? ''}
                    onChange={(event) => onUpdateSelectedItem({ dllname: event.target.value })}
                    placeholder="例如：open_archive_detail"
                    className={`${shadcnFieldClass} font-mono text-[12px]`}
                  />
                </div>
                <div>
                  <label className={shadcnMutedLabelClass}>右键类型</label>
                  <input
                    type="number"
                    value={selectedItem.menuType ?? 0}
                    onChange={(event) => updateSelectedPopupMenuNumber('menuType', event.target.value, 0)}
                    className={shadcnFieldClass}
                  />
                </div>
                <div>
                  <label className={shadcnMutedLabelClass}>加载方式</label>
                  <input
                    type="number"
                    value={selectedItem.showMode ?? 0}
                    onChange={(event) => updateSelectedPopupMenuNumber('showMode', event.target.value, 0)}
                    className={shadcnFieldClass}
                  />
                </div>
                <div>
                  <label className={shadcnMutedLabelClass}>添加方式</label>
                  <input
                    type="number"
                    value={selectedItem.addShowMode ?? 0}
                    onChange={(event) => updateSelectedPopupMenuNumber('addShowMode', event.target.value, 0)}
                    className={shadcnFieldClass}
                  />
                </div>
                <div>
                  <label className={shadcnMutedLabelClass}>事件类型</label>
                  <input
                    type="number"
                    value={selectedItem.actiontype ?? 0}
                    onChange={(event) => updateSelectedPopupMenuNumber('actiontype', event.target.value, 0)}
                    className={shadcnFieldClass}
                  />
                </div>
              </div>
            </section>

            <section className={detailCardClass}>
              <div className={detailSectionTitleClass}>
                <div className={detailSectionLabelClass}>参数配置</div>
                <span className="text-[11px] text-slate-400 dark:text-slate-500">已配置 {configuredPopupMenuParamCount}/10</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {popupMenuParamFields.map((field, index) => {
                  const hasValue = Boolean(String(selectedItem[field.key] ?? '').trim());
                  const isActive = activePopupMenuParamField.key === field.key;
                  const previewValue = getPopupMenuParamPreview(String(selectedItem[field.key] ?? ''));

                  return (
                    <button
                      key={field.key}
                      type="button"
                      onClick={() => onSelectParamKey(field.key)}
                      aria-pressed={isActive}
                      className={`group flex min-w-0 items-center justify-between gap-3 rounded-[18px] border px-3.5 py-3 text-left transition-all duration-150 ${
                        isActive
                          ? 'border-[color:var(--workspace-accent-border-strong)] bg-[color:var(--workspace-accent-surface)] shadow-[0_18px_30px_-24px_var(--workspace-accent-shadow)]'
                          : hasValue
                            ? 'border-[color:var(--workspace-accent-border)] bg-[color:var(--workspace-accent-soft)]/55 hover:border-[color:var(--workspace-accent-border-strong)]'
                            : 'border-slate-200/80 bg-white/88 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900/68'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-[12px] font-bold ${isActive ? 'text-[color:var(--workspace-accent-strong)] dark:text-white' : 'text-slate-700 dark:text-slate-100'}`}>
                            参数 {index + 1}
                          </span>
                          {hasValue ? (
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              isActive
                                ? 'bg-[color:var(--workspace-accent)] text-white'
                                : 'bg-emerald-500/12 text-emerald-600 dark:bg-emerald-500/18 dark:text-emerald-300'
                            }`}
                            >
                              已填
                            </span>
                          ) : null}
                        </div>
                        <div className={`mt-1 truncate text-[11px] ${hasValue ? (isActive ? 'text-[color:var(--workspace-accent-strong)]/80 dark:text-slate-200/90' : 'text-slate-500 dark:text-slate-300') : 'text-slate-400 dark:text-slate-500'}`}>
                          {hasValue ? previewValue : '未填写'}
                        </div>
                      </div>
                      <span className={`material-symbols-outlined shrink-0 text-[16px] transition-colors ${
                        isActive
                          ? 'text-[color:var(--workspace-accent-strong)] dark:text-white'
                          : 'text-slate-300 group-hover:text-slate-500 dark:text-slate-600 dark:group-hover:text-slate-300'
                      }`}
                      >
                        chevron_right
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 rounded-[18px] border border-slate-200/80 bg-slate-50/72 p-3.5 dark:border-slate-700 dark:bg-slate-900/46">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="text-[12px] font-bold text-slate-700 dark:text-slate-100">{activePopupMenuParamField.label}</div>
                  <button
                    type="button"
                    onClick={() => onUpdateSelectedItem({ [activePopupMenuParamField.key]: '' })}
                    className="inline-flex items-center gap-1 rounded-full border border-slate-200/80 bg-white/88 px-3 py-1.5 text-[11px] font-bold text-slate-500 transition-colors hover:border-rose-200 hover:text-rose-500 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300"
                  >
                    <span className="material-symbols-outlined text-[14px]">ink_eraser</span>
                    清空当前
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={activePopupMenuParamValue}
                  onChange={(event) => onUpdateSelectedItem({ [activePopupMenuParamField.key]: event.target.value })}
                  placeholder={activePopupMenuParamField.label}
                  className={`${shadcnTextareaClass} min-h-[96px] resize-y font-mono text-[12px]`}
                />
              </div>
            </section>

            <section className={detailCardClass}>
              <div className={detailSectionTitleClass}>
                <div className={detailSectionLabelClass}>事件脚本与提示</div>
              </div>
              <div className="grid gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
                <div>
                  <label className={shadcnMutedLabelClass}>事件脚本</label>
                  <textarea
                    rows={8}
                    value={selectedItem.action ?? ''}
                    onChange={(event) => onUpdateSelectedItem({ action: event.target.value })}
                    placeholder="脚本 / 事件表达式"
                    className={`${shadcnTextareaClass} min-h-[184px]`}
                  />
                </div>
                <div className="grid gap-3">
                  <div>
                    <label className={shadcnMutedLabelClass}>执行前提示</label>
                    <textarea
                      rows={2}
                      value={selectedItem.beforeMsg ?? ''}
                      onChange={(event) => onUpdateSelectedItem({ beforeMsg: event.target.value })}
                      className={`${shadcnTextareaClass} min-h-[78px] font-sans text-[12px]`}
                    />
                  </div>
                  <div>
                    <label className={shadcnMutedLabelClass}>成功提示</label>
                    <textarea
                      rows={2}
                      value={selectedItem.msgSuccess ?? ''}
                      onChange={(event) => onUpdateSelectedItem({ msgSuccess: event.target.value })}
                      className={`${shadcnTextareaClass} min-h-[78px] font-sans text-[12px]`}
                    />
                  </div>
                  <div>
                    <label className={shadcnMutedLabelClass}>错误提示</label>
                    <textarea
                      rows={2}
                      value={selectedItem.msgError ?? ''}
                      onChange={(event) => onUpdateSelectedItem({ msgError: event.target.value })}
                      className={`${shadcnTextareaClass} min-h-[78px] font-sans text-[12px]`}
                    />
                  </div>
                  <div>
                    <label className={shadcnMutedLabelClass}>补充说明</label>
                    <textarea
                      rows={2}
                      value={selectedItem.Fremark ?? ''}
                      onChange={(event) => onUpdateSelectedItem({ Fremark: event.target.value })}
                      className={`${shadcnTextareaClass} min-h-[78px] font-sans text-[12px]`}
                    />
                  </div>
                </div>
              </div>
            </section>
          </div>
        ) : (
          <div className="rounded-[16px] border border-dashed border-slate-200/80 px-4 py-10 text-center text-[12px] text-slate-400 dark:border-slate-800">
            请选择菜单项
          </div>
        )}
      </section>
    </div>
  );
});
