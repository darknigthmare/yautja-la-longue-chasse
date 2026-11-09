#!/usr/bin/env python3
"""Independent OOXML/source reader; does not import the workbook writer."""
from collections import Counter
from hashlib import sha256
import json
from pathlib import Path
import posixpath
import re
import subprocess
import xml.etree.ElementTree as ET
from zipfile import ZipFile

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]
MAIN='http://schemas.openxmlformats.org/spreadsheetml/2006/main'
REL='http://schemas.openxmlformats.org/officeDocument/2006/relationships'
def tag(name): return '{'+MAIN+'}'+name
def load(file): return json.loads(file.read_text())
def text(cell): return ''.join(cell.find(tag('is')).itertext())
def git(*args): return subprocess.check_output(['git',*args],cwd=ROOT)
def observed(file):
    path=ROOT/file
    assert not path.is_symlink(),file
    if path.is_file(): return path.read_bytes()
    assert git('ls-files','-t','--',file).decode().strip()=='S '+file,file
    return git('show','HEAD:'+file)
def cells_of(sheet):
    return {cell.attrib['r']:text(cell) for row in sheet.find(tag('sheetData')) for cell in row}
def assert_row(cells,row,wanted):
    for column,value in wanted.items():
        assert cells[column+str(row)]==str(value),(column+str(row),cells[column+str(row)],value)

