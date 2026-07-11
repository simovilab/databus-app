// App color palettes.
//
// HOW TO ADD A PALETTE: append an entry to PALETTES below. Each palette is
// 3 brand colors + a page background:
//
//   { id: 'my-theme', name: 'My theme',
//     primary: '#6dc067', secondary: '#1f2421', tertiary: '#2f6fed',
//     background: '#f4f6f5', backgroundDark: '#121412' }
//
// - primary        → main brand color (buttons, active tab, accents)
// - secondary      → dark/brand surface (splash background, headers)
// - tertiary       → links / informational accents
// - background     → page background in LIGHT mode (a near-white tint reads best)
// - backgroundDark → page background in DARK mode (a near-black tint)
//
// Provide BOTH backgrounds: a light-only background would leave light text on a
// light page when the OS is in dark mode. Omitting them keeps Ionic's default
// background. Everything else (rgb / contrast / shade / tint for each color) is
// derived automatically by applyPalette.ts using Ionic's standard color
// formulas — you never hand-write those. The user picks a palette in
// User → Ajustes; the choice is persisted (settings store) and applied on boot.

export interface Palette {
  /** Stable key stored in settings. Never reuse an id for a different palette. */
  id: string;
  /** Human-readable name shown in the settings picker. */
  name: string;
  primary: string;
  secondary: string;
  tertiary: string;
  /** Page background in light mode. Omit to keep Ionic's default. */
  background?: string;
  /** Page background in dark mode. Falls back to `background` if omitted. */
  backgroundDark?: string;
}

export const PALETTES: readonly Palette[] = [
  {
    id: 'databus',
    name: 'Databús (predeterminado)',
    primary: '#6dc067', // Databús green
    secondary: '#1f2421', // near-black wordmark
    tertiary: '#2f6fed', // transit blue
    background: '#f4f6f5',
    backgroundDark: '#121412',
  },
  {
    id: 'ocean',
    name: 'Océano',
    primary: '#0a84ff',
    secondary: '#0b1f33',
    tertiary: '#30c8c9',
    background: '#eef4fb',
    backgroundDark: '#0a1420',
  },
  {
    id: 'sunset',
    name: 'Atardecer',
    primary: '#ff6b35',
    secondary: '#2b1b2f',
    tertiary: '#ffb703',
    background: '#fbf1ec',
    backgroundDark: '#1c1013',
  },
  {
    id: 'grape',
    name: 'Uva',
    primary: '#7b5cff',
    secondary: '#211a33',
    tertiary: '#e5484d',
    background: '#f3f0fb',
    backgroundDark: '#14101f',
  },
  {
    id: 'forest',
    name: 'Bosque',
    primary: '#2e7d32',
    secondary: '#14261a',
    tertiary: '#a3b18a',
    background: '#eef4ee',
    backgroundDark: '#0d1710',
  },
  // --- Nuevas paletas agregadas ---
  {
    id: 'breeze',
    name: 'Brisa',
    primary: '#c0ded9', // light mint/teal
    secondary: '#3b3a30', // dark charcoal
    tertiary: '#b2c2bf', // dusty teal
    background: '#eaece5',
    backgroundDark: '#1b1b17',
  },
  {
    id: 'steel',
    name: 'Acero',
    primary: '#66757F', // slate blue
    secondary: '#292F33', // dark slate
    tertiary: '#CCD6DD', // light slate blue
    background: '#E1E8ED',
    backgroundDark: '#14171a',
  },
  {
    id: 'sage',
    name: 'Salvia',
    primary: '#c5d5c5', // sage green
    secondary: '#9fa9a3', // olive gray
    tertiary: '#e3e0cc', // warm beige
    background: '#f0f0f0',
    backgroundDark: '#181a18',
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
