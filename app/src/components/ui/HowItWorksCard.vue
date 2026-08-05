<template>
  <ion-card class="home-card how-it-works">
    <ion-card-content>
      <h2 class="how-it-works__title">¿Cómo funciona?</h2>
      <p class="how-it-works__intro">
        Databús gestiona los viajes del transporte público para actualizar en tiempo real la
        información que reciben las personas usuarias.
      </p>
      <ol class="how-it-works__list">
        <li v-for="step in steps" :key="step.lead" class="how-it-works__item">
          <span class="how-it-works__badge" aria-hidden="true">{{ step.index }}</span>
          <p class="how-it-works__text">
            <strong>{{ step.lead }}</strong> — {{ step.detail }}
          </p>
        </li>
      </ol>
    </ion-card-content>
  </ion-card>
</template>

<script setup lang="ts">
// "¿Cómo funciona?" — a short, always-visible explainer card at the bottom of
// the Home feed (Card Stack), so a new operator can learn the create → review
// → confirm → finish flow without leaving Home. Renders unconditionally,
// including when there's no run history yet. Content is approved copy —
// verbatim, do not rewrite.
import { IonCard, IonCardContent } from '@ionic/vue';

interface Step {
  index: number;
  lead: string;
  detail: string;
}

const steps: Step[] = [
  {
    index: 1,
    lead: 'Configure una carrera',
    detail: 'seleccione la ruta, el viaje programado y el vehículo.',
  },
  {
    index: 2,
    lead: 'Revise y confirme',
    detail: 'verifique el resumen e inicie el viaje; desde ese momento se transmite su posición.',
  },
  {
    index: 3,
    lead: 'Si el viaje se interrumpe',
    detail: 'la carrera queda marcada como interrumpida y puede iniciar una nueva desde el botón +.',
  },
  {
    index: 4,
    lead: 'Para finalizar',
    detail: 'toque Finalizar carrera; quedará registrada en Actividad reciente.',
  },
];
</script>

<style scoped>
.how-it-works__title {
  margin: 0 0 var(--app-spacing-sm, 8px);
  font-size: var(--app-font-size-lg);
  font-weight: var(--app-font-weight-semibold);
}

.how-it-works__intro {
  margin: 0 0 var(--app-spacing-md, 16px);
  color: var(--ion-color-medium);
}

.how-it-works__list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--app-spacing-md, 16px);
}

.how-it-works__item {
  display: flex;
  align-items: flex-start;
  gap: var(--app-spacing-sm, 8px);
}

.how-it-works__badge {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--app-tint-primary);
  color: var(--ion-color-primary);
  font-size: var(--app-font-size-sm);
  font-weight: var(--app-font-weight-semibold);
}

.how-it-works__text {
  margin: 0;
  padding-top: 2px;
  font-size: var(--app-font-size-md);
  line-height: var(--app-line-height-relaxed, 1.55);
}

.how-it-works__text strong {
  font-weight: var(--app-font-weight-semibold);
}
</style>
