#!/usr/bin/env python3
"""Independent read-only Pillow audit of source-qualified lots40 C pixels."""
from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path
import platform
import sys
from typing import Any
from datetime import datetime, timezone
import PIL
from PIL import Image
sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[3]
METHOD_ID = 'srgb8-rec709-luma-v1'
PROTECTION_SHA = 'af284f8cd09d91e59e648e43039725288fdfed8ed231ccbae17f5f35ecdfce66'
APPROVALS = {'canonCertified','canonicalCertified','canonicalFidelityCertified','humanArtValidated','runtimeIntegrated','animated','allP0Closed','canonicalRequirementClosed'}

def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def json_read(path: Path) -> dict[str, Any]:
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ValueError(f"Expected a JSON object: {path}")
    return data


def repository_path(root: Path, relative: str) -> Path:
    """Asset metadata must name actual repository-relative files."""
    if not isinstance(relative, str) or not relative:
        raise ValueError("Missing repository-relative path")
    path = Path(relative)
    if path.is_absolute() or ".." in path.parts:
        raise ValueError(f"Non-repository asset path: {relative}")
    resolved = (root / path).resolve()
    if not resolved.is_relative_to(root):
        raise ValueError(f"Asset path leaves repository: {relative}")
    return resolved


def input_path(root: Path, value: str) -> Path:
    path = Path(value)
    return path.resolve() if path.is_absolute() else repository_path(root, value)


def pin(path: Path, display_path: str | None = None) -> dict[str, Any]:
    raw = path.read_bytes()
    return {"path": display_path or str(path), "sha256": digest(raw), "bytes": len(raw)}


def native_png_size(header: bytes) -> tuple[int, int]:
    """Require the actual PNG representation, independently of Pillow's mode."""
    if len(header) < 33 or header[:8] != b"\x89PNG\r\n\x1a\n" or header[8:16] != b"\x00\x00\x00\rIHDR":
        raise ValueError("Expected a native PNG IHDR header")
    # Pillow's mode alone does not establish native bit depth: a16-bit PNG may
    # otherwise be reduced silently by its decoder before our comparison.
    if header[24] != 8 or header[25] != 6:
        raise ValueError("Expected native8-bit RGBA PNG (IHDR depth8/type6)")
    return (int.from_bytes(header[16:20], "big"), int.from_bytes(header[20:24], "big"))


def rgba_read(path: Path) -> tuple[bytes, tuple[int, int]]:
    """Decode existing RGBA pixels. No conversion, image mutation or save call."""
    with path.open("rb") as stream:
        native_size = native_png_size(stream.read(33))
    if min(native_size) <= 0 or native_size[0] * native_size[1] > 16777216:
        raise ValueError('Native A/B/C PNG exceeds16MP before pixel decode')
    with Image.open(path) as image:
        if image.format != "PNG" or image.mode != "RGBA":
            raise ValueError(f"Expected a native RGBA PNG, got {image.format}/{image.mode}: {path}")
        if getattr(image, "n_frames", 1) != 1 or getattr(image, "is_animated", False):
            raise ValueError(f"Expected a single static PNG frame: {path}")
        if image.size != native_size:
            raise ValueError(f"Decoded dimensions differ from native PNG IHDR: {path}")
        image.load()
        return image.tobytes(), image.size


def mismatch_count(left: bytes, right: bytes) -> int:
    return sum(a != b for a, b in zip(left, right))


