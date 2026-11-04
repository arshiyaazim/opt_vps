// Business-identity duplicate guard for register writes.
//
// The live processor and the backfill generate different row ids for the same
// evidence (epoch salt), and the register has no unique business index, so a
// naive backfill inserts a second row. The guard compares business identity and
// serializes writers with a transaction-scoped advisory lock.
import test from 'node:test';
import assert from 'node:assert/strict';
import {businessIdentityKey, normalizeVesselIdentity, persistConfirmedProgram, persistOperation, persistOperationIfNew} from '../lib/vessel-ops.ts';

const op = (over = {}) => {
  const row = {
    id: 'row-id-1', accountId: 'wa-01', clientContactId: 'c1', clientPhone: '+8801670535255',
    chatJid: '8801670535255@s.whatsapp.net', sourceMessageId: 'MSG-1', sourceHash: 'h1',
    blockKey: '2:hadiz', sourceTime: '2026-07-13T10:00:00.000Z',
    motherVessel: 'WAN MING 1', lighterVessel: 'HADIZ', masterMobile: '+8801863191301',
    cargo: '', capacity: '1,000 M/T', importer: '', destination: 'RUPSHI',
    bookingDate: null, escortName: '', escortMobile: '', dutyDate: null, shift: '',
    releasePoint: '', status: 'DRAFT', reasons: [], parsed: {}, sourceText: 'x', businessKey: null,
    ...over,
  };
  return {
    kind: row.status === 'DRAFT' ? 'DRAFT' : 'REVIEW',
    row,
    event: {id: `ev-${row.id}`, orderId: row.id, eventType: 'DRAFT_CREATED', sourceMessageId: row.sourceMessageId, sourceHash: row.sourceHash, payload: {}},
  };
};

function fake(existing = []) {
  const calls = [];
  const state = [...existing];
  const client = {
    calls,
    released: false,
    release() { this.released = true; },
    async query(sql, values) {
      const s = String(sql).replace(/\s+/g, ' ').trim();
      calls.push({sql: s, values});
      if (/pg_advisory_xact_lock/.test(s)) return {rows: []};
      if (/SELECT lighter_vessel, duty_date/.test(s)) {
        return {rows: state.filter((r) => r.source_message_id === values[1] && r.account_id === values[0])
          .map((r) => ({lighter_vessel: r.lighter_vessel, duty_date: r.duty_date, block_key: r.block_key}))};
      }
      if (/INSERT INTO public\.escort_order_register/.test(s)) {
        state.push({account_id: values[1], source_message_id: values[5], lighter_vessel: values[10], duty_date: values[19], block_key: values[9]});
        return {rows: [], rowCount: 1};
      }
      return {rows: [], rowCount: 1};
    },
  };
  return {client, state, calls};
}

const inserts = (calls) => calls.filter((c) => /INSERT INTO public\.escort_order_register/.test(c.sql));

test('identity key ignores punctuation, case and the M.V. prefix', () => {
  assert.equal(normalizeVesselIdentity('M.V. Hadiz'), 'hadiz');
  assert.equal(normalizeVesselIdentity('MV.HADIZ'), 'hadiz');
  assert.equal(normalizeVesselIdentity('Hadiz,'), 'hadiz');
  assert.equal(businessIdentityKey(op()), 'wa-01|MSG-1|hadiz|');
  assert.equal(businessIdentityKey(op({dutyDate: '2026-07-13'})), 'wa-01|MSG-1|hadiz|2026-07-13');
});

