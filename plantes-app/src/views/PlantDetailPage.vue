<template>
  <ion-page>
    <ion-header><ion-toolbar><ion-buttons slot="start"><ion-back-button default-href="/plants" /></ion-buttons><ion-title>{{ plant?.nom ?? 'Plante' }}</ion-title></ion-toolbar></ion-header>
    <ion-content class="ion-padding">
      <ion-spinner v-if="loading" />
      <div v-else-if="plant">
        <img :src="plant.photoUrl || '/src/assets/plant-default.svg'" class="detail-photo" alt="" />
        <h1>{{ plant.nom }}</h1><p class="species">{{ plant.espece }}</p>
        <ion-list>
          <ion-item><ion-label>Exposition</ion-label><ion-note slot="end">{{ expositionLabel }}</ion-note></ion-item>
          <ion-item><ion-label>Fréquence</ion-label><ion-note slot="end">Tous les {{ plant.frequenceArrosage }} jours</ion-note></ion-item>
          <ion-item><ion-label>Dernier arrosage</ion-label><ion-note slot="end">{{ plant.dernierArrosage }}</ion-note></ion-item>
          <ion-item><ion-label>Prochain arrosage</ion-label><ion-note slot="end">{{ prochainArrosage(plant) }}</ion-note></ion-item>
        </ion-list>
        <p v-if="plant.notes">{{ plant.notes }}</p>
        <section v-if="plant.historiqueArrosage?.length" class="history">
          <h2>Historique d’arrosage</h2>
          <ion-chip v-for="date in plant.historiqueArrosage" :key="date">
            <ion-icon :icon="waterOutline" />
            <ion-label>{{ date }}</ion-label>
          </ion-chip>
        </section>
        <ion-button expand="block" :disabled="watering" @click="marquerArrosee">J’ai arrosé</ion-button>
        <ion-button expand="block" fill="outline" :router-link="`/plants/${plant.id}/edit`">Modifier</ion-button>
        <ion-button expand="block" color="danger" fill="clear" @click="confirmDelete">Supprimer</ion-button>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { alertController, toastController, IonPage, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, IonSpinner, IonList, IonItem, IonLabel, IonNote, IonButton, IonChip, IonIcon } from '@ionic/vue';
import { waterOutline } from 'ionicons/icons';
import type { Plant } from '../models/plant.model';
import { plantService } from '../services/plant.service';
import { storageService } from '../services/storage.service';
import { dateLocaleISO, prochainArrosage } from '../utils/plant-dates';
import { annulerRappels, planifierRappels } from '../services/notification.service';

const route = useRoute(); const router = useRouter();
const plant = ref<Plant | null>(null); const loading = ref(true); const watering = ref(false);
const expositionLabel = computed(() => ({ soleil: 'Soleil', 'mi-ombre': 'Mi-ombre', ombre: 'Ombragé' })[plant.value?.exposition ?? 'soleil']);

onMounted(async () => { plant.value = await plantService.getPlantById(String(route.params.id)); loading.value = false; });

async function marquerArrosee() {
  if (!plant.value) return;
  watering.value = true;
  try {
    await annulerRappels(plant.value);
    const today = dateLocaleISO();
    plant.value.dernierArrosage = today;
    plant.value.historiqueArrosage = [today, ...(plant.value.historiqueArrosage ?? [])]
      .filter((date, index, dates) => dates.indexOf(date) === index);
    plant.value.updatedAt = Date.now();
    await plantService.savePlant(plant.value); await planifierRappels(plant.value);
    const toast = await toastController.create({ message: 'Arrosage enregistré', duration: 5000, buttons: [{ text: 'Annuler', role: 'cancel' }] });
    await toast.present();
  } finally { watering.value = false; }
}

async function confirmDelete() {
  if (!plant.value) return;
  const alert = await alertController.create({ header: 'Supprimer', message: `Supprimer ${plant.value.nom} ? Cette action est définitive`, buttons: [{ text: 'Annuler', role: 'cancel' }, { text: 'Supprimer', role: 'destructive', handler: async () => {
    await annulerRappels(plant.value!);
    if (plant.value!.photoUrl) await storageService.deletePlantPhoto(plant.value!.userId, plant.value!.id!);
    await plantService.deletePlant(plant.value!);
    await router.replace('/plants');
  }}] }); await alert.present();
}
</script>

<style scoped>
.detail-photo { width: 100%; max-height: 260px; object-fit: cover; border-radius: 16px; }
.species { color: var(--ion-color-medium); }
ion-button { margin-top: 12px; }
.history { margin-top: 16px; }
</style>
