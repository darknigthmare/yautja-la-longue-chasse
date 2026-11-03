# V77 — sources publiques des quatre conversations

Corpus récupéré le **3 octobre 2026 : quatre conversations uniques, 40 tours visibles, 20 messages utilisateur et 14 PNG originaux**. Les liens répétés dans la demande n'ajoutent pas de conversation distincte. L'accès public n'a nécessité aucune connexion.

| Conversation | Transcription complète | Tours | Messages utilisateur | PNG |
|---|---|---:|---:|---:|
| Créer sprite 2D fidèle | [01-sprites.md](01-sprites.md) | 30 | 15 | 12 |
| Élaborer un système rituel | [02-rites.md](02-rites.md) | 2 | 1 | 0 |
| Intégrer C’ntlip au jeu | [03-cntlip.md](03-cntlip.md) | 2 | 1 | 0 |
| Améliorer le level design | [04-homeworld.md](04-homeworld.md) | 6 | 3 | 2 |

Le [prompt Homeworld de 28 sections](homeworld-prompt-codex.txt) reproduit exactement le texte du tour 6 : **27 522 caractères, 28 350 octets UTF-8**, SHA256 `e1b211ff52bbe56d688d9de9c4264ff6db3783be3c60e56b908e17887bb24957`. L'introduction et les dernières suggestions de la réponse sont conservées avec le cahier des charges. Le fichier n'ajoute pas de retour à la ligne final au texte du tour original.

Les messages sont conservés intégralement entre leurs marqueurs `BEGIN EXACT SOURCE TURN` et `END EXACT SOURCE TURN`. Les titres, séparateurs, numéros de tour et liens PNG ajoutés servent uniquement à retrouver la source. Les indicateurs visibles de la page, dont « Réfléchi pendant », « Aperçu », « Image chargée » et « Afficher moins », font partie du texte observé. Ils ne constituent pas une description des fichiers importés.

Le [manifeste public](manifest.json) contient les quatre URL de partage, les comptes exacts, les empreintes de transcription et de chaque texte, puis le nom, le tour source, l'état et le chemin runtime des 14 PNG. Le SHA256, les dimensions, le canal alpha et le nombre d'octets ont été contrôlés : les fichiers intégrés sous `public/game/homeworld/v77/` sont identiques aux originaux récupérés. Le manifeste sélectionne ses champs explicitement ; il ne contient ni URL de téléchargement signée, ni identifiant interne de fichier, ni autorisation, ni chemin utilisateur local.

Les textes de l'assistant sont des propositions conservées comme matériau de travail. Ils ne prouvent ni le canon, ni une fonctionnalité terminée. Les références importées par l'utilisateur qui restent indiquées « Image chargée » n'ont pas leur fichier original accessible dans ces partages. La fidélité visuelle 1:1 ne peut donc pas être certifiée. Les deux cartes de ville sont des concepts originaux pour le jeu, pas des plans officiels de Yautja Prime. Les 14 PNG sont statiques : aucune animation native complète n'est déduite d'une planche de bestiaire.

L'[état des demandes](ETAT-DES-DEMANDES.md) distingue code monté, éléments partiels et éléments manquants. Il décrit le candidat source V77 ; les validations du navigateur et de publication sont des gates séparés. C’ntlip a passé son [parcours GameClient local contrôlé](../v77-cntlip-gameclient-review.md) sur le candidat final `v77-candidate4-local` servi en 4198 : 11 contrôles et neuf nouvelles captures desktop/mobile, toutes relues le 3 octobre à 05:13:32 UTC et liées à leur SHA256 dans un reçu séparé. Le toast mobile recouvre transitoirement le bas du panneau ; les animations assis/verser/boire et l'audio dédié restent absents. Le précédent résultat 4196 demeure historique et n'a pas été copié. Le résultat 4198 ne démontre ni la validation de la ville entière, ni le compte synchronisé, ni le déploiement.

La faune possède aussi sa propre recette finale 4198 et un reçu de relecture des **12 nouvelles captures** par le responsable du lot, daté du 3 octobre à 05:15:51.975 UTC. La galerie conserve les dessins entiers et les variantes ; les quatre biomes réutilisent un plateau rocheux natif commun, les panoramas et grandes bandes de chemin demeurent à enrichir, et les poses fixes ne sont pas des animations anatomiques. Les captures de pause sont volontairement floutées ; les appuis ont été relus sur les vues correspondantes non pausées. Ces réserves restent distinctes de la réussite des contrôles du navigateur.

Documents de portée complémentaires : [intégration V77](../v77-integration-status.md), [topologie Homeworld](../homeworld-world-v77.md), [QA contrôlée des rites](../v77-rites-qa-2026-10-03.md). Une ancienne revue ou un ancien échec reste historique et n'est jamais renommé en validation du candidat corrigé.

Le [collecteur final local](../v77-local-delivery-qa.md), exécuté le 3 octobre à 05:25:28.787 UTC sur ce candidat, conclut `PASS_LOCAL_GATES` sans condition manquante : deux builds, contrôles statiques, **2 642 tests réussis**, quatre recettes distinctes, **67 captures relues** et **19 PNG HTTP/SHA conformes**. Les rites restent une preuve contrôlée antérieure reliée au SHA exact inchangé de `HuntCanvas`, pas une mission complète. Ce résultat local ne constitue pas une preuve de commit/push, de déploiement READY ou de contrôle de l'alias public.
