# Production des sprites Yautja — inventaire V26

Document généré par `node scripts/audit-known-yautja-sprite-roster.mjs`. Vérification sans écriture : `node scripts/audit-known-yautja-sprite-roster.mjs --check`.

La matrice [roster.json](../art-source/v26/known-yautja/roster.json) est un **inventaire initial**, pas une livraison graphique. Aucune génération n'est exécutée par ce script. Toutes les animations restent `missing`. Les productions réelles, y compris les planches Jungle Hunter V26, ont leurs manifestes séparés et ne sont pas promues automatiquement par cet audit.

## Comptes vérifiés

| Ensemble | Compte | Sens |
|---|---:|---|
| Fiches catalogue | 260 | 214 individus, 21 aliases, 7 rangs, 18 groupes |
| Fiches individuelles couvertes | 214 | Aucune restriction aux 12 PIT ou aux 53 presets |
| Designs issus des individus | 215 | Les deux Emissaries Y-076 sont séparés |
| Presets de campagne couverts | 53 | Inclut le preset d'archétype Arena Guard |
| PIT | 12 + 2 | Sélectionnables + boss non sélectionnables |
| Registre documentaire DLC | 139 | 39 films, 51 jeux, 19 comics, 13 littérature, 17 designs licenciés |
| Entrées de production/recherche | 264 | catalogue-individual: 215 ; archetype: 14 ; variant: 20 ; research-set: 10 ; dlc-individual-to-reconcile: 5 |
| Entrées de recherche collective | 10 | Ce ne sont pas 10 individus uniques |
| Fiches fan non officielles | 3 | Origines et limites signalées dans chaque entrée |
| Entrées signalées texte/interprétation | 22 | Pas de promesse de vue canonique 1:1 |
| Plaques V5 présentes | 39 + 39 | PNG runtime + masters statiques |
| Images statiques locales recensées | 92 | Chemins uniques ; aucun n'est compté comme animation |
| Animations générées/acceptées dans cette matrice | 0 | 264 entrées missing ; 0 frame acceptée |

Le total de production n'est **pas un nombre de Yautja canoniques uniques** : il inclut des versions de jeux, états historiques, archétypes et ensembles encore à identifier. Les 53 Hunters / 1 179 actions / 424 finishers du chat retrouvé sont un budget historique, sans master de roster récupéré ; ils ne limitent pas cette matrice et ne prouvent aucun clip livré.

## Sources perdues et fidélité

Le manifeste V5 mentionne **112 références locales historiques** (111 chemins uniques). **112 occurrences sont absentes** (111 chemins uniques). Chaque chemin absent reste visible dans `localReferences` et `missingHistoricalVisualReferencePaths` ; les images statiques présentes sont listées séparément. Les liens source sont conservés sans prétendre qu'ils ont été téléchargés ou vérifiés par ce script. Les liens Fandom restent des index secondaires.

Un portrait original du projet, un preset modulaire ou un rig procédural ne valide ni la fidélité à la source ni une spritesheet animée. Les images V23 sont explicitement non certifiées 1:1 ; la correction des deux prises de City Hunter est tracée dans les avertissements de son entrée. Mains, doigts, articulations, armes, équipement, orientation et cohérence entre frames doivent être contrôlés avant acceptation.

Les interprétations textuelles sont signalées ; les personnages encore anonymes dans un groupe exigent une identification avant génération. Les familles d'animation prévues sont locomotion, combat, dégâts/défense, états armes/masque, interactions de campagne, projections synchronisées et finishers/victoire, avec applicabilité à confirmer par personnage. Aucun nombre de frames ou de clips par personnage n'est inventé.

## Identités et variantes à ne pas fusionner

