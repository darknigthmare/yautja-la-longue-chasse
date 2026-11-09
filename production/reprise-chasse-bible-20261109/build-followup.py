#!/usr/bin/env python3
"""Deterministic supplemental OOXML, reusing the repository's stdlib writer.

The historical writer is imported as a layout library; its data collection and
main are never run. No historical workbook, report or source is rewritten.
"""
import argparse
from collections import Counter
from hashlib import sha1, sha256
import html
from io import BytesIO
import importlib.util
import json
import math
from pathlib import Path
import posixpath
import re
import subprocess
import sys
from urllib.parse import quote
from urllib.parse import unquote, urlsplit
import xml.etree.ElementTree as ET
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED

sys.dont_write_bytecode = True
HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
DATA = HERE / 'qualification-reprise.json'
NAME = 'Yautja_Reprise_Chasse_Bible_20261109'
XLSX = HERE / (NAME + '.xlsx')
HTML = HERE / (NAME + '.html')
INVENTORY = 'production/excel-bible-20261108/suivi/excel-inventory.json'
REGISTER = 'production/excel-bible-20261108/suivi/excel-open-register.json'
HUNT = 'docs/hunt-mechanics-v112.json'
HUNT_XLSX = 'docs/YAUTJA_V112_MECANIQUES_CHASSE.xlsx'
PREVIOUS = ['production/excel-bible-20261108', 'production/excel-bible-suite-20261108', 'production/excel-bible-witnesses-20261108']
LAYOUT_PATH = ROOT / 'scripts/build-resume-workbook-20261101.py'
spec = importlib.util.spec_from_file_location('dated_layout_only', LAYOUT_PATH)
layout = importlib.util.module_from_spec(spec)
spec.loader.exec_module(layout)


def js(value):
    return (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode()


def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT)


def path_local(file):
    assert isinstance(file, str) and not Path(file).is_absolute()
    assert all(p not in ('', '.', '..') for p in file.split('/')), file
    return file


def current_bytes(file):
    path_local(file)
    target = ROOT / file
    assert not target.is_symlink(), file
    if target.exists():
        assert target.is_file(), file
        return target.read_bytes(), 'WORKTREE'
    assert git('ls-files', '-t', '--', file).decode().strip() == 'S ' + file, 'Missing non-sparse source: ' + file
    return git('show', 'HEAD:' + file), 'SPARSE_HEAD'


def fingerprint(file):
    raw, observation = current_bytes(file)
    return {'path': file, 'bytes': len(raw), 'sha256': sha256(raw).hexdigest(),
            'gitBlob': sha1(('blob ' + str(len(raw)) + '\0').encode() + raw).hexdigest(),
            'observation': observation}


def url(data, file, line=None, current=None):
    if current is None:
        current=any(source['path']==file and source.get('reference')!='BASE' for source in data['sourceReferences'])
    ref = data['baseCommit']
    if current:
        ref = data['reviewedCodeCommit'] if file.startswith(('app/','scripts/','tests/')) and data['reviewedCodeCommit'] else data['branch']
    result = 'https://github.com/darknigthmare/yautja-la-longue-chasse/blob/' + ref + '/' + quote(file, safe='/')
    return result + ('#L' + str(line) if line else '')


def protected_history(data):
    inventory = json.loads((ROOT / INVENTORY).read_text())
    assert len(inventory['inventory']) == 108
    originals = []
    for item in inventory['inventory']:
        actual = fingerprint(item['path'])
        assert actual['sha256'] == item['sha256'] and actual['bytes'] == item['bytes'], item['path']
        assert git('rev-parse', data['baseCommit'] + ':' + item['path']).decode().strip() == actual['gitBlob'], item['path']
        originals.append({**actual, 'scope': item['scope'], 'sheetCount': item['sheetCount']})
    previous = []
    tree = git('ls-tree', '-r', '-z', data['baseCommit'], '--', *PREVIOUS).decode().split('\0')
    for item in filter(None, tree):
        metadata, file = item.split('\t', 1)
        _, kind, blob = metadata.split()
        assert kind == 'blob'
        actual = fingerprint(file)
        assert actual['gitBlob'] == blob, 'Dated production lot changed: ' + file
        previous.append(actual)
    assert len(previous) >= 125
    hunt = fingerprint(HUNT_XLSX)
    assert hunt['bytes'] == 740369 and hunt['sha256'] == '39f9470537721b13766bf4436d0f43623e06d1bee8c860ec570a4ab1f4f867ec'
    return {'schemaVersion': 1, 'baseCommit': data['baseCommit'], 'originalWorkbooks': originals,
            'datedProductionFiles': previous, 'huntV112': hunt,
            'scope': 'Observed bytes retain their original identities. Sparse entries are read from tracked HEAD, not claimed as a local Excel session.'}


