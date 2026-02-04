<template>
  <ion-page>
    <ion-header class="ion-no-border">
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/tab1" />
        </ion-buttons>

        <ion-title class="ion-text-center">Perfil</ion-title>

        <ThemeToggle slot="end" />
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="ion-padding">
      
      <div style="display: flex; flex-direction: column; min-height: 100%;">

        <!-- Main Card -->
        <ion-card style="border-radius: 18px; margin: 0;">
          <ion-card-content>

            <!-- Avatar -->
            <div style="display: flex; justify-content: center; margin-top: 6px;">
              <div
                style="
                  width: 110px;
                  height: 110px;
                  border-radius: 999px;
                  background: #e9f2ff;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                "
              >
                <div
                  style="
                    width: 86px;
                    height: 86px;
                    border-radius: 999px;
                    background: #ffffff;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 6px solid #d8e9ff;
                  "
                >
                  <ion-icon :icon="personCircleOutline" style="font-size: 64px;" />
                </div>
              </div>
            </div>

            <!-- Nombre -->
            <div style="text-align: center; margin-top: 12px;">
              <ion-text>
                <h2 style="margin: 0; font-weight: 700;">{{ nombre }}</h2>
              </ion-text>
            </div>

            <!-- Cédula / Correo -->
            <ion-grid style="margin-top: 10px;">
              <ion-row>
                <ion-col size="6">
                  <ion-text color="primary">
                    <p style="margin: 0; font-weight: 700;">Cédula:</p>
                  </ion-text>
                  <ion-text color="dark">
                    <p style="margin: 6px 0 0 0;">{{ cedula }}</p>
                  </ion-text>
                </ion-col>

                <ion-col size="6" class="ion-text-end">
                  <ion-text color="primary">
                    <p style="margin: 0; font-weight: 700;">Correo:</p>
                  </ion-text>
                  <ion-text color="dark">
                    <p style="margin: 6px 0 0 0;">{{ correo }}</p>
                  </ion-text>
                </ion-col>
              </ion-row>
            </ion-grid>

            <!-- Agencia -->
            <ion-item
              button
              detail
              lines="full"
              style="--padding-start: 0; --inner-padding-end: 0; margin-top: 6px;"
              @click="irAAgencia()"
            >
              <ion-label style="font-weight: 600;">Agencia</ion-label>
            </ion-item>

            <!-- Vehículo -->
            <div style="margin-top: 12px;">
              <ion-item lines="none" style="--padding-start: 0; --inner-padding-end: 0;">
                <div style="width: 100%;">
                  <ion-text color="medium">
                    <p style="margin: 0 0 6px 0; font-size: 12px;">Vehículo</p>
                  </ion-text>

                  <ion-item
                    lines="none"
                    style="
                      --background: transparent;
                      --padding-start: 10px;
                      --inner-padding-end: 8px;
                      border: 2px solid #2b6cb0;
                      border-radius: 6px;
                    "
                  >
                    <ion-icon :icon="searchOutline" slot="start" color="medium" />

                    <ion-select
                      v-model="vehiculoSeleccionado"
                      placeholder="Selecciona un vehículo"
                      interface="action-sheet"
                      style="width: 100%;"
                    >
                      <ion-select-option v-for="v in vehiculos" :key="v" :value="v">
                        {{ v }}
                      </ion-select-option>
                    </ion-select>

                    <ion-icon :icon="chevronForwardOutline" slot="end" color="medium" />
                  </ion-item>
                </div>
              </ion-item>
            </div>

            <!-- Confirmar cambios -->
            <div style="display: flex; justify-content: center; margin-top: 18px;">
              <ion-button
                color="success"
                shape="round"
                style="width: 210px; height: 46px; text-transform: none; font-weight: 700;"
                @click="confirmarCambios()"
              >
                Confirmar Cambios
              </ion-button>
            </div>

          </ion-card-content>
        </ion-card>


        <!-- Empuja el contenido hacia arriba -->
        <div style="flex: 1;"></div>

        <!-- Botón Editar Perfil -->
        <ion-button
          expand="block"
          fill="outline"
          color="primary"
          style="
            margin-top: 10px;
            border-radius: 999px;
            height: 52px;
            text-transform: none;
            font-weight: 700;
            --border-color: #1b72c0;
            --border-width: 2px;
            --border-style: solid;
          "
          @click="editarPerfil()"
        >
          Editar Perfil
        </ion-button>

        <!-- Botón Cerrar Sesión -->
        <ion-button
          expand="block"
          color="primary"
          style="
            margin-top: 12px;
            border-radius: 999px;
            height: 54px;
            text-transform: none;
            font-weight: 700;
          "
          @click="cerrarSesion()"
        >
          Cerrar Sesión
        </ion-button>

      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref } from "vue";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonBackButton,
  IonCard,
  IonCardContent,
  IonText,
  IonGrid,
  IonRow,
  IonCol,
  IonItem,
  IonLabel,
  IonIcon,
  IonSelect,
  IonSelectOption,
  IonButton,
} from "@ionic/vue";

import {
  personCircleOutline,
  searchOutline,
  chevronForwardOutline
} from "ionicons/icons";

import ThemeToggle from "@/components/ThemeToggle.vue";

const nombre = ref("José Castro");
const cedula = ref("1-1234-5678");
const correo = ref("jose_castro@gmail.com");

const vehiculos = ref<string[]>(["SJB1234", "ABC9876", "XYZ1122"]);
const vehiculoSeleccionado = ref<string>("");

// Acciones
const irAAgencia = () => {
  console.log("Ir a seleccionar agencia");
};

const confirmarCambios = () => {
  console.log("Confirmar cambios:", vehiculoSeleccionado.value);
};

const cerrarSesion = () => {
  console.log("Cerrar sesión");
};

const editarPerfil = () => {
  console.log("Editar perfil");
  // router.push('/editar-perfil');
};
</script>
