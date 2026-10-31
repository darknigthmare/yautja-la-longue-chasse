# V135 — Variantes artistiques indépendantes des ordinateurs de poignet

**PR liée :** #42 sur `feat/v131-gauntlet-hologram-dual-view-20261030`. Ce lot étend V134 : *cinq* identités de modèles maintenant dotées de couches SVG indépendantes (Jungle Hunter, City Hunter, Wolf, Feral, Dek), sans déclarer les modèles finis à l'identique des films.

## 1. Variantes et distinctions obligatoires

| Identité | Œuvre | Géométrie étudiée | Calques V135 | Source | Statut |
| --- | --- | --- | --- | --- | --- |
| City Hunter | *Predator 2* (1990) | Quatre cellules rouges côte à côte, revêtement bronze-cuivre, boîtier plus mince que Jungle Hunter | 4 | https://propstoreauction.com/lot-details/index/catalog/496/lot/193088/ | Blockout original ; proportions exactes à relever |
| Wolf | *Aliens vs Predator: Requiem* (2007) | Cinq bandes rouges distinctes, blindage plus dense, dispositif du poignet gauche | 4 | https://www.therpf.com/forums/media/aliens-vs-predator-requiem-wolf-predator-left-gauntlet-61.67146/ | Photographie de référence secondaire ; à confronter au film |
| Feral | *Prey* (2022) | Plaque ivoire/os gravée et formes irrégulières, sans LCD Jungle Hunter copié | 4 | https://www.thehunterslair.com/gallery/image/1926-feral-gauntlets-3png/ | Étude stylisée ; détail des contrôles à vérifier |
| Dek | *Predator: Badlands* (2025) | Équipement à assemblage sculpté et panneau de lecture circulaire rouge | 4 | https://www.avpcentral.com/predator-wrist-gauntlet | Interprétation du dispositif de scan : comparer à vues Badlands/Wētā |

La forme de référence d'une figurine, d'un cosplay ou d'un accessoire de collection n'est pas automatiquement celle d'un véritable prop de tournage. La provenance des vues, les différences entre bras gauche/droit, les points de fixation et l'animation exigent une revue image par image.

## 2. Sources et runtime

Fichiers physiquement présents sous `public/game/assets/v135/gauntlets/{city-hunter,wolf,feral,dek}/` :
- `01-forearm.svg` — segment et fixation ;
- `02-shell.svg` — coque propre au modèle ;
- `03-panel.svg` — système de commande adapté au modèle ;
- `04-cover.svg` — capot avec transition.

Le composant `app/game/GauntletKnownHuntersV135.tsx` combine les quatre images indépendantes (sans duplicata de simulation), `app/game/GauntletKnownHuntersV135.module.css` anime le couvercle et suit `prefers-reduced-motion`. La **vue holographique du mode Guerre des clans** et l'**armurerie** utilisent le même composant pour chacune de ces quatre identités. Les autres modèles restent représentés par un proxy artistique à remplacer.

La configuration équipement reste la même source de vérité pour le joueur. Changer d'identité visuelle ne modifie ni le coût d'une action, ni le déclencheur de mission, ni les rapports, ni les unit stats.

## 3. Export et audit

```bash
node scripts/export-gauntlet-variants-v135.mjs --check
node scripts/export-gauntlet-variants-v135.mjs outputs/gauntlet-v135
node scripts/audit-gauntlet-completeness-v134.mjs outputs/gauntlet-v134
```

Le pipeline Sharp exporte **16 PNG alpha à 1080×580**, un composite par modèle et un manifeste avec empreintes SHA256 source et sortie. Le workflow `.github/workflows/clan-war-v131.yml` publie un artefact séparé de revue (`yautja-4-gauntlet-variants-v135-blockouts`). Le dépôt garde les SVG sources ; les PNG sont conservés comme sortie CI, pas faussement déclarés comme sprites de film approuvés.

L'audit exhaustif V135 annonce **5 modèles à calques indépendants / 49 placeholders / 0 modèles approuvés 1:1**. Il vérifie la présence effective des calques et refuse de déduire la fidélité de l'existence d'un fichier.

## 4. Manquants non masqués

Le classeur `docs/Yautja_Gauntlets_V135_Arsenal_Clans.xlsx` (20 onglets) poursuit l'inventaire V132–V134 et ajoute les 4 familles, les 16 sources, des tests ciblés, la comparaison de cadres et le backlog des 49 autres identités.

Critères encore obligatoires avant validation artistique :
- Comparaison de chaque modèle à des images de source confirmées, face, dessus, profil et position dans la scène, en distinguant le véritable bras d'équipement et les lames de poignet.
- Échelle, couleur, patine et micro-mécanique du capot, matériaux, lecture de glyphes, poids visuel des éléments et pivots réels.
- PNG indépendants revus en plein cadre et animation de déploiement compatible avec les autres poses de l'acteur.
- Contrôles clavier/manette/tactile, contrastes, changements d'onglet, performances et chargement à froid, sortie/entrée d'armurerie, interface classique et holographique.
- Le lecteur de sauvegarde V13 doit toujours être soumis à de vrais tests d'import/export, ainsi qu'aux scénarios de refus d'écriture et de conflit inter-onglets. Les 44 dossiers d'études restent cosmétiques.
- Vérifier les droits sur les assets et les noms de franchise pour tout projet distribué commercialement.

Un test source, un PNG exporté ou une CI verte ne démontre **ni une fidélité 1:1 ni l'absence de problème visuel dans le jeu complet**. La PR reste volontairement en brouillon.
