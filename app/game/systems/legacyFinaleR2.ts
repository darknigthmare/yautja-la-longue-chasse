import type { SaveGame } from "../types";
import { getChronicleRank } from "./clanChronicle";
import { normalizeOriginV151 } from "./originsV151";
import { normalizeResidenceV149 } from "./residenceV149";
import { shipReceiptV161 } from "./shipReceiptV161";

export type LegacySiteR2 = { kind: "residence" | "ship"; id: string };
export type LegacySceneR2 = "cohort" | "epilogue";
export const LEGACY_WALK_LIMIT_R2 = 24;
const cohortOptions = ["stay", "help"] as const;
const epilogueOptions = ["depart", "welcome", "transmit"] as const;
type CohortChoice = typeof cohortOptions[number];
type EpilogueChoice = typeof epilogueOptions[number];

export const LEGACY_COHORT_R2 = [
  { id: "track", x: 15, label: "Piste", line: "J’ai suivi les empreintes jusqu’à la pierre. Après, la pluie les a effacées." },
  { id: "knot", x: 17, label: "Nœud", line: "J’ai repris le filet quand le premier nœud s’est défait." },
  { id: "crossing", x: 19, label: "Passage", line: "J’ai attendu le signal avant de passer. Le chemin bas nous a laissé revenir ensemble." },
  { id: "piece", x: 21, label: "Pièce", line: "J’ai rapporté la pièce pour qu’on puisse regarder les marques dessus." },
] as const;

type CohortOrder =
  | { kind: "unload" | "wall-foot" | "door-foot" | "test" | "unknown" | "close"; at: number }
  | { kind: "approach"; at: number; choice: CohortChoice }
  | { kind: "listen"; at: number; speaker: typeof LEGACY_COHORT_R2[number]["id"] };
type EpilogueOrder =
  | { kind: "belongings" | "relations" | "act"; at: number }
  | { kind: "choose"; at: number; choice: EpilogueChoice };
export type LegacyCommandR2 = { scene: "cohort"; order: CohortOrder } | { scene: "epilogue"; order: EpilogueOrder };

type Journal<Order> = { site: LegacySiteR2; events: Order[] };
export type LegacyFinaleR2 = {
  version: 1;
  ownerCreatedAt: string;
  endingId: string;
  cohort?: Journal<CohortOrder>;
  epilogue?: Journal<EpilogueOrder>;
};
type LegacySave = Pick<SaveGame, "createdAt" | "profile" | "prologue" | "originV151" | "residenceV149" | "shipAcquisitionV89" | "legacyFinaleR2">;

const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const closeTo = (at: number, x: number) => Math.abs(at - x) <= 1;
const position = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= LEGACY_WALK_LIMIT_R2;
const sameSite = (a: LegacySiteR2, b: LegacySiteR2) => a.kind === b.kind && a.id === b.id;

