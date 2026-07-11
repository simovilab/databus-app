import { describe, expect, it } from 'vitest';
import { paletteToCssVars } from '@/theme/applyPalette';
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
    const vars = paletteToCssVars(getPalette('ocean'));
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

  it('sets background vars only when a background is provided', () => {
    const withBg: Palette = {
      id: 't',
      name: 'T',
      primary: '#0a84ff',
      secondary: '#0b1f33',
      tertiary: '#30c8c9',
      background: '#ffffff',
    };
    const withoutBg = getPalette('databus');
    expect(paletteToCssVars(withBg)['--ion-background-color']).toBe('#ffffff');
    expect(paletteToCssVars(withoutBg)['--ion-background-color']).toBeUndefined();
  });
});

describe('getPalette', () => {
  it('falls back to the default palette for an unknown id', () => {
    expect(getPalette('does-not-exist').id).toBe('databus');
    expect(getPalette(undefined).id).toBe('databus');
  });
});
