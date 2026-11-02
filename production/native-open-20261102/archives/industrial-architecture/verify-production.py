"""Read-only checks for17 archived original image candidates; no admission gate."""
from pathlib import Path
import hashlib
import json
from PIL import Image

BASE = Path(__file__).resolve().parent
EXPECTED = {'target-v81-' + suffix for suffix in [
    '55-26', '55-42', '55-43', '56-56', '59-105', '65-175', '66-192',
    '68-236', '73-295', '73-301', '73-308', '74-310', '74-311',
    '74-315', '74-316', '74-319', '76-354']}

def sha(data):
    return hashlib.sha256(data).hexdigest()

def verify_pin(pin):
    path = Path(pin['path'])
    data = path.read_bytes()
    assert len(data) == pin['bytes'], str(path)
    assert sha(data) == pin['sha256'], str(path)
    return path

manifest_path = BASE / 'industrial-architecture-production-manifest.json'
manifest = json.loads(manifest_path.read_text())
assert set(manifest['allocation']) == EXPECTED
assert len(manifest['entries']) == 17
assert {entry['targetId'] for entry in manifest['entries']} == EXPECTED
assert manifest['repositoryMutated'] is False
assert manifest['gitUsed'] is False
assert manifest['workbookMutated'] is False
verify_pin(manifest['historicalSourceAudit'])
verify_pin(manifest['targetReferenceMap'])
for item in manifest['guide']['files']:
    verify_pin(item)

images = []
originals = []
receipts = []
for entry in manifest['entries']:
    target = entry['targetId']
    assert entry['status'] == 'CANDIDAT_NON_ADMIS', target
    for field in ['technicalAdmission', 'runtimeIntegrated', 'runtimeTested',
                  'humanValidated', 'sourceClosed', 'pixelsEdited']:
        assert entry[field] is False, (target, field)
    assert entry['attempts'] == entry['candidateVariants'] == 1
    candidate = verify_pin(entry['candidate'])
    receipt_path = verify_pin(entry['receipt'])
    receipt = json.loads(receipt_path.read_text())
    assert receipt['targetId'] == target
    assert receipt['parameters']['transparent_background'] is True
    assert receipt['tool'] == 'image_gen.imagegen'
    assert receipt['prompt'] and receipt['referencesOpened']
    assert receipt['status'] == 'CANDIDAT_NON_ADMIS'
    assert receipt['retryUsed'] is False
    assert receipt['sourceClosureClaimed'] is False
    assert receipt['visualAssessment']['status'] != 'PENDING_INDIVIDUAL_VIEW'
    original = Path(receipt['nativeSourcePath'])
    raw = candidate.read_bytes()
    assert raw == original.read_bytes(), target
    assert sha(raw) == entry['nativeOriginalSha256'], target
    assert raw[:8] == b'\x89PNG\r\n\x1a\n', target
    inspection = receipt['inspection']
    assert inspection['nativeByteExactCopy'] is True
    assert inspection['status'] == 'CANDIDAT_NON_ADMIS'
    assert inspection['sha256'] == sha(raw)
    assert inspection['bytes'] == len(raw)
    assert inspection['dimensions'] == entry['dimensions']
    with Image.open(candidate) as image:
        assert image.mode == 'RGBA', target
        assert list(image.size) == entry['dimensions'], target
        alpha = image.getchannel('A')
        histogram = alpha.histogram()
        assert list(alpha.getextrema()) == inspection['alphaExtrema']
        assert inspection['alphaExtrema'][0] == 0 and inspection['alphaExtrema'][1] > 8
        assert histogram[0] == inspection['transparentPixels']
        assert sum(histogram[1:3]) == inspection['alpha1or2Pixels']
        assert sum(histogram[1:9]) == inspection['alpha1to8Pixels']
        width, height = image.size
        for threshold in [0, 2, 8]:
            box = alpha.point(lambda value: 255 if value > threshold else 0).getbbox()
            assert box
            edge = sum(alpha.getpixel((x, 0)) > threshold for x in range(width))
            edge += sum(alpha.getpixel((x, height-1)) > threshold for x in range(width))
            edge += sum(alpha.getpixel((0, y)) > threshold for y in range(1, height-1))
            edge += sum(alpha.getpixel((width-1, y)) > threshold for y in range(1, height-1))
            actual = {'bboxExclusive': list(box),
                      'margins': [box[0], box[1], width-box[2], height-box[3]],
                      'visiblePixels': sum(histogram[threshold+1:]),
                      'edgeVisiblePixels': edge}
            assert actual == inspection['thresholdMeasurements'][str(threshold)], (target, threshold)
            assert actual == entry['thresholdMeasurements'][str(threshold)]
        assert entry['strict48pxAlphaGt0MarginPass'] == (min(entry['thresholdMeasurements']['0']['margins']) >= 48)
        assert entry['diagnostic48pxAlphaGt8MarginPass'] == (min(entry['thresholdMeasurements']['8']['margins']) >= 48)
    assert entry['frame']['rect'] == [0, 0, *entry['dimensions']]
    assert entry['frame']['frameCount'] == 1
    images.append(candidate)
    originals.append(original)
    receipts.append(receipt_path)

