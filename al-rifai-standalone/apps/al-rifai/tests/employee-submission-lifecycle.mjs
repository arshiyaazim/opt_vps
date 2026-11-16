import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  assertCanActivateEmployee,
  assertCanDecideEmployee,
  EmployeeSubmissionPolicyError,
  validateEmployeeDecision,
  validateEmployeeDecisionNote,
} from '../lib/employee-submission-policy.ts';

const route=readFileSync(new URL('../app/api/cash/[...path]/route.ts',import.meta.url),'utf8');
const migration=readFileSync(new URL('../db/migration-candidates/0035_employee_submission_requests.sql',import.meta.url),'utf8');
const ui=readFileSync(new URL('../app/platform/ui.tsx',import.meta.url),'utf8');
const decisionStart=route.indexOf('if(action==="employee-submissions"&&segments[1]&&segments[2]==="decision"&&request.method==="POST"){');
const activationStart=route.indexOf('if(action==="employee-submissions"&&segments[1]&&segments[2]==="activate"&&request.method==="POST"){',decisionStart);
const postStart=route.indexOf('if(action==="submissions"&&!segments[1]&&request.method==="POST"){',activationStart);
const decisionRoute=route.slice(decisionStart,activationStart);
const activationRoute=route.slice(activationStart,postStart);

function denied(code,callback){
  assert.throws(callback,error=>error instanceof EmployeeSubmissionPolicyError&&error.code===code);
}

test('only explicit approve/reject decisions are accepted',()=>{
  assert.equal(validateEmployeeDecision('APPROVED'),'APPROVED');
  assert.equal(validateEmployeeDecision('REJECTED'),'REJECTED');
  for(const value of ['PENDING_APPROVAL','ACTIVE','approved',null,undefined])assert.equal(validateEmployeeDecision(value),null);
});

test('candidate schema keeps Employee portal independent from payment and Vessel records',()=>{
  assert.doesNotMatch(migration,/REFERENCES public\.employee_master|INSERT INTO public\.employee_master|cash_postings|cash_movements|public\.programs/);
});

test('creator Admin is blocked from self-review while another Admin may decide once',()=>{
  denied('EMPLOYEE_SELF_REVIEW_FORBIDDEN',()=>assertCanDecideEmployee('ADMIN','PENDING_APPROVAL','admin-a','admin-a'));
  assert.doesNotThrow(()=>assertCanDecideEmployee('ADMIN','PENDING_APPROVAL','admin-b','admin-a'));
  denied('ADMIN_REQUIRED',()=>assertCanDecideEmployee('USER','PENDING_APPROVAL','user-a','admin-a'));
  denied('EMPLOYEE_REQUEST_ALREADY_DECIDED',()=>assertCanDecideEmployee('ADMIN','APPROVED','admin-b','admin-a'));
  denied('EMPLOYEE_REQUEST_ALREADY_DECIDED',()=>assertCanDecideEmployee('ADMIN','REJECTED','admin-b','admin-a'));
  denied('EMPLOYEE_REQUEST_ALREADY_DECIDED',()=>assertCanDecideEmployee('ADMIN','ACTIVE','admin-b','admin-a'));
});

test('rejection requires a nonblank reason while approval notes remain optional',()=>{
  assert.equal(validateEmployeeDecisionNote('REJECTED',undefined),null);
  assert.equal(validateEmployeeDecisionNote('REJECTED','  '),null);
  assert.equal(validateEmployeeDecisionNote('REJECTED',' Duplicate identity '),'Duplicate identity');
  assert.equal(validateEmployeeDecisionNote('APPROVED',undefined),null);
  assert.equal(validateEmployeeDecisionNote('APPROVED',''),'');
  assert.equal(validateEmployeeDecisionNote('APPROVED',' Review checked '),'Review checked');
  assert.equal(validateEmployeeDecisionNote('REJECTED','x'.repeat(501)),null);
});

test('activation is Super-Admin-only, separately confirmed, approved-only and one-time',()=>{
  assert.doesNotThrow(()=>assertCanActivateEmployee(true,'APPROVED','ACTIVATE_EMPLOYEE'));
  denied('SUPER_ADMIN_REQUIRED',()=>assertCanActivateEmployee(false,'APPROVED','ACTIVATE_EMPLOYEE'));
  denied('EMPLOYEE_REQUEST_NOT_APPROVED',()=>assertCanActivateEmployee(true,'PENDING_APPROVAL','ACTIVATE_EMPLOYEE'));
  denied('EMPLOYEE_REQUEST_NOT_APPROVED',()=>assertCanActivateEmployee(true,'REJECTED','ACTIVATE_EMPLOYEE'));
  denied('EMPLOYEE_REQUEST_ALREADY_DECIDED',()=>assertCanActivateEmployee(true,'ACTIVE','ACTIVATE_EMPLOYEE'));
  denied('EMPLOYEE_ACTIVATION_CONFIRMATION_REQUIRED',()=>assertCanActivateEmployee(true,'APPROVED',true));
});

