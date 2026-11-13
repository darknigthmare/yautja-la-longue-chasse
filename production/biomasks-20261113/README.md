# Masques documentés — lot du 13 novembre 2026

Ce lot ajoute **13 PNG candidats**, chacun contenant une seule vue statique de
masque : Elder PHG, Immortal, Nocturne, Phalanx, Phoenix, Plague, Inferno, Prophet,
Eclipse, Journeyman, Arthos, Ravager et Exiled. Les contours suivent des références
frontales communautaires nommées et épinglées ; aucune certification canonique
1:1, validation artistique humaine, animation ou intégration en jeu n'est déduite.

L'inventaire recroise **110 entrées nommées** dans la bible et 122 classeurs. Il
inclut variantes, bases partagées, créations originales et trois têtes sans
biomask détachable. Ce nombre ne représente pas 110 géométries distinctes ni un
total connu de PNG manquants : `exactMissingImagesRequired` reste `null`.

Les statuts source sont conservés. `selectedBatchComplete` signifie seulement
que les treize vues sélectionnées sont présentes ; `allMasksGenerated` reste
faux. Les détails non établis, autres angles, couleurs et ajustements UV restent
ouverts, même lorsqu'une vue candidate existe déjà.

## Références et limites

Les DDS viennent du port communautaire `Matthelzor/pd2-predator-pack`, commit
`967905f04f02f702e89e0ca976bac712c516a4e9`, dont le README attribue des ressources à
PHG/IllFonic et à d'autres jeux. Cette provenance ne constitue pas une validation
par l'éditeur. Les sources DDS et captures de diagnostic ne sont pas republiées :
les URL, SHA256, Git blobs, noms et citations exactes sont conservés dans le
manifeste et les instantanés `inputs/`.

L'amendement de géométrie est obligatoire : les DDS et canvases sont de
256×256 pixels, mais les captures réellement fournies à ImageGen sont de
256×257 pixels à cause d'un arrondi de positionnement du navigateur. Aucun
redimensionnement ou recadrage n'a corrigé leurs octets après génération ;
aucune correspondance brute pixel pour pixel DDS/capture n'est affirmée.

Les revues visuelles d'agents sont citées séparément de la validation humaine.
Elles conservent notamment l'incertitude sur les pièces latérales d'Immortal
et les ouvertures interprétées entre les nervures de Plague : l'alpha d'une icône
HUD peut coder la luminosité sans prouver un trou physique. Une revue visant un
ancien candidat est identifiée comme telle après correction ; elle ne valide
pas automatiquement le nouveau PNG.

Emissary reste exclu de cette production : sa référence acquise est un
pictogramme plat. Les symboles Pirate et Bionic ne démontrent pas non plus un
volume et des matériaux ; Bionic est une tête à implant, pas un masque détachable.
Elder PHG n'est pas confondu avec Greyback, Golden Angel ou l'Elder AVP. Les
illustrations V44 fournies restent des costumes illustrés, sans autorité
canonique transférée par leur nom d'archive.

## Vérification et reconstruction

Depuis la racine du dépôt, avec Python 3 et Pillow :

```sh
python3 production/biomasks-20261113/tools/build-mask-pack.py --write --require-complete
python3 production/biomasks-20261113/tools/verify-mask-pack.py --check --require-complete
```

Le premier instantané de recherche a été créé avec `--snapshot-inputs`, avant
publication, depuis les résultats locaux. Cette option refuse de remplacer des
octets déjà figés ; elle n'est pas nécessaire après clonage. Les autres commandes
ne dépendent pas de `/tmp` ni du préfixe original du checkout. Les références
internes héritées du chemin exact `/workspace/yautja-la-longue-chasse/` sont
rattachées au dépôt courant avant les gardes de chemin ; les références privées
restent des noms et empreintes, sans devenir des dépendances locales obligatoires.

Le vérificateur contrôle les SHA et copies natives, dimensions réellement lues,
alpha transparent et matériau opaque, marges et pivots proposés, unicité des
treize identités documentées, citations, XML et cellules du classeur. Il exige
une reconstruction identique des sorties. Les anciens packs, leurs 49 PNG,
preuves et outils, les 122 XLSX antérieurs et le workflow P0 publié sont protégés
dans `suivi/source-protection.json`. Aucun de ces fichiers n'est réécrit.

Le dossier public refuse tout fichier hors des treize PNG déclarés, du manifeste
et de la galerie : aucun DDS, capture ou essai rejeté ne peut y être compté
comme ressource livrée. Pillow lit et mesure uniquement les images ; aucun
fichier raster n'est découpé, recoloré, redimensionné ou réencodé par cet outillage.

## Galerie et classeur

Ouvrir `/game/biomasks-20261113/review.html` depuis le serveur du dépôt, ou le
fichier HTML avec ses dossiers adjacents. Les filtres distinguent identité
canonique à vérifier, création originale, tête sans masque, base partagée et
géométrie inconnue, ainsi que la priorité effectivement déclarée. Les fonds
damier/sombre/sol, bornes alpha, pivots et détails de provenance ne modifient
aucun PNG et n'écrivent pas de sauvegarde du jeu.

`suivi/Yautja_Masques_Manquants_20261113.xlsx` contient six feuilles : Synthèse,
Inventaire110, PNGs, Références, Blocages et Sources. Les comptes des PNG, noms
documentaires, incarnations et validations gardent des dénominateurs distincts.
L'ancien sérialiseur OpenXML est réutilisé comme fonction pure, sans modification
de son fichier épinglé. Les classeurs antérieurs restent inchangés.
