# PREY — La Chasse de 1719 · DLC privé V0.6.0

DLC fan non commercial pour **Yautja : La Longue Chasse**, construit en deux campagnes parallèles : **Naru / Taabe** puis **Feral Predator**.

## Contenu

- 37 chapitres : 22 humains + 15 Feral ;
- 185 zones, trois plans de profondeur ;
- 102 objectifs successifs ;
- 37 défis de chapitre, 12 hauts faits et 15 dossiers miroir ;
- 17 archives et 6 marques du registre de chasse Feral ;
- sauvegarde V6 avec migrations V0.2 → V0.6 ;
- checkpoints par objectif, sauf difficulté Rite 1719 ;
- détection dynamique, couverture, bruit, posture basse, sprint et blessures ;
- IA de scène : bêtes, trappeurs, guerriers, Taabe, Naru et Feral ;
- projectiles hostiles, munitions limitées, flèches récupérables ;
- 9 profils de boss/scènes et continuité des blessures Feral ;
- aucun Plasma Caster pour le Feral ;
- fin Feral verrouillée sur la défaite canonique.

## V0.6 — continuité de chasse

F09 enregistre la blessure de jambe du Feral ; elle reste active jusqu’au Medicomp de F10. Dans le final, la section de l’avant-bras est conservée jusqu’à F15, où le bouclier reste indisponible. Le registre Feral distingue les jalons de chasse d’un trophée physique : seul le crâne du loup est classé explicitement `physical-trophy`.

La furtivité combine désormais visibilité et bruit. La posture basse réduit la détection et le bruit ; sprint, flintlock et attaques augmentent la signature. Le gué et le bourbier modifient aussi la mobilité.

## Lancement autonome

- `JOUER_PREY_DLC_V0_6.html` : version modulaire ;
- `JOUER_PREY_DLC_V0_6_PORTABLE.html` : version totalement autonome ;
- `OUVRIR_PREY_DLC_V0_6.html` : lanceur du pack.

## Installation privée dans La Longue Chasse

```bash
node INSTALLER_PREY_V0_6.mjs /chemin/yautja-la-longue-chasse install
```

Destination : `private-dlc/campaigns/prey-2022`. L’installateur refuse un dépôt ne possédant pas les exclusions `/private-dlc/` dans `.gitignore` et `.vercelignore`.

### Bridge local

```bash
node private-dlc/campaigns/prey-2022/integration/prey-private-dev-server-v06.mjs
```

### Carte menu facultative

```bash
node private-dlc/campaigns/prey-2022/integration/APPLIQUER_CARTE_PREY_LOCALE_V0_6.mjs /chemin/yautja-la-longue-chasse install
```

### Mausolée Homeworld facultatif

Le V65 du projet hôte possède déjà un vrai `Mausolée des Grandes Chasses` et le contrat `MausoleumDlcAdapter`. Pour raccorder PREY à ce système :

```bash
node private-dlc/campaigns/prey-2022/integration/APPLIQUER_MAUSOLEE_PREY_LOCAL_V0_6.mjs /chemin/yautja-la-longue-chasse install
```

Le patch est local, sauvegardé et réversible ; il refuse d’écraser une version hôte modifiée après son installation.

## Vérification

```bash
node VERIFIER_PREY_V0_6.mjs .
node docs/qa-static-v06.mjs
node docs/qa-portable-v06.mjs
node docs/qa-v06.mjs
node docs/qa-integration-v06.mjs
```

Validation finale : 37/37 chapitres runtime, 25 scénarios critiques, QA statique/portable/intégration PASS. Chromium headless ne fonctionne pas dans l’environnement de validation actuel ; `docs/QA_BROWSER_V0_6.json` documente cette limite et aucune capture navigateur V0.6 n’est revendiquée.

## Fidélité et droits

Le pack vise la fidélité de la **chronologie, des événements, des personnages, de l’équipement clé et de l’issue des scènes**. Il n’inclut aucun pixel, audio ou dialogue verbatim officiel. Les SVG/Canvas sont des créations originales de prototype. *Predator*, *Prey* et les personnages associés appartiennent à leurs ayants droit.

Aucun script du pack ne pousse sur GitHub ni ne déploie sur Vercel.
