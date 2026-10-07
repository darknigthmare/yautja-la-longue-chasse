"""Import only the six user-authorized Badlands addition archives, without QA.

Source metadata and unchanged PNG bytes are read; archive code is never run.
The base V7 sources and every previous asset remain preserved.
"""
from pathlib import Path, PurePosixPath
import csv, hashlib, io, json, re, struct, subprocess

project=Path(__file__).resolve().parents[1]
stage=(project/'.work-local/recent-badlands-v85').resolve()
public=(project/'work-local/drive-import-20261007/public-assets/drive-latest/badlands').resolve()
if stage.drive.upper()!='C:' or project not in stage.parents or project not in public.parents:
    raise ValueError('Source and PNG destinations must remain inside this C: project.')
public.mkdir(parents=True,exist_ok=True)
sources=json.loads((stage/'source-files.json').read_text(encoding='utf-8'))
assets,archive_records,replacement_notes=[],[],[]

def sha(content): return hashlib.sha256(content).hexdigest()
def write_json(path,value):
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def safe_member(name):
    path=PurePosixPath(name.replace('\\','/'))
    if path.is_absolute() or '..' in path.parts or any(':' in p for p in path.parts): raise ValueError('Unsafe archive member: '+name)
    return path.as_posix()
def kind_for(row,record):
    category=row.get('categorie') or record.get('categorie') or ''
    visual=str(row.get('type_visuel') or record.get('type_visuel') or '')
    if category=='yautja' and re.search(r'equipement|objet|accessoire|arme',visual,re.I): return 'equipment'
    return {'faune':'fauna','flore':'flora','synthetiques':'synthetic','yautja':'npc'}.get(category,'equipment')

for source in sorted(sources,key=lambda s:int(re.search(r'LOT(\d+)_',s['title']).group(1))):
    archive=stage/source['title']
    lot=int(re.search(r'LOT(\d+)_',source['title']).group(1))
    names=[safe_member(n) for n in subprocess.run(['tar','-tf',str(archive)],capture_output=True,check=True).stdout.decode('utf-8').splitlines()]
    selected=[name for name in names if name.lower().endswith(('.json','.csv','.md','.txt')) or '/sprites/' in name and name.lower().endswith('.png')]
    extracted=stage/'originals'/f'lot-{lot}'
    extracted.mkdir(parents=True,exist_ok=True)
    for name in selected:
        destination=(extracted/name).resolve()
        if extracted.resolve() not in destination.parents: raise ValueError('Extraction escaped its source directory.')
    subprocess.run(['tar','-xf',str(archive),'-C',str(extracted),*selected],check=True)
    manifest_name=next(name for name in selected if name.endswith('/MANIFEST_BADLANDS.json'))
    csv_name=next(name for name in selected if name.endswith('/INVENTAIRE_BADLANDS.csv'))
    manifest=json.loads((extracted/manifest_name).read_text(encoding='utf-8-sig'))
    rows=list(csv.DictReader(io.StringIO((extracted/csv_name).read_text(encoding='utf-8-sig'))))
    row_by_path={row['fichier']:row for row in rows}
    record_by_path={row['fichier']:row for row in manifest.get('assets',[]) if row.get('fichier')}
    runtime_path=next((name for name in selected if name.endswith('/BADLANDS_RUNTIME_MANIFEST.json')),None)
    runtime=json.loads((extracted/runtime_path).read_text(encoding='utf-8-sig')) if runtime_path else {}
    runtime_rows={row.get('sourcePath'):row for row in runtime.get('entries',[])}
    notes=manifest.get(f'notes_documentaires_v{lot}',[])
    replacement_notes.extend({'sourceLot':lot,**note} for note in notes if isinstance(note,dict))
    count=0
    for member in selected:
        if '/sprites/' not in member or not member.lower().endswith('.png'): continue
        relative='sprites/'+member.split('/sprites/',1)[1]
        row,record=row_by_path.get(relative,{}),record_by_path.get(relative,{})
        source_id=str(row.get('id') or record.get('id') or Path(relative).stem.split('_',1)[0])
        identity='badlands-'+source_id
        content=(extracted/member).read_bytes()
        hashed=sha(content)
        width,height=struct.unpack('>II',content[16:24]) if content.startswith(b'\x89PNG\r\n\x1a\n') else (0,0)
        target=public/(hashed+'.png')
        if not target.exists(): target.write_bytes(content)
        relations={key:record[key] for key in ['supersedes_asset_id','superseded_by_asset_id','morphology_corrected_by_asset_id','complement_de_asset_id','complement_camp_asset_id','same_layout_as_correction'] if key in record}
        for key in ['supersedes_asset_id','superseded_by_asset_id','morphology_corrected_by_asset_id']:
            if row.get(key): relations[key]=row[key]
        supersedes=str(relations.get('supersedes_asset_id') or '')
        superseded=str(relations.get('superseded_by_asset_id') or relations.get('morphology_corrected_by_asset_id') or '')
        source_note=str(row.get('notes_fidelite') or record.get('notes_fidelite') or manifest.get('fidelite') or 'Recréation visuelle fournie, fidélité 1:1 non certifiée.')
        if isinstance(record.get('notes_fidelite'),list): source_note=' | '.join(str(n) for n in record['notes_fidelite'])
        assets.append({'id':'badlands-latest-v85:'+source_id+':'+hashed[:12],'identityId':identity,
            'label':row.get('nom') or record.get('nom') or Path(relative).stem.replace('_',' '),
            'src':'/game/imports/v85/drive-latest/badlands/'+hashed+'.png','width':width,'height':height,'sha256':hashed,'bytes':len(content),
            'kind':kind_for(row,record),'groupId':row.get('categorie') or record.get('categorie') or 'badlands','groupLabel':'Badlands · '+str(row.get('categorie') or record.get('categorie') or 'source'),
            'role':row.get('type_visuel') or record.get('type_visuel') or 'source-statique','sourceArchive':source['title'],'sourcePath':member,
            'sourceStatus':'native-bytes-imported-unverified','producerStatus':'approximation-static-source-not-exact-override','sourceNote':source_note,
            'preferredVersion':not bool(superseded),'packId':'badlands-latest','packLabel':'Badlands · ajouts V8 à V13','version':'V'+str(lot),'priority':80+lot,
            'pose':row.get('pose') or record.get('pose') or 'Pose native statique',
            'supersedesIdentityId':'badlands-'+supersedes if supersedes else '',
            'supersededByIdentityId':'badlands-'+superseded if superseded else '',
            'sourceDriveUrl':source['url'],'sourceDriveId':source['id'],'canonicalSubject':record.get('canonical_subject'),
            'canonicalState':record.get('canonical_state'),'fullBody':record.get('full_body'),'sourceRelations':relations,
            'sourceReferenceBasis':record.get('base_de_reference'),'sourceReferences':record.get('sources',[]),
            'sourceRuntimeMetadata':runtime_rows.get(relative),
            'animationReady':False,'rigReady':False,'collisionShape':None,'physicalScaleMeters':None,'canonicalFidelity':'not-certified-1-to-1'})
        count+=1
    archive_records.append({'id':source['id'],'title':source['title'],'url':source['url'],'mimeType':source['mime_type'],'sourceBytes':source['size'],
        'archiveSha256':sha(archive.read_bytes()),'lot':lot,'pngEntriesImported':count,'sourceMetadata':manifest_name})
    print(json.dumps({'archive':source['title'],'pngEntriesImported':count},ensure_ascii=True),flush=True)

