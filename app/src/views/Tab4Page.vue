<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Perfil</ion-title>
        <ThemeToggle />
      </ion-toolbar>

      <ion-toolbar>
        <ion-segment v-model="segment">
          <ion-segment-button value="profile">
            <ion-label>Profile</ion-label>
          </ion-segment-button>
          <ion-segment-button value="settings">
            <ion-label>Settings</ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <ion-header collapse="condense">
        <ion-toolbar>
          <ion-title size="large">Perfil</ion-title>
        </ion-toolbar>
      </ion-header>

      <ExploreContainer v-if="segment === 'profile'" name="Profile page" />
      <ExploreContainer v-else name="Settings page" />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonSegment,
  IonSegmentButton,
  IonLabel,
} from '@ionic/vue';

import ExploreContainer from '@/components/ExploreContainer.vue';
import ThemeToggle from '@/components/ThemeToggle.vue';

const segment = ref<'profile' | 'settings'>('profile');
</script>
