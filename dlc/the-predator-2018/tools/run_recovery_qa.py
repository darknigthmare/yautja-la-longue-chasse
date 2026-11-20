#!/usr/bin/env python3
"""Re-run QA in a temporary copy, preserving the byte-identical recovered sources.
Requires Node, tsc, Chromium, Python requests and websocket-client.
Usage: python tools/run_recovery_qa.py --output /absolute/path/to/qa-output
"""
import argparse
import json
from pathlib import Path
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
OLD = "call('Input.dispatchKeyEvent',{'type':'keyDown','code':'ArrowRight','key':'ArrowRight'});time.sleep(6.4);call('Input.dispatchKeyEvent',{'type':'keyUp','code':'ArrowRight','key':'ArrowRight'});time.sleep(.2)"
NEW = """# Observe the real exit rather than assume fixed wall time equals game time.
call('Page.bringToFront')
call('Runtime.evaluate', {'expression': \"document.querySelector('.briefing')?.click()\"})
call('Input.dispatchKeyEvent', {'type':'keyDown','code':'ArrowRight','key':'ArrowRight'})
deadline = time.monotonic() + 25
try:
    while time.monotonic() < deadline:
        moved = evaluate(call, \"Number(document.documentElement.dataset.qaRoom||0)\")
        if moved and moved >= 1:
            break
        time.sleep(.15)
finally:
    call('Input.dispatchKeyEvent', {'type':'keyUp','code':'ArrowRight','key':'ArrowRight'})
time.sleep(.2)"""

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    output = args.output.resolve()
    if output.is_relative_to(ROOT.resolve()):
        raise SystemExit('Choose an output directory outside the original DLC folder.')
    output.mkdir(parents=True, exist_ok=True)
    inventory = json.loads((ROOT / 'RECOVERY_INVENTORY_SHA256.json').read_text())['files']
    with tempfile.TemporaryDirectory(prefix='the-predator-qa-') as temp:
        work = Path(temp)
        for rel, metadata in inventory.items():
            if metadata['origin'] != 'v0.5-original' or rel.startswith('history/'):
                continue
            destination = work / rel
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(ROOT / rel, destination)
        harness = work / 'tools/browser_qa.py'
        source = harness.read_text()
        lines = source.splitlines(keepends=True)
        matches = [i for i, line in enumerate(lines) if OLD in line]
        if len(matches) != 1:
            raise RuntimeError('Unexpected harness revision; refusing an ambiguous patch.')
        i = matches[0]
        indent = lines[i][:len(lines[i]) - len(lines[i].lstrip())]
        if lines[i].strip() != OLD:
            raise RuntimeError('Unexpected transition test line; original kept unchanged.')
        lines[i] = ''.join(indent + line + '\n' for line in NEW.splitlines())
        harness.write_text(''.join(lines))
        shutil.copy2(harness, output / 'browser_qa.corrected.py')
        results = {}
        for label, command in [('node', ['node', 'tests/validate.mjs']),
                               ('browser', ['python3', 'tools/browser_qa.py'])]:
            result = subprocess.run(command, cwd=work, text=True, stdout=subprocess.PIPE,
                                    stderr=subprocess.STDOUT, timeout=300, check=False)
            (output / f'{label}.log').write_text(result.stdout)
            results[label] = result.returncode
        for name in ['BROWSER_QA_RESULTS.json', 'QA_RESULTS.json', 'QA_RESULTS_V0_5.json']:
            path = work / 'docs' / name
            if path.exists():
                shutil.copy2(path, output / name)
        report_path = work / 'docs/BROWSER_QA_RESULTS.json'
        if results['browser'] != 0 or not report_path.exists():
            raise SystemExit('Browser QA failed; inspect output logs.')
        report = json.loads(report_path.read_text())
        if results['node'] != 0 or not report.get('ok'):
            raise SystemExit('QA failed; inspect output logs and report.')
        print(json.dumps({'ok': True, 'sourceModified': False, 'output': str(output),
                          'scenes': report['scenesPassed'],
                          'interactions': sum(bool(item['ok']) for item in report['interactions'])}))

if __name__ == '__main__':
    main()
