import type { NurseryPhase, NurseryState } from "./nurseryPrologue";

/** Original clan dialogue. This adds connective scenes, not canonical institutions or rewards. */
export interface NurseryContinuityV72 {
  version: 1;
  introPage: number;
  debriefPage: number;
  journeyPage: number;
  receptionPage: number;
  /** A resumed V47-V71 duel keeps its positions, winner and clock exactly. */
  recap: boolean;
}
export const NURSERY_CONTINUITY_V72 = {
  introPages: 5, debriefPages: 2, journeyPages: 2,
  minimumReadTicks: 24, walkoutTicks: 300, clanEntryTicks: 240, clanDepartureTicks: 240,
  roadSrc: "/game/prologue/v72/nursery-exit.png",
  corridorSrc: "/game/prologue/v72/clan-arrival-corridor.png",
  hallSrc: "/game/prologue/v72/clan-audience-hall.png",
  chiefSrc: "/game/prologue/v72/clan-chief-seated.png",
  veilSrc: "/game/prologue/v72/clan-door-veil.png",
  // Measured top of the solid side-on walkway in the unmodified generated image.
  roadSupportY: .692, roadActorHeight: 74,
  corridorSupportY: .782, hallSupportY: .785, unbloodedHeight: 108,
} as const;
export interface NurseryStoryCardV72 {
  id: string;
  chapter: string;
  speaker: string;
  title: string;
  text: string;
  objective: string;
  button: string;
}
const intro: readonly NurseryStoryCardV72[] = [
  { id: "born-in-clan", chapter: "Avant la première chasse", speaker: "Chronique du clan", title: "Un jeune du clan",
    text: "Tu es un Youngling, élevé dans la nurserie du clan. Avant de suivre une piste hors du village, tu dois apprendre à tenir tes appuis, observer et t'arrêter lorsque l'épreuve prend fin.",
    objective: "Aujourd'hui : un duel surveillé entre deux jeunes. Aucune proie à tuer.", button: "Découvrir la nurserie" },
  { id: "nursery-place", chapter: "La nurserie", speaker: "Chronique du clan", title: "Un village sous la lune rouge",
    text: "Le village s'est installé dans les vestiges desséchés d'un immense mille-pattes ancien. Ses arches abritent les jeunes, leurs proches et les maîtres. Cette arène est un lieu d'apprentissage, pas le terme de ta chasse.",
    objective: "Le clan observe les deux élèves depuis les terrasses.", button: "Écouter le maître" },
  { id: "mentor-briefing", chapter: "L'épreuve du jour", speaker: "Maître de la nurserie", title: "La maîtrise avant la force",
    text: "« Ton adversaire appartient au même clan. Mets-le à terre, puis cesse de frapper. Je veux voir si tu sais maîtriser ton geste, pas si tu peux blesser un des nôtres. »",
    objective: "Duel non létal : la mise à terre arrête immédiatement l'exercice.", button: "Écouter l'autre jeune" },
  { id: "rival-oath", chapter: "Deux élèves, une épreuve", speaker: "L'autre Youngling", title: "Un rival d'entraînement",
    text: "« Aujourd'hui, nous nous éprouvons. Demain, nous apprendrons encore ensemble. Que le maître voie lequel tient ses appuis. » Le rival fait face au jeune que tu incarnes ; vous n'êtes pas des ennemis de clan.",
    objective: "Tu es le jeune à gauche au début du duel.", button: "Voir les consignes" },
  { id: "duel-consent", chapter: "Entrer dans l'arène", speaker: "Maître de la nurserie", title: "À ton signal seulement",
    text: "« Déplace-toi, frappe du poing, esquive ou projette au contact. Le matériel au sol appartient à la nurserie ; rien ne t'est offert. Lève le bras lorsque tu es prêt : l'autre jeune attendra ton signal. »",
    objective: "Gagner cet exercice ne donne ni Premier Sang, ni vaisseau, ni arme personnelle.", button: "J'ai compris · entrer dans l'arène" },
];
const debrief: readonly NurseryStoryCardV72[] = [
  { id: "master-stop", chapter: "Après le duel", speaker: "Maître de la nurserie", title: "L'épreuve est finie",
    text: "« Arrête. Tu as tenu tes appuis. Le jeune au sol se relèvera ; ce n'était pas une chasse. La force sans retenue ne te conduira pas plus loin. » Le maître interrompt l'exercice et veille sur le rival.",
    objective: "Aucun coup supplémentaire : les commandes de combat sont désactivées.", button: "Attendre que le rival récupère" },
  { id: "rival-recovery", chapter: "Quitter l'arène ensemble", speaker: "L'autre Youngling", title: "La prochaine leçon",
    text: "« Tu m'as pris mes appuis. Je retiendrai la leçon. » Le rival a repris ses forces sous la surveillance du maître. Vous rendez le matériel de la nurserie, puis quittez l'arène par le même passage.",
    objective: "Suivre à pied le passage du village. Aucune téléportation vers la cité.", button: "Quitter la nurserie à pied" },
];
const journey: readonly NurseryStoryCardV72[] = [
  { id: "training-ellipse", chapter: "Ellipse · la formation se poursuit", speaker: "Chronique du clan", title: "L'enfance ne s'achève pas en un duel",
    text: "Le temps passe. Tu grandis et poursuis l'apprentissage des pistes, de la patience et des usages du clan. Le jeune enfant devient un Unblooded ; sa tenue et sa silhouette changent. Le duel n'est ni sa première chasse, ni son Premier Sang.",
    objective: "Le chapitre suivant commence après cette formation, pas au même instant.", button: "Suivre l'appel du clan" },
  { id: "city-journey", chapter: "Après l'ellipse · vers la cité", speaker: "Chronique du clan", title: "Une convocation, pas une récompense",
    text: "Une escorte du clan te conduit depuis le village vers la cité. Le chef des Chasses veut recevoir les jeunes qui entrent dans leur nouvelle formation ; l'instructeur des terrasses attendra ensuite ton passage.",
    objective: "Première destination : le chef des Chasses. Puis l'instructeur des terrasses.", button: "Approcher de la cité" },
];

