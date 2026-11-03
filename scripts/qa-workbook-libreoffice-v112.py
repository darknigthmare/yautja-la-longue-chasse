#!/usr/bin/env python3
"""Optional LibreOffice-only smoke check on disposable copies; never proves Excel."""
import hashlib
from datetime import datetime, timezone
import json
import math
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import xml.etree.ElementTree as ET
import zipfile

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'docs/YAUTJA_V112_MECANIQUES_CHASSE.xlsx'
OUTPUT = ROOT / 'docs/qa/v112-validation-kit/libreoffice-compatibility.json'
NS = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
REL = '{http://schemas.openxmlformats.org/officeDocument/2006/relationships}'


def inspect_workbook(path):
    with zipfile.ZipFile(path) as archive:
        strings = []
        if 'xl/sharedStrings.xml' in archive.namelist():
            strings = [''.join(t.text or '' for t in si.findall('.//m:t', NS))
                       for si in ET.fromstring(archive.read('xl/sharedStrings.xml')).findall('m:si', NS)]
        targets = {r.attrib['Id']: r.attrib['Target'] for r in ET.fromstring(archive.read('xl/_rels/workbook.xml.rels'))}
        sheets = []
        for sheet in ET.fromstring(archive.read('xl/workbook.xml')).find('m:sheets', NS):
            target = targets[sheet.attrib[REL + 'id']]
            filename = target.lstrip('/') if target.startswith('/') else 'xl/' + target
            root = ET.fromstring(archive.read(filename))
            cells = {}
            for cell in root.findall('.//m:sheetData/m:row/m:c', NS):
                value = cell.find('m:v', NS)
                value = value.text if value is not None else ''
                numeric = cell.attrib.get('t', 'n') == 'n'
                if cell.attrib.get('t') == 's':
                    value = strings[int(value)]
                elif cell.attrib.get('t') == 'inlineStr':
                    value = ''.join(t.text or '' for t in cell.findall('.//m:t', NS))
                formula = cell.find('m:f', NS)
                if value or formula is not None:
                    cells[cell.attrib['r']] = {'value': value, 'numeric': numeric, 'formula': formula.text if formula is not None else None}
            relname = str(Path(filename).parent / '_rels' / (Path(filename).name + '.rels'))
            links = {r.attrib['Id']: r.attrib['Target'] for r in ET.fromstring(archive.read(relname))} if relname in archive.namelist() else {}
            hyperlinks = sorted((link.attrib['ref'], links.get(link.attrib.get(REL + 'id'), link.attrib.get('location', '')))
                                for link in root.findall('.//m:hyperlink', NS))
            panes = [{**{'xSplit': '0', 'ySplit': '0'}, **pane.attrib} for pane in root.findall('.//m:pane', NS)]
            auto_filter = root.find('m:autoFilter', NS)
            sheets.append({'name': sheet.attrib['name'], 'cells': cells, 'panes': panes,
                           'filter': auto_filter.attrib if auto_filter is not None else None, 'hyperlinks': hyperlinks})
        return sheets


