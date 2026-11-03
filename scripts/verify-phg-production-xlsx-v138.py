#!/usr/bin/env python3
"""V138 production Excel gate (stdlib-only, read-only).

Checks all four V137 Excel exports, the distribution ZIP and the original
V137 manifest.  Never changes a workbook or declares any PHG asset 1:1.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import posixpath
import re
import sys
import xml.etree.ElementTree as ET
import zipfile

DEFAULT_ROOT = Path(__file__).resolve().parents[1]
MANIFEST = Path("docs/production/Yautja_PHG_V137_MANIFEST.json")
S = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
R = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"
EXPECTED_MIN_SHEETS = {"Principal":20, "Fidélité":7, "Intégration":8, "Backlog":7}
BACKLOG_ID = re.compile(r"^B13[67]-\d{4}$")


class WorkbookIntegrityError(ValueError):
    pass


def insist(ok: bool, message: str) -> None:
    if not ok:
        raise WorkbookIntegrityError(message)


def digest(path: Path) -> str:
    h=hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda:source.read(1024 * 1024),b""):
            h.update(chunk)
    return h.hexdigest()


def safe_file(root: Path, name: str) -> Path:
    insist(isinstance(name,str) and name.startswith("Yautja_PHG_")
           and name.endswith((".xlsx",".zip"))
           and "/" not in name and "\\" not in name,
           "Unexpected production filename: "+repr(name))
    path=(root/"docs/production"/name).resolve()
    insist(path.is_relative_to((root/"docs/production").resolve()),
           "File escapes production directory")
    return path


def shared_text(z: zipfile.ZipFile) -> list[str]:
    if "xl/sharedStrings.xml" not in z.namelist():
        return []
    root=ET.fromstring(z.read("xl/sharedStrings.xml"))
    return ["".join(e.itertext()) for e in root.findall(S+"si")]


def cell_value(c: ET.Element, shared: list[str]) -> str:
    kind=c.get("t")
    if kind=="inlineStr":
        inline=c.find(S+"is")
        return "".join(inline.itertext()) if inline is not None else ""
    value=c.find(S+"v")
    if value is None or value.text is None:
        return ""
    if kind=="s":
        index=int(value.text)
        insist(0<=index<len(shared),"Invalid shared string index")
        return shared[index]
    return value.text


def sheets(z: zipfile.ZipFile) -> dict[str,str]:
    workbook=ET.fromstring(z.read("xl/workbook.xml"))
    relations=ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
    links={x.get("Id"):x.get("Target") for x in relations}
    out={}
    for sheet in workbook.findall(S+"sheets/"+S+"sheet"):
        rid=sheet.get(R)
        target=links.get(rid,"")
        insist(bool(target),"Missing workbook relationship for "+str(sheet.get("name")))
        path=target.lstrip("/") if target.startswith("/") else posixpath.normpath(posixpath.join("xl",target))
        insist(path.startswith("xl/worksheets/") and path in z.namelist(),
               "Unexpected workbook worksheet path: "+path)
        out[sheet.get("name")]=path
    return out


def workbook_info(data: bytes, name: str, label: str, minimum: int) -> dict:
    with zipfile.ZipFile(__import__("io").BytesIO(data)) as z:
        insist(z.testzip() is None, "Corrupted inner XLSX ZIP: "+name)
        names=z.namelist()
        insist("[Content_Types].xml" in names and "xl/workbook.xml" in names,
               "Not a valid XLSX workbook: "+name)
        sh=sheets(z)
        insist(len(sh)>=minimum,
               f"Missing sheets in {name}: expected >={minimum}, found {len(sh)}")
        errors=[]
        for xml_path in sh.values():
            doc=ET.fromstring(z.read(xml_path))
            for cell in doc.iter(S+"c"):
                if cell.get("t")=="e":
                    text=cell_value(cell,shared_text(z))
                    if text in {"#REF!","#DIV/0!","#VALUE!","#NAME?","#N/A","#NUM!"}:
                        errors.append(f"{xml_path}:{cell.get('r')}={text}")
        insist(not errors, "Excel error cached in "+name+": "+", ".join(errors[:8]))
        result={"file":name,"sheets":len(sh),"status":"verified"}
        if label=="Backlog":
            insist("Backlog_Master" in sh,"Missing Backlog_Master worksheet")
            shared=shared_text(z)
            root=ET.fromstring(z.read(sh["Backlog_Master"]))
            tasks={}
            for cell in root.iter(S+"c"):
                ref=cell.get("r","")
                if re.fullmatch(r"A([5-9]|\d{2,})",ref):
                    value=cell_value(cell,shared)
                    if BACKLOG_ID.fullmatch(value):
                        insist(value not in tasks,"Duplicate backlog ID "+value)
                        tasks[value]=ref
            insist(len(tasks)==389,
                   f"Expected 389 distinct V137 backlog tickets, found {len(tasks)}")
            old_ids={key for key in tasks if key.startswith("B136-")}
            new_ids={key for key in tasks if key.startswith("B137-")}
            insist(len(old_ids)==383 and new_ids=={
                f"B137-{number:04d}" for number in range(384,390)
            }, "V137 6 official-source gaps are absent or overwritten")
            result["backlog_count"]=len(tasks)
            result["new_official_gaps"]=len(new_ids)
            result["backlog_ids"]=list(tasks)
        return result


def validate(root: Path=DEFAULT_ROOT) -> dict:
    root=root.resolve()
    manifest_path=root/MANIFEST
    insist(manifest_path.is_file(),"Missing V137 release manifest")
    payload=json.loads(manifest_path.read_text(encoding="utf-8"))
    insist(payload.get("schema")=="yautja-phg-v137-excel-release",
           "Incorrect release schema")
    evidence=payload.get("qa_evidence",{})
    insist(evidence.get("backlog_total")==389 and evidence.get("backlog_open")==386
           and evidence.get("backlog_closed_technical")==3,
           "Release ticket totals do not reconcile")
    closed=evidence.get("technical_closed",[])
    insist(len(closed)==3 and len(set(closed))==3,"Technical closure IDs inconsistent")
    items=payload.get("files",[])
    insist(isinstance(items,list) and len(items)==5,"Exactly 4 XLSX and 1 ZIP required")
    labels=set()
    files={}
    xlsx=[]
    for item in items:
        label=item.get("label")
        name=item.get("name")
        insist(label not in labels,"Duplicate release label "+str(label))
        labels.add(label)
        path=safe_file(root,name)
        insist(path.is_file(),"Missing release file: "+str(path))
        insist(path.stat().st_size==item.get("size_bytes"),
               "Incorrect workbook byte count: "+name)
        insist(digest(path)==item.get("sha256"),
               "Incorrect workbook SHA-256: "+name)
        files[name]=path
        if name.endswith(".xlsx"):
            insist(label in EXPECTED_MIN_SHEETS, "Unknown workbook label: "+label)
            info=workbook_info(path.read_bytes(),name,label,EXPECTED_MIN_SHEETS[label])
            xlsx.append(info)
    insist(set(labels)==set(EXPECTED_MIN_SHEETS)|{"Pack"},
           "Wrong V137 release labels")
    backlog=next(row for row in xlsx if row["file"].endswith("Backlog_Production_V137.xlsx"))
    insist(set(closed)<=set(backlog["backlog_ids"]),
           "Closed technical tickets absent from released backlog")
    pack=next(path for name,path in files.items() if name.endswith(".zip"))
    with zipfile.ZipFile(pack) as z:
        insist(z.testzip() is None,"Corrupted V137 distribution ZIP")
        for item in items:
            if not item["name"].endswith(".xlsx"):
                continue
            matches=[name for name in z.namelist()
                     if PurePosixPath(name).name==item["name"]]
            insist(len(matches)==1,"XLSX missing/duplicated in pack: "+item["name"])
            insist(hashlib.sha256(z.read(matches[0])).hexdigest()==item["sha256"],
                   "Packed XLSX differs from released workbook: "+item["name"])
    for info in xlsx:
        info.pop("backlog_ids",None)
    return {"schema":"phg-v138-excel-integrity","status":"PASS",
            "four_workbooks":len(xlsx),"backlog_total":389,
            "technical_closed":closed,"open_backlog":386,
            "workbooks":xlsx}


def main() -> int:
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root",type=Path,default=DEFAULT_ROOT)
    args=parser.parse_args()
    try:
        report=validate(args.root)
        print(json.dumps(report,indent=2,ensure_ascii=False))
        return 0
    except (OSError,ValueError,ET.ParseError,zipfile.BadZipFile,KeyError) as exc:
        print(json.dumps({"status":"FAIL","reason":str(exc)},ensure_ascii=False))
        return 1


if __name__=="__main__":
    sys.exit(main())
