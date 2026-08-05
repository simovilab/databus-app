<template>
  <!-- A single breakpoint of 1 — the sheet is always full height and never
       drag-resizable. This is load-bearing, not cosmetic. A sheet modal's
       .modal-wrapper is always ~full viewport height (`--height: calc(100% -
       …)`, `position:absolute; bottom:0`), and Ionic presents a breakpoint by
       translating that wrapper down `(1 - breakpoint) * 100%` (@ionic/core
       modal/gestures/sheet.js). So at any breakpoint below 1, that fraction of
       the wrapper — ion-footer and its button included — sits permanently below
       the viewport, and scrolling can't reach it (Ionic only re-enables
       ion-content scrolling at the *max* breakpoint, sheet.js:188). The old max
       of 0.94 pushed ~6% of the viewport (~69px, taller than a 56px toolbar)
       off-screen, which is why "Initialize run" was invisible once the
       three-section form filled the sheet.
       Keeping 0 out of the array also means dragging can't dismiss the sheet
       (modal.js:786 gates drag-dismiss on `breakpoints[0] === 0`), which is
       what `backdrop-dismiss="false"` already intends: a driver mid-setup
       should only leave via Cancel. -->
  <ion-modal
    class="sheet-modal"
    :is-open="isOpen"
    :backdrop-dismiss="false"
    :breakpoints="[1]"
    :initial-breakpoint="1"
    :handle="false"
    role="dialog"
    aria-label="Iniciar una carrera"
    @did-dismiss="onDismiss"
  >
    <ion-header>
      <ion-toolbar>
        <ion-title>Iniciar carrera</ion-title>
        <ion-buttons slot="end">
          <ion-button
            data-testid="modal-close"
            :disabled="busy"
            @click="onCancel"
          >Cancelar</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding modal-body">
      <Transition name="check-pop">
        <div v-if="justConfirmed" class="confirm-pulse" aria-hidden="true">
          <ion-icon :icon="checkmarkCircle" color="success" />
          <p>Carrera iniciada</p>
        </div>
      </Transition>

      <app-loading
        v-if="!justConfirmed && phase === 'setup' && initialLoading"
        message="Cargando horario…"
      />
      <app-error
        v-else-if="!justConfirmed && phase === 'setup' && initialError"
        :error="initialError"
        fallback-message="No se pudo cargar el horario. Intente de nuevo."
        retry-label="Reintentar"
        @retry="loadInitial"
      />

      <template v-else-if="!justConfirmed && phase === 'setup'">
        <!-- Route -->
        <section class="setup-section">
          <h2 class="step-title">1. Seleccione una ruta</h2>
          <p v-if="routes.length === 0" class="step-empty">No hay rutas disponibles para hoy.</p>
          <ion-list v-else>
            <ion-radio-group
              v-model="selectedRouteId"
              allow-empty-selection
            >
              <ion-item
                v-for="route in routes"
                :key="route.route_id"
                data-testid="route-option"
              >
                <ion-radio
                  :value="route.route_id"
                  label-placement="end"
                  justify="start"
                >
                  <ion-label class="route-option-label">
                    <span
                      class="route-dot"
                      :style="{ backgroundColor: routeDotColor(route) }"
                      aria-hidden="true"
                    />
                    <h2>{{ routeCompactLabel(route, routes) }}</h2>
                  </ion-label>
                </ion-radio>
              </ion-item>
            </ion-radio-group>
          </ion-list>
        </section>

        <!-- Trip (a GTFS trip carries its own direction + shape, so there is
             no separate direction picker — see services/schedule.ts). Loads
             as soon as a route is selected, without leaving this screen.
             Two-tier: first the starting point — tripStartingPoint()
             resolves a trip's true boarding location (src/utils/labels.ts);
             a desde_* trip's own shape names it directly, but a hacia_* trip
             carries no origin of its own, so it falls back to the shared hub
             its desde_* siblings converge on — then, once picked, a flat,
             time-ordered list of that direction's trips windowed to start 30
             minutes before "now" (America/Costa_Rica), capped to a ~5-row
             scrollable box (see .trip-list below) instead of the full day's
             schedule. -->
        <section class="setup-section">
          <h2 class="step-title">2. Seleccione un viaje</h2>
          <p v-if="!selectedRouteId" class="step-empty">Seleccione una ruta primero.</p>
          <app-loading v-else-if="tripsLoading" message="Cargando viajes…" />
          <app-error
            v-else-if="tripsError"
            :error="tripsError"
            fallback-message="No se pudieron cargar los viajes. Intente de nuevo."
            retry-label="Reintentar"
            @retry="loadTrips"
          />
          <template v-else>
            <p v-if="trips.length === 0" class="step-empty">No hay viajes programados para esta ruta hoy.</p>
            <template v-else>
              <h3 class="substep-title">Punto de partida</h3>
              <ion-list>
                <ion-radio-group
                  v-model="selectedStartingPoint"
                  allow-empty-selection
                >
                  <ion-item
                    v-for="group in tripGroups"
                    :key="group.startingPoint"
                    data-testid="starting-point-option"
                  >
                    <ion-radio
                      :value="group.startingPoint"
                      label-placement="end"
                      justify="start"
                    >
                      <ion-label>{{ group.startingPoint }}</ion-label>
                    </ion-radio>
                  </ion-item>
                </ion-radio-group>
              </ion-list>

              <template v-if="selectedStartingPoint">
                <h3 class="substep-title">Hora de salida</h3>
                <p v-if="upcomingTrips.length === 0" class="step-empty">No quedan viajes programados por hoy.</p>
                <ion-list v-else class="trip-list">
                  <ion-radio-group
                    v-model="selectedTripId"
                    allow-empty-selection
                  >
                    <ion-item
                      v-for="trip in upcomingTrips"
                      :key="trip.trip_id"
                      data-testid="trip-option"
                    >
                      <ion-radio
                        :value="trip.trip_id"
                        label-placement="end"
                        justify="start"
                      >
                        <ion-label>
                          <h2 class="tnum">{{ tripTime(trip) }}</h2>
                        </ion-label>
                      </ion-radio>
                    </ion-item>
                  </ion-radio-group>
                </ion-list>

                <ion-item lines="none" class="schedule-relationship-item">
                  <ion-select
                    v-model="scheduleRelationship"
                    label="Tipo de viaje"
                    label-placement="stacked"
                    interface="popover"
                    data-testid="schedule-relationship-select"
                  >
                    <ion-select-option
                      v-for="option in scheduleRelationshipOptions"
                      :key="option"
                      :value="option"
                    >{{ option }}</ion-select-option>
                  </ion-select>
                </ion-item>
              </template>
            </template>
          </template>
        </section>

        <!-- Vehicle -->
        <section class="setup-section">
          <h2 class="step-title">3. Seleccione un vehículo</h2>
          <ion-toggle
            v-model="manualVehicle"
            data-testid="vehicle-manual-toggle"
          >Ingresar ID de vehículo manualmente</ion-toggle>

          <ion-list v-if="!manualVehicle">
            <p v-if="vehicles.length === 0" class="step-empty">
              No hay vehículos listados. Active la entrada manual para escribir un ID.
            </p>
            <ion-radio-group
              v-model="selectedVehicleId"
              allow-empty-selection
            >
              <ion-item
                v-for="vehicle in vehicles"
                :key="vehicle.id"
                data-testid="vehicle-option"
              >
                <ion-radio
                  :value="vehicle.id"
                  label-placement="end"
                  justify="start"
                >
                  <ion-label>
                    <h2 class="tnum">{{ vehicle.id }}</h2>
                    <p class="tnum">{{ vehicle.license_plate }}</p>
                  </ion-label>
                </ion-radio>
              </ion-item>
            </ion-radio-group>
          </ion-list>

          <ion-item v-if="manualVehicle">
            <ion-input
              v-model="manualVehicleId"
              data-testid="vehicle-manual-input"
              label="ID de vehículo"
              label-placement="stacked"
              placeholder="ej. BUS-001"
            />
          </ion-item>
        </section>

        <app-error
          v-if="confirmError"
          class="setup-section confirm-error"
          data-testid="confirm-error"
          :error="confirmError"
          fallback-message="No se pudo iniciar la carrera. Intente de nuevo."
        />
      </template>

      <!-- Review: purely a client-side preview — no run exists server-side
           yet. Backing out (Back, header Cancel, swipe-dismiss) is just a
           local state reset; only "Confirm run" below ever calls the
           backend. -->
      <template v-else-if="!justConfirmed && phase === 'reviewing'">
        <section class="setup-section">
          <h2 class="step-title">Revise su carrera</h2>
          <p class="step-empty">Confirme estos detalles antes de empezar a conducir.</p>
        </section>

        <ion-list data-testid="review-summary">
          <ion-item>
            <ion-label>
              <p>Ruta</p>
              <h2>{{ selectedRoute ? routeCompactLabel(selectedRoute, routes) : '' }}</h2>
            </ion-label>
          </ion-item>
          <ion-item>
            <ion-label>
              <p>Viaje</p>
              <h2 class="tnum">{{ selectedTrip ? tripCompactLabel(selectedTrip, trips) : '' }}</h2>
            </ion-label>
          </ion-item>
          <ion-item>
            <ion-label>
              <p>Tipo de viaje</p>
              <h2>{{ scheduleRelationship }}</h2>
            </ion-label>
          </ion-item>
          <ion-item lines="none">
            <ion-label>
              <p>Vehículo</p>
              <h2 class="tnum">{{ vehicleId }}</h2>
            </ion-label>
          </ion-item>
        </ion-list>

        <app-error
          v-if="confirmError"
          class="setup-section confirm-error"
          data-testid="confirm-error"
          :error="confirmError"
          fallback-message="No se pudo iniciar la carrera. Intente de nuevo."
        />
      </template>
    </ion-content>

    <ion-footer>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button
            v-if="phase === 'reviewing' && !justConfirmed"
            data-testid="review-back"
            :disabled="busy"
            @click="onBackFromReview"
          >Atrás</ion-button>
        </ion-buttons>
        <ion-buttons slot="end">
          <ion-button
            v-if="phase === 'setup'"
            data-testid="initialize-run"
            color="primary"
            :disabled="!canConfirm || busy"
            @click="onInitialize"
          >
            <ion-spinner v-if="busy" name="crescent" slot="start" />
            Revisar carrera
          </ion-button>
          <ion-button
            v-else
            data-testid="confirm-run"
            color="primary"
            :disabled="busy"
            @click="onConfirmReview"
          >
            <ion-spinner v-if="busy" name="crescent" slot="start" />
            Confirmar carrera
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-footer>
  </ion-modal>
