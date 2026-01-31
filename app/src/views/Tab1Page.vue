<template>
  <ion-page>
    <!-- Person Name -->
    <ion-header class="ion-no-border">
      <ion-toolbar color="primary">
        <ion-title>
          <div>
            <strong>Hola, José Castro</strong>
          </div>
        </ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="ion-padding">
      <div  style="display: flex; flex-direction: column; height: 100%;" 
        class="content-wrapper">
        
        <!-- Information Card -->
        <ion-card class="info-card ion-no-margin" color="light">
          <ion-card-content>
            <ion-grid class="ion-no-padding">
              <ion-row>
                <ion-col size="6">
                  <ion-text color="medium">
                    <small>Vehículo</small>
                  </ion-text>
                  <div>
                    <ion-text color="dark">
                      <strong>SJB1234</strong>
                    </ion-text>
                  </div>
                </ion-col>

                <ion-col size="6" class="ion-text-end">
                  <ion-text color="medium">
                    <small>Agencia</small>
                  </ion-text>
                  <div>
                    <ion-text color="dark">
                      <strong>bUCR</strong>
                    </ion-text>
                  </div>
                </ion-col>
              </ion-row>
            </ion-grid>
          </ion-card-content>
        </ion-card>
      
      <!-- Logo -->
      <div style="display: flex; flex-direction: column; height: 100%;">
        <ion-card class="ion-no-margin" style="background-color: #DDEAF6;">
          </ion-card>

        <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center;">
          <ion-img :src="bAzul" style="width: 180px; height: 180px;" />
          <ion-text color="primary" class="ion-text-center ion-margin-top">
            <p><strong>Servicio de buses de la<br>Universidad de Costa Rica</strong></p>
          </ion-text>
        </div>
      </div>
    </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonGrid,
  IonRow,
  IonCol,
  IonImg,
  IonText,
  IonCard,
  IonCardContent,
} from "@ionic/vue";
import bAzul from '@/assets/icons/b_azul.png';
</script>