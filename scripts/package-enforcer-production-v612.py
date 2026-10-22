"""Package the published PR files and unchanged project workbooks without changing pixels."""
from pathlib import Path
import argparse, hashlib, json, re, subprocess, zipfile

ROOT=Path(__file__).resolve().parents[1]
BASE='dbd7625ade2c83d133875138516fb21fae2aa7bf'
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('published_commit',help='Full SHA of the published V6.12 commit')
parser.add_argument('output_directory')
parser.add_argument('--pr-url',help='Successor PR URL; otherwise read from main-reconciliation.json')
args=parser.parse_args()
HEAD=args.published_commit
OUT=Path(args.output_directory).resolve()
OUT.mkdir(parents=True,exist_ok=True)
git=lambda *args:subprocess.check_output(['git',*args],cwd=ROOT).decode()
if not re.fullmatch(r'[0-9a-f]{40}',HEAD) or git('rev-parse','--verify',HEAD+'^{commit}').strip()!=HEAD:raise ValueError('Use the full published commit SHA')
if subprocess.run(['git','merge-base','--is-ancestor',BASE,HEAD],cwd=ROOT,check=False).returncode!=0:raise ValueError('The published commit must descend from the reconciled main commit')
read=lambda p:json.loads((ROOT/p).read_text())
sha=lambda b:hashlib.sha256(b).hexdigest()
reconciliation_path='docs/suivi-production/v612/data/main-reconciliation.json'
reconciliation=read(reconciliation_path) if (ROOT/reconciliation_path).exists() else {}
if reconciliation.get('currentMainCommit',BASE)!=BASE:raise ValueError('Unexpected reconciled main commit')
pr_url=args.pr_url or reconciliation.get('successorPullRequestUrl')
if not isinstance(pr_url,str) or not re.fullmatch(r'https://github\.com/darknigthmare/yautja-la-longue-chasse/pull/[1-9][0-9]*',pr_url):raise ValueError('Provide the actual successor PR URL via --pr-url or main-reconciliation.json')
if pr_url.endswith('/7'):raise ValueError('PR 7 is merged; the V6.12 pack needs the successor PR URL')
if args.pr_url and reconciliation.get('successorPullRequestUrl') not in (None,'',args.pr_url):raise ValueError('The supplied PR URL differs from main-reconciliation.json')
current=read('docs/suivi-production/v612/data/production-manifest.json')
prior=read('docs/suivi-production/v611/data/production-manifest.json')
counts=read('docs/suivi-production/v612/data/current-counts.json')
other=read('docs/suivi-production/v611/data/other-workbooks.json')
assets=prior['assets']+current['assets']
if len(prior['assets'])!=36 or len(current['assets'])!=36 or len({a['id'] for a in assets})!=72 or len({a['sha256'] for a in assets})!=72:raise ValueError('The cumulative pack needs 36 V6.11 and 36 V6.12 distinct native PNGs')
other_paths={w['repoPath'] for w in other}
if len(other)!=9 or len(other_paths)!=9 or any(not p.endswith('.xlsx') for p in other_paths):raise ValueError('Expected exactly nine distinct original XLSX paths')
tracking_workbooks={
 'docs/suivi-production/v611/references/Yautja_Suivi_Variantes_2026-10-20.xlsx',
 'docs/suivi-production/v611/Yautja_Suivi_Variantes_2026-10-21.xlsx',
 'docs/suivi-production/v612/Yautja_Suivi_Variantes_V612_2026-10-21.xlsx'}
expected_workbooks=other_paths|tracking_workbooks
if len(expected_workbooks)!=12:raise ValueError('The complete pack requires three tracking workbooks and nine other originals')
tree={}
for record in git('ls-tree','-r','-z','--full-tree',HEAD).split('\0'):
 if not record:continue
 info,name=record.split('\t',1)
 mode,kind,blob=info.split()
 tree[name]=(mode,kind,blob)
files={name for name in git('diff','--name-only','-z','--diff-filter=ACMR',BASE,HEAD).split('\0') if name}
# V6.11 was merged through PR 7, so those files no longer appear in this PR's
# diff. Explicitly include the published V6.11 and V6.12 delivery trees.
for prefix in ('docs/suivi-production/v611/','docs/suivi-production/v612/',
 'public/game/production/enforcers-v611/','public/game/production/enforcers-v612/'):
 members={name for name,(_,kind,_) in tree.items() if name.startswith(prefix) and kind=='blob'}
 if not members:raise ValueError('Missing published delivery tree: '+prefix)
 files.update(members)
files.update(expected_workbooks)
files.update({
 'app/game/data/enforcerProductionV611.json','app/game/data/enforcerProductionV612.json',
 'app/game/RecentSpriteLibraryV85.tsx','app/game/systems/recentSpriteLibraryV85.ts',
 'tests/drive-new-deposits-v89.test.mjs','tests/enforcer-production-v611.test.mjs','tests/enforcer-production-v612.test.mjs',
 'scripts/build-enforcer-production-v612.mjs','scripts/build-enforcer-gallery-v612.mjs',
 'scripts/build-enforcer-workbook-v612.mjs','scripts/verify-enforcer-workbook-v612.py',
 'scripts/verify-enforcer-gallery-v612.mjs','scripts/package-enforcer-production-v612.py',
 'scripts/checkpoint-enforcer-production-v612.mjs'})
