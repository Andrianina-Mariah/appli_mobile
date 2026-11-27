<template>
  <ion-page>
    <ion-header><ion-toolbar><ion-buttons slot="start"><ion-back-button default-href="/login" /></ion-buttons><ion-title>Inscription</ion-title></ion-toolbar></ion-header>
    <ion-content class="ion-padding">
      <div class="auth-card">
        <ion-item><ion-input v-model="email" label="E-mail" label-placement="stacked" type="email" /></ion-item>
        <ion-item><ion-input v-model="password" label="Mot de passe" label-placement="stacked" type="password" /></ion-item>
        <ion-item><ion-input v-model="confirmation" label="Confirmation" label-placement="stacked" type="password" /></ion-item>
        <ion-text v-if="error" color="danger"><p>{{ error }}</p></ion-text>
        <ion-button expand="block" :disabled="loading || !valid" @click="register">Créer mon compte</ion-button>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent, IonItem, IonInput, IonButton, IonText } from '@ionic/vue';
import { authService } from '../services/auth.service';
import { authErrorMessage } from '../utils/auth-errors';

const router = useRouter();
const email = ref(''); const password = ref(''); const confirmation = ref('');
const error = ref(''); const loading = ref(false);
const valid = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value) && password.value.length >= 6 && password.value === confirmation.value);

async function register() {
  loading.value = true; error.value = '';
  try { await authService.register(email.value, password.value); await router.replace('/plants'); }
  catch (exception: unknown) { error.value = authErrorMessage((exception as { code?: string }).code ?? ''); }
  finally { loading.value = false; }
}
</script>

<style scoped>
.auth-card { max-width: 420px; margin: 8vh auto 0; }
ion-button { margin-top: 18px; }
</style>