test('1. a batch of duplicate business rows is skipped, not re-inserted', async () => {
  const lighters = ['HADIZ', 'AL BADRA', 'NISHAD-2', 'S AFR0Z-1', 'KSL BULKER-3', 'Bushra Biva 01'];
  const existing = [];
  const operations = [];
  for (let i = 0; i < 52; i += 1) {
    const lighter = lighters[i % lighters.length];
    const source = `MSG-${i % 17}`;
    const date = i % 3 === 0 ? null : `2026-08-${String((i % 20) + 1).padStart(2, '0')}`;
    existing.push({account_id: 'wa-01', source_message_id: source, lighter_vessel: lighter, duty_date: date});
    operations.push(op({id: `different-generated-id-${i}`, sourceMessageId: source, lighterVessel: lighter, dutyDate: date}));
  }
  const {client, calls} = fake(existing);
  let skipped = 0;
  for (const operation of operations) {
    if (await persistOperationIfNew(client, operation) === 'skipped_duplicate') skipped += 1;
  }
  assert.equal(skipped, 52);
  assert.equal(inserts(calls).length, 0, 'no duplicate row may be written');
});

test('2. a repeated dry run is idempotent: the second pass inserts nothing', async () => {
  const {client, calls} = fake();
  const operation = op({sourceMessageId: 'MSG-A', lighterVessel: 'HADIZ', dutyDate: null});
  assert.equal(await persistOperationIfNew(client, operation), 'inserted');
  assert.equal(await persistOperationIfNew(client, op({id: 'other-id', sourceMessageId: 'MSG-A', lighterVessel: 'hadiz'})), 'skipped_duplicate');
  assert.equal(inserts(calls).length, 1);
});

test('3. different generated ids for the same business record are the same record', async () => {
  const existing = [{account_id: 'wa-01', source_message_id: 'MSG-1', lighter_vessel: 'HADIZ', duty_date: null}];
  const {client} = fake(existing);
  assert.equal(await persistOperationIfNew(client, op({id: 'salt-less-id-with-no-epoch-salt'})), 'skipped_duplicate');
});

test('4. two legitimate duties on the same Lighter stay two records', async () => {
  const {client, calls} = fake();
  // Two separate duties always arrive as two separate messages.
  assert.equal(await persistOperationIfNew(client, op({id: 'a', sourceMessageId: 'CONF-A', dutyDate: '2026-07-13'})), 'inserted');
  assert.equal(await persistOperationIfNew(client, op({id: 'b', sourceMessageId: 'CONF-B', dutyDate: '2026-07-15'})), 'inserted');
  assert.equal(inserts(calls).length, 2);
});

test('4b. a day and a night shift on the same Lighter and date stay two records', async () => {
  const {client, calls} = fake();
  assert.equal(await persistOperationIfNew(client, op({id: 'd', sourceMessageId: 'CONF-D', dutyDate: '2026-07-13', shift: 'D'})), 'inserted');
  assert.equal(await persistOperationIfNew(client, op({id: 'n', sourceMessageId: 'CONF-N', dutyDate: '2026-07-13', shift: 'N'})), 'inserted');
  assert.equal(inserts(calls).length, 2);
});

test('5. multiple Lighters in one message stay separate records', async () => {
  const {client, calls} = fake();
  assert.equal(await persistOperationIfNew(client, op({id: 'a', blockKey: '2:hadiz', lighterVessel: 'HADIZ'})), 'inserted');
  assert.equal(await persistOperationIfNew(client, op({id: 'b', blockKey: '3:albadra', lighterVessel: 'AL BADRA'})), 'inserted');
  assert.equal(inserts(calls).length, 2);
});

test('6. two confirmations that share one Order but different dates are distinct', async () => {
  const {client, calls} = fake();
  // Same original order, two confirmations → different source messages and dates.
  assert.equal(await persistOperationIfNew(client, op({id: 'c1', sourceMessageId: 'CONF-1', dutyDate: '2026-07-13', status: 'REVIEW'})), 'inserted');
  assert.equal(await persistOperationIfNew(client, op({id: 'c2', sourceMessageId: 'CONF-2', dutyDate: '2026-07-15', status: 'REVIEW'})), 'inserted');
  assert.equal(inserts(calls).length, 2);
});

