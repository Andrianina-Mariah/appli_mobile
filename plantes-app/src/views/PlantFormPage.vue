<template>
  <ion-page>
    <ion-header><ion-toolbar><ion-buttons slot="start"><ion-back-button :default-href="cancelHref" /></ion-buttons><ion-title>{{ editing ? 'Modifier' : 'Nouvelle plante' }}</ion-title></ion-toolbar></ion-header>
    <ion-content class="ion-padding">
      <ion-spinner v-if="loading" />
      <form v-else @submit.prevent="save">
        <div class="photo-row">
          <img :src="previewUrl || '/src/assets/plant-default.svg'" alt="" />
          <ion-button fill="outline" size="small" @click="choosePhoto">Choisir une photo</ion-button>
        </div>
        <ion-item><ion-input v-model="nom" label="Nom" label-placement="stacked" /></ion-item><ion-note v-if="nom && !validateNom(nom)" color="danger">Le nom doit contenir 2 à 50 caractères</ion-note>
        <ion-item><ion-input v-model="espece" label="Espèce" label-placement="stacked" /></ion-item><ion-note v-if="espece && !validateEspece(espece)" color="danger">Indiquez l’espèce</ion-note>
        <ion-item><ion-select v-model="exposition" label="Exposition" label-placement="stacked" interface="popover"><ion-select-option value="soleil">Soleil</ion-select-option><ion-select-option value="mi-ombre">Mi-ombre</ion-select-option><ion-select-option value="ombre">Ombragé</ion-select-option></ion-select></ion-item>
        <ion-item><ion-input v-model="frequence" label="Fréquence (jours)" label-placement="stacked" type="number" /></ion-item>
        <ion-note v-if="frequence !== '' && !validateFrequence(Number(frequence))" color="danger">Entrez un nombre de jours entre 1 et 365</ion-note>
        <ion-item><ion-input v-model="dernierArrosage" label="Dernier arrosage" label-placement="stacked" type="date" :max="today" /></ion-item>
        <ion-note v-if="dernierArrosage && !validateDate(dernierArrosage)" color="danger">La date ne peut pas être dans le futur</ion-note>
        <ion-item><ion-textarea v-model="notes" label="Notes" label-placement="stacked" :maxlength="500" /></ion-item><ion-note v-if="notes.length > 500" color="danger">500 caractères maximum</ion-note>
        <ion-button expand="block" type="submit" :disabled="!isValid || saving">Enregistrer</ion-button>
      </form>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { actionSheetController, toastController, IonPage, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, IonSpinner, IonItem, IonInput, IonSelect, IonSelectOption, IonTextarea, IonNote, IonButton } from '@ionic/vue';
import type { Plant } from '../models/plant.model';
import { cameraService } from '../services/camera.service';
import { storageService } from '../services/storage.service';
import { plantService } from '../services/plant.service';
import { Network } from '@capacitor/network';
import { dateLocaleISO } from '../utils/plant-dates';
import { validateNom, validateEspece, validateFrequence, validateDate } from '../utils/validators';
import { annulerRappels, planifierRappels } from '../services/notification.service';
import { useAuthStore } from '../stores/auth.store';

const route = useRoute(); const router = useRouter(); const auth = useAuthStore();
const editing = computed(() => Boolean(route.params.id)); const cancelHref = computed(() => editing.value ? `/plants/${route.params.id}` : '/plants');
const loading = ref(Boolean(route.params.id)); const saving = ref(false);
const nom = ref(''); const espece = ref(''); const exposition = ref<'soleil' | 'mi-ombre' | 'ombre'>('soleil'); const frequence = ref<number | string>('7');
const dernierArrosage = ref(dateLocaleISO()); const notes = ref(''); const previewUrl = ref(''); const photoBlob = ref<Blob | null>(null); const today = dateLocaleISO();
let existing: Plant | null = null;

const isValid = computed(() => validateNom(nom.value) && validateEspece(espece.value) && validateFrequence(Number(frequence.value)) && validateDate(dernierArrosage.value) && notes.value.length <= 500);

onMounted(async () => {
  if (!route.params.id) return;
  existing = await plantService.getPlantById(String(route.params.id));
  if (existing) {
    nom.value = existing.nom; espece.value = existing.espece; exposition.value = existing.exposition;
    frequence.value = existing.frequenceArrosage; dernierArrosage.value = existing.dernierArrosage; notes.value = existing.notes ?? '';
    previewUrl.value = existing.photoUrl ?? ''; photoBlob.value = null;
  }
  loading.value = false;
});

async function choosePhoto() {
  const network = await Network.getStatus();
  if (!network.connected) { const toast = await toastController.create({ message: 'Photo indisponible hors ligne', duration: 3000 }); await toast.present(); return; }
  const sheet = await actionSheetController.create({ header: 'Choisir une photo', buttons: [{ text: 'Caméra', handler: () => void capture('camera') }, { text: 'Galerie', handler: () => void capture('gallery') }, { text: 'Annuler', role: 'cancel' }] }); await sheet.present();
}
async function capture(source: 'camera' | 'gallery') {
  try { photoBlob.value = await cameraService.takePhoto(source); if (photoBlob.value) previewUrl.value = URL.createObjectURL(photoBlob.value); }
  catch { const toast = await toastController.create({ message: 'Permission caméra refusée. Utilisez la galerie.', duration: 3500 }); await toast.present(); }
}

async function save() {
  if (!isValid.value) return;
  saving.value = true;
  try {
    const plantId = existing?.id ?? crypto.randomUUID();
    const plant: Plant = {
      id: plantId,
      userId: auth.user!.uid,
      nom: nom.value.trim(), espece: espece.value.trim(), exposition: exposition.value,
      frequenceArrosage: Number(frequence.value), dernierArrosage: dernierArrosage.value,
      notifBaseId: existing?.notifBaseId ?? Math.floor(Math.random() * 200_000_000),
      photoUrl: existing?.photoUrl, notes: notes.value.trim(), updatedAt: Date.now(),
    };
    await plantService.savePlant(plant);
    if (photoBlob.value) {
      try {
        plant.photoUrl = await storageService.uploadPlantPhoto(plant.userId, plantId, photoBlob.value);
        await plantService.savePlant(plant);
      } catch {
        const toast = await toastController.create({ message: 'Échec de l’upload. Enregistrement sans photo ?', duration: 4000, buttons: [{ text: 'Réessayer', handler: () => void save() }, { text: 'Sans photo', role: 'cancel' }] }); await toast.present();
      }
    }
    await annulerRappels(plant); await planifierRappels(plant);
    await router.replace(`/plants/${plant.id}`);
  } finally { saving.value = false; }
}
</script>

<style scoped>
.photo-row { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; }
.photo-row img { width: 110px; height: 110px; object-fit: cover; border-radius: 14px; }
ion-note { display: block; margin: 4px 16px 10px; }
ion-button[type='submit'] { margin-top: 20px; }
</style>
