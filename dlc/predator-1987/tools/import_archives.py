#!/usr/bin/env python3
"""Import the three conversation archives without changing the host game.

Only the three pinned public transport URLs below are accepted. Local files
can be used with --archive-dir; --check-only never downloads or writes.
"""
from __future__ import annotations

import argparse
import hashlib
import io
import json
import re
import shutil
import stat
import struct
import subprocess
import tempfile
import urllib.request
import zipfile
from pathlib import Path, PurePosixPath

ROOT = Path(__file__).resolve().parents[1]
PREFIX = 'YAUTJA_DLC_PREDATOR_1987_V0_1/'
BASE = 'a97be316ed06ee4fc881dd985e259245b9b73b38'
HOST = 'https://d2ol7oe51mr4n9.cloudfront.net/user_3JHwJlNzgmcxQy32tjF7NiVZPuH/'
ARCHIVES = [
    ('0.1.0', 'YAUTJA_DLC_PREDATOR_1987_V0_1.zip', 597001,
     '70b43636a268d8e7656bf5325bd4282bf97ff9e3ef1a8464e800162f1695fc8b',
     'b70a5f15-a524-4c5a-b2f1-4fa004187d14.zip'),
    ('0.2.0', 'YAUTJA_DLC_PREDATOR_1987_V0_2_TRAQUE_TOTALE.zip', 592685,
     'a59d732d07fa9ddd0d5d7a9f63439440857b8602f2e3089323d880ffb6e7f0cc',
     '0d79a230-4a15-402d-8ad3-ee16deff62af.zip'),
    ('0.3.0', 'YAUTJA_DLC_PREDATOR_1987_V0_3_FILM_JOUABLE.zip', 591169,
     '46d66013f925ebb30f4326499cd9fc1093e7b71def02ad2ea943949ae3cf2c95',
     '4c9b8a38-ac16-4dba-bbdf-e8b64a3f9b3e.zip'),
]


def require(condition, message):
    if not condition:
        raise ValueError(message)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def git_blob(data):
    return hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest()


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise ValueError('Unexpected redirect from pinned archive URL')


def acquire(row, archive_dir, check_only):
    version, name, size, digest, media = row
    local = ROOT / 'archives' / name
    source = local if local.exists() else archive_dir / name if archive_dir else None
    if source is not None and source.is_file():
        require(not source.is_symlink(), 'Symlink archive refused')
        data = source.read_bytes()
    else:
        require(not check_only, 'Missing archive: ' + name)
        with urllib.request.build_opener(NoRedirect).open(HOST + media, timeout=60) as response:
            require(response.status == 200, 'Archive download failed')
            data = response.read(size + 1)
    require(len(data) == size and sha(data) == digest, 'Archive identity mismatch: ' + name)
    return data


def normalized_name(info):
    name = info.filename
    require(name.startswith(PREFIX), 'Unexpected archive root')
    name = name[len(PREFIX):]
    if not info.flag_bits & 0x800:
        try:
            name = name.encode('cp437').decode('utf-8')
        except (UnicodeEncodeError, UnicodeDecodeError):
            pass
    name = name.replace('05_predator_canopée.png', '05_predator_canopee.png')
    path = PurePosixPath(name)
    require(name and not path.is_absolute() and '..' not in path.parts,
            'Unsafe archive path')
    require('\\' not in name and ':' not in name and '\0' not in name, 'Unsafe filename')
    require(stat.S_IFMT(info.external_attr >> 16) != stat.S_IFLNK, 'Symlink entry refused')
    return path.as_posix()


def unpack(data):
    files = {}
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        require(len(archive.infolist()) == 39, 'Unexpected archive entry count')
        require(sum(i.file_size for i in archive.infolist()) < 2_000_000, 'Archive too large')
        require(archive.testzip() is None, 'ZIP CRC failure')
        for info in archive.infolist():
            if info.is_dir():
                continue
            name = normalized_name(info)
            require(name not in files, 'Duplicate normalized entry')
            files[name] = archive.read(info)
    require(len(files) == 33, 'Expected 33 original files')
    return files


