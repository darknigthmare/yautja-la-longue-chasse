# Circuits de chasse et relations V69

V69 ajoute huit missions organisées en deux circuits de quatre chapitres. Elles utilisent les cinq commanditaires déjà rencontrés à pied dans leurs bâtiments. Les vingt demandes du tableau et les quatre demandes personnelles V68 gardent exactement leurs identifiants, descriptions, récompenses, lieux et objectifs. Le catalogue publié avant modification est conservé dans `tests/fixtures/homeworld-contracts-v68-published.json`, provenant de `92a0b4f`.

| Circuit | Chapitre et commanditaire | Actions ordonnées, avec retour au guide après chacune | Marques |
| --- | --- | --- | --- |
| Les balises du retour | Lire les deux souffles · Marché | Observer le cuirassé des Cendres → relever les trois traces des Grottes | 44 |
| Les balises du retour | Les appuis de ceux qui reviennent · Soigneuse | Protéger les balises des Marais → récupérer la caisse de la Couronne | 54 |
| Les balises du retour | La ligne tenue · Quais | Protéger les balises des Orages → observer la proie côtière | 58 |
| Les balises du retour | Des repères sans parure · Forge | Récupérer la caisse des Grottes → observer le fouisseur du Verre → relever les Ruines | 72 |
| La mesure du chasseur | À la distance juste · Marché | Observer le cuirassé des Cendres → observer le fouisseur du Verre | 46 |
| La mesure du chasseur | La riposte et l’empreinte · Forge | Défi non létal du fouisseur → observer le carnivore de la Couronne | 62 |
| La mesure du chasseur | Ce que l’épreuve ne prouve pas · Mémoires | Relever les Ruines → récupérer la caisse extérieure de la Réserve | 60 |
| La mesure du chasseur | Ne pas emporter la route · Quais | Défi non létal côtier → protéger les balises de la Jungle → observer le planeur des Orages | 78 |

Ces dix-huit actions correspondent toutes à des couples région/action déjà réellement émis par les scènes V68. Par exemple, les Cendres produisent une observation `track`, pas un événement `survey` après le troisième indice. Aucun objectif ne réclame une animation ou un événement inexistant. Les défis terminent sur le retrait vivant de la faune après deux charges évitées et trois contacts en reprise ; aucune mort, escorte achevée, ouverture d’enclos, installation, arme, rang ou rite n’est inventé.

## Déblocage et ordre réel

Le premier chapitre de chaque circuit est proposé au marché lorsque la véritable permission de visite de la campagne l’autorise. Pour les jeunes chasseurs, l’intégration V69 s’appuie sur la formation et les Premières Pistes effectivement reconnues ; le simple rang d’honneur du profil ne remplace pas ces preuves. Les campagnes anciennes sans prologue conservent leur accès. Cette permission n’ouvre ni chasse hors planète, ni vaisseau personnel, ni Game Reserve. La station extérieure du biome Réserve ne donne aucune permission d’entrer dans un enclos.

Les chapitres suivants exigent la remise complète du précédent à son commanditaire. Une présentation de mission, un objet d’inventaire, un faux champ de rang, des traces seules ou même tous les rapports des guides ne débloquent pas la suite avant cette remise. La validation vérifie le statut réellement enregistré, les preuves et l’ordre des numéros d’acceptation ; un chapitre dont le prédécesseur manque, reste actif ou a un numéro ultérieur est rejeté.

Dans les nouveaux circuits seulement, la région suivante reste non liée à un `runId` tant que le guide de la précédente n’a pas confirmé le retour. Une excursion jouée hors de l’ordre ne produit donc pas de preuve pour cette mission. Les missions V68 gardent leur comportement parallèle. Abandonner et reprendre efface seulement la tentative du chapitre courant ; ses prédécesseurs remis et les checkpoints des autres contrats sont conservés.

La remise conserve la transaction déjà intégrée : registre et delta de `profile.clanMarks` sont sauvegardés ensemble. Une reprise après refus de quota ou après écriture réussie mais lecture interrompue ne double pas le paiement. Les huit nouvelles remises totalisent 474 marques ; ce cumul n’est pas une promotion de rang.

## API et compatibilité

- `HOMEWORLD_CONTRACTS_V68`, `HOMEWORLD_BOARD_CONTRACTS_V68` et `HOMEWORLD_NPC_CONTRACTS_V68` restent les catalogues V68 exacts. `HOMEWORLD_CHAIN_CONTRACTS_V69` contient les huit ajouts et `HOMEWORLD_ALL_CONTRACTS_V69` le catalogue complet de 32 missions.
- `contractRequirementsV69(value, id)` décrit les remises manquantes sans modifier l’état. `applyHomeworldContractV68`, `bindContractsVillageRunV68` et `recordContractsFieldEventV68` revalident les contraintes à l’action réelle, indépendamment de l’affichage.
- Le registre conserve `version:1` pour les seules anciennes missions. La première acceptation d’un circuit promeut le registre en `version:2`, sans modifier les anciennes entrées. Les identifiants V69 sont refusés dans un registre version 1 ; une version 3 est protégée comme future. La sauvegarde globale V69 passe de version 9 à 10, afin qu’un ancien client protège aussi les nouvelles données solo, au lieu de récupérer silencieusement une copie ancienne. Ces seuils sont intégrés par le parent dans `save.ts`.
- Aucun nouveau champ de checkpoint, aucun événement de région, aucun compteur de réputation n’est ajouté. Le journal dérive la destination réelle, la prochaine action, le commanditaire, l’étape et la relation narrative des remises existantes. Après une remise, il indique chez qui le chapitre suivant est disponible. L’interface affiche aussi les prérequis verrouillés et les étapes ultérieures.

