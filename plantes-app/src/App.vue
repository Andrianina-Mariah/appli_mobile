<template>
  <ion-app>
    <ion-router-outlet />
  </ion-app>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { IonApp, IonRouterOutlet } from '@ionic/vue';
import { demanderPermission, replanifierTout } from './services/notification.service';
import { syncService } from './services/sync.service';

onMounted(async () => {
  await demanderPermission();
  await syncService.syncPending();
  await replanifierTout();
  syncService.listen(() => {});
});
</script>
