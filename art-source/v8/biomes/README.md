# Biomes planétaires V8

Cinq panoramas originaux générés avec l'outil ImageGen intégré d'OpenAI pour
les missions d'expansion. Les fichiers `masters/` conservent les sorties PNG
non destructives; les copies runtime se trouvent dans
`public/game/backgrounds/*-depth-v8.png`.

## Contrat visuel commun

- vue latérale orthographique pour un jeu de plateformes 2D;
- lecture horizontale gauche vers droite;
- séparation nette premier plan / plan moyen / arrière-plan;
- bande basse lisible pour le gameplay;
- environnement seul, sans personnage, créature, texte, logo ou watermark;
- architecture et écologie originales, sans extraction d'asset officiel.

## Prompts finaux

### Naraka-Delta — marais

Panorama d'un immense delta de mangroves aux eaux noires, racines-cathédrales,
chenaux réfléchissants, pluie chaude et bioluminescence vert acide. Palette
vert-noir, tourbe, ambre et lime; bois mouillé, vase et roseaux extraterrestres.

### Serekh-9 — désert

Mer de dunes de silice orange, canyons vitrifiés noirs, arches érodées,
installations minières semi-ensevelies et deux soleils voilés. Palette ocre,
cuivre, verre noir et or pâle; lumière poussiéreuse de fin de journée.

### Pelagos-M — océan

Océan global sous une tempête, arches coralliennes géantes, station partiellement
noyée, cheminées hydrothermales et éclairs. Palette marine, pétrole, cyan
bioluminescent et gris d'orage; récif mouillé, embruns et métal corrodé.

### Mycora-V — monde fongique

Forêt mycélienne consciente, tours-champignons reliées par des filaments
nerveux, membranes de spores, cavernes-racines et ponts organiques. Palette
aubergine, violet, magenta et cyan froid; textures humides et fibreuses.

### Acheron-Sigma — ruines

Cité d'obsidienne sur une lune sans atmosphère, ponts monumentaux, mécanismes
gravitationnels fracturés et géante gazeuse à l'horizon. Palette noire,
gunmetal, bleu froid, cyan rare et accents rouges; verre volcanique et alliages
anciens gravés.

Chaque prompt complet imposait également: environnement uniquement, vue
side-scroller, aucune marque/franchise/texte, aucune vue isométrique ou du
dessus, et lisibilité des 25 % inférieurs pour la collision de plateformes.
