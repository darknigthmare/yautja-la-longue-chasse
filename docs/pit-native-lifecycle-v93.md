# The Pit — dessins natifs de présentation V93

Ce lot ajoute **11 PNG originaux acceptés, 66 dessins et 22 clips orientés** pour quatre costumes masqués précis. Chaque famille possède une page indépendante, avec trois dessins vers la droite et trois dessins vers la gauche. Les deux côtés sont dessinés nativement ; le moteur ne retourne pas le personnage par miroir.

| Costume exact | Nouvelles pages V93 | Référence de hauteur commune |
| --- | --- | ---: |
| Jungle Hunter `jungle-hunter-avec-casque-53f4eb349a` | garde, étourdissement, provocation | 420 px |
| Scar `scar-avec-casque-6a0a69930d` | garde, étourdissement, provocation | 460 px |
| City Hunter `city-hunter-avec-casque-12136078fe` | garde, étourdissement, provocation | 473 px |
| Wolf `wolf-avec-casque-4261aca172` | étourdissement, provocation | 420 px |

Les gardes natives Wolf V91 sont conservées, ainsi que les cérémonies Jungle Hunter V51 déjà présentes. V93 ne régénère pas ces dernières. Les nouvelles pages sont prioritaires dans le registre pour leur costume, leur famille et leur orientation uniquement. Les variantes sans masque ne prennent jamais les animations d'un autre costume.

## Périmètre artistique

Les références sont les PNG fournis du catalogue V44 : `53f4eb349a…`, `6a0a69930d…`, `12136078fe…` et `4261aca172…`, avec les gardes Wolf V91 comme références complémentaires. Les silhouettes, masques, mains, attaches et équipements ont été relus sur les originales. Les gestes sont créés pour le jeu ; ni l'apparence canonique 1:1, ni une chorégraphie de film, ni un cycle complet détaillé ne sont certifiés. **Trois phases dessinées par orientation restent une animation provisoire courte.**

Les grandes gouttières demandées ne sont pas toutes atteintes. City Hunter possède des séparations verticales mesurées de **33 à 46 px**, malgré une reprise par page ; la cible de 150 px n'est pas atteinte. Ses rectangles de lecture entourent chaque dessin complet d'au moins deux pixels sans premier plan au seuil alpha2. Aucun pixel n'a été découpé ou déplacé dans le fichier. Jungle Hunter garde utilise les séparations réelles `[0,560,1040,1536]`, car ses rangées natives ne correspondent pas à trois cellules égales. Les autres pages conservent leurs propres mesures, sans forcer une grille incompatible ni promettre une marge absente.

Wolf possède dix originales archivées : deux acceptées et huit refusées. Les motifs définitifs et SHA se trouvent dans `art-source/v93/pit/wolf/lifecycle-review-final.json`. Les premières introductions/victoires modifiaient la propriété anatomique du pistolet ou des lames ; deux éditions natives ont échoué sur la transparence ; les défaites avaient des découpes et/ou perdaient le canon d'épaule. **Les familles natives Wolf introduction, victoire et défaite restent manquantes.** Le moteur garde son comportement de secours déclaré pour ces états. Il n'utilise aucun de ces refus, et aucun masque alpha n'a été fabriqué pour les sauver.

## Lecture et ancrage

`app/game/data/pitLifecycleAnimationsV93.json` ne contient que les données publiques nécessaires au rendu : costume, page, rectangles, bornes visibles, pivots et durées. Les prompts, références SHA et décisions sont séparés dans `art-source/v93/pit/lifecycle-admission.json`. Les chemins privés du générateur ne sont jamais dans le registre public.

Chaque PNG public est une **copie byte-identique** de son originale archivée, vérifiée par SHA256. Aucun redimensionnement, miroir, recoloration, suppression de fond ou export de cellules ne fait partie de l'admission. La transparence alpha native utilise seulement le seuil de bruit déjà reconnu par le lecteur, `noiseFloor:2` ; les fichiers demeurent inchangés. Les rectangles sont des fenêtres de lecture du moteur, pas de nouvelles images exportées.

L'échelle reste identique pour toutes les poses et les familles d'un même costume. Les postures penchées restent réellement plus basses ; elles ne sont pas agrandies pour égaler une garde. Les pivots suivent l'enveloppe des pieds dans les 36 pixels inférieurs du dessin et le contact alpha réel. Les sprites de présentation sont placés sur le sol du théâtre de combat, sans reprendre une altitude résiduelle de la simulation.

Les deux boucles utilisent les phases `[20,22,20]` à 60 ticks/s. La provocation utilise `[14,20,30]`, soit 1067 ms, puis conserve le dernier dessin. L'étourdissement peut boucler pendant la vraie fenêtre de finalisation ; il ne crée ni une attaque ni un événement de combat. L'introduction 1200 ms et les résultats 2000/2200 ms conservent leurs durées de runtime. Les nouvelles pages de ce lot ne contiennent pas de cérémonies Wolf incomplètes.

## Vérification de ce lot

`node --test tests/pit-native-lifecycle-v93.test.mjs` : **6 tests PASS, 0 FAIL**, sur les onze pages finales. Ils vérifient les octets/SHA, l'alpha et les 66 dessins distincts, les deux orientations, le chargement du vrai registre, le lecteur et les fenêtres source réellement dessinées, l'ancrage au sol, les boucles/durées, la réduction du mouvement et l'absence d'écriture dans la simulation. Les trois nouvelles gardes sont également échantillonnées en avançant de vrais ticks de moteur. Le lint ciblé du registre et du test passe.

Le banc de test utilise une lecture PNG réelle avec un adaptateur Canvas déterministe : ce résultat ne constitue pas une revue navigateur, ni une certification anatomique microscopique. La revue en jeu, la build globale, le commit et la publication sont des étapes distinctes gérées par le lot principal. Il ne s'agit pas d'une couverture de tous les combattants ou de toutes leurs attaques.

Le stockage V93 est ciblé sur les dossiers physiques C du workspace, via les jonctions `public/game/sprites/v93` et `art-source/v93`, afin de préserver les anciens contenus sur D sans les déplacer ni les supprimer. Les admissions sont traçables indépendamment du stockage.
