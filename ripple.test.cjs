const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const code = ['settings.js', 'ripple.js'].map(name => readFileSync(`${__dirname}/${name}`, 'utf8')).join('\n');
const api = vm.runInNewContext(code + '\n({rippleOpacity, defaultSettings, validateSettings, parameterGroups})');
const { validateSettings } = api;
const requested = { speed: 700, width: 13, softness: 0.65, step: 4, peak: 0.95,
  wake: 0.09, wakeLife: 0.7, decay: 2.5, hover: 0, idle: 0.15,
  threshold: 0.8, flow: 3, deformation: 0.2, resolution: 1.5 };
for (const [key, value] of Object.entries(requested)) assert.equal(api.defaultSettings[key], value);
const config = { ...api.defaultSettings, speed: 340, width: 16, softness: 1, step: 0,
  peak: 0.82, wakeLife: 0.55, decay: 0.15 };
const opacity = (distance, age, kind = 'click', params = config) => api.rippleOpacity(distance, age, kind, params);
assert.equal(config.step, 0);
assert(opacity(340, 1) > 0.65);
assert(opacity(340, 1.3) > 0.02);
assert(opacity(340, 3) < 0.005);
assert.equal(opacity(0, 0), 0);
const fastFade = { ...config, decay: 2.5 };
const oldFade = { ...config, decay: 1.5 };
assert(opacity(340, 1, 'click', fastFade) < opacity(340, 1, 'click', oldFade) * 0.4);
assert(opacity(34, 0.1, 'click', fastFade) > opacity(34, 0.1, 'click', oldFade) * 0.85);
assert.equal(opacity(125, 1, 'hover', { ...config, hover: 0 }), 0);
// Continuous defaults must not jump at former 21 px band boundaries.
for (let distance = 0; distance < 700; distance += 0.5) {
  assert(Math.abs(opacity(distance, 1, 'click', config) - opacity(distance + 0.5, 1, 'click', config)) < 0.025);
}
const stepped = { ...config, step: 21 };
assert.equal(opacity(352, 1, 'click', stepped), opacity(360, 1, 'click', stepped));
assert(opacity(360, 1, 'click', { ...config, width: 40 }) > opacity(360, 1, 'click', { ...config, width: 4 }));
assert.equal(validateSettings({speed: 400}).speed, 400);
assert.throws(() => validateSettings({speed: -1}));
assert.throws(() => validateSettings({width: 'wide'}));
assert.throws(() => validateSettings({peak: NaN}));
assert.throws(() => validateSettings(null));
for (const [, fields] of api.parameterGroups) for (const [key, , min, max] of fields) {
  for (const value of [min, max]) {
    const params = validateSettings({ ...config, [key]: value });
    assert(Number.isFinite(opacity(340, 1, 'click', params)));
  }
}
console.log('PASS: continuous wave, wake decay, opt-in stepping, controls, import validation, range boundaries');
