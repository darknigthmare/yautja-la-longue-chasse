// Deterministic layout generator for the V6 "grandes traques". Output is a literal TS data module,
// so the game never runs this generator: what ships is reviewable, fixed geometry.
import fs from 'node:fs';
import path from 'node:path';
const ROOT = process.cwd(); // run from the repository root
const OUT = process.argv[2] ?? path.join(ROOT, 'app/game/systems/gameReserveGrandHuntData.ts');
const W = 19200, G = 438, SECTOR = 1600, TEAMS = 6;
const mulberry = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const R = (rnd, a, b) => Math.round(a + rnd() * (b - a));
const pick = (rnd, list) => list[Math.floor(rnd() * list.length)];
const DECOR = '/game/assets/v19/biome-decor/';
const sizeOf = src => {
  // WebP VP8/VP8L/VP8X header parse: avoids depending on an image library at generation time.
  const b = fs.readFileSync(path.join(ROOT, 'public', src));
  if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
    const chunk = b.toString('ascii', 12, 16);
    if (chunk === 'VP8X') return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
    if (chunk === 'VP8L') { const v = b.readUInt32LE(21); return [1 + (v & 0x3fff), 1 + (v >> 14 & 0x3fff)]; }
    if (chunk === 'VP8 ') return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
  }
  if (b.readUInt32BE(0) === 0x89504e47) return [b.readUInt32BE(16), b.readUInt32BE(20)];
  throw new Error('format inconnu ' + src);
};
const art = src => ({src, size: sizeOf(src)});
const trimmedAspect = a => (a.size[1] - 48) / (a.size[0] - 48); // native 24 px alpha margin removed

