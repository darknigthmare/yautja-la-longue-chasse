import bpy, math, random, json, hashlib, sys
from pathlib import Path
from mathutils import Vector
from mathutils.noise import noise_vector
random.seed(162)
OUT=Path(__file__).resolve().parents[1]
OUT.joinpath('originals').mkdir(exist_ok=True)
PITCH=math.radians(35)

def reset():
 bpy.ops.wm.read_factory_settings(use_empty=True)
 sc=bpy.context.scene; sc.render.engine='CYCLES'; sc.cycles.device='CPU'; sc.cycles.samples=32; sc.cycles.use_denoising=True; sc.cycles.adaptive_threshold=.07
 sc.cycles.max_bounces=5; sc.cycles.transparent_max_bounces=12
 sc.render.threads_mode='FIXED'; sc.render.threads=4
 sc.render.film_transparent=True; sc.render.image_settings.file_format='PNG'; sc.render.image_settings.color_mode='RGBA'; sc.render.image_settings.color_depth='8'
 sc.view_settings.view_transform='AgX'; sc.view_settings.exposure=1.35; sc.unit_settings.system='METRIC'; sc.unit_settings.scale_length=1.0
 world=bpy.data.worlds.new('neutral'); world.use_nodes=True; world.node_tree.nodes['Background'].inputs[0].default_value=(.28,.32,.39,1);world.node_tree.nodes['Background'].inputs[1].default_value=.35; sc.world=world
 return sc

def stone(name,base=(.072,.064,.055),metal=.1,scale=2.0):
 m=bpy.data.materials.new(name);m.use_nodes=True;n=m.node_tree.nodes;l=m.node_tree.links;p=n.get('Principled BSDF');p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=.76
 g=n.new('ShaderNodeNewGeometry');no=n.new('ShaderNodeTexNoise');no.inputs['Scale'].default_value=scale;no.inputs['Detail'].default_value=5.;no.inputs['Roughness'].default_value=.78;l.new(g.outputs['Position'],no.inputs['Vector'])
 cr=n.new('ShaderNodeValToRGB');cr.color_ramp.elements[0].position=.15;cr.color_ramp.elements[0].color=tuple(c*.38 for c in base)+(1,);cr.color_ramp.elements[1].position=.85;cr.color_ramp.elements[1].color=tuple(min(c*2.3,.8) for c in base)+(1,);l.new(no.outputs['Fac'],cr.inputs[0]);l.new(cr.outputs[0],p.inputs['Base Color'])
 fine=n.new('ShaderNodeTexNoise');fine.inputs['Scale'].default_value=scale*35;fine.inputs['Detail'].default_value=3;l.new(g.outputs['Position'],fine.inputs['Vector'])
 b=n.new('ShaderNodeBump');b.inputs['Strength'].default_value=.63;b.inputs['Distance'].default_value=.035/scale;l.new(fine.outputs['Fac'],b.inputs['Height']);l.new(b.outputs['Normal'],p.inputs['Normal'])
 return m

def emit(name,col,power=2):
 m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*col,1);p.inputs['Emission Color'].default_value=(*col,1);p.inputs['Emission Strength'].default_value=power;p.inputs['Roughness'].default_value=.55;return m

def mesh(name,vs,fs,mat):
 me=bpy.data.meshes.new(name);me.from_pydata(vs,[],fs);me.update();ob=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(ob)
 if mat:me.materials.append(mat)
 return ob

def box(name,loc,size,mat,bev=.02):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mat)
 if bev:
  mod=o.modifiers.new('fine edges','BEVEL');mod.width=bev;mod.segments=2
  mod=o.modifiers.new('weighted normals','WEIGHTED_NORMAL')
 return o

