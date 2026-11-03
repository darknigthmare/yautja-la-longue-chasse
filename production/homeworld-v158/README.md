# V158 — dix PNG maintenant versés dans la PR #99

Les dix fichiers de `assets/sprites_png/` sont les octets exacts du paquet V158.
Le manifeste contient leurs chemins Git, dimensions et SHA-256. Le précédent
état documentaire est conservé dans `../homeworld-v160/history/` et dans Git.

**Un rendu grand format et neuf petites découpes de planches.** Les neuf petites
images restent à produire individuellement à haute résolution. Leur import ne
constitue ni une mise à l’échelle, ni une validation de perspective, ni une
intégration dans le Homeworld jouable.

```bash
node scripts/verify-homeworld-v158.mjs
node --test tests/homeworld-v158-intake.test.mjs
python3 production/homeworld-v160/tools/verify.py
```

Le classeur V160, les 87 sources nommées, les dix fichiers du premier pack et le
suivi des 354 cibles se trouvent dans `../homeworld-v160/`.
La caméra de référence reste yaw global 0°, pitch 35°. Les pivots, dimensions
physiques, collisions, portes, parcours et validations artistiques restent ouverts.
