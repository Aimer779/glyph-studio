const defaultSettings = Object.freeze({ speed: 700, width: 13, softness: 0.65, step: 4,
  peak: 0.95, wake: 0.09, wakeLife: 0.7, decay: 2.5, hover: 0,
  idle: 0.15, threshold: 0.8, flow: 3, deformation: 0.2, resolution: 1.5,
  tint: 0.65, tintClusters: 2, tintGlyphs: 3, tintSpeed: 1, tintScale: 90, tintWave: 0.6, tintDuration: 1.7,
  textPreset: 'zhuangzi', customText: '', fontFamily: 'serif', textOrder: 'ordered', shuffleSeed: 2026,
  textColor: '#35383d', accentColor: '#3a65cd', bgMode: 'radial',
  bgStart: '#f8f9fc', bgMiddle: '#eef2fb', bgEnd: '#f8f9fc',
  bgAngle: 135, bgStop: 55, bgX: 55, bgY: 72 });
const parameterGroups = [
  ['点击波纹', [
    ['speed', '传播速度', 50, 1200, 10, 'px/s', '越大扩散越快；高速时可适当增加波前宽度。'],
    ['width', '波前宽度', 2, 80, 1, 'px', '越窄越利落，但高速下更容易闪烁。'],
    ['softness', '边缘柔和度', 0, 1, 0.05, '', '0 是硬边，1 是柔和波峰；提高后过渡更连贯。'],
    ['step', '传播分格', 0, 60, 1, 'px', '0 连续传播；18 接近字符格间距，会有刻意的顿挫感。'],
    ['peak', '波前深度', 0, 1, 0.01, '', '越大，波前文字越深。'],
    ['wake', '余波深度', 0, 0.35, 0.005, '', '波前经过后留下的浅色文字；0 关闭余波。'],
    ['wakeLife', '余波衰减时间', 0.1, 2.5, 0.05, 's', '经过这段时间，余波降至约 37%；越大拖尾越长。'],
    ['decay', '扩散衰减', 0, 4, 0.05, '/s', '越大，外圈随传播越快变淡。2.5 时传播 1 秒后约剩 8% 强度；不改变速度。'],
    ['hover', '鼠标移动强度', 0, 0.2, 0.005, '', '0 关闭移动反馈，方便单独观察点击。']
  ]],
  ['静默水面', [
    ['idle', '背景深度', 0, 0.3, 0.005, '', '越大，静默文字越清晰。'],
    ['threshold', '区块稀疏度', 0.2, 0.95, 0.01, '', '越大，云团显现面积越小、间隙越大；不控制移动速度。'],
    ['flow', '明暗迁移速度', 0, 5, 0.1, '×', '云状明暗各自缓慢迁移；0 冻结。字形位置始终固定。'],
    ['deformation', '轮廓变化', 0, 1.5, 0.05, '', '控制云团舒展、收缩和边缘变化；0 保持轮廓，字形不移动。']
  ]],
  ['色彩点缀', [
    ['tint', '点缀强度', 0, 1, 0.05, '', '控制零星彩色字的色彩和可见度；0 关闭。颜色在“配色”页设置。'],
    ['tintClusters', '簇的数量', 0, 12, 1, '簇', '每轮目标簇数；0 关闭。背景显现面积不足时实际数量会减少。'],
    ['tintGlyphs', '每簇字数', 1, 12, 1, '字', '直接设置每簇字数；3 字及以上保持不共线，数量多时自动扩大邻字搜索范围。'],
    ['tintSpeed', '点缀动画速度', 0, 3, 0.1, '×', '点缀动画总速度；越快停留越短，0 冻结。'],
    ['tintDuration', '点缀停留时间', 0.8, 4, 0.1, 's', '1 倍速度下从出现到消失的时长，含淡入淡出；默认 1.7 秒。'],
    ['tintScale', '簇内离散范围', 30, 240, 10, '', '控制同簇文字的分散范围，不改变每簇字数。'],
    ['tintWave', '波纹染色强度', 0, 1, 0.05, '', '增强浅色余波的点缀颜色；深色波前保留基础字色。']
  ]],
  ['渲染', [
    ['resolution', '渲染倍率上限', 1, 2.5, 0.25, '×', '降低可减少绘制负担；提高可改善高密度屏幕清晰度。']
  ]],
  ['内容', []],
  ['配色', [
    ['bgAngle', '渐变角度', 0, 360, 1, '°', '线性渐变的方向。'],
    ['bgStop', '中间色位置', 10, 90, 1, '%', '控制中间色在渐变中的位置。'],
    ['bgX', '渐变中心 X', 0, 100, 1, '%', '径向渐变中心的水平位置。'],
    ['bgY', '渐变中心 Y', 0, 100, 1, '%', '径向渐变中心的垂直位置。']
  ]]
];
const settings = { ...defaultSettings };
const settingsKey = 'xiaoyaoyou-settings-v1';
function validateSettings(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('需要参数 JSON 对象');
  const result = { ...defaultSettings };
  for (const [, fields] of parameterGroups) for (const [key, , min, max] of fields) {
    if (!(key in value)) continue;
    if (typeof value[key] !== 'number' || !Number.isFinite(value[key]) || value[key] < min || value[key] > max) {
      throw new Error(`${key} 必须在 ${min}～${max} 之间`);
    }
    if (['tintClusters', 'tintGlyphs'].includes(key) && !Number.isInteger(value[key])) throw new Error(`${key} 必须为整数`);
    result[key] = value[key];
  }
  for (const key of ['textColor', 'accentColor', 'bgStart', 'bgMiddle', 'bgEnd']) {
    if (!(key in value)) continue;
    if (typeof value[key] !== 'string' || !/^#[0-9a-f]{6}$/i.test(value[key])) throw new Error(`${key} 需要 #RRGGBB 颜色`);
    result[key] = value[key].toLowerCase();
  }
  const choices = { textPreset: ['zhuangzi', 'ascii', 'english', 'japanese', 'custom'], fontFamily: ['serif', 'sans', 'mono'], bgMode: ['linear', 'radial'], textOrder: ['ordered', 'shuffled'] };
  for (const [key, values] of Object.entries(choices)) {
    if (!(key in value)) continue;
    if (!values.includes(value[key])) throw new Error(`${key} 选项无效`);
    result[key] = value[key];
  }
  if ('shuffleSeed' in value) {
    if (!Number.isInteger(value.shuffleSeed) || value.shuffleSeed < 0 || value.shuffleSeed > 4294967295) throw new Error('随机种子必须为 32 位非负整数');
    result.shuffleSeed = value.shuffleSeed;
  }
  if ('customText' in value) {
    if (typeof value.customText !== 'string' || value.customText.length > 4000) throw new Error('内容过长或格式无效，请缩短文字后再试');
    result.customText = value.customText;
  }
  if (result.textPreset === 'custom') {
    const segments = Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(result.customText.normalize('NFC')), item => item.segment)
      .filter(glyph => !/^[\s\p{C}]+$/u.test(glyph));
    if (!segments.length) throw new Error('请至少输入一个可见字符');
    if (new Set(segments).size > 512) throw new Error('自定义内容最多使用 512 种不同字形');
  }
  return result;
}
try {
  const saved = localStorage.getItem(settingsKey);
  if (saved) Object.assign(settings, validateSettings(JSON.parse(saved)));
} catch { /* Local-file storage may be unavailable; defaults still work. */ }
