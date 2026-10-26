(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.KanaDrill = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const definitions = [
    ['hiragana-single', '平假名', 'hiragana', false],
    ['hiragana-yoon', '平假名拗音', 'hiragana', true],
    ['katakana-single', '片假名', 'katakana', false],
    ['katakana-yoon', '片假名拗音', 'katakana', true]
  ];
  function categories(items) {
    return definitions.map(([id, label, script, yoon]) => {
      const rows = [];
      for (const item of items.filter(x => x.script === script && (x.group === 'yoon') === yoon)) {
        const key = `${id}-${item.group}-${item.row}`;
        let row = rows.find(x => x.id === key);
        if (!row) { row = {id: key, label: item.rowLabel, ids: [], chars: []}; rows.push(row); }
        row.ids.push(item.id); row.chars.push(item.char);
      }
      return {id, label, rows};
    });
  }
  function stageIds(items, stage) {
    return categories(items).slice(0, Math.max(1, Math.min(4, stage))).flatMap(g => g.rows.flatMap(r => r.ids));
  }
  function pool(items, ids) {
    const selected = new Set(ids);
    return items.filter(x => selected.has(x.id));
  }
  const variants = {
    shi: ['si'], chi: ['ti'], tsu: ['tu'], fu: ['hu'], ji: ['zi'],
    di: ['ji', 'zi', 'dzi'], du: ['zu', 'dzu'], wo: ['o'],
    sha: ['sya'], shu: ['syu'], sho: ['syo'],
    cha: ['tya', 'cya'], chu: ['tyu', 'cyu'], cho: ['tyo', 'cyo'],
    ja: ['jya', 'zya'], ju: ['jyu', 'zyu'], jo: ['jyo', 'zyo']
  };
  const normalize = value => String(value ?? '').normalize('NFKC').trim().toLowerCase();
  function answers(item) {
    return [...new Set([item.romaji, item.audioReading, ...(variants[item.romaji] || [])].filter(Boolean))];
  }
  function checkAccepted(accepted, value) {
    const input = normalize(value);
    if (!input) return 'empty';
    if (accepted.includes(input)) return 'correct';
    return accepted.some(x => x.startsWith(input)) ? 'pending' : 'wrong';
  }
  const check = (item, value) => checkAccepted(answers(item), value);
  const readingKey = item => item.audioReading || ({wo:'o',di:'ji',du:'zu'}[item.romaji] || item.romaji);
  function listeningPool(items) {
    const seen = new Set();
    return items.filter(item => {const key=readingKey(item);if(seen.has(key))return false;seen.add(key);return true;});
  }
  function listeningAnswers(item, items) {
    return [...new Set(items.filter(x=>readingKey(x)===readingKey(item)).flatMap(answers))];
  }
  const checkListening = (item, value, items) => checkAccepted(listeningAnswers(item, items), value);
  class Deck {
    constructor(items, random = Math.random) { this.random = random; this.reset(items); }
    reset(items) { this.items = [...items]; this.bag = []; this.last = null; }
    next() {
      if (!this.items.length) return null;
      if (!this.bag.length) {
        this.bag = [...this.items];
        for (let i = this.bag.length - 1; i > 0; i--) {
          const j = Math.floor(this.random() * (i + 1));
          [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
        }
        const end = this.bag.length - 1;
        if (end > 0 && this.bag[end].id === this.last) [this.bag[0], this.bag[end]] = [this.bag[end], this.bag[0]];
      }
      const item = this.bag.pop(); this.last = item.id; return item;
    }
  }
  return {categories, stageIds, pool, answers, check, normalize, Deck, readingKey, listeningPool, listeningAnswers, checkListening};
});
