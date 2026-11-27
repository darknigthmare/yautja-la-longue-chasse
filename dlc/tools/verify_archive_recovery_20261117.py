#!/usr/bin/env python3
"""Read-only verification of the three archived DLC deliveries recovered in November.

No installers, builders or historical test runners are executed. Pillow is used
to decode PNG pixels; no package is downloaded or installed by this command.
"""

from pathlib import Path, PurePosixPath
import argparse
import collections
import datetime
import hashlib
import json
import sys
import xml.etree.ElementTree as ET
import zipfile

try:
    from PIL import Image
except ImportError:
    raise SystemExit('PNG verification requires Pillow in the Python environment.')


REPOSITORY = Path(__file__).resolve().parents[2]
INVENTORIES = {
    'avp-2004-predator': 'dlc/avp-2004-predator/qa/IMPORT_INVENTORY_20261117.json',
    'avpr-wolf': 'dlc/avpr-wolf/qa/IMPORT_INVENTORY_20261117.json',
    'predator-badlands': 'dlc/predator-badlands/qa/RECOVERY_INVENTORY_20261117.json',
}


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def git_blob_sha(data):
    return hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest()


def safe_path(relative):
    parts = PurePosixPath(relative)
    if parts.is_absolute() or '..' in parts.parts or not parts.parts or parts.parts[0] != 'dlc':
        raise ValueError(f'Unsafe inventory path: {relative!r}')
    path = REPOSITORY.joinpath(*parts.parts)
    if path.is_symlink() or not path.resolve().is_relative_to(REPOSITORY / 'dlc'):
        raise ValueError(f'Inventory path leaves DLC tree: {relative!r}')
    return path


def check_digest_entry(relative, expected, issues):
    path = safe_path(relative)
    if not path.is_file():
        issues.append({'path': relative, 'error': 'missing-file'})
        return False
    data = path.read_bytes()
    actual = {'bytes': len(data), 'sha256': sha256(data), 'gitBlobSha': git_blob_sha(data)}
    mismatch = {key: {'expected': expected[key], 'actual': actual[key]} for key in actual if key in expected and actual[key] != expected[key]}
    if mismatch:
        issues.append({'path': relative, 'error': 'content-mismatch', 'mismatch': mismatch})
    return not mismatch


def verify_historical_checksums(pack, inventory):
    root = REPOSITORY / 'dlc' / pack
    sources = []
    if pack == 'avp-2004-predator':
        file = root / 'v0.5.0/MANIFEST.json'
        manifest = json.loads(file.read_text(encoding='utf-8-sig'))
        sources.append((file, [(f['path'], {'sha256': f['sha256'], 'bytes': f['size']}) for f in manifest['files']], {}))
    elif pack == 'avpr-wolf':
        file = root / 'v0.7.0-candidate.1/integrity.json'
        manifest = json.loads(file.read_text(encoding='utf-8-sig'))
        sources.append((file, list(manifest['files'].items()), {}))
    else:
        for file in (root / 'PACKAGE_SHA256SUMS.txt', root / 'v0.1.0/SHA256SUMS.txt'):
            records = []
            for line in file.read_text(encoding='utf-8-sig').splitlines():
                if not line.strip() or line.startswith('#'):
                    continue
                digest, relative = line.split(None, 1)
                records.append((relative.lstrip('*'), {'sha256': digest}))
            relocation = {'IMPORT_STATUS.json': 'historical/import-package-20261106/IMPORT_STATUS.json'} if file.name == 'PACKAGE_SHA256SUMS.txt' else {}
            sources.append((file, records, relocation))
    result = []
    for file, records, relocation in sources:
        errors = []
        seen = set()
        for relative, expected in records:
            if relative in seen:
                errors.append({'path': relative, 'error': 'duplicate-checksum-entry'})
            seen.add(relative)
            parts = PurePosixPath(relative)
            if parts.is_absolute() or '..' in parts.parts:
                errors.append({'path': relative, 'error': 'unsafe-checksum-entry'})
                continue
            destination = file.parent / relocation.get(relative, relative)
            check_digest_entry(destination.relative_to(REPOSITORY).as_posix(), expected, errors)
        result.append({
            'manifest': file.relative_to(REPOSITORY).as_posix(),
            'checkedEntries': len(records), 'matchedEntries': len(records) - len(errors),
            'explicitPathRelocations': relocation,
            'status': 'PASS' if not errors else 'HISTORICAL_MANIFEST_MISMATCH',
            'issues': errors,
        })
    return result