def collect(data, history):
    assert data['schemaVersion'] == 1 and re.fullmatch('[a-f0-9]{40}', data['baseCommit'])
    assert data['releaseState'] in ('EN_ATTENTE', 'QUALIFICATION_BORNEE')
    if data['reviewedCodeCommit'] is not None:
        assert re.fullmatch('[a-f0-9]{40}', data['reviewedCodeCommit'])
        git('merge-base', '--is-ancestor', data['reviewedCodeCommit'], 'HEAD')
    git('merge-base', '--is-ancestor', data['baseCommit'], 'HEAD')
    rows = data['criteria']
    assert len(rows) == len({r['id'] for r in rows}) == 12
    sources = {r['id']: r for r in data['sourceReferences']}
    assert len(sources) == len(data['sourceReferences'])
    evidence = {r['id']: r for r in data['currentEvidence']}
    assert len(evidence) == len(data['currentEvidence'])
    for gate in data.get('deliveryChecks', []):
        assert gate['status'] in ('EN_ATTENTE', 'PASS', 'PARTIEL', 'FAIL')
        assert set(gate['evidence']) <= evidence.keys()
        if gate['status'] == 'PASS':
            assert gate['evidence'], 'A delivery gate needs its executed receipt: ' + gate['id']
    phases = ('implementationStatus', 'behaviorStatus', 'browserStatus', 'physicalStatus', 'artStatus')
    allowed = {'EN_ATTENTE', 'VERIFIE_BORNE', 'PARTIEL', 'NON_QUALIFIE', 'HORS_PORTEE'}
    for row in rows:
        assert all(row[p] in allowed for p in phases)
        assert set(row['sourceIds']) <= sources.keys()
        assert set(row['evidence']) <= evidence.keys()
        if row['qualification'] != 'EN_ATTENTE':
            assert row['evidence'], 'A new qualification needs an executed report: ' + row['id']
        kinds = {evidence[key]['kind'] for key in row['evidence']}
        if row['behaviorStatus'] == 'VERIFIE_BORNE':
            assert kinds & {'BEHAVIOR', 'FINAL_REGRESSION'}, 'Historical passes alone cannot qualify final behavior: ' + row['id']
        if row['browserStatus'] == 'VERIFIE_BORNE':
            assert 'BROWSER' in kinds, 'A prepared recipe or milestone is not the final browser proof: ' + row['id']
    register = json.loads((ROOT / REGISTER).read_text())
    criteria = [next(r for r in register['items'] if r['key'] == key) for key in ['Clan Ship:OPS-B03', 'Clan Ship:OPS-B04', 'Clan Ship:OPS-Q26']]
    assert criteria[1]['criterion'] == 'Guider un groupe revenu du hangar aux soins puis présenter son relevé au conseil.'
    hunt = json.loads((ROOT / HUNT).read_text())
    remaining = next(s['rows'] for s in hunt['sheets'] if s['name'] == 'Restant')
    assert len(remaining) == 8 and all(r['status'] == 'NON_QUALIFIE' for r in remaining)
    fingerprints = []
    for source in data['sourceReferences']:
        actual = fingerprint(source['path'])
        if source.get('reference') == 'BASE':
            assert git('rev-parse', data['baseCommit'] + ':' + source['path']).decode().strip() == actual['gitBlob'], 'Pinned source changed: ' + source['path']
        if source.get('reference') == 'CODE_REVIEW' and data['reviewedCodeCommit']:
            assert git('rev-parse', data['reviewedCodeCommit'] + ':' + source['path']).decode().strip() == actual['gitBlob'], 'Reviewed code changed: ' + source['path']
        fingerprints.append({**source, **actual})
    for item in data['currentEvidence']:
        actual = fingerprint(item['path'])
        assert item.get('sha256') == actual['sha256'], 'Executed report identity missing or changed: ' + item['id']
        assert item.get('sourceCommit') and item.get('scope') and item.get('result'), item['id']
        if item['kind'] == 'BROWSER':
            observed = json.loads((ROOT / item['path']).read_text())
            assert observed.get('browserExecuted') is True and observed.get('passed') is True, item['id']
            assert observed.get('checks') and all(row.get('passed') is True for row in observed['checks']), item['id']
            assert not any(observed.get(key) for key in ('errors','consoleErrors','missingAssets')), item['id']
        fingerprints.append({**item, **actual})
    return sources, criteria, remaining, fingerprints


