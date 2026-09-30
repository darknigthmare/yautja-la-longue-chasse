# V62 — stages vivants, masques et anatomie modulaire

Ce lot poursuit le classeur V54 sans déclarer ses 205 dossiers de personnages ni ses 174 dossiers de stages intégralement terminés. Le fichier source reste inchangé. Le suivi détaillé est dans `THE_PIT_V62_SUIVI.xlsx` : livré, rapprochement des identités et suites nécessaires.

**Publié et vérifié** sur [yautja-la-longue-chasse.vercel.app](https://yautja-la-longue-chasse.vercel.app) : commit `f3b1e2ffd649d4eb869a6c99150c5fdf6991d14e`, déploiement `dpl_8x8epVc6cuuNfGhEWHTZnKherYzL`, READY le 30 septembre 2026 à 21:28:29 UTC. Le commit final de preuves ne modifie pas ce runtime.

## Intégré

- **14 biomasks natifs OpenAI** remplacent les anciennes interprétations des chasseurs nommés. Les 28 anciens fichiers restent identiques ; les modèles originaux reçoivent des noms du clan, sans attribution canonique inventée. Onze variantes conservées sont équipables en plus de Couronne des Ancêtres ; quatre anciennes études V14 restent en galerie.
- **Quatre têtes modulaires natives**, Classic, Elder, Super et Feral, corrigent l’anatomie. Young et Huntress réutilisent explicitement Classic. La forge, les vignettes, Homeworld, les missions Canvas et le laboratoire partagent les placements mesurés. Les anciennes couches de filet ne redessinent plus l’ancien visage ; le raccord des dreads et les couleurs du corps sont corrigés. Les pixels des fichiers générés ne sont pas modifiés.
- **Emissary PHG**, distinct des deux Emissary du film, possède une nouvelle case, un portrait et deux planches de garde indépendantes de six dessins, une par orientation. Le roster atteint 199 cases. Les déplacements et attaques sans dessins propres conservent une pose native ; ils ne sont pas comptés comme des animations livrées.
- **Trois stages** reçoivent chacun trois animations de fond séparées, soit neuf planches et 54 dessins : toit de l’hôpital de Gunnison, station spatiale AVP Classic 2000 et nouveau sas USCM de Golgotha. Les variantes sont déclenchées dans le système d’ambiance existant, avec placement en profondeur, pause, mouvement réduit et reprise après échec de chargement contrôlés.
- **Une nouvelle arène jouable**, Golgotha, porte le catalogue à 187. Son nouveau fond principal réutilise cinq plans industriels existants, déclarés comme tels. L’ancienne arène 051 et ses images restent disponibles sous « Cataractes des Anciens · création originale », au lieu d’attribuer ses ruines yautja à la base USCM.

Le lot contient **31 PNG natifs, 86 dessins et une icône WebP dérivée**. Il ne s’agit pas de 86 animations : ce total comprend portraits, têtes, masques et fond fixe.

## Vérification

- Suite globale : **1 933 tests réussis, aucun échec ni test ignoré**.
- Compilations Vinext et Next.js webpack terminées avec succès. Les quatre contrôles du CSS réellement compilé passent.
- Contrôles Chrome locaux : 68 compositions modulaires ; deux missions isolées avec mouvement et retrait du masque ; 26 choix de masque, 14 retraits/remises et persistance ; Emissary dans les deux orientations et en viewport tactile ; trois stages, 54 poses de décor observées, pause et panne/reprise.
- Le classeur de suivi a été relu indépendamment ; ses formules et sept aperçus ont été contrôlés. La source V54 est conservée avec son empreinte.

Ces contrôles de campagne utilisent une sauvegarde isolée de recette ; ils ne prouvent pas une nouvelle traversée complète du prologue. Le test tactile est une émulation navigateur, pas un appareil physique.

Les rapports `v62-*-qa.json`, les reçus de génération et les deux dossiers `art/v62/BIOMASQUES-V62.md` et `art/v62/TETES-MODULAIRES-V62.md` détaillent les références, mesures et limites.

La recette publique est passée séparément : 32 images HTTP 200 avec empreintes identiques, quatre contrats HUD dans les CSS réellement liés, 26 choix de masque, six vignettes, deux missions, Emissary dans les deux orientations et 16 contrôles des trois stages. Les 54 poses de décor sont observées ; 14 captures de stages sont inspectées. Pause, mouvement réduit, mobile portrait/paysage et reprise après panne 503 volontaire passent, sans erreur imprévue. Les rapports publics distincts sont reliés dans `v62-release-gates.json` ; les preuves locales n’ont pas été écrasées.

Le classeur conserve son état d’avant publication, avec ses limites explicites. Le présent rapport et `v62-release-gates.json` consignent la validation publique ultérieure. Le paquet Windows portable existant n’est pas reconstruit par ce lot.

## Encore ouvert

- Huit dossiers d’identités ou d’apparences : Bloodshed, Super Predator de The Last Hunt, Jaguar, AVP Classic 2000, père et fils de Blood Ties, Elder PHG et Captured PHG. **197/205 dossiers reliés ne signifie pas 197 kits d’animation complets.**
- Les animations d’attaque, déplacement, introduction et résultats de manche manquantes des combattants, dont celles d’Emissary PHG.
- Les trios littéraux ST103, ST167 et ST170 et les routes narratives du classeur. Les ambiances d’exposition de ce lot ne ferment pas artificiellement les 522 événements demandés.
- Les autres stages et leur animation détaillée restent soumis au suivi ; aucune certification globale de dossier de stage complet n’est ajoutée dans ce lot.

Les sources officielles guident les volumes et l’anatomie. La rotation, les parties cachées et certains détails sont adaptés au jeu : **fidélité 1:1 non certifiée**. Les noms français du clan sont des créations du projet, pas des appellations canoniques inventées.
