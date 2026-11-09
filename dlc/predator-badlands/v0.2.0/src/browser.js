(() => {
  'use strict';
  const G = globalThis.BADLANDS_V2, D = G.data, $ = id => document.getElementById(id);
  const canvas = $('game'), ctx = canvas.getContext('2d'), input = {};
  const ART = ['bone_bison','bud','cryo_grenade','dek','genna_vulture','kalisk','kwei','kwei_ship','luna_bug','njohrr','plasma_sword','power_loader','spike_pod','squirt_cannon','synth_drone','tessa','thia','tree_vine'];
  const sprites = {}, originals = {};
  let state = null, paused = false, last = performance.now(), autosave = 0, storageStatus = 'Sauvegarde locale indépendante';
  const clearInput = () => Object.keys(input).forEach(k => delete input[k]);
  const key = (cid, kind = 'auto') => `badlands.v2.${cid}.${kind}`;
  const blocked = () => paused || !$('menu').hidden || !$('codexPanel').hidden || document.hidden;
  async function loadArt() {
    await Promise.all(ART.map(async name => {
      try {
        const text = globalThis.BADLANDS_ART?.[name] || await (await fetch(`../v0.1.0/assets/svg/${name}.svg`)).text();
        originals[name] = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(text);
        // Background removal is a runtime presentation treatment; original SVG bytes stay untouched.
        const xml = new DOMParser().parseFromString(text, 'image/svg+xml');
        const bg = xml.documentElement.querySelector('rect[width="256"][height="256"]');
        if (bg) bg.remove();
        const img = new Image();
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(xml));
        await img.decode(); const normalized = document.createElement('canvas'); normalized.width = 256; normalized.height = 256; normalized.getContext('2d').drawImage(img, 0, 0, 256, 256); sprites[name] = normalized;
      } catch { /* Geometric fallback is explicit; never block the campaign. */ }
    }));
    renderCodex();
  }
  function candidates(cid) {
    const all = [];
    try {
      for (const kind of ['manual','auto']) for (const suffix of ['', '.bak']) {
        const raw = localStorage.getItem(key(cid, kind) + suffix);
        if (!raw) continue;
        try {const v = JSON.parse(raw); const restored = G.restore(v); if (restored.campaign === cid) all.push({state: restored, time: v.savedAt || 0});} catch { /* Try other slot/backup, do not overwrite it. */ }
      }
      const legacy = localStorage.getItem('tantalus.badlands.v0.1.0');
      if (!all.length && legacy) {const restored = G.restore(legacy); if (restored.campaign === cid) all.push({state: restored, time: 0});}
    } catch {storageStatus = 'Stockage indisponible : partie jouable sans sauvegarde.';}
    return all.sort((a, b) => b.time - a.time);
  }
  function persist(kind = 'auto') {
    if (!state) return;
    try {
      const target = key(state.campaign, kind), previous = localStorage.getItem(target);
      if (previous) {try {G.restore(previous); localStorage.setItem(target + '.bak', previous);} catch { /* Preserve a valid backup. */ }}
      localStorage.setItem(target, JSON.stringify({...state, savedAt: Date.now()}));
      storageStatus = `${kind === 'manual' ? 'Sauvegarde manuelle' : 'Point automatique'} · ${state.campaign === 'predator' ? 'Dek' : 'Weyland-Yutani'}`;
    } catch {storageStatus = 'Échec de sauvegarde : stockage bloqué ou plein.';}
    $('storage').textContent = storageStatus;
  }
  function start(cid, resume) {
    const saved = resume ? candidates(cid)[0] : null;
    if (resume && !saved) {storageStatus = 'Aucune sauvegarde valide pour cette campagne.'; $('storage').textContent = storageStatus; return;}
    state = saved ? saved.state : G.create(cid); paused = false; clearInput();
    $('menu').hidden = true; $('closeMenu').hidden = false; autosave = 0; showEvent(); canvas.focus();
  }
  function run(action) {
    if (!state || blocked()) return;
    const oldScene = state.scene, oldPhase = state.phase;
    state = G.action(state, action);
    if (state.scene !== oldScene || state.phase !== oldPhase) {clearInput(); persist(); showEvent();}
    updateHud();
  }
  function showEvent() {
    if (!state) {$('event').hidden = true; return;}
    const visible = ['intro','outcome','dead','finished'].includes(state.phase) || paused;
    $('event').hidden = !visible;
    if (!visible) return;
    $('eventTitle').textContent = paused ? 'Partie en pause' : state.phase === 'intro' ? G.scene(state).title : state.phase === 'dead' ? 'Chasse interrompue' : state.phase === 'finished' ? 'Campagne terminée' : 'Étape accomplie';
    $('eventText').textContent = paused ? 'La simulation, les attaques et les minuteries sont suspendues.' : state.phase === 'intro' ? `${G.scene(state).objective} ${state.message}` : state.message;
    $('confirm').textContent = paused ? 'Reprendre' : state.phase === 'dead' ? 'Recommencer la scène' : state.phase === 'finished' ? 'Campagnes' : 'Continuer';
    if ($('menu').hidden && $('codexPanel').hidden) $('confirm').focus();
  }
  function pauseGame() {if (!state || !$('menu').hidden || !$('codexPanel').hidden) return; paused = !paused; clearInput(); if (paused) persist(); showEvent();}
  function openMenu() {persist(); clearInput(); $('menu').hidden = false; $('closeMenu').hidden = !state; document.querySelector('[data-new]').focus();}
  function updateHud() {
    $('storage').textContent = storageStatus;
    if (!state) return;
    const spec = G.scene(state), w = G.weapon(state), ammo = state.ammo[state.gear[state.player.selected]];
    $('episode').textContent = `${state.campaign === 'predator' ? 'DEK' : 'WEYLAND-YUTANI'} · ${spec.chapter}/${D.campaigns.find(c => c.id === state.campaign).scenes.length}`;
    $('title').textContent = spec.title; $('objective').textContent = spec.objective;
    $('provenance').textContent = spec.bridge ? 'RACCORD ORIGINAL · PAS UNE SCÈNE CERTIFIÉE DU FILM' : 'SCÈNE HÉRITÉE v0.1 · REVUE LORE DÉTAILLÉE RESTANTE';
    $('health').value = state.player.hp;
    $('weapon').textContent = w.name + (w.kind === 'ranged' ? ` · ${ammo.loaded}/${ammo.reserve}` : '');
    $('resources').textContent = `Plan ${state.player.depth + 1}/4 · Soins ${state.player.medkits}${state.player.reload > 0 ? ' · Rechargement…' : ''}`;
    const count = state.nodes.filter(n => n.taken).length;
    $('status').textContent = state.phase === 'exit' ? 'Sas ouvert : rejoindre la sortie et utiliser E.' : `${state.message} ${state.nodes.length ? `${count}/${state.nodes.length}` : `${state.enemies.filter(e => e.hp > 0).length} menace(s)`}`;
  }
  function renderCodex() {
    $('artGrid').replaceChildren();
    for (const name of ART) {const f = document.createElement('figure'), im = document.createElement('img'), cap = document.createElement('figcaption'); im.src = originals[name] || `../v0.1.0/assets/svg/${name}.svg`; im.alt = name.replaceAll('_',' '); cap.textContent = im.alt; f.append(im, cap); $('artGrid').append(f);}
    $('chapters').replaceChildren();
    for (const c of D.campaigns) {const h = document.createElement('h3'), ol = document.createElement('ol'); h.textContent = `${c.title} · ${c.scenes.length}`; for (const s of c.scenes) {const li = document.createElement('li'); li.textContent = `${s.title} — ${s.bridge ? 'raccord original' : 'hérité v0.1'}`; ol.append(li);} $('chapters').append(h, ol);}
  }
  const lane = d => 628 - d * 88;
  function sprite(name, x, y, height, facing = 1, torso = false) {
    const im = sprites[name]; ctx.save(); ctx.translate(x, y); ctx.scale(facing, 1);
    if (im) {
      if (torso) ctx.drawImage(im,0,0,256,170,-height/2,-height*.67,height,height*.67);
      else { const bottom = ['bud','bone_bison','genna_vulture','kalisk','luna_bug'].includes(name) ? 222 : name === 'kwei_ship' ? 206 : 230; ctx.drawImage(im,-height/2,-height + height * (256-bottom)/256,height,height); }
    } else {ctx.fillStyle = '#9c9a75'; ctx.fillRect(-14,-50,28,50); ctx.beginPath(); ctx.arc(0,-62,13,0,Math.PI*2); ctx.fill();}
    ctx.restore();
  }
  function enemyArt(id) {if (/kalisk/.test(id)) return 'kalisk'; if (/bison/.test(id)) return 'bone_bison'; if (/vulture/.test(id)) return 'genna_vulture'; if (/luna/.test(id)) return 'luna_bug'; if (/kwei/.test(id)) return 'kwei'; if (/njohrr|clan_guard/.test(id)) return 'njohrr'; if (/loader/.test(id)) return 'power_loader'; if (/dek/.test(id)) return 'dek'; if (/vine/.test(id)) return 'tree_vine'; if (/pod|grass|trap|grub/.test(id)) return 'spike_pod'; if (/thia/.test(id)) return 'thia'; return 'synth_drone';}
  function draw() {
    const spec = state ? G.scene(state) : {environment: 'GENNA', width: 2600}, env = spec.environment;
    const bg = ctx.createLinearGradient(0,0,0,720); bg.addColorStop(0,env === 'YAUTJA' ? '#3d221e' : env === 'SPACE' ? '#0c132d' : '#203a30'); bg.addColorStop(1,'#030b07'); ctx.fillStyle = bg; ctx.fillRect(0,0,1280,720);
    const cam = state ? Math.max(0, Math.min(spec.width - 1280,state.player.x - 420)) : 0;
    for(let i=0;i<28;i++) {const x = i*150 - (cam*.3)%150; ctx.fillStyle = i%2 ? '#10271ddd' : '#142e2388'; if(env === 'GENNA') {ctx.beginPath();ctx.moveTo(x,600);ctx.lineTo(x+25,100+(i%5)*35);ctx.lineTo(x+95,600);ctx.fill();} else if(env === 'SPACE') {ctx.fillStyle='#d2d7cb';ctx.fillRect(x,(i*83)%430,2,2);} else {ctx.fillRect(x,180+(i%3)*70,110,380);ctx.strokeStyle='#476053';ctx.strokeRect(x+20,240+(i%3)*70,70,110);}}
    if (!state) return;
    ctx.font='13px system-ui';
    for(let d=3;d>=0;d--) {
      const y=lane(d);ctx.strokeStyle = d===state.player.depth?'#b3bc70':'#3a5141';ctx.lineWidth=d===state.player.depth?2:1;ctx.beginPath();ctx.moveTo(0,y+8);ctx.lineTo(1280,y+8);ctx.stroke();ctx.fillStyle='#a4b59e';ctx.fillText(`PLAN ${d+1}`,12,y+28);
      for(const n of state.nodes) if(n.depth===d&&!n.taken) {const x=n.x-cam;ctx.fillStyle='#b8d68c';ctx.fillRect(x-14,y-42,28,35);ctx.fillStyle='#0b1b13';ctx.fillText(String(state.nodes.indexOf(n)+1),x-4,y-19);ctx.fillStyle='#d7e3c8';ctx.fillText('E',x-3,y-55);}
      const actors = state.enemies.filter(e=>e.depth===d&&e.hp>0).map(e=>({x:e.x,kind:'enemy',e}));
      const carryThia = state.campaign==='predator' && spec.chapter < D.campaigns[1].scenes.find(s=>s.id==='pred_rescue').chapter;
      state.companions.filter(c=>c.depth===d && !(carryThia && c.id==='Thia')).forEach(c=>actors.push({x:c.x,kind:'companion',c}));
      if(state.player.depth===d) actors.push({x:state.player.x,kind:'player'});
      actors.sort((a,b)=>a.x-b.x);
      for(const a of actors) {
        const x=a.x-cam;
        if(x < -150 || x > 1430) continue;
        ctx.fillStyle='#0007';ctx.beginPath();ctx.ellipse(x,y+2,28,7,0,0,Math.PI*2);ctx.fill();
        if(a.kind==='enemy') {const e=a.e,h=/boss|kalisk|loader/.test(e.id)?140:90;sprite(enemyArt(e.id),x,y,h,e.x<state.player.x?1:-1);ctx.fillStyle='#17120e';ctx.fillRect(x-36,y-h-15,72,6);ctx.fillStyle=e.windup>0?'#f1cc6c':'#cb7b59';ctx.fillRect(x-36,y-h-15,72*e.hp/e.maxHp,6);if(e.windup>0){ctx.strokeStyle='#f1cc6c';ctx.beginPath();ctx.arc(x,y-40,42,0,Math.PI*2);ctx.stroke();}}
        else if(a.kind==='companion') sprite(a.c.id==='Bud'?'bud':a.c.id==='Thia'?'thia':'synth_drone',x,y,a.c.id==='Bud'?52:80,1,a.c.id==='Thia'&&spec.chapter<35);
        else {const p=state.player;const ship=spec.environment==='SPACE';if(carryThia && state.companions.some(c=>c.id==='Thia'))sprite('thia',x-22*p.facing,y-p.z-42,68,p.facing,true);sprite(ship?'kwei_ship':state.campaign==='predator'?'dek':'tessa',x,y-p.z,ship?125:100,p.facing);}
      }
      for(const shot of state.shots) if(shot.depth===d){ctx.strokeStyle='#e6c39a';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(shot.x-cam,y-43);ctx.lineTo(shot.end-cam,y-43);ctx.stroke();}
      for(const hit of state.hits) if(hit.depth===d){ctx.strokeStyle='#d2ed9a';ctx.beginPath();ctx.arc(hit.x-cam,y-45,10+30*(.3-hit.ttl),0,Math.PI*2);ctx.stroke();}
    }
    const exit=spec.width-110-cam;ctx.strokeStyle=state.phase==='exit'?'#bbdf8d':'#50604e';ctx.lineWidth=4;ctx.strokeRect(exit-22,470,44,150);ctx.fillStyle='#cbdbc0';ctx.fillText('SAS · E',exit-25,455);
    ctx.fillStyle='#14231a';ctx.fillRect(150,683,980,5);ctx.fillStyle='#b7cb7f';ctx.fillRect(150,683,980*state.player.x/spec.width,5);
  }
  function loop(now) {
    const dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;
    if(state&&!blocked()) {const phase=state.phase;state=G.step(state,dt,input);if(state.phase!==phase){clearInput();persist();showEvent();}autosave+=dt;if(autosave>5&&['play','exit'].includes(state.phase)){persist();autosave=0;}}
    draw();updateHud();requestAnimationFrame(loop);
  }
  const actions={KeyQ:'depth',Space:'jump',KeyE:'interact',KeyV:'cycle',KeyR:'reload',KeyH:'heal'};
  const held={KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right',KeyF:'fire'};
  window.addEventListener('keydown',e=>{
    if(e.code==='Escape'){pauseGame();return;}
    if(!state||blocked()||!['play','exit'].includes(state.phase))return;
    if(held[e.code]){e.preventDefault();input[held[e.code]]=true;}
    if(actions[e.code]){e.preventDefault();if(!e.repeat)run(actions[e.code]);}
  });
  window.addEventListener('keyup',e=>{if(held[e.code])delete input[held[e.code]];});
  window.addEventListener('blur',()=>{clearInput();if(state&&!blocked()){paused=true;persist();showEvent();}});
  document.addEventListener('visibilitychange',()=>{clearInput();if(document.hidden&&state){paused=true;persist();showEvent();}});
  document.querySelectorAll('[data-hold]').forEach(b=>{
    b.addEventListener('pointerdown',e=>{e.preventDefault();if(blocked()||!state)return;b.setPointerCapture(e.pointerId);input[b.dataset.hold]=true;});
    for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>{delete input[b.dataset.hold];});
  });
  document.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>run(b.dataset.action));
  document.querySelectorAll('[data-new]').forEach(b=>b.onclick=()=>start(b.dataset.new,false));
  document.querySelectorAll('[data-resume]').forEach(b=>b.onclick=()=>start(b.dataset.resume,true));
  $('confirm').onclick=()=>{if(paused){paused=false;showEvent();canvas.focus();return;}if(state.phase==='finished'){openMenu();return;}run(state.phase==='dead'?'retry':'confirm');canvas.focus();};
  $('save').onclick=()=>persist('manual');$('pause').onclick=pauseGame;$('menuButton').onclick=openMenu;
  $('closeMenu').onclick=()=>{$('menu').hidden=true;clearInput();showEvent();canvas.focus();};
  $('codex').onclick=()=>{clearInput();$('codexPanel').hidden=false;$('closeCodex').focus();};
  $('closeCodex').onclick=()=>{$('codexPanel').hidden=true;clearInput();showEvent();canvas.focus();};
  const query=new URLSearchParams(location.search || globalThis.BADLANDS_TEST_QUERY || '');
  if(query.get('qa')==='1') {globalThis.BADLANDS_DEBUG={snapshot:()=>state?JSON.parse(G.serialize(state)):null,input:()=>({...input})};const cid=query.get('campaign'),sid=query.get('scene');try{if(cid&&sid){state=G.create(cid,sid);$('menu').hidden=true;showEvent();}}catch{storageStatus='Paramètres de scène invalides : retour au menu.';}}
  loadArt();document.body.dataset.runtime='ready';requestAnimationFrame(loop);
})();
