import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateEmployeeSubmission} from '../lib/employee-submission.ts';

const route=readFileSync(new URL('../app/api/cash/[...path]/route.ts',import.meta.url),'utf8');
const ui=readFileSync(new URL('../app/platform/ui.tsx',import.meta.url),'utf8');
const migration=readFileSync(new URL('../db/migration-candidates/0035_employee_submission_requests.sql',import.meta.url),'utf8');
const postStart=route.indexOf('if(action==="employee-submissions"&&segments.length===1&&request.method==="POST"){');
const getStart=route.indexOf('if(action==="employee-submissions"&&segments.length===1&&request.method==="GET"){',postStart);
const postRoute=route.slice(postStart,getStart);
const getEnd=route.indexOf('// ---- Cash submissions:',getStart);
const getRoute=route.slice(getStart,getEnd);

test('employee request stores only normalized identity and non-sensitive proposal fields',()=>{
  const result=validateEmployeeSubmission({
    employeeName:'  Synthetic Employee  ',
    employeeMobile:'০১৭০০০০০০০১',
    proposedAssignment:' Synthetic Lighter ',
    requestedJoiningDate:'2026-10-29',
    note:' Synthetic review note ',
  });
  assert.equal(result.ok,true);
  if(!result.ok)return;
  assert.deepEqual(result.payload,{
    employeeName:'Synthetic Employee',
    employeeMobile:'+8801700000001',
    proposedAssignment:'Synthetic Lighter',
    requestedJoiningDate:'2026-10-29',
    note:'Synthetic review note',
    payloadHash:result.payload.payloadHash,
    state:'PENDING_APPROVAL',
  });
  assert.match(result.payload.payloadHash,/^[a-f0-9]{64}$/);
});

test('employee request accepts optional assignment/date/note and keeps request pending',()=>{
  const result=validateEmployeeSubmission({employeeName:'Synthetic Employee',employeeMobile:'01700000001'});
  assert.equal(result.ok,true);
  if(!result.ok)return;
  assert.equal(result.payload.proposedAssignment,'');
  assert.equal(result.payload.requestedJoiningDate,null);
  assert.equal(result.payload.note,'');
  assert.equal(result.payload.state,'PENDING_APPROVAL');
});

test('invalid employee identity, excessive fields and invalid dates fail closed',()=>{
  assert.deepEqual(validateEmployeeSubmission({employeeName:'Synthetic',employeeMobile:'0170000000'}),{ok:false,reasons:['EMPLOYEE_ID_INVALID']});
  assert.deepEqual(validateEmployeeSubmission({employeeName:'Synthetic',employeeMobile:'01700000001',nid:'synthetic'}),{ok:false,reasons:['UNSUPPORTED_FIELDS']});
  assert.deepEqual(validateEmployeeSubmission({employeeName:'Synthetic',employeeMobile:'01700000001',salary:'500'}),{ok:false,reasons:['UNSUPPORTED_FIELDS']});
  assert.equal(validateEmployeeSubmission({employeeName:'Synthetic',employeeMobile:'01700000001',requestedJoiningDate:'2026-02-30'}).ok,false);
  assert.equal(validateEmployeeSubmission({employeeName:'x'.repeat(151),employeeMobile:'01700000001'}).ok,false);
  assert.equal(validateEmployeeSubmission({employeeName:'Synthetic',employeeMobile:'01700000001',note:'x'.repeat(501)}).ok,false);
});

test('repeated identical employee request payload is deterministic',()=>{
  const input={employeeName:'Synthetic',employeeMobile:'01700000001',proposedAssignment:'Synthetic vessel'};
  const first=validateEmployeeSubmission(input),second=validateEmployeeSubmission({...input});
  assert.equal(first.ok,true);assert.equal(second.ok,true);
  if(first.ok&&second.ok)assert.equal(first.payload.payloadHash,second.payload.payloadHash);
});

