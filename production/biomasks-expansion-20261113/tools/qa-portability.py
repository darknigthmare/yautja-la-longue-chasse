#!/usr/bin/env python3
"""Check one relocated pack with private origins masked and independent bad fixtures.

Only temporary copies are mutated. The report must stay outside the repository.
Qualification fixtures test preservation of the frozen source declarations; they
cannot establish canonical truth from a source name or replace artistic review.
"""
from contextlib import contextmanager, redirect_stdout
from copy import deepcopy
import argparse
import builtins
import hashlib
import importlib.util
from io import StringIO
import json
from pathlib import Path
import shutil
import sys
import tempfile

sys.dont_write_bytecode = True
ORIGINAL = Path(__file__).resolve().parents[3]
PACK = 'production/biomasks-expansion-20261113'
PUBLIC = 'public/game/biomasks-expansion-20261113'


def module(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    result = importlib.util.module_from_spec(spec)
    sys.modules[name] = result
    spec.loader.exec_module(result)
    return result


def encoded(value):
    return (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode()


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def main(arguments=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path,
                        default=Path('/tmp/mask-expansion-20261113/portability.json'))
    parser.add_argument('--tmp-dir', type=Path, default=Path('/tmp'))
    args = parser.parse_args(arguments)
    output, tmp_dir = args.output.resolve(), args.tmp_dir.resolve()
    if output.is_relative_to(ORIGINAL) or tmp_dir.is_relative_to(ORIGINAL):
        raise ValueError('Fixtures and report must be outside the repository')
    checks, private_reads, write_attempts, origin_probes = [], [], [], []
    report = {'schemaVersion': 1, 'passed': False,
              'scope': 'One relocated exact selection; simulated absent private origins; independent temporary bad fixtures; no art/canon/runtime approval',
              'qualificationFixtureLimit': 'Qualification mutations test the frozen declarations and deterministic outputs, not independent canonical truth.',
              'negativeChecks': checks}
    stage = 'collect-frozen-inputs'
    try:
        selector = module(ORIGINAL / PACK / 'tools/ci-mask-expansion-inputs.py', 'expansion_selected_files')
        paths, pins = selector.collect()
        selection = selector.check(paths, pins)
        selected = sorted(selector.selected(paths))
        original_digests = {p: digest((ORIGINAL / p).read_bytes()) for p in selected}
        report.update(selection=selection, manifestSha256=original_digests[PUBLIC + '/manifest.json'],
                      harnessSha256=original_digests[PACK + '/tools/qa-portability.py'])
        stage = 'copy-independent-selection'
        relocated = Path(tempfile.mkdtemp(prefix='mask-expansion-relocated-', dir=tmp_dir))
        for relative in selected:
            source, target = ORIGINAL / relative, relocated / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source, target)  # Never use hardlinks, even for unmutated files.
            src_stat, dst_stat = source.stat(), target.stat()
            if (src_stat.st_dev, src_stat.st_ino) == (dst_stat.st_dev, dst_stat.st_ino) or dst_stat.st_nlink != 1:
                raise AssertionError('Fixture must have an independent inode: ' + relative)
        report.update(relocatedRoot=str(relocated), independentCopies=len(selected), hardlinksCreated=0)
        builder = module(relocated / PACK / 'tools/build-mask-expansion.py', 'expansion_relocated_builder')
        original_is_file, original_exists = Path.is_file, Path.exists
        original_path_open, original_builtin_open = Path.open, builtins.open

        def private(path):
            return str(path).startswith('/workspace/generated_images/')

        def masked_is_file(path):
            if private(path):
                origin_probes.append(str(path))
                return False
            return original_is_file(path)

        def masked_exists(path):
            return False if private(path) else original_exists(path)

        def guard(path, mode):
            if private(path):
                private_reads.append(str(path))
                raise AssertionError('Portable verification must not read private ImageGen originals')
            if isinstance(mode, str) and any(c in mode for c in 'wax+'):
                write_attempts.append(str(path))
                raise AssertionError('Read-only verification attempted a write: ' + str(path))

        def path_open(path, mode='r', *args, **kwargs):
            guard(path, mode)
            return original_path_open(path, mode, *args, **kwargs)

        def builtin_open(path, mode='r', *args, **kwargs):
            if not isinstance(path, int):
                guard(path, mode)
            return original_builtin_open(path, mode, *args, **kwargs)

        @contextmanager
        def read_only_portable_environment():
            Path.is_file, Path.exists = masked_is_file, masked_exists
            Path.open, builtins.open = path_open, builtin_open
            try:
                yield
            finally:
                Path.is_file, Path.exists = original_is_file, original_exists
                Path.open, builtins.open = original_path_open, original_builtin_open

        def verify():
            with read_only_portable_environment(), redirect_stdout(StringIO()):
                if builder.main(['--check', '--require-complete']) != 0:
                    raise AssertionError('Builder did not succeed')

        def independent(path, raw):
            if not path.resolve().is_relative_to(relocated):
                raise AssertionError('Mutation escaped the relocated fixture')
            if path.exists():
                path.unlink()  # Keep this even though initial copies are already independent.
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(raw)
            if path.stat().st_nlink != 1:
                raise AssertionError('Mutated fixture acquired a shared hardlink')

        @contextmanager
        def changed(relative, raw):
            target = relocated / relative
            old = target.read_bytes()
            independent(target, raw)
            try:
                yield
            finally:
                independent(target, old)

        def rejected(name, fragments):
            if isinstance(fragments, str):
                fragments = (fragments,)
            try:
                verify()
            except Exception as error:
                diagnostic = str(error)
                if not any(fragment in diagnostic for fragment in fragments):
                    raise AssertionError(name + ': unexpected rejection: ' + diagnostic) from error
                checks.append({'name': name, 'passed': True, 'diagnostic': diagnostic})
                print(json.dumps({'negativeCheck': name, 'passed': True}), flush=True)
            else:
                raise AssertionError('Negative fixture unexpectedly passed: ' + name)

        accepted_path, index_path = PACK + '/inputs/accepted-outputs.json', PACK + '/inputs/available-designs.json'
        accepted = json.loads((relocated / accepted_path).read_bytes())
        index = json.loads((relocated / index_path).read_bytes())
        a_rows, b_rows = accepted['originalGenerations'], accepted['entries']
        a_by_id = {r['id']: r for r in a_rows}
        copied = [r for r in index['targets'] if r['versionAMode'] == 'source-copy']
        generated_a, generated_b = a_rows[0], b_rows[0]
        generated_pair_b = next(r for r in b_rows if r['id'] in a_by_id)
        generated_pair_a = a_by_id[generated_pair_b['id']]
        private_origins = {r['nativeSourcePath'] for r in a_rows + b_rows}
        report['privateNativeOriginsMasked'] = len(private_origins)
        stage = 'portable-baseline'
        verify()
        report['portableBaselinePassed'] = True
        stage = 'negative-fixtures'
        protected = json.loads((relocated / PACK / 'suivi/source-protection.json').read_bytes())
        old_workbook = next(r['path'] for r in protected['files'] if r['path'].endswith('.xlsx'))
        copy_path = PUBLIC + '/originals/' + copied[0]['id'] + '.png'
        for name, relative, fragment in [
            ('Exact A capture byte mutation rejected', copy_path, 'Exact reference copy required'),
            ('Native generated A byte mutation rejected', generated_a['assetPath'], 'Generated native bytes'),
            ('Native generated B byte mutation rejected', generated_b['assetPath'], 'Generated native bytes'),
            ('Official photograph R byte mutation rejected', generated_a['referenceSourcePath'], 'source'),
            ('Protected historical XLSX byte mutation rejected', old_workbook, 'Pinned source changed'),
        ]:
            with changed(relative, (relocated / relative).read_bytes() + b'negative-fixture'):
                rejected(name, fragment)

        def revised_row(field, base, updates):
            revised = deepcopy(accepted)
            next(r for r in revised[field] if r['id'] == base['id']).update(updates)
            receipt_path = base['generationReceipt']
            receipt = json.loads((relocated / receipt_path).read_bytes())
            receipt_row = next(r for r in receipt['entries'] if r['id'] == base['id'] and r.get('version', 'B') == base['version'])
            receipt_row.update(updates)
            return revised, receipt_path, receipt

        for flag in ('canonCertified', 'humanArtValidated', 'runtimeIntegrated'):
            invalid = deepcopy(accepted)
            invalid['entries'][0][flag] = True
            with changed(accepted_path, encoded(invalid)):
                rejected('Automatic ' + flag + ' in accepted output rejected', 'Automatic approval forbidden')
            receipt_path = generated_b['generationReceipt']
            receipt = json.loads((relocated / receipt_path).read_bytes())
            next(r for r in receipt['entries'] if r['id'] == generated_b['id'] and r.get('version', 'B') == 'B')[flag] = True
            with changed(receipt_path, encoded(receipt)):
                rejected('Automatic ' + flag + ' in generation receipt rejected', 'Automatic approval forbidden')

        # Pixels, public path, accepted metadata and byte pins stay unchanged.
        # Only the receipt claims a different private ImageGen origin.
        receipt_path = generated_b['generationReceipt']
        receipt = json.loads((relocated / receipt_path).read_bytes())
        next(r for r in receipt['entries'] if r['id'] == generated_b['id'] and r.get('version', 'B') == 'B')['nativeSourcePath'] = '/workspace/generated_images/false-origin-fixture.png'
        with changed(receipt_path, encoded(receipt)):
            rejected('False private origin in receipt rejected with unchanged pixels and accepted metadata',
                     ('Receipt lineage differs', 'origin'))

        provisional = next(r for r in index['targets'] if r.get('requiredBQualification'))
        provisional_b = next(r for r in b_rows if r['id'] == provisional['id'])
        invalid, rp, receipt = revised_row('entries', provisional_b,
            {'geometryDeviationOpen': False, 'productionReady': True,
             'selectionStatus': 'candidate', 'rejectedForFaithfulRelease': False})
        with changed(accepted_path, encoded(invalid)), changed(rp, encoded(receipt)):
            rejected('Provisional B cannot be promoted with unchanged pixels and consistent metadata',
                     'Frozen provisional artistic qualification changed')

        other_a = next(r for r in a_rows if r['id'] != generated_pair_a['id'])
        invalid, rp, receipt = revised_row('entries', generated_pair_b,
            {'sourceAPath': other_a['assetPath'], 'sourceASha256': other_a['sha256']})
        with changed(accepted_path, encoded(invalid)), changed(rp, encoded(receipt)):
            rejected('B linked to the real A of another identity rejected', 'lineage')

        other_r = next(r for r in a_rows if r['referenceSourcePath'] != generated_a['referenceSourcePath'])
        invalid, rp, receipt = revised_row('originalGenerations', generated_a,
            {'referenceSourcePath': other_r['referenceSourcePath'], 'referenceSourceSha256': other_r['referenceSourceSha256'],
             'referenceSources': other_r['referenceSources']})
        with changed(accepted_path, encoded(invalid)), changed(rp, encoded(receipt)):
            rejected('A linked to a real R photograph of another identity rejected', 'lineage')

        invalid = deepcopy(accepted)
        invalid['originalGenerations'][0]['version'] = 'B'
        with changed(accepted_path, encoded(invalid)):
            rejected('Inverted A/B generation version rejected', 'Explicit generation version')

        raw = (relocated / generated_pair_a['assetPath']).read_bytes()
        updates = {'sha256': digest(raw), 'bytes': len(raw), 'nativeDimensions': generated_pair_a['nativeDimensions']}
        invalid, rp, receipt = revised_row('entries', generated_pair_b, updates)
        with changed(generated_pair_b['assetPath'], raw), changed(accepted_path, encoded(invalid)), changed(rp, encoded(receipt)):
            rejected('A copied as a new B rejected with consistent receipt/hash metadata', ('reused', 'distinct new generation'))

        # Borrow an existing opaque RGB capture; no raster conversion/editing is used.
        # Its identity differs from the generated B target, so B=A is not this failure.
        raw = (relocated / copied[0]['sourcePath']).read_bytes()
        invalid, rp, receipt = revised_row('entries', generated_pair_b,
            {'sha256': digest(raw), 'bytes': len(raw), 'nativeDimensions': [256, 257]})
        with changed(generated_pair_b['assetPath'], raw), changed(accepted_path, encoded(invalid)), changed(rp, encoded(receipt)):
            rejected('Opaque RGB B rejected with consistent receipt/hash metadata', 'requires native RGBA PNG')

        invalid = deepcopy(accepted)
        next(r for r in invalid['entries'] if r['id'] == generated_pair_b['id'])['nativeSourcePath'] = generated_pair_a['nativeSourcePath']
        with changed(accepted_path, encoded(invalid)):
            rejected('Distinct A/B bytes cannot share one private native origin', 'distinct native ImageGen origin')

        invalid, rp, receipt = revised_row('originalGenerations', generated_a, {'referenceSources': []})
        with changed(accepted_path, encoded(invalid)), changed(rp, encoded(receipt)):
            rejected('Missing exact R photographs in A lineage rejected', 'exact R photographs')

        invalid = deepcopy(index)
        invalid['targets'].append(deepcopy(invalid['targets'][0]))
        with changed(index_path, encoded(invalid)):
            rejected('Duplicated source identity rejected', 'Duplicate identities')

        invalid = deepcopy(index)
        target = next(r for r in invalid['targets'] if r['id'] == copied[0]['id'])
        texture = next(r for r in target['referenceSources'] if r['path'].endswith('.texture'))
        raw = bytearray((relocated / texture['path']).read_bytes())
        raw[84:88] = b'DXT1'
        texture['sha256'] = digest(raw)
        with changed(index_path, encoded(invalid)), changed(texture['path'], bytes(raw)):
            rejected('Changed DDS qualification rejected with a revised source pin', 'DDS proof')

        for kind in ('prototype', 'partial'):
            invalid = deepcopy(index)
            if kind == 'prototype':
                target = next((r for r in invalid['targets'] if r['sourceClass'] == 'official-photo-prototype'), None)
                if target:
                    target['sourceClass'] = 'official-photo'
            else:
                target = next((r for r in invalid['targets'] if r.get('partialReferenceView')), None)
                if target:
                    target['partialReferenceView'] = False
            if target:
                with changed(index_path, encoded(invalid)):
                    rejected('Frozen ' + kind + ' qualification cannot be silently promoted', 'Deterministic output differs')

        extra = relocated / PUBLIC / 'unregistered.png'
        independent(extra, (relocated / generated_b['assetPath']).read_bytes())
        try:
            rejected('Unregistered public image rejected', 'Unregistered public files')
        finally:
            extra.unlink()

        verifier = relocated / PACK / 'tools/verify-mask-expansion.py'
        for flag in ('--write', '--freeze-sources'):
            previous = sys.argv
            try:
                sys.argv = [str(verifier), flag]
                try:
                    with read_only_portable_environment(), redirect_stdout(StringIO()):
                        exec(compile(verifier.read_text(), str(verifier), 'exec'),
                             {'__name__': '__main__', '__file__': str(verifier)})
                except SystemExit as error:
                    if 'Read-only' not in str(error):
                        raise
                    checks.append({'name': 'Read-only verifier rejects ' + flag, 'passed': True})
                else:
                    raise AssertionError('Read-only verifier accepted ' + flag)
            finally:
                sys.argv = previous

        stage = 'restore-and-check-originals'
        verify()
        if private_reads or write_attempts:
            raise AssertionError('Private reads or writes were attempted')
        if set(origin_probes) != private_origins:
            raise AssertionError('Not every recorded private origin was masked')
        for relative, expected in original_digests.items():
            if digest((ORIGINAL / relative).read_bytes()) != expected:
                raise AssertionError('Original source changed: ' + relative)
            if digest((relocated / relative).read_bytes()) != expected:
                raise AssertionError('Temporary source was not restored: ' + relative)
        selector.check(paths, pins)
        report.update(passed=True, privateReadsAttempted=0, readOnlyWriteAttempts=0,
                      originExistenceProbes=len(origin_probes), fixtureSelectionRestoredByteExactly=True,
                      sourceMutationsUsedIndependentUnlinkedFixtures=True, historicalSourcesChanged=False,
                      originalSelectedFilesUnchanged=True)
    except BaseException as error:
        report.update(errorStage=stage, errorType=type(error).__name__, error=str(error),
                      privateReadsAttempted=len(private_reads), readOnlyWriteAttempts=len(write_attempts))
        raise
    finally:
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_bytes(encoded(report))
        print(json.dumps({'passed': report['passed'], 'negativeChecks': len(checks),
                          'selection': report.get('selection'), 'output': str(output)}, ensure_ascii=False), flush=True)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
