import { describe, expect, it } from 'vitest';
import {
  routeCompactLabel,
  routeQualifier,
  routeShortLabel,
  tripCompactLabel,
  tripDestination,
  tripOrigin,
  tripStartingPoint,
  tripTime,
} from '@/utils/labels';
import type { Route, Trip } from '@/types/api';

// Real bUCR feed values, verified live against localhost:8000/api
// (see plan context — do not re-derive).
const l1: Route = {
  id: 1,
  route_id: 'bUCR_L1',
  agency_id: 'bUCR',
  route_short_name: 'bUCR L1',
  route_long_name: 'Bus interno UCR sin milla',
  route_color: '00C0F3',
};
const l2: Route = {
  id: 2,
  route_id: 'bUCR_L2',
  agency_id: 'bUCR',
  route_short_name: 'bUCR L2',
  route_long_name: 'Bus interno UCR con milla',
  route_color: '005DA4',
};
const routes = [l1, l2];

function makeTrip(overrides: Partial<Trip>): Trip {
  return {
    route_id: 'bUCR_L1',
    service_id: 'entresemana',
    trip_id: 'desde_artes_sin_milla_entresemana_06:20',
    trip_headsign: 'Deportivas',
    direction_id: 0,
    shape_id: 'desde_artes_sin_milla',
    ...overrides,
  };
}

// The real L1 trip list, enough to exercise headsign resolution.
const l1Trips: Trip[] = [
  makeTrip({ trip_id: 'desde_artes_sin_milla_entresemana_06:20', trip_headsign: 'Deportivas' }),
  makeTrip({
    trip_id: 'desde_educacion_sin_milla_entresemana_06:40',
    trip_headsign: 'Deportivas',
    shape_id: 'desde_educacion_sin_milla',
  }),
  makeTrip({
    trip_id: 'hacia_educacion_entresemana_07:00',
    trip_headsign: 'Educación',
    direction_id: 1,
    shape_id: 'hacia_educacion',
  }),
  makeTrip({
    trip_id: 'hacia_artes_entresemana_07:15',
    trip_headsign: 'Artes Plásticas',
    direction_id: 1,
    shape_id: 'hacia_artes',
  }),
];

describe('routeShortLabel', () => {
  it('strips the leading agency_id token from route_short_name (real L1)', () => {
    expect(routeShortLabel(l1)).toBe('L1');
  });

  it('strips the leading agency_id token from route_short_name (real L2)', () => {
    expect(routeShortLabel(l2)).toBe('L2');
  });

  it('returns the short name unchanged when there is no agency prefix to strip', () => {
    const route: Route = { id: 3, route_id: 'X1', route_short_name: 'X1' };
    expect(routeShortLabel(route)).toBe('X1');
  });

  it('falls back to route_id (underscored, prefix stripped) when short_name is absent', () => {
    const route: Route = { id: 4, route_id: 'bUCR_L3', agency_id: 'bUCR' };
    expect(routeShortLabel(route)).toBe('L3');
  });
});

describe('routeQualifier', () => {
  it('strips the longest common word-prefix across the route list (real L1)', () => {
    expect(routeQualifier(l1, routes)).toBe('Sin milla');
  });

  it('strips the longest common word-prefix across the route list (real L2)', () => {
    expect(routeQualifier(l2, routes)).toBe('Con milla');
  });

  it('falls back to the full route_long_name when there is no common prefix', () => {
    const a: Route = { id: 1, route_id: 'A', route_long_name: 'Norte directo' };
    const b: Route = { id: 2, route_id: 'B', route_long_name: 'Sur express' };
    expect(routeQualifier(a, [a, b])).toBe('Norte directo');
  });

  it('falls back to the full route_long_name when the common prefix swallows the whole name', () => {
    const a: Route = { id: 1, route_id: 'A', route_long_name: 'Ruta Central' };
    const b: Route = { id: 2, route_id: 'B', route_long_name: 'Ruta Central' };
    expect(routeQualifier(a, [a, b])).toBe('Ruta Central');
  });
});

describe('routeCompactLabel', () => {
  it('combines the short label and qualifier (real L1)', () => {
    expect(routeCompactLabel(l1, routes)).toBe('L1 · Sin milla');
  });
});

describe('tripTime', () => {
  it('extracts and zero-pads the HH:MM suffix (real trip)', () => {
    expect(tripTime(makeTrip({ trip_id: 'desde_artes_sin_milla_entresemana_06:20' }))).toBe(
      '06:20',
    );
  });

  it('zero-pads a single-digit hour', () => {
    expect(tripTime(makeTrip({ trip_id: 'shape_entresemana_6:20' }))).toBe('06:20');
  });

  it('falls back to the raw trip_id when there is no time suffix', () => {
    expect(tripTime(makeTrip({ trip_id: 'no_time_here' }))).toBe('no_time_here');
  });
});

describe('tripDestination', () => {
  it('is exactly trip_headsign (GTFS-defined destination)', () => {
    expect(tripDestination(makeTrip({ trip_headsign: 'Deportivas' }))).toBe('Deportivas');
  });
});

