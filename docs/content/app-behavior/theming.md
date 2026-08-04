# Theming & typography

## Color palettes

The operator can recolor the whole app from **Usuario → Ajustes → Tema**. A
palette is just 3 brand colors plus a light/dark page background, defined in
`src/theme/palettes.ts`:

```ts
{ id: 'ocean', name: 'Océano',
  primary: '#0a84ff', secondary: '#0b1f33', tertiary: '#30c8c9',
  background: '#eef4fb', backgroundDark: '#0a1420' }
```

That's all you author — `src/theme/applyPalette.ts` derives the full set of
Ionic CSS variables (`-rgb` / `-contrast` / `-shade` / `-tint` for each
stepped color, using Ionic's own formulas) plus the surrounding surface tokens
(item / card / toolbar / tab-bar backgrounds and text color) from the chosen
background, and writes them onto `:root` at runtime — so a palette recolors
the app with **no rebuild**. The pick is persisted in settings, applied on
boot before first paint, and re-applied live when the OS light/dark preference
changes. **To add a palette, append one entry to `PALETTES`** — nothing else.

## Typography

The theme layer also sets a typography scale using **Manrope** (self-hosted,
not loaded from Google Fonts), with tabular figures (`font-variant-numeric:
tabular-nums`) for times and other numeric displays so digits don't shift
width as they change — noticeable on the run-progress clock and trip times.

## Branding

The Databús wordmark and "b" mark live in `public/logo/`. `BrandLogo.vue`
renders the wordmark with `dark` / `light` / `auto` variants (auto follows the
OS color scheme so it stays legible on themed surfaces); it's used on the
Splash, Login and Home screens. The "b" mark is the favicon and iOS touch
icon.
