#!/usr/bin/env python3
"""Check the V6.14 public records for private transport metadata before publishing."""
from pathlib import Path
import gzip
import hashlib
import json
import re

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'docs/suivi-production/v614'
OUTPUT = BASE / 'validation/public-record-final-check.json'
PATTERNS = {
    'absolute_private_path': re.compile(r'/(?:workspace|root|tmp|mnt)/(?!\.\.)[^\s<>\"\']+'),
    'transport_reference': re.compile(r'authfile:|file://(?:/|[A-Za-z]:)', re.I),
    'signed_url': re.compile(r'[?&](?:token|signature|x-goog-signature|x-amz-signature)=', re.I),
    'credential': re.compile(r'(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|Bearer\s+[A-Za-z0-9_.-]{20,})'),
}

def strings(value, location='$'):
    if isinstance(value, dict):
        for key, item in value.items():
            yield from strings(item, f'{location}.{key}')
    elif isinstance(value, list):
        for index, item in enumerate(value):
            yield from strings(item, f'{location}[{index}]')
    elif isinstance(value, str):
        yield location, value

def main():
    checked, failures = [], []
    for file in sorted(BASE.rglob('*')):
        if not file.is_file() or file == OUTPUT:
            continue
        if file.name.endswith('.json.gz'):
            records = strings(json.loads(gzip.decompress(file.read_bytes())))
        elif file.suffix == '.json':
            records = strings(json.loads(file.read_text()))
        elif file.suffix == '.ndjson':
            records = ((location, value) for number, line in enumerate(file.read_text().splitlines(), 1)
                       if line.strip() for location, value in strings(json.loads(line), f'$line[{number}]'))
        elif file.suffix in {'.md', '.html'}:
            records = [('$text', file.read_text())]
        else:
            continue
        relative = file.relative_to(ROOT).as_posix()
        for location, value in records:
            for category, pattern in PATTERNS.items():
                if pattern.search(value):
                    failures.append({'file': relative, 'location': location, 'category': category})
        checked.append({'path': relative, 'sha256': hashlib.sha256(file.read_bytes()).hexdigest()})
    report = {'schemaVersion': 'yautja-v614-public-record-final-check-1',
              'passed': not failures, 'scopeFR': 'Textes, JSON, NDJSON et JSON gzip du dossier V6.14. Les valeurs détectées ne sont pas recopiées dans le rapport.',
              'checkedFiles': checked, 'failures': failures}
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'passed': report['passed'], 'checkedFiles': len(checked), 'failures': failures}, ensure_ascii=False))
    if failures:
        raise SystemExit(1)

if __name__ == '__main__':
    main()
