#!/usr/bin/env python3
"""Build source-linked B/C review artifacts; raster inspection is read-only."""
from __future__ import annotations
import argparse
from copy import deepcopy
import hashlib
import importlib.util
from io import BytesIO
import json
from pathlib import Path
import shutil
import sys
from xml.etree import ElementTree as ET
from zipfile import ZipFile
from PIL import Image

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[3]
PACK = ROOT / 'production/biomasks-neutral-20261113'
PUBLIC = ROOT / 'public/game/biomasks-neutral-20261113'
INPUTS, FOLLOW = PACK / 'inputs', PACK / 'suivi'
BASE = '4b70740d192c19d83b36d7aef2a15e5074d64053'
BASE_INVENTORY_SHA = '4137f30a8a022ebd7022f2aa7d015de793f98ae8ea7bd61db4b87039c29c140b'
PROTECTION_SHA = '23aa8ad1bfde69cb57c471f458924c9ebdebb78ed11385dcda716db203bf179f'
METHOD = 'srgb8-rec709-luma-v1'
OLD_PACKS = ('p0-sprites-20261113', 'p0-fidelity-20261113', 'biomasks-20261113',
             'biomasks-primary-20261113', 'biomasks-dual-20261113', 'biomasks-expansion-20261113')
FLAGS = ('canonCertified', 'canonicalCertified', 'humanArtValidated', 'runtimeIntegrated', 'animated')
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


def no_approval(row):
    if any(row.get(flag) is True for flag in FLAGS):
        raise ValueError('Automatic canonical/human/runtime/animation approval forbidden')


def protection():
    if pin(FOLLOW / 'source-protection.json')['sha256'] != PROTECTION_SHA:
        raise ValueError('Frozen728 historical source-protection snapshot changed')
    result = load(FOLLOW / 'source-protection.json')
    if result['sourceBaselineCommit'] != BASE or result['protectedWorkbooks'] != 126:
        raise ValueError('Wrong immutable historical baseline')
    records = result['files']
    if len({r['path'] for r in records}) != len(records) or sum(r['path'].endswith('.xlsx') for r in records) != 126:
        raise ValueError('All126 old workbooks must remain pinned')
    for row in records:
        assert_pin(row)
    native = [r for name in OLD_PACKS for r in load(ROOT / 'public/game' / name / 'manifest.json')['nativeFiles']]
    if len(native) != 145 or not {r['path'] for r in native}.issubset({r['path'] for r in records}):
        raise ValueError('All145 historical ImageGen PNGs must remain protected')
    return result


def facts(path):
    with Image.open(path) as image:
        image.load()
        if image.width * image.height > 16777216 or image.format not in {'PNG', 'WEBP', 'JPEG'}:
            raise ValueError('Unsupported native frame')
        width, height = image.size
        bounds = [0, 0, width, height]
        alpha = {'available': 'A' in image.getbands()}
        if alpha['available']:
            channel = image.getchannel('A')
            histogram = channel.histogram()
            core = channel.point(lambda v: 255 if v >= 16 else 0).getbbox()
            if not core:
                raise ValueError('Empty visible image')
            bounds = list(core)
            alpha.update(sha256=digest(channel.tobytes()), bounds16=bounds, threshold=16,
                         transparentPixels=histogram[0], solidPixels240=sum(histogram[240:]),
                         marginsPixels=[bounds[0], bounds[1], width - bounds[2], height - bounds[3]])
        return {'format': image.format, 'mode': image.mode, 'width': width, 'height': height,
                'nativeDimensions': [width, height], 'alpha': alpha, 'displayBounds': bounds}


def public_asset(row, label):
    path = file(row['path'])
    assert_pin(row)
    if not row['path'].startswith('public/game/'):
        raise ValueError('Review images must be public source assets')
    return {**pin(path), **facts(path), 'url': '/' + path.relative_to(ROOT / 'public').as_posix(),
            'label': label, 'canonCertified': False, 'humanArtValidated': False, 'runtimeIntegrated': False}


