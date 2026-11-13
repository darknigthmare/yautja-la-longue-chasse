#!/usr/bin/env python3
"""Package native, reference-constrained mask candidates; never rewrite raster pixels."""
from __future__ import annotations
import argparse
from collections import Counter
import hashlib
import importlib.util
import json
import math
from pathlib import Path
import shutil
import sys
from urllib.parse import quote
from xml.etree import ElementTree as ET
from zipfile import ZipFile
from io import BytesIO
from PIL import Image

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[3]
LOT = ROOT / 'production/biomasks-20261113'
PUBLIC = ROOT / 'public/game/biomasks-20261113'
INPUTS = LOT / 'inputs'
FOLLOW = LOT / 'suivi'
BASE = 'f26b985e7c354a611963d9aaa76e10d9a26a6586'
PREFIX = '/workspace/yautja-la-longue-chasse/'
SNAPSHOTS = {
 'all-named-mask-inventory.json':'/tmp/all-masks-20261113/inventory/all-named-mask-inventory.json',
 'workbooks-scanned.json':'/tmp/all-masks-20261113/inventory/workbooks-scanned.json',
 'named-front-reference-report.json':'/tmp/all-masks-20261113/web-references/named-front-reference-report.json',
 'capture-geometry-amendment.json':'/tmp/all-masks-20261113/web-references/capture-geometry-amendment.json',
 'local-mask-references.json':'/tmp/all-masks-20261113/local-references/local-mask-references.json',
 'symbol-reference-report.json':'/tmp/all-masks-20261113/web-references/hg-additional/symbol-reference-report.json',
 'visual-review-a.json':'/tmp/all-masks-20261113/reviews/a.json',
 'visual-review-b.json':'/tmp/all-masks-20261113/reviews/b.json',
 'visual-review-c-and-exiled.json':'/tmp/all-masks-20261113/reviews/c-and-exiled.json',
}
REPORTS = ['phg-a.json','phg-b.json','phg-c.json','root-exiled.json']
NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'

def encoded(value): return (json.dumps(value,ensure_ascii=False,indent=2)+'\n').encode()
def load(path): return json.loads(path.read_bytes())
def digest(raw): return hashlib.sha256(raw).hexdigest()
def relative(path): return path.resolve().relative_to(ROOT).as_posix()
def repo_path(value):
 if not isinstance(value,str) or not value or '\x00' in value: raise ValueError('Invalid repository path')
 if value.startswith('/game/'): value='public'+value
 if value.startswith(PREFIX): value=value[len(PREFIX):]
 p=Path(value)
 if p.is_absolute() or '..' in p.parts: raise ValueError('Non-relative repository path: '+value)
 p=(ROOT/p).resolve()
 if not p.is_relative_to(ROOT) or not p.is_file(): raise ValueError('Missing repository file: '+value)
 return p
def pin(path):
 raw=path.read_bytes(); return {'path':relative(path),'sha256':digest(raw),'bytes':len(raw)}
def assert_pin(record):
 actual=pin(repo_path(record['path']))
 if actual['sha256']!=record['sha256'] or ('bytes' in record and actual['bytes']!=record['bytes']): raise ValueError('Source bytes changed: '+record['path'])
def snapshot():
 INPUTS.mkdir(parents=True,exist_ok=True)
 for name,value in SNAPSHOTS.items():
  raw=Path(value).read_bytes(); target=INPUTS/name
  if target.exists() and target.read_bytes()!=raw: raise ValueError('Refusing to replace frozen input: '+name)
  if not target.exists(): target.write_bytes(raw)
