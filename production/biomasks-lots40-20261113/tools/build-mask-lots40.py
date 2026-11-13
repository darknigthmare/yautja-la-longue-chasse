#!/usr/bin/env python3
"""Build source-qualified A/B/C batches without editing any source raster."""
from __future__ import annotations
import argparse
from copy import deepcopy
import hashlib
import importlib.util
from io import BytesIO
import json
from pathlib import Path
import re
import shutil
import sys
from xml.etree import ElementTree as ET
from zipfile import ZipFile
from PIL import Image

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[3]
PACK = ROOT / 'production/biomasks-lots40-20261113'
PUBLIC = ROOT / 'public/game/biomasks-lots40-20261113'
INPUTS, FOLLOW = PACK / 'inputs', PACK / 'suivi'
BASE = '2b96849482b3b16f1fe3c2040ea23a254bc4f897'
PROTECTION_SHA = 'af284f8cd09d91e59e648e43039725288fdfed8ed231ccbae17f5f35ecdfce66'
METHOD = 'srgb8-rec709-luma-v1'
DOMAINS = ('films', 'games', 'comics-novels', 'licensed')
ELIGIBLE = {'qualified', 'produced', 'provisional'}
APPROVALS = {'canonCertified', 'canonicalCertified', 'canonicalFidelityCertified', 'humanArtValidated',
             'runtimeIntegrated', 'animated', 'allP0Closed', 'canonicalRequirementClosed'}
NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'


