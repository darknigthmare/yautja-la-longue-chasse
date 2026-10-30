# V119 — Barrière d'intégrité du lot PHG Drive (156 PNG)

## But et portée

Cette étape prépare l'admission **technique** des 156 matières reconstituées conservées dans **sept archives ZIP** sur Drive, sans réimport automatique ni altération des 44 PNG déjà suivis dans GitHub. Le but n'est **pas** d'affirmer une fidélité officielle 1:1. Les fichiers sont des matières carrées RGB reconstruites, pas des sprites RGBA découpés ni des UV de *Predator: Hunting Grounds*.

Le script `scripts/audit-phg-drive-v119.py` accepte les deux inventaires existants : `YAUTJA_PHG_RECONSTRUIT_156_INVENTAIRE.json` et `YAUTJA_PHG_ARCHIVES_DRIVE_20261007.json`.

### Métadonnées contrôlées

| Peau | Dreadlocks | Anneaux | Armure / matières d'équipement | Total |
| ---: | ---: | ---: | ---: | ---: |
| 80 | 15 | 6 | 55 | **156** |

Les ZIP doivent contenir exactement **12 + 29 + 30 + 30 + 18 + 18 + 19** matières distinctes. Chaque entrée a un identifiant, un chemin relatif sûrs, une catégorie, des dimensions 1254 × 1254, un format RGB, une taille en octets et un SHA-256.

### Utilisation

1. Vérifier les inventaires seuls (ne déclare aucun PNG importé) :

```bash
python3 scripts/audit-phg-drive-v119.py --inventory YAUTJA_PHG_RECONSTRUIT_156_INVENTAIRE.json --delivery YAUTJA_PHG_ARCHIVES_DRIVE_20261007.json --report outputs/qa/phg-drive-v119.json
```

2. Après téléchargement légitime des sept archives de l'emplacement Drive d'origine, vérifier **les octets** sans extraction :

```bash
python3 scripts/audit-phg-drive-v119.py --inventory YAUTJA_PHG_RECONSTRUIT_156_INVENTAIRE.json --delivery YAUTJA_PHG_ARCHIVES_DRIVE_20261007.json --zip-dir /chemin/vers/les/sept/archives --report outputs/qa/phg-drive-v119.json
```

Le script compare SHA-256 des ZIP et PNG, tailles, CRC IHDR, couleur RGB et dimensions. Toute archive manquante, altérée, mal répartie ou dangereuse produit un échec et **aucun nouveau matériau sélectionnable**.

### Garde-fous lore et qualité

Les 6 variantes d'anneaux ne deviennent pas des mèches de dreadlocks ; les 55 matériaux d'armure incluent des catégories à départager (tissu, parure, plaque) avant le rendu. Après vérification technique, il faut encore contrôler chaque image en face, profil, dos et poses à travers les morphologies Yautja. Aucun nouvel ID n'est inscrit dans `PHG_CHROMATIC_MATERIALS_V113` avant cette revue. Le statut de fidélité UV 1:1 reste **non certifié**.

Cette étape ne change ni gameplay, ni sauvegarde, ni classement. La V117/V118 conserve la priorité pour le rendu et le retour en `main`.