def protection(inventory,workbooks,write):
 path=FOLLOW/'source-protection.json'
 old_workflow={'path':'.github/workflows/p0-sprite-candidates.yml','sha256':'a48cdefe406b74ec786e4eebaafe8e31e2fe3f020cdc06a6169ccdc31a106357'}
 assert_pin(old_workflow)
 if not path.exists():
  if not write: raise ValueError('First build must create the protection snapshot')
  previous=load(ROOT/'production/p0-fidelity-20261113/suivi/source-protection.json')['files']
  paths={repo_path(r['path']) for r in previous}
  for r in previous+workbooks: assert_pin(r); paths.add(repo_path(r['path']))
  for folder in ['production/p0-sprites-20261113','public/game/p0-sprites-20261113','production/p0-fidelity-20261113','public/game/p0-fidelity-20261113']:
   paths.update(p for p in (ROOT/folder).rglob('*') if p.is_file() and '__pycache__' not in p.parts and p.suffix!='.pyc')
  for record in inventory['records']:
   for r in record.get('existingAssets',[]):
    if r.get('exists'): assert_pin(r); paths.add(repo_path(r['path']))
  paths.add(repo_path(inventory['sourceBible']['path']))
  FOLLOW.mkdir(parents=True,exist_ok=True)
  path.write_bytes(encoded({'schemaVersion':1,'sourceBaselineCommit':BASE,'scope':'All122 previous workbooks, both published dated packs, prior protected sources and existing named mask assets','files':[pin(p) for p in sorted(paths)],'sourceStatusesChanged':False}))
 data=load(path)
 if old_workflow['path']not in {r['path']for r in data['files']}:
  if not write:raise ValueError('Published earlier workflow is absent from the protection snapshot')
  data['files'].append(pin(repo_path(old_workflow['path'])));data['files'].sort(key=lambda r:r['path']);path.write_bytes(encoded(data))
 for r in data['files']: assert_pin(r)
 protected={r['path'] for r in data['files']}
 if len(workbooks)!=122 or any(r['path'] not in protected for r in workbooks): raise ValueError('All122 historical XLSX inputs must be protected')
 required={r['path']for r in load(ROOT/'production/p0-fidelity-20261113/suivi/source-protection.json')['files']}|{old_workflow['path']}
 for folder in ['production/p0-sprites-20261113','public/game/p0-sprites-20261113','production/p0-fidelity-20261113','public/game/p0-fidelity-20261113']:
  required.update(relative(p)for p in(ROOT/folder).rglob('*')if p.is_file()and'__pycache__'not in p.parts and p.suffix!='.pyc')
 for record in inventory['records']:
  required.update(relative(repo_path(r['path']))for r in record.get('existingAssets',[])if r.get('exists'))
 if not required.issubset(protected):raise ValueError('Published source files were omitted from the protection snapshot')
 return data
def library():
 p=ROOT/'production/p0-sprites-20261113/tools/workbook_lib.py'
 spec=importlib.util.spec_from_file_location('mask_pure_xlsx',p); m=importlib.util.module_from_spec(spec);sys.modules[spec.name]=m;spec.loader.exec_module(m);return m
def clean_reference(record,amended):
 result={k:v for k,v in record.items() if k not in {'path','localPath','privateReferencePath'}}
 path=record.get('path',record.get('localPath',record.get('privateReferencePath')))
 if path:
  try: local=repo_path(path)
  except ValueError: result.update(privateReferenceName=Path(path).name,privateReferenceNotPublished=True)
  else:
   result['path']=relative(local)
   if record.get('sha256') and pin(local)['sha256']!=record['sha256']: raise ValueError('Reference SHA differs: '+relative(local))
 if record.get('sha256') in amended:
  fixed=amended[record['sha256']];result.update(width=fixed['pngWidth'],height=fixed['pngHeight'],captureGeometryAmended=True,ddsDimensions=[fixed['ddsWidth'],fixed['ddsHeight']],pixelOneToOneWithDDSVerified=False)
 return result
def public_data(value):
 if isinstance(value,list): return [public_data(v) for v in value]
 if not isinstance(value,dict): return value
 result={}
 for key,item in value.items():
  if key in {'path','localPath','privateReferencePath','localReadmePath'} and isinstance(item,str):
   candidate='public'+item if item.startswith('/game/') else item
   if candidate.startswith(PREFIX):candidate=candidate[len(PREFIX):]
   if not Path(candidate).is_absolute() and '..' not in Path(candidate).parts and '\x00' not in candidate:
    result['path']=Path(candidate).as_posix()
   else:result.update(privateReferenceName=Path(item).name,privateReferenceNotPublished=True)
  else:result[key]=public_data(item)
 return result
