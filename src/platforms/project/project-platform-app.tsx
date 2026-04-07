import type { PlatformDefinition } from '../../app/registry/platform-registry';
import { PlatformPlaceholderShell } from '../../app/shells/platform-placeholder-shell';

type ProjectPlatformAppProps = {
  currentPath: string;
  platform: PlatformDefinition;
};

const projectHighlights = [
  {
    title: '系统已挂载',
    description: '项目平台已经在 LsAITool 中拥有独立入口，与设计平台平级。',
  },
  {
    title: '中间页已接通',
    description: '登录成功后会先进入系统选择页，再跳转到当前平台主界面。',
  },
  {
    title: '后续待接设计图',
    description: '新增项目、关联配置和甘特图集中工作区，等待设计稿确认后继续落地。',
  },
];

export function ProjectPlatformApp({
  currentPath,
  platform,
}: ProjectPlatformAppProps) {
  return (
    <PlatformPlaceholderShell
      currentPath={currentPath}
      platform={platform}
      summary="项目平台已经先在 LsAITool 中搭好独立主界面骨架，后续会在这个平台内继续承接项目管理、配置关联和甘特图工作区。"
      title="项目平台主界面"
    >
      <div className="grid gap-4 xl:grid-cols-3">
        {projectHighlights.map((item) => (
          <div
            key={item.title}
            className="rounded-[24px] border border-white/80 bg-white/70 p-5 shadow-[0_20px_40px_-28px_rgba(15,23,42,0.25)]"
          >
            <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-primary">
              Project
            </div>
            <h2 className="mt-3 text-lg font-black tracking-tight text-slate-950">
              {item.title}
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">{item.description}</p>
          </div>
        ))}
      </div>
    </PlatformPlaceholderShell>
  );
}
