import type { DevDestination } from "./destinations";
import { horizonSiteO6 } from "../game/systems/originHorizonsO6";

const terrace = horizonSiteO6("saar");

export type DevExercise = "mobility" | "warp" | "recognition" | "forge" | "rites" | "coop" | "temple";

export const DEV_EXERCISES: readonly DevDestination[] = [
  {
    id: "dev-vehicles", category: "exercises", kind: "exercise", exercise: "mobility",
    label: "Véhicules · formation et achat",
    description: "Le vrai garage des convois. Une réserve de 500 marques et un permis de test permettent de prendre le prêt ou d’acheter la moto du clan.",
    walkthrough: ["Essaie un prêt et rends le véhicule au sas.", "Achète la moto, prends une sortie et vérifie le compteur de distance ainsi que l’état au retour."],
  },
  {
    id: "dev-mounts", category: "exercises", kind: "exercise", exercise: "mobility",
    label: "Montures · épreuves et sortie",
    description: "La même écurie avec 500 marques, aucune monture et un rang Blooded de test.",
    walkthrough: ["Choisis Kha’Rha dans le registre, joue les trois épreuves et confirme l’adoption.", "Prépare la monture, puis chevauche jusqu’au sas et vérifie le lien et la fatigue."],
  },
  {
    id: "dev-warp", category: "exercises", kind: "exercise", exercise: "warp",
    label: "Warp · Fjord et forteresse W‑01",
    description: "Le module est préparé dans l’essai. La première reconnaissance et le second voyage utilisent les conditions et les commandes natives.",
    walkthrough: ["Engage W‑01, relève le fjord, puis utilise le retour réservé.", "Repars vers W‑01 et joue la forteresse des marées jusqu’au retour."],
  },
  {
    id: "dev-warp-w02", category: "exercises", kind: "exercise", exercise: "warp",
    label: "Warp · Japon W‑02",
    description: "Le module est préparé. La visite et les choix du Japon de 1629 restent à jouer.",
    walkthrough: ["Engage W‑02, franchis les seuils et essaie la cloche ou le détour.", "Compare la chasse après alerte et la visite discrète dans deux essais."],
  },
  {
    id: "dev-warp-tantalus", category: "exercises", kind: "exercise", exercise: "warp",
    label: "Warp · Tantalus 2204",
    description: "Le module est préparé pour éprouver le dossier Echo‑8 depuis l’interface réelle du Warp.",
    walkthrough: ["Sélectionne Tantalus, ouvre le dossier et prends une décision sur Echo‑8.", "Recommence pour comparer l’autre décision."],
  },
  {
    id: "dev-m015", category: "exercises", kind: "exercise", exercise: "recognition",
    label: "M015 · Reconnaissance Young Blood",
    description: "Le rapport commence devant le mentor avec les étapes antérieures préparées pour cet essai. La reconnaissance et MUS‑06 restent à jouer.",
    walkthrough: ["Active le son et fais ton rapport au mentor.", "Mets la reconnaissance en pause, reprends-la et termine le rite."],
  },
  {
    id: "dev-l06", category: "exercises", kind: "exercise", exercise: "rites",
    label: "L‑06 · Arène du vétéran et du chef",
    description: "Un historique de chasse préparé ouvre l’arène. Les trois épreuves et le mandat du Berceau sont à obtenir.",
    walkthrough: ["Rejoins chaque poste et valide ses signaux d’entraînement.", "Va voir le chef après les trois épreuves et ouvre le dossier du Berceau."],
  },
  {
    id: "dev-o6-terrace", category: "exercises", kind: "homeworld",
    label: "O6‑M28 · Terrasse et préparatifs",
    description: "Le profil O6 de test commence près de Saar avec les reçus précédents préparés. Aucun projet n’a été choisi.",
    levelId: terrace.levelId, point: terrace.point,
    walkthrough: ["Écoute Saar, parcours les trois postes et effectue leurs préparatifs.", "Compare les projets et confirme un choix. Recommence pour essayer un autre projet."],
  },
  {
    id: "dev-forge", category: "exercises", kind: "exercise", exercise: "forge",
    label: "Forge · Plasmacaster et Smart Disc",
    description: "Les deux armes sont équipées au niveau de départ. Des lots de matériaux issus du catalogue d’anatomie sont préparés pour les deux paliers.",
    walkthrough: ["Ouvre Réparations, choisis les lots d’os et de tissu pour une arme et confirme le palier.", "Vérifie le stock, répète au deuxième palier et essaye la seconde arme. Les autres onglets permettent d’essayer parures, marques et tenues."],
  },
  {
    id: "dev-coop-relief", category: "exercises", kind: "exercise", exercise: "coop",
    label: "Relève de balise · Trio",
    description: "Les trois postes, les neuf gestes et les refus passent par le panneau et le registre natifs, avec trois identités temporaires dans cet onglet.",
    walkthrough: ["Démarre comme hôte, puis change de poste à chaque signal.", "Essaie une voie erronée et une prise instable avant de franchir les trois passages. Pour les invitations entre onglets, utilise le salon Coopération du menu principal."],
  },
  {
    id: "dev-temple-triad", category: "exercises", kind: "exercise", exercise: "temple",
    label: "M017 · Temple des Trois Ombres",
    description: "La scène complète du Temple et sa triade, avec les commandes et les quinze salles de départ de cette version.",
    walkthrough: ["Rassemble la triade, lis les relais et teste les signaux, la Vanne et le porteur.", "Poursuis vers la Galerie, la Matriarche et le retour. Le bilan reste dans cet essai."],
  },
  {
    id: "dev-acheron-field", category: "exercises", kind: "mission", missionId: "ruins-ancient-guardian",
    label: "Achéron · Champ du Gardien",
    description: "Chasse native avec Plasmacaster et Smart Disc. Atteins le Gardien pour éprouver le rendu du champ et le son.",
    walkthrough: ["Repère la réfraction, le bleu du champ et les alertes de la combinaison.", "Essaie tirs standards, tirs chargés puis disque, en observant les changements du champ et les trois signaux."],
  },
  {
    id: "dev-mycora-canopy", category: "exercises", kind: "mission", missionId: "fungal-hivemind",
    label: "Mycora · Canopée chargée",
    description: "La chasse native et ses appuis de mycélium, avec l’outil de dépeçage disponible.",
    walkthrough: ["Prélève une partie après une vraie rencontre et relève le poids emporté.", "Grimpe sur le premier arbre, traverse l’appui de liane et redescends avec la charge. Suspends et reprends l’essai pour relire l’état."],
  },
  {
    id: "dev-kennel", category: "exercises", kind: "homeworld", levelId: "0", point: { x: 7450, y: 5520 },
    label: "Chenil · Adoption, soins et ordres",
    description: "Essai près des responsables du chenil avec des marques et un chien blessé pour tester les soins. L’essai peut se prolonger en chasse avec le compagnon choisi.",
    walkthrough: ["Parle au personnel du chenil. Adopte un pisteur ou soigne le chien blessé, puis choisis ton compagnon.", "Ouvre Chasser avec ce compagnon et teste les ordres, leurs refus et les commandes de terrain."],
  },
];
