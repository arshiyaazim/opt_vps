"""Accounts-only import. Keeps the vessel snapshot byte-for-byte unchanged.
Owner confirmation is bound to the exact export; it does not verify receipt of funds.
Every message/candidate is accounted for. Likely duplicate payments stay in review.
"""
from pathlib import Path
from collections import Counter,defaultdict
from decimal import Decimal,InvalidOperation
import os,argparse,hashlib,importlib.util,json,re
ROOT=Path(__file__).resolve().parents[1]
# Offline importer: output must be an explicitly selected new directory.

spec=importlib.util.spec_from_file_location('conversation_import',ROOT/'scripts/update_conversations.py')
base=importlib.util.module_from_spec(spec);spec.loader.exec_module(base)
PHONE=base.PHONE
METHOD=re.compile(r'\(\s*(B|N|C|R|BKASH|BIKASH|NAGAD|CASH|ROCKET|BANK)\s*\)|\b(BKASH|BIKASH|NAGAD|CASH|ROCKET|BANK)\b',re.I)
MONEY=re.compile(r'(?<![\w\d])([0-9]+(?:,[0-9]{3})*(?:\.[0-9]{1,2})?)\s*/(?:[-+](?!\d)|(?=\s*(?:$|\n|<)))')
EXPLICIT_AMOUNT=re.compile(r'(?:Amount|টাকা|পরিমাণ)\s*[:=-]\s*([\d,]+(?:\.\d{1,2})?)',re.I)
IDENTITY_KEYS=('confirmed','adminPhone','accountantContactConfirmed','conversationType','senderAlias','sourceSha256')
def normal_text(text):
 text=re.sub(r'[\u200b-\u200f\ufeff]','',text.translate(base.DIGITS))
 text=re.sub(r'^\s*\[\d{1,2}/\d{1,2}(?:/\d{2,4})?,\s*\d{1,2}:\d{2}\]\s*[^:]+:\s*','',text)
 text=re.sub(r'^\s*(?:\(\d{1,2}\)|\d{1,2}[.)])\s*','',text)
 text=re.sub(r'^(\s*(?:ID|আইডি))\s*[;:=\-]\s*',r'\1: ',text,flags=re.I)
 return text.strip()
def clean_name(text):
 text=text.strip(' \n,:;-=*')
 text=re.sub(r'(?:\b(?:Payout|Payment|Mobile|Number|Master)|নাম্বার)\s*[:=-]?\s*$','',text,flags=re.I).strip(' \n,:;-=*')
 return text

def parse_block(text):
 s=normal_text(text);phones=list(PHONE.finditer(s));method_match=METHOD.search(s)
 if len(phones)>2:return {'error':'More than two mobile occurrences; employee/payout roles need review'}
 method=({'b':'bkash','bkash':'bkash','bikash':'bkash','n':'nagad','nagad':'nagad','c':'cash','cash':'cash','r':'rocket','rocket':'rocket','bank':'bank'}.get((method_match[1] or method_match[2]).lower(),'unknown') if method_match else 'unknown')
 after=s[phones[-1].end():] if phones else s
 # Amounts must be written, never calculated from duty days/rates or repaired typos.
 explicit=list(EXPLICIT_AMOUNT.finditer(after));amounts=list(MONEY.finditer(after))
 method_tail=METHOD.search(after)
 direct=re.match(r'\s*[:=\-]?\s*([\d,]+(?:\.\d{1,2})?)(?![\d,.])',after[method_tail.end():]) if method_tail else None
 values=[x[1] for x in explicit] or [x[1] for x in amounts] or ([direct[1]] if direct else [])
 if not values:return {'error':'Payment amount is missing or malformed'}
 try:cents=[int(Decimal(v.replace(',',''))*100) for v in values]
 except InvalidOperation:return {'error':'Invalid amount'}
 if len(set(cents))!=1 or (direct and int(Decimal(direct[1].replace(',',''))*100)!=cents[0]):return {'error':'Conflicting written amounts; no amount was guessed'}
 if not 0<cents[0]<=100000000:return {'error':'Amount is outside the supported range'}
 employee='';payout='';name='';rule='';issues=[]
 if len(phones)==2:
  a,b=phones;prefix=s[:a.start()].strip();name=clean_name(s[a.end():b.start()])
  if prefix and not re.fullmatch(r'(?:ID|আইডি)\s*[:=-]?\s*',prefix,re.I):return {'error':'Employee ID position is ambiguous'}
  if re.search(r'(?:\bID|আইডি)\s*[:=-]',name,re.I):return {'error':'Conflicting ID labels'}
  employee=base.phone(a.group());payout=base.phone(b.group());rule='two_number_explicit_id' if prefix else 'two_number_before_name'
 elif len(phones)==1:
  a=phones[0];raw_name=s[:a.start()];name=clean_name(raw_name)
  if re.search(r'(?:\bID|আইডি)\s*[:=-]',raw_name,re.I):return {'error':'Incomplete explicit ID/name/payout structure; payout was not used as Employee ID'}
  employee=base.phone(a.group());rule='single_number_after_name';issues.append('Separate payout mobile was not provided')
 else:
  if method!='cash':return {'error':'No employee identity or explicit cash payment structure'}
  name=clean_name(s[:min([method_match.start()]+[x.start() for x in amounts])])
  if re.search(r'(?:\bID|আইডি)\s*[:=-]',name,re.I):name=clean_name(re.sub(r'^(?:ID|আইডি)\s*[:=-]\s*','',name,flags=re.I))
  rule='cash_missing_employee_id';issues.append('Employee ID was not provided; no employee was created or matched')
 if not name or not re.search(r'[A-Za-zঅ-য়]',name) or len(name)>120:return {'error':'Employee name is missing or ambiguous'}
 if phones and (not employee or len(phones)==2 and not payout):return {'error':'Invalid employee/payout mobile; source digits were not repaired'}
 if method=='unknown':issues.append('Payment method was not specified')
 if '<This message was edited>' in s:issues.append('Edited source message')
 return {'employeePhone':employee,'payoutPhone':payout,'name':name,'amountCents':cents[0],'method':method,'identityRule':rule,'issues':issues}

