#!/usr/bin/env python3
"""V141 official PHG cosmetics visual-ledger validator; standard library only."""
from __future__ import annotations
from collections import Counter
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import sys
import xml.etree.ElementTree as ET
import zipfile

ROOT=Path(__file__).resolve().parents[1]
XLSX=ROOT/"docs/production/Yautja_PHG_QA_Visual_Morphologies_V141.xlsx"
SHA256="1d3a4059d23a4c3e090fc52d500ad3b8c06b78ca9c88424c74a971730d1fe6a6"
_HELPER=ROOT/"scripts/verify-phg-production-xlsx-v138.py"
spec=importlib.util.spec_from_file_location("phg_v138_xml",_HELPER)
helper=importlib.util.module_from_spec(spec)
spec.loader.exec_module(helper)
S=helper.S

class PHGReferenceError(ValueError): pass
def check(condition,message):
    if not condition:raise PHGReferenceError(message)
def validate(path:Path=XLSX,expected_sha:str|None=SHA256)->dict:
    check(path.is_file(),"Missing V141 XLSX")
    data=path.read_bytes()
    if expected_sha:check(hashlib.sha256(data).hexdigest()==expected_sha,"V141 SHA-256 mismatch")
    with zipfile.ZipFile(path) as z:
        check(z.testzip() is None,"V141 damaged ZIP")
        sheets=helper.sheets(z)
        for n in ("Guide","QA_1134","Références_40","Projection_V139","Filtres_V140",
                  "Sources_PHG_V141","Portées_V141","Bilan_V141"):
            check(n in sheets,"Missing preserved sheet: "+n)
        check(len(sheets)==10,"Wrong V141 sheet count")
        shared=helper.shared_text(z)
        def cells(name):
            return {c.get("r"):c for c in ET.fromstring(z.read(sheets[name])).iter(S+"c")}
        def val(rows,col,index):
            cell=rows.get(f"{col}{index}")
            return helper.cell_value(cell,shared) if cell is not None else ""
        def all_rows(name,start,end,cols):
            cells0=cells(name)
            return [[val(cells0,col,i) for col in cols] for i in range(start,end+1)]
        qa=all_rows("QA_1134",5,1138,"AH")
        check(len({r[0] for r in qa})==1134 and all(r[0].startswith("VIS138-") and r[1]=="À tester" for r in qa),
              "Historic 1134 real-world visual checks lost or falsely certified")
        sources40=all_rows("Références_40",5,44,"A")
        check(len({r[0] for r in sources40})==40 and all(r[0] for r in sources40),
              "Historic 40 evidence gaps altered")
        projection=all_rows("Projection_V139",5,56,"QR")
        check(all(r==["OK","À tester"] for r in projection),"V139 geometric/visual distinction lost")
        filters=all_rows("Filtres_V140",5,22,"FI")
        check(all(r==["Non","À tester"] for r in filters),"V140 filter photo gate altered")
        official=all_rows("Sources_PHG_V141",5,27,"ABCGH")
        categories=Counter(r[1] for r in official)
        check(categories=={
            "Teinte d'armure":2,"Teinte de biomask":8,"Teinte de peau":1,
            "Géométrie de biomask":3,"Warpaint":6,
            "Restriction Warpaint/Scar":1,"Correction Scar":2
        },"Wrong official cosmetic categories")
        check(len({r[0] for r in official})==23,"Duplicate source ID")
        check(all(r[3]=="Non certifié 1:1" and r[4].startswith("https://") for r in official),
              "Unverified PHG item promoted to official pixels or URL missing")
        matrix=all_rows("Portées_V141",5,148,"ABDFHI")
        check(len(matrix)==144 and len({(r[0],r[1],r[2]) for r in matrix})==144,
              "Class restriction matrix missing or duplicated rows")
        flags=Counter(r[3] for r in matrix)
        check(flags=={"Oui":63,"Non":81},"V141 Alpha/Samurai eligibility counts changed")
        check(all(r[4]=="Non vérifiée visuellement" and r[5].startswith("https://") for r in matrix),
              "False visual proof in 144 class checks")
        dashboard=cells("Bilan_V141")
        expected=(23,144,63,81,1134,40,52,18,0)
        for row_number,want in zip(range(4,13),expected):
            cell=dashboard.get("B"+str(row_number))
            check(cell is not None and cell.find(S+"f") is not None,
                  "Missing calculated KPI formula")
            check(val(dashboard,"B",row_number)==str(want),"Wrong cached KPI "+str(row_number))
        return {"status":"PASS","source_rows":23,"class_combinations":144,
                "allowed":63,"blocked":81,"historic_visual_qa":1134,
                "evidence_cases":40,"geometry_cases":52,"filter_cases":18,
                "official_pixel_certifications":0}
if __name__=="__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("--workbook",type=Path,default=XLSX)
    args=parser.parse_args()
    try:print(json.dumps(validate(args.workbook),ensure_ascii=False,indent=2))
    except (OSError,ValueError,KeyError,ET.ParseError,zipfile.BadZipFile) as e:
        print(json.dumps({"status":"FAIL","reason":str(e)},ensure_ascii=False));sys.exit(1)