def put(relative, data, check_only):
    path = ROOT / relative
    require(not path.is_symlink() and not any(p.is_symlink() for p in path.parents),
            'Symlink destination refused')
    if path.exists():
        require(path.read_bytes() == data, 'Refusing to replace different file: ' + relative)
        return
    require(not check_only, 'Missing imported file: ' + relative)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)


def revised_pack(original):
    files = dict(original)
    readme = files['README.md'].decode('utf-8')
    readme = readme.replace('Prototype DLC privé **v0.1.0**', 'Prototype DLC autonome **v0.3.0**')
    readme = readme.replace('(`yautja.predator1987.v01`)',
                            '(`yautja.predator1987.v03`, avec reprise des clés V0.1/V0.2)')
    readme += ('\n## Import GitHub\n\nLes trois archives originales sont conservées dans `../archives/`. '
               'La preuve de cette intégration est `../qa/IMPORT_VALIDATION.json`. '
               '`VALIDATION.json` reste la preuve historique livrée avec la V0.3, '
               'pas une nouvelle validation navigateur. Les sept PNG sont des prévisualisations. '
               'Ne pas lancer `scripts/generate_content.py` : c’est le générateur historique V0.1 '
               'avec un chemin absolu, conservé pour provenance. Le build actuel est `node scripts/build.mjs`.\n')
    files['README.md'] = readme.encode()
    validator = files['scripts/validate-pack.mjs'].decode('utf-8')
    require('sources:data.sources.length,tests:16' in validator, 'Unexpected validator revision')
    validator = validator.replace('sources:data.sources.length,tests:16',
        "sources:data.sources.length,tests:Number(steps.find(s=>s.name==='automated tests').stdout.match(/^# tests (\\d+)$/m)?.[1]??0)")
    validator = validator.replace("['--test','tests/content.test.mjs'",
                                  "['--test','--test-reporter=tap','tests/content.test.mjs'")
    files['scripts/validate-pack.mjs'] = validator.encode()
    files['CHECKSUMS.sha256'] = ''.join(
        sha(data) + '  ' + name + '\n'
        for name, data in sorted(files.items()) if name != 'CHECKSUMS.sha256'
    ).encode()
    return files


