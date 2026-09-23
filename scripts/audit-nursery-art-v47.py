"""Read-only PNG audit and hand-authored frame metadata. Never saves or alters source pixels."""
from pathlib import Path
from PIL import Image
import numpy as np
import json, hashlib, argparse

ROOT = Path(__file__).resolve().parents[1]
# Coordinates are measured on the original 1254-square images, never on a mirrored image.
HANDS = {
 'youngling-player-right.png': [[223,149],[519,151],[832,168],[1146,168],[195,383],[556,378],[839,385],[1188,379],[135,554],[572,634],[856,624],[1180,624],[113,970],[533,970],[834,862],[1133,828],[160,1104],[481,1075],[761,1202],[1170,1194]],
 'youngling-player-left.png': [[108,153],[430,158],[727,168],[1045,168],[133,388],[390,378],[721,383],[1012,381],[193,551],[385,628],[698,629],[1018,625],[201,978],[439,975],[731,857],[1064,824],[169,1091],[427,1097],[777,1202],[1029,1197]],
 'youngling-rival-left.png': [[108,155],[431,156],[727,169],[1045,171],[132,388],[391,379],[725,384],[1012,382],[193,551],[385,629],[698,629],[1018,625],[201,980],[449,977],[732,856],[1064,824],[169,1091],[428,1097],[777,1204],[1029,1197]],
 'youngling-rival-right.png': [[216,156],[535,155],[864,165],[1190,165],[198,391],[574,387],[857,390],[1213,388],[133,548],[605,630],[898,627],[1200,625],[148,986],[548,980],[843,853],[1148,823],[173,1094],[495,1072],[781,1205],[1142,1204]],
}
POSES = {
 'idle': ([0,1],[45,45],True), 'walk': ([2,3],[10,10],True),
 # Cell 5 is another punch, not a raised readiness gesture. Reuse the real raised arm at cell 8.
 'ready': ([4,8],[20,100],False), 'jab': ([6,7],[8,19],False),
 'blade': ([8,9],[12,22],False), 'throw': ([10,11],[14,26],False),
 'dodge': ([12,13],[10,10],False), 'hurt': ([14,15],[8,8],False),
 'thrown': ([16,17],[14,14],False), 'ko': ([18,19],[24,66],False),
}

def groups(values):
 result=[];start=prev=int(values[0])
 for value in values[1:]:
  value=int(value)
  if value-prev>8:result.append([start,prev+1]);start=value
  prev=value
 result.append([start,prev+1]);return result

