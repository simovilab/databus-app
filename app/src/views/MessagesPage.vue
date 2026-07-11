<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Mensajes</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <EmptyState
        title="Sin mensajes"
        message="La mensajería operativa (chat, anuncios y alertas de servicio) llegará en una próxima versión."
        :icon="chatbubblesOutline"
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
