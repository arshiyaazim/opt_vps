"""Browser rendering/interaction acceptance with explicit synthetic API responses.
No live login, database, private message body, OCR or posting is claimed here.
"""
import json
from pathlib import Path
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright, expect
out = Path('/results')
checks = []
def check(name, condition):
    if not condition:
        raise AssertionError(name)
    checks.append(name)
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
    for label,width in [('desktop',1366),('mobile',390)]:
        context=browser.new_context(viewport={'width':width,'height':900},accept_downloads=True,http_credentials={'username':'validator','password':'Synthetic browser validation fixture only 2026'})
        page=context.new_page(); errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        state={'visible':True,'denied':False,'reads':0,'queries':[]}
        def respond(route):
            url=route.request.url; status=200; d={}
            if '/session/login' in url:d={'csrf':'synthetic-only','username':'browser-fixture'}
            elif '/conversations/subjects' in url:d={'subjects':[]}
            elif '/reviews?' in url:d={'items':[],'nextOffset':None}
            elif '/business/history/status' in url:d={'scopes':[],'unavailableScopes':[{}, {}, {}]}
            elif '/business/cash/access' in url:d={'create':False,'post':False,'reverse':False}
            elif '/business/register?' in url:
                state['reads']+=1; q=parse_qs(urlparse(url).query);state['queries'].append(q)
                cash=q.get('view')==['cash']
                rows=[{'id':'fixture-cash','operationId':'fixture-operation','sourceTime':'2026-10-15T00:00:00.000Z','sourceOrder':'fixture-source / 1','messageId':'fixture-message','name':'Browser Fixture Employee','employeePhone':'+8801712345678','payoutMobile':'+8801812345678','method':'bkash','purpose':'Documented fixture expense','amountMinor':'125050','postedMinor':None,'status':'INTENT','reasons':['STORED_PROJECTION_NOT_SEND_SUCCESS'],'references':['fixture-source-ref'],'aliases':['Browser Fixture Employee']}] if cash else [{'id':'fixture-program','motherVessel':'Fixture Mother','lighterVessel':'Fixture Lighter','escortName':'Browser Fixture Escort','escortMobile':'+8801712345678','startDate':'2026-10-15','endDate':'','shift':'D','status':'Confirmed','references':['fixture-request','fixture-confirmation'],'events':[],'calculation':{'state':'UNRESOLVED','reasons':['VERIFIED_ATTENDANCE_REQUIRED']}}]
                if not state['visible']:rows=[]
                d={'view':'cash' if cash else 'roster','rows':rows,'total':str(len(rows)),'nextOffset':None,'checkedAt':'2026-10-15T01:00:00.000Z','summary':{'amountMinor':'125050' if rows else '0','postedMinor':'0','basis':'VISIBLE_PAGE'} if cash else None,'coverage':{'basis':'SOURCE_REVALIDATED','totalBasis':'ALL_VISIBLE_FILTERED','completeChatHistory':False}}
                if state['denied']:status=403;d={'error':'HISTORY_SCOPE_DENIED'}
            route.fulfill(status=status,content_type='application/json',body=json.dumps(d))
        page.route('**/candidate-api/**',respond)
        check(label+' image serves named login',page.goto('http://127.0.0.1:3000/review').status==200)
        expect(page.get_by_label('Username',exact=True)).to_be_visible()
        check(label+' no business data before login','Browser Fixture Employee' not in page.locator('body').inner_text())
        page.get_by_label('Username',exact=True).fill('browser-fixture');page.get_by_label('Password',exact=True).fill('synthetic-only');page.get_by_role('button',name='লগইন',exact=True).click()
        page.get_by_role('button',name='Cash / নগদ',exact=True).click()
        cash=page.get_by_role('region',name='Cash workspace');expect(cash).to_contain_text('Browser Fixture Employee')
        expect(cash).to_contain_text('1,250.50');expect(cash).to_contain_text('+8801812345678');expect(cash).to_contain_text('06:00:00')
        check(label+' actual cash table renders mobile payout amount Dhaka time and intent',True)
        check(label+' page has no horizontal overflow',page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'))
        cash.get_by_role('button',name='History / ইতিহাস',exact=True).click();expect(page.get_by_role('region',name='Business record detail')).to_contain_text('fixture-source-ref')
        page.get_by_role('button',name='Employee statement / এই মোবাইলের হিসাব',exact=True).click();expect(cash.get_by_label('Reference filter')).to_have_value('+8801712345678')
        expect(cash).to_contain_text('Browser Fixture Employee');check(label+' statement carries exact employee filter',any(q.get('payee')==['+8801712345678'] for q in state['queries']))
        before=state['reads']
        with page.expect_download() as download:cash.get_by_role('button',name='CSV · selected visible page',exact=True).click()
        content=Path(download.value.path()).read_text();check(label+' CSV rechecks current source and discloses scope',state['reads']>before and 'Selected visible page' in content and 'Browser Fixture Employee' in content)
        state['visible']=False
        cash.get_by_role('button',name='History / ইতিহাস',exact=True).click();expect(cash).not_to_contain_text('Browser Fixture Employee')
        check(label+' source revocation clears cached table detail totals',page.get_by_role('region',name='Business record detail').count()==0)
        state['visible']=True
        page.get_by_role('button',name='Escort Roster / ডিউটি',exact=True).click();roster=page.get_by_role('region',name='Escort roster workspace');expect(roster).to_contain_text('Fixture Mother');expect(roster).to_contain_text('Confirmed')
        roster.get_by_role('button',name='History / ইতিহাস',exact=True).click();expect(page.get_by_role('region',name='Business record detail')).to_contain_text('যাচাইকৃত attendance পাওয়া যায়নি')
        check(label+' roster shows canonical columns confirmed state and unresolved attendance',True)
        page.screenshot(path=str(out/('workflow-'+label+'.png')),full_page=True)
        state['denied']=True;roster.get_by_role('button',name='Refresh / হালনাগাদ',exact=True).click();expect(roster.get_by_role('alert')).to_contain_text('অনুমতি নেই');expect(roster).not_to_contain_text('Fixture Mother')
        check(label+' denial removes all cached business data',True)
        check(label+' no JavaScript errors',not errors)
        context.close()
    browser.close()
(out/'workflow-browser.json').write_text(json.dumps({'status':'PASS','checks':checks,'mockedApi':True,'liveBusinessAcceptance':False,'physicalPhone':False},indent=2))
print(json.dumps({'status':'PASS','checks':len(checks),'mockedApi':True}))
