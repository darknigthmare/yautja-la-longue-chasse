# Recette Clan Ship — preuve du 4 novembre 2026

- PR : https://github.com/darknigthmare/yautja-la-longue-chasse/pull/104
- Source testée : `9d77af88148e8ab5b2d49e64040024c57aeba67d`.
- Commit de fusion temporaire testé par GitHub : `cf7a2afe973c514ce39b962942102aec98e7ea1f`.
- Exécution : https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/41789974649
- Scénario reproductible : `scripts/qa-clan-ship-browser.mjs`.

## Résultats

Le workflow confirme TypeScript, ESLint strict sans avertissement, **184 tests ciblés réussis**, puis **10 scénarios navigateur réussis**. Les 184 tests comprennent 16 tests de la machine d’amarrage, 20 tests d’intégration de sauvegarde et 148 régressions des systèmes existants.

Le navigateur utilise le vrai `GameClient` via l’entrée desktop Vite, avec une campagne synthétique dans un contexte Chromium isolé. Aucun callback de jeu, de service ou de sauvegarde n’est remplacé par un mock. Seule la manette est simulée pour vérifier les pressions maintenues et le réarmement après fermeture des réglages.

Le parcours couvre la migration de l’ancienne campagne depuis le menu, l’approche, l’amarrage, l’entrée, les sept salles et les six services, la sauvegarde manuelle, le retour au menu, le rechargement et « Continuer », le retour au vaisseau personnel amarré, le blocage des voyages avant désamarrage, l’annulation d’approche et les largeurs 390 et 320 px. Le viewport desktop mesure 1440 × 1000 px.

`report.json` conserve les dix résultats, les commits, les dates et les noms des captures. **Aucune exception JavaScript ni aucun asset manquant n’a été observé sur ce parcours.** La fixture matérialise les visuels existants nécessaires aux services et au rendu de planète du conseil ; elle ne crée aucun nouvel asset de jeu.

Les captures montrent l’approche, le hangar, les Archives après reprise et la navigation mobile. Elles ont été examinées pour la lisibilité, la distinction des deux vaisseaux et l’absence de débordement horizontal. Sur mobile, les salles se parcourent par défilement.

## Portée

Les imports avec plusieurs propriétaires, la cohérence de flotte, les versions futures, les quotas et la réconciliation sont vérifiés par les tests d’intégration. La recette navigateur ne prétend pas rejouer chaque variante d’import dans l’interface ni chaque activité interne aux services.

La compilation Next.js avec webpack a aussi terminé avec succès localement pendant cette reprise. Chromium local étant interdit par la politique de l’exécuteur, la preuve navigateur vient de l’exécution CI ci-dessus.

Cette livraison est un plan de visite fonctionnel. Les intérieurs physiques du vaisseau-mère, les nouveaux assets individuels, le château orbital et la cinématique d’arrivée restent des chantiers de production distincts. Aucune fidélité artistique au film ni réalisation de ces chantiers futurs n’est déduite de ces tests.
