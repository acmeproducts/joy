import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
const source = fs.readFileSync(new URL('../signal-worker/worker.js', import.meta.url), 'utf8');
const { SignalSession } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
function storage(initial = {}) {
  const db = new DatabaseSync(':memory:');
  const kv = new Map(Object.entries(initial));
  return {
    sql: { exec(query, ...values) { const statement = db.prepare(query); return query.startsWith('SELECT') ? statement.all(...values) : (statement.run(...values), []); } },
    async get(keys) { return Array.isArray(keys) ? new Map(keys.map(k => [k, structuredClone(kv.get(k))])) : structuredClone(kv.get(keys)); },
    async put(values) { for (const [k,v] of Object.entries(values)) kv.set(k, structuredClone(v)); },
    async delete(key) { kv.delete(key); },
    transactionSync(callback) { db.exec('BEGIN'); try { callback(); db.exec('COMMIT'); } catch (e) { db.exec('ROLLBACK'); throw e; } }
  };
}
async function instance(store) {
  const session = new SignalSession({ storage: store, blockConcurrencyWhile: fn => fn() });
  await session.ready;
  return session;
}
function post(session, body) { return session.fetch(new Request('https://example.org/signal', { method: 'POST', body: JSON.stringify({ session: 'room', from: 'alice', ...body }) })); }
async function history(session) {
  const entries = []; let cursor = '';
  do {
    const response = await session.fetch(new Request(`https://example.org/signal?session=room&chat=1&cursor=${cursor}`));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    const page = await response.json(); entries.push(...page.entries); cursor = page.cursor;
  } while (cursor !== null);
  return entries;
}
test('durable history survives inactivity, restart, pagination and relay pruning', async () => {
  const store = storage({ messages: [{ type: 'chat-room', id: 'legacy', text: 'existing transcript', from: 'old', ts: 1 }] });
  let session = await instance(store);
  for (let i = 0; i < 310; i++) await post(session, { type: 'chat-room', id: `post-${i}`, text: `note ${i}`, ts: i + 2 });
  const attachment = { name: 'large.txt', type: 'text/html', size: 200000, dataUrl: 'data:text/html;base64,' + 'a'.repeat(270000) };
  await post(session, { type: 'chat-room', id: 'attachment', attachments: [attachment] });
  await post(session, { type: 'chat-room', id: 'post-0', text: 'duplicate must not replace' });
  assert.equal((await history(session)).length, 312);
  await session.ensureSessionActive(Date.now() + 13 * 60 * 1000);
  assert.equal(session.messages.length, 0);
  session = await instance(store);
  const recovered = await history(session);
  assert.equal(recovered.length, 312);
  assert.equal(recovered.find(e => e.id === 'post-0').message, 'note 0');
  assert.deepEqual(recovered.find(e => e.id === 'attachment').attachments, [attachment]);
});
test('any participant can delete; tombstones survive stale imports and late posts', async () => {
  const store = storage(); let session = await instance(store);
  await post(session, { type: 'chat-room', id: 'a', text: 'hello' });
  await post(session, { type: 'chat-room-delete', from: 'bob', id: 'a' });
  await post(session, { type: 'chat-room-delete', from: 'bob', id: 'late' });
  await post(session, { type: 'chat-room', id: 'late', text: 'late delivery' });
  await post(session, { type: 'chat-room-migrate', entries: [{ id: 'a', message: 'stale backup' }] });
  session = await instance(store);
  for (const entry of await history(session)) {
    assert.equal(entry.deleted, true); assert.equal(entry.message, 'Post deleted.'); assert.deepEqual(entry.attachments, []);
  }
});
test('migration is idempotent and does not replace existing history', async () => {
  const session = await instance(storage());
  const payload = { type: 'chat-room-migrate', entries: [{ id: 'migrated', senderId: 'alice', message: '**hi**', ts: 20 }] };
  assert.equal((await post(session, payload)).status, 200);
  await post(session, payload);
  assert.equal((await history(session)).length, 1);
  assert.equal((await history(session))[0].message, '**hi**');
});
