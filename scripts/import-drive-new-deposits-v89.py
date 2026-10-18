"""Import only reviewed native V89 PNGs after bounded comparison and visual/source review.
Archive contents are never executed and earlier runtime pixels/identities stay intact.
"""
import hashlib,json,re,shutil
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
TASK=ROOT/'work-local/v89'
DEST=ROOT/'public/game/imports/v89'
DATA=ROOT/'app/game/data/driveNewDepositsSpritesV89.json'
PROOF=ROOT/'docs/drive-new-deposits-v89-sources.json'
KINDS={'npc','fauna','flora','synthetic','texture','ship','equipment','reference'}
PRIVATE=re.compile(r'authfile:|download_url|downloadUrl|file_uri|[?&](?:token|signature|sig|x-goog-signature)=|[A-Z]:\\|/workspace/|work-local/v89/(?:downloads|private-handles)',re.I)
REQUIRED=('id','identityId','label','packId','packLabel','version','priority','preferredVersion','kind',
    'groupId','groupLabel','role','roleLabel','lifeStage','regionId','morphotypeId','masked','producerStatus',
    'pose','sourceNote','supersedesIdentityId','supersededByIdentityId','bodyComposition','nativeNature',
    'fullBody','sourceLimits','sourceMetadataRefs','visualInspection')

def digest(content):return hashlib.sha256(content).hexdigest()
def encode(value):
    content=json.dumps(value,ensure_ascii=False,indent=2)+'\n'
    if PRIVATE.search(content):raise ValueError('Private transport data must not enter product files')
    return content.encode('utf8')
def key(row):
    chain='::'.join(item['member'] for item in row.get('insideArchiveChain',[]))
    return(row['fileId'],chain,row['sourceMember'],row['sha256'])

