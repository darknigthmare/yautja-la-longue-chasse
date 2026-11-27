import type { SaveGame } from "../types";
import { getChronicleRank } from "./clanChronicle";
import { canReadFirstLessonO6 } from "./originContinuationO6";
import { firstLessonPlayedO6 } from "./originPracticeO6";
import { normalizeOriginV151 } from "./originsV151";
import { houseV149, normalizeResidenceV149 } from "./residenceV149";
import { shipReceiptV161 } from "./shipReceiptV161";
import { SHIP_ACQUISITION_BINDING_V89 } from "./shipAcquisitionV89";
import { shipForId } from "../shipCatalogue";
import { CLAN_SHIP_ID, inspectClanShipDocking, isClanShipRoomId, type ClanShipDockingState, type ClanShipRoomId } from "./clanShipDocking";
import { CLAN_SHIP_RECRUITS, inspectClanShipOperations, type ClanShipNpcId } from "./clanShipOperations";
import { clanResidenceCrewPostRooms, type CompanionCampaign } from "./companionResidence";
import { tribunalAccessV147 } from "./honorTribunalV147";
import { CLAN_SHIP_TROPHY_CASE, clanShipTrophyConclusion, type ClanShipTrophyVerdict } from "./clanShipTrophyCase";
import { clanShipTrophyHearingView, inspectClanShipTrophyHearing } from "./clanShipTrophyHearing";
import { clanShipIncidentView, evaluateClanShipIncidentsCampaign, evaluateClanShipTrophyHearingCampaign,
  inspectClanShipIncidents } from "./clanShipIncidents";
import {
  BIBLE_CULTURAL_BINDING_V86, bibleCulturalContextV86, normalizeBibleSceneLedgerV86,
} from "./bibleSceneCulturalV86";
import { normalizeHomeworldRegionV68, type HomeworldRegionStateV68 } from "./homeworldRegionsV68";
import { advanceDepartureO6, departureProgressO6, departureViewO6, normalizeDepartureO6,
  type DepartureJournalO6, type DepartureOrderO6 } from "./originDepartureO6";

export type LegacySiteR2 = { kind: "residence" | "ship"; id: string } |
  { kind: "clan-ship"; id: typeof CLAN_SHIP_ID } |
  { kind: "halt"; id: typeof BIBLE_CULTURAL_BINDING_V86.siteId };
export type LegacySceneR2 = "cohort" | "epilogue";
export const LEGACY_WALK_LIMIT_R2 = 24;
const cohortOptions = ["stay", "help"] as const;
const epilogueOptions = ["depart", "welcome", "transmit"] as const;
type CohortChoice = typeof cohortOptions[number];
type EpilogueChoice = typeof epilogueOptions[number];

export const LEGACY_COHORT_R2 = [
  { id: "track", x: 15, label: "Piste", line: "J’ai suivi les empreintes jusqu’à la pierre. Après, la pluie les a effacées.",
    question: "Qu’est-ce que la pluie a effacé ?", clarification: "Je sais où la piste s’arrête. Sa direction après la pierre reste inconnue.",
    response: "Quand je transmettrai la piste, je montrerai la pierre où ma lecture s’arrête." },
  { id: "knot", x: 17, label: "Nœud", line: "J’ai repris le filet quand le premier nœud s’est défait.",
    question: "Qu’as-tu pu confirmer du nœud ?", clarification: "J’ai vu le premier nœud lâcher. Il faudrait refaire l’essai pour expliquer pourquoi.",
    response: "Je garderai dans le récit le premier essai et la reprise du filet." },
  { id: "crossing", x: 19, label: "Passage", line: "J’ai attendu le signal avant de passer. Le chemin bas nous a laissé revenir ensemble.",
    question: "Quel passage as-tu parcouru ?", clarification: "Je peux décrire le chemin bas. Depuis là, je n’ai pas pu vérifier le passage haut.",
    response: "Je donnerai le signal et le chemin réellement parcouru, ensemble." },
  { id: "piece", x: 21, label: "Pièce", line: "J’ai rapporté la pièce pour qu’on puisse regarder les marques dessus.",
    question: "Que disent les marques à elles seules ?", clarification: "On peut regarder les marques. Leur origine reste à établir.",
    response: "Je montrerai les marques et je laisserai ouverte la question de leur origine." },
] as const;
type CohortWitnessR2 = typeof LEGACY_COHORT_R2[number];
type CohortSpeakerR2 = CohortWitnessR2["id"];

type CohortOrder =
  | { kind: "greet" | "lead" | "unload" | "wall-foot" | "door-foot" | "test" | "unknown" | "close"; at: number }
  | { kind: "approach"; at: number; choice: CohortChoice }
  | { kind: "listen" | "ask"; at: number; speaker: CohortSpeakerR2 };
type EpilogueOrder =
  | { kind: "belongings" | "relations" | "act"; at: number }
  | { kind: "choose"; at: number; choice: EpilogueChoice }
  | { kind: "offer" | "answer"; at: number; speaker: CohortSpeakerR2 };
export type LegacyCommandR2 = { scene: "cohort"; order: CohortOrder } | { scene: "epilogue"; order: EpilogueOrder };