def validate_new_generation(row, version, target, source, used):
    no_approval(row)
    expected = relative(PUBLIC / ('originals' if version == 'A' else 'phg') / (target['id'] + '.png'))
    if row['assetPath'] != expected or row['version'] != version or row['renderMode'] != 'imagegen' or row['generatedNew'] is not True:
        raise ValueError('Explicit new A/B ImageGen version and output path required')
    actual = pin(file(row['assetPath']))
    if actual['sha256'] != row['sha256'] or actual['bytes'] != row['bytes'] or row['sha256'] in used:
        raise ValueError('New ImageGen bytes mismatched or duplicated')
    used.add(row['sha256'])
    origin = row['nativeSourcePath']
    if not isinstance(origin, str) or not Path(origin).is_absolute() or not origin.endswith('.png') or '..' in Path(origin).parts:
        raise ValueError('Recorded private native PNG origin required')
    if 'origin:' + origin in used:
        raise ValueError('Each new A/B version needs a distinct native origin')
    used.add('origin:' + origin)
    if Path(origin).is_file() and Path(origin).read_bytes() != file(row['assetPath']).read_bytes():
        raise ValueError('New A/B differs from native ImageGen output')
    receipt_path = file(row['generationReceipt'])
    if not receipt_path.is_relative_to(PACK / 'generation'):
        raise ValueError('Generation receipt outside new pack')
    matching = [r for r in load(receipt_path)['entries'] if r.get('id') == row['id'] and r.get('version') == version]
    if len(matching) != 1:
        raise ValueError('Receipt identity/version missing or duplicated')
    receipt = matching[0]
    no_approval(receipt)
    for key in ('assetPath', 'sha256', 'bytes', 'nativeDimensions', 'nativeSourcePath', 'version', 'renderMode'):
        if receipt.get(key) != row[key]:
            raise ValueError('Receipt provenance differs: ' + key)
    if receipt.get('generatedNew') is not True or not receipt.get('prompt'):
        raise ValueError('Actual ImageGen prompt and generatedNew=true required')
    keys = ('referenceSourcePath', 'referenceSourceSha256') if version == 'A' else ('sourceAPath', 'sourceASha256')
    for record in (row, receipt):
        if record.get(keys[0]) != source['path'] or record.get(keys[1]) != source['sha256']:
            raise ValueError('New A/B source lineage differs')
        if {(r['path'], r['sha256']) for r in record['referenceSources']} != {(r['path'], r['sha256']) for r in target['referenceSources']}:
            raise ValueError('All selected exact R references required')
    result = public_asset(actual, version + ' · Étude de l’édition photographiée — ImageGen')
    if result['mode'] != 'RGBA' or result['format'] != 'PNG' or row['nativeDimensions'] != result['nativeDimensions']:
        raise ValueError('Native RGBA PNG A/B dimensions required')
    if not result['alpha'].get('transparentPixels') or min(result['alpha']['marginsPixels']) <= 0:
        raise ValueError('Unclipped visible A/B and real transparent exterior required')
    return result


