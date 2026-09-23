"""Measure original generated PNGs and emit atlas metadata; never alter source pixels."""
from pathlib import Path
from PIL import Image
import numpy as np
import json, hashlib
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'work/v48/art-qa'; OUT.mkdir(parents=True,exist_ok=True)
POSES=['idle','walk','jump','jab','blade','throw','dodge','hurt','thrown','ko']
TIMES=[[45,45],[10,10],[12,12],[8,18],[12,21],[14,28],[10,13],[8,10],[14,18],[24,66]]
def components(mask):
 h,w=mask.shape; seen=np.zeros(mask.shape,dtype=bool); result=[]
 for y,x in zip(*np.where(mask)):
  if seen[y,x]:continue
  stack=[(int(x),int(y))]; seen[y,x]=True; n=0; x0=x1=int(x); y0=y1=int(y)
  while stack:
   xx,yy=stack.pop();n+=1;x0=min(x0,xx);x1=max(x1,xx);y0=min(y0,yy);y1=max(y1,yy)
   for nx,ny in [(xx-1,yy),(xx+1,yy),(xx,yy-1),(xx,yy+1)]:
    if 0<=nx<w and 0<=ny<h and mask[ny,nx] and not seen[ny,nx]:seen[ny,nx]=True;stack.append((nx,ny))
  if n>1500:result.append({'pixels':n,'bounds':[x0,y0,x1+1,y1+1]})
 return result
