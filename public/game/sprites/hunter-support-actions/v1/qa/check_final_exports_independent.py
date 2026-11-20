#!/usr/bin/env python3
"""Read-only independent source/export/import and vertical floor registration verification."""
from pathlib import Path
from PIL import Image
import argparse,hashlib,json
import numpy as np

def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()

def main():
 p=argparse.ArgumentParser();p.add_argument('pack');p.add_argument('--output',required=True);args=p.parse_args();pack=Path(args.pack);audit=Path(__file__).parent
 candidate=audit/'floor_anchor_candidates.json';candidate_sha=sha(candidate);assert candidate_sha=='39c7dcf81223892f0df6cd91cd6cf7d0c54929ee2897d3ca7e759a50284bbf70'
 floor=json.loads(candidate.read_text());source_qa_path=audit/'FINAL_SOURCE_QA.json';selected={p['id']:p for p in json.loads(source_qa_path.read_text())['atlases']};anim=json.loads((pack/'animations.json').read_text());imports=json.loads((pack/'import_atlases.json').read_text())
 assert anim['artisticStatus']=='draft' and anim['rosterBinding'] is None
 assert len(anim['actions'])==16 and len(anim['clips'])==19 and anim['frameCount']==304
 assert sum(a['kind']=='loop'for a in anim['actions'])==4
 assert sum(a['kind']=='one-shot'for a in anim['actions'])==12
 assert all(a['gameCoverage']['runtimeBinding'] is None for a in anim['actions'])
 result={'status':'passed','scope':'Independent read-only verification of 19 selected sources,304 exported frames,304 guarded import cells and224 floor-Y pivots. Separate grip report verifies64 grip pivots. Not a gameplay or artistic validation.','pack':str(pack),'sourceQaReceiptSha256':sha(source_qa_path),'floorCandidateSha256':candidate_sha,'reviewTargetY':302.5,'pages':[]}
 native_pages={}
 for native_path in sorted((pack/'runtime_atlases').glob('*.draft.json')):
  doc=json.loads(native_path.read_text());assert doc['status']=='draft'
  for native_clip in doc['clips']:
   assert native_clip['status']=='draft'
   for frame in native_clip['frames']:native_pages.setdefault(frame['pageId'],[]).append(frame)
 assert len(native_pages)==19 and all(len(frames)==16 for frames in native_pages.values())
 rawhashes=[];visiblehashes=[];totalpixels=0
 for clip in anim['clips']:
  key=clip['id'];srcpath=pack/clip['atlas'];source_sha=sha(srcpath);assert source_sha==selected[key]['sourceSha256']==clip['sourceSha256']
  src=np.asarray(Image.open(srcpath).convert('RGBA'));imp=next(x for x in imports['atlases']if x['id']==key);packed=np.asarray(Image.open(pack/imp['file']).convert('RGBA'));nf=native_pages[key]
  if key in floor['pages']:assert source_sha==floor['pages'][key]['sourceSha256']
  checked_floor=0;floor_rows=[];offsets=[];relative_errors=[];horizontal_offsets=[]
  for i,f in enumerate(clip['frames']):
   rect=f['atlasRect'];cell=src[rect['y']:rect['y']+rect['height'],rect['x']:rect['x']+rect['width']];expected=np.zeros((314,314,4),np.uint8);expected[:cell.shape[0],:cell.shape[1]]=cell
   exported=np.asarray(Image.open(pack/f['file']).convert('RGBA'));assert np.array_equal(expected,exported)
   ir=imp['frames'][i]['atlasRect'];guard=packed[ir['y']:ir['y']+318,ir['x']:ir['x']+318];ge=np.zeros((318,318,4),np.uint8);ge[2:316,2:316]=expected;assert np.array_equal(guard,ge)
   pv=np.array([f['pivot']['x'],f['pivot']['y']],float);offset=np.array([f['drawOffset']['x'],f['drawOffset']['y']],float);target=np.array([f['anchorTarget']['x'],f['anchorTarget']['y']],float)
   assert np.allclose(target-pv,offset,rtol=0,atol=1e-12)
   assert np.allclose(nf[i]['pivot'],pv+2,rtol=0,atol=1e-12)
   assert np.allclose([imp['frames'][i]['pivot']['x'],imp['frames'][i]['pivot']['y']],pv+2,rtol=0,atol=1e-12)
   rawhashes.append(hashlib.sha256(expected.tobytes()).hexdigest());visible=expected.copy();visible[visible[:,:,3]<16]=0;visiblehashes.append(hashlib.sha256(visible.tobytes()).hexdigest());totalpixels+=314*314
   if key in floor['pages']:
    c=floor['pages'][key]['frames'][i];alpha=cell[:,:,3];counts=np.count_nonzero(alpha>=128,axis=1);row=int(np.flatnonzero(counts>=8)[-1]);fy=row+.5
    assert fy==c['floorY']==pv[1] and pv[0]==c['originalPivot']['x'] and offset[0]==0 and target[1]==302.5
    assert offset[1]==302.5-fy and float(offset[1]).is_integer()
    y,x=np.nonzero(alpha>=128);relative_before=y.astype(float)+.5-fy;relative_after=y.astype(float)+.5+offset[1]-302.5
    error=float(np.max(np.abs(relative_after-relative_before)));assert error==0
    floor_rows.append(fy);offsets.append(offset[1]);relative_errors.append(error);horizontal_offsets.append(offset[0]);checked_floor+=1
  result['pages'].append({'id':key,'sourceSha256':source_sha,'sourceFileByteIdenticalToSelected':True,'sourceCellsEqualExports':16,'guardedCellsExact':16,'pivotsAndGuardOffsetsChecked':16,'floorPivotsChecked':checked_floor,'floorYBeforeRange':([min(floor_rows),max(floor_rows)]if floor_rows else None),'projectedFloorY':302.5 if checked_floor else None,'floorYTranslations':offsets if checked_floor else None,'maximumInternalYError':max(relative_errors) if relative_errors else None,'horizontalFloorTranslation':max(horizontal_offsets)if horizontal_offsets else None})
 result.update({'selectedSourcePages':19,'exportedFramesCompared':304,'guardedImportCellsCompared':304,'pivotsAndGuardOffsetsChecked':304,'floorPivotsChecked':sum(p['floorPivotsChecked']for p in result['pages']),'comparedSourcePaddingRgbaPixels':totalpixels,'rawRgbaUniqueFrames':len(set(rawhashes)),'visibleNormalizedUniqueFrames':len(set(visiblehashes)),'sourcePixelsChanged':0,'floorHorizontalTranslationsChanged':0,'floorInternalRelativeYMaximumError':0})
 assert result['floorPivotsChecked']==224 and len(set(rawhashes))==304 and len(set(visiblehashes))==304
 Path(args.output).write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({k:v for k,v in result.items()if k!='pages'},indent=2))
if __name__=='__main__':main()
