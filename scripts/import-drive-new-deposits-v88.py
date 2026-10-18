"""Preserve two overlooked native Badlands reference sheets, not new bodies.

Inputs were authenticated through Drive, read with a bounded archive reader,
and compared against actual PNG bytes from all JSON data registries. This
importer never executes pack code, crops a sheet, synthesizes a frame, or changes
the existing V85/V86/V87 identities and pixels.
"""
import hashlib
import io
import json
import re
import struct
from pathlib import Path, PurePosixPath

from PIL import Image

PROJECT = Path(__file__).resolve().parents[1]
TASK = PROJECT / 'work-local/v88'
PUBLIC = PROJECT / 'public/game/imports/v88'
DATA = PROJECT / 'app/game/data/driveNewDepositsSpritesV88.json'
PROOF = PROJECT / 'docs/drive-new-deposits-v88-sources.json'
EXPECTED = {
    '715f09cf27635020853a3fb566db317694c00e62266a6181b338814d9afd3203': {
        'version': 'V2', 'fileId': '1jm0X8VNx1e_gKwMQbc14Sf6BO3XP-Js1', 'bytes': 2498642,
        'dimensions': [2200, 4011], 'previewSubjectCount': 33,
    },
    '3da241e79a7fade6b9d04f2fc4ab0da6a6682b0a33025eb763ce765df4b9e690': {
        'version': 'V4', 'fileId': '1gUgzXhkKTsdmjpT3MgKBEfgttkIu5GAo', 'bytes': 4901394,
        'dimensions': [2400, 7026], 'previewSubjectCount': 61,
    },
}


def digest(content):
    return hashlib.sha256(content).hexdigest()