def prepare_inventory():
    base_path = INPUTS / 'neutral-inventory.json'
    if pin(base_path)['sha256'] != BASE_INVENTORY_SHA:
        raise ValueError('Frozen66 source inventory changed')
    base = load(base_path)
    entries = deepcopy(base['entries'])
    if len(entries) != 66 or len({r['id'] for r in entries}) != 66:
        raise ValueError('All66 historical B representations required')
    for row in entries:
        assert_pin(row['sourceA'])
        assert_pin(row['sourceB'])
    targets = load(INPUTS / 'new-mask-inputs.json')['targets']
    for target in targets:
        no_approval(target)
        no_approval(target['sourceStatus'])
        for r in target['referenceSources']:
            assert_pin(r)
    accepted_path = INPUTS / 'accepted-new-masks.json'
    accepted = load(accepted_path) if accepted_path.is_file() else {'entries': [], 'originalGenerations': []}
    a_rows = {r['id']: r for r in accepted.get('originalGenerations', [])}
    b_rows = {r['id']: r for r in accepted.get('entries', [])}
    if len(a_rows) != len(accepted.get('originalGenerations', [])) or len(b_rows) != len(accepted.get('entries', [])):
        raise ValueError('Duplicate accepted new mask/version')
    target_by_id = {r['id']: r for r in targets}
    if (set(a_rows) | set(b_rows)) - set(target_by_id):
        raise ValueError('Unregistered new edition')
    used, natives, pending = set(), [], []
    for target in targets:
        identity = target['id']
        if identity not in a_rows or identity not in b_rows:
            pending.append(identity)
            continue
        source = {'path': target['sourcePath'], 'sha256': target['sourceSha256']}
        a = validate_new_generation(a_rows[identity], 'A', target, source, used)
        b = validate_new_generation(b_rows[identity], 'B', target, a, used)
        natives.extend({k: asset[k] for k in ('path', 'sha256', 'bytes')} for asset in (a, b))
        entries.append({'id': identity, 'pairId': identity + '::source-view', 'label': target['label'],
                        'sourcePack': 'neutral-new-edition', 'sourceClass': target['sourceClass'],
                        'originGroup': target['originGroup'], 'sourceScope': target['sourceScope'],
                        'camera': target['camera'], 'scopeLabel': 'Nouvelle étude d’édition NECA',
                        'sourceA': {**a, 'dimensions': a['nativeDimensions']},
                        'sourceB': {**b, 'dimensions': b['nativeDimensions']},
                        'referenceSources': target['referenceSources'], 'publicReferenceImages': [],
                        'sourceStatus': target['sourceStatus'], 'limitations': target['limitations'],
                        'identityAnchors': target.get('identityAnchors', []), 'relatedCanonicalTargetId': target['relatedCanonicalTargetId'],
                        'aliases': []})
    result = {'schemaVersion': 1, 'baseInventory': pin(base_path), 'sourceManifests': base['sourceManifests'],
              'newMaskInputs': pin(INPUTS / 'new-mask-inputs.json'), 'entries': entries,
              'newMaskPendingIds': pending, 'newImageGenFiles': natives,
              'historicalRepresentations': 66, 'newEditionRepresentations': len(entries) - 66,
              'scope': 'Frozen historical66 plus explicitly accepted new A/B editions; no canonical/runtime admission'}
    if accepted_path.is_file():
        result['acceptedNewMasks'] = pin(accepted_path)
    return result


def exact_copy(source, dest, write):
    if write:
        dest.parent.mkdir(parents=True, exist_ok=True)
        if dest.exists() and dest.read_bytes() != source.read_bytes():
            raise ValueError('Refusing to overwrite differing reference bytes')
        if not dest.exists():
            shutil.copyfile(source, dest)
    if not dest.is_file() or dest.read_bytes() != source.read_bytes():
        raise ValueError('Exact reference copy required')


