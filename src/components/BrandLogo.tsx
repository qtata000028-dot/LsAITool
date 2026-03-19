import React from 'react';

type BrandLogoSize = 'sm' | 'md' | 'lg';
type BrandLogoAlign = 'left' | 'center';

interface BrandLogoProps {
  size?: BrandLogoSize;
  align?: BrandLogoAlign;
  className?: string;
  showTagline?: boolean;
  tagline?: string;
}

const join = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');

const sizeClasses: Record<BrandLogoSize, { wordmarkWidth: string; tagline: string; gap: string }> = {
  sm: {
    wordmarkWidth: 'w-[192px]',
    tagline: 'text-[14px]',
    gap: 'gap-2',
  },
  md: {
    wordmarkWidth: 'w-[264px]',
    tagline: 'text-[14px]',
    gap: 'gap-2.5',
  },
  lg: {
    wordmarkWidth: 'w-[320px]',
    tagline: 'text-[14px]',
    gap: 'gap-3',
  },
};

export default function BrandLogo({
  size = 'md',
  align = 'left',
  className,
  showTagline = false,
  tagline = 'AI模块工作台',
}: BrandLogoProps) {
  const classes = sizeClasses[size];

  return (
    <div
      aria-label="lumsoft 朗速"
      className={join(
        'inline-flex select-none flex-col leading-none',
        align === 'center' ? 'items-center text-center' : 'items-start text-left',
        classes.gap,
        className,
      )}
    >
      <img
        alt="lumsoft 朗速"
        className={join('h-auto object-contain', classes.wordmarkWidth)}
        draggable="false"
        loading="eager"
        src="/branding/lumsoft-logo.png"
      />
      {showTagline && (
        <span className={join('font-semibold tracking-[0.08em] text-slate-600 dark:text-slate-300', classes.tagline)}>
          {tagline}
        </span>
      )}
    </div>
  );
}
