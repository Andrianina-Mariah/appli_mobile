import { LocalNotifications } from '@capacitor/local-notifications';
import type { Plant } from '../models/plant.model';
import { sqliteService } from './sqlite.service';
import { settingsService } from './settings.service';
import { ajouterJours, joursDeRetard, prochainArrosage } from '../utils/plant-dates';

export const HEURE_DEFAUT = '09:00';
export const NB_RELANCES = 2;
export const MAX_RETARD_NOTIF = 7;
export const SNOOZE_HEURES = 3;

function notificationIds(plant: Plant): number[] {
  return [0, 1, 2, 3, 9].map((offset) => plant.notifBaseId * 10 + offset);
}

export async function demanderPermission(): Promise<boolean> {
  const permission = await LocalNotifications.requestPermissions();
  return permission.display === 'granted';
}

export async function annulerRappels(plant: Plant): Promise<void> {
  await LocalNotifications.cancel({ notifications: notificationIds(plant).map((id) => ({ id })) });
}

export async function annulerTout(): Promise<void> {
  await LocalNotifications.cancel({ notifications: [] });
}

function dateHeureLocale(dateISO: string, heure: string): Date {
  const [annee, mois, jour] = dateISO.split('-').map(Number);
  const [heures, minutes] = heure.split(':').map(Number);
  return new Date(annee, mois - 1, jour, heures, minutes, 0, 0);
}

export async function planifierRappels(plant: Plant): Promise<void> {
  const permission = await LocalNotifications.checkPermissions();
  if (permission.display !== 'granted') return;
  const heure = await settingsService.getHeureRappel();
  const echeance = prochainArrosage(plant);
  const maintenant = new Date();
  const notifications: Parameters<typeof LocalNotifications.schedule>[0]['notifications'] = [];

  for (let offset = 0; offset <= NB_RELANCES; offset++) {
    const date = dateHeureLocale(ajouterJours(echeance, offset), heure);
    if (date.getTime() <= maintenant.getTime()) continue;
    const id = plant.notifBaseId * 10 + offset;
    const message = offset === 0
      ? `Il est temps d’arroser ${plant.nom}`
      : offset === 1
        ? `${plant.nom} attend toujours son eau`
        : `${plant.nom} est en retard d’arrosage`;
    notifications.push({ id, title: 'Rappel d’arrosage', body: message, schedule: { at: date, allowWhileIdle: true }, extra: { plantId: plant.id } });
  }
  if (notifications.length) await LocalNotifications.schedule({ notifications });
}

export async function replanifierTout(): Promise<void> {
  await annulerTout();
  const plants = await sqliteService.getAllForNotifications();
  for (const plant of plants) {
    if (plant.deleted) continue;
    await annulerRappels(plant);
    await planifierRappels(plant);
  }
}
