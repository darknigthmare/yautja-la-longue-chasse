import type { HomeworldProgress } from "./homeworld";

/** V42 authored continuation of the recovered Homeworld outline, not a quoted transcript. */
export type HomeworldInquiryApproach = "protect-source" | "trace-chain";
export interface HomeworldInquiryProgress {
  version: 1;
  convoyReviewed: boolean;
  archiveReviewed: boolean;
  approach: HomeworldInquiryApproach | null;
  followupVerified: boolean;
  audienceFiled: boolean;
}
export type HomeworldInquiryAction =
  | { kind: "convoy"; argument: "real-trail" | "named-culprit" }
  | { kind: "archives"; argument: "diversion" | "ordinary-hunt" }
  | { kind: "approach"; value: HomeworldInquiryApproach }
  | { kind: "followup"; source: "dock-officer" | "undercity-witness" }
  | { kind: "audience" };
export interface HomeworldInquiryOption { label: string; consequence?: string; action: HomeworldInquiryAction }
export interface HomeworldInquiryDialogue { title: string; text: string; options: HomeworldInquiryOption[] }
export const defaultHomeworldInquiry = (): HomeworldInquiryProgress => ({ version: 1,
  convoyReviewed: false, archiveReviewed: false, approach: null, followupVerified: false, audienceFiled: false });
export function inquiryPrerequisites(progress: Pick<HomeworldProgress, "expeditions" | "audienceOutcome">): boolean {
  return Boolean(progress.expeditions["ash-marches"] && progress.expeditions["glass-desert"] && progress.audienceOutcome);
}

/** Unknown or contradictory imported states cannot be used as a write base. */
export function isHomeworldInquiryState(value: unknown): value is HomeworldInquiryProgress {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const raw = value as Record<string, unknown>;
  return raw.version === 1
    && ["convoyReviewed", "archiveReviewed", "followupVerified", "audienceFiled"].every(key => typeof raw[key] === "boolean")
    && (raw.approach === null || raw.approach === "protect-source" || raw.approach === "trace-chain")
    && (!raw.archiveReviewed || raw.convoyReviewed === true)
    && (raw.approach === null || raw.archiveReviewed === true)
    && (!raw.followupVerified || raw.approach !== null)
    && (!raw.audienceFiled || raw.followupVerified === true);
}

/** Additive, immutable migration: retain only an ordered prefix backed by actual reports. */
export function normalizeHomeworldInquiry(value: unknown, eligible: boolean): HomeworldInquiryProgress {
  const clean = defaultHomeworldInquiry();
  if (!eligible || typeof value !== "object" || value === null || Array.isArray(value)) return clean;
  const raw = value as Record<string, unknown>;
  if (raw.version !== 1) return clean;
  clean.convoyReviewed = raw.convoyReviewed === true;
  clean.archiveReviewed = clean.convoyReviewed && raw.archiveReviewed === true;
  if (clean.archiveReviewed && (raw.approach === "protect-source" || raw.approach === "trace-chain")) clean.approach = raw.approach;
  clean.followupVerified = clean.approach !== null && raw.followupVerified === true;
  clean.audienceFiled = clean.followupVerified && raw.audienceFiled === true;
  return clean;
}

export function homeworldInquiryJournal(progress: HomeworldProgress) {
  const state = progress.inquiry;
  const completed = Number(state.convoyReviewed) + Number(state.archiveReviewed) + Number(state.approach !== null)
    + Number(state.followupVerified) + Number(state.audienceFiled);
  const missing = [!progress.expeditions["ash-marches"] && "rapport des Marches", !progress.expeditions["glass-desert"] && "rapport du Désert",
    !progress.audienceOutcome && "première audience"].filter(Boolean).join(", ");
  const step = !inquiryPrerequisites(progress) ? "locked" : !state.convoyReviewed ? "convoy" : !state.archiveReviewed ? "archives"
    : !state.approach ? "approach" : !state.followupVerified ? "followup" : !state.audienceFiled ? "audience" : "complete";
  const destinations = {
    locked: { pointId: null, label: "Rapports et première audience", objective: `À obtenir durablement : ${missing}. Les visites seules ne valent pas rapport.` },
    convoy: { pointId: "dock-officer-point", label: "Officier des quais · Port des Chasses", objective: "Confronter les empreintes réelles et fabriquées des Marches au trajet du convoi." },
    archives: { pointId: "memory-register-point", label: "Conservatrice des marques · Maison de la Mémoire", objective: "Comparer le registre scellé avec le journal de transit et la balise du Désert." },
    approach: { pointId: "enforcer-point", label: "Capitaine des Enforcers · Bastion", objective: "Choisir la priorité de vérification après lecture des conséquences. Aucun coupable n’est encore identifié." },
    followup: state.approach === "protect-source"
      ? { pointId: "witness-point", label: "Témoin des galeries · Sous-Cité", objective: "Faire confirmer une version anonymisée sans publier l’emplacement du témoin." }
      : { pointId: "dock-officer-point", label: "Officier des quais · Port des Chasses", objective: "Faire recouper les transferts avec le rapport de la balise, sans attribuer de culpabilité." },
    audience: { pointId: "audience-point", label: "Roi de la Chasse · Citadelle", objective: "Remettre le dossier vérifié et faire enregistrer la décision complémentaire de cette cité." },
    complete: { pointId: null, label: "Contre-enquête remise", objective: state.approach === "protect-source"
      ? "La cité conserve un témoignage anonymisé ; les coordonnées du refuge ne figurent pas dans le dossier remis."
      : "La cité conserve un recoupement des transferts ; le dossier distingue trajet documenté et responsable encore inconnu." },
  };
  return { step, completed, total: 5, ...destinations[step] };
}

