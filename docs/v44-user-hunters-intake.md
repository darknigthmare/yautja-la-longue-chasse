# V44 — import des chasseurs et variantes fournis

Les PNG sources sont intégrés sans recadrage, recoloration, détourage ni réencodage. Chaque copie publiée est identifiée par son SHA-256. Les poses restent explicitement statiques : une image ne constitue pas une planche d'animation.

## Périmètre et résultats

- 8 ZIP et le RAR de 50 images fournis, tous lus intégralement pour leurs entrées PNG.
- Galerie HTML fournie : 48 images embarquées, dont 12 chasseurs retenus ; les 36 décors, accessoires, animaux et personnages historiques restent hors de cet import.
- 691 entrées PNG examinées : 629 dans les ZIP, 50 dans le RAR et 12 dans le HTML.
- 472 contenus SHA distincts parmi ces entrées.
- 410 PNG publiés, représentant 965 941 164 octets ; 214 entrées dupliquées réutilisent leur copie existante.
- 193 identités ou regroupements d'apparences : 16 identités déjà présentes et 177 nouvelles entrées. Cela ne représente pas 193 nouveaux personnages canoniques.
- 150 identités/libellés sont tirés des fiches ou titres explicites ; 43 restent des regroupements descriptifs, sans identification canonique certifiée.
- 407 poses orientées à droite, 3 Sinestro Corps orientées à gauche ; directions contrôlées visuellement.
- 409 PNG de 1024 × 1536, un PNG de 1145 × 1374 ; dimensions natives conservées.

## Regroupements

Les versions avec/sans masque restent dans la même case. Les variantes explicitement rattachées à City Hunter, Jungle Hunter, Feral, Falconer, Scar, Wolf, Berserker et Celtic sont rassemblées. Les deux armures d'Assassin et de Dek sont regroupées ; Golden Angel rejoint Greyback, et les variantes nommées de Valkyrie et Sinestro rejoignent leur identité existante.

Quatorze paires descriptives de même corps et équipement sont regroupées après comparaison visuelle. Elles gardent des noms descriptifs, sans transformer une ressemblance en identité canonique. L'Enforceuse au disque du pack de 58 images reste distincte de l'Enforcer NECA : son apparence et son anatomie diffèrent. Adjutant, Gardien et Enforcer de la galerie Warp restent des rôles originaux séparés.

## Exclusions conservées dans leurs archives

67 entrées restent hors runtime et sont individuellement tracées :

| Motif | Entrées |
| --- | ---: |
| Variantes explicitement non validées par leur pack | 29 |
| Planches, armes, accessoires, compagnons ; pas un chasseur individuel | 24 |
| Versions historiques avant correction | 9 |
| Sans canal alpha RGBA exploitable | 4 |
| Copie SHA identique à une version historique | 1 |

Aucune archive ni source exclue n'a été supprimée ou modifiée. Les instructions, prompts et notes contenus dans les documents ont été traités comme données de provenance, jamais exécutés.

## Limites visuelles

Les 410 poses ont été examinées en planches de contact pour l'orientation, la silhouette et les défauts grossiers. Ce contrôle ne certifie pas chaque doigt ni une fidélité canonique 1:1. Les pivots et hauteurs restent des estimations calculées à partir de l'alpha ; les armes tenues peuvent influencer les extrêmes. Aucun sprite fourni n'est déclaré animé.

24 images contiennent des pixels de bord d'alpha supérieur à 8. Les gros plans isolent trois cas d'alpha supérieur ou égal à 128 :

- City Demon sans masque : pointe d'une griffe de pied tangente au bord droit, 11 pixels opaques de bord ; cadrage à reprendre avant certification finale.
- Ancient Homeworld avec masque : pointe d'arme tangente au bord droit, 2 pixels.
- Ancient Homeworld sans masque : un pixel isolé alpha 140 au bord inférieur, hors silhouette du pied.

Ces limites figurent aussi dans les `qualityNotes` de chaque variante. Les autres cas sont des franges alpha. Les PNG ne sont pas silencieusement retouchés pour faire disparaître ces avertissements.

## Reproduction et vérification

Importer avec Python + Pillow et le tar Windows :

```powershell
python scripts/import-user-hunters-v44.py --asset-dir public/game/sprites/v44/user-hunters --evidence-dir E:/CodexTemp/yautja-v44-user-hunters-review-final
node --test tests/user-hunters-intake-v44.test.mjs
```

Le dossier public des PNG est une jonction vers `E:/CodexTemp/yautja-v44-user-hunters`, choisie pour l'espace disque disponible. Git voit les 410 fichiers réguliers contenus dans cette jonction.

Validation du 23 septembre 2026 : 3 tests passent, dont la vérification SHA-256 des 410 copies publiées, les dimensions PNG natives, la comptabilité des entrées et l'absence de doublons d'identité dans le catalogue.

La sélection, le combat, les replays et la publication sont vérifiés séparément par l'intégration runtime ; le présent rapport ne les déclare pas testés.