def encoded(value):
    return (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode()


def load(path):
    return json.loads(path.read_bytes())


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def relative(path):
    return path.resolve().relative_to(ROOT).as_posix()


def file(value):
    if not isinstance(value, str) or not value or '\\' in value or any(ord(c) < 32 or ord(c) == 127 for c in value):
        raise ValueError('Invalid repository path')
    p = Path(value)
    if p.is_absolute() or '..' in p.parts or p.as_posix() != value:
        raise ValueError('Normalized repository-relative path required')
    result = ROOT / p
    if result.is_symlink() or not result.resolve().is_relative_to(ROOT) or not result.is_file():
        raise ValueError('Missing regular repository file: ' + value)
    return result


def pin(path):
    raw = path.read_bytes()
    return {'path': relative(path), 'bytes': len(raw), 'sha256': digest(raw)}


def assert_pin(row):
    actual = pin(file(row['path']))
    if actual['sha256'] != row['sha256'] or ('bytes' in row and actual['bytes'] != row['bytes']):
        raise ValueError('Pinned bytes changed: ' + row['path'])


def no_approval(value):
    """No nested metadata can silently promote canon, human or runtime status."""
    if isinstance(value, dict):
        for key, child in value.items():
            if key in APPROVALS and child is not False:
                raise ValueError('Automatic approval forbidden: ' + key)
            no_approval(child)
    elif isinstance(value, list):
        for child in value:
            no_approval(child)


def protection():
    path = FOLLOW / 'source-protection.json'
    if pin(path)['sha256'] != PROTECTION_SHA:
        raise ValueError('Frozen870 historical source-protection snapshot changed')
    result = load(path)
    if result['sourceBaselineCommit'] != BASE or result['protectedWorkbooks'] != 127:
        raise ValueError('Wrong immutable historical baseline')
    records = result['files']
    if len(records) != 870 or len({r['path'] for r in records}) != 870 or sum(r['path'].endswith('.xlsx') for r in records) != 127:
        raise ValueError('All870 historical files and127 workbooks must remain pinned')
    for row in records:
        assert_pin(row)
    natives = [r for name in result['priorPacks'] for r in load(ROOT / 'public/game' / name / 'manifest.json')['nativeFiles']]
    prior_c = load(ROOT / 'public/game/biomasks-neutral-20261113/manifest.json')['derivedFiles']
    protected_paths = {r['path'] for r in records}
    if len(natives) != 151 or len({r['path'] for r in natives}) != 151 or len(prior_c) != 69:
        raise ValueError('Historical151 ImageGen and69 neutral C counts changed')
    if not {r['path'] for r in natives + prior_c}.issubset(protected_paths):
        raise ValueError('Historical native or neutral PNG omitted from protection')
    return result


def facts(path, native_mask=False):
    with Image.open(path) as image:
        # Inspect the header before allocating the decoded raster. Publisher R
        # photos may exceed mask-canvas size; their bytes are never resampled.
        limit = 16777216 if native_mask else 67108864
        if image.width * image.height > limit or image.format not in {'PNG', 'WEBP', 'JPEG'}:
            raise ValueError('Unsupported native frame or reference exceeds its pixel limit')
        if native_mask:
            with path.open('rb') as stream:header = stream.read(33)
            if image.format != 'PNG' or image.mode != 'RGBA' or len(header) < 33 or header[24:26] != bytes([8, 6]) or getattr(image, 'n_frames', 1) != 1:
                raise ValueError('Single static native PNG RGBA8 required')
        image.load()
        width, height = image.size
        bounds = [0, 0, width, height]
        alpha = {'available': 'A' in image.getbands()}
        if alpha['available']:
            channel = image.getchannel('A');histogram = channel.histogram()
            core = channel.point(lambda v: 255 if v >= 16 else 0).getbbox()
            if not core:
                raise ValueError('Empty visible image')
            bounds = list(core)
            alpha.update(sha256=digest(channel.tobytes()), bounds16=bounds, threshold=16,
                         transparentPixels=histogram[0], solidPixels240=sum(histogram[240:]),
                         marginsPixels=[bounds[0], bounds[1], width - bounds[2], height - bounds[3]])
        return {'format': image.format, 'mode': image.mode, 'width': width, 'height': height,
                'nativeDimensions': [width, height], 'displayBounds': bounds, 'alpha': alpha}


def public_asset(row, label, native_mask=False):
    assert_pin(row)
    path = file(row['path'])
    if not row['path'].startswith('public/game/'):
        raise ValueError('Review images must be public source assets')
    return {**pin(path), **facts(path, native_mask), 'url': '/' + path.relative_to(ROOT / 'public').as_posix(),
            'label': label, 'canonCertified': False, 'humanArtValidated': False, 'runtimeIntegrated': False}


def validate_generation(row, version, target, source, used):
    no_approval(row)
    expected = relative(PUBLIC / ('originals' if version == 'A' else 'phg') / (target['id'] + '.png'))
    if row['assetPath'] != expected or row['version'] != version or row['renderMode'] != 'imagegen' or row['generatedNew'] is not True:
        raise ValueError('Explicit new A/B ImageGen version and output path required')
    actual = pin(file(expected))
    if actual['sha256'] != row['sha256'] or actual['bytes'] != row['bytes'] or row['sha256'] in used:
        raise ValueError('New ImageGen bytes mismatched or duplicated')
    used.add(row['sha256'])
    origin = row['nativeSourcePath']
    if not isinstance(origin, str) or not Path(origin).is_absolute() or not origin.endswith('.png') or '..' in Path(origin).parts:
        raise ValueError('Recorded private native PNG origin required')
    if 'origin:' + origin in used:
        raise ValueError('Each accepted A/B needs a distinct native origin')
    used.add('origin:' + origin)
    if Path(origin).is_file() and Path(origin).read_bytes() != file(expected).read_bytes():
        raise ValueError('Public PNG differs from its native ImageGen output')
    receipt_path = file(row['generationReceipt'])
    if not receipt_path.is_relative_to(PACK / 'generation'):
        raise ValueError('Generation receipt outside new pack')
    matching = [r for r in load(receipt_path)['entries'] if r.get('id') == row['id'] and r.get('version') == version]
    if len(matching) != 1:
        raise ValueError('Receipt identity/version missing or duplicated')
    receipt = matching[0];no_approval(receipt)
    for key in ('assetPath', 'sha256', 'bytes', 'nativeDimensions', 'nativeSourcePath', 'version', 'renderMode'):
        if receipt.get(key) != row[key]:
            raise ValueError('Receipt provenance differs: ' + key)
    if receipt.get('generatedNew') is not True or not receipt.get('prompt'):
        raise ValueError('Actual ImageGen prompt and generatedNew=true required')
    keys = ('referenceSourcePath', 'referenceSourceSha256') if version == 'A' else ('sourceAPath', 'sourceASha256')
    expected_r = {(r['path'], r['sha256']) for r in target['referenceSources']}
    for record in (row, receipt):
        if record.get(keys[0]) != source['path'] or record.get(keys[1]) != source['sha256']:
            raise ValueError('A/B primary source lineage differs')
        if {(r['path'], r['sha256']) for r in record['referenceSources']} != expected_r:
            raise ValueError('All selected exact R references required')
    asset = public_asset(actual, version + ' · Étude de la source identifiée — ImageGen', True)
    if row['nativeDimensions'] != asset['nativeDimensions'] or not asset['alpha'].get('transparentPixels') or min(asset['alpha']['marginsPixels']) <= 0:
        raise ValueError('Native A/B frame or visible transparent exterior invalid')
    asset.update(renderMode='imagegen', generatedNew=True, newImageGeneration=True, generationReceipt=pin(receipt_path))
    return asset


def inventory_and_acceptance():
    path = INPUTS / 'candidate-inventory.json'
    inventory = load(path) if path.is_file() else {'domains': [{'id': d, 'capacity': 40} for d in DOMAINS], 'candidates': []}
    no_approval(inventory)
    domains = inventory['domains']
    if len(domains) != 4 or {d['id'] for d in domains} != set(DOMAINS) or any(type(d.get('capacity')) is not int or d['capacity'] != 40 for d in domains):
        raise ValueError('Exactly four domains with capacity40, not production counts, required')
    candidates = inventory['candidates'];by_id = {}
    for row in candidates:
        identity = row['id']
        if not isinstance(identity, str) or not re.fullmatch(r'[a-z0-9][a-z0-9_-]+', identity) or identity in by_id:
            raise ValueError('Unsafe or duplicate candidate identity')
        if row['domain'] not in DOMAINS or not isinstance(row.get('sourceStatus'), dict):
            raise ValueError('Candidate domain and inherited sourceStatus required')
        if any(key in row['sourceStatus'] and type(row['sourceStatus'][key]) is not bool for key in ('provisionalReviewOnly', 'partialReferenceView', 'hybridStudy')):
            raise ValueError('Qualification flags must be booleans')
        if not isinstance(row.get('limitations'), list) or not isinstance(row.get('referenceSources'), list):
            raise ValueError('Explicit source limitations and reference list required')
        if row.get('representationOf') == 'predator_17' and row['status'] in ELIGIBLE and (row.get('newCanonicalGeometry') is not False or row.get('sourceLimited') is not True or row['sourceStatus'].get('provisionalReviewOnly') is not True):
            raise ValueError('Vapor revision must retain its source-limited provisional qualification')
        by_id[identity] = row
        for reference in row['referenceSources']:
            assert_pin(reference)
    for domain in DOMAINS:
        if sum(r['domain'] == domain and r['status'] in ELIGIBLE for r in candidates) > 40:
            raise ValueError('Domain exceeds40 qualified candidates')
    accepted_path = INPUTS / 'accepted-new-masks.json'
    accepted = load(accepted_path) if accepted_path.is_file() else {'entries': [], 'originalGenerations': []}
    no_approval(accepted)
    a_rows = {r['id']: r for r in accepted.get('originalGenerations', [])}
    b_rows = {r['id']: r for r in accepted.get('entries', [])}
    if len(a_rows) != len(accepted.get('originalGenerations', [])) or len(b_rows) != len(accepted.get('entries', [])) or set(a_rows) != set(b_rows):
        raise ValueError('Accepted A/B must have complete unique matching identities')
    if set(a_rows) - set(by_id):
        raise ValueError('Unregistered accepted identity')
    return inventory, by_id, a_rows, b_rows


def prepare_inventory():
    if pin(FOLLOW / 'source-protection.json')['sha256'] != PROTECTION_SHA:
        raise ValueError('Frozen870 historical source-protection snapshot changed')
    inventory, targets, a_rows, b_rows = inventory_and_acceptance()
    old_manifest_path = ROOT / 'public/game/biomasks-neutral-20261113/manifest.json'
    old = load(old_manifest_path)
    old_ids = {r['id'] for r in old['pairs']}
    baseline_native = [r for name in load(FOLLOW / 'source-protection.json')['priorPacks'] for r in load(ROOT / 'public/game' / name / 'manifest.json')['nativeFiles']]
    used = {r['sha256'] for r in baseline_native};entries = [];natives = []
    for identity in sorted(a_rows):
        target = targets[identity]
        if target['status'] not in ELIGIBLE or target.get('duplicateOf') or target.get('aliasOf'):
            raise ValueError('Blocked, duplicate or alias candidate cannot produce a new A/B/C pair')
        if identity in old_ids:
            raise ValueError('Existing representation needs an explicit distinct edition/view identity')
        if not target['referenceSources']:
            raise ValueError('Qualified visual references required; prose alone cannot establish a mask')
        source = {'path': a_rows[identity]['referenceSourcePath'], 'sha256': a_rows[identity]['referenceSourceSha256']}
        if (source['path'], source['sha256']) not in {(r['path'], r['sha256']) for r in target['referenceSources']}:
            raise ValueError('Primary A reference absent from qualified candidate sources')
        if target.get('sourcePath') and (target['sourcePath'] != source['path'] or target.get('sourceSha256') != source['sha256']):
            raise ValueError('Candidate primary reference differs from accepted A')
        a = validate_generation(a_rows[identity], 'A', target, source, used)
        b = validate_generation(b_rows[identity], 'B', target, a, used)
        natives.extend({k: asset[k] for k in ('path', 'sha256', 'bytes')} for asset in (a, b))
        entries.append({**deepcopy(target), 'sourcePack': 'lots40', 'pairId': identity + '::qualified-source-view',
                        'sourceA': a, 'sourceB': b, 'camera': target.get('camera', 'Vue de la référence primaire conservée ; géométrie cachée inconnue.')})
    result = {'schemaVersion': 1, 'sourceBaselineCommit': BASE, 'baselineRepresentations': pin(old_manifest_path),
              'domains': inventory['domains'], 'entries': entries, 'newImageGenFiles': natives,
              'scope': 'Only explicitly accepted source-qualified A/B; capacity and blocked/duplicate/alias records are not production.'}
    for name, key in [('candidate-inventory.json', 'candidateInventory'), ('accepted-new-masks.json', 'acceptedNewMasks')]:
        path = INPUTS / name
        if path.is_file():result[key] = pin(path)
    return result


def exact_copy(source, dest, write):
    if write:
        dest.parent.mkdir(parents=True, exist_ok=True)
        if dest.exists() and dest.read_bytes() != source.read_bytes():
            raise ValueError('Refusing to overwrite differing reference bytes')
        if not dest.exists():shutil.copyfile(source, dest)
    if not dest.is_file() or dest.read_bytes() != source.read_bytes():
        raise ValueError('Exact reference copy required')


def build(write, require_complete):
    protected = protection();prepared = prepare_inventory()
    combined_path = INPUTS / 'production-inventory.json'
    if not combined_path.is_file() or combined_path.read_bytes() != encoded(prepared):
        raise ValueError('Run --prepare-inventory after accepted source changes, then derive C after artistic freeze')
    if require_complete and (not prepared['entries'] or not (INPUTS / 'accepted-new-masks.json').is_file()):
        raise ValueError('At least one explicit source-qualified accepted A/B pair is required')
    inventory, candidates, _, _ = inventory_and_acceptance()
    receipts_path = PACK / 'generation/neutral-derivations.json'
    receipts = load(receipts_path) if receipts_path.is_file() else {'entries': []}
    no_approval(receipts)
    c_rows = {r['id']: r for r in receipts['entries']}
    if len(c_rows) != len(receipts['entries']) or set(c_rows) - {r['id'] for r in prepared['entries']}:
        raise ValueError('Duplicate or unregistered C derivative')
    pairs, derivatives, reused, reference_copies = [], [], [], []
    for row in prepared['entries']:
        identity = row['id'];a, b = row['sourceA'], row['sourceB'];c = None
        if identity in c_rows:
            receipt = c_rows[identity]
            c_path = relative(PUBLIC / 'neutral' / (identity + '.png'))
            if receipt['assetPath'] != c_path or receipt['version'] != 'C' or receipt['methodId'] != METHOD:
                raise ValueError('Explicit C path/version/method required')
            if receipt['sourceBPath'] != b['path'] or receipt['sourceBSha256'] != b['sha256'] or receipt['sourceStatus'] != row['sourceStatus']:
                raise ValueError('C source lineage or inherited qualification changed')
            c = public_asset({'path': c_path, 'sha256': receipt['sha256'], 'bytes': receipt['bytes']}, 'C · Neutre monochrome — dérivée technique', True)
            if c['nativeDimensions'] != b['nativeDimensions'] or c['alpha']['sha256'] != b['alpha']['sha256'] or receipt['sourceAlphaSha256'] != b['alpha']['sha256'] or receipt['outputAlphaSha256'] != c['alpha']['sha256']:
                raise ValueError('C native dimensions or decoded alpha changed')
            if receipt.get('nativeDimensions') != c['nativeDimensions'] or receipt.get('nativeMode') != 'RGBA' or receipt.get('sourceSha256') != b['sha256']:
                raise ValueError('C recorded native/source facts differ')
            if receipt['alphaByteIdentical'] is not True or receipt['strictMonochrome'] is not True or receipt['newImageGeneration'] is not False or receipt.get('generatedNew') is not False or receipt['sourceFileMutation'] is not False:
                raise ValueError('C derivation verification flags disagree')
            with Image.open(file(c_path)) as image:
                channels = image.split()
                if channels[0].tobytes() != channels[1].tobytes() or channels[0].tobytes() != channels[2].tobytes():
                    raise ValueError('C is not strictly monochrome on all decoded pixels')
            is_reuse = receipt['renderMode'] == 'source-reuse'
            if receipt['renderMode'] not in {'deterministic-grayscale', 'source-reuse'} or receipt['derivedNew'] is not (not is_reuse) or receipt['pixelEditingPerformed'] is not (not is_reuse):
                raise ValueError('C copy/derived mode mislabeled')
            if is_reuse and c['sha256'] != b['sha256']:
                raise ValueError('Reused C must keep exact B bytes')
            c.update({k: receipt[k] for k in ('renderMode', 'methodId', 'sourceBPath', 'sourceBSha256', 'sourceAlphaSha256',
                'outputAlphaSha256', 'alphaByteIdentical', 'strictMonochrome', 'newImageGeneration', 'derivedNew', 'pixelEditingPerformed')})
            c.update(generatedNew=False, sourceFileMutation=False, generationReceipt=pin(receipts_path))
            (reused if is_reuse else derivatives).append({k: c[k] for k in ('path', 'sha256', 'bytes')})
        elif require_complete:
            raise ValueError('Missing neutral C for an accepted A/B: ' + identity)
        r_assets = []
        for number, reference in enumerate(row['referenceSources'], 1):
            original = file(reference['path'])
            if original.suffix.lower() not in {'.png', '.webp', '.jpg', '.jpeg'}:
                continue  # Non-raster documentary evidence stays pinned under production.
            dest = PUBLIC / 'references' / identity / (f'{number:02d}-' + original.name)
            exact_copy(original, dest, write)
            asset = public_asset(pin(dest), 'R · Référence visuelle conservée — octets identiques')
            asset.update(originalSource=pin(original), sourceRole=reference.get('role', 'source visuelle'))
            reference_copies.append(pin(dest));r_assets.append(asset)
        pairs.append({**row, 'versionA': a, 'versionB': b, 'versionC': c, 'referenceImages': r_assets,
                      'neutralAvailable': c is not None, 'aliases': [], 'canonCertified': False,
                      'humanArtValidated': False, 'runtimeIntegrated': False})
    new_native = prepared['newImageGenFiles']
    allowed = {r['path'] for r in new_native + derivatives + reused + reference_copies} | {relative(PUBLIC / 'manifest.json'), relative(PUBLIC / 'review.html')}
    if {relative(p) for p in PUBLIC.rglob('*') if p.is_file()} - allowed:
        raise ValueError('Unregistered public assets; rejected attempts belong outside final public namespace')
    inputs = [p for folder in (INPUTS, PACK / 'tools', PACK / 'generation', PACK / 'references') for p in folder.rglob('*')
              if p.is_file() and p.suffix != '.pyc' and '__pycache__' not in p.parts]
    inputs.extend([PACK / 'README.md', ROOT / 'production/p0-sprites-20261113/tools/workbook_lib.py',
                   ROOT / 'production/biomasks-neutral-20261113/tools/neutral-mask-pixels.mjs'])
    batches = []
    for domain in DOMAINS:
        rows = [r for r in candidates.values() if r['domain'] == domain]
        produced = [p for p in pairs if p['domain'] == domain]
        batches.append({'id': domain, 'capacity': 40, 'candidateRecords': len(rows),
                        'statusCounts': {status: sum(r['status'] == status for r in rows) for status in sorted({r['status'] for r in rows})},
                        'acceptedAB': len(produced), 'completeABC': sum(p['neutralAvailable'] for p in produced),
                        'capacityIsProduction': False})
    counts = {'domainCapacity': 160, 'domains': 4, 'candidateRecords': len(candidates),
              'acceptedABPairs': len(pairs), 'completeABC': sum(p['neutralAvailable'] for p in pairs),
              'newABImageGenPngs': len(new_native), 'newDerivedC': len(derivatives), 'sourceReuseC': len(reused),
              'newCImageGenPngs': 0, 'exactReferenceCopies': len(reference_copies),
              'blockedCandidates': sum(r['status'] == 'blocked' for r in candidates.values()),
              'duplicateRecords': sum(r['status'] == 'duplicate' for r in candidates.values()),
              'aliasRecords': sum(r['status'] == 'alias' for r in candidates.values()),
              'qualifiedNotProduced': sum(r['status'] in ELIGIBLE and r['id'] not in {p['id'] for p in pairs} for r in candidates.values()),
              'provisionalProduced': sum(bool(p['sourceStatus'].get('provisionalReviewOnly')) for p in pairs),
              'partialProduced': sum(bool(p['sourceStatus'].get('partialReferenceView')) for p in pairs),
              'hybridProduced': sum(bool(p['sourceStatus'].get('hybridStudy')) for p in pairs),
              'revisedRepresentations': sum(bool(p.get('revisesPair')) for p in pairs),
              'editionStudies': sum(p.get('editionStudy') is True or p.get('representationKind') == 'edition-study' for p in pairs),
              'sharedGeometryStudies': sum(p.get('sharedGeometryStudy') is True for p in pairs),
              'canonicalGeometryCertified': 0,
              'historicalCanonicalRequirementsStillOpen': 46, 'canonicalClosures': 0, 'runtimeIntegrations': 0}
    remaining = deepcopy(load(ROOT / 'public/game/biomasks-neutral-20261113/manifest.json')['remainingCanonicalTargets'])
    for task in remaining:
        additions = [p for p in pairs if p.get('relatedCanonicalTargetId') == task['id']]
        task['newReferenceFoundByLots40Batch'] = bool(additions)
        if additions:
            task['referenceFoundByThisBatch'] = True
            task['currentEditionStudies'] = task.get('currentEditionStudies', []) + [
                {'editionId': p['id'], 'canonicalTargetId': task['id'], 'referenceFound': True,
                 'editionCandidateProduced': True, 'neutralCProduced': p['neutralAvailable'],
                 'canonCertified': False, 'canonicalRequirementClosed': False} for p in additions]
        if task.get('canonicalRequirementClosed') is not False or task.get('canonicalFidelityCertified') is not False:
            raise ValueError('All46 inherited canonical requirements must remain open')
    return {'schemaVersion': 1, 'id': 'biomasks-lots40-20261113', 'asOf': '2026-11-13', 'sourceBaselineCommit': BASE,
            'status': 'source-qualified-edition-and-view-studies-unvalidated-for-canon-or-runtime', 'methodId': METHOD,
            'counts': counts, 'batches': batches, 'candidates': list(candidates.values()), 'pairs': pairs,
            'sourceInventory': pin(combined_path), 'nativeFiles': new_native,
            'derivedFiles': sorted(derivatives, key=lambda r: r['path']), 'sourceCopies': sorted(reused + reference_copies, key=lambda r: r['path']),
            'inputPins': sorted([pin(p) for p in set(inputs)], key=lambda r: r['path']),
            'protectedSources': {**pin(FOLLOW / 'source-protection.json'), 'files': 870, 'workbooks': 127, 'priorNativePngs': 151, 'priorNeutralC': 69},
            'remainingCanonicalTargets': remaining, 'canonCertified': False, 'humanArtValidated': False,
            'runtimeIntegrated': False, 'allP0Closed': False, 'allMasksGenerated': False,
            'capacityIsProduction': False, 'pixelEditingPerformed': bool(derivatives),
            'pixelEditingScope': 'User-authorized deterministic C RGB mapping only; A/B/R source bytes unchanged.'}, protected


def library():
    spec = importlib.util.spec_from_file_location('lots40_pure_xlsx', ROOT / 'production/p0-sprites-20261113/tools/workbook_lib.py')
    module = importlib.util.module_from_spec(spec);sys.modules[spec.name] = module;spec.loader.exec_module(module)
    return module


def workbook_data(manifest, protected, lib):
    summary = [['Mesure', 'Valeur', 'Portée']] + [[k, v, 'Capacité séparée des résultats ; aucune certification canonique/humaine/runtime'] for k, v in manifest['counts'].items()]
    batches = [['Domaine', 'Capacité maximale', 'Sources recensées', 'A/B acceptés', 'A/B/C complets', 'États réels']] + [[b['id'], b['capacity'], b['candidateRecords'], b['acceptedAB'], b['completeABC'], b['statusCounts']] for b in manifest['batches']]
    candidates = [['ID', 'Domaine', 'Nom', 'État', 'Blocage/limites', 'Doublon de', 'Alias de', 'Classe source', 'Références qualifiées']]
    for row in manifest['candidates']:
        candidates.append([row['id'], row['domain'], row['label'], row['status'], row.get('blocker', row['limitations']), row.get('duplicateOf', ''), row.get('aliasOf', ''), row['sourceClass'], row['referenceSources']])
    produced = [['ID', 'Domaine', 'Famille / représentation de / portée', 'Étude d’édition', 'Étude de famille/source partagée explicite', 'A', 'SHA A', 'B PHG', 'SHA B', 'C neutre', 'SHA C', 'Qualification conservée', 'Limites']]
    for row in manifest['pairs']:
        c = row['versionC'];a, b = row['versionA'], row['versionB']
        produced.append([row['id'], row['domain'], {'maskFamily': row.get('maskFamily'), 'representationOf': row.get('representationOf'), 'relationToBaseline': row.get('relationToBaseline')}, row.get('editionStudy') is True or row.get('representationKind') == 'edition-study', row.get('sharedGeometryStudy') is True, a['path'], a['sha256'], b['path'], b['sha256'], lib.Link(c['path'], '../../../' + c['path']) if c else 'À dériver après gel', c['sha256'] if c else '', row['sourceStatus'], row['limitations']])
    method = [['Contrat', 'Valeur'], ['Méthode C', METHOD], ['Formule RGB8', 'floor((2126R+7152G+722B+5000)/10000)'], ['Alpha', 'Tous les octets alpha décodés de B conservés, sans recadrage/redimensionnement'], ['Portée', 'C2D éclairée ; pas un albédo/PBR/UV3D ni intégration runtime'], ['Lots de40', 'Plafond par domaine, jamais un nombre de créations garanti'], ['Romans', 'Un nom ou une prose sans référence visuelle ne permet pas d’inventer un design fidèle']]
    remains = [['ID', 'Nom', 'État', 'Études disponibles']] + [[r['id'], r['name'], 'Ouvert : étude d’édition/vue non certifiée canonique', r.get('currentEditionStudies', [])] for r in manifest['remainingCanonicalTargets']]
    historic = [['Chemin protégé', 'Octets', 'SHA256']] + [[r['path'], r['bytes'], r['sha256']] for r in protected['files']]
    tables = [('Résumé', summary), ('Lots par domaine', batches), ('Inventaire et blocages', candidates), ('Paires A-B-C produites', produced), ('Méthode et limites', method), ('46 exigences ouvertes', remains), ('Sources protégées', historic)]
    return {'schemaVersion': 1, 'manifestSha256': digest(encoded(manifest)), 'sheets': [
        {'name': name, 'title': 'Yautja — lots sources : ' + name, 'note': 'Résultats mesurés ; aucune invention pour atteindre40 ni fermeture canonique.',
         'headerRow': 4, 'rows': values, 'widths': [100] * len(values[0])} for name, values in tables]}


def check_workbook(raw, data, lib):
    cells_count = 0
    with ZipFile(BytesIO(raw)) as archive:
        if archive.testzip():raise ValueError('Corrupt XLSX')
        for name in archive.namelist():
            if name.endswith(('.xml', '.rels')):ET.fromstring(archive.read(name))
        names = [s.attrib['name'] for s in ET.fromstring(archive.read('xl/workbook.xml')).find('{' + NS + '}sheets')]
        if names != [s['name'] for s in data['sheets']]:raise ValueError('Workbook sheet membership differs')
        for number, sheet in enumerate(data['sheets'], 1):
            cells = {c.attrib['r']: c for c in ET.fromstring(archive.read(f'xl/worksheets/sheet{number}.xml')).iter('{' + NS + '}c')}
            for rn, values in enumerate(sheet['rows'], 4):
                for cn, value in enumerate(values, 1):
                    expected = value.label if isinstance(value, lib.Link) else lib.compact(value)
                    if isinstance(value, (int, float)) and not isinstance(value, bool):expected = str(value)
                    if ''.join(cells[lib.column(cn) + str(rn)].itertext()) != expected:raise ValueError('Workbook cell mismatch')
                    cells_count += 1
    return cells_count


def main(arguments=None):
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    for name in ('prepare-inventory', 'write', 'check'):mode.add_argument('--' + name, action='store_true')
    parser.add_argument('--require-complete', action='store_true');args = parser.parse_args(arguments)
    if args.prepare_inventory:
        value = prepare_inventory();(INPUTS / 'production-inventory.json').write_bytes(encoded(value))
        print(json.dumps({'acceptedAB': len(value['entries']), 'capacityIsProduction': False}));return 0
    manifest, protected = build(args.write, args.require_complete)
    lib = library();data = workbook_data(manifest, protected, lib);raw = lib.build_workbook(data)
    compared = check_workbook(raw, data, lib)
    html = (PACK / 'tools/review-template.html').read_text().replace('__PACK_DATA__', json.dumps(manifest, ensure_ascii=False).replace('<', '\\u003c')).encode()
    outputs = {PUBLIC / 'manifest.json': encoded(manifest), PUBLIC / 'review.html': html,
               FOLLOW / 'Yautja_Masques_Lots40_20261113.xlsx': raw, FOLLOW / 'build-request.json': encoded(lib.serializable(data)),
               FOLLOW / 'coverage.json': encoded({'counts': manifest['counts'], 'batches': manifest['batches'], 'canonicalClosures': 0})}
    result = {'passed': True, 'manifestSha256': digest(encoded(manifest)), 'counts': manifest['counts'], 'batches': manifest['batches'],
              'workbookSha256': digest(raw), 'gallerySha256': digest(html), 'cellsCompared': compared,
              'protectedWorkbooks': 127, 'protectedNativeImageGenPngs': 151, 'protectedNeutralC': 69,
              'scope': 'Deterministic package,source pins,alpha and monochrome; independent pixels verifier checks exact C formula.'}
    outputs[FOLLOW / 'verification.json'] = encoded(result)
    for path, content in outputs.items():
        if args.write:path.parent.mkdir(parents=True, exist_ok=True);path.write_bytes(content)
        elif not path.is_file() or path.read_bytes() != content:raise ValueError('Deterministic output differs: ' + relative(path))
    print(json.dumps(result, ensure_ascii=False));return 0


if __name__ == '__main__':
    try:raise SystemExit(main())
    except Exception as error:
        print('::error::' + (type(error).__name__ + ': ' + str(error)).replace('%', '%25').replace('\r', '%0D').replace('\n', '%0A'), file=sys.stderr)
        raise
