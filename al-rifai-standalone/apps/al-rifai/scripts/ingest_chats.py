"""Extract source-backed maritime records; preserve ambiguous text and never infer fleet identity/status."""
import os,re,json,hashlib,sys,collections,datetime
from pathlib import Path
DIGITS=str.maketrans('০১২৩৪৫৬৭৮৯','0123456789')
PHONE=re.compile(r'(?:\+?880[ -]?)?0?1[3-9](?:[ -]?\d){8}\b')
DATE=re.compile(r'(?<!\d)(\d{1,2})[./-](\d{1,2})[./-](\d{4}|\d{2})(?!\d)')
KEYS={
 'mother vessel':'motherVessel','vessel name':'motherVessel','mather vessel':'motherVessel','mathera vessel':'motherVessel','mathers vessel':'motherVessel','name off mother vessel':'motherVessel','vessel':'motherVessel',
 'lighter vessel':'lighterVessel','lighters vessel':'lighterVessel','name of lighter vessel':'lighterVessel','righter vessel':'lighterVessel','lighter':'lighterVessel','lighetr':'lighterVessel','lighter name':'lighterVessel',
 'master mobile':'masterMobile','master mobile no':'masterMobile','master number':'masterMobile','master nmbr':'masterMobile','mst mob':'masterMobile','m mobile':'masterMobile','m - mobile':'masterMobile',
 'escort name':'escortName','name of escort':'escortName','escort':'escortName','escort number':'escortMobile','escort mobile':'escortMobile','escort mobile no':'escortMobile',
 'destination':'destination','dest':'destination','start date':'startDate','date of start':'startDate','shift':'shift','start dete':'startDate','start':'startDate','date':'date',
 'end date':'endDate','time':'shift','a/c':'client','ac':'client','importer':'client','cargo':'cargo','capacity':'capacity','cap':'capacity',
 'quantity':'quantity','booking dt':'bookingDate','b/l quan':'billOfLading','b/l':'billOfLading','loading point':'loadingPoint','loading place':'loadingPoint',
 'release point':'releasePoint','relace date':'releaseDate','release date':'releaseDate','ghat':'location','place':'location',
 'master':'masterName','master name':'masterName','mastar name':'masterName','phone':'masterMobile','mobile':'mobile','mob':'masterMobile',
 'owner':'owner','flag':'flag','vessel type':'vesselType','status':'status',
 'hold no':'hold','cargo hold':'hold','along side':'alongside','alongside':'alongside','load commence':'loadCommence','load completed':'loadCompleted','loading from':'loadingPoint',
}
CORE=['motherVessel','lighterVessel','masterMobile','destination','escortName','escortMobile','startDate','endDate','shift','status','source','notes']
EXTRA=['loadingPoint','releasePoint','releaseDate','location','masterName','owner','flag','vesselType','vesselState','alongside','loadCommence','loadCompleted']
def clean(s):return re.sub(r'^[\s*_:#=,-]+|[\s*_,;]+$','',s.strip()).strip()
def canonphone(s):
 s=s.translate(DIGITS);m=PHONE.search(s)
 if not m:return clean(s)
 n=re.sub(r'\D','',m.group());return '0'+n[3:] if n.startswith('880') else n

def date(s):
 m=DATE.search(s.translate(DIGITS))
 if not m:return ''
 d,mo,y=map(int,m.groups());y=y+2000 if y<100 else y
 try:return datetime.date(y,mo,d).isoformat()
 except ValueError:return ''
def shift(s):
 m=re.search(r'\(\s*(D|N|Day|Night)\s*\)|\b(Day|Night)\b|(?:\d\s*)([DN])\s*$',s,re.I)
 return ('D' if next(v for v in m.groups() if v).lower().startswith('d') else 'N') if m else ''
