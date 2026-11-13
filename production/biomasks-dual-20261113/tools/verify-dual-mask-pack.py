#!/usr/bin/env python3
"""Read-only entry point for deterministic dual-mask candidate verification."""
import importlib.util
from pathlib import Path
import sys

sys.dont_write_bytecode = True
arguments = sys.argv[1:]
if '--check' not in arguments or any(arg not in {'--check', '--require-complete'} for arg in arguments):
    raise SystemExit('Read-only verification requires --check; writes are not supported')
path = Path(__file__).with_name('build-dual-mask-pack.py')
spec = importlib.util.spec_from_file_location('dual_mask_builder', path)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
try:
    raise SystemExit(module.main(arguments))
except Exception as error:
    message = (type(error).__name__ + ': ' + str(error)).replace('%', '%25').replace('\r', '%0D').replace('\n', '%0A')
    print('::error::' + message, file=sys.stderr)
    raise