def run_tests(files):
    """Run build and existing tests in a temporary copy; never alter shipped files."""
    with tempfile.TemporaryDirectory(prefix='predator-1987-qa-') as tmp:
        work = Path(tmp)
        for name, data in files.items():
            target = work / name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
        commands = [
            ['node', 'scripts/build.mjs'],
            ['node', '--check', 'src/browser-engine.js'],
            ['node', '--test', '--test-reporter=tap', *sorted(str(p.relative_to(work)) for p in (work / 'tests').glob('*.test.mjs'))],
            ['node', 'scripts/validate-pack.mjs'],
        ]
        count = 0
        for command in commands:
            result = subprocess.run(command, cwd=work, text=True, capture_output=True, timeout=90)
            require(result.returncode == 0, 'Command failed: ' + ' '.join(command) + '\n' + result.stdout + result.stderr)
            if '--test' in command:
                match = re.search(r'^# tests (\d+)$', result.stdout, re.M)
                require(match is not None and '# fail 0' in result.stdout, 'Missing successful TAP summary')
                count = int(match.group(1))
        require(count == 18, 'Unexpected test count')
        require((work / 'JOUER_PREDATOR_1987.html').read_bytes() == files['JOUER_PREDATOR_1987.html'],
                'Standalone is not reproducible from sources')
        validation = json.loads((work / 'VALIDATION.json').read_text())
        require(validation['counts']['tests'] == count, 'Validator test counter not repaired')
        require(all(validation['checks'].values()), 'Static validator check failure')
        return count, len(validation['checks'])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--archive-dir', type=Path)
    parser.add_argument('--check-only', action='store_true')
    args = parser.parse_args()
    acquired = [(row, acquire(row, args.archive_dir, args.check_only)) for row in ARCHIVES]
    versions = {row[0]: unpack(data) for row, data in acquired}
    original = versions['0.3.0']
    files = revised_pack(original)
    pngs = sorted(name for name in files if name.endswith('.png'))
    require(len(pngs) == 7, 'Seven original PNGs required')
    for name in pngs:
        data = files[name]
        require(data == original[name] and data.startswith(b'\x89PNG\r\n\x1a\n'), 'PNG bytes changed')
        require(struct.unpack('>II', data[16:24]) == (1280, 720), 'PNG size changed')
    data = json.loads(files['src/game-data.json'])
    require(data['version'] == '0.3.0' and len(data['locations']) == 36, 'Wrong content revision')
    require([len(c['chapters']) for c in data['campaigns']] == [16, 12], 'Campaign dimensions changed')
    count, static_count = run_tests(files)
    outputs = {f'v0.3.0/{name}': content for name, content in files.items()}
    archive_meta = []
    for row, content in acquired:
        version, name, size, digest, media = row
        outputs['archives/' + name] = content
        archive_meta.append(dict(version=version, filename=name, bytes=size, sha256=digest,
                                 source_url=HOST + media, original_files=len(versions[version])))
    outputs['archives/SHA256SUMS.txt'] = ''.join(
        row[3] + '  ' + row[1] + '\n' for row in ARCHIVES
    ).encode()
    inventory = dict(schema='predator-1987-import/1', base_commit=BASE,
        source_archives=archive_meta, active_version='0.3.0',
        files=[dict(path=name, bytes=len(content), sha256=sha(content), git_blob_sha1=git_blob(content))
               for name, content in sorted(outputs.items())],
        packaging_changes=['Normalize the ZIP-encoded canopee PNG filename without changing its bytes',
            'Correct stale README version and localStorage key; identify historical generator and validation',
            'Request TAP explicitly and read actual test count instead of the hardcoded 16',
            'Refresh 32 active-pack checksums; original archives stay byte-identical'],
        source_files_changed=[name for name in sorted(files) if files[name] != original[name]],
        no_new_gameplay=True, host_game_changed=False,
        historical_validation='v0.3.0/VALIDATION.json remains historical evidence')
    outputs['qa/IMPORT_INVENTORY.json'] = (json.dumps(inventory, ensure_ascii=False, indent=2) + '\n').encode()
    report = dict(schema='predator-1987-import-validation/1', status='PASS_IMPORT_STATIC_AND_UNIT_ONLY',
        archive_count=3, archive_crc_passed=3, original_files_per_archive=33,
        active_pack_files=33, png_count=7, png_dimensions=[1280,720], png_bytes_preserved=True,
        automated_tests=dict(passed=count, failed=0), static_validator_checks_passed=static_count,
        standalone_rebuild_byte_identical=True,
        standalone_sha256=sha(files['JOUER_PREDATOR_1987.html']),
        source_archive_hashes_verified=True, browser_test_performed=False,
        full_yautja_build_performed=False, canonical_visual_1_to_1_certified=False,
        native_host_integration_performed=False, new_content_since_v03=False,
        note='The seven PNGs are historical original previsualisations, not executable screenshots. '
             'All three original archives are preserved. No V0.4 was supplied or invented.')
    outputs['qa/IMPORT_VALIDATION.json'] = (json.dumps(report, ensure_ascii=False, indent=2) + '\n').encode()
    # Reject changed existing destinations before starting the first write.
    for name, content in outputs.items():
        target = ROOT / name
        if target.exists():
            require(target.is_file() and not target.is_symlink() and target.read_bytes() == content,
                    'Existing destination differs: ' + name)
    for name, content in sorted(outputs.items()):
        put(name, content, args.check_only)
    print(json.dumps(dict(status='VERIFIED' if args.check_only else 'IMPORTED', files=len(outputs),
                         archives=3, png=7, tests=count, static_checks=static_count)))


if __name__ == '__main__':
    main()
