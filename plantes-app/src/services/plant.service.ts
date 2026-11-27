import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Plant } from '../models/plant.model';
import { sqliteService, type LocalPlant } from './sqlite.service';

function fromFirestore(id: string, data: DocumentData): Plant {
  return { id, ...data } as Plant;
}

export const plantService = {
  async getPlants(userId: string): Promise<Plant[]> {
    const local = await sqliteService.getAll(userId);
    return local;
  },
  async getPlantById(id: string): Promise<Plant | null> {
    const local = await sqliteService.getById(id);
    if (local) return local;
    const snap = await getDoc(doc(db, 'plants', id));
    return snap.exists() ? fromFirestore(snap.id, snap.data()) : null;
  },
  async refreshFromFirestore(userId: string): Promise<Plant[]> {
    const result = await getDocs(query(collection(db, 'plants'), where('userId', '==', userId)));
    for (const snap of result.docs) {
      const remote = fromFirestore(snap.id, snap.data());
      const local = await sqliteService.getById(remote.id!);
      if (!local || remote.updatedAt >= local.updatedAt) {
        await sqliteService.save({ ...remote, sync_pending: local?.sync_pending ?? 0, deleted: 0 });
      }
    }
    return sqliteService.getAll(userId);
  },
  async savePlant(plant: Plant): Promise<Plant> {
    const value: Plant = {
      ...plant,
      id: plant.id,
      updatedAt: Date.now(),
    };
    await sqliteService.save({ ...value, sync_pending: 1, deleted: 0 });
    return value;
  },
  async deletePlant(plant: Plant): Promise<void> {
    await sqliteService.markDeleted(plant.id!);
  },
  async sendToFirestore(plant: LocalPlant): Promise<void> {
    if (!plant.id) return;
    await setDoc(doc(db, 'plants', plant.id), {
      userId: plant.userId,
      nom: plant.nom,
      espece: plant.espece,
      exposition: plant.exposition,
      frequenceArrosage: plant.frequenceArrosage,
      dernierArrosage: plant.dernierArrosage,
      notifBaseId: plant.notifBaseId,
      photoUrl: plant.photoUrl ?? null,
      notes: plant.notes ?? null,
      updatedAt: plant.updatedAt,
      historiqueArrosage: plant.historiqueArrosage ?? [],
      serverTimestamp: serverTimestamp(),
    });
    await sqliteService.markSynced(plant.id);
  },
  async deleteFromFirestore(id: string): Promise<void> {
    await deleteDoc(doc(db, 'plants', id));
    await sqliteService.remove(id);
  },
};
