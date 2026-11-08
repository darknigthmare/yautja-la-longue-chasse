import json,pathlib,threading,time,math,sys
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1];OUT=ROOT/'outputs/qa-mobility-native'
class Handler(SimpleHTTPRequestHandler):
 def translate_path(self,p):return str(ROOT/'public'/p.lstrip('/') if p.startswith('/game/') else OUT/('index.html' if p=='/' else p.lstrip('/').split('?')[0]))
 def log_message(self,*a):pass
server=ThreadingHTTPServer(('127.0.0.1',4188),Handler);threading.Thread(target=server.serve_forever,daemon=True).start()
r={'scope':'Native MobilityGarage component with actual reducer, campaign writer and localStorage; not full GameClient/Homeworld journey','checks':[],'errors':[],'screenshots':[]}
def check(name,ok):
 assert ok,name;r['checks'].append({'name':name,'passed':True});print('PASS',name,flush=True)
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
  ctx=browser.new_context(viewport={'width':1440,'height':1040});page=ctx.new_page();page.on('pageerror',lambda e:r['errors'].append(str(e)))
  page.goto('http://127.0.0.1:4188/',wait_until='networkidle');page.bring_to_front();page.locator('[data-mobility-garage]').wait_for()
  def stored():return page.evaluate("JSON.parse(localStorage.getItem('yautja-long-hunt.save'))")
  def click(name,exact=True):page.get_by_role('button',name=name,exact=exact).click()
  def shot(name):page.screenshot(path=str(OUT/name),full_page=True);r['screenshots'].append(name)
  check('50 catalogue cards',page.locator('[role=listitem]').count()==50)
  check('purchase disabled without permit',page.get_by_role('button',name='Confirmer l’achat · 420 marques',exact=True).is_disabled())
  check('legacy has no free property','mobilityV1' not in stored());shot('garage-desktop.png')
  page.set_viewport_size({'width':390,'height':844});shot('garage-mobile.png');check('mobile no horizontal overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth+2'));page.set_viewport_size({'width':1440,'height':1040})
  click('Prendre le Grav-Sled de formation');yard=page.locator('[data-mobility-yard]');yard.wait_for();check('loan recorded and paused',stored()['mobilityV1']['active']['loaned'] and yard.get_attribute('data-paused')=='true')
  b=stored()['settings']['controlBindings'];up,left,right,brake,interact=[b[k][0]for k in ['hunt.moveUp','hunt.moveLeft','hunt.moveRight','hunt.jump','hunt.interact']]
  click('Reprendre la conduite');points=[(820,490),(820,130),(820,24),(140,24),(140,130),(140,490)];stage=0;held=set();start=time.monotonic();samples=0
  while time.monotonic()-start<150:
   s=yard.evaluate("e=>Object.fromEntries(['x','y','heading','speed','tick','checkpoint','cargo','paused'].map(k=>[k,e.getAttribute('data-'+k)]))")
   x,y,h,speed=[float(s[k])for k in ['x','y','heading','speed']];tx,ty=points[stage];d=math.hypot(tx-x,ty-y);err=math.atan2(math.sin(math.atan2(ty-y,tx-x)-h),math.cos(math.atan2(ty-y,tx-x)-h));want=set()
   if d<(13 if stage in [2,3] else 32):
    want.add(brake)
    if abs(speed)<5:
     if stage in [1,5]:want.add(interact)
     if stage==1:
      if int(s['cargo'])==25:stage+=1
     elif stage==5:
      if stored()['mobilityV1']['active']['course']['cargoDelivered']:break
     else:stage+=1
   else:
    if abs(err)>.04:want.add(right if err>0 else left)
    if abs(err)<.4:want.add(up)
    elif abs(speed)>12:want.add(brake)
   for k in held-want:page.keyboard.up(k)
   for k in want-held:page.keyboard.down(k)
   held=want;samples+=1
   if samples%120==0:print('ROUTE',stage,s,flush=True)
   page.wait_for_timeout(55)
  for k in held:page.keyboard.up(k)
  click('Pause et enregistrer');c=stored()['mobilityV1']['active']['course'];r['course']=c
  check('three gates and physical cargo returned',c['checkpoint']==3 and c['cargoDelivered']);shot('yard-completed.png');click('Remiser au garage')
  check('permit without property/rank reward',stored()['mobilityV1']['circulationPermit'] and not stored()['mobilityV1']['owned'] and stored()['profile']['clanMarks']==10000)
  click('Confirmer l’achat · 420 marques');check('purchase debit once',stored()['profile']['clanMarks']==9580 and len(stored()['mobilityV1']['owned'])==1)
  click('Installer · 80 marques');check('upgrade debit and effect',stored()['profile']['clanMarks']==9500 and stored()['mobilityV1']['owned'][0]['upgrades']['drive']==1)
  before=stored()['mobilityV1'];page.reload(wait_until='networkidle');page.locator('[data-mobility-garage]').wait_for();check('browser reload exact state',stored()['mobilityV1']==before)
  click('Sortir sur l’aire');click('Reprendre la conduite');page.keyboard.down(up);page.wait_for_timeout(1300);page.keyboard.up(up);click('Pause et enregistrer');check('driving consumes reserve',stored()['mobilityV1']['owned'][0]['energy']<100)
  t=stored()['mobilityV1']['active']['course']['tick'];page.wait_for_timeout(700);check('pause freezes persisted tick',stored()['mobilityV1']['active']['course']['tick']==t)
  click('Retour de sécurité');click('Confirmer la récupération');check('recovery preserves wear',stored()['mobilityV1']['owned'][0]['energy']<100 and stored()['mobilityV1']['active']is None)
  click('Recharger ·',False);check('recharge independent of damage',stored()['mobilityV1']['owned'][0]['energy']==100 and stored()['mobilityV1']['owned'][0]['condition']<100)
  click('Réparer ·',False);check('repair restores condition',stored()['mobilityV1']['owned'][0]['condition']==100);check('no browser exceptions',not r['errors']);r['passed']=True;r['browser_version']=browser.version;browser.close()
except Exception as e:
 r['passed']=False;r['failure']=str(e);print('FAIL',repr(e),flush=True)
 try:page.screenshot(path=str(OUT/'failure.png'),full_page=True)
 except:pass
finally:server.shutdown();(OUT/'browser-report.json').write_text(json.dumps(r,ensure_ascii=False,indent=2));print(json.dumps(r,ensure_ascii=False)[:4000],flush=True)
sys.exit(0 if r.get('passed') else 1)