def candidate_line(line):
 s=normal_text(line)
 return bool(PHONE.search(s) or re.search(r'(?:\bID|আইডি)\s*[:=;\-]',s,re.I) or METHOD.search(s) or MONEY.search(s))
def cancellation(text):return bool(re.search(r'\bcancel(?:led|ed)?\b|পাঠাবেন না|পাঠিও না|টাকা.*বন্ধ|বাদ দিন',text,re.I))
def parse_message(message,proof):
 if not base.accounts_gate(message,proof):return [],[{'id':message['id']+'-identity','sourceMessageId':message['id'],'reason':'Conversation identity was not established; no Accounts parsing was run','kind':'identity'}]
 lines=message['body'].splitlines();rows=[];reviews=[];i=0;cash_heading=False
 while i<len(lines):
  line=normal_text(lines[i])
  if not line:i+=1;continue
  if re.fullmatch(r'Cash\s*[:=-]?',line,re.I):cash_heading=True;i+=1;continue
  if cash_heading and MONEY.search(line) and not METHOD.search(line):line+=' (Cash)'
  start=i;candidate=line;parsed=parse_block(candidate);end=i+1
  # Extend only unfinished blocks. Never swallow the next independently complete payment.
  if 'error' in parsed and not MONEY.search(line) and not (METHOD.search(line) and re.search(r'\d',line[ METHOD.search(line).end():])):
   if candidate_line(line) or (re.fullmatch(r'[A-Za-zঅ-য় .,_\-]{2,100}',line) and not re.search(r'জমা|টোটাল|total|balance|date',line,re.I)):
    for j in range(i+1,min(i+6,len(lines))):
     next_line=normal_text(lines[j])
     if not next_line:continue
     if re.match(r'^(?:ID|আইডি)\s*[:=;\-]',next_line,re.I):break
     candidate+='\n'+next_line;end=j+1;parsed=parse_block(candidate)
     if 'error' not in parsed or MONEY.search(next_line):break
  if 'error' not in parsed:
   if cancellation(message['body']):reviews.append({'id':message['id']+'-cancel-'+str(start),'sourceMessageId':message['id'],'reason':'Cancellation/revision language needs verification before including a payment','kind':'cancellation','candidate':parsed});i=end;continue
   row={**parsed,'id':'accounts-'+base.digest(message['id']+'|'+str(start)),'date':message['messageDate'],'time':message['time'],'source':'WhatsApp archive','sourceId':message['id'],'sourceLine':message['line']+start,'sender':message['sender'],'senderPhone':'01880446111','receiverIdentity':'Designated Accountant: Mamun Vai Bkash Nagod (owner-confirmed export)','category':'Employee payment instruction','status':'Admin payment instruction · receipt unverified','purpose':'','identityVerified':True,'identityProofKind':'Owner-confirmed source export'}
   rows.append(row);i=end
  else:
   if candidate_line(line):reviews.append({'id':message['id']+'-parse-'+str(start),'sourceMessageId':message['id'],'reason':parsed['error'],'kind':'parsing','sourceLine':message['line']+start})
   i+=1
 return rows,reviews

def reconcile_duplicates(rows):
 groups=defaultdict(list)
 for row in rows:
  identity=row['employeePhone'] or ('unverified-name:'+base.norm(row['name']))
  groups[(row['date'],identity,row['payoutPhone'],row['method'],row['amountCents'])].append(row)
 qualified=[];held=[];reviews=[];count=0
 for key,items in groups.items():
  if len(items)==1:qualified+=items;continue
  count+=1;gid='possible-repeat-'+base.digest('|'.join(map(str,key)))
  for row in items:
   row={**row,'duplicateGroup':gid};held.append(row)
   reviews.append({'id':row['id']+'-duplicate','sourceMessageId':row['sourceId'],'sourceLine':row['sourceLine'],'reason':'Possible repeated payment: same date, employee identity, payout mobile, method and amount. All '+str(len(items))+' candidates are held outside ledger totals until payment evidence distinguishes them.','kind':'duplicate','candidate':row,'relatedRecords':[r['id'] for r in items]})
 return qualified,held,reviews,count

