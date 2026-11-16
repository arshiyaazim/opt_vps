import {PARSER,INITIAL_START,INITIAL_END,phone,hash,revisionIdentity,classify,parsePayments,parsePrograms,compareProgram,businessDay,inWindow,readEnvelope,caseStatusTally} from '../lib/reconciliation-core.mjs';
import {deriveEscortRegisterOps} from '../lib/escort-register.mjs';
import {createPool,databaseConfig} from '../db/postgres.mjs';
const input=await readEnvelope(process.stdin),snapshot=new Date(input.snapshotAt).toISOString();if(!Number.isFinite(Date.parse(snapshot))||Date.parse(snapshot)>Date.now()+60000)throw Error('SNAPSHOT_INVALID');
const dbConfig=databaseConfig({role:'review'});
const pool=createPool({role:'review',max:1,applicationName:'alrifai-reconciliation-producer'});
const c=await pool.connect();let hasLease=false,runStarted=false,cases=0,originals=0;const perDomain={},monthly={},runId=hash([PARSER,INITIAL_START,snapshot,input.accounts.map(a=>[a.accountId,a.snapshotSha256])]);
try{
 const identity=(await c.query('SELECT current_database() db,current_user role')).rows[0];if(identity.role!==dbConfig.user||identity.db!==dbConfig.database&&!/^alrifai_identity_qualification_[a-z0-9_]+$/.test(identity.db))throw Error('DATABASE_DENIED');
 const locked=(await c.query('SELECT pg_try_advisory_lock(1847461,16) ok')).rows[0].ok;if(!locked)throw Error('SINGLE_PRODUCER_ALREADY_RUNNING');hasLease=true;
 const registry=(await c.query("SELECT payload FROM identity_review_candidate.records WHERE collection='registry'")).rows.map(r=>r.payload),verified=registry.filter(r=>r.status==='VERIFIED');
 const relationships=verified.filter(r=>r.kind==='relationship'),bindings=verified.filter(r=>r.kind==='binding');
 const policies=(await c.query('SELECT * FROM public.reconciliation_policies WHERE active=true')).rows;
 const programs=(await c.query('SELECT * FROM public.programs')).rows;
 const refs=(await c.query('SELECT s.*,l.program_id,ci.id AS cash_id FROM public.source_refs s LEFT JOIN public.roster_source_links l ON l.source_ref=s.id LEFT JOIN public.cash_instructions ci ON ci.source_ref=s.id')).rows;
 await c.query('BEGIN');
 await c.query('INSERT INTO public.reconciliation_runs(id,snapshot_at,window_start,window_end,parser_version,snapshots,status) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(id) DO NOTHING',[runId,snapshot,INITIAL_START,snapshot,PARSER,JSON.stringify(input.accounts.map(a=>({account:a.accountId,sha256:a.snapshotSha256,namespace:a.namespace,nativeJournal:a.nativeJournal}))), 'SCANNING']);await c.query('COMMIT');runStarted=true;
 const blockedChats=new Set(),processingErrors=[];
 for(const pass of ['ACCOUNTS','ESCORT','RELEASE']){
  perDomain[pass]={scanned:0,candidates:0,newCases:0,exactLinked:0,pending:0};
  for(const account of input.accounts){
   if(account.accountId!=='wa-01'&&(pass==='ACCOUNTS'||pass==='ESCORT'))continue;
   const paired=phone(account.pairedJid.replace(/:\d+@/,'@'));
   const accountOwner=bindings.filter(b=>b.data.accountId===account.accountId&&b.data.purpose==='ACCOUNT_OWNER'&&phone(b.data.phone)===paired).map(b=>b.data.personId);
   const admins=accountOwner.filter(id=>relationships.some(r=>r.data.personId===id&&['ADMIN','SUPER_ADMIN'].includes(r.data.kind)));
   const subjectFor=chat=>{const b=bindings.filter(b=>b.data.accountId===account.accountId&&b.data.chatJid===chat&&b.data.direction==='INCOMING');const ids=[...new Set(b.map(x=>x.data.personId))];if(ids.length!==1)return null;const roles=relationships.filter(r=>r.data.personId===ids[0]).map(r=>r.data.kind);return {id:ids[0],bindings:b,domain:roles.includes('ACCOUNTANT')?'ACCOUNTS':roles.includes('CLIENT')?'ESCORT':null};};
   for(const coverage of account.coverage){const subject=subjectFor(coverage.chatJid);if((subject?.domain||pass)===pass)await c.query('INSERT INTO public.reconciliation_sources(id,run_id,account_id,chat_jid,domain,coverage) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(run_id,account_id,chat_jid,domain) DO UPDATE SET coverage=EXCLUDED.coverage',[hash([runId,account.accountId,coverage.chatJid,pass]),runId,account.accountId,coverage.chatJid,pass,JSON.stringify({...coverage,coverage:'PARTIAL_LOCAL_CACHE',upstreamComplete:false})]);}
   for(const m of account.messages){try{
    const subject=subjectFor(m.chatJid),group=m.chatJid.endsWith('@g.us'),domain=classify(m,group?null:subject?.domain);if(domain!==pass)continue;if(!inWindow(m.sourceTime,INITIAL_START,snapshot,snapshot))continue;
    perDomain[pass].scanned++;if(m.nativeSenderJid)m.aliasProvenance='original_native_sender_namespace';const actualSender=m.nativeSenderJid||m.sender;
    const peer=phone(m.chatJid)||phone(account.aliases[m.chatJid.split('@')[0]]),sender=phone(actualSender)||phone(account.aliases[String(actualSender).split('@')[0]])||phone(m.senderPhoneTransport),receiver=group?null:m.direction==='OUTGOING'?peer:paired;
    m.senderPhone=sender;m.receiverPhone=receiver;m.participantPhone=group?sender:null;m.month=businessDay(m.sourceTime)?.slice(0,7);m.forwarded='UNKNOWN';m.period=Date.parse(m.sourceTime)<Date.parse(INITIAL_END)?'INITIAL_JULY_TO_OCT16':'SUBSEQUENT_TAIL';
    const policy=policies.filter(p=>p.account_id===account.accountId&&p.chat_jid===m.chatJid&&p.domain===pass&&((Date.parse(p.valid_from)<=Date.parse(m.sourceTime)&&(!p.valid_until||Date.parse(m.sourceTime)<Date.parse(p.valid_until)))||(p.historical_from&&Date.parse(p.historical_from)<=Date.parse(m.sourceTime)&&Date.parse(m.sourceTime)<Date.parse(p.historical_until))));
    const boundAt=subject?.bindings.some(b=>Date.parse(b.data.validFrom)<=Date.parse(m.sourceTime)&&(!b.data.validTo||Date.parse(m.sourceTime)<Date.parse(b.data.validTo)));
    const roleAt=subject&&relationships.some(r=>r.data.personId===subject.id&&r.data.kind===(pass==='ACCOUNTS'?'ACCOUNTANT':'CLIENT')&&(!r.data.validFrom||Date.parse(r.data.validFrom)<=Date.parse(m.sourceTime))&&(!r.data.validTo||Date.parse(m.sourceTime)<Date.parse(r.data.validTo)));
    const directionOk=pass==='ACCOUNTS'?!group&&m.direction==='OUTGOING'&&admins.length===1&&subject?.domain==='ACCOUNTS':!group&&subject?.domain==='ESCORT';
    const explicit=policy.length===1&&(!policy[0].payload.sourceBound||policy[0].payload.sourceOriginalId===revisionIdentity(m))&&(!group||(policy[0].payload.allowedSenderPhones||[]).includes(sender));
    const cashDirection=pass!=='ACCOUNTS'||!group&&m.direction==='OUTGOING'&&admins.length===1&&sender===paired;const authorized=cashDirection&&(directionOk&&boundAt&&roleAt||explicit);
    const candidates=pass==='ACCOUNTS'?(authorized?parsePayments(m.text):[]):parsePrograms(m,pass);
    if(!candidates.length&&(subject?.domain===pass||group||/\d\s*\/-|\([BNCR]\)|escort|release|রিলিজ/i.test(m.text)))candidates.push({blockKey:'unparsed:0',fields:{},reasons:[pass==='ACCOUNTS'&&!authorized?'HISTORICAL_IDENTITY_AUTHORITY_REQUIRED':'PARSER_OR_INTENT_REVIEW']});
    if(!candidates.length)continue;
    const originalId=revisionIdentity(m);
    await c.query('BEGIN');
    const inserted=await c.query('INSERT INTO public.reconciliation_originals(id,account_id,chat_jid,message_id,revision_hash,source_time,original) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING RETURNING id',[originalId,account.accountId,m.chatJid,m.id,originalId,m.sourceTime,JSON.stringify(m)]);originals+=inserted.rowCount;
    for(const candidate of candidates){
     const id=hash([originalId,pass,candidate.blockKey]);let matches=[];const historyHash=hash({accountId:m.accountId,chatJid:m.chatJid,id:m.id,sender:m.sender,text:m.text,sourceTime:new Date(m.sourceTime).toISOString(),direction:m.direction,deletedAt:m.deletedAt??null});const nativeRefs=refs.filter(r=>r.scope_account===m.accountId&&r.chat_jid===m.chatJid&&r.message_id===m.id&&r.payload_hash===historyHash&&!m.deletedAt&&!m.media?.length);
     // Original source linkage plus block identity; similarity alone never proves replay.
     if(candidates.length===1&&nativeRefs.length===1)matches=nativeRefs.map(r=>({type:r.cash_id?'cash':r.program_id?'program':'source',id:r.cash_id||r.program_id||r.id,sourceRef:r.id,verifiedSource:true}));
     if(!matches.length&&pass!=='ACCOUNTS')matches=compareProgram(candidate.fields,programs);
     const prior=(await c.query('SELECT id FROM public.reconciliation_originals WHERE account_id=$1 AND chat_jid=$2 AND message_id=$3 AND id<>$4 LIMIT 1',[m.accountId,m.chatJid,m.id,originalId])).rows;
     let category=!authorized?'IDENTITY_AUTHORITY_UNRESOLVED':prior.length?'SOURCE_REVISION_CHANGED':matches.length>1?'MULTIPLE_MATCHES':matches.length===1&&matches[0].verifiedSource?'EXACT_SOURCE_MATCH':matches.length?'FIELDS_OR_EVIDENCE_REVIEW':'NO_BUSINESS_MATCH';
     if(pass==='RELEASE'&&(!candidate.fields.endDate||!candidate.fields.endShift||!candidate.fields.releasePoint))category='INCOMPLETE_RELEASE';
     const status=category==='EXACT_SOURCE_MATCH'&&authorized?'LINKED':'PENDING',proposal={fields:candidate.fields,reasons:[...new Set([...(candidate.reasons||[]),...(!authorized?['SOURCE_AUTHORITY_REQUIRES_OWNER_DECISION']:[]),...(group&&!explicit?['GROUP_POLICY_AND_ACTUAL_SENDER_REQUIRED']:[]),...(m.deletedAt?['SOURCE_REVOKED']:[])])],rawSpan:candidate.rawSpan||null,authority:{authorized,group,personId:subject?.id||null,policyId:explicit?policy[0].id:null,directionOk,pairedAccountVerified:admins.length===1},financialPosting:false,requestedAction:pass==='ACCOUNTS'?'REVIEW_INSTRUCTION':pass==='ESCORT'?'DRAFT_OR_CORRECTION':'DUTY_CLOSURE_REVIEW'};
     const result=await c.query('INSERT INTO public.reconciliation_cases(id,run_id,original_id,domain,block_key,category,proposal,matches,status) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(original_id,domain,block_key) DO NOTHING RETURNING id',[id,runId,originalId,pass,candidate.blockKey,category,JSON.stringify(proposal),JSON.stringify(matches),status]);cases+=result.rowCount;perDomain[pass].newCases+=result.rowCount;perDomain[pass].candidates++;const persistedStatus=result.rowCount?status:(await c.query('SELECT status FROM public.reconciliation_cases WHERE id=$1',[id])).rows[0].status,tally=caseStatusTally(persistedStatus);perDomain[pass].exactLinked+=tally.linked;perDomain[pass].pending+=tally.pending;perDomain[pass].decided=(perDomain[pass].decided||0)+tally.decided;
     if(result.rowCount&&status==='LINKED')await c.query('INSERT INTO public.reconciliation_links(id,case_id,target_type,target_id,actor_id) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING',[hash([id,matches[0].type,matches[0].id]),id,matches[0].type,matches[0].id,'VERIFIED_SOURCE_RECONCILIATION']);
     const month=m.month||'INVALID';monthly[month]??={};monthly[month][pass]??={candidates:0,pending:0,linked:0,amountMinor:'0'};const st=monthly[month][pass];st.candidates++;st.linked+=tally.linked;st.pending+=tally.pending;st.decided=(st.decided||0)+tally.decided;if(candidate.fields.amountMinor)st.amountMinor=(BigInt(st.amountMinor)+BigInt(candidate.fields.amountMinor)).toString();
    }
    if(!blockedChats.has(m.accountId+'|'+m.chatJid))await c.query('INSERT INTO public.reconciliation_progress(id,cursor) VALUES($1,$2) ON CONFLICT(id) DO UPDATE SET version=reconciliation_progress.version+1,cursor=EXCLUDED.cursor,updated_at=now()',[hash(['historical-reconciliation',m.accountId,m.chatJid]),JSON.stringify({runId,snapshot,processedRowid:m.rowid,originalId,liveCursorUntouched:true})]);await c.query('COMMIT');
   }catch(error){
    await c.query('ROLLBACK');const code=String(error.code||'PARSER_FAILURE');if(['08003','08006','57P01'].includes(code))throw error;
    const originalId=hash(['unprocessed-original',m]),caseId=hash(['processing-review',originalId]),chat=typeof m.chatJid==='string'&&!m.chatJid.includes('\u0000')?m.chatJid:'NAMESPACE_NOT_AVAILABLE',mid=typeof m.id==='string'&&!m.id.includes('\u0000')?m.id:'MESSAGE_ID_NOT_AVAILABLE:'+originalId;
    blockedChats.add(account.accountId+'|'+chat);processingErrors.push({caseId,account:account.accountId,error:code});
    const safeOriginal={accountId:account.accountId,chatJid:chat,id:m.id||null,namespace:account.namespace,sourceTime:Number.isFinite(Date.parse(m.sourceTime))?m.sourceTime:null,direction:m.direction||'UNKNOWN',text:'',bodyState:'PROCESSING_FAILED_ORIGINAL_ENCODED',originalEnvelopeBase64:Buffer.from(JSON.stringify(m),'utf8').toString('base64'),sourceHash:originalId,senderPhone:null,receiverPhone:null,media:[]};
    await c.query('BEGIN');await c.query('INSERT INTO public.reconciliation_originals(id,account_id,chat_jid,message_id,revision_hash,source_time,original) VALUES($1,$2,$3,$4,$1,$5,$6) ON CONFLICT DO NOTHING',[originalId,account.accountId,chat,mid,safeOriginal.sourceTime,JSON.stringify(safeOriginal)]);
    await c.query('INSERT INTO public.reconciliation_cases(id,run_id,original_id,domain,block_key,category,proposal,matches,status) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT DO NOTHING',[caseId,runId,originalId,'IDENTITY','processing-error','PROCESSING_FAILURE_RETRY_REQUIRED',JSON.stringify({fields:{},reasons:[code,'SOURCE_POSITION_HELD'],authority:{authorized:false},retry:'Repeat same snapshot after source/parser correction; no live cursor reset'}),'[]','CLARIFICATION']);
    await c.query('INSERT INTO public.reconciliation_progress(id,cursor) VALUES($1,$2) ON CONFLICT(id) DO UPDATE SET cursor=reconciliation_progress.cursor||EXCLUDED.cursor,version=reconciliation_progress.version+1,updated_at=now()',[hash(['historical-reconciliation',account.accountId,chat]),JSON.stringify({heldCase:caseId,heldAt:snapshot,runId})]);await c.query('COMMIT');
   }
   }
  }
 }
 // Additive vessel-register projection. The source remains the read-only bridge;
 // this projection never sends messages and never changes the canonical programs table.
 let escortRegister={available:false,operations:0,drafts:0,confirmed:0,review:0};
 try{
  const table=(await c.query("SELECT to_regclass('public.escort_order_register') AS name")).rows[0]?.name;
  if(table){
   const contacts=(await c.query("SELECT * FROM public.escort_client_contacts WHERE active=true AND account_id='wa-01'")).rows;
   const existing=(await c.query("SELECT * FROM public.escort_order_register WHERE account_id='wa-01'")).rows;
   const groupAuthorizations=(await c.query("SELECT * FROM public.escort_client_group_authorizations WHERE active=true AND account_id='wa-01'")).rows;
   const operations=[];
   for(const account of input.accounts.filter(value=>value.accountId==='wa-01')){
    operations.push(...deriveEscortRegisterOps(account,account.messages,contacts,
     existing.filter(r=>r.account_id===account.accountId),account.aliases||{},groupAuthorizations));
   }
   await c.query('BEGIN');
   for(const op of operations){
    if(op.kind==='DRAFT'||op.kind==='REVIEW'){
     const r=op.row;
     await c.query(`INSERT INTO public.escort_order_register
       (id,account_id,client_contact_id,client_phone,chat_jid,source_message_id,source_hash,block_key,source_time,
        mother_vessel,lighter_vessel,master_mobile,cargo,capacity,importer,destination,booking_date,escort_name,
        escort_mobile,duty_date,shift,release_point,status,reasons,parsed,source_text,business_key)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24::jsonb,$25::jsonb,$26,$27)
       ON CONFLICT DO NOTHING`,[
      r.id,r.accountId,r.clientContactId,r.clientPhone,r.chatJid,r.sourceMessageId,r.sourceHash,r.blockKey,r.sourceTime,
      r.motherVessel,r.lighterVessel,r.masterMobile,r.cargo,r.capacity,r.importer,r.destination,r.bookingDate,r.escortName,
      r.escortMobile,r.dutyDate,r.shift,r.releasePoint,r.status,JSON.stringify(r.reasons),JSON.stringify(r.parsed),r.sourceText,r.businessKey]);
     await c.query(`INSERT INTO public.escort_order_sources
       (account_id,source_hash,block_key,order_id,client_contact_id,source_message_id,chat_jid,source_time,provenance)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb) ON CONFLICT(account_id,source_hash,block_key) DO NOTHING`,[
      r.accountId,r.sourceHash,r.blockKey,r.id,r.clientContactId,r.sourceMessageId,r.chatJid,r.sourceTime,
      JSON.stringify(op.event.payload.source)]);
    }else if(op.kind==='CONFIRM'){
     throw Error('VESSEL_CONFIRMATION_REQUIRES_SEPARATE_OWNER_REVIEW');
    }
    await c.query(`INSERT INTO public.escort_order_events(id,order_id,event_type,source_message_id,source_hash,payload)
      VALUES($1,$2,$3,$4,$5,$6::jsonb) ON CONFLICT(order_id,event_type,source_hash) DO NOTHING`,[
      op.event.id,op.event.orderId,op.event.eventType,op.event.sourceMessageId,op.event.sourceHash,JSON.stringify(op.event.payload)]);
   }
   await c.query('COMMIT');
   escortRegister={available:true,operations:operations.length,drafts:operations.filter(x=>x.kind==='DRAFT').length,confirmed:operations.filter(x=>x.kind==='CONFIRM').length,review:operations.filter(x=>x.kind==='REVIEW').length};
  }
 }catch(error){
  await c.query('ROLLBACK').catch(()=>{});
  // Do not break the established reconciliation producer if this additive
  // projection is absent or temporarily incompatible; the next cycle retries.
  if(error?.code!=='42P01')throw error;
 }

 // Preserve archive scopes and references. Absence from a partial cache never deletes history.
 const archiveInventory=[];let historyOnly=0;
 const cachedTexts=new Map();for(const a of input.accounts)for(const m of a.messages){const k=hash(m.text);cachedTexts.set(k,(cachedTexts.get(k)||0)+1);}
 for(const dataset of input.archives||[]){
  archiveInventory.push({file:dataset.file,sha256:dataset.sha256,kind:dataset.kind,rows:dataset.records.length,inventory:dataset.inventory,overlap:'NOT_ADDED_TO_LIVE_TOTALS'});
  const domain=['accountsCash','cash','excel'].includes(dataset.kind)?'ACCOUNTS':'ESCORT';
  for(let i=0;i<dataset.records.length;i++){
   const record=dataset.records[i],rawDate=record.sourceMessageDate||record.messageDate||record.details?.sourceMessageDate||null,date=typeof rawDate==='string'&&/^20[0-9]{2}-[0-9]{2}-[0-9]{2}$/.test(rawDate)?rawDate:null;
   if(date&&/^20[0-9]{2}-[0-9]{2}-[0-9]{2}$/.test(date)&&(date<'2026-07-01'||date>businessDay(snapshot)))continue;
   const text=record.sourceText||record.body||record.text||'',possible=text?cachedTexts.get(hash(text))||0:0;
   const identity=[dataset.file,dataset.sha256,dataset.kind,String(record.id||i)],id=hash(['archive-case',identity]),oid=hash(['archive-original',identity,record]);
   const fields=domain==='ACCOUNTS'?{employeeMobile:phone(record.employeePhone||record.employeeMobile),payoutMobile:phone(record.payoutPhone||record.payoutMobile),employeeName:record.name||record.employeeName,amountMinor:record.amountCents!==undefined?String(record.amountCents):record.amountMinor||null,method:record.method,date:record.date}:{...record};
   for(const k of ['cargo','capacity','registration','bookingDate','slipNumber'])delete fields[k];
   const original={channel:'ARCHIVE',accountId:'ARCHIVE',namespace:dataset.file,id:String(record.id||i),datasetSha256:dataset.sha256,datasetKind:dataset.kind,rowIndex:i,sourceTime:date?date+'T00:00:00+06:00':null,sourceTimePrecision:date?'DAY_ONLY':'UNKNOWN',text,archiveRecord:record,sender:record.sender||null,senderPhone:null,receiverPhone:null,participantPhone:null,direction:'UNKNOWN',messageType:'ARCHIVE_RECORD',media:[],quoted:null};
   await c.query('BEGIN');
   await c.query('INSERT INTO public.reconciliation_originals(id,account_id,chat_jid,message_id,revision_hash,source_time,original) VALUES($1,$2,$3,$4,$1,$5,$6) ON CONFLICT DO NOTHING',[oid,'ARCHIVE',dataset.file+':'+dataset.kind,String(record.id||i),original.sourceTime,JSON.stringify(original)]);
   const created=await c.query('INSERT INTO public.reconciliation_cases(id,run_id,original_id,domain,block_key,category,proposal,matches) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING RETURNING id',[id,runId,oid,domain,'archive:'+i,possible?'POSSIBLE_ARCHIVE_SOURCE_MATCH':'HISTORY_ONLY_NO_CACHED_SOURCE',JSON.stringify({fields,authority:{authorized:false},reasons:['ARCHIVE_NOT_LIVE','SOURCE_IDENTITY_AND_OVERLAP_REVIEW_REQUIRED',...(!date?['ORIGINAL_SOURCE_DATE_UNKNOWN']:[])],archiveReference:identity,possibleTextMatches:possible,financialPosting:false}),'[]']);
   historyOnly+=created.rowCount;await c.query('COMMIT');
  }
 }
 const summary={runId,snapshotAt:snapshot,requestedStart:INITIAL_START,requestedEnd:INITIAL_END,actualCutoff:snapshot,initialActualCutoff:new Date(Math.min(Date.parse(snapshot),Date.parse(INITIAL_END))).toISOString(),tailStart:Date.parse(snapshot)>Date.parse(INITIAL_END)?INITIAL_END:null,passOrder:['ACCOUNTS','ESCORT','RELEASE'],perDomain,monthly,archiveInventory,escortRegister,newHistoryCases:historyOnly,processingErrors,heldProgressChats:blockedChats.size,newCases:cases,newOriginals:originals,canonicalBusinessWrites:0,postings:0,closures:0,liveCursorReset:false,coverage:'PARTIAL_CACHED_HISTORY',accounts:input.accounts.map(a=>({account:a.accountId,rawWindowRows:a.coverage.reduce((n,r)=>n+r.inWindowRows,0),uniqueSourceMessages:new Set(a.messages.map(m=>m.chatJid+'|'+m.id)).size,availableSourceEnvelopes:a.messages.length,chats:a.coverage.length,invalidDates:a.invalidDates,monthlyRawRows:a.monthlyRawRows||a.messages.filter(m=>!['edit','revoke','undecryptable','unsupported','message'].includes(m.messageType)).reduce((v,m)=>{const month=businessDay(m.sourceTime)?.slice(0,7)||'INVALID';v[month]=(v[month]||0)+1;return v;},{})}))};
 await c.query("UPDATE public.reconciliation_runs SET status=$3,summary=$2 WHERE id=$1",[runId,JSON.stringify(summary),processingErrors.length?'FAILED':'REVIEW_READY']);console.log(JSON.stringify(summary));
} catch(e){await c.query('ROLLBACK').catch(()=>{});if(hasLease&&runStarted)await c.query("UPDATE public.reconciliation_runs SET status='FAILED',summary=jsonb_build_object('errorCode',$2::text,'retryRequired',true) WHERE id=$1",[runId,String(e.code||'PROCESSING_FAILED')]).catch(()=>{});throw Error('RECONCILIATION_FAILED:'+e.code+':'+e.message);}finally{if(hasLease)await c.query('SELECT pg_advisory_unlock(1847461,16)').catch(()=>{});c.release();await pool.end();}
