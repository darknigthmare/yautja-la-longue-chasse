# Conclusions Scar et exercice de route V107

Les nouveaux systèmes sont des sidecars opt-in. Les états de combat/replay 11–14, les recettes historiques et les sources V100/V106 restent inchangés.

## Conclusions et balise

`pitWorkbookConclusionsV107.ts` pilote une scène avec les deux acteurs indépendants du duel réellement terminé. Le snapshot original du combat est conservé : les blessures, points de vie, résultat et archive ne sont pas réécrits pour fabriquer une animation.

Pour Scar `CIN_F003_FATALITE_2` (`07_PRESENTATIONS!I7`), il faut une victoire finale par KO du BODY Scar de base, un contexte de menace hostile adulte et l’équipement autorisé. L’approche utilise les déplacements effectivement appliqués pour lire les marches natives ; elle reste bornée à l’arène. La victime montre une vraie garde indépendante. Le revers doit toucher sa géométrie gardée, puis l’estoc sa hurtbox : la qualification exige les deux contacts. Les six dessins natifs se jouent en 30/30/60/60/60/60 ticks, soit les cinq secondes proposées, après l’approche. Le mode réduit/allié/narratif interdit cette branche ; passer à une préférence plus sûre interrompt la scène létale au lieu de simplement recolorer l’effet.

Si l’adversaire porte l’unique dispositif **inerte** du scénario alternatif, le vrai contact de l’estoc le décroche : `held → flying → ground`. La gravité et l’impulsion déjà utilisées par cette scène font réellement tomber le même objet au sol, où il reste lorsque le corps vaincu est couché. Le seul événement causal reste `thrust-contact` ; aucun désarmement, ramassage de balise, reçu, gain ou nouvelle animation source n’est ajouté. Le codec sidecar version1 reconstruit exactement cette trajectoire depuis le contact natif et refuse un dispositif encore attaché après l’estoc, une chute sans contact ou une position/vitesse inventée. Une pause ou une reprise conserve cette chute sans la relancer. Cela corrige un accessoire flottant du scénario alternatif et ne clôt aucune exigence de désarmement offensif.

Scar `CIN_F003_CLEMENCE` (`07_PRESENTATIONS!J7`) reste **partielle**. Le scénario public alternatif « récupérer la balise » crée avant le duel un dispositif physique et une balise de session identifiés, avec provenance. Le contact natif peut détacher le dispositif ; il tombe physiquement. Le ramassage exige la présence de la même balise sur le vrai point de saisie. Le transfert produit un reçu idempotent et conserve l’objet dans la main native au bilan. Une pose contenant la balise ne peut pas être jouée avant le ramassage effectif.

Un dispositif inerte détaché n’est pas une arme offensive désarmée. L’événement est donc `device-detached`, l’issue `partial-source`, et `getPitWorkbookConclusionQualificationV107` expose `OFFENSIVE_WEAPON_DISARM_NOT_DELIVERED`. Les simples drapeaux fournis par un appelant ne peuvent certifier des pixels : la liste curatée `PIT_WORKBOOK_CONCLUSION_DISARM_ADMISSIONS_V107` est vide tant qu’une vraie arme offensive autonome et une vraie pose victime désarmée ne sont pas admises ensemble. Aucun inventaire de campagne, trophée, récompense ou mort canonique n’est inventé.

Les contrats `pitWorkbookConclusionAnchorsV107.json` et `pitWorkbookConclusionSourceV107.ts` conservent les SHA, rectangles, pivots, tailles et corrections de pied des quatre pages natives. Les volumes de contact et points de main sont des adaptations Pit mesurées, pas des rectangles prétendument écrits dans Excel.

Le sidecar version1 possède sa propre sérialisation. La restauration vérifie le combat original, les blessures inchangées, les identités/possessions, les géométries source, les fenêtres temporelles, les contacts uniques et le reçu de transfert. La scène complète ne bloque plus le résultat ; sa pose finale299 et ses objets persistent jusqu’au changement de match.

## Deux routes d’exercice persistantes