- Father Hunting Grounds (DLC-G-044) reste distinct de Njohrr Y-151 malgré l'alias Y-084 du classeur.
- Jotun Hunting Grounds (DLC-G-043) reste distinct de Grendel KoK Y-101 malgré Y-116.
- Oni Hunting Grounds (DLC-G-042) reste distinct du chasseur du Japon féodal KoK Y-154.
- Emissary Hunting Grounds (DLC-G-032) reste distinct des deux Emissaries des scènes supprimées.
- Les adaptations PHG, Fortnite, Mortal Kombat X, Ghost Recon, états Golden Angel et variantes licenciées ont des fiches de production séparées lorsque le document distingue le design. Les liens `relatedCatalogueIds` ne réutilisent pas automatiquement les images de l'autre version.
- Les lignes DLC sont toutes reliées à au moins une entrée via `dlcRows[].productionIds`. Les correspondances utilisent les noms/œuvres explicites : certaines références F-* internes au document source sont anciennes et ne doivent pas être résolues aveuglément.
- Le personnage personnel `custom` et les Bad Blood originaux de Cinder ne sont pas ajoutés comme personnages connus de franchise.

## Reproductibilité et limites

Le générateur n'utilise ni date courante, ni réseau, ni dossier temporaire de sortie. Il calcule les empreintes SHA-256 des sources textuelles après normalisation LF et vérifie l'empreinte binaire du classeur immuable. Les chemins sont relatifs au dépôt et les sorties JSON/Markdown sont stables à sources et disponibilité des références inchangées. `--check` reconstruit deux fois en mémoire, compare les octets et contrôle les fichiers publiés, la couverture de chaque ID, les 139 lignes DLC, les 53 presets et les chemins. Une nouvelle référence présente ou une source modifiée exige une régénération explicite.

Le registre reflète les sources présentes dans le dépôt, sans certification exhaustive externe de la franchise. Les flags de continuité du catalogue sont conservés comme étiquettes documentaires, pas comme un nouvel audit canon.

## Matrice exhaustive

Les références locales, liens sources, correspondances de presets/DLC, avertissements et familles manquantes sont détaillés par ID dans le JSON.

