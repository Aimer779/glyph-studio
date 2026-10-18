// All changes pass through the same validator as imported configurations.
function commitAppearance(patch) {
  const next = validateSettings({ ...settings, ...patch });
  Object.assign(settings, next);
  dispatchEvent(new CustomEvent('visualchange', { detail: Object.keys(patch) }));
  updateFields();
  saveSettings();
}
const contentGroup = document.querySelector('#group-content');
const editor = document.createElement('div');
editor.className = 'appearance-section';
editor.innerHTML = `
  <div class="section-heading"><span>让文字成为纹理</span><small>CONTENT</small></div>
  <p class="section-note">选择一种字符，或写入自己的内容。字形固定，光影流动。</p>
  <div id="text-presets" class="text-presets" aria-label="文字预设"></div>
  <label class="control-label" for="source-text">文字内容 <span id="source-count"></span></label>
  <textarea id="source-text" maxlength="4000" spellcheck="false" aria-describedby="source-help"></textarea>
  <p id="source-help" class="section-note">支持中、英、日文及混合符号。空白不占格，标点会保留；组合字符不会拆开。编辑完成后点击应用。</p>
  <button id="apply-text" class="wide-button">应用文字</button>
  <p id="source-message" class="field-message" role="status"></p>
  <div class="control-label">排列方式</div>
  <div class="mode-switch" role="group" aria-label="排列方式"><button id="order-ordered" aria-pressed="true">按输入顺序</button><button id="order-shuffled" aria-pressed="false">随机打乱</button></div>
  <div class="shuffle-actions"><p class="section-note" id="order-note">按输入顺序逐字铺排，填满后循环。</p><button id="reshuffle-text" hidden>重新打乱</button></div>
  <label class="control-label" for="font-family">字体风格</label>
  <select id="font-family" class="wide-select"><option value="serif">衬线 · 书卷</option><option value="sans">无衬线 · 简洁</option><option value="mono">等宽 · 代码</option></select>
  <p class="section-note">使用本机字体；各语言的字形由字体覆盖范围决定。</p>`;
contentGroup.append(editor);
const sourceText = editor.querySelector('#source-text');
const sourceMessage = editor.querySelector('#source-message');
const sourceCount = editor.querySelector('#source-count');
const fontSelect = editor.querySelector('#font-family');
const textButtons = new Map();
for (const [key, item] of Object.entries(textPresets)) {
  const button = document.createElement('button');
  button.className = 'text-preset';
  const sample = document.createElement('strong');
  sample.textContent = { zhuangzi: '逍遥', ascii: '# / +', english: 'Aa', japanese: 'あいう' }[key];
  const label = document.createElement('span'); label.textContent = item.label;
  button.append(sample, label);
  button.setAttribute('aria-pressed', 'false');
  button.addEventListener('click', () => {
    commitAppearance({ textPreset: key, fontFamily: item.font });
    sourceText.value = configuredText(settings); updateSourceCount();
    sourceMessage.textContent = '已应用预设。';
  });
  textButtons.set(key, button);
  editor.querySelector('#text-presets').append(button);
}
function updateSourceCount() {
  sourceCount.textContent = `${splitGlyphs(sourceText.value).length} 字形`;
}
sourceText.addEventListener('input', () => {
  updateSourceCount(); sourceMessage.textContent = '内容已编辑，点击“应用文字”预览。';
});
editor.querySelector('#apply-text').addEventListener('click', () => {
  try {
    commitAppearance({ textPreset: 'custom', customText: sourceText.value });
    sourceText.removeAttribute('aria-invalid'); sourceMessage.textContent = '已应用并保存。';
  } catch (error) {
    sourceText.setAttribute('aria-invalid', 'true'); sourceMessage.textContent = error.message;
  }
});
fontSelect.addEventListener('change', () => commitAppearance({ fontFamily: fontSelect.value }));
function nextShuffleSeed() {
  let seed = crypto.getRandomValues(new Uint32Array(1))[0];
  if (seed === settings.shuffleSeed) seed = (seed + 1) >>> 0;
  return seed;
}
for (const mode of ['ordered', 'shuffled']) editor.querySelector(`#order-${mode}`).addEventListener('click', () => {
  commitAppearance(mode === 'shuffled' && settings.textOrder !== mode
    ? { textOrder: mode, shuffleSeed: nextShuffleSeed() } : { textOrder: mode });
});
editor.querySelector('#reshuffle-text').addEventListener('click', () => commitAppearance({ shuffleSeed: nextShuffleSeed() }));

const paletteGroup = document.querySelector('#group-bgAngle');
const paletteTop = document.createElement('div');
paletteTop.className = 'appearance-section';
paletteTop.innerHTML = `
  <div class="section-heading"><span>为光影选一组颜色</span><small>PALETTE</small></div>
  <p class="section-note">预设只改变配色，保留文字与动画参数。</p>
  <div id="palette-presets" class="palette-presets" aria-label="配色预设"></div>
  <div id="gradient-preview" class="gradient-preview" aria-label="渐变预览"><span>背景渐变</span></div>
  <div class="mode-switch" role="group" aria-label="渐变类型"><button id="mode-linear" aria-pressed="false">线性</button><button id="mode-radial" aria-pressed="false">径向</button></div>
  <div id="background-colors"></div>`;
