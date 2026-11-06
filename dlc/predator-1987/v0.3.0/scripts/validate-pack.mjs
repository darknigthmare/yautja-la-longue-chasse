import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const run=(cmd,args)=>spawnSync(cmd,args,{cwd:ROOT,encoding:'utf8'});
const steps=[];
function record(name,r){steps.push({name,status:r.status===0?'PASS':'FAIL',exitCode:r.status,stdout:(r.stdout||'').trim(),stderr:(r.stderr||'').trim()});if(r.status!==0){console.error(`${name}: FAIL\n${r.stderr||r.stdout}`);process.exit(r.status??1)}}
record('build standalone',run(process.execPath,['scripts/build.mjs']));
record('browser-engine syntax',run(process.execPath,['--check','src/browser-engine.js']));
record('automated tests',run(process.execPath,['--test','--test-reporter=tap','tests/content.test.mjs','tests/core.test.mjs','tests/installer.test.mjs','tests/standalone.test.mjs']));
const data=JSON.parse(readFileSync(join(ROOT,'src/game-data.json'),'utf8'));
const html=readFileSync(join(ROOT,'JOUER_PREDATOR_1987.html'),'utf8');
const checks={
  campaigns:data.campaigns.length===2,
  humanChapters:data.campaigns.find(c=>c.id==='human')?.chapters.length===16,
  predatorChapters:data.campaigns.find(c=>c.id==='predator')?.chapters.length===12,
  locations:data.locations.length===36,
  multiPlane:data.locations.some(l=>l.planes?.includes('canopée'))&&data.locations.some(l=>l.planes?.includes('plan-arriere')),
  intel36:data.locations.every(l=>l.fieldIntel?.x>0),
  mastery:data.campaigns.every(c=>c.chapters.every(ch=>ch.mastery?.length>=3)),
  allCanonBeats:data.campaigns.every(c=>c.chapters.every(ch=>Boolean(ch.canonBeat))),
  noAnnaPredatorTarget:!data.campaigns.find(c=>c.id==='predator').chapters.some(ch=>(ch.targets||[]).includes('anna')),
  noRemoteOfficialMedia:!/<(?:img|video|audio|source)[^>]+https?:/i.test(html),
  fullyStandalone:!/<script[^>]+src=/i.test(html)&&!/<link[^>]+href=/i.test(html),
  reportPresent:statSync(join(ROOT,'RAPPORT_PREDATOR_1987.html')).size>1000,
  codexPresent:statSync(join(ROOT,'CODEX_PREDATOR_1987.html')).size>1000,
};
if(Object.values(checks).some(v=>!v)){console.error('Static checks failed',checks);process.exit(1)}
const sha=(p)=>createHash('sha256').update(readFileSync(p)).digest('hex');
const files=[];
function walk(dir){for(const name of readdirSync(dir)){const p=join(dir,name);const rel=relative(ROOT,p);if(rel==='VALIDATION.json'||rel==='CHECKSUMS.sha256')continue;if(statSync(p).isDirectory())walk(p);else files.push({path:rel,bytes:statSync(p).size,sha256:sha(p)})}}
walk(ROOT);
const validation={
  generatedAt:new Date().toISOString(),
  version:data.version,
  baseRepository:data.baseRepo,
  baseCommit:data.baseCommit,
  status:'PASS_WITH_BROWSER_CAPTURE_ENV_LIMITATION',
  counts:{campaigns:2,humanChapters:16,predatorChapters:12,locations:36,characters:data.characters.length,sources:data.sources.length,tests:Number(steps.find(s=>s.name==='automated tests').stdout.match(/^# tests (\d+)$/m)?.[1]??0)},
  checks,
  steps,
  browserRuntimeCapture:{status:'NOT_CLAIMED',reason:'The execution environment blocks file:// and localhost browser navigation. Visuals in the report are labeled previsualisations and are not represented as executable screenshots.'},
  standalone:{file:'JOUER_PREDATOR_1987.html',bytes:statSync(join(ROOT,'JOUER_PREDATOR_1987.html')).size,sha256:sha(join(ROOT,'JOUER_PREDATOR_1987.html'))},
  files
};
writeFileSync(join(ROOT,'VALIDATION.json'),JSON.stringify(validation,null,2)+'\n');
console.log(`PASS: ${validation.counts.tests} tests, ${validation.counts.locations} locations, standalone ${validation.standalone.bytes} bytes`);
