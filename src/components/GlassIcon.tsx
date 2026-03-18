import React from 'react';

type GlassIconSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type GlassIconTone = 'primary' | 'sky' | 'cyan' | 'indigo' | 'emerald' | 'amber' | 'rose' | 'slate';

interface GlassIconProps {
  icon: string;
  size?: GlassIconSize;
  tone?: GlassIconTone;
  className?: string;
  iconClassName?: string;
}

const join = (...parts: Array<string | undefined | false>) => parts.filter(Boolean).join(' ');

export default function GlassIcon({
  icon,
  size = 'md',
  tone = 'primary',
  className,
  iconClassName,
}: GlassIconProps) {
  return (
    <span
      aria-hidden="true"
      className={join('glass-icon', `glass-icon-${size}`, `glass-icon-${tone}`, className)}
    >
      <span className={join('material-symbols-outlined', iconClassName)}>{icon}</span>
    </span>
  );
}