const beaconText = (progress: HomeworldProgress) => progress.expeditions["glass-desert"]?.beaconDisposition === "preserve"
  ? "Tu as conservé le canal de la balise : le rapport garde cette piste ouverte. Aucune nouvelle surveillance automatique n’est simulée."
  : "Tu as coupé la balise : on travaille sur le journal et les relevés conservés, sans prétendre recevoir un signal vivant.";
const witnessText = (progress: HomeworldProgress) => progress.witnessChoice === "protect"
  ? "L’ordre initial de protection du témoin reste inscrit."
  : progress.witnessChoice === "restitution"
    ? "La restitution ordonnée lors de la première audience reste inscrite ; cette vérification ne la remplace pas."
    : "La réserve de jugement de la première audience reste inscrite.";

export function homeworldInquiryDialogue(progress: HomeworldProgress, npcId: string | undefined): HomeworldInquiryDialogue | null {
  if (!npcId || !["dock-officer", "memory-keeper", "enforcer-captain", "undercity-witness", "hunt-king"].includes(npcId)) return null;
  const state = progress.inquiry, journal = homeworldInquiryJournal(progress);
  const result = (text: string, options: HomeworldInquiryOption[] = []) => ({ title: "Contre-enquête du convoi", text, options });
  if (journal.step === "locked") return result(journal.objective);
  if (journal.step === "convoy" && npcId === "dock-officer") return result(
    "Le convoi a suivi une piste réelle, masquée par des empreintes fabriquées. Quelle conclusion ton rapport permet-il de défendre ?", [
      { label: "Le rapport nomme le commanditaire.", action: { kind: "convoy", argument: "named-culprit" } },
      { label: "Les deux pistes révèlent une tentative de dissimulation.", action: { kind: "convoy", argument: "real-trail" } },
    ]);
  if (journal.step === "archives" && npcId === "memory-keeper") return result(
    `La marque renvoie à une prise conservée au mausolée. Le journal du Désert concorde avec une balise de rabattage. ${beaconText(progress)} Que faut-il inscrire ?`, [
      { label: "Un détournement documenté ; le responsable reste à établir.", action: { kind: "archives", argument: "diversion" } },
      { label: "Une chasse ordinaire suffit à expliquer toutes les traces.", action: { kind: "archives", argument: "ordinary-hunt" } },
    ]);
  if (journal.step === "approach" && npcId === "enforcer-captain") return result(
    `Les rapports se recoupent, mais personne ne sera condamné sur cette seule déduction. ${witnessText(progress)} Choisis une priorité : elle sera conservée et te mènera vers un interlocuteur différent.`, [
      { label: "Protéger la source du témoignage", consequence: "Retourner voir le témoin ; remettre une version anonymisée au roi. L’emplacement du refuge n’entre pas dans le dossier complémentaire.", action: { kind: "approach", value: "protect-source" } },
      { label: "Recouper la chaîne des transferts", consequence: "Retourner voir l’officier des quais ; remettre la concordance des relevés. Aucun nom de suspect n’est ajouté sans preuve.", action: { kind: "approach", value: "trace-chain" } },
    ]);
  if (journal.step === "followup") {
    if (state.approach === "protect-source" && npcId === "undercity-witness") return result(
      `Le témoin accepte que ses observations soient recoupées sans transmettre son refuge. Tu ne réécris pas sa première décision. ${witnessText(progress)}`, [
        { label: "Consigner le témoignage anonymisé", action: { kind: "followup", source: "undercity-witness" } },
      ]);
    if (state.approach === "trace-chain" && npcId === "dock-officer") return result(
      `L’officier confronte le passage du convoi au journal de transit. La concordance documente une route, pas son commanditaire. ${beaconText(progress)}`, [
        { label: "Consigner le recoupement des transferts", action: { kind: "followup", source: "dock-officer" } },
      ]);
  }
  if (journal.step === "audience" && npcId === "hunt-king") return result(
    `Le roi de cette cité reçoit le complément. ${witnessText(progress)} ${state.approach === "protect-source"
      ? "Le dossier public ne nommera pas le refuge ; le témoignage restera anonymisé."
      : "Le dossier distinguera le trajet confirmé et l’identité encore inconnue du responsable."} Aucun jugement Bad Blood, promotion ou trophée n’en découle.`, [
      { label: "Remettre le complément vérifié", action: { kind: "audience" } },
    ]);
  if (journal.step === "complete") return result(`${journal.objective} ${witnessText(progress)} ${beaconText(progress)} Les autres régions et les actes complets restent à produire.`);
  return result(`Prochaine vérification : ${journal.label}. ${journal.objective}`);
}

