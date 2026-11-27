<template>
  <ion-page>
    <ion-header>
      <ion-toolbar><ion-buttons slot="start"><ion-menu-button /></ion-buttons><ion-title>Tableau de bord</ion-title></ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <section class="welcome">
        <div><p class="eyebrow">Aujourd’hui</p><h1>Bonjour 🌿</h1></div>
        <ion-avatar><span>{{ initials }}</span></ion-avatar>
      </section>
      <div class="stats">
        <article><ion-icon :icon="leafOutline" /><strong>{{ total }}</strong><span>Plantes</span></article>
        <article><ion-icon :icon="timeOutline" /><strong>{{ today }}</strong><span>À arroser</span></article>
        <article><ion-icon :icon="alertCircleOutline" /><strong>{{ overdue }}</strong><span>En retard</span></article>
      </div>
      <section class="section"><h2>À surveiller</h2><PlantCard v-for="plant in watchList" :key="plant.id" :plant="plant" @open="openPlant" /></section>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { IonPage, IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent, IonAvatar, IonIcon } from '@ionic/vue';
import { leafOutline, timeOutline, alertCircleOutline } from 'ionicons/icons';
import PlantCard from '../components/PlantCard.vue';
import type { Plant } from '../models/plant.model';
import { useAuthStore } from '../stores/auth.store';
import { plantService } from '../services/plant.service';
import { statutPlante } from '../utils/plant-dates';

const router = useRouter(); const auth = useAuthStore();
const plantes = ref<Plant[]>([]);
const total = computed(() => plantes.value.length);
const today = computed(() => plantes.value.filter((plant) => statutPlante(plant) === 'aujourdhui').length);
const overdue = computed(() => plantes.value.filter((plant) => statutPlante(plant) === 'retard').length);
const watchList = computed(() => plantes.value.filter((plant) => ['retard', 'aujourdhui'].includes(statutPlante(plant))).slice(0, 4));
const initials = computed(() => (auth.user?.email?.slice(0, 2) ?? 'MP').toUpperCase());
function openPlant(plant: Plant) { void router.push(`/plants/${plant.id}`); }

onMounted(async () => { if (auth.user) plantes.value = await plantService.getPlants(auth.user.uid); });
</script>

<style scoped>
.welcome { display:flex; justify-content:space-between; align-items:center; padding:10px 4px 18px; }
.eyebrow { color:var(--ion-color-medium); margin:0 0 4px; }.welcome h1 { margin:0; }
ion-avatar { width:52px;height:52px;background:linear-gradient(135deg,var(--ion-color-primary),#79a98a);display:grid;place-items:center;color:white;font-weight:800; }
.stats { display:grid;grid-template-columns:repeat(3,1fr);gap:10px; }.stats article { min-width:0;border-radius:20px;padding:16px 10px;display:flex;flex-direction:column;background:white;border:1px solid var(--ion-border-color);box-shadow:0 8px 28px rgba(35,75,48,.06); }.stats ion-icon{font-size:22px;color:var(--ion-color-primary)}.stats strong{font-size:24px;margin:8px 0 2px}.stats span{font-size:12px;color:var(--ion-color-medium)}
.section { margin-top:24px }.section h2 { padding:0 4px }
</style>