BLADE_HANDS={'unblooded-right':[[80,691],[536,687]],'unblooded-left':[[182,682],[315,697]],'mentor-right':[[78,678],[543,689]],'mentor-left':[[184,690],[303,713]]}
manifest={'version':1,'actorKind':'unblooded','scenes':{x:{'src':f'/game/youth/v48/{x}.png'} for x in ['dojo','camp','quarters']},'blade':{'src':'/game/prologue/v47/detached-blade.png'},'props':{},'actors':{'player':{},'rival':{}}}
manifest['scenes']['dojo']['groundY']=733 # Measured upper contact edge in the original 941px-high PNG.
report={'schemaVersion':1,'files':[],'atlases':[],'errors':[],'notes':['Original OpenAI PNG bytes preserved. Native left/right, no mirroring.', 'Opaque silhouettes measured at alpha above64, crop margin2pixels; faint antialias fringes up to45/255 can touch a crop border. No runtime alpha erasure.','80 distinct source drawings, ten short two-drawing clips per actor direction. Not full production-density animation.','Per-figure measured rectangles; irregular row spacing is not treated as a uniform grid.','Only blade-pose hand anchors are consumed by runtime; others are within the sprite body.','Original clan mentor, Unblooded and homeworld settings are project adaptations, not claimed named canonical likenesses.']}
for f in sorted((ROOT/'public/game/youth/v48').glob('*.png')):
 im=Image.open(f); raw=f.read_bytes(); report['files'].append({'file':f.name,'src':'/game/youth/v48/'+f.name,'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw),'width':im.width,'height':im.height,'mode':im.mode})
 if f.stem not in BLADE_HANDS:continue
 alpha=np.asarray(im)[:,:,3]; h,w=alpha.shape
 comps=components(alpha>64)
 def row(c):
  b=c['bounds'][3]
  return 0 if b<340 else 1 if b<630 else 2 if b<905 else 3 if b<1170 else 4
 ordered=[]
 for r in range(5):
  cells=sorted([c for c in comps if row(c)==r],key=lambda c:c['bounds'][0]); assert len(cells)==4,(f.name,r,len(cells)); ordered+=cells
 frames=[]; cells=[]; covered=np.zeros(alpha.shape,dtype=bool); standing=[]
 for i,component in enumerate(ordered):
  bx0,by0,bx1,by1=component['bounds'];x0=max(0,bx0-2);y0=max(0,by0-2);x1=min(w,bx1+2);y1=min(h,by1+2)
  a=alpha[y0:y1,x0:x1];visible=a>16;ys,xs=np.where(visible);bottom=int(ys.max())+1
  foot=np.where(visible[max(0,bottom-20):bottom].any(axis=0))[0]
  pivot=[round((int(foot.min())+int(foot.max())+1)/2,1),bottom]
  point=[int((bx0+bx1)/2),int(by0+(by1-by0)*.48)]
  if i in [8,9]: point=BLADE_HANDS[f.stem][i-8]
  # Anchor must land on an opaque wrist/hand, choose nearest pixel only within the measured 6px tolerance.
  hx,hy=point
  if alpha[hy,hx]<=128:
   radius=6; yy,xx=np.where(alpha[max(0,hy-radius):hy+radius+1,max(0,hx-radius):hx+radius+1]>128)
   if len(xx):
    options=[(int(x)+max(0,hx-radius),int(y)+max(0,hy-radius)) for x,y in zip(xx,yy)];hx,hy=min(options,key=lambda p:(p[0]-point[0])**2+(p[1]-point[1])**2)
  hand=[hx-x0,hy-y0]
  border=np.concatenate([a[0],a[-1],a[:,0],a[:,-1]])
  if int(border.max())>64: report['errors'].append(f'{f.name}/{i}: visible body reaches crop edge ({int(border.max())})')
  if i in [8,9] and alpha[hy,hx]<=128:report['errors'].append(f'{f.name}/{i}: blade anchor outside opaque wrist')
  frames.append({'rect':[x0,y0,x1-x0,y1-y0],'pivot':pivot,'handAnchor':hand,'durationTicks':1});covered[y0:y1,x0:x1]=True
  cells.append({'index':i,'rect':frames[-1]['rect'],'borderAlphaMax':int(border.max()),'bladeHandGlobal':[hx,hy] if i in [8,9] else None,'visiblePixels':int(visible.sum())})
  if i<4:standing.append(by1-by0)
 actor='player' if f.stem.startswith('unblooded') else 'rival'; direction=f.stem.split('-')[-1]
 clips={pose:{'loop':pose in ['idle','walk'],'frames':[{**frames[2*n+j],'durationTicks':(32 if actor=='rival' and pose=='jab' and j==0 else TIMES[n][j])} for j in range(2)]} for n,pose in enumerate(POSES)}
 manifest['actors'][actor][direction]={'src':'/game/youth/v48/'+f.name,'bodyHeight':float(np.median(standing)),'clips':clips}
 missed=int(((alpha>16)&~covered).sum());total=int((alpha>16).sum());edge=int(max(alpha[0].max(),alpha[-1].max(),alpha[:,0].max(),alpha[:,-1].max()))
 if missed>30:report['errors'].append(f'{f.name}: {missed} visible pixels outside crops')
 report['atlases'].append({'file':f.name,'drawings':20,'bodyHeight':float(np.median(standing)),'edgeAlphaMax':edge,'visiblePixels':total,'visiblePixelsOutsideFrames':missed,'cells':cells})
# Props use independent measured cell areas: the wide platform is intentionally not squeezed into a uniform quarter.
prop_cells={'trainingTarget':[0,0,310,496],'platform':[310,0,615,496],'marker':[925,0,243,496],'bladeRack':[1168,0,368,496],'maskPedestal':[0,496,250,528],'cot':[250,496,564,528],'door':[814,496,402,528],'brazier':[1216,496,320,528]}
a=np.asarray(Image.open(ROOT/'public/game/youth/v48/props.png'))[:,:,3]
for key,(x,y,w,h) in prop_cells.items():
 local=a[y:y+h,x:x+w]; yy,xx=np.where(local>16);x0=x+int(xx.min())-2;y0=y+int(yy.min())-2;x1=x+int(xx.max())+3;y1=y+int(yy.max())+3
 manifest['props'][key]={'src':'/game/youth/v48/props.png','rect':[x0,y0,x1-x0,y1-y0],'pivot':[(x1-x0)/2,y1-y0-2]}
report['automatedChecksPassed']=not report['errors']
(OUT/'frames.json').write_text(json.dumps({'manifest':manifest,'report':report},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(ROOT/'docs/v48-art-qa.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
if report['errors']:
 print(json.dumps(report['errors'],indent=2));raise SystemExit(1)
(ROOT/'app/game/youthArtManifest.ts').write_text('import type { YouthArtManifest } from "./youthTrainingRendering";\n\n/** Native OpenAI raster drawings. Sources unchanged; measured independent rectangles. */\nexport const YOUTH_ART_MANIFEST: YouthArtManifest = '+json.dumps(manifest,ensure_ascii=False,indent=2)+';\n',encoding='utf-8')
print(json.dumps({'passed':True,'files':len(report['files']),'nativeDrawings':80,'props':8,'framesOutside':[a['visiblePixelsOutsideFrames'] for a in report['atlases']]}))
