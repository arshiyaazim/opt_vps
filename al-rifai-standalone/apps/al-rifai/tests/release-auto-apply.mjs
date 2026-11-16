// Call-site tests for autoApplyHigh(): the atomic path, the refusal path and the
// legacy path. A fake client records every statement, so the SQL contract is
// asserted without a database.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {atomicApplyMode, autoApplyHigh} from '../lib/release-scan.ts';

const ROWS = [
  {id: '11', program_id: 'p1', end_date: '2026-01-20', end_shift: 'D', source_msg_id: 'MSG1', revision: 0},
  {id: '12', program_id: 'p2', end_date: '2026-01-22', end_shift: 'N', source_msg_id: 'MSG2', revision: 3},
];
const ACTOR = 'contact-test';

function harness({atomic = true, reviewCols = false, rows = ROWS, failIds = [], remaining = '0'} = {}) {
  const calls = [];
  const record = (via) => async (sql, values) => {
    const s = sql.replace(/\s+/g, ' ').trim();
    calls.push({via, sql: s, values});
    if (/to_regprocedure\(/.test(s)) return {rows: [{atomic, review_cols: reviewCols}]};
    if (/FROM public\.release_candidates rc/.test(s)) return {rows};
    if (/count\(\*\)::text AS n/.test(s)) return {rows: [{n: remaining}]};
    if (/apply_release_candidate\(/.test(s)) {
      if (failIds.includes(String(values?.[0]))) throw new Error('REVISION_CONFLICT');
      return {rows: [{result: {ok: true}}]};
    }
    return {rows: [], rowCount: 1};
  };
  return {calls, client: {query: record('client')}, command: {query: record('command')}};
}

// The capability probe itself mentions apply_release_candidate(), so it is
// excluded from every write/apply assertion.
const isProbe = (call) => /to_regprocedure\(/.test(call.sql);
const applyCalls = (calls) => calls.filter((c) => !isProbe(c) && /apply_release_candidate\(/.test(c.sql));
const writes = (calls) => calls.filter((c) => !isProbe(c)
  && /INSERT |UPDATE |alrifai_vessel_program_release|recalculate_program_pay|apply_release_candidate\(/.test(c.sql));

test('mode defaults to required and only an explicit off disables automation', () => {
  assert.equal(atomicApplyMode({}), 'required');
  assert.equal(atomicApplyMode({ALRIFAI_RELEASE_APPLY_ATOMIC: 'required'}), 'required');
  assert.equal(atomicApplyMode({ALRIFAI_RELEASE_APPLY_ATOMIC: '1'}), 'required');
  assert.equal(atomicApplyMode({ALRIFAI_RELEASE_APPLY_ATOMIC: 'auto'}), 'required', 'auto cannot re-enable the removed legacy path');
  assert.equal(atomicApplyMode({ALRIFAI_RELEASE_APPLY_ATOMIC: 'whatever'}), 'required');
  assert.equal(atomicApplyMode({ALRIFAI_RELEASE_APPLY_ATOMIC: 'off'}), 'off');
  assert.equal(atomicApplyMode({ALRIFAI_RELEASE_APPLY_ATOMIC: '0'}), 'off');
  assert.equal(atomicApplyMode({ALRIFAI_RELEASE_APPLY_ATOMIC: 'false'}), 'off');
});

test('atomic function present: one call per candidate and no legacy writes', async () => {
  const h = harness({atomic: true});
  const result = await autoApplyHigh(h.client, h.command, ACTOR, {mode: 'auto'});
  assert.deepEqual(result, {applied: 2, skipped: 0, failed: 0, path: 'atomic'});

  const atomicCalls = applyCalls(h.calls);
  assert.equal(atomicCalls.length, 2);
  assert.deepEqual(atomicCalls.map((c) => c.values[0]), ['11', '12']);
  assert.equal(atomicCalls[0].values[1], ACTOR);
  assert.equal(atomicCalls[0].values[2], 'auto-apply');
  assert.equal(atomicCalls[0].values[3], 'ingestion-auto-apply');

  // The caller must not duplicate the function's own work.
  assert.equal(h.calls.some((c) => /UPDATE public\.release_candidates/.test(c.sql)), false);
  assert.equal(h.calls.some((c) => /INSERT INTO public\.release_auto_apply_log/.test(c.sql)), false);
  assert.equal(h.calls.some((c) => /alrifai_vessel_program_release\(/.test(c.sql)), false);
  assert.equal(h.calls.some((c) => /recalculate_program_pay/.test(c.sql)), false);
});

test('mode required with the function missing applies nothing and preserves the candidates', async () => {
  const h = harness({atomic: false});
  const result = await autoApplyHigh(h.client, h.command, ACTOR, {mode: 'required'});
  assert.deepEqual(result, {
    applied: 0, skipped: 2, failed: 0, path: 'blocked', blocked: 'ATOMIC_APPLY_REQUIRED_BUT_MISSING',
  });
  assert.equal(writes(h.calls).length, 0, 'nothing may be written when atomic apply is required but absent');
  // The eligibility read still happens, so the diagnostic can report the count.
  assert.ok(h.calls.some((c) => /FROM public\.release_candidates rc/.test(c.sql)));
});

test('without the function every mode applies nothing: the legacy path no longer exists', async () => {
  for (const mode of ['required', 'off']) {
    const h = harness({atomic: false});
    const result = await autoApplyHigh(h.client, h.command, ACTOR, {mode});
    assert.equal(result.path, 'blocked', mode);
    assert.equal(result.applied, 0, mode);
    assert.equal(result.skipped, 2, mode);
    assert.equal(writes(h.calls).length, 0, `no write may happen without the atomic function (${mode})`);
    assert.equal(h.calls.some((c) => /alrifai_vessel_program_release\(/.test(c.sql)), false);
    assert.equal(h.calls.some((c) => /UPDATE public\.release_candidates/.test(c.sql)), false);
    assert.equal(h.calls.some((c) => /INSERT INTO public\.release_auto_apply_log/.test(c.sql)), false);
  }
});

test('mode off applies nothing even when the atomic function exists', async () => {
  const h = harness({atomic: true});
  const result = await autoApplyHigh(h.client, h.command, ACTOR, {mode: 'off'});
  assert.deepEqual(result, {
    applied: 0, skipped: 2, failed: 0, path: 'blocked', blocked: 'AUTO_APPLY_DISABLED',
  });
  assert.equal(applyCalls(h.calls).length, 0);
  assert.equal(writes(h.calls).length, 0);
});

test('a per-candidate atomic failure is reported and never retried on the legacy path', async () => {
  const h = harness({atomic: true, failIds: ['12']});
  const result = await autoApplyHigh(h.client, h.command, ACTOR, {mode: 'auto'});
  assert.deepEqual({applied: result.applied, failed: result.failed, path: result.path}, {applied: 1, failed: 1, path: 'atomic'});
  assert.equal(applyCalls(h.calls).length, 2);
  assert.equal(h.calls.some((c) => /alrifai_vessel_program_release\(/.test(c.sql)), false, 'no fallback for the failed candidate');
  assert.equal(h.calls.some((c) => /UPDATE public\.release_candidates/.test(c.sql)), false, 'candidate must stay untouched');
});

test('eligibility gates are unchanged and the review-reason gate is migration-gated', async () => {
  const withoutColumn = harness({atomic: true, reviewCols: false});
  await autoApplyHigh(withoutColumn.client, withoutColumn.command, ACTOR, {mode: 'auto'});
  const sqlA = withoutColumn.calls.find((c) => /FROM public\.release_candidates rc/.test(c.sql)).sql;
  for (const gate of [
    "rc.applied = false", "rc.match_status = 'MATCHED'", "rc.confidence = 'high'",
    'rc.match_pass IN (1, 2)', 'rc.program_id IS NOT NULL', 'rc.end_shift IS NOT NULL',
    "lower(btrim(p.status)) = 'confirmed'", 'btrim(coalesce(p."endDate", \'\')) = \'\'',
  ]) {
    assert.ok(sqlA.includes(gate), `missing gate: ${gate}`);
  }
  assert.equal(sqlA.includes('review_reasons'), false);

  const withColumn = harness({atomic: true, reviewCols: true});
  await autoApplyHigh(withColumn.client, withColumn.command, ACTOR, {mode: 'auto'});
  const sqlB = withColumn.calls.find((c) => /FROM public\.release_candidates rc/.test(c.sql)).sql;
  assert.ok(sqlB.includes('jsonb_array_length(rc.review_reasons), 0) = 0'));
});

test('an empty eligible set touches nothing', async () => {
  const h = harness({atomic: true, rows: []});
  const result = await autoApplyHigh(h.client, h.command, ACTOR, {mode: 'auto'});
  assert.deepEqual(result, {applied: 0, skipped: 0, failed: 0, path: 'atomic'});
  assert.equal(writes(h.calls).length, 0);
});

test('the atomic function is the only write path; no candidate is touched without it', async () => {
  // Every non-probe write in a successful pass must be the function call itself.
  const h = harness({atomic: true});
  await autoApplyHigh(h.client, h.command, ACTOR, {mode: 'required'});
  const extra = h.calls.filter((c) => !isProbe(c) && !/apply_release_candidate\(/.test(c.sql)
    && /INSERT |UPDATE |DELETE |alrifai_vessel_program_release|recalculate_program_pay/.test(c.sql));
  assert.deepEqual(extra, [], 'the caller must not write release state outside the function');
});

test('an atomic failure leaves the candidate alone and is retried next pass', async () => {
  const h = harness({atomic: true, failIds: ['11']});
  const result = await autoApplyHigh(h.client, h.command, ACTOR, {mode: 'required'});
  assert.equal(result.failed, 1);
  assert.equal(result.applied, 1);
  assert.equal(h.calls.some((c) => /UPDATE public\.release_candidates/.test(c.sql)), false);
  assert.equal(h.calls.some((c) => /INSERT INTO public\.release_auto_apply_log/.test(c.sql)), false);
});

test('every manual apply path uses the same atomic function and fails closed', () => {
  const read = (name) => readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');
  const cli = read('scripts/apply-high-releases.ts');
  const api = read('lib/release-apply.ts');
  for (const [name, text] of [['CLI', cli], ['API', api]]) {
    const code = text.replace(/\/\/[^\n]*/g, ''); // comments document the old shape
    assert.match(code, /apply_release_candidate/, `${name} must use the atomic function`);
    assert.doesNotMatch(code, /alrifai_vessel_program_release/, `${name} must not release outside the function`);
    assert.doesNotMatch(code, /recalculate_program_pay/, `${name} must not recalculate outside the function`);
    // A rejection may close a candidate, but only the function may release one.
    assert.doesNotMatch(code, /match_status\s*=\s*'APPLIED'/i, `${name} must not mark a candidate released itself`);
    assert.match(code, /ATOMIC_APPLY_REQUIRED_BUT_MISSING/, `${name} must fail closed without the function`);
  }
});
