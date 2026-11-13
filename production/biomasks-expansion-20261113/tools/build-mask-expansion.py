#!/usr/bin/env python3
"""Package native references and A/B candidates without creating or editing raster pixels."""
from __future__ import annotations
import argparse
from io import BytesIO
import hashlib
import importlib.util
import json
from pathlib import Path
import re
import shutil
import struct
import sys
from xml.etree import ElementTree as ET
from zipfile import ZipFile
from PIL import Image

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[3]
PACK = ROOT / 'production/biomasks-expansion-20261113'
PUBLIC = ROOT / 'public/game/biomasks-expansion-20261113'
INPUTS, FOLLOW = PACK / 'inputs', PACK / 'suivi'
BASE = '065f3cd9f810c0d704ba4fc29323fc8a33c4c152'
OLD_PACKS = ('p0-sprites-20261113', 'p0-fidelity-20261113', 'biomasks-20261113',
             'biomasks-primary-20261113', 'biomasks-dual-20261113')
OLD_WORKFLOWS = ('p0-sprite-candidates.yml', 'biomask-candidates.yml',
                 'primary-biomask-candidates.yml', 'dual-biomask-candidates.yml')
FLAGS = ('canonCertified', 'humanArtValidated', 'runtimeIntegrated', 'pixelEditingPerformed', 'animated')
NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'


