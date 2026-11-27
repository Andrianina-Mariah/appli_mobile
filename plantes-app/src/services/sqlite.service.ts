import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection, type SQLiteDBConnection } from '@capacitor-community/sqlite';
import type { Plant } from '../models/plant.model';

const sqlite = new SQLiteConnection(CapacitorSQLite);
let database: SQLiteDBConnection | null = null;

export interface LocalPlant extends Plant {
  sync_pending: number;
  deleted: number;
}

export const sqliteService = {
  async init(): Promise<void> {
    if (database) return;
    if (Capacitor.getPlatform() === 'web') {
      const jeep = document.createElement('jeep-sqlite');
      document.body.appendChild(jeep);
      await customElements.whenDefined('jeep-sqlite');
      await sqlite.initWebStore();
    }
    const result = await sqlite.checkConnectionsConsistency();
    const isConn = (result as { result?: boolean }).result;
    database = isConn
      ? await sqlite.retrieveConnection('plantes.db', false)
      : await sqlite.createConnection('plantes.db', false, 'no-encryption', 1, false);
    await database.open();
    await database.execute(`CREATE TABLE IF NOT EXISTS plants (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      nom TEXT NOT NULL,
      espece TEXT NOT NULL,
      exposition TEXT NOT NULL,
      frequenceArrosage INTEGER NOT NULL,
      dernierArrosage TEXT NOT NULL,
      notifBaseId INTEGER NOT NULL,
      photoUrl TEXT,
      notes TEXT,
      updatedAt INTEGER NOT NULL,
      sync_pending INTEGER NOT NULL DEFAULT 1,
      deleted INTEGER NOT NULL DEFAULT 0,
      historiqueArrosage TEXT NOT NULL DEFAULT '[]'
    )`);
    try {
      await database.execute("ALTER TABLE plants ADD COLUMN historiqueArrosage TEXT NOT NULL DEFAULT '[]'");
    } catch {
      // La colonne existe déjà sur les bases précédemment migrées.
    }
  },
  async getAll(userId: string): Promise<LocalPlant[]> {
    await this.init();
    const result = await database!.query(
      'SELECT * FROM plants WHERE userId = ? AND deleted = 0 ORDER BY nom COLLATE NOCASE',
      [userId],
    );
    return (result.values ?? []).map((row) => ({
      ...row,
      frequenceArrosage: Number(row.frequenceArrosage),
      notifBaseId: Number(row.notifBaseId),
      updatedAt: Number(row.updatedAt),
      sync_pending: Number(row.sync_pending),
      deleted: Number(row.deleted),
      historiqueArrosage: (() => {
        try { return JSON.parse(row.historiqueArrosage ?? '[]'); }
        catch { return []; }
      })(),
    })) as LocalPlant[];
  },
  async getAllForNotifications(): Promise<LocalPlant[]> {
    await this.init();
    const result = await database!.query('SELECT * FROM plants WHERE deleted = 0');
    return (result.values ?? []).map((row) => ({
      ...row,
      historiqueArrosage: (() => { try { return JSON.parse(row.historiqueArrosage ?? '[]'); } catch { return []; } })(),
    })) as LocalPlant[];
  },
  async getById(id: string): Promise<LocalPlant | null> {
    await this.init();
    const result = await database!.query('SELECT * FROM plants WHERE id = ? AND deleted = 0', [id]);
    const row = result.values?.[0] as Record<string, unknown> | undefined;
    if (!row) return null;
    try { row.historiqueArrosage = JSON.parse(String(row.historiqueArrosage ?? '[]')); }
    catch { row.historiqueArrosage = []; }
    return row as unknown as LocalPlant;
  },
  async save(plant: Plant & { sync_pending?: number; deleted?: number }): Promise<void> {
    await this.init();
    await database!.run(
      `INSERT OR REPLACE INTO plants
       (id,userId,nom,espece,exposition,frequenceArrosage,dernierArrosage,notifBaseId,photoUrl,notes,updatedAt,sync_pending,deleted,historiqueArrosage)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [plant.id, plant.userId, plant.nom, plant.espece, plant.exposition,
       plant.frequenceArrosage, plant.dernierArrosage, plant.notifBaseId,
       plant.photoUrl ?? null, plant.notes ?? null, plant.updatedAt,
       plant.sync_pending ?? 1, plant.deleted ?? 0,
       JSON.stringify(plant.historiqueArrosage ?? [])],
    );
  },
  async markDeleted(id: string): Promise<void> {
    await this.init();
    await database!.run('UPDATE plants SET deleted = 1, sync_pending = 1, updatedAt = ? WHERE id = ?', [Date.now(), id]);
  },
  async remove(id: string): Promise<void> {
    await this.init();
    await database!.run('DELETE FROM plants WHERE id = ?', [id]);
  },
  async markSynced(id: string): Promise<void> {
    await this.init();
    await database!.run('UPDATE plants SET sync_pending = 0 WHERE id = ?', [id]);
  },
  async getPending(): Promise<LocalPlant[]> {
    await this.init();
    const result = await database!.query('SELECT * FROM plants WHERE sync_pending = 1');
    return (result.values ?? []) as LocalPlant[];
  },
  async clearUser(userId: string): Promise<void> {
    await this.init();
    await database!.run('DELETE FROM plants WHERE userId = ?', [userId]);
  },
};
