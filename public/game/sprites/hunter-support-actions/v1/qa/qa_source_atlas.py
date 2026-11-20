#!/usr/bin/env python3
"""Read-only source PNG inspection. Never edits or rewrites an input image."""
from pathlib import Path
from PIL import Image
import argparse, hashlib, json, math
import numpy as np

def bbox(mask):
    ys, xs = np.nonzero(mask)
    if not len(xs): return None
    return [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1]

def boundary(a):
    return np.concatenate([a[0, :], a[-1, :], a[1:-1, 0], a[1:-1, -1]])

def inspect(path, atlas_id=None, columns=4, rows=4):
    path = Path(path)
    source_bytes = path.read_bytes()
    source = Image.open(path)
    rgba = np.asarray(source.convert('RGBA'))
    height, width, _ = rgba.shape
    a = rgba[:, :, 3]
    bounds_x = [math.floor(i * width / columns + .5) for i in range(columns + 1)]
    bounds_y = [math.floor(i * height / rows + .5) for i in range(rows + 1)]
    canvas_width = max(np.diff(bounds_x))
    canvas_height = max(np.diff(bounds_y))
    cells = []
    for row in range(rows):
        for col in range(columns):
            x0, x1 = bounds_x[col:col+2]
            y0, y1 = bounds_y[row:row+2]
            cell = rgba[y0:y1, x0:x1]
            alpha = cell[:, :, 3]
            h, w = alpha.shape
            edge = boundary(alpha)
            padded = np.zeros((canvas_height, canvas_width, 4), dtype=np.uint8)
            padded[:h, :w] = cell
            # Measure the ACTUAL unpadded source boundary, including x=312 of 313px cells.
            margin_mask = np.zeros_like(alpha, dtype=bool)
            m = min(8, w//2, h//2)
            margin_mask[:m] = True
            margin_mask[-m:] = True
            margin_mask[:, :m] = True
            margin_mask[:, -m:] = True
            margin = alpha[margin_mask]
            opaque_bbox = bbox(alpha >= 128)
            visible_bbox = bbox(alpha >= 16)
            margins = None if opaque_bbox is None else {
                'left': opaque_bbox[0], 'top': opaque_bbox[1],
                'right': w-opaque_bbox[2], 'bottom': h-opaque_bbox[3]
            }
            cells.append({
                'frame':row*columns+col+1,
                'sourceRect':{'x':x0,'y':y0,'w':w,'h':h},
                'zeroAlphaPixels':int(np.sum(alpha == 0)),
                'zeroAlphaFraction':float(np.mean(alpha == 0)),
                'alphaMin':int(alpha.min()), 'alphaMax':int(alpha.max()),
                'alphaGe16Pixels':int(np.sum(alpha >= 16)),
                'alphaGe128Pixels':int(np.sum(alpha >= 128)),
                'bboxAlphaGe16':visible_bbox, 'bboxAlphaGe128':opaque_bbox,
                'opaqueBodyMargins':margins,
                'actualBoundaryPixelCount':int(edge.size),
                'actualBoundaryAlphaMax':int(edge.max()),
                'actualBoundaryGt2Pixels':int(np.sum(edge > 2)),
                'actualBoundaryGe16Pixels':int(np.sum(edge >= 16)),
                'actualBoundaryGe128Pixels':int(np.sum(edge >= 128)),
                'margin8pxGe16Fraction':float(np.mean(margin >= 16)),
                'margin8pxGe128Fraction':float(np.mean(margin >= 128)),
                'decodedPaddedRgbaSha256':hashlib.sha256(padded.tobytes()).hexdigest()
            })
    edge = boundary(a)
    broad_bg_risk = float(np.mean(a == 0)) < .10 or float(np.mean(edge >= 16)) > .15
    clipped = [c['frame'] for c in cells if c['actualBoundaryGe128Pixels']]
    visible_edge = [c['frame'] for c in cells if c['actualBoundaryGe16Pixels']]
    nonempty = all(c['alphaGe128Pixels'] > 0 for c in cells)
    unique_hashes = len(set(c['decodedPaddedRgbaSha256'] for c in cells))
    report = {
        'id':atlas_id or path.stem,'sourcePath':str(path),'bytes':len(source_bytes),
        'sourceSha256':hashlib.sha256(source_bytes).hexdigest(),
        'sourceMode':source.mode,'width':width,'height':height,
        'grid':{'columns':columns,'rows':rows,'x':bounds_x,'y':bounds_y,'rounding':'Math.round for nonnegative coordinates'},
        'alpha':{'min':int(a.min()),'max':int(a.max()),'zeroPixels':int(np.sum(a==0)),
                 'zeroFraction':float(np.mean(a==0)),'outerBoundaryMax':int(edge.max()),
                 'outerBoundaryGe16Pixels':int(np.sum(edge>=16)),
                 'outerBoundaryGe16Fraction':float(np.mean(edge>=16))},
        'broadBackgroundRisk':broad_bg_risk,
        'visibleSourceBoundaryFramesAlphaGe16':visible_edge,
        'possibleBodyClippingFramesAlphaGe128':clipped,
        'allCellsContainOpaqueBody':nonempty,
        'uniqueDecodedPaddedRgbaFrames':unique_hashes,
        'technicalDisposition':'reject-broad-background' if broad_bg_risk else 'inspect-body-clipping' if clipped else 'review-visible-edge' if visible_edge else 'source-alpha-and-margins-pass',
        'doesNotEstablish':'Human artistic approval, seamless animation, frame anatomy, or game integration.',
        'cells':cells
    }
    return report

def main():
    p=argparse.ArgumentParser()
    p.add_argument('paths',nargs='*')
    p.add_argument('--registry')
    p.add_argument('--output',required=True)
    p.add_argument('--single',action='store_true')
    args=p.parse_args()
    entries=[]
    if args.registry:
        registry=json.loads(Path(args.registry).read_text())
        entries.extend((key,value['path']) for key,value in registry.items() if isinstance(value,dict) and 'path' in value)
    entries.extend((Path(v).stem,v) for v in args.paths)
    reports=[inspect(path,key,1 if args.single else 4,1 if args.single else 4) for key,path in entries]
    out={'method':'Read-only decoded PNG alpha, true source-cell boundaries, body threshold128, visible threshold16; no pixel cleanup or repaint. Broad-background detection is a diagnostic requiring visual confirmation.','atlases':reports}
    Path(args.output).write_text(json.dumps(out,indent=2)+'\n')
    print(json.dumps([{'id':r['id'],'disposition':r['technicalDisposition'],'zeroAlphaFraction':r['alpha']['zeroFraction'],'bodyClippingFrames':r['possibleBodyClippingFramesAlphaGe128'],'visibleEdgeFrames':r['visibleSourceBoundaryFramesAlphaGe16'],'uniqueRgbaFrames':r['uniqueDecodedPaddedRgbaFrames']} for r in reports],indent=2))

if __name__=='__main__': main()
