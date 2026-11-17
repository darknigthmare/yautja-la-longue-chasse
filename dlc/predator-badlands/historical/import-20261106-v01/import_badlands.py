#!/usr/bin/env python3
"""Import the recovered Badlands archive without changing any source bytes.

Standard-library only. Rejects an unexpected archive, unsafe paths and collisions.
Node.js is required to execute the original data checks and syntax checks.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import struct
import subprocess
import zipfile
import zlib
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path, PurePosixPath
from urllib.parse import unquote, urlsplit
from xml.etree import ElementTree

EXPECTED_SHA256 = '65fba89f2148ee36cea58bafde3f93066f5a1883dea02f10dfef95350194b320'
ARCHIVE_NAME = 'ALIENS_TANTALUS_DLC_PREDATOR_BADLANDS_v0.1.0.zip'
SOURCE_ROOT = 'ALIENS_TANTALUS_DLC_PREDATOR_BADLANDS_v0.1.0'


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def write_preserved(path: Path, data: bytes) -> None:
    if path.exists():
        require(path.read_bytes() == data, f'Refusing to overwrite different bytes: {path}')
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)


class References(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.links: list[str] = []

    def handle_starttag(self, tag, attrs):
        for key, value in attrs:
            if key in ('src', 'href') and value:
                self.links.append(value)


def png_info(data: bytes) -> dict:
    require(data[:8] == b'\x89PNG\r\n\x1a\n', 'Invalid PNG signature')
    pos, size, ended, chunks = 8, None, False, 0
    image_data = bytearray()
    while pos < len(data):
        require(pos + 12 <= len(data), 'Truncated PNG chunk header')
        length = struct.unpack('>I', data[pos:pos + 4])[0]
        kind = data[pos + 4:pos + 8]
        payload = data[pos + 8:pos + 8 + length]
        require(pos + 12 + length <= len(data), 'Truncated PNG chunk body')
        expected = struct.unpack('>I', data[pos + 8 + length:pos + 12 + length])[0]
        require(zlib.crc32(kind + payload) & 0xffffffff == expected, 'PNG CRC mismatch')
        if kind == b'IHDR':
            require(length == 13, 'Invalid IHDR')
            size = struct.unpack('>II', payload[:8])
        elif kind == b'IDAT':
            image_data.extend(payload)
        elif kind == b'IEND':
            ended = True
        pos += 12 + length
        chunks += 1
        if ended:
            break
    require(ended and pos == len(data) and size is not None, 'Invalid PNG end')
    require(bool(zlib.decompress(image_data)), 'Empty PNG image data')
    require(size == (1440, 900), f'Unexpected historical screenshot size: {size}')
    return {'width': size[0], 'height': size[1], 'chunks': chunks, 'crc': 'PASS'}


def run(archive: Path, target: Path) -> dict:
    raw = archive.read_bytes()
    digest = hashlib.sha256(raw).hexdigest()
    require(digest == EXPECTED_SHA256, 'Unexpected archive SHA-256; import cancelled')
    target = target.resolve()
    version = target / 'v0.1.0'
    records, names = [], set()
    with zipfile.ZipFile(archive) as z:
        require(z.testzip() is None, 'Corrupted ZIP member')
        require(len(z.infolist()) == 43, 'Unexpected original member count')
        require(sum(i.file_size for i in z.infolist()) < 10_000_000, 'Unexpected extracted size')
        for info in z.infolist():
            p = PurePosixPath(info.filename)
            require(not info.is_dir() and not p.is_absolute(), 'Unexpected archive member')
            require(p.parts[0] == SOURCE_ROOT and len(p.parts) > 1, 'Unexpected archive root')
            require('..' not in p.parts and '\\' not in info.filename, 'Unsafe archive path')
            require((info.external_attr >> 16) & 0o170000 != 0o120000, 'Symlink rejected')
            relative = PurePosixPath(*p.parts[1:]).as_posix()
            require(relative not in names, 'Duplicate archive path')
            names.add(relative)
            data = z.read(info)
            out = version / relative
            require(out.resolve().is_relative_to(version.resolve()), 'Path escaped version folder')
            write_preserved(out, data)
            entry = {
                'path': f'v0.1.0/{relative}', 'bytes': len(data),
                'sha256': hashlib.sha256(data).hexdigest(),
                'gitBlobSha1': hashlib.sha1(f'blob {len(data)}\0'.encode() + data).hexdigest(),
                'unchangedFromSourceArchive': True,
            }
            if out.suffix == '.png':
                entry['image'] = {'format': 'PNG', **png_info(data), 'role': 'historical-browser-evidence'}
            elif out.suffix == '.svg':
                root = ElementTree.fromstring(data)
                require(root.tag == '{http://www.w3.org/2000/svg}svg', 'Invalid SVG root')
                entry['image'] = {'format': 'SVG', 'role': 'original-stylized-placeholder', 'xml': 'PASS'}
            records.append(entry)
    original_checks = 0
    for row in (version / 'SHA256SUMS.txt').read_text().splitlines():
        expected, relative = row.split('  ', 1)
        file = version / relative
        require(file.resolve().is_relative_to(version), 'Unsafe checksum path')
        require(hashlib.sha256(file.read_bytes()).hexdigest() == expected, f'Original checksum failed: {relative}')
        original_checks += 1
    require(original_checks == 42, 'Unexpected original checksum count')
    refs = 0
    for file in version.glob('*.html'):
        parser = References()
        parser.feed(file.read_text())
        for link in parser.links:
            parsed = urlsplit(link)
            if parsed.scheme or parsed.netloc or not parsed.path:
                continue
            path = (file.parent / unquote(parsed.path)).resolve()
            require(path.is_relative_to(version), f'Local reference escaped DLC: {link}')
            require(path.is_file(), f'Missing local reference: {file.name}: {link}')
            refs += 1
    for file in sorted((version / 'src').glob('*.js')):
        subprocess.run(['node', '--check', str(file)], check=True, capture_output=True, text=True)
    result = subprocess.run(['node', str(version / 'tests/test_badlands.mjs')], check=True, capture_output=True, text=True)
    checks = int(re.search(r'^TOTAL (\d+)$', result.stdout, re.MULTILINE).group(1))
    require(checks == 198, 'Unexpected data-check count')
    standalone = (version / 'JOUER_PREDATOR_BADLANDS_STANDALONE.html').read_text()
    for name in ('badlands-data.js', 'badlands-game.js'):
        require((version / 'src' / name).read_text() in standalone, f'Standalone source diverged: {name}')
    images = [r for r in records if 'image' in r]
    require(len(images) == 25, 'Unexpected image count')
    write_preserved(target / 'releases' / ARCHIVE_NAME, raw)
    (target / 'qa').mkdir(exist_ok=True)
    (target / 'qa' / 'data-checks.log').write_text(result.stdout)
    report = {
        'generatedAt': datetime.now(timezone.utc).isoformat(),
        'scope': 'archive-import-integrity-and-data-validation',
        'status': 'PASS', 'sourceArchiveSha256': digest,
        'originalFiles': len(records), 'originalChecksumsPassed': original_checks,
        'originalImages': len(images), 'svg': 18, 'png': 7,
        'localHtmlReferencesChecked': refs, 'javascriptSyntaxChecks': 2,
        'standaloneMatchesSeparateSources': True, 'dataChecksPassed': checks,
        'browserGameplayRerun': False,
        'historicalBrowserEvidence': 'v0.1.0/tests/browser-smoke.json and v0.1.0/screenshots/ retained unchanged; not re-certified by this import',
        'visualOneToOneValidated': False, 'nativeYautjaMenuIntegration': False,
    }
    manifest = {
        'schemaVersion': 1, 'dlcId': 'predator-badlands', 'importedVersion': '0.1.0',
        'destinationRepository': 'darknigthmare/yautja-la-longue-chasse',
        'mode': 'preserved-standalone-delivery',
        'sourceArchive': {'path': f'releases/{ARCHIVE_NAME}', 'sha256': digest, 'bytes': len(raw)},
        'entry': 'v0.1.0/JOUER_PREDATOR_BADLANDS_STANDALONE.html',
        'campaigns': [{'id': 'weyland', 'scenes': 16}, {'id': 'predator', 'scenes': 30}],
        'unrecoveredVersions': [{'version': '0.2.0', 'status': 'previously-announced-files-not-recoverable-in-this-session', 'included': False}],
        'sourceFiles': sorted(records, key=lambda r: r['path']),
        'assetStatus': '18 original placeholder SVGs; 7 historical PNG screenshots; no new generated art',
        'runtimeIntegration': 'No main-game code, save schema or menu modified; Tantalus-specific installers preserved but not executed on Yautja',
    }
    (target / 'IMPORT_MANIFEST.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    (target / 'qa' / 'import-validation.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    (target / 'README.md').write_text('''# DLC — Predator: Badlands\n\nImport des livrables récupérés de cette conversation dans **Yautja — La Longue Chasse**.\n\n## Contenu effectivement préservé\n\n- **43 fichiers originaux v0.1.0**, sans changement de contenu, dans `v0.1.0/`.\n- **25 images d’origine** : 18 SVG dans `v0.1.0/assets/svg/`, et 7 captures PNG 1440 × 900 dans `v0.1.0/screenshots/`. Aucun lien externe ne remplace ces images.\n- Sources JavaScript, CSS, lanceurs séparé et autonome, codex HTML/Markdown, sources documentaires, manifestes, installateur/désinstallateur Tantalus, tests et rapport visuel historique.\n- Archive ZIP d’origine dans `releases/`, avec son SHA-256 vérifié.\n- Inventaire complet avec tailles, SHA-256 et identifiants Git de chaque fichier : `IMPORT_MANIFEST.json`.\n\n## Jouer\n\nOuvrir [le lanceur autonome](v0.1.0/JOUER_PREDATOR_BADLANDS_STANDALONE.html) après téléchargement du dossier, ou servir ce dossier avec un serveur statique. GitHub affiche le code HTML, pas une session de jeu.\n\n[Rapport visuel historique](v0.1.0/RAPPORT_VISUEL_BADLANDS.html) · [Codex](v0.1.0/CODEX_BADLANDS.md) · [Archive complète](releases/ALIENS_TANTALUS_DLC_PREDATOR_BADLANDS_v0.1.0.zip).\n\nLa première campagne fournie représente Weyland-Yutani via ses synthétiques (16 scènes), la seconde Dek (30 scènes).\n\n## Portée et limites\n\nCette PR **archive un DLC autonome** ; elle ne raccorde pas encore ces campagnes aux menus, sauvegardes ou systèmes natifs de Yautja. Les intitulés et métadonnées Tantalus sont ceux des livrables d’origine et sont conservés. Les installateurs Tantalus ne doivent pas être lancés sur le dépôt Yautja.\n\nLa **v0.2.0 annoncée précédemment n’a pas pu être récupérée** dans cette session : elle n’est pas incluse et aucun fichier v0.1 n’a été rebaptisé v0.2.\n\nLes SVG restent des **placeholders stylisés**, pas des sprites validés en fidélité visuelle 1:1. L’import ne revalide pas les affirmations de lore des documents historiques. Les captures et résultats navigateur du dossier versionné sont des preuves historiques ; les contrôles réellement rejoués pour cet import sont consignés séparément dans `qa/import-validation.json`.\n\n## Vérification\n\n```sh\nnode dlc/predator-badlands/v0.1.0/tests/test_badlands.mjs\ncd dlc/predator-badlands/v0.1.0 && sha256sum -c SHA256SUMS.txt\n```\n\nDepuis la racine du dépôt, pour reproduire l’import et les contrôles (Python 3.9+ et Node.js ; aucune dépendance Python externe) :\n\n```sh\npython3 dlc/predator-badlands/tools/import_badlands.py \\\n  --archive dlc/predator-badlands/releases/ALIENS_TANTALUS_DLC_PREDATOR_BADLANDS_v0.1.0.zip \\\n  --target dlc/predator-badlands\n```\n\nLes fichiers d’origine existants doivent être identiques, sinon l’outil refuse de les écraser. Il contrôle l’archive, les 42 empreintes historiques, les 43 fichiers, les 25 images, les références HTML locales, la syntaxe JavaScript, la correspondance du standalone et les 198 assertions de données.\n''')
    return report


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--archive', required=True, type=Path)
    parser.add_argument('--target', required=True, type=Path)
    args = parser.parse_args()
    print(json.dumps(run(args.archive, args.target), ensure_ascii=False, indent=2))
