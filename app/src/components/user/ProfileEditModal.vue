<template>
  <ion-modal
    :is-open="isOpen"
    role="dialog"
    aria-label="Editar perfil"
    @did-dismiss="onCancel"
  >
    <ion-header>
      <ion-toolbar>
        <ion-title>Editar perfil</ion-title>
        <ion-buttons slot="start">
          <ion-button data-testid="profile-edit-cancel" @click="onCancel">Cancelar</ion-button>
        </ion-buttons>
        <ion-buttons slot="end">
          <ion-button
            strong
            data-testid="profile-edit-save"
            :disabled="saving"
            @click="onSave"
          >Guardar</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <ion-list lines="full">
        <ion-item>
          <ion-input
            v-model="displayName"
            label="Nombre para mostrar"
            label-placement="stacked"
            data-testid="profile-display-name"
            :placeholder="institutionalName"
          />
        </ion-item>
      </ion-list>
      <p class="hint">
        La identidad institucional ({{ institutionalName }}, operador
        {{ operatorId }}) proviene del inicio de sesión y no se puede editar
        aquí. El nombre para mostrar es solo para este dispositivo.
      </p>
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
// Profile-edit modal (SITEMAP.md — "cada espacio de edición es un modal").
// The institutional identity is read-only (LDAP-backed, no update endpoint),
// so the only editable field is a device-local display-name override kept in
// the settings store.
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonList,
  IonModal,
  IonTitle,
  IonToolbar,
} from '@ionic/vue';
import { computed, ref, watch } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useSettingsStore } from '@/stores/settings';

const props = defineProps<{ isOpen: boolean }>();
const emit = defineEmits<{ (e: 'dismissed'): void }>();

const authStore = useAuthStore();
const settingsStore = useSettingsStore();

const displayName = ref('');
const saving = ref(false);

const institutionalName = computed(() => {
  const s = authStore.session;
  if (!s) return 'Operador';
  return [s.firstName, s.lastName].filter(Boolean).join(' ') || 'Operador';
});
const operatorId = computed(() => authStore.session?.operatorId ?? '—');

// Seed the field from the stored override each time the modal opens.
watch(
  () => props.isOpen,
  (open) => {
    if (open) displayName.value = settingsStore.settings.displayName;
  },
);

async function onSave(): Promise<void> {
  saving.value = true;
  try {
    await settingsStore.update({ displayName: displayName.value.trim() });
    emit('dismissed');
  } finally {
    saving.value = false;
  }
}

function onCancel(): void {
  emit('dismissed');
}
</script>

<style scoped>
.hint {
  margin-top: var(--app-spacing-md, 16px);
  color: var(--ion-color-medium);
  font-size: 0.85rem;
  line-height: 1.4;
}
</style>
