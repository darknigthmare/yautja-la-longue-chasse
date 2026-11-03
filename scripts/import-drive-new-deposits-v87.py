"""Import the five authenticated V6.9 revisions without running archive code.

The native PNG manifest, final acceptance metadata and historical design brief
are separate evidence. Original bytes and identities are retained. A completed
static character is not an animation or independently certified canon replica.
"""
import hashlib
import io
import json
import re
import struct
import zipfile
from collections import Counter
from pathlib import Path, PurePosixPath

from PIL import Image

PROJECT = Path(__file__).resolve().parents[1]
TASK = PROJECT / 'work-local/v87/new-deposits'
PUBLIC = PROJECT / 'public/game/imports/v87/new-deposits'
DATA = PROJECT / 'app/game/data/driveNewDepositsSpritesV87.json'
PROOF = PROJECT / 'docs/drive-new-deposits-v87-sources.json'
PACK_IDS = ['1S2U0ltwwlEMaYyIEfp8Ug4Ihe2Ns8UrY', '1aTUhDVKU14MTaD3IQoDkB6HtHcTp5ucT', '1yxg_AKxBqO21ySbD1Af3qZtixd7-ESW3']
FOLLOWUP_ID = '1u6BGTya6-P_coCfXr5-xmjxK7B8jqMxA'
INDEX_ID = '1pqfznj8aV3WcpGFJAYFk4sD_2sJQ10l9'
BASE_REGISTRIES = [
    'recentSpriteLibraryV85.json', 'driveLatestSpritesV85.json',
    'badlandsLatestSpritesV85.json', 'recentApprovedHuntersV85.json',
    'driveGarrisonsV86.json', 'driveCompletionSpritesV87.json',
    'driveArchiveAuditSpritesV87.json',
]


def sha(content):
    return hashlib.sha256(content).hexdigest()


