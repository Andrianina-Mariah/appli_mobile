import type { Plant } from '../models/plant.model';

export function dateLocaleISO(date = new Date()): string {
  const annee = date.getFullYear();
  const mois = String(date.getMonth() + 1).padStart(2, '0');
  const jour = String(date.getDate()).padStart(2, '0');
  return `${annee}-${mois}-${jour}`;
}

function jourCalendaire(iso: string): number {
  const [annee, mois, jour] = iso.split('-').map(Number);
  return Date.UTC(annee, mois - 1, jour) / 86_400_000;
}

export function ajouterJours(dateISO: string, jours: number): string {
  const [annee, mois, jour] = dateISO.split('-').map(Number);
  const date = new Date(Date.UTC(annee, mois - 1, jour + jours));
  return date.toISOString().slice(0, 10);
}

export function prochainArrosage(plant: Plant): string {
  return ajouterJours(plant.dernierArrosage, plant.frequenceArrosage);
}

export function joursDeRetard(plant: Plant): number {
  return Math.max(0, jourCalendaire(dateLocaleISO()) - jourCalendaire(prochainArrosage(plant)));
}

export function joursAvantArrosage(plant: Plant): number {
  return jourCalendaire(prochainArrosage(plant)) - jourCalendaire(dateLocaleISO());
}

export function statutPlante(plant: Plant): 'ajour' | 'aujourdhui' | 'retard' {
  const ecart = joursAvantArrosage(plant);
  if (ecart < 0) return 'retard';
  if (ecart === 0) return 'aujourdhui';
  return 'ajour';
}
