#!/usr/bin/env python3
"""
Studio preview of an exported car body.

Renders a GLB from `src/assets/cars/` on a plain backdrop so the silhouette can be checked against
the photographs in `reference/`. This is the review loop for the shape: a profile that is wrong is
obvious in a side elevation and invisible in a triangle count.

    .venvs/blender/bin/python tools/blender/preview.py toyotasupra

Cycles on the CPU, few samples, small frames - this is for judging a silhouette, not for beauty.
"""

import math
import os
import sys

import bpy

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
GLB_DIR = os.path.join(ROOT, "src", "assets", "cars")
OUT_DIR = os.path.join(ROOT, "output", "blender")

# Side elevation first: it is the view that shows a wrong roofline or a mispitched deck.
# The car is built along Blender's Y axis, so an azimuth of zero looks at its flank.
VIEWS = [
    ("side", math.radians(0), math.radians(1), 7.4, 40),
    ("hero", math.radians(48), math.radians(13), 6.8, 42),
    ("rear", math.radians(146), math.radians(12), 6.8, 42),
    ("front", math.radians(-125), math.radians(10), 6.8, 42),
]


def clear():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def studio():
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 24
    scene.cycles.use_denoising = True
    scene.render.resolution_x = 900
    scene.render.resolution_y = 560
    scene.render.film_transparent = False
    scene.view_settings.view_transform = "AgX"

    world = bpy.data.worlds.new("studio")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs[0].default_value = (0.05, 0.055, 0.065, 1)
    world.node_tree.nodes["Background"].inputs[1].default_value = 1.0
    scene.world = world

    # A large soft key and a low fill: enough to read the surface without hiding its flaws.
    for name, location, energy, size in (
        ("key", (4.0, -5.0, 5.0), 2400, 6.0),
        ("fill", (-5.5, -2.0, 2.2), 700, 5.0),
        ("rim", (-1.5, 6.0, 3.2), 1100, 4.0),
    ):
        light = bpy.data.lights.new(name, "AREA")
        light.energy = energy
        light.size = size
        obj = bpy.data.objects.new(name, light)
        obj.location = location
        obj.rotation_euler = (0, 0, 0)
        constraint = obj.constraints.new("TRACK_TO")
        bpy.context.collection.objects.link(obj)
        constraint.track_axis = "TRACK_NEGATIVE_Z"
        constraint.up_axis = "UP_Y"

    ground = bpy.data.meshes.new("ground")
    ground.from_pydata([(-20, -20, 0), (20, -20, 0), (20, 20, 0), (-20, 20, 0)], [], [(0, 1, 2, 3)])
    obj = bpy.data.objects.new("ground", ground)
    bpy.context.collection.objects.link(obj)
    material = bpy.data.materials.new("ground")
    material.use_nodes = True
    bsdf = material.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (0.10, 0.105, 0.115, 1)
    bsdf.inputs["Roughness"].default_value = 0.42
    ground.materials.append(material)


def aim_camera(azimuth, elevation, radius, lens, target):
    camera_data = bpy.data.cameras.new("camera")
    camera_data.lens = lens
    camera = bpy.data.objects.new("camera", camera_data)
    camera.location = (
        target[0] + radius * math.cos(elevation) * math.cos(azimuth),
        target[1] + radius * math.cos(elevation) * math.sin(azimuth),
        target[2] + radius * math.sin(elevation),
    )
    bpy.context.collection.objects.link(camera)
    empty = bpy.data.objects.new("target", None)
    empty.location = target
    bpy.context.collection.objects.link(empty)
    constraint = camera.constraints.new("TRACK_TO")
    constraint.target = empty
    constraint.track_axis = "TRACK_NEGATIVE_Z"
    constraint.up_axis = "UP_Y"
    bpy.context.scene.camera = camera


def render(car_id):
    path = os.path.join(GLB_DIR, "%s.glb" % car_id)
    if not os.path.exists(path):
        print("%-22s no GLB - run build_car.py first" % car_id)
        return
    os.makedirs(OUT_DIR, exist_ok=True)
    for name, azimuth, elevation, radius, lens in VIEWS:
        clear()
        studio()
        bpy.ops.import_scene.gltf(filepath=path)
        meshes = [o for o in bpy.context.scene.objects if o.type == "MESH" and o.name != "ground"]
        if not meshes:
            print("%-22s imported nothing" % car_id)
            return
        highest = max(max(v.co.z for v in o.data.vertices) for o in meshes)
        aim_camera(azimuth, elevation, radius, lens, (0, 0, highest * 0.52))
        out = os.path.join(OUT_DIR, "%s-%s.png" % (car_id, name))
        bpy.context.scene.render.filepath = out
        bpy.ops.render.render(write_still=True)
        print("  %s" % os.path.relpath(out, ROOT))


def main(argv):
    for car_id in argv or ["toyotasupra"]:
        print(car_id)
        render(car_id)


if __name__ == "__main__":
    main([a for a in sys.argv[1:] if not a.startswith("-")])
