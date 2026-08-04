# Conventions

- Small, focused files; immutable store updates; explicit error handling at
  system boundaries.
- Wire types (`app/src/types/api.ts`) are verified against
  `../databus/backend/api/{urls,views,serializers}.py`; changes there should
  be reflected here in the same change.
- `plans/master-plan.md` §6 holds the frozen contracts (store/service
  signatures, telemetry seam, MQTT payload). Update it in the same change if a
  contract moves.
- Documentation lives in three places with different jobs — keep them in sync
  rather than picking one:
    - Root `README.md` / `HANDOFF.md` / `DATABUS_INTEGRATION.md` — fast-moving,
      source-of-truth facts (test counts, open backend asks, deploy status).
    - `plans/` — the frozen implementation contracts and per-agent briefs.
    - This site (`docs/`) — organized, browsable reference for onboarding;
      built with [Zensical](https://zensical.org), same tool and layout
      convention as `../databus/docs`.
