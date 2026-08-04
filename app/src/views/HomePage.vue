<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Inicio</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <section class="home-greeting">
        <BrandLogo variant="auto" height="34px" class="home-greeting__logo" />
        <h1 class="home-greeting__heading">Hola, {{ firstName }}</h1>
        <p class="home-greeting__sub">¿Qué harás hoy?</p>
      </section>

      <section v-if="activeRun" class="home-run">
        <ion-card button detail="false" @click="goToRuns('active')">
          <ion-card-header>
            <ion-card-title>Run en curso</ion-card-title>
            <ion-card-subtitle>{{ activeRun.routeId }} · {{ activeRun.tripId }}</ion-card-subtitle>
          </ion-card-header>
          <ion-card-content>
            <ion-chip :color="stateColor" outline>
              <ion-icon :icon="radioButtonOn" />
              <ion-label>{{ translateRunState(activeRun.state) }}</ion-label>
            </ion-chip>
            <p class="home-run__hint">Toca para ver el progreso del run.</p>
          </ion-card-content>
        </ion-card>
      </section>

      <section v-else class="home-empty">
        <EmptyState
          title="Sin run activo"
          message="Inicia un run desde la pestaña Runs para comenzar a transmitir tu posición."
          :icon="busOutline"
        >
          <template #action>
            <ion-button @click="goToRuns('active')" fill="outline">Iniciar un run</ion-button>
          </template>
        </EmptyState>
      </section>

      <section v-if="recentRuns.length" class="home-recent">
        <div class="home-recent__header">
          <h2 class="home-recent__title">Actividad reciente</h2>
          <ion-button
            fill="clear"
            size="small"
            data-testid="home-see-more"
            @click="goToRuns('history')"
          >Ver más</ion-button>
        </div>
        <run-history-list
          :entries="recentRuns"
          :max="3"
          @select="goToRuns('history')"
        />
      </section>
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
import { translateRunState } from '@/utils/runStateLabels';
import type { RunState } from '@/types/domain';

const router = useRouter();
const authStore = useAuthStore();
const runStore = useRunStore();
const runHistoryStore = useRunHistoryStore();

const firstName = computed(() => authStore.session?.firstName ?? 'operador');
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

function goToRuns(segment: 'active' | 'history'): void {
  router.push({ path: '/tabs/runs', query: { segment } });
}
</script>

<style scoped>
.home-greeting {
  margin: var(--app-spacing-md, 16px) 0 var(--app-spacing-lg, 24px);
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

.home-run {
  margin-top: var(--app-spacing-sm, 8px);
}

.home-run__hint {
  margin: var(--app-spacing-sm, 8px) 0 0;
  color: var(--ion-color-medium);
  font-size: 0.85rem;
}

.home-empty {
  margin-top: var(--app-spacing-xl, 32px);
}

.home-recent {
  margin-top: var(--app-spacing-xl, 32px);
}

.home-recent__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.home-recent__title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
}
</style>
