import unittest,importlib.util,sqlite3,tempfile,pathlib,datetime,json
spec=importlib.util.spec_from_file_location('scan',pathlib.Path(__file__).parents[1]/'scripts/operations/reconcile-scan.py');scan=importlib.util.module_from_spec(spec);spec.loader.exec_module(scan)
class Encoding(unittest.TestCase):
 def test_binary_native_payload_hash(self):
  with tempfile.TemporaryDirectory() as td:
   root=pathlib.Path(td);work=root/'work';work.mkdir()
   for account in ['wa-01','wa-02']:
    folder=root/account/'store';folder.mkdir(parents=True)
    with sqlite3.connect(folder/'whatsapp.db') as d:
     d.execute('CREATE TABLE whatsmeow_device(jid)');d.execute("INSERT INTO whatsmeow_device VALUES('8801711111111:1@s.whatsapp.net')");d.execute('CREATE TABLE whatsmeow_lid_map(lid,pn)')
    with sqlite3.connect(folder/'messages.db') as d:
     d.execute('CREATE TABLE chats(jid,name)');d.execute('CREATE TABLE messages(id,chat_jid,sender,timestamp,content,is_from_me,quoted_message_id,media_type,filename,file_sha256,deleted_at)');d.execute("INSERT INTO messages VALUES('synthetic','test@g.us','8801711111111@s.whatsapp.net','2026-07-01T01:00:00Z','বাংলা',0,NULL,NULL,NULL,NULL,NULL)")
     d.execute('CREATE TABLE native_events(event_seq,stream_id,message_id,original_chat_jid,original_sender_jid,kind,origin,source_time,payload_hash,header_json)');d.execute('INSERT INTO native_events VALUES(1,?,?,?,?,?,?,?,?,?)',('fixture','synthetic','test@g.us','8801711111111@s.whatsapp.net','message','fixture','2026-07-01T01:00:00Z',b'\x01\xff',json.dumps({'content':{'text':{'value':'বাংলা'}}})))
   v=scan.collect(root,work,datetime.datetime(2026,10,16,tzinfo=datetime.timezone.utc));json.dumps(v,ensure_ascii=False);self.assertEqual(v['accounts'][0]['messages'][0]['nativeRevision']['payloadHash'],'01ff')
 def test_gap_and_tail_boundaries_do_not_invent_cached_originals(self):
  with tempfile.TemporaryDirectory() as td:
   root=pathlib.Path(td);work=root/'work';work.mkdir()
   for account in ['wa-01','wa-02']:
    folder=root/account/'store';folder.mkdir(parents=True)
    with sqlite3.connect(folder/'whatsapp.db') as d:
     d.execute('CREATE TABLE whatsmeow_device(jid)');d.execute("INSERT INTO whatsmeow_device VALUES('8801711111111:1@s.whatsapp.net')");d.execute('CREATE TABLE whatsmeow_lid_map(lid,pn)')
    with sqlite3.connect(folder/'messages.db') as d:
     d.execute('CREATE TABLE chats(jid,name)');d.execute('CREATE TABLE messages(id,chat_jid,sender,timestamp,content,is_from_me,quoted_message_id,media_type,filename,file_sha256,deleted_at)')
     for id,at in [('before','2026-06-30T17:59:59Z'),('boundary','2026-06-30T18:00:00Z'),('tail','2026-10-16T18:00:01Z'),('future','2026-10-16T19:01:00Z'),('bad','invalid')]:
      d.execute('INSERT INTO messages VALUES(?,?,?,?,?,0,NULL,NULL,NULL,NULL,NULL)',(id,'synthetic@g.us','8801711111111@s.whatsapp.net',at,'Synthetic cached text'))
     if account=='wa-01':
      d.execute('CREATE TABLE native_events(event_seq,stream_id,message_id,original_chat_jid,original_sender_jid,kind,origin,source_time,payload_hash,header_json)')
      d.execute('INSERT INTO native_events VALUES(1,?,?,?,?,?,?,?,?,?)',('fixture','missing-original','synthetic@g.us','8801711111111@s.whatsapp.net','unsupported','fixture','2026-07-01T01:00:00Z',b'1',json.dumps({'content':{}})))
   import hashlib
   files=list(root.glob('*/store/*.db'));before={str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in files}
   v=scan.collect(root,work,datetime.datetime(2026,10,16,19,tzinfo=datetime.timezone.utc));a,b=v['accounts']
   self.assertEqual({m['id'] for m in a['messages']},{'boundary','tail'})
   self.assertEqual(a['invalidDates'],1);self.assertEqual(a['monthlyRawRows'],{'2026-07':1,'2026-10':1})
   self.assertEqual(a['nativeJournal']['unprojectedOriginalKinds'],{'unsupported':1});self.assertFalse(b['nativeJournal']['available'])
   self.assertTrue(any('Local cache only' in x for x in v['coverageLimits']))
   self.assertEqual(before,{str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in files})
if __name__=='__main__':unittest.main()
