import clsx from 'clsx';
import type { ChangeEvent } from 'react';

import { DETAIL_LAYOUT_REGISTRY } from '../registry';
import type { DetailLayoutItem, DetailLayoutItemPatch, DetailLayoutMode } from '../types';

type DetailPropertyPanelProps = {
  allowFieldEdit?: boolean;
  allowParentIdEdit?: boolean;
  className?: string;
  fieldOptions?: Array<{ label: string; value: string }>;
  item: DetailLayoutItem | null;
  mode: DetailLayoutMode;
  onChange: (patch: DetailLayoutItemPatch) => void;
};

function getNumericFieldValue(
  item: DetailLayoutItem,
  key: 'x' | 'y' | 'w' | 'h',
  fallbackWidth: number,
  fallbackHeight: number,
) {
  const value = item[key];
  if (Number.isFinite(value)) {
    return value;
  }

  if (key === 'w') {
    return fallbackWidth;
  }

  if (key === 'h') {
    return fallbackHeight;
  }

  return 0;
}

function toNumberPatch(
  event: ChangeEvent<HTMLInputElement>,
  key: 'x' | 'y' | 'w' | 'h',
  onChange: (patch: DetailLayoutItemPatch) => void,
) {
  const nextValue = Number(event.target.value);
  if (Number.isFinite(nextValue)) {
    onChange({ [key]: nextValue } as DetailLayoutItemPatch);
  }
}

