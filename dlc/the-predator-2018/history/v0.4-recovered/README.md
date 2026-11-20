# THE PREDATOR — CHASSE CROISÉE

## v0.4.0-candidate.1

DLC fan-made autonome pour **Yautja : La Longue Chasse**, construit autour du montage cinéma de *The Predator* (2018).

Cette candidate conserve intégralement la structure validée de la v0.3 :

- **52 séquences** : 26 Humains + 26 Predator ;
- **183 micro-zones** ;
- campagne Predator **Fugitive Predator → Upgrade Predator** ;
- issues canoniques verrouillées ;
- scènes coupées / Emissary / APC / fins alternatives isolées du parcours principal ;
- graphismes vectoriels originaux/provisoires, sans photogrammes du film.

### Nouveautés v0.4

- rencontres typées dans les 183 zones : traversée, lockdown, interaction, défense et infiltration ;
- défi secondaire par micro-zone ;
- grade **S / A / B / C** et meilleur record sauvegardé par scène ;
- couverture humaine avec la touche **X** près des protections ;
- ciblage Predator avec **X + vision** ;
- jauge d’armure organique pour l’Upgrade Predator jouable et les ennemis Upgrade ;
- rôles de compagnons différenciés : précision, scan, assaut, suppression et charge ;
- IA améliorée : repli des tireurs, poursuite inter-plan, charges et marquage de cible ;
- sauvegarde `v4` et migration automatique depuis les sauvegardes `v3` (avec compatibilité directe `v2`) ;
- bridge d’événements vers la route Next.js du projet hôte ;
- miroir de checkpoint côté route hôte dans `sessionStorage`, sans toucher aux cinq slots de campagne.

### Types de zones

- `traverse` : **93** zones
- `lockdown` : **52** zones
- `interaction` : **15** zones
- `defense` : **17** zones
- `stealth` : **6** zones

### Intégration La Longue Chasse

Le dossier `native-integration/` fournit :

- la route `/dlc/the-predator-2018` ;
- `DlcFrame.tsx`, qui relaie les événements du runtime ;
- le manifeste TypeScript des 52 scènes ;
- le contrat d’intégration v0.4 ;
- le runtime copié sous `public/dlc/the-predator-2018`.

Événements émis : `ready`, `migration`, `checkpoint`, `scene-start`, `scene-complete`, `campaign-complete`.

**Limite volontaire :** `usesHostCampaignSlots=false` et `usesHostHuntCanvas=false`. La v0.4 ne prétend donc pas à une fusion profonde encore non validée.

### Installation locale

```bash
node install/INSTALLER_LOCAL.mjs /chemin/vers/yautja-la-longue-chasse
```

Désinstallation :

```bash
node install/DESINSTALLER_LOCAL.mjs /chemin/vers/yautja-la-longue-chasse
```

L’installateur est idempotent : une réinstallation met à jour son propre bloc sans dupliquer l’entrée du menu.

### Commandes

- Q/D ou ←/→ : déplacement horizontal
- Z/S ou ↑/↓ : changement de plan
- Espace : attaque
- R : recharge
- E : interaction / porte
- Maj : esquive humaine / bond Yautja
- **X : couverture humaine / ciblage Predator sous vision**
- C : camouflage Predator
- V : vision Predator
- F : impulsion Predator
- T : takedown Predator
- M : sélection de chapitres
- P : pause

### Validation

- Node : **94/94** contrôles réussis.
- Chromium : **52/52** séquences chargées.
- Interactions : **8/8** scénarios réussis.
- Erreurs runtime Chromium : **0**.
- Couverture humaine : testée.
- Armure organique Upgrade : testée.
- Grade + persistance : testés.
- Migration v0.3 → v0.4 : testée.
- Installateur / réinstallateur / désinstallateur : testés.

Voir `docs/RAPPORT_VISUEL_QA_V0_4.html`, `docs/CODEX_COMPLET_V0_4.md` et `docs/INTEGRATION_V0_4.md`.
