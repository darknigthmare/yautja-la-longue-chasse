# V46 — ouverture guidée, caméra de duel et quatre profils QA

## Livraison

- Première chasse : un briefing de départ lisible conserve les objectifs détaillés dans un panneau dépliable. Dans la vraie jungle d’Oseris-IV, un guide suit les déplacements et le saut réellement effectués, les traces, le transpondeur, le combat, le rite de l’insigne et l’extraction. Il respecte les touches remappées, se réduit, conserve ce choix après une pause et suit le monde restauré après suspension. Il ne crée ni récompense ni preuve de chronique.
- THE PIT : suivi et zoom restent actifs lorsque les secousses sont désactivées. Le cadre recule lorsque les combattants se séparent et se rapproche progressivement au contact. Les plans du décor conservent leur profondeur distincte, le sol reste lié aux combattants et le HUD ne change pas d’échelle. Le mode fixe explicite et la préférence système de mouvements réduits sont conservés.
- Interface : retour du focus au checkpoint d’origine, confirmation d’écrasement accessible au clavier avec Échap, dialogue défilable sur écran bas, transitions du roster supprimées en mode réduit, cibles et champs tactiles agrandis.

## Quatre profils simulés et distincts

1. Joueur de versus : recul unilatéral, rapprochement, saut, cadrage des armes, fond, HUD, caméra fixe, préférence système. Voir `v46-qa-competitive.md`.
2. Nouveau joueur : création sans sauvegarde injectée, briefing, premières actions réelles, guide facultatif, pause et reprise. Voir `v46-qa-new-player.md`.
3. Joueur clavier/tactile sur petit écran : focus, dialogues, paysage court, texte agrandi, mouvements réduits, guide et caméra dans le jeu assemblé. Voir `v46-qa-accessibility.md`.
4. Joueur confronté aux interruptions et aux incidents de stockage : cinq parties, dix manuelles et deux autos, conflits entre onglets, refus de quota, versions futures protégées. Voir `v46-qa-reliability.md`.

Il s’agit de profils de test automatisés et de revues de code, pas de quatre personnes extérieures. Résultats locaux : **1 474 tests réussis**, build et TypeScript réussis, lint sans erreur (un avertissement existant), **32 parcours navigateur intégrés** et **13 contrôles de composants** réussis. Les preuves sont consignées dans `v46-local-validation.json` et les rapports associés.

## Limites conservées explicitement

La nurserie et le prologue de jeunesse ne sont pas livrés dans ce lot : leurs animations Youngling validées manquent encore. Aucun adulte réduit ne les remplace et aucun rite de jeunesse n’est attribué. Cette livraison avance l’ouverture adulte jouable ; elle n’ajoute pas un chapitre narratif complet. Elle ne complète pas les centaines de planches d’animation encore prévues et n’ajoute aucune nouvelle image d’arène. Ni matériel mobile/manette physique ni lecteur d’écran ne sont certifiés.
