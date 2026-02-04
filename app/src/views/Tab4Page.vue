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
          @click="openEditarPerfil()"
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

        <!-- ================= MODAL EDITAR PERFIL ================= -->
        <ion-modal :is-open="isEditOpen" @didDismiss="onDismissEdit()">
          <ion-header class="ion-no-border">
            <ion-toolbar color="primary">
              <ion-title class="ion-text-center">Editar Perfil</ion-title>

              <ion-buttons slot="end">
                <ion-button fill="clear" @click="cancelarEdicion()">
                  <ion-icon slot="icon-only" :icon="closeOutline" />
                </ion-button>
              </ion-buttons>
            </ion-toolbar>
          </ion-header>

          <ion-content class="ion-padding">
            <ion-card style="border-radius: 18px; margin: 0;">
              <ion-card-content>

                <div style="text-align: center; margin-bottom: 10px;">
                  <ion-text color="medium">
                    <p style="margin: 0; font-size: 12px;">Actualiza tus datos</p>
                  </ion-text>
                </div>

                <ion-item lines="none" style="--padding-start: 0; --inner-padding-end: 0; margin-bottom: 12px;">
                  <ion-input
                    v-model="editNombre"
                    label="Nombre completo"
                    label-placement="floating"
                    fill="outline"
                    mode="md"
                    placeholder="Ej: José Castro"
                  />
                </ion-item>

                <ion-item lines="none" style="--padding-start: 0; --inner-padding-end: 0; margin-bottom: 12px;">
                  <ion-input
                    v-model="editCedula"
                    label="Cédula"
                    label-placement="floating"
                    fill="outline"
                    mode="md"
                    placeholder="Ej: 1-1234-5678"
                  />
                </ion-item>

                <ion-item lines="none" style="--padding-start: 0; --inner-padding-end: 0;">
                  <ion-input
                    v-model="editCorreo"
                    type="email"
                    inputmode="email"
                    label="Correo"
                    label-placement="floating"
                    fill="outline"
                    mode="md"
                    placeholder="Ej: jose_castro@gmail.com"
                  />
                </ion-item>

                <div style="display: flex; gap: 10px; margin-top: 16px;">
                  <ion-button
                    expand="block"
                    fill="outline"
                    color="primary"
                    style="
                      flex: 1;
                      border-radius: 999px;
                      height: 50px;
                      text-transform: none;
                      font-weight: 700;
                      --border-color: #1b72c0;
                      --border-width: 2px;
                      --border-style: solid;
                    "
                    @click="cancelarEdicion()"
                  >
                    Cancelar
                  </ion-button>

                  <ion-button
                    expand="block"
                    color="success"
                    style="
                      flex: 1;
                      border-radius: 999px;
                      height: 50px;
                      text-transform: none;
                      font-weight: 700;
                    "
                    @click="guardarEdicion()"
                  >
                    Guardar
                  </ion-button>
                </div>

              </ion-card-content>
            </ion-card>
          </ion-content>
        </ion-modal>
        <!-- ====================================================== -->

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
  IonModal,
  IonInput,
} from "@ionic/vue";

import {
  personCircleOutline,
  searchOutline,
  chevronForwardOutline,
  closeOutline,
} from "ionicons/icons";

import ThemeToggle from "@/components/ThemeToggle.vue";

// Datos principales
const nombre = ref("José Castro");
const cedula = ref("1-1234-5678");
const correo = ref("jose_castro@gmail.com");

const vehiculos = ref<string[]>(["SJB1234", "ABC9876", "XYZ1122"]);
const vehiculoSeleccionado = ref<string>("");

// Modal state + campos editables
const isEditOpen = ref(false);
const editNombre = ref("");
const editCedula = ref("");
const editCorreo = ref("");

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

// --- Modal helpers ---
const openEditarPerfil = () => {
  // Copia valores actuales a los campos del modal
  editNombre.value = nombre.value;
  editCedula.value = cedula.value;
  editCorreo.value = correo.value;

  isEditOpen.value = true;
};

const guardarEdicion = () => {
  // Aplica cambios
  nombre.value = editNombre.value;
  cedula.value = editCedula.value;
  correo.value = editCorreo.value;

  isEditOpen.value = false;

  console.log("Perfil actualizado:", {
    nombre: nombre.value,
    cedula: cedula.value,
    correo: correo.value,
  });
};

const cancelarEdicion = () => {
  // No aplica cambios, solo cierra
  isEditOpen.value = false;
};

const onDismissEdit = () => {
  // Por si el usuario cierra deslizando
  isEditOpen.value = false;
};
</script>
