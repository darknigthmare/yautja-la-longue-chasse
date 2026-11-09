# Warp — lot P0/P1 du 9 novembre 2026

Le pilote spatial `WarpModuleBay` réutilise le propriétaire temporaire `/dev` :
deux salles, un sas commandé à portée, ses collisions et un trajet de retour,
des postes à rejoindre et un test local du banc. Le vrai rig du chasseur conserve
son apparence. Le modèle ne reçoit aucun service d’écriture de campagne.
Le module n’accorde ni rang, recrutement, quête, inventaire, récompense ou transit.

Les dix tests de domaine/SSR et le lint ont réussi avant la construction de
production. Le rapport navigateur de root reste une preuve séparée : il n’est
pas remplacé par ces tests. Les signatures des sources figurent dans
`verification.json`. Aucun essai de manette physique n’est revendiqué.

## Ressources P0

Les originaux 199, 201 et 203 du lot 06 sont copiés à l’octet sous
`public/game/warp-universe/20261109/`. Les deux images manquantes P0 ont été
générées avec `image_gen`, puis ouvertes et inspectées :

- **200** : salle de synchronisation vide, alcôves et sol dégagé ; PNG opaque.
- **202** : cadre de sas, avec véritable alpha dans l’ouverture centrale et à
  l’extérieur. Les panneaux fermés sont rendus séparément dans le jeu et leurs
  collisions ont le même seuil ; ce PNG n’est pas un cycle animé.

Le décor historique 199 contient déjà pylônes et consoles. Il demeure un
candidat dont le critère « baie modulaire vide » n’est pas validé ; le pilote
n’ajoute pas de portail indépendant en doublon sur sa peinture.
Les personnages 201 et la mémoire 203 sont des créations originales du projet,
pas des identités cinématographiques homologuées.

## Ressources P1

`public/game/warp-universe/20261109-p1/` contient **17 nouveaux PNG** :
098, 178–180, 184–186 et 189–198. Les onze sprites comportent de vrais pixels
transparents ; les six fonds sont opaques. Les originaux générés sont conservés
sans retouche, découpage, réduction ou normalisation silencieuse de l’alpha.
Chaque PNG a été ouvert et inspecté par l’agent, avec dimensions, alpha et
empreinte dans `assets-p1.json`. Ce contrôle ne constitue pas une revue artistique
humaine ou une homologation 1:1.

Les prompts exacts sont conservés dans `generation-briefs.json` et les résultats
dans `generation-results.json`. La galerie de revue est disponible à
`/game/warp-universe/20261109-p1/index.html`. Aucun des 17 nouveaux candidats
n’est importé dans les missions : un mécanisme dessiné ne fournit pas ses états,
ses animations, ses commandes ou sa physique.

Quatre demandes restent sans candidat :

- **097** : deux tentatives de guerrier Xénomorphe ont été rejetées par le
  service de génération en sortie (`moderation_blocked`, catégorie `other`).
  Les identifiants des requêtes sont consignés ; aucune image n’a été livrée.
  Le drone ou le Praetorian existants ne sont pas renommés en guerrier.
- **208** : identifier les plans du village ou de la forteresse du segment
  viking de *Killer of Killers* ; le fjord original WU-E05 n’est pas substitué.
- **209** : fixer la phase du récit japonais, qui comporte un saut de vingt ans,
  et les plans précis du château avant reproduction.
- **210** : identifier le navire, la scène et l’orientation du pont du segment
  aérien de 1942, dans l’Atlantique près de Casablanca.

Le métro 186 garde un quai libre mais les rails le séparent des escaliers peints
au fond : son raccord praticable reste à construire avant usage en gameplay.
Les modèles nationaux précis du téléphone 196 et de la génératrice 197 restent
à homologuer. Les autres besoins de scénario, d’IA, d’animation et de retour
persistant des branches Warp conservent leurs critères ouverts.
