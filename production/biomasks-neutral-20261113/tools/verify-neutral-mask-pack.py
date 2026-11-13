#!/usr/bin/env python3
"""Read-only package verifier. Mutating builder modes are explicitly forbidden."""
import importlib.util
from pathlib import Path
import sys
sys.dont_write_bytecode = True
if '--check' not in sys.argv or any(arg in sys.argv for arg in ('--write', '--prepare-inventory', '--freeze-sources')):
    raise SystemExit('Read-only verifier requires --check and rejects mutations')
spec = importlib.util.spec_from_file_location('neutral_mask_builder', Path(__file__).with_name('build-neutral-mask-pack.py'))
module = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = module
spec.loader.exec_module(module)
try:
    raise SystemExit(module.main(sys.argv[1:]))
except Exception as error:
    print('::error::' + (type(error).__name__ + ': ' + str(error)).replace('%', '%25').replace('\r', '%0D').replace('\n', '%0A'), file=sys.stderr)
    raise
