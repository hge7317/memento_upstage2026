import test from 'node:test';
import assert from 'node:assert/strict';
import { createRecallHandler } from '../src/routes/recall.js';
import { createJobPostingHandler } from '../src/routes/job-posting.js';
import { createApp } from '../src/app.js';

async function invoke(handler, body) {
  const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(value) { this.body = value; return this; } };
  await handler({ body }, res);
  return res;
}
const question = '그다음 기억나는 장면은 무엇인가요?';
const valid = { stage: 'FREE_RECALL', question, nextStageProposal: 'STRUCTURAL_CUE' };
const request = { sessionId: 'test-session', contextType: 'free-recall', context: {} };
const handlerFor = (value) => createRecallHandler(async () => typeof value === 'string' ? value : JSON.stringify(value));

test('invalid stage does not call Solar', async () => {
  const res = await invoke(createRecallHandler(() => { throw new Error('must not call'); }), {});
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error.code, 'INVALID_STAGE');
});
test('recall normalizes stage, preserves session, sanitizes arrays and constrains transitions', async () => {
  const res = await invoke(handlerFor({ ...valid, candidateItems: 'bad', nextStageProposal: 'COMPLETE' }), request);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.question, question);
  assert.equal(res.body.stage, 'FREE_RECALL');
  assert.equal(res.body.sessionId, 'test-session');
  assert.deepEqual(res.body.candidateItems, []);
  assert.equal(res.body.nextStageProposal, 'FREE_RECALL');
});
test('valid next stage and fenced JSON remain supported', async () => {
  const res = await invoke(handlerFor('```json\n' + JSON.stringify(valid) + '\n```'), request);
  assert.equal(res.body.nextStageProposal, 'STRUCTURAL_CUE');
  assert.equal(res.body.error, null);
});
for (const [name, value, error] of [
  ['invalid JSON', 'not-json', 'INVALID_MODEL_RESPONSE'],
  ['wrong stage', { ...valid, stage: 'REVERSE_RECALL' }, 'STAGE_MISMATCH'],
  ['missing question', { ...valid, question: ' ' }, 'QUESTION_REQUIRED'],
]) {
  test(name, async () => {
    const res = await invoke(handlerFor(value), request);
    assert.equal(res.statusCode, 502);
    assert.equal(res.body.error.code, error);
    assert.equal(res.body.nextStageProposal, 'FREE_RECALL');
  });
}
test('rejected premises are blocked', async () => {
  const res = await invoke(handlerFor({ ...valid, question: '파란 보드 다음에는?' }), {
    ...request, context: { rejectedItems: ['파란 보드'] },
  });
  assert.equal(res.statusCode, 502);
  assert.equal(res.body.error.code, 'REJECTED_PREMISE_USED');
  assert.equal(res.body.safety.rejectedPremiseUsed, true);
  assert.equal(res.body.question, null);
});
test('non-recall stage discards questions', async () => {
  const res = await invoke(handlerFor({ stage: 'GENERATE_OUTPUT', question, resultMarkdown: '# 결과' }), { stage: 'GENERATE_OUTPUT' });
  assert.equal(res.body.question, null);
  assert.equal(res.body.resultMarkdown, '# 결과');
});
test('provider failures do not become mock success responses', async () => {
  const res = await invoke(createRecallHandler(async () => { throw new Error('provider unavailable'); }), request);
  assert.equal(res.statusCode, 500);
  assert.equal(res.body.error.code, 'MEMORY_REPLAY_ERROR');
  assert.equal(res.body.question, null);
});
test('prompt retains approved, rejected and recent user context', async () => {
  let received;
  await invoke(createRecallHandler(async (messages) => { received = messages; return JSON.stringify(valid); }), {
    ...request, context: { confirmedItems: ['확인된 장면'], rejectedItems: ['거절된 장면'], recentMessages: [{ role: 'user', text: '새 답변' }] },
  });
  for (const value of ['확인된 장면', '거절된 장면', '새 답변']) assert.ok(received[1].content.includes(value));
});
test('job posting empty URL preserves reason', async () => {
  const res = await invoke(createJobPostingHandler(() => { throw new Error('must not call'); }), { url: '' });
  assert.deepEqual(res.body, { ok: false, reason: 'url_required' });
});
test('app can be constructed without starting a listener; both routes are registered', () => {
  const app = createApp({ solar: async () => JSON.stringify(valid) });
  const routes = app._router.stack.filter((layer) => layer.route).map((layer) => layer.route.path);
  assert.deepEqual(routes, ['/api/recall', '/api/job-posting']);
});
