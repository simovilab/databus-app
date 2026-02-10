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
      <div class="page-wrapper">

        <ion-card class="custom-card">
          <ion-card-content>

            <div class="avatar-container">
              <div class="avatar-outer">
                <div class="avatar-inner">
                  <ion-icon :icon="personCircleOutline" class="avatar-icon" />
                </div>
              </div>
            </div>

            <div class="name-container">
              <ion-text>
                <h2 class="name-text">{{ nombre }}</h2>
              </ion-text>
            </div>

            <ion-grid class="info-grid">
              <ion-row>
                <ion-col size="6">
                  <ion-text color="primary">
                    <p class="label-text">Cédula:</p>
                  </ion-text>
                  <ion-text color="dark">
                    <p class="value-text">{{ cedula }}</p>
                  </ion-text>
                </ion-col>

                <ion-col size="6" class="ion-text-end">
                  <ion-text color="primary">
                    <p class="label-text">Correo:</p>
                  </ion-text>
                  <ion-text color="dark">
                    <p class="value-text">{{ correo }}</p>
                  </ion-text>
                </ion-col>
              </ion-row>
            </ion-grid>

            <ion-item
              button
              detail
              lines="full"
              class="agency-item"
              @click="irAAgencia()"
            >
              <ion-label class="agency-label">Agencia</ion-label>
            </ion-item>

            <div class="vehicle-section">
              <ion-item lines="none" class="no-padding-item">
                <div style="width: 100%;">
                  <ion-text color="medium">
                    <p class="vehicle-title">Vehículo</p>
                  </ion-text>

                  <ion-item lines="none" class="vehicle-select-box">
                    <ion-icon :icon="searchOutline" slot="start" color="medium" />

                    <ion-select
                      v-model="vehiculoSeleccionado"
                      placeholder="Selecciona un vehículo"
                      interface="action-sheet"
                      class="full-width"
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

            <div class="confirm-btn-container">
              <ion-button
                color="success"
                shape="round"
                class="btn-confirm"
                @click="confirmarCambios()"
              >
                Confirmar Cambios
              </ion-button>
            </div>

          </ion-card-content>
        </ion-card>

        <div class="spacer"></div>

        <ion-button
          expand="block"
          fill="outline"
          color="primary"
          class="btn-edit"
          @click="openEditarPerfil()"
        >
          Editar Perfil
        </ion-button>

        <ion-button
          expand="block"
          color="primary"
          class="btn-logout"
          @click="cerrarSesion()"
        >
          Cerrar Sesión
        </ion-button>

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
            <ion-card class="custom-card">
              <ion-card-content>

                <div class="modal-intro">
                  <ion-text color="medium">
                    <p>Actualiza tus datos</p>
                  </ion-text>
                </div>

                <div class="input-wrapper">
                  <ion-input
                    v-model="editNombre"
                    label="Nombre completo"
                    label-placement="floating"
                    fill="outline"
                    mode="md"
                    placeholder="Ej: José Castro"
                    class="input-transparent"
                  />
                </div>

                <div class="input-wrapper">
                  <ion-input
                    v-model="editCedula"
                    label="Cédula"
                    label-placement="floating"
                    fill="outline"
                    mode="md"
                    placeholder="Ej: 1-1234-5678"
                    class="input-transparent"
                  />
                </div>

                <div class="input-wrapper">
                  <ion-input
                    v-model="editCorreo"
                    type="email"
                    inputmode="email"
                    label="Correo"
                    label-placement="floating"
                    fill="outline"
                    mode="md"
                    placeholder="Ej: jose_castro@gmail.com"
                    class="input-transparent"
                  />
                </div>

                <div class="modal-actions">
                  <ion-button
                    expand="block"
                    fill="outline"
                    color="primary"
                    class="btn-modal-cancel"
                    @click="cancelarEdicion()"
                  >
                    Cancelar
                  </ion-button>

                  <ion-button
                    expand="block"
                    color="success"
                    class="btn-modal-save"
                    @click="guardarEdicion()"
                  >
                    Guardar
                  </ion-button>
                </div>

              </ion-card-content>
            </ion-card>
          </ion-content>
        </ion-modal>
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

// Core Data
const nombre = ref("José Castro");
const cedula = ref("1-1234-5678");
const correo = ref("jose_castro@gmail.com");