const KITS = {
  jungle: {
    platforms: ['plt/plt-root-bridge-01-low-wide', 'plt/plt-mossy-ruin-slab-01-low-wide', 'plt/plt-expedition-deck-01-low-wide', 'plt/plt-canopy-crown-01-low-wide',
      'plt/plt-root-bridge-04-broken', 'plt/plt-mossy-ruin-slab-04-broken', 'plt/plt-expedition-deck-04-broken'],
    covers: ['cov/cov-strangler-root-wall-01-narrow', 'cov/cov-ruined-idol-01-narrow', 'cov/cov-supply-palisade-01-narrow', 'cov/cov-strangler-root-wall-02-broad', 'cov/cov-supply-palisade-02-broad', 'cov/cov-ruined-idol-04-fallen'],
    hazards: {slow: 'haz/haz-flooded-sinkhole-02-linear', harm: 'haz/haz-collapsing-branch-02-linear', alarm: 'haz/haz-spectral-flare-tripwire-02-linear'},
    surfaces: ['srf/srf-crushed-fern-bed-02-trail', 'srf/srf-footprint-mud-02-trail', 'srf/srf-rain-puddle-02-trail', 'srf/srf-crushed-fern-bed-04-crater', 'srf/srf-footprint-mud-03-ridge'],
    ornaments: ['orn/orn-lake-reeds-01-single', 'orn/orn-lake-reeds-02-pair', 'orn/orn-storm-flower-01-single', 'orn/orn-transponder-debris-01-single', 'orn/orn-transponder-debris-04-fallen', 'orn/orn-storm-flower-04-fallen'],
    supports: ['clm/clm-buttress-trunk-01-straight', 'clm/clm-buttress-trunk-04-interrupted', 'clm/clm-hanging-vine-01-straight'],
    base: {ledge: 'plt/plt-root-bridge-01-low-wide', gantry: 'plt/plt-expedition-deck-01-low-wide', cover: 'cov/cov-strangler-root-wall-01-narrow'},
  },
  ice: {
    platforms: ['plt/plt-glacier-shelf-01-low-wide', 'plt/plt-crystal-bridge-01-low-wide', 'plt/plt-frozen-wreck-deck-01-low-wide', 'plt/plt-mine-gantry-01-low-wide',
      'plt/plt-glacier-shelf-04-broken', 'plt/plt-mine-gantry-04-broken', 'plt/plt-frozen-wreck-deck-04-broken'],
    covers: ['cov/cov-fractured-ice-pillar-01-narrow', 'cov/cov-frozen-cargo-stack-01-narrow', 'cov/cov-overturned-drill-01-narrow', 'cov/cov-frozen-cargo-stack-02-broad', 'cov/cov-overturned-drill-02-broad'],
    hazards: {slow: 'haz/haz-thin-ice-02-linear', harm: 'haz/haz-cryo-steam-vent-02-linear'},
    surfaces: ['srf/srf-snowdrift-track-02-trail', 'srf/srf-black-ice-02-trail', 'srf/srf-frost-shard-trail-02-trail', 'srf/srf-snowdrift-track-03-ridge', 'srf/srf-black-ice-05-transition'],
    ornaments: ['orn/orn-emergency-beacon-01-single', 'orn/orn-bone-cache-04-fallen', 'orn/orn-mineral-nodule-01-single', 'orn/orn-frozen-cordage-04-fallen', 'orn/orn-mineral-nodule-04-fallen'],
    supports: ['clm/clm-crystal-column-01-straight', 'clm/clm-ice-wall-04-interrupted', 'clm/clm-maintenance-rope-01-straight'],
    base: {ledge: 'plt/plt-glacier-shelf-01-low-wide', gantry: 'plt/plt-mine-gantry-01-low-wide', cover: 'cov/cov-fractured-ice-pillar-01-narrow'},
  },
  desert: {
    platforms: ['plt/plt-sandstone-ledge-01-low-wide', 'plt/plt-eroded-arch-01-low-wide', 'plt/plt-vitrified-glass-slab-01-low-wide', 'plt/plt-mining-gantry-01-low-wide',
      'plt/plt-eroded-arch-04-broken', 'plt/plt-vitrified-glass-slab-04-broken', 'plt/plt-sandstone-ledge-04-broken'],
    covers: ['cov/cov-obsidian-glass-fin-01-narrow', 'cov/cov-buried-cargo-01-narrow', 'cov/cov-obsidian-glass-fin-02-broad', 'cov/cov-buried-cargo-02-broad'],
    // The desert kit has no hazard sheet. The volcanic obsidian shard bed matches Khar-Duun's vitrified/obsidian geology.
    hazards: {harm: '../volcano/srf/srf-obsidian-shard-bed-03-ridge'},
    surfaces: [], ornaments: [],
    supports: ['clm/clm-canyon-rock-face-01-straight', 'clm/clm-mine-ladder-01-straight', 'clm/clm-anchor-rope-01-straight', 'clm/clm-canyon-rock-face-04-interrupted'],
    base: {ledge: 'plt/plt-sandstone-ledge-01-low-wide', gantry: 'plt/plt-mining-gantry-01-low-wide', cover: 'cov/cov-obsidian-glass-fin-01-narrow'},
  },
};

