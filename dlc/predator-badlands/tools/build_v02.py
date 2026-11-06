#!/usr/bin/env python3
"""Build an offline HTML from committed sources without touching v0.1 or fetching data."""
from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
V2 = ROOT / 'v0.2.0'

def build() -> bytes:
    html = (V2 / 'JOUER_PREDATOR_BADLANDS.html').read_text(encoding='utf-8')
    css = '<link rel="stylesheet" href="styles/badlands.css">'
    if html.count(css) != 1:
        raise ValueError('Stylesheet marker mismatch')
    html = html.replace(css, '<style>' + (V2 / 'styles/badlands.css').read_text(encoding='utf-8') + '</style>')
    for name in ['../v0.1.0/src/badlands-data.js', 'src/data.js', 'src/core.js', 'src/browser.js']:
        marker = f'<script src="{name}"></script>'
        if html.count(marker) != 1:
            raise ValueError(f'Script marker mismatch: {name}')
        code = (V2 / name).read_text(encoding='utf-8').replace('</script', '<\\/script')
        if name == 'src/browser.js':
            art = {p.stem: p.read_text(encoding='utf-8') for p in sorted((ROOT / 'v0.1.0/assets/svg').glob('*.svg'))}
            if len(art) != 18:
                raise ValueError('18 original SVGs required')
            code = 'globalThis.BADLANDS_ART = ' + json.dumps(art, ensure_ascii=False) + ';\n' + code
        html = html.replace(marker, '<script>\n' + code + '\n</script>')
    return html.encode('utf-8')

def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    content = build()
    target = V2 / 'JOUER_PREDATOR_BADLANDS_STANDALONE.html'
    if args.check:
        if not target.exists() or target.read_bytes() != content:
            raise SystemExit('Standalone missing or stale: run build_v02.py')
    else:
        target.write_bytes(content)
    print(json.dumps({'bytes': len(content), 'sha256': hashlib.sha256(content).hexdigest(), 'check': args.check}))

if __name__ == '__main__':
    main()
