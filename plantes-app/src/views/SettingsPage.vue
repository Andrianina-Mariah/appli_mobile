<template>
  <ion-page>
    <ion-header><ion-toolbar><ion-buttons slot="start"><ion-back-button default-href="/plants" /></ion-buttons><ion-title>Réglages</ion-title></ion-toolbar></ion-header>
    <ion-content class="ion-padding">
      <h2>Heure des rappels</h2>
      <ion-item><ion-datetime presentation="time" v-model="heure" /></ion-item>
      <ion-button expand="block" @click="save">Enregistrer</ion-button>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { toastController, IonPage, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, IonItem, IonDatetime, IonButton } from '@ionic/vue';
import { settingsService } from '../services/settings.service';
import { replanifierTout } from '../services/notification.service';

const heure = ref('09:00');
function normaliser(value: string) { return /^\d{2}:\d{2}$/.test(value) ? value : value.slice(11, 16); }

onMounted(async () => { heure.value = await settingsService.getHeureRappel(); });
async function save() {
  const value = normaliser(heure.value);
  await settingsService.setHeureRappel(value); await replanifierTout();
  const toast = await toastController.create({ message: 'Heure de rappel enregistrée', duration: 2500 }); await toast.present();
}
</script>
