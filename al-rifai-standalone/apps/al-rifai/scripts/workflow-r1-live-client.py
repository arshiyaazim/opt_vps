"""Bounded real Client extraction/exact replay, without concurrent UI loading."""
import base64,http.cookiejar,json,urllib.request,urllib.error
from pathlib import Path
origin='https://app.al-rifai.iamazim.com';out=Path('/results/workflow-r1-live-client.json')
account=json.loads(Path('/run/owner-login').read_text());password=Path('/run/validation-password').read_text().strip()
opener=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
auth='Basic '+base64.b64encode(('validator:'+password).encode()).decode()
result={'status':'NOT_ACCEPTED','mockedApi':False,'financialPosting':'OFF','operationalConfirmationAcceptance':False}
def call(path,payload=None,csrf=None):
 headers={'Authorization':auth,'Origin':origin,'Content-Type':'application/json'}
 if csrf:headers['X-CSRF-Token']=csrf
 request=urllib.request.Request(origin+'/candidate-api'+path,headers=headers,data=json.dumps(payload).encode() if payload is not None else None)
 try:
  with opener.open(request,timeout=50) as response:return response.status,json.load(response)
 except urllib.error.HTTPError as e:return e.code,json.load(e)
try:
 code,login=call('/session/login',{'username':account['username'],'password':account['password']});assert code==200,'NAMED_LOGIN_FAILED';csrf=login['csrf']
 code,status=call('/business/history/status?accountId=wa-01');assert code==200,'SCOPE_UNAVAILABLE'
 clients=[s for s in status['scopes'] if s['domain']=='ESCORT' and s['chatJid'].endswith('@s.whatsapp.net')];assert len(clients)==1
 result['pullPages']=[];result['replayPages']=[]
 for replaying in (False,True):
  for page in range(3):
   payload={'accountId':'wa-01','chatJid':clients[0]['chatJid'],'rescan':page==0}
   code,body=call('/business/history/pull',payload,csrf)
   result['replayPages' if replaying else 'pullPages'].append({'httpStatus':code,'result':body})
   out.write_text(json.dumps(result,indent=2)+'\n');assert code==200,'CLIENT_PAGE_FAILED'
   if replaying:assert body['extracted']==0,'EXACT_REPLAY_CREATED_NEW_FACT'
   if body['complete']:break
 result['pull']={'httpStatus':200,'result':{'scanned':sum(x['result']['scanned'] for x in result['pullPages']),'extracted':sum(x['result']['extracted'] for x in result['pullPages']),'replayed':sum(x['result']['replayed'] for x in result['pullPages']),'complete':result['pullPages'][-1]['result']['complete']}}
 result['replay']={'httpStatus':200,'result':{'scanned':sum(x['result']['scanned'] for x in result['replayPages']),'extracted':sum(x['result']['extracted'] for x in result['replayPages']),'replayed':sum(x['result']['replayed'] for x in result['replayPages'])}}
 assert result['replay']['result']['replayed']==result['pull']['result']['extracted']+result['pull']['result']['replayed'],'REPLAY_FACT_COUNT_CHANGED'
 result['status']='BOUNDED_EXTRACTION_AND_EXACT_REPLAY_PASS_NOT_CONFIRMATION_ACCEPTANCE'
finally:
 if 'csrf' in globals():result['logoutStatus']=call('/session/logout',{},csrf)[0]
 out.write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
