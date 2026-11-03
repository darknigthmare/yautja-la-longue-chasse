# Yautja — Enforcers V6.12

**36 nouveaux PNG : un Porte-liens (06) et un Inspecteur des passages (07) pour chacun des 18 groupes.** La galerie cumulative rassemble les **72 individus V6.11 et V6.12**.

- [Galerie des 72 PNG avec filtres et téléchargements](index.html)
- [Suivi Excel actualisé](Yautja_Suivi_Variantes_V612_2026-10-21.xlsx)
- [PR GitHub nº 9 — nouveau lot V6.12](https://github.com/darknigthmare/yautja-la-longue-chasse/pull/9)
- [Dossier Google Drive](https://drive.google.com/drive/folders/1r4uWvqvdHiDLA2td1cNqTi8i9-YxHNi5)
- [Manifeste des nouveaux fichiers et observations visuelles](data/production-manifest.json)

## Les nouveaux individus

Le **Porte-liens** porte ses liens de capture fermés à la ceinture, des épaulières dissymétriques et un biomask argenté à pointes latérales. L’**Inspecteur des passages** dispose d’un appareil de contrôle au poignet et d’un sceau de fonction ; sa pose laisse lire le geste de coordination. Les deux variantes reprennent la famille de tenue des Enforcers du comic et les proportions propres à leur groupe.

| Groupes | Variantes nouvelles |
|---|---|
| Super Predators, Feral, Assassin augmentés | 06 et 07 pour chacun |
| Spiked Tail, Hornhead | 06 et 07 pour chacun |
| Saar-Keth, Ul-Khar, Sha-Rhess, Kaal-Or, Vaal-Tir | 06 et 07 pour chacun |
| City Hunter, Pilot, Oni, Grendel | 06 et 07 pour chacun |
| Alpha, Yautja bioniques, Quatre-Bras | 06 et 07 pour chacun |
| Humains acceptés | 06 et 07 |

Les humains conservent un visage et une anatomie humains, une armure adaptée et des dreadlocks de cheveux. Un demi-masque rend leur visage lisible. Le Pilot garde son crâne chauve. Les Quatre-Bras ont quatre bras organiques ; les Bionic suivent une carte de prothèses individuelle : **avant-bras droit et optique gauche pour 06, jambe gauche et deux mains organiques pour 07**.

Les cinq groupes endémiques sont des créations du projet. Les autres groupes suivent son classement de lignées et d’adaptations ; ce classement ne transforme pas une apparence individuelle de film, comic ou figurine en espèce officiellement établie. Les masques peuvent cacher certains détails du visage. Les observations et écarts constatés sont conservés dans le manifeste, sans certification officielle d’une fidélité anatomique 1:1.

Chaque fichier livré est un **PNG natif indépendant de 1 024 × 1 536 pixels, RGBA avec transparence**. Les sorties retenues sont copiées à l’identique, sans recoloration, redimensionnement ni découpage après génération. Les retouches éventuelles sont de nouvelles sorties natives, consignées avec leurs prompts et les empreintes des entrées.

## Suivi cumulatif

| Statut | Nombre d’identifiants |
|---|---:|
| Présente dans main | 2 125 |
| Produite — à vérifier | 205 |
| Conservée hors main | 36 |
| Pas faite | 2 754 |
| Perdue — à recréer | 0 |
| **Total** | **5 120** |

Les 36 nouvelles identités passent de « Pas faite » à « Conservée hors main ». La PR nº 7 a été fusionnée pendant la reprise, le 21 octobre 2026 à 14:24:12 UTC. Ses 36 PNG V6.11 passent donc de « Conservée hors main » à « Présente dans main ». Leurs octets et leur registre sont vérifiés dans le main `dbd7625ade2c83d133875138516fb21fae2aa7bf` ; la [preuve de réconciliation](data/main-reconciliation.json) conserve les empreintes et les références GitHub. Les autres lignes du suivi sont préservées.

L’onglet **Production PR contient 108 lignes** : 36 traces V6.10 dont les PNG restent à retrouver, 36 PNG V6.11 dans main et 36 PNG V6.12 dans la PR nº 9. Les empreintes, notes et dates des 72 anciennes lignes restent conservées ; les formules de statut des 36 V6.11 reflètent leur fusion. Les dates nouvelles sont des horodatages relevés lors de la production et de sa vérification ; elles ne sont pas présentées comme des heures exactes fournies par le service de génération.

Le nouveau lot est relié à la **galerie et au codex de la branche de la PR nº 9**, créée depuis le main qui contient déjà V6.11 et les planètes V101. Il ajoute des poses fixes. Il n’ajoute pas de cycles d’animation ni de placements sur les cartes. Les 973 sélections automatiques antérieures restent inchangées.

## Reprise après interruption

Le dépôt V6.11, les 36 références visuelles et le catalogue historique de 4 069 fiches ont été récupérés et vérifiés par empreinte. Les octets des premières images V6.12 non publiées n’ont pas été retrouvés dans les emplacements contrôlés. Leur [journal d’interruption](recovery/interrupted-output-history.json) conserve les 12 empreintes observées, sans conclure à une perte définitive.

Les images de cette livraison sont des sorties disponibles et vérifiées après la reprise. Elles ne sont pas présentées comme des copies récupérées des images interrompues. Les [sauvegardes intermédiaires](recovery/native-checkpoint.json) ont permis de publier les nouvelles sorties progressivement avant la mise à jour cumulative du classeur.

Le [plan de production](references/production-plan-v612.json) distingue les briefs historiques récupérés, les adaptations demandées et les prompts de travail reconstruits. Les prompts réellement soumis et les tentatives retenues figurent dans le manifeste de production.

## Classeurs et archive de téléchargement

Les neuf classeurs originaux du projet restent inchangés. Leur [liste avec empreintes](../v611/data/other-workbooks.json) est conservée, et ils sont inclus dans l’archive cumulative avec le suivi actualisé et les anciennes versions de référence.

Après décompression complète du ZIP, ouvrir son fichier `index.html`. La galerie propose les filtres par groupe, lot, variante et texte, ainsi qu’un fond clair ou à damier. Les images et téléchargements restent accessibles sans JavaScript. Conserver l’arborescence extraite pour que les liens locaux fonctionnent.

L’archive regroupe les livraisons V6.11 et V6.12, leurs raccords au jeu et les classeurs ; elle ne contient pas tous les anciens fichiers du jeu. Le dépôt GitHub reste la source d’un checkout complet.

## Vérifications

Le [rapport de validation](validation.json) consigne les contrôles du lot, du runtime et de la galerie. Les tests vérifient les 36 identités attendues, les octets et la transparence des PNG, les 36 fichiers V6.11 conservés, le raccordement galerie/codex, les sélections antérieures et la séparation entre corps humains et Yautja.

Le [contrôle OpenXML](workbook-preview/openxml-verification.json) compare le classeur au V6.11 : identifiants, valeurs, historique de production, formules, six tables et filtres, règles conditionnelles, volets figés, cellules fusionnées, polices et couleurs. Le [test de recalcul](workbook-preview/recalculation-check.json) change réellement un statut, vérifie les compteurs et la ligne de production liée, puis restaure la valeur finale. Les aperçus ciblés contrôlent les vues modifiées ; la vérification ne remplace pas une session dans l’application Excel.

Les scripts `build-enforcer-production-v612.mjs`, `build-enforcer-workbook-v612.mjs`, `verify-enforcer-workbook-v612.py` et `build-enforcer-gallery-v612.mjs` documentent la construction. Le classeur est édité avec le runtime `@oai/artifact-tool`, séparé des dépendances du jeu. Le script `package-enforcer-production-v612.py` vérifie que les octets du ZIP correspondent au commit publié et aux empreintes des classeurs originaux.

L’auteur du classeur applique les 504 changements audités dans les deux bandes de colonnes concernées, sur une feuille source dépourvue de formules. Il conserve les valeurs importées des autres cellules de ces bandes. Cette méthode limite les recalculs automatiques. Avec `--checkpoint-only --checkpoint=<chemin absolu>`, le script sauvegarde le modèle vérifié par l’API publique `workbook.toProto()` ; `--resume-checkpoint --checkpoint=<même chemin> --export-only` le recharge dans un processus neuf pour exporter le XLSX avant tout rendu. Les options Node utilisées sont `--expose-gc --max-old-space-size=2560`, avec suffisamment de mémoire libre pour l’export. Les formules des autres feuilles restent conservées et contrôlées séparément.

La fusion de la PR nº 9 et un déploiement éventuel restent des opérations séparées. La fusion antérieure de la PR nº 7 est un fait constaté, pas une action de cette livraison.
