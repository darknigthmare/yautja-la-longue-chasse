# V69 — Les Seuils du Premier Sang

Chapitre jouable après la cohorte V68 et sa reconnaissance Young Blood. Il atteste une préparation et conserve le rang, les deux rites, l’arsenal, les inventaires, les anciennes branches et les statistiques de chasse. Seul le temps effectivement simulé est ajouté au temps joué.

## Sources et limite narrative

- `work/v36/new-world-specs/youth-thread-page-1.json`, turn 9 : préparation « Suivre sans être vu », puis « Les Trois » et « Le Temple des Trois Ombres », avec pyramide changeante, arsenal physique, humains distingués des xénomorphes et chasse qualifiante individuelle pour chacun.
- `work/v36/progression-art-specs/progression-source.md`, lignes 68, 84–87, 106, 138–141 : expéditions encadrées et formations avant autonomie ; une préparation ne remplace pas la vraie mission et le rite.

V69 utilise donc les terrains d’exercice du clan. Les sas sont des obstacles d’entraînement ; ils ne représentent ni la pyramide AVP ni le Temple futur. Pas de créature renommée pour figurer un xénomorphe. Pas de chasse au Quatza-Rij, marque d’initiation, plasma caster ou vaisseau personnel accordé. Ces appellations et règles appartiennent à l’adaptation du clan du jeu, pas à une hiérarchie universelle.

## Actions réellement jouées

1. Rencontre du vétéran et déplacement vers son poste d’observation ; lecture de deux demi-tours de patrouille en maintenant l’observation.
2. Vue du vétéran affichée, affleurements réels, marche discrète et trois relevés. Une alerte interrompt le relevé mais conserve les postes précédents.
3. Trois sas indépendants à fenêtres temporelles, commandes des deux côtés, affleurements à franchir. Une fermeture reste réessayable sans bloquer le joueur ; les sas validés restent ouverts pour le retour.
4. Départ réel d’un novice, commande d’attente près de la zone sûre, reconnaissance de l’autre rive pendant l’accalmie, retour physique pour le chercher, escorte jusqu’au refuge. Le dispositif interdit d’entrer pendant l’alerte active.
5. Retour à pied de plus de 10 500 unités de déplacement cumulé, rapport puis attestation distincte. Douze reçus strictement ordonnés.

La marche à couvert utilise une vitesse différente et les lignes de vue ; elle conserve les dessins natifs de marche existants. Aucun nouvel atlas de posture accroupie n’est annoncé. Le novice est un figurant original du camp, pas un personnage canon ni un remplacement de Saar/Vek.

## Contrat de raccordement

`SoloV69Campaign` : `version: 1`, `status: active | completed`, `checkpoint: SoloV69State`, `receipts: SoloV69Receipt[]`, `startedAt`, `completedAt`. Champ `soloV69` nul/absent avant le chapitre. `SoloV69Receipt.sourceId` = `solo.thresholds.v69`.

Fonctions dans `campaignSoloV69.ts` : `normalizeSoloV69Campaign`, `soloV69MatchesSave`, `canStartSoloV69`, `startSoloV69Campaign`, `withSoloV69Checkpoint`, `withSoloV69Progress`, `soloV69NeedsScene`.

Prérequis : vraie chaîne précédente validée par `soloV68MatchesSave`, V68 terminé, rang de chronique `young-blood`, exactement deux rites. Un trajet régional, un passage hors `at-city` ou une Réserve `active` interdit le lancement et ne peut coexister avec V69 actif. Une attestation terminée reste conservable pendant un trajet ultérieur. Aucun ancien normalizer de rang n’a besoin d’accepter un nouveau rite.

UI `FirstHuntSoloV69Props` : `checkpoint: unknown`, `bindings`, `externallyPaused?: boolean`, `reducedMotion?: boolean`, `persistenceError?: string | null`; `onCheckpoint(state): boolean`, `onProgress(receipts, state): Promise<boolean>`, `onReturnToCity(): Promise<boolean>`, `onExit(): void | Promise<void>`, `onOpenSettings?()`. Même discipline de propriétaire/reconciliation durable que V68. Toute progression s’arrête pendant l’écriture ; un refus garde l’argument exact dans la scène. Une pause, disparition des images ou perte de visibilité fige patrouille, fenêtres, escorte et gains. La reprise attend le relâchement des commandes.

`soloV69NeedsImmediateCheckpoint(prior, next)` déclenche une écriture au pas exact d’acquisition d’un poste, ouverture de sas, signal de suivi/attente ou reconnaissance de rive. La scène confirme ce pas avant toute autre simulation ; les déplacements ordinaires restent enregistrés toutes les 120 unités. Un refus efface les commandes et arrête le pas, sans changer l’argument ni détendre les validations de position. La recette locale initiale a révélé que la cadence périodique seule pouvait écrire après le départ du poste : ce cas est couvert par un parcours complet à la cadence réelle et quatre refus simulés aux frontières physiques.

Priorité de reprise : V69 actif avant V68 ; emplacement catalogue `youth-training`, qui doit reprendre V69 réellement actif. Lancement au vrai dialogue du mentor : `[data-solo-v69-enter]`. Après certification, accueil et journal décrivent la préparation en maintenant Young Blood. Le futur rite garde son verrou.

## Art et vérification

Réemploi bitmap existant : `YOUTH_ART_MANIFEST` V48/V49 pour dojo/camp, pierres et props indépendants ; atlas jeunesse/rival avec dessins distincts gauche/droite ; contact mesuré des pieds. Les barres de sas sont des modules de plateforme d’exercice. Cône, curseur de relevé et annonce de fermeture sont des indicateurs de jeu, pas des personnages CSS ni des armes inventées.

Tests : `tests/first-hunt-solo-v69.test.mjs`, `tests/campaign-solo-v69.test.mjs`, helper parcouru `tests/helpers/solo-v69-played-route.mjs`. Les tests parcourent les vrais modèles et refusent les preuves altérées, régressions et terminaisons sans positions cohérentes.

Recette navigateur : `V69_QA_URL=http://127.0.0.1:4187`, `V69_SOLO_QA_OUTPUT=work-local/v69/solo-browser`, puis `node scripts/verify-solo-v69.mjs`. Profil isolé avec fixture initiale uniquement après V68, tous chapitres précédents parcourus via leur vrai modèle ; puis mentor atteint à pied, clavier/tactile publics, quota, fermeture expirée, sauvegarde/quitter/recharger, pause réglages et retour durable. Ne pas affirmer QA navigateur réussie avant son rapport et inspection des captures. Aucun build simultané lancé par cet agent.