type ClanBerthProofR2 = {
  berth: ClanShipDockingState;
  trophy: ClanShipTrophyVerdict | null;
};
type ClanCrewProofR2 = { id: ClanShipNpcId; room: ClanShipRoomId };
type PersonalShipProofR2 = Pick<NonNullable<ReturnType<typeof shipReceiptV161>["receipt"]>, "shipId" | "sourceId" | "candidateId">;
type StoredEpilogueOrder = EpilogueOrder |
  { kind: "belongings"; at: number; clanProof: ClanBerthProofR2 } |
  { kind: "relations"; at: number; clanProof: ClanCrewProofR2[] } |
  { kind: "belongings"; at: number; haltOperationId: string } |
  { kind: "relations"; at: number; personalShipProof: PersonalShipProofR2 };
type Journal<Order> = { site: LegacySiteR2; events: Order[] };
export type LegacyFinaleR2 = {
  ownerCreatedAt: string;
  endingId: string;
  cohort?: Journal<CohortOrder>;
  epilogue?: Journal<StoredEpilogueOrder>;
} & ({ version: 1; departureO6?: never } | { version: 2; departureO6: DepartureJournalO6 });
type LegacySave = CompanionCampaign & Pick<SaveGame, "originV151" | "residenceV149" | "shipAcquisitionV89" |
  "legacyFinaleR2" | "tribunalV147" | "clanShipIncidents" | "clanShipTrophyHearing" | "eliteRecognitionV174"> & LegacyHaltSave;
type LegacyHaltSave = Pick<SaveGame, "createdAt" | "homeworld" | "homeworldRegionV68" | "profile" | "prologue">;

const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const closeTo = (at: number, x: number) => Math.abs(at - x) <= 1;
const position = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= LEGACY_WALK_LIMIT_R2;
const sameSite = (a: LegacySiteR2, b: LegacySiteR2) => a.kind === b.kind && a.id === b.id;

export function legacyOriginEndingR2(save: Pick<LegacySave, "originV151" | "createdAt" | "prologue" |
  "eliteRecognitionV174" | "residenceV149" | "legacyFinaleR2">): string | null {
  const origin = normalizeOriginV151(save.originV151);
  if (!origin?.ending?.endingChoiceConfirmed || !origin.ending.endingRealized ||
      !origin.consumed.includes(origin.originId + "-M29:confirmed") ||
      !origin.consumed.includes(origin.originId + "-M30:realized")) return null;
  if (origin.ending.originEndingId === "O6-E1" && !canReadFirstLessonO6({ ...save, originV151: origin })) return null;
  return origin.ending.originEndingId;
}

export function legacyResidenceSiteR2(save: Pick<LegacySave, "residenceV149">, houseId: string): LegacySiteR2 | null {
  const residence = normalizeResidenceV149(save.residenceV149);
  return residence?.rights.includes(houseId) ? { kind: "residence", id: houseId } : null;
}
export function legacyShipSiteR2(save: LegacySave): LegacySiteR2 | null {
  const hull = shipReceiptV161(save).receipt;
  return hull ? { kind: "ship", id: hull.instanceId } : null;
}

function personalShipProofR2(save: LegacySave, site: LegacySiteR2): PersonalShipProofR2 | null {
  const hull = shipReceiptV161(save).receipt;
  return site.kind === "ship" && hull?.instanceId === site.id
    ? { shipId: hull.shipId, sourceId: hull.sourceId, candidateId: hull.candidateId } : null;
}

function recordedShipHandoverR2(state: LegacyFinaleR2 | null | undefined, site: LegacySiteR2) {
  const journal = state?.epilogue;
  if (site.kind !== "ship" || !journal || !sameSite(journal.site, site)) return null;
  const checked = journal.events.find(event => "personalShipProof" in event);
  return checked && "personalShipProof" in checked ? checked.personalShipProof : null;
}

export function legacyPersonalShipReadoutR2(save: LegacySave, site: LegacySiteR2) {
  const hull = personalShipProofR2(save, site);
  const checked = recordedShipHandoverR2(save.legacyFinaleR2, site);
  return {
    belongings: hull ? [`Coque remise · ${shipForId(hull.shipId).name}`] : [],
    relations: hull && checked ? ["Chantier naval · remise des droits et entrée à bord attestées"] : [],
  };
}

const halt = BIBLE_CULTURAL_BINDING_V86;
const legacyHaltOperationPatternR2 = /^D6-W-CULT-25:[\w:-]{1,100}$/;

function resolvedHaltReceiptR2(save: Pick<LegacyHaltSave, "createdAt" | "homeworld">, operationId: string) {
  const ledger = normalizeBibleSceneLedgerV86(save.homeworld.bibleScenesV86);
  if (ledger?.ownerSaveCreatedAt !== save.createdAt) return null;
  return ledger.receipts.find(receipt => receipt.operationId === operationId && receipt.status === "resolved") ?? null;
}

function currentHaltReceiptR2(save: LegacyHaltSave, position = save.homeworldRegionV68) {
  const region = normalizeHomeworldRegionV68(position);
  if (!region || region.regionId !== halt.regionId || region.zone !== "village" || region.pendingFieldEvent) return null;
  const context = bibleCulturalContextV86({
    save, ownerSaveCreatedAt: save.createdAt, region, sceneActive: true, focused: true, suspended: false,
    host: { id: halt.npcId, present: true, alive: true, conscious: true },
    table: { id: halt.tableId, ...halt.table },
  });
  return context.eligible && context.operationId ? resolvedHaltReceiptR2(save, context.operationId) : null;
}