def main():
    data=load(HERE/'qualification-reprise.json')
    report=load(HERE/'verification-classeur.json')
    history=load(HERE/'historique-preserve.json')
    workbook=ROOT/report['workbook']['path']
    assert sha256(workbook.read_bytes()).hexdigest()==report['workbook']['sha256']
    assert sha256((ROOT/report['companion']['path']).read_bytes()).hexdigest()==report['companion']['sha256']
    assert sha256((HERE/'qualification-reprise.json').read_bytes()).hexdigest()==report['qualificationSha256']
    assert report['baseCommit']==history['baseCommit']==data['baseCommit']
    assert report['newGlobalClosuresClaimed']==0 and report['verification']['nativeExcelExecuted'] is False
    checked=links=0
    with ZipFile(workbook) as archive:
        names=archive.namelist()
        assert len(names)==len(set(names)) and archive.testzip() is None
        assert not any('vba' in n.lower() or n.endswith('.bin') for n in names)
        documents={n:ET.fromstring(archive.read(n)) for n in names if n.endswith(('.xml','.rels'))}
        for root in documents.values():
            assert not any(n.tag==tag('f') for n in root.iter())
        for filename,root in documents.items():
            if not filename.endswith('.rels'):continue
            base='' if filename=='_rels/.rels' else posixpath.join(posixpath.dirname(posixpath.dirname(filename)),posixpath.basename(filename)[:-5])
            for relation in root:
                target=relation.attrib['Target']
                if relation.attrib.get('TargetMode')=='External':
                    assert target.startswith('https://github.com/darknigthmare/yautja-la-longue-chasse/blob/')
                    assert not re.search(r'\s',target)
                    links+=1
                else:
                    resolved=target.lstrip('/') if target.startswith('/') else posixpath.normpath(posixpath.join(posixpath.dirname(base),target))
                    assert resolved in names,(filename,target)
        sheets=list(documents['xl/workbook.xml'].find(tag('sheets')))
        assert [s.attrib['name'] for s in sheets]==['Synthese','Reprise','Recettes','Preuves','Continuite','SourcesExactes','RestantV112','Sources','Originaux','Historique8Nov']
        rels={r.attrib['Id']:r.attrib['Target'] for r in documents['xl/_rels/workbook.xml.rels']}
        parsed={}
        for sheet in sheets:
            path=posixpath.normpath(posixpath.join('xl',rels[sheet.attrib['{'+REL+'}id']]))
            node=documents[path]
            rows=list(node.find(tag('sheetData')))
            assert len(rows)>=5
            pane=node.find(tag('sheetViews')).find(tag('sheetView')).find(tag('pane'))
            assert pane.attrib['state']=='frozen' and pane.attrib['xSplit']=='2' and pane.attrib['ySplit']=='4'
            assert node.find(tag('autoFilter')).attrib['ref'].startswith('A4:')
            for row in rows:
                assert float(row.attrib['ht'])>=32
                for cell in row:
                    assert cell.attrib['t']=='inlineStr'
                    assert cell.find(tag('is')) is not None
                    assert len(text(cell))<=32767
                    checked+=1
            parsed[sheet.attrib['name']]=cells_of(node)
        fonts=documents['xl/styles.xml'].find(tag('fonts'))
        assert all(float(f.find(tag('sz')).attrib['val'])>=11 for f in fonts)
        assert len(data['criteria'])==12
        for row,criterion in enumerate(data['criteria'],5):
            assert_row(parsed['Reprise'],row,dict(zip('ABCDEFGHIJKL',[criterion['id'],criterion['sourceKey'],criterion['title'],criterion['prerequisites'],criterion['implementation'],criterion['implementationStatus'],criterion['behaviorStatus'],criterion['browserStatus'],criterion['physicalStatus'],criterion['artStatus'],criterion['qualification'],criterion['limits']])))
        summary=parsed['Synthese']
        by_id={value:int(cell[1:]) for cell,value in summary.items() if cell.startswith('A') and cell[1:].isdigit() and int(cell[1:])>=5}
        for gate in data.get('deliveryChecks',[]):
            assert_row(summary,by_id[gate['id']],{'B':gate['title'],'C':gate['status']})
        assert report.get('deliveryChecks',[])==data.get('deliveryChecks',[])
        hunt=load(ROOT/'docs/hunt-mechanics-v112.json')
        remaining=next(s['rows'] for s in hunt['sheets'] if s['name']=='Restant')
        assert remaining==report['remainingV112Unchanged'] and len(remaining)==8
        for row,item in enumerate(remaining,5):
            assert item['status']=='NON_QUALIFIE'
            assert_row(parsed['RestantV112'],row,dict(zip('ABCDE',[item['id'],item['status'],item['topic'],item['rule'],item['acceptance']])))
        register=load(ROOT/'production/excel-bible-20261108/suivi/excel-open-register.json')
        source_criteria=[next(r for r in register['items'] if r['key']==key) for key in ['Clan Ship:OPS-B03','Clan Ship:OPS-B04','Clan Ship:OPS-Q26']]
        assert source_criteria==report['sourceCriteriaUnchanged']
        for row,item in enumerate(source_criteria,5):
            assert_row(parsed['SourcesExactes'],row,{'A':item['id'],'D':item['criterion'],'E':item['sourceStatus']})
        inventory=load(ROOT/'production/excel-bible-20261108/suivi/excel-inventory.json')['inventory']
        assert len(inventory)==len(history['originalWorkbooks'])==108
        for row,item in enumerate(inventory,5):
            assert_row(parsed['Originaux'],row,{'B':item['path'],'C':item['scope'],'D':item['sheetCount'],'E':item['bytes'],'F':item['sha256']})
        assert checked==report['verification']['cellsChecked'] and links==report['verification']['hyperlinksChecked']
    protected=history['originalWorkbooks']+history['datedProductionFiles']+[history['huntV112']]
    for item in protected:
        raw=observed(item['path'])
        assert len(raw)==item['bytes'] and sha256(raw).hexdigest()==item['sha256'],item['path']
    for source in report['sourceInputs']:
        raw=observed(source['path'])
        assert len(raw)==source['bytes'] and sha256(raw).hexdigest()==source['sha256'],source['path']
    for evidence in data['currentEvidence']:
        assert evidence['sha256']==sha256(observed(evidence['path'])).hexdigest()
    target_report=report['linkTargets']
    for target in target_report['targets']:
        if target['ref']==data['branch']:
            assert (ROOT/target['path']).is_file()
        else:
            entry=git('ls-tree','-z',target['ref'],'--',target['path']).decode().split('\0')[0]
            assert entry and entry.split('\t',1)[1]==target['path']
    manifest=load(HERE/'manifest-final.json')
    assert manifest['reviewedCodeCommit']==data['reviewedCodeCommit']
    assert manifest['fileCount']==len(manifest['files'])
    for item in manifest['files']+manifest['deliveryDocuments']:
        raw=(ROOT/item['path']).read_bytes()
        assert len(raw)==item['bytes'] and sha256(raw).hexdigest()==item['sha256'],item['path']
    actual={str(p.relative_to(ROOT)) for p in HERE.rglob('*') if p.is_file() and p.name!='manifest-final.json' and '__pycache__' not in p.parts}
    assert actual=={r['path'] for r in manifest['files']}
    assert len(manifest['acceptedFinalCaptureIntegrity'])==43
    for item in manifest['acceptedFinalCaptureIntegrity']:
        raw=(ROOT/item['path']).read_bytes()
        assert len(raw)==item['bytes'] and sha256(raw).hexdigest()==item['sha256']
    result={'status':'PASS_INDEPENDENT_OOXML_AND_SOURCE_DATA','sheets':10,'cellsChecked':checked,'hyperlinksChecked':links,'pinnedGitTargets':target_report['pinnedGitTargets'],'branchTargetsPresent':target_report['branchFilesPresent'],'deliveryFilesVerified':manifest['fileCount'],'finalCaptureIntegrity':43,'originalWorkbooksPreserved':108,'datedFilesPreserved':len(history['datedProductionFiles']),'remainingV112Preserved':8,'criteria':12,'qualification':data['releaseState'],'nativeExcelExecuted':False}
    print(json.dumps(result,ensure_ascii=False))

if __name__=='__main__':main()
