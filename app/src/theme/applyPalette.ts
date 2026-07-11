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

/** Mix `rgb` toward `target` by `amount` (0..1). */
function mix(rgb: Rgb, target: Rgb, amount: number): Rgb {
  return {
    r: rgb.r + (target.r - rgb.r) * amount,
    g: rgb.g + (target.g - rgb.g) * amount,
    b: rgb.b + (target.b - rgb.b) * amount,
  };
}

const WHITE: Rgb = { r: 255, g: 255, b: 255 };
const BLACK: Rgb = { r: 0, g: 0, b: 0 };

/**
 * Given a page background, derive the full set of surface/text tokens Ionic
 * needs so the *whole* app (cards, toolbars, tab bar, items, text) recolors
 * coherently — not just the page canvas. A light background nudges surfaces
 * toward white and text toward black; a dark one does the reverse.
 */
function backgroundVars(bgHex: string): Record<string, string> {
  const bg = parseHex(bgHex);
  const dark = contrast(bg).hex === '#ffffff'; // white text ⇒ dark background
  const towardFg = dark ? WHITE : BLACK; // surfaces lift away from the bg
  const surface = toHex(mix(bg, towardFg, dark ? 0.06 : 0.04));
  const text = dark ? '#f4f6f5' : '#1f2421';
  return {
    '--ion-background-color': toHex(bg),
    '--ion-background-color-rgb': rgbStr(bg),
    '--ion-text-color': text,
    '--ion-text-color-rgb': rgbStr(parseHex(text)),
    '--ion-item-background': surface,
    '--ion-card-background': surface,
    '--ion-toolbar-background': surface,
    '--ion-tab-bar-background': surface,
  };
}

/**
 * Compute the palette's brand-color CSS variables (rgb / contrast / shade /
 * tint for each stepped color). Background/surface tokens are handled
 * separately (see backgroundVars) because they are mode-dependent. Exported so
 * it can be unit-tested without a DOM.
 */
export function paletteToCssVars(palette: Palette): Record<string, string> {
  return {
    ...steppedColorVars('primary', palette.primary),
    ...steppedColorVars('secondary', palette.secondary),
    ...steppedColorVars('tertiary', palette.tertiary),
    // Reuse secondary as the "dark" stepped color so dark surfaces track the
    // brand (matches how theme/variables.css maps dark to the wordmark black).
    ...steppedColorVars('dark', palette.secondary),
  };
}

/**
 * Compute the mode-appropriate background/surface variables for a palette.
 * `dark` selects backgroundDark (falling back to background). Returns {} when
 * the palette defines no background for the requested mode. Exported for tests.
 */
export function paletteBackgroundVars(
  palette: Palette,
  dark: boolean,
): Record<string, string> {
  const hex = dark ? palette.backgroundDark ?? palette.background : palette.background;
  return hex ? backgroundVars(hex) : {};
}

function prefersDark(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );
}

/**
 * Apply a palette to the live document by writing the derived variables onto
 * :root. Brand colors are mode-independent; the background/surface tokens track
 * the OS light/dark preference. No-op outside a browser (unit tests w/o a DOM).
 */
export function applyPalette(palette: Palette): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const vars = {
    ...paletteToCssVars(palette),
    ...paletteBackgroundVars(palette, prefersDark()),
  };
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
}

let schemeListenerBound = false;

/**
 * Re-apply the active palette whenever the OS light/dark preference changes, so
 * the background/surface tokens switch modes live. `getActive` returns the
 * currently-selected palette at fire time. Idempotent — safe to call once at
 * boot; a no-op without matchMedia (unit tests).
 */
export function watchColorScheme(getActive: () => Palette): void {
  if (
    schemeListenerBound ||
    typeof window === 'undefined' ||
    typeof window.matchMedia !== 'function'
  ) {
    return;
  }
  schemeListenerBound = true;
  window
    .matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', () => applyPalette(getActive()));
}
