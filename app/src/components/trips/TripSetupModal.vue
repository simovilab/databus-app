<template>
  <ion-modal
    class="sheet-modal"
    :is-open="isOpen"
    :backdrop-dismiss="false"
    :breakpoints="[0.4, 0.7, 0.94]"
    :initial-breakpoint="0.94"
    role="dialog"
    aria-label="Start a run"
    @did-dismiss="onDismiss"
  >
    <ion-header>
      <ion-toolbar>
        <ion-title>Start run</ion-title>
        <ion-buttons slot="end">
          <ion-button
            data-testid="modal-close"
            :disabled="busy"
            @click="onCancel"
          >Cancel</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding modal-body">
      <Transition name="check-pop">
        <div v-if="justConfirmed" class="confirm-pulse" aria-hidden="true">
          <ion-icon :icon="checkmarkCircle" color="success" />
          <p>Run started</p>
        </div>
      </Transition>

      <app-loading
        v-if="!justConfirmed && initialLoading"
        message="Loading schedule…"
      />
      <app-error
        v-else-if="!justConfirmed && initialError"
        :error="initialError"
        fallback-message="Could not load schedule data. Please try again."
        retry-label="Retry"
        @retry="loadInitial"
      />

      <template v-else-if="!justConfirmed">
        <!-- Route -->
        <section class="setup-section">
          <h2 class="step-title">1. Select a route</h2>
          <p v-if="routes.length === 0" class="step-empty">No routes available for today's feed.</p>
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
                  <ion-label>
                    <h2>{{ route.route_short_name || route.route_id }}</h2>
                    <p>{{ route.route_long_name }}</p>
                  </ion-label>
                </ion-radio>
              </ion-item>
            </ion-radio-group>
          </ion-list>
        </section>

        <!-- Trip (a GTFS trip carries its own direction + shape, so there is
             no separate direction picker — see services/schedule.ts). Loads
             as soon as a route is selected, without leaving this screen. -->
        <section class="setup-section">
          <h2 class="step-title">2. Select a trip</h2>
          <p v-if="!selectedRouteId" class="step-empty">Select a route first.</p>
          <app-loading v-else-if="tripsLoading" message="Loading trips…" />
          <app-error
            v-else-if="tripsError"
            :error="tripsError"
            fallback-message="Could not load trips. Please try again."
            retry-label="Retry"
            @retry="loadTrips"
          />
          <template v-else>
            <p v-if="trips.length === 0" class="step-empty">No trips scheduled for this route today.</p>
            <ion-list v-else>
              <ion-radio-group
                v-model="selectedTripId"
                allow-empty-selection
              >
                <ion-item
                  v-for="trip in trips"
                  :key="trip.trip_id"
                  data-testid="trip-option"
                >
                  <ion-radio
                    :value="trip.trip_id"
                    label-placement="end"
                    justify="start"
                  >
                    <ion-label>
                      <h2>{{ tripLabel(trip) }}</h2>
                      <p>{{ trip.trip_headsign }}</p>
                    </ion-label>
                  </ion-radio>
                </ion-item>
              </ion-radio-group>
            </ion-list>
          </template>
        </section>

        <!-- Vehicle -->
        <section class="setup-section">
          <h2 class="step-title">3. Select a vehicle</h2>
          <ion-toggle
            v-model="manualVehicle"
            data-testid="vehicle-manual-toggle"
          >Enter vehicle ID manually</ion-toggle>

          <ion-list v-if="!manualVehicle">
            <p v-if="vehicles.length === 0" class="step-empty">
              No vehicles listed. Toggle manual entry to type an ID.
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
                    <h2>{{ vehicle.id }}</h2>
                    <p>{{ vehicle.license_plate }}</p>
                  </ion-label>
                </ion-radio>
              </ion-item>
            </ion-radio-group>
          </ion-list>

          <ion-item v-if="manualVehicle">
            <ion-input
              v-model="manualVehicleId"
              data-testid="vehicle-manual-input"
              label="Vehicle ID"
              label-placement="stacked"
              placeholder="e.g. BUS-001"
            />
          </ion-item>
        </section>

        <app-error
          v-if="confirmError"
          class="setup-section confirm-error"
          data-testid="confirm-error"
          :error="confirmError"
          fallback-message="Could not start the run. Please try again."
        />
      </template>
    </ion-content>

    <ion-footer>
      <ion-toolbar>
        <ion-buttons slot="end">
          <ion-button
            data-testid="confirm-run"
            color="primary"
            :disabled="!canConfirm || busy"
            @click="onConfirm"
          >
            <ion-spinner v-if="busy" name="crescent" slot="start" />
            Confirm run
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-footer>
  </ion-modal>
