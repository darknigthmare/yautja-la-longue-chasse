# V57 — observateurs des arènes 016 et 035

État final : recette complète réussie aussi sur la [version publique V57](https://yautja-la-longue-chasse.vercel.app), après la validation locale, avec 11 captures publiques réellement inspectées. La vérification publique est conservée séparément.

## Demande et périmètre

Source utilisateur : `THE_PIT_BIBLE_COMBATTANTS_STAGES_V54.xlsx`, SHA256 `32f2ee8e4fd801e7ca677a54862f2bd0123a2e78d12c015f64b50ab28184c380`.

| Source | Exigence couverte |
| --- | --- |
| `09_STAGES!A72:N72` et `A91:N91` | Terrasse des Jeunes Sangs, Fosse des Cent Masques |
| `10_VIE_DES_STAGES!E206`, `E263` | Observateurs anonymes du clan changeant lentement de posture |
| `10_VIE_DES_STAGES!G206:H206`, `G263:H263` | Attente, événement discret, retour au repos ; dessins distincts ; cadence de 12 à 25 secondes ; réactions de manche ; seed déterministe |
| `10_VIE_DES_STAGES!I206:K206`, `I263:K263` | Aucun danger de duel, cohérence du casting, pause et mouvement réduit |
| `16_REGLES!A33:E33`, `A35:E35` | Pas de personnage nommé dupliqué dans les gradins ; événements espacés sans réaction à chaque impact |

Les deux groupes existants sont anonymes. Aucune identité canonique, nouvelle espèce, allégeance ou biographie n'est ajoutée. La sélection d'un combattant ne transforme pas celui-ci en figurant. Le casting de Ryushi et ses anciennes boucles restent inchangés.

## Comportement

`pitArenaLifeEvents.ts` calcule la pose à partir de l'arène, de l'identifiant du groupe, de la manche et de son temps écoulé. Il ne reçoit aucun coup, dégât ou vainqueur et n'écrit aucun état de jeu.

- Début de manche : bref changement de posture, puis retour au repos.
- Pendant le duel : les six vrais dessins existants sont lus à leur cadence de 3 images par seconde, dans une courte séquence séparée par des attentes. Les départs des séquences sont espacés de 12 à 25 secondes, avec décalage entre les deux groupes.
- Fin de manche : une seule réaction sobre, puis retour au repos. Le résultat intermédiaire utilise les ticks de simulation. Le résultat final, dont la simulation est arrêtée, utilise le temps de présentation déjà existant et déjà suspendu par le menu, le chargement ou le masquage de la page.
- Mouvement réduit : dessin calme 0, y compris lors des résultats.
- Appuis : les pivots natifs par cellule, le miroir du groupe droit et le plan P3 sont conservés. Aucun déplacement d'une pose unique n'est présenté comme un nouveau dessin d'animation.

La source bitmap reste `/game/sprites/v54/pit-life/yautja-spectators.png`. Aucun PNG n'a été créé ou modifié pour ce lot.

## Vérification

- `tests/pit-arena-life-events-v57.test.mjs` : 8 tests réussis, dont cadence bornée, déterminisme/retour en arrière, résultat unique, pause, mouvement réduit, cellules sources, appuis et absence de modification des données sérialisées.
- Régression `tests/pit-character-stages-v54.test.mjs` : 11 tests réussis.
- ESLint ciblé sur les trois modules modifiés : réussi.
- Recette réelle : `scripts/verify-pit-arena-life-v57.mjs`, paramétrable via `V57_LIFE_QA_URL`, `V57_LIFE_QA_VERSION` et `V57_LIFE_QA_OUTPUT`. Elle sélectionne les deux arènes dans l'interface, observe les cellules PNG réellement dessinées, attend leur cadence réelle, termine des manches par les commandes de jeu, vérifie pause et résultat final, ainsi qu'un duel mobile simulé et le mouvement réduit.
- Recette dev réussie sur `http://localhost:4176`, avec les sources V57 et le libellé de build encore V56 : `work-local/v57/qa/arena-life-dev-localhost/report.json`. Deux duels réels, trois KO, pause au geste et au résultat final, six cellules natives observées sur chaque arène ; mouvement réduit limité à la cellule 0. Aucun échec HTTP ni erreur JavaScript ; toutes les données locales restent identiques.
- Les 11 captures dev ont été réellement inspectées et acceptées : `work-local/v57/qa/arena-life-dev-localhost/visual-review.json`. Les appuis mesurés présentent un écart maximal de 0,0123 pixel logique, expliqué par l'arrondi des valeurs de caméra exposées. Les groupes restent derrière le duel ; l'écran mobile simulé mesure 844 × 390 pixels.
- Première tentative dev bloquée par le démarrage du serveur (`ERR_CONNECTION_REFUSED`) : conservée dans `work-local/v57/qa/arena-life-dev/failure.json`. La seconde cible `localhost` fonctionne. Cette preuve dev ne vaut pas validation d'un build publié.
- Première recette du build de production V57 sur le port 4177 : échec réel au lancement du duel, avant l'introduction, avec affichage de l'écran de récupération. Le rapport et la capture restent dans `work-local/v57/qa/arena-life-production/`. Le même défaut a été reproduit par les autres recettes de combat ; la correction de la télémétrie commune appartient au lot combat. Aucun résultat de production réussi n'est déduit des seuls essais dev.
- Deuxième recette après correction : les deux duels passent et leurs 10 captures sont inspectées, mais le troisième contexte neuf rencontre une erreur avant la sélection du mode. Preuves conservées dans `work-local/v57/qa/arena-life-production-corrected/`. Un rebuild a chevauché cette exécution ; un mélange de fichiers servis est possible, sans cause exacte certifiée. Le script conserve désormais aussi `console.error`, car une erreur interceptée par React ne déclenche pas nécessairement `pageerror`. Une troisième recette entière sur le serveur figé est requise.
- Troisième recette entière, serveur figé et build V57 final : **PASS** dans `work-local/v57/qa/arena-life-production-final/report.json`, le 30 septembre 2026 à 10:34 UTC. Deux duels réels, trois KO, pause pendant geste et résultat final, six cellules natives réellement dessinées sur chaque scène, mouvement réduit sur la seule cellule 0 ; données locales inchangées. Les 1 780 observations de cadence correspondent toutes au directeur. Aucun `pageerror`, `console.error` ou échec HTTP. Les 11 captures ont été inspectées séparément et acceptées dans `visual-review.json`, avec hashes des captures et modules concernés. Écart d'appui maximal inférieur à 0,012 pixel logique. Les deux échecs précédents sont conservés, sans fusionner leurs preuves avec ce PASS.

## Vérification publique

La recette complète a réussi le 30 septembre 2026 à 10:59 UTC sur `https://yautja-la-longue-chasse.vercel.app`, version V57 vérifiée dans l'application à chaque contexte neuf. Le déploiement annoncé par le responsable de publication correspond au commit `7f318ad`.

- Preuve indépendante : `work-local/v57/qa/arena-life-public/report.json` et `visual-review.json`.
- Trois scénarios réussis dans une même exécution : duel Terrasse016 sur écran bureau, duel Fosse035 sur écran mobile simulé 844 × 390, puis mouvement réduit.
- Trois KO produits par les commandes réelles ; réactions et retour au repos, pause au geste et pendant le résultat final, six cellules bitmap natives réellement utilisées sur chaque arène. Le mouvement réduit n'utilise que la cellule 0.
- 1 773 des 1 775 observations correspondent exactement à la pose calculée ; deux observations se situent entre le commit React et le dessin du canvas à une frontière de cellule. La cadence reste reproductible et ne revient pas à l'ancienne boucle continue.
- Écart d'appui maximal de 0,0121 pixel logique, dans la précision des valeurs de caméra arrondies exposées. Aucun `pageerror`, `console.error` ou échec HTTP ; chaque octet de `localStorage` est préservé.
- Les 11 captures publiques ont été ouvertes et inspectées : plans, silhouettes, orientation, appuis et lisibilité acceptés. Les hashes sont conservés dans la revue ; les preuves locales antérieures ne sont pas utilisées pour remplacer une preuve publique manquante.

Aucune modification runtime n'a été faite pendant cette vérification publique.

## Limites explicites

Ce lot dirige une plaquette existante de six dessins ; il ne livre pas une nouvelle plaquette. Il ne crée pas les arbitres des lignes 207/264, les suspensions ou bannières des lignes 208/265, ni le Rhynth, les colons à couvert ou la pompe demandés aux lignes 50–52. Les 522 propositions d'événements du classeur ne sont pas déclarées réalisées. La recette mobile utilise Chromium et ne remplace pas un essai sur appareil physique.
