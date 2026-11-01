import type { CSSProperties } from 'react';

/*
 * Neutral chart shading. Each shade is a solid colour mixed from the foreground and the card
 * background, so it follows the theme (dark on light cards, light on dark cards) without being
 * see-through. SVG attributes can't read CSS variables, so pass shades through `style`, e.g.
 * <Cell style={{ fill: shade(60) }} />.
 */

/** A solid shade: 0 is the card background, 100 the foreground */
export const shade = (strength: number) =>
  `color-mix(in srgb, hsl(var(--foreground)) ${strength}%, hsl(var(--card)))`;

/** Strength for bar `i` of `count` in a time series: oldest lightest, newest darkest */
export const rampStrength = (i: number, count: number) => (count <= 1 ? 85 : 22 + (63 * i) / (count - 1));

/** Strengths for parts of a whole (donut slices), largest share first */
const SHARE_STRENGTHS = [85, 58, 38, 24, 14];
export const shareStrength = (i: number) => SHARE_STRENGTHS[Math.min(i, SHARE_STRENGTHS.length - 1)];

/** Short axis labels: 1,250 → 1.3K */
const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
export const compactNumber = (value: number) => compact.format(value || 0);

export const chartTooltipStyle: CSSProperties = {
  borderRadius: '12px',
  border: '1px solid hsl(var(--border))',
  backgroundColor: 'hsl(var(--card))',
  color: 'hsl(var(--foreground))',
  fontSize: '12px',
  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
};
