"""Reproducible, loss-accounted import of owner-supplied WhatsApp exports.
Raw evidence is retained. Business projections link repeated documents; no canonical
VPS ledger is written. Accounts parsing requires an explicit identity attestation.
"""
from pathlib import Path
from collections import Counter,defaultdict
from datetime import date as Date
import os,argparse,copy,hashlib,json,re
ROOT=Path(__file__).resolve().parents[1]
# Offline importer: output must be an explicitly selected new directory.

DIGITS=str.maketrans('০১২৩৪৫৬৭৮৯','0123456789')
PHONE=re.compile(r'(?<!\d)(?:\+?880[\s-]*)?0?1[3-9](?:[\s-]*\d){8}(?!\d)')
SOURCES=[('office','Office group','group','libfile_b84cc53df84c81919c4f1a3d1815cd4c'),('hr','Escort Hridoy','direct','libfile_c32f673c344881919d88a7ff84b9140f'),('rs','Escort Release Slip','group','libfile_f8fd001da5e08191885a122dd9af60f1'),('mamun','Mamun Vai Bkash Nagod','direct','libfile_1c9f5314e15c81918f874f255620d64b')]
def digest(v):return hashlib.sha256(v.encode()).hexdigest()[:24]
def norm(v):return re.sub(r'[^\w]','',re.sub(r'\bm\.?\s*v\.?\s*','',str(v).translate(DIGITS).lower()))
def phone(v):
    s=re.sub(r'[\u200b-\u200f\ufeff]','',str(v)).translate(DIGITS)
    n=re.sub(r'[\s+()-]','',s)
    if n.startswith('880'):n='0'+n[3:]
    return n if re.fullmatch(r'01[3-9]\d{8}',n) else ''
def data(name):return json.loads((ROOT/'data'/name).read_text())
def message_signature(m):return digest('|'.join(str(m.get(k,'')) for k in ['messageDate','time','sender','body']))
def load_parser():
    ns={};s=(ROOT/'scripts/ingest_chats.py').read_text().split('root=Path(sys.argv[1]);')[0]
    exec(compile(s,'maritime-parser','exec'),ns)
    ns['KEYS'].update({'completion date':'endDate','completed date':'endDate','completion/end date':'endDate','end shift':'endShift','completion shift':'endShift','relace date':'endDate','release date':'endDate','relase date':'endDate','relese date':'endDate','joint date':'startDate','join date':'startDate','r.point':'releasePoint','relace point':'releasePoint','release place':'releasePoint','escort mobile number':'escortMobile','master mobile number':'masterMobile'})
    original=ns['record']
    def record(m,v,i,kind,raw):
        p=original(m,v,i,kind,raw)
        if not p:return None
        # Preserve the entire source mother label; old parser truncated at / or comma.
        if v.get('motherVessel'):p['motherVessel']=ns['clean'](v['motherVessel'])
        d=p['details']
        for field in ['masterMobile','escortMobile']:
            raw_phone=p.get(field,'');normalized=phone(raw_phone)
            if raw_phone and not normalized:d.setdefault('rawPhones',{})[field]=raw_phone;p[field]=''
            elif normalized:p[field]=normalized
        d['endShift']=ns['shift'](str(v.get('endDate',''))) or str(v.get('endShift','')).upper()
        if d['endShift'] not in ['D','N']:d['endShift']=''
        d['documentKind']='accounts_voucher' if re.search(r'voucher|ভাউচার',raw,re.I) else 'release_note' if re.search(r'release|relace|রিলিজ',raw,re.I) else 'assignment_text'
        d['releaseConfirmed']=False
        d['sourceSha256']=m['sourceSha256'];d['sourceChat']=m['chatKey']
        p['details']=d;return p
    ns['record']=record
    return ns

