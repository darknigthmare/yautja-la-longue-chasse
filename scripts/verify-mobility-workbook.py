#!/usr/bin/env python3
"""Read-only OOXML verification of the delivered mobility production workbook.

Uses only the standard library; does not modify or regenerate a spreadsheet.
The editable XLSX was authored with artifact_tool. Historical data remain intact.
"""
from __future__ import annotations

import hashlib
import json
import re
import sys
import zipfile
from pathlib import Path, PurePosixPath
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / 'production/mobility-20261108/workbook-manifest.json'
NS = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
      'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}
REL = '{http://schemas.openxmlformats.org/package/2006/relationships}Relationship'
ERRORS = {'#REF!', '#DIV/0!', '#VALUE!', '#NAME?', '#N/A', '#NUM!', '#NULL!'}


def require(ok: bool, message: str) -> None:
    if not ok:
        raise ValueError(message)


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read_book(path: Path) -> dict:
    with zipfile.ZipFile(path) as archive:
        require(archive.testzip() is None, f'Invalid ZIP CRC: {path}')
        require(sum(i.file_size for i in archive.infolist()) < 30_000_000, 'Unexpected expanded workbook size')
        shared = []
        if 'xl/sharedStrings.xml' in archive.namelist():
            shared = [''.join(el.itertext()) for el in ET.fromstring(archive.read('xl/sharedStrings.xml')).findall('s:si', NS)]
        links = {e.attrib['Id']: e.attrib['Target'] for e in ET.fromstring(archive.read('xl/_rels/workbook.xml.rels')).findall(REL)}
        sheets = {}
        for sheet in ET.fromstring(archive.read('xl/workbook.xml')).findall('s:sheets/s:sheet', NS):
            target = links[sheet.attrib['{' + NS['r'] + '}id']]
            member = target.lstrip('/') if target.startswith('/') else str(PurePosixPath('xl') / target)
            require('..' not in PurePosixPath(member).parts, 'Unsafe sheet target')
            xml = ET.fromstring(archive.read(member))
            cells, formulas, cached = {}, {}, {}
            for cell in xml.findall('.//s:sheetData/s:row/s:c', NS):
                address = cell.attrib['r']
                kind = cell.attrib.get('t')
                value = cell.findtext('s:v', None, NS)
                if kind == 's':
                    value = shared[int(value)]
                elif kind == 'inlineStr':
                    value = ''.join(cell.find('s:is', NS).itertext())
                elif kind == 'b':
                    value = value == '1'
                elif value is not None and kind not in ('str', 'e'):
                    value = float(value)
                    if value.is_integer():
                        value = int(value)
                formula = cell.findtext('s:f', None, NS)
                require(kind != 'e' and (not isinstance(value, str) or value not in ERRORS), f'Excel error: {sheet.attrib["name"]}!{address} {value}')
                if formula is not None:
                    require(value is not None, f'Uncalculated formula: {sheet.attrib["name"]}!{address}')
                    formulas[address] = formula
                    cached[address] = value
                    cells[address] = ('f', formula)
                elif value is not None and value != '':
                    cells[address] = ('v', value)
            sheets[sheet.attrib['name']] = {'cells': cells, 'formulas': formulas, 'cached': cached,
                'frozen': xml.find('.//s:pane[@state="frozen"]', NS) is not None,
                'table_count': len(xml.findall('s:tableParts/s:tablePart', NS))}
        return sheets


def main() -> None:
    manifest = json.loads(MANIFEST.read_text())
    path = ROOT / manifest['file']
    historical = ROOT / manifest['historical_workbook']
    require(path.stat().st_size == manifest['bytes'] and digest(path) == manifest['sha256'], 'Delivered workbook byte/hash mismatch')
    require(digest(historical) == manifest['historical_workbook_sha256'], 'Historical workbook changed')
    old, current = read_book(historical), read_book(path)
    require(list(current) == manifest['sheets'] and len(current) == 22, 'Sheet names/count changed')
    preserved = 0
    for name, data in old.items():
        for address, expected in data['cells'].items():
            require(current[name]['cells'].get(address) == expected, f'Historical value changed: {name}!{address}')
            preserved += 1
    require(preserved == manifest['historical_nonempty_cells_preserved'] == 2428, 'Historical coverage mismatch')
    for name, info in manifest['new_sheet_inventory'].items():
        if info.get('summary'):
            continue
        data = current[name]
        count = sum(bool(re.fullmatch(r'A\d+', cell)) and int(cell[1:]) >= 6 for cell in data['cells'])
        require(count == info['data_rows'], f'Wrong row count: {name}: {count}')
        require(data['frozen'] and data['table_count'] >= 1, f'Missing frozen header/filter table: {name}')
    catalogue = []
    for file in ('01-10.json', '11-20.json', '21-30.json', '31-40.json', '41-50.json'):
        catalogue.extend(json.loads((ROOT / 'docs/campagne/mobilite/catalogue' / file).read_text()))
    ids = [current['Modeles_50']['cells'][f'B{r}'][1] for r in range(6, 56)]
    require(ids == [e['id'] for e in catalogue] and len(set(ids)) == 50, 'Catalogue identity/order mismatch')
    for name in ('Sprites_independants', 'Animations', 'Sons', 'VFX', 'Modules_machine', 'Equipements_montures'):
        requirements = [v[1] for key, v in current[name]['cells'].items() if re.fullmatch(r'A\d+', key) and int(key[1:]) >= 6]
        require(len(requirements) == len(set(requirements)), f'Duplicate requirement IDs: {name}')
    counts = {name: len(sheet['formulas']) for name, sheet in current.items()}
    require(sum(counts.values()) == manifest['formula_count'] == 778, 'Formula count mismatch')
    require(counts['Stats'] == 350 and counts['Modules_machine'] == 408, 'Stats/upgrade formulas missing')
    expected_summary = {'A7': 50, 'C7': 40, 'E7': 1, 'G7': 2, 'E12': 906, 'G12': 40,
        'E13': 1671, 'G13': 0, 'E14': 400, 'G14': 0, 'E15': 350, 'G15': 0,
        'G21': 120, 'G22': 19, 'G23': 18}
    for cell, expected in expected_summary.items():
        require(current['Synthese_V1']['cached'][cell] == expected, f'Incorrect dashboard value: {cell}')
    print(json.dumps({'passed': True, 'workbook_sha256': manifest['sha256'], 'sheets': 22,
        'preserved_historical_cells': preserved, 'formula_count': sum(counts.values()),
        'model_count': 50, 'independent_sprite_requirements': 906, 'animation_requirements': 1671,
        'dedicated_audio_requirements': 400, 'dedicated_vfx_requirements': 350,
        'formula_errors': 0, 'cached_summary_values_checked': len(expected_summary),
        'scope': 'Read-only document, inventory and cached formula verification; not a gameplay or artistic certification.'}, ensure_ascii=False))


if __name__ == '__main__':
    try:
        main()
    except (ValueError, KeyError, OSError, zipfile.BadZipFile) as error:
        print(f'Mobility workbook verification failed: {error}', file=sys.stderr)
        raise SystemExit(1) from error