assert len(set(images)) == len(set(originals)) == len(set(receipts)) == 17
assert len({sha(path.read_bytes()) for path in images}) == 17
assert set(BASE.glob('*-native.png')) == set(images)
assert set((BASE/'receipts').glob('*.json')) == set(receipts)
totals = manifest['totals']
assert totals['strictAlphaGt0MarginPass'] == 0
assert totals['strictAlphaGt0MarginFail'] == 17
assert totals['diagnosticAlphaGt8MarginPass'] == 14
assert totals['diagnosticAlphaGt8MarginFail'] == 3
assert totals['imagesWithAlphaGt0BorderPixels'] == 13
assert totals['imagesWithAlphaGt2BorderPixels'] == 0
assert totals['imagesWithAlphaGt8BorderPixels'] == 0
assert totals['globalRequirementsRemainOpen'] == 56
assert totals['globalArtTargetsRemainOpen'] == 354
assert totals['sourceClosures'] == totals['runtimeIntegrations'] == totals['humanValidated'] == 0

reference_matches = []
for item in manifest['referencePins']:
    assert item['context'] == 'SNAPSHOT_HISTORIQUE_VISUAL_REFERENCE'
    path = Path(item['path'])
    reference_matches.append(path.exists() and sha(path.read_bytes()) == item['sha256'])
# Historical input drift is reported explicitly; it never silently updates a pin.
inventory_path = BASE / 'industrial-architecture-artifact-inventory.json'
inventory = json.loads(inventory_path.read_text())
assert inventory['excludedSelf'] == str(inventory_path)
assert {Path(item['path']) for item in inventory['files']} == {
    path for path in BASE.rglob('*') if path.is_file() and path != inventory_path}
for item in inventory['files']:
    verify_pin(item)
print(json.dumps({
    'status': 'PASS_INTEGRITY_NOT_ADMISSION', 'targets': 17,
    'originalsAndCopiesByteIdentical': 17, 'alphaMeasurementsRecomputed': 51,
    'strictAlphaGt0MarginFailures': 17, 'diagnosticAlphaGt8MarginFailures': 3,
    'historicalReferencePinsMatchCurrentBytes': sum(reference_matches),
    'historicalReferencePinsTotal': len(reference_matches),
    'artifactFilesVerified': len(inventory['files']),
    'manifestSha256': sha(manifest_path.read_bytes()),
    'inventorySha256': sha(inventory_path.read_bytes()),
    'technicalAdmissions': 0, 'humanValidated': 0,
    'repositoryWrites': 0, 'pixelWrites': 0,
}, ensure_ascii=False, indent=2))
