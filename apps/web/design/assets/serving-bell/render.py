from pathlib import Path
from math import cos, sin, tau
import bpy
from mathutils import Vector

output = Path(__file__).resolve().parent
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)


def material(name, hex_color, metallic, roughness):
    rgb = [int(hex_color[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    linear = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in rgb]
    result = bpy.data.materials.new(name)
    result.use_nodes = True
    node = result.node_tree.nodes.get("Principled BSDF")
    node.inputs["Base Color"].default_value = (*linear, 1)
    node.inputs["Metallic"].default_value = metallic
    node.inputs["Roughness"].default_value = roughness
    return result


def lathe(name, profile, surface):
    segments = 96
    vertices = [(r * cos(tau * i / segments), r * sin(tau * i / segments), z)
                for r, z in profile for i in range(segments)]
    faces = []
    for row in range(len(profile) - 1):
        for i in range(segments):
            a = row * segments + i
            b = row * segments + (i + 1) % segments
            faces.append((a, b, b + segments, a + segments))
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(surface)
    for face in mesh.polygons:
        face.use_smooth = True
    modifier = obj.modifiers.new("Soft edges", "SUBSURF")
    modifier.levels = 2
    return obj


teal = material("Teal enamel", "3ec1be", 0.22, 0.24)
chrome = material("Chrome", "c8ced2", 0.9, 0.2)
ink = material("Rubber base", "16191d", 0, 0.36)
cream = material("Cream button", "f3eee4", 0, 0.24)
lathe("Rubber foot", [(0, 0.02), (0.9, 0.02), (1.02, 0.04), (1.03, 0.09),
                       (1, 0.12), (0, 0.12)], ink)
lathe("Chrome base", [(0, 0.08), (0.99, 0.08), (1.1, 0.13), (1.12, 0.2),
                       (1.07, 0.25), (0.98, 0.27), (0, 0.27)], chrome)
lathe("Bell", [(0, 0.24), (0.87, 0.24), (1, 0.28), (1.01, 0.33),
                (0.98, 0.37), (0.96, 0.52), (0.86, 0.74), (0.67, 0.94),
                (0.44, 1.06), (0.22, 1.1), (0, 1.1)], teal)
lathe("Button mount", [(0, 1.08), (0.2, 1.08), (0.23, 1.1), (0.23, 1.14),
                        (0.17, 1.17), (0, 1.17)], chrome)
lathe("Button stem", [(0, 1.12), (0.09, 1.12), (0.1, 1.15), (0.1, 1.36),
                       (0.09, 1.38), (0, 1.38)], chrome)
lathe("Push button", [(0, 1.33), (0.24, 1.33), (0.32, 1.36), (0.34, 1.42),
                       (0.31, 1.47), (0.22, 1.49), (0, 1.49)], cream)


def aim(obj, point):
    obj.rotation_euler = (Vector(point) - obj.location).to_track_quat("-Z", "Y").to_euler()


for name, location, power, size in [
    ("Key", (-3, -4, 6), 650, 4),
    ("Fill", (4, -2, 3), 280, 3),
    ("Rim", (2, 4, 5), 850, 3),
]:
    light = bpy.data.lights.new(name, "AREA")
    light.energy = power
    light.shape = "DISK"
    light.size = size
    obj = bpy.data.objects.new(name, light)
    bpy.context.collection.objects.link(obj)
    obj.location = location
    aim(obj, (0, 0, 0.6))

camera = bpy.data.cameras.new("Camera")
camera.type = "ORTHO"
camera.ortho_scale = 2.95
obj = bpy.data.objects.new("Camera", camera)
bpy.context.collection.objects.link(obj)
obj.location = (3, -5, 3.5)
aim(obj, (0, 0, 0.7))
scene = bpy.context.scene
scene.camera = obj
scene.render.engine = "CYCLES"
scene.cycles.samples = 48
scene.cycles.use_denoising = True
scene.world.color = (0.35, 0.35, 0.35)
scene.view_settings.view_transform = "AgX"
scene.render.resolution_x = 384
scene.render.resolution_y = 384
scene.render.resolution_percentage = 100
scene.render.film_transparent = True
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.render.filepath = str(output / "serving-bell.png")
bpy.ops.wm.save_as_mainfile(filepath=str(output / "serving-bell.blend"))
bpy.ops.render.render(write_still=True)
