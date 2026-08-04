# Trip setup & route/trip labels

## The setup flow

Starting a run opens `TripSetupModal` (`app/src/components/trips/`): a
single-screen form — route → starting point → trip → vehicle — followed by a
**client-side-only review step**. Nothing is sent to the backend until the
operator taps "Confirmar run" on that review screen, which then calls
`create-run` and `confirm` back-to-back.

That review step is not just UX polish — it exists specifically because the
backend cannot cleanly release a run that reaches `Initialized` and is then
abandoned. See [Known issues](../backend-integration/known-issues.md) for the
backend bug this sidesteps, and
[The run lifecycle](../concepts/run-lifecycle.md) for the full state sequence.

The trip picker also **windows** the trip list to upcoming departures
(starting ~30 minutes before "now") instead of showing the full day's
schedule, and lets the operator pick a `schedule_relationship`
(`SCHEDULED`/`UNSCHEDULED`/etc.) per GTFS Realtime's
[`ScheduleRelationship`](https://gtfs.org/documentation/realtime/reference/#enum-schedulerelationship_1)
enum.

## Human-readable labels

Raw GTFS identifiers (`route_short_name`, `shape_id`, `trip_headsign`) aren't
readable to a driver on their own. `app/src/utils/labels.ts` is the single
place those become human-readable text:

- **Route short label + qualifier** — e.g. `"bUCR L1"` → `"L1"`, with a
  qualifier (`"Sin milla"` / `"Con milla"`) computed by stripping the longest
  common word-prefix shared across every route's `route_long_name`. Fully
  data-driven — nothing hardcodes the agency name.
- **Trip time** — the `HH:MM` suffix of the trip id, zero-padded so
  string-sorting stays correct.
- **True starting point** — recovered from the `desde_*` / `hacia_*` shape-id
  naming convention. A `desde_<token>` shape names its origin explicitly;
  `hacia_*` shapes only repeat their destination, so their true starting point
  is recovered as the single hub shared by every `desde_*` trip in the feed.
- **Combined trip label** — `"06:20 · desde Artes Plásticas → Deportivas"`, or
  `"07:00 · hacia Educación"` when there's no recoverable origin. That
  "hacia"/"desde" distinction is load-bearing: this label is what gets stored
  on the run and rendered on Home / RunProgress / history, where — unlike the
  trip picker — there's no group header to supply the direction.

These are pure functions with no I/O and no Vue reactivity, so they're
trivially unit-testable (`app/tests/unit/utils/labels.spec.ts`) and safe to
call from templates, stores, and other utils alike. Every function degrades to
the least-bad readable string rather than throwing — a feed that breaks the
naming convention it's built against falls back to the raw id, never to a
blank or an exception. That matters in practice: it's what keeps an *old*
run-history entry (recorded before labels existed, or from a feed that
doesn't follow the convention) rendering something useful instead of crashing
the history screen.
