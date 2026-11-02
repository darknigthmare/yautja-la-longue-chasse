"""Copy original PNG bytes and inspect alpha; never write transformed pixels."""
from pathlib import Path
import hashlib
import json
import shutil
import sys
from PIL import Image

receipt_path = Path(sys.argv[1])
receipt = json.loads(receipt_path.read_text())
source = Path(receipt['nativeSourcePath'])
destination = Path(receipt['candidatePath'])
destination.parent.mkdir(parents=True, exist_ok=True)
shutil.copyfile(source, destination)
original = source.read_bytes()
assert destination.read_bytes() == original
assert original[:8] == b'\x89PNG\r\n\x1a\n'
with Image.open(destination) as picture:
    assert picture.mode == 'RGBA', picture.mode
    alpha = picture.getchannel('A')
    histogram = alpha.histogram()
    width, height = picture.size
    thresholds = {}
    for threshold in [0, 2, 8]:
        mask = alpha.point(lambda value: 255 if value > threshold else 0)
        box = mask.getbbox()
        assert box, 'Empty native candidate'
        edge = sum(alpha.getpixel((x, 0)) > threshold for x in range(width))
        edge += sum(alpha.getpixel((x, height-1)) > threshold for x in range(width))
        edge += sum(alpha.getpixel((0, y)) > threshold for y in range(1, height-1))
        edge += sum(alpha.getpixel((width-1, y)) > threshold for y in range(1, height-1))
        thresholds[str(threshold)] = {'bboxExclusive': list(box),
            'margins': [box[0], box[1], width-box[2], height-box[3]],
            'visiblePixels': sum(histogram[threshold+1:]), 'edgeVisiblePixels': edge}
    box = thresholds['8']['bboxExclusive']
    inspection = {'targetId': receipt['targetId'], 'attempt': receipt['attempt'],
        'path': str(destination), 'nativeSourcePath': str(source),
        'bytes': len(original), 'sha256': hashlib.sha256(original).hexdigest(),
        'mode': picture.mode, 'dimensions': [width,height],
        'alphaExtrema': list(alpha.getextrema()), 'transparentPixels': histogram[0],
        'alpha1or2Pixels': sum(histogram[1:3]), 'alpha1to8Pixels': sum(histogram[1:9]),
        'thresholdMeasurements': thresholds,
        'strict48pxAlphaGt0MarginPass': min(thresholds['0']['margins']) >= 48,
        'diagnostic48pxAlphaGt8MarginPass': min(thresholds['8']['margins']) >= 48,
        'diagnosticImageAnchor': {'x': round((box[0]+box[2]-1)/2), 'y': box[3]-1,
            'status': 'PROPOSED_BBOX_ANCHOR_NOT_RUNTIME_TESTED',
            'rule': 'Bottom-center alpha>8 enclosure. A wall-mounted object still needs an attachment pivot; this is not physical ground-contact proof.'},
        'nativeByteExactCopy': True, 'pixelsEdited': False, 'runtimeIntegrated': False,
        'humanValidated': False, 'status': 'CANDIDAT_NON_ADMIS',
        'limits': ['All original canvas and pixels retained; no crop,resize,mirror,cleanup or compression.',
                   'Alpha thresholds2/8 are diagnostics and never replace the strict alpha>0 measurement.',
                   'Low alpha counts include antialiasing; border speckle and clipping need individual visual interpretation.',
                   'No in-game scale,collision,usage envelope,animation or artistic admission is established.']}
receipt['inspection'] = inspection
receipt_path.write_text(json.dumps(receipt, ensure_ascii=False, indent=2)+'\n')
print(json.dumps({'targetId':receipt['targetId'],'path':str(destination),
    'dimensions':inspection['dimensions'],'sha256':inspection['sha256'],
    'marginsAlpha0':thresholds['0']['margins'],'marginsAlpha8':thresholds['8']['margins'],
    'edgeAlpha0':thresholds['0']['edgeVisiblePixels'],'edgeAlpha8':thresholds['8']['edgeVisiblePixels'],
    'status':inspection['status']}, ensure_ascii=False))
