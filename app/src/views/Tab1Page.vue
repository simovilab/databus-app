<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Tab 1</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true">
      <ion-header collapse="condense">
        <ion-toolbar>
          <ion-title size="large">Tab 1</ion-title>
        </ion-toolbar>
      </ion-header>

      <ExploreContainer name="Tres tristes tigres tragan trigo en un trigal" />

      <IonLabel>Esto es una label super atravesada</IonLabel><br></br>
      <IonButton @click="loadData">Mostrar Datos</IonButton><br></br>
      <IonButton @click="refreshCounter">Resetear Contador</IonButton><br></br>
      <IonLabel>Contador actual: {{ counter }}</IonLabel><br></br>
      <IonRange v-model="rangeValue" :min="0" :max="100" :step="1" :snaps="true" :ticks="true"></IonRange><br></br>
      <IonLabel>Valor del Slider: {{ rangeValue }}</IonLabel><br></br>


      <ion-list>
        <ion-item>
          <ion-label>ID Usuario: {{ d1 }}</ion-label>
        </ion-item>
        <ion-item>
          <ion-label>Título: {{ d2 }}</ion-label>
        </ion-item>
        <ion-item>
          <ion-label>Contenidos: {{ d3 }}</ion-label>
        </ion-item>
      </ion-list>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
/** Imports section */
  import {
    IonPage,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonLabel,
    IonButton,
    IonRange,
  } from "@ionic/vue";
  import ExploreContainer from "@/components/ExploreContainer.vue";
  import { fetchInitialData } from "@/API_Fetch/Parent_Fetch";      
  import { ref, reactive } from "vue";


  /** Variables section */ 
  const d1 = ref<number>();
  const d2 = ref<string>();
  const d3 = ref<string>();
  const counter = ref<number>(0);
  const rangeValue = ref<number>(0);

  /** Functions section */
  async function loadData() {
    try {
      const data = await fetchInitialData();
      if (data.length >= 3) {
        d1.value = data[counter.value].userId;
        d2.value = data[counter.value].title;
        d3.value = data[counter.value].body;
      }
    } catch (error) {
      console.error("Error loading data:", error);
    }    
    counter.value += 1;
  }

  function refreshCounter() {
    counter.value = 0;
    loadData();
  }

</script>
