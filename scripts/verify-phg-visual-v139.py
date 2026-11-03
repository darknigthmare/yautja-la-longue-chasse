#!/usr/bin/env python3
"""V139 visual QA source/geometry gate: read-only, no fabricated PHG evidence."""
from __future__ import annotations
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import sys
import xml.etree.ElementTree as ET
import zipfile

ROOT=Path(__file__).resolve().parents[1]
WORKBOOK=ROOT/"docs/production/Yautja_PHG_QA_Visual_Morphologies_V139.xlsx"
SHA="4e8568a9ab4f069572508f3cbd0fa04e011b0cc6c97344232a893c2f3a58151f"
PREV=ROOT/"scripts/verify-phg-production-xlsx-v138.py"
spec=importlib.util.spec_from_file_location("phg_v138_helpers",PREV)
helper=importlib.util.module_from_spec(spec)
spec.loader.exec_module(helper)
S=helper.S

class VisualLedgerError(ValueError):pass
def ensure(ok,message):
    if not ok:raise VisualLedgerError(message)

def validate(path:Path=WORKBOOK, expected_sha:str|None=SHA):
    ensure(path.is_file(),"Missing V139 visual workbook")
    data=path.read_bytes()
    if expected_sha:ensure(hashlib.sha256(data).hexdigest()==expected_sha,"SHA-256 mismatch")
    with zipfile.ZipFile(path) as z:
        ensure(z.testzip() is None,"Damaged XLSX bytes")
        mapping=helper.sheets(z)
        ensure(set(mapping)=={"Guide","QA_1134","Références_40","Régressions","Résumé","Projection_V139"},"Original QA worksheets missing")
        strings=helper.shared_text(z)
        def cells(sheet):
            return {c.get("r"):c for c in ET.fromstring(z.read(mapping[sheet])).iter(S+"c")}
        qa,refs,proj=cells("QA_1134"),cells("Références_40"),cells("Projection_V139")
        value=lambda cc:helper.cell_value(cc,strings)
        names=[value(qa.get(f"A{i}")) for i in range(5,1139)]
        ensure(len(set(names))==1134 and all(n.startswith("VIS138-") for n in names),"1134 visual QA cases changed")
        ensure(all(value(qa.get(f"H{i}"))=="À tester" for i in range(5,1139)),
               "False-positive visual certification")
        sources=[value(refs.get(f"A{i}")) for i in range(5,45)]
        ensure(len(set(sources))==40 and all(sources),"Original 40 source gaps changed")
        types={}
        maxerror=0.
        for i in range(5,57):
            at=lambda col:proj.get(f"{col}{i}")
            zone=value(at("C"))
            ensure(zone in {"biomask","face","body","armor"},"Invalid decal zone")
            ensure(value(at("R"))=="À tester","Mathematical pass presented as visual proof")
            nums={k:float(value(at(k))) for k in "EFGHIJKL"}
            ensure(nums["G"]>0 and nums["H"]>0,"Invalid owner mask geometry")
            dx=abs(nums["E"]+nums["G"]*nums["K"]-nums["I"])
            dy=abs(nums["F"]+nums["H"]*nums["L"]-nums["J"])
            maxerror=max(maxerror,dx,dy)
            ensure(dx<1e-7 and dy<1e-7,"Decal CSS/Canvas projection mismatch")
            for col,formula in {
                "M":f"E{i}+G{i}*K{i}","N":f"F{i}+H{i}*L{i}",
                "O":f"M{i}-I{i}","P":f"N{i}-J{i}"
            }.items():
                cell=at(col)
                f=cell.find(S+"f") if cell is not None else None
                ensure(f is not None and f.text==formula,"Removed live formula: "+col+str(i))
            ensure(value(at("Q"))=="OK","V139 cached mathematical projection does not pass")
            kind=value(at("D"))
            types[kind]=types.get(kind,0)+1
        ensure(types=={"V62 tête compacte":6,"V137 masque plein translaté":42,
                       "V133 source 256×384":4},"V139 six-morphology proof coverage changed")
    return {"status":"PASS","historic_cases":1134,"source_gaps":40,
            "geometric_cases":52,"math_pass":52,"max_coordinate_error":maxerror,
            "visual_certified":0,"phg_uv_1to1_certified":False}

if __name__=="__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("--workbook",type=Path,default=WORKBOOK)
    a=parser.parse_args()
    try:print(json.dumps(validate(a.workbook),ensure_ascii=False,indent=2))
    except (VisualLedgerError,ValueError,OSError,KeyError,ET.ParseError,zipfile.BadZipFile) as exc:
        print(json.dumps({"status":"FAIL","reason":str(exc)},ensure_ascii=False));sys.exit(1)
