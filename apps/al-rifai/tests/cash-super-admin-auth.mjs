import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isCashSuperAdmin,requireCashSuperAdmin} from '../lib/cash-portal.ts';

const adminId='a'.repeat(64);
const admin={id:adminId,role:'ADMIN'};

test('Cash data is denied unless an ADMIN identity is explicitly allowlisted',()=>{
 const previous=process.env.ALRIFAI_CASH_SUPER_ADMIN_IDS;
 try{
  delete process.env.ALRIFAI_CASH_SUPER_ADMIN_IDS;
  assert.equal(isCashSuperAdmin(admin),false);
  assert.throws(()=>requireCashSuperAdmin(admin),error=>error.code==='SUPER_ADMIN_REQUIRED'&&error.status===403);
  process.env.ALRIFAI_CASH_SUPER_ADMIN_IDS=`${'b'.repeat(64)}, ${adminId}`;
  assert.equal(isCashSuperAdmin(admin),true);
  assert.equal(isCashSuperAdmin({id:adminId,role:'USER'}),false);
  assert.equal(isCashSuperAdmin({id:'not-a-valid-user-id',role:'ADMIN'}),false);
 }finally{
  if(previous===undefined)delete process.env.ALRIFAI_CASH_SUPER_ADMIN_IDS;
  else process.env.ALRIFAI_CASH_SUPER_ADMIN_IDS=previous;
 }
});

test('Cash Current summary uses the read capability; source-message access stays Super Admin-only',()=>{
 const route=readFileSync(new URL('../app/api/cash/[...path]/route.ts',import.meta.url),'utf8');
 assert.match(route,/if\(action==="summary"&&request\.method==="GET"\)\{\s*if\(!hasCapability\(result\.user,"cash\.read"\)\)/);
 assert.match(route,/if\(scope==="ARCHIVE"&&result\.user\.role!=="ADMIN"\)/);
 assert.match(route,/if\(action==="messages"&&request\.method==="GET"\)\{\s*requireCashSuperAdmin\(result\.user\);/);
});