def tube(name,pts,r,mat):
 cu=bpy.data.curves.new(name,'CURVE');cu.dimensions='3D';cu.resolution_u=12;cu.bevel_depth=r;cu.bevel_resolution=2
 sp=cu.splines.new('POLY');sp.points.add(len(pts)-1)
 for q,p in zip(sp.points,pts):q.co=(*p[:3],1);q.radius=p[3] if len(p)>3 else 1
 o=bpy.data.objects.new(name,cu);bpy.context.collection.objects.link(o);o.data.materials.append(mat);return o

def boulder(name,loc,size,mat,seed):
 rr=random.Random(seed);bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=1,location=loc);o=bpy.context.object;o.name=name
 for v in o.data.vertices:
  n=noise_vector(v.co*2.7+Vector((seed*.3,2,5)));v.co*=1+rr.uniform(-.10,.10)+n.x*.12
 o.scale=size;o.data.materials.append(mat)
 bevel=o.modifiers.new('eroded edges','BEVEL');bevel.width=.025;bevel.segments=1
 return o

def buttress():
 dark=stone('tower shell - patinated dark stone metal',(.075,.063,.048),.38,.65);edge=stone('worn muted bronze edge',(.15,.095,.044),.65,3);recess=stone('recessed dark fluting',(.024,.022,.02),.2,3);red=emit('restrained red signal',(.45,.016,.003),1.5)
 N=180;vs=[];fs=[]
 def shape(t):return (8.5*t*t-1.2*t,32*t,3.1*(1-t)**.7+.38,.95*(1-t)+.28)
 for i in range(N+1):
  t=i/N;x,z,w,d=shape(t)
  for dx,dy in [(-w/2,-d),(w/2,-d),(w/2,d),(-w/2,d)]:vs.append((x+dx,dy,z))
 for i in range(N):
  for k in range(4):a=4*i+k;b=4*i+(k+1)%4;fs.append((a,b,b+4,a+4))
 fs.extend([(3,2,1,0),(4*N,4*N+1,4*N+2,4*N+3)])
 o=mesh('single curved tower buttress',vs,fs,dark);be=o.modifiers.new('small chamfers','BEVEL');be.width=.045;be.segments=3
 for k,off in enumerate([-.38,-.16,.16,.38]):
  pts=[]
  for i in range(160):
   t=.015+.97*i/159;x,z,w,d=shape(t);pts.append((x+w*off,-d-.025,z,.5+.5*(1-t)))
  tube('longitudinal spine '+str(k),pts,.075,edge if k in (0,3) else recess)
 for i in range(1,25):
  t=i/25;x,z,w,d=shape(t);box('fine transverse seam', (x,-d-.014,z),(w*.85,.035,.055),recess,.009)
 for i in range(10):
  t=.17+i*.055;x,z,w,d=shape(t);box('small red recessed inset',(x+w*.18,-d-.043,z),(.055,.025,.38),red,.007)
 box('structural footing',(0,0,.19),(3.8,2.55,.38),dark,.07)


def cliff():
 dark=stone('layered volcanic cliff',(.075,.071,.063),.02,1.9);pale=stone('weathered fractured edges',(.12,.107,.086),.03,3.4)
 rr=random.Random(520)
 for i in range(27):
  x=(i-13)*1.12;h=rr.uniform(21.5,24);r=rr.uniform(.72,1.2);cy=rr.uniform(-.5,.7);nv=rr.choice([5,6,7]);nr=18;vs=[];fs=[]
  for j in range(nr+1):
   z=h*j/nr
   for k in range(nv):
    a=2*math.pi*k/nv;rk=r*(1+rr.uniform(-.10,.10));vs.append((x+rk*math.cos(a)+.12*math.sin(z*.7+i),cy+rk*math.sin(a),z))
  for j in range(nr):
   for k in range(nv):a=j*nv+k;b=j*nv+(k+1)%nv;fs.append((a,b,b+nv,a+nv))
  fs.append(tuple(nr*nv+k for k in range(nv)));mesh('fractured vertical basalt rib '+str(i),vs,fs,dark if i%4 else pale)
 for i in range(22):
  x=rr.uniform(-15,15);boulder('natural fallen talus',(x,rr.uniform(-2.3,-.4),rr.uniform(.2,1)),(rr.uniform(.6,1.7),rr.uniform(.5,1.1),rr.uniform(.5,1.3)),dark,600+i)


