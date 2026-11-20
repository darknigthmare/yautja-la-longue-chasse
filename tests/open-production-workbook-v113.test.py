"""V113 provenance boundaries and actual workbook corruption regressions."""
import copy
import importlib.util
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest import mock
import xml.etree.ElementTree as E
from zipfile import ZipFile,ZIP_STORED

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('v113_independent_reader',ROOT/'scripts/verify-open-production-workbook-v113.py')
verify = importlib.util.module_from_spec(spec)
spec.loader.exec_module(verify)
build = verify.build


class ProductionWorkbookV113(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = json.loads(build.local(str(build.MANIFEST)).read_text())
        build.validate_manifest(cls.data)
        cls.workbook = build.append.build_workbook(build.payload(cls.data))
        cls.temp = tempfile.TemporaryDirectory(prefix='v113-production-test-')
        cls.original = Path(cls.temp.name)/'original.xlsx'
        cls.original.write_bytes(cls.workbook)

    @classmethod
    def tearDownClass(cls):
        cls.temp.cleanup()

    def changed_cell(self,part,cell,text):
        result = io.BytesIO()
        with ZipFile(io.BytesIO(self.workbook)) as archive,ZipFile(result,'w',compression=ZIP_STORED) as changed:
            for name in archive.namelist():
                raw = archive.read(name)
                if name == part:
                    tree = E.fromstring(raw)
                    if cell:
                        selected = tree.find('.//'+verify.MAIN+'c[@r="'+cell+'"]/'+verify.MAIN+'is/'+verify.MAIN+'t')
                    else:
                        selected = next(item for item in tree.iter(verify.MAIN+'t') if item.text)
                    self.assertIsNotNone(selected)
                    selected.text = text
                    raw = E.tostring(tree,encoding='utf-8',xml_declaration=True)
                changed.writestr(name,raw)
        file = Path(self.temp.name)/((cell or 'historical')+'.xlsx')
        file.write_bytes(result.getvalue())
        return file

    def test_source_boundaries_and_all_appended_cells(self):
        checked = verify.verify_file(self.data,self.original)
        self.assertEqual(checked['worksheets'],130)
        self.assertEqual(checked['historicalWorksheetsByteIdentical'],122)
        self.assertGreater(checked['appendedSourceCellsChecked'],4000)
        self.assertEqual(checked['sourceRequirementsOpen'],56)
        self.assertEqual(checked['humanArtisticValidations'],0)

    def test_generation_cannot_close_requirements_or_claim_validation(self):
        mutations = [lambda d:d.update(sourceCompletion=True),
                     lambda d:d['closedSourceIds'].append(d['sourceRequirements'][0]['id']),
                     lambda d:d['nativeCandidates'][0].update(humanValidated=True),
                     lambda d:d['nativeCandidates'][0].update(runtimeIntegrated=True),
                     lambda d:d['nativeCandidates'][0].update(status='CANDIDAT_TECHNIQUE_NON_INTEGRE'),
                     lambda d:d['sourceRequirements'][0].update(source=d['sourceRequirements'][1]['source']),
                     lambda d:d['sourceRequirements'][0].update(id=d['sourceRequirements'][1]['id'])]
        for mutate in mutations:
            with self.subTest(mutation=mutations.index(mutate)):
                data = copy.deepcopy(self.data)
                mutate(data)
                with self.assertRaises(ValueError):
                    build.validate_manifest(data,check_files=False)

    def test_valid_xml_historical_cell_mutation_is_rejected(self):
        # The V112 summary uses literal text; older source sheets may instead
        # refer to a shared-string table and contain no inline text nodes.
        first = 'xl/worksheets/v112-sheet-114.xml'
        changed = self.changed_cell(first,None,'HISTORIQUE ALTERE')
        with self.assertRaisesRegex(ValueError,'Historical workbook ZIP part changed: '+first):
            verify.verify_file(self.data,changed)

    def test_new_source_cell_forgery_is_rejected(self):
        changed = self.changed_cell('xl/worksheets/v113-sheet-124.xml','A5','FAUSSE EXIGENCE')
        with self.assertRaisesRegex(ValueError,'V113 source cell differs: OuvertsSourceV113!A5'):
            verify.verify_file(self.data,changed)

    def test_historical_git_fallback_preserves_old_bytes_but_new_products_stay_strict(self):
        reference = next(p for p in self.data['sourceInputs'] if p['context']=='SNAPSHOT_HISTORIQUE' and p['path'].startswith('app/'))
        expected = build.local(reference['path']).read_bytes()
        original_reader = Path.read_bytes

        def changed_current(path):
            return b'SIMULATED FUTURE RUNTIME SOURCE' if path == build.local(reference['path']) else original_reader(path)

        with mock.patch.object(Path,'read_bytes',changed_current):
            self.assertEqual(build.read_source_input(reference),expected)

        current = next(p for p in self.data['sourceInputs'] if p['context']=='CURRENT_V113_PRODUCT_STRICT')

        def changed_product(path):
            return b'CHANGED CURRENT PRODUCT' if path == build.local(current['path']) else original_reader(path)

        with mock.patch.object(Path,'read_bytes',changed_product), mock.patch.object(build,'read_git_reference',side_effect=AssertionError('Current products must never fall back')):
            with self.assertRaisesRegex(ValueError,'New V113 product must retain its current exact bytes'):
                build.read_source_input(current)


if __name__ == '__main__':
    unittest.main(verbosity=2)