test('7. a conflicting master/escort revision of the same block is one record', async () => {
  const existing = [{account_id: 'wa-01', source_message_id: 'CONF-1', lighter_vessel: 'HADIZ', duty_date: '2026-07-13'}];
  const {client} = fake(existing);
  assert.equal(
    await persistOperationIfNew(client, op({id: 'revised', sourceMessageId: 'CONF-1', dutyDate: '2026-07-13', status: 'REVIEW', masterMobile: '+8801999999999'})),
    'skipped_duplicate',
  );
});

test('8. an existing row with a Program does not change the decision', async () => {
  const existing = [{account_id: 'wa-01', source_message_id: 'CONF-1', lighter_vessel: 'HADIZ', duty_date: '2026-07-13'}];
  const {client, calls} = fake(existing);
  assert.equal(await persistOperationIfNew(client, op({id: 'x', sourceMessageId: 'CONF-1', dutyDate: '2026-07-13', status: 'REVIEW'})), 'skipped_duplicate');
  assert.equal(inserts(calls).length, 0);
});

test('9. the guard takes the transaction lock before reading or writing', async () => {
  const {client, calls} = fake();
  await persistOperationIfNew(client, op());
  const order = calls.map((c) => (/pg_advisory_xact_lock/.test(c.sql) ? 'lock' : /SELECT lighter_vessel/.test(c.sql) ? 'select' : /INSERT/.test(c.sql) ? 'insert' : 'other'));
  assert.equal(order[0], 'lock');
  assert.equal(order[1], 'select');
  assert.equal(order[2], 'insert');
  assert.deepEqual([...calls[0].values].sort(), ['wa-01|MSG-1|2', 'wa-01|MSG-1|hadiz|']);
});

test('10. the live path is unchanged: persistOperation writes without the guard', async () => {
  const {client, calls} = fake();
  await persistOperation(client, op({id: 'live-1'}));
  assert.equal(calls.filter((c) => /pg_advisory_xact_lock/.test(c.sql)).length, 0);
  assert.equal(inserts(calls).length, 1);
});

// ── concurrency ───────────────────────────────────────────────────────────────
// The real guarantee is `pg_advisory_xact_lock`, held until COMMIT. Two
// transactions on the same business key serialize, so the second one sees the
// first one's committed row and skips instead of inserting a duplicate. The fake
// below models that contract: BEGIN stages writes, COMMIT publishes them and
// releases the key lock, and a second caller waits on the key.
function sharedStore() {
  return {rows: [], chain: new Map(), releaseLock: null};
}

function transactionClient(store) {
  let staged = [];
  return {
    async query(sql, values) {
      const s = String(sql).replace(/\s+/g, ' ').trim();
      if (s === 'BEGIN') { staged = []; return {rows: []}; }
      if (s === 'COMMIT') {
        store.rows.push(...staged);
        staged = [];
        const release = store.releaseLock;
        store.releaseLock = null;
        if (release) release();
        return {rows: []};
      }
      if (s === 'ROLLBACK') { staged = []; return {rows: []}; }
      if (/pg_advisory_xact_lock/.test(s)) {
        const key = values[0];
        const previous = store.chain.get(key) ?? Promise.resolve();
        let release;
        const mine = new Promise((resolve) => { release = resolve; });
        store.chain.set(key, previous.then(() => mine));
        await previous;
        store.releaseLock = release;
        return {rows: []};
      }
      if (/SELECT lighter_vessel/.test(s)) {
        return {rows: store.rows.filter((r) => r.account_id === values[0] && r.source_message_id === values[1])};
      }
      if (/INSERT INTO public\.escort_order_register/.test(s)) {
        staged.push({account_id: values[1], source_message_id: values[5], lighter_vessel: values[10], duty_date: values[19], block_key: values[9]});
        return {rows: [], rowCount: 1};
      }
      return {rows: [], rowCount: 1};
    },
  };
}

const runInTransaction = async (client, operation) => {
  await client.query('BEGIN');
  const result = await persistOperationIfNew(client, operation);
  await client.query('COMMIT');
  return result;
};

