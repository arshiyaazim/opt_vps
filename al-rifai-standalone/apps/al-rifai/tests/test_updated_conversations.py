import tempfile
import unittest,importlib.util,json,hashlib,subprocess,sys,collections,os
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
EVIDENCE=Path(os.environ.get("ALRIFAI_EVIDENCE_DIR","/var/lib/vps/al-rifai/evidence"))
spec=importlib.util.spec_from_file_location('updated',ROOT/'scripts/update_conversations.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
def snapshot_data():
 snapshot=json.loads((EVIDENCE/'conversation-snapshot.json').read_text());out={'summary':snapshot['summary']}
 for c in snapshot['chunks']:
  key='messages' if c['kind']=='accountMessages' else c['kind'];out.setdefault(key,[]).extend(json.loads(c['payload']))
 return out
class UpdatedConversationTests(unittest.TestCase):
 def message(self,**changes):return {'id':'synthetic','messageDate':'2026-10-06','time':'12:00','sender':'Muradul Azim','chatKey':'mamun','conversationType':'direct','sourceSha256':'synthetic-hash','line':1,'body':'Rahim\n01812345678 (B) 5000/-',**changes}
 def proof(self):return {'confirmed':True,'adminPhone':'01880446111','accountantContactConfirmed':True,'conversationType':'direct','senderAlias':'Muradul Azim','sourceSha256':'synthetic-hash'}
 def test_identity_gate_precedes_parser(self):
  calls=[]
  for message,proof in [(self.message(),None),(self.message(sender='Mamun Vai Bkash Nagod'),self.proof()),(self.message(sender='Other sender'),self.proof()),(self.message(conversationType='group'),self.proof()),(self.message(chatKey='office'),self.proof()),(self.message(sourceSha256='wrong-export'),self.proof()),(self.message(),{**self.proof(),'accountantContactConfirmed':False}),(self.message(),{**self.proof(),'adminPhone':'01700000000'})]:
   rows,_=m.parse_accounts(message,proof,lambda t:calls.append(t));self.assertEqual(rows,[])
  self.assertEqual(calls,[])
 def test_gate_positive_requires_bound_identity(self):self.assertTrue(m.accounts_gate(self.message(),self.proof()))
 def test_document_kind_uses_document_text_not_phone(self):
  ns=m.load_parser();msg={**self.message(), 'source':'Synthetic maritime source'}
  values={'motherVessel':'Fixture Mother','lighterVessel':'Fixture Lighter','masterMobile':'01712345678','escortMobile':'01812345678','startDate':'01.10.2026 D'}
  for text,kind in [('Office voucher','accounts_voucher'),('Escort release note','release_note'),('Escort assignment','assignment_text')]:
   row=ns['record'](msg,values,1,'Escort program',text);self.assertEqual(row['details']['documentKind'],kind)
 def test_two_number_explicit_id(self):
  r=m.parse_employee_block('ID: 01812345678\nRahim Uddin\nPayout: 01712345678\nAmount: 5,000');self.assertEqual(r['employeePhone'],'01812345678');self.assertEqual(r['payoutPhone'],'01712345678');self.assertEqual(r['amountCents'],500000)
 def test_two_number_before_name(self):
  r=m.parse_employee_block('01812345678 Rahim Uddin 01712345678 (B) 5000/-');self.assertEqual(r['employeePhone'],'01812345678');self.assertEqual(r['payoutPhone'],'01712345678')
 def test_single_number_after_name(self):
  r=m.parse_employee_block('Rahim Uddin\n01812345678\nAmount: 5,000');self.assertEqual(r['employeePhone'],'01812345678');self.assertEqual(r['payoutPhone'],'')
 def test_same_number_two_roles(self):
  r=m.parse_employee_block('ID: 01812345678 Rahim 01812345678 (N) 500/-');self.assertEqual(r['identityRule'],'two_number_explicit_id');self.assertEqual(len(r['phoneOccurrences']),2)
 def test_no_unrelated_identity_guess(self):
  for text in ['01712345678 (B) 500/-','Rahim 01812345678 Other 01712345678 (B) 500/-','ID: 0171234 Rahim 01712345678 (B) 500/-']:
   self.assertIn('error',m.parse_employee_block(text))
 def row(self,**changes):return {'id':'assignment','masterMobile':'01712345678','escortMobile':'01812345678','lighterVessel':'Fixture Boat','motherVessel':'Fixture Mother','escortName':'Fixture Escort','startDate':'2026-10-01','endDate':'','shift':'D','destination':'Rupshi','status':'Recorded','source':'Fixture','details':{'recordKind':'Escort program','sourceMessageId':'fixture-1'},**changes}
 def test_different_message_documents_one_program(self):
  rows,links,_=m.reconcile([self.row(),self.row(id='voucher',details={'recordKind':'Escort program','sourceMessageId':'fixture-2'})]);self.assertEqual(len(rows),1);self.assertEqual(len(rows[0]['evidence']),2);self.assertEqual(links['voucher'],'assignment')
 def test_conflicting_shift_not_second_program(self):
  rows,_,conflicts=m.reconcile([self.row(),self.row(id='release',shift='N')]);self.assertEqual(len(rows),1);self.assertTrue(conflicts);self.assertEqual(rows[0]['shift'],'D')
 def test_missing_phones_not_matching_key(self):
  rows,_,_=m.reconcile([self.row(masterMobile='',escortMobile='',escortName='',startDate=''),self.row(id='other',masterMobile='',escortMobile='',escortName='',startDate='')]);self.assertEqual(len(rows),2)
 def test_release_point_cancel_not_location(self):
  rows,_,_=m.reconcile([self.row(endDate='2026-10-03',details={'recordKind':'Escort program','releasePoint':'Cancel','endShift':'N'})]);self.assertEqual(rows[0]['details']['releasePoint'],'');self.assertFalse(rows[0]['details']['releaseConfirmed'])
 def test_all_source_messages_accounted(self):
  d=snapshot_data();self.assertEqual(len(d['messages']),16655);self.assertEqual(len({x['id'] for x in d['messages']}),16655);self.assertEqual(sum(x['messages'] for x in d['summary']['files']),16655);self.assertEqual(d.get('cash',[]),[]);self.assertEqual(len(d['accountReviews']),9002);self.assertEqual(len(d['accountantNotes']),1431)
 def test_valid_phone_date_identity_never_counted_twice(self):
  d=snapshot_data();keys=[(m.phone(r['masterMobile']),m.phone(r['escortMobile']),r['startDate']) for r in d['programs']];keys=[k for k in keys if all(k)];self.assertEqual(len(keys),len(set(keys)))
 def test_every_program_evidence_row_is_retained(self):
  d=snapshot_data();baseline=json.loads((EVIDENCE/'chat-archive.json').read_text())['programs']+json.loads((EVIDENCE/'operations.json').read_text())['programs'];all_ids={r['id'] for r in baseline+d['programEvidence'] if r.get('details',{}).get('recordKind')!='Vessel reference'}
  linked_ids={e['id'] for r in d['programs'] for e in r['evidence']};self.assertEqual(all_ids,linked_ids);self.assertEqual(sum(len(r['evidence']) for r in d['programs']),sum(r.get('details',{}).get('recordKind')!='Vessel reference' for r in baseline)+d['summary']['sourceProgramEvidence'])
 def test_chunks_integrity(self):
  d=json.loads((EVIDENCE/'conversation-snapshot.json').read_text());self.assertEqual(len(d['chunks']),len({c['id'] for c in d['chunks']}));self.assertLess(len(d['chunks'])+6,50)
  for c in d['chunks']:self.assertEqual(c['contentHash'],hashlib.sha256(c['payload'].encode()).hexdigest());self.assertLess(len(c['payload'].encode()),1900000)
 def test_reimport_byte_identical(self):
  upload=Path(os.environ.get('AL_RIFAI_IMPORT_INPUT_DIR','/workspace/scratch/8260437e5e8a/upload'))
  if not upload.exists():self.skipTest('Original export bytes are required for byte-identical reimport verification')
  before=(EVIDENCE/'conversation-snapshot.json').read_bytes()
  for expected in json.loads(before)['summary']['files']:
   matches=[p for p in upload.glob('*.txt') if any(tag in p.name for key,tag,*_ in m.SOURCES if key==expected['key'])]
   self.assertEqual(len(matches),1,'Exactly one authoritative source is required for '+expected['key'])
   self.assertEqual(hashlib.sha256(matches[0].read_bytes()).hexdigest(),expected['sha256'])
  with tempfile.TemporaryDirectory(prefix='alrifai-conversation-reimport-') as private:
   output=Path(private)/'output';env={**os.environ,'ALRIFAI_IMPORT_OUTPUT_DIR':str(output),'ALRIFAI_EVIDENCE_DIR':str(EVIDENCE)}
   subprocess.run([sys.executable,str(ROOT/'scripts/update_conversations.py'),str(upload)],env=env,stdout=subprocess.DEVNULL,check=True)
   self.assertEqual(before,(output/'conversation-snapshot.json').read_bytes())
  self.assertEqual(before,(EVIDENCE/'conversation-snapshot.json').read_bytes())
if __name__=='__main__':unittest.main()
