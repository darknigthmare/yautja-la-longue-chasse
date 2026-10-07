"""Preserve the 121 missing native PNGs found in the authenticated V87 audit.

Input packs and their scripts are never executed. The separately produced audit
has already streamed and compared all PNG entries from 58 archive files and 42
individual Drive PNGs. This importer verifies the preserved bytes again, writes
only unchanged PNGs, and keeps material/reference evidence outside NPC bodies.
"""
import hashlib
import io
import json
import re
import struct
from collections import Counter
from pathlib import Path, PurePosixPath

from PIL import Image

PROJECT = Path(__file__).resolve().parents[1]
AUDIT = PROJECT / 'work-local/v87/drive-audit'
PUBLIC = PROJECT / 'public/game/imports/v87/archive-audit'
DATA = PROJECT / 'app/game/data/driveArchiveAuditSpritesV87.json'
PROOF = PROJECT / 'docs/drive-archive-audit-v87-sources.json'
RELATIONS = (
    'supersedes_asset_id', 'superseded_by_asset_id',
    'morphology_corrected_by_asset_id', 'same_layout_as_correction',
    'complement_de_asset_id', 'complement_camp_asset_id',
    'supersedesIdentityId', 'supersededByIdentityId',
)
EXPECTED_NATURES = {
    'texture-source-reconstruction': 76, 'reference-contactsheet': 18,
    'reference-game-menu': 1, 'reference-documentary': 22,
    'reference-generation': 4,
}


def digest(content):
    return hashlib.sha256(content).hexdigest()


