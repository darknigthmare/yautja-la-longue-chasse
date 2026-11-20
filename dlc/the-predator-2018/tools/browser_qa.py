#!/usr/bin/env python3
import base64, json, pathlib, shutil, subprocess, time
import requests, websocket

ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'docs'; CAPS=OUT/'captures'; CAPS.mkdir(parents=True,exist_ok=True)
DEBUG=9444
BASE=(ROOT/'JOUER_THE_PREDATOR_2018_V0_5.html').read_text()
TOKEN="window.__TP_QA_QUERY=window.__TP_QA_QUERY||'';"


def wait_http(url, timeout=8):
    end=time.time()+timeout
    while time.time()<end:
        try:
            r=requests.get(url,timeout=.35)
            if r.ok:return r
        except Exception: pass
        time.sleep(.08)
    raise RuntimeError(f'HTTP indisponible: {url}')


def cdp(ws):
    seq=0
    def call(method,params=None):
        nonlocal seq;seq+=1;ident=seq
        ws.send(json.dumps({'id':ident,'method':method,'params':params or {}}))
        while True:
            msg=json.loads(ws.recv())
            if msg.get('id')==ident:
                if 'error' in msg: raise RuntimeError(msg['error'])
                return msg.get('result',{})
    return call


def new_page(query='', prelude=''):
    info=requests.put(f'http://127.0.0.1:{DEBUG}/json/new?about:blank',timeout=2).json()
    ws=websocket.create_connection(info['webSocketDebuggerUrl'],timeout=5)
    call=cdp(ws);call('Page.enable');call('Runtime.enable')
    frame=call('Page.getFrameTree')['frameTree']['frame']['id']
    html=BASE.replace(TOKEN,'window.__TP_QA_QUERY='+json.dumps('?'+query if query else '')+';'+prelude)
    call('Page.setDocumentContent',{'frameId':frame,'html':html})
    return info,ws,call


def close_page(info,ws):
    try: ws.close()
    except Exception: pass
    try: requests.get(f"http://127.0.0.1:{DEBUG}/json/close/{info['id']}",timeout=1)
    except Exception: pass


def evaluate(call,expr):
    r=call('Runtime.evaluate',{'expression':expr,'returnByValue':True,'awaitPromise':True})
    return r.get('result',{}).get('value')


def wait_ready(call,scene=None,timeout=3.0):
    end=time.time()+timeout;last=None
    while time.time()<end:
        last=evaluate(call,"({scene:document.documentElement.dataset.qaScene||'',room:Number(document.documentElement.dataset.qaRoom||-1),screen:document.documentElement.dataset.qaScreen||'',campaign:document.documentElement.dataset.qaCampaign||'',runtimeError:document.documentElement.dataset.runtimeError||'',errors:window.__TP_QA?.errors||[],ready:document.readyState,encounter:document.documentElement.dataset.qaEncounter||''})")
        if last and last.get('ready')=='complete' and window_ready(last,scene): return last
        time.sleep(.05)
    return last


def window_ready(info,scene):
    if not info:return False
    if info.get('runtimeError') or info.get('errors'):return True
    return bool(info.get('scene')) if scene else bool(info.get('screen'))


def shot(call,path):
    r=call('Page.captureScreenshot',{'format':'png','captureBeyondViewport':False})
    path.write_bytes(base64.b64decode(r['data']))


def key(call,code,hold=.04):
    keyname={'Space':' ','ArrowRight':'ArrowRight','ArrowLeft':'ArrowLeft','ArrowUp':'ArrowUp','ArrowDown':'ArrowDown','ShiftLeft':'Shift','KeyC':'c','KeyV':'v','KeyT':'t','KeyF':'f','KeyR':'r','KeyX':'x','KeyG':'g'}.get(code,code)
    call('Input.dispatchKeyEvent',{'type':'keyDown','code':code,'key':keyname});time.sleep(hold)
    call('Input.dispatchKeyEvent',{'type':'keyUp','code':code,'key':keyname})