describe('tripOrigin', () => {
  it('resolves the real desde_artes_sin_milla trip to "Artes Plásticas"', () => {
    const trip = makeTrip({
      trip_id: 'desde_artes_sin_milla_entresemana_06:20',
      shape_id: 'desde_artes_sin_milla',
      trip_headsign: 'Deportivas',
    });
    expect(tripOrigin(trip, l1Trips)).toBe('Artes Plásticas');
  });

  it('resolves desde_educacion_sin_milla to "Educación"', () => {
    const trip = makeTrip({
      trip_id: 'desde_educacion_sin_milla_entresemana_06:40',
      shape_id: 'desde_educacion_sin_milla',
      trip_headsign: 'Deportivas',
    });
    expect(tripOrigin(trip, l1Trips)).toBe('Educación');
  });

  it('returns null for a hacia_* shape_id (no origin, just repeats the destination)', () => {
    const trip = makeTrip({
      trip_id: 'hacia_educacion_entresemana_07:00',
      shape_id: 'hacia_educacion',
      trip_headsign: 'Educación',
    });
    expect(tripOrigin(trip, l1Trips)).toBeNull();
  });

  it('returns null when shape_id has no desde_ prefix at all', () => {
    const trip = makeTrip({ shape_id: 'circular_route' });
    expect(tripOrigin(trip, l1Trips)).toBeNull();
  });

  it('returns null when the origin token matches no known headsign', () => {
    const trip = makeTrip({ shape_id: 'desde_nowhere' });
    expect(tripOrigin(trip, l1Trips)).toBeNull();
  });
});

describe('tripStartingPoint', () => {
  it('is exactly tripOrigin for a desde_* trip', () => {
    const trip = makeTrip({
      trip_id: 'desde_artes_sin_milla_entresemana_06:20',
      shape_id: 'desde_artes_sin_milla',
      trip_headsign: 'Deportivas',
    });
    expect(tripStartingPoint(trip, l1Trips)).toBe('Artes Plásticas');
  });

  it('resolves the shared hub for a hacia_* trip (real L1: both desde_* trips end at "Deportivas")', () => {
    const trip = makeTrip({
      trip_id: 'hacia_educacion_entresemana_07:00',
      shape_id: 'hacia_educacion',
      trip_headsign: 'Educación',
    });
    expect(tripStartingPoint(trip, l1Trips)).toBe('Deportivas');
  });

  it('resolves the other hacia_* trip to the same hub, not its own headsign', () => {
    const trip = makeTrip({
      trip_id: 'hacia_artes_entresemana_07:15',
      shape_id: 'hacia_artes',
      trip_headsign: 'Artes Plásticas',
    });
    expect(tripStartingPoint(trip, l1Trips)).toBe('Deportivas');
  });

  it('falls back to the trip\'s own destination when the feed has no desde_* trips at all', () => {
    const feed = [
      makeTrip({ trip_id: 'hacia_a', shape_id: 'hacia_a', trip_headsign: 'A' }),
      makeTrip({ trip_id: 'hacia_b', shape_id: 'hacia_b', trip_headsign: 'B' }),
    ];
    expect(tripStartingPoint(feed[0], feed)).toBe('A');
  });

  it('falls back to the trip\'s own destination when desde_* trips disagree on the hub', () => {
    const feed = [
      // Token 'artes' resolves against the 'Artes Plásticas' headsign supplied
      // by the hacia_artes trip below; this trip's own destination is 'HubA'.
      makeTrip({ trip_id: 'desde_artes_x', shape_id: 'desde_artes', trip_headsign: 'HubA' }),
      makeTrip({
        trip_id: 'hacia_artes_x',
        shape_id: 'hacia_artes',
        trip_headsign: 'Artes Plásticas',
        direction_id: 1,
      }),
      // Token 'educacion' resolves against 'Educación' below; own destination
      // is 'HubB' — a different hub than the first pair.
      makeTrip({ trip_id: 'desde_educacion_x', shape_id: 'desde_educacion', trip_headsign: 'HubB' }),
      makeTrip({
        trip_id: 'hacia_educacion_x',
        shape_id: 'hacia_educacion',
        trip_headsign: 'Educación',
        direction_id: 1,
      }),
      makeTrip({ trip_id: 'hacia_c', shape_id: 'hacia_c', trip_headsign: 'C', direction_id: 1 }),
    ];
    expect(tripStartingPoint(feed[4], feed)).toBe('C');
  });
});

describe('tripCompactLabel', () => {
  it('renders the real desde_artes_sin_milla_entresemana_06:20 trip', () => {
    const trip = makeTrip({
      trip_id: 'desde_artes_sin_milla_entresemana_06:20',
      shape_id: 'desde_artes_sin_milla',
      trip_headsign: 'Deportivas',
    });
    expect(tripCompactLabel(trip, l1Trips)).toBe('06:20 · desde Artes Plásticas → Deportivas');
  });

  // A hacia_* shape carries no origin, but the label must still say which way
  // the trip runs — this string is rendered on Home/RunProgress/history, where
  // there is no group header to supply the direction.
  it('falls back to "hacia <destino>" for a trip with no recoverable origin', () => {
    const trip = makeTrip({
      trip_id: 'hacia_educacion_entresemana_07:00',
      shape_id: 'hacia_educacion',
      trip_headsign: 'Educación',
    });
    expect(tripCompactLabel(trip, l1Trips)).toBe('07:00 · hacia Educación');
  });
});
