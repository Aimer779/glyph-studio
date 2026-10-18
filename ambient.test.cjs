const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const read = name => readFileSync(`${__dirname}/${name}`, 'utf8');
const api = vm.runInNewContext(read('settings.js') + read('ambient.js') + '\n({ambientAlpha, defaultSettings})');
const config = { ...api.defaultSettings, deformation: 0 };
let changed = 0;
let reshaped = 0;
for (let y = 0; y < 900; y += 23) for (let x = 0; x < 1400; x += 21) {
  const a = api.ambientAlpha(x, y, 0, config);
  assert(a >= 0 && a <= 0.15);
  assert(api.ambientAlpha(x, y, 0, { ...config, threshold: 0.8 }) <= a);
  assert(Math.abs(a - api.ambientAlpha(x + 1600, y + 1200, 0, config)) < 1e-10);
  if (Math.abs(a - api.ambientAlpha(x, y, 10, config)) > 0.01) changed++;
  assert(Math.abs(a - api.ambientAlpha(x, y, 1 / 60, config)) < 0.001);
  if (Math.abs(api.ambientAlpha(x, y, 20, config) - api.ambientAlpha(x, y, 20, { ...config, deformation: 1 })) > 0.01) reshaped++;
}
assert(changed > 100);
assert.equal(api.defaultSettings.idle, 0.15);
assert(reshaped > 100);
for (const threshold of [0.2, 0.95]) for (const deformation of [0, 1.5]) {
  for (let x = 0; x < 1600; x += 31) {
    const alpha = api.ambientAlpha(x, 450, 90, { ...config, idle: 0.3, threshold, deformation });
    assert(Number.isFinite(alpha) && alpha >= 0 && alpha <= 0.3);
  }
}

// Exercise actual drawing: every glyph stays on its original grid at all times.
let drawn = [];
const context = { setTransform() {}, clearRect() {}, fillText() {},
  drawImage(...args) { drawn.push({ x: args[5], y: args[6], alpha: this.globalAlpha }); } };
const element = { addEventListener() {}, setAttribute() {}, getContext: () => context };
const sandbox = { console, Float32Array, innerWidth: 1000, innerHeight: 800, devicePixelRatio: 1,
  document: { body: { style: {} }, querySelector: () => element, createElement: () => element,
    addEventListener() {}, hidden: false, fonts: { ready: { then() {} } } },
  matchMedia: () => ({matches: false, addEventListener() {}}),
  addEventListener() {}, requestAnimationFrame: () => 1, cancelAnimationFrame() {},
  performance: { now: () => 0 } };
vm.createContext(sandbox);
vm.runInContext(['content.js', 'settings.js', 'ambient.js', 'ripple.js', 'tint.js', 'app.js'].map(read).join('\n'), sandbox);
const frames = [];
for (const seconds of [0, 5, 10]) {
  drawn = [];
  vm.runInContext(`ambientTime = ${seconds}; draw();`, sandbox);
  for (const glyph of drawn) {
    assert.equal((glyph.x - 4) % 18, 0);
    assert.equal((glyph.y - 4) % 20, 0);
  }
  frames.push(JSON.stringify(drawn));
}
assert.notEqual(frames[0], frames[2]);
vm.runInContext('previousTime = 1000; settings.flow = 0; animate(2000);', sandbox);
assert.equal(vm.runInContext('ambientTime', sandbox), 10);
vm.runInContext('settings.flow = 1; animate(3000);', sandbox);
assert.equal(vm.runInContext('ambientTime', sandbox), 11);
console.log('PASS: coherent light transport, smooth changes, fixed glyph positions, freeze and resume');
