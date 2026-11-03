# Preserve V1–V5 — level design corrigé, décor natif et nouvelle référence de parité (2 novembre 2026)

Les grandes traques V6 ont été qualifiées avec les réserves V1–V5 figées sur la référence `03cf`. À la demande du propriétaire du projet, ce lot corrige le level design de ces réserves, leur ajoute un décor natif purement visuel, puis **fige de nouveau** les cinq réserves sur une référence régénérée. Le gel reste en place ; seule sa base change.

## Corrections de géométrie

Défauts relevés par simulation des sauts réels (impulsion -12,4, gravité 0,56, 3,8 u/tick) et par intersection des rectangles dessinés :

- **Vharuun (V1–V3)** :
  - la branche du camp, 4290/365 → 4290/280, traversait la navette du camp ;
  - la première branche de la Crête des Balises (V2/V3), 4600/360 → 4590/262, traversait elle aussi la navette du camp ;
  - les deux branches passent au-dessus de la coque et se rejoignent depuis la branche du camp (3860/351).
- **Expédition V3** :
  - la corniche du quai, 11990/365 → 11990/282, traversait le transport du quai ;
  - les couverts 7080 → 7230 et 8680 → 8600 masquaient les dépôts 7190 et 8720.
- **Avar’Kesh (V4)** :
  - la branche 2830 → 2910 dépassait dans le cargo de la canopée ;
  - le ponton 12000/355 → 11990/282 traversait le skiff des cendres ;
  - les couverts proches des rampes sont conservés : ce sont les postes des observateurs V108.
- **Khar-Duun (V5)** :
  - terrasse du skiff 12110/355 → 12060/280 ;
  - corniche du rempart 9290 → 9340 ;
  - couvert 9140 → 9230, retiré de la rampe des caravanes.
- **Iskhel (V5)** :
  - plateforme du refuge 12520/310 → 12520/265 ;
  - étai de la mine 9360 → 9400 ;
  - couvert 9170 → 9250, retiré de la rampe de la mine ;
  - couvert 11460 → 11530, qui masquait le dépôt 11480.

Toutes les plateformes et tous les postes de relevé restent atteignables. Les itinéraires des tests V104, V107, V108 et V109 et des recettes navigateur correspondantes passent par les nouvelles corniches.

## Rendu

- Les coques des appareils sont dessinées **derrière** les plateformes dans toutes les réserves, comme en V6 : une corniche qui croise une coque reste visible.
- Avar’Kesh n’affiche plus les murs de machines codés en dur de Vharuun ; ses machines suivent ses propres appareils.
- Décor natif v19 (surfaces, ornements, colonnes) généré par `scripts/generate-preserve-legacy-decor.mjs` dans `app/game/systems/gameReserveLegacyDecorData.ts`. Il ne crée aucune collision, aucun couvert, aucun danger et aucun champ de sauvegarde. Une image absente ou de taille inattendue est ignorée sans bloquer l’expédition.

## Compatibilité et gel

- La géométrie n’est pas sérialisée : aucun champ de sauvegarde ne change. Les états d’usine et normalisés des six identités V1–V5 restent identiques octet pour octet à la référence `03cf`, ce que vérifie un test dédié.
- Une partie sauvegardée debout sur une corniche déplacée retombe au sol à la reprise.
- `tests/fixtures/preserve-v6-history-20261102/legacy-baseline-03cf.json` est conservé tel quel. La nouvelle référence est produite par `scripts/build-preserve-legacy-baseline.mjs` depuis les sources exactes d’un commit Git ; son fichier indique ce commit.

## Limites

- La recette navigateur sur un build Next n’a pas été rejouée pour ces changements.
- Aucun XLSX, certificat ou gel R7 n’est modifié.
- Le test `game-reserve-native-cover-scale-v6` demande le paquet `sharp`, absent de l’environnement de travail : il n’a pas pu tourner ici.
