#!/usr/bin/env python3
"""Strict local activation for V126 studies. No remote downloads or false 1:1 claims."""
import argparse, hashlib, json, os, sys, tempfile, zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
CAT=ROOT/"app/game/data/phgRecentV126Catalog.json"
STATE=ROOT/"app/game/data/phgRecentV126Installed.json"
ROOT_IN_ZIP="public/game/assets/v126/phg-recent/"
SUFFIXES=(".png",".webp","_normal-approx.webp","_roughness-approx.webp","_preview.webp")
def sha(data): return hashlib.sha256(data).hexdigest()
def catalog():
    c=json.loads(CAT.read_text())
    ids=[x["id"] for x in c["items"]]
    if c["schema"]!="phg-recent-material-studies-v126" or len(ids)!=4 or len(set(ids))!=4:
        raise ValueError("Invalid V126 catalog")
    if any(not id.replace("_","").isalnum() for id in ids):
        raise ValueError("Unsafe material id")
    return c
def verify(path,cat):
    if not path.is_file():raise ValueError("V126 ZIP missing")
    h=hashlib.sha256()
    with path.open("rb") as f:
        for part in iter(lambda:f.read(1048576),b""):h.update(part)
    if h.hexdigest()!=cat["bundleSha256"]:raise ValueError("V126 ZIP hash differs")
    with zipfile.ZipFile(path) as z:
        m=json.loads(z.read("docs/PHG_V126_Reference_Studies.json"))
        if m.get("schema")!="phg-2025-2026-original-studies-v126" or m.get("visuallyCertified1to1") is not False or m.get("originalTexturesFromGame") is not False:raise ValueError("Invalid source/fidelity declaration")
        if m["atlasSha256"]!=cat["atlasSha256"]:raise ValueError("Atlas hash mismatch")
        by_id={x["id"]:x for x in m["assets"]}
        if len(by_id)!=4 or len(m["assets"])!=4:raise ValueError("Invalid manifest count")
        paths={"atlas.webp"}
        for item in cat["items"]:
            ref=by_id.get(item["id"])
            if not ref or ref["channel"]!=item["channel"] or ref["sha256"]!=item["tileSha256"]:
                raise ValueError("Unexpected material registry")
            paths.update(item["id"]+suffix for suffix in SUFFIXES)
        if len(paths)!=21:raise ValueError("Expected 21 unique material files")
        output={}
        for name in paths:
            info=z.getinfo(ROOT_IN_ZIP+name)
            if info.file_size<40 or info.file_size>2097152:raise ValueError("Unsafe material file size")
            buf=z.read(info)
            if len(buf)!=info.file_size:raise ValueError("Truncated material")
            if name=="atlas.webp" and sha(buf)!=cat["atlasSha256"]:raise ValueError("Bad atlas bytes")
            for item in cat["items"]:
                if name==item["id"]+".webp" and sha(buf)!=item["tileSha256"]:raise ValueError("Material checksum mismatch")
            if name.endswith(".webp") and (buf[:4]!=b"RIFF" or buf[8:12]!=b"WEBP"):raise ValueError("Invalid WebP")
            if name.endswith(".png") and not buf.startswith(b"\x89PNG\r\n\x1a\n"):raise ValueError("Invalid PNG")
            output[name]=buf
    return output
def installed(cat,root=ROOT):
    s=json.loads((root/"app/game/data/phgRecentV126Installed.json").read_text())
    ids=s.get("installed")
    allowed={x["id"] for x in cat["items"]}
    if not isinstance(ids,list) or len(set(ids))!=len(ids) or not set(ids)<=allowed:
        raise ValueError("Invalid enabled ID set")
    if ids and s.get("bundleSha256")!=cat["bundleSha256"]:raise ValueError("Wrong installed bundle")
    if ids:
        atlas=root/"public/game/assets/v126/phg-recent/atlas.webp"
        if not atlas.is_file() or sha(atlas.read_bytes())!=cat["atlasSha256"]:raise ValueError("Atlas not installed or corrupted")
    return {"enabled":len(ids),"remaining":len(allowed)-len(ids)}
def install(cat,files,root=ROOT):
    folder=(root/"public/game/assets/v126/phg-recent").resolve()
    for name,buf in files.items():
        dest=(folder/name).resolve()
        if not dest.is_relative_to((root/"public").resolve()):raise ValueError("Unsafe path")
        if dest.exists() and sha(dest.read_bytes())!=sha(buf):raise ValueError("Refusing to overwrite modified original")
    for name,buf in files.items():
        dest=folder/name
        dest.parent.mkdir(parents=True,exist_ok=True)
        if dest.exists():continue
        with tempfile.NamedTemporaryFile(dir=dest.parent,delete=False,prefix=".v126-") as f:
            f.write(buf);temp=f.name
        os.replace(temp,dest)
    state=root/"app/game/data/phgRecentV126Installed.json"
    value={"schema":cat["schema"],"bundleSha256":cat["bundleSha256"],
           "installed":sorted(item["id"] for item in cat["items"])}
    with tempfile.NamedTemporaryFile(mode="w",encoding="utf-8",dir=state.parent,delete=False,prefix=".v126-") as f:
        json.dump(value,f,indent=2);f.write("\n");temp=f.name
    os.replace(temp,state)
    return len(files)
def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--bundle",type=Path)
    parser.add_argument("--verify-only",action="store_true")
    parser.add_argument("--verify-installed",action="store_true")
    args=parser.parse_args()
    try:
        c=catalog()
        if args.verify_installed:result=installed(c)
        elif args.bundle:
            assets=verify(args.bundle,c)
            result={"verified":len(assets),"installed":False} if args.verify_only else {"verified":len(assets),"installed":True,"written":install(c,assets)}
        else:parser.error("--bundle or --verify-installed required")
        print(json.dumps(result,ensure_ascii=False));return 0
    except (ValueError,KeyError,OSError,TypeError,zipfile.BadZipFile) as e:
        print("V126 refused: "+str(e),file=sys.stderr);return 1
if __name__=="__main__":sys.exit(main())