def build(write, require_complete):
    protected = protection()
    inventory = prepare_inventory()
    combined_path = INPUTS / 'neutral-production-inventory.json'
    if not combined_path.is_file() or combined_path.read_bytes() != encoded(inventory):
        raise ValueError('Run --prepare-inventory after accepted source changes,then derive missing C')
    if require_complete and inventory['newMaskPendingIds']:
        raise ValueError('Missing accepted new A/B editions: ' + ', '.join(inventory['newMaskPendingIds']))
    receipts = load(PACK / 'generation/neutral-derivations.json')
    c_rows = {r['id']: r for r in receipts['entries']}
    if len(c_rows) != len(receipts['entries']) or set(c_rows) - {r['id'] for r in inventory['entries']}:
        raise ValueError('Duplicate/unregistered C derivative')
    pairs, derivatives, reused, reference_copies = [], [], [], []
    for row in inventory['entries']:
        identity = row['id']
        a = public_asset(row['sourceA'], 'A · Étude de l’édition photographiée — ImageGen' if row['sourcePack'] == 'neutral-new-edition' else 'A · Source de la paire antérieure')
        b = public_asset(row['sourceB'], 'B · Rendu source conservé')
        c = None
        if identity in c_rows:
            receipt = c_rows[identity]
            no_approval(receipt)
            c_path = relative(PUBLIC / 'neutral' / (identity + '.png'))
            if receipt['assetPath'] != c_path or receipt['version'] != 'C' or receipt['methodId'] != METHOD:
                raise ValueError('Explicit C path/version/method required')
            if receipt['sourceBPath'] != b['path'] or receipt['sourceBSha256'] != b['sha256'] or receipt['sourceStatus'] != row['sourceStatus']:
                raise ValueError('C source lineage or inherited qualification changed')
            c = public_asset({'path': c_path, 'sha256': receipt['sha256'], 'bytes': receipt['bytes']}, 'C · Neutre monochrome — dérivée technique')
            if c['mode'] != 'RGBA' or c['format'] != 'PNG' or c['nativeDimensions'] != b['nativeDimensions']:
                raise ValueError('C must retain native RGBA8 dimensions')
            if c['alpha']['sha256'] != b['alpha']['sha256'] or receipt['sourceAlphaSha256'] != b['alpha']['sha256'] or receipt['outputAlphaSha256'] != c['alpha']['sha256']:
                raise ValueError('C raw alpha changed')
            if receipt['alphaByteIdentical'] is not True or receipt['strictMonochrome'] is not True or receipt['newImageGeneration'] is not False or receipt['sourceFileMutation'] is not False:
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
            c['generationReceipt'] = pin(PACK / 'generation/neutral-derivations.json')
            c.update(generatedNew=False, sourceFileMutation=False)
            (reused if is_reuse else derivatives).append({k: c[k] for k in ('path', 'sha256', 'bytes')})
        elif require_complete:
            raise ValueError('Missing neutral C: ' + identity)
        r_assets = []
        if row['sourcePack'] == 'neutral-new-edition':
            for reference in row['referenceSources']:
                original = file(reference['path'])
                dest = PUBLIC / 'references' / identity / original.name
                exact_copy(original, dest, write)
                asset = public_asset(pin(dest), 'R · Photographie officielle — octets identiques')
                asset['originalSource'] = pin(original)
                reference_copies.append(pin(dest));r_assets.append(asset)
        else:
            for original in row.get('publicReferenceImages', []):
                r_assets.append(public_asset(original, 'R · Référence antérieure conservée'))
        status = deepcopy(row['sourceStatus'])
        pairs.append({**row, 'versionA': a, 'versionB': b, 'versionC': c, 'referenceImages': r_assets,
                      'sourceStatus': status, 'neutralAvailable': c is not None,
                      'canonCertified': False, 'humanArtValidated': False, 'runtimeIntegrated': False})
    new_native = inventory['newImageGenFiles']
    allowed = {r['path'] for r in new_native + derivatives + reused + reference_copies} | {relative(PUBLIC / 'manifest.json'), relative(PUBLIC / 'review.html')}
    if {relative(p) for p in PUBLIC.rglob('*') if p.is_file()} - allowed:
        raise ValueError('Unregistered neutral public files')
    inputs = [p for folder in (INPUTS, PACK / 'tools', PACK / 'generation', PACK / 'references') for p in folder.rglob('*')
              if p.is_file() and p.suffix != '.pyc' and '__pycache__' not in p.parts]
    inputs.extend([PACK / 'README.md', ROOT / 'production/p0-sprites-20261113/tools/workbook_lib.py'])
    counts = {'sourceBRepresentations': len(pairs), 'historicalBRepresentations': 66,
              'newEditionRepresentations': inventory['newEditionRepresentations'], 'neutralCProduced': sum(p['neutralAvailable'] for p in pairs),
              'newDerivedPngs': len(derivatives), 'sourceReuseC': len(reused), 'newCImageGenPngs': 0,
              'newABImageGenPngs': len(new_native), 'newImageGenPngs': len(new_native),
              'rawAlphaIdentical': sum(p['neutralAvailable'] for p in pairs),
              'strictMonochrome': sum(p['neutralAvailable'] for p in pairs),
              'provisionalInherited': sum(p['sourceStatus']['provisionalReviewOnly'] for p in pairs),
              'partialInherited': sum(p['sourceStatus']['partialReferenceView'] for p in pairs),
              'hybridInherited': sum(p['sourceStatus']['hybridStudy'] for p in pairs),
              'historicalCanonicalRequirementsStillOpen': 46, 'canonicalClosures': 0, 'runtimeIntegrations': 0}
    remaining = deepcopy(load(ROOT / 'public/game/biomasks-expansion-20261113/manifest.json')['remainingCanonicalTargets'])
    for task in remaining:
        additions = [p for p in pairs if p['sourcePack'] == 'neutral-new-edition' and p.get('relatedCanonicalTargetId') == task['id']]
        task['newReferenceFoundByNeutralBatch'] = bool(additions)
        if additions:
            task['referenceFoundByThisBatch'] = True
            task['currentEditionStudies'] = task.get('currentEditionStudies', []) + [
                {'editionId': p['id'], 'canonicalTargetId': task['id'], 'referenceFound': True,
                 'editionCandidateProduced': True, 'neutralCProduced': p['neutralAvailable'],
                 'canonCertified': False, 'canonicalRequirementClosed': False} for p in additions]
        if task.get('canonicalRequirementClosed') is not False or task.get('canonicalFidelityCertified') is not False:
            raise ValueError('All46 inherited canonical requirements must remain open')
    return {'schemaVersion': 1, 'id': 'biomasks-neutral-20261113', 'asOf': '2026-11-13', 'sourceBaselineCommit': BASE,
            'status': 'technical-neutral-derivatives-unvalidated-for-canon-or-runtime', 'methodId': METHOD,
            'counts': counts, 'pairs': pairs, 'baseInventory': inventory['baseInventory'],
            'sourceInventory': pin(combined_path), 'nativeFiles': new_native,
            'derivedFiles': sorted(derivatives, key=lambda r: r['path']), 'sourceCopies': sorted(reused + reference_copies, key=lambda r: r['path']),
            'inputPins': sorted([pin(p) for p in set(inputs)], key=lambda r: r['path']),
            'protectedSources': {**pin(FOLLOW / 'source-protection.json'), 'files': len(protected['files']), 'workbooks': 126, 'priorNativePngs': 145},
            'remainingCanonicalTargets': remaining,
            'canonCertified': False, 'humanArtValidated': False, 'runtimeIntegrated': False, 'allP0Closed': False,
            'allMasksGenerated': False, 'pixelEditingPerformed': True,
            'pixelEditingScope': 'User-authorized deterministic C RGB mapping only; A/B/R source bytes unchanged.'}, protected


