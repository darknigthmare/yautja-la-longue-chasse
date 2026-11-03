# Mise à jour V5 — archives cinéma et plaques individuelles

Date : 19 juillet 2026

## Résultat

Le sélecteur ne présente plus tous les chasseurs à travers une poignée de
biomasks génériques. Les entrées cinéma disposent désormais d’une plaque corps
entier propre au personnage, générée et validée séparément, puis sont rangées
chronologiquement par film.

Le catalogue passe de 36 à 53 configurations :

- 39 plaques issues des films ou de l’animation ;
- 14 chasseurs issus des jeux, comics et romans, conservés dans une section
  distincte.

Les dix-sept entrées cinéma ajoutées sont Boar, Guardian, Scout et Stalker de
la Lost Tribe, Ancient Warrior, Temple Guard, Youngblood, Bull, Bonegrill,
Classic/Captive, Emissary 1, Emissary 2, Predator Pilot, Captive Yautja,
l’archétype collectif Arena Guard, Kwei et Njohrr.

## Regroupement film par film

Chaque film possède maintenant son propre groupe visuel. Une carte affiche :

- la plaque complète sans recadrer la tête, le canon ou les pieds ;
- le nom du chasseur ;
- le film et l’année ;
- la continuité ;
- une mention explicite pour les scènes supprimées ;
- un dossier avec description, règle de fidélité et liens vers les références.

La plaque sélectionnée est également montrée en grand dans le dossier afin de
permettre une comparaison immédiate avec le rig articulé.

## Pipeline de référence

Le script `scripts/fetch-film-plate-references.mjs` applique le même principe
que le pack d’assets de **Multiverse Breach** :

1. il part des sources verrouillées dans `hunterLore.ts` ;
2. il cherche les images éditoriales ou de galerie de la page ;
3. il conserve deux références locales quand elles sont disponibles ;
4. il écrit un registre de provenance sans importer ces images dans le jeu.

Le script `scripts/normalize-film-plates.mjs` retire l’espace vide variable des
sorties portrait et paysage, puis réintroduit une marge transparente de
sécurité identique autour de chaque silhouette. Cette opération homogénéise
l’échelle, mais ne peut pas prouver qu’une arme ou un pied n’était pas déjà
coupé dans la sortie OpenAI.

Le script `scripts/build-film-plate-prompt-pack.mjs` agrège ensuite les quatre
lots de génération, vérifie l’unicité des 39 IDs, des prompts, des sources et
des exports, les deux URLs, le prompt
individuel, la résolution, le canal alpha et l’empreinte de chaque fichier.
Enfin, `scripts/audit-film-plates.mjs` mesure réellement les limites opaques,
les marges, la transparence, la ligne de sol et les éventuels résidus chroma.
L’absence de coupe et l’identité de chaque chasseur sont contrôlées séparément
sur les dix planches film par film produites par
`scripts/build-film-plate-contact-sheets.mjs`.

## Règles d’identité

- Celtic et Chopper restent dans leur état film sans plasma caster.
- Scar est présenté dans son état blooded.
- Wolf conserve son équipement de nettoyeur et son double caster.
- Captive, Crucified et battle-damaged sont trois états du même Classic.
- Les Emissaries sont étiquetés comme matériel de scènes supprimées.
- Les trois adversaires historiques et le Warlord de *Killer of Killers*
  restent quatre designs distincts.
- Predator Pilot, Captive Yautja et l’archétype Arena Guard conservent chacun
  leur identité d’écran ; un seul garde représente le modèle collectif.
- Bull et Bonegrill restent deux membres distincts du Scout Ship et ne
  réemploient pas le masque de Wolf dans leur plaque.
- Dek, Kwei et leur père ne sont jamais traités comme de simples recolorations.

## Validation finale

- 39 fichiers PNG avec alpha et résolution minimale de 512 px ;
- audit automatique de l’alpha, des marges, du chroma et de la ligne de sol ;
- contrôle visuel manuel confirmant qu’aucun corps, masque, arme ou pied n’est
  coupé et que l’identité correspond aux références ;
- même direction et même ligne de sol ;
- aucun résidu de chroma visible ;
- cartes et dossier sans débordement ;
- chargement paresseux et solution de repli si un asset manque ;
- contrôle desktop et mobile ;
- lint, TypeScript, build et suite complète de tests.

Résultats enregistrés le 19 juillet 2026 :

- les 39 plaques et leurs 39 prompts individuels passent l’audit ;
- les dix planches film par film ont été relues visuellement ;
- les 49 tests passent après le build de production ;
- l’archive affiche 39 cartes dans 10 dossiers cinéma, sans débordement
  horizontal sur une fenêtre 1440 × 1000 ni sur un mobile 390 × 844 ;
- dans « Préparation de chasse », la cible reste entièrement contenue dans son
  cadre sur ces deux formats, avec `object-fit: contain` ;
- aucune erreur JavaScript n’est remontée pendant le parcours Accueil →
  Vaisseau → Carte → Briefing puis Vaisseau → Personnalisation.