def waterfall():
 m=bpy.data.materials.new('water with genuine partial alpha');m.use_nodes=True;n=m.node_tree.nodes;l=m.node_tree.links;n.clear();out=n.new('ShaderNodeOutputMaterial');tr=n.new('ShaderNodeBsdfTransparent');p=n.new('ShaderNodeBsdfPrincipled');p.inputs['Base Color'].default_value=(.45,.61,.58,1);p.inputs['Roughness'].default_value=.21;p.inputs['Metallic'].default_value=.05;p.inputs['Transmission Weight'].default_value=.2
 g=n.new('ShaderNodeNewGeometry');v=n.new('ShaderNodeVectorMath');v.operation='MULTIPLY';v.inputs[1].default_value=(4,3,.14);l.new(g.outputs['Position'],v.inputs[0]);no=n.new('ShaderNodeTexNoise');no.inputs['Scale'].default_value=3;no.inputs['Detail'].default_value=4;l.new(v.outputs[0],no.inputs['Vector']);cr=n.new('ShaderNodeValToRGB');cr.color_ramp.elements[0].position=.28;cr.color_ramp.elements[0].color=(.04,.04,.04,1);cr.color_ramp.elements[1].position=.8;cr.color_ramp.elements[1].color=(.82,.82,.82,1);l.new(no.outputs['Fac'],cr.inputs[0]);mx=n.new('ShaderNodeMixShader');l.new(cr.outputs[0],mx.inputs[0]);l.new(tr.outputs[0],mx.inputs[1]);l.new(p.outputs[0],mx.inputs[2]);l.new(mx.outputs[0],out.inputs[0])
 foam=emit('water white highlight',(.48,.6,.56),.17)
 for layer in range(3):
  vs=[];fs=[];nx=55;nz=175
  for iz in range(nz+1):
   z=22*iz/nz;fall=1-z/22
   for ix in range(nx+1):
    u=ix/nx;x=(u-.5)*5.2*(1+.17*fall);y=layer*.13+.12*math.sin(u*32+z*1.2)+.3*fall**3;vs.append((x,y,z))
  for iz in range(nz):
   for ix in range(nx):a=iz*(nx+1)+ix;fs.append((a,a+1,a+nx+2,a+nx+1))
  mesh('independent falling water curtain '+str(layer),vs,fs,m)
 rr=random.Random(660)
 for k in range(55):
  x=rr.uniform(-2.55,2.55);start=rr.uniform(.1,12);end=rr.uniform(max(start+.3,14),22)
  pts=[(x+.035*math.sin(z*2+k),-.18+.05*math.sin(z+k),z,.1+.7*math.sin(math.pi*(z-start)/(end-start))) for z in [start+(end-start)*j/50 for j in range(51)]]
  tube('thin falling stream',pts,rr.uniform(.008,.021),foam)
 for k in range(100):
  a=rr.uniform(0,2*math.pi);r=rr.uniform(.2,3);x=r*math.cos(a);y=.6*r*math.sin(a);z=rr.uniform(0,.9)*(1-r/5)
  bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=rr.uniform(.014,.055),location=(x,y,z));bpy.context.object.data.materials.append(foam)


def lava_material():
 m=bpy.data.materials.new('deep molten lava with dark crust');m.use_nodes=True;n=m.node_tree.nodes;l=m.node_tree.links;p=n.get('Principled BSDF');g=n.new('ShaderNodeNewGeometry');v=n.new('ShaderNodeTexVoronoi');v.feature='DISTANCE_TO_EDGE';v.inputs['Scale'].default_value=3;l.new(g.outputs['Position'],v.inputs['Vector']);cr=n.new('ShaderNodeValToRGB');cr.color_ramp.elements[0].position=.025;cr.color_ramp.elements[0].color=(1,.19,.001,1);cr.color_ramp.elements[1].position=.13;cr.color_ramp.elements[1].color=(.045,.002,.0002,1);mid=cr.color_ramp.elements.new(.065);mid.color=(.8,.023,.0003,1);l.new(v.outputs['Distance'],cr.inputs[0]);l.new(cr.outputs[0],p.inputs['Base Color']);l.new(cr.outputs[0],p.inputs['Emission Color']);p.inputs['Emission Strength'].default_value=3;p.inputs['Roughness'].default_value=.7;return m

