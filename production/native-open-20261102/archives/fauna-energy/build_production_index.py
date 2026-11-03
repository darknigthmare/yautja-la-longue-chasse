from pathlib import Path
from PIL import Image
import json,hashlib,re

root=Path(__file__).parent
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
sourceFile=Path('/workspace/open-workstreams-production-20261102/art-gap-manifest.json')
old=json.loads(sourceFile.read_text());source={r['id']:r for r in old['entries']}
ours=json.loads((root/'native-technical-inspection.json').read_text())['entries']
cages=json.loads((root/'cages/cages-production-manifest.json').read_text())['targets']
raw=[]
for r in ours:
 raw.append({'id':r['id'],'attempt':r['attempt'],'selected':r['selectedCandidate'],'status':r['status'],'path':r['path'],'original':r['source'],'prompt':r['prompt'],'detail':str(root/'native-technical-inspection.json'),'minimumMargin':r['requestedMinimumTransparentMargin'],'findings':r['visibleFindings']})
for r in cages:
 raw.append({'id':r['id'],'attempt':r['attempt'],'selected':True,'status':'CANDIDAT_NON_ADMIS','path':r['copiedNativePath'],'original':r['toolOriginalPath'],'prompt':Path(r['promptFile']).read_text().rstrip('\n'),'promptFile':r['promptFile'],'detail':r['inspectionFile'],'minimumMargin':64,'findings':r['visualInspection']['structure']})
for file in sorted((root/'gear').glob('target-*.receipt.json')):
 r=json.loads(file.read_text());raw.append({'id':r['id'],'attempt':r['attempt'],'selected':True,'status':'CANDIDAT_NON_ADMIS','path':r['destination'],'original':r['nativePath'],'prompt':r['prompt'],'promptFile':str(file).replace('.receipt.json','.prompt.txt'),'detail':str(file),'minimumMargin':96,'findings':'Whole independent equipment construction; no animal/rider or anatomical fit proven. See gear/gear-index.md and gear/gear-index.json for contextual interpretation.'})
assert len(raw)==19,len(raw)
selected=[r for r in raw if r['selected']];assert len(selected)==18 and len({r['id'] for r in selected})==18
expected={'target-v81-'+s for s in ['56-58','57-71','57-72','57-73','71-266','71-267','71-268','71-270','71-273','71-276','71-277','71-278','72-282','72-283','72-284','72-285','72-288','73-305']}
assert {r['id'] for r in selected}==expected
for r in raw:
 p=Path(r['path']);o=Path(r['original']);assert p.read_bytes()==o.read_bytes()
 im=Image.open(p);a=im.getchannel('A');w,h=im.size
 r['sha256']=sha(p);r['originalSha256']=sha(o);r['bytes']=p.stat().st_size;r['byteIdenticalToToolOriginal']=True
 r['requestedDimensions']=[1024,1024];r['nativeDimensions']=[w,h];r['mode']=im.mode;r['alphaExtrema']=a.getextrema();r['alpha1or2PixelCount']=sum(0<v<=2 for v in a.get_flattened_data())
 r['thresholds']={}
 for t in [0,2,8,128]:
  mask=a.point(lambda v:255 if v>t else 0);b=mask.getbbox();px=mask.load();edge=sum(px[x,0]>0 for x in range(w))+sum(px[x,h-1]>0 for x in range(w))+sum(px[0,y]>0 for y in range(1,h-1))+sum(px[w-1,y]>0 for y in range(1,h-1))
  r['thresholds'][str(t)]={'bboxExclusive':b,'marginsLTRB':[b[0],b[1],w-b[2],h-b[3]],'canvasEdgePixels':edge,'occupiedPixels':sum(v>t for v in a.get_flattened_data())}
 r['requestedDimensionContractMet']=[w,h]==[1024,1024]
 r['strictAlphaGreater0MarginContractMet']=min(r['thresholds']['0']['marginsLTRB'])>=r['minimumMargin']
 r['alphaGreater2MarginDiagnosticMeetsSameMargin']=min(r['thresholds']['2']['marginsLTRB'])>=r['minimumMargin']
 b=r['thresholds']['8']['bboxExclusive'];r['proposedPivot']={'pixels':[(b[0]+b[2])/2,b[3]-1],'normalized':[(b[0]+b[2])/2/w,(b[3]-1)/h],'status':'DIAGNOSTIC_BBOX_ONLY_NOT_RUNTIME_APPROVED'}
 r['frame']={'rect':[0,0,w,h],'grid':[1,1],'frameCount':1,'atlas':False,'semanticConnectedPropAssembliesObserved':1,'overlappingIndependentObjectsObserved':False}
 r['wholeNativeDestinationPNGOpenedByParent']=True;r['humanValidated']=False;r['admitted']=False;r['runtimeActivated']=False;r['pixelEdits']=[]
 r['promptUtf8Sha256']=hashlib.sha256(r['prompt'].encode()).hexdigest()
 targets=[]
