import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDirectory, "..");
const sourceRoot = path.join(root, "art-source", "v16", "franchise-trophies");

const PREDATOR = "https://www.20thcenturystudios.com/movies/predator";
const PREDATOR_2 = "https://www.20thcenturystudios.com/movies/predator-2";
const AVP = "https://www.20thcenturystudios.com/movies/alien-vs-predator";
const AVPR = "https://www.20thcenturystudios.com/movies/aliens-vs-predator-requiem";
const PREDATORS = "https://www.20thcenturystudios.com/movies/predators";
const PREY = "https://www.20thcenturystudios.com/movies/prey";
const BADLANDS = "https://www.20thcenturystudios.com/movies/predator-badlands";
const KILLER_OF_KILLERS =
  "https://www.20thcenturystudios.com/movies/predator-killer-of-killers";
const P2_WALL =
  "https://necaonline.com/2013/03/predators-11x12-trophy-wall-diorama/";
const AVPR_CONCEPT =
  "https://www.avpgalaxy.net/avp-movies/avp-requiem/gallery/concept-art/";
const BADLANDS_DESIGN = "https://www.ravincentworkshop.com/predator-badlands/";
const PHG = "https://predator.illfonic.com/about/";
const PHG_219 = "https://forum.predator.illfonic.com/t/patch-notes-2-19/20975";
const PHG_223 = "https://forum.predator.illfonic.com/t/patch-notes-2-23/22899";
const PHG_THREE =
  "https://forum.predator.illfonic.com/t/three-new-trophies-and-saber-mask-now-available/23906";
const PHG_COMMUNITY =
  "https://forum.predator.illfonic.com/t/list-of-all-legendary-trophies-with-images/24214";
const CONCRETE_JUNGLE =
  "https://www.avpgalaxy.net/games/predator-concrete-jungle/walkthrough/";
const AVP_2010_MANUAL =
  "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/10680/manuals/AVP_G4W_MG_UK_DD.pdf?t=1763676764";

function appearance(work, year, medium, status, sourcePage, note = "") {
  return { work, year, medium, status, sourcePage, note };
}

function createEntry({
  id,
  name,
  visualAnchor,
  appearances,
  confidence = "high",
  guardrail = "",
  referencePage,
  referenceImageUrl = null,
  composition = "single-object",
}) {
  return {
    id,
    name,
    visualAnchor,
    appearances,
    confidence,
    guardrail,
    composition,
    assetDecision: "create",
    referencePage: referencePage ?? appearances[0].sourcePage,
    referenceImageUrl,
  };
}

function reuseEntry({
  id,
  name,
  visualAnchor,
  appearances,
  masterPath,
  runtimePath,
  confidence = "high",
  guardrail = "",
}) {
  return {
    id,
    name,
    visualAnchor,
    appearances,
    confidence,
    guardrail,
    composition: "single-object",
    assetDecision: "reuse-v14",
    masterPath,
    runtimePath,
    runtimeUrl: `/${runtimePath.replace(/^public\//, "")}`,
  };
}

