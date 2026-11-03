# V132 — Sept finitions de biomask PHG en pack externe vérifiable

Le patch officiel [2.19](https://forum.predator.illfonic.com/t/patch-notes-2-19/20975) nomme Requiem/Nova (Alpha et Samurai), Instinct/Glypic/Tyrant/Warlord/Paroxysm (Alpha). Ogre a déjà son étude indépendante V131/V129. Nous avons produit sept études de matières originales d'après ces **noms** sans référence de pixel ou de teinte certifiée.

L'archive locale `PHG_V132_Seven_Biomask_Studies.zip` contient un atlas WebP **2048×1024, 4×2**, sept matières PNG/WebP 512², sept aperçus et un manifeste SHA. Les fichiers ne sont **PAS** des textures officielles PHG, ni des UV/PBR copiées. Le ZIP est lié par SHA-256 `91e62be00b3563e5d0b67e5ab31ffbd78f5825ab571d6a8ef3da1423c905655c` ; le WebP par `1606b3f815acf465e71ab0dd99a92e668c8eec1bbd306c31b2f45c6832a1084c`.

### Installation dans un clone de la PR #27
```bash
python3 scripts/install-phg-biomask-v132.py --bundle /chemin/PHG_V132_Seven_Biomask_Studies.zip --verify-only
python3 scripts/install-phg-biomask-v132.py --bundle /chemin/PHG_V132_Seven_Biomask_Studies.zip
python3 scripts/install-phg-biomask-v132.py --verify-installed
```

Le script valide le **SHA de toute l'archive avant lecture**, les 14 fichiers individuels, leurs SHA/headers, les emplacements de tuiles, les classes admissibles et le WebP final. L'installation est conservatrice et ne remplace jamais un fichier modifié. Le registre `phgBiomaskV132Installed.json` est vide par défaut : l'atelier reconnaît les noms/compatibilités mais refuse de charger une image absente. Une fois installé, reconstruire le jeu pour proposer les sept matières sur la coque du biomask seulement.

En PHG, le Samurai possède aussi Requiem et Nova ; le moteur préserve donc un `maskOriginId="samurai"` dans le chasseur devenu `custom`. Les masques Alpha et Samurai sont actuellement des proxies Feral et Celtic ; la géométrie et les pixels 1:1 du jeu officiel nécessitent encore des images de référence propres au masque. Les noms ne suffisent pas à certifier la couleur.
