Relecture QA1 — narration, lecture de mission et commandes mobiles, 3 octobre 2026.

Profil simulé par un agent, pas quatre testeurs humains. Les constats visuels portent sur cinq captures V77 réellement ouvertes avec view_image, dont une seconde lecture le 3 octobre à partir de 06:28:44 UTC. Ils ne constituent pas une peinture V78. Aucun téléphone ou contrôleur physique utilisé.

| Priorité | Constat et preuve | Correction V78 / limite |
| --- | --- | --- |
| P0 | Sur la capture contrôlée rites work-local/v77/drafts/rites/qa/browser/10-mobile-menu.png, les trois directions occupent environ 265 px de hauteur ; saut, descente et plusieurs actions sortent de la vue. Le parent flex étirait la grille à la hauteur de tous les outils. | Grille à lignes fixes, alignement en haut, 44 px minimum sur mobile. Lames, arme active, scan et interaction restent dans les commandes essentielles ; équipement et aide utilisent des panneaux dépliables. Placement final en vrai GameClient mobile encore à vérifier. |
| P1 | work-local/v77/qa/baseline-final-v77-public/13-hunt-native-departure.png affiche le scan [V] alors que les commandes peuvent être reconfigurées. Les objectifs stockés contiennent aussi [E]. | missionActionTextV78 adapte uniquement l'affichage aux raccourcis actifs, avec LB/B correspondant à la table manette actuelle. Aucune mutation des objectifs enregistrés. Les panneaux dépliables sont reconnus comme interactifs pour éviter un saut sur Espace. |
| P1 | Le départ public montre directement 0/3 signatures et le combat/exploration, sans rappeler pourquoi reprendre le transpondeur ou affronter Vey. Le briefing existe déjà dans les données. | Un écran d'insertion expose titre, lieu, briefing et objectifs obligatoires déjà écrits. IA, temps, dégâts et objectifs restent figés jusqu'au départ ou au passage du briefing. Checkpoints et reprises héritées ne rejouent pas cet écran. Pas de nouvelle cinématique dessinée, voix ou canon. |
| P1 | Le guide détaillé dans 13-hunt-native-departure.png recouvre le titre et le texte de secteur. | Le guide démarre réduit et reste dépliable ; il n'apparaît pas sur le briefing. Cela réduit l'occlusion, sans prétendre démontrer que tous les chevauchements sont éliminés. |
| P2 | Les captures publiques 14-hunt-native-pause.png et 16-hunt-native-resume.png présentent 12 salles et 6 secteurs, avec deux noms de position, sans légende explicite du changement d'échelle. | Corrigé dans le suivi P2 : légendes locale/régionale et liaison des repères, sans modifier la topologie. Rendu navigateur encore à vérifier. Voir v78-qa1-p2-followup-2026-10-03.md. |
| P2 | announce utilise un message unique ; une sélection d'arme ou une interaction peut remplacer une annonce narrative dans HuntCanvas.tsx. | Corrigé dans le suivi P2 : courte file UI avec priorité narrative protégée des outils, alertes tactiques immédiates et QTE inchangé. Aucune progression/récompense supplémentaire. Voir v78-qa1-p2-followup-2026-10-03.md. |

Point positif : 02-story-born-in-clan.png explique déjà le Youngling, la nurserie et le duel surveillé sans proie à tuer. Il serait incorrect de déclarer que tout le contexte du prologue est absent.

Les corrections suivent [XAG 107 — Input](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/107), notamment les indications cohérentes avec la reconfiguration et les interfaces tactiles adaptables. Le [rapport officiel Metroid Dread vol. 11](https://metroid.nintendo.com/dread/news/metroid-dread-report-vol-11/) sert de référence de lecture du trajet et de l'objectif, pas de justification de nouveau lore Yautja.

Empreintes SHA256 de la première édition, avant le suivi P2 (nouvelles empreintes dans v78-qa1-p2-followup-2026-10-03.md) :

- app/game/HuntCanvas.tsx : 42c88908a6ddea05c0e6570ae35d38d0802a33be11fd57b72af715e68f7094ba
- app/game/HuntCanvas.module.css : a462969e3dd244538af6c4c08fb995398675270c311a954ea876d7f699166224
- app/game/missionOpeningV78.ts : 3234c191bc36eecbf0241c4b29c39f4d0924c0f3b3d7606c3f939539da5a34b3
- tests/hunt-opening-v78.test.mjs : 3425699bd1f34081e2c118f552f67c5f6582c9e868791fe0e1e35453f18a0022

Vérifications exécutées : TypeScript tsc --noEmit --incremental false --pretty false terminé sans diagnostic, deux fois ; nouveaux tests ouverture 5/5, accessibilité existante 6/6, rites existants 7/7. Les tests ouverture exécutent les vraies expressions/callbacks extraits du composant par AST TypeScript : refus des reprises, arrêt avant stepGame, neutralisation au consentement, maintien de la pause réelle et activation native des boutons. Ils ne prouvent pas un rendu navigateur.

Le runner contrôlé work-local/v78/qa1/verify-hunt-opening-mobile.mjs est préparé pour le CDP QA existant 58677. Il compile en mémoire la vraie source, utilise des observations de lecture et une fixture defaultSave déclarée, et n'altère ni acteurs, ni PV, ni phase, ni temps. Son lancement a échoué avant le navigateur :

1. Dans le sandbox, esbuild : Cannot read directory "../../../..": Access is denied, puis Could not resolve "react" et les modules locaux.
2. La demande d'exécution autorisée hors sandbox a été rejetée avant exécution : Automatic approval review failed: Fatal error: Failed to initialize session: thread-store internal error: Espace insuffisant sur le disque. (os error 112).

Aucun contournement, suppression ou nouveau navigateur tenté. C: indiquait 0 octet libre ; les patches bornés ont néanmoins réussi. Aucune capture V78, aucun PASS navigateur V78, build complet, push ou publication V78 affirmé. Captures/reçus V77 restent intacts et historiques : leur ancienne empreinte Canvas ne valide pas cette nouvelle source.

Avant promotion : rejouer le runner contrôlé, ouvrir les nouvelles captures, puis vérifier dans le vrai GameClient desktop et 390×844 le départ, briefing, touches reconfigurées, commandes essentielles, pause/reprise, ancien checkpoint et passage régional. Les runners V78 doivent franchir le nouveau bouton Commencer la chasse par l'UI ; ne pas patcher le runtime pour le sauter. La recette V77 figée n'a pas été modifiée.
