"""Verify delivery, not visual or canonical acceptance. Python 3 + Pillow."""
from pathlib import Path
import hashlib, json, zipfile
from PIL import Image
from xml.etree import ElementTree as ET
root=Path(__file__).resolve().parents[3]
prod=root/'production/homeworld-v160'
c=json.loads((prod/'catalogue.json').read_text(encoding='utf-8'))
rows=c['assets']+c['legacyAssets']+c['v158Assets']
assert len(rows)==107, 'Unexpected delivery count'
assert len({x['id'] for x in rows})==107, 'Duplicate asset ID'
assert len({x['path'] for x in rows})==107, 'Duplicate file path'
assert c['humanValidated'] is False and c['runtimeIntegrated'] is False
alpha=0
for x in rows:
 p=root/x['path']; assert p.resolve().is_relative_to(root.resolve()), 'Unsafe path'
 b=p.read_bytes(); assert len(b)==x['bytes'],x['id']+' byte mismatch'
 assert hashlib.sha256(b).hexdigest()==x['sha256'],x['id']+' SHA mismatch'
 with Image.open(p) as im:
  im.load(); assert list(im.size)==[x['width'],x['height']],x['id']+' dimensions mismatch'
  has_alpha=im.mode=='RGBA' and im.getchannel('A').getextrema()[0]<255
  alpha+=int(has_alpha)
  if 'hasTransparency' in x:assert has_alpha==x['hasTransparency'],x['id']+' alpha mismatch'
  if 'canonicalCertification' in x:assert x['canonicalCertification'] is False
book=prod/'YAUTJA_HOMEWORLD_PROPS_ECHELLE_TRIBUS_V160.xlsx'
with zipfile.ZipFile(book) as z:
 assert z.testzip() is None,'Workbook ZIP corruption'
 ns={'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
 sheets=ET.fromstring(z.read('xl/workbook.xml')).find('m:sheets',ns)
 assert len(sheets)==9,'Expected nine workbook sheets'
 for n in z.namelist():
  if n.startswith('xl/worksheets/sheet') and n.endswith('.xml'):
   tree=ET.fromstring(z.read(n));assert not tree.findall('.//m:c[@t="e"]',ns),'Formula error cell '+n
req=json.loads((prod/'requirements-v81.json').read_text(encoding='utf-8'))
assert len(req['targets'])==354 and all(t['state']=='OUVERT' for t in req['targets'])
canonical=root/'app/game/data/homeworldAssetCatalogueTargetV81.json'
if canonical.exists():
 source=json.loads(canonical.read_text(encoding='utf-8'))
 assert [(r['id'],r['label']) for r in source['entries']]==[(r['id'],r['label']) for r in req['targets']], 'Inherited IDs or labels diverged'
report={'pngFilesVerified':len(rows),'withTransparency':alpha,'opaqueArchived':len(rows)-alpha,
 'workbookSheets':len(sheets),'inheritedTargets':354,'artisticAdmissions':0,'runtimeAdmissions':0,
 'checks':['bytes','SHA256','dimensions','real-alpha','xlsx-structure','no-error-cells','stable-IDs']}
print(json.dumps(report,ensure_ascii=False,indent=2))
