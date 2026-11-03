# Audit V94 — corrections de fiabilité, PR #4

16 octobre 2026. Suite de la branche `fix/v94-audit-reliability-20261016`, à partir de `da7ff997c38b2b5213e18cf41ce58357553ab8d1`. Le lot reste une proposition de correction, pas une sortie complète du jeu.

## Corrections raccordées

**Reprise (AUD-01).** Le résolveur partagé ne laisse plus un ancien statut `at-city` remplacer un checkpoint explicite de vaisseau ou de chasse. Les voyages inachevés conservent leur priorité et les protections du prologue et des sept étapes de jeunesse/solo restent exécutées avant la délégation. Aucune donnée d’historique, identité de propriétaire, sauvegarde ou version de schéma n’est effacée.

**Mausolée (AUD-02).** Les touches physiques sont suivies séparément : alias, touches opposées, ordre de pression, relâchement d’une touche sans rapport, répétition et perte de focus. Une répétition ancienne ne ressuscite pas une direction après une pause. La destination tactile est une référence plutôt qu’un état réinitialisant la boucle d’animation ; les positions immobiles ne déclenchent plus une mise à jour React à chaque image. Les boutons conservent leur activation native. Le retour utilise également la commande de pause remappée. Les changements de page, dialogues et pertes de focus libèrent les directions.

**Rituel.** Les temporisations sont suspendues hors focus/visibilité et pendant la suspension du parent. Le temps restant est conservé, les sons de phase ne sont pas rejoués à chaque reprise, et une ancienne minuterie ne peut pas valider une phase remplacée. Les contrôles manette sont suspendus dans les mêmes circonstances. La consultation reste distincte d’un DLC : aucun lancement fictif, rang, trophée ou récompense supplémentaire n’a été ajouté.

**Images du Homeworld (AUD-14/15).** Le chargeur déjà utilisé délègue à un vérificateur de PNG natifs limité à six tâches simultanées et à vingt secondes par ressource, téléchargement de rafraîchissement et décodage compris. Un chargement bloqué devient une erreur affichable et réessayable via le bouton existant. L’annulation règle aussi les promesses qui ne se terminent jamais, empêche les publications tardives et libère les images pendantes. Les URL originales, dimensions attendues et contrôles d’admission sont conservés. Aucun sprite de remplacement, recoloriage ou changement d’alpha.

**Build distribué (AUD-03).** `npm run build:production` et `vercel.json` utilisent le même orchestrateur : manifeste audio, `next build --webpack`, vérification CSS PIT, garde de l’origine native et préparation des sorties statiques. Il s’arrête au premier échec. Les protections de suppression des seules copies Vercel générées restent dans leurs scripts existants. Les commandes historiques vinext et desktop ne sont pas renommées ni déclarées équivalentes.

## Vérifications réellement exécutées

- **85 tests Node ciblés**, sous Node 22.16.0 : règles de reprise, touches, focus, temps des phases, chargeur natif, raccords de source et orchestration de production. Les tests de réseau injectent des doubles contrôlés ; les tests de raccord sont des contrôles de source, pas une partie interactive.
- Vérification TypeScript stricte des **cinq nouveaux modules autonomes** avec TypeScript **5.8.3** disponible dans l’environnement ; le dépôt déclare 5.9.3. Ce résultat ne remplace pas son `npm run typecheck` global.
- Vérification de syntaxe/transpilation des trois modules raccordés : `Mausoleum.tsx`, `useHomeworldMotionAssetsV74.ts` et `campaignWorldResumeV70.ts`.
- **Cinq contrôles dans Chromium 144.0.7559.96**, avec de vrais décodages `Image.decode` de fixtures PNG hors ligne : image valide, dimensions incorrectes, PNG corrompu, annulation et lot de douze images. Pas de jeu React complet dans ce contrôle.

L’environnement local ne pouvait pas joindre GitHub pour installer le dépôt complet. Vercel Sandbox a refusé la session pour dépassement de quota Hobby. La navigation HTTP du navigateur local était bloquée par sa politique administrateur ; les cinq contrôles Chromium utilisent des URL de données, sans contourner cette restriction.

**Non exécutés ici :** lint global, typecheck global du dépôt, suite historique complète, compilation Next intégrale, partie complète, mobile ou manette matérielle. Les tests de l’orchestrateur utilisent un processus simulé et ne constituent pas un build Next réussi. Une éventuelle validation GitHub Actions doit être lue sur le SHA exact, indépendamment de ce bilan local.

## Commandes

```sh
npm run test:audit:v94
npm run qa:production
```

La première commande ne requiert pas de compilation préalable ni de dépendances tierces installées : Node 22.13+ suffit pour ces tests. La seconde exige un checkout complet, `npm ci`, les ressources et les dépendances du projet. Elle ajoute lint et typecheck globaux, les tests ciblés puis la compilation de production ; elle ne se substitue pas à la suite historique `npm test` ni aux parcours manuels.

## Parcours restant à qualifier avant fusion

Retour de village, entrée dans le vaisseau, sauvegarde et reprise ; chasse suspendue et voyages en cours ; interaction remappée sur F/déplacement sur E ; pressions opposées et alias ; clic sur piédestal, Tab/Entrée, changement d’alcôve ; rituel interrompu par changement d’onglet ; coupure réseau, image invalide puis réessai dans la vraie cité. Vérifier les anciennes sauvegardes, le clavier, le tactile et la manette.

Les DLC complets, le mandat de guerre de clans raccordé à la campagne, la production d’animations manquantes et l’extension du level design restent ouverts. Ce lot ne change pas leur statut d’achèvement.