test('employee API authenticates, applies the first-login gate, and writes request plus audit atomically',()=>{
  assert.ok(postStart>=0&&getStart>postStart);
  assert.match(route,/const result=await auth\(request,request\.method!=="GET"\)/);
  assert.match(postRoute,/forced\(result\.user\)/);
  assert.match(postRoute,/validateEmployeeSubmission/);
  assert.match(postRoute,/INSERT INTO public\.employee_submission_requests/);
  assert.match(postRoute,/ON CONFLICT \(submitted_by_user_ref,payload_hash\) DO NOTHING/);
  assert.match(postRoute,/await client\.query\("BEGIN"\)/);
  assert.ok(postRoute.indexOf('INSERT INTO public.employee_submission_requests')<postRoute.indexOf('INSERT INTO public.cash_portal_audit'));
  assert.ok(postRoute.indexOf('INSERT INTO public.cash_portal_audit')<postRoute.indexOf('await client.query("COMMIT")'));
  assert.match(postRoute,/state:"PENDING_APPROVAL",duplicate,employeeActivated:false/);
  assert.doesNotMatch(postRoute,/cash_postings|cash_movements|employee_master|public\.programs/);
});

test('employee request reads are self-scoped for Users and all-scoped only for authenticated Admins',()=>{
  assert.match(getRoute,/WHERE \(\$1::boolean OR r\.submitted_by_user_ref=\$2\)/);
  assert.match(getRoute,/\(\$1::boolean AND r\.submitted_by_user_ref<>?\$2\) AS "canDecide"/);
  assert.match(getRoute,/\[result\.user\.role==="ADMIN",result\.user\.id\]/);
  assert.match(getRoute,/PENDING_APPROVAL/);
  assert.match(getRoute,/LIMIT \$\{limit\} OFFSET \$\{offset\}/);
  assert.match(getRoute,/SELECT count\(\*\)::int AS count FROM public\.employee_submission_requests r/);
  assert.match(getRoute,/rows:rows\.rows,total:total\.rows\[0\]\?\.count\?\?0,limit,offset/);
});

test('employee candidate schema is append-only, private by default, and cannot activate business records',()=>{
  const definition=migration.slice(migration.indexOf('CREATE TABLE public.employee_submission_requests'),migration.indexOf('\n);')+3);
  assert.match(migration,/PREPARED MIGRATION CANDIDATE — NOT APPLIED TO ANY DATABASE/);
  assert.match(migration,/REFERENCES public\.cash_portal_users\(id\)/);
  assert.match(migration,/UNIQUE \(submitted_by_user_ref, payload_hash\)/);
  assert.match(migration,/BEFORE UPDATE OR DELETE/);
  assert.match(migration,/BEFORE TRUNCATE/);
  assert.match(migration,/REVOKE ALL ON public\.employee_submission_requests FROM PUBLIC/);
  assert.match(migration,/GRANT SELECT, INSERT ON public\.employee_submission_requests TO ir_review_runtime/);
  assert.doesNotMatch(migration,/GRANT[^;]*\bUPDATE\b|GRANT[^;]*\bDELETE\b/i);
  assert.doesNotMatch(definition,/nid|salary|emergency|cash_postings|cash_movements|programs|employee_master/i);
});

test('drawer forms use authenticated APIs, expose persisted status, and never write Cash postings or Vessel programs',()=>{
  assert.ok(ui.includes("cashPost<SubmissionResponse>('/api/cash/submissions'"));
  assert.ok(ui.includes("cashPost<SubmissionResponse>('/api/cash/employee-submissions'"));
  assert.ok(ui.includes("cashJson<{rows:CashSubmissionRow[]}>('/api/cash/submissions'"));
  assert.match(ui,/cashJson<\{rows:EmployeeSubmissionRow\[\];total:number;canDecide:boolean;canActivate:boolean\}>\(\s*`\/api\/cash\/employee-submissions\?limit=\$\{EMPLOYEE_REQUEST_PAGE_SIZE\}&offset=\$\{pageOffset\}`/);
  assert.match(ui,/employee-submissions\?limit=\$\{EMPLOYEE_REQUEST_PAGE_SIZE\}&offset=\$\{pageOffset\}/);
  assert.match(ui,/Showing \{total\?offset\+1:0\}–\{Math\.min\(offset\+rows\.length,total\)\} of \{total\}/);
  assert.match(ui,/Previous/);
  assert.match(ui,/Next/);
  assert.match(ui,/PENDING_REVIEW/);
  assert.match(ui,/PENDING_APPROVAL/);
  assert.match(ui,/Reason required to reject/);
  assert.match(ui,/X-CSRF-Token/);
  assert.match(ui,/not posted to Cash/i);
  assert.match(ui,/does not create or change a Vessel program/i);
  assert.match(ui,/NID, salary and emergency-contact details are not collected/);
  assert.doesNotMatch(ui,/localStorage|sessionStorage/);
});
