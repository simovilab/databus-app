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
          <ion-label>Runs</ion-label>
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
  </ion-page>
</template>

<script setup lang="ts">
// Bottom tab bar — the four tabs from SITEMAP.md: home | runs | messages |
// user. The Messages badge is wired to a count so the notification affordance
// exists; there is no messaging backend yet, so the count stays 0 (see
// MessagesPage.vue).
import {
  IonBadge,
  IonTabBar,
  IonTabButton,
  IonTabs,
  IonLabel,
  IonIcon,
  IonPage,
  IonRouterOutlet,
} from '@ionic/vue';
import {
  busOutline,
  chatbubblesOutline,
  homeOutline,
  personCircleOutline,
} from 'ionicons/icons';
import { ref } from 'vue';

// Placeholder until an operator-messaging backend exists; kept as reactive
// state so the badge lights up automatically once a source is wired in.
const unreadMessages = ref(0);
</script>
