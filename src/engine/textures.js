/**
 * Procedural texture atlas.
 *
 * The game ships no binary assets, so every surface is painted into an offscreen canvas at boot:
 * asphalt and its normal map, road markings, kerbs, barriers, lit tower windows, neon signage and
 * the soft sprite used for sparks, spray and smoke. Deterministic noise keeps a track looking the
 * same between runs and between the showroom and the race.
 */

import * as THREE from "three";

/** Small deterministic PRNG so textures are stable across reloads. */
function mulberry(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function createCanvas(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function toTexture(canvas, { repeat = [1, 1], srgb = true, anisotropy = 8 } = {}) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat[0], repeat[1]);
  texture.anisotropy = anisotropy;
  if (srgb) texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function hexToRgb(hex) {
  return { r: (hex >> 16) & 255, g: (hex >> 8) & 255, b: hex & 255 };
}

/**
 * A full road-width strip of asphalt: u runs kerb-to-kerb, v repeats along the lap.
 * Lane markings are built as geometry instead (see `src/world/track.js`) - painted into the texture
 * they blur away into the mip chain at exactly the grazing angles a racing camera looks from.
 */
export function createRoadTexture(theme) {
  const width = 512;
  const height = 1024;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  const random = mulberry(0x9e37);
  const base = hexToRgb(theme.road ?? 0x1b1e23);

  const image = ctx.createImageData(width, height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      // Two octaves of value noise for aggregate plus broad patches.
      const fine = random();
      const patch = Math.sin(x * 0.017 + y * 0.006) * 0.5 + Math.sin(x * 0.004 - y * 0.021) * 0.5;
      const grain = (fine - 0.5) * 26 + patch * 7;
      // Tyre-polished bands where the racing line usually runs.
      const laneWear = Math.exp(-((x - width * 0.32) ** 2) / 5200) + Math.exp(-((x - width * 0.68) ** 2) / 5200);
      const wear = laneWear * 9;
      image.data[i] = Math.max(0, base.r + grain + wear);
      image.data[i + 1] = Math.max(0, base.g + grain + wear);
      image.data[i + 2] = Math.max(0, base.b + grain + wear);
      image.data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);

  // Repair patches and seams.
  for (let i = 0; i < 14; i += 1) {
    const x = random() * width;
    const y = random() * height;
    ctx.fillStyle = `rgba(0,0,0,${0.06 + random() * 0.1})`;
    ctx.fillRect(x, y, 30 + random() * 120, 18 + random() * 90);
  }
  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 4; i += 1) {
    const y = random() * height;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y + (random() - 0.5) * 12);
    ctx.stroke();
  }

  return toTexture(canvas, { repeat: [1, 1] });
}

/** Height-derived normal map so wet asphalt catches the headlights. */
export function createRoadNormal() {
  const size = 256;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");
  const random = mulberry(0x51ab);
  const heights = new Float32Array(size * size);
  for (let i = 0; i < heights.length; i += 1) heights[i] = random();

  const image = ctx.createImageData(size, size);
  const at = (x, y) => heights[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = at(x + 1, y) - at(x - 1, y);
      const dy = at(x, y + 1) - at(x, y - 1);
      const i = (y * size + x) * 4;
      image.data[i] = 128 + dx * 90;
      image.data[i + 1] = 128 + dy * 90;
      image.data[i + 2] = 255;
      image.data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  return toTexture(canvas, { repeat: [10, 220], srgb: false });
}

/** Alternating kerb blocks. */
export function createKerbTexture(colorA = 0xf2f2e8, colorB = 0xd72733) {
  const canvas = createCanvas(64, 128);
  const ctx = canvas.getContext("2d");
  const a = hexToRgb(colorA);
  const b = hexToRgb(colorB);
  for (let i = 0; i < 4; i += 1) {
    ctx.fillStyle = i % 2 ? `rgb(${b.r},${b.g},${b.b})` : `rgb(${a.r},${a.g},${a.b})`;
    ctx.fillRect(0, i * 32, 64, 32);
  }
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.fillRect(0, 0, 64, 6);
  return toTexture(canvas, { repeat: [1, 1] });
}

/** Concrete barrier with a reflective strip along the top. */
export function createBarrierTexture(baseColor = 0x232830, glow = 0x00d8ff) {
  const canvas = createCanvas(128, 128);
  const ctx = canvas.getContext("2d");
  const base = hexToRgb(baseColor);
  const random = mulberry(0x2ba1);
  ctx.fillStyle = `rgb(${base.r},${base.g},${base.b})`;
  ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 400; i += 1) {
    const shade = random() * 30 - 15;
    ctx.fillStyle = `rgba(${base.r + shade},${base.g + shade},${base.b + shade},0.5)`;
    ctx.fillRect(random() * 128, random() * 128, 3, 3);
  }
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(0, 96, 128, 6);
  const strip = hexToRgb(glow);
  ctx.fillStyle = `rgba(${strip.r},${strip.g},${strip.b},0.9)`;
  ctx.fillRect(0, 26, 128, 9);
  return toTexture(canvas, { repeat: [1, 1] });
}