</template>

<script setup lang="ts">
// Trip setup: a single screen with route, trip, and vehicle pickers all
// visible at once (route → trip → vehicle, services/schedule.ts), rather
// than a stepper. "Initialize run" is a client-side-only step — it validates
// the selection and shows a review summary; nothing is sent to the backend
// yet. Only "Confirm run" on the review screen actually calls
// runStore.createRun() (create-run + confirm-by-operator + telemetry start,
// back to back). This is deliberate, not just a naming choice: the backend
// has no cancel_run transition from Initialized (only from
// Confirmed/Tracking — reproduced live, deploy/DATABUS_INTEGRATION.md B4), so
// a run must never be created until the operator has already committed to
// it — otherwise "Back" or closing the sheet would leave an unconfirmable,
// uncancellable run stuck server-side, permanently binding the operator,
// vehicle, and trip. A GTFS trip already carries its direction_id and
// shape_id, so picking a trip determines both — there is no separate
// direction picker. All failures surface as ApiError and render via
// <AppError>.
import {
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonRadio,
  IonRadioGroup,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonTitle,
  IonToggle,
  IonToolbar,
} from '@ionic/vue';
import { checkmarkCircle } from 'ionicons/icons';
import { computed, ref, watch } from 'vue';
import AppError from '@/components/ui/AppError.vue';
import AppLoading from '@/components/ui/AppLoading.vue';
import { useAuthStore } from '@/stores/auth';
import { useRunStore } from '@/stores/run';
import { getRoutes, getTrips, getVehicles } from '@/services/schedule';
import { ApiError } from '@/services/apiClient';
import {
  routeCompactLabel,
  tripCompactLabel,
  tripStartingPoint,
  tripTime,
} from '@/utils/labels';
import type { CreateRunInput, Route, ScheduleRelationship, Trip, Vehicle } from '@/types/api';