def parse_export(path,key,kind,library_id,ns):
    sha=hashlib.sha256(path.read_bytes()).hexdigest();msgs=ns['parse_messages'](path,key);occ=Counter()
    for m in msgs:
        sig=message_signature(m);occ[sig]+=1;m['legacyId']=m['id'];m['id']='wa-'+digest(key+'|'+sig+'|'+str(occ[sig]))
        m.update(chatKey=key,conversationType=kind,sourceSha256=sha,libraryFileId=library_id,senderPhone='',receiverPhone='')
    return msgs,{'key':key,'file':path.name,'sha256':sha,'messages':len(msgs),'first':min(m['messageDate'] for m in msgs),'last':max(m['messageDate'] for m in msgs),'mediaMessages':sum('<Media omitted>' in m['body'] or bool(m['mediaNames']) for m in msgs),'deleted':sum(m['category']=='Deleted' for m in msgs),'redacted':sum(m['sensitiveExcluded'] for m in msgs),'libraryFileId':library_id}

def accounts_gate(m,proof):
    return bool(proof and proof.get('confirmed') is True and proof.get('adminPhone')=='01880446111' and proof.get('accountantContactConfirmed') is True and proof.get('conversationType')=='direct' and proof.get('senderAlias')=='Muradul Azim' and proof.get('sourceSha256')==m.get('sourceSha256') and m.get('chatKey')=='mamun' and m.get('conversationType')=='direct' and m.get('sender')=='Muradul Azim')

def parse_employee_block(text):
    """Positional roles only: payout is never an employee-identity fallback with two occurrences."""
    s=re.sub(r'[\u200b-\u200f\ufeff]','',text.translate(DIGITS));matches=list(PHONE.finditer(s))
    if not 1<=len(matches)<=2:return {'error':'Expected one or two employee-block mobile occurrences'}
    tail=s[matches[-1].end():]
    methods=re.search(r'\(?\s*(bkash|bikash|nagad|rocket|cash|bank|[BNCR])\s*\)?\s*[:=-]?\s*([\d,]+(?:\.\d{1,2})?)\s*(?:/[-+]?|/-|$)',tail,re.I)
    explicit_amount=re.search(r'(?:Amount|টাকা|পরিমাণ)\s*[:=-]\s*([\d,]+(?:\.\d{1,2})?)',tail,re.I)
    if not methods and not explicit_amount:return {'error':'Payment amount not established'}
    name='';eid='';payout='';rule='';a=matches[0]
    if len(matches)==2:
        b=matches[1];before=s[:a.start()];between=s[a.end():b.start()]
        name=re.sub(r'(?i)\b(?:payout|payment|mobile|number)\s*[:=-]?\s*$','',between).strip(' \n,:;-')
        if not name or not re.search(r'[A-Za-zঅ-য়]',name):return {'error':'Employee name between identity and payout numbers is not established'}
        if re.search(r'(?:\bID|আইডি)\s*[:=-]',name,re.I):return {'error':'Conflicting employee identity labels'}
        if before.strip() and not re.fullmatch(r'\s*(?:ID|আইডি|D)\s*[:=-]?\s*',before,re.I):return {'error':'Two-number employee identity position is ambiguous'}
        eid=phone(a.group());payout=phone(b.group());rule='two_number_explicit_id' if before.strip() else 'two_number_before_name'
    else:
        name=s[:a.start()].strip(' \n,:;-');
        if re.search(r'(?:\bID|আইডি)\s*[:=-]',name,re.I):return {'error':'Explicit employee ID is invalid or ambiguous; payout cannot replace it'}
        name=re.sub(r'(?i)\b(?:ID|আইডি|payout|payment|mobile)\s*[:=-]?\s*$','',name).strip()
        if not name or not re.search(r'[A-Za-zঅ-য়]',name):return {'error':'Single mobile is not preceded by an employee name'}
        eid=phone(a.group());rule='single_number_after_name'
    if not eid:return {'error':'Invalid employee identity phone'}
    method={'b':'bkash','bkash':'bkash','bikash':'bkash','n':'nagad','nagad':'nagad','c':'cash','cash':'cash','r':'rocket','rocket':'rocket','bank':'bank'}.get(methods[1].lower(),'unknown') if methods else 'unknown'
    amount=round(float((methods[2] if methods else explicit_amount[1]).replace(',',''))*100)
    if not 0<amount<=100000000:return {'error':'Amount out of supported range'}
    return dict(employeePhone=eid,payoutPhone=payout,name=name,amountCents=amount,method=method,identityRule=rule,phoneOccurrences=[{'start':x.start(),'end':x.end(),'raw':x.group()} for x in matches])

