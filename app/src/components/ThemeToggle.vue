<template>
  <ion-buttons slot="end">
    <ion-button @click="toggleTheme">
      <ion-icon :icon="isDark ? sunnyOutline : moonOutline" slot="icon-only"></ion-icon>
    </ion-button>
  </ion-buttons>
</template>

<script setup lang="ts">
import { IonButtons, IonButton, IonIcon } from '@ionic/vue';
import { moonOutline, sunnyOutline } from 'ionicons/icons';
import { useTheme } from '@/composables/useTheme';

const { isDark, toggleTheme } = useTheme();
</script>