test('11. two concurrent writers of the same business key insert exactly one row', async () => {
  const store = sharedStore();
  const [first, second] = await Promise.all([
    runInTransaction(transactionClient(store), op({id: 'tx-a'})),
    runInTransaction(transactionClient(store), op({id: 'tx-b'})),
  ]);
  assert.deepEqual([first, second].sort(), ['inserted', 'skipped_duplicate']);
  assert.equal(store.rows.length, 1, 'the advisory lock must serialize the pair');
});

test('11b. concurrent writers of different duties are not serialized into a false skip', async () => {
  const store = sharedStore();
  const results = await Promise.all([
    runInTransaction(transactionClient(store), op({id: 'tx-c', sourceMessageId: 'CONF-C', dutyDate: '2026-07-13'})),
    runInTransaction(transactionClient(store), op({id: 'tx-d', sourceMessageId: 'CONF-D', dutyDate: '2026-07-15'})),
  ]);
  assert.deepEqual(results, ['inserted', 'inserted']);
  assert.equal(store.rows.length, 2);
});

// ── program collision ─────────────────────────────────────────────────────────
// persistConfirmedProgram derives the Program id from business identity and
// relies on ON CONFLICT (id) DO NOTHING, so a second confirmation of the same
// duty can never create a second Program row.
function programClient() {
  const programs = new Set();
  const calls = [];
  return {
    programs,
    calls,
    async query(sql, values) {
      const s = String(sql).replace(/\s+/g, ' ').trim();
      calls.push({sql: s, values});
      if (/INSERT INTO public\.programs/.test(s)) {
        if (programs.has(values[0])) return {rows: [], rowCount: 0};
        programs.add(values[0]);
        return {rows: [{id: values[0]}], rowCount: 1};
      }
      return {rows: [], rowCount: 1};
    },
  };
}

const CONFIRMED = {
  account: 'wa-01', clientChat: '8801670535255@s.whatsapp.net',
  mother: 'MV WAN MING-1', lighter: 'MV Hadiz', masterMobile: '+8801863191301',
  destination: 'Narayongonj', escortName: 'Md Shahidullah', escortMobile: '+8801983978654',
  startDate: '2026-07-13', shift: 'D', orderId: 'order-1', orderMessageId: 'AC2FC611A9CDEA5651E7ACC48038ACF5',
  confirmationMessageId: 'ACC5D30AAD5C5CC5F79048002A031A7E', confirmationSourceHash: 'h',
  reviewRowId: 'review-1', matchState: 'EXACT', mobileEvidence: 'EXACT',
};

test('12. an existing Program collision creates nothing and reports existing', async () => {
  const client = programClient();
  const first = await persistConfirmedProgram(client, CONFIRMED);
  const second = await persistConfirmedProgram(client, {...CONFIRMED, reviewRowId: 'review-2'});
  assert.equal(first.created, true);
  assert.equal(second.created, false);
  assert.equal(first.programId, second.programId);
  assert.equal(client.programs.size, 1);
});

test('12b. a different shift for the same Lighter and date is a different Program', async () => {
  const client = programClient();
  const day = await persistConfirmedProgram(client, CONFIRMED);
  const night = await persistConfirmedProgram(client, {...CONFIRMED, shift: 'N'});
  assert.equal(day.created, true);
  assert.equal(night.created, true);
  assert.notEqual(day.programId, night.programId);
});

test('12c. an incomplete confirmation is refused before any write', async () => {
  const client = programClient();
  await assert.rejects(() => persistConfirmedProgram(client, {...CONFIRMED, shift: ''}), /CONFIRMATION_FIELDS_INCOMPLETE/);
  await assert.rejects(() => persistConfirmedProgram(client, {...CONFIRMED, escortMobile: ''}), /CONFIRMATION_FIELDS_INCOMPLETE/);
  assert.equal(client.programs.size, 0);
  assert.equal(client.calls.length, 0);
});