export function legacyHaltSiteR2(save: LegacyHaltSave, position?: LegacyHaltSave["homeworldRegionV68"]): LegacySiteR2 | null {
  return currentHaltReceiptR2(save, position) ? { kind: "halt", id: halt.siteId } : null;
}

function haltEpilogueOperationR2(state: LegacyFinaleR2 | null | undefined): string | null {
  if (state?.epilogue?.site.kind !== "halt") return null;
  const first = state.epilogue.events[0];
  return first && "haltOperationId" in first ? first.haltOperationId : null;
}

export function legacyHaltReadoutR2(save: Pick<LegacySave, "createdAt" | "homeworld" | "legacyFinaleR2">) {
  const operation = haltEpilogueOperationR2(save.legacyFinaleR2);
  const receipt = operation ? resolvedHaltReceiptR2(save, operation) : null;
  return {
    belongings: receipt ? [`Relevé des Crêtes · ${receipt.returnProof.trailCount} indices remis`] : [],
    relations: receipt ? [halt.npcName] : [],
  };
}

function clanBerthAtTrophiesR2(save: Pick<LegacySave, "createdAt" | "clanShipDocking">) {
  const dock = inspectClanShipDocking(save.clanShipDocking, save.createdAt).state;
  return dock?.status === "aboard" && dock.roomId === "trophees" ? dock : null;
}

export function legacyClanShipSiteR2(save: Pick<LegacySave, "createdAt" | "clanShipDocking" | "tribunalV147">): LegacySiteR2 | null {
  return clanBerthAtTrophiesR2(save) && tribunalAccessV147(save.tribunalV147).clanShip ? { kind: "clan-ship", id: CLAN_SHIP_ID } : null;
}

function clanTrophyVerdictR2(save: LegacySave): ClanShipTrophyVerdict | null {
  if (save.clanShipTrophyHearing != null) {
    const hearing = inspectClanShipTrophyHearing(save.clanShipTrophyHearing, save.createdAt).state;
    if (!hearing || !evaluateClanShipTrophyHearingCampaign(hearing, save).allowed) return null;
    const verdict = clanShipTrophyHearingView(hearing);
    return verdict.completed ? verdict.conclusion : null;
  }
  const archive = inspectClanShipIncidents(save.clanShipIncidents, save.createdAt).state;
  if (!archive || !evaluateClanShipIncidentsCampaign(archive, save).allowed) return null;
  const caseFile = clanShipIncidentView(archive, "contested-trophy");
  return caseFile.completedRevision === null ? null : caseFile.trophy?.conclusion ?? null;
}

function clanCrewR2(save: LegacySave): ClanCrewProofR2[] {
  const operations = inspectClanShipOperations(save.clanShipOperations, save.createdAt).state;
  if (!operations) return [];
  const posts = clanResidenceCrewPostRooms(save);
  return CLAN_SHIP_RECRUITS.flatMap(({ id }) => {
    const room = posts[id];
    return room && operations.recruitedNpcIds.includes(id) ? [{ id, room }] : [];
  });
}

function clanEpilogueEvidenceR2(state: LegacyFinaleR2 | null | undefined) {
  const journal = state?.epilogue;
  if (journal?.site.kind !== "clan-ship") return { belongings: null, crew: [] };
  let belongings: ClanBerthProofR2 | null = null;
  let crew: ClanCrewProofR2[] = [];
  for (const event of journal.events) {
    if ("clanProof" in event) {
      if (event.kind === "belongings") belongings = event.clanProof;
      if (event.kind === "relations") crew = event.clanProof;
    }
  }
  return { belongings, crew };
}

export function legacyClanShipReadoutR2(state: LegacyFinaleR2 | null | undefined) {
  const { belongings, crew } = clanEpilogueEvidenceR2(state);
  const verdict = clanShipTrophyConclusion(belongings?.trophy);
  return {
    belongings: belongings ? [
      `Relevé d’amarrage · ${shipForId(belongings.berth.personalShipId).name}`,
      ...(verdict && "plaque" in verdict ? [`${CLAN_SHIP_TROPHY_CASE.id} · ${verdict.plaque}`] : []),
    ] : [],
    relations: crew.map(entry => CLAN_SHIP_RECRUITS.find(candidate => candidate.id === entry.id)!.name),
  };
}

function siteHeld(save: LegacySave, site: LegacySiteR2): boolean {
  if (site.kind === "clan-ship") return legacyClanShipSiteR2(save)?.id === site.id;
  if (site.kind === "halt") return legacyHaltSiteR2(save)?.id === site.id;
  return site.kind === "residence"
    ? legacyResidenceSiteR2(save, site.id) !== null : legacyShipSiteR2(save)?.id === site.id;
}

