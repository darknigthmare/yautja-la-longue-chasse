# Admission Guerre et Homeworld — 9 novembre2026

Les **588 sujets Guerre courants** (582 initiaux et six ouvrages supplémentaires) et les **107 sujets Homeworld** sont rapprochés individuellement de leurs véritables exigences, du code, des sources et des preuves disponibles. Aucun statut global « à rapprocher » n’est utilisé dans ces diagnostics. Cette opération ne termine pas les fonctionnalités de production manquantes et n’admet aucun nouvel asset.

Les 11 classeurs Guerre ont été relus sans modification : **1 004 comparaisons de hashes de lignes** concordent ; pour les six ouvrages dont le registre ne publiait pas de hash, les cellules publiées sont identiques aux cellules OOXML, puis leur SHA est calculé. Les critères BACK145 C/D ont été restaurés : la phrase QA générique du registre ne décrivait pas la fonctionnalité demandée. Les cellules et toutes les observations restent dans `source-rows.json` et `reconciliation.json`.

| Diagnostic Guerre | Sujets |
|---|---:|
| Comportement partiellement réalisé ou admission complète ouverte | 431 |
| Contrat réseau présent, service Guerre absent de cette source | 70 |
| Références/admission artistique manquantes | 36 |
| Effet demandé à implémenter | 18 |
| Admission manette/tactile/accessibilité manquante | 9 |
| Garde négatif qualifié en domaine seulement | 8 |
| Admission d’équilibrage manquante | 13 |
| Admission de performance manquante | 3 |
| **Total** | **588** |

Les huit gardes qualifiés concernent l’absence de gain ou de transfert vers la campagne SaveGame/V85, jamais une conquête positive. Le recrutement et l’XP propres à l’exercice existent toujours. Les propositions destinées au suivi sont `inventory-updates.json` ; l’agent Excel conserve la décision et la normalisation du registre central.

## Ce que le code réalise et ses limites

- L’assaut V115 gère AP, acteurs existants, dégâts simultanés, vagues finies, focus/repli/brace et couverture par un gardien proche. Son modèle de position n’a qu’un `x` : il ne réalise pas les voies hautes/basses, étages, couverts volumétriques ou sièges complets demandés.
- Outer utilise le graphe dirigé V6, les capacités PC, de vrais choix de passages et des délais/haltes/reroutages archivés. Le rappel partiel corrigé repart uniquement des portions réellement atteintes. Cela reste un calcul local de trajet, sans convoi de véhicules physiques ni horloge serveur signée.
- L’infiltration utilise six profils régionaux de petite grille9×6, collisions, relais/extraction à portée, énergie/camouflage, LOS, dernier contact borné, deux gardes et renfort d’alerte. Plusieurs étages, thermique, propagation réaliste du son/de la lumière, otages et scènes source complètes restent distincts et ouverts.
- Le RTS W133 est une étude à quatre escouades maximum : 24 scripts, 72 tâches et 12 cartes avec portage/escorte, objectifs et extraction. **La recette de 24 parcours isole les objectifs en retirant les ennemis et les dangers.** Elle ne prouve pas 24 victoires de combat réelles. Le composant W133 conserve seulement `useState` : une sérialisation d’objet dans un test ne prouve pas une reprise après rechargement.
- V152 bloque honnêtement la campagne : aucun rapprochement géographique W3-K/CON-T ni identité de personne vérifiés, aucune conquête/XP/blessure autorisée. Un garde de refus ne réalise pas le contrat positif de campagne demandé.
- V126 teste un contrat pur de lobby/ownership/révision/séquence/anti-rejeu, annoncé `server-required`. V127 est une pratique `practice-memory-only`. La recherche réelle des sources `app` et `db` ne trouve aucune route API ni transport Guerre, et `db/schema.ts` est vide. Cela ne prouve pas la situation d’un éventuel serveur externe.
- Les 1 200 variantes sont toujours `design-only`. Les 30 planètes, les 12 grilles RTS et ces 1 200 cartes de conception sont trois portées différentes. Ni les exports Atlas ni les sources de props ne produisent automatiquement 1 200 niveaux, 30 théâtres RTS ou des assets canoniques1:1.
- Les effets W3-S09/S10/S13/S14/S15/S18 sont absents de `supportedWorks` : quai/transport, montures identifiées, confinement alimenté, duel consenti, sons enregistrés et navire acquis/orbite ne sont pas créés depuis leur description.

