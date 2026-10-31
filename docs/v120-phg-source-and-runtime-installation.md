# V120 — Activation contrôlée des 156 matières PHG reconstituées

Les sept archives Drive ont été contrôlées intégralement le 30 octobre 2026 : **156 PNG uniques sur 156** et **sept ZIP sur sept**, SHA-256, taille, signature PNG et CRC IHDR conformes. À partir de leurs octets, le paquet local `Yautja_PHG_156_Runtime_V120.zip` contient 156 WebP de matière (512×512), 156 aperçus (176×176) et le manifeste `docs/PHG_V120_RUNTIME_MANIFEST.json`.

- Source : environ 551 Mo de PNG, bundle jeu : **16 Mo** (paquet contrôlé, SHA-256 `9a2e88383fda303a97780f0b68ae3f77639f13b16d5bea4ab645d0a383cdf6d9`).
- Canaux candidats : 80 peau, 15 dreads, 5 vêtements, 49 armures, 7 accessoires sans application de matière générique (six anneaux et le biomask Feral).
- Les 156 sont des **reconstructions 2D** de matières, pas des UV/PBR officiels ; la justesse de teinte et le raccord exact aux six morphologies restent une revue artistique **ouverte**.
- État par défaut : `phgDriveV120Installed.json` contient une liste vide : **aucune URL d'image absente n'est proposée dans le jeu**.

## Installation sûre depuis le paquet local

Copier le paquet V120 téléchargé dans le poste de travail disposant du dépôt cloné, puis depuis la racine :

```bash
python3 scripts/install-phg-runtime-v120.py --bundle /chemin/Yautja_PHG_156_Runtime_V120.zip --verify-only
python3 scripts/install-phg-runtime-v120.py --bundle /chemin/Yautja_PHG_156_Runtime_V120.zip
python3 scripts/install-phg-runtime-v120.py --verify-installed
```

L'activation valide **avant toute écriture** l'empreinte du ZIP connu, le manifeste, les 312 WebP (octets, hashes, RIFF), l'identité des 156 sources et les chemins autorisés. Elle refuse les fichiers locaux existants qui diffèrent et ne publie le registre qu'après installation. Les entrées activées deviennent sélectionnables dans les ateliers de la V117 ; aucune entrée inconnue n'est chargée depuis une sauvegarde. Les six matières d'anneaux et le masque Feral sont seulement préservés comme assets, non appliqués aux dreadlocks ou aux plaques.

## Conservation

Ne pas supprimer les 44 PNG natives V85. Le paquet 156 n'écrase aucun calque original du rig. Le déblocage en jeu d'une matière reste cosmétique, sans effet sur honneur/rang ni équipement. Après installation, lancer les tests du registre et inspecter les vues de face/profil/dos. Un test technique vert ne vaut pas validation artistique 1:1.