Les reçus restent des données de sauvegarde locale, pas des signatures cryptographiques ni un système anticheat réseau. Leur contexte physique est validé par le callback de la scène et les règles existantes des régions ; les fixtures de tests du modèle ne doivent pas être présentées comme une preuve de parcours navigateur.

## Validation

Les 12 tests V68, 12 tests de circuits V69 et 11 tests d’intégration des callbacks réels passent, soit 35 tests ciblés. Ils couvrent le catalogue publié inchangé, les checkpoints mixtes, les couples d’actions physiquement disponibles, l’ordre des guides, les prérequis forgés, les huit remises, l’abandon/reprise, le journal, les versions futures, les callbacks de quota/readback/portefeuille, le faux rang et la migration de sauvegarde 9 vers 10. Le lint des fichiers modifiés passe également.

`scripts/verify-homeworld-chain-v69.mjs` a réussi de nouveau sur la reconstruction finale du build central local V69 servi sur `http://127.0.0.1:4187`, après le gel des placements de la cité et des changements campagne/villages : quatre contrôles et dix captures finales inspectées, sans erreur JavaScript ni requête HTTP en échec. Rapport conservé : `docs/v69-contracts-local-qa.json` ; captures dans `work-local/v69/qa/contracts-final/`. Les premiers rapports préliminaires restent séparés dans `contracts/` et `contracts-visual/`.

La recette rejoint la Soigneuse par sa porte pour constater le chapitre verrouillé, accepte le premier chapitre au marché, marche entièrement les corniches des Cendres puis des Grottes, réalise l’observation et le relevé, retourne aux deux guides puis au marché, obtient une remise unique de 44 marques et va accepter la suite auprès de la Soigneuse. Le second chapitre conserve deux étapes vides, sans preuve automatiquement héritée. Refus de quota à l’acceptation et à la remise, reprise, migration du registre en version 2 à l’acceptation, absence de déblocage avant remise, rechargement et autres progrès conservés passent.

Les captures montrent le tableau natif, les cartes et itinéraires, la proie vivante des Cendres, le troisième relevé des Grottes, les deux guides aux positions réellement rejointes, la remise et le chapitre suivant. En 393 × 852, le prérequis verrouillé et la prochaine destination sont visibles après défilement vertical, sans débordement horizontal. Les longs dialogues et cartes restent défilables ; le HUD de région affiche l’activité régionale générale, tandis que la carte et le carnet portent l’objectif du contrat.

Ce résultat porte sur le premier chapitre de deux biomes et l’acceptation réelle du second. Les huit chapitres et dix-huit actions sont validés par le modèle, mais ne sont pas tous parcourus de bout en bout dans ce navigateur. La fixture est une campagne ancienne isolée, pas un parcours complet de jeunesse. Le rapport local et la validation publique ci-dessous restent deux preuves distinctes.

## Validation publique

La même recette complète a réussi sur [la V69 publique](https://yautja-la-longue-chasse.vercel.app), après la disponibilité du déploiement `dpl_CFGZkLhCSiBs5oUQirbMYRK5RWoD` issu de `d81f8b466ec2d5d0a78216e0d054aed94d24693a`. L’intégrateur fournit cette identité de publication ; la recette vérifie indépendamment le runtime public V69 et le parcours joué. Rapport : `docs/v69-contracts-public-qa.json` ; dix captures publiques dans `work-local/v69/qa/contracts-public/`.

Les quatre contrôles et les dix captures inspectées passent : offre verrouillée et prérequis lisible sur mobile, acceptation réelle au marché, observation des Cendres, relevé des Grottes, deux retours physiques aux guides, retour par les corniches, remise unique de 44 marques, puis acceptation de la suite chez la Soigneuse. Le refus de quota, sa reprise, la destination mobile, le rechargement et la conservation des autres progrès passent également. Aucun échec JavaScript ni HTTP n’est remonté ; Chrome est fermé proprement à la fin. Ce parcours public couvre toujours le premier chapitre remis et le second accepté, sans présenter les huit chapitres du modèle comme huit parcours navigateur terminés.

## Limites de fidélité

Les circuits, leurs relations, leurs récompenses et leurs conclusions sont une adaptation originale du jeu. Le tableau natif OpenAI V68 conserve sa provenance et n’est pas présenté comme un accessoire de *Badlands* reproduit à l’identique. Les [références officielles déjà documentées en V68](v68-homeworld-contracts.md) n’attestent pas cette économie comme une institution universelle des clans. Les proies et les missions ne remplacent ni une histoire canonique, ni les rites encore à produire dans la campagne principale.
