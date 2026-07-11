<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Usuario</ion-title>
      </ion-toolbar>
      <ion-toolbar>
        <ion-segment v-model="segment" data-testid="user-segment">
          <ion-segment-button value="profile" data-testid="segment-profile">
            <ion-label>Perfil</ion-label>
          </ion-segment-button>
          <ion-segment-button value="settings" data-testid="segment-settings">
            <ion-label>Ajustes</ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <!-- Segment: profile -->
      <template v-if="segment === 'profile'">
        <section class="profile-card">
          <div class="profile-card__avatar">
            <ion-icon :icon="personCircleOutline" color="primary" />
          </div>
          <h2 class="profile-card__name">{{ fullName }}</h2>
          <p class="profile-card__id">Operador {{ operatorId }}</p>
        </section>

        <ion-button
          expand="block"
          fill="outline"
          data-testid="edit-profile"
          @click="profileEditOpen = true"
        >Editar perfil</ion-button>

        <section class="profile-actions">
          <ion-button
            expand="block"
            color="danger"
            fill="outline"
            data-testid="logout"
            :disabled="pending"
            @click="logout"
          >
            <ion-spinner v-if="pending" name="crescent" slot="start" />
            {{ pending ? 'Cerrando…' : 'Cerrar sesión' }}
          </ion-button>
        </section>

        <p class="profile-version">Databús · v0</p>
      </template>

      <!-- Segment: settings -->
      <template v-else>
        <ion-list lines="full">
          <ion-item>
            <ion-toggle
              :checked="settings.backgroundTelemetry"
              data-testid="setting-background"
              @ion-change="update({ backgroundTelemetry: $event.detail.checked })"
            >
              <ion-label>
                <h3>Telemetría en segundo plano</h3>
                <p>Seguir transmitiendo con la app en segundo plano.</p>
              </ion-label>
            </ion-toggle>
          </ion-item>
          <ion-item>
            <ion-toggle
              :checked="settings.keepScreenOn"
              data-testid="setting-screen"
              @ion-change="update({ keepScreenOn: $event.detail.checked })"
            >
              <ion-label>
                <h3>Mantener pantalla encendida</h3>
                <p>Evitar que la pantalla se apague durante un run.</p>
              </ion-label>
            </ion-toggle>
          </ion-item>
          <ion-item>
            <ion-select
              :value="settings.language"
              label="Idioma"
              interface="popover"
              data-testid="setting-language"
              @ion-change="update({ language: $event.detail.value })"
            >
              <ion-select-option value="es">Español</ion-select-option>
              <ion-select-option value="en">English</ion-select-option>
            </ion-select>
          </ion-item>
        </ion-list>

        <h2 class="settings-section-title">Tema</h2>
        <ion-list lines="full">
          <ion-radio-group
            :value="settings.paletteId"
            data-testid="setting-palette"
            @ion-change="update({ paletteId: $event.detail.value })"
          >
            <ion-item v-for="palette in palettes" :key="palette.id">
              <ion-radio
                :value="palette.id"
                label-placement="end"
                justify="start"
                :data-testid="`palette-${palette.id}`"
              >
                <div class="palette-option">
                  <span class="palette-name">{{ palette.name }}</span>
                  <span class="palette-swatches" aria-hidden="true">
                    <span
                      class="palette-swatch"
                      :style="{ backgroundColor: palette.primary }"
                    />
                    <span
                      class="palette-swatch"
                      :style="{ backgroundColor: palette.secondary }"
                    />
                    <span
                      class="palette-swatch"
                      :style="{ backgroundColor: palette.tertiary }"
                    />
                  </span>
                </div>
              </ion-radio>
            </ion-item>
          </ion-radio-group>
        </ion-list>
      </template>
    </ion-content>

    <profile-edit-modal
      :is-open="profileEditOpen"
      @dismissed="profileEditOpen = false"
    />
  </ion-page>
</template>

<script setup lang="ts">
// User tab (SITEMAP.md "user"). Two segments:
//   - Perfil:  institutional identity (read-only from login) + edit modal +
//              logout. Per the sitemap, editing happens in a modal.
//   - Ajustes: device-local app preferences (settings store).
import {
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonRadio,
  IonRadioGroup,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonTitle,
  IonToggle,
  IonToolbar,
} from '@ionic/vue';
import { personCircleOutline } from 'ionicons/icons';
import { computed, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';
import ProfileEditModal from '@/components/user/ProfileEditModal.vue';
import { useAuthStore } from '@/stores/auth';
import { useSettingsStore } from '@/stores/settings';
import { PALETTES } from '@/theme/palettes';

const router = useRouter();
const authStore = useAuthStore();
const settingsStore = useSettingsStore();
const { settings } = storeToRefs(settingsStore);
const update = settingsStore.update;
const palettes = PALETTES;

const segment = ref<'profile' | 'settings'>('profile');
const pending = ref(false);
const profileEditOpen = ref(false);

const fullName = computed(() => {
  const override = settings.value.displayName.trim();
  if (override) return override;
  const s = authStore.session;
  if (!s) return 'Operador';
  return [s.firstName, s.lastName].filter(Boolean).join(' ') || 'Operador';
});

const operatorId = computed(() => authStore.session?.operatorId ?? '—');

async function logout(): Promise<void> {
  pending.value = true;
  try {
    await authStore.logout();
  } catch {
    // Even if storage clearing fails, the store has nulled the in-memory
    // session; send the user to Login rather than stranding them.
  } finally {
    pending.value = false;
    router.replace('/login');
  }
}
</script>

<style scoped>
.profile-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--app-spacing-xs, 4px);
  padding: var(--app-spacing-xl, 32px) 0 var(--app-spacing-lg, 24px);
  text-align: center;
}

.profile-card__avatar ion-icon {
  font-size: 4rem;
}

.profile-card__name {
  margin: var(--app-spacing-sm, 8px) 0 0;
  font-size: 1.3rem;
  font-weight: 600;
}

.profile-card__id {
  margin: 0;
  color: var(--ion-color-medium);
  font-size: 0.9rem;
}

.profile-actions {
  margin-top: var(--app-spacing-md, 16px);
}

.profile-version {
  margin-top: var(--app-spacing-xl, 32px);
  text-align: center;
  color: var(--ion-color-medium);
  font-size: 0.8rem;
}

.settings-section-title {
  margin: var(--app-spacing-lg, 24px) 0 var(--app-spacing-xs, 4px);
  padding: 0 var(--app-spacing-md, 16px);
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--ion-color-medium);
}

.palette-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--app-spacing-md, 16px);
  width: 100%;
}

.palette-name {
  font-size: 0.95rem;
}

.palette-swatches {
  display: inline-flex;
  gap: 4px;
}

.palette-swatch {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.12);
}
</style>