def main():
 output_value=os.environ.get('ALRIFAI_IMPORT_OUTPUT_DIR')
 if not output_value:raise SystemExit('Set ALRIFAI_IMPORT_OUTPUT_DIR to a new offline output directory')
 output_dir=Path(output_value).resolve()
 evidence_dir=Path(os.environ.get('ALRIFAI_EVIDENCE_DIR','/var/lib/vps/al-rifai/evidence')).resolve()
 if output_dir==evidence_dir or evidence_dir in output_dir.parents:raise SystemExit('Runtime evidence is immutable')
 output_dir.mkdir(parents=True,exist_ok=False)
 ap=argparse.ArgumentParser();ap.add_argument('export');ap.add_argument('--identity-proof',required=True);args=ap.parse_args()
 proof=json.loads(Path(args.identity_proof).read_text());path=Path(args.export);ns=base.load_parser();messages,meta=base.parse_export(path,'mamun','direct','',ns)
 old=json.loads((Path(os.environ.get('ALRIFAI_EVIDENCE_DIR','/var/lib/vps/al-rifai/evidence'))/'conversation-snapshot.json').read_text());previous=next(f for f in old['summary']['files'] if f['key']=='mamun')
 # This accounts-only update reuses already preserved original envelopes, never touches maritime data.
 if meta['sha256']!=previous['sha256']:raise ValueError('This source differs from the retained export: preserve its original messages in a separate source snapshot before importing')
 if not any(base.accounts_gate(m,proof) for m in messages):raise ValueError('An explicit source-bound Admin-to-designated-Accountant identity attestation is required')
 rows=[];reviews=[];admin=[];accountant=[];other=[]
 for message in messages:
  if message['sender']=='Muradul Azim':
   admin.append(message['id']);a,b=parse_message(message,proof);rows+=a;reviews+=b
  elif message['sender']=='Mamun Vai Bkash Nagod':accountant.append(message['id'])
  else:other.append(message['id'])
 qualified,held,duplicates,groups=reconcile_duplicates(rows);reviews+=duplicates
 covered={r['sourceId'] for r in rows}|{r['sourceMessageId'] for r in reviews}
 non_transaction=[mid for mid in admin if mid not in covered]
 dataset_id='accounts-'+base.digest(meta['sha256']+hashlib.sha256(Path(__file__).read_bytes()).hexdigest()+json.dumps(proof,sort_keys=True))
 summary={'datasetId':dataset_id,'updatedAt':meta['last'],'importedAt':'2026-10-07','sourceSha256':meta['sha256'],'sourceFile':path.name,'sourceMessages':len(messages),'adminMessages':len(admin),'accountantMessagesExcluded':len(accountant),'otherMessagesExcluded':len(other),'accountsIdentityVerified':True,'accountsIdentityPendingMessages':0,'accountsQualifiedRows':len(qualified),'qualifiedAmountCents':sum(r['amountCents'] for r in qualified),'parsedCandidates':len(rows),'possibleDuplicateGroups':groups,'possibleDuplicateRows':len(held),'reviewItems':len(reviews),'reviewMessages':len({r['sourceMessageId'] for r in reviews}),'adminNonTransactionMessages':len(non_transaction),'employeeIds':len({r['employeePhone'] for r in qualified if r['employeePhone']}),'singleNumberRows':sum(r['identityRule']=='single_number_after_name' for r in qualified),'cashMissingIdentityRows':sum(not r['employeePhone'] for r in qualified),'identityProof':{k:proof[k] for k in IDENTITY_KEYS},'ownerConfirmation':'Owner identified the attached file as the Admin–Accountant conversation and instructed its import on 7 October 2026. This is source attestation, not transport identity or receipt verification.'}
 chunks=[]
 for kind,items in {'accountsCash':qualified,'accountsReviews':reviews,'accountsExcluded':non_transaction+accountant+other}.items():
  for i in range(0,len(items),750):
   payload=json.dumps(items[i:i+750],ensure_ascii=False,separators=(',',':'));assert len(payload.encode())<1900000
   chunks.append({'id':dataset_id+':'+kind+':'+str(i//750).zfill(5),'kind':kind,'payload':payload,'contentHash':hashlib.sha256(payload.encode()).hexdigest()})
 assert len({r['id'] for r in rows})==len(rows)
 assert len(qualified)+len(held)==len(rows)
 snapshot={'datasetId':dataset_id,'summary':summary,'chunks':chunks}
 (output_dir/'accounts-snapshot.json').write_text(json.dumps(snapshot,ensure_ascii=False,separators=(',',':')))
 (output_dir/'analysis').mkdir(parents=True,exist_ok=True)
 (output_dir/'analysis/accounts-import-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2))
 print(json.dumps({k:v for k,v in summary.items() if k not in ['identityProof','ownerConfirmation']},ensure_ascii=False,indent=2))
if __name__=='__main__':main()
