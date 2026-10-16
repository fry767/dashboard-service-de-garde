import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';

export class Store {
  constructor(directory) { this.directory = directory; this.file = path.join(directory, 'history.json'); this.queue = Promise.resolve(); }
  async read() {
    try { return JSON.parse(await readFile(this.file, 'utf8')); }
    catch (error) { if (error.code === 'ENOENT') return { version: 1, snapshots: [] }; throw error; }
  }
  async save(readings, warnings = []) {
    const operation = this.queue.then(async () => {
      if (!readings.length) throw new Error('Aucune demande n’a pu être relevée. L’historique existant a été conservé.');
      const data = await this.read();
      const seen = new Set();
      for (const reading of readings) {
        if (!Number.isSafeInteger(reading.ahead?.min) || reading.ahead.min < 0 || (reading.ahead.max !== null && (!Number.isSafeInteger(reading.ahead.max) || reading.ahead.max < reading.ahead.min))) throw new Error('Le nombre d’enfants est invalide. L’historique n’a pas été modifié.');
        reading.id = createHash('sha256').update(reading.sourceKey).digest('hex').slice(0, 20);
        if (seen.has(reading.id)) throw new Error('Une demande en double a été détectée. L’historique n’a pas été modifié.');
        seen.add(reading.id);
      }
      const snapshot = { id: randomUUID(), capturedAt: new Date().toISOString(), readings, warnings };
      data.snapshots.push(snapshot);
      await mkdir(this.directory, { recursive: true });
      const temporary = `${this.file}.tmp`;
      await writeFile(temporary, JSON.stringify(data, null, 2), { mode: 0o600 });
      await rename(temporary, this.file);
      return snapshot;
    });
    this.queue = operation.catch(() => {});
    return operation;
  }
}
