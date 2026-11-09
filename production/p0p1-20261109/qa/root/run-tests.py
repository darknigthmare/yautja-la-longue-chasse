#!/usr/bin/env python3
"""Run each selected Node test file directly; retain actual TAP case counts."""
import datetime
import hashlib
import json
import os
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
OUT = Path(__file__).resolve().parent
NODE = '/workspace/.cloud-tools/node22/node_modules/node/bin/node'
paths = json.loads((OUT / os.environ.get('P0P1_SELECTION', 'test-selection.json')).read_text())
REPORT = OUT / os.environ.get('P0P1_REPORT', 'tests.json')
report = {'startedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
          'node': subprocess.check_output([NODE, '--version'], text=True).strip(), 'files': []}
for name in paths:
    command = [NODE, '--experimental-strip-types', name]
    source_sha = hashlib.sha256((ROOT / name).read_bytes()).hexdigest()
    result = subprocess.run(command, cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    log = OUT / (os.environ.get('P0P1_LOG_PREFIX', '') + Path(name).name + '.tap')
    log.write_bytes(result.stdout)
    text = result.stdout.decode('utf8', errors='replace')
    counts = {}
    for field in ['tests', 'pass', 'fail', 'skipped', 'cancelled']:
        values = re.findall(r'^# ' + field + r' (\d+)\s*$', text, re.MULTILINE)
        counts[field] = int(values[-1]) if values else None
    row = {'file': name, 'command': command, 'exitCode': result.returncode,
           'sourceSha256': source_sha, 'sourceUnchanged': source_sha == hashlib.sha256((ROOT / name).read_bytes()).hexdigest(),
           'log': str(log.relative_to(ROOT)), 'logSha256': hashlib.sha256(result.stdout).hexdigest(), **counts}
    report['files'].append(row)
    REPORT.write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({k: row[k] for k in ['file', 'exitCode', 'tests', 'pass', 'fail', 'skipped']}), flush=True)
report['finishedAt'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
report['passed'] = all(r['exitCode'] == 0 and r['sourceUnchanged'] and r['tests'] is not None and r['fail'] == 0 and not r['cancelled'] for r in report['files'])
report['totals'] = {key: sum(r[key] or 0 for r in report['files']) for key in ['tests', 'pass', 'fail', 'skipped', 'cancelled']}
REPORT.write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps({'passed': report['passed'], 'totals': report['totals']}), flush=True)
raise SystemExit(0 if report['passed'] else 1)