def rift(branch=False):
 dark=stone('natural fractured lava crust',(.04,.035,.029),.04,6);edge=stone('heated fracture inner basalt',(.048,.025,.014),.05,8);lava=lava_material();rr=random.Random(780+int(branch))
 # A distance field creates irregular native terrain, not a rectangular raised tile.
 arms=[((-6,-.2),(-3,.36)),((-3,.36),(-.6,-.28)),((-.6,-.28),(2.8,.45)),((2.8,.45),(6,-.12))] if not branch else [((0,0),(-3,-1.5)),((-3,-1.5),(-7,-5)),((0,0),(3,-2.8)),((3,-2.8),(6,-5)),((0,0),(-.45,4)),((-.45,4),(0,8))]
 lim=7.8 if not branch else 9.;step=.12;N=int(2*lim/step)
 def dist(x,y):
  best=100
  for (ax,ay),(bx,by) in arms:
   ux=bx-ax;uy=by-ay;t=max(0,min(1,((x-ax)*ux+(y-ay)*uy)/(ux*ux+uy*uy)));best=min(best,math.hypot(x-ax-t*ux,y-ay-t*uy))
  return best
 typ={};v=[];f=[];innerV=[];innerF=[];wallV=[];wallF=[]
 def addquad(v,f,pts):
  k=len(v);v.extend(pts);f.append((k,k+1,k+2,k+3))
 for i in range(N):
  for j in range(N):
   x=-lim+(i+.5)*step;y=-lim+(j+.5)*step;d=dist(x,y);wave=.17*math.sin(3*x+2*y)+.13*math.sin(6*y-x)+.06*math.sin(11*x+4*y)
   typ[(i,j)]=1 if d<(.68+wave) else 2 if d<(1.45+wave*.9) else 0
 def xy(i,j):return -lim+i*step,-lim+j*step
 def ztop(x,y):return .04*math.sin(x*3+y*2)+.035*math.sin(y*8-x*6)
 for (i,j),kind in typ.items():
  if not kind:continue
  corners=[xy(i,j),xy(i+1,j),xy(i+1,j+1),xy(i,j+1)]
  if kind==1:addquad(innerV,innerF,[(x,y,-.42+.03*math.sin(x+y)) for x,y in corners]);continue
  addquad(v,f,[(x,y,ztop(x,y)) for x,y in corners])
  for (di,dj),(a,b) in zip([(0,-1),(1,0),(0,1),(-1,0)],[(0,1),(1,2),(2,3),(3,0)]):
   other=typ.get((i+di,j+dj),0)
   if other==2:continue
   p0,p1=corners[a],corners[b];bottom=-.46 if other==1 else -.18
   addquad(wallV,wallF,[(p0[0],p0[1],ztop(*p0)),(p1[0],p1[1],ztop(*p1)),(p1[0],p1[1],bottom),(p0[0],p0[1],bottom)])
 mesh('irregular torn ground crust',v,f,dark);mesh('deep exposed fissure faces',wallV,wallF,edge);mesh('molten bottom independent natural fissure',innerV,innerF,lava)
 for k in range(90 if branch else 55):
  ax,ay,bx,by=(*arms[k%len(arms)][0],*arms[k%len(arms)][1]);t=rr.random();dx=bx-ax;dy=by-ay;L=math.hypot(dx,dy);side=rr.choice([-1,1]);x=ax+dx*t-dy/L*side*rr.uniform(.7,1.5);y=ay+dy*t+dx/L*side*rr.uniform(.7,1.5);sz=rr.uniform(.08,.3)
  boulder('irregular fracture lip rubble',(x,y,sz*.25),(sz,sz*rr.uniform(.6,1.7),sz*.6),dark,850+k)