def parse_accounts(m,proof,parser=parse_employee_block):
    if not accounts_gate(m,proof):return [],[{'id':m['id']+'-identity','date':m['messageDate'],'time':m['time'],'sender':m['sender'],'body':m['body'],'line':m['line'],'reason':'Conversation identity is unverified; no Accounts parser or employee creation was run.','sourceMessageId':m['id']}]
    rows=[];reviews=[];lines=m['body'].splitlines();used=set()
    for i,line in enumerate(lines):
        if i in used:continue
        # Supported single-line records; explicit multi-line ID/name/payout/amount blocks.
        if not PHONE.search(line.translate(DIGITS)):continue
        candidate=line
        if not re.search(r'\([BNCR]\)|(?:bkash|nagad|amount)',line,re.I):
            candidate='\n'.join(lines[i:i+5])
        p=parser(candidate)
        if 'error' in p:
            reviews.append({'id':m['id']+'-review-'+str(i),'date':m['messageDate'],'time':m['time'],'sender':m['sender'],'body':m['body'],'line':m['line'],'reason':p['error'],'sourceMessageId':m['id']});continue
        if '\n' in candidate:used.update(range(i,min(i+5,len(lines))))
        rows.append({**p,'id':'cash-'+digest(m['id']+'|'+str(i)),'date':m['messageDate'],'time':m['time'],'source':'WhatsApp archive','sourceId':m['id'],'sourceLine':m['line'],'sourceText':m['body'],'sender':m['sender'],'senderPhone':'01880446111','receiverIdentity':'Owner-confirmed designated Accountant','category':'Employee payment instruction','status':'Instruction; payment receipt unverified','purpose':'','issues':[],'identityVerified':True,'identityProofKind':'owner-confirmed export'})
    return rows,reviews

