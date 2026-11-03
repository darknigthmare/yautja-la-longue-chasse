"""One-time, narrow migration from metadata-only intake to real PNG delivery."""
from pathlib import Path
import hashlib, json, shutil
root = Path(__file__).resolve().parents[3]
v158 = root / 'production/homeworld-v158'
p = v158 / 'manifest.json'
m = json.loads(p.read_text(encoding='utf-8'))
expected = 'COMPANION_DOWNLOAD_ONLY_NOT_COMMITTED_IN_THIS_PR'
if m['sourceAvailability'] not in (expected, 'COMMITTED_IN_PR_BRANCH'):
    raise SystemExit('Unexpected intake state; stop and review the active branch.')
history = root / 'production/homeworld-v160/history'
history.mkdir(exist_ok=True)
if m['sourceAvailability'] == expected:
    for old in ('manifest.json', 'README.md'):
        dst = history / ('v158-intake-' + old)
        if dst.exists():
            raise SystemExit('History already exists; do not overwrite it.')
        shutil.copyfile(v158 / old, dst)
for a in m['candidates']:
    path = v158 / 'assets' / a['originalArchivePath']
    data = path.read_bytes()
    actual = hashlib.sha256(data).hexdigest()
    old_typo = '4bf71a74546ae7c9abc2152060dd60a7a934c56c93c079fce83e8bb38f4ac6'
    exact_original = '4bf71a74546aeae7c9abc2152060dd60a7a934c56c93c079fce83e8bb38f4ac6'
    if a['id'] == 'HW1040' and a['sha256'] == old_typo and actual == exact_original and len(data) == 36331:
        a['metadataCorrection'] = {'previousSha256':old_typo, 'reason':'Two characters omitted in historical transcription; original PNG bytes unchanged.', 'sourceArchiveSha256':'4c757ac6c2a16eaa744a89f6f37801c2a87bc1ec361276baec6c61606acb3b14'}
        a['sha256'] = actual
    if len(data) != a['bytes'] or actual != a['sha256']:
        raise SystemExit('Source mismatch: ' + a['id'])
    a['sourceInGit'] = True
    a['repositoryPath'] = path.relative_to(root).as_posix()
    a['artState'] = 'CANDIDATE_NOT_ADMITTED'
m['sourceAvailability'] = 'COMMITTED_IN_PR_BRANCH'
m['status'] = 'PNG_BYTES_DELIVERED_ART_CANDIDATES_NOT_ADMITTED'
m['delivery'] = {'release':'V160', 'pngCount':10, 'originalBytesPreserved':True, 'runtimeIntegrated':False}
p.write_text(json.dumps(m, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
(v158 / 'README.md').write_text('''# V158 — dix PNG maintenant versés dans la PR #99

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
''', encoding='utf-8')
print('V158: 10 original PNGs verified; current intake updated; original history preserved.')