def thicket():
 dark=stone('charcoal fibrous rootwood',(.035,.029,.025),.02,22);tip=stone('ashen twig tips',(.10,.085,.067),.01,38);rr=random.Random(900)
 for k in range(50):
  a=rr.uniform(0,2*math.pi);r=rr.uniform(.1,1.6);x=r*math.cos(a);y=r*.65*math.sin(a);h=rr.uniform(.35,1.3)*(1-r*.2);lean=rr.uniform(.15,.6)
  pts=[]
  for j in range(14):
   t=j/13;pts.append((x+math.cos(a)*lean*t*t,y+math.sin(a)*lean*t*t,h*t,max(.04,1-t*.96)))
  tube('rooted crooked stem',pts,rr.uniform(.035,.075),dark)
  for b in range(3):
   st=rr.uniform(.3,.75);sx=x+math.cos(a)*lean*st*st;sy=y+math.sin(a)*lean*st*st;sz=h*st;ang=a+rr.uniform(-1.5,1.5);length=rr.uniform(.18,.5);pts=[]
   for j in range(8):
    t=j/7;pts.append((sx+math.cos(ang)*length*t,sy+math.sin(ang)*length*t,sz+length*.6*t+.10*math.sin(t*math.pi),max(.03,1-t)))
   tube('branching tapered ash thorn',pts,.018,dark if b else tip)
  tube('visible irregular root',[(x,y,.02,1),(x*.6,y*.6,.01,.6),(x*.2,y*.2,0,.05)],.05,dark)


def rubble():
 dark=stone('cold black grey basalt',(.061,.057,.052),.04,9);pale=stone('weathered fractured rock faces',(.1,.089,.071),.02,13)
 for i,(x,y,z,sx,sy,sz) in enumerate([(-.8,0,.55,1.05,.85,.8),(.6,.25,.55,.9,.75,.6),(-.3,.5,1.05,.85,.7,.65),(1.25,-.35,.25,.65,.5,.35),(-1.4,-.5,.2,.55,.48,.3),(.2,-.7,.22,.7,.35,.3),(-.4,-.95,.1,.5,.3,.19)]):
  o=boulder('fractured basalt block '+str(i),(x,y,z),(sx,sy,sz),dark if i%3 else pale,1000+i);o.rotation_euler=(.12*i,.2*i,.7*i)
 rr=random.Random(1010)
 for i in range(22):
  a=rr.random()*2*math.pi;r=rr.uniform(.8,1.95);s=rr.uniform(.05,.16);boulder('basalt chip',(r*math.cos(a),r*.65*math.sin(a),s*.3),(s,s*.6,s*.45),dark,1100+i)

