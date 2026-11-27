<template>
  <ion-app>
    <ion-menu content-id="main-content" menu-id="main-menu" type="overlay">
      <ion-header>
        <ion-toolbar class="menu-brand"><ion-title><span class="brand-mark">M</span> Mes Plantes</ion-title></ion-toolbar>
      </ion-header>
      <ion-content>
        <ion-list lines="none" class="menu-list">
          <ion-menu-toggle :auto-hide="false">
            <ion-item button router-link="/dashboard" router-direction="root"><ion-icon :icon="gridOutline" slot="start" /><ion-label>Tableau de bord</ion-label></ion-item>
            <ion-item button router-link="/plants" router-direction="root"><ion-icon :icon="leafOutline" slot="start" /><ion-label>Mes plantes</ion-label></ion-item>
            <ion-item button router-link="/history" router-direction="root"><ion-icon :icon="timeOutline" slot="start" /><ion-label>Historique</ion-label></ion-item>
            <ion-item button router-link="/settings" router-direction="root"><ion-icon :icon="settingsOutline" slot="start" /><ion-label>Réglages</ion-label></ion-item>
          </ion-menu-toggle>
        </ion-list>
      </ion-content>
    </ion-menu>
    <ion-router-outlet id="main-content" />
  </ion-app>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { IonApp, IonMenu, IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonMenuToggle, IonItem, IonIcon, IonLabel, IonRouterOutlet } from '@ionic/vue';
import { gridOutline, leafOutline, timeOutline, settingsOutline } from 'ionicons/icons';
import { demanderPermission, replanifierTout } from './services/notification.service';
import { syncService } from './services/sync.service';

onMounted(async () => {
  await demanderPermission();
  await syncService.syncPending();
  await replanifierTout();
  syncService.listen(() => {});
});
</script>

<style scoped>
.brand-mark { display:inline-grid;place-items:center;width:34px;height:34px;border-radius:11px;margin-right:8px;background:var(--ion-color-primary);color:white;font-weight:900; }
.menu-list { padding:12px 8px; }.menu-list ion-item { --border-radius:14px;margin:4px 0;--padding-start:14px; }.menu-list ion-icon { color:var(--ion-color-primary); }
</style>
