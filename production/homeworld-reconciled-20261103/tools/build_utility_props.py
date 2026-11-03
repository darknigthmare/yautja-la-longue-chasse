"""Native Homeworld utility art candidates. Run with Blender 4.3+ --background --python this_file.
No network, dependency installation, game mutation or automatic artistic approval.
One functional prop per image; the rear view is another native render, never a mirror.
Metres are original game-design choices, NOT official franchise measurements.
"""
from pathlib import Path
import bpy, math, json, hashlib, random
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view
ROOT=Path(__file__).resolve().parents[1]
PITCH=math.radians(35)
SPECS=[
 ('HWP163-01','conduit-chaleur','Conduit de chaleur de forge','target-v81-63-151','heat'),
 ('HWP163-02','conduit-energie','Conduit d’énergie du spatioport','target-v81-67-211','power'),
 ('HWP163-03','cable-sol','Câble d’énergie au sol','target-v81-67-212','cable'),
 ('HWP163-04','echelle-maintenance','Échelle de maintenance','target-v81-67-215','ladder'),
 ('HWP163-05','grille-drainage','Grille de drainage de rue','target-v81-68-233','drain'),
 ('HWP163-06','caniveau','Caniveau de desserte','target-v81-68-235','gutter'),
 ('HWP163-07','ventilation-sol','Ventilation de sol','target-v81-68-239','vent'),
 ('HWP163-08','cable-suspendu','Câble suspendu des bas-quartiers','target-v81-73-294','hanging'),
 ('HWP163-09','treuil','Treuil de manutention','target-v81-74-324','winch'),
 ('HWP163-10','rail-manutention','Rail de manutention','target-v81-74-326','rail'),
]
def mat(name,color,metal=0.7,rough=.48):
 m=bpy.data.materials.new(name);m.use_nodes=True;n=m.node_tree.nodes;l=m.node_tree.links;p=n.get('Principled BSDF')
 p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
 g=n.new('ShaderNodeNewGeometry');noise=n.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=9;noise.inputs['Detail'].default_value=5;l.new(g.outputs['Position'],noise.inputs['Vector'])
 ramp=n.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].position=.12;ramp.color_ramp.elements[0].color=tuple(c*.35 for c in color)+(1,);ramp.color_ramp.elements[1].position=.87;ramp.color_ramp.elements[1].color=tuple(min(c*1.9,.9) for c in color)+(1,);l.new(noise.outputs['Fac'],ramp.inputs[0]);l.new(ramp.outputs[0],p.inputs['Base Color'])
 fine=n.new('ShaderNodeTexNoise');fine.inputs['Scale'].default_value=210;fine.inputs['Detail'].default_value=2;l.new(g.outputs['Position'],fine.inputs['Vector']);b=n.new('ShaderNodeBump');b.inputs['Strength'].default_value=.28;b.inputs['Distance'].default_value=.0018;l.new(fine.outputs['Fac'],b.inputs['Height']);l.new(b.outputs[0],p.inputs['Normal'])
 return m

def reset():
 bpy.ops.wm.read_factory_settings(use_empty=True);s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.samples=32;s.cycles.use_denoising=True;s.cycles.adaptive_threshold=.06;s.cycles.max_bounces=5;s.render.threads_mode='FIXED';s.render.threads=4
 s.render.film_transparent=True;s.render.image_settings.file_format='PNG';s.render.image_settings.color_mode='RGBA';s.render.image_settings.color_depth='8';s.view_settings.view_transform='AgX';s.view_settings.exposure=.65;s.unit_settings.system='METRIC'
 w=bpy.data.worlds.new('neutral studio');w.use_nodes=True;w.node_tree.nodes['Background'].inputs[0].default_value=(.32,.38,.48,1);w.node_tree.nodes['Background'].inputs[1].default_value=.48;s.world=w
 global DARK,BRONZE,BLACK,STONE,RED
 DARK=mat('worn dark gunmetal',(.13,.115,.095),.8,.44);BRONZE=mat('muted aged bronze edge',(.24,.16,.075),.78,.4);BLACK=mat('black ribbed cable',(.023,.021,.019),.13,.69);STONE=mat('brown black basalt',(.07,.057,.044),.04,.86)
 RED=mat('recessed dim red indicator',(.19,.009,.002),.25,.42);p=RED.node_tree.nodes.get('Principled BSDF');p.inputs['Emission Color'].default_value=(.28,.008,.001,1);p.inputs['Emission Strength'].default_value=.7
 return s

def finish(o,m,bev=.015):
 o.data.materials.append(m)
 if bev:
  b=o.modifiers.new('manufactured worn bevel','BEVEL');b.width=bev;b.segments=3
  o.modifiers.new('weighted face normals','WEIGHTED_NORMAL')
 return o

