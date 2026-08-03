// The single place any raw GTFS identifier becomes human-readable text for a
// driver. Pure functions only — no I/O, no Vue reactivity — so this module is
// trivially unit-testable and safe to call from templates, stores, and other
// utils alike (plan: readable-labels-and-typography.md §1).
//
// Every function here returns the least-bad readable string rather than
// throwing — a feed that breaks the naming convention it's built against
// degrades to the raw ID (or the fullest string available), never to a blank
// or an exception. That degrade path matters in practice: it's exactly what
// keeps an *old* run-history entry (recorded before labels existed, or from a
// feed that doesn't follow the desde_/hacia_ convention) rendering something
// useful instead of crashing the history screen.
import type { Route, Trip } from '@/types/api';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** Diacritic-insensitive, case-insensitive fold, e.g. "Educación" → "educacion". */
function foldAccents(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function capitalize(value: string): string {
  if (value.length === 0) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Strips a leading `token` from `text` (case-insensitive), provided the token
 * is followed by whitespace/underscore so it can't chop mid-word (e.g. token
 * "bUCR" must not match inside "bUCRSomething"). Returns null when there is no
 * token to strip against, or the token doesn't actually prefix the text — the
 * caller decides the fallback in either case.
 */
function stripLeadingToken(text: string, token: string | undefined): string | null {
  const trimmed = text.trim();
  if (!token) return null;
  const re = new RegExp(`^${escapeRegExp(token)}[\\s_]+`, 'i');
  if (!re.test(trimmed)) return null;
  const stripped = trimmed.replace(re, '').trim();
  return stripped.length > 0 ? stripped : null;
}

// ---------------------------------------------------------------------------
// Route labels
// ---------------------------------------------------------------------------

/**
 * "bUCR L1" → "L1". Strips the leading `agency_id` token from
 * `route_short_name`. Falls back to `route_id` with the same prefix stripped
 * and `_` → space (e.g. "bUCR_L1" → "L1") when `route_short_name` is absent
 * or doesn't carry the agency prefix. If there's no `agency_id` to strip
 * against at all, the raw short name (or spaced route_id) is returned as-is —
 * still readable, just not shortened.
 */
export function routeShortLabel(route: Route): string {
  const agencyId = typeof route.agency_id === 'string' ? route.agency_id : undefined;

  if (route.route_short_name) {
    const stripped = stripLeadingToken(route.route_short_name, agencyId);
    if (stripped) return stripped;
    return route.route_short_name.trim();
  }

  const spacedId = route.route_id.replace(/_/g, ' ').trim();
  const strippedId = stripLeadingToken(spacedId, agencyId);
  return strippedId ?? spacedId;
}

/**
 * Longest common whitespace-delimited word prefix shared by every entry in
 * `wordLists`, compared accent/case-insensitively. Returns 0 when the lists
 * are empty or share no leading word.
 */
function longestCommonWordPrefixLength(wordLists: string[][]): number {
  if (wordLists.length === 0) return 0;
  const minLen = Math.min(...wordLists.map((words) => words.length));
  let i = 0;
  for (; i < minLen; i++) {
    const candidate = foldAccents(wordLists[0][i]);
    const allMatch = wordLists.every((words) => foldAccents(words[i]) === candidate);
    if (!allMatch) break;
  }
  return i;
}

/**
 * "Bus interno UCR sin milla" → "Sin milla", computed by stripping the
 * longest common word-prefix shared across every `route_long_name` in `all`
 * (so this is entirely data-driven — nothing here hardcodes "Bus interno
 * UCR"). Falls back to the full `route_long_name` when the common prefix is
 * empty or swallows the whole name (nothing meaningful left to show).
 */
export function routeQualifier(route: Route, all: Route[]): string {
  const longName = route.route_long_name?.trim();
  if (!longName) return route.route_long_name ?? '';

  const longNames = all
    .map((r) => r.route_long_name)
    .filter((n): n is string => typeof n === 'string' && n.trim().length > 0);
  if (longNames.length === 0) return longName;

  const wordLists = longNames.map((n) => n.trim().split(/\s+/));
  const prefixLen = longestCommonWordPrefixLength(wordLists);

  const targetWords = longName.split(/\s+/);
  if (prefixLen === 0 || prefixLen >= targetWords.length) return longName;

  return capitalize(targetWords.slice(prefixLen).join(' '));
}

/** "L1 · Sin milla" — the combined route label used everywhere in the UI. */
export function routeCompactLabel(route: Route, all: Route[]): string {
  return `${routeShortLabel(route)} · ${routeQualifier(route, all)}`;
}

// ---------------------------------------------------------------------------
// Trip labels
// ---------------------------------------------------------------------------

const TIME_SUFFIX_RE = /(\d{1,2}):(\d{2})(?::\d{2})?$/;

/**
 * "…_06:10" → "06:10". Moved from TripSetupModal (formerly `tripLabel`) and
 * zero-padded so string-sorting stays correct even against a feed that isn't
 * already zero-padded (e.g. "6:10" would otherwise sort after "12:00").
 * Falls back to the raw trip_id when it has no recognizable time suffix.
 */
export function tripTime(trip: Trip): string {
  const match = trip.trip_id.match(TIME_SUFFIX_RE);
  if (!match) return trip.trip_id;
  const [, hours, minutes] = match;
  return `${hours.padStart(2, '0')}:${minutes}`;
}

/**
 * The trip's destination — GTFS defines `trip_headsign` as exactly that (see
 * plan context: this is the semantic fact the whole feature rests on).
 */
export function tripDestination(trip: Trip): string {
  return trip.trip_headsign?.trim() ?? '';
}

/**
 * The trip's origin, recovered from `shape_id`. A `desde_<token>` shape names
 * its origin explicitly; `<token>` is resolved to a real display name by
 * accent/case-insensitively prefix-matching it against the `trip_headsign`
 * values actually present in `feed` (so the origin uses the feed's own
 * spelling — "Artes Plásticas" — instead of a guessed Title Case). A
 * `hacia_*` shape only repeats its destination and carries no origin, so this
 * returns null for those, and for any shape_id that doesn't match the
 * desde_ convention or whose token matches no known headsign.
 */
export function tripOrigin(trip: Trip, feed: Trip[]): string | null {
  const match = trip.shape_id.match(/^desde_([^_]+)/i);
  if (!match) return null;

  const foldedToken = foldAccents(match[1]);
  const headsigns = Array.from(
    new Set(
      feed
        .map((t) => t.trip_headsign)
        .filter((h): h is string => typeof h === 'string' && h.trim().length > 0),
    ),
  );

  const resolved = headsigns.find((h) => foldAccents(h).startsWith(foldedToken));
  return resolved ?? null;
}

/**
 * The trip's true starting point — where the driver/rider actually boards —
 * as opposed to `tripDestination`, which is where the trip ends. `tripOrigin`
 * covers `desde_*` shapes directly; a `hacia_*` shape carries no origin of
 * its own, but real feeds pair every `hacia_X` return leg with a `desde_Y`
 * outbound leg that shares one common destination — the hub `hacia_*` trips
 * depart from (verified against the real bUCR L1 feed: both its desde_*
 * trips terminate at "Deportivas", which is exactly where its hacia_* trips
 * start). That hub is recovered here as the single destination shared by
 * every trip in `feed` that DOES have a resolvable origin. Falls back to the
 * trip's own destination (i.e. behaves like tripDestination) only when the
 * feed doesn't follow that hub convention — no desde_* trips at all, or more
 * than one distinct hub — since a wrong-but-real place name beats crashing
 * or a blank starting-point picker.
 */
export function tripStartingPoint(trip: Trip, feed: Trip[]): string {
  const origin = tripOrigin(trip, feed);
  if (origin) return origin;

  const hubs = new Set(
    feed
      .filter((t) => tripOrigin(t, feed) !== null)
      .map((t) => tripDestination(t))
      .filter((h) => h.length > 0),
  );
  return hubs.size === 1 ? [...hubs][0] : tripDestination(trip);
}

/**
 * "06:20 · desde Artes Plásticas → Deportivas", or "07:00 · hacia Educación"
 * when the trip has no recoverable origin (a hacia_* shape).
 *
 * The "hacia" in that second form is load-bearing, not filler. This label is
 * what gets stored on the run and rendered on Home / RunProgress / history,
 * where — unlike the trip picker — there is no "Hacia <destino>" group header
 * overhead to supply the direction. A bare "07:00 · Educación" there reads
 * exactly as ambiguously as the raw headsign did (start point or end point?),
 * which is the whole thing this module exists to fix.
 */
export function tripCompactLabel(trip: Trip, feed: Trip[]): string {
  const time = tripTime(trip);
  const destination = tripDestination(trip);
  const origin = tripOrigin(trip, feed);
  return origin
    ? `${time} · desde ${origin} → ${destination}`
    : `${time} · hacia ${destination}`;
}
