#!/usr/bin/env node
/** Generate the Bible inventory from the reviewed JSON using the repository's OOXML engine. */
import { renderWorkbook } from './lib/workbook-ooxml.mjs';

const SOURCE = 'production/INVENTAIRE_BIBLE_20261122.json';
const OUTPUT = 'production/INVENTAIRE_BIBLE_20261122.xlsx';
const REPOSITORY = 'darknigthmare/yautja-la-longue-chasse';
const STATES = {
  RACCORDE: { label: 'Raccordé', style: 5 },
  PARTIEL_MISSION: { label: 'Mission partielle', style: 6 },
  VOISIN: { label: 'Système voisin', style: 8 },
  NON_COMMENCE_OBSERVE: { label: 'Sans raccord observé', style: 7 },
};
const WORK_LABELS = {
  actes_i_iii: 'Enfance et outils',
  actes_iv_vi: 'Vaisseau et retour au monde natal',
  actes_vii_ix: 'Navire, guerre et Warp',
  root: 'Transmission des aînés',
  bible_transversale: 'Production audio',
  'bible_transversale / MUS-01 selon disponibilité': 'Production audio · MUS‑01 selon disponibilité',
  'terre_isles / T-CT-01A': 'Pilote Terre · T-CT-01A',
};
const columns = definitions => definitions.map(([key, label, width]) => ({ key, label, width }));
const SUMMARY_COLUMNS = columns([
  ['label', 'Indicateur', 31], ['count', 'Nombre', 12], ['detail', 'Lecture du suivi', 84], ['source', 'Source', 29],
]);
const CAMPAIGN_COLUMNS = columns([
  ['order', 'Ordre', 9], ['id', 'Fiche', 15], ['title', 'Mission et rang', 32], ['source', 'Bible', 18],
  ['declared', 'Table de la Bible', 20], ['state', 'État sur main', 22], ['delivery', 'Livraison', 25],
  ['detail', 'Constat et reste', 59], ['proof', 'Preuves', 17],
]);
const CROSS_COLUMNS = columns([
  ['id', 'Point transverse', 31], ['state', 'État sur main', 22], ['delivery', 'Livraison', 25],
  ['detail', 'Constat et reste', 72], ['proof', 'Preuves', 17],
]);
const ADDENDUM_COLUMNS = columns([
  ['id', 'Pull request', 13], ['title', 'Avenant', 33], ['state', 'État observé', 27],
  ['detail', 'Périmètre et contrôles', 64], ['proof', 'Preuves', 17],
]);
const PROOF_COLUMNS = columns([
  ['id', 'Fiche ou chantier', 31], ['category', 'Nature', 25], ['proof', 'Référence à ouvrir', 95],
]);

const onlyText = value => typeof value === 'string' && value.trim() &&
  value.length <= 32_767 && !/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/u.test(value) &&
  ![...value].some(char => char.length === 1 && /[\uD800-\uDFFF]/u.test(char));
const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) &&
  new Date(value).toISOString().slice(0, 10) === value;
const validCommit = value => /^[a-f0-9]{40}$/.test(value);
const line = value => Number.isSafeInteger(value) && value > 0;
const joined = (...values) => values.filter(Boolean).join('\n');

