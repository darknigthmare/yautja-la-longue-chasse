#!/usr/bin/env python3
"""V132 original study pack installation. Reject unverified files and false PHG UV claims."""
import argparse, hashlib, json, os, sys, tempfile, zipfile
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
CAT=ROOT/"app/game/data/phgBiomaskV132Catalog.json"
STATE=ROOT/"app/game/data/phgBiomaskV132Installed.json"
ATLAS="public/game/assets/v132/phg-biomask/atlas.webp"

def sha(data):return hashlib.sha256(data).hexdigest()
def sha_file(path):
 h=hashlib.sha256()
 with path.open("rb") as f:
  for part in iter(lambda:f.read(1048576),b""):h.update(part)
 return h.hexdigest()
def catalog():
 c=json.loads(CAT.read_text())
 ids=[x["id"] for x in c["items"]]
 if c.get("schema")!="phg-v132-original-mask-tint-studies" or len(ids)!=7 or len(set(ids))!=7 or c.get("certified1to1") is not False:
  raise ValueError("Untrusted mask catalog")
 for i in c["items"]:
  if not i["id"].isalpha() or not set(i["classes"])<=set(["alpha","samurai"]) or not i["classes"]:
   raise ValueError("Invalid class identity")
 if c.get("atlasPath")!="/game/assets/v132/phg-biomask/atlas.webp":raise ValueError("Unsafe atlas location")
 return c
def verify_bundle(path,cat):
 if not path.is_file():raise ValueError("Missing V132 ZIP")
 if sha_file(path)!=cat["bundleSha256"]:raise ValueError("V132 bundle fingerprint mismatch")
 with zipfile.ZipFile(path) as z:
  manifest=json.loads(z.read("materials/manifest.json"))
  if manifest.get("schema")!="phg-v132-original-mask-tint-studies" or manifest.get("authenticPHG") is not False:
   raise ValueError("Invalid material claim")
  if manifest["atlas"]["sha256"]!=cat["atlasSha256"]:raise ValueError("Atlas manifest mismatch")
  records=manifest["assets"]
  by_id={x["id"]:x for x in records}
  if len(records)!=7 or len(by_id)!=7:raise ValueError("Wrong material count")
  for item in cat["items"]:
   actual=by_id.get(item["id"])
   if not actual or [actual["atlas"]["column"],actual["atlas"]["row"]]!=[item["column"],item["row"]]:
    raise ValueError("Atlas tile mismatch")
   if set(actual["allowedPHGClasses"])!=set(item["classes"]):raise ValueError("Class mismatch")
   for ext,field in ((".png","pngSha256"),(".webp","webpSha256")):
    member=z.getinfo("materials/"+item["id"]+ext)
    if not 64<=member.file_size<=2097152:raise ValueError("Source material size invalid")
    data=z.read(member)
    if sha(data)!=actual[field]:raise ValueError("Corrupt material source")
    if ext==".png" and not data.startswith(b"\x89PNG\r\n\x1a\n"):raise ValueError("Invalid PNG")
    if ext==".webp" and (data[:4]!=b"RIFF" or data[8:12]!=b"WEBP"):raise ValueError("Invalid WebP")
  info=z.getinfo(ATLAS)
  if info.file_size!=cat["atlasSizeBytes"] or info.file_size>2097152:raise ValueError("Atlas size mismatch")
  atlas=z.read(info)
  if sha(atlas)!=cat["atlasSha256"] or atlas[:4]!=b"RIFF" or atlas[8:12]!=b"WEBP":
   raise ValueError("Atlas SHA mismatch")
 return atlas
def verify_installed(c,root=ROOT):
 state=json.loads((root/"app/game/data/phgBiomaskV132Installed.json").read_text())
 ids=state.get("installed")
 if not isinstance(ids,list) or len(ids)!=len(set(ids)) or not set(ids)<=set(x["id"] for x in c["items"]):
  raise ValueError("Unverified installed identity")
 if ids:
  if state.get("bundleSha256")!=c["bundleSha256"]:raise ValueError("Wrong activation bundle")
  atlas=root/ATLAS
  if not atlas.is_file() or sha_file(atlas)!=c["atlasSha256"]:raise ValueError("Installed atlas missing")
 return {"active":len(ids),"pending":7-len(ids)}
def install(c,data,root=ROOT):
 dest=(root/ATLAS).resolve()
 if not dest.is_relative_to((root/"public").resolve()):raise ValueError("Unsafe destination")
 if dest.exists() and sha(dest.read_bytes())!=c["atlasSha256"]:
  raise ValueError("Refusing to replace other material")
 dest.parent.mkdir(parents=True,exist_ok=True)
 if not dest.exists():
  with tempfile.NamedTemporaryFile(dir=dest.parent,delete=False,prefix=".v132-") as f:
   f.write(data);temp=f.name
  os.replace(temp,dest)
 state=root/"app/game/data/phgBiomaskV132Installed.json"
 payload={"schema":c["schema"],"bundleSha256":c["bundleSha256"],
          "installed":sorted(x["id"] for x in c["items"])}
 with tempfile.NamedTemporaryFile(mode="w",encoding="utf-8",dir=state.parent,delete=False,prefix=".v132-") as f:
  json.dump(payload,f,ensure_ascii=False,indent=2);f.write("\n");temp=f.name
 os.replace(temp,state)
 return verify_installed(c,root)
def main():
 a=argparse.ArgumentParser()
 a.add_argument("--bundle",type=Path)
 a.add_argument("--verify-only",action="store_true")
 a.add_argument("--verify-installed",action="store_true")
 x=a.parse_args()
 try:
  c=catalog()
  if x.verify_installed:out=verify_installed(c)
  elif x.bundle:
   img=verify_bundle(x.bundle,c)
   out={"verified":7,"installed":False} if x.verify_only else install(c,img)
  else:a.error("Provide --bundle or --verify-installed")
  print(json.dumps(out,ensure_ascii=False));return 0
 except (KeyError,TypeError,ValueError,OSError,zipfile.BadZipFile) as e:
  print("V132 rejected: "+str(e),file=sys.stderr);return 1
if __name__=="__main__":sys.exit(main())
