'use strict';
// HTML overlay: HUD, action bar, sheets (games / shop / robots / settings), hints, toasts.
const ICON = {
  speech: '<svg viewBox="0 0 48 48"><path d="M7 9h34v25H24l-10 8v-8H7z" fill="#fff8d2" stroke="#983e60" stroke-width="2.5" stroke-linejoin="round"/><path d="m16 27 5-12 5 12m-8-4h6m7-6v8" fill="none" stroke="#ba3d62" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  rail: '<svg viewBox="0 0 48 48"><rect x="5" y="13" width="28" height="20" rx="6" fill="#fff3b5"/><path d="M26 21h8l7 9v3H26" fill="#ffa550"/><rect x="10" y="17" width="14" height="10" rx="2" fill="#167480"/><path d="M6 39h35" stroke="#fff" stroke-width="3"/><g fill="#263b50" stroke="#fff" stroke-width="2"><circle cx="13" cy="34" r="5"/><circle cx="33" cy="34" r="5"/></g></svg>',
  bloom: '<svg viewBox="0 0 48 48"><path d="M23 42V23m0 14Q10 37 8 28q14 0 15 9m0-4q4-10 16-10-2 9-16 10" fill="#8eeabd" stroke="#176455" stroke-width="2"/><g fill="#ffe1ed"><circle cx="23" cy="11" r="7"/><circle cx="14" cy="18" r="7"/><circle cx="32" cy="18" r="7"/><circle cx="24" cy="24" r="7"/></g><circle cx="23" cy="18" r="6" fill="#ffb62f"/></svg>',
  bolt: '<svg viewBox="0 0 48 48"><g transform="rotate(-30 24 24)"><rect x="19" y="20" width="10" height="22" rx="2" fill="#5E6880"/><path d="M18 27l12-3M18 32l12-3M18 37l12-3" stroke="#D9E1EC" stroke-width="2.5"/><polygon points="24,5 35,11 35,23 24,29 13,23 13,11" fill="#D9E1EC" stroke="#5E6880" stroke-width="2.5"/><path d="M18 17h12" stroke="#5E6880" stroke-width="3.5" stroke-linecap="round"/></g></svg>',
  food: '<svg viewBox="0 0 48 48"><polygon points="24,5 40,14 40,34 24,43 8,34 8,14" fill="#E8A05A" stroke="#A0602A" stroke-width="3"/><circle cx="24" cy="24" r="7" fill="#FFE6C2"/><rect x="13" y="15" width="4" height="4" fill="#FF6B9A"/><rect x="31" y="16" width="4" height="4" fill="#5FD3FF"/><rect x="28" y="31" width="4" height="4" fill="#7BE07A"/></svg>',
  energy: '<svg viewBox="0 0 48 48"><rect x="13" y="9" width="22" height="34" rx="5" fill="#3D4A6B" stroke="#fff" stroke-width="2.5"/><rect x="19" y="4" width="10" height="5" rx="2" fill="#fff"/><path d="M27 13l-9 14h6l-3 11 9-15h-6z" fill="#FFE14A"/></svg>',
  clean: '<svg viewBox="0 0 48 48"><circle cx="18" cy="28" r="11" fill="rgba(160,220,255,.35)" stroke="#fff" stroke-width="2.5"/><circle cx="33" cy="16" r="8" fill="rgba(160,220,255,.35)" stroke="#fff" stroke-width="2.5"/><circle cx="34" cy="35" r="5" fill="rgba(160,220,255,.35)" stroke="#fff" stroke-width="2.5"/><circle cx="14" cy="24" r="3" fill="#fff"/></svg>',
  fun: '<svg viewBox="0 0 48 48"><defs><clipPath id="cbf"><circle cx="24" cy="24" r="17"/></clipPath></defs><circle cx="24" cy="24" r="17" fill="#FF6B6B"/><rect x="5" y="20" width="38" height="8" fill="#FFD84A" clip-path="url(#cbf)"/><circle cx="24" cy="24" r="5" fill="#4FC3FF"/><circle cx="24" cy="24" r="17" fill="none" stroke="#B83A4A" stroke-width="2.5"/><circle cx="17" cy="16" r="3" fill="rgba(255,255,255,.7)"/></svg>',
  sleep: '<svg viewBox="0 0 48 48"><path d="M29 6a18 18 0 1 0 14 26A15 15 0 0 1 29 6z" fill="#FFE59A" stroke="#C9A43A" stroke-width="2.5"/><path d="M11 8l1.5 3 3 1.5-3 1.5L11 17l-1.5-3-3-1.5 3-1.5z" fill="#fff"/></svg>',
  wake: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="9" fill="#FFE14A" stroke="#C9A43A" stroke-width="2.5"/><g stroke="#FFE14A" stroke-width="3.5" stroke-linecap="round"><path d="M24 5v6M24 37v6M5 24h6M37 24h6M10.5 10.5l4 4M33.5 33.5l4 4M37.5 10.5l-4 4M14.5 33.5l-4 4"/></g></svg>',
  games: '<svg viewBox="0 0 48 48"><path d="M11 15h26a8 8 0 0 1 8 9l-2 9a5 5 0 0 1-8.5 2.5L30 31H18l-4.5 4.5A5 5 0 0 1 5 33l-2-9a8 8 0 0 1 8-9z" fill="#fff"/><path d="M15 19v9M10.5 23.5h9" stroke="#E8458A" stroke-width="3.5" stroke-linecap="round"/><circle cx="32" cy="21" r="3" fill="#FFD84A"/><circle cx="37" cy="26" r="3" fill="#2ED3B7"/></svg>',
  shop: '<svg viewBox="0 0 48 48"><path d="M9 16h30l-2.5 27h-25z" fill="#fff"/><path d="M17 17v-4a7 7 0 0 1 14 0v4" fill="none" stroke="#fff" stroke-width="3.5"/><circle cx="24" cy="29" r="5" fill="#F2A20C"/></svg>',
  robots: '<svg viewBox="0 0 48 48"><path d="M24 11V5" stroke="#fff" stroke-width="3"/><circle cx="24" cy="5" r="3.5" fill="#FF8A3D"/><path d="M5 31c0-14 8-20 19-20s19 6 19 20v3H5z" fill="#fff"/><rect x="10" y="19" width="28" height="13" rx="6.5" fill="#1C2340"/><ellipse cx="18" cy="25.5" rx="2.6" ry="3.6" fill="#62F4E6"/><ellipse cx="30" cy="25.5" rx="2.6" ry="3.6" fill="#62F4E6"/><rect x="8" y="33" width="32" height="7" rx="3.5" fill="#FF8A3D"/></svg>',
  wash: '<svg viewBox="0 0 48 48"><rect x="7" y="20" width="34" height="21" rx="7" fill="#FFE066" stroke="#B8941E" stroke-width="2.5"/><rect x="7" y="33" width="34" height="8" rx="4" fill="#5FD38A"/><circle cx="16" cy="12" r="6" fill="rgba(200,235,255,.45)" stroke="#fff" stroke-width="2"/><circle cx="30" cy="9" r="4" fill="rgba(200,235,255,.45)" stroke="#fff" stroke-width="2"/></svg>',
  heart: '<svg viewBox="0 0 48 48"><path d="M24 41S6 30 6 18a9 9 0 0 1 18-3 9 9 0 0 1 18 3c0 12-18 23-18 23z" fill="#FF5C8A"/><circle cx="15" cy="16" r="3" fill="rgba(255,255,255,.6)"/></svg>',
  gear: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="15" fill="none" stroke="#fff" stroke-width="8" stroke-dasharray="6 5.8"/><circle cx="24" cy="24" r="12" fill="#fff"/><circle cx="24" cy="24" r="5" fill="#3A2A70"/></svg>',
  catch: '<svg viewBox="0 0 48 48"><path d="M8 34c0-10 6-15 16-15s16 5 16 15z" fill="#fff"/><rect x="13" y="25" width="22" height="8" rx="4" fill="#1C2340"/><circle cx="19" cy="29" r="2" fill="#62F4E6"/><circle cx="29" cy="29" r="2" fill="#62F4E6"/><rect x="11" y="35" width="26" height="6" rx="3" fill="#FF8A3D"/><polygon points="12,4 17,7 17,12 12,15 7,12 7,7" fill="#D9E1EC"/><polygon points="34,8 38,10.5 38,15 34,17.5 30,15 30,10.5" fill="#FFD34D"/></svg>',
  simon: '<svg viewBox="0 0 48 48"><circle cx="14" cy="14" r="9" fill="#FF5C5C"/><path d="M34 4l3 6 6 1-4.5 4.5 1 6.5-5.5-3-5.5 3 1-6.5L25 11l6-1z" fill="#FFD84A"/><path d="M14 27l9 15H5z" fill="#6BE07A"/><rect x="26" y="27" width="16" height="16" rx="3" fill="#4FC3FF"/></svg>',
  dance: '<svg viewBox="0 0 48 48"><path d="M18 34V10l20-5v24" fill="none" stroke="#fff" stroke-width="4" stroke-linejoin="round"/><ellipse cx="13" cy="35" rx="7" ry="5.5" fill="#fff"/><ellipse cx="33" cy="30" rx="7" ry="5.5" fill="#fff"/></svg>',
};

