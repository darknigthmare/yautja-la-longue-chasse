#!/usr/bin/env node
/** Generate the four-lot tracker from its reviewed JSON source. */
import { renderWorkbook } from './lib/workbook-ooxml.mjs';

const SOURCE = 'production/YAUTJA_LOTS_P0_P3_20261121.json';
const OUTPUT = 'production/YAUTJA_LOTS_P0_P3_20261121.xlsx';
const REPOSITORY = 'darknigthmare/yautja-la-longue-chasse';
const PRIORITIES = ['P0', 'P1', 'P2', 'P3'];
const LIMIT = 10;
const ENTRY_COLUMNS = [
  { key: 'id', label: 'ID', width: 25 },
  { key: 'source', label: 'Source', width: 38 },
  { key: 'sourceDetail', label: 'Cellule / section', width: 36 },
  { key: 'criterion', label: 'Critère d’acceptation', width: 64 },
  { key: 'status', label: 'État', width: 24 },
  { key: 'result', label: 'Résultat / reste', width: 65 },
  { key: 'evidence', label: 'Preuve et lien', width: 58 },
];
const SUMMARY_COLUMNS = [
  { key: 'priority', label: 'Lot', width: 15 },
  { key: 'entries', label: 'Exigences', width: 18 },
  { key: 'limit', label: 'Plafond', width: 17 },
  { key: 'states', label: 'États consignés', width: 50 },
  { key: 'source', label: 'Révision de départ', width: 48 },
];

function textValue(value, key, required = true) {
  if (
    typeof value !== 'string' || value.length > 32_767 ||
    /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/u.test(value) ||
    [...value].some(char => char.length === 1 && /[\uD800-\uDFFF]/u.test(char)) ||
    (required && !value.trim())
  ) throw new TypeError('Invalid text in ' + key);
  return value;
}

function itemForWorkbook(entry, allIds) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new TypeError('Invalid lot entry');
  const id = textValue(entry.id, 'id');
  if (!/^[A-Za-z0-9][A-Za-z0-9_.:-]*$/.test(id)) throw new TypeError('Invalid requirement ID: ' + id);
  if (allIds.has(id.toUpperCase())) throw new TypeError('Duplicate requirement ID: ' + id);
  allIds.add(id.toUpperCase());
  const evidence = Array.isArray(entry.evidence)
    ? entry.evidence.map((value, index) => textValue(value, id + '.evidence[' + index + ']')).join('\n')
    : entry.evidence;
  return {
    id,
    source: textValue(entry.source, id + '.source'),
    sourceDetail: textValue(entry.sourceDetail, id + '.sourceDetail', false),
    criterion: textValue(entry.criterion, id + '.criterion'),
    status: textValue(entry.status, id + '.status'),
    result: textValue(entry.result, id + '.result', false),
    evidence: textValue(evidence ?? '', id + '.evidence', false),
  };
}

