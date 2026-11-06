#!/usr/bin/env python3
"""Extract 50 provisional concepts; not individually generated HD or certified 1:1."""
import argparse, hashlib, json, re, struct, urllib.request, urllib.parse, zlib
from pathlib import Path
BASE = Path('art-source/mobilite/vehicules-montures/v0.1')
REQUEST = Path('docs/campagne/mobilite/SPRITES_EXTRACTION_V0_1.json')
REPORT = Path('docs/campagne/mobilite/SPRITES_INDIVIDUELS_V0_1.md')
SOURCE_SHA = '2ebb0e8baa157a4b65be915bc8c6e2225916440486007c7d8ab189cac7b49a2e'
NOTES = {
 'blade_fighter_k93': 'Non conforme à la référence Kenner : mâchoire verticale au lieu de la pince horizontale. Redessin requis.',
 'blade_fighter_viper': 'Comparaison primaire NECA multiangle à réaliser.',
 'clan_hoverbike': 'Comparaison avec la moto de Badlands à réaliser; pas de certification filmique.',
 'forest_stalker_mount': 'Les six membres prévus ne sont pas démontrés dans cette vue.',
 'sand_mauler': 'Les six membres prévus ne sont pas démontrés dans cette vue.',
 'ice_fang': 'Silhouette touchant le bord droit de la source; stabilisateurs supplémentaires à vérifier.',
 'elder_great_beast': 'Les six membres prévus ne sont pas démontrés dans cette vue.',
 'razorwing': 'Quatre ailes demandées, principalement une paire visible : redessin requis.',
 'cliff_leaper': 'Deux bras de préhension supplémentaires à définir et vérifier.'
}
def digest(data): return hashlib.sha256(data).hexdigest()
def require(value, message):
 if not value: raise ValueError(message)
def decode_png(data):
 require(data[:8] == b'\x89PNG\r\n\x1a\n', 'PNG signature')
 pos=8; compressed=bytearray(); header=None
 while pos < len(data):
  require(pos+12 <= len(data), 'Truncated chunk')
  size=struct.unpack('>I',data[pos:pos+4])[0]; kind=data[pos+4:pos+8]; body=data[pos+8:pos+8+size]
  require(len(body)==size and pos+12+size<=len(data),'Truncated body')
  require(zlib.crc32(kind+body)&0xffffffff==struct.unpack('>I',data[pos+8+size:pos+12+size])[0],'CRC')
  if kind==b'IHDR':header=struct.unpack('>IIBBBBB',body)
  if kind==b'IDAT':compressed.extend(body)
  pos+=size+12
  if kind==b'IEND': break
 require(header == (1536,1024,8,6,0,0,0), 'Expected RGBA8, non-interlaced 1536x1024')
 w,h=header[:2]; stride=w*4; expected=(stride+1)*h
 dec=zlib.decompressobj(); raw=dec.decompress(compressed,expected+1)
 require(len(raw)==expected and dec.eof and not dec.unused_data,'PNG decompression size')
 pixels=bytearray(w*h*4); prior=bytearray(stride)
 for y in range(h):
  start=y*(stride+1); f=raw[start]; row=bytearray(raw[start+1:start+1+stride]); require(f in range(5),'Filter')
  for x in range(stride):
   a=row[x-4] if x>=4 else 0; b=prior[x]; c=prior[x-4] if x>=4 else 0
   if f==1: v=a
   elif f==2: v=b
   elif f==3: v=(a+b)//2
   elif f==4:
    p=a+b-c; pa,pb,pc=abs(p-a),abs(p-b),abs(p-c); v=a if pa<=pb and pa<=pc else b if pb<=pc else c
   else: v=0
   row[x]=(row[x]+v)&255
  pixels[y*stride:(y+1)*stride]=row; prior=row
 return w,h,pixels

def png_bytes(w,h,pixels):
 def chunk(k,b):return struct.pack('>I',len(b))+k+b+struct.pack('>I',zlib.crc32(k+b)&0xffffffff)
 rows=b''.join(b'\0'+pixels[y*w*4:(y+1)*w*4]for y in range(h))
 return b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',w,h,8,6,0,0,0))+chunk(b'IDAT',zlib.compress(rows,9))+chunk(b'IEND',b'')