def library():
    spec = importlib.util.spec_from_file_location('neutral_pure_xlsx', ROOT / 'production/p0-sprites-20261113/tools/workbook_lib.py')
    module = importlib.util.module_from_spec(spec);sys.modules[spec.name] = module;spec.loader.exec_module(module)
    return module


def workbook_data(manifest, protected, lib):
    summary = [['Mesure', 'Valeur', 'Portée']] + [[k, v, 'Dérivation/source ; aucune validation canon/humaine/runtime'] for k, v in manifest['counts'].items()]
    neutral = [['ID', 'Nom', 'B source', 'SHA B', 'C neutre', 'SHA C', 'Méthode', 'Alpha brut identique', 'RGB strictement égaux', 'État hérité']]
    references = [['ID', 'A source', 'B source', 'R', 'Vue', 'Limites']]
    limits = [['ID', 'État hérité', 'Note']]
    for p in manifest['pairs']:
        c = p['versionC'];b = p['versionB']
        neutral.append([p['id'], p['label'], b['path'], b['sha256'], lib.Link(c['path'], '../../../' + c['path']) if c else 'À produire',
                        c['sha256'] if c else '', METHOD, bool(c), bool(c), p['sourceStatus']])
        references.append([p['id'], p['versionA']['path'], b['path'], p['referenceSources'], p['camera'], p['limitations']])
        if p['sourceStatus']['provisionalReviewOnly'] or p['sourceStatus']['partialReferenceView'] or p['sourceStatus']['hybridStudy']:
            limits.append([p['id'], p['sourceStatus'], p['limitations']])
    method = [['Contrat', 'Valeur'], ['Méthode', METHOD], ['Formule RGB8', 'floor((2126R+7152G+722B+5000)/10000)'],
              ['Alpha', 'Chaque octet alpha décodé de B est repris sans seuil,recadrage ou redimensionnement'],
              ['Portée', 'Dérivée2D éclairée ; pas un albédo/PBR/UV3D ni intégration runtime'], ['Aperçu teinte', 'Affichage navigateur uniquement,aucunPNG changé/exporté']]
    remains = [['ID', 'Nom', 'État', 'Études d’éditions disponibles']] + [[r['id'], r['name'], 'Ouvert : C neutre ne ferme pas cette exigence canonique', r.get('currentEditionStudies', [])] for r in manifest['remainingCanonicalTargets']]
    historic = [['Chemin protégé', 'Octets', 'SHA256']] + [[r['path'], r['bytes'], r['sha256']] for r in protected['files']]
    tables = [('Résumé', summary), ('C neutres', neutral), ('Sources A-B-R', references), ('Méthode-alpha', method), ('Réserves héritées', limits), ('46 exigences ouvertes', remains), ('Sources protégées', historic)]
    return {'schemaVersion': 1, 'manifestSha256': digest(encoded(manifest)), 'sheets': [
        {'name': name, 'title': 'Yautja — neutralisation : ' + name, 'note': 'C technique monochrome ; source B,alpha et qualifications héritées préservés.',
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
        value = prepare_inventory();(INPUTS / 'neutral-production-inventory.json').write_bytes(encoded(value))
        print(json.dumps({'sourceBRecords': len(value['entries']), 'pendingNewA-B': value['newMaskPendingIds']}));return 0
    manifest, protected = build(args.write, args.require_complete)
    lib = library();data = workbook_data(manifest, protected, lib);raw = lib.build_workbook(data)
    compared = check_workbook(raw, data, lib)
    html = (PACK / 'tools/review-template.html').read_text().replace('__PACK_DATA__', json.dumps(manifest, ensure_ascii=False).replace('<', '\\u003c')).encode()
    outputs = {PUBLIC / 'manifest.json': encoded(manifest), PUBLIC / 'review.html': html,
               FOLLOW / 'Yautja_Masques_Neutres_20261113.xlsx': raw, FOLLOW / 'build-request.json': encoded(lib.serializable(data)),
               FOLLOW / 'coverage.json': encoded({'counts': manifest['counts'], 'canonicalClosures': 0, 'runtimeIntegrations': 0})}
    result = {'passed': True, 'manifestSha256': digest(encoded(manifest)), 'counts': manifest['counts'], 'workbookSha256': digest(raw),
              'gallerySha256': digest(html), 'cellsCompared': compared, 'protectedWorkbooks': 126, 'protectedNativeImageGenPngs': 145,
              'scope': 'Deterministic package,source pins,raw alpha and monochrome; independent verifier establishes exact integer pixel formula.'}
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