const UI = {
  el: {}, sheetKind: null, shopTab: 'hats',
  $(id) { return document.getElementById(id); },
  init() {
    const ui = this.$('ui');
    ui.innerHTML = `
      <div id="hud" hidden>
        <button class="plate name-plate" id="namePlate" aria-label="Паспорт дружбы"><span class="lvl"><svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="15" fill="#FF5C8A"/><circle id="xpRing" cx="18" cy="18" r="15" fill="none" stroke="#FFE0EA" stroke-width="4" stroke-dasharray="0 100" transform="rotate(-90 18 18)" stroke-linecap="round"/></svg><b id="lvl">1</b></span><span class="name-lines"><span id="nm">Пик</span><small>Паспорт дружбы ›</small></span></button>
        <div class="spacer"></div>
        <button class="plate bolts" id="boltsBtn" aria-label="Винтики и магазин">${ICON.bolt}<b id="bolts">0</b></button>
        <button class="plate gear" id="gearBtn" aria-label="Настройки">${ICON.gear}</button>
      </div>
      <div id="needs" hidden>
        ${['food', 'energy', 'clean', 'fun'].map((k) => `<div class="need" data-k="${k}"><svg class="ring" viewBox="0 0 44 44"><circle cx="22" cy="22" r="19.5" fill="none" stroke="rgba(255,255,255,.15)" stroke-width="4"/><circle class="v" cx="22" cy="22" r="19.5" fill="none" stroke="#6BFF8E" stroke-width="4" stroke-linecap="round" stroke-dasharray="0 200"/></svg><span class="ic">${ICON[k]}</span></div>`).join('')}
      </div>
      <div id="bar" hidden>
        ${[['food', 'Еда', 'linear-gradient(#FFB36B,#FF7A3D)'], ['wash', 'Мыть', 'linear-gradient(#8FDBFF,#3F9BFF)'], ['sleep', 'Спать', 'linear-gradient(#9C8CFF,#5B45D6)'], ['games', 'Игры', 'linear-gradient(#FF8FC2,#E8458A)'], ['speech', 'Речь', 'linear-gradient(#FFD36C,#FF9F56)'], ['robots', 'Роботы', 'linear-gradient(#8CF9EE,#22B8A2)']]
          .map(([k, n, bg]) => `<button class="act" data-a="${k}"><span class="btn" style="background:${bg}">${ICON[k]}<i class="dot" hidden></i></span><span class="lb">${n}</span></button>`).join('')}
      </div>
      <div id="tray" class="plate" hidden></div>
      <div id="washBar" class="plate" hidden><span>Три губкой!</span><span class="meter"><i id="washM" style="width:0%"></i></span><button class="pill" id="washDone">Готово</button></div>
      <div id="hint" class="plate" hidden></div>
      <div id="toast"></div>
      <div id="sheet" role="dialog" aria-labelledby="sheetTitle" hidden><div class="sheet-head"><b id="sheetTitle"></b><button class="x" id="sheetX" aria-label="Закрыть">✕</button></div><div id="sheetTabs"></div><div id="sheetBody"></div></div>
      <div id="choosePlate" class="plate center-plate" hidden></div>
      <div id="gameHud" hidden><div class="plate" id="gScore">${ICON.bolt}<b>0</b></div><div class="time"><i id="gTime" style="width:100%"></i></div><button class="plate x" id="gExit" aria-label="Выйти">✕</button></div>
      <div id="result" class="plate center-plate" hidden></div>`;
    ui.querySelectorAll('.act').forEach((b) => b.addEventListener('click', () => this.action(b.dataset.a)));
    this.$('sheetX').onclick = () => this.closeSheet();
    this.$('namePlate').onclick = () => this.openSheet('passport');
    this.$('gearBtn').onclick = () => this.openSheet('settings');
    this.$('boltsBtn').onclick = () => this.openSheet('shop');
    this.$('washDone').onclick = () => Room.cancelWash();
    this.$('gExit').onclick = () => Games.exit();
    ui.querySelectorAll('.need').forEach((n) => n.addEventListener('click', () => { const r = Room.robot; if (r && r.mode !== 'sleep') { r.stop(); r.play(B.think(r, n.dataset.k), 1); } }));
    // food tray
    const tray = this.$('tray');
    tray.innerHTML = Object.keys(FOODS).map((k) => `<div class="food" data-f="${k}"><canvas width="100" height="100"></canvas></div>`).join('') + '<span class="tip">Перетащи к клюву</span>';
    tray.querySelectorAll('.food').forEach((f) => {
      const c = f.querySelector('canvas').getContext('2d'); c.setTransform(2.4, 0, 0, 2.4, 50, 52); drawFood(c, f.dataset.f);
      f.addEventListener('pointerdown', (e) => { e.preventDefault(); Snd.init(); const p = localXY(e); Room.startFood(f.dataset.f, p.x, p.y); });
      f.addEventListener('click', () => { if (!Room.dragFood && !Room.foods.length) { const r = Room.robot; const h = r.headWorld(); const fd = new Food(f.dataset.f, h.x, h.y + r.px * 0.3); Room.foods.push(fd); Room.feed(fd); } });
    });
    this.place();
  },
  topHeight() { return 112; },
  bottomHeight() { return 104; },
  place() {
    const b = 'calc(96px + env(safe-area-inset-bottom, 0px))';
    for (const id of ['tray', 'hint', 'washBar']) this.$(id).style.bottom = b;
  },
  scene(name) {
    this.$('toast').replaceChildren();
    stage.dataset.scene = name;
    const room = name === 'room', game = name === 'catch' || name === 'simon';
    this.$('hud').hidden = !room; this.$('needs').hidden = !room; this.$('bar').hidden = !room;
    this.$('gameHud').hidden = !game; this.$('result').hidden = true;
    this.$('choosePlate').hidden = name !== 'choose';
    this.$('tray').hidden = true; this.$('washBar').hidden = true; this.$('hint').hidden = true;
    this.closeSheet();
    if (room) { this.needs(); this.friend(); this.bolts(); this.$('nm').textContent = Game.s.name; this.sleepBtn(); }
  },
  action(a) {
    Snd.init(); Snd.sfx.click();
    const tray = this.$('tray');
    if (a !== 'food') tray.hidden = true;
    if (World.washing && a !== 'wash') Room.cancelWash();
    switch (a) {
      case 'speech': SpeechLab.open(); break;
      case 'food': tray.hidden = !tray.hidden; this.closeSheet(); this.$('hint').hidden = true; break;
      case 'wash': if (World.washing) Room.cancelWash(); else { Room.startWash(); this.setWash(true); } break;
      case 'sleep': Room.goSleep(); setTimeout(() => this.sleepBtn(), 50); break;
      default: this.openSheet(a);
    }
  },
  sleepBtn() {
    const b = document.querySelector('.act[data-a="sleep"]');
    if (!b || !Room.robot) return;
    const asleep = Room.robot.coName === 'sleep';
    b.querySelector('.btn').innerHTML = (asleep ? ICON.wake : ICON.sleep) + '<i class="dot" hidden></i>';
    b.querySelector('.lb').textContent = asleep ? 'Разбудить' : 'Спать';
  },
  setWash(on) {
    this.$('washBar').hidden = !on;
    document.querySelector('.act[data-a="wash"]').classList.toggle('on', on);
    if (on) this.$('hint').hidden = true;
  },
  needs() {
    if (!Game.s) return;
    document.querySelectorAll('.need').forEach((n) => {
      const v = Game.s.needs[n.dataset.k], c = n.querySelector('.v');
      c.setAttribute('stroke-dasharray', `${(v / 100) * 122.5} 200`);
      c.setAttribute('stroke', v > 50 ? '#6BFF8E' : v > 25 ? '#FFD54A' : '#FF5D5D');
      n.classList.toggle('low', v < 20);
    });
    if (World.washing) this.$('washM').style.width = Math.round(clamp(Room.scrub, 0, 1) * 100) + '%';
  },
  friend() {
    const s = Game.s; this.$('lvl').textContent = s.level;
    this.$('namePlate').title = 'Паспорт дружбы · уровень ' + s.level + ' · ' + s.xp + ' опыта';
    this.$('xpRing').setAttribute('stroke-dasharray', `${(s.xp / (10 + s.level * 6)) * 94} 100`);
  },
  bolts(bump) {
    this.$('bolts').textContent = Game.s.bolts;
    if (bump) { const b = this.$('boltsBtn'); b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); }
  },
  boltTarget() {
    const el = Game.scene && (Game.scene.name === 'catch' || Game.scene.name === 'simon') ? this.$('gScore') : this.$('boltsBtn');
    const r = el.getBoundingClientRect(), s = stage.getBoundingClientRect();
    if (!r.width) return { x: World.W - 60, y: 30 };
    return { x: r.left - s.left + 22, y: r.top - s.top + r.height / 2 };
  },
  toast(text, icon) {
    const d = document.createElement('div');
    d.className = 'plate'; d.innerHTML = ICON[icon] || '';
    const label = document.createElement('span'); label.textContent = text; d.append(label);
    this.$('toast').appendChild(d);
    setTimeout(() => d.remove(), 2600);
  },
  badge(a, on) { const d = document.querySelector(`.act[data-a="${a}"] .dot`); if (d) d.hidden = !on; },
  hint(key) {
    const h = this.$('hint');
    const txt = { pet: 'Погладь робота по голове', speech: 'Нажми «Речь» и подари другу первый звук', feed: 'Нажми «Еда» и дай печеньку', knock: 'Постучи по стеклу 2–3 раза', tap: 'Тыкни в робота много раз', lift: 'Потяни робота за пузико' }[key];
    if (!txt || Game.scene !== Room) { h.hidden = true; return; }
    h.innerHTML = `<span class="finger">👆</span><span>${txt}</span>`;
    h.hidden = !this.$('tray').hidden || !this.$('sheet').hidden;
  },

  // ---------- sheets ----------
  openSheet(kind) {
    if (this.sheetKind === 'speech' && kind !== 'speech') SpeechLab.close();
    this.sheetKind = kind;
    this.$('sheet').dataset.kind = kind;
    this.$('tray').hidden = true; this.$('hint').hidden = true;
    const titles = { passport: 'Паспорт дружбы', speech: 'Мастерская речи', games: 'Во что сыграем?', shop: 'Магазин', robots: 'Роботы', settings: 'Настройки' };
    this.$('sheetTitle').textContent = titles[kind];
    this.$('sheet').hidden = false;
    this.$('sheetTabs').innerHTML = '';
    const body = this.$('sheetBody');
    body.innerHTML = '';
    if (kind === 'passport') Passport.render(body);
    if (kind === 'games') this.sheetGames(body);
    if (kind === 'shop') this.sheetShop(body);
    if (kind === 'robots') { this.badge('robots', false); this.sheetRobots(body); }
    if (kind === 'settings') this.sheetSettings(body);
  },
  closeSheet() { if (this.sheetKind === 'speech') SpeechLab.close(); this.$('sheet').hidden = true; this.sheetKind = null; if (Game.scene === Room && Game.s && Game.s.started) this.hint(['pet', 'speech', 'feed', 'knock', 'tap', 'lift'].find((k) => !Game.s.hints[k])); },
  sheetGames(body) {
    const list = [
      ['rail', 'Почтовый экспресс', 'Поверни рельсы и доставь письмо.', 'linear-gradient(135deg,#02737d,#118e85)'],
      ['bloom', 'Лунная теплица', 'Полей ростки и раскрой лунные цветы.', 'linear-gradient(135deg,#694593,#ad507e)'],
      ['catch', 'Лови винтики', 'Води робота пальцем и лови детали. 40 секунд.', 'linear-gradient(135deg,#FF9A5A,#E8458A)'],
      ['simon', 'Пи-пи-повтори', 'Робот пищит мелодию, ты повторяешь.', 'linear-gradient(135deg,#7B61FF,#3F9BFF)'],
      ['dance', 'Танцы', 'Включи музыку и потанцуй вместе.', 'linear-gradient(135deg,#2ED3B7,#3F9BFF)'],
      ['fun', 'Мячик', 'Брось мячик пальцем: робот погонится.', 'linear-gradient(135deg,#FFD84A,#FF7A3D)'],
    ];
    body.innerHTML = `<div class="games">${list.map(([k, n, d, bg]) => `<button class="game" data-g="${k}" style="background:${bg}">${ICON[k]}<b>${n}</b><span>${d}</span></button>`).join('')}</div>`;
    body.querySelectorAll('.game').forEach((b) => b.onclick = () => {
      this.closeSheet();
      const g = b.dataset.g;
      if (g === 'rail' || g === 'bloom') Workshop.open(g);
      else if (g === 'catch' || g === 'simon') Games.start(g);
      else if (g === 'dance') Games.danceParty();
      else { const r = Room.robot; const bl = Room.ball; bl.vx = rand(-1, 1) * World.S * 2.5; bl.vz = World.S * 3; Snd.sfx.kick(); if (r.mode === 'sleep') Room.wake(true); r.stop(); r.play(B.kick(r, bl), 1, 'kick'); }
    });
  },
  sheetShop(body) {
    const tabs = this.$('sheetTabs');
    tabs.className = 'tabs';
    tabs.innerHTML = `<button class="tab ${this.shopTab === 'hats' ? 'on' : ''}" data-t="hats">Шапки</button><button class="tab ${this.shopTab === 'room' ? 'on' : ''}" data-t="room">Комната</button>`;
    tabs.querySelectorAll('.tab').forEach((t) => t.onclick = () => { this.shopTab = t.dataset.t; this.openSheet('shop'); });
    const s = Game.s, items = this.shopTab === 'hats' ? HATS : FURNITURE;
    body.innerHTML = `<div class="grid">${items.map((it) => {
      const own = this.shopTab === 'hats' ? s.hats[it.id] : s.owned[it.id];
      const worn = s.hat === it.id;
      const btn = own ? (this.shopTab === 'hats' ? `<button class="pill ${worn ? 'ghost' : ''}" data-i="${it.id}">${worn ? 'Снять' : 'Надеть'}</button>` : '<span class="pill ghost">Стоит</span>')
        : `<button class="pill ${s.bolts < it.price ? 'dis' : ''}" data-i="${it.id}">Купить</button>`;
      return `<div class="card ${worn ? 'cur' : ''}"><canvas data-p="${it.id}" width="168" height="184"></canvas><span class="nm" style="font-size:13px">${it.name}</span>${own ? '' : `<span class="price">${ICON.bolt}${it.price}</span>`}${it.note ? `<span class="cond">${it.note}</span>` : ''}${btn}</div>`;
    }).join('')}</div><p class="note">Винтики дают мини-игры, уход и дружба. Не хватает — сыграй в «Лови винтики».</p>`;
    body.querySelectorAll('canvas[data-p]').forEach((c) => {
      const g = c.getContext('2d'); g.setTransform(2, 0, 0, 2, 0, 0);
      if (this.shopTab === 'hats') drawPreviewRobot(g, Game.def, 84, 92, c.dataset.p, true);
      else drawFurniturePreview(g, c.dataset.p, 84, 92);
    });
    body.querySelectorAll('button[data-i]').forEach((b) => b.onclick = () => this.buy(b.dataset.i));
  },
  buy(id) {
    const s = Game.s, hat = HATS.find((h) => h.id === id), fur = FURNITURE.find((f) => f.id === id);
    const it = hat || fur, owned = hat ? s.hats[id] : s.owned[id];
    const r = Room.robot;
    if (!owned) {
      if (s.bolts < it.price) { Snd.sfx.error(); this.toast(`Не хватает ${it.price - s.bolts} винтиков`, 'bolt'); return; }
      s.bolts -= it.price; this.bolts(true); Snd.sfx.buy();
      if (hat) s.hats[id] = true; else { s.owned[id] = true; World.bgDirty = true; }
      this.toast(`Куплено: ${it.name}`, hat ? 'shop' : 'heart');
      Game.friend(1);
    }
    if (hat) { s.hat = s.hat === id && owned ? null : id; r.hat = s.hat; if (s.hat) { r.stop(); r.play(B.tryHat(r), 2); } }
    else if (!owned) {
      // the robot tries the new thing right away
      r.stop();
      const sp = World.spots[id] || { x: World.cx, y: lerp(World.floorTop, World.floorBottom, 0.4) };
      r.play((function* () { r.face('star', 1); r.say('wow'); yield* walk(r, sp.x + (id === 'lamp' ? -World.S * 0.6 : id === 'plant' ? World.S * 0.6 : 0), Math.max(sp.y, World.floorTop + 40), 1.2, 4); r.lookAt(sp.x, sp.y - 60, 2); if (id === 'rug') yield* B.dance(r, 8); else yield* B.happyHop(r, 2); })(), 2);
    }
    Game.save();
    this.openSheet('shop');
  },
  sheetRobots(body) {
    const s = Game.s;
    const open = ROBOTS.filter((d) => Game.canUse(d)).length;
    body.innerHTML = `<p class="note" style="padding-top:0">Открыто ${open} из ${ROBOTS.length}. Собирай друзей за игры и заботу.</p><div class="grid">${ROBOTS.map((d) => {
      const can = Game.canUse(d), cur = s.robot === d.id, R = RARITY[d.rarity];
      let foot = '';
      if (cur) foot = '<span class="pill ghost">С тобой</span>';
      else if (can) foot = `<button class="pill" data-r="${d.id}">Позвать</button>`;
      else if (d.access === 'earn') { const v = Math.min(s.stats[d.goal.stat] || 0, d.goal.n); foot = `<span class="cond">${d.unlock}<br><b>${v} / ${d.goal.n}</b></span>`; }
      else foot = `<span class="pack">Набор «${d.pack}»</span><button class="pill ghost" data-r="${d.id}" data-try="1">Примерить</button>`;
      return `<div class="card ${cur ? 'cur' : ''}"><canvas data-d="${d.id}" width="168" height="184"></canvas><span class="nm">${can || d.access === 'premium' ? d.name : '???'}</span><span class="rar" style="color:${R.col}">${R.icon} ${R.name}</span>${foot}</div>`;
    }).join('')}</div>`;
    body.querySelectorAll('canvas[data-d]').forEach((c) => {
      const d = ROBOT_BY_ID[c.dataset.d], g = c.getContext('2d'); g.setTransform(2, 0, 0, 2, 0, 0);
      drawPreviewRobot(g, d, 84, 92, null, Game.canUse(d) || d.access === 'premium');
    });
    body.querySelectorAll('button[data-r]').forEach((b) => b.onclick = () => {
      const d = ROBOT_BY_ID[b.dataset.r];
      if (b.dataset.try) this.toast(`Демо: ${d.name} из набора «${d.pack}»`, 'robots');
      s.names ||= {};
      s.names[s.robot] = s.name;
      s.robot = d.id; s.name = s.names[d.id] || d.name;
      Game.save(); this.closeSheet(); Room.switchRobot(d); this.$('nm').textContent = s.name;
    });
  },
  sheetSettings(body) {
    const s = Game.s;
    body.innerHTML = `
      <div class="row"><span>Звук</span><button class="pill" id="sSound">${s.sound ? 'Вкл' : 'Выкл'}</button></div>
      <div class="row"><span>Демо: открыть всех роботов</span><button class="pill" id="sAll">${s.demoAll ? 'Вкл' : 'Выкл'}</button></div>
      <div class="row"><span>Демо: +100 винтиков</span><button class="pill" id="sBolts">Дать</button></div>
      <div class="row"><span>Начать заново</span><button class="pill ghost" id="sReset">Сбросить</button></div>
      <p class="note">Toysberry Game Studio · «Робогочи» 0.2. Винтики зарабатываются в игре.</p>`;
    this.$('sSound').onclick = () => { s.sound = !s.sound; Snd.on = s.sound; if (!s.sound) SpeechLab.stop(); Game.save(); this.openSheet('settings'); };
    this.$('sAll').onclick = () => { s.demoAll = !s.demoAll; Game.save(); this.openSheet('settings'); };
    this.$('sBolts').onclick = () => { this.closeSheet(); Game.addBolts(100, World.cx, World.H * 0.5); };
    const rb = this.$('sReset');
    rb.onclick = () => {
      if (rb.dataset.sure) { Game.resetting = true; Store.clear(); location.reload(); return; }
      rb.dataset.sure = '1'; rb.textContent = 'Точно? Нажми ещё'; rb.className = 'pill';
    };
  },

  // ---------- first run ----------
  choose(def) {
    const p = this.$('choosePlate');
    p.style.top = ''; p.style.bottom = 'calc(22px + env(safe-area-inset-bottom, 0px))';
    if (!def) { p.innerHTML = '<h2>Кто будет жить у тебя?</h2><p>Коснись малыша, чтобы познакомиться</p>'; return; }
    const R = RARITY[def.rarity];
    p.innerHTML = `<h2>${def.name}</h2><p>${def.about}</p><span class="rar" style="color:${R.col};font-weight:800;font-size:12px">${R.icon} ${R.name}</span><button class="big-btn" id="pickBtn">Выбрать ${def.name}</button>`;
    this.$('pickBtn').onclick = () => { Snd.sfx.sparkle(); Choose.confirm(); };
  },
  nameStep() {
    const p = this.$('choosePlate');
    p.innerHTML = `<h2>Как назовём?</h2><div class="name-row"><input id="nameIn" maxlength="12" aria-label="Имя робота"><button class="dice" id="diceBtn" aria-label="Случайное имя">🎲</button></div><button class="big-btn" id="nameOk">Готово!</button>`;
    this.$('nameIn').value = Game.s.name;
    this.$('diceBtn').onclick = () => { Snd.sfx.click(); this.$('nameIn').value = pick(NAMES.filter((n) => n !== this.$('nameIn').value)); Choose.bots[Choose.sel].say('question'); };
    this.$('nameOk').onclick = () => { Snd.sfx.sparkle(); Choose.finish(this.$('nameIn').value); };
  },
};

