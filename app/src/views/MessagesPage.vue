<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Mensajes</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <EmptyState
        title="Todo tranquilo por aquí"
        message="Muy pronto verás aquí tus anuncios, alertas de servicio y chat con la central."
        :icon="chatbubblesOutline"
        accent="tertiary"
      />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
// Messages tab (SITEMAP.md "messages"). Operator chat / announcements / alerts
// have no backend yet, so this is an honest placeholder. The tab and its
// unread badge (TabsPage.vue) already exist so the navigation matches the
// sitemap; the list content lands when a messaging service is available.
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/vue';
import { chatbubblesOutline } from 'ionicons/icons';
import EmptyState from '@/components/ui/EmptyState.vue';
</script>
