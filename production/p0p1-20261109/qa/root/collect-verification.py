#!/usr/bin/env python3
"""Collect bounded, actual receipts; never includes a workbook/qualification hash."""
import argparse
import datetime
import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
LOT = ROOT / 'production/p0p1-20261109'
BASE = '39b601ce1873a1f400d2f545f0fab97691b779e3'
FINAL_BUILD = 'lSBcQd-2LuUCPafGoIZvC'
sha = lambda data: hashlib.sha256(data).hexdigest()


def read(name):
    return json.loads((ROOT / name).read_text())


def pin(name):
    file = ROOT / name
    data = file.read_bytes()
    return {'path': name, 'bytes': len(data), 'sha256': sha(data)}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--endurance-receipt', required=True)
    args = parser.parse_args()
    assert not Path(args.endurance_receipt).is_absolute()
    assert args.endurance_receipt.startswith('production/p0p1-20261109/qa/phg-endurance/')
    assert '..' not in Path(args.endurance_receipt).parts
    ci = read('production/p0p1-20261109/qa/ci/protocol-v2-cold/results/report.json')
    assert ci['passed'] and ci['totals']['pass'] == 689 and ci['totals']['fail'] == 0
    assert len(ci['files']) == 70 and ci['totals']['skipped'] == 0 and ci['totals']['todo'] == 0
    for row in ci['files']:
        assert row['sourceUnchanged'] and not row['spawnError']
        assert sha((ROOT / row['file']).read_bytes()) == row['sourceSha256']
    before_path = 'production/p0p1-20261109/qa/root/build-source-before-migration-final.json'
    before = read(before_path)
    for row in before['files']:
        assert sha((ROOT / row['path']).read_bytes()) == row['sha256'], row['path']
    assert (ROOT / '.next/BUILD_ID').read_text().strip() == FINAL_BUILD
    lint = read('production/p0p1-20261109/qa/root/lint-source-final.json')
    assert lint['exitCode'] == 0

    native = []
    for name, count, build, report in [
        ('clan-ship', 27, 'RYl37_8hN58IOB8jDpRj1', 'qa/clan-ship-native/attempt-3/report.json'),
        ('phg', 23, 'RYl37_8hN58IOB8jDpRj1', 'qa/phg/attempt-3/report.json'),
        ('warp', 17, 'RYl37_8hN58IOB8jDpRj1', 'qa/warp/attempt-2/report.json'),
        ('atlas', 12, FINAL_BUILD, 'qa/homeworld/native-exports/attempt-4/report.json'),
        ('archive-next', 15, FINAL_BUILD, 'qa/archive-next/attempt-2/report.json'),
        ('phg-hunt', 11, 'RYl37_8hN58IOB8jDpRj1', 'qa/phg-hunt/attempt-3/report.json'),
    ]:
        path = 'production/p0p1-20261109/' + report
        data = read(path)
        checks = data['checks']
        assert len(checks) == count, (name, len(checks))
        assert all(c.get('passed') is True or c.get('status') == 'PASS' for c in checks), name
        for key in ['errors', 'consoleErrors', 'httpErrors', 'requestFailures', 'missingAssets', 'resourceMismatches']:
            assert not data.get(key), (name, key)
        actual_build = data.get('buildId') or data.get('buildIdAfter') or data.get('identityAfter', {}).get('buildId')
        assert actual_build == build, (name, actual_build)
        native.append({'name': name, 'checksPassed': count, 'checksFailed': 0,
                       'buildId': build, 'report': pin(path)})
    archive = read('production/p0p1-20261109/qa/archive/attempt-3/report.json')
    assert archive['passed'] == 17 and archive['failed'] == 0
    fields = read('production/p0p1-20261109/qa/clan-field-native/final-receipt.json')
    assert fields['passed'] and fields['nativeTargetHuntsCompleted'] == fields['nativeTargetReceiptsEarned'] == 4
    assert fields['fullCampaignPlayed'] is False

    endurance = read('production/p0p1-20261109/qa/phg-endurance/attempt-1/report.json')
    assert endurance['nativeRunPassed'] and endurance['gpuLeakCriterionQualified']
    assert not endurance['probe'] and endurance['elapsedSeconds'] >= 3600
    assert len(endurance['distinctMaterialIds']) == 77 and len(endurance['selections']) == 300
    assert endurance['sourceBefore'] == endurance['sourceAfter']
    assert endurance['buildBefore'] == endurance['buildAfter']
    assert endurance['materialAssetsBefore'] == endurance['materialAssetsAfter']
    for key in ['errors', 'consoleErrors', 'requestFailures', 'httpErrors']:
        assert not endurance[key]
    runtime = Path(endurance['runtimeRoot'])
    renderer = []
    for file in ['GameClient.tsx', 'HunterChromaticForgeV113.tsx', 'HunterChromaticForgeV113.module.css',
                 'HunterRigPreview.tsx', 'ChromaticSurfaceV113.tsx', 'hunterChromaticsV113.ts',
                 'hunterChromaticCanvasV113.ts', 'phgBiomaskTintsV131.ts', 'phgBiomaskStudiesV132.ts']:
        name = 'app/game/' + file
        assert (ROOT / name).read_bytes() == (runtime / name).read_bytes(), name
        renderer.append(pin(name))

    names = set(subprocess.check_output(['git', 'diff', '--name-only', BASE], cwd=ROOT, text=True).splitlines())
    names.update(subprocess.check_output(['git', 'ls-files', '--others', '--exclude-standard'], cwd=ROOT, text=True).splitlines())
    sources = sorted(name for name in names if (name.startswith(('app/', 'scripts/', 'tests/')) and Path(name).suffix in
                     {'.ts', '.tsx', '.mjs', '.js', '.json', '.css'}) or name in
                     {'.github/workflows/p0-p1-coherence-20261109.yml', 'docs/campagne/BIBLE_DE_CAMPAGNE.md',
                      'docs/campagne/CONCORDANCE_P0_P1_20261109.md'})
    evidence = [
        'qa/ci/protocol-v2-cold/final-receipt.json', 'qa/root/build-migration-final.log',
        'qa/root/build-source-before-migration-final.json', 'qa/root/lint-source-final.json',
        'qa/root/lint-source-final.log', 'qa/root/runtime-check-final.log',
        'qa/archive/attempt-3/final-receipt.json', 'qa/archive-next/attempt-2/final-receipt.json',
        'qa/clan-field-native/final-receipt.json', 'qa/phg-hunt/attempt-3/final-receipt.json',
        'qa/warp/asset-verification.json', 'qa/phg-admission/verification.json',
        'qa/war-admission/final-receipt.json', 'lore/README.md',
    ]
    result = {
        'schemaVersion': 1, 'asOf': datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'baseCommit': BASE, 'upstreamMainAtStart': '19317af4f6cf05532a8ba56dbfe8f56fc4b225d9',
        'scope': 'Current bounded P0/P1 implementations and actual receipts, with all documentary priorities diagnosed; not global game completion.',
        'allP0P1Closed': False, 'documentarySubjects': 2577, 'historicalWorkbooksPreserved': 112,
        'tests': {'passed': 689, 'failed': 0, 'skipped': 0, 'todo': 0, 'files': 70,
                  'sourceReport': pin('production/p0p1-20261109/qa/ci/protocol-v2-cold/results/report.json'),
                  'scope': 'Unique final suite; older677/688, independent329 and repeated46 cases are not added.'},
        'build': {'exitCode': 0, 'buildId': FINAL_BUILD, 'node': ci['node'],
                  'typescriptCheckedByActualNextBuild': True, 'appSourceBeforeStillMatches': True,
                  'log': pin('production/p0p1-20261109/qa/root/build-migration-final.log'), 'deploymentTested': False},
        'lint': {'exitCode': 0, 'maxWarnings': 0, 'files': lint['files'],
                 'report': pin('production/p0p1-20261109/qa/root/lint-source-final.json'),
                 'scope': 'Earlier pre-existing unused constant/import warnings were fixed; failed invocations stay dated.'},
        'nativeNext': {'checksPassed': sum(r['checksPassed'] for r in native), 'checksFailed': 0, 'recipes': native,
                       'scope': 'Exact production JS compared by each recipe; earlier RYl reports target unchanged hunt/audio/PHG/Warp code. Final lSB includes namespace migration and atlas. No full campaign or physical-controller claim.'},
        'archiveComponentFixture': {'checksPassed': 17, 'checksFailed': 0,
            'scope': 'Actual UI/reducers/IDB/WebLocks, two historical source modules with current dependencies; separate from Next15 and not a full old checkout.',
            'receipt': pin('production/p0p1-20261109/qa/archive/attempt-3/final-receipt.json')},
        'nativeHunts': {'completed': 4, 'newTargetReceipts': 4, 'fullCampaign': False,
                       'receipt': pin('production/p0p1-20261109/qa/clan-field-native/final-receipt.json')},
        'endurance': {'elapsedSeconds': endurance['elapsedSeconds'], 'nativeCommits': len(endurance['selections']),
                      'distinctMaterials': 77, 'fullCycles': endurance['completedFullCycles'],
                      'gpuLeakCriterionQualified': True, 'scope': 'Measured software GPU backend and predeclared bounds, not physical VRAM or universal FPS.',
                      'report': pin('production/p0p1-20261109/qa/phg-endurance/attempt-1/report.json'),
                      'receipt': pin(args.endurance_receipt), 'rendererSourcesIdenticalToFinal': renderer},
        'art': {'newPng': 19, 'reusedPng': 3, 'newP0PngIntegratedInPilot': 2,
                'newP1PngSourceCandidatesOnly': 17, 'imageRequestsUnfulfilled': [97, 208, 209, 210],
                'humanArtApproved': False, 'newAnimationsClaimed': 0},
        'runtimeInputs': pin('docs/qa/current-integration-20261103/runtime-inputs.json'),
        'sourceSha256': {name: pin(name)['sha256'] for name in sources},
        'evidence': [pin('production/p0p1-20261109/' + name) for name in evidence],
        'remaining': ['Current registry retains real open/partial game development and art/reference requirements.',
                      'Remote authoritative War server, complete campaign/variant scenes and unadmitted assets remain unfinished.',
                      'Canonical human art, physical controllers and inaccessible primary references remain unqualified.'],
    }
    (LOT / 'verification.json').write_text(json.dumps(result, indent=2, ensure_ascii=False) + '\n')
    print(json.dumps({'written': 'production/p0p1-20261109/verification.json', 'tests': result['tests']['passed'],
                      'nativeNext': result['nativeNext']['checksPassed'], 'endurance': result['endurance']['elapsedSeconds'],
                      'sha256': pin('production/p0p1-20261109/verification.json')['sha256']}))


if __name__ == '__main__':
    main()