export function legacySceneRefusalR2(save: LegacySave, site: LegacySiteR2, scene: LegacySceneR2): string | null {
  const endingId = legacyOriginEndingR2(save);
  if (!endingId) return "La clôture de la voie d’origine doit d’abord être jouée.";
  if (endingId === "O6-E1" && !firstLessonPlayedO6(save.originV151?.continuationO6?.practice) && !save.legacyFinaleR2?.[scene])
    return "Joue la première leçon avant d’ouvrir un nouveau récit.";
  if (!siteHeld(save, site)) return site.kind === "halt"
    ? "Rejoins la table des Crêtes après avoir consigné ta halte."
    : "Le lieu doit t’avoir été effectivement remis.";
  if (scene === "cohort") {
    if (site.kind !== "residence" || getChronicleRank(save.prologue?.chronicle) !== "ancient") {
      return "Le retour de la cohorte se joue au foyer après la reconnaissance Ancient.";
    }
    const origin = normalizeOriginV151(save.originV151);
    const setup = origin?.trainingYardO6?.houses[site.id];
    const lesson = origin?.continuationO6;
    const archivedHere = save.legacyFinaleR2?.cohort?.site.id === site.id;
    if (endingId !== "O6-E1" || setup?.at(-1) !== "threshold" ||
        (firstLessonPlayedO6(lesson?.practice) && lesson?.houseId !== site.id && !archivedHere)) {
      return "Le prolongement jouable demande une maison d’enseignement aménagée et sa fin de voie réalisée.";
    }
  }
  const journal = save.legacyFinaleR2?.[scene];
  return journal && !sameSite(journal.site, site) ? "Ce récit se reprend dans le lieu où il a commencé." : null;
}

type CohortArrivalR2 = "waiting" | "greeted" | "inside";
export type LegacyCohortViewR2 = {
  at: number; arrival: CohortArrivalR2; loaded: boolean; wallFoot: boolean; doorFoot: boolean; failedAt: number | null;
  steady: boolean; path: CohortChoice | null; heard: CohortSpeakerR2[]; clarified: CohortSpeakerR2[];
  unknown: boolean; complete: boolean;
};
export type LegacyEpilogueViewR2 = {
  at: number; belongings: boolean; relations: boolean; choice: EpilogueChoice | null;
  offered: CohortSpeakerR2 | null; answered: boolean; complete: boolean;
};
const emptyCohort = (arrival: CohortArrivalR2 = "waiting"): LegacyCohortViewR2 => ({
  at: 2, arrival, loaded: true, wallFoot: false, doorFoot: false, failedAt: null, steady: false,
  path: null, heard: [], clarified: [], unknown: false, complete: false,
});
// Older returns began directly at the support. Their existing actions replay in place.
const cohortStart = (first?: unknown) => emptyCohort(record(first) && first.kind === "unload" ? "inside" : "waiting");
const emptyEpilogue = (): LegacyEpilogueViewR2 => ({
  at: 2, belongings: false, relations: false, choice: null, offered: null, answered: false, complete: false,
});

function cohortStep(view: LegacyCohortViewR2, order: CohortOrder): { view?: LegacyCohortViewR2; message: string } {
  const { at, kind } = order;
  const next = { ...view, at };
  const feet = Number(view.wallFoot) + Number(view.doorFoot);
  if (view.complete) return { message: "Ce retour a déjà été consigné." };
  if (view.arrival === "waiting") {
    if (kind === "greet" && closeTo(at, 2)) {
      return { view: { ...next, arrival: "greeted" }, message: "On peut te montrer notre récit ? Le support penche sous la pièce." };
    }
    return { message: "Rejoins les jeunes qui attendent au seuil." };
  }
  if (view.arrival === "greeted") {
    if (kind === "lead" && closeTo(at, 8)) {
      return { view: { ...next, arrival: "inside" }, message: "La cohorte a rejoint le support. Regarde d’abord ce qui le fait pencher." };
    }
    return { message: "Montre-leur la place libre près du support." };
  }
  if (!view.steady) {
    if (kind === "unload" && view.loaded && closeTo(at, 11)) {
      return { view: { ...next, loaded: false }, message: "La charge est au sol. Tu peux toucher les pieds du support." };
    }
    if (!view.loaded && kind === "wall-foot" && !view.wallFoot && closeTo(at, 9)) {
      return { view: { ...next, wallFoot: true }, message: "Le pied du mur est réglé." };
    }
    if (!view.loaded && kind === "door-foot" && !view.doorFoot && closeTo(at, 13)) {
      return { view: { ...next, doorFoot: true }, message: "Le pied du côté de la porte est réglé." };
    }
    if (!view.loaded && kind === "test" && closeTo(at, 11) && view.failedAt !== feet) {
      return feet === 2
        ? { view: { ...next, loaded: true, steady: true }, message: "Le support tient. La cohorte peut présenter son récit." }
        : { view: { ...next, loaded: true, failedAt: feet }, message: "Il penche encore sous la charge. Retire l’objet et règle l’appui restant." };
    }
    return { message: "Approche du support, décharge-le et règle les pieds avant l’essai." };
  }
  if (kind === "approach" && !view.path && closeTo(at, 15)) {
    return { view: { ...next, path: order.choice },
      message: order.choice === "stay" ? "Laisse commencer celle qui a trouvé la piste." : "Les jeunes présenteront le récit à ceux qui restent." };
  }
  if (kind === "listen" && view.path === "stay") {
    const speaker = LEGACY_COHORT_R2[view.heard.length];
    if (speaker && speaker.id === order.speaker && closeTo(at, speaker.x)) {
      return { view: { ...next, heard: [...view.heard, speaker.id] }, message: speaker.line };
    }
  }
  if (kind === "ask" && view.path === "stay" && !view.unknown && view.heard.includes(order.speaker) &&
      !view.clarified.includes(order.speaker)) {
    const speaker = LEGACY_COHORT_R2.find(candidate => candidate.id === order.speaker);
    if (speaker && closeTo(at, speaker.x)) {
      return { view: { ...next, clarified: [...view.clarified, speaker.id] }, message: speaker.clarification };
    }
  }
  if (kind === "unknown" && view.path === "stay" && view.heard.length === LEGACY_COHORT_R2.length && !view.unknown && closeTo(at, 22)) {
    return { view: { ...next, unknown: true }, message: "Une ligne reste libre pour ce que la cohorte n’a pas pu observer." };
  }
  if (kind === "close" && (view.path === "stay" ? view.unknown && closeTo(at, 22) : view.path === "help" && closeTo(at, 2))) {
    return { view: { ...next, complete: true }, message: "Le retour de la nouvelle cohorte est consigné." };
  }
  return { message: "Rejoins la cohorte ou la sortie selon l’aide que tu as proposée." };
}

