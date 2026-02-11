<template>
  <div class="run-info-container">
    <!-- Route Information Card -->
    <ion-card class="info-card">
      <ion-card-content class="ion-no-padding">
        <ion-list lines="none">
          <!-- Ruta -->
          <ion-item>
            <ion-label>
              <div class="label-with-icon">
                <h2 class="field-label">Ruta</h2>
                <ion-icon 
                  v-if="hasAlert" 
                  :icon="alertCircle" 
                  color="danger"
                  class="alert-icon"
                ></ion-icon>
              </div>
              <p class="field-value-empty">{{ route || '—' }}</p>
            </ion-label>
          </ion-item>

          <!-- Sentido -->
          <ion-item>
            <ion-label>
              <h2 class="field-label">Sentido</h2>
              <p class="field-value">{{ direction || '—' }}</p>
            </ion-label>
          </ion-item>

          <!-- Trayectoria -->
          <ion-item>
            <ion-label>
              <h2 class="field-label">Trayectoria</h2>
              <p class="field-value-empty">{{ trajectory || '—' }}</p>
            </ion-label>
          </ion-item>

          <!-- Hora de inicio -->
          <ion-item>
            <ion-label>
              <h2 class="field-label">Hora de inicio</h2>
              <p class="field-value">{{ startTime || '—' }}</p>
            </ion-label>
          </ion-item>

          <!-- Día de operación -->
          <ion-item>
            <ion-label>
              <h2 class="field-label">Día de operación</h2>
              <p class="field-value-empty">{{ operationDay || '—' }}</p>
            </ion-label>
          </ion-item>

          <!-- Tiempo transcurrido -->
          <ion-item class="elapsed-time-item">
            <ion-label>
              <h2 class="field-label">Tiempo transcurrido</h2>
              <p class="elapsed-time">{{ elapsedTime }}</p>
            </ion-label>
          </ion-item>
        </ion-list>
      </ion-card-content>
    </ion-card>

    <!-- Progress Bar -->
    <div class="progress-container">
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: `${progress}%` }"></div>
      </div>
    </div>

    <!-- Map Area -->
    <div class="map-container">
      <!-- Aquí se integrará el mapa en el futuro -->
    </div>

    <!-- End Trip Button -->
    <div class="action-container">
      <ion-button 
        expand="block" 
        color="light" 
        class="end-trip-button"
        @click="endTrip"
      >
        <ion-icon :icon="checkmark" slot="start"></ion-icon>
        Finalizar viaje
      </ion-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import {
  IonCard,
  IonCardContent,
  IonList,
  IonItem,
  IonLabel,
  IonButton,
  IonIcon,
} from '@ionic/vue';
import { alertCircle, checkmark } from 'ionicons/icons';

// Props
interface Props {
  route?: string;
  direction?: string;
  trajectory?: string;
  startTime?: string;
  operationDay?: string;
  hasAlert?: boolean;
  progress?: number;
}

const props = withDefaults(defineProps<Props>(), {
  route: '',
  direction: 'Hacia Deportivas',
  trajectory: 'Desde educación con milla',
  startTime: '10:55:37 a.m',
  operationDay: 'Entresemana',
  hasAlert: true,
  progress: 35,
});

// Emits
const emit = defineEmits<{
  (e: 'end-trip'): void;
}>();

// Estado
const elapsedSeconds = ref(0);
let intervalId: number | null = null;

// Tiempo transcurrido calculado
const elapsedTime = computed(() => {
  const minutes = Math.floor(elapsedSeconds.value / 60);
  const seconds = elapsedSeconds.value % 60;
  return `${minutes} min ${seconds} s`;
});

// Iniciar contador
onMounted(() => {
  intervalId = window.setInterval(() => {
    elapsedSeconds.value++;
  }, 1000);
});

// Limpiar intervalo
onUnmounted(() => {
  if (intervalId !== null) {
    clearInterval(intervalId);
  }
});

// Métodos
const endTrip = () => {
  emit('end-trip');
};
</script>

<style scoped>
.run-info-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 16px;
}

.info-card {
  margin: 0;
  box-shadow: none;
  border-radius: 12px;
}

.field-label {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--ion-color-primary);
  margin: 0 0 4px 0;
}

.field-value {
  font-size: 1rem;
  color: var(--ion-text-color);
  margin: 0;
}

.field-value-empty {
  font-size: 1rem;
  color: var(--ion-color-medium);
  margin: 0;
}

.label-with-icon {
  display: flex;
  align-items: center;
  gap: 8px;
}

.alert-icon {
  font-size: 1.2rem;
}

.elapsed-time-item {
  margin-top: 8px;
}

.elapsed-time {
  font-size: 2.5rem;
  font-weight: 300;
  color: var(--ion-color-light-contrast);
  margin: 8px 0 0 0;
  letter-spacing: -1px;
}

.progress-container {
  padding: 0 16px;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background-color: var(--ion-color-light);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background-color: var(--ion-color-light-contrast);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.map-container {
  flex: 1;
  background-color: var(--ion-color-primary);
  border-radius: 12px;
  margin: 0 16px;
  min-height: 200px;
  position: relative;
  overflow: hidden;
}

.action-container {
  padding: 0 16px 16px;
}

.end-trip-button {
  --background: var(--ion-color-light);
  --color: var(--ion-color-primary);
  --border-radius: 12px;
  font-weight: 600;
  font-size: 1rem;
  height: 56px;
  text-transform: none;
}

.end-trip-button::part(native) {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

ion-item {
  --padding-start: 16px;
  --padding-end: 16px;
  --inner-padding-end: 0;
  --background: transparent;
}
</style>
