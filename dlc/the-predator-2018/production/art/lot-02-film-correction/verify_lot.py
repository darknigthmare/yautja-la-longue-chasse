from pathlib import Path
import hashlib,json
from PIL import Image

def verify(root):
    data=json.loads((root/'manifest.json').read_text())
    assert data['attemptCount']==len(data['files'])==5
    assert data['newApprovedSprites']==data['newApprovedAnimations']==0
    for rel,expect in data['files'].items():
        p=root/rel
        assert p.resolve().is_relative_to(root.resolve()) and not p.is_symlink()
        raw=p.read_bytes()
        assert len(raw)==expect['bytes']
        assert hashlib.sha256(raw).hexdigest()==expect['sha256']
        assert hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()==expect['gitBlobSha1']
        with Image.open(p) as im:
            im.load()
            assert im.format=='PNG' and im.mode==expect['mode']
            assert list(im.size)==[expect['width'],expect['height']]
            assert list(im.getchannel('A').getextrema())==expect['alphaRange']
        assert expect['status']=='rejected-film-fidelity-mismatch'
        assert all(expect[k] is False for k in ('visualMatchApproved','runtimeIntegrated','animationComplete'))
    gate=json.loads((root/'FILM_FIDELITY_GATE.json').read_text())
    assert gate['approvedAssetPaths']==[] and gate['historicalLot01Excluded'] is True
    return {'fileIntegrityChecksPassed':5,'fileIntegrityChecksTotal':5,'approvedSprites':0,'approvedAnimations':0,'artisticFidelityCertified':False,'ok':True}
if __name__=='__main__':
    print(json.dumps(verify(Path(__file__).resolve().parent)))
