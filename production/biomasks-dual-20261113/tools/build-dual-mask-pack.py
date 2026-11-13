#!/usr/bin/env python3
"""Build A/B project-mask candidates without editing or re-encoding any raster."""
from __future__ import annotations

import argparse
from io import BytesIO
import hashlib
import importlib.util
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
PACK = ROOT / 'production/biomasks-dual-20261113'
PUBLIC = ROOT / 'public/game/biomasks-dual-20261113'
INPUTS, FOLLOW = PACK / 'inputs', PACK / 'suivi'
BASE = '6929a45eae299c550192ecb77ef44a03862e4c5e'
OLD_PACKS = ('p0-sprites-20261113', 'p0-fidelity-20261113', 'biomasks-20261113', 'biomasks-primary-20261113')
OLD_WORKFLOWS = ('p0-sprite-candidates.yml', 'biomask-candidates.yml', 'primary-biomask-candidates.yml')
NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
APPROVALS = ('canonCertified', 'humanArtValidated', 'runtimeIntegrated', 'pixelEditingPerformed', 'animated')


def encoded(value):
    return (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode()


def load(path):
    return json.loads(path.read_bytes())


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def relative(path):
    return path.resolve().relative_to(ROOT).as_posix()


def repository_file(value):
    if (not isinstance(value, str) or not value or '\\' in value
            or any(ord(c) < 32 or ord(c) == 127 for c in value)):
        raise ValueError('Invalid repository-relative path')
    p = Path(value)
    if p.is_absolute() or '..' in p.parts or value != p.as_posix():
        raise ValueError('Only normalized repository-relative paths are accepted: ' + value)
    target = ROOT / p
    if target.is_symlink() or not target.resolve().is_relative_to(ROOT) or not target.is_file():
        raise ValueError('Missing regular repository file: ' + value)
    return target


def pin(path):
    raw = path.read_bytes()
    return {'path': relative(path), 'bytes': len(raw), 'sha256': digest(raw)}


def assert_pin(row):
    actual = pin(repository_file(row['path']))
    if actual['bytes'] != row['bytes'] or actual['sha256'] != row['sha256']:
        raise ValueError('Pinned file changed: ' + row['path'])


def no_approval(row, label):
    if any(row.get(key) is True for key in APPROVALS):
        raise ValueError('Automatic approval is forbidden: ' + label)


def representation_mode(row):
    value = row.get('renderMode', row.get('mode', 'imagegen'))
    # Some ImageGen receipts use Pillow's established "mode=RGBA" metadata.
    # That is not a render/reuse decision. New records may use renderMode.
    if value is None or value in {'RGBA', 'RGB', 'P', 'LA'}:
        return 'imagegen'
    if value not in {'imagegen', 'source-reuse'}:
        raise ValueError('Unknown B representation mode')
    return value


def camera_text(value):
    if isinstance(value, str):
        return value
    if isinstance(value, dict):
        return value.get('camera') or value.get('view') or json.dumps(value, ensure_ascii=False)
    return str(value)


def source_index():
    data = load(INPUTS / 'available-designs.json')
    if data.get('schemaVersion') != 1 or data.get('auditedHead') != BASE:
        raise ValueError('Unexpected source-design inventory baseline')
    targets = data['targets']
    ids = [row['id'] for row in targets]
    if len(ids) != 46 or len(set(ids)) != 46 or len({r['sourcePath'] for r in targets}) != 46:
        raise ValueError('Exactly 46 distinct existing source records are required')
    for row in targets:
        if not re.fullmatch(r'[a-z0-9][a-z0-9-]+', row['id']):
            raise ValueError('Unsafe target ID')
        no_approval(row, row['id'])
        source = repository_file(row['sourcePath'])
        if not row['sourcePath'].startswith('public/game/') or source.suffix not in {'.png', '.webp'}:
            raise ValueError('Version A must be an existing public PNG/WebP project asset')
        if pin(source)['sha256'] != row['sourceSha256']:
            raise ValueError('Original source bytes changed: ' + row['id'])
    for record in data['pins']:
        assert_pin(record)
    return data


def required_protected_paths(index):
    inherited = load(ROOT / 'production/biomasks-primary-20261113/suivi/source-protection.json')
    paths = {row['path'] for row in inherited['files']}
    for name in OLD_PACKS:
        for prefix in ('production', 'public/game'):
            paths.update(relative(p) for p in (ROOT / prefix / name).rglob('*')
                         if p.is_file() and '__pycache__' not in p.parts and p.suffix != '.pyc')
    paths.update('.github/workflows/' + name for name in OLD_WORKFLOWS)
    for target in index['targets']:
        paths.add(target['sourcePath'])
        for alias in target.get('aliasRecords', []):
            if alias.get('originalAliasAssetPath'):
                paths.add(alias['originalAliasAssetPath'])
        for location in target.get('sourceLocations', []):
            paths.add(location['path'])
    paths.update(row['path'] for row in index['pins'])
    return paths


def freeze_sources():
    files = [pin(repository_file(p)) for p in sorted(required_protected_paths(source_index()))]
    result = {'schemaVersion': 1, 'asOf': '2026-11-13', 'sourceBaselineCommit': BASE,
              'scope': 'Four historical packs, prior workbooks, selected A originals and aliases',
              'files': files, 'protectedWorkbooks': sum(r['path'].endswith('.xlsx') for r in files),
              'priorNativeCandidatePngs': 69, 'sourceStatusesChanged': False}
    if result['protectedWorkbooks'] != 124:
        raise ValueError('Expected all 124 previous XLSX')
    raw, target = encoded(result), FOLLOW / 'source-protection.json'
    if target.exists() and target.read_bytes() != raw:
        raise ValueError('Refusing to replace the frozen protection snapshot')
    target.parent.mkdir(parents=True, exist_ok=True)
    if not target.exists():
        target.write_bytes(raw)
    return result


def protection(index):
    data = load(FOLLOW / 'source-protection.json')
    paths = [r['path'] for r in data['files']]
    if len(paths) != len(set(paths)) or set(paths) != required_protected_paths(index):
        raise ValueError('Historical protection membership changed')
    if data['protectedWorkbooks'] != 124 or sum(p.endswith('.xlsx') for p in paths) != 124:
        raise ValueError('All 124 previous workbooks must remain protected')
    for row in data['files']:
        assert_pin(row)
    native = [row for name in OLD_PACKS for row in load(ROOT / 'public/game' / name / 'manifest.json')['nativeFiles']]
    if len(native) != 69 or not {r['path'] for r in native}.issubset(paths):
        raise ValueError('All 69 previous native candidate PNGs must remain protected')
    return data


def image_metrics(path, generated):
    with Image.open(path) as image:
        image.load()
        if image.format not in {'PNG', 'WEBP'} or (generated and image.format != 'PNG'):
            raise ValueError('Unsupported native image format: ' + relative(path))
        if image.mode != 'RGBA' or image.width * image.height > 16777216:
            raise ValueError('A real native RGBA image is required: ' + relative(path))
        alpha = image.getchannel('A')
        histogram = alpha.histogram()
        bounds = alpha.point(lambda x: 255 if x >= 16 else 0).getbbox()
        if not bounds or not histogram[0] or not sum(histogram[240:]):
            raise ValueError('Transparent surround and visible solid material required')
        w, h = image.size
        left, top, right, bottom = bounds
        margins = [left, top, w - right, h - bottom]
        if min(margins) <= 0:
            raise ValueError('Visible silhouette touches native frame: ' + relative(path))
        visible, opaque = sum(histogram[16:]), sum(histogram[240:])
        if generated and opaque / visible < .8:
            raise ValueError('Generated mask has insufficient opaque material')
        return {'format': image.format, 'mode': image.mode, 'width': w, 'height': h,
                'alpha': {'threshold': 16, 'bounds16': list(bounds), 'marginsPixels': margins,
                          'transparentPixels': histogram[0], 'visiblePixels16': visible,
                          'opaquePixels240': opaque, 'nearOpaqueFractionOfVisible16': opaque / visible,
                          'coreDoesNotTouchFrameEdges': True,
                          'hiddenLowAlphaRgbDoesNotEstablishVisibleFringe': True}}


def originals(index, write):
    records = {}
    for target in index['targets']:
        source = repository_file(target['sourcePath'])
        dest = PUBLIC / 'originals' / (target['id'] + source.suffix)
        raw = source.read_bytes()
        if write:
            dest.parent.mkdir(parents=True, exist_ok=True)
            if dest.exists() and dest.read_bytes() != raw:
                raise ValueError('Refusing to overwrite a different A copy: ' + target['id'])
            if not dest.exists():
                shutil.copyfile(source, dest)
        if not dest.is_file() or dest.read_bytes() != raw:
            raise ValueError('Version A must be a byte-identical copy: ' + target['id'])
        records[target['id']] = {**pin(dest), **image_metrics(dest, False),
            'versionKind': 'existing-project-original', 'url': '/' + dest.relative_to(ROOT / 'public').as_posix(),
            'label': 'A · Original du projet — octets identiques', 'originalSource': pin(source),
            'byteExactSourceCopy': True, 'newImageGeneration': False,
            'sourceIdentityIsNotCanonicalCertification': True, 'canonCertified': False,
            'humanArtValidated': False, 'runtimeIntegrated': False, 'pixelEditingPerformed': False}
    return records


def build(require_complete, write_originals):
    index = source_index()
    protected = protection(index)
    a_records = originals(index, write_originals)
    selected, b_hashes, generated_files, reused_b_files = {}, set(), [], []
    for row in load(INPUTS / 'accepted-outputs.json')['entries']:
        identity = row['id']
        if identity in selected:
            raise ValueError('Duplicate B identity: ' + identity)
        target = next((t for t in index['targets'] if t['id'] == identity), None)
        if target is None:
            raise ValueError('Unregistered B identity: ' + identity)
        no_approval(row, identity + ' accepted')
        if row['sourceAPath'] != target['sourcePath'] or row['sourceASha256'] != target['sourceSha256']:
            raise ValueError('B source lineage differs from A: ' + identity)
        mode = representation_mode(row)
        generated = mode == 'imagegen'
        if not generated and row.get('generatedNew') is not False:
            raise ValueError('B reuse must explicitly declare generatedNew=false')
        if generated and row.get('generatedNew') is False:
            raise ValueError('An ImageGen B cannot deny its generation mode')
        suffix = Path(target['sourcePath']).suffix if not generated else '.png'
        if row['assetPath'] != relative(PUBLIC / 'phg' / (identity + suffix)):
            raise ValueError('B is outside its exact new identity path: ' + identity)
        asset = repository_file(row['assetPath'])
        actual = pin(asset)
        if actual['sha256'] != row['sha256'] or actual['bytes'] != row['bytes']:
            raise ValueError('Accepted B native byte mismatch: ' + identity)
        if generated:
            if actual['sha256'] == target['sourceSha256'] or actual['sha256'] in b_hashes:
                raise ValueError('B must be a distinct new generation, not a source/other-B byte copy')
            b_hashes.add(actual['sha256'])
            origin = row.get('nativeSourcePath')
            if (not isinstance(origin, str) or not origin.startswith('/workspace/generated_images/')
                    or '..' in Path(origin).parts or not origin.endswith('.png')):
                raise ValueError('Native ImageGen origin is required: ' + identity)
            if Path(origin).is_file() and Path(origin).read_bytes() != asset.read_bytes():
                raise ValueError('B copy differs from native ImageGen output: ' + identity)
        elif asset.read_bytes() != repository_file(target['sourcePath']).read_bytes():
            raise ValueError('Declared B reuse must preserve A bytes exactly: ' + identity)
        receipt_path = repository_file(row['generationReceipt'])
        if not receipt_path.is_relative_to(PACK / 'generation'):
            raise ValueError('Generation receipt outside dated pack')
        receipt_rows = [r for r in load(receipt_path)['entries'] if r['id'] == identity]
        if len(receipt_rows) != 1:
            raise ValueError('Receipt identity missing or duplicated: ' + identity)
        receipt = receipt_rows[0]
        no_approval(receipt, identity + ' receipt')
        if (receipt['sha256'] != actual['sha256'] or receipt['assetPath'] != actual['path']
                or receipt['bytes'] != actual['bytes']
                or receipt['sourceAPath'] != target['sourcePath']
                or receipt['sourceASha256'] != target['sourceSha256']):
            raise ValueError('Receipt does not match accepted lineage: ' + identity)
        if representation_mode(receipt) != mode:
            raise ValueError('B mode and receipt disagree: ' + identity)
        if generated and not receipt.get('prompt'):
            raise ValueError('An ImageGen B needs its actual prompt')
        reuse_reason = row.get('reuseReason') or receipt.get('reuseReason')
        if not generated and (receipt.get('generatedNew') is not False or not reuse_reason):
            raise ValueError('A reused B needs a disclosed reason and generatedNew=false receipt')
        metrics = image_metrics(asset, generated)
        if receipt.get('mode') in {'RGBA', 'RGB', 'P', 'LA'} and receipt['mode'] != metrics['mode']:
            raise ValueError('Receipt raster mode differs from native image')
        if (row['nativeDimensions'] != [metrics['width'], metrics['height']]
                or receipt['nativeDimensions'] != row['nativeDimensions']):
            raise ValueError('Declared B dimensions differ from native PNG')
        selected[identity] = {**actual, **metrics, 'url': '/' + asset.relative_to(ROOT / 'public').as_posix(),
            'versionKind': 'phg-standardized', 'mode': mode,
            'label': 'B · Adaptation graphique PHG — candidat' if generated else 'B · Rendu existant réutilisé — tracé conservé',
            'newImageGeneration': generated, 'reuseReason': reuse_reason if not generated else None,
            'nativeCopyIdentical': True, 'generationRecord': pin(receipt_path),
            'canonCertified': False, 'humanArtValidated': False, 'runtimeIntegrated': False,
            'pixelEditingPerformed': False, 'limitations': row.get('limitations', []) + (
                ['B réutilise explicitement A : ' + reuse_reason] if not generated else [])}
        (generated_files if generated else reused_b_files).append(actual)
    expected_ids = {r['id'] for r in index['targets']}
    missing = sorted(expected_ids - set(selected))
    if require_complete and missing:
        raise ValueError('Missing selected B candidates: ' + ', '.join(missing))
    pairs, aliases = [], []
    for target in index['targets']:
        identity = target['id']
        hybrid = not target['maskIsolationConfirmed']
        notes = list(dict.fromkeys(target['limitations'] + selected.get(identity, {}).get('limitations', [])))
        pairs.append({'id': identity, 'pairId': identity + '::existing-view', 'label': target['label'],
            'originGroup': target['originGroup'], 'sourceScope': target['sourceScope'],
            'identityConfirmationScope': target['identityConfirmationScope'], 'camera': camera_text(target['sourceView']),
            'cameraEvidence': target['sourceView'],
            'identityAnchors': target['visibleDesignLocks'], 'partialReferenceView': target['partialReferenceView'],
            'hybridStudy': hybrid, 'representationScope': 'hybrid-project-study' if hybrid else 'source-view-mask-candidate',
            'scopeLabel': ('Étude graphique hybride — propriété à qualifier' if hybrid else
                           'Vue partielle — formes absentes non reconstituées' if target['partialReferenceView']
                           else 'Même design et vue source'),
            'aliases': target['aliases'], 'sourceLocations': target['sourceLocations'], 'limitations': notes,
            'versionA': a_records[identity], 'versionB': selected.get(identity), 'pairCandidateComplete': identity in selected,
            'canonCertified': False, 'humanArtValidated': False, 'runtimeIntegrated': False, 'animationClips': 0})
        for alias in target.get('aliasRecords', []):
            original = alias.get('originalAliasAssetPath')
            aliases.append({**alias, 'pairId': identity,
                            'originalAliasSource': pin(repository_file(original)) if original else None,
                            'newGeometryOrGeneration': False})
    if len({r['id'] for r in aliases}) != len(aliases) or len(aliases) != 13:
        raise ValueError('The 11 clan aliases and two shared-base references must remain references')
    remaining = load(ROOT / 'public/game/biomasks-primary-20261113/manifest.json')['remainingTargets']
    if len(remaining) != 46 or any(t['id'] in expected_ids for t in remaining):
        raise ValueError('Available sources and missing canonical targets must remain distinct')
    catalogue = load(ROOT / 'production/biomasks-20261113/inputs/all-named-mask-inventory.json')
    trophies = [t for t in catalogue['records'] if t['kind'] == 'original-project-story-trophy']
    input_files = [p for folder in (INPUTS, PACK / 'generation') for p in folder.rglob('*.json')]
    input_files += [PACK / 'README.md', PACK / 'tools/build-dual-mask-pack.py',
                    PACK / 'tools/verify-dual-mask-pack.py', PACK / 'tools/ci-dual-mask-inputs.py',
                    PACK / 'tools/review-template.html', PACK / 'tools/qa-browser.mjs',
                    ROOT / 'production/p0-sprites-20261113/tools/workbook_lib.py']
    source_copies = [{k: row[k] for k in ('path', 'bytes', 'sha256')} for row in a_records.values()] + reused_b_files
    allowed = {r['path'] for r in source_copies + generated_files} | {
        relative(PUBLIC / 'manifest.json'), relative(PUBLIC / 'review.html')}
    actual_files = {relative(p) for p in PUBLIC.rglob('*') if p.is_file()}
    if actual_files - allowed:
        raise ValueError('Unregistered public files: ' + repr(sorted(actual_files - allowed)))
    manifest = {'schemaVersion': 1, 'id': 'biomasks-dual-20261113', 'asOf': '2026-11-13',
        'sourceBaselineCommit': BASE, 'status': 'paired-project-candidates-review-required',
        'counts': {'sourceDesignRecords': len(pairs), 'versionACopies': len(a_records),
                   'newImageGenPngs': len(generated_files), 'completeCandidatePairs': len(selected),
                   'reusedBRepresentations': len(reused_b_files),
                   'representations': len(source_copies) + len(generated_files),
                   'availableMaskDesignSources': sum(not p['hybridStudy'] for p in pairs),
                   'hybridProjectStudies': sum(p['hybridStudy'] for p in pairs),
                   'partialReferenceSources': sum(p['partialReferenceView'] for p in pairs),
                   'aliasesReusingPairs': len(aliases), 'canonicalNamesStillWithoutCutout': 46,
                   'originalStoryTrophiesWithoutSource': len(trophies), 'newlyCoveredCanonicalNames': 0,
                   'canonCertifiedAssets': 0, 'humanArtValidatedAssets': 0, 'runtimeIntegratedAssets': 0, 'animationClips': 0},
        'plannedBatch': {'selectedIds': sorted(expected_ids), 'missingBIds': missing,
                         'allSelectedPairsRepresented': not missing, 'allNamedMaskRequirementsComplete': False},
        'pairs': sorted(pairs, key=lambda r: r['id']), 'aliases': sorted(aliases, key=lambda r: r['id']),
        'remainingCanonicalTargets': remaining, 'originalTrophiesWithoutSource': trophies,
        'sourceCopies': sorted(source_copies, key=lambda r: r['path']),
        'nativeFiles': sorted(generated_files, key=lambda r: r['path']),
        'inputPins': sorted([pin(p) for p in set(input_files)], key=lambda r: r['path']),
        'protectedSources': {**pin(FOLLOW / 'source-protection.json'), 'files': len(protected['files']),
                             'workbooks': 124, 'priorNativePngs': 69},
        'allMasksGenerated': False, 'allP0Closed': False, 'canonCertified': False,
        'humanArtValidated': False, 'runtimeIntegrated': False, 'pixelEditingPerformed': False,
        'limitations': ['A conserve les octets d’un asset existant du projet, pas une preuve de canon franchise.',
                       'B traduit seulement le rendu ; les formes cachées et détails inconnus restent non établis.',
                       '46 sources disponibles et 46 noms canoniques sans découpe sont deux ensembles distincts.',
                       'Les alias réutilisent une paire ; aucune nouvelle géométrie ni génération n’est déduite.',
                       'Les tâches bible/Excel et la validation artistique/canonique restent ouvertes.']}
    return manifest, protected


def library():
    path = ROOT / 'production/p0-sprites-20261113/tools/workbook_lib.py'
    spec = importlib.util.spec_from_file_location('dual_mask_pure_xlsx', path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def workbook_data(manifest, protected, lib):
    c = manifest['counts']
    summary = [['Mesure', 'Valeur', 'Portée'],
        ['Sources de designs existants', c['sourceDesignRecords'], 'Pas un nombre de nouvelles géométries canoniques'],
        ['Copies A exactes en octets', c['versionACopies'], 'Fichiers PNG/WebP du projet, sans conversion'],
        ['Nouveaux PNG B ImageGen', c['newImageGenPngs'], 'Adaptation PHG du même design visible'],
        ['B réutilisés explicitement', c['reusedBRepresentations'], 'Octets A conservés quand une nouvelle génération dérive du design'],
        ['Paires candidates représentées', c['completeCandidatePairs'], 'A et B présents ; aucune fidélité certifiée'],
        ['Alias réutilisant une paire', c['aliasesReusingPairs'], '11 clans et deux bases partagées, sans génération supplémentaire'],
        ['Études hybrides à qualifier', c['hybridProjectStudies'], 'Propriété masque/porteur non établie'],
        ['Noms canoniques encore sans découpe', 46, 'Distincts des 46 designs disponibles'],
        ['Trophées originaux sans référence', c['originalStoryTrophiesWithoutSource'], 'Forme existante non disponible'],
        ['Nouvelles identités canoniques couvertes', 0, 'Standardiser un ancien asset ne clôture pas ce manque'],
        ['Canon / humain / runtime / animation', '0 /0 /0 /0', 'Critères ouverts'],
        ['XLSX / anciens PNG natifs protégés', '124 /69', 'Quatre lots antérieurs et leurs sources conservés']]
    rows = [['ID', 'Nom', 'Famille', 'A original exact', 'SHA A', 'B rendu PHG', 'SHA B',
             'Mode B', 'Vue', 'Limites', 'Paire complète', 'Étude hybride', 'Validation']]
    references = [['ID', 'Source A originale', 'SHA source', 'Source / statut', 'Ancrages visibles', 'Sources bible/Excel']]
    blocks = [['ID', 'État', 'Limite', 'Action']]
    for pair in manifest['pairs']:
        a, b = pair['versionA'], pair['versionB']
        rows.append([pair['id'], pair['label'], pair['originGroup'],
                     lib.Link(a['path'], '../../../' + a['path']), a['sha256'],
                     lib.Link(b['path'], '../../../' + b['path']) if b else 'À générer',
                     b['sha256'] if b else '', 'Nouvelle ImageGen' if b and b['newImageGeneration'] else 'Source réutilisée' if b else '',
                     pair['camera'], pair['limitations'],
                     pair['pairCandidateComplete'], pair['hybridStudy'], 'Candidats, non certifiés et non intégrés'])
        references.append([pair['id'], a['originalSource']['path'], a['originalSource']['sha256'],
                           pair['sourceScope'], pair['identityAnchors'], pair['sourceLocations']])
        blocks.extend([pair['id'], 'Ouvert', note, 'Revue artistique/source complémentaire'] for note in pair['limitations'])
    aliases = [['ID alias', 'Nom', 'Paire réutilisée', 'Source historique alias', 'SHA source alias',
                'Relation', 'Nouvelle géométrie', 'Note']]
    for alias in manifest['aliases']:
        source = alias['originalAliasSource'] or {}
        aliases.append([alias['id'], alias.get('label', ''), alias['pairId'], source.get('path', ''),
                        source.get('sha256', ''), alias.get('relationship', ''), False, alias.get('note', '')])
    remains = [['ID', 'Nom', 'Source / version', 'Description', 'Garde-fou', 'Sources', 'État']]
    for row in manifest['remainingCanonicalTargets']:
        remains.append([row['id'], row['name'], row.get('work', ''), row.get('description', ''),
                        row.get('guardrail', ''), row.get('sourceLocations', []), 'Sans découpe candidate ; A/B à produire'])
    for row in manifest['originalTrophiesWithoutSource']:
        remains.append([row['id'], row['name'], row.get('work', ''), row.get('description', ''),
                        'Forme existante non établie', row.get('sourceRows', []), 'Trophée original sans référence'])
    sources = [['Chemin protégé', 'Octets', 'SHA256', 'Inchangé']] + [
        [row['path'], row['bytes'], row['sha256'], True] for row in protected['files']]
    tables = [('Synthèse', summary, [50, 35, 125]), ('Paires A-B', rows, [35, 40, 28, 110, 68, 110, 68, 35, 100, 125, 22, 22, 65]),
              ('Références', references, [35, 115, 68, 80, 120, 125]),
              ('Alias', aliases, [40, 40, 35, 110, 68, 75, 25, 120]),
              ('Restants', remains, [40, 40, 70, 120, 120, 125, 75]),
              ('Blocages', blocks, [35, 25, 125, 90]), ('Sources protégées', sources, [125, 22, 68, 22])]
    return {'schemaVersion': 1, 'sheets': [
        {'name': name, 'title': 'Yautja — original et rendu PHG : ' + name,
         'note': '13 novembre 2026 · copies A exactes du projet et candidats B · zéro admission canon/humaine/runtime',
         'headerRow': 4, 'rows': values, 'widths': widths} for name, values, widths in tables],
        'counts': c, 'manifestSha256': digest(encoded(manifest))}


def verify_xlsx(raw, data, lib):
    count = 0
    with ZipFile(BytesIO(raw)) as archive:
        if archive.testzip():
            raise ValueError('Corrupt XLSX archive')
        for name in archive.namelist():
            if name.endswith(('.xml', '.rels')):
                ET.fromstring(archive.read(name))
        sheets = ET.fromstring(archive.read('xl/workbook.xml')).find('{' + NS + '}sheets')
        if [s.attrib['name'] for s in sheets] != [s['name'] for s in data['sheets']]:
            raise ValueError('Workbook sheet membership differs')
        for number, sheet in enumerate(data['sheets'], 1):
            page = ET.fromstring(archive.read(f'xl/worksheets/sheet{number}.xml'))
            cells = {c.attrib['r']: c for c in page.iter('{' + NS + '}c')}
            for rownum, values in enumerate(sheet['rows'], 4):
                for column, value in enumerate(values, 1):
                    actual = ''.join(cells[lib.column(column) + str(rownum)].itertext())
                    expected = value.label if isinstance(value, lib.Link) else lib.compact(value)
                    if isinstance(value, (int, float)) and not isinstance(value, bool):
                        expected = str(value)
                    if actual != expected:
                        raise ValueError('XLSX cell mismatch: ' + sheet['name'])
                    count += 1
    return count


def main(arguments=None):
    parser = argparse.ArgumentParser(description=__doc__)
    modes = parser.add_mutually_exclusive_group(required=True)
    modes.add_argument('--write', action='store_true')
    modes.add_argument('--check', action='store_true')
    modes.add_argument('--freeze-sources', action='store_true')
    parser.add_argument('--require-complete', action='store_true')
    args = parser.parse_args(arguments)
    if args.freeze_sources:
        result = freeze_sources()
        print(json.dumps({'protectedFiles': len(result['files']), 'workbooks': result['protectedWorkbooks']}))
        return 0
    manifest, protected = build(args.require_complete, args.write)
    lib = library()
    data = workbook_data(manifest, protected, lib)
    raw = lib.build_workbook(data)
    cells = verify_xlsx(raw, data, lib)
    html = (PACK / 'tools/review-template.html').read_text().replace(
        '__PACK_DATA__', json.dumps(manifest, ensure_ascii=False).replace('<', '\\u003c')).encode()
    workbook = FOLLOW / 'Yautja_Masques_Originaux_PHG_20261113.xlsx'
    outputs = {PUBLIC / 'manifest.json': encoded(manifest), PUBLIC / 'review.html': html,
               workbook: raw, FOLLOW / 'build-request.json': encoded(lib.serializable(data)),
               FOLLOW / 'coverage.json': encoded({'counts': manifest['counts'],
                    'allMasksGenerated': False, 'allP0Closed': False, 'sourceStatusesChanged': False,
                    'missingBIds': manifest['plannedBatch']['missingBIds'],
                    'remainingCanonicalTargetIds': [r['id'] for r in manifest['remainingCanonicalTargets']]})}
    result = {'passed': True, 'counts': manifest['counts'],
        'selectedBatchComplete': manifest['plannedBatch']['allSelectedPairsRepresented'],
        'manifest': {'path': relative(PUBLIC / 'manifest.json'), 'sha256': digest(outputs[PUBLIC / 'manifest.json'])},
        'gallery': {'path': relative(PUBLIC / 'review.html'), 'sha256': digest(html)},
        'workbook': {'path': relative(workbook), 'sha256': digest(raw), 'bytes': len(raw)},
        'sheets': [s['name'] for s in data['sheets']], 'cellsCompared': cells,
        'protectedFiles': len(protected['files']), 'protectedWorkbooks': 124, 'protectedNativeCandidates': 69,
        'pixelEditingPerformed': False, 'allMasksGenerated': False, 'allP0Closed': False,
        'scope': 'Original-byte copies, native B pixels, source pins and OpenXML; not art/canon/runtime approval'}
    outputs[FOLLOW / 'verification.json'] = encoded(result)
    for path, content in outputs.items():
        if args.write:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(content)
        elif not path.is_file() or path.read_bytes() != content:
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
