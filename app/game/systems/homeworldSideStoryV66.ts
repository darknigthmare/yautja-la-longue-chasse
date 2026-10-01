/** Original fan-game story adapted from the recovered Homeworld outline. No canonical case or law is asserted. */
export const HOMEWORLD_SIDE_STORY_V66 = {
  id: "borrowed-mark-v1", title: "La marque empruntée",
  pointIds: ["training-service", "forge-service", "memory-register-point", "temple-point", "enforcer-point"],
  loreStatus: "original-project-story", rewards: [] as readonly string[],
} as const;
export const SIDE_STORY_CLUES_V66 = [
  { id: "casting-seam", label: "Examiner la jointure", detail: "Une ligne régulière fait le tour de la pièce. La maîtresse reconnaît la jointure d’un moulage d’exercice, pas une fracture de chasse." },
  { id: "buried-stamp", label: "Examiner le revers", detail: "Sous la nouvelle marque subsiste le numéro d’un lot de la forge. La pièce n’est pas anonyme : ce numéro peut être confronté à son registre." },
  { id: "fresh-cut", label: "Examiner la gravure", detail: "Les sillons de la marque traversent la patine du moulage. La marque a donc été ajoutée après sa fabrication. Cela ne prouve pas encore qui l’a gravée." },
] as const;
export type SideStoryClueV66 = typeof SIDE_STORY_CLUES_V66[number]["id"];
export const SIDE_STORY_RECORDS_V66 = [
  { id: "claimed-return", time: "06:10", label: "Retour déclaré", text: "La déclaration du novice situe son retour avec cette prise au premier relevé du jour." },
  { id: "blank-issued", time: "07:40", label: "Moulage remis", text: "Le même numéro de lot figure dans une remise de matériel d’exercice, enregistrée après le retour déclaré." },
  { id: "mark-requested", time: "08:15", label: "Marque demandée", text: "Une demande de gravure personnelle porte ce même numéro. Le registre conserve une demande, pas une validation de chasse." },
] as const;
export type SideStoryResolutionV66 = "supervised-correction" | "recorded-review";
export interface HomeworldSideStoryV66Progress {
  version: 1;
  accepted: boolean;
  clues: SideStoryClueV66[];
  archiveRead: boolean;
  chronologyVerified: boolean;
  deductionVerified: boolean;
  testimonyHeard: boolean;
  resolution: SideStoryResolutionV66 | null;
  branchVerified: boolean;
  completed: boolean;
}
export type HomeworldSideStoryV66Action =
  | { kind: "accept" }
  | { kind: "inspect"; clueId: SideStoryClueV66 }
  | { kind: "read-archive" }
  | { kind: "sequence"; order: string[] }
  | { kind: "deduce"; conclusion: "unverified-claim" | "artisan-guilty" | "automatic-bad-blood" }
  | { kind: "listen" }
  | { kind: "choose"; resolution: SideStoryResolutionV66 }
  | { kind: "correct"; origin: "training" | "hunt"; status: "unverified" | "earned-trophy" }
  | { kind: "file"; scope: "documented-claim-only" | "condemn-novice" | "erase-admission" }
  | { kind: "close" };