/** True when the OS asks apps to minimize motion. Used only to skip the
 * purely decorative "run started" pulse delay below — createRun() has
 * already resolved by the time this is checked, so the run itself always
 * starts regardless of this. */
function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

type Phase = 'setup' | 'reviewing';

const props = defineProps<{ isOpen: boolean }>();
const emit = defineEmits<{
  (e: 'dismissed'): void;
}>();

const authStore = useAuthStore();
const runStore = useRunStore();

const phase = ref<Phase>('setup');
const justConfirmed = ref(false);
const initialLoading = ref(false);
const initialError = ref<unknown>(null);
const tripsLoading = ref(false);
const tripsError = ref<unknown>(null);
const confirmError = ref<unknown>(null);
const busy = ref(false);

const routes = ref<Route[]>([]);
const trips = ref<Trip[]>([]);
const vehicles = ref<Vehicle[]>([]);

const selectedRouteId = ref<string | null>(null);
const selectedStartingPoint = ref<string | null>(null);
const selectedTripId = ref<string | null>(null);
const selectedVehicleId = ref<string | null>(null);

const scheduleRelationshipOptions: ScheduleRelationship[] = [
  'SCHEDULED',
  'ADDED',
  'UNSCHEDULED',
  'CANCELED',
  'DUPLICATED',
  'DELETED',
];
const scheduleRelationship = ref<ScheduleRelationship>('SCHEDULED');

