import fs from 'node:fs';
import crypto from 'node:crypto';

// This source inventory is independent of V105 runtime delivery/QA statuses.
const output = 'app/game/data/pitWorkbookScopeV105.json';
const planPath = 'app/game/data/pitWorkbookAnimationPlanV100.json';
const nativePath = 'app/game/data/pitWorkbookAnimationsV100.json';
const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
const extractionBytes = fs.readFileSync(plan.source.extractionPath);
if (crypto.createHash('sha256').update(extractionBytes).digest('hex') !== plan.source.extractionSha256) {
  throw new Error('Pinned V56 extraction changed; review provenance before rebuilding.');
}
const extraction = JSON.parse(extractionBytes);
const natives = JSON.parse(fs.readFileSync(nativePath, 'utf8'));
const normalKeys = new Set(['5L', '5M', '5H', '2L', '2M', '2H', 'jL', 'jM', 'jH']);
const partnerKeys = new Set(['TH_F', 'TH_B', 'FATALITE_1', 'FATALITE_2', 'CLEMENCE']);
const variantKeys = ['pilot-outfit', 'masked', 'unmasked', 'lost-or-stowed-equipment', 'damage-and-armor', 'native-directions', 'cloak'];

function line(text, label) {
  const value = text.split('\n').find(value => value.startsWith(label + ' : '));
  if (!value) throw new Error('Missing source field ' + label);
  return value.slice(label.length + 3);
}

function needsForStage(fighterId, ordinal) {
  const feral = fighterId === 'feral-hunter';
  switch (ordinal) {
    case 1: return feral
      ? ['Traces de la proie et observation du chasseur, dans le lieu référencé ; objets séparés du BODY.']
      : ["Indice ou passage du temple et équipement à récupérer ; l'initiation est interrompue, sans marque anticipée."];
    case 4: return [
      'Indice visuel séparé à référencer avant dessin : ' + (feral ? 'Naru' : 'Grid') + ". Le rapprochement narratif reste une proposition, pas un événement canonique certifié.",
      "BODY vérifiant son équipement, avec continuité des objets réellement conservés.",
    ];
    case 5: return [
      feral ? 'Bouclier déployé, acquisition du point par le masque et séparation de la lance.' : 'Inspection de la gravure puis sortie de l’ombre ; marque seulement pour la version déjà initiée.',
      'Contrechamp de garde spécifique de ' + (feral ? 'Naru' : 'Grid') + ', corps indépendant du chasseur.',
      'Deux entrées et portraits indépendants ; aucune image composite admise comme deux acteurs.',
    ];
    case 6: return [
      'Kit GUARD_H dédié référencé ; aucune quantité de dessins ou durée indiquée dans cette cellule.',
      'Signal de fond puis ouverture du passage en cinématique après trois contres, esquives ou désarmements.',
      'Décor indépendant des hitboxes classées ; aucune collision dangereuse aléatoire déduite du visuel.',
    ];
    case 8: return feral ? [
      'Récupération du masque hors de la boue, puis plan distinct sur la ligne de tir.',
      'Issue alternative annoncée ; récompense cosmétique distincte d’une nouvelle technique canonique.',
    ] : [
      'Scar et Lex rouvrant une sortie ensemble : acteurs indépendants et équipement cohérent.',
      'Épilogue distinct rappelant l’issue connue ; la fin jouée est annoncée comme branche alternative.',
    ];
    default: return [
      'Réutilisation du kit d’action cité possible ; elle ne livre ni route, adversaire, objectif ni continuité d’équipement.',
      'Adversaire, stage et issue de cette cellule à raccorder séparément.',
    ];
  }
}

