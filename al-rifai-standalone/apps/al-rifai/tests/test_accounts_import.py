import tempfile
import unittest,importlib.util,json,hashlib,subprocess,sys,os
from pathlib import Path
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[1]
EVIDENCE=Path(os.environ.get("ALRIFAI_EVIDENCE_DIR","/var/lib/vps/al-rifai/evidence"))
spec=importlib.util.spec_from_file_location('accounts_import',ROOT/'scripts/update_accounts.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
def read_snapshot():
 s=json.loads((EVIDENCE/'accounts-snapshot.json').read_text());out={'summary':s['summary']}
 for c in s['chunks']:out.setdefault(c['kind'],[]).extend(json.loads(c['payload']))
 return out
class AccountsImportTests(unittest.TestCase):
 def message(self,**changes):return {'id':'fixture-message','messageDate':'2026-10-06','time':'12:00','sender':'Muradul Azim','chatKey':'mamun','conversationType':'direct','sourceSha256':'fixture-source','line':1,'body':'ID: 01812345678 Rahim 01712345678(B) 500/-',**changes}
 def proof(self):return {'confirmed':True,'adminPhone':'01880446111','accountantContactConfirmed':True,'conversationType':'direct','senderAlias':'Muradul Azim','sourceSha256':'fixture-source'}
 def test_identity_before_content(self):
  with patch.object(m,'parse_block',side_effect=AssertionError('parser must remain unreachable')):
   for msg,p in [(self.message(),None),(self.message(sender='Mamun Vai Bkash Nagod'),self.proof()),(self.message(sender='Other'),self.proof()),(self.message(chatKey='office'),self.proof()),(self.message(conversationType='group'),self.proof()),(self.message(sourceSha256='different'),self.proof())]:self.assertEqual(m.parse_message(msg,p)[0],[])
 def test_two_number_roles(self):
  r=m.parse_block('ID: 01812345678 Rahim 01712345678(B) 500/-');self.assertEqual((r['employeePhone'],r['payoutPhone']),('01812345678','01712345678'));self.assertEqual(r['amountCents'],50000)
 def test_same_mobile_two_roles(self):self.assertEqual(m.parse_block('ID;01812345678 Rahim 01812345678(N) 200/-')['identityRule'],'two_number_explicit_id')
 def test_single_number_not_payout(self):
  r=m.parse_block('Rahim 01812345678(N) 200/-');self.assertEqual(r['employeePhone'],'01812345678');self.assertEqual(r['payoutPhone'],'')
 def test_invalid_id_never_replaced_by_payout(self):
  for s in ['ID: 0171234 Rahim 01812345678(B) 500/-','ID: 01812345678 Rahim 0171234567(B) 500/-','01812345678(B) 500/-']:self.assertIn('error',m.parse_block(s))
 def test_date_never_becomes_amount(self):self.assertIn('error',m.parse_block('Rahim 01812345678\n26/04/2026'))
 def test_conflicting_amounts_not_guessed(self):self.assertIn('error',m.parse_block('Rahim 2025/- (cash 2000)'))
 def test_explicit_food_bill_amount(self):
  r=m.parse_block('ID: 01812345678 Rahim\nMaster 01712345678 (B) food bill 17*150=2550/-');self.assertEqual(r['amountCents'],255000);self.assertEqual(r['name'],'Rahim')
 def test_cash_without_identity_no_invention(self):
  r=m.parse_block('Rahim 300/- (cash)');self.assertEqual(r['name'],'Rahim');self.assertEqual(r['employeePhone'],'');self.assertEqual(r['payoutPhone'],'')
 def test_explicit_cash_heading_applies_within_message(self):
  rows,_=m.parse_message(self.message(body='Cash\nRahim 300/-\nKarim 250/-'),self.proof());self.assertEqual(len(rows),2);self.assertTrue(all(r['method']=='cash' and not r['employeePhone'] for r in rows))
 def test_multiple_lines_not_swallowed(self):
  rows,_=m.parse_message(self.message(body='ID: 01812345678\nRahim 01712345678(B) 500/-\nID: 01912345678 Karim 01612345678(N) 600/-'),self.proof());self.assertEqual(len(rows),2);self.assertEqual([r['employeePhone'] for r in rows],['01812345678','01912345678'])
 def test_name_on_separate_line(self):
  rows,_=m.parse_message(self.message(body='Rahim\n01812345678(B) 500/-\nKarim 01712345678(N) 600/-'),self.proof());self.assertEqual(len(rows),2);self.assertEqual(rows[0]['name'],'Rahim')
 def test_forwarded_content_uses_outer_identity(self):
  rows,_=m.parse_message(self.message(body='[26/06, 21:48] Office: Rahim 01812345678(B) 500/-'),self.proof());self.assertEqual(rows[0]['senderPhone'],'01880446111');self.assertEqual(rows[0]['name'],'Rahim')
 def test_cancellation_not_counted(self):self.assertEqual(m.parse_message(self.message(body=self.message()['body']+'\nপাঠাবেন না'),self.proof())[0],[])
 def test_duplicate_candidates_held_without_deletion(self):
  r=m.parse_message(self.message(),self.proof())[0][0];q,held,reviews,n=m.reconcile_duplicates([r,{**r,'id':'second','sourceId':'second-message'}]);self.assertEqual(q,[]);self.assertEqual(len(held),2);self.assertEqual(len(reviews),2);self.assertEqual(n,1)
 def test_different_dates_and_amounts_remain_separate(self):
  r=m.parse_message(self.message(),self.proof())[0][0];q,held,_,_=m.reconcile_duplicates([r,{**r,'id':'next-day','date':'2026-10-07'},{**r,'id':'other-amount','amountCents':60000}]);self.assertEqual(len(q),3);self.assertEqual(held,[])
 def test_source_coverage_and_qualified_totals(self):
  d=read_snapshot();old=json.loads((EVIDENCE/'conversation-snapshot.json').read_text());messages=[r for c in old['chunks'] if c['kind']=='accountMessages' for r in json.loads(c['payload'])]
  qualified={r['sourceId'] for r in d['accountsCash']};review={r['sourceMessageId'] for r in d['accountsReviews']};excluded=set(d['accountsExcluded']);self.assertEqual(qualified|review|excluded,{r['id'] for r in messages});self.assertFalse(excluded & (qualified|review));self.assertEqual(len(messages),10434)
  self.assertEqual(sum(r['amountCents'] for r in d['accountsCash']),d['summary']['qualifiedAmountCents']);self.assertEqual(len({r['id'] for r in d['accountsCash']}),len(d['accountsCash']))
  by_id={r['id']:r for r in messages};self.assertTrue(all(by_id[r['sourceId']]['sender']=='Muradul Azim' for r in d['accountsCash']))
  keys=[(r['date'],r['employeePhone'] or m.base.norm(r['name']),r['payoutPhone'],r['method'],r['amountCents']) for r in d['accountsCash']];self.assertEqual(len(keys),len(set(keys)))
  self.assertEqual(sum(r['date']=='2026-10-06' for r in d['accountsCash']),17);self.assertEqual(sum(r['amountCents'] for r in d['accountsCash'] if r['date']=='2026-10-06'),340000)
 def test_chunks_and_determinism_vessels_unchanged(self):
  p=EVIDENCE/'accounts-snapshot.json';snapshot=json.loads(p.read_text())
  for c in snapshot['chunks']:self.assertEqual(c['contentHash'],hashlib.sha256(c['payload'].encode()).hexdigest());self.assertLess(len(c['payload'].encode()),1900000)
  self.assertLess(len(snapshot['chunks'])+6,50)
  source=Path(os.environ.get('AL_RIFAI_ACCOUNT_EXPORT','/workspace/scratch/8260437e5e8a/upload/01-WhatsApp-Chat-with-Mamun-Vai-Bkash-Nagod.txt'));proof=Path(os.environ.get('AL_RIFAI_ACCOUNTS_PROOF',str(ROOT/'.sites-runtime/analysis/accounts-source-proof.json')))
  if not source.exists() or not proof.exists():self.skipTest('Original source and private owner attestation are needed for repeat-import validation')
  before=p.read_bytes();vessel=(EVIDENCE/'conversation-snapshot.json').read_bytes()
  self.assertEqual(hashlib.sha256(source.read_bytes()).hexdigest(),snapshot['summary']['sourceSha256'])
  self.assertEqual(json.loads(proof.read_text()),snapshot['summary']['identityProof'])
  with tempfile.TemporaryDirectory(prefix='alrifai-accounts-reimport-') as private:
   output=Path(private)/'output';env={**os.environ,'ALRIFAI_IMPORT_OUTPUT_DIR':str(output),'ALRIFAI_EVIDENCE_DIR':str(EVIDENCE)}
   subprocess.run([sys.executable,str(ROOT/'scripts/update_accounts.py'),str(source),'--identity-proof',str(proof)],env=env,stdout=subprocess.DEVNULL,check=True)
   self.assertEqual(before,(output/'accounts-snapshot.json').read_bytes())
  self.assertEqual(before,p.read_bytes());self.assertEqual(vessel,(EVIDENCE/'conversation-snapshot.json').read_bytes())
if __name__=='__main__':unittest.main()
