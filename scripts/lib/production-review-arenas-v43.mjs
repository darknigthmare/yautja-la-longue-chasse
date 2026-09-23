import assert from 'node:assert/strict';

/** Gallery evidence is independent from renderer approval and counts each PNG once. */
export function appendArenaReviewEntries(entries, stages, definitions = [], imported = []) {
  const sources = new Set(entries.map(entry => entry.src));
  const definitionsById = new Map(definitions.map(definition => [definition.id, definition]));
  const add = (stage, planeId, asset, frame, index) => {
    if (!frame.generation || !['reviewed', 'integrated'].includes(frame.status) || sources.has(frame.path)) return;
    const definition = definitionsById.get(stage.catalogueId);
    const screen = Boolean(definition);
    const p0 = planeId === 'P0' && asset.id === 'p0-depth';
    const notes = screen ? [
      `${definition.kind === 'game' ? 'Jeu' : 'Film'} de référence : ${definition.workTitle}. Lieu : ${definition.name}.`,
      p0 ? 'Fond composé statique P0 : cette image ne constitue pas six plans de parallaxe ni un niveau jouable.'
        : `Module indépendant du plan ${planeId} ; la consultation de sa source ne valide pas son placement en jeu.`,
      'Adaptation originale pour la vue latérale 2D ; fidélité 1:1 non certifiée.',
      definition.referenceStatus.includes('exact-level-unverified')
        ? 'Seul le type de lieu est confirmé ; aucune mission précise du jeu n’est identifiée.'
        : `Limite de référence déclarée : ${definition.referenceStatus}.`,
      stage.runtimeEnabled ? 'La composition complète possède une activation de scène distincte de cette source.'
        : 'Source consultable ; la composition de cette arène n’est pas encore activée.'
    ] : [
      `Image indépendante · plan ${planeId} · parallaxe ${asset.parallax}.`,
      'Proposition originale de production issue du catalogue local ; la discussion dédiée aux 100 arènes reste à confirmer.'
    ];
    entries.push({ id: `${screen ? 'v43' : 'v34'}-${stage.catalogueId}-${asset.id}-${index}`, category: 'arena',
      name: stage.name + ' · ' + planeId + ' · ' + asset.role, src: frame.path, status: frame.status,
      width: frame.generation.width, height: frame.generation.height, sha256: frame.generation.sha256,
      transparency: { mode: 'alpha' }, notes, frames: [], ...(screen ? { screenReference: {
        kind: definition.kind, workId: definition.workId, workTitle: definition.workTitle,
        referenceStatus: definition.referenceStatus, fidelityClaim: definition.fidelityClaim,
      } } : {}) });
    sources.add(frame.path);
  };
  for (const stage of stages) for (const plane of stage.planes) for (const asset of plane.assets) {
    for (const [index, frame] of asset.frames.entries()) add(stage, plane.id, asset, frame, index);
  }
  // A real reviewed P0 may be browsed while the arena still awaits its other planes.
  for (const receipt of imported) {
    assert(receipt.accepted === true && receipt.excludedFromCoverage !== true && receipt.generator === 'openai-imagegen');
    const stage = stages.find(candidate => candidate.catalogueId === receipt.arenaId);
    assert(stage && definitionsById.has(stage.catalogueId), 'Receipt has no known screen arena');
    assert.equal(receipt.publicPath, `/game/sprites/v43/pit-arenas/${stage.catalogueId}/p0-depth.png`);
    add(stage, 'P0', { id: 'p0-depth', role: 'Profondeur OpenAI adaptée au lieu', parallax: .05 }, {
      path: receipt.publicPath, status: 'reviewed', generation: receipt,
    }, 0);
  }
  return entries;
}
