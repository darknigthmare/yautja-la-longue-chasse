#!/usr/bin/env python3
"""Rebuild masks, metadata and XLSX in memory without writing any artifact."""
import importlib.util
from pathlib import Path
import sys
import traceback
sys.dont_write_bytecode = True
p=Path(__file__).with_name('build-mask-pack.py')
s=importlib.util.spec_from_file_location('dated_masks',p)
m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
if '--write' in sys.argv or '--snapshot-inputs' in sys.argv:
    raise SystemExit('The verifier refuses write and snapshot options')
try:
    raise SystemExit(m.main(['--check',*[a for a in sys.argv[1:]if a!='--check']]))
except Exception as error:
    message=(type(error).__name__+': '+str(error)).replace('%','%25').replace('\r','%0D').replace('\n','%0A')
    print('::error::'+message,file=sys.stderr)
    traceback.print_exc()
    raise SystemExit(1)