def alpha_metrics(image):
 if image.mode!='RGBA': raise ValueError('A native RGBA PNG is required')
 a=image.getchannel('A');h=a.histogram();bounds=a.point(lambda x:255 if x>=16 else 0).getbbox()
 if not bounds or h[0]==0 or sum(h[240:])==0: raise ValueError('Transparent surroundings and solid material required')
 w,ht=image.size;l,t,r,b=bounds;m=[l,t,w-r,ht-b];visible=sum(h[16:]);core=sum(h[240:])
 if min(m)<=0 or core/visible<.8: raise ValueError('Clipped boundary or insufficient opaque mask material')
 return {'threshold':16,'bounds16':list(bounds),'marginsPixels':m,'transparentPixels':h[0],'visiblePixels16':visible,'opaquePixels240':core,'softPixels3To239':sum(h[3:240]),'occupancy16':visible/(w*ht),'nearOpaqueFractionOfVisible16':core/visible,'coreDoesNotTouchFrameEdges':True,'hiddenRgbIgnored':True}
def categories(record):
 if record['kind']=='head-not-biomask': return ['nomask']
 values=['original'] if record['kind'].startswith('original-project') else ['canonical']
 if record.get('status')=='bible-shared-base-existing': values.append('alias')
 if not record.get('existingAssets') and not record.get('candidateFrontGenerationSupported'): values.append('unknown')
 return values
def review_notes(asset_id,current_sha):
 notes=[];evidence=[]
 def texts(value):
  if isinstance(value,str):return [value]
  if isinstance(value,dict):return [s for v in value.values()for s in texts(v)]
  if isinstance(value,list):return [s for v in value for s in texts(v)]
  return []
 for name in ['visual-review-a.json','visual-review-b.json','visual-review-c-and-exiled.json']:
  report=load(INPUTS/name);rows=report.get('entries',report.get('findings',[]))
  for index,row in enumerate(rows):
   if row.get('id')!=asset_id:continue
   image=next((r for r in report.get('images',[])if r.get('id')==asset_id),{})
   checked=row.get('generatedSha256',row.get('candidate',{}).get('sha256',image.get('candidateSha256')))
   applies=checked is None or checked==current_sha
   evidence.append({'path':relative(INPUTS/name),'sha256':pin(INPUTS/name)['sha256'],'reviewedCandidateSha256':checked,'matchesCurrentCandidateBytes':applies,'humanArtValidated':False})
   if not applies:
    notes.append('Une revue épinglée concerne un candidat antérieur de cette identité ; sa correction ultérieure est consignée dans le reçu de génération. Elle ne valide pas automatiquement le PNG courant.')
    continue
   for key in ['findings','limitations','qualification','sourceAlphaCaution','observations']:
    notes.extend('Revue visuelle d’agent, sans validation humaine : '+s for s in texts(row.get(key)))
 return notes,evidence