def numbered_line(s):return re.match(r'^\s*(?:\(\d{1,2}\)[.)]?|\d{1,2}[.)])\s*(?!\s*\d)',s.strip('* '))
def names(s):return clean(re.sub(r'^\s*(?:\(\d{1,2}\)[.)]?|\d{1,2}[.)])\s*','',s.strip('* ')))
def kv(line):
 line=re.sub(r'^\(?\d{1,2}\)?\s*[-.)]\s*','',line.strip().strip('*_★ '))
 for key in sorted(KEYS,key=len,reverse=True):
  m=re.match(re.escape(key)+r'\s*[:=.\-]+\s*(.*)$',line,re.I)
  if m:return KEYS[key],clean(m[1])
 return None

def parse_messages(path,code):
 msgs=[]
 for n,line in enumerate(path.read_text(encoding='utf-8-sig').splitlines(),1):
  m=re.match(r'^(\d{1,2}/\d{1,2}/\d{4}), (\d{1,2}:\d{2}) - (.*)$',line)
  if m:
   parts=m[3].split(': ',1);sender=parts[0] if len(parts)==2 else '';body=parts[1] if sender else m[3]
   msgs.append(dict(id=f'{code}-{n}',source=path.name,messageDate=date(m[1]),time=m[2],sender=sender,body=body,line=n,category='Other',mediaNames=[],sensitiveExcluded=False))
  elif msgs:msgs[-1]['body']+='\n'+line
 for m in msgs:
  b=m['body'];m['mediaNames']=re.findall(r'\b(?:IMG|PTT|VID|AUD|DOC)[-\w]+\.(?:jpg|jpeg|png|opus|mp4|pdf)',b,re.I)
  if 'pcc.police.gov.bd' in b or ('"owner"' in b and '"data"' in b and 'http' in b):
   m['body']='[Unrelated sensitive credential content excluded from the maritime register. Original attachment was not changed.]';m['category']='Excluded';m['sensitiveExcluded']=True
  elif 'This message was deleted' in b or 'You deleted this message' in b:m['category']='Deleted'
  elif '<Media omitted>' in b or '(file attached)' in b:m['category']='Media'
 return msgs

def common(lines):
 p={};issues=[]
 for i,line in enumerate(lines):
  item=kv(line)
  if not item:continue
  k,v=item
  if not v and k in ['lighterVessel','motherVessel','startDate','endDate','masterName','escortName','escortMobile','masterMobile']:
   if i+1<len(lines) and not kv(lines[i+1]) and not re.match(r'^\(?\d{1,2}\)?[.)]',lines[i+1]):v=clean(lines[i+1])
  if v and k not in ['mobile','date']:p[k]=v
 if 'masterMobile' not in p:
  for line in lines:
   item=kv(line)
   if item and item[0]=='mobile':p['masterMobile']=item[1]
 return p