// small robot pictures for cards (static pose, optional hat, silhouette when locked)
function drawPreviewRobot(g, def, w, h, hat, visible) {
  const P = defaultPose();
  P.px = Math.min(h / 1.72, w / (def.head.w + 0.12)); P.x = w / 2; P.y = h - 6; P.t = 2.1; P.hat = hat;
  P.blush = 0.6; P.expr = visible ? 'happy' : 'normal'; P.battery = 1;
  if (def.topper === 'speakers' || def.deco === 'saturn') P.px *= 0.82;
  drawRobot(g, def, P);
  if (!visible) {
    g.save(); g.globalCompositeOperation = 'source-atop'; g.fillStyle = '#3B2D72'; g.fillRect(0, 0, w, h); g.restore();
    g.fillStyle = 'rgba(255,255,255,0.75)'; g.font = '900 26px Nunito, system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', w / 2, h * 0.38);
  }
}
function drawFurniturePreview(g, id, w, h) {
  const save = { S: World.S, spots: World.spots, dock: World.dock, ft: World.floorTop, fb: World.floorBottom, W: World.W };
  World.S = 70; World.floorTop = 0; World.floorBottom = 100;
  World.spots = { lamp: { x: w / 2, y: h - 8 }, plant: { x: w / 2, y: h - 8 }, rug: { x: w / 2, y: h * 0.62 } };
  if (id === 'lamp') drawLamp(g, false);
  else if (id === 'plant') drawPlant(g);
  else if (id === 'rug') drawRug(g);
  else if (id === 'poster') {
    g.save(); g.translate(w / 2, h / 2); g.rotate(-0.05);
    g.beginPath(); rrect(g, -26, -34, 52, 64, 5); g.fillStyle = '#1F1A4A'; g.fill(); g.lineWidth = 3; g.strokeStyle = '#fff'; g.stroke();
    g.fillStyle = '#FFD84A'; g.beginPath(); circ(g, -4, -6, 10); g.fill();
    g.strokeStyle = '#FF8AD8'; g.lineWidth = 2.5; g.beginPath(); g.ellipse(-4, -6, 18, 5, -0.3, 0, TAU); g.stroke();
    g.restore();
  } else if (id === 'stars') {
    g.fillStyle = '#5B45D6'; g.beginPath(); rrect(g, w / 2 - 18, h - 34, 36, 26, 8); g.fill();
    g.fillStyle = '#FFE59A'; g.beginPath(); circ(g, w / 2, h - 34, 12); g.fill();
    for (let i = 0; i < 7; i++) { g.fillStyle = i % 2 ? '#FFF7C2' : '#BFE9FF'; g.beginPath(); starPath(g, 12 + i * 10, 14 + Math.sin(i * 2) * 10, 5, 2, 4); g.fill(); }
  }
  World.S = save.S; World.spots = save.spots; World.floorTop = save.ft; World.floorBottom = save.fb;
}
