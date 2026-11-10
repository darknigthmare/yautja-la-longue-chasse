#!/usr/bin/env python3
"""Independent read-only verification of exported grip registration and pixels."""
from pathlib import Path
import argparse,hashlib,json,math
import numpy as np
from PIL import Image
from scipy.ndimage import label

def measured(cell):
    alpha=cell[:,:,3];mask=alpha>=128;ys,xs=np.where(mask);top=int(ys.min());mask[top+12:]=False
    labels,n=label(mask,np.ones((3,3),int));points=[]
    for k in range(1,n+1):
        y,x=np.where(labels==k)
        if len(x)>=8:points.append([float(x.mean()+.5),float(y.mean()+.5)])
    assert len(points)==2
    grip=np.array(points).mean(axis=0)
    bottom=int(np.where(alpha>=128)[0].max());lower=(alpha>=128)&(np.indices(alpha.shape)[0]>=bottom-24)
    y,x=np.where(lower);foot=float(x.mean()+.5)
    return grip,foot

def main():
    p=argparse.ArgumentParser();p.add_argument('pack');p.add_argument('--output',required=True);a=p.parse_args();root=Path(a.pack)
    candidate=Path(__file__).parent/'grip_anchor_candidates.json';candidate_bytes=candidate.read_bytes();c=json.loads(candidate_bytes)
    candidate_sha=hashlib.sha256(candidate_bytes).hexdigest()
    assert candidate_sha=='14e3ae266223fe3cf24c87c6039fd3d99dfb68db0e21e292f44948edb34f85be'
    anim=json.loads((root/'animations.json').read_text());imports=json.loads((root/'import_atlases.json').read_text());anchors=json.loads((root/'anchor_measurements.json').read_text())
    result={'status':'passed','scope':'independent source-byte, decoded-pixel and mathematical pivot verification; not human anatomical review or gameplay proof','pack':str(root),'candidateReceiptSha256':candidate_sha,'pages':[]}
    for key in ['canopy_attach','canopy_hold','canopy_swing','canopy_release']:
        clip=next(x for x in anim['clips']if x['id']==key);imp=next(x for x in imports['atlases']if x['id']==key)
        page=c['pages'][key];raw=(root/clip['atlas']).read_bytes();sha=hashlib.sha256(raw).hexdigest()
        assert sha==page['sourceSha256']==clip['sourceSha256']==anchors['clips'][key]['sourceSha256']
        src=np.array(Image.open(root/clip['atlas']).convert('RGBA'));packed=np.array(Image.open(root/imp['file']).convert('RGBA'))
        native=json.loads((root/'runtime_atlases'/f'{key}.draft.json').read_text());native_frames=native['clips'][0]['frames'];assert native['status']=='draft'
        grip_after=[];grip_rounded=[];relative_before=[];relative_after=[];compared=0
        for i,fr in enumerate(clip['frames']):
            rect=fr['atlasRect'];cell=src[rect['y']:rect['y']+rect['height'],rect['x']:rect['x']+rect['width']]
            expected=np.zeros((314,314,4),np.uint8);expected[:cell.shape[0],:cell.shape[1]]=cell
            exported=np.array(Image.open(root/fr['file']).convert('RGBA'));assert np.array_equal(expected,exported)
            ir=imp['frames'][i]['atlasRect'];guarded=packed[ir['y']:ir['y']+318,ir['x']:ir['x']+318];guard_expected=np.zeros((318,318,4),np.uint8);guard_expected[2:316,2:316]=expected
            assert np.array_equal(guarded,guard_expected)
            pivot=np.array([fr['pivot']['x'],fr['pivot']['y']]);target=np.array([157.,50.]);offset=np.array([fr['drawOffset']['x'],fr['drawOffset']['y']]);expected_pivot=page['candidatePivots'][i]
            assert np.array_equal(pivot,np.array([expected_pivot['x'],expected_pivot['y']]))
            assert np.allclose(offset,target-pivot,rtol=0,atol=1e-12)
            assert np.allclose(native_frames[i]['pivot'],pivot+2,rtol=0,atol=1e-12)
            assert np.allclose([imp['frames'][i]['pivot']['x'],imp['frames'][i]['pivot']['y']],pivot+2,rtol=0,atol=1e-12)
            compared+=expected.size//4
            if key in ['canopy_hold','canopy_swing'] or (key=='canopy_attach'and i==15) or(key=='canopy_release'and i==0):
                grip,foot=measured(cell);assert np.allclose(grip,pivot,rtol=0,atol=1e-12)
                grip_after.append(grip+offset);grip_rounded.append(grip+np.floor(offset+.5));relative_before.append(foot-grip[0]);relative_after.append((foot+offset[0])-(grip[0]+offset[0]))
        diff=np.abs(np.array(relative_before)-np.array(relative_after));assert float(diff.max())<1e-12
        after=np.array(grip_after);rounded=np.array(grip_rounded)
        assert np.max(np.abs(after-np.array([157.,50.])))<1e-12
        result['pages'].append({'id':key,'sourceSha256':sha,'checkedPivots':16,'sourceCellsEqualExports':16,'guardedCellsExact':16,'nativePivotGuardOffset':2,'comparedRgbaPixels':compared,'measuredContactFrames':len(after),'projectedGripRange':np.ptp(after,axis=0).tolist(),'roundedGripRange':np.ptp(rounded,axis=0).tolist(),'relativeFootRangeBefore':float(np.ptp(relative_before)),'relativeFootRangeAfter':float(np.ptp(relative_after)),'maximumRelativeFootError':float(diff.max())})
    result['checkedPivots']=sum(p['checkedPivots']for p in result['pages']);result['comparedRgbaPixels']=sum(p['comparedRgbaPixels']for p in result['pages'])
    Path(a.output).write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))

if __name__=='__main__':main()
