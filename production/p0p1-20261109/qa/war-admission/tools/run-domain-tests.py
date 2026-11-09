#!/usr/bin/env python3
"""Read-only, low-priority admission checks; never writes runtime state or source."""
import hashlib,json,pathlib,re,subprocess,time
ROOT=pathlib.Path(__file__).resolve().parents[5]
OUT=ROOT/'production/p0p1-20261109/qa/war-admission'
NODE='/workspace/.cloud-tools/node22/node_modules/node/bin/node'
NAMES=['works-v6','structures-v89','source-maps-v128','rts24-source-v129','rts-squads-v133','rts-rally-v134','council-v146','council-v147','council-v147-victories','source-consolidation-v147','source-reconciliation-v147','provenance-gate-v152','source-dossiers-v117','geo-ai-multiplayer-v126','multiplayer-practice-v127','recruitment-v115','medical-v116','operation-cross-mode-v115','terrain-v116','assault-special-v117','four-modes-v135','four-modes-v140','four-modes-v141','four-modes-v142','four-modes-v143','four-modes-v144','four-modes-v145','four-modes-v147','four-modes-pr55-v144','four-modes-pr57-v144','outer-recall-continuity','stealth-last-contact','stealth-reconciliation','stealth-perception','integrated-last-contact-v150','operations-archive','fence-v94','planet-level-design-v156']
(OUT/'tests').mkdir(exist_ok=True)
rows=[]
for n in NAMES:
 p=ROOT/f'tests/clan-war-{n}.test.mjs'
 started=time.time();r=subprocess.run(['nice','-n','19',NODE,'--experimental-strip-types',str(p)],cwd=ROOT,capture_output=True,text=True)
 raw=r.stdout+r.stderr;log=OUT/'tests'/(p.name+'.tap');log.write_text(raw)
 val=lambda name:int((re.findall(r'^# '+name+r' (\d+)$',raw,re.M)or['0'])[-1])
 rows.append({'test':str(p.relative_to(ROOT)),'testSha256':hashlib.sha256(p.read_bytes()).hexdigest(),'exitCode':r.returncode,'tests':val('tests'),'pass':val('pass'),'fail':val('fail'),'skipped':val('skipped'),'durationSeconds':round(time.time()-started,3),'log':str(log.relative_to(OUT)),'logSha256':hashlib.sha256(log.read_bytes()).hexdigest()})
 print(n,rows[-1]['pass'],rows[-1]['fail'],r.returncode,flush=True)
 (OUT/'tests.json').write_text(json.dumps({'asOf':'2026-11-09','scope':'Pure domain reducers, structural source checks and explicitly isolated objective traversal; not full live mission/browser/server/art admission','runner':'Node22.23.4 --experimental-strip-types; sequential nice19','rows':rows,'pass':sum(x['pass']for x in rows),'fail':sum(x['fail']for x in rows),'allExitZero':all(x['exitCode']==0 for x in rows)},ensure_ascii=False,indent=2)+'\n')
raise SystemExit(0 if all(x['exitCode']==0 for x in rows)else 1)