// ── parser correction ────────────────────────────────────────────────────────
// The proven failure mode: the live processor wrote a row with the older parser
// (name absorbed the capacity/phone, or the duty date was missing). The corrected
// parser derives a different name and/or date for the same block, so the
// business key changes. The block identity must still catch it.
test('13. a corrected Lighter name for the same block is the same record', async () => {
  const existing = [{
    account_id: 'wa-01', source_message_id: 'AC2FC611A9CDEA5651E7ACC48038ACF5',
    lighter_vessel: 'HADIZ, CAPACITY: 1,000 M/T, PHONE:', duty_date: null, block_key: '8:hadizcapacity1000mtphone',
  }];
  const {client, calls} = fake(existing);
  const operation = op({
    id: 'clean-derived-id', sourceMessageId: 'AC2FC611A9CDEA5651E7ACC48038ACF5',
    blockKey: '8:hadiz', lighterVessel: 'HADIZ', dutyDate: null,
  });
  assert.equal(await persistOperationIfNew(client, operation), 'skipped_duplicate');
  assert.equal(inserts(calls).length, 0);
});

test('14. a corrected duty date for the same block is the same record', async () => {
  const existing = [{
    account_id: 'wa-01', source_message_id: 'AC39A92739A1B2C3',
    lighter_vessel: 'M.V.Bismillah-Navigation', duty_date: null, block_key: '3:bismillahnavigation',
  }];
  const {client, calls} = fake(existing);
  const operation = op({
    id: 'date-derived-id', sourceMessageId: 'AC39A92739A1B2C3', status: 'REVIEW',
    blockKey: '3:bismillahnavigation', lighterVessel: 'M.V.Bismillah-Navigation', dutyDate: '2026-10-22',
  });
  assert.equal(await persistOperationIfNew(client, operation), 'skipped_duplicate');
  assert.equal(inserts(calls).length, 0);
});

test('14b. a different block in the same message is still a separate record', async () => {
  const existing = [{
    account_id: 'wa-01', source_message_id: 'AC2FC611A9CDEA5651E7ACC48038ACF5',
    lighter_vessel: 'HADIZ', duty_date: null, block_key: '8:hadiz',
  }];
  const {client, calls} = fake(existing);
  const operation = op({
    id: 'sibling-block', sourceMessageId: 'AC2FC611A9CDEA5651E7ACC48038ACF5',
    blockKey: '9:arishahmed1', lighterVessel: 'ARISH AHMED-1', dutyDate: null,
  });
  assert.equal(await persistOperationIfNew(client, operation), 'inserted');
  assert.equal(inserts(calls).length, 1);
});

