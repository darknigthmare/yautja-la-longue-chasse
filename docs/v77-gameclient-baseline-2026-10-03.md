# V77 — baseline réelle du GameClient, 3 octobre 2026

**PASS du candidat 4 compilé, sur `http://127.0.0.1:4198` : 5 gates et 22 nouvelles captures, toutes ouvertes avec `view_image`.** Zéro erreur de page, erreur console, réponse HTTP ≥ 400 ou requête applicative non lecture. Rapport : `work-local/v77/qa/baseline-final-candidate4-local/report.json`. Les SHA256 des 22 images ont été recoupés avant leur annotation de relecture. Identité du reçu : `v77-candidate4-local`, sources figées le `2026-10-03T05:08:11.178Z`. Les PASS des candidats 2/4196 et 3/4197 demeurent des preuves historiques distinctes ; ils ne valident pas ce candidat 4.

Runner réutilisable : `scripts/verify-gameclient-baseline-v77.mjs`, SHA256 `a1bd0bedce1d8ee1242257d82460ce6a13186feb44447219b5fe203ad787a853`. Il accepte une base locale HTTP ou une release HTTPS et `V77_BASELINE_QA_OUTPUT`. Le CDP demeure local, sur le Chrome QA isolé 58677 / PID 56304 ; seuls les contextes de cette recette sont fermés. Aucun navigateur, compte ni save du joueur n'est employé. Aucun acteur, HP, phase, horloge, moteur ou checkpoint n'est patché.

## Parcours réellement exécutés

| Gate | Preuve et portée |
|---|---|
| Création / reprise du prologue | Vraie nouvelle partie depuis un contexte sans save ; cinq cartes de contexte lues ; arrivée ready ; pause stabilisée ; reload et vrai bouton Continuer ; même histoire et mêmes positions. |
| Duel du jeune | Maintien de consentement, relâchement avant jeu, duel gagné par déplacements et coups au clavier. Vue élargie avec vainqueur debout levant le bras et rival au sol, puis debrief non létal du maître. Le parcours s'arrête à ce debrief ; la suite de la campagne n'est pas appelée achevée. |
| The Pit desktop | Fixture `defaultSave` déclarée dans un contexte distinct, accès au vaisseau puis Versus local ; sélection réelle City Hunter/Scar et variantes masquées ; stage `canopy-causeway` chargé ; deux intros, 3/2/1, simulation frame 0 et commandes bloquées avant fight ; bitmap sans asset manquant ; pause et reprise ; sauvegardes campagne/sidecar inchangées. |
| The Pit mobile | Même parcours sur viewport tactile Chromium 390 × 844 ; aucun débordement horizontal ; pause lisible et reprise. Ce n'est pas un handset physique ni un test manette. |
| Départ chasse / checkpoint rites | Autre contexte `defaultSave` déclaré ; vraies interfaces de départ/navigation/briefing ; Canvas de chasse natif chargé ; zéro élimination et ledger rites vide, donc aucun corps/menu inventé. Pause qui conserve le snapshot, reprise qui avance le temps, suspension native puis bouton de reprise. Nouveau run de persistance, même propriétaire/mission/rencontre/ledger ; chasse reprise en pause. Aucun combat gagné ni geste rituel accompli dans ce gate. |

L'observation de phases The Pit est un `MutationObserver` passif sur les attributs DOM existants. Elle observe le blocage et le compte à rebours sans toucher au temps du moteur. Les opérations de sauvegarde de chasse sont effectuées par les vrais callbacks du jeu, et leurs octets sont ensuite lus en QA ; le runner ne réécrit pas ces checkpoints.

## Relecture des 22 captures finales

`01`, les deux `02`, `03`, `04`, `05`, `06`, `07` : nouvelle partie habillée, cartes lisibles, arène et sprites correctement visibles après reprise. `05` attend réellement les assets avant capture, contrairement au premier essai prématuré. `06` du candidat 4 montre les deux jeunes sur l'arène élargie : vainqueur debout avec bras levé, rival couché. `07` explique l'arrêt de l'exercice et le fait que le rival survivra. Le prologue conserve une page à défilement et n'est pas déclaré refondu entièrement en plein écran.

`08`–`12` desktop/mobile : écran de sélection intégré, portraits sélectionnés réels, aperçu du pont en canopée, combattants face à face avec appui sur le tablier, HUD et pause intégrés. Sur la capture initiale du roster desktop, quatre portraits non sélectionnés affichent encore « Chargement du portrait… » ; la recette ne certifie pas leur état final. Les assets des deux combattants et du stage choisis sont effectivement chargés dans le combat testé. Le terrain desktop remplit le viewport. En portrait mobile, le décor conserve son ratio et occupe une bande centrale, avec espaces noirs et commandes tactiles en dessous : aucune complétude d'un cadrage portrait optimisé n'est annoncée. Dans le roster mobile, le nom long de l'adversaire initial « Berserker / Mr. Black » est tronqué à l'intérieur de son panneau ; le bouton de validation reste visible. Ce lot ne certifie pas tout le roster ni tous les stages.

`13`–`16` : départ et pause sur Sang dans la canopée, menu de chasse suspendue avec vraie invitation de reprise, puis vraie chasse restaurée en pause. Dans la capture immédiatement après reprise, le toast précédent « Chasse suspendue » est encore visible ; le checkpoint restauré est comparé séparément. Le HUD général conserve sa présentation actuelle avec défilement ; ces images ne prouvent pas la refonte complète du mode chasse. Le ledger vide est annexé au rapport et à `hunt-native-suspended-storage.json`, mais les corps et gestes sont prouvés séparément dans le banc Canvas contrôlé, décrit par `docs/v77-rites-qa-2026-10-03.md`.

## Historique conservé et publication

- `work-local/v77/qa/baseline-first-infra-fail` : vrai prologue passé, puis esbuild bloqué par le sandbox en lisant les dépendances installées. Retry avec accès nécessaire, aucune modification du jeu.
- `baseline-second-pause-read-race` : dialog visible avant la mise à jour du flag Canvas de pause ; banc corrigé pour attendre le vrai flag et les assets.
- `baseline-third-loading-selector` : texte de loading présent dans l'objectif et dans le statut de chargement pendant reprise ; le banc cible désormais le statut dans le vrai HuntCanvas. Quatre gates précédents avaient passé.
- `baseline-final-local` : PASS historique du candidat 2 au port 4196, cinq gates et 22 images relues. Le candidat 3 a été rejoué entièrement dans son nouveau dossier ; aucune ancienne capture n'a servi de preuve finale 4197.
- `baseline-final-candidate3-local` : PASS historique du candidat 3 au port 4197, cinq gates et 22 images relues. Le candidat 4 est rejoué entièrement après la correction de visibilité du bouton Atlas ; aucune ancienne capture n'a servi de preuve finale 4198.

Ces FAIL ne sont ni supprimés ni renommés PASS. Leur rapport garde les chemins de capture d'origine ; les images sont dans leur dossier d'archive nommé ci-dessus. Le rapport final reste distinct.

Ce PASS local ne constitue pas un push, un déploiement READY, un contrôle HTTP public ou une baseline publique. Ces gates appartiennent au parent et doivent être conservés séparément. Les comptes synchronisés, la manette, le mobile physique, les rounds gagnés de The Pit, la campagne entière et tous les rites décrits par la conversation restent hors preuve.
