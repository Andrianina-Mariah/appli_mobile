import type { Plant } from '../models/plant.model';
import { jourCalendaire } from './internal-search';

export function normalizeSearch(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export function recherchePlantes(plantes: Plant[], recherche: string): Plant[] {
  const terme = normalizeSearch(recherche.trim());
  const filtre = terme
    ? plantes.filter((plant) => normalizeSearch(`${plant.nom} ${plant.espece}`).includes(terme))
    : [...plantes];

  return filtre.sort((a, b) => {
    const dateA = prochainArrosageJour(a);
    const dateB = prochainArrosageJour(b);
    const today = jourCalendaire(new Date());

    const retardA = dateA < today;
    const retardB = dateB < today;
    if (retardA !== retardB) return retardA ? -1 : 1;

    if (retardA) {
      if (dateA !== dateB) return dateA - dateB;
    } else {
      const todayA = dateA === today;
      const todayB = dateB === today;
      if (todayA !== todayB) return todayA ? -1 : 1;
      if (!todayA && dateA !== dateB) return dateA - dateB;
    }

    return a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' });
  });
}

function prochainArrosageJour(plant: Plant): number {
  const [annee, mois, jour] = plant.dernierArrosage.split('-').map(Number);
  const date = new Date(annee, mois - 1, jour + plant.frequenceArrosage);
  return jourCalendaire(date);
}
