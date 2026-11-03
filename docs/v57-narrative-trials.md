# V57 — Épreuves narratives tirées du classeur The Pit

## Source et périmètre

Source utilisateur : `THE_PIT_BIBLE_COMBATTANTS_STAGES_V54.xlsx`, SHA-256 `32f2ee8e4fd801e7ca677a54862f2bd0123a2e78d12c015f64b50ab28184c380`.

L'extraction de référence est `docs/v56-excel-priorities.json`, section `p0Specifications`. La discussion « Audit GitHub de The Pit » (`6aba9f72-876c-83eb-9805-6abcd5f0bec1`) demande des mini-campagnes avec introduction, conclusion, rival et stage spécial ; le classeur précise huit étapes. Les extraits livrés ici ne satisfont pas à eux seuls cette demande complète.

Quatre confrontations de l'étape 7 sont accessibles dans **The Pit → Épreuves narratives**. Elles emploient des combattants et des décors déjà présents, sans remplacer les adversaires manquants des autres étapes par des personnages génériques renommés.

| Épreuve | Cellule rival | Contexte | Décor existant |
| --- | --- | --- | --- |
| Berserker / Classic Predator 2010 | `08_CAMPAGNES!J11` | `D11:K11` | `arena-107-predators-2010-hunting-camp` |
| Enforcer / Bad Blood | `08_CAMPAGNES!J16` | `D16:K16` | `arena-140-bad-blood-pine-barrens` |
| Greyback / City Hunter | `08_CAMPAGNES!J18` | `D18:K18` | `arena-106-predator-2-1990-trophy-ship` |
| Machiko / Tichinde | `08_CAMPAGNES!J20` | `D20:K20` | `arena-138-avp-ryushi-prosperity-wells` |

Pour Enforcer, l'identifiant proposé `new-bad-blood-forest` est rapproché du stage 140 suivant `09_STAGES!A27:N27` et l'audit V56. Les règles `16_REGLES!C29:D29` et `C36:D37` imposent de distinguer adaptation, continuité et contenu réellement disponible. Les quatre briefings annoncent donc leur branche alternative ou originale ; aucune victoire ne réécrit le canon.

## Comportement livré

- Briefing en plein écran, aperçu du décor réel, attribution aux cellules sources et limites consultables.
- Combattants et stage imposés, sans options cachées permettant de changer le contexte validé.
- Duel CPU avec les véritables introductions, compte à rebours et résultats de manche déjà intégrés à The Pit.
- Lecture de l'issue seulement après la présentation de victoire/défaite ; reprise de la même rencontre, abandon explicite, retour clavier/manette vers The Pit.
- Validation du résultat par identité des deux adversaires, mode CPU, stage, identifiant de résultat et vainqueur.
- Aucun honneur, objet, cosmétique, recrutement, score de campagne ou progression Arcade attribué. L'issue n'existe qu'en mémoire pendant la visite. Aucun format de sauvegarde historique n'est modifié.
- Chargement du décor vérifié avant lancement, message et réessai si des plans sont indisponibles.

## Ce qui reste à produire

Les étapes 1–6 et 8, les adversaires narratifs absents, les objectifs spécifiques, les cinématiques corporelles dédiées, les variantes de fin et les objets tenus ne sont **pas** déclarés terminés. Les profils importés Classic 2010, Bad Blood et Tichinde gardent leur profil de duel partagé et leurs images fournies. Machiko n'acquiert pas de tir de fusil par cette intégration. Greyback reste l'incarnation de Predator 2, sans geste de lance ni remise de trophée inexistants. L'Arcade historique reste indépendant.

## Vérification

- `node --test tests/pit-narrative-trials-v57.test.mjs` : **11/11**. Contrôle de provenance et six plans pour les quatre décors ; rejet des résultats incompatibles ; huit duels du moteur menés à leur terme (victoire puis défaite pour chacun), avec sérialisation de l'Arcade historique inchangée. Un test supplémentaire exécute la vraie branche de callback du Canvas pour Greyback et Machiko, et confirme que les duels d'extension ordinaires restent exclus de la persistance.
- `npx tsc --noEmit --incremental false` et ESLint ciblé : **PASS** après séparation du callback narratif. Le contrat `PitMatchCompleteResult` reste réservé aux résultats historiques ; les extensions utilisent `onNarrativeComplete` et un résultat minimal sans paramètres de récompense.
- Tests narratifs, chargement différé et verrouillage Descente exécutés ensemble : **21/21 PASS**. Le nouveau composant est explicitement vérifié comme import différé, et les deux gardes (épreuve imposée / transition de parcours non réglée) précèdent toujours tout changement de mode.
- Recette reproductible : `scripts/verify-pit-narrative-trials-v57.mjs`. Elle utilise un profil Chrome synthétique, de vrais événements clavier et une horloge contrôlée pour accélérer les duels ; aucune vie ni issue n'est injectée.

