"""Live desktop/mobile layout + bounded Client source acceptance.
Existing browser tooling only. No route interception, synthetic API, messages,
financial posting, fabricated confirmation or registry mutations.
"""
import json, traceback, os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

out=Path('/results');origin='https://app.al-rifai.iamazim.com'
account=json.loads(Path('/run/owner-login').read_text())
checks=[];coverage=[];result={'status':'NOT_ACCEPTED','mockedApi':False,'physicalPhone':False,'tlsTrustBypass':False,'financialPosting':'OFF','boundedClientPull':None,'operationalConfirmationAcceptance':False,'checks':checks,'coverage':coverage}
if os.environ.get('R1_SKIP_IMPORT')=='1':
    prior=json.loads((out/'workflow-r1-live-client.json').read_text())
    assert prior['status']=='BOUNDED_EXTRACTION_AND_EXACT_REPLAY_PASS_NOT_CONFIRMATION_ACCEPTANCE'
    result['boundedClientPull']=prior['pull'];result['exactReplay']=prior['replay']
def check(name,condition):
    if not condition:raise AssertionError(name)
    checks.append({'name':name,'status':'PASS'})
def save():
    (out/'workflow-r1-live-acceptance.json').write_text(json.dumps(result,indent=2)+'\n')
try:
 with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
    for label,width,height in [('desktop',1366,900),('mobile',390,844)]:
        context=browser.new_context(viewport={'width':width,'height':height},accept_downloads=True,http_credentials={'username':'validator','password':Path('/run/validation-password').read_text().strip()})
        page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        check(label+' real HTTPS page',page.goto(origin+'/review',timeout=45000).status==200)
        check(label+' anonymous cash denied',context.request.get(origin+'/candidate-api/business/register?accountId=wa-01&view=cash').status==401)
        page.get_by_label('Username',exact=True).fill(account['username']);page.get_by_label('Password',exact=True).fill(account['password'])
        with page.expect_response(lambda r:r.url.endswith('/candidate-api/session/login')) as login:
            page.get_by_role('button',name='লগইন',exact=True).click()
        check(label+' actual named login',login.value.status==200);csrf=login.value.json()['csrf'];headers={'Origin':origin,'X-CSRF-Token':csrf}
        if label=='desktop' and os.environ.get('R1_SKIP_IMPORT')!='1':
            status=context.request.get(origin+'/candidate-api/business/history/status?accountId=wa-01');check('source scope API available',status.status==200)
            scopes=status.json()['scopes'];clients=[s for s in scopes if s['domain']=='ESCORT' and s['chatJid'].endswith('@s.whatsapp.net')]
            check('approved direct Client scope exists',len(clients)==1);chat=clients[0]['chatJid']
            payload={'accountId':'wa-01','chatJid':chat,'rescan':True}
            pull=context.request.post(origin+'/candidate-api/business/history/pull',headers=headers,data=payload,timeout=45000)
            result['boundedClientPull']={'chatJid':chat,'httpStatus':pull.status,'result':pull.json()}
            save();check('previously blocked Client extraction commits',pull.status==200)
            replay=context.request.post(origin+'/candidate-api/business/history/pull',headers=headers,data=payload,timeout=45000)
            result['exactReplay']={'httpStatus':replay.status,'result':replay.json()};save()
            check('Client same-page exact replay adds no extraction',replay.status==200 and replay.json()['extracted']==0 and replay.json()['replayed']==pull.json()['extracted']+pull.json()['replayed'])
        legacy=context.request.get(origin+'/candidate-api/business/extractions?accountId=wa-01&kind=ALL',timeout=45000)
        legacy_body=legacy.json();check(label+' mixed v1/v2 generic reader live',legacy.status==200 and 'rows' in legacy_body)
        coverage.append({'viewport':label,'genericReaderRows':len(legacy_body['rows']),'parserVersions':sorted(set(x['parserVersion'] for x in legacy_body['rows']))})
        for view,button,region in [('cash','Cash / নগদ','Cash workspace'),('roster','Escort Roster / ডিউটি','Escort roster workspace')]:
            with page.expect_response(lambda r:'/candidate-api/business/register?' in r.url and 'view='+view in r.url) as loaded:
                page.get_by_role('button',name=button,exact=True).click()
            check(label+' '+view+' live API source revalidated',loaded.value.status==200 and loaded.value.json()['coverage']['basis']=='SOURCE_REVALIDATED')
            body=loaded.value.json();section=page.get_by_role('region',name=region);expect(section).to_be_visible()
            expect(section.get_by_role('table')).to_be_visible()
            coverage.append({'viewport':label,'view':view,'visibleRows':len(body['rows']),'total':body['total'],'states':sorted(set(x['status'] for x in body['rows'])),'canonicalRows':sum(x.get('basis')=='CANONICAL_PROGRAM' for x in body['rows']),'sourceReferences':sum(len(x.get('references',[])) for x in body['rows'])})
            check(label+' '+view+' no page horizontal overflow',page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'))
            if body['rows']:
                first=body['rows'][0]
                with page.expect_response(lambda r:'/candidate-api/business/register?' in r.url) as detail_read:
                    section.get_by_role('button',name='History / ইতিহাস',exact=True).first.click()
                check(label+' '+view+' detail refreshes live source',detail_read.value.status==200)
                detail=page.get_by_role('region',name='Business record detail');expect(detail).to_be_visible()
                if first.get('references'):expect(detail).to_contain_text(first['references'][0])
                check(label+' '+view+' source reference visible',bool(first.get('references')))
                if view=='cash':
                    check(label+' cash posting has no active financial action',not detail.get_by_role('button',name='Post exact entry',exact=True).count())
                with page.expect_download() as download:
                    section.get_by_role('button',name='CSV · selected visible page',exact=True).click()
                csv=Path(download.value.path()).read_text()
                check(label+' '+view+' CSV declares selected visible scope','Selected visible page' in csv)
                with page.expect_response(lambda r:'/candidate-api/business/register?' in r.url) as print_read:
                    section.get_by_role('button',name='Print · selected visible page',exact=True).click()
                check(label+' '+view+' print revalidates source',print_read.value.status==200)
                # Search an actual visible value and verify the actual API contract.
                search=str(first.get('name') if view=='cash' else first.get('motherVessel') or first.get('lighterVessel') or '')
                if search:
                    section.get_by_label('Business search',exact=True).fill(search)
                    page.wait_for_timeout(1200)
                    expect(section).to_contain_text(search)
                    check(label+' '+view+' actual source-aware search renders',True)
                    section.get_by_label('Business search',exact=True).fill('');page.wait_for_timeout(1200)
            page.screenshot(path=str(out/('workflow-r1-live-'+label+'-'+view+'.png')),full_page=True)
        page.get_by_role('button',name='মেসেজ থেকে তথ্য',exact=True).click()
        page.wait_for_timeout(1500)
        check(label+' generic reader UI has no contract error','INVALID_CONTRACT_INPUT' not in page.locator('body').inner_text())
        check(label+' no JavaScript exception',not errors)
        with page.expect_response(lambda r:r.url.endswith('/candidate-api/session/logout')) as logout:
            page.get_by_role('button',name='লগআউট',exact=True).click()
        check(label+' logout',logout.value.status==200);context.close();save()
    browser.close()
 result['browserStatus']='LIVE_DESKTOP_MOBILE_LAYOUT_PASS';result['status']='BROWSER_PASS_BUSINESS_CONFIRMATION_NOT_ACCEPTED'
except Exception as exc:
 result['failure']=type(exc).__name__+': '+str(exc)[:1400]
 result['browserStatus']='PARTIAL_OR_FAILED';save();print(json.dumps({'status':result['status'],'failure':result['failure'],'checks':len(checks)}));raise
finally:save()
print(json.dumps({'status':result['status'],'browserStatus':result.get('browserStatus'),'checks':len(checks),'boundedClientPull':result['boundedClientPull'],'coverage':coverage}))
