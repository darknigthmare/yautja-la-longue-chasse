#!/usr/bin/env python3
"""In-memory Chromium tests of the built standalone. No URL policy is disabled.
Persistence uses a declared Storage fixture, not real browser-origin disk storage.
"""
import json
import os
import shutil
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT = Path(__file__).resolve().parents[2]
V2 = ROOT / 'v0.2.0'
OUT = V2 / 'qa'
OUT.mkdir(exist_ok=True)
HTML = (V2/'JOUER_PREDATOR_BADLANDS_STANDALONE.html').read_text(encoding='utf-8')
checks, errors, network = [], [], []
def check(name, ok):
    assert ok, name
    checks.append(name)
def snapshot(page): return page.evaluate('BADLANDS_DEBUG.snapshot()')
def load(page, query='qa=1', keep=False, fixture=True):
    saved = page.evaluate('globalThis.__testStorageData || {}') if keep else {}
    page.goto('about:blank')
    init = 'globalThis.BADLANDS_TEST_QUERY = '+json.dumps(query)+';'
    if fixture:
        init += '''globalThis.__testStorageData = %s;
        Object.defineProperty(window,'localStorage',{value:{
          getItem(k){return Object.hasOwn(__testStorageData,k)?__testStorageData[k]:null},
          setItem(k,v){__testStorageData[k]=String(v)},removeItem(k){delete __testStorageData[k]},
          clear(){globalThis.__testStorageData={}},key(i){return Object.keys(__testStorageData)[i]||null},
          get length(){return Object.keys(__testStorageData).length}
        }});''' % json.dumps(saved)
    page.set_content(HTML.replace('<head>', '<head><script>'+init+'</script>',1),wait_until='load')
    page.wait_for_selector('body[data-runtime="ready"]')
def open_scene(page,cid,sid):
    load(page,f'qa=1&campaign={cid}&scene={sid}')
    page.locator('#confirm').click()
def move_to(page,x):
    key='d' if snapshot(page)['player']['x']<x else 'a'
    page.keyboard.down(key)
    page.wait_for_function('(v)=> Math.abs(BADLANDS_DEBUG.snapshot().player.x-v)<25',arg=x,timeout=15000)
    page.keyboard.up(key)
