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

    // /update/ responds by event: confirm → Confirmed, completed → Completed.
    cy.intercept('POST', `${API}/runs/run-1/update/`, (req) => {
      const event = req.body?.event;
      const state =
        event === 'run_completed'
          ? 'Completed'
          : event === 'run_confirmed_by_operator'
            ? 'Confirmed'
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
    cy.visit('/');
    cy.seedAuth();

    // --- No active run: Start run CTA ---
    cy.get('[data-testid="start-run-cta"]').should('be.visible').click();

    // --- Step: route ---
    cy.wait('@routes');
    cy.get('[data-testid="route-option"]').first().click();
    cy.get('[data-testid="next-button"]').click();

    // --- Step: trip (trips + vehicles loaded in parallel) ---
    cy.wait(['@trips', '@vehicles']);
    cy.get('[data-testid="trip-option"]').first().click();
    cy.get('[data-testid="next-button"]').click();

    // --- Step: vehicle → confirm ---
    cy.get('[data-testid="vehicle-option"]').first().click();
    cy.get('[data-testid="confirm-run"]').click();

    // createRun (create + confirm) resolves → RunProgress renders.
    cy.wait('@createRun').its('request.body').should('deep.equal', {
      vehicle_id: 'BUS-001',
      operator_id: 'op-e2e',
      route_id: 'R1',
      trip_id: 'hacia_cartago_SVC1_08:00',
      direction_id: 0,
      shape_id: 'SH1',
      schedule_relationship: 'SCHEDULED',
    });

    // RunProgress shows the confirmed state (from the confirm response).
    cy.get('[data-testid="run-state-badge"]').should('contain', 'Confirmed');

    // Polled /state/ advances the lifecycle on its own (the proof point).
    cy.get('[data-testid="run-state-badge"]').should('contain', 'Tracking');
    cy.get('[data-testid="run-state-badge"]').should('contain', 'In Progress');

    // --- End run → terminal state (R4) ---
    cy.get('[data-testid="end-run-button"]').click();
    cy.wait('@update').its('request.body').should('deep.equal', {
      event: 'run_completed',
    });
    cy.get('[data-testid="run-state-badge"]').should('contain', 'Completed');
    cy.get('[data-testid="run-terminal-note"]').should('be.visible');
  });
});
