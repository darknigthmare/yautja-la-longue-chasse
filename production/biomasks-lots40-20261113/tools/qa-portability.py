#!/usr/bin/env python3
"""Exercise one relocated neutral pack and a small set of independent bad fixtures.

The full independent production formula pass belongs to verify-neutral-pixels.py.
Here pixel/status negatives explicitly select one representation; Node only
encodes temporary fixture PNGs. No image or metadata in the source repo is edited.
"""
import argparse
import builtins
from contextlib import contextmanager, redirect_stdout
from copy import deepcopy
import hashlib
import importlib.util
from io import StringIO
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
from time import perf_counter

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[3]
TMP = Path('/tmp/mask-lots40-20261113')
PACK = 'production/biomasks-lots40-20261113'
PUBLIC = 'public/game/biomasks-lots40-20261113'
MANIFEST = PUBLIC + '/manifest.json'
INVENTORY = PACK + '/inputs/production-inventory.json'
ACCEPTED = PACK + '/inputs/accepted-new-masks.json'
DERIVATIONS = PACK + '/generation/neutral-derivations.json'
CANDIDATES = PACK + '/inputs/candidate-inventory.json'

# A tiny PNG fixture encoder, independent of the neutralizer and its luma formula.
# Python only decodes the existing copy; all fixture edits/encoding occur in Node.
NODE_FIXTURE = r'''
const fs=require('node:fs'),z=require('node:zlib');
const c=JSON.parse(process.argv[1]);let raw=fs.readFileSync(0),w=c.width,h=c.height,index=0;
if(raw.length!==w*h*4)throw Error('RGBA fixture input length');
if(c.kind==='dimensions'){
 const out=Buffer.alloc((w-1)*h*4);for(let y=0;y<h;y++)raw.copy(out,y*(w-1)*4,y*w*4,y*w*4+(w-1)*4);raw=out;w--;
}else{
 while(index<raw.length/4&&raw[index*4+3]!==0)index++;
 if(index===raw.length/4)throw Error('Fixture needs an alpha0 pixel');const p=index*4;
 if(c.kind==='alpha')raw[p+3]=1;
 else if(c.kind==='nonmonochrome')raw[p]=(raw[p]+1)&255;
 else if(c.kind==='wrong-gray'){const v=(raw[p]+1)&255;raw[p]=raw[p+1]=raw[p+2]=v;}
 else throw Error('Unknown fixture mutation');
}
function crc(b){let v=0xffffffff;for(const n of b){v^=n;for(let i=0;i<8;i++)v=(v>>>1)^((v&1)?0xedb88320:0);}return(v^0xffffffff)>>>0;}
function chunk(name,data){const t=Buffer.from(name),r=Buffer.alloc(data.length+12);r.writeUInt32BE(data.length);t.copy(r,4);data.copy(r,8);r.writeUInt32BE(crc(Buffer.concat([t,data])),data.length+8);return r;}
const ih=Buffer.alloc(13);ih.writeUInt32BE(w);ih.writeUInt32BE(h,4);ih[8]=8;ih[9]=6;
const scan=Buffer.alloc((w*4+1)*h);for(let y=0;y<h;y++)raw.copy(scan,y*(w*4+1)+1,y*w*4,(y+1)*w*4);
const png=Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',ih),chunk('IDAT',z.deflateSync(scan)),chunk('IEND',Buffer.alloc(0))]);
fs.writeFileSync(c.output,png,{flag:'wx'});process.stdout.write(JSON.stringify({width:w,height:h,changedPixel:index}));
'''


