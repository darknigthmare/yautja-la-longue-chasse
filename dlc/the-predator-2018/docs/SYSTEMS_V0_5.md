# Systèmes v0.5

## 1. Chaînes d’objectifs

Chaque micro-zone possède une chaîne déterministe liée à son type de rencontre. Le passage à la phase suivante est sauvegardé et émet `objective-phase` vers l’hôte.

| Rencontre | Phases | Zones |
|---|---|---:|
| traverse | advance | 93 |
| lockdown | neutralize → secure | 52 |
| interaction | approach → operate | 15 |
| defense | hold → stabilize | 17 |
| stealth | observe → cross-undetected | 6 |

## 2. Renforts finis

Les vagues ne sont pas infinies : **108** zones n’en ont aucune, **58** en ont une et **17** en ont deux. Chaque vague consomme son budget, est enregistrée dans le checkpoint et émet `reinforcement-wave`.

## 3. Cohésion humaine

La cohésion varie entre 0 et 100. Elle diminue sous dégâts/alerte et remonte après des réussites. Elle influe sur les compagnons. **G** alterne `follow`, `focus`, `hold`. Rory reste un scanner non-combattant.

## 4. Momentum Predator

Le momentum varie entre 0 et 100. Il augmente après takedown, objectif secondaire ou sécurisation. Il sert de récompense de rythme agressif sans modifier les issues imposées par la narration.

## 5. Dangers

`crowd` (3), `darkness` (26), `debris` (25), `fire` (10), `fog` (13), `glass` (11), `hay` (3), `low-gravity` (5), `mud` (11), `roots` (15), `smoke` (11), `sparks` (17), `sprinklers` (8), `steam` (9), `tight-space` (4), `traffic` (3), `vacuum-alert` (3), `vehicles` (1), `water` (5).

## 6. Événements miroir

**27 événements** relient les campagnes. Une maîtrise est validée lorsqu’un événement disponible a été terminé des deux côtés. Aucun événement ne réécrit le résultat canonique.

## 7. Boss

Les charges/sauts majeurs reçoivent un télégraphe et déclenchent `boss-telegraph`. L’Upgrade conserve son armure organique dédiée.

## 8. Host bridge v2

Messages runtime → hôte : `ready`, `migration`, `checkpoint`, `scene-start`, `room-enter`, `objective-phase`, `secondary-complete`, `reinforcement-wave`, `boss-telegraph`, `squad-order`, `mirror-complete`, `scene-complete`, `campaign-complete`, `command-ack`.

Commandes hôte → runtime : `snapshot`, `start`, `resume`, `pause`, `difficulty`, `squad-order`.
