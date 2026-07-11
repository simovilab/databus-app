<template>
  <ion-modal
    :is-open="isOpen"
    :backdrop-dismiss="false"
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

    <ion-content class="ion-padding">
      <app-loading
        v-if="loading"
        :message="loadingMessage"
      />
      <app-error
        v-else-if="error"
        :error="error"
        fallback-message="Could not load schedule data. Please try again."
        retry-label="Retry"
        @retry="retryCurrentStep"
      />

      <!-- Step: route -->
      <section v-else-if="step === 'route'">
        <h2 class="step-title">Select a route</h2>
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

      <!-- Step: shape / direction -->
      <section v-else-if="step === 'shape'">
        <h2 class="step-title">Select direction</h2>
        <p v-if="shapes.length === 0" class="step-empty">No shapes for this route.</p>
        <ion-list v-else>
          <ion-radio-group
            v-model="selectedShapeId"
            allow-empty-selection
          >
            <ion-item
              v-for="shape in shapes"
              :key="shape.shape_id"
              data-testid="shape-option"
            >
              <ion-radio
                :value="shape.shape_id"
                label-placement="end"
                justify="start"
              >
                <ion-label>
                  <h2>{{ shape.shape_from }} → {{ shape.shape_to }}</h2>
                  <p>{{ shape.shape_name }}</p>
                </ion-label>
              </ion-radio>
            </ion-item>
          </ion-radio-group>
        </ion-list>
      </section>

      <!-- Step: trip -->
      <section v-else-if="step === 'trip'">
        <h2 class="step-title">Select a trip</h2>
        <p v-if="trips.length === 0" class="step-empty">No trips scheduled for this route/shape today.</p>
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
                  <h2>{{ trip.trip_time }}</h2>
                  <p>{{ trip.trip_headsign }}</p>
                </ion-label>
              </ion-radio>
            </ion-item>
          </ion-radio-group>
        </ion-list>
      </section>

      <!-- Step: vehicle -->
      <section v-else-if="step === 'vehicle'">
        <h2 class="step-title">Select a vehicle</h2>
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
    </ion-content>

    <ion-footer>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button
            v-if="step !== 'route'"
            data-testid="back-button"
            :disabled="busy"
            @click="goBack"
          >Back</ion-button>
        </ion-buttons>
        <ion-buttons slot="end">
          <ion-button
            v-if="step !== 'vehicle'"
            data-testid="next-button"
            :disabled="!canAdvance || busy"
            @click="goNext"
          >Next</ion-button>
          <ion-button
            v-else
            data-testid="confirm-run"
            color="primary"
            :disabled="!canConfirm || busy"
            @click="onConfirm"
          >Confirm run</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-footer>
  </ion-modal>
</template>

<script setup lang="ts">
// Trip setup wizard: drives the schedule lookups (services/schedule.ts) in
// the order route → service-today → which-shapes → find-trips → vehicle,
// then creates + confirms the run via useRunStore.createRun (master §4.2,
// §6.2). The store owns telemetry start/stop; this modal only creates the
// run. All schedule failures surface as ApiError and render via <AppError>.
import {
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonRadio,
  IonRadioGroup,
  IonTitle,
  IonToggle,
  IonToolbar,
} from '@ionic/vue';
import { computed, ref, watch } from 'vue';
import AppError from '@/components/ui/AppError.vue';
import AppLoading from '@/components/ui/AppLoading.vue';
import { useAuthStore } from '@/stores/auth';
import { useRunStore } from '@/stores/run';
import {
  findTrips,
  getRoutes,
  getServiceToday,
  getVehicles,
  getWhichShapes,
} from '@/services/schedule';
import { ApiError } from '@/services/apiClient';
import type {
  CreateRunInput,
  Route,
  ShapeChoice,
  TripChoice,
  Vehicle,
} from '@/types/api';

type Step = 'route' | 'shape' | 'trip' | 'vehicle';

const props = defineProps<{ isOpen: boolean }>();
const emit = defineEmits<{
  (e: 'dismissed'): void;
}>();

const authStore = useAuthStore();
const runStore = useRunStore();

const step = ref<Step>('route');
const loading = ref(false);
const loadingMessage = ref('');
const error = ref<unknown>(null);
const busy = ref(false);

const routes = ref<Route[]>([]);
const shapes = ref<ShapeChoice[]>([]);
const trips = ref<TripChoice[]>([]);
const vehicles = ref<Vehicle[]>([]);

const serviceId = ref<string>('');

const selectedRouteId = ref<string | null>(null);
const selectedShapeId = ref<string | null>(null);
const selectedTripId = ref<string | null>(null);
const selectedVehicleId = ref<string | null>(null);

const manualVehicle = ref(false);
const manualVehicleId = ref('');

const selectedRoute = computed(
  () => routes.value.find((r) => r.route_id === selectedRouteId.value) ?? null,
);
const selectedShape = computed(
  () => shapes.value.find((s) => s.shape_id === selectedShapeId.value) ?? null,
);
const selectedTrip = computed(
  () => trips.value.find((t) => t.trip_id === selectedTripId.value) ?? null,
);