def main():
    office = shutil.which('soffice') or shutil.which('libreoffice')
    if not office:
        raise SystemExit('LibreOffice absent ; aucune installation ni qualification Excel effectuée.')
    source_hash = hashlib.sha256(SOURCE.read_bytes()).hexdigest()
    version = subprocess.run([office, '--version'], check=True, capture_output=True, text=True, timeout=30).stdout.strip()
    commands = []
    with tempfile.TemporaryDirectory(prefix='yautja-libreoffice-v112-') as temporary:
        work = Path(temporary)
        for folder in ['input', 'xlsx', 'pdf', 'cache']:
            (work / folder).mkdir()
        copied = work / 'input' / SOURCE.name
        shutil.copy2(SOURCE, copied)
        environment = {**os.environ, 'XDG_CACHE_HOME': str(work / 'cache')}
        for kind in ['xlsx', 'pdf']:
            command = [office, '-env:UserInstallation=' + (work / ('profile-' + kind)).as_uri(),
                       '--headless', '--convert-to', kind, '--outdir', str(work / kind), str(copied)]
            executed = subprocess.run(command, check=True, capture_output=True, text=True, env=environment, timeout=60)
            commands.append({'conversion': kind, 'exitCode': executed.returncode,
                             'stdout': executed.stdout.replace(str(work), '<temporary-directory>'),
                             'stderr': executed.stderr.replace(str(work), '<temporary-directory>')})
        before, after = inspect_workbook(copied), inspect_workbook(work / 'xlsx' / SOURCE.name)
        sheets = []
        for original, converted in zip(before, after):
            differences, equivalent_numbers = [], []
            for address in sorted(set(original['cells']) | set(converted['cells'])):
                old, new = original['cells'].get(address), converted['cells'].get(address)
                if old == new:
                    continue
                if old and new and old['numeric'] and new['numeric'] and old['formula'] == new['formula']:
                    try:
                        equal = math.isclose(float(old['value']), float(new['value']), rel_tol=1e-12, abs_tol=1e-15)
                    except (TypeError, ValueError):
                        equal = False
                    if equal:
                        equivalent_numbers.append({'cell': address, 'before': old['value'], 'after': new['value']})
                        continue
                differences.append({'cell': address, 'before': old, 'after': new})
            sheets.append({'name': original['name'], 'sameName': original['name'] == converted['name'],
                           'nonemptyCellsBefore': len(original['cells']), 'nonemptyCellsAfter': len(converted['cells']),
                           'cellDifferences': differences, 'equivalentNumericSerializations': equivalent_numbers,
                           'sameEffectiveFrozenPanes': original['panes'] == converted['panes'],
                           'sameFilterDefinition': original['filter'] == converted['filter'],
                           'hyperlinkCount': len(original['hyperlinks']), 'sameHyperlinkCellsAndDestinations': original['hyperlinks'] == converted['hyperlinks']})
        pdf = work / 'pdf' / SOURCE.with_suffix('.pdf').name
        pdf_info_tool = shutil.which('pdfinfo')
        pdf_info = subprocess.run([pdf_info_tool, str(pdf)], check=True, capture_output=True, text=True, timeout=30).stdout if pdf_info_tool else ''
        pdf_pages = next((int(line.split(':', 1)[1].strip()) for line in pdf_info.splitlines() if line.startswith('Pages:')), None)
        result = {
            'scope': 'LIBREOFFICE_HEADLESS_COMPATIBILITY_ONLY', 'microsoftExcelNativeExecuted': False,
            'executedAtUtc': datetime.now(timezone.utc).isoformat(),
            'sourceGitHead': subprocess.run(['git', 'rev-parse', 'HEAD'], cwd=ROOT, check=True, capture_output=True, text=True, timeout=10).stdout.strip(),
            'sourceWorkbook': str(SOURCE.relative_to(ROOT)), 'sourceWorkbookSha256': source_hash,
            'application': version, 'os': os.uname().sysname + ' ' + os.uname().release,
            'commands': commands, 'sheetCountBefore': len(before), 'sheetCountAfter': len(after), 'sheets': sheets,
            'pdfExport': {'created': pdf.is_file(), 'bytes': pdf.stat().st_size, 'pages': pdf_pages,
                          'allPagesVisuallyReviewed': False, 'nativePrintDialogExercised': False},
            'limits': ['No Microsoft Excel session or repair-dialog verification.',
                       'No human filter use, frozen-pane scrolling or hyperlink click.',
                       'OOXML metadata survival is distinct from interactive use.',
                       'LibreOffice may rewrite hyperlink tooltip/display attributes and numeric serialization.',
                       'No criterion in Restant is closed by this compatibility check.']
        }
        assert len(before) == len(after)
        assert all(s['sameName'] and not s['cellDifferences'] and s['sameEffectiveFrozenPanes'] and s['sameFilterDefinition'] and s['sameHyperlinkCellsAndDestinations'] for s in sheets)
        assert pdf.is_file() and pdf.stat().st_size > 0
        assert hashlib.sha256(SOURCE.read_bytes()).hexdigest() == source_hash, 'Source workbook must remain untouched'
        OUTPUT.parent.mkdir(parents=True, exist_ok=True)
        OUTPUT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
        print(json.dumps({'result': 'OK', 'scope': result['scope'], 'application': version,
                          'sourceWorkbookSha256': source_hash, 'sheetCount': len(before),
                          'nonemptyCells': sum(s['nonemptyCellsBefore'] for s in sheets),
                          'hyperlinks': sum(s['hyperlinkCount'] for s in sheets), 'pdfPages': pdf_pages,
                          'report': str(OUTPUT.relative_to(ROOT))}, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