def main():
    comparison=json.loads((TASK/'native-comparison.json').read_text(encoding='utf8'))
    pending=json.loads((TASK/'expected-transfer-proof.json').read_text(encoding='utf8'))
    if comparison['status']!='comparison-complete' or comparison['errors'] or not all(row['ok'] for row in comparison['sourceReaders']):
        raise ValueError('An incomplete reader is not evidence of full pixel coverage')
    if comparison['archiveCodeExecuted'] or comparison['pixelsModified']:
        raise ValueError('Source code and source pixels must remain untouched')
    missing=comparison['missingNativePngs'];missing_sha={row['sha256'] for row in missing}
    review_file=TASK/'reviewed-native-assets.json'
    reviewed=json.loads(review_file.read_text(encoding='utf8'))['assets'] if review_file.exists() else []
    if {row['sha256'] for row in reviewed}!=missing_sha:
        raise ValueError('Every genuinely missing PNG needs explicit source and visual classification')
    if len({row['id'] for row in reviewed})!=len(reviewed):
        raise ValueError('Duplicate runtime identity in reviewed records')
    if missing_sha and (DEST.resolve()!= (TASK/'runtime-assets').resolve() or not DEST.resolve().is_relative_to(ROOT.resolve())):
        raise ValueError('Parent must prepare the exact C: workspace runtime-assets junction')
    source_by_id={row['id']:row for row in comparison['sourceReceipts']}
    metadata_by_sha={row['sha256']:row for row in comparison['sourceMetadataDocuments']}
    rows_by_sha={}
    for row in missing:rows_by_sha.setdefault(row['sha256'],[]).append(row)
    assets=[];native_proof=[];copied=set()
    for row in reviewed:
        if any(field not in row for field in REQUIRED):raise ValueError('Reviewed record lacks complete source fields')
        if row['kind'] not in KINDS or not isinstance(row['preferredVersion'],bool) or not isinstance(row['priority'],int):
            raise ValueError('Invalid source category or preference')
        if row['bodyComposition'] not in ('single-individual','rider-and-mount','reference-image'):
            raise ValueError('Body composition needs explicit review')
        if not isinstance(row['visualInspection'],str) or not row['visualInspection'].strip():
            raise ValueError('No actual visual observation documented')
        if not isinstance(row['sourceLimits'],list) or not row['sourceLimits'] or len(row['sourceLimits'])>24:
            raise ValueError('Source limits must remain visible and bounded')
        if row['kind']=='reference' and (row['bodyComposition']!='reference-image' or row['fullBody'] is not False):
            raise ValueError('A reference must never be exposed as an autonomous body')
        if row['kind']=='texture' and row['fullBody'] is not False:
            raise ValueError('A material is not a full NPC body')
        if row['kind']=='npc' and (not row['sourceMetadataRefs'] or not row.get('declaredSemantics')):
            raise ValueError('NPC role/clan/age must have linked declared source semantics')
        candidates=rows_by_sha[row['sha256']]
        selected=[candidate for candidate in candidates if key(candidate)==tuple(row['selectedSourceKey'])]
        if len(selected)!=1:raise ValueError('Primary source is not an exact reviewed native occurrence')
        primary=selected[0];source=source_by_id[primary['fileId']]
        if primary['actualAnimated']:raise ValueError('Animated PNG source needs a separate validated consumer before this static import')
        for ref in row['sourceMetadataRefs']:
            record=metadata_by_sha.get(ref)
            if not record or record['fileId']!=source['id'] or record['sourceArchiveSha256']!=source['sha256']:
                raise ValueError('Metadata evidence does not belong to the selected archive')
        original=TASK/'missing-native'/(row['sha256']+'.png')
        content=original.read_bytes()
        if digest(content)!=row['sha256'] or len(content)!=primary['bytes']:
            raise ValueError('Reviewed original native bytes changed')
        if row['sha256'] not in copied:
            target=DEST/(row['sha256']+'.png')
            if target.exists():
                if target.read_bytes()!=content:raise ValueError('An existing native target must never be overwritten')
            else:shutil.copyfile(original,target)
            copied.add(row['sha256'])
        asset={field:row[field] for field in REQUIRED}
        asset.update({'sha256':row['sha256'],'src':'/game/imports/v89/'+row['sha256']+'.png',
            'width':primary['width'],'height':primary['height'],'bytes':primary['bytes'],
            'hasAlpha':primary['hasAlpha'],'actualPngFrameCount':primary['actualPngFrameCount'],
            'actualAnimatedSource':primary['actualAnimated'],'animationAvailable':False,
            'sourceArchive':source['title'],'insideArchive':'::'.join(item['member'] for item in primary['insideArchiveChain']) or None,
            'sourcePath':primary['sourceMember'],'sourceStatus':'native-original-bytes-imported',
            'sourceDriveId':source['id'],'sourceDriveUrl':source['url'],'sourceArchiveSha256':source['sha256'],
            'sourceProvenance':candidates,'motionStatus':'single-pose-static','canonicalFidelity':'not-certified-1-to-1','strict1to1Verified':False})
        if 'declaredSemantics' in row:asset['declaredSemantics']=row['declaredSemantics']
        assets.append(asset)
        native_proof.append({'id':asset['id'],'sha256':asset['sha256'],'bytes':asset['bytes'],
            'width':asset['width'],'height':asset['height'],'publicSrc':asset['src'],
            'kind':asset['kind'],'bodyComposition':asset['bodyComposition'],'primary':primary,'allSourceOccurrences':candidates})
    packs=[]
    for pack_id in dict.fromkeys(asset['packId'] for asset in assets):
        members=[asset for asset in assets if asset['packId']==pack_id];first=members[0]
        if any(member['packLabel']!=first['packLabel'] or member['version']!=first['version'] for member in members):
            raise ValueError('A source pack cannot merge contradictory labels or versions')
        packs.append({'id':pack_id,'label':first['packLabel'],'version':first['version'],'priority':first['priority'],
            'archive':first['sourceArchive'],'insideArchive':first['insideArchive'],'sha256':first['sourceArchiveSha256'],
            'pngEntriesImported':len({asset['sha256'] for asset in members}),'recordEntries':len(members),
            'status':'native-import-source-reviewed-no-animation-or-canon-certification'})
    new_gameplay_sha={asset['sha256'] for asset in assets if asset['kind']!='reference' and asset['kind']!='texture'}
    ref_sha={asset['sha256'] for asset in assets if asset['kind']=='reference'}
    material_sha={asset['sha256'] for asset in assets if asset['kind']=='texture'}
    summary={**comparison['summary'],'nativeSourceRecords':len(assets),'newDistinctPngFiles':len(copied),
        'newDistinctPngBytes':sum((TASK/'missing-native'/(h+'.png')).stat().st_size for h in copied),
        'newGameplayPngFiles':len(new_gameplay_sha),'newReferencePngFiles':len(ref_sha),'newMaterialPngFiles':len(material_sha),
        'newAnimationSheets':0,'certifiedCanon1to1':0,'providerBlockedSources':len(pending['providerBlocked']),
        'productConsumerConnected':False}
    limits=['These imports preserve original bytes and source variants; no canonical 1:1 or animation cycle is certified.',
        'Authenticated archive transfer, PNG comparison, product registration, browser gameplay and publication remain separate evidence.',
        'Sources exceeding the provider 268435456-byte limit remain explicitly unverified; no size-limit bypass was attempted.',
        'The 640 V84 planned variants remain metadata-only unless their exact original pixels are independently recovered.']
    data={'version':'V89','summary':summary,'packs':packs,'sourceCorrectionNotes':[],'assets':assets}
    proof={'version':'V89','scope':'Only fully read authenticated archives in the V89 batch; not all Drive files.',
        'sourceReceipts':comparison['sourceReceipts'],'sourceReaders':comparison['sourceReaders'],
        'sourceMetadataDocuments':comparison['sourceMetadataDocuments'],'nestedArchiveProof':comparison['nestedArchiveProof'],
        'nativeProof':native_proof,'alreadyPresentExactNativeProof':[row for row in comparison['pngEntries'] if not row['nativeMissingFromCurrentRegistries']],
        'providerBlocked':pending['providerBlocked'],'metadataDifferences':pending['metadataDifferences'],
        'summary':summary,'archiveCodeExecuted':False,'pixelsModified':False,
        'claims':{'canon1to1':False,'newAnimationCycles':False,'allDriveNativeSourcesComplete':False,'consumerConnected':False},
        'limits':limits}
    # Public provenance has logical source members and canonical Drive IDs/URLs only, never receipt paths or signed handles.
    DATA.write_bytes(encode(data));PROOF.write_bytes(encode(proof))
    print(json.dumps(summary),flush=True)
if __name__=='__main__':main()