const result = {
  schemaVersion: 1,
  source: {
    ...plan.source, actionPlanPath: planPath, nativeAdmissionPath: nativePath,
    baseline: 'V104', runtimeSourceModule: 'app/game/systems/pitWorkbookMovesV105.ts',
  },
  boundaries: [
    '52 lignes d’actions = 36 moves + 16 présentations BODY ; ce total ne décrit pas tout le plan Excel.',
    '16 étapes de campagne et 14 contraintes de variantes sont conservées séparément, sans les additionner à un compte de dessins.',
    'Les états baselineV104 décrivent le point de départ et ne prétendent pas mesurer la livraison V105.',
    'L’admission native prouve uniquement la revue enregistrée du BODY runtime-default, jamais la mécanique, la campagne ou les variantes.',
    'Une référence STORY/GUARD_H non admise sous son identifiant ne signifie pas que toute garde ou tout dessin exploitable est absent du dépôt.',
    'Le classeur privé original n’est pas disponible. Les lignes de 12_SPRITES, 06_ARMES et 11_ENTITES_COMBAT non extraites ne sont pas reconstituées.',
    'Les 201943 dessins budgétés pour le classeur complet ne sont ni le nombre de PNG manquants ni un budget attribuable à ces deux personnages.',
    'Locomotion, défenses, réactions et transitions non chiffrées par ces cellules nécessitent un rapprochement du registre existant avec leurs vraies lignes source.',
  ],
  fighters: plan.fighters.map(fighter => {
    const spec = extraction.p0Specifications.find(spec => spec.fighterId === fighter.fighterId);
    if (!spec) throw new Error('Missing extracted fighter ' + fighter.fighterId);
    const actions = fighter.actions.map(action => {
      const native = natives.find(native => native.fighterId === fighter.fighterId && native.actionId === action.id);
      if (!native) throw new Error('Missing recorded native admission ' + action.id);
      const normal = normalKeys.has(action.key);
      const legacyBolts = fighter.fighterId === 'feral-hunter' && action.key === 'S1';
      const sourceCells = action.category === 'move' ? spec.moves : spec.presentations;
      if (sourceCells.sheet !== action.sheet || sourceCells.cells[action.cell] !== action.sourceText) {
        throw new Error('Action does not equal extracted source: ' + action.id);
      }
      return {
        ...action, actionId: action.id,
        nativeAdmission: {
          atlasId: native.atlasId, appearanceId: native.appearanceId, clipIds: native.clipIds,
          reviewStatus: native.review.status, reviewScope: native.review.scope,
          partnerComposite: partnerKeys.has(action.key),
        },
        baselineV104: {
          gameplay: normal ? 'source-normal-recipe' : legacyBolts ? 'legacy-technique-different-source-contract' : 'not-source-wired',
          renderScope: normal ? 'source-normal-in-combat' : legacyBolts ? 'legacy-technique-in-combat' : 'study-viewer',
        },
      };
    });
    const campaignStages = [...'DEFGHIJK'].map((column, index) => {
      const cell = column + fighter.sourceRow;
      const sourceText = spec.campaign.cells[cell];
      if (!sourceText?.startsWith((index + 1) + ' — ')) throw new Error('Missing campaign source ' + cell);
      const bodyId = line(sourceText, 'Kit ou sprite');
      const sourceAction = fighter.actions.find(action => action.sourceText.includes('Corps : ' + bodyId + '\n'));
      return {
        id: 'CAM-' + fighter.fighterId + '.' + String(index + 1).padStart(2, '0'),
        ordinal: index + 1, sheet: spec.campaign.sheet, cell, sourceText,
        bodyId, stageId: line(sourceText, 'Stage'), opponentId: line(sourceText, 'Adversaire'),
        sourceActionId: sourceAction?.id ?? null,
        admissionStatus: 'not-admitted-as-campaign',
        sourceFrameCount: null,
        visualNeeds: needsForStage(fighter.fighterId, index + 1),
      };
    });
    const variantConstraints = [...'CDEFGHI'].map((column, index) => {
      const cell = column + fighter.sourceRow, sourceText = spec.variants.cells[cell];
      if (!sourceText) throw new Error('Missing variant source ' + cell);
      return {
        id: 'VAR-' + fighter.fighterId + '.' + variantKeys[index], key: variantKeys[index],
        sheet: spec.variants.sheet, cell, sourceText,
        assessment: 'not-measured-by-body-action-admissions',
      };
    });
    return {
      fighterId: fighter.fighterId, sourceRow: fighter.sourceRow, appearanceId: fighter.appearanceId,
      identity: spec.identity, actions, campaignStages, variantConstraints,
    };
  }),
};
const bytes = JSON.stringify(result, null, 2) + '\n';
if (process.argv.includes('--check')) {
  if (fs.readFileSync(output, 'utf8') !== bytes) throw new Error('Source inventory stale; run ' + import.meta.filename);
  console.log('V105 source inventory: exact pinned extraction; 52 actions, 16 campaign stages, 14 variant constraints.');
} else {
  fs.writeFileSync(output, bytes);
  console.log('Wrote ' + output);
}
