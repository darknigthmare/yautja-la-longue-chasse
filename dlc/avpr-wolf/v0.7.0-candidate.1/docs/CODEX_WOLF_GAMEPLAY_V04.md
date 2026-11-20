# Codex gameplay — AVP:R WOLF v0.4

## Contrôles
- A/D ou flèches : déplacement horizontal.
- W/S : changement de plan 2D (1 à 3 profondeurs selon la zone).
- Espace : bond.
- E : interaction.
- F : attaque.
- 1–8 : arsenal.
- V : vision normale / thermique / xénomorphe tant que le biomask est porté.
- C : camouflage optique tant que l’équipement du duel final n’a pas été abandonné.
- T : seringue / analyse de piste dans les scènes de scan.
- H maintenu : Medicomp.
- R : Cleaner Fluid sur preuve proche.
- G : mine laser.
- M : route de nettoyage.

## Mécaniques dédiées
**Multi-plans.** Les zones utilisent plusieurs bandes de profondeur ; les xénomorphes peuvent changer de plan pour rejoindre Wolf.

**Camouflage.** Réduit fortement la distance de détection, avec shimmer visuel, mais draine l’énergie.

**Visions du biomask.** Mode normal, thermique et xénomorphe. Les visions deviennent indisponibles une fois le masque volontairement retiré pendant le duel final.

**Centrale.** Les interférences perturbent la visée plasma et matérialisent la panne canonique.

**Cleaner Fluid.** Les scènes de nettoyage ne valident pas tant que toutes les traces obligatoires ne sont pas dissoutes. Une phase dédiée de l’hôpital force son emploi.

**Plasma Pistol.** Inaccessible avant le magasin, construit après la bataille, puis perdu dans la cage d’ascenseur et récupéré par Dallas hors du point de vue jouable.

**Duel final.** Le Predalien ne peut pas être tué avant le seuil scénarisé. Le wrist gauntlet de Wolf est d’abord endommagé ; Wolf retire ensuite volontairement son équipement restant et son biomask pour poursuivre au corps-à-corps. L’issue mortelle et la frappe nucléaire sont verrouillées.

## Présentation v0.4
Le runtime utilise quatre sprite-sheets séparées avec animations, plus des FX Canvas pour le plasma, l’acide, le Cleaner Fluid, le soin, les mines et le cloak. Les environnements gagnent des props et ambiances spécifiques selon la scène.

## Sauvegarde
Clé locale dédiée : `tantalus.avpr.wolf.v04`. La première ouverture peut migrer automatiquement une sauvegarde `tantalus.avpr.wolf.v03`. La sauvegarde principale de Tantalus n’est pas modifiée.
