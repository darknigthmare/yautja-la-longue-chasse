#!/usr/bin/env python3
"""Read-only reconstruction of the fidelity addendum and its workbook."""
import importlib.util
from pathlib import Path
import sys

sys.dont_write_bytecode = True
path = Path(__file__).with_name("build-addendum.py")
spec = importlib.util.spec_from_file_location("p0_fidelity_addendum", path)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
raise SystemExit(module.main(["--check", *sys.argv[1:]]))
