<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Viajes</ion-title>
        <ThemeToggle slot="end" />
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <ion-header collapse="condense">
        <ion-toolbar>
          <ion-title size="large">Viajes</ion-title>
        </ion-toolbar>
      </ion-header>

      <ion-segment v-model="selectedTab">
        <ion-segment-button value="first">
          <ion-label>Viaje</ion-label>
        </ion-segment-button>
        <ion-segment-button value="second">
          <ion-label>Histórico</ion-label>
        </ion-segment-button>
      </ion-segment>

      <div v-if="selectedTab === 'first'" class="ion-padding-top">
        
        <h2 class="ion-text-center ion-margin-bottom" style="font-weight: bold;">
          Datos del viaje
        </h2>

        <div class="ion-padding-horizontal">
          
          <div class="input-wrapper ion-margin-bottom">
            <ion-select
              label="Ruta"
              label-placement="floating"
              fill="outline"
              placeholder="Seleccione ruta"
              mode="md"
              interface="action-sheet"
              class="custom-input"
              v-model="rutaSeleccionada"
            >
              <ion-select-option v-for="ruta in rutasDisponibles" :key="ruta" :value="ruta">
                {{ ruta }}
              </ion-select-option>
            </ion-select>
            
            <ion-button 
              v-if="rutaSeleccionada" 
              fill="clear" 
              class="clear-btn" 
              @click.stop="rutaSeleccionada = ''"
            >
              <ion-icon :icon="closeCircleOutline" slot="icon-only" color="medium"></ion-icon>
            </ion-button>
          </div>

          <div class="input-wrapper ion-margin-bottom">
            <ion-select
              label="Recorrido"
              label-placement="floating"
              fill="outline"
              placeholder="Seleccione recorrido"
              mode="md"
              interface="action-sheet"
              class="custom-input"
              v-model="recorridoSeleccionado"
            >
              <ion-select-option v-for="recorrido in recorridosDisponibles" :key="recorrido" :value="recorrido">
                {{ recorrido }}
              </ion-select-option>
            </ion-select>

             <ion-button 
              v-if="recorridoSeleccionado" 
              fill="clear" 
              class="clear-btn" 
              @click.stop="recorridoSeleccionado = ''"
            >
              <ion-icon :icon="closeCircleOutline" slot="icon-only" color="medium"></ion-icon>
            </ion-button>
          </div>

        </div>

        <div style="display: flex; justify-content: center;">
            <ion-button shape="round" color="success" style="--background: #66bb6a; width: 200px; height: 50px; text-transform: none; font-weight: 600;">
              <ion-icon slot="start" :icon="busOutline"></ion-icon>
              Comenzar viaje
            </ion-button>
          </div>

      </div>

      <div v-if="selectedTab === 'second'">
        <div class="ion-padding">
          <p>Contenido del histórico...</p>
        </div>
      </div>

    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { 
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, 
  IonSegment, IonSegmentButton, IonLabel, 
  IonIcon, IonButton,
  IonSelect, IonSelectOption 
} from '@ionic/vue';
import { 
  closeCircleOutline, 
  busOutline 
} from 'ionicons/icons';
import ThemeToggle from '@/components/ThemeToggle.vue';

const selectedTab = ref('first');
const rutaSeleccionada = ref('');
const recorridoSeleccionado = ref('');

// Ruta data
const rutasDisponibles = [
  'bUCR L1', 
  'bUCR L2', 
  'bUCR L3', 
];

// Recorrido data
const recorridosDisponibles = [
  'Bus interno UCR ida',
  'Bus interno UCR vuelta',

];
</script>

<style scoped>

.input-wrapper {
  position: relative;
  width: 100%;
}

.custom-input {
  --border-radius: 4px;
  --border-width: 2px;
  font-weight: 500;
}

/* X clear btn */
.clear-btn {
  position: absolute;
  right: 30px; /* Lo ponemos a la izquierda de la flechita del select */
  top: 0;
  bottom: 0;
  margin: auto;
  z-index: 10;
  height: 30px;
  width: 30px;
  --padding-start: 0;
  --padding-end: 0;
}
</style>