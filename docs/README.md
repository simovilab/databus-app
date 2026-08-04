# Databús App Documentation

This is the documentation site for `databus-app`, built with
[Zensical](https://zensical.org) — same tool and layout convention as
`../databus/docs`.

How to run it locally:

```bash
cd docs/
uv run zensical serve
```

If the port is taken, specify a different one:

```bash
uv run zensical serve -a localhost:8001
```

To build the static site (what CI runs, see `.github/workflows/docs.yml`):

```bash
uv run zensical build --clean
```

Output goes to `docs/site/` (gitignored).

## Layout

- `zensical.toml` — site config + explicit nav (mirrors `../databus/docs/zensical.toml`).
- `content/` — the actual docs, one directory per nav section, each with an
  `index.md` that gives a short overview and a table of the pages in it.
- `old/` — archived legacy content (Spanish, VitePress-era) superseded by this
  site; kept for reference, not part of the nav. See `../databus/docs/old/`
  for the same pattern on the backend docs.

## Source of truth

Where this site and the root `README.md` / `HANDOFF.md` / `DATABUS_INTEGRATION.md`
disagree, those root files win — this site is meant to organize and expand on
them for a docs audience, not fork their content. Update both in the same
change when a fact moves.