function sourceLink(value, baseCommit) {
  if (/^https:\/\/[^\s<>"']+$/u.test(value)) return value;
  const [path, anchor] = value.split('#', 2);
  if (!/^(?:app|docs|scripts|tests|public|production)\/[A-Za-z0-9_./-]+$/.test(path) && path !== 'README.md') return null;
  if (path.split('/').some(part => !part || part === '..' || part === '.')) return null;
  return 'https://github.com/' + REPOSITORY + '/blob/' + baseCommit + '/' + path +
    (anchor ? '#' + encodeURIComponent(anchor) : '');
}

function stateTotals(rows) {
  const counts = new Map();
  for (const row of rows) counts.set(row.status, (counts.get(row.status) ?? 0) + 1);
  return [...counts].map(([status, count]) => status + ' · ' + count).join('\n') || 'Aucune exigence retenue';
}

export function buildPriorityLotsWorkbook(input) {
  if (
    input?.version !== 1 || !/^\d{4}-\d{2}-\d{2}$/.test(input.date) ||
    !Number.isFinite(Date.parse(input.date)) || new Date(input.date).toISOString().slice(0, 10) !== input.date ||
    !/^[a-f0-9]{40}$/.test(input.baseCommit) || !Array.isArray(input.lots) || input.lots.length !== PRIORITIES.length
  ) throw new TypeError('Invalid priority lots metadata');

  const byPriority = new Map();
  const allIds = new Set();
  for (const lot of input.lots) {
    if (
      !lot || !PRIORITIES.includes(lot.priority) || byPriority.has(lot.priority) ||
      lot.limit !== LIMIT || !Array.isArray(lot.entries) || lot.entries.length > LIMIT
    ) throw new TypeError('Each priority needs a unique lot with at most ' + LIMIT + ' entries');
    byPriority.set(lot.priority, lot.entries.map(entry => itemForWorkbook(entry, allIds)));
  }

  const sheets = PRIORITIES.map(priority => ({
    name: priority, title: 'Lot ' + priority, columns: ENTRY_COLUMNS, rows: byPriority.get(priority),
  }));
  const summary = {
    name: 'Synthèse', title: 'Suivi des lots P0 à P3', columns: SUMMARY_COLUMNS,
    rows: sheets.map(sheet => ({
      priority: sheet.name, entries: sheet.rows.length, limit: LIMIT,
      states: stateTotals(sheet.rows), source: input.baseCommit,
    })),
  };

  return renderWorkbook({
    title: summary.title, scope: 'Exigences distinctes, critères et résultats des quatre lots.',
    asOf: input.date, release: 'Yautja · Lots P0 à P3', sheets: [summary, ...sheets],
  }, {
    applicationName: 'Yautja Priority Lots Workbook',
    subtitle: input.date + ' · Base ' + input.baseCommit,
    maxRowHeight: 409,
    fitToPage: true,
    compactInlineText: true,
    displayRow: (_sheet, row) => row,
    styleValue: (_value, alternate) => alternate ? 4 : 0,
    rowLinks: (row, sheet) => {
      const git = 'https://github.com/' + REPOSITORY + '/commit/' + input.baseCommit;
      const evidence = row.evidence?.split('\n').find(line => sourceLink(line, input.baseCommit));
      return [
        { key: 'source', url: sheet === summary ? git : sourceLink(row.source, input.baseCommit), tooltip: 'Ouvrir la source' },
        { key: 'evidence', url: evidence ? sourceLink(evidence, input.baseCommit) : null, tooltip: 'Ouvrir la preuve' },
      ];
    },
  });
}

async function cli() {
  const { readFile, writeFile } = await import('node:fs/promises');
  const { resolve } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const args = process.argv.slice(2);
  const lots = args.filter(arg => arg === '--lot-2' || arg === '--lot-3');
  if (lots.length > 1 || new Set(args).size !== args.length || args.some(arg => arg !== '--check' && !lots.includes(arg))) {
    throw new Error('Usage: node scripts/build-priority-lots-workbook-20261121.mjs [--lot-2|--lot-3] [--check]');
  }
  const check = args.includes('--check');
  const number = lots[0]?.at(-1);
  const root = fileURLToPath(new URL('../', import.meta.url));
  const fileName = name => number ? name.replace('_20261121.', '_LOT' + number + '_20261121.') : name;
  const input = JSON.parse(await readFile(resolve(root, fileName(SOURCE)), 'utf8'));
  const workbook = buildPriorityLotsWorkbook(input);
  const path = resolve(root, fileName(OUTPUT));
  if (check) {
    const present = await readFile(path);
    if (present.length !== workbook.length || present.some((byte, i) => byte !== workbook[i])) {
      throw new Error('Priority lots workbook differs from its JSON source');
    }
  } else {
    await writeFile(path, workbook);
  }
  console.log(JSON.stringify({ result: check ? 'PASS_REPRODUCIBLE_BYTES' : 'GENERATED', bytes: workbook.length }));
}

if (typeof process !== 'undefined' && process.argv[1]) {
  const { pathToFileURL } = await import('node:url');
  if (pathToFileURL(process.argv[1]).href === import.meta.url) await cli();
}
