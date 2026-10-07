"""Recover native missing Drive sprites; preserve source bytes, never run pack code."""
from pathlib import Path, PurePosixPath
import csv,hashlib,io,json,re,subprocess,zipfile
from PIL import Image

project=Path(__file__).resolve().parents[1]
stage=project/'work-local/v87'
output=stage/'runtime-assets/drive-completion'
output.mkdir(parents=True,exist_ok=True)
sources=stage/'source-metadata'
sources.mkdir(parents=True,exist_ok=True)
groups={g['id']:g for g in json.loads((project/'app/game/data/recentSpriteLibraryV85.json').read_text(encoding='utf8'))['groups']}
with zipfile.ZipFile(stage/'downloads/1u6BGTya6-P_coCfXr5-xmjxK7B8jqMxA.zip') as catalog_archive:
    design=json.loads(catalog_archive.read('references/DESIGN_CATALOG.json'))
    for group in design['groupCoverage']: groups.setdefault(group['id'],group)
known={}
for file in ['recentSpriteLibraryV85.json','driveLatestSpritesV85.json','badlandsLatestSpritesV85.json','recentApprovedHuntersV85.json','driveGarrisonsV86.json']:
    for asset in json.loads((project/'app/game/data'/file).read_text(encoding='utf8'))['assets']:
        source_path=project/'public'/asset['src'].lstrip('/')
        if asset['src'].lower().endswith('.png') and source_path.is_file(): known.setdefault(asset['sha256'],asset['src'])
assets,packs,receipts,notes=[],[],[],[]

def sha(content): return hashlib.sha256(content).hexdigest()
def safe(name):
    member=PurePosixPath(name.replace('\\','/'))
    if member.is_absolute() or '..' in member.parts or any(':' in p for p in member.parts): raise ValueError('Unsafe archive member')
    return member.as_posix()
def preserve(target,content):
    target.parent.mkdir(parents=True,exist_ok=True)
    if target.exists() and target.read_bytes()!=content: raise ValueError('Preserved source differs')
    target.write_bytes(content)
def source_receipt(identifier,extension):
    p=stage/'downloads'/(identifier+extension)
    record=json.loads(Path(str(p)+'.receipt.json').read_text(encoding='utf8'))
    if record['bytes']!=p.stat().st_size or record['sha256']!=sha(p.read_bytes()): raise ValueError('Transferred source changed')
    receipts.append({k:record[k] for k in ['id','title','bytes','sha256','transport']})
    return p,record
def pixels(content,expected=None):
    digest=sha(content)
    if expected and digest!=expected: raise ValueError('Native PNG differs from manifest')
    with Image.open(io.BytesIO(content)) as image:
        image.load()
        if image.format!='PNG': raise ValueError('Unexpected source format')
        width,height=image.size
        alpha=image.convert('RGBA').getchannel('A');bbox=alpha.point(lambda a:255 if a>=16 else 0).getbbox()
        if not bbox: raise ValueError('Empty source image')
        facts={'mode':image.mode,'extrema':list(alpha.getextrema()),'bbox':list(bbox),'significantAlphaThreshold':16,
            'marginsLTRB':[bbox[0],bbox[1],width-bbox[2],height-bbox[3]]}
    src=known.get(digest)
    if src is None:
        preserve(output/(digest+'.png'),content);src='/game/imports/v87/drive-completion/'+digest+'.png';known[digest]=src
    return digest,width,height,src,facts
def base(identity,label,pack_id,pack_label,version,priority,record,member,content,expected=None):
    digest,width,height,src,facts=pixels(content,expected)
    return {'id':'drive-completion-v87:'+pack_id+':'+identity+':'+digest[:12],'identityId':identity,'label':label,
        'packId':pack_id,'packLabel':pack_label,'version':version,'priority':priority,'preferredVersion':True,
        'kind':'npc','groupId':'','groupLabel':'','role':'','roleLabel':'','lifeStage':'','regionId':'','morphotypeId':'','masked':'',
        'src':src,'width':width,'height':height,'bytes':len(content),'sha256':digest,'sourceArchive':record['title'],'insideArchive':None,
        'sourcePath':member,'sourceStatus':'native-bytes-imported-unverified','producerStatus':'source-supplied-not-canon-certified',
        'pose':'Pose native statique','motionStatus':'single-pose-static','canonicalFidelity':'not-certified-1-to-1',
        'sourceNote':'Fichier source fourni conservé, sans certification canonique ou animation ajoutée.',
        'supersedesIdentityId':'','supersededByIdentityId':'','sourceDriveId':record['id'],
        'sourceDriveUrl':'https://drive.google.com/file/d/'+record['id']+'/view','alphaFacts':facts,'animationAvailable':False}

