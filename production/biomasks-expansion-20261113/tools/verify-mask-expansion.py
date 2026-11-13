#!/usr/bin/env python3
"""Read-only verification entrypoint; never accepts builder mutations."""
import importlib.util
from pathlib import Path
import sys

sys.dont_write_bytecode = True
if '--write' in sys.argv or '--freeze-sources' in sys.argv:
    raise SystemExit('Read-only verifier rejects mutations')
if '--check' not in sys.argv:
    raise SystemExit('Read-only verifier requires --check')
path = Path(__file__).with_name('build-mask-expansion.py')
spec = importlib.util.spec_from_file_location('mask_expansion_builder', path)
module = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = module
spec.loader.exec_module(module)
try:
    raise SystemExit(module.main(sys.argv[1:]))
except Exception as error:
    message = (type(error).__name__ + ': ' + str(error)).replace('%', '%25').replace('\r', '%0D').replace('\n', '%0A')
    print('::error::' + message, file=sys.stderr)
    raise
