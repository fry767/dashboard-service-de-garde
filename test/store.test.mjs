import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Store } from '../src/store.mjs';

test('stores separate time-stamped readings with a stable registration identity', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(),'garderie-store-'));
  try {
    const store = new Store(directory);
    const reading = min => ({ sourceKey: 'registration-one',daycare:'CPE',ahead:{min,max:min,kind:'exact'} });
    await Promise.all([store.save([reading(42)]),store.save([reading(35)])]);
    const data = await store.read();
    assert.equal(data.snapshots.length,2);
    assert.equal(data.snapshots[0].readings[0].id,data.snapshots[1].readings[0].id);
    assert.equal(data.snapshots[1].readings[0].ahead.min,35);
    assert.ok(data.snapshots[1].capturedAt);
    await assert.rejects(store.save([]));
    await assert.rejects(store.save([reading(-1)]));
    await assert.rejects(store.save([reading(1),reading(2)]));
    assert.equal((await store.read()).snapshots.length,2);
  } finally {
    assert.equal(path.dirname(path.resolve(directory)),path.resolve(os.tmpdir()));
    assert.ok(path.basename(directory).startsWith('garderie-store-'));
    await rm(directory,{recursive:true,force:true});
  }
});