def verify_pack(pack):
    inventory_path = INVENTORIES[pack]
    inventory = json.loads(safe_path(inventory_path).read_text(encoding='utf-8-sig'))
    issues = []
    files = inventory['files']
    paths = [f['path'] for f in files]
    if len(files) != inventory['fileCount'] or len(set(paths)) != len(paths):
        issues.append({'error': 'inventory-count-or-duplicate-path'})
    pngs = []
    json_count = 0
    svg_count = 0
    zips = []
    total_bytes = 0
    successful_hashes = 0
    for record in files:
        relative = record['path']
        try:
            path = safe_path(relative)
            if not check_digest_entry(relative, record, issues):
                continue
            successful_hashes += 1
            total_bytes += path.stat().st_size
            suffix = path.suffix.lower()
            if suffix == '.json':
                json.loads(path.read_text(encoding='utf-8-sig'))
                json_count += 1
            elif suffix == '.png':
                with Image.open(path) as img:
                    img.verify()
                with Image.open(path) as img:
                    img.load()
                    if img.format != 'PNG' or not all(img.size):
                        raise ValueError('Not a nonempty PNG')
                    rgba = img.convert('RGBA')
                    pngs.append({'path': relative, 'width': img.width, 'height': img.height, 'mode': img.mode, 'rgbaSha256': sha256(rgba.tobytes())})
            elif suffix == '.svg':
                document = ET.fromstring(path.read_bytes())
                if document.tag.rsplit('}', 1)[-1] != 'svg':
                    raise ValueError('SVG root element missing')
                svg_count += 1
            elif suffix in ('.zip', '.xlsx'):
                with zipfile.ZipFile(path) as archive:
                    bad = archive.testzip()
                    if bad is not None:
                        raise ValueError(f'Archive CRC failure in {bad}')
                    zips.append({'path': relative, 'entries': len(archive.infolist()), 'crc': 'PASS'})
        except (OSError, ValueError, SyntaxError, ET.ParseError, zipfile.BadZipFile) as exc:
            issues.append({'path': relative, 'error': type(exc).__name__, 'detail': str(exc)})
    for entry in inventory['entryPoints']:
        if entry not in paths or not safe_path(entry).is_file():
            issues.append({'path': entry, 'error': 'declared-entrypoint-missing'})
    preserved = 0
    for record in inventory.get('baselineFiles', []):
        if record['path'] == inventory.get('allowedBaselineChange'):
            continue
        if check_digest_entry(record['path'], record, issues):
            preserved += 1
    checksum_results = verify_historical_checksums(pack, inventory)
    historical_issues = [i for c in checksum_results for i in c['issues']]
    if pack == 'predator-badlands':
        current = json.loads((REPOSITORY / 'dlc/predator-badlands/IMPORT_STATUS.json').read_text())
        if current.get('missingPackageFileCount') != 0 or current.get('nativeYautjaIntegration') is not False:
            issues.append({'error': 'current-badlands-status-disagrees-with-recovery-scope'})
        before = current['history'][0]
        original_status = next(f for f in inventory['baselineFiles'] if f['path'] == inventory['allowedBaselineChange'])
        if before['sha256'] != original_status['sha256'] or before['gitBlobSha'] != original_status['gitBlobSha']:
            issues.append({'error': 'badlands-prior-status-provenance-mismatch'})
    return {
        'pack': pack, 'inventory': inventory_path,
        'status': 'PASS' if not issues and not historical_issues else 'FAIL',
        'scope': 'Byte preservation, archive structure, image decode and recorded checksums; no gameplay or artistic approval.',
        'auditedBaseCommit': inventory['auditedBaseCommit'],
        'files': len(files), 'hashMatches': successful_hashes, 'bytes': total_bytes,
        'uniqueFileSha256': len({f['sha256'] for f in files}),
        'jsonParsed': json_count, 'pngDecoded': len(pngs), 'svgParsed': svg_count,
        'pngDetails': pngs, 'archivesChecked': zips,
        'preservedBaselineFilesChecked': preserved,
        'historicalChecksumManifests': checksum_results,
        'issues': issues,
        'notPerformed': ['historical-runtime-tests', 'installers', 'rebuilding-historical-artifacts', 'browser-playthrough', 'Next-build', 'native-Yautja-integration', 'human-artistic-review', 'one-to-one-fidelity-certification'],
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--pack', choices=list(INVENTORIES))
    args = parser.parse_args()
    results = [verify_pack(pack) for pack in ([args.pack] if args.pack else INVENTORIES)]
    output = {
        'schemaVersion': 1,
        'performedAtUtc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'readOnly': True,
        'status': 'PASS' if all(r['status'] == 'PASS' for r in results) else 'FAIL',
        'results': results,
    }
    print(json.dumps(output, ensure_ascii=False, indent=2))
    return 0 if output['status'] == 'PASS' else 1


if __name__ == '__main__':
    sys.exit(main())