const vehicleId = computed(() =>
  manualVehicle.value
    ? manualVehicleId.value.trim()
    : selectedVehicleId.value ?? '',
);

const canAdvance = computed(() => {
  switch (step.value) {
    case 'route':
      return !!selectedRouteId.value;
    case 'shape':
      return !!selectedShapeId.value;
    case 'trip':
      return !!selectedTripId.value;
    default:
      return false;
  }
});

const canConfirm = computed(() => vehicleId.value.length > 0);

function resetState(): void {
  step.value = 'route';
  loading.value = false;
  loadingMessage.value = '';
  error.value = null;
  busy.value = false;
  routes.value = [];
  shapes.value = [];
  trips.value = [];
  vehicles.value = [];
  serviceId.value = '';
  selectedRouteId.value = null;
  selectedShapeId.value = null;
  selectedTripId.value = null;
  selectedVehicleId.value = null;
  manualVehicle.value = false;
  manualVehicleId.value = '';
}

/** Clear transient error/loading when navigating between steps. */
function clearTransient(): void {
  error.value = null;
  loading.value = false;
}

/** Load routes on modal open. */
watch(
  () => props.isOpen,
  async (open) => {
    if (!open) return;
    resetState();
    await loadStep('route');
  },
  { immediate: false },
);

async function loadStep(target: Step): Promise<void> {
  clearTransient();
  try {
    if (target === 'route') {
      loadingMessage.value = 'Loading routes…';
      loading.value = true;
      routes.value = await getRoutes();
    } else if (target === 'shape') {
      if (!selectedRouteId.value) return;
      loadingMessage.value = 'Loading directions…';
      loading.value = true;
      // Resolve service_id for today + shapes for the selected route in
      // parallel (master §2.1 steps 5–6).
      const [services, routeShapes] = await Promise.all([
        getServiceToday(),
        getWhichShapes(selectedRouteId.value),
      ]);
      serviceId.value = services[0] ?? '';
      shapes.value = routeShapes;
    } else if (target === 'trip') {
      if (!selectedShapeId.value) return;
      loadingMessage.value = 'Loading trips…';
      loading.value = true;
      const [routeTrips, routeVehicles] = await Promise.all([
        findTrips({
          routeId: selectedRouteId.value!,
          serviceId: serviceId.value,
          shapeId: selectedShapeId.value,
        }),
        getVehicles().catch(() => [] as Vehicle[]),
      ]);
      // Sort by scheduled departure time for a readable list.
      trips.value = routeTrips
        .slice()
        .sort((a, b) => a.trip_time.localeCompare(b.trip_time));
      vehicles.value = routeVehicles;
    }
    step.value = target;
  } catch (err) {
    error.value = err;
  } finally {
    loading.value = false;
    loadingMessage.value = '';
  }
}

function goNext(): void {
  const order: Step[] = ['route', 'shape', 'trip', 'vehicle'];
  const idx = order.indexOf(step.value);
  const next = order[idx + 1];
  if (next) void loadStep(next);
}

function goBack(): void {
  const order: Step[] = ['route', 'shape', 'trip', 'vehicle'];
  const idx = order.indexOf(step.value);
  clearTransient();
  if (idx > 0) step.value = order[idx - 1];
}

function retryCurrentStep(): void {
  void loadStep(step.value);
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
    error.value = new Error('No operator session. Please log in again.');
    return;
  }
  if (!selectedRoute.value || !selectedShape.value || !selectedTrip.value) {
    error.value = new Error('Missing run details. Please restart selection.');
    return;
  }
  if (!vehicleId.value) {
    error.value = new Error('A vehicle is required to start a run.');
    return;
  }

  clearTransient();
  busy.value = true;
  try {
    const input: CreateRunInput = {
      vehicle_id: vehicleId.value,
      operator_id: operatorId,
      route_id: selectedRoute.value.route_id,
      trip_id: selectedTrip.value.trip_id,
      direction_id: selectedShape.value.direction_id,
      shape_id: selectedShape.value.shape_id,
      schedule_relationship: 'SCHEDULED',
    };
    // createRun posts create-run → confirm → telemetry.start (master §6.6).
    await runStore.createRun(input);
    emit('dismissed');
  } catch (err) {
    if (isCreateRunError(err) && err.step) {
      error.value = new Error(`Create run failed at step "${err.step}".`);
    } else if (err instanceof Error) {
      error.value = err;
    } else {
      error.value = new Error('Could not start the run. Please try again.');
    }
  } finally {
    busy.value = false;
  }
}
</script>

<style scoped>
.step-title {
  margin: 0 0 var(--app-spacing-sm, 8px);
  font-size: 1.05rem;
  font-weight: 600;
}

.step-empty {
  color: var(--ion-color-medium);
  font-size: 0.9rem;
}
</style>
