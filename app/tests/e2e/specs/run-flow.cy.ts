/// <reference types="cypress" />

// Run-flow smoke (master §2.1 steps 4–13, §10 E2E). Mocks the REST API and
// the telemetry transport (WebSocket + geolocation) so it runs in CI without
// the local databus stack or a real MQTT broker. The mocked /state endpoint
// advances Confirmed → Tracking → In Progress across polls to simulate the
// server auto-advancing from published GPS, then run_completed ends the run.

const API = 'http://localhost:8000/api';

describe('Run flow — start, advance, end', () => {
  beforeEach(() => {
    // Stub the MQTT WebSocket transport so telemetry.start() never hits a
    // real broker. mqtt.js calls `new WebSocket(url)`; a mock that opens
    // immediately keeps the webRuntime in 'streaming' status.
    cy.on('window:before:load', (win) => {
      class MockWebSocket {
        static CONNECTING = 0;
        static OPEN = 1;
        static CLOSING = 2;
        static CLOSED = 3;
        readyState = 0;
        onopen: (() => void) | null = null;
        onmessage: ((ev: unknown) => void) | null = null;
        onerror: (() => void) | null = null;
        onclose: (() => void) | null = null;
        constructor(public url: string) {
          setTimeout(() => {
            this.readyState = 1;
            this.onopen?.();
          }, 0);
        }
        send(): void {}
        close(): void {
          this.readyState = 3;
          this.onclose?.();
        }
      }
      win.WebSocket = MockWebSocket as unknown as typeof WebSocket;

      // Stub geolocation so the webRuntime receives fixes (status → streaming).
      const baseFix = {
        coords: {
          latitude: 9.9363,
          longitude: -84.0474,
          accuracy: 10,
          speed: 8.3,
          heading: 180,
        },
        timestamp: Date.now(),
      };
      win.navigator.geolocation.watchPosition = (
        cb: (p: typeof baseFix) => void,
      ) => {
        cb(baseFix);
        return 1;
      };
      win.navigator.geolocation.clearWatch = () => {};
    });

    // REST API mocks (master §4.1).
    cy.intercept('POST', `${API}/login/`, {
      token: 'e2e-token',
      operator_id: 'op-e2e',
      first_name: 'E2E',
      last_name: 'Operator',
    }).as('login');

    cy.intercept('GET', `${API}/routes/`, [
      {
        id: 1,
        route_id: 'R1',
        route_short_name: '1',
        route_long_name: 'San José — Cartago',
      },
    ]).as('routes');

    // A trip carries its own direction_id + shape_id, so the modal lists trips
    // straight from /trips/?route_id= — no separate shape/direction step.
    cy.intercept('GET', `${API}/trips/*`, [
      {
        trip_id: 'hacia_cartago_SVC1_08:00',
        route_id: 'R1',
        service_id: 'SVC1',
        trip_headsign: 'Cartago',
        direction_id: 0,
        shape_id: 'SH1',
      },
    ]).as('trips');

    cy.intercept('GET', `${API}/vehicle/`, [
      { id: 'BUS-001', license_plate: 'ABC-123' },
    ]).as('vehicles');

    cy.intercept('POST', `${API}/create-run/`, {
      status: 'success',
      run_id: 'run-1',
      run_lifecycle_state: 'Initialized',
    }).as('createRun');

    // /update/ responds by event: confirm → Confirmed, run_interrupted →
    // Interrupted (the operator's manual end while the run is under way),
    // cancel_run → Cancelled.
    cy.intercept('POST', `${API}/runs/run-1/update/`, (req) => {
      const event = req.body?.event;
      const state =
        event === 'run_interrupted'
          ? 'Interrupted'
          : event === 'cancel_run'
            ? 'Cancelled'
            : 'Confirmed';
      req.reply({ status: 'success', run_lifecycle_state: state });
    }).as('update');

    // /state/ advances Confirmed → Tracking → In Progress across polls to
    // simulate the realtime-engine auto-advancing from telemetry.
    let pollCount = 0;
    const progression = ['Confirmed', 'Tracking', 'In Progress'];
    cy.intercept('GET', `${API}/runs/run-1/state/`, (req) => {
      const state = progression[Math.min(pollCount, progression.length - 1)];
      pollCount += 1;
      req.reply({ status: 'success', run_lifecycle_state: state });
    }).as('state');
  });

  it('creates a run, watches the state advance, and ends it', () => {
    // Freeze "now" at 08:15 America/Costa_Rica (14:15 UTC — Costa Rica has no
    // DST, fixed UTC-6). The trip picker windows trips to start 30 minutes
    // before "now" (TripSetupModal.vue), and the fixture trip below departs
    // at a fixed 08:00 — without a frozen clock this test would only pass
    // when actually run within that same half hour. Restricted to ['Date']
    // so real timers still drive the state-polling and confirm-pulse delay.
    cy.clock(new Date('2024-06-01T14:15:00Z').getTime(), ['Date']);

    cy.visit('/');
    cy.seedAuth();

    // --- No active run: Start run CTA opens the single-screen setup form ---
    cy.get('[data-testid="start-run-cta"]').should('be.visible').click();

    // Routes and vehicles load together as soon as the sheet opens.
    cy.wait(['@routes', '@vehicles']);
    cy.get('[data-testid="route-option"]').first().click();

    // Picking a route loads its trips in place — no page change. Starting
    // point (destination) is picked first, then the trip picker windows to
    // that direction's upcoming departures.
    cy.wait('@trips');
    cy.get('[data-testid="starting-point-option"]').first().click();
    cy.get('[data-testid="trip-option"]').first().click();

    cy.get('[data-testid="vehicle-option"]').first().click();

    // --- Step 1: Initialize — purely a client-side review step, no request yet ---
    cy.get('[data-testid="initialize-run"]').click();
    cy.get('[data-testid="review-summary"]').should('be.visible').and('contain', 'BUS-001');

    // --- Step 2: Confirm — this is what actually calls the backend
    //     (create-run + confirm-by-operator back to back) and starts telemetry ---
    cy.get('[data-testid="confirm-run"]').click();
    cy.wait('@createRun').its('request.body').should('deep.equal', {
      vehicle_id: 'BUS-001',
      operator_id: 'op-e2e',
      route_id: 'R1',
      trip_id: 'hacia_cartago_SVC1_08:00',
      direction_id: 0,
      shape_id: 'SH1',
      schedule_relationship: 'SCHEDULED',
    });
    cy.wait('@update').its('request.body').should('deep.equal', {
      event: 'run_confirmed_by_operator',
    });

    // RunProgress shows the confirmed state (from the confirm response).
    cy.get('[data-testid="run-state-badge"]').should('contain', 'Confirmed');

    // Polled /state/ advances the lifecycle on its own (the proof point).
    cy.get('[data-testid="run-state-badge"]').should('contain', 'Tracking');
    cy.get('[data-testid="run-state-badge"]').should('contain', 'In Progress');

    // --- End run: the run is In Progress, so the operator's manual end is
    //     run_interrupted (with actor_role) → terminal Interrupted state ---
    cy.get('[data-testid="end-run-button"]').click();
    cy.wait('@update').its('request.body').should('deep.equal', {
      event: 'run_interrupted',
      details: { actor_role: 'operator' },
    });
    cy.get('[data-testid="run-state-badge"]').should('contain', 'Interrupted');
    cy.get('[data-testid="run-terminal-note"]').should('be.visible');
  });
});