def reconcile(records):
    """Retain every evidence row; one projection for explicit identical duty identity."""
    groups=[];byphone={};bynames=defaultdict(list);links={};conflicts=[]
    fields=['motherVessel','lighterVessel','escortName','escortMobile','masterMobile','destination','startDate','shift','endDate']
    for p in records:
        d=p.get('details',{});p=copy.deepcopy(p);d=p.setdefault('details',{})
        if p.get('source')=='Escort workbook · SanMarineTCIS' and p.get('destination')==d.get('releasePoint'):
            d['legacyMisprojectedDestination']=p['destination'];p['destination']=''
        for field in ['masterMobile','escortMobile']:
            raw=p.get(field,'');normalized=phone(raw)
            if raw and not normalized:d.setdefault('rawPhones',{})[field]=raw;p[field]=''
            elif normalized:p[field]=normalized
        if d.get('recordKind')=='Vessel reference':continue
        key=(phone(p.get('masterMobile','')),phone(p.get('escortMobile','')),p.get('startDate',''))
        strict=all(key);namekey=(norm(p.get('lighterVessel','')),phone(p.get('escortMobile','')) or norm(p.get('escortName','')),p.get('startDate',''),p.get('shift',''))
        exact=tuple(norm(p.get(f,'')) for f in fields)
        idx=byphone.get(key) if strict else None;reason='Validated master + escort + duty date' if idx is not None else ''
        if idx is None and all(namekey):
            compatible=[]
            for j in bynames[namekey]:
                g=groups[j]
                # No conflicting nonblank phone or mother/name values. Missing-master match stays labelled.
                if all(not p.get(f) or not g.get(f) or norm(p[f])==norm(g[f]) for f in ['masterMobile','escortMobile','motherVessel','escortName']):compatible.append(j)
            if len(compatible)==1:idx=compatible[0];reason='Same explicit lighter/escort/start date/shift; compatible source fields'
        if idx is None:
            idx=len(groups);p['evidence']=[{'id':p['id'],'source':p.get('source',''),'sourceRef':d.get('sourceMessageId',''),'sourceLine':str(d.get('sourceLine','')),'reason':'Original source'}];p['aliases']=[p['id']];p['conflicts']=[];groups.append(p)
        else:
            g=groups[idx];g['evidence'].append({'id':p['id'],'source':p.get('source',''),'sourceRef':d.get('sourceMessageId',''),'sourceLine':str(d.get('sourceLine','')),'reason':reason});g['aliases'].append(p['id']);links[p['id']]=g['id']
            for f in fields:
                value=p.get(f,'')
                if value and g.get(f) and norm(value)!=norm(g[f]):
                    conflict={'field':f,'existing':g[f],'incoming':value,'sourceRow':p['id']};g['conflicts'].append(conflict);conflicts.append({'programId':g['id'],**conflict})
                elif value and not g.get(f):g[f]=value
            for f in ['endShift','releasePoint']:
                value=d.get(f,'');existing=g['details'].get(f,'')
                if value and existing and norm(value)!=norm(existing):
                    conflict={'field':f,'existing':existing,'incoming':value,'sourceRow':p['id']};g['conflicts'].append(conflict);conflicts.append({'programId':g['id'],**conflict})
                elif value and not existing:g['details'][f]=value
        if strict:byphone[key]=idx
        if all(namekey) and idx not in bynames[namekey]:bynames[namekey].append(idx)
    for g in groups:
        d=g['details'];d['releaseConfirmed']=False
        if d.get('releasePoint') and re.search(r'cancel|escort.?change|ship unloaded|^—$',str(d['releasePoint']),re.I):d['releasePoint']=''
        if g.get('endDate') and g.get('startDate') and g['endDate']<g['startDate']:g['conflicts'].append({'field':'dateOrder','existing':g['startDate'],'incoming':g['endDate'],'sourceRow':g['id']})
        issues=list(d.get('issues',[]))
        if g['conflicts']:issues.append('Conflicting source fields require review; no values were silently overwritten.')
        if g.get('endDate') and (not d.get('endShift') or not d.get('releasePoint')):issues.append('Completion requires an explicit end shift and release point.')
        if re.search('released|completed',g.get('status',''),re.I):d['sourceStatus']=g['status'];g['status']='Release review'
        if any('differs substantially' in i for i in issues):d['sourceStatus']=g['status'];g['status']='Date review'
        d['issues']=list(dict.fromkeys(issues));g['duplicateOf']=None
    return groups,links,conflicts

