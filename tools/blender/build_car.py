#!/usr/bin/env python3
"""
Car body modeller.

Builds a car shell in Blender from the blueprint curves in `src/data/carbodies.js` and exports it
as GLB for the game to load.

    node tools/blender/dump_blueprints.mjs > reference/blueprints.json
    .venvs/blender/bin/python tools/blender/build_car.py toyotasupra

The difference from the in-browser modeller in `src/world/carbody.js` is not detail but continuity.
That one lofts sixty dense stations and ships the result, so every station edge is a facet and the
surface reads as a faceted tube however many stations you add. This builds a deliberately sparse
control cage - around twenty stations of ten points - and hands it to a subdivision surface, so the
surface between the control points is solved rather than sampled. Creases are then set where the
real car has creases, which is what makes a shoulder line look pressed into a panel instead of
folded out of one.

Sections and curves come from the same blueprint the game uses, so the mesh and the physics agree
about how big the car is, and a change to a profile curve reaches both.
"""

import json
import math
import os
import sys

import bpy
import bmesh
from mathutils import Vector

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
BLUEPRINTS = os.path.join(ROOT, "reference", "blueprints.json")
OUT_DIR = os.path.join(ROOT, "src", "assets", "cars")

# Stations are placed by hand rather than evenly: a car changes shape fastest at the nose, the
# cowl, and over the rear haunch, and a subdivision cage wants its control points where the
# curvature is, not spread thin across the flat middle of the door.
STATIONS = [
    0.0, 0.018, 0.045, 0.085, 0.135, 0.195, 0.26, 0.33, 0.40, 0.47,
    0.545, 0.62, 0.695, 0.765, 0.83, 0.885, 0.93, 0.962, 0.985, 1.0,
]


def sample(points, t):
    """Linear read of a blueprint [t, value] curve, clamped outside its range."""
    if t <= points[0][0]:
        return points[0][1]
    if t >= points[-1][0]:
        return points[-1][1]
    for i in range(len(points) - 1):
        t0, v0 = points[i]
        t1, v1 = points[i + 1]
        if t0 <= t <= t1:
            span = t1 - t0
            k = 0.0 if span <= 0 else (t - t0) / span
            # Smoothstep between control points: a car's surfaces leave a landmark tangentially,
            # and straight-line interpolation puts a visible kink at every one of them.
            k = k * k * (3 - 2 * k)
            return v0 + (v1 - v0) * k
    return points[-1][1]


def smoothstep(edge0, edge1, x):
    if edge0 == edge1:
        return 0.0
    k = max(0.0, min(1.0, (x - edge0) / (edge1 - edge0)))
    return k * k * (3 - 2 * k)