for identifier in ['1OnTyIl3gog3tvC2H0URFjFKJiIofkjAI','1J0I2wg_xH6L-q82WvBc0UIpbmxwlQKt6']:
    archive,record=source_receipt(identifier,'.zip')
    with zipfile.ZipFile(archive) as z:
        for name in z.namelist(): safe(name)
        if z.testzip() is not None: raise ValueError('Source ZIP CRC invalid')
        manifest=json.loads(z.read('MANIFESTE_V65.json'));pack_id='matriarchs-riders-v65-'+manifest['pack'].lower()
        rows=manifest['assets'];pngs={n for n in z.namelist() if n.lower().endswith('.png')}
        if len(rows)!=manifest['pngCount'] or pngs!={r['archivePngPath'] for r in rows}: raise ValueError('V65 PNG inventory differs')
        for name in z.namelist():
            if name.lower().endswith(('.json','.csv','.md','.txt')): preserve(sources/pack_id/safe(name),z.read(name))
        for row in rows:
            raw=z.read(row['archiveMetadataPath'])
            if sha(raw)!=row['metadataSha256']: raise ValueError('Native metadata differs')
            metadata=json.loads(raw)
            if metadata['id']!=row['id']: raise ValueError('Native identity differs')
            group=groups[row['groupId']];role=row['familyId'];label=row['nameFR']+' — '+group['nameFR']
            asset=base(row['id'],label,pack_id,'Matriarches et cavaliers · V6.5 '+manifest['pack'],'V6.5',65,record,row['archivePngPath'],z.read(row['archivePngPath']),row['sha256'])
            if [asset['width'],asset['height']]!=row['dimensions'] or metadata['sourceNativeSha256']!=asset['sha256']: raise ValueError('Native source facts differ')
            asset.update({'groupId':row['groupId'],'groupLabel':group['nameFR'],'role':role,'roleLabel':role+' · '+row['nameFR'],
                'lifeStage':'adult','regionId':group.get('regionId') or '', 'morphotypeId':group.get('morphotypeId') or '',
                'producerStatus':metadata.get('acceptanceStatus','source-supplied'),
                'sourceNote':metadata.get('profileExactV65FR') or row['inspectionFR'],
                'pose':'Cavalier et monture assemblés · pose native unique' if role=='chevaucheurs' else 'Individu adulte · pose native unique',
                'bodyComposition':'rider-and-mount' if role=='chevaucheurs' else 'single-individual',
                'fullBody':True,'producerInspection':row['inspectionFR'],'sourceMetadataPath':row['archiveMetadataPath']})
            assets.append(asset)
        packs.append({'id':pack_id,'label':'Matriarches et cavaliers · V6.5 '+manifest['pack'],'version':'V6.5','priority':65,
            'archive':record['title'],'insideArchive':None,'sha256':record['sha256'],'pngEntriesImported':len(rows),'recordEntries':len(rows),
            'status':'native-source-import-not-animation-or-canon-certification','driveId':record['id']})
if len(assets)!=72: raise ValueError('V65 native batch incomplete')

archive,record=source_receipt('1WbaYR26vu42ZSlt_a3uos-SEytJcpO6T','.rar')
members=[safe(n) for n in subprocess.run(['tar','-tf',str(archive)],capture_output=True,check=True).stdout.decode('utf8').splitlines()]
def rar_read(member): return subprocess.run(['tar','-xOf',str(archive),member],capture_output=True,check=True).stdout
for name in members:
    if name.lower().endswith(('.json','.csv','.md','.txt')): preserve(sources/'badlands-v14'/name,rar_read(name))
manifest=json.loads(rar_read('badlands_pack_lot14/MANIFEST_BADLANDS.json'))
rows=list(csv.DictReader(io.StringIO(rar_read('badlands_pack_lot14/INVENTAIRE_BADLANDS.csv').decode('utf-8-sig'))))
row_by_path={r['fichier']:r for r in rows}
png_members=[n for n in members if '/sprites/' in n and n.lower().endswith('.png')]
if len(png_members)!=7: raise ValueError('V14 native sprite batch incomplete')
for member in png_members:
    relative='sprites/'+member.split('/sprites/',1)[1]
    item=next(r for r in manifest['assets'] if r['fichier']==relative);row=row_by_path[relative]
    source_id=str(row.get('id') or Path(relative).stem.split('_',1)[0]);category=item['categorie'];visual=item['type_visuel']
    kind={'faune':'fauna','flore':'flora','synthetiques':'synthetic','yautja':'npc'}[category]
    if category=='yautja' and re.search(r'equipement|objet|accessoire|arme',visual,re.I): kind='equipment'
    asset=base('badlands-'+source_id,item['nom'],'badlands-v14','Badlands · ajouts V14','V14',94,record,member,rar_read(member))
    relations={key:item[key] for key in ['supersedes_asset_id','superseded_by_asset_id','morphology_corrected_by_asset_id','complement_de_asset_id','complement_camp_asset_id'] if key in item}
    asset.update({'kind':kind,'groupId':category,'groupLabel':'Badlands · '+category,'role':visual,'roleLabel':visual,
        'pose':item.get('pose') or 'Pose native statique','sourceNote':' | '.join(item.get('notes_fidelite',[])) if isinstance(item.get('notes_fidelite'),list) else str(item.get('notes_fidelite') or manifest['fidelite']),
        'canonicalSubject':item.get('canonical_subject'),'canonicalState':item.get('canonical_state'),'fullBody':item.get('full_body'),
        'sourceRelations':relations,'sourceReferences':item.get('sources',[]),
        'supersedesIdentityId':'badlands-'+str(relations['supersedes_asset_id']) if relations.get('supersedes_asset_id') else '',
        'supersededByIdentityId':'badlands-'+str(relations.get('superseded_by_asset_id') or relations.get('morphology_corrected_by_asset_id')) if relations.get('superseded_by_asset_id') or relations.get('morphology_corrected_by_asset_id') else ''})
    asset['preferredVersion']=not bool(asset['supersededByIdentityId']);assets.append(asset)