def main():
    output_value=os.environ.get('ALRIFAI_IMPORT_OUTPUT_DIR')
    if not output_value:raise SystemExit('Set ALRIFAI_IMPORT_OUTPUT_DIR to a new offline output directory')
    output_dir=Path(output_value).resolve()
    evidence_dir=Path(os.environ.get('ALRIFAI_EVIDENCE_DIR','/var/lib/vps/al-rifai/evidence')).resolve()
    if output_dir==evidence_dir or evidence_dir in output_dir.parents:raise SystemExit('Runtime evidence is immutable')
    output_dir.mkdir(parents=True,exist_ok=False)
    ap=argparse.ArgumentParser();ap.add_argument('upload_dir');ap.add_argument('--identity-proof');args=ap.parse_args();ns=load_parser()
    proof=json.loads(Path(args.identity_proof).read_text()) if args.identity_proof else None
    messages=[];files=[];new=[];maritimeReviews=[]
    for key,tag,kind,lid in SOURCES:
        paths=[p for p in Path(args.upload_dir).glob('*.txt') if tag in p.name]
        if len(paths)!=1:raise ValueError('Expected exactly one source for '+tag)
        msgs,meta=parse_export(paths[0],key,kind,lid,ns);files.append(meta);messages+=msgs
        if key=='mamun':continue
        for m in msgs:
            ps=ns['parse_programs'](m);new+=ps
            if ps:m['category']='Programs'
            elif re.search(r'escort|lighter|mother vessel|release|relace|এস্কর্ট|রিলিজ|জাহাজ|start date',m['body'],re.I):
                m['category']='Needs review';maritimeReviews.append({'id':m['id'],'date':m['messageDate'],'source':m['source'],'reason':'Media or operational text has no complete structured program; original retained.'})
    old=data('chat-archive.json');ops=data('operations.json')
    # Original evidence is retained even when later exports edit a message.
    baseline=[*old['programs'],*ops['programs']]
    # Five manually recovered baseline programs exist in lib/seed.ts and D1; runtime overlays them separately.
    programs,links,conflicts=reconcile([*baseline,*new])
    cash=[];accountReviews=[];accountMsgs=[m for m in messages if m['chatKey']=='mamun']
    for m in accountMsgs:
        if m['sender']!='Muradul Azim':continue
        rows,reviews=parse_accounts(m,proof);cash+=rows;accountReviews+=reviews
    summary={'updatedAt':max(f['last'] for f in files),'datasetId':'conversations-'+digest('|'.join(f['sha256'] for f in files)+hashlib.sha256(Path(__file__).read_bytes()).hexdigest()+(json.dumps(proof,sort_keys=True) if proof else 'identity-pending')),'files':files,'totalMessages':len(messages),'sourceProgramEvidence':sum(p.get('details',{}).get('recordKind')!='Vessel reference' for p in new),'programs':len(programs),'linkedExtraEvidence':sum(len(p['evidence'])-1 for p in programs),'conflictPrograms':sum(bool(p['conflicts']) for p in programs),'maritimeReviews':len(maritimeReviews),'unavailableMediaMessages':sum(f['mediaMessages'] for f in files),'accountsIdentityVerified':any(accounts_gate(m,proof) for m in accountMsgs),'accountsQualifiedRows':len(cash),'accountsIdentityPendingMessages':sum(r['reason'].startswith('Conversation identity') for r in accountReviews),'accountantMessagesExcluded':sum(m['sender']=='Mamun Vai Bkash Nagod' for m in accountMsgs),'programMissing':{f:sum(not p.get(f) for p in programs) for f in ['masterMobile','escortMobile','startDate']}}
    out={'summary':summary,'messages':messages,'programs':programs,'programEvidence':new,'links':links,'conflicts':conflicts,'maritimeReviews':maritimeReviews,'cash':cash,'accountReviews':accountReviews,'accountantNotes':[m for m in accountMsgs if m['sender']=='Mamun Vai Bkash Nagod'],'identityProof':proof}
    # Deterministic byte output: a repeat of this command produces the same dataset and IDs.
    # Store references instead of repeated private message bodies.
    out['accountReviews']=[{'id':r['id'],'sourceMessageId':r['sourceMessageId'],**({'reasonCode':'identity_pending'} if not proof else {'reason':r['reason']})} for r in accountReviews]
    out['accountantNotes']=[m['id'] for m in out['accountantNotes']]
    for m in messages:
        for key in ['sourceSha256','libraryFileId','legacyId','senderPhone','receiverPhone','source']:m.pop(key,None)
    (output_dir/'analysis').mkdir(parents=True,exist_ok=True)
    (output_dir/'analysis/updated-conversations.json').write_text(json.dumps(out,ensure_ascii=False,separators=(',',':')))
    chunks=[]
    sections={k:v for k,v in out.items() if isinstance(v,list)}
    sections['messages']=[m for m in messages if m['chatKey']!='mamun']
    sections['accountMessages']=[m for m in messages if m['chatKey']=='mamun']
    sections['links']=[{'alias':a,'id':b} for a,b in links.items()]
    for kind,items in sections.items():
        for i in range(0,len(items),1000):
            payload=json.dumps(items[i:i+1000],ensure_ascii=False,separators=(',',':'))
            if len(payload.encode())>1900000:raise ValueError('Source chunk exceeds D1 row limit; adjust chunking explicitly')
            chunks.append({'id':summary['datasetId']+':'+kind+':'+str(i//1000).zfill(5),'kind':kind,'payload':payload,'contentHash':hashlib.sha256(payload.encode()).hexdigest()})
    snapshot={'datasetId':summary['datasetId'],'summary':summary,'chunks':chunks}
    (output_dir/'conversation-snapshot.json').write_text(json.dumps(snapshot,ensure_ascii=False,separators=(',',':')))
    print(json.dumps(summary,ensure_ascii=False,indent=2))
if __name__=='__main__':main()