# Later source notes may document a correction of an older asset. Keep both
# files and their documentary relationship, while preferring the correction.
for asset in assets:
    for note in replacement_notes:
        if 'badlands-'+str(note.get('id'))!=asset['identityId']: continue
        fields=note.get('fields',{})
        corrected=fields.get('superseded_by_asset_id') or fields.get('morphology_corrected_by_asset_id')
        if corrected: asset['supersededByIdentityId']='badlands-'+str(corrected);asset['preferredVersion']=False

summary={'pngEntriesImported':len(assets),'uniquePngFiles':len({a['sha256'] for a in assets}),
    'nativePngBytes':sum({a['sha256']:a['bytes'] for a in assets}.values()),'lots':len(archive_records),
    'localV7BaseSprites':118,'badlandsSourceEntriesWithBase':118+len(assets),'validation':'source-authoring-no-game-qa'}
write_json(project/'app/game/data/badlandsLatestSpritesV85.json',{'version':'V85','assets':assets,'summary':summary,'archives':archive_records,'sourceCorrectionNotes':replacement_notes})
write_json(project/'docs/badlands-drive-additions-v85-sources.json',{'version':'V85','summary':summary,'archives':archive_records,
    'sourceFolderUrl':'https://drive.google.com/drive/folders/13VlB259HBnziNldu6l1A6_rYjOEoZjT6','sourceCorrectionNotes':replacement_notes,
    'publicNamespace':'/game/imports/v85/drive-latest/badlands/','archiveScriptsExecuted':False,'gameQaExecuted':False,'pngBytesModified':False})
write_json(stage/'import-summary.json',summary)
print(json.dumps(summary,ensure_ascii=True),flush=True)
