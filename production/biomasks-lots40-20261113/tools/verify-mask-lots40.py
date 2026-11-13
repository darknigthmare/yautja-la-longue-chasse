#!/usr/bin/env python3
"""Read-only package verifier. Mutating builder modes are explicitly forbidden."""
import importlib.util
import hashlib
from pathlib import Path
import sys
sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[3]
PROTECTION_SHA = 'af284f8cd09d91e59e648e43039725288fdfed8ed231ccbae17f5f35ecdfce66'
if hashlib.sha256((ROOT / 'production/biomasks-lots40-20261113/suivi/source-protection.json').read_bytes()).hexdigest() != PROTECTION_SHA:
    raise SystemExit('Frozen870 historical source-protection snapshot changed')
if '--check' not in sys.argv or any(arg in sys.argv for arg in ('--write', '--prepare-inventory', '--freeze-sources')):
    raise SystemExit('Read-only verifier requires --check and rejects mutations')
spec = importlib.util.spec_from_file_location('lots40_mask_builder', Path(__file__).with_name('build-mask-lots40.py'))
module = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = module
spec.loader.exec_module(module)
try:
    raise SystemExit(module.main(sys.argv[1:]))
except Exception as error:
    print('::error::' + (type(error).__name__ + ': ' + str(error)).replace('%', '%25').replace('\r', '%0D').replace('\n', '%0A'), file=sys.stderr)
    raise
