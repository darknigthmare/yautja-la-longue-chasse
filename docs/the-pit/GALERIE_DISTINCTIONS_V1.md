# THE PIT — galerie consultable des distinctions V1

**Périmètre :** extension 02, rubriques 50–58 et 63–65 ; continuité avec l’extension 01, rubrique 43. Base de travail : `5c68b1354d5af0d66ee7834cd4592c35fe622721` sur `codex/the-pit-combat-bible-extensions-20261127`, 27 novembre 2026.

## Comportement ajouté

Le panneau des distinctions devient une galerie consultable des **18 récompenses existantes** : douze palettes Arcade, cinq distinctions du Circuit et la bannière finale de la Descente. Les cartes acquises et verrouillées disposent du même bouton « Consulter la distinction ». Un filtre permet de consulter toutes les distinctions ou un parcours précis ; le filtre des seules distinctions obtenues reste disponible.

Chaque fiche présente le nom autorisé, l’état d’accès, le parcours d’origine, le mode d’attribution, les étapes nécessaires et la progression enregistrée. Pour le Circuit et la Descente, un volet présente séparément les douze chasseurs. Une seule de ces voies suffit : les compteurs de chasseurs différents ne sont jamais additionnés. Les compteurs du Circuit sont ramenés aux limites réelles du chapitre, tout en conservant les prérequis des chapitres antérieurs.

Le bouton principal prépare le parcours avec le chasseur le plus avancé vers cette condition ; à égalité, l’ordre du registre détermine la proposition. Chaque ligne permet aussi de choisir explicitement un autre chasseur. La galerie émet une requête de préparation, puis l’application conserve les confirmations habituelles de la sélection. Elle n’attribue aucune victoire, récompense ou progression.

Une fiche se ferme par « Fermer », « Retour aux distinctions » ou Échap. Le focus initial se place sur son titre, Tab et Maj+Tab restent dans la fiche, et la fermeture rend le focus à la carte d’origine. Le clavier de la fiche ne traverse pas vers les raccourcis du parent. Un changement de campagne réinitialise les filtres et la fiche ouverte. Une archive devenue illisible ferme la fiche et affiche l’erreur du panneau.

## Sources, fidélité et portée

Les identités, conditions et récompenses proviennent de [`pitHonors.ts`](../../app/game/systems/pitHonors.ts), [`pitArcade.ts`](../../app/game/systems/pitArcade.ts), [`pitCircuit.ts`](../../app/game/systems/pitCircuit.ts) et des données validées par [`pitSave.ts`](../../app/game/systems/pitSave.ts). [`pitContentAccessV1.ts`](../../app/game/systems/pitContentAccessV1.ts) reste la projection d’accès : aucun état commercial nouveau n’est créé.

Les distinctions et sceaux du menu portent le statut **création originale de THE PIT**. Leur présentation n’établit aucun rituel, glyphe ou lieu canonique. La galerie est une interface consultable ; la pièce exploratoire, les vitrines physiques, coffres et scènes de révélation restent des travaux distincts. Aucun combattant, costume, stage ou mode précédemment disponible n’est verrouillé par ce lot.

Les palettes verrouillées gardent leurs couleurs masquées. Les fiches secrètes ou seulement indiquées par un indice n’exposent aucun itinéraire nommé via le modèle de galerie. Le catalogue actif contient uniquement les 18 distinctions déjà identifiées dans le registre ; cette protection n’ajoute aucun personnage secret fictif.

L’attribution automatique et permanente est celle des règles de progression existantes. Le panneau ne propose pas de bouton « Réclamer » pour une récompense déjà attribuée automatiquement. Posséder une distinction n’atteste pas que le costume, la bannière animée ou l’intro suggérée par son nom possède tous ses assets. La séparation entre droit, installation et compatibilité reste visible lorsque ces axes empêchent l’affichage.

## Raccordement des parcours

[`pitHonorGalleryV1.ts`](../../app/game/systems/pitHonorGalleryV1.ts) fournit le type partagé et l’unique normalisation de la requête :

```ts
interface PitHonorRouteRequestV1 {
  readonly mode: "arcade" | "circuit" | "descent";
  readonly fighterId?: PitFighterId;
  readonly chapterId?: string;
}

normalizePitHonorRouteV1(value: unknown): PitHonorRouteRequestV1 | null
```

La normalisation accepte seulement les trois modes de progression et leurs douze chasseurs historiques. Elle retire les champs inconnus, refuse les identités non admissibles et n’accepte un chapitre que pour le Circuit. Un chapitre constitue une cible à expliquer, jamais une instruction de sauter les combats précédents. L’état réel du parcours et ses reprises restent l’autorité.

| Récompense | Parcours préparé | Cible |
| --- | --- | --- |
| Douze `PIT_ARCADE_LADDERS[fighterId].cosmeticRewardId` | `arcade`, chasseur exact de la palette | Les huit rencontres du parcours de ce chasseur |
| `pit-emblem-circle-call` | `circuit` | `call-of-the-circle` |
| `pit-banner-three-paths` | `circuit` | `three-paths` |
| `pit-title-trophy-keeper` | `circuit` | `stolen-trophies` |
| `pit-palette-ashen-circle` | `circuit` | `desecrated-pit` |
| `pit-intro-elder-verdict` | `circuit` | `judgment` |
| `pit-banner-descent-survivor` | `descent` | Les huit étages, dernier adversaire compris |

La requête passe par `onOpenPit(request?)`. Le bouton général « Rejoindre THE PIT » appelle ce callback sans argument ; il ne transmet pas l’événement de clic comme une configuration de parcours. Le raccordement à l’application et à `PitCanvas` fait partie de la branche, avec une vérification distincte du présent banc de composants.

