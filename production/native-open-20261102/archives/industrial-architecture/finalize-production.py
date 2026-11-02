"""Assemble production metadata, never generate or modify any image pixels."""
from pathlib import Path
import hashlib
import json

BASE = Path(__file__).resolve().parent
ROOT = Path('/workspace/yautja-la-longue-chasse')
AUDIT = BASE / 'sources' / 'art-gap-manifest.json'
ORIGINAL_AUDIT = Path('/workspace/open-workstreams-production-20261102/art-gap-manifest.json')
IDS = ['target-v81-' + suffix for suffix in [
    '55-26', '55-42', '55-43', '56-56', '59-105', '65-175', '66-192',
    '68-236', '73-295', '73-301', '73-308', '74-310', '74-311',
    '74-315', '74-316', '74-319', '76-354']]

def pin(path):
    path = Path(path)
    value = path.read_bytes()
    return {'path': str(path), 'bytes': len(value),
            'sha256': hashlib.sha256(value).hexdigest()}

def write(path, value):
    Path(path).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')

audit = json.loads(AUDIT.read_text())
by_id = {entry['id']: entry for entry in audit['entries']}
notes = {
    '55-26': ['Wall-mounted balcony only: attach by its rear deck edge; image bbox bottom-center is not the wall attachment pivot.', 'Deck/corbels are visible, but structural support, railing collision, usable standing space and access have not been qualified.'],
    '55-42': ['Covered corridor body, front floor and extra side opening are visible; a straight-through rear exit is not visually established.', 'No traversable route, bidirectional clearance, front/back layer split or navigation is proved.'],
    '55-43': ['One thick independent entrance arch with an alpha opening, not a full tunnel body.', 'Actual Yautja clearance, threshold pivot, occlusion and travel in both directions remain unqualified.'],
    '56-56': ['One static front-open/rear-closed airlock chamber only; no authored door cycle, pressure/interlock sequence or collision is supplied.'],
    '59-105': ['One complete empty hangar building candidate only; dark interior pixels do not establish an enterable room or gameplay.', 'Strong-alpha side margins45/26px fail the48px diagnostic.'],
    '65-175': ['Invented original monumental totem, not a canonical screen-derived prop.', 'Strong-alpha top/bottom margins21px fail the48px diagnostic; silhouette is visible and not cropped.'],
    '66-192': ['Independent empty wall fixture, not the existing V17 handheld trophy-hook reward.', 'No trophy hanging, load/support or wall attachment pivot is established.'],
    '68-236': ['Closed hatch state only; no open state, animation, underside, underground route or passage collision.'],
    '73-295': ['One attached-clamp exposed pipe section, not a constructed network.', 'Wall attachment plane, pivot and pipe connectivity are untested.'],
    '73-301': ['One connected scrap heap candidate; no salvage, pickup or material economy interaction.'],
    '73-308': ['One static scaffold module with two levels and integral ladder; no climbable/collision, structural or safety qualification.'],
    '74-310': ['Static generator candidate only, no native active/idle cycle or simulation; strong-alpha right margin41px fails the48px diagnostic.'],
    '74-311': ['Static transformer candidate only; no energy state, electrical network or authored temporal cycle.'],
    '74-315': ['Static radiator candidate only; no heat/steam state or authored cooling cycle.'],
    '74-316': ['New original Homeworld pump candidate; an older native six-state Pit pump atlas already exists in another context and is not called globally absent.', 'No pumping cycle, liquid flow, connection or gameplay is established.'],
    '74-319': ['New original independent valve candidate; a painted cistern tap and older Pit cooling-valve imagery were visually checked as related context.', 'No open/closed pair, wheel animation, fluid state or gameplay is established.'],
    '76-354': ['Source plural alcôves is represented by ONE candidate niche module, not a set of variants or a finished palace interior.', 'Wall placement, reference-character scale, approach and floor support remain unqualified.'],
}

