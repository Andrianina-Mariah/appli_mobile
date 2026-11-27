<template>
  <ion-card button @click="$emit('open', plant)">
    <ion-card-header>
      <div class="plant-row">
        <img :src="plant.photoUrl || '/src/assets/plant-default.svg'" alt="" class="plant-photo" />
        <div class="plant-info">
          <ion-card-title>{{ plant.nom }}</ion-card-title>
          <ion-card-subtitle>{{ plant.espece }}</ion-card-subtitle>
          <ion-badge :color="badgeColor">{{ badgeText }}</ion-badge>
        </div>
      </div>
    </ion-card-header>
  </ion-card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonBadge } from '@ionic/vue';
import type { Plant } from '../models/plant.model';
import { joursAvantArrosage, joursDeRetard, statutPlante } from '../utils/plant-dates';

const props = defineProps<{ plant: Plant }>();
defineEmits<{ open: [plant: Plant] }>();

const badgeText = computed(() => {
  const statut = statutPlante(props.plant);
  if (statut === 'retard') return `${joursDeRetard(props.plant)} jour(s) de retard`;
  if (statut === 'aujourdhui') return 'À arroser aujourd’hui';
  const jours = joursAvantArrosage(props.plant);
  return `Dans ${jours} jour${jours > 1 ? 's' : ''}`;
});
const badgeColor = computed(() => statutPlante(props.plant) === 'retard' ? 'danger' : statutPlante(props.plant) === 'aujourdhui' ? 'warning' : 'success');
</script>

<style scoped>
.plant-row { display: flex; align-items: center; gap: 14px; }
.plant-photo { width: 78px; height: 78px; border-radius: 12px; object-fit: cover; background: #e8f5e9; }
.plant-info { flex: 1; }
ion-badge { margin-top: 10px; }
</style>