def extract(w,h,pixels,box):
 x0,y0,x1,y1=box; require(0<=x0<x1<=w and 0<=y0<y1<=h,'Crop outside source')
 cw,ch=x1-x0,y1-y0; cell=bytearray(cw*ch*4); occupied=[]
 for y in range(ch):
  for x in range(cw):
   s=((y+y0)*w+x+x0)*4; d=(y*cw+x)*4; a=max(0,min(255,((pixels[s+3]-90)*255)//160))
   if a: cell[d:d+3]=pixels[s:s+3];cell[d+3]=a;occupied.append((x,y))
 require(occupied,'Empty sprite')
 l=min(p[0]for p in occupied);r=max(p[0]for p in occupied)+1;t=min(p[1]for p in occupied);b=max(p[1]for p in occupied)+1
 fw,fh=r-l+16,b-t+16; final=bytearray(fw*fh*4)
 for y in range(t,b):
  dst=((y-t+8)*fw+8)*4;final[dst:dst+(r-l)*4]=cell[(y*cw+l)*4:(y*cw+r)*4]
 return fw,fh,bytes(final),l==0 or r==cw or t==0 or b==ch

def safe_write(path,data):
 if path.exists(): require(path.read_bytes()==data, 'Refusing overwrite: '+str(path))
 else:path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(data)

def main():
 ap=argparse.ArgumentParser();ap.add_argument('--source-file');args=ap.parse_args();req=json.loads(REQUEST.read_text())
 require(req['source_sha256']==SOURCE_SHA and req['destination']==str(BASE),'Unapproved source/destination')
 rows=req['entries'];require(len(rows)==50 and [r[0]for r in rows]==list(range(1,51)),'50 ordered rows')
 require(len({r[1]for r in rows})==50 and all(re.fullmatch(r'[a-z0-9_]+',r[1])for r in rows),'Unique safe IDs')
 if args.source_file:data=Path(args.source_file).read_bytes()
 else:
  url=req['source_url'];u=urllib.parse.urlparse(url)
  require(u.scheme=='https'and u.netloc=='d2ol7oe51mr4n9.cloudfront.net'and not u.query,'Unapproved media URL')
  with urllib.request.urlopen(url,timeout=60)as response:data=response.read(4_000_001)
 require(len(data)<=4_000_000 and digest(data)==SOURCE_SHA,'Source bytes/SHA256 mismatch')
 w,h,pixels=decode_png(data);entries=[];pending=[]
 for n,uid,name,box,size,expected_pixel_sha in rows:
  sw,sh,rgba,edge=extract(w,h,pixels,box)
  require([sw,sh]==size and digest(rgba)==expected_pixel_sha,'RGBA mismatch: '+uid)
  payload=png_bytes(sw,sh,rgba);path=BASE/f'{n:02d}_{uid}__concept_3q_left.png';alpha=rgba[3::4]
  require(min(alpha)==0 and max(alpha)==255,'Alpha validation: '+uid)
  entry={'index':n,'catalogue_id':uid,'name':name,'path':str(path),'source_crop_xyxy':box,'size':size,'sha256':digest(payload),'rgba_sha256':digest(rgba),'bytes':len(payload),'transparent_pixels':alpha.count(0),'visible_pixels':len(alpha)-alpha.count(0),'source_cell_edge_contacts':edge,'regenerated_individually':False,'runtime_integrated':False,'canonical_1_to_1_certified':False,'human_art_validated':False,'status':'concept_low_resolution_unvalidated','visual_review_note':NOTES.get(uid,'Conformité exacte au brief, anatomie/mécanique et angles à valider sur une génération individuelle dédiée.')}
  entries.append(entry);pending.append((path,payload))
 require(len({e['sha256']for e in entries})==50,'Duplicate PNG')
 manifest={'schema':'yautja-mobility-source-art/0.1','source_sha256':SOURCE_SHA,'source_size':[w,h],'count':50,'scope':'50 PNG individuels extraits de la planche existante; PAS 50 generations individuelles HD ni certification 1:1.','alpha_cleanup':'(source_alpha-90)*255//160, borné 0..255; RGB source conservés; 8 px de marge; aucun agrandissement','entries':entries}
 pending.append((BASE/'MANIFEST.json',(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n').encode()))
 report='''# Mobilité — sprites individuels V0.1, livraison partielle

**50 PNG individuels extraits de la planche source déjà générée. Ce ne sont pas 50 nouvelles générations haute définition, ni des sprites certifiés 1:1.**

Les tentatives de génération supplémentaires ont encore produit des planches collectives, écartées de ce lot. Les six soumissions au service alternatif ont été refusées (abonnement requis); aucun abonnement ni essai n'a été activé. La génération HD individuelle reste à réaliser.

## Vérifications réellement exécutées

SHA-256 de la source, CRC et décompression PNG, 50 IDs uniques, empreintes des pixels RGBA comparées au découpage contrôlé localement, 50 fichiers distincts avec alpha effectif et marge transparente de huit pixels. Aucun agrandissement. Ce sont des vérifications d'images et non une QA du jeu.

## Réserves artistiques

Le Blade Fighter Kenner a une mâchoire verticale incorrecte : le catalogue Kenner 1994 p.22 montre une pince horizontale. Viper et Badlands nécessitent leur référence primaire multiangle. Plusieurs montures ne démontrent pas leurs six membres; Razorwing ne montre principalement qu'une paire d'ailes au lieu des quatre prévues; Ice Fang touche le bord droit de la source. Les défauts individuels restent dans le manifeste.

Référence primaire examinée : https://wheeljackslab.com/files/uploads/18Kenner-1994-Toy-Fair-Employee-Dealer-Vendor-Rep-Catalog-Page-040c1e71-e682-447d-957e-adabd1fa6d57.pdf (p.22). Piste officielle Badlands, pas une certification de la moto : https://theyard-vfx.com/2026/01/27/predator-badlands-vfx-breakdown/ .

## État de production

Sources dans `art-source/mobilite/vehicules-montures/v0.1/`. Aucun code de jeu, sauvegarde, atlas validé, rang, accès, véhicule possédé ou compagnon n'est modifié. Les annexes existantes restent intactes. Pas de fusion ni de déploiement manuel.

Restent ouverts : régénération individuelle HD, vues utiles, anatomie et références, versions vides/occupées adaptées, animations, VFX, intégration et QA moteur. `runtime_integrated`, `canonical_1_to_1_certified` et `human_art_validated` sont faux partout.

## PNG individuels

| N° | ID | Fichier | Dimensions natives |
|---|---|---|---|
'''
 for e in entries:report+=f"| {e['index']:02d} | `{e['catalogue_id']}` | [{e['name']}](../../../{e['path']}) | {e['size'][0]} × {e['size'][1]} |\n"
 report+='\n[Manifeste détaillé](../../../art-source/mobilite/vehicules-montures/v0.1/MANIFEST.json).\n'
 pending.append((REPORT,report.encode()))
 pending.append((BASE/'README.md',b'# Concepts individuels - 50 PNG\n\nExtraits de la planche source, non regeneres individuellement en HD. Non certifies 1:1. Voir MANIFEST.json et [le rapport](../../../../docs/campagne/mobilite/SPRITES_INDIVIDUELS_V0_1.md).\n'))
 for path,payload in pending:
  if path.exists():require(path.read_bytes()==payload,'Refusing overwrite: '+str(path))
 for path,payload in pending:safe_write(path,payload)
 print(json.dumps({'png':50,'unique_ids':50,'unique_png_sha256':50,'rgba_matches':50,'files_written_or_verified':len(pending),'manifest_sha256':digest((BASE/'MANIFEST.json').read_bytes()),'source_edge_contacts':[e['catalogue_id']for e in entries if e['source_cell_edge_contacts']],'runtime_modified':False,'certified_1_to_1':False},ensure_ascii=False))
if __name__=='__main__':main()
