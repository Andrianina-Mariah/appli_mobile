export interface Plant {
  id?: string;
  userId: string;
  nom: string;
  espece: string;
  exposition: 'soleil' | 'mi-ombre' | 'ombre';
  frequenceArrosage: number;
  dernierArrosage: string;
  notifBaseId: number;
  photoUrl?: string;
  notes?: string;
  updatedAt: number;
}