Tentatives conservées : la première URL `127.0.0.1:4176` a refusé la connexion (serveur de développement accessible sur `localhost`). Les deux premiers pilotes sur `localhost` ont correctement testé les quatre lancements/abandons puis perdu le duel attendu gagnant. Le premier maintenait sa touche au lieu de presser et relâcher ; le second utilisait des coups lents exposés aux interruptions. Le pilote suivant utilise des frappes légères régulières ; les combats du jeu n'ont pas été modifiés pour le faire gagner. Une recette a ensuite été interrompue par le retour de l'application au menu pendant les modifications du serveur de développement ; elle ne compte pas comme un succès.

Le premier build figé sur 4177 a révélé un défaut réel dans la télémétrie du Canvas : `state.projectiles.length` accédait à un champ absent du moteur, provoquant la boundary React au lancement. Cette régression du compteur des équipements a été corrigée en comptant les entités de technique appropriées, puis le build a été reconstruit. La recette capture désormais aussi les erreurs console absorbées par React et s'arrête explicitement sur la boundary.

La revue indépendante a ensuite identifié que la garde historique des combattants d'extension empêchait Greyback et Machiko de transmettre leur issue au récit. Une branche narrative dédiée transmet désormais leur résultat au wrapper puis s'arrête ; elle n'ouvre ni statistiques ni sauvegarde Arcade pour ces combattants. Le test exécutable de callback passe ; la recette navigateur est étendue aux quatre issues pour couvrir aussi cette régression.

Contrôle visuel Classic 2010 : les captures synchronisées à horloge figée montrent `y=0` au sol, puis `y=32,88`, `59,28` et `84,4` pendant le saut de l'IA, puis son retour à `y=0`. L'impression de flottement provenait d'une image prise après un relevé de position à un autre instant. Aucun pivot n'a été décalé pour corriger cette fausse alerte.

Une recette complète du build corrigé a passé **12 groupes** : les quatre lancements et abandons, une vraie victoire de Berserker suivie de sa conclusion, une vraie défaite/reprise, les défaites complètes des trois autres rencontres (dont Greyback et Machiko), les formats 390×844 et 844×390, puis retour à The Pit et égalité des données de progression avant/après. Douze captures ont été enregistrées ; les vues de résultat et de téléphone ont été relues, sans débordement horizontal. Aucune erreur JavaScript ni console n'a été signalée. Preuve locale : `work-local/v57/qa/narrative-trials-final/report.json`.

Après séparation typée `onNarrativeComplete` et reconstruction, le candidat final a passé une seconde recette ciblée **6/6** : défaites complètes de Greyback et Machiko correctement transmises, reprise de Machiko puis abandon explicite, les deux formats d'écran et retour à The Pit avec progression inchangée. Cette recette utilise toujours la vraie IA et aucun résultat injecté ; erreurs JavaScript et console vides. Preuve locale : `work-local/v57/qa/narrative-trials-release-callback/report.json`. Lancer le script avec `NARRATIVE_QA_SCOPE=callback` pour reproduire ce périmètre court ; omettre cette variable pour la recette complète.

## Vérification de la version publique — 30 septembre 2026

La recette complète a été exécutée sur [la version publique de Yautja](https://yautja-la-longue-chasse.vercel.app), après publication de V57 (commit de référence `7f318adfbbc5f1d681888c907f028d0180c8d6fc`). Résultat : **12/12 groupes PASS**, douze captures, aucune erreur JavaScript ou console.

L'entrée « Épreuves narratives », les quatre duels imposés et leurs abandons sont disponibles en ligne. La victoire de Berserker, sa conclusion, sa défaite puis sa reprise ont été jouées avec les touches du jeu. Les défaites complètes d'Enforcer, Greyback et Machiko remontent correctement à leur récit. Les formats 390×844 et 844×390 n'ont pas de débordement horizontal ; les captures des combats, issues et formats ont été relues. Les données de progression de campagne et de The Pit sont identiques avant et après la session synthétique. Aucun état de combat ni vainqueur n'a été injecté.

Preuve : `work-local/v57/qa/narrative-public/report.json` et captures du même dossier. Le premier aperçu de briefing a été capturé pendant son chargement réseau ; les décors sont ensuite chargés et contrôlés avant chaque duel. Cette qualification porte sur les quatre extraits narratifs du navigateur. Elle ne transforme pas les étapes manquantes en campagnes complètes et ne constitue pas une qualification du paquet PC V57.
