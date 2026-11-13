#!/usr/bin/env python3
"""Rebuild a dated official-source mask review pack without editing raster pixels."""
from __future__ import annotations

import argparse
from io import BytesIO
import hashlib
import importlib.util
import json
import math
from pathlib import Path
import sys
from xml.etree import ElementTree as ET
from zipfile import ZipFile

from PIL import Image

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[3]
PACK = ROOT / 'production/biomasks-primary-20261113'
PUBLIC = ROOT / 'public/game/biomasks-primary-20261113'
INPUTS = PACK / 'inputs'
FOLLOW = PACK / 'suivi'
BASE = '55c1d335d206512f7bd69e9c83066f757a66c7af'
NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
OLD_PACKS = ('p0-sprites-20261113', 'p0-fidelity-20261113', 'biomasks-20261113')
EXPECTED = {
    'samurai': ('mk-23-samurai', {'samurai-official-closeup', 'samurai-official-render'}),
    'viking': ('mk-24-viking', {'viking-official-render', 'viking-official-front'}),
    'valkyrie': ('mk-25-valkyrie', {'valkyrie-official-render', 'valkyrie-official-closeup'}),
    'cleopatra': ('phg-cleopatra', {'cleopatra-official-render'}),
    'exiled': ('phg-exiled', {'exiled-official-render', 'exiled-official-closeup'}),
    'emissary': ('mk-30-emissary', {'emissary-official-render'}),
    'captured': ('phg-captured', {'captured-official-closeup', 'captured-official-render'}),
}
NEW_NAMES = {'valkyrie', 'cleopatra', 'emissary', 'captured'}
FIVE_VIEW_PIN = 'a8db5946dcb16dc2c39c7286cf378bb20368a080df7a5d33633bb4abf048296c'
SIX_VIEW_PIN = '847ba382f1ed53349d32c5e62bf212b99be51b50fa45331476fddb0d359c05d1'
FORBIDDEN_APPROVALS = ('canonCertified', 'humanArtValidated', 'runtimeIntegrated',
                       'pixelEditingPerformed', 'animated')