export const LEGACY_EPILOGUE_POSTS_R2 = { depart: 2, welcome: 14, transmit: 21 } as const;
function epilogueStep(view: LegacyEpilogueViewR2, order: EpilogueOrder, choices: readonly EpilogueChoice[],
  witnesses: readonly CohortWitnessR2[]) {
  const { at, kind } = order;
  const next = { ...view, at };
  if (view.complete) return { message: "Le geste final a déjà été consigné." };
  if (kind === "belongings" && !view.belongings && closeTo(at, 6)) {
    return { view: { ...next, belongings: true }, message: "Tu regardes les objets conservés ici." };
  }
  if (kind === "relations" && view.belongings && !view.relations && closeTo(at, 11)) {
    return { view: { ...next, relations: true }, message: "Les liens de la voie restent ceux qui ont réellement été établis." };
  }
  if (kind === "choose" && view.relations && !view.choice && closeTo(at, 16) && choices.includes(order.choice)) {
    return { view: { ...next, choice: order.choice }, message: "Rejoins le lieu de ton dernier geste." };
  }
  if ((kind === "offer" || kind === "answer") && view.choice === "transmit") {
    const speaker = witnesses.find(candidate => candidate.id === order.speaker);
    if (speaker && kind === "offer" && !view.offered && closeTo(at, LEGACY_EPILOGUE_POSTS_R2.transmit)) {
      return { view: { ...next, offered: speaker.id }, message: "Rejoins le jeune dont tu viens de reprendre le témoignage." };
    }
    if (speaker && kind === "answer" && view.offered === speaker.id && closeTo(at, speaker.x)) {
      return { view: { ...next, answered: true, complete: true }, message: speaker.response };
    }
  }
  // Historically recorded final acts replay with their original four events.
  if (kind === "act" && !view.offered && view.choice && choices.includes(view.choice) &&
      closeTo(at, LEGACY_EPILOGUE_POSTS_R2[view.choice])) {
    return { view: { ...next, complete: true }, message: "Le geste est accompli. Ta chasse continue avec les choix déjà faits." };
  }
  return { message: "Suis les repères du lieu avant de confirmer ton geste." };
}

export function legacyCohortViewR2(state?: LegacyFinaleR2 | null): LegacyCohortViewR2 {
  const events = state?.cohort?.events ?? [];
  let result = cohortStart(events[0]);
  for (const event of events) {
    const effect = cohortStep(result, event);
    if (!effect.view) return emptyCohort();
    result = effect.view;
  }
  return result;
}

export function legacyTransmissionWitnessesR2(state: LegacyFinaleR2 | null | undefined, site: LegacySiteR2) {
  const visit = state?.cohort;
  if (site.kind !== "residence" || !visit || !sameSite(visit.site, site)) return [];
  const view = legacyCohortViewR2(state);
  return view.complete && view.path === "stay" && view.unknown
    ? LEGACY_COHORT_R2.filter(speaker => view.heard.includes(speaker.id)) : [];
}

export function legacyEpilogueChoicesR2(state: LegacyFinaleR2 | null | undefined, site: LegacySiteR2): readonly EpilogueChoice[] {
  if (site.kind === "clan-ship") {
    const { belongings, crew } = clanEpilogueEvidenceR2(state);
    return belongings ? (crew.length ? ["depart", "welcome", "transmit"] : ["depart", "transmit"]) : ["depart"];
  }
  if (site.kind === "halt") return haltEpilogueOperationR2(state) ? epilogueOptions : ["depart"];
  if (site.kind === "ship") return recordedShipHandoverR2(state, site) ? ["depart", "transmit"] : ["depart"];
  return legacyTransmissionWitnessesR2(state, site).length ? epilogueOptions : ["depart", "welcome"];
}

