"""Package the published PR files and unchanged project workbooks without changing pixels."""
from pathlib import Path
import hashlib, json, subprocess, sys, zipfile

ROOT=Path(__file__).resolve().parents[1]
BASE='536ac53335e440747f6eccedd2cd757d1f817a99'
if len(sys.argv)!=3:
 raise SystemExit('Usage: python scripts/package-enforcer-production-v612.py <published commit> <output directory>')
HEAD=sys.argv[1]
OUT=Path(sys.argv[2]).resolve()
OUT.mkdir(parents=True,exist_ok=True)
git=lambda *args:subprocess.check_output(['git',*args],cwd=ROOT).decode()
if git('rev-parse',HEAD).strip()!=HEAD:raise ValueError('Use the full published commit SHA')
read=lambda p:json.loads((ROOT/p).read_text())
sha=lambda b:hashlib.sha256(b).hexdigest()
current=read('docs/suivi-production/v612/data/production-manifest.json')
prior=read('docs/suivi-production/v611/data/production-manifest.json')
counts=read('docs/suivi-production/v612/data/current-counts.json')
other=read('docs/suivi-production/v611/data/other-workbooks.json')
assets=prior['assets']+current['assets']
if len(assets)!=72 or len({a['sha256'] for a in assets})!=72:raise ValueError('The cumulative pack needs 72 distinct native PNGs')
files=set(git('diff','--name-only','--diff-filter=ACMR',BASE,HEAD).splitlines())
files.update(w['repoPath'] for w in other)
for a in assets:
 b=(ROOT/a['repoPngPath']).read_bytes()
 if len(b)!=a['bytes'] or sha(b)!=a['sha256']:raise ValueError('Native file changed: '+a['id'])
 if a['repoPngPath'] not in files:raise ValueError('Native file absent from published PR: '+a['id'])
for w in other:
 b=(ROOT/w['repoPath']).read_bytes()
 if len(b)!=w['bytes'] or sha(b)!=w['sha256']:raise ValueError('Original workbook changed: '+w['repoPath'])
tree={}
for line in git('ls-tree','-r',HEAD).splitlines():
 info,name=line.split('\t',1)
 mode,kind,blob=info.split()
 tree[name]=(mode,kind,blob)
payloads={}
for name in sorted(files):
 if name not in tree or tree[name][1]!='blob':raise ValueError('Not a published blob: '+name)
 b=(ROOT/name).read_bytes()
 blob=hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()
 if blob!=tree[name][2]:raise ValueError('Working bytes differ from published commit: '+name)
 payloads[name]=b
publication={'version':'V6.12','githubPullRequest':'https://github.com/darknigthmare/yautja-la-longue-chasse/pull/7',
 'publishedCommit':HEAD,'sourceMainCommit':BASE,'newNativePngFiles':36,'cumulativeNativePngFiles':72,
 'groups':18,'newVariants':[6,7],'priorVariants':[4,5],'otherUnchangedProjectWorkbooks':9,
 'statusCounts':counts['statusCounts'],'allMissingVariantsCompleted':False,
 'newAnimations':0,'newMapPlacements':0,'githubMergePerformed':False,
 'scopeFR':'Fichiers de la PR et neuf classeurs originaux. Ce ZIP contient la galerie autonome ; ce n’est pas une copie complète exécutable du jeu.'}
payloads['publication.json']=(json.dumps(publication,ensure_ascii=False,indent=2)+'\n').encode()
payloads['index.html']=b'<!doctype html><html lang="fr"><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=docs/suivi-production/v612/index.html"><title>Yautja V6.12</title><p><a href="docs/suivi-production/v612/index.html">Ouvrir la galerie des 72 Enforcers</a></p></html>\n'
payloads['LISEZ_MOI.txt']=('Yautja - Enforcers V6.12\n\n'
 'Decompressez toute cette archive, puis ouvrez index.html.\n'
 'La galerie fonctionne hors ligne avec ses 72 PNG natifs : 36 du lot V6.11 et 36 nouveaux du lot V6.12.\n'
 'Le classeur actualise se trouve dans docs/suivi-production/v612.\n'
 'Les neuf autres classeurs du projet sont conserves a leurs chemins originaux, sans modification.\n'
 'Les documents et images restent organises comme dans la PR no 7.\n'
 'Les nouvelles variantes sont des poses fixes reliees a la galerie et au codex de la branche.\n'
 'Aucune nouvelle animation ni aucun nouveau placement en scene ne sont inclus.\n'
 'Le ZIP ne contient pas tous les anciens fichiers du jeu ; utilisez le depot GitHub pour un checkout complet.\n'
 'Les 36 traces V6.10 dont les PNG ne sont pas retrouves restent identifiees dans le suivi.\n\n'
 f'Commit publie : {HEAD}\n'
 'PR : https://github.com/darknigthmare/yautja-la-longue-chasse/pull/7\n'
 'Drive : https://drive.google.com/drive/folders/1r4uWvqvdHiDLA2td1cNqTi8i9-YxHNi5\n').encode()
hashes=[{'path':name,'bytes':len(b),'sha256':sha(b)} for name,b in sorted(payloads.items())]
payloads['SHA256_FICHIERS.json']=(json.dumps(hashes,ensure_ascii=False,indent=2)+'\n').encode()
target=OUT/'Yautja_V612_72_Enforcers_Excel_et_Galerie.zip'
with zipfile.ZipFile(target,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for name,b in sorted(payloads.items()):z.writestr(name,b)
with zipfile.ZipFile(target) as z:
 if z.testzip() is not None:raise ValueError('ZIP integrity failed')
 for item in hashes:
  b=z.read(item['path'])
  if sha(b)!=item['sha256'] or len(b)!=item['bytes']:raise ValueError('Pack byte mismatch: '+item['path'])
 native=[n for n in z.namelist() if n.startswith('public/game/production/enforcers-v6') and n.endswith('.png')]
 if len(native)!=72:raise ValueError('Native PNG count mismatch in ZIP')
 report={'file':target.name,'bytes':target.stat().st_size,'sha256':sha(target.read_bytes()),
  'entries':len(z.namelist()),'nativePngFiles':len(native),'xlsxFiles':sum(n.endswith('.xlsx') for n in z.namelist()),
  'everyPayloadHashVerified':True,'publishedCommit':HEAD,'originalProjectWorkbookHashesPreserved':9}
(OUT/'pack-verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False))
