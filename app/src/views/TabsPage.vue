<template>
  <ion-page>
    <ion-tabs>
      <ion-router-outlet></ion-router-outlet>
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="home" href="/tabs/home">
          <ion-icon aria-hidden="true" :icon="homeOutline" />
          <ion-label>Inicio</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="runs" href="/tabs/runs">
          <ion-icon aria-hidden="true" :icon="busOutline" />
          <ion-label>Carreras</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="messages" href="/tabs/messages">
          <ion-icon aria-hidden="true" :icon="chatbubblesOutline" />
          <ion-label>Mensajes</ion-label>
          <ion-badge v-if="unreadMessages > 0" color="danger">{{ unreadMessages }}</ion-badge>
        </ion-tab-button>

        <ion-tab-button tab="user" href="/tabs/user">
          <ion-icon aria-hidden="true" :icon="personCircleOutline" />
          <ion-label>Usuario</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>

    <!-- Always-visible "start a carrera" shortcut, reachable from any of the
         four tabs. An <ion-fab> normally needs to live inside <ion-content>
         to use slot="fixed", but this page has no ion-content of its own
         (ion-page > ion-tabs directly) — so instead this is a plain sibling
         of <ion-tabs>, positioned with CSS (.global-start-fab below) rather
         than a fixed slot. -->
    <ion-fab class="global-start-fab" vertical="bottom" horizontal="end">
      <ion-fab-button
        aria-label="Iniciar una carrera"
        data-testid="global-start-fab"
        @click="goStartRun"
      >
        <ion-icon :icon="add" />
      </ion-fab-button>
    </ion-fab>
  </ion-page>
</template>

<script setup lang="ts">
// Bottom tab bar — the four tabs from SITEMAP.md: home | runs (Carreras) |
// messages | user. The Messages badge is wired to a count so the
// notification affordance exists; there is no messaging backend yet, so the
// count stays 0 (see MessagesPage.vue).
import {
  IonBadge,
  IonFab,
  IonFabButton,
  IonTabBar,
  IonTabButton,
  IonTabs,
  IonLabel,
  IonIcon,
  IonPage,
  IonRouterOutlet,
} from '@ionic/vue';
import {
  add,
  busOutline,
  chatbubblesOutline,
  homeOutline,
  personCircleOutline,
} from 'ionicons/icons';
import { ref } from 'vue';
import { useRouter } from 'vue-router';

// Placeholder until an operator-messaging backend exists; kept as reactive
// state so the badge lights up automatically once a source is wired in.
const unreadMessages = ref(0);

const router = useRouter();

// Same `?start=1` flow as Home's "Iniciar una carrera" CTA — RunsPage's
// onIonViewWillEnter reads it and opens TripSetupModal directly, skipping
// whatever segment (Activo/Historial) was last active. It safely no-ops if a
// carrera is already active (see RunsPage.vue).
function goStartRun(): void {
  router.push('/tabs/runs?start=1');
}
</script>

<style scoped>
/* ion-fab already sets position:absolute (unconditionally) and a right
   offset (via horizontal="end" → :host(.fab-horizontal-end), safe-area
   aware) in its own shadow-DOM stylesheet — only `bottom` needs overriding
   here. The tab bar itself is ~56px tall plus the iOS home-indicator safe
   area; the FAB floats a comfortable 16px above that, on every tab
   including Runs' RunProgress view, so it never overlaps the tab buttons.
   This scoped rule's compiler-added [data-v-*] attribute outweighs the
   shadow-DOM :host(.fab-vertical-bottom) rule's specificity, so no
   !important is needed. ion-fab's own default z-index (999, see
   @ionic/core's fab.css) already sits comfortably above page content while
   leaving the tab bar (a plain sibling, not layered under this) tappable. */
.global-start-fab {
  bottom: calc(56px + var(--ion-safe-area-bottom, 0px) + 16px);
}
</style>