## Propriété des données et fichiers

[`PitHonorsPanel.tsx`](../../app/game/PitHonorsPanel.tsx) conserve sa lecture de la sauvegarde liée au propriétaire exact et sa distinction entre absence, corruption, version future et conflit de propriétaire. Les opérations de consultation, filtre, ouverture, fermeture et préparation de parcours n’écrivent pas dans le stockage. Elles ne créent pas une sauvegarde concurrente et ne changent pas le schéma V5.

[`PitHonorDetail.tsx`](../../app/game/PitHonorDetail.tsx) porte le dialogue accessible ; [`PitHonorsPanel.module.css`](../../app/game/PitHonorsPanel.module.css) conserve la direction visuelle du panneau et adapte la fiche aux petits écrans. La fiche ne contient ni animation obligatoire, ni flash. Ses contrôles gardent une hauteur minimale de 44 pixels.

## Validation effectuée

Les [sept tests de galerie](../../tests/pit-honor-gallery-v1.test.mjs) couvrent la normalisation, les 18 correspondances, un véritable parcours de résultats Arcade sauvegardé puis rechargé, les limites du Circuit, les parcours individuels de Descente et la protection des identités non révélées. Les sauvegardes de test sont préparées par les [réducteurs de production](../../tests/fixtures/pit-honors-gallery-v1.ts), sans booléen arbitraire accordant une récompense.

**48/48 tests ciblés réussis**, dont les sept nouveaux :

```sh
node --experimental-strip-types --test tests/pit-honor-gallery-v1.test.mjs tests/pit-content-access-v1.test.mjs tests/pit-save.test.mjs tests/pitHonors.test.ts
```

Le lint et le typage ciblés ont terminé avec le code de sortie 0 :

```sh
node_modules/.bin/eslint app/game/PitHonorsPanel.tsx app/game/PitHonorDetail.tsx app/game/systems/pitHonorGalleryV1.ts tests/pit-honor-gallery-v1.test.mjs tests/fixtures/pit-honors-gallery-v1.ts tests/browser/pit-honors-gallery-v1.fixture.tsx scripts/qa-pit-honors-gallery-v1.mjs

./node_modules/.bin/tsc --noEmit --target es2022 --module esnext --moduleResolution bundler --jsx react-jsx --esModuleInterop --resolveJsonModule --skipLibCheck --strict --lib esnext,dom,dom.iterable app/game/PitHonorsPanel.tsx app/game/PitHonorDetail.tsx app/game/systems/pitHonorGalleryV1.ts tests/fixtures/pit-honors-gallery-v1.ts tests/browser/pit-honors-gallery-v1.fixture.tsx node_modules/next/types/global.d.ts
```

Le [scénario Chromium](../../scripts/qa-pit-honors-gallery-v1.mjs) monte les vrais composants avec la [fixture dédiée](../../tests/browser/pit-honors-gallery-v1.fixture.tsx). **13/13 scénarios passent**, sans erreur JavaScript, avertissement React ou ressource HTTP manquante. Il vérifie les 18 ouvertures, les filtres 12/5/1, le focus/Échap, les trois requêtes de parcours, les compteurs par chasseur, l’acquisition réelle, le changement de propriétaire, les archives corrompues et le format mobile 390 × 844 à mouvement réduit. Les appels d’écriture au stockage sont instrumentés et restent absents pendant ces interactions.

Le hook réel [`useMenuGamepad`](../../app/game/useMenuGamepad.ts) est également monté. Une manette émulée dans `navigator.getGamepads` vérifie A pour consulter, la direction pour déplacer le focus, puis B maintenu pour fermer uniquement la fiche. Le menu parent ne reçoit aucun retour pendant ce maintien ; un nouvel appui B après relâchement atteint ensuite le parent. Ce contrôle valide le raccordement logiciel au dialogue natif et à `requestClose`, sans qualification d’un périphérique physique.

La première passe a révélé que Tab pouvait atteindre le chrome du navigateur depuis la dernière commande du dialogue. Le rebouclage explicite Tab/Maj+Tab corrige ce comportement ; la passe finale couvre ce cas. Les images finales ont été prises directement dans Chromium, avec la fenêtre réelle pour les dialogues.

- [Rapport machine et empreintes des sources](qa/honor-gallery-20261127/report.json)
- [Galerie verrouillée](qa/honor-gallery-20261127/gallery-locked-desktop.png)
- [Fiche du Circuit et voies individuelles](qa/honor-gallery-20261127/gallery-circuit-detail-desktop.png)
- [Distinction acquise](qa/honor-gallery-20261127/gallery-earned-detail-desktop.png)
- [Fiche sur mobile](qa/honor-gallery-20261127/gallery-earned-detail-mobile.png)

Le runner accepte `PIT_QA_CHROMIUM`, `PIT_QA_CHROMIUM_ARGS_JSON` et `PIT_QA_OUTPUT`. L’exécution dans cet environnement a utilisé le Chromium portable déjà présent, ses arguments de lancement fournis par `@sparticuz/chromium`, et le dossier de preuves ci-dessus. Aucune dépendance du dépôt n’a été installée ou modifiée pour ce lot.

Ces résultats portent sur les composants et leurs callbacks. Les victoires des fixtures sont une préparation canonique des données, pas des combats joués dans le navigateur. Les parcours complets de l’application, une manette physique, un lecteur d’écran réel, un build global et la totalité des 22 cas de l’extension 02 ne sont pas validés par ces treize scénarios. Aucun asset de personnage ni certificat artistique 1:1 n’est produit par ce chantier.
