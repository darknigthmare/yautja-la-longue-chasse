#!/usr/bin/env python3
"""Integrity and scope checks for the portable reconciliations; no app writes."""
from pathlib import Path
from collections import Counter
import hashlib,json
ROOT=Path(__file__).resolve().parents[5];OUT=ROOT/'production/p0p1-20261109/qa/war-admission'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
load=lambda p:json.loads((OUT/p).read_text())
R=load('reconciliation.json');W=load('source-rows.json');H=load('homeworld-reconciliation.json');T=load('tests.json')
assert len(R['rows'])==588 and len({x['key']for x in R['rows']})==588
assert len(H['rows'])==107 and len({x['key']for x in H['rows']})==107
assert set(x['key']for x in R['rows'])==set(x['key']for x in W['items'])
assert set(x['key']for x in H['rows'])==set(x['key']for x in load('homeworld-source-rows.json')['items'])
assert not any(x['globalClosure']for x in R['rows']+H['rows'])
assert all('rapprocher'not in x['status'].lower()for x in R['rows'])
assert T['pass']==329 and T['fail']==0 and len(T['rows'])==38
assert sum(x['tests']for x in T['rows'])==331 and sum(x['skipped']for x in T['rows'])==2
seen=set()
def checked(path,expected):
 assert sha(ROOT/path)==expected,(path,'hash mismatch');seen.add(path)
for ref in load('code-index.json'):checked(ref['path'],ref['sha256'])
for f in W['workbooks']:checked(f['path'],f['sha256'])
for t in T['rows']:
 assert t['exitCode']==0 and t['fail']==0
 checked(t['test'],t['testSha256']);checked(str((OUT/t['log']).relative_to(ROOT)),t['logSha256'])
for row in R['rows']+H['rows']:
 for ref in row['evidence']:checked(ref['path'],ref['sha256'])
for ref in H['sourceHashes']:checked(ref['path'],ref['sha256'])
# Resolve the independent review's three concrete findings with explicit assertions.
bygroup={r['sourceGroup']:r for r in R['rows']}
for n in [175,280,284,299,316]:assert not bygroup[n]['browserTested'].startswith('Partiel')
assert bygroup[175]['feature']=='waves-climate'
assert bygroup[280]['feature']=='planet-geometry'
assert bygroup[284]['feature']=='lore'
assert bygroup[299]['feature']=='stealth-climate'
assert bygroup[316]['feature']=='stealth-regions'
for n in [31,227,324,327,330]:assert bygroup[n]['browserTested']=='Non attesté pour ce critère'
for row in R['rows']:
 if row['feature']=='guard':assert 'recrutement et XP internes'in row['implementationScope'] and 'campagne SaveGame/V85'in row['implementationScope']
 if row['sourceGroup']not in {103,105,110,188,101,347,351}:assert not row['browserTested'].startswith('Partiel')
back145=next(r for r in R['rows']if r['id']=='BACK145-001');assert 'Attaques, coups spéciaux et animations 1:1 sur le personnage source'in back145['sourceRequirement']
probe=load('domain-probe.json');assert probe['sourceMissions']['count']==24 and probe['sourceMissions']['tasks']==72
assert all(x['worldStratum']=='orbital-vessel'for x in probe['sourceMaps']if x['id']=='W3-MAP12')
assert probe['network']['authority']=='server-required'and probe['network']['practiceSaveScope']=='practice-memory-only'
assert not probe['network']['apiRouteFiles']and not probe['network']['transportMatches']
assert probe['campaignGuard']['unchanged']and not probe['campaignGuard']['provenance']['serverAuthenticated']
assert len(probe['works']['notSupportedSupplement'])==6
assert H['counts']['runtimeAdmissionsNew']==0 and H['counts']['humanArtAdmissions']==0
assert H['geometrySourceDiffFromHead']==[]
review_resolution={'asOf':'2026-11-09','review':'production/p0p1-20261109/qa/war-admission/war-independent-review.json','reviewSha256':sha(OUT/'war-independent-review.json'),'resolved':['Browser admission is now assigned only to explicit source groups, scoped Atlas samples or current RTS archive fixture. Old user migrations, waves, stealth climate, lore and planet geometry receive no inherited browser pass.','Recruitment and XP internal to the exercise are retained; guards describe absence of gains/transfers into SaveGame/V85 campaign.','Groups175/280/284/299/316 now point to waves+climate, planet geometry, lore, stealth climate and V116 regions respectively, with relevant code/test evidence.'],'newAppBugDemonstrated':False,'appEditedForReview':False,'currentReportSha256':sha(OUT/'reconciliation.json'),'assertionsPassed':True}
(OUT/'review-resolution.json').write_text(json.dumps(review_resolution,ensure_ascii=False,indent=2)+'\n')
result={'asOf':'2026-11-09','warSubjects':588,'homeworldSubjects':107,'sourceKeysUniqueAndComplete':True,'sourceWorkbooks':W['workbooksRead'],'registeredRowHashComparisons':W['registeredRowHashComparisons'],'publishedCellComparisonsWithoutRegisteredHash':W['publishedCellComparisonsWithoutRegisteredHash'],'sourceHashChecksDistinctPaths':len(seen),'domainCases':331,'domainPass':329,'domainSkipped':2,'domainFail':0,'testSuites':38,'countsNotAdditiveWithRoot':True,'independentFindingsResolved':True,'buildId':(ROOT/'.next/BUILD_ID').read_text().strip(),'runtimeOrOldWorkbookModifiedByThisAudit':False,'globalClosed':0,'status':'PASS'}
assert result['buildId']=='RYl37_8hN58IOB8jDpRj1'
(OUT/'verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(result,ensure_ascii=False))
