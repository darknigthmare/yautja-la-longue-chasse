# Badlands — ajouts Drive V8 à V13 dans la bibliothèque V85

Six archives d’ajouts ont été récupérées directement du dossier Drive privé autorisé, avec leurs métadonnées de fichier et leurs contenus originaux. Elles livrent **41 PNG uniques**, soit **76 710 938 octets natifs**. Les nombres résultent de l’enregistrement des sources, sans démarrage du jeu, import de ses modules ou QA.

| Archive d’ajouts | PNG de sprites importés |
| --- | ---: |
| PREDATOR_BADLANDS_LOT8_8_AJOUTS.rar | 8 |
| PREDATOR_BADLANDS_LOT9_10_AJOUTS.rar | 10 |
| PREDATOR_BADLANDS_LOT10_4_AJOUTS.rar | 4 |
| PREDATOR_BADLANDS_LOT11_6_AJOUTS.rar | 6 |
| PREDATOR_BADLANDS_LOT12_3_AJOUTS.rar | 3 |
| PREDATOR_BADLANDS_LOT13_10_AJOUTS.rar | 10 |

La base locale V7 conserve ses 118 visuels. Les six lots ajoutent les identités documentées 119–159, portant le catalogue de sources Badlands à **159 visuels**. Les archives cumulatives multipart V8–V13 et les aperçus composites ne sont pas nécessaires à cet import et n’ont pas été recopiés. Les SHA individuels, URLs Drive, IDs de fichier, SHA des six archives, documents d’origine et relations de correction sont conservés dans les registres dédiés.

Les archives originales et leurs documents extraits restent dans `.work-local/recent-badlands-v85/`. Les PNG publics sont adressés par SHA sous `/game/imports/v85/drive-latest/badlands/`, au sein du namespace stocké sur C. Le script interne d’import limite chaque path à son répertoire prévu, extrait uniquement les données et PNG, puis copie les bytes sans retouche. Aucun script fourni par les archives n’est exécuté.

`badlandsLatestSpritesV85.json` est un complément séparé du registre local et de `driveLatestSpritesV85.json`. Le provider, le codex et `RecentSpriteLibraryV85` fusionnent ces sources. Une correction peut devenir préférée pour son identité documentaire ; l’ancien fichier et sa fiche restent accessibles avec l’historique. Les compléments ne deviennent pas automatiquement des remplacements : les deux états bipèdes de Bud 150/151, par exemple, gardent leur propre fiche et leurs relations aux vues précédentes.

Le provider des variantes de faune expose les sources Badlands identifiées par nom pour Kalisk, Bud, Bone Bison, Vulture, Luna Bug, Spray Snake, Exploding Worm et Squirt. Les âges, tenues, poses et états ne sont pas fusionnés en une animation ou un nouveau taxon. Il ne modifie ni spawn, collider, compétence de compagnon, sauvegarde ou cellules de marche. Le nombre de trames reste un par PNG ; aucune attache, articulation, échelle canonique ou alignement intertrame validé n’est affirmé.

Les métadonnées du lot 13 distinguent explicitement des portions de liane à raccorder au décor, une touffe reconstituée, des états d’objets Weyland-Yutani et des équipements isolés de Dek/Kwei. La galerie les décrit comme sources de décor ou équipements ; un plastron ou une paire de jambières ne crée pas un nouveau personnage complet. Les pivots producteur éventuels restent indicatifs et ne sont pas installés comme attaches ou empreintes physiques validées.

Les références, confirmations et extrapolations du producteur restent des informations documentaires de l’archive. Le lot ne certifie pas une correspondance canonique 1:1, les UV, un geste animé ou des statistiques de combat nouvelles. **Aucun test, audit, lint, typecheck, build local, contrôle navigateur ou recette publique n’a été exécuté.** Le commit et la publication, avec le build Vercel nécessaire, restent des actions séparées de l’agent racine.
