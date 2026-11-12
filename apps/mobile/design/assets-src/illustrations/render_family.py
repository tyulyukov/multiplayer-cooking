import bpy
import math
import sys
from pathlib import Path
from mathutils import Vector

OUT = Path(__file__).resolve().parent

def material(name, hexcode, roughness=.32, metal=0):
    rgb = [int(hexcode[i:i+2], 16) / 255 for i in (0, 2, 4)]
    linear = [v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in rgb]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*linear, 1)
    p.inputs['Roughness'].default_value = roughness
    p.inputs['Metallic'].default_value = metal
    return m

def finish(obj, mat):
    obj.data.materials.append(mat)
    if obj.type == 'MESH':
        for face in obj.data.polygons:
            face.use_smooth = True
    return obj

def box(name, loc, size, mat, bevel=.08):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.object
    o.name = name
    o.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    b = o.modifiers.new('Soft rounded edges', 'BEVEL')
    b.width = bevel
    b.segments = 6
    o.modifiers.new('Weighted normals', 'WEIGHTED_NORMAL')
    return finish(o, mat)

def sphere(name, loc, scale, mat):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=64, ring_count=32, location=loc)
    o = bpy.context.object
    o.name = name
    o.scale = scale
    return finish(o, mat)

def cylinder(name, loc, radius, depth, mat, front=False):
    bpy.ops.mesh.primitive_cylinder_add(vertices=96, radius=radius, depth=depth, location=loc)
    o = bpy.context.object
    o.name = name
    if front:
        o.rotation_euler.x = math.pi / 2
    b = o.modifiers.new('Rounded rim', 'BEVEL')
    b.width = .025
    b.segments = 4
    o.modifiers.new('Weighted normals', 'WEIGHTED_NORMAL')
    return finish(o, mat)

def tube(name, points, radius, mat, cyclic=False):
    c = bpy.data.curves.new(name, 'CURVE')
    c.dimensions = '3D'
    c.resolution_u = 24
    c.bevel_depth = radius
    c.bevel_resolution = 5
    s = c.splines.new('BEZIER')
    s.bezier_points.add(len(points)-1)
    for p, co in zip(s.bezier_points, points):
        p.co = co
        p.handle_left_type = p.handle_right_type = 'AUTO'
    s.use_cyclic_u = cyclic
    o = bpy.data.objects.new(name, c)
    bpy.context.collection.objects.link(o)
    return finish(o, mat)

def lathe(name, profile, mat, loc=(0,0,0)):
    n = 96
    vertices = [(r*math.cos(i*2*math.pi/n)+loc[0], r*math.sin(i*2*math.pi/n)+loc[1], z+loc[2]) for r,z in profile for i in range(n)]
    faces = []
    for j in range(len(profile)-1):
        for i in range(n):
            a=j*n+i; b=j*n+(i+1)%n
            faces.append((a,b,b+n,a+n))
    mesh=bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    o=bpy.data.objects.new(name,mesh)
    bpy.context.collection.objects.link(o)
    return finish(o,mat)

def setup():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    global teal, cream, chrome, cloth, creamcloth, dark
    teal = material('Teal enamel #3ec1be', '3ec1be', .27)
    cream = material('Warm cream #f3eee4', 'f3eee4', .36)
    chrome = material('Restrained brushed chrome', 'c8d1d1', .25, .85)
    cloth = material('Teal canvas', '3ec1be', .75)
    creamcloth = material('Cream towel fabric', 'f3eee4', .85)
    dark = material('Deep teal details', '147d7a', .45)
    for m in (cloth, creamcloth):
        nodes=m.node_tree.nodes
        noise=nodes.new('ShaderNodeTexNoise'); noise.inputs['Scale'].default_value=160
        bump=nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value=.16; bump.inputs['Distance'].default_value=.012
        m.node_tree.links.new(noise.outputs['Fac'], bump.inputs['Height'])
        m.node_tree.links.new(bump.outputs['Normal'], nodes.get('Principled BSDF').inputs['Normal'])
    scene=bpy.context.scene
    scene.render.engine='CYCLES'
    scene.cycles.samples=64
    scene.cycles.use_denoising=True
    scene.render.resolution_x=scene.render.resolution_y=768
    scene.render.resolution_percentage=100
    scene.render.film_transparent=True
    scene.render.image_settings.file_format='PNG'
    scene.render.image_settings.color_mode='RGBA'
    scene.view_settings.view_transform='Standard'
    scene.view_settings.exposure=-.85
    scene.world.use_nodes=True
    scene.world.node_tree.nodes.get('Background').inputs['Color'].default_value=(.8,.8,.8,1)
    scene.world.node_tree.nodes.get('Background').inputs['Strength'].default_value=.35
    for name,loc,power,size in [('Large upper left softbox',(-3,-4,6),850,4),('Soft fill',(4,-1,3),450,4),('Top rim',(1,4,5),650,3)]:
        data=bpy.data.lights.new(name,'AREA'); data.energy=power; data.shape='DISK'; data.size=size
        o=bpy.data.objects.new(name,data); bpy.context.collection.objects.link(o); o.location=loc
        o.rotation_euler=(Vector((0,0,1))-o.location).to_track_quat('-Z','Y').to_euler()

