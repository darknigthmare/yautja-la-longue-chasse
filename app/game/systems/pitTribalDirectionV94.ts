import { getPitPresentationPlanV93, PIT_PRESENTATION_CATALOG_V93,
 type PitPresentationCategoryV93 } from './pitPresentationPlansV93';
import { PIT_PRESENTATION_INTRO_MS } from './pitRoundPresentation';
import { PIT_ROUND_TRANSITION_FRAMES, PIT_TICK_RATE } from './pitCombat';
export { getPitLifecycleReviewV94 } from './pitLifecycleReviewV94';

/** Art direction for the exact selected appearance. Never modifies combat,
 * admits a source drawing, infers a species from its name, or certifies canon. */
const bodyLanguage = {
 'film-stalker': 'Veille prédatrice : centre bas, regard qui suit le rival, respiration contenue.',
 'urban-pursuer': 'Présence nerveuse : appuis courts, tête attentive, changements de poids contenus.',
 'ritual-guard': 'Duel : garde structurée, appuis lourds, défi par tête et épaules, sans rite inventé.',
 'heavy-contact': 'Masse et inertie : souffle thoracique lent, épaules lourdes, stature constante.',
 'recon-watch': 'Pisteur : balayage bref du regard puis retour au rival ; aucun animal ou drone ajouté.',
 'elder-command': 'Ancien : gestes économes, contrôle du regard et des appuis ; aucune couronne ou arme offerte.',
 'precision-weapon': 'Prise précise : conserver chaque équipement visible dans sa main et sur son côté anatomique.',
 'neutral-unverified': 'Posture de la référence : ne pas déduire un équipement ou un comportement canonique du nom.',
 'human-guard': 'Anatomie humaine : souffle humain, posture adaptée à l’armure visible, sans mandibules ajoutées.',
} as const;

const beats: Readonly<Record<PitPresentationCategoryV93, readonly string[]>> = {
 idle: ['Garde de référence, deux pieds lisibles','Début de respiration du thorax','Souffle monte sans changer la stature',
  'Épaules accompagnent légèrement le souffle','Regard vérifie le rival','Souffle redescend','Poids revient aux appuis initiaux','Raccord vers la première pose'],
 intro: ['Observer depuis la garde fournie','Commencer un transfert de poids','Poser le poids sans déplacement du moteur',
  'Tourner légèrement la tête vers le rival','Stabiliser les épaules','Marquer un bref arrêt du regard',
  'Incliner sobrement la tête','Relever le regard','Resserrer la garde déjà visible','Stabiliser le bassin',
  'Reprendre le souffle','Terminer dans la garde de combat'],
 'round-victory': ['Accuser la fin de manche','Récupérer le souffle','Desserrer seulement la tension des épaules',
  'Redresser le torse','Vérifier le rival','Maintenir le regard','Défi contenu par la tête',
  'Reposer le poids','Abaisser les épaules','Reprendre la garde','Stabiliser les pieds','Tenir la pose finale'],
 'round-defeat': ['Accuser le résultat sans nouvelle blessure','Laisser descendre les épaules','Fléchir progressivement les genoux',
  'Abaisser le centre de gravité','Conserver toutes les prises d’armes','Arrêter l’affaissement sur un appui cohérent',
  'Reprendre un souffle bas','Lever légèrement le regard','Retrouver l’équilibre','Stabiliser le torse',
  'Maintenir une défaite non létale','Tenir le résultat sans exécution'],
 'finisher-stunned': ['Corps vivant déstabilisé, appuis cohérents','Oscillation contenue des épaules','Tête accuse le vertige',
  'Compenser sans attaquer','Retrouver partiellement la verticale','Perdre légèrement l’équilibre',
  'Ramener le poids entre les pieds','Raccord de vertige sans guérison ou disparition de l’équipement'],
 taunt: ['Conserver la garde et le regard du rival','Démarrer un défi par la tête','Incliner légèrement le menton',
  'Accompagner par une épaule','Arrêter le geste sans attaque','Fixer le rival','Tenir le défi bref',
  'Relâcher la tension de l’épaule','Ramener la tête','Récupérer le souffle','Reprendre les appuis','Terminer dans la garde'],
};

export const PIT_TRIBAL_RULES_V94 = Object.freeze([
 'Une vue gauche est dessinée indépendamment : les armes restent sur leur côté anatomique, sans miroir logiciel.',
 'Masque, trophées, doigts, attaches et armes visibles restent continus ; aucun retrait ou dégainage non documenté.',
 'Une seule stature de référence par page, commune aux poses hautes et basses ; aucun agrandissement pose par pose.',
 'Ancrer le contact réel des pieds au sol ; les poses accroupies restent plus basses et ne flottent pas.',
 'Introductions avec figurant, compagnon, capsule ou vaisseau seulement après preuve propre au personnage et sprites séparés admis.',
 'Aucun geste religieux humain, rite de clan, langage, pouvoir ou mutation déduit du nom ; ces poses sont des adaptations de jeu.',
 'La provocation est cosmétique et annulable ; le vertige de fatalité appartient uniquement au perdant du KO final.',
]);

export function getPitTribalDirectionV94(fighterId: unknown, category: unknown, variantId?: string | null) {
 const source = getPitPresentationPlanV93(fighterId, category, variantId);
 if (!source) return null;
 const isYautja = source.entry.species === 'yautja';
 const language = source.entry.species === 'human' ? bodyLanguage['human-guard'] :
  source.entry.species === 'unverified' || source.entry.species === 'non-yautja' ? bodyLanguage['neutral-unverified'] :
  bodyLanguage[source.entry.familyId as keyof typeof bodyLanguage] ?? bodyLanguage['neutral-unverified'];
 const ticks = source.category.id === 'intro' ? PIT_PRESENTATION_INTRO_MS * PIT_TICK_RATE / 1000 :
  source.category.id === 'taunt' ? 90 : PIT_ROUND_TRANSITION_FRAMES;
 const poses = beats[source.category.id];
 return Object.freeze({
  version: 94 as const, fighterId: source.entry.fighterId, appearanceId: source.appearance.appearanceId,
  variantId: source.appearance.variantId, category: source.category.id, clipId: source.category.clipId,
  species: source.entry.species, language, tribalYautjaAdaptation: isYautja,
  direction: `${source.entry.name} · ${source.appearance.label}. ${language} ${source.plan.direction}`,
  referenceSprites: source.appearance.referenceSprites, sourceIds: source.entry.sourceIds,
  sourceConstraints: source.entry.constraints, rules: PIT_TRIBAL_RULES_V94,
  keyPoses: poses, targetDistinctDrawingsPerFacing: poses.length,
  durationTicks: ticks, ticksPerSecond: 60 as const,
  // Distribute integer durations without changing the actual presentation clock.
  frameDurations: Object.freeze(poses.map((_, i) => Math.floor((i + 1) * ticks / poses.length) - Math.floor(i * ticks / poses.length))),
  fidelity: 'gameplay-adaptation' as const, documentedGesture: false as const,
  oneToOneCertified: false as const, nativeCycleComplete: false as const,
 });
}

/** Covers every real identity and costume, not a claim that their PNGs exist. */
export function getPitTribalProductionQueueV94() {
 return PIT_PRESENTATION_CATALOG_V93.entries.flatMap(entry => entry.appearances.flatMap(appearance =>
  PIT_PRESENTATION_CATALOG_V93.categories.map(category => getPitTribalDirectionV94(entry.fighterId, category.id, appearance.variantId)!)));
}
