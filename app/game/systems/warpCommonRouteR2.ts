/** The common Warp route. Only accepted, in-range observations are saved. */
export const WARP_COMMON_PARTS_R2 = [
  { id: "stabilisateur", title: "Stabilisateur", position: 3, repair: 2, alternative: 4 },
  { id: "repere-retour", title: "Repère de retour", position: 8, repair: 4, alternative: 1 },
  { id: "interface-navigation", title: "Interface de navigation", position: 13, repair: 1, alternative: 3 },
] as const;
export const WARP_OBSERVATORY_R2 = [
  { id: "trace", title: "Balise de route", position: 3, reading: "Le signal revient avec deux pulsations de retard." },
  { id: "echo", title: "Seuil de la galerie", position: 8, reading: "L’écho confirme un passage derrière la cloison." },
  { id: "device", title: "Dispositif dormant", position: 13, reading: "Les lignes d’énergie et de stabilité répondent séparément." },
] as const;
export const WARP_COMMON_LIMIT_R2 = 16;
export type WarpCommonChoiceR2 = "stabilite" | "energie";
export type WarpBenchChoiceR2 = "reparer" | "variante";
export type WarpInstallChoiceR2 = "marge" | "fenetre-courte";
type PartId = typeof WARP_COMMON_PARTS_R2[number]["id"];

type WarpCommonActionR2 =
  | { kind: "read"; at: number }
  | { kind: "survey"; at: number; choice: WarpCommonChoiceR2 }
  | { kind: "inspect"; at: number; part: PartId }
  | { kind: "bench"; at: number; part: PartId; choice: WarpBenchChoiceR2; dial: number }
  | { kind: "haul"; at: number }
  | { kind: "align"; at: number }
  | { kind: "connect"; at: number }
  | { kind: "dry-return"; at: number; choice: WarpInstallChoiceR2; dial: number };
export type WarpCommonCommandR2 = WarpCommonActionR2;
type PartView = { inspected: true; method?: WarpBenchChoiceR2 };
export type WarpCommonViewR2 = {
  section: "observatory" | "workshops" | "bay" | "ready";
  x: number;
  read: number;
  survey: WarpCommonChoiceR2 | null;
  parts: Partial<Record<PartId, PartView>>;
  hauled: boolean;
  aligned: boolean;
  connected: boolean;
  installed: WarpInstallChoiceR2 | null;
};
export type WarpCommonRecordR2 = {
  version: 1;
  ownerCreatedAt: string;
  hullInstanceId: string;
  events: WarpCommonCommandR2[];
};

const empty = (): WarpCommonViewR2 => ({
  section: "observatory", x: 0, read: 0, survey: null, parts: {}, hauled: false,
  aligned: false, connected: false, installed: null,
});
const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const atPost = (at: number, post: number) => Math.abs(at - post) <= 1;

export function warpTestDialR2(partId: PartId, method: WarpBenchChoiceR2, priority: WarpCommonChoiceR2): number {
  const part = WARP_COMMON_PARTS_R2.find(item => item.id === partId)!;
  const reference = method === "reparer" ? part.repair : part.alternative;
  return (reference + Number(priority === "energie")) % 5;
}

export function warpReturnDialR2(method: WarpInstallChoiceR2, priority: WarpCommonChoiceR2): number {
  return (method === "marge" ? 2 : 4) - Number(priority === "energie");
}