Le carnet s’ouvre depuis la chronique de Feral ou Scar par **Ouvrir le parcours d’exercice V107**. Il conserve les huit cellules de chaque héros, leurs textes exacts et leurs besoins visuels. Les cinq adversaires source (`npc-bear`, `npc-trapper`, `npc-naru`, `npc-xeno-drone`, `npc-grid`) ne sont pas inscrits au roster de duel. Les sprites d’écologie et les portraits ne deviennent pas des admissions de combattant par rapprochement de nom.

Les deux routes sont donc explicitement des **exercices alternatifs avec partenaires substituts nommés**, dans les six arènes existantes. Elles ne ferment aucune des seize étapes source.

| Étape | Exercice réellement livré | Ce que cela ne certifie pas |
| --- | --- | --- |
| 1 | Marcher jusqu’à la balise et tenir une interaction de proximité ; la balise passe du terrain au kit. | Traces de proie ou indice du temple de la scène source. |
| 2 | Gagner un vrai duel CPU dans l’arène source. | Ours ou drone xéno source. |
| 3 | Gagner un second vrai duel CPU. | Trappeur ou Grid source. |
| 4 | Rejoindre le poste et accomplir le contrôle de proximité du kit conservé. | Indice narratif de Naru/Grid et animation STORY_04. |
| 5 | Rejoindre un partenaire indépendant et tenir la vraie garde à portée. | Contrechamp spécifique de Naru/Grid et entrée STORY_05. |
| 6 | Trois contres observés dans le vrai moteur, puis victoire du match. Scar utilise S4 ; Feral doit bloquer avec S2 puis toucher avec son bord dans la même action. | PNJ source, animation GUARD_H dédiée et ouverture cinématique du passage. |
| 7 | Gagner le dernier duel contre le partenaire déclaré. | Rival source ou issue canonique. |
| 8 | Marcher au support et déposer la même balise conservée depuis l’étape1. | Masque repris dans la boue ou sortie de Scar avec Lex. |

Les interactions ne se valident pas par un bouton « réussi » : elles utilisent les positions, la garde et le temps de contact du moteur. Les duels utilisent les callbacks de résultat réels ; une victoire sans les trois contres ne valide pas l’étape6. Une défaite reprend uniquement la rencontre courante. Les objets du kit conservent leur identité ; il n’y a ni récompense de campagne ni nouveau pouvoir. La jauge suit les règles ordinaires de chaque duel, pas une continuité d’inventaire source prétendument complète.

Le checkpoint local est lié au profil, au héros et au SHA source. Il conserve les preuves d’interaction, les résultats des matchs, l’essai concerné et les reçus uniques. Un rechargement pendant une activité reprend son briefing avec les étapes et objets antérieurs conservés. Les chroniques V79/V80 et leurs checkpoints ne sont pas remplacés.

## Vérifications

`tests/pit-workbook-conclusions-v107.test.mjs` couvre les vrais résultats gagnés, les deux orientations, les deux contacts de la fatalité, la chute physique de son dispositif inerte, le refus des contextes interdits, la récupération physique de CLEMENCE, la qualification partielle, les préférences, les pauses et les snapshots falsifiés.

`tests/pit-workbook-campaign-v107.test.mjs` exécute les deux routes complètes avec quatre interactions physiques et quatre matchs gagnés chacune, dont les trois contres réellement exécutés avec une jauge obtenue par la pression normale. Il vérifie aussi les défaites/reprises, les doublons, les résultats étrangers et la persistance. Ces tests ne remplacent pas la recette navigateur séparée.

Le terrain d’exercice suspend sa simulation quand l’onglet est caché ou que la fenêtre perd le focus. Aucun état de manette n’est lu pendant cette suspension. Les événements de perte et de retour du focus effacent les touches, l’accumulateur et l’autorisation de la manette ; un stick ou bouton maintenu au retour doit repasser au neutre avant d’agir. Les attributs passifs du canvas exposent frame, position, focus actif et autorisation de la manette pour la recette navigateur.

Un carnet incompatible ne peut pas être écrasé par le premier bouton de démarrage. Le joueur choisit explicitement d’en archiver une copie exacte, vérifiée dans le stockage, avant de créer un nouveau carnet. Un échec d’archivage laisse l’original intact. Une écriture ultérieure refuse également de remplacer un carnet devenu incompatible dans une autre fenêtre.
