#!/usr/bin/env python3
"""Read native PNG bytes and verify this delivery; never modify image pixels.

Use --write to aggregate the generation receipts into manifest.json and
technical-report.json. Without it, compare recorded metadata with the files.
Requires Pillow and numpy. No network or runtime admission is performed.
"""
import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image

PACK = Path(__file__).resolve().parents[1]
REPO = PACK.parents[1]
EXPECTED = [f'HWM162-{group}{i:02d}' for group, count in [('S', 7), ('M', 9), ('K', 9)] for i in range(1, count + 1)]


def read_json(path):
    return json.loads(path.read_text())


def inspect(path):
    raw = path.read_bytes()
    assert raw.startswith(b'\x89PNG\r\n\x1a\n'), f'Not a PNG: {path}'
    with Image.open(path) as image:
        image.load()
        assert image.mode == 'RGBA', f'Expected native RGBA: {path}'
        width, height = image.size
        alpha = np.asarray(image.getchannel('A'))
        bounds = {}
        for threshold in [0, 8, 24, 128]:
            yy, xx = np.where(alpha > threshold)
            assert xx.size, f'No visible content: {path}'
            box = [int(xx.min()), int(yy.min()), int(xx.max()) + 1, int(yy.max()) + 1]
            margins = [box[0], box[1], width - box[2], height - box[3]]
            bounds[str(threshold)] = {'comparison': 'alpha > threshold', 'box': box, 'margins': margins, 'minMargin': min(margins), 'pixels': int(xx.size)}
        zero = int(np.sum(alpha == 0))
        assert zero > 0, f'Opaque image: {path}'
        assert bounds['24']['minMargin'] > 0, f'Visible silhouette reaches border: {path}'
        edges = np.concatenate([alpha[0], alpha[-1], alpha[:, 0], alpha[:, -1]])
        return {'width': width, 'height': height, 'mode': image.mode, 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest(),
                'alphaMin': int(alpha.min()), 'alphaMax': int(alpha.max()), 'transparentPixels': zero,
                'transparentRatio': round(zero / (width * height), 8), 'alphaBounds': bounds,
                'edgeAlphaMax': int(edges.max()), 'strictClearMargin': bounds['0']['minMargin'] > 0,
                'mainSilhouetteInsideCanvas': True}