def tables(data, history, sources, source_criteria, remaining, fingerprints):
    rows = data['criteria']
    def primary(row):
        ref = sources[row['sourceIds'][0]]
        return url(data, ref['path'], ref.get('line'))
    counts = {p: Counter(r[p] for r in rows) for p in ('implementationStatus', 'behaviorStatus', 'browserStatus', 'physicalStatus', 'artStatus')}
    summary = [
        ['BASE', 'Main de départ', 'REFERENCE_EPINGLEE', data['baseCommit'], url(data, 'AGENTS.md')],
        ['CODE', 'Référence de revue des sources', data['releaseState'], data['reviewedCodeCommit'] or 'Non encore arrêté ; implémentations en cours.', ''],
        ['EXECUTION', 'Code produit des validations finales', 'EXECUTE_ET_DATE', data.get('executedProductCommit') or 'En attente', 'Les autres rapports gardent leurs propres checkouts et overlays.'],
        ['SCOPE', 'Périmètre', 'REPRISE_CIBLEE', data['scope'], ''],
        ['CRITERES', 'Critères dérivés de reprise', '12', 'Quatre critères de prélèvement et huit de retour de groupe ; pas douze missions nouvelles.', ''],
        ['PHASES', 'Implémentation / logique / navigateur', 'SEPAREES', dict(counts), ''],
        ['ORIGINAUX', 'Classeurs d’origine préservés', '108', 'Octets et empreintes contrôlés ; aucune réécriture des anciens statuts.', url(data, INVENTORY)],
        ['LOTS', 'Fichiers des trois lots du 8 novembre', str(len(history['datedProductionFiles'])), 'Identités Git inchangées par rapport au main de départ.', ''],
        ['HUNT', 'Qualifications restantes V112', '8 NON_QUALIFIE', 'Les huit libellés et critères originaux figurent sans réécriture dans RestantV112.', url(data, HUNT)],
        ['C37', 'Audience déjà livrée', 'PREUVE_DATEE', '27 contrôles et six captures sur bdc2b4af ; aucune requalification automatique du nouveau code.', url(data, sources['C37-NATIVE']['path'])],
        ['NATIVE-EXCEL', 'Application Microsoft Excel', 'NON_EXECUTEE', 'Lecture ZIP/XML et reproduction déterministe ; aucun usage Excel natif déduit.', ''],
    ]
    summary += [['REGLE-' + str(i), 'Règle de qualification', 'A_CONSERVER', value, ''] for i, value in enumerate(data['qualificationPolicy'], 1)]
    summary += [['JALON-' + row['commit'][:8], 'Jalon de code daté', 'PREUVE_DATEE', row['commit'] + ' — ' + row['scope'],
                 'https://github.com/darknigthmare/yautja-la-longue-chasse/blob/' + row['commit'] + '/AGENTS.md']
                for row in data.get('implementationMilestones', [])]
    summary += [[row['id'], row['title'], row['status'], row['scope'] + ' Références : ' + (' · '.join(row['evidence']) or 'en attente'), '']
                for row in data.get('deliveryChecks', [])]
    reprise = [[r['id'], r['sourceKey'], r['title'], r['prerequisites'], r['implementation'], r['implementationStatus'], r['behaviorStatus'], r['browserStatus'], r['physicalStatus'], r['artStatus'], r['qualification'], r['limits'], primary(r)] for r in rows]
    recipes = [[r['id'] + '-' + str(i), r['id'], value, r['behaviorStatus'], r['browserStatus'], ' · '.join(r['evidence']) or 'Aucun résultat encore reçu', r['limits'], primary(r)] for r in rows for i, value in enumerate(r['checks'], 1)]
    receipts = [[e['id'], e['result'], e['scope'], e['sourceCommit'], e.get('executionContext',''), e['path'], e['sha256'], url(data, e['path'], current=True)] for e in data['currentEvidence']]
    if not receipts:
        receipts = [['ATTENTE', 'EN_ATTENTE', 'Aucune nouvelle recette attestée par ce brouillon.', '', '', '', '', '']]
    continuity = [[r['id'], r['subject'], r['status'], r['detail'], ' · '.join(r['sourceIds']), url(data, sources[r['sourceIds'][0]]['path'])] for r in data['continuity']]
    continuity += [[r['id'], r['subject'], r['status'], 'Prochaine action conservée ; priorité ' + r['priority'], ' · '.join(r['sourceIds']), url(data, sources[r['sourceIds'][0]]['path'])] for r in data['remainingActions']]
    source_rows = [[r['id'], r['path'], r.get('scope', ''), r['sha256'], r['bytes'], r.get('reference', 'EXECUTION'), url(data, r['path'], r.get('line'), current=r['path'].startswith('app/') or r.get('reference') != 'BASE')] for r in fingerprints]
    originals = [['H' + str(i).zfill(3), r['path'], r['scope'], r['sheetCount'], r['bytes'], r['sha256'], r['observation'], url(data, r['path'])] for i, r in enumerate(history['originalWorkbooks'], 1)]
    previous = [[r['path'], r['bytes'], r['sha256'], r['gitBlob'], r['observation'], url(data, r['path'])] for r in history['datedProductionFiles']]
    remaining_rows = [[r['id'], r['status'], r['topic'], r['rule'], r['acceptance'], url(data, r['source'])] for r in remaining]
    originals_source = [[r['id'], r['domain'], r['title'], r['criterion'], r['sourceStatus'], '; '.join(s['sheet'] + '!' + str(s['row']) for s in r['sources']), url(data, r['sources'][0]['path'])] for r in source_criteria]
    sheets = [
        ('Synthese', data['title'], [('ID',18),('Sujet',40),('État / portée',30),('Détail',100),('Lien',85)], summary),
        ('Reprise', 'Critères de cette reprise — qualifications bornées', [('ID',18),('Source',27),('Résultat attendu',45),('Prérequis',65),('Implémentation prévue / réalisée',75),('Intégré',22),('Logique',22),('Navigateur',22),('Périphérique réel',25),('Art humain',25),('Qualification',30),('Limites',75),('Source exacte',85)], reprise),
        ('Recettes', 'Vérifications prévues et résultats reçus', [('Recette',22),('Critère',18),('Scénario observable',90),('Logique',22),('Navigateur',22),('Preuve reçue',60),('Limite',75),('Source',85)], recipes),
        ('Preuves', 'Nouvelles exécutions — distinctes des archives', [('ID',24),('Résultat',28),('Portée',100),('Checkout observé',45),('Contexte / équivalence de code',100),('Rapport',100),('SHA-256',72),('Lien',90)], receipts),
        ('Continuite', 'Raccords et prochains ouverts conservés', [('ID',28),('Sujet',55),('État',40),('Portée / reste',110),('Sources',55),('Lien',85)], continuity),
        ('SourcesExactes', 'Critères sources B03 / B04 / Q26 — texte inchangé', [('ID',20),('Domaine',22),('Titre',45),('Critère source',100),('Statut source daté',38),('Cellules originales',32),('Lien',90)], originals_source),
        ('RestantV112', 'Huit qualifications originales — aucune clôture déduite', [('ID',22),('Statut',28),('Sujet',48),('Règle originale',100),('Acceptation originale',120),('Lien source',85)], remaining_rows),
        ('Sources', 'Sources et empreintes de cette reprise', [('ID',28),('Chemin',100),('Portée',100),('SHA-256',72),('Octets',18),('Contexte',26),('Lien',95)], source_rows),
        ('Originaux', '108 classeurs historiques lus sans modification', [('ID',18),('Chemin',110),('Famille',36),('Feuilles',14),('Octets',18),('SHA-256',72),('Lecture',24),('Lien',95)], originals),
        ('Historique8Nov', 'Trois lots précédents — identités Git conservées', [('Chemin',115),('Octets',18),('SHA-256',72),('Objet Git',48),('Lecture',24),('Lien',100)], previous),
    ]
    return sheets


