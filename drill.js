/* Recognition practice. Local data only; preferences are optional and never uploaded. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id), D = window.KanaDrill;
  const items = window.KANA_DATA.characters, categories = D.categories(items);
  const rangeKey = 'kana-study.drill.v1', preferenceKey = 'kana-study.preferences.v1', optionsKey = 'kana-study.drill-options.v1';
  function read(key) { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } }
  function write(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} }
  const saved = read(rangeKey), options = read(optionsKey);
  let selected = new Set(saved && Array.isArray(saved.ids) && saved.ids.every(x => typeof x === 'string')
    ? D.pool(items, saved.ids).map(x => x.id) : D.stageIds(items, 1));
  let source = read(preferenceKey)?.audioSource === 'previous' ? 'previous' : 'djt';
  let mode = options?.mode === 'listen' ? 'listen' : 'read';
  let afterAudio = options?.afterAudio !== false, focused = options?.focused === true;
  let deck = new D.Deck([]), current = null, assisted = false, locked = false, composing = false, timer = null;
  let listeningActive = false, heard = false, revealed = false, generation = 0, playbackSerial = 0;
  let stats = {total: 0, correct: 0, helped: 0, streak: 0, skipped: 0};
  const input = $('answer'), player = $('drill-player'), playback = new window.KanaAudio.AudioPlayback(player);
  function saveOptions() { write(optionsKey, {mode, afterAudio, focused}); }
  function message(text, tone = 'neutral') { $('feedback').textContent = text; $('feedback').dataset.tone = tone; }
  function renderStats() {
    for (const key of ['total', 'correct', 'helped', 'streak']) $('stat-' + key).textContent = stats[key];
    $('skip-count').textContent = `跳过 ${stats.skipped} 题`;
  }
  function stopAudio() { playbackSerial++; playback.cancel(); $('audio-message').textContent = ''; $('retry-audio').hidden = true; }
  function audioChoice() {
    const choices = current ? window.KanaCore.audioChoices(current) : [];
    return choices.find(x => x.key === source) || choices[0];
  }
  function renderAudio() {
    $('drill-audio-source').value = source;
    $('drill-audio-fallback').hidden = !(current && source === 'previous' && !current.audioAlternative);
    $('drill-audio-credit').textContent = audioChoice()?.credit || '';
  }
  function renderMode() {
    document.querySelectorAll('[data-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mode === mode)));
    $('after-correct-audio').checked = afterAudio;
    $('mode-note').textContent = mode === 'listen' ? '先点播放本题，随后每题自动播放；同音字合并判分，不要求靠声音猜拼写。' : '答对后听完整发音再换题；关闭开关可快速连练。';
    $('stats-help').textContent = mode === 'listen' ? '仅统计本轮；听题与重播不算提示。看笔顺、查看答案或答错后订正，单独计数。' : '仅统计本轮；听音、看笔顺、查看答案或答错后订正，不计入独立答对。';
    $('answer-help').textContent = afterAudio ? '答对后播放完整录音再换题；按回车检查。' : '答对自动换题；不确定时按回车检查。';
  }
  function renderFocus() {
    document.body.classList.toggle('is-focused', focused);
    $('focus-toggle').textContent = focused ? '退出专注' : '进入专注';
    $('focus-toggle').setAttribute('aria-pressed', String(focused));
  }
  function renderQuestion() {
    const visible = mode === 'read' || revealed;
    $('question').hidden = !visible;
    $('question').textContent = visible ? current?.char || '' : '';
    $('listening-prompt').hidden = mode !== 'listen';
    $('listen').hidden = mode === 'listen';
    $('listen-question').textContent = heard ? '再听一次' : '播放本题';
  }
  function answerLabel() {
    if (mode === 'read') return `${current.char} · ${current.displayRomaji}`;
    const equivalents = items.filter(x => x.script === current.script && D.readingKey(x) === D.readingKey(current)).map(x => x.char);
    return `${D.readingKey(current)} · ${equivalents.join(' / ')}`;
  }
  function unlock() { locked = false; input.removeAttribute('aria-busy'); $('check-answer').disabled = false; $('advance-question').hidden = true; }
  function next(focus = true) {
    generation++;clearTimeout(timer);timer = null;stopAudio();unlock();composing = false;
    current = deck.next();assisted = false;heard = false;revealed = false;
    input.value = '';input.removeAttribute('aria-invalid');
    $('answer-hint').hidden = true;$('answer-hint').textContent = '';
    $('stroke-panel').hidden = true;$('stroke').setAttribute('aria-expanded', 'false');$('stroke-image').removeAttribute('src');
    $('question-area').hidden = !current;$('empty-state').hidden = !!current;
    if (current) $('question').dataset.id = current.id; else delete $('question').dataset.id;
    for (const id of ['listen', 'listen-question', 'stroke', 'reveal', 'skip-question']) $(id).disabled = !current;
    renderQuestion();renderAudio();
    if (focus && current) input.focus({preventScroll: true});
    if (current && mode === 'listen' && listeningActive) requestSound('prompt');
  }
  async function requestSound(purpose) {
    if (!current) return;
    const choice = audioChoice();if (!choice) return;
    stopAudio();const serial = playbackSerial, version = generation;
    $('audio-message').textContent = '正在加载发音…';
    if (purpose === 'complete') { $('advance-question').hidden = false; $('advance-question').textContent = '直接下一题'; }
    const result = await playback.play(choice.src, () => {
      if (serial !== playbackSerial || version !== generation) return;
      $('audio-message').textContent = purpose === 'complete' ? '答对了，听完发音进入下一题…' : '正在播放…';
      if (purpose === 'prompt') { heard = true; renderQuestion(); }
      if (purpose === 'hint') help();
    });
    if (serial !== playbackSerial || version !== generation || result === 'cancelled') return;
    if (result === 'ended') {
      if (purpose === 'complete') next();
      else $('audio-message').textContent = '播放完毕，可再听一次。';
    } else {
      $('audio-message').textContent = result === 'timeout' ? '发音加载超时，可以重试或跳过本题。' : '播放失败，可以重试，或继续下一题。';
      $('retry-audio').hidden = false;
      $('retry-audio').dataset.purpose = purpose;
      if (purpose === 'complete') $('advance-question').textContent = '继续下一题';
    }
  }
  function complete() {
    if (locked || !current) return;
    locked = true;input.setAttribute('aria-busy', 'true');$('check-answer').disabled = true;
    for (const id of ['listen', 'listen-question', 'stroke', 'reveal', 'skip-question']) $(id).disabled = true;
    stats.total++;
    if (assisted) { stats.helped++;stats.streak = 0; } else { stats.correct++;stats.streak++; }
    message(`${answerLabel()} ${assisted ? '已订正，继续下一题。' : '答对了！'}`, 'success');renderStats();
    if (afterAudio) requestSound('complete');
    else { stopAudio();timer = setTimeout(() => next(), 220); }
  }
  function check(submitted = false) {
    if (!current || locked || composing) return;
    if (mode === 'listen' && !heard && !assisted) { message('请先播放本题录音，再输入听到的读音。');return; }
    const result = mode === 'listen' ? D.checkListening(current, input.value, items) : D.check(current, input.value);
    if (result === 'correct') return complete();
    input.removeAttribute('aria-invalid');
    if (!submitted) { if (!$('answer-hint').hidden) return; message(''); return; }
    if (result === 'empty') { message('先输入罗马音，再按回车检查。'); return; }
    assisted = true;stats.streak = 0;renderStats();input.setAttribute('aria-invalid', 'true');
    message('还不对，再试一次；也可以查看答案。', 'error');input.focus({preventScroll: true});input.select();
  }
  input.addEventListener('beforeinput', event => { if (locked) event.preventDefault(); });
  input.addEventListener('compositionstart', () => { composing = true; });
  input.addEventListener('compositionend', () => { composing = false;check(); });
  input.addEventListener('input', event => { if (!event.isComposing) check(); });
  input.addEventListener('keydown', event => { if (event.key === 'Enter' && (event.isComposing || composing || event.keyCode === 229)) event.preventDefault(); });
  $('answer-form').addEventListener('submit', event => { event.preventDefault();check(true); });
  function help() { assisted = true;stats.streak = 0;renderStats(); }
  $('reveal').addEventListener('click', () => {
    if (!current || locked) return;
    help();revealed = true;renderQuestion();
    const accepted = mode === 'listen' ? D.listeningAnswers(current, items) : D.answers(current);
    $('answer-hint').textContent = `读音：${accepted.join(' / ')}。输入一个写法，巩固后继续。`;
    $('answer-hint').hidden = false;input.focus({preventScroll: true});
  });
  $('skip-question').addEventListener('click', () => {
    if (!current || locked) return;
    stats.total++;stats.skipped++;stats.streak = 0;renderStats();message(`已跳过，答案是 ${answerLabel()}。`);next();
  });
  $('listen').addEventListener('click', () => { if (current && !locked) requestSound('hint'); });
  $('listen-question').addEventListener('click', () => { if (current && !locked) { listeningActive = true;requestSound('prompt'); } });
  $('retry-audio').addEventListener('click', () => requestSound($('retry-audio').dataset.purpose));
  $('advance-question').addEventListener('click', () => { if (locked) next(); });
  $('stroke').addEventListener('click', () => {
    if (!current || locked) return;
    const show = $('stroke-panel').hidden;
    if (show) { help();$('stroke-image').src = current.gif; } else $('stroke-image').removeAttribute('src');
    $('stroke-panel').hidden = !show;$('stroke').setAttribute('aria-expanded', String(show));
  });
  function changeAudioSource(value) {
    source = value;stopAudio();renderAudio();
    if (locked && afterAudio) requestSound('complete');
    else if (mode === 'listen') { heard = false;renderQuestion();if (listeningActive) requestSound('prompt'); }
  }
  $('drill-audio-source').addEventListener('change', () => {
    const stored = read(preferenceKey), value = $('drill-audio-source').value;
    write(preferenceKey, {...(stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {}), audioSource: value});
    changeAudioSource(value);
  });
  window.addEventListener('storage', event => { if (event.key === preferenceKey) changeAudioSource(read(preferenceKey)?.audioSource === 'previous' ? 'previous' : 'djt'); });
  document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => {
    if (mode === button.dataset.mode) return;
    mode = button.dataset.mode;saveOptions();renderMode();updateRange();
  }));
  $('after-correct-audio').addEventListener('change', () => {
    afterAudio = $('after-correct-audio').checked;saveOptions();renderMode();
    if (locked && !afterAudio) next();
  });
  $('focus-toggle').addEventListener('click', () => { focused = !focused;saveOptions();renderFocus(); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && focused && !event.isComposing && !composing) { focused = false;saveOptions();renderFocus();$('focus-toggle').focus(); }
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
    listeningActive = false;
    const questions = mode === 'listen' ? D.listeningPool(pool) : pool;
    deck.reset(questions); renderStats(); message(''); next(focus);
    $('pool-count').textContent = mode === 'listen' ? `当前范围 ${pool.length} 个假名 · ${questions.length} 种读音` : `当前范围 ${pool.length} 个假名`;
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
  renderMode(); renderFocus(); renderOptions(); updateRange(false, false);
})();