export interface HomeworldSideStoryV66Context { pointId: string | null; eligible: boolean }
export interface HomeworldSideStoryV66Result { state: HomeworldSideStoryV66Progress; ok: boolean; changed: boolean; message: string }
export const defaultHomeworldSideStoryV66 = (): HomeworldSideStoryV66Progress => ({
  version: 1, accepted: false, clues: [], archiveRead: false, chronologyVerified: false,
  deductionVerified: false, testimonyHeard: false, resolution: null, branchVerified: false, completed: false,
});
const object = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const clueIds = SIDE_STORY_CLUES_V66.map(clue => clue.id);
export function isHomeworldSideStoryV66State(value: unknown): value is HomeworldSideStoryV66Progress {
  if (!object(value) || value.version !== 1 || Object.keys(value).some(key => !Object.hasOwn(defaultHomeworldSideStoryV66(), key))) return false;
  if (!["accepted", "archiveRead", "chronologyVerified", "deductionVerified", "testimonyHeard", "branchVerified", "completed"].every(key => typeof value[key] === "boolean")) return false;
  if (!Array.isArray(value.clues) || value.clues.some(id => !clueIds.includes(id)) || new Set(value.clues).size !== value.clues.length) return false;
  if (![null, "supervised-correction", "recorded-review"].includes(value.resolution as null | string)) return false;
  return (!value.clues.length || value.accepted === true)
    && (!value.archiveRead || value.clues.length === 3)
    && (!value.chronologyVerified || value.archiveRead === true)
    && (!value.deductionVerified || value.chronologyVerified === true)
    && (!value.testimonyHeard || value.deductionVerified === true)
    && (value.resolution === null || value.testimonyHeard === true)
    && (!value.branchVerified || value.resolution !== null)
    && (!value.completed || value.branchVerified === true);
}
/** Root save inspection must reject future versions before invoking this additive migration. */
export function normalizeHomeworldSideStoryV66(value: unknown): HomeworldSideStoryV66Progress {
  return isHomeworldSideStoryV66State(value) ? { ...value, clues: clueIds.filter(id => value.clues.includes(id)) } : defaultHomeworldSideStoryV66();
}
export function homeworldSideStoryV66Journal(value: HomeworldSideStoryV66Progress, eligible = true) {
  const state = normalizeHomeworldSideStoryV66(value);
  const step = !eligible ? "locked" : !state.accepted ? "invitation" : state.clues.length < 3 ? "inspection"
    : !state.archiveRead ? "archive" : !state.chronologyVerified ? "chronology" : !state.deductionVerified ? "deduction"
      : !state.testimonyHeard ? "testimony" : !state.resolution ? "decision" : !state.branchVerified
        ? state.resolution === "supervised-correction" ? "correction" : "review" : !state.completed ? "closure" : "complete";
  const destinations = {
    locked: { pointId: null, label: "Après le rite Blooded", objective: "Cette enquête adulte ne remplace pas l’accueil ni la formation du jeune chasseur." },
    invitation: { pointId: "training-service", label: "Instructeur · Terrasses", objective: "Écouter sa demande avant d’examiner la marque contestée d’un novice." },
    inspection: { pointId: "forge-service", label: "Maîtresse des parures · Forge", objective: "Inspecter jointure, revers et gravure ; distinguer observation et accusation." },
    archive: { pointId: "memory-register-point", label: "Conservatrice · Maison de la Mémoire", objective: "Consulter les trois relevés du numéro de lot. Ce dossier est distinct du trophée du convoi." },
    chronology: { pointId: "memory-register-point", label: "Conservatrice · Maison de la Mémoire", objective: "Reconstituer la chronologie des trois relevés avant de conclure." },
    deduction: { pointId: "memory-register-point", label: "Conservatrice · Maison de la Mémoire", objective: "Déterminer ce que prouve réellement la contradiction, sans prononcer de condamnation." },
    testimony: { pointId: "training-service", label: "Instructeur · Terrasses", objective: "Revenir avec les relevés et écouter la réponse du novice transmise par son instructeur." },
    decision: { pointId: "training-service", label: "Instructeur · Terrasses", objective: "Choisir une suite après lecture de ses effets. Le choix sera conservé." },
    correction: { pointId: "temple-point", label: "Gardienne des rites · Sanctuaire", objective: "Rectifier l’origine et le statut de la déclaration devant la gardienne, sans attribuer de prise." },
    review: { pointId: "enforcer-point", label: "Capitaine · Bastion", objective: "Déposer un dossier limité aux faits ; aucune culpabilité Bad Blood n’est automatisée." },
    closure: { pointId: "training-service", label: "Instructeur · Terrasses", objective: "Revenir confirmer la rectification ou le dépôt. Un dossier non remis n’est pas une histoire terminée." },
    complete: { pointId: null, label: "Histoire terminée", objective: state.resolution === "supervised-correction"
      ? "La déclaration est reclassée comme exercice non authentifié. Le novice reprend son apprentissage avec une rectification encadrée ; aucun rite n’est accordé."
      : "Les relevés et l’aveu sont conservés dans un dossier d’examen. La cité distingue les faits établis d’une sanction qui n’a pas été prononcée." },
  };
  const completed = Number(state.accepted) + state.clues.length + Number(state.archiveRead) + Number(state.chronologyVerified)
    + Number(state.deductionVerified) + Number(state.testimonyHeard) + Number(state.resolution !== null) + Number(state.branchVerified) + Number(state.completed);
  return { step, completed, total: 11, ...destinations[step], resolution: state.resolution };
}

