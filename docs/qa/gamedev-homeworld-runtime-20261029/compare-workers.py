"""Reproduce the alternating native-Worker comparison; not a CI timing gate.

Usage: python compare-workers.py REPOSITORY BASELINE_SOURCES OUTPUT_DIRECTORY
The six baseline files are the exact sources of commit 842d513. Browser choice
is inherited from the existing QA script's environment variables.
"""
import json
import os
from pathlib import Path
import statistics
import subprocess
import sys
from datetime import datetime, timezone

root, baseline, output = (Path(arg).resolve() for arg in sys.argv[1:])
output.mkdir(parents=True, exist_ok=False)
order = ['before', 'after', 'after', 'before', 'before', 'after']
records = []

def environment_snapshot():
    values = {}
    for name, file in [
        ('loadAverage', '/proc/loadavg'),
        ('memoryCurrentBytes', '/sys/fs/cgroup/memory.current'),
        ('memoryMaxBytes', '/sys/fs/cgroup/memory.max'),
        ('cpuQuota', '/sys/fs/cgroup/cpu.max'),
    ]:
        path = Path(file)
        if path.exists():
            values[name] = path.read_text().strip()
    return values

for number, variant in enumerate(order, 1):
    run_output = output / f'{number:02d}-{variant}'
    log = output / f'{number:02d}-{variant}.log'
    env = dict(os.environ)
    env['YAUTJA_ROUTE_WORKER_SAMPLES'] = '1'
    env['YAUTJA_ROUTE_WORKER_QA_OUTPUT'] = str(run_output)
    env.pop('YAUTJA_ROUTE_WORKER_BASELINE_DIR', None)
    if variant == 'before':
        env['YAUTJA_ROUTE_WORKER_BASELINE_DIR'] = str(baseline)
    record = {'number': number, 'variant': variant,
              'startedAt': datetime.now(timezone.utc).isoformat(),
              'environmentBefore': environment_snapshot(), 'log': log.name}
    print(f'START {number}/6 {variant}', flush=True)
    with log.open('w') as handle:
        result = subprocess.run(
            ['node', 'scripts/qa-homeworld-route-worker-v113.mjs'],
            cwd=root, env=env, stdout=handle, stderr=subprocess.STDOUT)
    record['exitCode'] = result.returncode
    record['environmentAfter'] = environment_snapshot()
    files = list(run_output.glob('run-*/report.json'))
    if len(files) != 1 or result.returncode != 0:
        (output / 'incomplete.json').write_text(json.dumps(
            {'order': order, 'completed': records, 'failed': record}, indent=2) + '\n')
        raise SystemExit('Native Worker run failed; see ' + str(log))
    report = json.loads(files[0].read_text())
    assert report['status'] == 'PASS'
    assert len(report['samples']) == 1 and len(report['checks']) == 4
    assert all(check['status'] == 'PASS' for check in report['checks'])
    sample = report['samples'][0]
    record.update({'report': str(files[0].relative_to(output)),
                   'coldMs': sample['coldMs'], 'repeatMs': sample['warmMs'],
                   'planSha256': sample['planSha256'],
                   'fixtureSha256': report['fixture']['sha256'],
                   'runtime': report['runtime'], 'sources': report['sources']})
    records.append(record)
    print(f'PASS {number}/6 {variant}: {sample["coldMs"]:.1f} ms', flush=True)

assert len({r['planSha256'] for r in records}) == 1, 'Path changed'
assert len({r['fixtureSha256'] for r in records}) == 1, 'Fixture changed'
assert len({json.dumps(r['runtime'], sort_keys=True) for r in records}) == 1
for variant in ['before', 'after']:
    assert len({json.dumps(r['sources'], sort_keys=True) for r in records
                if r['variant'] == variant}) == 1, 'Source changed during runs'
before = [r for r in records if r['variant'] == 'before']
after = [r for r in records if r['variant'] == 'after']
changed = [a['path'] for a, b in zip(before[0]['sources'], after[0]['sources']) if a != b]
assert changed == ['app/game/systems/homeworldCourtArtV80.ts',
                   'app/game/systems/homeworldCivicDecorV80.ts'], changed
before_median = statistics.median(r['coldMs'] for r in before)
after_median = statistics.median(r['coldMs'] for r in after)
summary = {
    'baselineCommit': '842d513fef9e1c80adc7c6d6b25cd2ae4b081fca',
    'orderChosenBeforeExecution': order,
    'method': 'Three alternating before/after pairs; a fresh browser and Worker for every run. First response includes Worker startup. No timing assertion or retry.',
    'scope': 'Shared managed environment, one audience-to-port fixture, exact same full plan; not FPS or a target-device budget.',
    'runs': records,
    'beforeColdMedianMs': before_median,
    'afterColdMedianMs': after_median,
    'coldReductionPercent': 100 * (1 - after_median / before_median),
    'beforeRepeatMedianMs': statistics.median(r['repeatMs'] for r in before),
    'afterRepeatMedianMs': statistics.median(r['repeatMs'] for r in after),
    'checksPassed': 24,
    'pathChanged': False,
}
(output / 'comparison.json').write_text(json.dumps(summary, indent=2) + '\n')
print(json.dumps({key: summary[key] for key in [
    'beforeColdMedianMs', 'afterColdMedianMs', 'coldReductionPercent',
    'beforeRepeatMedianMs', 'afterRepeatMedianMs', 'checksPassed', 'pathChanged']}), flush=True)
