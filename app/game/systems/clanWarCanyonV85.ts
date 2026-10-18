import { warCompositionV85, warUnitV85 } from "./clanWarV85Data";
import { warXpGainV85 } from "./clanWarV85";

export type CanyonOrderKindV85 = "hold" | "move" | "observe" | "cover" | "secure" | "rescue" | "adopt" | "extract";
export interface CanyonFormationV85 {
  id: string; typeId: string; x: number; level: 0 | 1; order: CanyonOrderKindV85; targetX: number;
  startingXp: number; roleEvents: string[]; objectives: string[]; rescued: string[]; threats: string[];
  extraction: boolean; adopted: boolean; adoptionSeconds: number;
}
export interface CanyonSimulationV85 {
  version: 1; context: "free"; id: string; phase: "preparation" | "battle" | "debrief";
  approach: "unselected" | "corniche" | "fond"; battery: "unselected" | "borrow" | "preserve";
  heroSite: "approche" | "corniche" | "maintenance" | "mezzanine" | "poste";
  seconds: number; formations: CanyonFormationV85[]; observedPosts: number[]; suppressedPosts: number[];
  bridgeSecured: boolean; porterRescued: boolean; cargoDelivered: boolean; abandonedCrates: number;
  transitRecognized: boolean; committed: boolean; messages: string[];
}
export const CANYON_STORAGE_KEY_V85 = "yautja.clan-war.v85.canyon.free.v1";
export const CANYON_PRESET_V85: Record<string, number> = { "RTS-U01": 1, "RTS-U02": 1, "RTS-U03": 1, "RTS-U13": 1, "RTS-U14": 1, "RTS-U15": 1, "RTS-U18": 1 };
export const CANYON_POSTS_V85 = [34, 52, 72];
export function createCanyonV85(id = "free-canyon-1"): CanyonSimulationV85 {
  return { version: 1, context: "free", id, phase: "preparation", approach: "unselected", battery: "unselected", heroSite: "approche", seconds: 0, formations: [], observedPosts: [], suppressedPosts: [], bridgeSecured: false, porterRescued: false, cargoDelivered: false, abandonedCrates: 0, transitRecognized: false, committed: false, messages: ["Exercice EX-CANYON. Rejoindre la maintenance, préparer le refuge puis gagner le poste de transition."] };
}
const copy = (state: CanyonSimulationV85): CanyonSimulationV85 => JSON.parse(JSON.stringify(state)) as CanyonSimulationV85;
const add = (ids: string[], id: string) => { if (!ids.includes(id)) ids.push(id); };
export function canyonPreparationV85(state: CanyonSimulationV85, action: "corniche" | "fond" | "maintenance" | "borrow" | "preserve" | "poste"): CanyonSimulationV85 {
  if (state.phase !== "preparation") return state;
  const next = copy(state);
  if (action === "corniche" || action === "fond") {
    if (state.heroSite !== "approche") return state;
    next.approach = action; next.heroSite = action === "corniche" ? "corniche" : "maintenance";
    next.messages.push(action === "corniche" ? "Corniche reconnue : le câble coupé et un poste sont observés ; la présence du piège reste estimée." : "Fond du canyon rejoint : détour praticable, présence hostile encore estimée.");
    if (action === "corniche") next.observedPosts = [0];
  } else if (action === "maintenance" && state.heroSite === "corniche") {
    next.heroSite = "maintenance"; next.messages.push("Le poste de maintenance est rejoint par la rampe. Le refuge possède encore sa batterie.");
  } else if ((action === "borrow" || action === "preserve") && state.heroSite === "maintenance") {
    next.battery = action; next.heroSite = "mezzanine";
    next.messages.push(action === "borrow" ? "Batterie prêtée : balise active plus tôt ; refuge exposé et restitution due." : "Batterie préservée : confiance des gardiens conservée ; réserve propre sur un trajet plus long.");
  } else if (action === "poste" && state.heroSite === "mezzanine") {
    next.heroSite = "poste"; next.messages.push("Poste rejoint. Le passage au commandement retire le contrôle de l’acteur d’action.");
  } else return state;
  return next;
}
export function canyonCompositionIssueV85(selection: Record<string, number>): string | null {
  if (!warCompositionV85(selection).allowed) return "Le manifeste dépasse les limites de composition ou ne contient aucune formation.";
  if (!(selection["RTS-U02"] > 0) || !(selection["RTS-U13"] > 0) || !(selection["RTS-U18"] > 0) || !((selection["RTS-U01"] ?? 0) + (selection["RTS-U03"] ?? 0) > 0)) return "Le canyon demande un pisteur, des sapeurs, des ravitailleurs et une escorte de patrouille ou de tir.";
  return null;
}
export function engageCanyonV85(state: CanyonSimulationV85, selection: Record<string, number>): CanyonSimulationV85 {
  if (state.phase !== "preparation" || state.heroSite !== "poste" || canyonCompositionIssueV85(selection)) return state;
  const next = copy(state); next.phase = "battle";
  for (const [typeId, rawQuantity] of Object.entries(selection)) {
    if (!warUnitV85(typeId)) continue;
    const quantity = Math.max(0, Math.min(12, Math.floor(rawQuantity)));
    const insertionX = next.battery === "borrow" ? 12 : 6;
    for (let index = 0; index < quantity; index++) next.formations.push({ id: `${next.id}-${typeId}-${index + 1}`, typeId, x: insertionX, level: 0, order: "hold", targetX: insertionX, startingXp: typeId === "RTS-U02" ? 90 : 0, roleEvents: [], objectives: [], rescued: [], threats: [], extraction: false, adopted: false, adoptionSeconds: 0 });
  }
  next.messages.push(next.battery === "borrow" ? "Manifeste scellé : insertion avancée par la balise active ; la batterie demeure due au refuge." : "Manifeste scellé : insertion par le trajet long avec la réserve propre ; le refuge reste protégé.");
  return next;
}
export function canyonOrderIssueV85(state: CanyonSimulationV85, formation: CanyonFormationV85, order: CanyonOrderKindV85, level: 0 | 1): string | null {
  if (state.phase !== "battle" || formation.extraction) return "Cette formation n’est plus commandable dans la bataille.";
  if (level === 1 && formation.typeId === "RTS-U18") return "Le chariot ne prend ni l’échelle ni le pont suspendu. Sa route reste au fond du canyon.";
  if (order === "observe" && formation.typeId !== "RTS-U02") return "L’observation de traces relève du pisteur.";
  if (order === "cover" && !["RTS-U01", "RTS-U03", "RTS-U05", "RTS-U09", "RTS-U10"].includes(formation.typeId)) return "La couverture demande une formation combattante qualifiée.";
  if (order === "secure" && formation.typeId !== "RTS-U13" && formation.typeId !== "RTS-U14") return "L’accès se rétablit avec les sapeurs ou le technicien.";
  if (order === "rescue" && !["RTS-U15", "RTS-U16", "RTS-U18"].includes(formation.typeId)) return "Affectez un soutien médical ou une équipe de portage au sauvetage.";
  const xp = formation.startingXp + canyonXpV85(formation);
  if (order === "adopt" && (formation.typeId !== "RTS-U02" || xp < 100 || formation.adopted)) return "Lecture récente demande V1, un pisteur et un choix encore disponible.";
  return null;
}
export function orderCanyonFormationV85(state: CanyonSimulationV85, id: string, order: CanyonOrderKindV85, targetX: number, level: 0 | 1): { state: CanyonSimulationV85; message: string } {
  const current = state.formations.find(formation => formation.id === id);
  if (!current) return { state, message: "Formation absente du manifeste." };
  const issue = canyonOrderIssueV85(state, current, order, level);
  if (issue) return { state, message: issue };
  const next = copy(state), formation = next.formations.find(item => item.id === id)!;
  formation.order = order; formation.targetX = Math.max(6, Math.min(96, Math.round(targetX))); formation.adoptionSeconds = 0;
  // Changing levels uses an actual west ramp or east stair. No middle-of-platform teleport.
  if (formation.level !== level) {
    if (formation.x <= 20 || formation.x >= 86) formation.level = level;
    else { formation.order = "move"; formation.targetX = formation.x < 53 ? 18 : 88; return { state: next, message: "Rejoindre d’abord la rampe ou l’escalier, puis choisir l’étage." }; }
  }
  return { state: next, message: `${warUnitV85(formation.typeId)?.name} : ordre ${order}, destination ${formation.targetX}, niveau ${formation.level}.` };
}
export function canyonXpV85(formation: CanyonFormationV85): number {
  return warXpGainV85({ roleActions: formation.roleEvents, objectives: formation.objectives, extracted: formation.extraction, rescued: formation.rescued, threats: formation.threats });
}
export function stepCanyonV85(state: CanyonSimulationV85, seconds = 1): CanyonSimulationV85 {
  if (state.phase !== "battle") return state;
  const next = copy(state), elapsed = Math.max(0, Math.min(1, seconds)); next.seconds += elapsed;
  for (const formation of next.formations) {
    if (formation.extraction) continue;
    const uncovered = CANYON_POSTS_V85.some((post, index) => next.observedPosts.includes(index) && !next.suppressedPosts.includes(index) && Math.abs(post - formation.x) < 10);
    const escorted = next.formations.some(ally => ally.id !== formation.id && ally.order === "cover" && !ally.extraction && Math.abs(ally.x - formation.x) <= 18);
    if (formation.order === "adopt") {
      if (uncovered && !escorted) { formation.adoptionSeconds = 0; formation.order = "hold"; next.messages.push("L’attaque interrompt l’adoption. Lecture récente reste disponible."); }
      else { formation.adoptionSeconds += elapsed; if (formation.adoptionSeconds >= 8) { formation.adopted = true; formation.order = "hold"; next.messages.push("Lecture récente adoptée après huit secondes à couvert. Santé, armes et rang rituel inchangés."); } }
      continue;
    }
    if (formation.order === "move" || formation.order === "extract") {
      const destination = formation.order === "extract" ? 96 : formation.targetX;
      const speed = formation.typeId === "RTS-U18" ? 4 : 7;
      const proposed = formation.x + Math.sign(destination - formation.x) * Math.min(Math.abs(destination - formation.x), elapsed * speed);
      const bridgeBlocked = formation.level === 1 && !next.bridgeSecured && ((formation.x <= 48 && proposed > 48) || (formation.x >= 56 && proposed < 56));
      const exposedConvoy = formation.typeId === "RTS-U18" && !escorted && CANYON_POSTS_V85.some((post, index) => !next.suppressedPosts.includes(index) && Math.abs(post - proposed) < 12);
      if (!bridgeBlocked && !exposedConvoy) formation.x = proposed;
      if (formation.x >= 95 && formation.order === "extract") {
        formation.extraction = true; formation.order = "hold";
        if (formation.typeId === "RTS-U18") { next.cargoDelivered = true; add(formation.objectives, "convoi-livre"); next.messages.push("Le chariot atteint l’extraction. Les caisses livrées appartiennent au registre de cet exercice."); }
      } else if (formation.order === "move" && formation.x === destination) formation.order = "hold";
    } else if (formation.order === "observe") {
      for (const [index, post] of CANYON_POSTS_V85.entries()) if (Math.abs(post - formation.x) <= 18 && !next.observedPosts.includes(index)) {
        next.observedPosts.push(index); add(formation.roleEvents, `poste-${index}`);
        next.messages.push(`Poste ${index + 1} observé localement. La carte entière reste inconnue.`);
      }
      if (Math.abs(formation.x - 46) <= 12) add(formation.roleEvents, "cable-coupe-confirme");
      if (formation.roleEvents.length >= 3) add(formation.objectives, "reconnaissance-complete");
      formation.order = "hold";
    } else if (formation.order === "cover") {
      for (const [index, post] of CANYON_POSTS_V85.entries()) if (next.observedPosts.includes(index) && !next.suppressedPosts.includes(index) && Math.abs(post - formation.x) <= 18) {
        next.suppressedPosts.push(index); add(formation.threats, `poste-${index}`); add(formation.roleEvents, `couverture-${index}`);
        const scout = next.formations.find(ally => ally.typeId === "RTS-U02" && Math.abs(ally.x - formation.x) <= 18);
        if (scout && scout.threats.length < 2) add(scout.threats, `marquage-${index}`);
        next.messages.push(`Poste ${index + 1} contenu par la couverture. Le convoi peut franchir ce secteur.`);
      }
    } else if (formation.order === "secure" && Math.abs(formation.x - 46) <= 10) {
      if (!uncovered || escorted) { next.bridgeSecured = true; add(formation.roleEvents, "ancrage-pont"); add(formation.objectives, "acces-securise"); formation.order = "hold"; next.messages.push("L’ancrage est rétabli. Le pont relie les deux portions de corniche ; le trajet bas reste disponible."); }
    } else if (formation.order === "rescue" && Math.abs(formation.x - 66) <= 10 && !next.porterRescued && (!uncovered || escorted)) {
      next.porterRescued = true; next.abandonedCrates = 1; add(formation.rescued, "porteur-blesse"); formation.order = "hold";
      next.messages.push("Le porteur immobilisé est évacué blessé. Une caisse reste sur le site ; aucun soin ne le ressuscite ni ne livre ce matériel.");
    }
  }
  const porters = next.formations.filter(formation => formation.typeId === "RTS-U18");
  if (next.formations.length > 0 && next.formations.every(formation => formation.extraction) && porters.every(formation => formation.extraction)) {
    next.phase = "debrief"; next.messages.push("Tous les groupes présents ont rejoint l’extraction. Lire le rapport avant de reconnaître le transit.");
  }
  next.messages = next.messages.slice(-100);
  return next;
}
export function withdrawCanyonV85(state: CanyonSimulationV85): CanyonSimulationV85 {
  if (state.phase !== "battle") return state;
  const next = copy(state); next.phase = "debrief";
  next.messages.push("Repli déclaré : seuls les groupes déjà extraits conservent leur bonus d’extraction. Aucune livraison supplémentaire ni annexion.");
  return next;
}
/** Single result receipt inside the free profile. It never receives or mutates SaveGame. */
export function commitCanyonV85(state: CanyonSimulationV85): CanyonSimulationV85 {
  if (state.phase !== "debrief" || state.committed) return state;
  const next = copy(state); next.committed = true; next.transitRecognized = state.cargoDelivered;
  next.messages.push(state.cargoDelivered ? "Convoyage confirmé une fois. CON-T09 reste F03 ; droit de transit reconnu dans l’exercice, compteur de conquête inchangé." : "Repli archivé une fois. Les routes alternatives restent ouvertes pour une autre opération.");
  if (state.battery === "borrow") next.messages.push("La restitution de la batterie reste une obligation du refuge ; le bilan ne la considère pas rendue automatiquement.");
  return next;
}
export function readCanyonV85(value: unknown): CanyonSimulationV85 | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (raw.version !== 1 || raw.context !== "free" || typeof raw.id !== "string" || raw.id.length > 150 || !["preparation", "battle", "debrief"].includes(String(raw.phase)) || !["unselected", "corniche", "fond"].includes(String(raw.approach)) || !["unselected", "borrow", "preserve"].includes(String(raw.battery)) || !["approche", "corniche", "maintenance", "mezzanine", "poste"].includes(String(raw.heroSite)) || typeof raw.seconds !== "number" || !Number.isFinite(raw.seconds) || raw.seconds < 0 || !Array.isArray(raw.formations) || raw.formations.length > 12 || !Array.isArray(raw.messages) || raw.messages.length > 100 || !raw.messages.every(message => typeof message === "string" && message.length < 2000)) return null;
  for (const key of ["bridgeSecured", "porterRescued", "cargoDelivered", "transitRecognized", "committed"]) if (typeof raw[key] !== "boolean") return null;
  for (const key of ["observedPosts", "suppressedPosts"]) if (!Array.isArray(raw[key]) || !(raw[key] as unknown[]).every(index => typeof index === "number" && Number.isInteger(index) && index >= 0 && index < 3)) return null;
  if (raw.abandonedCrates !== 0 && raw.abandonedCrates !== 1) return null;
  const identities = new Set<string>();
  for (const item of raw.formations) {
    if (!item || typeof item !== "object") return null;
    const formation = item as Record<string, unknown>;
    if (typeof formation.id !== "string" || identities.has(formation.id) || !warUnitV85(String(formation.typeId)) || typeof formation.x !== "number" || !Number.isFinite(formation.x) || formation.x < 0 || formation.x > 100 || (formation.level !== 0 && formation.level !== 1) || !["hold", "move", "observe", "cover", "secure", "rescue", "adopt", "extract"].includes(String(formation.order)) || typeof formation.targetX !== "number" || !Number.isFinite(formation.targetX) || formation.targetX < 0 || formation.targetX > 100 || typeof formation.startingXp !== "number" || !Number.isSafeInteger(formation.startingXp) || formation.startingXp < 0 || typeof formation.adoptionSeconds !== "number" || !Number.isFinite(formation.adoptionSeconds) || formation.adoptionSeconds < 0 || typeof formation.extraction !== "boolean" || typeof formation.adopted !== "boolean") return null;
    for (const key of ["roleEvents", "objectives", "rescued", "threats"]) if (!Array.isArray(formation[key]) || !(formation[key] as unknown[]).every(id => typeof id === "string" && id.length < 180) || (formation[key] as unknown[]).length > 100) return null;
    identities.add(formation.id);
  }
  return copy(value as CanyonSimulationV85);
}
