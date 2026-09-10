/**
 * Brand constants — the single source of truth for the SaveTogether identity.
 *
 * Values mirror the new Figma design system:
 *   brand blue #0047AB · mint #6EE7B7 · deep green #064E3B · page #F4F4F5
 *
 * The palette is also exposed to CSS as `--brand-*` tokens in
 * `src/styles/globals.css`; use the constants below when a colour is needed
 * inside TypeScript (meta tags, share text, inline styles).
 */

export const APP_NAME = 'SaveTogether';

/** Long-form slogan used on the landing page and auth screens. */
export const APP_TAGLINE = 'Save Together, Buy Smarter';

/** Compact slogan used under the wordmark in the desktop sidebar. */
export const APP_TAGLINE_SHORT = 'Buy Smarter, Together';

/** Headline font for the wordmark and display copy. */
export const BRAND_FONT = "'Plus Jakarta Sans', sans-serif";

export const BRAND = {
  blue: '#0047AB',
  blueHover: '#003D96',
  tint: '#EBF1FB',
  mint: '#6EE7B7',
  mintHover: '#5DD4A4',
  deep: '#064E3B',
  ink: '#0D1117',
  page: '#F4F4F5',
} as const;
