"""Materialize supplied Drive PNG bytes into an isolated public namespace.

Use only a locally saved connector receipt and base64 files, never URLs or pack
scripts. Source bytes remain unchanged. This is an authoring import, not QA.
"""
from pathlib import Path
import argparse, base64, hashlib, json, struct

parser = argparse.ArgumentParser()
parser.add_argument('--receipts', required=True)
parser.add_argument('--base64-dir', required=True)
parser.add_argument('--output', required=True)
parser.add_argument('--registry', required=True)
parser.add_argument('--url-prefix', default='/game/imports/v85/drive-latest/')
args = parser.parse_args()
project = Path(__file__).resolve().parents[1]
out, registry = Path(args.output).resolve(), Path(args.registry).resolve()
if project not in out.parents or project not in registry.parents:
    raise ValueError('The isolated output and registry must remain inside this project.')
out.mkdir(parents=True, exist_ok=True)
assets = []
for item in json.loads(Path(args.receipts).read_text(encoding='utf-8')):
    encoded = Path(args.base64_dir) / (item['driveId'] + '.b64')
    if not encoded.exists():
        continue
    content = base64.b64decode(encoded.read_text(encoding='utf-8').strip(), validate=True)
    if content[:8] != b'\x89PNG\r\n\x1a\n':
        raise ValueError('Unexpected source format')
    name = Path(item['title']).name
    if name != item['title']:
        raise ValueError('Unsafe file name')
    target = out / name
    if target.exists() and target.read_bytes() != content:
        raise ValueError('A preserved source would be replaced')
    target.write_bytes(content)
    width, height = struct.unpack('>II', content[16:24])
    provisional = 'provisoire' in name
    category = item['category']
    assets.append({'id':'drive-'+item['driveId'],'label':name.removesuffix('.png').replace('_',' '),'src':args.url_prefix+name,'width':width,'height':height,'sha256':hashlib.sha256(content).hexdigest(),'bytes':len(content),'kind':'texture' if category=='PHG' else 'ship','groupId':'drive-phg-20261007' if category=='PHG' else 'drive-ships-20261007','groupLabel':'PHG · ajouts du 7 octobre' if category=='PHG' else 'Vaisseaux · vues reconstruites','sourceArchive':'Google Drive · '+category,'sourcePath':item['url'],'sourceStatus':'provisional' if provisional else 'user-generated-reference','producerStatus':'provisional' if provisional else 'source-generated','sourceNote':'PNG original du Drive préservé. Une reconstruction ne certifie ni des UV officiels ni une animation complète.','preferredVersion':not provisional})
registry.parent.mkdir(parents=True, exist_ok=True)
registry.write_text(json.dumps({'version':'V85','assets':assets},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'importedFiles':len(assets),'sourceBytes':sum(asset['bytes'] for asset in assets)}))
