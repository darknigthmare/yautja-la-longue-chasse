#!/usr/bin/env node
/**
 * V112 hunting-mechanics workbook. Deterministic OOXML ZIP, without dependencies.
 * The JSON is the editable source. Validation statuses describe execution only
 * when the source explicitly includes its command, commit and result.
 */
import { renderWorkbook, utf8 } from './lib/workbook-ooxml.mjs';

const SOURCE_PATH = 'docs/hunt-mechanics-v112.json';
const OUTPUT_PATH = 'docs/YAUTJA_V112_MECANIQUES_CHASSE.xlsx';

function statusStyle(value, alternate, schemaVersion = 2) {
  if (value === 'VALIDE_AUTOMATISE') return 5;
  if (value === 'DOCUMENTE') return 8;
  if (value === 'IMPLEMENTE_A_VALIDER') return schemaVersion === 1 ? 5 : 6;
  if (value === 'PARTIELLEMENT_QUALIFIE') return 6;
  if (value === 'NON_QUALIFIE') return 6;
  if (value === 'A_EXECUTER') return 7;
  if (value === 'BASE_V111') return 8;
  return alternate ? 4 : 0;
}
export function sourceUrl(source, row) {
  if (!row.source) return null;
  if (row.source.startsWith('https://github.com/' + source.repository + '/actions/runs/') &&
      /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/actions\/runs\/\d+$/.test(row.source)) return row.source;
  const pinned = /^https:\/\/github\.com\/([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)\/blob\/([a-f0-9]{40})\/((?:app|docs|scripts|tests|public)\/[A-Za-z0-9_./-]+)$/.exec(row.source);
  if (pinned && pinned[1] === source.repository &&
      pinned[3].split('/').every(part => part && part !== '.' && part !== '..')) return row.source;
  if (/^[A-Za-z][A-Za-z0-9+.-]*:/.test(row.source)) throw new TypeError('Source URL must pin an allowed path in this repository');
  if (!/^(app|docs|scripts|tests|public)\/[A-Za-z0-9_./-]+$/.test(row.source) && row.source !== 'README.md') return null;
  const ref = row.status === 'BASE_V111' ? source.baseCommit : source.reviewRef;
  return 'https://github.com/' + source.repository + '/blob/' + encodeURIComponent(ref) + '/' + row.source.split('/').map(encodeURIComponent).join('/');
}

const EVIDENCE_ACCEPTANCE_UPDATES_V112 = new Set(['QA112-41','PRF112-03','PRF112-04']);
function invariantRowTextV112(row) {
  return JSON.stringify(Object.fromEntries(Object.entries(row)
    .filter(([key]) => key !== 'status' && !(key === 'acceptance' && EVIDENCE_ACCEPTANCE_UPDATES_V112.has(row.id)))
    .sort(([a],[b]) => a < b ? -1 : a > b ? 1 : 0)));
}
/** SHA-256 of canonical UTF-8 cells; checked independently by Node and Python. */
function sha256V112(text) {
  const input = utf8(text), size = Math.ceil((input.length + 9) / 64) * 64;
  const data = new Uint8Array(size); data.set(input); data[input.length] = 0x80;
  const view = new DataView(data.buffer), bits = input.length * 8;
  view.setUint32(size - 8, Math.floor(bits / 4294967296), false);
  view.setUint32(size - 4, bits >>> 0, false);
  const k = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  const h = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
  const rotate = (x,n) => (x >>> n) | (x << (32-n)), w = new Uint32Array(64);
  for (let offset=0; offset<size; offset+=64) {
    for (let i=0; i<16; i++) w[i] = view.getUint32(offset+i*4,false);
    for (let i=16; i<64; i++) {
      const x=w[i-15], y=w[i-2], s0=rotate(x,7)^rotate(x,18)^(x>>>3), s1=rotate(y,17)^rotate(y,19)^(y>>>10);
      w[i]=(w[i-16]+s0+w[i-7]+s1)>>>0;
    }
    let [a,b,c,d,e,f,g,z]=h;
    for (let i=0; i<64; i++) {
      const s1=rotate(e,6)^rotate(e,11)^rotate(e,25), ch=(e&f)^(~e&g), t1=(z+s1+ch+k[i]+w[i])>>>0;
      const s0=rotate(a,2)^rotate(a,13)^rotate(a,22), maj=(a&b)^(a&c)^(b&c), t2=(s0+maj)>>>0;
      z=g;g=f;f=e;e=(d+t1)>>>0;d=c;c=b;b=a;a=(t1+t2)>>>0;
    }
    [a,b,c,d,e,f,g,z].forEach((value,index)=>{h[index]=(h[index]+value)>>>0;});
  }
  return h.map(value=>value.toString(16).padStart(8,'0')).join('');
}

/** Preserve the original backlog and reject status changes without traceable evidence. */
function validateClosure(source) {
  const baseline = source.closureBaseline;
  if (!baseline || !/^[a-f0-9]{40}$/.test(baseline.commit) || !/^[a-f0-9]{40}$/.test(baseline.sourceBlobSha) ||
      !Array.isArray(baseline.rows) || baseline.rows.length !== 362) throw new TypeError('V112 closure baseline required');
  const heritageSheets = source.sheets.filter(s => !['Cloture', 'Restant', 'Reprise'].includes(s.name));
  if (heritageSheets.length !== 19) throw new TypeError('All original V112 sheets must remain');
  const current = new Map(heritageSheets.flatMap(s => s.rows.map(r => [r.id, r])));
  const baselineIds = new Set(baseline.rows.map(r => r.id));
  if (baselineIds.size !== 362 || baseline.rows.some(r => !current.has(r.id))) throw new TypeError('Original V112 identities must remain');
  for (const row of baseline.rows) {
    if (!/^[a-f0-9]{64}$/.test(row.contentSha256) || sha256V112(invariantRowTextV112(current.get(row.id))) !== row.contentSha256) throw new TypeError('Original V112 criterion changed outside the three evidence updates');
  }
  const statuses = new Set(['BASE_V111', 'IMPLEMENTE_A_VALIDER', 'VALIDE_AUTOMATISE', 'A_EXECUTER', 'NON_QUALIFIE', 'DOCUMENTE', 'PARTIELLEMENT_QUALIFIE']);
  for (const sheet of source.sheets) for (const row of sheet.rows) if (!statuses.has(row.status)) throw new TypeError('Unknown qualification status');
  const openStatuses = new Set(['IMPLEMENTE_A_VALIDER', 'A_EXECUTER', 'NON_QUALIFIE']);
  const reviewed = baseline.rows.filter(r => openStatuses.has(r.status));
  const records = source.sheets.find(s => s.name === 'Cloture')?.rows;
  const remainingRows = source.schemaVersion === 3 ? source.cycleBaseline?.remainingSheet?.rows : source.sheets.find(s => s.name === 'Restant')?.rows;
  if (!records || records.length !== reviewed.length || !remainingRows?.length) throw new TypeError('Every original open item and remaining limit must be visible');
  const targets = new Map(records.map(r => [r.target, r]));
  const remaining = new Map(remainingRows.map(r => [r.id, r]));
  if (targets.size !== reviewed.length) throw new TypeError('Repeated closure target');
  const requiredRemaining = Array.from({length:8}, (_,i) => 'REM112-' + String(i+1).padStart(2,'0'));
  if (remaining.size !== requiredRemaining.length || requiredRemaining.some(id => !remaining.has(id))) throw new TypeError('All human, physical and full-campaign limits must remain');
  const proofRows = new Map(source.sheets.filter(s => ['Qualification', 'Preuves'].includes(s.name)).flatMap(s => s.rows.map(r => [r.id, r])));
  for (const before of reviewed) {
    const record = targets.get(before.id), actual = current.get(before.id);
    if (!record || record.previous !== before.status || record.status !== actual.status || !record.scope || !record.source || !record.criterion) throw new TypeError('Closure record differs from original requirement');
    if (!/^[a-f0-9]{64}$/.test(before.criterionSha256) || sha256V112(record.criterion) !== before.criterionSha256) throw new TypeError('Original criterion archive changed');
    const proofs = String(record.proofs ?? '').split(',').filter(Boolean);
    const unresolved = String(record.remaining ?? '').split(',').filter(Boolean);
    if (proofs.some(id => !proofRows.has(id) || proofRows.get(id).status !== 'VALIDE_AUTOMATISE')) throw new TypeError('Closure proof was not executed');
    if (record.status === 'VALIDE_AUTOMATISE' && (!proofs.length || unresolved.length || record.kind !== 'AUTOMATISE')) throw new TypeError('Automatic closure needs a bounded executed proof');
    if (record.status === 'DOCUMENTE' && record.kind !== 'REVUE_DOCUMENTAIRE') throw new TypeError('Documented is not a behavioral test');
    if (['NON_QUALIFIE', 'PARTIELLEMENT_QUALIFIE', 'IMPLEMENTE_A_VALIDER', 'A_EXECUTER'].includes(record.status) && !unresolved.length) throw new TypeError('Open requirement needs an explicit next action');
    if (unresolved.some(id => !remaining.has(id) || !['NON_QUALIFIE', 'A_EXECUTER', 'IMPLEMENTE_A_VALIDER'].includes(remaining.get(id).status))) throw new TypeError('Remaining action not found');
  }
  if (remainingRows.some(r => !r.acceptance || !r.source || !['NON_QUALIFIE', 'A_EXECUTER', 'IMPLEMENTE_A_VALIDER'].includes(r.status))) throw new TypeError('Remaining actions need acceptance and explicit open status');
  for (const row of proofRows.values()) {
    if (row.status === 'VALIDE_AUTOMATISE' && (!/\bcommit [a-f0-9]{40}\b/.test(String(row.acceptance)) || !/\bcommande \S/.test(String(row.acceptance)))) throw new TypeError('Executed proof needs its commit and command');
  }
}

const CYCLE_BASELINE_V112 = {
  commit:'e4a6c64a1e77edad8865aa05ca7c2901d62bfa09',
  sourceJsonSha256:'76b33d9f2acadf9bc6f07f395c545c0873c83a41d27f5168ac083bb5a4b9a8ff',
  closureSheetSha256:'56358c148e54541cca896101215c2353d642b4ecea75dddfaea37593b9ca2456',
  remainingSheetSha256:'f11671a1ac604c61463215d631ff12ad9d6efea95f067b240b3dd3bea940f89d',
  closureBaselineSha256:'ccf1710981ca54e1c05d292a90d8d03475917c8da97c2c80febd6b011ce66a1d',
  reviewRef:'e1e45fbf85d843c26ac1bf4f816baf46313795b0',
};
function canonicalV112(value) {
  return JSON.stringify(value, (_, item) => item && typeof item === 'object' && !Array.isArray(item)
    ? Object.fromEntries(Object.entries(item).sort(([a],[b]) => a < b ? -1 : a > b ? 1 : 0)) : item);
}
export function createHuntCycleBaselineV112(source) {
  if (sha256V112(canonicalV112(source)) !== 'ee26b30695ff3cea3811cc2f05183bb1a83ffe960dea2a18c465b32f8cd17c17') throw new TypeError('Cycle snapshot must use the exact e4 source data');
  return {...CYCLE_BASELINE_V112, remainingSheet:JSON.parse(JSON.stringify(source.sheets.find(s => s.name === 'Restant')))};
}
function legacySourceBindingsV112(source) {
  const ids = new Set([
    ...source.closureBaseline.rows.map(r => r.id), 'ATL112-12','ATL112-13',
    ...Array.from({length:52},(_,i) => 'QA112-'+String(i+1).padStart(2,'0')),
    ...Array.from({length:12},(_,i) => 'PRF112-'+String(i+1).padStart(2,'0')),
    ...Array.from({length:219},(_,i) => 'CLS112-'+String(i+1).padStart(3,'0')),
    ...Array.from({length:8},(_,i) => 'REM112-'+String(i+1).padStart(2,'0')),
  ]);
  return Object.fromEntries(source.sheets.flatMap(s => s.rows).filter(r => ids.has(r.id) && r.source)
    .map(r => [r.id,sourceUrl(source,r)]).sort(([a],[b]) => a < b ? -1 : a > b ? 1 : 0));
}

/** Raw business statuses remain archival; only the rendered status is overlaid. */
export function resolveHuntReviewV112(source) {
  const states = new Map(source.sheets.filter(s => s.name !== 'Reprise').flatMap(s => s.rows.map(r => [r.id,r.status])));
  if (source.schemaVersion !== 3) return states;
  for (const row of source.cycleBaseline.remainingSheet.rows) states.set(row.id,row.status);
  for (const entry of source.sheets.find(s => s.name === 'Reprise').rows) {
    if (!states.has(entry.target) || states.get(entry.target) !== entry.previous) throw new TypeError('Review transition does not follow its previous status');
    states.set(entry.target,entry.status);
  }
  return states;
}
function validateReprise(source) {
  const baseline = source.cycleBaseline;
  if (!baseline || Object.entries(CYCLE_BASELINE_V112).some(([key,value]) => baseline[key] !== value)) throw new TypeError('Exact e4 cycle baseline required');
  const closure = source.sheets.find(s => s.name === 'Cloture');
  const remainingSheet = source.sheets.find(s => s.name === 'Restant');
  if (source.reviewRef !== baseline.reviewRef || sha256V112(canonicalV112(closure)) !== baseline.closureSheetSha256 ||
      sha256V112(canonicalV112(source.closureBaseline)) !== baseline.closureBaselineSha256 ||
      sha256V112(canonicalV112(baseline.remainingSheet)) !== baseline.remainingSheetSha256) throw new TypeError('Historical review and criteria snapshots must remain exact');
  const bindings = legacySourceBindingsV112(source);
  if (Object.keys(bindings).length !== 569 || sha256V112(canonicalV112(bindings)) !== '13b9547c6ddc97488018630b8762ce05354424b0ca70d5cfa82832a1feb13eff') throw new TypeError('All 569 historical source links must remain exact');
  const originals = new Map(closure.rows.map(r => [r.target,r.criterion]));
  const businessRows = new Map(source.sheets.filter(s => !['Cloture','Restant','Reprise'].includes(s.name)).flatMap(s => s.rows.map(r => [r.id,r])));
  if (source.closureBaseline.rows.some(row => !originals.has(row.id) && businessRows.get(row.id).status !== row.status)) throw new TypeError('Unreviewed historical statuses must remain unchanged');
  const oldRemaining = new Map(baseline.remainingSheet.rows.map(r => [r.id,r]));
  const currentRemaining = new Map(remainingSheet.rows.map(r => [r.id,r]));
  if (currentRemaining.size !== 8 || [...oldRemaining.keys()].some(id => !currentRemaining.has(id)) ||
      canonicalV112(remainingSheet.columns) !== canonicalV112(baseline.remainingSheet.columns) ||
      remainingSheet.title !== baseline.remainingSheet.title) throw new TypeError('All eight outstanding criteria must remain visible');
  for (const [id,before] of oldRemaining) {
    const now = currentRemaining.get(id);
    if (['id','topic','rule','source'].some(key => now[key] !== before[key]) || !now.acceptance.startsWith(before.acceptance)) throw new TypeError('Original remaining criterion must remain preserved');
    originals.set(id,before.rule+' | '+before.acceptance);
  }
  const proofs = new Map(source.sheets.filter(s => ['Qualification','Preuves'].includes(s.name)).flatMap(s => s.rows.map(r => [r.id,r])));
  const open = new Set(['NON_QUALIFIE','PARTIELLEMENT_QUALIFIE','A_EXECUTER','IMPLEMENTE_A_VALIDER']);
  const entries = source.sheets.find(s => s.name === 'Reprise')?.rows;
  if (!entries?.length || canonicalV112(source.sheets.find(s => s.name === 'Reprise').columns) !== canonicalV112(closure.columns)) throw new TypeError('An explicit continuation journal with the review columns is required');
  const states = new Map(source.sheets.filter(s => s.name !== 'Reprise').flatMap(s => s.rows.map(r => [r.id,r.status])));
  for (const row of baseline.remainingSheet.rows) states.set(row.id,row.status);
  const latest = new Map();
  for (const [index,entry] of entries.entries()) {
    if (entry.id !== 'RPR112-'+String(index+1).padStart(3,'0')) throw new TypeError('Continuation journal identities must follow their order');
    const evidence = String(entry.proofs ?? '').split(',').filter(Boolean);
    const pending = String(entry.remaining ?? '').split(',').filter(Boolean);
    const pinned = /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/blob\/([a-f0-9]{40})\//.exec(entry.source ?? '');
    if (!new Set(['VALIDE_AUTOMATISE','DOCUMENTE',...open]).has(entry.status) ||
        !new Set(['AUTOMATISE','AUTOMATISE_PARTIEL','REVUE_DOCUMENTAIRE','NON_QUALIFIE']).has(entry.kind)) throw new TypeError('Continuation status and evidence kind must be explicit');
    if (!originals.has(entry.target) || entry.criterion !== originals.get(entry.target) || !entry.scope || !pinned || sourceUrl(source,entry) !== entry.source) throw new TypeError('Continuation needs its original criterion, scope and pinned source');
    if (states.get(entry.target) !== entry.previous) throw new TypeError('Review transition does not follow its previous status');
    states.set(entry.target,entry.status);latest.set(entry.target,entry);
    if (evidence.some(id => !proofs.has(id) || proofs.get(id).status !== 'VALIDE_AUTOMATISE' || !String(proofs.get(id).acceptance).includes('commit '+pinned[1]))) throw new TypeError('Continuation evidence must be executed on its pinned source');
    if (entry.status === 'VALIDE_AUTOMATISE' && (entry.kind !== 'AUTOMATISE' || !evidence.length || pending.length)) throw new TypeError('Continuation closure requires complete executed evidence');
    if (entry.status === 'DOCUMENTE' && entry.kind !== 'REVUE_DOCUMENTAIRE') throw new TypeError('Continuation documentary scope must be explicit');
    if (entry.status === 'PARTIELLEMENT_QUALIFIE' && (entry.kind !== 'AUTOMATISE_PARTIEL' || !evidence.length)) throw new TypeError('Partial continuation requires executed evidence');
    if (open.has(entry.status) && !pending.length) throw new TypeError('Open continuation requires an outstanding action');
    if (pending.some(id => !currentRemaining.has(id) || !open.has(states.get(id)))) throw new TypeError('Continuation outstanding action is not open at that transition');
  }
  for (const entry of latest.values()) if (open.has(entry.status) && !String(entry.remaining).split(',').some(id => open.has(states.get(id)))) throw new TypeError('Current open review must retain an outstanding action');
  for (const [id,row] of currentRemaining) if (row.status !== states.get(id)) throw new TypeError('Current remaining status must follow its review journal');
  return states;
}

export function buildHuntMechanicsWorkbook(source) {
  if (![1, 2, 3].includes(source.schemaVersion) || source.release !== 'V112' || !/^\d{4}-\d{2}-\d{2}$/.test(source.asOf) || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(source.repository) || !/^[a-f0-9]{40}$/.test(source.baseCommit) || !source.reviewRef) throw new TypeError('Invalid V112 source metadata');
  if (source.schemaVersion >= 2 && source.printLayout !== undefined && (!source.printLayout ||
      Array.isArray(source.printLayout) || typeof source.printLayout !== 'object' ||
      Object.keys(source.printLayout).length !== 1 || typeof source.printLayout.fitToPage !== 'boolean')) throw new TypeError('Invalid V112 print layout option');
  const expectedSheets = source.schemaVersion === 3 ? 22 : source.schemaVersion === 2 ? 21 : 19;
  if (!Array.isArray(source.sheets) || source.sheets.length !== expectedSheets || new Set(source.sheets.map(s => s.name)).size !== expectedSheets) throw new TypeError('Unique worksheets do not match source schema');
  const seen = new Set();
  for (const sheet of source.sheets) {
    if (!sheet.name || sheet.name.length > 31 || /[\\/?*\[\]:]/.test(sheet.name) || !sheet.title || !Array.isArray(sheet.columns) || sheet.columns.length < 1 || sheet.columns.length > 26 || !Array.isArray(sheet.rows) || !sheet.rows.length) throw new TypeError('Invalid worksheet');
    if (new Set(sheet.columns.map(c => c.key)).size !== sheet.columns.length) throw new TypeError('Repeated column');
    for (const c of sheet.columns) if (!c.key || !c.label || !Number.isFinite(c.width) || c.width < 8 || c.width > 90) throw new TypeError('Invalid column');
    for (const row of sheet.rows) {
      if (!row.id || seen.has(row.id)) throw new TypeError('Missing or repeated rule ID');
      seen.add(row.id);
      for (const [key, value] of Object.entries(row)) if (!sheet.columns.some(c => c.key === key) || !['string','number'].includes(typeof value)) throw new TypeError('Unknown column or invalid cell value');
    }
  }
  if (source.schemaVersion >= 2) validateClosure(source);
  const effectiveStatuses = source.schemaVersion === 3 ? validateReprise(source) : resolveHuntReviewV112(source);
  const subtitle = source.release + ' · ' + source.asOf + (source.schemaVersion === 1
    ? ' · BASE_V111 / IMPLEMENTE_A_VALIDER / VALIDE_AUTOMATISE · preuves séparées'
    : ' · statuts et preuves par exigence · limites humaines/matérielles séparées');
  return renderWorkbook(source, {
    applicationName: 'Yautja Mechanics Workbook',
    subtitle,
    maxRowHeight: source.schemaVersion >= 2 ? 409 : 150,
    fitToPage: source.schemaVersion >= 2 && source.printLayout?.fitToPage === true,
    compactInlineText: source.schemaVersion >= 2,
    displayRow: (sheet, row) => source.schemaVersion === 3 && !['Cloture','Restant','Reprise'].includes(sheet.name)
      ? {...row, status:effectiveStatuses.get(row.id) ?? row.status} : row,
    styleValue: (value, alternate) => statusStyle(value, alternate, source.schemaVersion),
    rowLinks: row => [{ key: 'source', url: sourceUrl(source, row), tooltip: 'Ouvrir la source GitHub' }],
  });
}

async function cli() {
  const {readFile, writeFile} = await import('node:fs/promises');
  const {resolve} = await import('node:path');
  const {fileURLToPath} = await import('node:url');
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== '--check')) throw new Error('Usage: node scripts/build-hunt-mechanics-workbook-v112.mjs [--check]');
  const root = fileURLToPath(new URL('../', import.meta.url));
  const source = JSON.parse(await readFile(resolve(root, SOURCE_PATH), 'utf8'));
  const workbook = buildHuntMechanicsWorkbook(source);
  if (args.includes('--check')) {
    const current = await readFile(resolve(root, OUTPUT_PATH));
    if (current.length !== workbook.length || current.some((byte, i) => byte !== workbook[i])) throw new Error('V112 workbook differs from its JSON source');
  } else await writeFile(resolve(root, OUTPUT_PATH), workbook);
  const reviewCounts = {};
  if (source.schemaVersion === 3) {
    const records = source.sheets.find(s => s.name === 'Cloture').rows, current = resolveHuntReviewV112(source);
    const count = values => values.reduce((counts,status) => ({...counts,[status]:(counts[status]??0)+1}),{});
    reviewCounts.historicalClosureResults = count(records.map(r => r.status));
    reviewCounts.effectiveClosureResults = count(records.map(r => current.get(r.target)));
  }
  console.log(JSON.stringify({result: args.includes('--check') ? 'PASS_REPRODUCIBLE_BYTES' : 'GENERATED', sheets: source.sheets.length, rows: source.sheets.reduce((count, s) => count + s.rows.length, 0), bytes: workbook.length, nativeExcelExecuted: false,...reviewCounts}));
}
if (typeof process !== 'undefined' && process.argv[1] && import.meta.url === (await import('node:url')).pathToFileURL(process.argv[1]).href) await cli();
