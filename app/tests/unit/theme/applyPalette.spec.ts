import { describe, expect, it } from 'vitest';
import { paletteBackgroundVars, paletteToCssVars } from '@/theme/applyPalette';
import { getPalette } from '@/theme/palettes';
import type { Palette } from '@/theme/palettes';

describe('paletteToCssVars', () => {
  it('reproduces the known Databús primary derivations', () => {
    // These exact values live in theme/variables.css — the engine's formulas
    // must match Ionic's generator so a palette recolors consistently.
    const vars = paletteToCssVars(getPalette('databus'));
    expect(vars['--ion-color-primary']).toBe('#6dc067');
    expect(vars['--ion-color-primary-rgb']).toBe('109, 192, 103');
    // green is light → black contrast
    expect(vars['--ion-color-primary-contrast']).toBe('#000000');
    expect(vars['--ion-color-primary-contrast-rgb']).toBe('0, 0, 0');
  });

  it('emits all six variables for each stepped color', () => {
    const vars = paletteToCssVars(getPalette('databus'));
    for (const name of ['primary', 'secondary', 'tertiary', 'dark']) {
      expect(vars[`--ion-color-${name}`]).toBeDefined();
      expect(vars[`--ion-color-${name}-rgb`]).toBeDefined();
      expect(vars[`--ion-color-${name}-contrast`]).toBeDefined();
      expect(vars[`--ion-color-${name}-contrast-rgb`]).toBeDefined();
      expect(vars[`--ion-color-${name}-shade`]).toBeDefined();
      expect(vars[`--ion-color-${name}-tint`]).toBeDefined();
    }
  });

  it('chooses white contrast on a dark base color', () => {
    const dark: Palette = {
      id: 't',
      name: 'T',
      primary: '#1f2421',
      secondary: '#000000',
      tertiary: '#333333',
    };
    const vars = paletteToCssVars(dark);
    expect(vars['--ion-color-primary-contrast']).toBe('#ffffff');
  });

  it('derives shade darker and tint lighter than the base', () => {
    // Inline palette (not one from the catalog) so this stays valid
    // regardless of which palettes ship in PALETTES.
    const p: Palette = {
      id: 't',
      name: 'T',
      primary: '#0a84ff',
      secondary: '#000000',
      tertiary: '#333333',
    };
    const vars = paletteToCssVars(p);
    // #0a84ff → shade ≈ *0.88, tint ≈ 10% toward white
    expect(vars['--ion-color-primary-shade']).toBe('#0974e0');
    expect(vars['--ion-color-primary-tint']).toBe('#2390ff');
  });

  it('accepts 3-digit hex and normalizes it', () => {
    const p: Palette = {
      id: 't',
      name: 'T',
      primary: '#0af',
      secondary: '#000',
      tertiary: '#fff',
    };
    const vars = paletteToCssVars(p);
    expect(vars['--ion-color-primary']).toBe('#00aaff');
  });

  it('does not put background tokens in the brand-color vars', () => {
    // Backgrounds are mode-dependent and handled by paletteBackgroundVars.
    const vars = paletteToCssVars(getPalette('databus'));
    expect(vars['--ion-background-color']).toBeUndefined();
  });
});

describe('paletteBackgroundVars', () => {
  const palette: Palette = {
    id: 't',
    name: 'T',
    primary: '#0a84ff',
    secondary: '#0b1f33',
    tertiary: '#30c8c9',
    background: '#eef4fb',
    backgroundDark: '#0a1420',
  };

  it('uses the light background and dark text in light mode', () => {
    const vars = paletteBackgroundVars(palette, false);
    expect(vars['--ion-background-color']).toBe('#eef4fb');
    expect(vars['--ion-text-color']).toBe('#1f2421');
    // Surfaces + toolbar/tab-bar/card/item all get set so the app recolors.
    expect(vars['--ion-item-background']).toBeDefined();
    expect(vars['--ion-toolbar-background']).toBeDefined();
    expect(vars['--ion-tab-bar-background']).toBeDefined();
    expect(vars['--ion-card-background']).toBeDefined();
  });

  it('uses the dark background and light text in dark mode', () => {
    const vars = paletteBackgroundVars(palette, true);
    expect(vars['--ion-background-color']).toBe('#0a1420');
    expect(vars['--ion-text-color']).toBe('#f4f6f5');
  });

  it('falls back to the light background in dark mode when backgroundDark is absent', () => {
    const noDark: Palette = { ...palette, backgroundDark: undefined };
    expect(paletteBackgroundVars(noDark, true)['--ion-background-color']).toBe('#eef4fb');
  });

  it('returns nothing when the palette defines no background', () => {
    const bare: Palette = {
      id: 'x',
      name: 'X',
      primary: '#0a84ff',
      secondary: '#0b1f33',
      tertiary: '#30c8c9',
    };
    expect(paletteBackgroundVars(bare, false)).toEqual({});
    expect(paletteBackgroundVars(bare, true)).toEqual({});
  });
});

describe('getPalette', () => {
  it('falls back to the default palette for an unknown id', () => {
    expect(getPalette('does-not-exist').id).toBe('databus');
    expect(getPalette(undefined).id).toBe('databus');
  });
});