| ID de production | Nom | Type | Balisage | Images statiques présentes | Animation |
|---|---|---|---|---:|---|
| Y-001 | 'Aseigan | catalogue-individual | text-interpretation-not-canonical-visual | 0 | missing |
| Y-002 | A'ni-de | catalogue-individual | text-interpretation-not-canonical-visual | 0 | missing |
| Y-003 | Adilgashii | catalogue-individual | — | 0 | missing |
| Y-004 | Ahab | catalogue-individual | — | 0 | missing |
| Y-005 | Akuma Predator | catalogue-individual | fan-unofficial, identity-unconfirmed | 0 | missing |
| Y-006 | Albino Predator | catalogue-individual | fan-origin-later-licensed-as-catalogued | 0 | missing |
| Y-007 | Alien Head Predator | catalogue-individual | — | 0 | missing |
| Y-008 | Alpha Predator | catalogue-individual | — | 0 | missing |
| Y-009 | Amazon Predator | catalogue-individual | — | 0 | missing |
| Y-010 | Ambush Predator | catalogue-individual | — | 0 | missing |
| Y-011 | Ancient Nuke Carrier | catalogue-individual | — | 0 | missing |
| Y-012 | Ancient Predator (Earth) | catalogue-individual | — | 2 | missing |
| Y-013 | Ancient Predator (LV-1201) | catalogue-individual | — | 0 | missing |
| Y-014 | Anubis Predator | catalogue-individual | — | 0 | missing |
| Y-015 | Apex Predator | catalogue-individual | — | 0 | missing |
| Y-016 | Ar'Wen | catalogue-individual | text-interpretation-not-canonical-visual | 0 | missing |
| Y-018 | Assault Predator | catalogue-individual | mixed-media-visual-evidence-to-review | 0 | missing |
| Y-019 | Bad Blood (Gotham City) | catalogue-individual | — | 0 | missing |
| Y-021 | Bad Blood Predator | catalogue-individual | — | 0 | missing |
| Y-022 | Bakuub | catalogue-individual | text-interpretation-not-canonical-visual | 0 | missing |
| Y-023 | Beads | catalogue-individual | mixed-media-visual-evidence-to-review | 0 | missing |
| Y-024 | Berserker (Game Preserve Planet) | catalogue-individual | — | 4 | missing |
| Y-025 | Berserker (LV-412) | catalogue-individual | — | 0 | missing |
| Y-026 | Bet-Karh | catalogue-individual | mixed-media-visual-evidence-to-review | 0 | missing |
| Y-027 | Big Mama | catalogue-individual | — | 0 | missing |
| Y-028 | Big Red | catalogue-individual | fan-origin-later-licensed-as-catalogued | 0 | missing |
| Y-029 | Bionic Predator | catalogue-individual | — | 0 | missing |
| Y-031 | Boar | catalogue-individual | — | 2 | missing |
| Y-032 | Bogey (Predator) | catalogue-individual | mixed-media-visual-evidence-to-review | 0 | missing |
| Y-033 | Bone (AVP: Annihilation) | catalogue-individual | unreleased-production | 0 | missing |
| Y-034 | Bonegrill | catalogue-individual | — | 2 | missing |
| Y-035 | Borg | catalogue-individual | — | 2 | missing |
| Y-036 | Bosu | catalogue-individual | — | 0 | missing |
| Y-040 | Bull (Predator) | catalogue-individual | — | 2 | missing |
| Y-041 | Captive Predator | catalogue-individual | — | 0 | missing |
| Y-044 | Celtic | catalogue-individual | — | 2 | missing |
| Y-045 | Chopper | catalogue-individual | — | 2 | missing |
| Y-046 | Chulonte | catalogue-individual | text-interpretation-not-canonical-visual | 0 | missing |
| Y-047 | Ci'tde | catalogue-individual | text-interpretation-not-canonical-visual | 0 | missing |
| Y-049 | City Hunter | catalogue-individual | — | 4 | missing |
| Y-050 | Clan Leader (LV-797) | catalogue-individual | — | 0 | missing |
| Y-051 | Clan Leader (Predator) | catalogue-individual | — | 0 | missing |
| Y-054 | Claw | catalogue-individual | — | 0 | missing |
| Y-055 | Cleopatra | catalogue-individual | — | 0 | missing |
| Y-056 | Comrade | catalogue-individual | mixed-media-visual-evidence-to-review | 0 | missing |
| Y-057 | Cracked Tusk Predator | catalogue-individual | — | 0 | missing |
| Y-058 | Crucified Predator | catalogue-individual | — | 2 | missing |
| Y-059 | Cyborg Predator (AVP: Annihilation) | catalogue-individual | unreleased-production | 0 | missing |
| Y-060 | Da-ec'te | catalogue-individual | text-interpretation-not-canonical-visual | 0 | missing |
| Y-061 | Dachande | catalogue-individual | — | 0 | missing |
| Y-063 | Dark | catalogue-individual | — | 0 | missing |
| Y-064 | Dark Ages Predator | catalogue-individual | fan-unofficial | 0 | missing |
| Y-065 | Dark Horse 25th Anniversary Predator | catalogue-individual | — | 0 | missing |
| Y-066 | Dek | catalogue-individual | — | 2 | missing |
| Y-067 | Devil | catalogue-individual | — | 0 | missing |
| Y-069 | Disgraced Predator | catalogue-individual | mixed-media-visual-evidence-to-review | 0 | missing |
| Y-070 | Djinn | catalogue-individual | — | 0 | missing |
| Y-072 | Dragon (Yautja) | catalogue-individual | — | 0 | missing |
| Y-073 | Elder (New Way City) | catalogue-individual | — | 0 | missing |
| Y-074 | Elder Predator (Predator: Hunting Grounds) | catalogue-individual | — | 0 | missing |
| Y-076-emissary-one | Emissary Predator 1 | catalogue-individual | — | 2 | missing |
| Y-076-emissary-two | Emissary Predator 2 | catalogue-individual | — | 2 | missing |
| Y-077 | Enforcer Predator | catalogue-individual | — | 0 | missing |
| Y-078 | Esch'ande | catalogue-individual | mixed-media-visual-evidence-to-review | 0 | missing |
| Y-079 | Etah'-dte | catalogue-individual | text-interpretation-not-canonical-visual | 0 | missing |
| Y-080 | Exalted Predator | catalogue-individual | — | 0 | missing |
| Y-081 | Exiled Predator | catalogue-individual | — | 0 | missing |
| Y-083 | Falconer (Game Preserve Planet) | catalogue-individual | — | 2 | missing |
| Y-085 | Feral Predator | catalogue-individual | — | 2 | missing |
| Y-086 | First Heavy Predator | catalogue-individual | mixed-media-visual-evidence-to-review | 0 | missing |
| Y-087 | First Light Predator | catalogue-individual | mixed-media-visual-evidence-to-review | 0 | missing |
| Y-088 | First POC Predator | catalogue-individual | mixed-media-visual-evidence-to-review | 0 | missing |
| Y-089 | Forest Devil | catalogue-individual | — | 0 | missing |
| Y-090 | Four-armed Predator | catalogue-individual | — | 0 | missing |
| Y-091 | Freckles | catalogue-individual | mixed-media-visual-evidence-to-review | 0 | missing |
| Y-092 | Fugitive Predator | catalogue-individual | — | 2 | missing |
| Y-093 | Ghardeh | catalogue-individual | mixed-media-visual-evidence-to-review | 0 | missing |
| Y-094 | Ghost Predator | catalogue-individual | — | 0 | missing |
| Y-095 | Gkyaun | catalogue-individual | mixed-media-visual-evidence-to-review | 0 | missing |
| Y-096 | Gladiator Predator | catalogue-individual | — | 0 | missing |
| Y-098 | Gollywomp | catalogue-individual | — | 0 | missing |
| Y-099 | Goreph | catalogue-individual | mixed-media-visual-evidence-to-review, text-interpretation-not-canonical-visual | 0 | missing |
| Y-101 | Grendel (Yautja) | catalogue-individual | — | 2 | missing |
| Y-102 | Grendel King | catalogue-individual | — | 2 | missing |
| Y-103 | Greyback | catalogue-individual | — | 2 | missing |
| Y-104 | Guardian | catalogue-individual | — | 2 | missing |
| Y-105 | H'chak | catalogue-individual | mixed-media-visual-evidence-to-review | 0 | missing |
| Y-106 | Hashori | catalogue-individual | text-interpretation-not-canonical-visual | 0 | missing |
| Y-108 | Hive Wars Predator | catalogue-individual | — | 0 | missing |
| Y-109 | Hook | catalogue-individual | — | 0 | missing |
| Y-110 | Hornhead | catalogue-individual | — | 0 | missing |
| Y-111 | Hunter (Elite Clan) | catalogue-individual | — | 0 | missing |
| Y-113 | Hunter Captain | catalogue-individual | mixed-media-visual-evidence-to-review | 0 | missing |
| Y-114 | Inu | catalogue-individual | mixed-media-visual-evidence-to-review | 0 | missing |
| Y-118 | Jungle Hunter | catalogue-individual | — | 4 | missing |
| Y-120 | Ka'Torag | catalogue-individual | mixed-media-visual-evidence-to-review | 0 | missing |
| Y-121 | Kaail | catalogue-individual | text-interpretation-not-canonical-visual | 0 | missing |
| Y-122 | Kalakta | catalogue-individual | mixed-media-visual-evidence-to-review, text-interpretation-not-canonical-visual | 0 | missing |
| Y-123 | Kata'nu | catalogue-individual | mixed-media-visual-evidence-to-review | 0 | missing |
| Y-124 | Ki'vik'non | catalogue-individual | mixed-media-visual-evidence-to-review | 0 | missing |
| Y-126 | Ku'dlak | catalogue-individual | mixed-media-visual-evidence-to-review | 0 | missing |
| Y-127 | Kwei | catalogue-individual | — | 2 | missing |
| Y-128 | Lasershot Predator | catalogue-individual | — | 0 | missing |
| Y-129 | Lava Planet Predator | catalogue-individual | — | 0 | missing |
| Y-130 | Lefty | catalogue-individual | mixed-media-visual-evidence-to-review | 0 | missing |
| Y-131 | Light-Stepper | catalogue-individual | — | 0 | missing |
| Y-132 | Long Spear | catalogue-individual | — | 0 | missing |
| Y-133 | Lord | catalogue-individual | — | 0 | missing |
| Y-136 | M'icli-de | catalogue-individual | mixed-media-visual-evidence-to-review | 0 | missing |
| Y-137 | Mad Predator | catalogue-individual | — | 0 | missing |
| Y-138 | Mahnde | catalogue-individual | mixed-media-visual-evidence-to-review | 0 | missing |
| Y-139 | Mersh-Trep | catalogue-individual | mixed-media-visual-evidence-to-review, text-interpretation-not-canonical-visual | 0 | missing |
| Y-140 | Minikui | catalogue-individual | mixed-media-visual-evidence-to-review | 0 | missing |
| Y-142 | Mutated Yautja | catalogue-individual | mixed-media-visual-evidence-to-review | 0 | missing |
| Y-143 | Mystery Competitor | catalogue-individual | — | 0 | missing |
| Y-144 | Nakande | catalogue-individual | mixed-media-visual-evidence-to-review | 0 | missing |
| Y-145 | Nat'ka'pu | catalogue-individual | mixed-media-visual-evidence-to-review | 0 | missing |
| Y-146 | Nei'hman-de | catalogue-individual | mixed-media-visual-evidence-to-review | 0 | missing |
| Y-148 | Night Recon Predator | catalogue-individual | — | 0 | missing |
| Y-149 | Nightmare Kid | catalogue-individual | mixed-media-visual-evidence-to-review | 0 | missing |
| Y-150 | Nightstorm Predator | catalogue-individual | — | 0 | missing |
| Y-151 | Njohrr | catalogue-individual | — | 2 | missing |
| Y-152 | Nk'mecci | catalogue-individual | mixed-media-visual-evidence-to-review | 0 | missing |
| Y-153 | Oc'djy | catalogue-individual | mixed-media-visual-evidence-to-review | 0 | missing |
| Y-154 | Oni Predator | catalogue-individual | — | 2 | missing |
| Y-155 | Ozarks Hunter | catalogue-individual | — | 0 | missing |
| Y-156 | Pig Iron | catalogue-individual | — | 0 | missing |
| Y-157 | Pirate Predator | catalogue-individual | — | 0 | missing |
| Y-159 | Predator (Mega-City One) | catalogue-individual | — | 0 | missing |
| Y-160 | Predator (Rite of Passage) | catalogue-individual | — | 0 | missing |
| Y-161 | Predator (World War II) | catalogue-individual | — | 2 | missing |
| Y-162 | Predator A6718 | catalogue-individual | — | 0 | missing |
| Y-164 | Predator de Predator: Last Will | catalogue-individual | fan-unofficial | 0 | missing |
| Y-165 | Prient'de | catalogue-individual | — | 0 | missing |
| Y-166 | Prince | catalogue-individual | — | 0 | missing |
| Y-167 | R'ka | catalogue-individual | mixed-media-visual-evidence-to-review | 0 | missing |
| Y-168 | Rakshasa | catalogue-individual | — | 0 | missing |
| Y-170 | Renegade Predator | catalogue-individual | — | 0 | missing |
| Y-173 | Sakana | catalogue-individual | mixed-media-visual-evidence-to-review | 0 | missing |
| Y-174 | Samurai Predator | catalogue-individual | — | 0 | missing |
| Y-175 | Scar | catalogue-individual | — | 2 | missing |
| Y-176 | Scar (Shell) | catalogue-individual | mixed-media-visual-evidence-to-review | 0 | missing |
| Y-177 | Scarface | catalogue-individual | — | 0 | missing |
| Y-178 | Scavage Predator | catalogue-individual | — | 0 | missing |
| Y-179 | Scout | catalogue-individual | — | 2 | missing |
| Y-180 | Second Heavy Predator | catalogue-individual | mixed-media-visual-evidence-to-review | 0 | missing |
| Y-181 | Second Light Predator | catalogue-individual | mixed-media-visual-evidence-to-review | 0 | missing |
| Y-182 | Second POC Predator | catalogue-individual | mixed-media-visual-evidence-to-review | 0 | missing |
| Y-183 | See-through Slasher | catalogue-individual | — | 0 | missing |
| Y-185 | Set-Thwei | catalogue-individual | mixed-media-visual-evidence-to-review | 0 | missing |
| Y-187 | Shaman | catalogue-individual | — | 2 | missing |
| Y-188 | Shamana | catalogue-individual | text-interpretation-not-canonical-visual | 0 | missing |
| Y-189 | Shesh-Kuk | catalogue-individual | text-interpretation-not-canonical-visual | 0 | missing |
| Y-190 | Shorty | catalogue-individual | — | 0 | missing |
| Y-191 | Shriek | catalogue-individual | mixed-media-visual-evidence-to-review | 0 | missing |
| Y-192 | Sister Midnight | catalogue-individual | mixed-media-visual-evidence-to-review | 0 | missing |
| Y-193 | Skemte | catalogue-individual | mixed-media-visual-evidence-to-review | 0 | missing |
| Y-194 | Skinner | catalogue-individual | mixed-media-visual-evidence-to-review | 0 | missing |
| Y-195 | Skl'da'-si | catalogue-individual | mixed-media-visual-evidence-to-review | 0 | missing |
| Y-196 | Sky Devil | catalogue-individual | mixed-media-visual-evidence-to-review | 0 | missing |
| Y-197 | Slats | catalogue-individual | mixed-media-visual-evidence-to-review | 0 | missing |
| Y-198 | Smiley | catalogue-individual | mixed-media-visual-evidence-to-review | 0 | missing |
| Y-199 | Snake | catalogue-individual | — | 2 | missing |
| Y-200 | Spartan | catalogue-individual | — | 0 | missing |
| Y-202 | Spiked Tail Predator | catalogue-individual | — | 0 | missing |
| Y-203 | Splitter | catalogue-individual | — | 0 | missing |
| Y-204 | Stalker (Bad Blood) | catalogue-individual | mixed-media-visual-evidence-to-review | 0 | missing |
| Y-205 | Stalker (Elite Clan) | catalogue-individual | — | 0 | missing |
| Y-206 | Stalker (Lost Tribe) | catalogue-individual | — | 2 | missing |
| Y-207 | Stalker (Night Hunter Clan) | catalogue-individual | — | 0 | missing |
| Y-209 | Stone Heart | catalogue-individual | — | 0 | missing |
| Y-211 | Swift Knife | catalogue-individual | — | 0 | missing |
| Y-212 | Ta'roga | catalogue-individual | mixed-media-visual-evidence-to-review | 0 | missing |
| Y-213 | Temple Guard Predator | catalogue-individual | — | 2 | missing |
| Y-214 | The Devil | catalogue-individual | mixed-media-visual-evidence-to-review | 0 | missing |
| Y-216 | Three-mandibled Predator | catalogue-individual | — | 0 | missing |
| Y-217 | Three-Spot | catalogue-individual | — | 0 | missing |
| Y-218 | Tichinde | catalogue-individual | mixed-media-visual-evidence-to-review | 0 | missing |
| Y-219 | Tli'uukop | catalogue-individual | mixed-media-visual-evidence-to-review | 0 | missing |
| Y-220 | Top-Knot | catalogue-individual | mixed-media-visual-evidence-to-review | 0 | missing |
| Y-222 | Tracker | catalogue-individual | — | 2 | missing |
| Y-223 | Tress | catalogue-individual | mixed-media-visual-evidence-to-review | 0 | missing |
| Y-224 | Tunnels Predator | catalogue-individual | mixed-media-visual-evidence-to-review | 0 | missing |
| Y-225 | Two-Stripes | catalogue-individual | — | 0 | missing |
| Y-227 | Ultimate Predator (Kenner) | catalogue-individual | — | 0 | missing |
| Y-228 | Unnamed Elite Predator (BG-386) | catalogue-individual | — | 0 | missing |
| Y-229 | Unnamed First Predator (Odobenus) | catalogue-individual | — | 0 | missing |
| Y-231 | Unnamed Jungle Hunter Predator (Temple Arena) | catalogue-individual | — | 0 | missing |
| Y-232 | Unnamed Predator (LV-426) | catalogue-individual | — | 0 | missing |
| Y-233 | Unnamed Predator (Tyrargo) | catalogue-individual | — | 0 | missing |
| Y-234 | Unnamed Second Predator (Odobenus) | catalogue-individual | — | 0 | missing |
| Y-235 | Unnamed Third Predator (Odobenus) | catalogue-individual | — | 0 | missing |
| Y-236 | Unnamed Young Blood Predator (BG-386) | catalogue-individual | — | 0 | missing |
| Y-237 | Upgrade Predator | catalogue-individual | — | 2 | missing |
| Y-238 | Vagouti | catalogue-individual | mixed-media-visual-evidence-to-review | 0 | missing |
| Y-239 | Valkyrie Predator | catalogue-individual | — | 0 | missing |
| Y-240 | Viking Predator | catalogue-individual | — | 0 | missing |
| Y-241 | Viper Predator | catalogue-individual | — | 0 | missing |
| Y-242 | Vk'leita | catalogue-individual | mixed-media-visual-evidence-to-review | 0 | missing |
| Y-243 | Warkha | catalogue-individual | mixed-media-visual-evidence-to-review | 0 | missing |
| Y-245 | Warrior (Yautja) | catalogue-individual | — | 2 | missing |
| Y-246 | Warrior Yautja (LV-412) | catalogue-individual | — | 0 | missing |
| Y-247 | Wasp Predator | catalogue-individual | fan-origin-later-licensed-as-catalogued | 0 | missing |
| Y-248 | Wendigo | catalogue-individual | mixed-media-visual-evidence-to-review | 0 | missing |
| Y-249 | Witch Predator | catalogue-individual | — | 0 | missing |
| Y-250 | Wolf (Earth) | catalogue-individual | — | 4 | missing |
| Y-251 | Wolf (Elite Clan) | catalogue-individual | — | 0 | missing |
| Y-252 | Yaquita | catalogue-individual | mixed-media-visual-evidence-to-review, text-interpretation-not-canonical-visual | 0 | missing |
| Y-253 | Yen'sha | catalogue-individual | mixed-media-visual-evidence-to-review | 0 | missing |
| Y-254 | Yeyinde | catalogue-individual | mixed-media-visual-evidence-to-review | 0 | missing |
| Y-255 | Youngblood Predator | catalogue-individual | — | 2 | missing |
| Y-256 | Predator Warrior (Arcade) | catalogue-individual | — | 0 | missing |
| Y-257 | Predator Hunter (Arcade) | catalogue-individual | — | 0 | missing |
| Y-258 | Elder Predator (Bouvetøya) | catalogue-individual | — | 4 | missing |
| Y-259 | Captive Predator (Killer of Killers) | catalogue-individual | — | 4 | missing |
| Y-260 | Arena Predator Guards | archetype | collective-archetype-not-named-individual | 4 | missing |
| DLC-G-001 | Predator jouable générique | archetype | class-or-generic-design-not-named-individual | 0 | missing |
| DLC-G-005 | Serpent Hunter | variant | — | 0 | missing |
| DLC-G-011 | Brawler | archetype | class-or-generic-design-not-named-individual | 0 | missing |
| DLC-G-012 | Hunter | archetype | class-or-generic-design-not-named-individual | 0 | missing |
| DLC-G-013 | Spear Master | archetype | class-or-generic-design-not-named-individual | 0 | missing |
| DLC-G-014 | Stalker | archetype | class-or-generic-design-not-named-individual | 0 | missing |
| DLC-G-015 | Disc Master | archetype | class-or-generic-design-not-named-individual | 0 | missing |
| DLC-G-016 | Vanguard | archetype | class-or-generic-design-not-named-individual | 0 | missing |
| DLC-G-017 | Military Hydra | archetype | class-or-generic-design-not-named-individual | 0 | missing |
| DLC-G-018 | Blazer | archetype | class-or-generic-design-not-named-individual | 0 | missing |
| DLC-G-019-hunter | Hunter configurable — Hunting Grounds | archetype | class-or-generic-design-not-named-individual | 0 | missing |
| DLC-G-019-berserker | Berserker configurable — Hunting Grounds | archetype | class-or-generic-design-not-named-individual | 0 | missing |
| DLC-G-019-scout | Scout configurable — Hunting Grounds | archetype | class-or-generic-design-not-named-individual | 0 | missing |
| DLC-G-023 | City Hunter | variant | — | 0 | missing |
| DLC-G-028 | Captured Predator | variant | — | 0 | missing |
| DLC-G-029 | Falconer Predator | variant | — | 0 | missing |
| DLC-G-030 | Mr. Black | variant | — | 0 | missing |
| DLC-G-031 | Wolf Predator | variant | — | 0 | missing |
| DLC-G-032 | Emissary Predator | variant | cross-media-identity-conflict | 0 | missing |
| DLC-G-036-scar | Scar — Hunting Grounds | variant | — | 0 | missing |
| DLC-G-036-celtic | Celtic — Hunting Grounds | variant | — | 0 | missing |
| DLC-G-036-chopper | Chopper — Hunting Grounds | variant | — | 0 | missing |
| DLC-G-037 | Feral Predator | variant | — | 0 | missing |
| DLC-G-042 | Oni Predator | variant | cross-media-identity-conflict | 0 | missing |
| DLC-G-043 | Jotun Predator | variant | cross-media-identity-conflict | 0 | missing |
| DLC-G-044 | Father Predator | variant | cross-media-identity-conflict | 0 | missing |
| DLC-G-045 | Predator de Fortnite | variant | cross-media-identity-conflict | 0 | missing |
| DLC-G-046 | Predator de *Ghost Recon Wildlands* | variant | — | 0 | missing |
| DLC-G-047 | Predator de *Call of Duty: Ghosts* | archetype | class-or-generic-design-not-named-individual | 0 | missing |
| DLC-G-048 | Predator invité | variant | cross-media-identity-conflict | 0 | missing |
| DLC-G-051 | Protagoniste Predator et designs de clans | research-set | unresolved-set-not-one-character | 0 | missing |
| DLC-C-004-other | Autres jeunes chasseurs nommés — AVP (à identifier) | research-set | unresolved-set-not-one-character | 0 | missing |
| DLC-C-010 | Greyback — état « Golden Angel / 1718 » | variant | — | 0 | missing |
| DLC-C-011 | Clan exilé de l'île | research-set | unresolved-set-not-one-character | 0 | missing |
| DLC-C-012 | Trois Predators adversaires de Theta | research-set | unresolved-set-not-one-character | 0 | missing |
| DLC-C-013 | Super Predator de *The Last Hunt* | dlc-individual-to-reconcile | — | 0 | missing |
| DLC-C-014 | Rival de Wolverine, non nommé | dlc-individual-to-reconcile | — | 0 | missing |
| DLC-C-015 | Jeune chasseur / clan | research-set | unresolved-set-not-one-character | 0 | missing |
| DLC-C-017 | Predator King et armée au vibranium | research-set | unresolved-set-not-one-character | 0 | missing |
| DLC-C-018 | Chasseurs non nommés des anthologies/crossovers Dark Horse | research-set | unresolved-set-not-one-character | 0 | missing |
| DLC-N-008 | Kalep-Sis | dlc-individual-to-reconcile | text-interpretation-not-canonical-visual | 0 | missing |
| DLC-N-009 | Bel-Cann | dlc-individual-to-reconcile | text-interpretation-not-canonical-visual | 0 | missing |
| DLC-N-010 | Chasseur non nommé | dlc-individual-to-reconcile | text-interpretation-not-canonical-visual | 0 | missing |
| DLC-N-011 | Chasseurs non nommés | research-set | unresolved-set-not-one-character, text-interpretation-not-canonical-visual | 0 | missing |
| DLC-N-012 | Chasseurs des nouvelles | research-set | unresolved-set-not-one-character, text-interpretation-not-canonical-visual | 0 | missing |
| DLC-N-013 | Chasseurs des autres romans Titan | research-set | unresolved-set-not-one-character, text-interpretation-not-canonical-visual | 0 | missing |
| DLC-L-003 | Hive Wars Predator | variant | — | 0 | missing |
| DLC-L-005 | Cracked Tusk Predator | variant | — | 0 | missing |