def apron():
    outline=[(-.78,.12),(.78,.12),(.66,1.28),(.34,1.67),(.31,2.10),(-.31,2.10),(-.34,1.67),(-.66,1.28)]
    verts=[]
    for j in range(25):
        z=.12+1.98*j/24
        w=.78-(z-.12)*.10 if z<1.28 else .664-(z-1.28)*.83 if z<1.67 else .34-(z-1.67)*.07
        for i in range(17):
            x=w*(2*i/16-1)
            verts.append((x,.055*math.cos(x*7)+.035*math.sin(z*5),z))
    faces=[(j*17+i,j*17+i+1,(j+1)*17+i+1,(j+1)*17+i) for j in range(24) for i in range(16)]
    mesh=bpy.data.meshes.new('Apron shaped fabric'); mesh.from_pydata(verts,[],faces); mesh.update()
    o=bpy.data.objects.new('Teal canvas apron',mesh); bpy.context.collection.objects.link(o); finish(o,cloth)
    sub=o.modifiers.new('Soft fabric folds','SUBSURF'); sub.levels=2
    s=o.modifiers.new('Canvas thickness','SOLIDIFY'); s.thickness=.045
    b=o.modifiers.new('Soft hem','BEVEL'); b.width=.065; b.segments=5
    tube('Cream bottom hem',[(-.73,-.01,.16),(0,-.01,.16),(.73,-.01,.16)],.018,cream)
    pocket=box('Apron pocket',(0,-.11,.80),(.72,.065,.43),cloth,.07)
    tube('Pocket cream top stitch',[(-.32,-.154,1),(0,-.16,.96),(.32,-.154,1)],.012,cream)
    tube('Cream neck loop',[(-.28,0,2.08),(-.22,.02,2.50),(0,.02,2.63),(.23,.02,2.50),(.28,0,2.08)],.055,cream)
    tube('Left cream tie',[(-.60,.03,1.29),(-.96,.05,1.27),(-.99,-.02,.99),(-.85,-.08,.62)],.052,cream)
    tube('Right cream tie',[(.60,.03,1.29),(.95,.04,1.20),(.96,-.04,.91),(1.03,-.08,.61)],.052,cream)
    sphere('Chrome hook mount',(0,.16,2.63),(.13,.055,.13),chrome)
    tube('Small chrome hook',[(0,.13,2.62),(0,-.07,2.57),(0,-.10,2.69)],.037,chrome)

def sign():
    box('Blank cream hanger plate',(0,0,.85),(1.55,.17,1.32),cream,.15)
    for x in (-.55,.55):
        sphere('Chrome attachment',(x,-.11,1.37),(.055,.03,.055),chrome)
    for i in range(17):
        t=i/16
        x=-.55+1.10*t
        z=1.48+.61*math.sin(math.pi*t)
        pts=[(x+.061*math.cos(a),.015 if i%2==0 else .015+.040*math.cos(a),z+.090*math.sin(a)) for a in [j*math.tau/8 for j in range(8)]]
        tube('Chrome chain link',pts,.018,chrome,True)

def ladle():
    for j in range(3):
        box('Folded cream towel layer',(.10+j*.017,j*.022,.115+j*.085),(1.45,.95,.115),creamcloth,.052)
    tube('Towel folded seam',[(-.52,-.49,.21),(.12,-.49,.21),(.69,-.49,.21)],.014,creamcloth)
    for x in (-.49,-.43):
        tube('Teal towel edge stripe',[(x,-.43,.335),(x,0,.35),(x,.41,.335)],.014,teal)
    lathe('Open teal enamel ladle bowl',[(0,.05),(.12,.06),(.27,.14),(.38,.29),(.40,.34),(.38,.355),(.355,.31),(.25,.18),(.11,.10),(0,.10)],teal,(-.46,-.27,.32))
    tube('Long rounded ladle handle',[(-.20,-.25,.60),(.04,-.20,.71),(.43,-.11,.84),(.83,.02,1.05),(1.02,.04,1.17)],.062,teal)
    tube('Cream handle grip',[(.60,-.06,.94),(.83,.02,1.05),(1.02,.04,1.17)],.079,cream)

