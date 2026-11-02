#!/usr/bin/env python3
"""Append bounded production tracking to the exact 122-sheet V112 workbook."""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import struct
import subprocess
import sys

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]
DIRECTORY = Path('docs/suivi-production/v113-open-production-20261102')
MANIFEST = DIRECTORY / 'source-manifest.json'
# This location deliberately stays outside the R7 coordinator's docs/art-source
# inventory. Its dated 27-workbook inputs must remain reproducible unchanged.
OUTPUT = Path('production/YAUTJA_V113_SUIVI.xlsx')
QA = DIRECTORY / 'workbook-qa.json'
BASELINE = {'path': 'docs/YAUTJA_V112_SUIVI.xlsx', 'bytes': 9433700,
            'sha256': '723cc894b643d55dcd076cab8b615866c6879ecc481c55616adcdd0508d2eccc'}
SOURCE_COMMIT = '03cf51badd450338d748da55599a317a71debd28'
SOURCE_TREE = '8955aa3ae57f3c1c5151fc6e2980d083bbcd0aaa'
SHEET_NAMES = ['SyntheseV113', 'OuvertsSourceV113', 'ArtCatalogueV113',
               'LotsProductionV113', 'CandidatsV113', 'ClasseursV113',
               'SourcesV113', 'JournalV113']
spec = importlib.util.spec_from_file_location('v113_immutable_append', ROOT / 'scripts/lib/excel_followup_append.py')
append = importlib.util.module_from_spec(spec)
spec.loader.exec_module(append)