def workbook_bytes(data, sheets):
    layout.sheet_values = lambda spec: [[spec[1]], [data['releaseState'] + ' — ' + data['scope']], ['Modèle, navigateur, appareils et revue artistique séparés ; textes et preuves historiques conservés.'], [c[0] for c in spec[2]]] + [[layout.serial(v) for v in row] for row in spec[3]]
    original_worksheet = layout.worksheet
    def decorated(spec):
        raw, rel = original_worksheet(spec)
        node = ET.fromstring(raw)
        for row in node.find(layout.tag('sheetData')):
            index = int(row.attrib['r'])
            if index <= 4:
                continue
            values = layout.sheet_values(spec)[index - 1]
            lines = max(max(1, sum(max(1, math.ceil(len(part) / max(8, width * .88))) for part in layout.serial(value).split('\n'))) for value, (_, width) in zip(values, spec[2]))
            row.set('ht', str(min(409, max(54, lines * 15 + 12))))
        ET.SubElement(node, layout.tag('pageSetup'), {'orientation':'landscape','paperSize':'8','scale':'100'})
        relations = ET.fromstring(rel)
        for relation in relations:
            target = relation.attrib['Target']
            if target.startswith('../'):
                relation.set('Target', url(data, path_local(target[3:])))
        return layout.xml(node), layout.xml(relations)
    layout.worksheet = decorated
    try:
        raw = layout.build(sheets)
    finally:
        layout.worksheet = original_worksheet
    output = BytesIO()
    with ZipFile(BytesIO(raw)) as before, ZipFile(output, 'w', compression=ZIP_DEFLATED, compresslevel=9) as after:
        for name in sorted(before.namelist()):
            item = ZipInfo(name, date_time=(2026,11,9,0,0,0)); item.compress_type=ZIP_DEFLATED
            item.create_system=0; item.external_attr=0o600 << 16
            after.writestr(item, before.read(name), compresslevel=9)
    return output.getvalue()


