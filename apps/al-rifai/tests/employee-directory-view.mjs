import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {portalActivatedEmployees,employeePage,EMPLOYEE_PAGE_SIZE} from '../lib/employee-directory-view.ts';

const view=readFileSync(new URL('../app/employees/view.tsx',import.meta.url),'utf8');

test('portal activations remain separately sourced and visibly marked when mobile collides',()=>{
  const paymentRows=[{identity:'payment:01700000001',employeePhone:'+8801700000001'}];
  const portalRows=[
    {id:'portal-a',employeeName:'Synthetic Employee',employeeMobile:'+8801700000001',state:'ACTIVE',activatedAt:'2026-10-30T00:00:00Z',activatedByUsername:'super-admin'},
    {id:'pending-b',employeeName:'Pending Employee',employeeMobile:'+8801700000002',state:'PENDING_APPROVAL',activatedAt:null,activatedByUsername:null},
  ];
  const portal=portalActivatedEmployees(portalRows,paymentRows);
  assert.equal(paymentRows.length,1);
  assert.equal(portal.length,1);
  assert.equal(portal[0].id,'portal-a');
  assert.equal(portal[0].source,'PORTAL_ACTIVATION');
  assert.equal(portal[0].status,'ACTIVE');
  assert.equal(portal[0].paymentIdentityCollision,true);
});

test('Employee page renders payment-derived and portal-activated sources in separate sections',()=>{
  assert.match(view,/title="Payment-derived Employee master"/);
  assert.match(view,/title="Portal Activated Employees"/);
  assert.match(view,/Portal activation/);
  assert.match(view,/Mobile collision with payment-derived identity · kept separate/);
  assert.match(view,/portalActivatedEmployees\(requests,paymentRows\)/);
});

test('payment-derived Employee table paginates all filtered identities without truncating at 200',()=>{
  const rows=Array.from({length:233},(_,index)=>index);
  assert.equal(EMPLOYEE_PAGE_SIZE,40);
  assert.deepEqual(employeePage(rows,1),{rows:rows.slice(0,40),page:1,pages:6,start:1,end:40});
  assert.deepEqual(employeePage(rows,6),{rows:rows.slice(200),page:6,pages:6,start:201,end:233});
  assert.equal(employeePage(rows,99).page,6);
  assert.match(view,/employeePage\(filtered,page\)/);
  assert.match(view,/Previous employee page/);
  assert.match(view,/Next employee page/);
  assert.doesNotMatch(view,/filtered\.slice\(0,200\)|first 200 matching identities/);
});
