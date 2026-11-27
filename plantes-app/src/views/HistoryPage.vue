<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-menu-button /></ion-buttons>
        <ion-title>Historique</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <div v-if="loading" class="center"><ion-spinner /></div>
      <div v-else-if="evenements.length === 0" class="empty-state">
        <ion-icon :icon="leafOutline" />
        <h2>Aucun arrosage enregistré</h2>
        <p>Les arrosages effectués apparaîtront ici.</p>
      </div>
      <ion-list v-else lines="none">
        <ion-item v-for="evenement in evenements" :key="`${evenement.plantId}-${evenement.date}`" class="history-item">
          <div slot="start" class="history-icon"><ion-icon :icon="waterOutline" /></div>
          <ion-label>
            <h2>{{ evenement.nom }}</h2>
            <p>{{ evenement.date }}</p>
          </ion-label>
        </ion-item>
      </ion-list>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { IonPage, IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent, IonSpinner, IonIcon, IonList, IonItem, IonLabel } from '@ionic/vue';
import { leafOutline, waterOutline } from 'ionicons/icons';
import { useAuthStore } from '../stores/auth.store';
import { plantService } from '../services/plant.service';

interface Evenement { plantId: string; nom: string; date: string }
const loading = ref(true);
const evenements = ref<Evenement[]>([]);

onMounted(async () => {
  const auth = useAuthStore();
  if (auth.user) {
    const plantes = await plantService.getPlants(auth.user.uid);
    evenements.value = plantes.flatMap((plant) =>
      (plant.historiqueArrosage ?? []).map((date) => ({ plantId: plant.id ?? '', nom: plant.nom, date }))
    ).sort((a, b) => b.date.localeCompare(a.date));
  }
  loading.value = false;
});
</script>

<style scoped>
.center { display: grid; place-items: center; min-height: 240px; }
.empty-state { text-align: center; padding: 72px 20px; color: var(--ion-color-medium); }
.empty-state ion-icon { font-size: 64px; color: var(--ion-color-success); }
.history-item { margin: 8px 0; border: 1px solid var(--ion-border-color); border-radius: 18px; }
.history-icon { width: 44px; height: 44px; border-radius: 14px; display: grid; place-items: center; background: var(--app-water-soft); color: var(--ion-color-primary); }
</style>
