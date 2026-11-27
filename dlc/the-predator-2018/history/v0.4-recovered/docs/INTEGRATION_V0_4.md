# Intégration native v0.4

## Route
`/dlc/the-predator-2018`

Le dossier installé contient :
- `app/dlc/the-predator-2018/page.tsx`
- `app/dlc/the-predator-2018/DlcFrame.tsx`
- `app/game/dlc/the-predator-2018/manifest.ts`
- `app/game/dlc/the-predator-2018/integrationContract.ts`
- `public/dlc/the-predator-2018/*`

## Bridge d’événements
Le runtime iframe envoie des messages ayant la forme :

```ts
{
  source: "the-predator-2018",
  version: string,
  type: "ready" | "migration" | "checkpoint" | "scene-start" | "scene-complete" | "campaign-complete",
  payload: Record<string, unknown>,
  ts: number
}
```

`DlcFrame.tsx` relaie ces messages via l’événement navigateur :

`yautja:the-predator-2018`

Le dernier checkpoint reçu est aussi dupliqué dans :

`sessionStorage["yautja.dlc.the-predator-2018.host-mirror.v4"]`

Ce miroir n’est pas une sauvegarde principale et ne remplace jamais les données de campagne.

## API runtime
Le standalone expose `window.__TP_NATIVE_API` avec :
- `version`
- `saveKey`
- `getSnapshot()`
- `start(campaign, scene, room)`
- `resume(campaign)`
- `menu()`
- `setDifficulty()`

## Limites exactes
- `hostCampaignSlots: false`
- `huntCanvasFusion: false`

Cette candidate prépare la circulation de données mais ne prétend pas fusionner l’état interne de `HuntCanvas`.
