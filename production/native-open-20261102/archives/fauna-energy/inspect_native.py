from pathlib import Path
from PIL import Image
import hashlib,json,shutil

root=Path(__file__).parent
entries=json.loads((root/'generation-prompts.json').read_text())['generations']
for file in sorted(root.glob('generation-batch-*.json')):
    entries.extend(json.loads(file.read_text())['generations'])
rows=[]
for entry in entries:
    src=Path(entry['source']);name=entry.get('filename',entry['id']+'-emitter-left-native.png');dest=root/name
    if not dest.exists(): shutil.copyfile(src,dest)
    assert src.read_bytes()==dest.read_bytes()
    im=Image.open(dest);a=im.getchannel('A');w,h=im.size
    row={**entry,'path':str(dest),'sha256':hashlib.sha256(dest.read_bytes()).hexdigest(),'bytes':dest.stat().st_size,'dimensions':[w,h],'mode':im.mode,'alphaExtrema':a.getextrema(),'byteIdenticalToOriginal':True,'thresholds':{},'humanValidated':False,'admitted':False,'visualStatus':'CANDIDAT_NON_ADMIS'}
    for t in [0,2,8,128]:
        mask=a.point(lambda v:255 if v>t else 0);b=mask.getbbox();p=mask.load()
        edge=sum(p[x,0]>0 for x in range(w))+sum(p[x,h-1]>0 for x in range(w))+sum(p[0,y]>0 for y in range(1,h-1))+sum(p[w-1,y]>0 for y in range(1,h-1))
        row['thresholds'][str(t)]={'bbox':b,'margins':[b[0],b[1],w-b[2],h-b[3]] if b else None,'edgePixels':edge,'occupiedPixels':sum(v>t for v in a.get_flattened_data())}
    b=row['thresholds']['8']['bbox']
    row['proposedBasePivot']={'pixel':[round((b[0]+b[2])/2,2),b[3]-1],'normalised':[round((b[0]+b[2])/2/w,5),round((b[3]-1)/h,5)],'status':'BOUNDING_BOX_DIAGNOSTIC_ONLY_NOT_RUNTIME_QUALIFIED'}
    row['centreAlpha']=a.getpixel((w//2,h//2))
    rows.append(row)
(root/'native-technical-inspection.json').write_text(json.dumps({'schemaVersion':1,'imageEditOperations':[],'entries':rows},ensure_ascii=False,indent=2)+'\n')
for r in rows:
    print(r['id'],r['dimensions'],r['sha256'],r['thresholds']['0']['edgePixels'],r['thresholds']['2']['margins'],'centreAlpha',r['centreAlpha'])
