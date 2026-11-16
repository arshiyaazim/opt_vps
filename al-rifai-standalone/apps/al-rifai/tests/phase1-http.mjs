import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const origin=process.env.ALRIFAI_TEST_ORIGIN || 'http://127.0.0.1:3000';
const password=readFileSync(process.env.ALRIFAI_VALIDATION_PASSWORD_FILE || '/etc/vps/apps/al-rifai/validation_password','utf8').trim();
const authorization='Basic '+Buffer.from('validator:'+password).toString('base64');
const auth={authorization};
const get=async(path,headers=auth)=>{const r=await fetch(origin+path,{headers,redirect:'manual'});const body=await r.json();return {status:r.status,body};};
for(const path of ['/','/register','/conversations','/api/register','/api/operations','/api/conversations','/api/assistant']){
 const r=await fetch(origin+path,{headers:{'oai-authenticated-user-id':'spoofed','oai-authenticated-user-email':'spoofed@example.test','x-middleware-subrequest':'proxy:proxy:proxy:proxy:proxy'},redirect:'manual'});assert.equal(r.status,401,'Spoofed identity must fail: '+path);
}
for(const path of ['/','/register','/conversations']){const r=await fetch(origin+path,{headers:auth});assert.equal(r.status,200,path);const html=await r.text();assert.ok(!html.includes('Private validation authentication required'));}
const register=await get('/api/register');assert.equal(register.status,200);assert.ok(register.body.total>=646);assert.ok(register.body.rows.length);assert.equal(register.body.connection.coreConfigured,false);assert.equal(register.body.connection.aiConfigured,false);
const accounts=await get('/api/operations?view=cash&source=chat');assert.equal(accounts.status,200);assert.equal(accounts.body.total,7038);assert.equal(accounts.body.canWrite,false);
const legacy=await get('/api/operations?source=review');assert.equal(legacy.status,200);assert.equal(legacy.body.total,4607);
const excel=await get('/api/operations?source=excel');assert.equal(excel.status,200);assert.equal(excel.body.total,1024);
const conversations=await get('/api/conversations?mode=historical');assert.equal(conversations.status,200);assert.ok(conversations.body.total>16000);assert.equal(conversations.body.read_only,true);
const policy=await get('/api/conversations');assert.equal(policy.status,200);assert.equal(policy.body.connection.configured,false);
assert.equal((await get('/api/conversations?phone=01712345678')).status,503);
assert.equal((await get('/api/register?source=live')).status,503);
for(const path of ['/api/register','/api/vessels','/api/core','/api/operations','/api/import-audit','/api/program-tools','/api/conversations'])for(const method of ['POST','PUT','PATCH','DELETE']){const r=await fetch(origin+path,{method,headers:{...auth,origin,'content-type':'application/json'},body:'{}'});assert.equal(r.status,405,method+' '+path);}
const ask=async(question,extra={},siteOrigin=origin)=>{const r=await fetch(origin+'/api/assistant',{method:'POST',headers:{...auth,origin:siteOrigin,'content-type':'application/json'},body:JSON.stringify({question,source:'historical',filters:{},...extra})});return {status:r.status,body:await r.json()};};
const answer=await ask('Summary of current filters');assert.equal(answer.status,200);assert.equal(answer.body.mode,'structured');assert.ok(answer.body.refs.length);
const cashAnswer=await ask('Summary of current accounts',{cashFilters:{source:'chat'}});assert.equal(cashAnswer.status,200);assert.equal(cashAnswer.body.mode,'structured-accounts');
assert.match((await ask('Approve and send all programs')).body.answer,/cannot approve/);
assert.equal((await ask('Summary',{},'https://untrusted.example.test')).status,403);
console.log('HTTP validation passed: private pages, spoofed-auth rejection, historical Register/Accounts/Conversations, deterministic assistant, disabled live integrations and all operational mutation methods.');
