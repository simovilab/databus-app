// App color palettes.
//
// HOW TO ADD A PALETTE: append an entry to PALETTES below. Each palette is just
// 3 required hex colors (plus an optional 4th `background`):
//
//   { id: 'my-theme', name: 'My theme',
//     primary: '#6dc067', secondary: '#1f2421', tertiary: '#2f6fed',
//     background: '#ffffff' /* optional */ }
//
// - primary   → main brand color (buttons, active tab, accents)
// - secondary → dark/brand surface (splash background, headers)
// - tertiary  → links / informational accents
// - background→ optional page background (light: near-white, dark: near-black)
//
// Everything else (rgb / contrast / shade / tint for each color) is derived
// automatically by applyPalette.ts using Ionic's standard color formulas — you
// never hand-write those. The user picks a palette in User → Ajustes; the
// choice is persisted (settings store) and applied on boot.

export interface Palette {
  /** Stable key stored in settings. Never reuse an id for a different palette. */
  id: string;
  /** Human-readable name shown in the settings picker. */
  name: string;
  primary: string;
  secondary: string;
  tertiary: string;
  /** Optional page background. Omit to keep Ionic's default background. */
  background?: string;
}

export const PALETTES: readonly Palette[] = [
  {
    id: 'databus',
    name: 'Databús (predeterminado)',
    primary: '#6dc067', // Databús green
    secondary: '#1f2421', // near-black wordmark
    tertiary: '#2f6fed', // transit blue
  },
  {
    id: 'ocean',
    name: 'Océano',
    primary: '#0a84ff',
    secondary: '#0b1f33',
    tertiary: '#30c8c9',
  },
  {
    id: 'sunset',
    name: 'Atardecer',
    primary: '#ff6b35',
    secondary: '#2b1b2f',
    tertiary: '#ffb703',
  },
  {
    id: 'grape',
    name: 'Uva',
    primary: '#7b5cff',
    secondary: '#211a33',
    tertiary: '#e5484d',
  },
  {
    id: 'forest',
    name: 'Bosque',
    primary: '#2e7d32',
    secondary: '#14261a',
    tertiary: '#a3b18a',
  },
];

/** The palette id used when none is stored / an unknown id is encountered. */
export const DEFAULT_PALETTE_ID = 'databus';

export function getPalette(id: string | undefined): Palette {
  return (
    PALETTES.find((p) => p.id === id) ??
    PALETTES.find((p) => p.id === DEFAULT_PALETTE_ID) ??
    PALETTES[0]
  );
}