const vehiculos = ref<string[]>(["SJB1234", "ABC9876", "XYZ1122"]);
const vehiculoSeleccionado = ref<string>("");

// Modal state
const isEditOpen = ref(false);
const editNombre = ref("");
const editCedula = ref("");
const editCorreo = ref("");

// Actions
const irAAgencia = () => {
  console.log("Go to agency selection");
};

const confirmarCambios = () => {
  console.log("Confirm changes:", vehiculoSeleccionado.value);
};

const cerrarSesion = () => {
  console.log("Log out");
};

// Modal helpers
const openEditarPerfil = () => {
  // Sync current data to modal fields
  editNombre.value = nombre.value;
  editCedula.value = cedula.value;
  editCorreo.value = correo.value;

  isEditOpen.value = true;
};

const guardarEdicion = () => {
  // Apply changes
  nombre.value = editNombre.value;
  cedula.value = editCedula.value;
  correo.value = editCorreo.value;

  isEditOpen.value = false;

  console.log("Profile updated:", {
    nombre: nombre.value,
    cedula: cedula.value,
    correo: correo.value,
  });
};

const cancelarEdicion = () => {
  isEditOpen.value = false;
};

const onDismissEdit = () => {
  isEditOpen.value = false;
};
</script>

<style scoped>
/* Layout */
.page-wrapper {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

.spacer {
  flex: 1;
}

.full-width {
  width: 100%;
}

.no-padding-item {
  --padding-start: 0;
  --inner-padding-end: 0;
}

/* Cards */
.custom-card {
  border-radius: 18px;
  margin: 0;
}

/* Avatar Section */
.avatar-container {
  display: flex;
  justify-content: center;
  margin-top: 6px;
}

.avatar-outer {
  width: 110px;
  height: 110px;
  border-radius: 999px;
  background: #e9f2ff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-inner {
  width: 86px;
  height: 86px;
  border-radius: 999px;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 6px solid #d8e9ff;
}

.avatar-icon {
  font-size: 64px;
}

/* Profile Info */
.name-container {
  text-align: center;
  margin-top: 12px;
}

.name-text {
  margin: 0;
  font-weight: 700;
}

.info-grid {
  margin-top: 10px;
}

.label-text {
  margin: 0;
  font-weight: 700;
}

.value-text {
  margin: 6px 0 0 0;
}

/* Agency */
.agency-item {
  --padding-start: 0;
  --inner-padding-end: 0;
  margin-top: 6px;
}

.agency-label {
  font-weight: 600;
}

/* Vehicle Section */
.vehicle-section {
  margin-top: 12px;
}

.vehicle-title {
  margin: 0 0 6px 0;
  font-size: 12px;
}

.vehicle-select-box {
  --background: transparent;
  --padding-start: 10px;
  --inner-padding-end: 8px;
  border: 2px solid #2b6cb0;
  border-radius: 6px;
}

/* Buttons */
.confirm-btn-container {
  display: flex;
  justify-content: center;
  margin-top: 18px;
}

.btn-confirm {
  width: 210px;
  height: 46px;
  text-transform: none;
  font-weight: 700;
}

.btn-edit {
  margin-top: 10px;
  border-radius: 999px;
  height: 52px;
  text-transform: none;
  font-weight: 700;
  --border-color: #1b72c0;
  --border-width: 2px;
  --border-style: solid;
}

.btn-logout {
  margin-top: 12px;
  border-radius: 999px;
  height: 54px;
  text-transform: none;
  font-weight: 700;
}

/* Modal Specific */
.modal-intro {
  text-align: center;
  margin-bottom: 10px;
}

.modal-intro p {
  margin: 0;
  font-size: 12px;
}

.input-wrapper {
  margin-bottom: 16px;
}

.input-transparent {
  --background: transparent;
}

.modal-actions {
  display: flex;
  gap: 10px;
  margin-top: 16px;
}

.btn-modal-cancel {
  flex: 1;
  border-radius: 999px;
  height: 50px;
  text-transform: none;
  font-weight: 700;
  --border-color: #1b72c0;
  --border-width: 2px;
  --border-style: solid;
}

.btn-modal-save {
  flex: 1;
  border-radius: 999px;
  height: 50px;
  text-transform: none;
  font-weight: 700;
}
</style>