def box(name,loc,size,m,bev=.015):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);return finish(o,m,bev)

def cylinder(name,loc,r,length,m,axis='Z',verts=48,bev=.008):
 bpy.ops.mesh.primitive_cylinder_add(vertices=verts,radius=r,depth=length,location=loc);o=bpy.context.object;o.name=name
 if axis=='X':o.rotation_euler.y=math.pi/2
 if axis=='Y':o.rotation_euler.x=math.pi/2
 finish(o,m,bev)
 for p in o.data.polygons:p.use_smooth=len(p.vertices)==4
 return o

def ring(name,loc,major,minor,m,axis='X'):
 bpy.ops.mesh.primitive_torus_add(major_segments=64,minor_segments=10,location=loc,major_radius=major,minor_radius=minor);o=bpy.context.object;o.name=name
 if axis=='X':o.rotation_euler.y=math.pi/2
 if axis=='Y':o.rotation_euler.x=math.pi/2
 o.data.materials.append(m)
 for p in o.data.polygons:p.use_smooth=True
 return o

def curve(name,pts,r,m):
 c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.resolution_u=2;c.bevel_depth=r;c.bevel_resolution=4;sp=c.splines.new('POLY');sp.points.add(len(pts)-1)
 for q,v in zip(sp.points,pts):q.co=(*v,1)
 o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);o.data.materials.append(m);return o

def profile(name,pts,depth,m):
 vs=[(x,y,z) for y in (-depth/2,depth/2) for x,z in pts];n=len(pts);fs=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
 me=bpy.data.meshes.new(name);me.from_pydata(vs,[],fs);me.update();o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o);return finish(o,m,.012)

def bolts(x,y,z,axis='Z',n=8,r=.32):
 for k in range(n):
  a=k*2*math.pi/n
  pos=(x,y+r*math.cos(a),z+r*math.sin(a)) if axis=='X' else (x+r*math.cos(a),y,z+r*math.sin(a)) if axis=='Y' else (x+r*math.cos(a),y+r*math.sin(a),z)
  cylinder('small captive fastener',pos,.022,.018,BRONZE,axis,6,.003)

def flange(x,z,r=.38):
 ring('open dark coupling rim',(x,0,z),r,.055,BRONZE);ring('inner coupling seal',(x,0,z),r-.057,.032,BLACK);bolts(x,0,z,'X',8,r)

