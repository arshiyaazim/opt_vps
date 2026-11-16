"""Exercise compiled real components with deliberately late synthetic fetch responses."""
import json,os,threading,http.server
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
os.chdir('/fixtures')
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',8765),Quiet);threading.Thread(target=server.serve_forever,daemon=True).start();checks=[]
def check(name,condition):
 if not condition:raise AssertionError(name)
 checks.append(name)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=browser.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 def reset(kind,scope='wa-01',initial=''):
  page.goto('http://127.0.0.1:8765/');page.wait_for_function("typeof window.renderFixture==='function'");render(kind,scope,initial)
 def render(kind,scope='wa-01',initial=''):page.evaluate('([k,s,q])=>window.renderFixture(k,s,q)',[kind,scope,initial])
 def count(n):page.wait_for_function('(n)=>window.requests().length>=n',arg=n)
 def reply(i,body,status=200):page.evaluate('([i,b,s])=>window.reply(i,b,s)',[i,body,status]);page.wait_for_timeout(80)
 def text():return page.locator('body').inner_text()
 try:
  # Account changes must discard a fully read old JSON result, not merely abort fetch.
  reset('request');count(1);render('request','wa-02');count(2)
  reply(1,{'subjects':[{'personId':'new','name':'CURRENT CLIENT','chatJid':'new@s.whatsapp.net'}]});reply(0,{'subjects':[{'personId':'old','name':'STALE CLIENT','chatJid':'old@s.whatsapp.net'}]})
  check('old account response discarded', 'CURRENT CLIENT' in text() and 'STALE CLIENT' not in text())
  page.get_by_label('Request client').select_option('new');page.get_by_label('Request description').fill('Synthetic pending request');page.locator('form button').click();count(3)
  render('request','wa-01');count(4);reply(2,{'result':{'items':[{'draft':'STALE SAVED DRAFT'}]}});check('late submit cannot repopulate changed account','STALE SAVED DRAFT' not in text());check('request fields reset on account change',page.get_by_label('Request description').input_value()=='')
  reply(3,{},401);check('current unauthorized response expires session',page.evaluate('window.counters().expired')==1)
  # Permission-specific keyed form must disappear immediately and fail closed.
  reset('cash');count(1);reply(0,{'create':True,'post':False,'reverse':False});old=text();render('cash','wa-02');count(2);check('cash permission reset while next account pending',old!=text());reply(1,{'create':False,'post':False,'reverse':False});check('revoked cash access has no enabled submit',page.locator('form button:enabled').count()==0)
  # A view switch invalidates a request even before the next explicit Refresh.
  reset('tables');page.get_by_role('button',name='তথ্য দেখুন / Refresh').click();count(1);page.get_by_label('Database view').select_option('cash');reply(0,{'notice':'STALE TABLE','checkedAt':'now','columns':['id'],'rows':[{'id':'STALE ROW'}],'nextAfter':None});check('table response invalidated on view switch','STALE TABLE' not in text() and 'STALE ROW' not in text())
  page.get_by_role('button',name='তথ্য দেখুন / Refresh').click();count(2);reply(1,{'notice':'CURRENT TABLE','checkedAt':'now','columns':['id'],'rows':[{'id':'CURRENT ROW'}],'nextAfter':None});check('refresh reads current view','CURRENT ROW' in text())
  # Canonical record filters reject a late error and Cancel creates no write.
  reset('records','cash');count(2);reply(1,{'registry':[]});page.get_by_label('Business search').fill('CURRENT');count(3)
  reply(2,{'rows':[{'id':'current','employee_name':'CURRENT CANONICAL','amount_minor':'125050'}],'total':1,'totalMinor':'125050','nextOffset':None,'posted':0});reply(0,{'error':'STALE FAILURE'},500)
  check('canonical filter rejects stale error and rows','CURRENT CANONICAL' in text() and 'STALE FAILURE' not in text());check('canonical exact totals displayed','1250.50' in text())
  page.get_by_role('button',name='View / history',exact=True).click();page.get_by_role('button',name='Refresh',exact=True).click();count(4);check('canonical refresh preserves an open record snapshot',page.get_by_role('article').count()==1);reply(3,{'rows':[],'total':0,'totalMinor':'0','nextOffset':None,'posted':0});page.get_by_role('button',name='Close',exact=True).click()
  page.get_by_role('button',name='Add instruction',exact=True).click();page.get_by_label('Employee name',exact=True).fill('Unsaved synthetic');before=page.evaluate('window.requests().length');page.get_by_role('button',name='Cancel · no write',exact=True).click();check('canonical form cancel makes no request',page.evaluate('window.requests().length')==before and page.get_by_role('heading',name='New owner entry').count()==0)
  render('records','programs');count(6);check('canonical kind switch clears prior cash details','CURRENT CANONICAL' not in text())
  # Dialog keyed by source ID, with late data from the dismissed/source-switched request.
  reset('source','old-source');count(1);render('source','new-source');count(2)
  message={'id':'new-source','sender':'Fixture','body':'CURRENT SOURCE','date':'2026-10-16','messageDate':'2026-10-16','source':'Synthetic','line':1,'time':'12:00','mediaNames':[]}
  reply(1,{'messages':[message],'total':1});reply(0,{'messages':[{**message,'body':'STALE SOURCE'}],'total':1});check('dialog source switch rejects late body','CURRENT SOURCE' in text() and 'STALE SOURCE' not in text());check('source switch aborts prior request',page.evaluate('window.requests()[0].aborted'))
  page.keyboard.press('Escape');page.wait_for_timeout(80);check('dialog keyboard close unmounts',page.get_by_role('dialog').count()==0)
  # Initial assistant question is consumed once, including callback identity changes.
  reset('assistant','old','Synthetic initial');count(1);render('assistant','old','Synthetic initial');page.wait_for_timeout(100);check('initial question exactly once',page.evaluate('window.requests().length==1&&window.counters().initialUsed==1'))
  render('assistant','new','');reply(0,{'answer':'STALE ANSWER','refs':[],'mode':'structured','scope':'old','checkedAt':'2026-10-16T12:00:00Z','warnings':[],'interpretation':{}});check('assistant source change drops stale answer','STALE ANSWER' not in text())
  page.get_by_label('Question about register or accounts').fill('New current question');page.get_by_label('Ask question',exact=True).click();count(2)
  reply(1,{'answer':'CURRENT ANSWER','refs':[],'mode':'structured','scope':'new','checkedAt':'2026-10-16T12:00:00Z','warnings':[],'interpretation':{}});check('assistant continues after source transition','CURRENT ANSWER' in text());check('initial question not reissued after request completion',page.evaluate('window.requests().length')==2)
  page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(80);box=page.get_by_role('dialog').bounding_box();check('assistant resize stays inside mobile viewport',box['x']>=0 and box['y']>=0)
  page.get_by_label('Question about register or accounts').focus();page.keyboard.press('Escape');page.wait_for_timeout(80);check('assistant keyboard close',page.get_by_role('dialog').count()==0)
  reset('request');count(1);render('none');reply(0,{'subjects':[{'personId':'old','name':'UNMOUNTED','chatJid':'old@s.whatsapp.net'}]});check('late response after unmount stays hidden','UNMOUNTED' not in text());check('no browser exceptions',not errors)
  Path('/results/ui-lifecycle-result.json').write_text(json.dumps({'status':'PASS','count':len(checks),'checks':checks},indent=2))
 except Exception as e:
  Path('/results/ui-lifecycle-result.json').write_text(json.dumps({'status':'FAILED','count':len(checks),'checks':checks,'error':str(e),'browserErrors':errors},indent=2));raise
 finally:browser.close();server.shutdown()
