// Runtime palette engine. Takes a Palette's 3–4 base hex colors and derives the
// full set of Ionic CSS variables (base / -rgb / -contrast / -contrast-rgb /
// -shade / -tint for each stepped color), then writes them onto the document
// root as inline custom properties — which override the defaults in
// theme/variables.css. This is how a palette chosen in settings recolors the
// whole app without a rebuild.
//
// Formulas match Ionic's own color generator (verified against the values in
// theme/variables.css):
//   shade   = channel * 0.88               (slightly darker)
//   tint    = channel + (255-channel)*0.10 (10% toward white)
//   contrast= YIQ >= 128 ? black : white   (readable text on the color)

import type { Palette } from '@/theme/palettes';

interface Rgb {
  r: number;
  g: number;
  b: number;
}

function parseHex(hex: string): Rgb {
  const clean = hex.replace('#', '').trim();
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  const int = parseInt(full, 16);
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}

function toHex({ r, g, b }: Rgb): string {
  const h = (n: number) => Math.round(clamp(n)).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

function clamp(n: number): number {
  return Math.max(0, Math.min(255, n));
}

function shade({ r, g, b }: Rgb): Rgb {
  return { r: r * 0.88, g: g * 0.88, b: b * 0.88 };
}

function tint({ r, g, b }: Rgb): Rgb {
  const up = (c: number) => c + (255 - c) * 0.1;
  return { r: up(r), g: up(g), b: up(b) };
}

/** YIQ luminance → pick black or white text for readability on `rgb`. */
function contrast(rgb: Rgb): { hex: string; rgbStr: string } {
  const yiq = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  return yiq >= 128
    ? { hex: '#000000', rgbStr: '0, 0, 0' }
    : { hex: '#ffffff', rgbStr: '255, 255, 255' };
}

function rgbStr({ r, g, b }: Rgb): string {
  return `${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}`;
}

/** Build the 6 Ionic variables for one stepped color name (e.g. "primary"). */
function steppedColorVars(name: string, hex: string): Record<string, string> {
  const base = parseHex(hex);
  const c = contrast(base);
  return {
    [`--ion-color-${name}`]: toHex(base),
    [`--ion-color-${name}-rgb`]: rgbStr(base),
    [`--ion-color-${name}-contrast`]: c.hex,
    [`--ion-color-${name}-contrast-rgb`]: c.rgbStr,
    [`--ion-color-${name}-shade`]: toHex(shade(base)),
    [`--ion-color-${name}-tint`]: toHex(tint(base)),
  };
}

/**
 * Compute every CSS variable a palette overrides. Exported (not just applied)
 * so it can be unit-tested without a DOM.
 */
export function paletteToCssVars(palette: Palette): Record<string, string> {
  const vars: Record<string, string> = {
    ...steppedColorVars('primary', palette.primary),
    ...steppedColorVars('secondary', palette.secondary),
    ...steppedColorVars('tertiary', palette.tertiary),
    // Reuse secondary as the "dark" stepped color so dark surfaces track the
    // brand (matches how theme/variables.css maps dark to the wordmark black).
    ...steppedColorVars('dark', palette.secondary),
  };
  if (palette.background) {
    vars['--ion-background-color'] = palette.background;
    vars['--ion-background-color-rgb'] = rgbStr(parseHex(palette.background));
  }
  return vars;
}

/**
 * Apply a palette to the live document by writing the derived variables onto
 * :root. No-op outside a browser (SSR/unit tests without a DOM).
 */
export function applyPalette(palette: Palette): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const vars = paletteToCssVars(palette);
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
}