def encoded(value):
    return (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode()


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def module(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    value = importlib.util.module_from_spec(spec)
    sys.modules[name] = value
    spec.loader.exec_module(value)
    return value


def main(arguments=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=TMP / 'portability.json')
    args = parser.parse_args(arguments)
    output = args.output.resolve()
    if not output.is_relative_to(TMP) or output.is_relative_to(ROOT):
        raise ValueError('Only /tmp/mask-lots40-20261113 may receive fixtures/reports')
    TMP.mkdir(parents=True, exist_ok=True)
    started, checks, private_reads, writes, probes = perf_counter(), [], [], [], []
    timings = {}
    report = {'schemaVersion': 1, 'passed': False, 'negativeChecks': checks,
              'scope': 'One independent relocated selection; read-only structural baseline and single-record pixel/status negatives; no art/canon/runtime approval.',
              'fullIndependentProductionFormulaPassExecuted': False}
    stage = 'select-frozen-pack'
    try:
        selector = module(ROOT / PACK / 'tools/ci-mask-lots40-inputs.py', 'neutral_qa_selector')
        paths, pins = selector.collect()
        selection = selector.check(paths, pins)
        selected = sorted(selector.selected(paths))
        before = {p: sha((ROOT / p).read_bytes()) for p in selected}
        report.update(selection=selection, manifestSha256=before[MANIFEST],
                      harnessSha256=before[PACK + '/tools/qa-portability.py'])
        stage = 'independent-copy'
        relocated = Path(tempfile.mkdtemp(prefix='portable-neutral-', dir=TMP))
        for relative in selected:
            src, dst = ROOT / relative, relocated / relative
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(src, dst)
            a, b = src.stat(), dst.stat()
            if (a.st_dev, a.st_ino) == (b.st_dev, b.st_ino) or b.st_nlink != 1:
                raise AssertionError('Independent fixture inode required: ' + relative)
        report.update(relocatedRoot=str(relocated), independentCopies=len(selected), hardlinksCreated=0)
        builder = module(relocated / PACK / 'tools/build-mask-lots40.py', 'neutral_qa_builder')
        pixels = module(relocated / PACK / 'tools/verify-neutral-pixels.py', 'neutral_qa_independent_pixels')
        manifest = json.loads((relocated / MANIFEST).read_bytes())
        inventory = json.loads((relocated / INVENTORY).read_bytes())
        accepted = json.loads((relocated / ACCEPTED).read_bytes())
        derivations = json.loads((relocated / DERIVATIONS).read_bytes())
        recorded_origins = {r['nativeSourcePath'] for r in accepted['entries'] + accepted['originalGenerations']}
        original_open, original_path_open = builtins.open, Path.open
        original_exists, original_is_file = Path.exists, Path.is_file

        def private(path):
            return str(path).startswith('/workspace/generated_images/') or str(path) in recorded_origins

        def exists(path):
            return False if private(path) else original_exists(path)

        def is_file(path):
            if private(path):
                probes.append(str(path))
                return False
            return original_is_file(path)

        def guard(path, mode):
            if private(path):
                private_reads.append(str(path))
                raise AssertionError('Private ImageGen originals must not be read')
            if isinstance(mode, str) and any(c in mode for c in 'wax+'):
                writes.append(str(path))
                raise AssertionError('Read-only verification attempted a write: ' + str(path))

        def fopen(path, mode='r', *a, **kw):
            if not isinstance(path, int):
                guard(path, mode)
            return original_open(path, mode, *a, **kw)

        def popen(path, mode='r', *a, **kw):
            guard(path, mode)
            return original_path_open(path, mode, *a, **kw)

        @contextmanager
        def readonly():
            builtins.open, Path.open = fopen, popen
            Path.exists, Path.is_file = exists, is_file
            try:
                yield
            finally:
                builtins.open, Path.open = original_open, original_path_open
                Path.exists, Path.is_file = original_exists, original_is_file

        def independent(path, raw):
            if not path.resolve().is_relative_to(relocated):
                raise AssertionError('Fixture mutation escaped temporary root')
            if path.exists():
                path.unlink()
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(raw)
            if path.stat().st_nlink != 1:
                raise AssertionError('Fixture unexpectedly shares an inode')

        @contextmanager
        def changed(relative, raw):
            path = relocated / relative
            previous = path.read_bytes()
            independent(path, raw)
            try:
                yield
            finally:
                independent(path, previous)

        def structural(full=False):
            with readonly(), redirect_stdout(StringIO()):
                if full:
                    if builder.main(['--check', '--require-complete']) != 0:
                        raise AssertionError('Structural --check failed')
                else:
                    builder.build(False, True)

        def rejected(name, operation, fragments):
            tick = perf_counter()
            fragments = (fragments,) if isinstance(fragments, str) else fragments
            try:
                operation()
            except Exception as error:
                if not any(s in str(error) for s in fragments):
                    raise AssertionError(name + ': unexpected failure: ' + str(error)) from error
                checks.append({'name': name, 'passed': True, 'diagnostic': str(error), 'seconds': round(perf_counter() - tick, 3)})
                print(json.dumps({'negativeCheck': name, 'passed': True}), flush=True)
            else:
                raise AssertionError('Bad fixture unexpectedly passed: ' + name)

        def subset(identity):
            with readonly(), redirect_stdout(StringIO()):
                result = pixels.verify_manifest(relocated, relocated / MANIFEST, relocated / INVENTORY,
                    relocated / ACCEPTED, relocated / CANDIDATES, record_ids={identity})
            if result.get('partialVerifiedOnly') is not True or result.get('fullProductionVerification') is not False:
                raise AssertionError('Negative verification must be explicitly single-record, not exhaustive')
            if len(result['entries']) != 1 or result['entries'][0]['id'] != identity or result['issues']:
                raise AssertionError('Single-record fixture must retain the complete valid identity union: ' + str(result['issues']))
            return result

        stage = 'portable-structural-baseline'
        tick = perf_counter()
        structural(full=True)
        timings['portableStructuralBaselineSeconds'] = round(perf_counter() - tick, 3)
        report['portableStructuralBaselinePassed'] = True
        stage = 'single-record-pixel-negatives'
        first = manifest['pairs'][0]
        original_c = relocated / first['versionC']['path']
        raw, dims = pixels.rgba_read(original_c)
        for kind in ('alpha', 'dimensions', 'nonmonochrome', 'wrong-gray'):
            tick = perf_counter()
            fixture = relocated / ('fixture-' + kind + '.png')
            config = {'kind': kind, 'width': dims[0], 'height': dims[1], 'output': str(fixture)}
            subprocess.run(['node', '-e', NODE_FIXTURE, json.dumps(config)], input=raw,
                           stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
            modified_raw, modified_dims = pixels.rgba_read(fixture)
            c_bytes = fixture.read_bytes()
            updates = {'sha256': sha(c_bytes), 'bytes': len(c_bytes), 'nativeDimensions': list(modified_dims),
                       'outputAlphaSha256': sha(modified_raw[3::4])}
            invalid, receipts = deepcopy(manifest), deepcopy(derivations)
            c = invalid['pairs'][0]['versionC']
            c.update(updates, width=modified_dims[0], height=modified_dims[1])
            c['alpha']['sha256'] = updates['outputAlphaSha256']
            next(r for r in receipts['entries'] if r['id'] == first['id']).update(updates)
            receipt_bytes = encoded(receipts)
            c['generationReceipt'].update(sha256=sha(receipt_bytes), bytes=len(receipt_bytes))
            with changed(first['versionC']['path'], c_bytes), changed(DERIVATIONS, receipt_bytes), changed(MANIFEST, encoded(invalid)):
                result = subset(first['id'])
            item = result['entries'][0]
            if result['allChecksPassed'] or item['passed']:
                raise AssertionError('Faulty C pixels unexpectedly passed: ' + kind)
            pc = item.get('pixelChecks', {})
            if kind == 'dimensions':
                if not any('dimensions' in error.lower() for error in item['errors']):
                    raise AssertionError('Dimension fixture failed for another reason')
            elif kind == 'alpha':
                if pc.get('alphaMismatchPixels') != 1 or pc.get('strictMonochromeEveryPixel') is not True or pc.get('formulaMatchesEveryPixel') is not True:
                    raise AssertionError('Alpha fixture did not isolate exactly one alpha error')
            elif kind == 'nonmonochrome':
                if pc.get('nonMonochromePixels') != 1 or pc.get('alphaByteIdentical') is not True:
                    raise AssertionError('Non-monochrome fixture did not isolate one RGB error')
            elif pc.get('strictMonochromeEveryPixel') is not True or pc.get('formulaMismatchPixels') != 1 or pc.get('alphaByteIdentical') is not True:
                raise AssertionError('Wrong-gray fixture did not isolate the agreed luma formula')
            checks.append({'name': 'C ' + kind + ' rejected with coherent file/receipt pins', 'passed': True,
                           'singleRecord': first['id'], 'pixelsCompared': result['counts']['pixelsCompared'],
                           'seconds': round(perf_counter() - tick, 3), 'diagnostic': item['errors']})
            fixture.unlink()
            print(json.dumps({'negativeCheck': 'C ' + kind, 'passed': True}), flush=True)

        stage = 'source-and-provenance-negatives'
        protection_path = PACK + '/suivi/source-protection.json'
        protection = json.loads((relocated / protection_path).read_bytes())
        historical_native = {r['path'] for name in protection['priorPacks']
            for r in json.loads((relocated / 'public/game' / name / 'manifest.json').read_bytes())['nativeFiles']}
        omitted = next(r for r in protection['files']
                       if not r['path'].endswith('.xlsx') and r['path'] not in historical_native)
        invalid = deepcopy(protection)
        invalid['files'] = [r for r in invalid['files'] if r['path'] != omitted['path']]
        # Workbook/native counts and all remaining records are deliberately unchanged.
        with changed(protection_path, encoded(invalid)):
            rejected('Omitted non-XLSX/non-native historical source rejected despite unchanged count invariants',
                     structural, 'historical source-protection snapshot changed')

        targets_path = CANDIDATES
        invalid = json.loads((relocated / targets_path).read_bytes())
        invalid['candidates'][0]['sourceStatus']['runtimeIntegrated'] = True
        # No other copied status, receipt or image is promoted by this fixture.
        with changed(targets_path, encoded(invalid)):
            rejected('Nested target sourceStatus cannot claim runtime approval',
                     structural, 'Automatic approval forbidden')

        invalid = json.loads((relocated / targets_path).read_bytes())
        next(r for r in invalid['candidates'] if r['id'] == first['id']).update(status='alias', aliasOf='existing-source-representation')
        with changed(targets_path, encoded(invalid)):
            rejected('Strict alias cannot be promoted to a new accepted triplet', structural, 'Blocked, duplicate or alias')

        revision = next((r for r in manifest['pairs'] if r.get('representationOf') == 'predator_17'), None)
        if revision:
            invalid = json.loads((relocated / targets_path).read_bytes())
            next(r for r in invalid['candidates'] if r['id'] == revision['id'])['sourceStatus']['provisionalReviewOnly'] = False
            with changed(targets_path, encoded(invalid)):
                rejected('Vapor revision cannot erase its mandatory source-limited provisional state', structural, 'Vapor revision must retain')

        with changed(first['versionB']['path'], (relocated / first['versionB']['path']).read_bytes() + b'negative-fixture'):
            rejected('Altered source B rejected', structural, ('Pinned bytes changed','New ImageGen bytes mismatched'))
        invalid = deepcopy(derivations)
        wrong_b = manifest['pairs'][1]['versionB'] if len(manifest['pairs']) > 1 else json.loads((relocated / 'public/game/biomasks-neutral-20261113/manifest.json').read_bytes())['pairs'][0]['versionB']
        invalid['entries'][0].update(sourceBPath=wrong_b['path'], sourceBSha256=wrong_b['sha256'])
        with changed(DERIVATIONS, encoded(invalid)):
            rejected('C linked to another real B identity rejected', structural, 'C source lineage')
        invalid = deepcopy(derivations)
        invalid['entries'].append(deepcopy(invalid['entries'][0]))
        with changed(DERIVATIONS, encoded(invalid)):
            rejected('Duplicate C identity cannot create an unjustified alias', structural, 'Duplicate or unregistered C')
        for flag in ('canonCertified', 'humanArtValidated', 'runtimeIntegrated'):
            invalid = deepcopy(derivations)
            invalid['entries'][0][flag] = True
            with changed(DERIVATIONS, encoded(invalid)):
                rejected('False C ' + flag + ' rejected', structural, 'Automatic approval forbidden')
        invalid = deepcopy(derivations)
        invalid['entries'][0]['generatedNew'] = True
        with changed(DERIVATIONS, encoded(invalid)):
            rejected('Technical C cannot be relabeled as a new ImageGen generation', structural, 'C derivation verification flags disagree')

        stage = 'inherited-reservation-negatives'
        reservation_keys = ('provisionalReviewOnly', 'partialReferenceView', 'hybridStudy',
                            'canonicalIdentityUnmapped', 'geometryDeviationOpen')
        representatives, combination_counts = {}, {}
        for pair in manifest['pairs']:
            combination = tuple(key for key in reservation_keys
                                if pair['sourceStatus'].get(key, pair.get(key)) is True)
            if combination:
                representatives.setdefault(combination, pair['id'])
                combination_counts[combination] = combination_counts.get(combination, 0) + 1
        report['reservationNegativeRepresentatives'] = [
            {'identity': identity, 'activeReservationCombination': list(combination),
             'matchingSourceRepresentations': combination_counts[combination]}
            for combination, identity in representatives.items()]
        for combination, identity in representatives.items():
            tick = perf_counter()
            invalid = deepcopy(manifest)
            pair = next(p for p in invalid['pairs'] if p['id'] == identity)
            # Change only the active reservation flags, without also changing a
            # generic status string that could mask whether those flags matter.
            for key in combination:
                if key in pair['sourceStatus']:pair['sourceStatus'][key] = False
                if key in pair:pair[key] = False
            with changed(MANIFEST, encoded(invalid)):
                result = subset(identity)
            item = result['entries'][0]
            if result['allChecksPassed'] or not any('qualification' in s.lower() or 'flag changed' in s.lower() or 'sourceStatus' in s for s in item['errors']):
                raise AssertionError('Erased source reservation was not independently rejected: ' + identity)
            checks.append({'name': 'Erased inherited reservation rejected: ' + identity, 'passed': True,
                           'singleRecord': identity, 'activeReservationCombination': list(combination),
                           'matchingSourceRepresentations': combination_counts[combination],
                           'pixelsCompared': result['counts']['pixelsCompared'],
                           'seconds': round(perf_counter() - tick, 3), 'diagnostic': item['errors']})

        # Isolate the independent verifier's provenance checks with coherent
        # manifest file pins; the builder is deliberately not the oracle here.
        altered_inventory = deepcopy(inventory)
        source_a = altered_inventory['entries'][0]['sourceA']
        source_a.update(path=wrong_b['path'], sha256=wrong_b['sha256'])
        altered_manifest = deepcopy(manifest)
        inventory_bytes = encoded(altered_inventory)
        altered_manifest['sourceInventory'].update(sha256=sha(inventory_bytes), bytes=len(inventory_bytes))
        with changed(INVENTORY, inventory_bytes), changed(MANIFEST, encoded(altered_manifest)):
            result = subset(first['id'])
        if result['allChecksPassed'] or not any('inventory A lineage' in e for e in result['entries'][0]['errors']):
            raise AssertionError('Independent verifier missed contradictory planned A provenance')
        checks.append({'name': 'Independent planned A provenance mismatch rejected', 'passed': True,
                       'singleRecord': first['id'], 'pixelsCompared': result['counts']['pixelsCompared']})

        for version in ('A', 'B'):
            accepted_row = next(r for r in (accepted['originalGenerations'] if version == 'A' else accepted['entries']) if r['id'] == first['id'])
            receipt_path = accepted_row['generationReceipt']
            altered_receipt = json.loads((relocated / receipt_path).read_bytes())
            receipt_entry = next(r for r in altered_receipt['entries'] if r['id'] == first['id'] and r['version'] == version)
            if version == 'A':
                receipt_entry.update(referenceSourcePath=wrong_b['path'], referenceSourceSha256=wrong_b['sha256'])
            else:
                receipt_entry.update(sourceAPath=wrong_b['path'], sourceASha256=wrong_b['sha256'])
            receipt_bytes = encoded(altered_receipt)
            altered_manifest = deepcopy(manifest)
            for asset in (altered_manifest['pairs'][0]['versionA'], altered_manifest['pairs'][0]['versionB']):
                if asset['generationReceipt']['path'] == receipt_path:
                    asset['generationReceipt'].update(sha256=sha(receipt_bytes), bytes=len(receipt_bytes))
            with changed(receipt_path, receipt_bytes), changed(MANIFEST, encoded(altered_manifest)):
                result = subset(first['id'])
            if result['allChecksPassed'] or not any('receipt' in e.lower() and 'lineage' in e.lower() for e in result['entries'][0]['errors']):
                raise AssertionError('Independent verifier missed contradictory receipt source lineage')
            checks.append({'name': 'Independent ' + version + ' receipt lineage mismatch rejected', 'passed': True,
                           'singleRecord': first['id'], 'pixelsCompared': result['counts']['pixelsCompared']})

        new_b = accepted['entries'][0]
        receipt_path = new_b['generationReceipt']
        receipt = json.loads((relocated / receipt_path).read_bytes())
        next(r for r in receipt['entries'] if r['id'] == new_b['id'] and r['version'] == 'B')['nativeSourcePath'] = '/workspace/generated_images/false-origin-fixture.png'
        with changed(receipt_path, encoded(receipt)):
            rejected('Contradictory new A/B private provenance rejected', structural, 'Receipt provenance differs')
        extra = relocated / PUBLIC / 'unregistered.png'
        independent(extra, (relocated / first['versionC']['path']).read_bytes())
        try:
            rejected('Unregistered public image rejected', structural, 'Unregistered public assets')
        finally:
            extra.unlink()

        verifier = relocated / PACK / 'tools/verify-mask-lots40.py'
        for flag in ('--write', '--prepare-inventory'):
            previous = sys.argv
            try:
                sys.argv = [str(verifier), flag]
                try:
                    with readonly(), redirect_stdout(StringIO()):
                        exec(compile(verifier.read_text(), str(verifier), 'exec'), {'__name__': '__main__', '__file__': str(verifier)})
                except SystemExit as error:
                    if 'Read-only' not in str(error):
                        raise
                    checks.append({'name': 'Read-only wrapper rejects ' + flag, 'passed': True})
                else:
                    raise AssertionError('Read-only wrapper accepted ' + flag)
            finally:
                sys.argv = previous

        stage = 'final-byte-preservation'
        if private_reads or writes or set(probes) != recorded_origins:
            raise AssertionError('Private-origin/read-only isolation failed')
        for relative, expected in before.items():
            if sha((ROOT / relative).read_bytes()) != expected or sha((relocated / relative).read_bytes()) != expected:
                raise AssertionError('Source changed or fixture not restored: ' + relative)
        selector.check(paths, pins)
        report.update(passed=True, privateNativeOriginsMasked=len(recorded_origins), privateReadsAttempted=0,
                      readOnlyWriteAttempts=0, originalsAndFixturesBytePreserved=True,
                      independentSingleRecordNegativeRuns=7+len(representatives),
                      independentNegativePixelsCompared=sum(c.get('pixelsCompared', 0) for c in checks),
                      fullIndependentProductionFormulaPassExecuted=False)
    except BaseException as error:
        report.update(errorStage=stage, errorType=type(error).__name__, error=str(error),
                      privateReadsAttempted=len(private_reads), readOnlyWriteAttempts=len(writes))
        raise
    finally:
        report['timings'] = {**timings, 'totalSeconds': round(perf_counter() - started, 3)}
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_bytes(encoded(report))
        print(json.dumps({'passed': report['passed'], 'negativeChecks': len(checks), 'output': str(output),
                          'seconds': report['timings']['totalSeconds']}), flush=True)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
