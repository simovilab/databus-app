<template>
  <ion-page>
    <ion-content :fullscreen="true" class="login-content">
      <div class="login-shell login-shell--enter">
        <header class="login-brand">
          <BrandLogo variant="light" height="56px" class="login-brand__logo" />
          <p class="login-brand__tagline">App</p>
        </header>

        <form class="login-form login-form--card" novalidate @submit.prevent="submit">
          <ion-input
            class="login-field"
            :class="{
              'ion-invalid': touched.username && !username,
              'ion-touched': touched.username,
            }"
            v-model="username"
            label="Usuario"
            label-placement="stacked"
            fill="outline"
            autocomplete="username"
            inputmode="text"
            helper-text="Tu identificador de operador"
            error-text="El usuario es obligatorio"
            @ion-blur="touched.username = true"
          />

          <ion-input
            class="login-field"
            :class="{
              'ion-invalid': touched.password && !password,
              'ion-touched': touched.password,
            }"
            v-model="password"
            label="Contraseña"
            label-placement="stacked"
            fill="outline"
            type="password"
            autocomplete="current-password"
            helper-text="Clave de acceso asignada"
            error-text="La contraseña es obligatoria"
            @ion-blur="touched.password = true"
          />

          <AppError
            v-if="loginError"
            class="login-form__error"
            :error="loginError"
            fallback-message="No se pudo iniciar sesión. Verifica tus credenciales."
          />

          <ion-button
            type="submit"
            expand="block"
            class="login-form__submit"
            :disabled="pending"
          >
            <ion-spinner v-if="pending" name="crescent" slot="start" />
            {{ pending ? 'Ingresando…' : 'Iniciar sesión' }}
          </ion-button>

          <button
            type="button"
            class="login-form__recovery"
            disabled
            tabindex="-1"
            aria-disabled="true"
          >
            ¿Olvidaste tu contraseña? (próximamente)
          </button>
        </form>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
// Login screen (master-plan §2.1 row 2, §4.1 `/login/`). Submits credentials
// to `useAuthStore().login()` — no fetch code here. On success we replace into
// `/tabs/home`; on an `ApiError` (bad creds, network) we surface a friendly,
// Spanish-language message. Submit is disabled while pending and required
// fields are validated locally so an empty form never hits the API. Password
// recovery is out of scope for v0 (deferred to §11) — shown as a disabled
// "coming soon" affordance only.
import { IonButton, IonContent, IonInput, IonPage, IonSpinner } from '@ionic/vue';
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import AppError from '@/components/ui/AppError.vue';
import BrandLogo from '@/components/ui/BrandLogo.vue';
import { useAuthStore } from '@/stores/auth';
import { ApiError } from '@/services/apiClient';

const router = useRouter();
const authStore = useAuthStore();

const username = ref('');
const password = ref('');
const pending = ref(false);
const loginError = ref<string | null>(null);
const touched = ref({ username: false, password: false });

/** Pulls a user-facing message out of a thrown ApiError or unknown value. */
function toLoginMessage(error: unknown): string {
  if (error instanceof ApiError) {
    // A failed fetch (no response) is reported as status 0 with an English
    // "Network request failed" detail — translate it rather than leak it.
    if (error.status === 0) {
      return 'Sin conexión al servidor. Revisa tu red e inténtalo de nuevo.';
    }
    const errors = error.errors;
    if (errors && typeof errors === 'object' && 'detail' in errors) {
      const detail = (errors as { detail: unknown }).detail;
      // The backend's own {error} message is already Spanish and friendly
      // (e.g. "Usuario o contraseña incorrectos"), so prefer it verbatim.
      if (typeof detail === 'string' && detail.trim()) return detail;
    }
    if (error.status >= 500) {
      return 'El servidor no está disponible. Inténtalo más tarde.';
    }
    return error.message || 'No se pudo iniciar sesión.';
  }
  if (error instanceof Error && error.message) return error.message;
  return 'No se pudo iniciar sesión. Verifica tus credenciales.';
}

async function submit(): Promise<void> {
  // Mark everything touched so validation errors show on a direct submit.
  touched.value = { username: true, password: true };
  loginError.value = null;

  if (!username.value || !password.value) {
    return;
  }

  pending.value = true;
  try {
    await authStore.login(username.value, password.value);
    router.replace('/tabs/home');
  } catch (error: unknown) {
    loginError.value = toLoginMessage(error);
  } finally {
    pending.value = false;
  }
}
</script>

<style scoped>
.login-content {
  --background: var(--ion-color-secondary);
}

.login-shell {
  display: flex;
  flex-direction: column;
  gap: var(--app-spacing-xl, 32px);
  max-width: 420px;
  margin: 0 auto;
  padding: var(--app-spacing-xl, 32px) var(--app-spacing-lg, 24px);
  min-height: 100%;
  justify-content: center;
}

.login-brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.login-brand__logo {
  margin: 0 auto;
}

.login-brand__tagline {
  margin: var(--app-spacing-xs, 4px) 0 0;
  color: var(--ion-color-medium-tint, #797e7b);
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.15em;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: var(--app-spacing-md, 16px);
}

/* Card Stack: the sign-in form floats as its own soft, rounded surface on
   the brand-dark background, rather than bare fields on flat color. */
.login-form--card {
  padding: var(--app-spacing-lg, 24px);
  border-radius: var(--app-radius-xl, 24px);
  background: rgba(255, 255, 255, 0.04);
  box-shadow: var(--app-shadow-md);
}

.login-field {
  --color: var(--ion-color-light);
  --placeholder-color: var(--ion-color-medium-tint, #797e7b);
  --border-radius: var(--app-radius-btn, 12px);
}

.login-form__error {
  background: rgba(235, 68, 90, 0.08);
  border-radius: var(--app-radius-md, 8px);
}

.login-form__submit {
  margin-top: var(--app-spacing-sm, 8px);
}

.login-form__recovery {
  background: none;
  border: none;
  padding: var(--app-spacing-sm, 8px);
  color: var(--ion-color-medium-tint, #797e7b);
  font-size: 0.85rem;
  cursor: not-allowed;
  text-align: center;
}

/* Gentle entrance — the shell fades/slides in on mount. */
.login-shell--enter {
  animation: login-enter var(--app-motion-base, 240ms) var(--app-motion-ease, ease-out);
}
@keyframes login-enter {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
