#!/usr/bin/env python3
"""Single local classification producer; no bridge client, sends or checkpoint resets."""
import sqlite3, pathlib, json, datetime as dt, tempfile, hashlib, os, subprocess, shutil, fcntl, re, argparse
START=dt.datetime(2026,6,30,18,tzinfo=dt.timezone.utc)
def stamp(value):
 try:
  d=dt.datetime.fromisoformat(value.replace('Z','+00:00'));return d.replace(tzinfo=dt.timezone.utc) if d.tzinfo is None else d.astimezone(dt.timezone.utc)
 except (ValueError,TypeError):return None
def collect(root,work,now):
 bundle={'snapshotAt':now.isoformat(),'requestedStart':START.isoformat(),'requestedEnd':'2026-10-17T00:00:00+06:00','accounts':[],'coverageLimits':['Local cache only; missing cache does not mean event never happened','SQLite snapshots are individually consistent; original pre-journal revisions may be unavailable']}
 for account in ['wa-01','wa-02']:
  src=pathlib.Path(root)/account/'store';out={'accountId':account,'namespace':str(src),'messages':[],'coverage':[],'invalidDates':0,'aliases':{},'monthlyRawRows':{}}
  for name in ['messages.db','whatsapp.db']:
   with sqlite3.connect((src/name).as_uri()+'?mode=ro',uri=True,timeout=15) as live,sqlite3.connect(work/(account+'-'+name)) as snap:
    live.execute('PRAGMA query_only=ON');live.backup(snap,pages=1024,sleep=.05)
  with sqlite3.connect(work/(account+'-whatsapp.db')) as d:
   d.row_factory=sqlite3.Row;devices=d.execute('SELECT jid FROM whatsmeow_device').fetchall()
   if len(devices)!=1:raise RuntimeError('PAIRED_ACCOUNT_MISSING_OR_AMBIGUOUS')
   out['pairedJid']=devices[0][0];out['aliases']={str(r['lid']):str(r['pn']) for r in d.execute('SELECT lid,pn FROM whatsmeow_lid_map')}
  with sqlite3.connect(work/(account+'-messages.db')) as d:
   d.row_factory=sqlite3.Row;chats={r['jid']:r['name'] for r in d.execute('SELECT jid,name FROM chats')};rows=list(d.execute('SELECT rowid,* FROM messages ORDER BY rowid'));byid={(r['chat_jid'],r['id']):r for r in rows};stats={}
   for r in rows:
    t=stamp(r['timestamp']);chat=r['chat_jid'];c=stats.setdefault(chat,{'chatJid':chat,'groupName':chats.get(chat),'rawRows':0,'inWindowRows':0,'earliest':None,'latest':None,'invalidDates':0})
    c['rawRows']+=1
    if t is None:c['invalidDates']+=1;out['invalidDates']+=1;continue
    iso=t.isoformat();c['earliest']=min(c['earliest'] or iso,iso);c['latest']=max(c['latest'] or iso,iso)
    if not START<=t<now:continue
    c['inWindowRows']+=1
    month=(t+dt.timedelta(hours=6)).strftime('%Y-%m');out['monthlyRawRows'][month]=out['monthlyRawRows'].get(month,0)+1
    sender=str(r['sender'] or '');rawsender=sender.split('@')[0];resolved=out['aliases'].get(rawsender);quote=byid.get((chat,r['quoted_message_id'])) if r['quoted_message_id'] else None
    media=[]
    if r['media_type']:
     media=[{'type':r['media_type'],'filename':r['filename'] or None,'available':False,'sha256':bytes(r['file_sha256']).hex() if isinstance(r['file_sha256'],bytes) else r['file_sha256'],'reason':'ORIGINAL_BYTES_NOT_IN_MESSAGE_PROJECTION'}]
    out['messages'].append({'accountId':account,'namespace':str(src/'messages.db'),'id':r['id'],'rowid':str(r['rowid']),'chatJid':chat,'groupName':chats.get(chat) if chat.endswith('@g.us') else None,'sender':sender,'senderPhoneTransport':resolved,'aliasProvenance':'whatsmeow_lid_map' if resolved else ('native_pn_namespace' if sender.endswith('@s.whatsapp.net') else 'stored_sender_projection'),'pairedJid':out['pairedJid'],'direction':'OUTGOING' if r['is_from_me'] else 'INCOMING','sourceTime':iso,'originalTimestamp':r['timestamp'],'text':r['content'] or '', 'projectionRow':True,'messageType':r['media_type'] or 'text','deletedAt':r['deleted_at'],'media':media,'quoted':{'id':quote['id'],'sender':quote['sender'],'direction':'OUTGOING' if quote['is_from_me'] else 'INCOMING','timestamp':quote['timestamp'],'text':quote['content'] or ''} if quote else ({'id':r['quoted_message_id'],'state':'NOT_CACHED'} if r['quoted_message_id'] else None)})
   # Preserve available journal revisions. Never reconstruct missing pre-journal originals.
   tables={r[0] for r in d.execute("SELECT name FROM sqlite_master WHERE type='table'")}
   out['nativeJournal']={'available':'native_events' in tables,'eventsInWindow':0,'kindsInWindow':{},'unprojectedOriginalKinds':{},'invalidNativeDates':0,'olderRevisions':'Not guaranteed before journal installation'}
   if 'native_events' in tables:
    projected={(m['chatJid'],m['id']):m for m in out['messages']}
    events=d.execute("SELECT event_seq,stream_id,message_id,original_chat_jid,original_sender_jid,kind,origin,source_time,payload_hash,header_json FROM native_events WHERE kind IN ('message','edit','revoke','undecryptable','unsupported') ORDER BY event_seq")
    for event in events:
     instant=stamp(event['source_time'])
     if instant is None:out['nativeJournal']['invalidNativeDates']+=1;continue
     if not START<=instant<now:continue
     out['nativeJournal']['eventsInWindow']+=1
     kind=event['kind'];out['nativeJournal']['kindsInWindow'][kind]=out['nativeJournal']['kindsInWindow'].get(kind,0)+1
     cov=stats.setdefault(event['original_chat_jid'],{'chatJid':event['original_chat_jid'],'groupName':chats.get(event['original_chat_jid']),'rawRows':0,'inWindowRows':0,'earliest':None,'latest':None,'invalidDates':0});cov.setdefault('nativeKinds',{});cov['nativeKinds'][kind]=cov['nativeKinds'].get(kind,0)+1
     try:header=json.loads(event['header_json'])
     except (ValueError,TypeError):continue
     content=header.get('content') or {};text=(content.get('text') or {}).get('value')
     if not isinstance(text,str):text=(content.get('caption') or {}).get('value')
     key=(event['original_chat_jid'],event['message_id']);existing=projected.get(key)
     pointer={'streamId':event['stream_id'],'sequence':str(event['event_seq']),'kind':event['kind'],'origin':event['origin'],'payloadHash':event['payload_hash'].hex() if isinstance(event['payload_hash'],bytes) else event['payload_hash'],'headerHash':hashlib.sha256(event['header_json'].encode()).hexdigest()}
     if existing and event['kind']=='message' and isinstance(text,str) and text==existing['text']:
      existing['nativeRevision']=pointer;existing['nativeSenderJid']=event['original_sender_jid'];continue
     if not existing:
      cov.setdefault('unprojectedNativeKinds',{});cov['unprojectedNativeKinds'][kind]=cov['unprojectedNativeKinds'].get(kind,0)+1;out['nativeJournal']['unprojectedOriginalKinds'][kind]=out['nativeJournal']['unprojectedOriginalKinds'].get(kind,0)+1
      continue  # Explicit coverage gap; no invented text or authority.
     revision=dict(existing);revision['projectionRow']=False;revision['nativeRevision']=pointer;revision['nativeSenderJid']=event['original_sender_jid'];revision['editObservedAt']=instant.isoformat();revision['messageType']=event['kind'];revision['text']=text if isinstance(text,str) else '';revision['bodyState']='ORIGINAL_NATIVE_TEXT' if isinstance(text,str) else 'ORIGINAL_CONTENT_NOT_AVAILABLE';revision['deletedAt']=instant.isoformat() if event['kind']=='revoke' else existing['deletedAt'];out['messages'].append(revision)
   out['coverage']=list(stats.values());out['snapshotSha256']=hashlib.sha256((work/(account+'-messages.db')).read_bytes()).hexdigest()
  bundle['accounts'].append(out)
 # Immutable archive inventory and row references; never add overlapping totals to live data.
 archives=[]
 evidence=pathlib.Path('/var/lib/vps/al-rifai/evidence')
 for filename in ['accounts-snapshot.json','conversation-snapshot.json','operations.json','chat-archive.json']:
  path=evidence/filename
  if not path.exists():continue
  data=json.loads(path.read_text());sha=hashlib.sha256(path.read_bytes()).hexdigest();sets={}
  if 'chunks' in data:
   for chunk in data['chunks']:
    payload=chunk['payload'];payload=json.loads(payload) if isinstance(payload,str) else payload
    if isinstance(payload,list):sets.setdefault(chunk['kind'],[]).extend(payload)
  else:
   for k in ['cash','excel','programs','messages','reviews','summaries','bills']:
    if isinstance(data.get(k),list):sets[k]=data[k]
  inventory={k:len(v) for k,v in sets.items()}
  for kind,records in sets.items():
   if kind not in ['accountsCash','cash','excel','programs']:continue
   archives.append({'file':filename,'sha256':sha,'kind':kind,'inventory':inventory,'records':records})
 bundle['archives']=archives
 return bundle
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--source-root',default='/var/lib/vps/whatsapp');p.add_argument('--output');p.add_argument('--worker-container',default='al-rifai-app-1');a=p.parse_args();os.umask(0o077)
 state=pathlib.Path('/var/lib/vps/al-rifai/reconciliation');state.mkdir(parents=True,exist_ok=True);state.chmod(0o700)
 with (state/'scanner.lock').open('w') as lock:
  fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
  work=pathlib.Path(tempfile.mkdtemp(prefix='.scan-',dir=state))
  try:
   now=dt.datetime.now(dt.timezone.utc);bundle=collect(a.source_root,work,now);payload=json.dumps(bundle,ensure_ascii=False).encode()
   if a.output:pathlib.Path(a.output).write_bytes(payload)
   else:
    r=subprocess.run(['docker','exec','-i',a.worker_container,'node','--experimental-strip-types','/app/scripts/reconcile-ingest.mjs'],input=payload,capture_output=True,timeout=900)
    if r.returncode:raise RuntimeError('INGEST_FAILED_PRIVATE_DIAGNOSTICS_SUPPRESSED')
    result=json.loads(r.stdout);(state/'last-success.json').write_text(json.dumps(result,indent=2));print(json.dumps(result))
  except Exception as e:
   (state/'last-failure.json').write_text(json.dumps({'at':dt.datetime.now(dt.timezone.utc).isoformat(),'error':str(e)}));raise
  finally:shutil.rmtree(work)
