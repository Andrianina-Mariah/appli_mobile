<template>
  <ion-page>
    <ion-header><ion-toolbar><ion-title>Mes plantes — Connexion</ion-title></ion-toolbar></ion-header>
    <ion-content class="ion-padding">
      <div class="auth-card">
        <h1>Bienvenue</h1>
        <ion-item><ion-input v-model="email" label="E-mail" label-placement="stacked" type="email" /></ion-item>
        <ion-item><ion-input v-model="password" label="Mot de passe" label-placement="stacked" type="password" /></ion-item>
        <ion-text v-if="error" color="danger"><p>{{ error }}</p></ion-text>
        <ion-button expand="block" :disabled="loading" @click="login">Se connecter</ion-button>
        <ion-button expand="block" fill="clear" router-link="/register">Créer un compte</ion-button>
        <ion-button expand="block" fill="clear" size="small" :disabled="!email.trim()" @click="resetPassword">Mot de passe oublié</ion-button>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonItem, IonInput, IonButton, IonText } from '@ionic/vue';
import { authService } from '../services/auth.service';
import { authErrorMessage } from '../utils/auth-errors';

const router = useRouter();
const email = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

async function login() {
  loading.value = true; error.value = '';
  try {
    await authService.login(email.value, password.value);
    await router.replace('/plants');
  } catch (exception: unknown) {
    error.value = authErrorMessage((exception as { code?: string }).code ?? '');
  } finally { loading.value = false; }
}

async function resetPassword() {
  try { await authService.resetPassword(email.value); error.value = 'E-mail de réinitialisation envoyé'; }
  catch (exception: unknown) { error.value = authErrorMessage((exception as { code?: string }).code ?? ''); }
}
</script>

<style scoped>
.auth-card { max-width: 420px; margin: 12vh auto 0; }
h1 { text-align: center; margin-bottom: 24px; }
ion-button { margin-top: 12px; }
</style>