export function applyHomeworldInquiry(progress: HomeworldProgress, action: HomeworldInquiryAction) {
  const state = { ...progress.inquiry };
  const reply = (ok: boolean, changed: boolean, message: string) => ({ state, ok, changed, message });
  if (!inquiryPrerequisites(progress)) return reply(false, false, "Les deux rapports durables et la première audience sont requis. Aucun rang ne remplace ces preuves.");
  if (!action || typeof action !== "object" || Array.isArray(action)) return reply(false, false, "Argument inconnu.");
  switch (action.kind) {
    case "convoy":
      if (state.convoyReviewed) return reply(true, false, "Le rapport des pistes est déjà confronté.");
      if (action.argument !== "real-trail") return reply(false, false, "Les traces montrent la dissimulation du trajet, pas l’identité de son commanditaire. Relis les deux pistes avant de conclure.");
      state.convoyReviewed = true; return reply(true, true, "Les deux pistes sont confrontées. Compare maintenant le dossier à la Maison de la Mémoire.");
    case "archives":
      if (!state.convoyReviewed) return reply(false, false, "L’officier doit d’abord confronter le rapport des Marches.");
      if (state.archiveReviewed) return reply(true, false, "La concordance des archives est déjà conservée.");
      if (action.argument !== "diversion") return reply(false, false, "Le journal et la balise de rabattage ne décrivent pas une simple chasse ordinaire. Cela ne permet toujours pas de nommer un coupable.");
      state.archiveReviewed = true; return reply(true, true, "La concordance est conservée. Le capitaine des Enforcers peut maintenant recevoir ce dossier.");
    case "approach":
      if (!state.archiveReviewed) return reply(false, false, "Compare les archives avant de choisir une priorité.");
      if (action.value !== "protect-source" && action.value !== "trace-chain") return reply(false, false, "Priorité inconnue.");
      if (state.approach) return reply(state.approach === action.value, false, "Cette priorité est déjà engagée ; elle ne se réécrit pas en répétant la conversation.");
      state.approach = action.value; return reply(true, true, action.value === "protect-source"
        ? "Priorité conservée : reviens auprès du témoin pour établir une version anonymisée."
        : "Priorité conservée : reviens aux quais pour recouper les transferts.");
    case "followup": {
      const expected = state.approach === "protect-source" ? "undercity-witness" : "dock-officer";
      if (!state.approach || action.source !== expected) return reply(false, false, "Cette vérification ne correspond pas à la priorité engagée.");
      if (state.followupVerified) return reply(true, false, "Cette vérification complémentaire est déjà conservée.");
      state.followupVerified = true; return reply(true, true, "Vérification conservée. Le dossier complémentaire peut être remis à la Citadelle.");
    }
    case "audience":
      if (!state.followupVerified) return reply(false, false, "Retourne d’abord auprès de l’interlocuteur choisi pour vérifier le complément.");
      if (state.audienceFiled) return reply(true, false, "Cette contre-enquête a déjà été remise. Aucune récompense ni conséquence n’est répétée.");
      state.audienceFiled = true; return reply(true, true, "Contre-enquête enregistrée : le dossier de la cité conserve ta priorité et les limites des preuves. L’enquête générale n’est pas résolue.");
    default: return reply(false, false, "Argument inconnu.");
  }
}
