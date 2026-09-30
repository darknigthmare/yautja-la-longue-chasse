# V57 — technique de marteau de Valkyrie

## Source et périmètre

Demande : `THE_PIT_BIBLE_COMBATTANTS_STAGES_V54.xlsx`, `02_PERSONNAGES!J14:S14`, `05_MOVES_PROPOSES!P14`, `14_VARIANTES!H14`.

La technique de marteau debout dispose de quatre dessins distincts par orientation : préparation, anticipation haute, impact et retour en garde. Les six clips orientés suivent les durées réelles du moteur : 28 ticks de préparation, 7 d'impact, 36 de récupération. La première partie de récupération maintient le dessin d'impact : elle ne compte pas comme un dessin supplémentaire.

L'apparence de référence est le sprite V31 déjà présent dans le jeu. Le lot ne certifie pas une reproduction 1:1 du modèle commercial. Les variantes utilisateur masquées ou démasquées ne reçoivent pas ces dessins : seule l'apparence V31 correspondante les utilise. Les 18 familles d'actions complètes du classeur restent à produire.

Référence officielle sur le marteau à deux mains : [présentation IllFonic sur PlayStation Blog](https://blog.playstation.com/2021/02/16/new-year-new-mode-new-content-for-predator-hunting-grounds/).

## Ressources et traçabilité

- Outil utilisé : génération d'images OpenAI intégrée, avec image de référence, sans script de génération API.
- Prompts exacts, premier essai rejeté et limites : `docs/v57-valkyrie-prompts.json`.
- PNG natifs : `public/game/sprites/v57/pit/valkyrie/hammer-right.png` et `hammer-left.png`.
- Dimensions, SHA256, rectangles et pivots : `app/game/data/pitValkyrieArtV57.json`.
- Préparation reproductible : `scripts/prepare-valkyrie-art-v57.mjs`, copie des octets natifs sans retouche ni redimensionnement.

Les quatre cellules n'ont pas des dimensions uniformes : les rectangles sont mesurés sur les sorties réellement produites. Le renderer ignore uniquement les pixels alpha 1/2 selon son contrat `noiseFloor:2`. Les PNG restent inchangés. Les deux orientations sont dessinées indépendamment ; aucune symétrie Canvas n'est appliquée à ces phases.

Le dernier dessin fournit aussi une garde fixe explicitement déclarée `heldPoseClips`. Le runtime et le laboratoire la présentent comme pose tenue, jamais comme cycle animé. Ce maintien conserve l'identité visuelle entre les phases couvertes ; les actions manquantes ne sont pas déclarées animées.

## Vérification

Les tests de production contrôlent les tailles, les SHA, les marges alpha, le cadrage, la propriété de l'apparence, les pivots au sol et les durées des phases. La recette `scripts/verify-valkyrie-v57.mjs` vérifie le laboratoire puis deux combats réels, Valkyrie à gauche et à droite, par entrées clavier ordinaires. Elle observe les quatre rectangles dessinés sans modifier le moteur et vérifie que les sauvegardes restent identiques.

Une revue indépendante a inspecté les huit poses natives dans le laboratoire : silhouette entière, anatomie sans défaut évident à cette échelle, prise à deux mains, équipement et appui arrière conservés. Le pied avant relevé pendant l'impact n'est pas un flottement global. Les premières captures de duel masquées par le menu pause ne valent pas preuve visuelle et ont conduit à corriger la recette. Les validations du build final et du site publié sont consignées dans le rapport global V57, distinctes de la revue des dessins.

La recette complète passe aussi sur la compilation Next.js locale, puis sur `https://yautja-la-longue-chasse.vercel.app` (dix groupes, deux vrais combats, aucune erreur console/JavaScript, stockage inchangé). Les deux captures publiques de duel sans menu pause ont été ouvertes et acceptées ; le pied d'appui reste sur le terrain et l'arme est entière des deux côtés. Preuves : `work-local/v57/qa/valkyrie-public/report.json` et `combat-visual-review.json`. Le contrôle HTTP indépendant confirme les SHA256 des deux PNG publics identiques aux sources acceptées.