function toLink(ref, base, commit) {
  if (/^https:\/\/[^/\s<>"'?#]+(?:[/?#][^\s<>"']*)?$/.test(ref)) return ref;
  if (/^(?:pull\/\d+|actions\/runs\/\d+(?:\/(?:artifacts|job)\/\d+)?)$/.test(ref)) return base + '/' + ref;
  const location = /^((?:app|docs|scripts|tests|public|production)\/[a-z0-9_./-]+)(#L\d+(?:-L\d+)?)?$/i.exec(ref);
  if (!location || location[1].split('/').some(part => !part || part === '.' || part === '..')) {
    throw new TypeError('Référence GitHub invalide · ' + ref);
  }
  return base + '/blob/' + commit + '/' + location[1] + (location[2] ?? '');
}

export function buildBibleInventoryWorkbook(input) {
  if (!validDate(input?.date) || !validCommit(input?.refMain) || input.depot !== REPOSITORY ||
      !onlyText(input.source) || !Array.isArray(input.missions) || !Array.isArray(input.transverses) ||
      !Array.isArray(input.aventants)) {
    throw new TypeError('Métadonnées de l’inventaire Bible invalides');
  }
  const base = 'https://github.com/' + input.depot;
  const bible = toLink(input.source, base, input.refMain);
  const commitUrl = base + '/commit/' + input.refMain;
  const current = input.actualiseLe ?? input.date;
  if (!validDate(current)) throw new TypeError('Date d’actualisation invalide');

  const ids = new Set();
  const counts = Object.fromEntries(Object.keys(STATES).map(key => [key, 0]));
  const proofRows = [];
  const deliveryLabel = item => item.etatDeLivraison ?? WORK_LABELS[item.chantierActif] ?? item.chantierActif ?? '';
  const detail = item => joined(item.observation, item.reste && 'Reste · ' + item.reste);
  const reference = (id, category, label, url) => {
    if (!onlyText(label)) throw new TypeError('Preuve invalide · ' + id);
    proofRows.push({ id, category, proof: label, proofUrl: url });
  };
  const collect = (id, values, category) => {
    if (values === undefined) return;
    if (!Array.isArray(values)) throw new TypeError('Liste de preuves invalide · ' + id);
    for (const value of new Set(values)) {
      if (!onlyText(value)) throw new TypeError('Preuve invalide · ' + id);
      reference(id, category, value, toLink(value, base, input.refMain));
    }
  };
  const proofsFor = (id, item) => {
    const first = proofRows.length;
    collect(id, item.preuves, 'Vérification initiale');
    collect(id, item.preuvesLivraison, 'Recette de livraison');
    const count = proofRows.length - first;
    return count ? { proof: count + (count === 1 ? ' lien' : ' liens'), proofUrl: proofRows[first].proofUrl } : {};
  };
  const register = (id, state) => {
    if (!onlyText(id) || ids.has(id) || !Object.hasOwn(STATES, state)) {
      throw new TypeError('Identifiant en double ou état inconnu · ' + id);
    }
    ids.add(id);
    return STATES[state].label;
  };

  const orders = new Set();
  const campaign = [...input.missions].sort((a, b) => a.ordre - b.ordre).map(item => {
    if (!/^R2-M\d{3}(?:\.\d+)?$/.test(item.id) || !line(item.ordre) || orders.has(item.ordre) ||
        !line(item.fiche) || !line(item.table?.ligne) || !onlyText(item.titre) || !onlyText(item.rang) ||
        !onlyText(item.table.etat) || !onlyText(item.observation)) {
      throw new TypeError('Fiche de campagne invalide · ' + item.id);
    }
    orders.add(item.ordre);
    const state = register(item.id, item.etatSurMain);
    counts[item.etatSurMain]++;
    reference(item.id, 'Table de la Bible', 'Table · L' + item.table.ligne, bible + '#L' + item.table.ligne);
    return {
      order: item.ordre, id: item.id, title: joined(item.titre, item.rang),
      source: 'Fiche · L' + item.fiche, sourceUrl: bible + '#L' + item.fiche,
      declared: item.table.etat, state, delivery: deliveryLabel(item), detail: detail(item),
      ...proofsFor(item.id, item),
    };
  });
  const cross = input.transverses.map(item => ({
    id: item.id, state: register(item.id, item.etat), delivery: deliveryLabel(item),
    detail: detail(item), ...proofsFor(item.id, item),
  }));
  const addenda = input.aventants.map(item => {
    const id = '#' + item.pr;
    if (!line(item.pr) || ids.has(id) || !onlyText(item.titre) || !onlyText(item.observation) ||
        !/^https:\/\/github\.com\/[^/]+\/[^/]+\/pull\/\d+$/.test(item.url)) {
      throw new TypeError('Avenant invalide · ' + id);
    }
    ids.add(id);
    const first = proofRows.length;
    reference(id, 'Pull request', item.url, item.url);
    if (item.preuveRegression) collect(id, [item.preuveRegression], 'Régressions');
    for (const check of item.controles ?? []) {
      if (check.lien) reference(id, 'Contrôle · ' + (check.conclusion ?? 'en attente'), check.nom,
        toLink(check.lien, base, input.refMain));
    }
    for (const deployment of item.deploiement ?? []) {
      if (deployment.lien) reference(id, 'Déploiement · ' + deployment.etat, deployment.nom,
        toLink(deployment.lien, base, input.refMain));
    }
    const count = proofRows.length - first;
    return {
      id, title: item.titre, state: item.fusionnee ? 'Fusionnée' : item.etat === 'open' ? 'Ouverte' : 'Fermée',
      detail: joined(item.observation, item.fusionGitPossible === false && 'Conflits Git observés',
        item.echec && 'Test en échec · ' + item.echec),
      proof: count + (count === 1 ? ' lien' : ' liens'), proofUrl: item.url,
    };
  });

  const summary = [
    { label: 'Table de campagne', count: campaign.length, detail: 'Filtrer Campagne par état observé ou par livraison.', source: 'Table de la Bible', sourceUrl: bible + '#L35' },
    ...Object.entries(STATES).map(([key, { label }]) => ({
      label, count: counts[key], detail: input.statuts?.[key] ?? '', source: 'Révision de référence', sourceUrl: commitUrl,
    })),
    { label: 'Points transverses', count: cross.length, detail: 'Production et systèmes au-delà de la table de campagne.', source: 'Besoins transverses', sourceUrl: bible + '#L2539' },
    { label: 'Pull requests suivies', count: addenda.length, detail: 'Avenants, état Git, liens vers les contrôles et le déploiement.' },
    { label: 'Références vérifiables', count: proofRows.length, detail: 'Filtrer Preuves par identifiant. Chaque lien ouvre sa référence.' },
    { label: 'Périmètre de vérification', detail: joined(input.methode, ...(input.limites ?? [])) },
  ];
  const sheet = (name, title, columns, rows) => ({ name, title, columns, rows });
  const statusStyle = new Map(Object.values(STATES).map(({ label, style }) => [label, style]));
  return renderWorkbook({
    title: 'Suivi de la Bible de campagne',
    scope: 'État de la campagne, des points transverses et des avenants, avec références vérifiables.',
    asOf: current,
    release: 'Yautja · Bible',
    sheets: [
      sheet('Synthèse', 'Bible de campagne · suivi des raccords', SUMMARY_COLUMNS, summary),
      sheet('Campagne', 'Missions de la campagne', CAMPAIGN_COLUMNS, campaign),
      sheet('Transverses', 'Points transverses', CROSS_COLUMNS, cross),
      sheet('Avenants', 'Avenants et pull requests', ADDENDUM_COLUMNS, addenda),
      sheet('Preuves', 'Sources et preuves par identifiant', PROOF_COLUMNS, proofRows),
    ],
  }, {
    applicationName: 'Yautja · Suivi de la Bible',
    subtitle: 'Suivi au ' + current + ' · Base ' + input.refMain,
    maxRowHeight: 409,
    fitToPage: true,
    compactInlineText: true,
    displayRow: (_sheet, row) => row,
    styleValue: (value, alternate, key) => (key === 'state' || key === 'label' ? statusStyle.get(value) : undefined) ?? (alternate ? 4 : 0),
    rowLinks: row => [
      { key: 'source', url: row.sourceUrl, tooltip: 'Ouvrir la référence de la Bible ou le commit' },
      { key: 'proof', url: row.proofUrl, tooltip: 'Ouvrir la référence GitHub' },
    ],
  });
}

async function cli() {
  const { readFile, writeFile } = await import('node:fs/promises');
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length === 1 && args[0] !== '--check')) {
    throw new Error('Usage · node scripts/build-bible-inventory-workbook-20261122.mjs [--check]');
  }
  const root = new URL('../', import.meta.url);
  const input = JSON.parse(await readFile(new URL(SOURCE, root), 'utf8'));
  const workbook = buildBibleInventoryWorkbook(input);
  const output = new URL(OUTPUT, root);
  if (args[0] === '--check') {
    const present = await readFile(output);
    if (present.length !== workbook.length || present.some((byte, index) => byte !== workbook[index])) {
      throw new Error('Le classeur diffère de son inventaire JSON.');
    }
  } else {
    await writeFile(output, workbook);
  }
  console.log(JSON.stringify({ result: args[0] === '--check' ? 'PASS_REPRODUCIBLE_BYTES' : 'GENERATED', bytes: workbook.length }));
}

if (typeof process !== 'undefined' && process.argv[1]) {
  const { pathToFileURL } = await import('node:url');
  if (pathToFileURL(process.argv[1]).href === import.meta.url) await cli();
}