def boundaries(spans,end):
 return [0]+[(a[1]+b[0])//2 for a,b in zip(spans,spans[1:])]+[end]

def border(a):
 return np.concatenate((a[0,:],a[-1,:],a[1:-1,0],a[1:-1,-1]))

def main():
 parser=argparse.ArgumentParser();parser.add_argument('--output',default=str(ROOT/'work/v47/art-qa'))
 args=parser.parse_args();output=Path(args.output);output.mkdir(parents=True,exist_ok=True)
 result={'schemaVersion':1,'notes':['Twenty native drawings per atlas. Nineteen used; cell 5 remains unused. Readiness shares the raised-arm drawing at cell 8 with blade windup.','Source PNGs are unchanged. Rectangles follow actual row/column gaps, not a uniform 4 by 5 cut.','Hand anchors are visual measurements for a separate detached blade; no built-in blade is present.'],'actors':{'player':{},'rival':{}},'atlases':[]}
 errors=[]
 for name,hands in HANDS.items():
  path=ROOT/'public/game/prologue/v47'/name
  raw=path.read_bytes();im=Image.open(path).convert('RGBA');rgba=np.array(im);alpha=rgba[:,:,3];mask=alpha>16;h,w=alpha.shape
  rows=groups(np.where(mask.any(axis=1))[0]);assert len(rows)==5,(name,'rows',rows)
  ys=boundaries(rows,h);frames=[];cells=[];standing=[]
  for r,(ry0,ry1) in enumerate(rows):
   cols=groups(np.where(mask[ry0:ry1].any(axis=0))[0]);assert len(cols)==4,(name,'columns',r,cols)
   xs=boundaries(cols,w)
   for c in range(4):
    index=r*4+c;x0,x1=xs[c:c+2];y0,y1=ys[r:r+2];local=mask[y0:y1,x0:x1]
    yy,xx=np.where(local);lx0,lx1=int(xx.min()),int(xx.max())+1;ly0,ly1=int(yy.min()),int(yy.max())+1
    # Bottom 24 source pixels contain both grounded feet; airborne/KO use their visible base.
    foot_x=np.where(local[max(ly0,ly1-24):ly1].any(axis=0))[0]
    pivot=[round((int(foot_x.min())+int(foot_x.max())+1)/2,1),ly1]
    hand=[hands[index][0]-x0,hands[index][1]-y0]
    frame={'rect':[x0,y0,x1-x0,y1-y0],'pivot':pivot,'durationTicks':1,'handAnchor':hand}
    if r==0:standing.append(ly1-ly0)
    handAlpha=int(alpha[hands[index][1],hands[index][0]])
    window=alpha[max(0,hands[index][1]-4):hands[index][1]+5,max(0,hands[index][0]-4):hands[index][0]+5]
    handVisible=int((window>128).sum())
    cellBorder=border(alpha[y0:y1,x0:x1])
    cell={'index':index,'rect':frame['rect'],'opaqueBounds':[lx0,ly0,lx1,ly1],'pivot':pivot,'handAnchor':hand,'handAlpha':handAlpha,'handWindowOpaquePixels':handVisible,'borderAlphaMax':int(cellBorder.max()),'borderPixelsAbove2':int((cellBorder>2).sum()),'bodyTouchesCellEdge':lx0==0 or ly0==0 or lx1==x1-x0 or ly1==y1-y0}
    if not (0<=hand[0]<x1-x0 and 0<=hand[1]<y1-y0) or handVisible<10:errors.append(f'{name} cell {index}: review hand anchor {hands[index]} alpha={handAlpha} window={handVisible}')
    if cell['bodyTouchesCellEdge']:errors.append(f'{name} cell {index}: visible body reaches cell boundary')
    frames.append(frame);cells.append(cell)
  clips={pose:{'loop':loop,'frames':[{**frames[index],'durationTicks':duration} for index,duration in zip(indices,durations)]} for pose,(indices,durations,loop) in POSES.items()}
  actor='player' if '-player-' in name else 'rival';direction='left' if '-left.' in name else 'right'
  sourceBorder=border(alpha);edgeMax=int(sourceBorder.max());bodyHeight=round(float(np.median(standing)),1)
  result['actors'][actor][direction]={'src':'/game/prologue/v47/'+name,'bodyHeight':bodyHeight,'clips':clips}
  result['atlases'].append({'file':name,'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw),'width':w,'height':h,'mode':im.mode,'drawings':20,'usedDrawings':19,'bodyHeight':bodyHeight,'alpha':{'zeroPixels':int((alpha==0).sum()),'onePixels':int((alpha==1).sum()),'twoPixels':int((alpha==2).sum()),'edgeMax':edgeMax,'edgeNonzero':int((sourceBorder>0).sum()),'recommendedNoiseFloor':edgeMax if 0<edgeMax<=2 else None},'rows':rows,'cells':cells})
  if edgeMax>2:errors.append(f'{name}: source edge alpha {edgeMax} exceeds approved 1/2 noise-floor options')
 result['errors']=errors;result['automatedChecksPassed']=not errors
 (output/'frames.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print(json.dumps({'passed':not errors,'atlases':[{k:a[k] for k in ['file','bodyHeight','alpha']} for a in result['atlases']],'errors':errors},indent=2))
 return 0 if not errors else 1
if __name__=='__main__':raise SystemExit(main())
