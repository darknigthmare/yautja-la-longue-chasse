from pathlib import Path
from PIL import Image, ImageFilter
import numpy as np

def normalize(source, destination):
    image=Image.open(source).convert('RGB')
    rgb=np.asarray(image).astype(np.float32)
    r,g,b=rgb[:,:,0],rgb[:,:,1],rgb[:,:,2]
    hue=np.asarray(image.convert('HSV'))[:,:,0]
    magenta=(hue>=185)&(hue<=238)
    score=np.minimum(r,b)-1.8*g
    background=magenta&(score>28)&(np.minimum(r,b)>28)
    near=np.asarray(Image.fromarray((background*255).astype('uint8')).filter(ImageFilter.MaxFilter(3)))>0
    alpha=np.ones(score.shape,dtype=np.float32)
    alpha[background]=0
    edge=magenta&near&(~background)&(np.minimum(r,b)>35)&(score>18)
    alpha[edge]=np.clip((28-score[edge])/10,0,1)
    rgba=np.dstack([rgb.astype('uint8'),np.rint(alpha*255).astype('uint8')])
    rgba[rgba[:,:,3]==0,:3]=0
    result=Image.fromarray(rgba,'RGBA')
    result.save(destination,optimize=True)
    return result

if __name__=='__main__':
    root=Path(__file__).resolve().parents[1]
    normalize(root/'sources/eclisse__source_chroma.png',root/'sprites/eclisse/eclisse__trois-quarts-droite__entier.png')
