# V56 — Pack utilisateur, deux Hellhounds et mausolée

## Contenu intégré

Le lot conserve les 195 identités précédentes et ajoute trois identités issues du pack fourni : Arid Ermit Yautja, Yautja Mutated et Amengi female. Les deux Yautja sont des créations originales ; la silhouette Amengi fournie n'est pas certifiée comme reproduction canonique. Chacun possède un profil de duel et une association de stage originale séparée des décisions historiques V55. Les trois dessins détourés sont des poses fixes, pas des plaquettes d'animation complètes.

Les dix créatures originales et le PredDog fourni sont consultables dans **Dossier de campagne → Compagnons · registre**. Les quinze fichiers originaux de l'archive sont conservés ; les quatorze cutouts sont de véritables PNG transparents produits par OpenAI. Le petit visuel de figurine Amengi reste une référence, sans nouvelle identité fictive. Le registre ne recrute pas de compagnon et n'installe aucune cabine : les missions de rencontre/recrutement restent à produire.

Tracker possède une entité Hellhound au sol : annonce de charge, un seul animal par propriétaire, un contact maximum, rappel inoffensif, interruption par un coup adverse et disparition au KO/à la fin du round. Le choix d'apparence est enregistré dans le contrat V7 des matchs et replays. Les replays historiques V6 de Tracker conservent leur ancienne recette de contre au gantelet.

Deux apparences indépendantes sont proposées dans les options de The Pit lorsque Tracker participe :

- **Hellhound — crête dorsale** : deux atlas natifs de six poses chacun, orientés séparément. Les rectangles sont mesurés individuellement pour ne pas couper les langues ni les cornes. La course alterne deux poses ; ce n'est pas une animation complète à haute densité d'images.
- **Hellhound — longues cornes** : deuxième variante demandée à partir des deux photographies utilisateur, avec écailles ocre/vertes, silhouette allongée, cornes dirigées vers l'avant et filaments dorsaux. Deux vues natives, une pose par côté ; déplacement de l'entité sans cycle de marche dessiné. La fidélité a été contrôlée visuellement, sans revendiquer une copie pixel pour pixel ni une identité parfaite entre les deux dessins générés.

Les quatre PNG Hellhound ont été inspectés dans Chrome sur fonds vert sombre et sable clair. Les versions aux pointes coupées ont été rejetées. Les fichiers retenus sont copiés sans altération des pixels ; les dimensions, empreintes et appuis sont dans `art-source/v56/hellhounds/source-records.json`. Le chargement refuse une image absente, opaque, de mauvaise taille ou coupée ; aucune créature CSS ou drone de remplacement n'est utilisé.

## Mausolée

La conversation **Idée mausolée DLC** a été récupérée intégralement. Le mausolée se visite depuis le menu et physiquement depuis Homeworld. Il présente neuf chroniques, des galeries selon le rang, les masques effectivement disponibles, une consultation sauvegardée et une séquence d'étude prendre/examiner/revêtir/activer/retirer/reposer. Le personnage revient au même emplacement de la cité. L'étude est un dispositif 2D, pas une cinématique complète de mains articulées.

Aucune campagne DLC complète n'est installée par ce lot. Les boutons de lancement le disent explicitement ; consulter une chronique ne débloque ni récompense ni achèvement fictif. Tracker, Upgrade et Hopper n'empruntent pas le masque d'un autre chasseur quand leur représentation manque.

## Sources et priorités

La conversation **Audit GitHub de The Pit** et le classeur V54 ont été lus séparément. Les priorités équipement ont corrigé Jungle Hunter (lames/plasma), Berserker (impact d'épaule) et Valkyrie (marteau lourd, sans givre), puis Tracker. Falconer conserve son marquage non offensif. Les 18 actions proposées par dossier, les campagnes de huit étapes et les centaines d'événements de fond du classeur ne sont pas déclarés produits.

Le contenu visible de **Liste lore compagnons Yautja** a confirmé l'absence de recrutement et de présence à bord par défaut. Cette récupération est partielle : des messages restent tronqués, et cette discussion n'est pas déclarée intégralement lue.

Les 23 compositions V55 portent le catalogue à 161 arènes ; leur livraison et leurs limites sont détaillées dans `v55-delivery.md`. Les 198 identités ne signifient pas 198 styles d'animation complets ni 198 décors uniques.

## Qualification et diffusion

La suite globale passe **1 794 / 1 794 tests**, puis les trois tests ajoutés sur les atlas Hellhound passent séparément **3 / 3**. TypeScript passe ; ESLint compte zéro erreur et trois avertissements sur les balises image natives. Le build Vinext et le renderer PC V56 passent. Next passe avec webpack, TypeScript et rendu des quatre routes ; Turbopack local refuse les bibliothèques liées entre disques, limite d'environnement qui ne constitue pas une validation du build distant.

La recette finale du mausolée a validé neuf chroniques, deux dimensions mobiles, le trajet clavier depuis Homeworld, les sept phases d'étude, la persistance, le retour exact et l'isolation de la progression. Aucun problème JavaScript ou HTTP n'a été détecté dans ce parcours. Le registre passe les onze sélections dans trois formats d'écran, les 22 empreintes sources/cutouts, le clavier et l'absence de mutation de stockage. Ses quatre captures ont une seconde revue indépendante.

Les Hellhounds passent quatre duels réels (deux apparences × deux côtés), sans miroir Canvas, avec appuis, annonce, morsure, pause, rappel et déplacement mesurés. Une vue volontairement indisponible bloque le combat à la frame zéro ; le bouton de réessai rétablit ensuite l'introduction et un appel réel. Les trois nouveaux combattants passent trois exhibitions avec intros/compte à rebours, dégâts, caméra, pause et retour sans mutation de campagne. L'Amengi gagne réellement de la Traque puis tente le camouflage : la ressource reste intacte, aucun camouflage Yautja ne lui est accordé.

Les **55 PNG nouveaux servis localement** sont identiques à leurs fichiers acceptés. Les sources des recettes sont versionnées dans `scripts/verify-*-v56.mjs` et `verify-pit-stage-selection-v55.mjs`. Le parcours général a rencontré un délai de chargement au sixième duel après cinq duels réussis ; cette exécution échouée est conservée. La reprise complète passe **59 contrôles**, **198 icônes/associations**, **23 aperçus**, **3 cadrages mobiles**, **6 recommandations** et **8 duels / 8 profils**, sans changement du code ni allongement du délai. La charge disque n'est pas déclarée comme cause prouvée. Les 50 captures d'arènes et les 19 captures des trois nouveaux profils ont été inspectées.

Le commit de contenu `240e76a4d47370a51a2f63cab347a7b08b1dcf0b` est compilé par Vercel en prévisualisation **READY** (`dpl_FUYq2oK6wLyZoaeZ5SxEz9W1WLcZ`). Le paquet Windows 1.0.56 est construit depuis ce même commit, empreinte source `45a4b5f215dca3119138750af63fc1f60d127d688b4ebb9372aaf1b2af6fbf93`. L'intégrité ASAR est validée ; sa recette applicative et la vérification du domaine public se font après ces étapes et ne sont pas déduites de ce statut READY.

Le build navigateur Vinext, le build Next de Vercel, le paquet Windows, GitHub et la production sont des validations distinctes. Aucun de ces statuts n'est déduit d'un autre.