def build(kind):
 if kind=='heat':
  for i in range(4):
   x=-1.5+i
   cylinder('heat conduit shell',(x,0,.5),.34,.95,DARK,'X',64)
   for dx in [-.42,-.21,0,.21,.42]:ring('fine cooling rib',(x+dx,0,.5),.348,.017,DARK)
  for x in [-2,-1,0,1,2]:flange(x,.5)
  for x in [-1.45,1.45]:box('structural saddle',(x,0,.12),(.28,.85,.24),STONE);box('saddle cap',(x,0,.27),(.32,.76,.07),BRONZE)
  # End disks are deep and dark; rims, not painted scenery, define the couplings.
  for x in [-1.94,1.94]:cylinder('deep coupling interior',(x,0,.5),.27,.03,BLACK,'X')
 elif kind=='power':
  box('shielded spine',(0,0,.27),(5.8,.42,.43),BLACK,.05)
  for i in range(6):
   x=-2.5+i;o=profile('segmented armour',[(x-.48,.1),(x+.48,.1),(x+.39,.55),(x-.39,.55)],.64,DARK)
   for y in [-.325,.325]:box('narrow bronze seam',(x,y,.35),(.75,.025,.035),BRONZE,.006)
   box('recessed indicator',(x,0,.556),(.12,.12,.01),RED,.006)
  for x in [-3,3]:box('trapezoid-compatible connection',(x,0,.3),(.16,.8,.58),BRONZE,.04);box('connection face',(x+(.09 if x>0 else -.09),0,.3),(.02,.55,.32),BLACK,.02)
 elif kind in ('cable','hanging'):
  hanging=kind=='hanging';L=8 if hanging else 5
  pts=[]
  for i in range(240):
   t=i/239;x=L*(t-.5);y=.38*math.sin(2*math.pi*t) if not hanging else 0;z=.09 if not hanging else 1.45-1.1*(1-(2*t-1)**2);pts.append((x,y,z))
  curve('single flexible cable',pts,.072,BLACK)
  for k in range(7):
   off=k*2*math.pi/7;curve('helical protective weave',[(x,y+.073*math.cos(38*x+off),z+.073*math.sin(38*x+off)) for x,y,z in pts],.006,DARK)
  for x,y,z in [pts[0],pts[-1]]:
   cylinder('plug collar',(x,y,z),.16,.3,DARK,'X');ring('collar bevel',(x,y,z),.15,.026,BRONZE);box('angular plug body',(x+(-.22 if x<0 else .22),y,z),(.25,.25,.22),DARK,.025)
  if hanging:
   for x,y,z in [pts[0],pts[-1]]:box('wall anchor only',(x,y+.09,z),(.12,.12,.34),BRONZE,.015)
 elif kind=='ladder':
  for x in [-.4,.4]:box('full length narrow stile',(x,0,3),(.1,.14,6),DARK,.025)
  for j in range(20):
   z=.12+j*.3;cylinder('thin rung',(0,-.025,z),.035,.8,BRONZE,'X',20,.005)
  for x in [-.4,.4]:
   curve('upper fixing hook',[(x,0,5.9),(x,0,6.17),(x,.18,6.24),(x,.35,6.17),(x,.35,5.98)],.058,DARK)
   for z in [.2,3,5.7]:box('stand-off attachment',(x,.16,z),(.18,.22,.13),BRONZE,.02)
 elif kind in ('drain','gutter','vent'):
  if kind=='drain':
   for y in [-.4,.4]:box('long frame',(0,y,.09),(1.9,.12,.18),STONE,.02);box('edge inlay',(0,y,.185),(1.8,.025,.015),BRONZE,.005)
   for x in [-.93,.93]:box('end frame',(x,0,.09),(.12,.8,.18),STONE,.02)
   for k in range(16):box('independent grate bar',(-.8+k*1.6/15,0,.12),(.042,.72,.1),DARK,.008)
   for x in [-.86,.86]:
    for y in [-.38,.38]:cylinder('frame bolt',(x,y,.19),.028,.018,BRONZE,'Z',6,.004)
  if kind=='gutter':
   box('shallow basalt bed',(0,0,.025),(4,.62,.05),STONE,.01)
   for y in [-.36,.36]:box('low drainage bank',(0,y,.13),(4,.14,.26),STONE,.018);box('protective rim',(0,y,.265),(4,.11,.025),DARK,.008)
   for x in [-1.98,1.98]:
    for y in [-.36,.36]:box('raccord terminal',(x,y,.13),(.09,.2,.28),BRONZE,.012)
   for x in [-1,0,1]:box('bed seam',(x,0,.052),(.012,.59,.008),BLACK,.001)
  if kind=='vent':
   for y in [-.52,.52]:box('vent frame',(0,y,.16),(1.65,.12,.32),DARK,.035)
   for x in [-.78,.78]:box('vent end',(x,0,.16),(.12,1,.32),DARK,.035)
   for k in range(10):o=box('angled louvre',(-.66+k*.146,0,.23),(.12,.96,.035),BRONZE,.009);o.rotation_euler.y=math.radians(28)
   for y in [-.45,.45]:box('base runner',(0,y,.025),(1.45,.09,.05),BLACK,.015)
 elif kind=='winch':
  box('low cast cradle',(0,0,.13),(2.1,1.25,.26),DARK,.06)
  for x in [-.62,.62]:
   o=profile('angular drum support',[(x-.19,.25),(x+.19,.25),(x+.14,1.0),(x-.14,1.0)],.65,DARK)
   cylinder('flanged drum end',(x,0,.76),.44,.12,BRONZE,'X');bolts(x,0,.76,'X',8,.31)
  cylinder('drum core',(0,0,.76),.3,1.2,BLACK,'X')
  pts=[]
  for i in range(1200):
   t=i/1199;a=2*math.pi*25*t;pts.append((-0.55+1.1*t,.32*math.cos(a),.76+.32*math.sin(a)))
  curve('separate visible cable windings',pts,.018,BLACK)
  box('gear housing',(.89,0,.64),(.38,.86,.82),DARK,.07)
  for z in [.4,.5,.6,.7,.8]:box('gear housing rib',(.89,-.445,z),(.3,.025,.025),BRONZE,.006)
  box('small red status lamp',(.89,0,1.06),(.11,.11,.014),RED,.008)
  curve('cable tail',[(0,-.32,.76),(0,-.7,.7),(.18,-1,.27),(.5,-1.1,.18)],.024,BLACK)
 elif kind=='rail':
  for y in [-.48,.48]:
   box('continuous lower rail flange',(0,y,.1),(8,.19,.08),DARK,.015);box('rail web',(0,y,.2),(8,.065,.16),DARK,.01);box('upper rail guide',(0,y,.29),(8,.16,.07),BRONZE,.014)
  for k in range(17):
   x=-4+k*.5;box('cross tie',(x,0,.035),(.12,1.28,.07),DARK,.012)
   for y in [-.48,.48]:cylinder('rail fixing',(x,y,.15),.022,.02,BRONZE,'Z',6,.003)
  for x in [-3.94,3.94]:
   for y in [-.48,.48]:box('end coupling plate',(x,y,.2),(.25,.19,.12),DARK,.012)
 else:raise ValueError(kind)


