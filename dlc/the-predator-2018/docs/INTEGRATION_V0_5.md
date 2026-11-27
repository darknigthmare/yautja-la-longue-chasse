# Intégration native — v0.5 / protocole 2

## Périmètre

La candidate fournit une route Next.js dédiée `/dlc/the-predator-2018` et un runtime autonome servi depuis `public/dlc/the-predator-2018`. Le but est d’obtenir une communication avec l’hôte sans prétendre à une fusion HuntCanvas non validée.

## Fichiers

- `native-integration/app/dlc/the-predator-2018/page.tsx`
- `native-integration/app/dlc/the-predator-2018/DlcFrame.tsx`
- `native-integration/app/game/dlc/the-predator-2018/manifest.ts`
- `native-integration/app/game/dlc/the-predator-2018/integrationContract.ts`
- `native-integration/app/game/dlc/the-predator-2018/hostBridge.ts`

## Runtime → hôte

Le frame filtre source, protocole et type avant d’accepter un événement. Les checkpoints sont recopiés dans un miroir `sessionStorage`, ce qui permet à l’hôte de connaître la reprise sans écrire dans les slots de campagne principaux.

## Hôte → runtime

Le protocole 2 accepte des enveloppes typées pour : snapshot, start, resume, pause, difficulty et squad-order. Chaque commande reconnue émet `command-ack`.

## Garanties de cette candidate

- `usesHostCampaignSlots = false`
- `usesHostHuntCanvas = false`
- installateur idempotent
- désinstallateur limité aux fichiers/blocs gérés par le DLC
- sauvegarde DLC versionnée séparément

## Étape future

La vraie fusion HuntCanvas exigera une couche d’adaptation des entrées, collisions, IA, checkpoints et sauvegardes avec transaction/rollback. Elle n’est pas déclarée terminée ici.