def build(write,require_complete):
 inventory=load(INPUTS/'all-named-mask-inventory.json');workbooks=load(INPUTS/'workbooks-scanned.json')
 refs=load(INPUTS/'named-front-reference-report.json');geometry=load(INPUTS/'capture-geometry-amendment.json')
 if len(inventory['records'])!=110 or len(workbooks)!=122: raise ValueError('Unexpected source inventory scope')
 amended={r['sha256']:r for r in geometry['records']}
 if geometry['amendsReport']['sha256']!=pin(INPUTS/'named-front-reference-report.json')['sha256']: raise ValueError('Capture amendment pins a different report')
 protected=protection(inventory,workbooks,write)
 supported={r['targetId']:r for r in refs['entries'] if r['candidateFrontGenerationSupported']}
 if len(supported)!=13 or 'mk-30-emissary' in supported: raise ValueError('Only13 shaded reference targets are admitted')
 by_id={r['id']:r for r in inventory['records']};by_community={r['communityId']:r for r in supported.values()}
 aliases={key.replace('phg-cosmetic-','phg-'):key for key in supported}
 assets=[];native=[];reports=[];seen=set()
 for report_name in REPORTS:
  path=LOT/'generation'/report_name
  if not path.is_file():
   if require_complete: raise ValueError('Missing generation receipt: '+report_name)
   continue
  report=load(path);report_pin=pin(path);reports.append(report_pin)
  for index,e in enumerate(report['entries']):
   if any(e.get(k)is True for k in ['humanArtValidated','canonCertified','runtimeIntegrated','pixelEditingPerformed','animated']):raise ValueError('Unapproved generation claim in '+report_name)
   target_id=aliases.get(e['id'],e['id'])
   if target_id not in supported: raise ValueError('Entry outside supported geometry references: '+e['id'])
   if target_id in seen: raise ValueError('Duplicate identity: '+target_id)
   seen.add(target_id);target=supported[target_id];source=by_id[target_id]
   community=e.get('sourceId',e.get('source',e.get('sourceCommunityId')))
   if community is not None and community!=target['communityId']: raise ValueError('Source icon identity mismatch: '+target_id)
   p=repo_path(e['assetPath'])
   if not p.is_relative_to(PUBLIC) or p.suffix.lower()!='.png': raise ValueError('Native mask outside new namespace')
   actual=pin(p)
   if actual['sha256']!=e['sha256'] or actual['bytes']!=e['bytes']: raise ValueError('Native mask bytes differ from receipt: '+target_id)
   origin=e.get('nativeSourcePath',e.get('generatedNativePath'))
   if not origin: raise ValueError('Original ImageGen output path is required')
   if Path(origin).is_file() and Path(origin).read_bytes()!=p.read_bytes(): raise ValueError('Original/copy byte mismatch')
   with Image.open(p) as image:
    if image.format!='PNG' or image.width*image.height>16777216: raise ValueError('Unsupported native PNG')
    width,height=image.size;metrics=alpha_metrics(image)
   dims=e.get('nativeDimensions',[e.get('width'),e.get('height')])
   if dims!=[width,height]: raise ValueError('Declared dimensions differ from native image')
   pivot=e.get('pivot',[width/2,height/2])
   if len(pivot)!=2 or any(not isinstance(v,(int,float)) or not math.isfinite(v) for v in pivot) or not(0<=pivot[0]<=width and 0<=pivot[1]<=height): raise ValueError('Invalid centered pivot proposal')
   references=[clean_reference(r,amended) for r in target['referenceFiles']]
   agent_notes,agent_evidence=review_notes(e['id'],actual['sha256'])
   notes=list(dict.fromkeys(e.get('limitations',[])+agent_notes+['Secondary community reference; original PHG pixels, colors, UVs and profiles/back are not certified.','DDS and viewer canvas are256×256; actual browser capture is256×257. Fractional capture alignment prevents a raw DDS pixel-copy claim.','One static reference view, not an animation or six-morphology equipment fit.']))
   warnings=['Marge native inférieure à5%; cadrage à revoir.'] if min(metrics['marginsPixels'])/min(width,height)<.05 else []
   camera=e.get('camera','Named source near-front view; exact projection unmeasured')
   a={**actual,'id':e['id'],'inventoryId':target_id,'sourceId':source['sourceId'],'sourceDesignId':target_id,'communityId':target['communityId'],'category':'masks','label':e.get('label',target['targetName']),'src':'/'+p.relative_to(ROOT/'public').as_posix(),'width':width,'height':height,'sourceRect':[0,0,width,height],'frameWidth':width,'frameHeight':height,'pivot':pivot,'pivotStatus':'centered-review-proposal; no rig admission','alpha':metrics,'view':{'camera':camera,'facing':'source-reference-front','kind':'static','nativeRender':True,'wasMirror':False},'state':'reference-view','frames':1,'animated':False,'status':'generated-candidate','humanArtValidated':False,'canonCertified':False,'runtimeIntegrated':False,'pixelEditingPerformed':False,'generationRecord':{**report_pin,'index':index,'jsonPointer':'/entries/'+str(index)},'prompt':e['prompt'],'sourceRows':source['sourceRows'],'priority':source.get('priority','non-spécifiée'),'priorityLinks':[],'references':references,'identityEvidence':{k:clean_reference(v,amended) if isinstance(v,dict) else v for k,v in target.get('identityEvidence',{}).items()},'warnings':warnings,'limitations':notes,'inventoryCategories':categories(source)}
   a['agentVisualReviews']=agent_evidence
   a['sourceRows']=[{**row,'url':'https://github.com/darknigthmare/yautja-la-longue-chasse/blob/'+BASE+'/'+quote(row['path'],safe='/')+('#L'+str(row['line'])if row.get('line')else'')}for row in source['sourceRows']]
   assets.append(a);native.append(actual)
 assets.sort(key=lambda a:a['inventoryId']);native.sort(key=lambda a:a['path'])
 public_png={relative(p) for p in PUBLIC.rglob('*.png')}
 if public_png!={r['path'] for r in native}: raise ValueError('Unregistered PNG or missing receipt in public namespace')
 public_files={relative(p)for p in PUBLIC.rglob('*')if p.is_file()}
 allowed={r['path']for r in native}|{relative(PUBLIC/'manifest.json'),relative(PUBLIC/'review.html')}
 if public_files-allowed:raise ValueError('Unregistered public file; community references and diagnostics must not be published')
 symbols={r['targetId']:r for r in load(INPUTS/'symbol-reference-report.json')['entries']}
 seen_assets={a['inventoryId']:a['id'] for a in assets};records=[]
 for row in inventory['records']:
  r=public_data(row);r['inventoryCategories']=categories(r);r['generatedAssetId']=seen_assets.get(r['id']);r['newCandidateGenerated']=r['id'] in seen_assets;r['sourceStatusUnchanged']=True
  if r['id'] in symbols:r['nonProductionReference']=public_data(symbols[r['id']])
  records.append(r)
 missing=sorted(set(supported)-seen)
 if require_complete and missing: raise ValueError('Missing selected reference-view candidates: '+', '.join(missing))
 input_pins=[pin(INPUTS/name) for name in SNAPSHOTS]+reports+[pin(Path(__file__)),pin(LOT/'tools/review-template.html'),pin(ROOT/'production/p0-sprites-20261113/tools/workbook_lib.py')]
 manifest={'schemaVersion':1,'id':'biomasks-20261113','asOf':'2026-11-13','sourceBaselineCommit':BASE,'status':'generated-candidates-review-required','allMasksGenerated':False,'allP0Closed':False,'humanArtValidated':False,'canonCertified':False,'runtimeIntegrated':False,'animationClips':0,'counts':{'assets':len(assets),'nativeFiles':len(native),'designIdentities':len(seen),'byCategory':{'masks':len(assets)},'sourceNamedEntries':len(records),'exactMissingImagesRequired':None,'humanValidatedAssets':0,'canonCertifiedAssets':0,'animationClips':0},'plannedBatch':{'selectedTargetIds':sorted(supported),'missingSelectedIds':missing,'requestedBatchGenerated':not missing,'allNamedSourceRequirementsComplete':False},'technical':{'passed':True,'scope':'Native bytes, alpha/margins, source pins and deterministic files only'},'inventory':records,'inventorySourceCounts':inventory['counts'],'nativeFiles':native,'assets':assets,'sourceAttribution':public_data(refs['communitySource']),'captureGeometryAmendment':{'path':relative(INPUTS/'capture-geometry-amendment.json'),'sha256':pin(INPUTS/'capture-geometry-amendment.json')['sha256']},'protectedSources':{**pin(FOLLOW/'source-protection.json'),'files':len(protected['files']),'workbooks':len(workbooks)},'inputPins':sorted(input_pins,key=lambda r:r['path']),'limitations':['110 named entries/variants are not110 distinct missing mask geometries or a known PNG production total.','Emissary PHG is a flat pictogram in the acquired reference and is not rendered as an invented3D volume.','Supplied V44 body illustrations are not canonical mask authorities. Greyback, Golden Angel and AVP Elder must not be conflated with PHG Elder.','No raw community DDS or diagnostic screenshot is republished; URL, Git blob and byte SHA identify the sources.','All canonical fidelity, original colors, rear/profile views, UV and human review requirements remain open.']}
 return manifest,protected

