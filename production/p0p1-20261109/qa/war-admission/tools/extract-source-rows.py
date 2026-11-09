#!/usr/bin/env python3
"""Read raw OOXML with the repository reader; never execute its publishing main."""
from pathlib import Path
import importlib.util,hashlib,json,sys
ROOT=Path(__file__).resolve().parents[5]
OUT=ROOT/'production/p0p1-20261109/qa/war-admission'
spec=importlib.util.spec_from_file_location('read_only_xlsx',ROOT/'scripts/audit-excel-bible-20261108.py')
a=importlib.util.module_from_spec(spec);spec.loader.exec_module(a)
domain=sys.argv[1] if len(sys.argv)>1 else 'Guerre des clans'
name='source-rows.json'if domain=='Guerre des clans'else 'homeworld-source-rows.json'
register=json.loads((ROOT/'production/p0p1-20261109/suivi/registre-priorites.json').read_text())
selected=[r for r in register['rows']if r['domain']==domain]
assert len(selected)==(588 if domain=='Guerre des clans'else 107),(domain,len(selected))
cache={};items=[];hashes=[];row_hash_comparisons=0;cell_comparisons=0
for row in selected:
 observations=[]
 for ref in row['sources']:
  namepath=ref['path'];p=ROOT/namepath
  if namepath not in cache:cache[namepath]=a.read_workbook(p);hashes.append({'path':namepath,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
  sh=next(s for s in cache[namepath]if s['name']==ref['sheet'])
  raw=next(r['cells']for r in sh['rows']if r['row']==ref['row'])
  packed=json.dumps(raw,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode();computed=hashlib.sha256(packed).hexdigest()
  if 'rowSha256'in ref:
   assert computed==ref['rowSha256'],(row['key'],ref,computed);row_hash_comparisons+=1
  else:
   assert ref['cells']==raw,(row['key'],'Published supplemental cells differ from workbook');cell_comparisons+=1
  extracted=a.extract_sheet(sh);headers=extracted['headers']
  observations.append({k:ref[k]for k in ['path','sheet','row']}|{'rowSha256':computed,'hashOrigin':'registered-hash-matched'if 'rowSha256'in ref else 'computed-after-published-cells-matched','headers':headers,'cells':raw})
 items.append({'key':row['key'],'id':row['id'],'priority':row['priority'],'registeredTitle':row['title'],'registeredCriterion':row['criterion'],'observations':observations})
data={'asOf':'2026-11-09','baseSubjects':582 if domain=='Guerre des clans'else 107,'currentSubjects':len(items),'workbooksRead':len(cache),'rowHashesMatched':True,'registeredRowHashComparisons':row_hash_comparisons,'publishedCellComparisonsWithoutRegisteredHash':cell_comparisons,'workbooks':hashes,'items':items}
(OUT/name).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
print(domain,len(items),len(cache),'workbooks; row hashes all matched')
