"""Import the four identified V6.8 native garrison ZIPs without running pack code.

Original archives and PNG bytes are preserved. Provider/producer approval is
recorded separately from this import's hashes, alpha facts and runtime use.
"""
from pathlib import Path, PurePosixPath
import argparse, hashlib, io, json, zipfile
from PIL import Image

parser = argparse.ArgumentParser()
parser.add_argument('--downloads', default='work-local/v86/drive/downloads')
parser.add_argument('--output', default='work-local/v86/runtime-assets/garrisons')
args = parser.parse_args()
project = Path(__file__).resolve().parents[1]
downloads, output = (project/args.downloads).resolve(), (project/args.output).resolve()
if not downloads.is_relative_to(project) or not output.is_relative_to(project):
    raise ValueError('Import paths must remain inside this workspace')
output.mkdir(parents=True, exist_ok=True)
sources = project/'work-local/v86/drive/source-metadata'
sources.mkdir(parents=True, exist_ok=True)
records = json.loads((project/'work-local/v86/drive/materialization-receipts.json').read_text(encoding='utf-8'))
groups = json.loads((project/'app/game/data/recentSpriteLibraryV85.json').read_text(encoding='utf-8'))['groups']
group_by_id = {g['id']:g for g in groups}
with zipfile.ZipFile(downloads/'YAUTJA_V68_SUIVI_ET_FICHES_SANS_PNG.zip') as doc:
    design = json.loads(doc.read('references/DESIGN_CATALOG.json'))
    for group in design['groupCoverage']:
        group_by_id.setdefault(group['id'], {'id':group['id'],'nameFR':group['nameFR'],'regionId':group['regionId']})
    for name in ['REGISTRY_V68_DELTA.json','PROVENANCE_V68.json','COVERAGE_V68.json','references/DESIGN_CATALOG.json']:
        target = sources/Path(name).name
        content=doc.read(name)
        if target.exists() and target.read_bytes()!=content: raise ValueError('Preserved metadata differs')
        target.write_bytes(content)

def safe_name(name):
    path=PurePosixPath(name.replace('\\','/'))
    if path.is_absolute() or '..' in path.parts or any(':' in p for p in path.parts): raise ValueError('Unsafe ZIP path')
    return path.as_posix()

