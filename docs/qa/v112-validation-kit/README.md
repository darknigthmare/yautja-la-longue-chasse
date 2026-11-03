# Carnet de qualification réelle V112

Le [carnet public facultatif](../../../public/aide/qualification-chasse.html), servi à
`/aide/qualification-chasse.html`, prépare les essais humains et matériels encore
ouverts. Il n’est pas ajouté au menu du jeu. Il ne lit ni ne modifie le jeu, ses
sauvegardes, les critères ou le classeur. **Aucune session humaine, aucun téléphone,
aucune manette physique et aucune application Microsoft Excel ne sont qualifiés par
ce kit. Aucun item de Restant n’est fermé.**

Le carnet reprend exactement les règles et critères de `REM112-01` à `REM112-05`
et `REM112-07` de [la source de suivi](../../hunt-mechanics-v112.json). Les neuf
tâches et la cible de cinq novices viennent du
[protocole débutant existant](../v112-hunt/beginner-protocol.md), conservé.
Les campagnes intégrales REM112-06 et REM112-08 restent des essais distincts.

## Utilisation par le validateur

1. Ouvrir la page dans le navigateur du matériel réellement utilisé, noter
   manuellement modèle, OS, navigateur, version jouée, périphériques et conditions.
   Un user-agent, le tactile ou l’existence de l’API Gamepad ne détermine jamais
   qu’un appareil physique a été testé.
2. Si utile, consentir au relevé local des capacités de **la page d’aide**. Le
   consentement est révocable et efface les informations du rapport. Ce relevé ne
   mesure pas le jeu et ne recherche pas de périphérique.
3. Exécuter les étapes dans le produit réel, ouvert séparément. Consigner les
   gestes, rotations, pertes de focus, interruptions, remappages, débranchements et
   reconnexions effectivement essayés. Les captures restent des fichiers gérés par
   le validateur : le carnet propose seulement d’en noter les noms anonymes.
4. Pour les novices, lire seulement les objectifs ; observer aide, première action,
   chemin, durée, erreurs, lecture du guide, résultat et explication. Les cinq
   participants et les 45 tâches restent vierges par défaut. L’essentiel est la
   compréhension observée, pas un temps ou une case coché automatiquement.
5. Laisser `NON_EXECUTE` lorsque rien n’a été essayé. Utiliser `PARTIEL` pour une
   exécution bornée, une preuve incomplète ou une compatibilité LibreOffice.
   `ATTESTE_PAR_VALIDATEUR` signifie uniquement que le validateur atteste les essais
   décrits, y compris leurs écarts. Cela n’est ni un PASS ni une certification.
6. Relire le JSON puis choisir son téléchargement. Toute modification exige une
   nouvelle relecture. Aucun envoi ni stockage navigateur ; un rechargement efface
   le carnet. Garder le JSON et ses captures sous son contrôle avant tout partage.
   Un relecteur peut ensuite associer SHA, appareil, session et pièces anonymes à
   la ligne du classeur, sans élargir leur portée.

La page est autonome, sans dépendance ni requête après son chargement. Sa politique
de sécurité interdit les connexions et soumissions réseau. Le rapport est
déclaratif, modifiable et non signé ; sa fiabilité dépend de l’observation humaine
et de la revue des pièces. Il ne contient jamais de liste de critères fermés.

## Vérification du carnet

Exécution du 2 novembre 2026, checkout basé sur
`e4a6c64a1e77edad8865aa05ca7c2901d62bfa09`, Node **24.19.0**, Chromium installé
**154.0.8037.57**, via serveur HTTP local temporaire :

```sh
node scripts/qa-qualification-kit-v112.mjs
```

Le contrôle a réussi : consentement et révocation, états vierges, source des critères
identique, refus des attestations incomplètes, séparation Excel / LibreOffice,
téléchargement strictement identique au JSON relu, invalidation après modification,
absence de stockage et de requête après le chargement, effacement au rechargement.
Les données de test sont synthétiques et ne constituent aucune session réelle.
Le navigateur et le serveur sont arrêtés après le test.

Les champs ont une étiquette programmatiquement associée ; le lien d’évitement
fonctionne au clavier. Aucun débordement horizontal n’a été observé à **390 × 844**
et **1280 × 900**. Les deux captures ont été ouvertes et inspectées :
[mobile](carnet-390.png), [bureau](carnet-1280.png). Ces contrôles ciblés ne
constituent pas un audit exhaustif d’accessibilité ni une session tactile physique.

## Compatibilité LibreOffice distincte

L’inventaire de cet environnement Linux retrouve `soffice` déjà installé,
**LibreOfficeDev 26.8.0.0.alpha0**, commit
`2c87e51eeaa2b413ff4ae097b2705eea1995d8e5`. Aucun exécutable `excel` n’est
disponible dans le PATH ; les chemins d’installation usuels inspectés n’ont pas
fourni d’application Microsoft Excel native. Aucun OS, paquet Office ou composant
payant n’a été installé.

```sh
python scripts/qa-workbook-libreoffice-v112.py
```

Ce contrôle copie le XLSX dans un répertoire temporaire, l’ouvre réellement dans
LibreOffice headless, réexporte une copie XLSX et un PDF, compare les cellules, les
destinations des liens, les définitions de filtres et les volets, puis vérifie que
le classeur source n’a pas été modifié. Les copies sont supprimées après le test.
Le [rapport de compatibilité](libreoffice-compatibility.json) précise le hash de la
version concernée. **La conservation de ces métadonnées ne prouve ni le clic d’un
lien ni l’utilisation interactive d’un filtre ou d’un volet dans Microsoft Excel.**

Sur le classeur initial de SHA-256
`9e46b2e8ab8f8482458b79aaaf1c7d53bcd299fa25d443f465ac5d3ac367e58e`, les
**21 feuilles**, **4560 cellules non vides**, **569 destinations de liens**, filtres
et volets équivalents ont été conservés. Une seule sérialisation numérique change :
`Parametres!D36`, `0.008333333333333333` devient `0.00833333333333333`, dans la
tolérance de comparaison explicitée par le script. LibreOffice remplace aussi des
infobulles de liens par des attributs d’affichage ; les destinations sont conservées.

Le premier export comporte **112 pages**. L’inspection des
[pages 1](libreoffice-initial-page-001.png) et
[112](libreoffice-initial-page-112.png) a révélé une répartition horizontale des
colonnes : la colonne F « Validation / limite » apparaît sur une autre page. Cela
constitue un incident de mise en page à traiter, pas une impression qualifiée.
Le [détail initial](libreoffice-initial-detail.json) conserve ce contexte. Les 112
pages n’ont pas toutes été inspectées. Le dialogue natif d’impression n’a pas été
essayé.

REM112-07 reste ouvert jusqu’à l’ouverture et l’usage du fichier livré dans
**Microsoft Excel natif**, avec version Excel / OS, SHA-256, absence d’alerte de
réparation, filtres, volets, liens et impression réellement essayés. La page inclut
ce protocole ; une conversion LibreOffice, un ZIP/XML correct ou un test logiciel
du carnet ne le remplace pas.