## Homeworld107

Le rapprochement des **97 cibles de catalogue** donne 77 familles sans liaison exacte démontrée, 17 candidats exacts hors runtime et trois sources publiques utilisées : fondation basalte, cabine d’ascenseur et portique adulte. L’ancien `clan-lift-fixed-frame.png` ne remplace pas le portique actif. Une liaison de famille ne démontre aucune absence d’objet.

N01–03 existent mais restent non mesurés/non intégrés ; leur alpha atteint au moins un bord. La vérification V162 confirme les sept PNG géométriques et sources Blender, la caméra de production et les métadonnées historiques conservées. Elle confirme aussi **zéro admission runtime ou canonique**. La mesure de porte face à l’acteur100u, l’admission visuelle yaw0°/pitch35°, l’implantation des nouveaux socles et la séparation de tous composites demeurent ouvertes.

La couverture géométrique existante est conservée : 71 ancrages accessibles, sept connecteurs et 9 769 échantillons de segments PNJ sans collision. Les sources Homeworld n’ont aucun diff contre HEAD. Ces reçus ne sont pas renommés en nouvelles recettes navigateur et n’admettent pas les candidats absents du runtime. Les quatre poches vides n’ont ni service ni objectif : aucun déplacement arbitraire n’a été appliqué.

`homeworld-reconciliation.json` détaille les107 lignes ; `homeworld-inventory-updates.json` propose huit états partiels et99 ouverts, avec un code de diagnostic précis pour chacun.

## Vérifications et portée

- **38 suites : 331 cas, 329 réussis, deux ignorés, zéro échec**. Les deux cas ignorés demandent des archives locales historiques absentes ; ils ne sont pas traités comme réussis. Ces suites recoupent les677 tests root : les totaux ne s’additionnent pas.
- `domain-probe.json` contient de vrais appels aux réducteurs : 24 missions/72 tâches/12 cartes,30 planètes,1 200 cartes de conception, mission Outer légale réglée et checksum campagne inchangé, garde V152 bloqué et six ouvrages absents du support.
- La recette Next Atlas liée couvre trois lieux et sept téléchargements ; la fixture archive couvre une RTS courante avec les véritables IDB/localStorage/WebLocks. Les badges navigateur sont attribués seulement aux groupes précisément concernés, jamais hérités par les vagues, le climat furtif, le lore ou les anciennes migrations utilisateur.
- Une revue indépendante a vérifié les hashes et trouvé trois imprécisions de suivi. Elles sont résolues et réassertées dans `review-resolution.json` : portée navigateur, recrutement/XP internes et cinq correspondances de groupes. Aucun nouveau bug applicatif n’a été démontré par cette revue.
- `verification.json` contrôle169 chemins de preuve/source distincts et les695 clés. `final-receipt.json` répertorie les artefacts portables et leurs empreintes. Le build gelé est `RYl37_8hN58IOB8jDpRj1` ; aucun app, ancien Excel ou sauvegarde n’a été écrit par cet audit.

Pas de certification artistique humaine, pad réel, deux appareils réseau, migration d’archive utilisateur réelle, RTS200 unités ou recette complète de tous niveaux.

Reproduction depuis la racine, en conservant les anciens reçus :

```sh
python3 production/p0p1-20261109/qa/war-admission/tools/extract-source-rows.py
python3 production/p0p1-20261109/qa/war-admission/tools/run-domain-tests.py
/workspace/.cloud-tools/node22/node_modules/node/bin/node --experimental-strip-types production/p0p1-20261109/qa/war-admission/tools/probe-domain.mjs
python3 production/p0p1-20261109/qa/war-admission/tools/reconcile-war.py
python3 production/p0p1-20261109/qa/war-admission/tools/reconcile-homeworld.py
python3 production/p0p1-20261109/qa/war-admission/tools/verify-admission.py
```

Les commandes de rapprochement écrivent seulement ce nouveau dossier de preuves. Les réducteurs de test travaillent en mémoire. L’extraction Homeworld se reproduit avec l’argument `'Homeworld et habitats'` ; la recette des354 cibles peut être relancée avec `reconcile_targets.py --repo . --out` vers un nouveau dossier.