assets, packs, seen_ids, seen_hashes = [], [], set(), set()
for record in sorted(records, key=lambda r:r['name']):
    archive=downloads/record['name']
    archive_sha=hashlib.sha256(archive.read_bytes()).hexdigest()
    if archive_sha!=record['sha256']: raise ValueError('Archive changed after transfer')
    with zipfile.ZipFile(archive) as z:
        for name in z.namelist(): safe_name(name)
        manifest=json.loads(z.read('MANIFEST.json'))
        pack_id='garrisons-v68-'+manifest['pack'].lower()
        png_names={n for n in z.namelist() if n.lower().endswith('.png')}
        if len(png_names)!=manifest['newNativePngCount'] or {f['path'] for f in manifest['files']}!=png_names:
            raise ValueError('Native PNG inventory differs from pack manifest')
        private=sources/pack_id
        private.mkdir(parents=True,exist_ok=True)
        for name in z.namelist():
            if name.lower().endswith(('.json','.md','.csv','.txt')):
                target=private/safe_name(name)
                target.parent.mkdir(parents=True,exist_ok=True)
                content=z.read(name)
                if target.exists() and target.read_bytes()!=content: raise ValueError('Preserved metadata differs')
                target.write_bytes(content)
        for item in manifest['files']:
            identity=item['id']
            if identity in seen_ids: raise ValueError('Duplicate source identity across lots')
            seen_ids.add(identity)
            metadata=json.loads(z.read(item['metadataPath']))
            content=z.read(item['path'])
            sha=hashlib.sha256(content).hexdigest()
            if sha!=item['sha256'] or sha!=metadata['sha256'] or len(content)!=item['bytes'] or identity!=metadata['id']:
                raise ValueError('Source PNG hash, length or identity mismatch')
            with Image.open(io.BytesIO(content)) as image:
                image.load()
                if image.format!='PNG' or image.mode!='RGBA' or list(image.size)!=item['dimensions']:
                    raise ValueError('Unexpected native PNG shape/mode')
                alpha=image.getchannel('A')
                extrema=alpha.getextrema()
                if extrema[0]!=0 or extrema[1]==0: raise ValueError('Native PNG is not a nonempty transparent cutout')
                bbox=alpha.point(lambda a:255 if a>=16 else 0).getbbox()
                if bbox is None: raise ValueError('Empty significant silhouette')
                width,height=image.size
                margins=[bbox[0],bbox[1],width-bbox[2],height-bbox[3]]
                histogram=alpha.histogram()
                transparent=histogram[0]/(width*height)
            target=output/(sha+'.png')
            if target.exists() and target.read_bytes()!=content: raise ValueError('Content-addressed source changed')
            target.write_bytes(content)
            seen_hashes.add(sha)
            group=group_by_id[metadata['groupId']]
            role=metadata['familyId']
            assets.append({'id':'import-v86:'+pack_id+':'+identity+':'+sha[:12],'identityId':identity,'label':metadata['roleFR']+' — '+group['nameFR'],
                'packId':pack_id,'packLabel':'Garnisons et guerre · V6.8 '+manifest['pack'],'version':'V6.8','priority':68,'preferredVersion':True,
                'kind':'npc','groupId':metadata['groupId'],'groupLabel':group['nameFR'],'role':role,'roleLabel':metadata['roleFR'],'lifeStage':'adult',
                'regionId':group.get('regionId') or '', 'morphotypeId':group.get('morphotypeId') or '', 'masked':'','src':'/game/imports/v86/garrisons/'+sha+'.png',
                'width':width,'height':height,'bytes':len(content),'sha256':sha,'sourceArchive':record['name'],'insideArchive':None,'sourcePath':item['path'],
                'sourceStatus':'native-bytes-imported-unverified','producerStatus':'producer-accepted-native-v68-not-runtime-certified',
                'pose':'Individu militaire adulte · pose native unique','motionStatus':'single-pose-static','canonicalFidelity':'not-certified-1-to-1',
                'sourceNote':metadata['sourceBoundaryFR'],'supersedesIdentityId':'','supersededByIdentityId':'',
                'fullBody':True,'sourceDriveId':record['id'],'sourceDriveUrl':record['url'],'sourceMetadataPath':item['metadataPath'],
                'alphaFacts':{'mode':'RGBA','extrema':list(extrema),'significantAlphaThreshold':16,'bbox':list(bbox),'marginsLTRB':margins,'fullyTransparentPixelFraction':transparent},
                'animationAvailable':False,'producerCanonicalOneToOneCertified':metadata.get('canonicalOneToOneCertified') is True})
        packs.append({'id':pack_id,'label':'Garnisons et guerre · V6.8 '+manifest['pack'],'version':'V6.8','priority':68,'archive':record['name'],'insideArchive':None,
            'sha256':archive_sha,'pngEntriesImported':len(manifest['files']),'recordEntries':len(manifest['files']),'status':'native-source-import-not-animation-or-canon-certification',
            'driveId':record['id'],'driveUrl':record['url']})
if len(assets)!=72 or len(seen_hashes)!=72 or len({a['groupId'] for a in assets})!=18: raise ValueError('V6.8 batch is incomplete')
registry={'version':'V86','sourceVersion':'V6.8','pixelPolicy':'original-png-bytes-no-edit','sourceStatus':'source-native-import-checked-not-canon-certified',
    'summary':{'nativePngFiles':len(seen_hashes),'sourceEntries':len(assets),'groups':18,'families':4,'nativePngBytes':sum(a['bytes'] for a in assets),'animationSheets':0},
    'packs':packs,'assets':assets}
for path,value in [(project/'app/game/data/driveGarrisonsV86.json',registry),(project/'docs/drive-garrisons-v86-sources.json',{'version':'V86','summary':registry['summary'],'packs':packs,'archiveCodeExecuted':False,'pixelsModified':False,'sourcePreserved':True})]:
    path.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(registry['summary']))