const physicalEntries = [
  reuseEntry({
    id: "franchise-human-skull-spine",
    name: "Crâne humain avec colonne vertébrale",
    visualAnchor:
      "Crâne humain complet avec mandibule et longue colonne articulée, nettoyé pour l'archive sans chair ni sang.",
    appearances: [
      appearance("Predator", 1987, "film", "screen-acquisition", PREDATOR, "Victime non nommée dans le plan; Billy est seulement probable."),
      appearance("Predator 2", 1990, "film", "screen-acquisition", PREDATOR_2, "Danny Archuleta et King Willie sont deux prises distinctes du même type."),
      appearance("Predators", 2010, "film", "screen-acquisition", PREDATORS, "Prise de Stans."),
      appearance("Predator: Badlands", 2025, "film", "screen-trophy", BADLANDS, "Victime humaine anonyme sur le mur de Kwei."),
      appearance("Predator: Hunting Grounds", 2020, "video-game", "claim-object", PHG, "Full claim officiel."),
    ],
    masterPath:
      "art-source/v14/hunter-kit/masters/trophy-human-skull-spine-badlands-chroma.png",
    runtimePath:
      "public/game/assets/v14/hunter-kit/trophies/trophy-human-skull-spine-badlands.webp",
    guardrail:
      "Ne pas attribuer une identité unique à ce design partagé; les victimes sont conservées dans les apparitions.",
  }),
  createEntry({
    id: "franchise-loose-human-skull",
    name: "Crâne humain nettoyé",
    visualAnchor:
      "Crâne humain isolé avec mandibule, sans colonne, usé mais anatomique; aucune identité individuelle.",
    appearances: [
      appearance("Predator", 1987, "film", "licensed-accessory", PREDATOR),
      appearance("Predator 2", 1990, "film", "screen-trophy", PREDATOR_2),
      appearance("Aliens vs. Predator: Requiem", 2007, "film", "screen-trophy", AVPR),
      appearance("Predators", 2010, "film", "screen-trophy", PREDATORS),
      appearance("Predator: Hunting Grounds", 2020, "video-game", "claim-object", PHG, "Quick claim officiel."),
    ],
    referencePage:
      "https://necaonline.com/2016/07/predator-deluxe-accessory-pack/",
    guardrail: "Objet générique licencié; aucune identité de victime.",
  }),
  reuseEntry({
    id: "franchise-p2-xenomorph-skull",
    name: "Crâne d'Alien Warrior du mur de 1990",
    visualAnchor:
      "Long crâne biomécanique à dôme étiré, fenestrae répétées, rail interne et mâchoire complète.",
    appearances: [
      appearance("Predator 2", 1990, "film", "screen-trophy", PREDATOR_2),
    ],
    masterPath:
      "art-source/v14/hunter-kit/masters/trophy-xenomorph-skull-p2-chroma.png",
    runtimePath:
      "public/game/assets/v14/hunter-kit/trophies/trophy-xenomorph-skull-p2.webp",
    guardrail: "Alien Warrior est l'identification de production; ne pas lui attribuer un individu.",
  }),
  createEntry({
    id: "franchise-p2-dinosauriform-skull",
    name: "Grand crâne extraterrestre dinosauriforme",
    visualAnchor:
      "Le plus grand crâne du mur de Predator 2, allongé et théropode, avec longue gueule dentée.",
    appearances: [
      appearance("Predator 2", 1990, "film", "screen-trophy", PREDATOR_2),
    ],
    referencePage: P2_WALL,
    guardrail: "NECA dit seulement dinosaur-like; ne jamais écrire Tyrannosaurus rex.",
  }),
  reuseEntry({
    id: "franchise-p2-four-orbit-skull",
    name: "Crâne massif aux quatre orbites",
    visualAnchor:
      "Boîte crânienne géante, exactement quatre cavités visuelles et mandibules en pinces.",
    appearances: [
      appearance("Predator 2", 1990, "film", "screen-trophy", PREDATOR_2),
    ],
    masterPath:
      "art-source/v14/hunter-kit/masters/trophy-p2-four-eye-giant-skull-chroma.png",
    runtimePath:
      "public/game/assets/v14/hunter-kit/trophies/trophy-p2-four-eye-giant-skull.webp",
    guardrail: "Nom descriptif de projet; espèce officiellement anonyme.",
  }),
  reuseEntry({
    id: "franchise-p2-horn-chin-skull",
    name: "Crâne aux cornes sous-mentonnières",
    visualAnchor:
      "Crâne robuste portant une unique paire de longues cornes symétriques sous la mâchoire.",
    appearances: [
      appearance("Predator 2", 1990, "film", "screen-trophy", PREDATOR_2),
    ],
    masterPath:
      "art-source/v14/hunter-kit/masters/trophy-p2-horn-chin-skull-chroma.png",
    runtimePath:
      "public/game/assets/v14/hunter-kit/trophies/trophy-p2-horn-chin-skull.webp",
    guardrail: "Morphologie uniquement; espèce officiellement anonyme.",
  }),
  reuseEntry({
    id: "franchise-p2-tusked-skull",
    name: "Crâne extraterrestre à défenses",
    visualAnchor:
      "Crâne compact muni d'une unique paire de longues défenses courbes issues des joues.",
    appearances: [
      appearance("Predator 2", 1990, "film", "screen-trophy", PREDATOR_2),
    ],
    masterPath:
      "art-source/v14/hunter-kit/masters/trophy-p2-tusked-skull-chroma.png",
    runtimePath:
      "public/game/assets/v14/hunter-kit/trophies/trophy-p2-tusked-skull.webp",
    guardrail: "Morphologie uniquement; espèce officiellement anonyme.",
  }),
  createEntry({
    id: "franchise-p2-small-finned-skull",
    name: "Petit crâne extraterrestre à crête",
    visualAnchor:
      "Petit crâne étroit du mur de Predator 2, avec une nageoire ou crête osseuse dominante.",
    appearances: [
      appearance("Predator 2", 1990, "film", "screen-trophy", PREDATOR_2),
    ],
    referencePage:
      "https://necaonline.com/2012/10/soon-toys-r-us-exclusive-battle-damaged-predators-action-figure-2-pack/",
    guardrail: "Finned skull est une description d'accessoire, pas une taxonomie.",
  }),
  createEntry({
    id: "franchise-p2-anonymous-wall-pair",
    name: "Paire restante de crânes anonymes du mur de 1990",
    visualAnchor:
      "Les deux morphologies du présentoir à huit montures qui ne correspondent ni au Xénomorphe, ni au dinosauriforme, ni aux quatre prises déjà individualisées.",
    appearances: [
      appearance("Predator 2", 1990, "film", "screen-trophy", PREDATOR_2),
    ],
    referencePage: P2_WALL,
    composition: "paired-set",
    confidence: "medium",
    guardrail:
      "Conserver les deux silhouettes dans un ensemble descriptif; ne pas inventer d'espèce ni de nom canonique.",
  }),
  createEntry({
    id: "franchise-avp-chopper-impaled-skull-pair",
    name: "Paire de petits crânes empalés de Chopper",
    visualAnchor:
      "Deux petits crânes anonymes montés chacun sur une courte pointe derrière les épaules de Chopper.",
    appearances: [
      appearance("Alien vs. Predator", 2004, "film", "screen-trophy", AVP),
    ],
    composition: "paired-set",
    guardrail: "La production ne confirme ni humain ni espèce extraterrestre.",
  }),
  reuseEntry({
    id: "franchise-avp-impaled-xenomorph-head",
    name: "Tête de Xénomorphe empalée",
    visualAnchor:
      "Tête entière de Xénomorphe adulte traversée verticalement par un unique bâton rituel.",
    appearances: [
      appearance("Alien vs. Predator", 2004, "film", "licensed-accessory", AVP),
    ],
    masterPath:
      "art-source/v14/hunter-kit/masters/trophy-avp-impaled-xeno-head-chroma.png",
    runtimePath:
      "public/game/assets/v14/hunter-kit/trophies/trophy-avp-impaled-xeno-head.webp",
    guardrail: "Accessoire NECA rattaché au film; pas une prise clairement établie par le montage.",
  }),
  createEntry({
    id: "franchise-avpr-space-jockey-helmet",
    name: "Trophée de type Space Jockey",
    visualAnchor:
      "Grande tête ou casque biomécanique à trompe, monté au mur du Scout Ship.",
    appearances: [
      appearance("Aliens vs. Predator: Requiem", 2007, "film", "screen-trophy", AVPR),
    ],
    referencePage:
      "https://www.avpgalaxy.net/avp-movies/avp-requiem/trivia/",
    guardrail: "Dire Space Jockey-like head/helmet, jamais Engineer.",
  }),
  createEntry({
    id: "franchise-avpr-queen-like-head",
    name: "Grande tête de Xénomorphe de type Reine",
    visualAnchor:
      "Large carapace céphalique de Reine Xénomorphe placée au centre du mur du Scout Ship.",
    appearances: [
      appearance("Aliens vs. Predator: Requiem", 2007, "film", "screen-trophy", AVPR),
    ],
    referencePage: AVPR_CONCEPT,
    referenceImageUrl:
      "https://www.avpgalaxy.net/wordpress/wp-content/uploads/2020/11/avpr-concept-045-rob-olsson.jpg",
    confidence: "medium",
    guardrail: "Ne pas prétendre qu'il s'agit de la Reine du film AVP de 2004.",
  }),
  createEntry({
    id: "franchise-avpr-xenomorph-skull-set",
    name: "Crânes de Xénomorphes du Scout Ship",
    visualAnchor:
      "Petit ensemble de crânes biomécaniques allongés montés dans la salle de Wolf.",
    appearances: [
      appearance("Aliens vs. Predator: Requiem", 2007, "film", "screen-trophy", AVPR),
    ],
    referencePage:
      "https://monsterlegacy.net/2015/08/22/starbeast-aliens-vs-predator-requiem/",
    composition: "small-set",
    guardrail: "ADI confirme Alien skulls au pluriel sans nombre ni caste individuelle.",
  }),
  createEntry({
    id: "franchise-avpr-three-horn-skull",
    name: "Grand crâne anonyme à trois cornes",
    visualAnchor:
      "Large crâne animal avec collerette et trois cornes, visible dans la salle du Scout Ship.",
    appearances: [
      appearance("Aliens vs. Predator: Requiem", 2007, "film", "screen-trophy", AVPR),
    ],
    referencePage: AVPR_CONCEPT,
    referenceImageUrl:
      "https://www.avpgalaxy.net/wordpress/wp-content/uploads/2020/11/avpr-concept-045-rob-olsson.jpg",
    confidence: "medium",
    guardrail: "Dire triceratops-like, pas Triceratops canonique.",
  }),
  createEntry({
    id: "franchise-avpr-anonymous-skull-set",
    name: "Crânes extraterrestres anonymes du Scout Ship",
    visualAnchor:
      "Ensemble des autres crânes, mandibules et fragments osseux de morphologies distinctes visibles sur les concepts de trophées.",
    appearances: [
      appearance("Aliens vs. Predator: Requiem", 2007, "film", "screen-trophy", AVPR),
    ],
    referencePage: AVPR_CONCEPT,
    referenceImageUrl:
      "https://www.avpgalaxy.net/wordpress/wp-content/uploads/2020/11/avpr-concept-046-rob-olsson.jpg",
    composition: "small-set",
    guardrail: "Ensemble anonyme; aucune taxonomie déduite de la silhouette.",
  }),
  createEntry({
    id: "franchise-avpr-xenomorph-head-processing",
    name: "Tête de Xénomorphe en préparation",
    visualAnchor:
      "Tête fraîche de Xénomorphe anonyme immobilisée sur l'établi de préparation des trophées.",
    appearances: [
      appearance("Aliens vs. Predator: Requiem", 2007, "film", "screen-processing", AVPR),
    ],
    referencePage:
      "https://monsterlegacy.net/2015/08/22/starbeast-aliens-vs-predator-requiem/",
    guardrail: "Objet en préparation, pas crâne déjà exposé; rendu d'archive sans gore.",
  }),
  createEntry({
    id: "franchise-avpr-wolf-mask-prey-teeth",
    name: "Dents de proies enchâssées dans le masque de Wolf",
    visualAnchor:
      "Biomask gravé de Wolf entouré de plusieurs dents jaunies provenant de proies anonymes.",
    appearances: [
      appearance("Aliens vs. Predator: Requiem", 2007, "film", "screen-equipment-hybrid", AVPR),
    ],
    referencePage:
      "https://monsterlegacy.net/2025/11/08/hunter-aliens-vs-predator-requiem-wolf/",
    guardrail: "Hybride trophée-équipement; aucune espèce source pour les dents.",
  }),
  createEntry({
    id: "franchise-predators-archaic-hominin-skull",
    name: "Crâne d'homininé archaïque",
    visualAnchor:
      "Crâne humanoïde robuste au front bas et aux arcades épaisses, trouvé dans le camp du Game Preserve.",
    appearances: [
      appearance("Predators", 2010, "film", "screen-trophy", PREDATORS),
    ],
    referencePage:
      "https://www.comingsoon.net/movies/news/543097-predators-set-visit-part-3-build-a-jungle-in-texas-in-the-winter",
    confidence: "medium",
    guardrail: "Neanderthal-like est visuel uniquement; ne pas confirmer une espèce.",
  }),
  createEntry({
    id: "franchise-predators-camp-xenomorph-skull",
    name: "Crâne de Xénomorphe du camp",
    visualAnchor:
      "Crâne biomécanique allongé brièvement visible parmi les ossements du camp des Super Predators.",
    appearances: [
      appearance("Predators", 2010, "film", "screen-trophy", PREDATORS),
    ],
    referencePage:
      "https://www.avpgalaxy.net/website/interviews/joseph-pepe/",
    confidence: "medium",
    guardrail: "Le distinguer de la mâchoire osseuse portée sur le masque de Berserker.",
  }),
  createEntry({
    id: "franchise-predators-camp-anonymous-collection",
    name: "Collection anonyme du camp des Super Predators",
    visualAnchor:
      "Petit ensemble de crânes animaux et extraterrestres polis, certains avec vertèbres, présentés sur souches et pieux.",
    appearances: [
      appearance("Predators", 2010, "film", "screen-trophy", PREDATORS),
    ],
    referencePage:
      "https://www.comingsoon.net/movies/news/543097-predators-set-visit-part-3-build-a-jungle-in-texas-in-the-winter",
    composition: "small-set",
    guardrail: "Human, animal, perhaps dinosaur ne doit produire aucune taxonomie inventée.",
  }),
  createEntry({
    id: "franchise-prey-wolf-trophy",
    name: "Trophée du loup du Feral Predator",
    visualAnchor:
      "Crâne de loup nettoyé avec sa colonne, même prise que la tête fraîche montrée plus tôt dans Prey.",
    appearances: [
      appearance("Prey", 2022, "film", "screen-trophy", PREY),
    ],
    referencePage:
      "https://store.necaonline.com/products/prey-ultimate-camo-reveal-feral-predator-scale-action-figure-2024-con-exclusive",
    guardrail: "Une seule prise avec deux états; l'archive sans gore représente l'état nettoyé.",
  }),
  createEntry({
    id: "franchise-holiday-easter-basket",
    name: "Panier-trophée du Lapin de Pâques",
    visualAnchor:
      "Panier tressé rempli d'œufs colorés, dont un œuf s'ouvre comme un œuf de Xénomorphe.",
    appearances: [
      appearance("The Predator Holiday Special", 2018, "animation", "screen-trophy", "https://www.youtube.com/watch?v=rVrRjt69lhU"),
    ],
    guardrail: "Court promotionnel comique; ne pas l'intégrer à la continuité principale.",
  }),
  createEntry({
    id: "franchise-kok-warlord-yautja-skull-mask",
    name: "Masque en crâne de Yautja du Warlord",
    visualAnchor:
      "Crâne complet d'un Predator anonyme porté frontalement comme masque par le Grendel King.",
    appearances: [
      appearance("Predator: Killer of Killers", 2025, "animation", "screen-equipment-hybrid", KILLER_OF_KILLERS),
    ],
    referencePage:
      "https://www.fangoria.com/predator-killer-of-killers-director-interview/",
    guardrail: "Another Predator skull est confirmé; ne pas identifier la victime.",
  }),
  createEntry({
    id: "franchise-kok-warlord-bone-cape",
    name: "Cape-trophée en ossements du Warlord",
    visualAnchor:
      "Long manteau composé de côtes, vertèbres et appendices osseux de créatures conquises.",
    appearances: [
      appearance("Predator: Killer of Killers", 2025, "animation", "screen-equipment-hybrid", KILLER_OF_KILLERS),
    ],
    referencePage:
      "https://www.gamesradar.com/entertainment/sci-fi-movies/predator-killer-of-killers-clears-up-jaw-dropping-ending-and-fan-theories-of-an-alien-presence/",
    guardrail: "Origines volontairement ouvertes; jamais queues de Xénomorphe ou Reine.",
  }),
  ...[
    ["01-flat-tusked", "Crâne anonyme plat à défenses", "Tête large et basse, orbites latérales et deux défenses montant au-dessus de la bouche.", "Morphologie uniquement."],
    ["02-long-dome-humanoid", "Grand crâne humanoïde à dôme allongé", "Très grande boîte crânienne verticale et visage humanoïde réduit.", "Ne pas l'appeler Engineer."],
    ["04-tubular-snout", "Crâne anonyme à museau tubulaire", "Cranium arrondi prolongé d'un museau vertical ou d'une trompe osseuse.", "Ne pas identifier comme Martien de War of the Worlds."],
    ["05-primate-like", "Crâne anonyme primatiforme massif", "Mâchoire très robuste, canines et boîte crânienne évoquant un grand primate.", "Gorilla-like seulement."],
    ["06-wedge-toothed", "Crâne anonyme cunéiforme à dents triangulaires", "Crâne en forme de coin avec gueule large bordée de dents triangulaires.", "Ni White Spike, ni River Ghost, ni Xénomorphe."],
    ["07-small-insectoid", "Petit crâne anonyme insectoïde", "Petite tête étroite avec grandes cavités latérales et mandibules fines.", "Mantid-like est descriptif uniquement."],
    ["08-harvester", "Crâne de Harvester d'Independence Day", "Cranium central fin et évasé correspondant au Harvester d'Independence Day.", "Seule identification cross-franchise du mur confirmée par Dan Trachtenberg."],
    ["09-punctured-humanoid", "Grand crâne humanoïde perforé", "Crâne humanoïde allongé avec importante perforation de la boîte crânienne.", "Ni Engineer, ni origine de la perforation inventée."],
    ["10-reptile-like", "Crâne anonyme reptiliforme à museau court", "Cranium bas, museau large et dentition crocodilienne.", "Crocodilian-like uniquement."],
    ["11-theropod-like", "Grand crâne dinosauriforme de type théropode", "Immense crâne à longue mâchoire dentée rappelant un grand théropode.", "Theropod-like; aucune taxonomie publiée."],
  ].map(([suffix, name, visualAnchor, guardrail]) =>
    createEntry({
      id: `franchise-badlands-wall-${suffix}`,
      name,
      visualAnchor,
      appearances: [
        appearance("Predator: Badlands", 2025, "film", "screen-trophy", BADLANDS),
      ],
      referencePage: BADLANDS_DESIGN,
      confidence: suffix === "08-harvester" || suffix === "11-theropod-like" ? "high" : "medium",
      guardrail,
    }),
  ),
  createEntry({
    id: "franchise-badlands-tessa-synthetic-head",
    name: "Tête synthétique de Tessa",
    visualAnchor:
      "Tête décapitée de synthétique avec éléments cervicaux mécaniques, présentée au chef de clan.",
    appearances: [
      appearance("Predator: Badlands", 2025, "film", "screen-acquisition", BADLANDS),
    ],
    guardrail: "Ni crâne humain, ni trophée Kalisk promis.",
  }),
  createEntry({
    id: "franchise-avp-jaguar-queen-skull",
    name: "Crâne crêté de la Reine Alien",
    visualAnchor:
      "Grande boîte crânienne à crête de Reine Alien revendiquée comme trophée final par le Predator.",
    appearances: [
      appearance("Alien vs Predator", 1994, "video-game", "campaign-trophy", "https://static.atariage.com/manual_html_page.php?SoftwareID=2538"),
    ],
    guardrail: "Jeu Jaguar licencié; ne pas fusionner avec une Reine de film.",
  }),
  createEntry({
    id: "franchise-avp2-trophy-counter-head-set",
    name: "Têtes du Trophy Counter d'AvP2",
    visualAnchor:
      "Petit ensemble représentatif d'une tête humaine, d'une tête Yautja et d'une tête de Xénomorphe décapitées pour le compteur.",
    appearances: [
      appearance("Aliens versus Predator 2", 2001, "video-game", "counter-object", "https://manuals.plus/m/80b7f8b338cc0a93dfd1de5b751b4d6e271e91eed31f934119d52710179952f2"),
    ],
    referencePage: "https://www.avpgalaxy.net/games/avp2/",
    composition: "small-set",
    guardrail: "Le compteur accepte des têtes; ne pas transformer chaque décapitation en collectible distinct.",
  }),
  createEntry({
    id: "franchise-avp2-primal-hunt-zeta-skull-set",
    name: "Ensemble de crânes du site Zeta",
    visualAnchor:
      "Trois crânes humains, deux crânes de Xénomorphes et une tête de Reine Alien présentés dans la salle du site Zeta.",
    appearances: [
      appearance("AvP2: Primal Hunt", 2002, "video-game", "environmental-trophy", "https://www.avpcentral.com/predator-trophy-rooms"),
    ],
    composition: "small-set",
    confidence: "medium",
    guardrail: "Source secondaire illustrée; conserver le compte sans inventer d'identités.",
  }),
  createEntry({
    id: "franchise-avp-extinction-honor-skull-set",
    name: "Crânes d'honneur d'AvP: Extinction",
    visualAnchor:
      "Petit ensemble de crânes humains, Xénomorphes, Reine Alien, Reine Predalien et L.C.'s Skull convertis en Honor Points.",
    appearances: [
      appearance("Aliens versus Predator: Extinction", 2003, "video-game", "resource-object", "https://gamingalexandria.com/ps2/Aliens%20Versus%20Predator%20Extinction/Aliens%20Versus%20Predator%20Extinction%20-%20Manual.pdf"),
    ],
    referencePage:
      "https://www.avpgalaxy.net/games/avp-extinction/",
    composition: "small-set",
    confidence: "medium",
    guardrail: "Les quantités communautaires sont exclues; seules les catégories de cibles restent.",
  }),
  createEntry({
    id: "franchise-concrete-jungle-human-boss-rack",
    name: "Rack des douze crânes de boss humains",
    visualAnchor:
      "Rack persistant des douze prises humaines nommées: Serviteur, trois Dead Men Enforcers, Mafia Enforcer, Viktor, quatre Monster Squad, Bruno Borgia et Hunter Borgia.",
    appearances: [
      appearance("Predator: Concrete Jungle", 2005, "video-game", "persistent-gallery", CONCRETE_JUNGLE),
    ],
    composition: "rack",
    confidence: "medium",
    guardrail: "Douze instances officielles, mais un rack composite évite douze faux designs de crâne humain.",
  }),
  createEntry({
    id: "franchise-concrete-jungle-yautja-skull-rack",
    name: "Rack des trois crânes Yautja altérés",
    visualAnchor:
      "Trois crânes Yautja correspondant à Swift Knife, Long Spear et Stone Heart, acquis par Skull Rip.",
    appearances: [
      appearance("Predator: Concrete Jungle", 2005, "video-game", "persistent-gallery", CONCRETE_JUNGLE),
    ],
    composition: "rack",
    confidence: "medium",
    guardrail: "Conserver les trois identités; ne pas ajouter d'autres victimes Yautja.",
  }),
  createEntry({
    id: "franchise-avp2010-trophy-belt",
    name: "Ceinture-trophée ancestrale",
    visualAnchor:
      "Collectible Predator Trophy Belt enroulé et ornementé, modèle répété quarante-cinq fois dans la campagne.",
    appearances: [
      appearance("Aliens vs. Predator", 2010, "video-game", "collectible", AVP_2010_MANUAL, "45 exemplaires d'un même design de collectible."),
    ],
    referencePage:
      "https://www.avpgalaxy.net/games/aliens-vs-predator-2010/",
    guardrail: "Une seule image de design, pas quarante-cinq variantes inventées.",
  }),
  ...[
    ["massacre-machete", "Massacre Machete", PHG_219],
    ["russian-pernach", "Russian Pernach", PHG_219],
    ["lorenas-amorcito", "Lorena’s Amorcito", PHG_219],
    ["broken-ancient-sword", "Broken Ancient Sword", PHG_223],
    ["indonesian-kris-dagger", "Indonesian Kris Dagger", PHG_223],
    ["gold-medal", "Gold Medal", PHG_223],
    ["unidentified-alien-skull", "Unidentified Alien Skull", PHG_223],
    ["prehistoric-mace", "Prehistoric Mace", PHG_THREE],
    ["prehistoric-knife", "Prehistoric Knife", PHG_THREE],
    ["alien-hunters-trophy", "Alien Hunter’s Trophy", PHG_THREE],
    ["african-dagger", "African Dagger", PHG_COMMUNITY],
    ["bobcat-skull", "Bobcat Skull", PHG_COMMUNITY],
    ["coyote-skull", "Coyote Skull", PHG_COMMUNITY],
    ["flintlock-pistol", "Flintlock Pistol", PHG_COMMUNITY],
    ["kopesh", "Kopesh", PHG_COMMUNITY],
    ["nunchuks", "Nunchuks", PHG_COMMUNITY],
    ["ottoman-dagger", "Ottoman Dagger", PHG_COMMUNITY],
    ["samurai-sword", "Samurai Sword", PHG_COMMUNITY],
    ["spartan-spear", "Spartan Spear", PHG_COMMUNITY],
    ["tomahawk", "Tomahawk", PHG_COMMUNITY],
    ["viking-axe", "Viking Axe", PHG_COMMUNITY],
    ["warhammer", "Warhammer", PHG_COMMUNITY],
    ["western-revolver", "Western Revolver", PHG_COMMUNITY],
    ["wolf-skull", "Wolf Skull", PHG_COMMUNITY],
  ].map(([suffix, name, sourcePage], index) =>
    createEntry({
      id: `franchise-phg-${suffix}`,
      name,
      visualAnchor: `Cosmétique de trophée “${name}” porté à la ceinture du Predator dans Hunting Grounds.`,
      appearances: [
        appearance(
          "Predator: Hunting Grounds",
          2020,
          "video-game",
          index < 10 ? "official-cosmetic" : "community-documented-cosmetic",
          sourcePage,
        ),
      ],
      referencePage: PHG_COMMUNITY,
      confidence: index < 10 ? "high" : "medium",
      guardrail:
        index < 10
          ? "Nom confirmé par patch ou annonce IllFonic."
          : "Présence documentée visuellement par la communauté sur le forum officiel; ne pas surclasser en annonce IllFonic.",
    }),
  ),
  createEntry({
    id: "franchise-comic-big-game-cowboy-skull",
    name: "Crâne humain au chapeau de cow-boy et lunettes",
    visualAnchor:
      "Crâne humain coiffé d'un Stetson et de lunettes noires, présenté parmi des restes, cages thoraciques et fusils.",
    appearances: [
      appearance("Predator: Big Game", 1991, "comic", "licensed-expanded-continuity", "https://www.marvel.com/comics/issue/92869/predator_the_original_years_omnibus_vol_1_hardcover"),
    ],
    referencePage: "https://www.avpcentral.com/predator-trophy-rooms",
    guardrail: "Victime non identifiée; ne pas inventer de cow-boy nommé.",
  }),
  createEntry({
    id: "franchise-comic-primal-antler-display",
    name: "Présentoir de grandes ramures",
    visualAnchor:
      "Ramures ou bois de grande taille dressés comme une prise rituelle, silhouette unique du corpus Primal.",
    appearances: [
      appearance("Predator: Primal", 1997, "comic", "licensed-expanded-continuity", "https://www.marvel.com/comics/collection/92871/predator_the_original_years_omnibus_vol_2_hardcover"),
    ],
    referencePage: "https://www.avpcentral.com/predator-trophy-rooms",
    guardrail: "Espèce du cervidé inconnue; ramures descriptives uniquement.",
  }),
  createEntry({
    id: "franchise-comic-primal-human-skull-throne",
    name: "Siège rituel garni de crânes humains",
    visualAnchor:
      "Fauteuil ou trône construit et décoré de plusieurs crânes humains dans Predator: Primal.",
    appearances: [
      appearance("Predator: Primal", 1997, "comic", "licensed-expanded-continuity", "https://www.marvel.com/comics/collection/92871/predator_the_original_years_omnibus_vol_2_hardcover"),
    ],
    referencePage: "https://www.avpcentral.com/predator-trophy-rooms",
    composition: "environmental-display",
    guardrail: "Décor rituel, pas trophée portable.",
  }),
  createEntry({
    id: "franchise-comic-big-mama-xeno-queen-skull",
    name: "Crâne de Reine Xénomorphe de Big Mama",
    visualAnchor:
      "Grand crâne allongé de Reine Xénomorphe au centre du display de Big Mama.",
    appearances: [
      appearance("Aliens vs Predator: Deadliest of the Species", 1993, "comic", "licensed-expanded-continuity", "https://digital.darkhorse.com/pages/66/aliens-predator-prometheus-avp"),
    ],
    referencePage: "https://www.avpcentral.com/predator-trophy-rooms",
    guardrail: "Les easter eggs de super-héros voisins ne deviennent jamais des kills canons.",
  }),
  createEntry({
    id: "franchise-comic-big-mama-xeno-warrior-skull-pair",
    name: "Paire de crânes de guerriers Xénomorphes de Big Mama",
    visualAnchor:
      "Deux crânes de guerriers Xénomorphes plus petits encadrant le grand crâne de Reine.",
    appearances: [
      appearance("Aliens vs Predator: Deadliest of the Species", 1993, "comic", "licensed-expanded-continuity", "https://digital.darkhorse.com/pages/66/aliens-predator-prometheus-avp"),
    ],
    referencePage: "https://www.avpcentral.com/predator-trophy-rooms",
    composition: "paired-set",
    guardrail: "Paire liée au même display; ne pas ajouter d'autres castes.",
  }),
  createEntry({
    id: "franchise-comic-ahab-engineer-skull",
    name: "Trophée crânien d'Engineer d'Ahab",
    visualAnchor:
      "Crâne humanoïde pâle et massif d'Engineer transporté comme trophée par Ahab.",
    appearances: [
      appearance("Predator: Fire and Stone", 2014, "comic", "licensed-expanded-continuity", "https://digital.darkhorse.com/books/29071bbe51d54a0e915d88c04668669c/aliens-predator-prometheus-avp-the-complete-life-and-death-hc"),
      appearance("NECA Ultimate Ahab", 2017, "merchandise", "licensed-accessory", "https://necaonline.com/2017/05/predator-7-scale-action-figure-ultimate-ahab-predator/"),
    ],
    referencePage:
      "https://necaonline.com/2017/05/predator-7-scale-action-figure-ultimate-ahab-predator/",
    guardrail: "NECA confirme Engineer skull trophy; ne pas ajouter de colonne si la référence ne la montre pas.",
  }),
  createEntry({
    id: "franchise-comic-marvel-2022-exotic-skull-wall",
    name: "Mur de huit crânes extraterrestres inconnus",
    visualAnchor:
      "Au moins huit crânes aux silhouettes distinctes sur le mur de Predator (Marvel) #1, dont un cornu et un évoquant un crabe.",
    appearances: [
      appearance("Predator (Marvel) #1", 2022, "comic", "current-licensed-comic-continuity", "https://www.marvel.com/comics/issue/89617/predator"),
    ],
    referencePage: "https://www.avpcentral.com/predator-trophy-rooms",
    composition: "wall-set",
    guardrail: "Toutes les espèces restent unknown; aucune ressemblance ne devient taxonomie.",
  }),
  createEntry({
    id: "franchise-comic-nemesis-skulls-scimitar",
    name: "Mur de crânes humains et cimeterre capturé",
    visualAnchor:
      "Environ douze crânes humains avec armes ennemies; le cimeterre capturé est la silhouette la plus distinctive.",
    appearances: [
      appearance("Predator: Nemesis", 1997, "comic", "licensed-expanded-continuity", "https://www.marvel.com/comics/collection/92871/predator_the_original_years_omnibus_vol_2_hardcover"),
    ],
    referencePage: "https://www.avpcentral.com/predator-trophy-rooms",
    composition: "wall-set",
    confidence: "medium",
    guardrail: "Cimeterre d'un vaincu; aucune culture ni identité de victime inventée.",
  }),
  createEntry({
    id: "franchise-comic-hunters-ii-afghan-cave",
    name: "Caverne de trophées et armes d'Afghanistan",
    visualAnchor:
      "Décor de Hunters II combinant crânes et armes capturées, dont AK, bazookas et motos.",
    appearances: [
      appearance("Predator: Hunters II", 2018, "comic", "licensed-expanded-continuity", "https://www.marvel.com/comics/collection/92871/predator_the_original_years_omnibus_vol_2_hardcover"),
    ],
    referencePage: "https://www.avpcentral.com/predator-trophy-rooms",
    composition: "environmental-display",
    guardrail: "Armes et véhicules sont le contexte des victimes, pas des espèces de trophées.",
  }),
  createEntry({
    id: "franchise-comic-hunters-iii-belize-cave",
    name: "Caverne trophée sous-marine du Belize",
    visualAnchor:
      "Grotte immergée avec crânes humains, fusils AK et paquets du cartel dans Hunters III.",
    appearances: [
      appearance("Predator: Hunters III", 2020, "comic", "licensed-expanded-continuity", "https://www.marvel.com/comics/collection/92871/predator_the_original_years_omnibus_vol_2_hardcover"),
    ],
    referencePage: "https://www.avpcentral.com/predator-trophy-rooms",
    composition: "environmental-display",
    guardrail: "Drogue et armes sont du contexte, pas des identités de trophées.",
  }),
  createEntry({
    id: "franchise-comic-eternal-human-yautja-head-display",
    name: "Présentoir humain de têtes Yautja sectionnées",
    visualAnchor:
      "Plusieurs têtes Yautja et équipements Predator exposés dans la collection de Gideon Suhn Lee.",
    appearances: [
      appearance("Aliens vs Predator: Eternal", 1998, "comic", "licensed-expanded-continuity-human-owned", "https://digital.darkhorse.com/pages/66/aliens-predator-prometheus-avp"),
    ],
    referencePage: "https://www.avpcentral.com/predator-trophy-rooms",
    composition: "small-set",
    guardrail: "Collectionneur humain; ne jamais les présenter comme prises portées par un Yautja.",
  }),
  createEntry({
    id: "franchise-crossover-tarzan-tyrannosaur-skull",
    name: "Crâne de tyrannosaure fraîchement extrait",
    visualAnchor:
      "Immense crâne de tyrannosaure retiré de la carcasse après une chasse dans At the Earth's Core.",
    appearances: [
      appearance("Tarzan vs Predator: At the Earth's Core", 1996, "licensed-crossover", "screen-acquisition-noncanon", "https://www.comics.org/issue/654766/?issue_detail=2"),
    ],
    referencePage: "https://www.avpcentral.com/predators-hunting-dinosaurs",
    guardrail: "Extraction vue; conservation ultérieure non prouvée et crossover hors continuité principale.",
  }),
  createEntry({
    id: "franchise-crossover-dredd-helmeted-head-spine",
    name: "Tête de Judge casquée avec colonne",
    visualAnchor:
      "Tête humaine encore coiffée d'un casque de Judge, rachis complet attaché.",
    appearances: [
      appearance("Predator vs Judge Dredd", 1997, "licensed-crossover", "screen-trophy-noncanon", "https://www.comics.org/issue/712918/"),
    ],
    referencePage:
      "https://midlifegamergeek.com/2020/08/19/comic-book-review-predator-vs-judge-dredd-1997/",
    guardrail: "Ne pas ajouter insigne, nom ou identité sans la planche source.",
  }),
  createEntry({
    id: "franchise-crossover-avp-terminator-xeno-pillars",
    name: "Piliers de têtes et cages thoraciques Xénomorphes",
    visualAnchor:
      "Têtes de Xénomorphes avec cages thoraciques attachées, fixées verticalement comme architecture.",
    appearances: [
      appearance("Aliens vs Predator vs The Terminator", 2000, "licensed-crossover", "environmental-trophy-noncanon", "https://digital.darkhorse.com/pages/66/aliens-predator-prometheus-avp"),
    ],
    referencePage: "https://www.avpcentral.com/predator-trophy-rooms",
    composition: "environmental-display",
    guardrail: "Display architectural; ne pas réduire à un crâne isolé.",
  }),
  createEntry({
    id: "franchise-crossover-splice-dice-pale-xeno-skull",
    name: "Crâne Xénomorphe pâle de laboratoire",
    visualAnchor:
      "Crâne très clair prélevé dans la collection du vaisseau et utilisé comme source ADN.",
    appearances: [
      appearance("Predator vs Judge Dredd vs Aliens: Splice and Dice", 2016, "licensed-crossover", "screen-trophy-noncanon", "https://digital.darkhorse.com/series/755/predator-vs-judge-dredd-vs-aliens"),
    ],
    referencePage: "https://www.avpcentral.com/predator-trophy-rooms",
    guardrail: "Pâleur visuelle confirmée; aucune caste inventée.",
  }),
  createEntry({
    id: "franchise-crossover-magnus-xo-helmet",
    name: "Casque X-O Manowar de la collection",
    visualAnchor:
      "Casque technologique X-O décrit comme le trophée le plus prisé puis volé au Predator.",
    appearances: [
      appearance("Predator versus Magnus, Robot Fighter", 1992, "licensed-crossover", "screen-trophy-noncanon", "https://avp.fandom.com/wiki/Predator_versus_Magnus%2C_Robot_Fighter"),
    ],
    referencePage: "https://www.avpcentral.com/predator-trophy-rooms",
    guardrail: "Objet Valiant; ne pas prétendre que X-O Manowar a été tué.",
  }),
  createEntry({
    id: "franchise-crossover-wolverine-bear-skull-mask",
    name: "Masque improvisé en crâne d'ours",
    visualAnchor:
      "Crâne de l'ours tué en Alaska, porté ensuite comme masque par le Predator.",
    appearances: [
      appearance("Predator vs Wolverine", 2023, "licensed-crossover", "screen-equipment-hybrid-noncanon", "https://www.marvel.com/articles/comics/predator-vs-wolverine"),
    ],
    confidence: "medium",
    guardrail: "Espèce d'ours non fixée; vérifier la planche et ne pas le confondre avec un biomask manufacturé.",
  }),
  createEntry({
    id: "franchise-crossover-spiderman-skinner-throne",
    name: "Trône de Skinner en os, crânes et peaux",
    visualAnchor:
      "Siège fait d'os et de crânes, couvert de peaux humaines tendues, avec ornements osseux suspendus.",
    appearances: [
      appearance("Predator vs Spider-Man", 2025, "licensed-crossover", "environmental-trophy-noncanon", "https://www.marvel.com/articles/comics/predator-vs-spider-man-1-variant-covers"),
    ],
    referencePage: "https://www.avpcentral.com/predator-trophy-rooms",
    composition: "environmental-display",
    guardrail: "Skinner est un rogue; décor horrifique non représentatif du code Yautja.",
  }),
  createEntry({
    id: "franchise-crossover-black-panther-vibranium-spear",
    name: "Lance-trophée à pointe de vibranium",
    visualAnchor:
      "Lance terrestre capturée avec pointe en vibranium, présentée comme prise prisée au roi.",
    appearances: [
      appearance("Predator vs Black Panther", 2024, "licensed-crossover", "captured-weapon-noncanon", "https://www.marvel.com/articles/comics/predator-vs-black-panther-first-look-preview-covers"),
    ],
    guardrail: "Arme capturée, pas technologie Yautja native ni lance personnelle de Black Panther sans preuve.",
  }),
  createEntry({
    id: "franchise-crossover-pkmu-kraven-head-spear",
    name: "Tête de Kraven empalée sur une lance",
    visualAnchor:
      "Tête humaine de Kraven brandie au bout d'une lance par Predator X dans la conclusion.",
    appearances: [
      appearance("Predator Kills the Marvel Universe", 2025, "licensed-crossover", "screen-acquisition-noncanon", "https://www.marvel.com/articles/comics/predator-kills-the-marvel-universe-launches-an-all-out-invasion-deadliest-hunters"),
    ],
    guardrail: "Cicatrices et coiffure uniquement d'après la planche; aucun portrait d'acteur.",
  }),
  createEntry({
    id: "franchise-crossover-pkmu-kraven-relic-room",
    name: "Salle de reliques de héros de Kraven",
    visualAnchor:
      "Display de Kraven avec crâne vert massif, arc, gauntlets, uniforme, bouclier endommagé, bras extensible, blasters et tête végétale.",
    appearances: [
      appearance("Predator Kills the Marvel Universe", 2025, "licensed-crossover", "environmental-trophy-human-owned-noncanon", "https://www.marvel.com/articles/comics/predator-kills-the-marvel-universe-launches-an-all-out-invasion-deadliest-hunters"),
    ],
    composition: "environmental-display",
    confidence: "medium",
    guardrail: "Collection de Kraven, pas prises Yautja; aucun logo ni objet absent ajouté.",
  }),
  createEntry({
    id: "franchise-crossover-batman-ritual-suicide-blade",
    name: "Lame rituelle remise à Batman",
    visualAnchor:
      "Arme de suicide du Predator vaincu, remise à Batman par les Yautja comme marque d'honneur.",
    appearances: [
      appearance("Batman versus Predator", 1991, "licensed-crossover", "honorific-gift-human-owned-noncanon", "https://www.dc.com/graphic-novels/dc-comics/dark-horse-comics-batman-vs-predator"),
    ],
    referencePage:
      "https://www.avpcentral.com/batman-vs-predator-encounters",
    guardrail: "Cadeau honorifique; ni reste anatomique ni preuve d'une mise en vitrine.",
  }),
  createEntry({
    id: "franchise-merch-shaman-hatcheted-skull",
    name: "Crâne humain fendu par une hache",
    visualAnchor:
      "Crâne humain présentant un impact de hache et le fer distinctif fourni avec Ultimate Shaman.",
    appearances: [
      appearance("NECA Ultimate Shaman", 2022, "merchandise", "licensed-merchandise-only", "https://necaonline.com/2022/02/predator-7-scale-action-figure-ultimate-shaman/"),
    ],
    guardrail: "Accessoire NECA; ne pas dire qu'il est visible dans Predator 2.",
  }),
  createEntry({
    id: "franchise-merch-golden-angel-trophy-necklace",
    name: "Collier-trophée du Golden Angel",
    visualAnchor:
      "Collier de trophées osseux ou dentaires fourni à la figurine Ultimate Elder 1718.",
    appearances: [
      appearance("NECA Ultimate Elder: The Golden Angel", 2018, "merchandise", "licensed-merchandise-only", "https://necaonline.com/2018/02/predator-2-7-scale-action-figure-ultimate-elder-the-golden-angel/"),
    ],
    confidence: "medium",
    guardrail: "NECA ne nomme pas les os ou dents; aucune espèce inventée.",
  }),
  createEntry({
    id: "franchise-merch-bad-blood-trophy-heads",
    name: "Têtes-trophées du Bad Blood NECA",
    visualAnchor:
      "Petit ensemble des trophy heads fournies avec la figurine Bad Blood basée sur le comic Dark Horse.",
    appearances: [
      appearance("NECA Bad Blood", 2014, "merchandise", "licensed-merchandise-only-comic-derived", "https://necaonline.com/2014/08/closer-look-predator-bad-blood-deluxe-7-scale-action-figure/"),
    ],
    composition: "small-set",
    confidence: "medium",
    guardrail: "Les identités et espèces ne sont pas nommées; aucune taxonomie.",
  }),
];