def main():
    chrome=None
    try:
        profile='/tmp/tp2018-v05-chrome';shutil.rmtree(profile,ignore_errors=True)
        chrome=subprocess.Popen(['chromium','--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--no-first-run',f'--remote-debugging-port={DEBUG}','--remote-allow-origins=*',f'--user-data-dir={profile}','--window-size=1440,900','about:blank'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        wait_http(f'http://127.0.0.1:{DEBUG}/json/version')
        data=json.loads((ROOT/'src/data/game-data.json').read_text());results=[]
        # Exhaustive scene load in one browser runtime. loadScene() clears overlays and
        # reinitializes the scene, so this validates all 52 scene payloads without
        # paying the cost of creating 52 Chromium targets.
        info,ws,call=new_page('qa=menu');wait_ready(call,None)
        try:
            for camp in ('human','predator'):
                for i,s in enumerate(data['campaigns'][camp]['scenes']):
                    room=max(0,len(s['route'])-1)
                    evaluate(call,f"window.__TP_NATIVE_API.start({json.dumps(camp)},{i},{room}); true")
                    time.sleep(.035)
                    qa=evaluate(call,"({scene:document.documentElement.dataset.qaScene||'',room:Number(document.documentElement.dataset.qaRoom||-1),screen:document.documentElement.dataset.qaScreen||'',campaign:document.documentElement.dataset.qaCampaign||'',runtimeError:document.documentElement.dataset.runtimeError||'',errors:window.__TP_QA?.errors||[],encounter:document.documentElement.dataset.qaEncounter||'',phase:document.documentElement.dataset.qaPhase||'',wave:document.documentElement.dataset.qaWave||''})")
                    ok=bool(qa and qa['scene']==s['id'] and qa['room']==room and qa.get('encounter') and not qa['runtimeError'] and not qa['errors'])
                    results.append({'campaign':camp,'scene':s['id'],'room':room,'ok':ok,'info':qa})
                    if not ok: print('FAIL',camp,s['id'],room,qa)
        finally:
            close_page(info,ws)

        interactions=[]
        info,ws,call=new_page('qa=scene&campaign=predator&i=6&room=1');wait_ready(call,'P07')
        for code in ('KeyC','KeyV','ShiftLeft','KeyT','KeyF','Space','KeyX'):key(call,code)
        pred=evaluate(call,"({error:document.documentElement.dataset.runtimeError||'',errors:window.__TP_QA?.errors||[],scene:document.documentElement.dataset.qaScene,room:document.documentElement.dataset.qaRoom,native:window.__TP_NATIVE_API?.version||''})")
        interactions.append({'name':'predator-controls','ok':not pred['error'] and not pred['errors'] and pred['native']=='0.5.0-candidate.1','info':pred});close_page(info,ws)

        info,ws,call=new_page('qa=scene&campaign=human&i=7&room=1');wait_ready(call,'H08')
        for code in ('ShiftLeft','Space','KeyR','ArrowUp','ArrowDown','KeyX'):key(call,code)
        hum=evaluate(call,"({error:document.documentElement.dataset.runtimeError||'',errors:window.__TP_QA?.errors||[],scene:document.documentElement.dataset.qaScene,room:document.documentElement.dataset.qaRoom})")
        interactions.append({'name':'human-controls','ok':not hum['error'] and not hum['errors'],'info':hum});close_page(info,ws)

        # Transition + checkpoint.
        info,ws,call=new_page('qa=scene&campaign=human&i=1&room=0');wait_ready(call,'H02')
        call('Input.dispatchKeyEvent',{'type':'keyDown','code':'ArrowRight','key':'ArrowRight'});time.sleep(6.4);call('Input.dispatchKeyEvent',{'type':'keyUp','code':'ArrowRight','key':'ArrowRight'});time.sleep(.2)
        transition=evaluate(call,"({room:Number(document.documentElement.dataset.qaRoom||-1),checkpointRoom:Number(document.documentElement.dataset.qaCheckpointRoom||-1),event:window.__TP_QA?.lastHostEvent?.type||'',events:(window.__TP_QA?.hostEvents||[]).slice(-6).map(e=>e.type),error:document.documentElement.dataset.runtimeError||'',errors:window.__TP_QA?.errors||[]})")
        tok=bool(transition and transition['room']>=1 and transition['checkpointRoom']>=1 and 'checkpoint' in transition.get('events',[]) and 'room-enter' in transition.get('events',[]) and not transition['error'] and not transition['errors'])
        interactions.append({'name':'room-transition-checkpoint-host-event','ok':tok,'info':transition});close_page(info,ws)

        # localStorage unavailable.
        info,ws,call=new_page('qa=scene&campaign=human&i=0&room=0', "Object.defineProperty(window,'localStorage',{configurable:true,get(){throw new Error('qa-storage-blocked')}});")
        blocked=wait_ready(call,'H01');storage_ok=bool(blocked and blocked.get('scene')=='H01' and not blocked.get('runtimeError') and not blocked.get('errors'))
        interactions.append({'name':'storage-blocked-fallback','ok':storage_ok,'info':blocked});close_page(info,ws)

        # Migration v0.4 -> v0.5.
        info,ws,call=new_page('qa=menu');wait_ready(call,None)
        migration=evaluate(call,"(()=>{try{const q=window.__TP_QA;q.storageDel(q.saveKey);q.storageSet(q.legacyKey,JSON.stringify({human:{unlocked:9,last:7,checkpoint:{scene:7,room:2,hp:73,energy:61,ammo:5,cohesion:84,squadOrder:'hold'},clues:['legacy'],honors:['old'],records:{H01:{score:88,grade:'A'}}},_mirrorEvents:{E01:{human:true}}}));const migrated=q.migrateLegacy();const p=q.progress();return {migrated,scene:p.human?.checkpoint?.scene,room:p.human?.checkpoint?.room,hp:p.human?.checkpoint?.hp,cohesion:p.human?.checkpoint?.cohesion,order:p.human?.checkpoint?.squadOrder,mirror:p._mirrorEvents?.E01?.human,grade:p.human?.records?.H01?.grade,honors:p.human?.honors||[],error:document.documentElement.dataset.runtimeError||'',errors:q.errors||[]}}catch(e){return {migrated:false,error:String(e),errors:[]}}})()")
        mig_ok=bool(migration and migration.get('migrated') and migration.get('scene')==7 and migration.get('room')==2 and migration.get('hp')==73 and migration.get('cohesion')==84 and migration.get('order')=='hold' and migration.get('mirror') and migration.get('grade')=='A' and 'old' in migration.get('honors',[]) and not migration.get('error') and not migration.get('errors'))
        interactions.append({'name':'v04-save-migration','ok':mig_ok,'info':migration});close_page(info,ws)

        # Human cover mitigation.
        info,ws,call=new_page('qa=scene&campaign=human&i=7&room=1');wait_ready(call,'H08');time.sleep(.1)
        cover=evaluate(call,"(()=>{const q=window.__TP_QA;const moved=q.teleportToCover();return {moved,before:q.runtime()}})()")
        call('Input.dispatchKeyEvent',{'type':'keyDown','code':'KeyX','key':'x'});time.sleep(.18)
        covered=evaluate(call,"(()=>{const q=window.__TP_QA;const before=q.runtime();q.damagePlayerForQa(20);const after=q.runtime();return {before,after}})()")
        call('Input.dispatchKeyEvent',{'type':'keyUp','code':'KeyX','key':'x'})
        cover_ok=bool(cover and cover.get('moved') and covered and covered['before']['guard'] and covered['before']['hp']-covered['after']['hp']<15)
        interactions.append({'name':'human-cover-mitigation','ok':cover_ok,'info':covered});close_page(info,ws)

        # Upgrade organic armor absorbs part of incoming damage and persists in runtime state.
        info,ws,call=new_page('qa=scene&campaign=predator&i=12&room=0');wait_ready(call,'P13');time.sleep(.1)
        armor=evaluate(call,"(()=>{const q=window.__TP_QA;const before=q.runtime();q.damagePlayerForQa(20);const after=q.runtime();return {before,after}})()")
        armor_ok=bool(armor and armor['before']['armor']>=99 and armor['after']['armor']<armor['before']['armor'] and armor['before']['hp']-armor['after']['hp']<20)
        interactions.append({'name':'upgrade-organic-armor','ok':armor_ok,'info':armor});close_page(info,ws)

        # Scene grade + best-record persistence + host event.
        info,ws,call=new_page('qa=scene&campaign=human&i=0&room=0');wait_ready(call,'H01');time.sleep(.1)
        record=evaluate(call,"(()=>{const q=window.__TP_QA;q.completeSceneForQa();const p=q.progress();return {record:p.human?.records?.H01||null,event:q.lastHostEvent?.type||'',error:document.documentElement.dataset.runtimeError||'',errors:q.errors||[]}})()")
        record_ok=bool(record and record.get('record') and record['record'].get('grade') in ('S','A','B','C') and record.get('event')=='scene-complete' and not record.get('error') and not record.get('errors'))
        interactions.append({'name':'performance-grade-and-host-event','ok':record_ok,'info':record});close_page(info,ws)


        # Squad order + cohesion are live systems, not just metadata.
        info,ws,call=new_page('qa=scene&campaign=human&i=7&room=1');wait_ready(call,'H08');time.sleep(.12)
        squad=evaluate(call,"(()=>{const q=window.__TP_QA;const before=q.runtime();const order=q.cycleSquadOrderForQa('focus');q.damagePlayerForQa(12);const after=q.runtime();return {before,after,order,events:(q.hostEvents||[]).slice(-5).map(e=>e.type)}})()")
        squad_ok=bool(squad and squad.get('order')=='focus' and squad['after']['squadOrder']=='focus' and squad['after']['cohesion']<squad['before']['cohesion'] and 'squad-order' in squad.get('events',[]))
        interactions.append({'name':'squad-order-and-cohesion','ok':squad_ok,'info':squad});close_page(info,ws)

        # Predator takedown builds momentum.
        info,ws,call=new_page('qa=scene&campaign=predator&i=6&room=1');wait_ready(call,'P07');time.sleep(.12)
        prep=evaluate(call,"(()=>{const q=window.__TP_QA;return {moved:q.teleportEnemyNear(),before:q.runtime()}})()")
        key(call,'KeyC');key(call,'KeyT');time.sleep(.12)
        momentum=evaluate(call,"window.__TP_QA.runtime()")
        momentum_ok=bool(prep and prep.get('moved') and momentum and momentum.get('momentum',0)>prep['before'].get('momentum',0))
        interactions.append({'name':'predator-momentum-takedown','ok':momentum_ok,'info':{'before':prep,'after':momentum}});close_page(info,ws)

        # Finite reinforcement wave spawns and updates room state.
        info,ws,call=new_page('qa=scene&campaign=human&i=0&room=1');wait_ready(call,'H01');time.sleep(.12)
        wave=evaluate(call,"(()=>{const q=window.__TP_QA;q.clearEnemiesForQa();const before=q.runtime();const spawned=q.spawnWaveForQa();const after=q.runtime();return {spawned,before,after,events:(q.hostEvents||[]).slice(-5).map(e=>e.type)}})()")
        wave_ok=bool(wave and wave.get('spawned') and wave['after']['wave']==wave['before']['wave']+1 and wave['after']['enemiesAlive']>0 and 'reinforcement-wave' in wave.get('events',[]))
        interactions.append({'name':'finite-reinforcement-wave','ok':wave_ok,'info':wave});close_page(info,ws)

        # Host command protocol v2 returns a snapshot acknowledgement.
        info,ws,call=new_page('qa=scene&campaign=human&i=0&room=0');wait_ready(call,'H01');time.sleep(.12)
        command=evaluate(call,"(()=>new Promise(resolve=>{window.postMessage({source:'yautja-host',target:'the-predator-2018',id:'qa-snapshot',command:'snapshot'},'*');setTimeout(()=>{const ev=(window.__TP_QA.hostEvents||[]).filter(e=>e.type==='command-ack').at(-1);resolve({ack:ev?.payload||null,version:window.__TP_NATIVE_API?.version,protocol:window.__TP_NATIVE_API?.protocol,errors:window.__TP_QA.errors||[]})},120)}))()")
        command_ok=bool(command and command.get('ack') and command['ack'].get('ok') and command['ack'].get('command')=='snapshot' and command.get('protocol')==2 and not command.get('errors'))
        interactions.append({'name':'host-command-snapshot-v2','ok':command_ok,'info':command});close_page(info,ws)

        # Boss phase two announces its attack before executing it.
        info,ws,call=new_page('qa=scene&campaign=human&i=23&room=3');wait_ready(call,'H24');time.sleep(.12)
        boss=evaluate(call,"(()=>{const q=window.__TP_QA;const primed=q.primeBossForQa();return {primed,before:q.runtime()}})()")
        time.sleep(.35)
        boss_after=evaluate(call,"({runtime:window.__TP_QA.runtime(),events:(window.__TP_QA.hostEvents||[]).slice(-8).map(e=>e.type),errors:window.__TP_QA.errors||[]})")
        boss_ok=bool(boss and boss.get('primed') and boss_after and (boss_after['runtime'].get('bossTelegraph',0)>0 or 'boss-telegraph' in boss_after.get('events',[])) and not boss_after.get('errors'))
        interactions.append({'name':'boss-telegraph','ok':boss_ok,'info':boss_after});close_page(info,ws)

        # Completing both available viewpoints of E01 marks mirror mastery.
        info,ws,call=new_page('qa=scene&campaign=human&i=0&room=0');wait_ready(call,'H01');time.sleep(.1)
        mirror=evaluate(call,"(()=>{const q=window.__TP_QA;q.completeSceneForQa();const pred=window.TP_DATA.campaigns.predator.scenes.findIndex(s=>s.event==='E01');window.__TP_NATIVE_API.start('predator',pred,0);q.completeSceneForQa();const p=q.progress();return {pred,entry:p._mirrorEvents?.E01||null,mastery:q.mastery(),events:(q.hostEvents||[]).slice(-12).map(e=>e.type),errors:q.errors||[]}})()")
        mirror_ok=bool(mirror and mirror.get('pred',-1)>=0 and mirror.get('entry',{}).get('human') and mirror.get('entry',{}).get('predator') and 'mirror-complete' in mirror.get('events',[]) and not mirror.get('errors'))
        interactions.append({'name':'mirror-event-mastery','ok':mirror_ok,'info':mirror});close_page(info,ws)

        visual=[('menu','menu-v05.png'),('human','human-multizone-v05.png'),('fugitive','fugitive-v05.png'),('upgrade','upgrade-armor-v05.png'),('final','human-final-boss-v05.png'),('pred-final','predator-final-v05.png'),('timeline','timeline-mastery-v05.png'),('systems','systems-v05.png')]
        for q,name in visual:
            info,ws,call=new_page(f'qa={q}');wait_ready(call,None);time.sleep(.16);shot(call,CAPS/name);close_page(info,ws)

        all_ok=all(r['ok'] for r in results) and all(x['ok'] for x in interactions)
        report={'version':'0.5.0-candidate.1','scenesChecked':len(results),'scenesPassed':sum(r['ok'] for r in results),'interactions':interactions,'visualCaptures':[name for _,name in visual],'runtimeErrors':sum(0 if r['ok'] else 1 for r in results),'ok':all_ok}
        (OUT/'BROWSER_QA_RESULTS.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
        print(json.dumps(report,ensure_ascii=False,indent=2))
        return 0 if all_ok else 1
    finally:
        if chrome and chrome.poll() is None:
            chrome.terminate()
            try:chrome.wait(timeout=3)
            except subprocess.TimeoutExpired:chrome.kill()

if __name__=='__main__':raise SystemExit(main())