for a in assets:
 b=(ROOT/a['repoPngPath']).read_bytes()
 if len(b)!=a['bytes'] or sha(b)!=a['sha256']:raise ValueError('Native file changed: '+a['id'])
 if a['repoPngPath'] not in files:raise ValueError('Native file absent from published delivery: '+a['id'])
for w in other:
 b=(ROOT/w['repoPath']).read_bytes()
 if len(b)!=w['bytes'] or sha(b)!=w['sha256']:raise ValueError('Original workbook changed: '+w['repoPath'])
payloads={}
for name in sorted(files):
 if name not in tree or tree[name][1]!='blob':raise ValueError('Not a published blob: '+name)
 b=(ROOT/name).read_bytes()
 blob=hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()
 if blob!=tree[name][2]:raise ValueError('Working bytes differ from published commit: '+name)
 payloads[name]=b
publication={'version':'V6.12','githubPullRequest':pr_url,'previousMergedPullRequest':7,
 'publishedCommit':HEAD,'sourceMainCommit':BASE,'newNativePngFiles':36,'cumulativeNativePngFiles':72,
 'groups':18,'newVariants':[6,7],'priorVariants':[4,5],'otherUnchangedProjectWorkbooks':len(other_paths),'xlsxFiles':len(expected_workbooks),
 'statusCounts':counts['statusCounts'],'allMissingVariantsCompleted':False,
 'newAnimations':0,'newMapPlacements':0,'githubMergePerformed':False,
 'previousV611StatusFR':'Présente dans main après fusion de la PR nº 7. Les 36 nouvelles variantes V6.12 restent dans la PR suivante.',
 'scopeFR':'Fichiers de la nouvelle PR, livraisons V6.11 et V6.12 complètes et neuf classeurs originaux. Ce ZIP contient la galerie autonome ; ce n’est pas une copie complète exécutable du jeu.'}
payloads['publication.json']=(json.dumps(publication,ensure_ascii=False,indent=2)+'\n').encode()
payloads['index.html']=b'<!doctype html><html lang="fr"><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=docs/suivi-production/v612/index.html"><title>Yautja V6.12</title><p><a href="docs/suivi-production/v612/index.html">Ouvrir la galerie des 72 Enforcers</a></p></html>\n'
payloads['LISEZ_MOI.txt']=('Yautja - Enforcers V6.12\n\n'
 'Decompressez toute cette archive, puis ouvrez index.html.\n'
 'La galerie fonctionne hors ligne avec ses 72 PNG natifs : 36 du lot V6.11 et 36 nouveaux du lot V6.12.\n'
 'Le classeur actualise se trouve dans docs/suivi-production/v612.\n'
 'Les neuf autres classeurs du projet sont conserves a leurs chemins originaux, sans modification.\n'
 'Les documents et images conservent leurs chemins du depot GitHub.\n'
 'Les 36 PNG V6.11 sont presents dans main apres fusion de la PR no 7.\n'
 'Les 36 nouvelles variantes V6.12 sont des poses fixes reliees a la galerie et au codex de la nouvelle branche.\n'
 'Aucune nouvelle animation ni aucun nouveau placement en scene ne sont inclus.\n'
 'Le ZIP ne contient pas tous les anciens fichiers du jeu ; utilisez le depot GitHub pour un checkout complet.\n'
 'Les 36 traces V6.10 dont les PNG ne sont pas retrouves restent identifiees dans le suivi.\n\n'
 f'Commit publie : {HEAD}\n'
 f'PR V6.12 : {pr_url}\n'
 f'Main de reference : {BASE}\n'
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
 if len(native)!=72 or set(native)!={a['repoPngPath'] for a in assets}:raise ValueError('Native PNG identity or count mismatch in ZIP')
 workbooks={n for n in z.namelist() if n.endswith('.xlsx')}
 if len(workbooks)!=12 or workbooks!=expected_workbooks:raise ValueError('XLSX identity or count mismatch in ZIP: '+str(sorted(workbooks^expected_workbooks)))
 report={'file':target.name,'bytes':target.stat().st_size,'sha256':sha(target.read_bytes()),
  'entries':len(z.namelist()),'nativePngFiles':len(native),'xlsxFiles':len(workbooks),'exactWorkbookPathsVerified':sorted(workbooks),
  'everyPayloadHashVerified':True,'repositoryPayloadsMatchPublishedCommit':True,
  'publishedCommit':HEAD,'sourceMainCommit':BASE,'githubPullRequest':pr_url,
  'originalProjectWorkbookHashesPreserved':len(other_paths)}
(OUT/'pack-verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False))