def encoded(value):
    return (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode('utf8')


def record_sha(value):
    return sha(json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode('utf8'))


def safe_member(value):
    member = PurePosixPath(value.replace('\\', '/'))
    if member.is_absolute() or '..' in member.parts or any(':' in part for part in member.parts):
        raise ValueError('Unsafe archive member')
    return member.as_posix()


def preserve(target, content):
    target.parent.mkdir(parents=True, exist_ok=True)
    if not target.resolve().is_relative_to(PROJECT.resolve()):
        raise ValueError('Public target must remain inside the workspace')
    if target.exists():
        if target.read_bytes() != content:
            raise ValueError('Existing original bytes differ; never overwrite')
        return
    with target.open('xb') as stream:
        stream.write(content)


def read_source(source):
    revision = PROJECT / safe_member(source['localRevisionPath'])
    if not revision.resolve().is_relative_to(TASK.resolve()):
        raise ValueError('Source revision outside the ignored task directory')
    content = revision.read_bytes()
    receipt = json.loads(Path(str(revision) + '.receipt.json').read_text(encoding='utf8'))
    if source['id'] != receipt['id'] or len(content) != source['bytes'] or sha(content) != source['sha256'] or receipt['sha256'] != source['sha256'] or receipt['bytes'] != source['bytes']:
        raise ValueError('Authenticated source revision or receipt differs')
    if receipt['transport'] != 'authenticated-file-uri':
        raise ValueError('Source lacks authenticated transport evidence')
    clean = {key: source[key] for key in ['id', 'title', 'bytes', 'sha256', 'createdAt', 'modifiedAt']}
    clean.update({'url': 'https://drive.google.com/file/d/' + source['id'] + '/view', 'transport': receipt['transport']})
    return revision, clean


def validate_archive(pack):
    names = pack.namelist()
    for name in names:
        safe_member(name)
    if len(names) != len(set(names)) or pack.testzip() is not None:
        raise ValueError('Ambiguous archive members or invalid ZIP CRC')
    if 'SHA256SUMS.txt' in names:
        for line in pack.read('SHA256SUMS.txt').decode('utf-8-sig').splitlines():
            if not line.strip():
                continue
            match = re.fullmatch(r'([a-f0-9]{64})\s+\*?(.+)', line)
            if not match:
                raise ValueError('Unrecognized source checksum line')
            member = safe_member(match.group(2))
            if sha(pack.read(member)) != match.group(1):
                raise ValueError('Source member checksum differs')


def alpha_facts(content):
    with Image.open(io.BytesIO(content)) as image:
        image.load()
        if image.format != 'PNG' or image.mode != 'RGBA' or getattr(image, 'n_frames', 1) != 1 or getattr(image, 'is_animated', False):
            raise ValueError('Native character must retain RGBA PNG')
        alpha = image.getchannel('A')
        bbox = alpha.point(lambda value: 255 if value >= 16 else 0).getbbox()
        if not bbox or alpha.getextrema()[0] != 0:
            raise ValueError('Missing character silhouette or native transparency')
        width, height = image.size
        return {'mode': image.mode, 'extrema': list(alpha.getextrema()), 'bbox': list(bbox),
                'significantAlphaThreshold': 16, 'marginsLTRB': [bbox[0], bbox[1], width - bbox[2], height - bbox[3]]}


def add_strings(target, value):
    if isinstance(value, str) and value and value not in target:
        target.append(value)
    elif isinstance(value, list):
        for item in value:
            add_strings(target, item)


def clean_history(metadata):
    # Native attempts stay documentary records; absent historical PNGs never
    # acquire a public path, animation frame or invented replacement identity.
    allowed = ['id', 'accepted', 'sha256', 'generationMode', 'reviewStatus', 'inspectionFR',
               'rejectionReasonFR', 'editReasonFR', 'preservedAt']
    result = []
    for ordinal, attempt in enumerate(metadata.get('generationHistory', [])):
        row = {'ordinal': ordinal, **{key: attempt[key] for key in allowed if key in attempt}}
        evidence = attempt.get('inspectionEvidence', {})
        if evidence:
            row['inspectionEvidence'] = {key: evidence[key] for key in ['kind', 'originalMetadataSha256', 'sourceJsonPointer', 'newVisualInspectionPerformed'] if key in evidence}
        result.append(row)
    return result


def identity_semantics(details):
    """Preserve the two real brief schemas without fabricating missing fields."""
    identity = details.get('identity', details)
    anatomy = identity.get('anatomyDefinition', {})
    outfit = details.get('outfit', {})
    declared = {key: details[key] for key in ['groupId', 'groupFR', 'groupNameFR', 'familyId', 'familyFR', 'variant', 'roleFR', 'roleDescriptionFR', 'regionId', 'lifeStage', 'masked', 'mounted', 'military', 'loadoutCheckFR', 'lineageAnatomyFR', 'canonicalStatusFR', 'skinDirectionEN', 'armorFinishEN', 'canonicalFidelityCertified', 'bodyDesign', 'morphologyFR', 'faceDesignFR', 'faceVisibilityFR', 'dreadlocksDesignFR', 'maskDesignFR', 'maskPlacementFR', 'armourDesignFR', 'equipmentFR', 'equipmentCounts', 'poseFR', 'hardConstraintsFR', 'canonicalBoundaryFR', 'regionAssignment', 'canonicalBiologicalRaceClaim', 'canonicalRoleCostume', 'originalContemporaryMilitaryAdaptation', 'individualFaceFR', 'anatomyInvariantsFR', 'biologicalMandibleCount', 'organicArmCount', 'organicLegCount', 'hereditaryImplants', 'inheritedAmputation', 'armorDesignFR', 'lineageArmorAdaptationFR', 'hardwareCounts', 'orientationFR', 'loreStatus', 'loreNoteFR', 'sex'] if key in details}
    declared.update({key: details[key] for key in ['faceState', 'individualFR', 'loreBoundaryFR'] if key in details})
    if 'identity' in details:
        declared['identity'] = {key: identity[key] for key in ['lifeStage', 'military', 'masked', 'faceState', 'mounted', 'staticSinglePose', 'frameCount', 'regionId', 'regionFR', 'settlementFR', 'endemicToRegion', 'canonStatus', 'canonicalFidelityCertified', 'anatomySummaryFR', 'headAndFitSummaryFR', 'immutableAnatomyEN', 'feetInvariantEN'] if key in identity}
        declared['anatomyDefinition'] = {key: anatomy[key] for key in ['id', 'nameFR', 'kind', 'morphotypeId', 'regionId', 'regionFR', 'villageFR', 'endemicToRegion', 'placementIsOriginal', 'canonStatus', 'anatomyFR', 'anatomyEN', 'cultureFR', 'notesFR'] if key in anatomy}
        declared['outfit'] = {key: outfit[key] for key in ['familyId', 'variant', 'titleFR', 'costumeEN', 'equipmentCounts', 'poseEN', 'distinctiveDesignEN'] if key in outfit}
    return identity, anatomy, outfit, declared


def main():
    config = json.loads((TASK / 'transfer-config.json').read_text(encoding='utf8'))
    expected_ids = set(PACK_IDS + [FOLLOWUP_ID, INDEX_ID])
    if {item['id'] for item in config['sources']} != expected_ids:
        raise ValueError('This importer owns exactly the five refreshed revisions')
    sources, source_paths = {}, {}
    for source in config['sources']:
        revision, clean = read_source(source)
        sources[source['id']], source_paths[source['id']] = clean, revision

    known = {}
    previous_identities = {}
    for filename in BASE_REGISTRIES:
        registry = json.loads((PROJECT / 'app/game/data' / filename).read_text(encoding='utf8'))
        for asset in registry['assets']:
            previous_identities.setdefault(asset.get('identityId', asset['id']), []).append({'id': asset['id'], 'sha256': asset['sha256'], 'src': asset['src']})
            if asset['src'].lower().endswith('.png'):
                native = PROJECT / 'public' / asset['src'].lstrip('/')
                if native.is_file():
                    known.setdefault(asset['sha256'], asset['src'])

    metadata_records, corrections, reader_reports = [], [], []
    composition = json.loads((TASK / 'review/v69-composition-evidence.json').read_text(encoding='utf8'))
    reviewed_by_id = {item['id']: item for item in composition['records']}
    if len(reviewed_by_id) != 72 or not composition['sourceBooleansNeverDefaulted']:
        raise ValueError('Independent composition review must cover every final PNG')
    with zipfile.ZipFile(source_paths[FOLLOWUP_ID]) as followup:
        validate_archive(followup)
        if any(name.lower().endswith('.png') for name in followup.namelist()):
            raise ValueError('The new follow-up revision is documented as metadata only')
        catalog_raw = followup.read('references/DESIGN_CATALOG.json')
        catalog = json.loads(catalog_raw)
        catalog_sha = sha(catalog_raw)
        groups = {item['id']: item for item in catalog['groupCoverage']}
        for member in followup.namelist():
            if member.endswith('REPAIR_INDEX.json'):
                raw = followup.read(member)
                record = json.loads(raw)
                previous_src = known.get(record['supersededSha256'])
                previous_available = bool(previous_src and sha((PROJECT / 'public' / previous_src.lstrip('/')).read_bytes()) == record['supersededSha256'])
                corrections.append({'identityId': record['id'], 'kind': 'same-identity-final-native-correction',
                    'previousSha256': record['supersededSha256'], 'acceptedSha256': record['correctAcceptedSha256'],
                    'reasonFR': record['reasonFR'], 'repairedAtUTC': record.get('repairedAtUTC'),
                    'previousPixelsIncludedInTheseArchives': False, 'previousIdentityPreserved': True,
                    'previousSourceAvailable': previous_available, 'previousNativePublicSrc': previous_src if previous_available else None,
                    'sourceFileId': FOLLOWUP_ID, 'sourceArchiveSha256': sources[FOLLOWUP_ID]['sha256'],
                    'sourceMember': safe_member(member), 'manifestSha256': sha(raw), 'sourceRecordSha256': record_sha(record)})
        reader_reports.append({'id': FOLLOWUP_ID, 'ok': True, 'pngEntries': 0,
            'jsonEntries': sum(name.endswith('.json') for name in followup.namelist()),
            'scriptsIgnored': sum(name.endswith('.py') for name in followup.namelist()),
            'designCatalogMember': 'references/DESIGN_CATALOG.json', 'designCatalogSha256': catalog_sha})

    assets, packs, native_proof = [], [], []
    distinct_new, already_present = {}, {}
    for identifier in PACK_IDS:
        source = sources[identifier]
        with zipfile.ZipFile(source_paths[identifier]) as pack:
            validate_archive(pack)
            manifest_raw = pack.read('MANIFEST.json')
            manifest = json.loads(manifest_raw)
            rows = manifest['files']
            png_members = {name for name in pack.namelist() if name.lower().endswith('.png')}
            if manifest['newNativePngCount'] != 24 or len(rows) != 24 or png_members != {row['path'] for row in rows} or set(manifest['ids']) != {row['id'] for row in rows}:
                raise ValueError('Native pack inventory differs')
            pack_id = 'bastions-command-v69-' + manifest['pack'].lower()
            pack_label = 'Bastions et commandement · V6.9 ' + manifest['pack']
            for row in rows:
                member = safe_member(row['path'])
                content = pack.read(member)
                digest = sha(content)
                if digest != row['sha256'] or len(content) != row['bytes'] or content[:8] != b'\x89PNG\r\n\x1a\n' or list(struct.unpack('>II', content[16:24])) != row['dimensions']:
                    raise ValueError('Native PNG differs from source manifest')
                metadata_member = safe_member(row['metadataPath'])
                metadata_raw = pack.read(metadata_member)
                metadata = json.loads(metadata_raw)
                brief_member = 'work/briefs/' + row['id'] + '.json'
                brief_raw = pack.read(brief_member)
                brief = json.loads(brief_raw)
                details = brief['designRecord']['briefDetails']
                identity_details, anatomy_details, outfit_details, declared = identity_semantics(details)
                if metadata['id'] != row['id'] or metadata['sha256'] != digest or metadata['bytes'] != len(content) or metadata['dimensions'] != row['dimensions'] or metadata['relativeAssetPath'] != member or metadata['briefSha256'] != sha(brief_raw) or metadata['sourceCatalogSha256'] != catalog_sha:
                    raise ValueError('Final native metadata or exact historical brief differs')
                if not metadata.get('visualReview', {}).get('accepted') or metadata.get('canonicalOneToOneCertified') is not False or not identity_details['lifeStage'].startswith('adult') or identity_details.get('mounted') is True or not manifest.get('independentSprites'):
                    raise ValueError('Do not convert unfinished, canonical-certified or mounted records to individual NPCs')
                if metadata['groupId'] != brief['groupId'] or metadata['familyId'] != brief['familyId'] or metadata['variant'] != brief['variant'] or row['id'] != brief['id']:
                    raise ValueError('Native identity, group or role has changed')
                facts = alpha_facts(content)
                observed = reviewed_by_id[row['id']]
                if observed['nativeSha256'] != digest or observed['metadataSha256'] != sha(metadata_raw) or observed['briefSha256'] != sha(brief_raw) or observed['sourceDeclaredLifeStage'] != identity_details['lifeStage'] or observed['actualPngFrameCount'] != 1 or observed['actualPngAnimated'] or not observed['visibleCompositionReview']['singleIndividual'] or observed['visibleCompositionReview']['visibleMounted']:
                    raise ValueError('Independent composition review differs from exact native source')
                if metadata['alphaExtrema'] != facts['extrema'] or metadata['significantAlphaBBox'] != facts['bbox'] or metadata['mode'] != facts['mode']:
                    raise ValueError('Native alpha facts differ')
                src = known.get(digest)
                if src is not None:
                    original = PROJECT / 'public' / src.lstrip('/')
                    if original.read_bytes() != content:
                        raise ValueError('A matching registry hash lacks exact matching native bytes')
                    already_present[digest] = src
                else:
                    src = '/game/imports/v87/new-deposits/' + digest + '.png'
                    preserve(PUBLIC / (digest + '.png'), content)
                    distinct_new[digest] = len(content)
                    known[digest] = src
                group = groups[metadata['groupId']]
                limits = []
                for value in [manifest.get('sourceBoundaryFR'), metadata.get('sourceBoundaryFR'), metadata.get('referenceScopeFR'), metadata.get('visualReview', {}).get('limitationsFR'), details.get('canonicalStatusFR'), details.get('canonicalBoundaryFR'), details.get('loreNoteFR'), details.get('loreBoundaryFR'), identity_details.get('canonStatus'), anatomy_details.get('notesFR')]:
                    add_strings(limits, value)
                asset_corrections = [item for item in corrections if item['identityId'] == row['id']]
                for correction in asset_corrections:
                    add_strings(limits, correction['reasonFR'])
                    if not correction['previousSourceAvailable']:
                        add_strings(limits, 'Ancienne sortie signalée par son empreinte dans l’historique source ; ses pixels ne sont pas disponibles dans ce lot ni importés localement.')
                if min(facts['marginsLTRB']) < 80:
                    add_strings(limits, 'Contrôle local des pixels : la cible de marge transparente de 80 px n’est pas atteinte sur tous les côtés. Afficher la silhouette entière sans découpe, avec contain et espacement.')
                if metadata['groupId'] == 'bionic' and 'comic' in json.dumps(declared, ensure_ascii=False).lower():
                    add_strings(limits, 'Réserve d’intégration : la fiche Bionic conserve une mention de tenue issue du comic alors que cette faction a une origine PHG. Cette mention source n’établit aucune correspondance canonique de costume.')
                history = clean_history(metadata)
                metadata_id = 'v69-native-' + sha(metadata_raw)
                inspection = metadata['visualReview'].get('inspectionFR', '')
                note_values = []
                for value in [details.get('roleDescriptionFR') or outfit_details.get('titleFR'), details.get('loadoutCheckFR') or outfit_details.get('costumeEN'), details.get('lineageAnatomyFR') or identity_details.get('anatomySummaryFR') or details.get('morphologyFR') or details.get('anatomyInvariantsFR')]:
                    add_strings(note_values, value)
                if details.get('individualFR'):
                    add_strings(note_values, details['individualFR'])
                note = ' | '.join(note_values) or inspection
                source_masked = str(identity_details['masked']).lower() if 'masked' in identity_details else {'masked': 'true', 'unmasked': 'false'}.get(identity_details.get('faceState'), '')
                if source_masked != str(observed['sourceDeclaredMasked']).lower() or identity_details.get('mounted') != observed['sourceDeclaredMounted']:
                    raise ValueError('Mask or mount source declaration differs')
                identity = row['id']
                asset = {'id': 'drive-new-deposits-v87:' + pack_id + ':' + identity + ':' + digest[:12],
                    'identityId': identity, 'label': metadata['roleFR'] + ' — ' + group['nameFR'],
                    'packId': pack_id, 'packLabel': pack_label, 'version': 'V6.9', 'priority': 69, 'preferredVersion': True,
                    'kind': 'npc', 'groupId': group['id'], 'groupLabel': group['nameFR'], 'role': metadata['familyId'],
                    'roleLabel': metadata['familyId'] + ' · ' + metadata['roleFR'], 'lifeStage': identity_details['lifeStage'],
                    'regionId': identity_details.get('regionId') or group.get('regionId') or '', 'morphotypeId': anatomy_details.get('morphotypeId') or group['id'],
                    'masked': source_masked, 'src': src, 'width': row['dimensions'][0], 'height': row['dimensions'][1],
                    'bytes': len(content), 'sha256': digest, 'sourceArchive': source['title'], 'insideArchive': None, 'sourcePath': member,
                    'sourceStatus': 'native-bytes-imported-unverified', 'producerStatus': 'producer-visually-accepted',
                    'pose': 'Individu adulte · pose native unique', 'motionStatus': 'single-pose-static', 'canonicalFidelity': 'not-certified-1-to-1',
                    'sourceNote': note, 'supersedesIdentityId': '', 'supersededByIdentityId': '',
                    'sourceDriveId': identifier, 'sourceDriveUrl': source['url'], 'alphaFacts': facts,
                    'animationAvailable': False, 'bodyComposition': 'single-individual', 'fullBody': True,
                    'compositionEvidence': 'native-final-manifest-independentSprites-and-accepted-single-character-visual-review',
                    'mountedSource': identity_details.get('mounted'),
                    'visibleMounted': False, 'actualPngFrameCount': 1,
                    'producerInspection': inspection, 'sourceMetadataPath': metadata_member,
                    'sourceMetadataRefs': [metadata_id], 'sourceLimits': limits[:24], 'sourceLimitsTruncated': len(limits) > 24,
                    'strict1to1Verified': False, 'nativeNature': 'original-adult-individual-static', 'declaredSemantics': declared,
                    'previousRegisteredVersions': previous_identities.get(identity, []),
                    'sourceCorrections': asset_corrections}
                assets.append(asset)
                metadata_records.append({'id': metadata_id, 'identityId': identity, 'sourceFileId': identifier,
                    'sourceArchiveSha256': source['sha256'], 'manifestMember': metadata_member, 'manifestSha256': sha(metadata_raw),
                    'sourceRecordSha256': record_sha(metadata), 'nativeManifestMember': 'MANIFEST.json', 'nativeManifestSha256': sha(manifest_raw),
                    'briefMember': brief_member, 'briefSha256': sha(brief_raw), 'designRecordSha256': record_sha(brief['designRecord']),
                    'designCatalogFileId': FOLLOWUP_ID, 'designCatalogSha256': catalog_sha,
                    'declaredSemantics': declared, 'producerRoleFR': metadata['roleFR'],
                    'producerVisualReview': {key: metadata['visualReview'][key] for key in ['accepted', 'visuallyInspectedNative', 'reviewer', 'inspectionFR', 'limitationsFR', 'briefAmendmentsFR', 'inspectedAt', 'sourceNativeSha256'] if key in metadata['visualReview']},
                    'generationHistory': history, 'briefAmendmentsFR': metadata.get('briefAmendmentsFR', metadata.get('amendmentsFR', [])),
                    'historicalBriefStatus': brief.get('status'), 'historicalBriefIsImage': brief.get('briefIsAnImage'),
                    'nativeAcceptanceOverridesHistoricalPreparedStatus': True,
                    'trust': 'source-author-assertion-not-independent-canon-certification'})
                native_proof.append({'id': asset['id'], 'identityId': identity, 'sha256': digest, 'bytes': len(content),
                    'width': asset['width'], 'height': asset['height'], 'hasAlpha': True, 'publicSrc': src,
                    'fileId': identifier, 'sourceDriveUrl': source['url'], 'sourceArchiveSha256': source['sha256'],
                    'sourceMember': member, 'manifestRecordRefs': [metadata_id],
                    'alreadyPresentExactNativeBytes': digest in already_present})
            reader_reports.append({'id': identifier, 'ok': True, 'pngEntries': len(png_members), 'jsonEntries': sum(name.endswith('.json') for name in pack.namelist()), 'scriptsIgnored': 0, 'manifestSha256': sha(manifest_raw)})
            packs.append({'id': pack_id, 'label': pack_label, 'version': 'V6.9', 'priority': 69, 'archive': source['title'],
                'insideArchive': None, 'sha256': source['sha256'], 'pngEntriesImported': len(rows), 'recordEntries': len(rows),
                'status': 'native-source-import-not-animation-or-canon-certification', 'driveId': identifier})

    if len(assets) != 72 or len({asset['identityId'] for asset in assets}) != 72 or len({asset['sha256'] for asset in assets}) != 72:
        raise ValueError('The 72 final identities and native PNGs must remain distinct')
    if len({asset['groupId'] for asset in assets}) != 18:
        raise ValueError('Source group coverage differs')
    for correction in corrections:
        accepted = next(asset for asset in assets if asset['identityId'] == correction['identityId'])
        if accepted['sha256'] != correction['acceptedSha256']:
            raise ValueError('Explicit corrected final SHA differs')
    index_content = source_paths[INDEX_ID].read_bytes()
    if b'<html' not in index_content.lower():
        raise ValueError('The refreshed index is not an HTML source document')
    reader_reports.append({'id': INDEX_ID, 'ok': True, 'pngEntries': 0, 'htmlExecuted': False})
    prior = json.loads((TASK / 'previous-sources.json').read_text(encoding='utf8'))
    prior_clean = [{key: item[key] for key in ['id', 'bytes', 'sha256']} for item in prior]
    summary = {'nativeSourceRecords': len(assets), 'newDistinctPngFiles': len(distinct_new),
        'newDistinctPngBytes': sum(distinct_new.values()), 'alreadyPresentExactNativePngFiles': len(already_present),
        'sourceArchiveFilesTransferred': 4, 'sourceIndexFilesTransferred': 1,
        'sourceBytesTransferred': sum(source['bytes'] for source in sources.values()), 'groupCount': 18,
        'originalYautjaStaticRecords': sum(asset['groupId'] != 'human-accepted' for asset in assets),
        'acceptedHumanStaticRecords': sum(asset['groupId'] == 'human-accepted' for asset in assets),
        'metadataOnlyFollowupPngFiles': 0, 'explicitSourceCorrectionRecords': len(corrections),
        'recordsWithNativeGenerationHistory': sum(len(item['generationHistory']) > 1 for item in metadata_records),
        'newAnimationSheets': 0, 'certifiedCanon1to1': 0}
    data = {'version': 'V87', 'summary': summary, 'packs': packs, 'sourceCorrections': corrections, 'assets': assets}
    proof = {'version': 'V87', 'scope': 'Three new V6.9 final native PNG packs plus changed follow-up and index, observed 2026-10-07T15:42Z.',
        'sourceReceipts': list(sources.values()), 'previousSourceRevisionsPreserved': prior_clean,
        'previousIndexPixelsOrBytesAvailable': False, 'sourceReaders': reader_reports,
        'metadataRecords': metadata_records, 'nativeProof': native_proof, 'sourceCorrections': corrections,
        'independentCompositionReview': {'reviewedAt': composition['reviewedAt'], 'method': 'independent-agent-visual-review-of-native-png-contact-sheets', 'sourceEvidenceSha256': sha((TASK / 'review/v69-composition-evidence.json').read_bytes()), 'records': [
            {key: item[key] for key in ['id', 'nativeSha256', 'metadataSha256', 'briefSha256', 'sourceDeclaredLifeStage', 'lifeStageSourcePointer', 'sourceDeclaredMounted', 'mountedSourcePointer', 'sourceDeclaredMasked', 'maskedSourcePointer', 'actualPngFrameCount', 'actualPngAnimated']} for item in composition['records']]},
        'summary': summary, 'pixelsModified': False, 'archiveCodeExecuted': False,
        'claims': {'animationSheets': False, 'canon1to1': False, 'namedCanonFighters': False, 'allPlannedV69ContentComplete': False},
        'limits': ['Only the final 72 native PNGs are imported. Prepared briefs and histories without supplied PNG bytes are documentary metadata.',
            'The 18 project populations and roles include original endemic morphologies and extrapolated institutions; lineage references are not universal canon certification.',
            'Four accepted-human characters remain biological humans; they cannot substitute for Yautja bodies.',
            'Previous rejected generation hashes are preserved as source history, without fabricated images or animation frames.',
            'The source catalog retains historical prepared/needed counts. Final manifest and acceptance records prove this batch, not completion of every planned variant.',
            'The previous follow-up archive bytes and receipt were preserved before transfer. The former index was metadata-only locally; no former HTML bytes are invented.']}
    serialized = encoded([data, proof]).decode('utf8')
    if re.search(r'download_url|downloadUrl|file_uri|authfile:|[?&](?:token|signature|sig|x-goog-signature)=|C:\\\\|work-local/v87/downloads|/workspace/', serialized, re.I):
        raise ValueError('Private transport data must stay ignored')
    DATA.write_bytes(encoded(data))
    PROOF.write_bytes(encoded(proof))
    (TASK / 'import-summary.json').write_bytes(encoded(summary))
    print(json.dumps(summary, ensure_ascii=True))


if __name__ == '__main__':
    main()