const censusOnlyEntries = [
  {
    id: "census-predator-hawkins-processing-concept",
    name: "Chambre de préparation du trophée de Hawkins",
    works: ["Predator"],
    status: "production-concept-only",
    reason: "Scène de scénario non filmée; recensée mais pas ajoutée aux trophées vus à l'écran.",
    sources: ["https://assets.scriptslug.com/live/pdf/scripts/predator-1987.pdf"],
  },
  {
    id: "census-avpr-wolf-skull-mask-concept",
    name: "Concept de masque de Wolf façonné dans un crâne",
    works: ["Aliens vs. Predator: Requiem"],
    status: "production-concept-only",
    reason: "Exploration non retenue, distincte du masque final.",
    sources: ["https://monsterlegacy.net/2025/11/08/hunter-aliens-vs-predator-requiem-wolf/"],
  },
  {
    id: "census-kok-living-captives",
    name: "Captifs cryogéniques de Killer of Killers",
    works: ["Predator: Killer of Killers"],
    status: "living-captive",
    reason: "Guerriers vivants conservés pour l'arène, pas trophées physiques morts.",
    sources: [KILLER_OF_KILLERS],
  },
  {
    id: "census-avp-classic-trophy-kill",
    name: "Prélèvement post-mortem d'AvP Classic 2000",
    works: ["Aliens versus Predator Classic 2000"],
    status: "mechanic-only",
    reason: "Action sans inventaire persistant certifié.",
    sources: ["https://cdn.akamai.steamstatic.com/steam/apps/3730/manuals/Aliens%20Versus%20Predator%20Classic%202000%20Manual.pdf"],
  },
  {
    id: "census-avp2010-trophy-kill",
    name: "Trophy Kill d'AvP 2010",
    works: ["Aliens vs. Predator"],
    status: "mechanic-only",
    reason: "Exécution; les Trophy Belts sont le seul collectible physique séparé.",
    sources: [AVP_2010_MANUAL],
  },
  {
    id: "census-predator-vr-claims",
    name: "Claims de Predator VR",
    works: ["Predator VR"],
    status: "mechanic-only",
    reason: "Arrachage récompensé, sans collection persistante vérifiée.",
    sources: ["https://store.steampowered.com/app/755640/Predator_VR/"],
  },
  {
    id: "census-platform-achievements",
    name: "Succès et trophées de plateforme",
    works: ["Aliens vs. Predator", "Predator: Hunting Grounds"],
    status: "platform-achievement",
    reason: "Compteurs et récompenses de plateforme, jamais nouveaux objets physiques.",
    sources: [
      "https://steamcommunity.com/stats/AliensvsPredator/achievements/",
      "https://store.epicgames.com/achievements/predator-hunting-grounds?lang=en-US",
    ],
  },
  {
    id: "census-field-remains-and-functional-bone-gear",
    name: "Restes abandonnés et équipement osseux fonctionnel",
    works: ["Predator", "Predators", "Prey", "The Predator", "Predator: Badlands"],
    status: "excluded-non-trophy",
    reason: "Corps écorchés, colonne de serpent, armure Bone Bison et armes osseuses sans conservation comme trophée.",
    sources: [PREDATOR, PREDATORS, PREY, BADLANDS],
  },
  {
    id: "census-prose-psychopomp-abattoir",
    name: "Abattoir transformé en salle de trophées",
    works: ["Last Report from the KSS Psychopomp", "Predator: If It Bleeds"],
    status: "licensed-prose-textual-only",
    reason:
      "Événement physique décrit, mais aucune silhouette visuelle officielle fixe; une image ne pourrait pas être qualifiée de reproduction fidèle.",
    sources: [
      "https://titanbooks.com/9198-predator-if-it-bleeds/",
      "https://www.audible.com/pd/Predator-If-It-Bleeds-Audiobook/B0786XLW5W",
    ],
  },
  {
    id: "census-tabletop-prodos-trophy-token",
    name: "Trophy Token générique Prodos AVP 2.0",
    works: ["Alien vs Predator: The Hunt Begins 2.0"],
    status: "mechanic-without-diegetic-design",
    reason:
      "La règle convertit un modèle tué au corps-à-corps en jeton; aucun crâne ou objet anatomique précis n'est défini.",
    sources: [
      "https://avp.prodosgames.com/sites/avp.prodosgames.com/files/files/avp_english_rulebook_2_0.pdf",
    ],
  },
  {
    id: "census-tabletop-legendary-trophy-room-zone",
    name: "Zone Trophy Room de Legendary Encounters",
    works: ["Legendary Encounters: A Predator Deck Building Game"],
    status: "mechanic-without-diegetic-design",
    reason:
      "Zone et mécanique de deck-building, pas nouvelle salle physique canon ni objet-trophée distinct.",
    sources: [
      "https://upperdeckstore.com/legendary-encounters-a-predator-deck-building-game.html",
    ],
  },
  {
    id: "census-crossover-unacquired-or-attempted-trophies",
    name: "Trophées désirés, tentés ou impossibles des crossovers",
    works: [
      "Predator vs Wolverine",
      "Predator Kills the Marvel Universe",
      "Predator versus Magnus, Robot Fighter",
    ],
    status: "excluded-not-acquired",
    reason:
      "Squelette d'adamantium, Mjolnir, tenue/tête de Spider-Man et anneau refusé n'ont pas été acquis comme prises.",
    sources: [
      "https://www.marvel.com/comics/guides/2516/predator_vs_the_marvel_universe",
    ],
  },
  {
    id: "census-deadliest-species-superhero-easter-eggs",
    name: "Easter eggs de crânes de super-héros",
    works: ["Aliens vs Predator: Deadliest of the Species"],
    status: "excluded-easter-egg",
    reason:
      "Ressemblances à Batman, Cyclops, Magneto ou Wolverine; jamais espèces ni kills canons.",
    sources: ["https://digital.darkhorse.com/pages/66/aliens-predator-prometheus-avp"],
  },
  {
    id: "census-archie-dilton-head-spine",
    name: "Tête et colonne de Dilton",
    works: ["Archie vs Predator"],
    status: "licensed-crossover-generic-human-design",
    reason:
      "Prise réelle mais silhouette humaine générique déjà couverte par le design crâne-colonne; aucune image supplémentaire.",
    sources: ["https://digital.darkhorse.com/series/585/archie-vs-predator"],
  },
];