test('decision endpoint is authenticated, Admin-gated, single-use and audited without activation',()=>{
  assert.ok(decisionStart>=0&&activationStart>decisionStart&&postStart>activationStart);
  assert.match(decisionRoute,/forced\(result\.user\);requireAdmin\(result\.user\)/);
  assert.match(decisionRoute,/SELECT id,submitted_by_user_ref FROM public\.employee_submission_requests WHERE id=\$1/);
  assert.match(decisionRoute,/assertCanDecideEmployee\(result\.user\.role,priorState,result\.user\.id,requestRow\.rows\[0\]\.submitted_by_user_ref\)/);
  assert.match(decisionRoute,/EMPLOYEE_REJECTION_REASON_REQUIRED/);
  assert.match(decisionRoute,/INSERT INTO public\.employee_submission_decisions/);
  assert.match(decisionRoute,/VALUES\(\$1,\$2,\$3,\$4,\$5\)/);
  assert.match(decisionRoute,/\[decisionId,requestId,decision,result\.user\.id,note\]/);
  assert.match(migration,/request_id text NOT NULL UNIQUE REFERENCES public\.employee_submission_requests\(id\)/);
  assert.match(decisionRoute,/assertCanDecideEmployee/);
  assert.match(decisionRoute,/INSERT INTO public\.employee_submission_decisions/);
  assert.match(decisionRoute,/INSERT INTO public\.cash_portal_audit/);
  assert.match(decisionRoute,/JSON\.stringify\(\{decision,note\}\)/);
  assert.ok(decisionRoute.indexOf('INSERT INTO public.employee_submission_decisions')<decisionRoute.indexOf('INSERT INTO public.cash_portal_audit'));
  assert.match(decisionRoute,/await client\.query\("BEGIN"\)/);
  assert.ok(decisionRoute.indexOf('await client.query("BEGIN")')<decisionRoute.indexOf('INSERT INTO public.employee_submission_decisions'));
  assert.ok(decisionRoute.indexOf('INSERT INTO public.cash_portal_audit')<decisionRoute.indexOf('await client.query("COMMIT")'));
  assert.match(decisionRoute,/employeeActivated:false/);
  assert.doesNotMatch(decisionRoute,/employee_directory_records|employee_master|cash_postings|cash_movements|public\.programs/);
});

test('activation endpoint requires the configured Super Admin and explicit confirmation after approval',()=>{
  assert.match(activationRoute,/forced\(result\.user\);requireCashSuperAdmin\(result\.user\)/);
  assert.match(activationRoute,/SELECT id,employee_name,employee_mobile,proposed_assignment,requested_joining_date/);
  assert.match(activationRoute,/SELECT decision FROM public\.employee_submission_decisions/);
  assert.match(activationRoute,/assertCanActivateEmployee\(isCashSuperAdmin\(result\.user\),currentState,body\.confirmation\)/);
  assert.match(activationRoute,/INSERT INTO public\.employee_directory_records/);
  assert.match(activationRoute,/INSERT INTO public\.cash_portal_audit/);
  assert.match(activationRoute,/await client\.query\("BEGIN"\)/);
  assert.ok(activationRoute.indexOf('await client.query("BEGIN")')<activationRoute.indexOf('INSERT INTO public.employee_directory_records'));
  assert.ok(activationRoute.indexOf('INSERT INTO public.cash_portal_audit')<activationRoute.indexOf('await client.query("COMMIT")'));
  assert.match(activationRoute,/cashPostingCreated:false,vesselProgramCreated:false/);
  assert.doesNotMatch(activationRoute,/cash_postings|cash_movements|public\.programs|employee_master/);
});

test('candidate schema records decisions and activations append-only with database approval guard',()=>{
  assert.match(migration,/CREATE TABLE public\.employee_submission_decisions/);
  assert.match(migration,/request_id text NOT NULL UNIQUE REFERENCES public\.employee_submission_requests\(id\)/);
  assert.match(migration,/decision text NOT NULL CHECK \(decision IN \('APPROVED','REJECTED'\)\)/);
  assert.match(migration,/decision <> 'REJECTED' OR length\(btrim\(note\)\) > 0/);
  assert.match(migration,/employee_submission_decisions_no_update_delete/);
  assert.match(migration,/employee_submission_decisions_no_truncate/);
  assert.match(migration,/CREATE TABLE public\.employee_directory_records/);
  assert.match(migration,/source_request_id text NOT NULL UNIQUE REFERENCES public\.employee_submission_requests\(id\)/);
  assert.match(migration,/employee_mobile text NOT NULL UNIQUE/);
  assert.match(migration,/alrifai_employee_activation_requires_approval/);
  assert.match(migration,/d\.decision='APPROVED'/);
  assert.match(migration,/employee_directory_no_update_delete/);
  assert.match(migration,/employee_directory_no_truncate/);
  assert.match(migration,/GRANT SELECT, INSERT ON public\.employee_submission_decisions TO ir_review_runtime/);
  assert.match(migration,/GRANT SELECT, INSERT ON public\.employee_directory_records TO ir_review_runtime/);
  assert.doesNotMatch(migration,/GRANT[^;]*\bUPDATE\b|GRANT[^;]*\bDELETE\b/i);
});

test('Admin UI separates decision and Super Admin activation actions',()=>{
  assert.match(ui,/canDecide&&row\.canDecide&&row\.state==='PENDING_APPROVAL'/);
  assert.match(ui,/decide\(row,'APPROVED'\)/);
  assert.match(ui,/decide\(row,'REJECTED'\)/);
  assert.match(ui,/canActivate&&row\.state==='APPROVED'/);
  assert.match(ui,/Reason required to reject/);
  assert.match(ui,/A rejection reason is required\./);
  assert.match(ui,/\/api\/cash\/employee-submissions\/\$\{row\.id\}\/decision/);
  assert.match(ui,/\/api\/cash\/employee-submissions\/\$\{row\.id\}\/activate/);
  assert.match(ui,/confirmation:'ACTIVATE_EMPLOYEE'/);
  assert.match(ui,/window\.confirm/);
});
