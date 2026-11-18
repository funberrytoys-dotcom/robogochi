'use strict';

// On-device vocabulary. Each robot remembers two successful echoes per card.
// A future local model can choose a reply from the currently learned candidates.
const SpeechLab = (() => {
  const groups = ['Буквы', 'Слоги', 'Слова'];
  const cards = [
    { id: 'a', label: 'А', group: 0 }, { id: 'o', label: 'О', group: 0 }, { id: 'u', label: 'У', group: 0 },
    { id: 'ma', label: 'Ма', group: 1 }, { id: 'mu', label: 'Му', group: 1 }, { id: 'pa', label: 'Па', group: 1 },
    { id: 'nyam', label: 'Ням', group: 2, contexts: ['feed'], picture: 'food' },
    { id: 'privet', label: 'Привет', group: 2, contexts: ['hello', 'wake'], picture: 'robots' },
    { id: 'mama', label: 'Мама', group: 2, contexts: ['pet'], picture: 'heart' },
    { id: 'myach', label: 'Мяч', group: 2, contexts: ['ball', 'play'], picture: 'fun' },
    { id: 'bayu', label: 'Баю-бай', group: 2, contexts: ['sleep'], picture: 'sleep' },
    { id: 'chisto', label: 'Чисто', group: 2, contexts: ['wash'], picture: 'clean' },
    { id: 'ura', label: 'Ура', group: 2, contexts: ['play', 'wake'], picture: 'dance' },
    { id: 'poka', label: 'Пока', group: 2, contexts: ['sleep'], picture: 'sleep' },
  ];
  const situations = [
    { id: 'meal', name: 'За едой', icon: 'food', contexts: ['feed'] },
    { id: 'game', name: 'В игре', icon: 'fun', contexts: ['play', 'ball'] },
    { id: 'greeting', name: 'При встрече', icon: 'robots', contexts: ['hello', 'wake'] },
    { id: 'care', name: 'При заботе', icon: 'heart', contexts: ['pet', 'wash', 'sleep'] },
  ];
  const lock = '<svg class="sp-lock" viewBox="0 0 18 18" aria-hidden="true"><path d="M5.5 8V5.8a3.5 3.5 0 0 1 7 0V8" fill="none" stroke="currentColor" stroke-width="2"/><rect x="3.5" y="7" width="11" height="8.5" rx="2.5" fill="currentColor"/></svg>';
  const ears = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9h4l5-4v14l-5-4H3z" fill="currentColor"/><path d="M15 8q5 4 0 8m3-11q8 7 0 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  const groupHint = ['Начни с гласных.', 'Сложи звуки вместе.', 'Подари другу слово.'];
  const stages = ['Пищит', 'Поёт гласные', 'Болтает слогами', 'Говорит слова'];
  const byId = new Map(cards.map(card => [card.id, card]));
  let group = 0, current = null, phase = 'library', answerOptions = [];
  let previousOrder = '', currentAudio = null, previousFocus = null;
  let cancelSelection = null;
  let selector = null, lastReply = null, robotId = null, rendered = false;
  const replyTimes = new Map();

  function memory() {
    const s = Game.s;
    if (!s.speechBook || typeof s.speechBook !== 'object') s.speechBook = {};
    const id = Game.def.id;
    if (!s.speechBook[id] || typeof s.speechBook[id] !== 'object') s.speechBook[id] = {};
    return s.speechBook[id];
  }

  function score(card) {
    const value = memory()[card.id];
    return value === 1 || value === 2 ? value : 0;
  }

  function level() {
    const mastered = cards.filter(card => score(card) === 2);
    return mastered.reduce((highest, card) => Math.max(highest, card.group + 1), 0);
  }
  function available(g) { return g === 0 || cards.some(card => card.group === g - 1 && score(card) === 2); }
  function stop() {
    if (cancelSelection) cancelSelection();
    if (currentAudio) { currentAudio.pause(); currentAudio = null; }
  }
  function play(card, asRobot) {
    stop();
    if (!Game.s.sound || document.hidden) return;
    Snd.init();
    const clip = window.ROBO_VOICE && window.ROBO_VOICE[card.id];
    if (!clip) return;
    const audio = new Audio(clip);
    currentAudio = audio;
    // The post-processed sample already has its own toy timbre. Slight speed
    // variations retain intelligibility and make the robots sound different.
    if (asRobot) audio.playbackRate = Math.max(0.91, Math.min(1.16, (Game.def.voice.speed || 1)));
    audio.volume = 0.87;
    audio.onended = () => { if (currentAudio === audio) currentAudio = null; };
    audio.play().catch(() => { if (currentAudio === audio) currentAudio = null; });
    if (asRobot && Room.robot) {
      const r = Room.robot;
      r.face('happy', 0.9);
      const duration = card.group === 2 ? 0.55 : 0.33;
      for (let t = 0; t < duration; t += 0.16) r.talk.push({ t0: r.t + t, t1: r.t + t + 0.10 });
    }
  }

  function shuffledChoices(card) {
    const others = cards.filter(other => other.group === card.group && other !== card);
    function shuffle(items) {
      for (let index = items.length - 1; index > 0; index--) {
        const pick = Math.floor(Math.random() * (index + 1));
        [items[index], items[pick]] = [items[pick], items[index]];
      }
      return items;
    }
    const options = shuffle([card, ...shuffle(others).slice(0, 2)]);
    if (options.map(item => item.id).join(',') === previousOrder) options.push(options.shift());
    previousOrder = options.map(item => item.id).join(',');
    return options;
  }

  function lamp(count) {
    return '<span class="sp-lamps" aria-label="Повторений ' + count + ' из 2"><i class="' + (count > 0 ? 'lit' : '') + '"></i><i class="' + (count > 1 ? 'lit' : '') + '"></i></span>';
  }

  function linkedSituation(card) {
    const links = memory().links;
    return links && situations.find(situation => situation.id === links[card.id]);
  }
  function linkControls(card) {
    const linked = linkedSituation(card);
    const buttons = situations.map(situation => {
      const chosen = linked === situation;
      return '<button data-link="' + situation.id + '" aria-pressed="' + chosen + '">' +
        '<span>' + ICON[situation.icon] + '</span>' + situation.name + (chosen ? ' ✓' : '') + '</button>';
    }).join('');
    return '<div class="sp-associate"><h4>Когда мне так говорить?</h4><div>' + buttons + '</div></div>';
  }

  function focusIn(selector) {
    const target = UI.$('sheetBody').querySelector(selector);
    if (target) target.focus({ preventScroll: true });
  }

  function render(focusSelector) {
    const body = UI.$('sheetBody');
    const sheet = UI.$('sheet');
    sheet.classList.add('speech-open');
    const st = level();
    const learned = cards.filter(card => score(card) === 2).length;
    const active = current && phase !== 'library';
    const signal = active && (phase === 'echo' || phase === 'done');
    let activity;
    if (!active) {
      const tabs = groups.map((name, g) => '<button data-group="' + g + '" aria-pressed="' + (g === group) + '"' + (available(g) ? '' : ' disabled') + '>' + name + (available(g) ? '' : ' ' + lock) + '</button>').join('');
      const choices = cards.filter(card => card.group === group).map(card => {
        const known = score(card);
        const badge = card.picture ? '<span class="sp-picture">' + ICON[card.picture] + '</span>' : '';
        return '<button class="sp-card sp-g' + group + (known === 2 ? ' sp-known' : '') + '" data-card="' + card.id + '" aria-label="' + card.label + (known === 2 ? ', выучено' : ', выбрать') + '">' + badge + '<strong>' + card.label + '</strong>' + lamp(known) + '</button>';
      }).join('');
      const next = !available(1) ? 'Выучи одну букву, чтобы открыть слоги.' : !available(2) ? 'Выучи один слог, чтобы открыть слова.' : 'Две искорки — и карточка в памяти.';
      activity = '<div class="sp-tabs" aria-label="Виды карточек">' + tabs + '</div><div class="sp-library"><h3>Чему научим?</h3><p>' + groupHint[group] + '</p><div class="sp-grid">' + choices + '</div><p class="sp-note">' + next + '</p></div>';
    } else {
      let controls;
      const hear = '<button class="sp-listen" data-do="listen">' + ears + ' Послушать</button>';
      if (phase === 'echo') {
        controls = '<div class="sp-task">Найди эту карточку для робота</div><div class="sp-choices">' +
          answerOptions.map(c => '<button data-answer="' + c.id + '">' + c.label + '</button>').join('') + '</div>' + hear;
      } else if (phase === 'again') {
        controls = '<div class="sp-task">Получилось! Закрепим ещё раз?</div><button class="sp-main" data-do="again">Повторить вместе</button>';
      } else {
        const newly = phase === 'done';
        const message = newly ? (current.group === 0 && !cards.some(c => c.group === 1 && score(c) > 0) ? 'Буква в памяти! Теперь можно учить слоги.' : current.group === 1 && !cards.some(c => c.group === 2 && score(c) > 0) ? 'Слог в памяти! Теперь можно учить слова.' : 'Запомнил! Теперь скажу сам.') : 'Эта карточка уже в моей памяти.';
        controls = '<div class="sp-task">' + message + '</div><button class="sp-main" data-do="repeat">' + ears + ' Скажи ещё!</button>';
      }
      if (current.group === 2 && score(current) === 2) controls += linkControls(current);
      activity = '<div class="sp-exercise"><div class="sp-ex-top"><button data-do="library" class="sp-back">‹ К карточкам</button>' + lamp(score(current)) + '</div><div class="sp-flash sp-g' + current.group + '"><small>' + ['Буква','Слог','Слово'][current.group] + '</small><strong>' + current.label + '</strong></div>' + controls + '<p class="sp-feedback" role="status"></p></div>';
    }

    body.innerHTML = '<section class="sp-panel"><div class="sp-radio' + (signal ? ' sp-signal' : '') + '"><canvas width="140" height="144" aria-hidden="true"></canvas><div><small>Голос робота</small><h3>' + stages[st] + '</h3><span class="sp-spectrum" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span></div><div class="sp-count"><b>' + learned + '</b><small>из ' + cards.length + '</small></div></div>' + activity + '</section>';
    const preview = body.querySelector('canvas').getContext('2d');
    preview.scale(2, 2);
    drawPreviewRobot(preview, Game.def, 70, 72, Game.s.hat, true);
    body.querySelector('.sp-panel').addEventListener('click', handle);
    rendered = true;
    if (focusSelector) focusIn(focusSelector);
  }

  function begin(card) {
    current = card;
    const learned = score(card) === 2;
    phase = learned ? 'review' : 'echo';
    if (!learned) answerOptions = shuffledChoices(card);
    render(learned ? '[data-do="repeat"]' : '[data-answer]');
    play(card, learned);
  }

  function handle(event) {
    const button = event.target.closest('button');
    if (!button || button.disabled || robotId !== Game.def.id || UI.sheetKind !== 'speech') return;
    const d = button.dataset;
    if (d.group !== undefined) {
      group = Number(d.group); current = null; phase = 'library';
      render('[data-group="' + group + '"]');
    } else if (d.card) {
      begin(byId.get(d.card));
    } else if (d.answer && phase === 'echo') {
      if (d.answer !== current.id) {
        Snd.sfx.plop();
        button.disabled = true;
        UI.$('sheetBody').querySelector('.sp-feedback').textContent = 'Попробуй найти «' + current.label + '».';
        return;
      }
      const count = Math.min(2, score(current) + 1);
      memory()[current.id] = count;
      phase = count === 2 ? 'done' : 'again';
      if (count === 2) { Game.hint('speech'); Game.stat('speechLearned'); Game.friend(3); Game.need('fun', 3); }
      Game.save();
      render(count === 2 ? '[data-do="repeat"]' : '[data-do="again"]');
      play(current, true);
    } else if (d.link && current && current.group === 2 && score(current) === 2) {
      const situation = situations.find(candidate => candidate.id === d.link);
      if (!situation) return;
      const book = memory();
      if (!book.links || typeof book.links !== 'object') book.links = {};
      const removing = linkedSituation(current) === situation;
      if (removing) delete book.links[current.id];
      else book.links[current.id] = situation.id;
      Game.save();
      render('[data-link="' + situation.id + '"]');
      UI.$('sheetBody').querySelector('.sp-feedback').textContent = removing ? 'Вернули привычный сигнал.' : 'Договорились! ' + situation.name + ' скажу «' + current.label + '».';
      if (!removing) play(current, true);
    } else if (d.do === 'library') {
      const key = current.id;
      if (phase === 'done' && group < 2 && available(group + 1)) group++;
      current = null; phase = 'library';
      render(); focusIn(byId.get(key).group === group ? '[data-card="' + key + '"]' : '[data-card]');
    } else if (d.do === 'again') begin(current);
    else if (d.do === 'repeat' || d.do === 'listen') play(current, d.do === 'repeat');
  }

  function open() {
    Snd.init(); stop();
    previousFocus = document.activeElement;
    current = null; phase = 'library'; robotId = Game.def.id;
    group = available(2) ? 2 : available(1) ? 1 : 0;
    UI.$('tray').hidden = true; UI.$('hint').hidden = true;
    UI.sheetKind = 'speech'; UI.$('sheet').dataset.kind = 'speech';
    UI.$('sheetTitle').textContent = 'Школа речи';
    UI.$('sheetTabs').replaceChildren();
    UI.$('sheet').hidden = false;
    render('[data-card]');
    if (level() === 0 && Room.robot) Room.robot.say('question');
  }

  function close() {
    if (!rendered) return;
    rendered = false; stop();
    UI.$('sheet').classList.remove('speech-open');
    current = null;
    if (previousFocus && previousFocus.isConnected) previousFocus.focus({ preventScroll: true });
    previousFocus = null;
  }

  function react(context) {
    if (!Game.s.started || Game.scene !== Room || UI.sheetKind || document.hidden) return null;
    if (!['feed','wash','sleep','wake','pet','play','hello','ball'].includes(context)) return null;
    const id = Game.def.id;
    const now = performance.now();
    if (now - (replyTimes.get(id) ?? -Infinity) < 2400) return null;
    replyTimes.set(id, now);
    const learned = cards.filter(card => score(card) === 2);
    // The child's chosen associations take priority over the factory phrases.
    let allowed = learned.filter(card => linkedSituation(card)?.contexts.includes(context));
    if (!allowed.length) allowed = learned.filter(card => !linkedSituation(card) && card.contexts?.includes(context));
    if (!allowed.length) {
      const sounds = learned.filter(card => card.group < 2);
      const best = sounds.reduce((n, card) => Math.max(n, card.group), -1);
      allowed = sounds.filter(card => card.group === best);
    }
    if (!allowed.length) {
      if (Room.robot) Room.robot.say('beep');
      return null;
    }
    // Snapshot the active visit as well as the allowlist. stop() cancels an
    // in-flight worker on scene change, switching robot, pause or mute.
    const robot = Room.robot;
    const soundAtRequest = Game.s.sound;
    function speak(proposed) {
      if (Room.robot !== robot || Game.def.id !== id || Game.scene !== Room ||
          UI.sheetKind || document.hidden || Game.s.sound !== soundAtRequest) return null;
      let chosen = allowed.find(card => card.id === proposed);
      if (!chosen) {
        const alternatives = allowed.filter(card => card.id !== lastReply);
        const pool = alternatives.length ? alternatives : allowed;
        chosen = pool[Math.floor(Math.random() * pool.length)];
      }
      lastReply = chosen.id;
      play(chosen, true);
      UI.toast(chosen.label + '!', 'robots');
      return chosen.id;
    }

    if (!selector) return speak(null);
    const candidates = Object.freeze(allowed.map(card => card.id));
    let response;
    try {
      response = selector(Object.freeze({ context, candidates }));
      if (!response || typeof response.then !== 'function') return speak(response);
    } catch (_) { return speak(null); }

    // Resolve a stalled / rejected worker with an ordinary local response.
    // Closing the room or pausing resolves the request silently instead.
    if (cancelSelection) cancelSelection();
    return new Promise(resolve => {
      let done = false;
      const timer = setTimeout(() => finish(null), 900);
      function finish(proposed, cancelled = false) {
        if (done) return;
        done = true;
        clearTimeout(timer);
        cancelSelection = null;
        resolve(cancelled ? null : speak(proposed));
      }
      cancelSelection = () => finish(null, true);
      Promise.resolve(response).then(id => finish(id), () => finish(null));
    });
  }

  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  return {
    open, close, react, stop,
    profile() { return { stage: stages[level()], learned: cards.filter(card => score(card) === 2).length, total: cards.length }; },
    setSelector(fn) { if (cancelSelection) cancelSelection(); selector = typeof fn === 'function' ? fn : null; },
    getVocabulary() { return cards.filter(card => score(card) === 2).map(card => card.id); },
  };
})();


