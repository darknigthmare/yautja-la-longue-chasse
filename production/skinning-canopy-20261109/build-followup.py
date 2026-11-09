#!/usr/bin/env python3
"""Build additive skinning/canopy OOXML and HTML with repository stdlib layout."""
import argparse
from collections import Counter
from hashlib import sha1, sha256
import importlib.util
import json
from pathlib import Path
import re
import subprocess
import sys
from urllib.parse import quote, unquote, urlsplit
import xml.etree.ElementTree as ET
from zipfile import ZipFile
from io import BytesIO

sys.dont_write_bytecode = True
HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
DATA = HERE / 'qualification.json'
BASELINE = HERE / 'baseline.json'
NAME = 'Yautja_Skinning_Canopee_20261109'
DELIVERY_DOCS = ['docs/campagne/AVENANT_SKINNING_CANOPEE_20261109.md', 'docs/campagne/README.md', 'docs/hunt-mechanics-v112.md']
FORMATTER = ROOT / 'production/reprise-chasse-bible-20261109/build-followup.py'
spec = importlib.util.spec_from_file_location('frozen_stdlib_formatting_only', FORMATTER)
formatting = importlib.util.module_from_spec(spec)
spec.loader.exec_module(formatting)


def encoded(value):
    return (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode()


def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT)


def safe_path(path):
    assert isinstance(path, str) and path and not Path(path).is_absolute()
    assert all(part not in ('', '.', '..') for part in path.split('/')), path
    return path


def current(path):
    target = ROOT / safe_path(path)
    assert not target.is_symlink(), path
    if target.is_file():
        return target.read_bytes(), 'WORKTREE_BYTES'
    assert git('ls-files', '-t', '--', path).decode().strip() == 'S ' + path, path
    return git('show', 'HEAD:' + path), 'SPARSE_TRACKED_HEAD'


def identity(path, raw, observation):
    return {'path': path, 'bytes': len(raw), 'sha256': sha256(raw).hexdigest(),
            'gitBlob': sha1(('blob ' + str(len(raw)) + '\0').encode() + raw).hexdigest(),
            'observation': observation}


def link(data, path, ref=None, line=None):
    ref = ref or data.get('reviewedCodeCommit') or data['branch']
    return 'https://github.com/darknigthmare/yautja-la-longue-chasse/blob/' + ref + '/' + quote(safe_path(path), safe='/') + ('#L' + str(line) if line else '')