for r in sorted(selected,key=lambda r:int(r['id'].split('-')[-1])):
 s=source[r['id']]
 targets.append({'id':r['id'],'label':s['label'],'section':s['section'],'family':s['family'],'sourceLocators':s['sourceLocators'],'historicalV111Status':s['historicalV111Status'],'historicalV112ArtStatus':s['statusV112'],'requiredCriteriaIds':s['requiredCriteriaIds'],'candidate':r,'remainingAdmission':['Human artistic review pending.','Actual world scale, placement pivot, occlusion, collision and interaction have not been qualified.','A static whole PNG does not satisfy any authored animation criterion.','Exact native dimensions and requested margins are not silently normalized.']})
guide=Path('/workspace/native-homeworld-open-20261102/industrial-architecture/guides/create-game-assets-SKILL.md')
manifest={'schemaVersion':1,'sessionDate':'2026-11-02','scope':'18 explicitly allocated fauna/energy Homeworld targets; new native candidates only','counts':{'targetIds':18,'selectedCandidatePNGs':18,'rawPNGs':19,'rejectedAttempts':1,'nativeRetries':1,'humanArtAdmissions':0,'newArtClosures':0,'runtimeActivations':0},'gitUsed':False,'repositoryWrites':False,'frozenWorkbookOrHistoryModified':False,'imagePixelEditOperations':[],'sourceManifest':{'path':str(sourceFile),'sha256':sha(sourceFile)},'guide':{'path':str(guide),'sha256':sha(guide),'pixelNormalizationInstructionOverriddenByExplicitRootNoPixelEditingAllocation':True},'visualDirection':{'hero':str(root/'target-v81-57-71-emitter-left-native.png'),'materials':'porous charcoal basalt, thick angular aged bronze, muted amber; gear also red-brown leather','camera':'orthographic three-quarter, requested elevation32degrees, warm upper-left light','directionChosenByDelegatedProductionAgent':True,'humanArtisticValidation':False},'filePresenceCorrections':[{'target':'target-v81-72-284','existing':'V34 kha-rha and bone-bison-de-guerre saddle modules exist; two opposing profiles on opaque magenta','newCandidatePurpose':'Single independent transparent three-quarter contextual proposal; not first saddle art.'},{'targets':['target-v81-71-276','target-v81-71-277','target-v81-71-278','target-v81-73-305'],'existing':'V53 Youth cage-structure/floor/background scene layers exist.','newCandidatePurpose':'Four independent Homeworld three-quarter empty cage props; no global absence claim.'},{'targets':['target-v81-71-273','target-v81-72-282'],'finding':'Both source labels are support harnais in two sectors.','productionInterpretation':'Low restraint-care support versus vertical storage stand are proposed contextual constructions, not canonical new families. Alias remains possible after review.'}],'technicalLimits':['All19rawPNGs are native1254² rather than requested1024². No rescaling/cropping/padding/mirroring performed.','Strict alpha>0 borders and alpha>2/8 diagnostics remain separate; faint alpha1/2 noise is retained and not silently cleared.','No image has human art admission; no app integration or source/workbook closure.','The left/right emitters were independently generated; exact shared contact alignment and scale remain unqualified.','The single membrane/door/barrier images do not provide an animation cycle.','Saddle/harness anatomical fit is unproven; empty props do not activate any mount.'],'references':[str(root/'energy-enclosure-reference-receipt.json'),str(root/'cages/cages-reference-contract.json'),str(root/'gear/reference-receipt.json')],'targets':targets,'rejectedAttempts':[r for r in raw if not r['selected']]}
manifest['generator']='image_gen.imagegen'
manifest['admissionCriteriaCatalogue']=old['admissionCriteria']
manifest['supportingManifests']=[{'path':str(root/n),'sha256':sha(root/n)}for n in ['cages/cages-production-manifest.json','gear/gear-index.json','native-technical-inspection.json','all-native-opened.json'] if (root/n).exists()]
(root/'fauna-energy-production-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
(root/'all-native-opened.json').write_text(json.dumps({'openedVia':'tools.view_image of exact native destination PNGs by parent agent','humanValidated':False,'files':[{'path':r['path'],'sha256':r['sha256'],'selected':r['selected'],'status':r['status']}for r in raw]},indent=2)+'\n')
print(json.dumps({'counts':manifest['counts'],'alpha0MarginPass':sum(r['strictAlphaGreater0MarginContractMet']for r in selected),'alpha2MarginDiagnosticPass':sum(r['alphaGreater2MarginDiagnosticMeetsSameMargin']for r in selected),'selectedWithAlphaGreater2OnEdge':sum(r['thresholds']['2']['canvasEdgePixels']>0 for r in selected),'manifestSha256':sha(root/'fauna-energy-production-manifest.json')},indent=2))
lines=['18 cibles allouées :18PNG candidats sélectionnés,19bruts conservés,1retry natif pour la barrière268 dont le premier pied droit gardait1px de marge. Aucun fichier du dépôt, app, V113130 ou lot historique modifié. Aucun Git.','', 'Les19PNG natifs1254²RGBA ont été réellement ouverts et leurs copies sont byte-identiques aux originaux image_gen. Les dimensions1024² demandées ne sont pas satisfaites. Chaque image garde ses mesures alpha>0/2/8/128, ses marges exactes, son prompt, son hash et un pivot de diagnostic seulement. Aucun pixel retouché, recadré ou miroir.','', 'Tous les sélectionnés restent CANDIDAT_NON_ADMIS. La présence d’un fichier ne prouve ni admission humaine, ni échelle/pivot runtime, ni interaction/collision, ni cycle d’animation. Les modules énergie sont des images statiques. Les ouvertures/barreaux sont transparents, mais compositing terrain, alignement des paires et occlusion enclos restent à qualifier.','', 'Les sellesV34 et les couches de cageYouthV53 existaient déjà dans d’autres contextes. Les deux supports harnais reprennent exactement le même label source dans deux secteurs : leurs constructions distinctes sont des propositions contextuelles, avec alias encore possible. Aucun ajustement anatomique des équipements à une monture n’est prouvé.','', '| Cible | Objet | PNG sélectionné | Marges alpha>2 G/H/D/B | Statut |','|---|---|---|---|---|']
for t in targets:
 r=t['candidate'];lines.append('|'+t['id']+'|'+t['label']+'|'+str(Path(r['path']).relative_to(root))+'|'+'/'.join(map(str,r['thresholds']['2']['marginsLTRB']))+'|candidat non admis|')
lines+=['','Manifeste : fauna-energy-production-manifest.json. Les19fichiers ouverts et leurs SHA sont listés dans all-native-opened.json. Le premier268 refusé reste documenté dans rejectedAttempts ; seule la tentative02 est sélectionnée.']
(root/'fauna-energy-production-review.md').write_text('\n'.join(lines)+'\n')