def record(msg,values,index,kind,raw):
 p={k:'' for k in CORE};p.update({k:clean(str(v)) for k,v in values.items() if k in CORE});details={k:clean(str(v)) for k,v in values.items() if k in EXTRA};issues=[]
 if re.search(r'\bMobile\s*:',p['escortName'],re.I):
  n=re.split(r'\bMobile\s*:',p['escortName'],flags=re.I);p['escortName']=clean(n[0]);p['escortMobile']=p['escortMobile'] or clean(n[1])
 if p['masterMobile']=='' and details.get('masterName') and PHONE.fullmatch(details['masterName'].translate(DIGITS).strip()):
  p['masterMobile']=details.pop('masterName')
 for key in ['masterMobile','escortMobile']:
  p[key]=canonphone(p[key]) if p[key] else ''
  if p[key] and not re.fullmatch(r'01[3-9]\d{8}',p[key]):issues.append('Invalid phone format: '+key)
  if len(PHONE.findall(str(values.get(key,''))))>1:issues.append('Multiple phone numbers: '+key)
 for key in ['startDate','endDate']:
  original=p[key];p[key]=date(original)
  if original and not p[key]:issues.append('Unrecognized date: '+key)
  if key=='startDate':p['shift']=shift(original) or p['shift']
 if p['shift']:p['shift']=shift(p['shift']) or (p['shift'].upper() if p['shift'].upper() in ['D','N'] else '')
 if not p['startDate'] and kind=='Escort program':
  ds=[line for line in raw.splitlines() if DATE.search(line.translate(DIGITS)) and not kv(line)]
  if ds:p['startDate']=date(ds[-1]);p['shift']=p['shift'] or shift(ds[-1])
 for k in ['bookingDate','releaseDate']:
  if details.get(k):details[k]=date(details[k]) or details[k]
 if re.search(r'escort[ -]*change',msg['body'],re.I):p['status']='Escort change'
 elif re.search(r'canc(?:el|le|le[d])',raw,re.I) and not '?' in raw:p['status']='Cancelled'
 elif re.search(r'\breleased\b|\brelease date\b',raw,re.I):p['status']='Released'
 elif p['status'].lower()=='completed':p['status']='Completed'
 else:p['status']='Recorded'
 if p['endDate'] and p['startDate'] and p['endDate']<p['startDate']:issues.append('End date precedes start date')
 if p['startDate']:
  delta=(datetime.date.fromisoformat(p['startDate'])-datetime.date.fromisoformat(msg['messageDate'])).days
  if delta>7 or delta < -90:issues.append('Program date differs substantially from message date')
 if p['destination'] and re.search(r'\bname\s*:',p['destination'],re.I):issues.append('Destination contains an ambiguous name; original text retained');p['destination']=''
 # Remove adjacent metadata from a vessel label; the original message remains intact.
 for key in ['motherVessel','lighterVessel']:
  p[key]=re.sub(r'^Mother Vessel\s*','',names(p[key]),flags=re.I);p[key]=re.split(r',?\s*(?:CAPACITY|PHONE|CARGO|COMMODITY)\s*[:=]',p[key],flags=re.I)[0].strip(' *,')
  if key=='motherVessel':p[key]=re.split(r'[,/]',p[key])[0].strip(' *$')
  pm=PHONE.search(p[key])
  if pm and key=='lighterVessel':
   if not p['masterMobile']:p['masterMobile']=canonphone(pm.group())
   p[key]=p[key][:pm.start()].strip(' -,')
 if not p['lighterVessel'] or not re.search(r'[A-Za-zঅ-য়]',p['lighterVessel']):return None
 if len(p['lighterVessel'])>180 or re.search(r'https?://|Escort Name|মেসেজ|প্রোগ্রাম|ক্যান্সেল',p['lighterVessel'],re.I):return None
 details.update(recordKind=kind,sourceMessageId=msg['id'],sourceMessageDate=msg['messageDate'],sourceLine=str(msg['line']),sender=msg['sender'],issues=issues)
 p.update(id=f"{msg['id']}-p{index}",source=msg['source'],notes='Source text retained in the source-message viewer.',duplicateOf=None,createdAt=msg['messageDate']+'T'+msg['time']+':00',revision=0,details=details)
 return p

