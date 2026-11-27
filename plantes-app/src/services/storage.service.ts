import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from '../firebase/config';

export const storageService = {
  async uploadPlantPhoto(userId: string, plantId: string, file: Blob): Promise<string> {
    const photoRef = ref(storage, `plants/${userId}/${plantId}.jpg`);
    await uploadBytes(photoRef, file, { contentType: 'image/jpeg' });
    return getDownloadURL(photoRef);
  },
  async deletePlantPhoto(userId: string, plantId: string): Promise<void> {
    const photoRef = ref(storage, `plants/${userId}/${plantId}.jpg`);
    try {
      await deleteObject(photoRef);
    } catch (error: unknown) {
      if ((error as { code?: string }).code !== 'storage/object-not-found') throw error;
    }
  },
};
