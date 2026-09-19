import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

test("ZIP audit rejects canonical collisions, unsafe Windows paths, symlinks, corruption and bombs", () => {
  const code = `import importlib.util, pathlib, tempfile, zipfile, stat
spec = importlib.util.spec_from_file_location('intake', 'scripts/audit-chatgpt-download.py')
intake = importlib.util.module_from_spec(spec)
spec.loader.exec_module(intake)
with tempfile.TemporaryDirectory() as folder:
    filename = pathlib.Path(folder) / 'pack.zip'
    with zipfile.ZipFile(filename, 'w') as z:
        z.writestr('H001/', '')
        z.writestr('H001/description.txt', 'texte complet')
        z.writestr('H002/./description.txt', 'texte complet')
    report = intake.audit(filename)
    assert report['uniqueFiles'] == 1 and report['duplicateByteCopies'] == 1
    assert report['entries'][1]['path'] == 'H002/description.txt'
    assert report['extracted'] == False and report['runtimeAssetsAccepted'] == 0
    unsafe = [('../escape.txt',), ('C:/escape.txt',), ('CON.txt',), ('COM¹.txt',), ('hero.png', 'HERO.png'),
        ('a/./hero.png', 'a/hero.png'), ('a//hero.png', 'a/hero.png'), ('a', 'a/hero.png'),
        ('a/hero.png', 'a'), ('bad?.png',), ('bad*.png',), ('bad|.png',), ('trail./x.png',), ('/escape.png',)]
    for names in unsafe:
        with zipfile.ZipFile(filename, 'w') as z:
            for name in names: z.writestr(name, 'data')
        try: intake.audit(filename)
        except ValueError: pass
        else: raise AssertionError('Unsafe archive accepted: ' + str(names))
    with zipfile.ZipFile(filename, 'w') as z:
        info = zipfile.ZipInfo('link')
        info.create_system = 3
        info.external_attr = (stat.S_IFLNK | 0o777) << 16
        z.writestr(info, '../outside')
    try: intake.audit(filename)
    except ValueError: pass
    else: raise AssertionError('Symlink accepted')
    with zipfile.ZipFile(filename, 'w', zipfile.ZIP_DEFLATED) as z: z.writestr('bomb.txt', 'x' * 100000)
    try: intake.audit(filename)
    except ValueError: pass
    else: raise AssertionError('Compression bomb accepted')
    with zipfile.ZipFile(filename, 'w', zipfile.ZIP_STORED) as z: z.writestr('data.txt', b'DATA_TO_CORRUPT')
    raw = filename.read_bytes()
    filename.write_bytes(raw.replace(b'DATA_TO_CORRUPT', b'FAIL_TO_CORRUPT', 1))
    try: intake.audit(filename)
    except zipfile.BadZipFile: pass
    else: raise AssertionError('CRC corruption accepted')
print('ZIP intake checks passed')
`;
  const result = spawnSync(process.platform === "win32" ? "py" : "python3", process.platform === "win32" ? ["-3", "-c", code] : ["-c", code], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.error?.message);
  assert.match(result.stdout, /ZIP intake checks passed/);
});