class Body:
    """Blueprint arithmetic, kept apart from the Blender calls so it can be reasoned about."""

    def __init__(self, blueprint):
        self.bp = blueprint
        self.length = blueprint["length"]
        self.width = blueprint["width"]
        self.height = blueprint["height"]
        self.half = blueprint["halfWidth"]
        self.ride = blueprint["ride"]
        self.section = blueprint["section"]
        self.arch = blueprint["arch"]
        self.front_axle = blueprint["frontAxle"]
        self.rear_axle = blueprint["rearAxle"]
        self.tyre_front = blueprint["tyre"]["front"]
        self.tyre_rear = blueprint["tyre"]["rear"]

    def z(self, t):
        """Station t as a length coordinate, nose negative - the game's convention."""
        return -self.length / 2 + t * self.length

    def deck(self, t):
        return sample(self.bp["deck"], t)

    def half_width(self, t):
        """Plan half-width, with the wheel arches flared back out over each axle."""
        flare = self.arch["flare"]
        span = self.arch["span"]
        base = sample(self.bp["plan"], t) * (self.half - flare)
        z = self.z(t)
        for axle, tyre in ((self.front_axle, self.tyre_front), (self.rear_axle, self.tyre_rear)):
            reach = tyre["radius"] * span
            near = 1.0 - min(1.0, abs(z - axle) / reach)
            base += flare * near * near
        return base

    def floor(self, t):
        """Underside height: flat at ride height, lifting over each arch and at the overhangs."""
        z = self.z(t)
        lowest = self.ride
        for axle, tyre in ((self.front_axle, self.tyre_front), (self.rear_axle, self.tyre_rear)):
            radius = tyre["radius"] + self.arch["clearance"]
            dz = abs(z - axle)
            if dz < radius:
                # The arch is a cut in the flank, not a scoop out of the whole underside: hold it
                # to an opening a little taller than the tyre, and let it fall away quickly to the
                # rocker so the sill between the wheels stays low and flat.
                arc = math.sqrt(max(0.0, radius * radius - dz * dz)) / max(radius, 1e-6)
                lowest = max(lowest, self.ride + (tyre["radius"] + self.arch["clearance"]
                                                  - self.ride) * arc ** 1.7)
        # Approach and departure angles: the valance lifts away from the road at both ends.
        lift = max(smoothstep(0.06, 0.0, t), smoothstep(0.94, 1.0, t))
        return lowest + lift * self.height * 0.06

    def ring(self, t):
        """
        One station as a half-section, bottom centre round the flank to top centre.

        Ten control points, each of which is a landmark a car body actually has: the floor, the
        rocker tuck-under, the hip at the widest point, the shoulder crease, the top of the
        fender, and the crowned centreline. Subdivision fills in the rest.
        """
        s = self.section
        deck = self.deck(t)
        floor = self.floor(t)
        hw = self.half_width(t)
        rise = max(0.02, deck - floor)

        # The nose and tail taper in both plan and height, or the car ends in a slab.
        cap = min(smoothstep(0.0, 0.035, t), smoothstep(1.0, 0.965, t))
        cap_w = 0.62 + 0.38 * cap
        cap_h = 0.70 + 0.30 * cap
        hw *= cap_w
        deck = floor + rise * cap_h
        rise = deck - floor

        crown = s["crown"] * self.height
        # The hood sinks between the fender tops; the deck does the same, less so.
        dip = s["hoodDip"] if t < 0.45 else s["deckDip"]
        valley = deck - rise * dip * 0.24

        return [
            (0.0, floor),                                        # 0 underside centre
            (hw * s["floorInset"], floor),                       # 1 underside edge
            (hw * s["sillInset"], floor + rise * s["sill"]),     # 2 rocker tuck-under
            (hw, floor + rise * s["hip"]),                       # 3 hip, the widest point
            (hw * 0.995, floor + rise * (s["hip"] + 0.22)),      # 4 flank
            (hw * s["shoulderInset"], floor + rise * s["shoulder"]),  # 5 shoulder crease
            (hw * s["topInset"], deck),                          # 6 top of the fender
            (hw * s["topInset"] * 0.72, valley + crown * 0.55),  # 7 hood/deck shoulder
            (hw * s["topInset"] * 0.34, valley + crown * 0.9),   # 8 hood/deck flank
            (0.0, valley + crown),                               # 9 crowned centreline
        ]


    def roof_range(self):
        points = self.bp["roof"]
        return points[0][0], points[-1][0]

    def roof(self, t):
        return sample(self.bp["roof"], t)

    def cabin_ring(self, t, ends):
        """
        The greenhouse as a half-section, beltline up to the crown of the roof.

        Kept as its own surface rather than folded into the shell: the glass, the pillars and the
        roof panel are different finishes, and a car's beltline is a hard boundary between them,
        not a smooth continuation. `ends` fades the section to nothing at the windscreen base and
        the backlight base so the shell closes instead of ending in a wall.
        """
        deck = self.deck(t)
        roof = self.roof(t)
        belt = self.half_width(t) * self.section["topInset"]
        rise = max(0.0, roof - deck) * ends
        # Tumblehome: side glass leans in as it rises, and the roof is narrower than the beltline.
        return [
            (belt * 0.94, deck),
            (belt * 0.90, deck + rise * 0.34),
            (belt * 0.79, deck + rise * 0.72),
            (belt * 0.58, deck + rise * 0.95),
            (0.0, deck + rise),
        ]


# Ring indices whose running edge is a real crease on the car, and how hard to hold it.
CREASES = {2: 0.35, 3: 0.55, 5: 0.62, 6: 0.45}
# The beltline is the hardest line on the car; the roof rail is softer but still pressed.
CABIN_CREASES = {0: 0.85, 2: 0.30}


