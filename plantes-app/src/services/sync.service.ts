import { Network } from '@capacitor/network';
import { plantService } from './plant.service';
import { sqliteService } from './sqlite.service';

export const syncService = {
  async syncPending(): Promise<void> {
    const status = await Network.getStatus();
    if (!status.connected) return;
    const pending = await sqliteService.getPending();
    for (const plant of pending) {
      if (plant.deleted) {
        await plantService.deleteFromFirestore(plant.id!);
      } else {
        await plantService.sendToFirestore(plant);
      }
    }
  },
  listen(onChange: (connected: boolean) => void) {
    return Network.addListener('networkStatusChange', (status) => {
      onChange(status.connected);
      if (status.connected) void this.syncPending();
    });
  },
};