def workbook_data(manifest,protected,lib):
 def short(v):
  text=lib.compact(v);return text if len(text)<28000 else text[:27800]+' […] Texte intégral dans l’inventaire JSON épinglé.'
 c=manifest['counts']; summary=[['Mesure','Valeur','Portée'],['Entrées nommées',c['sourceNamedEntries'],'Alias, variantes et non-masques inclus ; pas une quantité de PNG manquants'],['Nouveaux PNG candidats',c['nativeFiles'],'13 vues de référence sélectionnées, aucune admission canonique'],['Total exact de PNG requis','Indéterminé','Les descriptions seules ne fixent ni les géométries ni tous les angles'],['Lot sélectionné généré',manifest['plannedBatch']['requestedBatchGenerated'],'Ne termine pas les110 exigences nommées'],['Canon / humain / runtime / animation','0 /0 /0 /0','Critères ouverts'],['XLSX antérieurs inchangés',122,'Toutes les empreintes vérifiées'],['Fichiers protégés',len(protected['files']),'Anciens lots, sources et images existantes'],['Références des captures','DDS256×256 /capture256×257','Amendement dimensions, aucun pixel source modifié']]
 entries=[['ID','Nom','Type','Catégories','État source conservé','Priorité déclarée','Nouveau PNG','Assets déjà présents','Détail/limite','Sources exactes','Canon certifié','Humain validé']]
 for r in manifest['inventory']: entries.append([r['id'],r['name'],r['kind'],r['inventoryCategories'],r['status'],r.get('priority','non-spécifiée'),r.get('generatedAssetId') or 'Non',short(r.get('existingAssets',[])),short(r.get('description',r.get('generationRule',''))),short(r['sourceRows']),False,False])
 pngs=[['ID PNG','ID inventaire','Nom','PNG natif','SHA256','Dimensions','Rectangle','Pivot proposé','Alpha0','Noyau≥240','Marges','Source exacte','Statut']]
 refs=[['Asset','Rôle','URL/nom privé','SHA256','Dimensions','Preuve/limites']];blocks=[['ID','État','Limite','Action nécessaire']]
 for a in manifest['assets']:
  pngs.append([a['id'],a['inventoryId'],a['label'],lib.Link(a['path'],'../../../'+a['path']),a['sha256'],f"{a['width']}×{a['height']}",a['sourceRect'],a['pivot'],a['alpha']['transparentPixels'],a['alpha']['opaquePixels240'],a['alpha']['marginsPixels'],short(a['sourceRows']),'Candidat, non intégré'])
  for r in a['references']: refs.append([a['id'],r.get('role','DDS source'),r.get('url',r.get('privateReferenceName','Référence privée')),r.get('sha256',''),str(r.get('width',''))+'×'+str(r.get('height','')),'Communautaire secondaire, pas de preuve couleurs/UV/profil/dos'])
  for note in a['limitations']+a['warnings']: blocks.append([a['id'],'Ouvert',note,'Revue visuelle et référence officielle nécessaire'])
 for r in manifest['inventory']:
  if not r.get('generatedAssetId'):blocks.append([r['id'],r['status'],r.get('generationRule','Référence ou revue toujours ouverte'),r.get('nextAction','Voir sources exactes ; ne pas inventer la forme depuis le nom')])
  if r.get('nonProductionReference'):blocks.append([r['id'],'Pictogramme non générable en masque volumique',short(r['nonProductionReference'].get('observations',[])),'Référence2tons seulement ; nom et alpha ne prouvent ni volume, matériau ou faces cachées'])
 blocks.append(['mk-30-emissary','NON GÉNÉRÉ','Référence acquise plate/pictogramme ; aucune structure3D établie','Obtenir une vue réelle ; ne pas substituer Emissary1/2 du film ou leurs illustrations V44'])
 sources=[['Chemin','Octets','SHA256','Inchangé']]+[[r['path'],r['bytes'],r['sha256'],True]for r in protected['files']]
 tables=[('Synthèse',summary,[45,35,120]),('Inventaire110',entries,[35,35,30,35,55,35,35,100,110,120,20,20]),('PNGs',pngs,[28,35,35,100,68,22,30,25,20,20,30,120,40]),('Références',refs,[30,45,120,68,25,100]),('Blocages',blocks,[40,55,120,120]),('Sources',sources,[125,22,68,22])]
 return {'schemaVersion':1,'sheets':[{'name':name,'title':'Yautja — masques documentés : '+name,'note':'13 novembre2026 · candidats statiques · canon/humain/runtime non validés · sources conservées','headerRow':4,'rows':rows,'widths':widths}for name,rows,widths in tables],'counts':c,'cells':sum(len(row)for _,rows,_ in tables for row in rows),'manifestSha256':digest(encoded(manifest))}