function promptFor(entry) {
  const appearanceCopy = entry.appearances
    .map(
      (item) =>
        `${item.work} (${item.year}, ${item.medium}, evidence status ${item.status})`,
    )
    .join("; ");

  return [
    "Create one original project-owned fan-art archive asset for the 2D game “Yautja: La Longue Chasse”.",
    `Official licensed-media source lock: ${appearanceCopy}.`,
    `Safe descriptive subject name: “${entry.name}”.`,
    `Exact visual anchor: ${entry.visualAnchor}`,
    `Composition contract: ${entry.composition}. Show the complete ${entry.composition === "single-object" ? "object" : "defined ensemble"} and no unrelated trophy.`,
    `Nomenclature guardrail: ${entry.guardrail || "Do not invent species, victim identities or canon links not established by the cited work."}`,
    "Use the supplied downloaded source reference only for identity, silhouette, count and franchise-specific construction. Reinterpret it as original fan-made pixel art; do not reproduce a movie still, screenshot, photograph, logo, actor likeness or official file.",
    "Use the supplied validated project trophy master only for crisp high-detail 32-bit pixel-art finish, isolated-object staging and material readability; never copy its species or silhouette.",
    "No character holding the object, no wall or room, no mounting plaque unless the visual anchor explicitly defines a rack, no gore, no fresh blood, no text, no letters, no numbers, no logo, no signature and no watermark.",
    "Center the complete trophy with generous safe padding and choose the side-three-quarter or frontal-three-quarter angle that best preserves the cited design.",
    "The background must be perfectly flat pure uniform #00ff00 chroma green from edge to edge, with absolutely no gradient, no floor, no scene, no cast shadow, no contact shadow and no green reflection or green spill on the object.",
  ].join(" ");
}

