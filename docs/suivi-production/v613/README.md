# Yautja — Enforcers V6.13

Cette livraison ajoute **36 PNG natifs**, variantes **08 — Arbitre au filet dense** et **09 — Vétéran aux gravures usées**, pour les **18 groupes** du projet. La [galerie cumulative](index.html) rassemble les **108 PNG disponibles** de V6.11, V6.12 et V6.13, avec des filtres par groupe, lot, rôle et texte.

Le [classeur V6.13](Yautja_Suivi_Variantes_V613_2026-10-22.xlsx) suit **5 120 identifiants**. Le [manifeste](data/production-manifest.json) donne les chemins, dimensions, tailles, empreintes, observations et limites de chaque PNG. La livraison est conservée dans la [PR nº 10](https://github.com/darknigthmare/yautja-la-longue-chasse/pull/10), issue du main `017f3bd8d37457ee56d0cfeb78da9835c6388b8f`.

## État cumulatif

| Statut | Identifiants |
|---|---:|
| Présente dans main | 2 161 |
| Produite — à vérifier | 205 |
| Conservée hors main | 36 |
| Pas faite | 2 718 |
| Perdue — à recréer | 0 |
| **Total** | **5 120** |

Les 36 identités V6.13 passent de « Pas faite » à « Conservée hors main ». Les 36 V6.12 passent à « Présente dans main » après la fusion de la PR nº 9 ; les 36 V6.11 y figurent déjà après la fusion de la PR nº 7. La [réconciliation avec main](data/main-reconciliation.json) conserve les preuves correspondantes. Le statut de la PR nº 10 est distinct des fusions antérieures.

L’onglet **Production PR comporte 144 lignes** : 36 traces V6.10 dont les PNG restent à retrouver, puis 36 PNG pour chacun des lots V6.11, V6.12 et V6.13. Les traces V6.10 ne sont pas comptées parmi les 108 images livrées et ne sont pas présentées comme récupérées.

## Images et portée de la livraison

Chaque fichier est un **PNG natif indépendant de 1 024 × 1 536 pixels, RGBA avec transparence**. Les 36 sorties finales V6.13 récupérées conservent leurs octets ; leur SHA-256 est contrôlé avant la construction de la galerie et lors de l’emballage. La galerie utilise les images originales par des liens relatifs, sans produire de nouveaux fichiers redimensionnés ou recoloriés.

Les images sont raccordées à la galerie du jeu et au codex de la branche. Elles représentent des poses fixes ; les nouveaux cycles d’animation et les placements sur les cartes restent à produire. Les choix automatiques antérieurs sont conservés.

Les groupes suivent le classement du projet. Les groupes endémiques sont des créations originales. Les humains acceptés conservent un corps et un visage humains sous l’armure Yautja. Les masques, bottes et protections cachent parfois des détails biologiques ; certains cadrages offrent des marges plus faibles que la cible du brief. Les observations particulières sont consignées dans les fiches et le manifeste. Ces contrôles ne constituent pas une certification officielle de fidélité anatomique 1:1.

## Récupération après maintenance et provenance des prompts

Une maintenance a supprimé les fichiers locaux pendant la finalisation. Les **36 PNG finaux ont été récupérés depuis les objets GitHub** et inscrits dans le commit de sauvegarde `fe58028cb1afe0a9bbbd555f476b05e4afd85773`. Le dernier Pilot 09 fait partie de cette récupération ; son SHA-256 est `9e6f04b2688886189f236d0d233e12638d914193d0745eface2877155e63d9cc`.

Les données de génération ont une disponibilité différente de celle des images :

- **15 prompts exacts de sortie finale ont été retrouvés** dans des reçus dont l’empreinte correspond au PNG retenu.
- **21 prompts exacts de sortie finale n’ont pas été récupérés.** Leurs champs de preuve restent absents ou nuls dans le manifeste. Ils ne sont pas remplacés par un prompt reconstitué.
- Le [plan de production](references/production-plan-v613.json) conserve les directions et prompts prévisionnels. Un prompt prévu n’est pas une preuve de soumission au service de génération.
- Le [checkpoint historique](recovery/native-checkpoint.json) conserve les éléments sauvegardés avant l’interruption. Lorsqu’une sortie a été remplacée ensuite, le reçu de l’ancienne sortie ne prouve pas le prompt du PNG final.

Les dates de reçu, les éventuelles observations de production et la vérification après récupération sont distinguées. Les dates absentes ne sont pas reconstruites. Un horodatage de vérification ne devient pas une heure de génération.

## Classeurs et utilisation hors ligne

L’archive cumulative contient **13 classeurs XLSX** : les **neuf originaux inchangés** recensés dans leur [registre d’empreintes](../v611/data/other-workbooks.json), et quatre versions du suivi : source du 20 octobre, V6.11, V6.12 et V6.13. Les trois livraisons conservent leur documentation, leurs registres runtime, scripts et tests disponibles dans le dépôt.

Pour le ZIP complet, extraire toute l’archive puis ouvrir le fichier `index.html` situé à sa racine. Pour la livraison en parties, télécharger **toutes** les archives `Partie_XX_sur_YY.zip` et les extraire **dans le même dossier**, en conservant l’arborescence, puis ouvrir `index.html`. Chaque partie est un ZIP standard indépendant, strictement inférieur à **95 Mio (99 614 720 octets)**. Leur réunion contient exactement les fichiers du ZIP complet ; il ne faut pas concaténer leurs octets.

La galerie fonctionne hors ligne. Les 108 images, les manifestes et les classeurs utilisent des chemins locaux relatifs. JavaScript apporte les filtres, la recherche sans distinction d’accents et le choix de fond ; les images et téléchargements restent accessibles sans JavaScript. Les liens GitHub et Drive nécessitent une connexion.

L’archive contient les livraisons de production et leurs éléments d’intégration. Pour exécuter le jeu complet ou ses tests, utiliser un checkout complet du dépôt GitHub.

## Construction et vérifications

`scripts/build-enforcer-gallery-v613.mjs` construit la galerie depuis les trois manifestes et vérifie les 108 empreintes avant l’écriture du HTML. `scripts/verify-enforcer-gallery-v613.mjs` ouvre ce HTML en `file://` dans Chromium et contrôle les 108 chargements natifs, tous les liens locaux, les filtres combinés, la recherche, les mentions de provenance, le mode sans JavaScript et la largeur mobile. Les résultats et captures sont enregistrés dans `gallery-preview/`.

`scripts/package-enforcer-production-v613.py` reçoit le **SHA complet du commit déjà publié** et un dossier de sortie. Il lit les objets Git de ce commit, sans substituer des fichiers du répertoire de travail, puis vérifie les empreintes des 108 PNG et des neuf classeurs originaux. Il impose les chemins exacts des 13 XLSX et conserve les arbres des trois livraisons.

```bash
python scripts/package-enforcer-production-v613.py <SHA_PUBLIE_COMPLET> <DOSSIER_DE_SORTIE>
```

Le script produit le ZIP complet, les parties ZIP standard, `SHA256_FICHIERS.json`, `SHA256_ARCHIVES.json`, `LISEZ_MOI.txt` et `pack-verification.json`. Il vérifie chaque membre de chaque archive par SHA-256, le SHA-1 Git des fichiers du dépôt, la limite stricte de taille de chaque partie et l’égalité entre leur réunion et le ZIP complet. Les seuls fichiers d’emballage créés hors du commit sont `publication.json`, l’`index.html` racine, `LISEZ_MOI.txt` et `SHA256_FICHIERS.json` ; leur provenance est indiquée séparément.

Le [rapport global de validation](validation.json) rassemble les résultats. Les **17 tests ciblés** passent, ainsi que la vérification TypeScript complète et ESLint sur les fichiers JavaScript/TypeScript modifiés. Les **973 choix automatiques antérieurs** restent inchangés. Les [preuves runtime](validation/runtime-validation.json) détaillent le raccordement à la galerie et au codex.

Le [contrôle OpenXML](workbook-preview/openxml-verification.json) confirme **631 formules, six tableaux avec filtres et 21 règles conditionnelles**, sans erreur de formule. Les valeurs, dates et styles historiques sont préservés. Le [test de recalcul](workbook-preview/recalculation-check.json) change réellement un statut, vérifie les compteurs et la ligne liée, puis restaure la valeur finale. Les vues modifiées ont été inspectées ; aucune session dans l’application Excel native n’est revendiquée.

La fusion de la PR nº 10 et un déploiement éventuel sont des opérations séparées de la création des archives.