def aggregate():
    catalogue = read_json(PACK / 'catalogue.json')
    plans = {a['id']: a for a in catalogue['newAssetPlan']}
    source_ids = {source['id'] for source in catalogue['sources']}
    receipt_assets = {}
    for area in ['market', 'mounts', 'kennels']:
        receipt = read_json(PACK / 'receipts' / f'{area}.json')
        for a in receipt['assets']:
            assert a['id'] not in receipt_assets, f'Duplicate receipt ID: {a["id"]}'
            receipt_assets[a['id']] = (area, a)
    assert set(receipt_assets) == set(EXPECTED), 'Missing or unexpected generation IDs'
    assets = []
    for asset_id in EXPECTED:
        area, receipt = receipt_assets[asset_id]
        plan = plans[asset_id]
        relative = receipt.get('path') or receipt.get('file')
        path = REPO / relative
        assert path.resolve().is_relative_to(PACK / 'sprites'), f'Invalid selected path: {relative}'
        if plan.get('expectedPath'):
            assert path == PACK / plan['expectedPath'], f'Plan/receipt path mismatch: {asset_id}'
        metrics = inspect(path)
        assert metrics['sha256'] == receipt['sha256'], f'Receipt hash mismatch: {asset_id}'
        proposed = receipt.get('proposedMetres') or receipt.get('requested_dimensions_m') or receipt.get('dimensions_m_proposed') or {}
        visual_note = receipt.get('visual_review') or receipt.get('review_note') or ''
        notes = [
            'Source PNG selected after generation; no scripted image cleanup, resizing or padding.',
            'A few alpha 1 pixels can reach the canvas edges; alpha > 24 bounds describe the main silhouette only.',
            'Camera 0°/35° and metre dimensions are the brief, not a measured 3D or canonical certification.',
        ]
        if visual_note:
            notes.append(visual_note)
        if metrics['alphaBounds']['24']['minMargin'] < 80:
            notes.append('Visible margin is below the requested 80px on at least one side; the main silhouette remains inside the image.')
        if asset_id == 'HWM162-S01':
            notes.append('The first generation was reframed with image_gen; the selected v2 remains byte-identical to that generator output. First attempt retained separately.')
        box = metrics['alphaBounds']['24']['box']
        source_refs = plan.get('sourceRefs') or ['SRC-CAMERA', 'SRC-DAN-2026', 'SRC-ALEX-HOMESTEAD'] + (['SRC-HOUND-2010', 'SRC-HOUND-2018'] if area == 'kennels' else [])
        assert set(source_refs) <= source_ids, f'Unknown source reference: {asset_id}'
        asset = {'id': asset_id, 'label': plan['label'], 'area': area, 'kind': plan['kind'], 'targetIds': plan['targetIds'],
                 'path': relative, **metrics, 'status': 'GENERATED_INDEPENDENT_ART_CANDIDATE',
                 'loreStatus': 'ORIGINAL_GAME_ADAPTATION', 'sourceRefs': source_refs,
                 'proposedMetres': proposed, 'dimensionsAuthority': 'PROJECT_BRIEF_NOT_CANONICAL_MEASUREMENT',
                 'purpose': plan['purpose'], 'placementNote': plan['placementNote'],
                 'pivotDraftPixels': {'x': round((box[0] + box[2]) / 2, 2), 'y': box[3], 'status': 'BOUNDING_BOX_ANCHOR_ONLY_NOT_MEASURED_GROUND_CONTACT'},
                 'receipt': f'production/{PACK.name}/receipts/{area}.json', 'notes': notes,
                 'canonicalOneToOneClaimed': False, 'humanValidated': False, 'runtimeIntegrated': False,
                 'cameraMeasured': False, 'scaleValidatedInGame': False}
        if all(isinstance(proposed.get(k), (int, float)) for k in ['width', 'depth', 'height']):
            asset['proposedWorldSize'] = {k: round(proposed[k] * 100 / 2.3, 3) for k in ['width', 'depth', 'height']}
        if receipt.get('pairing'):
            asset['pairingDraft'] = receipt['pairing']
        elif receipt.get('assembly_proposal'):
            asset['pairingDraft'] = {'withAsset': receipt['assembly_pair_id'], **receipt['assembly_proposal']}
        if plan.get('sourceAssetIds'):
            asset['sourceAssetIds'] = plan['sourceAssetIds']
        assets.append(asset)
    assert len({a['sha256'] for a in assets}) == len(assets), 'Duplicate selected image bytes'
    selected_paths = {a['path'] for a in assets}
    disk_paths = {str(p.relative_to(REPO)) for p in (PACK / 'sprites').rglob('*.png')}
    assert disk_paths == selected_paths, 'Unexpected or missing PNG in selected sprite directories'
    manifest = {'schemaVersion': 1, 'version': 'MMK-20261103', 'date': '2026-11-03', 'repository': 'darknigthmare/yautja-la-longue-chasse', 'pullRequest': 99,
                'sourceCommit': '0ab844cca5f2c9b5cae28624d2c1b97fca7d5ce9', 'mainCommit': 'f322e0cb42f2b1b7e06c3be1dcfbb23cb24f02c8',
                'rebasedOnHead': '3950dbcccc36f4de7166faf5767277c0d9d55412',
                'preservedConcurrentDelivery': 'production/homeworld-v162',
                'generator': 'image_gen.imagegen (built-in)', 'cameraRequested': {'projection': 'orthographic', 'yawDegrees': 0, 'pitchDegrees': 35, 'depthScale': 0.573576436351046},
                'cameraMeasured': False, 'assets': assets, 'sources': catalogue['sources'],
                'selectedPNGCount': len(assets), 'selectedBytes': sum(a['bytes'] for a in assets),
                'areas': {g: sum(a['area'] == g for a in assets) for g in ['market', 'mounts', 'kennels']},
                'firstDeliveryCommit': 'd4c43dce5286fbb64e41ae5fa22cb82854572a7e',
                'scope': '25 selected independent PNG sources: 17 in the first delivery plus 8 modular components. Forty inherited target rows audited; two building targets added to this delivery catalogue only.',
                'canonicalOneToOneClaimed': False, 'humanValidated': False, 'runtimeIntegrated': False}
    report = {'version': 'MMK-20261103', 'verifier': f'production/{PACK.name}/tools/verify-assets.py',
              'sourceIntegrity': 'PASS', 'selectedCount': len(assets), 'rgbaWithRealTransparency': len(assets),
              'mainSilhouettesInsideCanvasAtAlpha24': len(assets),
              'strictClearMarginCount': sum(a['strictClearMargin'] for a in assets),
              'visibleMarginAtLeast80Count': sum(a['alphaBounds']['24']['minMargin'] >= 80 for a in assets),
              'uniqueSha256Count': len({a['sha256'] for a in assets}), 'selectedBytes': manifest['selectedBytes'],
              'scriptModifiesPNG': False, 'runtimeAdmission': False, 'canonicalCertification': False,
              'limits': ['Low-alpha edge noise remains in the native sources.', 'No collision, portal, actor placement or animation validation is claimed.', 'Dimensions in metres are proposed design dimensions.'],
              'files': [{k: a[k] for k in ['id', 'path', 'sha256', 'bytes', 'width', 'height', 'mode', 'alphaMin', 'alphaMax', 'transparentPixels', 'alphaBounds', 'edgeAlphaMax']} for a in assets]}
    return manifest, report


def main():
    args = argparse.ArgumentParser()
    args.add_argument('--write', action='store_true', help='write measured manifest and report; never changes PNGs')
    opts = args.parse_args()
    manifest, report = aggregate()
    if opts.write:
        for name, document in [('manifest.json', manifest), ('technical-report.json', report)]:
            (PACK / name).write_text(json.dumps(document, ensure_ascii=False, indent=2) + '\n')
    else:
        recorded = read_json(PACK / 'manifest.json')
        assert recorded == manifest, 'Manifest differs from the actual receipts/files; rerun with --write after review'
        assert read_json(PACK / 'technical-report.json') == report, 'Technical report differs from measurements'
    print(json.dumps({k: report[k] for k in ['sourceIntegrity', 'selectedCount', 'rgbaWithRealTransparency', 'mainSilhouettesInsideCanvasAtAlpha24', 'strictClearMarginCount', 'visibleMarginAtLeast80Count', 'uniqueSha256Count', 'selectedBytes']}, ensure_ascii=False))


if __name__ == '__main__':
    main()