def companion_html(data, sheets):
    escape = lambda value: html.escape(layout.serial(value))
    parts = ['<!doctype html><html lang="fr"><meta charset="utf-8"><title>' + escape(data['title']) + '</title><style>body{font:11pt/1.4 Arial,sans-serif;color:#183440;margin:24px}h1{font-size:22pt}h2{font-size:17pt;break-before:page}h3{font-size:12pt;margin:0 0 8px}article{border:1px solid #b5c6ca;padding:12px;margin:12px 0;break-inside:avoid}dl{display:grid;grid-template-columns:160px 1fr;gap:4px 12px;margin:0}dt{font-weight:bold}dd{margin:0;overflow-wrap:anywhere}a{color:#155b79}small{font-size:10.5pt}@page{size:A4;margin:15mm}</style><body><h1>' + escape(data['title']) + '</h1><p>' + escape(data['releaseState']) + '</p><p>' + escape(data['scope']) + '</p><p>Base : ' + escape(data['baseCommit']) + '. Les entrées EN_ATTENTE ne constituent pas des résultats exécutés. Aucun usage Microsoft Excel natif n’est attesté.</p>']
    for name, title, columns, rows in sheets:
        parts.append('<h2>' + escape(title) + '</h2>')
        for row in rows:
            parts.append('<article><h3>' + escape(row[0]) + '</h3><dl>')
            for (label, _), value in zip(columns, row):
                text = escape(value)
                if isinstance(value,str) and value.startswith('https://'):
                    text = '<a href="' + text + '">' + text + '</a>'
                parts.append('<dt>' + escape(label) + '</dt><dd>' + text + '</dd>')
            parts.append('</dl></article>')
    parts.append('</body></html>')
    return ('\n'.join(parts) + '\n').encode()