export function legacyEpilogueViewR2(state: LegacyFinaleR2 | null | undefined, site: LegacySiteR2): LegacyEpilogueViewR2 {
  if (state?.epilogue && !sameSite(state.epilogue.site, site)) return emptyEpilogue();
  let result = emptyEpilogue();
  const witnesses = legacyTransmissionWitnessesR2(state, site);
  const choices = legacyEpilogueChoicesR2(state, site);
  for (const event of state?.epilogue?.events ?? []) {
    const effect = epilogueStep(result, event, choices, witnesses);
    if (!effect.view) return emptyEpilogue();
    result = effect.view;
  }
  return result;
}

function validSite(raw: unknown): raw is LegacySiteR2 {
  if (!record(raw) || Object.keys(raw).length !== 2) return false;
  if (raw.kind === "clan-ship") return raw.id === CLAN_SHIP_ID;
  if (raw.kind === "halt") return raw.id === halt.siteId;
  return (raw.kind === "residence" || raw.kind === "ship") &&
    typeof raw.id === "string" && /^[A-Za-z0-9:_-][A-Za-z0-9:._-]{0,119}$/.test(raw.id);
}
function validCohortOrder(raw: unknown): raw is CohortOrder {
  if (!record(raw) || !position(raw.at)) return false;
  const fields = Object.keys(raw).length;
  if (raw.kind === "approach") return fields === 3 && cohortOptions.some(x => x === raw.choice);
  if (raw.kind === "listen" || raw.kind === "ask") return fields === 3 && LEGACY_COHORT_R2.some(x => x.id === raw.speaker);
  return fields === 2 && ["greet", "lead", "unload", "wall-foot", "door-foot", "test", "unknown", "close"].some(x => x === raw.kind);
}
function validEpilogueOrder(raw: unknown): raw is EpilogueOrder {
  if (!record(raw) || !position(raw.at)) return false;
  if (raw.kind === "choose") return Object.keys(raw).length === 3 && epilogueOptions.some(x => x === raw.choice);
  if (raw.kind === "offer" || raw.kind === "answer") {
    return Object.keys(raw).length === 3 && LEGACY_COHORT_R2.some(candidate => candidate.id === raw.speaker);
  }
  return Object.keys(raw).length === 2 && ["belongings", "relations", "act"].some(x => x === raw.kind);
}

function parseStoredEpilogueOrderR2(raw: unknown, site: LegacySiteR2, owner: string): StoredEpilogueOrder | null {
  if (site.kind === "halt" && record(raw) && raw.kind === "belongings") {
    return Object.keys(raw).length === 3 && position(raw.at) && typeof raw.haltOperationId === "string" &&
      legacyHaltOperationPatternR2.test(raw.haltOperationId)
      ? { kind: raw.kind, at: raw.at, haltOperationId: raw.haltOperationId } : null;
  }
  if (site.kind === "ship" && record(raw) && raw.kind === "relations" && "personalShipProof" in raw) {
    const proof = raw.personalShipProof;
    const binding = SHIP_ACQUISITION_BINDING_V89;
    return Object.keys(raw).length === 3 && position(raw.at) && record(proof) &&
      Object.keys(proof).length === 3 && proof.shipId === binding.shipId &&
      proof.sourceId === binding.missionId && proof.candidateId === binding.candidateId
      ? { kind: raw.kind, at: raw.at, personalShipProof: {
        shipId: proof.shipId, sourceId: proof.sourceId, candidateId: proof.candidateId,
      } } : null;
  }
  if (site.kind !== "clan-ship") return validEpilogueOrder(raw) ? raw : null;
  if (!record(raw) || !position(raw.at)) return null;
  if (raw.kind === "belongings") {
    const proof = raw.clanProof;
    if (Object.keys(raw).length !== 3 || !record(proof) || Object.keys(proof).length !== 2 ||
        !("berth" in proof) || !("trophy" in proof) ||
        (proof.trophy !== null && proof.trophy !== "hunt-attribution" && proof.trophy !== "paired-roles")) return null;
    const berth = inspectClanShipDocking(proof.berth, owner).state;
    return berth?.status === "aboard" && berth.roomId === "trophees"
      ? { kind: raw.kind, at: raw.at, clanProof: { berth, trophy: proof.trophy } } : null;
  }
  if (raw.kind === "relations") {
    if (Object.keys(raw).length !== 3 || !Array.isArray(raw.clanProof) || raw.clanProof.length > CLAN_SHIP_RECRUITS.length) return null;
    const crew: ClanCrewProofR2[] = [];
    let index = -1;
    for (const entry of raw.clanProof) {
      if (!record(entry) || Object.keys(entry).length !== 2 || !isClanShipRoomId(entry.room)) return null;
      const position = CLAN_SHIP_RECRUITS.findIndex(candidate => candidate.id === entry.id);
      if (position <= index) return null;
      index = position;
      crew.push({ id: CLAN_SHIP_RECRUITS[position].id, room: entry.room });
    }
    return { kind: raw.kind, at: raw.at, clanProof: crew };
  }
  return validEpilogueOrder(raw) ? raw : null;
}