SPECS=[('HWA160-N04','contrefort-courbe-tour','Contrefort courbe de tour','REF01','target-v81-55-17',buttress,(1024,1536),-18),('HWA160-N05','paroi-falaise-volcanique','Paroi de falaise volcanique','REF02','target-v81-69-245',cliff,(1536,1536),-15),('HWA160-N06','chute-eau-independante','Chute d’eau indépendante','REF02','extension-hydrologie',waterfall,(1024,1536),-12),('HWA160-N07','crevasse-naturelle-etroite','Crevasse naturelle étroite','REF03','target-v81-69-250',lambda:rift(False),(1920,1080),25),('HWA160-N08','crevasse-naturelle-ramifiee','Crevasse naturelle ramifiée','REF03','target-v81-69-248',lambda:rift(True),(1536,1536),-12),('HWA160-N09','massif-sombre-premier-plan','Massif sombre du premier plan','REF03','target-v81-70-261',thicket,(1536,1024),22),('HWA160-N10','amas-basalte-fracture','Amas de basalte fracturé','REF03','target-v81-69-243',rubble,(1536,1024),22)]
records=[]
for ident,slug,label,ref,target,build,res,yaw in SPECS:
 sc=reset();build();obs=list(sc.objects)
 root=bpy.data.objects.new('PROP_ROOT_METRES',None);bpy.context.collection.objects.link(root)
 for o in obs:o.parent=root
 root.rotation_euler.z=math.radians(yaw);bpy.context.view_layer.update()
 deps=bpy.context.evaluated_depsgraph_get();points=[]
 for o in obs:
  ev=o.evaluated_get(deps)
  if o.type in ('MESH','CURVE'):
   points.extend([ev.matrix_world@Vector(v) for v in ev.bound_box])
 mn=Vector(tuple(min(p[k] for p in points) for k in range(3)));mx=Vector(tuple(max(p[k] for p in points) for k in range(3)));center=(mn+mx)/2
 up=Vector((0,math.sin(PITCH),math.cos(PITCH)));xs=[p.x for p in points];ys=[p.dot(up) for p in points];vw=max(xs)-min(xs);vh=max(ys)-min(ys);aspect=res[0]/res[1]
 bpy.ops.object.camera_add(location=center+Vector((0,-80*math.cos(PITCH),80*math.sin(PITCH))));cam=bpy.context.object;cam.name='ORTHO_PITCH35_GLOBALYAW0';cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.sensor_fit='HORIZONTAL';cam.data.ortho_scale=max(vw,vh*aspect)*1.24;cam.data.lens=50;sc.camera=cam
 sc.render.resolution_x=res[0];sc.render.resolution_y=res[1];sc.render.resolution_percentage=100
 for name,rot,power,color,angle in [('KEY',(.5,-.6,-.6),2.5,(1,.88,.73),.28),('FILL',(.9,.4,2.6),.7,(.65,.77,1),.5)]:
  d=bpy.data.lights.new(name,'SUN');d.energy=power;d.color=color;d.angle=angle;o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o);o.rotation_euler=rot
 path=OUT/'originals'/f'{ident}_{slug}.png';sc.render.filepath=str(path)
 blend=OUT/'sources'/f'{ident}_{slug}.blend';bpy.ops.wm.save_as_mainfile(filepath=str(blend),compress=True)
 bpy.ops.render.render(write_still=True)
 b=path.read_bytes();records.append({'id':ident,'label':label,'path':'production/homeworld-v162/originals/'+path.name,'reference':ref,'targetId':target,'method':'PROCEDURAL_3D_NATIVE_ORTHOGRAPHIC_RENDER','state':'PROTOTYPE_GEOMETRIQUE_NON_ADMIS','sha256':hashlib.sha256(b).hexdigest(),'bytes':len(b),'width':res[0],'height':res[1],'sourceBlend':'production/homeworld-v162/sources/'+blend.name,'dimensionsWorldMetres':[round(x,5) for x in mx-mn],'objectYawDegrees':yaw,'cameraPitchDegrees':35,'cameraYawDegrees':0,'orthographicScaleMetres':cam.data.ortho_scale,'canonicalCertification':False,'humanValidated':False,'runtimeIntegrated':False})
 (OUT/'manifest.json').write_text(json.dumps({'release':'V162','extendsCommit':'0ab844cca5f2c9b5cae28624d2c1b97fca7d5ce9','method':'Procedural Blender geometry; native renders, not image crops and not film replicas','previousPNGCount':110,'addedPNGCount':len(records),'combinedPNGCount':110+len(records),'assets':records,'limits':['Geometry and metre dimensions are project design choices, not official franchise measurements.','Camera projection is reproducible; source fidelity and integration remain unapproved.','The dark foreground thicket is an interpretation, not an identified canonical species.','No runtime, save, pathfinding, doorway or collision changes.']},ensure_ascii=False,indent=2))
 print('PROP_DONE',ident,path.name,flush=True)
