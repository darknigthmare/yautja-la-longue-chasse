import hashlib
import importlib.util
import json
import stat
import tempfile
import unittest
import zipfile
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / 'scripts' / 'inspect-enforcer-recovery-zip.py'
SPEC = importlib.util.spec_from_file_location('enforcer_zip', SCRIPT)
SCANNER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(SCANNER)


class RecoveryZipTest(unittest.TestCase):
    def test_reads_stored_and_deflated_proofs_without_extracting(self):
        png = bytes.fromhex('89504e470d0a1a0a')
        digest = hashlib.sha256(png).hexdigest()
        target = {'id': 'fixture-v610', 'bytes': len(png), 'sha256': digest}
        proof = json.dumps({'schemaVersion': SCANNER.CHECKPOINT_SCHEMA, 'assets': []})

        with tempfile.TemporaryDirectory() as root:
            archive = Path(root) / 'originals.zip'
            with zipfile.ZipFile(archive, 'w') as handle:
                handle.writestr('renamed/image.dat', png, zipfile.ZIP_DEFLATED)
                handle.writestr('same-size.dat', b'ignored!')
                handle.writestr('nested/renamed.json', proof, zipfile.ZIP_STORED)
                handle.writestr('other-version.json', '{"schemaVersion":"v612"}')
                handle.writestr('broken.json', '{')
                symlink = zipfile.ZipInfo('not-an-image.dat')
                symlink.create_system = 3
                symlink.external_attr = (stat.S_IFLNK | 0o777) << 16
                handle.writestr(symlink, png)

            result = SCANNER.inspect_zip(archive, [target])
            self.assertEqual(result['originalImages'], [{**target, 'path': 'renamed/image.dat'}])
            self.assertEqual(result['checkpoints'], [{
                'path': 'nested/renamed.json',
                'checkpointSha256': hashlib.sha256(proof.encode()).hexdigest(),
                'document': json.loads(proof),
            }])
            self.assertEqual(result['oversizedJson'], [])
            self.assertEqual(list(Path(root).iterdir()), [archive])

    def test_reports_json_beyond_the_scan_bound(self):
        with tempfile.TemporaryDirectory() as root:
            archive = Path(root) / 'large.zip'
            with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_DEFLATED) as handle:
                handle.writestr('large.json', b' ' * (SCANNER.MAX_JSON_BYTES + 1))
            self.assertEqual(SCANNER.inspect_zip(archive, [])['oversizedJson'], ['large.json'])


if __name__ == '__main__':
    unittest.main()
