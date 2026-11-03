from pathlib import Path
from PIL import Image
import hashlib, json, zipfile, xml.etree.ElementTree as E
ROOT=Path(__file__).resolve().parents[3]
P=ROOT/"production/homeworld-v162"
NS={"s":"http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
def cells(file, sheet):
    with zipfile.ZipFile(file) as z:
        ss=[]
        if "xl/sharedStrings.xml" in z.namelist():
            ss=["".join(x.itertext()) for x in E.fromstring(z.read("xl/sharedStrings.xml"))]
        result={}
        for c in E.fromstring(z.read("xl/worksheets/sheet"+str(sheet)+".xml")).findall(".//s:c",NS):
            assert c.get("t")!="e", ("error cell",c.get("r"))
            v=c.find("s:v",NS); value=v.text if v is not None else "".join(c.itertext())
            if c.get("t")=="s": value=ss[int(value)]
            if value is not None and value!="": result[c.get("r")]=value
        return result
m=json.loads((P/"manifest.json").read_text())
assert [a["id"] for a in m["assets"]]==["HWA160-N"+str(i).zfill(2) for i in range(4,11)]
for a in m["assets"]:
    file=ROOT/a["path"]
    data=file.read_bytes()
    assert len(data)==a["bytes"] and hashlib.sha256(data).hexdigest()==a["sha256"], a["id"]
    im=Image.open(file)
    assert im.mode=="RGBA" and im.size==(a["width"],a["height"])
    al=im.getchannel("A");b=al.getbbox();assert b
    margins=[b[0],b[1],im.width-b[2],im.height-b[3]]
    assert al.getextrema()[0]==0 and min(margins)>0 and margins==a["marginsPixels"]
    assert a["cameraPitchDegrees"]==35 and a["cameraYawDegrees"]==0
    assert a["state"]=="PROTOTYPE_GEOMETRIQUE_NON_ADMIS"
    assert not a["runtimeIntegrated"] and not a["canonicalCertification"] and not a["humanValidated"]
    assert (ROOT/a["sourceBlend"]).is_file()
base=ROOT/"production/homeworld-v161/YAUTJA_HOMEWORLD_PROPS_ECHELLE_TRIBUS_V161.xlsx"
assert hashlib.sha256(base.read_bytes()).hexdigest()=="c2477269e83760e7bbbc7a13eae853990d4acd0b6473232bc4941009506cb78f"
book=P/"YAUTJA_HOMEWORLD_PROPS_ECHELLE_TRIBUS_V162.xlsx"
with zipfile.ZipFile(book) as z:
    sheets=E.fromstring(z.read("xl/workbook.xml")).find("s:sheets",NS)
    assert len(sheets)==11
    for i in range(1,12): cells(book,i)
assert cells(book,3)==cells(base,3),"Inherited target contents changed"
old=cells(base,2);new=cells(book,2)
for row in range(6,116):
    for col in "ABCDEFGHIJKL":
        key=col+str(row)
        assert old.get(key)==new.get(key),("Historical PNG metadata changed",key)
for row,a in enumerate(m["assets"],116):
    assert new["A"+str(row)]==a["id"]
    assert new["J"+str(row)]==a["path"] and new["K"+str(row)]==a["sha256"]
summary=cells(book,1)
assert summary["D6"]=="117" and summary["D7"]=="106"
assert summary["D9"]=="354" and summary["D10"]=="354"
assert summary["D11"]=="0" and summary["D12"]=="0"
rejected=json.loads((P/"rejected-outputs.json").read_text())["outputs"]
assert len(rejected)==6 and all(not x["committed"] and not x["countedAsAsset"] for x in rejected)
report={"newPNGFiles":7,"editableBlendSources":7,"combinedPNGCount":117,"newWorkbookDelivered":True,"workbookSheets":11,"inheritedTargetsUnchanged":354,"historicalPNGMetadataUnchanged":110,"rejectedSheets":6,"alphaClearOnAllEdges":True,"canonicalAdmissions":0,"runtimeAdmissions":0,"scope":"Procedural metric prototypes, not film replicas; no gameplay changes."}
print(json.dumps(report,indent=2))