// ── the measured corpus case ─────────────────────────────────────────────────
// The read-only dry run over 1,233 messages derives 18 operations: 9 already
// registered by exact identity, 5 that would re-insert a row the older parser
// wrote under a polluted name, and 4 genuinely new Drafts. This test pins that
// split with the real block keys.
test('15. the measured corpus split: 5 polluted-name duplicates skipped, 4 new Drafts inserted', async () => {
  const polluted = [
    ['AC2FC611A9CDEA5651E7ACC48038ACF5', '7:newsrijon1capacity1000mtphone', 'NEW SRIJON-1, CAPACITY: 1,000 M/T, PHONE:', '7:newsrijon1', 'NEW SRIJON-1'],
    ['AC2FC611A9CDEA5651E7ACC48038ACF5', '8:hadizcapacity1000mtphone', 'HADIZ, CAPACITY: 1,000 M/T, PHONE:', '8:hadiz', 'HADIZ'],
    ['AC2FC611A9CDEA5651E7ACC48038ACF5', '9:arishahmed1capacity1000mtphone', 'ARISH AHMED-1, CAPACITY: 1,000 M/T, PHONE:', '9:arishahmed1', 'ARISH AHMED-1'],
    ['ACB479CACD88F6B6856A9C571F515119', '7:albadracapacity1000mtphone', 'AL BADRA,  CAPACITY: 1,000 M/T, PHONE:', '7:albadra', 'AL BADRA'],
    ['AC2919C330D82303BCBD4012FEDF888E', '14:rafiqmunsur2capacity1000mtphone', 'RAFIQ MUNSUR-2, CAPACITY: 1,000 M/T, PHONE:', '14:rafiqmunsur2', 'RAFIQ MUNSUR-2'],
  ];
  const existing = polluted.map(([source, block, lighter]) => ({
    account_id: 'wa-01', source_message_id: source, lighter_vessel: lighter, duty_date: null, block_key: block,
  }));
  const {client, calls} = fake(existing);
  let skipped = 0;
  for (const [source, , , cleanBlock, cleanName] of polluted) {
    const result = await persistOperationIfNew(client, op({
      id: `clean-${cleanBlock}`, sourceMessageId: source, blockKey: cleanBlock, lighterVessel: cleanName, dutyDate: null,
    }));
    if (result === 'skipped_duplicate') skipped += 1;
  }
  const fresh = [
    ['AC2919C330D82303BCBD4012FEDF888E', '11:kslbulker3', 'KSL BULKER-3'],
    ['AC93B8667565AC03D7717B2F8E254880', '11:nishad2', 'NISHAD-2'],
    ['AC432D8B770DAD5DF70A108CF6B431DF', '4:zl1', 'Z.L-1'],
    ['AC57161B823236D8AEB6F16CC0040268', '11:safroz1', 'S AFROZ-1'],
  ];
  for (const [source, block, lighter] of fresh) {
    assert.equal(await persistOperationIfNew(client, op({
      id: `new-${block}`, sourceMessageId: source, blockKey: block, lighterVessel: lighter, dutyDate: null,
    })), 'inserted', lighter);
  }
  assert.equal(skipped, 5);
  assert.equal(inserts(calls).length, 4);
});

// ── Escort Change link ───────────────────────────────────────────────────────
test('16. an Escort Change links both duties and never invents a release date', async () => {
  const client = programClient();
  const first = await persistConfirmedProgram(client, {...CONFIRMED, replacedBy: 'placeholder-second-id'});
  const second = await persistConfirmedProgram(client, {
    ...CONFIRMED, confirmationMessageId: 'CONF-2', startDate: '2026-07-15',
    replacementOf: first.programId, replacementReason: 'ESCORT_CHANGE',
  });
  assert.notEqual(first.programId, second.programId);

  const programInserts = client.calls.filter((c) => /INSERT INTO public\.programs/.test(c.sql));
  const detailsFirst = JSON.parse(programInserts[0].values[10]);
  const detailsSecond = JSON.parse(programInserts[1].values[10]);
  assert.equal(detailsFirst.replacedBy, 'placeholder-second-id');
  assert.equal(detailsFirst.replacementOf, undefined);
  assert.equal(detailsSecond.replacementOf, first.programId);
  assert.equal(detailsSecond.replacementReason, 'ESCORT_CHANGE');
  assert.equal(detailsSecond.replacedBy, undefined);

  const assignments = client.calls.filter((c) => /INSERT INTO public\.program_assignments/.test(c.sql));
  assert.equal(assignments.length, 2);
  // released_on stays NULL: the release date is unknown and must not be invented.
  assert.match(assignments[1].sql, /NULL,NULL,\$7::text/);
  assert.equal(assignments[0].values[6], null);
  assert.match(String(assignments[1].values[6]), /^[a-f0-9]{64}$/);
  assert.notEqual(assignments[1].values[6], assignments[1].values[0], 'predecessor is the other assignment');
});

test('17. a DATE column delivered as a Date object still matches the string form', async () => {
  const existing = [{
    account_id: 'wa-01', source_message_id: 'MSG-DATE', lighter_vessel: 'HADIZ',
    duty_date: new Date(2026, 7, 15), block_key: '2:hadiz',
  }];
  const {client, calls} = fake(existing);
  const operation = op({id: 'same-record', sourceMessageId: 'MSG-DATE', blockKey: '9:other', dutyDate: '2026-08-15'});
  assert.equal(await persistOperationIfNew(client, operation), 'skipped_duplicate');
  assert.equal(inserts(calls).length, 0);
});
