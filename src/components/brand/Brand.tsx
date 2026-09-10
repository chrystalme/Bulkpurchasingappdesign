import { Users } from 'lucide-react';
import { cn } from '../ui/utils';
import { APP_NAME, APP_TAGLINE_SHORT, BRAND_FONT } from '../../lib/brand';

/**
 * The SaveTogether logo, in one place.
 *
 * Every surface (landing nav + footer, auth header + hero, desktop sidebar)
 * renders the same lockup as the Figma design: a rounded brand-blue tile with
 * the community mark, followed by the "SaveTogether" wordmark set in Plus
 * Jakarta Sans. Change the brand here and it changes everywhere.
 */

type MarkSize = 'sm' | 'md' | 'lg' | 'hero';
type Tone = 'brand' | 'inverse';

const MARK: Record<MarkSize, { tile: string; icon: string }> = {
  // footer
  sm: { tile: 'w-7 h-7 rounded-lg', icon: 'w-3.5 h-3.5' },
  // marketing nav + auth header
  md: { tile: 'w-8 h-8 rounded-lg', icon: 'w-4 h-4' },
  // desktop sidebar
  lg: { tile: 'w-9 h-9 rounded-xl', icon: 'w-4 h-4' },
  // auth hero badge
  hero: { tile: 'w-20 h-20 rounded-full', icon: 'w-10 h-10' },
};

const WORDMARK: Record<Exclude<MarkSize, 'hero'>, string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-sm',
};

const TONE: Record<Tone, { tile: string; icon: string; word: string; tagline: string }> = {
  // blue tile + white icon on light surfaces
  brand: { tile: 'bg-[#0047AB]', icon: 'text-white', word: 'text-[#0047AB]', tagline: 'text-gray-400' },
  // white tile + blue icon (sits on the brand gradient / hero art)
  inverse: { tile: 'bg-white', icon: 'text-[#0047AB]', word: 'text-white', tagline: 'text-white/70' },
};

interface BrandMarkProps {
  size?: MarkSize;
  tone?: Tone;
  className?: string;
}

/** The tile-only mark — for places where the name is already displayed. */
export function BrandMark({ size = 'md', tone = 'brand', className }: BrandMarkProps) {
  const spec = MARK[size];
  const colors = TONE[tone];

  return (
    <div
      aria-hidden="true"
      className={cn(
        'flex items-center justify-center shrink-0',
        spec.tile,
        colors.tile,
        size === 'hero' && 'shadow-lg',
        className,
      )}
    >
      <Users className={cn(spec.icon, colors.icon)} />
    </div>
  );
}

interface BrandProps extends BrandMarkProps {
  /** Renders the compact slogan beneath the wordmark (desktop sidebar). */
  tagline?: boolean;
  /** Text size override for the wordmark — defaults to the size's own scale. */
  wordmarkClassName?: string;
  onClick?: () => void;
  title?: string;
}

/** The full lockup: mark + "SaveTogether" wordmark (+ optional slogan). */
export function Brand({
  size = 'md',
  tone = 'brand',
  tagline = false,
  className,
  wordmarkClassName,
  onClick,
  title,
}: BrandProps) {
  const colors = TONE[tone];
  const wordSize = size === 'hero' ? WORDMARK.md : WORDMARK[size];

  return (
    <div
      className={cn('flex items-center gap-2', className)}
      onClick={onClick}
      title={title}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <BrandMark size={size} tone={tone} />
      <div className="min-w-0">
        <span
          className={cn(
            'block font-bold tracking-tight leading-none',
            wordSize,
            colors.word,
            wordmarkClassName,
          )}
          style={{ fontFamily: BRAND_FONT }}
        >
          {APP_NAME}
        </span>
        {tagline && (
          <span className={cn('block text-[10px] leading-tight', colors.tagline)}>
            {APP_TAGLINE_SHORT}
          </span>
        )}
      </div>
    </div>
  );
}
