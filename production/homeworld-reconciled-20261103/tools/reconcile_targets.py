"""Reconcile V81 requirements without modifying historical workbooks or gameplay.
Python 3.10+, standard library only. Example:
python production/homeworld-reconciled-20261103/tools/reconcile_targets.py --repo .
A sparse review can pass --tree-snapshot <GitHub recursive tree JSON>.
The resulting presence labels are NOT artistic or runtime admissions.
"""
import argparse,csv,json,re,subprocess,zipfile,posixpath,collections
import xml.etree.ElementTree as ET
from pathlib import Path
NS={'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
TASKS={151:('Conduit de chaleur',r'heat[-_ ]?(duct|conduit)|conduit[-_ ]?chaleur'),211:('Conduit d’énergie',r'(energy|fuel)[-_ ]?(duct|conduit)|conduit[-_ ]?energie'),212:('Câble au sol',r'(power|energy)[-_ ]?cable|cable[-_ ]?energie'),215:('Échelle de maintenance',r'maintenance[-_ ]?ladder|echelle[-_ ]?maintenance'),233:('Grille de drainage',r'drain(age)?[-_ ]?(grate|grille)|grille[-_ ]?drain'),235:('Caniveau',r'caniveau|gutter|drainage[-_ ]?channel'),239:('Ventilation de sol',r'ground[-_ ]?vent|floor[-_ ]?vent|ventilation[-_ ]?sol'),294:('Câble suspendu',r'hanging[-_ ]?cable|suspended[-_ ]?cable|cable[-_ ]?suspendu'),324:('Treuil',r'winch|treuil'),326:('Rail de manutention',r'cargo[-_ ]?rail|industrial[-_ ]?rail|rail[-_ ]?manutention')}

def eligible_homeworld_image(path):
 if not path.lower().endswith(('.png','.webp','.svg')):return False
 if re.search(r'/(rejected|rejects|npc|pit|hunters|portraits|previews)/',path,re.I):return False
 if re.search(r'/biome-decor/|/archivist-conversation/',path,re.I):return False
 return path.startswith(('public/game/homeworld/','production/homeworld-','production/native-open-20261102/','docs/suivi-production/v113-open-production-20261102/')) or (path.startswith('art-source/') and '/homeworld/' in path)

def workbook_table(path,sheet_name):
 with zipfile.ZipFile(path) as z:
  strings=[]
  if 'xl/sharedStrings.xml' in z.namelist():strings=[''.join(x.itertext()) for x in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('m:si',NS)]
  rels={x.attrib['Id']:x.attrib['Target'] for x in ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))}
  sheets=ET.fromstring(z.read('xl/workbook.xml')).findall('m:sheets/m:sheet',NS)
  sheet=next((x for x in sheets if x.attrib['name']==sheet_name),None)
  if sheet is None:raise ValueError('Missing sheet '+sheet_name)
  rid=sheet.attrib['{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id'];target=rels[rid];part=target.lstrip('/') if target.startswith('/') else posixpath.normpath('xl/'+target)
  result=[]
  for row in ET.fromstring(z.read(part)).findall('m:sheetData/m:row',NS):
   values=[]
   for cell in row:
    index=0
    for c in re.match(r'[A-Z]+',cell.attrib['r'])[0]:index=index*26+ord(c)-64
    while len(values)<index:values.append('')
    v=cell.find('m:v',NS);kind=cell.attrib.get('t');text=v.text if v is not None else ''
    if kind=='s':text=strings[int(text)]
    elif kind=='inlineStr':text=''.join(cell.find('m:is',NS).itertext())
    values[index-1]=text
   if values and str(values[0]).startswith('target-v81-'):result.append({'row':int(row.attrib['r']),'values':values})
  return result

def classify(target,history,bindings,files):
 number=int(target['id'].rsplit('-',1)[1]);exact=bindings.get(target['id'],[]);matches=[]
 if number in TASKS:matches=[p for p in sorted(files) if eligible_homeworld_image(p) and re.search(TASKS[number][1],p,re.I)]
 if exact:state='SOURCE_NOMMEE_PRESENTE' if any(x['origin']=='MAIN_NAMED_SOURCE' for x in exact) else 'CANDIDAT_EXACT_PRESENT'
 elif number in TASKS and not matches:state='PIECE_INDEPENDANTE_NON_REPEREE'
 elif history['values'][3]=='MISSING_ANIMATION':state='CYCLE_ANIME_A_COMPLETER'
 else:state='FAMILLE_SEULE_A_RECONCILIER'
 return {**target,'historicalState':history['values'][3],'historicalCell':f'ArtCatalogueV113!A{history["row"]}:J{history["row"]}','stateAtAudit':state,'exactSources':exact,'independentFilenameMatches':matches,'familyEvidencePaths':[p for p in (history['values'][6] or '').splitlines() if p],'scopeClosed':False,'humanValidated':False,'runtimeAdmissionClaimed':False,'canonicalOneToOne':False}