export function normalizeLegacyFinaleR2(raw: unknown, ownerCreatedAt: string): LegacyFinaleR2 | null {
  if (!record(raw) || (raw.version !== 1 && raw.version !== 2) ||
      raw.ownerCreatedAt !== ownerCreatedAt || !Number.isFinite(Date.parse(ownerCreatedAt)) ||
      typeof raw.endingId !== "string" || !/^O[1-6]-E[1-3]$/.test(raw.endingId) || (!raw.cohort && !raw.epilogue)) return null;
  const state: LegacyFinaleR2 = { version: 1, ownerCreatedAt, endingId: raw.endingId };
  if (raw.cohort !== undefined) {
    const part = raw.cohort;
    if (!record(part) || !validSite(part.site) || part.site.kind !== "residence" ||
        !Array.isArray(part.events) || !part.events.length || part.events.length > 22) return null;
    let view = cohortStart(part.events[0]);
    const events: CohortOrder[] = [];
    for (const event of part.events) {
      if (!validCohortOrder(event)) return null;
      const effect = cohortStep(view, event);
      if (!effect.view) return null;
      view = effect.view;
      events.push(event);
    }
    state.cohort = { site: part.site, events };
  }
  if (raw.epilogue !== undefined) {
    const part = raw.epilogue;
    if (!record(part) || !validSite(part.site) || !Array.isArray(part.events) || !part.events.length || part.events.length > 5) return null;
    let view = emptyEpilogue();
    const witnesses = legacyTransmissionWitnessesR2(state, part.site);
    const events: StoredEpilogueOrder[] = [];
    state.epilogue = { site: part.site, events };
    for (const item of part.events) {
      const event = parseStoredEpilogueOrderR2(item, part.site, ownerCreatedAt);
      if (!event) return null;
      const effect = epilogueStep(view, event, legacyEpilogueChoicesR2(state, part.site), witnesses);
      if (!effect.view) return null;
      view = effect.view;
      events.push(event);
    }
  }
  if (raw.version === 1) return Object.hasOwn(raw, "departureO6") ? null : state;
  const departure = normalizeDepartureO6(raw.departureO6);
  if (!departure || state.endingId !== "O6-E1" || state.epilogue?.site.kind !== "residence" ||
      state.epilogue.site.id !== departure.houseId || !legacyEpilogueViewR2(state, state.epilogue.site).complete) return null;
  return { ...state, version: 2, departureO6: departure };
}

function personalShipEpilogueMatchesSaveR2(save: LegacySave, site: LegacySiteR2) {
  const proof = recordedShipHandoverR2(save.legacyFinaleR2, site);
  const held = personalShipProofR2(save, site);
  return !!held && (!proof || (proof.shipId === held.shipId && proof.sourceId === held.sourceId &&
    proof.candidateId === held.candidateId));
}

function haltEpilogueMatchesSaveR2(save: LegacySave) {
  const operation = haltEpilogueOperationR2(save.legacyFinaleR2);
  return !!operation && resolvedHaltReceiptR2(save, operation) !== null;
}

function clanEpilogueMatchesSaveR2(save: LegacySave) {
  const { belongings, crew } = clanEpilogueEvidenceR2(save.legacyFinaleR2);
  // Docking and posts are historical evidence, so leaving the ship or changing
  // an assignment does not erase an epilogue already written.
  if (!belongings || belongings.berth.ownerCreatedAt !== save.createdAt ||
      (belongings.trophy && belongings.trophy !== clanTrophyVerdictR2(save))) return false;
  const hired = inspectClanShipOperations(save.clanShipOperations, save.createdAt).state?.recruitedNpcIds ?? [];
  return crew.every(member => hired.includes(member.id));
}

function departureHouseR2(save: LegacySave) {
  const state = save.legacyFinaleR2;
  const site = state?.epilogue?.site;
  const lesson = save.originV151?.continuationO6;
  const rank = getChronicleRank(save.prologue?.chronicle);
  if ((rank !== "elder" && rank !== "ancient") || state?.ownerCreatedAt !== save.createdAt ||
      site?.kind !== "residence" || !firstLessonPlayedO6(lesson?.practice) || lesson?.houseId !== site.id ||
      legacyOriginEndingR2(save) !== "O6-E1" || !save.residenceV149?.rights.includes(site.id) ||
      !legacyEpilogueViewR2(state, site).complete) return null;
  return houseV149(site.id);
}

export function legacyDepartureStatusR2(save: LegacySave) {
  const house = departureHouseR2(save);
  if (!house) return null;
  const { stage } = departureProgressO6(save.legacyFinaleR2?.departureO6?.events);
  return { houseTitle: house.title, stage, resolved: stage === "escorted" || stage === "stayed" };
}

export function legacyDepartureViewR2(save: LegacySave, region: HomeworldRegionStateV68) {
  const house = departureHouseR2(save);
  return house ? departureViewO6(house, region, save.legacyFinaleR2?.departureO6) : null;
}

export function advanceLegacyDepartureR2(save: LegacySave, region: HomeworldRegionStateV68, order: DepartureOrderO6) {
  const journal = save.legacyFinaleR2;
  const house = departureHouseR2(save);
  if (!journal || !house || !legacyFinaleMatchesSaveR2(save)) return null;
  const departure = advanceDepartureO6(house, region, journal.departureO6, order);
  const next: LegacyFinaleR2 | null = departure ? { ...journal, version: 2, departureO6: departure } : null;
  return next;
}

