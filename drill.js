/* Recognition practice. Local data only; preferences are optional and never uploaded. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id), D = window.KanaDrill;
  const items = window.KANA_DATA.characters, categories = D.categories(items);
  const rangeKey = 'kana-study.drill.v1', preferenceKey = 'kana-study.preferences.v1';
  function read(key) { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } }
  function write(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} }
  const saved = read(rangeKey);
  let selected = new Set(saved && Array.isArray(saved.ids) && saved.ids.every(x => typeof x === 'string')
    ? D.pool(items, saved.ids).map(x => x.id) : D.stageIds(items, 1));
  let source = read(preferenceKey)?.audioSource === 'previous' ? 'previous' : 'djt';
  let deck = new D.Deck([]), current = null, assisted = false, locked = false, composing = false, timer = null;
  let stats = {total: 0, correct: 0, helped: 0, streak: 0, skipped: 0};
  const input = $('answer'), player = $('drill-player');
  let audioToken = 0;

  function message(text, tone = 'neutral') {
    $('feedback').textContent = text;
    $('feedback').dataset.tone = tone;
  }
  function renderStats() {
    for (const key of ['total', 'correct', 'helped', 'streak']) $('stat-' + key).textContent = stats[key];
    $('skip-count').textContent = `跳过 ${stats.skipped} 题`;
  }
  function stopAudio() { audioToken++; player.pause(); player.removeAttribute('src'); player.load(); $('audio-message').textContent = ''; }
  function audioChoice() {
    const choices = current ? window.KanaCore.audioChoices(current) : [];
    return choices.find(x => x.key === source) || choices[0];
  }
  function renderAudio() {
    $('drill-audio-source').value = source;
    $('drill-audio-fallback').hidden = !(current && source === 'previous' && !current.audioAlternative);
    $('drill-audio-credit').textContent = audioChoice()?.credit || '';
  }
  function unlock() { locked = false; input.removeAttribute('aria-busy'); $('check-answer').disabled = false; }
  function next(focus = true) {
    clearTimeout(timer); timer = null; unlock(); composing = false; stopAudio();
    current = deck.next(); assisted = false;
    input.value = ''; input.removeAttribute('aria-invalid');
    $('answer-hint').hidden = true; $('answer-hint').textContent = '';
    $('stroke-panel').hidden = true; $('stroke').setAttribute('aria-expanded', 'false'); $('stroke-image').removeAttribute('src');
    $('question-area').hidden = !current; $('empty-state').hidden = !!current;
    $('question').textContent = current?.char || '';
    if (current) $('question').dataset.id = current.id; else delete $('question').dataset.id;
    for (const id of ['listen', 'stroke', 'reveal', 'skip-question']) $(id).disabled = !current;
    renderAudio();
    if (focus && current) input.focus({preventScroll: true});
  }
  function complete() {
    if (locked || !current) return;
    locked = true; input.setAttribute('aria-busy', 'true'); $('check-answer').disabled = true;
    for (const id of ['listen', 'stroke', 'reveal', 'skip-question']) $(id).disabled = true;
    stats.total++;
    if (assisted) { stats.helped++; stats.streak = 0; }
    else { stats.correct++; stats.streak++; }
    message(`${current.char} · ${current.displayRomaji} ${assisted ? '已订正，继续下一题。' : '答对了！'}`, 'success');
    renderStats();
    // Brief feedback without replacing the input node or dismissing a mobile keyboard.
    timer = setTimeout(() => next(), 220);
  }
  function check(submitted = false) {
    if (!current || locked || composing) return;
    const result = D.check(current, input.value);
    if (result === 'correct') return complete();
    input.removeAttribute('aria-invalid');
    if (!submitted) { if (!$('answer-hint').hidden) return; message(''); return; }
    if (result === 'empty') { message('先输入罗马音，再按回车检查。'); return; }
    assisted = true; stats.streak = 0; renderStats();
    input.setAttribute('aria-invalid', 'true');
    message('还不对，再试一次；也可以查看答案。', 'error');
    input.focus({preventScroll: true}); input.select();
  }
  input.addEventListener('beforeinput', event => { if (locked) event.preventDefault(); });
  input.addEventListener('compositionstart', () => { composing = true; });
  input.addEventListener('compositionend', () => { composing = false; check(); });
  input.addEventListener('input', event => { if (!event.isComposing) check(); });
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter' && (event.isComposing || composing || event.keyCode === 229)) event.preventDefault();
  });
  $('answer-form').addEventListener('submit', event => { event.preventDefault(); check(true); });
  function help() { assisted = true; stats.streak = 0; renderStats(); }
  $('reveal').addEventListener('click', () => {
    if (!current || locked) return;
    help(); $('answer-hint').textContent = `读音：${D.answers(current).join(' / ')}。输入一个写法，巩固后继续。`;
    $('answer-hint').hidden = false; input.focus({preventScroll: true});
  });
  $('skip-question').addEventListener('click', () => {
    if (!current || locked) return;
    stats.total++; stats.skipped++; stats.streak = 0; renderStats();
    message(`已跳过 ${current.char}，读音是 ${current.displayRomaji}。`); next();
  });
  $('listen').addEventListener('click', async () => {
    if (!current || locked) return;
    const choice = audioChoice(); if (!choice) return;
    help(); stopAudio(); const token = audioToken;
    player.src = choice.src;
    try {
      await player.play();
      if (token === audioToken) $('audio-message').textContent = '正在播放…';
    } catch {
      if (token === audioToken) $('audio-message').textContent = '播放失败，请再点一次「听发音」。';
    }
  });
  player.addEventListener('ended', () => { $('audio-message').textContent = '播放完毕，可再听一次。'; });
  $('stroke').addEventListener('click', () => {
    if (!current || locked) return;
    const show = $('stroke-panel').hidden;
    if (show) { help(); $('stroke-image').src = current.gif; }
    else $('stroke-image').removeAttribute('src');
    $('stroke-panel').hidden = !show; $('stroke').setAttribute('aria-expanded', String(show));
  });
  $('drill-audio-source').addEventListener('change', () => {
    source = $('drill-audio-source').value;
    const stored = read(preferenceKey);
    write(preferenceKey, {...(stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {}), audioSource: source});
    stopAudio(); renderAudio();
  });
  window.addEventListener('storage', event => {
    if (event.key === preferenceKey) { source = read(preferenceKey)?.audioSource === 'previous' ? 'previous' : 'djt'; stopAudio(); renderAudio(); }
  });

  function renderOptions() {
    for (const group of categories) {
      const fieldset = document.createElement('fieldset'); fieldset.className = 'range-group';
      const legend = document.createElement('legend'); legend.textContent = group.label; fieldset.append(legend);
      const actions = document.createElement('div'); actions.className = 'group-actions';
      const count = document.createElement('span'); count.id = group.id + '-count'; actions.append(count);
      for (const [action, label] of [['all', '全选'], ['none', '清空']]) {
        const button = document.createElement('button'); button.type = 'button'; button.className = 'text-button'; button.textContent = label;
        button.setAttribute('aria-label', group.label + label); button.dataset.group = group.id; button.dataset.action = action; actions.append(button);
      }
      fieldset.append(actions);
      for (const row of group.rows) {
        const label = document.createElement('label'); label.className = 'range-row';
        const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.dataset.row = row.id;
        const name = document.createElement('span'); name.className = 'row-name'; name.textContent = row.label;
        const preview = document.createElement('span'); preview.className = 'row-preview'; preview.lang = 'ja'; preview.textContent = row.chars.join(' ');
        label.append(checkbox, name, preview); fieldset.append(label);
      }
      $('group-options').append(fieldset);
    }
  }
  function updateRange(focus = false, reset = true) {
    if (reset) stats = {total: 0, correct: 0, helped: 0, streak: 0, skipped: 0};
    const pool = D.pool(items, selected);
    $('resume-drill').disabled = pool.length === 0;
    deck.reset(pool); renderStats(); message(''); next(focus);
    $('pool-count').textContent = `当前范围 ${pool.length} 个假名`;
    $('range-summary').textContent = `已选 ${pool.length} 项`;
    for (const group of categories) {
      let count = 0, size = 0;
      for (const row of group.rows) {
        const n = row.ids.filter(id => selected.has(id)).length; count += n; size += row.ids.length;
        const checkbox = document.querySelector(`[data-row="${row.id}"]`);
        checkbox.checked = n === row.ids.length; checkbox.indeterminate = n > 0 && n < row.ids.length;
      }
      $(group.id + '-count').textContent = `${count} / ${size}`;
    }
    document.querySelectorAll('[data-stage]').forEach(button => {
      const ids = D.stageIds(items, Number(button.dataset.stage));
      button.setAttribute('aria-pressed', String(ids.length === selected.size && ids.every(id => selected.has(id))));
    });
    write(rangeKey, {ids: [...selected]});
  }
  $('group-options').addEventListener('change', event => {
    const row = categories.flatMap(g => g.rows).find(r => r.id === event.target.dataset.row); if (!row) return;
    row.ids.forEach(id => event.target.checked ? selected.add(id) : selected.delete(id)); updateRange();
  });
  $('group-options').addEventListener('click', event => {
    const button = event.target.closest('button[data-group]'); if (!button) return;
    const group = categories.find(g => g.id === button.dataset.group);
    group.rows.flatMap(r => r.ids).forEach(id => button.dataset.action === 'all' ? selected.add(id) : selected.delete(id)); updateRange();
  });
  document.querySelectorAll('[data-stage]').forEach(button => button.addEventListener('click', () => {
    selected = new Set(D.stageIds(items, Number(button.dataset.stage))); updateRange();
  }));
  $('clear-all').addEventListener('click', () => { selected.clear(); updateRange(); });
  $('start-hiragana').addEventListener('click', () => { selected = new Set(D.stageIds(items, 1)); updateRange(true); });
  $('reset-stats').addEventListener('click', () => { updateRange(true); message('本轮统计已重置。'); });
  $('range-link').addEventListener('click', () => { $('range-options').open = true; });
  $('resume-drill').addEventListener('click', () => {
    if (!current) return;
    $('range-options').open = false;
    input.scrollIntoView({block: 'center', behavior: 'instant'});
    input.focus({preventScroll: true});
  });
  renderOptions(); updateRange(false, false);
})();
