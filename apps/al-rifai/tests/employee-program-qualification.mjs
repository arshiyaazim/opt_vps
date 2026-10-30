import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {canonical,sha,validDate,normalizeEmployeeMobile} from '../lib/employee-program-validation.mjs';

const readerPath=new URL('../lib/vessel-source.ts',import.meta.url),original=readFileSync(readerPath,'utf8');
const code=ts.transpileModule(original,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const stubs={
  './employee-program-validation.mjs':{normalizeEmployeeMobile,canonical,sha},
  '@/lib/integrations':{integrationConfig:{}},
  '../db/raw':{database:()=>{throw new Error('Database access is not part of this test.');}},
  './seed':{seed:[]},
  './conversation-snapshot':{importedPrograms:async()=>[],importSummary:{updatedAt:'SYNTHETIC'}},
  './vessel-data':{validDate,missingFields:()=>[]},
};
const qualificationModule={exports:{}};
new Function('require','module','exports',code)(
  name=>{assert.ok(stubs[name],'Unexpected reader dependency: '+name);return stubs[name];},
  qualificationModule,qualificationModule.exports,
);
const {buildHistoricalRoster}=qualificationModule.exports;
const scope={accountId:'wa-01',chatJids:['synthetic-chat-a','synthetic-chat-b']};
const row=(id,extra={})=>({
  id,motherVessel:'Synthetic Mother',lighterVessel:'Synthetic Lighter',
  escortName:'Synthetic Name',escortMobile:'01700000001',masterMobile:'',
  startDate:'2026-01-01',shift:'D',status:'Recorded',source:'synthetic',
  details:{accountId:'wa-01',chatJid:'synthetic-chat-a'},
  aliases:[id],evidence:[],conflicts:[],...extra,
});
const build=(stored,imported,options=scope)=>buildHistoricalRoster(stored,imported,options);

test('same name and program context do not link employees with different mobile identities',()=>{
  const rows=build([row('stored',{escortMobile:'01800000001'})],[row('source')]);
  assert.equal(rows.length,2);
  assert.deepEqual(new Set(rows.map(r=>normalizeEmployeeMobile(r.escortMobile))),new Set(['+8801800000001','+8801700000001']));
  assert.ok(rows.every(r=>!r.aliases?.includes(r.id==='stored'?'source':'stored')));
});

test('the same verified employee mobile shares name aliases without merging distinct programs',()=>{
  const rows=build([],[
    row('program-a',{escortName:'First Synthetic Name'}),
    row('program-b',{escortName:'Second Synthetic Name',startDate:'2026-01-02'}),
  ]);
  assert.equal(rows.length,2);
  assert.ok(rows.every(r=>r.employeeIdentity?.employeeId==='+8801700000001'));
  assert.ok(rows.every(r=>r.employeeIdentity?.aliases.length===2));
  assert.notEqual(rows[0].id,rows[1].id);
});

test('an explicit alias with conflicting employee mobiles is retained for review, not merged',()=>{
  const rows=build(
    [row('accepted',{escortMobile:'01800000001',status:'Active'})],
    [row('source',{aliases:['source','accepted']})],
  );
  assert.equal(rows.length,1);
  assert.equal(rows[0].id,'accepted');
  assert.equal(rows[0].status,'Active');
  assert.equal(rows[0].employeeId,'+8801800000001');
  assert.equal(rows[0].roster?.state,'CONFLICT_REVIEW');
  assert.equal(rows[0].roster?.reviewRequired,true);
  assert.ok(rows[0].issues.some(value=>value.includes('no additional assignment created')));
});

test('missing employee mobile may match context only as review evidence, never as identity',()=>{
  const source=row('source',{escortMobile:'',sourceRole:'payout_mobile'});
  const rows=build([row('accepted',{escortMobile:''})],[source]);
  assert.equal(rows.length,1);
  assert.equal(rows[0].employeeId,null);
  assert.equal(rows[0].employeeIdentity?.state,'UNRESOLVED');
  assert.equal(rows[0].roster?.reviewRequired,true);
  assert.ok(rows[0].roster?.history.length===2);
});

test('records from different chats cannot link even when aliases overlap',()=>{
  const source=row('source',{aliases:['source','stored'],details:{accountId:'wa-01',chatJid:'synthetic-chat-b'}});
  const rows=build([row('stored')],[source]);
  assert.equal(rows.length,2);
  assert.ok(rows.every(r=>r.roster?.history.length===1));
});

test('conflicting account/chat provenance is not used to qualify an employee link',()=>{
  const source=row('source',{aliases:['source','stored'],chatJid:'synthetic-chat-b'});
  const rows=build([row('stored')],[source]);
  assert.equal(rows.length,2);
  assert.ok(rows.some(r=>r.roster?.state==='UNRESOLVED_REFERENCE'));
});

test('evidence qualification remains passive and keeps role scopes separate',()=>{
  const code=readFileSync(new URL('../scripts/employee-program-evidence-qualification.mjs',import.meta.url),'utf8');
  assert.doesNotMatch(code,/createPool|importEvidence|fetch\(/);
  assert.match(code,/OWNER_ATTESTED_ADMIN_ACCOUNTANT_PAYMENT_INSTRUCTIONS_ONLY/);
  assert.match(code,/programConfirmationAuthorityVerified:false/);
  assert.match(original,/const exact=inScope\.filter/);
  assert.match(original,/EMPLOYEE_MOBILE_CONFLICT/);
  assert.match(original,/CONFLICTING_SOURCE_SCOPE/);
  assert.match(original,/reviewRequired=true/);
  assert.match(original,/no additional assignment created/);
  assert.equal(sha(canonical({source:'synthetic'})).length,64);
});