const RESERVES = [
  {id: 'vharuun-grand-hunt', name: 'Vharuun', title: 'Grande traque de Vharuun', biome: 'jungle', seed: 66113, prefix: 'vharuun-grand',
    background: '/game/assets/v2/environments/jungle/layers/far-lake.webp', hazardCycle: ['harm', 'slow', 'alarm', 'slow', 'harm', 'alarm'], platformBias: [0, 3, 2, 4],
    sectors: [['Jungle des Parachutes', 'Branches basses et retour proche.'], ['Lisière de la Foreuse', 'Étages de racines au-dessus du transport abandonné.'], ['Camp des Trophées', 'Ponts de racines et souches piégées.'],
      ['Crête des Balises', 'Postes hauts et pièges lumineux des fugitifs.'], ['Bassin des Racines', 'Fondrières sous une route haute continue.'], ['Serres Renversées', 'Étais industriels au-dessus de la navette des serres.'],
      ['Carrière des Échos', 'Paliers de roche et longues vues.'], ['Quai des Brumes', 'Pontons étagés et rampe du quai.'], ['Lagune des Épaves', 'Débris de transpondeurs et eaux stagnantes.'],
      ['Arches Étranglées', 'Murs de racines et passages sous voûte.'], ['Pépinière Noyée', 'Fondrières larges et cimes reliées.'], ['Promontoire du Signal', 'Dernière rampe et poste dominant.']],
    colors: ['#2f5a45', '#3d6046', '#4a5a3c', '#3b5560', '#235643', '#41654c', '#635955', '#365464', '#3e5a58', '#2f4d38', '#2c5a52', '#4a5566'],
    names: ['Veyra', 'Marek', 'Solen', 'Oren', 'Nara', 'Kess', 'Toren', 'Ira', 'Ilye', 'Darek', 'Sava', 'Lem', 'Neme', 'Rahel', 'Varo', 'Eira', 'Corvan', 'Talia', 'Brennik', 'Shaya', 'Odric', 'Mirelle', 'Jasko', 'Fenna'],
    shipNames: ['Transport abandonné', 'Navette du camp', 'Cargo des serres', 'Transport du quai', 'Barge de la lagune', 'Navette du promontoire'],
    factions: [['Escorte des parachutistes', 'Récupère le transport abandonné de la foreuse.'], ['Milice du camp', 'Remet en route la navette du camp.'], ['Équipe des serres', 'Répare le cargo sous les étais.'],
      ['Garde du quai', 'Tient la rampe des brumes.'], ['Pilleurs de la lagune', 'Arrachent des pièces aux épaves.'], ['Signaleurs', 'Préparent la dernière navette sous le promontoire.']],
    sites: [['Vue de la foreuse', 'Monter les racines jusqu’au-dessus du transport abandonné.'], ['Poste des balises', 'Gagner la branche haute qui domine la navette du camp.'],
      ['Signal des serres', 'Rejoindre l’étai le plus haut au-dessus du cargo.'], ['Repère du quai', 'Atteindre le ponton oriental au-dessus de la rampe.'],
      ['Mât de la lagune', 'Grimper sur l’épave haute de la lagune.'], ['Promontoire du signal', 'Relever le dernier poste avant le retour.']],
    goals: {cacheObjectives: [2, 14], mechanicGoal: 0, interceptionGoal: 1},
    intro: 'Grande traque de Vharuun : douze secteurs, vingt-quatre adultes armés et six appareils. Rapporte six relevés, neutralise les deux dépôts indiqués et interromps un départ. Fondrières, souches piégées et pièges lumineux bordent le sol.'},
  {id: 'avar-kesh-grand-hunt', name: 'Avar’Kesh', title: 'Grande traque d’Avar’Kesh', biome: 'jungle', seed: 108113, prefix: 'kesh-grand',
    background: '/game/backgrounds/jungle-depth-v4.webp', hazardCycle: ['alarm', 'slow', 'harm', 'alarm', 'harm', 'slow'], platformBias: [1, 2, 5, 6],
    sectors: [['Grève des Exilés', 'Branches basses et repli proche de l’extraction.'], ['Canopée des Guetteurs', 'Route étagée au-dessus du premier cargo.'], ['Écluses Envahies', 'Dalles noyées et pièges d’alerte.'],
      ['Fonderie des Lianes', 'Étais hauts et accès à la seconde rampe.'], ['Ravin des Fougères', 'Branches décalées au-dessus des fondrières.'], ['Antennes Brisées', 'Poste élevé dominant le troisième appareil.'],
      ['Voûte des Racines', 'Longues traverses et descente abritée.'], ['Débarcadère des Cendres', 'Pontons étagés et rampe du skiff.'], ['Temple Englouti', 'Idoles renversées et dalles moussues.'],
      ['Palissade des Évadés', 'Retranchements de fortune et pièges lumineux.'], ['Gué des Racines', 'Gués boueux sous des ponts de racines.'], ['Plate-forme d’Exil', 'Dernière rampe et terrasses de ruine.']],
    colors: ['#47695c', '#314f39', '#426970', '#6c5446', '#3b674d', '#5d5d72', '#536447', '#665d68', '#4f5f44', '#5a5440', '#3f6253', '#5c5a66'],
    names: ['Aysen', 'Branek', 'Celka', 'Dorun', 'Elva', 'Farek', 'Gavra', 'Helen', 'Iskar', 'Jareh', 'Kovra', 'Liren', 'Mavik', 'Nyrel', 'Ovek', 'Pelya', 'Quessa', 'Radan', 'Sileth', 'Tomas', 'Ulvane', 'Vesna', 'Wendel', 'Yarra'],
    shipNames: ['Cargo de la canopée', 'Navette de la fonderie', 'Transport des antennes', 'Skiff des cendres', 'Chaland du temple', 'Navette d’exil'],
    factions: [['Guetteurs de la canopée', 'Évacuent le cargo occidental.'], ['Ouvriers de la fonderie', 'Relancent la navette sous les lianes.'], ['Garde des antennes', 'Protège la réparation du transport.'],
      ['Bateliers des cendres', 'Préparent le skiff du débarcadère.'], ['Pilleurs du temple', 'Démontent un chaland échoué.'], ['Bannis de la palissade', 'Fortifient la dernière rampe.']],
    sites: [['Vue de la canopée', 'Atteindre la branche haute au-dessus du premier cargo.'], ['Relevé de la fonderie', 'Remonter les étais sans couper par le décor de fond.'],
      ['Repères des antennes', 'Rejoindre le poste haut pendant les réparations au sol.'], ['Notes du débarcadère', 'Relever le ponton haut au-dessus du skiff.'],
      ['Corniche du temple', 'Gagner la dalle haute qui surplombe le chaland.'], ['Terrasse d’exil', 'Relever la dernière terrasse puis revenir à l’ouest.']],
    goals: {cacheObjectives: [], mechanicGoal: 3, interceptionGoal: 0},
    intro: 'Grande traque d’Avar’Kesh : douze secteurs, vingt-quatre adultes armés et six appareils. Rapporte six relevés et identifie trois mécaniciens par observation locale. Pièges lumineux, gués boueux et branches effondrées compliquent la route basse.'},
  {id: 'khar-duun-grand-hunt', name: 'Khar-Duun', title: 'Grande traque de Khar-Duun', biome: 'desert', seed: 109113, prefix: 'khar-grand',
    background: '/game/backgrounds/desert-depth-v8.png', hazardCycle: ['harm'], platformBias: [0, 2, 4, 6],
    sectors: [['Débarcadère Sec', 'Banquettes basses autour du retour.'], ['Gorges des Deux Rives', 'Corniches successives au-dessus du fond praticable.'], ['Corniche Vitrifiée', 'Dalles vitrifiées et éclats d’obsidienne.'],
      ['Chantier des Arches', 'Étais miniers et arche haute.'], ['Oued des Plaques', 'Détours au sol entre les plaques.'], ['Rempart des Caravanes', 'Postes hauts au-dessus du transport.'],
      ['Ravin des Crêtes', 'Crêtes étroites et lits de verre.'], ['Terminal des Sables', 'Rampe orientale et terrasses.'], ['Mines Effondrées', 'Passerelles minières et puits comblés.'],
      ['Défilé des Vents', 'Longues corniches exposées.'], ['Plateau de Verre', 'Dalles vitrifiées et cargaisons enfouies.'], ['Porte des Dunes', 'Dernière rampe avant le désert ouvert.']],
    colors: ['#7f6243', '#9b6a3c', '#8a7951', '#7f6c51', '#ac8152', '#88614b', '#8e7250', '#78634d', '#8a6a48', '#9a7a52', '#8c7a5a', '#7a644c'],
    names: ['Adren', 'Belen', 'Cyra', 'Darek', 'Elyan', 'Ferya', 'Goran', 'Hedra', 'Ilyes', 'Jessa', 'Karel', 'Lyra', 'Marekha', 'Nerin', 'Olya', 'Pavel', 'Rasmin', 'Sahel', 'Tarik', 'Ubaya', 'Veran', 'Wadia', 'Yasir', 'Zehra'],
    shipNames: ['Cargo des gorges', 'Navette des arches', 'Transport des caravanes', 'Skiff des sables', 'Tracteur des mines', 'Navette des dunes'],
    factions: [['Escorte des carrières', 'Récupère le cargo occidental.'], ['Équipe des arches', 'Remet en route la navette minière.'], ['Caravaniers', 'Défendent le transport du rempart.'],
      ['Gardiens du terminal', 'Préparent le skiff oriental.'], ['Mineurs évadés', 'Arrachent un tracteur aux galeries.'], ['Passeurs des dunes', 'Tiennent la dernière rampe.']],
    sites: [['Vue des deux rives', 'Monter les corniches de la gorge.'], ['Repères des arches', 'Remonter les étais miniers jusqu’à l’arche.'], ['Relevé du rempart', 'Gagner le poste au-dessus du transport.'],
      ['Notes du terminal', 'Atteindre la terrasse orientale.'], ['Puits des mines', 'Grimper sur la passerelle haute des mines.'], ['Seuil des dunes', 'Relever la dernière corniche avant le retour.']],
    goals: {cacheObjectives: [1, 7, 13, 21], mechanicGoal: 0, interceptionGoal: 0},
    intro: 'Grande traque de Khar-Duun : douze secteurs de canyons, vingt-quatre adultes armés et six appareils. Rapporte six relevés et neutralise un lot dans chacun des quatre dépôts indiqués. Des lits d’éclats d’obsidienne blessent qui les traverse au sol.'},
  {id: 'iskhel-grand-hunt', name: 'Iskhel', title: 'Grande traque d’Iskhel', biome: 'ice', seed: 110113, prefix: 'iskhel-grand',
    background: '/game/backgrounds/ice-depth-v4.webp', hazardCycle: ['slow', 'harm', 'slow', 'harm'], platformBias: [0, 1, 4, 5],
    sectors: [['Halte Boréale', 'Banquettes basses et retour occidental.'], ['Terrasses du Givre', 'Terrasses jusqu’au poste du glacier.'], ['Passage Crevassé', 'Glace mince sous les traverses.'],
      ['Galerie Bleue', 'Passage bas et remontée par les étais.'], ['Épave Congelée', 'Ponts d’épave et évents cryogéniques.'], ['Mine Blanche', 'Gantries au-dessus du transport.'],
      ['Voûte des Aiguilles', 'Colonnes de cristal et longues traverses.'], ['Refuge Astral', 'Rampe orientale et poste haut.'], ['Lac de Verre Noir', 'Glace noire et passages fragiles.'],
      ['Forage Abandonné', 'Foreuses renversées et vapeur glacée.'], ['Cirque des Balises', 'Balises d’urgence et terrasses.'], ['Col du Dernier Feu', 'Dernière rampe sous le col.']],
    colors: ['#526e83', '#647c9b', '#65798b', '#4e7189', '#696c87', '#668da0', '#5b7295', '#687e9b', '#4f6a86', '#6a7a90', '#5a7c96', '#6c7f99'],
    names: ['Alvek', 'Brisa', 'Ceylan', 'Deren', 'Estra', 'Falko', 'Gelia', 'Harek', 'Ivara', 'Joren', 'Kessa', 'Lenor', 'Myra', 'Narel', 'Osten', 'Pria', 'Runa', 'Sigvar', 'Tessel', 'Ulva', 'Vidar', 'Wrenna', 'Yrsa', 'Zelek'],
    shipNames: ['Cargo du glacier', 'Navette de la galerie', 'Transport de la mine', 'Skiff du refuge', 'Brise-glace du lac', 'Navette du col'],
    factions: [['Récupération du glacier', 'Évacue le cargo occidental.'], ['Garde des galeries', 'Protège la réparation sous la glace.'], ['Mineurs blancs', 'Relancent le transport de la mine.'],
      ['Réfugiés astraux', 'Préparent le skiff du refuge.'], ['Équipage du lac', 'Dégagent un brise-glace pris dans la glace noire.'], ['Gardiens du col', 'Tiennent la dernière rampe.']],
    sites: [['Repères du glacier', 'Rejoindre la terrasse au-dessus du cargo.'], ['Relevé de la galerie', 'Prendre les étais jusqu’au-dessus de la navette.'], ['Vue de la mine', 'Gagner la gantry haute au-dessus du transport.'],
      ['Notes du refuge', 'Atteindre la terrasse orientale du refuge.'], ['Mât du brise-glace', 'Grimper au-dessus du brise-glace.'], ['Feu du col', 'Relever le dernier poste avant le retour.']],
    goals: {cacheObjectives: [], mechanicGoal: 3, interceptionGoal: 2},
    intro: 'Grande traque d’Iskhel : douze secteurs glacés, vingt-quatre adultes armés et six appareils. Rapporte six relevés, identifie trois mécaniciens et interromps deux départs. La glace mince ralentit et les évents cryogéniques blessent au sol.'},
];