def render_all():
 (ROOT/'native').mkdir(exist_ok=True);(ROOT/'geometry').mkdir(exist_ok=True);records=[]
 for ident,slug,label,target,kind in SPECS:
  s=reset();build(kind);objects=list(s.objects);parent=bpy.data.objects.new('functional_prop_root',None);bpy.context.collection.objects.link(parent)
  for o in objects:o.parent=parent
  basepts=[o.matrix_world@Vector(v) for o in objects for v in o.bound_box];bpy.context.view_layer.update()
  # Re-evaluate bounds after dependency updates, including curves and bevels.
  def bounds():
   deps=bpy.context.evaluated_depsgraph_get();return [o.evaluated_get(deps).matrix_world@Vector(v) for o in objects for v in o.evaluated_get(deps).bound_box]
  bp=bounds();size=[max(p[k] for p in bp)-min(p[k] for p in bp) for k in range(3)]
  for name,rot,energy,color in [('key',(.55,-.6,-.55),3.3,(1,.85,.68)),('fill',(.75,.7,2.7),1.4,(.69,.8,1))]:
   light=bpy.data.lights.new(name,'SUN');light.energy=energy;light.angle=.3;light.color=color;o=bpy.data.objects.new(name,light);bpy.context.collection.objects.link(o);o.rotation_euler=rot
  bpy.ops.object.camera_add();cam=bpy.context.object;cam.name='homeworld_orthographic_pitch35_yaw0';cam.data.type='ORTHO';cam.data.sensor_fit='HORIZONTAL';s.camera=cam
  w,h=(1024,1536) if kind=='ladder' else (1536,1024);s.render.resolution_x=w;s.render.resolution_y=h;s.render.resolution_percentage=100
  up=Vector((0,math.sin(PITCH),math.cos(PITCH)))
  for facing,yaw in [('front',25),('rear',205)]:
   parent.rotation_euler.z=math.radians(yaw);bpy.context.view_layer.update();pts=bounds();xs=[p.x for p in pts];ys=[p.dot(up) for p in pts];vw=max(xs)-min(xs);vh=max(ys)-min(ys)
   center=Vector(((min(xs)+max(xs))/2,0,0))+up*((min(ys)+max(ys))/2)
   cam.location=center+Vector((0,-60*math.cos(PITCH),60*math.sin(PITCH)));cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=max(vw,vh*w/h)*1.20;bpy.context.view_layer.update()
   file=ROOT/'native'/f'{ident}_{slug}_{facing}.png';s.render.filepath=str(file);bpy.ops.render.render(write_still=True)
   pivot=world_to_camera_view(s,cam,Vector((0,0,0)));data=file.read_bytes();record={'id':ident+'-'+facing,'propId':ident,'label':label,'targetId':target,'facing':facing,'filename':file.name,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),'width':w,'height':h,'cameraPitchDegrees':35,'cameraYawDegrees':0,'objectYawDegrees':yaw,'orthographicScaleMetres':cam.data.ortho_scale,'pixelsPerMetre':w/cam.data.ortho_scale,'localDimensionsMetres':size,'projectedLocalOriginPx':[pivot.x*w,(1-pivot.y)*h],'pivotAuthority':'GEOMETRY_LOCAL_ORIGIN_NOT_GAMEPLAY_VALIDATION','dimensionsAuthority':'ORIGINAL_GAME_DESIGN_NOT_CANON','lore':'ORIGINAL_GAME_ADAPTATION','generationMethod':'native Blender geometry','state':'PROCEDURAL_ART_CANDIDATE','runtimeIntegrated':False,'humanValidated':False,'canonicalCertification':False};records.append(record)
   print('RENDERED',record['id'],flush=True)
  bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'geometry'/f'{ident}_{slug}.blend'),compress=True)
  (ROOT/'native-manifest.json').write_text(json.dumps({'version':'RECONCILED-20261103','sourceBase':'d4c43dce5286fbb64e41ae5fa22cb82854572a7e','uniqueFunctionalProps':len(records)//2,'nativeImages':len(records),'assets':records,'limits':['These are original utility adaptations, not canonical replicas.','Native camera and source dimensions are measurable; material, function and placement require review.','No runtime, collisions, animations or saves changed.']},ensure_ascii=False,indent=2))
if __name__=='__main__':render_all()