function apply(view: WarpCommonViewR2, action: WarpCommonCommandR2): { view?: WarpCommonViewR2; message: string } {
  if (!Number.isInteger(action.at) || action.at < 0 || action.at > WARP_COMMON_LIMIT_R2) return { message: "Ce repère est hors de la passerelle." };
  const x = action.at;
  if (view.section === "observatory") {
    const marker = WARP_OBSERVATORY_R2[view.read];
    if (action.kind === "read" && marker && atPost(x, marker.position)) {
      return { view: { ...view, x, read: view.read + 1 }, message: marker.reading };
    }
    if (action.kind === "survey" && view.read === WARP_OBSERVATORY_R2.length && atPost(x, 13) &&
        (action.choice === "stabilite" || action.choice === "energie")) {
      return { view: { ...view, section: "workshops", x: 0, survey: action.choice }, message: "Le dispositif a été relevé. Les chantiers attendent les pièces du retour." };
    }
    return { message: "Suis les balises dans l’ordre et relève le dispositif de la galerie." };
  }
  if (view.section === "workshops") {
    if (action.kind === "haul") {
      if (!atPost(x, 16) || !WARP_COMMON_PARTS_R2.every(part => view.parts[part.id]?.method)) {
        return { message: "Teste les trois pièces, puis rejoins le chariot au sas." };
      }
      return { view: { ...view, section: "bay", x: 0, hauled: true }, message: "Les trois pièces vérifiées sont chargées dans la baie." };
    }
    if (action.kind !== "inspect" && action.kind !== "bench") return { message: "Les établis attendent les pièces du retour." };
    const part = WARP_COMMON_PARTS_R2.find(entry => entry.id === action.part);
    if (!part || !atPost(x, part.position)) return { message: "Rejoins l’établi de cette pièce." };
    const existing = view.parts[part.id];
    if (action.kind === "inspect" && !existing) {
      return { view: { ...view, x, parts: { ...view.parts, [part.id]: { inspected: true } } }, message: part.title + " examiné. Règle le banc avant de tester la pièce." };
    }
    if (action.kind !== "bench" || !existing || existing.method ||
        (action.choice !== "reparer" && action.choice !== "variante")) {
      return { message: "Examine la pièce avant son premier test." };
    }
    if (action.dial !== warpTestDialR2(part.id, action.choice, view.survey!)) {
      return { message: "Le voyant reste rouge. Garde les pièces déjà validées et reprends le réglage de cet établi." };
    }
    return { view: { ...view, x, parts: { ...view.parts, [part.id]: { inspected: true, method: action.choice } } }, message: "Le voyant est vert. Cette pièce peut être transportée." };
  }
  if (view.section === "bay") {
    if (action.kind === "align" && !view.aligned && atPost(x, 3)) {
      return { view: { ...view, x, aligned: true }, message: "Les supports sont alignés sur les trois pièces." };
    }
    if (action.kind === "connect" && view.aligned && !view.connected && atPost(x, 8)) {
      return { view: { ...view, x, connected: true }, message: "Les commandes sont reliées. Rejoins le pupitre du retour à vide." };
    }
    if (action.kind === "dry-return" && view.connected && atPost(x, 13) &&
        (action.choice === "marge" || action.choice === "fenetre-courte")) {
      if (action.dial !== warpReturnDialR2(action.choice, view.survey!)) {
        return { message: "L’impulsion ne revient pas au pupitre. L’alignement et les câbles restent en place." };
      }
      return { view: { ...view, section: "ready", x, installed: action.choice }, message: "L’impulsion est revenue sans charge. Le module Warp est opérationnel." };
    }
    return { message: "Aligne les supports, relie les commandes, puis effectue le retour à vide." };
  }
  return { message: "Le retour à vide a déjà été consigné." };
}

export function warpCommonViewR2(record: WarpCommonRecordR2 | null | undefined): WarpCommonViewR2 {
  let view = empty();
  for (const event of record?.events ?? []) {
    const next = apply(view, event).view;
    if (!next) return empty();
    view = next;
  }
  return view;
}

function validEvent(value: unknown): value is WarpCommonCommandR2 {
  if (!isObject(value) || typeof value.at !== "number") return false;
  const size = Object.keys(value).length;
  if (value.kind === "read" || value.kind === "haul" || value.kind === "align" || value.kind === "connect") return size === 2;
  if (value.kind === "survey") return size === 3 && (value.choice === "stabilite" || value.choice === "energie");
  if (value.kind === "inspect") return size === 3 && WARP_COMMON_PARTS_R2.some(item => item.id === value.part);
  if (value.kind === "bench") return size === 5 && WARP_COMMON_PARTS_R2.some(item => item.id === value.part) &&
    (value.choice === "reparer" || value.choice === "variante") && typeof value.dial === "number";
  return value.kind === "dry-return" && size === 4 && (value.choice === "marge" || value.choice === "fenetre-courte") &&
    typeof value.dial === "number";
}

export function normalizeWarpCommonR2(value: unknown, ownerCreatedAt: string): WarpCommonRecordR2 | null {
  if (!isObject(value) || Object.keys(value).length !== 4 || value.version !== 1 || value.ownerCreatedAt !== ownerCreatedAt ||
      !Number.isFinite(Date.parse(ownerCreatedAt)) || typeof value.hullInstanceId !== "string" || value.hullInstanceId.length === 0 ||
      value.hullInstanceId.length > 120 || !Array.isArray(value.events) || !value.events.length || value.events.length > 14) return null;
  let view = empty();
  for (const event of value.events) {
    if (!validEvent(event)) return null;
    const next = apply(view, event).view;
    if (!next) return null;
    view = next;
  }
  return { version: 1, ownerCreatedAt, hullInstanceId: value.hullInstanceId, events: value.events.slice() };
}

export function advanceWarpCommonR2(record: WarpCommonRecordR2 | undefined, ownerCreatedAt: string, hullInstanceId: string, event: WarpCommonCommandR2) {
  if (record && (record.ownerCreatedAt !== ownerCreatedAt || record.hullInstanceId !== hullInstanceId)) {
    return { message: "Les relevés appartiennent à une autre coque." };
  }
  if (!validEvent(event)) return { message: "Le relevé de ce poste est illisible." };
  const next = apply(warpCommonViewR2(record), event);
  if (!next.view) return { message: next.message };
  const result: WarpCommonRecordR2 = { version: 1, ownerCreatedAt, hullInstanceId, events: [...(record?.events ?? []), event] };
  return { record: result, view: next.view, message: next.message };
}

export function isWarpCommonSuccessorR2(previous: WarpCommonRecordR2 | undefined, next: WarpCommonRecordR2 | undefined): boolean {
  const prior = previous?.events ?? [];
  if (!next || next.events.length !== prior.length + 1 ||
      (previous && next.hullInstanceId !== previous.hullInstanceId)) return false;
  return prior.every((event, index) => JSON.stringify(event) === JSON.stringify(next.events[index]));
}
