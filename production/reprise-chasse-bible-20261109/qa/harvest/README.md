# Prélèvement : vérification navigateur du 9 novembre 2026

La commande `HARVEST_PREVIEW_QA_OUTPUT=production/reprise-chasse-bible-20261109/qa/harvest/native-lint-final node scripts/qa-hunt-harvest-preview-browser-20261109.mjs` a réellement exécuté Chromium 154.0.8037.57. Le [dernier rapport](native-lint-final/browser-verification.json) conserve **18 contrôles au total**, six pour chacune des fenêtres 1120 × 1000, 390 × 844 et 320 × 740, ainsi que **18 captures PNG natives complètes**. La fixture React de ce dernier lot passe ESLint strict, après séparation de son état de présentation et du moteur impératif. Aucune erreur JavaScript, console ou ressource manquante n’a été observée dans cette recette. Les captures de 390 × 844 et 320 × 740 utilisent une émulation tactile ; aucune manette ou aucun téléphone physique n’est qualifié. Le répertoire par défaut est désormais `outputs/qa-hunt-harvest-preview-20261109` ; un reçu existant ne peut pas être réécrit par relance accidentelle.

## Ce qui a réellement été exécuté

Le composant React `HuntRitesMenuV77`, ses styles et SVG existants sont montés dans un cadre de contrôle. Le callback de production affecté à `riteMenuActionRef.current` est extrait sans réécriture par l’AST TypeScript de `HuntCanvas.tsx` ; son empreinte figure dans le rapport. Le corps de départ est créé par les vrais `makeEnemy` et `damageEnemy`. Les boutons du vrai menu déclenchent le dépeçage puis le prélèvement. La progression utilise `updateHuntRitesV77` en pas de 1/120 s. La navigation manette passe par le vrai `stepGame` et `flushCorpseRiteGamepadV112`, avec un périphérique logiciel explicitement émulé.

Le cadre ne dessine pas le monde de chasse. Il ne constitue pas une partie complète, une victoire de campagne, un essai de toutes les entrées du composant `HuntCanvas`, une mesure de performance cible, une revue artistique ou une observation humaine de compréhension. Les captures conservent le défilement réel du panneau : une image de la capacité avant action et une image de la partie après défilement décrivent deux vues successives, pas un montage.

## Cas et limites déclarés

- Sac vide : masse, volumes et projection de la peau de chien de chasse sont affichés avant prélèvement, avec le lien `aria-describedby` vers leur description.
- Prélèvement sans analyse préalable : l’intégrité réelle de 91 produit une qualité de 79, conservée après l’action. L’analyse est ensuite désactivée, avec une explication visible et reliée au bouton. Douze déplacements de sélection par contexte ne ciblent jamais cette action devenue impossible.
- Masse seule : cinq cuirs du catalogue `naraka-delta--iron-croc` sont placés dans une fixture de sac scout, soit 22 kg / 15 volumes. La peau proposée mène à 24,4 kg / 18 volumes pour une capacité de 24 kg / 18 volumes.
- Volume seul : huit cuirs du catalogue `hell-hound-stalker` composent une fixture de sac hunter de 19,2 kg / 24 volumes. La partie proposée dépasse uniquement les 24 volumes autorisés.
- Dépôt : le nombre de places libres de l’adaptateur réel est fixé à zéro dans la fixture. Le menu annonce le dépôt plein et le bouton désactivé n’ajoute aucune prise.

Les sacs aux limites sont des états initiaux construits à partir du catalogue ; leur acquisition et le déblocage de l’armure scout ne sont pas joués dans cette recette. La saturation du registre de 64 prises, les interruptions au dernier tick et l’autorité finale de l’adaptateur sont couverts séparément par les tests de modèle du lot, pas déduits de ces images.

## Provenance

Chaque rapport garde son propre commit de checkout et l’état de travail observé, plus les empreintes précises des sources et du bundle exécutés. Le [dernier reçu d’identité](native-lint-final/implementation-source-receipt.json) vérifie que les sept fichiers d’application testés correspondent exactement au commit logiciel `ebe17184965307d9c636d45561a19c431802c4ab`. Ce rapprochement ne prétend pas être une nouvelle exécution navigateur sur ce commit. Le rapport initial au présent niveau, `first-pass/` et `native-final/` conservent leurs sources de recette antérieures ; seule la passe `native-lint-final/` qualifie la fixture React et le launcher finaux.

La [première passe](first-pass/browser-verification.json), qui contenait quinze captures avant l’ajout des vues de capacité, est conservée avec ses sources de recette. Aucun PNG ou reçu d’une publication antérieure n’a été modifié. Ces contrôles ne ferment aucune des huit qualifications humaines, matérielles ou de campagne complète du classeur V112.