export function legacyOriginEndingR2(save: Pick<LegacySave, "originV151">): string | null {
  const origin = normalizeOriginV151(save.originV151);
  if (!origin?.ending?.endingChoiceConfirmed || !origin.ending.endingRealized ||
      !origin.consumed.includes(origin.originId + "-M29:confirmed") ||
      !origin.consumed.includes(origin.originId + "-M30:realized")) return null;
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

function siteHeld(save: LegacySave, site: LegacySiteR2): boolean {
  return site.kind === "residence"
    ? legacyResidenceSiteR2(save, site.id) !== null : legacyShipSiteR2(save)?.id === site.id;
}

export function legacySceneRefusalR2(save: LegacySave, site: LegacySiteR2, scene: LegacySceneR2): string | null {
  const endingId = legacyOriginEndingR2(save);
  if (!endingId) return "La clôture de la voie d’origine doit d’abord être jouée.";
  if (!siteHeld(save, site)) return "Le lieu doit t’avoir été effectivement remis.";
  if (scene === "cohort") {
    if (site.kind !== "residence" || getChronicleRank(save.prologue?.chronicle) !== "ancient") {
      return "Le retour de la cohorte se joue au foyer après la reconnaissance Ancient.";
    }
    const setup = normalizeOriginV151(save.originV151)?.trainingYardO6?.houses[site.id];
    if (endingId !== "O6-E1" || setup?.at(-1) !== "threshold") {
      return "Le prolongement jouable demande une maison d’enseignement aménagée et sa fin de voie réalisée.";
    }
  }
  const journal = save.legacyFinaleR2?.[scene];
  return journal && !sameSite(journal.site, site) ? "Ce récit se reprend dans le lieu où il a commencé." : null;
}

export type LegacyCohortViewR2 = {
  at: number; loaded: boolean; wallFoot: boolean; doorFoot: boolean; failedAt: number | null;
  steady: boolean; path: CohortChoice | null; heard: string[]; unknown: boolean; complete: boolean;
};
export type LegacyEpilogueViewR2 = {
  at: number; belongings: boolean; relations: boolean; choice: EpilogueChoice | null; complete: boolean;
};
const emptyCohort = (): LegacyCohortViewR2 => ({
  at: 2, loaded: true, wallFoot: false, doorFoot: false, failedAt: null, steady: false, path: null, heard: [], unknown: false, complete: false,
});
const emptyEpilogue = (): LegacyEpilogueViewR2 => ({ at: 2, belongings: false, relations: false, choice: null, complete: false });

function cohortStep(view: LegacyCohortViewR2, order: CohortOrder): { view?: LegacyCohortViewR2; message: string } {
  const { at, kind } = order;
  const next = { ...view, at };
  const feet = Number(view.wallFoot) + Number(view.doorFoot);
  if (view.complete) return { message: "Ce retour a déjà été consigné." };
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
  if (kind === "unknown" && view.path === "stay" && view.heard.length === LEGACY_COHORT_R2.length && !view.unknown && closeTo(at, 22)) {
    return { view: { ...next, unknown: true }, message: "Une ligne reste libre pour ce que la cohorte n’a pas pu observer." };
  }
  if (kind === "close" && (view.path === "stay" ? view.unknown && closeTo(at, 22) : view.path === "help" && closeTo(at, 2))) {
    return { view: { ...next, complete: true }, message: "Le retour de la nouvelle cohorte est consigné." };
  }
  return { message: "Rejoins la cohorte ou la sortie selon l’aide que tu as proposée." };
}

function epilogueStep(view: LegacyEpilogueViewR2, order: EpilogueOrder, choices: readonly EpilogueChoice[]) {
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
  const targets: Record<EpilogueChoice, number> = { depart: 2, welcome: 14, transmit: 21 };
  if (kind === "act" && view.choice && choices.includes(view.choice) && closeTo(at, targets[view.choice])) {
    return { view: { ...next, complete: true }, message: "Le geste est accompli. Ta chasse continue avec les choix déjà faits." };
  }
  return { message: "Suis les repères du lieu avant de confirmer ton geste." };
}

export function legacyCohortViewR2(state?: LegacyFinaleR2 | null): LegacyCohortViewR2 {
  let result = emptyCohort();
  for (const event of state?.cohort?.events ?? []) {
    const effect = cohortStep(result, event);
    if (!effect.view) return emptyCohort();
    result = effect.view;
  }
  return result;
}

export function legacyEpilogueChoicesR2(state: LegacyFinaleR2 | null | undefined, site: LegacySiteR2): readonly EpilogueChoice[] {
  const visit = state?.cohort;
  const checked = legacyCohortViewR2(state);
  if (visit && sameSite(visit.site, site) && checked.complete) {
    return checked.path === "stay" ? epilogueOptions : ["depart", "welcome"];
  }
  return site.kind === "residence" ? ["depart", "welcome"] : ["depart"];
}

export function legacyEpilogueViewR2(state: LegacyFinaleR2 | null | undefined, site: LegacySiteR2): LegacyEpilogueViewR2 {
  let result = emptyEpilogue();
  for (const event of state?.epilogue?.events ?? []) {
    const effect = epilogueStep(result, event, legacyEpilogueChoicesR2(state, site));
    if (!effect.view) return emptyEpilogue();
    result = effect.view;
  }
  return result;
}

function validSite(raw: unknown): raw is LegacySiteR2 {
  return record(raw) && Object.keys(raw).length === 2 && (raw.kind === "residence" || raw.kind === "ship") &&
    typeof raw.id === "string" && /^[A-Za-z0-9:_-][A-Za-z0-9:._-]{0,119}$/.test(raw.id);
}
function validCohortOrder(raw: unknown): raw is CohortOrder {
  if (!record(raw) || !position(raw.at)) return false;
  const fields = Object.keys(raw).length;
  if (raw.kind === "approach") return fields === 3 && cohortOptions.some(x => x === raw.choice);
  if (raw.kind === "listen") return fields === 3 && LEGACY_COHORT_R2.some(x => x.id === raw.speaker);
  return fields === 2 && ["unload", "wall-foot", "door-foot", "test", "unknown", "close"].some(x => x === raw.kind);
}
function validEpilogueOrder(raw: unknown): raw is EpilogueOrder {
  if (!record(raw) || !position(raw.at)) return false;
  if (raw.kind === "choose") return Object.keys(raw).length === 3 && epilogueOptions.some(x => x === raw.choice);
  return Object.keys(raw).length === 2 && ["belongings", "relations", "act"].some(x => x === raw.kind);
}

export function normalizeLegacyFinaleR2(raw: unknown, ownerCreatedAt: string): LegacyFinaleR2 | null {
  if (!record(raw) || raw.version !== 1 || raw.ownerCreatedAt !== ownerCreatedAt || !Number.isFinite(Date.parse(ownerCreatedAt)) ||
      typeof raw.endingId !== "string" || !/^O[1-6]-E[1-3]$/.test(raw.endingId) || (!raw.cohort && !raw.epilogue)) return null;
  const state: LegacyFinaleR2 = { version: 1, ownerCreatedAt, endingId: raw.endingId };
  if (raw.cohort !== undefined) {
    const part = raw.cohort;
    if (!record(part) || !validSite(part.site) || part.site.kind !== "residence" ||
        !Array.isArray(part.events) || !part.events.length || part.events.length > 16) return null;
    let view = emptyCohort();
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
    if (!record(part) || !validSite(part.site) || !Array.isArray(part.events) || !part.events.length || part.events.length > 4) return null;
    let view = emptyEpilogue();
    const events: EpilogueOrder[] = [];
    for (const event of part.events) {
      if (!validEpilogueOrder(event)) return null;
      const effect = epilogueStep(view, event, legacyEpilogueChoicesR2(state, part.site));
      if (!effect.view) return null;
      view = effect.view;
      events.push(event);
    }
    state.epilogue = { site: part.site, events };
  }
  return state;
}

export function legacyFinaleMatchesSaveR2(save: LegacySave): boolean {
  const state = save.legacyFinaleR2;
  return !state || (state.ownerCreatedAt === save.createdAt && state.endingId === legacyOriginEndingR2(save) &&
    (!state.cohort || !legacySceneRefusalR2(save, state.cohort.site, "cohort")) &&
    (!state.epilogue || !legacySceneRefusalR2(save, state.epilogue.site, "epilogue")));
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
    const action = epilogueStep(legacyEpilogueViewR2(before, site), command.order, legacyEpilogueChoicesR2(before, site));
    if (!action.view) return { message: action.message };
    next.epilogue = { site, events: [...(before?.epilogue?.events ?? []), command.order] };
    return { next, message: action.message };
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
  return added === 1;
}
