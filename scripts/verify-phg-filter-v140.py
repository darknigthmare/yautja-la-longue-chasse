#!/usr/bin/env python3
"""Read-only integrity of V140 Homeworld anatomical-grade QA Excel."""
from pathlib import Path
import hashlib,json,re,sys,xml.etree.ElementTree as E,zipfile
ROOT=Path(__file__).resolve().parents[1]
FILE=ROOT/"docs/production/Yautja_PHG_QA_Visual_Morphologies_V140.xlsx"
SHA="cd6035186363acc94d3b602f56445c2069b6336baef1ff92c93c35be20e57f9b"
S="{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
R="{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"
def validate():
    if not FILE.is_file():raise ValueError("Missing V140 workbook")
    if hashlib.sha256(FILE.read_bytes()).hexdigest()!=SHA:raise ValueError("Workbook V140 SHA mismatch")
    with zipfile.ZipFile(FILE) as z:
        if z.testzip() is not None:raise ValueError("Corrupt workbook V140")
        root=E.fromstring(z.read("xl/workbook.xml"))
        items=root.findall(S+"sheets/"+S+"sheet")
        names=[s.get("name") for s in items]
        if len(names)!=7 or any(n not in names for n in
           ["QA_1134","Références_40","Projection_V139","Filtres_V140"]):
            raise ValueError("Original V138/V139 history missing")
        rel={x.get("Id"):x.get("Target") for x in E.fromstring(z.read("xl/_rels/workbook.xml.rels"))}
        def sheet(name):
            el=next(s for s in items if s.get("name")==name)
            path=rel[el.get(R)]
            path=path.lstrip("/") if path.startswith("/") else "xl/"+path.lstrip("./")
            return {c.get("r"):c for c in E.fromstring(z.read(path)).iter(S+"c")}
        shared=[]
        if "xl/sharedStrings.xml" in z.namelist():
            shared=["".join(s.itertext()) for s in E.fromstring(z.read("xl/sharedStrings.xml")).findall(S+"si")]
        def val(c):
            if c is None:return ""
            if c.get("t")=="inlineStr":
                x=c.find(S+"is")
                return "".join(x.itertext()) if x is not None else ""
            x=c.find(S+"v")
            if x is None or x.text is None:return ""
            return shared[int(x.text)] if c.get("t")=="s" else x.text
        qa,refs,proj,filters=map(sheet,["QA_1134","Références_40","Projection_V139","Filtres_V140"])
        oldids=[val(qa.get(f"A{i}")) for i in range(5,1139)]
        if len(set(oldids))!=1134 or any(not x.startswith("VIS138-") for x in oldids):raise ValueError("1134 cases missing")
        if any(val(qa.get(f"H{i}"))!="À tester" for i in range(5,1139)):raise ValueError("False visual approval in V138")
        sources=[val(refs.get(f"A{i}")) for i in range(5,45)]
        if len(set(sources))!=40 or any(not x for x in sources):raise ValueError("40 evidence cases missing")
        if any(val(proj.get(f"Q{i}"))!="OK" or val(proj.get(f"R{i}"))!="À tester" for i in range(5,57)):
            raise ValueError("V139 geometry parity corrupted")
        ids=[val(filters.get(f"A{i}")) for i in range(5,23)]
        if len(ids)!=18 or len(set(ids))!=18 or any(not re.fullmatch(r"VIS140-\d{3}",x) for x in ids):
            raise ValueError("V140 filter coverage incomplete")
        if {val(filters.get(f"B{i}")) for i in range(5,23)}!={"classic","elder","super","feral","huntress","young"}:
            raise ValueError("Missing one morphological family")
        if {val(filters.get(f"C{i}")) for i in range(5,23)}!={"Anatomie","Pigment","Decal"}:
            raise ValueError("Missing one layer")
        if any(val(filters.get(f"I{i}"))!="À tester" or val(filters.get(f"F{i}"))!="Non" for i in range(5,23)):
            raise ValueError("Filter ledger forges a visual pass or body parent grade")
        return {"status":"PASS","visual_cases":1134,"source_gaps":40,"math_projection":52,
                "filter_coverage":18,"morphologies":6,"certified_1to1":False}
if __name__=="__main__":
    try:print(json.dumps(validate(),ensure_ascii=False,indent=2))
    except (OSError,ValueError,KeyError,E.ParseError,zipfile.BadZipFile) as exc:
        print(json.dumps({"status":"FAIL","reason":str(exc)},ensure_ascii=False));sys.exit(1)