def verify_rgba_pixels(source: bytes, output: bytes, size: tuple[int, int]) -> dict[str, Any]:
    """Pure byte-buffer analysis; independent integer arithmetic for every pixel."""
    width, height = size
    expected_length = width * height * 4
    if width <= 0 or height <= 0 or len(source) != expected_length or len(output) != expected_length:
        raise ValueError("RGBA byte lengths do not match the declared dimensions")

    sr, sg, sb, sa = (source[offset::4] for offset in range(4))
    cr, cg, cb, ca = (output[offset::4] for offset in range(4))
    expected = bytes((2126 * r + 7152 * g + 722 * b + 5000) // 10000 for r, g, b in zip(sr, sg, sb))
    alpha_equal = sa == ca
    strict_monochrome = cr == cg == cb
    matches = [cr == expected, cg == expected, cb == expected]
    formula_equal = all(matches)
    all_pixels_pass = alpha_equal and strict_monochrome and formula_equal

    # Fast byte equality is sufficient in the passing case. Count individual
    # mismatches only on failures so a full66-image audit remains inexpensive.
    errors_by_channel = {
        name: 0 if match else mismatch_count(channel, expected)
        for name, channel, match in zip(("R", "G", "B"), (cr, cg, cb), matches)
    }
    alpha_mismatches = 0 if alpha_equal else mismatch_count(sa, ca)
    bad_formula_pixels = 0
    bad_monochrome_pixels = 0
    coverage_lost = 0
    coverage_gained = 0
    first_mismatches = []
    max_rgb_error = 0
    if not all_pixels_pass:
        for index, (wanted, r, g, b, source_alpha, result_alpha) in enumerate(zip(expected, cr, cg, cb, sa, ca)):
            bad_formula = (r, g, b) != (wanted, wanted, wanted)
            bad_monochrome = r != g or g != b
            bad_alpha = source_alpha != result_alpha
            bad_formula_pixels += bad_formula
            bad_monochrome_pixels += bad_monochrome
            coverage_lost += source_alpha > 0 and result_alpha == 0
            coverage_gained += source_alpha == 0 and result_alpha > 0
            max_rgb_error = max(max_rgb_error, abs(r - wanted), abs(g - wanted), abs(b - wanted))
            if (bad_formula or bad_alpha) and len(first_mismatches) < 8:
                first_mismatches.append({
                    "x": index % width,
                    "y": index // width,
                    "sourceRGBA": [sr[index], sg[index], sb[index], source_alpha],
                    "expectedRGBA": [wanted, wanted, wanted, source_alpha],
                    "actualRGBA": [r, g, b, result_alpha],
                })

    source_nonzero = len(sa) - sa.count(0)
    output_nonzero = len(ca) - ca.count(0)
    return {
        "passed": all_pixels_pass,
        "pixelsCompared": width * height,
        "comparedTransparentRgb": True,
        "formulaMatchesEveryPixel": formula_equal,
        "formulaMismatchPixels": bad_formula_pixels,
        "formulaMismatchChannels": errors_by_channel,
        "maximumRgbAbsoluteError": max_rgb_error,
        "strictMonochromeEveryPixel": strict_monochrome,
        "nonMonochromePixels": bad_monochrome_pixels,
        "alphaByteIdentical": alpha_equal,
        "alphaMismatchPixels": alpha_mismatches,
        "sourceAlphaSha256": digest(sa),
        "outputAlphaSha256": digest(ca),
        "sourceNonzeroAlphaPixels": source_nonzero,
        "outputNonzeroAlphaPixels": output_nonzero,
        "geometryCoverageIdentical": alpha_equal,
        "geometryPixelsLost": coverage_lost,
        "geometryPixelsGained": coverage_gained,
        "sourceWasStrictlyAchromatic": sr == sg == sb,
        "outputGrayRange": [min(cr), max(cr)],
        "firstMismatches": first_mismatches,
    }


def no_approval(value):
    if isinstance(value, dict):
        for key, child in value.items():
            if key in APPROVALS and child is not False:
                raise ValueError('Automatic approval forbidden: ' + key)
            no_approval(child)
    elif isinstance(value, list):
        for child in value:
            no_approval(child)


def indexed(rows, label):
    result = {}
    for row in rows:
        identity = row['id']
        if identity in result:
            raise ValueError('Duplicate identity in ' + label)
        result[identity] = row
    return result


def verify_manifest(root: Path, manifest_path: Path, inventory_path: Path, accepted_path: Path,
                    candidate_path: Path, record_ids: set[str] | None = None) -> dict[str, Any]:
    """CLI always scans every C; a subset API exists only for isolated negatives."""
    snapshot = root / 'production/biomasks-lots40-20261113/suivi/source-protection.json'
    if digest(snapshot.read_bytes()) != PROTECTION_SHA:
        raise ValueError('Frozen870 historical source-protection snapshot changed')
    manifest, inventory, accepted, candidates = map(json_read, (manifest_path, inventory_path, accepted_path, candidate_path))
    for data in (manifest, inventory, accepted, candidates):
        no_approval(data)
    pairs = indexed(manifest['pairs'], 'manifest')
    prepared = indexed(inventory['entries'], 'production inventory')
    a_rows = indexed(accepted['originalGenerations'], 'accepted A')
    b_rows = indexed(accepted['entries'], 'accepted B')
    source_candidates = indexed(candidates['candidates'], 'candidate inventory')
    issues = []
    if not (set(pairs) == set(prepared) == set(a_rows) == set(b_rows)) or not pairs:
        issues.append('Manifest/inventory/accepted must cover exactly the same nonempty A/B/C identities')
    if set(pairs) - set(source_candidates):
        issues.append('Unregistered source candidate')
    expected_accepted = inventory.get('acceptedNewMasks', {})
    if expected_accepted.get('sha256') != digest(accepted_path.read_bytes()) or expected_accepted.get('path') != accepted_path.relative_to(root).as_posix():
        issues.append('Production inventory acceptance pin differs')
    candidate_pointer = inventory.get('candidateInventory', {})
    if candidate_pointer.get('sha256') != digest(candidate_path.read_bytes()):
        issues.append('Production inventory candidate pin differs')
    pointer = manifest.get('sourceInventory', {})
    if pointer.get('path') != inventory_path.relative_to(root).as_posix() or pointer.get('sha256') != digest(inventory_path.read_bytes()):
        issues.append('Manifest production inventory pin differs')
    for flag in ('canonCertified', 'humanArtValidated', 'runtimeIntegrated'):
        if manifest.get(flag) is not False:
            issues.append('Top-level approval flag must remain false: ' + flag)
    selection = set(pairs) if record_ids is None else set(record_ids)
    if not selection or not selection.issubset(pairs):
        raise ValueError('Record subset must contain only existing identities')
    entries = []
    cache = {}

    def check_pin(asset, errors, role):
        relative = asset['path'];path = repository_path(root, relative)
        if relative not in cache:
            cache[relative] = pin(path, relative)
        actual = cache[relative]
        if asset.get('sha256') != actual['sha256'] or ('bytes' in asset and asset['bytes'] != actual['bytes']):
            errors.append(role + ' source bytes differ from pin')
        return actual

    def require(condition, message, errors):
        if not condition:errors.append(message)

    for identity in sorted(selection):
        errors = [];item = {'id': identity, 'errors': errors, 'passed': False};entries.append(item)
        try:
            pair, candidate, planned = pairs[identity], source_candidates[identity], prepared[identity]
            a, b, c = pair['versionA'], pair['versionB'], pair['versionC']
            source_status = candidate['sourceStatus']
            require(pair['sourceStatus'] == planned['sourceStatus'] == source_status, 'Inherited candidate qualification changed', errors)
            require(candidate['status'] in {'qualified', 'produced', 'provisional'} and not candidate.get('duplicateOf') and not candidate.get('aliasOf'), 'Blocked/duplicate/alias cannot become a produced design', errors)
            require(pair['domain'] == candidate['domain'] and pair['domain'] in {'films', 'games', 'comics-novels', 'licensed'}, 'Candidate domain changed', errors)
            authoritative_r = {(r['path'], r['sha256']) for r in candidate['referenceSources']}
            require(bool(authoritative_r), 'A visual source is required; prose does not establish a mask design', errors)
            for reference in candidate['referenceSources']:
                check_pin(reference, errors, 'R')
            for version, asset, row in [('A', a, a_rows[identity]), ('B', b, b_rows[identity])]:
                require(asset['path'] == row['assetPath'] and asset['sha256'] == row['sha256'], version + ' differs from explicit accepted source', errors)
                check_pin(asset, errors, version)
                if isinstance(asset.get('generationReceipt'), dict):
                    check_pin(asset['generationReceipt'], errors, version + ' receipt')
                receipt_path = repository_path(root, row['generationReceipt'])
                receipt_matches = [r for r in json_read(receipt_path)['entries'] if r.get('id') == identity and r.get('version') == version]
                require(len(receipt_matches) == 1, version + ' receipt identity/version missing', errors)
                if len(receipt_matches) == 1:
                    receipt = receipt_matches[0]
                    no_approval(receipt)
                    for key in ('version', 'assetPath', 'sha256', 'bytes', 'nativeSourcePath', 'nativeDimensions', 'renderMode', 'generatedNew'):
                        require(receipt.get(key) == row.get(key), version + ' receipt provenance differs: ' + key, errors)
                    require({(r['path'], r['sha256']) for r in receipt.get('referenceSources', [])} == authoritative_r, version + ' receipt R lineage differs', errors)
                    if version == 'A':
                        require(receipt.get('referenceSourcePath') == row.get('referenceSourcePath') and receipt.get('referenceSourceSha256') == row.get('referenceSourceSha256'), 'A receipt primary R lineage differs', errors)
                        require((receipt.get('referenceSourcePath'), receipt.get('referenceSourceSha256')) in authoritative_r, 'A receipt primary R missing from qualified sources', errors)
                    else:
                        require(receipt.get('sourceAPath') == a['path'] and receipt.get('sourceASha256') == a['sha256'], 'B receipt A lineage differs', errors)
                require(row.get('version') == version and row.get('renderMode') == 'imagegen' and row.get('generatedNew') is True, version + ' must remain a declared new ImageGen study', errors)
                require({(r['path'], r['sha256']) for r in row['referenceSources']} == authoritative_r, version + ' R lineage differs', errors)
            require(b_rows[identity].get('sourceAPath') == a['path'] and b_rows[identity].get('sourceASha256') == a['sha256'], 'B must retain its exact accepted A lineage', errors)
            require((a_rows[identity].get('referenceSourcePath'), a_rows[identity].get('referenceSourceSha256')) in authoritative_r, 'A primary R missing from candidate references', errors)
            require(planned['sourceB']['path'] == b['path'] and planned['sourceB']['sha256'] == b['sha256'], 'C production inventory B lineage differs', errors)
            require(planned['sourceA']['path'] == a['path'] and planned['sourceA']['sha256'] == a['sha256'], 'C production inventory A lineage differs', errors)
            require(c['path'] == 'public/game/biomasks-lots40-20261113/neutral/' + identity + '.png', 'Unexpected C output path', errors)
            require(c.get('sourceBPath') == b['path'] and c.get('sourceBSha256') == b['sha256'], 'C sourceB lineage differs', errors)
            source_actual = check_pin(b, errors, 'B');output_actual = check_pin(c, errors, 'C')
            require(c.get('methodId') == METHOD_ID, 'C method differs', errors)
            for flag, wanted in [('alphaByteIdentical', True), ('strictMonochrome', True), ('newImageGeneration', False), ('generatedNew', False), ('sourceFileMutation', False)]:
                require(c.get(flag) is wanted, 'C verification metadata differs: ' + flag, errors)
            for flag in ('canonCertified', 'humanArtValidated', 'runtimeIntegrated'):
                require(pair.get(flag) is False and c.get(flag) is False, 'C and pair validation flags must remain false', errors)
            for key in ('representationOf', 'revisesPair', 'newCanonicalGeometry', 'sourceLimited', 'maskFamily', 'editionStudy', 'sharedGeometryStudy', 'representationKind'):
                if key in candidate:
                    require(pair.get(key) == candidate[key], 'Revision qualification changed: ' + key, errors)
            if candidate.get('representationOf') == 'predator_17':
                require(candidate.get('newCanonicalGeometry') is False and source_status.get('provisionalReviewOnly') is True, 'Vapor revision must not close its inherited provisional source qualification', errors)
            source_rgba, source_size = rgba_read(repository_path(root, b['path']))
            output_rgba, output_size = rgba_read(repository_path(root, c['path']))
            require(source_size == output_size, 'C changed native dimensions', errors)
            if source_size != output_size:raise ValueError('Cannot compare differing native frames')
            for role, asset in [('B', b), ('C', c)]:
                require([asset.get('width'), asset.get('height')] == list(source_size), role + ' dimension metadata differs', errors)
            checks = verify_rgba_pixels(source_rgba, output_rgba, source_size)
            reused = checks['sourceWasStrictlyAchromatic']
            require(c.get('renderMode') == ('source-reuse' if reused else 'deterministic-grayscale'), 'C renderMode differs from real source chroma', errors)
            require(c.get('derivedNew') is (not reused) and c.get('pixelEditingPerformed') is (not reused), 'C derivation flags differ', errors)
            if reused:require(output_actual['sha256'] == source_actual['sha256'], 'Achromatic reuse must retain exact encoded source bytes', errors)
            require(c.get('sourceAlphaSha256') == checks['sourceAlphaSha256'] and c.get('outputAlphaSha256') == checks['outputAlphaSha256'], 'C alpha SHA metadata differs', errors)
            require(checks['passed'], 'Independent C formula/monochrome/alpha check failed', errors)
            require(digest(repository_path(root, b['path']).read_bytes()) == source_actual['sha256'], 'B changed during verification', errors)
            item.update(sourceB=source_actual, neutralC=output_actual, dimensions=list(source_size), sourceStatus=source_status, pixelChecks=checks)
        except (OSError, ValueError, KeyError, TypeError) as error:
            errors.append(type(error).__name__ + ': ' + str(error))
        item['passed'] = not errors
    return {'schemaVersion': 1, 'asOfUtc': datetime.now(timezone.utc).isoformat(),
            'allChecksPassed': not issues and all(e['passed'] for e in entries),
            'verification': 'independent-python-pillow-every-pixel', 'fullProductionVerification': record_ids is None,
            'partialVerifiedOnly': record_ids is not None, 'manifest': pin(manifest_path),
            'counts': {'expectedRepresentations': len(pairs), 'verifiedRepresentations': len(entries),
                       'failedRepresentations': sum(not e['passed'] for e in entries),
                       'pixelsCompared': sum(e.get('pixelChecks', {}).get('pixelsCompared', 0) for e in entries)},
            'verifier': {'python': platform.python_version(), 'pillow': PIL.__version__, 'methodId': METHOD_ID,
                         'importsConverterImplementation': False, 'writesImages': False},
            'issues': issues, 'entries': entries, 'imagesWritten': 0, 'pixelsModifiedByVerifier': False,
            'canonCertified': False, 'humanArtValidated': False, 'runtimeIntegrated': False}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--manifest', default='public/game/biomasks-lots40-20261113/manifest.json')
    parser.add_argument('--inventory', default='production/biomasks-lots40-20261113/inputs/production-inventory.json')
    parser.add_argument('--accepted-new-masks', default='production/biomasks-lots40-20261113/inputs/accepted-new-masks.json')
    parser.add_argument('--candidates', default='production/biomasks-lots40-20261113/inputs/candidate-inventory.json')
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    report = verify_manifest(ROOT, *(input_path(ROOT, v) for v in (args.manifest, args.inventory, args.accepted_new_masks, args.candidates)))
    output = Path(args.output).resolve();output.parent.mkdir(parents=True, exist_ok=True)
    if output.is_relative_to(ROOT) and not output.is_relative_to(ROOT / 'production/biomasks-lots40-20261113/qa'):
        raise ValueError('Report output must stay outside repository or under new QA only')
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'passed': report['allChecksPassed'], 'counts': report['counts'], 'output': str(output)}))
    return 0 if report['allChecksPassed'] else 1


if __name__ == '__main__':
    try:raise SystemExit(main())
    except Exception as error:
        print('::error::' + (type(error).__name__ + ': ' + str(error)).replace('%', '%25').replace('\r', '%0D').replace('\n', '%0A'), file=sys.stderr)
        raise
