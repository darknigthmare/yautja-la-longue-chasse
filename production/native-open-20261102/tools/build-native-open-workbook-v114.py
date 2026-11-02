#!/usr/bin/env python3
"""Append five production sheets to the exact130-sheet V113 archive."""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import struct
import sys

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[3]
DIRECTORY = Path('production/native-open-20261102')
MANIFEST = DIRECTORY/'source-manifest.json'
OUTPUT = Path('production/YAUTJA_V114_SUIVI.xlsx')
QA = DIRECTORY/'workbook-qa.json'
BASELINE = {'path':'production/YAUTJA_V113_SUIVI.xlsx','bytes':10373135,
            'sha256':'082ccfdd584a8989124f81851bdcb50e1c6206940c9d1f46b328d758e428d84f'}
SHEET_NAMES = ['SyntheseV114','CandidatsHWV114','VictimesPitV114','SourcesV114','JournalV114']
spec = importlib.util.spec_from_file_location('v114_immutable_append', ROOT/'scripts/lib/excel_followup_append.py')
append = importlib.util.module_from_spec(spec)
spec.loader.exec_module(append)

def json_bytes(value):
    return (json.dumps(value,ensure_ascii=False,indent=2)+'\n').encode()

def local(file):
    if not isinstance(file,str):
        raise ValueError('Repository-relative path required')
    path = Path(file)
    if path.is_absolute() or '..' in path.parts or not path.parts:
        raise ValueError('Repository-relative path required: '+file)
    full = ROOT/path
    if full.resolve() != full:
        raise ValueError('Symlink or aliased input/output path rejected: '+file)
    return full

