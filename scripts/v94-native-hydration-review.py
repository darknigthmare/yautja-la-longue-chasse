"""Temporary reviewed blob transport, no branch/commit writes or dependency execution."""
import hashlib, json, os, pathlib, urllib.request
files = {
    'app/game/ClanWarPanelV85.tsx': ('7b0347b69306b3a7ca9c32286894169f335fcf75', [
        ('const { simulation, canyon, selection, storageMessage, persistedCanyon, pendingWrites, canRetryPersistence }', 'const { simulation, canyon, selection, storageMessage, persistedCanyon, pendingWrites, canRetryPersistence, loaded }'),
        ('  return <section className={styles.panel} aria-labelledby="clan-war-v85-title"', '  if (!loaded) return <section className={styles.panel} aria-labelledby="clan-war-loading-title" data-clan-war-v85="loading" inert={suspended} ref={root}><h2 id="clan-war-loading-title">Archives des exercices</h2><p role="status">Vérification des archives et des écritures interrompues…</p><button type="button" onClick={onClose}>Retour</button></section>;\n\n  return <section className={styles.panel} aria-labelledby="clan-war-v85-title"'),
    ]),
    'scripts/qa-clan-war-browser-v94.mjs': ('5dadfa351c9b042891749224575444c331f53c3b', [
        ('for(const p of [page,second])await p.evaluate(()=>{', 'for(const p of [page,second])await p.evaluate(async()=>{'),
        ("window.__sessionV94.subscribe(()=>{});if(!window.__sessionV94.getSnapshot().loaded)", "window.__sessionV94.subscribe(()=>{});await window.__sessionV94.whenSettled();if(!window.__sessionV94.getSnapshot().loaded)"),
        ("await page.evaluate(()=>{const a=window.__warApiV94;window.__sessionV94=a.createWarSessionV85(()=>localStorage);window.__sessionV94.subscribe(()=>{});window.__sessionV94.setSimulation", "await page.evaluate(async()=>{const a=window.__warApiV94;window.__sessionV94=a.createWarSessionV85(()=>localStorage);window.__sessionV94.subscribe(()=>{});await window.__sessionV94.whenSettled();window.__sessionV94.setSimulation"),
        ("console.log('CONCURRENCY_TRACE '+JSON.stringify({runs,traces}));", "console.log('CONCURRENCY_TRACE '+JSON.stringify({runs,traces:traces.map(t=>({writes:t.trace.filter(e=>e.action==='write').length,turn:t.snapshot.simulation.turn,persisted:t.snapshot.persistedWar,message:t.snapshot.storageMessage}))}));"),
    ]),
}
for path, (before, edits) in files.items():
    original = pathlib.Path(path).read_bytes()
    digest = hashlib.sha1(b'blob '+str(len(original)).encode()+b'\0'+original).hexdigest()
    assert digest == before, path
    text = original.decode()
    for old, new in edits:
        assert text.count(old) == 1, (path,old)
        text = text.replace(old,new)
    content = text.encode()
    after = hashlib.sha1(b'blob '+str(len(content)).encode()+b'\0'+content).hexdigest()
    payload=json.dumps({'content':text,'encoding':'utf-8'}).encode()
    request=urllib.request.Request('https://api.github.com/repos/darknigthmare/yautja-la-longue-chasse/git/blobs',data=payload,headers={'Authorization':'Bearer '+os.environ['GH_TOKEN'],'Accept':'application/vnd.github+json','Content-Type':'application/json'},method='POST')
    with urllib.request.urlopen(request,timeout=30) as response: result=json.load(response)
    assert result['sha']==after
    print('PUBLISHED_REVIEWED_BLOB',path,result['sha'])
