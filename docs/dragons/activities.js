(() => {
  'use strict';

  const tricks = [
    { id: 'hop', title: 'Прыжок', phrase: 'Прыг!', glyph: '↟', cue: ['leaf','sun'], effect: 'Подпрыгивает и мягко приземляется.' },
    { id: 'spin', title: 'Пируэт', phrase: 'Кружись!', glyph: '↻', cue: ['moon','leaf','moon'], effect: 'Кружится, подхватив хвост лапкой.' },
    { id: 'glow', title: 'Звёздное сияние', phrase: 'Зажгись!', glyph: '✧', cue: ['sun','moon','sun'], effect: 'Зажигает вокруг себя тёплые искры.' },
  ];
  const marks = {
    leaf: { symbol: '❧', name: 'Лист' }, sun: { symbol: '☀', name: 'Солнце' }, moon: { symbol: '☾', name: 'Луна' },
  };
  const pads = [
    { glyph: '♧', name: 'До', color: '#a5e5a7' }, { glyph: '◈', name: 'Ми', color: '#ffbbce' },
    { glyph: '☽', name: 'Соль', color: '#c5b2ff' }, { glyph: '✴', name: 'До↑', color: '#ffdb7c' },
  ];
  const normalize = (phrase) => String(phrase).toLocaleLowerCase('ru').replace(/ё/g, 'е').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  // Each pet supplies its own labelled phrases. Character n-gram cosine similarity
  // handles small typos without sending the child's words or voice anywhere.
  const politeWords = new Set(['пожалуйста','давай','ну','ка','прошу','тебя']);
  function commandFeatures(text, petName) {
    const ignore = new Set([...politeWords, ...normalize(petName).split(' ')]);
    const words = normalize(text).split(' ').filter(word => word && !ignore.has(word));
    const grams = new Map();
    for (const word of words) {
      const framed = '^'+word+'$';
      for (const n of [2,3]) {
        for (let i=0; i<=framed.length-n; i++) {
          const gram=framed.slice(i,i+n); grams.set(gram,(grams.get(gram)||0)+1);
        }
      }
    }
    const length = Math.sqrt([...grams.values()].reduce((sum,n)=>sum+n*n,0));
    return {raw:normalize(text),words,grams,length};
  }
  function recognize(phrase, book, petName) {
    const query = commandFeatures(phrase, petName);
    const candidates = tricks.filter(t=>book[t.id]);
    const exact = candidates.find(t=>normalize(book[t.id])===query.raw);
    if (exact) return exact;
    if (query.words.some(w => ['не','нет','нельзя','стоп'].includes(w)) || !query.length) return null;
    const ranked = candidates.map(trick => {
      const trained = commandFeatures(book[trick.id],petName);
      if (!trained.length) return {trick,score:0};
      let dot=0;
      for (const [gram,n] of query.grams) dot += n*(trained.grams.get(gram)||0);
      const score=dot/(query.length*trained.length);
      return {trick,score};
    }).sort((a,b)=>b.score-a.score);
    const best=ranked[0];
    if (!best || best.score<.67 || best.score-(ranked[1]?.score || 0)<.12) return null;
    return best.trick;
  }

  let active = null;

  function open(kind, api) {
    active?.();
    const { root, dragon, sprite, onReward, onClose, sound } = api;
    const previousFocus = document.activeElement;
    const localBook = {};
    for (const {id} of tricks) {
      if (typeof dragon.tricks?.[id] === 'string') localBook[id] = dragon.tricks[id];
    }
    const frame = document.createElement('section');
    frame.className = 'da-panel';
    frame.setAttribute('role', 'dialog');
    frame.setAttribute('aria-modal', 'true');
    frame.innerHTML = `<div class="da-header"><button type="button" class="da-back" data-act="back" aria-label="Назад">‹</button><h2></h2><button type="button" data-act="close" class="da-close" aria-label="Закрыть">×</button></div><div class="da-body"></div>`;
    frame.setAttribute('aria-label', kind === 'school' ? 'Школа драконов' : 'Мини-игры');
    root.replaceChildren(frame);
    const $ = (q) => frame.querySelector(q);
    const body = $('.da-body');
    const controller = new AbortController();
    const signal = controller.signal;
    const timers = new Set();
    let raf = 0, closed = false, screen = '', selected, practice, melody, hunt;
    function later(ms, fn) {
      const timer = setTimeout(() => { timers.delete(timer); if (!closed) fn(); }, ms);
      timers.add(timer);
    }
    function cancelTime() {
      timers.forEach(clearTimeout);
      timers.clear();
      cancelAnimationFrame(raf);
    }
    function dispose() {
      if (closed) return;
      closed = true;
      cancelTime();
      controller.abort();
      frame.remove();
      if (active === dispose) active = null;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus({preventScroll:true});
    }
    active = dispose;
    function leave() { dispose(); onClose(); }
    function show(id, title, html) {
      cancelTime();
      screen = id;
      $('.da-header h2').textContent = title;
      $('.da-back').hidden = id.endsWith('menu');
      const movedFocus = body.contains(document.activeElement);
      body.innerHTML = html;
      if (movedFocus) {
        const heading = $('.da-header h2'); heading.tabIndex = -1; heading.focus({preventScroll:true});
      }
      body.scrollTop = 0;
      for (const img of body.querySelectorAll('img.da-dragon')) {
        img.src = sprite;
        img.alt = dragon.name;
        img.draggable = false;
      }
      for (const name of body.querySelectorAll('[data-pet-name]')) name.textContent = dragon.name;
    }
    function habitat(inside = '', klass = '') {
      return `<div class="da-habitat ${klass}"><span class="da-dust" aria-hidden="true"></span><div class="da-aura" aria-hidden="true"></div><div class="da-dragon-wrap"><img class="da-dragon" alt=""></div>${inside}</div>`;
    }
    function term(text) { return `<span class="da-term">${text}</span>`; }
    function say(text) { const el = $('.da-message'); if (el) el.textContent = text; }
    function reward(value) { onReward(value); }
    function animate(id) {
      const dragonWrap = $('.da-dragon-wrap');
      if (!dragonWrap) return;
      dragonWrap.classList.remove('da-hop','da-spin','da-glow');
      void dragonWrap.offsetWidth;
      dragonWrap.classList.add('da-' + id);
      const glade = $('.da-habitat');
      glade.classList.remove('da-spark');
      void glade.offsetWidth;
      glade.classList.add('da-spark');
    }
    function schoolMenu() {
      const learned = tricks.filter(t => localBook[t.id]);
      show('school-menu','Школа драконов', `<div class="da-split">${habitat('<div class="da-caption"><span data-pet-name></span><small>Трюков изучено · '+learned.length+' из 3</small></div>','da-portrait')}<div class="da-controls"><h3>Уроки трюков</h3><div class="da-deck">${tricks.map(t => `<button class="da-card" data-act="lesson" data-id="${t.id}"><i>${t.glyph}</i><span><strong>${t.title}</strong><small>${localBook[t.id] ? 'Команда выучена' : 'Разучить движения'}</small></span><b>›</b></button>`).join('')}</div>${learned.length ? '<button class="da-primary" data-act="command">Подать команду</button>' : ''}</div></div>`);
    }
    function commandRoom() {
      show('command','Подать команду',`<div class="da-split">${habitat('<div class="da-caption"><span data-pet-name></span></div>','da-portrait')}<div class="da-controls"><h3>Что покажем?</h3><p>Напиши одну из знакомых команд или выбери её ниже.</p><form data-form="command" class="da-form"><label>Твоя команда<input name="phrase" maxlength="42" autocomplete="off" placeholder="Например, Прыг!" required></label><button class="da-primary">Выполнить</button></form><div class="da-chips"></div><p class="da-message" role="status"></p></div></div>`);
      tricks.filter(t => localBook[t.id]).forEach(t => {
        const b = document.createElement('button'); b.type = 'button'; b.dataset.act = 'perform'; b.dataset.id = t.id;
        b.textContent = localBook[t.id]; $('.da-chips').append(b);
      });
    }
    function perform(id) {
      api.onPerform?.();
      animate(id); sound('sparkle'); say(tricks.find(t=>t.id===id).effect);
    }
    function lesson(id) {
      selected = tricks.find(t => t.id === id);
      if (!selected) return;
      if (localBook[id]) { commandRoom(); $('.da-form input').value = localBook[id]; perform(id); return; }
      practice = { repeats: 0, input: 0, busy: false };
      const legend = selected.cue.map(k => `<span>${marks[k].symbol} ${marks[k].name}</span>`).join('<b>›</b>');
      show('lesson', selected.title, `<div class="da-split">${habitat('<div class="da-caption"><span data-pet-name></span></div>','da-portrait')}<div class="da-controls">${term('Урок трюка')}<h3>Покажи жест</h3><p>Коснись знаков по порядку. Дракон повторит движение за тобой дважды.</p><div class="da-path">${legend}</div><div class="da-runes">${Object.entries(marks).map(([k,v]) => `<button type="button" data-act="rune" data-id="${k}"><i>${v.symbol}</i>${v.name}</button>`).join('')}</div><p class="da-steps"></p><p class="da-message" role="status"></p></div></div>`);
      paintPractice();
    }
    function paintPractice() {
      $('.da-steps').textContent = `Попытка ${Math.min(2,practice.repeats+1)} из 2 · Знак ${Math.min(practice.input+1,selected.cue.length)} из ${selected.cue.length}`;
      $('.da-path').querySelectorAll('span').forEach((el,i) => el.classList.toggle('done',i < practice.input));
    }
    function rune(id) {
      if (practice.busy) return;
      if (selected.cue[practice.input] !== id) {
        sound('miss'); practice.input = 0; paintPractice(); say('Начнём жест сначала. Следи за порядком знаков.'); return;
      }
      practice.input++; sound('note'+['leaf','sun','moon'].indexOf(id)); paintPractice(); say('');
      if (practice.input !== selected.cue.length) return;
      practice.repeats++; practice.busy = true; animate(selected.id);
      say(practice.repeats === 1 ? 'Получилось! Покажи тот же жест ещё раз.' : 'Запомнил! Осталось выбрать команду.');
      later(820, () => {
        if (practice.repeats >= 2) nameLesson();
        else { practice.input = 0; practice.busy = false; paintPractice(); }
      });
    }
    function nameLesson() {
      show('name', selected.title, `<div class="da-split">${habitat('<div class="da-caption"><span data-pet-name></span></div>','da-portrait')}<div class="da-controls">${term('Последний шаг')}<h3>Придумай команду</h3><p>Дракон запомнит эти слова и исполнит трюк, когда ты их напишешь.</p><form data-form="learn" class="da-form"><label>Слова для трюка<input name="phrase" required maxlength="42" autocomplete="off"></label><button class="da-primary">Запомнить команду</button></form><p class="da-message" role="status"></p></div></div>`);
      $('.da-form input').value = selected.phrase;
    }
    function gamesMenu() {
      show('games-menu', 'Игры на поляне', `<div class="da-split">${habitat('<div class="da-caption"><span data-pet-name></span></div>', 'da-portrait')}<div class="da-controls"><h3>Во что сыграем?</h3><div class="da-deck"><button class="da-card" data-act="echo"><i>♫</i><span><strong>Лесное эхо</strong><small>Запомни и повтори мелодию</small></span><b>›</b></button><button class="da-card" data-act="hunt"><i>✧</i><span><strong>Ловцы светлячков</strong><small>Проведи дракона к огонькам</small></span><b>›</b></button></div></div></div>`);
    }
    function results(title, detail, points, xp, replay) {
      show('result', title, `<div class="da-split">${habitat('<div class="da-caption"><span data-pet-name></span></div>','da-portrait')}<div class="da-controls"><h3>${detail}</h3><p class="da-loot">+${points} пыльцы · +${xp} опыта</p><button class="da-primary" data-act="${replay}">Ещё раз</button><button class="da-plain" data-act="back">К играм</button></div></div>`);
      animate('hop'); sound('win'); reward({coins:points,xp});
    }
    function startEcho() {
      melody = {seq:[Math.floor(Math.random()*4), Math.floor(Math.random()*4)], echo:0, rounds:0, misses:0, listening:true};
      show('echo','Лесное эхо',`<div class="da-split">${habitat('<div class="da-caption"><span data-pet-name></span></div>','da-portrait')}<div class="da-controls"><div class="da-meters"><span class="da-round"></span><span class="da-lives"></span></div><h3 class="da-message" role="status">Слушай мелодию</h3><p>Повтори подсвеченные ноты в том же порядке.</p><div class="da-pads">${pads.map((p,i)=>`<button type="button" data-act="pad" data-id="${i}" style="--pad:${p.color}"><b>${p.glyph}</b><span>${p.name}</span></button>`).join('')}</div><div class="da-echo-dots"></div></div></div>`);
      playSequence();
    }
    function flash(i) {
      const el = $(`[data-act="pad"][data-id="${i}"]`);
      el.classList.add('lit');
      sound('note'+i);
      later(320, () => el.classList.remove('lit'));
    }
    function playSequence() {
      melody.listening = true; melody.echo = 0;
      $('.da-round').textContent = `Мелодия ${melody.rounds+1} из 4`;
      $('.da-lives').textContent = '♥'.repeat(3-melody.misses);
      $('.da-lives').setAttribute('aria-label','Осталось попыток: '+(3-melody.misses));
      $('.da-echo-dots').textContent = '○ '.repeat(melody.seq.length);
      $('.da-pads').classList.add('listening');
      $('.da-pads').querySelectorAll('button').forEach(b => b.setAttribute('aria-disabled','true'));
      say('Слушай мелодию');
      melody.seq.forEach((i,k) => later(350+k*620,()=>flash(i)));
      later(350+melody.seq.length*620, () => {
        melody.listening = false; $('.da-pads').classList.remove('listening');
        $('.da-pads').querySelectorAll('button').forEach(b => b.removeAttribute('aria-disabled'));
        say('Твоя очередь');
      });
    }
    function pad(i) {
      if (melody.listening) return;
      flash(i);
      if (i !== melody.seq[melody.echo]) {
        melody.listening = true; melody.misses++; sound('miss'); say('Послушаем ещё раз');
        $('.da-lives').textContent = '♥'.repeat(3-melody.misses);
        later(700, melody.misses >= 3 ? finishEcho : playSequence); return;
      }
      melody.echo++;
      $('.da-echo-dots').textContent = '● '.repeat(melody.echo)+'○ '.repeat(melody.seq.length-melody.echo);
      if (melody.echo === melody.seq.length) {
        melody.listening = true; melody.rounds++; animate('hop'); say('Точно в ноту!');
        melody.seq.push(Math.floor(Math.random()*4));
        later(720, melody.rounds >= 4 ? finishEcho : playSequence);
      }
    }
    function finishEcho() {
      const n = melody.rounds; results('Лесное эхо', `Мелодий сыграно: ${n} из 4`, n*4, n*2, 'echo');
    }
    function startHunt() {
      show('hunt-ready', 'Ловцы светлячков', `<div class="da-split">${habitat('<div class="da-caption"><span data-pet-name></span></div>','da-portrait')}<div class="da-controls"><h3>Собери огоньки</h3><p>Води пальцем или мышью по поляне. Дракон подхватит опускающихся светлячков. Золотой приносит три очка.</p><p class="da-keyhint">На клавиатуре — стрелки ← →</p><button class="da-primary" data-act="hunt-start">Начать · 18 секунд</button></div></div>`);
    }
    function runHunt() {
      show('hunt','Ловцы светлячков',`<div class="da-hunt-top"><span class="da-catch-score" aria-live="off">✧ 0</span><span class="da-seconds">18 с</span></div>${habitat('<div class="da-flight" aria-hidden="true"></div><div class="da-floor" aria-hidden="true"></div>','da-field')}<p class="da-hunt-hint">Веди дракона за огоньками · ← →</p>`);
      const field = $('.da-field'), flight = $('.da-flight'), pet = $('.da-dragon-wrap');
      field.tabIndex = 0; field.setAttribute('aria-label','Поляна. Двигай дракона стрелками влево и вправо.');
      field.focus({preventScroll:true});
      hunt = {elapsed:0, previous:performance.now(), spawn:0.2, count:0, score:0, x:.5, target:.5, direction:0, bugs:[]};
      function aim(e) {
        const box = field.getBoundingClientRect();
        hunt.target = Math.max(.075, Math.min(.925,(e.clientX-box.left)/box.width));
      }
      field.onpointerdown = (e) => { field.setPointerCapture(e.pointerId); aim(e); };
      field.onpointermove = (e) => { if (e.pointerType !== 'touch' || e.buttons) aim(e); };
      function spawnBug() {
        const gold = ++hunt.count % 5 === 0, el = document.createElement('i');
        el.className = 'da-bug' + (gold ? ' da-gold' : '');
        flight.append(el);
        hunt.bugs.push({el,gold,x:.08+Math.random()*.84,y:-.04,v:.24+Math.random()*.07+hunt.elapsed*.002,phase:Math.random()*7});
      }
      function tick(now) {
        const dt = Math.min(.08,(now-hunt.previous)/1000); hunt.previous = now;
        if (document.hidden) { raf=requestAnimationFrame(tick); return; }
        hunt.elapsed += dt; hunt.spawn -= dt;
        if (hunt.spawn <= 0 && hunt.elapsed < 15.7) { spawnBug(); hunt.spawn = .74-hunt.elapsed*.012; }
        if (hunt.direction) hunt.target = Math.max(.075,Math.min(.925,hunt.target+hunt.direction*dt*.85));
        hunt.x += (hunt.target-hunt.x)*(1-Math.exp(-dt*14)); pet.style.left=hunt.x*100+'%';
        for (const bug of hunt.bugs) {
          bug.y += bug.v*dt;
          const x = bug.x+.035*Math.sin(bug.phase+bug.y*6);
          bug.el.style.left = x*100+'%'; bug.el.style.top = bug.y*100+'%';
          if (bug.y>.65 && bug.y<.85 && Math.abs(x-hunt.x)<.095) {
            hunt.score += bug.gold ? 3 : 1; bug.dead = true; sound(bug.gold ? 'sparkle' : 'tap');
            $('.da-catch-score').textContent = '✧ '+hunt.score;
            const number = document.createElement('span'); number.className='da-points'; number.textContent=bug.gold?'+3':'+1';
            number.style.left=x*100+'%'; number.style.top=bug.y*100+'%'; field.append(number); later(520,()=>number.remove());
          }
          if (bug.dead || bug.y>1.04) bug.el.remove();
        }
        hunt.bugs = hunt.bugs.filter(b=>!b.dead && b.y<=1.04);
        $('.da-seconds').textContent = Math.max(0,Math.ceil(18-hunt.elapsed))+' с';
        if (hunt.elapsed>=18) { results('Ловцы светлячков','Очки за огоньки: '+hunt.score,hunt.score,Math.ceil(hunt.score/2),'hunt'); return; }
        raf = requestAnimationFrame(tick);
      }
      raf = requestAnimationFrame(tick);
    }
    function back() { if (screen.endsWith('menu')) leave(); else if (kind === 'school') schoolMenu(); else gamesMenu(); }
    frame.addEventListener('click', event => {
      const button = event.target.closest('button[data-act]');
      if (!button || button.disabled) return;
      const {act,id} = button.dataset;
      switch (act) {
        case 'back': back(); break;
        case 'close': leave(); break;
        case 'lesson': lesson(id); break;
        case 'rune': rune(id); break;
        case 'command': commandRoom(); break;
        case 'perform': perform(id); break;
        case 'echo': startEcho(); break;
        case 'pad': pad(Number(id)); break;
        case 'hunt': startHunt(); break;
        case 'hunt-start': runHunt(); break;
      }
    }, {signal});
    frame.addEventListener('submit', event => {
      const form = event.target;
      if (!form.dataset.form) return;
      event.preventDefault();
      const phrase = form.elements.phrase.value.trim();
      const normalized = normalize(phrase);
      if (!normalized) { say('Введи хотя бы одно слово.'); return; }
      const found = tricks.find(t=>localBook[t.id] && normalize(localBook[t.id]) === normalized);
      if (form.dataset.form === 'command') {
        const match = recognize(phrase,localBook,dragon.name);
        if (match) perform(match.id); else { say('Пока не знаю этой команды. Посмотри знакомые слова ниже.'); sound('miss'); }
      } else if (found) {
        say('Эти слова уже связаны с другим трюком. Придумай свою фразу.');
      } else {
        localBook[selected.id] = phrase;
        commandRoom();
        perform(selected.id);
        say('Команда «'+phrase+'» выучена! +8 опыта');
        reward({coins:0,xp:8,trick:selected.id,phrase});
      }
    }, {signal});
    function keypress(e) {
      if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); leave(); return; }
      if (e.key === 'Tab') {
        const controls = [...frame.querySelectorAll('button:not([disabled]),input,[tabindex="0"]')].filter(el=>el.getClientRects().length);
        if (e.shiftKey && document.activeElement === controls[0]) { e.preventDefault(); controls.at(-1)?.focus(); }
        if (!e.shiftKey && document.activeElement === controls.at(-1)) { e.preventDefault(); controls[0]?.focus(); }
      }
      if (screen === 'hunt' && ['ArrowLeft','ArrowRight'].includes(e.key)) {
        e.preventDefault(); hunt.direction = e.key === 'ArrowLeft' ? -1 : 1;
      }
    }
    document.addEventListener('keydown',keypress,{signal,capture:true});
    document.addEventListener('keyup',e=>{ if (screen==='hunt' && ['ArrowLeft','ArrowRight'].includes(e.key)) hunt.direction=0; },{signal});
    window.addEventListener('blur',()=>{ if (screen==='hunt') hunt.direction=0; },{signal});
    if (kind === 'school') schoolMenu(); else gamesMenu();
    $('.da-close').focus({preventScroll:true});
    return dispose;
  }
  window.DragonActivities = {open,close:()=>active?.(),matchCommand:(phrase,dragon)=>recognize(phrase,dragon.tricks,dragon.name)?.id};
})();
