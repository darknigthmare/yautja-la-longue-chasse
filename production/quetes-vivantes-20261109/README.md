# Quêtes vivantes — lot du 9 novembre 2026

## Livraison réellement publiée

Le code du lot est dans `84a8ff61e4d08ab8ebd9875b56b01fbb97636fbe`, à partir de `19317af4f6cf05532a8ba56dbfe8f56fc4b225d9`. Les ajouts ultérieurs de suivi, de classeur et de CI ne sont pas présentés comme une nouvelle exécution de ce code. Aucune fusion ni publication en production n'est effectuée par ce lot.

[Ouvrir le vrai classeur XLSX](Yautja_Quetes_Vivantes_Bible_20261109.xlsx) · [Avenant narratif à la bible](../../docs/campagne/QUETES_VIVANTES_20261109.md) · [Reçu du classeur](verification-classeur.json) · [Reçu des validations](verification.json).

### Du contenu jouable, pas seulement des consignes

- Douze opérations du Clan Ship ont leurs résumés, demandes et étapes réécrits. Les trois incidents et les trois issues du retour du Berceau sont également repris. Les identifiants, récompenses, prérequis et actions restent ceux du moteur.
- Six contacts ont une voix propre : Balafre de Cendre, Veille des Routes, Griffe de Fer, Trace Froide, Suture Noire et Garde du Seuil.
- Cinquante variantes de répliques alimentent quatre sujets accessibles au vrai poste : prendre des nouvelles, prochaine sortie, accord et dernier affrontement.
- Les répliques consultent le contrat en cours, les accords existants et le dernier engagement spatial réellement enregistré : victoire, défaite et repli ne sont pas confondus. Aucun mensonge sur une blessure précise ou un trophée non prélevé.
- Le modèle ne crée aucun événement de progression. Aucun recrutement, quartier, marque, honneur ou trophée n'est accordé en parlant. Réserve, affectation, suspension et audience C37 sont respectées ; aucun personnage absent n'est créé.
- Le composant reste dans le panneau de poste natif. Les touches et le routage existants sont conservés ; aucun essai matériel de manette n'est revendiqué.

La technologie avancée n'est pas remplacée par un folklore arbitraire. Les motivations concernent les armes, la préparation, les preuves de chasse, les prises dangereuses et les retours d'équipage. Les usages écrits pour ce clan sont explicitement des créations du jeu, pas des lois universelles de l'espèce. Les références primaires sont dans l'avenant et le classeur.

## Vérification exécutée sur le code publié

[Run natif 42566142213](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/42566142213), job `128992953938` : toutes les étapes réussies. Le workflow est déclenché sur `08319327`, matérialise et vérifie les sources, puis crée le commit `84a8ff61` ; le rapport navigateur porte explicitement ce dernier SHA.

- **184 tests réussis, aucun échec ni test ignoré.** Les 21 nouveaux tests de dialogue sont inclus, pas ajoutés à ce total.
- Typage complet et lint strict réussis. Relevé courant officiel régénéré puis vérifié : 2 206 entrées ; attestations historiques non modifiées.
- **81 contrôles navigateur réussis, 21 PNG** : 27 contrôles dans chacun des formats 1 440 × 1 000, 390 × 844 et 320 × 740. Les six contacts, les quatre sujets, une escorte jouée par cinq ordres natifs, la réaction au retour et le rechargement sont exercés. La récompense normale de l'escorte reste unique ; parler ne l'augmente pas.
- Le rapport signale `browserExecuted=true`, `passed=true`, aucune erreur et aucune ressource manquante. Ses onze empreintes de sources concordent avec la livraison.

### Portée de la fixture et revue visuelle

Les prérequis de campagne sont préparés par les reducers de production, pas joués dans cette recette : adulte, 1 912 marques et sept contrats accomplis. Aucun recrutement, engagement spatial victorieux ou échange n'est prérempli. L'escorte est ensuite exécutée dans le navigateur.

Trois captures ont été ouvertes individuellement lors de cette passe : Griffe de Fer en 1 440 px, Suture Noire en 390 px et Veille des Routes après escorte en 320 px. Les répliques et quatre commandes y sont lisibles. Une notification existante recouvre une partie du pied du panneau sur les captures mobiles ; elle ne bloque pas les boutons testés. Les 21 PNG sont conservés dans l'archive, mais une revue visuelle exhaustive des 21 images n'est pas revendiquée.

Ce parcours ne qualifie ni toute la campagne, ni un mobile réel, ni une manette physique, ni la fidélité artistique 1:1. Aucun nouveau build global de production n'est annoncé. Les scènes et sprites existants sont réemployés ; aucun nouveau sprite, cycle, son ou VFX dédié n'est livré.

### Preuves et essais antérieurs

Artifact `13651468850` : archive ZIP de 3 224 686 octets, SHA-256 `57d03afdc2c31f71a490cfcc2a9393eaa735574ea7988affff4d57c84397185c`. Rapport navigateur : 15 776 octets, SHA-256 `e2fdfac26898d63a21b1807e2657e44c8bd90455d2824311025575f5e68d341b`. Les artefacts Actions ont une rétention limitée ; la livraison conversationnelle conserve aussi l'archive originale.

Les échecs locaux restent distincts : premiers manifestes JSON absents, comparaison de l'horodatage d'une enveloppe d'export, puis contrôle des PNG indisponibles dans la copie sparse. La comparaison a été corrigée pour porter sur la sauvegarde réelle et les sources JSON ont été restaurées. Les PNG n'ont pas été remplacés : le run GitHub utilise les originaux et passe les 184 tests. Les anciens échecs ne sont pas requalifiés en réussites locales.

## Excel et suivi de la bible

Neuf feuilles : Synthese, Chantiers, Criteres, Quetes, Voix, Reecritures, Validation, Sources et References. Elles conservent **73 chantiers** (71 hérités + deux compléments Berceau/recette globale), **118 critères**, **12 opérations**, **50 variantes**, **87 réécritures** et les empreintes de **111 classeurs historiques inchangés**. Les résultats déjà acquis par C37 ne sont pas remis à zéro, et les autres métiers ne sont pas déclarés terminés par ce changement de texte.

XLSX : 427 081 octets, SHA-256 `5344019af67069a48268ae866498b4552fdad83ae996cbe002868cfefde2931c`, blob Git `843db37e458199abd0f4175240010477553cc812`. Cinq formules avec résultats calculés, aucune cellule d'erreur et CRC corrects. [Publication et relecture du classeur réussies](https://github.com/darknigthmare/yautja-la-longue-chasse/actions/runs/42568728945). Les membres XML produits par artifact_tool sont conservés à l'identique ; seul leur conteneur ZIP est normalisé pour un transfert reproductible.

## Restant explicitement ouvert

OPS-B04 demande encore l'équipe blessée réellement accompagnée du hangar aux soins. OPS-B06/B07 et les autres incidents encore absents ne sont pas fabriqués par une réplique. R2-M027 conserve la visite physique du mentor, l'intégrité propre de la crête, le nettoyage animé et l'audio dédié. OPS-Q26 reste une recette plus large. Les intitulés administratifs résiduels de certaines interfaces, la présentation cinématique des échanges et les animations/dialogues sonores dédiés restent à reprendre.

Les anciennes PR mobilité, Badlands et sources de compagnons ne sont pas modifiées. Les outils temporaires de transfert sont retirés ; la CI conservée est en lecture seule, sans téléchargement de livraison, auto-commit ou push.