export function DetailPropertyPanel({
  allowFieldEdit = true,
  allowParentIdEdit = true,
  className,
  fieldOptions,
  item,
  mode,
  onChange,
}: DetailPropertyPanelProps) {
  const registryItem = item ? DETAIL_LAYOUT_REGISTRY[item.type] : null;
  const fallbackWidth = registryItem?.defaultSize.w ?? 0;
  const fallbackHeight = registryItem?.defaultSize.h ?? 0;

  return (
    <aside className={clsx('flex flex-col gap-4 rounded-[24px] border border-slate-200/80 bg-white/88 p-4 shadow-[0_24px_44px_-36px_rgba(15,23,42,0.28)]', className)}>
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Property</div>
        <h3 className="mt-2 text-lg font-bold text-slate-900">核心属性</h3>
        <p className="mt-1 text-sm leading-6 text-slate-500">先只保留最小属性集，后续再接运行态和实际业务配置映射。</p>
      </div>

      {!item ? (
        <div className="rounded-[20px] border border-dashed border-slate-200/80 bg-slate-50/60 px-4 py-6 text-sm leading-6 text-slate-400">
          当前未选中控件。点击画布中的控件后，可编辑它的标题、字段、位置和尺寸。
        </div>
      ) : (
        <>
          <div className="rounded-[20px] border border-[color:var(--workspace-accent-border,#bfd0ff)] bg-[color:var(--workspace-accent-soft,rgba(49,98,255,0.08))] px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[color:var(--workspace-accent-strong,#3152c8)]">
              当前选中
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-900">
              {item.title || DETAIL_LAYOUT_REGISTRY[item.type].defaultTitle}
            </div>
            <div className="mt-1 text-[11px] text-slate-500">
              坐标 {getNumericFieldValue(item, 'x', fallbackWidth, fallbackHeight)}, {getNumericFieldValue(item, 'y', fallbackWidth, fallbackHeight)}
              {' '}· 尺寸 {getNumericFieldValue(item, 'w', fallbackWidth, fallbackHeight)} × {getNumericFieldValue(item, 'h', fallbackWidth, fallbackHeight)}
            </div>
          </div>

          <div className="rounded-[20px] border border-slate-200/80 bg-slate-50/70 px-4 py-3">
            <div className="text-xs font-medium text-slate-500">控件类型</div>
            <div className="mt-1 text-sm font-semibold text-slate-900">{DETAIL_LAYOUT_REGISTRY[item.type].label}</div>
            <div className="mt-1 text-xs leading-5 text-slate-500">当前模式：{mode === 'design' ? '设计态' : '运行态'}</div>
          </div>

          <label className="grid gap-1.5 text-sm text-slate-600">
            <span className="font-medium">ID</span>
            <input className="h-10 rounded-[14px] border border-slate-200/80 bg-slate-50/80 px-3 text-slate-500" readOnly value={item.id} />
          </label>

          <label className="grid gap-1.5 text-sm text-slate-600">
            <span className="font-medium">标题</span>
            <input
              className="h-10 rounded-[14px] border border-slate-200/80 bg-white px-3"
              onChange={(event) => onChange({ title: event.target.value })}
              value={item.title ?? ''}
            />
          </label>

          <label className="grid gap-1.5 text-sm text-slate-600">
            <span className="font-medium">字段</span>
            {fieldOptions && allowFieldEdit ? (
              <select
                className="h-10 rounded-[14px] border border-slate-200/80 bg-white px-3"
                onChange={(event) => onChange({ field: event.target.value || undefined })}
                value={item.field ?? ''}
              >
                <option value="">未绑定</option>
                {fieldOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="h-10 rounded-[14px] border border-slate-200/80 bg-white px-3"
                onChange={(event) => onChange({ field: event.target.value || undefined })}
                readOnly={!allowFieldEdit}
                value={item.field ?? ''}
              />
            )}
          </label>

          <label className="grid gap-1.5 text-sm text-slate-600">
            <span className="font-medium">父级控件 ID</span>
            <input
              className="h-10 rounded-[14px] border border-slate-200/80 bg-white px-3"
              onChange={(event) => onChange({ parentId: event.target.value || null })}
              readOnly={!allowParentIdEdit}
              value={item.parentId ?? ''}
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            {(['x', 'y', 'w', 'h'] as const).map((key) => (
              <label key={key} className="grid gap-1.5 text-sm text-slate-600">
                <span className="font-medium uppercase">{key}</span>
                <input
                  className="h-10 rounded-[14px] border border-slate-200/80 bg-white px-3"
                  min={
                    key === 'x' || key === 'y'
                      ? 0
                      : key === 'w'
                        ? (registryItem?.defaultSize.w ?? 0)
                        : (registryItem?.defaultSize.h ?? 0)
                  }
                  onChange={(event) => toNumberPatch(event, key, onChange)}
                  type="number"
                  value={getNumericFieldValue(item, key, fallbackWidth, fallbackHeight)}
                />
              </label>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-slate-200/80 bg-white/80 px-4 py-3">
            <div className="text-[11px] leading-5 text-slate-500">
              默认尺寸：{fallbackWidth} × {fallbackHeight}
            </div>
            <button
              className="rounded-xl border border-slate-200/80 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600"
              onClick={() => onChange({ h: fallbackHeight, w: fallbackWidth })}
              type="button"
            >
              恢复默认尺寸
            </button>
          </div>

          <div className="rounded-[20px] border border-dashed border-slate-200/80 bg-slate-50/60 px-4 py-3 text-[11px] leading-5 text-slate-500">
            坐标不能小于 0，尺寸不能小于当前控件默认尺寸。优先拖动画布中的控件，数值输入更适合微调。
          </div>

          <div className="grid gap-2 rounded-[20px] border border-slate-200/80 bg-slate-50/70 px-4 py-3">
            <label className="flex items-center justify-between gap-3 text-sm text-slate-700">
              <span>必填</span>
              <input
                checked={Boolean(item.required)}
                onChange={(event) => onChange({ required: event.target.checked })}
                type="checkbox"
              />
            </label>
            <label className="flex items-center justify-between gap-3 text-sm text-slate-700">
              <span>只读</span>
              <input
                checked={Boolean(item.readOnly)}
                onChange={(event) => onChange({ readOnly: event.target.checked })}
                type="checkbox"
              />
            </label>
          </div>
        </>
      )}
    </aside>
  );
}