def build_shell(body, name):
    """Loft the stations into a half-cage; a mirror modifier supplies the other side."""
    rings = [body.ring(t) for t in STATIONS]
    per = len(rings[0])

    verts, faces = [], []
    for i, ring in enumerate(rings):
        y = -body.z(STATIONS[i])  # Blender +Y is the nose; glTF export lands it on -Z.
        for x, z in ring:
            verts.append((x, y, z))

    for i in range(len(rings) - 1):
        a, b = i * per, (i + 1) * per
        for j in range(per - 1):
            faces.append((a + j, a + j + 1, b + j + 1, b + j))

    # Cap the nose and the tail. Without these the loft is a tube open at both ends, which reads
    # as a hole straight through the car from any angle that can see into it.
    for base, flip in ((0, False), ((len(rings) - 1) * per, True)):
        for j in range(1, per - 2):
            face = (base, base + j, base + j + 1)
            faces.append(face[::-1] if flip else face)

    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.validate()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)

    # Crease the running edges that are character lines, so subdivision tightens them instead of
    # rounding them away. Without this every pressed line melts into the same soft tube.
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bm.verts.ensure_lookup_table()
    layer = bm.edges.layers.float.get("crease_edge") or bm.edges.layers.float.new("crease_edge")
    for edge in bm.edges:
        v0, v1 = edge.verts
        i0, i1 = v0.index, v1.index
        # A running edge joins the same ring index on neighbouring stations.
        if i0 % per == i1 % per and abs(i0 - i1) == per:
            weight = CREASES.get(i0 % per)
            if weight:
                edge[layer] = weight
    # The centreline seam must stay closed under mirroring, so hold it hard.
    for edge in bm.edges:
        if abs(edge.verts[0].co.x) < 1e-6 and abs(edge.verts[1].co.x) < 1e-6:
            edge[layer] = 1.0
    bm.to_mesh(mesh)
    bm.free()

    mirror = obj.modifiers.new("mirror", "MIRROR")
    mirror.use_axis = (True, False, False)
    mirror.use_clip = True
    mirror.merge_threshold = 1e-4

    subsurf = obj.modifiers.new("subsurf", "SUBSURF")
    subsurf.levels = subsurf.render_levels = 2
    subsurf.use_limit_surface = True

    for polygon in mesh.polygons:
        polygon.use_smooth = True
    return obj


def build_cabin(body, name):
    """Loft the greenhouse over the roof's own t-range, closed at both ends."""
    t0, t1 = body.roof_range()
    steps = 14
    ts = [t0 + (t1 - t0) * (i / (steps - 1)) for i in range(steps)]
    rings = []
    for i, t in enumerate(ts):
        k = i / (steps - 1)
        # Fade the section in at the windscreen base and out at the backlight base.
        ends = min(smoothstep(0.0, 0.16, k), smoothstep(1.0, 0.86, k))
        rings.append(body.cabin_ring(t, ends))
    per = len(rings[0])

    verts, faces = [], []
    for i, ring in enumerate(rings):
        y = -body.z(ts[i])
        for x, z in ring:
            verts.append((x, y, z))
    for i in range(len(rings) - 1):
        a, b = i * per, (i + 1) * per
        for j in range(per - 1):
            faces.append((a + j, a + j + 1, b + j + 1, b + j))

    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.validate()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)

    bm = bmesh.new()
    bm.from_mesh(mesh)
    layer = bm.edges.layers.float.get("crease_edge") or bm.edges.layers.float.new("crease_edge")
    for edge in bm.edges:
        i0, i1 = edge.verts[0].index, edge.verts[1].index
        if i0 % per == i1 % per and abs(i0 - i1) == per:
            weight = CABIN_CREASES.get(i0 % per)
            if weight:
                edge[layer] = weight
    for edge in bm.edges:
        if abs(edge.verts[0].co.x) < 1e-6 and abs(edge.verts[1].co.x) < 1e-6:
            edge[layer] = 1.0
    bm.to_mesh(mesh)
    bm.free()

    mirror = obj.modifiers.new("mirror", "MIRROR")
    mirror.use_axis = (True, False, False)
    mirror.use_clip = True
    mirror.merge_threshold = 1e-4
    subsurf = obj.modifiers.new("subsurf", "SUBSURF")
    subsurf.levels = subsurf.render_levels = 2
    subsurf.use_limit_surface = True
    for polygon in mesh.polygons:
        polygon.use_smooth = True

    # Split the surface by finish rather than by object: the panel above the rails is painted
    # metal, everything below it is glass. Assigning per face keeps one continuous surface.
    glass = paint_material("glass", (0.018, 0.045, 0.082), 0.19, 0.12, 0.0, 0.0)
    glass.node_tree.nodes["Principled BSDF"].inputs["Alpha"].default_value = 0.76
    glass.blend_method = "BLEND" if hasattr(glass, "blend_method") else glass.blend_method
    roof_panel = paint_material("roof", (0.018, 0.078, 0.332), 0.74, 0.23, 1.0, 0.085)
    mesh.materials.append(glass)
    mesh.materials.append(roof_panel)
    for polygon in mesh.polygons:
        # Ring index 3 and above is the roof panel; below it is glazing.
        if min(v % per for v in polygon.vertices) >= 3:
            polygon.material_index = 1
    return obj