const manualVehicle = ref(false);
const manualVehicleId = ref('');

// The reviewed-but-not-yet-submitted run input — nothing is sent to the
// backend until onConfirmReview() runs. Built by onInitialize(), read by
// onConfirmReview(); cleared on reset.
const pendingInput = ref<CreateRunInput | null>(null);
// The driver-facing labels for that same pending run — computed once here
// (same source data as the review screen) and carried into createRun() as
// its second argument, since tripId/shapeId alone can never recover the
// destination later (readable-labels plan §3).
const pendingLabels = ref<{ route: string; trip: string } | null>(null);

const selectedRoute = computed(
  () => routes.value.find((r) => r.route_id === selectedRouteId.value) ?? null,
);
const selectedTrip = computed(
  () => trips.value.find((t) => t.trip_id === selectedTripId.value) ?? null,
);

/** One "starting point" option — trips grouped by tripStartingPoint() (see
 * src/utils/labels.ts). Sorted alphabetically for a deterministic order. */
interface TripGroup {
  startingPoint: string;
  trips: Trip[];
}

const tripGroups = computed<TripGroup[]>(() => {
  const byStartingPoint = new Map<string, Trip[]>();
  for (const trip of trips.value) {
    const startingPoint = tripStartingPoint(trip, trips.value);
    const group = byStartingPoint.get(startingPoint);
    if (group) group.push(trip);
    else byStartingPoint.set(startingPoint, [trip]);
  }
  return Array.from(byStartingPoint.entries())
    .map(([startingPoint, groupTrips]) => ({ startingPoint, trips: groupTrips }))
    .sort((a, b) => a.startingPoint.localeCompare(b.startingPoint, 'es'));
});

/**
 * Minutes since midnight, "now", in America/Costa_Rica — independent of the
 * device's own timezone. Intl.DateTimeFormat (rather than a fixed UTC-6
 * offset) so this stays correct across any DST-like quirks in that zone.
 */
function costaRicaMinutesNow(): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Costa_Rica',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
  return hour * 60 + minute;
}

/** "06:10" → 370. Trips whose id carries no recognizable time (tripTime's
 * fallback to the raw trip_id) sort last, never filtered out by the window
 * below — better to show an unparseable trip than silently hide it. */
function tripTimeMinutes(trip: Trip): number {
  const match = tripTime(trip).match(/^(\d{2}):(\d{2})$/);
  if (!match) return Infinity;
  return Number(match[1]) * 60 + Number(match[2]);
}

/**
 * The selected starting point's trips, flat and time-ordered, windowed to
 * start 30 minutes before "now" (Costa Rica time) so a 123-row day's
 * schedule collapses to the handful of trips actually relevant right now.
 * Clamped at 0 rather than wrapping past midnight — a deliberate
 * simplification, not a bug: the schedule doesn't run through midnight in
 * practice. Empty until a starting point is chosen.
 */
const upcomingTrips = computed<Trip[]>(() => {
  if (!selectedStartingPoint.value) return [];
  const windowStart = Math.max(0, costaRicaMinutesNow() - 30);
  return trips.value
    .filter((trip) => tripStartingPoint(trip, trips.value) === selectedStartingPoint.value)
    .filter((trip) => tripTimeMinutes(trip) >= windowStart)
    .sort((a, b) => tripTimeMinutes(a) - tripTimeMinutes(b));
});

/** `route_color` is a bare hex triplet per GTFS ("00C0F3"); CSS needs the
 * leading '#'. Falls back to a neutral grey when the feed omits it. */
function routeDotColor(route: Route): string {
  const color = typeof route.route_color === 'string' ? route.route_color.trim() : '';
  return color ? `#${color.replace(/^#/, '')}` : 'var(--ion-color-medium)';
}

const vehicleId = computed(() =>
  manualVehicle.value
    ? manualVehicleId.value.trim()
    : selectedVehicleId.value ?? '',
);