def validate(data, baseline, complete=False):
    assert data['schemaVersion'] == baseline['schemaVersion'] == 1
    assert data['baseCommit'] == baseline['baseCommit']
    assert re.fullmatch('[0-9a-f]{40}', data['baseCommit'])
    git('merge-base', '--is-ancestor', data['baseCommit'], 'HEAD')
    assert data['releaseState'] in ('EN_ATTENTE', 'QUALIFICATION_BORNEE', 'PARTIEL')
    if data.get('reviewedCodeCommit'):
        assert re.fullmatch('[0-9a-f]{40}', data['reviewedCodeCommit'])
        git('merge-base', '--is-ancestor', data['reviewedCodeCommit'], 'HEAD')
    source_ids = {s['id'] for s in data['sourceReferences']}
    assert len(source_ids) == len(data['sourceReferences'])
    evidence = {e['id']: e for e in data['evidence']}
    assert len(evidence) == len(data['evidence'])
    rows = data['criteria']
    assert len(rows) >= 1 and len(rows) == len({r['id'] for r in rows})
    allowed = {'EN_ATTENTE', 'VERIFIE_BORNE', 'PARTIEL', 'NON_QUALIFIE', 'HORS_PORTEE'}
    phases = ['implementationStatus', 'resourceStatus', 'behaviorStatus', 'browserStatus', 'physicalStatus', 'artStatus']
    for row in rows:
        assert row['checks'] and row['acceptance'] and row['limits']
        assert set(row['sourceIds']) <= source_ids and set(row['evidence']) <= evidence.keys()
        assert all(row[k] in allowed for k in phases)
        assert row['qualification'] in allowed
        kinds = {evidence[e]['kind'] for e in row['evidence']}
        if row['qualification'] != 'EN_ATTENTE':
            assert row['evidence'], 'A qualification needs executed evidence: ' + row['id']
        if row['behaviorStatus'] == 'VERIFIE_BORNE':
            assert kinds & {'BEHAVIOR', 'FINAL_REGRESSION'}, row['id']
        if row['browserStatus'] == 'VERIFIE_BORNE':
            assert 'BROWSER' in kinds, row['id']
        if row['physicalStatus'] == 'VERIFIE_BORNE':
            assert 'PHYSICAL' in kinds, row['id']
        if row['artStatus'] == 'VERIFIE_BORNE':
            assert 'HUMAN_ART' in kinds, row['id']
    for gate in data['deliveryChecks']:
        assert gate['status'] in ('EN_ATTENTE', 'PASS', 'FAIL', 'PARTIEL')
        assert set(gate['evidence']) <= evidence.keys()
        if gate['status'] == 'PASS':
            assert gate['evidence'], gate['id']
    hunt = json.loads((ROOT / 'docs/hunt-mechanics-v112.json').read_text())
    remaining = next(s['rows'] for s in hunt['sheets'] if s['name'] == 'Restant')
    assert remaining == baseline['remainingV112']
    assert len(remaining) == 8 and all(r['status'] == 'NON_QUALIFIE' for r in remaining)
    checked = []
    cache = {}
    for item in baseline['protectedFiles']:
        if item['path'] not in cache:
            raw, observation = current(item['path'])
            cache[item['path']] = identity(item['path'], raw, observation)
        actual = cache[item['path']]
        assert all(actual[k] == item[k] for k in ('bytes', 'sha256', 'gitBlob')), item['path']
        checked.append({**item, 'observation': actual['observation']})
    inputs = []
    if complete:
        for source in data['sourceReferences']:
            path = source['path']
            if source['reference'] == 'BASE':
                raw = git('show', data['baseCommit'] + ':' + safe_path(path))
                actual = identity(path, raw, 'PINNED_BASE_GIT_BYTES')
            else:
                raw, observed = current(path)
                actual = identity(path, raw, observed)
                if source['reference'] == 'CODE_REVIEW' and data.get('reviewedCodeCommit'):
                    assert git('rev-parse', data['reviewedCodeCommit'] + ':' + path).decode().strip() == actual['gitBlob'], path
            inputs.append({**source, **actual})
        for item in data['evidence']:
            raw, observation = current(item['path'])
            assert item['sha256'] == sha256(raw).hexdigest(), item['id']
            assert item['sourceCommit'] and item['executionContext'] and item['scope'] and item['result'], item['id']
            assert item['command'] and item.get('exitCode') is not None, item['id']
            if item.get('requireCurrentSources'):
                report = json.loads(raw)
                assert item.get('sourceBindingField') in ('sourceOverlay','overlays','sourceFiles','sourceHashes','sourcesAfter','sourceSha256')
                if item['sourceBindingField'] == 'sourcesAfter':
                    assert report.get('sourceBytesStable') is True and report['sourcesBefore'] == report['sourcesAfter'], item['id']
                bindings = report[item['sourceBindingField']]
                if isinstance(bindings, dict):
                    bindings = [dict(value, path=path) if isinstance(value,dict) else {'path':path,'sha256':value} for path,value in bindings.items()]
                assert bindings, item['id']
                for binding in bindings:
                    source, _ = current(binding['path'])
                    assert sha256(source).hexdigest() == binding['sha256'], 'Executed source differs: ' + item['id'] + ':' + binding['path']
                    if 'bytes' in binding:
                        assert len(source) == binding['bytes'], binding['path']
            if item['kind'] == 'BROWSER' and item['result'] == 'PASS':
                report = json.loads(raw)
                assert report.get('browserExecuted') is True and report.get('passed') is True, item['id']
                assert report.get('checks') and all(r.get('passed') is True if 'passed' in r else r.get('status') == 'PASS' for r in report['checks']), item['id']
                assert not any(report.get(k) for k in ('errors', 'consoleErrors', 'missingAssets', 'assetFailures')), item['id']
            inputs.append({**item, **identity(item['path'], raw, observation)})
        for asset in data.get('assets', []):
            raw, observation = current(asset['path'])
            assert asset.get('sha256') == sha256(raw).hexdigest(), asset['id']
            assert asset['purpose'] and asset.get('usedIn'), asset['id']
            assert set(asset.get('evidence', [])) <= evidence.keys(), asset['id']
            for source_path in asset['usedIn']:
                assert (ROOT / safe_path(source_path)).is_file(), source_path
            if asset['humanReviewStatus'] == 'VERIFIE_BORNE':
                assert any(evidence[e]['kind'] == 'HUMAN_ART' for e in asset.get('evidence', [])), asset['id']
            inputs.append({'id':asset['id'],'scope':asset['purpose'],'reference':'ASSET_BYTES',**identity(asset['path'],raw,observation)})
    return checked, inputs