const SHIP_JITTER = [-20, 30, -40, 10, 40, -10];
const SUPPLY_OFFSETS = [630, 1060, 1510, 1970];

function layout(reserve) {
  const rnd = mulberry(reserve.seed), kit = KITS[reserve.biome];
  const platformsArt = kit.platforms.map(name => art(DECOR + reserve.biome + '/' + name + '.webp'));
  const coversArt = kit.covers.map(name => art(DECOR + reserve.biome + '/' + name + '.webp'));
  const hazardKinds = Object.keys(kit.hazards);
  const hazardsArt = hazardKinds.map(kind => art(path.posix.normalize(DECOR + reserve.biome + '/' + kit.hazards[kind] + '.webp')));
  const decorArt = [...kit.surfaces, ...kit.ornaments, ...kit.supports].map(name => art(DECOR + reserve.biome + '/' + name + '.webp'));
  const surfaceIdx = kit.surfaces.map((_, i) => i), ornIdx = kit.ornaments.map((_, i) => kit.surfaces.length + i), supportIdx = kit.supports.map((_, i) => kit.surfaces.length + kit.ornaments.length + i);
  const ships = Array.from({length: TEAMS}, (_, k) => ({id: `${reserve.prefix}-ship-${k + 1}`, name: reserve.shipNames[k], x: 3200 * k + 2700 + SHIP_JITTER[k]}));
  const supplies = Array.from({length: TEAMS}, (_, k) => SUPPLY_OFFSETS.map((o, j) => 3200 * k + o + ((reserve.seed + k * 7 + j * 13) % 41) - 20)).flat();
  const platforms = [];
  const sectorFamily = s => reserve.platformBias[s % reserve.platformBias.length];
  const add = (x, y, w, s) => {
    const broken = w <= 240 && y >= 300 && rnd() < .35;
    const family = broken ? 4 + (sectorFamily(s) % 3) : sectorFamily(s) % 4;
    platforms.push({x: Math.round(x), y: Math.round(y), w: Math.round(w), kind: family === 3 || family === 6 ? 'gantry' : 'ledge', art: family});
  };
  const sites = [];
  // Ship modules: a climb to a post above the hull, then a step down beyond the hull.
  const modules = ships.map((ship, k) => {
    const sx = ship.x, high = 236 + (k % 3) * 4, s = Math.floor(sx / SECTOR);
    return {from: sx - 700, to: sx + 520, build() {
      add(sx - 690, 366 - (k % 2) * 6, 220, s);
      add(sx - 410, 300 + (k % 2) * 4, 205, s);
      add(sx - 150, high, 320, s);
      add(sx + 250, 304 - (k % 2) * 6, 230, s);
      sites.push({id: `${reserve.prefix}-record-${k + 1}`, name: reserve.sites[k][0], x: sx - 30, y: high, range: 30, ticks: 120, sector: s, description: reserve.sites[k][1]});
    }};
  });
  const spans = [];
  let cursor = 320;
  for (const m of modules) { spans.push([cursor, m.from - 90]); cursor = m.to + 90; }
  spans.push([cursor, W - 200]);
  const filled = [];
  for (const [a, b] of spans) {
    let x = a, y = 438;
    while (true) {
      let ny, gap, w = R(rnd, 180, 310);
      if (y === 438) { ny = R(rnd, 352, 376); gap = x === a ? 0 : R(rnd, 200, 380); }
      else {
        const roll = rnd();
        if (roll < .34 && y > 275) { ny = Math.max(262, y - R(rnd, 45, 70)); gap = R(rnd, 60, 105); }
        else if (roll < .58) { ny = Math.min(376, Math.max(262, y + R(rnd, -14, 14))); gap = R(rnd, 80, 135); }
        else if (roll < .86 && y < 350) { ny = Math.min(376, y + R(rnd, 40, 75)); gap = R(rnd, 80, 140); }
        else if (roll < .92) { ny = Math.min(376, Math.max(300, y + R(rnd, -10, 30))); gap = R(rnd, 90, 140); }
        else { ny = 438; gap = 0; }
      }
      if (ny === 438) { y = 438; x += R(rnd, 120, 240); continue; }
      const nx = x + gap;
      if (nx + w > b) break;
      filled.push([nx, ny, w]); x = nx + w; y = ny;
    }
  }
  for (const [x, y, w] of filled) add(x, y, w, Math.floor(x / SECTOR));
  // Split routes: a high branch above some low ledges, reached straight up from the ledge below.
  for (const [x, y, w] of filled) if (y >= 340 && w >= 230 && rnd() < .5) {
    const hx = x + R(rnd, 30, 70), hw = R(rnd, 170, 220);
    if (filled.some(([ox, oy, ow]) => ox !== x && hx < ox + ow + 40 && hx + hw > ox - 40 && Math.abs(oy - (y - 114)) < 100)) continue;
    add(hx, y - 114, hw, Math.floor(hx / SECTOR));
  }
  for (const m of modules) m.build();
  platforms.sort((a, b) => a.x - b.x);
  // Hazards: ground strips away from supplies, ramps, extraction and the first sector.
  const hazards = [];
  const clearOf = (x, w, gaps) => gaps.every(([c, r]) => x + w < c - r || x > c + r);
  const forbidden = [...supplies.map(x => [x, 130]), ...ships.map(s => [s.x, 230]), [115, 420]];
  let hazardTurn = 0;
  for (let s = 1; s < 12; s++) {
    const count = s % 3 === 2 ? 2 : 1;
    for (let n = 0; n < count; n++) {
      for (let attempt = 0; attempt < 80; attempt++) {
        const w = R(rnd, 120, 200), x = R(rnd, s * SECTOR + 40, (s + 1) * SECTOR - w - 40);
        if (!clearOf(x, w, forbidden) || hazards.some(h => x < h.x + h.w + 160 && x + w > h.x - 160)) continue;
        // Prefer strips that an upper route spans, so the hazard rewards the high road instead of blocking it.
        const covered = platforms.filter(p => p.x < x + w && p.x + p.w > x).reduce((sum, p) => sum + Math.min(p.x + p.w, x + w) - Math.max(p.x, x), 0) / w;
        if (covered < .45 && attempt < 60) continue;
        const kind = reserve.hazardCycle[hazardTurn++ % reserve.hazardCycle.length];
        hazards.push({x, w, kind, art: hazardKinds.indexOf(kind)});
        break;
      }
    }
  }
  hazards.sort((a, b) => a.x - b.x);
  // Covers: two per sector, never on a ramp, a depot, a hazard or the extraction.
  const cover = [];
  for (let s = 0; s < 12; s++) {
    const count = s === 0 ? 1 : 2;
    for (let n = 0; n < count; n++) {
      for (let attempt = 0; attempt < 120; attempt++) {
        const index = Math.floor(rnd() * coversArt.length), a = coversArt[index], aspect = trimmedAspect(a);
        const broad = aspect < 1;
        const top = broad ? R(rnd, 368, 382) : R(rnd, 326, 350);
        const w = Math.round((438 - top) / aspect);
        const x = R(rnd, s * SECTOR + 60, (s + 1) * SECTOR - w - 60);
        if (x < 420 || !clearOf(x, w, [...supplies.map(v => [v, 50]), ...ships.map(v => [v.x, 140])])) continue;
        if (hazards.some(h => x < h.x + h.w + 30 && x + w > h.x - 30) || cover.some(c => x < c.x + c.w + 260 && x + w > c.x - 260)) continue;
        cover.push({x, w, top, art: index});
        break;
      }
    }
  }
  cover.sort((a, b) => a.x - b.x);
  // Native decor. Surfaces and ornaments stay on the ground line; supports stand behind upper platforms.
  const decor = [];
  const blocked = (x, w, pad) => hazards.some(h => x < h.x + h.w + pad && x + w > h.x - pad) || cover.some(c => x < c.x + c.w + pad && x + w > c.x - pad) ||
    ships.some(sh => x < sh.x + 230 && x + w > sh.x - 230) || supplies.some(v => x < v + 40 && x + w > v - 40) || x < 300;
  for (let s = 0; s < 12; s++) {
    for (let n = 0; n < (surfaceIdx.length ? 3 : 0); n++) for (let attempt = 0; attempt < 40; attempt++) {
      const index = pick(rnd, surfaceIdx), a = decorArt[index], w = R(rnd, 170, 280), h = Math.round(w * trimmedAspect(a));
      const x = R(rnd, s * SECTOR + 30, (s + 1) * SECTOR - w - 30);
      if (blocked(x, w, 20) || decor.some(d => d.layer === 'ground' && x < d.x + d.w + 60 && x + w > d.x - 60)) continue;
      decor.push({x, y: G + 14 - h, w, h, art: index, layer: 'ground'}); break;
    }
    for (let n = 0; n < (ornIdx.length ? 2 : 0); n++) for (let attempt = 0; attempt < 40; attempt++) {
      const index = pick(rnd, ornIdx), a = decorArt[index], aspect = trimmedAspect(a);
      const h = aspect > 1 ? R(rnd, 78, 104) : R(rnd, 44, 62), w = Math.round(h / aspect);
      const x = R(rnd, s * SECTOR + 30, (s + 1) * SECTOR - w - 30);
      if (blocked(x, w, 40) || decor.some(d => d.layer === 'back' && x < d.x + d.w + 160 && x + w > d.x - 160)) continue;
      decor.push({x, y: G + 6 - h, w, h, art: index, layer: 'back'}); break;
    }
  }
  for (const p of platforms) {
    if (p.y > 320 || p.w < 200 || rnd() > .55) continue;
    const index = pick(rnd, supportIdx), a = decorArt[index], h = G + 8 - (p.y + 14), w = Math.round(h / trimmedAspect(a));
    const x = Math.round(p.x + p.w / 2 - w / 2);
    if (ships.some(sh => x < sh.x + 200 && x + w > sh.x - 200)) continue;
    decor.push({x, y: p.y + 14, w, h, art: index, layer: 'support'});
  }
  decor.sort((a, b) => a.x - b.x);
  return {platformsArt, coversArt, hazardsArt, hazardKinds, decorArt, ships, supplies, platforms, sites, hazards, cover, decor,
    base: Object.fromEntries(Object.entries(kit.base).map(([k, v]) => [k, art(DECOR + reserve.biome + '/' + v + '.webp')]))};
}

