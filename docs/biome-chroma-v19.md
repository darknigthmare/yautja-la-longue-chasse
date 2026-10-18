# Traitement chroma V19

`scripts/process-biome-decor-v19.mjs` conserve le PNG source et produit les
masters et exports runtime du catalogue. Le helper Python installé par
imagegen reste prioritaire lorsqu’il existe. `--helper`, l’option `helperPath`
ou `BIOME_DECOR_CHROMA_HELPER` imposent un chemin explicite : son absence ou
son échec interrompt le traitement.

Lorsque seul le chemin par défaut est absent, le pipeline utilise
`scripts/remove-biome-chroma-v19.mjs`, un traitement Sharp propre au projet.
Il calcule une transparence progressive par distance RGB au fond vert ou
magenta, avec les seuils 12 et 220, retire le débordement de couleur aux
bords et nettoie le RGB des pixels transparents. Il préserve les couleurs
opaques suffisamment éloignées du fond et n’augmente jamais l’alpha source.
Ses résultats ne sont pas annoncés comme identiques au helper Python.

Chaque résultat indique le mode `python-helper` ou `portable-sharp-v19`,
le chemin, le SHA256 du script et les paramètres utilisés. Les anciens
rapports d’assets conservent la provenance de leur génération initiale.

Vérification des pixels, de la sélection du helper et du pipeline complet
sur les huit biomes :

```sh
node --experimental-strip-types --test tests/biome-chroma-v19.test.mjs tests/biome-decor-v19-pipeline.test.mjs
```