/** Pure checkpoint transition. The caller additionally verifies physical proximity and durable acknowledgement. */
export function applyHomeworldSideStoryV66(value: HomeworldSideStoryV66Progress, action: HomeworldSideStoryV66Action, context: HomeworldSideStoryV66Context): HomeworldSideStoryV66Result {
  const state = normalizeHomeworldSideStoryV66(value);
  const reply = (ok: boolean, changed: boolean, message: string) => ({ state, ok, changed, message });
  if (!isHomeworldSideStoryV66State(value)) return reply(false, false, "Dossier annexe incohérent ou incompatible : aucune écriture.");
  if (context?.eligible !== true) return reply(false, false, "Le parcours Blooded doit être accompli avant cette enquête adulte.");
  if (!object(action) || typeof action.kind !== "string") return reply(false, false, "Action inconnue.");
  const journal = homeworldSideStoryV66Journal(state);
  if (state.completed) return reply(false, false, "Cette histoire est déjà conclue ; ses choix et ses effets ne sont pas rejoués.");
  if (!context.pointId || context.pointId !== journal.pointId) return reply(false, false, `Cette étape se déroule auprès de : ${journal.label}.`);
  const expected = ({ invitation: "accept", inspection: "inspect", archive: "read-archive", chronology: "sequence", deduction: "deduce", testimony: "listen", decision: "choose", correction: "correct", review: "file", closure: "close" } as Record<string, string>)[journal.step];
  if (action.kind !== expected) return reply(false, false, "Cette action ne correspond pas à l’étape actuelle. Le dossier demeure inchangé.");
  switch (action.kind) {
    case "accept": state.accepted = true; return reply(true, true, "La demande est conservée. L’objet reste à la forge ; aucune prise n’entre dans ton inventaire.");
    case "inspect": {
      const clue = SIDE_STORY_CLUES_V66.find(item => item.id === action.clueId);
      if (!clue) return reply(false, false, "Zone d’inspection inconnue.");
      if (state.clues.includes(clue.id)) return reply(true, false, clue.detail);
      state.clues = clueIds.filter(id => state.clues.includes(id) || id === clue.id);
      return reply(true, true, clue.detail);
    }
    case "read-archive": state.archiveRead = true; return reply(true, true, "Trois relevés conservés. Replace-les dans leur ordre avant de défendre une conclusion.");
    case "sequence":
      if (!Array.isArray(action.order) || JSON.stringify(action.order) !== JSON.stringify(SIDE_STORY_RECORDS_V66.map(record => record.id))) return reply(false, false, "L’ordre ne concorde pas avec les temps du registre. Reprends les trois relevés ; aucune progression n’est validée.");
      state.chronologyVerified = true; return reply(true, true, "Le retour déclaré précède la remise de ce moulage. La contradiction porte sur cette déclaration, pas sur toutes les chasses du novice.");
    case "deduce":
      if (action.conclusion !== "unverified-claim") return reply(false, false, action.conclusion === "artisan-guilty" ? "Un travail enregistré à la forge ne prouve pas que l’artisane a participé à une fausse déclaration." : "Les indices invalident l’authentification de cette prise. Ils ne permettent ni condamnation automatique ni retrait de rang.");
      state.deductionVerified = true; return reply(true, true, "Conclusion étayée : cette pièce ne justifie pas la chasse revendiquée. Il reste à entendre la réponse du novice.");
    case "listen": state.testimonyHeard = true; return reply(true, true, "L’instructeur transmet la réponse reçue : le novice reconnaît avoir présenté le moulage comme une prise, par peur d’avouer son retour sans trophée. L’aveu est conservé séparément des observations matérielles.");
    case "choose":
      if (!["supervised-correction", "recorded-review"].includes(action.resolution)) return reply(false, false, "Suite inconnue.");
      state.resolution = action.resolution; return reply(true, true, action.resolution === "supervised-correction" ? "Rectification encadrée choisie. Rejoins la gardienne pour corriger la déclaration ; aucune chasse n’est rétroactivement validée." : "Examen institutionnel choisi. Rejoins le capitaine avec les faits et leurs limites ; aucune condamnation n’est automatique.");
    case "correct":
      if (action.origin !== "training" || action.status !== "unverified") return reply(false, false, "La rectification doit conserver l’origine d’exercice et l’absence de chasse authentifiée. Un simple changement de titre ne suffit pas.");
      state.branchVerified = true; return reply(true, true, "La gardienne inscrit : moulage d’exercice, prise non authentifiée. Cette copie de déclaration reste au dossier, jamais dans ta collection de trophées.");
    case "file":
      if (action.scope !== "documented-claim-only") return reply(false, false, "Le dépôt doit garder relevés et aveu tout en limitant la conclusion à cette déclaration. Ni effacement de l’aveu, ni condamnation pré-écrite.");
      state.branchVerified = true; return reply(true, true, "Le capitaine reçoit les relevés et l’aveu, assortis de leurs limites. Il n’inscrit ni condamnation, ni sanction, ni statut Bad Blood.");
    case "close": state.completed = true; return reply(true, true, state.resolution === "supervised-correction" ? "La marque empruntée est close. L’instructeur reprend le novice en apprentissage ; la fausse prise reste désavouée dans le dossier rectifié." : "La marque empruntée est close. L’instructeur reconnaît le dépôt du dossier ; l’examen éventuel demeure distinct de ta conclusion et ne simule aucune sanction.");
    default: return reply(false, false, "Action inconnue.");
  }
}
