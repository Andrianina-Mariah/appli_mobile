import type { Plant } from '../models/plant.model';
import { dateLocaleISO } from './plant-dates';

export function validateNom(value: string): boolean {
  const nom = value.trim();
  return nom.length >= 2 && nom.length <= 50;
}

export function validateEspece(value: string): boolean {
  const espece = value.trim();
  return espece.length >= 2 && espece.length <= 50;
}

export function validateFrequence(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= 365;
}

export function validateDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [annee, mois, jour] = value.split('-').map(Number);
  const date = new Date(annee, mois - 1, jour);
  return date.getFullYear() === annee
    && date.getMonth() === mois - 1
    && date.getDate() === jour
    && value <= dateLocaleISO();
}

export function validatePlant(plant: Plant): boolean {
  return validateNom(plant.nom)
    && validateEspece(plant.espece)
    && ['soleil', 'mi-ombre', 'ombre'].includes(plant.exposition)
    && validateFrequence(plant.frequenceArrosage)
    && validateDate(plant.dernierArrosage)
    && (plant.notes?.length ?? 0) <= 500;
}
