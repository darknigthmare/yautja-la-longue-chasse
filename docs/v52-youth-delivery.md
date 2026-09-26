# V52 — Suite jouable de la jeunesse

## Périmètre livré

Après `desert-complete`, le joueur choisit explicitement de repartir avec le maître. Le chapitre contient un briefing de proximité, deux haltes accompagnées séparées par les obstacles de basalte, une rencontre territoriale avec un brouteur, une évaluation du maître, puis le trajet de retour. Les trois charges annoncées doivent être réellement évitées. Les commandes d’attaque ne blessent pas l’animal. Trois chocs interrompent la rencontre ; réessayer conserve toutes les observations et haltes déjà validées, et le bilan garde le total de chocs et de tentatives.

Cinq preuves distinctes utilisent `youth.patrol.v52` / `unblooded-patrol`. Aucune preuve des Premières Pistes, aucun rite, rang adulte, XP, honneur, équipement ou vaisseau nouveau n’est accordé. Le temps joué avance normalement. Le statut historique `completed` désigne la formation V48 ; le prédicat `youthCampaignNeedsScene` restaure désormais aussi les phases de patrouille inachevées. Les anciens checkpoints `desert-complete` restent dans la cité et ne déclenchent aucun départ automatique.

## Source et adaptation

Source locale relue : `work/v36/new-world-specs/youth-thread-page-1.json`, demande utilisateur `7efc0ab0-c5af-4bea-a1ba-c62bc14676e2`, précisions de titre `1b26a092-3975-4e4c-9443-092965d0fd67` et squelette de scolopendre `328e7d74-8f59-4381-b0d4-6e92e345ba0a`. Concordance précédente : `work/v47/spec-qa/prologue-source-and-qa.md`.

Le postulat attesté prévoit le repos puis une quête désertique avec des chasseurs ; il ne fournit pas de dialogues exacts pour cette patrouille, cette rencontre ou ce bilan. Ceux-ci sont une **adaptation originale du projet**, annoncée dans le briefing. Aucun dialogue attesté existant n’a été réécrit. Le brouteur est une créature originale ; aucune espèce canon précise n’est revendiquée. Les chasseurs lointains du décor V49 restent des silhouettes peintes et ne sont pas 15–40 PNJ simulés.

## Images et modularité

`public/game/youth/v52/grazer-native.png` est une copie byte pour byte d’une génération OpenAI RGBA 1774×887. Huit dessins natifs : veille, préparation, deux poses de charge dans chaque sens. Les crops et pivots sont mesurés individuellement, sans miroir, découpage physique ni retouche des pixels. La récupération tient la pose de veille : aucune animation de récupération distincte n’est revendiquée. Le sol est calé par les pivots ; le chargement de l’image est requis avant la simulation.

Provenance : `docs/art/v52/youth-grazer-provenance.json`. Prompts exacts : `docs/v52-openai-prompts.json`. Le décor désertique, les personnages et les accessoires V48/V49 sont réutilisés. Cette livraison ne prétend pas ajouter un nouveau niveau de parallaxe.

## Vérification exécutée

- 104 tests ciblés passent : jeunesse, art, présentation, sauvegardes de partie et récupération des visites Homeworld ; 15 nouveaux tests V52 couvrent le parcours réellement joué par les entrées du moteur et le bitmap/rendu.
- Le parcours de test repart d’une nursery, formation et reconnaissance réellement simulées, sans écrire les coordonnées, la santé ou les preuves pendant le jeu.
- Échec réel puis reprise, trois charges alternant les sens, rechargement tous les 23 ticks, pause/page masquée/images absentes, attaque inopérante, absence de récompense adulte, refus quota et concurrence des sauvegardes sont exercés.
- Huit crops non vides, dessins distincts, SHA256 source/runtime identique, orientations natives, quatre sélections de charge sans miroir et pivots de sol contrôlés.
- Lint ciblé du runtime modifié : PASS. Relecture `vercel:react-best-practices` : boucle et état transitoire conservés en refs, commandes accessibles et protections de persistance préservées.
- Recette navigateur `scripts/verify-youth-patrol-v52.mjs` : **6/6 PASS** sur le build V52 local, 1280×900. Départ depuis l’archive V49 réellement jouée, trajet clavier au maître, arrêt contre le basalte, pause puis sauvegarde/rechargement d’une charge, défaite passive, reprise et trois esquives dans les deux sens, retour Homeworld avec 16 preuves. Zéro erreur JavaScript/HTTP. Rapport : `outputs/qa-commercial-audit/v52/youth/patrol-browser-qa/report.json`. Captures de rencontre, bilan et retour inspectées : personnages et brouteur posés au sol, objectif non létal lisible, bouton de retour visible. Navigateur fermé après la recette.
- Recette tactile/layout `scripts/verify-youth-touch-layout-v52.mjs` : **8/8 PASS**, 390×844 puis 640×360, depuis le vrai checkpoint de charge. Gestes tactiles CDP pour mouvement/saut, pause, retry et retour ; suite terminée au clavier. Cibles ≥44 px, aucun contrôle nécessaire occulté, piège de focus de la pause et restitution au canvas, gel du temps, défaite réelle sans perte des 13 preuves puis bilan à 16 preuves. Huit captures inspectées ; aucun patch runtime requis. La pause paysage défile à l’intérieur de son panneau pour garder les boutons accessibles. Émulation Chromium, pas validation d’un téléphone physique. Rapport : `outputs/qa-commercial-audit/v52/youth/touch-layout-browser-qa/report.json`.
- Build final2 : même recette de patrouille rejouée après les dernières corrections PIT, **6/6 PASS**, zéro erreur JS/HTTP, captures de rencontre et bilan inspectées. Rapport : `outputs/qa-commercial-audit/v52/youth/patrol-browser-qa-final/report.json`. Aucun changement runtime jeunesse depuis son gel.
- Publication et qualification PC relèvent du rapport principal V52 ; ces recettes locales ne prouvent pas encore la version publique.

## Limites restantes

Le PIT de jeunesse en petite cage, les suites de chasse autonome, les rites vers Blooded et la campagne commerciale complète restent à produire. Le chapitre actuel est une patrouille courte avec une rencontre ; il ne remplace pas ces chantiers. Les tests sont des preuves fonctionnelles locales, pas une protection anti-triche serveur ni une homologation multijoueur.