entries = []
reference_paths = set()
for target in IDS:
    receipt_path = BASE / 'receipts' / (target + '-attempt01.json')
    receipt = json.loads(receipt_path.read_text())
    source = by_id[target]
    image = Path(receipt['candidatePath'])
    original = Path(receipt['nativeSourcePath'])
    assert image.read_bytes() == original.read_bytes(), target
    assert receipt['inspection']['sha256'] == pin(image)['sha256'], target
    assert receipt['prompt'] and receipt['parameters']['transparent_background'] is True
    assert receipt['visualAssessment']['status'] != 'PENDING_INDIVIDUAL_VIEW', target
    receipt.update({
        'status': 'CANDIDAT_NON_ADMIS', 'runtimeIntegrated': False,
        'sourceClosureClaimed': False, 'humanValidated': False, 'pixelsEdited': False,
        'sourceLocators': source['sourceLocators'],
        'sourceLocatorContext': 'SNAPSHOT_HISTORIQUE: dated source audit 2026-11-02; historical V111/V112 cells are unchanged by this production.',
        'requiredCriteriaIds': source['requiredCriteriaIds'],
        'targetSpecificLimits': notes[target.removeprefix('target-v81-')],
        'frame': {'rect': [0, 0, *receipt['inspection']['dimensions']],
                  'grid': [1, 1], 'frameCount': 1, 'wholeNativeCanvasRetained': True},
        'referenceUse': 'Previously opened real project PNGs informed the textual brief. No source image was supplied as conditioning and no source pixels were extracted.',
        'retryUsed': False,
        'retryDecision': 'No retry: no actual clipping or repeated-object grid observed. Padding failures and faint alpha noise remain explicit, never cleaned or force-admitted.',
    })
    if target in ('target-v81-55-42', 'target-v81-55-43'):
        receipt['independentParentReview'] = {
            'nativeCopyActuallyOpened': True,
            'status': 'ASSISTANT_REVIEW_ONLY_NOT_HUMAN_APPROVAL',
            'notes': notes[target.removeprefix('target-v81-')],
        }
    for ref in receipt.get('referencesOpened', []):
        ref_path = ref.get('path') if isinstance(ref, dict) else ref
        path = Path(ref_path)
        if not path.is_absolute():
            path = ROOT / path
        assert path.exists(), str(path)
        reference_paths.add(str(path))
    write(receipt_path, receipt)
    entries.append({
        'targetId': target, 'label': source['label'], 'section': source['section'],
        'family': receipt['family'],
        'historicalV111Status': source['historicalV111Status'],
        'historicalV112ArtStatus': source['statusV112'],
        'preProductionDisposition': source['currentReadOnlyDisposition'],
        'preProductionMeaning': source['interpretation'],
        'sourceLocators': source['sourceLocators'],
        'requiredCriteriaIds': source['requiredCriteriaIds'],
        'receipt': pin(receipt_path), 'candidate': pin(image),
        'dimensions': receipt['inspection']['dimensions'], 'mode': 'RGBA',
        'nativeOriginalSha256': pin(original)['sha256'],
        'frame': receipt['frame'], 'attempts': 1, 'candidateVariants': 1,
        'strict48pxAlphaGt0MarginPass': receipt['inspection']['strict48pxAlphaGt0MarginPass'],
        'diagnostic48pxAlphaGt8MarginPass': receipt['inspection']['diagnostic48pxAlphaGt8MarginPass'],
        'thresholdMeasurements': receipt['inspection']['thresholdMeasurements'],
        'proposedDiagnosticAnchor': receipt['inspection']['diagnosticImageAnchor'],
        'targetSpecificLimits': receipt['targetSpecificLimits'],
        'status': 'CANDIDAT_NON_ADMIS', 'nativeGenerated': True,
        'byteExactNativeCopy': True, 'assistantVisualInspection': True,
        'technicalAdmission': False, 'runtimeIntegrated': False,
        'runtimeTested': False, 'humanValidated': False, 'sourceClosed': False,
        'pixelsEdited': False,
    })

