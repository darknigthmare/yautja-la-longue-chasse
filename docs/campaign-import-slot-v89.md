# V89 — Import de campagne JSON dans un emplacement vide

Le menu principal propose **Importer une campagne JSON**. Le joueur choisit un des cinq emplacements entièrement vides, ouvre son fichier, consulte le propriétaire d’origine, le chasseur, le temps joué, le lieu de reprise et les avertissements, puis confirme dans un dialogue séparé. L’import ajoute un checkpoint intégral `auto-1` au nouvel emplacement, à la révision 1. Il reste dans le menu : la campagne se reprend ensuite par **Continuer** ou **Charger une partie**, avec les protections habituelles de changement de propriétaire.

## Formats et limites

- Formats acceptés : enveloppe de `exportSave` (`yautja-long-hunt.save-export`, version prise en charge par `parseSaveImport`) et JSON historique `SaveGame`, avec ou sans BOM UTF-8.
- Limite : 1 Mio (`SAVE_MAX_SERIALIZED_BYTES`). L’interface refuse un fichier trop grand avant `File.text()` ; le modèle contrôle aussi la taille du texte et les octets UTF-8.
- Le `createdAt` brut doit déjà être une date valide et rester exactement identique après `parseSaveImport`. Une date absente ou invalide n’est jamais remplacée par une identité générée pour cet import.
- Le contenu passe par le parseur existant : les migrations et normalisations des sauvegardes historiques restent celles du jeu. Les versions futures, le JSON illisible et les formats non reconnus sont refusés. Le fichier n’est jamais exécuté.

Le contrôle de propriétaire évite les doublons dans les archives locales ; ce n’est pas une signature ni une authentification du contenu fourni par le joueur.

## Invariants de stockage

`prepareCampaignSlotImport(slotId, serialized, storage?)` est strictement en lecture seule. Son aperçu gelé est une capacité temporaire liée, par une `WeakMap` interne, au texte source, à l’objet de stockage et aux préimages exactes. Copier ou sérialiser cet aperçu ne permet pas de confirmer l’import.

`importCampaignSlot(preview, storage?)` confirme sous le Web Lock existant. Il relit les préimages, reparcourt les protections, valide l’archive intégrale et utilise `persistSlot(..., null)` pour une seule écriture atomique du document de l’emplacement. Le journal de transfert multiclés existant est destiné aux activations de campagne ; il n’est pas détourné pour une opération qui ne doit pas remplacer le workspace.

- Un emplacement vide exige l’absence de son document principal **et** de sa copie `.backup`.
- Chaque principal et chaque secours des cinq emplacements sont analysés séparément. Un secours caché par un principal valide protège encore son propriétaire, ses données corrompues et ses versions futures.
- Le propriétaire source est refusé s’il existe dans un emplacement, un secours ou l’une des deux copies de la campagne de travail.
- Une campagne de travail non attribuée doit être migrée avant l’import ; une récupération ou un transfert en attente bloque l’opération.
- Les préimages couvrent les dix copies d’emplacements, les deux copies du workspace, le journal, les annexes communes et les dossiers THE PIT / replay des propriétaires source et workspace. Un changement entre aperçu et confirmation impose de relire le fichier.
- Aucune clé de campagne active, de secours, de chasse, de progression du vaisseau ou THE PIT n’est modifiée ou supprimée. Le résultat retourne `save: null` : l’import ne constitue pas une entrée en jeu.
- Sans Web Lock, avec verrou indisponible, quota dépassé ou relecture impossible, aucune réussite n’est annoncée. Une écriture persistée avant une exception est vérifiée par relecture ; elle n’est pas répétée.

## Annexes et progression

Un export léger ne contient pas les annexes présentes sur un autre appareil. L’aperçu utilise `createCompleteArchive` sur une vue en lecture seule : les annexes locales compatibles appartenant déjà au propriétaire source sont capturées ; celles d’un autre propriétaire restent dans le stockage et ne sont pas revendiquées. Les annexes source futures ou illisibles bloquent la capture.

La vue d’import exige un propriétaire explicite pour reprendre une progression de vaisseau. Une ancienne annexe v1/v2 sans propriétaire reste locale et produit un avertissement ; sa date récente ne permet jamais de la rattacher à la campagne étrangère. Une version future ou une annexe incompatible reste protégée.

Si aucune annexe de progression du vaisseau compatible n’existe, le schéma d’archive emploie sa projection par défaut existante. Le `SaveGame` importé, ses vaisseaux acquis, ses étapes de prologue et son histoire ne sont pas modifiés. Aucun vaisseau, palier, récompense, XP ou annexion n’est accordé par cet import. Le résolveur existant garde notamment la priorité d’une chasse suspendue, du prologue et de la formation Unblooded.

## Sessions et interface

Le choix d’un autre emplacement, le retour au menu ou le démontage de l’interface invalide la lecture asynchrone en cours. Une confirmation est attachée à l’aperçu affiché ; changer les données du catalogue désactive les actions devenues protégées. `CampaignFrontEnd` contrôle également la génération du menu et l’opération en cours : un ancien callback ne peut importer après changement de session, et un résultat tardif ne peut ouvrir une campagne. Une double confirmation ne lance pas deux opérations.

Le dialogue utilise le focus et la navigation clavier/manette déjà employés par les archives ; l’arrière-plan est inerte pendant la confirmation. Le panneau de prévisualisation adapte ses colonnes sur les écrans étroits.

## Validation bornée

`tests/campaign-import-slot-v89.test.mjs` comporte 17 tests de modèle et de handlers réels : formats, propriétaire, un seul emplacement écrit, activation séparée, annexes locales conservées, annexe vaisseau ancienne sans propriétaire, secours cachés, versions futures, taille UTF-8, conflits de préimages, capacité copiée, Web Lock, quota, écriture non confirmée, aperçu/confirmation, annulation et résultat tardif de session.

Exécution avec les suites `campaign-slots`, `campaign-menu-ui` et `campaign-front-menu-v50` : **63/63 passent**. TypeScript ciblé et ESLint des trois fichiers modifiés et du test dédié contrôlés séparément. Ces tests exécutent le modèle et les handlers TSX ; ils ne prouvent pas un téléchargement de fichier, une navigation manette ou un rendu mobile dans un navigateur réel. Aucun build global ni déploiement n’a été lancé pour ce lot.
