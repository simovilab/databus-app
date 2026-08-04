<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Inicio</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding home-feed">
      <ion-card class="home-card home-card--greeting">
        <ion-card-content class="home-greeting">
          <BrandLogo variant="auto" height="34px" class="home-greeting__logo" />
          <h1 class="home-greeting__heading">Hola, {{ firstName }}</h1>
          <p class="home-greeting__sub">¿Qué harás hoy?</p>
        </ion-card-content>
      </ion-card>

      <Transition name="cardfade" mode="out-in">
        <ion-card
          v-if="activeRun"
          key="active"
          button
          detail="false"
          class="home-card"
        >
          <ion-card-header class="home-run__header" @click="goToRuns">
            <ion-card-title>Run en curso</ion-card-title>
            <ion-card-subtitle>{{ activeRun.routeLabel }} · {{ activeRun.tripLabel }}</ion-card-subtitle>
          </ion-card-header>
          <ion-card-content @click="goToRuns">
            <Transition name="state-pop" mode="out-in">
              <ion-chip :key="activeRun.state" :color="stateColor" outline>
                <ion-icon :icon="radioButtonOn" />
                <ion-label>{{ activeRun.state }}</ion-label>
              </ion-chip>
            </Transition>
            <p class="home-run__hint">Toca para ver el progreso del run.</p>
          </ion-card-content>
        </ion-card>

        <ion-card v-else key="empty" class="home-card home-card--empty">
          <ion-card-content>
            <EmptyState
              title="Sin run activo"
              message="Cuando quieras, inicia un run desde la pestaña Runs y empezamos a transmitir tu posición."
              :icon="busOutline"
            >
              <template #action>
                <ion-button @click="startRun" fill="outline">Iniciar un run</ion-button>
              </template>
            </EmptyState>
          </ion-card-content>
        </ion-card>
      </Transition>

      <ion-card v-if="recentRuns.length" class="home-card home-card--recent">
        <ion-card-content>
          <div class="home-recent__header">
            <h2 class="home-recent__title">Actividad reciente</h2>
            <ion-button
              fill="clear"
              size="small"
              data-testid="home-see-more"
              @click="goToRuns"
            >Ver más</ion-button>
          </div>
          <run-history-list
            :entries="recentRuns"
            :max="3"
            @select="goToRuns"
          />
        </ion-card-content>
      </ion-card>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
// Home (master-plan §2.1 row 3). Greets the operator by first name and shows
// either a compact active-run status card (linking to the Trips tab) or an
// `<EmptyState>` prompting them to start a run. This page is intentionally
// minimal — the run UI itself belongs to Agent A4. It only *reads* from the
// auth and run stores; it never mutates them.
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonChip,
  IonContent,
  IonHeader,
  IonIcon,
  IonLabel,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/vue';
import { busOutline, radioButtonOn } from 'ionicons/icons';
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import EmptyState from '@/components/ui/EmptyState.vue';
import RunHistoryList from '@/components/runs/RunHistoryList.vue';
import BrandLogo from '@/components/ui/BrandLogo.vue';
import { useAuthStore } from '@/stores/auth';
import { useRunStore } from '@/stores/run';
import { useRunHistoryStore } from '@/stores/runHistory';
import { useSettingsStore } from '@/stores/settings';
import type { RunState } from '@/types/domain';

const router = useRouter();
const authStore = useAuthStore();
const runStore = useRunStore();
const runHistoryStore = useRunHistoryStore();
const settingsStore = useSettingsStore();

// Same priority as UserPage's fullName: the device-local override from the
// profile tab wins, then the institutional first name from login, then a
// generic fallback.
const firstName = computed(() => {
  const override = settingsStore.settings.displayName.trim();
  if (override) return override;
  return authStore.session?.firstName || 'operador';
});
const activeRun = computed(() => runStore.activeRun);
const recentRuns = computed(() => runHistoryStore.entries);

// Color cue for the state chip: green once actively tracking, medium
// otherwise. Kept intentionally coarse — A4 owns the rich progress UI.
const stateColor = computed<'success' | 'warning' | 'medium'>(() => {
  const state = activeRun.value?.state as RunState | undefined;
  if (state === 'Tracking' || state === 'In Progress') return 'success';
  if (state === 'No Signal' || state === 'Completed' || state === 'Cancelled') return 'warning';
  return 'medium';
});

function goToRuns(): void {
  router.push('/tabs/runs');
}

// "Iniciar un run" only appears when there's no active run — skip the Runs
// tab's last-viewed segment (Activo/Historial) and go straight to the setup
// form. The `start=1` query flag is read by RunsPage on every view-enter.
function startRun(): void {
  router.push('/tabs/runs?start=1');
}
</script>

<style scoped>
/* Card Stack principle 2: Home reads as a scrollable feed of cards — greeting
   → active-run/empty → recent activity — each its own rounded surface with
   breathing room between, rather than a fixed dashboard. */
.home-feed {
  --padding-top: var(--app-spacing-md, 16px);
  --padding-bottom: var(--app-spacing-xl, 32px);
}

.home-card {
  margin-left: 0;
  margin-right: 0;
  margin-top: 0;
  margin-bottom: var(--app-spacing-lg, 24px);
}

.home-card--greeting {
  background: var(--app-tint-primary);
}

.home-greeting {
  display: flex;
  flex-direction: column;
}

.home-greeting__logo {
  margin-bottom: var(--app-spacing-md, 16px);
}

.home-greeting__heading {
  margin: 0;
  font-size: 1.6rem;
  font-weight: 700;
}

.home-greeting__sub {
  margin: var(--app-spacing-xs, 4px) 0 0;
  color: var(--ion-color-medium);
}

.home-run__header {
  cursor: pointer;
}

.home-run__hint {
  margin: var(--app-spacing-sm, 8px) 0 0;
  color: var(--ion-color-medium);
  font-size: var(--app-font-size-sm);
}

.home-recent__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.home-recent__title {
  margin: 0;
  font-size: var(--app-font-size-lg);
  font-weight: var(--app-font-weight-semibold);
}

/* Gentle crossfade between the active-run card and the empty-state card. */
.cardfade-enter-active,
.cardfade-leave-active {
  transition:
    opacity var(--app-motion-base, 240ms) var(--app-motion-ease, ease),
    transform var(--app-motion-base, 240ms) var(--app-motion-ease, ease);
}
.cardfade-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
.cardfade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* State-change pulse for the active-run chip (keyed on the run's state). */
.state-pop-enter-active {
  animation: state-pop var(--app-motion-base, 240ms) var(--app-motion-ease, ease-out);
}
@keyframes state-pop {
  from {
    transform: scale(0.85);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
