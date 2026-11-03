# Poste de stabilisation S11 — V92

Le vrai atelier de la Bible V6, monté dans `ClanWarPanelV85` via `ClanWarBibleV6Panel`, permet maintenant de construire S11 et de suivre une stabilisation. Ce lot reste un exercice indépendant : aucune blessure de bataille, ressource, récompense, armée ou sauvegarde de campagne n’est inventée.

## Source originale lue

`Yautja_V6_Bible_Cumulative_et_Dialogues.xlsx`, copie originale conservée dans `work-local/drive-import-20261007/downloads/`, SHA-256 `87ad5d1a6eaf49f2908a4457ef3f97b8f34db481a24bbc121d2e924559b19183`. Lecture bornée des cellules XML du fichier XLSX, comparées aux entrées embarquées ; classeur inchangé.

- **Structures de guerre D16:J16, W3-S11** : kit 14 RAV, entretien 2 RAV, trois tours de travaux, opérateur U18. H16 prévoit un lieu protégé pour stabiliser puis organiser l’évacuation ; I16 exige des consommables et le suivi de l’indisponibilité.
- **Unités de guerre D23:H23 et M23:N23, W3-U18** : un soigneur, 2 PC, recrutement 10 RAV, entretien 2 RAV, formation trois tours. N23 interdit la résurrection et l’effacement d’une blessure majeure en combat.
- **Règles de guerre C20:D20, W3-R15** : la personne reste hors de l’effectif combattant jusqu’au soin et à la récupération nécessaires.
- **Règles de guerre C25:D25 / Objectifs militaires D9:E9, R20 et OBJ04** : seules les personnes réellement arrivées à la sortie sont extraites ; aucun groupe ne suit automatiquement une cinématique.

Ces fiches sont la conception du jeu, marquée « Reconstitution documentée V4 — nouvelle rédaction V5 » dans le classeur. Les chiffres ne sont pas présentés comme des mesures canoniques de la franchise. Aucun nouveau clan ni lieu canonique n’est créé par ce lot.

## Parcours raccordé

1. Choisir un exercice en **stocks locaux**, reconnaître réellement le site, réserver le kit S11 au dépôt de départ.
2. Acheminer ce même kit, le livrer et travailler ses trois tours avec un vrai U18 complet. Attendre n’installe pas le poste.
3. Occuper le poste avec ce soigneur et préparer des consommables depuis un lot RAV existant au site : dépôt si le poste est au départ, cache S03 réellement construite et alimentée sinon. Un dépôt riche ailleurs ne paie jamais le soin.
4. Déposer au poste le patient identifié. Commencer consomme une dose et immobilise le soigneur et la personne ; ni transport du patient ni ordre de déplacement/libération du soigneur n’est possible pendant le soin.
5. Accomplir deux tours de soin, avec l’entretien local effectivement couvert à chaque geste. L’attente ne progresse pas. À la fin la personne est **stabilisée, toujours `wounded` et indisponible** : identité, XP et appartenance conservés, aucun retour automatique au combat.
6. Organiser l’évacuation via le transport U17, les passages gardés et le S16 déjà raccordés. S11 ne devient pas une condition obligatoire de S16 ; les personnes peuvent être extraites sans cette stabilisation préalable.

Interrompre libère le soigneur du geste mais le laisse affecté au poste. La dose déjà utilisée n’est pas restituée. Une tentative ultérieure doit utiliser une autre dose. Un soin terminé ou une arrivée S16 répétée ne dépense rien et n’accorde aucun second résultat.

## Réglages et limites explicites

Le classeur ne chiffre ni une dose ni la durée de stabilisation. `WAR_MEDICAL_BALANCE_V92` annonce donc les choix de cet exercice : **1 RAV local par consommable, une dose par tentative, deux tours réellement travaillés, réserve maximale de 20 doses**. L’interface affiche ces adaptations. Préparer plusieurs doses nécessite un lot local suffisant pour cette préparation et conserve les moyens de couvrir l’entretien du site ; aucune fusion ou livraison depuis un dépôt éloigné n’est implicite.

Le poste fournit l’abri décrit par H16 dans cet exercice de graphe ; aucun tir, aggravation physiologique, guérison majeure ou nouvelle bataille n’est simulé. L’inventaire personnel n’est pas modélisé. Ce lot n’implémente pas S13 ni toutes les guerres de clan du classeur.

## Carnets et compatibilité

L’extension facultative `medical`, version 1, apparaît uniquement lors d’une préparation explicite de consommables ou d’un soin. S11 ouvre le carnet des franchissements au moment de sa réservation pour conserver ensuite les positions historiques des soignants. Aucun trajet antérieur n’est reconstruit.

Chaque préparation lie le poste, la quantité, le tour et le vrai transfert RAV de type `medical`. Le compte de consommables est déduit des préparations et des tentatives commencées, y compris les interruptions. Conservation totale : stock restant = budget initial − recrutement − kits − entretien − mécanique − consommables médicaux.

Le parseur vérifie source, version, règles d’exercice, unicité des identités, lieu des patients et des soignants aux tours concernés, progression du soin, immobilisation actuelle et correspondance exacte des dépenses. Un ancien carnet sans cette extension reste identique après import/export. Il s’agit de preuves structurelles et physiques d’un exercice éditable, pas d’une signature cryptographique ou d’un gain de campagne.

## Validation ciblée

`tests/clan-war-medical-v92.test.mjs` joue huit cas avec le vrai moteur : construction et sources, stock vide/distant/absent, dose finie et conservation, immobilisation, tours travaillés, interruption sans remboursement, livraison d’un lot dans une cache distante, arrêt sur entretien local épuisé, arrivée réelle au S16 sans guérison, reprise stricte et anciens carnets. Le dernier cas clique les vrais handlers de `ClanWarWorksV6` et de son composant enfant S11, puis exporte leur vrai carnet. Le scheduler de hooks en mémoire est transparent ; il ne constitue pas une capture visuelle du navigateur.

Les anciennes assertions de disponibilité ont été mises à jour pour le douzième ouvrage raccordé. Les parcours historiques de kits, extraction, lots locaux, pont, veille, treuil et reprise restent contrôlés sans retirer leurs cas. Le root réalise séparément compilation, revue visuelle et publication.

Résultat de la relance ciblée : **91 tests passent, aucun échec ni test ignoré** (S11, S16, ateliers, logistique V87, infrastructure V88, terrain V89, mécanique V90 et leurs handlers). Lint ciblé sans avertissement. Deux carnets QA privés réellement joués, `work-local/v92/qa/medical-played-treating.json` et `medical-played-stabilised.json`, reprennent respectivement un soin à 1/2 tour travaillé et sa stabilisation terminée ; leurs imports ont été vérifiés. Ils ne sont pas des sauvegardes historiques du joueur.
