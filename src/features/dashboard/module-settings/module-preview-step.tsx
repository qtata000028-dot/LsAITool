import React from 'react';

type ModulePreviewStepProps = {
  title: string;
};

export function ModulePreviewStep({ title }: ModulePreviewStepProps) {
  return (
    <div className="flex min-h-[500px] flex-1 items-center justify-center rounded-2xl border border-slate-200 bg-white p-10 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="space-y-4 text-center">
        <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-full bg-primary/5 text-primary">
          <span className="material-symbols-outlined text-4xl">preview</span>
        </div>
        <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300">{title}内容区域</h3>
        <p className="mx-auto max-w-sm text-sm leading-relaxed text-slate-400">
          这里是高级配置面板的内容占位区域。您可以根据具体业务需求，在此处渲染表单、图表或预览界面。
        </p>
      </div>
    </div>
  );
}