const lines = [];
lines.push('// Generated by a deterministic layout script. These literals are the shipped geometry; the game never runs the generator.');
lines.push('// Native art only: every path below already exists in public/ with the recorded size.');
lines.push('export const GAME_RESERVE_GRAND_LAYOUTS = {');
const report = [];
for (const reserve of RESERVES) {
  const l = layout(reserve);
  const sectors = reserve.sectors.map(([name, terrain], i) => ({id: `${reserve.prefix}-${i + 1}`, name, left: i * SECTOR, right: (i + 1) * SECTOR, atmosphere: reserve.colors[i], terrain}));
  const data = {
    id: reserve.id, name: reserve.name, title: reserve.title, biome: reserve.biome, introduction: reserve.intro,
    world: {width: W, height: 540, ground: G, returnX: 115}, sectors,
    platforms: l.platforms, cover: l.cover, hazards: l.hazards, decor: l.decor,
    supplies: l.supplies, ships: l.ships, sites: l.sites,
    names: reserve.names, factions: reserve.factions.map(([name, description], k) => ({id: `${reserve.prefix}-faction-${k + 1}`, name, description})),
    ...reserve.goals,
    art: {background: art(reserve.background), ledge: l.base.ledge, gantry: l.base.gantry, cover: l.base.cover,
      platforms: l.platformsArt, covers: l.coversArt, hazards: l.hazardsArt, decor: l.decorArt},
  };
  lines.push(`  ${JSON.stringify(reserve.id)}: ${JSON.stringify(data)},`);
  report.push(`${reserve.id}: ${l.platforms.length} plateformes, ${l.cover.length} couverts, ${l.hazards.length} dangers (${l.hazards.map(h => h.kind).join(',')}), ${l.decor.length} décors`);
}
lines.push('} as const;');
for (const reserve of RESERVES) if (reserve.intro.length > 250) throw new Error('Introduction trop longue pour le journal : ' + reserve.id);
fs.writeFileSync(OUT, lines.join('\n') + '\n');
console.log(report.join('\n'));
