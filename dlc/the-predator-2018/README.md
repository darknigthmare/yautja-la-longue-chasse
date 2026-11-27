# THE PREDATOR — CHASSE CROISÉE

## v0.5.0-candidate.1

DLC fan-made autonome pour **Yautja : La Longue Chasse**, centré sur le montage cinéma de *The Predator* (2018). La v0.5 conserve la structure validée des versions précédentes et approfondit le gameplay sans ajouter de scènes artificielles.

### Contenu conservé

- **52 séquences** : 26 Humains + 26 Predator ;
- **183 micro-zones** réparties sur **18 lieux** ;
- campagne Predator **Fugitive Predator → Upgrade Predator** ;
- issues canoniques verrouillées ;
- scènes coupées / Emissary / APC / fins alternatives isolées du parcours cinéma ;
- graphismes procéduraux/vectoriels originaux et provisoires, sans photogrammes du film.

### Nouveautés v0.5

- chaînes d’objectifs par micro-zone : `advance`, `neutralize/secure`, `approach/operate`, `hold/stabilize`, `observe/cross-undetected` ;
- **vagues de renfort finies** : 108 zones sans vague, 58 à une vague, 17 à deux vagues ;
- **19 dangers environnementaux effectivement utilisés** : fumée, débris, vapeur, verre, boue, feu, racines, circulation, etc. ;
- **cohésion humaine** (0–100) influençant l’efficacité de l’escouade ;
- trois ordres : **Suivre / Concentrer / Tenir** avec **G** ;
- **momentum Predator** gagné par takedowns, objectifs secondaires et sécurisation des zones ;
- rôles IA ennemis : assaut, flanc, suppression, charge et boss ;
- télégraphes de boss avant les attaques majeures ;
- maîtrise des **27 événements miroir** quand les deux points de vue correspondants sont terminés ;
- protocole hôte **v2 bidirectionnel** : événements runtime + commandes hôte ;
- migration non destructive **v0.4/v0.3/v0.2 → v0.5**.

### Répartition des 183 micro-zones

- traversée : **93**
- verrouillage combat : **52**
- interaction : **15**
- défense : **17**
- infiltration : **6**

### Bridge natif

`native-integration/` fournit la route `/dlc/the-predator-2018`, le manifeste TypeScript, un contrat v0.5/protocole 2 et un bridge de messages bidirectionnel. L’hôte peut demander un snapshot, démarrer/reprendre une scène, mettre en pause, changer la difficulté et donner un ordre d’escouade.

**Limite volontaire et vérifiée :** `usesHostCampaignSlots=false` et `usesHostHuntCanvas=false`. Les cinq sauvegardes principales ne sont jamais modifiées par cette candidate.

### Installation locale

```bash
node install/INSTALLER_LOCAL.mjs /chemin/vers/yautja-la-longue-chasse
```

Désinstallation :

```bash
node install/DESINSTALLER_LOCAL.mjs /chemin/vers/yautja-la-longue-chasse
```

### Commandes principales

- Q/D ou ←/→ : déplacement
- Z/S ou ↑/↓ : changement de plan
- Espace : attaque
- R : recharge
- E : interaction / seuil
- Maj : esquive humaine / bond Yautja
- X : couverture humaine / ciblage Predator sous vision
- C : camouflage Predator
- V : vision Predator
- F : impulsion Predator
- T : takedown Predator
- **G : ordre d’escouade humain**
- M : sélection de chapitres
- P : pause

### QA candidate

- Node : **146/146** contrôles réussis.
- Chromium : **52/52** scènes chargées.
- Interactions : **14/14** scénarios réussis.
- Erreurs runtime Chromium : **0**.
- Installation, réinstallation idempotente et désinstallation : validées.
- Compilation TypeScript du bridge et TSX de la route : validée.

Voir `docs/RAPPORT_VISUEL_QA_V0_5.html`, `docs/CODEX_COMPLET_V0_5.md`, `docs/INTEGRATION_V0_5.md` et `docs/SYSTEMS_V0_5.md`.