paletteGroup.prepend(paletteTop);
const inkSection = document.createElement('div');
inkSection.className = 'ink-section';
inkSection.innerHTML = '<div class="section-heading"><span>文字与点缀</span><small>INK</small></div><p class="section-note">基础字色用于背景与波前；点缀色用于短暂出现的字符簇。</p><div id="ink-colors"></div>';
paletteGroup.append(inkSection);
const themeButtons = [];
for (const palette of palettePresets) {
  const button = document.createElement('button');
  button.className = 'palette-preset';
  button.setAttribute('aria-label', `${palette.name}配色`);
  const swatch = document.createElement('span');
  swatch.style.background = `linear-gradient(135deg, ${palette.colors.join(',')})`;
  const label = document.createElement('small'); label.textContent = palette.name;
  button.append(swatch, label);
  const patch = { bgStart: palette.colors[0], bgMiddle: palette.colors[1], bgEnd: palette.colors[2],
    textColor: palette.text, accentColor: palette.accent, bgMode: palette.mode };
  button.addEventListener('click', () => commitAppearance(patch));
  themeButtons.push({ button, patch });
  paletteTop.querySelector('#palette-presets').append(button);
}
const colorInputs = new Map();
for (const [key, label, parent] of [
  ['bgStart', '起始色', '#background-colors'], ['bgMiddle', '中间色', '#background-colors'],
  ['bgEnd', '结束色', '#background-colors'], ['textColor', '基础字色', '#ink-colors'],
  ['accentColor', '点缀字色', '#ink-colors']
]) {
  const row = document.createElement('div'); row.className = 'color-row';
  const caption = document.createElement('label'); caption.htmlFor = `color-${key}`; caption.textContent = label;
  const picker = document.createElement('input'); Object.assign(picker, { type: 'color', id: `color-${key}` });
  picker.setAttribute('aria-label', `${label}调色板`);
  const hex = document.createElement('input'); Object.assign(hex, { type: 'text', maxLength: 7 });
  hex.className = 'hex-input'; hex.setAttribute('aria-label', `${label} HEX`); hex.spellcheck = false;
  const message = document.createElement('span'); message.className = 'color-error'; message.setAttribute('role', 'status');
  let timer;
  picker.addEventListener('input', () => {
    hex.value = picker.value; clearTimeout(timer);
    timer = setTimeout(() => commitAppearance({ [key]: picker.value }), 80);
  });
  picker.addEventListener('change', () => { clearTimeout(timer); commitAppearance({ [key]: picker.value }); });
  function applyHex() {
    clearTimeout(timer);
    let value = hex.value.trim();
    if (/^#[0-9a-f]{3}$/i.test(value)) value = '#' + [...value.slice(1)].map(char => char + char).join('');
    try {
      commitAppearance({ [key]: value }); hex.removeAttribute('aria-invalid'); message.textContent = '';
    } catch {
      hex.setAttribute('aria-invalid', 'true'); message.textContent = '请输入 #RRGGBB，例如 #3A65CD';
    }
  }
  hex.addEventListener('change', applyHex);
  hex.addEventListener('keydown', event => { if (event.key === 'Enter') applyHex(); });
  row.append(caption, picker, hex, message);
  document.querySelector(parent).append(row); colorInputs.set(key, { picker, hex, message });
}
for (const mode of ['linear', 'radial']) document.querySelector(`#mode-${mode}`)
  .addEventListener('click', () => commitAppearance({ bgMode: mode }));
let sourceSignature = '';
function syncAppearance() {
  const signature = `${settings.textPreset}:${settings.customText}`;
  if (signature !== sourceSignature) {
    sourceSignature = signature; sourceText.value = configuredText(settings); updateSourceCount();
    sourceText.removeAttribute('aria-invalid');
    sourceMessage.textContent = '';
  }
  fontSelect.value = settings.fontFamily;
  for (const mode of ['ordered', 'shuffled']) editor.querySelector(`#order-${mode}`).setAttribute('aria-pressed', String(settings.textOrder === mode));
  editor.querySelector('#reshuffle-text').hidden = settings.textOrder !== 'shuffled';
  editor.querySelector('#order-note').textContent = settings.textOrder === 'shuffled'
    ? '打乱后循环铺排；刷新时保留排列，不会逐帧跳字。' : '按输入顺序逐字铺排，填满后循环。';
  for (const [key, button] of textButtons) button.setAttribute('aria-pressed', String(settings.textPreset === key));
  for (const { button, patch } of themeButtons) button.setAttribute('aria-pressed', String(Object.entries(patch).every(([key, value]) => settings[key] === value)));
  for (const [key, { picker, hex, message }] of colorInputs) {
    picker.value = settings[key]; hex.value = settings[key].toUpperCase();
    hex.removeAttribute('aria-invalid'); message.textContent = '';
  }
  document.querySelector('#gradient-preview').style.background = backgroundGradient(settings);
  for (const mode of ['linear', 'radial']) document.querySelector(`#mode-${mode}`).setAttribute('aria-pressed', String(settings.bgMode === mode));
  for (const key of ['bgAngle', 'bgX', 'bgY']) {
    document.querySelector(`#param-${key}`).closest('.parameter').hidden = key === 'bgAngle' ? settings.bgMode !== 'linear' : settings.bgMode !== 'radial';
  }
}
addEventListener('panelsync', syncAppearance);
syncAppearance();
