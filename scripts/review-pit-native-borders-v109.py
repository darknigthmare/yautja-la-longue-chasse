"""Read native PNG alpha only. Never rewrite a PNG, filter pixels or edit UVs.

Find the minimal expanding rectangle with alpha0 edges around the independently
reviewed alpha>16 body bounds. A border that reaches a nonzero page edge or
adds any other visible body pixel is a source-production blocker.
"""
import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--delivery', default='docs/suivi-production/v109-pit-forward/native-frame-delivery.json')
    parser.add_argument('--output', default='docs/suivi-production/v109-pit-forward/native-uv-border-review.json')
    parser.add_argument('--corrections')
    parser.add_argument('--strict', action='store_true')
    args = parser.parse_args()
    delivery = json.loads(Path(args.delivery).read_text())
    if args.corrections:
        corrections = json.loads(Path(args.corrections).read_text())
        for replacement in corrections['frames']:
            group = next(group for group in delivery['groups'] if all(group[key] == replacement[key]
                         for key in ['fighterId', 'role', 'facing']))
            group['frames'][replacement['index']] = {**replacement['frame'], 'otherPosePixelsAboveAlpha16': 0}
            group['pages'].append(replacement['page'])
    images, sources, slots = {}, {}, []
    for group in delivery['groups']:
        pages = {page['pageId']: page for page in group['pages']}
        for frame in group['frames']:
            page = pages[frame['pageId']]
            if page['path'] not in images:
                raw = Path(page['path']).read_bytes()
                digest = hashlib.sha256(raw).hexdigest()
                assert digest == page['sha256'] and len(raw) == page['bytes'], page['path']
                with Image.open(page['path']) as image:
                    assert image.mode == 'RGBA' and image.size == (page['width'], page['height']), page['path']
                    images[page['path']] = np.array(image.getchannel('A'))
                sources[page['path']] = {'path': page['path'], 'sha256': digest, 'bytes': len(raw)}
            alpha = images[page['path']]
            height, width = alpha.shape
            x, y, w, h = frame['rect']
            x0, y0, x1, y1 = frame['visibleBodyBox']
            previous = None
            while previous != (x0, y0, x1, y1):
                previous = (x0, y0, x1, y1)
                while alpha[y0:y1 + 1, x0].max() > 0 and x0 > 0:
                    x0 -= 1
                while alpha[y0:y1 + 1, x1].max() > 0 and x1 < width - 1:
                    x1 += 1
                while alpha[y0, x0:x1 + 1].max() > 0 and y0 > 0:
                    y0 -= 1
                while alpha[y1, x0:x1 + 1].max() > 0 and y1 < height - 1:
                    y1 += 1
            border = int(max(alpha[y0:y1 + 1, x0].max(), alpha[y0:y1 + 1, x1].max(),
                             alpha[y0, x0:x1 + 1].max(), alpha[y1, x0:x1 + 1].max()))
            added = int((alpha[y0:y1 + 1, x0:x1 + 1] > 16).sum()) - int((alpha[y:y + h, x:x + w] > 16).sum())
            slots.append({
                'slot': f"{group['fighterId']}/{group['role']}/{group['facing']}/{frame['index']}",
                'fighterId': group['fighterId'], 'role': group['role'], 'facing': group['facing'],
                'frameIndex': frame['index'], 'pageId': page['pageId'], 'sourcePath': page['path'],
                'oldRect': frame['rect'], 'zeroBorderCandidate': [x0, y0, x1 - x0 + 1, y1 - y0 + 1],
                'boundaryMaxAlpha': border, 'addedForeignCorePixels': added,
                'valid': border == 0 and added == 0 and frame['otherPosePixelsAboveAlpha16'] == 0,
            })
    report = {
        'schemaVersion': 1,
        'scope': 'Read-only native alpha geometry. Minimal expanding alpha0 rectangle around the reviewed body bbox; any extra alpha>16 body pixel or nonzero page edge blocks admission. No PNG or decoded pixel modified.',
        'invocation': f'python scripts/review-pit-native-borders-v109.py --delivery {args.delivery} --output {args.output}' +
                      (f' --corrections {args.corrections}' if args.corrections else ''),
        'sourceDeliveryPath': args.delivery,
        'correctionDeliveryPath': args.corrections,
        'validNativeRegions': sum(slot['valid'] for slot in slots),
        'pendingNativeReplacements': sum(not slot['valid'] for slot in slots),
        'sources': list(sources.values()), 'slots': slots,
    }
    Path(args.output).write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({key: report[key] for key in ['validNativeRegions', 'pendingNativeReplacements']}))
    if args.strict and report['pendingNativeReplacements']:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
