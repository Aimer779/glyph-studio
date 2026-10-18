// 《庄子·逍遥游》节选；字符按原文顺序铺排，不随机替换。
const passage = `北冥有鱼，其名为鲲。鲲之大，不知其几千里也。化而为鸟，其名为鹏。鹏之背，不知其几千里也；怒而飞，其翼若垂天之云。是鸟也，海运则将徙于南冥。南冥者，天池也。
齐谐者，志怪者也。谐之言曰：鹏之徙于南冥也，水击三千里，抟扶摇而上者九万里，去以六月息者也。野马也，尘埃也，生物之以息相吹也。天之苍苍，其正色邪？其远而无所至极邪？其视下也，亦若是则已矣。
且夫水之积也不厚，则其负大舟也无力。覆杯水于坳堂之上，则芥为之舟；置杯焉则胶，水浅而舟大也。风之积也不厚，则其负大翼也无力。故九万里，则风斯在下矣，而后乃今培风；背负青天，而莫之夭阏者，而后乃今将图南。
蜩与学鸠笑之曰：我决起而飞，抢榆枋而止，时则不至，而控于地而已矣，奚以之九万里而南为？适莽苍者，三餐而反，腹犹果然；适百里者，宿舂粮；适千里者，三月聚粮。之二虫又何知！小知不及大知，小年不及大年。奚以知其然也？朝菌不知晦朔，蟪蛄不知春秋，此小年也。楚之南有冥灵者，以五百岁为春，五百岁为秋；上古有大椿者，以八千岁为春，八千岁为秋。而彭祖乃今以久特闻，众人匹之，不亦悲乎！
汤之问棘也是已。穷发之北，有冥海者，天池也。有鱼焉，其广数千里，未有知其修者，其名为鲲。有鸟焉，其名为鹏，背若泰山，翼若垂天之云，抟扶摇羊角而上者九万里，绝云气，负青天，然后图南，且适南冥也。斥鴳笑之曰：彼且奚适也？我腾跃而上，不过数仞而下，翱翔蓬蒿之间，此亦飞之至也。而彼且奚适也？此小大之辩也。
故夫知效一官，行比一乡，德合一君，而征一国者，其自视也，亦若此矣。而宋荣子犹然笑之。且举世誉之而不加劝，举世非之而不加沮，定乎内外之分，辩乎荣辱之境，斯已矣。彼其于世，未数数然也。虽然，犹有未树也。夫列子御风而行，泠然善也，旬有五日而后反。彼于致福者，未数数然也。此虽免乎行，犹有所待者也。若夫乘天地之正，而御六气之辩，以游无穷者，彼且恶乎待哉！故曰：至人无己，神人无功，圣人无名。`;
const textPresets = {
  zhuangzi: { label: '中文 · 逍遥游', font: 'serif', text: passage.replace(/[\s，。；：？！、]/g, '') },
  ascii: { label: 'ASCII · 符号', font: 'mono', text: '.:+*#@%=-/\\|[]{}<>0123456789' },
  english: { label: 'English · Still water', font: 'serif', text: 'Still water reflects the sky. Light moves through the quiet spaces between words. Every ripple carries a moment, then returns to silence.' },
  japanese: { label: '日本語 · 光と水', font: 'sans', text: '静かな水面に光が揺れる。風はゆっくりと流れ、文字のあいだを通り抜ける。小さな波紋が広がり、また静けさに戻る。' }
};
const fontFamilies = {
  serif: '"Songti SC", "SimSun", "Yu Mincho", "Times New Roman", serif',
  sans: '"Segoe UI", "Microsoft YaHei", "Yu Gothic", sans-serif',
  mono: '"Cascadia Mono", Consolas, "Yu Gothic", monospace'
};
const graphemeSegmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
function splitGlyphs(text) {
  return Array.from(graphemeSegmenter.segment(text.normalize('NFC')), part => part.segment)
    .filter(glyph => !/^[\s\p{C}]+$/u.test(glyph));
}
function configuredText(config) {
  return config.textPreset === 'custom' ? config.customText : textPresets[config.textPreset].text;
}
function arrangedGlyphs(config) {
  const result = splitGlyphs(configuredText(config));
  if (config.textOrder !== 'shuffled') return result;
  // Seeded Fisher–Yates preserves repeated characters and keeps redraws stable.
  let state = config.shuffleSeed >>> 0;
  const random = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
const palettePresets = [
  { name: '雾白', colors: ['#f8f9fc', '#eef2fb', '#f8f9fc'], text: '#35383d', accent: '#3a65cd', mode: 'radial' },
  { name: '墨夜', colors: ['#101827', '#1e304a', '#171c30'], text: '#d5dceb', accent: '#91bcff', mode: 'linear' },
  { name: '青瓷', colors: ['#edf4f0', '#d9eae3', '#f6f4e9'], text: '#35594e', accent: '#279986', mode: 'linear' },
  { name: '暮紫', colors: ['#f5edf3', '#e8def3', '#edf0fa'], text: '#5b4a68', accent: '#a366b5', mode: 'linear' },
  { name: '暖砂', colors: ['#faf2e7', '#efdfc9', '#f4e9e2'], text: '#645344', accent: '#bf704f', mode: 'radial' }
];
function backgroundGradient(config) {
  const stops = `${config.bgStart} 0%, ${config.bgMiddle} ${config.bgStop}%, ${config.bgEnd} 100%`;
  return config.bgMode === 'linear'
    ? `linear-gradient(${config.bgAngle}deg in oklab, ${stops})`
    : `radial-gradient(ellipse at ${config.bgX}% ${config.bgY}% in oklab, ${stops})`;
}
