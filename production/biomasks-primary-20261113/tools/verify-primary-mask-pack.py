#!/usr/bin/env python3
"""Verify primary-reference mask candidates without writing files."""
import importlib.util
from pathlib import Path
import sys
import traceback

sys.dont_write_bytecode = True
path = Path(__file__).with_name('build-primary-mask-pack.py')
spec = importlib.util.spec_from_file_location('primary_mask_builder', path)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
if '--write' in sys.argv or '--freeze-sources' in sys.argv:
    raise SystemExit('Verifier refuses write/freeze options')
try:
    raise SystemExit(module.main(['--check', *[a for a in sys.argv[1:] if a != '--check']]))
except Exception as error:
    message = (type(error).__name__ + ': ' + str(error)).replace('%', '%25').replace('\r', '%0D').replace('\n', '%0A')
    print('::error::' + message, file=sys.stderr)
    traceback.print_exc()
    raise SystemExit(1)
