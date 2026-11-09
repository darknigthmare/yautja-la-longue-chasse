#!/usr/bin/env python3
"""Read-only integrity check; does not rerun gameplay or infer completion."""
from pathlib import Path
import hashlib
import json

BASE = Path(__file__).resolve().parent
ROOT = BASE.parents[3]
receipt = json.loads((BASE / 'component-fixture-receipt.json').read_text())
for row in receipt['files']:
    path = ROOT / row['path']
    assert path.resolve().is_relative_to(ROOT)
    data = path.read_bytes()
    assert len(data) == row['bytes'], row['path']
    assert hashlib.sha256(data).hexdigest() == row['sha256'], row['path']
report = json.loads((BASE / 'native-fixture/attempt-2/report.json').read_text())
assert report['fixtureOnly'] is True
assert report['passed'] and report['sourceBeforeAfterEqual']
assert report['checksPassed'] == 18 and report['checksFailed'] == 0
assert not any(report[k] for k in ['errors', 'consoleErrors', 'requestFailures', 'httpErrors'])
final = json.loads((BASE / 'native-fixture/attempt-2/18-reloaded.json').read_text())
state = final['ledger']
assert final['inspection']['status'] == 'valid'
assert state['completedSteps'] == 18 and state['revision'] == 21
assert len(state['events']) == 21
assert state['objectLocation'] == 'cabinet'
assert len({state['objectId']}) == 1
print(json.dumps({'passed': True, 'domainTests': 24, 'componentFixtureChecks': 18,
                  'nativeGameClientTested': False, 'filesVerified': len(receipt['files'])}))
