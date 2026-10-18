let chars = [];
const canvas = document.querySelector("#field");
const ctx = canvas.getContext("2d");
const pauseButton = document.querySelector("#pause");
const motionPreference = matchMedia("(prefers-reduced-motion: reduce)");
let reducedMotion = motionPreference.matches;
let paused = false;
let width = 0;
let height = 0;
let cells = [];
let ripples = [];
let frameId = null;
let previousTime = 0;
let sceneTime = 0;
let ambientTime = 0;
let tintTime = 0;
let tintClusterKey = '';
let tintClusters = [];
let lastPointer = null;
let font = '';
const atlases = Array.from({ length: 17 }, () => document.createElement('canvas'));
let glyphs = [];
let glyphIndex = new Map();
let atlasScale = 1;
let lastStats = 0;
let frameCount = 0;
let drawTotal = 0;

function prepareAtlas(dpr) {
  atlasScale = dpr;
  atlases.forEach((atlas, level) => {
  atlas.width = Math.ceil(32 * 24 * dpr);
  atlas.height = Math.ceil(Math.ceil(glyphs.length / 32) * 24 * dpr);
  const brush = atlas.getContext('2d');
  brush.setTransform(dpr, 0, 0, dpr, 0, 0);
  brush.font = font;
  brush.textAlign = 'center';
  brush.textBaseline = 'middle';
  const blend = level / (atlases.length - 1);
  const from = settings.textColor.match(/[0-9a-f]{2}/gi).map(value => parseInt(value, 16));
  const to = settings.accentColor.match(/[0-9a-f]{2}/gi).map(value => parseInt(value, 16));
  const rgb = from.map((value, channel) => Math.round(value + (to[channel] - value) * blend));
  brush.fillStyle = `rgb(${rgb.join(',')})`;
  glyphs.forEach((char, index) => brush.fillText(char, (index % 32) * 24 + 12, Math.floor(index / 32) * 24 + 12));
  });
}

function resize() {
  chars = arrangedGlyphs(settings);
  glyphs = [...new Set(chars)];
  glyphIndex = new Map(glyphs.map((char, index) => [char, index]));
  font = `14px ${fontFamilies[settings.fontFamily]}`;
  width = innerWidth;
  height = innerHeight;
  const dpr = Math.min(devicePixelRatio || 1, settings.resolution);
  prepareAtlas(dpr);
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.font = font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#37465a";
  cells = [];
  let index = 0;
  for (let y = 16; y < height; y += 20) {
    for (let x = 16; x < width; x += 18) {
      const char = chars[index++ % chars.length];
      const glyph = glyphIndex.get(char);
      cells.push({ x, y, glyph });
    }
  }
  for (const ripple of ripples) ripple.distances = null;
  tintClusterKey = '';
  draw();
}

function addRipple(x, y, kind = "click") {
  if (paused || reducedMotion) return;
  if (kind === "click") ripples = ripples.filter(ripple => ripple.kind !== "hover");
  // Hover disturbances cannot evict a click before its wake has faded.
  if (kind === "hover" && ripples.length >= 7) return;
  ripples.push({ x, y, start: sceneTime, kind, distances: null });
  // Bound both drawing cost and the contrast of overlapping interactions.
  if (ripples.length > 7) ripples.shift();
  start();
}

function draw() {
  ctx.clearRect(0, 0, width, height);
  ctx.globalAlpha = 1;
  const epoch = Math.floor(tintTime / (settings.tintDuration + 0.6));
  const clusterKey = `${epoch}:${settings.tintClusters}:${settings.tintGlyphs}:${settings.tintDuration}:${settings.tintScale}`;
  if (clusterKey !== tintClusterKey) {
    const candidates = cells.filter(cell => ambientAlpha(cell.x, cell.y, ambientTime) > 0.008);
    tintClusters = makeTintClusters(candidates, epoch);
    tintClusterKey = clusterKey;
  }
  for (const ripple of ripples) {
    if (!ripple.distances) ripple.distances = Float32Array.from(cells, cell => Math.hypot(cell.x - ripple.x, cell.y - ripple.y));
  }
  for (let index = 0; index < cells.length; index++) {
    const cell = cells[index];
    let strength = 0;
    for (const ripple of ripples) {
      const age = sceneTime - ripple.start;
      const distance = ripple.distances[index];
      const opacity = rippleOpacity(distance, age, ripple.kind);
      strength += opacity;
    }
    const idle = ambientAlpha(cell.x, cell.y, ambientTime);
    const tint = glyphTint(cell.x, cell.y, tintTime, strength, settings, tintClusters);
    const alpha = Math.min(1, Math.max(idle + strength, tint * 0.42));
    if (alpha < 0.001) continue;
    ctx.globalAlpha = alpha;
    // One draw per glyph preserves opacity and avoids darkening from layer overlap.
    const atlas = atlases[Math.round(tint * (atlases.length - 1))];
    ctx.drawImage(atlas, (cell.glyph % 32) * 24 * atlasScale, Math.floor(cell.glyph / 32) * 24 * atlasScale,
      24 * atlasScale, 24 * atlasScale, cell.x - 12, cell.y - 12, 24, 24);
  }
  ctx.globalAlpha = 1;
}