def tables(data, baseline, history, inputs):
    sources = {r['id']: r for r in data['sourceReferences']}
    primary = lambda row: link(data, sources[row['sourceIds'][0]]['path'], data['baseCommit'] if sources[row['sourceIds'][0]]['reference'] == 'BASE' else data['branch'] if sources[row['sourceIds'][0]]['reference'] == 'CURRENT_DELIVERY' else None, sources[row['sourceIds'][0]].get('line'))
    summary = [['BASE', 'Point de départ', 'REFERENCE_EPINGLEE', data['baseCommit'], link(data, 'AGENTS.md', data['baseCommit'])],
               ['CODE', 'Référence de revue finale', data['releaseState'], data.get('reviewedCodeCommit') or 'En attente', ''],
               ['EXECUTION', 'Code produit exécuté', 'DATE_A_CONSERVER', data.get('executedProductCommit') or 'En attente', ''],
               ['SCOPE', 'Portée', 'TRANCHE_LOGICIELLE', data['scope'], ''],
               ['CRITERES', 'Critères dérivés', str(len(data['criteria'])), 'Ils ne comptent pas de nouvelles missions et ne réécrivent pas les anciens statuts.', ''],
               ['ORIGINAUX', 'Classeurs historiques préservés', '108', 'Octets vérifiés ; lecture sparse explicitement distinguée.', link(data, 'production/excel-bible-20261108/suivi/excel-inventory.json', data['baseCommit'])],
               ['LOT-PRECEDENT', 'Fichiers du lot précédent préservés', str(baseline['frozenDeliveryFiles']), 'Aucun résultat daté requalifié pour les nouveaux octets.', link(data, 'production/reprise-chasse-bible-20261109/README.md', data['baseCommit'])],
               ['CI-PRECEDENT', 'Suivi CI précédent préservé', str(baseline.get('frozenCiFiles',0)), 'Échec initial et correction locale conservés séparément.', link(data, 'production/reprise-chasse-bible-ci-20261109/README.md', data['baseCommit'])],
               ['RESTANT', 'Huit qualifications V112', 'NON_QUALIFIE', 'Textes, règles et acceptations reproduits exactement.', link(data, 'docs/hunt-mechanics-v112.json', data['baseCommit'])],
               ['EXCEL', 'Application Excel native', 'NON_EXECUTEE', 'OOXML, liens et génération déterministe uniquement.', '']]
    summary += [[g['id'], g['title'], g['status'], 'Preuves : ' + (' · '.join(g['evidence']) or 'En attente'), ''] for g in data['deliveryChecks']]
    summary += [['POLICY-' + str(i), 'Règle de qualification', 'A_CONSERVER', text, ''] for i, text in enumerate(data['qualificationPolicy'], 1)]
    criteria = [[r['id'], r['domain'], r['title'], r['acceptance'], r['implementation'], *[r[k] for k in ('implementationStatus','resourceStatus','behaviorStatus','browserStatus','physicalStatus','artStatus','qualification')], ' · '.join(r['evidence']) or 'En attente', r['limits'], primary(r)] for r in data['criteria']]
    recipes = [[r['id'] + '-' + str(i), r['id'], text, r['behaviorStatus'], r['browserStatus'], ' · '.join(r['evidence']) or 'En attente', r['limits'], primary(r)] for r in data['criteria'] for i, text in enumerate(r['checks'], 1)]
    proofs = [[e['id'], e['kind'], e['result'], e['scope'], e['sourceCommit'], e['executionContext'], ' '.join(e['command']), e['exitCode'], e['sha256'], link(data, e['path'], data['branch'])] for e in data['evidence']]
    if not proofs:
        proofs = [['ATTENTE','AUCUNE_EXECUTION','EN_ATTENTE','Aucun résultat de cette tranche encore reçu.','','','','','','']]
    asset_rows = [[a['id'], a['path'], a['purpose'], a['generatedStatus'], a['integrationStatus'], a['testedStatus'], a['humanReviewStatus'], a.get('sha256','En attente'), link(data, a['path'])] for a in data.get('assets', [])]
    if not asset_rows:
        asset_rows = [['ATTENTE','','Ressources à rapprocher du rendu final.','EN_ATTENTE','EN_ATTENTE','EN_ATTENTE','NON_QUALIFIE','','']]
    source_rows = [[r['id'], r['path'], r['scope'], r.get('reference','EXECUTION'), r['bytes'], r['sha256'], link(data, r['path'], data['baseCommit'] if r.get('reference') == 'BASE' else data['branch'] if 'kind' in r or r.get('reference') == 'CURRENT_DELIVERY' else None, r.get('line'))] for r in inputs]
    remaining = [[r['id'], r['status'], r['topic'], r['rule'], r['acceptance'], link(data, r['source'], data['baseCommit'])] for r in baseline['remainingV112']]
    protected = [[str(i), r['scope'], r['path'], r['bytes'], r['sha256'], r['gitBlob'], 'OCTETS_CONTROLES_CONTRE_BASELINE', link(data, r['path'], data['baseCommit'])] for i, r in enumerate(history, 1)]
    continuity = [[r['id'], r['title'], r['status'], r['detail']] for r in data['remainingActions']]
    return [
        ('Synthese',data['title'],[('ID',22),('Sujet',45),('État',30),('Détail',100),('Lien',100)],summary),
        ('Criteres','Contrats dérivés et qualifications distinctes',[('ID',20),('Domaine',22),('Sujet',45),('Acceptation',110),('Raccord réalisé',90),('Code',24),('Ressources',24),('Logique',24),('Navigateur',24),('Appareil',24),('Art humain',24),('Qualification',28),('Preuves',65),('Limites',90),('Source',100)],criteria),
        ('Recettes','Scénarios attendus — qualifications bornées du critère',[('ID',24),('Critère',20),('Scénario attendu',110),('Logique du critère',26),('Navigateur du critère',28),('Preuves et portée',65),('Limites du critère',95),('Source',100)],recipes),
        ('Ressources','Ressources produites, consommées et testées',[('ID',24),('Chemin',95),('Usage réel',100),('Produit',24),('Intégré',24),('Testé',24),('Revue humaine',28),('SHA-256',72),('Source',100)],asset_rows),
        ('Preuves','Exécutions exactes et limites',[('ID',30),('Nature',28),('Résultat',24),('Portée',110),('Source',45),('Contexte',110),('Commande',130),('Code retour',18),('SHA-256',72),('Rapport',100)],proofs),
        ('Sources','Sources et empreintes de la nouvelle tranche',[('ID',28),('Chemin',105),('Portée',100),('Référence',28),('Octets',18),('SHA-256',72),('Lien',100)],source_rows),
        ('RestantV112','Huit critères originaux, texte inchangé',[('ID',22),('Statut',28),('Sujet',48),('Règle',110),('Acceptation',130),('Source',100)],remaining),
        ('Continuite','Autres qualifications conservées',[('ID',28),('Sujet',48),('Statut',28),('Reste',130)],continuity),
        ('Historique','Identités préservées du baseline',[('ID',18),('Portée',30),('Chemin',110),('Octets',18),('SHA-256',72),('Objet Git',48),('Contrôle',38),('Source',100)],protected),
    ]