function localReferencePath(entry) {
  const lock = entry.referenceImageUrl ?? entry.referencePage;
  const hash = createHash("sha256").update(lock).digest("hex").slice(0, 12);
  return `tmp/franchise-trophy-references/source-${hash}.webp`;
}

async function pathExists(relativePath) {
  try {
    await access(path.join(root, relativePath));
    return true;
  } catch {
    return false;
  }
}

async function writeJson(relativePath, value) {
  const outputPath = path.join(root, relativePath);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

const entries = [];
for (const entry of physicalEntries) {
  const masterPath =
    entry.masterPath ??
    `art-source/v16/franchise-trophies/masters/${entry.id}-chroma.png`;
  const runtimePath =
    entry.runtimePath ??
    `public/game/assets/v16/franchise-trophies/${entry.id}.webp`;
  const [masterAvailable, runtimeAvailable] = await Promise.all([
    pathExists(masterPath),
    pathExists(runtimePath),
  ]);
  const available = masterAvailable && runtimeAvailable;

  entries.push({
    ...entry,
    masterPath,
    runtimePath,
    runtimeUrl: entry.runtimeUrl ?? `/${runtimePath.replace(/^public\//, "")}`,
    planned: true,
    available,
    consumers: ["franchise-archive"],
    inspection: {
      status: available ? "passed" : "planned",
      notes: available
        ? "Official-media identity lock and transparent runtime cutout available."
        : "Awaiting a distinct OpenAI ImageGen interpretation and transparent runtime cutout.",
    },
  });
}

assert.equal(new Set(entries.map((entry) => entry.id)).size, entries.length);
assert.equal(new Set(censusOnlyEntries.map((entry) => entry.id)).size, censusOnlyEntries.length);
assert.ok(entries.length >= 60, "franchise physical census unexpectedly small");

const prompts = entries
  .filter((entry) => entry.assetDecision === "create")
  .map((entry) => ({
    id: entry.id,
    recordType: "primary-prompt-source-locked",
    generator: "OpenAI ImageGen",
    modelMode: "builtin-imagegen",
    chromaKey: "#00ff00",
    sourcePage: entry.referencePage,
    referenceImageUrl: entry.referenceImageUrl,
    localReferencePath: localReferencePath(entry),
    styleReferencePath:
      "art-source/v14/hunter-kit/masters/trophy-xenomorph-skull-p2-chroma.png",
    outputPath: entry.masterPath,
    prompt: promptFor(entry),
  }));

await Promise.all([
  writeJson("art-source/v16/franchise-trophies/policy.json", {
    schemaVersion: 1,
    packId: "franchise-trophies-v16",
    packVersion: 16,
    scope: "Distinct physical trophy designs in officially released or licensed Predator/AVP media through 2026.",
    inclusionRule:
      "Screen objects, persistent physical game collectibles/galleries, named licensed cosmetics and clearly labelled licensed accessories.",
    exclusionRule:
      "Kills, claims, counters, honor mechanics, platform achievements, living captives and unretained field remains are census-only.",
    namingRule:
      "Unnamed species remain descriptive and anonymous; medium and continuity status are always visible.",
    sourcePolicy: {
      sourcePageRequired: true,
      visualAnchorRequired: true,
      downloadedReferenceTemporary: true,
      originalFanArtOnly: true,
    },
    consumerPolicy: {
      allowed: ["franchise-archive"],
      forbidden: [
        "enemy-bestiary-v7",
        "enemy-bestiary-v8",
        "trophy-wall",
        "hunter-rig",
        "hunt-canvas",
      ],
    },
    artifactPolicy: {
      generator: "OpenAI ImageGen",
      masterBackground: "#00ff00",
      runtimeAlphaRequired: true,
      promptStorage: "art-source-only",
    },
  }),
  writeJson("art-source/v16/franchise-trophies/media-census.json", {
    schemaVersion: 1,
    packId: "franchise-trophies-v16",
    generatedThrough: 2026,
    physicalEntries,
    censusOnlyEntries,
  }),
  writeJson("art-source/v16/franchise-trophies/source-specs.json", {
    schemaVersion: 1,
    packId: "franchise-trophies-v16",
    packVersion: 16,
    entries,
  }),
  (async () => {
    await mkdir(sourceRoot, { recursive: true });
    await writeFile(
      path.join(sourceRoot, "openai-franchise-trophy-prompts.jsonl"),
      `${prompts.map((entry) => JSON.stringify(entry)).join("\n")}\n`,
      "utf8",
    );
  })(),
]);

console.log(
  `Recensement franchise V16 reconstruit : ${entries.length} designs physiques, ${prompts.length} generations distinctes, ${censusOnlyEntries.length} exclusions documentees.`,
);
