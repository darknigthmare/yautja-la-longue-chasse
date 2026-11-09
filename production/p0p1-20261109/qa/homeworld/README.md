# Homeworld, planètes et trajets — 9 novembre 2026

L’audit reprend 107 sujets P0/P1 Homeworld (4 P0 et 103 P1, dont 97 cibles V81)
et 582 sujets Guerre des clans (325 P0 et 257 P1). Ce sont des déclarations
source à rapprocher du runtime, avec des critères historiques qui se recoupent.
Les anciens classeurs et reçus restent inchangés.

## Changements réels

1. **Continuité du rappel Outer Ops.** Le retour commençait au bout du passage
   courant entier, même lorsque seule une fraction avait été parcourue. Le
   retournement conserve maintenant la position atteinte : 20 % à l’aller
   correspond à 80 % dans le sens inverse. Seuls la fraction atteinte et les
   passages déjà franchis sont retracés. Un carrefour exact n’ajoute aucun
   passage encore intact. Les délais, archives, coûts, membres, IDs et reçus
   sont conservés. Les archives authentiques PR #55 et #57 restent lisibles
   et se règlent une seule fois.
2. **Exports de l’Atlas.** Les boutons utilisaient les sources brutes V120,
   alors que l’écran affichait la géographie et le climat V126. Les CSV et JSON
   exportent maintenant cette vue courante. Le JSON version 126 conserve chaque
   fiche V120 complète sous `variants[].original` ; le CSV distingue les champs
   actuels des champs source. Les lieux terrestres restent sur Terre, sans
   coordonnées inventées, et les dangers et météos suivent V126. Les 1 200
   fiches gardent leur statut de conception.

## Vérification

Les suites ciblées comptent 98 tests, dont 13 nouveaux tests comportementaux
(huit pour le rappel et cinq pour les exports). Les 49 contrôles géographiques
préexistants portent le total à **147 réussites, zéro échec**. Les 1 200 fiches
parcourues dans ces tests ne sont pas ajoutées une seconde fois au total.
ESLint contrôle cinq fichiers sans avertissement. TypeScript, build et recette
navigateur sont à consigner séparément sur l’assemblage final.

## Homeworld

L’audit moteur mesure 71 ancrages accessibles, aucun centre bloqué et aucun
sommet de résident dans un solide. Le contrôle des segments échantillonne
9 769 positions sans collision. Les quatre petites poches de sol enclavées
ne portent aucun service ni objectif ; aucun placement n’a été modifié.
Cela ne clôt pas l’admission artistique des candidats V162 ni les exigences
de porte, caméra, empreinte et revue humaine.

[verification.json](verification.json) contient les commandes, empreintes et
la portée des sept critères rapprochés. Le registre global du lot conserve les
déclarations et leurs cellules d’origine. Les journaux TAP restent bruts,
y compris la reproduction initiale de sept échecs avant correction ; la suite
finale ajoute un huitième cas de détour autorisé.

Cette passe n’atteste aucun déploiement, serveur autoritaire, essai avec une
manette physique, nouvelle animation ou validation artistique humaine.
