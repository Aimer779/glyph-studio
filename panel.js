const panelFields = new Map();
const status = document.querySelector('#settings-status');
const preset = document.querySelector('#preset');
const presets = {
  smooth: { ...defaultSettings, speed: 340, width: 16, softness: 1, step: 0 },
  crisp: { ...defaultSettings, width: 12, softness: 0.65, peak: 0.95, speed: 300, hover: 0 },
  pixel: { ...defaultSettings, width: 10, softness: 0.15, step: 21, peak: 0.9 }
};
function saveSettings() {
  try {
    localStorage.setItem(settingsKey, JSON.stringify(settings));
    status.textContent = '已自动保存到本浏览器。';
  } catch { status.textContent = '浏览器不允许保存；请导出参数留存。'; }
}
function updateFields() {
  for (const [key, { input, number }] of panelFields) {
    input.value = settings[key];
    number.value = Number(settings[key].toFixed(3));
    input.style.setProperty('--fill', `${(settings[key] - Number(input.min)) / (Number(input.max) - Number(input.min)) * 100}%`);
  }
  dispatchEvent(new Event('panelsync'));
}
function applySettings(value) {
  Object.assign(settings, validateSettings(value));
  updateFields();
  dispatchEvent(new CustomEvent('settingschange', { detail: 'all' }));
  saveSettings();
}
const tabButtons = [];
function selectCategory(index) {
  tabButtons.forEach((button, i) => {
    button.setAttribute('aria-selected', String(i === index));
    button.tabIndex = i === index ? 0 : -1;
    document.getElementById(button.getAttribute('aria-controls')).hidden = i !== index;
  });
  document.querySelector('#panel-scroll').scrollTop = 0;
  document.querySelector('#animation-presets').hidden = index !== 2;
}
for (const [index, [name, fields]] of [4, 5, 0, 1, 2, 3].map(index => parameterGroups[index]).entries()) {
  const group = document.createElement('fieldset');
  group.id = `group-${fields.length ? fields[0][0] : 'content'}`;
  group.setAttribute('role', 'tabpanel');
  group.setAttribute('aria-labelledby', `tab-${index}`);
  const tab = document.createElement('button');
  tab.id = `tab-${index}`;
  tab.textContent = ['内容', '配色', '波纹', '背景', '点缀', '渲染'][index];
  tab.setAttribute('role', 'tab');
  tab.setAttribute('aria-controls', group.id);
  tab.addEventListener('click', () => selectCategory(index));
  tab.addEventListener('keydown', event => {
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % tabButtons.length;
    else if (event.key === 'ArrowLeft') next = (index + tabButtons.length - 1) % tabButtons.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabButtons.length - 1;
    else return;
    event.preventDefault(); selectCategory(next); tabButtons[next].focus();
  });
  tabButtons.push(tab);
  document.querySelector('#panel-tabs').append(tab);
  const legend = document.createElement('legend');
  legend.textContent = name;
  group.append(legend);
  for (const [key, label, min, max, step, unit, help] of fields) {
    const row = document.createElement('div');
    row.className = 'parameter';
    const caption = document.createElement('label');
    caption.htmlFor = `param-${key}`;
    caption.textContent = label;
    const number = document.createElement('input');
    Object.assign(number, { type: 'number', id: `number-${key}`, min, max, step });
    number.setAttribute('aria-label', `${label}数值`);
    const valueBox = document.createElement('div');
    valueBox.className = 'value-box';
    const suffix = document.createElement('span'); suffix.textContent = unit;
    valueBox.append(number, suffix);
    const input = document.createElement('input');
    Object.assign(input, { type: 'range', id: `param-${key}`, min, max, step });
    const description = document.createElement('p');
    description.id = `help-${key}`;
    description.textContent = help;
    description.hidden = true;
    const info = document.createElement('button');
    info.className = 'help-button'; info.textContent = '?';
    info.setAttribute('aria-label', `${label}说明`);
    info.setAttribute('aria-expanded', 'false');
    info.setAttribute('aria-controls', description.id);
    info.addEventListener('click', () => { description.hidden = !description.hidden; info.setAttribute('aria-expanded', String(!description.hidden)); });
    const labelBox = document.createElement('div'); labelBox.className = 'label-box'; labelBox.append(caption, info);
    input.setAttribute('aria-describedby', description.id);
    input.addEventListener('input', () => {
      settings[key] = Number(input.value);
      preset.value = 'custom';
      updateFields();
      dispatchEvent(new CustomEvent('settingschange', { detail: key }));
    });
    input.addEventListener('change', saveSettings);
    function commitNumber(finalize) {
      if (number.value.trim() === '' || !Number.isFinite(number.valueAsNumber)) {
        if (finalize) { updateFields(); status.textContent = '请输入有效数字。'; }
        return;
      }
      if (!finalize && !number.validity.valid) return;
      const clamped = Math.max(min, Math.min(max, number.valueAsNumber));
      settings[key] = Number((Math.round((clamped - min) / step) * step + min).toFixed(3));
      preset.value = 'custom'; updateFields();
      dispatchEvent(new CustomEvent('settingschange', { detail: key })); saveSettings();
    }
    number.addEventListener('input', () => commitNumber(false));
    number.addEventListener('change', () => commitNumber(true));
    number.addEventListener('keydown', event => { if (event.key === 'Enter') { commitNumber(true); number.blur(); } });
    panelFields.set(key, { input, number, unit });
    row.append(labelBox, valueBox, input, description);
    group.append(row);
  }
  document.querySelector('#parameters').append(group);
}
updateFields();
selectCategory(location.hash === '#group-tint' ? 4 : 0);
document.querySelector('#panel-more').addEventListener('click', event => {
  const tools = document.querySelector('#config-tools');
  tools.hidden = !tools.hidden;
  event.currentTarget.setAttribute('aria-expanded', String(!tools.hidden));
  if (!tools.hidden) tools.scrollIntoView({ block: 'nearest' });
});
preset.addEventListener('change', () => {
  if (!presets[preset.value]) return;
  const next = { ...settings };
  for (const [, fields] of parameterGroups.slice(0, 4)) for (const [key] of fields) next[key] = presets[preset.value][key];
  applySettings(next);
});
document.querySelector('#reset-settings').addEventListener('click', () => {
  preset.value = 'custom';
  applySettings(defaultSettings);
});
document.querySelector('#preview-wave').addEventListener('click', () => {
  if (reducedMotion) { status.textContent = '系统已启用减少动态效果，当前仅显示静态背景。'; return; }
  if (paused) pauseButton.click();
  ripples = [];
  addRipple(width * 0.24, height * 0.42);
  status.textContent = '已触发单次波纹；改变波纹参数会清除旧波纹。';
});
const jsonBox = document.querySelector('#settings-json');
document.querySelector('#export-settings').addEventListener('click', () => {
  jsonBox.value = JSON.stringify(settings, null, 2);
  jsonBox.focus();
  jsonBox.select();
  status.textContent = '已生成并选中 JSON，按 Ctrl+C 复制。';
});
document.querySelector('#import-settings').addEventListener('click', () => {
  try { applySettings(JSON.parse(jsonBox.value)); preset.value = 'custom'; }
  catch (error) { status.textContent = `导入失败：${error.message}`; }
});