def verify_xlsx(raw, sheets):
    checked = links = 0
    with ZipFile(BytesIO(raw)) as archive:
        assert archive.testzip() is None and len(archive.namelist()) == len(set(archive.namelist()))
        assert not any(n.endswith('.bin') or 'vba' in n.lower() for n in archive.namelist())
        documents = {n:ET.fromstring(archive.read(n)) for n in archive.namelist() if n.endswith(('.xml','.rels'))}
        assert not any(node.tag == layout.tag('f') for root in documents.values() for node in root.iter())
        book = documents['xl/workbook.xml']
        actual_sheets = list(book.find(layout.tag('sheets')))
        assert [s.attrib['name'] for s in actual_sheets] == [s[0] for s in sheets]
        for index, spec in enumerate(sheets,1):
            sheet = documents['xl/worksheets/sheet' + str(index) + '.xml']
            rows = list(sheet.find(layout.tag('sheetData')))
            expected = layout.sheet_values(spec)
            assert len(rows) == len(expected)
            for row, wanted in zip(rows,expected):
                assert len(row) == len(wanted)
                for cell, value in zip(row,wanted):
                    assert cell.attrib['t'] == 'inlineStr'
                    assert ''.join(cell.find(layout.tag('is')).itertext()) == layout.serial(value)
                    checked += 1
            pane = sheet.find(layout.tag('sheetViews')).find(layout.tag('sheetView')).find(layout.tag('pane'))
            assert pane.attrib['xSplit'] == '2' and pane.attrib['ySplit'] == '4'
            assert sheet.find(layout.tag('autoFilter')).attrib['ref'] == 'A4:' + layout.column(len(spec[2])) + str(len(expected))
            rels = documents['xl/worksheets/_rels/sheet' + str(index) + '.xml.rels']
            for rel in rels:
                assert rel.attrib['TargetMode'] == 'External' and rel.attrib['Target'].startswith('https://github.com/darknigthmare/yautja-la-longue-chasse/blob/')
                links += 1
    return {'sheets':len(sheets),'rows':sum(len(s[3]) for s in sheets),'cellsChecked':checked,'hyperlinksChecked':links,'xmlPartsParsed':len(documents),'formulas':0,'macros':0,'fontPt':11,'frozenRows':4,'frozenColumns':2,'nativeExcelExecuted':False}


def verify_link_targets(data, raw):
    prefix='/darknigthmare/yautja-la-longue-chasse/blob/'
    refs={data['baseCommit'],data['branch'],data.get('reviewedCodeCommit')}
    refs.update(row['commit'] for row in data.get('implementationMilestones',[]))
    refs=sorted(filter(None,refs),key=len,reverse=True)
    targets=set()
    with ZipFile(BytesIO(raw)) as archive:
        for file in archive.namelist():
            if not file.endswith('.rels'):continue
            for relation in ET.fromstring(archive.read(file)):
                if relation.attrib.get('TargetMode')=='External':targets.add(relation.attrib['Target'])
    verified=[]
    for target in sorted(targets):
        value=unquote(urlsplit(target).path)
        assert value.startswith(prefix)
        value=value[len(prefix):]
        ref=next((r for r in refs if value.startswith(r+'/')),None)
        assert ref is not None,'Unknown link ref: '+target
        file=path_local(value[len(ref)+1:])
        if ref==data['branch']:
            assert (ROOT/file).is_file(),'Pending delivery link absent from disk: '+file
            context='CURRENT_BRANCH_FILE_PRESENT_PENDING_COMMIT'
        else:
            entry=git('ls-tree','-z',ref,'--',file).decode().split('\0')[0]
            assert entry and entry.split('\t',1)[1]==file,'Pinned link path absent from its Git ref: '+target
            context='PINNED_GIT_OBJECT_PRESENT'
        verified.append({'ref':ref,'path':file,'context':context})
    return {'uniqueTargets':len(verified),'pinnedGitTargets':sum(r['context']=='PINNED_GIT_OBJECT_PRESENT' for r in verified),
            'branchFilesPresent':sum(r['context']=='CURRENT_BRANCH_FILE_PRESENT_PENDING_COMMIT' for r in verified),'targets':verified,
            'scope':'Pinned refs are resolved in Git. New delivery/index files use the named branch and are checked on disk pending the delivery commit; no HTTP availability is inferred.'}