notes=manifest.get('notes_documentaires_v14',[])
packs.append({'id':'badlands-v14','label':'Badlands · ajouts V14','version':'V14','priority':94,'archive':record['title'],'insideArchive':None,
    'sha256':record['sha256'],'pngEntriesImported':7,'recordEntries':7,'status':'native-source-import-not-animation-or-canon-certification','driveId':record['id']})

# Restore source illustrations deliberately excluded from the old hunter roster.
# An opaque background, multi-subject sheet or unknown identity remains reference
# material and never becomes a Yautja body merely because pixels are now present.
archive,record=source_receipt('13etiHpr4Q1ZbgWM9NswjhFvpq_QIC2TZ','.zip')
restoration=json.loads((stage/'native-restoration-21sept.json').read_text(encoding='utf8'))
with zipfile.ZipFile(archive) as z:
    for name in z.namelist(): safe(name)
    if z.testzip() is not None: raise ValueError('Historical source ZIP CRC invalid')
    for index,row in enumerate(restoration['records'],1):
        member=row['sourcePaths'][0];content=z.read(member)
        if len(content)!=row['bytes']: raise ValueError('Historical native length differs')
        for alias in row['sourcePaths']:
            if sha(z.read(alias))!=row['sha256']: raise ValueError('Historical alias differs')
        asset=base('historical-'+row['sha256'],'Référence historique '+str(index)+' · '+Path(member).stem.replace('_',' '),
            'historical-20260921','Illustrations et sources historiques · 21 septembre','2026-09-21',21,record,member,content,row['sha256'])
        asset.update({'kind':'reference','groupId':'historical-source-unassigned','groupLabel':'Sources historiques sans affectation',
            'role':'historical-reference','roleLabel':'Référence historique sans identité de PNJ certifiée','bodyComposition':'reference-image',
            'pose':'Image entière historique · fond source conservé','sourceNote':'Source historique récupérée. Les exclusions antérieures du roster sont conservées : aucun personnage, fond transparent ou cycle animé ne sont certifiés par cet import.',
            'sourceStatus':'historical-reference-preserved-not-character-roster','sourceAliases':row['sourcePaths'],
            'sourceExclusionEvidence':row['sourceExclusionEvidence'],'identityBinding':row['identityBinding']})
        assets.append(asset)
    preserve(sources/'historical-20260921/native-restoration.json',json.dumps(restoration,ensure_ascii=False,indent=2).encode('utf8'))
packs.append({'id':'historical-20260921','label':'Illustrations et sources historiques · 21 septembre','version':'2026-09-21','priority':21,
    'archive':record['title'],'insideArchive':None,'sha256':record['sha256'],'pngEntriesImported':len(restoration['records']),
    'recordEntries':restoration['sourceEntriesMissingNative'],'status':'source-illustrations-preserved-not-character-roster','driveId':record['id']})

for identifier in ['17jzLP1WAc4IpbuB35lRmXucdAXMkpxs2','1u6BGTya6-P_coCfXr5-xmjxK7B8jqMxA']:
    archive,record=source_receipt(identifier,'.zip')
    with zipfile.ZipFile(archive) as z:
        for name in z.namelist(): safe(name)
        if z.testzip() is not None or any(n.lower().endswith('.png') for n in z.namelist()): raise ValueError('Metadata-only batch unexpectedly contains pixels')
        for name in z.namelist():
            if name.lower().endswith(('.json','.csv','.md','.txt')): preserve(sources/identifier/safe(name),z.read(name))

summary={'nativeSourceRecords':len(assets),'newDistinctPngFiles':len({a['sha256'] for a in assets if a['src'].startswith('/game/imports/v87/')}),
    'newDistinctPngBytes':sum({a['sha256']:a['bytes'] for a in assets if a['src'].startswith('/game/imports/v87/')}.values()),
    'v65NativeRecords':72,'badlandsV14Records':7,'historicalReferencePngFiles':len(restoration['records']),
    'historicalReferenceSourceEntries':restoration['sourceEntriesMissingNative'],'v69NativePixels':0,'sourceArchivesTransferred':len(receipts)}
registry={'version':'V87','summary':summary,'assets':assets,'packs':packs,'sourceCorrectionNotes':notes}
for target,value in [(project/'app/game/data/driveCompletionSpritesV87.json',registry),(project/'docs/drive-completion-v87-sources.json',{'version':'V87','summary':summary,'sourceReceipts':receipts,'packs':packs,'sourceCorrectionNotes':notes,'pixelsModified':False,'archiveCodeExecuted':False})]:
    target.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(json.dumps(summary,ensure_ascii=True))