def build_wheels(body, car_id):
    """
    Four wheels, as separate objects the game can spin independently.

    A car body without wheels does not read as a car - the arches look like scoops - so these are
    part of judging the shape, not a later detailing pass. Staggered front and rear where the
    blueprint's tyre codes are staggered, and set on the published track width.
    """
    rim = body.bp["rim"]
    wheels = []
    for which, axle, tyre in (("front", body.front_axle, body.tyre_front),
                              ("rear", body.rear_axle, body.tyre_rear)):
        track = body.bp["track"][0 if which == "front" else 1]
        for side in (-1, 1):
            name = "%s-wheel-%s-%s" % (car_id, which, "l" if side < 0 else "r")
            bpy.ops.mesh.primitive_cylinder_add(
                vertices=32, radius=tyre["radius"], depth=tyre["width"],
                rotation=(0, math.radians(90), 0))
            obj = bpy.context.object
            obj.name = name
            # Blender +Y is the nose, so the axle's game-space z maps to -y here.
            obj.location = (side * (track / 2 - tyre["width"] * 0.08), -axle, tyre["radius"])

            bevel = obj.modifiers.new("bevel", "BEVEL")
            bevel.width = tyre["width"] * 0.22
            bevel.segments = 3
            bevel.limit_method = "ANGLE"
            for polygon in obj.data.polygons:
                polygon.use_smooth = True

            rubber = paint_material("tyre", (0.013, 0.019, 0.022), 0.02, 0.90, 0.0, 0.0)
            face = paint_material("rim", srgb_to_linear(rim["colour"]), 0.91, 0.21, 0.0, 0.0)
            obj.data.materials.append(rubber)
            obj.data.materials.append(face)
            # The flat ends of the cylinder are the rim face; the tread band is rubber.
            for polygon in obj.data.polygons:
                if abs(polygon.normal.x) > 0.7:
                    polygon.material_index = 1
            wheels.append(obj)
    return wheels


def srgb_to_linear(hex_colour):
    """Blueprint colours are sRGB hex; Blender wants linear."""
    out = []
    for shift in (16, 8, 0):
        channel = ((hex_colour >> shift) & 0xFF) / 255.0
        out.append(channel / 12.92 if channel <= 0.04045
                   else ((channel + 0.055) / 1.055) ** 2.4)
    return tuple(out)


def fit_to_published(objects, body):
    """
    Pull the cage out until the limit surface measures what the spec sheet says.

    A subdivision surface lies inside its control cage, so a cage built exactly on the published
    width produces a car a few centimetres narrow, and the error is different for every body
    because it depends on how tightly each section is creased. Rather than hand-tune a fudge per
    car, measure what came out and scale the cage by the shortfall.
    """
    for _ in range(4):
        bounds = [measure(obj) for obj in objects]
        bounds = [b for b in bounds if b]
        if not bounds:
            return
        width = max(b["max"][0] for b in bounds) - min(b["min"][0] for b in bounds)
        length = max(b["max"][1] for b in bounds) - min(b["min"][1] for b in bounds)
        top = max(b["max"][2] for b in bounds)
        sx = body.width / width if width > 1e-6 else 1.0
        sy = body.length / length if length > 1e-6 else 1.0
        sz = body.height / top if top > 1e-6 else 1.0
        if max(abs(sx - 1), abs(sy - 1), abs(sz - 1)) < 0.002:
            return
        for obj in objects:
            for vert in obj.data.vertices:
                vert.co.x *= sx
                vert.co.y *= sy
                vert.co.z *= sz


