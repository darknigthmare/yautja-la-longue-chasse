from pathlib import Path
import json, hashlib, zipfile
from PIL import Image
from xml.etree import ElementTree as ET
root=Path(__file__).resolve().parents[3]
prod=root/'production/homeworld-v161'
m=json.loads((prod/'manifest.json').read_text(encoding='utf-8'))
assert m['addedPNGCount']==3 and m['combinedPNGCount']==110
assert m['humanValidated'] is False and m['runtimeIntegrated'] is False
assert [x['id'] for x in m['assets']]==['HWA160-N01','HWA160-N02','HWA160-N03']
for x in m['assets']:
 p=root/x['path'];assert p.resolve().is_relative_to(root.resolve())
 b=p.read_bytes();assert len(b)==x['bytes'] and hashlib.sha256(b).hexdigest()==x['sha256']
 assert x['canonicalCertification'] is False and x['runtimeIntegrated'] is False
 with Image.open(p) as im:
  im.load();assert im.mode=='RGBA' and im.size==(x['width'],x['height'])
  assert im.getchannel('A').getextrema()[0]==0
  assert list(im.getchannel('A').getbbox())==x['alphaBounds']
assert len(m['rejectedGenerations'])==4 and all(x['state']=='REJETE_HORS_SPEC' and x['committed'] is False for x in m['rejectedGenerations'])
assert len(m['remainingBriefIds'])==7
ns={'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
with zipfile.ZipFile(prod/'YAUTJA_HOMEWORLD_PROPS_ECHELLE_TRIBUS_V161.xlsx') as z:
 assert z.testzip() is None
 assert len(ET.fromstring(z.read('xl/workbook.xml')).find('m:sheets',ns))==9
 for name in z.namelist():
  if name.startswith('xl/worksheets/sheet') and name.endswith('.xml'):
   assert not ET.fromstring(z.read(name)).findall('.//m:c[@t="e"]',ns)
report={'newPNGsVerified':3,'previousV160Count':107,'combinedCount':110,'newAlphaPNGCount':3,'workbookSheets':9,'rejectedSheets':4,'remainingGenerationBriefs':7,'strictMarginApproved':False,'artisticAdmissions':0,'runtimeAdmissions':0}
print(json.dumps(report,indent=2))
