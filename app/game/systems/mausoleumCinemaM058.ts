import type { MausoleumAccess } from "./mausoleum";

export const CINEMA_CHAPTER_M058 = "eclaireur-korthas";
export const CINEMA_GALLERY_M058 = "chroniques-clan";
export const CINEMA_MASK_X_M058 = 230;
export const CINEMA_CRADLE_X_M058 = 680;
export const CINEMA_WIDTH_M058 = 9;
export const CINEMA_MODES_M058 = ["faithful", "ridge"] as const;
type CinemaMode = typeof CINEMA_MODES_M058[number];
const actions = ["left", "right", "read", "aid", "cover", "ridge", "mark", "exit"] as const;
export type CinemaActionM058 = typeof actions[number];

export const CINEMA_STORIES_M058 = {
  faithful: {
    title: "La relève des Passes",
    subtitle: "Récit de secours",
    briefing: "Lis la balise, rejoins l’éclaireur et couvre les deux passages à découvert. Le sas est à l’est.",
    ending: "Le sas s’ouvre. L’éclaireur rejoint la relève et remet son relevé aux veilleurs.",
  },
  ridge: {
    title: "La Veille de la corniche",
    subtitle: "Variante du sas fermé",
    briefing: "Le sas est coupé. Lis la balise, rejoins l’éclaireur et ouvrez l’accès à la corniche. Active le repère de repli avant de revenir à l’ouest.",
    ending: "Le repère confirme le repli. La relève retrouve l’éclaireur au débouché ouest.",
  },
} satisfies Record<CinemaMode, { title: string; subtitle: string; briefing: string; ending: string }>;

export interface CinemaRunM058 {
  version: 1;
  chapter: typeof CINEMA_CHAPTER_M058;
  owner: string;
  mode: CinemaMode;
  orders: CinemaActionM058[];
}

export interface CinemaViewM058 {
  x: number;
  lane: "ground" | "ridge";
  signalRead: boolean;
  escorting: boolean;
  cover: number;
  pathMarked: boolean;
  complete: boolean;
}

type CinemaStorage = Pick<Storage, "getItem" | "setItem">;
const maximumOrders = 384;
const initialView = (): CinemaViewM058 => ({
  x: 0, lane: "ground", signalRead: false, escorting: false, cover: 0, pathMarked: false, complete: false,
});

export function canEnterCinemaM058(access: MausoleumAccess): boolean {
  return !access.preview && access.rank === "ancient";
}

function ownerValid(owner: string): boolean {
  return typeof owner === "string" && owner.length <= 64 && Number.isFinite(Date.parse(owner));
}

export function canHandleCinemaMaskM058(access: MausoleumAccess, actorX: number, phase: "take" | "place"): boolean {
  const position = phase === "take" ? CINEMA_MASK_X_M058 : CINEMA_CRADLE_X_M058;
  return canEnterCinemaM058(access) && Number.isFinite(actorX) && Math.abs(actorX - position) <= 36;
}

function reduce(view: CinemaViewM058, mode: CinemaMode, action: CinemaActionM058): CinemaViewM058 | null {
  if (view.complete) return null;
  const { x, signalRead, escorting, lane, cover, pathMarked } = view;
  switch (action) {
    case "read":
      return !signalRead && x === 2 && lane === "ground" ? { ...view, signalRead: true } : null;
    case "aid":
      return signalRead && !escorting && x === 4 && lane === "ground" ? { ...view, escorting: true } : null;
    case "cover":
      return mode === "faithful" && escorting && (x === 4 || x === 5 || x === 6) && cover < 2
        ? { ...view, cover: 2 } : null;
    case "ridge":
      return mode === "ridge" && escorting && x === 4 && lane === "ground" ? { ...view, lane: "ridge" } : null;
    case "mark":
      return mode === "ridge" && lane === "ridge" && x === 2 && !pathMarked ? { ...view, pathMarked: true } : null;
    case "exit":
      return escorting && (mode === "faithful" ? x === 8 && lane === "ground" : x === 0 && lane === "ridge" && pathMarked)
        ? { ...view, complete: true } : null;
    case "left":
    case "right": {
      const next = x + (action === "left" ? -1 : 1);
      const limit = mode === "faithful" ? 8 : 4;
      if (next < 0 || next > limit || (next > 2 && !signalRead) || (next > 4 && !escorting)) return null;
      if (mode === "faithful" && escorting && (next === 5 || next === 6) && cover === 0) return null;
      return { ...view, x: next, cover: Math.max(0, cover - 1) };
    }
  }
}

function sameRun(left: CinemaRunM058, right: CinemaRunM058): boolean {
  return left.owner === right.owner && left.mode === right.mode && left.orders.length === right.orders.length &&
    left.orders.every((action, index) => action === right.orders[index]);
}

