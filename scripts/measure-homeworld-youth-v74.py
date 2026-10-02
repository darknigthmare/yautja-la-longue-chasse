"""Measure native OpenAI sources without resizing, cropping or editing any pixel.
The browser selects measured windows; source SHA is retained for release checks.
"""
from pathlib import Path
from PIL import Image
import argparse
import hashlib
import json
import statistics

ROOT = Path(__file__).resolve().parent.parent
PLAN = ROOT / 'work-local/v74/youth-native-final-plan.json'
OUTPUT = ROOT / 'app/game/data/homeworldYouthMotionArtV74.json'
PROMPTS = ROOT / 'docs/v74-youth-native-imagegen-prompts.json'
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--check', action='store_true', help='Compare measurements without modifying the runtime manifest')
parser.add_argument('--from-committed', action='store_true', help='Use committed PNG/prompt provenance, as on a fresh checkout')
args = parser.parse_args()


def measure(entry):
    path = ROOT / entry['destination']
    raw = path.read_bytes()
    if entry.get('source') and Path(entry['source']).is_file():
        original = Path(entry['source']).read_bytes()
        assert raw == original, 'Native generated PNG must be copied without any pixel changes'
    if entry.get('expectedSha256'):
        assert hashlib.sha256(raw).hexdigest() == entry['expectedSha256'], 'Committed native source SHA must match generation provenance'
    im = Image.open(path)
    assert im.mode == 'RGBA', im.mode
    w, h = im.size
    assert w % 3 == 0 and w > 1000 and h > 700
    alpha = im.getchannel('A')
    pixels = alpha.load()
    # Locate the actual transparent horizontal gutter, rather than clipping feet
    # to a theoretical 512px cell when a source drawing extends below that line.
    candidates = range(int(h * .46), int(h * .56))
    split = min(candidates, key=lambda y: (sum(pixels[x, y] > 200 for x in range(w)), abs(y - h / 2)))
    assert sum(pixels[x, split] > 200 for x in range(w)) == 0, 'Rows must not touch'
    frames = []
    for index, (col, row) in enumerate([(0, 0), (1, 0), (2, 0), (0, 1), (1, 1)]):
        cell = (col * (w // 3), 0 if row == 0 else split, (col + 1) * (w // 3), split if row == 0 else h)
        points = [(x, y) for y in range(cell[1], cell[3]) for x in range(cell[0], cell[2]) if pixels[x, y] > 200]
        assert len(points) > 20000, 'A genuine independent full-body figure is required'
        left, top = min(x for x, y in points), min(y for x, y in points)
        right, bottom = max(x for x, y in points), max(y for x, y in points)
        # A native six-pixel antialias margin; no alpha cleanup is performed.
        rleft, rtop = max(cell[0], left - 6), max(cell[1], top - 6)
        rright, rbottom = min(cell[2] - 1, right + 6), min(cell[3] - 1, bottom + 6)
        # The waist sash is a stable anatomical scale reference. Lower-row art
        # may have a smaller native drawing; knee flexion must not scale the head.
        rgba = im.load()
        centre_left, centre_right = int(left + (right - left) * .30), int(left + (right - left) * .70)
        rows = range(int(top + (bottom - top) * .34), int(top + (bottom - top) * .57))
        def sash_pixels(y):
            return [x for x in range(centre_left, centre_right + 1)
                    if rgba[x, y][3] > 200 and rgba[x, y][0] > 95
                    and rgba[x, y][0] > rgba[x, y][1] * 1.65
                    and rgba[x, y][0] > rgba[x, y][2] * 2.25]
        waist_y = max(rows, key=lambda y: (len(sash_pixels(y)), -abs(y - (top + (bottom - top) * .45))))
        sash = sash_pixels(waist_y)
        assert len(sash) >= 15, 'Measured rust sash must be visible'
        # Ground anchor stays below the pelvis rather than jumping to whichever
        # foot happens to contribute more bottom-edge pixels in a stride.
        pivot_x = round(statistics.median(sash) - rleft, 2)
        rect = [rleft, rtop, rright - rleft + 1, rbottom - rtop + 1]
        local_alpha = {'x': left - rleft, 'y': top - rtop, 'width': right - left + 1, 'height': bottom - top + 1}
        frames.append({'id': 'idle' if index == 0 else 'walk-' + str(index - 1), 'rect': rect,
                       'alphaBounds': local_alpha, 'pivot': [pivot_x, bottom - rtop],
                       'upperBodyHeight': waist_y - top, 'waistY': waist_y - rtop,
                       'durationTicks': 45 if index == 0 else 9,
                       'nativeWindowSha256': hashlib.sha256(im.crop((rleft, rtop, rright + 1, rbottom + 1)).tobytes()).hexdigest()})
    histogram = alpha.histogram()
    transparent = histogram[0] / (w * h)
    assert transparent > .65, 'Native transparent gutters, not an opaque painted rectangle'
    # Idle body height controls the common scale; walk drawings are not stretched
    # individually. Every planted foot pivot lands at the actor ground anchor.
    body_height = frames[0]['alphaBounds']['height']
    return {'src': '/' + entry['destination'].removeprefix('public/'), 'sourceWidth': w, 'sourceHeight': h,
            'sha256': hashlib.sha256(raw).hexdigest(), 'nativePixelCopy': True,
            'alphaThreshold': 200, 'transparentPixelRatio': transparent,
            'rowSplit': split, 'bodyHeight': body_height, 'frames': frames}


if PLAN.is_file() and not args.from_committed:
    plan = json.loads(PLAN.read_text(encoding='utf-8'))
    copy_proof = 'local-original-generated-file-byte-equality'
else:
    provenance = json.loads(PROMPTS.read_text(encoding='utf-8'))
    entries = [{'id': a['id'], 'direction': a['direction'], 'destination': a['path'], 'expectedSha256': a['sha256']} for a in provenance['assets']]
    plan = {'entries': [a for a in entries if not a['id'].endswith('-opposite')],
            'edits': [a for a in entries if a['id'].endswith('-opposite')],
            'passingOppositeFromEdit': provenance['passingOppositeFromEdit']}
    copy_proof = 'committed-source-sha-matches-generation-provenance-original-file-not-reopened'
sources = {e['id']: measure(e) for e in plan['entries'] + plan['edits']}
actors = {}
for entry in plan['entries']:
    direction = entry['direction']
    original, opposite = sources[direction], sources[direction + '-opposite']
    selected = [(direction, original['frames'][0]), (direction, original['frames'][1]),
                (direction, original['frames'][2]), (direction + '-opposite', opposite['frames'][3]),
                (direction + '-opposite', opposite['frames'][4]) if direction in plan['passingOppositeFromEdit'] else (direction, original['frames'][4])]
    reference_upper_body = original['frames'][0]['upperBodyHeight']
    frames = []
    for source_id, frame in selected:
        measured_height = round(frame['upperBodyHeight'] * original['bodyHeight'] / reference_upper_body, 4)
        assert abs(measured_height / frame['alphaBounds']['height'] - 1) < .20, 'Reject inconsistent body proportions'
        frames.append({**frame, 'sourceId': source_id, 'bodyHeight': measured_height})
    actors[direction] = {'idle': frames[0], 'walk': frames[1:], 'bodyHeight': original['bodyHeight'], 'referenceUpperBodyHeight': reference_upper_body}
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
measured = {'version': 74, 'provenance': 'builtin-openai-imagegen/native-unmodified-png', 'sources': sources, 'actors': actors}
if args.check:
    assert measured == json.loads(OUTPUT.read_text(encoding='utf-8')), 'Measurements must equal the frozen runtime manifest'
    print(json.dumps({'status': 'PASS', 'sources': len(sources), 'selectedPoses': len(actors) * 5, 'copyProof': copy_proof, 'runtimeManifestModified': False}))
else:
    OUTPUT.write_text(json.dumps(measured, indent=2) + '\n', encoding='utf-8')
print(json.dumps({d: {'height': a['bodyHeight'], 'upperBodyHeight': a['referenceUpperBodyHeight'], 'walkHeightRatios': [round(f['bodyHeight'] / f['alphaBounds']['height'], 3) for f in a['walk']], 'selected': [f['sourceId'] for f in a['walk']]} for d, a in actors.items()}, indent=2))