/** Emissive window grid for the skyline, with a scatter of dark apartments. */
export function createWindowTexture(glow = 0x00d8ff, warm = 0xffd166, density = 1) {
  const canvas = createCanvas(128, 256);
  const ctx = canvas.getContext("2d");
  const random = mulberry(0x77c3);
  ctx.fillStyle = "#05070a";
  ctx.fillRect(0, 0, 128, 256);
  const cool = hexToRgb(glow);
  const hot = hexToRgb(warm);
  for (let y = 6; y < 250; y += 12) {
    for (let x = 6; x < 122; x += 10) {
      if (random() > 0.42 * density) continue;
      const useWarm = random() > 0.28;
      const c = useWarm ? hot : cool;
      const alpha = 0.45 + random() * 0.55;
      ctx.fillStyle = `rgba(${c.r},${c.g},${c.b},${alpha})`;
      ctx.fillRect(x, y, 6, 7);
    }
  }
  return toTexture(canvas, { repeat: [1, 1] });
}

/** Neon sign face used on billboards and gantries. */
export function createSignTexture(color = 0x00d8ff, label = "NIGHTLINE") {
  const canvas = createCanvas(256, 128);
  const ctx = canvas.getContext("2d");
  const c = hexToRgb(color);
  ctx.fillStyle = "#05080b";
  ctx.fillRect(0, 0, 256, 128);
  ctx.strokeStyle = `rgba(${c.r},${c.g},${c.b},0.95)`;
  ctx.lineWidth = 5;
  ctx.strokeRect(12, 12, 232, 104);
  ctx.fillStyle = `rgba(${c.r},${c.g},${c.b},0.95)`;
  ctx.font = "bold 44px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, 128, 66);
  return toTexture(canvas, { repeat: [1, 1] });
}

/** Soft round sprite: sparks, spray, smoke and headlight flares all reuse it. */
export function createParticleTexture() {
  const canvas = createCanvas(64, 64);
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.35, "rgba(255,255,255,0.55)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  return toTexture(canvas, { repeat: [1, 1] });
}

/**
 * Sky dome texture: a vertical gradient with stars, a moon or a low sun depending on the theme.
 * Doubles as the source for the environment map so paint reflects the same sky the player sees.
 */
export function createSkyTexture(theme) {
  const width = 1024;
  const height = 512;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  const top = hexToRgb(theme.skyTop ?? 0x05070d);
  const horizon = hexToRgb(theme.skyHorizon ?? 0x18354d);
  const glow = hexToRgb(theme.skyGlow ?? 0x2b6f9c);

  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, `rgb(${top.r},${top.g},${top.b})`);
  gradient.addColorStop(0.55, `rgb(${horizon.r},${horizon.g},${horizon.b})`);
  gradient.addColorStop(1, `rgb(${glow.r},${glow.g},${glow.b})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const random = mulberry(0x1f3d);
  const starAmount = Math.round(520 * (theme.stars ?? 0));
  for (let i = 0; i < starAmount; i += 1) {
    const x = random() * width;
    const y = random() * height * 0.55;
    const alpha = 0.25 + random() * 0.75;
    const size = random() > 0.94 ? 2.2 : 1.1;
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.fillRect(x, y, size, size);
  }

  if (theme.moon) {
    const mx = width * 0.72;
    const my = height * 0.2;
    const halo = ctx.createRadialGradient(mx, my, 4, mx, my, 120);
    halo.addColorStop(0, "rgba(255,240,214,0.95)");
    halo.addColorStop(0.12, "rgba(255,236,200,0.55)");
    halo.addColorStop(1, "rgba(255,236,200,0)");
    ctx.fillStyle = halo;
    ctx.fillRect(mx - 140, my - 140, 280, 280);
  }

  if (theme.sun) {
    const sx = width * 0.2;
    const sy = height * 0.6;
    const halo = ctx.createRadialGradient(sx, sy, 6, sx, sy, 260);
    halo.addColorStop(0, "rgba(255,244,214,1)");
    halo.addColorStop(0.08, "rgba(255,196,120,0.85)");
    halo.addColorStop(0.4, "rgba(255,140,80,0.28)");
    halo.addColorStop(1, "rgba(255,120,60,0)");
    ctx.fillStyle = halo;
    ctx.fillRect(sx - 280, sy - 280, 560, 560);
  }

  // Horizon haze ties the sky into the fog colour.
  const haze = ctx.createLinearGradient(0, height * 0.72, 0, height);
  haze.addColorStop(0, "rgba(0,0,0,0)");
  haze.addColorStop(1, `rgba(${glow.r},${glow.g},${glow.b},0.55)`);
  ctx.fillStyle = haze;
  ctx.fillRect(0, height * 0.72, width, height * 0.28);

  return toTexture(canvas, { repeat: [1, 1] });
}

/** Ground/terrain texture: broad mottled colour, cheap but breaks up the flat plane. */
export function createGroundTexture(color = 0x0b1218) {
  const size = 256;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");
  const base = hexToRgb(color);
  const random = mulberry(0x4c7f);
  ctx.fillStyle = `rgb(${base.r},${base.g},${base.b})`;
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 900; i += 1) {
    const shade = (random() - 0.5) * 26;
    ctx.fillStyle = `rgba(${base.r + shade},${base.g + shade},${base.b + shade},0.6)`;
    const r = 4 + random() * 26;
    ctx.beginPath();
    ctx.arc(random() * size, random() * size, r, 0, Math.PI * 2);
    ctx.fill();
  }
  return toTexture(canvas, { repeat: [40, 40] });
}