def verify_xlsx(raw,data,lib):
 count=0
 with ZipFile(BytesIO(raw))as archive:
  if archive.testzip(): raise ValueError('Corrupt XLSX')
  for n in archive.namelist():
   if n.endswith('.xml')or n.endswith('.rels'):ET.fromstring(archive.read(n))
  sheets=ET.fromstring(archive.read('xl/workbook.xml')).find('{'+NS+'}sheets')
  if [s.attrib['name']for s in sheets]!=[s['name']for s in data['sheets']]: raise ValueError('Workbook sheet names differ')
  for i,sheet in enumerate(data['sheets'],1):
   page=ET.fromstring(archive.read(f'xl/worksheets/sheet{i}.xml'));cells={c.attrib['r']:c for c in page.iter('{'+NS+'}c')}
   for rownum,values in enumerate(sheet['rows'],4):
    for col,value in enumerate(values,1):
     cell=cells[lib.column(col)+str(rownum)];actual=''.join(cell.itertext());expected=value.label if isinstance(value,lib.Link)else lib.compact(value)
     if isinstance(value,(int,float))and not isinstance(value,bool):expected=str(value)
     if actual!=expected: raise ValueError('XLSX cell differs '+sheet['name']+'!'+lib.column(col)+str(rownum))
     count+=1
 return count