def encoded(value):
    return (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode()


def load(path):
    return json.loads(path.read_bytes())


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def relative(path):
    return path.resolve().relative_to(ROOT).as_posix()


def repo_file(value):
    if (not isinstance(value, str) or not value or '\\' in value
            or any(ord(c) < 32 for c in value)):
        raise ValueError('Invalid repository file path')
    p = Path(value)
    if p.is_absolute() or '..' in p.parts or value != p.as_posix():
        raise ValueError('Only normalized relative repository paths are supported: ' + value)
    target = ROOT / p
    if target.is_symlink() or not target.resolve().is_relative_to(ROOT) or not target.is_file():
        raise ValueError('Missing regular repository file: ' + value)
    return target


def pin(path):
    raw = path.read_bytes()
    return {'path': relative(path), 'bytes': len(raw), 'sha256': digest(raw)}


def assert_pin(record):
    actual = pin(repo_file(record['path']))
    if actual['sha256'] != record['sha256'] or actual['bytes'] != record['bytes']:
        raise ValueError('Pinned file changed: ' + record['path'])


def required_protected_paths():
    inherited = load(ROOT / 'production/biomasks-20261113/suivi/source-protection.json')
    paths = {r['path'] for r in inherited['files']}
    paths.add('.github/workflows/biomask-candidates.yml')
    for name in OLD_PACKS:
        for prefix in ('production', 'public/game'):
            paths.update(relative(p) for p in (ROOT / prefix / name).rglob('*')
                         if p.is_file() and '__pycache__' not in p.parts and p.suffix != '.pyc')
    return paths


def freeze_sources():
    paths = required_protected_paths()
    files = [pin(repo_file(p)) for p in sorted(paths)]
    result = {'schemaVersion': 1, 'sourceBaselineCommit': BASE,
              'scope': 'All three historical packs and inherited sources; no source status changed',
              'files': files, 'sourceStatusesChanged': False,
              'protectedWorkbooks': sum(p.endswith('.xlsx') for p in paths),
              'priorNativeCandidatePNGs': 62}
    if result['protectedWorkbooks'] != 123:
        raise ValueError('Expected 123 previous XLSX including the third pack follow-up')
    out = FOLLOW / 'source-protection.json'
    raw = encoded(result)
    if out.exists() and out.read_bytes() != raw:
        raise ValueError('Refusing to replace the frozen source-protection snapshot')
    out.parent.mkdir(parents=True, exist_ok=True)
    if not out.exists():
        out.write_bytes(raw)
    return result


def protection():
    data = load(FOLLOW / 'source-protection.json')
    paths = [r['path'] for r in data['files']]
    if len(paths) != len(set(paths)) or set(paths) != required_protected_paths():
        raise ValueError('Historical source protection membership differs')
    if sum(p.endswith('.xlsx') for p in paths) != 123 or data['protectedWorkbooks'] != 123:
        raise ValueError('All 123 prior XLSX must remain protected')
    for row in data['files']:
        assert_pin(row)
    old_native = [r for name in OLD_PACKS
                  for r in load(ROOT / 'public/game' / name / 'manifest.json')['nativeFiles']]
    if len(old_native) != 62 or not {r['path'] for r in old_native}.issubset(paths):
        raise ValueError('The 62 prior native candidate PNGs must be protected')
    return data


def no_approval(row, label):
    if any(row.get(k) is True for k in FORBIDDEN_APPROVALS):
        raise ValueError('Unapproved automatic validation claim in ' + label)


def five_view_protection():
    path = INPUTS / 'five-view-native-protection.json'
    if digest(path.read_bytes()) != FIVE_VIEW_PIN:
        raise ValueError('The immutable first-five candidate protection snapshot changed')
    data = load(path)
    if (data['baselineCommit'] != 'fad5c4b76dc1d3fe159509903c3be0844b8607d8'
            or len(data['files']) != 10 or data['nativeCandidates'] != 5
            or data['generationReceipts'] != 5):
        raise ValueError('Unexpected first-five candidate protection membership')
    for record in data['files']:
        assert_pin(record)
    return data


def six_view_protection():
    path = INPUTS / 'six-view-native-protection.json'
    if digest(path.read_bytes()) != SIX_VIEW_PIN:
        raise ValueError('The immutable first-six candidate protection snapshot changed')
    data = load(path)
    if (data['baselineManifestSha256'] != '0bf7a1335652706f93d6f609c3e9ce9e3dd3896bbc3f907e3ed2e5bb54847001'
            or len(data['files']) != 12 or data['nativeCandidates'] != 6
            or data['generationReceipts'] != 6):
        raise ValueError('Unexpected first-six candidate protection membership')
    for record in data['files']:
        assert_pin(record)
    return data


def alpha_metrics(image):
    if image.mode != 'RGBA':
        raise ValueError('Native RGBA PNG required')
    a = image.getchannel('A')
    hist = a.histogram()
    bounds = a.point(lambda x: 255 if x >= 16 else 0).getbbox()
    if not bounds or not hist[0] or not sum(hist[240:]):
        raise ValueError('Transparent surround and solid visible mask material required')
    w, h = image.size
    left, top, right, bottom = bounds
    margins = [left, top, w - right, h - bottom]
    visible, opaque = sum(hist[16:]), sum(hist[240:])
    if min(margins) <= 0 or opaque / visible < .8:
        raise ValueError('Clipped native silhouette or insufficient opaque mask material')
    return {'threshold': 16, 'bounds16': list(bounds), 'marginsPixels': margins,
            'transparentPixels': hist[0], 'visiblePixels16': visible,
            'opaquePixels240': opaque, 'nearOpaqueFractionOfVisible16': opaque / visible,
            'occupancy16': visible / (w * h), 'softPixels3To239': sum(hist[3:240]),
            'coreDoesNotTouchFrameEdges': True, 'hiddenRgbIgnored': True}


def public_reference(row):
    return {k: v for k, v in row.items()
            if k not in {'path', 'localPath', 'privateReferencePath', 'headersPath'}}


def provenance_ledgers(sources):
    records = [sources['sourceInventory'], sources['sourceLedger']]
    records.extend(r['projectSourceLedger'] for r in sources['sources'] if r.get('projectSourceLedger'))
    paths = set()
    for row in records:
        path = repo_file(row['path'])
        if pin(path)['sha256'] != row['sha256']:
            raise ValueError('Declared source ledger bytes changed: ' + row['path'])
        paths.add(path)
    for source in sources['sources']:
        row = source.get('projectSourceLedger')
        if not row or not row.get('jsonPointer'):
            continue
        value = load(repo_file(row['path']))
        for token in row['jsonPointer'].split('/')[1:]:
            token = token.replace('~1', '/').replace('~0', '~')
            value = value[int(token)] if isinstance(value, list) else value[token]
        matches = (value == source['url'] if isinstance(value, str)
                   else isinstance(value, list) and source['url'] in value)
        if not matches:
            raise ValueError('The declared source URL is absent from its exact ledger pointer')
    return paths


def build(require_complete):
    protected = protection()
    first_five = five_view_protection()
    first_six = six_view_protection()
    sources = load(INPUTS / 'primary-mask-sources.json')
    ledger_files = provenance_ledgers(sources)
    refs = {r['id']: r for r in sources['sources']}
    targets = {r['id']: r for r in sources['targets']}
    if len(refs) != len(sources['sources']) or not set(EXPECTED).issubset(targets):
        raise ValueError('Missing or duplicated official source/target identity')
    scope = load(INPUTS / 'remaining-mask-scope.json')
    if (scope['localCommit'] != BASE or len(scope['remainingTargets']) != 50
            or scope['counts']['remainingNamedTargetsWithoutThoseCandidateCuts'] != 50):
        raise ValueError('Unexpected remaining named mask scope')
    for record in scope['pins'].values():
        if 'path' in record:
            actual = pin(repo_file(record['path']))
            if actual['sha256'] != record['sha256']:
                raise ValueError('Mask-scope audit pins changed')
    accepted = load(INPUTS / 'accepted-assets.json')
    assets, native, seen = [], [], set()
    for entry in accepted['entries']:
        identity = entry['id']
        if identity not in EXPECTED or identity in seen:
            raise ValueError('Duplicate or unexpected selected mask: ' + identity)
        seen.add(identity)
        no_approval(entry, identity)
        target = targets[identity]
        no_approval(target, identity + ' source target')
        inventory_id, expected_refs = EXPECTED[identity]
        if target['inventoryId'] != inventory_id or set(entry['sourceIds']) != expected_refs:
            raise ValueError('Source identity mismatch: ' + identity)
        if not expected_refs.issubset(target['sourceIds']):
            raise ValueError('Source target does not cite all generation references')
        references = []
        for ref_id in entry['sourceIds']:
            ref = refs[ref_id]
            if not ref.get('visuallyInspected') or ref['width'] <= 0 or ref['height'] <= 0:
                raise ValueError('Official reference was not actually visually inspected: ' + ref_id)
            if not ref['url'].startswith('https://') or len(ref['sha256']) != 64 or ref['bytes'] <= 0:
                raise ValueError('Official source needs an exact URL, SHA and byte count')
            references.append(public_reference(ref))
        asset = repo_file(entry['assetPath'])
        if not asset.is_relative_to(PUBLIC / 'masks') or asset.suffix != '.png':
            raise ValueError('Candidate outside new public masks namespace')
        actual = pin(asset)
        if actual['sha256'] != entry['sha256'] or actual['bytes'] != entry['bytes']:
            raise ValueError('Accepted native candidate byte mismatch: ' + identity)
        native_path = entry.get('nativeSourcePath')
        if not native_path:
            raise ValueError('Native ImageGen origin path is required')
        if Path(native_path).is_file() and Path(native_path).read_bytes() != asset.read_bytes():
            raise ValueError('Native ImageGen output/copy differs: ' + identity)
        receipt_path = repo_file(entry['generationReceipt'])
        if not receipt_path.is_relative_to(PACK / 'generation'):
            raise ValueError('Generation receipt outside new pack')
        receipt = load(receipt_path)
        rows = [r for r in receipt['entries'] if r['id'] == identity]
        if len(rows) != 1 or rows[0]['sha256'] != actual['sha256'] or rows[0]['assetPath'] != actual['path']:
            raise ValueError('Generation receipt does not identify the current native candidate')
        no_approval(rows[0], identity + ' receipt')
        with Image.open(asset) as image:
            if image.format != 'PNG' or image.width * image.height > 16777216:
                raise ValueError('Unsupported native image format/dimensions')
            width, height = image.size
            metrics = alpha_metrics(image)
        if [width, height] != entry['nativeDimensions']:
            raise ValueError('Declared dimensions differ from native PNG')
        pivot = entry.get('pivot', [width / 2, height / 2])
        if (len(pivot) != 2 or any(not isinstance(v, (int, float)) or not math.isfinite(v) for v in pivot)
                or not 0 <= pivot[0] <= width or not 0 <= pivot[1] <= height):
            raise ValueError('Invalid proposed review pivot')
        previous = (ROOT / 'public/game/biomasks-20261113/masks/exiled-reference-view.png'
                    if identity == 'exiled' else
                    ROOT / 'public/game/p0-sprites-20261113/masks' / (identity + '-front.png'))
        previous_data = ({**pin(previous),
                          'url': '/' + previous.relative_to(ROOT / 'public').as_posix(),
                          'label': 'Ancien candidat frontal monochrome',
                          'provenance': 'Source communautaire secondaire monochrome ; angle distinct et couleurs non établies'}
                         if identity not in NEW_NAMES else None)
        notes = list(dict.fromkeys(entry.get('limitations', []) + target.get('limitations', []) + [
            'Une vue statique de référence officielle ; aucune face cachée, animation, UV ou adaptation de morphologie certifiée.',
            'La fidélité 1:1 reste une cible de revue, sans certification canonique ni validation artistique humaine.',
            'Les photos officielles restent des références privées identifiées par URL et SHA ; elles ne sont pas republiées.',
        ]))
        if identity == 'emissary':
            notes.append('Vue candidate partielle : les deux petits éléments supérieurs coupés par le cadre officiel sont exclus ; leur forme et la silhouette complète restent ouvertes.')
        assets.append({**actual, 'id': identity, 'inventoryId': inventory_id,
                       'label': entry['label'], 'url': '/' + asset.relative_to(ROOT / 'public').as_posix(),
                       'src': '/' + asset.relative_to(ROOT / 'public').as_posix(),
                       'width': width, 'height': height, 'sourceRect': [0, 0, width, height],
                       'pivot': pivot, 'pivotStatus': 'review proposal; no rig integration',
                       'alpha': metrics, 'view': entry['view'], 'frames': 1,
                       'status': 'generated-candidate', 'canonCertified': False,
                       'humanArtValidated': False, 'runtimeIntegrated': False,
                       'pixelEditingPerformed': False, 'animated': False,
                       'sourceIds': entry['sourceIds'], 'references': references,
                       'partialReferenceView': identity == 'emissary',
                       'incompleteSourceElements': ['Deux petits éléments supérieurs coupés dans la référence officielle, exclus de cette découpe sans reconstruction.']
                                                   if identity == 'emissary' else [],
                       'generationRecord': pin(receipt_path), 'limitations': notes,
                       'warnings': ['Marge native inférieure à5%; revoir le cadrage.']
                                   if min(metrics['marginsPixels']) / min(width, height) < .05 else [],
                       'previousCandidate': previous_data,
                       })
        native.append(actual)
    assets.sort(key=lambda r: r['id'])
    native.sort(key=lambda r: r['path'])
    missing = sorted(set(EXPECTED) - seen)
    if require_complete and missing:
        raise ValueError('Missing selected official source views: ' + ', '.join(missing))
    allowed = {r['path'] for r in native} | {relative(PUBLIC / 'manifest.json'), relative(PUBLIC / 'review.html')}
    actual_files = {relative(p) for p in PUBLIC.rglob('*') if p.is_file()}
    if actual_files - allowed:
        raise ValueError('Unregistered public files: ' + repr(sorted(actual_files - allowed)))
    input_files = [p for folder in (INPUTS, PACK / 'generation') for p in folder.rglob('*.json')]
    input_files.extend(ledger_files)
    input_files += [PACK / 'README.md', PACK / 'tools/build-primary-mask-pack.py',
                    PACK / 'tools/verify-primary-mask-pack.py', PACK / 'tools/ci-primary-mask-inputs.py',
                    PACK / 'tools/review-template.html', PACK / 'tools/qa-browser.mjs',
                    ROOT / 'production/p0-sprites-20261113/tools/workbook_lib.py']
    newly_covered = sorted(NEW_NAMES & seen)
    newly_covered_inventory_ids = {EXPECTED[n][0] for n in newly_covered}
    remaining = [r for r in scope['remainingTargets'] if r['id'] not in newly_covered_inventory_ids]
    if len(remaining) != 50 - len(newly_covered):
        raise ValueError('New named target coverage does not match the baseline50 inventory')
    manifest = {'schemaVersion': 1, 'id': 'biomasks-primary-20261113', 'asOf': '2026-11-13',
                'sourceBaselineCommit': BASE, 'status': 'generated-candidates-review-required',
                'allMasksGenerated': False, 'allP0Closed': False, 'canonCertified': False,
                'humanArtValidated': False, 'runtimeIntegrated': False, 'animationClips': 0,
                'counts': {'nativeFiles': len(native), 'assets': len(assets), 'newNamedTargets': len(newly_covered),
                           'improvedExistingNamedTargets': len(seen - NEW_NAMES), 'remainingNamedTargets': len(remaining),
                           'baselineRemainingNamedTargets': 50,
                           'partialReferenceCandidates': sum(a['partialReferenceView'] for a in assets),
                           'sourceNamedEntries': 110, 'exactMissingImagesRequired': None,
                           'canonCertifiedAssets': 0, 'humanValidatedAssets': 0,
                           'runtimeIntegratedAssets': 0, 'animationClips': 0},
                'plannedBatch': {'selectedTargetIds': sorted(EXPECTED), 'missingSelectedIds': missing,
                                 'requestedBatchGenerated': not missing, 'allNamedRequirementsComplete': False,
                                 'includesPartialSourceViews': any(a['partialReferenceView'] for a in assets),
                                 'scope': 'Selected reference-view cuts only; Emissary deliberately excludes source-cropped upper elements.'},
                'assets': assets, 'nativeFiles': native,
                'remainingTargets': remaining,
                'newlyCoveredNamedTargetIds': sorted(newly_covered_inventory_ids),
                'inputPins': sorted([pin(p) for p in set(input_files)], key=lambda r: r['path']),
                'protectedSources': {**pin(FOLLOW / 'source-protection.json'),
                                     'files': len(protected['files']), 'workbooks': 123, 'priorNativePNGs': 62},
                'preservedInitialFive': {**pin(INPUTS / 'five-view-native-protection.json'),
                                        'files': len(first_five['files']), 'nativePNGs': 5, 'generationReceipts': 5},
                'preservedFirstSix': {**pin(INPUTS / 'six-view-native-protection.json'),
                                     'files': len(first_six['files']), 'nativePNGs': 6, 'generationReceipts': 6},
                'limitations': ['Les nouvelles découpes candidates ne certifient pas les exigences de fidélité et ne ferment pas les tâches bible/Excel.',
                                'Les angles des anciens frontaux secondaires et des vues officielles en couleur diffèrent.',
                                'Aucun dos ou profil, aucune animation, admission canonique ou intégration runtime ne sont déduits.']}
    return manifest, protected


def library():
    path = ROOT / 'production/p0-sprites-20261113/tools/workbook_lib.py'
    spec = importlib.util.spec_from_file_location('primary_mask_pure_xlsx', path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def workbook_data(manifest, protected, lib):
    c = manifest['counts']
    tables = []
    summary = [['Mesure', 'Valeur', 'Portée'],
               ['Nouveaux PNG candidats', c['nativeFiles'], 'Vues officielles en couleur, sans certification automatique'],
               ['Nouveaux noms avec découpe candidate', c['newNamedTargets'], 'Valkyrie, Cleopatra, Emissary partiel et Captured ; aucune tâche certifiée terminée'],
               ['Vues sources explicitement partielles', c['partialReferenceCandidates'], 'Emissary : deux petits éléments supérieurs exclus, silhouette complète non établie'],
               ['Noms existants améliorés', c['improvedExistingNamedTargets'], 'Samurai, Viking et Exiled avaient déjà un candidat frontal secondaire'],
               ['Noms restants', c['remainingNamedTargets'], 'Baseline50 moins nouveaux candidats nommés ; pas un total de PNG'],
               ['Total exact d’images requises', 'Indéterminé', 'Autres angles et variantes non déduits depuis un nom'],
               ['Lot sélectionné généré', manifest['plannedBatch']['requestedBatchGenerated'], 'Sept découpes sélectionnées seulement, dont Emissary partiel'],
               ['Canon / humain / runtime / animation', '0 /0 /0 /0', 'Critères ouverts'],
               ['XLSX antérieurs protégés', 123, '122 sources et suivis antérieurs, plus le classeur du troisième lot'],
               ['Anciens PNG candidats protégés', 62, 'Images natives des trois lots, références et QA exclus'],
               ['Cinq PNG et reçus initiaux préservés', '5 /5', 'Les octets du commit fad5c4b76 restent inchangés pendant cette extension'],
               ['Six PNG et reçus antérieurs préservés', '6 /6', 'Emissary et les cinq premiers candidats restent inchangés pendant l’ajout Captured'],
               ['Fichiers protégés', len(protected['files']), 'Toutes les empreintes vérifiées']]
    tables.append(('Synthèse', summary, [48, 35, 120]))
    pngs = [['ID', 'Nom', 'PNG natif', 'SHA256', 'Dimensions', 'Vue exacte', 'Pivot proposé', 'Bornes alpha16', 'Marges', 'État', 'Limites']]
    refs = [['Masque', 'Référence', 'URL exacte', 'SHA256', 'Octets', 'Dimensions', 'Observation / limites']]
    blocks = [['Masque', 'État', 'Limite', 'Action']]
    for asset in manifest['assets']:
        pngs.append([asset['id'], asset['label'], lib.Link(asset['path'], '../../../' + asset['path']),
                     asset['sha256'], f"{asset['width']}×{asset['height']}", asset['view'], asset['pivot'],
                     asset['alpha']['bounds16'], asset['alpha']['marginsPixels'], 'Candidat, non intégré', asset['limitations']])
        for ref in asset['references']:
            refs.append([asset['id'], ref['id'], ref['url'], ref['sha256'], ref['bytes'],
                         f"{ref['width']}×{ref['height']}", [ref.get('observations', []), ref.get('limitations', [])]])
        for note in asset['limitations'] + asset['warnings']:
            blocks.append([asset['id'], 'Ouvert', note, 'Revue artistique et sources complémentaires'])
    tables.extend([('PNGs', pngs, [25, 35, 110, 68, 24, 100, 26, 35, 30, 38, 120]),
                   ('Références', refs, [24, 40, 120, 68, 22, 26, 120])])
    remain = [['ID', 'Nom', 'Source / version', 'Type', 'État conservé', 'Description', 'Garde-fou', 'Sources exactes', 'Canon certifié', 'Humain validé']]
    for target in manifest['remainingTargets']:
        remain.append([target['id'], target['name'], target.get('work', ''), target['kind'],
                       target['baselineStatus'], target.get('description', ''), target.get('guardrail'),
                       target['sourceLocations'], False, False])
    tables.extend([('Restants', remain, [40, 35, 70, 35, 65, 120, 120, 120, 22, 22]),
                   ('Blocages', blocks, [25, 30, 120, 100]),
                   ('Sources', [['Chemin', 'Octets', 'SHA256', 'Inchangé']] +
                    [[r['path'], r['bytes'], r['sha256'], True] for r in protected['files']], [125, 22, 68, 22])])
    return {'schemaVersion': 1, 'sheets': [
        {'name': name, 'title': 'Yautja — sources primaires : ' + name,
         'note': '13 novembre2026 · candidats statiques · aucune validation canon/humaine/runtime · sources conservées',
         'headerRow': 4, 'rows': rows, 'widths': widths} for name, rows, widths in tables],
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
                for col, value in enumerate(values, 1):
                    actual = ''.join(cells[lib.column(col) + str(rownum)].itertext())
                    expected = value.label if isinstance(value, lib.Link) else lib.compact(value)
                    if isinstance(value, (int, float)) and not isinstance(value, bool):
                        expected = str(value)
                    if actual != expected:
                        raise ValueError('XLSX cell mismatch: ' + sheet['name'] + '!' + lib.column(col) + str(rownum))
                    count += 1
    return count


def main(arguments=None):
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument('--write', action='store_true')
    mode.add_argument('--check', action='store_true')
    mode.add_argument('--freeze-sources', action='store_true')
    parser.add_argument('--require-complete', action='store_true')
    args = parser.parse_args(arguments)
    if args.freeze_sources:
        result = freeze_sources()
        print(json.dumps({'protectedFiles': len(result['files']), 'protectedWorkbooks': result['protectedWorkbooks']}))
        return 0
    manifest, protected = build(args.require_complete)
    lib = library()
    data = workbook_data(manifest, protected, lib)
    raw = lib.build_workbook(data)
    cells = verify_xlsx(raw, data, lib)
    html = (PACK / 'tools/review-template.html').read_text().replace(
        '__PACK_DATA__', json.dumps(manifest, ensure_ascii=False).replace('<', '\\u003c')).encode()
    workbook = FOLLOW / 'Yautja_Masques_Sources_Primaires_20261113.xlsx'
    outputs = {PUBLIC / 'manifest.json': encoded(manifest), PUBLIC / 'review.html': html,
               workbook: raw, FOLLOW / 'build-request.json': encoded(lib.serializable(data)),
               FOLLOW / 'coverage.json': encoded({'asOf': '2026-11-13', 'counts': manifest['counts'],
                  'allMasksGenerated': False, 'allP0Closed': False, 'sourceStatusesChanged': False,
                  'exactMissingImagesRequired': None, 'remainingTargetIds': [r['id'] for r in manifest['remainingTargets']]})}
    result = {'passed': True, 'counts': manifest['counts'], 'selectedBatchComplete': manifest['plannedBatch']['requestedBatchGenerated'],
              'allMasksGenerated': False, 'allP0Closed': False,
              'manifest': {'path': relative(PUBLIC / 'manifest.json'), 'sha256': digest(outputs[PUBLIC / 'manifest.json'])},
              'gallery': {'path': relative(PUBLIC / 'review.html'), 'sha256': digest(html)},
              'workbook': {'path': relative(workbook), 'sha256': digest(raw), 'bytes': len(raw)},
              'sheets': [s['name'] for s in data['sheets']], 'cellsCompared': cells,
              'protectedFiles': len(protected['files']), 'protectedWorkbooks': 123, 'protectedPriorNativePNGs': 62,
              'preservedInitialNativePNGs': 5, 'preservedInitialGenerationReceipts': 5,
              'preservedPriorNativePNGs': 6, 'preservedPriorGenerationReceipts': 6,
              'scope': 'Native bytes and alpha, pinned provenance and deterministic OpenXML only; no art/canon/runtime approval'}
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
    raise SystemExit(main())
