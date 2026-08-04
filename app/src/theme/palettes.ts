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
    id: 'forest',
    name: 'Bosque',
    primary: '#2e7d32',
    secondary: '#14261a',
    tertiary: '#a3b18a',
    background: '#eef4ee',
    backgroundDark: '#0d1710',
  },
  {
    id: 'storm',
    name: 'Tormenta',
    primary: '#4b6864',
    secondary: '#4b4f68',
    tertiary: '#4b5e68',
    background: '#eff2f1', // gris claro perlado/verdoso
    backgroundDark: '#121415', // gris oscuro casi negro, ligeramente frío
  },
  {
    id: 'terracota',
    name: 'Terracota',
    primary: '#b96b49', // arcilla cálida
    secondary: '#2b1f1a', // espresso profundo
    tertiary: '#8fa38b', // salvia — pareja complementaria clásica
    background: '#f6efe8',
    backgroundDark: '#17120e',
  },
  {
    id: 'pizarra',
    name: 'Pizarra',
    primary: '#5b7a99', // azul-gris "slate" contenido
    secondary: '#171b20',
    tertiary: '#a7c4bc', // acento salvia-verdoso, discreto
    background: '#eef1f3',
    backgroundDark: '#101214',
  },
  {
    id: 'esmeralda',
    name: 'Esmeralda',
    primary: '#0e8c6b', // verde-azulado tipo piedra preciosa
    secondary: '#0c1f1a',
    tertiary: '#f2a65a', // ámbar cálido, complementario
    background: '#eef6f2',
    backgroundDark: '#0a1512',
  },
  {
    id: 'bruma',
    name: 'Bruma',
    primary: '#557693', // azul empolvado — versión desaturada de un azul eléctrico
    secondary: '#171b20',
    tertiary: '#b7a8b0', // susurro malva
    background: '#eef1f2',
    backgroundDark: '#0f1214',
  },
  {
    id: 'musgo',
    name: 'Musgo',
    primary: '#766f4d', // oliva apagado, a medio camino entre Bosque y Salvia
    secondary: '#1c1c14',
    tertiary: '#c8b892', // sand cálido
    background: '#f4f2ea',
    backgroundDark: '#131209',
  },
  {
    id: 'ceniza',
    name: 'Ceniza',
    primary: '#7d7973', // casi monocromo — el más silencioso del set
    secondary: '#181715',
    tertiary: '#c99a92', // susurro de rosa viejo
    background: '#f3f1ee',
    backgroundDark: '#121110',
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