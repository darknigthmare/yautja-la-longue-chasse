# Xeno Prime — sources, concordance et vérification

> Historique du contrôle du 5 novembre. La livraison des 23 nouveaux sprites et le passage à 108 sont détaillés dans [PRODUCTION_20261106.md](PRODUCTION_20261106.md). Les chiffres ci-dessous décrivent leur snapshot historique.

Contrôle documentaire du **5 novembre 2026**, pour la [PR #116](https://github.com/darknigthmare/yautja-la-longue-chasse/pull/116), branche `claude/bible-de-campagne`. Révision du dépôt examinée avant cet ajout : **`3eb927af09414713a9db37d136669f6f80538866`**. Les résultats ci-dessous portent sur les sources et les documents ; les 28 critères de jeu de [INTEGRATION_ET_QA.md](INTEGRATION_ET_QA.md) restent ouverts.

## 1. Sources du raccord de campagne

| Source consultée | Éléments vérifiés |
| --- | --- |
| [BIBLE_DE_CAMPAGNE.md](../BIBLE_DE_CAMPAGNE.md), campagne révisée L-01 à L-10, échelle des rangs et fiches R2-M025 à R2-M027 | Xeno Prime après les huit chasses ; préparation, première reine, preuve rapportée et débrief ; Quatza-Rij solo et rites distincts ; intentions MUS-41/MUS-42/MUS-07. |
| [Classeur V6](../../suivi-production/classeurs/Yautja_V6_Bible_Cumulative_et_Dialogues.xlsx) | PLAN08, zones globales, première reine et jalon commun. Blob Git examiné : `c0ce09f644f44fad77de9ee6af33fb9101cc49a2`, 2 101 543 octets. Lecture seule, aucun enregistrement du classeur. |
| [Compagnons et alliés](../COMPAGNONS_ET_ALLIES_PREMIUM.md) et [catalogue](../CATALOGUE_COMPAGNONS.md) | ALL-01 à ALL-10, recrutement, affectation, déploiement, habitats et individus déjà établis. |
| [Warp Universe](../WARP_UNIVERSE.md) et [mobilité](../mobilite/README.md) | Expédition physique distincte des Chroniques ; vaisseau personnel, limites de passage et absence de recrutement ou transfert automatique. |
| [Données de jeu](../../../app/game/data.ts), [écrans](../../../app/game/worldScreens.ts), [routes](../../../app/game/systems/worldBlueprints.ts) et [écologie](../../../app/game/ecologyV8.ts) | Huit chasses existantes ; Mycora-V/Cœur-Mère distincts ; budgets de points de contrôle 2/1/0/0 ; système d’écrans et passages à raccorder lors de l’implémentation. |
| [Sauvegarde de chasse](../../../app/game/systems/activeHuntSave.ts) et [sauvegarde générale](../../../app/game/save.ts) | Propriétaire et règles de reprise à respecter ; aucun stockage modifié par cet ajout. Les clés `queen.*` ne figurent pas dans ces deux fichiers ni dans `data.ts` examinés : ce constat n’est pas une recherche exhaustive dans tout le dépôt. |
| [AGENTS.md](../../../AGENTS.md), [guide gamedev](../../GAMEDEV_AGENT_GUIDE.md) et [manifestes de références](../../gamedev-skill-sources.json) | Vérification proportionnée à un ajout documentaire ; séparation des preuves techniques, de l’intégration, de la QA de jeu et de la revue artistique humaine. |

L’export principal et le classeur V6 restent conservés. Le rattachement des douze compositions au secteur XP-Z12 et la reine enracinée sont **les décisions de conception explicites de ce complément** ; ils ne sont pas présentés comme un découpage déjà réalisé dans le moteur ou comme une correspondance numérotée préexistante dans le V6.

## 2. Concordance des zones globales et des tableaux locaux

La feuille `Xeno Prime` du classeur conserve les zones suivantes :

| Identifiant global | Nom dans le classeur | Cellules |
| --- | --- | --- |
| XP-Z01 | Point d’atterrissage | A6:L6 |
| XP-Z02 | Lisière résineuse | A7:L7 |
| XP-Z03 | Galerie des traces | A8:L8 |
| XP-Z04 | Puits des conduits | A9:L9 |
| XP-Z05 | Salle des mues | A10:L10 |
| XP-Z06 | Passage des colonnes | A11:L11 |
| XP-Z07 | Nid périphérique | A12:L12 |
| XP-Z08 | Carrefour des échos | A13:L13 |
| XP-Z09 | Tête de reine géante au sol | A14:L14 |
| XP-Z10 | Couloir de retour haut | A15:L15 |
| XP-Z11 | Antichambre de la reine | A16:L16 |
| XP-Z12 | Arène de la reine active | A17:L17 |

Preuves de la distinction entre vestige et cible :

- `Atlas des mondes!A13:M13` : PLAN08 est une géographie originale à douze secteurs, avec une tête géante et une arène distincte ; accès Blooded, vaisseau réellement acquis, route relevée et trajet joué.
- `Xeno Prime!F14:I14` : tête couchée et contournable, inspection de l’ancienneté du vestige ; aucune validation de la première reine.
- `Xeno Prime!E17:I17` : XP-Z12 rejoint XP-Z11 et l’extraction de secours ; trois hauteurs, deux refuges, sorties annoncées, combat, survivants et preuve rattachés au jalon commun.
- `Parcours complet!D25:F25` : première reine en XP-Z12 ; XP-Z09 ne constitue pas une victoire.
- `V5 États communs!B11:I11` : `firstQueenResolved`, issues `non_resolu`, `reussi`, `echoue`, `replie` ; le vestige ne valide pas la première reine et les conséquences d’un événement ne sont pas consommées deux fois.
- `Réactions et gestes V6!D403:F403` : la réaction de M026 distingue la tête morte de XP-Z09 de la cible vivante en XP-Z12.
- `Scènes de dialogue V6!A503:K503` : la reine d’un nid secondaire, après la première reine commune, appartient à une mission collective distincte.

Le raccord retenu est **XP-Z11 → XP-Z12 / XENO-BE-T01 → … → XENO-BE-T12**. T01 est l’entrée locale du bassin, T09 sa pouponnière et T12 le combat final. Aucun suffixe Txx n’est converti automatiquement en XP-Zxx. La sortie rejoint physiquement XP-Z11 ou l’extraction de secours du bassin. Les trois hauteurs et deux refuges du V6 restent des exigences ouvertes de géométrie jouable.

## 3. Preuves de fichiers et conservation des sources

L’archive consolidée `Xeno_Prime_V2_Actualise_85_Sprites_12_Tableaux.zip` a été récupérée pour cette intégration. Son SHA-256 est **`4f50a743700c746d0056dd7781c56cfdf418b12fab3e3ad07511e253de26da68`** ; sa taille est de **346 867 734 octets**. Le contrôle CRC ne signale aucune entrée corrompue. Ses **136 entrées** contiennent **120 PNG** : 91 ressources du manifeste, 25 compositions et quatre planches ou aperçus.

Les deux archives complémentaires, sept ajouts et sources/prompts, conservent leur empreinte issue du reçu de livraison vérifié le 17 septembre 2026. Leurs octets n’ont pas été retéléchargés pendant ce raccord. Les sept ajouts sont inclus dans les 85 sprites ; les archives ne doivent pas être additionnées comme des lots indépendants. Les liens et empreintes sont dans [ASSETS.md](ASSETS.md).

| Contrôle réalisé | Résultat |
| --- | --- |
| Décodage, dimensions et empreintes des PNG du manifeste | 91 ressources conformes ; 91 SHA-256 distincts. |
| Alpha des sprites et mode des fonds | 85 sprites RGBA avec pixels transparents et visibles ; six fonds RGB opaques. Aucun verdict artistique déduit de ces mesures. |
| Identifiants livrés / non produits | 85 sprites livrés, 23 absents, intersection vide ; union exactement 001–108. Six IDs de fonds séparés. |
| Références de reprise | 18 demandes prêtes du point de vue des références ; cinq dépendances à produire d’abord, sans cycle. Les 23 prompts et leur provenance sont conservés. |
| Scènes et exports | 12 scènes, 312 placements avant transformation, 25 fichiers de composition et 23 empreintes distinctes. Les vues avant/après de T01 et T11 sont identiques, conformément à leur état inchangé. |
| Références de composition | Chemins, IDs et clés documentaires correspondent aux ressources disponibles ; tous les liens entre tableaux ont une cible valide et un retour. |
| Conservation de la géométrie | Champs d’origine de `SCENES_XENO_PRIME_V2.json` et `COMPOSITION_SOUFFLE_V2.json` conservés, y compris placements, tailles, ancres et transitions d’état. Les espaces de noms et le raccord de campagne sont des métadonnées documentaires ajoutées. |
| Révélation du boss dans les compositions | Aucune pose de tête complète dans T01–T11 ; T12 contient la reine active. Le vestige global XP-Z09 reste hors de ces douze compositions. |
| Structure documentaire | Les quatre fichiers JSON sont lisibles ; renvois Markdown locaux résolus dans l’arbre du dépôt ; `git diff --check` sans erreur. |
| Périmètre du changement | Index `docs/campagne/README.md` et nouveau dossier `docs/campagne/xeno-prime/` uniquement ; export principal, note de rangs, classeur, annexes précédentes, code de jeu et sauvegardes conservés. |

Les données documentaires conservent les noms et IDs d’origine. Six chemins absolus temporaires de génération de fonds sont remplacés par leurs seuls noms de sortie dans les métadonnées de provenance ; les chemins canoniques relatifs à l’archive restent inchangés. La référence ancienne 025 pour la demande 028 est explicitement rapprochée de BG01, référence du prompt consolidé, dans [REPRISE.md](REPRISE.md).

## 4. Limites et suite de production

Les 23 images manquantes restent `non_produit`, notamment l’agonie 097 et le bulbe rompu 098. Les sept poses disponibles ne forment pas un cycle d’animation livré. Les capsules 056/057 sont des props fermés encore absents, pas deux ennemis animés produits. Le trophée 100 sur socle illustre une récompense ; il ne remplace pas le prélèvement, le transport et le retour effectif de la crête.

Les PNG sont référencés dans leurs archives, sans import dans `public/`. Aucun build, test de gameplay, mesure de performance, QA navigateur/manette ou validation artistique humaine n’a été effectué pour ce complément documentaire. L’intégration moteur, les animations, collisions, télégraphes, sauvegardes, sons et les **28 contrôles XBE-Q01 à XBE-Q28** restent à réaliser. Les champs `runtime_integrated` et `human_art_validation` restent `false`.

La limite de génération signalée dans le reçu de septembre est historique. Elle ne constitue pas un constat sur le service au 5 novembre et aucune nouvelle génération n’a été tentée pendant l’intégration à cette PR.