def depth(page,d):
    for _ in range(4):
        if snapshot(page)['player']['depth']==d:return
        page.keyboard.press('q')
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'),args=['--no-sandbox'])
        ctx=browser.new_context(viewport={'width':1440,'height':960},device_scale_factor=1)
        page=ctx.new_page();page.on('pageerror',lambda err:errors.append(str(err)))
        page.on('request',lambda r:network.append(r.url) if r.url.startswith(('http:','https:')) else None)
        load(page);page.screenshot(path=str(OUT/'01_menu.png'),full_page=True)
        campaigns=page.evaluate('BADLANDS_V2_DATA.campaigns.map(c=>({id:c.id,scenes:c.scenes.map(s=>s.id)}))')
        for c in campaigns:
            for sid in c['scenes']:
                open_scene(page,c['id'],sid)
                check('browser-load:'+sid,snapshot(page)['scene']==sid and snapshot(page)['phase']=='play')
        open_scene(page,'weyland','wy_power')
        for i in range(2):
            depth(page,i);move_to(page,420+i*420);page.keyboard.press('e')
            check(f'puzzle:relay-{i+1}-by-keyboard',snapshot(page)['puzzle']==i+1)
        page.locator('#save').click();saved=snapshot(page)
        load(page,keep=True);page.locator('[data-resume="weyland"]').click()
        check('storage-fixture:scene-and-puzzle-restored',snapshot(page)['scene']==saved['scene'] and snapshot(page)['puzzle']==2)
        check('storage-fixture:exact-position-restored',abs(snapshot(page)['player']['x']-saved['player']['x'])<.01)
        depth(page,2);move_to(page,1260);page.keyboard.press('e')
        check('puzzle:complete-in-order',snapshot(page)['phase']=='outcome')
        page.screenshot(path=str(OUT/'02_puzzle.png'),full_page=True)
        page.locator('#confirm').click();move_to(page,page.evaluate('BADLANDS_V2.scene(BADLANDS_DEBUG.snapshot()).width-100'));page.keyboard.press('e')
        check('exit:real-transition-retains-progress',snapshot(page)['scene']=='wy_briefing' and 'wy_power' in snapshot(page)['done'])
        open_scene(page,'predator','pred_crystal_cave');depth(page,0);move_to(page,500)
        page.keyboard.down('f');page.wait_for_function('BADLANDS_DEBUG.snapshot().phase==="outcome"',timeout=10000);page.keyboard.up('f')
        check('combat:keyboard-training-complete',snapshot(page)['event']=='training-ended')
        page.screenshot(path=str(OUT/'03_combat.png'),full_page=True)
        open_scene(page,'predator','pred_camp');page.keyboard.press('Space');page.wait_for_timeout(100)
        check('jump:visible-height-state',snapshot(page)['player']['z']>0);page.wait_for_timeout(900)
        page.screenshot(path=str(OUT/'04_meute.png'),full_page=True)
        page.locator('#pause').click();t=snapshot(page)['elapsed'];page.wait_for_timeout(250)
        check('pause:clock-frozen',snapshot(page)['elapsed']==t)
        page.locator('#confirm').click();page.locator('#menuButton').click();t=snapshot(page)['elapsed'];page.wait_for_timeout(250)
        check('menu:clock-frozen',snapshot(page)['elapsed']==t)
        page.locator('#closeMenu').click();page.locator('#codex').click()
        page.wait_for_function('document.querySelectorAll("#artGrid img").length===18 && [...document.querySelectorAll("#artGrid img")].every(i=>i.complete&&i.naturalWidth>0)')
        check('codex:18-original-svg-loaded',True);page.screenshot(path=str(OUT/'05_codex.png'),full_page=True)
        mobile=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,device_scale_factor=1)
        mp=mobile.new_page();mp.on('pageerror',lambda err:errors.append(str(err)));load(mp)
        mp.locator('[data-new="predator"]').tap();mp.locator('#confirm').tap()
        before=snapshot(mp)['player']['depth'];mp.locator('[data-action="depth"]').tap()
        check('mobile:depth-touch',snapshot(mp)['player']['depth']==(before+1)%4)
        b=mp.locator('[data-hold="right"]');b.scroll_into_view_if_needed();rect=b.bounding_box();mp.mouse.move(rect['x']+rect['width']/2,rect['y']+rect['height']/2);mp.mouse.down();mp.wait_for_timeout(150)
        mp.dispatch_event('[data-hold="right"]','pointercancel',{'pointerId':1});mp.mouse.up()
        check('mobile:pointer-cancel-clears-input',not mp.evaluate('Boolean(BADLANDS_DEBUG.input().right)'))
        check('mobile:no-horizontal-overflow',mp.evaluate('document.documentElement.scrollWidth<=innerWidth'))
        mp.screenshot(path=str(OUT/'06_mobile.png'),full_page=True)
        load(page,'qa=1&campaign=predator&scene=pred_camp');page.locator('#confirm').click();page.locator('#codex').click()
        page.wait_for_function('document.querySelectorAll("#artGrid img").length===18 && [...document.querySelectorAll("#artGrid img")].every(i=>i.complete&&i.naturalWidth>0)')
        check('standalone:inline-offline-18-images',not network)
        load(page,fixture=False);page.locator('[data-new="weyland"]').click();page.locator('#confirm').click();page.locator('#save').click()
        check('storage:opaque-origin-error-reported-not-fatal','Échec de sauvegarde' in page.locator('#storage').inner_text() and snapshot(page)['phase']=='play')
        check('no-javascript-errors',not errors)
        browser.close()
finally:
    result={'checksPassed':len(checks),'checks':checks,'javascriptErrors':errors,'externalRequests':network,
            'browserMode':'in-memory Chromium about:blank; external navigation disabled by environment policy',
            'storageMode':'declared in-memory Storage fixture; not a real-origin disk reload certification',
            'scope':'69 scene loads + selected keyboard/touch workflows; not a full human playthrough',
            'screenshots':sorted(x.name for x in OUT.glob('*.png'))}
    (OUT/'browser-validation.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'checksPassed':len(checks),'javascriptErrors':errors}))
