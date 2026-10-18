// A fixed pattern is sampled in moving coordinates. Glyph positions never move.
const noiseSize = 64;
const noise = Float32Array.from({ length: noiseSize * noiseSize }, (_, index) => {
  const value = Math.sin(index * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
});
function smoothstep(a, b, value) {
  const t = Math.max(0, Math.min(1, (value - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
function waterNoise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = smoothstep(0, 1, x - ix), fy = smoothstep(0, 1, y - iy);
  const sample = (dx, dy) => noise[((iy + dy) & 63) * noiseSize + ((ix + dx) & 63)];
  const top = sample(0, 0) * (1 - fx) + sample(1, 0) * fx;
  const bottom = sample(0, 1) * (1 - fx) + sample(1, 1) * fx;
  return top * (1 - fy) + bottom * fy;
}
// Unequal, oblique strokes leave winding negative space, not rows of round blobs.
const mistStrokes = [
  [190, 160, 370, 78, -0.25, 1.06],
  [820, 530, 440, 88, 0.32, 1.02],
  [350, 850, 280, 57, -0.42, 0.9],
  [890, 110, 190, 42, 0.38, 0.78],
  [1370, 1030, 250, 48, -0.28, 0.86],
  [90, 550, 145, 38, 0.6, 0.72],
  [720, 1120, 160, 34, -0.15, 0.7]
];
let cloudCache = { time: NaN, deformation: NaN, clouds: [] };
function cloudShapes(time, deformation) {
  if (cloudCache.time === time && cloudCache.deformation === deformation) return cloudCache.clouds;
  const clouds = mistStrokes.map(([x, y, length, width, angle, ink], index) => {
    const phase = index * 2.399;
    const turn = angle + deformation * 0.08 * Math.sin(time * 0.035 + phase);
    return {
      x: x + time * (2.1 + index % 3 * 0.35),
      y: y - time * (0.6 + index % 2 * 0.3),
      length, width: width * 1.65, ink, phase, cos: Math.cos(turn), sin: Math.sin(turn),
      bend: time * 0.045 * deformation
    };
  });
  cloudCache = { time, deformation, clouds };
  return clouds;
}
function ambientAlpha(x, y, time, config = settings) {
  let field = 0;
  for (const cloud of cloudShapes(time, config.deformation)) {
    // Periodic distances let clouds enter and leave without respawning or flashing.
    const dx = ((x - cloud.x) % 1600 + 2400) % 1600 - 800;
    const dy = ((y - cloud.y) % 1200 + 1800) % 1200 - 600;
    const u = dx * cloud.cos + dy * cloud.sin;
    const v = -dx * cloud.sin + dy * cloud.cos;
    const along = u / cloud.length;
    if (Math.abs(along) >= 1 || Math.abs(v) > cloud.width * 3) continue;
    const spine = cloud.width * (0.46 * Math.sin(along * 3.8 + cloud.phase + cloud.bend)
      + 0.2 * Math.sin(along * 7 - cloud.phase - cloud.bend));
    const taper = 1 - smoothstep(0.45, 1, Math.abs(along));
    const thickness = cloud.width * (0.65 + 0.2 * Math.sin(along * 4 + cloud.phase + cloud.bend)
      + 0.15 * (1 - along)) * (0.2 + 0.8 * taper);
    const across = (v - spine) / thickness;
    const grain = waterNoise(u / 100 + cloud.phase + cloud.bend, v / 90 - cloud.bend);
    const body = (0.75 * Math.exp(-across * across * 1.1)
      + 0.25 * Math.exp(-across * across * 0.38)) * taper;
    const density = body * (0.58 + grain * 0.42) * cloud.ink;
    // A bounded union allows faint bridges without making overlaps uniformly dark.
    field = 1 - (1 - field) * (1 - Math.min(0.99, density));
  }
  const cutoff = config.threshold * 0.42;
  // Lift the middle tones without increasing the user's maximum opacity.
  return Math.pow(smoothstep(cutoff, 0.9, field), 0.72) * config.idle;
}
