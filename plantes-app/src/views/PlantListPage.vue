<template>
  <ion-page>
    <ion-header><ion-toolbar><ion-title>Mes plantes</ion-title><ion-buttons slot="end"><ion-button router-link="/settings"><ion-icon :icon="settingsOutline" /></ion-button><ion-button @click="logout"><ion-icon :icon="logOutOutline" /></ion-button></ion-buttons></ion-toolbar></ion-header>
    <ion-content>
      <ion-refresher slot="fixed" @ionRefresh="refresh"><ion-refresher-content /></ion-refresher>
      <ion-searchbar v-model="recherche" placeholder="Nom ou espèce" />
      <ion-text v-if="notificationPermissionRefusee" color="warning"><p class="notice">Les notifications sont désactivées. Les badges restent actifs.</p></ion-text>
      <ion-text v-if="networkError" color="danger"><p class="notice">Erreur réseau ou Firestore injoignable.</p></ion-text>

      <div v-if="loading" class="center"><ion-spinner /></div>
      <div v-else-if="plantesAffichees.length === 0" class="empty">
        <h2>{{ recherche ? 'Aucune plante ne correspond' : 'Aucune plante pour le moment' }}</h2>
        <ion-button v-if="!recherche" router-link="/plants/new">Ajouter ma première plante</ion-button>
      </div>
      <PlantCard v-for="plant in plantesAffichees" :key="plant.id" :plant="plant" @open="openPlant" />

      <ion-fab slot="fixed" vertical="bottom" horizontal="end"><ion-fab-button router-link="/plants/new"><ion-icon :icon="add" /></ion-fab-button></ion-fab>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, IonContent, IonRefresher, IonRefresherContent, IonSearchbar, IonText, IonSpinner, IonFab, IonFabButton } from '@ionic/vue';
import { add, logOutOutline, settingsOutline } from 'ionicons/icons';
import { LocalNotifications } from '@capacitor/local-notifications';
import PlantCard from '../components/PlantCard.vue';
import type { Plant } from '../models/plant.model';
import { plantService } from '../services/plant.service';
import { syncService } from '../services/sync.service';
import { authService } from '../services/auth.service';
import { sqliteService } from '../services/sqlite.service';
import { useAuthStore } from '../stores/auth.store';
import { recherchePlantes } from '../utils/search';

const router = useRouter(); const auth = useAuthStore();
const plantes = ref<Plant[]>([]); const recherche = ref(''); const loading = ref(true); const networkError = ref(false); const notificationPermissionRefusee = ref(false);
const plantesAffichees = computed(() => recherchePlantes(plantes.value, recherche.value));

async function load() {
  loading.value = true;
  try {
    const userId = auth.user?.uid;
    if (!userId) return;
    plantes.value = await plantService.getPlants(userId);
    try { await syncService.syncPending(); plantes.value = await plantService.refreshFromFirestore(userId); }
    catch { networkError.value = true; }
  } finally { loading.value = false; }
}
async function refresh(event: CustomEvent) {
  await load(); (event.target as HTMLIonRefresherElement).complete();
}
function openPlant(plant: Plant) { void router.push(`/plants/${plant.id}`); }
async function logout() {
  const userId = auth.user?.uid;
  await authService.logout();
  await sqliteService.clearUser(userId ?? '');
  await router.replace('/login');
}

onMounted(async () => {
  await load();
  const permission = await LocalNotifications.checkPermissions();
  notificationPermissionRefusee.value = permission.display !== 'granted';
});
</script>

<style scoped>
.center,.empty { display: grid; place-items: center; text-align: center; min-height: 220px; }
.notice { margin: 8px 16px; padding: 10px; text-align: center; }
</style>
