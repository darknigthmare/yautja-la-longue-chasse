from pathlib import Path
from PIL import Image
import json,hashlib
import numpy as np
from scipy.ndimage import label

root=Path(__file__).parent
file=root/'native-technical-inspection.json'
x=json.loads(file.read_text())
notes={
 'target-v81-56-58':'Complete pedestrian arch with semitransparent membrane; bright cream/amber appearance needs actual terrain composite review. Static closed state only, no opening sequence.',
 'target-v81-57-71':'Whole left endpoint with right-facing slit and low rear service block. Candidate scale and inner contact plane not qualified with its partner.',
 'target-v81-57-72':'Independent right-endpoint drawing with left-facing slit and differently constructed outside service box. No pixel mirroring. Pair height/scale/aperture contact need in-context qualification.',
 'target-v81-57-73':'One independent translucent amber plane, no solid emitters. Includes irregular circular intensity spots/holes and edge glow; visual coherence and compositing remain open. No animation authored.',
 'target-v81-71-266':'One connected empty polygon enclosure with a shut hinged front gate; transparent ground and bar gaps. Foreground/back occlusion and entry/collision would need native runtime layering design; no pixel split made.',
 'target-v81-71-267':'Whole compact stanchion with two right-hand sockets and a capped opposing socket; one amber lock indicator. Rail socket alignment and load-bearing footprint are not runtime qualified.',
 'target-v81-71-268':'One short connected three-rail module with two whole footed posts and transparent air gaps. Preferred second native generation has broad margins; independent assets do not yet prove modular join alignment.',
 'target-v81-71-270':'One low connected two-post energy barrier with base rail and translucent membrane, visibly distinct from the tall pedestrian door. No live containment, collision or animated state proven.'
}
for r in x['entries']:
 im=Image.open(r['path']);arr=np.array(im.getchannel('A'));mask=arr>8;lab,n=label(mask,np.ones((3,3),dtype=int));counts=np.bincount(lab.ravel())[1:];areas=sorted((int(v) for v in counts),reverse=True)
 r['alphaNoise']={'alpha1or2Pixels':int(((arr>0)&(arr<=2)).sum()),'componentsAtAlphaGreater8':int(n),'largestComponentAreasAtAlphaGreater8':areas[:12],'dominantFractionAtAlphaGreater8':areas[0]/int(mask.sum()) if areas else None,'note':'Disconnected raster islands are not additional semantic objects.'}
 r['frame']={'rect':[0,0,*r['dimensions']],'grid':[1,1],'expectedFrames':1,'atlas':False,'visuallyObservedConnectedPropAssemblies':1}
 r['requestedMinimumTransparentMargin']=96 if r['id'] in ['target-v81-56-58','target-v81-57-71','target-v81-57-72'] else (120 if r['id']=='target-v81-57-73' else (220 if r['id'] in ['target-v81-71-266','target-v81-71-270'] or r['attempt']==2 else 100))
 r['strictRequestedAlphaGreater0MarginSatisfied']=min(r['thresholds']['0']['margins'])>=r['requestedMinimumTransparentMargin']
 r['substantiveAlphaGreater2RequestedMarginSatisfied']=min(r['thresholds']['2']['margins'])>=r['requestedMinimumTransparentMargin']
 r['actualDimensionsMatchRequested']=r['dimensions']==r['requestedDimensions']
 r['wholeNativeCopyActuallyOpened']=True;r['visibleFindings']=notes[r['id']]
 r['imageEditingOperations']=[];r['noVisibleClippingAtSubstantiveAlpha']=True
 r['status']='REJET_CADRAGE_MARGE_DROITE_1PX' if r['id']=='target-v81-71-268' and r['attempt']==1 else 'CANDIDAT_NON_ADMIS'
 r['visualStatus']=r['status']
 r['selectedCandidate']=not (r['id']=='target-v81-71-268' and r['attempt']==1)
 r['requestedDimensionsAreSpecificationNotGuaranteedToolOutput']=True
 r['admissionLimitations']=['Native dimension differs from requested1024²; raw1254² preserved.','No in-engine or human artistic admission.','Pivot is bbox diagnostic only, no gameplay footprint or world-scale qualification.','Strict alpha>0 margins and alpha>2 diagnostics are reported separately, with no silent threshold substitution.']
 r['sha256AfterInspection']=hashlib.sha256(Path(r['path']).read_bytes()).hexdigest();assert r['sha256AfterInspection']==r['sha256']==hashlib.sha256(Path(r['source']).read_bytes()).hexdigest()
file.write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n')
(root/'energy-enclosure-opened.json').write_text(json.dumps({'humanValidated':False,'openedVia':'tools.view_image full native destination PNGs','files':[{'path':r['path'],'sha256':r['sha256'],'status':r['status']}for r in x['entries']]},indent=2)+'\n')
print('qualified native read-only metrics',len(x['entries']),'images',sum(r['selectedCandidate'] for r in x['entries']),'selected')