def fingerprint(file):
    path = local(file)
    if not path.is_file():
        raise ValueError('Regular file required: '+file)
    raw = path.read_bytes()
    return {'path':file,'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()}

def check_pin(pin):
    if fingerprint(pin['path']) != {k:pin[k] for k in ['path','bytes','sha256']}:
        raise ValueError('Pinned bytes changed: '+pin['path'])

def require(condition,message):
    if not condition:
        raise ValueError(message)

def validate_manifest(data,check_files=True):
    require(data.get('schemaVersion')==1 and data.get('release')=='V114' and data.get('baseline')==BASELINE,'Exact V113 baseline required')
    require(data.get('sourceCompletion') is False and data.get('closedSourceIds')==[] and data.get('humanValidated') is False,'No source closure or human admission allowed')
    require(data.get('runtimeR8Status')=='EN_QUALIFICATION_SANS_ATTESTATION','No R8 production attestation in this dated art archive')
    require(data.get('portability',{}).get('requiredExternalPaths')==[],'No external execution inputs allowed')
    inherited = data['inheritedManifest']
    require(inherited['path']=='docs/suivi-production/v113-open-production-20261102/source-manifest.json','Explicit inherited manifest required')
    previous = json.loads(local(inherited['path']).read_text())
    require(data['sourceRequirements']==previous['sourceRequirements'] and len(data['sourceRequirements'])==56,'All56 original source requirements must remain byte-logically identical')
    require(data['artTargetIds']==[row['id'] for row in previous['artTargets']] and len(set(data['artTargetIds']))==354,'All354 inherited art identities required')
    require(all(row.get('sourceClosed') is False and row.get('humanValidated') is False for row in data['sourceRequirements']),'Global requirements stay open')
    audit_path = DIRECTORY/'archives/industrial-architecture/sources/art-gap-manifest.json'
    audit = json.loads(local(str(audit_path)).read_text())
    absent = {row['id'] for row in audit['entries'] if row['currentReadOnlyDisposition']=='NO_INDEPENDENT_TARGET_SPRITE_IDENTIFIED_IN_SCOPED_REPOSITORY_SEARCH'}
    old_ids = {row['targetId'] for row in previous['nativeCandidates']}
    rows = data['homeworldCandidates']
    old = [row for row in rows if row['batch']=='INHERITED_V113_3TARGETS_4ATTEMPTS']
    new = [row for row in rows if row not in old]
    require(len(rows)==40 and len(old)==4 and len(new)==36,'40HW rows =4historical+36new raw attempts')
    require({row['targetId'] for row in rows}==absent and len(absent)==38,'All38 source-missing-context HW identities must occur')
    require({row['targetId'] for row in old}==old_ids and {row['targetId'] for row in new}==absent-old_ids,'35new identities and3inherited targets stay separate')
    require(sum(row['selected'] is True for row in new)==35 and sum(row['selected'] is False for row in new)==1,'35 retained newHW candidates and one rejected raw required')
    require(len({(row['targetId'],row['attempt']) for row in rows})==40,'Duplicate HW attempt')
    require(len({row['targetId'] for row in new if row['selected'] is True})==35,'One retained candidate per new target')
    rejection = next(row for row in new if row['selected'] is False)
    require((rejection['targetId'],rejection['attempt'],rejection['status'])==('target-v81-71-268',1,'REJET_CADRAGE_MARGE_DROITE_1PX'),'Retain rejected barrier attempt and its exact selection status')
    require(all(row['selected'] is None for row in old),'No retrospective selection of V113 attempts')
    for row in rows:
        require(row['targetId'] in data['artTargetIds'],'Unknown target')
        require(all(row.get(key) is False for key in ['humanValidated','runtimeIntegrated','pixelsEdited','sourceClosed']),'Candidate must stay non-integrated,unmodified,open and not human admitted')
        if row['selected'] is not False:
            require(row['status']=='CANDIDAT_NON_ADMIS','No automatic technical/artistic admission')
        measures = row['thresholdMeasurements']
        require(row['strictMarginPass']==(min(measures['0']['margins'])>=row['requiredMargin']),'Padding result must retain strict alpha>0 semantics')
        require(row['strictMarginPass'] is False,'All actual requested padding failures remain explicit')
        local(row['path']);local(row['evidencePath'])
        if check_files:
            check_pin(row)
            raw = local(row['path']).read_bytes()
            require(raw[:8]==b'\x89PNG\r\n\x1a\n' and list(struct.unpack('>II',raw[16:24]))==row['dimensions'] and raw[24:26]==b'\x08\x06','Native8-bit RGBA PNG dimensions required')
    pit = data['pitCandidates']
    require(len(pit)==3 and sum(row['selected'] for row in pit)==2,'2selected Pit atlases and1rejected required')
    require({(row['facing'],row['attempt'],row['selected']) for row in pit}=={('right',1,True),('left',1,False),('left',2,True)},'Original independent Pit orientations/attempts required')
    for row in pit:
        require(row['targetId']=='CIN_F003_FATALITE_1' and row['sourceCell']=='07_PRESENTATIONS!H7','Exact source H7 required')
        require(all(row.get(key) is False for key in ['humanValidated','runtimeIntegrated','victimEntityAdmitted','pixelsEdited','sourceClosed']),'Victim art cannot grant entity or gameplay admission')
        require(row['frameCount']==6 and len(row['frames'])==6 and row['dimensions']==[1536,1024] and row['grid']=={'columns':3,'rows':2,'cellWidth':512,'cellHeight':512},'Actual six-cell grid required')
        require(row['status']==('CANDIDAT_NON_ADMIS' if row['selected'] else 'REJET_VISIBLE_GRID_BOUNDARY_CONTACT'),'Pit selection must retain rejected/raw state')
        require(row['strictMarginPass'] is False,'Pit strict gutters remain failed')
        local(row['path']);local(row['evidencePath'])
        if check_files:
            check_pin(row)
    require(len({row['path'] for row in rows+pit})==43,'Every candidate attempt must have its independent preserved file')
    forge = data['forge']
    require(forge['targetId']=='target-v81-63-141' and forge['newPngs']==0 and forge['existingFramesReused']==6 and forge['humanValidated'] is False and forge['sourceClosed'] is False and forge['runtimeR8Attested'] is False,'Forge is existing native reuse qualified in development only')
    expected_totals = {'sourceRequirementsOpen':56,'artTargetsOpen':354,'historicalWorksheets':130,'appendedWorksheets':5,'newHomeworldTargets':35,'newHomeworldRawPNGs':36,'newHomeworldRetainedCandidates':35,'newHomeworldRejectedRawPNGs':1,'inheritedHomeworldGeneratedTargets':3,'inheritedHomeworldRawPNGs':4,'allHomeworldGeneratedTargets':38,'newPitRawAtlases':3,'newPitSelectedAtlases':2,'newPitSelectedReactionDrawings':12,'newPitRejectedAtlases':1,'newPortableRawPNGs':39,'falseNegativeExistingLifts':2,'forgeExistingFramesReusedInDevPrototype':6,'forgeNewPNGs':0,'humanArtisticValidations':0,'sourceClosures':0,'newImageRuntimeIntegrations':0}
    require(data['totals']==expected_totals,'Exact dated production totals required')
    proofs = data['sourceInputs']
    require(len({p['path'] for p in proofs})==len(proofs),'Duplicate input pin')
    contexts = {'ARCHIVE_SNAPSHOT_BYTE_STRICT','CURRENT_V114_PRODUCT_STRICT','INHERITED_FROZEN_PRODUCT'}
    require(all(p.get('context') in contexts for p in proofs),'Every source must declare its snapshot/product context')
    inputs = {p['path'] for p in proofs}
    require({r['path'] for r in rows+pit} | {r['evidencePath'] for r in rows+pit} | {inherited['path'],BASELINE['path']} <= inputs,'All portable operational inputs must be pinned')
    if check_files:
        check_pin(BASELINE);check_pin(inherited)
        for proof in proofs:
            check_pin(proof)
        current_products = {str(path.relative_to(ROOT)) for path in local(str(DIRECTORY)).rglob('*')
                            if path.is_file() and path not in [local(str(MANIFEST)),local(str(QA))]}
        require(current_products <= inputs,'Every archived raw,prompt,receipt,guide and V114 helper must be pinned')
        actual_pngs = {str(path.relative_to(ROOT)) for path in local(str(DIRECTORY/'archives')).rglob('*.png')}
        require(actual_pngs=={row['path'] for row in new+pit} and len(actual_pngs)==39,'Portable archive must contain exactly39new raw PNGs')
    return data

def words(value):
    if isinstance(value,list):
        return '\n'.join(words(item) for item in value)
    if isinstance(value,dict):
        return json.dumps(value,ensure_ascii=False,sort_keys=True)
    return '' if value is None else str(value)

def sheet(name,title,subtitle,columns,rows):
    return {'name':name,'title':title,'subtitle':subtitle,
            'columns':[{'key':key,'label':label,'width':width} for key,label,width in columns],
            'rows':[{key:words(value) for key,value in row.items()} for row in rows]}

def build_sheets(data):
    labels = {'sourceRequirementsOpen':'Exigences globalement ouvertes','artTargetsOpen':'Cibles artistiques globalement ouvertes','historicalWorksheets':'Feuilles V113 conservées à l’octet','appendedWorksheets':'Nouvelles feuilles V114','newHomeworldTargets':'Nouvelles cibles Homeworld générées','newHomeworldRawPNGs':'Nouveaux PNG bruts Homeworld','newHomeworldRetainedCandidates':'Nouveaux candidats Homeworld retenus, non admis','newHomeworldRejectedRawPNGs':'Rejet barrière Homeworld conservé','inheritedHomeworldGeneratedTargets':'Cibles générées héritées V113','inheritedHomeworldRawPNGs':'Essais natifs hérités V113','allHomeworldGeneratedTargets':'Cibles Homeworld générées cumulées','newPitRawAtlases':'Atlas Pit bruts nouveaux','newPitSelectedAtlases':'Atlas Pit retenus, non admis','newPitSelectedReactionDrawings':'Dessins de réaction sélectionnés, non admis','newPitRejectedAtlases':'Atlas Pit rejeté conservé','newPortableRawPNGs':'Nouveaux PNG bruts archivés portables','falseNegativeExistingLifts':'Faux négatifs historiques, ascenseurs existants','forgeExistingFramesReusedInDevPrototype':'Dessins Forge existants réemployés, prototype dev qualifié','forgeNewPNGs':'Nouveaux PNG Forge','humanArtisticValidations':'Nouvelles validations artistiques humaines','sourceClosures':'Nouvelles clôtures globales','newImageRuntimeIntegrations':'Nouvelles images intégrées au runtime'}
    summary = [{'measure':labels[key],'value':value,'scope':'Suivi de production daté ; aucune clôture automatique.'} for key,value in data['totals'].items()]
    summary += [{'measure':'Runtime composite R8','value':data['runtimeR8Status'],'scope':'Qualification séparée en cours, aucune attestation accordée aux candidats.'},
                {'measure':'Variantes par nouvelle cible HW','value':1,'scope':'Une variante candidate retenue par ID, pas vingt variantes.'},
                {'measure':'Pixels retouchés / recadrés / réfléchis / redimensionnés','value':0,'scope':'Tous les bruts, dont les deux rejets, sont conservés aux octets natifs.'}]
    return [
        sheet('SyntheseV114','V114 — production native ouverte',data['scope'],[('measure','Mesure',65),('value','Valeur',42),('scope','Portée / limite',115)],summary),
        sheet('CandidatsHWV114','38cibles Homeworld,40essais cumulés','35nouvelles cibles /36bruts dont1rejet ;3cibles /4essais V113 hérités. Toutes globalement ouvertes.',[('targetId','ID exact',31),('label','Cible',34),('batch','Lot / contexte',42),('attempt','Essai',12),('path','PNG natif portable',110),('sha256','SHA256',70),('dimensions','Dimensions réelles',24),('selection','Sélection réelle',48),('status','Admission',38),('requiredMargin','Marge demandée',18),('strictMarginPass','Contrat alpha>0 passé',24),('pivot','Pivot proposé, non testé',105),('evidencePath','Reçu / source exact',115),('limits','Limites propres à la cible',120)],data['homeworldCandidates']),
        sheet('VictimesPitV114','Scar H7 — victimes Xénomorphes candidates','2atlas sélectionnés /12réactions ;1atlas rejeté conservé. NPC spécifique absent, aucun BODY Scar redessiné ni activation H7.',[('targetId','Action source',31),('sourceCell','Cellule source',30),('facing','Sens natif',16),('attempt','Essai',12),('path','Atlas natif portable',110),('sha256','SHA256',70),('selection','Sélection exacte',65),('status','Admission',42),('frameCount','Dessins',14),('frames','Rectangles / pivots / durées proposés',140),('limits','Limites / dépendances',130)],data['pitCandidates']),
        sheet('SourcesV114','Sources et originaux portables épinglés','Archives datées vérifiées à l’octet ; les chemins absolus des reçus d’origine sont des locateurs historiques, pas des dépendances exécutées.',[('path','Fichier portable',120),('sha256','SHA256',70),('bytes','Octets',20),('context','Contexte',44)],data['sourceInputs']),
        sheet('JournalV114','Journal et frontières de qualification','R8 en qualification séparée ; aucune attestation de gameplay ou admission artistique ne découle d’une copie ou d’un classeur.',[('id','Événement',37),('date','Date UTC',22),('state','État exact',55),('scope','Portée',120),('limit','Limite',125)],data['events']),
    ]

def payload(data):
    return {'root':str(ROOT),'baseline':{'path':BASELINE['path'],'sha256':BASELINE['sha256']},
            'release':'V114','summary':'SyntheseV114','historicalCount':130,
            'zipDate':[2026,11,2,0,0,0],'appendedSheets':SHEET_NAMES,'sheets':build_sheets(data)}

def generate(manifest=MANIFEST,output=OUTPUT,check=False):
    require(str(output)==str(OUTPUT),'V114 generator may write only its dedicated new workbook')
    data = validate_manifest(json.loads(local(str(manifest)).read_text()))
    request = payload(data)
    workbook = append.build_workbook(request)
    target = local(str(output))
    if check:
        require(target.read_bytes()==workbook,'V114 workbook does not reproduce exact source bytes')
    else:
        target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(workbook)
    verified = append.verify_workbook({**request,'workbookPath':str(target)})
    result = {'schemaVersion':1,'release':'V114','status':'PASS_STRUCTURE_AND_PROVENANCE_NOT_ADMISSION',
              'workbook':fingerprint(str(output)),'manifest':fingerprint(str(manifest)),
              'baseline':BASELINE,'totals':data['totals'],'sourceFilesVerified':len(data['sourceInputs']),
              'verification':verified,'nativeExcelExecuted':False,
              'scope':'Literal production/source tracking. Does not certify image admission, integration, mechanics or R8 production.'}
    if str(output)==str(OUTPUT):
        if check:
            require(local(str(QA)).read_bytes()==json_bytes(result),'V114 QA metadata must reproduce exactly')
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
    print(json.dumps({'status':result['status'],'workbook':result['workbook'],'worksheets':135,
                      'historicalWorksheetsPreserved':130,'sourceRequirementsOpen':56,
                      'artTargetsOpen':354,'newPortableRawPNGs':39,'humanArtisticValidations':0},ensure_ascii=False))

if __name__=='__main__':
    main()