def workbook_bytes(data, sheets):
    # Every row already provides its exact GitHub URL. A repeated local path
    # may refer to both the pinned baseline and the new delivery; implicit
    # local-file links must not silently select the other revision.
    previous_root = formatting.layout.ROOT
    sentinel = Path('/__skinning_canopy_no_implicit_file_links__')
    assert not sentinel.exists()
    formatting.layout.ROOT = sentinel
    try:
        return formatting.workbook_bytes(data, sheets)
    finally:
        formatting.layout.ROOT = previous_root


def link_targets(data, workbook):
    refs = sorted(filter(None, [data['baseCommit'], data['branch'], data.get('reviewedCodeCommit')]), key=len, reverse=True)
    targets = set()
    with ZipFile(BytesIO(workbook)) as archive:
        for name in archive.namelist():
            if name.endswith('.rels'):
                for rel in ET.fromstring(archive.read(name)):
                    if rel.attrib.get('TargetMode') == 'External':
                        targets.add(rel.attrib['Target'])
    rows = []
    prefix = '/darknigthmare/yautja-la-longue-chasse/blob/'
    for target in sorted(targets):
        value = unquote(urlsplit(target).path)
        assert value.startswith(prefix), target
        value = value[len(prefix):]
        ref = next((r for r in refs if value.startswith(r + '/')), None)
        assert ref, target
        path = safe_path(value[len(ref)+1:])
        if ref == data['branch']:
            assert (ROOT / path).is_file(), path
            context = 'BRANCH_FILE_PRESENT_NOT_PINNED'
        else:
            actual = git('ls-tree', '-z', ref, '--', path).decode().split('\0')[0]
            assert actual and actual.split('\t', 1)[1] == path, target
            context = 'PINNED_GIT_OBJECT'
        rows.append({'ref':ref,'path':path,'context':context})
    return rows


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    parser.add_argument('--check-data', action='store_true', help='Validate draft and protected identities without generating XLSX/HTML')
    args = parser.parse_args()
    assert not (args.check and args.check_data)
    data = json.loads(DATA.read_text())
    baseline = json.loads(BASELINE.read_text())
    history, inputs = validate(data, baseline, complete=not args.check_data)
    if args.check_data:
        print(json.dumps({'status':'PASS_DATA_ONLY_NO_EXPORT','criteria':len(data['criteria']),'protectedEntries':len(history),'originalWorkbooks':108,'remainingV112':8,'qualificationsReceived':sum(r['qualification']!='EN_ATTENTE' for r in data['criteria'])}))
        return
    sheets = tables(data, baseline, history, inputs)
    workbook = workbook_bytes(data, sheets)
    companion = formatting.companion_html(data, sheets)
    verification = formatting.verify_xlsx(workbook, sheets)
    report = {'schemaVersion':1,'baseCommit':data['baseCommit'],'reviewedCodeCommit':data.get('reviewedCodeCommit'),'releaseState':data['releaseState'],
              'workbook':identity(str((HERE/(NAME+'.xlsx')).relative_to(ROOT)),workbook,'GENERATED'),
              'companion':identity(str((HERE/(NAME+'.html')).relative_to(ROOT)),companion,'GENERATED'),
              'qualificationSha256':sha256(DATA.read_bytes()).hexdigest(),'baselineSha256':sha256(BASELINE.read_bytes()).hexdigest(),
              'verification':verification,'criteria':len(data['criteria']),'qualifications':dict(Counter(r['qualification'] for r in data['criteria'])),
              'sourceInputs':inputs,'protectedEntries':len(history),'protectedUniqueFiles':len({r['path'] for r in history}),'originalWorkbooks':108,
              'frozenDeliveryFiles':baseline['frozenDeliveryFiles'],'frozenCiFiles':baseline.get('frozenCiFiles',0),'remainingV112':baseline['remainingV112'],'newGlobalClosuresClaimed':0,
              'linkTargets':link_targets(data,workbook),'deliveryChecks':data['deliveryChecks']}
    outputs = {HERE/(NAME+'.xlsx'):workbook,HERE/(NAME+'.html'):companion,HERE/'verification-classeur.json':encoded(report)}
    for path, raw in outputs.items():
        if args.check:
            assert path.read_bytes() == raw, 'Reproduction differs: ' + str(path)
        else:
            path.write_bytes(raw)
    files = []
    for path in sorted(HERE.rglob('*')):
        if path.is_file() and path.name != 'manifest-final.json' and '__pycache__' not in path.parts:
            assert not path.is_symlink(), str(path)
            files.append(identity(str(path.relative_to(ROOT)), path.read_bytes(), 'DELIVERY_FILE'))
    documents = [identity(path, current(path)[0], 'CURRENT_DELIVERY_DOCUMENT') for path in DELIVERY_DOCS]
    manifest = encoded({'schemaVersion':1,'baseCommit':data['baseCommit'],'reviewedCodeCommit':data.get('reviewedCodeCommit'),
                        'files':files,'fileCount':len(files),'bytes':sum(r['bytes'] for r in files),'deliveryDocuments':documents,'nativeExcelExecuted':False})
    if args.check:
        assert (HERE/'manifest-final.json').read_bytes() == manifest
    else:
        (HERE/'manifest-final.json').write_bytes(manifest)
    print(json.dumps({'status':'PASS_REPRODUCIBLE_OOXML' if args.check else 'GENERATED','qualification':data['releaseState'],**verification,'criteria':len(data['criteria']),'protectedEntries':len(history),'sha256':sha256(workbook).hexdigest()},ensure_ascii=False))


if __name__ == '__main__':
    main()