def delivery_manifest(data):
    files=[]
    for file in sorted(HERE.rglob('*')):
        if not file.is_file() or file.name=='manifest-final.json' or '__pycache__' in file.parts:continue
        assert not file.is_symlink(),str(file)
        raw=file.read_bytes();relative=str(file.relative_to(ROOT))
        role='DELIVERY_OR_PRESERVED_EVIDENCE'
        if '/qa/escort/native-07/' in relative or '/qa/harvest/native-lint-final/' in relative:role='ACCEPTED_FINAL_BROWSER_EVIDENCE'
        elif re.search(r'/qa/escort/native-(01|02|03|06)/',relative):role='PRESERVED_FAILED_ATTEMPT'
        elif re.search(r'/qa/escort/native-(04|05)/',relative):role='PRESERVED_INTERMEDIATE_MILESTONE'
        elif '/qa/harvest/first-pass/' in relative:role='PRESERVED_FIRST_PASS'
        elif '/qa/integration-final-85ca8099/' in relative:role='EXECUTED_FINAL_SOFTWARE_GATES'
        files.append({'path':relative,'bytes':len(raw),'sha256':sha256(raw).hexdigest(),'role':role})
    captures=[]
    for folder in ['qa/harvest/native-lint-final','qa/escort/native-07']:
        report=json.loads((HERE/folder/'browser-verification.json').read_text())
        assert report['passed'] and report['browserExecuted']
        for capture in report['captures']:
            file=HERE/folder/path_local(capture['file']);raw=file.read_bytes()
            assert len(raw)==capture['bytes'] and sha256(raw).hexdigest()==capture['sha256']
            assert capture['nativeFullPage'] is True
            captures.append({'path':str(file.relative_to(ROOT)),'bytes':len(raw),'sha256':capture['sha256']})
    assert len(captures)==43
    documents=[fingerprint(file) for file in ['docs/campagne/README.md','docs/campagne/AVENANT_REPRISE_CHASSE_BIBLE_20261109.md']]
    return {'schemaVersion':1,'asOfDate':data['asOfDate'],'baseCommit':data['baseCommit'],'reviewedCodeCommit':data['reviewedCodeCommit'],
            'files':files,'deliveryDocuments':documents,'fileCount':len(files),'bytes':sum(row['bytes'] for row in files),
            'acceptedFinalCaptureIntegrity':captures,'captureIntegrityScope':'43 byte-count/SHA256 checks; not 43 visual inspections or human artistic validations.',
            'selfExcluded':'production/reprise-chasse-bible-20261109/manifest-final.json'}


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check',action='store_true')
    args=parser.parse_args()
    data=json.loads(DATA.read_text())
    history=protected_history(data)
    sources, criteria, remaining, fingerprints=collect(data,history)
    sheets=tables(data,history,sources,criteria,remaining,fingerprints)
    workbook=workbook_bytes(data,sheets)
    companion=companion_html(data,sheets)
    structure=verify_xlsx(workbook,sheets)
    links=verify_link_targets(data,workbook)
    report={'schemaVersion':1,'asOfDate':data['asOfDate'],'baseCommit':data['baseCommit'],'reviewedCodeCommit':data['reviewedCodeCommit'],'qualificationState':data['releaseState'],'deliveryChecks':data.get('deliveryChecks',[]),'writerReused':'scripts/build-resume-workbook-20261101.py','writerSha256':sha256(LAYOUT_PATH.read_bytes()).hexdigest(),'qualificationSha256':sha256(DATA.read_bytes()).hexdigest(),'workbook':{'path':str(XLSX.relative_to(ROOT)),'bytes':len(workbook),'sha256':sha256(workbook).hexdigest()},'companion':{'path':str(HTML.relative_to(ROOT)),'bytes':len(companion),'sha256':sha256(companion).hexdigest()},'verification':structure,'linkTargets':links,'originalWorkbooksVerified':len(history['originalWorkbooks']),'datedFilesVerified':len(history['datedProductionFiles']),'remainingV112Unchanged':remaining,'sourceCriteriaUnchanged':criteria,'newGlobalClosuresClaimed':0,'sourceInputs':fingerprints,'limits':['Les tests de ce générateur portent sur les sources, OOXML et identité des archives ; ils n’exécutent pas le jeu.','Aucun usage Microsoft Excel natif, appareil physique ou avis artistique humain déduit.','Les qualifications courantes dépendent des seuls rapports explicitement reçus dans qualification-reprise.json.']}
    products={XLSX:workbook,HTML:companion,HERE/'historique-preserve.json':js(history),HERE/'verification-classeur.json':js(report)}
    for file, raw in products.items():
        if args.check:
            assert file.read_bytes() == raw, 'Regenerate explicitly: ' + str(file.relative_to(ROOT))
        else:
            file.write_bytes(raw)
    manifest=js(delivery_manifest(data))
    if args.check:assert (HERE/'manifest-final.json').read_bytes()==manifest,'Final delivery file set changed; regenerate explicitly.'
    else:(HERE/'manifest-final.json').write_bytes(manifest)
    print(json.dumps({'status':'PASS_REPRODUCIBLE_OOXML' if args.check else 'GENERATED','qualification':data['releaseState'],'workbookSha256':report['workbook']['sha256'],**structure,'originalWorkbooks':108,'datedFiles':len(history['datedProductionFiles'])},ensure_ascii=False))


if __name__ == '__main__':
    main()