def paint_material(name, colour, metallic, roughness, coat, coat_roughness):
    """Factor-only PBR, no texture maps - the same shape of material the reference builds use."""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*colour, 1.0)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Coat Weight"].default_value = coat
    bsdf.inputs["Coat Roughness"].default_value = coat_roughness
    return mat


def measure(obj):
    """Evaluated bounds, so the numbers describe the mesh the exporter will actually write."""
    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = obj.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh()
    if not mesh.vertices:
        evaluated.to_mesh_clear()
        return None
    # World space, not local: the wheels are placed and rotated, so their local coordinates say
    # nothing useful about where the car's envelope actually is.
    matrix = evaluated.matrix_world
    points = [matrix @ v.co for v in mesh.vertices]
    lo = Vector((min(p[i] for p in points) for i in range(3)))
    hi = Vector((max(p[i] for p in points) for i in range(3)))
    tris = sum(len(p.vertices) - 2 for p in mesh.polygons)
    evaluated.to_mesh_clear()
    return {"min": tuple(lo), "max": tuple(hi), "size": tuple(hi - lo), "triangles": tris}


def build(car_id, blueprint):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    body = Body(blueprint)
    shell = build_shell(body, "%s-shell" % car_id)
    shell.data.materials.append(
        paint_material("paint", (0.018, 0.078, 0.332), 0.74, 0.23, 1.0, 0.085))
    cabin = build_cabin(body, "%s-cabin" % car_id)

    parts = [shell, cabin]
    # The body is fitted to the published envelope; the wheels are already sized and placed from
    # published tyre codes and track widths, so they are built after the fit and left alone.
    fit_to_published(parts, body)
    parts = parts + build_wheels(body, car_id)

    stats = {"triangles": 0, "min": [1e9] * 3, "max": [-1e9] * 3}
    for part in parts:
        bounds = measure(part)
        if not bounds:
            continue
        stats["triangles"] += bounds["triangles"]
        stats["min"] = [min(a, b) for a, b in zip(stats["min"], bounds["min"])]
        stats["max"] = [max(a, b) for a, b in zip(stats["max"], bounds["max"])]
    stats["size"] = [hi - lo for lo, hi in zip(stats["min"], stats["max"])]
    os.makedirs(OUT_DIR, exist_ok=True)
    out = os.path.join(OUT_DIR, "%s.glb" % car_id)
    bpy.ops.export_scene.gltf(
        filepath=out, export_format="GLB", export_apply=True,
        export_yup=True, use_selection=False)
    return out, stats


def main(argv):
    if not os.path.exists(BLUEPRINTS):
        sys.exit("Run: node tools/blender/dump_blueprints.mjs > reference/blueprints.json")
    with open(BLUEPRINTS) as handle:
        blueprints = json.load(handle)

    wanted = argv or sorted(blueprints)
    for car_id in wanted:
        if car_id not in blueprints:
            print("%-22s no blueprint" % car_id)
            continue
        out, stats = build(car_id, blueprints[car_id])
        bp = blueprints[car_id]
        if not stats:
            print("%-22s produced no geometry" % car_id)
            continue
        size = stats["size"]
        # Height is quoted from the ground, not as the extent of the shell, so the number here
        # compares against the same figure the spec sheet gives.
        print("%-22s %6d tris  L %.3f (%.3f)  W %.3f (%.3f)  H %.3f (%.3f)  ride %.3f  -> %s" % (
            car_id, stats["triangles"],
            size[1], bp["length"], size[0], bp["width"], stats["max"][2], bp["height"],
            stats["min"][2], os.path.relpath(out, ROOT)))


if __name__ == "__main__":
    main([a for a in sys.argv[1:] if not a.startswith("-")])