const canConfirm = computed(
  () => !!selectedRouteId.value && !!selectedTripId.value && vehicleId.value.length > 0,
);

function resetState(): void {
  phase.value = 'setup';
  justConfirmed.value = false;
  initialLoading.value = false;
  initialError.value = null;
  tripsLoading.value = false;
  tripsError.value = null;
  confirmError.value = null;
  busy.value = false;
  routes.value = [];
  trips.value = [];
  vehicles.value = [];
  selectedRouteId.value = null;
  selectedStartingPoint.value = null;
  selectedTripId.value = null;
  selectedVehicleId.value = null;
  scheduleRelationship.value = 'SCHEDULED';
  manualVehicle.value = false;
  manualVehicleId.value = '';
  pendingInput.value = null;
  pendingLabels.value = null;
}

/** Load routes + vehicles on modal open. */
watch(
  () => props.isOpen,
  async (open) => {
    if (!open) return;
    resetState();
    await loadInitial();
  },
  { immediate: false },
);

async function loadInitial(): Promise<void> {
  initialError.value = null;
  initialLoading.value = true;
  try {
    const [loadedRoutes, loadedVehicles] = await Promise.all([
      getRoutes(),
      getVehicles(),
    ]);
    routes.value = loadedRoutes;
    vehicles.value = loadedVehicles;
  } catch (err) {
    initialError.value = err;
  } finally {
    initialLoading.value = false;
  }
}

/** Load trips for the selected route as soon as it's picked — the operator
 * never leaves this screen, so this just fills in section 2 in place. */
watch(selectedRouteId, (routeId) => {
  selectedStartingPoint.value = null;
  selectedTripId.value = null;
  trips.value = [];
  if (routeId) void loadTrips(routeId);
});

/** Picking a different starting point invalidates whatever trip was picked
 * under the old one. */
watch(selectedStartingPoint, () => {
  selectedTripId.value = null;
});

async function loadTrips(routeIdOverride?: string): Promise<void> {
  const routeId = routeIdOverride ?? selectedRouteId.value;
  if (!routeId) return;
  tripsError.value = null;
  tripsLoading.value = true;
  try {
    // Raw, unsorted — tripGroups (computed above) handles grouping by
    // destination and sorting within each group by departure time.
    trips.value = await getTrips(routeId);
  } catch (err) {
    tripsError.value = err;
  } finally {
    tripsLoading.value = false;
  }
}

function onCancel(): void {
  emit('dismissed');
}

function onDismiss(): void {
  emit('dismissed');
}

/** True when the caught error is an ApiError carrying the create-run step. */
function isCreateRunError(err: unknown): err is ApiError {
  return err instanceof ApiError;
}

/** Turns a caught error into the message shown via <AppError>. */
function toConfirmError(err: unknown, fallbackStep: string): Error {
  if (isCreateRunError(err)) {
    // Surface the backend's actual reason (e.g. "Operator 'op-demo' is
    // already assigned to run …") instead of the opaque validation step.
    const detail = extractApiErrorDetail(err);
    return new Error(detail ?? `No se pudo ${fallbackStep} (paso "${err.step ?? 'desconocido'}").`);
  }
  if (err instanceof Error) return err;
  return new Error(`No se pudo ${fallbackStep}. Intente de nuevo.`);
}

/** Step 1: validate the selection and move to the review screen. Purely
 * client-side — nothing is sent to the backend here, so there is nothing to
 * release if the operator backs out or closes the sheet from this point on. */
function onInitialize(): void {
  const operatorId = authStore.session?.operatorId;
  if (!operatorId) {
    confirmError.value = new Error('No hay sesión de operador. Inicie sesión de nuevo.');
    return;
  }
  if (!selectedRoute.value || !selectedTrip.value) {
    confirmError.value = new Error('Faltan detalles de la carrera. Reinicie la selección.');
    return;
  }
  if (!vehicleId.value) {
    confirmError.value = new Error('Se requiere un vehículo para iniciar la carrera.');
    return;
  }

  confirmError.value = null;
  // direction_id and shape_id come from the selected trip — the trip is the
  // authoritative route+direction+shape bundle (see services/schedule.ts).
  pendingInput.value = {
    vehicle_id: vehicleId.value,
    operator_id: operatorId,
    route_id: selectedRoute.value.route_id,
    trip_id: selectedTrip.value.trip_id,
    direction_id: selectedTrip.value.direction_id,
    shape_id: selectedTrip.value.shape_id,
    schedule_relationship: scheduleRelationship.value,
  };
  // Same label functions/data as the review screen below, computed once here
  // so createRun() can carry them onto ActiveRun (readable-labels plan §3).
  pendingLabels.value = {
    route: routeCompactLabel(selectedRoute.value, routes.value),
    trip: tripCompactLabel(selectedTrip.value, trips.value),
  };
  phase.value = 'reviewing';
}