def run(repo,files,output,head):
 load=lambda p:json.loads((repo/p).read_text(encoding='utf-8'))
 targets=load('app/game/data/homeworldAssetCatalogueTargetV81.json')['entries'];old={r['values'][0]:r for r in workbook_table(repo/'production/YAUTJA_V114_SUIVI.xlsx','ArtCatalogueV113')}
 assert len(targets)==len(old)==354 and {t['id'] for t in targets}==set(old)
 bindings=collections.defaultdict(list)
 def bind(tid,path,origin,asset_id=None):
  if not tid.startswith('target-v81-'):return
  if path.startswith('/game/'):path='public'+path
  if path not in files:raise ValueError('Source not in repository tree: '+path)
  if path not in [x['path'] for x in bindings[tid]]:bindings[tid].append({'path':path,'origin':origin,'assetId':asset_id})
 for a in load('production/native-open-20261102/source-manifest.json')['homeworldCandidates']:
  if a.get('selected') is not False:bind(a['targetId'],a['path'],'V113_V114_EXACT_CANDIDATE')
 for version in (161,162):
  m=load(f'production/homeworld-v{version}/manifest.json')
  for a in m.get('assets',m.get('candidates',[])):
   tid=a.get('targetId') or {'HWA160-N01':'target-v81-55-21','HWA160-N02':'target-v81-55-13','HWA160-N03':'target-v81-55-33'}.get(a.get('id'))
   if tid and a.get('path'):bind(tid,a['path'],f'V{version}_CANDIDATE',a.get('id'))
 for a in load('production/homeworld-sectors-20261103/manifest.json')['assets']:
  for tid in a['targetIds']:bind(tid,a['path'],'SECTOR_CANDIDATE',a['id'])
 for tid,paths in {'target-v81-55-1':['public/game/homeworld/v81/basalt-city-foundation.png'],'target-v81-55-40':['public/game/homeworld/v82/clan-lift-cabin.png','public/game/homeworld/v82/clan-lift-fixed-frame.png'],'target-v81-55-41':['public/game/homeworld/v82/clan-lift-gantry-adult.png','public/game/homeworld/v82/clan-lift-fixed-frame.png']}.items():
  for path in paths:bind(tid,path,'MAIN_NAMED_SOURCE')
 rows=[classify(t,old[t['id']],bindings,files) for t in targets]
 summary={'inspectedCommit':head,'targetCount':354,'counts':dict(collections.Counter(r['stateAtAudit'] for r in rows)),'oldMissingWithExactSource':sum(r['historicalState']=='MISSING' and bool(r['exactSources']) for r in rows),'sourceIdsPreserved':True,'canonicalAdmissions':0,'runtimeAdmissions':0,'note':'A family-only match is neither proof of absence nor a finished independent prop.'}
 output.mkdir(parents=True,exist_ok=True);(output/'audit.json').write_text(json.dumps({'summary':summary,'targets':rows},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 with (output/'audit_354.csv').open('w',encoding='utf-8-sig',newline='') as f:
  w=csv.writer(f,delimiter=';');w.writerow(['ID','Cible','Famille','État au relevé','Ancien état','Sources exactes','Cellule historique','Portée globale'])
  for r in rows:w.writerow([r['id'],r['label'],r['family'],r['stateAtAudit'],r['historicalState'],' | '.join(x['path'] for x in r['exactSources']),r['historicalCell'],'OUVERT'])
 queue=[{'id':f'HWP163-{i+1:02d}','targetId':r['id'],'label':TASKS[int(r['id'].rsplit('-',1)[1])][0],'state':'SOURCE_GENERATOR_AVAILABLE_NOT_RUNTIME_ADMITTED'} for i,r in enumerate(r for r in rows if r['stateAtAudit']=='PIECE_INDEPENDANTE_NON_REPEREE')]
 (output/'generation-queue.json').write_text(json.dumps({'jobs':queue,'camera':{'projection':'orthographic','pitchDegrees':35,'yawDegrees':0},'lore':'ORIGINAL_GAME_ADAPTATION'},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 return summary

if __name__=='__main__':
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--repo',type=Path,default=Path(__file__).resolve().parents[3]);parser.add_argument('--out',type=Path);parser.add_argument('--tree-snapshot',type=Path);parser.add_argument('--source-sha');args=parser.parse_args();repo=args.repo.resolve()
 if args.tree_snapshot:
  tree=json.loads(args.tree_snapshot.read_text());assert tree.get('truncated') is False;files={x['path'] for x in tree['tree'] if x['type']=='blob'};head=args.source_sha or tree.get('sha','UNSPECIFIED')
 else:
  head=subprocess.check_output(['git','-C',str(repo),'rev-parse','HEAD'],text=True).strip();files=set(subprocess.check_output(['git','-C',str(repo),'ls-tree','-r','--name-only',head],text=True).splitlines())
 print(json.dumps(run(repo,files,args.out or Path(__file__).resolve().parents[1],head),ensure_ascii=False,indent=2))
