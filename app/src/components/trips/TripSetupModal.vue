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
    aria-label="Iniciar un run"
    @did-dismiss="onDismiss"
  >
    <ion-header>
      <ion-toolbar>
        <ion-title>Iniciar run</ion-title>
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
          <p>Run iniciado</p>
        </div>
      </Transition>

      <app-loading
        v-if="!justConfirmed && phase === 'setup' && initialLoading"
        message="Cargando horario…"
      />
      <app-error
        v-else-if="!justConfirmed && phase === 'setup' && initialError"
        :error="initialError"
        fallback-message="No se pudo cargar el horario. Intenta de nuevo."
        retry-label="Reintentar"
        @retry="loadInitial"
      />

      <template v-else-if="!justConfirmed && phase === 'setup'">
        <!-- Route -->
        <section class="setup-section">
          <h2 class="step-title">1. Selecciona una ruta</h2>
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
             Grouped by destination (trip_headsign, the GTFS-defined
             destination) so the 3 destinations don't interleave across a
             123-row scroll — see src/utils/labels.ts and the plan's §2. -->
        <section class="setup-section">
          <h2 class="step-title">2. Selecciona un viaje</h2>
          <p v-if="!selectedRouteId" class="step-empty">Selecciona una ruta primero.</p>
          <app-loading v-else-if="tripsLoading" message="Cargando viajes…" />
          <app-error
            v-else-if="tripsError"
            :error="tripsError"
            fallback-message="No se pudieron cargar los viajes. Intenta de nuevo."
            retry-label="Reintentar"
            @retry="loadTrips"
          />
          <template v-else>
            <p v-if="trips.length === 0" class="step-empty">No hay viajes programados para esta ruta hoy.</p>
            <ion-list v-else>
              <ion-radio-group
                v-model="selectedTripId"
                allow-empty-selection
              >
                <template v-for="group in tripGroups" :key="group.headsign">
                  <ion-item-divider sticky>
                    <ion-label>Hacia {{ group.headsign }} · {{ tripCountLabel(group.trips.length) }}</ion-label>
                  </ion-item-divider>
                  <ion-item
                    v-for="trip in group.trips"
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
                        <p v-if="tripOrigin(trip, trips)">desde {{ tripOrigin(trip, trips) }}</p>
                      </ion-label>
                    </ion-radio>
                  </ion-item>
                </template>
              </ion-radio-group>
            </ion-list>
          </template>
        </section>

        <!-- Vehicle -->
        <section class="setup-section">
          <h2 class="step-title">3. Selecciona un vehículo</h2>
          <ion-toggle
            v-model="manualVehicle"
            data-testid="vehicle-manual-toggle"
          >Ingresar ID de vehículo manualmente</ion-toggle>

          <ion-list v-if="!manualVehicle">
            <p v-if="vehicles.length === 0" class="step-empty">
              No hay vehículos listados. Activa la entrada manual para escribir un ID.
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
          fallback-message="No se pudo iniciar el run. Intenta de nuevo."
        />
      </template>

      <!-- Review: purely a client-side preview — no run exists server-side
           yet. Backing out (Back, header Cancel, swipe-dismiss) is just a
           local state reset; only "Confirm run" below ever calls the
           backend. -->
      <template v-else-if="!justConfirmed && phase === 'reviewing'">
        <section class="setup-section">
          <h2 class="step-title">Revisa tu run</h2>
          <p class="step-empty">Confirma estos detalles antes de empezar a conducir.</p>
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
          fallback-message="No se pudo iniciar el run. Intenta de nuevo."
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
            Revisar run
          </ion-button>
          <ion-button
            v-else
            data-testid="confirm-run"
            color="primary"
            :disabled="busy"
            @click="onConfirmReview"
          >
            <ion-spinner v-if="busy" name="crescent" slot="start" />
            Confirmar run
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
  IonItemDivider,
  IonLabel,
  IonList,
  IonModal,
  IonRadio,
  IonRadioGroup,
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
  tripDestination,
  tripOrigin,
  tripTime,
} from '@/utils/labels';
import type { CreateRunInput, Route, Trip, Vehicle } from '@/types/api';

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
const selectedTripId = ref<string | null>(null);
const selectedVehicleId = ref<string | null>(null);

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

/** One destination group in the trip picker (plan §2) — a sticky divider
 * plus its trips sorted by departure time. */
interface TripGroup {
  headsign: string;
  trips: Trip[];
}

/**
 * Groups `trips` by trip_headsign (the GTFS-defined destination) so the
 * route's destinations no longer interleave across one flat, time-sorted
 * list (up to 123 rows for L1 alone). Groups are sorted alphabetically by
 * destination for a deterministic order; trips within a group by departure
 * time. Replaces the old flat sort that lived in loadTrips().
 */
const tripGroups = computed<TripGroup[]>(() => {
  const byHeadsign = new Map<string, Trip[]>();
  for (const trip of trips.value) {
    const headsign = tripDestination(trip);
    const group = byHeadsign.get(headsign);
    if (group) group.push(trip);
    else byHeadsign.set(headsign, [trip]);
  }
  return Array.from(byHeadsign.entries())
    .map(([headsign, groupTrips]) => ({
      headsign,
      trips: groupTrips.slice().sort((a, b) => tripTime(a).localeCompare(tripTime(b))),
    }))
    .sort((a, b) => a.headsign.localeCompare(b.headsign, 'es'));
});

function tripCountLabel(count: number): string {
  return `${count} ${count === 1 ? 'viaje' : 'viajes'}`;
}

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
  selectedTripId.value = null;
  selectedVehicleId.value = null;
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
  selectedTripId.value = null;
  trips.value = [];
  if (routeId) void loadTrips(routeId);
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
  return new Error(`No se pudo ${fallbackStep}. Intenta de nuevo.`);
}

/** Step 1: validate the selection and move to the review screen. Purely
 * client-side — nothing is sent to the backend here, so there is nothing to
 * release if the operator backs out or closes the sheet from this point on. */
function onInitialize(): void {
  const operatorId = authStore.session?.operatorId;
  if (!operatorId) {
    confirmError.value = new Error('No hay sesión de operador. Inicia sesión de nuevo.');
    return;
  }
  if (!selectedRoute.value || !selectedTrip.value) {
    confirmError.value = new Error('Faltan detalles del run. Reinicia la selección.');
    return;
  }
  if (!vehicleId.value) {
    confirmError.value = new Error('Se requiere un vehículo para iniciar el run.');
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
    schedule_relationship: 'SCHEDULED',
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
    confirmError.value = toConfirmError(err, 'iniciar el run');
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

/* Sticky destination-group headers in the trip picker (plan §2) — stay
   visible while their group scrolls past, so a driver scanning the 123-row
   L1 list always knows which destination the rows under the divider belong
   to. */
ion-item-divider {
  --background: var(--ion-color-light, var(--ion-item-background));
  font-size: var(--app-font-size-sm);
  font-weight: var(--app-font-weight-medium);
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