def encoded(value):
    return (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode()


def load(path):
    return json.loads(path.read_bytes())


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def relative(path):
    return path.resolve().relative_to(ROOT).as_posix()


def file(value):
    if not isinstance(value, str) or not value or '\\' in value or any(ord(c) < 32 or ord(c) == 127 for c in value):
        raise ValueError('Invalid repository path')
    p = Path(value)
    if p.is_absolute() or '..' in p.parts or p.as_posix() != value:
        raise ValueError('Normalized repository-relative file required')
    target = ROOT / p
    if target.is_symlink() or not target.resolve().is_relative_to(ROOT) or not target.is_file():
        raise ValueError('Missing regular repository file: ' + value)
    return target


def pin(path):
    raw = path.read_bytes()
    return {'path': relative(path), 'sha256': sha(raw), 'bytes': len(raw)}


def assert_pin(record):
    actual = pin(file(record['path']))
    if actual['sha256'] != record['sha256'] or ('bytes' in record and actual['bytes'] != record['bytes']):
        raise ValueError('Pinned source changed: ' + record['path'])


def no_approval(row, label):
    if any(row.get(flag) is True for flag in FLAGS):
        raise ValueError('Automatic approval forbidden: ' + label)


def source_index():
    data = load(INPUTS / 'available-designs.json')
    if data.get('schemaVersion') != 1 or data.get('auditedHead') != BASE:
        raise ValueError('Wrong source inventory baseline')
    ids = [r['id'] for r in data['targets']]
    if len(set(ids)) != len(ids) or not set(data['mandatoryCommunityIds']).issubset(ids):
        raise ValueError('Duplicate identities or missing mandatory community references')
    for row in data['targets']:
        if not re.fullmatch(r'[a-z0-9][a-z0-9_-]+', row['id']):
            raise ValueError('Unsafe source identity')
        no_approval(row, row['id'])
        if row.get('artisticReview'):
            assert_pin({'path': row['artisticReview']['reportPath'], 'sha256': row['artisticReview']['reportSha256']})
        if row['versionAMode'] not in {'source-copy', 'imagegen'}:
            raise ValueError('A must explicitly declare copy or ImageGen')
        source = file(row['sourcePath'])
        if not source.is_relative_to(PACK / 'references') or pin(source)['sha256'] != row['sourceSha256']:
            raise ValueError('Missing exact source reference: ' + row['id'])
        for reference in row['referenceSources']:
            assert_pin(reference)
        if row['sourceClass'] == 'secondary-port-capture':
            with Image.open(source) as image:
                if image.format != 'PNG' or image.mode != 'RGB' or image.size != (256, 257):
                    raise ValueError('Community A is the unchanged RGB256x257 black reference capture')
            texture = next(r for r in row['referenceSources'] if r['path'].endswith('.texture'))
            raw = file(texture['path']).read_bytes()
            if (raw[:4] != b'DDS ' or struct.unpack_from('<II', raw, 12) != (256, 256)
                    or raw[84:88] != b'DXT5'):
                raise ValueError('Native community DDS proof must remain256x256DXT5')
        elif row['sourceClass'] not in {'official-photo-prototype', 'official-photo', 'secondary-community-render'}:
            raise ValueError('Unqualified source class')
    return data


def protected_paths():
    inherited = load(ROOT / 'production/biomasks-dual-20261113/suivi/source-protection.json')
    paths = {r['path'] for r in inherited['files']}
    for name in OLD_PACKS:
        for prefix in ('production', 'public/game'):
            paths.update(relative(p) for p in (ROOT / prefix / name).rglob('*')
                         if p.is_file() and '__pycache__' not in p.parts and p.suffix != '.pyc')
    paths.update('.github/workflows/' + name for name in OLD_WORKFLOWS)
    return paths


def freeze():
    records = [pin(file(path)) for path in sorted(protected_paths())]
    result = {'schemaVersion': 1, 'sourceBaselineCommit': BASE, 'files': records,
              'protectedWorkbooks': sum(r['path'].endswith('.xlsx') for r in records),
              'priorNativeImageGenPngs': 114, 'priorPacks': list(OLD_PACKS), 'sourceStatusesChanged': False}
    if result['protectedWorkbooks'] != 125:
        raise ValueError('All125 previous workbooks must be preserved')
    path = FOLLOW / 'source-protection.json'
    if path.exists() and path.read_bytes() != encoded(result):
        raise ValueError('Refusing to replace the historical protection snapshot')
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists():
        path.write_bytes(encoded(result))
    return result


def protection():
    data = load(FOLLOW / 'source-protection.json')
    if {r['path'] for r in data['files']} != protected_paths() or data['protectedWorkbooks'] != 125:
        raise ValueError('Historical preservation membership changed')
    for record in data['files']:
        assert_pin(record)
    native = [r for name in OLD_PACKS for r in load(ROOT / 'public/game' / name / 'manifest.json')['nativeFiles']]
    if len(native) != 114 or not {r['path'] for r in native}.issubset(protected_paths()):
        raise ValueError('All114 prior native ImageGen files must remain protected')
    return data


def metrics(path, generated=False, proposed=None):
    with Image.open(path) as image:
        image.load()
        if image.width * image.height > 16777216 or image.format not in {'PNG', 'JPEG', 'WEBP'}:
            raise ValueError('Unsupported native reference image')
        width, height = image.size
        has_alpha = 'A' in image.getbands()
        alpha_data = {'available': has_alpha}
        bounds = list(proposed or [0, 0, width, height])
        if has_alpha:
            alpha = image.getchannel('A')
            histogram = alpha.histogram()
            core = alpha.point(lambda v: 255 if v >= 16 else 0).getbbox()
            if not core:
                raise ValueError('Empty alpha image')
            bounds = list(core)
            margins = [core[0], core[1], width - core[2], height - core[3]]
            visible, opaque = sum(histogram[16:]), sum(histogram[240:])
            alpha_data.update(threshold=16, bounds16=bounds, marginsPixels=margins,
                              transparentPixels=histogram[0], visiblePixels16=visible,
                              opaquePixels240=opaque, nearOpaqueFractionOfVisible16=opaque / visible,
                              coreDoesNotTouchFrameEdges=min(margins) > 0)
        if generated and (image.format != 'PNG' or image.mode != 'RGBA' or not has_alpha
                          or not alpha_data['transparentPixels'] or min(alpha_data['marginsPixels']) <= 0
                          or alpha_data['nearOpaqueFractionOfVisible16'] < .8):
            raise ValueError('Generated mask requires native RGBA PNG, real alpha and unclipped solid silhouette')
        if not (0 <= bounds[0] < bounds[2] <= width and 0 <= bounds[1] < bounds[3] <= height):
            raise ValueError('Invalid proposed viewer bounds')
        return {'format': image.format, 'mode': image.mode, 'width': width, 'height': height,
                'alpha': alpha_data, 'displayBounds': bounds,
                'displayBoundsQualification': 'Native alpha>=16' if has_alpha else 'Proposed review frame only; exact reference file unchanged'}


def copy_exact(source, dest, write):
    if write:
        dest.parent.mkdir(parents=True, exist_ok=True)
        if dest.exists() and dest.read_bytes() != source.read_bytes():
            raise ValueError('Refusing to overwrite different reference-copy bytes')
        if not dest.exists():
            shutil.copyfile(source, dest)
    if not dest.is_file() or dest.read_bytes() != source.read_bytes():
        raise ValueError('Exact reference copy required: ' + relative(dest))


def asset(path, generated=False, proposed=None):
    return {**pin(path), **metrics(path, generated, proposed),
            'url': '/' + path.relative_to(ROOT / 'public').as_posix(),
            'canonCertified': False, 'humanArtValidated': False, 'runtimeIntegrated': False,
            'pixelEditingPerformed': False, 'newImageGeneration': generated}


def generation(row, version, source, expected_path, seen, references, qualification=None):
    no_approval(row, row['id'] + ' ' + version)
    if (row['version'] != version or row['renderMode'] != 'imagegen' or row['generatedNew'] is not True
            or row['assetPath'] != relative(expected_path)):
        raise ValueError('Explicit generation version and exact output path required')
    path = file(row['assetPath'])
    actual = pin(path)
    if actual['sha256'] != row['sha256'] or actual['bytes'] != row['bytes'] or actual['sha256'] in seen:
        raise ValueError('Generated native bytes mismatched or reused')
    seen.add(actual['sha256'])
    origin = row['nativeSourcePath']
    if (not isinstance(origin, str) or not origin.startswith('/workspace/generated_images/')
            or '..' in Path(origin).parts or not origin.endswith('.png')):
        raise ValueError('Native ImageGen origin required')
    if 'origin:' + origin in seen:
        raise ValueError('Each generated version needs a distinct native ImageGen origin')
    seen.add('origin:' + origin)
    if Path(origin).is_file() and Path(origin).read_bytes() != path.read_bytes():
        raise ValueError('Public copy differs from native ImageGen pixels')
    receipt_path = file(row['generationReceipt'])
    if not receipt_path.is_relative_to(PACK / 'generation'):
        raise ValueError('Generation receipt outside current pack')
    matches = [r for r in load(receipt_path)['entries'] if r['id'] == row['id'] and r.get('version') == version]
    if len(matches) != 1:
        raise ValueError('Receipt id/version missing or duplicated')
    receipt = matches[0]
    no_approval(receipt, 'receipt ' + row['id'])
    for key in ('assetPath', 'sha256', 'bytes', 'nativeDimensions', 'nativeSourcePath', 'version', 'renderMode'):
        if receipt.get(key) != row[key]:
            raise ValueError('Receipt lineage differs: ' + key)
    if receipt.get('generatedNew') is not True:
        raise ValueError('Receipt must explicitly declare generatedNew=true')
    if not receipt.get('prompt') or receipt['renderMode'] != 'imagegen':
        raise ValueError('Actual generation prompt required')
    for key, expected in (qualification or {}).items():
        values = (row.get(key), receipt.get(key))
        if any((value is not expected) if isinstance(expected, bool) else value != expected for value in values):
            raise ValueError('Frozen provisional artistic qualification changed: ' + key)
    lineage = ('sourceAPath', 'sourceASha256') if version == 'B' else ('referenceSourcePath', 'referenceSourceSha256')
    if row[lineage[0]] != source['path'] or row[lineage[1]] != source['sha256']:
        raise ValueError('Wrong A/reference lineage')
    for key in lineage:
        if receipt[key] != row[key]:
            raise ValueError('Receipt source lineage differs')
    if references:
        expected = {(r['path'], r['sha256']) for r in references}
        for value in (row, receipt):
            if {(r['path'], r['sha256']) for r in value['referenceSources']} != expected:
                raise ValueError('All exact R photographs must be retained in A/B lineage')
    result = asset(path, True)
    if row['nativeDimensions'] != [result['width'], result['height']]:
        raise ValueError('Native dimensions differ')
    result.update(renderMode='imagegen', byteExactSourceCopy=False, nativeCopyIdentical=True,
                  generationRecord=pin(receipt_path), nativeOriginRecorded=True,
                  limitations=row.get('limitations', []))
    result.update(qualification or {})
    return result


def build(write, require_complete):
    index, protected = source_index(), protection()
    accepted = load(INPUTS / 'accepted-outputs.json')
    b_rows, a_rows = {}, {}
    for field, dest in [('entries', b_rows), ('originalGenerations', a_rows)]:
        for row in accepted.get(field, []):
            if row['id'] in dest:
                raise ValueError('Duplicate accepted identity/version')
            dest[row['id']] = row
    ids = {r['id'] for r in index['targets']}
    if (set(b_rows) | set(a_rows)) - ids:
        raise ValueError('Unregistered accepted identity')
    pairs, copies, natives, seen = [], [], [], set()
    for target in index['targets']:
        identity = target['id']
        source = pin(file(target['sourcePath']))
        a_path = PUBLIC / 'originals' / (identity + '.png')
        refs = target['referenceSources'] if target['versionAMode'] == 'imagegen' else []
        if target['versionAMode'] == 'source-copy':
            if identity in a_rows:
                raise ValueError('A byte copy cannot be announced as a generation')
            copy_exact(file(target['sourcePath']), a_path, write)
            a = asset(a_path, False, target['viewerMaskBounds'])
            a.update(renderMode='source-copy', byteExactSourceCopy=True, originalSource=source,
                     label='A · Référence secondaire — octets identiques')
            copies.append(pin(a_path))
            b_source = source
        else:
            if identity not in a_rows:
                raise ValueError('Generated A missing: ' + identity)
            a = generation(a_rows[identity], 'A', source, a_path, seen, refs)
            a['label'] = ('A · Étude fidèle au prototype — ImageGen' if target['sourceClass'] == 'official-photo-prototype'
                          else 'A · Étude fidèle à l’édition photographiée — ImageGen')
            a['originalSource'] = source
            natives.append(pin(a_path))
            b_source = pin(a_path)
        reference_images = []
        for reference in refs:
            source_r = file(reference['path'])
            dest = PUBLIC / 'references' / identity / source_r.name
            copy_exact(source_r, dest, write)
            r_asset = asset(dest)
            r_asset.update(label='R · Référence officielle — octets identiques', originalSource=pin(source_r),
                           sourceKind='official-concept' if 'concept' in source_r.stem else 'official-product-photo',
                           byteExactSourceCopy=True, renderMode='source-copy')
            copies.append(pin(dest))
            reference_images.append(r_asset)
        b = None
        if identity in b_rows:
            b = generation(b_rows[identity], 'B', b_source, PUBLIC / 'phg' / (identity + '.png'), seen, refs,
                           target.get('requiredBQualification'))
            if b['sha256'] == a['sha256']:
                raise ValueError('B must be a distinct new generation')
            b['label'] = ('B · Étude provisoire — réserve majeure à reprendre' if target.get('requiredBQualification')
                          else 'B · Rendu PHG — candidat ImageGen')
            natives.append({k: b[k] for k in ('path', 'sha256', 'bytes')})
        pairs.append({**target, 'pairId': identity + '::source-view', 'versionA': a, 'versionB': b,
                      'referenceImages': reference_images, 'pairCandidateComplete': b is not None,
                      'aliases': [], 'hybridStudy': False, 'partialReferenceView': target.get('partialReferenceView', False),
                      'scopeLabel': 'Prototype NECA — Not Final Product' if target['sourceClass'] == 'official-photo-prototype'
                      else 'Édition NECA — masque rigide visible partiel' if target.get('partialReferenceView')
                      else 'Édition NECA — étude liée aux photographies' if target['sourceClass'] == 'official-photo'
                      else 'Référence secondaire du port communautaire',
                      'animationClips': 0})
        pairs[-1]['provisionalReviewOnly'] = bool(target.get('requiredBQualification'))
    missing = [p['id'] for p in pairs if not p['pairCandidateComplete']]
    if require_complete and missing:
        raise ValueError('Missing B generations: ' + ', '.join(missing))
    remaining = load(ROOT / 'public/game/biomasks-dual-20261113/manifest.json')['remainingCanonicalTargets']
    if len(remaining) != 46:
        raise ValueError('The46 prior canonical targets remain open')
    coverage_links = [{'editionId': p['id'], 'canonicalTargetId': p['relatedCanonicalTargetId'],
                       'referenceFound': True, 'editionCandidateProduced': p['pairCandidateComplete'],
                       'canonCertified': False, 'canonicalRequirementClosed': False}
                      for p in pairs if p.get('relatedCanonicalTargetId')]
    remaining = [{**r, 'referenceFoundByThisBatch': any(l['canonicalTargetId'] == r['id'] for l in coverage_links),
                  'currentEditionStudies': [l for l in coverage_links if l['canonicalTargetId'] == r['id']],
                  'canonicalRequirementClosed': False} for r in remaining]
    input_files = [p for folder in (INPUTS, PACK / 'generation', PACK / 'references', PACK / 'tools')
                   for p in folder.rglob('*') if p.is_file() and p.suffix != '.pyc' and '__pycache__' not in p.parts]
    input_files.extend([PACK / 'README.md', ROOT / 'production/p0-sprites-20261113/tools/workbook_lib.py'])
    allowed = {r['path'] for r in copies + natives} | {relative(PUBLIC / 'manifest.json'), relative(PUBLIC / 'review.html')}
    extras = {relative(p) for p in PUBLIC.rglob('*') if p.is_file()} - allowed
    if extras:
        raise ValueError('Unregistered public files: ' + repr(sorted(extras)))
    counts = {'sourceDesignRecords': len(pairs), 'versionACopies': sum(not p['versionA']['newImageGeneration'] for p in pairs),
              'newAGenerations': sum(p['versionA']['newImageGeneration'] for p in pairs),
              'newBGenerations': len(b_rows), 'newImageGenPngs': len(natives),
              'completeCandidatePairs': len(pairs) - len(missing), 'representations': len(pairs) + len(b_rows),
              'byteCompleteComparisons': len(pairs) - len(missing),
              'reviewedWithoutMajorDeviationPairs': sum(p['artisticReview']['noMajorDeviationObserved'] for p in pairs),
              'provisionalReviewOnlyPairs': sum(p['provisionalReviewOnly'] for p in pairs),
              'provisionalImageGenPngs': sum(p['provisionalReviewOnly'] and p['versionB'] is not None for p in pairs),
              'exactReferenceImageCopies': sum(len(p['referenceImages']) for p in pairs),
              'exactReferencePhotoCopies': sum(r['sourceKind'] == 'official-product-photo' for p in pairs for r in p['referenceImages']),
              'exactReferenceConceptCopies': sum(r['sourceKind'] == 'official-concept' for p in pairs for r in p['referenceImages']),
              'communitySourceRecords': sum(p['sourceClass'] == 'secondary-port-capture' for p in pairs),
              'editionSpecificPrototypes': sum(p['sourceClass'] == 'official-photo-prototype' for p in pairs),
              'partialVisibleMaskStudies': sum(p['partialReferenceView'] for p in pairs),
              'canonicalNamesStillWithoutValidatedCutout': 46, 'newlyCertifiedCanonicalNames': 0,
              'canonicalNamesWithNewSourceEditionStudies': len({r['canonicalTargetId'] for r in coverage_links}),
              'humanArtValidatedAssets': 0, 'runtimeIntegratedAssets': 0, 'animationClips': 0}
    return {'schemaVersion': 1, 'id': 'biomasks-expansion-20261113', 'asOf': '2026-11-13',
            'sourceBaselineCommit': BASE, 'status': 'source-qualified-candidates-review-required', 'counts': counts,
            'pairs': pairs, 'remainingCanonicalTargets': remaining, 'coverageLinks': coverage_links, 'aliases': [],
            'plannedBatch': {'missingBIds': missing, 'allSelectedPairsRepresented': not missing,
                             'scope': 'Byte availability only; does not resolve the provisional artistic deviation.'},
            'nativeFiles': sorted(natives, key=lambda r: r['path']), 'sourceCopies': sorted(copies, key=lambda r: r['path']),
            'inputPins': sorted([pin(p) for p in set(input_files)], key=lambda r: r['path']),
            'protectedSources': {**pin(FOLLOW / 'source-protection.json'), 'files': len(protected['files']),
                                 'workbooks': 125, 'priorNativePngs': 114},
            'canonCertified': False, 'humanArtValidated': False, 'runtimeIntegrated': False,
            'allMasksGenerated': False, 'allP0Closed': False, 'pixelEditingPerformed': False}, protected


def library():
    spec = importlib.util.spec_from_file_location('expansion_pure_xlsx', ROOT / 'production/p0-sprites-20261113/tools/workbook_lib.py')
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def workbook_data(manifest, protected, lib):
    c = manifest['counts']
    summary = [['Mesure', 'Valeur', 'Limite']] + [[key, value, 'Candidats/source, aucune clôture canon/humaine/runtime'] for key, value in c.items()]
    pairs = [['ID', 'Nom', 'Classe source', 'A', 'Mode A', 'SHA A', 'B', 'SHA B', 'Vue', 'Limites', 'Fichiers A/B présents', 'État artistique']]
    sources = [['ID', 'Référence source', 'SHA', 'Attribution', 'Nature', 'ImageGen A', 'Précautions']]
    for p in manifest['pairs']:
        a, b = p['versionA'], p['versionB']
        pairs.append([p['id'], p['label'], p['sourceClass'], lib.Link(a['path'], '../../../' + a['path']), a['renderMode'], a['sha256'],
                      lib.Link(b['path'], '../../../' + b['path']) if b else 'À générer', b['sha256'] if b else '', p['camera'], p['limitations'], p['pairCandidateComplete'],
                      'PROVISOIRE — largeur≈+11%,refusé pour version fidèle,à reprendre' if p['provisionalReviewOnly']
                      else 'Aucun écart majeur observé ; validation humaine/canonique ouverte'])
        for r in p['referenceSources']:
            sources.append([p['id'], r['path'], r['sha256'], p['attribution'], p['sourceScope'], a['newImageGeneration'], p['limitations']])
    remains = [['ID', 'Nom', 'Sources bible', 'Études d’édition disponibles', 'État']] + [
        [r['id'], r['name'], r.get('sourceLocations', []), r['currentEditionStudies'],
         'Ouvert — source d’édition trouvée, candidate produite sans validation canonique' if r['currentEditionStudies']
         else 'Ouvert — aucune validation automatique par ce lot'] for r in manifest['remainingCanonicalTargets']]
    variants = [['ID', 'Base antérieure', 'État']] + [[p['id'], p['baseAlreadyRepresented'], 'Variante communautaire ; nouvelle géométrie canonique non établie'] for p in manifest['pairs'] if p['baseAlreadyRepresented']]
    historic = [['Chemin protégé', 'Octets', 'SHA256', 'Inchangé']] + [[r['path'], r['bytes'], r['sha256'], True] for r in protected['files']]
    tables = [('Synthèse', summary), ('Paires A-B', pairs), ('Références R', sources), ('Variantes', variants), ('46 restants ouverts', remains), ('Sources protégées', historic)]
    return {'schemaVersion': 1, 'counts': c, 'manifestSha256': sha(encoded(manifest)), 'sheets': [
        {'name': name, 'title': 'Yautja — expansion masques : ' + name, 'note': 'Références exactes et candidats natifs ; canon/humain/runtime ouverts.',
         'headerRow': 4, 'rows': values, 'widths': [100] * len(values[0])} for name, values in tables]}


def verify_xlsx(raw, data, lib):
    count = 0
    with ZipFile(BytesIO(raw)) as z:
        if z.testzip():
            raise ValueError('Corrupt workbook ZIP')
        for name in z.namelist():
            if name.endswith(('.xml', '.rels')):
                ET.fromstring(z.read(name))
        names = [s.attrib['name'] for s in ET.fromstring(z.read('xl/workbook.xml')).find('{' + NS + '}sheets')]
        if names != [s['name'] for s in data['sheets']]:
            raise ValueError('Workbook sheet membership differs')
        for number, sheet in enumerate(data['sheets'], 1):
            cells = {c.attrib['r']: c for c in ET.fromstring(z.read(f'xl/worksheets/sheet{number}.xml')).iter('{' + NS + '}c')}
            for rn, values in enumerate(sheet['rows'], 4):
                for cn, value in enumerate(values, 1):
                    expected = value.label if isinstance(value, lib.Link) else lib.compact(value)
                    if isinstance(value, (int, float)) and not isinstance(value, bool):
                        expected = str(value)
                    if ''.join(cells[lib.column(cn) + str(rn)].itertext()) != expected:
                        raise ValueError('Workbook cell mismatch')
                    count += 1
    return count


def main(arguments=None):
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    for name in ('write', 'check', 'freeze-sources'):
        mode.add_argument('--' + name, action='store_true')
    parser.add_argument('--require-complete', action='store_true')
    args = parser.parse_args(arguments)
    if args.freeze_sources:
        p = freeze()
        print(json.dumps({'protectedFiles': len(p['files']), 'workbooks': p['protectedWorkbooks']}))
        return 0
    manifest, protected = build(args.write, args.require_complete)
    lib = library()
    data = workbook_data(manifest, protected, lib)
    workbook = lib.build_workbook(data)
    cells = verify_xlsx(workbook, data, lib)
    html = (PACK / 'tools/review-template.html').read_text().replace('__PACK_DATA__', json.dumps(manifest, ensure_ascii=False).replace('<', '\\u003c')).encode()
    outputs = {PUBLIC / 'manifest.json': encoded(manifest), PUBLIC / 'review.html': html,
               FOLLOW / 'Yautja_Expansion_Masques_20261113.xlsx': workbook,
               FOLLOW / 'build-request.json': encoded(lib.serializable(data)),
               FOLLOW / 'coverage.json': encoded({'counts': manifest['counts'], 'remainingCanonicalNamesOpen': 46,
                    'allP0Closed': False, 'allMasksGenerated': False, 'sourceStatusesChanged': False})}
    result = {'passed': True, 'manifestSha256': sha(encoded(manifest)), 'counts': manifest['counts'],
              'gallerySha256': sha(html), 'workbookSha256': sha(workbook), 'cellsCompared': cells,
              'protectedFiles': len(protected['files']), 'protectedWorkbooks': 125, 'priorNativePngs': 114,
              'scope': 'Exact reference copies, native generated pixels and deterministic workbook; no artistic/canonical/runtime certification'}
    outputs[FOLLOW / 'verification.json'] = encoded(result)
    for path, raw in outputs.items():
        if args.write:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(raw)
        elif not path.is_file() or path.read_bytes() != raw:
            raise ValueError('Deterministic output differs: ' + relative(path))
    print(json.dumps(result, ensure_ascii=False))
    return 0


if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except Exception as error:
        message = (type(error).__name__ + ': ' + str(error)).replace('%', '%25').replace('\r', '%0D').replace('\n', '%0A')
        print('::error::' + message, file=sys.stderr)
        raise
