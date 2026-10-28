# Preuves spatiales V112

`audit.json` et `model-audit.log` décrivent les modèles courants : 51 façades, 20 098 échantillons d’arêtes, 95 points sans support avant et zéro après ; six socles ; six meubles admis sur dix propositions ; 392 origines naturelles, 315 admises, 77 refusées et zéro intersection résiduelle avec le pavement ; 39 formations courantes. Le résultat de présence n’est pas une mesure 3D canonique ni une certification visuelle.

`assertions.log` contient les quatorze assertions V112 de fondation, faces naturelles, mobilier et admissions naturelles. `ecotones-assertions.log` contient les sept assertions V112 des matériaux, masques, arrivées desktop/mobile et codex. Toutes passent. Les captures et parcours sur le build compilé sont produits par la recette commune V112, séparément de ces vérifications de modèle et SSR.

Les essais en échec restent conservés : `initial-foundation-test-failed.log` expose le joint de seize unités sous la maison voisine, corrigé par une lèvre de quatre unités ; `initial-natural-codex-test-failed.log` expose les dix-huit entrées ajoutées après le premier mapper de codex ; `initial-ecotone-codex-test-failed.log` expose le namespace documentaire V90 résiduel des trois écotones refusés.

`before-natural-correction-audit.json` conserve le constat des 77 contacts naturels sur le pavement avant la nouvelle admission. `historical-regressions.log` rapporte les 26 assertions historiques V81/V85/V90/V92 passées avant ce changement de consommation. Ce journal ne certifie pas le registre naturel V112 ultérieur. `historical-v90-current-runtime-failed.log` conserve la tentative de quinze assertions V81/V85/V90 contre le runtime courant : onze passent, quatre attendent encore explicitement les sélecteurs ou la révision V90 dans la scène actuelle. Les sept assertions V90 d’origine restent inchangées et peuvent être exécutées sur leur contexte historique ; leur adaptation V112 vérifie le fournisseur et les fiches courants sans réduire les critères de surface ou de source.

Aucune image n’est éditée ou ajoutée par ce chantier. Les sources et coordonnées rejetées sont conservées ; les instances ne sont pas relocalisées automatiquement.
