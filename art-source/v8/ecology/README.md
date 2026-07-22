# Écologies planétaires V8

Cette production fournit une norme réelle de **30 ennemis par planète** pour
les huit destinations du jeu : 24 espèces endémiques et six menaces communes.
Les espèces communes partagent volontairement le même ID et le même bitmap sur
toutes les planètes. Le catalogue représente donc 240 affectations de gameplay
mais exactement **198 planches physiques**.

## Production visuelle

- cinq masters OpenAI natifs ont été créés séparément pour Naraka-Delta,
  Serekh-9, Pelagos-M, Mycora-V et Acheron-Sigma ;
- un sixième master transversal documente les cinq nouveaux apex ;
- chaque master natif contient cinq familles et six poses par famille ;
- les masters chroma utilisent un fond plat `#ff00ff` ;
- les versions alpha ont été produites avec le helper officiel
  `remove_chroma_key.py`, en soft matte et despill ;
- les silhouettes V7 originales servent de base anatomique aux trois biomes
  existants, aux humanoïdes et aux Bad Blood ;
- treize masters OpenAI supplémentaires (`supplemental/a`, `b` et `c`)
  fournissent **65 lignes anatomiques dédiées** : les 59 incompatibilités
  relevées par l'audit et six améliorations ciblées ;
- deux espèces proches réemploient explicitement une ligne supplémentaire
  compatible, tandis qu'aucun ID ne repose sur un fallback générique ;
- le script déterministe applique ensuite proportions, palette endémique et
  six familles de marquages sans modifier les IDs du catalogue.

Les prompts complets et les identifiants de génération sont conservés dans
[`generation-prompts.json`](generation-prompts.json) et dans chacun des
`supplemental/*/prompts.json`. Aucun bitmap officiel n'est inclus : les masters
sont des créations originales générées par OpenAI.

## Format runtime

Chaque fichier sous `public/game/sprites/v8/ecology` est un PNG RGBA de
`1536×192`, composé de six cellules `256×192` dans l'ordre :

1. repos ;
2. déplacement A ;
3. déplacement B ;
4. attaque ;
5. impact ;
6. mort.

Le chemin correspond exactement au `sheetPath` de `app/game/ecologyV8.ts` :

```text
/game/sprites/v8/ecology/<planetId>/<slug>-sheet.png
/game/sprites/v8/ecology/common/<slug>-sheet.png
```

## Reconstruction et contrôle

```powershell
py -3.14 scripts/build-v8-ecology-sprites.py
node --test tests/ecology-v8-sprites.test.mjs
```

Le builder lit directement `ecologyV8.ts`, refuse tout autre total que
192 endémiques + six communes, construit les 198 strips, contrôle les 1 188
cellules, l'alpha, les dimensions, les coins transparents, le chroma résiduel
et l'unicité SHA-256. La pose de mort doit aussi conserver au moins 20 % de la
médiane des cinq poses vivantes ; les débordements de cellule documentés sont
récupérés par overscan ciblé. Le builder régénère `manifest.json` et
`qa-report.json`.
