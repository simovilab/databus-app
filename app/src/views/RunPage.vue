<template>
  <ion-page>
    <ion-header class="ion-no-border">
      <ion-toolbar color="primary">
        <ion-title>
          <div class="header-title">
            <span>Viaje en progreso</span>
            <ion-icon :icon="bus" class="bus-icon"></ion-icon>
          </div>
        </ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="ion-padding">
      <RunInfo 
        :route="currentRun.route"
        :direction="currentRun.direction"
        :trajectory="currentRun.trajectory"
        :start-time="currentRun.startTime"
        :operation-day="currentRun.operationDay"
        :has-alert="currentRun.hasAlert"
        :progress="currentRun.progress"
        @end-trip="handleEndTrip"
      />
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
  IonIcon,
  alertController,
} from '@ionic/vue';
import { bus } from 'ionicons/icons';
import RunInfo from '@/components/RunInfo.vue';

// Estado del viaje actual
const currentRun = ref({
  route: '',
  direction: 'Hacia Deportivas',
  trajectory: 'Desde educación con milla',
  startTime: '10:55:37 a.m',
  operationDay: 'Entresemana',
  hasAlert: true,
  progress: 35,
});

// Manejar finalización del viaje
const handleEndTrip = async () => {
  const alert = await alertController.create({
    header: 'Finalizar viaje',
    message: '¿Estás seguro de que deseas finalizar el viaje?',
    buttons: [
      {
        text: 'Cancelar',
        role: 'cancel',
      },
      {
        text: 'Finalizar',
        role: 'confirm',
        handler: () => {
          // Aquí se implementará la lógica para finalizar el viaje
          console.log('Viaje finalizado');
        },
      },
    ],
  });

  await alert.present();
};
</script>

<style scoped>
.header-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.bus-icon {
  font-size: 2rem;
}

ion-content {
  --padding-top: 16px;
  --padding-bottom: 16px;
}
</style>