export function legacyFinaleMatchesSaveR2(save: LegacySave): boolean {
  const state = save.legacyFinaleR2;
  return !state || (state.ownerCreatedAt === save.createdAt && state.endingId === legacyOriginEndingR2(save) &&
    (!state.departureO6 || departureHouseR2(save)?.id === state.departureO6.houseId) &&
    (!state.cohort || !legacySceneRefusalR2(save, state.cohort.site, "cohort")) &&
    (!state.epilogue || (state.epilogue.site.kind === "clan-ship" ? clanEpilogueMatchesSaveR2(save) :
      state.epilogue.site.kind === "halt" ? haltEpilogueMatchesSaveR2(save) :
        state.epilogue.site.kind === "ship" ? personalShipEpilogueMatchesSaveR2(save, state.epilogue.site) :
          !legacySceneRefusalR2(save, state.epilogue.site, "epilogue"))));
}

export function advanceLegacyFinaleR2(save: LegacySave, site: LegacySiteR2, command: LegacyCommandR2) {
  const endingId = legacyOriginEndingR2(save);
  const refusal = legacySceneRefusalR2(save, site, command.scene);
  if (!endingId || refusal) return { message: refusal ?? "Le dossier de la fin d’origine manque." };
  const before = save.legacyFinaleR2;
  if (before && !legacyFinaleMatchesSaveR2(save)) return { message: "Le dossier ne correspond plus à la fin ou au lieu." };
  const next: LegacyFinaleR2 = before ? { ...before } : { version: 1, ownerCreatedAt: save.createdAt, endingId };
  if (command.scene === "cohort" && validCohortOrder(command.order)) {
    const action = cohortStep(legacyCohortViewR2(before), command.order);
    if (!action.view) return { message: action.message };
    next.cohort = { site, events: [...(before?.cohort?.events ?? []), command.order] };
    return { next, message: action.message };
  }
  if (command.scene === "epilogue" && validEpilogueOrder(command.order)) {
    const view = legacyEpilogueViewR2(before, site);
    const witnesses = legacyTransmissionWitnessesR2(before, site);
    if (command.order.kind === "act" && view.choice === "transmit" && witnesses.length) {
      return { message: "Choisis un témoignage au registre, puis rejoins le jeune concerné." };
    }
    const action = epilogueStep(view, command.order, legacyEpilogueChoicesR2(before, site), witnesses);
    if (!action.view) return { message: action.message };
    let stored: StoredEpilogueOrder = command.order;
    if (site.kind === "halt" && command.order.kind === "belongings") {
      const receipt = currentHaltReceiptR2(save);
      if (!receipt) return { message: "Le relevé de cette halte doit d’abord être consigné." };
      stored = { kind: "belongings", at: command.order.at, haltOperationId: receipt.operationId };
    }
    if (site.kind === "ship" && command.order.kind === "relations") {
      const proof = personalShipProofR2(save, site);
      if (!proof) return { message: "La remise de cette coque doit être attestée avant l’archivage." };
      stored = { kind: "relations", at: command.order.at, personalShipProof: proof };
    }
    if (site.kind === "clan-ship") {
      if (command.order.kind === "belongings") {
        const berth = clanBerthAtTrophiesR2(save);
        if (!berth) return { message: "Rejoins le poste de la galerie pour relire l’amarrage." };
        stored = { kind: "belongings", at: command.order.at, clanProof: { berth, trophy: clanTrophyVerdictR2(save) } };
      }
      if (command.order.kind === "relations") {
        stored = { kind: "relations", at: command.order.at, clanProof: clanCrewR2(save) };
      }
    }
    next.epilogue = { site, events: [...(before?.epilogue?.events ?? []), stored] };
    const message = site.kind === "ship" && view.choice === "transmit" && command.order.kind === "act"
      ? "Le dossier de remise et d’entrée est déposé aux archives du vaisseau."
      : action.message;
    return { next, message };
  }
  return { message: "Le geste n’appartient pas à cette scène." };
}

export function legacyFinaleSuccessorR2(previous: LegacyFinaleR2 | null | undefined, next: LegacyFinaleR2 | null | undefined): boolean {
  if (JSON.stringify(previous ?? null) === JSON.stringify(next ?? null)) return true;
  if (!next || (previous && (previous.ownerCreatedAt !== next.ownerCreatedAt || previous.endingId !== next.endingId))) return false;
  let added = 0;
  for (const scene of ["cohort", "epilogue"] as const) {
    const before = previous?.[scene], after = next[scene];
    if (before && (!after || !sameSite(before.site, after.site))) return false;
    const known = before?.events ?? [];
    const changed = after?.events ?? [];
    if (known.length > changed.length || known.some((item, i) => JSON.stringify(item) !== JSON.stringify(changed[i]))) return false;
    added += changed.length - known.length;
  }
  const lastDeparture = previous?.departureO6;
  const departure = next.departureO6;
  if (lastDeparture && (!departure || lastDeparture.houseId !== departure.houseId ||
      (lastDeparture.crossing && JSON.stringify(lastDeparture.crossing) !== JSON.stringify(departure.crossing)) ||
      !lastDeparture.events.every((event, index) => event === departure.events[index]))) return false;
  added += (departure?.events.length ?? 0) - (lastDeparture?.events.length ?? 0);
  return added === 1;
}
