import { PIT_VERSUS_FIGHTER_IDS, getPitFighterProfile } from "./pitRosterExpansion";
import { PIT_LORE_STAGE_DEFINITIONS, PIT_EXPLICIT_STAGE_ASSOCIATIONS, type PitExplicitStageAssociation, type PitStageSourceClassification, type PitStageSourceStatus } from "./pitLoreStages";
import { PIT_ORIGINAL_STAGE_ASSOCIATIONS_V56 } from './pitOriginalStagesV56';

export type PitCharacterStageCoverage = "dedicated-lateral-adaptation" | "existing-work-setting" | "reference-needed" | "identity-unverified" | "cosmetic-no-exclusive-location" | "original-exhibition";
export interface PitCharacterStageAssociation {
  readonly fighterId: string;
  readonly fighterName: string;
  readonly stageId: string | null;
  readonly coverage: PitCharacterStageCoverage;
  readonly reason: string;
  readonly classification: PitStageSourceClassification | "unresolved";
  readonly sourceStatus: PitStageSourceStatus | "unresolved";
  readonly sourceUrls: readonly string[];
  readonly exactGeometryCertified: false;
}

// Explicit identity associations only. Never infer a biography from the shape of an imported bitmap.
const referencedAssociationsV79: readonly PitExplicitStageAssociation[] = [
  { fighterId: 'user-last-hunt-super', stageId: 'arena-179-last-hunt-preserve', classification: 'work-setting', sourceStatus: 'primary-limited',
    reason: 'Réserve déjà adaptée depuis The Last Hunt. Le chasseur est référencé par les planches du numéro 3 ; ce décor reste une composition de jeu, pas sa salle personnelle ni la géométrie exacte d’une case.',
    sourceUrls: ['https://www.marvel.com/comics/collection/110461/', 'https://aiptcomics.com/2024/04/19/marvel-preview-predator-the-last-hunt-3/'] },
  { fighterId: 'user-avp-classic-2000', stageId: 'arena-128-avp-classic-2000-colonial-base', classification: 'work-setting', sourceStatus: 'primary-limited',
    reason: 'Base coloniale de l’édition Classic 2000 déjà adaptée. Association au jeu confirmé par ses captures et son manuel ; aucun nom individuel, niveau exact ou lieu exclusif n’est inventé.',
    sourceUrls: ['https://store.steampowered.com/app/3730/', 'https://store.steampowered.com/manual/3730'] },
];
const sharedWorkSettings: readonly { fighters: readonly string[]; stageId: string; reason: string }[] = [
  { fighters: ["jungle-hunter"], stageId: "arena-103-predator-1987-final-trap-clearing", reason: "Clairière finale du film d’origine ; composition 2D déjà adaptée." },
  { fighters: ["city-hunter", "greyback", "user-boar", "user-guardian", "user-lost", "user-scout", "user-shaman", "user-snake", "user-stalker", "user-warrior"], stageId: "arena-106-predator-2-1990-trophy-ship", reason: "Vaisseau des trophées de Predator 2 : scène commune du film, pas une salle personnelle inventée pour chaque membre." },
  { fighters: ["scar", "celtic", "user-chopper", "user-elder-avp", "user-youngblood"], stageId: "arena-122-avp-2004-sacrificial-chamber", reason: "Cadre commun AVP 2004 ; recommandation liée à l’œuvre, sans présence de chaque membre attestée dans cette salle exacte." },
  { fighters: ["wolf", "user-bull-avpr", "user-bonegrill-avpr", "user-avpr-corridor-crew"], stageId: "arena-127-avpr-2007-forest-crash", reason: "Cadre AVPR existant ; recommandation d’œuvre, pas lieu personnel propre aux silhouettes d’équipage." },
  { fighters: ["berserker", "falconer", "tracker", "user-classic-2010"], stageId: "arena-107-predators-2010-hunting-camp", reason: "Réserve de chasse de Predators, déjà représentée ; aucun nouveau lieu propre aux apparences." },
  { fighters: ["feral-hunter"], stageId: "arena-115-prey-2022-mud-pit", reason: "Bourbier de Prey déjà adapté au duel." },
  { fighters: ["user-fugitive", "user-assassin"], stageId: "arena-112-the-predator-2018-forest-crash", reason: "Cadre commun The Predator 2018, déjà adapté ; pas une scène exclusive à chaque variation." },
  { fighters: ["user-dek", "user-kwei", "user-njohrr"], stageId: "arena-121-badlands-2025-clan-prologue", reason: "Cadre du clan dans Badlands, déjà représenté ; géométrie latérale recomposée." },
  { fighters: ["kok-warlord"], stageId: "arena-118-killer-of-killers-2025-yautja-arena", reason: "Arène de Killer of Killers déjà adaptée." },
  { fighters: ["user-jotun-grendel"], stageId: "arena-116-killer-of-killers-2025-viking-ice", reason: "Cadre du récit The Shield, déjà adapté." },
  { fighters: ["user-oni"], stageId: "arena-117-killer-of-killers-2025-japan-rooftops", reason: "Cadre du récit The Sword, déjà adapté." },
  { fighters: ["user-dark", "user-lord", "user-spartan", "user-wolf-elite-bg386"], stageId: "arena-131-avp-2010-freyas-prospect", reason: "Cadre partagé du jeu AVP 2010 ; ne certifie pas l’identité visuelle des variantes importées ni une scène individuelle." },
  { fighters: ["user-arcade-hunter", "user-arcade-warrior", "user-arcade-mad"], stageId: "arena-052-city-in-despair-etude-capcom", reason: "Étude locale du décor Capcom déjà présente ; adaptation, pas reconstitution exacte du jeu." },
];