def json_bytes(value):
    return (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode()


def local(file):
    if not isinstance(file, str):
        raise ValueError('Portable repository-relative path required: ' + str(file))
    p = Path(file)
    if p.is_absolute() or '..' in p.parts or not p.parts:
        raise ValueError('Portable repository-relative path required: ' + str(file))
    return ROOT / p


def fingerprint(file):
    p = local(file)
    if not p.is_file() or p.is_symlink():
        raise ValueError('Regular source file required: ' + str(file))
    data = p.read_bytes()
    return {'path': str(file), 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}


def same_bytes(raw, proof):
    return len(raw) == proof['bytes'] and hashlib.sha256(raw).hexdigest() == proof['sha256']


def read_git_reference(proof):
    """Explicit immutable fallback; never fetch, update refs or change a pin."""
    file = proof['path']
    local(file)
    if proof.get('sourceCommit') != SOURCE_COMMIT or proof.get('context') != 'SNAPSHOT_HISTORIQUE':
        raise ValueError('Only explicit historical sources can use the pinned Git fallback')
    try:
        listing = subprocess.run(['git','ls-tree','-z',SOURCE_COMMIT,'--',file],cwd=ROOT,check=True,capture_output=True).stdout
        if not listing or listing.count(b'\0') != 1:
            raise ValueError('Historical path is absent or ambiguous in its pinned commit: '+file)
        metadata, actual_path = listing.rstrip(b'\0').split(b'\t',1)
        mode, kind, oid = metadata.decode().split(' ')
        if mode not in ['100644','100755'] or kind != 'blob' or actual_path.decode() != file or oid != proof['gitBlobOid'] or mode != proof['gitMode']:
            raise ValueError('Historical reference is not its pinned regular Git blob: ' + file)
        raw = subprocess.run(['git','cat-file','blob',oid],cwd=ROOT,check=True,capture_output=True).stdout
    except (subprocess.CalledProcessError,FileNotFoundError) as error:
        raise ValueError('Pinned historical source unavailable; explicitly fetch commit '+SOURCE_COMMIT+' before checking this dated workbook: '+file) from error
    if not same_bytes(raw,proof):
        raise ValueError('Historical Git bytes disagree with the source pin: '+file)
    return raw


def read_source_input(proof):
    file = local(proof['path'])
    if file.is_file() and not file.is_symlink():
        raw = file.read_bytes()
        if same_bytes(raw,proof):
            return raw
    if proof['context'] == 'SNAPSHOT_HISTORIQUE':
        return read_git_reference(proof)
    raise ValueError('New V113 product must retain its current exact bytes: '+proof['path'])


def validate_manifest(data, check_files=True):
    if data.get('schemaVersion') != 1 or data.get('release') != 'V113' or data.get('baseline') != BASELINE:
        raise ValueError('V113 requires its exact V112 baseline')
    if data.get('sourceCompletion') is not False or data.get('closedSourceIds') != []:
        raise ValueError('Production tracking cannot close inherited source requirements')
    if data.get('sourceSnapshot') != {'context':'SNAPSHOT_HISTORIQUE','commit':SOURCE_COMMIT,'tree':SOURCE_TREE}:
        raise ValueError('Dated R7 source snapshot must retain its exact commit and tree')
    for proof in data['sourceInputs']:
        if proof.get('context') == 'SNAPSHOT_HISTORIQUE':
            if proof.get('sourceCommit') != SOURCE_COMMIT or proof.get('gitMode') not in ['100644','100755'] or len(proof.get('gitBlobOid','')) != 40:
                raise ValueError('Explicit immutable Git identity required for historical input')
        elif proof.get('context') != 'CURRENT_V113_PRODUCT_STRICT':
            raise ValueError('Every input must declare a historical snapshot or a strict current product context')
    audit_proof = next(p for p in data['sourceInputs'] if p['path']=='docs/v112-open-workstreams-audit.json')
    audit = json.loads(read_source_input(audit_proof))
    for key, source in [('sourceRequirements', 'sourceItems'), ('artTargets', 'artTargets')]:
        rows = data.get(key, [])
        original = {row['id']: row for row in audit[source]}
        if len(rows) != len(original) or {row.get('id') for row in rows} != set(original):
            raise ValueError('Every original source ID must occur exactly once: ' + key)
        for row in rows:
            if row.get('sourceClosed') is not False or row.get('humanValidated') is not False:
                raise ValueError('No automatic source/art/human admission: ' + str(row.get('id')))
            if key == 'sourceRequirements' and (row.get('source') != original[row['id']]['source'] or row.get('originalRowSha256') != original[row['id']]['originalRowSha256']):
                raise ValueError('Original requirement identity changed: ' + row['id'])
    if len(data['sourceRequirements']) != 56 or len(data['artTargets']) != 354:
        raise ValueError('The 56 source requirements and 354 art targets stay separate')
    valid_targets = {row['id'] for row in data['artTargets']}
    identities = set()
    for row in data.get('nativeCandidates', []):
        identity = (row['targetId'], row['attempt'])
        if identity in identities or row['targetId'] not in valid_targets:
            raise ValueError('Duplicate or unknown candidate attempt')
        identities.add(identity)
        if row.get('humanValidated') is not False or row.get('runtimeIntegrated') is not False or row.get('gameplayTested') is not False:
            raise ValueError('Generated candidates do not certify integration, gameplay or human validation')
        expected = 'CANDIDAT_TECHNIQUE_NON_INTEGRE' if row['strictRequested48pxMarginPass'] else 'CANDIDAT_NON_ADMIS'
        if row['status'] != expected or row.get('pixelsEdited') is not False:
            raise ValueError('Candidate status must retain its real technical result and native pixels')
        if (min(row['thresholdMeasurements']['0']['margins']) >= 48) != row['strictRequested48pxMarginPass']:
            raise ValueError('Strict alpha margin result contradicts its measurement')
        if check_files:
            if fingerprint(row['path']) != {k: row[k] for k in ['path', 'bytes', 'sha256']}:
                raise ValueError('Native candidate bytes changed: ' + row['path'])
            raw = local(row['path']).read_bytes()
            if raw[:8] != b'\x89PNG\r\n\x1a\n' or list(struct.unpack('>II', raw[16:24])) != row['dimensions'] or raw[24:26] != b'\x08\x06':
                raise ValueError('Native candidate must retain its measured 8-bit RGBA PNG dimensions')
    if check_files:
        if fingerprint(BASELINE['path']) != BASELINE:
            raise ValueError('V112 baseline bytes changed')
        paths = set()
        for proof in data['sourceInputs']:
            if proof['path'] in paths:
                raise ValueError('Duplicate source fingerprint: ' + proof['path'])
            read_source_input(proof)
            paths.add(proof['path'])
    return data


def words(value):
    if isinstance(value, list):
        return '\n'.join(words(item) for item in value)
    if isinstance(value, dict):
        return json.dumps(value, ensure_ascii=False, sort_keys=True)
    return '' if value is None else str(value)


def sheet(name, title, subtitle, columns, rows):
    return {'name': name, 'title': title, 'subtitle': subtitle,
            'columns': [{'key': key, 'label': label, 'width': width} for key, label, width in columns],
            'rows': [{k: words(v) for k, v in row.items()} for row in rows]}


def build_sheets(data):
    candidates = data['nativeCandidates']
    summary = [
        {'measure': 'Exigences source globalement ouvertes', 'value': 56, 'scope': 'Dont neuf actions ; aucune clôture automatique'},
        {'measure': 'Cibles artistiques globalement ouvertes', 'value': 354, 'scope': 'Catalogue distinct des exigences source'},
        {'measure': 'Feuilles historiques conservées', 'value': 122, 'scope': 'XML V112 identiques, puis huit feuilles V113'},
        {'measure': 'Cibles ayant une nouvelle génération', 'value': len({r['targetId'] for r in candidates}), 'scope': 'Un candidat généré ne ferme pas sa cible'},
        {'measure': 'Originaux générés conservés', 'value': len(candidates), 'scope': 'Essais séparés ; aucun pixel retouché'},
        {'measure': 'Candidats admis techniquement', 'value': sum(r['strictRequested48pxMarginPass'] for r in candidates), 'scope': 'Marge stricte alpha>0 de48px ; seuils relâchés non substitués'},
        {'measure': 'Nouvelles intégrations runtime / tests gameplay / validations humaines', 'value': 0, 'scope': 'Ces étapes sont distinctes et non réalisées par ce classeur'},
    ]
    summary.extend({'measure': key, 'value': value, 'scope': 'Réconciliation de présence, aucune admission artistique'} for key, value in data['artReconciliation']['counts'].items())
    sources = [dict(row, role='SOURCE_EPINGLEE') for row in data['sourceInputs']]
    return [
        sheet('SyntheseV113', 'V113 — production ouverte et candidats natifs', data['scope'], [('measure','Mesure',58),('value','Valeur',22),('scope','Portée / limite',110)], summary),
        sheet('OuvertsSourceV113', 'Les56exigences source restent ouvertes', 'Instantané R7 au commit03cf ; les neuf actions sont incluses et les lots se recouvrent.', [('id','ID',38),('family','Famille',35),('source','Cellule source exacte',50),('originalNeed','Besoin source',100),('genuineMissingScope','Manquant au relevé / portée',110),('currentBoundedDelivery','Livraison bornée au relevé R7',100),('existingPaths','Chemins au relevé R7',100),('acceptance','Admission attendue',110),('status','État global',30)], data['sourceRequirements']),
        sheet('ArtCatalogueV113', '354cibles — présence distincte de l’admission', 'Présence au relevé R7/03cf puis nouveaux candidats ; aucune mesure d’un runtime futur.', [('id','ID',30),('label','Cible',42),('family','Famille',46),('historicalStatus','Inventaire V111',34),('physicalAssessment','Présence au relevé / nouveaux candidats',55),('existingCandidateCount','Candidats du relevé R7',20),('existingCandidatePaths','Chemins du relevé R7',100),('generationAttempts','Nouveaux essais natifs',22),('status','État artistique',32),('remaining','Admission restante',105)], data['artTargets']),
        sheet('LotsProductionV113', 'Lots de travail concrets, sans clôture automatique', 'Les lots se recouvrent ; un lot prêt ou une image ne constitue pas un gameplay terminé.', [('id','Lot',42),('priority','Priorité',14),('domain','Domaine',35),('sourceIds','IDs source',65),('sessionState','Étape actuelle',55),('deliverable','Livrable borné',105),('missingReality','Manquant constaté',115),('existingPaths','Fichiers voisins',100),('admission','Critères d’admission',120)], data['productionLots']),
        sheet('CandidatsV113', 'Générations natives et résultats techniques réels', 'Aucun candidat intégré ou validé humainement ; les seuils alpha diagnostiques ne remplacent pas le seuil strict.', [('targetId','Cible',32),('attempt','Essai',12),('path','PNG natif exact',105),('sha256','SHA256',70),('dimensions','Dimensions réelles',23),('status','État technique',36),('alphaExtrema','Alpha min/max',22),('strictRequested48pxMarginPass','Marge48px alpha>0',23),('pivot','Pivot proposé, non testé runtime',100),('technicalLimits','Limites',110)], candidates),
        sheet('ClasseursV113', 'Classeurs sources de l’audit', 'Instantané des27classeurs sources et du coordinateur ; le nouveau V113 s’exclut de cet inventaire historique.', [('path','Classeur',100),('sha256','SHA256',70),('bytes','Octets',18),('worksheets','Feuilles',18),('auditRole','Portée',75)], data['workbooks']),
        sheet('SourcesV113', 'Sources et originaux épinglés', 'Références R7 SNAPSHOT_HISTORIQUE au commit03cf ; nouveaux produits vérifiés strictement dans leurs octets actuels.', [('path','Source',115),('sha256','SHA256',70),('bytes','Octets',20),('context','Contexte',36),('sourceCommit','Commit historique',46),('role','Rôle',28)], sources),
        sheet('JournalV113', 'Journal de production et frontières', 'Les observations GitHub datées sont séparées des attestations de gameplay et des fusions dans main.', [('id','Événement',42),('date','Date UTC',32),('state','État',45),('scope','Portée / source',120),('limit','Limite',120)], data['events']),
    ]


def payload(data):
    return {'root': str(ROOT), 'baseline': {'path': BASELINE['path'], 'sha256': BASELINE['sha256']},
            'release': 'V113', 'summary': 'SyntheseV113', 'historicalCount': 122,
            'zipDate': [2026,11,2,0,0,0], 'appendedSheets': SHEET_NAMES, 'sheets': build_sheets(data)}


def generate(manifest=MANIFEST, output=OUTPUT, check=False):
    data = validate_manifest(json.loads(local(str(manifest)).read_text()))
    request = payload(data)
    workbook = append.build_workbook(request)
    target = local(str(output))
    if check:
        if target.read_bytes() != workbook:
            raise ValueError('V113 workbook does not reproduce its exact source bytes')
    else:
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(workbook)
    verified = append.verify_workbook({**request, 'workbookPath': str(target)})
    result = {'schemaVersion':1, 'release':'V113', 'status':'PASS_STRUCTURE_AND_PROVENANCE',
              'workbook':fingerprint(str(output)), 'manifest':fingerprint(str(manifest)),
              'baseline':BASELINE, 'sourceRequirementsOpen':56, 'artTargetsOpen':354,
              'newSourceClosures':0, 'generatedTargets':len({r['targetId'] for r in data['nativeCandidates']}),
              'nativeAttempts':len(data['nativeCandidates']), 'runtimeIntegrations':0,
              'newGameplayTests':0, 'humanArtisticValidations':0, 'sourceFilesVerified':len(data['sourceInputs']),
              'sourceSnapshot':data['sourceSnapshot'],
              'historicalSourceInputs':sum(p['context']=='SNAPSHOT_HISTORIQUE' for p in data['sourceInputs']),
              'strictCurrentProductInputs':sum(p['context']=='CURRENT_V113_PRODUCT_STRICT' for p in data['sourceInputs']),
              'verification':verified, 'nativeExcelExecuted':False,
              'scope':'Production tracking only. Technical structure/provenance does not certify pixels, integration, gameplay or human artistic validation.'}
    if str(output) == str(OUTPUT):
        if check:
            if local(str(QA)).read_bytes() != json_bytes(result):
                raise ValueError('V113 QA metadata is not reproducible')
        else:
            local(str(QA)).write_bytes(json_bytes(result))
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check',action='store_true')
    parser.add_argument('--manifest',default=str(MANIFEST))
    parser.add_argument('--output',default=str(OUTPUT))
    args = parser.parse_args()
    result = generate(args.manifest,args.output,args.check)
    print(json.dumps({'status':result['status'],'workbook':result['workbook'],
                      'worksheets':len(result['verification']['sheetNames']),
                      'historicalWorksheetsPreserved':result['verification']['originalSheetsPreserved'],
                      'sourceRequirementsOpen':56,'artTargetsOpen':354,
                      'nativeAttempts':result['nativeAttempts'],'humanArtisticValidations':0},ensure_ascii=False))


if __name__ == '__main__':
    main()