def main(arguments=None):
 p=argparse.ArgumentParser(description=__doc__);g=p.add_mutually_exclusive_group(required=True);g.add_argument('--write',action='store_true');g.add_argument('--check',action='store_true');p.add_argument('--snapshot-inputs',action='store_true');p.add_argument('--require-complete',action='store_true');args=p.parse_args(arguments)
 if args.snapshot_inputs:
  if not args.write: raise ValueError('Snapshots are only created during an initial write')
  snapshot()
 manifest,protected=build(args.write,args.require_complete);lib=library();data=workbook_data(manifest,protected,lib);raw=lib.build_workbook(data);cells=verify_xlsx(raw,data,lib)
 body=(LOT/'tools/review-template.html').read_text().replace('__PACK_DATA__',json.dumps(manifest,ensure_ascii=False).replace('<','\\u003c')).encode()
 artifact=FOLLOW/'Yautja_Masques_Manquants_20261113.xlsx'
 outputs={PUBLIC/'manifest.json':encoded(manifest),PUBLIC/'review.html':body,artifact:raw,FOLLOW/'build-request.json':encoded(lib.serializable(data)),FOLLOW/'coverage.json':encoded({'asOf':'2026-11-13','counts':manifest['counts'],'allMasksGenerated':False,'exactMissingImagesRequired':None,'sourceStatusesChanged':False,'inventory':manifest['inventory']})}
 result={'passed':True,'counts':manifest['counts'],'selectedBatchComplete':manifest['plannedBatch']['requestedBatchGenerated'],'allMasksGenerated':False,'allP0Closed':False,'manifest':{'path':relative(PUBLIC/'manifest.json'),'sha256':digest(outputs[PUBLIC/'manifest.json'])},'gallery':{'path':relative(PUBLIC/'review.html'),'sha256':digest(body)},'workbook':{'path':relative(artifact),'sha256':digest(raw),'bytes':len(raw)},'sheets':[s['name']for s in data['sheets']],'cellsCompared':cells,'protectedFiles':len(protected['files']),'protectedWorkbooks':122,'scope':'Native pixels/alpha, exact pins and deterministic OpenXML only; browser, human art and canon remain separate'}
 outputs[FOLLOW/'verification.json']=encoded(result)
 for path,content in outputs.items():
  if args.write:path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(content)
  elif not path.is_file()or path.read_bytes()!=content:raise ValueError('Deterministic output differs: '+relative(path))
 print(json.dumps(result,ensure_ascii=False));return 0
if __name__=='__main__':raise SystemExit(main())