export function getPitCharacterStageAssociation(fighterId: string): PitCharacterStageAssociation | null {
  if (!(PIT_VERSUS_FIGHTER_IDS as readonly string[]).includes(fighterId)) return null;
  const fighter = getPitFighterProfile(fighterId as typeof PIT_VERSUS_FIGHTER_IDS[number]);
  const base = { fighterId, fighterName: fighter.name, exactGeometryCertified: false as const, classification: "unresolved" as const, sourceStatus: "unresolved" as const, sourceUrls: [] as readonly string[] };
  const explicit = PIT_ORIGINAL_STAGE_ASSOCIATIONS_V56.find(entry => entry.fighterId === fighterId)
    ?? PIT_EXPLICIT_STAGE_ASSOCIATIONS.find(entry => entry.fighterId === fighterId)
    ?? referencedAssociationsV79.find(entry => entry.fighterId === fighterId);
  if (explicit) return { ...base, ...explicit, coverage: explicit.classification === "character-setting" ? "dedicated-lateral-adaptation" : explicit.classification === "work-setting" ? "existing-work-setting" : "original-exhibition" };
  const dedicated = PIT_LORE_STAGE_DEFINITIONS.find(stage => (stage.dedicatedFighters as readonly string[]).includes(fighterId));
  if (dedicated) return { ...base, stageId: dedicated.id, coverage: "dedicated-lateral-adaptation", reason: dedicated.sourceClaim };
  const shared = sharedWorkSettings.find(entry => entry.fighters.includes(fighterId));
  if (shared) return { ...base, stageId: shared.stageId, coverage: "existing-work-setting", reason: shared.reason };
  if (fighterId.endsWith("-phg") || ["valkyrie", "witch"].includes(fighterId)) return {
    ...base, stageId: "arena-134-predator-hunting-grounds-overgrowth", coverage: "cosmetic-no-exclusive-location",
    reason: "Personnage ou classe Hunting Grounds : décor commun du jeu proposé, aucun lieu exclusif attesté par cette tenue. Sa biographie historique nécessite ses propres références avant création d’une scène.",
  };
  if (/Images fournies|Galerie Warp|Kenner/.test(fighter.sourceWork)) return {
    ...base, stageId: null, coverage: "identity-unverified",
    reason: "Nom/image fournis ou gamme dérivée : lieu propre non établi par une source primaire vérifiée. Ne pas inventer une origine depuis le costume ; proposition originale possible après clarification des références.",
  };
  return { ...base, stageId: null, coverage: "reference-needed", reason:
    fighterId === "theta" ? "Theta est attestée par Marvel, mais un lieu précis et son dessin doivent encore être référencés ; aucun vaisseau ou paysage inventé n’est annoncé canonique."
      : fighterId === "user-ahab" ? "Ahab/Fire and Stone attesté par NECA et Dark Horse ; décor précis à documenter avec référence primaire visuelle avant stage dédié."
        : "Identité nommée au roster, mais aucun lieu dédié vérifié et livré. Référence primaire de l’œuvre, lieu et art modulaire restent à produire." };
}

/** Exhaustive per identity; appearance variants never inflate the number of dedicated stages. */
export const PIT_CHARACTER_STAGE_COVERAGE = PIT_VERSUS_FIGHTER_IDS.map(id => getPitCharacterStageAssociation(id)!);
