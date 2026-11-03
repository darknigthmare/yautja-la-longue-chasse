"""Read-only source-pixel audit. Candidates need visual review, never auto-reanchor art."""
import json
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
roster = json.loads((root / 'app/game/data/pitUserHuntersV44.json').read_text(encoding='utf-8'))
rows = []
for fighter in roster['fighters']:
    for variant in fighter['variants']:
        with Image.open(root / 'public' / variant['src'].lstrip('/')) as image:
            alpha = image.getchannel('A')
            bounds = {}
            for threshold in (32, 128, 192, 224):
                mask = alpha.point(lambda a: 255 if a >= threshold else 0)
                box = mask.getbbox()
                bounds[str(threshold)] = list(box) if box else None
            opaque = bounds['192']
            gap = variant['pivot'][1] - (opaque[3] - 1) if opaque else None
            rows.append({'fighterId': fighter['id'], 'variantId': variant['id'], 'src': variant['src'],
                         'pivot': variant['pivot'], 'bodyTopY': variant['bodyTopY'], 'bounds': bounds,
                         'opaqueGapSourcePx': gap,
                         'approxGapAt185px': round(gap * 185 / (variant['pivot'][1] - variant['bodyTopY']), 3) if gap is not None else None})
manifest = json.loads((root / 'app/game/pitArenaProductionData.generated.json').read_text(encoding='utf-8'))
floors, seen = [], set()
for stage in manifest['stages']:
    for plane in stage['planes']:
        for asset in plane['assets']:
            if asset['mode'] != 'repeat-x' or not asset['frames'][0].get('generation'):
                continue
            frame = asset['frames'][0]
            source = asset.get('sourceCrop') or frame['generation']['contentBounds']
            key = (frame['path'], json.dumps(source, sort_keys=True))
            if key in seen:
                continue
            seen.add(key)
            with Image.open(root / 'public' / frame['path'].lstrip('/')) as image:
                alpha = image.convert('RGBA').getchannel('A')
                x, y, w, h = (source[k] for k in ('x', 'y', 'width', 'height'))
                strip = alpha.crop((x, y, x+w, y+h))
                coverage = [sum(strip.crop((0, n, w, n+1)).histogram()[192:]) / w for n in range(min(h, 100))]
                support = next((n for n in range(len(coverage)-2) if min(coverage[n:n+3]) >= .9), None)
                floors.append({'stage': stage['name'], 'assetId': asset['id'], 'path': frame['path'],
                               'crop': source, 'firstStableOpaqueRow': support,
                               'gapAtPlacementPx': None if support is None else round(support * asset['placements'][0]['width'] / w, 3)})
result = {'scope': 'Read-only alpha candidates, not semantic feet detection or automatic fixes',
          'variants': rows, 'floors': floors}
out = root / 'outputs/qa-commercial-audit/v54'
out.mkdir(parents=True, exist_ok=True)
(out / 'grounding-source-audit.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({'variants': len(rows), 'floorTiles': len(floors),
                  'largestGaps': sorted(rows, key=lambda r: r['approxGapAt185px'] or 0, reverse=True)[:18],
                  'floorGaps': sorted(floors, key=lambda r: r['gapAtPlacementPx'] or 0, reverse=True)[:12]}, ensure_ascii=False))
