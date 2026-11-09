#!/usr/bin/env python3
"""Read-only delivery check of the actual Next tutorial receipt."""
from pathlib import Path
import hashlib
import json

BASE = Path(__file__).resolve().parent
ROOT = BASE.parents[3]
receipt = json.loads((BASE / 'native-attempt-2/final-receipt.json').read_text())
for item in receipt['files']:
    path = ROOT / item['path']
    assert path.resolve().is_relative_to(ROOT), item['path']
    data = path.read_bytes()
    assert len(data) == item['bytes'], item['path']
    assert hashlib.sha256(data).hexdigest() == item['sha256'], item['path']
raw = json.loads((BASE / 'native-attempt-2/report.browser-run.json').read_text())
assert raw['passed'] and raw['checksPassed'] == 20 and raw['checksFailed'] == 0
assert all(row['passed'] for row in raw['checks'])
assert raw['sourceBeforeAfterEqual'] and raw['buildBeforeAfterEqual']
assert raw['buildBefore']['buildId'] == 'kS-6-0gmSFRZVosfYvnq6'
assert all(row['matched'] for row in raw['servedScripts'])
assert all(row['foundBuildId'] for row in raw['servedDocuments'])
assert not any(raw[key] for key in ['errors', 'consoleErrors', 'httpErrors', 'requestFailures'])
for row in raw['saveSnapshots']:
    snapshot = ROOT / 'production/clan-war-command-20261109/qa/trophy-tutorial/native-attempt-2' / row['filename']
    assert hashlib.sha256(snapshot.read_bytes()).hexdigest() == row['sha256']
final = json.loads((BASE / 'native-attempt-2/10-completed.json').read_text())
start = json.loads((BASE / 'native-attempt-2/02-before-tutorial.json').read_text())
assert final['save']['trophyTutorialV6']['completedSteps'] == 18
assert final['save']['trophyTutorialV6']['revision'] == 21
assert len(final['save']['trophyTutorialV6']['events']) == 21
assert final['save']['trophyTutorialV6']['objectLocation'] == 'cabinet'
assert final['save']['trophies'] == start['save']['trophies']
for field in ['rankId', 'honor', 'clanMarks', 'hunterName']:
    assert final['save']['profile'][field] == start['save']['profile'][field]
for field in ['missionProgress', 'prologue', 'shipAcquisitionV89']:
    assert final['save'].get(field) == start['save'].get(field)
runtime_ship_key = 'yautja-long-hunt.ship-progression'
assert runtime_ship_key not in start['storage'] and runtime_ship_key not in final['storage']
def fleet(archive):
    state = json.loads(json.dumps(archive))
    state.pop('updatedAt', None)
    for preset in state['loadoutPresets']:
        preset.pop('savedAt', None)
    return state
def slot_fleets(snapshot):
    slot = json.loads(snapshot['storage']['yautja-long-hunt.campaign-slot.1'])
    return [entry['archive']['attachments']['shipProgression'] for entry in slot['checkpoints']]
baseline_fleet = fleet(slot_fleets(start)[0])
assert all(fleet(entry) == baseline_fleet for entry in slot_fleets(start) + slot_fleets(final))
for prefix in ['05-discovery', '07-face', '09-plaque']:
    before = json.loads((BASE / f'native-attempt-2/{prefix}-before-reload.json').read_text())
    after = json.loads((BASE / f'native-attempt-2/{prefix}-after-reload.json').read_text())
    assert before['save']['trophyTutorialV6'] == after['save']['trophyTutorialV6']
replay = json.loads((BASE / 'native-replay-completed/report.json').read_text())
assert replay['passed'] and len(replay['checks']) == 3 and all(row['passed'] for row in replay['checks'])
assert replay['buildId'] == raw['buildBefore']['buildId'] == replay['buildIdAfter']
assert not replay['errors'] and all(row['matched'] for row in replay['scripts'])
assert json.loads((BASE / 'native-attempt-2/screenshot-inspection.json').read_text())['allOriginalsOpened']
assert json.loads((BASE / 'native-replay-completed/screenshot-inspection.json').read_text())['opened']
print(json.dumps({'passed': True, 'nativeNextChecks': 20, 'earnedCheckpointReplayChecks': 3,
                  'nativeGesturesCompleted': 18, 'durableEvents': 21, 'screenshotsOpened': 12,
                  'filesVerified': len(receipt['files']), 'currentNurseryOrRitesQualified': False}))
