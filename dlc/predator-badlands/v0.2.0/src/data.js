/* Reconstruction 2026-11-06, not a recovery of the unavailable historical v0.2. */
(() => {
  'use strict';
  const original = globalThis.BADLANDS_DATA;
  if (!original) throw new Error('Les données originales v0.1 sont requises.');
  const bridges = {
    wy_recovery: ['wy_power', 'Circuit de réactivation', 'interact'],
    wy_briefing: ['wy_checks', 'Préparer la sortie', 'collect'],
    wy_jungle_entry: ['wy_relay', 'Relais de reconnaissance', 'escort'],
    wy_ship_wreck: ['wy_airlock', 'Accès à la coque', 'interact'],
    wy_cockpit: ['wy_inventory', 'Inventaire de récupération', 'collect'],
    wy_track: ['wy_overlook', 'Observation du périmètre', 'survive'],
    wy_transport: ['wy_transfer', 'Sas de transfert', 'interact'],
    wy_decommission: ['wy_alarm', 'Rétablir les verrous', 'interact'],
    wy_loader: ['wy_loader_check', 'Contrôle de l’exosquelette', 'interact'],
    pred_crystal_cave: ['pred_trial_exit', 'Sortie de l’épreuve', 'interact'],
    pred_hunt_atlas: ['pred_navigation', 'Route de chasse', 'interact'],
    pred_trophy_room: ['pred_gear_check', 'Préparatifs', 'collect'],
    pred_orbit: ['pred_pod_release', 'Verrou de capsule', 'interact'],
    pred_vines: ['pred_after_vines', 'Débris de l’arsenal', 'collect'],
    pred_thia: ['pred_canopy', 'Passage de canopée', 'escort'],
    pred_imbre: ['pred_water', 'Passage humide', 'survive'],
    pred_razor: ['pred_bison_track', 'Piste du troupeau', 'collect'],
    pred_camp: ['pred_watch', 'Veille de la meute', 'survive'],
    pred_wreckage: ['pred_terminal_access', 'Accès au terminal', 'interact'],
    pred_escape: ['pred_service_exit', 'Sortie technique', 'interact'],
    pred_kwei_wreck: ['pred_salvage', 'Récupération utile', 'collect'],
    pred_organic: ['pred_approach', 'Approche de la base', 'escort'],
    pred_rescue: ['pred_reunited', 'La meute réunie', 'escort']
  };
  const goals = {
    interact: 'Activer les trois relais dans l’ordre affiché avec E.',
    collect: 'Récupérer quatre éléments signalés, un sur chaque plan.',
    escort: 'Accompagner le groupe jusqu’au sas en restant à proximité.',
    survive: 'Atteindre l’abri et tenir jusqu’à la fin de la séquence.'
  };
  const clone = value => JSON.parse(JSON.stringify(value));
  const campaigns = original.campaigns.map(c => {
    const scenes = [];
    for (const s of c.scenes) {
      scenes.push({...clone(s), provenance: 'inherited-v0.1-unreviewed', bridge: false});
      if (bridges[s.id]) {
        const [id, title, objectiveType] = bridges[s.id];
        const source = s.id === 'pred_vines' ? c.scenes.find(x => x.id === 'pred_thia') : s;
        scenes.push({...clone(s), gear: clone(source.gear), id, title, objectiveType,
          objective: goals[objectiveType], enemies: [], canonLock: false,
          canonOutcome: 'Raccord de gameplay original : aucune nouvelle scène du film n’est revendiquée.',
          bridge: true, provenance: 'original-gameplay-bridge', sourceAnchor: s.id});
      }
    }
    scenes.forEach((s, i) => {
      s.chapter = i + 1;
      s.next = scenes[i + 1] ? [scenes[i + 1].id] : [];
      s.prev = scenes[i - 1] ? [scenes[i - 1].id] : [];
      s.width = s.environment === 'SPACE' ? 2200 : 2400 + (i % 3) * 180;
      s.targetCount = s.objectiveType === 'collect' ? 4 : s.objectiveType === 'interact' ? (s.bridge ? 3 : 1) : 0;
    });
    return {...clone(c), scenes};
  });
  const weapons = clone(original.weapons);
  for (const w of Object.values(weapons)) {
    w.cooldown = w.kind === 'ranged' ? 0.38 : 0.5;
    w.magazine = w.kind === 'ranged' ? 8 : 0;
    w.reserve = w.kind === 'ranged' ? 32 : 0;
    w.range = w.kind === 'ranged' ? 580 : 125;
  }
  globalThis.BADLANDS_V2_DATA = {
    version: '0.2.0-reconstructed', schema: 2, depthCount: 4, campaigns, weapons,
    enemies: clone(original.enemies), sources: clone(original.sources),
    provenance: {originalVersionRecovered: false, reconstructedFrom: '0.1.0',
      reconstructionDate: '2026-11-06', oneToOneArtCertified: false,
      warning: '46 scènes héritées non réauditées plan par plan ; 23 raccords originaux explicitement signalés.'}
  };
})();