function animate(time) {
  frameId = null;
  if (paused || reducedMotion || document.hidden) return;
  if (previousTime) {
    const elapsed = (time - previousTime) / 1000;
    sceneTime += elapsed;
    ambientTime += elapsed * settings.flow;
    tintTime += elapsed * settings.tintSpeed;
  }
  previousTime = time;
  ripples = ripples.filter(ripple => {
    const speed = ripple.kind === 'hover' ? 125 : settings.speed;
    const lifetime = Math.hypot(width, height) / speed + settings.width * 4 / speed + settings.wakeLife * 8;
    return sceneTime - ripple.start < (ripple.kind === 'hover' ? 3 : lifetime);
  });
  const drawStart = performance.now();
  draw();
  drawTotal += performance.now() - drawStart;
  frameCount++;
  if (!lastStats) lastStats = time;
  if (time - lastStats >= 1000) {
    document.querySelector('#performance').textContent = `${Math.round(frameCount * 1000 / (time - lastStats))} FPS · ${(drawTotal / frameCount).toFixed(1)} ms 绘制`;
    frameCount = 0; drawTotal = 0; lastStats = time;
  }
  if (frameId === null) frameId = requestAnimationFrame(animate);
}

function start() {
  if (frameId === null && !paused && !reducedMotion && !document.hidden) {
    frameId = requestAnimationFrame(animate);
  }
}

function stop() {
  if (frameId !== null) cancelAnimationFrame(frameId);
  frameId = null;
  previousTime = 0;
  frameCount = 0; drawTotal = 0; lastStats = 0;
  document.querySelector('#performance').textContent = '已暂停';
}

document.addEventListener("pointermove", event => {
  if (event.pointerType === "touch" || event.target.closest("button, a, #tuning") || settings.hover === 0) return;
  const point = { x: event.clientX, y: event.clientY, time: performance.now() };
  if (!lastPointer || (point.time - lastPointer.time > 280 && Math.hypot(point.x - lastPointer.x, point.y - lastPointer.y) > 90)) {
    addRipple(point.x, point.y, "hover");
    lastPointer = point;
  }
});
document.addEventListener("pointerdown", event => {
  if (event.button !== 0 || event.target.closest("button, a, #tuning")) return;
  addRipple(event.clientX, event.clientY);
});
pauseButton.addEventListener("click", () => {
  paused = !paused;
  pauseButton.setAttribute("aria-pressed", String(paused));
  pauseButton.textContent = paused ? "继续动效" : "暂停动效";
  if (paused) stop(); else start();
});
function applyMotionPreference() {
  reducedMotion = motionPreference.matches;
  pauseButton.disabled = reducedMotion;
  if (reducedMotion) { stop(); ripples = []; draw(); } else start();
}
pauseButton.addEventListener("click", applyMotionPreference);
motionPreference.addEventListener("change", applyMotionPreference);
document.addEventListener("visibilitychange", () => { if (document.hidden) stop(); else start(); });
addEventListener("resize", resize);
function applyVisuals(keys) {
  document.body.style.background = backgroundGradient(settings);
  if (keys.some(key => ['textPreset', 'customText', 'fontFamily', 'textOrder', 'shuffleSeed'].includes(key))) {
    ripples = []; resize();
  } else {
    if (keys.some(key => ['textColor', 'accentColor'].includes(key))) prepareAtlas(atlasScale);
    draw();
  }
}
addEventListener('visualchange', event => applyVisuals(event.detail));
addEventListener('settingschange', event => {
  if (event.detail.startsWith('bg')) { applyVisuals([event.detail]); return; }
  // Changes to wave speed start a new experiment instead of teleporting existing rings.
  if (!['idle', 'threshold', 'flow', 'deformation', 'tint', 'tintClusters', 'tintGlyphs', 'tintSpeed', 'tintScale', 'tintWave', 'tintDuration'].includes(event.detail)) ripples = [];
  if (event.detail === 'all') applyVisuals(['textPreset']);
  else if (event.detail === 'resolution') resize(); else draw();
});
document.body.style.background = backgroundGradient(settings);
resize();
applyMotionPreference();
document.fonts.ready.then(resize);