def encode(value):
    return (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode('utf8')


def safe_member(value):
    path = PurePosixPath(value.replace('\\', '/'))
    if path.is_absolute() or '..' in path.parts or any(':' in part for part in path.parts):
        raise ValueError('Unsafe source member')
    return path.as_posix()


def main():
    audit = json.loads((TASK / 'authenticated-rar-audit.json').read_text(encoding='utf8'))
    inventory = json.loads((TASK / 'metadata-differences.json').read_text(encoding='utf8'))
    reconciliation = json.loads((TASK / 'older-native-reconciliation.json').read_text(encoding='utf8'))
    missing = audit['missingNativePngs']
    if {item['sha256'] for item in missing} != set(EXPECTED) or len(missing) != 2 or audit['summary']['nativePngEntriesCompared'] != 96 or audit['summary']['spriteEntriesMissing'] != 0:
        raise ValueError('This importer owns only two reviewed reference sheets')
    if reconciliation['nativeErrors'] or reconciliation['summary']['knownMetadataOnlyMissingPaths'] != 640:
        raise ValueError('Do not conceal native integrity errors or the explicit V84 pixel gap')
    if audit['pixelsModified'] or audit['archiveCodeExecuted']:
        raise ValueError('Source pixels and archive code must remain untouched')
    if not PUBLIC.resolve().is_relative_to(PROJECT.resolve()) or PUBLIC.resolve() != (TASK / 'runtime-assets').resolve():
        raise ValueError('Root must prepare the approved V88 runtime-assets junction first')

    sources = {source['id']: source for source in audit['sourceReceipts']}
    verified = {row['sha256']: row for row in reconciliation['verified']}
    for source in sources.values():
        if source['transport'] != 'authenticated-file-uri' or not re.fullmatch('[a-f0-9]{64}', source['sha256']):
            raise ValueError('Source archive lacks authenticated immutable evidence')
        receipts = list((TASK / 'downloads').glob(source['id'] + '--' + source['sha256'] + '.rar.receipt.json'))
        if len(receipts) != 1:
            raise ValueError('Preserved source receipt is absent')
        receipt = json.loads(receipts[0].read_text(encoding='utf8'))
        native = Path(receipt['path'])
        if not native.resolve().is_relative_to((TASK / 'downloads').resolve()) or native.stat().st_size != source['bytes']:
            raise ValueError('Source receipt points outside the immutable transfer area')
        with native.open('rb') as stream:
            if hashlib.file_digest(stream, 'sha256').hexdigest() != source['sha256']:
                raise ValueError('Preserved authenticated archive bytes changed')

    assets, packs, native_proof = [], [], []
    for row in sorted(missing, key=lambda item: EXPECTED[item['sha256']]['version']):
        sha = row['sha256']
        expected = EXPECTED[sha]
        source = sources[row['fileId']]
        member = safe_member(row['sourceMember'])
        if row['fileId'] != expected['fileId'] or row['sourceArchiveSha256'] != source['sha256'] or row['spriteMember'] or not member.endswith('/APERCU_BADLANDS.png'):
            raise ValueError('Do not turn a contact sheet into an independent gameplay sprite')
        original = TASK / 'native-sources' / (sha + '.png')
        content = original.read_bytes()
        if digest(content) != sha or len(content) != expected['bytes'] or row['bytes'] != len(content) or content[:8] != b'\x89PNG\r\n\x1a\n' or list(struct.unpack('>II', content[16:24])) != expected['dimensions']:
            raise ValueError('Reference native PNG no longer matches reviewed source')
        with Image.open(io.BytesIO(content)) as image:
            image.load()
            if image.mode != 'RGB' or image.format != 'PNG' or getattr(image, 'n_frames', 1) != 1 or 'A' in image.getbands() or getattr(image, 'is_animated', False):
                raise ValueError('Reference sheet format or single-frame status changed')
        if sha in verified:
            raise ValueError('A source already registered must not be counted again')
        target = PUBLIC / (sha + '.png')
        if target.exists():
            if target.read_bytes() != content:
                raise ValueError('Existing original differs; preserve it')
        else:
            with target.open('xb') as stream:
                stream.write(content)
        version = expected['version']
        pack_id = 'badlands-reference-' + version.lower() + '-v88'
        identity = 'badlands-contactsheet-' + version.lower()
        documents = [item for item in audit['sourceMetadataDocuments'] if item['fileId'] == row['fileId']]
        limits = []
        for document in documents:
            for value in document.get('documentLimits', {}).values():
                if isinstance(value, str) and value not in limits:
                    limits.append(value)
        limits.extend([
            'Planche historique à plusieurs sujets avec titres et fond opaque : pas un corps de PNJ ni une texture jouable.',
            'Les images individuelles de ce pack sont déjà présentes avec leurs empreintes natives ; cette planche ne fournit aucun nouveau personnage ou cycle animé.',
            'Les états et poses illustrés restent des PNG statiques indépendants, sans alignement de trames ni échelle commune garanti.',
            'Les labels anciens ne remplacent pas les corrections et versions individuelles conservées dans les registres récents.',
        ])
        if version == 'V4':
            limits.append('La mention graphique « 61 → 46 » appartient au suivi historique V4 ; aucune identité de combattant ou correction runtime n’est assignée depuis cette planche.')
        asset = {'id': 'drive-new-deposits-v88:' + identity + ':' + sha[:12], 'identityId': identity,
            'label': 'Planche historique Predator: Badlands · ' + version,
            'packId': pack_id, 'packLabel': 'Badlands · références historiques ' + version,
            'version': version, 'priority': int(version[1:]), 'preferredVersion': True,
            'kind': 'reference', 'groupId': 'badlands-documentation', 'groupLabel': 'Badlands · documentation',
            'role': 'historical-contactsheet', 'roleLabel': 'Planche de référence historique', 'lifeStage': '',
            'regionId': '', 'morphotypeId': '', 'masked': '', 'src': '/game/imports/v88/' + sha + '.png',
            'width': expected['dimensions'][0], 'height': expected['dimensions'][1], 'bytes': len(content), 'sha256': sha,
            'sourceArchive': source['title'], 'insideArchive': None, 'sourcePath': member,
            'sourceStatus': 'native-reference-bytes-imported', 'producerStatus': 'historical-source-document',
            'pose': 'Planche historique à plusieurs sujets', 'motionStatus': 'single-pose-static',
            'canonicalFidelity': 'not-certified-1-to-1', 'sourceNote': 'Aperçu historique complet ' + version + ' conservé sans découpe ni changement de pixels. Les ' + str(expected['previewSubjectCount']) + ' sujets illustrés ne sont pas de nouveaux imports de corps.',
            'supersedesIdentityId': '', 'supersededByIdentityId': '', 'sourceDriveId': source['id'],
            'sourceDriveUrl': source['url'], 'sourceArchiveSha256': source['sha256'],
            'bodyComposition': 'reference-image', 'fullBody': False, 'animationAvailable': False,
            'nativeNature': 'reference-contactsheet', 'hasAlpha': False, 'actualPngFrameCount': 1,
            'strict1to1Verified': False, 'sourceLimits': limits,
            'sourceMetadataRefs': [item['sha256'] for item in documents],
            'visualInspection': 'Vue native complète : grille de sujets et labels sur fond opaque, destinée à la documentation historique uniquement.'}
        assets.append(asset)
        packs.append({'id': pack_id, 'label': asset['packLabel'], 'version': version, 'priority': asset['priority'],
            'archive': source['title'], 'insideArchive': None, 'sha256': source['sha256'], 'pngEntriesImported': 1,
            'recordEntries': 1, 'status': 'historical-reference-native-import-not-animation-or-body', 'driveId': source['id']})
        native_proof.append({'id': asset['id'], 'sha256': sha, 'bytes': len(content), 'width': asset['width'],
            'height': asset['height'], 'publicSrc': asset['src'], 'fileId': source['id'], 'sourceArchiveSha256': source['sha256'],
            'sourceMember': member, 'kind': 'reference-contactsheet', 'mode': 'RGB', 'hasAlpha': False, 'actualPngFrameCount': 1})

    already_present = [row for row in audit['pngEntries'] if row['existingNativeRuntimeSrc']]
    if len(already_present) != 94 or len({row['sha256'] for row in already_present}) != 61:
        raise ValueError('Existing sprites must stay deduplicated across cumulative archives')
    summary = {'nativeSourceRecords': 2, 'newDistinctPngFiles': 2, 'newDistinctPngBytes': 7400036,
        'newNpcBodies': 0, 'newAnimationSheets': 0, 'certifiedCanon1to1': 0, 'historicalReferencePngFiles': 2,
        'sourceArchiveFilesTransferred': 2, 'sourceBytesTransferred': 173581412,
        'sourcePngEntriesCompared': 96, 'sourceUniquePngHashesCompared': 63,
        'existingSpritePngSourceEntries': 94, 'existingSpriteUniquePngHashes': 61,
        'freshDriveFolderCount': inventory['folderCount'], 'freshDriveUniqueIds': inventory['uniqueIds'],
        'freshNewIds': len(inventory['newItems']), 'freshModifiedIds': len(inventory['modifiedItems']),
        'v84DeclaredMissingPngs': 640, 'otherOlderArchiveDriveByteIdentityNotRenewedCount': 28}
    data = {'version': 'V88', 'summary': summary, 'packs': packs, 'sourceCorrectionNotes': [], 'assets': assets}
    proof = {'version': 'V88', 'scope': 'Two real historical reference sheets omitted from prior native registries. No newly deposited gameplay sprite was found.',
        'sourceReceipts': audit['sourceReceipts'], 'sourceMetadataDocuments': audit['sourceMetadataDocuments'],
        'nativeProof': native_proof, 'alreadyPresentExactNativeProof': already_present,
        'freshDriveInventory': {'baselineCompletedAt': inventory['baselineCompletedAt'],
            'observedStartedAt': inventory['observedStartedAt'], 'observedCompletedAt': inventory['observedCompletedAt'],
            'folderCount': inventory['folderCount'], 'uniqueIds': inventory['uniqueIds'],
            'newItems': inventory['newItems'], 'modifiedItems': inventory['modifiedItems'], 'excelChanges': inventory['excelChanges'],
            'folderSearchTerms': ['Yautja', 'Predator', 'Longue Chasse'], 'newFoldersDiscovered': 0,
            'nativeDownloadsFromUnchangedHistoricalSources': 2},
        'allRegistryNativeReconciliation': reconciliation['summary'], 'summary': summary,
        'pixelsModified': False, 'archiveCodeExecuted': False,
        'claims': {'newNpcBodies': False, 'newAnimationSheets': False, 'canon1to1': False, 'allDriveArchiveBytesReverified': False, 'v84PixelsRecovered': False},
        'limits': ['Only two historical contact sheets are new imports, not 94 new sprites from the cumulative archives.',
            'The 640 V84 source variants remain explicitly metadata-only without native files; no substitute lineage, costume or animation was invented.',
            'The other 28 previously cached archive identities were not retransferred. Existing local pixel coverage is distinct from authenticated provider archive bytes.',
            'Folder responses expose at most 100 direct children. Every refreshed folder returned fewer than 100; inaccessible Drive content is outside this proof.',
            'Unchanged metadata is not a fresh byte-identity proof for every Drive source.']}
    serialized = encode([data, proof]).decode('utf8')
    if re.search(r'download_url|downloadUrl|file_uri|authfile:|[?&](?:token|signature|sig|x-goog-signature)=|C:\\\\|/workspace/|work-local/v88/downloads', serialized, re.I):
        raise ValueError('Private transport and local source paths must remain ignored')
    DATA.write_bytes(encode(data))
    PROOF.write_bytes(encode(proof))
    (TASK / 'import-summary.json').write_bytes(encode(summary))
    print(json.dumps(summary, ensure_ascii=True))


if __name__ == '__main__':
    main()