def json_bytes(value):
    return (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode('utf8')


def safe_member(value):
    member = PurePosixPath(value.replace('\\', '/'))
    if member.is_absolute() or '..' in member.parts or any(':' in p for p in member.parts):
        raise ValueError('Unsafe source member')
    return member.as_posix()


def preserve(target, content):
    target.parent.mkdir(parents=True, exist_ok=True)
    if target.exists():
        if target.read_bytes() != content:
            raise ValueError('An existing native PNG differs; preserve it')
        return
    with target.open('xb') as stream:
        stream.write(content)


def primary_metadata(records, member):
    """Select the native asset fiche, never an alias or stale generation job."""
    stem = PurePosixPath(safe_member(member)).stem
    candidates = [m for m in records if m['declaredSemantics'].get('id') == stem]
    def rank(record):
        semantics = record['declaredSemantics']
        direct_fiche = record['manifestMember'].replace('\\', '/').endswith('/manifests/' + stem + '.json')
        return (direct_fiche, semantics.get('generation_status') == 'completed',
                bool(semantics.get('description')), bool(semantics.get('reference_name')),
                record['manifestMember'])
    return max(candidates, key=rank) if candidates else None


def main():
    # Only the completed byte audit may authorize this exact source batch.
    audit = json.loads((AUDIT / 'comparison-final.json').read_text(encoding='utf8'))
    config = json.loads((AUDIT / 'transfer-config.json').read_text(encoding='utf8'))
    if audit['partial'] or audit['materializedSources'] != 100 or audit['blockedTransfers']:
        raise ValueError('Authenticated source audit is incomplete')
    if any(not r['ok'] for r in audit['archiveReports'] + audit['metadataReports']):
        raise ValueError('Source member or metadata reader has failed')
    rows = audit['missingNativePngs']
    if len(rows) != 121 or len({r['sha256'] for r in rows}) != 121:
        raise ValueError('This importer only owns the 121 distinct missing PNGs')
    if dict(Counter(r['nature'] for r in rows)) != EXPECTED_NATURES:
        raise ValueError('The source classification differs from the reviewed batch')

    # Public evidence includes only canonical Drive links and immutable hashes.
    # Private authfile handles, download paths and signed URLs stay ignored.
    sources = []
    for source in config['files']:
        source_id = source['id']
        receipt_path = PROJECT / 'work-local/v87/downloads' / (source_id + Path(source['title']).suffix + '.receipt.json')
        receipt = json.loads(receipt_path.read_text(encoding='utf8'))
        if receipt['id'] != source_id or receipt['bytes'] != source['bytes']:
            raise ValueError('Authenticated source receipt differs')
        sources.append({
            'id': source_id, 'title': receipt['title'], 'bytes': receipt['bytes'],
            'sha256': receipt['sha256'], 'transport': receipt['transport'],
            'url': 'https://drive.google.com/file/d/' + source_id + '/view',
        })
    source_by_id = {s['id']: s for s in sources}
    metadata_by_id = {}
    assets = []
    native_proof = []

    for row in sorted(rows, key=lambda item: (item['nature'], item['sha256'])):
        sha = row['sha256']
        if not re.fullmatch('[a-f0-9]{64}', sha):
            raise ValueError('Unsafe native PNG hash')
        original = AUDIT / 'missing-native' / (sha + '.png')
        content = original.read_bytes()
        if digest(content) != sha or len(content) != row['bytes']:
            raise ValueError('Preserved native PNG bytes have changed')
        if content[:8] != b'\x89PNG\r\n\x1a\n' or list(struct.unpack('>II', content[16:24])) != [row['width'], row['height']]:
            raise ValueError('Native PNG header differs')
        with Image.open(io.BytesIO(content)) as image:
            image.load()
            has_alpha = 'A' in image.getbands() or 'transparency' in image.info
            if image.format != 'PNG' or has_alpha != row['hasAlpha']:
                raise ValueError('Native image alpha or format differs')
        preserve(PUBLIC / (sha + '.png'), content)

        # The documents retain all exact path links and manifest/record hashes;
        # repeated cumulative archives never create another runtime asset.
        provenance = []
        referenced_metadata = []
        for source in row['provenance']:
            native_member = safe_member(source['sourceMember'])
            if source['sourceArchiveSha256'] != source_by_id[source['fileId']]['sha256']:
                raise ValueError('PNG provenance archive hash differs')
            refs = []
            for record in source['sourceManifestRecords']:
                clean = {k: v for k, v in record.items() if k != 'recordId'}
                safe_member(clean['manifestMember'])
                if clean['manifestArchiveSha256'] != source_by_id[clean['manifestFileId']]['sha256']:
                    raise ValueError('Companion manifest source hash differs')
                record_id = 'manifest-' + digest(json.dumps(clean, ensure_ascii=False, sort_keys=True).encode('utf8'))
                metadata_by_id.setdefault(record_id, {'id': record_id, **clean})
                refs.append(record_id)
                referenced_metadata.append(record)
            provenance.append({
                'fileId': source['fileId'], 'sourceDriveUrl': source_by_id[source['fileId']]['url'],
                'sourceArchive': source['sourceArchive'], 'sourceArchiveSha256': source['sourceArchiveSha256'],
                'sourceMember': native_member, 'insideArchive': source['insideArchive'] or None,
                'sourceVolumeIds': source['sourceVolumeIds'], 'manifestRecordRefs': sorted(set(refs)),
            })
        first = provenance[0]
        material = row['nature'] == 'texture-source-reconstruction'
        primary = primary_metadata(referenced_metadata, first['sourceMember']) if material else None
        semantics = dict(primary['declaredSemantics']) if primary else {}
        if material and not primary:
            raise ValueError('A material lacks an exact native fiche')
        if material and semantics.get('strict_1to1_verified') is not False:
            raise ValueError('Material source must explicitly deny 1:1 verification')
        native_stem = PurePosixPath(first['sourceMember']).stem
        label = semantics.get('name') or native_stem
        category = semantics.get('category') or PurePosixPath(first['sourceMember']).parent.name
        limits = []
        reference_claims = []
        def add_limits(value):
            if isinstance(value, str):
                if value and value not in limits: limits.append(value)
            elif isinstance(value, list):
                for item in value: add_limits(item)
        # Exact linked sources keep their scope restrictions even for menu
        # captures. Never turn a reference's palette note into a body claim.
        for record in referenced_metadata:
            declared = record['declaredSemantics']
            for key in ('limits', 'notes', 'reference_note'):
                add_limits(declared.get(key))
            for key in ('limits', 'fidelity_note', 'count_note'):
                add_limits(record['documentLimits'].get(key))
            if not material:
                claim = {key: declared[key] for key in ('primary_texture', 'scope', 'kind', 'role', 'mapped_asset_id', 'menu_label', 'confidence', 'official_name_in_menu_confirmed', 'official_shader_identity_confirmed') if key in declared}
                if claim and claim not in reference_claims: reference_claims.append(claim)
        visible_limits = limits[:24]
        reference_description = next((record['declaredSemantics']['description'] for record in referenced_metadata if isinstance(record['declaredSemantics'].get('description'), str)), '')
        reference_note = ('Référence de menu PHG conservée entière ; ce PNG est une capture et ne constitue pas une matière.' if row['nature'] == 'reference-game-menu' else 'Image source entière conservée ; aucun corps, détourage ou cycle animé n’est certifié.')
        if reference_description: reference_note += ' ' + reference_description
        material_note = semantics.get('description') or (semantics.get('reference_name', '') + ' · Matière 2D reconstruite ; aucun UV original ou raccord sans couture certifié.')
        pack_id = 'phg-archive-audit-v87' if material else 'references-archive-audit-v87'
        pack_label = 'Matériaux PHG · sources reconstruites' if material else 'Références natives · audit Drive'
        relations = {key: semantics[key] for key in RELATIONS if key in semantics}
        supersedes = str(relations.get('supersedesIdentityId') or '')
        superseded = str(relations.get('supersededByIdentityId') or '')
        # A source's generation job or uncertain shader name is not evidence
        # that its completed native image is a superseded historical version.
        preferred = not bool(superseded) and semantics.get('status') not in ('rejected', 'superseded', 'obsolete')
        asset = {
            'id': 'drive-archive-audit-v87:' + sha, 'identityId': semantics.get('id') or 'source-reference-' + sha,
            'label': label, 'packId': pack_id, 'packLabel': pack_label, 'version': '2026-10-07',
            'priority': 87, 'preferredVersion': preferred, 'kind': 'texture' if material else 'reference',
            'groupId': category if material else row['nature'],
            'groupLabel': category if material else 'Références · ' + row['nature'],
            'role': 'reconstructed-material' if material else row['nature'],
            'roleLabel': category + ' · reconstitution 2D' if material else 'Référence source sans corps de PNJ',
            'lifeStage': '', 'regionId': '', 'morphotypeId': '', 'masked': '',
            'src': '/game/imports/v87/archive-audit/' + sha + '.png',
            'width': row['width'], 'height': row['height'], 'bytes': row['bytes'], 'sha256': sha,
            'sourceArchive': first['sourceArchive'], 'insideArchive': first['insideArchive'],
            'sourcePath': first['sourceMember'], 'sourceStatus': 'native-bytes-authenticated-material' if material else 'native-reference-preserved-not-character-roster',
            'producerStatus': semantics.get('status') or 'source-reference-not-canon-certified',
            'pose': 'Surface de matière 2D · image source entière' if material else 'Image de référence native · aucun corps jouable',
            'motionStatus': 'single-pose-static', 'canonicalFidelity': 'not-certified-1-to-1',
            'sourceNote': material_note if material else reference_note,
            'supersedesIdentityId': supersedes, 'supersededByIdentityId': superseded,
            'bodyComposition': 'reference-image', 'fullBody': False,
            'animationAvailable': False, 'strict1to1Verified': False,
            'nativeNature': row['nature'], 'sourceDriveId': first['fileId'], 'sourceDriveUrl': first['sourceDriveUrl'],
            'sourceArchiveSha256': first['sourceArchiveSha256'],
            'sourceMetadataRefs': sorted({ref for p in provenance for ref in p['manifestRecordRefs']}),
            'declaredSemantics': semantics, 'sourceRelations': relations, 'sourceLimits': visible_limits,
            'sourceLimitsTruncated': len(limits) > 24, 'sourceReferenceClaims': reference_claims[:24],
            'sourceAliases': sorted({p['sourceMember'] for p in provenance}),
            'alphaFacts': {'hasAlpha': row['hasAlpha'], 'bbox': row['alphaBBox'], 'transparentPixelRatio': row['transparentPixelRatio']},
        }
        assets.append(asset)
        native_proof.append({
            'id': asset['id'], 'sha256': sha, 'bytes': row['bytes'], 'width': row['width'], 'height': row['height'],
            'hasAlpha': row['hasAlpha'], 'alphaBBox': row['alphaBBox'], 'transparentPixelRatio': row['transparentPixelRatio'],
            'nativeNature': row['nature'], 'publicSrc': asset['src'], 'provenance': provenance,
        })

    summary = {
        'nativeSourceRecords': len(assets), 'newDistinctPngFiles': len(assets),
        'newDistinctPngBytes': sum(a['bytes'] for a in assets), 'materialPngFiles': 76,
        'referencePngFiles': 45, 'newNpcBodies': 0, 'newAnimationSheets': 0, 'certifiedCanon1to1': 0,
        'sourceArchiveFilesTransferred': 58, 'individualPngFilesVerified': 42,
        'sourceFilesTransferred': 100, 'sourceTransferredBytes': sum(s['bytes'] for s in sources),
        'pngSourceEntriesCompared': audit['pngEntriesCompared'], 'uniquePngSourceHashesCompared': audit['uniquePngCompared'],
        'individualPngAlreadyPresentExactSha': sum(r.get('matchesPreviouslyVerifiedNativeSha256') is True for r in audit['pngs']),
        'nativeNatureCounts': EXPECTED_NATURES,
    }
    if summary['newDistinctPngBytes'] != 495001123:
        raise ValueError('The exact native batch byte total differs')
    packs = []
    for pack_id in ('phg-archive-audit-v87', 'references-archive-audit-v87'):
        members = [a for a in assets if a['packId'] == pack_id]
        packs.append({
            'id': pack_id, 'label': members[0]['packLabel'], 'version': '2026-10-07', 'priority': 87,
            'archive': 'Sources authentifiées de l’audit Drive V87', 'insideArchive': None, 'sha256': '',
            'pngEntriesImported': len(members), 'recordEntries': len(members),
            'status': 'native-source-preserved-no-animation-or-canon-certification',
        })
    registry = {'version': 'V87', 'summary': summary, 'assets': assets, 'packs': packs, 'sourceCorrectionNotes': []}
    individual_proof = [{k: r[k] for k in ('fileId', 'sourceDriveUrl', 'sourceMember', 'sha256', 'bytes', 'width', 'height', 'expectedLocalSha256', 'matchesPreviouslyVerifiedNativeSha256')} for r in audit['pngs'] if 'expectedLocalSha256' in r]
    proof = {
        'version': 'V87', 'scope': '58-remaining-archives-and-42-individual-pngs-from-accessible-Yautja-Drive-snapshot',
        'summary': summary, 'sourceReceipts': sources, 'sourceReaders': audit['archiveReports'],
        'sourceMetadataReaders': audit['metadataReports'], 'nativeProof': native_proof,
        'manifestRecords': sorted(metadata_by_id.values(), key=lambda m: m['id']), 'individualPngProof': individual_proof,
        'pixelsModified': False, 'archiveCodeExecuted': False, 'claims': {
            'newNpcBodies': False, 'newAnimationSheets': False, 'canon1to1': False,
            'originalGameUvTextures': False, 'completeOfficialShaderCatalogue': False,
        },
        'limitations': [
            '76 counts preserved PNG materials; it does not count 76 official shaders or all Hunting Grounds variations.',
            '45 references include previews, menu captures and generation references; none is an individual NPC body.',
            'Companion manifests remain source-author assertions. No source instructions or pack scripts were executed.',
            'All 42 individually verified PNGs already existed as exact native runtime bytes; no duplicate import is made.',
            'This authenticated byte audit covers 58 archive files. The other 30 archived sources have separate local-pixel coverage, not a renewed Drive-byte identity proof; the 321 MB portable source exceeds this batch transfer cap.',
            'V84 metadata still does not supply its 640 referenced PNGs; the available V69 document archive has no native PNG.',
        ],
    }
    for target, value in ((DATA, registry), (PROOF, proof)):
        target.write_bytes(json_bytes(value))
    print(json.dumps(summary, ensure_ascii=True))


if __name__ == '__main__':
    main()
