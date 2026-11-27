import { Preferences } from '@capacitor/preferences';

export const HEURE_DEFAUT = '09:00';

export const settingsService = {
  async getHeureRappel(): Promise<string> {
    const result = await Preferences.get({ key: 'heureRappel' });
    return result.value ?? HEURE_DEFAUT;
  },
  setHeureRappel(heure: string) {
    return Preferences.set({ key: 'heureRappel', value: heure });
  },
};