totals = {
    'allocatedTargets': len(IDS), 'generatedTargets': len(entries),
    'originalNativePngs': len(entries), 'candidatePngs': len(entries),
    'candidateVariantsPerTarget': 1, 'retries': 0, 'rejectedAttempts': 0,
    'strictAlphaGt0MarginPass': sum(e['strict48pxAlphaGt0MarginPass'] for e in entries),
    'strictAlphaGt0MarginFail': sum(not e['strict48pxAlphaGt0MarginPass'] for e in entries),
    'diagnosticAlphaGt8MarginPass': sum(e['diagnostic48pxAlphaGt8MarginPass'] for e in entries),
    'diagnosticAlphaGt8MarginFail': sum(not e['diagnostic48pxAlphaGt8MarginPass'] for e in entries),
    'imagesWithAlphaGt0BorderPixels': sum(e['thresholdMeasurements']['0']['edgeVisiblePixels'] > 0 for e in entries),
    'imagesWithAlphaGt2BorderPixels': sum(e['thresholdMeasurements']['2']['edgeVisiblePixels'] > 0 for e in entries),
    'imagesWithAlphaGt8BorderPixels': sum(e['thresholdMeasurements']['8']['edgeVisiblePixels'] > 0 for e in entries),
    'technicalAdmissions': 0, 'runtimeIntegrations': 0, 'humanValidated': 0,
    'sourceClosures': 0, 'globalRequirementsRemainOpen': 56,
    'globalArtTargetsRemainOpen': 354,
}
manifest = {
    'schemaVersion': 1, 'asOf': '2026-11-02',
    'scope': '17 allocated Homeworld industrial/architecture/urban targets; native original production only, outside repository. Not a closure of all354 catalogue targets or the56 global requirements.',
    'allocation': IDS, 'repositoryMutated': False, 'gitUsed': False,
    'workbookMutated': False, 'priorFrozenProductsMutated': False,
    'status': 'CANDIDATS_NON_ADMIS', 'totals': totals,
    'productionMethod': {
        'tool': 'image_gen.imagegen', 'transparentBackground': True,
        'originalGenerationOneObjectPerId': True,
        'referenceImageConditioning': False,
        'referenceUse': 'Actually opened source PNGs, then concrete textual style brief. No pixels from references were cropped, copied into an output, mirrored, recolored, rescaled or otherwise transformed.',
        'heroTarget': 'target-v81-74-310',
        'heroApprovalScope': 'Assistant selected this candidate as direction for the family. No human validation or in-game approval.',
        'style': 'Angular near-black basalt/gunmetal, worn antique bronze, sparse amber recesses, warm top-left light, whole-object orthographic front/right three-quarter sprites. Tunnels use32degree elevation; other objects roughly25–30degrees. No claim of identical calibrated projection.',
        'canvas': 'Actual tool-native dimensions are retained per entry; no assumed uniform resolution. All original PNG bytes preserved.',
        'qualityGate': 'Thresholds2/8 are alpha-noise diagnostics only. Strict48px alpha>0 padding fails17/17 and no admission is inferred from the friendlier threshold.',
        'retryPolicy': 'At most one retry for a genuine visual defect/grid was allowed; none used. No retries for faint alpha speckle or padding alone.',
    },
    'historicalSourceAudit': {**pin(AUDIT), 'originalPath': str(ORIGINAL_AUDIT), 'context': 'SNAPSHOT_HISTORIQUE',
        'meaning': audit['filePresenceSemantics']['meaning'],
        'scope': audit['scope'],
        'historicalFollowupUnchanged': True},
    'guide': {
        'url': 'https://raw.githubusercontent.com/gamedev-skills/awesome-gamedev-agent-skills/19d93f97c9c1ea0f8b306e77aa81e0d3e352d3e9/skills/disciplines/create-game-assets/SKILL.md',
        'commit': '19d93f97c9c1ea0f8b306e77aa81e0d3e352d3e9',
        'files': [pin(p) for p in sorted((BASE/'guides').glob('*')) if p.is_file()],
        'normalization': 'No pixel normalization: explicit parent/user instruction preserves untouched native outputs. The guide requirement for context review is still open.',
    },
    'referencePins': [{**pin(p), 'context': 'SNAPSHOT_HISTORIQUE_VISUAL_REFERENCE',
                       'humanAdmissionImplied': False} for p in sorted(reference_paths)],
    'targetReferenceMap': pin(BASE/'target-reference-map.json'),
    'admissionCriteriaStillRequired': audit['admissionCriteria'],
    'entries': entries, 'rejectedRawAttempts': [],
    'limits': [
        'All17 strict alpha>0 margin checks fail. Low-alpha border noise remains in13 candidates; no pixels are cleaned, cropped or repadded.',
        'A static PNG does not satisfy authored animation, energy cycles, interlocks, interactions, rendering layers, routes or gameplay.',
        'Pivots are proposed image-bbox anchors only, not verified ground contacts; wall-mounted modules require attachment pivots.',
        'No scale screenshot with reference Yautja, district placement, collision envelope, access/exit or native-view distance qualification is included.',
        'One candidate variant per exact target ID, not20 native variants and not the ideal4–8 variants for common props.',
        'No target is marked human validated or globally closed. Existing Pit pump/valve context and V17 handheld trophy hook are not mislabeled as globally absent.',
        'Historical source refs/cells are dated locators; subsequent runtime evolution must not silently rewrite this record.',
    ],
}
write(BASE/'industrial-architecture-production-manifest.json', manifest)
print(json.dumps(totals, ensure_ascii=False))
