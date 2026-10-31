# V134 — Conformité décals, masques et suivi de production

Le fichier `docs/production/Yautja_PHG_Personnalisation_Audit_Production_V134.xlsx` conserve les **11 feuilles V133** et ajoute **3 registres supplémentaires** : `Assets V134`, `Régressions V134` et `Couverture V134`. Il contient les SHA-256 des ressources locales, les conditions de validation artistique et les blocages CI confirmés au 31 octobre 2026.

## Correctifs appliqués
- Ajout des sept `concept-v133-*` dans le fallback V6 sans substitution de leur véritable sprite V133.
- Copie de l'atlas V132 et des assets V133 dans le checkout CI réduit ; la disponibilité du fichier est contrôlée avant la revendication « installé ».
- Correction du test d'intégrité V132 : le registre contient désormais sept IDs, non zéro.
- Ajout de tests pour les 48 decals, les 7 masques conceptuels, les identifiants sauvegardés et l'application en `source-atop`.
- Correction des plans de profondeur CSS entiers et adaptation des tests de comptage à **77 matières** dont **sept biomasks V132**.
- Les 34 dossiers de fidélité de V122 restent ouverts. Les ressources sont originales et reconstruites ; **aucune UV officielle PHG ni conformité pixel 1:1** n'a été prouvée.

## Périmètre non achevé

Ces tests prouvent la structure et les raccords. Ils ne prouvent pas que les vues face/profil/dos, les six morphologies, chaque pose, la conservation du framerate et les références nommées PHG sont artistiquement validées. Les 156 matériaux sources de V120 ne sont pas tous installés dans le jeu et les 48 decals sont des créations originales inspirées de PHG.
