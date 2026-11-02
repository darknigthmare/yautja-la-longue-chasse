#!/usr/bin/env python3
"""Read V113 ZIP/XML and compare all appended cells with their exact sources."""
import argparse
import importlib.util
import json
from pathlib import Path
import posixpath
import sys
import xml.etree.ElementTree as E
from zipfile import ZipFile

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('v113_production_source', Path(__file__).with_name('build-open-production-workbook-v113.py'))
build = importlib.util.module_from_spec(spec)
spec.loader.exec_module(build)
MAIN = '{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'
REL = '{http://schemas.openxmlformats.org/officeDocument/2006/relationships}'


def column(index):
    result = ''
    while index:
        index, letter = divmod(index - 1,26)
        result = chr(65 + letter) + result
    return result


def verify_file(data, workbook):
    build.validate_manifest(data)
    with ZipFile(build.local(build.BASELINE['path'])) as original, ZipFile(workbook) as current:
        for name in original.namelist():
            if name not in build.append.ASSEMBLY_PARTS and original.read(name) != current.read(name):
                raise ValueError('Historical workbook ZIP part changed: ' + name)
        book = E.fromstring(current.read('xl/workbook.xml'))
        relations = {r.attrib['Id']:r.attrib['Target'] for r in E.fromstring(current.read('xl/_rels/workbook.xml.rels'))}
        sheets = list(book.find(MAIN+'sheets'))
        if len(sheets) != 130 or [s.attrib['name'] for s in sheets[122:]] != build.SHEET_NAMES:
            raise ValueError('V113 requires122historical sheets and eight explicit appended sheets')
        cells_checked = 0
        for sheet, expected in zip(sheets[122:],build.build_sheets(data),strict=True):
            target = relations[sheet.attrib[REL+'id']]
            target = target.lstrip('/') if target.startswith('/') else posixpath.normpath(posixpath.join('xl',target))
            xml = E.fromstring(current.read(target))
            rows = xml.find(MAIN+'sheetData')
            if len(rows) != len(expected['rows']) + 4:
                raise ValueError('Unexpected V113 data row count: ' + expected['name'])
            actual = {}
            for cell in xml.iter(MAIN+'c'):
                inline = cell.find(MAIN+'is')
                if cell.find(MAIN+'f') is not None:
                    raise ValueError('V113 production rows must be literal, without new formulas')
                actual[cell.attrib['r']] = ''.join(inline.itertext()) if inline is not None else cell.findtext(MAIN+'v','')
            for row_index, row in enumerate(expected['rows'],5):
                for column_index, col in enumerate(expected['columns'],1):
                    ref = column(column_index)+str(row_index)
                    if actual.get(ref) != build.words(row.get(col['key'],'')):
                        raise ValueError('V113 source cell differs: '+expected['name']+'!'+ref)
                    cells_checked += 1
    historical = build.append.verify_workbook({**build.payload(data),'workbookPath':str(workbook)})
    return {'status':'PASS_STRUCTURE_AND_SOURCE_CELLS','worksheets':130,
            'historicalWorksheetsByteIdentical':122,'appendedSourceCellsChecked':cells_checked,
            'newFormulas':0,'sourceRequirementsOpen':56,'artTargetsOpen':354,
            'nativeAttempts':len(data['nativeCandidates']),'humanArtisticValidations':0,
            'nativeExcelExecuted':False,'historicalVerification':historical}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--manifest',default=str(build.MANIFEST))
    parser.add_argument('--workbook',default=str(build.OUTPUT))
    args = parser.parse_args()
    data = json.loads(build.local(args.manifest).read_text())
    result = verify_file(data,build.local(args.workbook))
    print(json.dumps({k:v for k,v in result.items() if k!='historicalVerification'},ensure_ascii=False))


if __name__ == '__main__':
    main()
