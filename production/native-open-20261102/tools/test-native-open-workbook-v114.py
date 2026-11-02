#!/usr/bin/env python3
"""Bounded corruption tests for immutable source tracking and admission boundaries."""
import copy
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest
import xml.etree.ElementTree as E
from zipfile import ZipFile

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('verify_v114_native',Path(__file__).with_name('verify-native-open-workbook-v114.py'))
verify = importlib.util.module_from_spec(spec)
spec.loader.exec_module(verify)
build = verify.build

class NativeProductionTrackingTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = json.loads(build.local(str(build.MANIFEST)).read_text())
        cls.workbook = build.local(str(build.OUTPUT))

    def test_native_archive_and_source_cells(self):
        result = verify.verify_file(self.data,self.workbook)
        self.assertEqual(result['historicalWorksheetsByteIdentical'],130)
        self.assertEqual(result['pixelVerification']['nativePngsChecked'],43)

    def test_reproducible_append(self):
        self.assertEqual(build.append.build_workbook(build.payload(self.data)),self.workbook.read_bytes())

    def test_historical_workbook_cannot_be_an_output(self):
        with self.assertRaisesRegex(ValueError,'only its dedicated new workbook'):
            build.generate(output=build.BASELINE['path'])

    def test_no_closure_human_or_victim_admission(self):
        for field in ['sourceCompletion','humanValidated']:
            with self.subTest(field=field):
                data = copy.deepcopy(self.data);data[field] = True
                with self.assertRaises(ValueError): build.validate_manifest(data,False)
        data = copy.deepcopy(self.data);data['pitCandidates'][0]['victimEntityAdmitted'] = True
        with self.assertRaises(ValueError): build.validate_manifest(data,False)

    def test_rejected_barrier_and_pit_cannot_be_promoted(self):
        for category in ['homeworldCandidates','pitCandidates']:
            with self.subTest(category=category):
                data = copy.deepcopy(self.data)
                next(row for row in data[category] if row['selected'] is False)['selected'] = True
                with self.assertRaises(ValueError): build.validate_manifest(data,False)

    def test_ids_duplicate_attempts_and_nonportable_paths_rejected(self):
        mutations = [lambda d:d['homeworldCandidates'].__setitem__(4,copy.deepcopy(d['homeworldCandidates'][5])),
                     lambda d:d['homeworldCandidates'][4].__setitem__('targetId','target-v81-NOT-A-SOURCE'),
                     lambda d:d['homeworldCandidates'][4].__setitem__('path','../outside.png')]
        for mutation in mutations:
            with self.subTest(mutation=mutation):
                data = copy.deepcopy(self.data);mutation(data)
                with self.assertRaises(ValueError): build.validate_manifest(data,False)

    def test_changed_native_pin_is_rejected(self):
        data = copy.deepcopy(self.data);data['homeworldCandidates'][4]['sha256'] = '0'*64
        with self.assertRaisesRegex(ValueError,'Pinned bytes changed'):
            build.validate_manifest(data)

    def corrupted_workbook(self,name,mutate):
        temporary = tempfile.TemporaryDirectory(prefix='v114-corruption-')
        self.addCleanup(temporary.cleanup)
        target = Path(temporary.name)/'corrupt.xlsx'
        with ZipFile(self.workbook) as source,ZipFile(target,'w') as output:
            for info in source.infolist():
                data = source.read(info.filename)
                output.writestr(info,mutate(data) if info.filename==name else data)
        return target

    def test_appended_source_cell_corruption_is_rejected(self):
        def mutate(raw):
            root = E.fromstring(raw)
            root.find(verify.MAIN+'sheetData').find(verify.MAIN+'row[@r="5"]').find(verify.MAIN+'c').find(verify.MAIN+'is').find(verify.MAIN+'t').text = 'CORRUPTED'
            return E.tostring(root)
        target = self.corrupted_workbook('xl/worksheets/v114-sheet-131.xml',mutate)
        with self.assertRaisesRegex(ValueError,'V114 source cell differs'):
            verify.verify_file(self.data,target,False)

    def test_visible_title_corruption_is_rejected(self):
        def mutate(raw):
            root = E.fromstring(raw)
            root.find(verify.MAIN+'sheetData').find(verify.MAIN+'row[@r="1"]').find(verify.MAIN+'c').find(verify.MAIN+'is').find(verify.MAIN+'t').text = 'FALSE TITLE'
            return E.tostring(root)
        target = self.corrupted_workbook('xl/worksheets/v114-sheet-131.xml',mutate)
        with self.assertRaisesRegex(ValueError,'canonical title,headers or worksheet metadata'):
            verify.verify_file(self.data,target,False)

    def test_historical_xml_corruption_is_rejected(self):
        with ZipFile(self.workbook) as archive:
            name = next(name for name in archive.namelist() if name.startswith('xl/worksheets/') and 'v114-' not in name)
        target = self.corrupted_workbook(name,lambda raw:raw+b'\n')
        with self.assertRaisesRegex(ValueError,'Historical ZIP part changed'):
            verify.verify_file(self.data,target,False)

if __name__=='__main__':
    unittest.main(verbosity=2)
