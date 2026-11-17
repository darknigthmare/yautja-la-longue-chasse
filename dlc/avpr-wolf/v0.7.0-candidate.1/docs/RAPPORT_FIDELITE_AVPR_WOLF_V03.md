# AVP: Requiem — WOLF / Le Nettoyeur
## Rapport de fidélité — 0.3.0-candidate.1

### Périmètre
Campagne exclusivement du point de vue de Wolf. Les scènes humaines ne deviennent jouables que lorsqu'elles croisent directement sa route ; le reste est conservé sous forme d'événements parallèles. Le mode **Unrated** est la route par défaut.

### Couverture
- 47 zones/nœuds jouables.
- 14 chapitres.
- 35 zones correspondant à des séquences montrées dans le film.
- 2 zones réservées au montage Unrated.
- 9 raccords jouables explicitement étiquetés comme reconstructions.
- 1 zone contextuelle synchronisée.
- 13 événements humains parallèles synchronisés.
- 8 familles d'armes/équipements de combat.

### Corrections majeures de la v0.3
- Le magasin d'armes suit désormais l'ordre documenté : Dallas sert d'appât, cinq xénomorphes forcent la mêlée, un plasmacaster est endommagé, puis Wolf combine ses deux plasmacasters en **Plasma Pistol**.
- À l'hôpital, le premier contact Predalien est séparé : Wolf le blesse aux Wrist Blades, l'hybride se retire, puis les xénomorphes prennent le relais.
- La séquence Jesse est verrouillée au shuriken, puis Ricky ouvre le feu avant la chute dans la cage d'ascenseur.
- Le Plasma Pistol est perdu à la chute et considéré comme récupéré par Dallas.
- Le duel final retire le biomask à mi-combat, force ensuite le corps-à-corps et ne permet aucune victoire alternative avant la frappe.
- La centrale applique une interférence de ciblage dédiée au plasma avant le blackout.
- La piscine, les corps des égouts et la forêt utilisent un vrai système de **Cleaner Fluid** avec traces physiques.
- Le Medicomp exige une action maintenue et immobile.
- Les mines des égouts sont réellement posées et déclenchées par proximité.

### Séquences Unrated
1. `wreck_biomask` — Wolf porte le biomask d'un Predator mort pour voir l'enregistrement du scout ship.
2. `cemetery_karl` — passage du cimetière avec Karl.

### Raccords reconstruits
Ces zones servent uniquement à donner de la continuité spatiale et ne prétendent pas reproduire un plan absent du montage :
- `homeworld_launch` — Plateforme de départ : Rejoindre l’appareil personnel de Wolf.
- `craft_transit` — Appareil de Wolf — transit : Synchroniser les coordonnées du crash à Gunnison.
- `school_approach` — Lycée — approche nocturne : Suivre la piste jusqu’à la piscine.
- `street_blackout` — Gunnison — rues sans courant : Traverser la ville infestée pendant le blackout.
- `store_roof` — Magasin d’armes — accès supérieur : Entrer dans le magasin où les survivants se sont retranchés.
- `hospital_approach` — Hôpital — parking et accès : Entrer dans l’hôpital infesté.
- `shaft_bottom` — Cage d’ascenseur — niveau inférieur : Achever le xénomorphe et retrouver un passage vers le toit.
- `shaft_climb` — Cage d’ascenseur — remontée : Remonter sans le Plasma Pistol, désormais récupéré par Dallas.
- `roof_access` — Hôpital — accès toiture : Atteindre le toit après le départ du groupe de survivants.

### Arsenal Wolf
- **Wrist Blades** — type `melee`.
- **Dual Plasmacasters** — type `plasma`.
- **Combistick** — type `melee`.
- **Razor Whip** — type `melee`.
- **Collapsible Shuriken** — type `projectile`.
- **Plasma Pistol** — type `plasma`.
- **Laser Mine** — type `mine`.
- **Power Punch Glove** — type `melee`.

### Sources de contrôle
- Inventaire personnel `AVPR_2007_Inventaire.xlsx`, recopié dans `docs/AVPR_REFERENCE_INDEX.json` et `.csv` pour traçabilité (264 lignes de données).
- Alien vs. Predator Galaxy — Wolf Predator : https://www.avpgalaxy.net/predator/wolf/
- Alien vs. Predator Galaxy — Theatrical vs. Unrated / deleted scenes : https://www.avpgalaxy.net/avp-movies/avp-requiem/deleted-scenes/
- Wikipedia — Aliens vs. Predator: Requiem : https://en.wikipedia.org/wiki/Aliens_vs._Predator%3A_Requiem
- Xenopedia / Plasma Pistol, utilisé comme contrôle secondaire sur la conversion des plasmacasters.

### Limite volontaire
« Fidélité 1:1 » signifie ici fidélité de **chronologie, événements, équipement, états de Wolf, conséquences et ordre des scènes**. Les plans exacts, dialogues et visuels du film ne sont pas copiés ; les décors et sprites sont des interprétations originales destinées au prototype.