def parse_programs(msg):
 body=msg['body'];lines=[l.strip() for l in body.splitlines() if l.strip()];results=[]
 if msg['sensitiveExcluded'] or not lines:return results
 # Source messages with labels can contain multiple complete program blocks.
 explicit=re.split(r'(?im)(?=^\s*(?:mother vessel|mather vessel|vessel)\s*:)',body)
 if re.search(r'(?im)^\s*(?:mother vessel|mather vessel|vessel)\s*:',body):
  for part in explicit:
   if not re.search(r'(?im)^\s*(?:mother vessel|mather vessel|vessel)\s*:',part):continue
   ls=[l.strip() for l in part.splitlines() if l.strip()];v=common(ls)
   if v.get('lighterVessel') and re.search(r'^\(?\d{1,2}\)?[.)]',v['lighterVessel']):v['lighterVessel']=names(v['lighterVessel'])
   if v.get('lighterVessel'):
    kind='Escort program' if v.get('escortName') or v.get('escortMobile') else 'Vessel reference'
    r=record(msg,v,len(results)+1,kind,part)
    if r:results.append(r)
  if results:return results
 # Numbered rows are either bookings or escort assignments. Staff lists are not vessels.
 numbered=[i for i,l in enumerate(lines) if numbered_line(l)]
 escort=bool(re.search(r'escort\s*(?:name|number|mobile)\s*[:.\-]',body,re.I))
 ship_lines=[(i,l) for i,l in enumerate(lines) if re.match(r'^\s*(?:M\.?\s*V\.?\s*[:.]?|MV\b)',l.strip('*$ '),re.I) and not kv(l)]
 mother=''
 # Most forwarded bookings put the mother vessel after an At-O/A/Kutubdia marker.
 for i,l in enumerate(lines):
  if re.match(r'^At[- :]',l,re.I) and i+1<len(lines):mother=lines[i+1];break
 if not mother and ship_lines:
  before=[l for i,l in ship_lines if not numbered or i<numbered[0]]
  if before:mother=before[0].strip('*$ ')
  elif numbered and lines and len(lines[0])<100 and not kv(lines[0]) and not numbered_line(lines[0]) and not re.match('Dear|Lighter',lines[0],re.I):mother=lines[0]
  elif not escort:mother=ship_lines[-1][1]
 if not mother and escort and lines and not kv(lines[0]):mother=lines[0]
 shared=common(lines);shared.pop('lighterVessel',None);shared.pop('escortName',None);shared.pop('escortMobile',None);shared.pop('masterMobile',None)
 if mother:shared['motherVessel']=clean(mother.split('/')[0])
 if not shared.get('startDate') and escort:
  ds=[l for l in lines if DATE.search(l.translate(DIGITS)) and not kv(l)]
  if ds:shared['startDate']=ds[-1];shared['shift']=shift(ds[-1])
 for n,start in enumerate(numbered):
  end=numbered[n+1] if n+1<len(numbered) else len(lines);block=lines[start:end];v={**shared,**common(block)}
  first=names(block[0]);first=first or (block.pop(1) if len(block)>1 and not kv(block[1]) else '');first=re.sub(r'^(?:MV\s*:?)\s*','MV ',first,flags=re.I)
  if not mother and not shared.get('motherVessel') and not escort:continue
  if not escort and not (PHONE.search('\n'.join(block)) or re.search('capacity|\bcap\b', '\n'.join(block),re.I)):continue
  phone=PHONE.search(first)
  if phone:
   v['lighterVessel']=clean(first[:phone.start()]);v['masterMobile']=phone.group();tail=clean(first[phone.end():])
   cap=re.search(r'(\d[\d,]*(?:\.\d+)?)\s*m\.?\s*[t/]|(\d{3,5})\s*$',tail,re.I)
   if cap:v['capacity']=cap.group().strip();tail=clean(tail[:cap.start()])
   if tail and len(tail)<70:v['destination']=tail
  else:
   v['lighterVessel']=clean(re.split(r',\s*(?:capacity|cap)\s*:|/\d{3,5}\s*M',first,flags=re.I)[0])
   if not v.get('masterMobile'):
    for line in block[1:]:
     pm=PHONE.search(line)
     if pm and not kv(line):v['masterMobile']=pm.group();break
  # A/C is a client, never owner. Preserve unlabeled destination text before A/C.
  for line in block:
   ac=re.search(r'\bA/c\s*[.:=-]?\s*(.+)',line,re.I)
   if ac:
    v['client']=clean(ac[1]);prefix=clean(line[:ac.start()])
    if prefix and len(prefix)<55 and not re.search('vessel|capacity|cargo',prefix,re.I):v['destination']=prefix
  r=record(msg,v,len(results)+1,'Escort program' if escort else 'Vessel reference','\n'.join(block))
  if r:results.append(r)
 if results:return results
 # Unnumbered escort assignments have a mother title, lighter title and explicit escort labels.
 if escort:
  v={**shared,**common(lines)}
  if not v.get('lighterVessel'):
   candidates=[]
   for l in lines:
    if kv(l) or DATE.search(l.translate(DIGITS)) or re.search(r'escort[ -]*change|al.?aqsa|al.?rifa|force|service|^cancel|^missing',l,re.I):continue
    if l==mother:continue
    if re.match(r'^(?:\+?880)?0?1[3-9][\d -]{8,}$',l):continue
    if len(l)<120:candidates.append(l)
   if candidates:
    first=candidates[0];pm=PHONE.search(first);v['lighterVessel']=clean(first[:pm.start()]) if pm else first
    if pm:v['masterMobile']=pm.group()
  r=record(msg,v,1,'Escort program',body)
  if r:results.append(r)
 # Unnumbered labeled bookings: clear lighter/master/capacity fields only.
 elif any(kv(l) and kv(l)[0]=='lighterVessel' for l in lines):
  v=common(lines);r=record(msg,v,1,'Vessel reference',body)
  if r:results.append(r)
 if not results and not escort:
  shared=common(lines)
  if mother:shared['motherVessel']=mother
  if shared.get('lighterVessel'):
   r=record(msg,shared,1,'Vessel reference',body)
   if r:results.append(r)
  elif shared.get('masterMobile') or shared.get('masterName'):
   starts=[i for i,l in ship_lines if l.strip('*$ ')!=mother and not re.match(r'^At[- :]',l,re.I)]
   if not starts and mother and lines[0].strip('*$ ')==mother and len(lines)>1 and not kv(lines[1]):starts=[1]
   for j,start in enumerate(starts):
    block=lines[start:starts[j+1] if j+1<len(starts) else len(lines)]
    v={**shared,**common(block),'lighterVessel':lines[start].strip('*$ ')}
    for l in block:
     if re.search(r'\bto\b',l,re.I) and len(l)<60:v['destination']=l
    r=record(msg,v,len(results)+1,'Vessel reference','\n'.join(block))
    if r:results.append(r)
 return results

