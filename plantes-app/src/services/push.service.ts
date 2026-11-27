import { PushNotifications } from '@capacitor/push-notifications';
import { deleteDoc, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

export const pushService = {
  async register(uid: string): Promise<void> {
    const permission = await PushNotifications.requestPermissions();
    if (permission.receive !== 'granted') return;
    await PushNotifications.register();

    PushNotifications.addListener('registration', async (token) => {
      await setDoc(doc(db, 'users', uid, 'devices', token.value), {
        token: token.value,
        registeredAt: Date.now(),
      });
    });
  },
  async removeToken(uid: string, token: string): Promise<void> {
    await deleteDoc(doc(db, 'users', uid, 'devices', token));
  },
};
