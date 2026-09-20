import test from 'node:test';
import assert from 'node:assert/strict';
import { createRecord, upsertRecord, setRecordDeleted } from '../src/lib/records.js';
import { confirmedItems, rejectedItems } from '../src/lib/recall.js';
import { extractCandidates } from '../src/lib/extractCandidates.js';
import { postJson } from '../src/lib/api.js';

test('record editing, logical deletion and restore preserve content and other records', () => {
  const record = { ...createRecord({ company: 'test', role: 'developer', timeline: [{ content: '원문' }] }), id: 'one' };
  const other = { ...record, id: 'two' };
  const initial = [record, other];
  const edited = upsertRecord(initial, { ...record, role: 'designer' }, 'edit-time');
  assert.equal(edited.length, 2);
  assert.equal(edited[0].role, 'designer');
  assert.equal(initial[0].role, 'developer');
  const deleted = setRecordDeleted(edited, 'one', true, 'delete-time');
  assert.equal(deleted[0].deletedAt, 'delete-time');
  assert.equal(deleted[1], other);
  const restored = setRecordDeleted(deleted, 'one', false, 'restore-time');
  assert.equal(restored[0].isDeleted, false);
  assert.equal(restored[0].deletedAt, null);
  assert.deepEqual(restored[0].timeline, record.timeline);
  assert.equal(deleted[0].isDeleted, true);
});
test('new records are prepended without losing existing records', () => {
  assert.deepEqual(upsertRecord([{ id: 'a' }], { id: 'b' }).map((r) => r.id), ['b', 'a']);
});
test('recall uses edited text and excludes rejected and pending candidates', () => {
  const session = { candidates: [
    { status: 'CONFIRMED', claim: '확인' }, { status: 'EDITED', claim: '이전', editedClaim: '수정' },
    { status: 'REJECTED', claim: '거절' }, { status: 'PENDING', claim: '대기' },
  ] };
  assert.deepEqual(confirmedItems(session), ['확인', '수정']);
  assert.deepEqual(rejectedItems(session), ['거절']);
});
test('candidate extraction handles empty input and retains uncertainty and evaluations', () => {
  assert.deepEqual(extractCandidates().candidateItems, []);
  const result = extractCandidates({ original: '세 명이 있었다.\n아마 질문이 있었다.\n분위기가 좋았다.' });
  assert.deepEqual(result.candidateItems.map((item) => item.category), ['FACT', 'UNCERTAIN', 'EVALUATION']);
  assert.ok(result.candidateItems.every((item) => item.verification === 'PENDING'));
});
test('JSON transport serializes the request and surfaces HTTP failures', async (t) => {
  let sent;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    sent = { url, options }; return { ok: true, json: async () => ({ question: 'test' }) };
  });
  assert.deepEqual(await postJson('/api/recall', { stage: 'FREE_RECALL' }), { question: 'test' });
  assert.ok(sent.url.endsWith('/api/recall'));
  assert.deepEqual(JSON.parse(sent.options.body), { stage: 'FREE_RECALL' });
  globalThis.fetch = async () => ({ ok: false, status: 502 });
  await assert.rejects(postJson('/api/recall', {}), /HTTP 502/);
});
test('JSON transport times out and respects cancellation', async (t) => {
  t.mock.method(globalThis, 'fetch', async (_url, { signal }) => new Promise((_resolve, reject) => {
    const fail = () => reject(new DOMException('aborted', 'AbortError'));
    if (signal.aborted) fail(); else signal.addEventListener('abort', fail, { once: true });
  }));
  await assert.rejects(postJson('/api/recall', {}, { timeoutMs: 5 }), { name: 'AbortError' });
  const controller = new AbortController(); controller.abort();
  await assert.rejects(postJson('/api/recall', {}, { signal: controller.signal }), { name: 'AbortError' });
});