/** Step 2: the operator accepts the reviewed run — this is the only point
 * that actually calls the backend (create-run + confirm + telemetry start,
 * master §6.6). The run has fully started once this resolves — everything
 * from here down is a purely decorative confirmation before closing the
 * sheet. */
async function onConfirmReview(): Promise<void> {
  if (!pendingInput.value || !pendingLabels.value) return;

  confirmError.value = null;
  busy.value = true;
  try {
    await runStore.createRun(pendingInput.value, pendingLabels.value);
    pendingInput.value = null;
    pendingLabels.value = null;
    justConfirmed.value = true;
    const pulseMs = prefersReducedMotion() ? 0 : 700;
    setTimeout(() => {
      busy.value = false;
      emit('dismissed');
    }, pulseMs);
  } catch (err) {
    confirmError.value = toConfirmError(err, 'iniciar la carrera');
    busy.value = false;
  }
}

/** The operator backs out of the review screen to change a selection — purely
 * client-side, since nothing was ever created server-side. */
function onBackFromReview(): void {
  confirmError.value = null;
  pendingInput.value = null;
  pendingLabels.value = null;
  phase.value = 'setup';
}

/**
 * Flatten an ApiError's `errors` payload into a readable sentence. The backend
 * returns per-field messages, e.g. {operator_id: "Operator 'x' is already
 * assigned to run y"} or {detail: "…"}. Returns undefined when nothing usable
 * is present so the caller can fall back to a generic message.
 */
function extractApiErrorDetail(err: ApiError): string | undefined {
  const { errors } = err;
  if (typeof errors === 'string') return errors;
  if (!errors || typeof errors !== 'object') return undefined;
  const messages: string[] = [];
  for (const value of Object.values(errors as Record<string, unknown>)) {
    if (typeof value === 'string') messages.push(value);
    else if (Array.isArray(value)) {
      messages.push(...value.filter((v): v is string => typeof v === 'string'));
    }
  }
  return messages.length ? messages.join(' ') : undefined;
}
</script>

<style scoped>
.setup-section {
  margin-bottom: var(--app-spacing-lg, 24px);
}

.setup-section:last-child {
  margin-bottom: 0;
}

.step-title {
  margin: 0 0 var(--app-spacing-sm, 8px);
  font-size: var(--app-font-size-lg);
  font-weight: var(--app-font-weight-semibold);
}

.step-empty {
  color: var(--ion-color-medium);
  font-size: var(--app-font-size-md);
}

/* The two sub-steps inside "2. Seleccione un viaje" — starting point, then
   departure time — need a lighter heading than .step-title's numbered
   sections. */
.substep-title {
  margin: var(--app-spacing-md, 16px) 0 var(--app-spacing-xs, 4px);
  font-size: var(--app-font-size-sm);
  font-weight: var(--app-font-weight-medium);
  color: var(--ion-color-medium);
}

.confirm-error {
  margin-top: 0;
}

/* Route picker: a small color-coded dot next to each route label, using the
   feed's own route_color — free readability from real data (plan §2). */
.route-option-label {
  display: flex;
  align-items: center;
  gap: var(--app-spacing-sm, 8px);
}

.route-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

/* Trip picker: windowed to trips starting ~30min before now (see
   upcomingTrips), capped to a ~5-row scrollable box instead of a full-page
   list — later trips are still reachable by scrolling, not discarded. */
.trip-list {
  max-height: 320px;
  overflow-y: auto;
}

.modal-body {
  position: relative;
}

.confirm-pulse {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--app-spacing-sm, 8px);
  background: var(--ion-background-color, #fff);
}

.confirm-pulse ion-icon {
  font-size: 3rem;
}

.confirm-pulse p {
  margin: 0;
  font-weight: 600;
}

.check-pop-enter-active {
  animation: check-pop var(--app-motion-base, 240ms) var(--app-motion-ease, ease-out);
}
.check-pop-leave-active {
  transition: opacity var(--app-motion-fast, 150ms) ease-in;
}
.check-pop-leave-to {
  opacity: 0;
}
@keyframes check-pop {
  0% {
    transform: scale(0.6);
    opacity: 0;
  }
  60% {
    transform: scale(1.1);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