function parseRun(raw: string, owner: string, mode: CinemaMode): { run: CinemaRunM058; view: CinemaViewM058 } | null {
  try {
    const value = JSON.parse(raw);
    if (!value || typeof value !== "object" || Object.keys(value).length !== 5 ||
        value.version !== 1 || value.chapter !== CINEMA_CHAPTER_M058 || value.owner !== owner || value.mode !== mode ||
        !Array.isArray(value.orders) || value.orders.length > maximumOrders) return null;
    let view = initialView();
    for (const order of value.orders) {
      if (!actions.includes(order)) return null;
      const next = reduce(view, mode, order);
      if (!next) return null;
      view = next;
    }
    return { run: value as CinemaRunM058, view };
  } catch {
    return null;
  }
}

export function cinemaKeyM058(owner: string, mode: CinemaMode): string {
  return "yautja.mausoleum.r2-m058.v1:" + owner + ":" + mode;
}

type CinemaSuccess = { ok: true; run: CinemaRunM058; view: CinemaViewM058 };
type CinemaFailure = { ok: false; message: string };
const refused = (message: string): CinemaFailure => ({ ok: false, message });

export function cinemaSlotM058(storage: CinemaStorage, owner: string, mode: CinemaMode): "empty" | "ready" | "complete" | "unavailable" {
  try {
    if (!ownerValid(owner) || !CINEMA_MODES_M058.includes(mode)) return "unavailable";
    const raw = storage.getItem(cinemaKeyM058(owner, mode));
    if (raw === null) return "empty";
    const stored = parseRun(raw, owner, mode);
    return stored ? stored.view.complete ? "complete" : "ready" : "unavailable";
  } catch {
    return "unavailable";
  }
}

export function openCinemaM058(storage: CinemaStorage, owner: string, mode: CinemaMode, access: MausoleumAccess, replay?: CinemaRunM058): CinemaSuccess | CinemaFailure {
  if (!canEnterCinemaM058(access) || !ownerValid(owner) || !CINEMA_MODES_M058.includes(mode)) return refused("La table de lecture requiert le rang Ancient.");
  try {
    const key = cinemaKeyM058(owner, mode);
    const raw = storage.getItem(key);
    if (raw !== null) {
      const stored = parseRun(raw, owner, mode);
      if (!stored) return refused("La sauvegarde de ce récit est illisible ou appartient à une autre lecture.");
      if (!replay) return { ok: true, ...stored };
      if (!sameRun(stored.run, replay) || (!stored.view.complete && stored.run.orders.length < maximumOrders)) {
        return refused("Ce récit a changé ou peut encore être repris.");
      }
    } else if (replay) return refused("Le dossier de cette lecture manque.");
    const run: CinemaRunM058 = { version: 1, chapter: CINEMA_CHAPTER_M058, owner, mode, orders: [] };
    const bytes = JSON.stringify(run);
    storage.setItem(key, bytes);
    return storage.getItem(key) === bytes ? { ok: true, run, view: initialView() } : refused("La sauvegarde du récit n’a pas été confirmée.");
  } catch {
    return refused("Le navigateur ne permet pas d’enregistrer ce récit.");
  }
}

export function availableCinemaActionsM058(view: CinemaViewM058, run: CinemaRunM058): CinemaActionM058[] {
  if (run.orders.length >= maximumOrders) return [];
  return actions.filter(action => reduce(view, run.mode, action) !== null);
}

export function advanceCinemaM058(storage: CinemaStorage, run: CinemaRunM058, action: CinemaActionM058): CinemaSuccess | CinemaFailure {
  try {
    if (!ownerValid(run.owner) || !CINEMA_MODES_M058.includes(run.mode) || !actions.includes(action)) return refused("Ce geste est indisponible.");
    const key = cinemaKeyM058(run.owner, run.mode);
    const raw = storage.getItem(key);
    const stored = raw !== null && parseRun(raw, run.owner, run.mode);
    if (!stored || !sameRun(stored.run, run)) return refused("Ce récit a changé. Retourne au socle puis reprends la dernière lecture.");
    const view = reduce(stored.view, run.mode, action);
    if (!view || run.orders.length >= maximumOrders) return refused("Le repère demandé est hors de portée.");
    const next = { ...stored.run, orders: [...stored.run.orders, action] };
    const bytes = JSON.stringify(next);
    storage.setItem(key, bytes);
    return storage.getItem(key) === bytes ? { ok: true, run: next, view } : refused("Le geste n’a pas été sauvegardé.");
  } catch {
    return refused("Le navigateur ne permet pas d’enregistrer ce geste.");
  }
}

/** The local lock serializes writes to the same narrative slot across browser tabs. */
export function withCinemaSlotM058(key: string, work: () => CinemaSuccess | CinemaFailure): Promise<CinemaSuccess | CinemaFailure> {
  return navigator.locks ? navigator.locks.request(key, { ifAvailable: true }, lock => lock
    ? work() : refused("Ce récit est utilisé dans un autre onglet. Reprends-le après la sauvegarde."))
    : Promise.resolve(work());
}
