<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Viajes</ion-title>
        <ThemeToggle />
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true">
      <ion-header collapse="condense">
        <ion-toolbar>
          <ion-title size="large">Viajes</ion-title>
        </ion-toolbar>
      </ion-header>
      <ion-segment>
  <ion-segment-button value="first" content-id="first">
    <ion-label>Viaje</ion-label>
  </ion-segment-button>
  <ion-segment-button value="second" content-id="second">
    <ion-label>Histórico</ion-label>
  </ion-segment-button>
</ion-segment>
<ion-segment-view>
  <ion-segment-content id="first">First</ion-segment-content>
  <ion-segment-content id="second">Second</ion-segment-content>
</ion-segment-view>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonSegment, IonSegmentButton, IonLabel, IonSegmentView, IonSegmentContent } from '@ionic/vue';
import ThemeToggle from '@/components/ThemeToggle.vue';
</script>