def entries(msg):
 if msg['sensitiveExcluded']:return []
 out=[]
 for i,line in enumerate(msg['body'].splitlines()):
  match=re.search(r'\b(?:ID|D)\s*:?\s*(0?1[3-9]\d{8})\s+(.+)',line.translate(DIGITS),re.I)
  if not match:continue
  employee=match[1];rest=match[2];phones=list(PHONE.finditer(rest));pay=phones[-1] if phones else None
  name=clean(rest[:pay.start()]) if pay else clean(re.split(r'\([BN]\)',rest)[0]);tail=rest[pay.end():] if pay else ''
  method=re.search(r'\(?\s*([BN])\s*\)?',tail,re.I);amount=re.search(r'(?:\([BN]\)|\)\s*\([BN]\))\s*[-:\s]*([\d,]+)(?:\s*/?-|\s*$)',tail,re.I)
  amt=int(amount[1].replace(',','')) if amount else None
  issue=[]
  if amt is None:issue.append('Amount not available')
  if pay and len(re.sub(r'\D','',pay.group())) not in [11,13]:issue.append('Payment phone needs verification')
  if 'Correction' in msg['body'] or 'correction' in msg['body']:issue.append('Correction message; do not double count with the earlier entry')
  out.append(dict(id=msg['id']+'-e'+str(i),kind='Payment record',employeeId=employee,name=name,paymentNumber=canonphone(pay.group()) if pay else '',method=method[1].upper() if method else '',amount=amt,location='',vessel='',date=msg['messageDate'],sourceMessageId=msg['id'],source=msg['source'],issues=issue,description=msg['body']))
 if not out and re.search(r'\breleased\b|\brelease(?:d)?\s+(?:from|ghat)|escort.*(?:relace|release)',msg['body'],re.I):
  out.append(dict(id=msg['id']+'-r',kind='Release note',employeeId='',name='',paymentNumber='',method='',amount=None,location='',vessel='',date=msg['messageDate'],sourceMessageId=msg['id'],source=msg['source'],issues=['Named vessel or escort may be unavailable; source text is authoritative'],description=msg['body']))
 return out

