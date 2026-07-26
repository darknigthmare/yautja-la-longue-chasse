# V14 — paires de vaisseaux calées sur références

Ce lot produit huit paires prioritaires. Sept remplacent les interprétations
génériques par des reconstructions originales du projet calées sur des
références visuelles dédiées. Le pod AVP a été promu après correction de ses
trois émetteurs arrière. Le Game Preserve reste une étude non canonique : son
dessus restitue quatre pods périphériques, mais son profil reste insuffisant.

## Règles du pipeline

- Une incarnation précise par entrée ; aucun mélange entre films.
- Les images de référence téléchargées restent uniquement sous `tmp/` pendant
  la production et ne sont jamais publiées ni versionnées.
- Seules leurs URL et les contraintes observées sont conservées dans
  `ship-reference-sources.json`.
- Chaque coque reçoit deux appels ImageGen distincts : un profil/trois-quarts
  et un vrai dessus dorsal orthographique à 90°.
- Les maîtres sont générés sur chroma vert puis détourés vers les WebP alpha de
  `public/game/ships/v14`.
- Le runtime résout V14 avant V12/V13 pour les sept identités acceptées.
  V12/V13 reste disponible dans le hangar comme extra original historique.
- L’étude V14 du Game Preserve reste accessible comme approximation guidée par
  ses sources, avec
  `canonReplacement=false`, sans remplacer le runtime historique.

## Registres

- `ship-reference-sources.json` : pages, images de soutien et verrous visuels.
- `ship-generation-prompts.jsonl` : appel et contrat de vue de chaque rendu.
- `ship-asset-manifest.json` : chemins, dimensions et SHA-256 des maîtres et
  assets runtime.

Les rendus V14 sont des créations fan-made originales du projet. Les marques et
œuvres citées appartiennent à leurs ayants droit respectifs.
