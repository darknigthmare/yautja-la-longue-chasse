#!/usr/bin/env python3
"""Read-only verification of published packs after checkout-root relocation.

Captured receipts contain a few absolute paths below the original repository
root. Reinterpret only that exact historical prefix as the current checkout,
then delegate to the original path guard and the unchanged byte-level checks.
No published script, PNG, manifest, reference or workbook is rewritten.
"""
from __future__ import annotations

import argparse
import importlib.util
from pathlib import Path
import sys
import traceback

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[3]
LEGACY_REPOSITORY_PREFIX = "/workspace/yautja-la-longue-chasse/"
PACKS = {
    "archived": ("production/p0-sprites-20261113/tools/build-pack.py", "repository_path"),
    "addendum": ("production/p0-fidelity-20261113/tools/build-addendum.py", "repo_path"),
}


def load_pack(name: str):
    relative, guard_name = PACKS[name]
    spec = importlib.util.spec_from_file_location("p0_portable_" + name, ROOT / relative)
    if spec is None or spec.loader is None:
        raise ImportError("Cannot load the published " + name + " verifier")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    if module.ROOT != ROOT:
        raise ValueError("Published verifier resolved a different checkout root")
    original_guard = getattr(module, guard_name)

    def repository_path(value):
        if isinstance(value, str) and value.startswith(LEGACY_REPOSITORY_PREFIX):
            value = str(ROOT / value[len(LEGACY_REPOSITORY_PREFIX):])
        # Both original resolvers still reject paths escaping the checkout.
        # The addendum also rejects parent segments and missing regular files.
        return original_guard(value)

    setattr(module, guard_name, repository_path)
    return module


def annotation(message: str) -> str:
    return message.replace("%", "%25").replace("\r", "%0D").replace("\n", "%0A")


def main(arguments=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pack", choices=sorted(PACKS), default="archived")
    parser.add_argument("--check", action="store_true", help="Read-only verification; always selected")
    parser.add_argument("--require-complete", action="store_true")
    args = parser.parse_args(arguments)
    # Do not forward arbitrary builder arguments: --write/--snapshot-inputs are
    # deliberately unavailable through this adapter.
    checked = ["--check"] + (["--require-complete"] if args.require_complete else [])
    result = load_pack(args.pack).main(checked)
    if result != 0:
        raise ValueError("Published " + args.pack + " verification returned " + str(result))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print("::error::" + annotation(type(error).__name__ + ": " + str(error)), file=sys.stderr)
        traceback.print_exc()
        raise SystemExit(1)