</template>

<script setup lang="ts">
// Trip setup: a single screen with route, trip, and vehicle pickers all
// visible at once (route → trip → vehicle, services/schedule.ts), rather
// than a stepper — the operator fills everything in one pass and taps
// "Confirm run" once. A GTFS trip already carries its direction_id and
// shape_id, so picking a trip determines both — there is no separate
// direction picker. The store owns telemetry start/stop; this modal only
// creates the run. All schedule failures surface as ApiError and render
// via <AppError>.
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

const props = defineProps<{ isOpen: boolean }>();
const emit = defineEmits<{
  (e: 'dismissed'): void;
}>();

const authStore = useAuthStore();
const runStore = useRunStore();

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

const selectedRoute = computed(
  () => routes.value.find((r) => r.route_id === selectedRouteId.value) ?? null,
);
const selectedTrip = computed(
  () => trips.value.find((t) => t.trip_id === selectedTripId.value) ?? null,
);

/**
 * A GTFS trip_id in this feed embeds the departure time as its suffix
 * (e.g. "desde_artes_sin_milla_entresemana_08:35"). Prefer that HH:MM tail as
 * the readable label; fall back to the raw trip_id when it doesn't match.
 */
function tripLabel(trip: Trip): string {
  const match = trip.trip_id.match(/(\d{1,2}:\d{2})(?::\d{2})?$/);
  return match ? match[1] : trip.trip_id;
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
    const routeTrips = await getTrips(routeId);
    // Sort by the departure time embedded in the trip label for readability.
    trips.value = routeTrips
      .slice()
      .sort((a, b) => tripLabel(a).localeCompare(tripLabel(b)));
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

async function onConfirm(): Promise<void> {
  const operatorId = authStore.session?.operatorId;
  if (!operatorId) {
    confirmError.value = new Error('No operator session. Please log in again.');
    return;
  }
  if (!selectedRoute.value || !selectedTrip.value) {
    confirmError.value = new Error('Missing run details. Please restart selection.');
    return;
  }
  if (!vehicleId.value) {
    confirmError.value = new Error('A vehicle is required to start a run.');
    return;
  }

  confirmError.value = null;
  busy.value = true;
  try {
    // direction_id and shape_id come from the selected trip — the trip is the
    // authoritative route+direction+shape bundle (see services/schedule.ts).
    const input: CreateRunInput = {
      vehicle_id: vehicleId.value,
      operator_id: operatorId,
      route_id: selectedRoute.value.route_id,
      trip_id: selectedTrip.value.trip_id,
      direction_id: selectedTrip.value.direction_id,
      shape_id: selectedTrip.value.shape_id,
      schedule_relationship: 'SCHEDULED',
    };
    // createRun posts create-run → confirm → telemetry.start (master §6.6).
    // The run has fully started at this point — everything from here down is
    // a purely decorative confirmation before closing the sheet.
    await runStore.createRun(input);
    justConfirmed.value = true;
    const pulseMs = prefersReducedMotion() ? 0 : 700;
    setTimeout(() => {
      busy.value = false;
      emit('dismissed');
    }, pulseMs);
  } catch (err) {
    if (isCreateRunError(err)) {
      // Surface the backend's actual reason (e.g. "Operator 'op-demo' is
      // already assigned to run …") instead of the opaque validation step.
      const detail = extractApiErrorDetail(err);
      confirmError.value = new Error(
        detail ?? `Could not start the run (step "${err.step ?? 'unknown'}").`,
      );
    } else if (err instanceof Error) {
      confirmError.value = err;
    } else {
      confirmError.value = new Error('Could not start the run. Please try again.');
    }
    busy.value = false;
  }
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
  font-size: 1.05rem;
  font-weight: 600;
}

.step-empty {
  color: var(--ion-color-medium);
  font-size: 0.9rem;
}

.confirm-error {
  margin-top: 0;
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
