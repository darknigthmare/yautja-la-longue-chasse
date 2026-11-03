# Homeworld — V160 : sources PNG, échelle, emplacements et suivi

Ce lot verse les **fichiers binaires réels** dans la branche de la PR #99. Il ne
modifie pas le Homeworld jouable et ne fusionne rien dans `main`.

## Contenu traçable

| Contenu | Quantité | Portée réelle |
| --- | ---: | --- |
| Sources nommées récupérées de la conversation | 87 | Variantes, constructions, éléments naturels et composites |
| Découpes RGBA du premier pack | 10 | Dérivés antérieurs conservés à l'identique |
| PNG du paquet urbain V158 | 10 | Un grand format et neuf petites découpes à refaire |
| Total de fichiers PNG | **107** | **Pas 107 objets uniques validés** |
| PNG avec transparence réelle | 96 | La présence d'alpha ne valide ni cadrage ni intégration |
| Archives opaques | 11 | Conservées comme références, non utilisables directement comme sprites |
| Dernières propositions de grande échelle récupérées | 9 | Proportions proposées, métrique et placement non mesurés |
| Cibles héritées du registre V81 | 354 | Besoins globaux ouverts, pas 354 absences démontrées |

Les PNG de `originals/` sont copiés sans redimensionnement, détourage,
recompression, miroir, étirement ni modification de pixels. `first-pack/`
contient les dérivés déjà présents dans l'archive antérieure, pas de nouveaux
originaux. Les PNG V158 résident dans `../homeworld-v158/assets/sprites_png/`.
`catalogue.json` donne les dimensions, chemins, SHA-256 et états de production.

Une erreur de transcription a été trouvée dans l'ancien manifeste V158 pour
**HW1040** : le SHA-256 avait perdu deux caractères. Le fichier de 36 331 octets
est inchangé. La correction s'appuie sur le PNG de l'archive d'origine, et les
anciennes métadonnées sont archivées dans `history/`. Le script de migration
refuse toute autre divergence.

## Classeur et galerie

- [Classeur Excel V160](YAUTJA_HOMEWORLD_PROPS_ECHELLE_TRIBUS_V160.xlsx) : neuf
  feuilles, 107 fichiers, 354 cibles, 22 observations des images fournies,
  propositions d'échelle, huit implantations originales, sources, limites de
  lore et tâches de QA.
- [Galerie locale](index.html) : ouvrir ce fichier après extraction ou servir
  la racine du dépôt. Recherche et filtres ; les cartes sont des aperçus, **pas
  des comparaisons à une échelle mondiale commune**.
- `next-production.json` : dix briefs de modules individuels, **à générer** ;
  ne pas confondre cette liste avec dix PNG déjà livrés.

## Perspective et proportions

La référence du jeu est orthographique : **yaw global 0°, pitch 35°**,
profondeur projetée `sin(35°)`. Une orientation gauche, droite ou arrière doit
être dessinée nativement. La hauteur verticale d'un sprite n'est pas écrasée
par le facteur du sol.

Une tour doit rester élancée ; les tabliers conservent leur vraie longueur ;
les escaliers ont des marches fines et des paliers praticables. Les portes,
garde-corps et meubles ne grandissent pas arbitrairement avec le bâtiment.
Les grandes structures peuvent être découpées en modules **après** mesure des
raccords et conservation de la source. Aucune mise au même gabarit graphique
ne vaut mise à l'échelle physique.

La convention du projet `adultHeight=100`, `adultMetres=2.3` sert aux calculs du
classeur. Ce n'est ni une taille universelle canonique des Yautja ni une mesure
prouvée des monuments. Les valeurs proposées restent à confronter aux sources
et à la scène. Le vaisseau surdimensionné demande une reprise : des escaliers
et bâtiments ajoutés sur sa coque ne prouvent pas sa taille ou sa fidélité.

## Lore et implantations

Les captures fournies établissent des silhouettes et des éléments **visibles**.
Elles ne prouvent pas les faces cachées, les intérieurs, les dimensions exactes,
les noms de clans, l'origine de la faune ou l'attribution de chaque planète.
Les villages et environnements proposés dans `Implantations` sont des créations
pour le jeu, pas des villages canoniques attribués à des clans réels.

Les sources de franchise sont distinguées des créations et extrapolations dans
le classeur. **Zéro nouvelle certification 1:1, zéro validation artistique
humaine, zéro admission automatique dans le moteur.** Les composites doivent
être décomposés ; les espèces mal discernables ne reçoivent pas de nom officiel
inventé.

## Vérifications reproductibles

```sh
node scripts/verify-homeworld-v158.mjs
node --test tests/homeworld-v158-intake.test.mjs
python3 production/homeworld-v160/tools/verify.py
```

Le contrôle Python requiert Pillow. Il vérifie les octets, SHA-256, dimensions,
l'alpha réellement non opaque, les identifiants stables et la structure du
classeur. Le contrôle Node relit les dix PNG V158 et la caméra du jeu ; les tests
refusent les fichiers manquants et corrompus. Aucun de ces contrôles ne remplace
un essai de collision, de porte, de navigation PNJ ou une revue visuelle en jeu.

Les anciens classeurs V112/V113/V114, le gel de production, les sauvegardes et
les modules applicatifs restent inchangés. L'ancien état V158 est conservé dans
l'historique Git et dans `history/`.