root=Path(sys.argv[1]);allmsgs=[];metadata=[]
output_value=os.environ.get('ALRIFAI_IMPORT_OUTPUT_DIR')
if not output_value:raise SystemExit('Set ALRIFAI_IMPORT_OUTPUT_DIR to a new offline output directory')
output_dir=Path(output_value).resolve()
evidence_dir=Path(os.environ.get('ALRIFAI_EVIDENCE_DIR','/var/lib/vps/al-rifai/evidence')).resolve()
if output_dir==evidence_dir or evidence_dir in output_dir.parents:raise SystemExit('Runtime evidence is immutable')
output_dir.mkdir(parents=True,exist_ok=False)
(output_dir/'analysis').mkdir()

for filename,code in [('WhatsApp Chat with Escort Hridoy.txt','hr'),('WhatsApp Chat with Escort Release Slip.txt','rs')]:
 path=root/filename;msgs=parse_messages(path,code);allmsgs+=msgs;metadata.append(dict(file=filename,messages=len(msgs),first=msgs[0]['messageDate'],last=msgs[-1]['messageDate'],sha256=hashlib.sha256(path.read_bytes()).hexdigest(),mediaReferences=sum(bool(m['mediaNames'] or '<Media omitted>' in m['body']) for m in msgs),deleted=sum(m['category']=='Deleted' for m in msgs),sensitiveExcluded=sum(m['sensitiveExcluded'] for m in msgs)))
programs=[];release=[]
for m in allmsgs:
 ps=parse_programs(m);es=entries(m);programs+=ps;release+=es
 if ps:m['category']='Programs'
 elif es:m['category']='Release / payment'
 elif re.search(r'cancel|change|release|capacity|cargo|food|khab|bill|bkash|nagad|conven|ভাড়া|খাবার|ঘাট|জাহাজ',m['body'],re.I) and m['category']=='Other':m['category']='Operational note'
# Payment relationships are candidates only. Preserve different amounts and absent values.
bykey=collections.defaultdict(list)
for e in release:
 if e['employeeId']:bykey[(e['date'],e['employeeId'],e['paymentNumber'])].append(e)
for group in bykey.values():
 if len({e['amount'] for e in group if e['amount'] is not None})>1:
  for e in group:e['issues'].append('Different amounts for the same employee/payment number/date; verify original correction')
summary=dict(files=metadata,totalMessages=len(allmsgs),programRows=len(programs),recordKinds=dict(collections.Counter(p['details']['recordKind'] for p in programs)),releaseEntries=len(release),entryKinds=dict(collections.Counter(e['kind'] for e in release)),sourceCategories=dict(collections.Counter(m['category'] for m in allmsgs)),programIssues=dict(collections.Counter(i for p in programs for i in p['details']['issues'])),fieldCoverage={k:sum(bool(p.get(k) or p['details'].get(k)) for p in programs) for k in CORE+EXTRA})
manual=[m['id'] for m in allmsgs if m['category']=='Operational note' and re.search(r'mv[ .:]|mother vessel|escort name',m['body'],re.I)]
summary['manualMaritimeMessageIds']=manual
output={'summary':summary,'messages':allmsgs,'programs':programs,'entries':release}
(output_dir/'chat-archive.json').write_text(json.dumps(output,ensure_ascii=False,separators=(',',':')),encoding='utf8')
print(json.dumps(summary,ensure_ascii=False,indent=2))
# Only safe vessel snippets; unrelated credential blocks are already excluded.
unparsed=[m for m in allmsgs if m['category']=='Operational note' and re.search(r'mv[ .:]|mother vessel|escort name',m['body'],re.I)]
(output_dir/'analysis/unparsed.json').write_text(json.dumps(unparsed,ensure_ascii=False,indent=2))
print('Unparsed vessel-related messages:',len(unparsed));print('Archive bytes:',(output_dir/'chat-archive.json').stat().st_size)