export function normalizeNurseryContinuityV72(raw: unknown): NurseryContinuityV72 | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const item = raw as Record<string, unknown>;
  const count = (value: unknown, max: number) => typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= max;
  if (item.version !== 1 || !count(item.introPage, 5) || !count(item.debriefPage, 2) || !count(item.journeyPage, 2) || !count(item.receptionPage, 4) || typeof item.recap !== "boolean") return null;
  return { version: 1, introPage: item.introPage as number, debriefPage: item.debriefPage as number, journeyPage: item.journeyPage as number, receptionPage: item.receptionPage as number, recap: item.recap };
}
export function enableNurseryContinuityV72(state: NurseryState): NurseryState {
  if (state.continuityV72 || state.phase === "complete") return state;
  const fresh = state.phase === "loading" || state.phase === "prompt";
  return { ...state, continuityV72: { version: 1, introPage: fresh ? 0 : 5, debriefPage: 0, journeyPage: 0, receptionPage: 0, recap: !fresh } };
}
export function nurseryContinuityPhaseV72(phase: NurseryPhase): boolean {
  return phase === "debrief" || phase === "walkout" || phase === "journey" || phase === "reception" || phase === "clan-entry" || phase === "clan-departure";
}
export function nurseryContinuityMatchesPhaseV72(story: NurseryContinuityV72, phase: NurseryPhase): boolean {
  if (phase === "loading" || phase === "prompt") return story.introPage < 5 && story.debriefPage === 0 && story.journeyPage === 0 && story.receptionPage === 0;
  if (story.introPage !== 5) return false;
  if (phase === "debrief") return story.debriefPage < 2 && story.journeyPage === 0 && story.receptionPage === 0;
  if (phase === "walkout") return story.debriefPage === 2 && story.journeyPage === 0 && story.receptionPage === 0 && !story.recap;
  if (phase === "journey") return story.debriefPage === 2 && story.journeyPage < 2 && story.receptionPage === 0 && !story.recap;
  if (phase === "reception" || phase === "complete" || phase === "clan-entry" || phase === "clan-departure") return story.debriefPage === 2 && story.journeyPage === 2 && !story.recap &&
    (phase === "reception" ? story.receptionPage < 4 : phase === "clan-entry" ? story.receptionPage === 1 : story.receptionPage === 4);
  return story.debriefPage === 0 && story.journeyPage === 0 && story.receptionPage === 0;
}
export function nurseryStoryCardV72(state: NurseryState, hunterName = "Jeune du clan"): NurseryStoryCardV72 | null {
  const story = state.continuityV72;
  if (!story) return null;
  if (story.recap) return { id: "legacy-resume-recap", chapter: "Reprendre l'épreuve", speaker: "Chronique du clan", title: "Le duel de la nurserie",
    text: "Tu incarnes un jeune du clan, dans un exercice surveillé et non létal. Le rival est un autre élève. La mise à terre met fin au duel ; le village et sa lune apparaissent ensuite. Ta reprise conserve exactement l'épreuve déjà jouée.",
    objective: state.winner === "player" ? "La victoire est acquise. Le débrief et le voyage vers la cité restent à suivre." : "Maîtriser le duel, puis écouter le maître avant de quitter le village.", button: "Reprendre la scène sauvegardée" };
  if (state.phase === "prompt") return intro[story.introPage] ?? null;
  if (state.phase === "debrief") return debrief[story.debriefPage] ?? null;
  if (state.phase === "journey") return journey[story.journeyPage] ?? null;
  if (state.phase === "reception") {
    const name = hunterName.trim().slice(0, 40) || "Jeune du clan";
    return [
      { id: "arrival-terminal", chapter: "Niveau 1 · le couloir d'accueil", speaker: "Terminal du clan", title: "Annoncer ton arrivée",
        text: `« ${name}, tu vas commencer ton ascension auprès de ton clan. Le chef t'attend. Confirme ton nom pour annoncer ton arrivée. » Le nom choisi lors de la création de ta partie est déjà inscrit au terminal, dans l'alcôve à gauche.`,
        objective: "Confirmer l'annonce. La porte d'audience t'invite ensuite à entrer.", button: `Annoncer ${name} au clan` },
      { id: "clan-code", chapter: "La cérémonie d'accueil", speaker: "Chef des Chasses", title: "Prouver ta valeur par tes actes",
        text: "« Tu viens du même clan que ceux qui t'entourent. Apprends à lire la proie, à choisir une épreuve digne et à répondre de tes actes. Le rang ne remplace ni la retenue, ni le retour auprès des tiens. Ta formation commence ici ; le Premier Sang viendra après ses propres épreuves. »",
        objective: "Le chef expose le code de ce clan. Cette cérémonie ne vaut aucun rite de chasse accompli.", button: "Recevoir les consignes de formation" },
      { id: "clan-mentor", chapter: "L'Élite chargé de la formation", speaker: "Chef des Chasses", title: "Un guide, pas un raccourci",
        text: "« L'instructeur des terrasses conduira ta formation. Va le trouver après l'audience : il t'orientera vers le dojo, les terrains d'exercice et les baraquements. Écoute les artisans ; tu apprendras l'usage de tes outils avant de les porter en chasse. » L'Élite attend près du chemin de sortie.",
        objective: "La cité et ses lieux sont visitables. Les exercices, l'équipement et le repos restent des étapes jouables distinctes.", button: "Écouter l'instructeur" },
      { id: "city-exit", chapter: "Sortie du hall · la cité", speaker: "Instructeur des terrasses", title: "Rejoins-moi sur les terrasses",
        text: "« Cette audience publique annonce ta venue. Dans l'aile d'audience de la cité, confirme personnellement ton affectation auprès du chef ; il te donnera tes propres consignes. Rejoins-moi ensuite sur les terrasses. Nous ne partons pas encore avec ton propre vaisseau. »",
        objective: "Quitter le hall à pied, enregistrer l'accueil, puis confirmer l'affectation auprès du chef et retrouver l'instructeur dans la cité jouable.", button: "Suivre la sortie vers la cité · enregistrer" },
    ][story.receptionPage] ?? null;
  }
  return null;
}
/** Skip only the optional establishing dialogue; consent, real duel and ending remain required. */
export function skipNurseryContextV72(state: NurseryState): NurseryState {
  if (state.phase !== "prompt" || !state.continuityV72 || state.continuityV72.introPage >= 4 || state.continuityV72.recap) return state;
  return { ...state, phaseTick: 0, inputArmed: false, continuityV72: { ...state.continuityV72, introPage: 4 } };
}