def clipboard():
    box('Small teal clipboard',(0,0,1.02),(1.43,.19,1.90),teal,.14)
    box('Blank cream note',(0,-.116,1.00),(1.17,.045,1.56),cream,.045)
    box('Chrome spring clip',(0,-.17,1.82),(.64,.15,.25),chrome,.06)
    tube('Clip arch',[(-.19,-.13,1.92),(-.14,-.13,2.08),(.14,-.13,2.08),(.19,-.13,1.92)],.035,chrome)

def timer():
    sphere('Round teal mechanical timer',(0,0,.96),(.88,.56,.88),teal)
    cylinder('Thin chrome dial rim',(0,-.49,.96),.725,.08,chrome,True)
    cylinder('Cream dial without numerals',(0,-.55,.96),.68,.10,cream,True)
    for i in range(12):
        a=i*math.tau/12
        o=box('Subtle teal dial tick',(.56*math.sin(a),-.612,.96+.56*math.cos(a)),(.025,.012,.075),dark,.008)
        o.rotation_euler.y=a
    cylinder('Teal dial knob',(0,-.67,.96),.24,.18,teal,True)
    box('Cream timer pointer',(0,-.79,1.11),(.065,.045,.36),cream,.028)
    box('Timer rounded foot',(0,0,.16),(1.06,.55,.19),teal,.08)

def kettle():
    lathe('Cream kettle rounded body',[(0,.12),(.55,.12),(.67,.20),(.73,.42),(.72,.72),(.62,1.02),(.45,1.21),(.38,1.24),(0,1.24)],cream,(-.24,0,0))
    cylinder('Teal kettle lid',(-.24,0,1.25),.42,.10,teal)
    sphere('Cream lid knob',(-.24,0,1.37),(.12,.12,.10),cream)
    tube('Teal open loop handle',[(-.70,.04,1.01),(-.82,.06,1.57),(-.26,.07,1.81),(.30,.08,1.59),(.30,.06,1.05)],.091,teal)
    spout=lathe('Cream tapered spout',[(.23,0),(.23,.12),(.18,.40),(.14,.66),(.13,.74),(.10,.75),(.10,.66),(.13,.40),(.19,.10)],cream)
    spout.location=(-.80,-.03,.56); spout.rotation_euler.y=-.73
    tube('Coiled teal cord',[(.32,.23,.24),(.72,.23,.15),(.94,.08,.11),(.90,-.32,.09),(.58,-.56,.10),(.39,-.35,.11),(.60,-.16,.12),(.98,-.22,.11),(1.12,-.50,.10),(.96,-.73,.10),(.71,-.79,.10)],.038,teal)
    plug=box('Unplugged teal plug',(.54,-.79,.11),(.31,.19,.18),teal,.06)
    for y in (-.84,-.74):
        box('Exposed chrome plug pin',(.31,y,.11),(.20,.035,.045),chrome,.015)

def frame(name):
    scene=bpy.context.scene
    subjects=[o for o in scene.objects if o.type in ('MESH','CURVE')]
    bpy.context.view_layer.update()
    coords=[]
    for o in subjects:
        evaluated=o.evaluated_get(bpy.context.evaluated_depsgraph_get())
        mesh=evaluated.to_mesh()
        coords += [evaluated.matrix_world @ v.co for v in mesh.vertices]
        evaluated.to_mesh_clear()
    center=Vector(tuple((min(v[i] for v in coords)+max(v[i] for v in coords))/2 for i in range(3)))
    bpy.ops.object.camera_add(location=center+Vector((3.2,-7,3.5)))
    camera=bpy.context.object
    camera.rotation_euler=(center-camera.location).to_track_quat('-Z','Y').to_euler()
    camera.data.type='ORTHO'
    inv=camera.matrix_world.inverted()
    bpy.context.view_layer.update(); inv=camera.matrix_world.inverted()
    p=[inv@v for v in coords]
    camera.data.ortho_scale=max(max(v.x for v in p)-min(v.x for v in p),max(v.y for v in p)-min(v.y for v in p))/ .84
    scene.camera=camera
    scene.render.filepath=str(OUT/f'{name}.png')
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT/f'{name}.blend'))
    bpy.ops.render.render(write_still=True)

names={'apron-hook':apron,'blank-sign':sign,'helper-ladle':ladle,'notes-clip':clipboard,'kitchen-timer':timer,'unplugged-kettle':kettle}
requested=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else list(names)
for name in requested:
    setup()
    names[name]()
    frame(name)
